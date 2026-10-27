// Wspolne strazniki ksztaltu danych z magazynu i z pliku kopii: typy pol, daty i granice tekstow.
// Modul bez importow, zeby magazyn, ustawienia, wyceny i kopia mogly z niego korzystac bez cykli.

/** Pola danych firmy w ustawieniach; zrodlo listy dla ksztaltu stanu (magazyn) i walidacji zmian (ustawienia). */
export const POLA_FIRMY = Object.freeze(/** @type {const} */ (['nazwa', 'telefon', 'email', 'nip']))
/** Najdluzszy tekst i klucz w zapisanych danych; ta sama granica obowiazuje przy zapisie, w kopii i przy jej odczycie. */
export const MAKS_DLUGOSC_TEKSTU = 2000
/** Glebokosc zagniezdzenia danych; stan aplikacji ma kilka poziomow, wiecej znaczy dane spoza aplikacji. */
export const MAKS_ZAGLEBIENIE = 32
/**
 * Granice tresci oferty dla klienta: najdluzszy tekst (punkt zakresu, warunek, opis, dane firmy i klienta) i najdluzsza lista.
 * Jedno zrodlo dla zapisu zakresu i warunkow (ustawienia, wyceny) i dla dekodera linku oferty (src/oferta/kodek.js).
 */
export const GRANICE_OFERTY = Object.freeze({ tekst: 500, lista: 50 })
const DZIEN = /^\d{4}-\d{2}-\d{2}$/
/** Identyfikator warunku oferty (jak w data/domyslne.json). */
export const ID_WARUNKU = /^[a-z0-9][a-z0-9_-]{0,39}$/

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

/** @param {unknown} x @returns {x is { id: string, tresc: string, tylko_szybka: boolean }} warunek oferty `{ id, tresc, tylko_szybka }` */
export const jestWarunkiem = (x) => jestObiektem(x) && typeof x.id === 'string' && typeof x.tresc === 'string' && typeof x.tylko_szybka === 'boolean'

/** @param {unknown} x @returns {x is string} niepusty tekst oferty bez bialych znakow na koncach, do GRANICE_OFERTY.tekst znakow */
export const jestPunktemOferty = (x) => typeof x === 'string' && x !== '' && x === x.trim() && x.length <= GRANICE_OFERTY.tekst
/** @param {unknown} x @returns {x is string[]} lista punktow oferty (zakres, warunki) do GRANICE_OFERTY.lista pozycji */
export const jestListaPunktow = (x) => Array.isArray(x) && x.length <= GRANICE_OFERTY.lista && x.every(jestPunktemOferty)
/**
 * Zakres prac `{ wchodzi, nie_wchodzi }` bez innych kluczy; jedyny straznik zakresu zapisanego w ustawieniach i w wycenie.
 * @param {unknown} x @returns {x is { wchodzi: string[], nie_wchodzi: string[] }}
 */
export const jestZakresemOferty = (x) => jestObiektem(x) && Object.keys(x).length === 2 && jestListaPunktow(x.wchodzi) &&
  jestListaPunktow(x.nie_wchodzi)
/**
 * Warunki oferty: do GRANICE_OFERTY.lista wpisow `{ id, tresc, tylko_szybka }` bez innych kluczy, z niepowtarzalnym id;
 * jedyny straznik warunkow zapisanych w ustawieniach i w wycenie.
 * @param {unknown} x @returns {x is { id: string, tresc: string, tylko_szybka: boolean }[]}
 */
export function jestWarunkamiOferty(x) {
  if (!Array.isArray(x) || x.length > GRANICE_OFERTY.lista) return false
  const pelne = x.every((w) => jestWarunkiem(w) && Object.keys(w).length === 3 && ID_WARUNKU.test(w.id) && jestPunktemOferty(w.tresc))
  return pelne && new Set(x.map((w) => w.id)).size === x.length
}

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
