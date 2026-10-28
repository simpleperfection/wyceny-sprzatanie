// Start strony oferty (oferta.html, R22): oferta z fragmentu adresu (`#v1.…`), ktorego przegladarka nie wysyla na serwer.
// Strona dziala bez logowania i instalacji: nie czyta danych aplikacji, nie rejestruje workera i nie pobiera nic poza wlasnymi plikami.
// Zmiana fragmentu (`hashchange`) rysuje oferte od nowa; starsze odkodowanie nie nadpisuje nowszego (numer generacji).

import { odkodujOferte } from './oferta/kodek.js'
import { czyWazna } from './oferta/tresc.js'
import { tytulOferty, widokOdmowy, widokOferty } from './widoki/oferta-klient.js'

/** @typedef {import('./oferta/kodek.js').PowodOdmowy} PowodOdmowy */

const TYTUL_BEZ_OFERTY = 'Oferta'
let generacja = 0

/** @param {HTMLElement} kontener @param {HTMLElement[]} tresc @param {string} tytul */
function pokaz(kontener, tresc, tytul) {
  kontener.replaceChildren(...tresc)
  document.title = tytul
}

/** @param {HTMLElement} kontener @param {PowodOdmowy} powod */
const pokazOdmowe = (kontener, powod) => pokaz(kontener, [widokOdmowy(powod)], TYTUL_BEZ_OFERTY)

/** @param {HTMLElement} kontener @param {number} numer generacja tego odczytu @returns {Promise<void>} */
async function wczytaj(kontener, numer) {
  if (typeof globalThis.DecompressionStream !== 'function') return pokazOdmowe(kontener, 'przegladarka')
  const wynik = await odkodujOferte(location.hash)
  if (numer !== generacja) return
  if (!wynik.ok) return pokazOdmowe(kontener, wynik.powod)
  const { oferta } = wynik
  pokaz(kontener, widokOferty(oferta, { czyWazna: czyWazna(oferta, new Date()), naPobierz: () => window.print() }), tytulOferty(oferta))
}

/** @param {HTMLElement} kontener */
function odswiez(kontener) {
  generacja += 1
  const numer = generacja
  wczytaj(kontener, numer).catch((blad) => {
    // Nieoczekiwany blad strony (nie zly link, ten daje powod odmowy): slad w konsoli i komunikat zamiast pustej strony.
    reportError(blad)
    if (numer === generacja) pokazOdmowe(kontener, 'uszkodzony')
  })
}

const kontener = document.getElementById('oferta')
if (kontener) {
  odswiez(kontener)
  window.addEventListener('hashchange', () => odswiez(kontener))
}
