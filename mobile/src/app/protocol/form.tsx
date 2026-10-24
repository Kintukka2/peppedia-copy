import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Minus, Plus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { getCompound, ROUTE_LABEL } from '@/data/library';
import { TEMPLATE_BY_ID, templatesFor } from '@/data/protocols';
import type { Compound, ProtocolTemplate, Route } from '@/data/types';
import { doseInItemUnit } from '@/domain/inventory';
import type { AmountUnit, Protocol, Schedule, TitrationStep } from '@/domain/model';
import { TemplateOption } from '@/features/protocols/components';
import { endDateFor, protocolName } from '@/features/protocols/templates';
import { requestReminderPermission } from '@/lib/notifications';
import { nextColor, uid, useStore } from '@/store';
import { Button, Chip, Field, num, NumberField, OptionList, Segmented, ToggleRow } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { CompoundPicker, DateField, DayPicker, isValidDay, TIME_RE, TimeField, UnitPicker } from '@/ui/pickers';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type ScheduleKind = Schedule['kind'];

interface StepDraft {
  weeks: string;
  dose: string;
}

const ALL_ROUTES: Route[] = ['subq', 'im', 'oral', 'nasal', 'topical', 'iv'];
const DEFAULT_STEPS: StepDraft[] = [
  { weeks: '4', dose: '' },
  { weeks: '4', dose: '' },
];

/** Form fields a template fills in, for the component at `index` (stacks carry one per compound). */
function draftFrom(t: ProtocolTemplate, startDate: string, index = 0) {
  const part = t.components[index];
  const s = t.schedule;
  const titration = index === 0 && t.titration && t.titration.length > 1 ? t.titration : null;
  return {
    name: protocolName(t, index),
    route: t.route,
    dose: String(part.dose.value),
    unit: part.dose.unit,
    useTitration: !!titration,
    steps: titration ? titration.map((x) => ({ weeks: String(x.weeks), dose: String(x.dose.value) })) : DEFAULT_STEPS,
    kind: s.kind,
    times: s.kind === 'daily' ? s.times : ['08:00'],
    time: s.kind === 'everyNDays' || s.kind === 'weekdays' ? s.time : '08:00',
    days: s.kind === 'weekdays' ? s.days : [new Date().getDay()],
    everyN: s.kind === 'everyNDays' ? String(s.n) : '2',
    useCycle: !!t.cycle,
    onWeeks: String(t.cycle?.onWeeks ?? 8),
    offWeeks: String(t.cycle?.offWeeks ?? 4),
    endDate: endDateFor(startDate, t.durationWeeks) ?? '',
  };
}

