// Dobor chemii (R26): kategorie srodkow z data/chemia.json dla brudu w pomieszczeniach i pozycji wyceny, pozycje bez kategorii,
// kategorie do recznego dodania (dezynfekcja) i teksty produktu. Czyste funkcje bez DOM i magazynu. Kosztu chemii z tej bazy
// nie liczymy (decyzja 2026-10-23): koszt chemii w wycenie to szacunek z data/ceny.json.

import { BladKatalogu } from './bledy.js'

/** @typedef {import('./cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./katalog.js').PobierzJson} PobierzJson */
/**
 * @typedef {{ id: string, nazwa: string }} Dostawca
 * @typedef {{ id: string, nazwa: string, brud: string[], pozycje: string[], produkty: string[] }} KategoriaChemii
 * @typedef {{ pozycja: string, powod: string }} PozycjaBezKategorii klucz `usluga.pozycja` z data/ceny.json
 * @typedef {{ zastosowanie: string, proc: number[] }} Stezenie proc = [min, max] % koncentratu w roztworze
 * @typedef {{ id: string, dostawca: string, nazwa: string, przeznaczenie: string, kategorie: string[], ph: (number | null)[] | null,
 *   gotowy: boolean, stezenia: Stezenie[], opakowanie: { ilosc: number, jednostka: string }, cena_brutto: number,
 *   sds: { url: string, data: string, plik?: string } }} Produkt
 * @typedef {{ meta: { wersja: string }, dostawcy: Dostawca[], kategorie: KategoriaChemii[], bez_kategorii: PozycjaBezKategorii[],
 *   produkty: Produkt[] }} Chemia
 * @typedef {{ co: string, gdzie: string | null }} Powod rodzaj brudu albo pozycja; gdzie — pomieszczenie (null przy pozycji)
 * @typedef {{ kategoria: KategoriaChemii, powody: Powod[] }} KategoriaWyceny
 * @typedef {{ uslugaId: string, pozycjaId: string, powod: string }} NotkaBezKategorii
 * @typedef {{ ph: string, stezenie: string, opakowanie: string, cena: string }} OpisProduktu
 * @typedef {{ adres: string, data: string | null, czyFormularz: boolean }} KartaSds data null, gdy nieczytelna; czyFormularz: karta tylko przez formularz na stronie produktu (Buzil)
 */

export const PLIK_CHEMII = 'data/chemia.json'
/** Kurz na poziomie 1 jest w normie, wiec kazde pomieszczenie potrzebuje srodka na kurz. */
const BRUD_W_NORMIE = 'kurz'
const PROTOKOL_KARTY = 'https:'
const NBSP = ' '
const formatLiczby = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const formatCeny = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** @param {unknown} x @returns {x is Record<string, unknown>} */
const jestObiektem = (x) => typeof x === 'object' && x !== null && !Array.isArray(x)
/** @param {unknown} x @returns {x is string} */
const jestTekstem = (x) => typeof x === 'string'
/** @param {unknown} x @returns {x is number} */
const jestLiczba = (x) => typeof x === 'number' && Number.isFinite(x)
/** @param {unknown} x @returns {x is number[]} */
const jestZakresem = (x) => Array.isArray(x) && x.length === 2 && x.every(jestLiczba)
/** Odczyn [min, max]; jedna granica moze byc null (np. [12, null] = pH od 12). @param {unknown} x @returns {x is (number | null)[]} */
const jestZakresemPh = (x) => Array.isArray(x) && x.length === 2 && x.every((g) => g === null || jestLiczba(g)) && x.some(jestLiczba)
/** @param {unknown} x @returns {x is string[]} */
const jestListaTekstow = (x) => Array.isArray(x) && x.every(jestTekstem)
/** @param {unknown} x @param {string[]} pola */
const maTeksty = (x, pola) => jestObiektem(x) && pola.every((pole) => jestTekstem(x[pole]))

/** @param {unknown} x */
const jestKategoria = (x) => maTeksty(x, ['id', 'nazwa']) && jestObiektem(x) &&
  jestListaTekstow(x.brud) && jestListaTekstow(x.pozycje) && jestListaTekstow(x.produkty)

/** @param {unknown} x */
const jestStezeniem = (x) => maTeksty(x, ['zastosowanie']) && jestObiektem(x) && jestZakresem(x.proc)

/** @param {unknown} x */
function jestProduktem(x) {
  if (!maTeksty(x, ['id', 'dostawca', 'nazwa', 'przeznaczenie']) || !jestObiektem(x)) return false
  const { opakowanie, sds } = x
  return jestListaTekstow(x.kategorie) && (x.ph === null || jestZakresemPh(x.ph)) && typeof x.gotowy === 'boolean' &&
    Array.isArray(x.stezenia) && x.stezenia.every(jestStezeniem) && jestLiczba(x.cena_brutto) &&
    jestObiektem(opakowanie) && jestLiczba(opakowanie.ilosc) && jestTekstem(opakowanie.jednostka) &&
    maTeksty(sds, ['url', 'data']) && jestObiektem(sds) && (sds.plik === undefined || jestTekstem(sds.plik))
}

