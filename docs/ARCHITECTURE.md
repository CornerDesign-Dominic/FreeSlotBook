# Architektur

## Frontend

Technologiestack:

- Expo
- React Native
- Expo Router
- TypeScript

Die App ist dateibasiert geroutet und trennt grob zwischen:

- Auth-Screens
- Dashboard
- Owner-Kalenderverwaltung
- Fremdkalendern
- oeffentlichen Kalendern

## Frontend-Struktur

Wichtige Bereiche unter `app/`:

### Auth

- `/login`
- `/register`
- `/forgot-password`

### Dashboard

- `/(tabs)/index`

Zentrale Startseite fuer eingeloggte Nutzer mit:

- eigenem Kalender
- terminbezogenen Benachrichtigungen
- freigegebenen Fremdkalendern

### Owner-Kalender

- `/my-calendar`
- `/my-calendar/[date]`
- `/my-calendar/create-slot`
- `/my-calendar/access`

Diese Screens bilden den Kern der Owner-Verwaltung:

- Monatsansicht
- kombinierte Tagesansicht
- Slot-Erstellung
- Freigaben und Requests

### Oeffentliche und freigegebene Kalender

- `/shared-calendar/[calendarId]`
- `/public-calendar/[calendarId]`
- `/<publicSlug>`

Die slugbasierte Route `/<publicSlug>` ist die primaere oeffentliche URL. Die Route `/public-calendar/[calendarId]` bleibt als Fallback und Kompatibilitaetsweg erhalten.

## Backend

Das Backend basiert auf Firebase:

- Firebase Auth fuer Registrierung, Login und E-Mail-Verifikation
- Firestore fuer Kalender-, Slot-, Buchungs- und Freigabedaten
- Firebase Cloud Functions fuer serverseitige Folgeprozesse

## Firestore-Nutzung

Der Client arbeitet direkt mit Firestore fuer:

- Owner- und Kalender-Setup
- Slot-Erstellung und Statusaenderungen
- Freigaben und Zugriffsanfragen
- Buchungen
- Laden von Kalendern, Slots, Appointments und Notifications

Die fachliche Firestore-Logik ist zentral in:

- `src/features/mvp/repository.ts`

Hooks fuer konsumierende Screens liegen unter:

- `src/features/mvp/`

## E-Mail-System

Versandkanal:

- Resend API

Serverseitige Verarbeitung:

- Firebase Functions

Aktueller Mail-Flow:

1. Ein Fachprozess erzeugt ein Notification-Dokument in Firestore.
2. Die Function `deliverEmailNotification` reagiert auf neue Dokumente unter `calendars/{calendarId}/notifications/{notificationId}`.
3. Die Function prueft `channel = email` und `status = pending`.
4. Danach erfolgt der Versand ueber Resend.
5. Das Notification-Dokument wird auf `processing`, `sent` oder `failed` gesetzt.

## Weitere Functions

Zusatzlogik in `functions/src/index.ts`:

- Rueckverknuepfung von Gast-Terminen auf einen spaeteren Auth-User bei gleicher E-Mail
- Vorbereitung des Account-Einladungsflows ueber Passwortsetz-Link

## Routing

Wichtige Routen:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/my-calendar`
- `/my-calendar/[date]`
- `/my-calendar/create-slot`
- `/my-calendar/access`
- `/shared-calendar/[calendarId]`
- `/public-calendar/[calendarId]`
- `/<publicSlug>`
- `/agb`
- `/datenschutz`

## Oeffentliche Kalender

Oeffentliche Kalender werden ueber das Feld `publicSlug` am Kalender gesteuert.

Primaere URL:

- `/<publicSlug>`

Beispiel:

- `slotlyme.app/dominic-franz`

Technisch wird der Slug ueber eine Mapping-Collection auf eine `calendarId` aufgeloest. Dadurch kann die bestehende Buchungslogik weiterverwendet werden, ohne die fachliche Kalender-ID selbst als oeffentliche Haupt-URL zu verwenden.

## Sicherheitsprinzipien

- Owner-Rechte bleiben an den eigenen Kalender gebunden
- Freigaben und Requests sind statusbasiert
- oeffentliche Nutzer sehen nur oeffentliche Kalender
- bei oeffentlichen Slots ist der Lesezugriff auf buchbare Slots begrenzt
- Buchungen werden transaktional geschrieben, um Doppelbuchungen zu vermeiden

## Wichtige technische Schwerpunkte

- moeglichst kleine serviceorientierte Firestore-Logik statt direkter Screen-Schreibvorgaenge
- reuse derselben Buchungslogik fuer verschiedene Einstiege
- Trennung zwischen Slot, Slot-Historie, Appointment und Notification
- Kompatibilitaetsrouten bleiben erhalten, um bestehende Links nicht sofort zu brechen
