# LAB 01 · LDM Planer

Lademeter- und Ladungsplanung direkt im Browser.

**https://ldm.christianaust.eu** — Teil der persönlichen Ideenschmiede auf
[christianaust.eu](https://christianaust.eu).

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
