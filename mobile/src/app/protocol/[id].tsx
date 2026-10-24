import { addDays, addWeeks, format, subDays } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { getCompound, ROUTE_LABEL } from '@/data/library';
import { SITE_BY_ID } from '@/data/sites';
import { forecast } from '@/domain/inventory';
import { clearsAt, paramsFor, sampleSeries } from '@/domain/pk';
import { adherence, describeSchedule, doseOn, nextDose, parseDay, titrationStepOn } from '@/domain/schedule';
import { formatAmount, toBase } from '@/domain/units';
import { whenLabel } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { LevelsChart, Ring } from '@/ui/charts';
import { Button } from '@/ui/controls';
import { Badge, EmptyState, Notice, Stat } from '@/ui/feedback';
import { Card, HStack, IconButton, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

const DAY = 86_400_000;

export default function ProtocolDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const protocols = useStore((s) => s.protocols);
  const logs = useStore((s) => s.logs);
  const inventory = useStore((s) => s.inventory);
  const now = useNow();
  const p = protocols.find((x) => x.id === id);
  const compound = getCompound(p?.compoundId);

  const history = useMemo(() => logs.filter((l) => l.protocolId === id).sort((a, b) => b.takenAt.localeCompare(a.takenAt)), [logs, id]);
  const a14 = useMemo(() => (p ? adherence(p, logs, subDays(now, 14), now, now) : null), [p, logs, now]);
  const a30 = useMemo(() => (p ? adherence(p, logs, subDays(now, 30), now, now) : null), [p, logs, now]);

  const levels = useMemo(() => {
    if (!p || !compound?.pk) return null;
    const unit = toBase(p.dose).unit;
    const doses = history.filter((l) => !l.skipped && toBase(l.amount).unit === unit).map((l) => ({ at: new Date(l.takenAt).getTime(), amount: toBase(l.amount).value }));
    if (doses.length === 0) return null;
    const from = now.getTime() - 21 * DAY;
    const to = now.getTime() + 7 * DAY;
    const points = sampleSeries(doses, paramsFor(compound.pk), from, to, 120);
    return { from, to, points, doses: doses.map((d) => d.at), clears: clearsAt(doses, compound.pk), unit };
  }, [p, compound, history, now]);

  if (!p) {
    return (
      <Screen back title="Protocol">
        <EmptyState title="Protocol not found" action="Back to protocols" onAction={() => router.replace('/protocols')} />
      </Screen>
    );
  }

  const inv = p.inventoryId ? inventory.find((i) => i.id === p.inventoryId) : undefined;
  const f = inv ? forecast(inv, protocols.filter((x) => x.inventoryId === inv.id && x.status === 'active'), now) : null;
  const step = titrationStepOn(p, now);
  const next = nextDose(p, now);

  const startDay = parseDay(p.startDate);
  const steps = (p.titration ?? []).map((s, i, all) => {
    const weeksBefore = all.slice(0, i).reduce((sum, x) => sum + x.weeks, 0);
    const start = addWeeks(startDay, weeksBefore);
    return { ...s, i, start, end: addDays(addWeeks(start, s.weeks), -1) };
  });

  return (
    <Screen
      back
      title={p.name}
      right={
        <IconButton label="Edit protocol" onPress={() => router.push(`/protocol/form?id=${p.id}`)}>
          <Pencil size={16} color={c.ink} />
        </IconButton>
      }
      footer={p.status === 'active' ? <Button title="Log a dose" onPress={() => router.push(`/log?protocolId=${p.id}`)} /> : undefined}>
      <HStack style={{ marginBottom: space.sm }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: p.color }} />
        <Badge label={p.status === 'active' ? 'Active' : p.status === 'paused' ? 'Paused' : 'Completed'} tone={p.status === 'active' ? 'positive' : 'neutral'} />
      </HStack>
      <T variant="display">{formatAmount(doseOn(p, now), true)}</T>
      <T tone="soft" style={{ marginBottom: space.xl }}>
        {ROUTE_LABEL[p.route]} · {describeSchedule(p)}
      </T>

      <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.xxl }}>
        <Card style={{ flex: 1 }}>
          <Stat label="Next dose" value={next ? format(next, 'HH:mm') : '—'} sub={whenLabel(next)} />
        </Card>
        <Card style={{ flex: 1 }}>
          <HStack style={{ justifyContent: 'space-between' }}>
            <Stat label="Logged · 14 d" value={a14?.rate == null ? '—' : `${Math.round(a14.rate * 100)}%`} sub={a30?.rate == null ? undefined : `${Math.round(a30.rate * 100)}% over 30 d`} />
            <Ring value={a14?.rate ?? 0} size={40} color={p.color} />
          </HStack>
        </Card>
      </View>

      {steps.length > 0 ? (
        <Section title="Titration">
          <Card style={{ paddingVertical: space.xs }}>
            {steps.map((s) => {
              const current = s.i === step;
              return (
                <View key={s.i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md, borderBottomWidth: s.i < steps.length - 1 ? 1 : 0, borderBottomColor: c.border }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: current ? p.color : c.surfaceAlt }}>
                    <T variant="smallStrong" style={{ color: current ? '#fff' : c.inkSoft }}>
                      {s.i + 1}
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong">{formatAmount(s.dose, true)}</T>
                    <T variant="small" tone="soft">
                      {format(s.start, 'd MMM')} – {s.i === steps.length - 1 ? 'onward' : format(s.end, 'd MMM')} · {s.weeks} wk
                    </T>
                  </View>
                  {current ? <Badge label="Now" tone="accent" /> : null}
                </View>
              );
            })}
          </Card>
        </Section>
      ) : null}

      <Section title="Estimated level">
        {levels ? (
          <Card>
            <LevelsChart series={[{ id: p.id, color: p.color, points: levels.points, doses: levels.doses }]} from={levels.from} to={levels.to} now={now.getTime()} unit={levels.unit === 'iu' ? 'IU' : 'mg'} height={180} />
            <T variant="small" tone="soft" style={{ marginTop: space.sm }}>
              {levels.clears ? `Below ~3 % of the last dose around ${format(levels.clears, 'd MMM')}. ` : ''}Model estimate from logged doses.
            </T>
          </Card>
        ) : (
          <Notice>{compound?.pk ? 'Log a dose to see the estimated level.' : 'No reliable human half-life data, so no level estimate.'}</Notice>
        )}
      </Section>

      <Section title="Supply">
        {inv ? (
          <Card onPress={() => router.push(`/inventory/${inv.id}`)}>
            <T variant="bodyStrong">{inv.name}</T>
            <T variant="small" tone="soft">
              {f?.dosesLeft != null ? `${f.dosesLeft} doses left` : 'Doses left unknown'}
              {f?.runsOutOn ? ` · runs out about ${format(f.runsOutOn, 'd MMM')}` : ''}
            </T>
          </Card>
        ) : (
          <Notice>No vial linked. Edit the protocol to link inventory and get run-out forecasts.</Notice>
        )}
      </Section>

      <Section title="Recent doses" action={history.length > 8 ? <Button title="All" kind="ghost" small onPress={() => router.push('/history')} /> : undefined}>
        {history.length === 0 ? (
          <T tone="soft">No doses logged yet.</T>
        ) : (
          <Card style={{ paddingVertical: space.xs }}>
            {history.slice(0, 8).map((l, i, arr) => (
              <Row
                key={l.id}
                title={format(new Date(l.takenAt), 'EEE d MMM · HH:mm')}
                subtitle={l.skipped ? 'Skipped' : [formatAmount(l.amount, true), l.siteId ? SITE_BY_ID[l.siteId]?.label : null].filter(Boolean).join(' · ')}
                last={i === arr.length - 1}
                right={l.skipped ? <Badge label="Skipped" /> : undefined}
              />
            ))}
          </Card>
        )}
      </Section>

      {p.notes ? (
        <Section title="Notes">
          <T>{p.notes}</T>
        </Section>
      ) : null}
      {p.cycle ? (
        <T variant="small" tone="faint">
          Cycle: {p.cycle.onWeeks} weeks on, {p.cycle.offWeeks} weeks off, from {format(parseDay(p.startDate), 'd MMM yyyy')}.
        </T>
      ) : null}
    </Screen>
  );
}
