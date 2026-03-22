# Slotlyme Plan Model

Dieses Dokument beschreibt die langfristige Plan- und Abo-Struktur von Slotlyme sowie die aktuell gueltigen Produktgrenzen im MVP. Es dient als Referenz fuer Produktentscheidungen und Entwicklung, damit bestehende Einschraenkungen nicht versehentlich aufgeweicht werden.

## Current Implementation (MVP)

Slotlyme laeuft aktuell ausschliesslich im FREE MODE.

### Free Plan (Current Implementation)

- Jeder Nutzer erhaelt bei der Registrierung automatisch genau 1 Kalender.
- Jeder Nutzer wird aktuell mit `subscriptionTier: "free"` angelegt.
- Dieser Kalender ist privat.
- Jeder Kalender benoetigt weiterhin eine Kalender-ID als allgemeinen Bezeichner.
- Oeffentliche Kalender sind aktuell nicht verfuegbar.
- Zugriff auf den Kalender erfolgt ausschliesslich ueber eine Whitelist.
- Das Whitelist-Limit betraegt 50 Kontakte.
- Oeffentliche Kalenderfunktionen sind fuer Free-Nutzer in der UI ausgeblendet.
- Die Kalender-ID bleibt auch fuer Free-Nutzer sichtbar und nutzbar.
- Monetarisierungslogik ist aktuell nicht aktiv.

Zusammengefasst gilt im aktuellen Stand:

- 1 privater Kalender
- Kalender-ID fuer alle Kalender verfuegbar
- Whitelist mit bis zu 50 Kontakten
- Kalendersichtbarkeit: nur privat
- oeffentliche Kalenderfunktionen sind verborgen
- keine oeffentliche Buchung
- keine bezahlten Plaene implementiert

## Future Plan Structure (Not Implemented Yet)

Die folgende Planstruktur ist vorgesehen, aber aktuell nicht aktiv.

### Pro Plan (Planned - Not Active)

- bis zu 5 private Kalender
- Whitelist mit bis zu 500 Kontakten pro Kalender
- 1 oeffentlicher Kalender
- kostenpflichtiges monatliches Abonnement

Wichtig: Dieser Plan ist nur als zukuenftiges Produktkonzept dokumentiert. Er gehoert nicht zum aktuellen Verhalten der App und darf nicht als bereits implementierte Funktion interpretiert werden.

## Product Rules

Zur Vermeidung unbeabsichtigter Feature-Erweiterungen gelten aktuell diese Produktregeln:

- Free-Nutzer duerfen keine oeffentlichen Kalender erstellen.
- Die Kalender-ID ist kein Public-only Feature, sondern ein allgemeiner Kalender-Bezeichner.
- Die Kalendersichtbarkeit muss privat bleiben.
- Oeffentliche Buchungsfunktionen duerfen derzeit nicht aktiviert werden.
- Oeffentliche Kalender-Einstellungen duerfen Free-Nutzern nicht angezeigt werden.
- Die Kalender-ID und ihr Onboarding muessen Free-Nutzern weiterhin angezeigt werden.
- Monetarisierungslogik darf erst implementiert werden, wenn sie ausdruecklich freigegeben wurde.

## Development Note

Oeffentliche Kalenderfunktionen koennen spaeter ueber einen hoeheren Plan freigeschaltet werden, sind aber aktuell nicht aktiv. Die Kalender-ID bleibt davon unabhaengig und steht weiterhin fuer alle Kalender zur Verfuegung.

Oeffentliche Kalenderfunktionen werden erst eingefuehrt, sobald das System fuer private Kalender stabil ist.

Monetarisierung und Plan-Durchsetzung sollen nicht implementiert werden, bevor die entsprechende Produktphase ausdruecklich beginnt.

## Purpose Of This Document

Dieses Dokument soll:

- als Referenz fuer zukuenftige Entwicklung dienen
- versehentliche Feature-Ausweitung verhindern
- die geplante Preis- und Planstruktur festhalten
- die Einschraenkungen des MVP dokumentieren
