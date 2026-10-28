// Przygotowanie oferty z zapisanej wyceny (`#/wycena/<id>/oferta`, makieta oferta-edycja): karty z oferta-edycja-sekcje.js,
// banery (brak danych firmy, oferta nieaktualna, dlugi link) i stopka „PDF” / „Kopiuj link”. Tresc oferty liczy
// src/oferta/tresc.js, link src/oferta/kodek.js, zapis src/dane/wyceny.js (zapiszOferte, oznaczWyslana); widok tylko rysuje.
// Link liczy sie w tle po kazdej zmianie (numer wersji odrzuca wynik starszej), zeby schowek i nowa karta dostaly go od razu.

import { BladMagazynu, wczytajStan } from '../dane/magazyn.js'
import { BladUstawien, POLA_WYMAGANE_W_OFERCIE } from '../dane/ustawienia.js'
import { BladWyceny, czyStatusOferty, oznaczWyslana, wycena as znajdzWycene, zapiszOferte } from '../dane/wyceny.js'
import { BladKodeka, linkOferty } from '../oferta/kodek.js'
import { BladOferty, ofertaZWyceny, warunkiZrodlowe } from '../oferta/tresc.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, naglowek } from '../ui/komponenty/uklad.js'
import { kopiujDoSchowka } from '../ui/schowek.js'
import { ETYKIETY_STATUSOW } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { zglosBladKreatora } from './kreator-wspolne.js'
import { kartaDodatkow, kartaFirmy, kartaKlienta, kartaWarunkow, kartaZakresu, poZakresach, tekstKwoty } from './oferta-edycja-sekcje.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../oferta/kodek.js').LinkOferty} LinkOferty */
/** @typedef {import('../oferta/tresc.js').Oferta} Oferta */
/** @typedef {import('../oferta/tresc.js').Zakresy} Zakresy */
/** @typedef {import('./oferta-edycja-sekcje.js').ZmianaOferty} ZmianaOferty */
/** @typedef {{ w: Wycena, stan: Stan, oferta: Oferta }} BiezacaOferta */

const CZAS_KOMUNIKATU_MS = 3000
const BRAK_DANYCH_FIRMY = 'Uzupełnij nazwę firmy i telefon w ustawieniach, zanim wyślesz ofertę.'
const NIEAKTUALNA = 'Wycena zmieniła się po wysłaniu oferty. Wysłany wcześniej link pokazuje starą wersję — wyślij nowy.'
const NIE_SKOPIOWANO = 'Nie udało się skopiować automatycznie. Link jest zaznaczony – skopiuj go ręcznie.'
const BLAD_LINKU = 'Nie udało się przygotować linku do oferty. Sprawdź dane w ofercie i spróbuj jeszcze raz.'
const BLAD_UDOSTEPNIENIA = 'Nie udało się udostępnić linku. Spróbuj jeszcze raz.'
const BRAK_WYCENY = 'Nie ma tej wyceny. Mogła zostać usunięta.'
const BRAK_CENY = 'Ta wycena nie ma jeszcze ceny. Wróć do wyceny i dodaj zakres prac.'
const BLAD_OFERTY = 'Nie udało się przygotować oferty z tej wyceny. Wróć do wyceny i sprawdź jej dane.'
const ZA_DLUGI_TEKST = 'Ten tekst jest za długi. Skróć go.'

/** @param {number} n @returns {string} ostrzezenie o linku dluzszym niz MAKS_DLUGOSC_LINKU */
export const tekstDlugiegoLinku = (n) => `Link ma ${n} znaków — w SMS-ie może się nie zmieścić. Wyślij go komunikatorem albo wydrukuj PDF.`

/** @param {Pick<Oferta, 'firma'>} oferta @returns {boolean} oferta ma pola firmy z POLA_WYMAGANE_W_OFERCIE (bez nich nie da sie jej wyslac) */
export const czyDaneFirmy = (oferta) => POLA_WYMAGANE_W_OFERCIE.every((pole) => oferta.firma[pole].trim() !== '')

/** @param {unknown} blad @returns {string} tekst bledu zapisu oferty */
function tekstBleduZapisuOferty(blad) {
  if (blad instanceof BladWyceny && blad.kod === 'klient') return ZA_DLUGI_TEKST
  if (blad instanceof BladUstawien || blad instanceof BladMagazynu) {
    reportError(blad)
    return tekstBleduZapisu(blad)
  }
  return zglosBladKreatora(blad)
}

