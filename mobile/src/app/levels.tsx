import { format } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { getCompound } from '@/data/library';
import type { Compound } from '@/data/types';
import { clearsAt, levelAt, paramsFor, sampleSeries, type DoseEvent } from '@/domain/pk';
import { doseOn, occurrences } from '@/domain/schedule';
import { toBase, trim } from '@/domain/units';
import { useNow } from '@/lib/hooks';
import { formatHours } from '@/lib/links';
import { useStore } from '@/store';
import { LevelsChart, type LevelSeries } from '@/ui/charts';
import { Chip, Segmented } from '@/ui/controls';
import { Dot, EmptyState, Notice } from '@/ui/feedback';
import { Card, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type Range = '1' | '7' | '30' | '60';
const DAY = 86_400_000;

interface Track {
  key: string;
  name: string;
  color: string;
  compound: Compound | null;
  unit: 'mg' | 'iu';
  past: DoseEvent[];
  future: DoseEvent[];
}

export default function LevelsScreen() {
  const { c } = useTheme();
  const now = useNow();
  const protocols = useStore((s) => s.protocols);
  const logs = useStore((s) => s.logs);
  const [range, setRange] = useState<Range>('7');
  const [focus, setFocus] = useState<string | null>(null);

  const tracks = useMemo(() => {
    const map = new Map<string, Track>();
    const t = now.getTime();
    for (const l of logs) {
      if (l.skipped || !l.compoundId) continue;
      const base = toBase(l.amount);
      const key = l.compoundId + base.unit;
      const p = protocols.find((x) => x.id === l.protocolId);
      const cur = map.get(key) ?? { key, name: l.name, color: p?.color ?? c.accent, compound: getCompound(l.compoundId), unit: base.unit, past: [], future: [] };
      const at = new Date(l.takenAt).getTime();
      if (at <= t) cur.past.push({ at, amount: base.value });
      map.set(key, cur);
    }
    // Project scheduled doses from active protocols (dashed part of the curve).
    for (const p of protocols) {
      if (p.status !== 'active' || !p.compoundId) continue;
      const base = toBase(p.dose);
      const key = p.compoundId + base.unit;
      const cur = map.get(key) ?? { key, name: p.name, color: p.color, compound: getCompound(p.compoundId), unit: base.unit, past: [], future: [] };
      cur.color = p.color;
      for (const at of occurrences(p, new Date(t + 60_000), new Date(t + 60 * DAY))) cur.future.push({ at: at.getTime(), amount: toBase(doseOn(p, at)).value });
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [logs, protocols, now, c.accent]);

  const charted = tracks.filter((t) => t.compound?.pk && t.past.length + t.future.length > 0);
  const uncharted = tracks.filter((t) => !t.compound?.pk);
  const shown = focus ? charted.filter((t) => t.key === focus) : charted;

  const span = Number(range) * DAY;
  const from = now.getTime() - span * 0.75;
  const to = now.getTime() + span * 0.25;

  const series: LevelSeries[] = useMemo(
    () =>
      shown.map((t) => {
        const doses = [...t.past, ...t.future];
        return { id: t.key, color: t.color, points: sampleSeries(doses, paramsFor(t.compound!.pk!), from, to, 160), doses: doses.map((d) => d.at) };
      }),
    [shown, from, to],
  );

  return (
    <Screen back title="Estimated levels">
      {charted.length === 0 ? (
        <EmptyState title="Nothing to chart yet" body="Levels appear once you log doses of a compound with reliable human half-life data." action="Log a dose" onAction={() => router.push('/log')} />
      ) : (
        <>
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: '1', label: '24 h' },
              { value: '7', label: '7 d' },
              { value: '30', label: '30 d' },
              { value: '60', label: '60 d' },
            ]}
            style={{ marginBottom: space.md }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginBottom: space.md }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
            <Chip label="All (relative)" selected={!focus} onPress={() => setFocus(null)} />
            {charted.map((t) => (
              <Chip key={t.key} label={t.name} selected={focus === t.key} onPress={() => setFocus(t.key)} icon={<Dot color={t.color} size={8} />} />
            ))}
          </ScrollView>
          <Card style={{ marginBottom: space.xxl }}>
            <LevelsChart series={series} from={from} to={to} now={now.getTime()} normalize={!focus} unit={focus ? (shown[0]?.unit === 'iu' ? 'IU' : 'mg') : undefined} height={240} />
            <T variant="small" tone="faint" style={{ marginTop: space.sm }}>
              {focus ? 'Estimated amount in the body.' : 'Each compound scaled to its own peak so different units fit one chart.'} Solid = logged, dashed = scheduled.
            </T>
          </Card>

          <Section title="Right now">
            <Card style={{ paddingVertical: space.xs }}>
              {charted.map((t, i) => {
                const pk = t.compound!.pk!;
                const level = levelAt(now.getTime(), t.past, paramsFor(pk));
                const clears = clearsAt(t.past, pk);
                return (
                  <Row
                    key={t.key}
                    left={<Dot color={t.color} />}
                    title={t.name}
                    subtitle={`t½ ${formatHours(pk.halfLifeHours)}${clears ? ` · clears ~${format(clears, 'd MMM')} if no more doses` : ''}`}
                    right={
                      <T variant="bodyStrong" tabular>
                        {trim(level, level < 1 ? 3 : 2)} {t.unit === 'iu' ? 'IU' : 'mg'}
                      </T>
                    }
                    onPress={() => t.compound && router.push(`/compound/${t.compound.id}`)}
                    last={i === charted.length - 1}
                  />
                );
              })}
            </Card>
          </Section>
        </>
      )}

      {uncharted.length > 0 ? (
        <Section title="Not charted">
          <Card style={{ paddingVertical: space.xs }}>
            {uncharted.map((t, i) => (
              <Row key={t.key} left={<Dot color={c.inkFaint} />} title={t.name} subtitle="No reliable human half-life data" last={i === uncharted.length - 1} />
            ))}
          </Card>
        </Section>
      ) : null}

      <Notice title="How the estimate works">
        <View style={{ gap: 6 }}>
          <T variant="small" tone="soft">
            A one-compartment model with first-order elimination, using published human half-lives. Where a time-to-peak is known, absorption is modelled (Bateman function); otherwise each dose is an instant bolus.
          </T>
          <T variant="small" tone="soft">
            Bioavailability is assumed to be 100 %, and individual metabolism varies widely. These are illustrations, not measurements; only a blood test measures levels.
          </T>
        </View>
      </Notice>
    </Screen>
  );
}
