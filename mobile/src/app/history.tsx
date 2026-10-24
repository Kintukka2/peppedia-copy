import { format } from 'date-fns';
import { History } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ROUTE_SHORT } from '@/data/library';
import { SITE_BY_ID } from '@/data/sites';
import type { DoseLog } from '@/domain/model';
import { dayKey, parseDay } from '@/domain/schedule';
import { formatAmount, trim } from '@/domain/units';
import { ConfirmBar, TrashButton } from '@/features/health/components';
import { dateLabel } from '@/features/health/format';
import { useStore } from '@/store';
import { Button, Chip } from '@/ui/controls';
import { Badge, Dot, EmptyState } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

const PAGE = 60;
const ALL = 'all';
const NONE = 'none';

export default function HistoryScreen() {
  const { c } = useTheme();
  const logs = useStore((s) => s.logs);
  const protocols = useStore((s) => s.protocols);
  const inventory = useStore((s) => s.inventory);
  const deleteLog = useStore((s) => s.deleteLog);

  const [filter, setFilter] = useState<string>(ALL);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const protocolById = useMemo(() => new Map(protocols.map((p) => [p.id, p])), [protocols]);
  const sorted = useMemo(() => logs.slice().sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()), [logs]);

  const filters = useMemo(() => {
    const keys = new Set(logs.map((l) => (l.protocolId && protocolById.has(l.protocolId) ? l.protocolId : NONE)));
    const list: { id: string; label: string; color?: string }[] = protocols
      .filter((p) => keys.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, label: p.name, color: p.color }));
    if (keys.has(NONE) && list.length > 0) list.push({ id: NONE, label: 'No protocol' });
    return list;
  }, [logs, protocols, protocolById]);

  // If the selected protocol no longer has logs (e.g. its last one was deleted), fall back to All.
  const active = filter !== ALL && filters.some((f) => f.id === filter) ? filter : ALL;
  const filtered = useMemo(() => (active === ALL ? sorted : sorted.filter((l) => (l.protocolId && protocolById.has(l.protocolId) ? l.protocolId : NONE) === active)), [sorted, active, protocolById]);

  const days = useMemo(() => {
    const out: { key: string; logs: DoseLog[] }[] = [];
    for (const l of filtered.slice(0, limit)) {
      const key = dayKey(new Date(l.takenAt));
      const last = out[out.length - 1];
      if (last && last.key === key) last.logs.push(l);
      else out.push({ key, logs: [l] });
    }
    return out;
  }, [filtered, limit]);

  const skipped = filtered.filter((l) => l.skipped).length;

  const pickFilter = (id: string) => {
    setFilter(id);
    setConfirmId(null);
    setLimit(PAGE);
  };

  const confirmMessage = (l: DoseLog) => {
    const item = !l.skipped && l.inventoryId ? inventory.find((i) => i.id === l.inventoryId) : undefined;
    return item ? `Delete this log? ${formatAmount(l.amount)} is added back to ${item.name}.` : 'Delete this log from your history?';
  };

  return (
    <Screen back title="Dose history">
      {logs.length === 0 ? (
        <EmptyState icon={<History size={22} color={c.accent} />} title="No doses logged yet" body="Doses you log from Today or a protocol appear here, grouped by day." />
      ) : (
        <>
          {filters.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
              <Chip label="All" selected={active === ALL} onPress={() => pickFilter(ALL)} />
              {filters.map((f) => (
                <Chip key={f.id} label={f.label} selected={active === f.id} onPress={() => pickFilter(f.id)} icon={f.color ? <Dot color={f.color} size={8} /> : undefined} />
              ))}
            </ScrollView>
          ) : null}

          <T variant="small" tone="soft" style={{ marginBottom: space.lg }}>
            {filtered.length - skipped} taken · {skipped} skipped
          </T>

          {days.map((d) => (
            <Section
              key={d.key}
              title={dateLabel(parseDay(d.key))}
              action={
                <T variant="small" tone="faint">
                  {d.logs.length} {d.logs.length === 1 ? 'entry' : 'entries'}
                </T>
              }>
              <Card style={{ paddingVertical: space.xs }}>
                {d.logs.map((l, i) => {
                  const site = l.siteId ? SITE_BY_ID[l.siteId] : undefined;
                  const color = l.protocolId ? protocolById.get(l.protocolId)?.color : undefined;
                  const details = [formatAmount(l.amount, true), ROUTE_SHORT[l.route], site?.short, l.volumeMl ? `${trim(l.volumeMl, 3)} mL` : null].filter(Boolean).join(' · ');
                  const last = i === d.logs.length - 1 && confirmId !== l.id;
                  return (
                    <View key={l.id}>
                      <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
                        <T variant="smallStrong" tone="soft" tabular style={styles.time}>
                          {format(new Date(l.takenAt), 'HH:mm')}
                        </T>
                        <View style={{ flex: 1 }}>
                          <HStack gap={6}>
                            <Dot color={color ?? c.inkFaint} size={8} />
                            <T variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }} tone={l.skipped ? 'soft' : 'ink'}>
                              {l.name}
                            </T>
                            {l.skipped ? <Badge label="Skipped" /> : null}
                          </HStack>
                          <T variant="small" tone="soft" style={{ marginTop: 2 }}>
                            {details}
                          </T>
                          {l.notes ? (
                            <T variant="small" tone="faint" numberOfLines={2} style={{ marginTop: 2 }}>
                              {l.notes}
                            </T>
                          ) : null}
                        </View>
                        <TrashButton label={`Delete ${l.name} log`} onPress={() => setConfirmId(confirmId === l.id ? null : l.id)} />
                      </View>
                      {confirmId === l.id ? (
                        <ConfirmBar
                          message={confirmMessage(l)}
                          onCancel={() => setConfirmId(null)}
                          onConfirm={() => {
                            deleteLog(l.id);
                            setConfirmId(null);
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            </Section>
          ))}

          {filtered.length > limit ? <Button title={`Show older (${filtered.length - limit})`} kind="secondary" onPress={() => setLimit(limit + PAGE)} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { marginHorizontal: -space.lg, marginBottom: space.md, flexGrow: 0 },
  chipsContent: { paddingHorizontal: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md },
  time: { width: 42, marginTop: 2 },
});
