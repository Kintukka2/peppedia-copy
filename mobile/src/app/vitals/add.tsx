import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import type { VitalKind } from '@/domain/model';
import { atLocal, dateTimeLabel, formatNumber } from '@/features/health/format';
import { entriesOf, formatVital, isVitalKind, toDisplay, toStorage, unitFor, VITAL_KINDS, VITAL_META } from '@/features/health/vitals';
import { useStore } from '@/store';
import { Button, Chip, num, NumberField } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { HStack, Screen, Section } from '@/ui/layout';
import { DATE_RE, DateField, TIME_RE, TimeField } from '@/ui/pickers';

export default function AddVital() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const vitals = useStore((s) => s.vitals);
  const weightUnit = useStore((s) => s.settings.weightUnit);
  const addVital = useStore((s) => s.addVital);

  const [kind, setKind] = useState<VitalKind>(isVitalKind(params.kind) ? params.kind : 'weight');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(() => format(new Date(), 'HH:mm'));
  const [error, setError] = useState<string | null>(null);

  const meta = VITAL_META[kind];
  const unit = unitFor(kind, weightUnit);
  const last = useMemo(() => {
    const list = entriesOf(vitals, kind);
    return list.length ? list[list.length - 1] : undefined;
  }, [vitals, kind]);
  const lastHint = last ? `Last: ${formatVital(last, weightUnit)} ${unit} · ${dateTimeLabel(new Date(last.t))}` : undefined;

  const bounds = (min: number, max: number) => `${formatNumber(toDisplay(kind, min, weightUnit), 0)}–${formatNumber(toDisplay(kind, max, weightUnit), 0)} ${unit}`;

  const pickKind = (k: VitalKind) => {
    setKind(k);
    setValue('');
    setValue2('');
    setError(null);
  };

  const save = () => {
    setError(null);
    const raw = num(value);
    if (!Number.isFinite(raw)) return setError(kind === 'bloodPressure' ? 'Enter the systolic (upper) number.' : `Enter a value in ${unit}.`);
    const stored = toStorage(kind, raw, weightUnit);
    if (stored < meta.min || stored > meta.max) return setError(`That looks out of range. Enter a value between ${bounds(meta.min, meta.max)}.`);

    let stored2: number | undefined;
    if (kind === 'bloodPressure') {
      const raw2 = num(value2);
      if (!Number.isFinite(raw2)) return setError('Enter the diastolic (lower) number.');
      stored2 = Math.round(raw2);
      if (stored2 < meta.min2! || stored2 > meta.max2!) return setError(`That diastolic value looks out of range. Enter ${bounds(meta.min2!, meta.max2!)}.`);
      if (stored2 >= stored) return setError('Diastolic should be lower than systolic. Check the order.');
    }

    if (!DATE_RE.test(date)) return setError('Date must be YYYY-MM-DD.');
    if (!TIME_RE.test(time)) return setError('Time must be HH:MM.');
    const at = atLocal(date, time);
    if (Number.isNaN(at.getTime())) return setError('Enter a valid date.');
    if (at.getTime() > Date.now() + 5 * 60_000) return setError('The date and time are in the future.');

    addVital({ kind, value: stored, ...(stored2 !== undefined ? { value2: stored2 } : {}), at: at.toISOString() });
    if (router.canGoBack()) router.back();
    else router.replace(`/vitals?kind=${kind}`);
  };

  return (
    <Screen modal title={`Add ${meta.name}`} footer={<Button title="Save" onPress={save} />}>
      <Section title="Measurement">
        <HStack wrap>
          {VITAL_KINDS.map((k) => (
            <Chip key={k} label={VITAL_META[k].label} selected={k === kind} onPress={() => pickKind(k)} />
          ))}
        </HStack>
      </Section>

      <Section title="Value">
        {kind === 'bloodPressure' ? (
          <>
            <NumberField label="Systolic (upper number)" value={value} onChangeText={setValue} suffix="mmHg" autoFocus />
            <NumberField label="Diastolic (lower number)" value={value2} onChangeText={setValue2} suffix="mmHg" />
            {lastHint ? <Notice>{lastHint}</Notice> : null}
          </>
        ) : (
          <NumberField
            key={kind}
            value={value}
            onChangeText={setValue}
            placeholder={meta.label}
            suffix={unit}
            hint={lastHint ?? (kind === 'weight' ? `In ${weightUnit}. Change units in Settings.` : meta.hint)}
            autoFocus
          />
        )}
      </Section>

      <Section title="When">
        <DateField label="Date" value={date} onChange={setDate} future={false} />
        <TimeField label="Time" value={time} onChange={setTime} />
      </Section>

      {error ? (
        <Notice tone="danger" title="Check this entry">
          {error}
        </Notice>
      ) : null}
    </Screen>
  );
}
