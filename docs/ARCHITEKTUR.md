# LAB 01 · LDM Planer — Architektur

Stand: 2026-09-18 · Status: **V1 implementiert, Tests grün**

## Zweck

Öffentliche, allgemeine Fassung eines Lademeter- und Ladungsplaners.
Eigenständige statische Web-App, getrennt vom privaten Cockpit.
Zieladresse: `ldm.christianaust.eu`.

## Leitentscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Framework | keines, Vanilla JS (ES-Module) | statisch hostbar, schnelle Ladezeit, wartbar, kein Build |
| Build | keiner | native ES-Module; GitHub Pages liefert die Dateien unverändert aus |
| Abhängigkeiten | null zur Laufzeit | nichts, was altert, bricht oder nachgeladen werden muss |
| Struktur | Module nach Zuständigkeit | die Ursprungsfassung war eine Einzeldatei mit ~850 Zeilen |
| Persistenz | `localStorage` | kein Backend, kein Konto, Daten bleiben im Browser |
| Übertragung | keine | keine Analytics, keine Requests mit Planungsdaten |
| Tests | `node:test` + Playwright (extern) | Logiktests ohne Abhängigkeit, Browsertests optional |
| XLSX | **nicht in V1** | siehe unten |
| Hosting | GitHub Pages + Cloudflare-DNS (CNAME) | identisches Muster wie `tisch7.christianaust.eu` |

## Verzeichnisse

```
index.html                 App-Shell, Schrittfolge Stammdaten → Sendung → Ladeplan
assets/css/app.css         Branding (dunkel, Orange-Akzent), Druckstile
assets/logo/               CA-Signet und Favicons
js/app.js                  Zustand, Ereignisse, Oberfläche
js/ldm-core.js             Rechenkern — ohne DOM, ohne Stammdaten, vollständig testbar
js/masterdata.js           Bestand, Variantenbildung, Suche
js/validate.js             Validierung und Zahlformate
js/import-csv.js           CSV lesen und schreiben, Header-Erkennung, Spaltenzuordnung
js/storage.js              localStorage, Export/Import/Reset, Datei-Download
js/render-plan.js          Draufsicht und Seitenansicht als Inline-SVG
js/render-result.js        Kennzahlen, Hinweise, Ladepläne, Rechenweg, Vergleich
js/help.js                 Erklärungen an Ort und Stelle
js/format.js               Zahlformate und kleine Helfer
data/beispieldaten.js      neutrale Beispiel-Ladungsträger und Fahrzeugvorlagen
data/import-vorlage.csv    Vorlage für den CSV-Import
tests/                     node:test (Logik) und browser.mjs (Playwright)
docs/                      diese Dokumente
```

## Datenmodell Ladungsträger

| Feld | Typ | Pflicht | Regel |
|---|---|---|---|
| `id` | string | ja | eindeutig im Bestand |
| `bezeichnung` | string | ja | frei |
| `laenge_mm` | integer | ja | > 0, ≤ 30.000 |
| `breite_mm` | integer | ja | > 0, ≤ 30.000 |
| `hoehe_mm` | integer | ja | > 0, ≤ 30.000 |
| `gewicht_kg` | number | nein | ≥ 0, Default 0 |
| `stapelfaktor_max` | integer | ja | ≥ 1 (1 = nicht stapelbar) |
| `kategorie` | string | nein | rein informativ, wird importiert und exportiert |

Zahlen werden in deutscher und englischer Schreibweise angenommen
(`1.200`, `1.200,5`, `1200.5`). Maße in mm, Gewicht in kg.

## Datenmodell Fahrzeug

`l`, `b`, `h` (Innenmaße in mm, Pflicht) und `nutzlast` (kg, optional).
Vorlagen sind Richtwerte und vollständig überschreibbar; weicht ein Wert ab,
springt die Auswahl selbsttätig auf „Freie Maße“.

## Rechenkern

`js/ldm-core.js` enthält die Logik der Ursprungsfassung, unverändert in der
Sache und nur entkoppelt:

1. **Gruppierung** nach Grundfläche, unabhängig von der Kantenreihenfolge.
   Mehrere Positionen mit gleicher Grundfläche rechnen zusammen; es gelten der
   höchste Träger und der kleinste Stapelfaktor der Gruppe.
2. **Höhenbegrenzung**: `floor(Innenhöhe / Trägerhöhe)` deckelt den Stapelfaktor.
3. **Stellplätze**: `ceil(Menge / Stapelfaktor)`, Rest bleibt ein angebrochener Stapel.
4. **Ausrichtung**: beide Lagen werden durchgerechnet, gewählt wird die kürzere
   Ladelänge (Tiebreak: kleinere LDM je Stellplatz, dann mehr Stück je Reihe).
5. **Verteilung** auf Fahrzeuge: First Fit, tiefste Reihen zuerst.
6. **Hinweise** zu Höhe, Mischhöhen, Innenbreite, Schlussreihe, Restbreite,
   nicht passenden Trägern und Nutzlast.

Der Kern kennt weder DOM noch Stammdaten. Er bekommt aufgelöste Positionen
(`{menge, l, b, h, stapel, gewicht}`) und ein Fahrzeug — deshalb ist er
vollständig ohne Browser testbar.

## Gewicht (neu gegenüber der Ursprungsfassung)

Gewicht je Ladungsträger, Gesamtgewicht der Sendung, optionale Nutzlast je
Fahrzeug, Warnung bei Überschreitung. Die Verteilung auf Fahrzeuge richtet sich
weiterhin nach der **Ladelänge**, nicht nach dem Gewicht — eine Überschreitung
wird gemeldet, nicht automatisch aufgelöst.

Teilen sich Träger mit unterschiedlichem Gewicht eine Grundfläche, rechnet die
Verteilung je Fahrzeug mit dem Mittelwert der Gruppe; die Gesamtsumme bleibt
exakt. **Keine** Achslastberechnung, **keine** Aussage zur Ladungssicherung.

## XLSX — bewusst nicht in V1

CSV deckt den Anwendungsfall ab und kostet keine Abhängigkeit. XLSX bräuchte
SheetJS: rund 900 kB, eigene CVE-Historie, Lizenzwechsel in der Vergangenheit.
Das widerspricht dem Grundsatz „null Laufzeitabhängigkeiten“ für einen Nutzen,
den ein Export aus Excel nach CSV in zwei Klicks ebenfalls liefert.
Der Import erkennt Trennzeichen und Spalten selbsttätig, damit genau dieser Weg
bequem bleibt. Sollte XLSX später kommen: lokal vendored, Version fix,
Lizenz- und CVE-Stand dokumentiert.

## Hosting

Vorbild `tisch7.christianaust.eu`: eigenes Repo → GitHub Pages
(`build_type: legacy`, Quelle `main` / Wurzel) → Custom Domain per `CNAME` auf
`christianaust-scm.github.io`, in Cloudflare **DNS-only**.
Apex `christianaust.eu` (A-Records auf GitHub Pages) und
`cockpit.christianaust.eu` (Cloudflare Pages + Access) bleiben unberührt.
