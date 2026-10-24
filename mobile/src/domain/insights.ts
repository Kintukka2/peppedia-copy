// Rule-based observations over the person's own records. Insights describe
// what was logged (adherence, trends, timing of symptoms). They never claim a
// compound caused an outcome and never suggest changing a dose.

import { addWeeks, differenceInCalendarDays, format, subDays } from 'date-fns';

import { BIOMARKER_BY_ID, rangeFor, rangeStatus } from '@/data/biomarkers';

import { ALERT_LABEL, alerts, forecast } from './inventory';
import type { DoseLog, InventoryItem, JournalEntry, LabResult, Protocol, Sex, VitalEntry, WeightUnit, Workout } from './model';
import { adherence, doseOn, parseDay } from './schedule';
import { fromKg, toBase } from './units';

export type InsightTone = 'positive' | 'neutral' | 'attention';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  /** Route to open for detail. */
  href?: string;
}

export interface InsightInput {
  protocols: Protocol[];
  logs: DoseLog[];
  inventory: InventoryItem[];
  vitals: VitalEntry[];
  journal: JournalEntry[];
  labs: LabResult[];
  workouts?: Workout[];
  sex: Sex;
  weightUnit: WeightUnit;
  now: Date;
  windowDays?: number;
}

/** Least-squares slope in value units per day. */
export function slopePerDay(points: { t: number; v: number }[]): number | null {
  if (points.length < 3) return null;
  const n = points.length;
  const xs = points.map((p) => p.t / 86_400_000);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = points.reduce((a, p) => a + p.v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (points[i].v - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export function buildInsights(input: InsightInput): Insight[] {
  const { protocols, logs, inventory, vitals, journal, labs, sex, weightUnit, now } = input;
  const windowDays = input.windowDays ?? 14;
  const from = subDays(now, windowDays);
  const out: Insight[] = [];
  const active = protocols.filter((p) => p.status === 'active');

  // Adherence per protocol.
  for (const p of active) {
    const a = adherence(p, logs, from, now, now);
    if (a.rate === null || a.scheduled < 2) continue;
    const pct = Math.round(a.rate * 100);
    const missed = a.scheduled - a.taken - a.skipped;
    out.push({
      id: `adherence-${p.id}`,
      tone: pct >= 90 ? 'positive' : pct >= 70 ? 'neutral' : 'attention',
      title: `${p.name}: ${pct}% of scheduled doses logged`,
      body:
        `${a.taken} of ${a.scheduled} in the last ${windowDays} days` +
        (a.skipped ? `, ${a.skipped} skipped` : '') +
        (missed > 0 ? `, ${missed} not logged.` : '.'),
      href: `/protocol/${p.id}`,
    });
  }

  // Weight trend.
  const weights = vitals
    .filter((v) => v.kind === 'weight' && new Date(v.at) >= subDays(now, 30))
    .map((v) => ({ t: new Date(v.at).getTime(), v: v.value }))
    .sort((a, b) => a.t - b.t);
  const slope = slopePerDay(weights);
  if (slope !== null) {
    const perWeek = fromKg(slope * 7, weightUnit);
    out.push({
      id: 'weight-trend',
      tone: 'neutral',
      title: `Weight trend: ${perWeek >= 0 ? '+' : '−'}${Math.abs(perWeek).toFixed(2)} ${weightUnit} per week`,
      body: `Fitted across ${weights.length} weigh-ins in the last 30 days. Weighing at the same time of day makes the trend steadier.`,
      href: '/vitals',
    });
  } else if (weights.length < 3) {
    out.push({
      id: 'weight-sparse',
      tone: 'neutral',
      title: 'Not enough weigh-ins for a trend',
      body: 'Three or more weigh-ins in 30 days are needed to fit a trend line.',
      href: '/vitals',
    });
  }

  // Symptoms logged shortly after a dose step-up.
  for (const p of active) {
    if (!p.titration || p.titration.length < 2) continue;
    let weekStart = 0;
    for (let i = 1; i < p.titration.length; i++) {
      weekStart += p.titration[i - 1].weeks;
      const stepDay = addWeeks(parseDay(p.startDate), weekStart);
      if (stepDay < from || stepDay > now) continue;
      const near = journal.filter((j) => {
        const d = differenceInCalendarDays(new Date(j.date + 'T00:00:00'), stepDay);
        return d >= 0 && d <= 3 && j.symptoms.length > 0;
      });
      if (near.length > 0) {
        const symptoms = [...new Set(near.flatMap((j) => j.symptoms))].slice(0, 4).join(', ');
        out.push({
          id: `step-${p.id}-${i}`,
          tone: 'attention',
          title: `Symptoms logged after a ${p.name} step-up`,
          body: `You logged ${symptoms} within three days of moving to step ${i + 1}. This is a timing observation, not a cause.`,
          href: '/journal',
        });
      }
    }
  }

  out.push(...activityInsights(input));

  // Symptom frequency.
  const recent = journal.filter((j) => new Date(j.date + 'T00:00:00') >= from);
  const counts = new Map<string, number>();
  for (const j of recent) for (const s of j.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length > 0) {
    out.push({
      id: 'symptoms',
      tone: 'neutral',
      title: 'Most-logged symptoms',
      body: top.map(([s, c]) => `${s} (${c} day${c === 1 ? '' : 's'})`).join(' · '),
      href: '/journal',
    });
  }
  const moods = recent.filter((j) => j.mood).map((j) => j.mood!);
  if (moods.length >= 3) {
    const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
    out.push({
      id: 'mood',
      tone: avg >= 3.5 ? 'positive' : avg >= 2.5 ? 'neutral' : 'attention',
      title: `Average mood ${avg.toFixed(1)} / 5`,
      body: `Across ${moods.length} check-ins in the last ${windowDays} days.`,
      href: '/journal',
    });
  }

  // Stock.
  for (const item of inventory) {
    const linked = active.filter((p) => p.inventoryId === item.id);
    const f = forecast(item, linked, now);
    if (f.daysLeft !== null && f.daysLeft <= 14) {
      out.push({
        id: `runout-${item.id}`,
        tone: 'attention',
        title: `${item.name} runs out in about ${Math.max(0, Math.floor(f.daysLeft))} days`,
        body: `At the current schedule${f.dosesLeft !== null ? `, ${f.dosesLeft} doses remain` : ''}.`,
        href: `/inventory/${item.id}`,
      });
    }
    for (const a of alerts(item, now)) {
      if (a === 'low' && f.daysLeft !== null && f.daysLeft <= 14) continue;
      out.push({ id: `alert-${item.id}-${a}`, tone: 'attention', title: `${item.name}: ${ALERT_LABEL[a]}`, body: alertBody(a), href: `/inventory/${item.id}` });
    }
  }

  // Labs outside range (latest result per marker).
  const latest = new Map<string, LabResult>();
  for (const r of labs) {
    const prev = latest.get(r.markerId);
    if (!prev || r.date > prev.date) latest.set(r.markerId, r);
  }
  for (const r of latest.values()) {
    const marker = BIOMARKER_BY_ID[r.markerId];
    if (!marker) continue;
    const range = r.refLow !== undefined || r.refHigh !== undefined ? { low: r.refLow, high: r.refHigh } : rangeFor(marker, sex);
    const status = rangeStatus(r.value, range);
    if (status === 'low' || status === 'high') {
      out.push({
        id: `lab-${r.markerId}`,
        tone: 'attention',
        title: `${marker.name} ${status === 'high' ? 'above' : 'below'} range`,
        body: `${r.value} ${marker.unit} on ${format(new Date(r.date + 'T00:00:00'), 'd MMM yyyy')}. ${marker.relevance}`,
        href: '/labs',
      });
    }
  }

  // Total weekly amount per compound, a useful sanity check across protocols.
  const weekly = new Map<string, { name: string; unit: string; total: number; protocols: number }>();
  for (const p of active) {
    const d = toBase(doseOn(p, now));
    const perWeek = d.value * perWeekCount(p);
    if (perWeek <= 0) continue;
    const key = (p.compoundId ?? p.name.toLowerCase()) + d.unit;
    const cur = weekly.get(key) ?? { name: p.name, unit: d.unit, total: 0, protocols: 0 };
    cur.total += perWeek;
    cur.protocols++;
    weekly.set(key, cur);
  }
  for (const [key, w] of weekly) {
    if (w.protocols > 1) {
      out.push({
        id: `weekly-${key}`,
        tone: 'attention',
        title: `${w.name} appears in ${w.protocols} protocols`,
        body: `Together they schedule ${w.total.toFixed(2)} ${w.unit === 'iu' ? 'IU' : w.unit} per week.`,
        href: '/protocols',
      });
    }
  }

  const order: InsightTone[] = ['attention', 'neutral', 'positive'];
  return out.sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone));
}

const DAY_MS = 86_400_000;

function dailyAverage(vitals: VitalEntry[], kind: VitalEntry['kind'], from: Date, to: Date): { avg: number; days: number } | null {
  const vals = vitals.filter((v) => v.kind === kind && new Date(v.at) >= from && new Date(v.at) < to).map((v) => v.value);
  if (vals.length === 0) return null;
  return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, days: vals.length };
}

