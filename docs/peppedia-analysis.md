# PepPedia — Full Product, Mechanics & Architecture Analysis

_Research date: 23–24 Oct 2026. Subject: PepPedia / Pep-Pedia (PEPPEDIA, INC.) — web wiki at pep-pedia.org and the "PepPedia" mobile app (Android `org.peppedia.peppedia`, iOS id `6755275369`)._

---

## 0. TL;DR

- **What it is:** A peptide reference wiki (web) plus a peptide-protocol **tracker app** (iOS + Android). The web side is free: about 92 compound/stack pages, an AI "Ask" chat, a reconstitution calculator with five modes, a compound-interaction database and a glossary. The app adds the personal side: protocols, dose logging, reminders, vial inventory, a half-life "active levels" chart, an injection-site map, vitals from Apple Health / Health Connect, lab uploads, AI insight reports and AI chat. Pro tier costs about **$20/yr** (about $7–8/mo).
- **Who is behind it:** Effectively a **one-person "vibe-coded" project**. It was launched on Reddit in July 2025 and incorporated as PEPPEDIA, INC. The company address is a **virtual mailbox** in Miami. LinkedIn lists 1 employee, and the project is funded by Buy Me a Coffee donations (many from peptide vendors) plus the Pro subscription.
- **Traction:** about **16,749 Android installs**, 4.47★ from 55 ratings. iOS sits at about 1k+ downloads and 3.6–3.7★ from about 62 ratings. Sensor Tower estimates under 5k downloads and under $5k revenue per month.
- **Current status (24 Oct 2026):** the **iOS app is gone from the App Store**. The Apple lookup returns 0 results in 30+ storefronts, store pages return 404, and the developer page lists no apps; it was last seen live about 12 Oct 2026. Android is live at **v2.2.0** (30 Aug 2026).
- **Biggest product weaknesses:**
  - Data loss on Android (19–20 May 2026).
  - Notification breakage (Mar 2026).
  - Health-sync gaps (Garmin, Samsung blood pressure).
  - Patchy pharmacokinetic (PK) data for blends.
  - Owner-admitted **AI-curated content** with documented accuracy errors.
  - A tier limit that once triggered at 3 instead of 5.
  - iOS delisting.

---

## 1. Scope and method

The repository `peppedia-copy` contains **no PepPedia code**; it holds only a one-line README. "Reviewing the code" therefore meant reconstructing the system from every public artifact.

| Source | What it gave | Status |
|---|---|---|
| Google Play listing, Data-safety page, permissions RPC, full review feed (33 written reviews and developer replies) | Features, permissions, data practices, versions, installs, pricing, user sentiment | ✅ Fetched directly |
| Google Play + App Store screenshots (16 images) | UI and mechanics of every major screen | ✅ Inspected |
| Apple iTunes lookup/search APIs, developer page, Apptopia, AppFollow, mwm.ai, Sensor Tower | iOS metadata, version history, prices, privacy label, delisting | ✅ |
| pep-pedia.org homepage HTML, `robots.txt`, `sitemap.xml`, `llms.txt`, `/.well-known/assetlinks.json`, HTTP headers, Next.js React Server Components (RSC) payload | Web stack, page inventory, calculator UI, data model hints, Android package and signing cert | ✅ One pass only (see note) |
| urlscan.io scan, DNS, RDAP, crt.sh, Tranco | Hosting, CDN, email, domain timeline, popularity | ✅ |
| Reddit (Arctic Shift archive), Buy Me a Coffee public log, LinkedIn, competitor pages | Origin story, owner statements, funding, vendor ties, safety incidents | ✅ |
| Android APK (to decompile) | Exact SDKs and source | ❌ Not obtainable: no mirror carries it; APKPure has no copy, the others are behind Cloudflare or blocked. Pulling it from Google Play would need someone's Google account credentials. |

**Note on pep-pedia.org:** its `robots.txt` explicitly disallows `ClaudeBot`, `Claude-User`, `Claude-Web` and `anthropic-ai` (plus GPTBot, CCBot and others). Once that was seen, crawling stopped. The JS bundles, individual peptide pages and the `/api/` routes were **not** fetched, and its backend was never probed. Everything about deeper pages comes from third-party sources.

Confidence labels used below: **[C] Confirmed** from a primary artifact; **[R] Reported** by a third party or search snippet; **[I] Inferred** from evidence (the evidence is given).

---

## 2. Product surfaces at a glance

