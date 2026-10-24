// Library content types. Pharmacokinetics and studied regimens come only from
// labels and published human trials. Protocol templates also carry clinic,
// community and vendor practice, and every template says which one it is.

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
  /** Regimens from an approved label or a published human trial, as text. Structured, usable versions live in protocol templates. */
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

/**
 * Where a protocol template comes from. `label` and `trial` are formal human
 * data; `clinic`, `community` and `vendor` are reported practice and carry no
 * trial backing. The app labels every template with its source.
 */
export type ProtocolSource = 'label' | 'trial' | 'clinic' | 'community' | 'vendor';

export type DoseUnit = 'mcg' | 'mg' | 'iu';

export interface Dose {
  value: number;
  unit: DoseUnit;
}

/** Same shape as the user's protocol schedule. Days are 0 = Sunday … 6 = Saturday; times are `HH:mm`. */
export type TemplateSchedule =
  | { kind: 'daily'; times: string[] }
  | { kind: 'everyNDays'; n: number; time: string }
  | { kind: 'weekdays'; days: number[]; time: string }
  | { kind: 'asNeeded' };

export interface TemplateComponent {
  compoundId: string;
  /** Dose per administration (the starting dose when the template titrates). */
  dose: Dose;
  /** Range commonly reported for this dose, in the same unit. */
  range?: { min: number; max: number };
}

export interface ProtocolTemplate {
  /** Unique slug, e.g. "bpc-157-community-healing". */
  id: string;
  /** Short name, e.g. "Injury repair" or "Wegovy titration". */
  name: string;
  source: ProtocolSource;
  /** Who reports it, plainly, e.g. "Common across r/Peptides and peptide-clinic intake sheets". */
  reportedBy: string;
  /** What people use it for, one line. */
  goal: string;
  route: Route;
  /**
   * `single`: one compound. `stack`: several compounds dosed separately (each
   * becomes its own protocol). `blend`: several compounds premixed in one vial
   * and injected together (dosed by the first component).
   */
  kind: 'single' | 'stack' | 'blend';
  /** One entry for `single`; two or more for `stack` and `blend`. */
  components: TemplateComponent[];
  schedule: TemplateSchedule;
  /** Dose steps for the first component, in order. Each holds for `weeks`; the last holds indefinitely. */
  titration?: { weeks: number; dose: Dose }[];
  cycle?: { onWeeks: number; offWeeks: number };
  /** Typical run length. Omit when open-ended. */
  durationWeeks?: number;
  /** Per-vial amounts for a premixed blend, as sold, e.g. GLOW 70 mg. */
  blendVial?: { compoundId: string; amount: Dose }[];
  /** Practical notes: timing, fasting, reconstitution, what people watch for. */
  notes: string[];
  /** Pages that report it. Real URLs only. */
  sources: SourceLink[];
}
