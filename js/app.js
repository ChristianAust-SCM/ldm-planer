/*
 * LAB 01 · LDM Planer — Oberfläche und Zustand.
 *
 * Hauptweg: Fahrzeug → Ladung erfassen → Ladeplan berechnen → Ergebnis.
 * Jede Position trägt ihre eigenen Maße; Stammdaten belegen nur vor und sind
 * damit reine Komfortfunktion. Alles läuft im Browser, nichts wird übertragen.
 */
import { n0, n1, n2, esc } from './format.js'
import * as M from './masterdata.js'
import * as S from './storage.js'
import { pruefeEintrag, pruefeListe, FELDER, PFLICHT, zahl } from './validate.js'
import { leseCsv, ausZeilen, wendeAn, schreibeCsv } from './import-csv.js'
import { leseXlsxZeilen, xlsxUnterstuetzt } from './xlsx-reader.js'
import { planen } from './ldm-core.js'
import * as R from './render-result.js'
import { verbinde as hilfeVerbinden } from './help.js'
import { BEISPIEL_LADUNGSTRAEGER } from '../data/beispieldaten.js'
import { FAHRZEUGE, KATEGORIEN, NICHT_UNTERSTUETZT, ALTE_IDS, fahrzeugOf } from '../data/fahrzeuge.js'
import { silhouetteFuer } from '../data/silhouetten.js'

const $ = id => document.getElementById(id)

/* ---------------- Zustand ---------------- */

const START_FAHRZEUG = 'krone_mega_liner_3000'
let fahrzeug = standardFahrzeug()
let positionen = []
let lfdId = 1
let berechnet = false
let bearbeiteId = null
let importVorschau = null

/* ---------------- Start ---------------- */

export function start() {
  const stamm = S.lies(S.SCHLUESSEL.stammdaten, null)
  M.setzeBestand(Array.isArray(stamm) ? stamm : [])

  fahrzeug = uebernehmeGespeichertesFahrzeug(S.lies(S.SCHLUESSEL.fahrzeug, null))
  fahrzeug.typ = typNachMassaenderung()

  positionen = uebernehmeGespeicherteSendung(S.lies(S.SCHLUESSEL.sendung, null))
  lfdId = positionen.reduce((m, p) => Math.max(m, +p.id || 0), 0) + 1
  berechnet = positionen.length > 0

  hilfeVerbinden()
  verbindeEreignisse()
  fuelleFahrzeugAuswahl()
  masseSichtbar(fahrzeug.typ === 'frei')
  zeichneAlles()
  scrollhinweise()

  if (!S.verfuegbar()) {
    meldung('speicherHinweis', 'Die lokale Speicherung ist in diesem Browser nicht verfügbar. Der Planer funktioniert, Eingaben gehen aber beim Schließen verloren.', 'warn')
  }
}

/**
 * Sendungen aus früheren Fassungen verwiesen über einen Variantenschlüssel auf
 * die Stammdaten. Heute trägt jede Position ihre Maße selbst — alte Stände
 * werden beim Laden einmalig übersetzt.
 */
function uebernehmeGespeicherteSendung(roh) {
  if (!Array.isArray(roh)) return []
  const raus = []
  for (const p of roh) {
    if (!p || typeof p !== 'object') continue
    if (p.l > 0 && p.b > 0 && p.h > 0) { raus.push({ ...p, gewicht: p.gewicht ?? null }); continue }
    const v = p.typ && p.typ !== 'sonder' ? M.varOf(p.typ) : null
    if (!v) continue
    raus.push({
      id: p.id, nr: p.nr || v.ids[0] || '', bezeichnung: (M.findeId(p.nr) || {}).bezeichnung || `${v.l} × ${v.b} × ${v.h}`,
      l: v.l, b: v.b, h: v.h, gewicht: v.gewicht || null, menge: +p.menge || 0, stapel: p.stapel || v.stapel
    })
  }
  return raus
}

/* ---------------- Ansichten ---------------- */

function setzeAnsicht(name) {
  $('view-planer').hidden = name !== 'planer'
  $('view-stammdaten').hidden = name !== 'stammdaten'
  $('btnStammdaten').textContent = name === 'stammdaten' ? 'Zum Planer' : 'Stammdaten verwalten'
  window.scrollTo({ top: 0, behavior: 'smooth' })
  if (name === 'stammdaten') zeichneStammdaten()
  scrollhinweise()
}

const istStammdatenAnsicht = () => !$('view-stammdaten').hidden

function zeichneAlles() {
  zeichneSendung()
  zeichneStammdaten()
  zeichneSuchStand()
  rechne()
}

/* ---------------- Fahrzeug ---------------- */

function standardFahrzeug() {
  const f = fahrzeugOf(START_FAHRZEUG)
  return { typ: f.id, l: f.l, b: f.b, h: f.h, nutzlast: f.nutzlast || 0 }
}

/**
 * Stände aus der ersten Fassung kannten die Vorlagen `mega`, `std`, `wb` und
 * `custom`. Die Maße des Nutzers bleiben unangetastet; nur die Vorlagen-ID wird
 * auf die recherchierte Nachfolgerin gehoben und anschließend neu abgeglichen.
 */
function uebernehmeGespeichertesFahrzeug(gespeichert) {
  if (!gespeichert || typeof gespeichert !== 'object') return standardFahrzeug()
  const f = { ...standardFahrzeug(), ...gespeichert }
  f.typ = ALTE_IDS[f.typ] || f.typ
  if (!fahrzeugOf(f.typ)) f.typ = 'frei'
  return f
}

let pickerOffen = false
let pickerFilter = 'alle'

