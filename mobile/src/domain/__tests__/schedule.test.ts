import type { DoseLog, Protocol } from '../model';
import { adherence, agendaForDay, describeSchedule, doseOn, dosesPerDay, isOffWeek, nextDose, occurrences, slotsOnDay, titrationStepOn } from '../schedule';

function protocol(over: Partial<Protocol> = {}): Protocol {
  return {
    id: 'p1',
    compoundId: 'x',
    name: 'X',
    route: 'subq',
    dose: { value: 1, unit: 'mg' },
    schedule: { kind: 'daily', times: ['08:00'] },
    startDate: '2026-01-05', // Monday
    reminders: false,
    status: 'active',
    color: '#000',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const day = (s: string) => new Date(s + 'T00:00:00');

describe('slots', () => {
  it('daily with two times', () => {
    const p = protocol({ schedule: { kind: 'daily', times: ['20:00', '08:00'] } });
    const slots = slotsOnDay(p, day('2026-01-06'));
    expect(slots.map((d) => d.getHours())).toEqual([8, 20]);
  });

  it('nothing before the start or after the end', () => {
    const p = protocol({ endDate: '2026-01-10' });
    expect(slotsOnDay(p, day('2026-01-04'))).toHaveLength(0);
    expect(slotsOnDay(p, day('2026-01-10'))).toHaveLength(1);
    expect(slotsOnDay(p, day('2026-01-11'))).toHaveLength(0);
  });

  it('every N days counts from the start date', () => {
    const p = protocol({ schedule: { kind: 'everyNDays', n: 3, time: '09:00' } });
    const days = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'].map((d) => slotsOnDay(p, day(d)).length);
    expect(days).toEqual([1, 0, 0, 1]);
  });

  it('weekdays', () => {
    const p = protocol({ schedule: { kind: 'weekdays', days: [1, 4], time: '19:00' } });
    const from = day('2026-01-05');
    const to = new Date('2026-01-18T23:59:00');
    expect(occurrences(p, from, to)).toHaveLength(4);
  });

  it('paused protocols schedule nothing', () => {
    expect(slotsOnDay(protocol({ status: 'paused' }), day('2026-01-06'))).toHaveLength(0);
  });
});

describe('cycles', () => {
  const p = protocol({ cycle: { onWeeks: 2, offWeeks: 1 } });
  it('skips off weeks', () => {
    expect(isOffWeek(p, day('2026-01-12'))).toBe(false); // week 2
    expect(isOffWeek(p, day('2026-01-19'))).toBe(true); // week 3 (off)
    expect(isOffWeek(p, day('2026-01-26'))).toBe(false); // week 4 (on again)
    expect(slotsOnDay(p, day('2026-01-20'))).toHaveLength(0);
  });
  it('scales the daily rate', () => {
    expect(dosesPerDay(p)).toBeCloseTo(2 / 3);
  });
});

describe('titration', () => {
  const p = protocol({
    schedule: { kind: 'weekdays', days: [1], time: '08:00' },
    titration: [
      { weeks: 4, dose: { value: 2.5, unit: 'mg' } },
      { weeks: 4, dose: { value: 5, unit: 'mg' } },
    ],
  });
  it('steps by elapsed weeks and holds the last step', () => {
    expect(doseOn(p, day('2026-01-05')).value).toBe(2.5);
    expect(doseOn(p, day('2026-01-26')).value).toBe(2.5); // week 3
    expect(doseOn(p, day('2026-02-02')).value).toBe(5); // week 4
    expect(doseOn(p, day('2026-06-01')).value).toBe(5);
    expect(titrationStepOn(p, day('2026-02-02'))).toBe(1);
  });
});

describe('agenda and adherence', () => {
  const p = protocol({ schedule: { kind: 'daily', times: ['08:00', '20:00'] } });
  const log = (over: Partial<DoseLog>): DoseLog => ({
    id: Math.random().toString(),
    protocolId: 'p1',
    compoundId: 'x',
    name: 'X',
    takenAt: '2026-01-06T08:05:00',
    amount: { value: 1, unit: 'mg' },
    route: 'subq',
    ...over,
  });

  it('matches exact slots and assigns loose logs to open slots', () => {
    const morning = new Date('2026-01-06T08:00:00').toISOString();
    const logs = [log({ scheduledFor: morning }), log({ takenAt: new Date('2026-01-06T21:00:00').toISOString() })];
    const agenda = agendaForDay([p], logs, day('2026-01-06'));
    expect(agenda).toHaveLength(2);
    expect(agenda.every((a) => a.log)).toBe(true);
  });

  it('computes adherence over past slots only', () => {
    const logs = [log({ scheduledFor: new Date('2026-01-05T08:00:00').toISOString() }), log({ scheduledFor: new Date('2026-01-05T20:00:00').toISOString(), skipped: true })];
    const a = adherence(p, logs, day('2026-01-05'), new Date('2026-01-06T23:59:00'), new Date('2026-01-06T12:00:00'));
    expect(a.scheduled).toBe(3); // Jan 5 ×2 + Jan 6 08:00
    expect(a.taken).toBe(1);
    expect(a.skipped).toBe(1);
  });

  it('finds the next dose', () => {
    expect(nextDose(p, new Date('2026-01-06T09:00:00'))!.getHours()).toBe(20);
  });
});

describe('describeSchedule', () => {
  it('labels common patterns', () => {
    expect(describeSchedule(protocol({ schedule: { kind: 'weekdays', days: [1], time: '08:00' } }))).toBe('Weekly · Mon');
    expect(describeSchedule(protocol({ schedule: { kind: 'daily', times: ['08:00', '20:00'] }, cycle: { onWeeks: 5, offWeeks: 2 } }))).toBe('2× daily · 5 on / 2 off');
  });
});
