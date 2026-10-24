import { format } from 'date-fns';
import { MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ROUTE_SHORT } from '@/data/library';
import { SITE_BY_ID, SITES, type BodyView } from '@/data/sites';
import { siteUsage, sitesFor, suggestSite, type SiteUse } from '@/domain/sites';
import { dateLabel } from '@/features/health/format';
import { relativeDays } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { BodyMap, type SiteMarker } from '@/ui/body-map';
import { Button, Segmented } from '@/ui/controls';
import { Badge, Dot } from '@/ui/feedback';
import { Card, HStack, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { radius, space, useTheme } from '@/ui/theme';

type InjectRoute = 'subq' | 'im';

const DAY = 86_400_000;

function heatFor(lastAt: number | null, now: number): SiteMarker['heat'] {
  if (lastAt === null) return 0;
  const age = now - lastAt;
  if (age <= 3 * DAY) return 3;
  if (age <= 7 * DAY) return 2;
  return 1;
}

function lastUsedLine(use: SiteUse | undefined, now: Date): string {
  if (!use || use.lastAt === null) return 'Not used yet';
  const d = new Date(use.lastAt);
  return `Last used ${dateLabel(d, now)} (${relativeDays(d, now)})${use.lastName ? ` · ${use.lastName}` : ''}`;
}

export default function SitesScreen() {
  const { c } = useTheme();
  const logs = useStore((s) => s.logs);
  const now = useNow();

  const usage = useMemo(() => siteUsage(logs), [logs]);
  const recent = useMemo(
    () =>
      logs
        .filter((l) => l.siteId && !l.skipped && SITE_BY_ID[l.siteId])
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
        .slice(0, 10),
    [logs],
  );

  const [route, setRoute] = useState<InjectRoute>(() => (recent[0]?.route === 'im' ? 'im' : 'subq'));
  const suggested = useMemo(() => suggestSite(route, logs), [route, logs]);
  const [view, setView] = useState<BodyView>(() => suggested?.view ?? 'front');
  const [selected, setSelected] = useState<string | null>(null);

  const allowed = useMemo(() => sitesFor(route).map((s) => s.id), [route]);
  const nowMs = now.getTime();
  const markers = useMemo<SiteMarker[]>(() => SITES.map((s) => ({ id: s.id, heat: heatFor(usage.get(s.id)?.lastAt ?? null, nowMs) })), [usage, nowMs]);

  const selectedSite = selected ? SITE_BY_ID[selected] : null;
  const selectedUse = selected ? usage.get(selected) : undefined;
  const suggestedUse = suggested ? usage.get(suggested.id) : undefined;

  const show = (id: string) => {
    const s = SITE_BY_ID[id];
    if (!s) return;
    setView(s.view);
    setSelected(id);
  };

  const changeRoute = (r: InjectRoute) => {
    setRoute(r);
    const next = suggestSite(r, logs);
    if (next) setView(next.view);
  };

  const legend: { color: string; label: string }[] = [
    { color: c.warn, label: 'Last 3 days' },
    { color: c.accent, label: 'Last 7 days' },
    { color: `${c.accent}73`, label: 'Older' },
    { color: c.inkFaint, label: 'Not used' },
  ];

  return (
    <Screen back title="Injection sites">
      <Segmented
        value={route}
        onChange={changeRoute}
        options={[
          { value: 'subq', label: 'Subcutaneous' },
          { value: 'im', label: 'Intramuscular' },
        ]}
        style={{ marginBottom: space.lg }}
      />

      <Card style={{ marginBottom: space.lg }}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'front', label: 'Front' },
            { value: 'back', label: 'Back' },
          ]}
          style={{ alignSelf: 'center', width: 200, marginBottom: space.md }}
        />
        <BodyMap height={400} view={view} markers={markers} allowed={allowed} suggested={suggested?.id} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
        <HStack wrap gap={space.md} style={{ justifyContent: 'center', marginTop: space.md }}>
          {legend.map((l) => (
            <HStack key={l.label} gap={6}>
              <Dot color={l.color} size={9} />
              <T variant="small" tone="soft">
                {l.label}
              </T>
            </HStack>
          ))}
          <HStack gap={6}>
            <View style={[styles.ring, { borderColor: c.positive }]} />
            <T variant="small" tone="soft">
              Suggested
            </T>
          </HStack>
        </HStack>
      </Card>

      {selectedSite ? (
        <Card style={{ marginBottom: space.xxl }}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <T variant="heading">{selectedSite.label}</T>
              <T variant="small" tone="soft" style={{ marginTop: 2 }}>
                {lastUsedLine(selectedUse, now)}
              </T>
              <T variant="small" tone="soft">
                {selectedUse && selectedUse.count > 0 ? `Used ${selectedUse.count} time${selectedUse.count === 1 ? '' : 's'} in your log` : 'No injections logged here'}
              </T>
            </View>
            <HStack gap={4}>
              {selectedSite.routes.map((r) => (
                <Badge key={r} label={ROUTE_SHORT[r]} tone={r === route ? 'accent' : 'neutral'} />
              ))}
            </HStack>
          </HStack>
        </Card>
      ) : (
        <T variant="small" tone="faint" center style={{ marginBottom: space.xxl }}>
          Tap a site to see when it was last used.
        </T>
      )}

      <Section title="Suggested next">
        {suggested ? (
          <Card>
            <HStack gap={space.md}>
              <View style={[styles.icon, { backgroundColor: c.positiveSoft }]}>
                <MapPin size={20} color={c.positive} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{suggested.label}</T>
                <T variant="small" tone="soft">
                  {suggestedUse?.lastAt ? `Least recently used ${ROUTE_SHORT[route]} site · last used ${relativeDays(new Date(suggestedUse.lastAt), now)}` : 'Not used yet'}
                </T>
              </View>
              {selected !== suggested.id ? <Button title="Show" kind="ghost" small onPress={() => show(suggested.id)} /> : null}
            </HStack>
          </Card>
        ) : (
          <T tone="soft">No sites on the map suit this route.</T>
        )}
      </Section>

      <Section title="Recent injections">
        {recent.length === 0 ? (
          <T tone="soft">Injections logged with a site appear here.</T>
        ) : (
          <Card style={{ paddingVertical: space.xs }}>
            {recent.map((l, i) => {
              const site = SITE_BY_ID[l.siteId!];
              return (
                <Row
                  key={l.id}
                  title={l.name}
                  subtitle={site.label}
                  right={
                    <T variant="small" tone="faint" style={{ textAlign: 'right' }}>
                      {dateLabel(new Date(l.takenAt), now)}
                      {'\n'}
                      {format(new Date(l.takenAt), 'HH:mm')}
                    </T>
                  }
                  onPress={() => show(site.id)}
                  chevron={false}
                  last={i === recent.length - 1}
                />
              );
            })}
          </Card>
        )}
      </Section>

      <HStack style={{ justifyContent: 'center' }}>
        <Dot color={c.inkFaint} size={4} />
        <T variant="small" tone="faint" style={{ flexShrink: 1 }}>
          Rotate sites to reduce irritation and lipohypertrophy.
        </T>
      </HStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed' },
});
