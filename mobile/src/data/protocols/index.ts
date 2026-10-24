// Protocol templates: structured, ready-to-use protocols from labels, trials,
// clinics, the community and vendors. Each one is labelled with its source.

import type { ProtocolSource, ProtocolTemplate } from '../types';
import { HORMONAL_METABOLIC_TEMPLATES } from './hormonal-metabolic';
import { RESEARCH_TEMPLATES } from './research';

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [...HORMONAL_METABOLIC_TEMPLATES, ...RESEARCH_TEMPLATES];

export const TEMPLATE_BY_ID: Record<string, ProtocolTemplate> = Object.fromEntries(PROTOCOL_TEMPLATES.map((t) => [t.id, t]));

const SOURCE_ORDER: ProtocolSource[] = ['label', 'trial', 'clinic', 'community', 'vendor'];

/** Templates that include a compound, formal sources first. */
export function templatesFor(compoundId: string): ProtocolTemplate[] {
  return PROTOCOL_TEMPLATES.filter((t) => t.components.some((c) => c.compoundId === compoundId)).sort(
    (a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) || a.components.length - b.components.length,
  );
}

/** Multi-compound stacks and blends. */
export function stackTemplates(): ProtocolTemplate[] {
  return PROTOCOL_TEMPLATES.filter((t) => t.kind !== 'single');
}

/** Named stacks or blends that put both compounds together. */
export function stacksWith(a: string, b: string): ProtocolTemplate[] {
  return PROTOCOL_TEMPLATES.filter((t) => t.kind !== 'single' && t.components.some((c) => c.compoundId === a) && t.components.some((c) => c.compoundId === b));
}

export const SOURCE_LABEL: Record<ProtocolSource, string> = {
  label: 'Label',
  trial: 'Trial',
  clinic: 'Clinic',
  community: 'Community',
  vendor: 'Vendor',
};

export const SOURCE_BLURB: Record<ProtocolSource, string> = {
  label: 'From the approved prescribing information.',
  trial: 'As run in a published human trial.',
  clinic: 'Reported by prescribing clinics. Not trial-tested.',
  community: 'Reported by users. Not trial-tested.',
  vendor: 'From vendor dosing guides. Not trial-tested.',
};
