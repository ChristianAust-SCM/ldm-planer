/*
 * Ergebnisdarstellung: Kennzahlen, Hinweise, Ladepläne, Rechenweg,
 * Stapelfaktorvergleich. Aufbau aus der Ursprungsfassung, ergänzt um
 * Gewicht und Nutzlast.
 */
import { n0, n1, n2, esc, gName } from './format.js'
import { planen, stapelText, restText } from './ldm-core.js'
import { svgDraufsicht, svgSeite } from './render-plan.js'
import { HB } from './help.js'

export function kennzahlen(p, fahrzeugName) {
  const anzahl = p.lkw.length
  const auslGes = anzahl ? p.gesamt / (anzahl * p.kapa) : 0
  const letzter = anzahl ? p.lkw[anzahl - 1] : null
  const gewichtKarte = p.nutzlast > 0
    ? `<div class="kpi${p.ueberladen ? ' warn' : ''}"><div class="k">Gewicht${HB('gewicht')}</div><div class="v">${n0(p.gewicht)}</div>
        <div class="s">kg von ${n0(p.nutzlast * Math.max(anzahl, 1))} kg zulässig</div></div>`
    : `<div class="kpi"><div class="k">Gewicht${HB('gewicht')}</div><div class="v">${n0(p.gewicht)}</div>
        <div class="s">kg gesamt · keine Nutzlast gesetzt</div></div>`

  return `
    <div class="kpi"><div class="k">Ladelänge${HB('ldm')}</div><div class="v">${n2(p.gesamt)}</div>
      <div class="s">von ${n2(anzahl * p.kapa || p.kapa)} m verfügbar</div></div>
    <div class="kpi"><div class="k">Benötigte Fahrzeuge</div><div class="v">${anzahl}</div>
      <div class="s">${esc(fahrzeugName)}</div></div>
    <div class="kpi"><div class="k">Auslastung${HB('auslastung')}</div><div class="v">${n1(auslGes * 100)}&thinsp;%</div>
      <div class="s">${n0(p.stueck)} Ladungsträger</div></div>
    <div class="kpi accent"><div class="k">Frei auf letztem Fzg.${HB('rest')}</div><div class="v">${letzter ? n2(letzter.rest) : '0,00'}</div>
      <div class="s">Meter Ladelänge</div></div>
    ${gewichtKarte}`
}

export function hinweise(p) {
  if (!p.hinweise.length) return ''
  return p.hinweise.map(h => `<div class="note ${h.t}"><b>${esc(h.k)}${h.k === 'Mischhöhen' ? HB('mischhoehen') : ''}${h.k === 'Nutzlast' ? HB('nutzlast') : ''}</b><span>${esc(h.s)}</span></div>`).join('')
}

const legende = g => `<span><i style="background:${g.farbe}"></i>${esc(gName(g))} &#183; `
  + `${n0(g.menge)} Stück auf ${n0(g.stellplaetze)} Stellpl. &#183; ${esc(stapelText(g))}</span>`

export function ladeplaene(p) {
  if (!p.lkw.length) {
    return '<div class="card"><div class="empty">Positionen erfassen, dann erscheint hier der Ladeplan.</div></div>'
  }
  const anzahl = p.lkw.length
  return p.lkw.map(t => {
    const gewichtZeile = p.gewicht > 0
      ? `<div class="note ${t.ueberladen ? 'warn' : 'info'}" style="margin-top:7px"><b>Gewicht</b><span>${n0(t.gewicht)} kg`
        + (p.nutzlast > 0
          ? t.ueberladen
            ? ` – ${n0(t.gewicht - p.nutzlast)} kg über der Nutzlast von ${n0(p.nutzlast)} kg.`
            : ` von ${n0(p.nutzlast)} kg Nutzlast, ${n0(t.nutzlastFrei)} kg frei.`
          : ' geplant. Für eine Prüfung eine Nutzlast beim Fahrzeug eintragen.')
        + '</span></div>'
      : ''
    return `
    <div class="card truckblk">
      <div class="truckhd">
        <h3>Ladeplan &#183; Fahrzeug ${t.nr} von ${anzahl}</h3>
        <div class="meta">${n2(t.belegt)} / ${n2(p.kapa)} m &#183; ${n1(t.ausl * 100)}&thinsp;%</div>
      </div>
      <div class="bar">
        ${t.reihen.map(r => `<div style="background:${r.g.farbe};width:${(r.tief / p.kapa * 100).toFixed(3)}%"></div>`).join('')}
        ${t.rest > 0.005 ? `<div class="barfrei" style="width:${(t.rest / p.kapa * 100).toFixed(3)}%"></div>` : ''}
      </div>
      <div class="tscroll">${svgDraufsicht(t, p.kapa, p.f.b / 1000)}${svgSeite(t, p.kapa, p.f.h / 1000)}</div>
      <div class="legend">${p.gruppen.filter(g => t.reihen.some(r => r.g === g)).map(legende).join('')}
        <span><i class="ifrei"></i>ungenutzt</span></div>
      <div class="note info" style="margin-top:12px"><b>Restkapazität</b><span>${esc(restText(t, p.gruppen))}</span></div>
      ${gewichtZeile}
    </div>`
  }).join('')
}

