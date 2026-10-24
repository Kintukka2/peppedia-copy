import { Image } from 'expo-image';
import { FlaskConical, Minus, Pill, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { AmountUnit, InventoryForm, SyringeId } from '@/domain/model';
import { SYRINGES, trim, UNITS_PER_ML } from '@/domain/units';
import { Button, Chip, num, NumberField } from '@/ui/controls';
import { Gap, HStack, IconButton } from '@/ui/layout';
import { UnitPicker } from '@/ui/pickers';
import { SyringeGauge } from '@/ui/syringe';
import { T } from '@/ui/text';
import { radius, space, useTheme } from '@/ui/theme';

import { SYRINGE_SHORT, unitsText } from './format';

export function Thumb({ uri, form, size = 44 }: { uri?: string; form: InventoryForm; size?: number }) {
  const { c } = useTheme();
  const box = { width: size, height: size, borderRadius: size >= 64 ? radius.md : 12 };
  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: c.surfaceAlt }]} contentFit="cover" transition={150} accessibilityLabel="Vial photo" />;
  const Icon = form === 'oral' ? Pill : FlaskConical;
  return (
    <View style={[box, { backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }]}>
      <Icon size={Math.round(size * 0.45)} color={c.accent} />
    </View>
  );
}

/** Horizontal fill bar, 0–1. */
export function Meter({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { c } = useTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? (v < 0.15 ? c.warn : c.accent) }} />
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, label }: { value: number; onChange: (n: number) => void; min?: number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <IconButton label={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - 1))}>
        <Minus size={18} color={value <= min ? c.border : c.ink} />
      </IconButton>
      <T variant="heading" tabular style={{ minWidth: 36, textAlign: 'center' }}>
        {value}
      </T>
      <IconButton label={`Increase ${label}`} onPress={() => onChange(value + 1)}>
        <Plus size={18} color={c.ink} />
      </IconButton>
    </View>
  );
}

/** Number field with a unit switch beside it. */
export function AmountInput({
  label,
  value,
  onChangeText,
  unit,
  onUnit,
  units,
  placeholder,
  hint,
  error,
}: {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  unit: AmountUnit;
  onUnit: (u: AmountUnit) => void;
  units?: AmountUnit[];
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <View>
      {label ? (
        <T variant="smallStrong" tone="soft" style={{ marginBottom: 6 }}>
          {label}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
        <NumberField value={value} onChangeText={onChangeText} placeholder={placeholder} hint={hint} error={error} style={{ flex: 1, marginBottom: space.sm }} />
        <View style={{ marginTop: 4 }}>
          <UnitPicker value={unit} onChange={onUnit} units={units} />
        </View>
      </View>
    </View>
  );
}

/** Row of preset values under a field. */
export function QuickChips({ values, suffix, current, onPick, active = true }: { values: number[]; suffix: string; current: string; onPick: (s: string) => void; active?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
      {values.map((v) => (
        <Chip key={v} label={`${v} ${suffix}`} selected={active && num(current) === v} onPress={() => onPick(String(v))} />
      ))}
    </View>
  );
}

/** Inline replacement for a confirm dialog (Alert does not work on web). */
export function InlineConfirm({ message, confirm, onConfirm, onCancel, danger = true, children }: { message: string; confirm: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: space.md, borderRadius: radius.md, backgroundColor: danger ? c.dangerSoft : c.surfaceAlt, gap: space.md }}>
      <T variant="small" tone={danger ? 'danger' : 'soft'}>
        {message}
      </T>
      {children}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title={confirm} kind={danger ? 'danger' : 'primary'} small onPress={onConfirm} style={danger ? { backgroundColor: c.surface } : undefined} />
        <Button title="Cancel" kind="ghost" small onPress={onCancel} />
      </View>
    </View>
  );
}

/** Headline draw in the syringe's own scale, the other scale beside it, and the filled barrel. */
export function DrawReadout({ volumeMl, syringe, active = true }: { volumeMl: number; syringe: SyringeId; active?: boolean }) {
  const spec = SYRINGES[syringe];
  const units = volumeMl * UNITS_PER_ML;
  const byUnits = spec.scale === 'units';
  return (
    <View style={{ marginTop: space.lg }}>
      <HStack gap={6} wrap style={{ alignItems: 'baseline' }}>
        <T tone="soft">Draw</T>
        <T variant="title" tabular>
          {byUnits ? unitsText(units) : `${trim(volumeMl, 2)} mL`}
        </T>
        <T tone="soft" tabular>
          {byUnits ? `${trim(volumeMl, 3)} mL` : `${unitsText(units)} on a U-100 scale`}
        </T>
      </HStack>
      <Gap size={space.sm} />
      {/* Hidden panels skip the gauge: it measures 0 wide under display:none. */}
      {active ? <SyringeGauge volumeMl={volumeMl} syringe={syringe} /> : null}
      <T variant="small" tone="faint">
        {spec.label}
      </T>
    </View>
  );
}

export function SyringeChips({ value, onChange }: { value: SyringeId; onChange: (s: SyringeId) => void }) {
  return (
    <HStack wrap>
      {(Object.keys(SYRINGES) as SyringeId[]).map((id) => (
        <Chip key={id} label={SYRINGE_SHORT[id]} selected={value === id} onPress={() => onChange(id)} />
      ))}
    </HStack>
  );
}