function fuelleFahrzeugAuswahl() {
  const filter = [{ id: 'alle', kurz: 'Alle' }, ...KATEGORIEN.map(k => ({ id: k.id, kurz: k.kurz || k.name }))]
  $('fzgFilter').innerHTML = filter.map(f =>
    `<button type="button" class="filter-chip${f.id === pickerFilter ? ' on' : ''}" data-filter="${esc(f.id)}"
      aria-pressed="${f.id === pickerFilter}">${esc(f.kurz)}</button>`).join('')

  $('fzgGesperrt').innerHTML = NICHT_UNTERSTUETZT.map(x =>
    `<div class="gesperrt"><b>${esc(x.name)}</b><span class="gesperrt-status">Noch nicht unterstützt</span>
      <span class="gesperrt-grund">${esc(x.grund)}.</span></div>`).join('')

  zeichnePickerListe()
  zeichnePickerKnopf()
}

function zeichnePickerListe() {
  const sichtbar = FAHRZEUGE.filter(f => pickerFilter === 'alle' || f.kategorie === pickerFilter)
  $('fzgListe').innerHTML = sichtbar.map(f => {
    /* Höchstens zwei Etiketten, und nur für das Bemerkenswerte */
    const status = []
    if (f.status === 'richtwert') status.push('<span class="badge badge-richtwert">Richtwert</span>')
    if (f.radkaesten === true) status.push('<span class="badge badge-radkasten">Radkästen</span>')
    return `<li role="option" class="pz" data-id="${esc(f.id)}" tabindex="-1"
        aria-selected="${f.id === fahrzeug.typ}">
      <img class="pz-bild" src="${esc(silhouetteFuer(f.id))}" alt="" aria-hidden="true" width="46" height="29">
      <span class="pz-text">
        <span class="pz-primaer">${esc(f.anzeige)}</span>
        <span class="pz-sekundaer">${esc(f.referenz)}</span>
        <span class="pz-masse">${n0(f.l)} × ${n0(f.b)} × ${n0(f.h)} mm</span>
      </span>
      ${status.length ? `<span class="pz-status">${status.join('')}</span>` : ''}
    </li>`
  }).join('') || '<li class="pz-leer">Keine Vorlage in dieser Kategorie.</li>'
}

function zeichnePickerKnopf() {
  const f = fahrzeugOf(fahrzeug.typ) || fahrzeugOf('frei')
  $('fzgKnopfPrimaer').textContent = f.anzeige
  $('fzgKnopfSekundaer').textContent = f.referenz
  $('fzgKnopfBild').src = silhouetteFuer(f.id)
}

function pickerAuf() {
  if (pickerOffen) return
  pickerOffen = true
  $('fzgPanel').hidden = false
  $('fzgKnopf').setAttribute('aria-expanded', 'true')
  /* Die gewählte Vorlage sichtbar machen, auch wenn ein Filter aktiv war */
  const aktiv = $('fzgListe').querySelector('[aria-selected="true"]')
  if (aktiv) aktiv.scrollIntoView({ block: 'nearest' })
}

function pickerZu(zurueckAufKnopf = false) {
  if (!pickerOffen) return
  pickerOffen = false
  $('fzgPanel').hidden = true
  $('fzgKnopf').setAttribute('aria-expanded', 'false')
  if (zurueckAufKnopf) $('fzgKnopf').focus()
}

const pickerZeilen = () => [...$('fzgListe').querySelectorAll('.pz')]

function pickerBewege(von, richtung) {
  const zeilen = pickerZeilen()
  if (!zeilen.length) return
  const i = zeilen.indexOf(von)
  const ziel = richtung === 'erste' ? 0
    : richtung === 'letzte' ? zeilen.length - 1
    : Math.min(zeilen.length - 1, Math.max(0, i + richtung))
  zeilen[ziel].focus()
}

function pickerWaehle(id) {
  const f = fahrzeugOf(id)
  if (!f) return
  fahrzeug = { typ: f.id, l: f.l, b: f.b, h: f.h, nutzlast: f.nutzlast || 0 }
  masseSichtbar(f.id === 'frei')
  S.schreib(S.SCHLUESSEL.fahrzeug, fahrzeug)
  schreibeMassfelder()
  zeichnePickerListe()
  zeichnePickerKnopf()
  pickerZu(true)
  zeichneSendung()
  rechne()
}

function setzeFilter(id) {
  pickerFilter = id
  for (const b of $('fzgFilter').querySelectorAll('[data-filter]')) {
    const an = b.dataset.filter === id
    b.classList.toggle('on', an)
    b.setAttribute('aria-pressed', String(an))
  }
  zeichnePickerListe()
  /* Nach dem Filterwechsel oben beginnen, sonst steht der erste Treffer außerhalb */
  $('fzgListe').scrollTop = 0
}

function schreibeMassfelder() {
  $('fL').value = fahrzeug.l
  $('fB').value = fahrzeug.b
  $('fH').value = fahrzeug.h
  $('fN').value = fahrzeug.nutzlast || ''
  zeigeLdm()
  zeichneFahrzeugKarte()
  zeichnePickerKnopf()
}

function zeigeLdm() {
  $('fLDMText').textContent = fahrzeug.l > 0 ? `Ladelänge ${n2(fahrzeug.l / 1000)} m.` : ''
}

/**
 * Nach einer Maßänderung bleibt die gewählte Vorlage erhalten, solange ihre
 * Maße noch passen — mehrere Vorlagen teilen sich dieselbe Geometrie
 * (M6 und TA6 messen beide 4.300 × 2.030 × 2.000 mm).
 */
function typNachMassaenderung() {
  const aktuell = fahrzeugOf(fahrzeug.typ)
  const passt = f => f && f.id !== 'frei' && f.l === fahrzeug.l && f.b === fahrzeug.b && f.h === fahrzeug.h
  if (passt(aktuell)) return aktuell.id
  const treffer = FAHRZEUGE.find(passt)
  return treffer ? treffer.id : 'frei'
}

function fahrzeugMassGeaendert() {
  fahrzeug.l = +$('fL').value || 0
  fahrzeug.b = +$('fB').value || 0
  fahrzeug.h = +$('fH').value || 0
  fahrzeug.nutzlast = +$('fN').value || 0
  fahrzeug.typ = typNachMassaenderung()
  S.schreib(S.SCHLUESSEL.fahrzeug, fahrzeug)
  zeigeLdm()
  zeichneFahrzeugKarte()
  zeichnePickerKnopf()
  zeichnePickerListe()
  rechne()
}

