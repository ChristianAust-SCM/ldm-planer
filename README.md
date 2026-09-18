# LAB 01 · LDM Planer

Lademeter- und Ladungsplanung direkt im Browser.

Teil der persoenlichen Ideenschmiede auf [christianaust.eu](https://christianaust.eu).
Geplante Adresse: `ldm.christianaust.eu`.

## Status

**Geruest.** Struktur und Architektur stehen, die Implementierung wartet auf die
Referenzfassung der bestehenden Rechenlogik — siehe [docs/REFERENZ-BENOETIGT.md](docs/REFERENZ-BENOETIGT.md).

## Idee

Ladungstraeger erfassen oder importieren, Sendung zusammenstellen, Ladeplan rechnen:
Lademeter, Stellplaetze, Stapelung, Verteilung auf mehrere Fahrzeuge, Auslastung und
Restkapazitaet — mit Draufsicht, Seitenansicht und nachvollziehbarem Rechenweg.

Entstanden aus einem realen Problem in der Supply-Chain-Praxis und fuer die
allgemeine Nutzung weiterentwickelt.

## Deine Daten bleiben in deinem Browser

Alle Planungs- und Stammdaten werden lokal im Browser verarbeitet und gespeichert.
Keine Uebertragung an einen Server, keine Analytics. Siehe [docs/DATENSCHUTZ.md](docs/DATENSCHUTZ.md).

## Hinweis

Planungshilfe. Keine Ladungssicherungsfreigabe. Fahrzeuginnenmasse sind Richtwerte
und muessen im Einzelfall geprueft werden.

## Entwicklung

```bash
python3 -m http.server 8080    # lokal oeffnen: http://localhost:8080
node --test tests/*.test.mjs   # Tests
```

Kein Build, keine Laufzeit-Abhaengigkeiten. Details in [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).
