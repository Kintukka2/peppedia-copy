import { alerts, concentration, deduct, drawFor } from '@/domain/inventory';

import { draftFromMix, emptyMixDraft, inventoryFromMix, mixFromDraft, mixName, withPrimary } from '../mix';

const now = new Date('2026-10-24T10:00:00');

describe('mix drafts', () => {
  it('stays empty until the first amount is typed, then keeps water and drops blank extras', () => {
    const d = emptyMixDraft('GHK-Cu', 'ghk-cu', 'mcg');
    expect(d.parts[0].unit).toBe('mg');
    expect(mixFromDraft(d)).toBeUndefined();
    const filled = { ...d, parts: [{ ...d.parts[0], amount: '50' }, { compoundId: 'x', name: 'X', amount: '', unit: 'mg' as const }], water: '5' };
    expect(mixFromDraft(filled)).toEqual({ form: 'powder', components: [{ compoundId: 'ghk-cu', name: 'GHK-Cu', amount: { value: 50, unit: 'mg' } }], diluentMl: 5 });
  });

  it('round-trips through a saved mix and follows a compound change', () => {
    const mix = mixFromDraft({ form: 'liquid', parts: [{ compoundId: 'testosterone-enanthate', name: 'Testosterone enanthate', amount: '250', unit: 'mg' }], water: '', vialMl: '5' })!;
    expect(mix.vialMl).toBe(5);
    expect(mixFromDraft(draftFromMix(mix, 'ignored', null, 'mg'))).toEqual(mix);
    expect(withPrimary(draftFromMix(mix, '', null, 'mg'), 'Testosterone cypionate', 'testosterone-cypionate').parts[0].compoundId).toBe('testosterone-cypionate');
    expect(mixName(mix)).toBe('Testosterone enanthate 250 mg/mL');
  });

  it('IU doses default the vial to IU', () => {
    expect(emptyMixDraft('hCG', 'hcg', 'iu').parts[0].unit).toBe('iu');
  });
});

describe('inventoryFromMix', () => {
  it('opens a powder vial already mixed, so draw and deduction work at once', () => {
    const item = inventoryFromMix({ form: 'powder', components: [{ compoundId: 'bpc-157', name: 'BPC-157', amount: { value: 10, unit: 'mg' } }], diluentMl: 2 }, { id: 'i', vials: 3, route: 'subq', now })!;
    expect(item.unopened).toBe(2);
    expect(concentration(item)).toBeCloseTo(5);
    expect(drawFor(item, { value: 250, unit: 'mcg' })!.units).toBeCloseTo(5);
    expect(deduct(item, { value: 250, unit: 'mcg' }, now).open!.remaining).toBeCloseTo(9.75);
    expect(alerts(item, now)).toEqual([]);
  });

  it('does not flag a single new vial as low stock', () => {
    const one = inventoryFromMix({ form: 'powder', components: [{ compoundId: 'ghk-cu', name: 'GHK-Cu', amount: { value: 50, unit: 'mg' } }], diluentMl: 5 }, { id: 'g', vials: 1, route: 'subq', now })!;
    expect(alerts(one, now)).toEqual([]);
  });

  it('stores a liquid per vial as an oil for IM and a solution otherwise', () => {
    const mix = { form: 'liquid' as const, components: [{ compoundId: 'testosterone-enanthate', name: 'TE', amount: { value: 250, unit: 'mg' as const } }], vialMl: 5 };
    const oil = inventoryFromMix(mix, { id: 'o', vials: 1, route: 'im', now })!;
    expect(oil.form).toBe('oil');
    expect(oil.components[0].amount.value).toBe(1250);
    expect(concentration(oil)).toBeCloseTo(250);
    expect(inventoryFromMix(mix, { id: 's', vials: 1, route: 'subq', now })!.form).toBe('solution');
  });

  it('needs the water or vial volume to count stock', () => {
    expect(inventoryFromMix({ form: 'powder', components: [{ compoundId: null, name: 'X', amount: { value: 5, unit: 'mg' } }] }, { id: 'x', vials: 1, route: 'subq', now })).toBeNull();
    expect(inventoryFromMix({ form: 'liquid', components: [{ compoundId: null, name: 'X', amount: { value: 5, unit: 'mg' } }] }, { id: 'x', vials: 1, route: 'subq', now })).toBeNull();
  });
});
