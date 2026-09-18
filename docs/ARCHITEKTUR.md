# LAB 01 · LDM Planer — Architektur

Stand: 2026-09-18 · Status: **Geruest, Implementierung ausstehend (Referenzfassung fehlt)**

## Zweck

Oeffentliche, allgemeine Fassung eines Lademeter- und Ladungsplaners.
Eigenstaendige statische Web-App, getrennt vom privaten Cockpit.
Zieladresse: `ldm.christianaust.eu`.

## Leitentscheidungen

| Thema | Entscheidung | Begruendung |
|---|---|---|
| Framework | keines, Vanilla JS (ES-Module) | statisch hostbar, schnelle Ladezeit, wartbar, kein Build-Zwang |
| Build | kein Bundler in V1 | native ES-Module reichen; Pages liefert statisch aus |
| Struktur | mehrere Module statt einer HTML-Datei | Referenz ist eine Einzeldatei; Aufteilung nur nach Zustaendigkeit |
| Persistenz | `localStorage` | kein Backend, kein Konto, Daten bleiben im Browser |
| Uebertragung | keine | keine Analytics, keine Requests mit Planungsdaten |
| Tests | `node:test` (Standardbibliothek) | keine zusaetzliche Abhaengigkeit fuer Logiktests |
| XLSX | offen, siehe unten | Entscheidung erst mit der Referenzfassung |
| Hosting | GitHub Pages + Cloudflare-DNS (CNAME) | identisches Muster wie `tisch7.christianaust.eu` |

## Verzeichnisse

```
index.html                 App-Shell, Schrittfolge Stammdaten -> Sendung -> Ladeplan -> Ergebnis
assets/css/app.css         Branding (dunkel, Orange-Akzent), Print-Styles
assets/logo/               CA-Signet/Favicons, aus christianaust.eu uebernommen
js/state.js                zentraler App-State
js/storage.js              localStorage, Export/Import/Reset der Stammdaten
js/masterdata.js           CRUD Ladungstraeger
js/validate.js             Validierung (Pflichtfelder, Masse, doppelte IDs, Stapelfaktor >= 1)
js/import-csv.js           CSV-Parser inkl. Header-Erkennung und Spaltenzuordnung
js/import-xlsx.js          optional, nur falls Abhaengigkeit bewusst akzeptiert
js/vehicles.js             Fahrzeugvorlagen + freie Masse + Nutzlast
js/ldm-core.js             >>> RECHENKERN — wartet auf die Referenzfassung <<<
js/render-plan.js          Draufsicht + Seitenansicht (Inline-SVG)
js/render-result.js        Auslastung, Restkapazitaet, Rechenweg, Stapelfaktorvergleich
js/print.js                Druckansicht
data/                      neutrale Beispieldaten, Fahrzeugvorlagen, CSV-Importvorlage
tests/                     node:test
docs/                      diese Dokumente
```

## Datenmodell Ladungstraeger

| Feld | Typ | Pflicht | Regel |
|---|---|---|---|
| `id` | string | ja | eindeutig im Bestand |
| `bezeichnung` | string | ja | frei |
| `laenge_mm` | integer | ja | > 0 |
| `breite_mm` | integer | ja | > 0 |
| `hoehe_mm` | integer | ja | > 0 |
| `gewicht_kg` | number | nein | >= 0, Default 0 |
| `stapelfaktor_max` | integer | ja | >= 1 (1 = nicht stapelbar) |
| `kategorie` | string | nein | rein informativ |

## Datenmodell Fahrzeug

`innenlaenge_mm`, `innenbreite_mm`, `innenhoehe_mm` (Pflicht, > 0), `nutzlast_kg` (optional).
Vorlagen sind Richtwerte und vollstaendig ueberschreibbar.

## Rechenkern — bewusst offen

Die Referenzfassung (urspruenglich fuer einen Kunden entwickelt) enthaelt die erprobte
Logik fuer Lademeterberechnung, Stellplaetze, Gruppierung gleicher Grundflaechen,
Pruefung beider Ausrichtungen, Hoehenbegrenzung, Stapelung, Verteilung auf mehrere
Fahrzeuge, Restkapazitaet und Rechenweg.

Diese Logik wird **uebernommen und bereinigt, nicht neu erfunden**.
`js/ldm-core.js` bleibt bis zum Vorliegen der Referenz leer.

## Gewicht (neu gegenueber der Referenz)

V1: Gewicht je Ladungstraeger, Gesamtgewicht der Sendung, optionale Nutzlast je Fahrzeug,
Warnung bei Ueberschreitung. **Keine** Achslastberechnung, **keine** Aussage zur
Ladungssicherung.

## XLSX — offene Abwaegung

CSV ist in V1 gesetzt und abhaengigkeitsfrei. Fuer XLSX kaeme SheetJS (`xlsx`) in Frage:
lokal vendored statt CDN, Version fix, Lizenz und CVE-Stand vor Aufnahme zu pruefen.
Entscheidung erst zusammen mit der Referenzfassung, um den Umfang von V1 nicht vorab
aufzublaehen.

## Hosting (vorbereitet, noch nicht eingerichtet)

Vorbild `tisch7.christianaust.eu`: eigenes Repo -> GitHub Pages -> Custom Domain per
CNAME auf `christianaust-scm.github.io`, DNS-only in Cloudflare.
Apex `christianaust.eu` (A-Records auf GitHub Pages) und `cockpit.christianaust.eu`
(Cloudflare Pages + Access) bleiben unberuehrt.
