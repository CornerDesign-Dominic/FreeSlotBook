# Produktanforderungen und Produktgrundaufbau

## Zweck des Dokuments

Dieses Dokument beschreibt den derzeitigen fachlichen Zielzustand des Produkts, den verbindlichen Umfang des aktuellen Produktgrundaufbaus sowie die aktuell noch offenen Entscheidungen. Es ist als Arbeitsgrundlage fuer Architektur, Entwicklung, Priorisierung und spaetere Detailentscheidungen gedacht.

Die Inhalte sind bewusst in klare Kategorien getrennt:

- **Bereits entschieden**: Punkte, die fuer das aktuelle Produktverstaendnis als festgelegt gelten.
- **Noch offen**: Punkte, die noch konkretisiert oder technisch/fachlich entschieden werden muessen.

Dieses Dokument enthaelt keine Marketingbeschreibung, sondern eine sachliche Projektgrundlage.

## 1. Projektziel

### Bereits entschieden

Das Projekt ist eine kleine mobile Terminplaner-App.

Ziel ist ein direkt nutzbarer Produktgrundaufbau, der moeglichst release-nah entwickelt wird. Die Umsetzung soll sauber, minimalistisch und produktionsnah sein. Dabei soll die Produkt- und Architekturarbeit so erfolgen, dass spaetere unnoetige Umbauten moeglichst vermieden werden.

Der Fokus liegt damit nicht auf einem experimentellen Demo-Stand, sondern auf einem kompakten, aber tragfaehigen Kernprodukt.

### Noch offen

Noch nicht im Detail festgelegt ist, wie weit der erste Release hinsichtlich Betriebsreife, Monitoring, Supportprozessen und administrativen Funktionen bereits gehen soll. Das Zielbild ist klar produktionsnah, der genaue operative Reifegrad des ersten Releases ist aber noch zu konkretisieren.

## 2. Benutzer- und Kalenderlogik

### Bereits entschieden

Jeder User registriert sich mit einem eigenen Account.

Nach erfolgreicher Registrierung erhaelt jeder User genau einen eigenen Kalender. Pro User gibt es genau einen Kalender. Dieser Kalender ist die persoenliche Terminbasis des jeweiligen Users.

Der Kalender wird zunaechst mit Firebase abgebildet. Firebase ist damit fuer die erste Produktphase die aktuelle technische Grundlage fuer die Benutzer- und Kalenderbasis.

Der aktuelle Produktgrundaufbau basiert ausdruecklich auf einem einfachen Modell:

- ein User,
- ein Account,
- genau ein zugeordneter Kalender.

Im aktuellen Produktverhalten wird pro Registrierung zunaechst ein privater Kalender erzeugt; die Architektur bleibt jedoch multi-kalenderfaehig.

### Noch offen

Noch nicht abschliessend festgelegt ist, wie die Kalenderdaten intern strukturiert und mit dem Benutzerkonto technisch verknuepft werden. Fachlich ist die 1:1-Beziehung zwischen User und Kalender entschieden, die konkrete Datenmodellierung bleibt offen.

## 3. Identitaet von Kontakten und Nutzern

### Bereits entschieden

Langfristig soll die Telefonnummer die primaere Identitaet im Produkt sein.

Im aktuellen Produkt wird zunaechst E-Mail verwendet, weil die Umsetzung mit Firebase einfacher und pragmatischer ist. Das ist keine Zufallsentscheidung, sondern eine bewusst getroffene Produktentscheidung fuer den Start.

Ebenfalls entschieden ist die langfristige Zielrichtung:

- Das aktuelle Produkt startet mit E-Mail als Identitaetsgrundlage.
- Spaeter soll es eine Kombination aus E-Mail und Telefonnummer geben.
- In dieser spaeteren Zielarchitektur soll die Telefonnummer die staerkere beziehungsweise primaere Identitaet sein.

Damit gilt:

- **Startidentitaet des aktuellen Produkts**: E-Mail
- **Langfristige Zielidentitaet**: Telefonnummer mit hoeherer Gewichtung, ergaenzt um E-Mail

