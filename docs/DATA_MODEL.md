# Datenmodell

## Uebersicht

Das Projekt verwendet Firestore als zentrale Datenbasis. Die wichtigsten Sammlungen sind:

- `owners`
- `calendars`
- `calendars/{calendarId}/access`
- `calendars/{calendarId}/requests`
- `calendars/{calendarId}/slots`
- `calendars/{calendarId}/slots/{slotId}/events`
- `calendars/{calendarId}/appointments`
- `calendars/{calendarId}/notifications`
- `publicCalendarSlugs`

## owners

Pfad:

- `owners/{uid}`

Beschreibung:

- Stammdaten des registrierten Nutzers
- Referenz auf den persoenlichen Kalender

Wichtige Felder:

- `uid`
- `email`
- `emailKey`
- `calendarId`
- `primaryIdentityType`
- `createdAt`
- `updatedAt`

## calendars

Pfad:

- `calendars/{calendarId}`

Beschreibung:

- genau ein Kalender pro Owner

Wichtige Felder:

- `ownerId`
- `ownerEmail`
- `ownerEmailKey`
- `visibility`
- `publicSlug`
- `notifyOnNewSlotsAvailable`
- `createdAt`
- `updatedAt`

### visibility

Moegliche Werte:

- `restricted`
- `public`

Regel:

- `publicSlug` ist erst verpflichtend, wenn `visibility = public`

## publicCalendarSlugs

Pfad:

- `publicCalendarSlugs/{slug}`

Beschreibung:

- Mapping fuer eindeutige oeffentliche Kalender-URLs

Wichtige Felder:

- `calendarId`
- `ownerId`
- `slug`
- `createdAt`
- `updatedAt`

## access

Pfad:

- `calendars/{calendarId}/access/{emailKey}`

Beschreibung:

- Freigaben / Whitelist fuer nicht-oeffentliche Kalender

Wichtige Felder:

- `calendarId`
- `ownerId`
- `granteeEmail`
- `granteeEmailKey`
- `status`
- `createdAt`
- `updatedAt`

### status

Moegliche Werte:

- `approved`
- `revoked`

## requests

Pfad:

- `calendars/{calendarId}/requests/{emailKey}`

Beschreibung:

- Zugriffsanfragen fuer restricted Kalender

Wichtige Felder:

- `calendarId`
- `requesterEmail`
- `requesterEmailKey`
- `status`
- `createdAt`
- `updatedAt`

### status

Moegliche Werte:

- `pending`
- `approved`
- `rejected`

## slots

Pfad:

- `calendars/{calendarId}/slots/{slotId}`

Beschreibung:

- buchbare Zeitfenster
- Grundlage fuer spaetere oder direkte Terminvergaben

Wichtige Felder:

- `calendarId`
- `ownerId`
- `startsAt`
- `endsAt`
- `status`
- `appointmentId`
- `createdAt`
- `updatedAt`

### status

Moegliche Werte:

- `available`
- `inactive`
- `booked`

### Sichtbarkeit

- `available`: sichtbar fuer Owner, freigegebene Nutzer und oeffentliche Buchung bei `public`
- `inactive`: sichtbar nur fuer den Owner
- `booked`: sichtbar fuer Owner und den Terminnehmer

## slot events

Pfad:

- `calendars/{calendarId}/slots/{slotId}/events/{eventId}`

Beschreibung:

- Historie eines Slots

Wichtige Felder:

- `calendarId`
- `slotId`
- `type`
- `actorUid`
- `actorRole`
- `targetEmail`
- `statusAfter`
- `note`
- `createdAt`

### type

Aktuell vorgesehene Werte:

- `created`
- `edited`
- `booked`
- `assigned_by_owner`
- `set_inactive`
- `cancelled_by_owner`
- `reactivated`

## appointments

Pfad:

- `calendars/{calendarId}/appointments/{appointmentId}`

Beschreibung:

- tatsaechliche Buchung oder direkte manuelle Vergabe eines Slots
- traegt sowohl Gast- als auch registrierte Nutzerfaelle

Wichtige Felder:

- `calendarId`
- `slotId`
- `ownerId`
- `bookedByUserId`
- `participantName`
- `bookedByEmail`
- `bookedByEmailKey`
- `participantEmail`
- `participantEmailKey`
- `guestBooking`
- `accountCreationRequested`
- `termsAccepted`
- `termsAcceptedAt`
- `termsVersion`
- `privacyAccepted`
- `privacyAcceptedAt`
- `privacyVersion`
- `startsAt`
- `endsAt`
- `source`
- `status`
- `createdByUserId`
- `cancelledByUserId`
- `createdAt`
- `updatedAt`
- `cancelledAt`

### status

Moegliche Werte:

- `booked`
- `cancelled`

### source

Moegliche Werte:

- `self_service`
- `manual`

## notifications

Pfad:

- `calendars/{calendarId}/notifications/{notificationId}`

Beschreibung:

- Benachrichtigungen fuer In-App, E-Mail und vorbereitete Push-Kanaele

Wichtige Felder:

- `calendarId`
- `appointmentId`
- `slotId`
- `recipientEmail`
- `recipientEmailKey`
- `channel`
- `type`
- `title`
- `body`
- `dedupeKey`
- `status`
- `deliveryError`
- `createdAt`
- `updatedAt`
- `readAt`

### channel

Moegliche Werte:

- `email`
- `in_app`
- `push`

### status

Moegliche Werte:

- `pending`
- `processing`
- `sent`
- `failed`
- `read`

### type

Aktuell im Code enthalten:

- `slot_assigned`
- `slot_cancelled`
- `new_slots_available`
- `booking_created`
- `booking_confirmation`
- `account_creation_invite`
- `appointment_assigned`
- `appointment_cancelled`

## Wichtige Modellregeln

- E-Mail ist im aktuellen MVP die zentrale Identitaet fuer Freigaben und Gastanschluesse
- Gastbuchungen bleiben ueber `guestBooking = true` historisch erkennbar
- spaeterer Anschluss an einen echten Auth-User erfolgt ueber dieselbe E-Mail
- Slots und Appointments sind fachlich getrennt:
  - Slot = buchbares Zeitfenster
  - Appointment = tatsaechliche Buchung

## Hinweise fuer spaetere Erweiterungen

- Telefonnummer als primaere Identitaet ist spaeter moeglich, da die aktuelle E-Mail-Logik explizit modelliert ist
- Push-Notifications sind im Datenmodell vorbereitet
- weitere Appointment- oder Notification-Typen koennen ergaenzt werden, ohne die Grundstruktur zu brechen
