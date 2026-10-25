// Rama krokow kreatora dokladnej wyceny z makiet: naglowek „Nowa wycena” / „Wycena {numer}” ze strzalka wstecz i podtytulem
// „Krok n z 5 · …”, pasek postepu, tresc kroku i stopka z „Razem” (kroki zakresu i dodatkow) oraz „Dalej”. Do tego wybor
// widoku kroku z adresu `#/kreator/:krok` i teksty bledow zapisu wspolne dla wszystkich krokow.

import { BladMagazynu } from '../dane/magazyn.js'
import { BladWyceny, MAKS_WYCEN } from '../dane/wyceny.js'
import { bledyKroku, KROKI_KREATORA } from '../kreator/stan.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { naglowek, pasekPostepu } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/stan.js').KrokKreatora} KrokKreatora */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/**
 * @typedef {{ krok: KrokKreatora, wycena: Wycena | null, katalog: Katalog, tresc: Node[], naDalej: () => void,
 *   opisKwoty?: string }} OpcjeRamy opisKwoty: tekst nad kwota w stopce zamiast „Razem” (np. metraz i czas w kroku pomieszczen)
 * @typedef {{ elementy: Node[], dalej: HTMLButtonElement | HTMLAnchorElement }} RamaKroku
 */

/** Kroki ze stopka „Razem {kwota}” (makiety kreator-pomieszczenia, kreator-pozycje, kreator-dodatki). */
const KROKI_Z_KWOTA = new Set(['zakres', 'dodatki'])
/** @type {ReadonlyMap<string, string>} */
const TEKSTY_BLEDOW_WYCENY = new Map([
  ['tylko_odczyt', 'Ta wycena jest wykonana – można ją tylko przeglądać.'],
  ['brak_wyceny', 'Nie ma już tej wyceny. Mogła zostać usunięta w innej karcie przeglądarki.'],
  ['limit_wycen', `Masz już ${MAKS_WYCEN} zapisanych wycen. Usuń niepotrzebne, żeby dodać nową.`],
])
const BLAD_ZAPISU_WYCENY = 'Nie udało się zapisać wyceny. Spróbuj jeszcze raz.'
const BLAD_LICZENIA = 'Nie udało się policzyć ceny dla tych danych. Sprawdź wybraną usługę i wpisany zakres.'

/** @param {KrokKreatora} krok */
const indeksKroku = (krok) => KROKI_KREATORA.findIndex((k) => k.id === krok)

/**
 * Adres kroku kreatora; z wycena — z zapytaniem `?wycena=<id>`.
 * @param {KrokKreatora} krok @param {string | null} [id]
 * @returns {string}
 */
export const adresKroku = (krok, id = null) => sciezka('kreator', { krok }, id ? { wycena: id } : {})

/** @param {KrokKreatora} krok @param {Wycena | null} wycena */
function adresWstecz(krok, wycena) {
  const poprzedni = KROKI_KREATORA[indeksKroku(krok) - 1]
  if (poprzedni) return adresKroku(poprzedni.id, wycena?.id)
  return wycena?.numer ? sciezka('wycena', { id: wycena.id }) : sciezka('start')
}

/** @param {KrokKreatora} krok @param {Wycena | null} wycena @param {Katalog} katalog */
function opisKroku(krok, wycena, katalog) {
  if (krok === 'zakres' && wycena) return katalog.usluga(wycena.wejscie.uslugaId).nazwa
  return KROKI_KREATORA[indeksKroku(krok)]?.etykieta.toLowerCase() ?? krok
}

/** @param {KrokKreatora} krok @param {Wycena | null} wycena @param {Katalog} katalog @param {string} opis @returns {HTMLElement | null} */
function razem(krok, wycena, katalog, opis) {
  if (!KROKI_Z_KWOTA.has(krok) || !wycena?.wynik || bledyKroku('zakres', wycena, katalog).length > 0) return null
  return h('p', { class: 'stopka-kreatora__razem' },
    h('span', { class: 'stopka-kreatora__etykieta' }, opis),
    h('span', { class: 'stopka-kreatora__kwota liczba' }, zl(wycena.wynik.cena)))
}

/**
 * Rama kroku: naglowek, pasek postepu, tresc i stopka. „Dalej” jest zablokowane, gdy krok ma bledy (`bledyKroku`) — poza
 * krokiem uslugi, ktory sprawdza wybor sam (wybor nie jest jeszcze zapisany w wycenie).
 * @param {OpcjeRamy} opcje
 * @returns {RamaKroku}
 */
export function ramaKroku({ krok, wycena, katalog, tresc, naDalej, opisKwoty = 'Razem' }) {
  const indeks = indeksKroku(krok)
  const czyZablokowany = krok !== 'usluga' && wycena !== null && bledyKroku(krok, wycena, katalog).length > 0
  const dalej = przycisk({ tekst: 'Dalej', naKlik: naDalej, czyWylaczony: czyZablokowany })
  return {
    dalej,
    elementy: [
      naglowek({
        tytul: wycena?.numer ? `Wycena ${wycena.numer}` : 'Nowa wycena',
        podtytul: `Krok ${indeks + 1} z ${KROKI_KREATORA.length} · ${opisKroku(krok, wycena, katalog)}`,
        wstecz: adresWstecz(krok, wycena),
      }),
      pasekPostepu(KROKI_KREATORA.map((k) => k.etykieta), indeks),
      h('div', { class: 'tresc kreator__tresc' }, tresc),
      h('div', { class: 'stopka-kreatora' }, razem(krok, wycena, katalog, opisKwoty), dalej),
    ],
  }
}

/**
 * Tekst bledu operacji kreatora dla uzytkownika. Odmowa (wycena wykonana, usunieta, limit wycen) ma wlasny tekst i nie jest
 * zglaszana; awaria zapisu albo liczenia ceny jest zglaszana przez `reportError`. Inne bledy leca dalej (ekran bledu routera).
 * @param {unknown} blad
 * @returns {string}
 */
export function zglosBladKreatora(blad) {
  if (blad instanceof BladWyceny) {
    const tekst = TEKSTY_BLEDOW_WYCENY.get(blad.kod)
    if (tekst) return tekst
    reportError(blad)
    return BLAD_ZAPISU_WYCENY
  }
  if (blad instanceof BladMagazynu) {
    reportError(blad)
    return tekstBleduZapisu(blad)
  }
  if (!(blad instanceof BladWejscia) && !(blad instanceof BladKatalogu)) throw blad
  reportError(blad)
  return BLAD_LICZENIA
}

/**
 * Widok trasy `#/kreator/:krok`: widok kroku z `widokiKrokow`, a nieznany krok — `nieZnaleziono`.
 * @param {Partial<Record<KrokKreatora, Widok>>} widokiKrokow @param {Widok} nieZnaleziono
 * @returns {Widok}
 */
export function widokKreatora(widokiKrokow, nieZnaleziono) {
  return {
    render(kontener, argumenty) {
      const krok = KROKI_KREATORA.find((k) => k.id === argumenty.parametry.krok)?.id
      const widok = (krok && widokiKrokow[krok]) || nieZnaleziono
      return widok.render(kontener, argumenty)
    },
  }
}
