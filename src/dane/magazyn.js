// Magazyn stanu aplikacji: jeden klucz localStorage z wersja schematu, aktualizacja starszych wersji stanu,
// zapis calosci przy kazdej zmianie i powiadomienie o zmianie z innej karty (zdarzenie `storage`).

import { BladWejscia } from '../silnik/bledy.js'
import { sprawdzStatusVat } from '../silnik/vat.js'

/** @typedef {import('../silnik/vat.js').StatusVat} StatusVat */
/** @typedef {import('./wyceny.js').Wycena} Wycena */
/**
 * @typedef {{ nazwa: string, telefon: string, email: string, nip: string }} Firma
 * @typedef {{ klient_zl_km?: number, darmowy_promien_km?: number, koszt_firmy_zl_km?: number }} DojazdUstawien
 * @typedef {{ chemia_h?: number, sprzet: Record<string, number>, dojazd: DojazdUstawien }} KosztyUstawien tylko nadpisania data/ceny.json
 * @typedef {{ wchodzi: string[], nie_wchodzi: string[] }} ZakresUslugi
 * @typedef {{ id: string, tresc: string, tylko_szybka: boolean }} WarunekOferty
 * @typedef {{ wojewodztwoId: string | null, statusVat: StatusVat, firma: Firma, tempo: { reczne: number | null },
 *   koszty: KosztyUstawien, zakresy: Record<string, ZakresUslugi>, warunki: WarunekOferty[] | null,
 *   przypomnienieKopiiDni: number, kreatorZakonczony: boolean }} Ustawienia
 * @typedef {{ wersja: number, ustawienia: Ustawienia | null, wyceny: Wycena[], licznikNumerow: Record<string, number>,
 *   kopia: { ostatnia: string | null, zmianaOd: string | null }, preferencje: { iosInstrukcjaZamknieta: boolean } }} Stan
 * @typedef {'uszkodzony' | 'nowsza_wersja'} BladStanu
 * @typedef {{ stan: Stan } | { blad: BladStanu, surowe: string }} WynikWczytania
 * @typedef {{ kod: string, przyczyna?: string }} WpisLogu
 * @typedef {{ teraz?: () => Date, loguj?: (wpis: WpisLogu) => void, poprosOTrwalosc?: () => unknown,
 *   okno?: Pick<Window, 'addEventListener' | 'removeEventListener'> }} OpcjeMagazynu
 * @typedef {{ wczytaj: () => WynikWczytania, zmien: (fn: (stan: Stan) => Stan) => Stan, zapiszCalosc: (stan: Stan) => void,
 *   naZmiane: (callback: () => void) => () => void, wyczysc: () => void }} Magazyn
 */

export const KLUCZ_MAGAZYNU = 'wyceny-sprzatanie:stan'
export const WERSJA_SCHEMATU = 1

/**
 * Aktualizacja starszych wersji stanu: wersja → funkcja dajaca stan wersji o 1 wyzszej. Pusta, dopoki schemat ma jedna wersje.
 * @type {ReadonlyMap<number, (stan: Record<string, unknown>) => Record<string, unknown>>}
 */
const AKTUALIZACJE = new Map()
const NAZWY_PRZEPELNIENIA = ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']
const MIESIAC_NUMERACJI = /^\d{4}-(0[1-9]|1[0-2])$/

/** Blad magazynu: `pelny` (brak miejsca), `uszkodzony`, `nowsza_wersja` (stanu nie da sie zmienic), `zly_stan` (zapis zlego ksztaltu). */
export class BladMagazynu extends Error {
  /**
   * @param {string} kod
   * @param {string} [komunikat]
   * @param {{ cause?: unknown }} [opcje]
   */
  constructor(kod, komunikat = kod, opcje) {
    super(komunikat, opcje)
    this.name = 'BladMagazynu'
    this.kod = kod
  }
}

/** @param {unknown} x @returns {x is Record<string, unknown>} */
const jestObiektem = (x) => typeof x === 'object' && x !== null && !Array.isArray(x)
/** @param {unknown} x */
const jestTekstemLubNull = (x) => x === null || typeof x === 'string'
/** @param {unknown} x @returns {x is number} */
const jestLiczba = (x) => typeof x === 'number' && Number.isFinite(x)
/** @param {unknown} x */
const jestListaTekstow = (x) => Array.isArray(x) && x.every((t) => typeof t === 'string')
/** @param {unknown} x */
const jestDataIsoLubNull = (x) => x === null || (typeof x === 'string' && !Number.isNaN(Date.parse(x)))

