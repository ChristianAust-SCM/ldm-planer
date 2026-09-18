/*
 * Draufsicht und Seitenansicht als Inline-SVG.
 * Geometrie und Aufbau stammen aus der Ursprungsfassung; angepasst wurden
 * die Farben an das dunkle Branding und die Beschriftung an allgemeine
 * Ladungsträger.
 */
import { n2, n0 } from './format.js'

export const DEFS = `<defs>`
  + `<pattern id="frei" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">`
  + `<rect width="7" height="7" fill="rgba(238,242,246,.04)"/>`
  + `<line x1="0" y1="0" x2="0" y2="7" stroke="rgba(238,242,246,.14)" stroke-width="2"/>`
  + `</pattern>`
  /* Zweites Muster fuer den Druck: dunkle Schraffur auf Weiss, per CSS eingeblendet */
  + `<pattern id="freiDruck" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">`
  + `<rect width="7" height="7" fill="#fff"/>`
  + `<line x1="0" y1="0" x2="0" y2="7" stroke="#C8CFD6" stroke-width="2"/>`
  + `</pattern>`
  + `</defs>`

const FZG_LINIE = '#93A6BA'
const FZG_FLAECHE = 'rgba(238,242,246,.07)'
const LADEFLAECHE = 'rgba(11,22,34,.55)'

/* Zugmaschine in der Draufsicht */
function kabineOben(H) {
  const kb = H * 0.84, y0 = (H - kb) / 2
  return `<g>
    <rect x="34" y="${(y0 - 8).toFixed(1)}" width="14" height="6" rx="2" fill="${FZG_LINIE}" opacity=".6"/>
    <rect x="34" y="${(y0 + kb + 2).toFixed(1)}" width="14" height="6" rx="2" fill="${FZG_LINIE}" opacity=".6"/>
    <rect x="28" y="${y0.toFixed(1)}" width="108" height="${kb.toFixed(1)}" rx="10" fill="${FZG_FLAECHE}" stroke="${FZG_LINIE}" stroke-width="1.4" opacity=".85"/>
    <rect x="36" y="${(y0 + 6).toFixed(1)}" width="11" height="${Math.max(kb - 12, 4).toFixed(1)}" rx="3" fill="${FZG_LINIE}" opacity=".45"/>
    <line x1="136" y1="${(H / 2).toFixed(1)}" x2="150" y2="${(H / 2).toFixed(1)}" stroke="${FZG_LINIE}" stroke-width="3" opacity=".6"/>
    <circle cx="139" cy="${(H / 2).toFixed(1)}" r="4.5" fill="${FZG_LINIE}" opacity=".6"/>
    <text x="82" y="${(H + 31).toFixed(1)}" text-anchor="middle" class="ax">Zugmaschine</text></g>`
}

/* Achsstummel am Heck der Draufsicht */
function achsenOben(H) {
  return [652, 690, 728].map(x =>
    `<rect x="${x}" y="-7" width="30" height="6" rx="2" fill="${FZG_LINIE}" opacity=".55"/>`
    + `<rect x="${x}" y="${(H + 1).toFixed(1)}" width="30" height="6" rx="2" fill="${FZG_LINIE}" opacity=".55"/>`).join('')
}

/** Draufsicht: Reihen, Stapelhöhe je Stellplatz, ungenutzte Fläche */
export function svgDraufsicht(t, kapa, breiteM) {
  const PX = 800 / kapa, H = breiteM * PX
  let x = 0, koerper = ''
  for (const r of t.reihen) {
    for (let c = 0; c < r.belegt; c++) {
      const px = x * PX, py = c * r.quer * PX, w = r.tief * PX - 2, h = r.quer * PX - 2
      koerper += `<rect x="${(px + 1).toFixed(1)}" y="${(py + 1).toFixed(1)}" width="${Math.max(w, 1).toFixed(1)}" `
        + `height="${Math.max(h, 1).toFixed(1)}" rx="2.5" fill="${r.g.farbe}"/>`
      const hoehe = (r.hoehen && r.hoehen[c]) || r.g.stapel
      if (w > 22 && h > 15 && r.g.stapel > 1) {
        koerper += `<text x="${(px + r.tief * PX / 2).toFixed(1)}" y="${(py + r.quer * PX / 2 + 3.5).toFixed(1)}" `
          + `text-anchor="middle" class="bx"${hoehe < r.g.stapel ? ' opacity="0.72"' : ''}>&#215;${hoehe}</text>`
      }
    }
    const genutzt = r.belegt * r.quer
    if (genutzt < breiteM - 0.06) {
      koerper += `<rect class="hatch" x="${(x * PX + 1).toFixed(1)}" y="${(genutzt * PX + 1).toFixed(1)}" `
        + `width="${Math.max(r.tief * PX - 2, 1).toFixed(1)}" height="${Math.max((breiteM - genutzt) * PX - 2, 1).toFixed(1)}" `
        + `rx="2.5" fill="url(#frei)" stroke="rgba(238,242,246,.16)" stroke-width="1"/>`
    }
    x += r.tief
  }
  if (t.rest > 0.005) {
    koerper += `<rect class="hatch" x="${(x * PX + 1).toFixed(1)}" y="1" width="${(t.rest * PX - 2).toFixed(1)}" `
      + `height="${(H - 2).toFixed(1)}" rx="2.5" fill="url(#frei)" stroke="rgba(238,242,246,.16)" stroke-width="1"/>`
    if (t.rest * PX > 34) {
      koerper += `<text x="${((x + t.rest / 2) * PX).toFixed(1)}" y="${(H / 2 + 4).toFixed(1)}" text-anchor="middle" class="fr">frei</text>`
    }
  }
  const oben = 10
  return `<svg width="962" height="${(H + oben + 40).toFixed(0)}" viewBox="0 0 962 ${(H + oben + 40).toFixed(0)}" role="img"
    aria-label="Draufsicht der Ladefläche mit Zugmaschine">
    ${DEFS}
    <g transform="translate(0,${oben})">
      ${kabineOben(H)}
      <g transform="translate(150,0)">
        <rect class="lade" x="0" y="0" width="800" height="${H.toFixed(1)}" rx="3" fill="${LADEFLAECHE}" stroke="${FZG_LINIE}" stroke-width="1.6"/>
        ${achsenOben(H)}
        ${koerper}
      </g>
      <line x1="150" y1="${(H + 14).toFixed(1)}" x2="950" y2="${(H + 14).toFixed(1)}" stroke="rgba(238,242,246,.18)" stroke-width="1"/>
      <text x="550" y="${(H + 31).toFixed(1)}" text-anchor="middle" class="ax">Draufsicht &#183; ${n2(kapa)} m Ladelänge &#183; ${n2(breiteM)} m Innenbreite</text>
    </g></svg>`
}

