import { format } from 'date-fns';
import { router } from 'expo-router';
import { Boxes, Package, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { alerts, ALERT_LABEL, costPerDose, forecast, monthlyCost, perVial, totalRemaining } from '@/domain/inventory';
import type { InventoryItem } from '@/domain/model';
import { doseOn } from '@/domain/schedule';
import { formatMoney } from '@/domain/units';
import { ALERT_TONE, formatBase, itemSubtitle, linkedActive, remainingSummary } from '@/features/inventory/format';
import { Thumb } from '@/features/inventory/ui';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { Button } from '@/ui/controls';
import { Badge, EmptyState } from '@/ui/feedback';
import { Card, Gap, HStack, IconButton, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

function Line({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'danger' | 'faint' }) {
  return (
    <T variant="small" tone="soft">
      {label}{' '}
      <T variant="smallStrong" tone={tone ?? 'ink'}>
        {value}
      </T>
    </T>
  );
}

export default function InventoryScreen() {
  const { c } = useTheme();
  const inventory = useStore((s) => s.inventory);
  const protocols = useStore((s) => s.protocols);
  const supplies = useStore((s) => s.supplies);
  const currency = useStore((s) => s.settings.currency);
  const now = useNow();

  const sorted = useMemo(() => {
    const stocked = (i: InventoryItem) => (totalRemaining(i) > 1e-9 ? 0 : 1);
    return [...inventory].sort((a, b) => stocked(a) - stocked(b) || a.name.localeCompare(b.name));
  }, [inventory]);
  const lowSupplies = useMemo(() => supplies.filter((s) => s.count <= s.lowStockAt).length, [supplies]);

  const card = (item: InventoryItem) => {
    const linked = linkedActive(item, protocols);
    const f = forecast(item, linked, now);
    const flags = alerts(item, now);
    const costs = linked.map((p) => costPerDose(item, doseOn(p, now))).filter((x): x is number => x !== null);
    const monthly = monthlyCost(item, f.perDay);
    const base = perVial(item);
    let cost: string | null = null;
    if (costs.length > 0) {
      const lo = Math.min(...costs);
      const hi = Math.max(...costs);
      cost = Math.abs(hi - lo) < 0.005 ? `${formatMoney(lo, currency)} / dose` : `${formatMoney(lo, currency)}–${formatMoney(hi, currency)} / dose`;
      if (monthly !== null && linked.length > 1) cost += ` · ${formatMoney(monthly, currency)} / 30 days`;
    } else if (item.pricePerVial && base.value > 0) {
      cost = `${formatMoney(item.pricePerVial, currency)} / ${item.form === 'oral' ? 'unit' : 'vial'} · ${formatMoney(item.pricePerVial / base.value, currency)} / ${base.unit === 'iu' ? 'IU' : 'mg'}`;
    }
    const meta = [item.vendor, item.batch].filter(Boolean).join(' · ');
    const empty = totalRemaining(item) <= 1e-9;

    return (
      <Card key={item.id} onPress={() => router.push(`/inventory/${item.id}`)} style={{ marginBottom: space.md }}>
        <HStack gap={space.md} style={{ alignItems: 'flex-start' }}>
          <Thumb uri={item.photoUri} form={item.form} />
          <View style={{ flex: 1 }}>
            <T variant="heading" numberOfLines={1}>
              {item.name}
            </T>
            <T variant="small" tone="soft" numberOfLines={2}>
              {itemSubtitle(item)}
            </T>
            {meta ? (
              <T variant="small" tone="faint" numberOfLines={1}>
                {meta}
              </T>
            ) : null}
          </View>
        </HStack>
        {flags.length > 0 ? (
          <HStack wrap style={{ marginTop: space.md }}>
            {flags.map((a) => (
              <Badge key={a} label={ALERT_LABEL[a]} tone={ALERT_TONE[a]} />
            ))}
          </HStack>
        ) : null}
        <View style={{ marginTop: space.md, gap: 2 }}>
          <T variant="small" tone={empty ? 'danger' : 'ink'}>
            {remainingSummary(item)}
          </T>
          {linked.length === 0 ? (
            <Line label="Forecast" value="No active protocol linked" tone="faint" />
          ) : f.runsOutOn ? (
            <Line
              label="Forecast"
              value={`${f.dosesLeft !== null ? `${f.dosesLeft} doses · ` : ''}runs out ${format(f.runsOutOn, 'd MMM yyyy')}`}
              tone={f.daysLeft !== null && f.daysLeft <= 7 ? 'warn' : undefined}
            />
          ) : (
            <Line label="Forecast" value={f.dosesLeft !== null ? `${f.dosesLeft} doses left` : `${formatBase(totalRemaining(item), base.unit)} left`} />
          )}
          {cost ? <Line label="Cost" value={cost} /> : null}
        </View>
      </Card>
    );
  };

  return (
    <Screen
      back
      title="Inventory"
      right={
        <IconButton label="Add inventory item" onPress={() => router.push('/inventory/form')}>
          <Plus size={20} color={c.ink} />
        </IconButton>
      }>
      {inventory.length === 0 ? (
        <EmptyState
          icon={<Boxes size={22} color={c.accent} />}
          title="No inventory yet"
          body="Add vials, pens or capsules to see concentration, doses left and when each runs out. Link them to protocols to deduct doses automatically."
          action="Add an item"
          onAction={() => router.push('/inventory/form')}
        />
      ) : (
        <Section title={`${inventory.length} ${inventory.length === 1 ? 'item' : 'items'}`}>
          {sorted.map(card)}
          <Gap size={space.xs} />
          <Button title="Add an item" kind="secondary" icon={<Plus size={18} color={c.ink} />} onPress={() => router.push('/inventory/form')} />
        </Section>
      )}

      <Section title="Supplies" style={{ marginTop: inventory.length === 0 ? space.xxl : 0 }}>
        <Card onPress={() => router.push('/supplies')} style={{ paddingVertical: space.xs }}>
          <Row
            title="Syringes, swabs & water"
            subtitle={
              supplies.length === 0
                ? 'Track consumables and deduct them with each injection.'
                : `${supplies.length} ${supplies.length === 1 ? 'item' : 'items'}${lowSupplies > 0 ? '' : ' · all stocked'}`
            }
            left={
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: lowSupplies > 0 ? c.warnSoft : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Package size={18} color={lowSupplies > 0 ? c.warn : c.inkSoft} />
              </View>
            }
            right={lowSupplies > 0 ? <Badge label={`${lowSupplies} low`} tone="warn" /> : undefined}
            chevron
            last
          />
        </Card>
      </Section>
    </Screen>
  );
}
