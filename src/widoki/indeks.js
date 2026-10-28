// Widoki aplikacji: nazwa trasy (TRASY w src/ui/trasy.js) → modul widoku. Importy statyczne, bez import(), zeby
// service worker (IU-13) mial cala aplikacje w cache po pierwszym uruchomieniu. Kolejne jednostki dopisuja tu swoje widoki.

import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { dolnyPasek } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { widokKopii } from './kopia.js'
import { widokKreatoraStartowego } from './kreator-startowy.js'
import { widokListyWycen } from './lista-wycen.js'
import { widokStartu } from './start.js'
import { widokUstawien } from './ustawienia.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Widoki} Widoki */

/** @param {string} komunikat @returns {Widok} ekran z komunikatem, przyciskiem na start i dolnym paskiem */
function widokKomunikatu(komunikat) {
  return {
    render(kontener) {
      kontener.append(
        h('div', { class: 'tresc tresc--komunikat' },
          h('h1', { class: 'komunikat' }, komunikat),
          przycisk({ tekst: 'Wróć na start', adres: sciezka('start') })),
        dolnyPasek(null))
    },
  }
}

/** @type {Widoki} */
export const WIDOKI = Object.freeze({
  start: widokStartu,
  wyceny: widokListyWycen,
  ustawienia: widokUstawien,
  kreatorStartowy: widokKreatoraStartowego,
  kopia: widokKopii,
  nieZnaleziono: widokKomunikatu('Nie ma takiego ekranu.'),
  bladEkranu: widokKomunikatu('Nie udało się otworzyć tego ekranu. Wróć na start i spróbuj jeszcze raz.'),
})
