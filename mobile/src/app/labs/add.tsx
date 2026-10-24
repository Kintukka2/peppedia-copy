import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BIOMARKER_BY_ID, BIOMARKERS, MARKER_GROUP_LABEL, rangeFor } from '@/data/biomarkers';
import type { LabResult } from '@/domain/model';
import { formatRange, GROUP_ORDER, normaliseQuery, parseRange } from '@/features/health/labs';
import { useStore } from '@/store';
import { Button, Chip, Field, num, NumberField } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { isValidDay, DateField } from '@/ui/pickers';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

interface Draft {
  markerId: string;
  value: string;
  range: string;
  showRange: boolean;
}

const blank = (markerId: string): Draft => ({ markerId, value: '', range: '', showRange: false });

export default function AddLabs() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ marker?: string }>();
  const sex = useStore((s) => s.settings.sex);
  const addLab = useStore((s) => s.addLab);

  const initial = params.marker && BIOMARKER_BY_ID[params.marker] ? [blank(params.marker)] : [];
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [labName, setLabName] = useState('');
  const [rows, setRows] = useState<Draft[]>(initial);
  const [picking, setPicking] = useState(initial.length === 0);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const added = useMemo(() => new Set(rows.map((r) => r.markerId)), [rows]);
  const groups = useMemo(() => {
    const n = normaliseQuery(q);
    const list = n ? BIOMARKERS.filter((b) => [b.name, b.id, MARKER_GROUP_LABEL[b.group]].some((s) => normaliseQuery(s).includes(n))) : BIOMARKERS;
    return GROUP_ORDER.map((g) => ({ group: g, items: list.filter((b) => b.group === g) })).filter((g) => g.items.length > 0);
  }, [q]);

  const toggle = (id: string) => setRows(added.has(id) ? rows.filter((r) => r.markerId !== id) : [...rows, blank(id)]);
  const patch = (id: string, p: Partial<Draft>) => setRows(rows.map((r) => (r.markerId === id ? { ...r, ...p } : r)));

  const save = () => {
    setError(null);
    if (!isValidDay(date)) return setError('Date must be a real date in YYYY-MM-DD.');
    if (date > format(new Date(), 'yyyy-MM-dd')) return setError('The date is in the future.');
    if (rows.length === 0) return setError('Add at least one marker.');
    const out: Omit<LabResult, 'id'>[] = [];
    for (const r of rows) {
      const m = BIOMARKER_BY_ID[r.markerId];
      const value = num(r.value);
      if (!Number.isFinite(value)) return setError(`Enter a value for ${m.name}.`);
      const range = parseRange(r.range);
      if (!range) return setError(`${m.name}: enter the report range as low–high (e.g. 264–916), < high, or > low.`);
      out.push({
        date,
        markerId: r.markerId,
        value,
        ...(range.low !== undefined ? { refLow: range.low } : {}),
        ...(range.high !== undefined ? { refHigh: range.high } : {}),
        ...(labName.trim() ? { labName: labName.trim() } : {}),
      });
    }
    for (const r of out) addLab(r);
    if (router.canGoBack()) router.back();
    else router.replace('/labs');
  };

  return (
    <Screen modal title="Add lab results" footer={<Button title={rows.length > 1 ? `Save ${rows.length} results` : 'Save result'} onPress={save} />}>
      <Section title="Report">
        <DateField label="Sample date" value={date} onChange={setDate} />
        <Field label="Lab" value={labName} onChangeText={setLabName} placeholder="Optional, e.g. Quest" />
      </Section>

      <Section title="Results">
        {rows.map((r) => {
          const m = BIOMARKER_BY_ID[r.markerId];
          const typical = rangeFor(m, sex);
          return (
            <Card key={r.markerId} style={{ marginBottom: space.md, paddingBottom: space.sm }}>
              <HStack style={{ alignItems: 'flex-start', marginBottom: space.sm }}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{m.name}</T>
                  <T variant="small" tone="soft">
                    {typical.low === undefined && typical.high === undefined ? m.unit : `Typical ${formatRange(typical, m.unit)}`}
                  </T>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.name}`} onPress={() => toggle(r.markerId)} hitSlop={8} style={{ padding: 4 }}>
                  <X size={18} color={c.inkFaint} />
                </Pressable>
              </HStack>
              <NumberField value={r.value} onChangeText={(v) => patch(r.markerId, { value: v })} placeholder={`Value in ${m.unit}`} />
              {r.showRange ? (
                <Field
                  label="Range on your report"
                  value={r.range}
                  onChangeText={(v) => patch(r.markerId, { range: v })}
                  placeholder="e.g. 264–916, < 200 or > 40"
                  keyboardType="numbers-and-punctuation"
                  hint="Used instead of the typical range for this result."
                />
              ) : (
                <Button title="Add range from report" kind="ghost" small onPress={() => patch(r.markerId, { showRange: true })} style={{ alignSelf: 'flex-start', marginTop: -space.xs, marginLeft: -space.md }} />
              )}
            </Card>
          );
        })}

        {picking ? (
          <Card>
            <Field value={q} onChangeText={setQ} placeholder="Search markers" suffix={<Search size={18} color={c.inkFaint} />} />
            {groups.length === 0 ? (
              <T tone="soft" style={{ marginBottom: space.md }}>
                No marker matches “{q.trim()}”.
              </T>
            ) : (
              groups.map(({ group, items }) => (
                <View key={group} style={{ marginBottom: space.md }}>
                  <T variant="micro" tone="soft" style={{ marginBottom: space.sm }}>
                    {MARKER_GROUP_LABEL[group]}
                  </T>
                  <HStack wrap>
                    {items.map((b) => (
                      <Chip key={b.id} label={b.name} selected={added.has(b.id)} onPress={() => toggle(b.id)} />
                    ))}
                  </HStack>
                </View>
              ))
            )}
            {rows.length > 0 ? <Button title="Done" kind="secondary" small onPress={() => setPicking(false)} style={{ alignSelf: 'flex-start' }} /> : null}
          </Card>
        ) : (
          <Button title="Add marker" kind="ghost" small icon={<Plus size={16} color={c.accent} />} onPress={() => setPicking(true)} style={{ alignSelf: 'flex-start' }} />
        )}
      </Section>

      {error ? (
        <Notice tone="danger" title="Check these results">
          {error}
        </Notice>
      ) : null}
    </Screen>
  );
}
