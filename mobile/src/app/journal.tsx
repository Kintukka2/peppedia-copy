import { format, subDays } from 'date-fns';
import { router } from 'expo-router';
import { ChevronRight, NotebookPen, Plus, Smile } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayKey, parseDay } from '@/domain/schedule';
import { scaleLabel } from '@/features/health/checkin';
import { ScaleDots } from '@/features/health/components';
import { dateLabel } from '@/features/health/format';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { Badge, EmptyState } from '@/ui/feedback';
import { Card, HStack, IconButton, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { radius, space, useTheme } from '@/ui/theme';

const WINDOW_DAYS = 60;

export default function JournalScreen() {
  const { c } = useTheme();
  const journal = useStore((s) => s.journal);
  const now = useNow();
  const todayKey = dayKey(now);

  const today = useMemo(() => journal.find((j) => j.date === todayKey), [journal, todayKey]);
  const recent = useMemo(() => {
    const from = dayKey(subDays(parseDay(todayKey), WINDOW_DAYS - 1));
    return journal.filter((j) => j.date >= from && j.date <= todayKey).sort((a, b) => b.date.localeCompare(a.date));
  }, [journal, todayKey]);
  const older = journal.length - recent.length;

  const todaySummary = today
    ? [
        today.mood ? `Mood ${scaleLabel(today.mood)}` : null,
        today.energy ? `Energy ${scaleLabel(today.energy)}` : null,
        today.symptoms.length ? `${today.symptoms.length} symptom${today.symptoms.length === 1 ? '' : 's'}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Notes only'
    : null;

  return (
    <Screen
      back
      title="Journal"
      right={
        <IconButton label="Check in today" onPress={() => router.push('/checkin?date=today')}>
          <Plus size={20} color={c.ink} />
        </IconButton>
      }>
      <Card onPress={() => router.push('/checkin?date=today')} tint={today ? undefined : c.accentSoft} style={{ marginBottom: space.xxl }}>
        <HStack gap={space.md}>
          <View style={[styles.icon, { backgroundColor: today ? c.accentSoft : c.surface }]}>
            <Smile size={22} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading">How are you today?</T>
            <T variant="small" tone="soft" style={{ marginTop: 2 }}>
              {todaySummary ? `${todaySummary}. Tap to edit.` : 'Mood, energy and any symptoms. A few seconds a day builds a record you can look back on.'}
            </T>
          </View>
          <ChevronRight size={18} color={c.inkFaint} />
        </HStack>
      </Card>

      {recent.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={22} color={c.accent} />}
          title="No check-ins yet"
          body="Daily check-ins record mood, energy and symptoms. Insights can then show their timing alongside your dose log."
        />
      ) : (
        <Section
          title={`Last ${WINDOW_DAYS} days`}
          action={
            <T variant="small" tone="faint">
              {recent.length} check-in{recent.length === 1 ? '' : 's'}
            </T>
          }>
          <Card style={{ paddingVertical: 0 }}>
            {recent.map((j, i) => {
              const day = parseDay(j.date);
              return (
                <Pressable
                  key={j.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Check-in ${format(day, 'EEEE d MMMM')}`}
                  onPress={() => router.push(`/checkin?date=${j.date}`)}
                  style={({ pressed }) => pressed && { opacity: 0.6 }}>
                  <View style={[styles.entry, i < recent.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
                    <HStack style={{ justifyContent: 'space-between' }}>
                      <T variant="bodyStrong">{dateLabel(day, now)}</T>
                      <ChevronRight size={16} color={c.inkFaint} />
                    </HStack>
                    {j.mood || j.energy ? (
                      <HStack wrap gap={space.lg} style={{ marginTop: 6 }}>
                        {j.mood ? <ScaleDots label="Mood" value={j.mood} /> : null}
                        {j.energy ? <ScaleDots label="Energy" value={j.energy} /> : null}
                      </HStack>
                    ) : null}
                    {j.symptoms.length > 0 ? (
                      <HStack wrap gap={6} style={{ marginTop: space.sm }}>
                        {j.symptoms.map((s) => (
                          <Badge key={s} label={s} />
                        ))}
                      </HStack>
                    ) : null}
                    {j.notes ? (
                      <T variant="small" tone="soft" numberOfLines={2} style={{ marginTop: 6 }}>
                        {j.notes}
                      </T>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </Card>
          {older > 0 ? (
            <T variant="small" tone="faint" center style={{ marginTop: space.sm }}>
              {older} older check-in{older === 1 ? '' : 's'} not shown.
            </T>
          ) : null}
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  entry: { paddingVertical: space.md },
});
