/*
 * CSV-Import ohne Abhängigkeiten.
 * Setzt keine festen Spaltennamen voraus: das Trennzeichen wird erkannt,
 * die Kopfzeile gegen bekannte Synonyme gemappt, und die Zuordnung bleibt
 * in der Oberfläche änderbar.
 */
import { FELDER } from './validate.js'

/** Synonyme je Zielfeld, kleingeschrieben und ohne Sonderzeichen verglichen */
const SYNONYME = {
  id:               ['id', 'nr', 'nummer', 'ltnr', 'ladungstraegernr', 'ladungstraegernummer', 'ladungstraeger', 'artikel', 'artikelnr', 'artikelnummer', 'code', 'sku', 'kennung'],
  bezeichnung:      ['bezeichnung', 'name', 'beschreibung', 'benennung', 'text', 'description', 'titel'],
  laenge_mm:        ['laenge', 'laengemm', 'length', 'l', 'tiefe', 'lmm'],
  breite_mm:        ['breite', 'breitemm', 'width', 'b', 'bmm'],
  hoehe_mm:         ['hoehe', 'hoehemm', 'height', 'h', 'hmm'],
  gewicht_kg:       ['gewicht', 'gewichtkg', 'weight', 'masse', 'kg', 'gew'],
  stapelfaktor_max: ['stapel', 'stapelfaktor', 'stapelfaktormax', 'stapelbar', 'stapelbarkeit', 'stack', 'stackfactor', 'lagen', 'maxstapel'],
  kategorie:        ['kategorie', 'typ', 'art', 'category', 'type', 'gruppe']
}

const norm = s => String(s ?? '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]/g, '')

/** Häufigstes Trennzeichen der Kopfzeile, außerhalb von Anführungszeichen */
export function erkenneTrennzeichen(text) {
  const kopf = text.split(/\r?\n/).find(z => z.trim()) || ''
  const kandidaten = [';', ',', '\t', '|']
  let best = ';', max = -1
  for (const d of kandidaten) {
    const n = zerlegeZeile(kopf, d).length
    if (n > max) { max = n; best = d }
  }
  return best
}

/** Eine CSV-Zeile zerlegen, RFC-4180-Anführungszeichen inklusive "" als Escape */
function zerlegeZeile(zeile, trenn) {
  const felder = []
  let cur = '', inQ = false
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i]
    if (inQ) {
      if (c === '"') {
        if (zeile[i + 1] === '"') { cur += '"'; i++ }
        else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === trenn) { felder.push(cur); cur = '' }
    else cur += c
  }
  felder.push(cur)
  return felder.map(f => f.trim())
}

/** Mehrzeiliger Text -> Zeilen-Arrays. Berücksichtigt Zeilenumbrüche in Feldern. */
export function zerlege(text, trenn) {
  const zeilen = []
  let cur = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { inQ = !inQ; cur += c; continue }
    if (!inQ && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++
      zeilen.push(cur); cur = ''
      continue
    }
    cur += c
  }
  if (cur) zeilen.push(cur)
  return zeilen.filter(z => z.trim()).map(z => zerlegeZeile(z, trenn))
}

/** Automatische Zuordnung Kopfspalte -> Zielfeld. Gibt {feld: spaltenIndex} zurück. */
export function ordneZu(kopf) {
  const zuordnung = {}
  const belegt = new Set()
  const normiert = kopf.map(norm)
  for (const feld of FELDER) {
    const syn = SYNONYME[feld] || []
    let treffer = normiert.findIndex((h, i) => !belegt.has(i) && h === norm(feld))
    if (treffer < 0) treffer = normiert.findIndex((h, i) => !belegt.has(i) && syn.includes(h))
    if (treffer < 0) treffer = normiert.findIndex((h, i) => !belegt.has(i) && h && syn.some(s => h.startsWith(s) && s.length > 2))
    if (treffer >= 0) { zuordnung[feld] = treffer; belegt.add(treffer) }
  }
  return zuordnung
}

/** Sieht die erste Zeile nach Kopfzeile aus? (enthält kaum Zahlen, trifft Synonyme) */
function istKopfzeile(zeile) {
  const zahlen = zeile.filter(f => f && !Number.isNaN(Number(f.replace(',', '.')))).length
  if (zahlen > zeile.length / 2) return false
  return Object.keys(ordneZu(zeile)).length >= 2
}

/**
 * Trennt Kopf- von Datenzeilen und ordnet die Spalten zu.
 * Quelle egal — CSV-Text und XLSX-Blatt liefern beide Zeilen-Arrays.
 * @returns {{kopf:string[], zeilen:string[][], zuordnung:object, kopfErkannt:boolean}}
 */
export function ausZeilen(alle) {
  if (!alle || !alle.length) return { kopf: [], zeilen: [], zuordnung: {}, kopfErkannt: false }
  const kopfErkannt = istKopfzeile(alle[0])
  const kopf = kopfErkannt ? alle[0] : alle[0].map((_, i) => `Spalte ${i + 1}`)
  const zeilen = kopfErkannt ? alle.slice(1) : alle
  return { kopf, zeilen, zuordnung: ordneZu(kopf), kopfErkannt }
}

/**
 * Liest CSV-Text und liefert alles, was die Oberfläche für die Vorschau braucht.
 * @returns {{trenn:string, kopf:string[], zeilen:string[][], zuordnung:object, kopfErkannt:boolean}}
 */
export function leseCsv(text, { trenn = null } = {}) {
  const sauber = String(text ?? '').replace(/^\uFEFF/, '')
  const t = trenn || erkenneTrennzeichen(sauber)
  return { trenn: t, ...ausZeilen(zerlege(sauber, t)) }
}

/** Wendet eine Zuordnung auf die Datenzeilen an -> Rohdatensätze für validate.js */
export function wendeAn(zeilen, zuordnung) {
  return zeilen.map(z => {
    const o = {}
    for (const [feld, idx] of Object.entries(zuordnung)) {
      if (idx === null || idx === undefined || idx < 0) continue
      o[feld] = z[idx] ?? ''
    }
    return o
  })
}

/** Stammdaten als CSV ausgeben (Semikolon, für Excel im deutschen Gebietsschema) */
export function schreibeCsv(eintraege) {
  const q = v => {
    const s = String(v ?? '')
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const kopf = FELDER.join(';')
  const zeilen = eintraege.map(e => FELDER.map(f => q(e[f])).join(';'))
  return [kopf, ...zeilen].join('\r\n') + '\r\n'
}
