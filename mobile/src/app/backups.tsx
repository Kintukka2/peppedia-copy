import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { pickTextFile, shareTextFile } from '@/lib/files';
import { useStore } from '@/store';
import { buildExport, doseLogCsv, importData, listSnapshots, parseExport, restoreSnapshot, takeSnapshot, type Snapshot } from '@/store/backup';
import { Button } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

const REASON: Record<string, string> = {
  daily: 'Daily',
  manual: 'Manual',
  'before-import': 'Before import',
  'before-restore': 'Before restore',
  'before-reset': 'Before reset',
};

export default function BackupsScreen() {
  const { c } = useTheme();
  const logs = useStore((s) => s.logs);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [status, setStatus] = useState<{ tone: 'neutral' | 'danger'; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listSnapshots().then(setSnaps);
  }, []);
  useEffect(refresh, [refresh]);

  const run = async (fn: () => Promise<string | void>) => {
    setStatus(null);
    try {
      const msg = await fn();
      if (msg) setStatus({ tone: 'neutral', text: msg });
    } catch (e) {
      setStatus({ tone: 'danger', text: e instanceof Error ? e.message : 'Something went wrong.' });
    }
    refresh();
  };

  const stamp = format(new Date(), 'yyyy-MM-dd');

  return (
    <Screen back title="Backups & export">
      <Notice>Your records live only on this device. Titra keeps the last seven snapshots automatically (daily, and before any import, restore or reset). Export a file regularly to keep a copy elsewhere.</Notice>

      <Section title="Export" style={{ marginTop: space.xl }}>
        <Card style={{ gap: space.md }}>
          <Button title="Export full backup (JSON)" onPress={() => run(async () => shareTextFile(`titra-backup-${stamp}.json`, JSON.stringify(buildExport(), null, 2), 'application/json'))} />
          <Button title={`Export dose log (CSV, ${logs.length} rows)`} kind="secondary" onPress={() => run(async () => shareTextFile(`titra-doses-${stamp}.csv`, doseLogCsv(), 'text/csv'))} />
        </Card>
      </Section>

      <Section title="Import">
        <Card style={{ gap: space.sm }}>
          <T tone="soft">Replaces current records with a Titra backup file. A snapshot is taken first.</T>
          <Button
            title="Import backup file"
            kind="secondary"
            onPress={() =>
              run(async () => {
                const text = await pickTextFile();
                if (text === null) return;
                const parsed = parseExport(text);
                if ('error' in parsed) throw new Error(parsed.error);
                await importData(parsed.data);
                return `Imported ${parsed.data.logs.length} doses, ${parsed.data.protocols.length} protocols.`;
              })
            }
          />
        </Card>
      </Section>

      {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}

      <Section title="On-device snapshots" style={{ marginTop: space.xl }} action={<Button title="Snapshot now" kind="ghost" small onPress={() => run(async () => (await takeSnapshot('manual'), 'Snapshot saved.'))} />}>
        {snaps.length === 0 ? (
          <T tone="soft">No snapshots yet. One is taken automatically each day you open the app with data.</T>
        ) : (
          <Card style={{ paddingVertical: space.xs }}>
            {snaps.map((s, i) => (
              <View key={s.at} style={{ paddingVertical: space.md, borderBottomWidth: i < snaps.length - 1 ? 1 : 0, borderBottomColor: c.border }}>
                <HStack style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong">{format(new Date(s.at), 'EEE d MMM, HH:mm')}</T>
                    <T variant="small" tone="soft">
                      {REASON[s.reason] ?? s.reason} · {s.counts.logs} doses · {s.counts.protocols} protocols · {s.counts.inventory} vials
                    </T>
                  </View>
                  {confirm === s.at ? null : <Button title="Restore" kind="ghost" small onPress={() => setConfirm(s.at)} />}
                </HStack>
                {confirm === s.at ? (
                  <HStack style={{ marginTop: space.sm }}>
                    <Button
                      title="Restore this snapshot"
                      small
                      onPress={() =>
                        run(async () => {
                          setConfirm(null);
                          return (await restoreSnapshot(s.at)) ? 'Snapshot restored. Your previous state was saved as a snapshot too.' : 'Snapshot not found.';
                        })
                      }
                    />
                    <Button title="Cancel" kind="ghost" small onPress={() => setConfirm(null)} />
                  </HStack>
                ) : null}
              </View>
            ))}
          </Card>
        )}
      </Section>
    </Screen>
  );
}
