/*
 * Rechenkern — Lademeter, Stapelung, Ausrichtung, Verteilung auf Fahrzeuge.
 *
 * Die Logik stammt aus der erprobten Ursprungsfassung und ist bewusst
 * unverändert übernommen. Neu ist allein die Entkopplung: der Kern kennt
 * weder DOM noch Stammdaten, sondern nur fertig aufgelöste Positionen.
 * Ergänzt wurde die Gewichtsrechnung (Gesamtgewicht, Gewicht je Fahrzeug,
 * optionale Nutzlastprüfung).
 */

export const FARBEN = ['#E87722', '#3E9BD6', '#59B87A', '#B98BD9', '#D9C34A'];

/* Beste Ausrichtung: minimale tatsächliche Ladelänge für die Stellplatzzahl */
export function ausrichtung(l, b, innenBreite, stellplaetze) {
  const sp = Math.max(1, stellplaetze || 1)
  const opt = []
  for (const [quer, tief] of [[l, b], [b, l]]) {
    const n = Math.floor(innenBreite / quer)
    if (n >= 1) {
      const reihen = Math.ceil(sp / n)
      opt.push({ quer, tief, proReihe: n, ldm: (tief / 1000) / n, reihen, laenge: reihen * tief / 1000 })
    }
  }
  if (!opt.length) return null
  opt.sort((a, b) => a.laenge - b.laenge || a.ldm - b.ldm || b.proReihe - a.proReihe)
  return opt[0]
}

const n0 = x => x.toLocaleString('de-DE', { maximumFractionDigits: 0 })
const n2 = x => x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const gName = g => `${n0(g.l)} × ${n0(g.b)} mm`

/**
 * @param {object}   arg
 * @param {Array}    arg.positionen  [{menge, l, b, h, stapel, name?, gewicht?}] — Maße in mm, Gewicht kg je Stück
 * @param {object}   arg.fahrzeug    {l, b, h, nutzlast?} — Innenmaße in mm, Nutzlast in kg
 * @param {number?}  arg.stapelUeberschreibung  erzwingt einen Stapelfaktor (für den Vergleich)
 */
