// Klienci firmy (R17): rekord klienta, jego straznik i operacje na magazynie. Straznik jestKlient jest jedynym opisem
// zapisanego klienta: uzywa go zapis tutaj, magazyn (src/dane/magazyn.js) i kopia zapasowa.
// Klienta z historia (wycena albo zlecenie) nie da sie usunac; zmiana karty nie zmienia kopii nazwy i adresu w wycenach.

import { jestDataIso, jestObiektem, MAKS_DLUGOSC_TEKSTU } from './ksztalt.js'
import { bladTelefonu } from './walidacja.js'

/** @typedef {import('./magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./magazyn.js').Stan} Stan */

/** Najdluzsze pola klienta; zrodlo granic dla zapisu, kopii zapasowej i formularza karty klienta. */
export const DLUGOSCI_KLIENTA = Object.freeze({ nazwa: 120, telefon: 20, adres: 200, notatki: 1000 })
/** Najwiecej zapisanych klientow; ta sama granica obowiazuje przy zapisie i w kopii zapasowej. */
export const MAKS_KLIENTOW = 5000

/**
 * @typedef {keyof typeof DLUGOSCI_KLIENTA} PoleKlienta
 * @typedef {{ id: string, nazwa: string, telefon: string | null, adres: string | null, notatki: string | null, utworzony: string,
 *   zmieniony: string }} Klient
 * @typedef {{ nazwa?: string, telefon?: string | null, adres?: string | null, notatki?: string | null }} ZmianaKlienta
 *   pusty tekst w polu opcjonalnym zapisuje null
 * @typedef {{ teraz?: () => Date }} OpcjeKlienta zegar (do testow)
 */

const POLA_KLIENTA = /** @type {const} */ (['nazwa', 'telefon', 'adres', 'notatki'])

/**
 * Bledna operacja na kliencie: `id`, `dane`, `nieznane_pole`, `typ`, `pusta_nazwa`, `dlugosc`, `telefon` (z polem),
 * `brak_klienta`, `ma_historie`, `za_duzo`.
 */
export class BladKlienta extends Error {
  /**
   * @param {string} kod
   * @param {PoleKlienta | null} [pole] pole formularza, ktorego dotyczy blad
   * @param {string} [komunikat]
   */
  constructor(kod, pole = null, komunikat = kod) {
    super(komunikat)
    this.name = 'BladKlienta'
    this.kod = kod
    this.pole = pole
  }
}

/** @param {OpcjeKlienta} opcje */
const zegar = ({ teraz = () => new Date() }) => teraz()
/** @param {unknown} x @returns {x is string} */
const jestId = (x) => typeof x === 'string' && x !== '' && x.length <= MAKS_DLUGOSC_TEKSTU
/** @param {unknown} x @param {PoleKlienta} pole tekst bez bialych znakow na koncach, niepusty, w granicy pola */
const jestTekstemPola = (x, pole) => typeof x === 'string' && x !== '' && x === x.trim() && x.length <= DLUGOSCI_KLIENTA[pole]
/** @param {unknown} x @param {PoleKlienta} pole */
const jestOpcjonalnym = (x, pole) => x === null || jestTekstemPola(x, pole)

/**
 * Zapisany klient (stan magazynu, plik kopii): nazwa niepusta, telefon null albo poprawny numer, teksty w DLUGOSCI_KLIENTA.
 * @param {unknown} x
 * @returns {x is Klient}
 */
export function jestKlient(x) {
  return jestObiektem(x) && jestId(x.id) && jestTekstemPola(x.nazwa, 'nazwa') &&
    (x.telefon === null || (jestTekstemPola(x.telefon, 'telefon') && bladTelefonu(x.telefon) === null)) &&
    jestOpcjonalnym(x.adres, 'adres') && jestOpcjonalnym(x.notatki, 'notatki') && jestDataIso(x.utworzony) && jestDataIso(x.zmieniony)
}

/**
 * Nazwa do porownan i grupowania: NFC, male litery po polsku, zwiniete i przyciete spacje.
 * @param {string} tekst
 * @returns {string}
 */
