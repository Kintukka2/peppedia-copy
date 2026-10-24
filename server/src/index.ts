// Optional "Ask Titra" server. The app works fully offline; when Settings →
// Ask server points at this service, questions are answered by Claude,
// grounded in the same library and protocol templates the app ships with.
//
// Privacy: the app sends only the chat messages. No protocols, logs, vitals
// or labs ever leave the device. This server logs token usage, not content.

import Anthropic from '@anthropic-ai/sdk';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { COMPOUNDS } from '../../mobile/src/data/compounds.ts';
import { PROTOCOL_TEMPLATES } from '../../mobile/src/data/protocols/index.ts';

const MODEL = process.env.TITRA_MODEL ?? 'claude-opus-5-5';
const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.TITRA_SERVER_TOKEN ?? '';
const ALLOWED_ORIGIN = process.env.TITRA_ALLOWED_ORIGIN ?? '*';
const MAX_MESSAGES = 16;
const MAX_CHARS = 4000;
const MAX_BODY_BYTES = 200_000;

const client = new Anthropic();

const INSTRUCTIONS = `You are the research assistant inside Titra, a personal peptide reference and tracking app that one person runs on their own Android phone. They ask about peptides and related compounds: mechanisms, human evidence, regulatory status, side effects, pharmacokinetics, interactions, protocols and dosing, stacks and blends, reconstitution, and how to use the app.

Ground answers in the Titra library below. It has the compounds (half-lives and studied regimens from labels and published human trials) and protocol templates, each labelled by source: label, trial, clinic, community or vendor. When the library covers the question, answer from it and name the compounds and templates you draw on. When it doesn't, use your wider knowledge of the literature and of what clinics and the peptide community commonly report, and say it comes from outside the library.

Dosing, protocols and stacks are in scope. Give concrete numbers (dose and unit, frequency, timing, titration steps, cycle and run length) and attribute each to its source type, for example "Label:", "Trial:", "Clinic:", "Community:", "Vendor:". Keep the tiers distinct: say plainly when a protocol has no human trial behind it, and when community reports vary, give the common range and the usual starting point rather than a single number. Include the practical details that matter: reconstitution maths, timing around food and sleep, injection practice, what people monitor (for example fasting glucose, hematocrit, estradiol, blood pressure, resting heart rate) and the side effects or red flags that mean stop. If someone describes urgent symptoms (chest pain, trouble breathing, a severe allergic reaction, fainting), tell them to get emergency care first.

The calculator does reconstitution arithmetic: concentration is the amount in the vial divided by the liquid added, and on a U-100 insulin syringe, units equal millilitres times 100. Show the working when asked.

The app also syncs Google Fit data through Health Connect (steps, distance, active energy, workouts, sleep, resting heart rate, weight, body fat, blood pressure); you can explain how that works, but you never see the person's records.

Write plain text for a phone screen: lead with the direct answer, use short paragraphs or simple "-" bullets, no tables or headings, usually under 250 words.`;

const LIBRARY =
  `<titra_library compounds="${COMPOUNDS.length}">\n${JSON.stringify(COMPOUNDS)}\n</titra_library>\n` +
  `<titra_protocols templates="${PROTOCOL_TEMPLATES.length}">\n${JSON.stringify(PROTOCOL_TEMPLATES)}\n</titra_protocols>`;

const SYSTEM: Anthropic.Beta.BetaTextBlockParam[] = [
  { type: 'text', text: INSTRUCTIONS },
  // The library is large and identical on every request, so it is cached.
  { type: 'text', text: LIBRARY, cache_control: { type: 'ephemeral', ttl: '1h' } },
];

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseMessages(body: unknown): Anthropic.Beta.BetaMessageParam[] {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, 'Send { messages: [{ role, content }] }.');
  const messages = raw.slice(-MAX_MESSAGES).map((m) => {
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) {
      throw new HttpError(400, 'Each message needs role "user" or "assistant" and non-empty string content.');
    }
    return { role, content: content.slice(0, MAX_CHARS) } as Anthropic.Beta.BetaMessageParam;
  });
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') throw new HttpError(400, 'The last message must be from the user.');
  return messages;
}

/** Library compounds named in the answer, so the app can link to them. */
function relatedCompounds(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: { id: string; at: number }[] = [];
  for (const c of COMPOUNDS) {
    const names = [c.name, ...c.aliases].map((n) => n.toLowerCase()).filter((n) => n.length >= 3);
    let at = Infinity;
    for (const n of names) {
      const re = new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
      const m = re.exec(lower);
      if (m) at = Math.min(at, m.index);
    }
    if (at !== Infinity) hits.push({ id: c.id, at });
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, 4).map((h) => h.id);
}

async function answer(messages: Anthropic.Beta.BetaMessageParam[]) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages,
    output_config: { effort: 'medium' },
    // On a safety decline, the API retries on a suitable fallback model within the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  const message = await stream.finalMessage();
  const u = message.usage;
  console.log(
    `[ask] model=${message.model} stop=${message.stop_reason} in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens}`,
  );

  if (message.stop_reason === 'refusal') {
    return {
      answer: 'I can’t help with that question. I can explain what the library says about a compound’s evidence, status, side effects or pharmacokinetics.',
      related: [],
      model: message.model,
    };
  }
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  const truncated = message.stop_reason === 'max_tokens';
  return {
    answer: (text || 'I could not produce an answer. Please try rephrasing.') + (truncated ? '\n\n(Answer cut short.)' : ''),
    related: relatedCompounds(text),
    model: message.model,
  };
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large.');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Body must be JSON.');
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, model: MODEL, compounds: COMPOUNDS.length, protocols: PROTOCOL_TEMPLATES.length });
    if (req.method !== 'POST' || req.url !== '/ask') throw new HttpError(404, 'Not found.');
    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) throw new HttpError(401, 'Unauthorised.');
    const messages = parseMessages(await readJson(req));
    send(res, 200, await answer(messages));
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'The assistant is busy. Try again in a moment.' });
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[ask] Anthropic authentication failed; check ANTHROPIC_API_KEY.');
      return send(res, 502, { error: 'The server is not configured correctly.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[ask] Anthropic API error ${err.status}: ${err.message}`);
      return send(res, 502, { error: 'The assistant is unavailable right now.' });
    }
    console.error('[ask] Unexpected error', err);
    send(res, 500, { error: 'Unexpected server error.' });
  }
});

server.listen(PORT, () => {
  console.log(`Titra Ask server on :${PORT} · model ${MODEL} · ${COMPOUNDS.length} compounds${TOKEN ? ' · token required' : ''}`);
});
