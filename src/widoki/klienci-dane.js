// Dane modulu Klienci (bez DOM): opis i inicjaly wiersza listy, linki telefonu i mapy na karcie klienta, historia wycen i zlecen
// klienta z niezaplaconymi pozycjami, podpowiedz duplikatu w formularzu, klient formularza i jego zapis (nowy albo edycja) oraz
// propozycje w wyborze klienta (R16, R17, R18, R19). Wyszukiwanie i operacje na magazynie sa w src/dane/klienci.js.

import { dodajKlienta, dopasowanieFrazy, indeksKlientow, klient, normalizujNazwe, zapiszKlienta } from '../dane/klienci.js'
import { numerTelefonu } from '../dane/walidacja.js'
import { kwotaWyceny } from '../dane/wyceny.js'
import { zlecenie, zleceniaKlienta } from '../dane/zlecenia.js'
import { dzienKrotko, kiedy, kwotaJednostki, miesiacRok, zl } from '../ui/format.js'
import { sciezka } from '../ui/trasy.js'
import { W_ABONAMENCIE } from '../zlecenia/kalendarz-dane.js'
import { najblizszaOtwarta } from '../zlecenia/karta-dane.js'
import { dzienWizyty, nazwaZlecenia, nazwyUslug } from '../zlecenia/teksty-wizyty.js'
import { niezaplacone } from '../zlecenia/zapytania.js'

/** @typedef {import('../dane/klienci.js').Klient} Klient */
/** @typedef {import('../dane/klienci.js').ZmianaKlienta} ZmianaKlienta */
/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {{ rodzaj: 'nowy' } | { rodzaj: 'edycja', klient: Klient } | { rodzaj: 'brak' }} KlientFormularza brak: klienta z adresu nie ma */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie */
/** @typedef {import('../zlecenia/zapytania.js').Niezaplacone} Niezaplacone */
/** @typedef {{ wycena: Wycena, kwota: number | null, opis: string }} PozycjaHistorii opis: „150 zł · 30 paź”, bez ceny sam dzien */
/** @typedef {{ nazwa: string, opis: string, adres: string }} PozycjaZlecenia opis: „dziś 9:00 · 250 zł” albo „Zakończone” */
/** @typedef {{ tekst: string, adres: string }} PozycjaNiezaplacona tekst: „pn 2 lis · 180 zł” albo „Październik 2026 · 1 200 zł” */

const JEZYK = 'pl-PL'
const SEPARATOR = ' · '
const ZAKONCZONE = 'Zakończone'
const ADRES_MAPY = 'https://www.google.com/maps/search/?api=1&query='
const NUMER_TELEFONU = /^\+?\d+$/u
/** Dzien utworzenia wyceny w czasie lokalnym: „30 paź”. */
const formatDniaWyceny = new Intl.DateTimeFormat(JEZYK, { day: 'numeric', month: 'short' })
/** Najwiecej propozycji w arkuszu wyboru klienta (wyborKlienta). */
export const MAKS_PROPOZYCJI = 8

/** @param {Pick<Klient, 'telefon' | 'adres'>} klient @returns {string | null} druga linia wiersza: telefon, a bez niego adres */
export const opisWiersza = (klient) => klient.telefon ?? klient.adres ?? null

/**
 * Inicjaly do kolka w wierszu listy: pierwsza litera pierwszego i ostatniego slowa nazwy, wielkie.
 * @param {string} nazwa @returns {string} „AK” dla „Anna Kowalska”, „J” dla „Jan”, pusty tekst bez nazwy
 */
export function inicjaly(nazwa) {
  const slowa = nazwa.trim().split(/\s+/u).filter((slowo) => slowo !== '')
  const [pierwsze, ostatnie] = [slowa[0], slowa.length > 1 ? slowa[slowa.length - 1] : undefined]
  return [pierwsze, ostatnie].map((slowo) => Array.from(slowo ?? '')[0] ?? '').join('').toLocaleUpperCase(JEZYK)
}

/**
 * Link do dzwonienia: numer w zapisie zwartym (numerTelefonu: bez spacji i myslnikow). Tekst bez cyfr albo z innymi znakami
 * niz cyfry i wiodacy plus → RangeError; dlugosci numeru nie sprawdza (to robi bladTelefonu przy zapisie klienta).
 * @param {string} telefon np. „+48 600-100-200” @returns {string} `tel:+48600100200`
 */
