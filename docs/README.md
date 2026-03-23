# Slotly 1.0

Slotly ist eine kalenderbasierte Slot- und Terminbuchungsanwendung auf Basis von Expo, Firebase Auth, Firestore und Firebase Functions.

Die verbindlichen Architekturquellen sind:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`
- `docs/CODEX_EXECUTION_PLAN.md`

## Kernmodell

- interne User-Identitaet: Firebase Auth UID
- kanonischer User-Root: `users/{uid}`
- Kalender als eigene Ressource: `calendars/{calendarId}`
- kalenderlokale Membership: `calendars/{calendarId}/access/{uid}`
- getrennte Invite- und Access-Request-Flows
- getrennte Routen:
  - `/user/{username}`
  - `/calendar/{calendarSlug}`

## Entwicklung

```bash
npm install
npx expo start
```

## Qualitaetssicherung

```bash
npx tsc --noEmit
npm run lint
npm run test:firestore
```

## Firebase

Zentrale Konfigurationsdateien:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

Firestore-Indexes deployen:

```bash
firebase deploy --only firestore:indexes
```
