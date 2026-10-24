import { Info, TriangleAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { InteractionLevel } from '@/domain/interactions';
import type { EvidenceLevel, RegulatoryStatus } from '@/data/types';

import { Button } from './controls';
import { T } from './text';
import { radius, space, useTheme, type Palette } from './theme';

export type BadgeTone = 'neutral' | 'accent' | 'warn' | 'danger' | 'positive' | 'violet';

function toneColors(c: Palette, tone: BadgeTone) {
  switch (tone) {
    case 'accent':
      return { bg: c.accentSoft, fg: c.accent };
    case 'warn':
      return { bg: c.warnSoft, fg: c.warn };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.danger };
    case 'positive':
      return { bg: c.positiveSoft, fg: c.positive };
    case 'violet':
      return { bg: c.violetSoft, fg: c.violet };
    default:
      return { bg: c.surfaceAlt, fg: c.inkSoft };
  }
}

export function Badge({ label, tone = 'neutral', style }: { label: string; tone?: BadgeTone; style?: ViewStyle }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <T variant="smallStrong" style={{ color: t.fg, fontSize: 12, lineHeight: 16 }} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

export const LEVEL_TONE: Record<InteractionLevel, BadgeTone> = {
  avoid: 'danger',
  caution: 'warn',
  monitor: 'accent',
  studied: 'violet',
  unknown: 'neutral',
};

export const STATUS_LABEL: Record<RegulatoryStatus, string> = {
  approved: 'Approved medicine',
  investigational: 'Investigational',
  unapproved: 'Not approved',
};

export const STATUS_TONE: Record<RegulatoryStatus, BadgeTone> = {
  approved: 'positive',
  investigational: 'violet',
  unapproved: 'warn',
};

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  extensive: 'Extensive human data',
  moderate: 'Moderate human data',
  limited: 'Limited human data',
  preclinical: 'Animal / lab data only',
};

export const EVIDENCE_TONE: Record<EvidenceLevel, BadgeTone> = {
  extensive: 'positive',
  moderate: 'accent',
  limited: 'warn',
  preclinical: 'danger',
};

/** Evidence as four bars, filled by level. */
export function EvidenceMeter({ level }: { level: EvidenceLevel }) {
  const { c } = useTheme();
  const n = { preclinical: 1, limited: 2, moderate: 3, extensive: 4 }[level];
  const color = toneColors(c, EVIDENCE_TONE[level]).fg;
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end' }} accessibilityLabel={EVIDENCE_LABEL[level]}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: 5, height: 6 + i * 3, borderRadius: 2, backgroundColor: i <= n ? color : c.surfaceAlt }} />
      ))}
    </View>
  );
}

export function Notice({ children, tone = 'neutral', title }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'danger'; title?: string }) {
  const { c } = useTheme();
  const t = toneColors(c, tone === 'neutral' ? 'neutral' : tone);
  const Icon = tone === 'neutral' ? Info : TriangleAlert;
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]}>
      <Icon size={18} color={t.fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        {title ? (
          <T variant="smallStrong" style={{ color: t.fg, marginBottom: 2 }}>
            {title}
          </T>
        ) : null}
        {typeof children === 'string' ? (
          <T variant="small" tone="soft">
            {children}
          </T>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, body, action, onAction }: { icon?: ReactNode; title: string; body?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: c.border }]}>
      {icon ? <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}>{icon}</View> : null}
      <T variant="heading" center>
        {title}
      </T>
      {body ? (
        <T tone="soft" center style={{ marginTop: 4, maxWidth: 320 }}>
          {body}
        </T>
      ) : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: space.lg }} small /> : null}
    </View>
  );
}

export function Stat({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub?: string; tone?: 'positive' | 'warn' | 'danger' }) {
  return (
    <View style={{ flex: 1 }}>
      <T variant="micro" tone="faint">
        {label}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <T variant="metric">{value}</T>
        {unit ? <T tone="soft">{unit}</T> : null}
      </View>
      {sub ? (
        <T variant="small" tone={tone ?? 'soft'} style={{ marginTop: 2 }}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  notice: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md },
  empty: { alignItems: 'center', padding: space.xxl, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
});
