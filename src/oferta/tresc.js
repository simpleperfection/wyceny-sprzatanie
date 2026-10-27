// Tresc oferty dla klienta z zapisanej wyceny (R18–R21): gotowe kwoty dla klienta i teksty z bialej listy pol, bez kosztow firmy,
// tempa, czasu i „zostaje” (R21). Zakres i warunki: oferta → ustawienia → dane domyslne. Waznosc do konca dnia waznaDo.
// Czyste funkcje bez DOM i magazynu: ustawienia podaje wywolujacy (stan magazynu), dane referencyjne z data/*.json.

import { dzienLokalny, GRANICE_OFERTY, jestData, jestDniem, jestListaPunktow, jestObiektem, maWartosci } from '../dane/ksztalt.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { cenaDlaKlienta, zCenyRecznej } from '../silnik/vat.js'

/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').MigawkaWyniku} MigawkaWyniku */
/** @typedef {import('../dane/magazyn.js').Ustawienia} Ustawienia */
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
 * @typedef {{ v: 1, firma: { nazwa: string, telefon: string, email: string, nip: string }, numer: string, data: string, waznaDo: string,
 *   klient: { nazwa: string, adres: string, termin: string | null }, uslugi: LiniaOferty[], dojazd: number, razem: { od: number, do: number },
 *   vat: { status: StatusVat, stawka: number, netto: number | null, kwotaVat: number | null }, dodatkiOpcjonalne: LiniaOferty[],
 *   zakres: ZakresUslugi, warunki: string[], szybka: boolean }} Oferta kwoty dla klienta (brutto) w zl; daty RRRR-MM-DD;
 *   vat.netto i vat.kwotaVat null przy widelkach szybkiej wyceny
 */

const PLIK_ZAKRESOW = 'data/zakresy.json'
const WERSJA_OFERTY = 1
const WIELOKROPEK = '…'
const JEDNOSTKI = Object.freeze(/** @type {Record<string, string>} */ ({ m2: 'm²', szt: 'szt.', mb: 'mb' }))
const FORMAT_LICZBY = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
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
/** @param {number} liczba @param {string} jednostka @returns {string} np. „50 m²”, „4 szt.” */
const tekstIlosci = (liczba, jednostka) => `${FORMAT_LICZBY.format(liczba)} ${JEDNOSTKI[jednostka] ?? jednostka}`

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
 * Zakres oferty: zmieniony w tej ofercie → zmieniony w ustawieniach → data/zakresy.json (wariant zastepuje zakres uslugi).
 * @param {Wycena} w @param {KontekstOferty} k @returns {ZakresUslugi}
 */
function zakresOferty(w, k) {
  const { uslugaId, wariantId } = w.wejscie
  const domyslny = k.zakresy.uslugi[uslugaId]
  const wariant = wariantId ? domyslny?.warianty?.[wariantId] : undefined
  const zakres = w.oferta.zakres ?? k.ustawienia?.zakresy[uslugaId] ?? wariant ?? domyslny ?? { wchodzi: [], nie_wchodzi: [] }
  return { wchodzi: [...zakres.wchodzi], nie_wchodzi: [...zakres.nie_wchodzi] }
}

/**
 * Warunki oferty: z tej oferty → z ustawien → z data/domyslne.json; `tylko_szybka` tylko w ofercie z szybkiej wyceny (R20).
 * @param {Wycena} w @param {KontekstOferty} k @param {boolean} szybka @returns {string[]}
 */
function warunkiOferty(w, k, szybka) {
  const warunki = w.oferta.warunki ?? k.ustawienia?.warunki ?? k.domyslne.oferta.warunki
  return warunki.filter((warunek) => szybka || !warunek.tylko_szybka).map((warunek) => warunek.tresc)
}

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
 * Razem do zaplaty i VAT: cena reczna (kwota placona przez klienta, z dojazdem), widelki szybkiej wyceny albo cena z migawki.
 * @param {Wycena} w @param {MigawkaWyniku} m @param {boolean} szybka
 * @returns {{ razem: { od: number, do: number }, netto: number | null, kwotaVat: number | null }}
 */
function kwotyRazem(w, m, szybka) {
  if (w.cenaReczna !== null) {
    const cena = zCenyRecznej(w.cenaReczna, m.statusVat, m.stawkaVatProc)
    return { razem: { od: cena.brutto, do: cena.brutto }, netto: cena.netto, kwotaVat: cena.vat }
  }
  if (szybka && w.szybka) {
    const { od, do: doKwoty } = w.szybka
    const cena = od === doKwoty ? zCenyRecznej(od, m.statusVat, m.stawkaVatProc) : null
    return { razem: { od, do: doKwoty }, netto: cena?.netto ?? null, kwotaVat: cena?.vat ?? null }
  }
  return { razem: { od: m.cena, do: m.cena }, netto: m.netto, kwotaVat: m.vat }
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
  const { razem, netto, kwotaVat } = kwotyRazem(w, m, szybka)
  const { uslugi, dojazd } = linieOferty(w, m, razem.od, kontekst.katalog)
  const { nazwa, telefon, email, nip } = kontekst.ustawienia?.firma ?? PUSTA_FIRMA
  return {
    v: WERSJA_OFERTY,
    firma: { nazwa, telefon, email, nip },
    numer: w.numer,
    data: dzienLokalny(dzis),
    waznaDo: w.oferta.waznaDo ?? poDniach(dzis, kontekst.domyslne.oferta.waznosc_dni),
    klient: { nazwa: w.klient.nazwa, adres: w.klient.adres, termin: w.klient.termin },
    uslugi,
    dojazd,
    razem,
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
