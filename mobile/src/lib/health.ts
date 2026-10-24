// Health Connect bridge (Android). Google Fit, Fitbit, Pixel Watch, Samsung
// Health and most Android health apps write into Health Connect; Titra reads
// daily activity, workouts, sleep, resting heart rate, weight, body fat and
// blood pressure from it, and can write its own weight, body-fat and
// blood-pressure entries back. Needs a development or release build; Expo Go
// has no Health Connect module.

import { Platform } from 'react-native';
import * as HealthConnect from 'react-native-health-connect';

import type { VitalEntry, Workout } from '@/domain/model';
import {
  bloodPressureVitals,
  bodyFatVitals,
  dailyVitals,
  mergeDays,
  restingHrVitals,
  sleepVitals,
  weightVitals,
  workoutsFrom,
  type DayTotals,
} from '@/features/health/connect';

export const healthSupported = Platform.OS === 'android';

export type HealthStatus = 'unsupported' | 'unavailable' | 'needs-update' | 'available';

type ReadType = 'Steps' | 'Distance' | 'ActiveCaloriesBurned' | 'ExerciseSession' | 'RestingHeartRate' | 'Weight' | 'BodyFat' | 'BloodPressure' | 'SleepSession';
type WriteType = 'Weight' | 'BodyFat' | 'BloodPressure';

const READ: ReadType[] = ['Steps', 'Distance', 'ActiveCaloriesBurned', 'ExerciseSession', 'RestingHeartRate', 'Weight', 'BodyFat', 'BloodPressure', 'SleepSession'];
const WRITE: WriteType[] = ['Weight', 'BodyFat', 'BloodPressure'];

export const READ_LABELS = ['Steps', 'Distance', 'Active energy', 'Workouts', 'Resting heart rate', 'Weight', 'Body fat', 'Blood pressure', 'Sleep'];

