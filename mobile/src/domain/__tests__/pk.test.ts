import { absorptionRateFromTmax, accumulationFactor, clearsAt, eliminationRate, levelAt, paramsFor, sampleSeries, tmaxFor, unitResponse } from '../pk';

const H = 3_600_000;

describe('bolus model', () => {
  const params = paramsFor({ halfLifeHours: 120 });

  it('halves after one half-life', () => {
    expect(unitResponse(120, params)).toBeCloseTo(0.5);
    expect(unitResponse(240, params)).toBeCloseTo(0.25);
  });

  it('is zero before the dose', () => {
    expect(levelAt(0, [{ at: H, amount: 2 }], params)).toBe(0);
  });

  it('superposes repeated doses', () => {
    const doses = [
      { at: 0, amount: 2.5 },
      { at: 168 * H, amount: 2.5 },
    ];
    const expected = 2.5 * Math.pow(0.5, 168 / 120) + 2.5;
    expect(levelAt(168 * H, doses, params)).toBeCloseTo(expected);
  });

  it('matches the steady-state accumulation factor', () => {
    const doses = Array.from({ length: 40 }, (_, i) => ({ at: i * 168 * H, amount: 1 }));
    expect(levelAt(39 * 168 * H, doses, params)).toBeCloseTo(accumulationFactor(120, 168), 3);
  });
});

describe('absorption model', () => {
  it('recovers ka from tmax', () => {
    const ke = eliminationRate(116.7);
    for (const tmax of [8, 24, 48, 72]) {
      const ka = absorptionRateFromTmax(tmax, ke);
      expect(tmaxFor(ka, ke)).toBeCloseTo(tmax, 4);
    }
  });

  it('peaks at tmax and starts at zero', () => {
    const params = paramsFor({ halfLifeHours: 116.7, tmaxHours: 24 });
    expect(unitResponse(0, params)).toBeCloseTo(0);
    const atPeak = unitResponse(24, params);
    expect(unitResponse(20, params)).toBeLessThan(atPeak);
    expect(unitResponse(28, params)).toBeLessThan(atPeak);
    expect(atPeak).toBeLessThan(1);
  });

  it('handles the ka ≈ ke limit', () => {
    const ke = eliminationRate(10);
    const r = unitResponse(5, { ke, ka: ke });
    expect(r).toBeCloseTo(ke * 5 * Math.exp(-ke * 5));
  });
});

describe('series and clearance', () => {
  it('adds samples either side of each dose', () => {
    const params = paramsFor({ halfLifeHours: 24 });
    const s = sampleSeries([{ at: 50 * H, amount: 1 }], params, 0, 100 * H, 10);
    const before = s.find((p) => p.t === 50 * H - 1)!;
    const after = s.find((p) => p.t === 50 * H)!;
    expect(before.v).toBe(0);
    expect(after.v).toBeCloseTo(1);
  });

  it('clears five half-lives after the last dose', () => {
    expect(clearsAt([{ at: 0, amount: 1 }, { at: 10 * H, amount: 1 }], { halfLifeHours: 120 })).toBe(10 * H + 600 * H);
    expect(clearsAt([], { halfLifeHours: 120 })).toBeNull();
  });
});
