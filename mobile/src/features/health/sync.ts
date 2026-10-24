// Runs Health Connect syncs and keeps their status for the UI. Syncs are
// incremental (see syncWindowStart) and idempotent: records are matched on
// their Health Connect id, so running twice changes nothing.

import { create } from 'zustand';

import type { VitalEntry } from '@/domain/model';
import { healthStatus, healthSupported, pullHealth, pushVital, unpushVital, type HealthStatus } from '@/lib/health';
import { useStore } from '@/store';

import { syncWindowStart } from './connect';

export interface SyncState {
  /** Null until checked. */
  status: HealthStatus | null;
  syncing: boolean;
  error: string | null;
  last: { added: number; updated: number; missing: string[] } | null;
}

export const useHealthSyncState = create<SyncState>(() => ({ status: healthSupported ? null : 'unsupported', syncing: false, error: null, last: null }));

export function refreshHealthStatus(): Promise<void> {
  return healthStatus().then((status) => useHealthSyncState.setState({ status }));
}

/** Minimum gap between automatic syncs. Manual syncs ignore it. */
export const AUTO_SYNC_MS = 15 * 60_000;

let inFlight: Promise<void> | null = null;

export function syncHealth(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    useHealthSyncState.setState({ syncing: true, error: null });
    try {
      const { settings, mergeSynced, updateSettings } = useStore.getState();
      const now = new Date();
      const pull = await pullHealth(syncWindowStart(settings.healthLastSync, now), now);
      const r = mergeSynced({ vitals: pull.vitals, workouts: pull.workouts });
      updateSettings({ healthLastSync: now.toISOString() });
      useHealthSyncState.setState({ syncing: false, last: { ...r, missing: pull.missing } });
    } catch (e) {
      useHealthSyncState.setState({ syncing: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function shouldAutoSync(now = Date.now()): boolean {
  const { healthSync, healthLastSync } = useStore.getState().settings;
  if (!healthSupported || !healthSync) return false;
  return !healthLastSync || now - new Date(healthLastSync).getTime() > AUTO_SYNC_MS;
}

function writeBackOn() {
  const { healthSync, healthWriteBack } = useStore.getState().settings;
  return healthSupported && healthSync && healthWriteBack;
}

/** Mirrors a manual entry to Health Connect when write-back is on. Failures are silent; the entry is safe locally. */
export function mirrorAdded(v: VitalEntry) {
  if (writeBackOn() && !v.source) pushVital(v).catch(() => undefined);
}

export function mirrorDeleted(v: VitalEntry) {
  if (writeBackOn() && !v.source) unpushVital(v).catch(() => undefined);
}
