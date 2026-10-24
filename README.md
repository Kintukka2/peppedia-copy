# peppedia-copy → Titra

Research on PepPedia, and **Titra**: our own peptide reference, labelled protocol library and private tracker for Android, synced with Google Fit through Health Connect.

![Titra screens](docs/screenshots/titra-overview.png)

| Path | What it is |
|---|---|
| [`mobile/`](mobile/) | The Titra app (Expo SDK 58, React Native, TypeScript). Android, plus a web build for development. |
| [`server/`](server/) | Optional "Ask Titra" server that answers questions with Claude, grounded in the app's library. |
| [`docs/titra-architecture.md`](docs/titra-architecture.md) | How Titra works, feature by feature, and how it answers PepPedia's weaknesses. |
| [`docs/peppedia-analysis.md`](docs/peppedia-analysis.md) | The PepPedia teardown: product, mechanics, architecture, business, risks. |

## Quick start

```bash
cd mobile && npm install
npm test                                     # domain engine, templates, Health Connect mapping, store
npx expo start --web                         # quick look in a browser (no Health Connect)
```

### On the phone (Pixel 10)

Health Connect is a native module, so Expo Go can't run it. Build an APK once and install it:

```bash
cd mobile
npx eas-cli@latest build --platform android --profile preview   # cloud build → APK download link
# or locally, with Android Studio's SDK installed:
npx expo run:android --variant release
```

Then in the app: **More → Settings → Google Fit · Health Connect → Sync with Health Connect**. In the Google Fit app, turn on **Profile → Settings → Sync Fit with Health Connect** so Fit's steps, workouts, sleep and weight flow in.

Every protocol in the library is labelled with its source: **label**, **trial**, **clinic**, **community** or **vendor**.
