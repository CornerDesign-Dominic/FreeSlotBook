# E-Mail-Zustellung im MVP

## Ziel

Vorhandene `notifications`-Datensaetze mit `channel = email` sollen zu echten E-Mails fuehren, ohne die Buchungslogik selbst zu blockieren.

## Gewaehlte Architektur

- Die App erzeugt weiterhin fachliche Daten:
  - `appointments`
  - Slot-Status und Slot-Events
  - `notifications`
- Die echte E-Mail-Zustellung passiert nachgelagert per Firebase Cloud Function.
- Trigger:
  - `calendars/{calendarId}/notifications/{notificationId}`
  - nur fuer neue Dokumente mit:
    - `channel = email`
    - `status = pending`

Warum das fuer das MVP passt:

- Die Buchung bleibt der ausloesende Fachprozess.
- Ein Mailfehler macht die Buchung nicht rueckgaengig.
- Vorhandene Notification-Datenbasis wird weiterverwendet.
- Keine separate Queue-Infrastruktur noetig.

## Welche Mails aktuell versendet werden

- `booking_confirmation`
  - an den Gast nach erfolgreicher oeffentlicher Buchung
- `booking_created`
  - an den Kalenderinhaber bei neuer oeffentlicher Buchung
- `account_creation_invite`
  - wenn bei der Gastbuchung die Konto-Checkbox aktiviert wurde
  - die Function legt dafuer, falls noetig, einen Firebase-Auth-User zur E-Mail an
  - anschliessend wird ein echter Passwortsetz-Link ueber Firebase Auth erzeugt und per Mail versendet

## Zustellstatus

Notification-Dokumente verwenden dabei:

- `pending`
- `processing`
- `sent`
- `failed`

Optionales Fehlerfeld:

- `deliveryError`

## Provider

Die Cloud Function verwendet derzeit die Resend HTTP API.

Noetige Secrets vor Deployment:

- `RESEND_API_KEY`
- `MAIL_FROM_EMAIL`

Beispiel:

```powershell
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set MAIL_FROM_EMAIL
```

Danach deployen:

```powershell
firebase deploy --only functions
```

## Lokal testbar

Lokal direkt pruefbar:

- ob bei Buchungen `notifications` mit `channel = email` entstehen
- ob Statusfelder vorhanden sind
- ob die Cloud Function kompiliert

Erst nach Deployment wirklich testbar:

- echte E-Mail-Zustellung
- Secret-Nutzung
- Function-Trigger in Firebase

## Noch nicht umgesetzt

- HTML-Templates ueber einfache Grundstruktur hinaus
- providerunabhaengige Mail-Abstraktion
- eigene App-Seite fuer den kompletten Abschluss innerhalb der App
- Retry-/Backoff-Strategien ueber den einfachen `failed`-Status hinaus

## Gast-zu-Konto-Flow im aktuellen MVP

1. Gast bucht einen oeffentlichen Slot mit aktivierter Checkbox zur Kontoanlage.
2. Die Buchung wird normal gespeichert und bleibt nicht vom Account-Flow abhaengig.
3. Es entsteht zusaetzlich eine `account_creation_invite`-Notification mit `channel = email`.
4. Die Cloud Function:
   - prueft, ob zur E-Mail bereits ein Firebase-Auth-User existiert
   - legt ihn bei Bedarf an
   - erzeugt einen Passwortsetz-Link ueber Firebase Auth
   - versendet diesen Link per E-Mail
5. Der Gast setzt ueber den Link sein Passwort und kann sich danach mit derselben E-Mail normal anmelden.

Was dadurch bereits sauber funktioniert:

- die E-Mail-Adresse des Gasts wird fuer spaetere Anmeldung nutzbar
- vorhandene Gast-Bookings bleiben ueber dieselbe `participantEmailKey` anschlussfaehig
- ein separater Registrierungszwang vor der Buchung bleibt vermieden

Was noch offen bleibt:

- eine vollautomatische harte Verknuepfung alter Gasttermine mit einer User-ID
- eine In-App-Abschlussseite nach dem Klick auf den Passwortsetz-Link

## Rueckverknuepfung von Gastbuchungen zu Firebase-Auth-Usern

Im aktuellen MVP wird die Rueckverknuepfung jetzt serverseitig ueber Cloud Functions erledigt.

Ausloeser:

1. Wenn ein neuer Firebase-Auth-User mit einer E-Mail angelegt wird
2. Wenn eine neue Gastbuchung entsteht und zu dieser E-Mail bereits ein Firebase-Auth-User existiert

Was angepasst wird:

- `appointments/.../bookedByUserId`
- `appointments/.../createdByUserId` falls dort noch kein Wert gesetzt ist

Welche Buchungen betroffen sind:

- nur Buchungen mit `guestBooking = true`
- nur Buchungen mit passender gleicher `participantEmailKey`
- nur Buchungen, die noch keine `bookedByUserId` besitzen

Warum das fuer das MVP passt:

- keine Massenmigration noetig
- idempotent, weil bereits verknuepfte Termine uebersprungen werden
- die bestehende Gastbuchung bleibt fachlich erhalten
- spaetere User-bezogene Logik kann trotzdem auf einer echten `uid` aufsetzen
