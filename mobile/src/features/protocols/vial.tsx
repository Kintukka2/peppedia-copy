import { View } from 'react-native';

import { drawForProtocol, drawText } from '@/domain/draw';
import type { Amount, AmountUnit, InventoryItem, SyringeId } from '@/domain/model';
import { formatAmount, trim } from '@/domain/units';
import { concentrationText } from '@/features/inventory/format';
import { AmountInput, DrawReadout, QuickChips, Stepper, SyringeChips } from '@/features/inventory/ui';
import { NumberField, OptionList, Segmented, ToggleRow } from '@/ui/controls';
import { Notice, Stat } from '@/ui/feedback';
import { Card, HStack, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

import { mixFromDraft, type MixDraft } from './mix';

const VIAL_MG = [2, 5, 10, 15, 30, 50];
const WATER_ML = [1, 2, 3, 5];
const STRENGTH = [100, 200, 250];
const VIAL_ML = [1, 2, 5, 10];

export interface VialSectionProps {
  /** Dose per administration; several when the protocol titrates (first = the starting step). */
  doses: Amount[];
  draft: MixDraft;
  onDraft: (d: MixDraft) => void;
  /** All inventory, to look up the linked vial. */
  inventory: InventoryItem[];
  /** Vials that can supply this dose. */
  compatible: InventoryItem[];
  inventoryId: string;
  onInventory: (id: string) => void;
  syringe: SyringeId;
  onSyringe: (s: SyringeId) => void;
  addToInventory: boolean;
  onAddToInventory: (on: boolean) => void;
  vials: number;
  onVials: (n: number) => void;
  /** Scheduled doses per day, for how long a vial lasts. */
  perDay: number;
}

/** The protocol form's calculator: how the vial is mixed, which syringe, and exactly what each dose draws. */
export function VialSection(p: VialSectionProps) {
  const { c } = useTheme();
  const linked = p.inventory.find((i) => i.id === p.inventoryId);
  const mix = mixFromDraft(p.draft);
  const draw = (dose: Amount) => drawForProtocol({ inventoryId: p.inventoryId || undefined, mix, syringe: p.syringe }, dose, p.inventory, p.syringe);
  const first = p.doses[0] && p.doses[0].value > 0 ? draw(p.doses[0]) : null;
  const usingLinked = first?.source === 'inventory';
  const powder = p.draft.form === 'powder';

  const setPart = (i: number, patch: Partial<MixDraft['parts'][number]>) => p.onDraft({ ...p.draft, parts: p.draft.parts.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const unitsFor = (u: AmountUnit): AmountUnit[] => (u === 'iu' ? ['iu', 'mg'] : ['mg', 'mcg', 'iu']);

  const days = first?.dosesPerVial && p.perDay > 0 ? first.dosesPerVial / p.perDay : null;
  const missing = !p.doses[0] || !(p.doses[0].value > 0) ? 'Enter the dose to see the draw.' : !mix && !usingLinked ? 'Enter what is in the vial to see the draw.' : powder && !usingLinked && !p.draft.water ? 'Enter the water added to see the draw.' : null;

  return (
    <Section title="Vial & syringe">
      {p.compatible.length > 0 ? (
        <View style={{ marginBottom: space.md }}>
          <OptionList
            value={p.inventoryId}
            onChange={p.onInventory}
            options={[
              { value: '', label: 'Describe the vial here', hint: 'Not linked to inventory' },
              ...p.compatible.map((i) => ({ value: i.id, label: i.name, hint: concentrationText(i) ?? 'No water recorded yet' })),
            ]}
          />
        </View>
      ) : null}

      {!usingLinked ? (
        <>
          {linked ? (
            <T variant="small" tone="soft" style={{ marginBottom: space.md }}>
              {linked.name} has no water recorded yet, so the draw below uses the vial described here.
            </T>
          ) : null}
          <Segmented
            value={p.draft.form}
            onChange={(form) => p.onDraft({ ...p.draft, form })}
            options={[
              { value: 'powder', label: 'Powder + water' },
              { value: 'liquid', label: 'Liquid (oil / solution)' },
            ]}
            style={{ marginBottom: space.lg }}
          />
          {p.draft.parts.map((part, i) => (
            <View key={i}>
              <AmountInput
                label={powder ? `${part.name || 'Compound'} in the vial` : `${part.name || 'Compound'} per mL`}
                value={part.amount}
                onChangeText={(v) => setPart(i, { amount: v })}
                unit={part.unit}
                onUnit={(u) => setPart(i, { unit: u })}
                units={unitsFor(part.unit)}
                placeholder="As printed on the label"
              />
              {i === 0 ? (
                <QuickChips
                  values={powder ? VIAL_MG : STRENGTH}
                  suffix={powder ? 'mg' : 'mg/mL'}
                  current={part.amount}
                  active={part.unit === 'mg'}
                  onPick={(v) => setPart(0, { amount: v, unit: 'mg' })}
                />
              ) : null}
            </View>
          ))}
          {powder ? (
            <>
              <NumberField label="Water added" value={p.draft.water} onChangeText={(water) => p.onDraft({ ...p.draft, water })} placeholder="Bacteriostatic water" suffix="mL" style={{ marginBottom: space.sm }} />
              <QuickChips values={WATER_ML} suffix="mL" current={p.draft.water} onPick={(water) => p.onDraft({ ...p.draft, water })} />
            </>
          ) : (
            <>
              <NumberField label="Vial volume" value={p.draft.vialMl} onChangeText={(vialMl) => p.onDraft({ ...p.draft, vialMl })} placeholder="Optional, for doses per vial" suffix="mL" style={{ marginBottom: space.sm }} />
              <QuickChips values={VIAL_ML} suffix="mL" current={p.draft.vialMl} onPick={(vialMl) => p.onDraft({ ...p.draft, vialMl })} />
            </>
          )}
        </>
      ) : null}

      <T variant="smallStrong" tone="soft" style={{ marginBottom: space.sm }}>
        Syringe
      </T>
      <SyringeChips value={p.syringe} onChange={p.onSyringe} />

      {first ? (
        <Card style={{ marginTop: space.md }}>
          <T variant="micro" tone="faint">
            {p.doses.length > 1 ? 'First step, each dose' : 'Each dose'}
          </T>
          <T variant="title" style={{ marginTop: 2 }}>
            {first.delivers.map((d) => `${formatAmount(d.amount, true)} ${d.name}`).join(' + ')}
          </T>
          <DrawReadout volumeMl={first.volumeMl} syringe={p.syringe} />
          {first.warnings.map((w) => (
            <View key={w} style={{ marginTop: space.sm }}>
              <Notice tone="warn">{w}</Notice>
            </View>
          ))}
          <HStack style={{ marginTop: space.md }}>
            <Stat label="Strength" value={first.baseUnit === 'iu' ? `${trim(first.concentration, 2)}` : first.concentration < 1 ? trim(first.concentration * 1000, 1) : trim(first.concentration, 2)} unit={first.baseUnit === 'iu' ? 'IU/mL' : first.concentration < 1 ? 'mcg/mL' : 'mg/mL'} />
            <Stat label="Doses per vial" value={first.dosesPerVial === null ? '—' : String(first.dosesPerVial)} sub={days !== null ? `about ${days >= 14 ? `${trim(days / 7, 1)} weeks` : `${Math.floor(days)} days`}` : undefined} />
          </HStack>
          {p.doses.length > 1 ? (
            <View style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.border, gap: 6 }}>
              <T variant="smallStrong" tone="soft">
                Every step
              </T>
              {p.doses.map((d, i) => {
                const s = d.value > 0 ? draw(d) : null;
                return (
                  <HStack key={i} style={{ justifyContent: 'space-between' }}>
                    <T tone="soft">
                      Step {i + 1} · {formatAmount(d, true)}
                    </T>
                    <T variant="bodyStrong" tabular style={s?.warnings.length ? { color: c.warn } : undefined}>
                      {s ? drawText(s) : '—'}
                    </T>
                  </HStack>
                );
              })}
              {p.doses.some((d) => d.value > 0 && draw(d)?.warnings.length) ? (
                <T variant="small" tone="soft">
                  Steps in amber don’t fit this syringe in one clean draw. Use a larger syringe or mix the vial differently for those steps.
                </T>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : missing ? (
        <T tone="soft" style={{ marginTop: space.md }}>
          {missing}
        </T>
      ) : (
        <Notice tone="warn">The dose unit doesn’t match the vial (IU vs mg). Change one so they match.</Notice>
      )}

      {!p.inventoryId && mix ? (
        <Card style={{ marginTop: space.md, paddingVertical: space.xs }}>
          <ToggleRow title="Add this vial to inventory" subtitle="Tracks stock, deducts every logged dose and warns before you run out." value={p.addToInventory} onChange={p.onAddToInventory} />
          {p.addToInventory ? (
            <HStack style={{ justifyContent: 'space-between', paddingBottom: space.md }}>
              <T tone="soft">Vials on hand</T>
              <Stepper value={p.vials} onChange={p.onVials} min={1} label="vials" />
            </HStack>
          ) : null}
        </Card>
      ) : null}
    </Section>
  );
}
