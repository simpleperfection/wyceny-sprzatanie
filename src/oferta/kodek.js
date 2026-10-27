// Oferta zakodowana w linku bez serwera (R22): fragment `#v1.<base64url(deflate-raw(JSON UTF-8))>`, ktorego przegladarka
// nie wysyla na serwer. Link moze sfabrykowac kazdy, wiec dekoder ogranicza rozmiar wejscia i wyniku i sprawdza scisle schemat
// oferty (dozwolone klucze, typy, dlugosci tekstow i list, kwoty skonczone i nieujemne). Bez DOM i bez magazynu.

import { GRANICE_OFERTY, jestDniem, jestObiektem } from '../dane/ksztalt.js'

/** @typedef {import('./tresc.js').Oferta} Oferta */
/**
 * @typedef {'brak' | 'wersja' | 'uszkodzony' | 'przegladarka'} PowodOdmowy
 * @typedef {{ ok: true, oferta: Oferta } | { ok: false, powod: PowodOdmowy }} WynikOdkodowania
 * @typedef {{ url: string, dlugosc: number, dlugi: boolean }} LinkOferty
 */

/** Najdluzszy link oferty bez ostrzezenia (SMS i komunikatory skracaja albo psuja dluzsze); zrodlo stalej dla edycji oferty. */
export const MAKS_DLUGOSC_LINKU = 2000
const PREFIKS = 'v1.'
const WERSJA = /^v(\d+)\./
/** Najdluzszy fragment i najwiekszy JSON po rozpakowaniu: wiecej znaczy link spoza aplikacji (ochrona przed „bomba” deflate). */
const MAKS_DLUGOSC_FRAGMENTU = 20_000
const MAKS_BAJTOW_JSON = 128 * 1024
const BASE64URL = /^[A-Za-z0-9_-]+$/
const STRONA_OFERTY = 'oferta.html'
const PROTOKOLY = new Set(['https:', 'http:'])
const STATUSY_VAT = ['zwolniony', 'czynny']
const MAKS_STAWKI_VAT = 100
const KLUCZE = Object.freeze({
  oferta: ['v', 'firma', 'numer', 'data', 'waznaDo', 'klient', 'uslugi', 'dojazd', 'razem', 'vat', 'dodatkiOpcjonalne', 'zakres', 'warunki',
    'szybka'],
  firma: ['nazwa', 'telefon', 'email', 'nip'],
  klient: ['nazwa', 'adres', 'termin'],
  linia: ['opis', 'kwota'],
  razem: ['od', 'do'],
  vat: ['status', 'stawka', 'netto', 'kwotaVat'],
  zakres: ['wchodzi', 'nie_wchodzi'],
})

/** Oferta, ktorej nie da sie zakodowac (`ksztalt`), albo zly adres aplikacji (`adres`). */
export class BladKodeka extends Error {
  /** @param {string} kod @param {string} [komunikat] */
  constructor(kod, komunikat = kod) {
    super(komunikat)
    this.name = 'BladKodeka'
    this.kod = kod
  }
}

/** @param {unknown} x @param {readonly string[]} klucze @returns {x is Record<string, unknown>} obiekt z dokladnie tymi kluczami */
const maKlucze = (x, klucze) => jestObiektem(x) && Object.keys(x).length === klucze.length && klucze.every((k) => Object.hasOwn(x, k))
/** @param {unknown} x */
const jestTekstem = (x) => typeof x === 'string' && x.length <= GRANICE_OFERTY.tekst
/** @param {unknown} x */
const jestNiepustymTekstem = (x) => jestTekstem(x) && x !== ''
/** @param {unknown} x */
const jestKwota = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0
/** @param {unknown} x */
const jestKwotaLubNull = (x) => x === null || jestKwota(x)
/** @param {unknown} x @param {(wartosc: unknown) => boolean} czyElement @param {number} [min] */
const jestLista = (x, czyElement, min = 0) => Array.isArray(x) && x.length >= min && x.length <= GRANICE_OFERTY.lista && x.every(czyElement)
/** @param {unknown} x */
const jestLinia = (x) => maKlucze(x, KLUCZE.linia) && jestNiepustymTekstem(x.opis) && jestKwota(x.kwota)

