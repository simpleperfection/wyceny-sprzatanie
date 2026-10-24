// Kopia zapasowa (R23): plik JSON z calym stanem, odczyt pliku z walidacja jak dane z zewnatrz, wczytanie trybem „polacz”
// albo „zastap” i regula przypomnienia o kopii. Bez DOM: pobranie i odczyt pliku robi widok kopii.

import { BladMagazynu, WERSJA_SCHEMATU, zaktualizujStan } from './magazyn.js'
import { DNI_PRZYPOMNIENIA_KOPII } from './ustawienia.js'
import { STATUSY_WYCENY } from './wyceny.js'

/** @typedef {import('./magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./magazyn.js').Stan} Stan */
/** @typedef {import('./wyceny.js').Wycena} Wycena */
/**
 * @typedef {'polacz' | 'zastap'} TrybWczytania
 * @typedef {{ nazwaPliku: string, tresc: string }} PlikKopii
 * @typedef {{ wycen: number, wykonan: number, czyUstawienia: boolean }} PodsumowanieKopii
 */

const NAZWA_APLIKACJI = 'wyceny-sprzatanie'
const MAKS_DLUGOSC_TEKSTU = 2000
const MAKS_WYCEN = 5000
/** Glebokosc zagniezdzenia pliku kopii; stan aplikacji ma kilka poziomow, wiecej znaczy plik spoza aplikacji. */
const MAKS_ZAGLEBIENIE = 32
const MS_DOBY = 86_400_000
const RODZAJE_WYCENY = ['szybka', 'dokladna']
const KWOTY_WYNIKU = ['cena', 'netto', 'vat', 'mediana', 'minutyNormowe', 'stawkaVatProc']

/** Bledny plik kopii albo argument: `zly_plik`, `nowsza_wersja`, `uszkodzony`, `tryb`, `data`. */
export class BladKopii extends Error {
  /**
   * @param {string} kod
   * @param {string} [komunikat]
   * @param {{ cause?: unknown }} [opcje]
   */
  constructor(kod, komunikat = kod, opcje) {
    super(komunikat, opcje)
    this.name = 'BladKopii'
    this.kod = kod
  }
}

/** @param {unknown} x @returns {x is Record<string, unknown>} */
const jestObiektem = (x) => typeof x === 'object' && x !== null && !Array.isArray(x)
/** @param {unknown} x */
const jestTekstemLubNull = (x) => x === null || typeof x === 'string'
/** @param {unknown} x */
const jestData = (x) => typeof x === 'string' && !Number.isNaN(Date.parse(x))
/** @param {unknown} x @returns {x is number} */
const jestLiczba = (x) => typeof x === 'number' && Number.isFinite(x)
/** @param {unknown} x */
const jestListaTekstow = (x) => Array.isArray(x) && x.every((t) => typeof t === 'string')

/** Kazdy tekst i klucz do MAKS_DLUGOSC_TEKSTU znakow, zagniezdzenie do MAKS_ZAGLEBIENIE. @param {unknown} x @param {number} [glebokosc] @returns {boolean} */
function maKrotkieTeksty(x, glebokosc = 0) {
  if (typeof x === 'string') return x.length <= MAKS_DLUGOSC_TEKSTU
  if (typeof x !== 'object' || x === null) return true
  if (glebokosc >= MAKS_ZAGLEBIENIE) return false
  return Object.entries(x).every(([klucz, w]) => klucz.length <= MAKS_DLUGOSC_TEKSTU && maKrotkieTeksty(w, glebokosc + 1))
}

/** @param {unknown} x */
function jestWynikiem(x) {
  return x === null || (jestObiektem(x) && KWOTY_WYNIKU.every((p) => jestLiczba(x[p])) && Array.isArray(x.linie) &&
    Array.isArray(x.propozycje) && jestObiektem(x.widelki) && jestObiektem(x.dojazd) && jestObiektem(x.wojewodztwo) &&
    typeof x.statusVat === 'string' && typeof x.podstawaCeny === 'string' && (x.wizytWMiesiacu === null || jestLiczba(x.wizytWMiesiacu)) &&
    jestObiektem(x.wersjaDanych))
}

