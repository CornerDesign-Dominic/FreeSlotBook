# UI System

## Zweck

Dieses Dokument definiert die verbindliche gestalterische Grundlage fuer die App. Es beschreibt bewusst nur den Zielrahmen fuer spaetere UI-Arbeit und aendert noch nichts an bestehenden Screens, Komponenten oder Styles.

Der aktuelle Stand beschreibt den Standard-Light-Mode mit dunklem Anthrazit-/Graphit-Akzent. Spaeter sollen Dark Mode und austauschbare Akzentfarben ergaenzt werden.

## Design-Prinzipien

- Klarheit vor Dekoration
- Funktion vor Show-Effekt
- ruhige, helle Flaechen mit klarer Struktur
- hohe Lesbarkeit in jeder Hauptansicht
- Interaktionen muessen ohne Erklaerung erkennbar sein
- konsistente Abstaende ueber alle Screens hinweg
- Akzentfarbe sparsam und gezielt einsetzen
- mobile-first denken: Bedienung ohne Tutorial und ohne visuelle Ueberladung
- Read-only-Inhalte duerfen nicht wie interaktive Controls aussehen

## Stilrichtung

- Apple-inspirierte Light UI
- professionell, ruhig und sachlich
- modern, aber nicht trendgetrieben
- minimalistisch statt verspielt
- sanfte Kartenflaechen auf hellem Hintergrund
- feine Borders statt harter Kontraste
- dezente Schatten nur zur Tiefenstaffelung
- runde Ecken, aber nicht soft oder verspielt
- Buttons und Links klar erkennbar, aber nicht uebergross

## Farbpalette

Die Farben werden ueber Rollen definiert, nicht ueber Einzelwerte. Dadurch bleibt die Akzentfarbe spaeter austauschbar.

### Standard-Light-Mode

- `background`: `#F4F5F7`
  App-Hintergrund, grosszuegige ruhige Flaeche, leicht kuehles Grau.
- `surface`: `#FFFFFF`
  Primaere Flaeche fuer Karten, Panels, Formulare und modale Inhalte.
- `surfaceSoft`: `#ECEFF3`
  Dezente Akzent- oder Statusflaeche, z. B. fuer hervorgehobene Gruppen oder passive Marker.
- `border`: `#D7DCE2`
  Standard-Border fuer Karten, Inputs, Trennlinien und ruhige Container.
- `textPrimary`: `#1F2329`
  Primaerer Text in dunklem Anthrazit.
- `textSecondary`: `#66707A`
  Sekundaerer Text, Hilfstexte, Meta-Informationen, Zeitmarker.
- `accent`: `#2F343B`
  Standard-Akzent in Graphit/Anthrazit fuer Links, aktive States und wichtige Controls.
- `accentSoft`: `#E6EAEE`
  Sehr dezente Akzentflaeche fuer selektierte oder fokussierte Bereiche.
- `shadow`: `rgba(18, 24, 32, 0.08)`
  Sehr zurueckhaltender Schatten fuer Panels oder Layer-Trennung.

### Farbregeln

- Hintergrundflaechen bleiben ueberwiegend hell und ruhig.
- Der Akzent ist funktional, nicht dekorativ.
- Statusunterschiede moeglichst ueber Helligkeit, Kontrast und Text, nicht ueber viele Farben.
- Reine Schwarz-Weiss-Haerte vermeiden; lieber Anthrazit plus weiche Grauwerte.

## Typografie

- Systemschrift bzw. native Plattformschrift verwenden.
- Keine dekorative Typografie.
- Ueberschriften klar, ruhig und knapp.
- Standardtext muss auf mobilen Screens ohne Zoomen gut lesbar sein.

### Typografische Hierarchie

- `title`: 28-32 px, semibold bis bold
  Fuer Hauptscreen-Titel.
- `sectionTitle`: 18-20 px, semibold
  Fuer Bereichstitel wie Dashboard-Panels oder Einstellungsgruppen.
- `body`: 15-16 px, regular
  Fuer Standardtexte, Labels, Beschreibungen.
- `meta`: 12-13 px, regular bis medium
  Fuer Hilfstexte, Datumsmarker, Zusatzinformationen.
- `link`: wie `body`, aber klar als interaktiv erkennbar
  Erkennbar ueber Akzentfarbe, Unterstreichung oder konsistente Interaktionslogik.

### Typografie-Regeln

- Zeilenlaenge auf mobilen Screens knapp und gut scannbar halten.
- Keine grossen Textbloecke ohne Struktur.
- Meta-Text klar vom Haupttext absetzen.
- Linktext nicht wie Fliesstext tarnen.

## Radius und Rundungen

- `radiusLarge`: 20
  Fuer grosse Panels, modale Flaechen, Hauptkarten.
- `radiusMedium`: 16
  Fuer Standard-Container, Listen- oder Kalenderboxen.
- `radiusSmall`: 12
  Fuer kleinere Controls, Chips, Input-Felder, kompakte Buttons.

### Rundungsregeln

- Grosse Flaechen weicher als kleine Controls.
- Kleine Elemente klar, aber nicht pillenartig.
- Innerhalb eines Screens moeglichst nur wenige Radius-Stufen gleichzeitig verwenden.

