import { router } from 'expo-router';
import { Bookmark, ChevronRight, Layers, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { CATEGORY_LABEL, COMPOUNDS, searchCompounds } from '@/data/library';
import { PROTOCOL_TEMPLATES, stackTemplates } from '@/data/protocols';
import type { Compound, CompoundCategory, RegulatoryStatus } from '@/data/types';
import { useStore } from '@/store';
import { Chip, Field } from '@/ui/controls';
import { Badge, EmptyState, EvidenceMeter, STATUS_LABEL, STATUS_TONE } from '@/ui/feedback';
import { Card, HStack, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type Filter = 'all' | 'saved' | CompoundCategory;

const CATEGORY_ORDER: CompoundCategory[] = ['metabolic', 'gh-axis', 'repair', 'immune', 'cognitive', 'longevity', 'sexual-health', 'hormone', 'skin'];

export default function LibraryScreen() {
  const { c } = useTheme();
  const bookmarks = useStore((s) => s.bookmarks);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [status, setStatus] = useState<RegulatoryStatus | null>(null);

  const results = useMemo(() => {
    let list = searchCompounds(q);
    if (filter === 'saved') list = list.filter((x) => bookmarks.includes(x.id));
    else if (filter !== 'all') list = list.filter((x) => x.category === filter);
    if (status) list = list.filter((x) => x.regulatory.status === status);
    return list;
  }, [q, filter, status, bookmarks]);

  const grouped = useMemo(() => {
    if (q || filter !== 'all') return null;
    return CATEGORY_ORDER.map((cat) => ({ cat, items: results.filter((x) => x.category === cat) })).filter((g) => g.items.length > 0);
  }, [results, q, filter]);

  const row = (x: Compound, i: number, arr: Compound[]) => (
    <Row
      key={x.id}
      title={x.name}
      subtitle={x.summary}
      onPress={() => router.push(`/compound/${x.id}`)}
      last={i === arr.length - 1}
      right={
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={STATUS_LABEL[x.regulatory.status]} tone={STATUS_TONE[x.regulatory.status]} />
          <EvidenceMeter level={x.evidence} />
        </View>
      }
    />
  );

  return (
    <Screen large title="Library" subtitle={`${COMPOUNDS.length} compounds · ${PROTOCOL_TEMPLATES.length} protocols`}>
      <Field value={q} onChangeText={setQ} placeholder="Search by name, alias or effect" suffix={<Search size={18} color={c.inkFaint} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginBottom: space.sm }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Saved" icon={<Bookmark size={14} color={filter === 'saved' ? c.bg : c.ink} />} selected={filter === 'saved'} onPress={() => setFilter('saved')} />
        {CATEGORY_ORDER.map((cat) => (
          <Chip key={cat} label={CATEGORY_LABEL[cat]} selected={filter === cat} onPress={() => setFilter(cat)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginBottom: space.xl }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
        {(['approved', 'investigational', 'unapproved'] as RegulatoryStatus[]).map((st) => (
          <Chip key={st} label={STATUS_LABEL[st]} selected={status === st} onPress={() => setStatus(status === st ? null : st)} />
        ))}
      </ScrollView>

      {!q && filter === 'all' && !status ? (
        <Card onPress={() => router.push('/templates')} tint={c.accentSoft} style={{ borderColor: 'transparent', marginBottom: space.xl }}>
          <HStack gap={space.md}>
            <Layers size={20} color={c.accent} />
            <View style={{ flex: 1 }}>
              <T variant="heading">Protocol library</T>
              <T variant="small" tone="soft">
                {PROTOCOL_TEMPLATES.length} protocols and {stackTemplates().length} stacks & blends, each labelled label, trial, clinic, community or vendor.
              </T>
            </View>
            <ChevronRight size={18} color={c.accent} />
          </HStack>
        </Card>
      ) : null}

      {results.length === 0 ? (
        <EmptyState title={filter === 'saved' ? 'Nothing saved yet' : 'No matches'} body={filter === 'saved' ? 'Tap the bookmark on any compound to keep it here.' : 'Try another name or alias.'} />
      ) : grouped ? (
        grouped.map((g) => (
          <Section key={g.cat} title={`${CATEGORY_LABEL[g.cat]} · ${g.items.length}`}>
            <Card style={{ paddingVertical: space.xs }}>{g.items.map(row)}</Card>
          </Section>
        ))
      ) : (
        <Section title={`${results.length} result${results.length === 1 ? '' : 's'}`}>
          <Card style={{ paddingVertical: space.xs }}>{results.map(row)}</Card>
        </Section>
      )}

      <T variant="small" tone="faint" center>
        Evidence bars show how much human data exists, not whether it is favourable.{' '}
        <T variant="small" tone="accent" onPress={() => router.push('/about')}>
          How we rate evidence
        </T>
      </T>
    </Screen>
  );
}
