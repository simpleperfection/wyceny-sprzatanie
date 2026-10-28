// Baza chemii (data/chemia.json) dla katalogu srodkow i kroku chemii kreatora: wczytana leniwie przy pierwszym uzyciu
// i pamietana do konca sesji strony (service worker trzyma plik w cache, wiec dziala tez offline).

import { wczytajChemie } from '../silnik/chemia.js'
import { pobierzJson } from './pobierz.js'

/** @typedef {import('../silnik/chemia.js').Chemia} Chemia */
/** @typedef {import('../silnik/chemia.js').PobierzJson} PobierzJson */

/** @type {Promise<Chemia> | null} */
let wczytywanie = null

/**
 * Baza chemii wczytana raz na sesje strony; po bledzie nastepne wywolanie probuje od nowa.
 * @param {PobierzJson} [pobierz] zrodlo plikow (w przegladarce fetch z limitem czasu)
 * @returns {Promise<Chemia>}
 */
export function chemiaAplikacji(pobierz = pobierzJson) {
  wczytywanie ??= wczytajChemie(pobierz).catch((blad) => {
    wczytywanie = null
    throw blad
  })
  return wczytywanie
}
