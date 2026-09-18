import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zahl, pruefeEintrag, pruefeListe } from '../js/validate.js'
import { leseCsv, wendeAn, schreibeCsv, ordneZu, erkenneTrennzeichen } from '../js/import-csv.js'
import * as M from '../js/masterdata.js'
import { BEISPIEL_LADUNGSTRAEGER, FAHRZEUGVORLAGEN } from '../data/beispieldaten.js'

const gut = { id: 'A-1', bezeichnung: 'Palette', laenge_mm: 1200, breite_mm: 800, hoehe_mm: 1000, gewicht_kg: 400, stapelfaktor_max: 2 }

/* ---------------- Zahlen ---------------- */

test('Zahlformate deutsch und englisch', () => {
  assert.equal(zahl('1.200'), 1200)
  assert.equal(zahl('1.200,5'), 1200.5)
  assert.equal(zahl('1200.5'), 1200.5)
  assert.equal(zahl('12,5'), 12.5)
  assert.equal(zahl(' 800 '), 800)
  assert.equal(zahl(1200), 1200)
  assert.ok(Number.isNaN(zahl('x')))
  assert.ok(Number.isNaN(zahl('')))
})

/* ---------------- Validierung ---------------- */

test('gültiger Eintrag wird normalisiert', () => {
  const r = pruefeEintrag({ ...gut, laenge_mm: '1.200', gewicht_kg: '400,5' })
  assert.equal(r.ok, true)
  assert.equal(r.wert.laenge_mm, 1200)
  assert.equal(r.wert.gewicht_kg, 400.5)
  assert.equal(r.wert.kategorie, '')
})

test('Pflichtfelder werden erzwungen', () => {
  const r = pruefeEintrag({ bezeichnung: '', laenge_mm: '', breite_mm: '', hoehe_mm: '', stapelfaktor_max: '' })
  assert.equal(r.ok, false)
  assert.ok(r.fehler.some(f => /ID fehlt/.test(f)))
  assert.ok(r.fehler.some(f => /Bezeichnung fehlt/.test(f)))
  assert.ok(r.fehler.some(f => /Stapelfaktor fehlt/.test(f)))
})

test('ungültige Maße werden abgelehnt', () => {
  assert.equal(pruefeEintrag({ ...gut, laenge_mm: 0 }).ok, false)
  assert.equal(pruefeEintrag({ ...gut, breite_mm: -5 }).ok, false)
  assert.equal(pruefeEintrag({ ...gut, hoehe_mm: 'abc' }).ok, false)
  const zuGross = pruefeEintrag({ ...gut, laenge_mm: 99000 })
  assert.equal(zuGross.ok, false)
  assert.ok(zuGross.fehler.some(f => /Einheit prüfen/.test(f)))
})

test('Stapelfaktor kleiner 1 wird abgelehnt', () => {
  const r = pruefeEintrag({ ...gut, stapelfaktor_max: 0 })
  assert.equal(r.ok, false)
  assert.ok(r.fehler.some(f => /mindestens 1/.test(f)))
  assert.equal(pruefeEintrag({ ...gut, stapelfaktor_max: 2.5 }).ok, false)
  assert.equal(pruefeEintrag({ ...gut, stapelfaktor_max: 1 }).ok, true)
})

test('negatives Gewicht wird abgelehnt, fehlendes Gewicht ist 0', () => {
  assert.equal(pruefeEintrag({ ...gut, gewicht_kg: -1 }).ok, false)
  const r = pruefeEintrag({ ...gut, gewicht_kg: '' })
  assert.equal(r.ok, true)
  assert.equal(r.wert.gewicht_kg, 0)
})

test('doppelte IDs werden erkannt – in der Liste und gegen den Bestand', () => {
  const r = pruefeListe([gut, { ...gut, bezeichnung: 'Dublette' }])
  assert.equal(r.gueltig.length, 1)
  assert.equal(r.abgelehnt.length, 1)
  assert.match(r.abgelehnt[0].fehler[0], /doppelt/)

  const gegenBestand = pruefeListe([gut], { bestand: [gut] })
  assert.equal(gegenBestand.gueltig.length, 0)
})

/* ---------------- CSV ---------------- */

test('Trennzeichen werden erkannt', () => {
  assert.equal(erkenneTrennzeichen('a;b;c\n1;2;3'), ';')
  assert.equal(erkenneTrennzeichen('a,b,c\n1,2,3'), ',')
  assert.equal(erkenneTrennzeichen('a\tb\tc'), '\t')
})

test('Kopfzeile wird gemappt, auch mit Synonymen und Umlauten', () => {
  const z = ordneZu(['Nummer', 'Benennung', 'Länge (mm)', 'Breite', 'Höhe', 'Gewicht kg', 'Stapelbarkeit'])
  assert.equal(z.id, 0)
  assert.equal(z.bezeichnung, 1)
  assert.equal(z.laenge_mm, 2)
  assert.equal(z.breite_mm, 3)
  assert.equal(z.hoehe_mm, 4)
  assert.equal(z.gewicht_kg, 5)
  assert.equal(z.stapelfaktor_max, 6)
})

