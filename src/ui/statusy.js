// Statusy w interfejsie: etykiety i pigulki wyceny (rejestr stalych planu etapu 5, zrodlo: IU-10), etykiety form zaplaty
// (zrodlo: IU-17) i pigulki wizyty. Lista statusow wyceny pochodzi z STATUSY_WYCENY w src/dane/wyceny.js; kolory pigulek
// wyceny sa w src/style/komponenty.css, a wizyty w src/style/zlecenia.css.

import { h } from './h.js'

/** @typedef {import('../dane/wyceny.js').StatusWyceny} StatusWyceny */
/** @typedef {import('../dane/zlecenia-ksztalt.js').FormaZaplaty} FormaZaplaty */
/** @typedef {keyof typeof ETYKIETY_WIZYTY} StanPigulkiWizyty */

/** @type {Readonly<Record<StatusWyceny, string>>} */
export const ETYKIETY_STATUSOW = Object.freeze({
  szkic: 'Szkic',
  do_wyslania: 'Do wysłania',
  wyslana: 'Wysłana',
  przyjeta: 'Przyjęta',
  odrzucona: 'Odrzucona',
})

/** @type {Readonly<Record<FormaZaplaty, string>>} */
export const ETYKIETY_FORM_ZAPLATY = Object.freeze({ gotowka: 'Gotówka', przelew: 'Przelew', blik: 'BLIK' })

const ETYKIETY_WIZYTY = Object.freeze({
  zrobiona: 'Zrobione',
  zaplacona: 'Zapłacone',
  niezaplacona: 'Niezapłacone',
  odwolana: 'Odwołana',
  przesunieta: 'Przesunięta',
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

/**
 * Pigulka stanu wizyty; klasa `pigulka--<stan>` daje kolor.
 * @param {StanPigulkiWizyty} stan
 * @returns {HTMLSpanElement}
 */
export function pigulkaWizyty(stan) {
  if (!Object.hasOwn(ETYKIETY_WIZYTY, stan)) throw new RangeError(`Nieznany stan wizyty: ${String(stan)}`)
  return h('span', { class: ['pigulka', `pigulka--${stan}`] }, ETYKIETY_WIZYTY[stan])
}
