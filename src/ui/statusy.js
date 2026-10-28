// Statusy wyceny w interfejsie: etykiety (rejestr stalych planu etapu 5, zrodlo: IU-10) i pigulka statusu.
// Lista statusow pochodzi z STATUSY_WYCENY w src/dane/wyceny.js; kolory pigulek sa w src/style/komponenty.css.

import { h } from './h.js'

/** @typedef {import('../dane/wyceny.js').StatusWyceny} StatusWyceny */

/** @type {Readonly<Record<StatusWyceny, string>>} */
export const ETYKIETY_STATUSOW = Object.freeze({
  szkic: 'Szkic',
  do_wyslania: 'Do wysłania',
  wyslana: 'Wysłana',
  przyjeta: 'Przyjęta',
  odrzucona: 'Odrzucona',
  wykonana: 'Wykonana',
})

/**
 * Pigulka statusu; klasa `pigulka--<status>` daje kolor (do wysłania — uwaga, wysłana — tlo akcji, przyjęta — sukces).
 * @param {StatusWyceny} status
 * @returns {HTMLSpanElement}
 */
export function pigulkaStatusu(status) {
  if (!Object.hasOwn(ETYKIETY_STATUSOW, status)) throw new RangeError(`Nieznany status wyceny: ${String(status)}`)
  return h('span', { class: ['pigulka', `pigulka--${status}`] }, ETYKIETY_STATUSOW[status])
}
