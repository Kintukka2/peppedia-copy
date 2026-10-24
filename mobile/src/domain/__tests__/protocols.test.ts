import { COMPOUND_BY_ID } from '@/data/library';
import { PROTOCOL_TEMPLATES, stacksWith, templatesFor } from '@/data/protocols';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

describe('protocol templates', () => {
  it('have unique ids', () => {
    const ids = PROTOCOL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PROTOCOL_TEMPLATES.map((t) => [t.id, t] as const))('%s is well formed', (_id, t) => {
    expect(t.name.trim()).not.toBe('');
    expect(t.reportedBy.trim()).not.toBe('');
    expect(t.goal.trim()).not.toBe('');
    expect(t.sources.length).toBeGreaterThan(0);
    for (const s of t.sources) expect(s.url).toMatch(/^https:\/\//);

    expect(t.components.length).toBeGreaterThan(0);
    if (t.kind === 'single') expect(t.components).toHaveLength(1);
    else expect(t.components.length).toBeGreaterThan(1);
    for (const c of t.components) {
      const compound = COMPOUND_BY_ID[c.compoundId];
      expect(compound).toBeDefined();
      expect(compound.routes).toContain(t.route);
      expect(c.dose.value).toBeGreaterThan(0);
      if (c.range) {
        expect(c.range.min).toBeLessThanOrEqual(c.range.max);
        expect(c.range.min).toBeGreaterThan(0);
      }
    }

    const s = t.schedule;
    if (s.kind === 'daily') {
      expect(s.times.length).toBeGreaterThan(0);
      for (const time of s.times) expect(time).toMatch(TIME);
    } else if (s.kind === 'everyNDays') {
      expect(Number.isInteger(s.n) && s.n > 0).toBe(true);
      expect(s.time).toMatch(TIME);
    } else if (s.kind === 'weekdays') {
      expect(s.days.length).toBeGreaterThan(0);
      for (const d of s.days) expect(d >= 0 && d <= 6 && Number.isInteger(d)).toBe(true);
      expect(s.time).toMatch(TIME);
    }

    if (t.titration) {
      expect(t.titration.length).toBeGreaterThan(0);
      for (const step of t.titration) {
        expect(step.weeks).toBeGreaterThan(0);
        expect(step.dose.unit).toBe(t.components[0].dose.unit);
      }
      expect(t.titration[0].dose).toEqual(t.components[0].dose);
    }
    if (t.cycle) {
      expect(t.cycle.onWeeks).toBeGreaterThan(0);
      expect(t.cycle.offWeeks).toBeGreaterThan(0);
    }
    if (t.blendVial) {
      expect(t.kind).toBe('blend');
      expect(t.blendVial.map((b) => b.compoundId).sort()).toEqual(t.components.map((c) => c.compoundId).sort());
    }
  });

  it('formal sources come first for a compound', () => {
    const order = ['label', 'trial', 'clinic', 'community', 'vendor'];
    for (const id of Object.keys(COMPOUND_BY_ID)) {
      const ranks = templatesFor(id).map((t) => order.indexOf(t.source));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('finds named stacks by pair, in either order', () => {
    for (const t of PROTOCOL_TEMPLATES.filter((x) => x.kind !== 'single')) {
      const [a, b] = t.components;
      expect(stacksWith(a.compoundId, b.compoundId)).toContain(t);
      expect(stacksWith(b.compoundId, a.compoundId)).toContain(t);
    }
  });
});