/** @param {unknown} x */
const jestWykonaniem = (x) => jestObiektem(x) && typeof x.id === 'string' && typeof x.data === 'string' && jestLiczba(x.minuty) &&
  jestLiczba(x.tempoPlanu)

/** @param {unknown} x */
const jestWarunkiem = (x) => jestObiektem(x) && typeof x.id === 'string' && typeof x.tresc === 'string' && typeof x.tylko_szybka === 'boolean'

/** @param {unknown} x */
function jestOferta(x) {
  return jestObiektem(x) && (x.zakres === null || (jestObiektem(x.zakres) && jestListaTekstow(x.zakres.wchodzi) &&
    jestListaTekstow(x.zakres.nie_wchodzi))) && (x.warunki === null || (Array.isArray(x.warunki) && x.warunki.every(jestWarunkiem))) &&
    jestTekstemLubNull(x.waznaDo) && jestTekstemLubNull(x.wyslana) && typeof x.nieaktualna === 'boolean'
}

/** @param {unknown} x */
function jestCzescia(x) {
  return jestObiektem(x) && jestObiektem(x.klient) && typeof x.klient.nazwa === 'string' && typeof x.klient.adres === 'string' &&
    jestTekstemLubNull(x.klient.termin) && jestObiektem(x.wejscie) && typeof x.wejscie.uslugaId === 'string' &&
    (x.szybka === null || (jestObiektem(x.szybka) && typeof x.szybka.stan === 'string' && typeof x.szybka.tryb === 'string' &&
      jestLiczba(x.szybka.od) && jestLiczba(x.szybka.do))) && jestObiektem(x.odpowiedzi)
}

/** Ksztalt wyceny z pliku; poza szkicem wycena ma numer i wynik (tak nadaje je wyceny.js). @param {unknown} x */
function jestWycena(x) {
  return jestObiektem(x) && typeof x.id === 'string' && x.id !== '' && jestTekstemLubNull(x.numer) && jestData(x.utworzona) &&
    jestData(x.zmieniona) && STATUSY_WYCENY.some((s) => s === x.status) && RODZAJE_WYCENY.includes(String(x.rodzaj)) &&
    jestCzescia(x) && jestWynikiem(x.wynik) && (x.cenaReczna === null || jestLiczba(x.cenaReczna)) &&
    Array.isArray(x.wykonania) && x.wykonania.every(jestWykonaniem) && jestOferta(x.oferta) &&
    (x.status === 'szkic' || (x.numer !== null && x.wynik !== null))
}

/** @param {Wycena[]} wyceny */
const maUnikalneId = (wyceny) => new Set(wyceny.map((w) => w.id)).size === wyceny.length

/** @param {unknown} teraz @returns {Date} */
function sprawdzDate(teraz) {
  if (!(teraz instanceof Date) || Number.isNaN(teraz.getTime())) throw new BladKopii('data', 'Data musi być poprawnym obiektem Date')
  return teraz
}

/** Dzien RRRR-MM-DD w czasie lokalnym (jak numeracja wycen). @param {Date} data */
const dzienLokalny = (data) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

/** @param {Magazyn} magazyn @returns {Stan} */
function stanMagazynu(magazyn) {
  const wynik = magazyn.wczytaj()
  if (!('stan' in wynik)) throw new BladMagazynu(wynik.blad, 'Zapisanych danych nie da się odczytać')
  return wynik.stan
}

/**
 * Plik kopii z calym stanem: `{ aplikacja, wersjaSchematu, utworzona, stan }`.
 * @param {Stan} stan @param {Date} teraz
 * @returns {PlikKopii}
 */
