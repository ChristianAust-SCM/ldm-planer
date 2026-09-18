/*
 * Browser-Abnahme mit Playwright — Szenarien A bis M.
 *
 * Playwright ist bewusst KEINE Projektabhängigkeit; die App selbst hat keine.
 *   node tests/browser.mjs
 *   PLAYWRIGHT=/pfad/zu/node_modules/playwright node tests/browser.mjs
 * Fehlt der Treiber, endet das Skript mit einem Hinweis statt einem Fehlschlag.
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)))
const PORT = Number(process.env.PORT || 8099)
const BASIS = `http://127.0.0.1:${PORT}/`
const require = createRequire(import.meta.url)

let bestanden = 0, fehlgeschlagen = 0
const pruefe = (name, ok, detail = '') => {
  if (ok) { bestanden++; console.log(`  ok   ${name}`) }
  else { fehlgeschlagen++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`) }
}
const warte = ms => new Promise(r => setTimeout(r, ms))

function ladePlaywright() {
  for (const k of [process.env.PLAYWRIGHT, 'playwright'].filter(Boolean)) {
    try { return require(k) } catch {}
  }
  return null
}

async function main() {
  const pw = ladePlaywright()
  if (!pw) {
    console.log('Playwright nicht gefunden – Browser-Abnahme übersprungen.')
    console.log('Mit Treiber: PLAYWRIGHT=/pfad/zu/node_modules/playwright node tests/browser.mjs')
    process.exit(0)
  }

  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: WURZEL, stdio: 'ignore' })
  await warte(700)

  const browser = await pw.chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const anfragen = []
  ctx.on('request', r => anfragen.push(r.url()))
  const fehlendeAssets = []
  ctx.on('response', r => { if (r.status() >= 400) fehlendeAssets.push(`${r.status()} ${r.url()}`) })
  const page = await ctx.newPage()
  /* Bestätigungsdialoge immer annehmen — einmalige Handler bleiben sonst liegen,
     wenn die Aktion gar keinen Dialog auslöst */
  page.on('dialog', d => d.accept().catch(() => {}))
  const fehlerKonsole = []
  page.on('pageerror', e => fehlerKonsole.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') fehlerKonsole.push(m.text()) })

  /* Hilfen */
  const manuell = async (bez, l, b, h, gewicht, menge, stapel, id = '') => {
    await page.fill('#mBez', bez)
    await page.fill('#mId', id)
    await page.fill('#mL', String(l)); await page.fill('#mB', String(b)); await page.fill('#mH', String(h))
    await page.fill('#mG', gewicht === null ? '' : String(gewicht))
    await page.fill('#mMenge', String(menge)); await page.fill('#mStapel', String(stapel))
    await page.click('#btnManuellAdd'); await warte(130)
  }
  const kpiText = async () => (await page.locator('#kpis').textContent()).replace(/\s+/g, ' ')
  const kpiZahl = async label => {
    const t = (await page.locator('#kpis').textContent()).replace(/\s/g, '')
    const m = t.match(new RegExp(label + '\\??([0-9.,]+)'))
    return m ? m[1] : null
  }
  const positionen = () => page.locator('#posBody tr').count()
  /* Die Maßfelder sind bei gewählter Vorlage zugeklappt */
  const masseOeffnen = async () => {
    if (await page.locator('#masseBox').isHidden()) { await page.click('#btnMasse'); await warte(150) }
  }
  const fahrzeugWaehlen = async id => {
    if (await page.locator('#fzgPanel').isHidden()) { await page.click('#fzgKnopf'); await warte(150) }
    await page.click(`#fzgListe .pz[data-id="${id}"]`)
    await warte(200)
  }
  const fahrzeugMasse = async (l, b, h, nutzlast = '') => {
    await masseOeffnen()
    await page.fill('#fL', String(l)); await page.fill('#fB', String(b)); await page.fill('#fH', String(h))
    await page.fill('#fN', String(nutzlast))
    await page.locator('#fN').blur(); await warte(250)
  }
  const leeren = async () => {
    if (!(await page.locator('#btnLeeren').isVisible())) {
      await page.click('#btnZurueckPlaner'); await warte(250)
    }
    await page.click('#btnLeeren'); await warte(200)
  }

  try {
    /* ---------- A · ohne Stammdaten sofort rechnen ---------- */
    console.log('\nA · Keine Stammdaten, eine Position manuell, Ladeplan rechnen')
    await page.goto(BASIS, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })

    pruefe('Startseite zeigt den Planer, nicht die Stammdaten', await page.locator('#fahrzeugKarte').isVisible())
    pruefe('Stammdaten sind nicht im Hauptweg', await page.locator('#view-stammdaten').isHidden())
    pruefe('manuelle Erfassung ist der voreingestellte Weg', await page.locator('#form-manuell').isVisible())
    pruefe('Ergebnisbereich erklärt den Einstieg', /drei Schritten/.test(await page.locator('#ergebnisPlatzhalter').textContent()))
    pruefe('Rechnen ist ohne Position gesperrt', await page.locator('#btnRechnen').isDisabled())

    await fahrzeugMasse(13600, 2440, 3000)
    await manuell('Gitterbox', 1240, 835, 970, 700, 44, 3)
    pruefe('Position ohne Stammdaten angelegt', await positionen() === 1)
    pruefe('Rechnen ist jetzt möglich', await page.locator('#btnRechnen').isEnabled())
    await page.click('#btnRechnen'); await warte(500)
    pruefe('Ergebnis erscheint', await page.locator('#ergebnisInhalt').isVisible())
    pruefe('Ladeplan gezeichnet', await page.locator('#plaene svg[aria-label*="Draufsicht"]').count() >= 1)
    pruefe('Stammdaten blieben leer', await page.evaluate(() => !localStorage.getItem('ldm-planer.stammdaten')))

    /* ---------- B · mehrere Positionen manuell ---------- */
    console.log('\nB · Mehrere Positionen komplett manuell')
    await manuell('Europalette', 1200, 800, 1000, 400, 30, 2)
    await manuell('Behälter', 1200, 1000, 750, 300, 12, 2)
    pruefe('drei Positionen erfasst', await positionen() === 3)
    const kpiB = await kpiText()
    pruefe('Stückzahl stimmt (44+30+12)', /86 Ladungsträger/.test(kpiB), kpiB.slice(0, 120))
    pruefe('Sendungszähler stimmt', /3 Positionen/.test(await page.locator('#sendungMeta').textContent()))

    /* ---------- Positionen bearbeiten, duplizieren, löschen ---------- */
    console.log('\nB2 · Positionen bearbeiten, duplizieren, löschen')
    await page.click('#posBody tr:nth-child(3) [data-dupliziere]'); await warte(200)
    pruefe('duplizieren fügt eine Zeile an', await positionen() === 4)
    await page.click('#posBody tr:nth-child(4) [data-loesche]'); await warte(200)
    pruefe('löschen entfernt die Zeile', await positionen() === 3)
    await page.click('#posBody tr:nth-child(3) [data-bearbeite]'); await warte(200)
    pruefe('bearbeiten füllt das Formular', await page.inputValue('#mBez') === 'Behälter')
    await page.fill('#mMenge', '20')
    await page.click('#btnManuellAdd'); await warte(200)
    pruefe('bearbeiten ersetzt statt anzuhängen', await positionen() === 3)
    pruefe('geänderte Menge übernommen', /94 Ladungsträger/.test(await kpiText()))

    /* ---------- G · Gewicht unbekannt ---------- */
    console.log('\nG · Gewicht unbekannt')
    await manuell('KLT ohne Gewicht', 600, 400, 280, null, 60, 5)
    const kpiG = await kpiText()
    pruefe('Position ohne Gewicht wird ausgewiesen', /1 Position ohne Gewicht/.test(kpiG), kpiG.slice(0, 200))
    pruefe('Berechnung läuft trotzdem', await page.locator('#plaene .truckblk').count() >= 1)
    pruefe('Tabelle zeigt fehlendes Gewicht als Strich', (await page.locator('#posBody').textContent()).includes('–'))

    /* ---------- H · Nutzlast überschritten ---------- */
    console.log('\nH · Nutzlast überschritten')
    await masseOeffnen()
    await page.fill('#fN', '5000'); await page.locator('#fN').blur(); await warte(300)
    pruefe('Nutzlast-Kennzahl schlägt an', /überschritten/.test(await kpiText()))
    pruefe('Hinweis nennt die Überschreitung', /Nutzlast/.test(await page.locator('#hinweise').textContent()))
    await page.fill('#fN', '45000'); await page.locator('#fN').blur(); await warte(300)
    pruefe('ausreichende Nutzlast wird bestätigt', /eingehalten/.test(await kpiText()), (await kpiText()).slice(-140))
    await page.fill('#fN', '24000'); await page.locator('#fN').blur(); await warte(300)

    /* ---------- I · Stapel durch Fahrzeughöhe begrenzt ---------- */
    console.log('\nI · Stapel durch Fahrzeughöhe begrenzt')
    await page.fill('#fH', '1500'); await page.locator('#fH').blur(); await warte(300)
    pruefe('Höhenhinweis erscheint', /Stapelfaktor auf \d+ reduziert/.test(await page.locator('#hinweise').textContent()))
    await page.fill('#fH', '3000'); await page.locator('#fH').blur(); await warte(300)

    /* ---------- J · mehrere Fahrzeuge ---------- */
    console.log('\nJ · Mehrere Fahrzeuge erforderlich')
    const fzg = Number(await kpiZahl('BenötigteFahrzeuge'))
    pruefe('mehr als ein Fahrzeug nötig', fzg > 1, `${fzg} Fahrzeuge`)
    pruefe('ein Ladeplan je Fahrzeug', await page.locator('#plaene .truckblk').count() === fzg)
    pruefe('Restkapazität ausgewiesen', /Restkapazität/.test(await page.locator('#plaene').textContent()))

    /* ---------- K · Draufsicht und Seitenansicht ---------- */
    console.log('\nK · Draufsicht und Seitenansicht')
    pruefe('Draufsicht je Fahrzeug', await page.locator('#plaene svg[aria-label*="Draufsicht"]').count() === fzg)
    pruefe('Seitenansicht je Fahrzeug', await page.locator('#plaene svg[aria-label*="Seitenansicht"]').count() === fzg)
    pruefe('Legende nennt die Bezeichnungen', /Gitterbox/.test(await page.locator('#plaene .legend').first().textContent()))
    pruefe('Ladepläne skalieren mit der Spalte',
      await page.locator('#plaene svg').first().evaluate(el => el.getAttribute('width') === '100%'))
    await page.locator('#detailsKarte summary').click(); await warte(300)
    pruefe('Rechenweg aufklappbar und gefüllt', /Grundfläche/.test(await page.locator('#rechenweg').textContent()))
    pruefe('Stapelfaktorvergleich zeigt drei Varianten', await page.locator('#cmp .c').count() === 3)

    /* ---------- C · Schnellerfassung aus Stammdaten ---------- */
    console.log('\nC · Beispieldaten und Schnellerfassung')
    await leeren()
    await page.click('#tab-stamm'); await warte(200)
    pruefe('Hinweis auf fehlende Stammdaten', await page.locator('#stammLeer').isVisible())
    await page.click('#btnBeispielSchnell'); await warte(400)
    pruefe('Beispieldaten geladen, Suche frei', await page.locator('#stammSuche').isVisible())
    await page.fill('#qNr', 'GB-01'); await warte(200)
    const hint = await page.locator('#qHint').textContent()
    pruefe('Treffer zeigt Maße und Gewicht', /1240 × 835 × 970/.test(hint) && /700/.test(hint), hint)
    pruefe('Stapelfaktor vorbelegt', await page.inputValue('#qStapel') === '3')
    await page.fill('#qMenge', '24')
    await page.click('#btnQeAdd'); await warte(300)
    pruefe('Position aus Stammdaten übernommen', await positionen() === 1)
    pruefe('Maße wurden übernommen', /1240.835.970/.test((await page.locator('#posBody').textContent()).replace(/\s/g, '')))
    pruefe('ID wurde mitgeführt', (await page.locator('#posBody').textContent()).includes('GB-01'))

    /* ---------- D · CSV-Import ---------- */
    console.log('\nD · CSV importieren und daraus erfassen')
    await page.click('#btnStammdaten'); await warte(300)
    await page.locator('.experte summary').click(); await warte(150)
    await page.fill('#importText', [
      'Nummer;Benennung;Länge;Breite;Höhe;Gewicht;Stapelbarkeit',
      'CSV-01;Kiste aus CSV;1.200;1000;900;250;3',
      'CSV-02;Kaputt;0;600;500;60;4'
    ].join('\n'))
    await page.click('#btnImportText'); await warte(300)
    const vorschau = await page.locator('#importVorschau').textContent()
    pruefe('CSV erkannt', /CSV/.test(vorschau) && /Semikolon/.test(vorschau))
    pruefe('gültig und abgelehnt gezählt', /1 gültig/.test(vorschau) && /1 abgelehnt/.test(vorschau))
    pruefe('Spaltenzuordnung änderbar', await page.locator('#importVorschau select[data-map]').count() >= 7)
    await page.click('[data-import="anhaengen"]'); await warte(400)
    pruefe('Import angehängt', /6 Ladungsträger/.test(await page.locator('#stammMsg').textContent()),
      await page.locator('#stammMsg').textContent())
    await page.click('#btnZurueckPlaner'); await warte(300)
    await page.click('#tab-stamm')
    await page.fill('#qNr', 'CSV-01'); await warte(200)
    await page.fill('#qMenge', '10')
    await page.click('#btnQeAdd'); await warte(300)
    pruefe('Position aus CSV-Stammdaten nutzbar', await positionen() === 2)

    /* ---------- E · XLSX-Import ---------- */
    console.log('\nE · XLSX importieren und daraus erfassen')
    pruefe('Browser kann XLSX entpacken', await page.evaluate(() => {
      try { new DecompressionStream('deflate-raw'); return true } catch { return false }
    }))
    await page.click('#btnStammdaten'); await warte(300)
    await page.setInputFiles('#importDatei', join(WURZEL, 'tests/fixtures/stammdaten-beispiel.xlsx'))
    await warte(700)
    const xv = await page.locator('#importVorschau').textContent()
    pruefe('XLSX gelesen', /XLSX/.test(xv), xv.slice(0, 120))
    pruefe('drei Zeilen erkannt', /3 Datenzeilen/.test(xv), xv.slice(0, 160))
    pruefe('Kopfzeile aus Excel zugeordnet', /3 gültig/.test(xv), xv.slice(0, 200))
    await page.click('[data-import="anhaengen"]'); await warte(400)
    pruefe('XLSX-Daten im Bestand', /9 Ladungsträger/.test(await page.locator('#stammMsg').textContent()),
      await page.locator('#stammMsg').textContent())
    await page.click('#btnZurueckPlaner'); await warte(300)
    await page.click('#tab-stamm')
    await page.fill('#qNr', 'XL-01'); await warte(200)
    pruefe('XLSX-Eintrag gefunden', /Gitterbox aus Excel/.test(await page.locator('#qHint').textContent()))
    await page.fill('#qMenge', '6')
    await page.click('#btnQeAdd'); await warte(300)
    pruefe('Position aus XLSX-Stammdaten nutzbar', await positionen() === 3)

    /* ---------- F · manuell angelegte Stammdaten überleben den Neustart ---------- */
    console.log('\nF · Stammdaten speichern und nach Neustart nutzen')
    await page.click('#tab-manuell')
    await page.check('#mMerken')
    await manuell('Sonderrahmen', 1500, 1200, 1400, 850, 4, 1, 'SR-01')
    pruefe('Position hinzugefügt', await positionen() === 4)
    await page.reload({ waitUntil: 'networkidle' }); await warte(500)
    pruefe('Sendung überlebt den Neustart', await positionen() === 4)
    await page.click('#btnStammdaten'); await warte(300)
    const stammWerte = await page.locator('#stammBody input').evaluateAll(els => els.map(e => e.value))
    pruefe('gemerkter Ladungsträger ist da', stammWerte.includes('Sonderrahmen'), stammWerte.join(' | '))
    await page.click('#btnZurueckPlaner'); await warte(200)
    await page.click('#tab-stamm')
    await page.fill('#qNr', 'SR-01'); await warte(200)
    pruefe('gemerkter Satz ist wiederverwendbar', /1500 × 1200 × 1400/.test(await page.locator('#qHint').textContent()))

    /* ---------- Export ---------- */
    console.log('\nExport')
    await page.click('#btnStammdaten'); await warte(300)
    for (const [knopf, endung] of [['#btnExportCsv', '.csv'], ['#btnExportJson', '.json']]) {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.click(knopf)])
      pruefe(`Export ${endung}`, dl.suggestedFilename().endsWith(endung), dl.suggestedFilename())
    }

    /* ---------- N · Abnahmefall aus dem Berechnungs-Audit ---------- */
    console.log('\nN · Abnahmefall: Kennzahlen und Terminologie')
    await page.click('#btnZurueckPlaner'); await warte(250)
    await leeren()
    await page.click('#tab-manuell')
    await fahrzeugMasse(13600, 2440, 3000)
    await manuell('Gitterbox', 1200, 1000, 1000, 88, 14, 3, '23655')
    await manuell('KLT 888', 1400, 800, 1000, 200, 12, 3)
    await page.click('#btnRechnen'); await warte(500)
    const kpiN = (await page.locator('#kpis').textContent()).replace(/\s/g, '')
    pruefe('Begriff „Benötigte Ladelänge" statt LDM', /BenötigteLadelänge\(m\)/.test(kpiN), kpiN.slice(0, 160))
    pruefe('Begriff „Freie Ladelänge" statt Rest-LDM', /FreieLadelänge\(m\)/.test(kpiN))
    pruefe('kein „Rest-LDM" mehr in der Oberfläche', !/Rest-LDM/.test(kpiN))
    pruefe('Ladelänge 5,80 m', /BenötigteLadelänge\(m\)\??5,80/.test(kpiN), kpiN.slice(0, 200))
    pruefe('LDM 4,37', /LDM\??4,37/.test(kpiN), kpiN.slice(0, 200))
    pruefe('freie Ladelänge 7,80 m', /FreieLadelänge\(m\)\??7,80/.test(kpiN))
    pruefe('Auslastung 42,6 %', /42,6/.test(kpiN))
    pruefe('Gesamtgewicht 3.632 kg', /3\.632/.test(kpiN))
    pruefe('ein Fahrzeug', /BenötigteFahrzeuge1[^0-9]/.test(kpiN))

    await page.locator('#detailsKarte summary').click(); await warte(300)
    const weg = await page.locator('#rechenweg').textContent()
    pruefe('Rechenweg zeigt beide Herleitungen', /Lademeter \(flächenbasiert\)/.test(weg) && /Ladelänge des erzeugten Ladeplans/.test(weg))
    pruefe('Rechenweg nennt die Formel', /belegte Grundfläche ÷ 2,40 m/.test(weg))
    pruefe('Rechenweg beziffert die Differenz', /Differenz 1,43 m/.test(weg), weg.slice(-260))
    pruefe('LDM je Gruppe ausgewiesen', /2,50/.test(weg) && /1,87/.test(weg))
    pruefe('Schlussreihen ausgewiesen', /letzte 1 von 2/.test(weg) && /letzte 1 von 3/.test(weg), weg.slice(0, 400))

    /* ---------- O · Überlänge (V1-Blocker aus dem Audit) ---------- */
    console.log('\nO · Überlänge wird erkannt')
    await leeren()
    await manuell('Langgut', 15000, 2000, 1000, 500, 1, 1)
    await page.click('#btnRechnen'); await warte(400)
    const hinweisO = await page.locator('#hinweise').textContent()
    pruefe('Fehlermeldung „Zu lang"', /Zu lang/.test(hinweisO), hinweisO.slice(0, 200))
    pruefe('Meldung nennt die Innenlänge', /Innenlänge/.test(hinweisO))
    const kpiO = (await page.locator('#kpis').textContent()).replace(/\s/g, '')
    pruefe('kein Fahrzeug ausgewiesen', /BenötigteFahrzeuge0[^0-9]/.test(kpiO), kpiO.slice(0, 120))
    pruefe('keine Auslastung über 100 %', !/1[0-9][0-9],\d\s*%/.test(await page.locator('#kpis').textContent()))
    pruefe('kein Ladeplan gezeichnet', await page.locator('#plaene svg').count() === 0)

    console.log('\nO2 · zu breiter Träger bleibt getrennt gemeldet')
    await leeren()
    await manuell('Zu breit', 3000, 2600, 1000, 500, 1, 1)
    await page.click('#btnRechnen'); await warte(400)
    pruefe('Fehlermeldung „Zu breit"', /Zu breit/.test(await page.locator('#hinweise').textContent()))

    console.log('\nO3 · knapp über Fahrzeuglänge verteilt sauber')
    await leeren()
    await manuell('Block', 2400, 1360, 1000, 100, 11, 1)
    await page.click('#btnRechnen'); await warte(400)
    const kpiO3 = (await page.locator('#kpis').textContent()).replace(/\s/g, '')
    pruefe('zwei Fahrzeuge', /BenötigteFahrzeuge2[^0-9]/.test(kpiO3), kpiO3.slice(0, 120))
    const belegt = await page.evaluate(() => [...document.querySelectorAll('#plaene .truckhd .meta')].map(e => e.textContent.trim()))
    pruefe('kein Fahrzeug über der Innenlänge', belegt.every(t => {
      const m = t.match(/([\d.,]+)\s*\/\s*([\d.,]+)/)
      if (!m) return false
      const zahl = x => Number(x.replace(/\./g, '').replace(',', '.'))
      return zahl(m[1]) <= zahl(m[2]) + 0.001
    }), belegt.join(' | '))

    /* ---------- P · Fahrzeug-Picker ---------- */
    console.log('\nP · Fahrzeug-Picker')
    await leeren()
    pruefe('kein natives Dropdown mehr', await page.locator('#fzg').count() === 0)
    pruefe('Picker geschlossen beim Start', await page.locator('#fzgPanel').isHidden())
    pruefe('gewähltes Fahrzeug steht am Knopf', (await page.locator('#fzgKnopfPrimaer').textContent()).length > 3)

    await page.click('#fzgKnopf'); await warte(200)
    pruefe('Picker öffnet', await page.locator('#fzgPanel').isVisible())
    pruefe('Knopf meldet den offenen Zustand', await page.locator('#fzgKnopf').getAttribute('aria-expanded') === 'true')
    pruefe('Liste ist eine Listbox', await page.locator('#fzgListe').getAttribute('role') === 'listbox')

    const filter = await page.evaluate(() => [...document.querySelectorAll('#fzgFilter [data-filter]')].map(b => b.textContent))
    pruefe('Schnellfilter vorhanden', filter.length === 6, filter.join(' | '))
    for (const f of ['Alle', 'Transporter & Express', 'LKW', 'Sattelauflieger', 'Wechselsysteme', 'Sonderkonfiguration']) {
      pruefe(`Filter „${f}"`, filter.includes(f), filter.join(' | '))
    }
    pruefe('„Nicht unterstützt" ist kein Filter', !filter.some(f => /nicht unterstützt/i.test(f)))

    const zeilenIds = async () => page.evaluate(() => [...document.querySelectorAll('#fzgListe .pz')].map(li => li.dataset.id))
    pruefe('Filter „Alle" zeigt alle 15 Einträge', (await zeilenIds()).length === 15, String((await zeilenIds()).length))

    await page.click('[data-filter="transporter"]'); await warte(200)
    const transporter = await zeilenIds()
    pruefe('Transporter & Express filtert', transporter.length === 5, transporter.join(', '))
    pruefe('Planensprinter stehen vorn', transporter.slice(0, 3).join(',') ===
      'sprinter_schutz_m6_plane_2000,sprinter_schutz_ta6_plane_2000,sprinter_schutz_ta4_plane_2000', transporter.join(', '))
    const ersteSichtbar = await page.evaluate(() => {
      const li = document.querySelector('#fzgListe .pz'), box = document.getElementById('fzgListe').getBoundingClientRect()
      const r = li.getBoundingClientRect()
      return r.top >= box.top - 1 && r.bottom <= box.bottom + 1
    })
    pruefe('M6 ohne Scrollen sichtbar', ersteSichtbar)

    for (const [f, anzahl] of [['lkw', 4], ['sattel', 3], ['wechsel', 2], ['sonder', 1]]) {
      await page.click(`[data-filter="${f}"]`); await warte(150)
      pruefe(`Filter ${f} zeigt ${anzahl}`, (await zeilenIds()).length === anzahl, (await zeilenIds()).join(', '))
    }
    await page.click('[data-filter="alle"]'); await warte(150)

    /* Zeileninhalt */
    const ta6 = await page.evaluate(() => {
      const li = document.querySelector('.pz[data-id="sprinter_schutz_ta6_plane_2000"]')
      return {
        primaer: li.querySelector('.pz-primaer').textContent,
        sekundaer: li.querySelector('.pz-sekundaer').textContent,
        masse: li.querySelector('.pz-masse').textContent,
        badges: [...li.querySelectorAll('.badge')].map(b => b.textContent)
      }
    })
    pruefe('Primärname erklärt die Fahrzeugart', ta6.primaer === 'Planensprinter · 4,30 m · Tiefpritsche', ta6.primaer)
    pruefe('Referenzname bleibt sichtbar', /Schutz TA6/.test(ta6.sekundaer), ta6.sekundaer)
    pruefe('Maße in der Zeile', ta6.masse === '4.300 × 2.030 × 2.000 mm', ta6.masse)
    pruefe('höchstens zwei Etiketten', ta6.badges.length <= 2 && ta6.badges.includes('Radkästen'), ta6.badges.join(', '))
    const m6Badges = await page.evaluate(() =>
      [...document.querySelectorAll('.pz[data-id="sprinter_schutz_m6_plane_2000"] .badge')].map(b => b.textContent))
    pruefe('M6 ohne Radkasten-Etikett', !m6Badges.includes('Radkästen'), m6Badges.join(', '))

    /* Jumbo bleibt Hinweis, keine Zeile */
    const jumboZeile = await page.locator('#fzgListe .pz', { hasText: 'Jumbo' }).count()
    pruefe('Jumbo ist keine Auswahlzeile', jumboZeile === 0)
    const jumboText = await page.locator('#fzgGesperrt').textContent()
    pruefe('Jumbo als Hinweis im Fuß', /Jumbo \/ Volumenzug/.test(jumboText) && /Noch nicht unterstützt/i.test(jumboText))
    pruefe('Jumbo nennt den Grund', /zwei getrennte Ladeflächen/.test(jumboText))

    /* Auswahl */
    await page.click('.pz[data-id="sprinter_schutz_ta4_plane_2000"]'); await warte(250)
    pruefe('Picker schließt nach der Auswahl', await page.locator('#fzgPanel').isHidden())
    pruefe('Knopf zeigt den Primärnamen', (await page.locator('#fzgKnopfPrimaer').textContent()) === 'Planensprinter · 3,48 m · Tiefpritsche')
    pruefe('Knopf zeigt die Referenz', /Schutz TA4/.test(await page.locator('#fzgKnopfSekundaer').textContent()))
    await masseOeffnen()
    pruefe('Maße übernommen', await page.inputValue('#fL') === '3480' && await page.inputValue('#fB') === '2030')
    pruefe('Karte zeigt die technische Konfiguration', /Schutz Tiefpritsche Typ TA4/.test(await page.locator('#fzgName').textContent()))
    pruefe('Karte wiederholt den Picker-Namen nicht', (await page.locator('#fzgName').textContent()) !== 'Planensprinter · 3,48 m · Tiefpritsche')
    pruefe('Radkastenwarnung unverändert', /Radkästen vorhanden/.test(await page.locator('#fzgWarnung').textContent()))
    pruefe('Richtwert unverändert', (await page.locator('#fzgStatus').textContent()).includes('Richtwert'))

    /* Alle Vorlagen: Maße und Nutzlast unverändert */
    const erwartet = {
      sprinter_schutz_m6_plane_2000: [4300, 2030, 2000, ''],
      sprinter_schutz_ta6_plane_2000: [4300, 2030, 2000, ''],
      sprinter_schutz_ta4_plane_2000: [3480, 2030, 2000, ''],
      transit_l3h3_fwd_srw: [3533, 1784, 2125, ''],
      transit_l4h3_rwd_awd: [4256, 1784, 2025, ''],
      spier_aerobox_sprinter_35t: [4350, 2060, 2100, '940'],
      atego_818_spier_athlet_plus: [6050, 2496, 2396, ''],
      atego_1224_spier_athlet: [7200, 2496, 2369, ''],
      man_tgm_18290_spier_thermo: [7650, 2490, 2400, ''],
      krone_profi_liner_2600: [13620, 2480, 2600, '33060'],
      krone_profi_liner_2700: [13620, 2480, 2700, '33060'],
      krone_mega_liner_3000: [13620, 2480, 3000, '32100'],
      krone_wp73_ls5_cs: [7280, 2480, 2390, ''],
      krone_wk73_stg: [7300, 2470, 2525, '']
    }
    let massOk = 0, nutzlastLeer = 0
    for (const [id, [l, b, h, n]] of Object.entries(erwartet)) {
      await fahrzeugWaehlen(id)
      await masseOeffnen()
      const ist = await page.evaluate(() => [
        document.getElementById('fL').value, document.getElementById('fB').value,
        document.getElementById('fH').value, document.getElementById('fN').value])
      if (ist.join('/') === [l, b, h, n].join('/')) massOk++
      else console.log(`      ${id}: erwartet ${l}/${b}/${h}/${n || '—'}, ist ${ist.join('/')}`)
      if (n === '' && ist[3] === '') nutzlastLeer++
    }
    pruefe('alle 14 Vorlagen übernehmen ihre Maße', massOk === 14, `${massOk} von 14`)
    pruefe('nicht belegte Nutzlast bleibt leer', nutzlastLeer === 10, `${nutzlastLeer} von 10`)
    await fahrzeugWaehlen('spier_aerobox_sprinter_35t')
    pruefe('belegte Nutzlast unverändert', /940/.test(await page.locator('#fzgNutzlast').textContent()))
    pruefe('Nutzlasthinweis unverändert', /dokumentierte/.test(await page.locator('#fzgNutzlast').textContent()))
    pruefe('keine Palettenangabe', !/Palette/i.test(await page.locator('#fzgKarte').textContent()))
    await page.locator('#fzgQuelleBox summary').click(); await warte(200)
    pruefe('Quelle unverändert auffindbar', /SPIER/.test(await page.locator('#fzgQuelle').textContent()))
    pruefe('keine URLs in der Oberfläche', !/https?:\/\//.test(await page.locator('#fahrzeugKarte').textContent()))

    /* Freie Maße */
    await fahrzeugWaehlen('frei')
    pruefe('freie Maße heißen verständlich', (await page.locator('#fzgKnopfPrimaer').textContent()) === 'Freie Fahrzeugmaße')
    pruefe('freie Maße öffnen die Felder', await page.locator('#masseBox').isVisible())
    await fahrzeugMasse(9000, 2300, 2600, 5000)
    pruefe('eigene Maße wirken', (await page.locator('#fzgMasse').textContent()).includes('9.000'))

    /* Tastatur */
    console.log('\nP2 · Tastatur und Schließen')
    await page.locator('#fzgKnopf').focus()
    await page.keyboard.press('Enter'); await warte(200)
    pruefe('Enter öffnet den Picker', await page.locator('#fzgPanel').isVisible())
    pruefe('Fokus liegt in der Liste', await page.evaluate(() => !!document.activeElement.closest('#fzgListe')))
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await warte(120)
    const aktiv = await page.evaluate(() => document.activeElement.dataset.id)
    pruefe('Pfeiltasten bewegen die Auswahl', !!aktiv, String(aktiv))
    await page.keyboard.press('Home'); await warte(100)
    pruefe('Home springt zum ersten Eintrag', await page.evaluate(() => document.activeElement === document.querySelector('#fzgListe .pz')))
    await page.keyboard.press('End'); await warte(100)
    pruefe('End springt zum letzten Eintrag', await page.evaluate(() => {
      const alle = [...document.querySelectorAll('#fzgListe .pz')]
      return document.activeElement === alle[alle.length - 1]
    }))
    await page.keyboard.press('Enter'); await warte(250)
    pruefe('Enter wählt aus und schließt', await page.locator('#fzgPanel').isHidden())
    pruefe('Fokus kehrt zum Knopf zurück', await page.evaluate(() => document.activeElement.id === 'fzgKnopf'))

    await page.keyboard.press('ArrowDown'); await warte(200)
    pruefe('Pfeil nach unten öffnet', await page.locator('#fzgPanel').isVisible())
    await page.keyboard.press('Escape'); await warte(200)
    pruefe('Escape schließt', await page.locator('#fzgPanel').isHidden())
    pruefe('Escape gibt den Fokus zurück', await page.evaluate(() => document.activeElement.id === 'fzgKnopf'))

    await page.click('#fzgKnopf'); await warte(200)
    await page.click('#sendungKarte h2'); await warte(250)
    pruefe('Klick außerhalb schließt', await page.locator('#fzgPanel').isHidden())

    /* ---------- Q · CA-Fahrzeugsilhouetten ---------- */
    console.log('\nQ · Fahrzeugsilhouetten')
    if (await page.locator('#fzgPanel').isHidden()) { await page.click('#fzgKnopf'); await warte(200) }
    await page.click('[data-filter="alle"]'); await warte(200)

    const bilder = await page.evaluate(() => [...document.querySelectorAll('#fzgListe .pz')].map(li => ({
      id: li.dataset.id,
      quelle: li.querySelector('.pz-bild')?.getAttribute('src') || null,
      alt: li.querySelector('.pz-bild')?.getAttribute('alt'),
      versteckt: li.querySelector('.pz-bild')?.getAttribute('aria-hidden')
    })))
    pruefe('jede Zeile trägt eine Silhouette', bilder.every(b => b.quelle), JSON.stringify(bilder.find(b => !b.quelle)))
    pruefe('alle Silhouetten sind lokal', bilder.every(b => b.quelle.startsWith('assets/vehicles/')))
    pruefe('Silhouetten sind dekorativ ausgezeichnet', bilder.every(b => b.alt === '' && b.versteckt === 'true'))

    const typ = id => (bilder.find(b => b.id === id) || {}).quelle
    pruefe('M6 → Planensprinter-Silhouette', typ('sprinter_schutz_m6_plane_2000') === 'assets/vehicles/curtain-van.svg', typ('sprinter_schutz_m6_plane_2000'))
    pruefe('TA6 → Planensprinter-Silhouette', typ('sprinter_schutz_ta6_plane_2000') === 'assets/vehicles/curtain-van.svg')
    pruefe('TA4 → Planensprinter-Silhouette', typ('sprinter_schutz_ta4_plane_2000') === 'assets/vehicles/curtain-van.svg')
    pruefe('Transit → Kastenwagen', typ('transit_l3h3_fwd_srw') === 'assets/vehicles/van.svg')
    pruefe('Koffer → Koffer-LKW', typ('atego_818_spier_athlet_plus') === 'assets/vehicles/box-truck.svg')
    pruefe('Profi Liner → Curtainsider', typ('krone_profi_liner_2700') === 'assets/vehicles/curtainsider.svg')
    pruefe('Mega Liner → Mega', typ('krone_mega_liner_3000') === 'assets/vehicles/mega-trailer.svg')
    pruefe('Wechselaufbau → Wechselsystem', typ('krone_wp73_ls5_cs') === 'assets/vehicles/swap-body.svg')
    pruefe('freie Maße → neutrale Ladefläche', typ('frei') === 'assets/vehicles/generic.svg')
    pruefe('Planensprinter und Kastenwagen unterscheiden sich', typ('sprinter_schutz_m6_plane_2000') !== typ('transit_l3h3_fwd_srw'))
    pruefe('Standard und Mega unterscheiden sich', typ('krone_profi_liner_2700') !== typ('krone_mega_liner_3000'))
    pruefe('Jumbo hat keine Silhouette', !(await page.locator('#fzgGesperrt img').count()))

    const geladen = await page.evaluate(async () => {
      const bilder = [...document.querySelectorAll('#fzgListe .pz-bild')]
      await Promise.all(bilder.map(b => b.complete ? null : new Promise(r => { b.onload = r; b.onerror = r })))
      return bilder.every(b => b.naturalWidth > 0)
    })
    pruefe('alle Silhouetten laden fehlerfrei', geladen)

    /* Wechsel aktualisiert Knopf und Karte */
    await page.click('.pz[data-id="krone_mega_liner_3000"]'); await warte(300)
    pruefe('Knopf zeigt die Silhouette', (await page.getAttribute('#fzgKnopfBild', 'src')) === 'assets/vehicles/mega-trailer.svg')
    pruefe('Karte zeigt die Silhouette', (await page.getAttribute('#fzgBild', 'src')) === 'assets/vehicles/mega-trailer.svg')
    await fahrzeugWaehlen('sprinter_schutz_ta4_plane_2000')
    pruefe('Wechsel aktualisiert den Knopf', (await page.getAttribute('#fzgKnopfBild', 'src')) === 'assets/vehicles/curtain-van.svg')
    pruefe('Wechsel aktualisiert die Karte', (await page.getAttribute('#fzgBild', 'src')) === 'assets/vehicles/curtain-van.svg')
    pruefe('Karte bleibt kompakt', await page.locator('#fzgKarte').evaluate(el => el.getBoundingClientRect().height < 420))
    pruefe('Radkastenhinweis weiterhin als Text', /Radkästen vorhanden/.test(await page.locator('#fzgWarnung').textContent()))

    pruefe('keine fehlenden Assets', fehlendeAssets.length === 0, fehlendeAssets.slice(0, 3).join(' | '))

    /* ---------- L · Druckansicht ---------- */
    console.log('\nL · Druckansicht')
    /* Die Abschnitte N und O enden bereits im Planer — hier steht eine Sendung mit Ladeplan */
    await leeren()
    await manuell('Gitterbox', 1240, 835, 970, 700, 44, 3)
    await manuell('Europalette', 1200, 800, 1000, 400, 30, 2)
    await page.click('#btnRechnen'); await warte(400)
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
    await page.emulateMedia({ media: 'print' }); await warte(300)
    pruefe('Ladeplan im Druck sichtbar', await page.locator('#plaene .truckblk').first().isVisible())
    pruefe('Sendungstabelle im Druck sichtbar', await page.locator('#posTable').isVisible())
    pruefe('Erfassungsmaske im Druck ausgeblendet', await page.locator('#erfassenKarte').isHidden())
    pruefe('Rechenweg im Druck aufgeklappt', await page.locator('#rechenweg').isVisible())
    pruefe('Knöpfe im Druck ausgeblendet', await page.locator('#btnRechnen').isHidden())
    await page.emulateMedia({ media: 'screen' }); await warte(200)

    /* ---------- M · Desktop, Tablet, Mobile ---------- */
    console.log('\nM · Desktop, Tablet, Mobile')
    for (const [name, w, h] of [['Desktop', 1600, 1000], ['Tablet', 834, 1112], ['Mobile', 390, 844]]) {
      await page.setViewportSize({ width: w, height: h }); await warte(350)
      const ueber = await page.evaluate(() => {
        const w = document.documentElement.clientWidth
        return {
          zuviel: document.documentElement.scrollWidth - w,
          schuldige: [...document.querySelectorAll('body *')]
            .filter(e => e.getBoundingClientRect().right > w + 1)
            .slice(0, 5).map(e => `${e.tagName}.${(e.className || '').toString().slice(0, 28)}`)
        }
      })
      pruefe(`${name}: kein horizontaler Seitenscroll`, ueber.zuviel <= 1,
        `${ueber.zuviel}px über: ${ueber.schuldige.join(', ')}`)
      pruefe(`${name}: Hauptaktion sichtbar`, await page.locator('#btnRechnen').isVisible())
      pruefe(`${name}: Erfassung bedienbar`, await page.locator('#mBez').isVisible() || await page.locator('#qNr').isVisible())
      const pickerHoehe = await page.evaluate(async () => {
        const knopf = document.getElementById('fzgKnopf')
        knopf.click()
        await new Promise(r => setTimeout(r, 150))
        const h = document.getElementById('fzgPanel').getBoundingClientRect().height / window.innerHeight
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        return Math.round(h * 100)
      })
      pruefe(`${name}: Picker bleibt kompakt (${pickerHoehe} %)`, pickerHoehe <= 65)
    }
    const hinweisSichtbar = await page.evaluate(() => {
      const h = [...document.querySelectorAll('.scrollhinweis')]
      return h.some(x => x.classList.contains('an') && getComputedStyle(x).display !== 'none')
    })
    pruefe('Mobile: Scrollhinweis unter breiten Bereichen', hinweisSichtbar)
    await page.setViewportSize({ width: 1600, height: 1000 })

    /* ---------- Zurücksetzen ---------- */
    console.log('\nZurücksetzen')
    await page.click('#btnStammdaten'); await warte(200)
    await page.click('#btnReset'); await warte(400)
    pruefe('Bestand geleert', /Noch keine Stammdaten/.test(await page.locator('#stammMeta').textContent()))
    const rest = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('ldm-planer.')))
    pruefe('lokaler Speicher geleert', rest.length === 0, rest.join(','))

    /* ---------- Datenschutz ---------- */
    console.log('\nDatenschutz')
    const fremd = anfragen.filter(u => !u.startsWith(BASIS))
    pruefe('keine Fremdanfragen', fremd.length === 0, fremd.join(', '))
    const nichtStatisch = anfragen.filter(u => u.startsWith(BASIS) && !/\.(html|css|js|svg|png|ico|json|csv|xlsx)(\?|$)|\/$/.test(u))
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