export function normalizujNazwe(tekst) {
  return tekst.normalize('NFC').toLocaleLowerCase('pl').replace(/\s+/gu, ' ').trim()
}

/**
 * Jedno pole ze zmiany: tekst przyciety; pusty w polu opcjonalnym → null, pusta nazwa → BladKlienta `pusta_nazwa`.
 * @param {PoleKlienta} pole @param {unknown} wartosc @returns {string | null}
 */
function wartoscPola(pole, wartosc) {
  if (wartosc === null && pole !== 'nazwa') return null
  if (typeof wartosc !== 'string') throw new BladKlienta('typ', pole, `Pole klienta ${pole} musi być tekstem`)
  const tekst = wartosc.trim()
  if (tekst === '') {
    if (pole === 'nazwa') throw new BladKlienta('pusta_nazwa', pole, 'Klient musi mieć nazwę')
    return null
  }
  if (tekst.length > DLUGOSCI_KLIENTA[pole]) {
    throw new BladKlienta('dlugosc', pole, `Pole klienta ${pole} może mieć najwyżej ${DLUGOSCI_KLIENTA[pole]} znaków`)
  }
  if (pole === 'telefon' && bladTelefonu(tekst) !== null) throw new BladKlienta('telefon', pole, 'Telefon musi mieć 9 cyfr, opcjonalnie z +48')
  return tekst
}

/**
 * Pola ze zmiany klienta po walidacji; brak pola = bez zmiany.
 * @param {unknown} zmiana @returns {Partial<Pick<Klient, PoleKlienta>>}
 */
function polaZeZmiany(zmiana) {
  if (!jestObiektem(zmiana)) throw new BladKlienta('dane', null, 'Dane klienta muszą być obiektem')
  const nieznane = Object.keys(zmiana).find((klucz) => !POLA_KLIENTA.some((pole) => pole === klucz))
  if (nieznane !== undefined) throw new BladKlienta('nieznane_pole', null, `Nieznane pole klienta: ${nieznane}`)
  /** @type {Partial<Pick<Klient, PoleKlienta>>} */
  const pola = {}
  for (const pole of POLA_KLIENTA) {
    if (zmiana[pole] === undefined) continue
    const wartosc = wartoscPola(pole, zmiana[pole])
    if (pole === 'nazwa') pola.nazwa = wartosc ?? ''
    else pola[pole] = wartosc
  }
  return pola
}

/** @param {unknown} id */
function sprawdzId(id) {
  if (!jestId(id)) throw new BladKlienta('id', null, 'Identyfikator klienta musi być niepustym tekstem')
}

/**
 * @param {Pick<Stan, 'klienci'>} stan @param {string} id
 * @returns {Klient | null}
 */
export function klient(stan, id) {
  return stan.klienci.find((k) => k.id === id) ?? null
}

/**
 * Nowy klient z id od wolajacego (nadanym przy otwarciu formularza): drugi zapis z tym samym id (podwojne „Zapisz”, druga karta)
 * nie dubluje klienta i zwraca zapisanego. Wiecej niz MAKS_KLIENTOW → BladKlienta `za_duzo`.
 * @param {Magazyn} magazyn @param {ZmianaKlienta} dane @param {OpcjeKlienta & { id: string }} opcje
 * @returns {Klient}
 */
export function dodajKlienta(magazyn, dane, opcje) {
  const id = opcje?.id
  sprawdzId(id)
  const pola = polaZeZmiany(dane)
  if (pola.nazwa === undefined) throw new BladKlienta('pusta_nazwa', 'nazwa', 'Klient musi mieć nazwę')
  const obecny = magazyn.wczytaj()
  const zapisany = 'stan' in obecny ? klient(obecny.stan, id) : null
  if (zapisany !== null) return zapisany
  const teraz = zegar(opcje).toISOString()
  /** @type {Klient} */
  const nowy = { id, nazwa: pola.nazwa, telefon: pola.telefon ?? null, adres: pola.adres ?? null, notatki: pola.notatki ?? null,
    utworzony: teraz, zmieniony: teraz }
  const stan = magazyn.zmien((s) => {
    if (klient(s, id) !== null) return s
    if (s.klienci.length >= MAKS_KLIENTOW) throw new BladKlienta('za_duzo', null, `Można zapisać najwyżej ${MAKS_KLIENTOW} klientów`)
    return { ...s, klienci: [...s.klienci, nowy] }
  })
  return klient(stan, id) ?? nowy
}