```
                ┌────────────────────────── pep-pedia.org (Next.js on Railway, behind Cloudflare) ──────────────────────────┐
  Visitors ───► │  Home = "Ask anything" AI chat + suggested prompts     /browse  (≈92 compound & stack pages)            │
                │  /calculator (Reconstitute · Pre-Mixed · IU · Testosterone · Mix)   /ask   /featured   /glossary        │
                │  /about  /privacy  /terms   "Request Peptide"   Login → /account   (/admin = editorial back office)     │
                │  Supporters wall (vendor donors)   Buy-Me-a-Coffee link   "Download the app" QR                         │
                └───────────────▲──────────────────────────────────────────────────────────────────────────▲──────────┘
                                │ same account / synced library ("syncs securely across devices")            │ App Links
                ┌───────────────┴──────── PepPedia app (iOS — delisted; Android 2.2.0) ─────────────────────┴──────────┐
  Users ──────► │ Dashboard · Protocols & titration · Dose log · Reminders · Inventory (photo/batch/vendor/price)      │
                │ Calculator · Half-Life Tracker / Active Levels · Interactions · Injection-site map · Mood check-in    │
                │ Vitals ← Apple Health / Health Connect (weight, body fat, RHR, sleep, steps, BP, cycle)              │
                │ Lab records · AI Insights (2-week report) · AI chat (voice + copy) · Discussions feed · Library       │
                │ Free tier: 5 protocols/compounds · Pro: Monthly / Yearly IAP                                        │
                └──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The web platform (pep-pedia.org)

### 3.1 Positioning
- **Self-description [C]** (`llms.txt`, meta tags, JSON-LD): a "peer-reviewed peptide research platform … Wikipedia-style for peptides". The schema.org type is `Organization + EducationalOrganization`, with a `Dataset` type for the database. It claims 75+ peptides, "free to access, no paywall", and "not a blog and not a vendor".
- **Contradiction [C]:** at launch the owner described the content as **"AI-curated"**, scraped from PubMed, ClinicalTrials.gov, ScienceDirect and Reddit/community documents. The launch post said "aggregated data scraped from reddit (where possible) and papers". The "peer-reviewed by researchers and clinicians" framing came later.
- **Audience [C]** (JSON-LD): researchers, clinicians, pharmacists, biohackers, and "patients interested in peptide therapy".

### 3.2 Page inventory [C] (from `sitemap.xml`: 92 URLs)
- **Core pages:** `/`, `/browse`, `/featured`, `/ask`, plus `/about`, `/glossary`, `/privacy`, `/terms` and `/calculator` from the navigation.
- **88 `/peptides/<slug>` pages**, including:
  - **Compounds:** BPC-157, TB-500, thymosin-beta-4, semaglutide, tirzepatide, retatrutide, orforglipron, survodutide, mazdutide, cagrilintide, eloralintide, bioglutide, CJC-1295 (± DAC), ipamorelin, sermorelin, tesamorelin, MK-677, hexarelin, GHRP-6, HGH, HCG, IGF-1 LR3, PEG-MGF, GHK-Cu, AHK-Cu, NAD+, MOTS-c, SS-31, epitalon, FOXO4-DRI, 5-amino-1MQ, SLU-PP-332, SLU-PP-915, AICAR, klotho, humanin, semax, NA-semax-amidate, selank, cerebrolysin, dihexa, bromantane, P21, omberacetam, pinealon, cyclic-glycine-proline, PE-22-28, KPV, LL-37, thymosin-alpha-1, thymulin, thymalin, VIP, ARA-290, PT-141, melanotan I/II, kisspeptin, oxytocin, TRT, AOD-9604, adipotide, tesofensine, L-carnitine, lipo-C, glutathione, follistatin-344, SNAP-8, PNC-27, PTD-DBM, and Khavinson bioregulators (cartalax, prostamax, testagen, cardiogen, vesugen, livagen, ovagen, vilon, cortagen).
  - **Blends/stacks:** Glow, KLOW, Wolverine stack, Fat Blaster, CJC/IPA protocol, Adamax, Adalank.
- **`robots.txt` disallows** `/api/`, `/account/` and `/admin/`. These confirm a JSON API, a logged-in account area and an admin/editorial back office.

### 3.3 Peptide page data model
Reconstructed from app screenshots [C] and third-party snippets of web pages [R].

| Field | Example | Source |
|---|---|---|
| Name, aliases, class headline | "Retatrutide — Triple GLP-1/GIP/Glucagon Agonist \| Weight Loss & Diabetes" | [C] feature graphic |
| **Research tier badge** | "Extensively Studied" | [C] |
| Typical dose and route badge | "0.5–12 mg weekly · Injectable" | [C] |
| Overview / "What is X?" | free text | [C] |
| Route toggle | **Inj / Oral** (and topical where relevant) | [C] |
| **Research Protocols table** | Goal · Dose · Frequency · Route, e.g. BPC-157 "Tendon/Joint healing 250–500 mcg 1–2× daily SubQ near site". Each row has a **"+"** that creates a protocol in the user's tracker | [C] |
| Timing note | "Injectable BPC-157 is most effective on empty stomach…" | [C] |
| **Research Indications** | Wound Healing — *Most Effective*; Neurological — *Effective* (efficacy badges, editable) | [C] |
| Escalation schedule | retatrutide 0.5 mg → 12 mg by week 20+ | [R] |
| Half-life + citation, storage (2–8 °C), cycle length, FDA warnings | semaglutide t½ 7 d; oxytocin cites FDA Pitocin label | [R] |
| Interactions | pairs with Synergy / Compatible / Monitor / Requires Timing / Avoid | [C]/[R] |
| **Real-world "Health changes"** | aggregated from app users, labelled "Self-reported by PepPedia users. Not clinical evidence." | [R] |
| Community polls | currently using / used / planning | [R] |
| Bookmark | — | [C] |

**Research-tier rule [C]** (owner's launch post): the tier comes from study count. **200+ studies = "Extensively Studied"**, **50–200 = "Well Researched"**, and lower bands below that.

**Interaction database [R]:** the site claims **2,771 documented interactions**. With about 90 compounds there are C(90,2) ≈ 4,000 possible pairs, so the table covers roughly two-thirds of them.

### 3.4 Web features
- **AI "Ask anything" chat [C]**
  - It is the homepage hero, with the disclaimer "Not medical advice. By sending a message you agree to … Terms".
  - Seeded prompts include "best peptides for recovery / weight loss", "BPC-157 vs TB-500", "Can I stack GHK-Cu with BPC-157?", "Reta / Sema / Tirz side effects" and "best peptides for sleep".
  - The privacy policy says chats go to PepPedia's servers, are tied to the account, may be stored, and are processed by third-party AI providers [R].
  - The provider is not disclosed.
- **Calculator [C]**: five tabs (Reconstitute, Pre-Mixed, IU Dosing, Testosterone, Mix). The math is in §5.1.
- **Request Peptide [C]:** a navigation item for users to ask for new compound pages.
- **Login [C]:** web accounts use email/password with optional 2FA and an 18+ age gate [R]. The same account works in the app.
- **Supporters wall [C]:** "Supporters help fund this project through donations. Listing does not imply endorsement or vetting of any vendors." Of the 14 names listed, **11 are peptide-vendor brands or handles** (pyrexlabs.com, kingstonpeptides.com, prestigecompounds.com, heirpeptides.com, bodyandscience.com, aussiepeptides.au, Gulf Coast Amino Acids, Curated Compounds, ig/peptide.warehouse, Optitide.Research, Hero_labz).
- **Client-side providers in the root layout [C]** (from the RSC payload):
  - `ThemeProvider` (light/dark)
  - `ToastProvider`
  - **`CopyProtectionProvider`**: anti-copy/anti-scrape protection on content
  - **`ThreadsFlagProvider`**: a feature flag for community discussion threads
  - `MobileBottomNav` (Home · Browse · Calculator · More)

---

## 4. The mobile app — feature-by-feature mechanics

### 4.1 Dashboard [C]
- **Header:** a greeting with the date, then a **carousel** ("Researchers are studying: BPC-157 — For injury recovery and tissue healing"), which surfaces library content.
- **"This Week" strip:** a daily **mood check-in** with five emoji faces per day and a "+" for unlogged days. Dots mark dose days.
- **Active Protocols cards:**
  - Compound, dose and cadence (Daily / Twice a week / Weekly), plus the next-dose date and time.
  - An **inline U-100 syringe ruler** (0–100) with the draw in **units** (e.g. "10 UNITS").
  - A pill icon replaces the syringe for oral protocols.
- **Today's Doses** with a **Log** button.
- **Cards:** Active Levels, Weight (value, delta, "x lb to go" goal), Injection Sites, Interactions, Inventory, Vitals, Discussions.
- **Vitals chips:** resting HR, steps, weight, body fat and sleep, each showing "Connect" until a health source is linked.

### 4.2 Protocols, titration, logging, reminders
- **Creating a protocol:** a protocol is created from scratch or with one tap from a library "Research Protocols" row [C].
- **Dosing modes (v2.1) [R]:** titration/escalation phases and cycling (on/off). Reviewers confirm "multiple phase titration" and "protocol escalation" [C]. Escalation reportedly does not work for pre-blended protocols [R].
- **Logging [C]:** tap Log on a scheduled dose. v2.2 made logging easier without a connected health app and added activity tracking.
- **Reminders [C]:** local or push notifications per protocol (per-protocol settings since v2.1) [R]. Users reported reminders silently stopping in Mar 2026 [C].
- **Inventory link [C]:** each dose decrements the linked vial's stock ("8 available · 1 used").

### 4.3 Inventory [C]
- **Each item holds:** photo (camera), compound and strength (e.g. "Retatrutide 15mg"), vendor, batch number, price, dates, expiration, and quantity available or used.
- **Linked / Not linked badge:** shows whether the item feeds a protocol.
- Low-stock and expiry reminders are listed in the iOS description [R].
- **Missing per reviews [C]:** doses-remaining forecast; linking one item to more than one protocol (e.g. shared with a partner); non-USD currency; cost per dose/month/year; syringe stock.

### 4.4 Interactions [C]
- **Pairwise check across the active stack:** the screen lists every pair of the user's active compounds. With 5 compounds it shows "10 INTERACTIONS" = C(5,2).
- Each pair is looked up in the interaction table.
- **Tabs:** All / Synergy / Compatible. A detail sheet holds the rationale text, e.g. NAD+ + BPC-157 = Synergistic, "Combined protocols enhance cellular repair and energy production".
- **Marketing claim:** "Avoid bad stacks. Discover safe, synergistic ones."

### 4.5 Injection-site rotation [C]
- **Body map:** male or female, with a Front/Back toggle.
- The last site per compound is shown with its date (e.g. "Left Abdomen — Tirzepatide — Sat, Dec 27").
- Prompt: "Rotate sites to reduce irritation."
- **Requested by users:** more intramuscular muscles, and upper vs lower thigh.

### 4.6 Half-Life Tracker / Active Levels [C]
- Ranges: 24h / 7d / 30d / 60d.
- One curve per compound: solid for the past, dashed for the projection, with vertical dose markers.
- **Per-compound readout:** current amount ("Tirzepatide 4.2 mg") and a **"Clears <date>"**. Blends without a half-life show **"No PK data"** (e.g. "Jolly 30mg").
- A dashboard mini-card shows the total ("4.3 mg · Tirzepatide +1").
- The math is reverse-engineered in §5.2.

### 4.7 Vitals and health data [C]/[R]
- **iOS** reads HealthKit: weight, body fat, resting HR, sleep, steps, blood pressure, cycle.
- **Android** reads Health Connect, which covers the same set where the source app writes it.
- **Gaps users report:** Garmin data, Samsung blood pressure (Samsung no longer writes it to Health Connect), and Apple resting HR in some cases.
- **Manual entries:** weight and notes. Weight units convert (lb/kg, v2.1).

### 4.8 Lab records [C]
Users upload lab reports (photo or file), keep a history, and **compare biomarkers against displayed reference ranges**.

### 4.9 AI Insights (BETA) [C]
- **Report format:** a **two-week report** ("Nov 17 – Nov 30") shown as a story-style deck with "Vitals", weight, symptoms and "Recommendations".
- **Example output:**
  - "You achieved a 7-pound weight loss in 5 days…"
  - "The nausea episode on Nov 18 may be related to your Retatrutide protocol… take with food…"
  - "Excellent downward trend from 74 to 67 bpm … likely enhanced by Tirzepatide's cardioprotective effects."
- **Mechanics [R]:** the 2-week window of logs, vitals and symptoms is sent to an LLM, which returns structured cards (title, explanation, blue action line). New users get a preview; since v2.1 the report runs **on demand every 2 weeks** instead of automatically, which caps LLM cost per user. It is a Pro feature.

### 4.10 AI chat [C]
The same assistant as the web "Ask". v2.2 added **voice input (microphone permission) and copy-answer**.

### 4.11 Discussions [C]
A feed of community threads with **Reddit-sourced posts** (Reddit glyph, e.g. "Before and After on Retatrutide (No TRT)") on the dashboard. The web has a `ThreadsFlagProvider` feature flag for native threads.

### 4.12 Other
- Bookmarks and saved compounds [C].
- CSV/Excel **import** and **export** (v2.1); export is a Pro feature [R].
- In-app **support chat** (v1.2.7) [R].
- Dark mode [C].
- Google Sign-In [R]; Sign in with Apple is required by Apple when Google sign-in is offered [I].

### 4.13 Free vs Pro
| | Free | Pro |
|---|---|---|
| Library, calculator, web wiki | ✅ | ✅ |
| Protocols / inventory compounds | **5** (a bug once enforced 3; the developer confirmed it "changed our limit from 3 to 5") | Unlimited |
| AI Insight Reports | preview | ✅ |
| Data export, "extended tracking" | — | ✅ |

**Pro price points** (named "Peppedia Pro Monthly" and "Peppedia Pro Yearly") [R]:

| Storefront | Monthly | Yearly |
|---|---|---|
| Google Play | "$5.99 – $19.99 per item" [C] | (range covers both plans) |
| iOS (USD storefronts) | $6.99 → $7.99 | $19.99 → $22.99 |
| Canada | C$9.99 | C$24.99 |
| Australia | A$9.99 | A$29.99 |
| Japan | ¥1,100 | ¥8,000 |
| Brazil | R$49.90 | R$299.90 |

- The developer, replying to a review: **"$20/year is intentionally affordable"** [C].
- An IAP range up to $49.99 appeared on iOS at one point (a lifetime unlock or a regional yearly price) [R].

---

## 5. Core math, reverse-engineered

### 5.1 Calculator (all five modes)
Inputs [C]:
- peptide amount (mg, or IU)
- vial size (2 / 3 / 5 / 10 mL)
- bacteriostatic (BAC) water added (mL)
- dose (mg / mcg / IU)
- frequency (1×/day, 2×/day, 1×/wk)
- syringe (30u / 50u / 100u insulin, 1 mL, 3 mL)

```
concentration  C  = peptide_mg / diluent_mL                       (mg/mL)
draw volume    V  = dose_mg / C                                    (mL)
insulin units  U  = V × 100                                        (U-100 syringe: 100 units = 1 mL)
doses per vial N  = peptide_mg / dose_mg
vial duration  D  = N / doses_per_day                              (days; weekly = 1/7 per day)
```

Worked check: 5 mg vial + 2 mL BAC → 2.5 mg/mL. A 250 mcg dose → 0.100 mL = **10 units**, with 20 doses per vial. The screenshot values reproduce exactly. A 15 mg retatrutide vial with 2.5 mL gives 6 mg/mL, so 0.6 mg = 10 units, matching the "Retatrutide 0.6mg Weekly → 10 UNITS" protocol card.

- **Pre-Mixed:** C is known, so only V and U are computed.
- **IU Dosing:** the same math with IU in place of mg (HGH/HCG).
- **Testosterone:** oil at mg/mL (e.g. 200 mg/mL); the weekly dose is split by frequency, then V = dose ÷ C, in mL on a 1 mL or 3 mL syringe.
- **Mix:** a multi-compound blend in one vial. Each component's delivered dose is `component_mg / diluent_mL × V`. The owner publicly conceded early blend math "doesn't work out properly", which was later fixed.

### 5.2 "Active Levels" pharmacokinetic model
Fitting the Half-Life Tracker screenshots pixel by pixel gives:

```
level_c(t) = Σ_i  dose_i · 2^(−(t − t_i) / t½_c)         for each logged dose i of compound c with t_i ≤ t
```

- **One-compartment, first-order elimination, instantaneous bolus.** The curves jump straight up at each dose, so there is **no absorption phase** and no bioavailability factor.
- **The half-life is the literature value per compound.** Measured from the screenshot, tirzepatide's decay fits **t½ ≈ 5.1 days** (published value about 5 days). Pre-dose ≈ 0.8 mg + a 2.5 mg dose → 3.3 mg, which matches the chart.
- **"Clears" date ≈ last dose + 5 × t½** (about 97% eliminated). For tirzepatide, a dose on 27 Dec + 25 d gives 21–22 Jan, matching "Clears Jan 22". For cagrilintide (t½ about 7–8 d), the result matches "Clears Feb 3".
- **Blends without a stored t½ return "No PK data".** This is the most-requested content gap ("half life of many peps are not there").
- **Consequence:** the displayed "mg in body" is a nominal dose-weighted decay, not a plasma concentration. It overstates peaks for slowly absorbed SubQ depots, and it treats oral doses the same as injected ones.

### 5.3 Interaction check
For the active compound set S, the app takes every unordered pair in S, looks each pair up in the interaction table to get a category and rationale, then groups the results by category tab.

---

## 6. Architecture (reconstructed)

### 6.1 Web — confirmed [C]
| Layer | Evidence |
|---|---|
| **Next.js 15 App Router**, React Server Components, ISR | `x-powered-by: Next.js`; `vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`; `x-nextjs-prerender: 1`; `x-nextjs-cache: HIT`; `x-nextjs-stale-time: 300`; `cache-control: s-maxage=31536000`; RSC boundaries `OutletBoundary`, `AsyncMetadataOutlet`, `ViewportBoundary` (Next 15.2+) |
| **Hosting: Railway** | `server: railway-hikari`, `x-railway-edge: iad1`/`cdg1`; `www` CNAME → `ucgrlu0x.up.railway.app` |
| **CDN/WAF: Cloudflare** on the apex | Cloudflare nameservers, a bot challenge (the apex returns 403 to scripts), Cloudflare Web Analytics beacon; registrar moved to Cloudflare on 3 Jun 2026 |
| Fonts | `next/font` self-hosted woff2 plus Lato |
| Email | Google Workspace (MX/SPF) |
| SEO | JSON-LD (Organization, WebSite with SearchAction → `/browse?q=`, Dataset), dynamic `/opengraph-image`, `llms.txt` |
| Anti-AI stance | `robots.txt` blocks GPTBot, CCBot, Claude*, Bytespider, PetalBot, Semrush, Ahrefs, MJ12, DotBot, while `llms.txt` tells LLMs how to describe the brand |
| Third-party JS on the homepage | none besides Cloudflare (no GA, no Meta pixel, no PostHog in the HTML) |

### 6.2 Mobile — inferred [I] (high confidence: React Native + Expo)
| Signal | Points to |
|---|---|
| The Android permission set is exactly Expo's prebuild defaults: `INTERNET`, `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` ("draw over other apps"), `VIBRATE` | Expo / React Native |
| `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, C2DM receive | expo-notifications / FCM scheduled reminders |
| iOS-styled UI identical on Android (same screenshot set) | one cross-platform codebase |
| iOS minimum 15.1 | React Native 0.76+ / Expo SDK 52+ default |
| Android minSdk 26 / targetSdk 36 | Health Connect minimum / current Play requirement |
| The developer told users to "force close the app 2× and reopen to see the fix" | **EAS Update** over-the-air JS bundles applied on next launch |
| XAPK split APKs | AAB via EAS Build |
| `CAMERA`, `RECORD_AUDIO` | inventory and lab photos; voice input in chat |
| Health Connect / HealthKit | react-native-health / react-native-health-connect (or Expo modules) |
| Data-safety form lists crash logs | a crash-reporting SDK (vendor not identifiable without the binary) |

