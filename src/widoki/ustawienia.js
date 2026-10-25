// Ekran ustawien firmy (`#/ustawienia`, makieta ustawienia-firmy): karty „Dane do oferty”, „Rynek i VAT”, „Tempo pracy”,
// „Koszty zlecenia (szacunki do zmiany)” i wiersz „Kopia danych”; kazda zmiana zapisuje sie od razu z komunikatem „Zapisano”.

import { dniOdKopii } from '../dane/kopia.js'
import { BladMagazynu } from '../dane/magazyn.js'
import { BladUstawien, ustawieniaDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { dniTemu } from '../ui/format.js'
import { h } from '../ui/h.js'
import { baner, dolnyPasek, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { TEKSTY_BLEDOW } from './ustawienia-formularz.js'
import { kartaFirmy, kartaKosztow, kartaRynku } from './ustawienia-sekcje.js'
import { kartaTempa } from './ustawienia-tempo.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/ustawienia.js').ZmianaUstawien} ZmianaUstawien */
/** @typedef {import('./ustawienia-sekcje.js').DaneSekcji} DaneSekcji */

const CZAS_KOMUNIKATU_MS = 3000
const BRAK_KOPII = 'brak kopii'
const BLAD_ZAPISU = 'Nie udało się zapisać zmian. Spróbuj jeszcze raz.'
const BLAD_PELNEJ_PAMIECI = 'Nie udało się zapisać zmian: brak miejsca w pamięci przeglądarki.'
const BLAD_DLUGOSCI = 'Ten tekst jest za długi.'

/** @param {Kontekst} kontekst @returns {Stan} uszkodzony stan konczy sie ekranem bledu routera */
export function wczytajStan(kontekst) {
  const wynik = kontekst.magazyn.wczytaj()
  if (!('stan' in wynik)) throw new BladMagazynu(wynik.blad, 'Zapisanych danych nie da się odczytać')
  return wynik.stan
}

/**
 * Tekst dla uzytkownika po nieudanym zapisie ustawien; inne bledy niz magazynu i ustawien leca dalej.
 * @param {unknown} blad
 * @returns {string}
 */
export function tekstBleduZapisu(blad) {
  if (blad instanceof BladMagazynu) return blad.kod === 'pelny' ? BLAD_PELNEJ_PAMIECI : BLAD_ZAPISU
  if (!(blad instanceof BladUstawien)) throw blad
  const { kod } = blad
  if (kod === 'telefon' || kod === 'email' || kod === 'nip') return TEKSTY_BLEDOW[kod]
  return kod === 'dlugosc' ? BLAD_DLUGOSCI : BLAD_ZAPISU
}

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
      const stan = wczytajStan(kontekst)
      /** @type {DaneSekcji} */
      const dane = { ustawienia: stan.ustawienia ?? ustawieniaDomyslne(domyslne), katalog, domyslne, wyceny: stan.wyceny, zapisz }
      tresc.replaceChildren(kartaFirmy(dane), kartaRynku(dane), kartaTempa(dane), kartaKosztow(dane), kartaKopii(stan, new Date()))
      ustawFokus(tresc, fokus)
    }

    /**
     * Zapis od razu po zmianie pola; sekcje rysuja sie od nowa po zamknieciu arkusza (mikrozadanie), takze po bledzie,
     * zeby kontrolki pokazaly stan zapisany.
     * @param {ZmianaUstawien} zmiana @param {string} [fokus]
     * @returns {string | null}
     */
    function zapisz(zmiana, fokus) {
      /** @type {string | null} */
      let blad = null
      try {
        zapiszUstawienia(magazyn, zmiana, domyslne)
        pokazKomunikat(h('p', { class: 'baner baner--sukces' }, 'Zapisano'), true)
      } catch (wyjatek) {
        blad = tekstBleduZapisu(wyjatek)
        reportError(wyjatek)
        pokazKomunikat(baner({ rodzaj: 'blad', tekst: blad }), false)
      }
      queueMicrotask(() => rysuj(fokus))
      return blad
    }

    kontener.append(
      naglowek({ tytul: 'Twoja firma', podtytul: 'Ustawienia używane w każdej wycenie' }),
      tresc,
      komunikat,
      dolnyPasek('ustawienia'))
    rysuj()
    return () => clearTimeout(zegar)
  },
}
