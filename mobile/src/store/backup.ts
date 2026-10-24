// Rolling on-device snapshots plus export and import. A snapshot is taken at
// most once a day on launch, and always before an import, restore or reset,
// so no single action can wipe the person's history.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { DATA_VERSION, getData, migrate, useStore, type Data } from './index';

const SNAPSHOT_KEY = 'titra:snapshots';
const MAX_SNAPSHOTS = 7;
const DAY = 86_400_000;

export interface Snapshot {
  at: string;
  reason: string;
  counts: Record<string, number>;
  data: Data;
}

export interface ExportFile {
  app: 'titra';
  version: number;
  exportedAt: string;
  data: Data;
}

function counts(d: Data): Record<string, number> {
  return {
    protocols: d.protocols.length,
    logs: d.logs.length,
    inventory: d.inventory.length,
    vitals: d.vitals.length,
    journal: d.journal.length,
    labs: d.labs.length,
  };
}

function isEmpty(d: Data): boolean {
  return Object.values(counts(d)).every((n) => n === 0);
}

export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Snapshot[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function takeSnapshot(reason: string, data: Data = getData()): Promise<void> {
  if (isEmpty(data)) return;
  const list = await listSnapshots();
  const next = [{ at: new Date().toISOString(), reason, counts: counts(data), data }, ...list].slice(0, MAX_SNAPSHOTS);
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
}

/** Called after hydration: one automatic snapshot per day. */
export async function dailySnapshot(): Promise<void> {
  const list = await listSnapshots();
  const last = list.find((s) => s.reason === 'daily');
  if (!last || Date.now() - new Date(last.at).getTime() > DAY) await takeSnapshot('daily');
}

export async function restoreSnapshot(at: string): Promise<boolean> {
  const snap = (await listSnapshots()).find((s) => s.at === at);
  if (!snap) return false;
  await takeSnapshot('before-restore');
  useStore.getState().replaceAll(migrate(snap.data));
  return true;
}

export function buildExport(): ExportFile {
  return { app: 'titra', version: DATA_VERSION, exportedAt: new Date().toISOString(), data: getData() };
}

/** Validates an export file and returns its data, or an error message. */
export function parseExport(text: string): { data: Data } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  const file = parsed as Partial<ExportFile>;
  if (!file || file.app !== 'titra' || typeof file.data !== 'object') {
    return { error: 'That file is not a Titra backup.' };
  }
  if (typeof file.version === 'number' && file.version > DATA_VERSION) {
    return { error: 'This backup was made by a newer version of Titra. Update the app first.' };
  }
  return { data: migrate(file.data) };
}

export async function importData(data: Data): Promise<void> {
  await takeSnapshot('before-import');
  useStore.getState().replaceAll(data);
}

export async function resetAll(): Promise<void> {
  await takeSnapshot('before-reset');
  // Records are cleared; preferences (units, theme, accepted terms) are kept.
  useStore.getState().replaceAll(migrate({ settings: getData().settings }));
}

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function doseLogCsv(data: Data = getData()): string {
  const header = ['taken_at', 'compound', 'amount', 'unit', 'route', 'site', 'volume_ml', 'skipped', 'protocol_id', 'notes'];
  const rows = [...data.logs]
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map((l) => [l.takenAt, l.name, l.amount.value, l.amount.unit, l.route, l.siteId, l.volumeMl, l.skipped ? 'yes' : '', l.protocolId, l.notes].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n');
}
