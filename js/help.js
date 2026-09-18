/*
 * Erklärungen an Ort und Stelle.
 * Übernommen aus der Ursprungsfassung und von kundenspezifischen Angaben
 * befreit: Zahlen zum Bestand kommen jetzt aus den eigenen Stammdaten,
 * feste Katalogangaben gibt es nicht mehr.
 */

export const HILFE = {
  ldm: ['Lademeter',
    '<p>Ein Lademeter ist ein laufender Meter Ladefläche über die <b>volle Fahrzeugbreite</b>. Zwei Ladungsträger von 1,20 m nebeneinander ergeben zusammen einen Lademeter, nicht zwei.</p>'
    + '<p><b>Abweichung zum Spediteur:</b> Viele Speditionen runden je Position auf halbe oder volle Meter auf. Hier werden erst alle Stellplätze zusammengezählt und dann gerundet. Bei Sendungen mit vielen kleinen Positionen macht das schnell ein bis zwei Meter Unterschied.</p>'],

  fahrzeug: ['Innenmaße',
    '<p>Gemeint sind die <b>Innenmaße der Ladefläche</b>, nicht die Fahrzeugaußenmaße. Die Höhe begrenzt den Stapelfaktor: Passt der deklarierte Stapel nicht unter das Dach, wird er automatisch reduziert und ein Hinweis erscheint.</p>'
    + '<p>Die Vorlagen sind Richtwerte und gelten nicht für jedes reale Fahrzeug. Bei abweichenden Fahrzeugen die Werte direkt überschreiben – die Auswahl springt dann auf „Freie Maße“.</p>'],

  nutzlast: ['Nutzlast',
    '<p>Optional. Ist eine Nutzlast hinterlegt, wird das geplante Gewicht je Fahrzeug dagegen geprüft und bei Überschreitung gewarnt.</p>'
    + '<p>Die Verteilung auf die Fahrzeuge richtet sich weiterhin nach der <b>Ladelänge</b>, nicht nach dem Gewicht. Bei einer Warnung die Positionen manuell umverteilen.</p>'
    + '<p>Achslasten werden <b>nicht</b> berechnet. Das Ergebnis ersetzt keine Prüfung der Ladungssicherung.</p>'],

  stapel: ['Stapel max.',
    '<p>Die <b>Obergrenze</b>, nicht die tatsächliche Stapelhöhe. Der Wert sagt: höchstens so viele Träger dürfen übereinander stehen. Er stammt aus den Stammdaten und gehört zur gewählten Variante – deshalb steht er hier nur zum Ablesen.</p>'
    + '<p><b>Beispiel:</b> 2 Stück bei max. 3 ergeben <i>einen</i> Stapel mit 2 Stück – nicht drei. 4 Stück ergeben zwei Stapel: einen mit 3, einen mit 1. Was wirklich steht, zeigen der Ladeplan und die Spalte Stellplätze.</p>'
    + '<p>Die Grenze wird automatisch gesenkt, wenn die Innenhöhe des Fahrzeugs nicht reicht.</p>'
    + '<p><b>Weniger stapelbar als in den Stammdaten?</b> Etwa weil die Beladung es nicht zulässt: die Position als Sonderladungsträger anlegen, dieselben Maße eintragen und den Stapel dort frei setzen.</p>'],

  stellplatz: ['Stellplätze',
    '<p>Ein Stellplatz ist die Grundfläche für <b>einen Stapel</b>. Menge geteilt durch die Obergrenze, aufgerundet – der Rest bleibt ein angebrochener Stapel.</p>'
    + '<p>Die kleine Zeile darunter zeigt die Verteilung: <b>13 × 3 + 1</b> heißt dreizehn volle Dreierstapel und ein einzelner Träger obendrauf, zusammen 14 Stellplätze.</p>'
    + '<p>Aufgerundet wird je Grundfläche, nicht je Position: Zwei Positionen mit derselben Grundfläche teilen sich den angebrochenen Stapel.</p>'],

  ausrichtung: ['Quer oder längs',
    '<p>Jede Grundfläche wird in beiden Ausrichtungen durchgerechnet, gewählt wird die mit der <b>kürzeren Ladelänge</b>.</p>'
    + '<p>„1.200 mm quer“ heißt: die 1.200-mm-Kante liegt zur Fahrzeugbreite. Bei 2.440 mm Innenbreite passen zwei nebeneinander, jede Reihe ist 1.000 mm tief – macht 0,50 m je Stellplatz.</p>'],

  auslastung: ['Auslastung',
    '<p>Belegte Ladelänge im Verhältnis zur Kapazität <b>aller eingesetzten Fahrzeuge</b>. Bei zwei Fahrzeugen ist der Bezug also die doppelte Ladelänge.</p>'
    + '<p>Ein Wert knapp über 50 % bei zwei Fahrzeugen heißt: Das zweite Fahrzeug ist fast leer. Ein Blick auf den Stapelfaktor-Vergleich lohnt sich dann.</p>'],

  rest: ['Freie Ladelänge',
    '<p>Was auf dem <b>letzten</b> Fahrzeug noch frei ist. Der Hinweis unter jedem Ladeplan rechnet das in Ladungsträger um: wie viele Stück welcher Grundfläche noch mitgehen könnten.</p>'
    + '<p>Nützlich, wenn eine Sendung ohnehin fährt und Restplatz genutzt werden soll.</p>'],

  gewicht: ['Gewicht',
    '<p>Summe aus Menge × Einzelgewicht der erfassten Positionen. Ohne gepflegtes Gewicht in den Stammdaten bleibt der Wert 0.</p>'
    + '<p>Teilen sich mehrere Träger mit unterschiedlichem Gewicht eine Grundfläche, rechnet die Verteilung je Fahrzeug mit dem <b>Mittelwert</b> der Gruppe. Die Gesamtsumme bleibt davon unberührt und ist exakt.</p>'],

  nummer: ['Schnellerfassung',
    '<p>ID, Bezeichnung oder Maß eintippen – die passende Variante wird gesucht. Mehrere Stammdatensätze mit identischen Maßen und identischem Stapelfaktor bilden <b>eine</b> Variante, weil sie sich gleich rechnen.</p>'
    + '<p>Wer die ID kennt, tippt sie hier ein. Wer nicht, wählt in der Zeile über die Grundfläche. Für die Rechnung zählen nur Maße, Stapelfaktor und Gewicht.</p>'],

  sonder: ['Sonderladungsträger',
    '<p>Für alles, was nicht in den Stammdaten steht: Länge, Breite, Höhe und Gewicht frei eintragen, Stapelfaktor selbst setzen.</p>'
    + '<p>Sonderpositionen mischen sich normal mit Stammdatenpositionen. Stimmt die Grundfläche überein, werden beide zusammen gerechnet – dann gilt der kleinere der beiden Stapelwerte.</p>'
    + '<p>Auch der Weg, um einen Träger aus den Stammdaten ausnahmsweise niedriger zu stapeln.</p>'],

  mischhoehen: ['Mischhöhen',
    '<p>Mehrere Höhen auf derselben Grundfläche. Gerechnet wird mit dem <b>höchsten Träger</b> und dem <b>kleinsten Stapelfaktor</b> der Gruppe – im Zweifel zu Ihren Ungunsten, aber nie zu knapp.</p>'
    + '<p>Wird in der Praxis nicht gemischt gestapelt, die Positionen auf getrennte Grundflächen aufteilen oder den Stapel je Zeile korrigieren.</p>'],

  import: ['Stammdaten importieren',
    '<p>CSV mit Kopfzeile. Trennzeichen (Semikolon, Komma, Tabulator) und Spalten werden automatisch erkannt – die Zuordnung lässt sich vor der Übernahme korrigieren.</p>'
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
