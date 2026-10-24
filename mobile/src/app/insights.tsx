import { router } from 'expo-router';
import { ChevronRight, CircleCheck, Info, Lightbulb, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { buildInsights, type Insight, type InsightTone } from '@/domain/insights';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { Segmented } from '@/ui/controls';
import { EmptyState, Notice } from '@/ui/feedback';
import { Card, HStack, Screen } from '@/ui/layout';
import { T } from '@/ui/text';
import { radius, space, useTheme, type Palette } from '@/ui/theme';

type Window = '14' | '30' | '90';

function toneStyle(c: Palette, tone: InsightTone) {
  switch (tone) {
    case 'attention':
      return { fg: c.warn, bg: c.warnSoft, Icon: TriangleAlert };
    case 'positive':
      return { fg: c.positive, bg: c.positiveSoft, Icon: CircleCheck };
    default:
      return { fg: c.inkSoft, bg: c.surfaceAlt, Icon: Info };
  }
}

export default function InsightsScreen() {
  const { c } = useTheme();
  const protocols = useStore((s) => s.protocols);
  const logs = useStore((s) => s.logs);
  const inventory = useStore((s) => s.inventory);
  const vitals = useStore((s) => s.vitals);
  const journal = useStore((s) => s.journal);
  const labs = useStore((s) => s.labs);
  const sex = useStore((s) => s.settings.sex);
  const weightUnit = useStore((s) => s.settings.weightUnit);
  const now = useNow();
  const [windowDays, setWindowDays] = useState<Window>('14');

  const insights = useMemo(
    () => buildInsights({ protocols, logs, inventory, vitals, journal, labs, weightUnit, sex, now, windowDays: Number(windowDays) }),
    [protocols, logs, inventory, vitals, journal, labs, weightUnit, sex, now, windowDays],
  );

  const card = (i: Insight) => {
    const t = toneStyle(c, i.tone);
    const href = i.href;
    return (
      <Card key={i.id} onPress={href ? () => router.push(href) : undefined} style={[styles.card, { borderLeftColor: t.fg }]}>
        <HStack gap={space.md} style={{ alignItems: 'flex-start' }}>
          <View style={[styles.icon, { backgroundColor: t.bg }]}>
            <t.Icon size={16} color={t.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{i.title}</T>
            <T variant="small" tone="soft" style={{ marginTop: 2 }}>
              {i.body}
            </T>
          </View>
          {href ? <ChevronRight size={18} color={c.inkFaint} style={{ marginTop: 6 }} /> : null}
        </HStack>
      </Card>
    );
  };

  return (
    <Screen back title="Insights">
      <View style={{ marginBottom: space.lg }}>
        <Notice>Observations from your own records. They describe timing and trends, not causes, and are not medical advice.</Notice>
      </View>

      <Segmented
        value={windowDays}
        onChange={setWindowDays}
        options={[
          { value: '14', label: '14 days' },
          { value: '30', label: '30 days' },
          { value: '90', label: '90 days' },
        ]}
      />
      <T variant="small" tone="faint" style={{ marginTop: space.sm, marginBottom: space.xl }}>
        The window applies to adherence, symptoms and mood. Weight uses the last 30 days; stock and labs use current values.
      </T>

      {insights.length === 0 ? (
        <EmptyState icon={<Lightbulb size={22} color={c.accent} />} title="Nothing to show yet" body="Insights appear as you log doses, vitals, check-ins and lab results." />
      ) : (
        insights.map(card)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md, borderLeftWidth: 3 },
  icon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
