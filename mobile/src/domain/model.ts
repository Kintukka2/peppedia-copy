// User-data model. Everything the person records lives here and is persisted
// locally (see src/store). Dates are ISO strings: `YYYY-MM-DD` for calendar
// days and full ISO timestamps for moments in time.

import type { Route } from '@/data/types';

export type ID = string;

/** Amount units a dose can be expressed in. */
export type AmountUnit = 'mcg' | 'mg' | 'iu';

export interface Amount {
  value: number;
  unit: AmountUnit;
}

/** `HH:mm`, 24-hour. */
export type ClockTime = string;

export type Schedule =
  | { kind: 'daily'; times: ClockTime[] }
  | { kind: 'everyNDays'; n: number; time: ClockTime }
  /** Days are 0 = Sunday … 6 = Saturday. Weekly = one day, twice weekly = two. */
  | { kind: 'weekdays'; days: number[]; time: ClockTime }
  | { kind: 'asNeeded' };

/** A titration step: hold `dose` for `weeks`, then move to the next step. The last step holds indefinitely. */
export interface TitrationStep {
  weeks: number;
  dose: Amount;
}

export interface Cycle {
  onWeeks: number;
  offWeeks: number;
}

export type ProtocolStatus = 'active' | 'paused' | 'completed';

export interface Protocol {
  id: ID;
  /** Library compound id, or null for a custom compound. */
  compoundId: string | null;
  name: string;
  route: Route;
  dose: Amount;
  schedule: Schedule;
  /** When present, overrides `dose` by elapsed weeks since `startDate`. */
  titration?: TitrationStep[];
  cycle?: Cycle;
  startDate: string;
  endDate?: string;
  inventoryId?: ID;
  reminders: boolean;
  status: ProtocolStatus;
  color: string;
  notes?: string;
  createdAt: string;
}

export interface DoseLog {
  id: ID;
  protocolId?: ID;
  compoundId: string | null;
  name: string;
  takenAt: string;
  /** The scheduled slot this log fulfils, if any (ISO timestamp). */
  scheduledFor?: string;
  amount: Amount;
  route: Route;
  siteId?: string;
  inventoryId?: ID;
  volumeMl?: number;
  skipped?: boolean;
  notes?: string;
  /** What this log actually removed from stock, so deleting it can reverse exactly that. */
  deducted?: number;
  suppliesUsed?: { id: ID; n: number }[];
}

export type InventoryForm = 'powder' | 'solution' | 'oil' | 'oral';

export interface VialComponent {
  compoundId: string | null;
  name: string;
  /** Amount per vial (or per capsule for oral). */
  amount: Amount;
}

export interface OpenVial {
  openedAt: string;
  /** Remaining amount of the primary (first) component. */
  remaining: number;
  /** BAC water added when reconstituted (powder only). */
  diluentMl?: number;
}

export interface InventoryItem {
  id: ID;
  name: string;
  form: InventoryForm;
  /** The first component is the primary one; dosing is expressed in it. Blends list several. */
  components: VialComponent[];
  /** Total liquid volume per vial for solutions and oils. */
  vialVolumeMl?: number;
  /** Sealed vials (or capsules for oral) in stock, not counting the open one. */
  unopened: number;
  open?: OpenVial;
  vendor?: string;
  batch?: string;
  pricePerVial?: number;
  purchasedAt?: string;
  expiresAt?: string;
  photoUri?: string;
  notes?: string;
  lowStockAt: number;
  createdAt: string;
}

export interface Supply {
  id: ID;
  name: string;
  count: number;
  lowStockAt: number;
  /** Deducted automatically on each injection log. */
  perInjection: number;
}

export type VitalKind = 'weight' | 'bodyFat' | 'restingHr' | 'bloodPressure' | 'sleep' | 'steps' | 'waist';

export interface VitalEntry {
  id: ID;
  kind: VitalKind;
  /** weight kg · bodyFat % · restingHr bpm · bloodPressure systolic mmHg · sleep hours · steps count · waist cm */
  value: number;
  /** Diastolic for blood pressure. */
  value2?: number;
  at: string;
}

export interface JournalEntry {
  id: ID;
  date: string;
  /** 1 (rough) … 5 (great). */
  mood?: number;
  energy?: number;
  symptoms: string[];
  notes?: string;
}

export interface LabResult {
  id: ID;
  date: string;
  markerId: string;
  value: number;
  /** User-supplied range from their lab report; takes precedence over defaults. */
  refLow?: number;
  refHigh?: number;
  labName?: string;
  notes?: string;
}

export type WeightUnit = 'kg' | 'lb';
export type ThemePreference = 'system' | 'light' | 'dark';
export type SyringeId = 'u100-30' | 'u100-50' | 'u100-100' | 'ml-1' | 'ml-3';
export type Sex = 'male' | 'female' | 'unspecified';

export interface Settings {
  weightUnit: WeightUnit;
  currency: string;
  theme: ThemePreference;
  syringe: SyringeId;
  sex: Sex;
  goalWeightKg?: number;
  remindersEnabled: boolean;
  deductSupplies: boolean;
  /** Optional Ask server base URL (see server/). Empty = offline library search. */
  askEndpoint: string;
  /** Optional bearer token for a protected Ask server. */
  askToken: string;
  acceptedTermsAt?: string;
}