export function linkTelefonu(telefon) {
  const numer = numerTelefonu(telefon)
  if (!NUMER_TELEFONU.test(numer)) throw new RangeError(`To nie jest numer telefonu: ${telefon}`)
  return `tel:${numer}`
}

/**
 * Link do wyszukania adresu w Mapach Google (na telefonie otwiera aplikacje map). Pusty adres → RangeError.
 * @param {string} adres @returns {string} `https://www.google.com/maps/search/?api=1&query=ul.%20Lipowa%203%2C%20Warszawa`
 */
export function linkMapy(adres) {
  const tekst = adres.trim()
  if (tekst === '') throw new RangeError('Pusty adres klienta')
  return `${ADRES_MAPY}${encodeURIComponent(tekst)}`
}

/** @param {string} chwila ISO @returns {string} „30 paź”; nieprawidlowa data → RangeError */
function dzienWyceny(chwila) {
  const wartosc = new Date(chwila)
  if (Number.isNaN(wartosc.getTime())) throw new RangeError(`Nieprawidłowa data utworzenia wyceny: ${chwila}`)
  return formatDniaWyceny.format(wartosc)
}

/**
 * Wyceny klienta (po `klientId`) od najnowszej (data utworzenia) z kwota i druga linia wiersza.
 * @param {Pick<Stan, 'wyceny'>} stan @param {string} klientId
 * @returns {PozycjaHistorii[]}
 */
export function historiaWycen(stan, klientId) {
  return stan.wyceny
    .filter((w) => w.klientId === klientId)
    .sort((a, b) => (a.utworzona === b.utworzona ? 0 : a.utworzona < b.utworzona ? 1 : -1))
    .map((wycena) => {
      const kwota = kwotaWyceny(wycena)
      const dzien = dzienWyceny(wycena.utworzona)
      return { wycena, kwota, opis: kwota === null ? dzien : [zl(kwota), dzien].join(SEPARATOR) }
    })
}

/** @param {Zlecenie} z @param {string} dzis RRRR-MM-DD @returns {string} „dziś 9:00 · 250 zł”, bez wizyty do wykonania „Zakończone” */
function opisZlecenia(z, dzis) {
  const w = najblizszaOtwarta(z, dzis)
  if (w === null) return ZAKONCZONE
  const kwota = w.okres.cenaWizyty === null ? W_ABONAMENCIE : kwotaJednostki(w.okres.cenaWizyty)
  return [kiedy(w.data, w.godzina, dzis), kwota].join(SEPARATOR)
}

/**
 * Zlecenia klienta od najnowszego (data zalozenia) z nazwa, najblizsza wizyta albo „Zakończone” i adresem karty zlecenia.
 * @param {Pick<Stan, 'zlecenia'>} stan @param {string} klientId @param {Pick<Katalog, 'uslugi'>} katalog @param {string} dzis RRRR-MM-DD
 * @returns {PozycjaZlecenia[]}
 */
export function historiaZlecen(stan, klientId, katalog, dzis) {
  const nazwaUslugi = nazwyUslug(katalog)
  return zleceniaKlienta(stan, klientId)
    .sort((a, b) => (a.utworzone === b.utworzone ? 0 : a.utworzone < b.utworzone ? 1 : -1))
    .map((z) => ({ nazwa: nazwaZlecenia(z, nazwaUslugi), opis: opisZlecenia(z, dzis), adres: sciezka('zlecenie', { id: z.id }) }))
}

/**
 * Wiersz niezaplaconej pozycji: wizyta z dniem, w ktorym sie odbyla (po przesunieciu nowy dzien) → ekran wizyty, a miesiac → karta zlecenia.
 * @param {Pick<Stan, 'zlecenia'>} stan @param {Niezaplacone} pozycja @returns {PozycjaNiezaplacona}
 */
function pozycjaNiezaplacona(stan, { rodzaj, zlecenieId, klucz, kwota }) {
  if (rodzaj === 'miesiac') return { tekst: [miesiacRok(`${klucz}-01`), kwotaJednostki(kwota)].join(SEPARATOR), adres: sciezka('zlecenie', { id: zlecenieId }) }
  const z = zlecenie(stan, zlecenieId)
  return { tekst: [dzienKrotko(z === null ? klucz : dzienWizyty(z, klucz)), kwotaJednostki(kwota)].join(SEPARATOR), adres: sciezka('wizyta', { id: zlecenieId, data: klucz }) }
}

