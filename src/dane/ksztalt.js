// Wspolne strazniki ksztaltu danych z magazynu i z pliku kopii: typy pol, daty i granice tekstow.
// Modul bez importow, zeby magazyn, ustawienia, wyceny i kopia mogly z niego korzystac bez cykli.

/** Pola danych firmy w ustawieniach; zrodlo listy dla ksztaltu stanu (magazyn) i walidacji zmian (ustawienia). */
export const POLA_FIRMY = Object.freeze(/** @type {const} */ (['nazwa', 'telefon', 'email', 'nip']))
/** Najdluzszy tekst i klucz w zapisanych danych; ta sama granica obowiazuje przy zapisie, w kopii i przy jej odczycie. */
export const MAKS_DLUGOSC_TEKSTU = 2000
/** Glebokosc zagniezdzenia danych; stan aplikacji ma kilka poziomow, wiecej znaczy dane spoza aplikacji. */
export const MAKS_ZAGLEBIENIE = 32
const DZIEN = /^\d{4}-\d{2}-\d{2}$/

/** @param {unknown} x @returns {x is Record<string, unknown>} */
export const jestObiektem = (x) => typeof x === 'object' && x !== null && !Array.isArray(x)
/** @param {unknown} x @returns {x is number} */
export const jestLiczba = (x) => typeof x === 'number' && Number.isFinite(x)
/** @param {unknown} x @returns {x is string | null} */
export const jestTekstemLubNull = (x) => x === null || typeof x === 'string'
/** @param {unknown} x @returns {x is string[]} */
export const jestListaTekstow = (x) => Array.isArray(x) && x.every((t) => typeof t === 'string')
/** @param {unknown} x @returns {x is string} data czytelna dla Date.parse (zapisy ISO z aplikacji) */
export const jestDataIso = (x) => typeof x === 'string' && !Number.isNaN(Date.parse(x))

/** @param {unknown} x @param {(wartosc: unknown) => boolean} czyWartosc @returns {boolean} obiekt, ktorego kazda wartosc spelnia warunek */
export function maWartosci(x, czyWartosc) {
  return jestObiektem(x) && Object.values(x).every(czyWartosc)
}

/** @param {unknown} x @returns {boolean} warunek oferty `{ id, tresc, tylko_szybka }` */
export const jestWarunkiem = (x) => jestObiektem(x) && typeof x.id === 'string' && typeof x.tresc === 'string' && typeof x.tylko_szybka === 'boolean'

/** @param {unknown} x @returns {x is Date} jedyny straznik poprawnego obiektu Date (dzien dzisiejszy w danych i widokach) */
export const jestData = (x) => x instanceof Date && !Number.isNaN(x.getTime())

/** @param {number} n */
const dwieCyfry = (n) => String(n).padStart(2, '0')
/** Miesiac RRRR-MM w czasie lokalnym (jak numeracja wycen). @param {Date} data @returns {string} */
export const miesiacLokalny = (data) => `${data.getFullYear()}-${dwieCyfry(data.getMonth() + 1)}`
/** Dzien RRRR-MM-DD w czasie lokalnym: nazwy plikow kopii i terminy „Do zrobienia”. @param {Date} data @returns {string} */
export const dzienLokalny = (data) => `${miesiacLokalny(data)}-${dwieCyfry(data.getDate())}`

/** @param {unknown} data @returns {data is string} istniejacy dzien w postaci RRRR-MM-DD */
export function jestDniem(data) {
  if (typeof data !== 'string' || !DZIEN.test(data)) return false
  const dzien = new Date(`${data}T00:00:00Z`)
  return !Number.isNaN(dzien.getTime()) && dzien.toISOString().startsWith(data)
}

/**
 * Kazdy tekst i klucz do MAKS_DLUGOSC_TEKSTU znakow, zagniezdzenie do MAKS_ZAGLEBIENIE poziomow.
 * @param {unknown} x @param {number} [glebokosc]
 * @returns {boolean}
 */
export function maKrotkieTeksty(x, glebokosc = 0) {
  if (typeof x === 'string') return x.length <= MAKS_DLUGOSC_TEKSTU
  if (typeof x !== 'object' || x === null) return true
  if (glebokosc >= MAKS_ZAGLEBIENIE) return false
  return Object.entries(x).every(([klucz, w]) => klucz.length <= MAKS_DLUGOSC_TEKSTU && maKrotkieTeksty(w, glebokosc + 1))
}
