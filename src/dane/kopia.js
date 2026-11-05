// Kopia zapasowa (R23, R24): plik JSON z calym stanem (ustawienia, wyceny, klienci, zlecenia), odczyt pliku z walidacja jak
// dane z zewnatrz (ten sam straznik stanu i te same limity co magazyn), wczytanie trybem „polacz” albo „zastap” i regula
// przypomnienia o kopii. Plik z wersji 1 przechodzi przez migracje magazynu. Bez DOM: pobranie i odczyt pliku robi widok kopii.

import { MAKS_KLIENTOW } from './klienci.js'
import { dzienLokalny, jestData, jestObiektem, maKrotkieTeksty } from './ksztalt.js'
import { WERSJA_SCHEMATU, wczytajStan, zaktualizujStan } from './magazyn.js'
import { BladUstawien, DNI_PRZYPOMNIENIA_KOPII, sprawdzUstawienia } from './ustawienia.js'
import { jestWycena, MAKS_WYCEN, nieaktualnaPoWyslaniu } from './wyceny.js'
import { MAKS_ZLECEN } from './zlecenia-ksztalt.js'

/** @typedef {import('./magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./magazyn.js').Stan} Stan */
/** @typedef {import('./wyceny.js').Wycena} Wycena */
/**
 * @typedef {'polacz' | 'zastap'} TrybWczytania
 * @typedef {{ nazwaPliku: string, tresc: string }} PlikKopii
 * @typedef {{ wycen: number, klientow: number, zlecen: number, czyUstawienia: boolean }} PodsumowanieKopii
 */

const NAZWA_APLIKACJI = 'wyceny-sprzatanie'
/** Najwiekszy licznik numerow w miesiacu; wiecej znaczy plik spoza aplikacji. */
const MAKS_LICZNIKA_NUMEROW = 100_000
const MS_DOBY = 86_400_000

/**
 * Bledny plik kopii albo argument: `zly_plik`, `nowsza_wersja`, `uszkodzony` (takze stan, ktorego kopia nie dalaby sie wczytac),
 * `za_duzo_wycen` (polaczenie przekroczyloby limit), `za_duzo_klientow` i `za_duzo_zlecen` (plik, stan do kopii albo polaczenie
 * ponad MAKS_KLIENTOW / MAKS_ZLECEN), `tryb`, `data`.
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
 * Limity klientow i zlecen z modulow, ktore pilnuja ich przy zapisie. Sprawdza tez surowy plik przed migracja i straznikami
 * rekordow, zeby za dlugiej listy nie przegladac rekord po rekordzie.
 * @param {Record<string, unknown>} stan
 */
function sprawdzLimityRekordow(stan) {
  if (Array.isArray(stan.klienci) && stan.klienci.length > MAKS_KLIENTOW) {
    throw new BladKopii('za_duzo_klientow', `Kopia ma ponad ${MAKS_KLIENTOW} klientów`)
  }
  if (Array.isArray(stan.zlecenia) && stan.zlecenia.length > MAKS_ZLECEN) {
    throw new BladKopii('za_duzo_zlecen', `Kopia ma ponad ${MAKS_ZLECEN} zleceń`)
  }
}

/**
 * Jedna kontrola stanu dla eksportu, odczytu i wczytania kopii, zeby aplikacja nie zapisala kopii, ktorej potem nie wczyta.
 * Ksztalt klientow i zlecen oraz spojnosc odwolan sprawdzil juz jestStanem magazynu (przez zaktualizujStan).
 * @param {Stan} stan
 */
function sprawdzStanKopii(stan) {
  if (stan.wyceny.length > MAKS_WYCEN || !maKrotkieTeksty(stan)) throw new BladKopii('uszkodzony', 'Za dużo wycen albo za długi tekst')
  sprawdzLimityRekordow(stan)
  if (!stan.wyceny.every(jestWycena) || !maUnikalneId(stan.wyceny)) throw new BladKopii('uszkodzony', 'Wyceny mają zły kształt')
  if (Object.values(stan.licznikNumerow).some((n) => n > MAKS_LICZNIKA_NUMEROW)) throw new BladKopii('uszkodzony', 'Za duży licznik numerów')
  sprawdzUstawieniaKopii(stan.ustawienia)
}