const masseSichtbar = an => {
  $('masseBox').hidden = !an
  $('btnMasse').textContent = an ? 'Maße ausblenden' : 'Maße bearbeiten'
  $('btnMasse').setAttribute('aria-expanded', String(an))
}

const STATUS_TEXT = {
  konkret: 'Konkrete Vorlage',
  richtwert: 'Richtwert',
  frei: 'Eigene Maße'
}

function zeichneFahrzeugKarte() {
  const f = fahrzeugOf(fahrzeug.typ) || fahrzeugOf('frei')
  const kat = KATEGORIEN.find(k => k.id === f.kategorie)

  /* Der Picker trägt den nutzerorientierten Namen — die Karte den technischen */
  $('fzgName').textContent = f.aufbau
  $('fzgBild').src = silhouetteFuer(f.id)
  $('fzgKat').textContent = kat ? kat.name : ''
  $('fzgStatus').textContent = STATUS_TEXT[f.status] || ''
  $('fzgStatus').className = 'badge ' + (f.status === 'richtwert' ? 'badge-richtwert' : f.status === 'frei' ? 'badge-frei' : 'badge-konkret')

  /* Weichen die Maße von der Vorlage ab, steht die Auswahl bereits auf „Freie Maße" */
  $('fzgMasse').textContent = `${n0(fahrzeug.l)} × ${n0(fahrzeug.b)} × ${n0(fahrzeug.h)} mm`

  $('fzgNutzlast').innerHTML = fahrzeug.nutzlast
    ? `${n0(fahrzeug.nutzlast)} kg${f.nutzlastHinweis && fahrzeug.nutzlast === f.nutzlast ? `<span class="mini"> · ${esc(f.nutzlastHinweis)}</span>` : ''}`
    : '<span class="leer-wert">nicht vorbelegt</span>'

  $('fzgMerkmale').innerHTML = (f.besonderheiten || []).map(b => `<li>${esc(b)}</li>`).join('')

  const warnungen = []
  if (f.status === 'richtwert') {
    warnungen.push(`<div class="fzg-hinweis richtwert"><b>Richtwert</b>
      <span>Innenmaße vor Einsatz prüfen.${f.richtwertGrund ? ' ' + esc(f.richtwertGrund) : ''}</span></div>`)
  }
  if (f.radkaesten === true) {
    warnungen.push(`<div class="fzg-hinweis radkasten"><b>Radkästen vorhanden</b>
      <span>Die rechteckige Ladeflächenberechnung berücksichtigt die Radkästen derzeit nicht.
      Nutzbare Fläche am konkreten Fahrzeug prüfen.</span></div>`)
  }
  $('fzgWarnung').innerHTML = warnungen.join('')

  const box = $('fzgQuelleBox')
  if (f.quelle) {
    box.hidden = false
    $('fzgQuelle').innerHTML = `
      <p><b>Hersteller / Aufbau</b><br>${esc(f.aufbau)}</p>
      <p><b>Konfiguration</b><br>${esc(f.name)}</p>
      <p><b>Quelle</b><br>${esc(f.quelle.text)} ${esc(f.quelle.ref)}</p>
      <p class="mini">Vollständige Zuordnung und Quellenliste: docs/FAHRZEUGVORLAGEN.md</p>`
  } else {
    box.hidden = true
    box.open = false
    $('fzgQuelle').innerHTML = ''
  }
}

/* ---------------- Ladung erfassen ---------------- */

function reiter(name) {
  const manuell = name === 'manuell'
  $('tab-manuell').classList.toggle('on', manuell)
  $('tab-stamm').classList.toggle('on', !manuell)
  $('tab-manuell').setAttribute('aria-selected', String(manuell))
  $('tab-stamm').setAttribute('aria-selected', String(!manuell))
  $('form-manuell').hidden = !manuell
  $('form-stamm').hidden = manuell
  if (!manuell) { zeichneSuchStand(); $('qNr').focus() }
}

/** Liest das manuelle Formular und prüft es. */
function ausFormular() {
  const fehler = []
  const l = zahl($('mL').value), b = zahl($('mB').value), h = zahl($('mH').value)
  const menge = zahl($('mMenge').value), stapel = zahl($('mStapel').value)
  const gRoh = $('mG').value.trim()
  const gewicht = gRoh === '' ? null : zahl(gRoh)

  for (const [wert, name] of [[l, 'Länge'], [b, 'Breite'], [h, 'Höhe']]) {
    if (Number.isNaN(wert) || wert <= 0) fehler.push(`${name} in mm eintragen`)
  }
  if (Number.isNaN(menge) || menge < 1) fehler.push('Menge muss mindestens 1 sein')
  if (Number.isNaN(stapel) || stapel < 1) fehler.push('Stapelfaktor muss mindestens 1 sein')
  if (gewicht !== null && (Number.isNaN(gewicht) || gewicht < 0)) fehler.push('Gewicht ist keine gültige Zahl')

  if (fehler.length) return { ok: false, fehler }
  const bez = $('mBez').value.trim()
  return {
    ok: true,
    wert: {
      nr: $('mId').value.trim(),
      bezeichnung: bez || `${n0(l)} × ${n0(b)} × ${n0(h)} mm`,
      l: Math.round(l), b: Math.round(b), h: Math.round(h),
      gewicht, menge: Math.round(menge), stapel: Math.round(stapel)
    }
  }
}

function manuellHinzufuegen() {
  const r = ausFormular()
  if (!r.ok) { meldung('manuellMsg', r.fehler.join(' · '), 'err'); return }

  if (bearbeiteId !== null) {
    const i = positionen.findIndex(p => p.id === bearbeiteId)
    if (i >= 0) positionen[i] = { ...positionen[i], ...r.wert }
    bearbeiteId = null
    $('btnManuellAdd').textContent = '+ Zur Sendung hinzufügen'
    meldung('manuellMsg', 'Position aktualisiert.', 'ok')
  } else {
    positionen.push({ id: lfdId++, ...r.wert })
    meldung('manuellMsg', `„${r.wert.bezeichnung}“ hinzugefügt.`, 'ok')
  }

  if ($('mMerken').checked) merkeAlsStammdatensatz(r.wert)

  formularLeeren()
  berechnet = true
  speichereSendung()
  zeichneSendung()
  rechne()
  $('mBez').focus()
}

