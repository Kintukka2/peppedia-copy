import { router } from 'expo-router';
import {
  Activity,
  Footprints,
  Layers,
  ClipboardList,
  FlaskConical,
  HardDriveDownload,
  HeartPulse,
  History,
  Info,
  Lightbulb,
  MessageCircleQuestion,
  NotebookPen,
  Package,
  PersonStanding,
  Settings,
  ShieldAlert,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { Card, Row, Screen, Section } from '@/ui/layout';
import { space, useTheme } from '@/ui/theme';

interface Item {
  title: string;
  subtitle: string;
  href: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Tracking',
    items: [
      { title: 'Inventory', subtitle: 'Vials, blends, batches, cost per dose', href: '/inventory', Icon: Package },
      { title: 'Supplies', subtitle: 'Syringes, swabs, water', href: '/supplies', Icon: ClipboardList },
      { title: 'Dose history', subtitle: 'Everything you have logged', href: '/history', Icon: History },
      { title: 'Estimated levels', subtitle: 'Half-life curves', href: '/levels', Icon: Activity },
      { title: 'Stack check', subtitle: 'Pairwise interaction rules', href: '/interactions', Icon: ShieldAlert },
      { title: 'Injection sites', subtitle: 'Rotation map', href: '/sites', Icon: PersonStanding },
    ],
  },
  {
    title: 'Health',
    items: [
      { title: 'Activity', subtitle: 'Steps, workouts and energy from Google Fit', href: '/activity', Icon: Footprints },
      { title: 'Vitals', subtitle: 'Weight, body fat, heart rate, BP, sleep', href: '/vitals', Icon: HeartPulse },
      { title: 'Labs', subtitle: 'Biomarkers and reference ranges', href: '/labs', Icon: FlaskConical },
      { title: 'Journal', subtitle: 'Mood, energy and symptoms', href: '/journal', Icon: NotebookPen },
      { title: 'Insights', subtitle: 'Observations from your records', href: '/insights', Icon: Lightbulb },
    ],
  },
  {
    title: 'Learn',
    items: [
      { title: 'Protocol library', subtitle: 'Label, trial, clinic, community and vendor protocols', href: '/templates', Icon: Layers },
      { title: 'Ask Titra', subtitle: 'Questions answered from the library', href: '/ask', Icon: MessageCircleQuestion },
    ],
  },
  {
    title: 'App',
    items: [
      { title: 'Settings', subtitle: 'Units, reminders, Google Fit, theme', href: '/settings', Icon: Settings },
      { title: 'Backups & export', subtitle: 'Snapshots, JSON and CSV', href: '/backups', Icon: HardDriveDownload },
      { title: 'About & methodology', subtitle: 'How evidence, sources, levels and checks work', href: '/about', Icon: Info },
    ],
  },
];

export default function MoreScreen() {
  const { c } = useTheme();
  return (
    <Screen large title="More">
      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title}>
          <Card style={{ paddingVertical: space.xs }}>
            {g.items.map((it, i) => (
              <Row
                key={it.title}
                title={it.title}
                subtitle={it.subtitle}
                onPress={() => router.push(it.href)}
                last={i === g.items.length - 1}
                left={
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <it.Icon size={18} color={c.accent} />
                  </View>
                }
              />
            ))}
          </Card>
        </Section>
      ))}
    </Screen>
  );
}
