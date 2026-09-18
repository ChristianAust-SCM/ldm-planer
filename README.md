# LAB 01 · LDM Planer

Lademeter- und Ladungsplanung direkt im Browser.

Teil der persönlichen Ideenschmiede auf [christianaust.eu](https://christianaust.eu).

## Was es tut

Ladungsträger erfassen oder importieren, Sendung zusammenstellen, Ladeplan rechnen:
Lademeter, Stellplätze, Stapelung, Verteilung auf mehrere Fahrzeuge, Auslastung,
Restkapazität und Gewicht — mit Draufsicht, Seitenansicht, Stapelfaktorvergleich
und nachvollziehbarem Rechenweg.

Entstanden aus einem realen Problem in der Supply-Chain-Praxis und für die
allgemeine Nutzung weiterentwickelt.

## Deine Daten bleiben in deinem Browser

Alle Planungs- und Stammdaten werden lokal im Browser verarbeitet und gespeichert.
Keine Übertragung an einen Server, keine Analytics, keine Laufzeitabhängigkeiten.
Siehe [docs/DATENSCHUTZ.md](docs/DATENSCHUTZ.md).

## Ablauf

1. **Stammdaten** — manuell anlegen, CSV oder JSON importieren oder neutrale
   Beispieldaten laden. Export und vollständiges Zurücksetzen jederzeit möglich.
2. **Sendung** — Fahrzeug wählen oder Innenmaße frei eintragen, Positionen über
   Schnellerfassung, Auswahl oder eingefügte Versandliste erfassen.
3. **Ladeplan** — Kennzahlen, Hinweise, Ladeplan je Fahrzeug, Rechenweg, Druck.

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
