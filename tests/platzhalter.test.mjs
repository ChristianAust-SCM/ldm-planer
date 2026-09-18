import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Geruest-Tests. Die eigentliche Testmatrix (Stapelfaktor, Hoehenbegrenzung,
// Ausrichtungen, mehrere Fahrzeuge, Restkapazitaet, Gewicht, Nutzlast) folgt
// mit dem Rechenkern aus der Referenzfassung.

test('Beispieldaten sind vollstaendig und plausibel', async () => {
  const { ladungstraeger } = JSON.parse(await readFile(new URL('../data/beispiel-ladungstraeger.json', import.meta.url)))
  assert.ok(ladungstraeger.length > 0)
  const ids = new Set()
  for (const lt of ladungstraeger) {
    for (const feld of ['id', 'bezeichnung', 'laenge_mm', 'breite_mm', 'hoehe_mm', 'stapelfaktor_max']) {
      assert.ok(lt[feld] !== undefined, `${lt.id}: ${feld} fehlt`)
    }
    assert.ok(lt.laenge_mm > 0 && lt.breite_mm > 0 && lt.hoehe_mm > 0, `${lt.id}: ungueltige Masse`)
    assert.ok(lt.stapelfaktor_max >= 1, `${lt.id}: Stapelfaktor < 1`)
    assert.ok(!ids.has(lt.id), `doppelte ID: ${lt.id}`)
    ids.add(lt.id)
  }
})

test('Beispieldaten enthalten keine kundenspezifischen Bezeichnungen', async () => {
  const roh = await readFile(new URL('../data/beispiel-ladungstraeger.json', import.meta.url), 'utf8')
  assert.equal(/montaplast/i.test(roh), false)
})

test('Fahrzeugvorlagen sind plausibel', async () => {
  const { fahrzeuge } = JSON.parse(await readFile(new URL('../data/fahrzeugvorlagen.json', import.meta.url)))
  assert.ok(fahrzeuge.some(f => f.id === 'frei'))
  for (const f of fahrzeuge.filter(f => f.id !== 'frei')) {
    assert.ok(f.innenlaenge_mm > 0 && f.innenbreite_mm > 0 && f.innenhoehe_mm > 0, `${f.id}: ungueltige Innenmasse`)
  }
})
