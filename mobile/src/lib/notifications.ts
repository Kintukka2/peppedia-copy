// Dose reminders. Rather than encoding every schedule shape (titration,
// cycles, every-N-days) as repeating triggers, the app schedules one-off
// notifications for the next week of doses and re-syncs whenever protocols or
// logs change and on every launch. That keeps reminders exact and the number
// of pending alarms small.

import { addDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { ROUTE_SHORT } from '@/data/library';
import type { DoseLog, Protocol } from '@/domain/model';
import { agendaForDay, doseOn, occurrences } from '@/domain/schedule';
import { formatAmount } from '@/domain/units';

const CHANNEL = 'doses';
const HORIZON_DAYS = 7;
const MAX_PENDING = 60;

export const remindersSupported = Platform.OS === 'android';

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (!remindersSupported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Dose reminders',
    importance: AndroidImportance.HIGH,
  });
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  await configureNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function syncReminders(protocols: Protocol[], logs: DoseLog[], enabled: boolean): Promise<number> {
  if (!remindersSupported) return 0;
  await configureNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;

  const now = new Date();
  const until = addDays(now, HORIZON_DAYS);
  const upcoming: { p: Protocol; at: Date }[] = [];
  for (const p of protocols) {
    if (!p.reminders || p.status !== 'active') continue;
    for (const at of occurrences(p, now, until)) if (at > now) upcoming.push({ p, at });
  }
  upcoming.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Skip slots already logged (e.g. a dose taken early).
  const logged = new Set<string>();
  for (const day of [0, 1].map((d) => addDays(now, d))) {
    for (const item of agendaForDay(protocols, logs, day)) if (item.log) logged.add(item.protocol.id + item.at.toISOString());
  }

  let count = 0;
  for (const { p, at } of upcoming) {
    if (count >= MAX_PENDING) break;
    if (logged.has(p.id + at.toISOString())) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${p.name} due`,
        body: `${formatAmount(doseOn(p, at), true)} · ${ROUTE_SHORT[p.route]}. Tap to log it.`,
        data: { protocolId: p.id, scheduledFor: at.toISOString() },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
    count++;
  }
  return count;
}
