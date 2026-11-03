// Odswiezenie widoku po polnocy w otwartej aplikacji (IU-9): Start i listy pokazuja nowy dzien po powrocie do karty.
// Zaleznosci przychodza w argumencie (zegar, document, window, router), zeby galezie dalo sie sprawdzic bez przegladarki.

import { dzienLokalny } from '../dane/ksztalt.js'

/**
 * @typedef {Pick<EventTarget, 'addEventListener'>} Nasluchiwany
 * @typedef {Nasluchiwany & { visibilityState: DocumentVisibilityState }} Dokument
 * @typedef {{
 *   router: { odswiez: () => void },
 *   teraz?: () => Date,
 *   dokument?: Dokument,
 *   okno?: Nasluchiwany,
 * }} OpcjeZmianyDnia teraz, dokument i okno domyslnie z przegladarki
 */

/**
 * Przy powrocie do karty (`visibilitychange`, `focus`) odswieza widok, gdy dzien lokalny rozni sie od dnia ostatniego
 * renderu (wywolanie tej funkcji, zmiana adresu albo poprzednie odswiezenie). Ukryta karta nie odswieza.
 * @param {OpcjeZmianyDnia} opcje
 * @returns {void}
 */
export function odswiezajPoZmianieDnia({ router, teraz = () => new Date(), dokument = document, okno = window }) {
  let dzienRenderu = dzienLokalny(teraz())
  const handlePowrot = () => {
    if (dokument.visibilityState !== 'visible') return
    const dzis = dzienLokalny(teraz())
    if (dzis === dzienRenderu) return
    dzienRenderu = dzis
    router.odswiez()
  }
  okno.addEventListener('hashchange', () => { dzienRenderu = dzienLokalny(teraz()) })
  dokument.addEventListener('visibilitychange', handlePowrot)
  okno.addEventListener('focus', handlePowrot)
}