/** @param {unknown} x */
function jestCzescia(x) {
  const { firma, klient, razem, vat, zakres } = jestObiektem(x) ? x : {}
  return maKlucze(firma, KLUCZE.firma) && KLUCZE.firma.every((k) => jestTekstem(firma[k])) &&
    maKlucze(klient, KLUCZE.klient) && jestTekstem(klient.nazwa) && jestTekstem(klient.adres) && (klient.termin === null || jestTekstem(klient.termin)) &&
    maKlucze(razem, KLUCZE.razem) && jestKwota(razem.od) && jestKwota(razem.do) && Number(razem.od) <= Number(razem.do) &&
    maKlucze(vat, KLUCZE.vat) && STATUSY_VAT.some((s) => s === vat.status) && jestKwota(vat.stawka) && Number(vat.stawka) <= MAKS_STAWKI_VAT &&
    jestKwotaLubNull(vat.netto) && jestKwotaLubNull(vat.kwotaVat) &&
    maKlucze(zakres, KLUCZE.zakres) && jestLista(zakres.wchodzi, jestNiepustymTekstem) && jestLista(zakres.nie_wchodzi, jestNiepustymTekstem)
}

/**
 * Scisly schemat oferty z linku: tylko klucze typu Oferta, teksty do GRANICE_OFERTY.tekst, listy do GRANICE_OFERTY.lista,
 * kwoty skonczone i nieujemne, daty RRRR-MM-DD. Jedyny straznik oferty dla kodera i dekodera.
 * @param {unknown} x @returns {x is Oferta}
 */
export function jestOferta(x) {
  return maKlucze(x, KLUCZE.oferta) && x.v === 1 && jestNiepustymTekstem(x.numer) && jestDniem(x.data) && jestDniem(x.waznaDo) &&
    jestLista(x.uslugi, jestLinia, 1) && jestKwota(x.dojazd) && jestLista(x.dodatkiOpcjonalne, jestLinia) &&
    jestLista(x.warunki, jestNiepustymTekstem) && typeof x.szybka === 'boolean' && jestCzescia(x)
}

/** @param {Uint8Array} bajty @returns {string} */
function doBase64url(bajty) {
  let binarny = ''
  for (const bajt of bajty) binarny += String.fromCharCode(bajt)
  return btoa(binarny).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

/** @param {string} tekst base64url bez dopelnienia @returns {Uint8Array<ArrayBuffer> | null} null, gdy tekst nie jest poprawnym base64url */
function zBase64url(tekst) {
  if (!BASE64URL.test(tekst) || tekst.length % 4 === 1) return null
  const binarny = atob(tekst.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binarny, (znak) => znak.charCodeAt(0))
}

/** @param {Uint8Array<ArrayBuffer>} bajty @param {CompressionStream | DecompressionStream} przeksztalcenie */
const strumien = (bajty, przeksztalcenie) => new Blob([bajty]).stream().pipeThrough(przeksztalcenie)

/**
 * Rozpakowanie deflate-raw do MAKS_BAJTOW_JSON bajtow; uszkodzone dane rzucaja TypeError (strumien), wiekszy wynik daje null.
 * @param {Uint8Array<ArrayBuffer>} bajty @returns {Promise<Uint8Array | null>}
 */
async function rozpakuj(bajty) {
  const czytnik = strumien(bajty, new DecompressionStream('deflate-raw')).getReader()
  /** @type {Uint8Array[]} */
  const czesci = []
  let rozmiar = 0
  for (;;) {
    const { done, value } = await czytnik.read()
    if (done) break
    rozmiar += value.byteLength
    if (rozmiar > MAKS_BAJTOW_JSON) {
      await czytnik.cancel()
      return null
    }
    czesci.push(value)
  }
  const wynik = new Uint8Array(rozmiar)
  let przesuniecie = 0
  for (const czesc of czesci) {
    wynik.set(czesc, przesuniecie)
    przesuniecie += czesc.byteLength
  }
  return wynik
}

/**
 * Oferta → kod do fragmentu adresu: `v1.` + base64url(deflate-raw(JSON w UTF-8)). Oferta spoza schematu daje BladKodeka `ksztalt`,
 * zeby aplikacja nie wyslala linku, ktorego strona oferty nie otworzy.
 * @param {Oferta} oferta @returns {Promise<string>}
 */
export async function zakodujOferte(oferta) {
  if (!jestOferta(oferta)) throw new BladKodeka('ksztalt', 'Oferta ma pola spoza schematu, za długi tekst albo złą kwotę')
  const json = new TextEncoder().encode(JSON.stringify(oferta))
  const spakowane = new Uint8Array(await new Response(strumien(json, new CompressionStream('deflate-raw'))).arrayBuffer())
  return `${PREFIKS}${doBase64url(spakowane)}`
}

/** @param {string} kod bez prefiksu wersji @returns {Promise<WynikOdkodowania>} */
async function odkodujTresc(kod) {
  const bajty = zBase64url(kod)
  if (!bajty) return { ok: false, powod: 'uszkodzony' }
  try {
    const json = await rozpakuj(bajty)
    if (!json) return { ok: false, powod: 'uszkodzony' }
    const oferta = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json))
    return jestOferta(oferta) ? { ok: true, oferta } : { ok: false, powod: 'uszkodzony' }
  } catch (blad) {
    // TypeError: uszkodzony strumien deflate albo zly UTF-8; SyntaxError: zly JSON. Wszystkie znacza „uszkodzony link”.
    if (blad instanceof TypeError || blad instanceof SyntaxError) return { ok: false, powod: 'uszkodzony' }
    throw blad
  }
}

