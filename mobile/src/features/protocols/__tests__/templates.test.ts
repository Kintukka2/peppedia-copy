import type { ProtocolTemplate } from '@/data/types';
import type { Protocol } from '@/domain/model';
import { describeScheduleOf } from '@/domain/schedule';

import { doseLine, endDateFor, summaryLine, templateToProtocols, titrationLine } from '../templates';

const base = { reportedBy: 'Test', goal: 'Test', notes: [], sources: [{ label: 'x', url: 'https://example.com' }] };

const glp: ProtocolTemplate = {
  ...base,
  id: 't-glp',
  name: 'Label titration',
  source: 'label',
  route: 'subq',
  kind: 'single',
  components: [{ compoundId: 'tirzepatide', dose: { value: 2.5, unit: 'mg' } }],
  schedule: { kind: 'weekdays', days: [1], time: '08:00' },
  titration: [
    { weeks: 4, dose: { value: 2.5, unit: 'mg' } },
    { weeks: 4, dose: { value: 5, unit: 'mg' } },
    { weeks: 4, dose: { value: 7.5, unit: 'mg' } },
  ],
};

const stack: ProtocolTemplate = {
  ...base,
  id: 't-stack',
  name: 'Repair stack',
  source: 'community',
  route: 'subq',
  kind: 'stack',
  components: [
    { compoundId: 'bpc-157', dose: { value: 250, unit: 'mcg' }, range: { min: 250, max: 500 } },
    { compoundId: 'thymosin-beta-4', dose: { value: 2, unit: 'mg' } },
  ],
  schedule: { kind: 'daily', times: ['08:00'] },
  cycle: { onWeeks: 6, offWeeks: 4 },
  durationWeeks: 6,
};

const blend: ProtocolTemplate = { ...stack, id: 't-blend', name: 'Wolverine blend', kind: 'blend', blendVial: [{ compoundId: 'bpc-157', amount: { value: 5, unit: 'mg' } }, { compoundId: 'thymosin-beta-4', amount: { value: 5, unit: 'mg' } }] };

let n = 0;
const opts = (existing: Protocol[] = []) => ({ startDate: '2026-10-24', createdAt: '2026-10-24T00:00:00.000Z', id: () => `id${n++}`, color: (taken: Protocol[]) => `#${taken.length}`, existing });

describe('template text', () => {
  it('summarises dose, range, schedule and titration', () => {
    expect(doseLine(stack.components[0])).toBe('250 mcg (250–500)');
    expect(titrationLine(glp)).toBe('2.5 → 5 → 7.5 mg, 4 wk each');
    expect(summaryLine(stack)).toBe(`BPC-157 250 mcg + Thymosin Beta-4 2 mg · ${describeScheduleOf(stack.schedule as Protocol['schedule'], stack.cycle)} · 6 wk`);
  });
  it('ends a run the day before the same weekday N weeks later', () => {
    expect(endDateFor('2026-10-24', 6)).toBe('2026-12-04');
    expect(endDateFor('2026-10-24', undefined)).toBeUndefined();
  });
});

describe('templateToProtocols', () => {
  it('carries the titration, schedule and template id for a single compound', () => {
    const [p] = templateToProtocols(glp, opts());
    expect(p).toMatchObject({ compoundId: 'tirzepatide', name: 'Tirzepatide', dose: { value: 2.5, unit: 'mg' }, templateId: 't-glp', status: 'active' });
    expect(p.titration).toHaveLength(3);
    expect(p.schedule).toEqual(glp.schedule);
    expect(p.schedule).not.toBe(glp.schedule);
  });

  it('makes one protocol per compound for a stack, with distinct colours and titration only on the first', () => {
    const out = templateToProtocols({ ...stack, titration: [{ weeks: 2, dose: { value: 250, unit: 'mcg' } }, { weeks: 4, dose: { value: 500, unit: 'mcg' } }] }, opts([{ color: '#x' } as Protocol]));
    expect(out.map((p) => p.compoundId)).toEqual(['bpc-157', 'thymosin-beta-4']);
    expect(out.map((p) => p.color)).toEqual(['#1', '#2']);
    expect(out[0].titration).toHaveLength(2);
    expect(out[1].titration).toBeUndefined();
    expect(out.every((p) => p.endDate === '2026-12-04' && p.cycle?.onWeeks === 6)).toBe(true);
  });

  it('makes a single blend protocol named for the blend and dosed by its first component', () => {
    const out = templateToProtocols(blend, opts());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'Wolverine blend', compoundId: 'bpc-157', dose: { value: 250, unit: 'mcg' } });
  });
});