export function utworzKopie(stan, teraz) {
  sprawdzDate(teraz)
  const wynik = zaktualizujStan(stan)
  if (!('stan' in wynik)) throw new BladKopii(wynik.blad, 'Stanu do kopii nie da się odczytać')
  const tresc = JSON.stringify({ aplikacja: NAZWA_APLIKACJI, wersjaSchematu: WERSJA_SCHEMATU, utworzona: teraz.toISOString(), stan: wynik.stan })
  return { nazwaPliku: `wyceny-kopia-${dzienLokalny(teraz)}.json`, tresc }
}

/**
 * Zapis daty ostatniej kopii; `zmianaOd` zostaje, bo kopia nie zmienia danych.
 * @param {Magazyn} magazyn @param {Date} teraz
 * @returns {Stan}
 */
export function oznaczKopie(magazyn, teraz) {
  sprawdzDate(teraz)
  const stan = stanMagazynu(magazyn)
  const oznaczony = { ...stan, kopia: { ...stan.kopia, ostatnia: teraz.toISOString() } }
  magazyn.zapiszCalosc(oznaczony)
  return oznaczony
}

/** @param {string} tekst @returns {unknown} */
function parsujPlik(tekst) {
  try {
    return JSON.parse(tekst)
  } catch (blad) {
    if (blad instanceof SyntaxError) throw new BladKopii('zly_plik', 'Plik nie jest JSON-em', { cause: blad })
    throw blad
  }
}

/**
 * Tresc pliku kopii → stan biezacej wersji schematu (starsza wersja przechodzi przez aktualizacje z magazynu).
 * @param {unknown} tekst
 * @returns {{ stan: Stan }}
 */
export function odczytajKopie(tekst) {
  if (typeof tekst !== 'string') throw new BladKopii('zly_plik', 'Kopia musi być tekstem')
  const plik = parsujPlik(tekst)
  if (!jestObiektem(plik) || plik.aplikacja !== NAZWA_APLIKACJI) throw new BladKopii('zly_plik', 'To nie jest kopia tej aplikacji')
  const wersja = plik.wersjaSchematu
  if (!Number.isInteger(wersja) || Number(wersja) < 1) throw new BladKopii('zly_plik', 'Kopia bez wersji schematu')
  if (Number(wersja) > WERSJA_SCHEMATU) throw new BladKopii('nowsza_wersja', 'Kopia z nowszej wersji aplikacji')
  const surowy = plik.stan
  if (!jestObiektem(surowy) || !Array.isArray(surowy.wyceny)) throw new BladKopii('zly_plik', 'Kopia bez listy wycen')
  if (surowy.wersja !== wersja || surowy.wyceny.length > MAKS_WYCEN || !maKrotkieTeksty(surowy)) {
    throw new BladKopii('uszkodzony', 'Kopia ma niezgodną wersję, za dużo wycen albo za długi tekst')
  }
  const wynik = zaktualizujStan(surowy)
  if (!('stan' in wynik)) throw new BladKopii(wynik.blad, 'Stan w kopii ma zły kształt')
  if (!wynik.stan.wyceny.every(jestWycena) || !maUnikalneId(wynik.stan.wyceny)) throw new BladKopii('uszkodzony', 'Wyceny w kopii mają zły kształt')
  return { stan: wynik.stan }
}

/** @param {Record<string, number>} lokalny @param {Record<string, number>} zPliku @returns {Record<string, number>} */
function maksimumLicznikow(lokalny, zPliku) {
  const miesiace = new Map(Object.entries(lokalny))
  for (const [miesiac, n] of Object.entries(zPliku)) miesiace.set(miesiac, Math.max(miesiace.get(miesiac) ?? 0, n))
  return Object.fromEntries(miesiace)
}

