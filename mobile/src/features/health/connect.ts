// Maps Health Connect data into Titra records. Google Fit writes steps,
// distance, workouts, heart rate, weight and sleep into Health Connect on
// Android, so this is how Fit data reaches the app. Pure functions only; the
// native calls live in src/lib/health.ts.

import { addDays } from 'date-fns';

import type { VitalEntry, VitalKind, Workout } from '@/domain/model';
import { dayKey, parseDay } from '@/domain/schedule';

/** This app's package: records it wrote are already stored locally, so reads skip them. */
export const TITRA_PACKAGE = 'app.titra.mobile';

export const ORIGIN_LABEL: Record<string, string> = {
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.apps.healthdata': 'Health Connect',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.google.android.apps.wear.companion': 'Pixel Watch',
  'com.samsung.android.app.health': 'Samsung Health',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.strava': 'Strava',
  'com.withings.wiscale2': 'Withings',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.ouraring.oura': 'Oura',
  'com.whoop.android': 'WHOOP',
};

export function originLabel(pkg?: string): string | undefined {
  if (!pkg) return undefined;
  return ORIGIN_LABEL[pkg] ?? pkg.split('.').slice(-1)[0];
}

type Synced = Omit<VitalEntry, 'id'>;
type SyncedWorkout = Omit<Workout, 'id'>;

interface Meta {
  metadata?: { id?: string; dataOrigin?: string };
}

/** Minimal shapes of the Health Connect read results this module uses. */
export interface HcWeight extends Meta {
  time: string;
  weight: { inKilograms: number };
}
export interface HcBodyFat extends Meta {
  time: string;
  percentage: number;
}
export interface HcBloodPressure extends Meta {
  time: string;
  systolic: { inMillimetersOfMercury: number };
  diastolic: { inMillimetersOfMercury: number };
}
export interface HcRestingHr extends Meta {
  time: string;
  beatsPerMinute: number;
}
export interface HcSleep extends Meta {
  startTime: string;
  endTime: string;
  stages?: { startTime: string; endTime: string; stage: number }[];
}
export interface HcExercise extends Meta {
  startTime: string;
  endTime: string;
  exerciseType: number;
  title?: string;
}

/** One local day's totals, from period-aggregated reads. */
export interface DayTotals {
  /** `YYYY-MM-DD`, local. */
  date: string;
  steps?: number;
  distanceKm?: number;
  activeKcal?: number;
  exerciseMin?: number;
}

/** Health Connect's sleep stages that count as asleep (light, deep, REM and plain "sleeping"). */
const ASLEEP_STAGES = new Set([2, 4, 5, 6]);

const fromOtherApp = (r: Meta) => r.metadata?.dataOrigin !== TITRA_PACKAGE;
const source = 'health-connect' as const;

