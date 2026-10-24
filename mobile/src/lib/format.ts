import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday } from 'date-fns';

export function whenLabel(d: Date | null): string {
  if (!d) return 'No upcoming dose';
  if (isToday(d)) return `Today · ${format(d, 'HH:mm')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'HH:mm')}`;
  return format(d, 'EEE d MMM · HH:mm');
}

export function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE d MMM');
}

export function relativeDays(d: Date, now = new Date()): string {
  const n = differenceInCalendarDays(d, now);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
