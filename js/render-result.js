/*
 * Ergebnisdarstellung: Kennzahlen, Hinweise, Ladepläne, Rechenweg,
 * Stapelfaktorvergleich. Aufbau aus der Ursprungsfassung, ergänzt um
 * Gewicht und Nutzlast.
 */
import { n0, n1, n2, esc, gName } from './format.js'
import { planen, stapelText, restText } from './ldm-core.js'
import { svgDraufsicht, svgSeite } from './render-plan.js'
import { HB } from './help.js'

export function kennzahlen(p, fahrzeugName, { ohneGewicht = 0 } = {}) {
  const anzahl = p.lkw.length
  const auslGes = anzahl ? p.gesamt / (anzahl * p.kapa) : 0
  const letzter = anzahl ? p.lkw[anzahl - 1] : null

  /* Nutzlast: eigener Status statt einer Zahl, die man erst deuten muss */
  let last
  if (!p.nutzlast) {
    last = `<div class="kpi"><div class="k">Nutzlast${HB('nutzlast')}</div><div class="v klein">nicht gesetzt</div>
      <div class="s">Beim Fahrzeug eintragen, dann wird geprüft</div></div>`
  } else if (p.ueberladen) {
    const schlimmster = p.lkw.reduce((a, t) => Math.max(a, t.gewicht - p.nutzlast), 0)
    last = `<div class="kpi warn"><div class="k">Nutzlast${HB('nutzlast')}</div><div class="v klein">überschritten</div>
      <div class="s">bis zu ${n0(schlimmster)}&nbsp;kg über ${n0(p.nutzlast)}&nbsp;kg</div></div>`
  } else {
    const engste = p.lkw.reduce((a, t) => Math.min(a, t.nutzlastFrei ?? Infinity), Infinity)
    last = `<div class="kpi gut"><div class="k">Nutzlast${HB('nutzlast')}</div><div class="v klein">eingehalten</div>
      <div class="s">${Number.isFinite(engste) ? n0(engste) + '&nbsp;kg frei' : ''} von ${n0(p.nutzlast)}&nbsp;kg</div></div>`
  }

  const gewichtZusatz = ohneGewicht
    ? `${n0(ohneGewicht)} ${ohneGewicht === 1 ? 'Position' : 'Positionen'} ohne Gewicht`
    : 'kg gesamt'

  return `
    <div class="kpi"><div class="k">Benötigte Fahrzeuge</div><div class="v">${anzahl}</div>
      <div class="s">${esc(fahrzeugName)}</div></div>
    <div class="kpi"><div class="k">Benötigte Ladelänge (m)${HB('ladelaenge')}</div><div class="v">${n2(p.gesamt)}</div>
      <div class="s">von ${n2(anzahl * p.kapa || p.kapa)}&nbsp;m verfügbar</div></div>
    <div class="kpi"><div class="k">LDM${HB('ldm')}</div><div class="v">${n2(p.ldm)}</div>
      <div class="s">flächenbasiert · Bezug ${n2(p.ldmBreite)}&nbsp;m</div></div>
    <div class="kpi accent"><div class="k">Freie Ladelänge (m)${HB('rest')}</div><div class="v">${letzter ? n2(letzter.rest) : '0,00'}</div>
      <div class="s">auf dem letzten Fahrzeug</div></div>
    <div class="kpi"><div class="k">Auslastung${HB('auslastung')}</div><div class="v">${n1(auslGes * 100)}&thinsp;%</div>
      <div class="s">${n0(p.stueck)} Ladungsträger</div></div>
    <div class="kpi"><div class="k">Gesamtgewicht${HB('gewicht')}</div><div class="v">${n0(p.gewicht)}</div>
      <div class="s">${esc(gewichtZusatz)}</div></div>
    ${last}`
}

const notiz = h => `<div class="note ${h.t}"><b>${esc(h.k)}`
  + `${h.k === 'Mischhöhen' ? HB('mischhoehen') : ''}${h.k === 'Nutzlast' ? HB('nutzlast') : ''}</b>`
  + `<span>${esc(h.s)}</span></div>`

/**
 * Warnungen und Fehler stehen immer offen. Die vielen Hinweise zur Ausnutzung
 * würden bei zahlreichen Grundflächen den Ladeplan verdrängen — sie wandern
 * deshalb ab vier Stück in eine aufklappbare Liste.
 */
export function hinweise(p) {
  if (!p.hinweise.length) return ''
  const wichtig = p.hinweise.filter(h => h.t !== 'info')
  const info = p.hinweise.filter(h => h.t === 'info')
  const oben = wichtig.map(notiz).join('')
  if (info.length <= 3) return oben + info.map(notiz).join('')
  return oben + `<details class="hinweisbox">
    <summary>${n0(info.length)} Hinweise zur Ausnutzung</summary>
    <div class="hinweisliste">${info.map(notiz).join('')}</div>
  </details>`
}

