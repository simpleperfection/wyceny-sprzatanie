// Widok Tydzień (`#/zlecenia/tydzien`, makieta „Tydzień” w docs/operator/aplikacja-modulowa-makiety.html): lista 7 dni od
// poniedzialku, bo siatka 7 kolumn na 360 px nie miesci tekstu 17 px. Dzien z liczba wizyt, pod nim wiersze bez przyciskow
// zamkniecia (zamyka sie w widoku Dzień), a pusty dzien jednym zdaniem.

import { dzienLokalny } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { h } from '../ui/h.js'
import { karta } from '../ui/komponenty/uklad.js'
import { dzienKalendarza, modelTygodnia } from '../zlecenia/kalendarz-dane.js'
import { ekranKalendarza, wierszWizyty } from './zlecenia-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../zlecenia/kalendarz-dane.js').DzienTygodnia} DzienTygodnia */

const PUSTY_DZIEN = 'Brak wizyt'

/** @param {DzienTygodnia} d @returns {HTMLElement} */
function sekcjaDnia({ dzien, naglowek, czyDzis, opisLiczby, wizyty }) {
  const id = `kalendarz-dzien-${dzien}`
  return h('section', { class: 'kalendarz-tydzien__dzien', 'aria-labelledby': id },
    h('div', { class: ['kalendarz-tydzien__naglowek', czyDzis && 'kalendarz-tydzien__naglowek--dzis'] },
      h('h2', { class: 'kalendarz-tydzien__tytul', id }, naglowek),
      opisLiczby === null ? null : h('span', { class: 'kalendarz-tydzien__liczba' }, opisLiczby)),
    wizyty.length === 0
      ? h('p', { class: 'kalendarz-pusto' }, PUSTY_DZIEN)
      : karta({ klasa: 'karta--bez-odstepu' }, wizyty.map((w) => wierszWizyty(w))))
}

/** @type {Widok} */
export const widokTygodniaKalendarza = {
  render(kontener, { zapytanie, kontekst }) {
    const dzis = dzienLokalny(new Date())
    const dzien = dzienKalendarza(zapytanie, dzis)
    const { tytul, dni } = modelTygodnia(wczytajStan(kontekst.magazyn), kontekst.katalog, dzien, dzis)
    kontener.append(...ekranKalendarza({ widok: 'tydzien', dzien, dzis, tytul }, dni.map(sekcjaDnia)))
  },
}
