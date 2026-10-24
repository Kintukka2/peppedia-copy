import { format } from 'date-fns';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { getCompound, ROUTE_LABEL } from '@/data/library';
import { SOURCE_BLURB, SOURCE_LABEL } from '@/data/protocols';
import type { ProtocolSource, ProtocolTemplate } from '@/data/types';
import { formatAmount } from '@/domain/units';
import { openLink } from '@/lib/links';
import { nextColor, uid, useStore } from '@/store';
import { Button, tap } from '@/ui/controls';
import { Badge, type BadgeTone } from '@/ui/feedback';
import { Card, HStack } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

import { doseLine, scheduleLine, summaryLine, templateToProtocols, titrationLine } from './templates';

export const SOURCE_TONE: Record<ProtocolSource, BadgeTone> = {
  label: 'positive',
  trial: 'violet',
  clinic: 'accent',
  community: 'warn',
  vendor: 'neutral',
};

const KIND_LABEL = { single: null, stack: 'Stack', blend: 'Blend' } as const;

export function SourceBadge({ source }: { source: ProtocolSource }) {
  return <Badge label={SOURCE_LABEL[source]} tone={SOURCE_TONE[source]} />;
}

function Line({ label, children }: { label: string; children: string }) {
  return (
    <T variant="small" tone="soft" style={{ marginTop: 4 }}>
      <T variant="smallStrong" tone="soft">
        {label}{' '}
      </T>
      {children}
    </T>
  );
}

/** Starts a template: single and blend open the protocol form prefilled; a stack adds one protocol per compound. */
export function useStartTemplate() {
  const protocols = useStore((s) => s.protocols);
  const upsertProtocol = useStore((s) => s.upsertProtocol);
  return (t: ProtocolTemplate) => {
    if (t.kind !== 'stack') {
      router.push(`/protocol/form?templateId=${encodeURIComponent(t.id)}`);
      return;
    }
    const created = templateToProtocols(t, {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
      id: uid,
      color: nextColor,
      existing: protocols,
    });
    created.forEach(upsertProtocol);
    router.push('/protocols');
  };
}

/** A labelled protocol template: source, dose and schedule up front; notes and sources on expand. */
export function TemplateCard({ template: t, defaultOpen = false, showCompounds = false }: { template: ProtocolTemplate; defaultOpen?: boolean; showCompounds?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const start = useStartTemplate();
  const titration = titrationLine(t);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <Card style={{ marginBottom: space.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${SOURCE_LABEL[t.source]} protocol: ${t.name}`}
        onPress={() => {
          tap();
          setOpen(!open);
        }}>
        <HStack wrap style={{ marginBottom: space.sm }}>
          <SourceBadge source={t.source} />
          {KIND_LABEL[t.kind] ? <Badge label={KIND_LABEL[t.kind]!} /> : null}
          <Badge label={ROUTE_LABEL[t.route]} />
        </HStack>
        <HStack style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T variant="heading">{t.name}</T>
            {showCompounds ? (
              <T variant="small" tone="soft">
                {t.components.map((x) => getCompound(x.compoundId)?.name ?? x.compoundId).join(' + ')}
              </T>
            ) : null}
            <T style={{ marginTop: 2 }}>{t.kind === 'single' ? `${doseLine(t.components[0])} · ${scheduleLine(t)}` : scheduleLine(t)}</T>
          </View>
          <Chevron size={20} color={c.inkFaint} style={{ marginTop: 4 }} />
        </HStack>
        {t.kind !== 'single'
          ? t.components.map((x) => (
              <Line key={x.compoundId} label={`${getCompound(x.compoundId)?.name ?? x.compoundId}:`}>
                {doseLine(x)}
              </Line>
            ))
          : null}
        {titration ? <Line label="Titration:">{titration}</Line> : null}
        {t.blendVial ? <Line label="Vial:">{t.blendVial.map((b) => `${getCompound(b.compoundId)?.name ?? b.compoundId} ${formatAmount(b.amount)}`).join(' · ')}</Line> : null}
      </Pressable>

      {open ? (
        <View style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.border }}>
          <T variant="bodyStrong">{t.goal}</T>
          <View style={{ gap: 6, marginTop: space.sm }}>
            {t.notes.map((n, i) => (
              <HStack key={i} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.inkFaint, marginTop: 9 }} />
                <T style={{ flex: 1 }}>{n}</T>
              </HStack>
            ))}
          </View>
          <T variant="small" tone="faint" style={{ marginTop: space.md }}>
            {SOURCE_BLURB[t.source]} {t.reportedBy}
          </T>
          <View style={{ marginTop: space.sm }}>
            {t.sources.map((s) => (
              <Pressable key={s.url} accessibilityRole="link" onPress={() => openLink(s.url)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }, pressed && { opacity: 0.6 }]}>
                <ExternalLink size={14} color={c.accent} />
                <T variant="small" tone="accent" style={{ flex: 1 }}>
                  {s.label}
                </T>
              </Pressable>
            ))}
          </View>
          <Button
            title={t.kind === 'stack' ? `Add ${t.components.length} protocols` : 'Use this protocol'}
            icon={<Plus size={18} color={c.accentInk} />}
            onPress={() => start(t)}
            style={{ marginTop: space.md }}
          />
        </View>
      ) : null}
    </Card>
  );
}

/** Compact, tappable template row for pickers. */
export function TemplateOption({ template: t, selected, onPress }: { template: ProtocolTemplate; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        { borderWidth: selected ? 2 : 1, borderColor: selected ? c.accent : c.border, borderRadius: 14, padding: space.md, marginBottom: space.sm, backgroundColor: c.surface },
        pressed && { opacity: 0.7 },
      ]}>
      <HStack style={{ marginBottom: 4 }}>
        <SourceBadge source={t.source} />
        <T variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {t.name}
        </T>
      </HStack>
      <T variant="small" tone="soft">
        {summaryLine(t)}
      </T>
    </Pressable>
  );
}
