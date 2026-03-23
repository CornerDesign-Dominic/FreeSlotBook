# Architektur

Die kanonische Architekturdefinition liegt in:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`
- `docs/CODEX_EXECUTION_PLAN.md`

## Frontend

Technologiestack:

- Expo
- React Native
- Expo Router
- TypeScript

Wichtige Routen:

- `/login`
- `/register`
- `/(tabs)/index`
- `/my-calendar`
- `/my-calendar/[date]`
- `/my-calendar/create-slot`
- `/my-calendar/access`
- `/shared-calendar/[calendarId]`
- `/public-calendar/[calendarId]`
- `/calendar/[calendarSlug]`
- `/user/[username]`

Die fachlich verbindlichen oeffentlichen Routen sind `/calendar/[calendarSlug]` fuer Kalender und `/user/[username]` fuer Nutzer. Aeltere Kompatibilitaetsrouten koennen weiterleiten, sind aber nicht die semantische Primaerroute.

## Domain Layer

Die Firestore-Logik liegt zentral unter `src/domain/` und ist in klar getrennte Bereiche aufgeteilt:

- `repository-core.ts`
- `repository-membership.ts`
- `repository-scheduling.ts`
- `repository.ts`

UI-Komponenten sollen keine verteilten Core-Writes direkt implementieren.

## Backend

Das Backend basiert auf:

- Firebase Auth
- Cloud Firestore
- Firebase Cloud Functions
- Resend fuer E-Mail-Zustellung

Notification-Dokumente liegen in `notifications/{notificationId}`.
Die Function `deliverEmailNotification` verarbeitet dort neue E-Mail-Notifications.
