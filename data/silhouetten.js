/*
 * Zuordnung Fahrzeugvorlage → CA-Silhouette.
 *
 * Bewusst getrennt von `fahrzeuge.js`: die dortigen Fachdaten (Maße, Nutzlast,
 * Status, Quellen) bleiben unberührt, hier steht ausschließlich Darstellung.
 *
 * Die Silhouetten sind eigene, markenneutrale Piktogramme unter
 * `assets/vehicles/` — keine Nachbildung konkreter Modelle, keine
 * Herstellermerkmale, keine externen Ressourcen.
 */

export const SILHOUETTEN = {
  van:          { datei: 'van.svg',          name: 'Kastenwagen' },
  'curtain-van':{ datei: 'curtain-van.svg',  name: 'Planensprinter' },
  'box-truck':  { datei: 'box-truck.svg',    name: 'Koffer-LKW' },
  curtainsider: { datei: 'curtainsider.svg', name: 'Sattelauflieger' },
  'mega-trailer': { datei: 'mega-trailer.svg', name: 'Mega-Sattelauflieger' },
  'swap-body':  { datei: 'swap-body.svg',    name: 'Wechselsystem' },
  generic:      { datei: 'generic.svg',      name: 'Freie Ladefläche' }
}

/** Vorlagen-ID → Grundtyp. Mehrere Vorlagen teilen sich denselben Typ. */
export const TYP_JE_VORLAGE = {
  sprinter_schutz_m6_plane_2000:  'curtain-van',
  sprinter_schutz_ta6_plane_2000: 'curtain-van',
  sprinter_schutz_ta4_plane_2000: 'curtain-van',
  transit_l3h3_fwd_srw:           'van',
  transit_l4h3_rwd_awd:           'van',
  spier_aerobox_sprinter_35t:     'box-truck',
  atego_818_spier_athlet_plus:    'box-truck',
  atego_1224_spier_athlet:        'box-truck',
  man_tgm_18290_spier_thermo:     'box-truck',
  krone_profi_liner_2600:         'curtainsider',
  krone_profi_liner_2700:         'curtainsider',
  krone_mega_liner_3000:          'mega-trailer',
  krone_wp73_ls5_cs:              'swap-body',
  krone_wk73_stg:                 'swap-body',
  frei:                           'generic'
}

export const PFAD = 'assets/vehicles/'

/** Liefert den Grundtyp einer Vorlage; ohne Zuordnung die neutrale Ladefläche. */
export const typFuer = id => TYP_JE_VORLAGE[id] || 'generic'

/** Pfad zur Silhouettendatei einer Vorlage. */
export function silhouetteFuer(id) {
  const typ = typFuer(id)
  return PFAD + (SILHOUETTEN[typ] || SILHOUETTEN.generic).datei
}
