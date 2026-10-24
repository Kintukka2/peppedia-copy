import { format, isSameYear } from 'date-fns';

import { dayLabel } from '@/lib/format';

/** Local Date from `YYYY-MM-DD` and `HH:mm`. */
export function atLocal(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, min || 0);
}

/** "Today", "Mon 20 Oct", or "20 Oct 2025" outside the current year. */
export function dateLabel(d: Date, now = new Date()): string {
  return isSameYear(d, now) ? dayLabel(d) : format(d, 'd MMM yyyy');
}

export function dateTimeLabel(d: Date, now = new Date()): string {
  return `${dateLabel(d, now)} · ${format(d, 'HH:mm')}`;
}

/** Fixed decimals, thousands separators for long integers, a true minus sign. */
export function formatNumber(v: number, decimals: number): string {
  if (!Number.isFinite(v)) return '—';
  const rounded = Number(v.toFixed(decimals));
  const [int, frac] = Math.abs(rounded).toFixed(decimals).split('.');
  const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int;
  return (rounded < 0 ? '−' : '') + grouped + (frac ? `.${frac}` : '');
}

/** Signed change: +0.4, −1.2, 0. */
export function formatChange(v: number, decimals: number): string {
  const rounded = Number(v.toFixed(decimals));
  if (rounded === 0) return '0';
  return (rounded > 0 ? '+' : '') + formatNumber(rounded, decimals);
}

/** Compact axis labels for values of any magnitude. */
export function axisValue(v: number): string {
  const a = Math.abs(v);
  if (a >= 10_000) return `${(v / 1000).toFixed(0)}k`;
  if (a >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
