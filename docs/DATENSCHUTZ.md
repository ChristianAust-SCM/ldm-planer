# Datenschutz — LDM Planer

## Grundsatz

Deine Daten bleiben in deinem Browser.

## Was das konkret heisst

- Stammdaten und Sendungsdaten werden ausschliesslich lokal im Browser verarbeitet
  und in `localStorage` gespeichert.
- Es findet keine Uebertragung von Stammdaten oder Planungsdaten an
  `christianaust.eu` oder einen anderen Server statt.
- Keine Analytics, kein Tracking, keine externen Requests zur Laufzeit.
- Import und Export laufen vollstaendig im Browser (`File`-API, Blob-Download).
- Die Stammdaten koennen jederzeit exportiert, importiert und vollstaendig
  zurueckgesetzt werden.

## Pruefpunkt vor Deployment

Netzwerk-Tab muss nach dem Laden der App bei Nutzung leer bleiben:
keine Requests ausser den statischen Assets beim initialen Laden.

## Abgrenzung

Der LDM Planer ist eine Planungshilfe. Er ersetzt keine Pruefung der
Ladungssicherung und stellt keine Ladungssicherungsfreigabe dar.
