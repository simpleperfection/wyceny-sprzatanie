// Dni kalendarza jako teksty RRRR-MM-DD i godziny HH:MM. Arytmetyka dni idzie przez Date.UTC (rok, miesiac, dzien + n),
// nigdy przez dodawanie milisekund do daty lokalnej, wiec zmiana czasu (25.10.2026, 28.03.2027) nie przesuwa dnia.
// Czyste funkcje bez DOM, magazynu i zegara: dzien „dzis” przychodzi w argumencie od wolajacego.

import { jestDniem } from '../dane/ksztalt.js'

/** Dzien tygodnia ISO: 1 = poniedzialek … 7 = niedziela. @typedef {1 | 2 | 3 | 4 | 5 | 6 | 7} DzienTygodnia */

/** Bledne wejscie funkcji kalendarza; `kod` np. `dzien`, `miesiac`, `liczba_dni`, `okno`, `cykl`. */
export class BladKalendarza extends Error {
  /** @param {string} kod @param {string} [komunikat] */
  constructor(kod, komunikat = kod) {
    super(komunikat)
    this.name = 'BladKalendarza'
    this.kod = kod
  }
}

const DNI_TYGODNIA = 7
/** Dzien ISO pod indeksem getUTCDay (0 = niedziela). */
const DZIEN_ISO = /** @type {const} */ ([7, 1, 2, 3, 4, 5, 6])
const MS_DNIA = 86_400_000
const GODZINA = /^([01]\d|2[0-3]):[0-5]\d$/
/** Lata zapisywalne w czterech cyfrach RRRR. */
const LATA = Object.freeze({ min: 1000, max: 9999 })

/** @param {number} n */
const dwieCyfry = (n) => String(n).padStart(2, '0')

/** @param {number} rok @param {number} miesiac 1–12 @param {number} dzien moze wyjsc poza miesiac (Date.UTC przenosi) @returns {string} */
const zUtc = (rok, miesiac, dzien) => new Date(Date.UTC(rok, miesiac - 1, dzien)).toISOString().slice(0, 10)

/** @param {unknown} dzien @returns {[number, number, number]} rok, miesiac 1–12, dzien miesiaca */
function czesci(dzien) {
  if (!jestDniem(dzien)) throw new BladKalendarza('dzien', `Dzień musi mieć postać RRRR-MM-DD, jest ${String(dzien)}`)
  return [Number(dzien.slice(0, 4)), Number(dzien.slice(5, 7)), Number(dzien.slice(8, 10))]
}

/** @param {number} rok @param {number} miesiac */
function sprawdzMiesiac(rok, miesiac) {
  const dobryRok = Number.isInteger(rok) && rok >= LATA.min && rok <= LATA.max
  if (!dobryRok || !Number.isInteger(miesiac) || miesiac < 1 || miesiac > 12) {
    throw new BladKalendarza('miesiac', `Miesiąc musi być rokiem ${LATA.min}–${LATA.max} i numerem 1–12, jest ${rok}-${miesiac}`)
  }
}

/** @param {string} dzien RRRR-MM-DD @param {number} liczba calkowita, ujemna cofa @returns {string} */
export function dodajDni(dzien, liczba) {
  const [rok, miesiac, dzienMiesiaca] = czesci(dzien)
  if (!Number.isInteger(liczba)) throw new BladKalendarza('liczba_dni', `Liczba dni musi być całkowita, jest ${liczba}`)
  return zUtc(rok, miesiac, dzienMiesiaca + liczba)
}

/** @param {string} dzien RRRR-MM-DD @returns {DzienTygodnia} */
export function dzienTygodnia(dzien) {
  const [rok, miesiac, dzienMiesiaca] = czesci(dzien)
  return DZIEN_ISO[new Date(Date.UTC(rok, miesiac - 1, dzienMiesiaca)).getUTCDay()]
}

/** @param {string} dzien RRRR-MM-DD @returns {string} poniedzialek tygodnia tego dnia */
export const poczatekTygodnia = (dzien) => dodajDni(dzien, 1 - dzienTygodnia(dzien))

/** @param {string} od RRRR-MM-DD @param {string} doDnia RRRR-MM-DD @returns {number} dni od `od` do `doDnia`, ujemna gdy `doDnia` wczesniej */
export function dniOdDo(od, doDnia) {
  const [rokOd, miesiacOd, dzienOd] = czesci(od)
  const [rokDo, miesiacDo, dzienDo] = czesci(doDnia)
  return Math.round((Date.UTC(rokDo, miesiacDo - 1, dzienDo) - Date.UTC(rokOd, miesiacOd - 1, dzienOd)) / MS_DNIA)
}

/** Porownanie do `sort`. @param {string} a RRRR-MM-DD @param {string} b RRRR-MM-DD @returns {-1 | 0 | 1} */
export function porownajDni(a, b) {
  czesci(a)
  czesci(b)
  return a === b ? 0 : a < b ? -1 : 1
}

/** @param {number} rok @param {number} miesiac 1–12 @returns {number} numer ostatniego dnia miesiaca (28–31) */
export function ostatniDzienMiesiaca(rok, miesiac) {
  sprawdzMiesiac(rok, miesiac)
  return new Date(Date.UTC(rok, miesiac, 0)).getUTCDate()
}

/**
 * Dzien miesiaca przyciety do ostatniego dnia: (2027, 2, 31) → 2027-02-28.
 * @param {number} rok @param {number} miesiac 1–12 @param {number} dzienMiesiaca 1–31 @returns {string}
 */
export function dzienWMiesiacu(rok, miesiac, dzienMiesiaca) {
  const ostatni = ostatniDzienMiesiaca(rok, miesiac)
  if (!Number.isInteger(dzienMiesiaca) || dzienMiesiaca < 1 || dzienMiesiaca > 31) {
    throw new BladKalendarza('dzien_miesiaca', `Dzień miesiąca musi być liczbą 1–31, jest ${dzienMiesiaca}`)
  }
  return zUtc(rok, miesiac, Math.min(dzienMiesiaca, ostatni))
}

/** @param {string} dzien RRRR-MM-DD @returns {string} RRRR-MM */
export function miesiacDnia(dzien) {
  const [rok, miesiac] = czesci(dzien)
  return `${rok}-${dwieCyfry(miesiac)}`
}

/**
 * Tygodnie miesiaca od poniedzialku do niedzieli; dni spoza miesiaca to null.
 * @param {number} rok @param {number} miesiac 1–12 @returns {(string | null)[][]}
 */
export function siatkaMiesiaca(rok, miesiac) {
  const ostatni = ostatniDzienMiesiaca(rok, miesiac)
  /** @type {(string | null)[]} */
  const komorki = Array.from({ length: dzienTygodnia(zUtc(rok, miesiac, 1)) - 1 }, () => null)
  for (let dzien = 1; dzien <= ostatni; dzien += 1) komorki.push(zUtc(rok, miesiac, dzien))
  while (komorki.length % DNI_TYGODNIA !== 0) komorki.push(null)
  return Array.from({ length: komorki.length / DNI_TYGODNIA }, (_, i) => komorki.slice(i * DNI_TYGODNIA, (i + 1) * DNI_TYGODNIA))
}

/** @param {unknown} x @returns {x is string} godzina HH:MM od 00:00 do 23:59 */
export const jestGodzina = (x) => typeof x === 'string' && GODZINA.test(x)
