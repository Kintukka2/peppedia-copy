# Titra: architecture and design

Titra is our own take on the PepPedia idea: a peptide reference library, a library of labelled protocols, and a personal tracker synced with Google Fit. It is a personal Android app (built for a Pixel 10), not a store release, so it carries community and vendor practice alongside labels and trials instead of filtering it out. It keeps every mechanic PepPedia users value (see [`peppedia-analysis.md`](peppedia-analysis.md)) and is built to avoid the failures that analysis found.

| PepPedia problem (from the analysis) | Titra's answer |
|---|---|
| AI-curated library with documented errors; "typical doses" with no provenance | Every compound carries a **regulatory status** and an **evidence level**; half-lives come only from human data. Doses live in **protocol templates**, each labelled **label, trial, clinic, community or vendor** with who reports it and links, so a community number is never mistaken for a trial result. |
| Community findings move faster than trials, and PepPedia's best content was practice, not papers | Community and vendor protocols are first-class: structured, one tap to start, shown next to label and trial versions. Named stacks and premixed blends (Wolverine, GLOW, KLOW, CJC-1295/ipamorelin) are included and flagged in the stack check. |
| Mass data loss on 19–20 May 2026, forced logouts | **Local-first, no account.** Data lives on the device, with **rolling snapshots** (daily, and before every import, restore or reset) and one-tap JSON/CSV export. No server holds user records. |
| Reminders silently stopped | Reminders are re-planned from the schedule on every launch and every change, as exact one-off notifications for the next 7 days (at most 60 pending). That handles titration, cycles and every-N-days schedules without fragile repeating triggers. |
| "Synergy" marketing in the interaction checker | Mechanism-based rules (shared receptor, additive glucose/BP/GH-axis effects, combinations studied in trials); an unmatched pair is **"No data"**, never "safe". Pairs people run together show the named stack and its source. |
| No link to activity data | **Google Fit sync through Health Connect**: steps, distance, active energy, exercise minutes, workouts, sleep, resting heart rate, weight, body fat and blood pressure, plus write-back of weight, body fat and BP. Activity feeds insights (steps before and since starting a protocol, resting-HR trend). |
| AI insights making causal claims ("likely enhanced by tirzepatide's cardioprotective effects") | Rule-based insights describe timing and trends only. A unit test enforces no causal wording. |
| Vendor-funded "supporters" wall | No vendors, no ads, no affiliate links. |
| Feature requests: doses left, multiple protocols per vial, currencies, cost per dose/month, syringe stock, more IM sites, half-lives for blends | All built: run-out forecast across every linked protocol, cost per dose and per 30 days, six currencies, supplies with auto-deduction, 18 sites including IM muscles, and blends handled per component. |
| Permissions: draw-over-apps, legacy storage, microphone | Blocked in `app.json` (`SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`). |

## Stack

- **App:** Expo SDK 58 · React Native 0.88 · Expo Router (file routes, JS tabs) · TypeScript strict · React Compiler on. Android only (plus a web build for development); SDK 58 defaults of compile SDK 37 and target SDK 36, with min SDK raised to 26 for Health Connect.
- **State:** Zustand, persisted to AsyncStorage (localStorage on web), versioned with `migrate()`.
- **UI:** in-house design system (`src/ui`) on Inter, with light and dark palettes. Charts, the syringe gauge and the body map are hand-built in `react-native-svg`.
- **Platform modules:** `react-native-health-connect` (bundled Expo config plugin), `expo-build-properties`, `expo-notifications`, `expo-file-system` + `expo-sharing`, `expo-document-picker`, `expo-image-picker`, `expo-haptics`.
- **Builds:** `eas.json` has `development`, `preview` and `production` profiles, all producing an installable APK.
- **Optional Ask server:** Node + `@anthropic-ai/sdk`, `claude-opus-5-5`, library and protocol templates sent as a cached system prompt (`server/`).
- **Tests:** Jest via `jest-expo`, for the pure domain engine and the store.

## Feature map

| Area | Screens | Engine |
|---|---|---|
| Today | `(tabs)/index` with week mood strip, today's doses (log or skip, draw shown in units/mL), adherence, weight trend, activity (steps ring, 7-day sparkline), levels, stack check, stock alerts, insights, library highlight | `schedule.agendaForDay`, `insights.buildInsights` |
| Library | `(tabs)/library` (search, category and status filters, bookmarks), `compound/[id]` (status, evidence, mechanism, single-dose PK curve, labelled protocols, studied regimens, risks, storage, checks against your stack, sources) | `data/library.searchCompounds`, `pk` |
| Protocol library | `templates` (every template, filter by source and by single vs stack/blend), template cards on compound pages and protocol detail | `data/protocols`, `features/protocols/templates` |
| Protocols | `(tabs)/protocols`, `protocol/form` ("Start from a protocol" prefill, compound picker, route, dose with a mcg/mg slip check against the library's ranges, titration steps, **vial & syringe calculator** (powder + water or liquid strength, or a linked vial; per-dose draw in units and mL with the syringe gauge, units for every titration step, doses per vial, optional "add to inventory"), schedule, cycles, dates, reminders), `protocol/[id]` (each dose's draw, titration timeline with units, adherence, level chart, supply, template it started from) | `schedule`, `draw.drawForProtocol`, `templateToProtocols` |
| Logging | `log` (prefilled dose, time, vial deduction, syringe draw, body-map site with rotation suggestion), `history` | `inventory.deduct`, `sites.suggestSite` |
| Inventory | `inventory/*` (powder, solution, oil, oral; blends with GLOW/KLOW/Wolverine presets; vendor, batch, price, expiry, photos), `supplies` | `inventory.forecast`, `costPerDose`, `alerts` |
| Calculator | `(tabs)/calculator`: reconstitute (+ solve-for-water, fill from a protocol and its vial), pre-mixed, oil, blend | `calculator` |
| Levels | `levels`: 24 h / 7 d / 30 d / 60 d, all compounds (relative) or one (absolute) | `pk` |
| Stack check | `interactions` (active stack plus "what if" compounds) | `interactions.checkStack` |
| Activity | `activity` (today vs step goal, 7/30-day bars, distance, active energy, exercise, workouts with source app) | `features/health/activity` |
| Health | `vitals/*` (synced entries marked), `labs/*`, `journal`, `checkin`, `sites`, `insights` | `biomarkers.rangeFor`, `insights` |
| Google Fit sync | Settings → Google Fit · Health Connect (connect, write-back, sync now, manage access, remove synced records) | `lib/health` (native), `features/health/connect` (pure mapping), `features/health/sync` |
| Ask | `ask` (offline library answers; server answers when configured) | `lib/ask`, `server/` |
| Data | `settings`, `backups`, `about`, `onboarding` | `store/backup` |

