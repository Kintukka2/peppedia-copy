import { router } from 'expo-router';
import { ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { getCompound } from '@/data/library';
import { SOURCE_LABEL, stacksWith } from '@/data/protocols';
import type { Compound } from '@/data/types';
import { checkStack, LEVEL_LABEL, LEVEL_ORDER, type StackItem } from '@/domain/interactions';
import { SourceBadge } from '@/features/protocols/components';
import { summaryLine } from '@/features/protocols/templates';
import { useStore } from '@/store';
import { Button, Chip } from '@/ui/controls';
import { Badge, EmptyState, LEVEL_TONE, Notice } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { CompoundPicker } from '@/ui/pickers';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

export default function InteractionsScreen() {
  const { c } = useTheme();
  const protocols = useStore((s) => s.protocols);
  const [extra, setExtra] = useState<Compound[]>([]);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const stack: StackItem[] = useMemo(() => {
    const seen = new Set<string>();
    const out: StackItem[] = [];
    for (const p of protocols) {
      if (p.status !== 'active') continue;
      const key = p.compoundId ?? p.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ compound: getCompound(p.compoundId), name: p.name });
    }
    for (const x of extra) {
      if (!seen.has(x.id)) {
        seen.add(x.id);
        out.push({ compound: x, name: x.name });
      }
    }
    return out;
  }, [protocols, extra]);

  const pairs = useMemo(() => checkStack(stack), [stack]);
  const counts = LEVEL_ORDER.map((l) => ({ l, n: pairs.filter((p) => p.level === l).length })).filter((x) => x.n > 0);

  return (
    <Screen back title="Stack check">
      <T tone="soft" style={{ marginBottom: space.lg }}>
        Every pair in your active protocols is checked against mechanism-based rules (shared receptors, additive effects, combinations studied in trials) and matched against named stacks and blends from clinics, the community and vendors.
      </T>

      <Section title="Stack" action={<Button title={adding ? 'Done' : 'Try adding one'} kind="ghost" small onPress={() => setAdding(!adding)} />}>
        <HStack wrap>
          {stack.map((s) => {
            const isExtra = !!s.compound && extra.some((e) => e.id === s.compound!.id);
            return <Chip key={s.compound?.id ?? s.name} label={s.name} icon={isExtra ? <X size={12} color={c.ink} /> : undefined} onPress={isExtra ? () => setExtra(extra.filter((e) => e.id !== s.compound!.id)) : undefined} />;
          })}
        </HStack>
        {adding ? (
          <View style={{ marginTop: space.md }}>
            <CompoundPicker
              onPick={(x) => {
                setExtra([...extra, x]);
                setAdding(false);
              }}
            />
            <T variant="small" tone="faint">
              Added compounds are only for this check; nothing is saved.
            </T>
          </View>
        ) : null}
      </Section>

      {stack.length < 2 ? (
        <EmptyState title="Nothing to compare" body="Add a second compound, either as a protocol or with “Try adding one”, to check the pair." />
      ) : (
        <>
          <HStack wrap style={{ marginBottom: space.lg }}>
            {counts.map(({ l, n }) => (
              <Badge key={l} label={`${n} ${LEVEL_LABEL[l].toLowerCase()}`} tone={LEVEL_TONE[l]} />
            ))}
          </HStack>
          {pairs.map((p) => {
            const key = (p.a.compound?.id ?? p.a.name) + '|' + (p.b.compound?.id ?? p.b.name);
            const expanded = open === key;
            const named = p.a.compound && p.b.compound ? stacksWith(p.a.compound.id, p.b.compound.id) : [];
            return (
              <Card key={key} style={{ marginBottom: space.md }}>
                <Pressable onPress={() => setOpen(expanded ? null : key)} accessibilityRole="button" accessibilityState={{ expanded }}>
                  <HStack style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <T variant="bodyStrong">
                        {p.a.name} + {p.b.name}
                      </T>
                      <T variant="small" tone="soft">
                        {p.findings[0].title}
                      </T>
                      {named.length ? (
                        <T variant="small" tone="accent">
                          Named stack: {named.map((t) => `${t.name} (${SOURCE_LABEL[t.source]})`).join(', ')}
                        </T>
                      ) : null}
                    </View>
                    <Badge label={LEVEL_LABEL[p.level]} tone={LEVEL_TONE[p.level]} />
                    {expanded ? <ChevronUp size={18} color={c.inkFaint} /> : <ChevronDown size={18} color={c.inkFaint} />}
                  </HStack>
                </Pressable>
                {expanded ? (
                  <View style={{ marginTop: space.md, gap: space.md }}>
                    {p.findings.map((f, i) => (
                      <View key={i}>
                        <HStack>
                          <Badge label={LEVEL_LABEL[f.level]} tone={LEVEL_TONE[f.level]} />
                          <T variant="smallStrong">{f.title}</T>
                        </HStack>
                        <T tone="soft" style={{ marginTop: 4 }}>
                          {f.detail}
                        </T>
                      </View>
                    ))}
                    {named.map((t) => (
                      <Pressable key={t.id} onPress={() => router.push(`/templates?q=${encodeURIComponent(t.name)}`)} accessibilityRole="link">
                        <HStack>
                          <SourceBadge source={t.source} />
                          <T variant="smallStrong" style={{ flex: 1 }}>
                            {t.name}
                          </T>
                        </HStack>
                        <T tone="soft" style={{ marginTop: 4 }}>
                          {summaryLine(t)}. {t.goal}
                        </T>
                      </Pressable>
                    ))}
                    {(!p.a.compound || !p.b.compound) && (
                      <T variant="small" tone="faint">
                        Custom compounds are not in the library, so no rules apply to them.
                      </T>
                    )}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </>
      )}

      <Notice title="What the levels mean">
        <View style={{ gap: 4 }}>
          <T variant="small" tone="soft">
            Avoid: duplicated mechanism or a clear additive risk. Caution: an additive effect worth planning around. Monitor: known additive effects; watch symptoms or labs.
          </T>
          <T variant="small" tone="soft">
            Studied together: tested as a combination in human trials. No data: no rule applies, which is not evidence of safety.
          </T>
          <T variant="small" tone="soft">
            Named stacks show that people run the pair together and how; the source label says who reports it.
          </T>
        </View>
      </Notice>
    </Screen>
  );
}
