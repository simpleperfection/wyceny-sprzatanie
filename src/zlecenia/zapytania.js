// Zapytania dnia na stanie (R2, R14, R15, R16, R26): wizyty dnia i okresu z klientem i kwota, „Do zamkniecia”, „Niezaplacone”,
// liczba wizyt dzis i najblizsza wizyta. Logika modulu Zlecenia bez DOM i bez zapisu: funkcje dostaja stan odczytany raz
// na render i dzien `dzis` (dzienLokalny) w argumencie; wizyty serii licza sie z okresow (src/kalendarz/wystapienia.js).

import { klient } from '../dane/klienci.js'
import { dzienLokalny, jestDniem } from '../dane/ksztalt.js'
import { okresWDniu } from '../dane/zlecenia.js'
import { BladKalendarza, dodajDni,miesiacDnia, ostatniDzienMiesiaca, porownajDni } from '../kalendarz/daty.js'
import { najblizszaWizyta, wystapienia } from '../kalendarz/wystapienia.js'

/**
 * @typedef {import('../dane/magazyn.js').Stan} Stan
 * @typedef {import('../dane/klienci.js').Klient} Klient
 * @typedef {import('../dane/zlecenia-ksztalt.js').Okres} Okres
 * @typedef {import('../dane/zlecenia-ksztalt.js').StanWizyty} StanWizyty
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('../kalendarz/wystapienia.js').Wystapienie<Okres, StanWizyty>} WystapienieZlecenia
 * @typedef {Pick<Stan, 'klienci' | 'zlecenia'>} StanZlecen
 * @typedef {(uslugaId: string) => string} NazwaUslugi nazwa uslugi z katalogu (podaje wolajacy)
 * @typedef {{ zlecenieId: string, klientId: string, klient: Klient | null, adres: string | null, nazwa: string,
 *   dataPierwotna: string, data: string, godzina: string | null, kwota: number | null, stan: StanWizyty | null,
 *   odwolana: boolean }} WizytaDnia adres z karty klienta; nazwa = opis albo nazwa uslugi; kwota null w serii miesiecznej
 * @typedef {{ rodzaj: 'wizyta' | 'miesiac', zlecenieId: string, klientId: string, klucz: string, kwota: number }} Niezaplacone
 *   klucz: data pierwotna wizyty RRRR-MM-DD albo miesiac RRRR-MM
 */

/** @param {unknown} dzien @returns {asserts dzien is string} RRRR-MM-DD, inaczej BladKalendarza `dzien` */
function sprawdzDzien(dzien) {
  if (!jestDniem(dzien)) throw new BladKalendarza('dzien', `Dzień musi mieć postać RRRR-MM-DD, jest ${String(dzien)}`)
}

/** @param {WizytaDnia} a @param {WizytaDnia} b @returns {number} po dniu, godzinie (bez godziny na koncu dnia), zleceniu */
function porownajWizyty(a, b) {
  if (a.data !== b.data) return porownajDni(a.data, b.data)
  if (a.godzina !== b.godzina) return a.godzina === null ? 1 : b.godzina === null ? -1 : a.godzina < b.godzina ? -1 : 1
  if (a.zlecenieId !== b.zlecenieId) return a.zlecenieId < b.zlecenieId ? -1 : 1
  return porownajDni(a.dataPierwotna, b.dataPierwotna)
}

/**
 * Wiersz wizyty z klientem z karty i nazwa zlecenia.
 * @param {StanZlecen} stan @param {Zlecenie} z @param {WystapienieZlecenia} w @param {NazwaUslugi} nazwaUslugi
 * @returns {WizytaDnia}
 */
function wiersz(stan, z, w, nazwaUslugi) {
  const k = klient(stan, z.klientId)
  const nazwa = z.opis ?? (z.uslugaId === null ? '' : nazwaUslugi(z.uslugaId))
  return { zlecenieId: z.id, klientId: z.klientId, klient: k, adres: k?.adres ?? null, nazwa, dataPierwotna: w.dataPierwotna,
    data: w.data, godzina: w.godzina, kwota: w.okres.cenaWizyty, stan: w.stan, odwolana: w.stan?.odwolana ?? false }
}

