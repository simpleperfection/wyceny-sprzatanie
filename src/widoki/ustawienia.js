// Ekran ustawien firmy (`#/ustawienia`, makieta ustawienia-firmy): karty „Dane do oferty”, „Rynek i VAT”, „Tempo pracy”,
// „Koszty zlecenia (szacunki do zmiany)”, „Zakres prac”, „Warunki oferty” i wiersz „Kopia danych”; kazda zmiana zapisuje sie
// od razu z komunikatem „Zapisano”.

import { dniOdKopii } from '../dane/kopia.js'
import { wczytajStan } from '../dane/magazyn.js'
import { ustawieniaDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { dniTemu } from '../ui/format.js'
import { h } from '../ui/h.js'
import { baner, dolnyPasek, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { kartaWarunkowUstawien, kartaZakresowUstawien } from './ustawienia-oferta.js'
import { kartaFirmy, kartaKosztow, kartaRynku } from './ustawienia-sekcje.js'
import { kartaTempa } from './ustawienia-tempo.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/ustawienia.js').ZmianaUstawien} ZmianaUstawien */
/** @typedef {import('./ustawienia-sekcje.js').DaneSekcji} DaneSekcji */

const CZAS_KOMUNIKATU_MS = 3000
const BRAK_KOPII = 'brak kopii'

/** @param {Stan} stan @param {Date} dzis */
function kartaKopii(stan, dzis) {
  const dni = dniOdKopii(stan, dzis)
  return karta({ klasa: 'karta--bez-odstepu karta-kopii' },
    wiersz({ tytul: 'Kopia danych', wartosc: dni === null ? BRAK_KOPII : dniTemu(dni), adres: sciezka('kopia') }))
}

/** @param {HTMLElement} kontener @param {string | undefined} fokus selektor elementu */
function ustawFokus(kontener, fokus) {
  const element = fokus ? kontener.querySelector(fokus) : null
  if (element instanceof HTMLElement) element.focus()
}

/** @type {Widok} */
export const widokUstawien = {
  render(kontener, { kontekst }) {
    const { magazyn, katalog, domyslne } = kontekst
    const komunikat = h('div', { class: 'ustawienia__komunikat', 'aria-live': 'polite' })
    const tresc = h('div', { class: 'tresc' })
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let zegar

    /** @param {HTMLElement} element @param {boolean} czyZnika */
    function pokazKomunikat(element, czyZnika) {
      clearTimeout(zegar)
      komunikat.replaceChildren(element)
      if (czyZnika) zegar = setTimeout(() => komunikat.replaceChildren(), CZAS_KOMUNIKATU_MS)
    }

    /** @param {string} [fokus] */
    function rysuj(fokus) {
      const stan = wczytajStan(magazyn)
      /** @type {DaneSekcji} */
      const dane = { ustawienia: stan.ustawienia ?? ustawieniaDomyslne(domyslne), katalog, domyslne, wyceny: stan.wyceny, zapisz }
      const daneOferty = { ustawienia: dane.ustawienia, katalog, domyslne, magazyn, wykonaj }
      tresc.replaceChildren(kartaFirmy(dane), kartaRynku(dane), kartaTempa(dane), kartaKosztow(dane), kartaZakresowUstawien(daneOferty),
        kartaWarunkowUstawien(daneOferty), kartaKopii(stan, new Date()))
      ustawFokus(tresc, fokus)
    }

    /**
     * Zapis od razu po zmianie; sekcje rysuja sie od nowa po zamknieciu arkusza (mikrozadanie), takze po bledzie,
     * zeby kontrolki pokazaly stan zapisany.
     * @param {() => unknown} operacja zapis ustawien (zapiszUstawienia, zapiszZakres, zapiszWarunki) @param {string} [fokus]
     * @returns {string | null}
     */
    function wykonaj(operacja, fokus) {
      /** @type {string | null} */
      let blad = null
      try {
        operacja()
        pokazKomunikat(h('p', { class: 'baner baner--sukces' }, 'Zapisano'), true)
      } catch (wyjatek) {
        blad = tekstBleduZapisu(wyjatek)
        reportError(wyjatek)
        pokazKomunikat(baner({ rodzaj: 'blad', tekst: blad }), false)
      }
      queueMicrotask(() => rysuj(fokus))
      return blad
    }

    /** @param {ZmianaUstawien} zmiana @param {string} [fokus] @returns {string | null} */
    const zapisz = (zmiana, fokus) => wykonaj(() => zapiszUstawienia(magazyn, zmiana, domyslne), fokus)

    kontener.append(
      naglowek({ tytul: 'Twoja firma', podtytul: 'Ustawienia używane w każdej wycenie' }),
      tresc,
      komunikat,
      dolnyPasek('ustawienia'))
    rysuj()
    return () => clearTimeout(zegar)
  },
}
