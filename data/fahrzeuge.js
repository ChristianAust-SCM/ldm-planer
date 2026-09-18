/*
 * Fahrzeugbibliothek — reale, recherchierte Konfigurationen.
 *
 * Quelle aller Werte: der abgeschlossene Research-Report
 * „LAB 01 · LDM Planer – reale Fahrzeugvorlagen" (Stand 18.09.2026).
 * Die Zuordnung Vorlage → Hersteller/Aufbau → Research-Eintrag → Quelle steht in
 * docs/FAHRZEUGVORLAGEN.md.
 *
 * Grundsätze, die hier nicht verhandelbar sind:
 * - `nutzlast` nur, wenn der Report sie für genau diese Konfiguration belegt.
 *   Sonst `null` — kein 0, keine Ableitung aus dem zulässigen Gesamtgewicht.
 * - `palettenplaetze` bleibt überall `null`: keine Herstellerfreigabe vorhanden,
 *   eine geometrische Rechnung wäre Scheingenauigkeit.
 * - `status: 'richtwert'` für alles, was der Report nur als Richtwert einstuft.
 * - Maße sind Startwerte und in der App jederzeit überschreibbar.
 */

export const KATEGORIEN = [
  { id: 'transporter', name: 'Transporter & Express' },
  { id: 'lkw',         name: 'LKW · Koffer & Plane' },
  { id: 'sattel',      name: 'Sattelauflieger' },
  { id: 'wechsel',     name: 'Wechselsysteme' },
  { id: 'sonder',      name: 'Sonderkonfiguration' }
]

