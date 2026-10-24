import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, BookmarkCheck, Calculator, ExternalLink, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { CATEGORY_LABEL, getCompound, ROUTE_LABEL } from '@/data/library';
import { templatesFor } from '@/data/protocols';
import { checkPair, LEVEL_LABEL } from '@/domain/interactions';
import { paramsFor, sampleSeries } from '@/domain/pk';
import { TemplateCard } from '@/features/protocols/components';
import { formatHours, openLink } from '@/lib/links';
import { useStore } from '@/store';
import { Button } from '@/ui/controls';
import { Badge, EmptyState, EvidenceMeter, EVIDENCE_LABEL, LEVEL_TONE, Notice, STATUS_LABEL, STATUS_TONE } from '@/ui/feedback';
import { LevelsChart } from '@/ui/charts';
import { Card, HStack, IconButton, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

const H = 3_600_000;

function Bullets({ items, tone }: { items: string[]; tone?: 'danger' | 'warn' }) {
  const { c } = useTheme();
  const dot = tone === 'danger' ? c.danger : tone === 'warn' ? c.warn : c.inkFaint;
  return (
    <View style={{ gap: 8 }}>
      {items.map((s, i) => (
        <HStack key={i} style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot, marginTop: 8 }} />
          <T style={{ flex: 1 }}>{s}</T>
        </HStack>
      ))}
    </View>
  );
}

