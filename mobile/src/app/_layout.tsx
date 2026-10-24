import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AUTO_SYNC_MS, shouldAutoSync, syncHealth } from '@/features/health/sync';
import { healthSupported } from '@/lib/health';
import { remindersSupported, syncReminders } from '@/lib/notifications';
import { useStore } from '@/store';
import { dailySnapshot } from '@/store/backup';
import { ThemeProvider, useTheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

/** Keeps scheduled reminders in step with protocols and logs. */
function ReminderSync() {
  const protocols = useStore((s) => s.protocols);
  const logs = useStore((s) => s.logs);
  const inventory = useStore((s) => s.inventory);
  const enabled = useStore((s) => s.settings.remindersEnabled);
  const syringe = useStore((s) => s.settings.syringe);
  useEffect(() => {
    if (!remindersSupported) return;
    const t = setTimeout(() => syncReminders(protocols, logs, enabled, inventory, syringe).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [protocols, logs, enabled, inventory, syringe]);

  useEffect(() => {
    if (!remindersSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { protocolId?: string; scheduledFor?: string };
      if (data?.protocolId) router.push({ pathname: '/log', params: { protocolId: data.protocolId, scheduledFor: data.scheduledFor ?? '' } });
    });
    return () => sub.remove();
  }, []);
  return null;
}

/** Pulls new Health Connect data on launch, on return to the app and every 15 minutes while open. */
function HealthAutoSync() {
  const enabled = useStore((s) => s.settings.healthSync);
  useEffect(() => {
    if (!enabled || !healthSupported) return;
    const run = () => {
      if (shouldAutoSync()) syncHealth();
    };
    run();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
    const timer = setInterval(run, AUTO_SYNC_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [enabled]);
  return null;
}

function Navigator() {
  const { c, dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'default' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        {['protocol/form', 'log', 'inventory/form', 'vitals/add', 'labs/add', 'checkin'].map((name) => (
          <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />
        ))}
      </Stack>
      <ReminderSync />
      <HealthAutoSync />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    dailySnapshot().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1 }} />;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Navigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