/**
 * Zmiana pol karty klienta; nazwy i adresu w zapisanych wycenach nie zmienia (to kopia z chwili wyboru).
 * @param {Magazyn} magazyn @param {string} id @param {ZmianaKlienta} zmiany @param {OpcjeKlienta} [opcje]
 * @returns {Klient}
 */
export function zapiszKlienta(magazyn, id, zmiany, opcje = {}) {
  const pola = polaZeZmiany(zmiany)
  const teraz = zegar(opcje).toISOString()
  /** @type {Klient | undefined} */
  let zapisany
  magazyn.zmien((stan) => {
    const obecny = klient(stan, id)
    if (obecny === null) throw new BladKlienta('brak_klienta', null, `Nie ma klienta ${id}`)
    const nowy = { ...obecny, ...pola, zmieniony: teraz }
    zapisany = nowy
    return { ...stan, klienci: stan.klienci.map((k) => (k.id === id ? nowy : k)) }
  })
  if (zapisany === undefined) throw new BladKlienta('brak_klienta', null, `Nie ma klienta ${id}`)
  return zapisany
}

/** @param {unknown} rekord @param {string} id rekord (wycena, zlecenie) z `klientId` wskazujacym klienta */
const nalezyDoKlienta = (rekord, id) => jestObiektem(rekord) && rekord.klientId === id

/**
 * Usuniecie klienta bez historii; klient z wycena albo zleceniem → BladKlienta `ma_historie`.
 * @param {Magazyn} magazyn @param {string} id
 * @returns {Stan}
 */
export function usunKlienta(magazyn, id) {
  return magazyn.zmien((stan) => {
    if (klient(stan, id) === null) throw new BladKlienta('brak_klienta', null, `Nie ma klienta ${id}`)
    const maHistorie = stan.wyceny.some((w) => nalezyDoKlienta(w, id)) || stan.zlecenia.some((z) => nalezyDoKlienta(z, id))
    if (maHistorie) throw new BladKlienta('ma_historie', null, 'Klienta z wycenami albo zleceniami nie da się usunąć')
    return { ...stan, klienci: stan.klienci.filter((k) => k.id !== id) }
  })
}

/**
 * Klienci po nazwie (porzadek polski: „Lucyna” przed „Łukasz”).
 * @param {Pick<Stan, 'klienci'>} stan
 * @returns {Klient[]}
 */
export function listaKlientow(stan) {
  return [...stan.klienci].sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
}

/** @param {string} tekst */
const bezOdstepow = (tekst) => tekst.replace(/[\s-]/gu, '')

/**
 * Klienci, ktorych nazwa, telefon albo adres zawiera fraze (bez wielkosci liter i nadmiarowych spacji; telefon tez bez spacji
 * i myslnikow), po nazwie. Pusta fraza daje wszystkich.
 * @param {Pick<Stan, 'klienci'>} stan @param {string} fraza
 * @returns {Klient[]}
 */
export function szukajKlientow(stan, fraza) {
  const szukana = normalizujNazwe(fraza)
  if (szukana === '') return listaKlientow(stan)
  const cyfry = bezOdstepow(szukana)
  /** @param {Klient} k */
  const pasuje = (k) => normalizujNazwe(k.nazwa).includes(szukana) || normalizujNazwe(k.adres ?? '').includes(szukana) ||
    (k.telefon !== null && cyfry !== '' && bezOdstepow(normalizujNazwe(k.telefon)).includes(cyfry))
  return listaKlientow(stan).filter(pasuje)
}
