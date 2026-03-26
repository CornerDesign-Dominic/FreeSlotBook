# Navigation

## Zweck
Diese Datei dokumentiert die aktuelle Seitenstruktur, Navigation und Zustaendigkeiten der wichtigsten Screens.

## Hauptnavigation
- Startseite (`/`)
  - zentrale Uebersicht / Startseite
- Kalender Suche (`/calendar-search`)
  - Kalender suchen, Anfragen senden, Einladungen sehen
- Mein Termin-Kalender (`/my-appointment-calendar`)
  - Einstieg in persoenliche Terminverwaltung
- Meine Slot-Kalender (`/my-slot-calendars`)
  - Einstieg in eigene Slot-Kalender
- Slots hinzufuegen (`/new-slot`)
  - neue Slots erstellen

## Seitenuebersicht

### Startseite
Zweck:
- Uebersicht
- zeigt zusammengefasste Karten fuer:
  - Termin-Kalender
  - Slot-Kalender
  - Verbundene Kalender

### Mein Termin-Kalender
Zweck:
- Zentrale Seite fuer den persoenlichen Termin-Kalender
- zeigt heutige Termine
- verlinkt zu:
  - Tagesansicht
  - Wochenansicht
  - Monatsansicht
  - Termin-Kalender-Einstellungen

### Meine Slot-Kalender
Zweck:
- Zentrale Seite fuer eigene Slot-Kalender
- zeigt alle eigenen Kalender als Liste
- ein Tap auf eine Kalender-Card waehlt genau diesen Kalender aus
- verlinkt kalenderbezogen zu:
  - Tagesansicht
  - Wochenansicht
  - Monatsansicht

### Verbundene Kalender
Zweck:
- zeigt nur Kalender, bei denen der User bereits Mitglied ist
- keine Einladungen und keine Suchfunktion

### Kalender Suche
Zweck:
- Einstieg fuer neue Kalenderverbindungen
- enthaelt:
  - Kalendersuche / Anfrage senden
  - ausstehende Anfragen
  - eingehende Kalendereinladungen

### Slot Historie
Zweck:
- eigene Seite fuer die Historie eines einzelnen Slots
- wird aus der Slot-Tagesansicht geoeffnet

## Routing-Prinzip
- Hauptseiten liegen direkt in der App-Navigation
- Detailseiten werden von diesen Hauptseiten aus geoeffnet
- Dashboard-/Startseiten-Cards enthalten nur Uebersicht, Detailfunktionen liegen auf eigenen Seiten
- bei Multi-Calendar ist `calendarId` der fuehrende Kontext fuer Slot-Monat, Slot-Woche und Slot-Tag
- fehlt `calendarId`, faellt die App auf den bisherigen Owner-/Default-Kalender zurueck
- Monat -> Woche -> Tag muessen denselben `calendarId`-Kontext weiterreichen
- die Zurueck-Navigation bleibt im normalen Stack: Detailansichten fuehren logisch zurueck auf `Meine Slot-Kalender`
- der Header der Slot-Ansichten zeigt den Titel des aktiven Kalenders, nicht einen generischen Standardtitel

## Kalenderzugriff
- Verbundene Kalender = echte Mitgliedschaften / Zugriff
- Kalender Suche = Requests + Invites
- Requests und Invites sind getrennte Flows
- echter Zugriff wird ausschliesslich ueber die bestehende Access-Logik abgebildet

## Slug-Verhalten
Kalender-Suche akzeptiert aktuell:
- slug
- calendar/slug
- slotlyme.app/calendar/slug
- https://slotlyme.app/calendar/slug

Das System extrahiert intern den Kalender-Slug.

## Geplante Erweiterungen
- weitere Slot-Kalender / Kalender koennen spaeter ergaenzt werden

- Swipe-Navigation fuer den Termin-Kalender ist aktuell nur geplant, noch nicht implementiert