export default function CompoundScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const compound = getCompound(id);
  const templates = useMemo(() => (compound ? templatesFor(compound.id) : []), [compound]);
  const bookmarks = useStore((s) => s.bookmarks);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const protocols = useStore((s) => s.protocols);

  const curve = useMemo(() => {
    if (!compound?.pk) return null;
    const pk = compound.pk;
    const span = (5 * pk.halfLifeHours + (pk.tmaxHours ?? 0)) * H;
    const params = paramsFor(pk);
    return { span, points: sampleSeries([{ at: 0, amount: 1 }], params, 0, span, 100) };
  }, [compound]);

  const stackChecks = useMemo(() => {
    if (!compound) return [];
    const seen = new Set<string>();
    return protocols
      .filter((p) => p.status === 'active' && p.compoundId !== compound.id)
      .filter((p) => {
        const key = p.compoundId ?? p.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p) => ({ p, r: checkPair({ compound, name: compound.name }, { compound: getCompound(p.compoundId), name: p.name }) }));
  }, [compound, protocols]);

  if (!compound) {
    return (
      <Screen back title="Not found">
        <EmptyState title="Compound not found" body="It may have been renamed in a library update." action="Open library" onAction={() => router.replace('/library')} />
      </Screen>
    );
  }

  const saved = bookmarks.includes(compound.id);
  const pk = compound.pk;

  return (
    <Screen
      back
      title={compound.name}
      right={
        <IconButton label={saved ? 'Remove bookmark' : 'Bookmark'} onPress={() => toggleBookmark(compound.id)}>
          {saved ? <BookmarkCheck size={18} color={c.accent} /> : <Bookmark size={18} color={c.ink} />}
        </IconButton>
      }
      footer={
        <HStack>
          <Button title="Track this" icon={<Plus size={18} color={c.accentInk} />} onPress={() => router.push(`/protocol/form?compoundId=${compound.id}`)} style={{ flex: 1 }} />
          <Button title="Calculator" kind="secondary" icon={<Calculator size={18} color={c.ink} />} onPress={() => router.push('/calculator')} />
        </HStack>
      }>
      <T variant="display">{compound.name}</T>
      {compound.aliases.length ? (
        <T tone="soft" style={{ marginTop: 2 }}>
          {compound.aliases.join(' · ')}
        </T>
      ) : null}
      <HStack wrap style={{ marginTop: space.md, marginBottom: space.lg }}>
        <Badge label={STATUS_LABEL[compound.regulatory.status]} tone={STATUS_TONE[compound.regulatory.status]} />
        <Badge label={CATEGORY_LABEL[compound.category]} />
        {compound.routes.map((r) => (
          <Badge key={r} label={ROUTE_LABEL[r]} />
        ))}
      </HStack>
      <T style={{ fontSize: 17, lineHeight: 25, marginBottom: space.xl }}>{compound.summary}</T>

      <Section title="Evidence & status">
        <Card>
          <HStack style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
            <T variant="bodyStrong">{EVIDENCE_LABEL[compound.evidence]}</T>
            <EvidenceMeter level={compound.evidence} />
          </HStack>
          <T tone="soft">{compound.evidenceNote}</T>
          <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.md }} />
          <T variant="bodyStrong" style={{ marginBottom: 4 }}>
            Regulatory status
          </T>
          <T tone="soft">{compound.regulatory.detail}</T>
          {compound.antiDoping ? (
            <>
              <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.md }} />
              <T variant="bodyStrong" style={{ marginBottom: 4 }}>
                Anti-doping
              </T>
              <T tone="soft">{compound.antiDoping}</T>
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="How it works">
        <T>{compound.mechanism}</T>
      </Section>

      <Section title="Pharmacokinetics">
        {pk && curve ? (
          <Card>
            <HStack style={{ marginBottom: space.md }}>
              <View style={{ flex: 1 }}>
                <T variant="micro" tone="faint">
                  Half-life
                </T>
                <T variant="metric">{formatHours(pk.halfLifeHours)}</T>
              </View>
              {pk.tmaxHours ? (
                <View style={{ flex: 1 }}>
                  <T variant="micro" tone="faint">
                    Time to peak
                  </T>
                  <T variant="metric">{formatHours(pk.tmaxHours)}</T>
                </View>
              ) : null}
            </HStack>
            <LevelsChart
              series={[{ id: 'single', color: c.accent, points: curve.points, doses: [0] }]}
              from={0}
              to={curve.span}
              now={curve.span + 1}
              normalize
              height={150}
              xLabel={(t) => formatHours(t / H)}
            />
            <T variant="small" tone="soft" style={{ marginTop: space.sm }}>
              Single-dose profile ({ROUTE_LABEL[pk.route].toLowerCase()}), scaled to its peak. {pk.note}
            </T>
            <T variant="small" tone="faint" style={{ marginTop: 4 }}>
              Source: {pk.source}
            </T>
          </Card>
        ) : (
          <Notice title="No reliable human pharmacokinetic data">No published human half-life, so Titra doesn’t draw a level curve for it.</Notice>
        )}
      </Section>

      <Section title={`Protocols (${templates.length})`}>
        {templates.length ? (
          templates.map((t, i) => <TemplateCard key={t.id} template={t} defaultOpen={i === 0 && templates.length === 1} />)
        ) : (
          <Notice>No protocol templates for this compound yet. Track it with your own dose and schedule.</Notice>
        )}
      </Section>

      {compound.studiedRegimens.length ? (
        <Section title="Studied regimens">
          <Card style={{ paddingVertical: space.xs }}>
            {compound.studiedRegimens.map((r, i) => (
              <View key={i} style={{ paddingVertical: space.md, borderBottomWidth: i < compound.studiedRegimens.length - 1 ? 1 : 0, borderBottomColor: c.border }}>
                <T variant="bodyStrong">{r.context}</T>
                <T style={{ marginTop: 2 }}>{r.regimen}</T>
                <T variant="small" tone="faint" style={{ marginTop: 2 }}>
                  {r.source}
                </T>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {compound.commonSideEffects.length ? (
        <Section title="Common side effects">
          <Bullets items={compound.commonSideEffects} />
        </Section>
      ) : null}
      {compound.seriousRisks.length ? (
        <Section title="Serious risks">
          <Bullets items={compound.seriousRisks} tone="danger" />
        </Section>
      ) : null}
      {compound.cautions.length ? (
        <Section title="Cautions">
          <Bullets items={compound.cautions} tone="warn" />
        </Section>
      ) : null}
      {compound.storage ? (
        <Section title="Storage">
          <T>{compound.storage}</T>
        </Section>
      ) : null}

      {stackChecks.length ? (
        <Section title="With your active protocols">
          <Card style={{ paddingVertical: space.xs }}>
            {stackChecks.map(({ p, r }, i) => (
              <Row
                key={p.id}
                title={p.name}
                subtitle={r.findings[0].title}
                last={i === stackChecks.length - 1}
                onPress={() => router.push('/interactions')}
                right={<Badge label={LEVEL_LABEL[r.level]} tone={LEVEL_TONE[r.level]} />}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title="Sources">
        <Card style={{ paddingVertical: space.xs }}>
          {compound.sources.map((s, i) => (
            <Pressable key={s.url} onPress={() => openLink(s.url)} accessibilityRole="link" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.sm, borderBottomWidth: i < compound.sources.length - 1 ? 1 : 0, borderBottomColor: c.border }, pressed && { opacity: 0.6 }]}>
              <T style={{ flex: 1 }} tone="accent">
                {s.label}
              </T>
              <ExternalLink size={16} color={c.accent} />
            </Pressable>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
