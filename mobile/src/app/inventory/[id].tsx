import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { getCompound } from '@/data/library';
import { alerts, ALERT_LABEL, concentration, costPerDose, drawFor, forecast, monthlyCost, perVial, primary, totalRemaining } from '@/domain/inventory';
import type { InventoryItem } from '@/domain/model';
import { describeSchedule, doseOn, parseDay } from '@/domain/schedule';
import { formatAmount, formatMoney, toBase, trim, UNITS_PER_ML } from '@/domain/units';
import { ALERT_TONE, formatBase, itemSubtitle, openFraction, unitsText } from '@/features/inventory/format';
import { InlineConfirm, Meter, QuickChips, Stepper, Thumb } from '@/features/inventory/ui';
import { relativeDays } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { Button, num, NumberField } from '@/ui/controls';
import { Badge, Dot, EmptyState, Notice, Stat } from '@/ui/feedback';
import { Card, HStack, IconButton, Row, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type Panel = 'none' | 'open' | 'diluent' | 'delete';

/** Splits a base amount into value + unit for a Stat; mg below 1 shows as mcg. */
function parts(value: number, unit: 'mg' | 'iu'): { value: string; unit: string } {
  if (unit === 'iu') return { value: trim(value, 1), unit: 'IU' };
  return value < 1 && value > 0 ? { value: trim(value * 1000, 1), unit: 'mcg' } : { value: trim(value, 3), unit: 'mg' };
}

function concStat(item: InventoryItem): { value: string; unit: string; sub: string } | null {
  const conc = concentration(item);
  if (conc === null) return null;
  if (perVial(item).unit === 'iu') return { value: trim(conc, 2), unit: 'IU/mL', sub: `1 unit = ${trim(conc / UNITS_PER_ML, 3)} IU` };
  const perUnit = `1 unit = ${formatAmount({ value: conc / UNITS_PER_ML, unit: 'mg' }, true)}`;
  return conc < 1 ? { value: trim(conc * 1000, 1), unit: 'mcg/mL', sub: perUnit } : { value: trim(conc, 3), unit: 'mg/mL', sub: `${trim(conc * 1000, 1)} mcg/mL · ${perUnit}` };
}

function KV({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'danger' }) {
  return (
    <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6 }} gap={space.md}>
      <T tone="soft">{label}</T>
      <T variant="bodyStrong" tone={tone ?? 'ink'} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </T>
    </HStack>
  );
}