### 6.3 Backend and identity
- **Android App Links [C]:** `/.well-known/assetlinks.json` delegates `handle_all_urls` to `org.peppedia.peppedia` with SHA-256 signing-cert fingerprint `42:4D:73:4E:…:29:EE:E0`. pep-pedia.org links open in the app.
- **Shared account across web and app [C]:** reviewers say it "links in well with … the website", and the iOS description says "Your data syncs securely across devices".
- **API [C]:** `/api/` exists on the Next.js app. It is the most likely backend for the mobile client too [I], with a server-side database. The 19–20 May 2026 incident (all protocols gone, unable to log in) is consistent with a server-side auth/user-data failure or migration, not a local-storage wipe [I].
- **AI [R]:** a third-party LLM provider is called server-side and chats are stored per account. Provider unnamed.
- **Payments [C]:** Google Play Billing and StoreKit subscriptions. A wrapper such as RevenueCat cannot be confirmed without the binary.
- **Data practices declared on Play [C]:**
  - Collected: email (required); user IDs, photos, health info, files/docs (optional); crash logs.
  - **No sharing with third parties.** Encrypted in transit. Deletion on request.
- **iOS privacy label [R]:** Data Linked to You covers Health & Fitness, Email and User ID for "Product Personalisation". No tracking.

