import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FAHRZEUGE, KATEGORIEN, NICHT_UNTERSTUETZT, ALTE_IDS, fahrzeugOf } from '../data/fahrzeuge.js'
import { planen } from '../js/ldm-core.js'

const vorlagen = () => FAHRZEUGE.filter(f => f.id !== 'frei')

test('14 recherchierte Vorlagen plus freie Maße', () => {
  assert.equal(vorlagen().length, 14)
  assert.ok(fahrzeugOf('frei'), 'Freie Maße bleiben erhalten')
})

test('jede Vorlage hat plausible Innenmaße und eine Kategorie', () => {
  const katIds = new Set(KATEGORIEN.map(k => k.id))
  for (const f of FAHRZEUGE) {
    assert.ok(f.l > 0 && f.b > 0 && f.h > 0, `${f.id}: ungültige Maße`)
    assert.ok(katIds.has(f.kategorie), `${f.id}: unbekannte Kategorie ${f.kategorie}`)
    assert.ok(f.name && f.aufbau, `${f.id}: Name oder Aufbau fehlt`)
  }
})

test('IDs sind eindeutig, Namen ebenfalls — keine Dubletten', () => {
  const ids = FAHRZEUGE.map(f => f.id)
  const namen = FAHRZEUGE.map(f => f.name)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(namen).size, namen.length)
})

test('keine Vorlage aus der ersten Fassung ist übrig geblieben', () => {
  for (const alt of ['mega', 'std', 'wb', 'custom']) {
    assert.equal(fahrzeugOf(alt), null, `alte Vorlage ${alt} existiert noch`)
  }
  /* und die Nachfolger sind erreichbar */
  for (const [alt, neu] of Object.entries(ALTE_IDS)) {
    assert.ok(fahrzeugOf(neu), `Nachfolger von ${alt} fehlt: ${neu}`)
  }
})

test('keine Dubletten derselben Vorlage unter anderem Namen', () => {
  /* Gleiche Geometrie ist erlaubt (M6 und TA6), gleicher Aufbau nicht */
  const aufbauten = vorlagen().map(f => f.aufbau)
  assert.equal(new Set(aufbauten).size, aufbauten.length)
})

/* ---------------- Planensprinter ---------------- */

test('Planensprinter M6: konkrete Vorlage, ebener Boden, keine Radkästen', () => {
  const f = fahrzeugOf('sprinter_schutz_m6_plane_2000')
  assert.deepEqual([f.l, f.b, f.h], [4300, 2030, 2000])
  assert.equal(f.status, 'konkret')
  assert.equal(f.radkaesten, false)
  assert.equal(f.nutzlast, null)
  assert.equal(f.palettenplaetze, null)
  assert.equal(f.kategorie, 'transporter')
})

test('Planensprinter TA6: Richtwert mit Radkästen', () => {
  const f = fahrzeugOf('sprinter_schutz_ta6_plane_2000')
  assert.deepEqual([f.l, f.b, f.h], [4300, 2030, 2000])
  assert.equal(f.status, 'richtwert')
  assert.equal(f.radkaesten, true)
  assert.equal(f.nutzlast, null)
  assert.equal(f.palettenplaetze, null)
})

test('Planensprinter TA4: kompakt, Richtwert mit Radkästen', () => {
  const f = fahrzeugOf('sprinter_schutz_ta4_plane_2000')
  assert.deepEqual([f.l, f.b, f.h], [3480, 2030, 2000])
  assert.equal(f.status, 'richtwert')
  assert.equal(f.radkaesten, true)
  assert.equal(f.nutzlast, null)
  assert.equal(f.palettenplaetze, null)
})

test('alle drei Planensprinter stehen in Transporter & Express', () => {
  const sprinter = FAHRZEUGE.filter(f => f.name.startsWith('Planensprinter'))
  assert.equal(sprinter.length, 3)
  for (const f of sprinter) assert.equal(f.kategorie, 'transporter')
})

/* ---------------- Keine Scheingenauigkeit ---------------- */

test('Nutzlast nur bei den vier belegten Konfigurationen', () => {
  const mit = vorlagen().filter(f => f.nutzlast !== null).map(f => f.id).sort()
  assert.deepEqual(mit, [
    'krone_mega_liner_3000',
    'krone_profi_liner_2600',
    'krone_profi_liner_2700',
    'spier_aerobox_sprinter_35t'
  ])
  assert.equal(fahrzeugOf('spier_aerobox_sprinter_35t').nutzlast, 940)
  assert.equal(fahrzeugOf('krone_mega_liner_3000').nutzlast, 32100)
  assert.equal(fahrzeugOf('krone_profi_liner_2600').nutzlast, 33060)
})

test('nicht belegte Nutzlast ist null, niemals 0', () => {
  for (const f of FAHRZEUGE) {
    assert.notEqual(f.nutzlast, 0, `${f.id}: 0 kg ist keine gültige Angabe`)
    if (f.nutzlast !== null) assert.ok(f.nutzlast > 0)
  }
})