/** @param {unknown} blad @returns {string} tekst bledu przygotowania oferty (brak ceny jest stanem oczekiwanym) */
function tekstBleduOferty(blad) {
  if (blad instanceof BladOferty && blad.kod === 'brak_wyniku') return BRAK_CENY
  if (!(blad instanceof BladOferty) && !(blad instanceof BladKatalogu) && !(blad instanceof BladWejscia)) throw blad
  reportError(blad)
  return BLAD_OFERTY
}

/**
 * Link do schowka; bez Clipboard API — udostepnienie systemowe (`navigator.share`), a gdy schowek odmowi — zaznaczony link
 * w `zapasowy` do skopiowania recznie.
 * @param {string} url @param {HTMLElement} zapasowy
 * @returns {Promise<'skopiowany' | 'udostepniony' | 'anulowany' | 'zaznaczony'>}
 */
async function wyslijLink(url, zapasowy) {
  if (typeof navigator.clipboard?.writeText !== 'function' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url })
      return 'udostepniony'
    } catch (blad) {
      if (blad instanceof DOMException && blad.name === 'AbortError') return 'anulowany'
      throw blad
    }
  }
  return (await kopiujDoSchowka(url, zapasowy)) ? 'skopiowany' : 'zaznaczony'
}

/**
 * Ekran oferty jednej wyceny po wczytaniu zakresow.
 * @param {HTMLElement} kontener @param {Kontekst} kontekst @param {string} id @param {Zakresy} zakresy @param {() => boolean} czyAktywny
 * @returns {() => void} sprzatanie (zegar komunikatu)
 */
