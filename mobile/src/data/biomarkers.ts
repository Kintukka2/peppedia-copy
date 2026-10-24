// Common lab markers with typical adult reference ranges. Ranges differ
// between laboratories, so a range printed on the person's own report always
// takes precedence (LabResult.refLow / refHigh).

export type MarkerGroup = 'metabolic' | 'liver' | 'kidney' | 'lipids' | 'blood' | 'hormones' | 'thyroid' | 'inflammation' | 'other';

export interface Biomarker {
  id: string;
  name: string;
  unit: string;
  group: MarkerGroup;
  low?: number;
  high?: number;
  /** Sex-specific ranges override the general one. */
  male?: { low?: number; high?: number };
  female?: { low?: number; high?: number };
  note?: string;
  /** Why someone tracking peptides might watch it. */
  relevance: string;
}

export const MARKER_GROUP_LABEL: Record<MarkerGroup, string> = {
  metabolic: 'Metabolic',
  liver: 'Liver',
  kidney: 'Kidney',
  lipids: 'Lipids',
  blood: 'Blood count',
  hormones: 'Hormones',
  thyroid: 'Thyroid',
  inflammation: 'Inflammation',
  other: 'Other',
};

export const BIOMARKERS: Biomarker[] = [
  { id: 'glucose', name: 'Fasting glucose', unit: 'mg/dL', group: 'metabolic', low: 70, high: 99, relevance: 'GLP-1 agonists lower it; GH and secretagogues can raise it.' },
  { id: 'hba1c', name: 'HbA1c', unit: '%', group: 'metabolic', low: 4, high: 5.6, relevance: 'Three-month average glucose.' },
  { id: 'insulin', name: 'Fasting insulin', unit: 'µIU/mL', group: 'metabolic', low: 2, high: 25, note: 'Ranges vary widely by assay.', relevance: 'Insulin resistance marker.' },
  { id: 'lipase', name: 'Lipase', unit: 'U/L', group: 'metabolic', low: 0, high: 160, note: 'Ranges vary widely by assay.', relevance: 'Pancreatitis is a labelled risk of GLP-1 agonists.' },
  { id: 'alt', name: 'ALT', unit: 'U/L', group: 'liver', low: 7, high: 56, relevance: 'Liver cell injury.' },
  { id: 'ast', name: 'AST', unit: 'U/L', group: 'liver', low: 10, high: 40, relevance: 'Liver and muscle injury.' },
  { id: 'creatinine', name: 'Creatinine', unit: 'mg/dL', group: 'kidney', male: { low: 0.74, high: 1.35 }, female: { low: 0.59, high: 1.04 }, relevance: 'Kidney function; dehydration from GI effects can raise it.' },
  { id: 'egfr', name: 'eGFR', unit: 'mL/min/1.73m²', group: 'kidney', low: 90, relevance: 'Estimated kidney filtration.' },
  { id: 'chol', name: 'Total cholesterol', unit: 'mg/dL', group: 'lipids', high: 200, relevance: 'Cardiovascular risk.' },
  { id: 'ldl', name: 'LDL cholesterol', unit: 'mg/dL', group: 'lipids', high: 100, relevance: 'Cardiovascular risk.' },
  { id: 'hdl', name: 'HDL cholesterol', unit: 'mg/dL', group: 'lipids', male: { low: 40 }, female: { low: 50 }, relevance: 'Androgens can lower HDL.' },
  { id: 'tg', name: 'Triglycerides', unit: 'mg/dL', group: 'lipids', high: 150, relevance: 'Cardiovascular and metabolic risk.' },
  { id: 'hgb', name: 'Haemoglobin', unit: 'g/dL', group: 'blood', male: { low: 13.2, high: 16.6 }, female: { low: 11.6, high: 15 }, relevance: 'Testosterone raises red cell mass.' },
  { id: 'hct', name: 'Haematocrit', unit: '%', group: 'blood', male: { low: 38.3, high: 48.6 }, female: { low: 35.5, high: 44.9 }, relevance: 'Watched on testosterone therapy.' },
  { id: 'total-t', name: 'Total testosterone', unit: 'ng/dL', group: 'hormones', male: { low: 264, high: 916 }, female: { low: 15, high: 70 }, relevance: 'Core TRT and hCG marker.' },
  { id: 'free-t', name: 'Free testosterone', unit: 'pg/mL', group: 'hormones', male: { low: 46, high: 224 }, note: 'Method-dependent.', relevance: 'Bioavailable testosterone.' },
  { id: 'e2', name: 'Estradiol', unit: 'pg/mL', group: 'hormones', male: { low: 10, high: 40 }, note: 'Female ranges depend on cycle phase.', relevance: 'Rises with testosterone and hCG.' },
  { id: 'shbg', name: 'SHBG', unit: 'nmol/L', group: 'hormones', male: { low: 10, high: 57 }, female: { low: 18, high: 144 }, relevance: 'Binds testosterone and estradiol.' },
  { id: 'lh', name: 'LH', unit: 'mIU/mL', group: 'hormones', male: { low: 1.7, high: 8.6 }, note: 'Female ranges depend on cycle phase.', relevance: 'Suppressed by exogenous testosterone.' },
  { id: 'prolactin', name: 'Prolactin', unit: 'ng/mL', group: 'hormones', male: { low: 2, high: 18 }, female: { low: 2, high: 29 }, relevance: 'Some GH secretagogues raise it.' },
  { id: 'igf1', name: 'IGF-1', unit: 'ng/mL', group: 'hormones', low: 100, high: 300, note: 'Strongly age-dependent; use your lab’s age-adjusted range.', relevance: 'Primary marker for GH-axis compounds.' },
  { id: 'psa', name: 'PSA', unit: 'ng/mL', group: 'hormones', high: 4, relevance: 'Prostate marker monitored on testosterone.' },
  { id: 'tsh', name: 'TSH', unit: 'mIU/L', group: 'thyroid', low: 0.4, high: 4, relevance: 'Thyroid function.' },
  { id: 'ft4', name: 'Free T4', unit: 'ng/dL', group: 'thyroid', low: 0.8, high: 1.8, relevance: 'Thyroid hormone.' },
  { id: 'calcitonin', name: 'Calcitonin', unit: 'pg/mL', group: 'thyroid', male: { high: 10 }, female: { high: 5 }, relevance: 'Thyroid C-cell marker, relevant to the GLP-1 class warning.' },
  { id: 'hscrp', name: 'hs-CRP', unit: 'mg/L', group: 'inflammation', high: 3, note: 'Below 1 is lower cardiovascular risk.', relevance: 'General inflammation.' },
  { id: 'vitd', name: 'Vitamin D (25-OH)', unit: 'ng/mL', group: 'other', low: 30, high: 100, relevance: 'General health marker.' },
  { id: 'ferritin', name: 'Ferritin', unit: 'ng/mL', group: 'other', male: { low: 24, high: 336 }, female: { low: 11, high: 307 }, relevance: 'Iron stores.' },
];

