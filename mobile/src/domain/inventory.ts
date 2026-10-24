// Vial maths and stock forecasting: concentration of the open vial, deducting
// logged doses, doses remaining, run-out date and cost per dose. Several
// protocols may draw from one inventory item.

import { addDays, differenceInCalendarDays } from 'date-fns';

import type { Amount, InventoryItem, Protocol } from './model';
import { doseOn, dosesPerDay, parseDay } from './schedule';
import { toBase, UNITS_PER_ML } from './units';

export function primary(item: InventoryItem) {
  return item.components[0];
}

/** Primary-component amount per vial, normalised to mg or IU. */
export function perVial(item: InventoryItem): { value: number; unit: 'mg' | 'iu' } {
  return toBase(primary(item).amount);
}

/** Converts a dose into the item's base unit, or null if the units are incompatible. */
export function doseInItemUnit(item: InventoryItem, dose: Amount): number | null {
  const base = perVial(item);
  const d = toBase(dose);
  return d.unit === base.unit ? d.value : null;
}

/** Concentration of the open (or next) vial in base unit per mL; null when unknown. */
export function concentration(item: InventoryItem): number | null {
  const amount = perVial(item).value;
  if (item.form === 'powder') {
    const ml = item.open?.diluentMl;
    return ml && ml > 0 ? amount / ml : null;
  }
  if (item.form === 'solution' || item.form === 'oil') {
    return item.vialVolumeMl && item.vialVolumeMl > 0 ? amount / item.vialVolumeMl : null;
  }
  return null;
}

export interface Draw {
  volumeMl: number;
  units: number;
}

export function drawFor(item: InventoryItem, dose: Amount): Draw | null {
  const c = concentration(item);
  const d = doseInItemUnit(item, dose);
  if (c === null || d === null || !(c > 0)) return null;
  const volumeMl = d / c;
  return { volumeMl, units: volumeMl * UNITS_PER_ML };
}

/** Primary-component amount left across the open vial and sealed stock. */
export function totalRemaining(item: InventoryItem): number {
  return (item.open?.remaining ?? 0) + item.unopened * perVial(item).value;
}

/**
 * Takes a dose out of stock. Opens the next sealed vial when the open one runs
 * out (or none is open). Returns a new item; never goes below zero.
 */
export function deduct(item: InventoryItem, dose: Amount, now: Date): InventoryItem {
  return deductTaken(item, dose, now).item;
}

/** Like `deduct`, but also reports how much was actually taken (less than the dose when stock runs out). */
export function deductTaken(item: InventoryItem, dose: Amount, now: Date): { item: InventoryItem; taken: number } {
  const amount = doseInItemUnit(item, dose);
  if (amount === null || amount <= 0) return { item, taken: 0 };
  const size = perVial(item).value;
  let open = item.open ? { ...item.open } : undefined;
  let unopened = item.unopened;
  let need = amount;

  while (need > 1e-9) {
    if (!open || open.remaining <= 1e-9) {
      if (unopened <= 0) {
        open = open ? { ...open, remaining: 0 } : undefined;
        break;
      }
      unopened -= 1;
      // A freshly opened powder vial inherits the previous diluent volume as a sensible default.
      open = { openedAt: now.toISOString(), remaining: size, diluentMl: open?.diluentMl };
    }
    const take = Math.min(open.remaining, need);
    open.remaining -= take;
    need -= take;
  }
  return { item: { ...item, unopened, open }, taken: amount - Math.max(0, need) };
}

/**
 * Puts an amount back into stock (used when a log is deleted). Total stock is
 * restored exactly: anything beyond a full open vial returns as sealed vials.
 */
export function restoreAmount(item: InventoryItem, amount: number): InventoryItem {
  if (!(amount > 0)) return item;
  const size = perVial(item).value;
  let remaining = (item.open?.remaining ?? 0) + amount;
  let unopened = item.unopened;
  while (size > 0 && remaining > size + 1e-9) {
    remaining -= size;
    unopened += 1;
  }
  const open = item.open ? { ...item.open, remaining } : { openedAt: new Date().toISOString(), remaining };
  return { ...item, unopened, open };
}

/** Restores a whole dose; prefer `restoreAmount` with the amount a log recorded as taken. */
export function restore(item: InventoryItem, dose: Amount): InventoryItem {
  const amount = doseInItemUnit(item, dose);
  return amount === null ? item : restoreAmount(item, amount);
}

export interface Forecast {
  /** Base-unit amount consumed per day by linked active protocols. */
  perDay: number;
  dosesLeft: number | null;
  daysLeft: number | null;
  runsOutOn: Date | null;
}

export function forecast(item: InventoryItem, linked: Protocol[], now: Date): Forecast {
  let perDay = 0;
  let perDose: number | null = null;
  for (const p of linked) {
    const d = doseInItemUnit(item, doseOn(p, now));
    if (d === null) continue;
    perDay += d * dosesPerDay(p);
    perDose = perDose === null ? d : Math.min(perDose, d);
  }
  const left = totalRemaining(item);
  if (perDay <= 0) {
    return { perDay: 0, dosesLeft: perDose ? Math.floor(left / perDose + 1e-9) : null, daysLeft: null, runsOutOn: null };
  }
  const daysLeft = left / perDay;
  return {
    perDay,
    dosesLeft: perDose ? Math.floor(left / perDose + 1e-9) : null,
    daysLeft,
    runsOutOn: addDays(now, Math.floor(daysLeft)),
  };
}

export function costPerDose(item: InventoryItem, dose: Amount): number | null {
  const d = doseInItemUnit(item, dose);
  if (!item.pricePerVial || d === null || d <= 0) return null;
  return (item.pricePerVial * d) / perVial(item).value;
}

/** Cost per 30 days at the current consumption rate. */
export function monthlyCost(item: InventoryItem, perDay: number): number | null {
  if (!item.pricePerVial || perDay <= 0) return null;
  return (item.pricePerVial * perDay * 30) / perVial(item).value;
}

export type StockAlert = 'expired' | 'expiring' | 'low' | 'empty' | 'old-reconstitution';

export function alerts(item: InventoryItem, now: Date): StockAlert[] {
  const out: StockAlert[] = [];
  if (item.expiresAt) {
    const days = differenceInCalendarDays(parseDay(item.expiresAt), now);
    if (days < 0) out.push('expired');
    else if (days <= 30) out.push('expiring');
  }
  const remaining = totalRemaining(item);
  if (remaining <= 1e-9) out.push('empty');
  else if (item.unopened + (item.open && item.open.remaining > 0 ? 1 : 0) <= item.lowStockAt) out.push('low');
  if (item.form === 'powder' && item.open?.diluentMl && item.open.remaining > 0) {
    // Most suppliers quote roughly four weeks for a reconstituted, refrigerated vial.
    if (differenceInCalendarDays(now, new Date(item.open.openedAt)) > 28) out.push('old-reconstitution');
  }
  return out;
}

export const ALERT_LABEL: Record<StockAlert, string> = {
  expired: 'Expired',
  expiring: 'Expires soon',
  low: 'Low stock',
  empty: 'Out of stock',
  'old-reconstitution': 'Mixed >4 weeks ago',
};
