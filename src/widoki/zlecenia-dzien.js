// Widok Dzień (`#/zlecenia/dzien`, makieta „Dzień” w docs/operator/aplikacja-modulowa-makiety.html): na gorze „Do zamknięcia”
// (tylko dzis), potem wizyty dnia, a pod wizyta od jej dnia „Zrobione” i „Zapłacone” (R15). Kazdy przycisk to jeden zapis
// z src/dane/wizyty.js bez formy (forma domyslna klienta), wiec zamkniecie wizyty to dwa dotkniecia. Po zapisie widok rysuje
// liste od nowa: magazyn.naZmiane zglasza tylko zmiany z innych kart.

import { dzienLokalny } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { oznaczZaplacona, oznaczZrobiona } from '../dane/wizyty.js'
import { BladZlecenia } from '../dane/zlecenia.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner } from '../ui/komponenty/uklad.js'
import { dzienKalendarza, modelDnia } from '../zlecenia/kalendarz-dane.js'
import { tekstBleduZapisu } from './teksty-bledow.js'
import { ekranKalendarza, przyciskNowegoZlecenia, wierszWizyty } from './zlecenia-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/h.js').Dzieci} Dzieci */
/** @typedef {import('../zlecenia/kalendarz-dane.js').AkcjaWizyty} AkcjaWizyty */
/** @typedef {import('../zlecenia/kalendarz-dane.js').ModelDnia} ModelDnia */
/** @typedef {import('../zlecenia/kalendarz-dane.js').WierszWizyty} WierszWizyty */
/** @typedef {(w: WierszWizyty, akcja: AkcjaWizyty) => void} ObslugaAkcji */

const ID_DO_ZAMKNIECIA = 'kalendarz-do-zamkniecia'
const ID_WIZYT_DNIA = 'kalendarz-wizyty-dnia'
const PUSTY_DZIEN = 'Brak wizyt tego dnia.'
const BLAD_WIZYTY = 'Nie udało się zapisać tej wizyty. Spróbuj jeszcze raz.'
const WIZYTY_JUZ_NIE_MA = 'Tej wizyty już nie ma na liście.'
const TEKSTY_AKCJI = Object.freeze({ zrobione: 'Zrobione', zaplacone: 'Zapłacone' })
const ZAPISY_AKCJI = Object.freeze({ zrobione: oznaczZrobiona, zaplacone: oznaczZaplacona })

/** @param {unknown} blad @returns {string} tekst bledu zapisu wizyty; blad spoza zlecenia i magazynu leci dalej */
const tekstBleduWizyty = (blad) => (blad instanceof BladZlecenia ? BLAD_WIZYTY : tekstBleduZapisu(blad))

/** @param {WierszWizyty} w @param {AkcjaWizyty} akcja @param {ObslugaAkcji} handleAkcja @returns {HTMLElement} */
function przyciskAkcji(w, akcja, handleAkcja) {
  const tekst = TEKSTY_AKCJI[akcja]
  return przycisk({ tekst, rodzaj: 'drugi', ikona: akcja === 'zrobione' ? 'check' : undefined, etykieta: `${tekst}: ${w.tytul}`,
    naKlik: () => handleAkcja(w, akcja) })
}

/** @param {WierszWizyty} w @param {boolean} czyZalegla @param {ObslugaAkcji} handleAkcja @returns {HTMLElement} wiersz z przyciskami pod opisem */
function kartaWizyty(w, czyZalegla, handleAkcja) {
  return h('div', { class: ['wizyta', czyZalegla && 'wizyta--zalegla'], 'data-klucz': w.klucz },
    wierszWizyty(w),
    w.akcje.length === 0 ? null : h('div', { class: 'wizyta__akcje' }, w.akcje.map((akcja) => przyciskAkcji(w, akcja, handleAkcja))))
}

/** @param {string} id @param {Dzieci} naglowekSekcji @param {Dzieci} tresc @returns {HTMLElement} */
const sekcja = (id, naglowekSekcji, tresc) => h('section', { class: 'kalendarz-sekcja', 'aria-labelledby': id }, naglowekSekcji, tresc)

