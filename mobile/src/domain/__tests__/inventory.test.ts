import type { InventoryItem, Protocol } from '../model';
import { alerts, concentration, costPerDose, deduct, deductTaken, drawFor, forecast, monthlyCost, restore, restoreAmount, totalRemaining } from '../inventory';

function item(over: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'i1',
    name: 'Vial',
    form: 'powder',
    components: [{ compoundId: 'x', name: 'X', amount: { value: 10, unit: 'mg' } }],
    unopened: 2,
    open: { openedAt: '2026-01-01T00:00:00.000Z', remaining: 10, diluentMl: 2 },
    pricePerVial: 50,
    lowStockAt: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const now = new Date('2026-01-10T12:00:00');

describe('concentration and draw', () => {
  it('powder uses the diluent of the open vial', () => {
    expect(concentration(item())).toBeCloseTo(5);
    expect(drawFor(item(), { value: 500, unit: 'mcg' })!.units).toBeCloseTo(10);
  });
  it('solutions use vial volume', () => {
    const sol = item({ form: 'solution', vialVolumeMl: 2, components: [{ compoundId: 'x', name: 'X', amount: { value: 20, unit: 'mg' } }] });
    expect(concentration(sol)).toBeCloseTo(10);
  });
  it('unknown without diluent', () => {
    expect(concentration(item({ open: undefined }))).toBeNull();
  });
});

describe('deduct', () => {
  it('takes from the open vial', () => {
    const r = deduct(item(), { value: 2, unit: 'mg' }, now);
    expect(r.open!.remaining).toBeCloseTo(8);
    expect(r.unopened).toBe(2);
  });
  it('opens the next vial when the open one runs out and keeps the diluent', () => {
    const r = deduct(item({ open: { openedAt: '2026-01-01T00:00:00.000Z', remaining: 1, diluentMl: 2 } }), { value: 3, unit: 'mg' }, now);
    expect(r.unopened).toBe(1);
    expect(r.open!.remaining).toBeCloseTo(8);
    expect(r.open!.diluentMl).toBe(2);
  });
  it('never goes negative', () => {
    const r = deduct(item({ unopened: 0, open: { openedAt: '', remaining: 1 } }), { value: 5, unit: 'mg' }, now);
    expect(r.open!.remaining).toBe(0);
    expect(totalRemaining(r)).toBe(0);
  });
  it('ignores incompatible units', () => {
    expect(deduct(item(), { value: 5, unit: 'iu' }, now)).toEqual(item());
  });
  it('restore keeps total stock exact, returning overflow as sealed vials', () => {
    const r = restore(item(), { value: 5, unit: 'mg' });
    expect(r.open!.remaining).toBe(5);
    expect(r.unopened).toBe(3);
    expect(totalRemaining(r)).toBe(totalRemaining(item()) + 5);
  });
  it('deductTaken reports a short take when stock runs out', () => {
    const r = deductTaken(item({ unopened: 0, open: { openedAt: '', remaining: 0.1 } }), { value: 0.25, unit: 'mg' }, now);
    expect(r.taken).toBeCloseTo(0.1);
    expect(restoreAmount(r.item, r.taken).open!.remaining).toBeCloseTo(0.1);
  });
});

describe('forecast and cost', () => {
  const p = (over: Partial<Protocol> = {}): Protocol => ({
    id: 'p',
    compoundId: 'x',
    name: 'X',
    route: 'subq',
    dose: { value: 500, unit: 'mcg' },
    schedule: { kind: 'daily', times: ['08:00'] },
    startDate: '2026-01-01',
    reminders: false,
    status: 'active',
    color: '#000',
    createdAt: '',
    ...over,
  });

  it('combines several linked protocols', () => {
    const f = forecast(item(), [p(), p({ id: 'q', schedule: { kind: 'daily', times: ['20:00'] } })], now);
    expect(f.perDay).toBeCloseTo(1);
    expect(f.daysLeft).toBeCloseTo(30);
    expect(f.dosesLeft).toBe(60);
  });

  it('no linked protocols gives no run-out date', () => {
    expect(forecast(item(), [], now).runsOutOn).toBeNull();
  });

  it('cost per dose and per month', () => {
    expect(costPerDose(item(), { value: 500, unit: 'mcg' })).toBeCloseTo(2.5);
    expect(monthlyCost(item(), 0.5)).toBeCloseTo(75);
  });
});

describe('alerts', () => {
  it('flags expiry, low stock and old reconstitution', () => {
    const a = alerts(item({ expiresAt: '2026-01-20', unopened: 0 }), now);
    expect(a).toContain('expiring');
    expect(a).toContain('low');
    expect(alerts(item({ open: { openedAt: '2025-11-01T00:00:00.000Z', remaining: 4, diluentMl: 2 } }), now)).toContain('old-reconstitution');
    expect(alerts(item({ expiresAt: '2026-01-01' }), now)).toContain('expired');
  });
});