Diese Entscheidung ist fuer Produkt, Datenmodell und spaetere Migrationsfaehigkeit relevant und soll frueh beruecksichtigt werden.

### Noch offen

Noch offen ist, wie der spaetere Uebergang von einer E-Mail-basierten Startidentitaet zu einer staerker telefonnummernbasierten Zielidentitaet technisch umgesetzt wird. Ebenfalls offen ist, wie Kontakte im internen Systemmodell konkret repraesentiert werden.

## 4. Slot- und Verfuegbarkeitslogik

### Bereits entschieden

Der Kalenderinhaber kann eigene buchbare Zeitfenster festlegen. Die Verfuegbarkeit wird also nicht automatisch vom System bestimmt, sondern aktiv durch den Inhaber des Kalenders gesetzt.

Diese Zeitfenster bestehen aus frei definierbaren Bloecken beziehungsweise Slots. Die Blockgroesse ist flexibel und nicht auf wenige Standardwerte begrenzt.

Als bereits genannte Beispiele fuer moegliche Blockgroessen wurden festgehalten:

- 20 Minuten
- 45 Minuten
- 6 Stunden

Diese Werte dienen nicht als abschliessende Liste, sondern beschreiben die Anforderung, dass sowohl kurze als auch lange Zeitbloecke grundsaetzlich abbildbar sein muessen.

Der Kalenderinhaber legt selbst fest:

- von wann bis wann Termine moeglich sind,
- in welcher Blockgroesse diese vergeben werden.

### Noch offen

Noch offen ist, wie Slots intern modelliert werden und wie sich freie Verfuegbarkeit, gebuchte Termine, Konflikte, Sperrzeiten und Status technisch voneinander abgrenzen lassen.

## 5. Sichtbarkeit, Freigabe und Whitelist

### Bereits entschieden

Ein Kalender ist nicht automatisch oeffentlich sichtbar.

Der Kalenderinhaber kann bestimmen, wer Zugriff auf seinen Kalender erhaelt. Dafuer gibt es eine Freigabeliste beziehungsweise Whitelist-Logik.

Kontakte auf dieser Freigabeliste duerfen den Kalender sehen und Termine buchen. Personen ausserhalb dieser Liste muessen zunaechst eine Anfrage stellen. Erst nach Bestaetigung durch den Kalenderinhaber erhalten sie Zugriff.

Ebenfalls als Architekturentscheidung beziehungsweise klare Empfehlung fuer den aktuellen Produktgrundaufbau festgehalten ist:

- Die Freigabeliste beziehungsweise Whitelist soll zentral in der Cloud gespeichert werden.

### Begruendung der cloudbasierten Freigabelogik

Diese Entscheidung beruht auf den fachlichen Anforderungen des Produkts:

- Rechte muessen geraeteuebergreifend konsistent sein.
- Anfragen, Bestaetigungen, Buchungen und Zugriffe brauchen eine zentrale Datenbasis.
- Eine rein lokale Speicherung waere fehleranfaellig bei Geraetewechsel, mehreren Geraeten und Synchronisation.

Fuer die eigentliche Rechte- und Freigabelogik ist deshalb eine serverseitige beziehungsweise cloudbasierte Fuehrung vorgesehen.

### Datenschutzorientierte Leitlinie

Trotz zentraler Freigabelogik soll Datensparsamkeit ausdruecklich gewahrt bleiben. Das bedeutet:

- Nicht das komplette Adressbuch soll in die Cloud uebernommen werden.
- Es sollen nur die wirklich benoetigten Freigabe- und Kontaktinformationen gespeichert werden.

Lokale Geraetekontakte koennen spaeter optional fuer Komfortfunktionen genutzt werden. Die eigentliche Rechte- und Freigabelogik soll jedoch serverseitig beziehungsweise cloudbasiert gefuehrt werden.

### Noch offen

Noch offen ist, wie der Anfrageprozess im Detail aussieht und wie Kontakte beziehungsweise Freigabeobjekte konkret im Datenmodell repraesentiert werden.

## 6. Terminbuchungslogik

### Bereits entschieden

Freigegebene Kontakte koennen Termine im Kalender buchen.

