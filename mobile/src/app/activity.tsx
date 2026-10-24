import { format } from 'date-fns';
import { router } from 'expo-router';
import { Dumbbell, Flame, Footprints, Link2, RefreshCw, Route as RouteIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { averageOf, lastDays, recentWorkouts, STEP_GOAL, todayTotal, weekdayLetter } from '@/features/health/activity';
import { exerciseLabel, minutesBetween, originLabel } from '@/features/health/connect';
import { dateLabel, formatNumber } from '@/features/health/format';
import { syncHealth, useHealthSyncState } from '@/features/health/sync';
import { healthSupported } from '@/lib/health';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { Bars, Ring } from '@/ui/charts';
import { Button, Segmented } from '@/ui/controls';
import { EmptyState, Stat } from '@/ui/feedback';
import { Card, HStack, IconButton, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type Span = '7' | '30';

const whole = (n: number) => Math.round(n).toLocaleString('en-US');

export default function ActivityScreen() {
  const { c } = useTheme();
  const now = useNow();
  const vitals = useStore((s) => s.vitals);
  const workouts = useStore((s) => s.workouts);
  const healthSync = useStore((s) => s.settings.healthSync);
  const syncing = useHealthSyncState((s) => s.syncing);
  const [span, setSpan] = useState<Span>('7');

  const days = Number(span);
  const steps = useMemo(() => lastDays(vitals, 'steps', days, now), [vitals, days, now]);
  const distance = useMemo(() => lastDays(vitals, 'distance', days, now), [vitals, days, now]);
  const kcal = useMemo(() => lastDays(vitals, 'activeKcal', days, now), [vitals, days, now]);
  const exercise = useMemo(() => lastDays(vitals, 'exerciseMin', days, now), [vitals, days, now]);
  const sessions = useMemo(() => recentWorkouts(workouts, 30, now), [workouts, now]);

  const today = {
    steps: todayTotal(vitals, 'steps', now),
    distance: todayTotal(vitals, 'distance', now),
    kcal: todayTotal(vitals, 'activeKcal', now),
    exercise: todayTotal(vitals, 'exerciseMin', now),
  };
  const hasData = steps.some((d) => d.value > 0) || sessions.length > 0;

  if (!hasData && !healthSync) {
    return (
      <Screen back title="Activity">
        <EmptyState
          title="Bring in Google Fit"
          body={
            healthSupported
              ? 'Turn on Health Connect sync in Settings. Steps, distance, active energy, workouts and sleep from Google Fit appear here and feed your insights.'
              : 'Activity syncs from Google Fit through Health Connect in the Android app.'
          }
          action="Open Settings"
          onAction={() => router.push('/settings')}
        />
      </Screen>
    );
  }

  const bars = steps.map((d) => ({ label: days === 7 ? weekdayLetter(d.date) : '', value: d.value }));
  // Today is still in progress, so averages and goal counts use complete days only.
  const done = steps.slice(0, -1);
  const total = (series: { value: number }[]) => series.reduce((a, d) => a + d.value, 0);

  return (
    <Screen
      back
      title="Activity"
      right={
        healthSync && healthSupported ? (
          <IconButton label="Sync now" onPress={() => syncHealth()}>
            <RefreshCw size={18} color={syncing ? c.inkFaint : c.ink} />
          </IconButton>
        ) : undefined
      }>
      <Card style={{ marginBottom: space.lg }}>
        <HStack style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T variant="micro" tone="faint">
              Today
            </T>
            <T variant="metric" style={{ fontSize: 34, lineHeight: 40 }}>
              {today.steps === null ? '—' : whole(today.steps)}
            </T>
            <T tone="soft">steps of {STEP_GOAL.toLocaleString('en-US')}</T>
          </View>
          <Ring value={Math.min(1, (today.steps ?? 0) / STEP_GOAL)} size={72} label={`${Math.round(((today.steps ?? 0) / STEP_GOAL) * 100)}%`} />
        </HStack>
        <HStack style={{ marginTop: space.lg }}>
          <Stat label="Distance" value={today.distance === null ? '—' : formatNumber(today.distance, 1)} unit={today.distance === null ? undefined : 'km'} />
          <Stat label="Active" value={today.kcal === null ? '—' : whole(today.kcal)} unit={today.kcal === null ? undefined : 'kcal'} />
          <Stat label="Exercise" value={today.exercise === null ? '—' : whole(today.exercise)} unit={today.exercise === null ? undefined : 'min'} />
        </HStack>
      </Card>

      <Segmented
        value={span}
        onChange={setSpan}
        options={[
          { value: '7', label: '7 days' },
          { value: '30', label: '30 days' },
        ]}
        style={{ marginBottom: space.lg }}
      />

      <Section title="Steps">
        <Card>
          <Bars values={bars} goal={STEP_GOAL} />
          <HStack style={{ marginTop: space.md }}>
            <Stat label="Daily average" value={whole(averageOf(done) ?? 0)} />
            <Stat label="Days at goal" value={`${done.filter((d) => d.value >= STEP_GOAL).length} / ${done.length}`} />
          </HStack>
        </Card>
      </Section>

      <Section title={`Last ${days} days`}>
        <Card style={{ paddingVertical: space.xs }}>
          <Row title="Distance" subtitle={`${formatNumber(averageOf(distance.slice(0, -1)) ?? 0, 1)} km a day`} right={<T variant="bodyStrong">{formatNumber(total(distance), 1)} km</T>} onPress={() => router.push('/vitals?kind=distance')} />
          <Row title="Active energy" subtitle={`${whole(averageOf(kcal.slice(0, -1)) ?? 0)} kcal a day`} right={<T variant="bodyStrong">{whole(total(kcal))} kcal</T>} onPress={() => router.push('/vitals?kind=activeKcal')} />
          <Row title="Exercise" subtitle={`${exercise.filter((d) => d.value > 0).length} active days`} right={<T variant="bodyStrong">{formatNumber(total(exercise), 0)} min</T>} onPress={() => router.push('/vitals?kind=exerciseMin')} last />
        </Card>
      </Section>

      <Section title="Workouts · 30 days">
        {sessions.length === 0 ? (
          <T tone="soft">No workouts recorded. Sessions you track in Google Fit or on a watch appear here.</T>
        ) : (
          <Card style={{ paddingVertical: space.xs }}>
            {sessions.slice(0, 25).map((w, i) => {
              const Icon = w.type === 79 || w.type === 56 || w.type === 57 || w.type === 37 ? Footprints : w.type === 8 || w.type === 9 ? RouteIcon : w.type === 70 || w.type === 81 ? Dumbbell : Flame;
              const from = originLabel(w.origin);
              return (
                <Row
                  key={w.id}
                  title={w.title || exerciseLabel(w.type)}
                  subtitle={[`${dateLabel(new Date(w.start))} · ${format(new Date(w.start), 'HH:mm')}`, from].filter(Boolean).join(' · ')}
                  left={<Icon size={18} color={c.accent} />}
                  right={
                    <T variant="bodyStrong">
                      {minutesBetween(w.start, w.end)} min{w.distanceKm ? ` · ${formatNumber(w.distanceKm, 1)} km` : ''}
                    </T>
                  }
                  last={i === Math.min(sessions.length, 25) - 1}
                />
              );
            })}
          </Card>
        )}
      </Section>

      {!healthSync ? (
        <Card style={{ marginTop: space.md }} onPress={() => router.push('/settings')}>
          <HStack gap={space.md}>
            <Link2 size={18} color={c.accent} />
            <T style={{ flex: 1 }}>Connect Google Fit through Health Connect to keep this up to date automatically.</T>
          </HStack>
        </Card>
      ) : (
        <Button title="Sleep, heart rate and weight" kind="ghost" small onPress={() => router.push('/vitals?kind=sleep')} style={{ alignSelf: 'center', marginTop: space.md }} />
      )}
    </Screen>
  );
}
