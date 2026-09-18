/*
 * XLSX lesen — ohne Fremdbibliothek.
 *
 * Eine .xlsx-Datei ist ein ZIP-Archiv mit XML darin. Beides kann der Browser
 * von Haus aus: ZIP-Verzeichnis selbst lesen, Deflate über die native
 * `DecompressionStream('deflate-raw')`, XML mit einem schlanken Parser für die
 * wenigen Strukturen, die eine Tabelle ausmacht.
 *
 * Damit bleibt der Grundsatz „keine Laufzeitabhängigkeiten" erhalten: kein
 * SheetJS, kein CDN, keine Lizenz- und CVE-Pflege für ~900 kB Fremdcode.
 *
 * Grenzen, bewusst in Kauf genommen:
 * - nur das erste Tabellenblatt
 * - keine Formelergebnisse jenseits des zwischengespeicherten Werts
 * - keine Datumsformatierung (Datumswerte kommen als Zahl)
 * - kein ZIP64, keine verschlüsselten Dateien
 * Für Stammdaten aus einer Excel-Liste reicht das.
 */

export const xlsxUnterstuetzt = () => {
  try { new DecompressionStream('deflate-raw'); return true } catch { return false }
}

/* ---------------- ZIP ---------------- */

const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50
const LOC_SIG = 0x04034b50

function findeEocd(dv) {
  const max = Math.min(dv.byteLength, 65557)
  for (let i = dv.byteLength - 22; i >= dv.byteLength - max; i--) {
    if (i >= 0 && dv.getUint32(i, true) === EOCD_SIG) return i
  }
  return -1
}

/** Liest das Zentralverzeichnis: {name -> {methode, offset, groesse}} */
function verzeichnis(puffer) {
  const dv = new DataView(puffer)
  const eocd = findeEocd(dv)
  if (eocd < 0) throw new Error('Keine gültige XLSX-Datei (ZIP-Ende nicht gefunden).')
  const anzahl = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  if (p === 0xffffffff) throw new Error('ZIP64-Archive werden nicht unterstützt.')

  const eintraege = new Map()
  const dec = new TextDecoder('utf-8')
  for (let i = 0; i < anzahl; i++) {
    if (dv.getUint32(p, true) !== CEN_SIG) break
    const methode = dv.getUint16(p + 10, true)
    const komprimiert = dv.getUint32(p + 20, true)
    const nLen = dv.getUint16(p + 28, true)
    const eLen = dv.getUint16(p + 30, true)
    const kLen = dv.getUint16(p + 32, true)
    const lokal = dv.getUint32(p + 42, true)
    const name = dec.decode(new Uint8Array(puffer, p + 46, nLen))
    eintraege.set(name, { methode, komprimiert, lokal })
    p += 46 + nLen + eLen + kLen
  }
  return eintraege
}

async function entpacke(puffer, eintrag) {
  const dv = new DataView(puffer)
  const p = eintrag.lokal
  if (dv.getUint32(p, true) !== LOC_SIG) throw new Error('Beschädigtes ZIP-Archiv.')
  const nLen = dv.getUint16(p + 26, true)
  const eLen = dv.getUint16(p + 28, true)
  const start = p + 30 + nLen + eLen
  const roh = new Uint8Array(puffer, start, eintrag.komprimiert)

  if (eintrag.methode === 0) return new TextDecoder('utf-8').decode(roh)
  if (eintrag.methode !== 8) throw new Error(`Nicht unterstützte ZIP-Kompression (${eintrag.methode}).`)

  const strom = new Blob([roh]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new TextDecoder('utf-8').decode(await new Response(strom).arrayBuffer())
}

/* ---------------- XML ---------------- */

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
const entschaerfe = s => String(s).replace(/&(amp|lt|gt|quot|apos);/g, m => ENTITIES[m])
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))

