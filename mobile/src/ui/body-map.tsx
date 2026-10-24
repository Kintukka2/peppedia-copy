import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { SITES, type BodyView } from '@/data/sites';

import { fonts, useTheme } from './theme';

// Left-half outlines in a 200 × 440 viewBox, mirrored for the right half.
const LEFT_ARM = 'M54,92 Q38,96 34,114 L26,196 Q24,212 30,226 L40,226 Q44,212 44,198 L54,128 Z';
const LEFT_LEG = 'M62,234 L99,234 L97,326 L93,420 L71,420 L67,326 Q62,280 62,234 Z';
const TORSO = 'M62,86 Q100,76 138,86 Q152,92 150,112 L144,170 Q141,204 140,238 L60,238 Q59,204 56,170 L50,112 Q48,92 62,86 Z';

function mirror(path: string): string {
  return path.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) => `${200 - Number(x)},${y}`);
}

export interface SiteMarker {
  id: string;
  /** 0 = unused, 1 = used long ago … 3 = used in the last few days. */
  heat: 0 | 1 | 2 | 3;
}

interface BodyMapProps {
  view: BodyView;
  markers: SiteMarker[];
  selected?: string | null;
  suggested?: string | null;
  allowed?: string[];
  onSelect?: (id: string) => void;
  height?: number;
}

export function BodyMap({ view, markers, selected, suggested, allowed, onSelect, height = 360 }: BodyMapProps) {
  const { c } = useTheme();
  const [w, setW] = useState(240);
  const scale = height / 440;
  const width = 200 * scale;
  const heat = new Map(markers.map((m) => [m.id, m.heat]));
  const heatColor = [c.inkFaint, c.accent, c.accent, c.warn];
  const heatOpacity = [0.55, 0.45, 1, 1];

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ alignItems: 'center' }}>
      <Svg width={Math.min(w, width)} height={height} viewBox="0 0 200 440">
        <G fill={c.surfaceAlt} stroke={c.border} strokeWidth={1.5}>
          <Circle cx={100} cy={42} r={25} />
          <Path d="M90,62 L110,62 L112,84 L88,84 Z" />
          <Path d={TORSO} />
          <Path d={LEFT_ARM} />
          <Path d={mirror(LEFT_ARM)} />
          <Path d={LEFT_LEG} />
          <Path d={mirror(LEFT_LEG)} />
        </G>
        {view === 'front' ? (
          <Circle cx={100} cy={192} r={2.5} fill={c.inkFaint} />
        ) : (
          <Path d="M100,90 L100,232" stroke={c.border} strokeWidth={1.5} />
        )}
        <SvgText x={14} y={18} fontSize={11} fontFamily={fonts.semibold} fill={c.inkFaint}>
          {view === 'front' ? 'R' : 'L'}
        </SvgText>
        <SvgText x={186} y={18} fontSize={11} fontFamily={fonts.semibold} fill={c.inkFaint} textAnchor="end">
          {view === 'front' ? 'L' : 'R'}
        </SvgText>
        {SITES.filter((s) => s.view === view).map((s) => {
          const disabled = allowed ? !allowed.includes(s.id) : false;
          const h = heat.get(s.id) ?? 0;
          const isSel = selected === s.id;
          const isSug = suggested === s.id;
          return (
            <G key={s.id} onPress={disabled || !onSelect ? undefined : () => onSelect(s.id)} opacity={disabled ? 0.25 : 1}>
              <Circle cx={s.x} cy={s.y} r={16} fill="transparent" />
              {isSug && !isSel ? <Circle cx={s.x} cy={s.y} r={12} fill="none" stroke={c.positive} strokeWidth={2} strokeDasharray="3,3" /> : null}
              {isSel ? <Circle cx={s.x} cy={s.y} r={12} fill="none" stroke={c.ink} strokeWidth={2.5} /> : null}
              <Circle cx={s.x} cy={s.y} r={7} fill={heatColor[h]} fillOpacity={heatOpacity[h]} stroke={c.surface} strokeWidth={2} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
