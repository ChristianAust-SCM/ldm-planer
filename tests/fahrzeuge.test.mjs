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