function uruchomOferte(kontener, kontekst, id, zakresy, czyAktywny) {
  const { magazyn, katalog, domyslne } = kontekst
  const dzis = new Date()
  let wersja = 0
  /** @type {(LinkOferty & { wersja: number }) | null} */
  let link = null
  let czyWysylanie = false
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let zegar
  const banery = h('div', { class: 'oferta-edycja__banery' })
  const komunikat = h('div', { class: 'oferta-edycja__komunikat', 'aria-live': 'polite' })
  const zapasowy = h('p', { class: 'wizualnie-ukryte', 'aria-hidden': 'true' })
  const pdf = h('a', { class: ['przycisk', 'przycisk--drugi'], target: '_blank', rel: 'noopener', 'aria-disabled': 'true' }, h('span', null, 'PDF'))
  const kopiuj = /** @type {HTMLButtonElement} */ (przycisk({ tekst: 'Kopiuj link', czyWylaczony: true, naKlik: () => void handleKopiuj().catch(reportError) }))

  /** @returns {BiezacaOferta | null} swiezy stan; null — wycena zniknela (np. usunieta w innej karcie) */
  function biezaca() {
    const stan = wczytajStan(magazyn)
    const w = znajdzWycene(stan, id)
    return w ? { w, stan, oferta: ofertaZWyceny(w, { katalog, domyslne, zakresy, ustawienia: stan.ustawienia }, dzis) } : null
  }

  /** @param {Node | null} element @param {boolean} [czyZnika] */
  function pokazKomunikat(element, czyZnika = false) {
    clearTimeout(zegar)
    komunikat.replaceChildren(...(element ? [element] : []))
    if (czyZnika) zegar = setTimeout(() => komunikat.replaceChildren(), CZAS_KOMUNIKATU_MS)
  }

  /** Banery zalezne od stanu (nieaktualna, dlugi link) i stan przyciskow stopki. */
  function odswiezStan() {
    const teraz = biezaca()
    if (!teraz) return
    const czyFirma = czyDaneFirmy(teraz.oferta)
    const gotowy = link?.wersja === wersja ? link : null
    banery.replaceChildren(...[
      teraz.w.oferta.nieaktualna ? baner({ rodzaj: 'uwaga', tekst: NIEAKTUALNA }) : null,
      gotowy?.dlugi ? baner({ rodzaj: 'uwaga', tekst: tekstDlugiegoLinku(gotowy.dlugosc) }) : null,
    ].filter((x) => x !== null))
    kopiuj.disabled = !czyFirma || czyWysylanie
    pdf.setAttribute('aria-disabled', String(!czyFirma || czyWysylanie))
    if (czyFirma && gotowy) pdf.setAttribute('href', gotowy.url)
    else pdf.removeAttribute('href')
  }

  /** @returns {Promise<LinkOferty & { wersja: number }>} link biezacej wersji oferty (gotowy albo policzony teraz) */
  async function aktualnyLink() {
    if (link?.wersja === wersja) return link
    const moja = wersja
    const teraz = biezaca()
    if (!teraz) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
    const wynik = { ...(await linkOferty(location.href, teraz.oferta)), wersja: moja }
    if (moja === wersja) link = wynik
    return wynik
  }

  function przygotujLink() {
    void aktualnyLink().then(() => {
      if (czyAktywny()) odswiezStan()
    }, (blad) => {
      if (!czyAktywny()) return
      if (!(blad instanceof BladKodeka) && !(blad instanceof BladWyceny)) throw blad
      reportError(blad)
      pokazKomunikat(baner({ rodzaj: 'blad', tekst: BLAD_LINKU }))
    }).catch(reportError)
  }

  /** @param {ZmianaOferty} zmiana @returns {string | null} */
  function zapisz(zmiana) {
    try {
      zapiszOferte(magazyn, id, zmiana)
    } catch (blad) {
      return tekstBleduZapisuOferty(blad)
    }
    wersja += 1
    odswiezStan()
    przygotujLink()
    return null
  }

  /** Oferta trafila do klienta: data waznosci zostaje taka jak w linku, status `wyslana`. */
  function oznacz() {
    const teraz = biezaca()
    if (teraz && teraz.w.oferta.waznaDo === null) zapiszOferte(magazyn, id, { waznaDo: teraz.oferta.waznaDo })
    oznaczWyslana(magazyn, id)
  }

  /** @param {() => Promise<void>} akcja wysylka linku; blad daje baner, a przyciski wracaja do uzycia */
  async function wysylaj(akcja) {
    if (czyWysylanie) return
    czyWysylanie = true
    odswiezStan()
    try {
      await akcja()
    } catch (blad) {
      // Odmowa udostepnienia to stan oczekiwany (log bez zgloszenia); blad kodeka to defekt oferty albo adresu (zgloszenie).
      if (blad instanceof DOMException) {
        console.warn(JSON.stringify({ modul: 'oferta', kod: 'udostepnienie_odmowa', przyczyna: blad.name }))
      } else if (blad instanceof BladKodeka) reportError(blad)
      if (!czyAktywny()) return
      if (blad instanceof DOMException) pokazKomunikat(baner({ rodzaj: 'blad', tekst: BLAD_UDOSTEPNIENIA }))
      else if (blad instanceof BladKodeka) pokazKomunikat(baner({ rodzaj: 'blad', tekst: BLAD_LINKU }))
      else pokazKomunikat(baner({ rodzaj: 'blad', tekst: tekstBleduZapisuOferty(blad) }))
    } finally {
      czyWysylanie = false
      if (czyAktywny()) odswiezStan()
    }
  }

  // Gotowy link trafia do schowka bez await przed writeText (Safari wymaga wywolania w obsludze klikniecia).
  const handleKopiuj = () => wysylaj(async () => {
    const gotowy = link?.wersja === wersja ? link : null
    const { url } = gotowy ?? await aktualnyLink()
    zapasowy.className = 'wizualnie-ukryte'
    zapasowy.setAttribute('aria-hidden', 'true')
    zapasowy.textContent = url
    const wynik = await wyslijLink(url, zapasowy)
    if (wynik === 'skopiowany' || wynik === 'udostepniony') oznacz()
    if (!czyAktywny()) return
    if (wynik === 'zaznaczony') {
      zapasowy.className = 'oferta-edycja__link'
      zapasowy.removeAttribute('aria-hidden')
      getSelection()?.selectAllChildren(zapasowy)
    }
    const tekst = { skopiowany: 'Link skopiowany', udostepniony: 'Link udostępniony', anulowany: null, zaznaczony: NIE_SKOPIOWANO }[wynik]
    pokazKomunikat(tekst ? baner({ rodzaj: wynik === 'zaznaczony' ? 'info' : 'sukces', tekst }) : null, wynik !== 'zaznaczony')
  })

  /** @param {MouseEvent} zdarzenie gotowy link otwiera sie domyslnie (nowa karta), inaczej po policzeniu przez window.open */
  function handlePdf(zdarzenie) {
    if (pdf.getAttribute('aria-disabled') === 'true') return zdarzenie.preventDefault()
    if (pdf.hasAttribute('href')) {
      // Bez wylaczania stopki: zmiana href w trakcie klikniecia zatrzymalaby otwarcie nowej karty.
      try {
        oznacz()
      } catch (blad) {
        pokazKomunikat(baner({ rodzaj: 'blad', tekst: tekstBleduZapisuOferty(blad) }))
      }
      return odswiezStan()
    }
    zdarzenie.preventDefault()
    void wysylaj(async () => {
      const { url } = await aktualnyLink()
      window.open(url, '_blank', 'noopener')
      oznacz()
    }).catch(reportError)
  }
  pdf.addEventListener('click', handlePdf)

  /** @param {BiezacaOferta} poczatek stan przy otwarciu (zapasowo, gdy swiezego nie da sie odczytac) */
  function rysuj(poczatek) {
    const { w, oferta } = poczatek
    kontener.replaceChildren(
      naglowek({ tytul: 'Oferta', podtytul: `Wycena ${oferta.numer} · ${tekstKwoty(oferta.razem)}`, wstecz: sciezka('wycena', { id }) }),
      h('div', { class: 'tresc oferta-edycja' },
        czyDaneFirmy(oferta) ? null : baner({ rodzaj: 'uwaga', tekst: BRAK_DANYCH_FIRMY, akcja: { tekst: 'Uzupełnij', adres: sciezka('ustawienia') } }),
        kartaFirmy(oferta.firma),
        kartaKlienta(w.klient, zapisz),
        kartaZakresu({ zapisz, pobierz: () => {
          const teraz = biezaca() ?? poczatek
          return { zakres: teraz.oferta.zakres, czyZmieniony: teraz.w.oferta.zakres !== null }
        } }),
        kartaDodatkow(oferta.dodatkiOpcjonalne),
        kartaWarunkow({ zapisz, dzis, pobierz: () => {
          const teraz = biezaca() ?? poczatek
          const warunki = warunkiZrodlowe(teraz.w.oferta.warunki, teraz.stan.ustawienia, domyslne)
          return { warunki, szybka: teraz.oferta.szybka, czyZmienione: teraz.w.oferta.warunki !== null, waznaDo: teraz.oferta.waznaDo }
        } }),
        banery, komunikat, zapasowy),
      h('div', { class: 'stopka-kreatora oferta-edycja__stopka' }, pdf, kopiuj))
    odswiezStan()
    przygotujLink()
  }

  /** @type {BiezacaOferta | null} */
  let poczatek
  try {
    poczatek = biezaca()
  } catch (blad) {
    pokazStan(kontener, id, tekstBleduOferty(blad))
    return () => clearTimeout(zegar)
  }
  if (!poczatek) pokazStan(kontener, null, BRAK_WYCENY)
  else rysuj(poczatek)
  return () => clearTimeout(zegar)
}

