// Dane ekranu startowego i listy wycen (czyste funkcje, bez DOM): zadania „do zrobienia”, podsumowanie miesiaca, opis tempa
// oraz adres wiersza wyceny. Kwote wiersza daje kwotaWyceny z src/dane/wyceny.js.

import { miesiacLokalny } from '../dane/ksztalt.js'
import { opisTempa } from '../silnik/tempo.js'
import { sprawdzDate } from '../ui/format.js'
import { sciezka } from '../ui/trasy.js'

/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/tempo.js').TempoWyceny} TempoWyceny */
/**
 * @typedef {'wyslij' | 'dokoncz'} RodzajZadania
 * @typedef {{ rodzaj: RodzajZadania, tytul: string, wycena: Wycena }} Zadanie
 * @typedef {{ wycen: number, przyjetych: number }} PodsumowanieMiesiaca
 */

export const TYTULY_ZADAN = Object.freeze({ wyslij: 'Wyślij ofertę', dokoncz: 'Dokończ wycenę' })

const JEZYK = 'pl-PL'
const formatMiesiaca = new Intl.DateTimeFormat(JEZYK, { month: 'long' })

/** @param {Wycena} w @returns {RodzajZadania | null} */
function rodzajZadania(w) {
  if (w.status === 'do_wyslania') return 'wyslij'
  if (w.status === 'szkic') return 'dokoncz'
  return null
}

/**
 * Lista „Do zrobienia”: do wysłania → „Wyślij ofertę”, szkic → „Dokończ wycenę”; najstarsze (data utworzenia) najpierw. Czas
 * pracy wpisuje sie przy wizycie zlecenia, nie przy wycenie.
 * @param {readonly Wycena[]} wyceny
 * @returns {Zadanie[]}
 */
export function doZrobienia(wyceny) {
  /** @type {Zadanie[]} */
  const zadania = []
  for (const w of wyceny) {
    const rodzaj = rodzajZadania(w)
    if (rodzaj) zadania.push({ rodzaj, tytul: TYTULY_ZADAN[rodzaj], wycena: w })
  }
  return zadania.sort((a, b) => Date.parse(a.wycena.utworzona) - Date.parse(b.wycena.utworzona))
}

/**
 * Karta miesiaca: zapisane wyceny utworzone w miesiacu `dzis` (bez szkicow) i z nich przyjete. Realna stawka z wizyt wraca
 * w nowym ekranie Start (karta pokazuje do tego czasu „—”).
 * @param {readonly Wycena[]} wyceny
 * @param {Date} dzis
 * @returns {PodsumowanieMiesiaca}
 */
export function podsumowanieMiesiaca(wyceny, dzis) {
  const miesiac = miesiacLokalny(sprawdzDate(dzis))
  const zMiesiaca = wyceny.filter((w) => w.status !== 'szkic' && miesiacLokalny(new Date(w.utworzona)) === miesiac)
  return { wycen: zMiesiaca.length, przyjetych: zMiesiaca.filter((w) => w.status === 'przyjeta').length }
}

/** @param {Date} dzis @returns {string} „Październik” */
export function nazwaMiesiaca(dzis) {
  const nazwa = formatMiesiaca.format(sprawdzDate(dzis))
  return nazwa.charAt(0).toLocaleUpperCase(JEZYK) + nazwa.slice(1)
}

/**
 * Wiersz tempa w karcie miesiaca: etykieta i wartosc, razem np. „Twoje tempo 1,18× normy · z 7 zleceń”.
 * @param {TempoWyceny} tempo wynik tempoDoWyceny
 * @returns {{ etykieta: string, wartosc: string }}
 */
export function wierszTempa(tempo) {
  // opisTempa przy tempie recznym daje sama krotnosc („1,18×”); zrodlo opisuje ta funkcja.
  const krotnosc = opisTempa({ ...tempo, zrodlo: 'reczne' })
  if (tempo.zrodlo === 'usluga' || tempo.zrodlo === 'wspolne') {
    return { etykieta: 'Twoje tempo', wartosc: `${krotnosc} normy · z ${tempo.liczba} zleceń` }
  }
  const opis = tempo.zrodlo === 'reczne' ? 'ustawione ręcznie' : 'domyślne dla nowej firmy'
  return { etykieta: 'Tempo', wartosc: `${krotnosc} normy · ${opis}` }
}

/**
 * Adres wiersza wyceny: szkic wraca do kreatora (dokładna) albo szybkiej wyceny, zapisana otwiera `#/wycena/<id>`.
 * @param {Wycena} w
 * @returns {string}
 */
export function adresWyceny(w) {
  if (w.status !== 'szkic') return sciezka('wycena', { id: w.id })
  return w.rodzaj === 'szybka' ? sciezka('szybka', {}, { wycena: w.id }) : sciezka('kreator', { krok: 'usluga' }, { wycena: w.id })
}

/** @param {string} nazwa @returns {string} pierwsza litera nazwy klienta, wielka; pusty tekst, gdy nazwy brak */
export function inicjal(nazwa) {
  const [pierwsza = ''] = Array.from(nazwa.trim())
  return pierwsza.toLocaleUpperCase(JEZYK)
}
