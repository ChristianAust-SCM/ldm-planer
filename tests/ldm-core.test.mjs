import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planen, ausrichtung, stapelText, restText } from '../js/ldm-core.js'

const MEGA = { l: 13600, b: 2440, h: 3000, nutzlast: 0 }
const pos = (o = {}) => ({ menge: 1, l: 1200, b: 1000, h: 1000, stapel: 3, gewicht: 0, name: 'T', ...o })

test('leerer Start: keine Fahrzeuge, keine Fehler', () => {
  const p = planen({ positionen: [], fahrzeug: MEGA })
  assert.equal(p.lkw.length, 0)
  assert.equal(p.gesamt, 0)
  assert.equal(p.stueck, 0)
  assert.equal(p.gewicht, 0)
  assert.deepEqual(p.hinweise, [])
})

test('Ausrichtung wählt die kürzere Ladelänge', () => {
  // 1200x1000 bei 2440 Innenbreite: 1200 quer -> 2 je Reihe, 1000 tief
  const a = ausrichtung(1200, 1000, 2440, 10)
  assert.equal(a.quer, 1200)
  assert.equal(a.proReihe, 2)
  assert.equal(a.reihen, 5)
  assert.equal(a.laenge, 5)
})

test('beide Ausrichtungen werden geprüft: 1000 quer schlägt 800 quer', () => {
  // 1000x800 bei 2440: 800 quer -> 3 je Reihe (1000 tief); 1000 quer -> 2 je Reihe (800 tief)
  const a = ausrichtung(1000, 800, 2440, 6)
  assert.equal(a.proReihe, 3)
  assert.equal(a.quer, 800)
  assert.equal(a.laenge, 2)
})

test('Stapelfaktor: Stellplätze werden aufgerundet, Rest bleibt angebrochen', () => {
  const p = planen({ positionen: [pos({ menge: 10, stapel: 3 })], fahrzeug: MEGA })
  const g = p.gruppen[0]
  assert.equal(g.stapel, 3)
  assert.equal(g.stellplaetze, 4)      // 10 / 3 aufgerundet
  assert.equal(g.voll, 3)
  assert.equal(g.rest, 1)
  assert.deepEqual(g.stapelListe, [3, 3, 3, 1])
  assert.equal(stapelText(g), '3 × 3 + 1')
})

test('Höhenbegrenzung senkt den Stapelfaktor und warnt', () => {
  // Innenhöhe 2700, Träger 1000 hoch -> max 2 statt deklarierter 3
  const p = planen({ positionen: [pos({ menge: 12, h: 1000, stapel: 3 })], fahrzeug: { ...MEGA, h: 2700 } })
  assert.equal(p.gruppen[0].stapel, 2)
  const warn = p.hinweise.find(h => h.k === 'Höhe')
  assert.ok(warn && warn.t === 'warn')
  assert.match(warn.s, /auf 2 reduziert/)
})

