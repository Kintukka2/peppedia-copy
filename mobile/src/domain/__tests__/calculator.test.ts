import { blend, diluentForTargetUnits, oil, premixed, reconstitute } from '../calculator';

describe('reconstitute', () => {
  it('5 mg in 2 mL at 250 mcg draws 10 units', () => {
    const r = reconstitute({ vialAmount: { value: 5, unit: 'mg' }, diluentMl: 2, dose: { value: 250, unit: 'mcg' }, syringe: 'u100-100' })!;
    expect(r.concentration).toBeCloseTo(2.5);
    expect(r.concentrationUnit).toBe('mg/mL');
    expect(r.volumeMl).toBeCloseTo(0.1);
    expect(r.units).toBeCloseTo(10);
    expect(r.dosesPerVial).toBe(20);
    expect(r.warnings).toHaveLength(0);
  });

  it('handles IU vials', () => {
    const r = reconstitute({ vialAmount: { value: 5000, unit: 'iu' }, diluentMl: 5, dose: { value: 500, unit: 'iu' }, syringe: 'u100-100' })!;
    expect(r.concentrationUnit).toBe('IU/mL');
    expect(r.units).toBeCloseTo(50);
    expect(r.dosesPerVial).toBe(10);
  });

  it('rejects incompatible units', () => {
    expect(reconstitute({ vialAmount: { value: 5000, unit: 'iu' }, diluentMl: 5, dose: { value: 1, unit: 'mg' }, syringe: 'u100-100' })).toBeNull();
  });

  it('rejects zero or missing diluent', () => {
    expect(reconstitute({ vialAmount: { value: 5, unit: 'mg' }, diluentMl: 0, dose: { value: 1, unit: 'mg' }, syringe: 'u100-100' })).toBeNull();
  });

  it('warns when the draw exceeds syringe capacity', () => {
    const r = reconstitute({ vialAmount: { value: 5, unit: 'mg' }, diluentMl: 2, dose: { value: 1, unit: 'mg' }, syringe: 'u100-30' })!;
    expect(r.volumeMl).toBeCloseTo(0.4);
    expect(r.warnings.join(' ')).toMatch(/more than/);
  });

  it('warns when the draw is too small to measure', () => {
    const r = reconstitute({ vialAmount: { value: 10, unit: 'mg' }, diluentMl: 1, dose: { value: 100, unit: 'mcg' }, syringe: 'u100-100' })!;
    expect(r.units).toBeCloseTo(1);
    expect(r.warnings.join(' ')).toMatch(/precisely/);
  });
});

describe('diluentForTargetUnits', () => {
  it('solves the water volume for a round draw', () => {
    // 10 mg vial, 0.5 mg dose, want 10 units → 2 mL
    expect(diluentForTargetUnits({ value: 10, unit: 'mg' }, { value: 0.5, unit: 'mg' }, 10)).toBeCloseTo(2);
  });

  it('round-trips with reconstitute', () => {
    const ml = diluentForTargetUnits({ value: 15, unit: 'mg' }, { value: 600, unit: 'mcg' }, 12)!;
    const r = reconstitute({ vialAmount: { value: 15, unit: 'mg' }, diluentMl: ml, dose: { value: 600, unit: 'mcg' }, syringe: 'u100-100' })!;
    expect(r.units).toBeCloseTo(12);
  });
});

describe('premixed', () => {
  it('uses the stated concentration', () => {
    const r = premixed({ value: 10, unit: 'mg' }, 2, { value: 2.5, unit: 'mg' }, 'u100-50')!;
    expect(r.volumeMl).toBeCloseTo(0.25);
    expect(r.units).toBeCloseTo(25);
    expect(r.dosesPerVial).toBe(8);
  });
});

describe('oil', () => {
  it('splits a weekly amount into injections', () => {
    const r = oil({ concentrationMgPerMl: 200, vialVolumeMl: 10, weeklyDoseMg: 100, injectionsPerWeek: 2 })!;
    expect(r.perInjectionMg).toBe(50);
    expect(r.perInjectionMl).toBeCloseTo(0.25);
    expect(r.units).toBeCloseTo(25);
    expect(r.weeksPerVial).toBeCloseTo(20);
  });
});

describe('blend', () => {
  it('delivers secondary components in proportion', () => {
    const r = blend(
      [
        { name: 'A', amountMg: 10 },
        { name: 'B', amountMg: 5 },
      ],
      2,
      { value: 500, unit: 'mcg' },
    )!;
    expect(r.volumeMl).toBeCloseTo(0.1);
    expect(r.components[0].deliveredMg).toBeCloseTo(0.5);
    expect(r.components[1].deliveredMg).toBeCloseTo(0.25);
    expect(r.dosesPerVial).toBe(20);
  });
});
