import { addDays, format, subDays } from 'date-fns';

import type { VitalEntry, VitalKind, Workout } from '@/domain/model';
import { dayKey, parseDay } from '@/domain/schedule';

export const STEP_GOAL = 8000;

/** One value per local day for a daily-total kind, oldest first; days without data are 0. */
export function lastDays(vitals: VitalEntry[], kind: VitalKind, days: number, now: Date): { date: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const v of vitals) {
    if (v.kind !== kind) continue;
    const key = dayKey(new Date(v.at));
    // One total per day; if a manual and a synced total collide, keep the larger.
    byDay.set(key, Math.max(byDay.get(key) ?? 0, v.value));
  }
  const today = parseDay(dayKey(now));
  return Array.from({ length: days }, (_, i) => {
    const date = dayKey(subDays(today, days - 1 - i));
    return { date, value: byDay.get(date) ?? 0 };
  });
}

export function todayTotal(vitals: VitalEntry[], kind: VitalKind, now: Date): number | null {
  const key = dayKey(now);
  const vals = vitals.filter((v) => v.kind === kind && dayKey(new Date(v.at)) === key).map((v) => v.value);
  return vals.length ? Math.max(...vals) : null;
}

/** Mean over days that have data, so missing days don't drag it down. */
export function averageOf(series: { value: number }[]): number | null {
  const withData = series.filter((d) => d.value > 0);
  return withData.length ? withData.reduce((a, d) => a + d.value, 0) / withData.length : null;
}

export function weekdayLetter(date: string): string {
  return format(parseDay(date), 'EEEEE');
}

export function recentWorkouts(workouts: Workout[], days: number, now: Date): Workout[] {
  const from = subDays(parseDay(dayKey(now)), days - 1);
  return workouts.filter((w) => new Date(w.start) >= from && new Date(w.start) < addDays(now, 1)).sort((a, b) => b.start.localeCompare(a.start));
}

export function hasActivity(vitals: VitalEntry[], workouts: Workout[]): boolean {
  return workouts.length > 0 || vitals.some((v) => v.kind === 'steps');
}
