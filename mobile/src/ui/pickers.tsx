import { addDays, format } from 'date-fns';
import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_LABEL, COMPOUND_BY_ID, searchCompounds } from '@/data/library';
import type { Compound } from '@/data/types';
import type { AmountUnit } from '@/domain/model';
import { useStore } from '@/store';

import { Chip, Field, Segmented, tap } from './controls';
import { STATUS_LABEL, STATUS_TONE, Badge } from './feedback';
import { T } from './text';
import { radius, space, useTheme } from './theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.md }}>
      {DAY_LETTERS.map((d, i) => {
        const on = value.includes(i);
        return (
          <Pressable
            key={i}
            accessibilityRole="checkbox"
            accessibilityLabel={DAY_NAMES[i]}
            accessibilityState={{ checked: on }}
            onPress={() => {
              tap();
              onChange(on ? value.filter((x) => x !== i) : [...value, i].sort());
            }}
            style={[styles.day, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.border }]}>
            <T variant="smallStrong" style={{ color: on ? c.accentInk : c.ink }}>
              {d}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function TimeField({ label, value, onChange }: { label?: string; value: string; onChange: (s: string) => void }) {
  return <Field label={label} value={value} onChangeText={onChange} placeholder="08:00" keyboardType="numbers-and-punctuation" error={value && !TIME_RE.test(value) ? 'Use 24-hour HH:MM' : undefined} />;
}

export function DateField({ label, value, onChange, optional, future = true }: { label: string; value: string; onChange: (s: string) => void; optional?: boolean; future?: boolean }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const valid = !value || (DATE_RE.test(value) && !Number.isNaN(new Date(value + 'T00:00:00').getTime()));
  return (
    <View>
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={optional ? 'Optional · YYYY-MM-DD' : 'YYYY-MM-DD'}
        keyboardType="numbers-and-punctuation"
        error={valid ? undefined : 'Use YYYY-MM-DD'}
        style={{ marginBottom: space.sm }}
      />
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
        <Chip label="Today" selected={value === today} onPress={() => onChange(today)} />
        {future ? (
          <Chip label="Tomorrow" selected={value === format(addDays(new Date(), 1), 'yyyy-MM-dd')} onPress={() => onChange(format(addDays(new Date(), 1), 'yyyy-MM-dd'))} />
        ) : (
          <Chip label="Yesterday" selected={value === format(addDays(new Date(), -1), 'yyyy-MM-dd')} onPress={() => onChange(format(addDays(new Date(), -1), 'yyyy-MM-dd'))} />
        )}
        {optional && value ? <Chip label="Clear" onPress={() => onChange('')} /> : null}
      </View>
    </View>
  );
}

export function UnitPicker({ value, onChange, units = ['mcg', 'mg', 'iu'] }: { value: AmountUnit; onChange: (u: AmountUnit) => void; units?: AmountUnit[] }) {
  return <Segmented value={value} onChange={onChange} options={units.map((u) => ({ value: u, label: u === 'iu' ? 'IU' : u }))} style={{ width: 150 }} />;
}

/** Search the library and pick a compound, or fall back to a custom name. */
export function CompoundPicker({ onPick, onCustom }: { onPick: (c: Compound) => void; onCustom?: (name: string) => void }) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const bookmarks = useStore((s) => s.bookmarks);
  const results = useMemo(() => {
    if (q) return searchCompounds(q).slice(0, 8);
    // Saved compounds first, then approved medicines, so the empty state is useful.
    const saved = bookmarks.map((id) => COMPOUND_BY_ID[id]).filter((x): x is Compound => !!x);
    const rest = searchCompounds('').filter((x) => !bookmarks.includes(x.id) && x.regulatory.status === 'approved');
    return [...saved, ...rest].slice(0, 6);
  }, [q, bookmarks]);
  return (
    <View>
      <Field value={q} onChangeText={setQ} placeholder="Search 50+ compounds" suffix={<Search size={18} color={c.inkFaint} />} autoFocus />
      <View style={[styles.results, { borderColor: c.border, backgroundColor: c.surface }]}>
        {results.map((r, i) => (
          <Pressable
            key={r.id}
            onPress={() => {
              tap();
              onPick(r);
            }}
            style={({ pressed }) => [styles.result, i < results.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }, pressed && { opacity: 0.6 }]}>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{r.name}</T>
              <T variant="small" tone="soft" numberOfLines={1}>
                {CATEGORY_LABEL[r.category]}
                {r.aliases.length ? ` · ${r.aliases.slice(0, 2).join(', ')}` : ''}
              </T>
            </View>
            <Badge label={STATUS_LABEL[r.regulatory.status]} tone={STATUS_TONE[r.regulatory.status]} />
          </Pressable>
        ))}
        {onCustom && q.trim().length > 1 ? (
          <Pressable onPress={() => onCustom(q.trim())} style={[styles.result, { borderTopWidth: results.length ? StyleSheet.hairlineWidth : 0, borderTopColor: c.border }]}>
            <T variant="bodyStrong" tone="accent">
              Use “{q.trim()}” as a custom compound
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  results: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, paddingHorizontal: space.lg, marginBottom: space.md },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
});
