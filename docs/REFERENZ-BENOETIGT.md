# Benoetigt: Referenzfassung des LDM-Planers

Status: **offen** (Stand 2026-09-18)

## Worum es geht

Die erprobte Rechenlogik der bestehenden Fassung soll uebernommen und bereinigt,
nicht neu erfunden werden. Die Datei liegt nicht auf diesem System.

## Bereits erfolglos durchsucht

- alle Projektverzeichnisse unter `~/projekte` (Name und Inhalt)
- gesamtes Home-Verzeichnis nach Dateinamen `*ldm*`, `*lademeter*`, `*ladungs*`, `*ladeplan*`
- gesamtes Home-Verzeichnis nach dem Begriff `Stapelfaktor` (ohne private Verzeichnisse)
- `~/Exchange`, `~/Downloads`, `~/tmp`, `~/projects`
- Git-Historie aller lokalen Repositories (auch geloeschte Dateien, `--diff-filter=A`)
- Google Drive (`Lademeter`, `Stapelfaktor`, Titel `LDM`)
- frueheres Claude-Sessionprotokoll und Paste-Cache
- Shell-History

## Was gebraucht wird

Die Datei `LDM-Planer.html` (oder die jeweils aktuelle Fassung) an einem
zugaenglichen Ort, zum Beispiel `~/Exchange/`.

## Was danach passiert

1. Rechenlogik uebernehmen und in `js/ldm-core.js` modularisieren
2. Kundenspezifische Bestandteile entfernen (eingebetteter Ladungstraegerkatalog,
   abgeleitete Angaben wie feste Anzahlen, kundenspezifische Texte und Bezeichnungen)
3. Stammdatenverwaltung, Import und Gewichtslogik ergaenzen
4. Tests, Qualitaetsreview, Versionierung, Hosting

Die bestehende Fassung bleibt unangetastet und dient ausschliesslich als Referenz.