---

## 7. Business model and money

| Stream | Detail |
|---|---|
| **Pro subscription** | about $20/yr or about $7–8/mo. Sensor Tower: under $5k/month revenue (iOS) [R] |
| **Buy Me a Coffee** (`buymeacoffee.com/codingit`) | **55 supports / 132 coffees** from 3 Jul 2025 to 18 Aug 2026, about **$660** at $5/coffee [C]. The creator says coffees pay for VPS credits |
| **Vendor "supporters"** | Vendor-branded donors appear from Nov 2025 (Hero_labz, peptide.warehouse) and dominate from Jan 2026: S1Research.net (6), JHBiosciences.com (5), ignitepeptides.com (5), nulifepeptides.com (monthly), aussiepeptides.au, bodyandscience.com (monthly), Gulf Coast Amino Acids, Curated Compounds (5), heirpeptides.com (monthly), peptide.warehouse (monthly), prestigecompounds.com (6), pepshop.com.au, pyrexlabs.com, kingstonpeptides.com [C]. A small donation is enough to appear on the homepage Supporters wall, which works as **paid vendor visibility** while the site states it is "not a vendor" and that listing "does not imply endorsement" |
| Ads | None |
| Affiliate codes | None found |

---

## 8. Company and people

- **PEPPEDIA, INC.** is listed on Google Play at 390 NE 191st St **Ste 30305**, Miami FL 33179, +1 929-641-2850 (a New York area code), support@pep-pedia.org.
  - That address is the published location of **Stable**, a virtual-mailbox service, so the "suite" is a mailbox number.
  - Florida Sunbiz details (filing date, officers) could not be retrieved; Sunbiz is behind Cloudflare and not indexed by aggregators.
