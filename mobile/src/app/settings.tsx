import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { Sex, SyringeId, ThemePreference, WeightUnit } from '@/domain/model';
import { SYRINGES } from '@/domain/units';
import { remindersSupported, requestReminderPermission } from '@/lib/notifications';
import { useStore } from '@/store';
import { importData, resetAll } from '@/store/backup';
import { buildSample } from '@/store/sample';
import { Button, Chip, Field, OptionList, Segmented, ToggleRow } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space } from '@/ui/theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD'];

export default function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [confirm, setConfirm] = useState<'sample' | 'reset' | null>(null);
  const [endpoint, setEndpoint] = useState(settings.askEndpoint);
  const [token, setToken] = useState(settings.askToken);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Screen back title="Settings">
      <Section title="Units">
        <HStack style={{ justifyContent: 'space-between', marginBottom: space.md }}>
          <T>Weight</T>
          <Segmented<WeightUnit> value={settings.weightUnit} onChange={(v) => update({ weightUnit: v })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} style={{ width: 140 }} />
        </HStack>
        <T variant="smallStrong" tone="soft" style={{ marginBottom: space.sm }}>
          Currency
        </T>
        <HStack wrap style={{ marginBottom: space.lg }}>
          {CURRENCIES.map((cur) => (
            <Chip key={cur} label={cur} selected={settings.currency === cur} onPress={() => update({ currency: cur })} />
          ))}
        </HStack>
        <T variant="smallStrong" tone="soft" style={{ marginBottom: space.sm }}>
          Default syringe
        </T>
        <OptionList<SyringeId> value={settings.syringe} onChange={(v) => update({ syringe: v })} options={Object.values(SYRINGES).map((s) => ({ value: s.id, label: s.label }))} />
      </Section>

      <Section title="Reference ranges">
        <T tone="soft" style={{ marginBottom: space.sm }}>
          Used only to pick sex-specific lab reference ranges.
        </T>
        <Segmented<Sex>
          value={settings.sex}
          onChange={(v) => update({ sex: v })}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
            { value: 'unspecified', label: 'Not set' },
          ]}
        />
      </Section>

      <Section title="Appearance">
        <Segmented<ThemePreference>
          value={settings.theme}
          onChange={(v) => update({ theme: v })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Section>

      <Section title="Behaviour">
        <Card style={{ paddingVertical: space.xs }}>
          <ToggleRow
            title="Dose reminders"
            subtitle={remindersSupported ? 'Notifications at each scheduled time.' : 'Available in the iOS and Android apps.'}
            value={settings.remindersEnabled}
            onChange={async (v) => {
              update({ remindersEnabled: v });
              if (v) {
                const ok = await requestReminderPermission();
                if (!ok && remindersSupported) setMessage('Notifications are blocked. Allow them for Titra in system settings.');
              }
            }}
          />
          <ToggleRow title="Deduct supplies" subtitle="Take syringes and swabs out of stock with each injection." value={settings.deductSupplies} onChange={(v) => update({ deductSupplies: v })} />
        </Card>
        {message ? (
          <View style={{ marginTop: space.md }}>
            <Notice tone="warn">{message}</Notice>
          </View>
        ) : null}
      </Section>

      <Section title="Ask Titra server">
        <Field
          value={endpoint}
          onChangeText={setEndpoint}
          placeholder="https://your-titra-server.example.com"
          hint="Optional. Without a server, Ask answers from the on-device library. See server/README.md to run one."
        />
        <Field value={token} onChangeText={setToken} placeholder="Access token (if the server requires one)" />
        <Button title="Save server" kind="secondary" small onPress={() => update({ askEndpoint: endpoint.trim().replace(/\/+$/, ''), askToken: token.trim() })} style={{ alignSelf: 'flex-start' }} />
      </Section>

      <Section title="Data">
        <Card style={{ gap: space.md }}>
          <Button title="Backups & export" kind="secondary" onPress={() => router.push('/backups')} />
          {confirm === 'sample' ? (
            <View style={{ gap: space.sm }}>
              <T tone="soft">Replace your current records with sample data? A snapshot is saved first so you can restore.</T>
              <HStack>
                <Button title="Load sample" small onPress={async () => (await importData(buildSample()), setConfirm(null), router.replace('/'))} />
                <Button title="Cancel" kind="ghost" small onPress={() => setConfirm(null)} />
              </HStack>
            </View>
          ) : (
            <Button title="Load sample data" kind="secondary" onPress={() => setConfirm('sample')} />
          )}
          {confirm === 'reset' ? (
            <View style={{ gap: space.sm }}>
              <T tone="soft">Delete all protocols, logs, inventory, vitals, labs and journal entries? A snapshot is saved first.</T>
              <HStack>
                <Button title="Delete everything" kind="danger" small onPress={async () => (await resetAll(), setConfirm(null))} />
                <Button title="Cancel" kind="ghost" small onPress={() => setConfirm(null)} />
              </HStack>
            </View>
          ) : (
            <Button title="Delete all data" kind="danger" onPress={() => setConfirm('reset')} />
          )}
        </Card>
      </Section>
    </Screen>
  );
}