/**
 * Fragment adresu (z `#` albo bez) → oferta po scislej walidacji albo powod odmowy: `brak` (pusty), `wersja` (inna wersja
 * kodu), `uszkodzony` (obciety, zmieniony albo spoza schematu), `przegladarka` (brak DecompressionStream).
 * @param {string} fragment @returns {Promise<WynikOdkodowania>}
 */
export async function odkodujOferte(fragment) {
  const kod = typeof fragment === 'string' ? fragment.replace(/^#/, '') : ''
  if (kod === '') return { ok: false, powod: 'brak' }
  if (kod.length > MAKS_DLUGOSC_FRAGMENTU) return { ok: false, powod: 'uszkodzony' }
  const wersja = WERSJA.exec(kod)
  if (!wersja) return { ok: false, powod: 'uszkodzony' }
  if (!kod.startsWith(PREFIKS)) return { ok: false, powod: 'wersja' }
  if (typeof globalThis.DecompressionStream !== 'function') return { ok: false, powod: 'przegladarka' }
  return odkodujTresc(kod.slice(PREFIKS.length))
}

/**
 * Link oferty: `<katalog aplikacji>/oferta.html#<kod>` (adres strony aplikacji bez zapytania i fragmentu) i jego dlugosc;
 * `dlugi` = dluzszy niz MAKS_DLUGOSC_LINKU. Adres spoza http(s) daje BladKodeka `adres`.
 * @param {string} adresAplikacji np. location.href aplikacji @param {Oferta} oferta
 * @returns {Promise<LinkOferty>}
 */
export async function linkOferty(adresAplikacji, oferta) {
  let strona
  try {
    strona = new URL(STRONA_OFERTY, adresAplikacji)
  } catch (blad) {
    if (blad instanceof TypeError) throw new BladKodeka('adres', `Nieprawidłowy adres aplikacji: ${adresAplikacji}`)
    throw blad
  }
  if (!PROTOKOLY.has(strona.protocol)) throw new BladKodeka('adres', `Adres aplikacji musi być http(s), jest ${strona.protocol}`)
  const url = `${strona.origin}${strona.pathname}#${await zakodujOferte(oferta)}`
  return { url, dlugosc: url.length, dlugi: url.length > MAKS_DLUGOSC_LINKU }
}
