import { BIOMARKER_BY_ID, MARKER_GROUP_LABEL, rangeFor, type Biomarker, type MarkerGroup, type RangeStatus } from '@/data/biomarkers';
import type { LabResult, Sex } from '@/domain/model';
import { trim } from '@/domain/units';
import type { BadgeTone } from '@/ui/feedback';

export const GROUP_ORDER = Object.keys(MARKER_GROUP_LABEL) as MarkerGroup[];

/** Library marker, or a bare placeholder for an id that isn't in the list (e.g. from an import). */
export function markerFor(id: string): Biomarker {
  return BIOMARKER_BY_ID[id] ?? { id, name: id, unit: '', group: 'other', relevance: '' };
}

export function hasReportRange(r: LabResult): boolean {
  return r.refLow !== undefined || r.refHigh !== undefined;
}

/** The report's own range wins; otherwise the typical range for the person's sex. */
export function rangeForResult(r: LabResult, marker: Biomarker, sex: Sex): { low?: number; high?: number } {
  return hasReportRange(r) ? { low: r.refLow, high: r.refHigh } : rangeFor(marker, sex);
}

export function formatRange(range: { low?: number; high?: number }, unit?: string): string {
  const u = unit ? ` ${unit}` : '';
  const { low, high } = range;
  if (low !== undefined && high !== undefined) return `${trim(low)}–${trim(high)}${u}`;
  if (low !== undefined) return `≥ ${trim(low)}${u}`;
  if (high !== undefined) return `≤ ${trim(high)}${u}`;
  return 'No reference range';
}

/** Which population the typical range describes. */
export function rangeBasis(marker: Biomarker, sex: Sex): string {
  const specific = sex === 'male' ? marker.male : sex === 'female' ? marker.female : undefined;
  if (specific) return sex === 'male' ? 'Typical adult range, male' : 'Typical adult range, female';
  if (marker.low !== undefined || marker.high !== undefined) return 'Typical adult range';
  if (sex !== 'unspecified') return 'No typical range on file for your sex. Add the range from your report.';
  if (marker.male || marker.female) return 'Combined male and female range. Set your sex in Settings for a sex-specific range.';
  return 'No typical range on file';
}

export const STATUS_BADGE: Record<RangeStatus, { label: string; tone: BadgeTone }> = {
  low: { label: 'Low', tone: 'warn' },
  normal: { label: 'In range', tone: 'positive' },
  high: { label: 'High', tone: 'warn' },
  unknown: { label: 'No range', tone: 'neutral' },
};

/** Lower-case, alphanumeric only, British spellings folded so "hemo" finds "Haemoglobin". */
export function normaliseQuery(s: string): string {
  return s.toLowerCase().replace(/ae/g, 'e').replace(/[^a-z0-9]+/g, '');
}

const NUM = '(\\d+(?:\\.\\d+)?)';
const BETWEEN = new RegExp(`^${NUM}\\s*(?:-|–|—|to)\\s*${NUM}$`, 'i');
const BELOW = new RegExp(`^(?:<=?|≤|under|below)\\s*${NUM}$`, 'i');
const ABOVE = new RegExp(`^(?:>=?|≥|over|above)\\s*${NUM}$`, 'i');

/** Parses a range as printed on a report: "264-916", "< 200", "≥ 40". Blank → {}; unreadable → null. */
export function parseRange(input: string): { low?: number; high?: number } | null {
  // Drop thousands separators ("1,000") first, then read any remaining comma as a decimal point.
  const s = input.trim().replace(/(\d),(?=\d{3}(?!\d))/g, '$1').replace(/,/g, '.');
  if (!s) return {};
  let m = s.match(BETWEEN);
  if (m) {
    const low = Number(m[1]);
    const high = Number(m[2]);
    return low < high ? { low, high } : null;
  }
  m = s.match(BELOW);
  if (m) return { high: Number(m[1]) };
  m = s.match(ABOVE);
  if (m) return { low: Number(m[1]) };
  return null;
}
