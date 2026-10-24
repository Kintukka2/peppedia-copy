import { router } from 'expo-router';
import { BookOpenCheck, Check, Lock, Syringe } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { COMPOUNDS } from '@/data/library';
import { useStore } from '@/store';
import { importData } from '@/store/backup';
import { buildSample } from '@/store/sample';
import { Button, tap } from '@/ui/controls';
import { Card, HStack, Screen } from '@/ui/layout';
import { T } from '@/ui/text';
import { radius, space, useTheme } from '@/ui/theme';

function Check2({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.sm }}>
      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {on ? <Check size={16} color={c.accentInk} /> : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );
}

export default function Onboarding() {
  const { c } = useTheme();
  const update = useStore((s) => s.updateSettings);
  const [adult, setAdult] = useState(false);
  const [edu, setEdu] = useState(false);
  const ready = adult && edu;

  const finish = async (sample: boolean) => {
    const acceptedTermsAt = new Date().toISOString();
    if (sample) {
      const data = buildSample();
      await importData({ ...data, settings: { ...data.settings, acceptedTermsAt } });
    } else update({ acceptedTermsAt });
    router.replace('/');
  };

  const points = [
    { Icon: BookOpenCheck, title: 'An honest library', body: `${COMPOUNDS.length} compounds rated by regulatory status and human evidence. Unknowns are labelled as unknown.` },
    { Icon: Syringe, title: 'A precise log', body: 'Protocols with titration and cycles, reminders, vial maths, estimated levels and site rotation.' },
    { Icon: Lock, title: 'Private by default', body: 'No account. Your records stay on this device, with automatic snapshots and export.' },
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
        Peptide research you can trust, and a log that never loses your history.
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

      <Card style={{ marginTop: space.md, marginBottom: space.xl }}>
        <Check2 on={adult} onPress={() => setAdult(!adult)} label="I am 18 or older." />
        <Check2 on={edu} onPress={() => setEdu(!edu)} label="I understand Titra is educational and for record-keeping. It is not medical advice and does not recommend doses." />
      </Card>

      <Button title="Start with an empty log" onPress={() => finish(false)} disabled={!ready} />
      <Button title="Explore with sample data" kind="ghost" onPress={() => finish(true)} disabled={!ready} style={{ marginTop: space.sm }} />
      <T variant="small" tone="faint" center style={{ marginTop: space.md }}>
        Sample data uses approved medicines at labelled regimens. You can clear it any time in Settings.
      </T>
    </Screen>
  );
}
