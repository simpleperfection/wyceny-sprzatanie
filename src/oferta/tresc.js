// Tresc oferty dla klienta z zapisanej wyceny (R18–R21): gotowe kwoty dla klienta i teksty z bialej listy pol, bez kosztow firmy,
// tempa, czasu i „zostaje” (R21). Zakres: oferta → zakres wariantu z danych → ustawienia → zakres uslugi; warunki: oferta →
// ustawienia → dane domyslne (warunkiZrodlowe), z regula R20 w widoczneWarunki. Waznosc do konca dnia waznaDo.
// Czyste funkcje bez DOM i magazynu: ustawienia podaje wywolujacy (stan magazynu), dane referencyjne z data/*.json.

import { dzienLokalny, GRANICE_OFERTY, jestData, jestDniem, jestListaPunktow, jestObiektem, maWartosci } from '../dane/ksztalt.js'
import { czyAbonament } from '../dane/wyceny.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { TRYBY_SZYBKIEJ } from '../silnik/szybka.js'
import { cenaDlaKlienta, zCenyRecznej } from '../silnik/vat.js'
import { tekstIlosci, terminKlienta } from '../ui/format.js'

/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').MigawkaWyniku} MigawkaWyniku */
/** @typedef {import('../dane/magazyn.js').Ustawienia} Ustawienia */
/** @typedef {import('../dane/magazyn.js').WarunekOferty} WarunekOferty */
/** @typedef {import('../dane/magazyn.js').ZakresUslugi} ZakresUslugi */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/cena.js').LiniaWyceny} LiniaWyceny */
/** @typedef {import('../silnik/vat.js').StatusVat} StatusVat */
/**
 * @typedef {ZakresUslugi & { warianty?: Record<string, ZakresUslugi> }} ZakresDomyslny
 * @typedef {{ meta?: unknown, uslugi: Record<string, ZakresDomyslny> }} Zakresy data/zakresy.json
 * @typedef {{ katalog: Katalog, domyslne: Domyslne, zakresy: Zakresy, ustawienia: Ustawienia | null }} KontekstOferty
 * @typedef {{ opis: string, kwota: number }} LiniaOferty
 * @typedef {{ od: number, do: number }} KwotyOferty
 * @typedef {typeof TRYBY_CENY[number]} TrybCeny `stala` (dokladna wycena albo cena reczna) albo tryb szybkiej wyceny
 * @typedef {{ v: 1, firma: { nazwa: string, telefon: string, email: string, nip: string }, numer: string, data: string, waznaDo: string,
 *   klient: { nazwa: string, adres: string, termin: string | null }, uslugi: LiniaOferty[], dojazd: number, razem: KwotyOferty,
 *   trybCeny: TrybCeny, abonament: { wizyt: number, miesiecznie: KwotyOferty } | null,
 *   vat: { status: StatusVat, stawka: number, netto: number | null, kwotaVat: number | null }, dodatkiOpcjonalne: LiniaOferty[],
 *   zakres: ZakresUslugi, warunki: string[], szybka: boolean }} Oferta kwoty dla klienta (brutto) w zl; daty RRRR-MM-DD;
 *   termin klienta po polsku („14 listopada 2026, 9:00”); vat.netto i vat.kwotaVat null przy widelkach i „od” szybkiej wyceny;
 *   przy abonamencie `razem` to kwota za wizyte, a `miesiecznie` = razem × wizyt w miesiacu
 * @typedef {{ id: string, tekst: string }} PunktWarunku warunek z edytora listy (kolejnosc i tresc)
 */

/** Tryby kwoty „Razem” w ofercie: sztywna kwota i tryby szybkiej wyceny (src/silnik/szybka.js); zrodlo listy dla dekodera linku. */
export const TRYBY_CENY = Object.freeze(/** @type {const} */ (['stala', ...TRYBY_SZYBKIEJ]))
const PLIK_ZAKRESOW = 'data/zakresy.json'
const WERSJA_OFERTY = 1
const WIELOKROPEK = '…'
const PUSTA_FIRMA = Object.freeze({ nazwa: '', telefon: '', email: '', nip: '' })

