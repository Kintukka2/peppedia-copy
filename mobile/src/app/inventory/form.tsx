import { router, useLocalSearchParams } from 'expo-router';
import { ImagePlus, Plus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getCompound } from '@/data/library';
import type { Compound } from '@/data/types';
import type { AmountUnit, InventoryForm, InventoryItem, OpenVial, VialComponent } from '@/domain/model';
import { toBase, trim } from '@/domain/units';
import { matchCompound } from '@/features/inventory/format';
import { pickPhoto } from '@/features/inventory/photo';
import { AmountInput, QuickChips, Thumb } from '@/features/inventory/ui';
import { uid, useStore } from '@/store';
import { Button, Chip, Field, num, NumberField, Segmented } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { CompoundPicker, DateField, DATE_RE } from '@/ui/pickers';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type Basis = 'vial' | 'ml';

interface Draft {
  key: string;
  compoundId: string | null;
  name: string;
  amount: string;
  unit: AmountUnit;
  picking: boolean;
}

type Params = {
  id?: string;
  name?: string;
  form?: string;
  amount?: string;
  unit?: string;
  diluentMl?: string;
  compoundId?: string;
  vialMl?: string;
  basis?: string;
  components?: string;
};

const MAX_COMPONENTS = 4;

const FORM_HINT: Record<InventoryForm, string> = {
  powder: 'Lyophilised powder you mix with bacteriostatic water.',
  solution: 'Liquid with a fixed strength, such as a pre-filled vial or pen.',
  oil: 'Oil-based injectable, usually labelled in mg/mL.',
  oral: 'Capsules or tablets. Stock is counted per unit.',
};

function asUnit(u: unknown): AmountUnit | null {
  return u === 'mcg' || u === 'mg' || u === 'iu' ? u : null;
}

function asForm(f: unknown): InventoryForm | null {
  return f === 'powder' || f === 'solution' || f === 'oil' || f === 'oral' ? f : null;
}

function defaultUnit(compound: Compound | null): AmountUnit {
  return compound && (compound.classes.includes('gonadotropin') || compound.id === 'somatropin') ? 'iu' : 'mg';
}

function validDate(s: string): boolean {
  return DATE_RE.test(s) && !Number.isNaN(new Date(s + 'T00:00:00').getTime());
}

function initialDrafts(existing: InventoryItem | undefined, params: Params): Draft[] {
  if (existing) {
    return existing.components.map((c, i) => ({ key: `c${i}`, compoundId: c.compoundId, name: c.name, amount: trim(c.amount.value, 6), unit: c.amount.unit, picking: false }));
  }
  if (params.components) {
    try {
      const list = JSON.parse(params.components) as { name?: unknown; amount?: unknown; unit?: unknown }[];
      if (Array.isArray(list) && list.length > 0) {
        return list.slice(0, MAX_COMPONENTS).map((x, i) => {
          const name = typeof x.name === 'string' ? x.name : '';
          const match = matchCompound(name);
          const amount = Number(x.amount);
          return { key: `c${i}`, compoundId: match?.id ?? null, name: name.trim(), amount: amount > 0 ? String(amount) : '', unit: asUnit(x.unit) ?? 'mg', picking: !name };
        });
      }
    } catch {
      // Fall through to a single component.
    }
  }
  const compound = getCompound(params.compoundId);
  return [{ key: 'c0', compoundId: compound?.id ?? null, name: compound?.name ?? '', amount: params.amount ?? '', unit: asUnit(params.unit) ?? defaultUnit(compound), picking: !compound }];
}

function amountText(d: Draft, perMl: boolean, vialMl: number, form: InventoryForm): string {
  const v = num(d.amount);
  if (!(v > 0)) return '';
  const u = d.unit === 'iu' ? 'IU' : d.unit;
  if (perMl) return `${trim(v)} ${u}/mL`;
  if (form === 'solution' && vialMl > 0) return `${trim(v)} ${u} / ${trim(vialMl)} mL`;
  return `${trim(v)} ${u}`;
}

/** "Tirzepatide 20 mg / 2 mL", "BPC-157 5 mg + TB-500 5 mg". Empty until the primary has a name. */
function suggestName(form: InventoryForm, drafts: Draft[], perMl: boolean, vialMl: number): string {
  if (!drafts[0]?.name.trim()) return '';
  if (drafts.length === 1) return [drafts[0].name.trim(), amountText(drafts[0], perMl, vialMl, form)].filter(Boolean).join(' ');
  return drafts
    .filter((d) => d.name.trim())
    .map((d) => [d.name.trim(), amountText(d, perMl, 0, form)].filter(Boolean).join(' '))
    .join(' + ');
}

