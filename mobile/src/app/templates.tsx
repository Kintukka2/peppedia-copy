import { useLocalSearchParams } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { getCompound } from '@/data/library';
import { PROTOCOL_TEMPLATES, SOURCE_BLURB, SOURCE_LABEL } from '@/data/protocols';
import type { ProtocolSource, ProtocolTemplate } from '@/data/types';
import { TemplateCard } from '@/features/protocols/components';
import { Chip, Field } from '@/ui/controls';
import { EmptyState } from '@/ui/feedback';
import { Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type Kind = 'all' | 'single' | 'combo';

const SOURCES: ProtocolSource[] = ['label', 'trial', 'clinic', 'community', 'vendor'];

function haystack(t: ProtocolTemplate): string {
  const names = t.components.flatMap((c) => {
    const compound = getCompound(c.compoundId);
    return compound ? [compound.name, ...compound.aliases] : [c.compoundId];
  });
  return [t.name, t.goal, t.reportedBy, ...names].join(' ').toLowerCase();
}

/** Every protocol template in one place, filterable by source and by single vs stack/blend. */
export default function TemplatesScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [source, setSource] = useState<ProtocolSource | null>(null);
  const [kind, setKind] = useState<Kind>('all');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PROTOCOL_TEMPLATES.filter(
      (t) => (!source || t.source === source) && (kind === 'all' || (kind === 'single' ? t.kind === 'single' : t.kind !== 'single')) && (!needle || haystack(t).includes(needle)),
    ).sort((a, b) => (getCompound(a.components[0].compoundId)?.name ?? '').localeCompare(getCompound(b.components[0].compoundId)?.name ?? '') || SOURCES.indexOf(a.source) - SOURCES.indexOf(b.source));
  }, [q, source, kind]);

  return (
    <Screen back title="Protocol library">
      <Field value={q} onChangeText={setQ} placeholder="Search compound, goal or source" suffix={<Search size={18} color={c.inkFaint} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginBottom: space.sm }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
        <Chip label="All sources" selected={!source} onPress={() => setSource(null)} />
        {SOURCES.map((s) => (
          <Chip key={s} label={SOURCE_LABEL[s]} selected={source === s} onPress={() => setSource(source === s ? null : s)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginBottom: space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
        <Chip label="Everything" selected={kind === 'all'} onPress={() => setKind('all')} />
        <Chip label="Single compound" selected={kind === 'single'} onPress={() => setKind('single')} />
        <Chip label="Stacks & blends" selected={kind === 'combo'} onPress={() => setKind('combo')} />
      </ScrollView>
      {source ? (
        <T variant="small" tone="soft" style={{ marginBottom: space.md }}>
          {SOURCE_BLURB[source]}
        </T>
      ) : null}

      {list.length === 0 ? (
        <EmptyState title="No protocols match" body="Try another compound name or clear a filter." />
      ) : (
        <Section title={`${list.length} protocol${list.length === 1 ? '' : 's'}`}>
          {list.map((t) => (
            <TemplateCard key={t.id} template={t} showCompounds />
          ))}
        </Section>
      )}
    </Screen>
  );
}
