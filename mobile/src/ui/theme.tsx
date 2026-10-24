import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useStore } from '@/store';

export const palettes = {
  light: {
    bg: '#F4F3EF',
    surface: '#FFFFFF',
    surfaceAlt: '#ECEAE4',
    border: '#E2DFD7',
    ink: '#15171A',
    inkSoft: '#5B6068',
    inkFaint: '#8E939A',
    accent: '#0F766E',
    accentInk: '#FFFFFF',
    accentSoft: '#D9EFEB',
    warn: '#B45309',
    warnSoft: '#FCEFD9',
    danger: '#B42318',
    dangerSoft: '#FBE5E3',
    positive: '#15803D',
    positiveSoft: '#DDF2E4',
    violet: '#5B4FCF',
    violetSoft: '#ECEAFD',
    overlay: 'rgba(21,23,26,0.4)',
  },
  dark: {
    bg: '#0E1012',
    surface: '#171A1D',
    surfaceAlt: '#202428',
    border: '#2A2F34',
    ink: '#F1F2F3',
    inkSoft: '#A9AFB6',
    inkFaint: '#737A82',
    accent: '#2DD4BF',
    accentInk: '#06201D',
    accentSoft: '#123430',
    warn: '#F5A524',
    warnSoft: '#3A2A10',
    danger: '#F87171',
    dangerSoft: '#3B1818',
    positive: '#4ADE80',
    positiveSoft: '#123321',
    violet: '#A5A0FF',
    violetSoft: '#24224A',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type Palette = { [K in keyof typeof palettes.light]: string };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

interface ThemeValue {
  c: Palette;
  dark: boolean;
}

const ThemeContext = createContext<ThemeValue>({ c: palettes.light, dark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = useStore((s) => s.settings.theme);
  const dark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const value = useMemo<ThemeValue>(() => ({ c: dark ? palettes.dark : palettes.light, dark }), [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
