# E-Mail-Zustellung

## Ziel

Dieses Dokument beschreibt die aktuelle E-Mail-Zustellung im produktiven Grundaufbau von Slotly 1.0.

Es beschreibt keinen provisorischen Zustand, sondern den derzeitigen Versandpfad fuer termin- und kontoassoziierte E-Mails.

## Aktuelle Architektur

Der Versandpfad ist zweistufig:

1. Die App oder die serverseitige Logik erzeugt ein Notification-Dokument in Firestore.
2. Eine Cloud Function verarbeitet dieses Dokument und uebernimmt die eigentliche E-Mail-Zustellung.

## Datenbasis

Die relevanten Notification-Dokumente liegen kalenderbezogen unter:

```text
calendars/{calendarId}/notifications/{notificationId}
```

Wichtige Felder sind unter anderem:

- `channel`
- `type`
- `status`
- `recipientEmail`
- `title`
- `body`
- `createdAt`
- `updatedAt`

## Versandlogik

Die Function reagiert auf neue oder aktualisierte Notification-Dokumente mit passendem Versandkanal.

Der typische Ablauf:

1. Ein Dokument wird mit `channel = email` angelegt.
2. Der Zustellstatus startet in `pending`.
3. Die Function setzt den Status auf `processing`.
4. Die E-Mail wird ueber den konfigurierten Provider versendet.
5. Danach wird auf `sent` oder `failed` aktualisiert.

## Abgedeckte Faelle

Die aktuelle Zustellung ist fuer produktrelevante Kommunikationsfaelle vorbereitet, insbesondere:

- Buchungsbestaetigungen
- Terminbezogene Hinweise
- Einladungen zur Kontoanlage nach einer Gastbuchung

## Gast-zu-Konto-Verknuepfung

Wenn eine Buchung zunaechst gastbasiert erfolgt und spaeter ein Konto mit derselben E-Mail entsteht, wird die Rueckverknuepfung serverseitig ueber Cloud Functions verarbeitet.

Dadurch bleibt der Zustellpfad konsistent:

- Gastvorgaenge koennen bereits E-Mails ausloesen
- spaetere Kontoverknuepfung erfordert keine manuelle Datenmigration im Client

## Architekturhinweis

Der E-Mail-Versand ist ein strukturierter Bestandteil des Systems.

UI-Komponenten sollen keine Versandlogik direkt implementieren.
Sie erzeugen die fachlich passenden Daten oder stoessen Repository-Operationen an, die die erforderlichen Notification-Dokumente schreiben.