function merkeAlsStammdatensatz(w) {
  const id = w.nr || vorschlagId(w.bezeichnung)
  const pr = pruefeEintrag({
    id, bezeichnung: w.bezeichnung, laenge_mm: w.l, breite_mm: w.b, hoehe_mm: w.h,
    gewicht_kg: w.gewicht ?? 0, stapelfaktor_max: w.stapel
  }, { vorhandeneIds: new Set(M.alle().map(e => e.id)) })
  if (!pr.ok) { meldung('manuellMsg', `Nicht in die Stammdaten übernommen: ${pr.fehler.join(' · ')}`, 'warn'); return }
  M.fuegeHinzu(pr.wert)
  S.schreib(S.SCHLUESSEL.stammdaten, M.alle())
  zeichneSuchStand()
}

function vorschlagId(bezeichnung) {
  const stamm = (bezeichnung.replace(/[^A-Za-zÄÖÜäöü]/g, '').slice(0, 3).toUpperCase() || 'LT')
  const vorhanden = new Set(M.alle().map(e => e.id))
  let i = 1
  while (vorhanden.has(`${stamm}-${String(i).padStart(2, '0')}`)) i++
  return `${stamm}-${String(i).padStart(2, '0')}`
}

function formularLeeren() {
  for (const id of ['mBez', 'mId', 'mL', 'mB', 'mH', 'mG']) $(id).value = ''
  $('mMenge').value = '1'
  $('mStapel').value = '1'
  $('mMerken').checked = false
}

/* ---------------- Schnellerfassung aus Stammdaten ---------------- */

let qTreffer = null

function zeichneSuchStand() {
  const leer = M.leer()
  $('stammLeer').hidden = !leer
  $('stammSuche').hidden = leer
  if (!leer) qeVorschau()
}

function qeVorschau() {
  const el = $('qHint')
  const txt = $('qNr').value
  if (!txt.trim()) {
    qTreffer = null
    el.className = 'qehint'
    el.textContent = `${n0(M.anzahl())} Ladungsträger hinterlegt. ID eintippen, Enter, Menge, Enter.`
    return
  }
  const t = M.treffer(txt)
  qTreffer = t
  if (!t) {
    el.className = 'qehint miss'
    el.textContent = `Kein Treffer für „${txt.trim()}“. Über „Manuell eingeben“ lässt sich die Position trotzdem erfassen.`
    return
  }
  /* Bei exaktem ID-Treffer dessen Bezeichnung zeigen — mehrere Einträge können
     dieselben Maße haben und bilden dann eine gemeinsame Variante. */
  const genau = t.exakt && t.id ? M.findeId(t.id) : null
  const namen = t.v.ids.map(id => (M.findeId(id) || {}).bezeichnung).filter(Boolean)
  el.className = 'qehint treffer'
  el.innerHTML = `<b>${esc((genau && genau.bezeichnung) || namen[0] || '')}</b> · ${t.v.l} × ${t.v.b} × ${t.v.h} mm`
    + (t.v.gewicht ? ` · ${n1(t.v.gewicht)} kg` : ' · Gewicht nicht gepflegt')
    + ` · Stapel max. ${t.v.stapel}`
    + (t.v.ids.length > 1 ? ` · ${t.v.ids.length} Einträge mit diesen Maßen` : '')
  if (!$('qStapel').value || $('qStapel').dataset.auto === '1') {
    $('qStapel').value = t.v.stapel
    $('qStapel').dataset.auto = '1'
  }
}

function qeAdd() {
  const t = qTreffer || M.treffer($('qNr').value)
  if (!t) { qeVorschau(); $('qNr').focus(); return }
  const menge = Math.max(1, +$('qMenge').value || 1)
  const stapel = Math.max(1, +$('qStapel').value || t.v.stapel)
  const eintrag = M.findeId(t.id) || M.findeId(t.v.ids[0]) || {}
  positionen.push({
    id: lfdId++, nr: eintrag.id || '', bezeichnung: eintrag.bezeichnung || `${t.v.l} × ${t.v.b} × ${t.v.h} mm`,
    l: t.v.l, b: t.v.b, h: t.v.h, gewicht: t.v.gewicht || null, menge, stapel
  })
  $('qNr').value = ''; $('qMenge').value = '1'; $('qStapel').value = ''; $('qStapel').dataset.auto = '1'
  qTreffer = null
  qeVorschau()
  meldung('qMsg', `„${eintrag.bezeichnung || 'Position'}“ · ${n0(menge)} Stück hinzugefügt.`, 'ok')
  berechnet = true
  speichereSendung()
  zeichneSendung()
  rechne()
  $('qNr').focus()
}

/* ---------------- Sendung ---------------- */

const speichereSendung = () => S.schreib(S.SCHLUESSEL.sendung, positionen)
const stellplaetze = p => Math.ceil((+p.menge || 0) / Math.max(1, +p.stapel || 1))

function zeichneSendung() {
  const tb = $('posBody')
  const stueck = positionen.reduce((s, p) => s + (+p.menge || 0), 0)
  $('sendungMeta').textContent = positionen.length
    ? `${n0(positionen.length)} ${positionen.length === 1 ? 'Position' : 'Positionen'} · ${n0(stueck)} Stück`
    : ''

  if (!positionen.length) {
    tb.innerHTML = '<tr><td colspan="9" class="empty">Noch keine Position. Oben Maße eintragen und hinzufügen.</td></tr>'
  } else {
    tb.innerHTML = positionen.map((p, i) => p.id === bearbeiteId ? zeileBearbeiten(p, i) : zeileAnzeigen(p, i)).join('')
  }

  $('posTable').classList.toggle('ohne-id', !positionen.some(p => p.nr))

  const bereit = positionen.length > 0 && fahrzeug.l > 0 && fahrzeug.b > 0 && fahrzeug.h > 0
  $('btnRechnen').disabled = !bereit
  $('rechnenHinweis').textContent = bereit ? '' : 'Fahrzeugmaße und mindestens eine Position werden gebraucht.'
  scrollhinweise()
}

