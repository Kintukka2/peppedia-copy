// Turns protocols into concrete scheduled doses: titration steps, on/off
// cycles, today's agenda, next dose and adherence. All calendar logic is in the
// device's local time zone.

import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';

import type { Amount, ClockTime, DoseLog, Protocol } from './model';

export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function atTime(day: Date, time: ClockTime): Date {
  const [h, m] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, m || 0);
}

/** Whole days from the protocol's start to `day` (negative before the start). */
export function dayIndex(protocol: Protocol, day: Date): number {
  return differenceInCalendarDays(startOfDay(day), parseDay(protocol.startDate));
}

/** True when `day` falls in an off-week of the protocol's cycle. */
export function isOffWeek(protocol: Protocol, day: Date): boolean {
  const c = protocol.cycle;
  if (!c || c.onWeeks <= 0 || c.offWeeks <= 0) return false;
  const idx = dayIndex(protocol, day);
  if (idx < 0) return false;
  const week = Math.floor(idx / 7);
  return week % (c.onWeeks + c.offWeeks) >= c.onWeeks;
}

/** Scheduled dose times on a local calendar day. */
export function slotsOnDay(protocol: Protocol, day: Date): Date[] {
  if (protocol.status !== 'active') return [];
  const idx = dayIndex(protocol, day);
  if (idx < 0) return [];
  if (protocol.endDate && differenceInCalendarDays(startOfDay(day), parseDay(protocol.endDate)) > 0) return [];
  if (isOffWeek(protocol, day)) return [];

  const s = protocol.schedule;
  switch (s.kind) {
    case 'daily':
      return [...s.times].sort().map((t) => atTime(day, t));
    case 'everyNDays':
      return s.n > 0 && idx % s.n === 0 ? [atTime(day, s.time)] : [];
    case 'weekdays':
      return s.days.includes(day.getDay()) ? [atTime(day, s.time)] : [];
    case 'asNeeded':
      return [];
  }
}

/** All scheduled times in [from, to], inclusive by day. */
export function occurrences(protocol: Protocol, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const days = differenceInCalendarDays(to, from);
  for (let i = 0; i <= days; i++) {
    for (const slot of slotsOnDay(protocol, addDays(startOfDay(from), i))) {
      if (slot >= from && slot <= to) out.push(slot);
    }
  }
  return out;
}

/** The dose that applies on `date`, following titration steps by elapsed weeks. */
export function doseOn(protocol: Protocol, date: Date): Amount {
  const steps = protocol.titration;
  if (!steps || steps.length === 0) return protocol.dose;
  const week = Math.max(0, Math.floor(dayIndex(protocol, date) / 7));
  let elapsed = 0;
  for (const step of steps) {
    elapsed += step.weeks;
    if (week < elapsed) return step.dose;
  }
  return steps[steps.length - 1].dose;
}

/** Index of the titration step in effect, or null without titration. */
export function titrationStepOn(protocol: Protocol, date: Date): number | null {
  const steps = protocol.titration;
  if (!steps || steps.length === 0) return null;
  const week = Math.max(0, Math.floor(dayIndex(protocol, date) / 7));
  let elapsed = 0;
  for (let i = 0; i < steps.length; i++) {
    elapsed += steps[i].weeks;
    if (week < elapsed) return i;
  }
  return steps.length - 1;
}

export interface AgendaItem {
  protocol: Protocol;
  at: Date;
  dose: Amount;
  log?: DoseLog;
}

/**
 * Today's scheduled doses with the log that fulfilled each. A log claims a slot
 * by `scheduledFor`; logs without one claim the earliest open slot that day.
 */
export function agendaForDay(protocols: Protocol[], logs: DoseLog[], day: Date): AgendaItem[] {
  const key = dayKey(day);
  const items: AgendaItem[] = [];
  for (const p of protocols) {
    const slots = slotsOnDay(p, day);
    if (slots.length === 0) continue;
    const dayLogs = logs.filter((l) => l.protocolId === p.id && dayKey(new Date(l.scheduledFor ?? l.takenAt)) === key);
    const claimed = new Set<string>();
    const pending: AgendaItem[] = slots.map((at) => {
      const exact = dayLogs.find((l) => l.scheduledFor === at.toISOString());
      if (exact) claimed.add(exact.id);
      return { protocol: p, at, dose: doseOn(p, at), log: exact };
    });
    const loose = dayLogs.filter((l) => !claimed.has(l.id) && !l.scheduledFor);
    for (const item of pending) {
      if (!item.log && loose.length > 0) item.log = loose.shift();
    }
    items.push(...pending);
  }
  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** The first scheduled time after `now` (searches a year ahead). */
export function nextDose(protocol: Protocol, now: Date): Date | null {
  for (let i = 0; i < 366; i++) {
    const slot = slotsOnDay(protocol, addDays(startOfDay(now), i)).find((s) => s > now);
    if (slot) return slot;
  }
  return null;
}

/** Average scheduled doses per day over a full cycle; used for supply forecasts. */
export function dosesPerDay(protocol: Protocol): number {
  if (protocol.status !== 'active') return 0;
  const s = protocol.schedule;
  let perDay: number;
  switch (s.kind) {
    case 'daily':
      perDay = s.times.length;
      break;
    case 'everyNDays':
      perDay = s.n > 0 ? 1 / s.n : 0;
      break;
    case 'weekdays':
      perDay = s.days.length / 7;
      break;
    case 'asNeeded':
      perDay = 0;
  }
  const c = protocol.cycle;
  if (c && c.onWeeks > 0 && c.offWeeks > 0) perDay *= c.onWeeks / (c.onWeeks + c.offWeeks);
  return perDay;
}

export interface Adherence {
  scheduled: number;
  taken: number;
  skipped: number;
  rate: number | null;
}

/** Share of scheduled doses in [from, to] that were logged as taken. Future slots are ignored. */
export function adherence(protocol: Protocol, logs: DoseLog[], from: Date, to: Date, now: Date): Adherence {
  const end = to < now ? to : now;
  if (end < from) return { scheduled: 0, taken: 0, skipped: 0, rate: null };
  let scheduled = 0;
  let taken = 0;
  let skipped = 0;
  const days = differenceInCalendarDays(end, from);
  for (let i = 0; i <= days; i++) {
    const day = addDays(startOfDay(from), i);
    for (const item of agendaForDay([protocol], logs, day)) {
      if (item.at < from || item.at > end) continue;
      scheduled++;
      if (item.log?.skipped) skipped++;
      else if (item.log) taken++;
    }
  }
  return { scheduled, taken, skipped, rate: scheduled > 0 ? taken / scheduled : null };
}

export function describeSchedule(protocol: Protocol): string {
  const s = protocol.schedule;
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let text: string;
  switch (s.kind) {
    case 'daily':
      text = s.times.length === 1 ? 'Daily' : `${s.times.length}× daily`;
      break;
    case 'everyNDays':
      text = s.n === 1 ? 'Daily' : `Every ${s.n} days`;
      break;
    case 'weekdays':
      text = s.days.length === 1 ? `Weekly · ${names[s.days[0]]}` : s.days.length === 7 ? 'Daily' : s.days.map((d) => names[d]).join(' · ');
      break;
    case 'asNeeded':
      text = 'As needed';
  }
  const c = protocol.cycle;
  if (c && c.onWeeks > 0 && c.offWeeks > 0) text += ` · ${c.onWeeks} on / ${c.offWeeks} off`;
  return text;
}
