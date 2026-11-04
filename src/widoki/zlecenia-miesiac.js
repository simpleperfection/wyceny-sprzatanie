// Widok Miesiąc (`#/zlecenia/miesiac`, makieta „Miesiąc” w docs/operator/aplikacja-modulowa-makiety.html): siatka pn–nd
// z numerem dnia i liczba nieodwolanych wizyt, dzisiaj na zielonym kole, a dotkniecie dnia otwiera widok Dzień. Tabela, zeby
// czytnik ekranu podawal dzien tygodnia kolumny; dni spoza miesiaca to puste komorki.

import { dzienLokalny } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { SKROTY_DNI } from '../ui/format.js'
import { h } from '../ui/h.js'
import { dzienKalendarza, modelMiesiaca } from '../zlecenia/kalendarz-dane.js'
import { ekranKalendarza } from './zlecenia-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../zlecenia/kalendarz-dane.js').KomorkaMiesiaca} KomorkaMiesiaca */

/** @param {KomorkaMiesiaca | null} komorka @returns {HTMLTableCellElement} */
function komorkaDnia(komorka) {
  if (komorka === null) return h('td', { class: 'kalendarz-miesiac__komorka' })
  const { numer, liczba, czyDzis, etykieta, adres } = komorka
  return h('td', { class: 'kalendarz-miesiac__komorka' },
    h('a', { class: ['kalendarz-miesiac__dzien', czyDzis && 'kalendarz-miesiac__dzien--dzis'], href: adres, 'aria-label': etykieta,
      'aria-current': czyDzis ? 'date' : null },
    h('span', { class: 'kalendarz-miesiac__numer' }, numer),
    liczba === 0 ? null : h('span', { class: 'kalendarz-miesiac__liczba' }, liczba)))
}

/** @param {(KomorkaMiesiaca | null)[][]} tygodnie @returns {HTMLTableElement} */
function siatka(tygodnie) {
  return h('table', { class: 'kalendarz-miesiac' },
    h('thead', null, h('tr', null, SKROTY_DNI.map((skrot) => h('th', { class: 'kalendarz-miesiac__dzien-tygodnia', scope: 'col' }, skrot)))),
    h('tbody', null, tygodnie.map((tydzien) => h('tr', null, tydzien.map(komorkaDnia)))))
}

/** @type {Widok} */
export const widokMiesiacaKalendarza = {
  render(kontener, { zapytanie, kontekst }) {
    const dzis = dzienLokalny(new Date())
    const dzien = dzienKalendarza(zapytanie, dzis)
    const [rok, miesiac] = dzien.split('-').map(Number)
    const { tytul, tygodnie } = modelMiesiaca(wczytajStan(kontekst.magazyn), rok, miesiac, dzis)
    kontener.append(...ekranKalendarza({ widok: 'miesiac', dzien, dzis, tytul }, siatka(tygodnie)))
  },
}
