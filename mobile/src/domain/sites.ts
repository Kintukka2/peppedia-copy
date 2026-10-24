// Site rotation: suggests the least recently used site that suits the route.

import { SITES, type InjectionSite } from '@/data/sites';
import type { Route } from '@/data/types';

import type { DoseLog } from './model';

export interface SiteUse {
  site: InjectionSite;
  lastAt: number | null;
  lastName?: string;
  count: number;
}

export function siteUsage(logs: DoseLog[]): Map<string, SiteUse> {
  const map = new Map<string, SiteUse>(SITES.map((s) => [s.id, { site: s, lastAt: null, count: 0 }]));
  for (const log of logs) {
    if (!log.siteId || log.skipped) continue;
    const use = map.get(log.siteId);
    if (!use) continue;
    const t = new Date(log.takenAt).getTime();
    use.count++;
    if (use.lastAt === null || t > use.lastAt) {
      use.lastAt = t;
      use.lastName = log.name;
    }
  }
  return map;
}

export function sitesFor(route: Route): InjectionSite[] {
  return SITES.filter((s) => s.routes.includes(route));
}

/** Never-used sites first (in map order), then the one rested longest. */
export function suggestSite(route: Route, logs: DoseLog[]): InjectionSite | null {
  const candidates = sitesFor(route);
  if (candidates.length === 0) return null;
  const usage = siteUsage(logs);
  let best: InjectionSite | null = null;
  let bestAt = Infinity;
  for (const s of candidates) {
    const at = usage.get(s.id)?.lastAt ?? -Infinity;
    if (at < bestAt) {
      best = s;
      bestAt = at;
    }
  }
  return best;
}

export function isInjectable(route: Route): boolean {
  return route === 'subq' || route === 'im';
}
