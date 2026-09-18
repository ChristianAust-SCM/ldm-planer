/*
 * LAB 01 · LDM Planer — Oberfläche und Zustand.
 *
 * Ablauf: Stammdaten -> Sendung -> Ladeplan.
 * Alles läuft im Browser: keine Requests, keine Übertragung von Daten.
 */
import { n0, n1, n2, esc, gName } from './format.js'
import * as M from './masterdata.js'
import * as S from './storage.js'
import { pruefeEintrag, pruefeListe, FELDER, PFLICHT } from './validate.js'
import { leseCsv, wendeAn, schreibeCsv } from './import-csv.js'
import { planen } from './ldm-core.js'
import * as R from './render-result.js'
import { verbinde as hilfeVerbinden, HB } from './help.js'
import { BEISPIEL_LADUNGSTRAEGER, FAHRZEUGVORLAGEN } from '../data/beispieldaten.js'

const $ = id => document.getElementById(id)

/* ---------------- Zustand ---------------- */

let fahrzeug = { typ: 'mega', l: 13600, b: 2440, h: 3000, nutzlast: 0 }
let positionen = []
let lfdId = 1
let ansicht = 'stammdaten'
let importVorschau = null

/* ---------------- Start ---------------- */

export function start() {
  const gespeicherteStammdaten = S.lies(S.SCHLUESSEL.stammdaten, null)
  M.setzeBestand(Array.isArray(gespeicherteStammdaten) ? gespeicherteStammdaten : [])

  const gf = S.lies(S.SCHLUESSEL.fahrzeug, null)
  if (gf && typeof gf === 'object') fahrzeug = { ...fahrzeug, ...gf }

  const gs = S.lies(S.SCHLUESSEL.sendung, null)
  if (Array.isArray(gs)) {
    positionen = gs.filter(p => p && typeof p === 'object')
    lfdId = positionen.reduce((m, p) => Math.max(m, +p.id || 0), 0) + 1
  }

  hilfeVerbinden()
  verbindeEreignisse()
  fuelleFahrzeugAuswahl()
  setzeAnsicht(M.leer() ? 'stammdaten' : 'sendung')
  if (!S.verfuegbar()) {
    meldung('speicherHinweis', 'Die lokale Speicherung ist in diesem Browser nicht verfügbar. Die Sitzung funktioniert, Daten gehen aber beim Schließen verloren.', 'warn')
  }
}

/* ---------------- Ansichten ---------------- */

function setzeAnsicht(name) {
  ansicht = name
  for (const v of ['stammdaten', 'sendung', 'ladeplan']) {
    $('view-' + v).hidden = v !== name
    const tab = $('tab-' + v)
    tab.classList.toggle('on', v === name)
    tab.setAttribute('aria-selected', String(v === name))
  }
  zeichneAlles()
}

function zeichneAlles() {
  zeichneStammdaten()
  zeichnePositionen()
  rechne()
  zeichneSchrittStand()
}

function zeichneSchrittStand() {
  const k = M.kennzahlen()
  $('tab-stammdaten-meta').textContent = k.eintraege ? `${n0(k.eintraege)} Einträge` : 'leer'
  const stueck = positionen.reduce((s, p) => s + (+p.menge || 0), 0)
  $('tab-sendung-meta').textContent = stueck ? `${n0(stueck)} Stück` : 'leer'
}

/* ---------------- Stammdaten ---------------- */