function round(v: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** Daily totals are stamped at local noon so they sit in the middle of their day on charts. */
export function noonOf(date: string): string {
  const d = parseDay(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function dailyVitals(days: DayTotals[]): Synced[] {
  const out: Synced[] = [];
  const push = (kind: VitalKind, date: string, value: number | undefined, digits: number) => {
    if (value === undefined || !Number.isFinite(value) || value <= 0) return;
    out.push({ kind, value: round(value, digits), at: noonOf(date), source, externalId: `hc:${kind}:${date}` });
  };
  for (const d of days) {
    push('steps', d.date, d.steps, 0);
    push('distance', d.date, d.distanceKm, 2);
    push('activeKcal', d.date, d.activeKcal, 0);
    push('exerciseMin', d.date, d.exerciseMin, 0);
  }
  return out;
}

function instant<T extends Meta & { time: string }>(kind: VitalKind, records: T[], value: (r: T) => number, digits: number, value2?: (r: T) => number): Synced[] {
  return records.filter(fromOtherApp).flatMap((r) => {
    const v = value(r);
    if (!Number.isFinite(v) || v <= 0) return [];
    const entry: Synced = { kind, value: round(v, digits), at: new Date(r.time).toISOString(), source, externalId: `hc:${r.metadata?.id ?? `${kind}:${r.time}`}` };
    if (value2) entry.value2 = Math.round(value2(r));
    return [entry];
  });
}

export function weightVitals(records: HcWeight[]): Synced[] {
  return instant('weight', records, (r) => r.weight.inKilograms, 2);
}

export function bodyFatVitals(records: HcBodyFat[]): Synced[] {
  return instant('bodyFat', records, (r) => r.percentage, 1);
}

export function bloodPressureVitals(records: HcBloodPressure[]): Synced[] {
  return instant('bloodPressure', records, (r) => Math.round(r.systolic.inMillimetersOfMercury), 0, (r) => r.diastolic.inMillimetersOfMercury);
}

export function restingHrVitals(records: HcRestingHr[]): Synced[] {
  return instant('restingHr', records, (r) => r.beatsPerMinute, 0);
}

/** Hours asleep per session (sleep stages when present, else the whole session), dated at wake-up. */
export function sleepVitals(records: HcSleep[]): Synced[] {
  return records.filter(fromOtherApp).flatMap((r) => {
    const span = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
    const staged = r.stages?.length ? r.stages.filter((s) => ASLEEP_STAGES.has(s.stage)).reduce((sum, s) => sum + new Date(s.endTime).getTime() - new Date(s.startTime).getTime(), 0) : span;
    const hours = staged / 3_600_000;
    if (!(hours > 0) || hours > 24) return [];
    return [{ kind: 'sleep' as const, value: round(hours, 1), at: new Date(r.endTime).toISOString(), source, externalId: `hc:${r.metadata?.id ?? `sleep:${r.endTime}`}` }];
  });
}

export function workoutsFrom(records: HcExercise[]): SyncedWorkout[] {
  return records.filter(fromOtherApp).map((r) => ({
    type: r.exerciseType,
    title: r.title || undefined,
    start: new Date(r.startTime).toISOString(),
    end: new Date(r.endTime).toISOString(),
    source,
    externalId: `hc:${r.metadata?.id ?? `exercise:${r.startTime}`}`,
    origin: r.metadata?.dataOrigin,
  }));
}

/**
 * Merges per-metric daily aggregates (as returned for each record type) into
 * one row per day. `startTime` is Health Connect's local date-time for the slice.
 */
export function mergeDays(parts: { metric: keyof Omit<DayTotals, 'date'>; groups: { startTime: string; value: number }[] }[]): DayTotals[] {
  const byDate = new Map<string, DayTotals>();
  for (const { metric, groups } of parts) {
    for (const g of groups) {
      const date = g.startTime.slice(0, 10);
      const row = byDate.get(date) ?? { date };
      row[metric] = g.value;
      byDate.set(date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Where the next sync should start. The first sync backfills `firstDays`;
 * later ones re-read from two days before the last sync, because watches and
 * Google Fit can deliver data late.
 */
export function syncWindowStart(lastSync: string | undefined, now: Date, firstDays = 90): Date {
  const today = parseDay(dayKey(now));
  if (!lastSync) return addDays(today, -firstDays);
  const last = parseDay(dayKey(new Date(lastSync)));
  const from = addDays(last, -2);
  return from < addDays(today, -firstDays) ? addDays(today, -firstDays) : from;
}

/**
 * The last sync time, but only while its records are still in the store.
 * Deleting all data or loading the sample keeps settings and drops synced
 * records; without this the next sync would re-read two days, not the history.
 */
export function lastSyncWithData(lastSync: string | undefined, vitals: Pick<VitalEntry, 'source'>[], workouts: Pick<Workout, 'source'>[]): string | undefined {
  const kept = vitals.some((v) => v.source === 'health-connect') || workouts.some((w) => w.source === 'health-connect');
  return kept ? lastSync : undefined;
}

/** Health Connect exercise types (androidx.health.connect ExerciseSessionRecord) with readable names. */
export const EXERCISE_LABEL: Record<number, string> = {
  0: 'Workout',
  2: 'Badminton',
  4: 'Baseball',
  5: 'Basketball',
  8: 'Cycling',
  9: 'Indoor cycling',
  10: 'Boot camp',
  11: 'Boxing',
  13: 'Calisthenics',
  14: 'Cricket',
  16: 'Dancing',
  25: 'Elliptical',
  26: 'Exercise class',
  27: 'Fencing',
  28: 'American football',
  29: 'Australian football',
  31: 'Frisbee',
  32: 'Golf',
  33: 'Guided breathing',
  34: 'Gymnastics',
  35: 'Handball',
  36: 'HIIT',
  37: 'Hiking',
  38: 'Ice hockey',
  39: 'Ice skating',
  44: 'Martial arts',
  46: 'Paddling',
  47: 'Paragliding',
  48: 'Pilates',
  50: 'Racquetball',
  51: 'Rock climbing',
  52: 'Roller hockey',
  53: 'Rowing',
  54: 'Rowing machine',
  55: 'Rugby',
  56: 'Running',
  57: 'Treadmill run',
  58: 'Sailing',
  59: 'Scuba diving',
  60: 'Skating',
  61: 'Skiing',
  62: 'Snowboarding',
  63: 'Snowshoeing',
  64: 'Soccer',
  65: 'Softball',
  66: 'Squash',
  68: 'Stair climbing',
  69: 'Stair machine',
  70: 'Strength training',
  71: 'Stretching',
  72: 'Surfing',
  73: 'Open-water swim',
  74: 'Pool swim',
  75: 'Table tennis',
  76: 'Tennis',
  78: 'Volleyball',
  79: 'Walking',
  80: 'Water polo',
  81: 'Weightlifting',
  82: 'Wheelchair',
  83: 'Yoga',
};

export function exerciseLabel(type: number): string {
  return EXERCISE_LABEL[type] ?? 'Workout';
}

/** Minutes between two ISO timestamps. */
export function minutesBetween(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}
