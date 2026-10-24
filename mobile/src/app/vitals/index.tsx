import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Activity, Footprints, HeartPulse, Moon, Percent, Plus, Ruler, Scale } from 'lucide-react-native';
import { useMemo, useRef, useState, type ComponentType } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import type { VitalKind } from '@/domain/model';
import { fromKg, toKg } from '@/domain/units';
import { ConfirmBar, TrashButton } from '@/features/health/components';
import { dateLabel, dateTimeLabel, formatNumber } from '@/features/health/format';
import { changeOver, entriesOf, formatVital, formatVitalChange, isVitalKind, toDisplay, unitFor, VITAL_KINDS, VITAL_META, vitalAxis, type VitalChange } from '@/features/health/vitals';
import { useStore } from '@/store';
import { TrendChart } from '@/ui/charts';
import { Button, Chip, num, NumberField } from '@/ui/controls';
import { Dot, EmptyState, Stat } from '@/ui/feedback';
import { Card, HStack, IconButton, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

const PAGE = 30;

const ICON: Record<VitalKind, ComponentType<{ size?: number; color?: string }>> = {
  weight: Scale,
  bodyFat: Percent,
  restingHr: HeartPulse,
  bloodPressure: Activity,
  sleep: Moon,
  steps: Footprints,
  waist: Ruler,
};

export default function VitalsScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: VitalKind = isVitalKind(params.kind) ? params.kind : 'weight';
  const vitals = useStore((s) => s.vitals);
  const weightUnit = useStore((s) => s.settings.weightUnit);
  const goalKg = useStore((s) => s.settings.goalWeightKg);
  const updateSettings = useStore((s) => s.updateSettings);
  const deleteVital = useStore((s) => s.deleteVital);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [goalError, setGoalError] = useState<string | null>(null);
  const chipsRef = useRef<ScrollViewInstance>(null);
  const chipX = useRef<Partial<Record<VitalKind, number>>>({});

  const meta = VITAL_META[kind];
  const unit = unitFor(kind, weightUnit);
  const Icon = ICON[kind];

  const entries = useMemo(() => entriesOf(vitals, kind), [vitals, kind]);
  const newestFirst = useMemo(() => [...entries].reverse(), [entries]);
  const latest = entries.length ? entries[entries.length - 1] : null;
  const week = useMemo(() => changeOver(entries, 7), [entries]);
  const month = useMemo(() => changeOver(entries, 30), [entries]);
  const points = useMemo(() => entries.map((e) => ({ t: e.t, v: toDisplay(kind, e.value, weightUnit) })), [entries, kind, weightUnit]);
  const points2 = useMemo(() => (kind === 'bloodPressure' ? entries.filter((e) => e.value2 !== undefined).map((e) => ({ t: e.t, v: e.value2! })) : undefined), [entries, kind]);

  const goal = kind === 'weight' && goalKg ? fromKg(goalKg, weightUnit) : undefined;
  const toGoal = goal !== undefined && latest ? toDisplay('weight', latest.value, weightUnit) - goal : null;

  const selectKind = (k: VitalKind) => {
    router.setParams({ kind: k });
    chipsRef.current?.scrollTo({ x: Math.max(0, (chipX.current[k] ?? 0) - space.xxxl), animated: true });
    setConfirmId(null);
    setLimit(PAGE);
    setEditingGoal(false);
  };

  const startGoalEdit = () => {
    setGoalDraft(goal !== undefined ? formatNumber(goal, 1).replace(/,/g, '') : '');
    setGoalError(null);
    setEditingGoal(true);
  };

  const saveGoal = () => {
    const v = num(goalDraft);
    const kg = toKg(v, weightUnit);
    if (!(kg >= VITAL_META.weight.min && kg <= VITAL_META.weight.max)) return setGoalError(`Enter a goal weight in ${weightUnit}.`);
    updateSettings({ goalWeightKg: Math.round(kg * 1000) / 1000 });
    setEditingGoal(false);
  };

  const changeStat = (label: string, ch: VitalChange | null, days: number) => (
    <Stat
      label={label}
      value={ch ? formatVitalChange(kind, ch.delta, ch.delta2, weightUnit) : '—'}
      unit={ch ? unit : undefined}
      sub={ch ? `Since ${format(ch.from.t, 'd MMM')}` : `No entry from ~${days} days earlier`}
    />
  );

  return (
    <Screen
      back
      title="Vitals"
      right={
        <IconButton label={`Add ${meta.name}`} onPress={() => router.push(`/vitals/add?kind=${kind}`)}>
          <Plus size={20} color={c.ink} />
        </IconButton>
      }>
      <ScrollView ref={chipsRef} horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
        {VITAL_KINDS.map((k) => (
          <View
            key={k}
            onLayout={(e) => {
              const x = e.nativeEvent.layout.x;
              chipX.current[k] = x;
              if (k === kind && x > 0) chipsRef.current?.scrollTo({ x: Math.max(0, x - space.xxxl), animated: false });
            }}>
            <Chip label={VITAL_META[k].label} selected={k === kind} onPress={() => selectKind(k)} />
          </View>
        ))}
      </ScrollView>

      {!latest ? (
        <EmptyState
          icon={<Icon size={22} color={c.accent} />}
          title={meta.emptyTitle}
          body={meta.empty}
          action={`Add ${meta.name}`}
          onAction={() => router.push(`/vitals/add?kind=${kind}`)}
        />
      ) : (
        <>
          <Card style={{ marginBottom: space.xxl }}>
            <HStack style={{ alignItems: 'flex-start' }}>
              <Stat label="Latest" value={formatVital(latest, weightUnit)} unit={unit} sub={dateTimeLabel(new Date(latest.t))} />
              {goal !== undefined ? (
                <Stat
                  label="Goal"
                  value={formatNumber(goal, 1)}
                  unit={unit}
                  sub={toGoal === null || Math.abs(toGoal) < 0.05 ? 'At goal' : `${formatNumber(Math.abs(toGoal), 1)} ${unit} ${toGoal > 0 ? 'above' : 'below'}`}
                />
              ) : null}
            </HStack>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <HStack style={{ alignItems: 'flex-start' }}>
              {changeStat('7-day change', week, 7)}
              {changeStat('30-day change', month, 30)}
            </HStack>
          </Card>

          <Section
            title="Trend"
            action={
              kind === 'bloodPressure' ? (
                <HStack gap={space.md}>
                  <HStack gap={6}>
                    <Dot color={c.accent} size={8} />
                    <T variant="small" tone="soft">
                      Systolic
                    </T>
                  </HStack>
                  <HStack gap={6}>
                    <Dot color={c.accent + '73'} size={8} />
                    <T variant="small" tone="soft">
                      Diastolic
                    </T>
                  </HStack>
                </HStack>
              ) : undefined
            }>
            <Card style={{ paddingHorizontal: space.sm }}>
              {entries.length >= 2 ? (
                <TrendChart points={points} points2={points2} goal={goal} formatValue={vitalAxis(kind)} />
              ) : (
                <T tone="soft" center style={{ paddingVertical: space.xl, paddingHorizontal: space.md }}>
                  Add another entry to see a trend.
                </T>
              )}
            </Card>
          </Section>
        </>
      )}

      {kind === 'weight' ? (
        <Section title="Goal">
          <Card>
            {editingGoal ? (
              <>
                <NumberField label="Goal weight" value={goalDraft} onChangeText={setGoalDraft} suffix={weightUnit} error={goalError ?? undefined} autoFocus />
                <HStack wrap>
                  <Button title="Save goal" small onPress={saveGoal} />
                  <Button title="Cancel" kind="secondary" small onPress={() => setEditingGoal(false)} />
                  {goalKg ? (
                    <Button
                      title="Remove goal"
                      kind="ghost"
                      small
                      onPress={() => {
                        updateSettings({ goalWeightKg: undefined });
                        setEditingGoal(false);
                      }}
                    />
                  ) : null}
                </HStack>
              </>
            ) : (
              <HStack style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{goal !== undefined ? `${formatNumber(goal, 1)} ${weightUnit}` : 'No goal set'}</T>
                  <T variant="small" tone="soft">
                    {goal !== undefined ? 'Shown as a dashed line on the chart.' : 'Optional. Shown as a dashed line on the chart.'}
                  </T>
                </View>
                <Button title={goal !== undefined ? 'Edit' : 'Set goal'} kind="secondary" small onPress={startGoalEdit} />
              </HStack>
            )}
          </Card>
        </Section>
      ) : null}

      {latest ? (
        <Section
          title="Entries"
          action={
            <T variant="small" tone="faint">
              {entries.length}
            </T>
          }>
          <Card style={{ paddingVertical: space.xs }}>
            {newestFirst.slice(0, limit).map((e, i, shown) => (
              <View key={e.id}>
                <Row
                  title={`${formatVital(e, weightUnit)} ${unit}`}
                  subtitle={dateTimeLabel(new Date(e.t))}
                  right={<TrashButton label={`Delete entry from ${dateLabel(new Date(e.t))}`} onPress={() => setConfirmId(confirmId === e.id ? null : e.id)} />}
                  last={i === shown.length - 1 && confirmId !== e.id}
                />
                {confirmId === e.id ? (
                  <ConfirmBar
                    message="Delete this entry?"
                    onCancel={() => setConfirmId(null)}
                    onConfirm={() => {
                      deleteVital(e.id);
                      setConfirmId(null);
                    }}
                  />
                ) : null}
              </View>
            ))}
          </Card>
          {newestFirst.length > limit ? <Button title={`Show more (${newestFirst.length - limit})`} kind="ghost" small onPress={() => setLimit(limit + PAGE)} style={{ alignSelf: 'center', marginTop: space.sm }} /> : null}
        </Section>
      ) : null}

      <HStack style={{ marginTop: latest ? 0 : space.xl, justifyContent: 'center' }}>
        <Dot color={c.inkFaint} size={4} />
        <T variant="small" tone="faint" style={{ flexShrink: 1 }}>
          Health Connect / Apple Health sync is planned; entries here are manual.
        </T>
      </HStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { marginHorizontal: -space.lg, marginBottom: space.lg, flexGrow: 0 },
  chipsContent: { paddingHorizontal: space.lg, gap: space.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: space.md },
});
