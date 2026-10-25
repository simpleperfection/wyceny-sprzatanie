// Dane ekranu startowego i listy wycen (czyste funkcje, bez DOM): zadania „do zrobienia”, podsumowanie miesiaca
// z realna stawka z wykonan, opis tempa oraz kwota i adres wiersza wyceny.

import { dzienLokalny, miesiacLokalny } from '../dane/ksztalt.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { kosztZlecenia } from '../silnik/koszt.js'
import { opisTempa } from '../silnik/tempo.js'
import { sprawdzStatusVat, zCenyRecznej } from '../silnik/vat.js'
import { sprawdzDate } from '../ui/format.js'
import { sciezka } from '../ui/trasy.js'

/** Zla data dnia to BladFormatu `zla_data` ze wspolnego straznika sprawdzDate (src/ui/format.js); nazwa dla wywolujacych start-dane. */
export { BladFormatu as BladDaty } from '../ui/format.js'

/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').MigawkaWyniku} MigawkaWyniku */
/** @typedef {import('../dane/wyceny.js').Wykonanie} Wykonanie */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').KosztyFirmy} KosztyFirmy */
/** @typedef {import('../silnik/cena.js').WynikWyceny} WynikWyceny */
/** @typedef {import('../silnik/tempo.js').TempoWyceny} TempoWyceny */
/**
 * @typedef {'wyslij' | 'czas' | 'dokoncz'} RodzajZadania
 * @typedef {{ rodzaj: RodzajZadania, tytul: string, wycena: Wycena }} Zadanie
 * @typedef {{ wycen: number, przyjetych: number, stawka: number | null, pominiete: number }} PodsumowanieMiesiaca
 *   stawka: srednia realna stawka (zl/h) z wykonan miesiaca; pominiete: wykonania, ktorych stawki nie da sie policzyc
 * @typedef {{ katalog: Katalog, koszty: KosztyFirmy }} DaneKosztow koszty: koszty_firmy scalone z ustawieniami (scalKoszty)
 */

export const TYTULY_ZADAN = Object.freeze({ wyslij: 'Wyślij ofertę', czas: 'Wpisz czas pracy', dokoncz: 'Dokończ wycenę' })

const JEZYK = 'pl-PL'
/** Termin klienta zaczyna sie od dnia RRRR-MM-DD (pole daty albo daty i godziny). */
const DZIEN_TERMINU = /^(\d{4}-\d{2}-\d{2})/
const formatMiesiaca = new Intl.DateTimeFormat(JEZYK, { month: 'long' })

/** Przyjete zlecenie czeka na czas pracy: bez terminu, z terminem do dzis albo z terminem, ktorego dnia nie da sie odczytac. */
function czyCzekaNaCzas(/** @type {string | null} */ termin, /** @type {string} */ dzis) {
  if (termin === null) return true
  const dzien = DZIEN_TERMINU.exec(termin)
  return dzien === null || dzien[1] <= dzis
}

/** @param {Wycena} w @param {string} dzis @returns {RodzajZadania | null} */
function rodzajZadania(w, dzis) {
  if (w.status === 'do_wyslania') return 'wyslij'
  if (w.status === 'szkic') return 'dokoncz'
  if (w.status === 'przyjeta' && czyCzekaNaCzas(w.klient.termin, dzis)) return 'czas'
  return null
}

/**
 * Lista „Do zrobienia”: do wysłania → „Wyślij ofertę”, przyjęta z terminem do dziś albo bez terminu → „Wpisz czas pracy”,
 * szkic → „Dokończ wycenę”; najstarsze (data utworzenia) najpierw.
 * @param {readonly Wycena[]} wyceny
 * @param {Date} dzis
 * @returns {Zadanie[]}
 */
export function doZrobienia(wyceny, dzis) {
  const dzien = dzienLokalny(sprawdzDate(dzis))
  /** @type {Zadanie[]} */
  const zadania = []
  for (const w of wyceny) {
    const rodzaj = rodzajZadania(w, dzien)
    if (rodzaj) zadania.push({ rodzaj, tytul: TYTULY_ZADAN[rodzaj], wycena: w })
  }
  return zadania.sort((a, b) => Date.parse(a.wycena.utworzona) - Date.parse(b.wycena.utworzona))
}