function zeichneStammdaten() {
  const liste = M.alle()
  const k = M.kennzahlen()
  $('stammMeta').innerHTML = liste.length
    ? `${n0(k.eintraege)} ${k.eintraege === 1 ? 'Ladungsträger' : 'Ladungsträger'} · ${n0(k.varianten)} ${k.varianten === 1 ? 'Maßvariante' : 'Maßvarianten'} · ${n0(k.grundflaechen)} ${k.grundflaechen === 1 ? 'Grundfläche' : 'Grundflächen'}`
    : 'Noch keine Stammdaten.'

  const tb = $('stammBody')
  if (!liste.length) {
    tb.innerHTML = '<tr><td colspan="8" class="empty">Noch keine Ladungsträger. Beispieldaten laden, CSV importieren oder manuell anlegen.</td></tr>'
    return
  }
  tb.innerHTML = liste.map(e => `<tr data-sid="${esc(e.id)}">
    <td><input value="${esc(e.id)}" data-feld="id" aria-label="ID"></td>
    <td><input value="${esc(e.bezeichnung)}" data-feld="bezeichnung" aria-label="Bezeichnung"></td>
    <td class="num"><input type="number" min="1" value="${e.laenge_mm}" data-feld="laenge_mm" aria-label="Länge mm"></td>
    <td class="num"><input type="number" min="1" value="${e.breite_mm}" data-feld="breite_mm" aria-label="Breite mm"></td>
    <td class="num"><input type="number" min="1" value="${e.hoehe_mm}" data-feld="hoehe_mm" aria-label="Höhe mm"></td>
    <td class="num"><input type="number" min="0" step="0.1" value="${e.gewicht_kg ?? 0}" data-feld="gewicht_kg" aria-label="Gewicht kg"></td>
    <td class="num"><input type="number" min="1" max="20" value="${e.stapelfaktor_max}" data-feld="stapelfaktor_max" aria-label="Stapelfaktor"></td>
    <td class="tdel"><button class="del noprint" title="Ladungsträger entfernen" data-loesche="${esc(e.id)}">&times;</button></td>
  </tr>`).join('')
}

function stammFeldGeaendert(tr, feld, wert) {
  const id = tr.dataset.sid
  const alt = M.findeId(id)
  if (!alt) return
  const entwurf = { ...alt, [feld]: wert }
  const andere = M.alle().filter(e => e.id !== id)
  const pr = pruefeEintrag(entwurf, { vorhandeneIds: new Set(andere.map(e => e.id)) })
  if (!pr.ok) {
    meldung('stammMsg', pr.fehler.join(' · '), 'err')
    zeichneStammdaten()
    return
  }
  M.aktualisiere(id, pr.wert)
  /* Positionen zeigen auf Varianten-Schlüssel — nach Maßänderung neu auflösen */
  positionen = positionen.map(p => {
    if (p.typ === 'sonder' || !p.nr) return p
    const v = M.varVonId(p.nr)
    return v ? { ...p, typ: v.key } : p
  })
  speichereStammdaten()
  meldung('stammMsg', 'Gespeichert.', 'ok')
  zeichneAlles()
}

function neuerLadungstraeger() {
  const basis = { id: '', bezeichnung: 'Neuer Ladungsträger', laenge_mm: 1200, breite_mm: 800, hoehe_mm: 1000, gewicht_kg: 0, stapelfaktor_max: 1, kategorie: '' }
  const vorhanden = new Set(M.alle().map(e => e.id))
  let i = M.anzahl() + 1
  while (vorhanden.has('LT-' + String(i).padStart(2, '0'))) i++
  basis.id = 'LT-' + String(i).padStart(2, '0')
  M.fuegeHinzu(basis)
  speichereStammdaten()
  zeichneAlles()
  meldung('stammMsg', `„${basis.id}“ angelegt – Maße und Bezeichnung anpassen.`, 'ok')
  const feld = document.querySelector(`#stammBody tr[data-sid="${CSS.escape(basis.id)}"] input[data-feld="bezeichnung"]`)
  if (feld) { feld.focus(); feld.select() }
}

function loescheLadungstraeger(id) {
  const genutzt = positionen.some(p => p.nr === id)
  if (genutzt && !confirm(`„${id}“ wird in der Sendung verwendet. Trotzdem löschen?`)) return
  M.entferne(id)
  positionen = positionen.map(p => (p.nr === id ? { ...p, nr: null } : p))
  speichereStammdaten()
  zeichneAlles()
  meldung('stammMsg', `„${id}“ gelöscht.`, 'ok')
}

function beispieldatenLaden() {
  if (!M.leer() && !confirm('Die vorhandenen Stammdaten werden durch den Beispieldatensatz ersetzt. Fortfahren?')) return
  M.setzeBestand(BEISPIEL_LADUNGSTRAEGER)
  speichereStammdaten()
  zeichneAlles()
  meldung('stammMsg', `${M.anzahl()} neutrale Beispiel-Ladungsträger geladen.`, 'ok')
}