/** Wyceny po `id` (wygrywa pozniejsza `zmieniona`, przy rownej lokalna), ustawienia lokalne, licznik numerow = maksimum. @param {Stan} lokalny @param {Stan} zPliku @returns {Stan} */
function polaczStany(lokalny, zPliku) {
  const zPlikuPoId = new Map(zPliku.wyceny.map((w) => [w.id, w]))
  const wyceny = lokalny.wyceny.map((w) => {
    const zPlikuWycena = zPlikuPoId.get(w.id)
    return zPlikuWycena && Date.parse(zPlikuWycena.zmieniona) > Date.parse(w.zmieniona) ? zPlikuWycena : w
  })
  const lokalneId = new Set(lokalny.wyceny.map((w) => w.id))
  const nowe = zPliku.wyceny.filter((w) => !lokalneId.has(w.id))
  return { ...lokalny, ustawienia: lokalny.ustawienia ?? zPliku.ustawienia, wyceny: [...wyceny, ...nowe],
    licznikNumerow: maksimumLicznikow(lokalny.licznikNumerow, zPliku.licznikNumerow) }
}

/**
 * Wczytanie stanu z pliku (wynik odczytajKopie): `zastap` bierze caly stan z pliku, `polacz` laczy go z zapisanym.
 * @param {Magazyn} magazyn @param {Stan} stanZPliku @param {TrybWczytania} tryb
 * @returns {Stan}
 */
export function wczytajKopie(magazyn, stanZPliku, tryb) {
  if (tryb !== 'polacz' && tryb !== 'zastap') throw new BladKopii('tryb', `Nieznany tryb wczytania kopii: ${tryb}`)
  const nowy = tryb === 'zastap' ? stanZPliku : polaczStany(stanMagazynu(magazyn), stanZPliku)
  magazyn.zapiszCalosc(nowy)
  return nowy
}

/** Dni kalendarzowe (czas lokalny) od `od` do `dzis`. @param {Date} od @param {Date} dzis */
function dniKalendarzowe(od, dzis) {
  /** @param {Date} d */
  const polnoc = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((polnoc(dzis) - polnoc(od)) / MS_DOBY)
}

/**
 * Dni od ostatniej kopii do tekstu banera; null, gdy kopii nie bylo.
 * @param {Pick<Stan, 'kopia'>} stan @param {Date} dzis
 * @returns {number | null}
 */
export function dniOdKopii(stan, dzis) {
  sprawdzDate(dzis)
  return stan.kopia.ostatnia === null ? null : dniKalendarzowe(new Date(stan.kopia.ostatnia), dzis)
}

/**
 * Przypomnienie o kopii: sa wyceny poza szkicem i (od kopii minelo N dni, a dane zmienily sie po niej) albo (kopii nie bylo,
 * a najstarsza zapisana wycena ma N dni); N = ustawienia.przypomnienieKopiiDni.
 * @param {Pick<Stan, 'kopia' | 'wyceny' | 'ustawienia'>} stan @param {Date} dzis
 * @returns {boolean}
 */
export function czyPrzypomniecOKopii(stan, dzis) {
  sprawdzDate(dzis)
  const zapisane = stan.wyceny.filter((w) => w.status !== 'szkic')
  if (zapisane.length === 0) return false
  const prog = stan.ustawienia?.przypomnienieKopiiDni ?? DNI_PRZYPOMNIENIA_KOPII[0]
  const { ostatnia, zmianaOd } = stan.kopia
  if (ostatnia === null) {
    const najstarsza = zapisane.reduce((min, w) => Math.min(min, Date.parse(w.utworzona)), Infinity)
    return dniKalendarzowe(new Date(najstarsza), dzis) >= prog
  }
  const czyZmianaPoKopii = zmianaOd !== null && Date.parse(zmianaOd) > Date.parse(ostatnia)
  return czyZmianaPoKopii && dniKalendarzowe(new Date(ostatnia), dzis) >= prog
}

/**
 * Chipy na ekranie kopii: liczba wycen, liczba wykonan i czy sa ustawienia.
 * @param {Pick<Stan, 'wyceny' | 'ustawienia'>} stan
 * @returns {PodsumowanieKopii}
 */
export function podsumowanieKopii(stan) {
  return {
    wycen: stan.wyceny.length,
    wykonan: stan.wyceny.reduce((suma, w) => suma + w.wykonania.length, 0),
    czyUstawienia: stan.ustawienia !== null,
  }
}
