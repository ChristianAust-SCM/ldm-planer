/*
 * Erklärungen an Ort und Stelle.
 * Übernommen aus der Ursprungsfassung und von kundenspezifischen Angaben
 * befreit: Zahlen zum Bestand kommen jetzt aus den eigenen Stammdaten,
 * feste Katalogangaben gibt es nicht mehr.
 */

export const HILFE = {
  ladelaenge: ['Benötigte Ladelänge',
    '<p>Die <b>tatsächlich benötigte Fahrzeuglänge</b> des erzeugten Ladeplans: alle Reihen hintereinander, jede so tief wie der Träger in der gewählten Ausrichtung.</p>'
    + '<p>Eine nur teilweise belegte Schlussreihe kostet die volle Reihenlänge – der Platz daneben bleibt leer, verbraucht aber Ladefläche. Deshalb liegt dieser Wert oft <b>über</b> der flächenbasierten LDM-Kennzahl.</p>'
    + '<p>Für die Disposition ist das die maßgebliche Zahl: sie sagt, wie viel Meter Fahrzeug tatsächlich gebraucht werden.</p>'],

  ldm: ['Lademeter (LDM)',
    '<p>Die klassische, <b>flächenbasierte</b> Kennzahl der Logistik: ein Lademeter ist ein laufender Meter Ladefläche über die volle Fahrzeugbreite.</p>'
    + '<p><b>LDM = belegte Grundfläche ÷ 2,40 m</b> Bezugsbreite. Gerechnet wird mit den Stellplätzen nach wirksamem Stapelfaktor – gestapelte Träger belegen dieselbe Grundfläche.</p>'
    + '<p><b>Nicht dasselbe wie die Ladelänge:</b> die LDM-Kennzahl kennt keine halb belegten Reihen und keine ungenutzte Restbreite. Der Rechenweg zeigt beide Herleitungen und beziffert die Differenz.</p>'
    + '<p>Speditionen runden zudem häufig je Position auf halbe oder volle Meter auf – auch davon weicht dieser Wert ab.</p>'],

  nutzlast: ['Nutzlast',
    '<p>Optional. Ist eine Nutzlast hinterlegt, wird das geplante Gewicht je Fahrzeug dagegen geprüft und bei Überschreitung gewarnt.</p>'
    + '<p>Die Verteilung auf die Fahrzeuge richtet sich weiterhin nach der <b>Ladelänge</b>, nicht nach dem Gewicht. Bei einer Warnung die Positionen manuell umverteilen.</p>'
    + '<p>Achslasten werden <b>nicht</b> berechnet. Das Ergebnis ersetzt keine Prüfung der Ladungssicherung.</p>'],

  stapel: ['Stapel max.',
    '<p>Die <b>Obergrenze</b>, nicht die tatsächliche Stapelhöhe. Der Wert sagt: höchstens so viele Träger dürfen übereinander stehen. Er stammt aus den Stammdaten und gehört zur gewählten Variante – deshalb steht er hier nur zum Ablesen.</p>'
    + '<p><b>Beispiel:</b> 2 Stück bei max. 3 ergeben <i>einen</i> Stapel mit 2 Stück – nicht drei. 4 Stück ergeben zwei Stapel: einen mit 3, einen mit 1. Was wirklich steht, zeigen der Ladeplan und die Spalte Stellplätze.</p>'
    + '<p>Die Grenze wird automatisch gesenkt, wenn die Innenhöhe des Fahrzeugs nicht reicht.</p>'
    + '<p>Der Wert lässt sich je Position frei ändern — etwa wenn die Beladung weniger zulässt, als die Stammdaten hergeben.</p>'],

  stellplatz: ['Stellplätze',
    '<p>Ein Stellplatz ist die Grundfläche für <b>einen Stapel</b>. Menge geteilt durch die Obergrenze, aufgerundet – der Rest bleibt ein angebrochener Stapel.</p>'
    + '<p>Die kleine Zeile darunter zeigt die Verteilung: <b>13 × 3 + 1</b> heißt dreizehn volle Dreierstapel und ein einzelner Träger obendrauf, zusammen 14 Stellplätze.</p>'
    + '<p>Aufgerundet wird je Grundfläche, nicht je Position: Zwei Positionen mit derselben Grundfläche teilen sich den angebrochenen Stapel.</p>'],

  ausrichtung: ['Quer oder längs',
    '<p>Jede Grundfläche wird in beiden Ausrichtungen durchgerechnet, gewählt wird die mit der <b>kürzeren Ladelänge</b>.</p>'
    + '<p>„1.200 mm quer“ heißt: die 1.200-mm-Kante liegt zur Fahrzeugbreite. Bei 2.440 mm Innenbreite passen zwei nebeneinander, jede Reihe ist 1.000 mm tief – macht 0,50 m je Stellplatz.</p>'],

  auslastung: ['Auslastung',
    '<p>Bezugsgröße ist die <b>Ladelänge</b>, nicht die LDM-Kennzahl: belegte Ladelänge im Verhältnis zur Länge <b>aller eingesetzten Fahrzeuge</b>. Bei zwei Fahrzeugen ist der Bezug also die doppelte Ladelänge.</p>'
    + '<p>Ein Wert knapp über 50 % bei zwei Fahrzeugen heißt: Das zweite Fahrzeug ist fast leer. Ein Blick auf den Stapelfaktor-Vergleich lohnt sich dann.</p>'],

  rest: ['Freie Ladelänge',
    '<p>Was auf dem <b>letzten</b> Fahrzeug an Ladelänge noch frei ist: Innenlänge minus belegte Ladelänge. Der Hinweis unter jedem Ladeplan rechnet das in Ladungsträger um: wie viele Stück welcher Grundfläche noch mitgehen könnten.</p>'
    + '<p>Nützlich, wenn eine Sendung ohnehin fährt und Restplatz genutzt werden soll.</p>'],

  gewicht: ['Gewicht',
    '<p>Summe aus Menge × Einzelgewicht der erfassten Positionen.</p>'
    + '<p>Teilen sich mehrere Träger mit unterschiedlichem Gewicht eine Grundfläche, rechnet die Verteilung je Fahrzeug mit dem <b>Mittelwert</b> der Gruppe. Die Gesamtsumme bleibt davon unberührt und ist exakt.</p>'],

  nummer: ['Aus Stammdaten übernehmen',
    '<p>ID, Bezeichnung oder Maß eintippen – der passende Ladungsträger wird gesucht und mit Maßen, Gewicht und Stapelfaktor übernommen. Danach nur noch Menge und gewünschten Stapelfaktor setzen.</p>'
    + '<p>Ein Komfortweg, keine Voraussetzung: Ohne Stammdaten wird dieselbe Position unter „Manuell eingeben“ in wenigen Sekunden erfasst. Für die Rechnung zählen nur Maße, Stapelfaktor und Gewicht.</p>'],

  mischhoehen: ['Mischhöhen',
    '<p>Mehrere Höhen auf derselben Grundfläche. Gerechnet wird mit dem <b>höchsten Träger</b> und dem <b>kleinsten Stapelfaktor</b> der Gruppe – im Zweifel zu Ihren Ungunsten, aber nie zu knapp.</p>'
    + '<p>Wird in der Praxis nicht gemischt gestapelt, die Positionen auf getrennte Grundflächen aufteilen oder den Stapel je Zeile korrigieren.</p>'],

  import: ['Stammdaten importieren',
    '<p>Excel-Datei (.xlsx) oder CSV mit Kopfzeile. Trennzeichen und Spalten werden automatisch erkannt – die Zuordnung lässt sich vor der Übernahme korrigieren.</p>'
    + '<p>Pflicht sind ID, Bezeichnung, Länge, Breite, Höhe und Stapelfaktor. Gewicht und Kategorie sind optional. Maße in mm, Gewicht in kg.</p>'
    + '<p>Die Datei wird <b>im Browser</b> gelesen und nirgendwohin übertragen.</p>']
}

