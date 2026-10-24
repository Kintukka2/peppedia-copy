import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import type { SyringeId } from '@/domain/model';
import { SYRINGES, UNITS_PER_ML } from '@/domain/units';

import { fonts, useTheme } from './theme';

/** Horizontal syringe barrel filled to the draw volume. */
export function SyringeGauge({ volumeMl, syringe, height = 64 }: { volumeMl: number; syringe: SyringeId; height?: number }) {
  const { c } = useTheme();
  const [w, setW] = useState(300);
  const spec = SYRINGES[syringe];
  const units = spec.scale === 'units';
  const max = units ? spec.capacityMl * UNITS_PER_ML : spec.capacityMl;
  const value = units ? volumeMl * UNITS_PER_ML : volumeMl;
  const over = value > max;
  const pad = 10;
  const barrelX = pad;
  const barrelW = Math.max(0, w - pad * 2 - 18);
  const barrelY = 8;
  const barrelH = height - 30;
  const fillW = Math.max(0, Math.min(1, value / max)) * barrelW;

  const major = units ? (max <= 30 ? 5 : 10) : max <= 1 ? 0.1 : 0.5;
  const minor = units ? (max <= 30 ? 1 : max <= 50 ? 1 : 2) : max <= 1 ? 0.02 : 0.1;
  const ticks: { x: number; major: boolean; label?: string }[] = [];
  for (let v = 0; v <= max + 1e-9; v += minor) {
    const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
    if (barrelW <= 0) break;
    ticks.push({ x: barrelX + (v / max) * barrelW, major: isMajor, label: isMajor ? (units ? String(Math.round(v)) : v.toFixed(1)) : undefined });
  }

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel={`Syringe filled to ${value.toFixed(units ? 1 : 2)} ${units ? 'units' : 'mL'}`}>
      <Svg width={w} height={height}>
        <Rect x={barrelX} y={barrelY} width={barrelW} height={barrelH} rx={6} fill={c.surfaceAlt} stroke={c.border} />
        <Rect x={barrelX} y={barrelY} width={fillW} height={barrelH} rx={6} fill={over ? c.danger : c.accent} opacity={0.85} />
        <Rect x={barrelX + barrelW} y={barrelY + barrelH / 2 - 3} width={18} height={6} rx={2} fill={c.inkFaint} />
        {ticks.map((t, i) => (
          <Line key={i} x1={t.x} x2={t.x} y1={barrelY} y2={barrelY + (t.major ? barrelH * 0.55 : barrelH * 0.3)} stroke={c.ink} strokeOpacity={t.major ? 0.55 : 0.25} strokeWidth={1} />
        ))}
        {ticks
          .filter((t) => t.label)
          .map((t, i) => (
            <SvgText key={`l${i}`} x={t.x} y={height - 6} fontSize={10} fontFamily={fonts.medium} fill={c.inkFaint} textAnchor="middle">
              {t.label}
            </SvgText>
          ))}
      </Svg>
    </View>
  );
}
