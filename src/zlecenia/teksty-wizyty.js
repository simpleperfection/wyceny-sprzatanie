// Teksty i reguly wyswietlania zlecen i wizyt wspolne dla kalendarza, ekranu wizyty, karty zlecenia, karty klienta i wycen:
// termin, zaplata, dzien wizyty po przesunieciu, nazwa zlecenia i wiersz zlecenia pod wycena. Czyste funkcje bez DOM i bez zapisu.

import { dzienKrotko, godzina } from '../ui/format.js'
import { ETYKIETY_FORM_ZAPLATY } from '../ui/statusy.js'
import { ETYKIETY_CYKLI } from './opcje.js'

/**
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zaplata} Zaplata
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('../silnik/katalog.js').Katalog} Katalog
 * @typedef {(uslugaId: string) => string} NazwaUslugi nazwa uslugi z katalogu (podaje wolajacy)
 */

/** Nazwa zlecenia bez opisu i bez uslugi. */
const BEZ_NAZWY = 'Zlecenie'

/** @param {string} data RRRR-MM-DD @param {string | null} czasWizyty HH:MM @returns {string} „pn 2 lis, 9:00” albo sam dzien */
export const tekstTerminu = (data, czasWizyty) => (czasWizyty === null ? dzienKrotko(data) : `${dzienKrotko(data)}, ${godzina(czasWizyty)}`)

/** @param {Zaplata} zaplata @returns {string} „Zapłacone · Przelew · pn 2 lis”, a bez formy (wizyty z wersji 1) „Zapłacone” */
export function tekstZaplaty({ forma, data }) {
  return forma === null ? 'Zapłacone' : `Zapłacone · ${ETYKIETY_FORM_ZAPLATY[forma]} · ${dzienKrotko(data)}`
}

/** @param {Pick<Zlecenie, 'wizyty'>} z @param {string} dataPierwotna @returns {string} dzien wizyty po przesunieciu, bez niego data pierwotna */
export function dzienWizyty({ wizyty }, dataPierwotna) {
  return (Object.hasOwn(wizyty, dataPierwotna) ? wizyty[dataPierwotna].przeniesiona?.data : null) ?? dataPierwotna
}

/** @param {Pick<Katalog, 'uslugi'>} katalog @returns {NazwaUslugi} nazwa uslugi, a nieznanej jej id */
export function nazwyUslug(katalog) {
  const nazwy = new Map(katalog.uslugi.map((u) => [u.id, u.nazwa]))
  return (id) => nazwy.get(id) ?? id
}

/**
 * Jedyna regula nazwy wyswietlanej: opis, potem nazwa uslugi, a bez obu „Zlecenie”.
 * @param {Pick<Zlecenie, 'opis' | 'uslugaId'>} z @param {NazwaUslugi} nazwaUslugi @returns {string}
 */
export function nazwaZlecenia({ opis, uslugaId }, nazwaUslugi) {
  if (opis !== null) return opis
  return uslugaId === null ? BEZ_NAZWY : nazwaUslugi(uslugaId)
}

/**
 * Wiersz zlecenia pod wycena: pierwsza wizyta i powtarzanie.
 * @param {Pick<Zlecenie, 'start' | 'okresy'>} z @returns {string} „wt 3 lis, 10:00 · Co tydzień”
 */
export function opisZlecenia({ start, okresy }) {
  const { cykl, godzina: czasWizyty } = okresy[0]
  const termin = tekstTerminu(start, czasWizyty)
  return cykl === null ? termin : `${termin} · ${ETYKIETY_CYKLI[cykl.co]}`
}
