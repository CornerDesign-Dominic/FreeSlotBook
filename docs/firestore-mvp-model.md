# Firestore-Datenmodell fuer das MVP

## Ziel des Modells

Das Datenmodell ist bewusst klein gehalten und bildet nur die Kernobjekte fuer das MVP ab:

- genau ein Kalender pro User,
- klarer Kalenderbesitz,
- serverseitige Freigaben,
- Anfragen fuer noch nicht freigegebene Personen,
- Slots beziehungsweise Verfuegbarkeiten,
- Termine,
- Benachrichtigungsdatensaetze.

Das Modell ist so ausgelegt, dass spaetere UI-Flows darauf aufbauen koennen, ohne schon jetzt eine komplexe Architektur einzufuehren.

## Gewaehlte Struktur

### `owners/{uid}`

Speichert das Benutzerprofil fuer die App-seitige Eigentuemerlogik.

Wesentliche Felder:

- `uid`
- `email`
- `emailKey`
- `calendarId`
- `primaryIdentityType`
- `createdAt`
- `updatedAt`

Warum diese Struktur:

- Der bestehende Auth-Flow arbeitet bereits mit einer Benutzer-ID aus Firebase Auth.
- Das Dokument verknuepft den User eindeutig mit genau einem Kalender.
- `calendarId` zeigt direkt auf den persoenlichen Kalender.

### `calendars/{uid}`

Der persoenliche Kalender eines Users wird mit derselben ID wie der User gespeichert.

Wesentliche Felder:

- `ownerId`
- `ownerEmail`
- `ownerEmailKey`
- `visibility`
- `createdAt`
- `updatedAt`

Warum diese Struktur:

- Die 1:1-Beziehung zwischen User und Kalender wird technisch gestuetzt, weil pro User nur ein Dokument mit seiner UID existiert.
- Dadurch wird die Gefahr mehrfacher Kalender pro User deutlich reduziert.
- Die Zuordnung bleibt fuer Queries und Security Rules einfach.

## Subcollections unter `calendars/{calendarId}`

### `access/{email}`

Enthaelt serverseitige Freigaben fuer Kontakte, die den Kalender sehen und buchen duerfen.

Vorgesehene Kernfelder:

- `calendarId`
- `ownerId`
- `granteeEmail`
- `granteeEmailKey`
- `status`
- `createdAt`
- `updatedAt`

MVP-Bedeutung:

- Die Freigabe wird aktuell ueber die E-Mail modelliert.
- Dokument-IDs werden normalisiert ueber `granteeEmailKey` gefuehrt.
- Ein `approved`-Eintrag ist die Voraussetzung dafuer, dass fremde Nutzer den Kalender spaeter sehen und buchen duerfen.

### `requests/{email}`

Enthaelt Zugriffsanfragen von Personen, die noch nicht freigegeben sind.

Vorgesehene Kernfelder:

- `calendarId`
- `requesterEmail`
- `requesterEmailKey`
- `status`
- `createdAt`
- `updatedAt`

MVP-Bedeutung:

- Nicht freigegebene Nutzer stellen eine Anfrage auf Basis der E-Mail des Kalenderinhabers.
- Die Anfrage wird cloudbasiert gespeichert und vom Kalenderinhaber angenommen oder abgelehnt.
- Bei Annahme entsteht zusaetzlich ein `access`-Eintrag mit `approved`.

### `slots/{slotId}`

Enthaelt vom Kalenderinhaber definierte Verfuegbarkeitsbloecke.

Vorgesehene Kernfelder:

- `calendarId`
- `ownerId`
- `startsAt`
- `endsAt`
- `status`
- `appointmentId`
- `createdAt`
- `updatedAt`

Warum diese Struktur:

- Ein Slot gehoert genau zu einem Kalender.
- Ein Slot bildet spaeter die konkrete buchbare Einheit.
- Der `status` bereitet die spaetere Buchungslogik vor.
- `appointmentId` kann spaeter die konkrete Buchung mit dem Slot verknuepfen.

#### `slots/{slotId}/events/{eventId}`

Enthaelt strukturierte Historienereignisse fuer einen Slot.

Vorgesehene Kernfelder:

- `type`
- `createdAt`
- `actorUid`
- `actorRole`
- `targetEmail`
- `statusAfter`
- `note`

Warum diese Struktur:

- Nicht nur der aktuelle Zustand des Slots wird gespeichert, sondern auch seine nachvollziehbare Entwicklung.
- Spaetere Buchung, manuelle Vergabe, Storno und Freigabe koennen als separate Events dokumentiert werden.
- Die Historie bleibt technisch strukturiert und kann in der UI lesbar formatiert werden.

#### Aktueller Slot-Status im MVP

Aktiv genutzt werden derzeit vor allem diese Status:

- `available`: der Slot ist offen und grundsaetzlich fuer spaetere Buchung vorgesehen
- `cancelled`: der Slot wurde durch den Kalenderinhaber storniert beziehungsweise deaktiviert

Bereits im Modell vorbereitet, aber noch nicht vollstaendig im UI-Flow umgesetzt:

- `booked`

Statuswechsel im aktuellen MVP:

- Bei Slot-Erstellung wird der Status auf `available` gesetzt.
- Bei Storno durch den Kalenderinhaber wird der Status auf `cancelled` gesetzt.
- Gleichzeitig wird ein strukturiertes Event vom Typ `cancelled_by_owner` angelegt.

Warum das fuer das MVP passt:

- Die kombinierte Tagesseite kann den aktuellen Status direkt anzeigen.
- Der Kalenderinhaber kann offene Slots sauber deaktivieren.
- Die Historie bleibt nachvollziehbar und spaeter fuer Buchung und weitere Statuswechsel erweiterbar.

