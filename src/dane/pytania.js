// Pytania do klienta (data/pytania.json) dla ekranu pytan i licznika odpowiedzi: wczytane leniwie przy pierwszym uzyciu,
// sprawdzone wzgledem katalogu uslug (sprawdzPytania) i pamietane do konca sesji strony (service worker trzyma plik w cache,
// wiec dziala tez offline). Ten sam wzorzec co baza chemii w src/dane/chemia.js.

import { BladKatalogu } from '../silnik/bledy.js'
import { sprawdzPytania } from '../silnik/pytania.js'
import { pobierzJson } from './pobierz.js'

/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').PobierzJson} PobierzJson */

const PLIK_PYTAN = 'data/pytania.json'
/** Ile bledow pliku trafia do komunikatu bledu (reszta jest w wyniku sprawdzPytania). */
const BLEDOW_W_KOMUNIKACIE = 3

/** @type {Promise<Pytania> | null} */
let wczytywanie = null

/**
 * Straznik typu po sprawdzPytania: pusta lista bledow znaczy, ze plik ma ksztalt Pytania.
 * @param {unknown} _dane @param {string[]} bledy wynik sprawdzPytania dla tych danych
 * @returns {_dane is Pytania}
 */
const bezBledow = (_dane, bledy) => bledy.length === 0

/** @param {Katalog} katalog @param {PobierzJson} pobierz @returns {Promise<Pytania>} */
async function wczytajPytania(katalog, pobierz) {
  const dane = await pobierz(PLIK_PYTAN)
  const bledy = sprawdzPytania(dane, katalog)
  if (!bezBledow(dane, bledy)) {
    throw new BladKatalogu('zly_format', `Nieprawidłowy ${PLIK_PYTAN}: ${bledy.slice(0, BLEDOW_W_KOMUNIKACIE).join('; ')}`)
  }
  return dane
}

/**
 * Pytania do klienta wczytane raz na sesje strony; plik niezgodny z katalogiem daje BladKatalogu `zly_format`, a po bledzie
 * nastepne wywolanie probuje od nowa.
 * @param {Katalog} katalog uslugi, brud i pomieszczenia do sprawdzenia pliku
 * @param {PobierzJson} [pobierz] zrodlo plikow (w przegladarce fetch z limitem czasu)
 * @returns {Promise<Pytania>}
 */
export function pytaniaAplikacji(katalog, pobierz = pobierzJson) {
  wczytywanie ??= wczytajPytania(katalog, pobierz).catch((blad) => {
    wczytywanie = null
    throw blad
  })
  return wczytywanie
}
