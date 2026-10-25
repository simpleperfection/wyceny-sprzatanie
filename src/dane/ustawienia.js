// Ustawienia firmy: wartosci domyslne z data/domyslne.json, zapis zmian z walidacja, pominiecie kreatora (R24)
// i koszty firmy dla silnika (koszty_firmy z data/ceny.json z nadpisaniami z ustawien).

import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { sprawdzStatusVat } from '../silnik/vat.js'
import { jestLiczba, jestObiektem, jestWarunkiem, POLA_FIRMY } from './ksztalt.js'
import { jestStatusemVat } from './magazyn.js'
import { bladEmaila, bladLiczby, bladNip, bladTelefonu, bladTempa } from './walidacja.js'

/** @typedef {import('./magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./magazyn.js').Stan} Stan */
/** @typedef {import('./magazyn.js').Ustawienia} Ustawienia */
/** @typedef {import('./magazyn.js').Firma} Firma */
/** @typedef {import('./magazyn.js').KosztyUstawien} KosztyUstawien */
/** @typedef {import('./magazyn.js').WarunekOferty} WarunekOferty */
/** @typedef {import('../silnik/katalog.js').KosztyFirmy} KosztyFirmy */
/** @typedef {import('../silnik/vat.js').StatusVat} StatusVat */
/**
 * @typedef {{ status_vat: StatusVat, stawka_vat_proc: number, tempo: number, wojewodztwo: string | null,
 *   oferta: { waznosc_dni: number, warunki: WarunekOferty[] }, szybka_wycena: { zastrzezenie: string } }} Domyslne data/domyslne.json
 * @typedef {'klient_zl_km' | 'darmowy_promien_km' | 'koszt_firmy_zl_km'} PoleDojazdu
 * @typedef {{ chemia_h?: number | null, sprzet?: Record<string, number | null>, dojazd?: Partial<Record<PoleDojazdu, number | null>> }} ZmianaKosztow
 *   null usuwa nadpisanie (wraca wartosc z data/ceny.json)
 * @typedef {{ wojewodztwoId?: string | null, statusVat?: StatusVat, firma?: Partial<Firma>, tempo?: { reczne: number | null },
 *   koszty?: ZmianaKosztow, przypomnienieKopiiDni?: number, kreatorZakonczony?: boolean }} ZmianaUstawien
 * @typedef {'wojewodztwo' | 'firma'} BrakUstawien
 */

/** Co ile dni przypominac o kopii (makieta `kopia-zapasowa`); pierwsza wartosc jest domyslna. */
export const DNI_PRZYPOMNIENIA_KOPII = Object.freeze([7, 14, 30])
/** Granice kosztow i stawek w ustawieniach (zl/h, zl/km, km); zrodlo dla walidacji i tekstow bledow widoku. */
export const GRANICE_KOSZTOW = Object.freeze({
  chemia_h: { min: 0, max: 100 },
  sprzet: { min: 0, max: 500 },
  klient_zl_km: { min: 0, max: 20 },
  darmowy_promien_km: { min: 0, max: 200 },
  koszt_firmy_zl_km: { min: 0, max: 20 },
})
const DLUGOSC_POL_FIRMY = Object.freeze({ nazwa: 120, telefon: 30, email: 254, nip: 20 })
/** Walidatory pol firmy (kod bledu albo null); nazwa nie ma walidatora poza dlugoscia. */
export const WALIDATORY_FIRMY = Object.freeze({ telefon: bladTelefonu, email: bladEmaila, nip: bladNip })
export const POLA_DOJAZDU = /** @type {const} */ (['klient_zl_km', 'darmowy_promien_km', 'koszt_firmy_zl_km'])
/** Pola firmy potrzebne w ofercie dla klienta: puste daja ostrzezenie w formularzu i znacznik „ustawienia domyślne – uzupełnij”. */
export const POLA_WYMAGANE_W_OFERCIE = Object.freeze(/** @type {const} */ (['nazwa', 'telefon']))
const PLIK_DOMYSLNYCH = 'data/domyslne.json'
const POLA_ZMIANY = ['wojewodztwoId', 'statusVat', 'firma', 'tempo', 'koszty', 'przypomnienieKopiiDni', 'kreatorZakonczony']
const IDENTYFIKATOR = /^[a-z][a-z0-9_-]{0,39}$/

/** Bledna zmiana ustawien: `kod` (np. `telefon`, `zakres`, `nieznane_pole`, `brak_ustawien`) i `pole` (np. `firma.telefon`). */
export class BladUstawien extends Error {
  /**
   * @param {string} kod
   * @param {string} pole
   * @param {{ cause?: unknown }} [opcje]
   */
  constructor(kod, pole, opcje) {
    super(`Ustawienia: ${pole} (${kod})`, opcje)
    this.name = 'BladUstawien'
    this.kod = kod
    this.pole = pole
  }
}