## Core models

**Dose draw** (`domain/draw.ts`). Every protocol can carry its vial (`mix`: powder amount + water, or a liquid's strength per mL, with blend components) and its syringe. `drawForProtocol` uses the linked inventory vial when it has a concentration, otherwise the protocol's own mix, and returns the volume, U-100 units, what each compound in the vial delivers and doses per vial. Today, the log screen, protocol detail and reminders all show it, e.g. "1 mg · 10 units (0.1 mL)".

**Calculator** (`domain/calculator.ts`). Concentration = amount ÷ diluent mL. Draw mL = dose ÷ concentration. U-100 units = mL × 100. The calculator warns when the draw exceeds the syringe or is under two markings. Solve-for-water inverts the formula: diluent = units × amount ÷ (dose × 100). Blends dose on the first component and deliver the others in proportion.

**Levels** (`domain/pk.ts`). One-compartment model with first-order elimination, k = ln2 / t½. With a labelled time-to-peak, absorption follows the Bateman function; kₐ is solved from tmax by log-space bisection, since tmax(kₐ) is monotone. Without one, each dose is an instant bolus. Doses superpose. "Clears" is the last dose + 5 × t½ + tmax (about 3 % remaining). Tests check halving per half-life, the steady-state accumulation factor 1 / (1 − 2^(−τ/t½)), tmax recovery and the kₐ ≈ k limit.

**Schedules** (`domain/schedule.ts`). Slots per local day for daily (multi-time), weekdays, every-N-days and as-needed. Off-weeks of on/off cycles are skipped, and the dose follows titration steps by elapsed weeks. The agenda matches logs to slots by `scheduledFor`, falling back to the earliest open slot that day. Adherence counts past slots only.

**Inventory** (`domain/inventory.ts`). Stock is the open vial's remaining amount plus sealed vials. A log deducts from stock, opening the next vial when the open one runs out and carrying its diluent volume over. The forecast sums consumption across every active protocol linked to the item.

**Interactions** (`domain/interactions.ts`). Rules match on mechanism classes tagged on each compound. Levels are avoid, caution, monitor, studied together, and no data. Named stacks that contain both compounds are matched from the protocol templates and shown with their source.

**Protocol templates** (`data/protocols/`). Structured protocols: source (`label` · `trial` · `clinic` · `community` · `vendor`), who reports it, route, components with dose and common range, schedule, titration, cycle, run length, premixed vial amounts for blends, practical notes and source links. `templateToProtocols` turns one into the person's own protocols: one for a single compound or a premixed blend (dosed by its first component), one per compound for a stack. A unit test validates every template against the library (ids, routes, units, schedules, titration, blend composition).

**Health Connect** (`lib/health.ts`, `features/health/connect.ts`). Daily totals come from Health Connect's period aggregation, which removes overlap between apps (phone and watch both counting steps) using the person's app priority. They are stored as one vital per kind per day, keyed `hc:<kind>:<date>`; instant records (weight, body fat, BP, resting HR) and sleep sessions keep their Health Connect id, and workouts keep their type and source app. `mergeSynced` upserts by that key, so syncs are idempotent and today's totals update as the day goes on. Records Titra wrote itself are skipped on read. The first sync reaches back 90 days (with history permission); later syncs re-read from two days before the last one so late watch data lands.

## Data and privacy

- No account, no analytics SDK, no ads. Health Connect data is read and stored on the phone only.
- Backups: `store/backup.ts` keeps 7 snapshots in AsyncStorage. Export is a versioned JSON file (`{ app: 'titra', version, data }`); import validates it and runs it through `migrate()`.
- Ask server: receives chat text only, never records.

## What is deliberately not built yet

| Item | Why not yet | Path |
|---|---|---|
| Background sync | Health Connect background reads need an extra permission and a background task; syncing on open and every 15 minutes while open covers daily use | `READ_HEALTH_DATA_IN_BACKGROUND` + `expo-background-task` calling `syncHealth()` |
| Cloud sync between devices | Local-first was the point; sync must not reintroduce data loss | End-to-end-encrypted append-only sync of the JSON snapshot |
| Lab report OCR | Manual entry with per-marker ranges is reliable | On-device OCR into `addLab` |
| Template updates without an app update | Templates ship in the bundle | Fetch a signed templates JSON from the Ask server and merge by template id |
