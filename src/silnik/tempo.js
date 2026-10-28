// Wlasne tempo firmy z zapisanych zlecen (R17): stosunek faktycznego czasu wizyty do czasu normowego z migawki wyceny,
// mediana z ostatnich wpisow, osobno dla uslugi albo wspolnie; bez wpisow tempo reczne albo domyslne 1,3 (R15).
// Czyste funkcje silnika: bez DOM i bez magazynu; wyceny przychodza jako dane.

import { BladKatalogu, BladWejscia } from './bledy.js'

/**
 * Tyle wyceny potrzebuje tempo z zlecen; Wycena z src/dane/wyceny.js spelnia ten ksztalt.
 * @typedef {{ id: string, data: string, minuty: number }} WykonanieTempa
 * @typedef {{ id: string, wejscie: { uslugaId: string }, wynik: { minutyNormowe: number } | null,
 *   wykonania: WykonanieTempa[] }} WycenaTempa
 * @typedef {{ wycenaId: string, wykonanieId: string, uslugaId: string, data: string, stosunek: number, liczony: boolean }} WpisTempa
 * @typedef {{ wartosc: number, liczba: number, zakres: 'usluga' | 'wspolne' }} TempoWlasne
 * @typedef {'reczne' | 'usluga' | 'wspolne' | 'domyslne'} ZrodloTempa
 * @typedef {{ wartosc: number, zrodlo: ZrodloTempa, liczba: number }} TempoWyceny
 */

/** Od tylu liczonych wpisow liczy sie tempo wlasne (wspolne i osobne dla uslugi). */
export const MIN_ZLECEN_TEMPA = 3
/** Wpis z tempem poza tymi granicami (krotnosc normy) zapisuje sie, ale nie liczy do tempa. */
export const GRANICE_STOSUNKU_TEMPA = Object.freeze({ min: 0.5, max: 3 })
/** Mediana z tylu najnowszych liczonych wpisow. */
const OKNO_WPISOW = 10
const MIEJSC_PO_PRZECINKU = 2

/** @param {number} x */
const jestDodatnia = (x) => Number.isFinite(x) && x > 0

/** @param {number[]} liczby niepusta lista */
function mediana(liczby) {
  const posortowane = [...liczby].sort((a, b) => a - b)
  const srodek = Math.floor(posortowane.length / 2)
  return posortowane.length % 2 === 1 ? posortowane[srodek] : (posortowane[srodek - 1] + posortowane[srodek]) / 2
}

/**
 * Wpisy wykonania wszystkich wycen, od najnowszego (data, a w tym samym dniu pozniejszy wpis). Abonament: kazda wizyta to wpis,
 * a czas normowy migawki dotyczy jednej wizyty. Wycena bez migawki z dodatnim czasem normowym nie daje wpisow.
 * @param {readonly WycenaTempa[]} wyceny
 * @returns {WpisTempa[]}
 */
export function wpisyTempa(wyceny) {
  if (!Array.isArray(wyceny)) throw new BladWejscia('wyceny', 'Wyceny do tempa muszą być listą')
  /** @type {(WpisTempa & { kolejnosc: number })[]} */
  const wpisy = []
  for (const wycena of wyceny) {
    const norma = wycena.wynik?.minutyNormowe ?? 0
    if (!jestDodatnia(norma)) continue
    for (const wykonanie of wycena.wykonania) {
      const stosunek = wykonanie.minuty / norma
      const liczony = stosunek >= GRANICE_STOSUNKU_TEMPA.min && stosunek <= GRANICE_STOSUNKU_TEMPA.max
      wpisy.push({ wycenaId: wycena.id, wykonanieId: wykonanie.id, uslugaId: wycena.wejscie.uslugaId, data: wykonanie.data,
        stosunek, liczony, kolejnosc: wpisy.length })
    }
  }
  wpisy.sort((a, b) => (a.data === b.data ? b.kolejnosc - a.kolejnosc : a.data < b.data ? 1 : -1))
  return wpisy.map(({ kolejnosc: _kolejnosc, ...wpis }) => wpis)
}

/** @param {WpisTempa[]} liczone od najnowszego @param {TempoWlasne['zakres']} zakres @returns {TempoWlasne} */
function zWpisow(liczone, zakres) {
  const okno = liczone.slice(0, OKNO_WPISOW)
  return { wartosc: mediana(okno.map((w) => w.stosunek)), liczba: okno.length, zakres }
}

/**
 * Tempo z zapisanych zlecen: osobne dla uslugi od MIN_ZLECEN_TEMPA liczonych wpisow tej uslugi, inaczej wspolne
 * od MIN_ZLECEN_TEMPA liczonych wpisow wszystkich uslug, inaczej null. Mediana z OKNO_WPISOW najnowszych.
 * @param {readonly WycenaTempa[]} wyceny
 * @param {string | null} uslugaId null = tylko tempo wspolne (np. karta tempa w ustawieniach)
 * @returns {TempoWlasne | null}
 */
export function tempoWlasne(wyceny, uslugaId) {
  const liczone = wpisyTempa(wyceny).filter((w) => w.liczony)
  const uslugi = liczone.filter((w) => w.uslugaId === uslugaId)
  if (uslugi.length >= MIN_ZLECEN_TEMPA) return zWpisow(uslugi, 'usluga')
  if (liczone.length >= MIN_ZLECEN_TEMPA) return zWpisow(liczone, 'wspolne')
  return null
}

/**
 * Tempo do wyceny: reczne z ustawien wygrywa, potem wlasne z zlecen, potem domyslne z data/domyslne.json (R15, R17).
 * `liczba` przy tempie z zlecen to wpisy w medianie, a przy recznym i domyslnym — wszystkie liczone wpisy (do progu MIN_ZLECEN_TEMPA).
 * @param {{ tempo: { reczne: number | null } } | null} ustawienia null = firma przed kreatorem ustawien
 * @param {readonly WycenaTempa[]} wyceny
 * @param {string | null} uslugaId
 * @param {{ tempo: number }} domyslne data/domyslne.json
 * @returns {TempoWyceny}
 */
export function tempoDoWyceny(ustawienia, wyceny, uslugaId, domyslne) {
  if (!jestDodatnia(domyslne?.tempo)) throw new BladKatalogu('zly_format', 'data/domyslne.json: tempo musi być liczbą dodatnią')
  const reczne = ustawienia?.tempo.reczne ?? null
  const wlasne = tempoWlasne(wyceny, uslugaId)
  if (reczne === null && wlasne) return { wartosc: wlasne.wartosc, zrodlo: wlasne.zakres, liczba: wlasne.liczba }
  const liczba = wpisyTempa(wyceny).filter((w) => w.liczony).length
  if (reczne !== null) return { wartosc: reczne, zrodlo: 'reczne', liczba }
  return { wartosc: domyslne.tempo, zrodlo: 'domyslne', liczba }
}

/**
 * Tempo do pokazania: „1,18× z 7 zleceń” przy tempie z zlecen, „1,3×” przy domyslnym i recznym (zrodlo nazywa widok).
 * @param {TempoWyceny} tempo
 * @returns {string}
 */
export function opisTempa({ wartosc, zrodlo, liczba }) {
  if (!jestDodatnia(wartosc)) throw new BladWejscia('tempo', `Tempo musi być liczbą dodatnią, jest ${wartosc}`)
  const skala = 10 ** MIEJSC_PO_PRZECINKU
  const krotnosc = `${String(Math.round(wartosc * skala) / skala).replace('.', ',')}×`
  return zrodlo === 'usluga' || zrodlo === 'wspolne' ? `${krotnosc} z ${liczba} zleceń` : krotnosc
}
