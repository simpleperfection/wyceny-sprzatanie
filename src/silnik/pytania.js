// Pytania do klienta przed wycena (R13): lista pytan uslugi z data/pytania.json, opis odpowiedzi, skutki odpowiedzi w modelu
// (brud w pomieszczeniach, kilometry dojazdu) i kontrola pliku pytan wzgledem katalogu uslug i norm.

import { BladWejscia } from './bledy.js'
import { dojazdKlienta } from './cena.js'
import { zPoziomemBrudu } from './czas.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./katalog.js').Usluga} Usluga */
/** @typedef {import('./katalog.js').RegulaBrudu} RegulaBrudu */
/** @typedef {import('./cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('./cena.js').StawkiDojazdu} StawkiDojazdu */
/** @typedef {import('./czas.js').BrudPomieszczenia} BrudPomieszczenia */
/**
 * @typedef {typeof TYPY_ODPOWIEDZI[number]} TypOdpowiedzi
 * @typedef {{ rodzaj: 'brud', brud: string, poziom: number, pomieszczenie: string, gdy: string }} SkutekBrudu gdy: „tak” albo opcja
 * @typedef {SkutekBrudu | { rodzaj: 'dojazd_km' }} Skutek
 * @typedef {{ id: string, tresc: string, typ: TypOdpowiedzi, opcje?: string[], jednostka?: string, skutek?: Skutek }} Pytanie
 * @typedef {{ meta?: unknown, wspolne: Pytanie[], uslugi: Record<string, Pytanie[]>,
 *   zdjecia?: Record<string, { podpowiedz: string, prosba: string }> }} Pytania schemat data/pytania.json
 * @typedef {{ wartosc: string | number, notatka?: string }} Odpowiedz tak_nie: 'tak' | 'nie', wybor: opcja, liczba: liczba ≥ 0, tekst
 * @typedef {{ pytanieId: string, opis: string }} SkutekOdpowiedzi
 */

/** Skutki odpowiedzi w modelu wyceny; zrodlo stalej dla ekranu pytan. */
export const RODZAJE_SKUTKOW = Object.freeze(/** @type {const} */ (['brud', 'dojazd_km']))
/** Typy odpowiedzi na pytania do klienta; zrodlo stalej dla ekranu pytan. */
export const TYPY_ODPOWIEDZI = Object.freeze(/** @type {const} */ (['tak_nie', 'wybor', 'liczba', 'tekst']))

/** Odpowiedzi na pytanie `tak_nie` (wartosc zapisu); zrodlo stalej dla ekranu pytan. */
export const ODPOWIEDZI_TAK_NIE = Object.freeze(/** @type {const} */ (['tak', 'nie']))

const MAKS_DLUGOSC_TEKSTU = 200 // notatka i odpowiedz tekstowa
const KAZDE_POMIESZCZENIE = '*'
const MIEJSCA_POMIESZCZEN = new Map([
  [KAZDE_POMIESZCZENIE, 'we wszystkich pomieszczeniach'], ['pokoj', 'w pokojach'], ['przedpokoj', 'w przedpokoju'],
  ['kuchnia', 'w kuchni'], ['lazienka', 'w łazience'], ['biuro', 'w biurach'], ['sala', 'w salach'],
  ['kuchnia_socjalna', 'w kuchni socjalnej'], ['toaleta', 'w toaletach'], ['korytarz', 'na korytarzach'],
])
const FORMAT_LICZBY = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })

/** @param {unknown} x @returns {x is Record<string, unknown>} */
const jestObiektem = (x) => typeof x === 'object' && x !== null && !Array.isArray(x)
/** @param {unknown} x @returns {x is string} */
const jestNiepustymTekstem = (x) => typeof x === 'string' && x.trim() !== ''
/** @param {string} tekst */
const malaLitera = (tekst) => tekst.charAt(0).toLocaleLowerCase('pl-PL') + tekst.slice(1)
/** @param {SkutekBrudu} skutek @param {{ typ: string }} pomieszczenie */
const czyPasuje = (skutek, pomieszczenie) => skutek.pomieszczenie === KAZDE_POMIESZCZENIE || skutek.pomieszczenie === pomieszczenie.typ
/** @param {SkutekBrudu} skutek @param {{ brud?: BrudPomieszczenia[] }} pomieszczenie */
const maPoziomSkutku = (skutek, pomieszczenie) => (pomieszczenie.brud ?? []).some((b) => b.id === skutek.brud && b.poziom === skutek.poziom)