export default function InventoryDetailScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const inventory = useStore((s) => s.inventory);
  const protocols = useStore((s) => s.protocols);
  const logs = useStore((s) => s.logs);
  const currency = useStore((s) => s.settings.currency);
  const upsertInventory = useStore((s) => s.upsertInventory);
  const deleteInventory = useStore((s) => s.deleteInventory);
  const now = useNow();
  const [panel, setPanel] = useState<Panel>('none');
  const [diluent, setDiluent] = useState('');
  const [panelError, setPanelError] = useState<string | null>(null);

  const item = useMemo(() => inventory.find((i) => i.id === id), [inventory, id]);
  const linked = useMemo(() => protocols.filter((p) => p.inventoryId === id), [protocols, id]);
  const recent = useMemo(
    () =>
      logs
        .filter((l) => l.inventoryId === id)
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
        .slice(0, 10),
    [logs, id],
  );

  if (!item) {
    return (
      <Screen back title="Inventory">
        <EmptyState title="Item not found" body="It may have been deleted." action="Open inventory" onAction={() => router.replace('/inventory')} />
      </Screen>
    );
  }

  const base = perVial(item);
  const active = linked.filter((p) => p.status === 'active');
  const f = forecast(item, active, now);
  const flags = alerts(item, now);
  const conc = concStat(item);
  const concValue = concentration(item);
  const oral = item.form === 'oral';
  const powder = item.form === 'powder';
  const open = item.open;
  const fraction = openFraction(item);
  const compound = getCompound(primary(item).compoundId);
  const meta = [item.vendor, item.batch].filter(Boolean).join(' · ');
  const costs = active.map((p) => costPerDose(item, doseOn(p, now))).filter((x): x is number => x !== null);
  const monthly = monthlyCost(item, f.perDay);
  const mixVolume = powder ? open?.diluentMl : item.vialVolumeMl;
  const expiry = item.expiresAt ? parseDay(item.expiresAt) : null;

  const showPanel = (p: Panel) => {
    setPanelError(null);
    setDiluent(open?.diluentMl ? trim(open.diluentMl, 3) : '');
    setPanel(panel === p ? 'none' : p);
  };

  const openNew = () => {
    if (item.unopened < 1) return;
    const ml = num(diluent);
    if (powder && !(ml > 0)) return setPanelError('Enter the water you add, in mL.');
    upsertInventory({ ...item, unopened: item.unopened - 1, open: { openedAt: new Date().toISOString(), remaining: base.value, diluentMl: powder ? ml : undefined } });
    setPanel('none');
  };

  const saveDiluent = () => {
    const ml = num(diluent);
    if (!(ml > 0)) return setPanelError('Enter the water in the vial, in mL.');
    if (!open) return;
    upsertInventory({ ...item, open: { ...open, diluentMl: ml } });
    setPanel('none');
  };

  const diluentInput = (
    <View>
      <NumberField label="Water added" value={diluent} onChangeText={setDiluent} placeholder="Bacteriostatic water" suffix="mL" style={{ marginBottom: space.sm }} />
      <QuickChips values={[1, 2, 3, 5]} suffix="mL" current={diluent} onPick={setDiluent} />
      {panelError ? (
        <T variant="small" tone="danger">
          {panelError}
        </T>
      ) : null}
    </View>
  );

  const costLo = costs.length ? Math.min(...costs) : null;
  const costHi = costs.length ? Math.max(...costs) : null;
  const costRange = costLo !== null && costHi !== null && costHi - costLo >= 0.005;

  return (
    <Screen
      back
      title={item.name}
      right={
        <IconButton label="Edit item" onPress={() => router.push({ pathname: '/inventory/form', params: { id: item.id } })}>
          <Pencil size={17} color={c.ink} />
        </IconButton>
      }>
      <HStack gap={space.lg} style={{ alignItems: 'flex-start', marginBottom: space.xl }}>
        <Thumb uri={item.photoUri} form={item.form} size={72} />
        <View style={{ flex: 1 }}>
          <T variant="title">{item.name}</T>
          <T tone="soft" style={{ marginTop: 2 }}>
            {itemSubtitle(item, false)}
          </T>
          {meta ? (
            <T variant="small" tone="faint" style={{ marginTop: 2 }}>
              {meta}
            </T>
          ) : null}
          {flags.length > 0 ? (
            <HStack wrap style={{ marginTop: space.sm }}>
              {flags.map((a) => (
                <Badge key={a} label={ALERT_LABEL[a]} tone={ALERT_TONE[a]} />
              ))}
            </HStack>
          ) : null}
        </View>
      </HStack>

      {!oral ? (
        <Section title="Open vial">
          <Card>
            {conc ? (
              <HStack gap={space.lg} style={{ alignItems: 'flex-start' }}>
                <Stat label="Concentration" value={conc.value} unit={conc.unit} sub={conc.sub} />
                {open ? (
                  <Stat label="Left in vial" {...parts(open.remaining, base.unit)} sub={concValue ? `≈ ${trim(open.remaining / concValue, 2)} mL` : undefined} />
                ) : null}
              </HStack>
            ) : powder ? (
              <Notice title={open ? 'Set the water volume' : 'No vial open'}>
                {open
                  ? 'Enter how much bacteriostatic water is in the open vial to see its concentration and draw volumes.'
                  : item.unopened > 0
                    ? 'Open a vial and enter the water you add to see its concentration and draw volumes.'
                    : 'There are no sealed vials to open. Add stock below first.'}
              </Notice>
            ) : (
              <Notice title="Vial volume missing">Edit the item and add the liquid volume per vial to see its concentration.</Notice>
            )}

            {conc && item.components.length > 1 && mixVolume ? (
              <T variant="small" tone="soft" style={{ marginTop: space.sm }}>
                Each mL also holds{' '}
                {item.components
                  .slice(1)
                  .map((x) => {
                    const b = toBase(x.amount);
                    return `${x.name} ${b.unit === 'iu' ? `${trim(b.value / mixVolume, 2)} IU` : formatAmount({ value: b.value / mixVolume, unit: 'mg' }, true)}`;
                  })
                  .join(' · ')}
              </T>
            ) : null}

            {open ? (
              <View style={{ marginTop: space.lg }}>
                <Meter value={fraction ?? 0} />
                <HStack wrap style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  <T variant="small" tone="soft" tabular>
                    {formatBase(open.remaining, base.unit)} of {formatBase(base.value, base.unit)}
                  </T>
                  <T variant="small" tone="soft">
                    Opened {format(new Date(open.openedAt), 'd MMM')} · {relativeDays(new Date(open.openedAt), now)}
                  </T>
                </HStack>
                {powder && open.diluentMl ? (
                  <T variant="small" tone="faint" style={{ marginTop: 2 }}>
                    Mixed with {trim(open.diluentMl, 2)} mL bacteriostatic water
                  </T>
                ) : null}
              </View>
            ) : null}

            <HStack wrap style={{ marginTop: space.lg }}>
              <Button title="Open a new vial" kind={panel === 'open' ? 'primary' : 'secondary'} small disabled={item.unopened < 1} onPress={() => showPanel('open')} />
              {powder && open && open.remaining > 1e-9 ? (
                <Button title={open.diluentMl ? 'Change water volume' : 'Set water volume'} kind="ghost" small onPress={() => showPanel('diluent')} />
              ) : null}
            </HStack>
            {item.unopened < 1 && (conc || !powder) ? (
              <T variant="small" tone="faint" style={{ marginTop: space.xs }}>
                No sealed vials left to open.
              </T>
            ) : null}

            {panel === 'open' ? (
              <View style={{ marginTop: space.md }}>
                <InlineConfirm
                  danger={false}
                  message={
                    open && open.remaining > 1e-9
                      ? `Takes one vial from sealed stock and starts it full. The ${formatBase(open.remaining, base.unit)} left in the current vial is no longer counted.`
                      : 'Takes one vial from sealed stock and starts it full.'
                  }
                  confirm="Open vial"
                  onConfirm={openNew}
                  onCancel={() => setPanel('none')}>
                  {powder ? diluentInput : null}
                </InlineConfirm>
              </View>
            ) : null}
            {panel === 'diluent' ? (
              <View style={{ marginTop: space.md }}>
                <InlineConfirm danger={false} message="Water in the open vial. The concentration and every draw volume follow from it." confirm="Save" onConfirm={saveDiluent} onCancel={() => setPanel('none')}>
                  {diluentInput}
                </InlineConfirm>
              </View>
            ) : null}
          </Card>
        </Section>
      ) : null}

      <Section title="Stock">
        <Card>
          <HStack style={{ justifyContent: 'space-between' }} gap={space.md}>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{oral ? 'Units in stock' : 'Sealed vials'}</T>
              <T variant="small" tone="soft">
                {formatBase(totalRemaining(item), base.unit)} in total · alert at {item.lowStockAt} or fewer
              </T>
            </View>
            <Stepper value={item.unopened} onChange={(n) => upsertInventory({ ...item, unopened: n })} label={oral ? 'units in stock' : 'sealed vials'} />
          </HStack>
        </Card>
      </Section>

      <Section title="Forecast & cost">
        <Card>
          {active.length === 0 ? (
            <T tone="soft">No active protocol draws from this item, so there is nothing to forecast.</T>
          ) : (
            <HStack gap={space.lg} style={{ alignItems: 'flex-start' }}>
              <Stat label="Doses left" value={f.dosesLeft !== null ? String(f.dosesLeft) : '—'} sub={f.perDay > 0 ? `${formatBase(f.perDay * 7, base.unit)} per week` : undefined} />
              <Stat
                label="Runs out"
                value={f.runsOutOn ? format(f.runsOutOn, 'd MMM') : '—'}
                sub={f.runsOutOn ? relativeDays(f.runsOutOn, now) : 'No scheduled doses'}
                tone={f.daysLeft !== null && f.daysLeft <= 7 ? 'warn' : undefined}
              />
            </HStack>
          )}
          <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.lg }} />
          {item.pricePerVial ? (
            <HStack gap={space.lg} style={{ alignItems: 'flex-start' }}>
              {costLo !== null && costHi !== null ? (
                <Stat label="Per dose" value={formatMoney(costLo, currency)} sub={costRange ? `to ${formatMoney(costHi, currency)}, by protocol` : undefined} />
              ) : (
                <Stat label={`Per ${base.unit === 'iu' ? 'IU' : 'mg'}`} value={formatMoney(item.pricePerVial / base.value, currency)} />
              )}
              <Stat label="Per 30 days" value={monthly !== null ? formatMoney(monthly, currency) : '—'} sub={monthly === null ? 'Needs a scheduled protocol' : undefined} />
            </HStack>
          ) : (
            <T variant="small" tone="soft">
              Add a price per vial to see cost per dose and per month.
            </T>
          )}
        </Card>
      </Section>

      <Section title="Protocols using it">
        {linked.length === 0 ? (
          <T tone="soft">None. Choose this item under Inventory when you create or edit a protocol, and doses you log are deducted here.</T>
        ) : (
          <Card style={{ paddingVertical: space.xs }}>
            {linked.map((p, i) => {
              const dose = doseOn(p, now);
              const d = drawFor(item, dose);
              const cost = costPerDose(item, dose);
              const sub = [
                `${formatAmount(dose, true)} · ${describeSchedule(p)}`,
                d ? `${unitsText(d.units)} (${trim(d.volumeMl, 3)} mL)` : null,
                cost !== null ? `${formatMoney(cost, currency)} / dose` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Row
                  key={p.id}
                  title={p.name}
                  subtitle={sub}
                  left={<Dot color={p.color} />}
                  right={p.status !== 'active' ? <Badge label={p.status === 'paused' ? 'Paused' : 'Completed'} /> : undefined}
                  onPress={() => router.push(`/protocol/${p.id}`)}
                  last={i === linked.length - 1}
                />
              );
            })}
          </Card>
        )}
      </Section>

      <Section title="Recent doses from it">
        {recent.length === 0 ? (
          <T tone="soft">No doses logged from this item yet.</T>
        ) : (
          <Card style={{ paddingVertical: space.xs }}>
            {recent.map((l, i) => (
              <Row
                key={l.id}
                title={l.skipped ? l.name : `${formatAmount(l.amount, true)} · ${l.name}`}
                subtitle={[format(new Date(l.takenAt), 'EEE d MMM · HH:mm'), !l.skipped && l.volumeMl ? `${trim(l.volumeMl, 3)} mL` : null].filter(Boolean).join(' · ')}
                right={l.skipped ? <Badge label="Skipped" /> : undefined}
                last={i === recent.length - 1}
              />
            ))}
          </Card>
        )}
      </Section>

      <Section title="Details">
        <Card style={{ paddingVertical: space.sm }}>
          {expiry ? (
            <KV
              label="Expires"
              value={`${format(expiry, 'd MMM yyyy')} · ${relativeDays(expiry, now)}`}
              tone={flags.includes('expired') ? 'danger' : flags.includes('expiring') ? 'warn' : undefined}
            />
          ) : (
            <KV label="Expires" value="Not recorded" />
          )}
          {item.purchasedAt ? <KV label="Purchased" value={format(parseDay(item.purchasedAt), 'd MMM yyyy')} /> : null}
          {item.pricePerVial !== undefined ? <KV label={oral ? 'Price per unit' : 'Price per vial'} value={formatMoney(item.pricePerVial, currency)} /> : null}
          {item.vendor ? <KV label="Vendor" value={item.vendor} /> : null}
          {item.batch ? <KV label="Batch" value={item.batch} /> : null}
          <KV label="Added" value={format(new Date(item.createdAt), 'd MMM yyyy')} />
        </Card>
        {compound?.storage ? (
          <View style={{ marginTop: space.md }}>
            <Notice title="Storage (library)">{compound.storage}</Notice>
          </View>
        ) : null}
      </Section>

      {item.notes ? (
        <Section title="Notes">
          <Card>
            <T>{item.notes}</T>
          </Card>
        </Section>
      ) : null}

      <Section title="Manage">
        <HStack wrap>
          <Button title="Edit" kind="secondary" small icon={<Pencil size={15} color={c.ink} />} onPress={() => router.push({ pathname: '/inventory/form', params: { id: item.id } })} />
          <Button title="Delete" kind="danger" small onPress={() => showPanel('delete')} />
        </HStack>
        {panel === 'delete' ? (
          <View style={{ marginTop: space.md }}>
            <InlineConfirm
              message={`Delete “${item.name}”?${linked.length ? ` ${linked.length === 1 ? 'One protocol' : `${linked.length} protocols`} will be unlinked.` : ''} Dose history is kept.`}
              confirm="Delete item"
              onConfirm={() => {
                deleteInventory(item.id);
                if (router.canGoBack()) router.back();
                else router.replace('/inventory');
              }}
              onCancel={() => setPanel('none')}
            />
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}
