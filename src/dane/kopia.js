// Kopia zapasowa (R23): plik JSON z calym stanem, odczyt pliku z walidacja jak dane z zewnatrz, wczytanie trybem „polacz”
// albo „zastap” i regula przypomnienia o kopii. Bez DOM: pobranie i odczyt pliku robi widok kopii.

import { jestObiektem, maKrotkieTeksty } from './ksztalt.js'
import { BladMagazynu, WERSJA_SCHEMATU, zaktualizujStan } from './magazyn.js'
import { BladUstawien, DNI_PRZYPOMNIENIA_KOPII, sprawdzUstawienia } from './ustawienia.js'
import { jestWycena, MAKS_WYCEN } from './wyceny.js'

/** @typedef {import('./magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./magazyn.js').Stan} Stan */
/** @typedef {import('./wyceny.js').Wycena} Wycena */
/**
 * @typedef {'polacz' | 'zastap'} TrybWczytania
 * @typedef {{ nazwaPliku: string, tresc: string }} PlikKopii
 * @typedef {{ wycen: number, wykonan: number, czyUstawienia: boolean }} PodsumowanieKopii
 */

const NAZWA_APLIKACJI = 'wyceny-sprzatanie'
/** Najwiekszy licznik numerow w miesiacu; wiecej znaczy plik spoza aplikacji. */
const MAKS_LICZNIKA_NUMEROW = 100_000
const MS_DOBY = 86_400_000

/**
 * Bledny plik kopii albo argument: `zly_plik`, `nowsza_wersja`, `uszkodzony` (takze stan, ktorego kopia nie dalaby sie wczytac),
 * `za_duzo_wycen` (polaczenie przekroczyloby limit), `tryb`, `data`.
 */
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

/** @param {Wycena[]} wyceny */
const maUnikalneId = (wyceny) => new Set(wyceny.map((w) => w.id)).size === wyceny.length

/** Ustawienia z kopii przechodza te same reguly wartosci co zapis w ustawieniach. @param {Stan['ustawienia']} ustawienia */
function sprawdzUstawieniaKopii(ustawienia) {
  if (ustawienia === null) return
  try {
    sprawdzUstawienia(ustawienia)
  } catch (blad) {
    if (blad instanceof BladUstawien) throw new BladKopii('uszkodzony', `Ustawienia w kopii: ${blad.pole} (${blad.kod})`, { cause: blad })
    throw blad
  }
}

/**
 * Jedna kontrola stanu dla eksportu i odczytu kopii, zeby aplikacja nie zapisala kopii, ktorej potem nie wczyta.
 * @param {Stan} stan
 */
function sprawdzStanKopii(stan) {
  if (stan.wyceny.length > MAKS_WYCEN || !maKrotkieTeksty(stan)) throw new BladKopii('uszkodzony', 'Za dużo wycen albo za długi tekst')
  if (!stan.wyceny.every(jestWycena) || !maUnikalneId(stan.wyceny)) throw new BladKopii('uszkodzony', 'Wyceny mają zły kształt')
  if (Object.values(stan.licznikNumerow).some((n) => n > MAKS_LICZNIKA_NUMEROW)) throw new BladKopii('uszkodzony', 'Za duży licznik numerów')
  sprawdzUstawieniaKopii(stan.ustawienia)
}

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
 * Plik kopii z calym stanem: `{ aplikacja, wersjaSchematu, utworzona, stan }`. Stan, ktorego odczytajKopie by nie przyjela,
 * daje BladKopii zamiast pliku.
 * @param {Stan} stan @param {Date} teraz
 * @returns {PlikKopii}
 */
export function utworzKopie(stan, teraz) {
  sprawdzDate(teraz)
  const wynik = zaktualizujStan(stan)
  if (!('stan' in wynik)) throw new BladKopii(wynik.blad, 'Stanu do kopii nie da się odczytać')
  sprawdzStanKopii(wynik.stan)
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
  sprawdzStanKopii(wynik.stan)
  return { stan: wynik.stan }
}