/**
 * Ekran bez oferty: komunikat i powrot do wyceny (albo listy, gdy wyceny nie ma).
 * @param {HTMLElement} kontener @param {string | null} id @param {string} tekst
 */
function pokazStan(kontener, id, tekst) {
  const powrot = id === null ? sciezka('wyceny') : sciezka('wycena', { id })
  kontener.replaceChildren(naglowek({ tytul: 'Oferta', wstecz: powrot }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst }),
      przycisk({ tekst: id === null ? 'Wróć do listy wycen' : 'Wróć do wyceny', rodzaj: 'drugi', adres: powrot })))
}

/** Oferta zapisanej wyceny `#/wycena/<id>/oferta`. @type {Widok} */
export const widokOferty = {
  render(kontener, { parametry, kontekst }) {
    const id = parametry.id ?? ''
    let czyAktywny = true
    let sprzatanie = () => {}
    const w = znajdzWycene(wczytajStan(kontekst.magazyn), id)
    if (!w) return pokazStan(kontener, null, BRAK_WYCENY)
    if (!czyStatusOferty(w.status)) {
      return pokazStan(kontener, id, `Ofertę przygotujesz z wyceny do wysłania, wysłanej albo przyjętej. Ta ma status „${ETYKIETY_STATUSOW[w.status]}”.`)
    }
    const tresc = h('div', { class: 'tresc' })
    kontener.replaceChildren(naglowek({ tytul: 'Oferta', wstecz: sciezka('wycena', { id }) }), tresc)
    void poZakresach(tresc, (zakresy) => { sprzatanie = uruchomOferte(kontener, kontekst, id, zakresy, () => czyAktywny) },
      () => czyAktywny).catch(reportError)
    return () => {
      czyAktywny = false
      sprzatanie()
    }
  },
}