export default function InventoryFormScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<Params>();
  const inventory = useStore((s) => s.inventory);
  const currency = useStore((s) => s.settings.currency);
  const upsertInventory = useStore((s) => s.upsertInventory);
  const existing = useMemo(() => (params.id ? inventory.find((i) => i.id === params.id) : undefined), [inventory, params.id]);

  const initialForm: InventoryForm = existing?.form ?? asForm(params.form) ?? 'powder';
  const [form, setForm] = useState<InventoryForm>(initialForm);
  const [drafts, setDrafts] = useState<Draft[]>(() => initialDrafts(existing, params));
  const [basis, setBasis] = useState<Basis>(existing ? 'vial' : params.basis === 'ml' || params.basis === 'vial' ? params.basis : initialForm === 'oil' ? 'ml' : 'vial');
  const [vialMl, setVialMl] = useState(existing?.vialVolumeMl ? trim(existing.vialVolumeMl, 4) : (params.vialMl ?? ''));
  const [diluent, setDiluent] = useState(existing?.open?.diluentMl ? trim(existing.open.diluentMl, 3) : (params.diluentMl ?? ''));
  const [count, setCount] = useState(existing ? String(existing.unopened) : '1');
  const [lowStock, setLowStock] = useState(String(existing?.lowStockAt ?? 1));
  const [vendor, setVendor] = useState(existing?.vendor ?? '');
  const [batch, setBatch] = useState(existing?.batch ?? '');
  const [price, setPrice] = useState(existing?.pricePerVial !== undefined ? String(existing.pricePerVial) : '');
  const [purchasedAt, setPurchasedAt] = useState(existing?.purchasedAt ?? '');
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ?? '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(existing?.photoUri);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [name, setName] = useState(existing?.name ?? params.name ?? '');
  const [nameTouched, setNameTouched] = useState(!!existing);
  const [error, setError] = useState<string | null>(null);

  const primary = drafts[0];
  const primaryCompound = getCompound(primary.compoundId);
  const liquid = form === 'solution' || form === 'oil';
  const perMl = liquid && basis === 'ml';
  const oral = form === 'oral';
  const suggested = suggestName(form, drafts, perMl, num(vialMl));
  const displayName = nameTouched ? name : suggested || name;
  const opensVial = form === 'powder' && !existing?.open && num(diluent) > 0;

  const updateDraft = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const onPick = (i: number) => (picked: Compound) => updateDraft(i, { compoundId: picked.id, name: picked.name, picking: false, unit: drafts[i].amount ? drafts[i].unit : defaultUnit(picked) });
  const onCustom = (i: number) => (n: string) => updateDraft(i, { compoundId: null, name: n, picking: false });

  const changeForm = (f: InventoryForm) => {
    setForm(f);
    if (!existing) setBasis(f === 'oil' ? 'ml' : 'vial');
    if (f === 'oral' && drafts.length > 1) setDrafts(drafts.slice(0, 1));
  };

  const choosePhoto = async () => {
    setPhotoError(null);
    setPhotoBusy(true);
    const result = await pickPhoto();
    setPhotoBusy(false);
    if (!result) return;
    if ('error' in result) setPhotoError(result.error);
    else setPhotoUri(result.uri);
  };

  const save = () => {
    setError(null);
    const vol = num(vialMl);
    if (!primary.name.trim()) return setError('Choose a compound or enter a custom name.');
    if (liquid && !(vol > 0)) return setError('Enter the liquid volume of one vial.');
    const components: VialComponent[] = [];
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const v = num(d.amount);
      if (!d.name.trim()) return setError(`Component ${i + 1} needs a compound or a name.`);
      if (!(v > 0)) return setError(i === 0 ? `Enter the amount of ${d.name.trim()}.` : `Enter the amount of ${d.name.trim()} (component ${i + 1}).`);
      components.push({ compoundId: d.compoundId, name: d.name.trim(), amount: { value: perMl ? v * vol : v, unit: d.unit } });
    }
    const finalName = displayName.trim();
    if (!finalName) return setError('Enter a name for this item.');
    const n = num(count);
    if (!(n >= 0) || !Number.isInteger(n)) return setError('Stock must be a whole number.');
    const low = num(lowStock);
    if (!(low >= 0) || !Number.isInteger(low)) return setError('The low-stock alert must be a whole number.');
    const priceValue = price.trim() ? num(price) : undefined;
    if (priceValue !== undefined && !(priceValue >= 0)) return setError('Price must be a number.');
    if (purchasedAt && !validDate(purchasedAt)) return setError('Purchase date must be YYYY-MM-DD.');
    if (expiresAt && !validDate(expiresAt)) return setError('Expiry date must be YYYY-MM-DD.');
    const dil = form === 'powder' && diluent.trim() ? num(diluent) : undefined;
    if (dil !== undefined && !(dil > 0)) return setError('Water added must be more than 0 mL.');

    const size = toBase(components[0].amount).value;
    let unopened = n;
    let open: OpenVial | undefined;
    if (existing?.open) {
      open = { ...existing.open, remaining: Math.min(existing.open.remaining, size), diluentMl: form === 'powder' ? dil : undefined };
    } else if (dil !== undefined) {
      if (n < 1) return setError('Add at least one vial so one can be marked as opened.');
      open = { openedAt: new Date().toISOString(), remaining: size, diluentMl: dil };
      unopened = n - 1;
    }

    const item: InventoryItem = {
      id: existing?.id ?? uid(),
      name: finalName,
      form,
      components,
      vialVolumeMl: liquid ? vol : undefined,
      unopened,
      open,
      vendor: vendor.trim() || undefined,
      batch: batch.trim() || undefined,
      pricePerVial: priceValue,
      purchasedAt: purchasedAt || undefined,
      expiresAt: expiresAt || undefined,
      photoUri,
      notes: notes.trim() || undefined,
      lowStockAt: low,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsertInventory(item);
    if (existing) router.back();
    else router.replace(`/inventory/${item.id}`);
  };

  const primaryLabel = oral ? 'Amount per unit' : perMl ? 'Strength per mL' : drafts.length > 1 ? `${primary.name || 'Primary'} per vial` : 'Amount per vial';

  return (
    <Screen modal title={existing ? 'Edit item' : 'New inventory item'} footer={<Button title={existing ? 'Save changes' : 'Add to inventory'} onPress={save} />}>
      <Section title="Compound">
        {primary.picking ? (
          <>
            <CompoundPicker onPick={onPick(0)} onCustom={onCustom(0)} />
            {primary.name ? <Button title="Cancel" kind="ghost" small onPress={() => updateDraft(0, { picking: false })} style={{ alignSelf: 'flex-start' }} /> : null}
          </>
        ) : (
          <Card>
            <HStack style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T variant="heading">{primary.name}</T>
                <T variant="small" tone="soft">
                  {primaryCompound ? primaryCompound.summary : 'Custom compound — not in the library.'}
                </T>
              </View>
              <Button title="Change" kind="ghost" small onPress={() => updateDraft(0, { picking: true })} />
            </HStack>
          </Card>
        )}
      </Section>

      {!primary.picking && (
        <>
          <Section title="Form">
            <Segmented
              value={form}
              onChange={changeForm}
              options={[
                { value: 'powder', label: 'Powder' },
                { value: 'solution', label: 'Solution' },
                { value: 'oil', label: 'Oil' },
                { value: 'oral', label: 'Oral' },
              ]}
            />
            <T variant="small" tone="soft" style={{ marginTop: space.sm }}>
              {FORM_HINT[form]}
            </T>
          </Section>

          <Section title="Contents">
            {liquid ? (
              <>
                <T variant="smallStrong" tone="soft" style={{ marginBottom: 6 }}>
                  Label shows
                </T>
                <Segmented
                  value={basis}
                  onChange={setBasis}
                  options={[
                    { value: 'vial', label: 'Total in the vial' },
                    { value: 'ml', label: 'Amount per mL' },
                  ]}
                  style={{ marginBottom: space.md }}
                />
              </>
            ) : null}
            <AmountInput label={primaryLabel} value={primary.amount} onChangeText={(v) => updateDraft(0, { amount: v })} unit={primary.unit} onUnit={(u) => updateDraft(0, { unit: u })} placeholder="As printed on the label" />

            {drafts.slice(1).map((d, k) => {
              const i = k + 1;
              return (
                <View key={d.key} style={[styles.extra, { borderTopColor: c.border }]}>
                  <HStack style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
                    <T variant="micro" tone="faint">
                      Component {i + 1}
                    </T>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove component ${i + 1}`} hitSlop={10} onPress={() => setDrafts(drafts.filter((_, j) => j !== i))}>
                      <X size={18} color={c.inkFaint} />
                    </Pressable>
                  </HStack>
                  {d.picking ? (
                    <CompoundPicker onPick={onPick(i)} onCustom={onCustom(i)} />
                  ) : (
                    <HStack style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong">{d.name}</T>
                        <T variant="small" tone="soft">
                          {d.compoundId ? 'Library compound' : 'Custom compound'}
                        </T>
                      </View>
                      <Button title="Change" kind="ghost" small onPress={() => updateDraft(i, { picking: true })} />
                    </HStack>
                  )}
                  <AmountInput
                    label={perMl ? 'Strength per mL' : 'Amount per vial'}
                    value={d.amount}
                    onChangeText={(v) => updateDraft(i, { amount: v })}
                    unit={d.unit}
                    onUnit={(u) => updateDraft(i, { unit: u })}
                    placeholder="As printed on the label"
                  />
                </View>
              );
            })}
            {!oral && drafts.length < MAX_COMPONENTS ? (
              <Button
                title={drafts.length === 1 ? 'Add a component (blend)' : 'Add another component'}
                kind="ghost"
                small
                icon={<Plus size={16} color={c.accent} />}
                onPress={() => setDrafts([...drafts, { key: uid(), compoundId: null, name: '', amount: '', unit: 'mg', picking: true }])}
                style={{ alignSelf: 'flex-start', marginBottom: space.md }}
              />
            ) : null}

            {liquid ? (
              <>
                <NumberField label="Vial volume" value={vialMl} onChangeText={setVialMl} placeholder="Liquid in one vial" suffix="mL" style={{ marginBottom: space.sm }} />
                <QuickChips values={[1, 2, 3, 5, 10]} suffix="mL" current={vialMl} onPick={setVialMl} />
              </>
            ) : null}
            {form === 'powder' ? (
              <>
                <NumberField
                  label="Water added"
                  value={diluent}
                  onChangeText={setDiluent}
                  placeholder="Optional · add when you mix a vial"
                  suffix="mL"
                  hint={existing?.open ? 'Water in the open vial. Changing it changes the concentration.' : opensVial ? 'Saving marks one vial as opened today.' : 'Leave blank until you mix a vial.'}
                  style={{ marginBottom: space.sm }}
                />
                <QuickChips values={[1, 2, 3, 5]} suffix="mL" current={diluent} onPick={setDiluent} />
              </>
            ) : null}
          </Section>

          <Section title="Name">
            <Field
              value={displayName}
              onChangeText={(v) => {
                setName(v);
                setNameTouched(true);
              }}
              placeholder="e.g. vial label"
              hint={!nameTouched && suggested ? 'Suggested from the compound and amount.' : undefined}
            />
            {nameTouched && suggested && suggested !== name ? (
              <View style={{ alignItems: 'flex-start' }}>
                <Chip label={`Use “${suggested}”`} onPress={() => setNameTouched(false)} />
              </View>
            ) : null}
          </Section>

          <Section title="Stock">
            <HStack style={{ alignItems: 'flex-start' }}>
              <NumberField
                label={oral ? 'Units in stock' : existing ? 'Sealed vials' : 'Vials in stock'}
                value={count}
                onChangeText={setCount}
                hint={oral ? undefined : existing ? 'Not counting the open vial.' : opensVial ? 'Includes the one being opened.' : undefined}
                style={{ flex: 1 }}
              />
              <NumberField label={oral ? 'Alert at (units)' : 'Alert at (vials)'} value={lowStock} onChangeText={setLowStock} style={{ flex: 1 }} />
            </HStack>
          </Section>

          <Section title="Purchase">
            <HStack style={{ alignItems: 'flex-start' }}>
              <Field label="Vendor" value={vendor} onChangeText={setVendor} placeholder="Optional" style={{ flex: 1 }} />
              <Field label="Batch / lot" value={batch} onChangeText={setBatch} placeholder="Optional" style={{ flex: 1 }} />
            </HStack>
            <NumberField label={oral ? 'Price per unit' : 'Price per vial'} value={price} onChangeText={setPrice} placeholder="Optional · for cost per dose" suffix={currency} />
            <DateField label="Purchased" value={purchasedAt} onChange={setPurchasedAt} optional future={false} />
            <DateField label="Expires" value={expiresAt} onChange={setExpiresAt} optional />
          </Section>

          <Section title="Photo">
            <HStack gap={space.md}>
              {photoUri ? <Thumb uri={photoUri} form={form} size={72} /> : null}
              <View style={{ flex: 1, gap: space.sm, alignItems: 'flex-start' }}>
                <Button title={photoUri ? 'Replace photo' : 'Add a photo'} kind="secondary" small loading={photoBusy} icon={<ImagePlus size={16} color={c.ink} />} onPress={choosePhoto} />
                {photoUri ? <Button title="Remove photo" kind="ghost" small onPress={() => setPhotoUri(undefined)} /> : null}
              </View>
            </HStack>
            {photoError ? (
              <T variant="small" tone="danger" style={{ marginTop: space.sm }}>
                {photoError}
              </T>
            ) : (
              <T variant="small" tone="faint" style={{ marginTop: space.sm }}>
                A label or vial photo helps tell batches apart. It stays on this device.
              </T>
            )}
          </Section>

          <Section title="Notes">
            <Field value={notes} onChangeText={setNotes} placeholder="Storage, supplier details, anything" multiline />
          </Section>

          {error ? <Notice tone="danger">{error}</Notice> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  extra: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: space.xs, marginBottom: space.sm },
});