/**
 * Pytania uslugi: wspolne, potem pytania uslugi (kolejnosc z pliku).
 * @param {string} uslugaId
 * @param {Pytania} pytania
 * @returns {Pytanie[]}
 */
export function pytaniaUslugi(uslugaId, pytania) {
  const wlasne = Object.hasOwn(pytania.uslugi, uslugaId) ? pytania.uslugi[uslugaId] : undefined
  if (!wlasne) throw new BladWejscia('nieznana_usluga', `Brak pytań do klienta dla usługi ${uslugaId}`)
  return [...pytania.wspolne, ...wlasne]
}

/** @param {Pytanie} pytanie @param {unknown} wartosc */
function czyWartoscPasuje(pytanie, wartosc) {
  if (pytanie.typ === 'tak_nie') return typeof wartosc === 'string' && ODPOWIEDZI_TAK_NIE.some((o) => o === wartosc)
  if (pytanie.typ === 'wybor') return typeof wartosc === 'string' && (pytanie.opcje ?? []).includes(wartosc)
  if (pytanie.typ === 'liczba') return typeof wartosc === 'number' && Number.isFinite(wartosc) && wartosc >= 0
  return jestNiepustymTekstem(wartosc) && wartosc.length <= MAKS_DLUGOSC_TEKSTU
}

/** @param {Pytanie} pytanie @param {unknown} odpowiedz @returns {asserts odpowiedz is Odpowiedz} */
function sprawdzOdpowiedz(pytanie, odpowiedz) {
  if (!jestObiektem(odpowiedz)) throw new BladWejscia('odpowiedz', `Odpowiedź na pytanie ${pytanie.id} musi mieć wartość`)
  const { wartosc, notatka } = odpowiedz
  if (notatka !== undefined && (typeof notatka !== 'string' || notatka.length > MAKS_DLUGOSC_TEKSTU)) {
    throw new BladWejscia('notatka', `Notatka do pytania ${pytanie.id} może mieć najwyżej ${MAKS_DLUGOSC_TEKSTU} znaków`)
  }
  if (!czyWartoscPasuje(pytanie, wartosc)) throw new BladWejscia('odpowiedz', `Zła wartość odpowiedzi na pytanie ${pytanie.id} (${pytanie.typ})`)
}

/**
 * Odpowiedz do pokazania pod pytaniem: wartosc wg typu i notatka po przecinku („Tak, kot”, „12 km, parking pod blokiem”).
 * @param {Pytanie} pytanie
 * @param {unknown} odpowiedz `{ wartosc, notatka? }`; zla wartosc albo notatka dluzsza niz 200 znakow daje BladWejscia
 * @returns {string}
 */
export function opisOdpowiedzi(pytanie, odpowiedz) {
  sprawdzOdpowiedz(pytanie, odpowiedz)
  const { wartosc } = odpowiedz
  const tekst = typeof wartosc === 'number'
    ? [FORMAT_LICZBY.format(wartosc), pytanie.jednostka].filter(Boolean).join(' ')
    : pytanie.typ === 'tak_nie' ? wartosc.charAt(0).toLocaleUpperCase('pl-PL') + wartosc.slice(1) : wartosc
  const notatka = odpowiedz.notatka?.trim() ?? ''
  return notatka === '' ? tekst : `${tekst}, ${notatka}`
}

/**
 * @param {WejscieWyceny} wejscie @param {Skutek} skutek @param {Odpowiedz} odpowiedz
 * @param {{ usluga: Usluga, katalog: Katalog, stawki: StawkiDojazdu }} srodowisko
 * @returns {{ wejscie: WejscieWyceny, opis: string } | null} null, gdy odpowiedz nie uruchamia skutku
 */
