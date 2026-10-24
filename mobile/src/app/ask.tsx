import { router } from 'expo-router';
import { ArrowUp, Sparkles } from 'lucide-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { getCompound } from '@/data/library';
import { askServer, offlineAnswer, type ChatMessage } from '@/lib/ask';
import { useStore } from '@/store';
import { Chip } from '@/ui/controls';
import { Notice } from '@/ui/feedback';
import { Screen } from '@/ui/layout';
import { T } from '@/ui/text';
import { fonts, radius, space, useTheme } from '@/ui/theme';

const SUGGESTIONS = [
  'How does tirzepatide differ from semaglutide?',
  'What is known about BPC-157 in humans?',
  'Which compounds have FDA approval?',
  'How do I work out units for a 10 mg vial with 2 mL water?',
  'What are the risks of melanotan II?',
];

export default function AskScreen() {
  const { c } = useTheme();
  const endpoint = useStore((s) => s.settings.askEndpoint);
  const token = useStore((s) => s.settings.askToken);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setDraft('');
    setError(null);
    const history: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(history);
    setBusy(true);
    try {
      const reply = endpoint ? await askServer(endpoint, token, history) : offlineAnswer(q);
      setMessages([...history, reply]);
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Could not reach the server.'} Showing the library answer instead.`);
      setMessages([...history, offlineAnswer(q)]);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <Screen
      back
      title="Ask Titra"
      scroll={false}
      padded={false}
      footer={
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question"
            placeholderTextColor={c.inkFaint}
            onSubmitEditing={() => send(draft)}
            returnKeyType="send"
            accessibilityLabel="Question"
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.ink, fontFamily: fonts.regular }]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(draft)} disabled={!draft.trim() || busy} style={[styles.send, { backgroundColor: draft.trim() ? c.accent : c.surfaceAlt }]}>
            <ArrowUp size={20} color={draft.trim() ? c.accentInk : c.inkFaint} />
          </Pressable>
        </View>
      }>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View>
            <View style={[styles.hero, { backgroundColor: c.accentSoft }]}>
              <Sparkles size={22} color={c.accent} />
            </View>
            <T variant="title" style={{ marginBottom: 4 }}>
              Ask about any compound
            </T>
            <T tone="soft" style={{ marginBottom: space.lg }}>
              {endpoint ? 'Answers come from the Titra library via your Ask server.' : 'Answers come from the on-device library. Add an Ask server in Settings for conversational answers.'} Not medical advice.
            </T>
            <View style={{ gap: space.sm, alignItems: 'flex-start' }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => send(s)} />
              ))}
            </View>
          </View>
        ) : (
          messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? { alignSelf: 'flex-end', backgroundColor: c.accent } : { alignSelf: 'flex-start', backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }]}>
              <T selectable style={{ color: m.role === 'user' ? c.accentInk : c.ink }}>
                {m.content}
              </T>
              {m.related?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm }}>
                  {m.related.map((id) => {
                    const cp = getCompound(id);
                    return cp ? <Chip key={id} label={cp.name} onPress={() => router.push(`/compound/${id}`)} /> : null;
                  })}
                </View>
              ) : null}
              {m.role === 'assistant' ? (
                <T variant="small" tone="faint" style={{ marginTop: 6 }}>
                  {m.source === 'server' ? 'Ask server · library-grounded' : 'On-device library'}
                </T>
              ) : null}
            </View>
          ))
        )}
        {busy ? <ActivityIndicator color={c.accent} style={{ marginTop: space.md, alignSelf: 'flex-start' }} /> : null}
        {error ? (
          <View style={{ marginTop: space.md }}>
            <Notice tone="warn">{error}</Notice>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  bubble: { maxWidth: '88%', padding: space.md, borderRadius: radius.lg, marginBottom: space.md },
  composer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: { flex: 1, minHeight: 44, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg, fontSize: 16, outlineStyle: 'none' } as never,
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
