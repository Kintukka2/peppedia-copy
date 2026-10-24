import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { dayKey, parseDay } from '@/domain/schedule';
import { COMMON_SYMPTOMS } from '@/features/health/checkin';
import { ScalePicker } from '@/features/health/components';
import { dayLabel } from '@/lib/format';
import { uid, useStore } from '@/store';
import { Button, Chip, Field } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { HStack, Screen, Section } from '@/ui/layout';
import { DATE_RE } from '@/ui/pickers';
import { T } from '@/ui/text';
import { space } from '@/ui/theme';

function resolveDate(param: string | undefined): string {
  if (param && DATE_RE.test(param) && dayKey(parseDay(param)) === param) return param;
  return dayKey(new Date());
}

function tidy(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function CheckIn() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = resolveDate(params.date);
  const journal = useStore((s) => s.journal);
  const upsertJournal = useStore((s) => s.upsertJournal);
  const existing = useMemo(() => journal.find((j) => j.date === date), [journal, date]);

  const [mood, setMood] = useState<number | undefined>(existing?.mood);
  const [energy, setEnergy] = useState<number | undefined>(existing?.energy);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [extra, setExtra] = useState<string[]>(() => (existing?.symptoms ?? []).filter((s) => !COMMON_SYMPTOMS.includes(s)));
  const [custom, setCustom] = useState('');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const day = parseDay(date);
  const options = [...COMMON_SYMPTOMS, ...extra];

  const toggle = (s: string) => setSymptoms(symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s]);

  const addCustom = () => {
    const name = tidy(custom);
    if (!name) return;
    const match = options.find((o) => o.toLowerCase() === name.toLowerCase());
    if (!match) setExtra([...extra, name]);
    const value = match ?? name;
    if (!symptoms.includes(value)) setSymptoms([...symptoms, value]);
    setCustom('');
  };

  const save = () => {
    const trimmedNotes = notes.trim();
    if (!mood && !energy && symptoms.length === 0 && !trimmedNotes) return setError('Add a mood, energy level, symptom or note.');
    upsertJournal({
      id: existing?.id ?? uid(),
      date,
      ...(mood ? { mood } : {}),
      ...(energy ? { energy } : {}),
      symptoms: options.filter((o) => symptoms.includes(o)),
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    });
    if (router.canGoBack()) router.back();
    else router.replace('/journal');
  };

  return (
    <Screen modal title={existing ? 'Edit check-in' : 'Check-in'} footer={<Button title="Save check-in" onPress={save} />}>
      <View style={{ marginBottom: space.xxl }}>
        <T variant="title">{dayLabel(day)}</T>
        <T tone="soft">{format(day, 'EEEE d MMMM yyyy')}</T>
      </View>

      <Section title="Mood">
        <ScalePicker label="Mood" value={mood} onChange={setMood} />
      </Section>

      <Section title="Energy">
        <ScalePicker label="Energy" value={energy} onChange={setEnergy} />
      </Section>

      <Section title="Symptoms">
        <HStack wrap style={{ marginBottom: space.md }}>
          {options.map((s) => (
            <Chip key={s} label={s} selected={symptoms.includes(s)} onPress={() => toggle(s)} />
          ))}
        </HStack>
        <Field
          value={custom}
          onChangeText={setCustom}
          placeholder="Add another symptom"
          suffix={<Button title="Add" kind="ghost" small onPress={addCustom} disabled={!custom.trim()} style={{ marginRight: -space.sm }} />}
        />
      </Section>

      <Section title="Notes">
        <Field value={notes} onChangeText={setNotes} placeholder="Anything worth remembering: sleep, meals, timing" multiline />
      </Section>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      <T variant="small" tone="faint" style={{ marginTop: error ? space.md : 0 }}>
        If a symptom is severe or doesn’t settle, contact a clinician.
      </T>
    </Screen>
  );
}
