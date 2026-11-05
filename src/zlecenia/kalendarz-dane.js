// Modele ekranow kalendarza modulu Zlecenia (R14, R15, R26): Dzień z „Do zamknięcia” i przyciskami zamkniecia wizyty,
// Tydzień jako lista 7 dni od poniedzialku, Miesiąc jako siatka z liczba nieodwolanych wizyt. Czyste funkcje bez DOM i bez
// zapisu: stan odczytany raz na render i dzien `dzis` (dzienLokalny) przychodza w argumentach; wizyty licza zapytania
// z src/zlecenia/zapytania.js, a teksty dni i kwot src/ui/format.js.

import { jestDniem } from '../dane/ksztalt.js'
import { BladKalendarza, dodajDni, dzienWMiesiacu, ostatniDzienMiesiaca, poczatekTygodnia, porownajDni, siatkaMiesiaca } from '../kalendarz/daty.js'
import { dataDnia, dzienKrotko, FORMY, godzina, kwotaJednostki, miesiacRok, odmiana, zakresDni } from '../ui/format.js'
import { sciezka } from '../ui/trasy.js'
import { nazwyUslug, tekstTerminu } from './teksty-wizyty.js'
import { doZamkniecia, wizytyDnia, wizytyOkresu } from './zapytania.js'

/**
 * @typedef {import('../dane/magazyn.js').Stan} Stan
 * @typedef {import('../silnik/katalog.js').Katalog} Katalog
 * @typedef {import('./zapytania.js').WizytaDnia} WizytaDnia
 * @typedef {Pick<Stan, 'klienci' | 'zlecenia'>} StanZlecen
 * @typedef {'dzien' | 'tydzien' | 'miesiac'} WidokKalendarza
 * @typedef {'zrobione' | 'zaplacone'} AkcjaWizyty
 * @typedef {{ klucz: string, zlecenieId: string, dataPierwotna: string, tytul: string, miejsce: string | null, kwota: string,
 *   adres: string, akcje: AkcjaWizyty[], czyOdwolana: boolean, czyZrobiona: boolean, czyPrzesunieta: boolean }} WierszWizyty
 *   miejsce: adres klienta, a w „Do zamknięcia” dzien i godzina zaleglej wizyty; adres: ekran wizyty
 * @typedef {{ dzien: string, tytul: string, doZamkniecia: WierszWizyty[], wizyty: WierszWizyty[] }} ModelDnia
 * @typedef {{ dzien: string, naglowek: string, czyDzis: boolean, liczba: number, opisLiczby: string | null,
 *   wizyty: WierszWizyty[] }} DzienTygodnia
 * @typedef {{ dzien: string, numer: number, liczba: number, czyDzis: boolean, etykieta: string, adres: string }} KomorkaMiesiaca
 */

/** Przelaczniki widokow kalendarza (R14); kolejnosc to kolejnosc na ekranie. */
export const WIDOKI_KALENDARZA = Object.freeze(/** @type {const} */ ([
  { id: 'dzien', etykieta: 'Dzień' },
  { id: 'tydzien', etykieta: 'Tydzień' },
  { id: 'miesiac', etykieta: 'Miesiąc' },
]))

/** Kwota wizyty serii rozliczanej miesiecznie w kalendarzu i na ekranie wizyty. */
export const W_ABONAMENCIE = 'w abonamencie'
const BEZ_GODZINY = 'Bez godziny'
const DNI_TYGODNIA = 7
const MIESIECY_W_ROKU = 12
/** Liczby wizyt w siatce miesiaca nie pokazuja nazw uslug. */
const BEZ_NAZWY_USLUGI = () => ''

/** @param {unknown} x @returns {x is WidokKalendarza} */
export const jestWidokiemKalendarza = (x) => WIDOKI_KALENDARZA.some((w) => w.id === x)

/** @param {unknown} dzien @returns {asserts dzien is string} RRRR-MM-DD, inaczej BladKalendarza `dzien` */
function sprawdzDzien(dzien) {
  if (!jestDniem(dzien)) throw new BladKalendarza('dzien', `Dzień musi mieć postać RRRR-MM-DD, jest ${String(dzien)}`)
}

/** Dzien z zapytania `?data=`; brak albo zly dzien → `dzis`. @param {Record<string, string>} zapytanie @param {string} dzis @returns {string} */
export const dzienKalendarza = (zapytanie, dzis) => (jestDniem(zapytanie.data) ? zapytanie.data : dzis)

