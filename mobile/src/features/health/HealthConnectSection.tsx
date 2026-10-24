import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { connectHealth, healthSupported, openHealthSettings, READ_LABELS } from '@/lib/health';
import { openLink } from '@/lib/links';
import { useStore } from '@/store';
import { Button, ToggleRow } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Card, HStack, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

import { refreshHealthStatus, syncHealth, useHealthSyncState } from './sync';

const HEALTH_CONNECT_PLAY = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

const STEPS = [
  'In the Google Fit app, open Profile → Settings and turn on “Sync Fit with Health Connect”.',
  'Turn on sync below and allow the data types you want.',
  'Titra syncs when you open it and every 15 minutes while it is open. The first sync reaches back 90 days.',
];

/** Settings block for Health Connect, which is how Google Fit data reaches Titra on Android. */
export function HealthConnectSection() {
  const { c } = useTheme();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const clearSynced = useStore((s) => s.clearSynced);
  const { status, syncing, error, last } = useHealthSyncState();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    refreshHealthStatus().catch(() => undefined);
  }, []);

  const enable = async (on: boolean) => {
    setMessage(null);
    if (!on) return update({ healthSync: false });
    try {
      const grants = await connectHealth(settings.healthWriteBack);
      if (grants.read.size === 0) return setMessage('No data types were allowed. Turn sync on again and allow at least one, or manage access in Health Connect.');
      update({ healthSync: true });
      if (!grants.history) setMessage('History access was not allowed, so the first sync covers only the last 30 days.');
      await syncHealth();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Health Connect did not respond.');
    }
  };

  const enableWriteBack = async (on: boolean) => {
    setMessage(null);
    if (!on) return update({ healthWriteBack: false });
    try {
      const grants = await connectHealth(true);
      if (grants.write.size === 0) return setMessage('Write access was not allowed, so entries stay in Titra only.');
      update({ healthWriteBack: true });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Health Connect did not respond.');
    }
  };

  return (
    <Section title="Google Fit · Health Connect">
      {!healthSupported ? (
        <Notice>Health Connect sync runs in the Android app. Google Fit data shows up here once you open Titra on your phone.</Notice>
      ) : status === 'unavailable' || status === 'needs-update' ? (
        <Notice tone="warn" title={status === 'needs-update' ? 'Health Connect needs an update' : 'Health Connect is not available'}>
          {status === 'needs-update' ? 'Update Health Connect from Google Play, then come back.' : 'Health Connect is built into Android 14 and later. On older versions, install it from Google Play.'}
        </Notice>
      ) : (
        <>
          <Card style={{ paddingVertical: space.xs }}>
            <ToggleRow title="Sync with Health Connect" subtitle={READ_LABELS.join(', ') + '.'} value={settings.healthSync} onChange={enable} />
            <ToggleRow
              title="Write back"
              subtitle="Weight, body fat and blood pressure you log in Titra also go to Health Connect, so Google Fit sees them."
              value={settings.healthWriteBack}
              onChange={enableWriteBack}
            />
          </Card>
          {settings.healthSync ? (
            <Card style={{ marginTop: space.md }}>
              <HStack style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{syncing ? 'Syncing…' : settings.healthLastSync ? `Synced ${formatDistanceToNow(new Date(settings.healthLastSync), { addSuffix: true })}` : 'Not synced yet'}</T>
                  {last && !syncing ? (
                    <T variant="small" tone="soft">
                      {last.added} new, {last.updated} updated{last.missing.length ? ` · not allowed: ${last.missing.join(', ')}` : ''}
                    </T>
                  ) : null}
                </View>
                <Button title="Sync now" kind="secondary" small disabled={syncing} icon={<RefreshCw size={16} color={c.ink} />} onPress={() => syncHealth()} />
              </HStack>
              {error ? (
                <T variant="small" style={{ color: c.danger, marginTop: space.sm }}>
                  {error}
                </T>
              ) : null}
              <HStack wrap style={{ marginTop: space.md }}>
                <Button title="Manage access" kind="ghost" small onPress={openHealthSettings} />
                {confirmClear ? (
                  <>
                    <Button
                      title="Remove synced records"
                      kind="danger"
                      small
                      onPress={() => {
                        clearSynced();
                        setConfirmClear(false);
                      }}
                    />
                    <Button title="Cancel" kind="ghost" small onPress={() => setConfirmClear(false)} />
                  </>
                ) : (
                  <Button title="Remove synced records" kind="ghost" small onPress={() => setConfirmClear(true)} />
                )}
              </HStack>
            </Card>
          ) : null}
          {message ? (
            <View style={{ marginTop: space.md }}>
              <Notice tone="warn">{message}</Notice>
            </View>
          ) : null}
          <Card style={{ marginTop: space.md, gap: space.sm }}>
            <T variant="bodyStrong">Getting Google Fit data in</T>
            {STEPS.map((s, i) => (
              <HStack key={i} style={{ alignItems: 'flex-start' }}>
                <T variant="smallStrong" tone="accent" style={{ width: 18 }}>
                  {i + 1}
                </T>
                <T variant="small" tone="soft" style={{ flex: 1 }}>
                  {s}
                </T>
              </HStack>
            ))}
            <Button title="Health Connect on Google Play" kind="ghost" small onPress={() => openLink(HEALTH_CONNECT_PLAY)} style={{ alignSelf: 'flex-start' }} />
          </Card>
        </>
      )}
    </Section>
  );
}
