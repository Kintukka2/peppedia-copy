import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { fonts, useTheme, type Palette } from './theme';

export type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'micro' | 'metric';
export type Tone = 'ink' | 'soft' | 'faint' | 'accent' | 'warn' | 'danger' | 'positive' | 'violet' | 'onAccent';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  metric: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
};

export function toneColor(c: Palette, tone: Tone): string {
  switch (tone) {
    case 'ink':
      return c.ink;
    case 'soft':
      return c.inkSoft;
    case 'faint':
      return c.inkFaint;
    case 'accent':
      return c.accent;
    case 'warn':
      return c.warn;
    case 'danger':
      return c.danger;
    case 'positive':
      return c.positive;
    case 'violet':
      return c.violet;
    case 'onAccent':
      return c.accentInk;
  }
}

export interface TProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  tabular?: boolean;
  center?: boolean;
}

export function T({ variant = 'body', tone = 'ink', tabular, center, style, ...rest }: TProps) {
  const { c } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        VARIANTS[variant],
        { color: toneColor(c, tone) },
        tabular && { fontVariant: ['tabular-nums'] },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