Der Kalenderinhaber kann Termine auch manuell vergeben.

Kontaktpersonen koennen Termine im aktuellen Produkt noch nicht selbst stornieren.

Der Kalenderinhaber kann Termine absagen beziehungsweise stornieren.

Damit umfasst die erste Buchungslogik mindestens:

- selbst gepflegte Verfuegbarkeit,
- Buchung durch freigegebene Kontakte,
- manuelle Vergabe durch den Kalenderinhaber,
- Storno durch den Kalenderinhaber.

### Noch offen

Noch offen ist, wie Terminstatus und Storno-Status intern modelliert werden und wie Statuswechsel technisch verwaltet werden.

## 7. Benachrichtigungen

### Bereits entschieden

Fuer das aktuelle Produkt sind zwei Benachrichtigungsebenen vorgesehen:

- E-Mail-Benachrichtigungen
- Push- beziehungsweise In-App-Benachrichtigungen direkt aufs Handy

E-Mail ist der erste technische Zustellweg. Push- beziehungsweise In-App-Benachrichtigungen sollen parallel vorgesehen werden und gehoeren ebenfalls zum aktuellen Zielbild.

SMS ist keine Anforderung des aktuellen Produktgrundaufbaus, sondern eine spaetere Ausbaustufe. Gleiches gilt fuer moegliche Messenger-Dienste wie WhatsApp.

### Benachrichtigungsfaelle im aktuellen Produkt

Im aktuellen Produkt sollen mindestens folgende Faelle abgedeckt sein:

1. Wenn ein Kontakt einen Termin bucht, erhaelt der Kalenderinhaber eine Benachrichtigung.
2. Wenn der Kalenderinhaber einem Kontakt manuell einen Termin vergibt, erhaelt dieser Kontakt eine Benachrichtigung.
3. Wenn der Kalenderinhaber einen Termin absagt oder storniert, erhaelt der betroffene Kontakt eine Storno-Benachrichtigung.

### Spaeter geplant

Spaeter koennen weitere Kanaele hinzukommen, insbesondere:

- SMS
- Messenger-Dienste, zum Beispiel WhatsApp

### Noch offen

Noch offen ist, wie Push-/In-App-Benachrichtigungen technisch umgesetzt werden, wie die spaetere SMS-Anbindung konkret erfolgt und wie die Benachrichtigungslogik im Backend strukturiert wird.

## 8. Datenschutzrelevante Punkte

### Bereits entschieden

Datenschutz soll moeglichst stark beruecksichtigt werden. Datensparsamkeit ist ein ausdrueckliches Ziel.

Kontakt- und Freigabedaten sollen nur in dem Umfang gespeichert werden, der fuer die Funktion der App notwendig ist.

Die zentrale Freigabelogik wird aus praktischen Gruenden voraussichtlich in der Cloud gespeichert. Gleichzeitig soll das vollstaendige lokale Telefon-Adressbuch nicht unnoetig in die Cloud uebernommen werden.

Damit ist die datenschutzorientierte Leitlinie fuer das Produkt aktuell:

- zentrale Speicherung dort, wo sie fuer Rechte, Freigaben und Kernprozesse notwendig ist,
- keine unnoetige Ausweitung gespeicherter Kontaktinformationen,
- moeglichst datensparsame technische Ausgestaltung.

### Noch offen

Noch offen ist die spaetere konkrete technische und rechtliche Ausgestaltung in allen Details. Eine spaetere Datenschutzerklaerung und die technische Umsetzung muessen zueinander passen. Dieses Dokument trifft dazu keine juristischen Zusagen, sondern beschreibt nur die produktseitigen Leitplanken.

## 9. Technische Basis

### Bereits entschieden

Aktuell wird Firebase als Backend beziehungsweise Datenbasis verwendet.

Firebase ist fuer die aktuelle Projektphase die pragmatische Loesung und damit die gegenwaertige technische Entscheidung.

Gleichzeitig soll ein spaeterer Wechsel der Datenbank grundsaetzlich moeglich bleiben. Diese Offenheit fuer eine spaetere Neubewertung ist Teil der aktuellen technischen Leitlinie.

### Noch offen