const legende = g => {
  const namen = [...g.namen].filter(Boolean)
  const titel = namen.length === 1 ? namen[0] : namen.length > 1 ? `${namen[0]} +${namen.length - 1}` : gName(g)
  return `<span><i style="background:${g.farbe}"></i><b>${esc(titel)}</b> &#183; ${esc(gName(g))} &#183; `
    + `${n0(g.menge)} Stück auf ${n0(g.stellplaetze)} Stellpl. &#183; ${esc(stapelText(g))}</span>`
}

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
      <div class="tscroll" data-scrollhinweis>${svgDraufsicht(t, p.kapa, p.f.b / 1000)}${svgSeite(t, p.kapa, p.f.h / 1000)}</div>
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
  const differenz = p.gesamt - p.ldm

  const teilA = `
    <h4>A · Lademeter (flächenbasiert)</h4>
    <div class="tscroll" data-scrollhinweis><table><thead><tr>
      <th>Grundfläche</th><th class="num">Stellpl.${HB('stellplatz')}</th>
      <th class="num">Fläche je Stellpl. m²</th><th class="num">Fläche gesamt m²</th><th class="num">LDM</th>
    </tr></thead><tbody>
    ${p.gruppen.map(g => `<tr>
      <td><span class="chip" style="background:${g.farbe}"></span>${n0(g.l)} × ${n0(g.b)} mm</td>
      <td class="num">${n0(g.stellplaetze)}<div class="mini">${n0(g.menge)} Stück, Stapel ${g.stapel}</div></td>
      <td class="num">${n2(g.flaecheJeStellplatz)}</td>
      <td class="num">${n2(g.flaeche)}</td>
      <td class="num">${n2(g.ldm)}</td>
    </tr>`).join('')}
    <tr class="sum"><td>Summe</td>
      <td class="num">${n0(p.gruppen.reduce((s, g) => s + g.stellplaetze, 0))}</td>
      <td class="num">–</td><td class="num">${n2(p.flaeche)}</td><td class="num">${n2(p.ldm)}</td></tr>
    </tbody></table></div>
    <p class="fuss">LDM = belegte Grundfläche ÷ ${n2(p.ldmBreite)} m Bezugsbreite. Gerechnet wird mit den
      <b>Stellplätzen nach wirksamem Stapelfaktor</b>, nicht mit der Stückzahl — gestapelte Träger belegen
      dieselbe Grundfläche.</p>`

  const teilB = `
    <h4>B · Ladelänge des erzeugten Ladeplans</h4>
    <div class="tscroll" data-scrollhinweis><table><thead><tr>
      <th>Grundfläche</th><th class="num">Stück</th><th class="num">Stapel max.${HB('stapel')}</th><th class="num">Stellpl.</th>
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
      <td class="num">${g.a.proReihe}</td>
      <td class="num">${n0(g.reihen)}<div class="mini">${schlussreihe(g)}</div></td>
      <td class="num">${n2(g.laenge)}</td>
      ${zeigeGewicht ? `<td class="num">${n0(g.gewichtSumme)}${g.gewichtProStueck ? `<div class="mini">${n1(g.gewichtProStueck)} je Stück</div>` : ''}</td>` : ''}
    </tr>`).join('')}
    <tr class="sum"><td>Summe</td><td class="num">${n0(p.stueck)}</td><td class="num">–</td>
      <td class="num">${n0(p.gruppen.reduce((s, g) => s + g.stellplaetze, 0))}</td><td></td><td class="num">–</td>
      <td class="num">${n0(p.gruppen.reduce((s, g) => s + g.reihen, 0))}</td><td class="num">${n2(p.gesamt)}</td>
      ${zeigeGewicht ? `<td class="num">${n0(p.gewicht)}</td>` : ''}</tr>
    </tbody></table></div>
    <p class="fuss">Aufgerundet wird je Grundfläche, nicht je Position – Stapeln über Positionen hinweg ist bei
      gleicher Grundfläche zulässig.</p>`

  const vergleichText = Math.abs(differenz) < 0.005
    ? `<p class="fuss"><b>Beide Werte stimmen überein:</b> alle Reihen sind voll belegt und nutzen die Bezugsbreite aus.</p>`
    : `<p class="fuss"><b>Differenz ${n2(differenz)} m:</b> ${n2(p.gesamt)} m Ladelänge gegenüber ${n2(p.ldm)} LDM.
        Sie entsteht durch teilweise belegte Schlussreihen und durch Ladebreite, die je Reihe ungenutzt bleibt —
        physisch belegter Platz, den die flächenbasierte Kennzahl nicht abbildet.</p>`

  return teilA + teilB + vergleichText
}

/** Kurzhinweis zur letzten Reihe einer Gruppe */
function schlussreihe(g) {
  const proReihe = g.a.proReihe
  const letzte = g.stellplaetze - (g.reihen - 1) * proReihe
  return letzte < proReihe ? `letzte ${letzte} von ${proReihe}` : 'alle voll'
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
