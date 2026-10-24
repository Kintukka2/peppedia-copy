import { format } from 'date-fns';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import type { SeriesPoint } from '@/domain/pk';

import { fonts, useTheme } from './theme';

function pathFrom(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export interface LevelSeries {
  id: string;
  color: string;
  points: SeriesPoint[];
  doses: number[];
}

interface LevelsChartProps {
  series: LevelSeries[];
  from: number;
  to: number;
  now: number;
  height?: number;
  /** Scale each series to its own peak (for mixed units). */
  normalize?: boolean;
  unit?: string;
  /** Custom x-axis labels (e.g. hours since a dose); dates by default. */
  xLabel?: (t: number) => string;
}

/** Estimated levels: solid past, dashed projection, dose ticks along the axis. */
export function LevelsChart({ series, from, to, now, height = 220, normalize, unit, xLabel }: LevelsChartProps) {
  const { c } = useTheme();
  const [w, setW] = useState(320);
  const left = normalize ? 8 : 38;
  const right = 8;
  const top = 12;
  const bottom = 34;
  const plotW = Math.max(10, w - left - right);
  const plotH = height - top - bottom;

  const peaks = series.map((s) => Math.max(1e-9, ...s.points.map((p) => p.v)));
  const globalMax = normalize ? 1 : Math.max(1e-9, ...peaks) * 1.12;
  const x = (t: number) => left + ((t - from) / (to - from)) * plotW;
  const y = (v: number) => top + plotH - (v / globalMax) * plotH;

  const nowX = x(now);
  const span = to - from;
  const labelCount = w < 360 ? 3 : 5;
  const labels = Array.from({ length: labelCount }, (_, i) => from + (span * (i + 0.5)) / labelCount);
  const dateFmt = span <= 2 * 86_400_000 ? 'HH:mm' : 'MMM d';

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={height}>
        <Defs>
          {series.map((s) => (
            <LinearGradient key={s.id} id={`g-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={s.color} stopOpacity={0.02} />
            </LinearGradient>
          ))}
        </Defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <Line key={f} x1={left} x2={left + plotW} y1={top + plotH * f} y2={top + plotH * f} stroke={c.border} strokeWidth={1} />
        ))}
        {!normalize &&
          [0.5, 1].map((f) => (
            <SvgText key={f} x={left - 6} y={top + plotH * (1 - f) + 4} fontSize={10} fontFamily={fonts.medium} fill={c.inkFaint} textAnchor="end">
              {fmtAxis(globalMax * f)}
            </SvgText>
          ))}
        {series.map((s, si) => {
          const scale = normalize ? 1 / peaks[si] : 1;
          const pts = s.points.map((p) => ({ x: x(p.t), y: y(p.v * scale), t: p.t }));
          const past = pts.filter((p) => p.t <= now);
          const future = pts.filter((p) => p.t >= now);
          const area = pts.length > 1 ? `${pathFrom(pts)} L${pts[pts.length - 1].x.toFixed(1)},${(top + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(top + plotH).toFixed(1)} Z` : '';
          return (
            <Svg key={s.id}>
              {area ? <Path d={area} fill={`url(#g-${s.id})`} /> : null}
              {past.length > 1 ? <Path d={pathFrom(past)} stroke={s.color} strokeWidth={2.2} fill="none" strokeLinejoin="round" /> : null}
              {future.length > 1 ? <Path d={pathFrom(future)} stroke={s.color} strokeWidth={2} strokeDasharray="5,5" fill="none" opacity={0.8} /> : null}
              {s.doses
                .filter((t) => t >= from && t <= to)
                .map((t, i) => (
                  <Circle key={i} cx={x(t)} cy={top + plotH + 7} r={3} fill={s.color} />
                ))}
            </Svg>
          );
        })}
        {now >= from && now <= to ? (
          <>
            <Line x1={nowX} x2={nowX} y1={top} y2={top + plotH} stroke={c.ink} strokeOpacity={0.5} strokeDasharray="2,3" />
            <SvgText x={nowX} y={top + 10} fontSize={10} fontFamily={fonts.semibold} fill={c.inkSoft} textAnchor={nowX > w - 40 ? 'end' : 'start'} dx={nowX > w - 40 ? -4 : 4}>
              Now
            </SvgText>
          </>
        ) : null}
        {labels.map((t) => (
          <SvgText key={t} x={x(t)} y={height - 6} fontSize={10} fontFamily={fonts.medium} fill={c.inkFaint} textAnchor="middle">
            {xLabel ? xLabel(t) : format(t, dateFmt)}
          </SvgText>
        ))}
        {!normalize && unit ? (
          <SvgText x={left - 6} y={top + plotH + 4} fontSize={10} fontFamily={fonts.medium} fill={c.inkFaint} textAnchor="end">
            {unit}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

function fmtAxis(v: number): string {
  if (v >= 100) return Math.round(v).toString();
  if (v >= 10) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

interface TrendChartProps {
  points: { t: number; v: number }[];
  color?: string;
  height?: number;
  goal?: number;
  formatValue?: (v: number) => string;
  /** Second series (e.g. diastolic) drawn beneath the first. */
  points2?: { t: number; v: number }[];
}

export function TrendChart({ points, points2, color, height = 180, goal, formatValue = (v) => v.toFixed(1) }: TrendChartProps) {
  const { c } = useTheme();
  const [w, setW] = useState(320);
  const stroke = color ?? c.accent;
  const left = 40;
  const right = 10;
  const top = 12;
  const bottom = 26;
  const all = [...points, ...(points2 ?? [])];
  if (all.length === 0) return <View style={{ height }} />;
  const vals = all.map((p) => p.v).concat(goal !== undefined ? [goal] : []);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1e-6) {
    min -= 1;
    max += 1;
  }
  const padV = (max - min) * 0.12;
  min -= padV;
  max += padV;
  const t0 = Math.min(...all.map((p) => p.t));
  const t1 = Math.max(...all.map((p) => p.t), t0 + 1);
  const plotW = Math.max(10, w - left - right);
  const plotH = height - top - bottom;
  const x = (t: number) => left + ((t - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => top + plotH - ((v - min) / (max - min)) * plotH;
  const line = (ps: { t: number; v: number }[]) => pathFrom([...ps].sort((a, b) => a.t - b.t).map((p) => ({ x: x(p.t), y: y(p.v) })));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={height}>
        {[0, 0.5, 1].map((f) => (
          <Line key={f} x1={left} x2={left + plotW} y1={top + plotH * f} y2={top + plotH * f} stroke={c.border} />
        ))}
        {[0, 0.5, 1].map((f) => (
          <SvgText key={`y${f}`} x={left - 6} y={top + plotH * f + 4} fontSize={10} fontFamily={fonts.medium} fill={c.inkFaint} textAnchor="end">
            {formatValue(max - (max - min) * f)}
          </SvgText>
        ))}
        {goal !== undefined ? (
          <>
            <Line x1={left} x2={left + plotW} y1={y(goal)} y2={y(goal)} stroke={c.positive} strokeDasharray="4,4" />
            <SvgText x={left + plotW} y={y(goal) - 4} fontSize={10} fontFamily={fonts.semibold} fill={c.positive} textAnchor="end">
              Goal
            </SvgText>
          </>
        ) : null}
        {points2 && points2.length > 1 ? <Path d={line(points2)} stroke={stroke} strokeOpacity={0.45} strokeWidth={2} fill="none" /> : null}
        {points.length > 1 ? <Path d={line(points)} stroke={stroke} strokeWidth={2.2} fill="none" strokeLinejoin="round" /> : null}
        {points.map((p, i) => (
          <Circle key={i} cx={x(p.t)} cy={y(p.v)} r={2.6} fill={stroke} />
        ))}
        <SvgText x={left} y={height - 6} fontSize={10} fontFamily={fonts.medium} fill={c.inkFaint}>
          {format(t0, 'MMM d')}
        </SvgText>
        <SvgText x={left + plotW} y={height - 6} fontSize={10} fontFamily={fonts.medium} fill={c.inkFaint} textAnchor="end">
          {format(t1, 'MMM d')}
        </SvgText>
      </Svg>
    </View>
  );
}

export function Sparkline({ points, color, width = 96, height = 36 }: { points: { t: number; v: number }[]; color: string; width?: number; height?: number }) {
  if (points.length < 2) return <View style={{ width, height }} />;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const vs = sorted.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const t0 = sorted[0].t;
  const t1 = sorted[sorted.length - 1].t;
  const pts = sorted.map((p) => ({ x: 2 + ((p.t - t0) / Math.max(1, t1 - t0)) * (width - 4), y: 2 + (height - 4) * (1 - (p.v - min) / Math.max(1e-9, max - min)) }));
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={pathFrom(pts)} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={3} fill={color} />
    </Svg>
  );
}

/** Thin ring showing a 0–1 fraction. */
export function Ring({ value, size = 44, color, label }: { value: number; size?: number; color?: string; label?: string }) {
  const { c } = useTheme();
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surfaceAlt} strokeWidth={4} fill="none" />
      {v > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? c.accent}
          strokeWidth={4}
          fill="none"
          strokeDasharray={`${circ * v},${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
      {label ? (
        <SvgText x={size / 2} y={size / 2 + 4} fontSize={11} fontFamily={fonts.semibold} fill={c.ink} textAnchor="middle">
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}
