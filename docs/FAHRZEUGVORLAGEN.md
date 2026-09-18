# Fahrzeugvorlagen — Herkunft und Quellen

Stand: 2026-09-18 · Grundlage: abgeschlossener Research-Report
„LAB 01 · LDM Planer – reale Fahrzeugvorlagen"

Die Vorlagen stammen vollständig aus diesem Report. Es wurde nichts geschätzt,
nichts abgeleitet und nichts ergänzt. Der Report selbst liegt außerhalb des
Repositorys und wird bewusst nicht als öffentliches Asset ausgeliefert.

## Grundsätze

1. **Nutzlast nur, wenn belegt.** Wo der Report keine variantenscharfe Nutzlast
   nennt, bleibt das Feld `null` und in der Oberfläche leer. Keine Null, keine
   Ableitung aus dem zulässigen Gesamtgewicht.
2. **Keine Palettenplätze.** Kein Hersteller bestätigt sie für die aufgeführten
   Konfigurationen; eine Rechnung aus Länge × Breite wäre Scheingenauigkeit.
   `palettenplaetze` ist überall `null`.
3. **Richtwert wird gekennzeichnet.** Was der Report nur als Richtwert einstuft,
   trägt in der Oberfläche ein sichtbares Etikett samt Begründung.
4. **Maße sind Startwerte** und jederzeit überschreibbar.
5. **Keine Herstellerbilder, Logos oder Renderings** im Projekt.

## Zuordnung

| Vorlagen-ID in der App | Hersteller / Aufbau | Research-Eintrag | Status | Nutzlast | Quelle |
|---|---|---|---|---:|---|
| `transit_l3h3_fwd_srw` | Ford · Kastenwagen L3H3 FWD/SRW | `transit_l3h3_fwd_srw` | konkret | — | Ford Transit Broschüre 2025 [1] |
| `transit_l4h3_rwd_awd` | Ford · Kastenwagen L4H3 RWD/AWD | `transit_l4h3_rwd_awd` | Richtwert | — | Ford Transit Broschüre 2025 [1] |
| `sprinter_schutz_m6_plane_2000` | MB Sprinter 3,5 t · Schutz Mittelhochpritsche M6 mit Plane | `sprinter_schutz_m6_plane_2000` | konkret | — | MB VanSolution / Schutz [16][17] |
| `sprinter_schutz_ta6_plane_2000` | MB Sprinter 3,5 t · Schutz Tiefpritsche TA6 mit Plane | `sprinter_schutz_ta6_plane_2000` | Richtwert | — | MB VanSolution / Schutz [16][18] |
| `sprinter_schutz_ta4_plane_2000` | MB Sprinter 3,5 t · Schutz Tiefpritsche TA4 mit Plane | `sprinter_schutz_ta4_plane_2000` | Richtwert | — | MB VanSolution / Schutz [16][18] |
| `spier_aerobox_sprinter_35t` | MB Sprinter 3,5 t · SPIER Aerobox | `spier_aerobox_sprinter_35t` | konkret | 940 kg | SPIER Aerobox Datenblatt [2] |
| `atego_818_spier_athlet_plus` | MB Atego 818 L · SPIER Athlet plus | `atego_818_spier_athlet_plus` | konkret | — | SPIER Lagerfahrzeug [14] |
| `atego_1224_spier_athlet` | MB Atego 1224 L · SPIER Athlet | `atego_1224_spier_athlet` | konkret | — | SPIER Lagerfahrzeug [15] |
| `man_tgm_18290_spier_thermo` | MAN TGM 18.290 · SPIER Athlet Thermo | `man_tgm_18290_spier_thermo` | konkret | — | SPIER Lagerfahrzeuge MAN [3] |
| `krone_profi_liner_2600` | KRONE Profi Liner, lichte Höhe 2,60 m | `krone_profi_liner_2600` | Richtwert | 33.060 kg | KRONE Profi Liner Datenblatt [4] |
| `krone_profi_liner_2700` | KRONE Profi Liner, lichte Höhe 2,70 m | `krone_profi_liner_2700` | Richtwert | 33.060 kg | KRONE Profi Liner Datenblatt [4] |
| `krone_mega_liner_3000` | KRONE Mega Liner SDP 27 eLMG-CS | `krone_mega_liner_3000` | konkret | 32.100 kg | KRONE Mega Liner Datenblatt [5] |
| `krone_wp73_ls5_cs` | KRONE WP 7,3 LS5-CS Wechselpritsche | `krone_wp73_ls5_cs` | konkret | — | KRONE Wechselpritschen [6] |
| `krone_wk73_stg` | KRONE WK 7,3 STG Wechselkoffer | `krone_wk73_stg` | konkret | — | KRONE Wechselkoffer [7] |
| `frei` | — | — | eigene Maße | — | — |

