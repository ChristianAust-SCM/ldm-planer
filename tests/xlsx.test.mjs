import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { leseXlsxZeilen, spalteZuIndex, xlsxUnterstuetzt } from '../js/xlsx-reader.js'
import { ausZeilen, wendeAn } from '../js/import-csv.js'
import { pruefeListe } from '../js/validate.js'

const datei = async () => {
  const b = await readFile(new URL('fixtures/stammdaten-beispiel.xlsx', import.meta.url))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

test('die Laufzeit kann Deflate entpacken', () => {
  assert.equal(xlsxUnterstuetzt(), true)
})

test('Spaltenbuchstaben werden zu Indizes', () => {
  assert.equal(spalteZuIndex('A1'), 0)
  assert.equal(spalteZuIndex('B2'), 1)
  assert.equal(spalteZuIndex('Z9'), 25)
  assert.equal(spalteZuIndex('AA1'), 26)
  assert.equal(spalteZuIndex('AB10'), 27)
})

test('XLSX wird gelesen: gemeinsame Texte, Inline-Text, Zahlen', async () => {
  const zeilen = await leseXlsxZeilen(await datei())
  assert.equal(zeilen.length, 4, 'Kopfzeile und drei Datenzeilen')
  assert.deepEqual(zeilen[0], ['Nummer', 'Benennung', 'Länge (mm)', 'Breite', 'Höhe', 'Gewicht kg', 'Stapelbarkeit'])
  assert.deepEqual(zeilen[1], ['XL-01', 'Gitterbox aus Excel', '1240', '835', '970', '700', '3'])
})

test('Sonderzeichen und Kommas in Zellen bleiben erhalten', async () => {
  const zeilen = await leseXlsxZeilen(await datei())
  assert.equal(zeilen[2][1], 'Palette, groß')
  assert.equal(zeilen[3][1], 'Behälter & Deckel', 'XML-Entities werden aufgelöst')
})

test('Lücken in einer Zeile verschieben die Spalten nicht', async () => {
  const zeilen = await leseXlsxZeilen(await datei())
  /* In der dritten Datenzeile fehlt das Gewicht (Spalte F), G steht trotzdem richtig */
  assert.equal(zeilen[3][0], 'XL-03')
  assert.equal(zeilen[3][5], '', 'Gewicht bleibt leer')
  assert.equal(zeilen[3][6], '5', 'Stapelfaktor rutscht nicht nach vorn')
})

test('XLSX und CSV laufen in dieselbe Zuordnung', async () => {
  const gelesen = ausZeilen(await leseXlsxZeilen(await datei()))
  assert.equal(gelesen.kopfErkannt, true)
  assert.equal(gelesen.zeilen.length, 3)
  assert.equal(gelesen.zuordnung.id, 0)
  assert.equal(gelesen.zuordnung.bezeichnung, 1)
  assert.equal(gelesen.zuordnung.stapelfaktor_max, 6)

  const pr = pruefeListe(wendeAn(gelesen.zeilen, gelesen.zuordnung))
  assert.equal(pr.abgelehnt.length, 0, JSON.stringify(pr.abgelehnt))
  assert.equal(pr.gueltig.length, 3)
  assert.equal(pr.gueltig[0].laenge_mm, 1240)
  assert.equal(pr.gueltig[2].gewicht_kg, 0, 'fehlendes Gewicht wird zu 0')
})

test('beide ZIP-Verfahren werden unterstützt', async () => {
  /* Die Testdatei legt sharedStrings.xml unkomprimiert ab, das Blatt komprimiert. */
  const zeilen = await leseXlsxZeilen(await datei())
  assert.ok(zeilen[0][0].length > 0, 'unkomprimierter Eintrag gelesen')
  assert.ok(zeilen[1][2].length > 0, 'komprimierter Eintrag gelesen')
})

test('kaputte Dateien melden einen verständlichen Fehler', async () => {
  const muell = new TextEncoder().encode('das ist kein ZIP-Archiv').buffer
  await assert.rejects(() => leseXlsxZeilen(muell), /Keine gültige XLSX-Datei/)
})
