// Widoki aplikacji: nazwa trasy (TRASY w src/ui/trasy.js) → modul widoku. Importy statyczne, bez import(), zeby
// service worker (IU-13) mial cala aplikacje w cache po pierwszym uruchomieniu. Kolejne jednostki dopisuja tu swoje widoki.

import { wczytajStan } from '../dane/magazyn.js'
import { wycena as znajdzWycene } from '../dane/wyceny.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { dolnyPasek } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { widokDoboruChemii } from './dobor-chemii.js'
import { widokKataloguChemii } from './katalog-chemii.js'
import { widokKopii } from './kopia.js'
import { widokKreatoraDodatkow } from './kreator-dodatki.js'
import { widokKreatoraPomieszczen } from './kreator-pomieszczenia.js'
import { widokKreatoraPozycji } from './kreator-pozycje.js'
import { widokKreatoraStartowego } from './kreator-startowy.js'
import { widokKreatoraUslugi } from './kreator-usluga.js'
import { widokKreatora } from './kreator-wspolne.js'
import { widokListyWycen } from './lista-wycen.js'
import { widokPodsumowaniaKreatora, widokZapisanejWyceny } from './podsumowanie.js'
import { widokPytan } from './pytania.js'
import { widokStartu } from './start.js'
import { widokSzybkiejWyceny } from './szybka.js'
import { widokUstawien } from './ustawienia.js'
import { widokZakonczeniaZlecenia } from './zakonczenie.js'

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

const NIE_MA_EKRANU = widokKomunikatu('Nie ma takiego ekranu.')

/** @type {Widok} widok trasy `#/kreator/zakres`: uslugi w trybie pozycji — krok pozycji, pozostale (i brak wyceny) — krok pomieszczen */
const widokKreatoraZakresu = {
  render(kontener, argumenty) {
    const id = argumenty.zapytanie.wycena ?? null
    const wycena = id === null ? null : znajdzWycene(wczytajStan(argumenty.kontekst.magazyn), id)
    const czyPozycje = wycena !== null && argumenty.kontekst.katalog.usluga(wycena.wejscie.uslugaId).tryb === 'pozycje'
    return (czyPozycje ? widokKreatoraPozycji : widokKreatoraPomieszczen).render(kontener, argumenty)
  },
}

/** @type {Widoki} */
export const WIDOKI = Object.freeze({
  start: widokStartu,
  wyceny: widokListyWycen,
  ustawienia: widokUstawien,
  kreatorStartowy: widokKreatoraStartowego,
  kopia: widokKopii,
  chemia: widokKataloguChemii,
  kreator: widokKreatora({ usluga: widokKreatoraUslugi, zakres: widokKreatoraZakresu, dodatki: widokKreatoraDodatkow, chemia: widokDoboruChemii,
    cena: widokPodsumowaniaKreatora }, NIE_MA_EKRANU),
  wycena: widokZapisanejWyceny,
  zakonczenie: widokZakonczeniaZlecenia,
  szybka: widokSzybkiejWyceny,
  pytania: widokPytan,
  nieZnaleziono: NIE_MA_EKRANU,
  bladEkranu: widokKomunikatu('Nie udało się otworzyć tego ekranu. Wróć na start i spróbuj jeszcze raz.'),
})
