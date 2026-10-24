import { buildInsights } from '@/domain/insights';
import type { VitalEntry } from '@/domain/model';
import { EMPTY_DATA, getData, migrate, useStore } from '@/store';

import { averageOf, lastDays, todayTotal } from '../activity';
import {
  bloodPressureVitals,
  dailyVitals,
  exerciseLabel,
  lastSyncWithData,
  mergeDays,
  noonOf,
  sleepVitals,
  syncWindowStart,
  TITRA_PACKAGE,
  weightVitals,
  workoutsFrom,
} from '../connect';

const FIT = 'com.google.android.apps.fitness';

describe('Health Connect mapping', () => {
  it('merges per-metric daily aggregates into one row per local day', () => {
    const days = mergeDays([
      { metric: 'steps', groups: [{ startTime: '2026-10-22T00:00', value: 9000 }, { startTime: '2026-10-23T00:00', value: 4000 }] },
      { metric: 'distanceKm', groups: [{ startTime: '2026-10-23T00:00', value: 3.1 }] },
    ]);
    expect(days).toEqual([
      { date: '2026-10-22', steps: 9000 },
      { date: '2026-10-23', steps: 4000, distanceKm: 3.1 },
    ]);
  });

  it('turns daily totals into vitals keyed by kind and day, skipping empty days', () => {
    const v = dailyVitals([{ date: '2026-10-23', steps: 4000.4, distanceKm: 3.14159, activeKcal: 0, exerciseMin: 32.6 }]);
    expect(v.map((x) => [x.kind, x.value, x.externalId])).toEqual([
      ['steps', 4000, 'hc:steps:2026-10-23'],
      ['distance', 3.14, 'hc:distance:2026-10-23'],
      ['exerciseMin', 33, 'hc:exerciseMin:2026-10-23'],
    ]);
    expect(v[0].at).toBe(noonOf('2026-10-23'));
    expect(new Date(v[0].at).getHours()).toBe(12);
    expect(v.every((x) => x.source === 'health-connect')).toBe(true);
  });

  it('skips records Titra wrote itself, so write-back never comes back as a duplicate', () => {
    const out = weightVitals([
      { time: '2026-10-23T07:00:00Z', weight: { inKilograms: 92.456 }, metadata: { id: 'a', dataOrigin: FIT } },
      { time: '2026-10-23T07:05:00Z', weight: { inKilograms: 92.4 }, metadata: { id: 'b', dataOrigin: TITRA_PACKAGE } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'weight', value: 92.46, externalId: 'hc:a' });
  });

  it('maps blood pressure to systolic and diastolic', () => {
    const [bp] = bloodPressureVitals([{ time: '2026-10-23T08:00:00Z', systolic: { inMillimetersOfMercury: 121.6 }, diastolic: { inMillimetersOfMercury: 79.2 }, metadata: { id: 'bp1' } }]);
    expect(bp).toMatchObject({ kind: 'bloodPressure', value: 122, value2: 79 });
  });

  it('counts only asleep stages, and the whole session when there are none', () => {
    const [staged, plain] = sleepVitals([
      {
        startTime: '2026-10-22T22:00:00Z',
        endTime: '2026-10-23T06:00:00Z',
        stages: [
          { startTime: '2026-10-22T22:00:00Z', endTime: '2026-10-22T22:30:00Z', stage: 1 },
          { startTime: '2026-10-22T22:30:00Z', endTime: '2026-10-23T03:30:00Z', stage: 4 },
          { startTime: '2026-10-23T03:30:00Z', endTime: '2026-10-23T05:30:00Z', stage: 6 },
          { startTime: '2026-10-23T05:30:00Z', endTime: '2026-10-23T06:00:00Z', stage: 3 },
        ],
        metadata: { id: 's1' },
      },
      { startTime: '2026-10-23T23:00:00Z', endTime: '2026-10-24T06:30:00Z', metadata: { id: 's2' } },
    ]);
    expect(staged.value).toBe(7);
    expect(staged.at).toBe('2026-10-23T06:00:00.000Z');
    expect(plain.value).toBe(7.5);
  });

  it('keeps workout type, times and the app that recorded it', () => {
    const [w] = workoutsFrom([{ startTime: '2026-10-23T18:00:00Z', endTime: '2026-10-23T18:45:00Z', exerciseType: 56, metadata: { id: 'w1', dataOrigin: FIT } }]);
    expect(w).toMatchObject({ type: 56, externalId: 'hc:w1', origin: FIT, source: 'health-connect' });
    expect(exerciseLabel(56)).toBe('Running');
    expect(exerciseLabel(999)).toBe('Workout');
  });

  it('backfills 90 days first, then re-reads from two days before the last sync', () => {
    const now = new Date('2026-10-24T10:00:00');
    expect(syncWindowStart(undefined, now)).toEqual(new Date(2026, 6, 26));
    expect(syncWindowStart(new Date('2026-10-23T22:00:00').toISOString(), now)).toEqual(new Date(2026, 9, 21));
    expect(syncWindowStart(new Date('2025-01-01T00:00:00').toISOString(), now)).toEqual(new Date(2026, 6, 26));
  });
});

describe('sync window after data is cleared', () => {
  const last = '2026-10-23T22:00:00.000Z';
  it('backfills again when synced records are gone (delete all, sample data)', () => {
    expect(lastSyncWithData(last, [{ source: undefined }], [])).toBeUndefined();
    expect(syncWindowStart(lastSyncWithData(last, [], []), new Date('2026-10-24T10:00:00'))).toEqual(new Date(2026, 6, 26));
  });
  it('stays incremental while synced records are present', () => {
    expect(lastSyncWithData(last, [{ source: 'health-connect' }], [])).toBe(last);
    expect(lastSyncWithData(last, [], [{ source: 'health-connect' }])).toBe(last);
  });
});

describe('merging synced records', () => {
  beforeEach(() => useStore.getState().replaceAll(EMPTY_DATA));

  it('is idempotent and updates a day total as it grows', () => {
    const first = dailyVitals([{ date: '2026-10-23', steps: 4000 }]);
    expect(useStore.getState().mergeSynced({ vitals: first, workouts: [] })).toEqual({ added: 1, updated: 0 });
    expect(useStore.getState().mergeSynced({ vitals: first, workouts: [] })).toEqual({ added: 0, updated: 0 });
    const later = dailyVitals([{ date: '2026-10-23', steps: 9500 }]);
    expect(useStore.getState().mergeSynced({ vitals: later, workouts: [] })).toEqual({ added: 0, updated: 1 });
    const steps = getData().vitals.filter((v) => v.kind === 'steps');
    expect(steps).toHaveLength(1);
    expect(steps[0].value).toBe(9500);
  });

  it('clearing synced data keeps manual entries', () => {
    useStore.getState().addVital({ kind: 'weight', value: 90, at: '2026-10-20T07:00:00.000Z' });
    useStore.getState().mergeSynced({ vitals: dailyVitals([{ date: '2026-10-23', steps: 4000 }]), workouts: workoutsFrom([{ startTime: '2026-10-23T18:00:00Z', endTime: '2026-10-23T18:30:00Z', exerciseType: 79 }]) });
    useStore.getState().updateSettings({ healthLastSync: '2026-10-23T20:00:00.000Z' });
    useStore.getState().clearSynced();
    expect(getData().vitals.map((v) => v.kind)).toEqual(['weight']);
    expect(getData().workouts).toEqual([]);
    expect(getData().settings.healthLastSync).toBeUndefined();
  });
});

describe('migration', () => {
  it('carries the v1 terms timestamp over as onboarding and adds health defaults', () => {
    const data = migrate({ settings: { acceptedTermsAt: '2026-05-01T00:00:00.000Z', weightUnit: 'lb' } });
    expect(data.settings.onboardedAt).toBe('2026-05-01T00:00:00.000Z');
    expect('acceptedTermsAt' in data.settings).toBe(false);
    expect(data.settings).toMatchObject({ weightUnit: 'lb', healthSync: false, healthWriteBack: false });
    expect(data.workouts).toEqual([]);
  });
});

describe('activity selectors and insights', () => {
  const now = new Date('2026-10-24T15:00:00');
  const day = (d: number, kind: VitalEntry['kind'], value: number): VitalEntry => ({ id: `${kind}${d}`, kind, value, at: noonOf(`2026-10-${String(d).padStart(2, '0')}`) });

  it('fills missing days with zero and averages only days with data', () => {
    const vitals = [day(22, 'steps', 6000), day(24, 'steps', 2000)];
    expect(lastDays(vitals, 'steps', 3, now).map((d) => d.value)).toEqual([6000, 0, 2000]);
    expect(averageOf(lastDays(vitals, 'steps', 3, now))).toBe(4000);
    expect(todayTotal(vitals, 'steps', now)).toBe(2000);
  });

  it('reports steps before and since a protocol started', () => {
    const vitals: VitalEntry[] = [];
    for (let d = 1; d <= 23; d++) vitals.push(day(d, 'steps', d < 10 ? 6000 : 9000));
    const insights = buildInsights({
      protocols: [{ id: 'p', compoundId: 'retatrutide', name: 'Retatrutide', route: 'subq', dose: { value: 2, unit: 'mg' }, schedule: { kind: 'weekdays', days: [1], time: '08:00' }, startDate: '2026-10-10', reminders: false, status: 'active', color: '#000', createdAt: '' }],
      logs: [],
      inventory: [],
      vitals,
      journal: [],
      labs: [],
      sex: 'unspecified',
      weightUnit: 'kg',
      now,
    });
    const since = insights.find((i) => i.id === 'steps-since-p');
    expect(since?.title).toBe('Steps since starting Retatrutide: 6,000 → 9,000 a day');
    expect(insights.find((i) => i.id === 'steps-week')?.title).toBe('9,000 steps a day this week (same as last week)');
  });
});
