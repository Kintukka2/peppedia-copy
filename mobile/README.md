# Titra (mobile app)

Evidence-first peptide reference and private protocol log, built with Expo SDK 58, React Native 0.88, Expo Router and TypeScript.

## Run it

```bash
cd mobile
npm install
npx expo start          # press i (iOS simulator), a (Android emulator) or w (web)
```

Reminders, Health data, camera and the share sheet need a development build (`npx expo run:ios|android` or `npx eas-cli@latest build --profile development`). Everything else runs in Expo Go and on the web.

| Command | What it does |
|---|---|
| `npm test` | Jest unit tests for the domain engine and store (calculator, PK, schedules, interactions, inventory, sites, insights, backups) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm run export:web` | Static web build in `dist/` |

## Layout

```
src/
  app/        Expo Router screens (tabs: Today, Library, Protocols, Calculator, More)
  data/       Library content: compounds, sites, lab reference ranges, types
  domain/     Pure logic with tests: calculator, pk, schedule, interactions, inventory, sites, insights, units
  store/      Zustand store persisted to AsyncStorage; rolling snapshots, export/import; sample data
  lib/        Notifications, Ask client, file sharing, formatting helpers
  ui/         Design system: theme tokens, text, layout, controls, charts, syringe gauge, body map
```

See [`../docs/titra-architecture.md`](../docs/titra-architecture.md) for how each feature works and why it is built that way.