/** @param {WierszWizyty[]} wiersze @param {ObslugaAkcji} handleAkcja @returns {HTMLElement} */
function sekcjaDoZamkniecia(wiersze, handleAkcja) {
  return sekcja(ID_DO_ZAMKNIECIA,
    h('div', { class: 'kalendarz-sekcja__naglowek' },
      h('h2', { class: 'kalendarz-sekcja__tytul', id: ID_DO_ZAMKNIECIA }, 'Do zamknięcia'),
      h('span', { class: 'pigulka pigulka--zalegle' }, wiersze.length)),
    wiersze.map((w) => kartaWizyty(w, true, handleAkcja)))
}

/** @param {WierszWizyty[]} wiersze @param {ObslugaAkcji} handleAkcja @returns {Dzieci} wizyty dnia albo zdanie o pustym dniu */
function wizytyDnia(wiersze, handleAkcja) {
  return wiersze.length === 0
    ? h('p', { class: 'kalendarz-pusto' }, PUSTY_DZIEN)
    : wiersze.map((w) => kartaWizyty(w, false, handleAkcja))
}

/** @param {ModelDnia} model @param {ObslugaAkcji} handleAkcja @returns {HTMLElement} tresc pod paskiem daty */
function trescDnia({ dzien, doZamkniecia, wizyty }, handleAkcja) {
  const tresc = wizytyDnia(wizyty, handleAkcja)
  return h('div', { class: 'kalendarz-dzien' },
    doZamkniecia.length === 0 ? h('div', { class: 'kalendarz-sekcja' }, tresc) : [
      sekcjaDoZamkniecia(doZamkniecia, handleAkcja),
      sekcja(ID_WIZYT_DNIA, h('h2', { class: 'kalendarz-sekcja__tytul', id: ID_WIZYT_DNIA }, 'Wizyty dnia'), tresc),
    ],
    przyciskNowegoZlecenia(dzien))
}

/** @param {HTMLElement} lista @returns {HTMLElement[]} karty wizyt w kolejnosci na ekranie */
const kartyWizyt = (lista) => [...lista.querySelectorAll('.wizyta')].filter((karta) => karta instanceof HTMLElement)

/** @type {Widok} */
export const widokDniaKalendarza = {
  render(kontener, { zapytanie, kontekst }) {
    const { magazyn, katalog } = kontekst
    const dzis = dzienLokalny(new Date())
    const dzien = dzienKalendarza(zapytanie, dzis)
    const lista = h('div', { class: 'kalendarz-lista' })

    /** @returns {ModelDnia} narysowany model */
    function rysuj() {
      const model = modelDnia(wczytajStan(magazyn), katalog, dzien, dzis)
      lista.replaceChildren(trescDnia(model, handleAkcja))
      return model
    }

    /**
     * Lista po zapisie: fokus zostaje na przycisku tej wizyty, a gdy wypadla z listy, przechodzi na nastepna (kliknieta
     * kontrolka znika razem ze stara lista). Blad zostaje pod wizyta, a jej przyciski dzialaja dalej; gdy wizyty juz nie ma
     * (zlecenie usuniete w innej karcie), komunikat idzie nad liste.
     * @param {string} klucz @param {number} indeks pozycja karty przed zapisem @param {string | null} blad
     */
    function rysujPoAkcji(klucz, indeks, blad) {
      rysuj()
      const karty = kartyWizyt(lista)
      const karta = karty.find((k) => k.dataset.klucz === klucz)
      if (blad !== null && karta !== undefined) karta.append(baner({ rodzaj: 'blad', tekst: blad }))
      if (blad !== null && karta === undefined) lista.prepend(baner({ rodzaj: 'blad', tekst: WIZYTY_JUZ_NIE_MA }))
      const obok = karta ?? karty[indeks] ?? karty.at(-1) ?? lista
      const cel = obok.querySelector('button') ?? obok.querySelector('a')
      if (cel instanceof HTMLElement) cel.focus()
    }

    /** @type {ObslugaAkcji} */
    function handleAkcja({ klucz, zlecenieId, dataPierwotna }, akcja) {
      const indeks = kartyWizyt(lista).findIndex((k) => k.dataset.klucz === klucz)
      try {
        ZAPISY_AKCJI[akcja](magazyn, zlecenieId, dataPierwotna)
      } catch (blad) {
        rysujPoAkcji(klucz, indeks, tekstBleduWizyty(blad))
        reportError(blad)
        return
      }
      rysujPoAkcji(klucz, indeks, null)
    }

    const { tytul } = rysuj()
    kontener.append(...ekranKalendarza({ widok: 'dzien', dzien, dzis, tytul }, lista))
  },
}