/** @param {unknown} x @param {(wartosc: unknown) => boolean} czyWartosc */
function maWartosci(x, czyWartosc) {
  return jestObiektem(x) && Object.values(x).every(czyWartosc)
}

/** Status VAT sprawdza silnik (jedno zrodlo listy statusow); odmowa silnika znaczy „nie status”. @param {unknown} x */
function jestStatusemVat(x) {
  try {
    sprawdzStatusVat(x)
    return true
  } catch (blad) {
    if (blad instanceof BladWejscia) return false
    throw blad
  }
}

/** @param {unknown} x */
function jestKosztamiUstawien(x) {
  return jestObiektem(x) && (x.chemia_h === undefined || jestLiczba(x.chemia_h)) && maWartosci(x.sprzet, jestLiczba) &&
    maWartosci(x.dojazd, jestLiczba)
}

/** @param {unknown} x */
const jestWarunkiem = (x) => jestObiektem(x) && typeof x.id === 'string' && typeof x.tresc === 'string' && typeof x.tylko_szybka === 'boolean'

/** Ksztalt ustawien (typy pol); dozwolone wartosci sprawdza zapiszUstawienia w ustawienia.js. @param {unknown} x */
function jestUstawieniami(x) {
  return jestObiektem(x) && jestTekstemLubNull(x.wojewodztwoId) && jestStatusemVat(x.statusVat) &&
    jestObiektem(x.firma) && ['nazwa', 'telefon', 'email', 'nip'].every((p) => jestObiektem(x.firma) && typeof x.firma[p] === 'string') &&
    jestObiektem(x.tempo) && (x.tempo.reczne === null || jestLiczba(x.tempo.reczne)) && jestKosztamiUstawien(x.koszty) &&
    maWartosci(x.zakresy, (z) => jestObiektem(z) && jestListaTekstow(z.wchodzi) && jestListaTekstow(z.nie_wchodzi)) &&
    (x.warunki === null || (Array.isArray(x.warunki) && x.warunki.every(jestWarunkiem))) &&
    Number.isInteger(x.przypomnienieKopiiDni) && typeof x.kreatorZakonczony === 'boolean'
}

/** @param {unknown} x @returns {x is Stan} */
function jestStanem(x) {
  return jestObiektem(x) && x.wersja === WERSJA_SCHEMATU && (x.ustawienia === null || jestUstawieniami(x.ustawienia)) &&
    Array.isArray(x.wyceny) && x.wyceny.every(jestObiektem) &&
    jestObiektem(x.licznikNumerow) &&
    Object.entries(x.licznikNumerow).every(([miesiac, n]) => MIESIAC_NUMERACJI.test(miesiac) && Number.isInteger(n) && Number(n) >= 0) &&
    jestObiektem(x.kopia) && jestDataIsoLubNull(x.kopia.ostatnia) && jestDataIsoLubNull(x.kopia.zmianaOd) &&
    jestObiektem(x.preferencje) && typeof x.preferencje.iosInstrukcjaZamknieta === 'boolean'
}

/** @returns {Stan} */
function pustyStan() {
  return { wersja: WERSJA_SCHEMATU, ustawienia: null, wyceny: [], licznikNumerow: {}, kopia: { ostatnia: null, zmianaOd: null },
    preferencje: { iosInstrukcjaZamknieta: false } }
}

/**
 * Dane z magazynu albo z pliku kopii → stan biezacej wersji (przez kolejne kroki AKTUALIZACJE) albo kod bledu.
 * @param {unknown} dane
 * @returns {{ stan: Stan } | { blad: BladStanu }}
 */
export function zaktualizujStan(dane) {
  if (!jestObiektem(dane) || !Number.isInteger(dane.wersja) || Number(dane.wersja) < 1) return { blad: 'uszkodzony' }
  const wersja = Number(dane.wersja)
  if (wersja > WERSJA_SCHEMATU) return { blad: 'nowsza_wersja' }
  let biezacy = dane
  for (let w = wersja; w < WERSJA_SCHEMATU; w += 1) {
    const krok = AKTUALIZACJE.get(w)
    if (!krok) return { blad: 'uszkodzony' }
    biezacy = krok(biezacy)
  }
  return jestStanem(biezacy) ? { stan: biezacy } : { blad: 'uszkodzony' }
}

