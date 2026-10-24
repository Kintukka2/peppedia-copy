// Concentration and volume arithmetic. These functions convert the values a
// person enters; they never suggest a dose.

import type { Amount, SyringeId } from './model';
import { convertAmount, round, SYRINGES, UNITS_PER_ML } from './units';

export interface DrawResult {
  /** Concentration in the vial's amount unit per mL (mg/mL or IU/mL). */
  concentration: number;
  concentrationUnit: 'mg/mL' | 'IU/mL';
  volumeMl: number;
  /** Insulin-syringe units (U-100). */
  units: number;
  /** Whole doses the vial holds at this dose. */
  dosesPerVial: number;
  warnings: string[];
}

export interface ReconstituteInput {
  /** Peptide in the vial. */
  vialAmount: Amount;
  diluentMl: number;
  dose: Amount;
  syringe: SyringeId;
}

/** Shared core: given a concentration and a dose in compatible units, work out the draw. */
export function drawFromConcentration(
  concentration: number,
  concentrationUnit: 'mg/mL' | 'IU/mL',
  totalAmount: number,
  dose: Amount,
  syringe: SyringeId,
): DrawResult | null {
  const doseInVialUnit = concentrationUnit === 'IU/mL' ? (dose.unit === 'iu' ? dose.value : null) : convertAmount(dose, 'mg');
  if (doseInVialUnit === null || !(concentration > 0) || !(doseInVialUnit > 0)) return null;

  const volumeMl = doseInVialUnit / concentration;
  const units = volumeMl * UNITS_PER_ML;
  const warnings: string[] = [];
  const spec = SYRINGES[syringe];

  if (volumeMl > spec.capacityMl) {
    warnings.push(`This draw (${round(volumeMl, 3)} mL) is more than a ${spec.label} holds.`);
  }
  const reading = spec.scale === 'units' ? units : volumeMl;
  if (reading < spec.increment * 2) {
    warnings.push('The draw is smaller than two syringe markings, so it cannot be measured precisely. Adding more diluent increases the volume per dose.');
  }

  return {
    concentration,
    concentrationUnit,
    volumeMl,
    units,
    dosesPerVial: Math.floor(totalAmount / doseInVialUnit + 1e-9),
    warnings,
  };
}

/** Powder vial + bacteriostatic water. */
export function reconstitute(input: ReconstituteInput): DrawResult | null {
  const { vialAmount, diluentMl, dose, syringe } = input;
  if (!(diluentMl > 0) || !(vialAmount.value > 0)) return null;
  const isIu = vialAmount.unit === 'iu';
  const total = isIu ? vialAmount.value : convertAmount(vialAmount, 'mg')!;
  return drawFromConcentration(total / diluentMl, isIu ? 'IU/mL' : 'mg/mL', total, dose, syringe);
}

/**
 * Inverse problem: how much diluent makes one dose equal `targetUnits` on a
 * U-100 syringe. Useful for picking a water volume that gives round numbers.
 */
export function diluentForTargetUnits(vialAmount: Amount, dose: Amount, targetUnits: number): number | null {
  if (!(targetUnits > 0)) return null;
  const isIu = vialAmount.unit === 'iu';
  const total = isIu ? vialAmount.value : convertAmount(vialAmount, 'mg');
  const doseV = isIu ? (dose.unit === 'iu' ? dose.value : null) : convertAmount(dose, 'mg');
  if (total === null || doseV === null || !(total > 0) || !(doseV > 0)) return null;
  // units = dose / (total / diluent) * 100  →  diluent = units * total / (dose * 100)
  return (targetUnits * total) / (doseV * UNITS_PER_ML);
}

/** A solution whose concentration is already known (pre-mixed vial or pen). */
export function premixed(concentration: Amount, volumeMl: number, dose: Amount, syringe: SyringeId): DrawResult | null {
  const isIu = concentration.unit === 'iu';
  const c = isIu ? concentration.value : convertAmount(concentration, 'mg');
  if (c === null) return null;
  return drawFromConcentration(c, isIu ? 'IU/mL' : 'mg/mL', c * (volumeMl > 0 ? volumeMl : 0), dose, syringe);
}

export interface OilInput {
  /** mg/mL printed on the vial, e.g. 200. */
  concentrationMgPerMl: number;
  vialVolumeMl: number;
  weeklyDoseMg: number;
  injectionsPerWeek: number;
}

export interface OilResult {
  perInjectionMg: number;
  perInjectionMl: number;
  units: number;
  weeksPerVial: number;
}

export function oil(input: OilInput): OilResult | null {
  const { concentrationMgPerMl: c, vialVolumeMl, weeklyDoseMg, injectionsPerWeek } = input;
  if (!(c > 0) || !(weeklyDoseMg > 0) || !(injectionsPerWeek > 0)) return null;
  const perInjectionMg = weeklyDoseMg / injectionsPerWeek;
  const perInjectionMl = perInjectionMg / c;
  return {
    perInjectionMg,
    perInjectionMl,
    units: perInjectionMl * UNITS_PER_ML,
    weeksPerVial: vialVolumeMl > 0 ? (c * vialVolumeMl) / weeklyDoseMg : 0,
  };
}

export interface BlendComponentInput {
  name: string;
  amountMg: number;
}

export interface BlendResult {
  volumeMl: number;
  units: number;
  components: { name: string; concentrationMgPerMl: number; deliveredMg: number }[];
  dosesPerVial: number;
}

/**
 * Several peptides in one vial. The dose is set on the first (primary)
 * component; every other component is delivered in proportion.
 */
export function blend(components: BlendComponentInput[], diluentMl: number, primaryDose: Amount): BlendResult | null {
  if (components.length === 0 || !(diluentMl > 0)) return null;
  const primary = components[0];
  const doseMg = convertAmount(primaryDose, 'mg');
  if (doseMg === null || !(doseMg > 0) || !(primary.amountMg > 0)) return null;
  const volumeMl = doseMg / (primary.amountMg / diluentMl);
  return {
    volumeMl,
    units: volumeMl * UNITS_PER_ML,
    components: components.map((c) => ({
      name: c.name,
      concentrationMgPerMl: c.amountMg / diluentMl,
      deliveredMg: (c.amountMg / diluentMl) * volumeMl,
    })),
    dosesPerVial: Math.floor(primary.amountMg / doseMg + 1e-9),
  };
}

/** Somatropin labelling convention: 1 mg ≈ 3 IU. */
export const SOMATROPIN_IU_PER_MG = 3;