/**
 * Niezaplacone klienta (regula `niezaplacone`, src/zlecenia/zapytania.js), najstarsze najpierw.
 * @param {Pick<Stan, 'klienci' | 'zlecenia'>} stan @param {string} klientId @param {string} dzis RRRR-MM-DD
 * @returns {PozycjaNiezaplacona[]}
 */
export const niezaplaconeKlienta = (stan, klientId, dzis) => niezaplacone(stan, dzis, klientId).map((pozycja) => pozycjaNiezaplacona(stan, pozycja))

/** Regula „klient ma historie” (karta klienta: „Usuń klienta”) ma jedna definicje w src/dane/klienci.js. */
export { czyMaHistorie } from '../dane/klienci.js'

/**
 * Zapisany klient o tej samej nazwie (normalizujNazwe: wielkosc liter, spacje, NFC) do podpowiedzi duplikatu w formularzu;
 * `pomijanyId` to klient edytowany (nie podpowiada siebie samego). Pusta nazwa daje null.
 * @param {Pick<Stan, 'klienci'>} stan @param {string} nazwa @param {string | null} [pomijanyId]
 * @returns {Klient | null}
 */
export function podobnyKlient(stan, nazwa, pomijanyId = null) {
  const szukana = normalizujNazwe(nazwa)
  if (szukana === '') return null
  return stan.klienci.find((k) => k.id !== pomijanyId && normalizujNazwe(k.nazwa) === szukana) ?? null
}

/**
 * Klient formularza z parametru trasy: bez id nowy, z id zapisanego klienta edycja, z id, ktorego nie ma (usuniety w innej
 * karcie, zly link), ekran braku klienta.
 * @param {Pick<Stan, 'klienci'>} stan @param {string | null} id
 * @returns {KlientFormularza}
 */
export function klientFormularza(stan, id) {
  if (id === null) return { rodzaj: 'nowy' }
  const zapisany = klient(stan, id)
  return zapisany === null ? { rodzaj: 'brak' } : { rodzaj: 'edycja', klient: zapisany }
}

/**
 * Zapis formularza klienta: nowy (`edytowany` null) przez dodajKlienta z id nadanym przy otwarciu ekranu (podwojne „Zapisz”
 * nie dubluje klienta), edycja przez zapiszKlienta. Bledne pola → BladKlienta z dane/klienci.js.
 * @param {Magazyn} magazyn @param {Klient | null} edytowany @param {string} id @param {ZmianaKlienta} dane
 * @returns {Klient}
 */
export function zapiszFormularzKlienta(magazyn, edytowany, id, dane) {
  return edytowany === null ? dodajKlienta(magazyn, dane, { id }) : zapiszKlienta(magazyn, id, dane)
}

/**
 * Propozycje w arkuszu wyboru klienta: pasujacy klienci (dopasowanieFrazy: nazwa, telefon, adres), najpierw ci, ktorych nazwa
 * zaczyna sie od frazy, potem pozostali, w obu grupach po nazwie; najwyzej MAKS_PROPOZYCJI. Pusta fraza daje pierwszych po nazwie.
 * Przeglad indeksu (indeksKlientow) konczy sie, gdy grupa, ktora idzie pierwsza, ma juz MAKS_PROPOZYCJI klientow.
 * @param {Pick<Stan, 'klienci'>} stan @param {string} fraza
 * @returns {Klient[]}
 */
export function propozycjeKlientow(stan, fraza) {
  const { szukana, pasuje } = dopasowanieFrazy(fraza)
  /** @type {Klient[]} */
  const odPoczatku = []
  /** @type {Klient[]} */
  const pozostali = []
  for (const wpis of indeksKlientow(stan)) {
    if (odPoczatku.length >= MAKS_PROPOZYCJI || (szukana === '' && pozostali.length >= MAKS_PROPOZYCJI)) break
    if (!pasuje(wpis)) continue
    if (szukana !== '' && wpis.nazwa.startsWith(szukana)) odPoczatku.push(wpis.klient)
    else if (pozostali.length < MAKS_PROPOZYCJI) pozostali.push(wpis.klient)
  }
  return [...odPoczatku, ...pozostali].slice(0, MAKS_PROPOZYCJI)
}
