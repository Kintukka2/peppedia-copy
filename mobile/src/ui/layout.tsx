import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from './text';
import { radius, space, useTheme } from './theme';

export const MAX_WIDTH = 640;

interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** Large in-content title for tab roots; compact bar title otherwise. */
  large?: boolean;
  back?: boolean;
  /** Modal screens show a close button instead of back. */
  modal?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  padded?: boolean;
}

export function Screen({ title, subtitle, large, back, modal, right, children, scroll = true, footer, padded = true }: ScreenProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const bar = (back || modal || (!large && title) || right) && (
    <View style={[styles.bar, { paddingTop: insets.top + space.sm, backgroundColor: c.bg, borderBottomColor: large ? 'transparent' : c.border }]}>
      <View style={styles.barSide}>
        {(back || modal) && (
          <Pressable accessibilityRole="button" accessibilityLabel={modal ? 'Close' : 'Back'} onPress={goBack} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            {modal ? <X size={18} color={c.ink} /> : <ChevronLeft size={20} color={c.ink} />}
          </Pressable>
        )}
      </View>
      {!large && title ? (
        <T variant="heading" numberOfLines={1} style={styles.barTitle}>
          {title}
        </T>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[styles.barSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );

  const head = large && title && (
    <View style={{ marginBottom: space.lg }}>
      <T variant="display">{title}</T>
      {subtitle ? (
        <T tone="soft" style={{ marginTop: 2 }}>
          {subtitle}
        </T>
      ) : null}
    </View>
  );

  const topPad = bar ? space.lg : insets.top + space.lg;
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[padded && styles.padded, { paddingTop: topPad, paddingBottom: insets.bottom + 120 }]}>
      <View style={styles.column}>
        {head}
        {children}
      </View>
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingTop: topPad }, padded && styles.padded]}>
      <View style={[styles.column, { flex: 1 }]}>
        {head}
        {children}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {bar}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopColor: c.border }]}>
            <View style={styles.column}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export function Card({ children, style, onPress, tint }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void; tint?: string }) {
  const { c } = useTheme();
  const base = [styles.card, { backgroundColor: tint ?? c.surface, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginBottom: space.xxl }, style]}>
      {(title || action) && (
        <View style={styles.sectionHead}>
          {title ? (
            <T variant="micro" tone="soft">
              {title}
            </T>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
}

/** List row inside a Card. */
export function Row({ title, subtitle, left, right, onPress, chevron = !!onPress, last }: RowProps) {
  const { c } = useTheme();
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      {left ? <View style={{ marginRight: space.md }}>{left}</View> : null}
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T variant="small" tone="soft" numberOfLines={2} style={{ marginTop: 1 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ? <View style={{ marginLeft: space.sm }}>{right}</View> : null}
      {chevron ? <ChevronRight size={18} color={c.inkFaint} style={{ marginLeft: space.xs }} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {content}
    </Pressable>
  );
}

export function Gap({ size = space.md }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export function HStack({ children, gap = space.sm, style, wrap }: { children: ReactNode; gap?: number; style?: ViewStyle; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function IconButton({ onPress, children, label }: { onPress: () => void; children: ReactNode; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.6 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barSide: { width: 72, justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: { paddingHorizontal: space.lg },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
    paddingHorizontal: 2,
    minHeight: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
