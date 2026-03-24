# Changelog

## Unreleased

### Neue Seiten

**Mein Termin-Kalender**
- Neue zentrale Seite fuer die Terminverwaltung
- Zeigt heutige Termine
- Navigation zu Tages-, Wochen- und Monatsansicht
- Link zu Termin-Kalender-Einstellungen

**Meine Slot-Kalender**
- Uebersicht der eigenen Slot-Kalender
- Enthaelt Zeitachse und Slotverwaltung
- Navigation zu Tages-, Wochen- und Monatsansicht des Slot-Kalenders

**Kalender Suche**
- Neue Seite fuer Kalenderzugriff
- Enthaelt:
  - Kalendersuche (Beitrittsanfrage)
  - Ausstehende Anfragen
  - Eingehende Kalendereinladungen

**Slot Historie**
- Neue Seite zur Anzeige der Historie eines einzelnen Slots
- Wird ueber „Historie ansehen“ aus der Tagesansicht des Slot-Kalenders geoeffnet

### Dashboard Aenderungen

Startseite wurde zu einer echten Uebersicht umgebaut:

- Termin-Kalender Timeline
- Slot-Kalender Uebersicht
- Verbundene Kalender

Slot- und Termin-Detailfunktionen wurden auf eigene Seiten ausgelagert.

### Navigation Aenderungen

Neue Navigationsstruktur:

- Startseite (Slotlyme)
- Kalender Suche (Lupe)
- Termin-Kalender
- Slot-Kalender
- Slot erstellen

### Slot Historie Aenderung

Die Slot-Historie wird nicht mehr innerhalb einer Card eingeblendet.

Stattdessen:
- eigene Seite „Slot Historie“
- vollstaendige Historie eines einzelnen Slots

### Kalender Slug Verhalten

Kalender-Slugs werden jetzt flexibler verarbeitet.

Folgende Eingaben werden akzeptiert:

- slug
- calendar/slug
- slotlyme.app/calendar/slug
- https://slotlyme.app/calendar/slug

Das System extrahiert automatisch den korrekten Kalender-Slug.

### Termin-Kalender Swipe-Navigation

Die Swipe-Navigation fuer Termin-Kalender-Ansichten ist jetzt implementiert.

Zielstruktur:

- Zentrum: Mein Termin-Kalender
- Links: Wochenansicht
- Rechts: Monatsansicht
- Oben: Tagesansicht

Rueckrichtungen:

- Wochenansicht per Swipe nach rechts zurueck
- Monatsansicht per Swipe nach links zurueck
- Tagesansicht per Swipe nach unten zurueck