Die Nutzlasten der beiden Profi Liner und des Mega Liner sind die technisch
möglichen Trailer-Nutzlasten der Datenblätter; die 940 kg der Aerobox gelten
ausschließlich für das dokumentierte Ausstattungsfahrzeug. Beides steht so auch
in der Oberfläche.

## Bewusst nicht aufgenommen

| Nicht enthalten | Begründung aus dem Report |
|---|---|
| Generische 7,5-/12-/18-Tonner | Das zulässige Gesamtgewicht definiert weder Innenmaße noch Nutzlast; Radstand, Aufbau und Ladebordwand verändern beides erheblich. |
| Jumbo- / Volumenzug als ein Rechteck | Motorwagen und Anhänger sind zwei getrennte Ladeflächen. Erscheint in der Bibliothek als nicht wählbarer Eintrag mit Begründung. |
| Generische Wechselbrücke | Nur mit konkreter Baulänge und Aufbauart sinnvoll — daher die beiden konkreten KRONE-Konfigurationen. |
| Technoplan Plane/Spriegel | Im finalen Report verworfen: Höhenangaben sind Bauhöhen, keine lichten Innenmaße, und Ladeflächen variieren mit Radstand und Antrieb. |
| Palettenplätze der Planensprinter | Geometrisch wären es sechs bzw. acht Europaletten, doch kein Hersteller bestätigt das, und Radkästen, Rungen und Verschlüsse stören. |

## Silhouetten

Die Piktogramme unter `assets/vehicles/` sind **eigene, markenneutrale
Zeichnungen** — keine Nachbildung konkreter Modelle, keine Herstellermerkmale,
keine Fremdassets. Sieben Grundtypen decken alle Vorlagen ab; die Zuordnung
steht in `data/silhouetten.js`, getrennt von den Fachdaten.

| Grundtyp | Datei | Vorlagen |
|---|---|---|
| Kastenwagen | `van.svg` | Ford Transit L3H3, L4H3 |
| Transporter mit Planenaufbau | `curtain-van.svg` | Planensprinter M6, TA6, TA4 |
| Koffer-LKW | `box-truck.svg` | SPIER Aerobox, Atego 818, Atego 1224, MAN TGM |
| Sattelauflieger | `curtainsider.svg` | Profi Liner 2,60 m und 2,70 m |
| Mega-Sattelauflieger | `mega-trailer.svg` | Mega Liner |
| Wechselsystem | `swap-body.svg` | WP 7,3, WK 7,3 |
| Freie Ladefläche | `generic.svg` | Freie Maße |

Gemeinsames Raster `0 0 160 100`, Fahrerhaus links, Ladung rechts — wie in den
Ladeplan-Grafiken der App. Navy trägt die Struktur, Silber die Flächen, Orange
markiert ausschließlich die Ladefläche. Kein Text, keine Rasterdaten, keine
externen Referenzen; die Dateien sind `role="presentation"` und werden
dekorativ mit `alt=""` und `aria-hidden` eingebunden.

**Bewusst nicht gezeichnet:** die Radkastengeometrie der Tiefpritschen TA4/TA6.
Sie ist nicht veröffentlicht — die Illustration würde sie sonst vortäuschen. Der
Textstatus „Radkästen vorhanden" bleibt die fachliche Information. Ebenso hat
der Jumbo-/Volumenzug keine Silhouette, weil er nicht als eine Ladefläche
modellierbar ist.

## Migration aus der ersten Fassung

| alte Vorlage | Nachfolger |
|---|---|
| `mega` (Curtainsider Mega) | `krone_mega_liner_3000` |
| `std` (Standard-Sattelauflieger) | `krone_profi_liner_2700` |
| `wb` (Wechselbrücke) | `krone_wp73_ls5_cs` |
| `custom` (Freie Maße) | `frei` |

Gespeicherte Fahrzeugmaße der Nutzer bleiben dabei unverändert — nur die
Vorlagen-ID wird gehoben und anschließend neu gegen die Bibliothek abgeglichen.
Passen die Maße zu keiner Vorlage, steht die Auswahl auf „Freie Maße".

## Offene Punkte für später

- Radkastengeometrie der Tiefpritschen TA4/TA6 ist nicht veröffentlicht; die
  rechteckige Ladeflächenrechnung bildet sie deshalb nicht ab.
- Jumbo-/Gliederzüge brauchen zwei Ladeflächen mit gemeinsamer Nutzlast.
