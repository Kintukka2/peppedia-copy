import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { getCompound, ROUTE_LABEL } from '@/data/library';
import { SITE_BY_ID, type BodyView } from '@/data/sites';
import type { Compound, Route } from '@/data/types';
import { doseInItemUnit, drawFor } from '@/domain/inventory';
import type { AmountUnit, Protocol } from '@/domain/model';
import { doseOn } from '@/domain/schedule';
import { isInjectable, siteUsage, sitesFor, suggestSite } from '@/domain/sites';
import { trim } from '@/domain/units';
import { useNow } from '@/lib/hooks';
import { useStore } from '@/store';
import { BodyMap, type SiteMarker } from '@/ui/body-map';
import { Button, Chip, Field, num, NumberField, OptionList, Segmented } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { CompoundPicker, DATE_RE, DateField, TIME_RE, TimeField, UnitPicker } from '@/ui/pickers';
import { SyringeGauge } from '@/ui/syringe';
import { T } from '@/ui/text';
import { space } from '@/ui/theme';

const DAY = 86_400_000;

export default function LogScreen() {
  const clock = useNow();
  const params = useLocalSearchParams<{ protocolId?: string; scheduledFor?: string }>();
  const protocols = useStore((s) => s.protocols);
  const inventory = useStore((s) => s.inventory);
  const logs = useStore((s) => s.logs);
  const syringe = useStore((s) => s.settings.syringe);
  const logDose = useStore((s) => s.logDose);

  const scheduledFor = params.scheduledFor ? new Date(params.scheduledFor) : null;
  const active = useMemo(() => protocols.filter((p) => p.status === 'active'), [protocols]);

  const [protocolId, setProtocolId] = useState<string>(params.protocolId ?? '');
  const protocol: Protocol | undefined = protocols.find((p) => p.id === protocolId);
  const [adhoc, setAdhoc] = useState<{ compound: Compound | null; name: string } | null>(null);

  const initialDose = protocol ? doseOn(protocol, scheduledFor ?? new Date()) : null;
  const [dose, setDose] = useState(initialDose ? String(initialDose.value) : '');
  const [unit, setUnit] = useState<AmountUnit>(initialDose?.unit ?? 'mg');
  const [route, setRoute] = useState<Route>(protocol?.route ?? 'subq');
  const [inventoryId, setInventoryId] = useState(protocol?.inventoryId ?? '');
  const [when, setWhen] = useState<'now' | 'scheduled' | 'custom'>('now');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const suggestion = isInjectable(route) ? suggestSite(route, logs) : null;
  const [view, setView] = useState<BodyView>(suggestion?.view ?? 'front');
  const [siteId, setSiteId] = useState<string | null>(suggestion?.id ?? null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const choose = (p: Protocol) => {
    setProtocolId(p.id);
    setAdhoc(null);
    const d = doseOn(p, new Date());
    setDose(String(d.value));
    setUnit(d.unit);
    setRoute(p.route);
    setInventoryId(p.inventoryId ?? '');
    const s = isInjectable(p.route) ? suggestSite(p.route, logs) : null;
    setSiteId(s?.id ?? null);
    if (s) setView(s.view);
  };

  const compound = protocol ? getCompound(protocol.compoundId) : (adhoc?.compound ?? null);
  const name = protocol?.name ?? adhoc?.name ?? '';
  const amount = { value: num(dose), unit };
  const compatible = useMemo(() => inventory.filter((i) => doseInItemUnit(i, { value: 1, unit }) !== null), [inventory, unit]);
  const item = inventory.find((i) => i.id === inventoryId);
  const draw = item && amount.value > 0 ? drawFor(item, amount) : null;
  const allowed = useMemo(() => sitesFor(route).map((s) => s.id), [route]);
  const markers: SiteMarker[] = useMemo(() => {
    const now = clock.getTime();
    return [...siteUsage(logs).values()].map((u) => ({
      id: u.site.id,
      heat: u.lastAt === null ? 0 : now - u.lastAt < 3 * DAY ? 3 : now - u.lastAt < 7 * DAY ? 2 : 1,
    }));
  }, [logs, clock]);

  const takenAt = (): Date | null => {
    if (when === 'now') return new Date();
    if (when === 'scheduled' && scheduledFor) return scheduledFor;
    if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
    return new Date(`${date}T${time.padStart(5, '0')}:00`);
  };

  const submit = (skipped: boolean) => {
    setError(null);
    if (!name) return setError('Choose a protocol or compound.');
    if (!skipped && !(amount.value > 0)) return setError('Enter the amount you took.');
    const at = takenAt();
    if (!at || Number.isNaN(at.getTime())) return setError('Check the date and time.');
    logDose({
      protocolId: protocol?.id,
      compoundId: compound?.id ?? null,
      name,
      takenAt: at.toISOString(),
      scheduledFor: protocol && scheduledFor ? scheduledFor.toISOString() : undefined,
      amount: amount.value > 0 ? amount : (initialDose ?? { value: 0, unit }),
      route,
      siteId: !skipped && isInjectable(route) ? (siteId ?? undefined) : undefined,
      inventoryId: !skipped && inventoryId ? inventoryId : undefined,
      volumeMl: !skipped && draw ? draw.volumeMl : undefined,
      skipped: skipped || undefined,
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  const picked = !!protocol || !!adhoc;

  return (
    <Screen
      modal
      title={protocol ? `Log ${protocol.name}` : 'Log a dose'}
      footer={
        picked ? (
          <HStack>
            {protocol && scheduledFor ? <Button title="Skip" kind="secondary" onPress={() => submit(true)} /> : null}
            <Button title="Log dose" onPress={() => submit(false)} style={{ flex: 1 }} />
          </HStack>
        ) : undefined
      }>
      {!picked ? (
        <>
          {active.length > 0 ? (
            <Section title="From a protocol">
              <OptionList value="" onChange={(id) => choose(protocols.find((p) => p.id === id)!)} options={active.map((p) => ({ value: p.id, label: p.name, hint: ROUTE_LABEL[p.route] }))} />
            </Section>
          ) : null}
          <Section title="Or a one-off compound">
            <CompoundPicker
              onPick={(cp) => {
                setAdhoc({ compound: cp, name: cp.name });
                setRoute(cp.routes[0] ?? 'subq');
              }}
              onCustom={(n) => setAdhoc({ compound: null, name: n })}
            />
          </Section>
        </>
      ) : (
        <>
          {scheduledFor ? (
            <T tone="soft" style={{ marginBottom: space.lg }}>
              Scheduled for {format(scheduledFor, 'EEE d MMM, HH:mm')}
            </T>
          ) : null}

          <Section title="Amount">
            <HStack style={{ alignItems: 'flex-start' }}>
              <NumberField value={dose} onChangeText={setDose} placeholder="Amount" suffix={unit === 'iu' ? 'IU' : unit} style={{ flex: 1 }} />
              <View style={{ marginTop: 4 }}>
                <UnitPicker value={unit} onChange={setUnit} />
              </View>
            </HStack>
            {!protocol ? (
              <HStack wrap>
                {(compound?.routes.length ? compound.routes : (['subq', 'im', 'oral', 'nasal', 'topical'] as Route[])).map((r) => (
                  <Chip key={r} label={ROUTE_LABEL[r]} selected={route === r} onPress={() => setRoute(r)} />
                ))}
              </HStack>
            ) : null}
          </Section>

          <Section title="When">
            <HStack wrap style={{ marginBottom: space.md }}>
              <Chip label="Now" selected={when === 'now'} onPress={() => setWhen('now')} />
              {scheduledFor ? <Chip label={`At ${format(scheduledFor, 'HH:mm')}`} selected={when === 'scheduled'} onPress={() => setWhen('scheduled')} /> : null}
              <Chip label="Other time" selected={when === 'custom'} onPress={() => setWhen('custom')} />
            </HStack>
            {when === 'custom' ? (
              <>
                <DateField label="Date" value={date} onChange={setDate} future={false} />
                <TimeField label="Time" value={time} onChange={setTime} />
              </>
            ) : null}
          </Section>

          {compatible.length > 0 ? (
            <Section title="From vial">
              <OptionList value={inventoryId} onChange={setInventoryId} options={[{ value: '', label: 'Don’t deduct from inventory' }, ...compatible.map((i) => ({ value: i.id, label: i.name, hint: i.vendor }))]} />
              {item && amount.value > 0 ? (
                draw ? (
                  <Card style={{ marginTop: space.md }}>
                    <HStack style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
                      <T variant="bodyStrong">Draw</T>
                      <T variant="bodyStrong" tabular>
                        {trim(draw.units, 1)} units · {trim(draw.volumeMl, 3)} mL
                      </T>
                    </HStack>
                    <SyringeGauge volumeMl={draw.volumeMl} syringe={syringe} />
                  </Card>
                ) : (
                  <Notice>Set the diluent volume on this vial to see the draw.</Notice>
                )
              ) : null}
            </Section>
          ) : null}

          {isInjectable(route) ? (
            <Section title="Injection site" action={<Segmented value={view} onChange={setView} options={[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }]} style={{ width: 150 }} />}>
              <Card>
                <BodyMap view={view} markers={markers} selected={siteId} suggested={suggestion?.id} allowed={allowed} onSelect={setSiteId} height={320} />
                <T center variant="bodyStrong" style={{ marginTop: space.sm }}>
                  {siteId ? SITE_BY_ID[siteId]?.label : 'Tap a site'}
                </T>
                {suggestion ? (
                  <T center variant="small" tone="soft">
                    Suggested: {suggestion.label} (rested longest)
                  </T>
                ) : null}
              </Card>
            </Section>
          ) : null}

          <Field value={notes} onChangeText={setNotes} placeholder="Notes (optional)" multiline />
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </>
      )}
    </Screen>
  );
}
