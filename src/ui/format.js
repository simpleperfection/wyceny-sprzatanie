// Formatowanie liczb, kwot, czasu i dat po polsku (Intl `pl-PL`) oraz odmiana liczebnikow i nazw wojewodztw.
// Tysiace grupuje twarda spacja takze przy liczbach czterocyfrowych (`useGrouping: 'always'`), jak na makietach.

import { jestData } from '../dane/ksztalt.js'

const JEZYK = 'pl-PL'
const NBSP = ' '
const MINUT_W_GODZINIE = 60
const DZIEN_ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const LICZBA_DODATNIA = /^\d+(\.\d+)?$/
const ODSTEPY = /[\s  ]/g

const formatZl = new Intl.NumberFormat(JEZYK, { maximumFractionDigits: 0, useGrouping: 'always' })
const formatZlGr = new Intl.NumberFormat(JEZYK, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })
const formatM2 = new Intl.NumberFormat(JEZYK, { maximumFractionDigits: 2, useGrouping: 'always' })
const formatLiczby = new Intl.NumberFormat(JEZYK, { maximumFractionDigits: 2, useGrouping: false })
const formatTempa = new Intl.NumberFormat(JEZYK, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatProcentu = new Intl.NumberFormat(JEZYK, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' })
const formatDaty = new Intl.DateTimeFormat(JEZYK, { day: 'numeric', month: 'long', year: 'numeric' })
const formatDnia = new Intl.DateTimeFormat(JEZYK, { weekday: 'long', day: 'numeric', month: 'long' })

/** Formy rzeczownika po liczebniku: [1, 2–4 (bez 12–14), pozostale], np. wycena / wyceny / wycen. */
export const FORMY = Object.freeze({
  wycena: /** @type {const} */ (['wycena', 'wyceny', 'wycen']),
  zlecenie: /** @type {const} */ (['zlecenie', 'zlecenia', 'zleceń']),
  przyjeta: /** @type {const} */ (['przyjęta', 'przyjęte', 'przyjętych']),
})

/** Wartosci nie da sie sformatowac, np. `nie_liczba`, `ujemna`, `zla_data`, `zle_dni`, `nie_wojewodztwo`. */
export class BladFormatu extends Error {
  /** @param {string} kod @param {string} komunikat */
  constructor(kod, komunikat) {
    super(komunikat)
    this.name = 'BladFormatu'
    this.kod = kod
  }
}

/** @param {unknown} x @returns {number} */
function liczba(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new BladFormatu('nie_liczba', `Oczekiwano liczby, jest ${String(x)}`)
  return x
}

/** @param {unknown} x @returns {number} */
function liczbaNieujemna(x) {
  const wartosc = liczba(x)
  if (wartosc < 0) throw new BladFormatu('ujemna', `Oczekiwano liczby nieujemnej, jest ${wartosc}`)
  return wartosc
}

/** @param {number} x @returns {string} liczba w polu albo w tekscie: „4,5”, „1,15”, „3” (do 2 miejsc po przecinku) */
export const tekstLiczby = (x) => formatLiczby.format(liczba(x))

/**
 * Jeden komunikat granic pola liczbowego dla formularzy i licznikow.
 * @param {{ min: number, max: number }} granice max = Infinity: liczba bez gornej granicy
 * @returns {string} „Wpisz liczbę od 0,5 do 3.” albo „Wpisz liczbę co najmniej 1.”
 */
export function bladZakresu({ min, max }) {
  if (max === Number.POSITIVE_INFINITY) return `Wpisz liczbę co najmniej ${tekstLiczby(min)}.`
  return `Wpisz liczbę od ${tekstLiczby(min)} do ${tekstLiczby(max)}.`
}

/** @param {unknown} dzis @returns {Date} poprawna data; inna wartosc daje BladFormatu `zla_data` */
export function sprawdzDate(dzis) {
  if (!jestData(dzis)) throw new BladFormatu('zla_data', `Oczekiwano poprawnej daty, jest ${String(dzis)}`)
  return dzis
}

/** @param {number} kwota @returns {string} „1 235 zł” (zaokraglenie do zlotowki) */
export const zl = (kwota) => `${formatZl.format(liczba(kwota))}${NBSP}zł`

/** @param {number} kwota @returns {string} „1,15 zł” */
export const zlGr = (kwota) => `${formatZlGr.format(liczba(kwota))}${NBSP}zł`

/** @param {number} metraz @returns {string} „50 m²” */
export const m2 = (metraz) => `${formatM2.format(liczba(metraz))}${NBSP}m²`

/** @param {number} stosunek tempo jako stosunek do normy @returns {string} „1,18×” */
export const tempo = (stosunek) => `${formatTempa.format(liczba(stosunek))}×`

/** @param {number} ulamek zmiana jako ulamek (0.16 = 16%) @returns {string} „+16%” */
export const procent = (ulamek) => formatProcentu.format(liczba(ulamek))

/**
 * @param {number} minuty
 * @returns {string} „5 h 15 min”, „45 min”, „3 h”
 */
export function czas(minuty) {
  const calosc = Math.round(liczbaNieujemna(minuty))
  const godziny = Math.floor(calosc / MINUT_W_GODZINIE)
  const reszta = calosc % MINUT_W_GODZINIE
  if (godziny === 0) return `${reszta} min`
  return reszta === 0 ? `${godziny} h` : `${godziny} h ${reszta} min`
}

/**
 * Dzien `RRRR-MM-DD` czytamy jako dzien lokalny (nie polnoc UTC), inne teksty przez `Date`.
 * @param {Date | string} wartosc
 * @returns {Date}
 */
function naDate(wartosc) {
  const dzien = typeof wartosc === 'string' ? DZIEN_ISO.exec(wartosc) : null
  const wynik = dzien ? new Date(Number(dzien[1]), Number(dzien[2]) - 1, Number(dzien[3])) : new Date(wartosc)
  if (Number.isNaN(wynik.getTime())) throw new BladFormatu('zla_data', `Nieprawidłowa data: ${String(wartosc)}`)
  return wynik
}

/** @param {Date | string} wartosc data albo tekst ISO @returns {string} „7 listopada 2026” */
export const data = (wartosc) => formatDaty.format(naDate(wartosc))

/** @param {Date | string} wartosc @returns {string} „Sobota, 24 października” */
export function dataDnia(wartosc) {
  const tekst = formatDnia.format(naDate(wartosc))
  return tekst.charAt(0).toLocaleUpperCase(JEZYK) + tekst.slice(1)
}

/** @param {number} dni pelne dni od zdarzenia @returns {string} „dziś”, „wczoraj”, „9 dni temu” */
export function dniTemu(dni) {
  if (!Number.isInteger(dni) || dni < 0) throw new BladFormatu('zle_dni', `Liczba dni musi być całkowita i nieujemna: ${dni}`)
  if (dni === 0) return 'dziś'
  return dni === 1 ? 'wczoraj' : `${dni} dni temu`
}

/**
 * Nazwy wojewodztw sa przymiotnikami na „-ie” (mazowieckie, kujawsko-pomorskie), miejscownik konczy sie na „-im”.
 * @param {string} nazwa
 * @returns {string} „mazowieckim”
 */
export function miejscownikWojewodztwa(nazwa) {
  if (typeof nazwa !== 'string' || !/^[\p{Ll}-]+ie$/u.test(nazwa)) {
    throw new BladFormatu('nie_wojewodztwo', `To nie jest nazwa województwa: ${String(nazwa)}`)
  }
  return `${nazwa.slice(0, -1)}m`
}

/**
 * @param {number} n liczba calkowita nieujemna
 * @param {readonly [string, string, string]} formy np. `FORMY.wycena`
 * @returns {string} forma rzeczownika po liczbie `n` (bez samej liczby)
 */
export function odmiana(n, formy) {
  if (!Number.isInteger(n) || n < 0) throw new BladFormatu('zla_liczebnosc', `Liczebność musi być całkowita i nieujemna: ${n}`)
  if (n === 1) return formy[0]
  const jednosci = n % 10
  const setki = n % 100
  return jednosci >= 2 && jednosci <= 4 && (setki < 12 || setki > 14) ? formy[1] : formy[2]
}

/**
 * Liczba wpisana w pole: przecinek albo kropka dziesietna, spacje tysiecy dozwolone; bez znaku minus.
 * @param {string} tekst
 * @returns {number | null} null, gdy tekst nie jest liczba
 */
export function parsujLiczbe(tekst) {
  const znormalizowany = tekst.replace(ODSTEPY, '').replace(',', '.')
  return LICZBA_DODATNIA.test(znormalizowany) ? Number(znormalizowany) : null
}
