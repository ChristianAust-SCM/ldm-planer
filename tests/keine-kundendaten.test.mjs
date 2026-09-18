import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

/*
 * Schutzschild gegen kundenspezifische Rückstände aus der Ursprungsfassung.
 * Die Suchbegriffe sind zusammengesetzt, damit diese Datei nicht selbst anschlägt.
 */

const WURZEL = new URL('..', import.meta.url).pathname
const UEBERSPRINGEN = new Set(['.git', 'node_modules', '.DS_Store'])
const TEXT = new Set(['.js', '.mjs', '.html', '.css', '.json', '.md', '.csv', '.txt', ''])

const KUNDE = 'monta' + 'plast'
const VERBOTEN = [
  { muster: new RegExp(KUNDE, 'i'), grund: 'Kundenname' },
  { muster: /129\s*Ladungsträgernummern/i, grund: 'abgeleitete Angabe aus dem Kundenstamm' },
  { muster: /59\s*(echte\s*)?Maß(varianten|-Stapel)/i, grund: 'abgeleitete Angabe aus dem Kundenstamm' },
  { muster: /38\s*Grundflächen/i, grund: 'abgeleitete Angabe aus dem Kundenstamm' },
  { muster: /Blatt\s*"?Stamm"?/i, grund: 'Verweis auf die Kundenquelldatei' },
  { muster: /Ladungsplanung\s+Automotive/i, grund: 'kundenspezifischer Untertitel' }
]

/* Sehr eigene IDs aus dem Ursprungskatalog — dürfen nirgends auftauchen. */
const KATALOG_IDS = [
  'Pal' + 'Ger', 'Pal' + 'Oft', 'Pal' + 'ET',
  '1616' + '95', '6766' + '2', '1617' + '01',
  '6513' + '15', '6080' + '42', '16014' + '82'
]

async function dateien(dir) {
  const raus = []
  for (const name of await readdir(dir)) {
    if (UEBERSPRINGEN.has(name)) continue
    const pfad = join(dir, name)
    const s = await stat(pfad)
    if (s.isDirectory()) raus.push(...await dateien(pfad))
    else if (TEXT.has(extname(name))) raus.push(pfad)
  }
  return raus
}

test('keine kundenspezifischen Bezeichnungen oder Angaben im Projekt', async () => {
  const treffer = []
  for (const pfad of await dateien(WURZEL)) {
    const inhalt = await readFile(pfad, 'utf8')
    for (const { muster, grund } of VERBOTEN) {
      if (muster.test(inhalt)) treffer.push(`${pfad.replace(WURZEL, '')}: ${grund} (${muster})`)
    }
  }
  assert.deepEqual(treffer, [], 'Kundenspezifische Inhalte gefunden:\n' + treffer.join('\n'))
})

test('keine IDs aus dem ursprünglichen Kundenkatalog', async () => {
  const treffer = []
  for (const pfad of await dateien(WURZEL)) {
    const inhalt = await readFile(pfad, 'utf8')
    for (const id of KATALOG_IDS) {
      if (inhalt.includes(id)) treffer.push(`${pfad.replace(WURZEL, '')}: „${id}“`)
    }
  }
  assert.deepEqual(treffer, [], 'Katalog-IDs gefunden:\n' + treffer.join('\n'))
})

test('kein eingebetteter Ladungsträgerkatalog im Quelltext', async () => {
  /* Muster der Ursprungsfassung: ['1234',1200,1000,1000,3] — viele davon hintereinander */
  const katalogMuster = /\[\s*'[^']{1,10}'\s*,\s*\d{2,5}\s*,\s*\d{2,5}\s*,\s*\d{2,5}\s*,\s*\d{1,2}\s*\]/g
  for (const pfad of await dateien(WURZEL)) {
    const inhalt = await readFile(pfad, 'utf8')
    const n = (inhalt.match(katalogMuster) || []).length
    assert.ok(n < 10, `${pfad.replace(WURZEL, '')}: ${n} katalogartige Einträge – sieht nach eingebettetem Stammdatenkatalog aus`)
  }
})

test('Beispieldaten sind generisch', async () => {
  const { BEISPIEL_LADUNGSTRAEGER } = await import('../data/beispieldaten.js')
  const erlaubt = /palette|gitterbox|behälter|kleinladungsträger|box/i
  for (const e of BEISPIEL_LADUNGSTRAEGER) {
    assert.match(e.bezeichnung, erlaubt, `„${e.bezeichnung}“ wirkt nicht generisch`)
    assert.match(e.id, /^[A-Z]{2,4}-\d{2}$/, `ID „${e.id}“ folgt nicht dem neutralen Schema`)
  }
})

test('keine Secrets oder Tokens im Projekt', async () => {
  const muster = [/gh[pousr]_[A-Za-z0-9]{16,}/, /sk-[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/]
  const treffer = []
  for (const pfad of await dateien(WURZEL)) {
    const inhalt = await readFile(pfad, 'utf8')
    for (const m of muster) if (m.test(inhalt)) treffer.push(pfad.replace(WURZEL, ''))
  }
  assert.deepEqual(treffer, [])
})
