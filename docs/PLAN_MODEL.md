# Plan Model

Dieses Dokument beschreibt nur die aktuelle technische Abo-Basis und spaetere Produktoptionen.
Es ist keine eigene Architekturquelle.

Die kanonische Architektur steht in:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`

## Aktueller Stand

- neue Nutzer werden aktuell mit `subscriptionTier: "free"` angelegt
- die Registrierung bootstrappt heute genau einen privaten Startkalender
- das Datenmodell bleibt mehrkalenderfaehig
- Monetarisierungslogik wird aktuell nicht erzwungen

## Hinweis

Wenn Produktideen, Abo-Notizen oder alte Konzepte von Code und kanonischen Docs abweichen, gewinnt immer die aktive Slotly-1.0-Architektur.