function zastosujSkutek(wejscie, skutek, odpowiedz, { usluga, katalog, stawki }) {
  if (skutek.rodzaj === 'dojazd_km') {
    const km = odpowiedz.wartosc
    if (typeof km !== 'number') throw new BladWejscia('skutek', 'Skutek dojazd_km wymaga odpowiedzi liczbowej')
    return { wejscie: { ...wejscie, dojazdKm: km }, opis: `dojazd: ${FORMAT_LICZBY.format(dojazdKlienta(km, stawki).kwota)} zł dla klienta` }
  }
  if (usluga.tryb !== 'pomieszczenia' || odpowiedz.wartosc !== skutek.gdy) return null
  katalog.normaBrudu(skutek.brud, skutek.poziom)
  const nazwa = katalog.brud.find((b) => b.id === skutek.brud)?.nazwa ?? skutek.brud
  const pomieszczenia = zPoziomemBrudu(wejscie.pomieszczenia ?? [], [skutek])
  const miejsce = MIEJSCA_POMIESZCZEN.get(skutek.pomieszczenie) ?? `w pomieszczeniach: ${skutek.pomieszczenie}`
  return { wejscie: { ...wejscie, pomieszczenia }, opis: `${malaLitera(nazwa)}, poziom ${skutek.poziom} ${miejsce}` }
}

/**
 * Skutki odpowiedzi w wycenie: brud (tylko uslugi z pomieszczeniami; ustawia poziom we wszystkich pasujacych pomieszczeniach
 * wejscia) i kilometry dojazdu. Wywolujacy podaje odpowiedzi do zastosowania (np. tylko zmieniona), wiec reczne zmiany
 * w kreatorze po odpowiedzi zostaja, dopoki odpowiedz sie nie zmieni. Odpowiedzi na pytania spoza listy uslugi sa pomijane.
 * @param {WejscieWyceny} wejscie
 * @param {Record<string, unknown>} odpowiedzi id pytania → `{ wartosc, notatka? }`
 * @param {Pytania} pytania
 * @param {Katalog} katalog
 * @param {{ stawkiDojazdu?: StawkiDojazdu }} [opcje] stawki dojazdu z ustawien; domyslnie koszty_firmy.dojazd z data/ceny.json
 * @returns {{ wejscie: WejscieWyceny, skutki: SkutekOdpowiedzi[] }}
 */
export function zastosujOdpowiedzi(wejscie, odpowiedzi, pytania, katalog, opcje = {}) {
  const srodowisko = { usluga: katalog.usluga(wejscie.uslugaId), katalog, stawki: opcje.stawkiDojazdu ?? katalog.kosztyFirmy.dojazd }
  let wynik = wejscie
  /** @type {SkutekOdpowiedzi[]} */
  const skutki = []
  for (const pytanie of pytaniaUslugi(wejscie.uslugaId, pytania)) {
    if (!pytanie.skutek || !Object.hasOwn(odpowiedzi, pytanie.id)) continue
    const odpowiedz = odpowiedzi[pytanie.id]
    sprawdzOdpowiedz(pytanie, odpowiedz)
    const zastosowany = zastosujSkutek(wynik, pytanie.skutek, odpowiedz, srodowisko)
    if (!zastosowany) continue
    wynik = zastosowany.wejscie
    skutki.push({ pytanieId: pytanie.id, opis: zastosowany.opis })
  }
  return { wejscie: wynik, skutki }
}

/**
 * Reguly brudu ze skutkow odpowiedzi klienta (odpowiedz rowna `gdy`), w kolejnosci pytan uslugi. Szybka wycena naklada je
 * na uklad typowego lokalu, bo nie ma wlasnych pomieszczen, do ktorych zastosujOdpowiedzi mogloby dopisac brud. Zla odpowiedz
 * na pytanie ze skutkiem daje BladWejscia `odpowiedz`.
 * @param {string} uslugaId
 * @param {Record<string, unknown>} odpowiedzi id pytania → `{ wartosc, notatka? }`
 * @param {Pytania} pytania
 * @returns {RegulaBrudu[]}
 */
export function regulyBrudu(uslugaId, odpowiedzi, pytania) {
  return pytaniaUslugi(uslugaId, pytania).flatMap((pytanie) => {
    const { skutek } = pytanie
    if (skutek?.rodzaj !== 'brud' || !Object.hasOwn(odpowiedzi, pytanie.id)) return []
    const odpowiedz = odpowiedzi[pytanie.id]
    sprawdzOdpowiedz(pytanie, odpowiedz)
    return odpowiedz.wartosc === skutek.gdy ? [{ pomieszczenie: skutek.pomieszczenie, brud: skutek.brud, poziom: skutek.poziom }] : []
  })
}

/**
 * Czy skutek odpowiedzi jest w wejsciu wyceny: kilometry dojazdu rowne odpowiedzi albo brud skutku na jego poziomie w co najmniej
 * jednym pasujacym pomieszczeniu (reczna zmiana w kreatorze albo pomieszczenie bez skutku go zdejmuja).
 * @param {WejscieWyceny} wejscie @param {Skutek} skutek @param {Odpowiedz} odpowiedz
 * @returns {boolean}
 */
