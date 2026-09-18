/*
 * Stammdatenverwaltung: Bestand, Varianten, Suche.
 *
 * In der Ursprungsfassung war der Katalog fest eingebettet. Hier kommt er
 * vollständig vom Nutzer — manuell erfasst, importiert oder als neutrales
 * Beispiel geladen. Die Variantenbildung (gleiche Maße und Stapelfaktor
 * ergeben eine Variante, mehrere IDs können darauf zeigen) bleibt erhalten,
 * weil sie die Auswahl auch bei großen Beständen bedienbar hält.
 */
import { normQ, n0, esc } from './format.js'

let bestand = []

export const alle = () => bestand.slice()
export const anzahl = () => bestand.length
export const leer = () => bestand.length === 0

export function setzeBestand(liste) {
  bestand = (liste || []).map(e => ({ ...e }))
  bauVarianten()
  return bestand
}

export function fuegeHinzu(eintrag) {
  bestand.push({ ...eintrag })
  bauVarianten()
}

export function aktualisiere(id, aenderung) {
  const i = bestand.findIndex(e => e.id === id)
  if (i < 0) return false
  bestand[i] = { ...bestand[i], ...aenderung }
  bauVarianten()
  return true
}

export function entferne(id) {
  bestand = bestand.filter(e => e.id !== id)
  bauVarianten()
}

export const findeId = id => bestand.find(e => e.id === String(id).trim())

/* ---------------- Varianten ---------------- */
/* Eine Variante = identische Maße (längere Kante zuerst) und identischer Stapelfaktor. */

let VARIANTEN = []

function bauVarianten() {
  const m = new Map()
  for (const e of bestand) {
    const L = Math.max(e.laenge_mm, e.breite_mm)
    const B = Math.min(e.laenge_mm, e.breite_mm)
    const key = `${L}x${B}x${e.hoehe_mm}x${e.stapelfaktor_max}`
    if (!m.has(key)) {
      m.set(key, { key, l: L, b: B, h: e.hoehe_mm, stapel: e.stapelfaktor_max, ids: [], gewichte: [] })
    }
    const v = m.get(key)
    v.ids.push(e.id)
    v.gewichte.push(+e.gewicht_kg || 0)
  }
  const a = [...m.values()]
  for (const v of a) {
    /* Gewicht der Variante: Mittel der zugeordneten Träger, gerundet auf 0,1 kg */
    v.gewicht = v.gewichte.length ? Math.round(v.gewichte.reduce((s, x) => s + x, 0) / v.gewichte.length * 10) / 10 : 0
    v.gewichtGemischt = new Set(v.gewichte).size > 1
    const namen = v.ids.map(id => (findeId(id) || {}).bezeichnung || '').join(' ')
    v.such = normQ(`${v.ids.join(' ')} ${namen} ${v.l}x${v.b}x${v.h} ${v.l}x${v.b} `
      + `${v.l / 1000}x${v.b / 1000}x${v.h / 1000} ${v.l / 1000}x${v.b / 1000}`)
  }
  a.sort((x, y) => y.ids.length - x.ids.length || x.l - y.l || x.b - y.b || x.h - y.h)
  VARIANTEN = a
}

export const varianten = () => VARIANTEN.slice()
export const varOf = key => VARIANTEN.find(v => v.key === key)

export function varVonId(id) {
  const e = findeId(id)
  if (!e) return null
  const L = Math.max(e.laenge_mm, e.breite_mm), B = Math.min(e.laenge_mm, e.breite_mm)
  return varOf(`${L}x${B}x${e.hoehe_mm}x${e.stapelfaktor_max}`)
}

/** Kennzahlen für die Oberfläche — bewusst aus dem Bestand gerechnet, nie fest verdrahtet. */
export function kennzahlen() {
  const flaechen = new Set(VARIANTEN.map(v => `${v.l}x${v.b}`))
  return { eintraege: bestand.length, varianten: VARIANTEN.length, grundflaechen: flaechen.size }
}

/** Auswahlfeld, nach Grundfläche gruppiert. */
export function gruppenHtml() {
  const grp = new Map()
  for (const v of VARIANTEN) {
    const k = `${v.l}x${v.b}`
    if (!grp.has(k)) grp.set(k, { l: v.l, b: v.b, vars: [], ids: 0 })
    const g = grp.get(k)
    g.vars.push(v)
    g.ids += v.ids.length
  }
  const html = [...grp.values()]
    .sort((a, b) => b.ids - a.ids || a.l - b.l || a.b - b.b)
    .map(g => `<optgroup label="${n0(g.l)} × ${n0(g.b)} mm  (${g.ids} ${g.ids === 1 ? 'Eintrag' : 'Einträge'})">`
      + g.vars.sort((a, b) => a.h - b.h)
        .map(v => `<option value="${esc(v.key)}">${v.l}×${v.b}×${v.h} · Stapel ×${v.stapel}</option>`).join('')
      + '</optgroup>').join('')
  return html + '<optgroup label="Sonderfall"><option value="sonder">Sonderladungsträger · freie Maße</option></optgroup>'
}

/**
 * Sucht eine Variante über ID, Bezeichnung oder Maßangabe.
 * @returns {{v:object, id:string|null, exakt:boolean, anzahl:number}|null}
 */
export function treffer(text) {
  const t = String(text ?? '').trim()
  if (!t) return null
  const v = varVonId(t)
  if (v) return { v, id: (findeId(t) || {}).id, exakt: true, anzahl: 1 }
  const q = normQ(t)
  const tr = VARIANTEN.filter(x => x.such.includes(q))
  return tr.length ? { v: tr[0], id: null, exakt: false, anzahl: tr.length } : null
}
