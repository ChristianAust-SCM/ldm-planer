# LAB 01 · LDM Planer

Lademeter- und Ladungsplanung direkt im Browser.

**https://ldm.christianaust.eu** — Teil der persönlichen Ideenschmiede auf
[christianaust.eu](https://christianaust.eu).

## Stand

**V1.1 · abgenommen am 18.09.2026** · produktiv unter https://ldm.christianaust.eu

- **Fahrzeugbibliothek mit 15 Einträgen:** 14 recherchierte reale Konfigurationen
  plus freie Maße. Die drei Planensprinter M6, TA6 und TA4 bilden eine eigene,
  vorangestellte Klasse. Herkunft und Quellen je Vorlage:
  [docs/FAHRZEUGVORLAGEN.md](docs/FAHRZEUGVORLAGEN.md).
- **Eigene, markenneutrale Fahrzeugsilhouetten** unter `assets/vehicles/` — keine
  Herstellerbilder, keine Nachbildung konkreter Modelle.
- **Manuelle Ladungserfassung** ohne jede Vorbereitung; Stammdaten sind optional
  und lassen sich aus Excel (.xlsx) oder CSV importieren.
- **Ladeplan je Fahrzeug** mit Draufsicht, Seitenansicht, Rechenweg und
  Stapelfaktorvergleich.
- **Zwei Kennzahlen:** benötigte Ladelänge des erzeugten Plans und klassische
  LDM-Kennzahl (belegte Grundfläche ÷ 2,40 m).
- **Nutzlastprüfung**, sobald eine Nutzlast hinterlegt ist — vorbelegt nur dort,
  wo der Hersteller sie für die konkrete Konfiguration belegt.
- **Lokale Verarbeitung im Browser**, keine Datenübertragung, keine
  Laufzeitabhängigkeiten.

## Was es tut

Fahrzeug wählen, Ladung erfassen, Ladeplan rechnen:
benötigte Ladelänge, Lademeter, Stellplätze, Stapelung, Verteilung auf mehrere
Fahrzeuge, Auslastung, freie Ladelänge und Gewicht — mit Draufsicht,
Seitenansicht, Stapelfaktorvergleich und nachvollziehbarem Rechenweg.

**Zwei Kennzahlen, zwei Fragen:** die *benötigte Ladelänge* ist die tatsächlich
gebrauchte Fahrzeuglänge des erzeugten Ladeplans, *LDM* die klassische
flächenbasierte Kennzahl (belegte Grundfläche ÷ 2,40 m). Sie können auseinander
liegen; der Rechenweg zeigt beide Herleitungen und beziffert die Differenz.

Entstanden aus einem realen Problem in der Supply-Chain-Praxis und für die
allgemeine Nutzung weiterentwickelt.

## Deine Daten bleiben in deinem Browser

Alle Planungs- und Stammdaten werden lokal im Browser verarbeitet und gespeichert.
Keine Übertragung an einen Server, keine Analytics, keine Laufzeitabhängigkeiten.
Siehe [docs/DATENSCHUTZ.md](docs/DATENSCHUTZ.md).

## Ablauf

1. **Fahrzeug** — aus der Bibliothek recherchierter Konfigurationen wählen
   (Transporter, Planensprinter, Koffer-LKW, Sattelauflieger, Wechselsysteme)
   oder Innenmaße frei eintragen. Jede Vorlage zeigt Status, Besonderheiten und
   Quelle; Nutzlast steht nur dort, wo der Hersteller sie belegt.
2. **Ladung erfassen** — Maße, Menge und Stapelfaktor genügen. Wer will, übernimmt
   die Werte aus eigenen Stammdaten.
3. **Ladeplan berechnen** — Kennzahlen, Hinweise, Draufsicht, Seitenansicht,
   Rechenweg, Stapelfaktorvergleich, Druck. Passt ein Träger nicht in Länge oder
   Breite des Fahrzeugs, sagt die App das, statt einen unmöglichen Plan zu zeigen.

**Stammdaten sind optional.** Sie liegen in einer eigenen Ansicht und lassen sich
manuell pflegen, aus Excel (.xlsx) oder CSV importieren, exportieren und
vollständig zurücksetzen — nötig sind sie für keinen Schritt.

## Bekannte Grenzen

- **Radkästen der Tiefpritschen TA4 und TA6** sind nicht rechnerisch modelliert.
  Ihre Geometrie ist nicht veröffentlicht; die Ladefläche wird rechteckig
  gerechnet, und die Fahrzeugkarte weist darauf hin.
- **Jumbo- und Gliederzüge** werden nicht unterstützt: Motorwagen und Anhänger
  sind zwei getrennte Ladeflächen, die Engine kennt nur eine. Sie erscheinen in
  der Bibliothek als nicht wählbarer Hinweis statt als Fantasiefahrzeug.
- Keine Achslastberechnung und keine gewichtsbasierte Reihenoptimierung; die
  übrigen bewussten Vereinfachungen stehen in
  [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

## Hinweis

Planungshilfe. Keine Ladungssicherungsfreigabe, keine Achslastberechnung.
Fahrzeuginnenmaße sind Richtwerte und müssen im Einzelfall geprüft werden.

## Entwicklung

```bash
npm run serve                  # http://localhost:8080
npm test                       # Logiktests (node:test, ohne Abhängigkeiten)
node tests/browser.mjs         # Browserabnahme, benötigt Playwright
```

Die Browserabnahme findet Playwright über `PLAYWRIGHT=/pfad/zu/node_modules/playwright`
und überspringt sich selbst, wenn kein Treiber vorhanden ist — die App hat
bewusst keine Abhängigkeiten.

Aufbau, Datenmodell und Rechenkern: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).
Herkunft und Bereinigung: [docs/HERKUNFT.md](docs/HERKUNFT.md).
Fahrzeugvorlagen und ihre Quellen: [docs/FAHRZEUGVORLAGEN.md](docs/FAHRZEUGVORLAGEN.md).