test('CSV-Import inklusive Anführungszeichen, BOM und deutschem Zahlformat', () => {
  const csv = '﻿id;bezeichnung;laenge_mm;breite_mm;hoehe_mm;gewicht_kg;stapelfaktor_max\r\n'
    + 'A-1;"Box, groß";1.200;1000;1050;500;2\r\n'
    + 'A-2;Box klein;600;400;280;25;5\r\n'
  const g = leseCsv(csv)
  assert.equal(g.kopfErkannt, true)
  assert.equal(g.zeilen.length, 2)
  const pr = pruefeListe(wendeAn(g.zeilen, g.zuordnung))
  assert.equal(pr.abgelehnt.length, 0)
  assert.equal(pr.gueltig[0].bezeichnung, 'Box, groß')
  assert.equal(pr.gueltig[0].laenge_mm, 1200)
})

test('CSV ohne Kopfzeile wird als Daten behandelt', () => {
  const g = leseCsv('A-1;Box;1200;800;1000;400;2')
  assert.equal(g.kopfErkannt, false)
  assert.equal(g.zeilen.length, 1)
})

test('fehlerhafte Zeilen landen im Ablehnungsbericht, gute werden übernommen', () => {
  const csv = 'id;bezeichnung;laenge_mm;breite_mm;hoehe_mm;stapelfaktor_max\n'
    + 'OK-1;gut;1200;800;1000;2\n'
    + 'BAD-1;schlecht;0;800;1000;2\n'
    + 'OK-1;dublette;1200;800;1000;2\n'
  const g = leseCsv(csv)
  const pr = pruefeListe(wendeAn(g.zeilen, g.zuordnung))
  assert.equal(pr.gueltig.length, 1)
  assert.equal(pr.abgelehnt.length, 2)
})

test('CSV-Export und erneuter Import ergeben dieselben Daten', () => {
  const original = pruefeListe(BEISPIEL_LADUNGSTRAEGER).gueltig
  const csv = schreibeCsv(original)
  const g = leseCsv(csv)
  const zurueck = pruefeListe(wendeAn(g.zeilen, g.zuordnung))
  assert.equal(zurueck.abgelehnt.length, 0)
  assert.deepEqual(zurueck.gueltig, original)
})

/* ---------------- Stammdaten und Varianten ---------------- */

test('Varianten bündeln identische Maße und Stapelfaktoren', () => {
  M.setzeBestand([
    { ...gut, id: 'X-1' },
    { ...gut, id: 'X-2' },                                  // identisch -> gleiche Variante
    { ...gut, id: 'X-3', hoehe_mm: 1500 }                   // andere Höhe -> eigene Variante
  ])
  const v = M.varianten()
  assert.equal(v.length, 2)
  assert.equal(M.varVonId('X-1').key, M.varVonId('X-2').key)
  assert.notEqual(M.varVonId('X-1').key, M.varVonId('X-3').key)
  assert.deepEqual(M.varVonId('X-1').ids, ['X-1', 'X-2'])
})

test('Kennzahlen kommen aus dem Bestand, nicht aus fest verdrahteten Zahlen', () => {
  M.setzeBestand(BEISPIEL_LADUNGSTRAEGER)
  const k = M.kennzahlen()
  assert.equal(k.eintraege, BEISPIEL_LADUNGSTRAEGER.length)
  assert.ok(k.varianten > 0 && k.varianten <= k.eintraege)
  assert.ok(k.grundflaechen > 0)
  M.setzeBestand([])
  assert.deepEqual(M.kennzahlen(), { eintraege: 0, varianten: 0, grundflaechen: 0 })
})

test('Suche findet über ID, Bezeichnung und Maß', () => {
  M.setzeBestand(BEISPIEL_LADUNGSTRAEGER)
  assert.ok(M.treffer('GB-01').exakt)
  assert.ok(M.treffer('gitterbox'))
  assert.ok(M.treffer('1200x800'))
  assert.ok(M.treffer('1.200 × 800'))
  assert.equal(M.treffer('gibtsnicht'), null)
  assert.equal(M.treffer(''), null)
})

test('Variantengewicht mittelt und meldet Mischung', () => {
  M.setzeBestand([
    { ...gut, id: 'G-1', gewicht_kg: 100 },
    { ...gut, id: 'G-2', gewicht_kg: 300 }
  ])
  const v = M.varVonId('G-1')
  assert.equal(v.gewicht, 200)
  assert.equal(v.gewichtGemischt, true)
})

test('Löschen und Aktualisieren pflegen die Varianten nach', () => {
  M.setzeBestand([{ ...gut, id: 'D-1' }, { ...gut, id: 'D-2', hoehe_mm: 2000 }])
  assert.equal(M.varianten().length, 2)
  M.entferne('D-2')
  assert.equal(M.varianten().length, 1)
  M.aktualisiere('D-1', { hoehe_mm: 500 })
  assert.equal(M.varVonId('D-1').h, 500)
})

/* ---------------- Mitgelieferte Daten ---------------- */

test('Beispieldaten sind vollständig, eindeutig und plausibel', () => {
  const pr = pruefeListe(BEISPIEL_LADUNGSTRAEGER)
  assert.equal(pr.abgelehnt.length, 0, JSON.stringify(pr.abgelehnt))
  assert.equal(pr.gueltig.length, BEISPIEL_LADUNGSTRAEGER.length)
})

test('Fahrzeugvorlagen sind plausibel und enthalten freie Maße', () => {
  assert.ok(FAHRZEUGVORLAGEN.some(f => f.id === 'custom'))
  for (const f of FAHRZEUGVORLAGEN) {
    assert.ok(f.l > 0 && f.b > 0 && f.h > 0, `${f.id}: ungültige Innenmaße`)
    assert.ok(f.nutzlast >= 0)
  }
})
