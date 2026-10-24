import { router } from 'expo-router';
import { History, Plus, Syringe } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { ROUTE_SHORT } from '@/data/library';
import { forecast } from '@/domain/inventory';
import type { Protocol } from '@/domain/model';
import { describeSchedule, doseOn, nextDose, titrationStepOn } from '@/domain/schedule';
import { formatAmount } from '@/domain/units';
import { whenLabel } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { Button } from '@/ui/controls';
import { Badge, EmptyState } from '@/ui/feedback';
import { Card, Gap, HStack, IconButton, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

export default function ProtocolsScreen() {
  const { c } = useTheme();
  const protocols = useStore((s) => s.protocols);
  const inventory = useStore((s) => s.inventory);
  const now = useNow();

  const groups = useMemo(() => {
    const by = (status: Protocol['status']) => protocols.filter((p) => p.status === status).sort((a, b) => a.name.localeCompare(b.name));
    return { active: by('active'), paused: by('paused'), completed: by('completed') };
  }, [protocols]);

  const card = (p: Protocol) => {
    const dose = doseOn(p, now);
    const step = titrationStepOn(p, now);
    const inv = p.inventoryId ? inventory.find((i) => i.id === p.inventoryId) : undefined;
    const f = inv ? forecast(inv, protocols.filter((x) => x.inventoryId === inv.id && x.status === 'active'), now) : null;
    return (
      <Card key={p.id} onPress={() => router.push(`/protocol/${p.id}`)} style={{ marginBottom: space.md }}>
        <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <HStack gap={space.md} style={{ flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Syringe size={20} color={p.color} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="heading" numberOfLines={1}>
                {p.name}
              </T>
              <T variant="small" tone="soft">
                {formatAmount(dose, true)} · {ROUTE_SHORT[p.route]} · {describeSchedule(p)}
              </T>
            </View>
          </HStack>
          {step !== null && p.titration ? <Badge label={`Step ${step + 1}/${p.titration.length}`} tone="accent" /> : null}
        </HStack>
        {p.status === 'active' ? (
          <View style={{ marginTop: space.md, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm }}>
            <T variant="small" tone="soft">
              Next: <T variant="smallStrong">{whenLabel(nextDose(p, now))}</T>
            </T>
            {inv ? (
              <T variant="small" tone="soft">
                {inv.name}
                {f?.dosesLeft !== null && f?.dosesLeft !== undefined ? ` · ${f.dosesLeft} doses left` : ''}
              </T>
            ) : (
              <T variant="small" tone="faint">
                No vial linked
              </T>
            )}
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <Screen
      large
      title="Protocols"
      subtitle={`${groups.active.length} active`}
      right={
        <HStack>
          <IconButton label="Dose history" onPress={() => router.push('/history')}>
            <History size={18} color={c.ink} />
          </IconButton>
          <IconButton label="New protocol" onPress={() => router.push('/protocol/form')}>
            <Plus size={20} color={c.ink} />
          </IconButton>
        </HStack>
      }>
      {protocols.length === 0 ? (
        <>
          <EmptyState
            icon={<Syringe size={22} color={c.accent} />}
            title="No protocols yet"
            body="A protocol is a compound, dose and schedule you follow. Start from a label, trial, clinic or community protocol, or build your own."
            action="Create a protocol"
            onAction={() => router.push('/protocol/form')}
          />
          <Button title="Browse the protocol library" kind="ghost" onPress={() => router.push('/templates')} style={{ marginTop: space.md }} />
        </>
      ) : (
        <>
          {groups.active.length > 0 && <Section title="Active">{groups.active.map(card)}</Section>}
          {groups.paused.length > 0 && <Section title="Paused">{groups.paused.map(card)}</Section>}
          {groups.completed.length > 0 && <Section title="Completed">{groups.completed.map(card)}</Section>}
          <Gap />
          <Button title="New protocol" kind="secondary" icon={<Plus size={18} color={c.ink} />} onPress={() => router.push('/protocol/form')} />
          <Button title="Browse the protocol library" kind="ghost" onPress={() => router.push('/templates')} style={{ marginTop: space.sm }} />
        </>
      )}
    </Screen>
  );
}
