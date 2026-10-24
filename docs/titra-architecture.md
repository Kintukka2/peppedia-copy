# Titra: architecture and design

Titra is our own take on the PepPedia idea: a peptide reference library plus a personal protocol tracker. It keeps every mechanic PepPedia users value (see [`peppedia-analysis.md`](peppedia-analysis.md)) and is built to avoid the failures that analysis found.

| PepPedia problem (from the analysis) | Titra's answer |
|---|---|
| AI-curated library with documented errors; "typical doses" for unapproved compounds | Evidence-first library. Every entry carries a **regulatory status** and an **evidence level**. Half-lives and regimens appear **only** from an approved label or a published human trial, with the source named. Unknowns say "No reliable human PK data" or "No dosing regimen has been established". |
| App Store guideline 1.4.2 exposure (dosing calculators), iOS delisting | The calculator is framed and worded as arithmetic on user inputs; the library never prescribes. No community or vendor protocols. Sample data uses approved medicines at labelled regimens. |
| Mass data loss on 19–20 May 2026, forced logouts | **Local-first, no account.** Data lives on the device, with **rolling snapshots** (daily, and before every import, restore or reset) and one-tap JSON/CSV export. No server holds user records. |
| Reminders silently stopped | Reminders are re-planned from the schedule on every launch and every change, as exact one-off notifications for the next 7 days (under iOS's 64-pending cap). That handles titration, cycles and every-N-days schedules without fragile repeating triggers. |
| "Synergy" marketing in the interaction checker | Mechanism-based rules (shared receptor, additive glucose/BP/GH-axis effects, combinations studied in trials). No "synergy" claims; an unmatched pair is **"No data"**, never "safe". |
| AI insights making causal claims ("likely enhanced by tirzepatide's cardioprotective effects") | Rule-based insights describe timing and trends only. A unit test enforces no causal wording. |
| Vendor-funded "supporters" wall | No vendors, no ads, no affiliate links. |
| Feature requests: doses left, multiple protocols per vial, currencies, cost per dose/month, syringe stock, more IM sites, half-lives for blends | All built: run-out forecast across every linked protocol, cost per dose and per 30 days, six currencies, supplies with auto-deduction, 18 sites including IM muscles, and blends handled per component. |
| Permissions: draw-over-apps, legacy storage, microphone | Blocked in `app.json` (`SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`). |

## Stack

- **App:** Expo SDK 58 · React Native 0.88 · Expo Router (file routes, JS tabs) · TypeScript strict · React Compiler on.
- **State:** Zustand, persisted to AsyncStorage (localStorage on web), versioned with `migrate()`.
- **UI:** in-house design system (`src/ui`) on Inter, with light and dark palettes. Charts, the syringe gauge and the body map are hand-built in `react-native-svg`.
- **Platform modules:** `expo-notifications`, `expo-file-system` + `expo-sharing`, `expo-document-picker`, `expo-image-picker`, `expo-haptics`.
- **Optional Ask server:** Node + `@anthropic-ai/sdk`, `claude-opus-5-5`, library sent as a cached system prompt (`server/`).
- **Tests:** Jest via `jest-expo`, for the pure domain engine and the store.

## Feature map

| Area | Screens | Engine |
|---|---|---|
| Today | `(tabs)/index` with week mood strip, today's doses (log or skip, draw shown in units/mL), adherence, weight trend, levels, stack check, stock alerts, insights, library highlight | `schedule.agendaForDay`, `insights.buildInsights` |
| Library | `(tabs)/library` (search, category and status filters, bookmarks), `compound/[id]` (status, evidence, mechanism, single-dose PK curve, studied regimens, risks, storage, checks against your stack, sources) | `data/library.searchCompounds`, `pk` |
| Protocols | `(tabs)/protocols`, `protocol/form` (compound picker, route, dose, titration steps, daily / weekdays / every N days / as needed, on-off cycles, dates, vial link, reminders), `protocol/[id]` (titration timeline, adherence, level chart, supply) | `schedule` |
| Logging | `log` (prefilled dose, time, vial deduction, syringe draw, body-map site with rotation suggestion), `history` | `inventory.deduct`, `sites.suggestSite` |
| Inventory | `inventory/*` (powder, solution, oil, oral; blends; vendor, batch, price, expiry, photos), `supplies` | `inventory.forecast`, `costPerDose`, `alerts` |
| Calculator | `(tabs)/calculator`: reconstitute (+ solve-for-water), pre-mixed, oil, blend | `calculator` |
| Levels | `levels`: 24 h / 7 d / 30 d / 60 d, all compounds (relative) or one (absolute) | `pk` |
| Stack check | `interactions` (active stack plus "what if" compounds) | `interactions.checkStack` |
| Health | `vitals/*`, `labs/*`, `journal`, `checkin`, `sites`, `insights` | `biomarkers.rangeFor`, `insights` |
| Ask | `ask` (offline library answers; server answers when configured) | `lib/ask`, `server/` |
| Data | `settings`, `backups`, `about`, `onboarding` | `store/backup` |

## Core models

**Calculator** (`domain/calculator.ts`). Concentration = amount ÷ diluent mL. Draw mL = dose ÷ concentration. U-100 units = mL × 100. The calculator warns when the draw exceeds the syringe or is under two markings. Solve-for-water inverts the formula: diluent = units × amount ÷ (dose × 100). Blends dose on the first component and deliver the others in proportion.

**Levels** (`domain/pk.ts`). One-compartment model with first-order elimination, k = ln2 / t½. With a labelled time-to-peak, absorption follows the Bateman function; kₐ is solved from tmax by log-space bisection, since tmax(kₐ) is monotone. Without one, each dose is an instant bolus. Doses superpose. "Clears" is the last dose + 5 × t½ + tmax (about 3 % remaining). Tests check halving per half-life, the steady-state accumulation factor 1 / (1 − 2^(−τ/t½)), tmax recovery and the kₐ ≈ k limit.

**Schedules** (`domain/schedule.ts`). Slots per local day for daily (multi-time), weekdays, every-N-days and as-needed. Off-weeks of on/off cycles are skipped, and the dose follows titration steps by elapsed weeks. The agenda matches logs to slots by `scheduledFor`, falling back to the earliest open slot that day. Adherence counts past slots only.

**Inventory** (`domain/inventory.ts`). Stock is the open vial's remaining amount plus sealed vials. A log deducts from stock, opening the next vial when the open one runs out and carrying its diluent volume over. The forecast sums consumption across every active protocol linked to the item.

**Interactions** (`domain/interactions.ts`). Rules match on mechanism classes tagged on each compound. Levels are avoid, caution, monitor, studied together, and no data.

## Data and privacy

- No account, no analytics SDK, no ads. The Play data-safety form for this app would list nothing shared and nothing collected off-device.
- Backups: `store/backup.ts` keeps 7 snapshots in AsyncStorage. Export is a versioned JSON file (`{ app: 'titra', version, data }`); import validates it and runs it through `migrate()`.
- Ask server: receives chat text only, never records.

## What is deliberately not built yet

| Item | Why not yet | Path |
|---|---|---|
| Apple Health / Health Connect sync | Needs native modules and a dev build; manual entry covers the same metrics now | `react-native-health` / `react-native-health-connect` config plugins writing into `addVital` |
| Paid tier | Nothing is paywalled in the prototype | RevenueCat; gate unlimited protocols, export and Ask |
| Cloud sync between devices | Local-first was the point; sync must not reintroduce data loss | End-to-end-encrypted append-only sync of the JSON snapshot |
| Lab report OCR | Manual entry with per-marker ranges is reliable | On-device OCR into `addLab` |
| Store submission | Needs EAS credentials | `npx eas-cli@latest build`; App Store medical-category review (guidelines 1.4.1, 1.4.2, 5.1.3) |