- **Team:** solo. LinkedIn "PepPedia" shows 1 employee, "Self-Owned", 3 followers, slogan "Empowering safe, informed peptide use by combining scientific and anecdotal evidence".
  - The Buy Me a Coffee creator page is "codingit" ("Passionate about developing sites that bring community together to learn").
  - Two Reddit accounts have publicly said they own it. One linked a Canny roadmap (`peppedia.canny.io`, now deleted). The other accused clone sites of copying its "card UI".
- **Socials:** a Facebook page (about 10 followers). There is no official X account (@peppedia belongs to someone else), no YouTube, and `r/peppedia` has only 3 posts. A supporter mentions a Discord that "uses this daily".
- **Domains:**
  - `pep-pedia.org` registered 30 Jun 2025; first TLS certificate 2 Jul 2025.
  - `peppedia.com` registered 9 Nov 2025 and redirects to pep-pedia.org.
  - `peptidepedia.app` also redirects.
- **Clones it inspired:** peptpedia.org (Dec 2025) and peptibase.dev (Jan 2026; users called it "just a peppedia copy", and its maker said both were "vibe coded"). Several GitHub projects scrape pep-pedia.org into their own databases.

---

## 9. Timeline

| Date | Event |
|---|---|
| 30 Jun 2025 | pep-pedia.org registered |
| 3 Jul 2025 | First Buy Me a Coffee support |
| 5 Jul 2025 | Launch post r/bpc_157 (28 pts): "protocols, interactions, calculators, dosing — all in one web app" |
| 6 Jul 2025 | r/Peptidesource post (101 pts, 62 comments); the author was banned for unsponsored "solicitation" |
| 13 Jul 2025 | r/Peptides post (**326 pts, 136 comments**). The owner calls the content "AI-curated". Critics flag AI errors (oral BPC-157 "excellent oral bioavailability") and blend-math overdosing; the owner concedes the blend math |
| Jul & Sep 2025 | Outages (client-side exceptions, 502s, the owner taking the site down while pushing changes) |
| 9 Nov 2025 | peppedia.com registered |
| 2 Dec 2025 | Owner accuses peptpedia.org of copying its UI |
| **6 Dec 2025** | **iOS v1.2 launches**; v1.2.1 to v1.2.5 ship within 5 days (Google Sign-In fix, dashboard freeze, dark mode, AI Insight preview) |
| 19 Dec 2025 | Owner: "Think Shotsy but for researchers + more" |
| **30 Dec 2025** | **Android launch** |
| 21–22 Jan 2026 | v1.2.7/1.2.8: in-app support chat, dashboard redesign, Apple Health sync |
| Feb 2026 | Free-tier bug (3 vs 5 compounds) |
| Mar 2026 | Reminder notifications stop for some users |
| **10 Mar 2026 (iOS) / 23 Mar (Android)** | **v2.1**: half-life tracker, titration and cycling, BP and cycle tracking, CSV/Excel import/export, on-demand AI insights, lb/kg |
| 23 Mar 2026 | r/Peptides "First Experience with PT-141": a severe reaction after dosing 1 mg "as pep-pedia suggested" |
| **19–20 May 2026** | **Android data-loss incident**: users report all protocols and inventory gone and logins failing (three 1★ reviews) |
| 3 Jun 2026 | Domain transferred to the Cloudflare registrar |
| 24 Aug 2026 | Context: FDA sends warning letters to injectable-peptide sellers |
| **30 Aug 2026** | **v2.2** on both platforms: easier logging, activity tracking, voice/copy in chat |
| ~12 Oct 2026 | Last third-party sighting of the live iOS listing |
| **23–24 Oct 2026** | **iOS app absent from every storefront tested**; the developer page lists zero apps. Android live. Tranco rank falling (1.29M → 1.50M) |