test('Nutzlastangaben tragen ihren Gültigkeitshinweis', () => {
  for (const f of vorlagen().filter(x => x.nutzlast !== null)) {
    assert.ok(f.nutzlastHinweis, `${f.id}: Hinweis zur Nutzlast fehlt`)
  }
})

test('keine Palettenplätze — nirgends', () => {
  for (const f of FAHRZEUGE) assert.equal(f.palettenplaetze, null, `${f.id}`)
})

test('Richtwerte sind gekennzeichnet und begründet', () => {
  const richt = vorlagen().filter(f => f.status === 'richtwert').map(f => f.id).sort()
  assert.deepEqual(richt, [
    'krone_profi_liner_2600',
    'krone_profi_liner_2700',
    'sprinter_schutz_ta4_plane_2000',
    'sprinter_schutz_ta6_plane_2000',
    'transit_l4h3_rwd_awd'
  ])
  for (const f of vorlagen()) {
    assert.ok(['konkret', 'richtwert'].includes(f.status), `${f.id}: unklarer Status`)
    if (f.status === 'richtwert') assert.ok(f.richtwertGrund, `${f.id}: Begründung fehlt`)
  }
})

test('jede Vorlage nennt ihre Quelle, freie Maße nicht', () => {
  for (const f of vorlagen()) {
    assert.ok(f.quelle && f.quelle.text && f.quelle.ref, `${f.id}: Quelle fehlt`)
  }
  assert.equal(fahrzeugOf('frei').quelle, null)
})

/* ---------------- Verworfenes bleibt draußen ---------------- */

test('keine Technoplan-Vorlage', () => {
  const alles = JSON.stringify(FAHRZEUGE).toLowerCase()
  assert.equal(alles.includes('technoplan'), false)
})

test('kein Jumbo als einzelne rechteckige Vorlage', () => {
  for (const f of FAHRZEUGE) {
    assert.equal(/jumbo|volumenzug|gliederzug/i.test(f.name), false, `${f.id}: ${f.name}`)
  }
  assert.equal(NICHT_UNTERSTUETZT.length, 1)
  assert.match(NICHT_UNTERSTUETZT[0].name, /Jumbo/)
  assert.match(NICHT_UNTERSTUETZT[0].grund, /zwei getrennte Ladeflächen/)
})

test('keine generischen Tonnage-Vorlagen ohne konkrete Konfiguration', () => {
  for (const f of vorlagen()) {
    /* Eine Tonnageangabe ist erlaubt, aber nur mit Fahrgestell und Aufbau */
    if (/\d+(,\d+)?\s*t\b/i.test(f.name)) {
      assert.ok(/SPIER|Atego|Sprinter|MAN/i.test(f.name), `${f.id}: generische Tonnage-Vorlage`)
    }
  }
})

/* ---------------- Zusammenspiel mit dem Rechenkern ---------------- */

test('jede Vorlage lässt sich rechnen und liefert einen gültigen Plan', () => {
  for (const f of FAHRZEUGE) {
    const p = planen({
      positionen: [{ menge: 4, l: 1200, b: 800, h: 1000, stapel: 1, gewicht: 100, name: 'Palette' }],
      fahrzeug: { l: f.l, b: f.b, h: f.h, nutzlast: f.nutzlast || 0 }
    })
    assert.ok(p.lkw.length >= 1, `${f.id}: kein Plan`)
    for (const t of p.lkw) {
      assert.ok(t.belegt <= p.kapa + 1e-9, `${f.id}: Fahrzeug überfüllt`)
    }
  }
})

test('die Innenmaße des Abnahmefalls bleiben unabhängig von der Bibliothek gültig', () => {
  const p = planen({
    positionen: [
      { menge: 14, l: 1200, b: 1000, h: 1000, stapel: 3, gewicht: 88, name: 'Gitterbox' },
      { menge: 12, l: 1400, b: 800, h: 1000, stapel: 3, gewicht: 200, name: 'KLT 888' }
    ],
    fahrzeug: { l: 13600, b: 2440, h: 3000, nutzlast: 0 }
  })
  assert.equal(Math.round(p.gesamt * 100) / 100, 5.8)
  assert.equal(Math.round(p.ldm * 100) / 100, 4.37)
  assert.equal(p.gewicht, 3632)
})

/* ================================================================
 * Anzeigenamen (V1.1 UX) — die Fahrzeugdaten selbst bleiben unberührt
 * ================================================================ */

test('jede Vorlage hat einen nutzerorientierten und einen technischen Namen', () => {
  for (const f of FAHRZEUGE) {
    assert.ok(f.anzeige && f.anzeige.length > 3, `${f.id}: Anzeigename fehlt`)
    assert.ok(f.referenz && f.referenz.length > 3, `${f.id}: Referenzname fehlt`)
    assert.notEqual(f.anzeige, f.referenz, `${f.id}: beide Namen identisch`)
  }
  const anzeigen = FAHRZEUGE.map(f => f.anzeige)
  assert.equal(new Set(anzeigen).size, anzeigen.length, 'Anzeigenamen müssen unterscheidbar sein')
})