/**
 * Wizyty wszystkich zlecen w dniach `od`–`doDnia` (wlacznie), po dniu i godzinie; odwolane z flaga `odwolana`.
 * Zly dzien albo okno konczace sie przed `od` → BladKalendarza.
 * @param {StanZlecen} stan @param {string} od RRRR-MM-DD @param {string} doDnia RRRR-MM-DD @param {NazwaUslugi} nazwaUslugi
 * @returns {WizytaDnia[]}
 */
export function wizytyOkresu(stan, od, doDnia, nazwaUslugi) {
  sprawdzDzien(od)
  sprawdzDzien(doDnia)
  const wynik = stan.zlecenia.flatMap((z) => wystapienia(z, od, doDnia).map((w) => wiersz(stan, z, w, nazwaUslugi)))
  return wynik.sort(porownajWizyty)
}

/** @param {StanZlecen} stan @param {string} dzien RRRR-MM-DD @param {NazwaUslugi} nazwaUslugi @returns {WizytaDnia[]} */
export const wizytyDnia = (stan, dzien, nazwaUslugi) => wizytyOkresu(stan, dzien, dzien, nazwaUslugi)

/** Dzien zalozenia zlecenia w czasie lokalnym. @param {Zlecenie} z @returns {string} */
const dzienZalozenia = (z) => dzienLokalny(new Date(z.utworzone))

/** Zrobiona wizyta za wizyte bez zaplaty, z cena > 0 (wizyta za 0 zl nie czeka na zaplate). @param {Zlecenie} z @param {StanWizyty} s @param {Okres} okres */
const czekaNaZaplate = (z, s, okres) => z.rozliczenie === 'za_wizyte' && s.zrobiona !== null && s.zaplata === null && !s.odwolana &&
  (okres.cenaWizyty ?? 0) > 0

/**
 * „Do zamkniecia”: wizyty z dniem przed `dzis` i nie przed dniem zalozenia zlecenia, nieodwolane, niezrobione albo zrobione
 * i czekajace na zaplate (po „Zrobione” wiersz zostaje z „Zapłacone”); najstarsze najpierw.
 * @param {StanZlecen} stan @param {string} dzis RRRR-MM-DD @param {NazwaUslugi} nazwaUslugi
 * @returns {WizytaDnia[]}
 */
export function doZamkniecia(stan, dzis, nazwaUslugi) {
  const wczoraj = dodajDni(dzis, -1)
  const wynik = stan.zlecenia.flatMap((z) => {
    const od = dzienZalozenia(z)
    if (porownajDni(od, wczoraj) > 0) return []
    return wystapienia(z, od, wczoraj)
      .filter((w) => w.stan === null || (!w.stan.odwolana && (w.stan.zrobiona === null || czekaNaZaplate(z, w.stan, w.okres))))
      .map((w) => wiersz(stan, z, w, nazwaUslugi))
  })
  return wynik.sort(porownajWizyty)
}

/**
 * Kwota miesiaca serii jak przy zapisie zaplaty (src/dane/wizyty.js): cena okresu pierwszej wizyty z reguly w miesiacu,
 * a gdy regula nie daje juz wizyty w tym miesiacu — cena okresu zrobionej wizyty.
 * @param {Zlecenie} z @param {string} miesiac RRRR-MM @param {string} dataZrobionej RRRR-MM-DD @returns {number}
 */
function kwotaMiesiaca(z, miesiac, dataZrobionej) {
  const ostatni = ostatniDzienMiesiaca(Number(miesiac.slice(0, 4)), Number(miesiac.slice(5, 7)))
  const [pierwsza] = wystapienia({ ...z, wizyty: {} }, `${miesiac}-01`, `${miesiac}-${ostatni}`)
  return (pierwsza?.okres ?? okresWDniu(z, dataZrobionej)).cenaMiesiaca ?? 0
}

/**
 * Miesiace serii miesiecznej przed miesiacem `dzis` z co najmniej jedna zrobiona (nieodwolana) wizyta i bez zaplaty.
 * @param {Zlecenie} z @param {string} biezacyMiesiac RRRR-MM @returns {Niezaplacone[]}
 */
