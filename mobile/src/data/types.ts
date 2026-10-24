// Library content types. The library is evidence-first: pharmacokinetics and
// dosing appear only where reliable human data (an approved label or published
// human trials) exists. Everything else is stated as unknown.

export type CompoundCategory =
  | 'metabolic'
  | 'gh-axis'
  | 'repair'
  | 'cognitive'
  | 'immune'
  | 'longevity'
  | 'sexual-health'
  | 'skin'
  | 'hormone';

export type RegulatoryStatus = 'approved' | 'investigational' | 'unapproved';

/** How much human evidence exists, independent of whether it is favourable. */
export type EvidenceLevel = 'extensive' | 'moderate' | 'limited' | 'preclinical';

export type Route = 'subq' | 'im' | 'iv' | 'oral' | 'nasal' | 'topical';

/**
 * Mechanism tags. Interaction rules match on these, so a compound must carry
 * every class that describes how it acts.
 */
export type MechanismClass =
  | 'glp1-agonist'
  | 'gip-agonist'
  | 'glucagon-agonist'
  | 'amylin-agonist'
  | 'ghrh-analog'
  | 'gh-secretagogue'
  | 'growth-hormone'
  | 'igf1-analog'
  | 'melanocortin-agonist'
  | 'gonadotropin'
  | 'kisspeptin'
  | 'androgen'
  | 'oxytocin-agonist'
  | 'copper-peptide'
  | 'thymic-peptide'
  | 'tissue-repair'
  | 'neuropeptide'
  | 'mitochondrial'
  | 'nad-precursor'
  | 'antimicrobial'
  | 'anti-inflammatory'
  | 'bioregulator'
  | 'monoamine-reuptake-inhibitor'
  | 'lipolytic'
  | 'senolytic'
  | 'glucose-lowering';

export interface PharmacokineticData {
  /** Terminal elimination half-life in hours (human data). */
  halfLifeHours: number;
  /** Time to peak concentration after the primary route, in hours. */
  tmaxHours?: number;
  /** Route the values were measured for. */
  route: Route;
  /** One line, e.g. "Approx. 7 days after subcutaneous injection." */
  note: string;
  /** Where the values come from, e.g. "Wegovy US prescribing information". */
  source: string;
}

export interface StudiedRegimen {
  /** What the regimen was studied or approved for. */
  context: string;
  /** The regimen exactly as studied or labelled. */
  regimen: string;
  /** Label or trial name. Never invented. */
  source: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface Compound {
  /** URL-safe slug, e.g. "semaglutide". */
  id: string;
  name: string;
  aliases: string[];
  category: CompoundCategory;
  classes: MechanismClass[];
  /** One sentence, plain language. */
  summary: string;
  /** Two to four sentences on how it acts. */
  mechanism: string;
  regulatory: {
    status: RegulatoryStatus;
    /** e.g. "FDA-approved as Wegovy (chronic weight management) and Ozempic (type 2 diabetes)." */
    detail: string;
  };
  evidence: EvidenceLevel;
  /** One or two sentences describing the human evidence base honestly. */
  evidenceNote: string;
  routes: Route[];
  /** Omit when there is no reliable human PK data. */
  pk?: PharmacokineticData;
  /** Only regimens from an approved label or a published human trial. Empty otherwise. */
  studiedRegimens: StudiedRegimen[];
  commonSideEffects: string[];
  seriousRisks: string[];
  /** Who should not use it, per label or well-established pharmacology. */
  cautions: string[];
  storage?: string;
  /** Anti-doping status where well established, e.g. "Prohibited at all times (WADA S2)". */
  antiDoping?: string;
  /** Official label pages or literature search links. No fabricated citations. */
  sources: SourceLink[];
}
