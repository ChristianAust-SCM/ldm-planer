/*
 * Neutraler Beispieldatensatz. Generische Ladungsträger, keine Kundenstammdaten.
 * Maße sind Richtwerte und müssen vor realem Einsatz geprüft werden.
 */
export const BEISPIEL_LADUNGSTRAEGER = [
  { id: 'EP-01',  bezeichnung: 'Europalette, beladen',      laenge_mm: 1200, breite_mm:  800, hoehe_mm: 1000, gewicht_kg: 400, stapelfaktor_max: 2, kategorie: 'Palette' },
  { id: 'IP-01',  bezeichnung: 'Industriepalette, beladen', laenge_mm: 1200, breite_mm: 1000, hoehe_mm: 1050, gewicht_kg: 500, stapelfaktor_max: 2, kategorie: 'Palette' },
  { id: 'GB-01',  bezeichnung: 'Gitterbox',                 laenge_mm: 1240, breite_mm:  835, hoehe_mm:  970, gewicht_kg: 700, stapelfaktor_max: 3, kategorie: 'Gitterbox' },
  { id: 'KLT-01', bezeichnung: 'Kleinladungsträger',        laenge_mm:  600, breite_mm:  400, hoehe_mm:  280, gewicht_kg:  25, stapelfaktor_max: 5, kategorie: 'Behälter' },
  { id: 'BEH-01', bezeichnung: 'Behälter groß',             laenge_mm: 1200, breite_mm: 1000, hoehe_mm:  750, gewicht_kg: 300, stapelfaktor_max: 2, kategorie: 'Behälter' }
]