/** @param {WidokKalendarza} widok @param {string | null} dzien null: bez `?data=` (dzis) @returns {string} adres widoku kalendarza */
export const adresKalendarza = (widok, dzien) => sciezka('zlecenia', { widok }, dzien === null ? {} : { data: dzien })

/** @param {string} wycenaId @returns {string} adres formularza zlecenia z wyceny */
export const adresZaplanowania = (wycenaId) => sciezka('noweZlecenie', {}, { wycena: wycenaId })

/**
 * Przyciski wiersza od dnia wizyty (R15): „Zrobione” dla niezrobionej, „Zapłacone” dla rozliczenia za wizyte z cena > 0 bez
 * zaplaty; wizyta serii miesiecznej (bez ceny za wizyte) ma tylko „Zrobione” (R26), odwolana nie ma zadnego.
 * @param {WizytaDnia} w @param {string} dzis @returns {AkcjaWizyty[]}
 */
function akcjeWizyty(w, dzis) {
  if (w.odwolana || porownajDni(w.data, dzis) > 0) return []
  /** @type {AkcjaWizyty[]} */
  const akcje = []
  if ((w.stan?.zrobiona ?? null) === null) akcje.push('zrobione')
  if (w.czyPlatna && (w.stan?.zaplata ?? null) === null) akcje.push('zaplacone')
  return akcje
}

/**
 * @param {WizytaDnia} w @param {string} dzis
 * @param {{ czyZalegla: boolean, czyAkcje: boolean }} opcje czyZalegla: wiersz „Do zamknięcia” (dzien zamiast adresu)
 * @returns {WierszWizyty}
 */
function wierszWizyty(w, dzis, { czyZalegla, czyAkcje }) {
  const klient = w.klient?.nazwa ?? w.nazwa
  const czas = w.godzina === null ? null : godzina(w.godzina)
  return { klucz: `${w.zlecenieId}|${w.dataPierwotna}`, zlecenieId: w.zlecenieId, dataPierwotna: w.dataPierwotna,
    tytul: czyZalegla ? klient : `${czas ?? BEZ_GODZINY} · ${klient}`, miejsce: czyZalegla ? tekstTerminu(w.data, w.godzina) : w.adres,
    kwota: w.kwota === null ? W_ABONAMENCIE : kwotaJednostki(w.kwota), adres: sciezka('wizyta', { id: w.zlecenieId, data: w.dataPierwotna }),
    akcje: czyAkcje ? akcjeWizyty(w, dzis) : [], czyOdwolana: w.odwolana, czyZrobiona: (w.stan?.zrobiona ?? null) !== null,
    czyPrzesunieta: (w.stan?.przeniesiona ?? null) !== null }
}

/**
 * Widok Dzień: „Do zamknięcia” tylko dla dnia `dzis` (gdzie indziej pusta lista), potem wizyty dnia z przyciskami zamkniecia.
 * Zly dzien → BladKalendarza `dzien`.
 * @param {StanZlecen} stan @param {Pick<Katalog, 'uslugi'>} katalog @param {string} dzien RRRR-MM-DD @param {string} dzis RRRR-MM-DD
 * @returns {ModelDnia}
 */
export function modelDnia(stan, katalog, dzien, dzis) {
  sprawdzDzien(dzien)
  sprawdzDzien(dzis)
  const nazwaUslugi = nazwyUslug(katalog)
  const zalegle = dzien === dzis ? doZamkniecia(stan, dzis, nazwaUslugi) : []
  return { dzien, tytul: dzienKrotko(dzien),
    doZamkniecia: zalegle.map((w) => wierszWizyty(w, dzis, { czyZalegla: true, czyAkcje: true })),
    wizyty: wizytyDnia(stan, dzien, nazwaUslugi).map((w) => wierszWizyty(w, dzis, { czyZalegla: false, czyAkcje: true })) }
}

/**
 * Widok Tydzień: 7 dni od poniedzialku tygodnia dnia `dzien` z wizytami (bez przyciskow zamkniecia) i liczba nieodwolanych.
 * @param {StanZlecen} stan @param {Pick<Katalog, 'uslugi'>} katalog @param {string} dzien @param {string} dzis
 * @returns {{ tytul: string, dni: DzienTygodnia[] }}
 */