export function planen({ positionen = [], fahrzeug, stapelUeberschreibung = null }) {
  const f = { l: +fahrzeug.l || 0, b: +fahrzeug.b || 0, h: +fahrzeug.h || 0, nutzlast: +fahrzeug.nutzlast || 0 }
  const kapa = f.l / 1000
  const hinweise = []
  const gruppen = new Map()

  /* Gruppierung nach Grundfläche — unabhängig von der Ausrichtung */
  for (const p of positionen) {
    if (!p.menge || p.menge <= 0) continue
    const key = [Math.min(p.l, p.b), Math.max(p.l, p.b)].join('x')
    if (!gruppen.has(key)) {
      gruppen.set(key, {
        key, l: Math.max(p.l, p.b), b: Math.min(p.l, p.b),
        hMax: 0, hoehen: new Set(), stapelDekl: 99, menge: 0,
        namen: new Set(), gewichtSumme: 0
      })
    }
    const g = gruppen.get(key)
    g.menge += p.menge
    g.hMax = Math.max(g.hMax, p.h)
    g.hoehen.add(p.h)
    g.stapelDekl = Math.min(g.stapelDekl, stapelUeberschreibung || p.stapel || 1)
    g.namen.add(p.name || gName({ l: p.l, b: p.b }))
    g.gewichtSumme += p.menge * (+p.gewicht || 0)
  }

  const liste = [...gruppen.values()]
  liste.forEach((g, i) => { g.farbe = FARBEN[i % FARBEN.length] })

  const reihen = []
  for (const g of liste) {
    g.gewichtProStueck = g.menge ? g.gewichtSumme / g.menge : 0

    /* Höhenbegrenzung durch die Fahrzeuginnenhöhe */
    const maxHoehe = g.hMax > 0 ? Math.max(1, Math.floor(f.h / g.hMax)) : 1
    g.stapel = Math.max(1, Math.min(g.stapelDekl, maxHoehe))
    if (g.stapel < g.stapelDekl) {
      hinweise.push({ t: 'warn', k: 'Höhe', s: `${gName(g)}: Stapelfaktor auf ${g.stapel} reduziert. `
        + `${g.stapelDekl} × ${n0(g.hMax)} mm = ${n0(g.stapelDekl * g.hMax)} mm überschreitet die Innenhöhe von ${n0(f.h)} mm.` })
    }

    if (g.hoehen.size > 1) {
      hinweise.push({ t: 'info', k: 'Mischhöhen', s: `${gName(g)}: gleiche Grundfläche, aber Höhen von `
        + `${n0(Math.min(...g.hoehen))} bis ${n0(g.hMax)} mm. Gerechnet wird mit dem höchsten Träger und dem `
        + `kleinsten Stapelfaktor der Gruppe – im Zweifel konservativ. Positionen trennen, wenn nicht gemischt gestapelt wird.` })
    }

    g.stellplaetze = Math.ceil(g.menge / g.stapel)
    /* Reale Verteilung: volle Stapel, dann ein angebrochener Rest */
    g.voll = Math.floor(g.menge / g.stapel)
    g.rest = g.menge - g.voll * g.stapel
    g.stapelListe = [...Array(g.voll).fill(g.stapel), ...(g.rest ? [g.rest] : [])]

    const a = ausrichtung(g.l, g.b, f.b, g.stellplaetze)
    if (!a) {
      g.fehler = true
      hinweise.push({ t: 'err', k: 'Passt nicht', s: `${gName(g)} (${n0(g.l)} × ${n0(g.b)} mm) ist in keiner Ausrichtung `
        + `schmaler als die Innenbreite von ${n0(f.b)} mm. Position aus der Berechnung ausgenommen.` })
      continue
    }
    g.a = a
    g.reihen = a.reihen
    g.laenge = a.laenge

    /* Hinweis: knapp an besserer Ausrichtung vorbei */
    const besser = ausrichtung(g.l, g.b, f.b + 80, g.stellplaetze)
    if (besser && besser.laenge < a.laenge - 0.005) {
      hinweise.push({ t: 'info', k: 'Innenbreite', s: `${gName(g)}: bei ${n0(f.b + 80)} mm Innenbreite passen `
        + `${besser.proReihe} Stück quer nebeneinander – ${n2(besser.laenge)} statt ${n2(a.laenge)} m Ladelänge. Fahrzeugmaß prüfen.` })
    }

    for (let r = 0; r < g.reihen; r++) {
      const belegt = Math.min(a.proReihe, g.stellplaetze - r * a.proReihe)
      const von = r * a.proReihe
      const hoehen = g.stapelListe.slice(von, von + belegt)
      const stueck = hoehen.reduce((s, x) => s + x, 0)
      reihen.push({ g, tief: a.tief / 1000, quer: a.quer / 1000, proReihe: a.proReihe, belegt,
                    hoehen, stueck, gewicht: stueck * g.gewichtProStueck })
      if (belegt < a.proReihe) {
        hinweise.push({ t: 'info', k: 'Schlussreihe', s: `${gName(g)}: letzte Reihe nur mit ${belegt} von `
          + `${a.proReihe} Stellplätzen belegt. ${n2(a.tief / 1000)} m Ladelänge werden nur teilweise genutzt.` })
      }
    }
    if (a.proReihe * a.quer < f.b - 60) {
      hinweise.push({ t: 'info', k: 'Restbreite', s: `${gName(g)}: ${n0(f.b - a.proReihe * a.quer)} mm Ladebreite `
        + `bleiben je Reihe ungenutzt (${a.proReihe} × ${n0(a.quer)} mm bei ${n0(f.b)} mm Innenbreite).` })
    }
  }

  /* Reihen auf Fahrzeuge verteilen: First Fit, tiefste Reihen zuerst */
  const sortiert = [...reihen].sort((x, y) => y.tief - x.tief)
  const lkw = []
  for (const r of sortiert) {
    let ziel = lkw.find(t => t.belegt + r.tief <= kapa + 1e-9)
    if (!ziel) { ziel = { reihen: [], belegt: 0 }; lkw.push(ziel) }
    ziel.reihen.push(r)
    ziel.belegt += r.tief
  }
  lkw.forEach((t, i) => {
    t.nr = i + 1
    t.reihen.sort((x, y) => liste.indexOf(x.g) - liste.indexOf(y.g) || y.tief - x.tief)
    t.rest = Math.max(0, Math.round((kapa - t.belegt) * 1000) / 1000)
    t.ausl = kapa ? t.belegt / kapa : 0
    t.gewicht = t.reihen.reduce((s, r) => s + r.gewicht, 0)
    t.stueck = t.reihen.reduce((s, r) => s + r.stueck, 0)
    t.nutzlastFrei = f.nutzlast ? f.nutzlast - t.gewicht : null
    t.ueberladen = f.nutzlast > 0 && t.gewicht > f.nutzlast + 1e-9
    if (t.ueberladen) {
      hinweise.push({ t: 'warn', k: 'Nutzlast', s: `Fahrzeug ${t.nr}: ${n0(t.gewicht)} kg geplant, `
        + `zulässig sind ${n0(f.nutzlast)} kg. Überschreitung um ${n0(t.gewicht - f.nutzlast)} kg. `
        + `Die Verteilung richtet sich nach der Ladelänge, nicht nach dem Gewicht – Positionen ggf. manuell umverteilen.` })
    }
  })

  const gesamt = reihen.reduce((s, r) => s + r.tief, 0)
  const gewichtGesamt = liste.reduce((s, g) => s + (g.fehler ? 0 : g.gewichtSumme), 0)

  return {
    f, kapa,
    gruppen: liste.filter(g => !g.fehler),
    lkw, hinweise, gesamt,
    stueck: liste.reduce((s, g) => s + (g.fehler ? 0 : g.menge), 0),
    gewicht: gewichtGesamt,
    nutzlast: f.nutzlast,
    ueberladen: lkw.some(t => t.ueberladen)
  }
}

/* Textbausteine, die Kern und Ausgabe teilen */
export function stapelText(g) {
  if (g.stapel === 1) return 'einlagig'
  if (!g.rest) return `${g.voll} × ${g.stapel}`
  if (!g.voll) return `${g.rest} von max. ${g.stapel}`
  return `${g.voll} × ${g.stapel} + ${g.rest}`
}

export function restText(t, gruppen) {
  if (t.rest <= 0.005) return 'Fahrzeug vollständig belegt.'
  const passt = gruppen.filter(g => g.a && g.a.tief / 1000 <= t.rest + 1e-9)
    .map(g => `${g.a.proReihe * g.stapel} × ${gName(g)}`)
  return `${n2(t.rest)} m frei. ` + (passt.length
    ? `Es passt noch eine Reihe: ${passt.join(' oder ')}.`
    : 'Für keine weitere Reihe der erfassten Ladungsträger ausreichend.')
}
