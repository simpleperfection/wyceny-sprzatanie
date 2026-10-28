// Trasy aplikacji: nazwy ekranow i wzorce adresow hash (rejestr stalych planu etapu 5, zrodlo: IU-9).
// Segment `:nazwa` we wzorcu to parametr (np. id wyceny, krok kreatora).

export const TRASY = Object.freeze({
  start: '#/start',
  wyceny: '#/wyceny',
  szybka: '#/szybka',
  kreator: '#/kreator/:krok',
  wycena: '#/wycena/:id',
  zakonczenie: '#/wycena/:id/koniec',
  oferta: '#/wycena/:id/oferta',
  pytania: '#/wycena/:id/pytania',
  ustawienia: '#/ustawienia',
  kreatorStartowy: '#/ustawienia/start',
  kopia: '#/kopia',
  chemia: '#/chemia',
})

/** @typedef {keyof typeof TRASY} NazwaTrasy */

/** Adres trasy nie da sie zbudowac: `nieznana_trasa` albo `brak_parametru`. */
export class BladTrasy extends Error {
  /** @param {string} kod @param {string} komunikat */
  constructor(kod, komunikat) {
    super(komunikat)
    this.name = 'BladTrasy'
    this.kod = kod
  }
}

/** @param {string} nazwa @returns {nazwa is NazwaTrasy} */
export const jestNazwaTrasy = (nazwa) => Object.hasOwn(TRASY, nazwa)

/**
 * Adres hash trasy z podstawionymi parametrami (kodowanymi `encodeURIComponent`) i opcjonalnym zapytaniem.
 * @param {NazwaTrasy} nazwa
 * @param {Record<string, string>} [parametry]
 * @param {Record<string, string>} [zapytanie]
 * @returns {string} np. `sciezka('oferta', { id: 'abc' })` → `#/wycena/abc/oferta`
 */
export function sciezka(nazwa, parametry = {}, zapytanie = {}) {
  if (!jestNazwaTrasy(nazwa)) throw new BladTrasy('nieznana_trasa', `Nieznana trasa: ${String(nazwa)}`)
  const adres = TRASY[nazwa].replace(/:([a-z]+)/gi, (_, klucz) => {
    const wartosc = parametry[klucz]
    if (typeof wartosc !== 'string' || wartosc === '') throw new BladTrasy('brak_parametru', `Trasa ${nazwa}: brak parametru ${klucz}`)
    return encodeURIComponent(wartosc)
  })
  const tekstZapytania = new URLSearchParams(zapytanie).toString()
  return tekstZapytania === '' ? adres : `${adres}?${tekstZapytania}`
}