test('nicht stapelbar bleibt einlagig', () => {
  const p = planen({ positionen: [pos({ menge: 5, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.gruppen[0].stapel, 1)
  assert.equal(p.gruppen[0].stellplaetze, 5)
  assert.equal(stapelText(p.gruppen[0]), 'einlagig')
})

test('gleiche Grundfläche wird gruppiert, kleinster Stapelfaktor und höchster Träger gewinnen', () => {
  const p = planen({
    positionen: [pos({ menge: 6, h: 1000, stapel: 3 }), pos({ menge: 6, h: 1200, stapel: 2 })],
    fahrzeug: MEGA
  })
  assert.equal(p.gruppen.length, 1, 'eine Gruppe')
  const g = p.gruppen[0]
  assert.equal(g.menge, 12)
  assert.equal(g.stapel, 2)
  assert.equal(g.hMax, 1200)
  assert.ok(p.hinweise.some(h => h.k === 'Mischhöhen'))
})

test('Ausrichtung unabhängig von der Eingabereihenfolge der Kanten', () => {
  const a = planen({ positionen: [pos({ menge: 4, l: 1200, b: 800 })], fahrzeug: MEGA })
  const b = planen({ positionen: [pos({ menge: 4, l: 800, b: 1200 })], fahrzeug: MEGA })
  assert.equal(a.gesamt, b.gesamt)
  assert.equal(a.gruppen[0].key, b.gruppen[0].key)
})

test('zu breiter Träger wird ausgenommen und gemeldet', () => {
  const p = planen({ positionen: [pos({ menge: 2, l: 3000, b: 2600 })], fahrzeug: MEGA })
  assert.equal(p.gruppen.length, 0)
  assert.equal(p.lkw.length, 0)
  assert.equal(p.stueck, 0)
  const err = p.hinweise.find(h => h.t === 'err')
  assert.ok(err && err.k === 'Zu breit', JSON.stringify(p.hinweise))
})

test('mehrere Fahrzeuge, wenn die Ladelänge nicht reicht', () => {
  // 100 Stück, Stapel 1, 1200x1000 -> 50 Reihen à 1,0 m = 50 m > 13,6 m
  const p = planen({ positionen: [pos({ menge: 100, stapel: 1 })], fahrzeug: MEGA })
  assert.ok(p.lkw.length >= 4, `erwartet mindestens 4 Fahrzeuge, waren ${p.lkw.length}`)
  const summe = p.lkw.reduce((s, t) => s + t.belegt, 0)
  assert.ok(Math.abs(summe - p.gesamt) < 1e-9, 'Summe der Fahrzeuge entspricht der Gesamtlänge')
  for (const t of p.lkw) assert.ok(t.belegt <= p.kapa + 1e-9, 'kein Fahrzeug überladen')
})

test('Restkapazität wird korrekt ausgewiesen', () => {
  const p = planen({ positionen: [pos({ menge: 10, stapel: 3 })], fahrzeug: MEGA })
  const t = p.lkw[0]
  assert.equal(t.belegt, 2)                  // 4 Stellplätze, 2 je Reihe -> 2 Reihen à 1 m
  assert.equal(t.rest, 11.6)
  assert.match(restText(t, p.gruppen), /11,60 m frei/)
})

test('volles Fahrzeug meldet keine Restkapazität', () => {
  const p = planen({ positionen: [pos({ menge: 2, l: 13600, b: 2400, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.lkw.length, 2)
  assert.equal(restText(p.lkw[0], p.gruppen), 'Fahrzeug vollständig belegt.')
})

test('Gewicht wird summiert und je Fahrzeug verteilt', () => {
  const p = planen({ positionen: [pos({ menge: 10, stapel: 1, gewicht: 500 })], fahrzeug: MEGA })
  assert.equal(p.gewicht, 5000)
  const summe = p.lkw.reduce((s, t) => s + t.gewicht, 0)
  assert.ok(Math.abs(summe - p.gewicht) < 1e-6, 'Fahrzeuggewichte summieren sich zur Gesamtsumme')
})

test('Nutzlastüberschreitung wird gewarnt, nicht verhindert', () => {
  const p = planen({ positionen: [pos({ menge: 20, stapel: 3, gewicht: 1500 })], fahrzeug: { ...MEGA, nutzlast: 24000 } })
  assert.equal(p.gewicht, 30000)
  assert.equal(p.ueberladen, true)
  const warn = p.hinweise.find(h => h.k === 'Nutzlast')
  assert.ok(warn && warn.t === 'warn')
  assert.match(warn.s, /Überschreitung/)
})

test('ohne Nutzlast keine Gewichtswarnung', () => {
  const p = planen({ positionen: [pos({ menge: 20, gewicht: 1500 })], fahrzeug: MEGA })
  assert.equal(p.ueberladen, false)
  assert.equal(p.hinweise.filter(h => h.k === 'Nutzlast').length, 0)
})

test('gemischte Gewichte auf einer Grundfläche: Gesamtsumme bleibt exakt', () => {
  const p = planen({
    positionen: [pos({ menge: 3, stapel: 1, gewicht: 100 }), pos({ menge: 1, stapel: 1, gewicht: 900 })],
    fahrzeug: MEGA
  })
  assert.equal(p.gewicht, 1200)
  assert.equal(p.gruppen[0].gewichtProStueck, 300)
})

test('Stapelfaktor-Überschreibung wirkt für den Vergleich', () => {
  const positionen = [pos({ menge: 12, stapel: 3 })]
  const frei = planen({ positionen, fahrzeug: MEGA })
  const eins = planen({ positionen, fahrzeug: MEGA, stapelUeberschreibung: 1 })
  assert.equal(frei.gruppen[0].stapel, 3)
  assert.equal(eins.gruppen[0].stapel, 1)
  assert.ok(eins.gesamt > frei.gesamt)
})

test('Schlussreihe und Restbreite werden gemeldet', () => {
  const p = planen({ positionen: [pos({ menge: 3, stapel: 1 })], fahrzeug: MEGA })
  assert.ok(p.hinweise.some(h => h.k === 'Schlussreihe'))
})

test('Fahrzeug ohne Maße erzeugt keine Ausnahme', () => {
  const p = planen({ positionen: [pos({ menge: 5 })], fahrzeug: { l: 0, b: 0, h: 0 } })
  assert.equal(p.lkw.length, 0)
  assert.ok(p.hinweise.some(h => h.t === 'err'))
})

/* ================================================================
 * Überlänge — der im Berechnungs-Audit gefundene Fehler
 * Kein erzeugter Fahrzeugplan darf mehr Ladelänge enthalten,
 * als das Fahrzeug innen lang ist.
 * ================================================================ */

const keinFahrzeugUeberfuellt = p => {
  for (const t of p.lkw) {
    assert.ok(t.belegt <= p.kapa + 1e-9,
      `Fahrzeug ${t.nr} belegt ${t.belegt.toFixed(3)} m bei ${p.kapa.toFixed(3)} m Innenlänge`)
    assert.ok(t.rest >= 0, `Fahrzeug ${t.nr} meldet negative freie Ladelänge`)
  }
}

test('Überlänge: einzelner Träger länger als das Fahrzeug wird abgelehnt', () => {
  const p = planen({ positionen: [pos({ menge: 1, l: 15000, b: 2000, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.lkw.length, 0, 'kein Fahrzeugplan')
  assert.equal(p.gruppen.length, 0)
  assert.equal(p.stueck, 0)
  const err = p.hinweise.find(h => h.t === 'err')
  assert.ok(err && err.k === 'Zu lang', JSON.stringify(p.hinweise))
  assert.match(err.s, /Innenlänge/)
  keinFahrzeugUeberfuellt(p)
})

test('Überlänge: derselbe Träger auf der Wechselbrücke', () => {
  const p = planen({ positionen: [pos({ menge: 2, l: 8000, b: 1200, stapel: 1 })], fahrzeug: { l: 7450, b: 2480, h: 2700 } })
  assert.equal(p.lkw.length, 0)
  assert.ok(p.hinweise.some(h => h.k === 'Zu lang'))
  keinFahrzeugUeberfuellt(p)
})

test('Überlänge: passende Ausrichtung wird gewählt statt abzulehnen', () => {
  /* 13.000 × 2.000: quer 13.000 passt nicht, quer 2.000 ergibt 13,00 m Reihentiefe — das passt */
  const p = planen({ positionen: [pos({ menge: 1, l: 13000, b: 2000, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.lkw.length, 1)
  assert.equal(p.gruppen[0].a.quer, 2000)
  assert.equal(p.gesamt, 13)
  keinFahrzeugUeberfuellt(p)
})

test('exakt volle Fahrzeuglänge', () => {
  /* 1.360 mm tief × 10 Reihen = 13,60 m */
  const p = planen({ positionen: [pos({ menge: 10, l: 2400, b: 1360, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.lkw.length, 1)
  assert.equal(Math.round(p.gesamt * 1000) / 1000, 13.6)
  assert.equal(p.lkw[0].rest, 0)
  assert.equal(Math.round(p.lkw[0].ausl * 1000) / 1000, 1)
  keinFahrzeugUeberfuellt(p)
})

test('knapp unter der Fahrzeuglänge bleibt ein Fahrzeug', () => {
  const p = planen({ positionen: [pos({ menge: 9, l: 2400, b: 1360, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.lkw.length, 1)
  assert.equal(Math.round(p.gesamt * 1000) / 1000, 12.24)
  assert.equal(Math.round(p.lkw[0].rest * 1000) / 1000, 1.36)
  keinFahrzeugUeberfuellt(p)
})

test('knapp über der Fahrzeuglänge braucht ein zweites Fahrzeug', () => {
  const p = planen({ positionen: [pos({ menge: 11, l: 2400, b: 1360, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.lkw.length, 2)
  assert.equal(Math.round(p.gesamt * 1000) / 1000, 14.96)
  keinFahrzeugUeberfuellt(p)
})

test('deutlich über der Fahrzeuglänge verteilt auf mehrere Fahrzeuge', () => {
  const p = planen({ positionen: [pos({ menge: 100, l: 1200, b: 1000, stapel: 1 })], fahrzeug: MEGA })
  assert.ok(p.lkw.length >= 4)
  const summe = p.lkw.reduce((s, t) => s + t.belegt, 0)
  assert.ok(Math.abs(summe - p.gesamt) < 1e-9)
  keinFahrzeugUeberfuellt(p)
})

test('kein Fahrzeug wird überfüllt, auch bei gemischten Reihentiefen', () => {
  const p = planen({
    positionen: [
      pos({ menge: 30, l: 2400, b: 1360, stapel: 1 }),
      pos({ menge: 24, l: 1200, b: 1000, stapel: 2 }),
      pos({ menge: 18, l: 1400, b: 800, stapel: 3 })
    ],
    fahrzeug: MEGA
  })
  assert.ok(p.lkw.length > 1)
  keinFahrzeugUeberfuellt(p)
})

/* ================================================================
 * Klassische Lademeter — flächenbasiert, Bezugsbreite 2,40 m
 * ================================================================ */

test('klassische LDM: Formel und Bezugsbreite', () => {
  const p = planen({ positionen: [pos({ menge: 10, l: 1200, b: 800, stapel: 1 })], fahrzeug: MEGA })
  assert.equal(p.ldmBreite, 2.4)
  assert.equal(p.gruppen[0].flaecheJeStellplatz, 0.96)
  assert.equal(p.gruppen[0].stellplaetze, 10)
  assert.equal(Math.round(p.flaeche * 100) / 100, 9.6)
  assert.equal(Math.round(p.ldm * 100) / 100, 4)          // 9,60 / 2,40
})

test('klassische LDM rechnet mit Stellplätzen, nicht mit Stückzahl', () => {
  const ohne = planen({ positionen: [pos({ menge: 20, l: 1200, b: 800, stapel: 1 })], fahrzeug: MEGA })
  const mit  = planen({ positionen: [pos({ menge: 20, l: 1200, b: 800, stapel: 2 })], fahrzeug: MEGA })
  assert.equal(Math.round(ohne.ldm * 100) / 100, 8)
  assert.equal(Math.round(mit.ldm * 100) / 100, 4, 'Stapel 2 halbiert die Grundfläche')
})

test('Abnahmefall: alle Kennzahlen zusammen', () => {
  const p = planen({
    positionen: [
      { menge: 14, l: 1200, b: 1000, h: 1000, stapel: 3, gewicht: 88,  name: 'Gitterbox' },
      { menge: 12, l: 1400, b:  800, h: 1000, stapel: 3, gewicht: 200, name: 'KLT 888' }
    ],
    fahrzeug: MEGA
  })
  assert.equal(p.gewicht, 3632, 'Gewicht 14×88 + 12×200')
  assert.equal(p.lkw.length, 1)

  const gitterbox = p.gruppen.find(g => g.l === 1200 && g.b === 1000)
  const klt = p.gruppen.find(g => g.l === 1400 && g.b === 800)
  assert.equal(gitterbox.stellplaetze, 5, 'ceil(14/3)')
  assert.equal(klt.stellplaetze, 4, 'ceil(12/3)')
  assert.equal(gitterbox.stapel, 3)
  assert.equal(klt.stapel, 3)

  assert.equal(Math.round(p.gesamt * 100) / 100, 5.8, 'Ladelänge 3,00 m + 2,80 m')
  assert.equal(Math.round(p.lkw[0].rest * 100) / 100, 7.8, 'freie Ladelänge')
  assert.equal(Math.round((p.gesamt / p.kapa) * 1000) / 10, 42.6, 'Auslastung in Prozent')

  assert.equal(Math.round(gitterbox.ldm * 100) / 100, 2.5,  '5 × 1,20 × 1,00 / 2,40')
  assert.equal(Math.round(klt.ldm * 100) / 100, 1.87,       '4 × 1,40 × 0,80 / 2,40')
  assert.equal(Math.round(p.ldm * 100) / 100, 4.37,         'Gesamt-LDM')

  /* Die Differenz ist genau der Platz der teilbelegten Schlussreihen */
  assert.equal(Math.round((p.gesamt - p.ldm) * 100) / 100, 1.43)
  keinFahrzeugUeberfuellt(p)
})

test('Ladelänge und LDM stimmen überein, wenn alle Reihen voll sind', () => {
  /* 33 Europaletten, 3 je Reihe, 11 volle Reihen */
  const p = planen({ positionen: [pos({ menge: 33, l: 1200, b: 800, stapel: 1 })], fahrzeug: { l: 13600, b: 2400, h: 3000 } })
  assert.equal(Math.round(p.gesamt * 100) / 100, 13.2)
  assert.equal(Math.round(p.ldm * 100) / 100, 13.2)
})

test('ausgenommene Positionen zählen weder in LDM noch im Gewicht', () => {
  const p = planen({
    positionen: [pos({ menge: 5, l: 1200, b: 800, stapel: 1, gewicht: 100 }), pos({ menge: 2, l: 15000, b: 2000, stapel: 1, gewicht: 999 })],
    fahrzeug: MEGA
  })
  assert.equal(p.gruppen.length, 1)
  assert.equal(p.gewicht, 500)
  assert.equal(Math.round(p.ldm * 100) / 100, 2)
  assert.ok(p.hinweise.some(h => h.k === 'Zu lang'))
  keinFahrzeugUeberfuellt(p)
})
