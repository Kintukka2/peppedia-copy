// Ask Titra. With a server configured (Settings → Ask server) questions go to
// the server in /server, which answers with Claude grounded in the library.
// Without one, answers are assembled on-device from library search.
// Only the chat text is sent; none of the person's records are.

import { CATEGORY_LABEL, COMPOUNDS, searchCompounds } from '@/data/library';
import type { Compound } from '@/data/types';
import { formatHours } from '@/lib/links';
import { EVIDENCE_LABEL, STATUS_LABEL } from '@/ui/feedback';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  related?: string[];
  source?: 'server' | 'library';
}

const STOP = new Set('a an and are as at be best by can do does for from how i in is it me my of on or should the to vs what when which who why with you your about between'.split(' '));

/** Compounds a question is about: exact name/alias mentions first, then keyword search. */
export function compoundsFor(question: string): Compound[] {
  const q = question.toLowerCase();
  const named = COMPOUNDS.filter((c) => [c.name, ...c.aliases].some((n) => n.length >= 3 && q.includes(n.toLowerCase())));
  if (named.length) return named.slice(0, 3);
  const words = q.split(/[^a-z0-9-]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const scores = new Map<string, { c: Compound; n: number }>();
  for (const w of words) {
    searchCompounds(w).slice(0, 5).forEach((c, i) => {
      const cur = scores.get(c.id) ?? { c, n: 0 };
      cur.n += 5 - i;
      scores.set(c.id, cur);
    });
  }
  return [...scores.values()].sort((a, b) => b.n - a.n).slice(0, 3).map((s) => s.c);
}

function describe(c: Compound): string {
  const lines = [`${c.name}: ${c.summary}`, `Status: ${STATUS_LABEL[c.regulatory.status]}. ${EVIDENCE_LABEL[c.evidence]}.`];
  if (c.pk) lines.push(`Half-life: about ${formatHours(c.pk.halfLifeHours)} (${c.pk.source}).`);
  else lines.push('Half-life: no reliable human data.');
  if (c.commonSideEffects.length) lines.push(`Common side effects: ${c.commonSideEffects.slice(0, 4).join(', ').toLowerCase()}.`);
  if (c.seriousRisks.length) lines.push(`Serious risks: ${c.seriousRisks.slice(0, 3).join(', ').toLowerCase()}.`);
  return lines.join('\n');
}

export function offlineAnswer(question: string): ChatMessage {
  const hits = compoundsFor(question);
  if (hits.length === 0) {
    return {
      role: 'assistant',
      source: 'library',
      content: `I couldn't match that to a compound in the library. Try a compound name, or browse categories such as ${Object.values(CATEGORY_LABEL).slice(0, 3).join(', ').toLowerCase()}.`,
    };
  }
  const body = hits.map(describe).join('\n\n');
  return {
    role: 'assistant',
    source: 'library',
    related: hits.map((h) => h.id),
    content: `From the library:\n\n${body}\n\nOpen a compound for mechanism, studied regimens and sources. Connect an Ask server in Settings for conversational answers.`,
  };
}

export async function askServer(endpoint: string, token: string, history: ChatMessage[], signal?: AbortSignal): Promise<ChatMessage> {
  const res = await fetch(`${endpoint.replace(/\/+$/, '')}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as { answer?: string; related?: string[]; error?: string };
  if (!res.ok || !data.answer) throw new Error(data.error ?? `Server error ${res.status}`);
  return { role: 'assistant', content: data.answer, related: data.related ?? [], source: 'server' };
}