export const FAHRZEUGE = [
  /* ---------------- Transporter & Express ---------------- */
  {
    id: 'transit_l3h3_fwd_srw',
    name: 'Ford Transit L3H3 (FWD/SRW)',
    kategorie: 'transporter',
    aufbau: 'Ford · Kastenwagen L3H3, Frontantrieb, Einzelbereifung',
    l: 3533, b: 1784, h: 2125,
    nutzlast: null,
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: true,
    breiteZwischenRadkaesten: 1392,
    besonderheiten: [
      'Zwischen den Radkästen nur 1.392 mm lichte Breite',
      'Türöffnungen sind kleiner als der Innenraum',
      'Nutzlast hängt von der Konfiguration ab und ist nicht veröffentlicht'
    ],
    quelle: { text: 'Ford Transit Broschüre 2025', ref: '[1]' }
  },
  {
    id: 'transit_l4h3_rwd_awd',
    name: 'Ford Transit L4H3 (RWD/AWD)',
    kategorie: 'transporter',
    aufbau: 'Ford · Kastenwagen L4H3, Heck-/Allradantrieb',
    l: 4256, b: 1784, h: 2025,
    nutzlast: null,
    palettenplaetze: null,
    status: 'richtwert',
    richtwertGrund: 'Antrieb und Bereifung verändern die nutzbare Breite erheblich.',
    radkaesten: true,
    breiteZwischenRadkaesten: null,
    besonderheiten: [
      'Bei Doppelbereifung nur 1.154 mm zwischen den Radkästen',
      'Antrieb und Bereifung vor Einsatz abfragen'
    ],
    quelle: { text: 'Ford Transit Broschüre 2025', ref: '[1]' }
  },
  {
    id: 'sprinter_schutz_m6_plane_2000',
    name: 'Planensprinter · Schutz M6',
    kategorie: 'transporter',
    aufbau: 'MB Sprinter 3,5 t · Schutz Mittelhochpritsche Typ M6 mit Plane',
    l: 4300, b: 2030, h: 2000,
    nutzlast: null,
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: false,
    ladehoehe: 900,
    planenart: 'Plane auf Mittelhochpritsche, Gestell in drei Höhen (1.550 / 1.850 / 2.000 mm)',
    besonderheiten: [
      'Ebener Pritschenboden, keine Radkästen in der Ladefläche',
      'Ladehöhe ab ca. 900 mm',
      'Radstand 4.325 mm'
    ],
    quelle: { text: 'Mercedes-Benz VanSolution · Aufbauhersteller Schutz; Schutz Mittelhochpritsche Typ M', ref: '[16][17]' }
  },
  {
    id: 'sprinter_schutz_ta6_plane_2000',
    name: 'Planensprinter · Schutz TA6',
    kategorie: 'transporter',
    aufbau: 'MB Sprinter 3,5 t · Schutz Tiefpritsche Typ TA6 mit Plane',
    l: 4300, b: 2030, h: 2000,
    nutzlast: null,
    palettenplaetze: null,
    status: 'richtwert',
    richtwertGrund: 'Die Maße sind belegt, die Radkastengeometrie ist es nicht.',
    radkaesten: true,
    ladehoehe: 750,
    planenart: 'Plane auf Tiefpritsche',
    besonderheiten: [
      'Integrierte Radkästen in der Ladefläche',
      'Niedrige Ladehöhe ab ca. 750 mm',
      'Seitlich rundum abklappbare Bordwände',
      'Radstand 4.325 mm'
    ],
    quelle: { text: 'Mercedes-Benz VanSolution · Aufbauhersteller Schutz; Schutz Tiefpritsche Typ TA', ref: '[16][18]' }
  },
  {
    id: 'sprinter_schutz_ta4_plane_2000',
    name: 'Planensprinter · Schutz TA4',
    kategorie: 'transporter',
    aufbau: 'MB Sprinter 3,5 t · Schutz Tiefpritsche Typ TA4 mit Plane',
    l: 3480, b: 2030, h: 2000,
    nutzlast: null,
    palettenplaetze: null,
    status: 'richtwert',
    richtwertGrund: 'Die Maße sind belegt, die Radkastengeometrie ist es nicht.',
    radkaesten: true,
    ladehoehe: null,
    planenart: 'Plane auf kompakter Tiefpritsche, Planeninnenhöhe 1.550 / 1.850 / 2.000 mm',
    besonderheiten: [
      'Integrierte Radkästen in der Ladefläche',
      'Kompakte Tiefpritsche, Radstand 3.665 mm',
      'Rundum abklappbare Seitenwände'
    ],
    quelle: { text: 'Mercedes-Benz VanSolution · Aufbauhersteller Schutz; Schutz Tiefpritsche Typ TA', ref: '[16][18]' }
  },

  /* ---------------- LKW · Koffer & Plane ---------------- */
  {
    id: 'spier_aerobox_sprinter_35t',
    name: 'Sprinter Koffer · SPIER Aerobox (3,5 t)',
    kategorie: 'lkw',
    aufbau: 'MB Sprinter 3,5 t · SPIER Aerobox Leichtbaukoffer',
    l: 4350, b: 2060, h: 2100,
    nutzlast: 940,
    nutzlastHinweis: 'Gilt nur für das dokumentierte Fahrzeug mit Sonderausstattung.',
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: null,
    portalhoehe: 1990,
    besonderheiten: [
      'Portal 1.980 × 1.990 mm — kleiner als der Innenraum',
      'Nutzlast gilt nur für das dokumentierte Ausstattungsfahrzeug'
    ],
    quelle: { text: 'SPIER Aerobox auf Mercedes-Benz Sprinter', ref: '[2]' }
  },
  {
    id: 'atego_818_spier_athlet_plus',
    name: 'Atego 818 · SPIER Athlet plus (7,5 t)',
    kategorie: 'lkw',
    aufbau: 'MB Atego 818 L · SPIER Leichtbau-Kofferaufbau',
    l: 6050, b: 2496, h: 2396,
    nutzlast: null,
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: null,
    ladebordwand: true,
    besonderheiten: [
      'Konkretes Fahrzeug mit Ladebordwand',
      'Keine belastbare Nutzlast veröffentlicht',
      'Kein allgemeingültiger 7,5-t-Standard'
    ],
    quelle: { text: 'SPIER Lagerfahrzeug Atego 818 L', ref: '[14]' }
  },
  {
    id: 'atego_1224_spier_athlet',
    name: 'Atego 1224 · SPIER Athlet (12 t)',
    kategorie: 'lkw',
    aufbau: 'MB Atego 1224 L · SPIER Plywood-Kofferaufbau',
    l: 7200, b: 2496, h: 2369,
    nutzlast: null,
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: null,
    ladebordwand: true,
    besonderheiten: [
      'Konkretes Fahrzeug mit 1.500-kg-Ladebordwand',
      'Keine belastbare Nutzlast veröffentlicht',
      'Kein allgemeingültiger 12-t-Standard'
    ],
    quelle: { text: 'SPIER Lagerfahrzeug Atego 1224 L', ref: '[15]' }
  },
  {
    id: 'man_tgm_18290_spier_thermo',
    name: 'MAN TGM 18.290 · SPIER Thermo (18 t)',
    kategorie: 'lkw',
    aufbau: 'MAN TGM 18.290 · SPIER Athlet Thermo Kühlkoffer',
    l: 7650, b: 2490, h: 2400,
    nutzlast: null,
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: null,
    besonderheiten: [
      'Kühlkoffer-Konfiguration — nicht als Trockenfrachtkoffer verwenden',
      'Keine belastbare Nutzlast veröffentlicht'
    ],
    quelle: { text: 'SPIER Lagerfahrzeuge MAN', ref: '[3]' }
  },

  /* ---------------- Sattelauflieger ---------------- */
  {
    id: 'krone_profi_liner_2600',
    name: 'KRONE Profi Liner · 2,60 m',
    kategorie: 'sattel',
    aufbau: 'KRONE Profi Liner · Standard-Curtainsider, untere Höhenausprägung',
    l: 13620, b: 2480, h: 2600,
    nutzlast: 33060,
    nutzlastHinweis: 'Technisch mögliche Trailer-Nutzlast laut Datenblatt.',
    palettenplaetze: null,
    status: 'richtwert',
    richtwertGrund: 'Der Hersteller nennt einen Höhenbereich von 2.600–2.700 mm.',
    radkaesten: null,
    besonderheiten: [
      'Untere Ausprägung des Herstellerbereichs 2.600–2.700 mm',
      'Konkrete lichte Höhe vor Einsatz bestätigen'
    ],
    quelle: { text: 'KRONE Profi Liner Datenblatt', ref: '[4]' }
  },
  {
    id: 'krone_profi_liner_2700',
    name: 'KRONE Profi Liner · 2,70 m',
    kategorie: 'sattel',
    aufbau: 'KRONE Profi Liner · Standard-Curtainsider, obere Höhenausprägung',
    l: 13620, b: 2480, h: 2700,
    nutzlast: 33060,
    nutzlastHinweis: 'Technisch mögliche Trailer-Nutzlast laut Datenblatt.',
    palettenplaetze: null,
    status: 'richtwert',
    richtwertGrund: 'Der Hersteller nennt einen Höhenbereich von 2.600–2.700 mm.',
    radkaesten: null,
    besonderheiten: [
      'Obere Ausprägung des Herstellerbereichs 2.600–2.700 mm',
      'Konkrete lichte Höhe vor Einsatz bestätigen'
    ],
    quelle: { text: 'KRONE Profi Liner Datenblatt', ref: '[4]' }
  },
  {
    id: 'krone_mega_liner_3000',
    name: 'KRONE Mega Liner · 3,00 m',
    kategorie: 'sattel',
    aufbau: 'KRONE Mega Liner SDP 27 eLMG-CS · Mega-Curtainsider',
    l: 13620, b: 2480, h: 3000,
    nutzlast: 32100,
    nutzlastHinweis: 'Technisch mögliche Trailer-Nutzlast laut Datenblatt.',
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: null,
    durchladehoehe: 2860,
    besonderheiten: [
      'Seitliche Durchladehöhe nur 2.860 mm',
      'Innenhöhe und Öffnungshöhe getrennt betrachten'
    ],
    quelle: { text: 'KRONE Mega Liner Datenblatt', ref: '[5]' }
  },

  /* ---------------- Wechselsysteme ---------------- */
  {
    id: 'krone_wp73_ls5_cs',
    name: 'KRONE WP 7,3 · Wechselpritsche',
    kategorie: 'wechsel',
    aufbau: 'KRONE WP 7,3 LS5-CS · Wechselpritsche mit Planenaufbau',
    l: 7280, b: 2480, h: 2390,
    nutzlast: null,
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: null,
    besonderheiten: [
      'Planenaufbau auf Wechselpritsche',
      'Zulässiges Gesamtgewicht und Eigengewicht sind publiziert, eine Nutzlast nicht'
    ],
    quelle: { text: 'KRONE Wechselpritsche WP 7,3', ref: '[6]' }
  },
  {
    id: 'krone_wk73_stg',
    name: 'KRONE WK 7,3 · Wechselkoffer',
    kategorie: 'wechsel',
    aufbau: 'KRONE WK 7,3 STG · Wechselkoffer / Dry Box',
    l: 7300, b: 2470, h: 2525,
    nutzlast: null,
    palettenplaetze: null,
    status: 'konkret',
    radkaesten: null,
    portalhoehe: 2450,
    besonderheiten: [
      'Portalhöhe 2.450 mm — nicht mit der Innenhöhe gleichsetzen',
      'Keine Nutzlast als Herstellerwert veröffentlicht'
    ],
    quelle: { text: 'KRONE Wechselkoffer WK 7,3', ref: '[7]' }
  },

  /* ---------------- Sonderkonfiguration ---------------- */
  {
    id: 'frei',
    name: 'Freie Maße',
    kategorie: 'sonder',
    aufbau: 'Eigene Innenmaße eintragen',
    l: 13600, b: 2440, h: 3000,
    nutzlast: null,
    palettenplaetze: null,
    status: 'frei',
    radkaesten: null,
    besonderheiten: ['Jedes reale Fahrzeug lässt sich hier unabhängig von den Vorlagen abbilden'],
    quelle: null
  }
]

/**
 * Nicht modellierbar mit einer einzigen rechteckigen Ladefläche.
 * Erscheint in der Bibliothek, ist aber bewusst nicht wählbar.
 */
export const NICHT_UNTERSTUETZT = [
  {
    name: 'Jumbo / Volumenzug',
    grund: 'Motorwagen und Anhänger sind zwei getrennte Ladeflächen'
  }
]

/** Alte Vorlagen-IDs der ersten Fassung auf die recherchierten Nachfolger abbilden */
export const ALTE_IDS = {
  mega: 'krone_mega_liner_3000',
  std: 'krone_profi_liner_2700',
  wb: 'krone_wp73_ls5_cs',
  custom: 'frei'
}

export const fahrzeugOf = id => FAHRZEUGE.find(f => f.id === id) || null
export const fahrzeugeDerKategorie = kat => FAHRZEUGE.filter(f => f.kategorie === kat)
