// What one dose of a protocol looks like in the syringe: volume, insulin
// units, what each compound in the vial delivers, and how many doses a vial
// holds. Uses the linked inventory vial when its concentration is known,
// otherwise the vial described on the protocol itself.

import { ROUTE_SHORT } from '@/data/library';

import { drawFromConcentration } from './calculator';
import type { Amount, InventoryItem, Protocol, ProtocolMix, SyringeId } from './model';
import { doseOn } from './schedule';
import { formatAmount, SYRINGES, toBase, trim } from './units';

export interface DoseDraw {
  volumeMl: number;
  /** U-100 insulin-syringe units. */
  units: number;
  /** First compound per mL, in mg or IU. */
  concentration: number;
  baseUnit: 'mg' | 'iu';
  /** What this draw delivers of every compound in the vial (one entry unless it is a blend). */
  delivers: { name: string; compoundId: string | null; amount: Amount }[];
  /** Whole doses one vial holds; null when the vial size is unknown. */
  dosesPerVial: number | null;
  syringe: SyringeId;
  warnings: string[];
  source: 'inventory' | 'mix';
}

interface Part {
  name: string;
  compoundId: string | null;
  /** Amount per mL in `unit`. */
  perMl: number;
  unit: 'mg' | 'iu';
}

interface Basis {
  parts: Part[];
  /** First compound in one vial, in its base unit; null when unknown. */
  perVial: number | null;
}

function basisFromMix(mix: ProtocolMix): Basis | null {
  if (mix.components.length === 0) return null;
  const ml = mix.form === 'powder' ? mix.diluentMl : 1;
  if (!ml || !(ml > 0)) return null;
  const parts = mix.components.map((c) => {
    const b = toBase(c.amount);
    return { name: c.name, compoundId: c.compoundId, perMl: b.value / ml, unit: b.unit };
  });
  if (!(parts[0].perMl > 0)) return null;
  const perVial = mix.form === 'powder' ? toBase(mix.components[0].amount).value : mix.vialMl && mix.vialMl > 0 ? parts[0].perMl * mix.vialMl : null;
  return { parts, perVial };
}

function basisFromItem(item: InventoryItem): Basis | null {
  const ml = item.form === 'powder' ? item.open?.diluentMl : item.form === 'oral' ? undefined : item.vialVolumeMl;
  if (!ml || !(ml > 0) || item.components.length === 0) return null;
  const parts = item.components.map((c) => {
    const b = toBase(c.amount);
    return { name: c.name, compoundId: c.compoundId, perMl: b.value / ml, unit: b.unit };
  });
  if (!(parts[0].perMl > 0)) return null;
  return { parts, perVial: toBase(item.components[0].amount).value };
}

/** First-compound concentration of a protocol's own vial, in mg/mL or IU/mL. */
export function mixConcentration(mix: ProtocolMix): number | null {
  return basisFromMix(mix)?.parts[0].perMl ?? null;
}

function drawWith(basis: Basis, dose: Amount, syringe: SyringeId, source: DoseDraw['source']): DoseDraw | null {
  const first = basis.parts[0];
  const r = drawFromConcentration(first.perMl, first.unit === 'iu' ? 'IU/mL' : 'mg/mL', basis.perVial ?? Number.POSITIVE_INFINITY, dose, syringe);
  if (!r) return null;
  return {
    volumeMl: r.volumeMl,
    units: r.units,
    concentration: first.perMl,
    baseUnit: first.unit,
    delivers: basis.parts.map((p) => ({ name: p.name, compoundId: p.compoundId, amount: { value: p.perMl * r.volumeMl, unit: p.unit } })),
    dosesPerVial: basis.perVial === null ? null : r.dosesPerVial,
    syringe,
    warnings: r.warnings,
    source,
  };
}

/** The draw for one dose of a protocol, or null when neither its vial nor its mix gives a concentration. */
export function drawForProtocol(p: Pick<Protocol, 'inventoryId' | 'mix' | 'syringe'>, dose: Amount, inventory: InventoryItem[], defaultSyringe: SyringeId): DoseDraw | null {
  const syringe = p.syringe ?? defaultSyringe;
  const item = p.inventoryId ? inventory.find((i) => i.id === p.inventoryId) : undefined;
  const fromItem = item ? basisFromItem(item) : null;
  if (fromItem) return drawWith(fromItem, dose, syringe, 'inventory');
  const fromMix = p.mix ? basisFromMix(p.mix) : null;
  return fromMix ? drawWith(fromMix, dose, syringe, 'mix') : null;
}

/** "20 units (0.2 mL)" on an insulin syringe, "0.5 mL (50 units)" on a mL syringe. */
export function drawText(d: Pick<DoseDraw, 'units' | 'volumeMl' | 'syringe'>): string {
  const u = trim(d.units, 1);
  const units = `${u} ${u === '1' ? 'unit' : 'units'}`;
  return SYRINGES[d.syringe].scale === 'units' ? `${units} (${trim(d.volumeMl, 3)} mL)` : `${trim(d.volumeMl, 2)} mL (${units})`;
}

/** Reminder text: "1 mg · 10 units (0.1 mL) · SubQ. Tap to log it." The draw is included when the vial is known. */
export function reminderBody(p: Protocol, at: Date, inventory: InventoryItem[], defaultSyringe: SyringeId): string {
  const dose = doseOn(p, at);
  const draw = drawForProtocol(p, dose, inventory, defaultSyringe);
  return `${formatAmount(dose, true)}${draw ? ` · ${drawText(draw)}` : ''} · ${ROUTE_SHORT[p.route]}. Tap to log it.`;
}
