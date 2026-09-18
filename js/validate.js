/* Validierung der Ladungsträger-Stammdaten. Gilt für manuelle Eingabe und Import. */

export const FELDER = ['id', 'bezeichnung', 'laenge_mm', 'breite_mm', 'hoehe_mm', 'gewicht_kg', 'stapelfaktor_max', 'kategorie']
export const PFLICHT = ['id', 'bezeichnung', 'laenge_mm', 'breite_mm', 'hoehe_mm', 'stapelfaktor_max']

const MAX_MM = 30000
const MAX_KG = 100000

/**
 * Deutsche und englische Zahlformate.
 * "1.200,5" -> 1200.5 | "1200.5" -> 1200.5 | "1.200" -> 1200 | "1200" -> 1200
 * Ein einzelner Punkt vor genau drei Ziffern gilt als Tausenderpunkt,
 * sonst als Dezimalpunkt.
 */
export function zahl(wert) {
  if (typeof wert === 'number') return Number.isFinite(wert) ? wert : NaN
  let s = String(wert ?? '').trim().replace(/\s/g, '')
  if (!s) return NaN
  const hatKomma = s.includes(','), hatPunkt = s.includes('.')
  if (hatKomma && hatPunkt) s = s.replace(/\./g, '').replace(',', '.')
  else if (hatKomma) s = s.replace(',', '.')
  else if (hatPunkt && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Prüft einen einzelnen Datensatz.
 * @returns {{ok:boolean, wert:object|null, fehler:string[]}}
 */
export function pruefeEintrag(roh, { vorhandeneIds = new Set() } = {}) {
  const fehler = []
  const id = String(roh.id ?? '').trim()
  const bezeichnung = String(roh.bezeichnung ?? '').trim()

  if (!id) fehler.push('ID fehlt')
  else if (vorhandeneIds.has(id)) fehler.push(`ID „${id}“ ist doppelt`)
  if (!bezeichnung) fehler.push('Bezeichnung fehlt')

  const masse = {}
  for (const [feld, label] of [['laenge_mm', 'Länge'], ['breite_mm', 'Breite'], ['hoehe_mm', 'Höhe']]) {
    const n = zahl(roh[feld])
    if (Number.isNaN(n)) fehler.push(`${label} ist keine Zahl`)
    else if (n <= 0) fehler.push(`${label} muss größer als 0 sein`)
    else if (n > MAX_MM) fehler.push(`${label} über ${MAX_MM} mm – Einheit prüfen (Angabe in mm)`)
    else masse[feld] = Math.round(n)
  }

  let gewicht = 0
  if (roh.gewicht_kg !== undefined && roh.gewicht_kg !== null && String(roh.gewicht_kg).trim() !== '') {
    const n = zahl(roh.gewicht_kg)
    if (Number.isNaN(n)) fehler.push('Gewicht ist keine Zahl')
    else if (n < 0) fehler.push('Gewicht darf nicht negativ sein')
    else if (n > MAX_KG) fehler.push(`Gewicht über ${MAX_KG} kg – Einheit prüfen (Angabe in kg)`)
    else gewicht = n
  }

  let stapel = 1
  const sRoh = roh.stapelfaktor_max
  if (sRoh === undefined || sRoh === null || String(sRoh).trim() === '') {
    fehler.push('Stapelfaktor fehlt')
  } else {
    const n = zahl(sRoh)
    if (Number.isNaN(n)) fehler.push('Stapelfaktor ist keine Zahl')
    else if (n < 1) fehler.push('Stapelfaktor muss mindestens 1 sein (1 = nicht stapelbar)')
    else if (!Number.isInteger(n)) fehler.push('Stapelfaktor muss eine ganze Zahl sein')
    else stapel = n
  }

  if (fehler.length) return { ok: false, wert: null, fehler }
  return {
    ok: true,
    fehler: [],
    wert: {
      id, bezeichnung,
      laenge_mm: masse.laenge_mm, breite_mm: masse.breite_mm, hoehe_mm: masse.hoehe_mm,
      gewicht_kg: gewicht, stapelfaktor_max: stapel,
      kategorie: String(roh.kategorie ?? '').trim()
    }
  }
}

/**
 * Prüft eine ganze Liste und meldet Dubletten innerhalb der Liste.
 * @returns {{gueltig:Array, abgelehnt:Array<{zeile:number, roh:object, fehler:string[]}>}}
 */
export function pruefeListe(rohListe, { bestand = [] } = {}) {
  const ids = new Set(bestand.map(e => e.id))
  const gueltig = []
  const abgelehnt = []
  rohListe.forEach((roh, i) => {
    const r = pruefeEintrag(roh, { vorhandeneIds: ids })
    if (r.ok) { ids.add(r.wert.id); gueltig.push(r.wert) }
    else abgelehnt.push({ zeile: i + 1, roh, fehler: r.fehler })
  })
  return { gueltig, abgelehnt }
}