const zeileAnzeigen = (p, i) => `<tr data-pid="${p.id}">
  <td class="num">${i + 1}</td>
  <td>${p.nr ? `<span class="nrtag">${esc(p.nr)}</span>` : '<span class="leer-wert">–</span>'}</td>
  <td>${esc(p.bezeichnung)}</td>
  <td class="masszelle">${p.l}&#8239;×&#8239;${p.b}&#8239;×&#8239;${p.h}</td>
  <td class="num">${p.gewicht === null || p.gewicht === undefined || p.gewicht === '' ? '<span class="leer-wert" title="Gewicht nicht angegeben">–</span>' : (Number.isInteger(+p.gewicht) ? n0(p.gewicht) : n1(p.gewicht))}</td>
  <td class="num"><input class="mng" type="number" min="1" value="${p.menge}" data-pos="${p.id}" data-feld="menge" aria-label="Menge"></td>
  <td class="num"><input class="mng" type="number" min="1" max="20" value="${p.stapel}" data-pos="${p.id}" data-feld="stapel" aria-label="Stapelfaktor"></td>
  <td class="num">${n0(stellplaetze(p))}</td>
  <td class="tdel noprint"><span class="zeilen-akt">
    <button class="ibtn" data-bearbeite="${p.id}" title="Position bearbeiten" aria-label="Position ${i + 1} bearbeiten">&#9998;</button>
    <button class="ibtn" data-dupliziere="${p.id}" title="Position duplizieren" aria-label="Position ${i + 1} duplizieren">&#10697;</button>
    <button class="ibtn loeschen" data-loesche="${p.id}" title="Position entfernen" aria-label="Position ${i + 1} entfernen">&times;</button>
  </span></td>
</tr>`

const zeileBearbeiten = (p, i) => `<tr data-pid="${p.id}" class="bearbeiten-zeile">
  <td class="num">${i + 1}</td>
  <td colspan="8">In der Erfassungsmaske oben geöffnet — Werte ändern und „Position übernehmen“.</td>
</tr>`

function positionBearbeiten(id) {
  const p = positionen.find(x => x.id === id)
  if (!p) return
  bearbeiteId = id
  reiter('manuell')
  $('mBez').value = p.bezeichnung
  $('mId').value = p.nr || ''
  $('mL').value = p.l; $('mB').value = p.b; $('mH').value = p.h
  $('mG').value = p.gewicht === null || p.gewicht === undefined ? '' : p.gewicht
  $('mMenge').value = p.menge
  $('mStapel').value = p.stapel
  $('mMerken').checked = false
  $('btnManuellAdd').textContent = 'Position übernehmen'
  zeichneSendung()
  $('erfassenKarte').scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  $('mBez').focus()
}

function positionDuplizieren(id) {
  const p = positionen.find(x => x.id === id)
  if (!p) return
  const i = positionen.indexOf(p)
  positionen.splice(i + 1, 0, { ...p, id: lfdId++ })
  speichereSendung()
  zeichneSendung()
  rechne()
}

function positionLoeschen(id) {
  positionen = positionen.filter(p => p.id !== id)
  if (bearbeiteId === id) { bearbeiteId = null; $('btnManuellAdd').textContent = '+ Zur Sendung hinzufügen' }
  if (!positionen.length) berechnet = false
  speichereSendung()
  zeichneSendung()
  rechne()
}

function positionSetzen(id, feld, wert) {
  const p = positionen.find(x => x.id === id)
  if (!p) return
  p[feld] = Math.max(1, Math.round(+wert || 1))
  speichereSendung()
  zeichneSendung()
  rechne()
}

function sendungLeeren() {
  if (!positionen.length) return
  if (!confirm('Alle Positionen der Sendung entfernen?')) return
  positionen = []
  bearbeiteId = null
  berechnet = false
  speichereSendung()
  zeichneSendung()
  rechne()
}

/* ---------------- Rechnen ---------------- */

const kernPositionen = () => positionen
  .filter(p => p.l > 0 && p.b > 0 && p.h > 0 && p.menge > 0)
  .map(p => ({ menge: +p.menge, l: p.l, b: p.b, h: p.h, stapel: +p.stapel || 1, gewicht: +p.gewicht || 0, name: p.bezeichnung }))

function rechne() {
  const pos = kernPositionen()
  const zeigen = berechnet && pos.length > 0 && fahrzeug.l > 0 && fahrzeug.b > 0 && fahrzeug.h > 0
  $('ergebnisPlatzhalter').hidden = zeigen
  $('ergebnisInhalt').hidden = !zeigen
  if (!zeigen) return

  const p = planen({ positionen: pos, fahrzeug })
  const gewaehlt = fahrzeugOf(fahrzeug.typ)
  const name = gewaehlt ? gewaehlt.anzeige : 'Fahrzeug'
  const ohneGewicht = positionen.filter(x => x.gewicht === null || x.gewicht === undefined || x.gewicht === '').length

  $('kpis').innerHTML = R.kennzahlen(p, name, { ohneGewicht })
  $('hinweise').innerHTML = R.hinweise(p)
  $('plaene').innerHTML = R.ladeplaene(p)
  $('rechenweg').innerHTML = R.rechenweg(p)
  $('cmp').innerHTML = R.vergleich(pos, fahrzeug, p)
  scrollhinweise()
}

