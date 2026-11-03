// Dane modulu Klienci (czyste funkcje, bez DOM): opis i inicjaly wiersza listy, linki telefonu i mapy na karcie klienta,
// historia wycen klienta, podpowiedz duplikatu w formularzu i propozycje w wyborze klienta (R17, R18, R19). Wyszukiwanie
// i zapis klienta sa w src/dane/klienci.js.

import { normalizujNazwe, szukajKlientow } from '../dane/klienci.js'
import { kwotaWyceny } from '../dane/wyceny.js'
import { zl } from '../ui/format.js'

/** @typedef {import('../dane/klienci.js').Klient} Klient */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {{ wycena: Wycena, kwota: number | null, opis: string }} PozycjaHistorii opis: „150 zł · 30 paź”, bez ceny sam dzien */

const JEZYK = 'pl-PL'
const SEPARATOR = ' · '
const ADRES_MAPY = 'https://www.google.com/maps/search/?api=1&query='
const SEPARATORY_TELEFONU = /[\s-]/gu
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
 * Link do dzwonienia: numer bez spacji i myslnikow. Tekst bez cyfr albo z innymi znakami → RangeError.
 * @param {string} telefon np. „+48 600-100-200” @returns {string} `tel:+48600100200`
 */
export function linkTelefonu(telefon) {
  const numer = telefon.normalize('NFKC').replace(SEPARATORY_TELEFONU, '')
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

/**
 * Klient ma historie, gdy wskazuje go wycena albo zlecenie; takiego klienta nie da sie usunac (usunKlienta).
 * @param {Pick<Stan, 'wyceny' | 'zlecenia'>} stan @param {string} klientId @returns {boolean}
 */
export const czyMaHistorie = (stan, klientId) =>
  stan.wyceny.some((w) => w.klientId === klientId) || stan.zlecenia.some((z) => z.klientId === klientId)

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
 * Propozycje w arkuszu wyboru klienta: pasujacy klienci (szukajKlientow: nazwa, telefon, adres), najpierw ci, ktorych nazwa
 * zaczyna sie od frazy, potem pozostali, w obu grupach po nazwie; najwyzej MAKS_PROPOZYCJI. Pusta fraza daje pierwszych po nazwie.
 * @param {Pick<Stan, 'klienci'>} stan @param {string} fraza
 * @returns {Klient[]}
 */
export function propozycjeKlientow(stan, fraza) {
  const szukana = normalizujNazwe(fraza)
  const pasujacy = szukajKlientow(stan, fraza)
  /** @param {Klient} k */
  const czyOdPoczatku = (k) => szukana !== '' && normalizujNazwe(k.nazwa).startsWith(szukana)
  return [...pasujacy.filter(czyOdPoczatku), ...pasujacy.filter((k) => !czyOdPoczatku(k))].slice(0, MAKS_PROPOZYCJI)
}
