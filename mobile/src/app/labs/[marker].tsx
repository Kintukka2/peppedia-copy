import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { FlaskConical, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BIOMARKER_BY_ID, MARKER_GROUP_LABEL, rangeFor, rangeStatus } from '@/data/biomarkers';
import { parseDay } from '@/domain/schedule';
import { trim } from '@/domain/units';
import { ConfirmBar, TrashButton } from '@/features/health/components';
import { axisValue } from '@/features/health/format';
import { formatRange, hasReportRange, markerFor, rangeBasis, rangeForResult, STATUS_BADGE } from '@/features/health/labs';
import { useStore } from '@/store';
import { TrendChart } from '@/ui/charts';
import { Badge, EmptyState, Notice, Stat } from '@/ui/feedback';
import { Card, HStack, IconButton, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

export default function MarkerScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ marker: string }>();
  const markerId = String(params.marker ?? '');
  const labs = useStore((s) => s.labs);
  const sex = useStore((s) => s.settings.sex);
  const deleteLab = useStore((s) => s.deleteLab);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const marker = markerFor(markerId);
  const known = !!BIOMARKER_BY_ID[markerId];
  const results = useMemo(() => labs.filter((r) => r.markerId === markerId).sort((a, b) => a.date.localeCompare(b.date)), [labs, markerId]);
  const newestFirst = useMemo(() => [...results].reverse(), [results]);
  const points = useMemo(() => results.map((r) => ({ t: parseDay(r.date).getTime(), v: r.value })), [results]);
  const latest = results.length ? results[results.length - 1] : null;
  const typical = rangeFor(marker, sex);
  const latestStatus = latest ? rangeStatus(latest.value, rangeForResult(latest, marker, sex)) : null;

  const addHref = known ? `/labs/add?marker=${encodeURIComponent(markerId)}` : '/labs/add';

  return (
    <Screen
      back
      title={marker.name}
      right={
        <IconButton label={`Add ${marker.name} result`} onPress={() => router.push(addHref)}>
          <Plus size={20} color={c.ink} />
        </IconButton>
      }>
      <HStack style={{ marginBottom: space.lg }}>
        <Badge label={MARKER_GROUP_LABEL[marker.group]} />
        {marker.unit ? (
          <T variant="small" tone="soft">
            Measured in {marker.unit}
          </T>
        ) : null}
      </HStack>

      {latest && latestStatus ? (
        <Card style={{ marginBottom: space.lg }}>
          <HStack style={{ alignItems: 'flex-start' }}>
            <Stat label="Latest" value={trim(latest.value)} unit={marker.unit} sub={format(parseDay(latest.date), 'd MMM yyyy')} />
            <Badge label={STATUS_BADGE[latestStatus].label} tone={STATUS_BADGE[latestStatus].tone} />
          </HStack>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <T variant="micro" tone="faint">
            Reference range
          </T>
          <T variant="bodyStrong" style={{ marginTop: 4 }}>
            {formatRange(typical, marker.unit)}
          </T>
          <T variant="small" tone="soft">
            {rangeBasis(marker, sex)}
          </T>
          {hasReportRange(latest) ? (
            <>
              <T variant="bodyStrong" style={{ marginTop: space.sm }}>
                {formatRange({ low: latest.refLow, high: latest.refHigh }, marker.unit)}
              </T>
              <T variant="small" tone="soft">
                From your latest report; used for its status.
              </T>
            </>
          ) : null}
        </Card>
      ) : null}

      {marker.relevance || marker.note ? (
        <Section title="Why it’s tracked">
          {marker.relevance ? <T style={{ marginBottom: marker.note ? space.md : 0 }}>{marker.relevance}</T> : null}
          {marker.note ? <Notice>{marker.note}</Notice> : null}
        </Section>
      ) : null}

      {results.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={22} color={c.accent} />}
          title={known ? `No ${marker.name} results` : 'Marker not found'}
          body={known ? 'Results you enter from a lab report appear here with a trend over time.' : 'This marker isn’t in the list and has no results.'}
          action={known ? 'Add a result' : 'Back to labs'}
          onAction={() => (known ? router.push(addHref) : router.replace('/labs'))}
        />
      ) : (
        <>
          {results.length >= 2 ? (
            <Section title="Trend">
              <Card style={{ paddingHorizontal: space.sm }}>
                <TrendChart points={points} formatValue={axisValue} />
              </Card>
            </Section>
          ) : null}

          <Section
            title="Results"
            action={
              <T variant="small" tone="faint">
                {results.length}
              </T>
            }>
            <Card style={{ paddingVertical: space.xs }}>
              {newestFirst.map((r, i) => {
                const status = STATUS_BADGE[rangeStatus(r.value, rangeForResult(r, marker, sex))];
                const last = i === newestFirst.length - 1;
                const details = [r.labName, hasReportRange(r) ? `Report range ${formatRange({ low: r.refLow, high: r.refHigh })}` : null, r.notes].filter(Boolean).join(' · ');
                return (
                  <View key={r.id}>
                    <View style={[styles.row, !(last && confirmId !== r.id) && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" tabular>
                          {trim(r.value)}
                          {marker.unit ? (
                            <T variant="small" tone="soft">
                              {' '}
                              {marker.unit}
                            </T>
                          ) : null}
                        </T>
                        <T variant="small" tone="soft" numberOfLines={2}>
                          {format(parseDay(r.date), 'd MMM yyyy')}
                          {details ? ` · ${details}` : ''}
                        </T>
                      </View>
                      <Badge label={status.label} tone={status.tone} style={{ alignSelf: 'center', marginLeft: space.sm }} />
                      <TrashButton label={`Delete result from ${r.date}`} onPress={() => setConfirmId(confirmId === r.id ? null : r.id)} />
                    </View>
                    {confirmId === r.id ? (
                      <ConfirmBar
                        message="Delete this result?"
                        onCancel={() => setConfirmId(null)}
                        onConfirm={() => {
                          deleteLab(r.id);
                          setConfirmId(null);
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </Card>
          </Section>

          <Notice>Reference ranges vary between labs; the range on your report takes precedence. Discuss results with a clinician.</Notice>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.md },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: space.md },
});