let aktiv = null

export function verbinde() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.hlp')
    if (btn) { oeffne(btn, btn.dataset.hlp); return }
    if (!e.target.closest('.hpop')) schliesse()
  })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') schliesse() })
  window.addEventListener('resize', schliesse)
  window.addEventListener('scroll', schliesse, { passive: true })
}

export function oeffne(el, key) {
  const pop = document.getElementById('hpop')
  if (!pop) return
  if (aktiv === el) { schliesse(); return }
  schliesse()
  const d = HILFE[key]
  if (!d) return
  pop.innerHTML = `<h4>${d[0]}</h4>${d[1]}`
  pop.hidden = false
  const r = el.getBoundingClientRect(), br = pop.getBoundingClientRect()
  const maxL = window.scrollX + document.documentElement.clientWidth - br.width - 12
  pop.style.left = Math.round(Math.max(window.scrollX + 12, Math.min(r.left + window.scrollX - 12, maxL))) + 'px'
  const untenPasst = r.bottom + br.height + 14 < window.innerHeight
  pop.style.top = Math.round(untenPasst ? r.bottom + window.scrollY + 8 : r.top + window.scrollY - br.height - 8) + 'px'
  el.classList.add('on')
  aktiv = el
}

export function schliesse() {
  if (aktiv) aktiv.classList.remove('on')
  aktiv = null
  const pop = document.getElementById('hpop')
  if (pop) pop.hidden = true
}

/** Hilfe-Button als HTML-Schnipsel */
export const HB = key => `<button type="button" class="hlp noprint" data-hlp="${key}" aria-label="Erklärung"></button>`