export function modelTygodnia(stan, katalog, dzien, dzis) {
  sprawdzDzien(dzis)
  const poniedzialek = poczatekTygodnia(dzien)
  const niedziela = dodajDni(poniedzialek, DNI_TYGODNIA - 1)
  const wizyty = wizytyOkresu(stan, poniedzialek, niedziela, nazwyUslug(katalog))
  const dni = Array.from({ length: DNI_TYGODNIA }, (_, i) => {
    const d = dodajDni(poniedzialek, i)
    const wizytyDnia = wizyty.filter((w) => w.data === d)
    const liczba = wizytyDnia.filter((w) => !w.odwolana).length
    return { dzien: d, naglowek: dzienKrotko(d), czyDzis: d === dzis, liczba, opisLiczby: liczba === 0 ? null : `${liczba} ${odmiana(liczba, FORMY.wizyta)}`,
      wizyty: wizytyDnia.map((w) => wierszWizyty(w, dzis, { czyZalegla: false, czyAkcje: false })) }
  })
  return { tytul: zakresDni(poniedzialek, niedziela), dni }
}

/**
 * Widok Miesiąc: tygodnie od poniedzialku (dni spoza miesiaca to null) z liczba nieodwolanych wizyt; dotkniecie dnia
 * otwiera widok Dzień. Zly miesiac → BladKalendarza `miesiac`.
 * @param {StanZlecen} stan @param {number} rok @param {number} miesiac 1–12 @param {string} dzis
 * @returns {{ tytul: string, tygodnie: (KomorkaMiesiaca | null)[][] }}
 */
export function modelMiesiaca(stan, rok, miesiac, dzis) {
  sprawdzDzien(dzis)
  const pierwszy = dzienWMiesiacu(rok, miesiac, 1)
  const ostatni = dzienWMiesiacu(rok, miesiac, ostatniDzienMiesiaca(rok, miesiac))
  /** @type {Map<string, number>} */
  const liczby = new Map()
  for (const w of wizytyOkresu(stan, pierwszy, ostatni, BEZ_NAZWY_USLUGI)) {
    if (!w.odwolana) liczby.set(w.data, (liczby.get(w.data) ?? 0) + 1)
  }
  /** @param {string | null} d @returns {KomorkaMiesiaca | null} */
  const komorka = (d) => {
    if (d === null) return null
    const liczba = liczby.get(d) ?? 0
    const etykieta = liczba === 0 ? dataDnia(d) : `${dataDnia(d)}, ${liczba} ${odmiana(liczba, FORMY.wizyta)}`
    return { dzien: d, numer: Number(d.slice(8)), liczba, czyDzis: d === dzis, etykieta, adres: adresKalendarza('dzien', d) }
  }
  return { tytul: miesiacRok(pierwszy), tygodnie: siatkaMiesiaca(rok, miesiac).map((tydzien) => tydzien.map(komorka)) }
}

/**
 * Dzien sasiedniego okresu widoku: dzien obok, ten sam dzien tygodnia obok albo ten sam dzien miesiaca obok (w krotszym
 * miesiacu ostatni). Nieznany widok → BladKalendarza `widok`, kierunek inny niz −1 i 1 → `kierunek`.
 * @param {WidokKalendarza} widok @param {string} dzien RRRR-MM-DD @param {-1 | 1} kierunek @returns {string}
 */
export function sasiedni(widok, dzien, kierunek) {
  if (kierunek !== -1 && kierunek !== 1) throw new BladKalendarza('kierunek', `Kierunek to -1 albo 1, jest ${String(kierunek)}`)
  if (widok === 'dzien') return dodajDni(dzien, kierunek)
  if (widok === 'tydzien') return dodajDni(dzien, kierunek * DNI_TYGODNIA)
  if (widok !== 'miesiac') throw new BladKalendarza('widok', `Nieznany widok kalendarza: ${String(widok)}`)
  sprawdzDzien(dzien)
  const indeks = Number(dzien.slice(0, 4)) * MIESIECY_W_ROKU + Number(dzien.slice(5, 7)) - 1 + kierunek
  return dzienWMiesiacu(Math.floor(indeks / MIESIECY_W_ROKU), (indeks % MIESIECY_W_ROKU) + 1, Number(dzien.slice(8)))
}