function alleStammdatenLoeschen() {
  if (!confirm('Stammdaten, Sendung und Fahrzeugeinstellung werden vollständig aus dem Browser entfernt. Das lässt sich nicht rückgängig machen. Fortfahren?')) return
  M.setzeBestand([])
  positionen = []
  fahrzeug = { typ: 'mega', l: 13600, b: 2440, h: 3000, nutzlast: 0 }
  S.alleLoeschen()
  fuelleFahrzeugAuswahl()
  zeichneAlles()
  meldung('stammMsg', 'Alles zurückgesetzt.', 'ok')
}

const speichereStammdaten = () => S.schreib(S.SCHLUESSEL.stammdaten, M.alle())

function exportiere(format) {
  if (M.leer()) { meldung('stammMsg', 'Keine Stammdaten zum Exportieren.', 'err'); return }
  const stempel = S.heuteStempel()
  if (format === 'csv') {
    S.speichereDatei(`ldm-stammdaten-${stempel}.csv`, schreibeCsv(M.alle()), 'text/csv')
  } else {
    S.speichereDatei(`ldm-stammdaten-${stempel}.json`, JSON.stringify({ version: 1, exportiert: stempel, ladungstraeger: M.alle() }, null, 2))
  }
  meldung('stammMsg', `Export als ${format.toUpperCase()} gestartet.`, 'ok')
}

/* ---------------- Import ---------------- */

function importDateiGewaehlt(datei) {
  if (!datei) return
  const leser = new FileReader()
  leser.onload = () => importText(String(leser.result || ''), datei.name)
  leser.onerror = () => meldung('importMsg', 'Datei konnte nicht gelesen werden.', 'err')
  leser.readAsText(datei, 'utf-8')
}

function importText(text, quelle = 'Eingefügter Text') {
  if (!text.trim()) { meldung('importMsg', 'Kein Inhalt gefunden.', 'err'); return }
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) return importJson(text, quelle)
  const gelesen = leseCsv(text)
  if (!gelesen.zeilen.length) { meldung('importMsg', 'Keine Datenzeilen gefunden.', 'err'); return }
  importVorschau = { ...gelesen, quelle }
  zeichneImport()
}

function importJson(text, quelle) {
  try {
    const roh = JSON.parse(text)
    const liste = Array.isArray(roh) ? roh : (roh.ladungstraeger || roh.stammdaten || [])
    if (!Array.isArray(liste) || !liste.length) throw new Error('keine Liste')
    const pr = pruefeListe(liste)
    importVorschau = { json: true, quelle, geprueft: pr, anzahl: liste.length }
    zeichneImport()
  } catch (e) {
    meldung('importMsg', 'Die Datei ist kein gültiger JSON-Export dieser App.', 'err')
  }
}