export const BIOMARKER_BY_ID: Record<string, Biomarker> = Object.fromEntries(BIOMARKERS.map((b) => [b.id, b]));

export function rangeFor(marker: Biomarker, sex: 'male' | 'female' | 'unspecified'): { low?: number; high?: number } {
  const specific = sex === 'male' ? marker.male : sex === 'female' ? marker.female : undefined;
  if (specific) return specific;
  if (marker.low !== undefined || marker.high !== undefined) return { low: marker.low, high: marker.high };
  // A sex is set but this marker only has a range for the other sex: no typical range applies.
  if (sex !== 'unspecified') return {};
  // Unspecified sex with only sex-specific ranges: use the widest envelope.
  const lows = [marker.male?.low, marker.female?.low].filter((v): v is number => v !== undefined);
  const highs = [marker.male?.high, marker.female?.high].filter((v): v is number => v !== undefined);
  return { low: lows.length ? Math.min(...lows) : undefined, high: highs.length ? Math.max(...highs) : undefined };
}

export type RangeStatus = 'low' | 'normal' | 'high' | 'unknown';

export function rangeStatus(value: number, range: { low?: number; high?: number }): RangeStatus {
  if (range.low === undefined && range.high === undefined) return 'unknown';
  if (range.low !== undefined && value < range.low) return 'low';
  if (range.high !== undefined && value > range.high) return 'high';
  return 'normal';
}