---

## 10. User sentiment

**Google Play: all 33 written reviews analysed [C]**

| Version | Reviews | Avg ★ |
|---|---|---|
| 1.2.6 | 1 | 5.0 |
| 1.2.8 | 7 | 4.29 |
| 2.1.0 | 2 | 4.5 |
| 2.1.1 | 15 | 4.2 (the data-loss incident sits here) |
| 2.2.0 | 7 | **4.86** |

Star distribution across all ratings: 5★ 38, 4★ 9, 3★ 1, 2★ 3, 1★ 1.

**What people love:**
- An all-in-one app (tracker + calculator + library + inventory + AI).
- A clean UI.
- Health Connect integration.
- Fast, personal developer support (repeatedly praised).
- An affordable price.

**What people hit:**
1. **Data loss / forced logout** (May 2026), the most severe complaint.
2. **Reminders stopped firing** (Mar 2026).
3. **Health-sync gaps:** Garmin, Samsung BP, Apple RHR.
4. **Content staleness:** missing new compounds and blends (e.g. "Super Shred"), missing half-lives.
5. **Tier enforcement bug** (3 vs 5).
6. **Pricing model:** some want a one-time purchase instead of yearly.
7. **Granularity:** more IM muscle sites, a web/PC tracker for bulk inventory entry.

