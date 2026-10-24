import { COMPOUNDS } from './compounds';
import type { Compound, CompoundCategory, Route } from './types';

export const CATEGORY_LABEL: Record<CompoundCategory, string> = {
  metabolic: 'Metabolic & weight',
  'gh-axis': 'Growth hormone axis',
  repair: 'Tissue repair',
  cognitive: 'Cognitive & sleep',
  immune: 'Immune',
  longevity: 'Longevity & mitochondria',
  'sexual-health': 'Sexual health',
  skin: 'Skin & pigmentation',
  hormone: 'Hormones',
};

export const ROUTE_LABEL: Record<Route, string> = {
  subq: 'Subcutaneous',
  im: 'Intramuscular',
  iv: 'Intravenous',
  oral: 'Oral',
  nasal: 'Nasal',
  topical: 'Topical',
};

export const ROUTE_SHORT: Record<Route, string> = {
  subq: 'SubQ',
  im: 'IM',
  iv: 'IV',
  oral: 'Oral',
  nasal: 'Nasal',
  topical: 'Topical',
};

export const COMPOUND_BY_ID: Record<string, Compound> = Object.fromEntries(COMPOUNDS.map((c) => [c.id, c]));

export function getCompound(id: string | null | undefined): Compound | null {
  return id ? (COMPOUND_BY_ID[id] ?? null) : null;
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Ranked search over names, aliases, summary and classes. */
export function searchCompounds(query: string, list: Compound[] = COMPOUNDS): Compound[] {
  const q = normalise(query);
  if (!q) return list;
  const scored: { c: Compound; score: number }[] = [];
  for (const c of list) {
    const name = normalise(c.name);
    const aliases = c.aliases.map(normalise);
    let score = 0;
    if (name === q || aliases.includes(q)) score = 100;
    else if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) score = 60;
    else if (name.includes(q) || aliases.some((a) => a.includes(q))) score = 40;
    else if (normalise(c.summary).includes(q) || c.classes.some((k) => normalise(k).includes(q)) || normalise(CATEGORY_LABEL[c.category]).includes(q)) score = 15;
    else if (normalise(c.mechanism).includes(q)) score = 5;
    if (score > 0) scored.push({ c, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name)).map((s) => s.c);
}

export { COMPOUNDS };