/**
 * @param {unknown} x
 * @param {readonly string[]} dozwolone
 * @param {string} sciezka
 * @returns {asserts x is Record<string, unknown>}
 */
function sprawdzKlucze(x, dozwolone, sciezka) {
  if (!jestObiektem(x)) throw new BladUstawien('wartosc', sciezka)
  const nieznane = Object.keys(x).find((klucz) => !dozwolone.includes(klucz))
  if (nieznane !== undefined) throw new BladUstawien('nieznane_pole', sciezka ? `${sciezka}.${nieznane}` : nieznane)
}

/** @param {unknown} x @param {{ min: number, max: number }} granice @param {string} pole */
function sprawdzLiczbeLubNull(x, granice, pole) {
  const kod = x === null ? null : bladLiczby(x, granice)
  if (kod) throw new BladUstawien(kod, pole)
}

/** @param {unknown} status @param {string} pole */
function sprawdzStatus(status, pole) {
  try {
    sprawdzStatusVat(status)
  } catch (blad) {
    if (blad instanceof BladWejscia) throw new BladUstawien('status_vat', pole, { cause: blad })
    throw blad
  }
}

/** @param {unknown} firma */
function sprawdzFirme(firma) {
  sprawdzKlucze(firma, POLA_FIRMY, 'firma')
  for (const pole of POLA_FIRMY) {
    const wartosc = firma[pole]
    if (wartosc === undefined) continue
    if (typeof wartosc !== 'string') throw new BladUstawien('wartosc', `firma.${pole}`)
    const tekst = wartosc.trim()
    if (tekst.length > DLUGOSC_POL_FIRMY[pole]) throw new BladUstawien('dlugosc', `firma.${pole}`)
    const kod = pole === 'nazwa' || tekst === '' ? null : WALIDATORY_FIRMY[pole](tekst)
    if (kod) throw new BladUstawien(kod, `firma.${pole}`)
  }
}

/** @param {unknown} koszty */
function sprawdzKoszty(koszty) {
  sprawdzKlucze(koszty, ['chemia_h', 'sprzet', 'dojazd'], 'koszty')
  if (koszty.chemia_h !== undefined) sprawdzLiczbeLubNull(koszty.chemia_h, GRANICE_KOSZTOW.chemia_h, 'koszty.chemia_h')
  if (koszty.sprzet !== undefined) {
    if (!jestObiektem(koszty.sprzet)) throw new BladUstawien('wartosc', 'koszty.sprzet')
    for (const [id, koszt] of Object.entries(koszty.sprzet)) {
      if (!IDENTYFIKATOR.test(id)) throw new BladUstawien('wartosc', 'koszty.sprzet')
      sprawdzLiczbeLubNull(koszt, GRANICE_KOSZTOW.sprzet, `koszty.sprzet.${id}`)
    }
  }
  if (koszty.dojazd === undefined) return
  sprawdzKlucze(koszty.dojazd, POLA_DOJAZDU, 'koszty.dojazd')
  for (const pole of POLA_DOJAZDU) {
    const wartosc = koszty.dojazd[pole]
    if (wartosc !== undefined) sprawdzLiczbeLubNull(wartosc, GRANICE_KOSZTOW[pole], `koszty.dojazd.${pole}`)
  }
}

/**
 * Walidacja zmiany na wejsciu (fail fast), zanim cokolwiek trafi do magazynu.
 * @param {unknown} zmiana
 * @returns {asserts zmiana is ZmianaUstawien}
 */
function sprawdzZmiane(zmiana) {
  sprawdzKlucze(zmiana, POLA_ZMIANY, '')
  const { wojewodztwoId, statusVat, firma, tempo, koszty, przypomnienieKopiiDni, kreatorZakonczony } = zmiana
  if (wojewodztwoId !== undefined && wojewodztwoId !== null && !(typeof wojewodztwoId === 'string' && IDENTYFIKATOR.test(wojewodztwoId))) {
    throw new BladUstawien('wartosc', 'wojewodztwoId')
  }
  if (statusVat !== undefined) sprawdzStatus(statusVat, 'statusVat')
  if (firma !== undefined) sprawdzFirme(firma)
  if (tempo !== undefined) {
    sprawdzKlucze(tempo, ['reczne'], 'tempo')
    const kod = tempo.reczne === null ? null : bladTempa(tempo.reczne)
    if (kod) throw new BladUstawien(kod, 'tempo.reczne')
  }
  if (koszty !== undefined) sprawdzKoszty(koszty)
  if (przypomnienieKopiiDni !== undefined && !DNI_PRZYPOMNIENIA_KOPII.some((dni) => dni === przypomnienieKopiiDni)) {
    throw new BladUstawien('wartosc', 'przypomnienieKopiiDni')
  }
  if (kreatorZakonczony !== undefined && typeof kreatorZakonczony !== 'boolean') throw new BladUstawien('wartosc', 'kreatorZakonczony')
}

