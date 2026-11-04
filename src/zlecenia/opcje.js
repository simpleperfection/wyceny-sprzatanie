// Slowniki i reguly pol zlecenia wspolne dla formularza, karty i ekranu wizyty (R12, R13, R16, R26): chipy i ich etykiety, teksty
// bledow pod polami i granica daty. Bez DOM i bez zapisu, wiec modele ekranow nie zaleza od logiki formularza (src/zlecenia/formularz.js).

import { jestDniem } from '../dane/ksztalt.js'
import { FORMY_ZAPLATY, ROZLICZENIA } from '../dane/zlecenia-ksztalt.js'
import { CYKLE } from '../kalendarz/wystapienia.js'
import { SKROTY_DNI } from '../ui/format.js'
import { ETYKIETY_FORM_ZAPLATY } from '../ui/statusy.js'

/**
 * @typedef {import('../dane/zlecenia-ksztalt.js').Rozliczenie} Rozliczenie
 * @typedef {import('../kalendarz/wystapienia.js').RodzajCyklu} RodzajCyklu
 * @typedef {RodzajCyklu | typeof BEZ_POWTARZANIA} Powtarzanie
 * @typedef {'brak_uslugi' | 'zla_cena' | 'brak_daty' | 'brak_dni'} KodBleduPola blad z komunikatem pod polem
 */

/** Wartosc chipa „Nie” (zlecenie jednorazowe). */
export const BEZ_POWTARZANIA = 'nie'
/** Najwczesniejsza data zlecenia i wizyty: niepelny rok w polu daty (0026-11-03) wypadlby poza lata kalendarza. */
export const NAJWCZESNIEJSZA_DATA = '2000-01-01'

/** @type {Readonly<Record<RodzajCyklu, string>>} */
export const ETYKIETY_CYKLI = Object.freeze({ tydzien: 'Co tydzień', dwa_tygodnie: 'Co 2 tygodnie', miesiac: 'Co miesiąc' })
/** @type {Readonly<Record<Rozliczenie, string>>} */
const ETYKIETY_ROZLICZEN = Object.freeze({ za_wizyte: 'Za wizytę', miesiecznie: 'Raz w miesiącu' })
/** @type {Readonly<Record<Rozliczenie, string>>} */
const ETYKIETY_CENY = Object.freeze({ za_wizyte: 'Cena (zł)', miesiecznie: 'Kwota za miesiąc (zł)' })
/** Komunikaty pod polami wedlug kodu bledu; „Wybierz klienta.” pokazuje wyborKlienta. @type {Readonly<Record<KodBleduPola, string>>} */
const TEKSTY_BLEDOW_POL = Object.freeze({
  brak_uslugi: 'Wybierz usługę albo wpisz opis.',
  zla_cena: 'Wpisz cenę.',
  brak_daty: 'Wybierz datę.',
  brak_dni: 'Wybierz dni tygodnia.',
})

/** Chipy „Powtarzaj”. @type {readonly { wartosc: Powtarzanie, etykieta: string }[]} */
export const OPCJE_POWTARZANIA = Object.freeze([{ wartosc: BEZ_POWTARZANIA, etykieta: 'Nie' },
  ...CYKLE.map((c) => ({ wartosc: c, etykieta: ETYKIETY_CYKLI[c] }))])
/** Chipy „Płatność”. */
export const OPCJE_PLATNOSCI = Object.freeze(ROZLICZENIA.map((r) => ({ wartosc: r, etykieta: ETYKIETY_ROZLICZEN[r] })))
/** Chipy „Dni”: dzien ISO 1–7 i skrot. */
export const OPCJE_DNI = Object.freeze(SKROTY_DNI.map((etykieta, i) => ({ wartosc: i + 1, etykieta })))
/** Chipy formy zaplaty. */
export const OPCJE_FORM = Object.freeze(FORMY_ZAPLATY.map((wartosc) => ({ wartosc, etykieta: ETYKIETY_FORM_ZAPLATY[wartosc] })))

/** @param {Rozliczenie} rozliczenie @returns {string} etykieta pola ceny */
export const etykietaCeny = (rozliczenie) => ETYKIETY_CENY[rozliczenie]
/** @param {Powtarzanie} cykl @returns {boolean} cykl z wyborem dni tygodnia */
export const czyMaDni = (cykl) => cykl === 'tydzien' || cykl === 'dwa_tygodnie'
/** @param {unknown} data @returns {data is string} dzien nie wczesniejszy niz NAJWCZESNIEJSZA_DATA */
export const jestDataZlecenia = (data) => jestDniem(data) && data >= NAJWCZESNIEJSZA_DATA
/** @param {KodBleduPola | null | undefined} kod @returns {string | null} komunikat pod polem; bez bledu null */
export const tekstBleduPola = (kod) => (kod === null || kod === undefined ? null : TEKSTY_BLEDOW_POL[kod])
/** @param {readonly number[]} dni @param {number} dzien 1–7 @returns {number[]} dni z dniem wlaczonym albo wylaczonym, rosnaco */
export const przelaczDzien = (dni, dzien) => (dni.includes(dzien) ? dni.filter((d) => d !== dzien) : [...dni, dzien].sort((a, b) => a - b))