/**
 * Dane (plik, magazyn albo wynik polaczenia) → stan biezacej wersji, ktory przeszedl straznik stanu magazynu (jestStanem:
 * ksztalt rekordow, unikalne id, spojnosc odwolan) i kontrole kopii.
 * @param {unknown} dane @param {string} komunikat opis bledu, gdy straznik magazynu odrzuci stan
 * @returns {Stan}
 */
function stanKopii(dane, komunikat) {
  const wynik = zaktualizujStan(dane)
  if (!('stan' in wynik)) throw new BladKopii(wynik.blad, komunikat)
  sprawdzStanKopii(wynik.stan)
  return wynik.stan
}

/**
 * Straznik daty warstwy danych kopii: rzuca BladKopii('data'), bo wywolujacy kopii lapia tylko BladKopii. Wspolny jest
 * predykat jestData (src/dane/ksztalt.js); sprawdzDate z src/ui/format.js rzuca BladFormatu i sluzy widokom.
 * @param {unknown} teraz @returns {Date}
 */
function sprawdzDateKopii(teraz) {
  if (!jestData(teraz)) throw new BladKopii('data', 'Data musi być poprawnym obiektem Date')
  return teraz
}

/**
 * Plik kopii z calym stanem: `{ aplikacja, wersjaSchematu, utworzona, stan }`. Stan, ktorego odczytajKopie by nie przyjela,
 * daje BladKopii zamiast pliku.
 * @param {Stan} stan @param {Date} teraz
 * @returns {PlikKopii}
 */
export function utworzKopie(stan, teraz) {
  sprawdzDateKopii(teraz)
  const doKopii = stanKopii(stan, 'Stanu do kopii nie da się odczytać')
  const tresc = JSON.stringify({ aplikacja: NAZWA_APLIKACJI, wersjaSchematu: WERSJA_SCHEMATU, utworzona: teraz.toISOString(), stan: doKopii })
  return { nazwaPliku: `wyceny-kopia-${dzienLokalny(teraz)}.json`, tresc }
}

/**
 * Zapis daty ostatniej kopii; `zmianaOd` zostaje, bo kopia nie zmienia danych.
 * @param {Magazyn} magazyn @param {Date} teraz
 * @returns {Stan}
 */
export function oznaczKopie(magazyn, teraz) {
  sprawdzDateKopii(teraz)
  const stan = wczytajStan(magazyn)
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
 * Tresc pliku kopii → stan biezacej wersji schematu: plik z wersji 1 przechodzi przez te sama migracje co dane magazynu
 * (klienci z nazw wycen, zlecenia z przyjetych i wykonanych), plik z wersji 2 tylko przez straznik stanu i kontrole kopii.
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
  sprawdzLimityRekordow(surowy)
  return { stan: stanKopii(surowy, 'Stan w kopii ma zły kształt') }
}

/** @param {Record<string, number>} lokalny @param {Record<string, number>} zPliku @returns {Record<string, number>} */
function maksimumLicznikow(lokalny, zPliku) {
  const miesiace = new Map(Object.entries(lokalny))
  for (const [miesiac, n] of Object.entries(zPliku)) miesiace.set(miesiac, Math.max(miesiace.get(miesiac) ?? 0, n))
  return Object.fromEntries(miesiace)
}

/** Wycena z numerem z tego urzadzenia; wyslana oferta z innym numerem staje sie nieaktualna. @param {Wycena} w @param {string} numer */
const zNumeremUrzadzenia = (w, numer) => (w.numer === numer ? w : { ...w, numer, oferta: nieaktualnaPoWyslaniu(w) })