export function czySkutekWWejsciu(wejscie, skutek, odpowiedz) {
  if (skutek.rodzaj === 'dojazd_km') return (wejscie.dojazdKm ?? 0) === odpowiedz.wartosc
  return (wejscie.pomieszczenia ?? []).some((p) => czyPasuje(skutek, p) && maPoziomSkutku(skutek, p))
}

/**
 * Wejscie bez brudu skutku odpowiedzi, ktora przestala go uruchamiac (np. „tak” → „nie”): w pasujacych pomieszczeniach, w ktorych
 * brud wciaz ma poziom skutku, wraca poziom nowego pomieszczenia z `domyslny` (np. `brud_domyslny` uslugi) albo brud znika.
 * Pomieszczenia z poziomem zmienionym recznie zostaja.
 * @param {WejscieWyceny} wejscie @param {SkutekBrudu} skutek
 * @param {(typ: string) => BrudPomieszczenia[]} domyslny brud nowego pomieszczenia danego typu
 * @returns {WejscieWyceny}
 */
export function bezSkutkuBrudu(wejscie, skutek, domyslny) {
  const pomieszczenia = (wejscie.pomieszczenia ?? []).map((p) => {
    if (!czyPasuje(skutek, p) || !maPoziomSkutku(skutek, p)) return p
    const zwykly = domyslny(p.typ).find((b) => b.id === skutek.brud)
    const brud = p.brud ?? []
    return { ...p, brud: zwykly ? brud.map((b) => (b.id === skutek.brud ? { ...zwykly } : b)) : brud.filter((b) => b.id !== skutek.brud) }
  })
  return { ...wejscie, pomieszczenia }
}

/** @param {string} miejsce @param {Record<string, unknown>} skutek @param {Record<string, unknown>} pytanie @param {Set<string>} typy @param {Katalog} katalog */
function bledySkutkuBrudu(miejsce, skutek, pytanie, typy, katalog) {
  const bledy = []
  const brud = katalog.brud.find((b) => b.id === skutek.brud)
  if (!brud) bledy.push(`${miejsce}: nieznany brud ${String(skutek.brud)}`)
  const poziom = skutek.poziom
  if (brud && !(Number.isInteger(poziom) && typeof poziom === 'number' && poziom >= 1 && poziom <= brud.min_m2.length)) {
    bledy.push(`${miejsce}: poziom brudu ${String(poziom)} poza 1–${brud.min_m2.length}`)
  }
  if (typeof skutek.pomieszczenie !== 'string' || (skutek.pomieszczenie !== KAZDE_POMIESZCZENIE && !typy.has(skutek.pomieszczenie))) {
    bledy.push(`${miejsce}: nieznane pomieszczenie ${String(skutek.pomieszczenie)}`)
  }
  const dozwolone = pytanie.typ === 'tak_nie' ? [...ODPOWIEDZI_TAK_NIE] : pytanie.typ === 'wybor' && Array.isArray(pytanie.opcje) ? pytanie.opcje : null
  if (!dozwolone) bledy.push(`${miejsce}: skutek brud przy typie ${String(pytanie.typ)}`)
  else if (!dozwolone.includes(skutek.gdy)) bledy.push(`${miejsce}: warunek skutku ${String(skutek.gdy)} nie jest możliwą odpowiedzią`)
  return bledy
}

/** @param {string} miejsce @param {Record<string, unknown>} pytanie @param {Set<string>} typy @param {Katalog} katalog @returns {string[]} */
function bledySkutku(miejsce, pytanie, typy, katalog) {
  const skutek = pytanie.skutek
  if (skutek === undefined) return []
  if (!jestObiektem(skutek) || !RODZAJE_SKUTKOW.some((r) => r === skutek.rodzaj)) return [`${miejsce}: nieznany rodzaj skutku`]
  if (skutek.rodzaj === 'brud') return bledySkutkuBrudu(miejsce, skutek, pytanie, typy, katalog)
  return pytanie.typ === 'liczba' ? [] : [`${miejsce}: skutek dojazd_km przy typie ${String(pytanie.typ)}`]
}