/** @param {Record<string, number>} lokalny @param {Record<string, number>} zPliku @returns {Record<string, number>} */
function maksimumLicznikow(lokalny, zPliku) {
  const miesiace = new Map(Object.entries(lokalny))
  for (const [miesiac, n] of Object.entries(zPliku)) miesiace.set(miesiac, Math.max(miesiace.get(miesiac) ?? 0, n))
  return Object.fromEntries(miesiace)
}

/**
 * Wyceny z pliku z numerem zajetym przez wycene lokalna (dwa urzadzenia nadaly ten sam numer) dostaja kolejny numer swojego
 * miesiaca z polaczonego licznika; licznik rosnie o nadane numery.
 * @param {Wycena[]} wyceny po polaczeniu @param {Set<Wycena>} lokalne wyceny, ktore zostaly z magazynu
 * @param {Record<string, number>} licznik @returns {{ wyceny: Wycena[], licznikNumerow: Record<string, number> }}
 */
function bezPowtorzonychNumerow(wyceny, lokalne, licznik) {
  const zajete = new Set(wyceny.filter((w) => lokalne.has(w)).map((w) => w.numer))
  const licznikNumerow = { ...licznik }
  const poNumeracji = wyceny.map((w) => {
    if (lokalne.has(w) || w.numer === null) return w
    if (!zajete.has(w.numer)) {
      zajete.add(w.numer)
      return w
    }
    const [, miesiac, rok] = w.numer.split('/')
    const klucz = `${rok}-${miesiac}`
    let numer = w.numer
    while (zajete.has(numer)) {
      licznikNumerow[klucz] = (licznikNumerow[klucz] ?? 0) + 1
      numer = `${licznikNumerow[klucz]}/${miesiac}/${rok}`
    }
    zajete.add(numer)
    return { ...w, numer }
  })
  return { wyceny: poNumeracji, licznikNumerow }
}

/**
 * Wyceny po `id` (wygrywa pozniejsza `zmieniona`, przy rownej lokalna), ustawienia lokalne, licznik numerow = maksimum,
 * numer zajety lokalnie dostaje wycena z pliku nowy.
 * @param {Stan} lokalny @param {Stan} zPliku @returns {Stan}
 */
function polaczStany(lokalny, zPliku) {
  const zPlikuPoId = new Map(zPliku.wyceny.map((w) => [w.id, w]))
  const wyceny = lokalny.wyceny.map((w) => {
    const zPlikuWycena = zPlikuPoId.get(w.id)
    return zPlikuWycena && Date.parse(zPlikuWycena.zmieniona) > Date.parse(w.zmieniona) ? zPlikuWycena : w
  })
  const lokalneId = new Set(lokalny.wyceny.map((w) => w.id))
  const nowe = zPliku.wyceny.filter((w) => !lokalneId.has(w.id))
  const polaczone = bezPowtorzonychNumerow([...wyceny, ...nowe], new Set(lokalny.wyceny),
    maksimumLicznikow(lokalny.licznikNumerow, zPliku.licznikNumerow))
  return { ...lokalny, ustawienia: lokalny.ustawienia ?? zPliku.ustawienia, ...polaczone }
}

/**
 * Wczytanie stanu z pliku (wynik odczytajKopie): `zastap` bierze caly stan z pliku, `polacz` laczy go z zapisanym.
 * @param {Magazyn} magazyn @param {Stan} stanZPliku @param {TrybWczytania} tryb
 * @returns {Stan}
 */
export function wczytajKopie(magazyn, stanZPliku, tryb) {
  if (tryb !== 'polacz' && tryb !== 'zastap') throw new BladKopii('tryb', `Nieznany tryb wczytania kopii: ${tryb}`)
  const nowy = tryb === 'zastap' ? stanZPliku : polaczStany(stanMagazynu(magazyn), stanZPliku)
  if (nowy.wyceny.length > MAKS_WYCEN) throw new BladKopii('za_duzo_wycen', `Po połączeniu byłoby ponad ${MAKS_WYCEN} wycen`)
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
