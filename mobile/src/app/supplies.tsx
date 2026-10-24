import { router } from 'expo-router';
import { Package, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import type { Supply } from '@/domain/model';
import { InlineConfirm, Stepper } from '@/features/inventory/ui';
import { uid, useStore } from '@/store';
import { Button, Chip, Field, num, NumberField } from '@/ui/controls';
import { Badge, EmptyState, Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

const PRESETS: { name: string; perInjection: number }[] = [
  { name: 'Insulin syringes', perInjection: 1 },
  { name: 'Alcohol swabs', perInjection: 1 },
  { name: 'Needles', perInjection: 1 },
  { name: 'Bacteriostatic water', perInjection: 0 },
  { name: 'Sharps container', perInjection: 0 },
];

interface Draft {
  name: string;
  count: string;
  lowStockAt: string;
  perInjection: string;
}

const EMPTY: Draft = { name: '', count: '', lowStockAt: '5', perInjection: '1' };

function toDraft(s: Supply): Draft {
  return { name: s.name, count: String(s.count), lowStockAt: String(s.lowStockAt), perInjection: String(s.perInjection) };
}

/** Validates a draft; returns the parsed values or an error message. */
function parse(d: Draft): { value: Omit<Supply, 'id'> } | { error: string } {
  const name = d.name.trim();
  if (!name) return { error: 'Enter a name.' };
  const count = num(d.count);
  const lowStockAt = num(d.lowStockAt || '0');
  const perInjection = num(d.perInjection || '0');
  if (!(count >= 0) || !Number.isInteger(count)) return { error: 'Count must be a whole number.' };
  if (!(lowStockAt >= 0) || !Number.isInteger(lowStockAt)) return { error: 'The low-stock alert must be a whole number.' };
  if (!(perInjection >= 0) || !Number.isInteger(perInjection)) return { error: 'Used per injection must be a whole number (0 or more).' };
  return { value: { name, count, lowStockAt, perInjection } };
}

function DraftFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <>
      <Field label="Name" value={draft.name} onChangeText={(name) => onChange({ ...draft, name })} placeholder="e.g. Insulin syringes" />
      <HStack style={{ alignItems: 'flex-start' }}>
        <NumberField label="In stock" value={draft.count} onChangeText={(count) => onChange({ ...draft, count })} style={{ flex: 1 }} />
        <NumberField label="Alert at" value={draft.lowStockAt} onChangeText={(lowStockAt) => onChange({ ...draft, lowStockAt })} style={{ flex: 1 }} />
        <NumberField label="Per injection" value={draft.perInjection} onChangeText={(perInjection) => onChange({ ...draft, perInjection })} style={{ flex: 1 }} />
      </HStack>
    </>
  );
}