/**
 * Pelne ustawienia spoza formularza (plik kopii): te same reguly wartosci co zapis zmiany; zakresy i warunki ma w ksztalcie stanu magazyn.
 * @param {Ustawienia} ustawienia
 */
export function sprawdzUstawienia(ustawienia) {
  const { zakresy: _zakresy, warunki: _warunki, ...zmiana } = ustawienia
  sprawdzZmiane(zmiana)
}

/**
 * @template T
 * @param {Record<string, T | null | undefined>} wartosci
 * @returns {Record<string, T>} bez wpisow null (usuniete nadpisania)
 */
function bezPustych(wartosci) {
  /** @param {[string, T | null | undefined]} wpis @returns {wpis is [string, T]} */
  const maWartosc = (wpis) => wpis[1] !== null && wpis[1] !== undefined
  return Object.fromEntries(Object.entries(wartosci).filter(maWartosc))
}

/** @param {KosztyUstawien} koszty @param {ZmianaKosztow} zmiana @returns {KosztyUstawien} */
function scalNadpisania(koszty, zmiana) {
  const chemia = zmiana.chemia_h === undefined ? koszty.chemia_h : zmiana.chemia_h
  return {
    ...(chemia === undefined || chemia === null ? {} : { chemia_h: chemia }),
    sprzet: bezPustych({ ...koszty.sprzet, ...zmiana.sprzet }),
    dojazd: bezPustych({ ...koszty.dojazd, ...zmiana.dojazd }),
  }
}

/** @param {Firma} firma @param {Partial<Firma>} zmiana @returns {Firma} */
function scalFirme(firma, zmiana) {
  /** @param {string | undefined} nowa @param {string} obecna */
  const pole = (nowa, obecna) => (nowa === undefined ? obecna : nowa.trim())
  return {
    nazwa: pole(zmiana.nazwa, firma.nazwa),
    telefon: pole(zmiana.telefon, firma.telefon),
    email: pole(zmiana.email, firma.email),
    nip: pole(zmiana.nip, firma.nip),
  }
}

/** @param {Ustawienia} ustawienia @param {ZmianaUstawien} zmiana @returns {Ustawienia} */
function zastosujZmiane(ustawienia, zmiana) {
  const { wojewodztwoId, statusVat, firma, tempo, koszty, przypomnienieKopiiDni, kreatorZakonczony } = zmiana
  return {
    ...ustawienia,
    wojewodztwoId: wojewodztwoId === undefined ? ustawienia.wojewodztwoId : wojewodztwoId,
    statusVat: statusVat ?? ustawienia.statusVat,
    firma: firma ? scalFirme(ustawienia.firma, firma) : ustawienia.firma,
    tempo: tempo ? { reczne: tempo.reczne } : ustawienia.tempo,
    koszty: koszty ? scalNadpisania(ustawienia.koszty, koszty) : ustawienia.koszty,
    przypomnienieKopiiDni: przypomnienieKopiiDni ?? ustawienia.przypomnienieKopiiDni,
    kreatorZakonczony: kreatorZakonczony ?? ustawienia.kreatorZakonczony,
  }
}

/** @param {unknown} x @returns {boolean} `{ waznosc_dni, warunki[] }` z data/domyslne.json */
const jestOferta = (x) => jestObiektem(x) && jestLiczba(x.waznosc_dni) && Array.isArray(x.warunki) && x.warunki.every(jestWarunkiem)

/**
 * Jedyny straznik ksztaltu data/domyslne.json (dane z granicy: fetch): wszystkie pola typu Domyslne.
 * @param {unknown} x
 * @returns {x is Domyslne}
 */
export function jestDomyslnymi(x) {
  return jestObiektem(x) && jestStatusemVat(x.status_vat) && jestLiczba(x.stawka_vat_proc) && jestLiczba(x.tempo)
    && (x.wojewodztwo === null || typeof x.wojewodztwo === 'string') && jestOferta(x.oferta)
    && jestObiektem(x.szybka_wycena) && typeof x.szybka_wycena.zastrzezenie === 'string'
}

/**
 * data/domyslne.json przez `pobierz` (fetch z limitem czasu w app.js, plik z dysku w testach).
 * @param {(sciezka: string) => Promise<unknown>} pobierz
 * @returns {Promise<Domyslne>} plik o zlym ksztalcie daje BladKatalogu `zly_format`
 */
