import { BIOMARKER_BY_ID, rangeFor } from '@/data/biomarkers';
import { COMPOUNDS } from '@/data/library';
import { parseRange } from '@/features/health/labs';
import { isValidDay } from '@/domain/schedule';

describe('reference ranges', () => {
  it('never applies the male range to a female user', () => {
    expect(rangeFor(BIOMARKER_BY_ID['e2'], 'female')).toEqual({});
    expect(rangeFor(BIOMARKER_BY_ID['hct'], 'female')).toEqual({ low: 35.5, high: 44.9 });
  });
  it('uses the combined envelope only when sex is unspecified', () => {
    expect(rangeFor(BIOMARKER_BY_ID['hct'], 'unspecified')).toEqual({ low: 35.5, high: 48.6 });
  });
});

describe('parseRange', () => {
  it('reads thousands separators and decimal commas', () => {
    expect(parseRange('300–1,000')).toEqual({ low: 300, high: 1000 });
    expect(parseRange('1,000-2,000')).toEqual({ low: 1000, high: 2000 });
    expect(parseRange('4,5 - 5,6')).toEqual({ low: 4.5, high: 5.6 });
    expect(parseRange('< 200')).toEqual({ high: 200 });
  });
});

describe('isValidDay', () => {
  it('rejects impossible dates', () => {
    expect(isValidDay('2026-02-28')).toBe(true);
    expect(isValidDay('2026-02-31')).toBe(false);
    expect(isValidDay('2026-00-10')).toBe(false);
    expect(isValidDay('2026-2-1')).toBe(false);
  });
});

describe('library integrity', () => {
  it('has unique ids, valid PK and sources on every compound', () => {
    const ids = new Set<string>();
    for (const c of COMPOUNDS) {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.sources.length).toBeGreaterThan(0);
      if (c.pk) {
        expect(c.pk.halfLifeHours).toBeGreaterThan(0);
        expect(c.routes).toContain(c.pk.route);
      }
    }
  });
});