/** Alle <t>-Inhalte eines Blocks zusammenziehen (Rich Text besteht aus mehreren Läufen) */
const textVon = block => {
  let raus = ''
  for (const m of block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) raus += entschaerfe(m[1])
  return raus
}

const gemeinsameTexte = xml =>
  [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textVon(m[1]))

/** Spaltenbuchstaben -> Index: A=0, B=1, …, AA=26 */
export function spalteZuIndex(ref) {
  const buchstaben = String(ref).match(/^[A-Z]+/i)
  if (!buchstaben) return 0
  let n = 0
  for (const c of buchstaben[0].toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

function zeilenAusBlatt(xml, texte) {
  const zeilen = []
  for (const zm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const zeile = []
    for (const cm of (zm[1].matchAll(/<c([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g))) {
      const attr = cm[1] || ''
      const inhalt = cm[2] || ''
      const ref = (attr.match(/r="([A-Z]+\d+)"/i) || [])[1]
      const typ = (attr.match(/t="([^"]+)"/) || [])[1] || 'n'
      const idx = ref ? spalteZuIndex(ref) : zeile.length

      let wert = ''
      if (typ === 's') {
        const v = (inhalt.match(/<v>([\s\S]*?)<\/v>/) || [])[1]
        wert = v !== undefined ? (texte[+v] ?? '') : ''
      } else if (typ === 'inlineStr') {
        wert = textVon(inhalt)
      } else if (typ === 'str') {
        wert = entschaerfe((inhalt.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '')
      } else {
        wert = entschaerfe((inhalt.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '')
      }
      while (zeile.length < idx) zeile.push('')
      zeile[idx] = String(wert).trim()
    }
    if (zeile.some(z => z !== '')) zeilen.push(zeile)
  }
  return zeilen
}

/* ---------------- Öffentlich ---------------- */

/**
 * Liest das erste Tabellenblatt einer XLSX-Datei.
 * @param {ArrayBuffer} puffer
 * @returns {Promise<string[][]>} Zeilen als Zellwerte
 */
export async function leseXlsxZeilen(puffer) {
  if (!xlsxUnterstuetzt()) {
    throw new Error('Dieser Browser kann XLSX nicht entpacken. Die Datei bitte als CSV speichern und erneut versuchen.')
  }
  const eintraege = verzeichnis(puffer)

  /* Das erste Blatt der Arbeitsmappe finden — Reihenfolge steht in workbook.xml */
  let blattDatei = 'xl/worksheets/sheet1.xml'
  const wb = eintraege.get('xl/workbook.xml')
  const rels = eintraege.get('xl/_rels/workbook.xml.rels')
  if (wb && rels) {
    try {
      const wbXml = await entpacke(puffer, wb)
      const erstes = (wbXml.match(/<sheet[^>]*\/?>/) || [])[0] || ''
      const rid = (erstes.match(/r:id="([^"]+)"/) || [])[1]
      if (rid) {
        const relXml = await entpacke(puffer, rels)
        const treffer = [...relXml.matchAll(/<Relationship([^>]*)\/>/g)]
          .map(m => m[1])
          .find(a => a.includes(`Id="${rid}"`))
        const ziel = treffer ? (treffer.match(/Target="([^"]+)"/) || [])[1] : null
        if (ziel) blattDatei = ziel.startsWith('/') ? ziel.slice(1) : `xl/${ziel.replace(/^\.\//, '')}`
      }
    } catch { /* Standardpfad genügt */ }
  }

  const blatt = eintraege.get(blattDatei) || eintraege.get('xl/worksheets/sheet1.xml')
  if (!blatt) throw new Error('Die Datei enthält kein lesbares Tabellenblatt.')

  const gemeinsam = eintraege.get('xl/sharedStrings.xml')
  const texte = gemeinsam ? gemeinsameTexte(await entpacke(puffer, gemeinsam)) : []
  return zeilenAusBlatt(await entpacke(puffer, blatt), texte)
}