export async function wczytajDomyslne(pobierz) {
  const dane = await pobierz(PLIK_DOMYSLNYCH)
  if (!jestDomyslnymi(dane)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIK_DOMYSLNYCH}`)
  return dane
}

/**
 * Ustawienia nowej firmy albo firmy, ktora pominela kreator: status VAT i wojewodztwo z data/domyslne.json, reszta pusta.
 * @param {Domyslne} domyslne
 * @returns {Ustawienia}
 */
export function ustawieniaDomyslne(domyslne) {
  if (!jestDomyslnymi(domyslne)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIK_DOMYSLNYCH}`)
  return {
    wojewodztwoId: domyslne.wojewodztwo,
    statusVat: domyslne.status_vat,
    firma: { nazwa: '', telefon: '', email: '', nip: '' },
    tempo: { reczne: null },
    koszty: { sprzet: {}, dojazd: {} },
    zakresy: {},
    warunki: null,
    przypomnienieKopiiDni: DNI_PRZYPOMNIENIA_KOPII[0],
    kreatorZakonczony: false,
  }
}

/**
 * Braki dla znacznika „ustawienia domyślne – uzupełnij” (R24): wojewodztwo niewybrane, firma bez nazwy albo telefonu.
 * Po zakonczonym kreatorze `wojewodztwoId: null` to swiadomie wybrana srednia krajowa, a nie brak.
 * @param {Ustawienia | null} ustawienia
 * @returns {BrakUstawien[]}
 */
export function brakujeUstawien(ustawienia) {
  if (!ustawienia) return ['wojewodztwo', 'firma']
  /** @type {BrakUstawien[]} */
  const braki = []
  if (ustawienia.wojewodztwoId === null && !ustawienia.kreatorZakonczony) braki.push('wojewodztwo')
  if (POLA_WYMAGANE_W_OFERCIE.some((pole) => ustawienia.firma[pole].trim() === '')) braki.push('firma')
  return braki
}

/**
 * Zapis zmiany ustawien. Bez ustawien w stanie tworzy je z `domyslne` (kreator), a bez `domyslne` rzuca `brak_ustawien`.
 * @param {Magazyn} magazyn
 * @param {ZmianaUstawien} zmiana
 * @param {Domyslne} [domyslne]
 * @returns {Stan}
 */
export function zapiszUstawienia(magazyn, zmiana, domyslne) {
  sprawdzZmiane(zmiana)
  const zDomyslnych = domyslne ? ustawieniaDomyslne(domyslne) : null
  return magazyn.zmien((stan) => {
    const baza = stan.ustawienia ?? zDomyslnych
    if (!baza) throw new BladUstawien('brak_ustawien', 'ustawienia')
    return { ...stan, ustawienia: zastosujZmiane(baza, zmiana) }
  })
}

/**
 * „Pomiń” w kreatorze ustawien: wartosci domyslne bez oznaczenia kreatora jako zakonczonego; istniejace ustawienia zostaja.
 * @param {Magazyn} magazyn
 * @param {Domyslne} domyslne
 * @returns {Stan}
 */
export function pominKreator(magazyn, domyslne) {
  const zDomyslnych = ustawieniaDomyslne(domyslne)
  return magazyn.zmien((stan) => ({ ...stan, ustawienia: stan.ustawienia ?? zDomyslnych }))
}

/**
 * Koszty firmy dla kosztZlecenia (src/silnik/koszt.js): koszty_firmy z data/ceny.json z nadpisaniami z ustawien.
 * Sprzet spoza katalogu jest pomijany.
 * @param {KosztyFirmy} kosztyFirmy
 * @param {Ustawienia | null} ustawienia
 * @returns {KosztyFirmy}
 */
export function scalKoszty(kosztyFirmy, ustawienia) {
  if (!ustawienia) return kosztyFirmy
  const { chemia_h: chemia, sprzet, dojazd } = ustawienia.koszty
  /** @param {string} id @param {{ nazwa: string, koszt_h: number } | string} wpis */
  const zNadpisaniem = (id, wpis) => (typeof wpis === 'object' && Object.hasOwn(sprzet, id) ? { ...wpis, koszt_h: sprzet[id] } : wpis)
  return {
    ...kosztyFirmy,
    chemia_h: chemia === undefined ? kosztyFirmy.chemia_h : { ...kosztyFirmy.chemia_h, wartosc: chemia },
    sprzet: Object.fromEntries(Object.entries(kosztyFirmy.sprzet).map(([id, wpis]) => [id, zNadpisaniem(id, wpis)])),
    dojazd: {
      ...kosztyFirmy.dojazd,
      klient_zl_km: dojazd.klient_zl_km ?? kosztyFirmy.dojazd.klient_zl_km,
      darmowy_promien_km: dojazd.darmowy_promien_km ?? kosztyFirmy.dojazd.darmowy_promien_km,
      koszt_firmy_zl_km: dojazd.koszt_firmy_zl_km ?? kosztyFirmy.dojazd.koszt_firmy_zl_km,
    },
  }
}
