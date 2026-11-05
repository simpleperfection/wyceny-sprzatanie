// Ekran ustawien firmy (`#/ustawienia`, makieta ustawienia w docs/operator/aplikacja-modulowa-makiety.html): powrot „Start”,
// karty „Dane do oferty”, „Rynek i VAT”, „Tempo pracy”, „Koszty zlecenia (szacunki do zmiany)”, „Zakres prac”, „Warunki oferty”
// z wierszami ze strzalka i wiersz „Kopia danych” (zawartosc kopii, „Brak” przed pierwsza kopia). Zmiana zapisuje sie od razu
// z komunikatem „Zapisano”; jedyna glowna akcja to „Zapisz” w arkuszu pola.

import { dniOdKopii, podsumowanieKopii } from '../dane/kopia.js'
import { wczytajStan } from '../dane/magazyn.js'
import { ustawieniaDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { dniTemu } from '../ui/format.js'
import { h } from '../ui/h.js'
import { baner, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { kartaWarunkowUstawien, kartaZakresowUstawien } from './ustawienia-oferta.js'
import { kartaFirmy, kartaKosztow, kartaRynku } from './ustawienia-sekcje.js'
import { kartaTempa } from './ustawienia-tempo.js'
import { etykietyPodsumowania } from './kopia-teksty.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/ustawienia.js').ZmianaUstawien} ZmianaUstawien */
/** @typedef {import('./ustawienia-sekcje.js').DaneSekcji} DaneSekcji */

const CZAS_KOMUNIKATU_MS = 3000
const BRAK_KOPII = 'Brak'
/** Wiersz kopii mowi o wycenach i klientach (makieta); pelne podsumowanie, takze zlecen, jest na ekranie kopii. */
const POZYCJE_OPISU_KOPII = 2

/** @param {Stan} stan @param {Date} dzis @returns {HTMLElement} wiersz „Kopia danych”: dni od ostatniej kopii albo pigulka „Brak” */
function kartaKopii(stan, dzis) {
  const dni = dniOdKopii(stan, dzis)
  const opis = etykietyPodsumowania({ ...podsumowanieKopii(stan), czyUstawienia: false }).slice(0, POZYCJE_OPISU_KOPII).join(' · ')
  const stanKopii = dni === null ? { dodatek: h('span', { class: 'pigulka pigulka--brak-kopii' }, BRAK_KOPII) } : { wartosc: dniTemu(dni) }
  return karta({ klasa: 'karta--bez-odstepu karta-kopii' },
    wiersz({ tytul: 'Kopia danych', opis, ikona: 'download', adres: sciezka('kopia'), ...stanKopii }))
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
      const dane = { ustawienia: stan.ustawienia ?? ustawieniaDomyslne(domyslne), katalog, domyslne, wyceny: stan.wyceny,
        zlecenia: stan.zlecenia, zapisz }
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
      naglowek({ tytul: 'Ustawienia firmy', wstecz: sciezka('start'), wsteczTekst: 'Start' }),
      tresc,
      komunikat)
    rysuj()
    return () => clearTimeout(zegar)
  },
}