export default function ProtocolForm() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id?: string; compoundId?: string; templateId?: string }>();
  const existing = useStore((s) => s.protocols.find((p) => p.id === params.id));
  const protocols = useStore((s) => s.protocols);
  const inventory = useStore((s) => s.inventory);
  const upsertProtocol = useStore((s) => s.upsertProtocol);
  const deleteProtocol = useStore((s) => s.deleteProtocol);
  const remindersEnabled = useStore((s) => s.settings.remindersEnabled);

  const initialTemplate = existing ? undefined : TEMPLATE_BY_ID[params.templateId ?? ''];
  const initialCompound = getCompound(existing?.compoundId ?? initialTemplate?.components[0].compoundId ?? params.compoundId);
  const today = format(new Date(), 'yyyy-MM-dd');
  const seed = initialTemplate ? draftFrom(initialTemplate, today) : null;
  const [compound, setCompound] = useState<Compound | null>(initialCompound);
  const [templateId, setTemplateId] = useState<string | undefined>(existing?.templateId ?? initialTemplate?.id);
  const [name, setName] = useState(existing?.name ?? seed?.name ?? initialCompound?.name ?? '');
  const [picking, setPicking] = useState(!existing && !initialCompound);
  const [route, setRoute] = useState<Route>(existing?.route ?? seed?.route ?? initialCompound?.routes[0] ?? 'subq');
  const [dose, setDose] = useState(existing ? String(existing.dose.value) : (seed?.dose ?? ''));
  const [unit, setUnit] = useState<AmountUnit>(existing?.dose.unit ?? seed?.unit ?? 'mg');
  const [useTitration, setUseTitration] = useState(existing ? !!existing.titration?.length : !!seed?.useTitration);
  const [steps, setSteps] = useState<StepDraft[]>(existing?.titration?.map((s) => ({ weeks: String(s.weeks), dose: String(s.dose.value) })) ?? seed?.steps ?? DEFAULT_STEPS);
  const [kind, setKind] = useState<ScheduleKind>(existing?.schedule.kind ?? seed?.kind ?? 'daily');
  const [times, setTimes] = useState<string[]>(existing?.schedule.kind === 'daily' ? existing.schedule.times : (seed?.times ?? ['08:00']));
  const [time, setTime] = useState(existing && existing.schedule.kind !== 'daily' && existing.schedule.kind !== 'asNeeded' ? existing.schedule.time : (seed?.time ?? '08:00'));
  const [days, setDays] = useState<number[]>(existing?.schedule.kind === 'weekdays' ? existing.schedule.days : (seed?.days ?? [new Date().getDay()]));
  const [everyN, setEveryN] = useState(existing?.schedule.kind === 'everyNDays' ? String(existing.schedule.n) : (seed?.everyN ?? '2'));
  const [useCycle, setUseCycle] = useState(existing ? !!existing.cycle : !!seed?.useCycle);
  const [onWeeks, setOnWeeks] = useState(existing?.cycle ? String(existing.cycle.onWeeks) : (seed?.onWeeks ?? '8'));
  const [offWeeks, setOffWeeks] = useState(existing?.cycle ? String(existing.cycle.offWeeks) : (seed?.offWeeks ?? '4'));
  const [startDate, setStartDate] = useState(existing?.startDate ?? today);
  const [endDate, setEndDate] = useState(existing?.endDate ?? seed?.endDate ?? '');
  const [inventoryId, setInventoryId] = useState<string>(existing?.inventoryId ?? '');
  const [reminders, setReminders] = useState(existing?.reminders ?? true);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  // A blend is dosed by its first component, so it is offered only from that compound.
  const templates = useMemo(() => (compound ? templatesFor(compound.id).filter((t) => t.kind !== 'blend' || t.components[0].compoundId === compound.id) : []), [compound]);

  const applyTemplate = (t: ProtocolTemplate) => {
    const d = draftFrom(t, startDate, Math.max(0, t.components.findIndex((x) => x.compoundId === compound?.id)));
    setTemplateId(t.id);
    setName(d.name);
    setRoute(d.route);
    setDose(d.dose);
    setUnit(d.unit);
    setUseTitration(d.useTitration);
    setSteps(d.steps);
    setKind(d.kind);
    setTimes(d.times);
    setTime(d.time);
    setDays(d.days);
    setEveryN(d.everyN);
    setUseCycle(d.useCycle);
    setOnWeeks(d.onWeeks);
    setOffWeeks(d.offWeeks);
    setEndDate(d.endDate);
  };

  const routes = compound?.routes.length ? compound.routes : ALL_ROUTES;

  const compatibleInventory = useMemo(
    () => inventory.filter((i) => doseInItemUnit(i, { value: 1, unit }) !== null && (!compound || i.components.some((x) => x.compoundId === compound.id) || i.components.some((x) => x.compoundId === null))),
    [inventory, unit, compound],
  );

  const pickCompound = (picked: Compound) => {
    setCompound(picked);
    setTemplateId(undefined);
    setName(picked.name);
    setRoute(picked.routes[0] ?? 'subq');
    const typical = templatesFor(picked.id)[0];
    if (typical) setUnit(typical.components.find((x) => x.compoundId === picked.id)?.dose.unit ?? typical.components[0].dose.unit);
    else if (picked.classes.includes('gonadotropin') || picked.id === 'somatropin') setUnit('iu');
    setPicking(false);
  };

  const save = async () => {
    setError(null);
    const doseValue = num(dose);
    const titration: TitrationStep[] | undefined = useTitration
      ? steps.map((s) => ({ weeks: Math.max(1, Math.round(num(s.weeks))), dose: { value: num(s.dose), unit } }))
      : undefined;
    if (!name.trim()) return setError('Choose a compound or enter a name.');
    if (useTitration) {
      if (!titration || titration.length === 0 || titration.some((s) => !(s.dose.value > 0) || !(s.weeks > 0))) return setError('Every titration step needs a dose and a number of weeks.');
    } else if (!(doseValue > 0)) return setError('Enter the dose you take.');

    let schedule: Schedule;
    switch (kind) {
      case 'daily':
        if (times.length === 0 || times.some((t) => !TIME_RE.test(t))) return setError('Times must be HH:MM.');
        schedule = { kind, times: [...new Set(times)].sort() };
        break;
      case 'weekdays':
        if (days.length === 0) return setError('Pick at least one day.');
        if (!TIME_RE.test(time)) return setError('Time must be HH:MM.');
        schedule = { kind, days, time };
        break;
      case 'everyNDays': {
        const n = Math.round(num(everyN));
        if (!(n >= 1)) return setError('Enter how many days between doses.');
        if (!TIME_RE.test(time)) return setError('Time must be HH:MM.');
        schedule = { kind, n, time };
        break;
      }
      case 'asNeeded':
        schedule = { kind };
    }
    if (!isValidDay(startDate)) return setError('Start date must be YYYY-MM-DD.');
    if (endDate && (!isValidDay(endDate) || endDate < startDate)) return setError('End date must be YYYY-MM-DD and after the start.');
    const cycle = useCycle ? { onWeeks: Math.round(num(onWeeks)), offWeeks: Math.round(num(offWeeks)) } : undefined;
    if (cycle && !(cycle.onWeeks > 0 && cycle.offWeeks > 0)) return setError('Cycle weeks must be at least 1.');

    const p: Protocol = {
      id: existing?.id ?? uid(),
      compoundId: compound?.id ?? null,
      name: name.trim(),
      route,
      dose: titration ? titration[0].dose : { value: doseValue, unit },
      titration,
      schedule,
      cycle,
      startDate,
      endDate: endDate || undefined,
      inventoryId: inventoryId || undefined,
      reminders,
      status: existing?.status ?? 'active',
      color: existing?.color ?? nextColor(protocols),
      notes: notes.trim() || undefined,
      templateId,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsertProtocol(p);
    if (reminders && remindersEnabled && schedule.kind !== 'asNeeded') await requestReminderPermission().catch(() => false);
    router.back();
  };

  return (
    <Screen modal title={existing ? 'Edit protocol' : 'New protocol'} footer={picking ? undefined : <Button title={existing ? 'Save changes' : 'Create protocol'} onPress={save} />}>
      <Section title="Compound">
        {picking ? (
          <CompoundPicker
            onPick={pickCompound}
            onCustom={(n) => {
              setCompound(null);
              setTemplateId(undefined);
              setName(n);
              setPicking(false);
            }}
          />
        ) : (
          <Card>
            <HStack style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T variant="heading">{name}</T>
                <T variant="small" tone="soft">
                  {compound ? compound.summary : 'Custom compound — not in the library, so no interaction or level data.'}
                </T>
              </View>
              <Button title="Change" kind="ghost" small onPress={() => setPicking(true)} />
            </HStack>
          </Card>
        )}
      </Section>

      {!picking && (
        <>
          {templates.length > 0 ? (
            <Section title="Start from a protocol">
              {templates.map((t) => (
                <TemplateOption key={t.id} template={t} selected={templateId === t.id} onPress={() => applyTemplate(t)} />
              ))}
              <T variant="small" tone="faint">
                Fills in the dose, titration, schedule, cycle and end date. Adjust anything below.
              </T>
            </Section>
          ) : null}

          <Section title="Route">
            <HStack wrap>
              {routes.map((r) => (
                <Chip key={r} label={ROUTE_LABEL[r]} selected={route === r} onPress={() => setRoute(r)} />
              ))}
            </HStack>
          </Section>

          <Section title="Dose">
            <HStack style={{ justifyContent: 'space-between', marginBottom: space.md }}>
              <T tone="soft">Unit</T>
              <UnitPicker value={unit} onChange={setUnit} />
            </HStack>
            {!useTitration ? <NumberField value={dose} onChangeText={setDose} placeholder="Dose per administration" suffix={unit === 'iu' ? 'IU' : unit} /> : null}
            <Card style={{ paddingVertical: space.xs }}>
              <ToggleRow title="Titration steps" subtitle="Hold each dose for a number of weeks, then step to the next. The last step continues." value={useTitration} onChange={setUseTitration} />
            </Card>
            {useTitration ? (
              <View style={{ marginTop: space.md }}>
                {steps.map((s, i) => (
                  <HStack key={i} style={{ alignItems: 'flex-start' }}>
                    <T variant="smallStrong" tone="soft" style={{ width: 52, marginTop: 14 }}>
                      Step {i + 1}
                    </T>
                    <NumberField value={s.dose} onChangeText={(v) => setSteps(steps.map((x, j) => (j === i ? { ...x, dose: v } : x)))} placeholder="Dose" suffix={unit === 'iu' ? 'IU' : unit} style={{ flex: 1 }} />
                    <NumberField value={s.weeks} onChangeText={(v) => setSteps(steps.map((x, j) => (j === i ? { ...x, weeks: v } : x)))} placeholder="Weeks" suffix="wk" style={{ width: 96 }} />
                    <Pressable accessibilityLabel={`Remove step ${i + 1}`} onPress={() => setSteps(steps.filter((_, j) => j !== i))} style={{ padding: 12 }} disabled={steps.length <= 1}>
                      <X size={18} color={steps.length <= 1 ? c.border : c.inkFaint} />
                    </Pressable>
                  </HStack>
                ))}
                <Button title="Add step" kind="ghost" small icon={<Plus size={16} color={c.accent} />} onPress={() => setSteps([...steps, { weeks: '4', dose: '' }])} style={{ alignSelf: 'flex-start' }} />
              </View>
            ) : null}
          </Section>

          <Section title="Schedule">
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekdays', label: 'Weekdays' },
                { value: 'everyNDays', label: 'Every N days' },
                { value: 'asNeeded', label: 'As needed' },
              ]}
              style={{ marginBottom: space.lg }}
            />
            {kind === 'daily' ? (
              <View>
                {times.map((t, i) => (
                  <HStack key={i} style={{ alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <TimeField label={times.length > 1 ? `Time ${i + 1}` : 'Time'} value={t} onChange={(v) => setTimes(times.map((x, j) => (j === i ? v : x)))} />
                    </View>
                    {times.length > 1 ? (
                      <Pressable accessibilityLabel="Remove time" onPress={() => setTimes(times.filter((_, j) => j !== i))} style={{ padding: 12, marginTop: 26 }}>
                        <Minus size={18} color={c.inkFaint} />
                      </Pressable>
                    ) : null}
                  </HStack>
                ))}
                {times.length < 4 ? <Button title="Add a time" kind="ghost" small icon={<Plus size={16} color={c.accent} />} onPress={() => setTimes([...times, '20:00'])} style={{ alignSelf: 'flex-start' }} /> : null}
              </View>
            ) : null}
            {kind === 'weekdays' ? (
              <>
                <DayPicker value={days} onChange={setDays} />
                <TimeField label="Time" value={time} onChange={setTime} />
              </>
            ) : null}
            {kind === 'everyNDays' ? (
              <HStack style={{ alignItems: 'flex-start' }}>
                <NumberField label="Every" value={everyN} onChangeText={setEveryN} suffix="days" style={{ flex: 1 }} />
                <View style={{ flex: 1 }}>
                  <TimeField label="Time" value={time} onChange={setTime} />
                </View>
              </HStack>
            ) : null}
            {kind === 'asNeeded' ? <T tone="soft">No reminders. Log doses when you take them.</T> : null}

            <Card style={{ paddingVertical: space.xs, marginTop: space.sm }}>
              <ToggleRow title="On / off cycle" subtitle="Pause scheduling for off-weeks." value={useCycle} onChange={setUseCycle} />
            </Card>
            {useCycle ? (
              <HStack style={{ marginTop: space.md }}>
                <NumberField label="Weeks on" value={onWeeks} onChangeText={setOnWeeks} style={{ flex: 1 }} />
                <NumberField label="Weeks off" value={offWeeks} onChangeText={setOffWeeks} style={{ flex: 1 }} />
              </HStack>
            ) : null}
          </Section>

          <Section title="Dates">
            <DateField label="Start" value={startDate} onChange={setStartDate} />
            <DateField label="End" value={endDate} onChange={setEndDate} optional />
          </Section>

          <Section title="Inventory">
            {compatibleInventory.length === 0 ? (
              <T tone="soft">Add a vial in Inventory to have doses deducted automatically and see when it runs out.</T>
            ) : (
              <OptionList
                value={inventoryId}
                onChange={setInventoryId}
                options={[{ value: '', label: 'Not linked' }, ...compatibleInventory.map((i) => ({ value: i.id, label: i.name, hint: [i.vendor, i.batch].filter(Boolean).join(' · ') || undefined }))]}
              />
            )}
          </Section>

          <Section title="Reminders & notes">
            <Card style={{ paddingVertical: space.xs, marginBottom: space.md }}>
              <ToggleRow title="Remind me" subtitle={remindersEnabled ? 'A notification at each scheduled time.' : 'Reminders are off in Settings.'} value={reminders} onChange={setReminders} />
            </Card>
            <Field value={notes} onChangeText={setNotes} placeholder="Notes (prescriber, purpose, anything)" multiline />
          </Section>

          {error ? <Notice tone="danger">{error}</Notice> : null}

          {existing ? (
            <Section title="Manage" style={{ marginTop: space.xl }}>
              <HStack wrap>
                {existing.status !== 'active' ? <Button title="Resume" kind="secondary" small onPress={() => (upsertProtocol({ ...existing, status: 'active' }), router.back())} /> : null}
                {existing.status === 'active' ? <Button title="Pause" kind="secondary" small onPress={() => (upsertProtocol({ ...existing, status: 'paused' }), router.back())} /> : null}
                {existing.status !== 'completed' ? <Button title="Mark complete" kind="secondary" small onPress={() => (upsertProtocol({ ...existing, status: 'completed', endDate: existing.endDate ?? format(new Date(), 'yyyy-MM-dd') }), router.back())} /> : null}
                <Button
                  title="Delete"
                  kind="danger"
                  small
                  onPress={() => {
                    deleteProtocol(existing.id);
                    router.dismissTo('/protocols');
                  }}
                />
              </HStack>
              <T variant="small" tone="faint" style={{ marginTop: space.sm }}>
                Deleting keeps your dose history.
              </T>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