/** @param {string} miejsce @param {unknown} pytanie @param {Set<string>} typy @param {Katalog} katalog @returns {string[]} */
function bledyPytania(miejsce, pytanie, typy, katalog) {
  if (!jestObiektem(pytanie)) return [`${miejsce}: pytanie musi być obiektem`]
  const gdzie = `${miejsce} (${String(pytanie.id)})`
  const bledy = []
  if (!jestNiepustymTekstem(pytanie.id)) bledy.push(`${gdzie}: puste id`)
  if (!jestNiepustymTekstem(pytanie.tresc)) bledy.push(`${gdzie}: pusta treść`)
  if (!TYPY_ODPOWIEDZI.some((t) => t === pytanie.typ)) bledy.push(`${gdzie}: nieznany typ ${String(pytanie.typ)}`)
  const opcje = pytanie.opcje
  if (pytanie.typ === 'wybor' && !(Array.isArray(opcje) && opcje.length > 0 && opcje.every(jestNiepustymTekstem))) bledy.push(`${gdzie}: puste opcje`)
  return [...bledy, ...bledySkutku(gdzie, pytanie, typy, katalog)]
}

/** @param {string} miejsce @param {unknown[]} lista @returns {string[]} */
function bledyPowtorzen(miejsce, lista) {
  const ids = lista.map((p) => (jestObiektem(p) ? p.id : undefined)).filter((id) => typeof id === 'string')
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].map((id) => `${miejsce}: powtórzone id ${id}`)
}

/** @param {Usluga} usluga @param {Katalog} katalog @returns {Set<string>} */
function typyPomieszczen(usluga, katalog) {
  return new Set(usluga.zestaw_pomieszczen ? katalog.zestaw(usluga.zestaw_pomieszczen).map((n) => n.id) : [])
}

/** @param {unknown} zdjecia @param {Map<string, Usluga>} uslugi @returns {string[]} */
function bledyZdjec(zdjecia, uslugi) {
  if (zdjecia === undefined) return []
  if (!jestObiektem(zdjecia)) return ['zdjecia: musi być obiektem']
  return Object.entries(zdjecia).flatMap(([id, wpis]) => {
    if (!uslugi.has(id)) return [`zdjecia.${id}: nieznana usługa`]
    return jestObiektem(wpis) && jestNiepustymTekstem(wpis.podpowiedz) && jestNiepustymTekstem(wpis.prosba) ? [] : [`zdjecia.${id}: pusta podpowiedź albo prośba`]
  })
}

/**
 * Kontrola pliku pytan: nieznany brud, usluga albo pomieszczenie, skutek przy zlym typie, usluga bez wpisu w `uslugi` (poza
 * `tylko_dodatek`), puste tresci i opcje, powtorzone id w liscie uslugi (wspolne + usluga).
 * @param {unknown} pytania zawartosc data/pytania.json
 * @param {Katalog} katalog
 * @returns {string[]} opisy bledow; pusta lista = plik poprawny
 */
export function sprawdzPytania(pytania, katalog) {
  if (!jestObiektem(pytania) || !Array.isArray(pytania.wspolne) || !jestObiektem(pytania.uslugi)) return ['Plik pytań musi mieć listę wspolne i obiekt uslugi']
  const { wspolne } = pytania
  const uslugi = new Map(katalog.uslugi.map((u) => [u.id, u]))
  const wszystkieTypy = new Set([...uslugi.values()].flatMap((u) => [...typyPomieszczen(u, katalog)]))
  const bledy = wspolne.flatMap((p, i) => bledyPytania(`wspolne[${i}]`, p, wszystkieTypy, katalog))
  for (const [id, lista] of Object.entries(pytania.uslugi)) {
    const usluga = uslugi.get(id)
    if (!usluga) bledy.push(`uslugi.${id}: nieznana usługa`)
    else if (!Array.isArray(lista)) bledy.push(`uslugi.${id}: lista pytań musi być tablicą`)
    else bledy.push(...lista.flatMap((p, i) => bledyPytania(`uslugi.${id}[${i}]`, p, typyPomieszczen(usluga, katalog), katalog)), ...bledyPowtorzen(`uslugi.${id}`, [...wspolne, ...lista]))
  }
  for (const u of uslugi.values()) if (!u.tylko_dodatek && !Object.hasOwn(pytania.uslugi, u.id)) bledy.push(`uslugi: brak pytań usługi ${u.id}`)
  return [...bledy, ...bledyZdjec(pytania.zdjecia, uslugi)]
}
