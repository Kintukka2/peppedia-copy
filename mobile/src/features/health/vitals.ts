import type { VitalEntry, VitalKind, WeightUnit } from '@/domain/model';
import { fromKg, toKg } from '@/domain/units';

import { axisValue, formatChange, formatNumber } from './format';

export const VITAL_KINDS: VitalKind[] = ['weight', 'bodyFat', 'restingHr', 'bloodPressure', 'sleep', 'steps', 'distance', 'activeKcal', 'exerciseMin', 'waist'];

/** Kinds stored as one total per day. */
export const DAILY_TOTAL_KINDS: VitalKind[] = ['steps', 'distance', 'activeKcal', 'exerciseMin'];

interface VitalMeta {
  label: string;
  /** Singular noun for one entry, as in "Add step count". */
  name: string;
  emptyTitle: string;
  decimals: number;
  /** Plausible bounds in storage units (kg for weight), used to catch typos. */
  min: number;
  max: number;
  min2?: number;
  max2?: number;
  hint?: string;
  empty: string;
}

export const VITAL_META: Record<VitalKind, VitalMeta> = {
  weight: {
    label: 'Weight',
    name: 'weight',
    emptyTitle: 'No weigh-ins yet',
    decimals: 1,
    min: 20,
    max: 400,
    empty: 'Log a weigh-in to start a trend. Weighing at the same time of day gives steadier numbers.',
  },
  bodyFat: {
    label: 'Body fat',
    name: 'body fat',
    emptyTitle: 'No body-fat readings yet',
    decimals: 1,
    min: 2,
    max: 75,
    empty: 'Record body-fat percentage from a scale, calipers or a scan. Using the same method each time keeps readings comparable.',
  },
  restingHr: {
    label: 'Resting HR',
    name: 'resting HR',
    emptyTitle: 'No resting heart rate readings yet',
    decimals: 0,
    min: 25,
    max: 220,
    hint: 'Beats per minute, ideally measured on waking.',
    empty: 'Record resting heart rate in beats per minute. Measuring at the same time each day keeps readings comparable.',
  },
  bloodPressure: {
    label: 'Blood pressure',
    name: 'blood pressure',
    emptyTitle: 'No blood pressure readings yet',
    decimals: 0,
    min: 60,
    max: 260,
    min2: 30,
    max2: 160,
    empty: 'Record systolic and diastolic readings. Seated, after a few minutes of rest, gives comparable numbers.',
  },
  sleep: {
    label: 'Sleep',
    name: 'sleep',
    emptyTitle: 'No sleep entries yet',
    decimals: 1,
    min: 0,
    max: 24,
    hint: 'Hours, e.g. 7.5',
    empty: 'Record hours slept per night.',
  },
  steps: {
    label: 'Steps',
    name: 'step count',
    emptyTitle: 'No step counts yet',
    decimals: 0,
    min: 0,
    max: 200_000,
    empty: 'Record a daily step count, or connect Health Connect in Settings to sync it from Google Fit.',
  },
  distance: {
    label: 'Distance',
    name: 'distance',
    emptyTitle: 'No distance yet',
    decimals: 1,
    min: 0,
    max: 300,
    hint: 'Kilometres for the day.',
    empty: 'Daily distance walked, run or cycled. Connect Health Connect in Settings to sync it from Google Fit.',
  },
  activeKcal: {
    label: 'Active energy',
    name: 'active energy',
    emptyTitle: 'No active energy yet',
    decimals: 0,
    min: 0,
    max: 10_000,
    hint: 'Kilocalories burned through activity for the day.',
    empty: 'Energy burned through activity each day. Connect Health Connect in Settings to sync it from Google Fit.',
  },
  exerciseMin: {
    label: 'Exercise',
    name: 'exercise time',
    emptyTitle: 'No exercise time yet',
    decimals: 0,
    min: 0,
    max: 1440,
    hint: 'Minutes of workouts for the day.',
    empty: 'Minutes spent in workouts each day. Connect Health Connect in Settings to sync sessions from Google Fit.',
  },
  waist: {
    label: 'Waist',
    name: 'waist measurement',
    emptyTitle: 'No waist measurements yet',
    decimals: 1,
    min: 30,
    max: 250,
    hint: 'Centimetres, measured at the same point each time.',
    empty: 'Record waist circumference in centimetres. Measuring at the same point each time keeps readings comparable.',
  },
};

