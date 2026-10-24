import { Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, tap } from '@/ui/controls';
import { T } from '@/ui/text';
import { radius, space, useTheme } from '@/ui/theme';

import { SCALE_LABELS } from './checkin';

export function TrashButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.trash, pressed && { opacity: 0.5 }]}>
      <Trash2 size={17} color={c.inkFaint} />
    </Pressable>
  );
}

/** Inline confirmation in place of a native alert (which doesn't work on web). */
export function ConfirmBar({ message, onCancel, onConfirm, confirmLabel = 'Delete' }: { message: string; onCancel: () => void; onConfirm: () => void; confirmLabel?: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.confirm, { backgroundColor: c.surfaceAlt }]}>
      <T variant="small" style={{ flexGrow: 1, flexBasis: 160, flexShrink: 1 }}>
        {message}
      </T>
      <View style={{ flexDirection: 'row', gap: space.sm, marginLeft: 'auto' }}>
        <Button title="Cancel" kind="secondary" small onPress={onCancel} />
        <Button title={confirmLabel} kind="danger" small onPress={onConfirm} />
      </View>
    </View>
  );
}

/** Five tappable circles for a 1–5 rating. Tapping the current value clears it. */
export function ScalePicker({ value, onChange, label }: { value?: number; onChange: (v: number | undefined) => void; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {SCALE_LABELS.map((name, i) => {
        const v = i + 1;
        const on = value === v;
        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${name}`}
            accessibilityState={{ checked: on }}
            onPress={() => {
              tap();
              onChange(on ? undefined : v);
            }}
            style={({ pressed }) => [styles.scaleItem, pressed && { opacity: 0.7 }]}>
            <View style={[styles.scaleCircle, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.border }]}>
              <T variant="bodyStrong" style={{ color: on ? c.accentInk : c.inkSoft }}>
                {v}
              </T>
            </View>
            <T variant="small" tone={on ? 'ink' : 'soft'} style={{ marginTop: 6 }} numberOfLines={1}>
              {name}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Read-only 1–5 rating as a row of dots. */
export function ScaleDots({ label, value }: { label: string; value: number }) {
  const { c } = useTheme();
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 136 }} accessibilityLabel={`${label} ${n} of 5, ${SCALE_LABELS[n - 1] ?? ''}`}>
      <T variant="small" tone="faint">
        {label}
      </T>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i <= n ? c.accent : c.surfaceAlt }} />
        ))}
      </View>
      <T variant="smallStrong" tone="soft">
        {SCALE_LABELS[n - 1] ?? '—'}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  trash: { padding: 6, borderRadius: radius.sm },
  confirm: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, padding: space.sm, paddingLeft: space.md, borderRadius: radius.md, marginBottom: space.sm },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleItem: { flex: 1, alignItems: 'center' },
  scaleCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