/** Wycena bez numeru albo bez policzonej ceny: oferty z niej nie da sie przygotowac. */
export class BladOferty extends Error {
  /** @param {string} kod @param {string} [komunikat] */
  constructor(kod, komunikat = kod) {
    super(komunikat)
    this.name = 'BladOferty'
    this.kod = kod
  }
}

/** @param {string} tekst @returns {string} tekst przyciety do GRANICE_OFERTY.tekst znakow (opis z danych) */
const wGranicy = (tekst) => (tekst.length <= GRANICE_OFERTY.tekst ? tekst : `${tekst.slice(0, GRANICE_OFERTY.tekst - 1)}${WIELOKROPEK}`)

/** @param {unknown} x @returns {x is ZakresUslugi} */
const jestZakresemDomyslnym = (x) => jestObiektem(x) && jestListaPunktow(x.wchodzi) && jestListaPunktow(x.nie_wchodzi)
/** @param {unknown} zakres @returns {boolean} punkty w granicach oferty i co najmniej jeden punkt „wchodzi” */
const jestPelnymZakresem = (zakres) => jestZakresemDomyslnym(zakres) && zakres.wchodzi.length > 0

/**
 * Straznik ksztaltu data/zakresy.json (dane z granicy: fetch).
 * @param {unknown} x @returns {x is Zakresy}
 */
export function jestZakresami(x) {
  /** @param {unknown} wpis */
  const jestWpisem = (wpis) => jestObiektem(wpis) && (wpis.warianty === undefined || maWartosci(wpis.warianty, jestZakresemDomyslnym)) &&
    jestZakresemDomyslnym(wpis)
  return jestObiektem(x) && maWartosci(x.uslugi, jestWpisem)
}

/**
 * data/zakresy.json przez `pobierz` (fetch z limitem czasu w aplikacji, plik z dysku w testach).
 * @param {(sciezka: string) => Promise<unknown>} pobierz
 * @returns {Promise<Zakresy>} plik o zlym ksztalcie daje BladKatalogu `zly_format`
 */
