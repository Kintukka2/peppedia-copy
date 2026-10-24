// Estimated amount-in-body curves. One-compartment model with first-order
// elimination. When the library gives a time-to-peak (tmax) the absorption
// phase is modelled with the Bateman function; otherwise each dose is treated
// as an instantaneous bolus. Bioavailability is taken as 1, so the result is a
// nominal estimate, not a measured concentration.

import type { PharmacokineticData } from '@/data/types';

const HOUR = 3_600_000;

export interface DoseEvent {
  /** Epoch milliseconds. */
  at: number;
  /** In the compound's dosing unit (mg or IU). */
  amount: number;
}

export interface PkParams {
  ke: number; // per hour
  ka: number | null; // per hour; null = bolus
}

export function eliminationRate(halfLifeHours: number): number {
  return Math.LN2 / halfLifeHours;
}

/** Time to peak for absorption rate `ka` and elimination rate `ke` (hours). */
export function tmaxFor(ka: number, ke: number): number {
  if (Math.abs(ka - ke) < 1e-12) return 1 / ke;
  return Math.log(ka / ke) / (ka - ke);
}

/**
 * Solves tmax(ka) = tmax for ka. tmax(ka) decreases monotonically from ∞
 * (ka → 0) to 0 (ka → ∞), so a log-space bisection always converges.
 */
export function absorptionRateFromTmax(tmaxHours: number, ke: number): number {
  let lo = 1e-6;
  let hi = 1e4;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    if (tmaxFor(mid, ke) > tmaxHours) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

export function paramsFor(pk: Pick<PharmacokineticData, 'halfLifeHours' | 'tmaxHours'>): PkParams {
  const ke = eliminationRate(pk.halfLifeHours);
  const ka = pk.tmaxHours && pk.tmaxHours > 0 ? absorptionRateFromTmax(pk.tmaxHours, ke) : null;
  return { ke, ka };
}

/** Fraction of one dose present `hours` after administration. */
export function unitResponse(hours: number, { ke, ka }: PkParams): number {
  if (hours < 0) return 0;
  if (ka === null) return Math.exp(-ke * hours);
  if (Math.abs(ka - ke) < 1e-9) return ke * hours * Math.exp(-ke * hours);
  return (ka / (ka - ke)) * (Math.exp(-ke * hours) - Math.exp(-ka * hours));
}

/** Superposition of every dose given at or before `at`. */
export function levelAt(at: number, doses: DoseEvent[], params: PkParams): number {
  let total = 0;
  for (const d of doses) {
    if (d.at <= at) total += d.amount * unitResponse((at - d.at) / HOUR, params);
  }
  return total;
}

export interface SeriesPoint {
  t: number;
  v: number;
}

/**
 * Samples the curve across [from, to]. Extra points just before and after each
 * dose keep bolus jumps vertical instead of smeared across a sample interval.
 */
export function sampleSeries(doses: DoseEvent[], params: PkParams, from: number, to: number, samples = 120): SeriesPoint[] {
  const times = new Set<number>();
  const step = (to - from) / samples;
  for (let i = 0; i <= samples; i++) times.add(Math.round(from + i * step));
  for (const d of doses) {
    if (d.at > from && d.at < to) {
      times.add(d.at - 1);
      times.add(d.at);
    }
  }
  return [...times].sort((a, b) => a - b).map((t) => ({ t, v: levelAt(t, doses, params) }));
}

/**
 * When the estimate falls below ~3 % of the last dose: five half-lives after
 * the last dose, plus the time to peak when absorption is modelled.
 */
export function clearsAt(doses: DoseEvent[], pk: Pick<PharmacokineticData, 'halfLifeHours' | 'tmaxHours'>): number | null {
  if (doses.length === 0) return null;
  const last = Math.max(...doses.map((d) => d.at));
  return last + (5 * pk.halfLifeHours + (pk.tmaxHours ?? 0)) * HOUR;
}

/** Steady-state peak relative to a single dose's peak at a fixed interval (bolus approximation). */
export function accumulationFactor(halfLifeHours: number, intervalHours: number): number {
  return 1 / (1 - Math.pow(0.5, intervalHours / halfLifeHours));
}