### `appointments/{appointmentId}`

Enthaelt gebuchte oder manuell vergebene Termine.

Aktuelle MVP-Buchung:

- eine Buchung basiert auf genau einem konkreten `slotId`
- das Appointment speichert zusaetzlich Zeit-Snapshots in `startsAt` und `endsAt`
- fuer Self-Service-Buchungen werden `bookedByUserId` und `bookedByEmail` mitgespeichert
- der Slot wird dabei auf `booked` gesetzt und mit `appointmentId` verknuepft

### `notifications/{notificationId}`

Enthaelt Benachrichtigungsdatensaetze fuer E-Mail und In-App.

Aktuelle MVP-Buchung:

- bei erfolgreicher Slot-Buchung wird zunaechst eine In-App-/Datenbank-Notification fuer den Kalenderinhaber angelegt
- der Versandkanal ist als `in_app` modelliert, ohne bereits eine volle Zustellung umzusetzen

Vorgesehene Notification-Typen und Texte:

- `new_slots_available`
  - Titel: `Neue freie Slots`
  - Text: `Neue freie Slots bei XXX`
- `slot_cancelled`
  - Titel: `Slot storniert`
  - Text: `Slot storniert bei XXX`
- `slot_assigned`
  - Titel: `Slotzeit erhalten`
  - Text: `Slotzeit am Datum Uhrzeit erhalten`

Ergaenzte Felder fuer Dashboard und App:

- `recipientEmail`
- `recipientEmailKey`
- `title`
- `body`
- `type`
- `channel`
- `appointmentId`
- `slotId`
- `dedupeKey`
- `createdAt`
- `updatedAt`
- `readAt`

Neue freie Slots als Sammelbenachrichtigung:

- pro Kalender und Empfaenger wird hoechstens eine `new_slots_available`-Notification pro Tag angelegt
- die Steuerung erfolgt ueber `notifyOnNewSlotsAvailable` im Kalender
- die eigentliche Ausloesung passiert derzeit bei Slot-Erstellung in der App
- fuer spaetere robustere serverseitige Trigger ist das Modell vorbereitet

## Warum das Modell fuer dieses MVP passt

Das Modell ist fuer das MVP geeignet, weil es die wichtigsten Produktentscheidungen direkt abbildet:

1. Ein User hat genau einen Kalender.
2. Freigaben werden zentral in der Cloud gespeichert.
3. Anfragen, Slots, Termine und Benachrichtigungen sind klar getrennte fachliche Objekte.
4. Slots sind so modelliert, dass spaetere Buchungen auf einem konkreten Slot aufbauen koennen.
5. Slot-Historie ist als strukturierte Event-Liste vorbereitet.
6. Das Dashboard kann echte Daten aus Firestore lesen.
7. Spaetere UI-Flows koennen auf denselben Collections aufbauen, ohne das Fundament neu strukturieren zu muessen.

## Zusammenhang von Freigabe und Anfrage

Die Zugriffsbasis fuer das MVP ist zweistufig:

1. Eine Person ohne bestehende Freigabe stellt eine Anfrage.
2. Der Kalenderinhaber prueft diese Anfrage.
3. Bei Annahme wird die Anfrage auf `approved` gesetzt und gleichzeitig eine echte Freigabe in `access` gespeichert.
4. Bei Ablehnung bleibt kein Zugriff bestehen, die Anfrage wird auf `rejected` gesetzt.

Warum diese Trennung sinnvoll ist:

- Offene Anfragen und echte Zugriffsrechte bleiben klar getrennt.
- Der Kalenderinhaber kann Anfragen nachvollziehbar bearbeiten.
- Die spaetere Erweiterung von E-Mail auf Telefonnummer bleibt moeglich, weil bereits mit expliziten Identity-Feldern (`...Email`, `...EmailKey`) gearbeitet wird und keine komplexe lokale Kontaktlogik vorausgesetzt wird.

## Slot-Erstellung im MVP

Die Slot-Erstellung speichert bewusst keine abstrakten Regeln oder Serienvorgaben als alleinige Grundlage. Stattdessen wird pro Eingabe genau ein konkretes Slot-Dokument erzeugt.

Verwendete Eingaben:

- Startdatum
- optionales Enddatum fuer tagesuebergreifende Slots
- Startzeit des verfuegbaren Zeitraums
- Endzeit des verfuegbaren Zeitraums

Fachliche Wirkung:

- Aus Datum und Uhrzeit wird genau ein Startzeitpunkt und ein Endzeitpunkt gebildet.
- Wenn kein Enddatum gesetzt ist, liegt der Slot an einem Tag.
- Wenn ein Enddatum gesetzt ist, kann der Slot tagesuebergreifend sein.
- Nur diese gespeicherten Slots sind spaeter buchbar.
- Ohne vorhandenen Slot bleibt ein Zeitraum nicht buchbar.

Warum diese Entscheidung:

- Die spaetere Buchungslogik kann direkt auf einem konkreten Slot aufsetzen.
- Tagesansicht und Monatsansicht lesen reale verfuegbare Slots.
- Konflikte und Ueberschneidungen koennen auf Dokumentebene validiert werden.

## Noch bewusst offen

Noch nicht abschliessend entschieden sind unter anderem:

- die genaue Konfliktlogik fuer Slots,
- die endgueltige Statuslogik fuer Termine,
- die spaetere telefonnummernbasierte Identitaet,
- die konkrete Versandarchitektur fuer E-Mail, In-App und spaeter SMS.