**iOS [R]:** 3.6–3.7★ from about 62 ratings, well below competitors (4.7–4.8★). Complaints include having to "close and reopen to see updates", sign-up errors and "very buggy".

**Reddit [C]:** a strong organic base (about 77 r/Peptides mentions, Jul 2025–Oct 2026; "by far the best website"). Skeptics note it "is not an authority simply because it exists", and one roundup groups it with paid apps lacking community validation.

---

## 11. Risk register

| Risk | Evidence | Severity |
|---|---|---|
| **Platform/regulatory: iOS delisting** | Gone from all storefronts by 23 Oct 2026, reason not published. App Store Guideline **1.4.2** says: "Drug dosage calculators must come from the drug manufacturer, a hospital, university, health insurance company, pharmacy or other approved entity, or receive approval by the FDA…". PepPedia ships a dosing calculator, syringe-unit dose cards and library dose tables for unapproved compounds. Its listings were rewritten into defensive language: calculator outputs "do not determine or recommend a dose"; "generic unit conversion" | **Critical** |
| **Content accuracy** | Owner-admitted AI-curated content; documented errors (oral BPC-157 bioavailability, blend math); a PT-141 adverse event attributed to a site dose; reviews calling it outdated | High |
| **Data durability** | The May 2026 mass data loss and login failure; no evident user-visible backup or restore | High |
| **Conflict of interest** | Vendor-funded "supporters" wall beside "not a vendor" positioning | Medium |
| **AI overreach** | AI Insights draws causal health conclusions ("likely enhanced by Tirzepatide's cardioprotective effects") and gives dosing-adjacent advice | Medium–High |
| **Bus factor** | A solo maintainer, a virtual-mailbox company, past outages from the owner's own deploys | Medium |
| **Privacy** | Sensitive health data plus chats sent to a third-party LLM; Play form says "no sharing" (service-provider processing is legally distinct from sharing) | Medium |
| **Industry enforcement** | FDA warning letters to peptide sellers (Aug 2026); the vendor donors are in that space | Medium |

---

## 12. Competitive landscape

| App | Developer | Rating (count) | Price | Differentiator |
|---|---|---|---|---|
| **PepPedia** | PepPedia, Inc. | Android 4.47 (55) · iOS 3.6 (62), **delisted** | ~$20/yr | Free web wiki + AI + broadest tracker feature set |
| Peptide Tracker & Calculator | David Dzeveckij | 4.77 (580) | $3.99–4.99/mo, $19.99–24.99/yr | Deep vial inventory, "Data Not Collected" privacy label |
| PepTracker | J. A. Villagomez Peredo | 4.75 (468) | $4.99/mo, $47.99/yr | Free tier 2–3 protocols |
| PeptidePal | Blank Labs LLC | 4.69 (4,865) | — | Large user base |
| Pep AI | Zode Development | 4.73 (3,970) | — | AI-first |
| Shotsy | Shotsy Co. | 4.83 (33,898) | $9.99–19.99/mo | GLP-1 pens; the incumbent PepPedia models itself on ("Shotsy for researchers") |
| Pepbase | Ghost Research | 5.0 (4) | Free | On-device data |
| Dosebook | — | 5.0 (7) | Free + IAP | Logbook + library |

