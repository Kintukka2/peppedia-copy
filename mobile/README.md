# Titra (mobile app)

Peptide reference, labelled protocol library and private tracker for Android, synced with Google Fit through Health Connect. Built with Expo SDK 58, React Native 0.88, Expo Router and TypeScript.

## Run it

```bash
cd mobile
npm install
npx expo start          # press a (Android device/emulator) or w (web)
```

Health Connect (Google Fit sync), reminders, camera and the share sheet need a build of the app, not Expo Go:

```bash
npx eas-cli@latest build --platform android --profile preview       # installable APK
npx eas-cli@latest build --platform android --profile development   # APK with the dev client, for npx expo start --dev-client
npx expo run:android                                                # local build with the Android SDK installed
```

Everything else runs in Expo Go and on the web.

| Command | What it does |
|---|---|
| `npm test` | Jest unit tests: calculator, PK, schedules, interactions, inventory, sites, insights, protocol templates, Health Connect mapping and sync merge, store and backups |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm run export:web` | Static web build in `dist/` |

## Layout

```
src/
  app/        Expo Router screens (tabs: Today, Library, Protocols, Calculator, More)
  data/       Library content: compounds, protocol templates (labelled by source), sites, lab reference ranges, types
  domain/     Pure logic with tests: calculator, pk, schedule, interactions, inventory, sites, insights, units
  store/      Zustand store persisted to AsyncStorage; rolling snapshots, export/import; sample data
  features/   Feature modules: protocols (template cards, conversion), health (Health Connect mapping, sync, activity), inventory
  lib/        Health Connect bridge, notifications, Ask client, file sharing, formatting helpers
  ui/         Design system: theme tokens, text, layout, controls, charts, syringe gauge, body map
```

See [`../docs/titra-architecture.md`](../docs/titra-architecture.md) for how each feature works and why it is built that way.
