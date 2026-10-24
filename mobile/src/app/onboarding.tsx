import { router } from 'expo-router';
import { Activity, BookOpenCheck, Lock, Syringe } from 'lucide-react-native';
import { View } from 'react-native';

import { COMPOUNDS } from '@/data/library';
import { useStore } from '@/store';
import { importData } from '@/store/backup';
import { buildSample } from '@/store/sample';
import { PROTOCOL_TEMPLATES } from '@/data/protocols';
import { Button } from '@/ui/controls';
import { HStack, Screen } from '@/ui/layout';
import { T } from '@/ui/text';
import { radius, space, useTheme } from '@/ui/theme';

export default function Onboarding() {
  const { c } = useTheme();
  const update = useStore((s) => s.updateSettings);

  const finish = async (sample: boolean) => {
    const onboardedAt = new Date().toISOString();
    if (sample) {
      const data = buildSample();
      await importData({ ...data, settings: { ...data.settings, onboardedAt } });
    } else update({ onboardedAt });
    router.replace('/');
  };

  const points = [
    {
      Icon: BookOpenCheck,
      title: 'The whole picture',
      body: `${COMPOUNDS.length} compounds and ${PROTOCOL_TEMPLATES.length} ready-to-use protocols, each labelled as label, trial, clinic, community or vendor.`,
    },
    { Icon: Syringe, title: 'A precise log', body: 'Protocols with titration and cycles, reminders, vial maths, estimated levels and site rotation.' },
    { Icon: Activity, title: 'Google Fit, connected', body: 'Steps, workouts, sleep, heart rate and weight sync in through Health Connect.' },
    { Icon: Lock, title: 'Yours alone', body: 'No account. Records stay on this phone, with automatic snapshots and export.' },
  ];

  return (
    <Screen>
      <View style={{ width: 56, height: 56, borderRadius: radius.lg, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl, marginTop: space.xl }}>
        <T variant="title" style={{ color: c.accentInk }}>
          T
        </T>
      </View>
      <T variant="display">Welcome to Titra</T>
      <T tone="soft" style={{ marginTop: space.sm, marginBottom: space.xxl, fontSize: 17, lineHeight: 25 }}>
        Every protocol worth knowing, and a log that never loses your history.
      </T>

      {points.map(({ Icon, title, body }) => (
        <HStack key={title} gap={space.md} style={{ alignItems: 'flex-start', marginBottom: space.lg }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{title}</T>
            <T tone="soft">{body}</T>
          </View>
        </HStack>
      ))}

      <View style={{ height: space.lg }} />
      <Button title="Start with an empty log" onPress={() => finish(false)} />
      <Button title="Explore with sample data" kind="ghost" onPress={() => finish(true)} style={{ marginTop: space.sm }} />
      <T variant="small" tone="faint" center style={{ marginTop: space.md }}>
        The sample has a tirzepatide titration, TRT with hCG and a BPC-157 + TB-500 repair blend. Clear it any time in Settings.
      </T>
    </Screen>
  );
}
