# Slotlyme Plan Model

Dieses Dokument beschreibt die langfristige Plan- und Abo-Struktur von Slotlyme sowie die aktuell gültigen Produktgrenzen im MVP. Es dient als Referenz für Produktentscheidungen und Entwicklung, damit bestehende Einschränkungen nicht versehentlich aufgeweicht werden.

## Current Implementation (MVP)

Slotlyme läuft aktuell ausschließlich im FREE MODE.

### Free Plan (Current Implementation)

- Jeder Nutzer erhält bei der Registrierung automatisch genau 1 Kalender.
- Dieser Kalender ist privat.
- Öffentliche Kalender sind aktuell nicht verfügbar.
- Zugriff auf den Kalender erfolgt ausschließlich über eine Whitelist.
- Das Whitelist-Limit beträgt 50 Kontakte.
- Monetarisierungslogik ist aktuell nicht aktiv.

Zusammengefasst gilt im aktuellen Stand:

- 1 privater Kalender
- Whitelist mit bis zu 50 Kontakten
- Kalendersichtbarkeit: nur privat
- keine öffentliche Buchung
- keine bezahlten Pläne implementiert

## Future Plan Structure (Not Implemented Yet)

Die folgende Planstruktur ist vorgesehen, aber aktuell nicht aktiv.

### Pro Plan (Planned - Not Active)

- bis zu 5 private Kalender
- Whitelist mit bis zu 500 Kontakten pro Kalender
- 1 öffentlicher Kalender
- kostenpflichtiges monatliches Abonnement

Wichtig: Dieser Plan ist nur als zukünftiges Produktkonzept dokumentiert. Er gehört nicht zum aktuellen Verhalten der App und darf nicht als bereits implementierte Funktion interpretiert werden.

## Product Rules

Zur Vermeidung unbeabsichtigter Feature-Erweiterungen gelten aktuell diese Produktregeln:

- Free-Nutzer dürfen keine öffentlichen Kalender erstellen.
- Die Kalendersichtbarkeit muss privat bleiben.
- Öffentliche Buchungsfunktionen dürfen derzeit nicht aktiviert werden.
- Monetarisierungslogik darf erst implementiert werden, wenn sie ausdrücklich freigegeben wurde.

## Development Note

Öffentliche Kalenderfunktionen werden später eingeführt, sobald das System für private Kalender stabil ist.

Monetarisierung und Plan-Durchsetzung sollen nicht implementiert werden, bevor die entsprechende Produktphase ausdrücklich beginnt.

## Purpose Of This Document

Dieses Dokument soll:

- als Referenz für zukünftige Entwicklung dienen
- versehentliche Feature-Ausweitung verhindern
- die geplante Preis- und Planstruktur festhalten
- die Einschränkungen des MVP dokumentieren
