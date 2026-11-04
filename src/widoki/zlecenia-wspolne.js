// Elementy wspolne widokow kalendarza (makiety „Dzień”, „Tydzień”, „Miesiąc” w docs/operator/aplikacja-modulowa-makiety.html):
// powrot „Start”, tytul „Zlecenia”, przelaczniki zachowujace dzien, pasek daty ze strzalkami i „Dziś”, wiersz wizyty i przycisk
// „Nowe zlecenie”. Dane i teksty licza czyste modele z src/zlecenia/kalendarz-dane.js; tu tylko DOM.

import { h, ikona } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { naglowek, przelaczniki, wiersz } from '../ui/komponenty/uklad.js'
import { pigulkaWizyty } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { adresKalendarza, sasiedni, WIDOKI_KALENDARZA } from '../zlecenia/kalendarz-dane.js'

/** @typedef {import('../ui/h.js').Dzieci} Dzieci */
/** @typedef {import('../ui/ikony.js').NazwaIkony} NazwaIkony */
/** @typedef {import('../zlecenia/kalendarz-dane.js').WidokKalendarza} WidokKalendarza */
/** @typedef {import('../zlecenia/kalendarz-dane.js').WierszWizyty} WierszWizyty */
/**
 * @typedef {{ widok: WidokKalendarza, dzien: string, dzis: string, tytul: string }} OpcjeEkranu
 *   tytul: tekst paska daty, np. „pn 2 lis”, „2–8 lis”, „Listopad 2026”
 */

/** Etykiety strzalek paska daty dla czytnika ekranu. @type {Readonly<Record<WidokKalendarza, { poprzedni: string, nastepny: string }>>} */
const ETYKIETY_STRZALEK = Object.freeze({
  dzien: { poprzedni: 'Poprzedni dzień', nastepny: 'Następny dzień' },
  tydzien: { poprzedni: 'Poprzedni tydzień', nastepny: 'Następny tydzień' },
  miesiac: { poprzedni: 'Poprzedni miesiąc', nastepny: 'Następny miesiąc' },
})

/** @param {string} adres @param {string} etykieta @param {NazwaIkony} nazwaIkony @returns {HTMLAnchorElement} */
const strzalka = (adres, etykieta, nazwaIkony) => h('a', { class: 'kalendarz-data__strzalka', href: adres, 'aria-label': etykieta }, ikona(nazwaIkony))

/** @param {WidokKalendarza} widok @param {string} dzien @param {string} tytul @returns {HTMLElement} */
function pasekDaty(widok, dzien, tytul) {
  const { poprzedni, nastepny } = ETYKIETY_STRZALEK[widok]
  return h('div', { class: 'kalendarz-data' },
    strzalka(adresKalendarza(widok, sasiedni(widok, dzien, -1)), poprzedni, 'chevron-left'),
    h('p', { class: 'kalendarz-data__tytul' }, tytul),
    strzalka(adresKalendarza(widok, sasiedni(widok, dzien, 1)), nastepny, 'chevron-right'),
    przycisk({ tekst: 'Dziś', rodzaj: 'drugi', adres: adresKalendarza(widok, null) }))
}

/**
 * Ekran widoku kalendarza: naglowek modulu, przelaczniki i pasek daty nad trescia widoku.
 * @param {OpcjeEkranu} opcje @param {...Dzieci} tresc @returns {HTMLElement[]}
 */
export function ekranKalendarza({ widok, dzien, dzis, tytul }, ...tresc) {
  const dzienAdresu = dzien === dzis ? null : dzien
  const pozycje = WIDOKI_KALENDARZA.map(({ id, etykieta }) => ({ tekst: etykieta, adres: adresKalendarza(id, dzienAdresu), czyAktywna: id === widok }))
  return [
    naglowek({ tytul: 'Zlecenia', wstecz: sciezka('start'), wsteczTekst: 'Start' }),
    h('div', { class: 'tresc' }, przelaczniki(pozycje, 'Widok kalendarza'), pasekDaty(widok, dzien, tytul), ...tresc),
  ]
}

/** Pigulka wiersza wizyty (jedna): odwolanie, potem zrobienie, potem przesuniecie. @param {WierszWizyty} w @returns {HTMLElement | undefined} */
function pigulkaWiersza({ czyOdwolana, czyZrobiona, czyPrzesunieta }) {
  if (czyOdwolana) return pigulkaWizyty('odwolana')
  if (czyZrobiona) return pigulkaWizyty('zrobiona')
  return czyPrzesunieta ? pigulkaWizyty('przesunieta') : undefined
}

/**
 * Wiersz wizyty w dwoch liniach → ekran wizyty: za dlugi adres ucina sie wielokropkiem, a kwota zostaje widoczna.
 * @param {WierszWizyty} w @returns {HTMLElement}
 */
export function wierszWizyty(w) {
  const element = wiersz({ tytul: w.tytul, opis: w.kwota, adres: w.adres, dodatek: pigulkaWiersza(w) })
  if (w.czyOdwolana) element.classList.add('wiersz--odwolana')
  if (w.miejsce !== null) {
    element.querySelector('.wiersz__opis')?.replaceChildren(
      h('span', { class: 'wiersz__miejsce' }, w.miejsce),
      h('span', { class: 'wiersz__kwota' }, ` · ${w.kwota}`))
  }
  return element
}

/** @param {string} dzien RRRR-MM-DD @returns {HTMLElement} przycisk do formularza zlecenia z tym dniem */
export const przyciskNowegoZlecenia = (dzien) => przycisk({ tekst: 'Nowe zlecenie', rodzaj: 'drugi', ikona: 'plus',
  adres: sciezka('noweZlecenie', {}, { data: dzien }) })
