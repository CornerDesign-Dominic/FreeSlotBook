# Projektuebersicht

Slotly 1.0 ist eine Slot- und Terminbuchungsanwendung mit getrennten Nutzer- und Kalenderidentitaeten.

Die harte Architekturreferenz liegt in:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`
- `docs/CODEX_EXECUTION_PLAN.md`

## Produktkern

- Registrierung und Login mit Firebase Auth
- kanonische interne User-Identitaet ueber UID
- automatischer Bootstrap mit einem ersten privaten Kalender
- kalenderlokale Membership, Invites und Access Requests
- Slot-Erstellung und Buchung auf Kalenderbasis
- private und oeffentliche Kalender-Links
- E-Mail-Zustellung ueber Notification-Dokumente und Cloud Functions

## Rollen

- Owner: verwaltet Kalender, Membership, Requests, Invites und Slots
- Member: hat kalenderlokalen Zugriff und kann freigegebene Slots buchen
- Guest: kann oeffentliche Kalender ohne Konto buchen

## Oeffentliche Routen

- User-Link: `/user/{username}`
- Kalender-Link: `/calendar/{calendarSlug}`

Diese beiden Linktypen sind fachlich getrennt.

## Aktueller Scope

Die Registrierung erzeugt heute genau einen privaten Startkalender.
Die Architektur bleibt aber mehrkalenderfaehig und kalenderlokal modelliert.
