import { format } from 'date-fns';
import { router } from 'expo-router';
import { ChevronRight, FlaskConical, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BIOMARKERS, MARKER_GROUP_LABEL, rangeStatus } from '@/data/biomarkers';
import type { LabResult } from '@/domain/model';
import { parseDay } from '@/domain/schedule';
import { trim } from '@/domain/units';
import { GROUP_ORDER, markerFor, rangeForResult, STATUS_BADGE } from '@/features/health/labs';
import { useStore } from '@/store';
import { Sparkline } from '@/ui/charts';
import { Button } from '@/ui/controls';
import { Badge, EmptyState, Notice, Stat } from '@/ui/feedback';
import { Card, Gap, HStack, IconButton, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

const ORDER = new Map(BIOMARKERS.map((b, i) => [b.id, i]));

export default function LabsScreen() {
  const { c } = useTheme();
  const labs = useStore((s) => s.labs);
  const sex = useStore((s) => s.settings.sex);

  const rows = useMemo(() => {
    const byMarker = new Map<string, LabResult[]>();
    for (const r of labs) byMarker.set(r.markerId, [...(byMarker.get(r.markerId) ?? []), r]);
    return [...byMarker.entries()]
      .map(([id, results]) => {
        const sorted = results.slice().sort((a, b) => a.date.localeCompare(b.date));
        const marker = markerFor(id);
        const latest = sorted[sorted.length - 1];
        return { marker, sorted, latest, status: rangeStatus(latest.value, rangeForResult(latest, marker, sex)) };
      })
      .sort((a, b) => (ORDER.get(a.marker.id) ?? 999) - (ORDER.get(b.marker.id) ?? 999) || a.marker.name.localeCompare(b.marker.name));
  }, [labs, sex]);

  const groups = useMemo(() => GROUP_ORDER.map((g) => ({ group: g, rows: rows.filter((r) => r.marker.group === g) })).filter((g) => g.rows.length > 0), [rows]);
  const outside = rows.filter((r) => r.status === 'low' || r.status === 'high').length;
  const lastDate = rows.reduce<string | null>((d, r) => (!d || r.latest.date > d ? r.latest.date : d), null);

  const add = () => router.push('/labs/add');

  return (
    <Screen
      back
      title="Labs"
      right={
        <IconButton label="Add lab results" onPress={add}>
          <Plus size={20} color={c.ink} />
        </IconButton>
      }>
      {rows.length === 0 ? (
        <>
          <EmptyState
            icon={<FlaskConical size={22} color={c.accent} />}
            title="No lab results yet"
            body="Enter results from a lab report to follow each marker over time and see where it sits against its reference range."
            action="Add results"
            onAction={add}
          />
          <Gap size={space.lg} />
          <Notice>Reference ranges vary between labs; the range on your report takes precedence.</Notice>
        </>
      ) : (
        <>
          <Card style={{ marginBottom: space.lg }}>
            <HStack style={{ alignItems: 'flex-start' }}>
              <Stat label="Markers" value={String(rows.length)} sub={lastDate ? `Latest ${format(parseDay(lastDate), 'd MMM yyyy')}` : undefined} />
              <Stat label="Outside range" value={String(outside)} sub="Based on latest results" tone={outside > 0 ? 'warn' : undefined} />
            </HStack>
          </Card>
          <View style={{ marginBottom: space.xxl }}>
            <Notice>Reference ranges vary between labs; the range on your report takes precedence.</Notice>
          </View>

          {groups.map(({ group, rows: list }) => (
            <Section key={group} title={MARKER_GROUP_LABEL[group]}>
              <Card style={{ paddingVertical: 0 }}>
                {list.map(({ marker, sorted, latest, status }, i) => {
                  const badge = STATUS_BADGE[status];
                  return (
                    <Pressable
                      key={marker.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${marker.name}, ${trim(latest.value)} ${marker.unit}, ${badge.label}`}
                      onPress={() => router.push(`/labs/${encodeURIComponent(marker.id)}`)}
                      style={({ pressed }) => pressed && { opacity: 0.6 }}>
                      <View style={[styles.row, i < list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
                        <View style={{ flex: 1 }}>
                          <T variant="bodyStrong" numberOfLines={1}>
                            {marker.name}
                          </T>
                          <T variant="small" tone="soft" numberOfLines={1}>
                            {format(parseDay(latest.date), 'd MMM yyyy')}
                            {sorted.length > 1 ? ` · ${sorted.length} results` : ''}
                          </T>
                        </View>
                        {sorted.length >= 2 ? (
                          <View style={{ marginHorizontal: space.sm }}>
                            <Sparkline points={sorted.map((r) => ({ t: parseDay(r.date).getTime(), v: r.value }))} color={c.accent} width={56} height={28} />
                          </View>
                        ) : null}
                        <View style={styles.value}>
                          <T variant="bodyStrong" tabular numberOfLines={1}>
                            {trim(latest.value)}
                            {marker.unit ? (
                              <T variant="small" tone="soft">
                                {' '}
                                {marker.unit}
                              </T>
                            ) : null}
                          </T>
                          <Badge label={badge.label} tone={badge.tone} style={{ alignSelf: 'flex-end', marginTop: 4 }} />
                        </View>
                        <ChevronRight size={18} color={c.inkFaint} style={{ marginLeft: space.xs }} />
                      </View>
                    </Pressable>
                  );
                })}
              </Card>
            </Section>
          ))}

          <Button title="Add results" kind="secondary" icon={<Plus size={18} color={c.ink} />} onPress={add} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  value: { alignItems: 'flex-end', marginLeft: space.sm, maxWidth: 150 },
});