## Borders und Shadows

- Standard-Border: 1 px
- Borders sind die primaere Methode zur Strukturierung.
- Schatten nur dort, wo Layering oder Tiefenstaffelung wirklich hilft.
- Schatten immer weich, kurz und schwach.
- Keine dominante Card-Spielzeugoptik.
- Falls Border und Schatten kombiniert werden, bleibt der Schatten deutlich untergeordnet.

## Spacing-System

Verbindliche Stufen:

- `4`: enge innere Abstaende, kleine Korrekturen
- `8`: kleine Luecken zwischen nah verwandten Elementen
- `12`: Standardabstand in kleineren Gruppen
- `16`: Basisabstand fuer Karteninhalte und Formulare
- `20`: mittlerer Panel-Abstand oder groessere Gruppierung
- `24`: Abschnittsabstand innerhalb eines Screens
- `32`: grosszuegiger Abstand zwischen Hauptbereichen

### Spacing-Regeln

- Standard-Panel-Inhalt startet bei `16`.
- Zwischen Hauptsektionen bevorzugt `24` oder `32`.
- Listen und Formulargruppen bevorzugt `8`, `12` oder `16`.
- Keine willkuerlichen Einzelwerte nutzen, wenn eine Systemstufe passt.

## Interaktionsregeln

- Links muessen klar als Navigation oder Aktion erkennbar sein.
- Buttons muessen klar als Buttons erkennbar sein.
- Keine uebergrossen CTA-Flaechen ohne echten Grund.
- Akzentfarbe nur fuer interaktive oder aktivierte Elemente gezielt einsetzen.
- Interaktive Titel sind erlaubt, wenn sie sich klar von reinem Content unterscheiden.
- Read-only-Inhalte duerfen nicht wie Buttons oder Links wirken.
- Keine unnoetigen Animationen, kein visuelles Springen, kein Show-Motion-Verhalten.
- Feedback auf Interaktion lieber ueber leichte Kontrast- oder Flaechenwechsel als ueber laute Farbeffekte.

## Karten- und Panel-Stil

### Dashboard-Panels

- `surface` als Grundflaeche
- `radiusMedium` oder `radiusLarge`
- 1 px `border`
- dezenter Schatten optional
- klarer Titelbereich, darunter kompakter Inhalt
- keine visuelle Ueberladung durch Zusatzdeko

### Kalenderboxen

- ruhige weisse oder leicht abgesetzte Flaechen
- feine Border
- kompakte Innenabstaende
- Fokus auf Lesbarkeit von Datum, Zeit und Status

### Listenkarten

- einheitliche Hoehenlogik, keine zufaellige Optik
- saubere Trennung durch Border und Spacing
- selektierte oder aktive States ueber `accentSoft`, nicht ueber bunte Vollflaechen

### Einstellungsgruppen

- klare Gruppierung in ruhigen Containern
- jeweils ein klarer Abschnittstitel
- Hilfstexte in `textSecondary`
- Schalter, Auswahlfelder und Links mit klarer visueller Rolle

## Kalender- und Timeline-Stil

- Slot- und Terminbalken bleiben kompakt und lesbar.
- Grundsaetzlich neutrale, ruhige Flaechen.
- Statusunterschiede bevorzugt ueber Helligkeit, Border und Text statt ueber starke Farben.
- Verfuegbare, belegte oder inaktive Zustaende duerfen sich unterscheiden, aber nicht bunt wirken.
- Datums- und Zeitmarker muessen klar lesbar, aber optisch dezent sein.
- Zeitachsen, Hilfslinien und Trennmarker sollen Orientierung geben, nicht dominieren.
- Read-only-Timelines duerfen nicht wie antippbare Karten aussehen.
- Interaktive Kalenderbereiche brauchen spaeter eine klar andere visuelle Sprache als reine Vorschauen.

## Navigation und Links

- Navigation muss auf mobilen Screens ohne Zusatztext sofort erkennbar sein.
- Titel duerfen klickbar sein, wenn das Muster im Screen konsistent verwendet wird.
- Textlinks sind erlaubt, wenn sie klar unterstrichen oder anderweitig eindeutig als interaktiv markiert sind.
- Navigationselemente nie wie passiver Meta-Text behandeln.

## Zukunft: Themes

- Spaeter soll es Light Mode und Dark Mode geben.
- Spaeter soll die Akzentfarbe einstellbar sein.
- Dieses Dokument beschreibt vorerst nur den Standard-Light-Mode mit dunklem Anthrazit-/Graphit-Akzent.
- Neue UI-Arbeit soll so aufgebaut werden, dass Rollen wie `accent`, `background` oder `textPrimary` spaeter themebar bleiben.

## Umsetzungsregel fuer spaetere Arbeit

Wenn Screens, Komponenten oder neue UI-Bausteine spaeter ueberarbeitet werden, sollen sie sich an diesem Dokument orientieren. Konkrete Prompt- oder Umsetzungsanweisungen koennen sich direkt auf `docs/UI_SYSTEM.md` beziehen.