export async function wczytajZakresy(pobierz) {
  const dane = await pobierz(PLIK_ZAKRESOW)
  if (!jestZakresami(dane)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIK_ZAKRESOW}`)
  return dane
}

/**
 * Kontrola tresci data/zakresy.json wobec katalogu: kazda usluga poza `tylko_dodatek` ma wpis, wpis i wariant istnieja w katalogu,
 * lista „wchodzi” nie jest pusta, punkty sa niepuste i w granicach oferty.
 * @param {Zakresy} zakresy @param {Katalog} katalog
 * @returns {string[]} bledy (pusta lista = plik zgodny)
 */
export function sprawdzZakresy(zakresy, katalog) {
  /** @type {string[]} */
  const bledy = []
  const uslugi = new Map(katalog.uslugi.map((u) => [u.id, u]))
  for (const u of katalog.uslugi) if (!u.tylko_dodatek && !Object.hasOwn(zakresy.uslugi, u.id)) bledy.push(`brak zakresu usługi ${u.id}`)
  for (const [id, wpis] of Object.entries(zakresy.uslugi)) {
    const usluga = uslugi.get(id)
    if (!usluga || usluga.tylko_dodatek) bledy.push(`zakres usługi spoza katalogu albo dodatku: ${id}`)
    if (!jestPelnymZakresem(wpis)) bledy.push(`pusty albo zły zakres ${id}`)
    for (const [wariantId, zakres] of Object.entries(wpis.warianty ?? {})) {
      if (!usluga?.warianty?.some((w) => w.id === wariantId)) bledy.push(`nieznany wariant ${id}.${wariantId}`)
      if (!jestPelnymZakresem(zakres)) bledy.push(`pusty albo zły zakres ${id}.${wariantId}`)
    }
  }
  return bledy
}

/**
 * Zakres oferty: zmieniony w tej ofercie → wlasny zakres wariantu z data/zakresy.json (R19: rodzaj sprzatania, np. jednorazowe
 * biuro) → zmieniony w ustawieniach zakres uslugi (edytor ustawien pokazuje zakres uslugi bez wariantu) → zakres uslugi z danych.
 * @param {Wycena} w @param {KontekstOferty} k @returns {ZakresUslugi}
 */
function zakresOferty(w, k) {
  const { uslugaId, wariantId } = w.wejscie
  const domyslny = k.zakresy.uslugi[uslugaId]
  const wariant = wariantId ? domyslny?.warianty?.[wariantId] : undefined
  const zakres = w.oferta.zakres ?? wariant ?? k.ustawienia?.zakresy[uslugaId] ?? domyslny ?? { wchodzi: [], nie_wchodzi: [] }
  return { wchodzi: [...zakres.wchodzi], nie_wchodzi: [...zakres.nie_wchodzi] }
}

/**
 * Warunki, z ktorych powstaje oferta: zmienione w tej ofercie → zmienione w ustawieniach → data/domyslne.json.
 * Jedno zrodlo kolejnosci dla tresci oferty, ekranu oferty i ustawien.
 * @param {readonly WarunekOferty[] | null} warunkiWyceny `wycena.oferta.warunki` (null w ustawieniach i w ofercie bez zmian)
 * @param {Pick<Ustawienia, 'warunki'> | null} ustawienia @param {Pick<Domyslne, 'oferta'>} domyslne
 * @returns {readonly WarunekOferty[]}
 */
export const warunkiZrodlowe = (warunkiWyceny, ustawienia, domyslne) => warunkiWyceny ?? ustawienia?.warunki ?? domyslne.oferta.warunki

/**
 * Warunki pokazane w ofercie (R20): `tylko_szybka` tylko w ofercie z szybkiej wyceny.
 * @param {readonly WarunekOferty[]} warunki @param {boolean} szybka @returns {WarunekOferty[]}
 */
export const widoczneWarunki = (warunki, szybka) => warunki.filter((w) => szybka || !w.tylko_szybka)

/**
 * Warunki po edycji widocznych: kolejnosc i tresc z edytora, `tylko_szybka` z poprzedniego warunku o tym id (nowy — false),
 * a ukryte w tej ofercie (R20: tylko szybka wycena) zostaja na koncu bez zmian.
 * @param {readonly WarunekOferty[]} warunki @param {readonly PunktWarunku[]} punkty @param {boolean} szybka
 * @returns {WarunekOferty[]}
 */
export function warunkiPoEdycji(warunki, punkty, szybka) {
  const poprzednie = new Map(warunki.map((w) => [w.id, w]))
  const widoczne = punkty.map((p) => ({ id: p.id, tresc: p.tekst, tylko_szybka: poprzednie.get(p.id)?.tylko_szybka ?? false }))
  return [...widoczne, ...(szybka ? [] : warunki.filter((w) => w.tylko_szybka))]
}

/** @param {Wycena} w @param {KontekstOferty} k @param {boolean} szybka @returns {string[]} tresci warunkow oferty */
const warunkiOferty = (w, k, szybka) => widoczneWarunki(warunkiZrodlowe(w.oferta.warunki, k.ustawienia, k.domyslne), szybka).map((x) => x.tresc)

/** @param {Wycena} w @param {Katalog} katalog @returns {string} np. „Mieszkanie – sprzątanie standardowe, 50 m²” */
function opisUslugi(w, katalog) {
  const { uslugaId, wariantId, pomieszczenia = [], pozycje = [] } = w.wejscie
  const usluga = katalog.usluga(uslugaId)
  const wariant = usluga.warianty?.find((v) => v.id === wariantId)
  const nazwa = wariant ? `${usluga.nazwa} – ${wariant.nazwa.toLocaleLowerCase('pl-PL')}` : usluga.nazwa
  if (usluga.tryb === 'pomieszczenia') return wGranicy(`${nazwa}, ${tekstIlosci(pomieszczenia.reduce((s, p) => s + p.m2, 0), 'm2')}`)
  const lista = pozycje.filter((p) => p.ilosc > 0).map((p) => {
    const pozycja = katalog.pozycja(uslugaId, p.id)
    return `${pozycja.nazwa} (${tekstIlosci(p.ilosc, pozycja.jednostka)})`
  })
  return wGranicy(lista.length === 0 ? nazwa : `${nazwa}: ${lista.join(', ')}`)
}

/**
 * Dodatki „w cenie” z migawki: linia `dodatek` z nastepujacymi po niej liniami materialu tego dodatku (kolejnosc z wycenUsluge).
 * @param {LiniaWyceny[]} linie @returns {{ opis: string, kwota: number }[]} kwoty modelu
 */
function dodatkiWCenie(linie) {
  /** @type {{ opis: string, kwota: number }[]} */
  const dodatki = []
  for (const linia of linie) {
    const ostatni = dodatki.at(-1)
    if (linia.rodzaj === 'dodatek') dodatki.push({ opis: wGranicy(`${linia.opis} (${tekstIlosci(linia.ilosc, linia.jednostka)})`), kwota: linia.kwota })
    else if (ostatni) ostatni.kwota += linia.kwota
  }
  return dodatki
}

/** @param {MigawkaWyniku} m @param {number} kwota @returns {number} kwota modelu jako kwota dla klienta (regula VAT migawki) */
const dlaKlienta = (m, kwota) => cenaDlaKlienta({ kwota, podstawaCeny: m.podstawaCeny, statusVat: m.statusVat, stawkaVatProc: m.stawkaVatProc }).brutto

/**
 * Razem do zaplaty, tryb kwoty i VAT: cena reczna (kwota placona przez klienta, z dojazdem), kwota szybkiej wyceny (widelki,
 * „ok.” albo „od” przy ogledzinach, bez kwot VAT przy widelkach i „od”) albo cena z migawki.
 * @param {Wycena} w @param {MigawkaWyniku} m @param {boolean} szybka
 * @returns {{ razem: KwotyOferty, trybCeny: TrybCeny, netto: number | null, kwotaVat: number | null }}
 */
function kwotyRazem(w, m, szybka) {
  if (w.cenaReczna !== null) {
    const cena = zCenyRecznej(w.cenaReczna, m.statusVat, m.stawkaVatProc)
    return { razem: { od: cena.brutto, do: cena.brutto }, trybCeny: 'stala', netto: cena.netto, kwotaVat: cena.vat }
  }
  if (szybka && w.szybka) {
    const { od, do: doKwoty, tryb } = w.szybka
    const cena = od === doKwoty && tryb !== 'od' ? zCenyRecznej(od, m.statusVat, m.stawkaVatProc) : null
    return { razem: { od, do: doKwoty }, trybCeny: tryb, netto: cena?.netto ?? null, kwotaVat: cena?.vat ?? null }
  }
  return { razem: { od: m.cena, do: m.cena }, trybCeny: 'stala', netto: m.netto, kwotaVat: m.vat }
}

/**
 * Abonament (czyAbonament): `razem` jest kwota za wizyte, miesiecznie = razem × wizyt w miesiacu (zaokraglone do zlotowki).
 * @param {MigawkaWyniku} m @param {KwotyOferty} razem @returns {Oferta['abonament']}
 */
function abonamentOferty(m, razem) {
  const wizyt = m.wizytWMiesiacu
  if (wizyt === null || !czyAbonament(m)) return null
  return { wizyt, miesiecznie: { od: Math.round(razem.od * wizyt), do: Math.round(razem.do * wizyt) } }
}

/**
 * Linie uslug i dojazd: dodatki „w cenie” z kwota dla klienta, a usluga glowna dostaje reszte (razem.od − dojazd − dodatki),
 * wiec linie zawsze sumuja sie do kwoty „Razem” (tez przy cenie recznej i zaokragleniach VAT). Reszta ujemna (cena reczna nizsza
 * niz dodatki) laczy dodatki z usluga w jedna linie.
 * @param {Wycena} w @param {MigawkaWyniku} m @param {number} od @param {Katalog} katalog
 * @returns {{ uslugi: LiniaOferty[], dojazd: number }}
 */
function linieOferty(w, m, od, katalog) {
  const dojazd = Math.min(dlaKlienta(m, m.dojazd.kwota), od)
  const dodatki = dodatkiWCenie(m.linie).map((d) => ({ opis: d.opis, kwota: dlaKlienta(m, d.kwota) }))
  const reszta = od - dojazd - dodatki.reduce((s, d) => s + d.kwota, 0)
  const opis = opisUslugi(w, katalog)
  if (reszta < 0) return { uslugi: [{ opis, kwota: od - dojazd }], dojazd }
  return { uslugi: [{ opis, kwota: reszta }, ...dodatki], dojazd }
}

/** @param {Date} dzis @param {number} dni @returns {string} RRRR-MM-DD w czasie lokalnym */
const poDniach = (dzis, dni) => dzienLokalny(new Date(dzis.getFullYear(), dzis.getMonth(), dzis.getDate() + dni))

/**
 * Oferta dla klienta z zapisanej wyceny, zbudowana tylko z pol bialej listy typu Oferta (R21). Wycena bez numeru albo bez
 * migawki wyniku daje BladOferty `brak_numeru` albo `brak_wyniku`.
 * @param {Wycena} w @param {KontekstOferty} kontekst @param {Date} dzis dzien wystawienia (czas lokalny)
 * @returns {Oferta}
 */
export function ofertaZWyceny(w, kontekst, dzis) {
  if (!jestData(dzis)) throw new BladOferty('data', 'Dzień wystawienia oferty musi być poprawną datą')
  if (w.numer === null) throw new BladOferty('brak_numeru', `Wycena ${w.id} nie jest zapisana`)
  const m = w.wynik
  if (m === null) throw new BladOferty('brak_wyniku', `Wycena ${w.numer} nie ma policzonej ceny`)
  const szybka = w.rodzaj === 'szybka'
  const { razem, trybCeny, netto, kwotaVat } = kwotyRazem(w, m, szybka)
  const { uslugi, dojazd } = linieOferty(w, m, razem.od, kontekst.katalog)
  const { nazwa, telefon, email, nip } = kontekst.ustawienia?.firma ?? PUSTA_FIRMA
  const { termin } = w.klient
  return {
    v: WERSJA_OFERTY,
    firma: { nazwa, telefon, email, nip },
    numer: w.numer,
    data: dzienLokalny(dzis),
    waznaDo: w.oferta.waznaDo ?? poDniach(dzis, kontekst.domyslne.oferta.waznosc_dni),
    klient: { nazwa: w.klient.nazwa, adres: w.klient.adres, termin: termin === null ? null : terminKlienta(termin) },
    uslugi,
    dojazd,
    razem,
    trybCeny,
    abonament: abonamentOferty(m, razem),
    vat: { status: m.statusVat, stawka: m.stawkaVatProc, netto, kwotaVat },
    dodatkiOpcjonalne: m.propozycje.map((p) => ({ opis: wGranicy(`${p.opis} (${tekstIlosci(p.ilosc, p.jednostka)})`), kwota: dlaKlienta(m, p.kwota) })),
    zakres: zakresOferty(w, kontekst),
    warunki: warunkiOferty(w, kontekst, szybka),
    szybka,
  }
}

/**
 * Oferta wazna do konca dnia `waznaDo` (czas lokalny dnia `dzis`).
 * @param {Pick<Oferta, 'waznaDo'>} oferta @param {Date} dzis
 * @returns {boolean}
 */
export function czyWazna(oferta, dzis) {
  if (!jestData(dzis)) throw new BladOferty('data', 'Dzień sprawdzenia ważności musi być poprawną datą')
  if (!jestDniem(oferta.waznaDo)) throw new BladOferty('wazna_do', `Data ważności oferty ma zły format: ${String(oferta.waznaDo)}`)
  return dzienLokalny(dzis) <= oferta.waznaDo
}