const thousands = (n: number) => Math.round(n).toLocaleString('en-US');

/** Activity, sleep and heart-rate observations, mostly fed by Health Connect / Google Fit. */
export function activityInsights({ protocols, vitals, workouts = [], now }: InsightInput): Insight[] {
  const out: Insight[] = [];
  const today = parseDay(format(now, 'yyyy-MM-dd'));

  // Steps this week against last week (complete days only).
  const thisWeek = dailyAverage(vitals, 'steps', subDays(today, 7), today);
  const lastWeek = dailyAverage(vitals, 'steps', subDays(today, 14), subDays(today, 7));
  if (thisWeek && thisWeek.days >= 4) {
    const change = lastWeek && lastWeek.days >= 4 ? (thisWeek.avg - lastWeek.avg) / lastWeek.avg : null;
    out.push({
      id: 'steps-week',
      tone: change !== null && change <= -0.2 ? 'attention' : 'neutral',
      title: `${thousands(thisWeek.avg)} steps a day this week${change === null ? '' : Math.round(change * 100) === 0 ? ' (same as last week)' : ` (${change > 0 ? '+' : '−'}${Math.abs(Math.round(change * 100))}% vs last week)`}`,
      body: `Average of ${thisWeek.days} days${lastWeek && lastWeek.days >= 4 ? `; last week averaged ${thousands(lastWeek.avg)}.` : '.'}`,
      href: '/activity',
    });
  }

  // Steps before and since starting each recent protocol.
  for (const p of protocols.filter((x) => x.status === 'active')) {
    const start = parseDay(p.startDate);
    const since = differenceInCalendarDays(today, start);
    if (since < 7 || since > 90) continue;
    const before = dailyAverage(vitals, 'steps', subDays(start, 14), start);
    const after = dailyAverage(vitals, 'steps', start, today);
    if (!before || !after || before.days < 5 || after.days < 5) continue;
    const change = (after.avg - before.avg) / before.avg;
    if (Math.abs(change) < 0.1) continue;
    out.push({
      id: `steps-since-${p.id}`,
      tone: 'neutral',
      title: `Steps since starting ${p.name}: ${thousands(before.avg)} → ${thousands(after.avg)} a day`,
      body: `${change >= 0 ? 'Up' : 'Down'} ${Math.abs(Math.round(change * 100))}% comparing the 14 days before ${format(start, 'd MMM')} with the ${since} days since. A timing observation, not a cause.`,
      href: '/activity',
    });
  }

  // Workouts in the last 14 days.
  const recentWorkouts = workouts.filter((w) => new Date(w.start) >= subDays(now, 14));
  if (recentWorkouts.length > 0) {
    const minutes = recentWorkouts.reduce((sum, w) => sum + Math.max(0, (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60_000), 0);
    out.push({
      id: 'workouts',
      tone: 'positive',
      title: `${recentWorkouts.length} workout${recentWorkouts.length === 1 ? '' : 's'} in 14 days`,
      body: `${Math.round(minutes)} minutes in total, about ${Math.round(minutes / 2)} a week.`,
      href: '/activity',
    });
  }

  // Sleep over the last week.
  const sleep = dailyAverage(vitals, 'sleep', subDays(now, 7), new Date(now.getTime() + DAY_MS));
  if (sleep && sleep.days >= 4) {
    out.push({
      id: 'sleep-week',
      tone: sleep.avg < 6.5 ? 'attention' : 'neutral',
      title: `Sleep averaged ${sleep.avg.toFixed(1)} h over ${sleep.days} nights`,
      body: 'From the last seven days of sleep records.',
      href: '/vitals?kind=sleep',
    });
  }

  // Resting heart rate trend (GLP-1 agonists and stimulants commonly nudge it up).
  const hr = vitals
    .filter((v) => v.kind === 'restingHr' && new Date(v.at) >= subDays(now, 30))
    .map((v) => ({ t: new Date(v.at).getTime(), v: v.value }))
    .sort((a, b) => a.t - b.t);
  const hrSlope = hr.length >= 5 ? slopePerDay(hr) : null;
  if (hrSlope !== null && Math.abs(hrSlope * 30) >= 3) {
    out.push({
      id: 'resting-hr',
      tone: hrSlope > 0 ? 'attention' : 'positive',
      title: `Resting heart rate ${hrSlope > 0 ? 'up' : 'down'} about ${Math.abs(Math.round(hrSlope * 30))} bpm over 30 days`,
      body: `Fitted across ${hr.length} readings.`,
      href: '/vitals?kind=restingHr',
    });
  }

  return out;
}

function perWeekCount(p: Protocol): number {
  const s = p.schedule;
  switch (s.kind) {
    case 'daily':
      return s.times.length * 7;
    case 'everyNDays':
      return s.n > 0 ? 7 / s.n : 0;
    case 'weekdays':
      return s.days.length;
    case 'asNeeded':
      return 0;
  }
}

function alertBody(a: ReturnType<typeof alerts>[number]): string {
  switch (a) {
    case 'expired':
      return 'The expiry date has passed.';
    case 'expiring':
      return 'Expires within 30 days.';
    case 'low':
      return 'At or below your low-stock threshold.';
    case 'empty':
      return 'No stock left.';
    case 'old-reconstitution':
      return 'The open vial was mixed more than four weeks ago. Check the supplier’s stated in-use period.';
  }
}
