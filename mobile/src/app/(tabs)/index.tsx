import { format, startOfDay, subDays } from 'date-fns';
import { router } from 'expo-router';
import { Activity, BookOpen, Check, ChevronRight, Droplets, Footprints, Package, Plus, Scale, ShieldAlert, SkipForward, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { COMPOUNDS, getCompound } from '@/data/library';
import { buildInsights } from '@/domain/insights';
import { checkStack, LEVEL_LABEL } from '@/domain/interactions';
import { alerts, ALERT_LABEL, drawFor, forecast } from '@/domain/inventory';
import { adherence, agendaForDay, dayKey, slotsOnDay, type AgendaItem } from '@/domain/schedule';
import { formatAmount, fromKg, trim } from '@/domain/units';
import { hasActivity, lastDays, STEP_GOAL, todayTotal } from '@/features/health/activity';
import { formatNumber } from '@/features/health/format';
import { greeting } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { Button } from '@/ui/controls';
import { Badge, EmptyState, LEVEL_TONE } from '@/ui/feedback';
import { Ring, Sparkline } from '@/ui/charts';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { radius, space, useTheme } from '@/ui/theme';

const MOOD_FACE = ['', '😣', '😕', '😐', '🙂', '😄'];

export default function TodayScreen() {
  const { c } = useTheme();
  const now = useNow();
  const protocols = useStore((s) => s.protocols);
  const logs = useStore((s) => s.logs);
  const inventory = useStore((s) => s.inventory);
  const vitals = useStore((s) => s.vitals);
  const journal = useStore((s) => s.journal);
  const labs = useStore((s) => s.labs);
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const logDose = useStore((s) => s.logDose);

  const today = startOfDay(now);
  const active = useMemo(() => protocols.filter((p) => p.status === 'active'), [protocols]);
  const agenda = useMemo(() => agendaForDay(active, logs, now), [active, logs, now]);

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const key = dayKey(d);
      const entry = journal.find((j) => j.date === key);
      const scheduled = active.some((p) => slotsOnDay(p, d).length > 0);
      return { d, key, mood: entry?.mood, scheduled };
    });
  }, [today, journal, active]);

  const adherence14 = useMemo(() => {
    let scheduled = 0;
    let taken = 0;
    for (const p of active) {
      const a = adherence(p, logs, subDays(today, 13), now, now);
      scheduled += a.scheduled;
      taken += a.taken;
    }
    return scheduled > 0 ? taken / scheduled : null;
  }, [active, logs, today, now]);

  const weights = useMemo(
    () =>
      vitals
        .filter((v) => v.kind === 'weight' && new Date(v.at) >= subDays(now, 30))
        .map((v) => ({ t: new Date(v.at).getTime(), v: v.value }))
        .sort((a, b) => a.t - b.t),
    [vitals, now],
  );

  const stack = useMemo(() => {
    const seen = new Set<string>();
    const items = [];
    for (const p of active) {
      const key = p.compoundId ?? p.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ compound: getCompound(p.compoundId), name: p.name });
    }
    return checkStack(items);
  }, [active]);

  const stockIssues = useMemo(() => {
    const out: { id: string; name: string; text: string }[] = [];
    for (const item of inventory) {
      const f = forecast(item, active.filter((p) => p.inventoryId === item.id), now);
      const a = alerts(item, now);
      if (f.daysLeft !== null && f.daysLeft <= 14) out.push({ id: item.id, name: item.name, text: `About ${Math.max(0, Math.floor(f.daysLeft))} days left` });
      else if (a.length) out.push({ id: item.id, name: item.name, text: a.map((x) => ALERT_LABEL[x]).join(' · ') });
    }
    return out;
  }, [inventory, active, now]);

  const insights = useMemo(
    () => buildInsights({ protocols, logs, inventory, vitals, journal, labs, workouts, sex: settings.sex, weightUnit: settings.weightUnit, now }).filter((i) => i.tone !== 'neutral').slice(0, 2),
    [protocols, logs, inventory, vitals, journal, labs, workouts, settings.sex, settings.weightUnit, now],
  );

  const activity = useMemo(() => {
    if (!settings.healthSync && !hasActivity(vitals, workouts)) return null;
    const week = lastDays(vitals, 'steps', 7, now);
    // Days without data are left out of the sparkline so a quiet morning doesn't read as a crash.
    return { steps: todayTotal(vitals, 'steps', now), exercise: todayTotal(vitals, 'exerciseMin', now), week: week.map((d, i) => ({ t: i, v: d.value })).filter((p) => p.v > 0) };
  }, [settings.healthSync, vitals, workouts, now]);

  const featured = COMPOUNDS.length ? COMPOUNDS[Math.floor(now.getTime() / 86_400_000) % COMPOUNDS.length] : null;
  const isNew = protocols.length === 0 && logs.length === 0;

  const skip = (item: AgendaItem) =>
    logDose({
      protocolId: item.protocol.id,
      compoundId: item.protocol.compoundId,
      name: item.protocol.name,
      takenAt: new Date().toISOString(),
      scheduledFor: item.at.toISOString(),
      amount: item.dose,
      route: item.protocol.route,
      skipped: true,
    });

  const latestWeight = weights.length ? weights[weights.length - 1].v : null;
  const weekAgo = weights.find((w) => w.t >= subDays(now, 8).getTime());
  const weightDelta = latestWeight !== null && weekAgo ? latestWeight - weekAgo.v : null;
  const worst = stack[0];

  return (
    <Screen>
      <T variant="micro" tone="soft">
        {format(now, 'EEEE d MMMM')}
      </T>
      <T variant="display" style={{ marginTop: 4, marginBottom: space.xl }}>
        {greeting(now)}
      </T>

      <View style={styles.week}>
        {week.map((d) => {
          const isToday = d.key === dayKey(now);
          return (
            <Pressable key={d.key} accessibilityLabel={`Check in for ${format(d.d, 'EEEE')}`} onPress={() => router.push(`/checkin?date=${d.key}`)} style={styles.weekDay}>
              <T variant="small" tone={isToday ? 'accent' : 'faint'} style={{ fontSize: 11 }}>
                {format(d.d, 'EEEEE')}
              </T>
              <View style={[styles.weekBubble, { backgroundColor: d.mood ? c.surface : c.surfaceAlt, borderColor: isToday ? c.accent : c.border }]}>
                {d.mood ? <T style={{ fontSize: 18, lineHeight: 22 }}>{MOOD_FACE[d.mood]}</T> : <Plus size={16} color={c.inkFaint} />}
              </View>
              <View style={[styles.weekDot, { backgroundColor: d.scheduled ? c.accent : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      {isNew ? (
        <Section title="Get started">
          <EmptyState
            icon={<Sparkles size={22} color={c.accent} />}
            title="Your log is empty"
            body="Add a protocol to get reminders, estimated levels and supply forecasts. Everything stays on this device."
            action="Add a protocol"
            onAction={() => router.push('/protocol/form')}
          />
          <HStack style={{ marginTop: space.md }} wrap>
            <Button title="Browse the library" kind="secondary" small icon={<BookOpen size={16} color={c.ink} />} onPress={() => router.push('/library')} />
            <Button title="Explore with sample data" kind="ghost" small onPress={() => router.push('/settings')} />
          </HStack>
        </Section>
      ) : (
        <Section title="Today's doses" action={<Button title="Log other" kind="ghost" small onPress={() => router.push('/log')} />}>
          {agenda.length === 0 ? (
            <Card>
              <T tone="soft">Nothing scheduled today.</T>
            </Card>
          ) : (
            <Card style={{ paddingVertical: space.xs }}>
              {agenda.map((item, i) => {
                const inv = item.protocol.inventoryId ? inventory.find((x) => x.id === item.protocol.inventoryId) : undefined;
                const draw = inv ? drawFor(inv, item.dose) : null;
                const done = item.log && !item.log.skipped;
                const skipped = item.log?.skipped;
                const overdue = !item.log && item.at < now;
                return (
                  <View key={item.protocol.id + item.at.toISOString()} style={[styles.dose, i < agenda.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
                    <View style={[styles.doseBar, { backgroundColor: item.protocol.color }]} />
                    <View style={{ flex: 1 }}>
                      <HStack gap={6}>
                        <T variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {item.protocol.name}
                        </T>
                        {overdue ? <Badge label="Overdue" tone="warn" /> : null}
                      </HStack>
                      <T variant="small" tone="soft">
                        {format(item.at, 'HH:mm')} · {formatAmount(item.dose, true)}
                        {draw ? ` · ${trim(draw.units, 1)} units (${trim(draw.volumeMl, 3)} mL)` : ''}
                      </T>
                    </View>
                    {done ? (
                      <HStack gap={4}>
                        <Check size={18} color={c.positive} />
                        <T variant="smallStrong" tone="positive">
                          {format(new Date(item.log!.takenAt), 'HH:mm')}
                        </T>
                      </HStack>
                    ) : skipped ? (
                      <Badge label="Skipped" />
                    ) : (
                      <HStack gap={6}>
                        <Pressable accessibilityLabel={`Skip ${item.protocol.name}`} onPress={() => skip(item)} hitSlop={8} style={[styles.round, { borderColor: c.border }]}>
                          <SkipForward size={16} color={c.inkFaint} />
                        </Pressable>
                        <Button title="Log" small onPress={() => router.push(`/log?protocolId=${item.protocol.id}&scheduledFor=${encodeURIComponent(item.at.toISOString())}`)} />
                      </HStack>
                    )}
                  </View>
                );
              })}
            </Card>
          )}
        </Section>
      )}

      {!isNew && (
        <View style={styles.tiles}>
          <Card style={styles.tile} onPress={() => router.push('/history')}>
            <T variant="micro" tone="faint">
              Adherence · 14 d
            </T>
            <HStack style={{ marginTop: space.sm, justifyContent: 'space-between' }}>
              <T variant="metric">{adherence14 === null ? '—' : `${Math.round(adherence14 * 100)}%`}</T>
              <Ring value={adherence14 ?? 0} size={40} />
            </HStack>
          </Card>
          <Card style={styles.tile} onPress={() => router.push('/vitals')}>
            <HStack style={{ justifyContent: 'space-between' }}>
              <T variant="micro" tone="faint">
                Weight
              </T>
              <Scale size={14} color={c.inkFaint} />
            </HStack>
            <T variant="metric" style={{ marginTop: space.sm }}>
              {latestWeight === null ? '—' : trim(fromKg(latestWeight, settings.weightUnit), 1)}
              {latestWeight === null ? null : <T tone="soft"> {settings.weightUnit}</T>}
            </T>
            <HStack style={{ justifyContent: 'space-between' }}>
              <T variant="small" tone="soft">
                {weightDelta === null ? 'Add weigh-ins' : `${weightDelta <= 0 ? '−' : '+'}${trim(Math.abs(fromKg(weightDelta, settings.weightUnit)), 1)} vs last week`}
              </T>
            </HStack>
            {weights.length > 1 ? (
              <View style={{ marginTop: 6 }}>
                <Sparkline points={weights} color={c.accent} width={120} height={28} />
              </View>
            ) : null}
          </Card>
        </View>
      )}

      {activity ? (
        <Card onPress={() => router.push('/activity')} style={{ marginBottom: space.md }}>
          <HStack style={{ justifyContent: 'space-between' }}>
            <HStack gap={space.md} style={{ flex: 1 }}>
              <View style={[styles.iconTile, { backgroundColor: c.accentSoft }]}>
                <Footprints size={18} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{activity.steps === null ? 'No steps yet today' : `${Math.round(activity.steps).toLocaleString('en-US')} steps`}</T>
                <T variant="small" tone="soft" numberOfLines={1}>
                  {activity.exercise ? `${formatNumber(activity.exercise, 0)} min exercise · ` : ''}
                  {settings.healthSync ? 'Google Fit via Health Connect' : 'Activity'}
                </T>
              </View>
            </HStack>
            {activity.week.length > 1 ? <Sparkline points={activity.week} color={c.accent} width={72} height={28} /> : null}
            <Ring value={Math.min(1, (activity.steps ?? 0) / STEP_GOAL)} size={36} />
          </HStack>
        </Card>
      ) : null}

      {!isNew && (
        <Section>
          <Card onPress={() => router.push('/levels')} style={{ marginBottom: space.md }}>
            <HStack style={{ justifyContent: 'space-between' }}>
              <HStack gap={space.md}>
                <View style={[styles.iconTile, { backgroundColor: c.accentSoft }]}>
                  <Activity size={18} color={c.accent} />
                </View>
                <View>
                  <T variant="bodyStrong">Estimated levels</T>
                  <T variant="small" tone="soft">
                    Half-life curves from your logged doses
                  </T>
                </View>
              </HStack>
              <ChevronRight size={18} color={c.inkFaint} />
            </HStack>
          </Card>
          {worst ? (
            <Card onPress={() => router.push('/interactions')} style={{ marginBottom: space.md }}>
              <HStack style={{ justifyContent: 'space-between' }}>
                <HStack gap={space.md} style={{ flex: 1 }}>
                  <View style={[styles.iconTile, { backgroundColor: c.warnSoft }]}>
                    <ShieldAlert size={18} color={c.warn} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong">Stack check</T>
                    <T variant="small" tone="soft" numberOfLines={1}>
                      {stack.length} pair{stack.length === 1 ? '' : 's'} · {worst.a.name} + {worst.b.name}
                    </T>
                  </View>
                </HStack>
                <Badge label={LEVEL_LABEL[worst.level]} tone={LEVEL_TONE[worst.level]} />
              </HStack>
            </Card>
          ) : null}
          {stockIssues.map((s) => (
            <Card key={s.id} onPress={() => router.push(`/inventory/${s.id}`)} style={{ marginBottom: space.md }}>
              <HStack gap={space.md}>
                <View style={[styles.iconTile, { backgroundColor: c.surfaceAlt }]}>
                  <Package size={18} color={c.inkSoft} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{s.name}</T>
                  <T variant="small" tone="warn">
                    {s.text}
                  </T>
                </View>
                <ChevronRight size={18} color={c.inkFaint} />
              </HStack>
            </Card>
          ))}
        </Section>
      )}

      {insights.length > 0 && (
        <Section title="Worth a look" action={<Button title="All insights" kind="ghost" small onPress={() => router.push('/insights')} />}>
          {insights.map((i) => (
            <Card key={i.id} onPress={i.href ? () => router.push(i.href!) : undefined} style={{ marginBottom: space.md, borderLeftWidth: 3, borderLeftColor: i.tone === 'attention' ? c.warn : c.positive }}>
              <T variant="bodyStrong">{i.title}</T>
              <T variant="small" tone="soft" style={{ marginTop: 2 }}>
                {i.body}
              </T>
            </Card>
          ))}
        </Section>
      )}

      {featured && (
        <Section title="From the library">
          <Card onPress={() => router.push(`/compound/${featured.id}`)} tint={c.accentSoft} style={{ borderColor: 'transparent' }}>
            <HStack gap={space.md}>
              <Droplets size={20} color={c.accent} />
              <View style={{ flex: 1 }}>
                <T variant="heading">{featured.name}</T>
                <T variant="small" tone="soft" numberOfLines={2}>
                  {featured.summary}
                </T>
              </View>
              <ChevronRight size={18} color={c.accent} />
            </HStack>
          </Card>
        </Section>
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.xxl },
  weekDay: { alignItems: 'center', gap: 6, flex: 1 },
  weekBubble: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  weekDot: { width: 5, height: 5, borderRadius: 3 },
  dose: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md },
  doseBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  round: { width: 36, height: 36, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  tile: { flex: 1 },
  iconTile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