export function isVitalKind(v: unknown): v is VitalKind {
  return typeof v === 'string' && (VITAL_KINDS as string[]).includes(v);
}

export function unitFor(kind: VitalKind, weightUnit: WeightUnit): string {
  switch (kind) {
    case 'weight':
      return weightUnit;
    case 'bodyFat':
      return '%';
    case 'restingHr':
      return 'bpm';
    case 'bloodPressure':
      return 'mmHg';
    case 'sleep':
      return 'h';
    case 'steps':
      return 'steps';
    case 'distance':
      return 'km';
    case 'activeKcal':
      return 'kcal';
    case 'exerciseMin':
      return 'min';
    case 'waist':
      return 'cm';
  }
}

/** Storage value → the unit the person reads. */
export function toDisplay(kind: VitalKind, value: number, weightUnit: WeightUnit): number {
  return kind === 'weight' ? fromKg(value, weightUnit) : value;
}

/** Entered value → storage value. */
export function toStorage(kind: VitalKind, value: number, weightUnit: WeightUnit): number {
  if (kind === 'weight') return Math.round(toKg(value, weightUnit) * 1000) / 1000;
  return VITAL_META[kind].decimals === 0 ? Math.round(value) : value;
}

export function formatVital(e: Pick<VitalEntry, 'kind' | 'value' | 'value2'>, weightUnit: WeightUnit): string {
  const d = VITAL_META[e.kind].decimals;
  if (e.kind === 'bloodPressure') return `${formatNumber(e.value, 0)}/${e.value2 !== undefined ? formatNumber(e.value2, 0) : '—'}`;
  return formatNumber(toDisplay(e.kind, e.value, weightUnit), d);
}

export function formatVitalChange(kind: VitalKind, delta: number, delta2: number | undefined, weightUnit: WeightUnit): string {
  const d = VITAL_META[kind].decimals;
  if (kind === 'bloodPressure') return `${formatChange(delta, 0)}/${delta2 !== undefined ? formatChange(delta2, 0) : '—'}`;
  return formatChange(toDisplay(kind, delta, weightUnit), d);
}

export function vitalAxis(kind: VitalKind): (v: number) => string {
  const d = VITAL_META[kind].decimals;
  return (v) => (kind === 'steps' || kind === 'activeKcal' || Math.abs(v) >= 1000 ? axisValue(v) : v.toFixed(d));
}

export interface TimedVital extends VitalEntry {
  t: number;
}

/** Entries of one kind, oldest first, with parsed timestamps. */
export function entriesOf(vitals: VitalEntry[], kind: VitalKind): TimedVital[] {
  return vitals
    .filter((v) => v.kind === kind)
    .map((v) => ({ ...v, t: new Date(v.at).getTime() }))
    .filter((v) => Number.isFinite(v.t))
    .sort((a, b) => a.t - b.t);
}

const DAY = 86_400_000;

export interface VitalChange {
  delta: number;
  delta2?: number;
  from: TimedVital;
}

/**
 * Change from the entry closest to `days` before the latest one. The match must
 * fall within roughly a third of the window so a sparse log doesn't compare
 * against something far older than the label says.
 */
export function changeOver(entries: TimedVital[], days: number): VitalChange | null {
  if (entries.length < 2) return null;
  const latest = entries[entries.length - 1];
  const target = latest.t - days * DAY;
  const tolerance = Math.max(2, days * 0.35) * DAY;
  let best: TimedVital | null = null;
  for (const e of entries.slice(0, -1)) {
    const off = Math.abs(e.t - target);
    if (off <= tolerance && (!best || off < Math.abs(best.t - target))) best = e;
  }
  if (!best) return null;
  const delta2 = latest.value2 !== undefined && best.value2 !== undefined ? latest.value2 - best.value2 : undefined;
  return { delta: latest.value - best.value, delta2, from: best };
}