/** @param {unknown} x @returns {x is Chemia} */
function jestChemia(x) {
  return jestObiektem(x) && maTeksty(x.meta, ['wersja']) &&
    Array.isArray(x.dostawcy) && x.dostawcy.every((d) => maTeksty(d, ['id', 'nazwa'])) &&
    Array.isArray(x.kategorie) && x.kategorie.every(jestKategoria) &&
    Array.isArray(x.bez_kategorii) && x.bez_kategorii.every((b) => maTeksty(b, ['pozycja', 'powod'])) &&
    Array.isArray(x.produkty) && x.produkty.every(jestProduktem)
}

/**
 * Baza chemii przez `pobierzJson` (w przegladarce fetch, w testach odczyt z dysku): format i produkty kategorii.
 * @param {PobierzJson} pobierzJson
 * @returns {Promise<Chemia>}
 */
export async function wczytajChemie(pobierzJson) {
  const dane = await pobierzJson(PLIK_CHEMII)
  if (!jestChemia(dane)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIK_CHEMII}`)
  for (const kategoria of dane.kategorie) produktyKategorii(kategoria, dane)
  return dane
}

/**
 * Pozycje wyceny z iloscia > 0: pozycje uslugi i dodatki (dowolny tryb), z kluczem `usluga.pozycja`.
 * @param {WejscieWyceny} wejscie
 * @returns {{ uslugaId: string, pozycjaId: string, klucz: string }[]}
 */
function pozycjeWyceny(wejscie) {
  const pozycje = (wejscie.pozycje ?? []).filter((p) => p.ilosc > 0).map((p) => ({ uslugaId: wejscie.uslugaId, pozycjaId: p.id }))
  const dodatki = (wejscie.dodatki ?? []).filter((d) => d.ilosc > 0).map((d) => ({ uslugaId: d.uslugaId, pozycjaId: d.pozycjaId }))
  return [...pozycje, ...dodatki].map((p) => ({ ...p, klucz: `${p.uslugaId}.${p.pozycjaId}` }))
}

/**
 * Powody z pomieszczen: kurz zawsze (poziom 1 w normie) i kazdy brud z poziomem > 0, z nazwa pomieszczenia.
 * @param {WejscieWyceny} wejscie @param {Katalog} katalog
 * @returns {{ brudId: string, powod: Powod }[]}
 */
function powodyBrudu(wejscie, katalog) {
  return (wejscie.pomieszczenia ?? []).flatMap((p) => {
    const ids = new Set([BRUD_W_NORMIE, ...(p.brud ?? []).filter((b) => b.poziom > 0).map((b) => b.id)])
    const gdzie = p.nazwa ?? p.typ
    return [...ids].map((brudId) => ({ brudId, powod: { co: katalog.brud.find((b) => b.id === brudId)?.nazwa ?? brudId, gdzie } }))
  })
}

/**
 * Kategorie srodkow dla wyceny, bez powtorzen i w kolejnosci data/chemia.json. Uslugi z pomieszczeniami: zawsze kategoria kurzu
 * i kategorie brudu uzytego w pomieszczeniach; pozycje uslugi i dodatki z iloscia > 0: kategorie z ich kluczem `usluga.pozycja`.
 * Kategorie bez brudu i pozycji (dezynfekcja) tu nie trafiaja — zob. `kategorieDoRecznegoDodania`.
 * @param {WejscieWyceny} wejscie @param {Chemia} chemia @param {Katalog} katalog
 * @returns {KategoriaWyceny[]}
 */
export function kategorieDlaWyceny(wejscie, chemia, katalog) {
  const usluga = katalog.usluga(wejscie.uslugaId)
  /** @type {Map<string, Powod[]>} id kategorii → powody */
  const powody = new Map()
  /** @param {KategoriaChemii} kategoria @param {Powod | null} powod */
  function dodaj(kategoria, powod) {
    const lista = powody.get(kategoria.id) ?? []
    if (powod && !lista.some((p) => p.co === powod.co && p.gdzie === powod.gdzie)) lista.push(powod)
    powody.set(kategoria.id, lista)
  }
  if (usluga.tryb === 'pomieszczenia') {
    for (const k of chemia.kategorie.filter((k) => k.brud.includes(BRUD_W_NORMIE))) dodaj(k, null)
    for (const { brudId, powod } of powodyBrudu(wejscie, katalog)) chemia.kategorie.filter((k) => k.brud.includes(brudId)).forEach((k) => dodaj(k, powod))
  }
  for (const p of pozycjeWyceny(wejscie)) {
    const powod = { co: katalog.pozycja(p.uslugaId, p.pozycjaId).nazwa, gdzie: null }
    chemia.kategorie.filter((k) => k.pozycje.includes(p.klucz)).forEach((k) => dodaj(k, powod))
  }
  return chemia.kategorie.filter((k) => powody.has(k.id)).map((k) => ({ kategoria: k, powody: powody.get(k.id) ?? [] }))
}

/**
 * Pozycje wyceny (z iloscia > 0) bez kategorii srodkow, z powodem z `bez_kategorii`, bez powtorzen.
 * @param {WejscieWyceny} wejscie @param {Chemia} chemia
 * @returns {NotkaBezKategorii[]}
 */
export function bezKategorii(wejscie, chemia) {
  const klucze = new Map(pozycjeWyceny(wejscie).map((p) => [p.klucz, p]))
  return chemia.bez_kategorii.flatMap((b) => {
    const p = klucze.get(b.pozycja)
    return p ? [{ uslugaId: p.uslugaId, pozycjaId: p.pozycjaId, powod: b.powod }] : []
  })
}

/**
 * Kategorie bez brudu i pozycji (dezynfekcja): firma dodaje je recznie przy kazdej usludze, aplikacja ich nie podsuwa
 * (decyzja 2026-10-23).
 * @param {Chemia} chemia
 * @returns {KategoriaChemii[]}
 */
export const kategorieDoRecznegoDodania = (chemia) => chemia.kategorie.filter((k) => k.brud.length === 0 && k.pozycje.length === 0)

/**
 * Produkty kategorii w kolejnosci z kategorii; nieznany produkt to blad danych `brak_produktu`.
 * @param {KategoriaChemii} kategoria @param {Chemia} chemia
 * @returns {Produkt[]}
 */
export function produktyKategorii(kategoria, chemia) {
  const indeks = new Map(chemia.produkty.map((p) => [p.id, p]))
  return kategoria.produkty.map((id) => {
    const produkt = indeks.get(id)
    if (!produkt) throw new BladKatalogu('brak_produktu', `Kategoria ${kategoria.id}: nie ma produktu ${id} w ${PLIK_CHEMII}`)
    return produkt
  })
}

/**
 * Dostawcy, ktorzy maja produkty w bazie (np. bez pominietego Kärchera), w kolejnosci `dostawcy`.
 * @param {Chemia} chemia
 * @returns {Dostawca[]}
 */
export function dostawcyZProduktami(chemia) {
  const ids = new Set(chemia.produkty.map((p) => p.dostawca))
  return chemia.dostawcy.filter((d) => ids.has(d.id))
}

/** @param {number[]} zakres [min, max] @returns {string} „7” albo „2–3” */
function tekstZakresu(zakres) {
  const [min = 0, max = min] = zakres
  return min === max ? formatLiczby.format(min) : `${formatLiczby.format(min)}–${formatLiczby.format(max)}`
}

/** @param {(number | null)[] | null} ph @returns {string} „pH 7”, „pH 2–3”, „pH od 12”, „pH do 3” albo „pH: brak danych” */
function tekstPh(ph) {
  const [min = null, max = null] = ph ?? []
  if (min !== null && max !== null) return `pH ${tekstZakresu([min, max])}`
  if (min !== null) return `pH od ${formatLiczby.format(min)}`
  return max === null ? 'pH: brak danych' : `pH do ${formatLiczby.format(max)}`
}

/**
 * Teksty produktu: pH („pH 7”, „pH 2–3”, „pH: brak danych”), stezenie („gotowy do użycia” albo „0,2–0,5% mycie ręczne, …”),
 * opakowanie („5 l”) i cena brutto opakowania („82,87 zł”).
 * @param {Produkt} produkt
 * @returns {OpisProduktu}
 */
export function opisProduktu(produkt) {
  const stezenia = produkt.stezenia.map((s) => `${tekstZakresu(s.proc)}% ${s.zastosowanie}`).join(', ')
  return {
    ph: tekstPh(produkt.ph),
    stezenie: produkt.gotowy ? 'gotowy do użycia' : stezenia || 'stężenie: brak danych',
    opakowanie: `${formatLiczby.format(produkt.opakowanie.ilosc)}${NBSP}${produkt.opakowanie.jednostka}`,
    cena: `${formatCeny.format(produkt.cena_brutto)}${NBSP}zł`,
  }
}

/**
 * Karta SDS produktu: adres tylko z protokolem https (inny albo nieczytelny adres z danych daje null). Buzil (`sds.plik`)
 * nie ma stalego linku do karty — adres to strona produktu z formularzem.
 * @param {Produkt} produkt
 * @returns {KartaSds | null}
 */
export function kartaSds(produkt) {
  const { url, data, plik } = produkt.sds
  if (!URL.canParse(url) || new URL(url).protocol !== PROTOKOL_KARTY) return null
  return { adres: new URL(url).href, data: Number.isNaN(Date.parse(data)) ? null : data, czyFormularz: plik !== undefined }
}
