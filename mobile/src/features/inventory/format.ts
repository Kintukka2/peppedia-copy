import { COMPOUNDS } from '@/data/library';
import type { Compound } from '@/data/types';
import type { StockAlert } from '@/domain/inventory';
import { concentration, perVial, totalRemaining } from '@/domain/inventory';
import type { Amount, InventoryForm, InventoryItem, Protocol, SyringeId } from '@/domain/model';
import { formatAmount, trim } from '@/domain/units';
import type { BadgeTone } from '@/ui/feedback';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Short syringe names for chips. */
export const SYRINGE_SHORT: Record<SyringeId, string> = {
  'u100-30': '30 units',
  'u100-50': '50 units',
  'u100-100': '100 units',
  'ml-1': '1 mL',
  'ml-3': '3 mL',
};

export const FORM_LABEL: Record<InventoryForm, string> = {
  powder: 'Powder',
  solution: 'Solution',
  oil: 'Oil',
  oral: 'Oral',
};

export const ALERT_TONE: Record<StockAlert, BadgeTone> = {
  expired: 'danger',
  empty: 'danger',
  expiring: 'warn',
  low: 'warn',
  'old-reconstitution': 'warn',
};

/** Base-unit amount (mg or IU) as text; mg below 1 shows as mcg. */
export function formatBase(value: number, unit: 'mg' | 'iu'): string {
  return formatAmount({ value, unit }, true);
}

export function unitLabel(unit: Amount['unit']): string {
  return unit === 'iu' ? 'IU' : unit;
}

/** "BPC-157 5 mg + TB-500 5 mg · 2 mL" */
export function componentsSummary(item: InventoryItem): string {
  const parts = item.components.map((c) => `${c.name} ${formatAmount(c.amount)}`).join(' + ');
  const vol = (item.form === 'solution' || item.form === 'oil') && item.vialVolumeMl ? ` · ${trim(item.vialVolumeMl)} mL` : '';
  return parts + vol;
}

export function concentrationText(item: InventoryItem): string | null {
  const conc = concentration(item);
  if (conc === null) return null;
  const unit = perVial(item).unit;
  if (unit === 'iu') return `${trim(conc, 2)} IU/mL`;
  return conc < 1 ? `${trim(conc * 1000, 1)} mcg/mL` : `${trim(conc, 3)} mg/mL`;
}

/** "10 units", "1 unit". */
export function unitsText(units: number, digits = 1): string {
  const t = trim(units, digits);
  return `${t} ${t === '1' ? 'unit' : 'units'}`;
}

/** Form, optionally concentration, and the contents when the name doesn't already say them. */
export function itemSubtitle(item: InventoryItem, withConcentration = true): string {
  const parts = [FORM_LABEL[item.form]];
  const conc = withConcentration ? concentrationText(item) : null;
  if (conc) parts.push(conc);
  else if (withConcentration && item.form === 'powder') parts.push('not mixed');
  const summary = componentsSummary(item);
  if (norm(summary) !== norm(item.name)) parts.push(summary);
  return parts.join(' · ');
}

export function isOral(item: InventoryItem): boolean {
  return item.form === 'oral';
}

/** Capsule / tablet count left for oral items (partial units round down). */
export function oralCount(item: InventoryItem): number {
  const size = perVial(item).value;
  return size > 0 ? Math.floor(totalRemaining(item) / size + 1e-9) : item.unopened;
}

export function remainingSummary(item: InventoryItem): string {
  if (isOral(item)) {
    const n = oralCount(item);
    return `${n} ${n === 1 ? 'unit' : 'units'} left`;
  }
  const base = perVial(item);
  const open = item.open && item.open.remaining > 1e-9 ? `${formatBase(item.open.remaining, base.unit)} left in open vial` : 'No vial open';
  return `${open} · ${item.unopened} sealed`;
}

export function linkedActive(item: InventoryItem, protocols: Protocol[]): Protocol[] {
  return protocols.filter((p) => p.inventoryId === item.id && p.status === 'active');
}

/** Library compound whose name or alias matches exactly, ignoring case and punctuation. */
export function matchCompound(name: string): Compound | null {
  const q = norm(name);
  if (!q) return null;
  return COMPOUNDS.find((c) => norm(c.name) === q || c.aliases.some((a) => norm(a) === q)) ?? null;
}

/** Share of the open vial left, 0–1; null when nothing is open. */
export function openFraction(item: InventoryItem): number | null {
  if (!item.open) return null;
  const size = perVial(item).value;
  return size > 0 ? Math.max(0, Math.min(1, item.open.remaining / size)) : null;
}
