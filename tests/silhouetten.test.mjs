import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SILHOUETTEN, TYP_JE_VORLAGE, typFuer, silhouetteFuer, PFAD } from '../data/silhouetten.js'
import { FAHRZEUGE, NICHT_UNTERSTUETZT } from '../data/fahrzeuge.js'

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)))
const ORDNER = join(WURZEL, 'assets', 'vehicles')
const lies = datei => readFile(join(ORDNER, datei), 'utf8')

test('sieben Grundtypen, jeder mit eigener Datei', async () => {
  const typen = Object.keys(SILHOUETTEN)
  assert.equal(typen.length, 7)
  const dateien = (await readdir(ORDNER)).filter(f => f.endsWith('.svg')).sort()
  assert.deepEqual(dateien, Object.values(SILHOUETTEN).map(s => s.datei).sort())
})

test('jede Fahrzeugvorlage hat genau einen Grundtyp', () => {
  for (const f of FAHRZEUGE) {
    const typ = TYP_JE_VORLAGE[f.id]
    assert.ok(typ, `${f.id}: keine Zuordnung`)
    assert.ok(SILHOUETTEN[typ], `${f.id}: unbekannter Typ ${typ}`)
  }
  assert.equal(Object.keys(TYP_JE_VORLAGE).length, FAHRZEUGE.length)
})

test('die Zuordnung entspricht der fachlichen Vorgabe', () => {
  assert.equal(typFuer('sprinter_schutz_m6_plane_2000'), 'curtain-van')
  assert.equal(typFuer('sprinter_schutz_ta6_plane_2000'), 'curtain-van')
  assert.equal(typFuer('sprinter_schutz_ta4_plane_2000'), 'curtain-van')
  assert.equal(typFuer('transit_l3h3_fwd_srw'), 'van')
  assert.equal(typFuer('transit_l4h3_rwd_awd'), 'van')
  for (const id of ['spier_aerobox_sprinter_35t', 'atego_818_spier_athlet_plus', 'atego_1224_spier_athlet', 'man_tgm_18290_spier_thermo']) {
    assert.equal(typFuer(id), 'box-truck', id)
  }
  assert.equal(typFuer('krone_profi_liner_2600'), 'curtainsider')
  assert.equal(typFuer('krone_profi_liner_2700'), 'curtainsider')
  assert.equal(typFuer('krone_mega_liner_3000'), 'mega-trailer')
  assert.equal(typFuer('krone_wp73_ls5_cs'), 'swap-body')
  assert.equal(typFuer('krone_wk73_stg'), 'swap-body')
  assert.equal(typFuer('frei'), 'generic')
})

test('alle drei Planensprinter teilen denselben Grundtyp', () => {
  const sprinter = FAHRZEUGE.filter(f => f.anzeige.startsWith('Planensprinter')).map(f => typFuer(f.id))
  assert.equal(sprinter.length, 3)
  assert.deepEqual([...new Set(sprinter)], ['curtain-van'])
})

test('Standard- und Mega-Auflieger sind verschiedene Silhouetten', () => {
  assert.notEqual(typFuer('krone_profi_liner_2700'), typFuer('krone_mega_liner_3000'))
})

test('Pfad zeigt auf eine vorhandene Datei', async () => {
  for (const f of FAHRZEUGE) {
    const pfad = silhouetteFuer(f.id)
    assert.ok(pfad.startsWith(PFAD), `${f.id}: ${pfad}`)
    const inhalt = await lies(pfad.slice(PFAD.length))
    assert.match(inhalt, /^<svg/, `${f.id}: keine SVG-Datei`)
  }
})

test('unbekannte Vorlage fällt auf die neutrale Ladefläche zurück', () => {
  assert.equal(typFuer('gibt-es-nicht'), 'generic')
  assert.equal(silhouetteFuer('gibt-es-nicht'), PFAD + 'generic.svg')
})

test('Jumbo bekommt keine Silhouette', () => {
  for (const x of NICHT_UNTERSTUETZT) {
    assert.equal(TYP_JE_VORLAGE[x.name], undefined)
  }
  const alles = JSON.stringify({ SILHOUETTEN, TYP_JE_VORLAGE }).toLowerCase()
  assert.equal(/jumbo|volumenzug|gliederzug/.test(alles), false)
})

/* ---------------- Inhalt der SVG-Dateien ---------------- */

const alleDateien = async () => {
  const namen = (await readdir(ORDNER)).filter(f => f.endsWith('.svg'))
  return Promise.all(namen.map(async n => [n, await lies(n)]))
}

test('keine Herstellernamen — weder im Dateinamen noch im Inhalt', async () => {
  const marken = ['mercedes', 'benz', 'sprinter', 'ford', 'transit', 'krone', 'spier', 'atego',
    'schutz', 'profi liner', 'mega liner', 'cargobull', 'schmitz', 'technoplan']
  for (const [name, inhalt] of await alleDateien()) {
    const text = (name + ' ' + inhalt).toLowerCase()
    for (const m of marken) {
      assert.equal(text.includes(m), false, `${name}: enthält „${m}"`)
    }
  }
})

test('keine externen Ressourcen und keine Rasterbilder', async () => {
  for (const [name, inhalt] of await alleDateien()) {
    assert.equal(/<image\b/i.test(inhalt), false, `${name}: eingebettetes Bild`)
    assert.equal(/https?:\/\/(?!www\.w3\.org)/i.test(inhalt), false, `${name}: externe URL`)
    assert.equal(/xlink:href|url\(["']?http/i.test(inhalt), false, `${name}: externe Referenz`)
    assert.equal(/data:image/i.test(inhalt), false, `${name}: eingebettete Rasterdaten`)
    assert.equal(/<script/i.test(inhalt), false, `${name}: Skript`)
  }
})

test('keine Schrift in den Silhouetten', async () => {
  for (const [name, inhalt] of await alleDateien()) {
    assert.equal(/<text\b|<tspan\b|font-family/i.test(inhalt), false, `${name}: enthält Schrift`)
  }
})

test('nur die Farben des CA-Systems', async () => {
  const erlaubt = new Set(['#0D1B2A', '#EAEEF2', '#C2CCD6', '#E87722'])
  for (const [name, inhalt] of await alleDateien()) {
    for (const farbe of inhalt.match(/#[0-9a-fA-F]{3,6}/g) || []) {
      assert.ok(erlaubt.has(farbe.toUpperCase()), `${name}: unerwartete Farbe ${farbe}`)
    }
  }
})

test('jede Silhouette ist dekorativ ausgezeichnet und skaliert', async () => {
  for (const [name, inhalt] of await alleDateien()) {
    assert.match(inhalt, /viewBox="0 0 160 100"/, `${name}: abweichendes Raster`)
    assert.match(inhalt, /role="presentation"/, `${name}: nicht als dekorativ markiert`)
    assert.match(inhalt, /focusable="false"/, `${name}: fokussierbar`)
    assert.equal(/\swidth="\d/.test(inhalt), false, `${name}: feste Breite verhindert Skalierung`)
  }
})

test('jede Silhouette markiert die Ladefläche in Orange', async () => {
  for (const [name, inhalt] of await alleDateien()) {
    assert.ok(inhalt.includes('#E87722'), `${name}: kein Ladeflächen-Akzent`)
  }
})

test('die Dateinamen bleiben typbezogen, nicht herstellerbezogen', async () => {
  const namen = (await readdir(ORDNER)).filter(f => f.endsWith('.svg'))
  for (const n of namen) {
    assert.match(n, /^[a-z-]+\.svg$/, `${n}: unerwarteter Dateiname`)
  }
})