export async function healthStatus(): Promise<HealthStatus> {
  if (!healthSupported) return 'unsupported';
  try {
    const s = await HealthConnect.getSdkStatus();
    if (s === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (s === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

let initialized = false;
async function ready() {
  if (!initialized) initialized = await HealthConnect.initialize();
  if (!initialized) throw new Error('Health Connect could not start.');
}

export interface Grants {
  read: Set<string>;
  write: Set<string>;
  history: boolean;
}

function toGrants(list: { accessType: string; recordType: string }[]): Grants {
  return {
    read: new Set(list.filter((p) => p.accessType === 'read').map((p) => p.recordType)),
    write: new Set(list.filter((p) => p.accessType === 'write').map((p) => p.recordType)),
    history: list.some((p) => p.recordType === 'ReadHealthDataHistory'),
  };
}

/** Shows Health Connect's permission sheet. History access lets the first sync reach back past 30 days. */
export async function connectHealth(writeBack: boolean): Promise<Grants> {
  await ready();
  const granted = await HealthConnect.requestPermission([
    ...READ.map((recordType) => ({ accessType: 'read' as const, recordType })),
    ...(writeBack ? WRITE.map((recordType) => ({ accessType: 'write' as const, recordType })) : []),
    { accessType: 'read', recordType: 'ReadHealthDataHistory' },
  ]);
  return toGrants(granted);
}

export async function healthGrants(): Promise<Grants> {
  await ready();
  return toGrants(await HealthConnect.getGrantedPermissions());
}

export function openHealthSettings() {
  if (healthSupported) HealthConnect.openHealthConnectSettings();
}

async function readAll<T extends ReadType>(recordType: T, from: Date, to: Date) {
  const out: HealthConnect.RecordResult<T>[] = [];
  let pageToken: string | undefined;
  do {
    const page = await HealthConnect.readRecords(recordType, {
      timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() },
      pageSize: 1000,
      pageToken,
    });
    out.push(...page.records);
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return out;
}

export interface HealthPull {
  vitals: Omit<VitalEntry, 'id'>[];
  workouts: Omit<Workout, 'id'>[];
  days: DayTotals[];
  /** Data types the person has not granted, so they can be told why something is missing. */
  missing: string[];
}

/**
 * Reads everything from `from` (local midnight) to `to`. Daily totals use
 * Health Connect's aggregation, which removes overlap between apps (a phone
 * and a watch both counting steps) by the person's app priority.
 */
export async function pullHealth(from: Date, to: Date): Promise<HealthPull> {
  await ready();
  const grants = await healthGrants();
  const can = (t: ReadType) => grants.read.has(t);
  const timeRangeFilter = { operator: 'between' as const, startTime: from.toISOString(), endTime: to.toISOString() };
  const timeRangeSlicer = { period: 'DAYS' as const, length: 1 };

  const parts: Parameters<typeof mergeDays>[0] = [];
  if (can('Steps')) {
    const g = await HealthConnect.aggregateGroupByPeriod({ recordType: 'Steps', timeRangeFilter, timeRangeSlicer });
    parts.push({ metric: 'steps', groups: g.map((x) => ({ startTime: x.startTime, value: x.result.COUNT_TOTAL })) });
  }
  if (can('Distance')) {
    const g = await HealthConnect.aggregateGroupByPeriod({ recordType: 'Distance', timeRangeFilter, timeRangeSlicer });
    parts.push({ metric: 'distanceKm', groups: g.map((x) => ({ startTime: x.startTime, value: x.result.DISTANCE.inKilometers })) });
  }
  if (can('ActiveCaloriesBurned')) {
    const g = await HealthConnect.aggregateGroupByPeriod({ recordType: 'ActiveCaloriesBurned', timeRangeFilter, timeRangeSlicer });
    parts.push({ metric: 'activeKcal', groups: g.map((x) => ({ startTime: x.startTime, value: x.result.ACTIVE_CALORIES_TOTAL.inKilocalories })) });
  }
  if (can('ExerciseSession')) {
    const g = await HealthConnect.aggregateGroupByPeriod({ recordType: 'ExerciseSession', timeRangeFilter, timeRangeSlicer });
    parts.push({ metric: 'exerciseMin', groups: g.map((x) => ({ startTime: x.startTime, value: x.result.EXERCISE_DURATION_TOTAL.inSeconds / 60 })) });
  }
  const days = mergeDays(parts);

  const vitals = [
    ...dailyVitals(days),
    ...(can('Weight') ? weightVitals(await readAll('Weight', from, to)) : []),
    ...(can('BodyFat') ? bodyFatVitals(await readAll('BodyFat', from, to)) : []),
    ...(can('BloodPressure') ? bloodPressureVitals(await readAll('BloodPressure', from, to)) : []),
    ...(can('RestingHeartRate') ? restingHrVitals(await readAll('RestingHeartRate', from, to)) : []),
    ...(can('SleepSession') ? sleepVitals(await readAll('SleepSession', from, to)) : []),
  ];
  const workouts = can('ExerciseSession') ? workoutsFrom(await readAll('ExerciseSession', from, to)) : [];
  const missing = READ.filter((t) => !can(t)).map((t) => READ_LABELS[READ.indexOf(t)]);
  return { vitals, workouts, days, missing };
}

const clientId = (v: VitalEntry) => `titra:${v.id}`;
const manual = (v: VitalEntry) => ({ recordingMethod: 3, clientRecordId: clientId(v), clientRecordVersion: 1 });

/** Writes a manual weight, body-fat or blood-pressure entry to Health Connect. Other kinds are ignored. */
export async function pushVital(v: VitalEntry): Promise<boolean> {
  if (!healthSupported) return false;
  await ready();
  const time = new Date(v.at).toISOString();
  switch (v.kind) {
    case 'weight':
      await HealthConnect.insertRecords([{ recordType: 'Weight', time, weight: { value: v.value, unit: 'kilograms' }, metadata: manual(v) }]);
      return true;
    case 'bodyFat':
      await HealthConnect.insertRecords([{ recordType: 'BodyFat', time, percentage: v.value, metadata: manual(v) }]);
      return true;
    case 'bloodPressure':
      if (v.value2 === undefined) return false;
      await HealthConnect.insertRecords([
        {
          recordType: 'BloodPressure',
          time,
          systolic: { value: v.value, unit: 'millimetersOfMercury' },
          diastolic: { value: v.value2, unit: 'millimetersOfMercury' },
          bodyPosition: 0,
          measurementLocation: 0,
          metadata: manual(v),
        },
      ]);
      return true;
    default:
      return false;
  }
}

/** Removes a previously written entry from Health Connect. */
export async function unpushVital(v: VitalEntry): Promise<void> {
  if (!healthSupported) return;
  const type = v.kind === 'weight' ? 'Weight' : v.kind === 'bodyFat' ? 'BodyFat' : v.kind === 'bloodPressure' ? 'BloodPressure' : null;
  if (!type) return;
  await ready();
  await HealthConnect.deleteRecordsByUuids(type, [], [clientId(v)]);
}