Noch offen ist, in welchem Grad die Austauschbarkeit der Datenbasis bereits im aktuellen Produkt technisch vorbereitet wird und wo bewusst pragmatische, Firebase-nahe Entscheidungen getroffen werden duerfen.

## 10. Produktabgrenzung

### Mindestumfang des aktuellen Produkts

Das aktuelle Produkt muss mindestens folgende Bestandteile enthalten:

1. Registrierung und Login
2. Genau einen Kalender pro User
3. Eigene Slots beziehungsweise Verfuegbarkeiten festlegen
4. Freigabeliste beziehungsweise Whitelist
5. Anfrage- und Bestaetigungslogik fuer nicht freigegebene Personen
6. Terminbuchung
7. E-Mail-Benachrichtigungen
8. Push-/In-App-Benachrichtigungen
9. Storno durch den Kalenderinhaber

Diese Funktionen bilden gemeinsam den minimalen fachlichen Kern des Produkts.

### Nicht Teil des aktuellen Produkts, aber spaeter moeglich

Folgende Themen sind als spaetere Erweiterungen moeglich, gehoeren aber nicht zwingend in den aktuellen Produktgrundaufbau:

- SMS
- WhatsApp oder andere Messenger-Dienste
- erweiterte Kontaktverwaltung
- Datenbankwechsel
- weitere Rollen und Rechte
- Komfortfunktionen rund um lokale Geraetekontakte
- Terminverschiebung als bestaetigungspflichtiger Vorschlag

### Umsetzungsleitlinie fuer den aktuellen Produktgrundaufbau

Der aktuelle Produktgrundaufbau soll den Kernprozess tragfaehig abbilden:

1. User registriert sich oder meldet sich an.
2. User erhaelt genau einen persoenlichen Kalender.
3. Kalenderinhaber legt Verfuegbarkeit fest.
4. Zugriff erfolgt nur ueber Freigabe oder bestaetigte Anfrage.
5. Berechtigte Kontakte buchen Termine.
6. Relevante Beteiligte werden benachrichtigt.
7. Der Kalenderinhaber kann Termine stornieren.

## 11. Offene Entscheidungen

Die folgenden Punkte sind aktuell noch offen und muessen spaeter konkretisiert werden. Punkte, die bereits entschieden sind, werden hier bewusst nicht erneut als offen aufgefuehrt.

### Noch offen

- Wie Kontakte im Systemmodell genau repraesentiert werden
- Wie Anfrageprozesse im Detail ablaufen
- Wie Slots intern modelliert werden
- Wie Terminstatus und Storno-Status modelliert werden
- Wie der spaetere Uebergang von E-Mail zu Telefonnummer technisch umgesetzt wird
- Wie SMS spaeter konkret angebunden wird

## 13. Backlog und spaetere Roadmap-Punkte

### Terminverschiebung

Terminverschiebung ist ausdruecklich noch nicht Teil des aktuellen Produkts.

Fuer eine spaetere Ausbaustufe soll Terminverschiebung nicht als einseitige finale Aenderung durch den Kalenderinhaber umgesetzt werden. Stattdessen soll sie als Vorschlag beziehungsweise Anfrage modelliert werden, die vom Terminnehmenden bestaetigt oder abgelehnt werden kann.

Damit ist fuer spaeter vorgesehen:

- keine sofortige einseitige Verschiebung,
- stattdessen ein Vorschlags- beziehungsweise Anfrageprozess,
- mit anschliessender Bestaetigung durch den Terminnehmenden.

Dieser Punkt ist bewusst als Backlog-Thema festgehalten und noch nicht umgesetzt.

## 12. Form und Verwendungszweck

Dieses Dokument soll als echte Projektdokumentation nutzbar sein. Es ist deshalb bewusst:

- in gut lesbarem Markdown strukturiert,
- mit klaren Ueberschriften versehen,
- mit fachlich sinnvollen Unterabschnitten aufgebaut,
- nicht auf Kurznotizen reduziert.

Es soll spaeter als Grundlage fuer Architektur, Entwicklung und Priorisierung weiterverwendet und bei neuen Entscheidungen fortgeschrieben werden.