/**
 * Migawka w ksztalcie wyniku silnika; kosztZlecenia czyta z niego tylko linie, dojazd, minutyNormowe i wizytWMiesiacu.
 * @param {MigawkaWyniku} m
 * @returns {WynikWyceny}
 */
function wynikZMigawki(m) {
  return { linie: m.linie, propozycje: m.propozycje, cenaUslugi: m.cena - m.dojazd.kwota, minimum: 0, czyMinimum: false, dojazd: m.dojazd,
    cena: m.cena, cenaZaokraglona: m.cena, minutyNormowe: m.minutyNormowe, wizytWMiesiacu: m.wizytWMiesiacu, cenaMiesieczna: null,
    podstawaCeny: m.podstawaCeny }
}

/**
 * Realna stawka wykonania: ile zostaje za godzine faktycznej pracy przy cenie wyceny (reczna wygrywa), tempo = fakt / norma.
 * @param {MigawkaWyniku} wynik @param {number | null} cenaReczna @param {Wykonanie} wykonanie @param {DaneKosztow} dane
 * @returns {number | null} null, gdy migawki nie da sie policzyc z biezacym katalogiem (np. pozycja usunieta z danych)
 */
function realnaStawka(wynik, cenaReczna, wykonanie, { katalog, koszty }) {
  try {
    const statusVat = wynik.statusVat
    sprawdzStatusVat(statusVat)
    const cenaKlienta = cenaReczna === null ? { brutto: wynik.cena, netto: wynik.netto, vat: wynik.vat }
      : zCenyRecznej(cenaReczna, statusVat, wynik.stawkaVatProc)
    const tempo = wykonanie.minuty / wynik.minutyNormowe
    return kosztZlecenia({ wynik: wynikZMigawki(wynik), cenaKlienta, tempo, koszty, statusVat }, katalog).zostajeNaGodzine
  } catch (blad) {
    if (blad instanceof BladWejscia || blad instanceof BladKatalogu) return null
    throw blad
  }
}

/**
 * Karta miesiaca: zapisane wyceny utworzone w miesiacu `dzis` (bez szkicow), z nich przyjete (przyjęta + wykonana) i srednia
 * realna stawka z wykonan, ktorych data wypada w tym miesiacu.
 * @param {readonly Wycena[]} wyceny
 * @param {Date} dzis
 * @param {DaneKosztow} dane
 * @returns {PodsumowanieMiesiaca}
 */
export function podsumowanieMiesiaca(wyceny, dzis, dane) {
  const miesiac = miesiacLokalny(sprawdzDate(dzis))
  const zMiesiaca = wyceny.filter((w) => w.status !== 'szkic' && miesiacLokalny(new Date(w.utworzona)) === miesiac)
  /** @type {number[]} */
  const stawki = []
  let pominiete = 0
  for (const w of wyceny) {
    if (w.wynik === null) continue
    for (const wykonanie of w.wykonania) {
      if (!wykonanie.data.startsWith(`${miesiac}-`)) continue
      const stawka = realnaStawka(w.wynik, w.cenaReczna, wykonanie, dane)
      if (stawka === null) pominiete += 1
      else stawki.push(stawka)
    }
  }
  return {
    wycen: zMiesiaca.length,
    przyjetych: zMiesiaca.filter((w) => w.status === 'przyjeta' || w.status === 'wykonana').length,
    stawka: stawki.length === 0 ? null : stawki.reduce((suma, s) => suma + s, 0) / stawki.length,
    pominiete,
  }
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

/** @param {Wycena} w @returns {number | null} kwota dla klienta (cena reczna wygrywa); null, gdy szkic nie ma jeszcze ceny */
export const kwotaWyceny = (w) => w.cenaReczna ?? w.wynik?.cena ?? null

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
