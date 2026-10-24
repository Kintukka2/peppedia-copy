// Turns library protocol templates into the person's own protocols, and
// describes them in one-line summaries for cards and pickers.

import { addDays, addWeeks } from 'date-fns';

import { getCompound } from '@/data/library';
import { templatesFor } from '@/data/protocols';
import type { ProtocolTemplate, TemplateComponent } from '@/data/types';
import type { Amount, Protocol, ProtocolMix, Schedule } from '@/domain/model';
import { dayKey, describeScheduleOf, parseDay } from '@/domain/schedule';
import { formatAmount, toBase, trim } from '@/domain/units';

export function doseLine(c: TemplateComponent): string {
  const base = formatAmount(c.dose);
  if (!c.range || (c.range.min === c.dose.value && c.range.max === c.dose.value)) return base;
  return `${base} (${trim(c.range.min)}–${trim(c.range.max)})`;
}

export function scheduleLine(t: ProtocolTemplate): string {
  const parts = [describeScheduleOf(t.schedule as Schedule, t.cycle)];
  if (t.durationWeeks) parts.push(`${t.durationWeeks} wk`);
  return parts.join(' · ');
}

/** "2.5 → 5 → 7.5 mg, 4 wk each" when steps are even, otherwise each step with its length. */
export function titrationLine(t: ProtocolTemplate): string | null {
  const steps = t.titration;
  if (!steps || steps.length < 2) return null;
  const unit = steps[0].dose.unit === 'iu' ? 'IU' : steps[0].dose.unit;
  const held = steps.slice(0, -1);
  if (held.every((s) => s.weeks === held[0].weeks)) {
    return `${steps.map((s) => trim(s.dose.value)).join(' → ')} ${unit}, ${held[0].weeks} wk each`;
  }
  return steps.map((s, i) => (i < steps.length - 1 ? `${trim(s.dose.value)} ${unit} × ${s.weeks} wk` : `${trim(s.dose.value)} ${unit}`)).join(' → ');
}

/** The one-line summary used in lists: dose, then schedule. */
export function summaryLine(t: ProtocolTemplate): string {
  const steps = t.titration && t.titration.length > 1 ? t.titration : null;
  const first = steps ? `${trim(steps[0].dose.value)} → ${formatAmount(steps[steps.length - 1].dose)}` : null;
  const dose =
    t.kind === 'single'
      ? (first ?? doseLine(t.components[0]))
      : t.components.map((c, i) => `${getCompound(c.compoundId)?.name ?? c.compoundId} ${i === 0 && first ? first : formatAmount(c.dose)}`).join(' + ');
  return `${dose} · ${scheduleLine(t)}`;
}

/** The name a protocol started from this template should carry. */
export function protocolName(t: ProtocolTemplate, componentIndex = 0): string {
  if (t.kind === 'blend') return t.name;
  return getCompound(t.components[componentIndex].compoundId)?.name ?? t.components[componentIndex].compoundId;
}

/** Last day of a run that lasts `weeks` from `startDate`, inclusive. */
export function endDateFor(startDate: string, weeks: number | undefined): string | undefined {
  if (!weeks) return undefined;
  return dayKey(addDays(addWeeks(parseDay(startDate), weeks), -1));
}

export interface ToProtocolsOptions {
  startDate: string;
  createdAt: string;
  id: () => string;
  color: (taken: Protocol[]) => string;
  existing: Protocol[];
}

/**
 * Protocols for a template: one for a single compound or a premixed blend, one
 * per compound for a stack. Titration applies to the first component only.
 */
export function templateToProtocols(t: ProtocolTemplate, o: ToProtocolsOptions): Protocol[] {
  const indices = t.kind === 'stack' ? t.components.map((_, i) => i) : [0];
  const out: Protocol[] = [];
  for (const i of indices) {
    const c = t.components[i];
    const compound = getCompound(c.compoundId);
    out.push({
      id: o.id(),
      compoundId: c.compoundId,
      name: protocolName(t, i),
      route: compound && !compound.routes.includes(t.route) ? compound.routes[0] : t.route,
      dose: c.dose,
      titration: i === 0 && t.titration ? t.titration.map((s) => ({ weeks: s.weeks, dose: s.dose })) : undefined,
      schedule: JSON.parse(JSON.stringify(t.schedule)) as Schedule,
      cycle: t.cycle ? { ...t.cycle } : undefined,
      startDate: o.startDate,
      endDate: endDateFor(o.startDate, t.durationWeeks),
      reminders: true,
      status: 'active',
      color: o.color([...o.existing, ...out]),
      templateId: t.id,
      createdAt: o.createdAt,
    });
  }
  return out;
}

/** Smallest and largest single dose of a compound across the library's templates, in mg or IU. */
export function typicalDoseRange(compoundId: string): { min: number; max: number; unit: 'mg' | 'iu' } | null {
  const seen: Record<'mg' | 'iu', number[]> = { mg: [], iu: [] };
  for (const t of templatesFor(compoundId)) {
    t.components.forEach((c, i) => {
      if (c.compoundId !== compoundId) return;
      const doses: Amount[] = [c.dose];
      if (c.range) doses.push({ value: c.range.min, unit: c.dose.unit }, { value: c.range.max, unit: c.dose.unit });
      if (i === 0 && t.titration) doses.push(...t.titration.map((s) => s.dose));
      for (const d of doses) {
        const b = toBase(d);
        if (b.value > 0) seen[b.unit].push(b.value);
      }
    });
  }
  const unit = seen.mg.length >= seen.iu.length ? 'mg' : 'iu';
  const vals = seen[unit];
  return vals.length ? { min: Math.min(...vals), max: Math.max(...vals), unit } : null;
}

/**
 * Flags a dose more than ten times outside every library protocol for the
 * compound, which is almost always a mcg/mg slip rather than a choice.
 */
export function doseScaleWarning(compoundId: string | null, name: string, dose: Amount): string | null {
  if (!compoundId || !(dose.value > 0)) return null;
  const r = typicalDoseRange(compoundId);
  const d = toBase(dose);
  if (!r || d.unit !== r.unit) return null;
  const span = `${formatAmount({ value: r.min, unit: r.unit }, true)}–${formatAmount({ value: r.max, unit: r.unit }, true)}`;
  if (d.value < r.min / 10) return `${formatAmount(dose, true)} is far below the ${span} that ${name} protocols in the library use. Check mcg vs mg.`;
  if (d.value > r.max * 10) return `${formatAmount(dose, true)} is far above the ${span} that ${name} protocols in the library use. Check mcg vs mg.`;
  return null;
}

/** A premixed blend's vial, as a protocol mix (water still to be entered). */
export function mixFromTemplate(t: ProtocolTemplate): ProtocolMix | undefined {
  if (!t.blendVial) return undefined;
  const order = [...t.blendVial].sort((a, b) => t.components.findIndex((c) => c.compoundId === a.compoundId) - t.components.findIndex((c) => c.compoundId === b.compoundId));
  return {
    form: 'powder',
    components: order.map((b) => ({ compoundId: b.compoundId, name: getCompound(b.compoundId)?.name ?? b.compoundId, amount: b.amount })),
  };
}
