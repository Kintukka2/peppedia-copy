// Single persisted store for everything the person records. Data stays on the
// device (AsyncStorage; localStorage on web). Rolling snapshots in
// ./backup.ts protect against corruption or accidental deletion.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isInjectable } from '@/domain/sites';
import { deductTaken, doseInItemUnit, restoreAmount } from '@/domain/inventory';
import type {
  DoseLog,
  ID,
  InventoryItem,
  JournalEntry,
  LabResult,
  Protocol,
  Settings,
  Supply,
  VitalEntry,
  Workout,
} from '@/domain/model';

export const DATA_VERSION = 2;

export interface Data {
  protocols: Protocol[];
  logs: DoseLog[];
  inventory: InventoryItem[];
  supplies: Supply[];
  vitals: VitalEntry[];
  journal: JournalEntry[];
  labs: LabResult[];
  workouts: Workout[];
  bookmarks: string[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  weightUnit: 'kg',
  currency: 'USD',
  theme: 'system',
  syringe: 'u100-100',
  sex: 'unspecified',
  remindersEnabled: true,
  deductSupplies: true,
  askEndpoint: '',
  askToken: '',
  healthSync: false,
  healthWriteBack: false,
};

export const EMPTY_DATA: Data = {
  protocols: [],
  logs: [],
  inventory: [],
  supplies: [],
  vitals: [],
  journal: [],
  labs: [],
  workouts: [],
  bookmarks: [],
  settings: DEFAULT_SETTINGS,
};

export const PROTOCOL_COLORS = ['#0F766E', '#C2410C', '#7C3AED', '#2563EB', '#BE185D', '#15803D', '#B45309', '#0E7490'];

export function uid(): ID {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface Actions {
  upsertProtocol: (p: Protocol) => void;
  deleteProtocol: (id: ID) => void;
  logDose: (log: Omit<DoseLog, 'id'>) => DoseLog;
  deleteLog: (id: ID) => void;
  upsertInventory: (item: InventoryItem) => void;
  deleteInventory: (id: ID) => void;
  upsertSupply: (s: Supply) => void;
  deleteSupply: (id: ID) => void;
  addVital: (v: Omit<VitalEntry, 'id'>) => VitalEntry;
  deleteVital: (id: ID) => void;
  /** Upserts synced records by `externalId`, so re-syncing updates instead of duplicating. */
  mergeSynced: (input: { vitals: Omit<VitalEntry, 'id'>[]; workouts: Omit<Workout, 'id'>[] }) => { added: number; updated: number };
  /** Removes everything that came from Health Connect; manual entries stay. */
  clearSynced: () => void;
  upsertJournal: (j: JournalEntry) => void;
  addLab: (r: Omit<LabResult, 'id'>) => void;
  deleteLab: (id: ID) => void;
  toggleBookmark: (compoundId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (data: Data) => void;
}

export type Store = Data & Actions;

function upsert<T extends { id: ID }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

export function nextColor(protocols: Protocol[]): string {
  const used = new Set(protocols.map((p) => p.color));
  return PROTOCOL_COLORS.find((c) => !used.has(c)) ?? PROTOCOL_COLORS[protocols.length % PROTOCOL_COLORS.length];
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...EMPTY_DATA,

      upsertProtocol: (p) => set((s) => ({ protocols: upsert(s.protocols, p) })),
      deleteProtocol: (id) =>
        set((s) => ({
          protocols: s.protocols.filter((p) => p.id !== id),
          // Logs are history; keep them but detach from the deleted protocol.
          logs: s.logs.map((l) => (l.protocolId === id ? { ...l, protocolId: undefined } : l)),
        })),

      logDose: (input) => {
        const log: DoseLog = { ...input, id: uid() };
        const now = new Date(log.takenAt);
        set((s) => {
          let inventory = s.inventory;
          if (!log.skipped && log.inventoryId) {
            inventory = s.inventory.map((i) => {
              if (i.id !== log.inventoryId) return i;
              const r = deductTaken(i, log.amount, now);
              log.deducted = r.taken;
              return r.item;
            });
          }
          let supplies = s.supplies;
          if (!log.skipped && s.settings.deductSupplies && isInjectable(log.route)) {
            const used: { id: ID; n: number }[] = [];
            supplies = s.supplies.map((x) => {
              const n = Math.min(x.count, Math.max(0, Math.round(x.perInjection)));
              if (n <= 0) return x;
              used.push({ id: x.id, n });
              return { ...x, count: x.count - n };
            });
            if (used.length) log.suppliesUsed = used;
          }
          return { logs: [...s.logs, log], inventory, supplies };
        });
        return log;
      },
      deleteLog: (id) =>
        set((s) => {
          const log = s.logs.find((l) => l.id === id);
          if (!log) return {};
          const inventory =
            !log.skipped && log.inventoryId
              ? s.inventory.map((i) => (i.id === log.inventoryId ? restoreAmount(i, log.deducted ?? doseInItemUnit(i, log.amount) ?? 0) : i))
              : s.inventory;
          const back = new Map((log.suppliesUsed ?? []).map((u) => [u.id, u.n]));
          const supplies = back.size ? s.supplies.map((x) => (back.has(x.id) ? { ...x, count: x.count + back.get(x.id)! } : x)) : s.supplies;
          return { logs: s.logs.filter((l) => l.id !== id), inventory, supplies };
        }),

      upsertInventory: (item) => set((s) => ({ inventory: upsert(s.inventory, item) })),
      deleteInventory: (id) =>
        set((s) => ({
          inventory: s.inventory.filter((i) => i.id !== id),
          protocols: s.protocols.map((p) => (p.inventoryId === id ? { ...p, inventoryId: undefined } : p)),
        })),

      upsertSupply: (x) => set((s) => ({ supplies: upsert(s.supplies, x) })),
      deleteSupply: (id) => set((s) => ({ supplies: s.supplies.filter((x) => x.id !== id) })),

      addVital: (v) => {
        const entry = { ...v, id: uid() };
        set((s) => ({ vitals: [...s.vitals, entry] }));
        return entry;
      },
      deleteVital: (id) => set((s) => ({ vitals: s.vitals.filter((v) => v.id !== id) })),

      mergeSynced: (input) => {
        let added = 0;
        let updated = 0;
        set((s) => {
          const merge = <T extends { id: ID; externalId?: string }>(list: T[], incoming: Omit<T, 'id'>[]): T[] => {
            const index = new Map(list.map((x, i) => [x.externalId, i] as const).filter(([k]) => k !== undefined));
            const next = list.slice();
            for (const item of incoming) {
              const at = item.externalId !== undefined ? index.get(item.externalId) : undefined;
              if (at === undefined) {
                next.push({ ...item, id: uid() } as T);
                if (item.externalId !== undefined) index.set(item.externalId, next.length - 1);
                added++;
              } else if (JSON.stringify({ ...next[at], id: undefined }) !== JSON.stringify({ ...item, id: undefined })) {
                next[at] = { ...item, id: next[at].id } as T;
                updated++;
              }
            }
            return next;
          };
          return { vitals: merge(s.vitals, input.vitals), workouts: merge(s.workouts, input.workouts) };
        });
        return { added, updated };
      },
      clearSynced: () =>
        set((s) => ({
          vitals: s.vitals.filter((v) => v.source !== 'health-connect'),
          workouts: s.workouts.filter((w) => w.source !== 'health-connect'),
          settings: { ...s.settings, healthLastSync: undefined },
        })),

      upsertJournal: (j) =>
        set((s) => {
          const existing = s.journal.find((x) => x.date === j.date);
          return { journal: upsert(s.journal, existing ? { ...j, id: existing.id } : j) };
        }),

      addLab: (r) => set((s) => ({ labs: [...s.labs, { ...r, id: uid() }] })),
      deleteLab: (id) => set((s) => ({ labs: s.labs.filter((r) => r.id !== id) })),

      toggleBookmark: (compoundId) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(compoundId) ? s.bookmarks.filter((b) => b !== compoundId) : [...s.bookmarks, compoundId],
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceAll: (data) => set(() => ({ ...EMPTY_DATA, ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } })),
    }),
    {
      name: 'titra:data',
      version: DATA_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => pickData(s),
      migrate: (persisted) => migrate(persisted) as unknown as Store,
    },
  ),
);

