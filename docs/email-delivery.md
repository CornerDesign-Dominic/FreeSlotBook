# E-Mail-Zustellung

Dieses Dokument beschreibt die aktuelle E-Mail-Zustellung im produktiven Grundaufbau von Slotly 1.0.

## Architektur

Der Versandpfad ist zweistufig:

1. Die App oder serverseitige Logik erzeugt ein Notification-Dokument.
2. Eine Cloud Function verarbeitet dieses Dokument und uebernimmt die eigentliche Zustellung.

## Datenbasis

Notification-Dokumente liegen in:

```text
notifications/{notificationId}
```

Wichtige Felder sind unter anderem:

- `calendarId`
- `channel`
- `type`
- `status`
- `recipientEmail`
- `title`
- `body`
- `createdAt`
- `updatedAt`

## Ablauf

1. Ein Dokument wird mit `channel = email` angelegt.
2. Der Zustellstatus startet in `pending`.
3. Die Function setzt den Status auf `processing`.
4. Die E-Mail wird ueber den konfigurierten Provider versendet.
5. Danach wird auf `sent` oder `failed` aktualisiert.

## Architekturhinweis

UI-Komponenten implementieren keine Versandlogik direkt.
Sie erzeugen die fachlich passenden Daten oder stossen Repository-Operationen an, die die benoetigten Notification-Dokumente schreiben.
