import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

export async function openLink(url: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener');
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}

/** Formats hours as "45 min", "13 h" or "7 days". */
export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Number(h.toFixed(h < 10 ? 1 : 0))} h`;
  const d = h / 24;
  return `${Number(d.toFixed(d < 10 ? 1 : 0))} days`;
}