export function pickData(s: Data): Data {
  return {
    protocols: s.protocols,
    logs: s.logs,
    inventory: s.inventory,
    supplies: s.supplies,
    vitals: s.vitals,
    journal: s.journal,
    labs: s.labs,
    workouts: s.workouts,
    bookmarks: s.bookmarks,
    settings: s.settings,
  };
}

/** Brings any stored or imported shape up to the current version. */
export function migrate(input: unknown): Data {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Data>;
  const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  // v1 gated the app behind a terms checkbox; v2 only records that onboarding ran.
  const { acceptedTermsAt, ...settings } = (raw.settings ?? {}) as Partial<Settings> & { acceptedTermsAt?: string };
  return {
    protocols: list<Protocol>(raw.protocols),
    logs: list<DoseLog>(raw.logs),
    inventory: list<InventoryItem>(raw.inventory),
    supplies: list<Supply>(raw.supplies),
    vitals: list<VitalEntry>(raw.vitals),
    journal: list<JournalEntry>(raw.journal),
    labs: list<LabResult>(raw.labs),
    workouts: list<Workout>(raw.workouts),
    bookmarks: list<string>(raw.bookmarks),
    settings: { ...DEFAULT_SETTINGS, ...settings, onboardedAt: settings.onboardedAt ?? acceptedTermsAt },
  };
}

export function getData(): Data {
  return pickData(useStore.getState());
}
