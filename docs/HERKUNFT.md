# Herkunft und Bereinigung

## Ausgangspunkt

Grundlage ist eine erprobte Einzeldatei-Fassung (HTML mit eingebettetem CSS und
JavaScript, rund 850 Zeilen), die für einen konkreten Kunden entwickelt wurde.
Sie diente ausschließlich als Referenz und bleibt unangetastet.

## Übernommen (Sache unverändert, nur entkoppelt)

- Lademeterberechnung und Stellplatzlogik
- Gruppierung gleicher Grundflächen über Positionen hinweg
- Prüfung beider Ausrichtungen mit Wahl der kürzeren Ladelänge
- Stapellogik inklusive angebrochener Stapel
- Höhenbegrenzung durch die Fahrzeuginnenhöhe
- Verteilung auf mehrere Fahrzeuge (First Fit, tiefste Reihen zuerst)
- Auslastung und Restkapazität samt Umrechnung in mögliche Zusatzreihen
- Draufsicht und Seitenansicht als Inline-SVG
- Rechenweg als nachvollziehbare Tabelle
- Vergleich verschiedener Stapelfaktoren
- Schnellerfassung, Hinweise, Druckfunktion
- vollständig lokale Verarbeitung im Browser

## Entfernt

| Entfernt | Ersetzt durch |
|---|---|
| fest eingebetteter Katalog mit gut hundert kundenspezifischen Ladungsträger-Nummern | eigene Stammdaten: manuell, Import oder neutrale Beispieldaten |
| daraus abgeleitete Festangaben im Text (Anzahl Nummern, Maßvarianten, Grundflächen) | aus dem jeweiligen Bestand gerechnete Kennzahlen |
| Beispielsendung mit Kundennummern | neutrale Beispieldaten |
| Untertitel mit Branchenbezug des Kunden | „Lademeter- und Ladungsplanung direkt im Browser“ |
| Verweis auf die Quelldatei des Kundenstamms im Quelltext | entfällt |
| Hilfetexte mit Bezug auf den festen Katalog | auf eigene Stammdaten umformuliert |
| Farbschema und Typografie des ursprünglichen Umfelds | CA-Branding: heller Arbeitsplatz mit Navy, Orange und Silber |
| „Versandliste einfügen" als eigener Block | entfallen — Positionen werden manuell oder aus Stammdaten erfasst |

Ein Kundenname war in der Referenzdatei nicht enthalten; geprüft wurde trotzdem.

## Ergänzt

- allgemeine Stammdatenverwaltung (anlegen, bearbeiten, löschen)
- CSV-Import mit Trennzeichen- und Header-Erkennung, änderbarer Spaltenzuordnung,
  Validierung und Vorschau vor der Übernahme
- Import eines eigenen JSON-Exports
- Export als CSV und JSON, vollständiges Zurücksetzen
- Gewicht je Ladungsträger, Gesamtgewicht, optionale Nutzlast mit Warnung
- Schrittführung Stammdaten → Sendung → Ladeplan
- Persistenz im Browser über Sitzungen hinweg
- XLSX-Import über einen eigenen Leser, ohne Fremdbibliothek
- klassische LDM-Kennzahl neben der Ladelänge, beide im Rechenweg hergeleitet
- Längenprüfung des Fahrzeugs (die Ursprungsfassung prüfte nur die Breite)
- Positionen bearbeiten, duplizieren, löschen
- Tests: Logik (`node:test`) und Browserabnahme (Playwright)

## Dauerhafte Absicherung

`tests/keine-kundendaten.test.mjs` prüft bei jedem Testlauf, dass weder
Kundenbezeichnungen noch Katalog-IDs, abgeleitete Festangaben oder ein
eingebetteter Stammdatenkatalog ins Projekt zurückkehren. Die Muster wurden
gegen die Referenzdatei gegengeprüft: dort schlagen sie an, hier nicht.
Deshalb nennt auch dieses Dokument die ursprünglichen Festangaben nicht im Wortlaut.
