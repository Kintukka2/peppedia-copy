import { doseScaleWarning, mixFromTemplate, typicalDoseRange } from '@/features/protocols/templates';
import { TEMPLATE_BY_ID } from '@/data/protocols';

import { drawForProtocol, drawText, mixConcentration, reminderBody } from '../draw';
import type { InventoryItem, ProtocolMix } from '../model';

const powder = (vialMg: number, waterMl: number): ProtocolMix => ({
  form: 'powder',
  components: [{ compoundId: 'ghk-cu', name: 'GHK-Cu', amount: { value: vialMg, unit: 'mg' } }],
  diluentMl: waterMl,
});

describe('drawForProtocol from the protocol’s own mix', () => {
  it('1 mg from 50 mg in 5 mL is 10 units on an insulin syringe', () => {
    const d = drawForProtocol({ mix: powder(50, 5) }, { value: 1, unit: 'mg' }, [], 'u100-100')!;
    expect(d.volumeMl).toBeCloseTo(0.1);
    expect(d.units).toBeCloseTo(10);
    expect(d.dosesPerVial).toBe(50);
    expect(d.source).toBe('mix');
    expect(drawText(d)).toBe('10 units (0.1 mL)');
  });

  it('mcg doses convert against a mg vial', () => {
    const d = drawForProtocol({ mix: powder(5, 2) }, { value: 250, unit: 'mcg' }, [], 'u100-100')!;
    expect(d.units).toBeCloseTo(10);
  });

  it('uses the protocol’s own syringe over the default, and reads mL syringes in mL', () => {
    const oil: ProtocolMix = { form: 'liquid', components: [{ compoundId: 'testosterone-enanthate', name: 'Testosterone enanthate', amount: { value: 250, unit: 'mg' } }], vialMl: 5 };
    const d = drawForProtocol({ mix: oil, syringe: 'ml-1' }, { value: 125, unit: 'mg' }, [], 'u100-30')!;
    expect(d.syringe).toBe('ml-1');
    expect(d.volumeMl).toBeCloseTo(0.5);
    expect(d.dosesPerVial).toBe(10);
    expect(drawText(d)).toBe('0.5 mL (50 units)');
    expect(d.warnings).toEqual([]);
  });

  it('warns when one dose is more than the syringe holds', () => {
    const d = drawForProtocol({ mix: powder(5, 5) }, { value: 1, unit: 'mg' }, [], 'u100-30')!;
    expect(d.volumeMl).toBeCloseTo(1);
    expect(d.warnings[0]).toMatch(/more than/);
  });

  it('reports what each compound in a blend delivers', () => {
    const glow: ProtocolMix = {
      form: 'powder',
      components: [
        { compoundId: 'ghk-cu', name: 'GHK-Cu', amount: { value: 50, unit: 'mg' } },
        { compoundId: 'bpc-157', name: 'BPC-157', amount: { value: 10, unit: 'mg' } },
        { compoundId: 'thymosin-beta-4', name: 'TB-500', amount: { value: 10, unit: 'mg' } },
      ],
      diluentMl: 3,
    };
    const d = drawForProtocol({ mix: glow }, { value: 2, unit: 'mg' }, [], 'u100-100')!;
    expect(d.units).toBeCloseTo(12);
    expect(d.delivers.map((x) => x.amount.value)).toEqual([expect.closeTo(2), expect.closeTo(0.4), expect.closeTo(0.4)]);
  });

  it('returns null until the water is entered, or when units are incompatible', () => {
    expect(drawForProtocol({ mix: { ...powder(5, 0) } }, { value: 1, unit: 'mg' }, [], 'u100-100')).toBeNull();
    expect(mixConcentration({ ...powder(5, 0), diluentMl: undefined })).toBeNull();
    expect(drawForProtocol({ mix: powder(5, 2) }, { value: 2, unit: 'iu' }, [], 'u100-100')).toBeNull();
  });
});

describe('drawForProtocol from a linked vial', () => {
  const vial: InventoryItem = {
    id: 'v',
    name: 'BPC',
    form: 'powder',
    components: [{ compoundId: 'bpc-157', name: 'BPC-157', amount: { value: 10, unit: 'mg' } }],
    unopened: 0,
    open: { openedAt: '', remaining: 10, diluentMl: 2 },
    lowStockAt: 0,
    createdAt: '',
  };
  it('prefers the vial’s concentration over the protocol’s mix', () => {
    const d = drawForProtocol({ inventoryId: 'v', mix: powder(5, 5) }, { value: 500, unit: 'mcg' }, [vial], 'u100-100')!;
    expect(d.source).toBe('inventory');
    expect(d.units).toBeCloseTo(10);
  });
  it('falls back to the mix when the vial has no water recorded yet', () => {
    const d = drawForProtocol({ inventoryId: 'v', mix: powder(5, 5) }, { value: 1, unit: 'mg' }, [{ ...vial, open: undefined }], 'u100-100')!;
    expect(d.source).toBe('mix');
    expect(d.units).toBeCloseTo(100);
  });
});

describe('dose scale check', () => {
  it('knows the library’s GHK-Cu range', () => {
    const r = typicalDoseRange('ghk-cu')!;
    expect(r.unit).toBe('mg');
    expect(r.min).toBeGreaterThanOrEqual(0.5);
  });
  it('flags 1 mcg of GHK-Cu as a likely mcg/mg slip, and not 1 mg', () => {
    expect(doseScaleWarning('ghk-cu', 'GHK-Cu', { value: 1, unit: 'mcg' })).toMatch(/far below.*Check mcg vs mg/);
    expect(doseScaleWarning('ghk-cu', 'GHK-Cu', { value: 1, unit: 'mg' })).toBeNull();
    expect(doseScaleWarning('bpc-157', 'BPC-157', { value: 250, unit: 'mg' })).toMatch(/far above/);
    expect(doseScaleWarning(null, 'Custom', { value: 1, unit: 'mcg' })).toBeNull();
  });
  it('prefills a blend’s vial in dosing order', () => {
    const mix = mixFromTemplate(TEMPLATE_BY_ID['blend-glow-70'])!;
    expect(mix.components.map((c) => [c.compoundId, c.amount.value])).toEqual([
      ['ghk-cu', 50],
      ['bpc-157', 10],
      ['thymosin-beta-4', 10],
    ]);
    expect(mixFromTemplate(TEMPLATE_BY_ID['retatrutide-community-titration'])).toBeUndefined();
  });
});

describe('reminder text', () => {
  it('includes the draw when the protocol describes its vial', () => {
    const p = {
      id: 'p',
      compoundId: 'ghk-cu',
      name: 'GHK-Cu',
      route: 'subq' as const,
      dose: { value: 1, unit: 'mg' as const },
      schedule: { kind: 'daily' as const, times: ['19:00'] },
      startDate: '2026-10-01',
      reminders: true,
      status: 'active' as const,
      color: '#000',
      createdAt: '',
      mix: powder(50, 5),
    };
    expect(reminderBody(p, new Date('2026-10-24T19:00:00'), [], 'u100-100')).toBe('1 mg · 10 units (0.1 mL) · SubQ. Tap to log it.');
    expect(reminderBody({ ...p, mix: undefined }, new Date('2026-10-24T19:00:00'), [], 'u100-100')).toBe('1 mg · SubQ. Tap to log it.');
  });
});
