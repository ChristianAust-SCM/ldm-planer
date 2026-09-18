/*
 * Browser-Abnahme mit Playwright.
 *
 * Playwright ist bewusst KEINE Projektabhängigkeit — die App selbst hat keine.
 * Der Treiber wird zur Laufzeit gesucht:
 *   node tests/browser.mjs
 *   PLAYWRIGHT=/pfad/zu/node_modules/playwright node tests/browser.mjs
 * Fehlt er, endet das Skript mit einem Hinweis statt mit einem Fehlschlag.
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)))
const PORT = Number(process.env.PORT || 8099)
const BASIS = `http://127.0.0.1:${PORT}/`
const require = createRequire(import.meta.url)

let bestanden = 0, fehlgeschlagen = 0
const pruefe = (name, bedingung, detail = '') => {
  if (bedingung) { bestanden++; console.log(`  ok   ${name}`) }
  else { fehlgeschlagen++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`) }
}

function ladePlaywright() {
  const kandidaten = [process.env.PLAYWRIGHT, 'playwright'].filter(Boolean)
  for (const k of kandidaten) {
    try { return require(k) } catch {}
  }
  for (const p of (process.env.PLAYWRIGHT_SUCHPFADE || '').split(':').filter(Boolean)) {
    try { return require(p) } catch {}
  }
  return null
}

const warte = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const pw = ladePlaywright()
  if (!pw) {
    console.log('Playwright nicht gefunden – Browser-Abnahme übersprungen.')
    console.log('Mit Treiber ausführen: PLAYWRIGHT=/pfad/zu/node_modules/playwright node tests/browser.mjs')
    process.exit(0)
  }

  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: WURZEL, stdio: 'ignore' })
  await warte(700)

  const browser = await pw.chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })

  /* Datenschutz: jede Anfrage mitschreiben */
  const anfragen = []
  ctx.on('request', r => anfragen.push(r.url()))

  const page = await ctx.newPage()
  const fehlerKonsole = []
  page.on('pageerror', e => fehlerKonsole.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') fehlerKonsole.push(m.text()) })

  try {
    /* ---------------- 1 · Leerer Start ---------------- */
    console.log('\n1 · Leerer Start')
    await page.goto(BASIS, { waitUntil: 'networkidle' })
    pruefe('Titel gesetzt', (await page.title()).includes('LDM Planer'))
    pruefe('startet bei Stammdaten', await page.locator('#tab-stammdaten').getAttribute('aria-selected') === 'true')
    pruefe('leerer Bestand wird benannt', (await page.locator('#stammMeta').textContent()).includes('Noch keine'))
    pruefe('keine Positionen', (await page.locator('#posBody').textContent()).includes('Noch keine Position'))

    /* ---------------- 2 · Beispieldaten ---------------- */
    console.log('\n2 · Beispieldaten')
    await page.click('#btnBeispiel')
    const zeilen = await page.locator('#stammBody tr').count()
    pruefe('Beispieldaten geladen', zeilen === 5, `${zeilen} Zeilen`)
    pruefe('Kennzahlen aus dem Bestand gerechnet', /5 Ladungsträger/.test(await page.locator('#stammMeta').textContent()))

    /* ---------------- 3 · Manueller Ladungsträger ---------------- */
    console.log('\n3 · Manueller Ladungsträger')
    await page.click('#btnNeu')
    pruefe('Zeile angelegt', await page.locator('#stammBody tr').count() === 6)
    const neueZeile = page.locator('#stammBody tr').last()
    await neueZeile.locator('input[data-feld="bezeichnung"]').fill('Sonderbehälter')
    await neueZeile.locator('input[data-feld="laenge_mm"]').fill('1500')
    await neueZeile.locator('input[data-feld="laenge_mm"]').blur()
    await warte(120)
    pruefe('Änderung gespeichert', /Gespeichert|angelegt/.test(await page.locator('#stammMsg').textContent()))

    /* ---------------- 4 · Ungültige Eingabe ---------------- */
    console.log('\n4 · Ungültige Eingabe')
    await neueZeile.locator('input[data-feld="laenge_mm"]').fill('0')
    await neueZeile.locator('input[data-feld="laenge_mm"]').blur()
    await warte(120)
    pruefe('Maß 0 wird abgelehnt', /größer als 0/.test(await page.locator('#stammMsg').textContent()))
    await neueZeile.locator('input[data-feld="id"]').fill('EP-01')
    await neueZeile.locator('input[data-feld="id"]').blur()
    await warte(120)
    pruefe('doppelte ID wird abgelehnt', /doppelt/.test(await page.locator('#stammMsg').textContent()))

    /* ---------------- 5 · CSV-Import ---------------- */
    console.log('\n5 · CSV-Import')
    await page.fill('#importText', [
      'Nummer;Benennung;Länge;Breite;Höhe;Gewicht;Stapelbarkeit',
      'CSV-01;Importierte Kiste;1.200;1000;900;250;3',
      'CSV-02;Zweite Kiste;800;600;500;60;4',
      'CSV-03;Kaputt;0;600;500;60;4',
      'CSV-01;Dublette;800;600;500;60;4'
    ].join('\n'))
    await page.click('#btnImportText')
    await warte(200)
    const vorschau = await page.locator('#importVorschau').textContent()
    pruefe('Trennzeichen erkannt', /Semikolon/.test(vorschau))
    pruefe('Kopfzeile erkannt', /Kopfzeile erkannt/.test(vorschau))
    pruefe('gültige Zeilen gezählt', /2 gültig/.test(vorschau))
    pruefe('ungültige Zeilen gemeldet', /2 abgelehnt/.test(vorschau))
    pruefe('Fehlergrund genannt', /größer als 0/.test(vorschau) && /doppelt/.test(vorschau))
    pruefe('Spaltenzuordnung angeboten', await page.locator('#importVorschau select[data-map]').count() >= 7)
    await page.click('[data-import="anhaengen"]')
    await warte(200)
    pruefe('Import angehängt', /8 Ladungsträger/.test(await page.locator('#stammMsg').textContent()),
      await page.locator('#stammMsg').textContent())

    /* ---------------- 6 · Sendung und Schnellerfassung ---------------- */
    console.log('\n6 · Sendung, Schnellerfassung, Rechnung')
    await page.click('#tab-sendung')
    await page.fill('#qNr', 'EP-01')
    pruefe('Trefferanzeige', /Stapel/.test(await page.locator('#qHint').textContent()))
    await page.fill('#qMenge', '30')
    await page.click('#btnQeAdd')
    await warte(150)
    pruefe('Position übernommen', await page.locator('#posBody tr').count() === 1)
    const kpi = await page.locator('#kpis').textContent()
    pruefe('Ladelänge berechnet', /\d+,\d{2}/.test(kpi))
    pruefe('ein Fahrzeug genügt', /BenötigteFahrzeuge1[^0-9]/.test(kpi.replace(/\s/g, '')), kpi.replace(/\s+/g, ' ').slice(0, 160))
    pruefe('Ladelänge korrekt (30 × 1200×800, Stapel 2 → 6,00 m)', /6,00/.test(kpi), kpi.replace(/\s+/g, ' ').slice(0, 120))
    pruefe('Gewicht ausgewiesen', /12\.000/.test(kpi), 'erwartet 30 × 400 kg')

    /* ---------------- 7 · Höhenbegrenzung ---------------- */
    console.log('\n7 · Höhenbegrenzung')
    await page.fill('#fH', '1500')
    await page.locator('#fH').blur()
    await warte(150)
    pruefe('Stapel wird durch Innenhöhe begrenzt', /Höhe/.test(await page.locator('#hinweise').textContent()))
    await page.fill('#fH', '3000')
    await page.locator('#fH').blur()
    await warte(150)

    /* ---------------- 8 · Mehrere Fahrzeuge und Restkapazität ---------------- */
    console.log('\n8 · Mehrere Fahrzeuge')
    await page.fill('#qNr', 'GB-01')
    await page.fill('#qMenge', '120')
    await page.click('#btnQeAdd')
    await warte(200)
    const kpi2 = await page.locator('#kpis').textContent()
    const fzgAnzahl = Number((kpi2.replace(/\s/g, '').match(/BenötigteFahrzeuge(\d+)/) || [])[1])
    pruefe('mehrere Fahrzeuge nötig', fzgAnzahl > 1, `${fzgAnzahl} Fahrzeuge`)
    await page.click('#tab-ladeplan')
    await warte(200)
    const plaene = await page.locator('#plaene').textContent()
    pruefe('ein Ladeplan je Fahrzeug', await page.locator('#plaene .truckblk').count() === fzgAnzahl)
    pruefe('Restkapazität ausgewiesen', /Restkapazität/.test(plaene))
    pruefe('Draufsicht gezeichnet', await page.locator('#plaene svg[aria-label*="Draufsicht"]').count() === fzgAnzahl)
    pruefe('Seitenansicht gezeichnet', await page.locator('#plaene svg[aria-label*="Seitenansicht"]').count() === fzgAnzahl)
    pruefe('Rechenweg gefüllt', /Grundfläche/.test(await page.locator('#rechenweg').textContent()))
    pruefe('Stapelfaktorvergleich zeigt drei Varianten', await page.locator('#cmp .c').count() === 3)

    /* ---------------- 9 · Nutzlast ---------------- */
    console.log('\n9 · Gewicht und Nutzlast')
    await page.click('#tab-sendung')
    await page.fill('#fN', '5000')
    await page.locator('#fN').blur()
    await warte(200)
    pruefe('Nutzlastwarnung erscheint', /Nutzlast/.test(await page.locator('#hinweise').textContent()))
    await page.fill('#fN', '24000')
    await page.locator('#fN').blur()
    await warte(150)

    /* ---------------- 10 · Versandliste ---------------- */
    console.log('\n10 · Versandliste einfügen')
    const vorher = await page.locator('#posBody tr').count()
    await page.fill('#paste', 'KLT-01\t40\n12 IP-01\nUNBEKANNT 5')
    await page.click('#btnPaste')
    await warte(200)
    pruefe('zwei Zeilen übernommen', await page.locator('#posBody tr').count() === vorher + 2)
    pruefe('unbekannte Zeile gemeldet', /UNBEKANNT/.test(await page.locator('#importPasteMsg').textContent()))

    /* ---------------- 11 · Persistenz ---------------- */
    console.log('\n11 · Persistenz über Neustart')
    const vorReload = await page.locator('#posBody tr').count()
    await page.reload({ waitUntil: 'networkidle' })
    await warte(250)
    await page.click('#tab-sendung')
    await page.click('#tab-stammdaten')
    pruefe('Bestand wiederhergestellt', await page.locator('#stammBody tr').count() === 8)
    await page.click('#tab-sendung')
    pruefe('Sendung wiederhergestellt', await page.locator('#posBody tr').count() === vorReload)
    pruefe('Fahrzeug wiederhergestellt', await page.locator('#fN').inputValue() === '24000')

    /* ---------------- 12 · Export ---------------- */
    console.log('\n12 · Export')
    await page.click('#tab-stammdaten')
    for (const [knopf, endung] of [['#btnExportCsv', '.csv'], ['#btnExportJson', '.json']]) {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.click(knopf)])
      pruefe(`Export ${endung}`, dl.suggestedFilename().endsWith(endung), dl.suggestedFilename())
    }

    /* ---------------- 13 · Druckansicht ---------------- */
    console.log('\n13 · Druckansicht')
    await page.click('#tab-ladeplan')
    await page.emulateMedia({ media: 'print' })
    await warte(150)
    pruefe('Ladeplan im Druck sichtbar', await page.locator('#plaene .truckblk').first().isVisible())
    pruefe('Bedienelemente im Druck ausgeblendet', !(await page.locator('.steps').isVisible()))
    const schuss = join(await mkdtemp(join(tmpdir(), 'ldm-')), 'druck.png')
    await page.screenshot({ path: schuss, fullPage: false })
    await page.emulateMedia({ media: 'screen' })

    /* ---------------- 14 · Ansichten ---------------- */
    console.log('\n14 · Desktop, Tablet, Mobile')
    for (const [name, w, h] of [['Desktop', 1440, 950], ['Tablet', 834, 1112], ['Mobile', 390, 844]]) {
      await page.setViewportSize({ width: w, height: h })
      await warte(150)
      const scrollt = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      pruefe(`${name}: kein horizontaler Seitenscroll`, !scrollt)
      pruefe(`${name}: Schrittleiste bedienbar`, await page.locator('#tab-sendung').isVisible())
    }
    await page.setViewportSize({ width: 1440, height: 950 })

    /* ---------------- 15 · Zurücksetzen ---------------- */
    console.log('\n15 · Zurücksetzen')
    page.once('dialog', d => d.accept())
    await page.click('#tab-stammdaten')
    await page.click('#btnReset')
    await warte(250)
    pruefe('Bestand geleert', (await page.locator('#stammMeta').textContent()).includes('Noch keine'))
    const rest = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('ldm-planer.')))
    pruefe('lokaler Speicher geleert', rest.length === 0, rest.join(','))

    /* ---------------- 16 · Datenschutz ---------------- */
    console.log('\n16 · Datenschutz')
    const fremd = anfragen.filter(u => !u.startsWith(BASIS))
    pruefe('keine Fremdanfragen', fremd.length === 0, fremd.join(', '))
    const nichtStatisch = anfragen.filter(u => u.startsWith(BASIS) && !/\.(html|css|js|png|ico|json|csv)(\?|$)|\/$/.test(u))
    pruefe('nur statische Dateien geladen', nichtStatisch.length === 0, nichtStatisch.join(', '))
    pruefe('keine Konsolenfehler', fehlerKonsole.length === 0, fehlerKonsole.slice(0, 3).join(' | '))

  } finally {
    await browser.close()
    server.kill()
  }

  console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`)
  process.exit(fehlgeschlagen ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
