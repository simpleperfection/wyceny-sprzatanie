// Modul Klienci (`#/klienci`, makieta „Lista klientów” w docs/operator/aplikacja-modulowa-makiety.html): powrot „Start”,
// wyszukiwanie w pamieci (szukajKlientow, bez zapisu), „Dodaj klienta” i wiersze z inicjalami: nazwa, w drugiej linii telefon,
// a bez niego adres → karta klienta. Bez klientow tylko zdanie i „Dodaj klienta”. Rysuje najwyzej WIERSZY_NA_STRONE wierszy
// z „Pokaż więcej”, bo przy kilku tysiacach klientow kazdy znak w polu wyszukiwania rysowalby cala liste od nowa.

import { szukajKlientow } from '../dane/klienci.js'
import { wczytajStan } from '../dane/magazyn.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { inicjaly, opisWiersza } from './klienci-dane.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/klienci.js').Klient} Klient */

const ID_SZUKAJ = 'klienci-szukaj'
const SZUKAJ = 'Szukaj klienta'
const BEZ_KLIENTOW = 'Nie masz jeszcze klientów.'
/** Wierszy listy rysowanych naraz; „Pokaż więcej” dokłada kolejne tyle. */
const WIERSZY_NA_STRONE = 50

/** @param {string} fraza @returns {string} */
const brakWynikow = (fraza) => `Nie ma klienta „${fraza.trim()}”.`

/** @returns {HTMLElement} glowny przycisk do formularza nowego klienta */
const przyciskDodaj = () => przycisk({ tekst: 'Dodaj klienta', ikona: 'plus', adres: sciezka('nowyKlient') })

/** @param {number} reszta @returns {string} */
const tekstWiecej = (reszta) => `Pokaż więcej (${reszta})`

/** @param {readonly Klient[]} klienci @returns {HTMLElement} */
function listaKlientow(klienci) {
  return karta({ klasa: 'karta--bez-odstepu' }, klienci.map((k) =>
    wiersz({ tytul: k.nazwa, opis: opisWiersza(k) ?? undefined, awatar: inicjaly(k.nazwa), adres: sciezka('klient', { id: k.id }) })))
}

/** @type {Widok} */
export const widokListyKlientow = {
  render(kontener, { kontekst }) {
    const stan = wczytajStan(kontekst.magazyn)
    const gora = naglowek({ tytul: 'Klienci', wstecz: sciezka('start'), wsteczTekst: 'Start' })
    if (stan.klienci.length === 0) {
      kontener.append(gora, h('div', { class: 'tresc' }, h('p', { class: 'klienci-pusto' }, BEZ_KLIENTOW), przyciskDodaj()))
      return
    }
    const wyniki = h('div', { class: 'klienci-wyniki' })
    const wejscie = h('input', { id: ID_SZUKAJ, type: 'search', class: 'pole__wejscie klienci-szukaj__wejscie', placeholder: SZUKAJ,
      autocomplete: 'off', enterkeyhint: 'search' })

    let limit = WIERSZY_NA_STRONE

    function rysujWyniki() {
      const fraza = wejscie.value
      const klienci = szukajKlientow(stan, fraza)
      if (klienci.length === 0) return wyniki.replaceChildren(h('p', { class: 'klienci-pusto', role: 'status' }, brakWynikow(fraza)))
      const reszta = klienci.length - limit
      const lista = listaKlientow(klienci.slice(0, limit))
      if (reszta <= 0) return wyniki.replaceChildren(lista)
      wyniki.replaceChildren(lista, przycisk({ tekst: tekstWiecej(reszta), rodzaj: 'drugi', naKlik: handleWiecej }))
    }

    /** Kolejne wiersze; fokus na pierwszy dolozony (przycisk znika razem z poprzednia lista). */
    function handleWiecej() {
      const pierwszyNowy = limit
      limit += WIERSZY_NA_STRONE
      rysujWyniki()
      const wiersz = wyniki.querySelectorAll('.wiersz')[pierwszyNowy]
      if (wiersz instanceof HTMLElement) wiersz.focus()
    }

    wejscie.addEventListener('input', () => {
      limit = WIERSZY_NA_STRONE
      rysujWyniki()
    })
    kontener.append(gora, h('div', { class: 'tresc' },
      h('search', { class: 'klienci-szukaj' },
        h('label', { class: 'wizualnie-ukryte', for: ID_SZUKAJ }, SZUKAJ),
        wejscie),
      przyciskDodaj(),
      wyniki))
    rysujWyniki()
  },
}
