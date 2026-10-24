import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, TextInput, View, type KeyboardTypeOptions, type ViewStyle } from 'react-native';

import { T } from './text';
import { fonts, radius, space, useTheme } from './theme';

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
  full?: boolean;
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, loading, small, style, full }: ButtonProps) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.dangerSoft : kind === 'secondary' ? c.surface : 'transparent';
  const fg = kind === 'primary' ? c.accentInk : kind === 'danger' ? c.danger : kind === 'secondary' ? c.ink : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        full && { alignSelf: 'stretch' },
        { backgroundColor: bg, borderColor: kind === 'secondary' ? c.border : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <T variant={small ? 'smallStrong' : 'bodyStrong'} style={{ color: fg }}>
        {title}
      </T>
    </Pressable>
  );
}

export function Segmented<V extends string>({ options, value, onChange, style }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: c.surfaceAlt }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segmentItem, on && { backgroundColor: c.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
            <T variant="smallStrong" tone={on ? 'ink' : 'soft'} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  suffix?: ReactNode;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  hint?: string;
  error?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export function Field({ label, value, onChangeText, placeholder, suffix, keyboardType, multiline, hint, error, style, autoFocus }: FieldProps) {
  const { c } = useTheme();
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {label ? (
        <T variant="smallStrong" tone="soft" style={{ marginBottom: 6 }}>
          {label}
        </T>
      ) : null}
      <View style={[styles.field, { backgroundColor: c.surface, borderColor: error ? c.danger : c.border }, multiline && { alignItems: 'flex-start', minHeight: 88 }]}>
        <TextInput
          accessibilityLabel={label ?? placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.inkFaint}
          keyboardType={keyboardType}
          multiline={multiline}
          autoFocus={autoFocus}
          style={[styles.input, { color: c.ink, fontFamily: fonts.regular }, multiline && { textAlignVertical: 'top', paddingTop: 10 }]}
        />
        {suffix ? <View style={{ marginLeft: space.sm }}>{typeof suffix === 'string' ? <T tone="faint">{suffix}</T> : suffix}</View> : null}
      </View>
      {error ? (
        <T variant="small" tone="danger" style={{ marginTop: 4 }}>
          {error}
        </T>
      ) : hint ? (
        <T variant="small" tone="faint" style={{ marginTop: 4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/** Numeric text field that reports a parsed number (NaN when blank or invalid). */
export function NumberField(props: Omit<FieldProps, 'keyboardType'>) {
  return <Field {...props} keyboardType="decimal-pad" onChangeText={(s) => props.onChangeText(s.replace(',', '.'))} />;
}

export function num(s: string): number {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : NaN;
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.ink : c.surface, borderColor: selected ? c.ink : c.border, opacity: pressed ? 0.75 : 1 },
      ]}>
      {icon}
      <T variant="smallStrong" style={{ color: selected ? c.bg : c.ink }}>
        {label}
      </T>
    </Pressable>
  );
}

export function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: space.md }}>
        <T variant="bodyStrong">{title}</T>
        {subtitle ? (
          <T variant="small" tone="soft">
            {subtitle}
          </T>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.surfaceAlt }} thumbColor={Platform.OS === 'android' ? c.surface : undefined} />
    </View>
  );
}

/** Small labelled option list (radio style). */
export function OptionList<V extends string>({ options, value, onChange }: { options: { value: V; label: string; hint?: string }[]; value: V; onChange: (v: V) => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.optionList, { borderColor: c.border, backgroundColor: c.surface }]}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.option, i < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{o.label}</T>
              {o.hint ? (
                <T variant="small" tone="soft">
                  {o.hint}
                </T>
              ) : null}
            </View>
            <View style={[styles.radio, { borderColor: on ? c.accent : c.border }]}>{on ? <View style={[styles.radioDot, { backgroundColor: c.accent }]} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.sm },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.sm + 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: Platform.OS === 'web' ? 12 : 10, outlineStyle: 'none' } as never,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  optionList: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, paddingHorizontal: space.lg },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