/**
 * Wyceny z pliku z numerem zajetym przez wycene lokalna (dwa urzadzenia nadaly ten sam numer) dostaja kolejny numer swojego
 * miesiaca z polaczonego licznika; licznik rosnie o nadane numery, a wyslana oferta z nowym numerem staje sie nieaktualna.
 * @param {Wycena[]} wyceny po polaczeniu @param {Set<Wycena>} lokalne wyceny z numerem z tego urzadzenia (bez zmian)
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
    return zNumeremUrzadzenia(w, numer)
  })
  return { wyceny: poNumeracji, licznikNumerow }
}

/**
 * Rekordy po `id`: lokalne w swojej kolejnosci, a wersja z pliku zastepuje lokalna, gdy zmieniono ja pozniej (przy rownej
 * dacie zostaje lokalna); rekordy tylko z pliku dochodza na koncu. Rekord laczy sie w calosci (zlecenie razem z wizytami),
 * a rekord usuniety lokalnie wraca z pliku, bo kopia nie ma sladow usuniec.
 * @template {{ id: string }} T
 * @param {readonly T[]} lokalne @param {readonly T[]} zPliku @param {(rekord: T) => string} zmiana data ostatniej zmiany (ISO)
 * @returns {T[]}
 */
function polaczPoId(lokalne, zPliku, zmiana) {
  const zPlikuPoId = new Map(zPliku.map((r) => [r.id, r]))
  const lokalneId = new Set(lokalne.map((r) => r.id))
  const polaczone = lokalne.map((r) => {
    const zPlikuRekord = zPlikuPoId.get(r.id)
    return zPlikuRekord && Date.parse(zmiana(zPlikuRekord)) > Date.parse(zmiana(r)) ? zPlikuRekord : r
  })
  return [...polaczone, ...zPliku.filter((r) => !lokalneId.has(r.id))]
}

/**
 * Wyceny po `id` (wygrywa pozniejsza `zmieniona`, przy rownej lokalna), klienci i zlecenia tak samo wg `zmieniony` /
 * `zmienione` (polaczPoId), ustawienia lokalne, licznik numerow = maksimum. Wynik jest suma id, wiec odwolania zlecen
 * i wycen z obu stanow wskazuja istniejace rekordy.
 * Numer nadany juz na tym urzadzeniu zostaje, takze gdy wygrywa wersja z pliku (kolejne polaczenia nie zmieniaja numeru);
 * numer zajety lokalnie dostaje wycena z pliku nowy.
 * @param {Stan} lokalny @param {Stan} zPliku @returns {Stan}
 */
function polaczStany(lokalny, zPliku) {
  const zPlikuPoId = new Map(zPliku.wyceny.map((w) => [w.id, w]))
  const wyceny = lokalny.wyceny.map((w) => {
    const zPlikuWycena = zPlikuPoId.get(w.id)
    if (!zPlikuWycena || Date.parse(zPlikuWycena.zmieniona) <= Date.parse(w.zmieniona)) return w
    return w.numer === null ? zPlikuWycena : zNumeremUrzadzenia(zPlikuWycena, w.numer)
  })
  const lokalneId = new Set(lokalny.wyceny.map((w) => w.id))
  const nowe = zPliku.wyceny.filter((w) => !lokalneId.has(w.id))
  const zNumeremLokalnym = new Set(wyceny.filter((w, i) => w.numer === lokalny.wyceny[i].numer))
  const polaczone = bezPowtorzonychNumerow([...wyceny, ...nowe], zNumeremLokalnym,
    maksimumLicznikow(lokalny.licznikNumerow, zPliku.licznikNumerow))
  return {
    ...lokalny,
    ustawienia: lokalny.ustawienia ?? zPliku.ustawienia,
    ...polaczone,
    klienci: polaczPoId(lokalny.klienci, zPliku.klienci, (k) => k.zmieniony),
    zlecenia: polaczPoId(lokalny.zlecenia, zPliku.zlecenia, (z) => z.zmienione),
  }
}

