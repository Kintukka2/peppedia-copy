import type { Amount, AmountUnit, SyringeId, WeightUnit } from './model';

export const KG_PER_LB = 0.45359237;

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

/** Converts between mcg and mg. IU only converts to IU. Returns null when the units are incompatible. */
export function convertAmount(amount: Amount, to: AmountUnit): number | null {
  if (amount.unit === to) return amount.value;
  if (amount.unit === 'iu' || to === 'iu') return null;
  return amount.unit === 'mcg' ? amount.value / 1000 : amount.value * 1000;
}

/** Normalises mass to mg; IU stays IU. */
export function toBase(amount: Amount): { value: number; unit: 'mg' | 'iu' } {
  if (amount.unit === 'iu') return { value: amount.value, unit: 'iu' };
  return { value: convertAmount(amount, 'mg')!, unit: 'mg' };
}

export interface SyringeSpec {
  id: SyringeId;
  label: string;
  capacityMl: number;
  /** U-100 insulin syringes are read in units (100 units = 1 mL); others in mL. */
  scale: 'units' | 'ml';
  /** Smallest marked increment, in the syringe's own scale. */
  increment: number;
}

export const SYRINGES: Record<SyringeId, SyringeSpec> = {
  'u100-30': { id: 'u100-30', label: '0.3 mL insulin (30 units)', capacityMl: 0.3, scale: 'units', increment: 0.5 },
  'u100-50': { id: 'u100-50', label: '0.5 mL insulin (50 units)', capacityMl: 0.5, scale: 'units', increment: 1 },
  'u100-100': { id: 'u100-100', label: '1 mL insulin (100 units)', capacityMl: 1, scale: 'units', increment: 2 },
  'ml-1': { id: 'ml-1', label: '1 mL syringe', capacityMl: 1, scale: 'ml', increment: 0.01 },
  'ml-3': { id: 'ml-3', label: '3 mL syringe', capacityMl: 3, scale: 'ml', increment: 0.1 },
};

export const UNITS_PER_ML = 100;

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Formats an amount compactly: 0.25 mg, 250 mcg, 2 IU. Switches mg below 1 to mcg when `preferMcg`. */
export function formatAmount(amount: Amount, preferMcg = false): string {
  if (preferMcg && amount.unit === 'mg' && amount.value < 1) {
    return `${trim(amount.value * 1000)} mcg`;
  }
  return `${trim(amount.value)} ${amount.unit === 'iu' ? 'IU' : amount.unit}`;
}

export function trim(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  return String(round(value, digits));
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
