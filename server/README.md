# Titra Ask server (optional)

The Titra app answers "Ask" questions offline from its built-in library. Run this small server to get conversational answers from Claude, grounded in the same library.

- **Model:** `claude-opus-5-5` (override with `TITRA_MODEL`), at `medium` effort.
- **Grounding:** the compound library (`mobile/src/data/compounds.ts`) and every protocol template (`mobile/src/data/protocols/`) are sent as a cached system prompt, so repeat questions read them from the prompt cache.
- **Answers:** dosing, protocols, stacks and blends are in scope. Every number is attributed to its source type (label, trial, clinic, community, vendor), thin evidence is called out, and urgent symptoms are pointed to emergency care. Server-side refusal fallbacks are on (`fallbacks: "default"`).
- **Privacy:** the app sends only the chat text. No protocols, logs, vitals or labs leave the device. The server logs token counts, not content.

## Run

```bash
cd server
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # or sign in with `ant auth login`
npm start                             # http://localhost:8787
```

Then in the app: **Settings → Ask Titra server →** `http://<your-machine-ip>:8787` → **Save server**.

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Anthropic credentials (or an `ant auth login` profile). |
| `PORT` | `8787` | Listen port. |
| `TITRA_MODEL` | `claude-opus-5-5` | Claude model id. |
| `TITRA_SERVER_TOKEN` | empty | If set, requests must send `Authorization: Bearer <token>`. |
| `TITRA_ALLOWED_ORIGIN` | `*` | CORS origin for the web build. |

## API

`POST /ask` with `{ "messages": [{ "role": "user", "content": "..." }] }` (up to 16 turns, alternating, last one from the user).
Returns `{ "answer": string, "related": string[] /* compound ids */, "model": string }`.

`GET /health` returns `{ ok, model, compounds, protocols }`.

## Deploying

Any Node 22 host works (Railway, Fly.io, Render, a VPS). Set `TITRA_SERVER_TOKEN` and put the server behind HTTPS before exposing it publicly, then enter the same token under **Settings → Ask Titra server** in the app.