export default function SuppliesScreen() {
  const { c } = useTheme();
  const supplies = useStore((s) => s.supplies);
  const deductSupplies = useStore((s) => s.settings.deductSupplies);
  const upsertSupply = useStore((s) => s.upsertSupply);
  const deleteSupply = useStore((s) => s.deleteSupply);

  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [addError, setAddError] = useState<string | null>(null);

  const sorted = useMemo(() => [...supplies].sort((a, b) => a.name.localeCompare(b.name)), [supplies]);
  const lowCount = useMemo(() => supplies.filter((s) => s.count <= s.lowStockAt).length, [supplies]);
  const showAdd = adding || supplies.length === 0;

  const startEdit = (s: Supply) => {
    setEditing(s.id);
    setEditDraft(toDraft(s));
    setEditError(null);
    setConfirmDelete(null);
  };

  const saveEdit = (s: Supply) => {
    const r = parse(editDraft);
    if ('error' in r) return setEditError(r.error);
    upsertSupply({ ...s, ...r.value });
    setEditing(null);
  };

  const add = () => {
    const r = parse({ ...draft, count: draft.count || '0' });
    if ('error' in r) return setAddError(r.error);
    upsertSupply({ id: uid(), ...r.value });
    setDraft(EMPTY);
    setAddError(null);
    setAdding(false);
  };

  return (
    <Screen back title="Supplies">
      <View style={{ marginBottom: space.xl }}>
        <Notice>
          {deductSupplies
            ? 'Each injection you log takes the “per injection” amount off every supply below. Set it to 0 for things you don’t use up per shot.'
            : 'Automatic deduction is off in Settings, so counts change only when you adjust them here.'}
        </Notice>
        {!deductSupplies ? <Button title="Open settings" kind="ghost" small onPress={() => router.push('/settings')} style={{ alignSelf: 'flex-start', marginTop: space.xs }} /> : null}
      </View>

      {supplies.length === 0 ? (
        <View style={{ marginBottom: space.xxl }}>
          <EmptyState icon={<Package size={22} color={c.accent} />} title="No supplies yet" body="Track syringes, swabs and water so you know when to restock." />
        </View>
      ) : (
        <Section title={lowCount > 0 ? `${supplies.length} supplies · ${lowCount} low` : `${supplies.length} supplies`}>
          {sorted.map((s) => {
            const low = s.count <= s.lowStockAt;
            const isEditing = editing === s.id;
            return (
              <Card key={s.id} style={{ marginBottom: space.md }}>
                <HStack style={{ justifyContent: 'space-between' }} gap={space.md}>
                  <View style={{ flex: 1 }}>
                    <HStack gap={space.sm}>
                      <T variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {s.name}
                      </T>
                      {low ? <Badge label={s.count === 0 ? 'Out' : 'Low'} tone={s.count === 0 ? 'danger' : 'warn'} /> : null}
                    </HStack>
                    <T variant="small" tone="soft">
                      Alert at {s.lowStockAt} · {s.perInjection > 0 ? `${s.perInjection} per injection` : 'not deducted per injection'}
                    </T>
                  </View>
                  <Stepper value={s.count} onChange={(count) => upsertSupply({ ...s, count })} label={s.name} />
                </HStack>

                {isEditing ? (
                  <View style={{ marginTop: space.lg }}>
                    <DraftFields draft={editDraft} onChange={setEditDraft} />
                    {editError ? (
                      <View style={{ marginBottom: space.md }}>
                        <Notice tone="danger">{editError}</Notice>
                      </View>
                    ) : null}
                    {confirmDelete === s.id ? (
                      <InlineConfirm
                        message={`Delete “${s.name}”?`}
                        confirm="Delete"
                        onConfirm={() => {
                          deleteSupply(s.id);
                          setEditing(null);
                          setConfirmDelete(null);
                        }}
                        onCancel={() => setConfirmDelete(null)}
                      />
                    ) : (
                      <HStack wrap>
                        <Button title="Save" small onPress={() => saveEdit(s)} />
                        <Button title="Cancel" kind="ghost" small onPress={() => setEditing(null)} />
                        <View style={{ flex: 1 }} />
                        <Button title="Delete" kind="danger" small onPress={() => setConfirmDelete(s.id)} />
                      </HStack>
                    )}
                  </View>
                ) : (
                  <HStack wrap style={{ marginTop: space.md }}>
                    <Chip label="+10" onPress={() => upsertSupply({ ...s, count: s.count + 10 })} />
                    <Chip label="+100" onPress={() => upsertSupply({ ...s, count: s.count + 100 })} />
                    <View style={{ flex: 1 }} />
                    <Button title="Edit" kind="ghost" small onPress={() => startEdit(s)} />
                  </HStack>
                )}
              </Card>
            );
          })}
        </Section>
      )}

      {showAdd ? (
        <Section title="Add a supply">
          <Card>
            <HStack wrap style={{ marginBottom: space.md }}>
              {PRESETS.filter((p) => !supplies.some((s) => s.name.toLowerCase() === p.name.toLowerCase())).map((p) => (
                <Chip key={p.name} label={p.name} selected={draft.name === p.name} onPress={() => setDraft({ ...draft, name: p.name, perInjection: String(p.perInjection) })} />
              ))}
            </HStack>
            <DraftFields draft={draft} onChange={setDraft} />
            {addError ? (
              <View style={{ marginBottom: space.md }}>
                <Notice tone="danger">{addError}</Notice>
              </View>
            ) : null}
            <HStack>
              <Button title="Add supply" small icon={<Plus size={16} color={c.accentInk} />} onPress={add} />
              {supplies.length > 0 ? (
                <Button
                  title="Cancel"
                  kind="ghost"
                  small
                  onPress={() => {
                    setAdding(false);
                    setDraft(EMPTY);
                    setAddError(null);
                  }}
                />
              ) : null}
            </HStack>
          </Card>
        </Section>
      ) : (
        <Button title="Add a supply" kind="secondary" icon={<Plus size={18} color={c.ink} />} onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}
