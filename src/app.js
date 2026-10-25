// Start aplikacji: wczytanie danych referencyjnych (data/*.json), magazyn stanu i router widokow w <main id="aplikacja">.

import { jestObiektem } from './dane/ksztalt.js'
import { utworzMagazyn } from './dane/magazyn.js'
import { zarejestrujServiceWorker } from './pwa/rejestracja.js'
import { BladKatalogu } from './silnik/bledy.js'
import { wczytajKatalog } from './silnik/katalog.js'
import { h } from './ui/h.js'
import { przycisk } from './ui/komponenty/formularz.js'
import { baner } from './ui/komponenty/uklad.js'
import { uruchomRouter } from './ui/router.js'
import { jestNazwaTrasy, TRASY } from './ui/trasy.js'
import { WIDOKI } from './widoki/indeks.js'
import { pokazRatunek } from './widoki/ratunek.js'

/** @typedef {import('./dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./dane/magazyn.js').WynikWczytania} WynikWczytania */
/** @typedef {import('./dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('./ui/router.js').Widok} Widok */
/** @typedef {import('./ui/router.js').Widoki} Widoki */

const LIMIT_POBIERANIA_MS = 10000
const PLIK_DOMYSLNYCH = 'data/domyslne.json'
/** Trasy dostepne przed pierwszymi ustawieniami (R24): sam kreator i przywracanie kopii danych. */
const TRASY_PRZED_USTAWIENIAMI = new Set(['kreatorStartowy', 'kopia'])
const BLAD_DANYCH = 'Nie udało się wczytać danych aplikacji. Sprawdź połączenie z internetem i odśwież stronę.'
const BLAD_PAMIECI = 'Przeglądarka nie pozwala tej aplikacji zapisywać danych. Włącz zapisywanie danych witryn (pliki cookie) i odśwież stronę.'

/**
 * Plik z serwera aplikacji (adres wzgledny, bo adres publikacji rozstrzyga etap 6) z limitem czasu.
 * @param {string} sciezka
 * @returns {Promise<unknown>}
 */
async function pobierzJson(sciezka) {
  const odpowiedz = await fetch(sciezka, { signal: AbortSignal.timeout(LIMIT_POBIERANIA_MS) })
  if (!odpowiedz.ok) throw new BladKatalogu('brak_pliku', `${sciezka}: HTTP ${odpowiedz.status}`)
  return odpowiedz.json()
}

/** Pola data/domyslne.json czytane przez widoki i warstwe danych. @param {unknown} x @returns {x is Domyslne} */
function jestDomyslnymi(x) {
  return jestObiektem(x) && typeof x.status_vat === 'string' && typeof x.stawka_vat_proc === 'number' && typeof x.tempo === 'number'
    && (x.wojewodztwo === null || typeof x.wojewodztwo === 'string') && jestObiektem(x.oferta) && jestObiektem(x.szybka_wycena)
}

/** @returns {Promise<Domyslne>} */
async function wczytajDomyslne() {
  const dane = await pobierzJson(PLIK_DOMYSLNYCH)
  if (!jestDomyslnymi(dane)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIK_DOMYSLNYCH}`)
  return dane
}

/**
 * Widok, ktory przy braku ustawien w stanie (pierwsze uruchomienie, R24) pokazuje kreator startowy pod `#/ustawienia/start`.
 * Uszkodzony stan przechodzi do widoku bez zmian (ekran bledu routera).
 * @param {Widok} widok @param {Widok} kreator @returns {Widok}
 */
function przedUstawieniami(widok, kreator) {
  return {
    render(kontener, argumenty) {
      const wynik = argumenty.kontekst.magazyn.wczytaj()
      if (!('stan' in wynik) || wynik.stan.ustawienia !== null) return widok.render(kontener, argumenty)
      history.replaceState(null, '', TRASY.kreatorStartowy)
      return kreator.render(kontener, { ...argumenty, parametry: {}, zapytanie: {} })
    },
  }
}

/** @param {Widoki} widoki @returns {Widoki} widoki tras poza TRASY_PRZED_USTAWIENIAMI z przekierowaniem do kreatora */
function zKreatoremStartowym(widoki) {
  const kreator = widoki.kreatorStartowy
  if (!kreator) return widoki
  /** @type {Widoki} */
  const wynik = { ...widoki }
  for (const nazwa of Object.keys(TRASY)) {
    if (!jestNazwaTrasy(nazwa) || TRASY_PRZED_USTAWIENIAMI.has(nazwa)) continue
    const widok = widoki[nazwa]
    if (widok) wynik[nazwa] = przedUstawieniami(widok, kreator)
  }
  return wynik
}

/** @param {HTMLElement} kontener @param {string} tekst */
function pokazBlad(kontener, tekst) {
  kontener.replaceChildren(h('div', { class: 'tresc' },
    baner({ rodzaj: 'blad', tekst }),
    przycisk({ tekst: 'Odśwież stronę', rodzaj: 'drugi', naKlik: () => location.reload() })))
}

/**
 * Magazyn ze stanem odczytanym przy starcie; null, gdy przegladarka blokuje localStorage (SecurityError przy zablokowanych
 * danych witryn).
 * @returns {{ magazyn: Magazyn, wynik: WynikWczytania } | null}
 */
function otworzMagazyn() {
  try {
    const magazyn = utworzMagazyn()
    return { magazyn, wynik: magazyn.wczytaj() }
  } catch (blad) {
    if (!(blad instanceof DOMException) || blad.name !== 'SecurityError') throw blad
    reportError(blad)
    return null
  }
}

/** Uszkodzone dane daja ekran ratunkowy zamiast routera (przed pobraniem danych referencyjnych). @param {HTMLElement} kontener */
async function uruchom(kontener) {
  const otwarty = otworzMagazyn()
  if (otwarty === null) return pokazBlad(kontener, BLAD_PAMIECI)
  const { magazyn, wynik } = otwarty
  if ('blad' in wynik) {
    pokazRatunek(kontener, { magazyn, ...wynik })
    magazyn.naZmiane(() => location.reload())
    return
  }
  kontener.replaceChildren(h('p', { class: 'tresc ladowanie', role: 'status' }, 'Wczytywanie danych…'))
  try {
    const [katalog, domyslne] = await Promise.all([wczytajKatalog(pobierzJson), wczytajDomyslne()])
    const router = uruchomRouter(kontener, zKreatoremStartowym(WIDOKI), { katalog, domyslne, magazyn })
    magazyn.naZmiane(() => ('stan' in magazyn.wczytaj() ? router.odswiez() : location.reload()))
  } catch (blad) {
    pokazBlad(kontener, BLAD_DANYCH)
    reportError(blad)
  }
}

const kontener = document.getElementById('aplikacja')
if (kontener) void uruchom(kontener)
// Po zaladowaniu strony: rejestracja nie konkuruje z pobieraniem danych, a sw.js dostaje liste wczytanych plikow (offline).
window.addEventListener('load', () => void zarejestrujServiceWorker(), { once: true })
