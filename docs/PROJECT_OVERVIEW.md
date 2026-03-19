# Projektübersicht

## Projektname

Aktueller technischer Projektname im Repository:

- `FreeSlotBookingClean`

Produktseitig beschreibt das Projekt eine Slot- und Terminbuchungsanwendung mit öffentlichen Kalendern. Der Name `Slotlyme` ist im aktuellen Code nicht als offizieller App-Name hinterlegt.

## Ziel der Anwendung

Die Anwendung dient als slotbasierter Terminplaner mit einem Kalender pro registriertem Nutzer. Kalenderinhaber koennen freie Zeitfenster als Slots anlegen, privat oder oeffentlich sichtbar machen und diese entweder selbst verwalten oder durch andere Personen buchen lassen.

Der aktuelle Produktfokus ist ein kleines, release-nahes MVP mit:

- persoenlichem Kalender pro User
- freien buchbaren Slots
- oeffentlichen Kalendern fuer Gastbuchungen
- optionalem Uebergang von Gastbuchung zu spaeterem Konto

## Hauptfunktionen

- Registrierung und Login mit Firebase Auth
- E-Mail-Verifikation fuer neue Benutzer
- automatischer persoenlicher Kalender pro User
- Monatsansicht `Mein Kalender`
- kombinierte Tagesseite mit Slot-Auswahl, Historie und Footer-Aktionen
- Slot-Erstellung durch den Kalenderinhaber
- Slot-Statusverwaltung, inklusive Storno
- Freigaben und Zugriffsanfragen fuer nicht-oeffentliche Kalender
- freigegebene Fremdkalender fuer berechtigte Nutzer
- oeffentliche Kalender mit slugbasierter URL
- Gastbuchung mit Name und E-Mail
- optionale Kontoanlage im Anschluss an eine Gastbuchung
- Termin-Historie ueber Slot-Events
- E-Mail-Benachrichtigungen ueber Firebase Functions und Resend

## Benutzerrollen

### Owner (Kalenderinhaber)

- besitzt genau einen eigenen Kalender
- erstellt und verwaltet Slots
- setzt Sichtbarkeit auf `restricted` oder `public`
- verwaltet Freigaben und Anfragen
- erhaelt Benachrichtigungen ueber Buchungen und Statusaenderungen

### Registrierter Nutzer

- kann sich registrieren und anmelden
- kann fremde freigegebene Kalender sehen
- kann freigegebene Slots buchen
- kann nach Gastbuchung spaeter mit derselben E-Mail an bestehende Termine angeschlossen werden

### Gast (ohne Konto)

- kann oeffentliche Kalender ueber eine oeffentliche URL oeffnen
- sieht nur fuer die Buchung relevante freie Slots
- kann mit Name und E-Mail buchen
- kann optional bei der Buchung eine spaetere Kontoanlage anstossen

## Wichtige Features

- ein Kalender pro registriertem User
- slotbasierte Terminvergabe
- oeffentliche und nicht-oeffentliche Kalender
- slugbasierte oeffentliche URL wie `/<publicSlug>`
- Zustimmung zu AGB und Datenschutz bei oeffentlichen Buchungen
- E-Mail-Verifikation fuer neue Konten
- E-Mail-Benachrichtigungen fuer Buchung, Einladung und Kontovorbereitung
- optionale Kontoanlage nach Gastbuchung

## Aktueller MVP-Stand

Bereits umgesetzt:

- Auth-Grundlagen
- Kalender- und Slotverwaltung
- oeffentliche Buchung
- Freigabe- und Request-Logik
- Slugbasierte Kalender-URLs
- Zustimmungen zu AGB und Datenschutz
- Versandlogik fuer E-Mails per Cloud Function

Noch bewusst einfach gehalten:

- rechtliche Texte in `AGB` und `Datenschutz` sind noch Platzhalter
- einige Nutzertexte und Detailansichten koennen spaeter weiter verfeinert werden
- Push-/Mobile-Notifications sind vorbereitet, aber nicht der zentrale produktive Mailkanal