test('der Anzeigename nennt die Fahrzeugart, die Referenz den Hersteller', () => {
  assert.equal(fahrzeugOf('sprinter_schutz_m6_plane_2000').anzeige, 'Planensprinter · 4,30 m · ebener Boden')
  assert.match(fahrzeugOf('sprinter_schutz_m6_plane_2000').referenz, /Schutz M6/)
  assert.equal(fahrzeugOf('sprinter_schutz_ta6_plane_2000').anzeige, 'Planensprinter · 4,30 m · Tiefpritsche')
  assert.equal(fahrzeugOf('sprinter_schutz_ta4_plane_2000').anzeige, 'Planensprinter · 3,48 m · Tiefpritsche')
  assert.equal(fahrzeugOf('krone_mega_liner_3000').anzeige, 'Sattelauflieger · Mega · 3,00 m')
  assert.equal(fahrzeugOf('atego_818_spier_athlet_plus').anzeige, 'LKW Koffer · 7,5 t')
  assert.equal(fahrzeugOf('frei').anzeige, 'Freie Fahrzeugmaße')
  assert.equal(fahrzeugOf('frei').referenz, 'Eigene Innenmaße eingeben')
})

test('die Anzeigemaße stimmen mit den echten Maßen überein', () => {
  /* Steht im Namen eine Länge, muss sie zur Innenlänge passen */
  for (const f of FAHRZEUGE) {
    const m = f.anzeige.match(/(\d+),(\d{2}) m/)
    if (!m) continue
    const genannt = Number(`${m[1]}.${m[2]}`) * 1000
    const istLaenge = Math.abs(genannt - f.l) <= 10
    const istHoehe = Math.abs(genannt - f.h) <= 10
    assert.ok(istLaenge || istHoehe, `${f.id}: „${f.anzeige}" passt zu keinem Maß (${f.l}/${f.h})`)
  }
})

test('Planensprinter stehen in der Bibliothek vor den Kastenwagen', () => {
  const transporter = FAHRZEUGE.filter(f => f.kategorie === 'transporter').map(f => f.id)
  assert.deepEqual(transporter.slice(0, 3), [
    'sprinter_schutz_m6_plane_2000',
    'sprinter_schutz_ta6_plane_2000',
    'sprinter_schutz_ta4_plane_2000'
  ])
})

test('Kategorien tragen einen Kurznamen für die Filterleiste', () => {
  for (const k of KATEGORIEN) assert.ok(k.kurz, `${k.id}: Kurzname fehlt`)
  assert.equal(KATEGORIEN.find(k => k.id === 'lkw').kurz, 'LKW')
})

test('Fahrzeugdaten unverändert gegenüber dem Research-Stand', () => {
  /* Maße, Nutzlast, Status und Radkästen — die Referenztabelle des Reports */
  const soll = {
    transit_l3h3_fwd_srw:           [3533, 1784, 2125, null,  'konkret',   true],
    transit_l4h3_rwd_awd:           [4256, 1784, 2025, null,  'richtwert', true],
    sprinter_schutz_m6_plane_2000:  [4300, 2030, 2000, null,  'konkret',   false],
    sprinter_schutz_ta6_plane_2000: [4300, 2030, 2000, null,  'richtwert', true],
    sprinter_schutz_ta4_plane_2000: [3480, 2030, 2000, null,  'richtwert', true],
    spier_aerobox_sprinter_35t:     [4350, 2060, 2100, 940,   'konkret',   null],
    atego_818_spier_athlet_plus:    [6050, 2496, 2396, null,  'konkret',   null],
    atego_1224_spier_athlet:        [7200, 2496, 2369, null,  'konkret',   null],
    man_tgm_18290_spier_thermo:     [7650, 2490, 2400, null,  'konkret',   null],
    krone_profi_liner_2600:         [13620, 2480, 2600, 33060, 'richtwert', null],
    krone_profi_liner_2700:         [13620, 2480, 2700, 33060, 'richtwert', null],
    krone_mega_liner_3000:          [13620, 2480, 3000, 32100, 'konkret',   null],
    krone_wp73_ls5_cs:              [7280, 2480, 2390, null,  'konkret',   null],
    krone_wk73_stg:                 [7300, 2470, 2525, null,  'konkret',   null]
  }
  assert.equal(Object.keys(soll).length, 14)
  for (const [id, [l, b, h, nutzlast, status, radkaesten]] of Object.entries(soll)) {
    const f = fahrzeugOf(id)
    assert.ok(f, `${id} fehlt`)
    assert.deepEqual([f.l, f.b, f.h], [l, b, h], `${id}: Maße abweichend`)
    assert.equal(f.nutzlast, nutzlast, `${id}: Nutzlast abweichend`)
    assert.equal(f.status, status, `${id}: Status abweichend`)
    assert.equal(f.radkaesten, radkaesten, `${id}: Radkastenangabe abweichend`)
    assert.equal(f.palettenplaetze, null, `${id}: Palettenplätze gesetzt`)
  }
})