/**
 * Wczytanie stanu z pliku (wynik odczytajKopie): `zastap` bierze caly stan z pliku, `polacz` laczy go z zapisanym. Wynik
 * przechodzi te sama kontrole co plik kopii (limity, straznik stanu magazynu), zanim trafi do magazynu.
 * @param {Magazyn} magazyn @param {Stan} stanZPliku @param {TrybWczytania} tryb
 * @returns {Stan}
 */
export function wczytajKopie(magazyn, stanZPliku, tryb) {
  if (tryb !== 'polacz' && tryb !== 'zastap') throw new BladKopii('tryb', `Nieznany tryb wczytania kopii: ${tryb}`)
  const nowy = tryb === 'zastap' ? stanZPliku : polaczStany(wczytajStan(magazyn), stanZPliku)
  if (nowy.wyceny.length > MAKS_WYCEN) throw new BladKopii('za_duzo_wycen', `Po połączeniu byłoby ponad ${MAKS_WYCEN} wycen`)
  const sprawdzony = stanKopii(nowy, 'Stan po wczytaniu kopii ma zły kształt')
  magazyn.zapiszCalosc(sprawdzony)
  return sprawdzony
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
  sprawdzDateKopii(dzis)
  return stan.kopia.ostatnia === null ? null : dniKalendarzowe(new Date(stan.kopia.ostatnia), dzis)
}

/**
 * Daty utworzenia danych, ktore warto miec w kopii: wyceny poza szkicem, klienci i zlecenia.
 * @param {Pick<Stan, 'wyceny' | 'klienci' | 'zlecenia'>} stan @returns {string[]}
 */
const datyZapisanychDanych = (stan) => [
  ...stan.wyceny.filter((w) => w.status !== 'szkic').map((w) => w.utworzona),
  ...stan.klienci.map((k) => k.utworzony),
  ...stan.zlecenia.map((z) => z.utworzone),
]

/**
 * Przypomnienie o kopii: sa wyceny poza szkicem, klienci albo zlecenia i (od kopii minelo N dni, a dane zmienily sie po niej)
 * albo (kopii nie bylo, a najstarszy z tych rekordow ma N dni); N = ustawienia.przypomnienieKopiiDni.
 * @param {Pick<Stan, 'kopia' | 'wyceny' | 'klienci' | 'zlecenia' | 'ustawienia'>} stan @param {Date} dzis
 * @returns {boolean}
 */
export function czyPrzypomniecOKopii(stan, dzis) {
  sprawdzDateKopii(dzis)
  const utworzenia = datyZapisanychDanych(stan)
  if (utworzenia.length === 0) return false
  const prog = stan.ustawienia?.przypomnienieKopiiDni ?? DNI_PRZYPOMNIENIA_KOPII[0]
  const { ostatnia, zmianaOd } = stan.kopia
  if (ostatnia === null) {
    const najstarsza = utworzenia.reduce((min, data) => Math.min(min, Date.parse(data)), Infinity)
    return dniKalendarzowe(new Date(najstarsza), dzis) >= prog
  }
  const czyZmianaPoKopii = zmianaOd !== null && Date.parse(zmianaOd) > Date.parse(ostatnia)
  return czyZmianaPoKopii && dniKalendarzowe(new Date(ostatnia), dzis) >= prog
}

/**
 * Chipy na ekranie kopii: liczba wycen, klientow i zlecen oraz czy sa ustawienia.
 * @param {Pick<Stan, 'wyceny' | 'klienci' | 'zlecenia' | 'ustawienia'>} stan
 * @returns {PodsumowanieKopii}
 */
export function podsumowanieKopii(stan) {
  return {
    wycen: stan.wyceny.length,
    klientow: stan.klienci.length,
    zlecen: stan.zlecenia.length,
    czyUstawienia: stan.ustawienia !== null,
  }
}
