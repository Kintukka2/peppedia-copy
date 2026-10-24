import type { DoseLog, Protocol } from '../model';
import { buildInsights, slopePerDay } from '../insights';
import { siteUsage, suggestSite } from '../sites';

const log = (siteId: string, takenAt: string): DoseLog => ({
  id: siteId + takenAt,
  compoundId: 'x',
  name: 'X',
  takenAt,
  amount: { value: 1, unit: 'mg' },
  route: 'subq',
  siteId,
});

describe('site rotation', () => {
  it('suggests an unused site first, then the longest rested', () => {
    expect(suggestSite('subq', [])!.id).toBe('abd-ul');
    expect(suggestSite('subq', [log('abd-ul', '2026-01-01T08:00:00Z')])!.id).toBe('abd-ur');
  });

  it('only suggests IM-capable sites for IM', () => {
    expect(suggestSite('im', [])!.routes).toContain('im');
  });

  it('records usage counts and last compound', () => {
    const u = siteUsage([log('abd-ul', '2026-01-01T08:00:00Z'), log('abd-ul', '2026-01-03T08:00:00Z')]);
    expect(u.get('abd-ul')!.count).toBe(2);
    expect(u.get('abd-ul')!.lastAt).toBe(new Date('2026-01-03T08:00:00Z').getTime());
  });
});

describe('insights', () => {
  it('fits a slope', () => {
    const pts = [0, 1, 2, 3].map((d) => ({ t: d * 86_400_000, v: 100 - d * 0.5 }));
    expect(slopePerDay(pts)).toBeCloseTo(-0.5);
    expect(slopePerDay(pts.slice(0, 2))).toBeNull();
  });

  it('reports adherence and never uses causal language', () => {
    const p: Protocol = {
      id: 'p',
      compoundId: 'x',
      name: 'X',
      route: 'subq',
      dose: { value: 1, unit: 'mg' },
      schedule: { kind: 'daily', times: ['08:00'] },
      startDate: '2026-01-01',
      reminders: false,
      status: 'active',
      color: '#000',
      createdAt: '',
    };
    const insights = buildInsights({
      protocols: [p],
      logs: [],
      inventory: [],
      vitals: [],
      journal: [{ id: 'j', date: '2026-01-05', mood: 2, symptoms: ['Nausea'] }],
      labs: [{ id: 'l', date: '2026-01-02', markerId: 'hct', value: 52 }],
      sex: 'male',
      weightUnit: 'kg',
      now: new Date('2026-01-10T12:00:00'),
    });
    const text = insights.map((i) => i.title + ' ' + i.body).join(' ');
    expect(text).toMatch(/0% of scheduled doses/);
    expect(text).toMatch(/Haematocrit above range/);
    expect(text).not.toMatch(/caused|because of|due to/i);
  });
});