/** Seitenansicht: macht die Stapelung sichtbar */
export function svgSeite(t, kapa, hoeheM) {
  const PX = 800 / kapa, H = hoeheM * PX, oben = 26, boden = oben + H
  const boca = boden + 36
  let x = 0, koerper = ''
  for (const r of t.reihen) {
    const gh = Math.max((r.g.hMax / 1000) * PX, 4), w = Math.max(r.tief * PX - 2, 1)
    const hoch = r.hoehen && r.hoehen.length ? Math.max(...r.hoehen) : r.g.stapel
    for (let s = 0; s < hoch; s++) {
      koerper += `<rect x="${(x * PX + 1).toFixed(1)}" y="${(boden - (s + 1) * gh + 1).toFixed(1)}" width="${w.toFixed(1)}" `
        + `height="${Math.max(gh - 2, 1).toFixed(1)}" rx="2" fill="${r.g.farbe}"/>`
    }
    /* angebrochene Lage der Schlussreihe nur angedeutet */
    if (r.hoehen && Math.min(...r.hoehen) < hoch) {
      koerper += `<rect class="hatch" x="${(x * PX + 1).toFixed(1)}" y="${(boden - hoch * gh + 1).toFixed(1)}" width="${w.toFixed(1)}" `
        + `height="${Math.max(gh - 2, 1).toFixed(1)}" rx="2" fill="url(#frei)" opacity="0.7"/>`
    }
    x += r.tief
  }
  if (t.rest > 0.005) {
    koerper += `<rect class="hatch" x="${(x * PX + 1).toFixed(1)}" y="${(oben + 1).toFixed(1)}" width="${(t.rest * PX - 2).toFixed(1)}" `
      + `height="${(H - 2).toFixed(1)}" rx="2" fill="url(#frei)" stroke="rgba(238,242,246,.16)" stroke-width="1"/>`
  }

  const kt = oben + 6, kb = boca - 5
  const rad = cx => `<circle cx="${cx}" cy="${(boca - 14).toFixed(1)}" r="14" fill="${FZG_FLAECHE}" stroke="${FZG_LINIE}" stroke-width="2.5" opacity=".8"/>`
    + `<circle cx="${cx}" cy="${(boca - 14).toFixed(1)}" r="4.5" fill="${FZG_LINIE}" opacity=".7"/>`
  return `<svg width="962" height="${(boca + 16).toFixed(0)}" viewBox="0 0 962 ${(boca + 16).toFixed(0)}" role="img"
    aria-label="Seitenansicht der Ladung mit Stapelung">
    ${DEFS}
    <path d="M 28 ${kb.toFixed(1)} L 28 ${(kt + 20).toFixed(1)} Q 28 ${kt.toFixed(1)} 48 ${kt.toFixed(1)} L 126 ${kt.toFixed(1)} L 136 ${kb.toFixed(1)} Z"
      fill="${FZG_FLAECHE}" stroke="${FZG_LINIE}" stroke-width="1.4" opacity=".85"/>
    <rect x="38" y="${(kt + 9).toFixed(1)}" width="46" height="26" rx="3" fill="${FZG_LINIE}" opacity=".35"/>
    ${rad(92)}
    <g transform="translate(150,0)">
      <rect class="lade" x="0" y="${oben}" width="800" height="${H.toFixed(1)}" rx="3" fill="${LADEFLAECHE}" stroke="${FZG_LINIE}" stroke-width="1.6"/>
      ${koerper}
      <line x1="-20" y1="${(boden + 4).toFixed(1)}" x2="800" y2="${(boden + 4).toFixed(1)}" stroke="${FZG_LINIE}" stroke-width="5" opacity=".55"/>
      <line x1="120" y1="${(boden + 6).toFixed(1)}" x2="120" y2="${(boca - 6).toFixed(1)}" stroke="${FZG_LINIE}" stroke-width="5" opacity=".55"/>
      <text x="400" y="${(oben - 10).toFixed(1)}" text-anchor="middle" class="ax">Seitenansicht &#183; ${n2(hoeheM)} m Innenhöhe &#183; Stapelung sichtbar</text>
    </g>
    ${rad(150 + 660)}${rad(150 + 706)}${rad(150 + 752)}
    <line x1="14" y1="${boca.toFixed(1)}" x2="948" y2="${boca.toFixed(1)}" stroke="rgba(238,242,246,.18)" stroke-width="1.5"/>
  </svg>`
}
