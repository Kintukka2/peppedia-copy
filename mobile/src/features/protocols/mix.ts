// The vial a protocol draws from, as typed into the protocol form: text
// drafts in, a `ProtocolMix` out, and optionally an inventory item so stock
// is tracked and deducted from the same numbers.

import type { Route } from '@/data/types';
import type { AmountUnit, InventoryItem, ProtocolMix } from '@/domain/model';
import { toBase, trim } from '@/domain/units';

export interface MixPartDraft {
  compoundId: string | null;
  name: string;
  amount: string;
  unit: AmountUnit;
}

export interface MixDraft {
  form: 'powder' | 'liquid';
  /** First is the compound the dose is set in. */
  parts: MixPartDraft[];
  water: string;
  vialMl: string;
}

const parse = (s: string): number => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};

const vialUnit = (doseUnit: AmountUnit): AmountUnit => (doseUnit === 'iu' ? 'iu' : 'mg');

export function emptyMixDraft(name: string, compoundId: string | null, doseUnit: AmountUnit): MixDraft {
  return { form: 'powder', parts: [{ compoundId, name, amount: '', unit: vialUnit(doseUnit) }], water: '', vialMl: '' };
}

export function draftFromMix(mix: ProtocolMix | undefined, name: string, compoundId: string | null, doseUnit: AmountUnit): MixDraft {
  if (!mix || mix.components.length === 0) return emptyMixDraft(name, compoundId, doseUnit);
  return {
    form: mix.form,
    parts: mix.components.map((c) => ({ compoundId: c.compoundId, name: c.name, amount: trim(c.amount.value, 6), unit: c.amount.unit })),
    water: mix.diluentMl ? trim(mix.diluentMl, 3) : '',
    vialMl: mix.vialMl ? trim(mix.vialMl, 3) : '',
  };
}

/** Keeps the first part in step with the protocol's compound. */
export function withPrimary(d: MixDraft, name: string, compoundId: string | null): MixDraft {
  const [first, ...rest] = d.parts;
  return { ...d, parts: [{ ...first, name, compoundId }, ...rest] };
}

/** The mix, or undefined until the first compound's amount is entered. Water and vial size may still be missing. */
export function mixFromDraft(d: MixDraft): ProtocolMix | undefined {
  const parts = d.parts.map((p) => ({ ...p, value: parse(p.amount) }));
  if (!(parts[0]?.value > 0)) return undefined;
  const water = parse(d.water);
  const vialMl = parse(d.vialMl);
  return {
    form: d.form,
    components: parts.filter((p, i) => i === 0 || p.value > 0).map((p) => ({ compoundId: p.compoundId, name: p.name, amount: { value: p.value, unit: p.unit } })),
    ...(d.form === 'powder' && water > 0 ? { diluentMl: water } : {}),
    ...(d.form === 'liquid' && vialMl > 0 ? { vialMl } : {}),
  };
}

/** "GHK-Cu 50 mg", "BPC-157 5 mg + TB-500 5 mg", "Testosterone enanthate 250 mg/mL". */
export function mixName(mix: ProtocolMix): string {
  const per = mix.form === 'liquid' ? '/mL' : '';
  return mix.components.map((c) => `${c.name} ${trim(c.amount.value)} ${c.amount.unit === 'iu' ? 'IU' : c.amount.unit}${per}`).join(' + ');
}

/**
 * An inventory item for the vial, with the open vial already mixed (powder) so
 * draws and deductions work at once. Null when the water (powder) or vial
 * volume (liquid) is missing, since stock can't be counted without it.
 */
export function inventoryFromMix(mix: ProtocolMix, o: { id: string; vials: number; route: Route; now: Date }): InventoryItem | null {
  const vials = Math.max(1, Math.round(o.vials));
  // With a single vial, "low" would fire at once; the run-out forecast covers it instead.
  const base = { id: o.id, name: mixName(mix), lowStockAt: vials > 1 ? 1 : 0, createdAt: o.now.toISOString() };
  if (mix.form === 'powder') {
    if (!mix.diluentMl) return null;
    return {
      ...base,
      form: 'powder',
      components: mix.components,
      unopened: vials - 1,
      open: { openedAt: o.now.toISOString(), remaining: toBase(mix.components[0].amount).value, diluentMl: mix.diluentMl },
    };
  }
  if (!mix.vialMl) return null;
  return {
    ...base,
    form: o.route === 'im' ? 'oil' : 'solution',
    components: mix.components.map((c) => ({ ...c, amount: { value: c.amount.value * mix.vialMl!, unit: c.amount.unit } })),
    vialVolumeMl: mix.vialMl,
    unopened: vials,
  };
}
