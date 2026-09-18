/*
 * Lokale Speicherung. Alles bleibt im Browser des Nutzers:
 * kein Konto, kein Backend, keine Übertragung.
 *
 * Jeder Zugriff ist gekapselt, weil localStorage im privaten Modus oder bei
 * blockierten Website-Daten werfen kann. Die App muss auch dann laufen.
 */

const PREFIX = 'ldm-planer.'
export const SCHLUESSEL = {
  stammdaten: PREFIX + 'stammdaten',
  fahrzeug:   PREFIX + 'fahrzeug',
  sendung:    PREFIX + 'sendung'
}

let warnungGezeigt = false

function sicher(fn, fallback) {
  try { return fn() } catch (e) {
    if (!warnungGezeigt) {
      warnungGezeigt = true
      console.warn('Lokale Speicherung nicht verfügbar – die Sitzung läuft ohne Persistenz.', e)
    }
    return fallback
  }
}

export const verfuegbar = () => sicher(() => {
  const p = PREFIX + 'probe'
  localStorage.setItem(p, '1')
  localStorage.removeItem(p)
  return true
}, false)

export const lies = (key, fallback = null) => sicher(() => {
  const roh = localStorage.getItem(key)
  return roh === null ? fallback : JSON.parse(roh)
}, fallback)

export const schreib = (key, wert) => sicher(() => {
  localStorage.setItem(key, JSON.stringify(wert))
  return true
}, false)

export const loesche = key => sicher(() => { localStorage.removeItem(key); return true }, false)

/** Setzt ausschließlich die Daten dieser App zurück. */
export const alleLoeschen = () => Object.values(SCHLUESSEL).forEach(loesche)

/** Datei-Download im Browser, ohne Server. */
export function speichereDatei(name, inhalt, typ = 'application/json') {
  const blob = new Blob([inhalt], { type: `${typ};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const heuteStempel = () => new Date().toISOString().slice(0, 10)