function berechnenGedrueckt() {
  berechnet = true
  rechne()
  const ziel = $('ergebnis')
  if (ziel) ziel.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ---------------- Stammdaten ---------------- */

function zeichneStammdaten() {
  const liste = M.alle()
  const k = M.kennzahlen()
  $('stammMeta').textContent = liste.length
    ? `${n0(k.eintraege)} Einträge · ${n0(k.varianten)} Maßvarianten · ${n0(k.grundflaechen)} Grundflächen`
    : 'Noch keine Stammdaten'

  const tb = $('stammBody')
  if (!liste.length) {
    tb.innerHTML = '<tr><td colspan="8" class="empty">Noch keine Stammdaten. Anlegen, importieren oder Beispieldaten laden — oder einfach ohne arbeiten.</td></tr>'
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
    <td class="tdel"><button class="ibtn loeschen" data-loeschestamm="${esc(e.id)}" title="Entfernen">&times;</button></td>
  </tr>`).join('')
}

function stammFeldGeaendert(tr, feld, wert) {
  const id = tr.dataset.sid
  const alt = M.findeId(id)
  if (!alt) return
  const andere = M.alle().filter(e => e.id !== id)
  const pr = pruefeEintrag({ ...alt, [feld]: wert }, { vorhandeneIds: new Set(andere.map(e => e.id)) })
  if (!pr.ok) { meldung('stammMsg', pr.fehler.join(' · '), 'err'); zeichneStammdaten(); return }
  M.aktualisiere(id, pr.wert)
  speichereStammdaten()
  meldung('stammMsg', 'Gespeichert.', 'ok')
  zeichneStammdaten()
  zeichneSuchStand()
}

function neuerLadungstraeger() {
  const vorhanden = new Set(M.alle().map(e => e.id))
  let i = M.anzahl() + 1
  while (vorhanden.has('LT-' + String(i).padStart(2, '0'))) i++
  M.fuegeHinzu({ id: 'LT-' + String(i).padStart(2, '0'), bezeichnung: 'Neuer Ladungsträger',
    laenge_mm: 1200, breite_mm: 800, hoehe_mm: 1000, gewicht_kg: 0, stapelfaktor_max: 1, kategorie: '' })
  speichereStammdaten()
  zeichneStammdaten()
  zeichneSuchStand()
  meldung('stammMsg', 'Angelegt — Bezeichnung und Maße anpassen.', 'ok')
  const feld = document.querySelector('#stammBody tr:last-child input[data-feld="bezeichnung"]')
  if (feld) { feld.focus(); feld.select() }
}

function stammLoeschen(id) {
  M.entferne(id)
  speichereStammdaten()
  zeichneStammdaten()
  zeichneSuchStand()
  meldung('stammMsg', `„${id}“ gelöscht. Bereits erfasste Positionen bleiben unberührt.`, 'ok')
}

function beispieldatenLaden(ausPlaner = false) {
  if (!M.leer() && !confirm('Die vorhandenen Stammdaten werden durch den Beispieldatensatz ersetzt. Fortfahren?')) return
  M.setzeBestand(BEISPIEL_LADUNGSTRAEGER)
  speichereStammdaten()
  zeichneStammdaten()
  zeichneSuchStand()
  meldung(ausPlaner ? 'qMsg' : 'stammMsg', `${M.anzahl()} neutrale Beispiel-Ladungsträger geladen.`, 'ok')
}

function allesZuruecksetzen() {
  if (!confirm('Stammdaten, Sendung und Fahrzeugeinstellung werden vollständig aus dem Browser entfernt. Das lässt sich nicht rückgängig machen. Fortfahren?')) return
  M.setzeBestand([])
  positionen = []
  bearbeiteId = null
  berechnet = false
  fahrzeug = standardFahrzeug()
  S.alleLoeschen()
  fuelleFahrzeugAuswahl()
  zeichneAlles()
  meldung('stammMsg', 'Alles zurückgesetzt.', 'ok')
}

const speichereStammdaten = () => S.schreib(S.SCHLUESSEL.stammdaten, M.alle())

function exportiere(format) {
  if (M.leer()) { meldung('stammMsg', 'Keine Stammdaten zum Exportieren.', 'err'); return }
  const stempel = S.heuteStempel()
  if (format === 'csv') S.speichereDatei(`ldm-stammdaten-${stempel}.csv`, schreibeCsv(M.alle()), 'text/csv')
  else S.speichereDatei(`ldm-stammdaten-${stempel}.json`, JSON.stringify({ version: 1, exportiert: stempel, ladungstraeger: M.alle() }, null, 2))
  meldung('stammMsg', `Export als ${format.toUpperCase()} gestartet.`, 'ok')
}

/* ---------------- Import ---------------- */

async function dateiGewaehlt(datei) {
  if (!datei) return
  $('dateiName').textContent = datei.name
  const endung = (datei.name.split('.').pop() || '').toLowerCase()
  try {
    if (endung === 'xlsx') {
      if (!xlsxUnterstuetzt()) {
        meldung('importMsg', 'Dieser Browser kann XLSX nicht entpacken. Die Datei bitte als CSV speichern.', 'err')
        return
      }
      const zeilen = await leseXlsxZeilen(await datei.arrayBuffer())
      if (!zeilen.length) { meldung('importMsg', 'Das erste Tabellenblatt enthält keine Daten.', 'err'); return }
      importVorschau = { ...ausZeilen(zeilen), quelle: datei.name, art: 'XLSX' }
      meldung('importMsg', '', 'ok')
      zeichneImport()
      return
    }
    const text = await datei.text()
    importText(text, datei.name)
  } catch (e) {
    meldung('importMsg', `Datei konnte nicht gelesen werden: ${e.message}`, 'err')
  }
}

function importText(text, quelle = 'Eingefügter Text') {
  if (!text.trim()) { meldung('importMsg', 'Kein Inhalt gefunden.', 'err'); return }
  const roh = text.trim()
  if (roh.startsWith('{') || roh.startsWith('[')) return importJson(text, quelle)
  const gelesen = leseCsv(text)
  if (!gelesen.zeilen.length) { meldung('importMsg', 'Keine Datenzeilen gefunden.', 'err'); return }
  importVorschau = { ...gelesen, quelle, art: 'CSV' }
  meldung('importMsg', '', 'ok')
  zeichneImport()
}

function importJson(text, quelle) {
  try {
    const roh = JSON.parse(text)
    const liste = Array.isArray(roh) ? roh : (roh.ladungstraeger || roh.stammdaten || [])
    if (!Array.isArray(liste) || !liste.length) throw new Error('keine Liste')
    importVorschau = { json: true, quelle, art: 'JSON', geprueft: pruefeListe(liste), anzahl: liste.length }
    zeichneImport()
  } catch {
    meldung('importMsg', 'Die Datei ist kein gültiger JSON-Export dieser App.', 'err')
  }
}

const feldLabel = f => ({
  id: 'ID', bezeichnung: 'Bezeichnung', laenge_mm: 'Länge mm', breite_mm: 'Breite mm',
  hoehe_mm: 'Höhe mm', gewicht_kg: 'Gewicht kg', stapelfaktor_max: 'Stapel max.', kategorie: 'Kategorie'
}[f] || f)

function zeichneImport() {
  const box = $('importVorschau')
  if (!importVorschau) { box.hidden = true; box.innerHTML = ''; return }
  box.hidden = false

  if (importVorschau.json) {
    const { geprueft, quelle, anzahl } = importVorschau
    box.innerHTML = `<h4>Vorschau · ${esc(quelle)}</h4>
      <p class="imeta">${n0(anzahl)} Datensätze gelesen · <b>${n0(geprueft.gueltig.length)} gültig</b>${geprueft.abgelehnt.length ? ` · ${n0(geprueft.abgelehnt.length)} abgelehnt` : ''}</p>
      ${fehlerListe(geprueft.abgelehnt)}${uebernahmeKnoepfe(geprueft.gueltig.length)}`
    return
  }

  const { kopf, zeilen, zuordnung, kopfErkannt, quelle, trenn, art } = importVorschau
  const geprueft = pruefeListe(wendeAn(zeilen, zuordnung))
  importVorschau.geprueft = geprueft

  const auswahl = feld => `<select data-map="${feld}">
      <option value="-1">— nicht zuordnen —</option>
      ${kopf.map((h, i) => `<option value="${i}"${zuordnung[feld] === i ? ' selected' : ''}>${esc(h)}</option>`).join('')}
    </select>`
  const trennName = { ';': 'Semikolon', ',': 'Komma', '\t': 'Tabulator', '|': 'Senkrechtstrich' }[trenn]

  box.innerHTML = `<h4>Vorschau · ${esc(quelle)}</h4>
    <p class="imeta">${esc(art)} · ${n0(zeilen.length)} Datenzeilen${trennName ? ` · Trennzeichen ${esc(trennName)}` : ''}
      · Kopfzeile ${kopfErkannt ? 'erkannt' : 'nicht erkannt, Spalten durchnummeriert'}</p>
    <div class="maprid">
      ${FELDER.map(f => `<label class="maprow"><span>${esc(feldLabel(f))}${PFLICHT.includes(f) ? ' <i>*</i>' : ''}</span>${auswahl(f)}</label>`).join('')}
    </div>
    <p class="imeta"><b>${n0(geprueft.gueltig.length)} gültig</b>${geprueft.abgelehnt.length ? ` · ${n0(geprueft.abgelehnt.length)} abgelehnt` : ''}</p>
    ${geprueft.gueltig.length ? `<div class="tscroll"><table class="prev"><thead><tr>${FELDER.map(f => `<th>${esc(feldLabel(f))}</th>`).join('')}</tr></thead><tbody>
      ${geprueft.gueltig.slice(0, 5).map(e => `<tr>${FELDER.map(f => `<td>${esc(e[f])}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>${geprueft.gueltig.length > 5 ? `<p class="imeta">… und ${n0(geprueft.gueltig.length - 5)} weitere</p>` : ''}` : ''}
    ${fehlerListe(geprueft.abgelehnt)}${uebernahmeKnoepfe(geprueft.gueltig.length)}`
}

function fehlerListe(abgelehnt) {
  if (!abgelehnt.length) return ''
  const zeigen = abgelehnt.slice(0, 6)
  return `<div class="ifehler"><b>Abgelehnte Zeilen</b><ul>
    ${zeigen.map(a => `<li>Zeile ${a.zeile}: ${esc(a.fehler.join(' · '))}</li>`).join('')}
    ${abgelehnt.length > zeigen.length ? `<li>… und ${n0(abgelehnt.length - zeigen.length)} weitere</li>` : ''}
  </ul></div>`
}

const uebernahmeKnoepfe = g => `<div class="ibtns">
    <button class="btn" data-import="ersetzen"${g ? '' : ' disabled'}>${n0(g)} übernehmen und ersetzen</button>
    <button class="btn-sec" data-import="anhaengen"${g ? '' : ' disabled'}>An Bestand anhängen</button>
    <button class="btn-sec" data-import="abbrechen">Abbrechen</button>
  </div>`

function importUebernehmen(modus) {
  if (!importVorschau || !importVorschau.geprueft) return
  if (modus === 'abbrechen') { importAbbrechen(); return }

  if (modus === 'anhaengen') {
    const bestand = M.alle()
    const nochmal = pruefeListe(importVorschau.geprueft.gueltig.map(e => ({ ...e })), { bestand })
    if (nochmal.abgelehnt.length) {
      meldung('importMsg', `${nochmal.abgelehnt.length} Datensätze übersprungen: ID bereits im Bestand.`, 'warn')
    }
    M.setzeBestand([...bestand, ...nochmal.gueltig])
  } else {
    M.setzeBestand(importVorschau.geprueft.gueltig)
  }
  speichereStammdaten()
  importAbbrechen()
  zeichneStammdaten()
  zeichneSuchStand()
  meldung('stammMsg', `Import übernommen: ${n0(M.anzahl())} Ladungsträger im Bestand.`, 'ok')
}

function importAbbrechen() {
  importVorschau = null
  $('importVorschau').hidden = true
  $('importVorschau').innerHTML = ''
  $('importDatei').value = ''
  $('importText').value = ''
  $('dateiName').textContent = ''
}

/* ---------------- Kleinkram ---------------- */

function meldung(id, text, art = 'ok') {
  const el = $(id)
  if (!el) return
  el.textContent = text
  el.className = 'msg ' + art
  el.hidden = !text
  if (art === 'ok' && text) {
    clearTimeout(el._t)
    el._t = setTimeout(() => { el.hidden = true }, 4000)
  }
}

/** Blendet unter breiten Tabellen und Ladeplänen einen Scrollhinweis ein. */
function scrollhinweise() {
  for (const box of document.querySelectorAll('[data-scrollhinweis]')) {
    let hinweis = box.nextElementSibling
    if (!hinweis || !hinweis.classList.contains('scrollhinweis')) {
      hinweis = document.createElement('p')
      hinweis.className = 'scrollhinweis'
      hinweis.textContent = '← seitlich scrollen für alle Spalten →'
      box.after(hinweis)
    }
    hinweis.classList.toggle('an', box.scrollWidth > box.clientWidth + 4)
  }
}

/* ---------------- Ereignisse ---------------- */

function verbindeEreignisse() {
  $('btnStammdaten').addEventListener('click', () => setzeAnsicht(istStammdatenAnsicht() ? 'planer' : 'stammdaten'))
  $('btnZurueckPlaner').addEventListener('click', () => setzeAnsicht('planer'))
  $('btnDrucken').addEventListener('click', () => {
    if (!berechnet) berechnenGedrueckt()
    setzeAnsicht('planer')
    setTimeout(() => window.print(), 120)
  })

  $('fzgKnopf').addEventListener('click', () => (pickerOffen ? pickerZu() : pickerAuf()))
  $('fzgKnopf').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pickerAuf()
      const zeilen = pickerZeilen()
      const aktiv = $('fzgListe').querySelector('[aria-selected="true"]')
      ;(aktiv || zeilen[0])?.focus()
    }
  })
  $('fzgFilter').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]')
    if (b) setzeFilter(b.dataset.filter)
  })
  $('fzgListe').addEventListener('click', e => {
    const li = e.target.closest('.pz')
    if (li) pickerWaehle(li.dataset.id)
  })
  $('fzgListe').addEventListener('keydown', e => {
    const li = e.target.closest('.pz')
    if (!li) return
    const tasten = { ArrowDown: 1, ArrowUp: -1, Home: 'erste', End: 'letzte' }
    if (e.key in tasten) { e.preventDefault(); pickerBewege(li, tasten[e.key]); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickerWaehle(li.dataset.id) }
  })
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pickerOffen) pickerZu(true) })
  document.addEventListener('click', e => { if (pickerOffen && !e.target.closest('#fzgPicker')) pickerZu() })
  document.addEventListener('focusin', e => { if (pickerOffen && !e.target.closest('#fzgPicker')) pickerZu() })
  $('btnMasse').addEventListener('click', () => {
    const an = $('masseBox').hidden
    masseSichtbar(an)
    if (an) $('fL').focus()
  })
  for (const id of ['fL', 'fB', 'fH', 'fN']) {
    $(id).addEventListener('change', fahrzeugMassGeaendert)
    $(id).addEventListener('input', () => { zeichneSendung() })
  }

  $('tab-manuell').addEventListener('click', () => reiter('manuell'))
  $('tab-stamm').addEventListener('click', () => reiter('stamm'))
  $('btnManuellAdd').addEventListener('click', manuellHinzufuegen)
  $('form-manuell').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); manuellHinzufuegen() }
  })

  $('btnBeispielSchnell').addEventListener('click', () => beispieldatenLaden(true))
  $('qNr').addEventListener('input', qeVorschau)
  $('qNr').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (qTreffer) { $('qMenge').focus(); $('qMenge').select() }
  })
  $('qMenge').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); qeAdd() } })
  $('qStapel').addEventListener('input', () => { $('qStapel').dataset.auto = '0' })
  $('qStapel').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); qeAdd() } })
  $('btnQeAdd').addEventListener('click', qeAdd)

  $('btnRechnen').addEventListener('click', berechnenGedrueckt)
  $('btnLeeren').addEventListener('click', sendungLeeren)

  $('posBody').addEventListener('change', e => {
    const inp = e.target.closest('input[data-pos]')
    if (inp) positionSetzen(+inp.dataset.pos, inp.dataset.feld, inp.value)
  })
  $('posBody').addEventListener('click', e => {
    const b = e.target.closest('[data-bearbeite]'); if (b) return positionBearbeiten(+b.dataset.bearbeite)
    const d = e.target.closest('[data-dupliziere]'); if (d) return positionDuplizieren(+d.dataset.dupliziere)
    const l = e.target.closest('[data-loesche]'); if (l) return positionLoeschen(+l.dataset.loesche)
  })

  $('btnNeu').addEventListener('click', neuerLadungstraeger)
  $('btnBeispiel').addEventListener('click', () => beispieldatenLaden(false))
  $('btnExportCsv').addEventListener('click', () => exportiere('csv'))
  $('btnExportJson').addEventListener('click', () => exportiere('json'))
  $('btnReset').addEventListener('click', allesZuruecksetzen)
  $('stammBody').addEventListener('change', e => {
    const inp = e.target.closest('input[data-feld]')
    if (inp) stammFeldGeaendert(inp.closest('tr'), inp.dataset.feld, inp.value)
  })
  $('stammBody').addEventListener('click', e => {
    const b = e.target.closest('[data-loeschestamm]')
    if (b) stammLoeschen(b.dataset.loeschestamm)
  })

  $('importDatei').addEventListener('change', e => dateiGewaehlt(e.target.files[0]))
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

  window.addEventListener('resize', scrollhinweise)

  /* Ein geschlossenes <details> druckt seinen Inhalt nicht — vor dem Druck öffnen */
  window.addEventListener('beforeprint', () => {
    for (const d of document.querySelectorAll('#detailsKarte, .hinweisbox')) {
      d.dataset.warOffen = d.open ? '1' : '0'
      d.open = true
    }
  })
  window.addEventListener('afterprint', () => {
    for (const d of document.querySelectorAll('#detailsKarte, .hinweisbox')) {
      if (d.dataset.warOffen === '0') d.open = false
    }
  })
}