**PepPedia's moat** is the SEO-ranked free wiki feeding app installs, plus the most complete feature set at the lowest price. **Its weak points** are reliability, content trust, and now iOS distribution.

---

## 13. Feature-parity checklist (for building an equivalent)

Use this as a spec, and build original content and code. PepPedia's text, data and UI trade dress are its copyright. Its `robots.txt` forbids scraping, and the site runs copy protection.

- **Library:** compound schema (aliases, class, research tier by study count, routes, protocol rows with goal/dose/frequency/route, timing notes, indications with efficacy badge, t½ + citation, storage, escalation tables, warnings), search, bookmarks, "+ add as protocol".
- **Interactions:** pair table with categories (Synergy / Compatible / Monitor / Requires Timing / Avoid) and rationale; pairwise evaluation of the active stack.
- **Calculator:** the five modes and formulas in §5.1; syringe selector; live syringe graphic in units.
- **Tracker:** protocols with titration phases and cycling; per-protocol reminders; dose log; mood check-in; symptom log; injection-site body map (front/back, male/female, IM muscle detail).
- **Inventory:** photo, vendor, batch, price, expiry, quantity; dose-driven decrement; **add what PepPedia lacks:** doses remaining and run-out date, multiple protocols per vial, multi-currency, cost per dose/month/year, syringe and supply stock.
- **PK:** the §5.2 superposition model. Improve on it with an absorption phase (Bateman function) for SubQ/oral routes, per-component t½ for blends, and "clears" at 5 × t½.
- **Health:** HealthKit + Health Connect (weight, body fat, RHR, sleep, steps, BP, cycle), with manual fallback.
- **Labs:** upload + OCR to biomarkers, history, reference ranges.
- **AI:** chat (voice + copy) and 2-week insight reports on demand. Strictly avoid causal or dosing claims.
- **Accounts and sync:** web + app on one account, with **automatic backups, restore, and export** (PepPedia's biggest failure).
- **Monetization:** free tier (5 protocols) and Pro (unlimited, AI reports, export), with a one-time "lifetime" option (requested by users).
- **Compliance:** plan for App Store Guideline 1.4.1/1.4.2 and 5.1.3 from day one. It is the single largest existential risk in this category.

---

## 14. Known gaps
- Exact SDK list (paywall wrapper, crash reporter, AI vendor): needs the APK, which no reachable mirror carries.
- Sunbiz filing details and officers.
- The exact reason and date of the iOS removal.
- The full current iOS screenshot set and the precise Pro feature split.

---

## Sources
- Google Play listing: <https://play.google.com/store/apps/details?id=org.peppedia.peppedia>
- Google Play Data safety: <https://play.google.com/store/apps/datasafety?id=org.peppedia.peppedia>
- Apple developer page (no apps listed): <https://apps.apple.com/us/developer/peppedia-inc/id1852919295>
- Former iOS listing (now 404): <https://apps.apple.com/us/app/peppedia/id6755275369>
- Apptopia: <https://www.apptopia.com/ios/app/6755275369/about>
- AppFollow: <https://apps.appfollow.io/ios/peppedia/6755275369?country=us>
- mwm.ai: <https://mwm.ai/apps/peppedia/6755275369>
- Sensor Tower: <https://app.sensortower.com/overview/6755275369?country=US>
- urlscan.io scan of pep-pedia.org: <https://urlscan.io/result/01a1184e-0f5a-703f-a842-7457e8ff1f1b/>
- RDAP: <https://rdap.org/domain/pep-pedia.org>, <https://rdap.org/domain/peppedia.com>
- Certificate log: <https://crt.sh/?q=%25.pep-pedia.org>
- Buy Me a Coffee: <https://buymeacoffee.com/codingit>
- Stable Miami mailbox location: <https://www.usestable.com/locations/miami-fl>
- LinkedIn: <https://www.linkedin.com/company/peppedia>
- Reddit launch post (r/Peptides): <https://www.reddit.com/r/Peptides/comments/1lys9l5/got_tired_of_hunting_for_peptide_protocols_so_i/>
- Reddit launch post (r/Peptidesource): <https://www.reddit.com/r/Peptidesource/comments/1lspw6r/got_tired_of_hunting_for_peptide_protocols_so_i/>
- Reddit launch post (r/bpc_157): <https://www.reddit.com/r/bpc_157/comments/1ls1tq8/no_more_piecing_together_peptide_info_protocols/>
- Reddit PT-141 thread: <https://www.reddit.com/r/Peptides/comments/1s1tj7s/first_experience_with_pt_141/>
- Reddit accuracy critique: <https://www.reddit.com/r/Peptides/comments/1lys9l5/got_tired_of_hunting_for_peptide_protocols_so_i/n301z68/>
- Competitor roundup: <https://peptidia.app/research/peptide-tracker-alternatives-2026>
- Competitor pricing: <https://lynkdose.com/blog/best-peptide-tracker-app/>
- App Store Review Guidelines 1.4.1 / 1.4.2 / 5.1.3: <https://developer.apple.com/app-store/review/guidelines/>
- FDA enforcement context: <https://www.frierlevitt.com/articles/injectable-peptides-fda-state-enforcement-compounding/>
