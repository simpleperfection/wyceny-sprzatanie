// Walidacja pol formularzy ustawien firmy (telefon, e-mail, NIP, liczby, tempo). Funkcje zwracaja kod bledu albo null;
// widoki zamieniaja kod na tekst. Nie mylic z src/silnik/walidacja.js (metraz i ilosc w silniku).

/** @typedef {'telefon' | 'email' | 'nip' | 'liczba' | 'zakres'} KodBleduPola */
/** @typedef {{ min: number, max: number }} Granice */

/** Tempo jako krotnosc normy rynkowej (R15); zrodlo granic dla ustawien i widoku. */
export const GRANICE_TEMPA = Object.freeze({ min: 0.5, max: 3 })

const CYFR_TELEFONU = 9
const PRZEDROSTEK_POLSKI = '+48'
const WAGI_NIP = [6, 5, 7, 2, 3, 4, 5, 6, 7]
const MODUL_NIP = 11
const DLUGOSC_EMAILA_MAKS = 254
const DLUGOSC_CZESCI_LOKALNEJ_MAKS = 64
const SEPARATORY = /[\s-]/g
const TYLKO_CYFRY = /^\d+$/

/** Ujednolica zapis (cyfry pelnej szerokosci, NBSP) i usuwa spacje oraz myslniki. @param {string} tekst */
function bezSeparatorow(tekst) {
  return tekst.normalize('NFKC').replace(SEPARATORY, '')
}

/**
 * Telefon: 9 cyfr, opcjonalnie z +48; spacje i myslniki dozwolone.
 * @param {unknown} tekst
 * @returns {'telefon' | null}
 */
export function bladTelefonu(tekst) {
  if (typeof tekst !== 'string') return 'telefon'
  const zwarty = bezSeparatorow(tekst)
  const numer = zwarty.startsWith(PRZEDROSTEK_POLSKI) ? zwarty.slice(PRZEDROSTEK_POLSKI.length) : zwarty
  return numer.length === CYFR_TELEFONU && TYLKO_CYFRY.test(numer) ? null : 'telefon'
}

/**
 * NIP: 10 cyfr, ostatnia = suma cyfr 1–9 z wagami 6,5,7,2,3,4,5,6,7 mod 11 (reszta 10 = NIP niepoprawny).
 * @param {unknown} tekst
 * @returns {'nip' | null}
 */
export function bladNip(tekst) {
  if (typeof tekst !== 'string') return 'nip'
  const cyfry = bezSeparatorow(tekst)
  if (cyfry.length !== WAGI_NIP.length + 1 || !TYLKO_CYFRY.test(cyfry)) return 'nip'
  const suma = WAGI_NIP.reduce((s, waga, i) => s + waga * Number(cyfry[i]), 0)
  return suma % MODUL_NIP === Number(cyfry[WAGI_NIP.length]) ? null : 'nip'
}

/** Znaki konczace host w URL (port, sciezka, zapytanie, kotwica); w domenie poczty ich nie ma. */
const ZNAKI_POZA_HOSTEM = /[:/?#\\]/

/**
 * Domena adresu e-mail rozbierana parserem URL (normalizuje wielkosc liter i IDN): sam host, co najmniej dwie niepuste etykiety.
 * @param {string} domena
 */
function jestDomenaPoczty(domena) {
  if (ZNAKI_POZA_HOSTEM.test(domena) || !URL.canParse(`https://${domena}`)) return false
  const etykiety = new URL(`https://${domena}`).hostname.split('.')
  return etykiety.length >= 2 && etykiety.every((e) => e.length > 0)
}

/**
 * E-mail: jedna czesc lokalna bez bialych znakow, jedno @ i domena z kropka.
 * @param {unknown} tekst
 * @returns {'email' | null}
 */
export function bladEmaila(tekst) {
  if (typeof tekst !== 'string') return 'email'
  const adres = tekst.normalize('NFC')
  const czesci = adres.split('@')
  if (adres.length > DLUGOSC_EMAILA_MAKS || czesci.length !== 2) return 'email'
  const [lokalna, domena] = czesci
  if (lokalna.length === 0 || lokalna.length > DLUGOSC_CZESCI_LOKALNEJ_MAKS || /\s/.test(adres)) return 'email'
  return jestDomenaPoczty(domena) ? null : 'email'
}

/**
 * @param {unknown} x
 * @param {Granice} granice
 * @returns {'liczba' | 'zakres' | null}
 */
export function bladLiczby(x, { min, max }) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return 'liczba'
  return x < min || x > max ? 'zakres' : null
}

/**
 * @param {unknown} x
 * @returns {'liczba' | 'zakres' | null}
 */
export function bladTempa(x) {
  return bladLiczby(x, GRANICE_TEMPA)
}