function zeichneImport() {
  const box = $('importVorschau')
  if (!importVorschau) { box.hidden = true; box.innerHTML = ''; return }
  box.hidden = false

  if (importVorschau.json) {
    const { geprueft, quelle, anzahl } = importVorschau
    box.innerHTML = `
      <h4>Vorschau · ${esc(quelle)}</h4>
      <p class="imeta">${n0(anzahl)} Datensätze gelesen · <b>${n0(geprueft.gueltig.length)} gültig</b>${geprueft.abgelehnt.length ? ` · ${n0(geprueft.abgelehnt.length)} abgelehnt` : ''}</p>
      ${fehlerListe(geprueft.abgelehnt)}
      ${uebernahmeKnoepfe(geprueft.gueltig.length)}`
    return
  }

  const { kopf, zeilen, zuordnung, kopfErkannt, quelle, trenn } = importVorschau
  const roh = wendeAn(zeilen, zuordnung)
  const geprueft = pruefeListe(roh)
  importVorschau.geprueft = geprueft

  const auswahl = feld => `<select data-map="${feld}">
      <option value="-1">— nicht zuordnen —</option>
      ${kopf.map((h, i) => `<option value="${i}"${zuordnung[feld] === i ? ' selected' : ''}>${esc(h)}</option>`).join('')}
    </select>`

  const trennName = { ';': 'Semikolon', ',': 'Komma', '\t': 'Tabulator', '|': 'Senkrechtstrich' }[trenn] || trenn

  box.innerHTML = `
    <h4>Vorschau · ${esc(quelle)}</h4>
    <p class="imeta">${n0(zeilen.length)} Datenzeilen · Trennzeichen ${esc(trennName)} · Kopfzeile ${kopfErkannt ? 'erkannt' : 'nicht erkannt, Spalten durchnummeriert'}</p>
    <div class="maprid">
      ${FELDER.map(f => `<label class="maprow"><span>${esc(feldLabel(f))}${PFLICHT.includes(f) ? ' <i>*</i>' : ''}</span>${auswahl(f)}</label>`).join('')}
    </div>
    <p class="imeta"><b>${n0(geprueft.gueltig.length)} gültig</b>${geprueft.abgelehnt.length ? ` · ${n0(geprueft.abgelehnt.length)} abgelehnt` : ''}</p>
    ${geprueft.gueltig.length ? `<div class="tscroll"><table class="prev"><thead><tr>${FELDER.map(f => `<th>${esc(feldLabel(f))}</th>`).join('')}</tr></thead><tbody>
      ${geprueft.gueltig.slice(0, 5).map(e => `<tr>${FELDER.map(f => `<td>${esc(e[f])}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>${geprueft.gueltig.length > 5 ? `<p class="imeta">… und ${n0(geprueft.gueltig.length - 5)} weitere</p>` : ''}` : ''}
    ${fehlerListe(geprueft.abgelehnt)}
    ${uebernahmeKnoepfe(geprueft.gueltig.length)}`
}

const feldLabel = f => ({
  id: 'ID', bezeichnung: 'Bezeichnung', laenge_mm: 'Länge mm', breite_mm: 'Breite mm',
  hoehe_mm: 'Höhe mm', gewicht_kg: 'Gewicht kg', stapelfaktor_max: 'Stapel max.', kategorie: 'Kategorie'
}[f] || f)

function fehlerListe(abgelehnt) {
  if (!abgelehnt.length) return ''
  const zeigen = abgelehnt.slice(0, 6)
  return `<div class="ifehler"><b>Abgelehnte Zeilen</b><ul>
    ${zeigen.map(a => `<li>Zeile ${a.zeile}: ${esc(a.fehler.join(' · '))}</li>`).join('')}
    ${abgelehnt.length > zeigen.length ? `<li>… und ${n0(abgelehnt.length - zeigen.length)} weitere</li>` : ''}
  </ul></div>`
}

const uebernahmeKnoepfe = gueltig => `<div class="ibtns">
    <button class="btn" data-import="ersetzen"${gueltig ? '' : ' disabled'}>${n0(gueltig)} übernehmen und ersetzen</button>
    <button class="btn-sec" data-import="anhaengen"${gueltig ? '' : ' disabled'}>An Bestand anhängen</button>
    <button class="btn-sec" data-import="abbrechen">Abbrechen</button>
  </div>`

function importUebernehmen(modus) {
  if (!importVorschau || !importVorschau.geprueft) return
  if (modus === 'abbrechen') { importAbbrechen(); return }

  let neu = importVorschau.geprueft.gueltig
  if (modus === 'anhaengen') {
    const bestand = M.alle()
    const nochmal = pruefeListe(neu.map(e => ({ ...e })), { bestand })
    if (nochmal.abgelehnt.length) {
      meldung('importMsg', `${nochmal.abgelehnt.length} Datensätze übersprungen: ID bereits im Bestand.`, 'warn')
    }
    M.setzeBestand([...bestand, ...nochmal.gueltig])
  } else {
    M.setzeBestand(neu)
  }
  speichereStammdaten()
  importAbbrechen()
  zeichneAlles()
  meldung('stammMsg', `Import übernommen: ${n0(M.anzahl())} Ladungsträger im Bestand.`, 'ok')
}

function importAbbrechen() {
  importVorschau = null
  $('importVorschau').hidden = true
  $('importVorschau').innerHTML = ''
  $('importDatei').value = ''
  $('importText').value = ''
}

/* ---------------- Fahrzeug ---------------- */

function fuelleFahrzeugAuswahl() {
  $('fzg').innerHTML = FAHRZEUGVORLAGEN.map(f => `<option value="${f.id}">${esc(f.bezeichnung)}</option>`).join('')
  $('fzg').value = fahrzeug.typ
  $('fL').value = fahrzeug.l
  $('fB').value = fahrzeug.b
  $('fH').value = fahrzeug.h
  $('fN').value = fahrzeug.nutzlast || ''
}

function fahrzeugWechsel() {
  const f = FAHRZEUGVORLAGEN.find(x => x.id === $('fzg').value)
  if (f && f.id !== 'custom') {
    fahrzeug = { typ: f.id, l: f.l, b: f.b, h: f.h, nutzlast: f.nutzlast }
    $('fL').value = f.l; $('fB').value = f.b; $('fH').value = f.h
    $('fN').value = f.nutzlast || ''
  } else {
    fahrzeug.typ = 'custom'
  }
  speichereFahrzeug()
  rechne()
}

function fahrzeugMassGeaendert() {
  fahrzeug.l = +$('fL').value || 0
  fahrzeug.b = +$('fB').value || 0
  fahrzeug.h = +$('fH').value || 0
  fahrzeug.nutzlast = +$('fN').value || 0
  const passt = FAHRZEUGVORLAGEN.find(f => f.id !== 'custom' && f.l === fahrzeug.l && f.b === fahrzeug.b && f.h === fahrzeug.h && f.nutzlast === fahrzeug.nutzlast)
  fahrzeug.typ = passt ? passt.id : 'custom'
  $('fzg').value = fahrzeug.typ
  speichereFahrzeug()
  rechne()
}

const speichereFahrzeug = () => S.schreib(S.SCHLUESSEL.fahrzeug, fahrzeug)

/* ---------------- Positionen ---------------- */

function stammVon(p) {
  if (p.typ === 'sonder') {
    return { name: 'Sonderladungsträger', l: p.l, b: p.b, h: p.h, stapel: p.stapel || 1, gewicht: +p.gewicht || 0, frei: true }
  }
  const v = M.varOf(p.typ)
  if (!v) return { name: 'Nicht mehr in den Stammdaten', l: p.l || 0, b: p.b || 0, h: p.h || 0, stapel: p.stapel || 1, gewicht: +p.gewicht || 0, frei: true, verwaist: true }
  return { name: `${v.l} × ${v.b} × ${v.h}`, l: v.l, b: v.b, h: v.h, stapel: v.stapel, gewicht: v.gewicht, frei: false, v }
}

const aufgeloest = () => positionen.map(p => {
  const s = stammVon(p)
  return { menge: +p.menge || 0, l: s.l, b: s.b, h: s.h, stapel: s.stapel, gewicht: s.gewicht, name: s.name }
}).filter(p => p.l > 0 && p.b > 0 && p.h > 0)

function positionHinzu(art) {
  if (art === 'sonder') {
    positionen.push({ id: lfdId++, typ: 'sonder', menge: 1, l: 1200, b: 800, h: 1000, stapel: 1, gewicht: 0, nr: null })
  } else {
    const v = M.varianten()[0]
    if (!v) { meldung('posMsg', 'Noch keine Stammdaten – bitte zuerst Ladungsträger anlegen, importieren oder Beispieldaten laden.', 'err'); return }
    positionen.push({ id: lfdId++, typ: v.key, menge: 0, stapel: null, nr: v.ids[0] || null })
  }
  speichereSendung()
  zeichnePositionen()
  rechne()
}

function positionLoeschen(id) {
  positionen = positionen.filter(p => p.id !== id)
  speichereSendung()
  zeichnePositionen()
  rechne()
}

function positionSetzen(id, feld, wert) {
  const p = positionen.find(x => x.id === id)
  if (!p) return
  p[feld] = ['menge', 'stapel', 'l', 'b', 'h', 'gewicht'].includes(feld) ? (+wert || 0) : wert
  if (feld !== 'menge') zeichnePositionen()
  speichereSendung()
  rechne()
}

function typSetzen(id, wert) {
  const p = positionen.find(x => x.id === id)
  if (!p) return
  if (wert === 'sonder') {
    if (p.typ !== 'sonder') {
      const s = stammVon(p)
      Object.assign(p, { typ: 'sonder', l: s.l, b: s.b, h: s.h, stapel: s.stapel, gewicht: s.gewicht, nr: null })
    }
  } else {
    p.typ = wert
    p.stapel = null
    const v = M.varOf(wert)
    if (p.nr && (!v || !v.ids.includes(p.nr))) p.nr = null
  }
  speichereSendung()
  zeichnePositionen()
  rechne()
}

function alleLeeren() {
  if (!positionen.length) return
  if (!confirm('Alle Positionen der Sendung entfernen?')) return
  positionen = []
  speichereSendung()
  zeichnePositionen()
  rechne()
}

const speichereSendung = () => S.schreib(S.SCHLUESSEL.sendung, positionen)

function zeichnePositionen() {
  const tb = $('posBody')
  $('posLeerHinweis').hidden = !M.leer()
  if (!positionen.length) {
    tb.innerHTML = '<tr><td colspan="4" class="empty">Noch keine Position erfasst.</td></tr>'
    zeichneSchrittStand()
    return
  }
  const gruppen = M.gruppenHtml()
  tb.innerHTML = positionen.map(p => {
    const s = stammVon(p)
    const zeile = s.frei
      ? `<select data-typ="${p.id}" aria-label="Ladungsträger">${gruppen}</select>
         <div class="freimasse">
           <input type="number" value="${s.l}" title="Länge mm" data-pos="${p.id}" data-feld="l" aria-label="Länge mm">
           <input type="number" value="${s.b}" title="Breite mm" data-pos="${p.id}" data-feld="b" aria-label="Breite mm">
           <input type="number" value="${s.h}" title="Höhe mm" data-pos="${p.id}" data-feld="h" aria-label="Höhe mm">
           <input type="number" value="${s.gewicht}" min="0" step="0.1" title="Gewicht kg je Stück" data-pos="${p.id}" data-feld="gewicht" aria-label="Gewicht kg">
         </div>
         <div class="mini frei">${s.verwaist ? 'Stammsatz entfernt · ' : ''}Freie Maße · L / B / H in mm · Gewicht kg</div>`
      : `<select data-typ="${p.id}" aria-label="Ladungsträger">${gruppen}</select>
         <div class="mini">${p.nr ? `<span class="nrtag">${esc(p.nr)}</span>` : ''}${s.v.ids.length} ${s.v.ids.length === 1 ? 'Eintrag' : 'Einträge'}: ${esc(s.v.ids.slice(0, 3).join('  '))}${s.v.ids.length > 3 ? '  +' + (s.v.ids.length - 3) : ''}${s.gewicht ? ` · ${n1(s.gewicht)} kg${s.v.gewichtGemischt ? ' ø' : ''}` : ''}</div>`
    return `<tr data-pid="${p.id}">
      <td>${zeile}</td>
      <td class="num"><input class="mng" type="number" min="0" value="${p.menge}" data-pos="${p.id}" data-feld="menge" aria-label="Menge"></td>
      <td class="num">${s.frei
        ? `<input type="number" min="1" max="20" value="${s.stapel}" data-pos="${p.id}" data-feld="stapel" aria-label="Stapelfaktor">`
        : `<span class="fix">max. ${s.stapel}</span>`}</td>
      <td class="tdel"><button class="del noprint" title="Position entfernen" data-delpos="${p.id}">&times;</button></td>
    </tr>`
  }).join('')
  positionen.forEach(p => {
    const sel = tb.querySelector(`tr[data-pid="${p.id}"] select`)
    if (sel) sel.value = p.typ
  })
  zeichneSchrittStand()
}

/* ---------------- Schnellerfassung ---------------- */

function qeVorschau() {
  const el = $('qHint')
  const txt = $('qNr').value
  if (M.leer()) { el.className = 'qehint miss'; el.textContent = 'Noch keine Stammdaten vorhanden.'; return }
  if (!txt.trim()) { el.className = 'qehint'; el.innerHTML = 'ID, Bezeichnung oder Maß eintippen, Enter, Menge, Enter &#8211; fertig.'; return }
  const t = M.treffer(txt)
  if (!t) {
    el.className = 'qehint miss'
    el.textContent = `Kein Treffer für „${txt.trim()}“. Über die Auswahl in der Zeile lässt sich ein Sonderladungsträger anlegen.`
    return
  }
  el.className = 'qehint'
  el.innerHTML = `<b>${t.v.l}×${t.v.b}×${t.v.h} mm · Stapel ×${t.v.stapel}</b>`
    + (t.exakt ? ` · ${esc(t.id)}` : ` · ${t.anzahl} Variante${t.anzahl > 1 ? 'n' : ''} passen, erste gewählt`)
    + ` · ${t.v.ids.length} ${t.v.ids.length === 1 ? 'Eintrag' : 'Einträge'} in dieser Variante`
}

function qeTaste(ev, feld) {
  if (ev.key !== 'Enter') return
  ev.preventDefault()
  if (feld === 'nr') {
    if (M.treffer($('qNr').value)) { const m = $('qMenge'); m.focus(); m.select() }
  } else qeAdd()
}

function qeAdd() {
  const nrEl = $('qNr'), mEl = $('qMenge')
  const t = M.treffer(nrEl.value)
  if (!t) { qeVorschau(); nrEl.focus(); return }
  const menge = Math.max(1, +mEl.value || 1)
  positionen.push({ id: lfdId++, typ: t.v.key, menge, stapel: null, nr: t.id || t.v.ids[0] || null })
  nrEl.value = ''; mEl.value = ''
  qeVorschau()
  speichereSendung()
  zeichnePositionen()
  rechne()
  nrEl.focus()
}

function mengeTaste(ev, id) {
  if (ev.key !== 'Enter') return
  positionSetzen(id, 'menge', ev.target.value)
  const letzte = positionen[positionen.length - 1]
  if (letzte && letzte.menge > 0) {
    positionHinzu()
    const r = document.querySelector('#posBody tr:last-child .mng')
    if (r) { r.focus(); r.select() }
  }
}

/* ---------------- Versandliste einfügen ---------------- */

function versandlisteUebernehmen() {
  const zeilen = $('paste').value.split(/\r?\n/)
  let ok = 0
  const fail = []
  const istZahl = t => /^\d+$/.test(t)
  for (const roh of zeilen) {
    const zeile = roh.trim()
    if (!zeile) continue
    const tok = zeile.split(/[\t;,|]+|\s+/).map(t => t.trim()).filter(Boolean)
    const i = tok.findIndex(t => M.findeId(t))
    if (i < 0) { fail.push(zeile); continue }
    const e = M.findeId(tok[i])
    const v = M.varVonId(e.id)
    if (!v) { fail.push(zeile); continue }
    let menge = 1
    const davor = tok[i - 1], danach = tok[i + 1]
    if (davor && istZahl(davor) && !M.findeId(davor)) menge = +davor
    else if (danach && istZahl(danach) && !M.findeId(danach)) menge = +danach
    positionen.push({ id: lfdId++, typ: v.key, menge, stapel: null, nr: e.id })
    ok++
  }
  meldung('importPasteMsg', `${ok} Zeile(n) übernommen.`
    + (fail.length ? ` Ohne bekannte ID: ${fail.slice(0, 4).join(' · ')}${fail.length > 4 ? ' …' : ''}` : ''),
    ok ? 'ok' : 'err')
  speichereSendung()
  zeichnePositionen()
  rechne()
}

/* ---------------- Rechnen und ausgeben ---------------- */

function rechne() {
  const pos = aufgeloest()
  $('fLDM').value = n2((+$('fL').value || 0) / 1000)
  const p = planen({ positionen: pos, fahrzeug })
  const name = $('fzg').selectedOptions[0] ? $('fzg').selectedOptions[0].text : 'Fahrzeug'

  const kpiHtml = R.kennzahlen(p, name)
  const hinweisHtml = R.hinweise(p)
  $('kpis').innerHTML = kpiHtml
  $('kpis-plan').innerHTML = kpiHtml
  $('hinweise').innerHTML = hinweisHtml
  $('hinweise-plan').innerHTML = hinweisHtml
  $('plaene').innerHTML = R.ladeplaene(p)
  $('rechenweg').innerHTML = R.rechenweg(p)
  $('cmp').innerHTML = R.vergleich(pos, fahrzeug, p)

  const d = new Date()
  $('stand').textContent = `Stand ${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  $('tab-ladeplan-meta').textContent = p.lkw.length ? `${p.lkw.length} Fzg.` : '–'
}

/* ---------------- Meldungen ---------------- */

function meldung(id, text, art = 'ok') {
  const el = $(id)
  if (!el) return
  el.textContent = text
  el.className = 'msg ' + art
  el.hidden = !text
  if (art === 'ok') {
    clearTimeout(el._t)
    el._t = setTimeout(() => { el.hidden = true }, 4000)
  }
}

/* ---------------- Ereignisse ---------------- */

function verbindeEreignisse() {
  for (const v of ['stammdaten', 'sendung', 'ladeplan']) {
    $('tab-' + v).addEventListener('click', () => setzeAnsicht(v))
  }

  $('btnBeispiel').addEventListener('click', beispieldatenLaden)
  $('btnNeu').addEventListener('click', neuerLadungstraeger)
  $('btnExportCsv').addEventListener('click', () => exportiere('csv'))
  $('btnExportJson').addEventListener('click', () => exportiere('json'))
  $('btnReset').addEventListener('click', alleStammdatenLoeschen)
  $('btnDrucken').addEventListener('click', () => { setzeAnsicht('ladeplan'); setTimeout(() => window.print(), 60) })

  $('importDatei').addEventListener('change', e => importDateiGewaehlt(e.target.files[0]))
  $('btnImportText').addEventListener('click', () => importText($('importText').value))
  $('importVorschau').addEventListener('click', e => {
    const b = e.target.closest('[data-import]')
    if (b) importUebernehmen(b.dataset.import)
  })
  $('importVorschau').addEventListener('change', e => {
    const sel = e.target.closest('[data-map]')
    if (!sel || !importVorschau || importVorschau.json) return
    const idx = +sel.value
    if (idx < 0) delete importVorschau.zuordnung[sel.dataset.map]
    else {
      for (const [f, i] of Object.entries(importVorschau.zuordnung)) {
        if (i === idx && f !== sel.dataset.map) delete importVorschau.zuordnung[f]
      }
      importVorschau.zuordnung[sel.dataset.map] = idx
    }
    zeichneImport()
  })

  $('stammBody').addEventListener('change', e => {
    const inp = e.target.closest('input[data-feld]')
    if (inp) stammFeldGeaendert(inp.closest('tr'), inp.dataset.feld, inp.value)
  })
  $('stammBody').addEventListener('click', e => {
    const b = e.target.closest('[data-loesche]')
    if (b) loescheLadungstraeger(b.dataset.loesche)
  })

  $('fzg').addEventListener('change', fahrzeugWechsel)
  for (const id of ['fL', 'fB', 'fH', 'fN']) $(id).addEventListener('change', fahrzeugMassGeaendert)

  $('qNr').addEventListener('input', qeVorschau)
  $('qNr').addEventListener('keydown', e => qeTaste(e, 'nr'))
  $('qMenge').addEventListener('keydown', e => qeTaste(e, 'menge'))
  $('btnQeAdd').addEventListener('click', qeAdd)

  $('btnPos').addEventListener('click', () => positionHinzu())
  $('btnPosSonder').addEventListener('click', () => positionHinzu('sonder'))
  $('btnLeeren').addEventListener('click', alleLeeren)
  $('btnPaste').addEventListener('click', versandlisteUebernehmen)

  $('posBody').addEventListener('change', e => {
    const sel = e.target.closest('select[data-typ]')
    if (sel) { typSetzen(+sel.dataset.typ, sel.value); return }
    const inp = e.target.closest('input[data-pos]')
    if (inp) positionSetzen(+inp.dataset.pos, inp.dataset.feld, inp.value)
  })
  $('posBody').addEventListener('keydown', e => {
    const inp = e.target.closest('input.mng')
    if (inp) mengeTaste(e, +inp.dataset.pos)
  })
  $('posBody').addEventListener('click', e => {
    const b = e.target.closest('[data-delpos]')
    if (b) positionLoeschen(+b.dataset.delpos)
  })
}
