/* Formatierung und kleine Helfer. Deutsches Gebietsschema. */

export const n2 = x => Number(x || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const n1 = x => Number(x || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const n0 = x => Number(x || 0).toLocaleString('de-DE', { maximumFractionDigits: 0 })

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** Suchnormalisierung: "1.200 × 800" und "1200x800" sollen sich treffen */
export const normQ = s => String(s ?? '').toLowerCase().replace(/\s/g, '')
  .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2').replace(/,/g, '.').replace(/[×*]/g, 'x')

export const gName = g => `${n0(g.l)} × ${n0(g.b)} mm`
export const varLabel = v => `${v.l} × ${v.b} × ${v.h}`
