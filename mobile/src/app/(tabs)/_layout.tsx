import { Redirect, Tabs } from 'expo-router';
import { BookOpen, Calculator, CalendarCheck2, LayoutGrid, Syringe } from 'lucide-react-native';
import { Platform } from 'react-native';

import { useStore } from '@/store';
import { fonts, useTheme } from '@/ui/theme';

export default function TabLayout() {
  const { c } = useTheme();
  const accepted = useStore((s) => s.settings.acceptedTermsAt);
  if (!accepted) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.inkFaint,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, ...(Platform.OS === 'web' ? { height: 64, paddingTop: 6, paddingBottom: 8 } : null) },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <CalendarCheck2 size={22} color={color} /> }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: ({ color }) => <BookOpen size={22} color={color} /> }} />
      <Tabs.Screen name="protocols" options={{ title: 'Protocols', tabBarIcon: ({ color }) => <Syringe size={22} color={color} /> }} />
      <Tabs.Screen name="calculator" options={{ title: 'Calculator', tabBarIcon: ({ color }) => <Calculator size={22} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} /> }} />
    </Tabs>
  );
}