/** @param {string} surowe @returns {unknown} undefined, gdy tekst nie jest JSON-em */
function parsuj(surowe) {
  try {
    return JSON.parse(surowe)
  } catch (blad) {
    if (blad instanceof SyntaxError) return undefined
    throw blad
  }
}

/** @param {unknown} blad */
const jestPrzepelnieniem = (blad) => blad instanceof DOMException && NAZWY_PRZEPELNIENIA.includes(blad.name)

/** @param {WpisLogu} wpis */
function logujOstrzezenie(wpis) {
  console.warn(JSON.stringify({ modul: 'magazyn', ...wpis }))
}

function poprosPrzegladarke() {
  return globalThis.navigator?.storage?.persist?.()
}

/**
 * @param {Storage} [storage]
 * @param {OpcjeMagazynu} [opcje] zegar, log, prosba o trwaly magazyn i cel zdarzen `storage` (do testow)
 * @returns {Magazyn}
 */
export function utworzMagazyn(storage = globalThis.localStorage, opcje = {}) {
  const { teraz = () => new Date(), loguj = logujOstrzezenie, poprosOTrwalosc = poprosPrzegladarke, okno = globalThis } = opcje
  let czyPoproszonoOTrwalosc = false

  /** @returns {WynikWczytania} */
  function wczytaj() {
    const surowe = storage.getItem(KLUCZ_MAGAZYNU)
    if (surowe === null) return { stan: pustyStan() }
    const dane = parsuj(surowe)
    const wynik = dane === undefined ? { blad: /** @type {const} */ ('uszkodzony') } : zaktualizujStan(dane)
    if ('stan' in wynik) return wynik
    loguj({ kod: `magazyn_${wynik.blad}` })
    return { blad: wynik.blad, surowe }
  }

  /** @param {Stan} stan */
  function zapisz(stan) {
    if (!jestStanem(stan)) throw new BladMagazynu('zly_stan', 'Stan do zapisu ma zły kształt albo wersję')
    try {
      storage.setItem(KLUCZ_MAGAZYNU, JSON.stringify(stan))
    } catch (blad) {
      if (jestPrzepelnieniem(blad)) throw new BladMagazynu('pelny', 'Brak miejsca w pamięci przeglądarki', { cause: blad })
      throw blad
    }
    if (czyPoproszonoOTrwalosc) return
    czyPoproszonoOTrwalosc = true
    void Promise.resolve().then(poprosOTrwalosc).catch((blad) => loguj({ kod: 'trwalosc_niedostepna', przyczyna: String(blad) }))
  }

  /**
   * Czyta stan z magazynu na nowo (zapis innej karty nie ginie), stosuje `fn` synchronicznie, oznacza zmiane i zapisuje calosc.
   * @param {(stan: Stan) => Stan} fn
   */
  function zmien(fn) {
    const wynik = wczytaj()
    if (!('stan' in wynik)) throw new BladMagazynu(wynik.blad, 'Zapisanych danych nie da się zmienić')
    const nowy = fn(wynik.stan)
    if (!jestStanem(nowy)) throw new BladMagazynu('zly_stan', 'Zmiana dała stan złego kształtu')
    const oznaczony = { ...nowy, kopia: { ...nowy.kopia, zmianaOd: teraz().toISOString() } }
    zapisz(oznaczony)
    return oznaczony
  }

  /** @param {() => void} callback @returns {() => void} odpina callback */
  function naZmiane(callback) {
    /** @param {StorageEvent} zdarzenie */
    const obsluz = (zdarzenie) => {
      if (zdarzenie.storageArea === storage && (zdarzenie.key === KLUCZ_MAGAZYNU || zdarzenie.key === null)) callback()
    }
    okno.addEventListener('storage', obsluz)
    return () => okno.removeEventListener('storage', obsluz)
  }

  return { wczytaj, zmien, zapiszCalosc: zapisz, naZmiane, wyczysc: () => storage.removeItem(KLUCZ_MAGAZYNU) }
}
