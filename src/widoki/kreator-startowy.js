// Kreator pierwszego uruchomienia (`#/ustawienia/start`, R24): sekcje ustawien firmy po jednej z paskiem postepu
// (Województwo, VAT, Firma, Tempo). Wybory trzyma szkic, a „Gotowe” zapisuje je razem; „Pomiń” zostawia wartosci domyslne.

import { wczytajStan } from '../dane/magazyn.js'
import { pominKreator, ustawieniaDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, karta, naglowek, pasekPostepu } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { tekstBleduZapisu } from './teksty-bledow.js'
import { kartaFirmy, trescVat, trescWojewodztwa } from './ustawienia-sekcje.js'
import { kartaTempa } from './ustawienia-tempo.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/magazyn.js').Ustawienia} Ustawienia */
/** @typedef {import('../dane/ustawienia.js').ZmianaUstawien} ZmianaUstawien */
/** @typedef {import('./ustawienia-sekcje.js').DaneSekcji} DaneSekcji */

const KROKI = Object.freeze(['Województwo', 'VAT', 'Firma', 'Tempo'])
const TYTUL_RYNKU = 'Rynek i VAT'
/** @type {readonly ((dane: DaneSekcji) => HTMLElement)[]} */
const SEKCJE = Object.freeze([
  (dane) => karta({ tytul: TYTUL_RYNKU, klasa: 'karta-ustawien' }, trescWojewodztwa(dane)),
  (dane) => karta({ tytul: TYTUL_RYNKU, klasa: 'karta-ustawien' }, trescVat(dane)),
  kartaFirmy,
  kartaTempa,
])

/**
 * Szkic kreatora po zmianie z sekcji (wojewodztwo, VAT, firma, tempo); reguly wartosci sprawdza zapiszUstawienia przy „Gotowe”.
 * @param {Ustawienia} szkic @param {ZmianaUstawien} zmiana @returns {Ustawienia}
 */
function scalSzkic(szkic, zmiana) {
  return {
    ...szkic,
    wojewodztwoId: zmiana.wojewodztwoId === undefined ? szkic.wojewodztwoId : zmiana.wojewodztwoId,
    statusVat: zmiana.statusVat ?? szkic.statusVat,
    firma: { ...szkic.firma, ...zmiana.firma },
    tempo: zmiana.tempo ?? szkic.tempo,
  }
}

/** @type {Widok} */
export const widokKreatoraStartowego = {
  render(kontener, { kontekst }) {
    const { magazyn, katalog, domyslne, nawiguj } = kontekst
    const stan = wczytajStan(magazyn)
    const komunikat = h('div', { class: 'kreator-startowy__komunikat', 'aria-live': 'polite' })
    let szkic = stan.ustawienia ?? ustawieniaDomyslne(domyslne)
    let krok = 0

    /** @param {ZmianaUstawien} zmiana @param {string} [fokus] @returns {null} */
    function zapisz(zmiana, fokus) {
      szkic = scalSzkic(szkic, zmiana)
      queueMicrotask(() => rysuj(fokus))
      return null
    }

    /** @param {() => void} zapis zapis w magazynie; po nim start */
    function zakoncz(zapis) {
      try {
        zapis()
      } catch (blad) {
        komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBleduZapisu(blad) }))
        reportError(blad)
        return
      }
      nawiguj(sciezka('start'))
    }

    const handleGotowe = () => zakoncz(() => {
      const { wojewodztwoId, statusVat, firma, tempo } = szkic
      zapiszUstawienia(magazyn, { wojewodztwoId, statusVat, firma, tempo, kreatorZakonczony: true }, domyslne)
    })
    const handlePomin = () => zakoncz(() => { pominKreator(magazyn, domyslne) })

    /** @param {number} nowy */
    function przejdz(nowy) {
      krok = nowy
      komunikat.replaceChildren()
      rysuj()
      window.scrollTo(0, 0)
      const tytul = kontener.querySelector('h1')
      if (!tytul) return
      tytul.tabIndex = -1
      tytul.focus({ preventScroll: true })
    }

    function przyciski() {
      const czyOstatni = krok === KROKI.length - 1
      return h('div', { class: 'kreator-startowy__przyciski' },
        krok > 0 ? przycisk({ tekst: 'Wstecz', rodzaj: 'drugi', naKlik: () => przejdz(krok - 1) }) : null,
        przycisk({ tekst: czyOstatni ? 'Gotowe' : 'Dalej', naKlik: czyOstatni ? handleGotowe : () => przejdz(krok + 1) }))
    }

    /** @param {string} [fokus] selektor elementu do fokusu po narysowaniu */
    function rysuj(fokus) {
      /** @type {DaneSekcji} */
      const dane = { ustawienia: szkic, katalog, domyslne, wyceny: stan.wyceny, zapisz }
      kontener.replaceChildren(
        naglowek({ tytul: 'Ustawienia firmy', podtytul: `Krok ${krok + 1} z ${KROKI.length}` }),
        pasekPostepu(KROKI, krok),
        h('div', { class: 'tresc' },
          SEKCJE[krok](dane),
          krok === 0 ? przycisk({ tekst: 'Mam kopię danych — przywróć', rodzaj: 'tekstowy', adres: sciezka('kopia') }) : null,
          komunikat,
          przyciski(),
          przycisk({ tekst: 'Pomiń', rodzaj: 'tekstowy', naKlik: handlePomin })))
      const element = fokus ? kontener.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    rysuj()
  },
}