export function rechenweg(p) {
  if (!p.gruppen.length) return '<div class="empty">Noch keine Mengen erfasst.</div>'
  const zeigeGewicht = p.gewicht > 0
  return `
    <div class="tscroll"><table><thead><tr>
      <th>Grundfläche</th><th class="num">Stück</th><th class="num">Stapel max.${HB('stapel')}</th><th class="num">Stellpl.${HB('stellplatz')}</th>
      <th>Ausrichtung${HB('ausrichtung')}</th><th class="num">je Reihe</th><th class="num">Reihen</th><th class="num">Länge m</th>
      ${zeigeGewicht ? '<th class="num">Gewicht kg</th>' : ''}
    </tr></thead><tbody>
    ${p.gruppen.map(g => `<tr>
      <td><span class="chip" style="background:${g.farbe}"></span>${n0(g.l)} × ${n0(g.b)} mm
        <div class="mini">${g.hoehen.size === 1 ? 'Höhe ' + n0(g.hMax) + ' mm' : 'Höhen ' + n0(Math.min(...g.hoehen)) + '–' + n0(g.hMax) + ' mm'}</div></td>
      <td class="num">${n0(g.menge)}</td>
      <td class="num">${g.stapel}${g.stapel > 1 ? '' : '<div class="mini">nicht stapelbar</div>'}</td>
      <td class="num">${n0(g.stellplaetze)}<div class="mini">${esc(stapelText(g))}</div></td>
      <td>${n0(g.a.quer)} mm quer<div class="mini">${n2(g.a.ldm)} m je Stellplatz</div></td>
      <td class="num">${g.a.proReihe}</td><td class="num">${n0(g.reihen)}</td><td class="num">${n2(g.laenge)}</td>
      ${zeigeGewicht ? `<td class="num">${n0(g.gewichtSumme)}${g.gewichtProStueck ? `<div class="mini">${n1(g.gewichtProStueck)} je Stück</div>` : ''}</td>` : ''}
    </tr>`).join('')}
    <tr class="sum"><td>Summe</td><td class="num">${n0(p.stueck)}</td><td class="num">–</td>
      <td class="num">${n0(p.gruppen.reduce((s, g) => s + g.stellplaetze, 0))}</td><td></td><td class="num">–</td>
      <td class="num">${n0(p.gruppen.reduce((s, g) => s + g.reihen, 0))}</td><td class="num">${n2(p.gesamt)}</td>
      ${zeigeGewicht ? `<td class="num">${n0(p.gewicht)}</td>` : ''}</tr>
    </tbody></table></div>
    <p class="fuss">Aufgerundet wird je Grundfläche, nicht je Position – Stapeln über Positionen hinweg ist bei gleicher Grundfläche zulässig.</p>`
}

export function vergleich(positionen, fahrzeug, p) {
  return [1, 2, 3].map(s => {
    const v = planen({ positionen, fahrzeug, stapelUeberschreibung: s })
    const akt = p.gruppen.length && p.gruppen.every(g => g.stapel === s)
    return `<div class="c${akt ? ' cur' : ''}">
      <div class="t">${akt ? 'Aktuell &#183; ' : ''}Stapelfaktor ${s}</div>
      <div class="b">${v.lkw.length} Fzg.</div>
      <div class="s">${n2(v.gesamt)} m Ladelänge</div></div>`
  }).join('')
}