function niezaplaconeMiesiace(z, biezacyMiesiac) {
  /** @type {Map<string, string>} miesiac → data pierwotna pierwszej zrobionej wizyty */
  const zrobione = new Map()
  for (const [dataPierwotna, s] of Object.entries(z.wizyty)) {
    const miesiac = miesiacDnia(dataPierwotna)
    if (s.zrobiona === null || s.odwolana || miesiac >= biezacyMiesiac || Object.hasOwn(z.zaplatyMiesieczne, miesiac)) continue
    if (!zrobione.has(miesiac) || dataPierwotna < String(zrobione.get(miesiac))) zrobione.set(miesiac, dataPierwotna)
  }
  return [...zrobione].map(([miesiac, data]) => ({ rodzaj: /** @type {const} */ ('miesiac'), zlecenieId: z.id, klientId: z.klientId,
    klucz: miesiac, kwota: kwotaMiesiaca(z, miesiac, data) })).filter((n) => n.kwota > 0)
}

/** @param {Zlecenie} z @returns {Niezaplacone[]} zrobione wizyty za wizyte bez zaplaty z cena > 0, kazdego dnia */
function niezaplaconeWizyty(z) {
  return Object.entries(z.wizyty).flatMap(([dataPierwotna, s]) => {
    const okres = okresWDniu(z, dataPierwotna)
    if (!czekaNaZaplate(z, s, okres)) return []
    return [{ rodzaj: /** @type {const} */ ('wizyta'), zlecenieId: z.id, klientId: z.klientId, klucz: dataPierwotna, kwota: okres.cenaWizyty ?? 0 }]
  })
}

/**
 * „Niezaplacone” (R26): zrobione wizyty za wizyte bez zaplaty z cena > 0 i miesiace serii miesiecznych przed biezacym
 * miesiacem ze zrobiona wizyta i bez zaplaty; najstarsze najpierw. Z `klientId` tylko pozycje tego klienta.
 * @param {StanZlecen} stan @param {string} dzis RRRR-MM-DD @param {string} [klientId]
 * @returns {Niezaplacone[]}
 */
export function niezaplacone(stan, dzis, klientId) {
  const biezacyMiesiac = miesiacDnia(dzis)
  const zlecenia = klientId === undefined ? stan.zlecenia : stan.zlecenia.filter((z) => z.klientId === klientId)
  const wynik = zlecenia.flatMap((z) => (z.rozliczenie === 'miesiecznie' ? niezaplaconeMiesiace(z, biezacyMiesiac) : niezaplaconeWizyty(z)))
  return wynik.sort((a, b) => (a.klucz !== b.klucz ? (a.klucz < b.klucz ? -1 : 1) : a.zlecenieId < b.zlecenieId ? -1 : 1))
}

/** „Dziś N zleceń”: nieodwolane wizyty dnia `dzis`. @param {StanZlecen} stan @param {string} dzis RRRR-MM-DD @returns {number} */
export function liczbaDzis(stan, dzis) {
  sprawdzDzien(dzis)
  return stan.zlecenia.reduce((suma, z) => suma + wystapienia(z, dzis, dzis).filter((w) => !w.stan?.odwolana).length, 0)
}

/**
 * Najblizsza nieodwolana wizyta wszystkich zlecen od jutra (szukana w horyzoncie najblizszaWizyta); bez takiej null.
 * @param {StanZlecen} stan @param {string} dzis RRRR-MM-DD @param {NazwaUslugi} nazwaUslugi
 * @returns {WizytaDnia | null}
 */
export function najblizsza(stan, dzis, nazwaUslugi) {
  const jutro = dodajDni(dzis, 1)
  /** @type {WizytaDnia | null} */
  let wynik = null
  for (const z of stan.zlecenia) {
    const w = najblizszaWizyta(z, jutro)
    if (w === null) continue
    const kandydat = wiersz(stan, z, w, nazwaUslugi)
    if (wynik === null || porownajWizyty(kandydat, wynik) < 0) wynik = kandydat
  }
  return wynik
}
