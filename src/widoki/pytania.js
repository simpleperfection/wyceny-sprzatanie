// Pytania do klienta (`#/wycena/:id/pytania`, makieta pytania-do-klienta): naglowek z usluga i licznikiem odpowiedzi, karta
// z pytaniami uslugi (odpowiedz z pigulka skutku albo „+ Dodaj odpowiedź” z arkuszem pola wg typu i notatka), baner prosby
// o zdjecia z „Kopiuj prośbę” i „Gotowe” wracajace do szybkiej wyceny albo kreatora. Do tego wiersz „Pytania do klienta · a z n”
// dla ekranu szybkiej wyceny i kreatora. Zapis i skutki odpowiedzi licza src/kreator/pytania.js; widok tylko rysuje.

import { wczytajStan } from '../dane/magazyn.js'
import { pytaniaAplikacji } from '../dane/pytania.js'
import { BladWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import { odpowiedziUslugi, pytaniaWyceny, zapiszOdpowiedz } from '../kreator/pytania.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { ODPOWIEDZI_TAK_NIE } from '../silnik/pytania.js'
import { parsujLiczbe, tekstLiczby } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { chipy, pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, karta, naglowek } from '../ui/komponenty/uklad.js'
import { kopiujDoSchowka } from '../ui/schowek.js'
import { sciezka } from '../ui/trasy.js'
import { adresKroku, zglosBladKreatora } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../silnik/pytania.js').Pytanie} Pytanie */
/** @typedef {import('../silnik/pytania.js').Odpowiedz} Odpowiedz */
/** @typedef {import('../kreator/pytania.js').PytanieEkranu} PytanieEkranu */
/** @typedef {(id: string, odpowiedz: Odpowiedz | null) => string | null} ZapisOdpowiedzi tekst bledu albo null po zapisie */

const TYTUL = 'Pytania do klienta'
const WCZYTYWANIE = 'Wczytywanie pytań…'
const BLAD_POLACZENIA = 'Nie udało się wczytać pytań do klienta. Sprawdź połączenie z internetem i spróbuj jeszcze raz.'
const BLAD_DANYCH = 'Lista pytań do klienta jest niepełna. Odśwież stronę, a jeśli to nie pomoże, zajrzyj tu później.'
const NIEAKTUALNA = 'Odpowiedzi zmieniły się w innej karcie przeglądarki. Widzisz teraz aktualne dane.'
const NIE_SKOPIOWANO = 'Nie udało się skopiować automatycznie. Tekst jest zaznaczony – skopiuj go ręcznie.'
const WYBIERZ = 'Wybierz odpowiedź.'
const WPISZ_LICZBE = 'Wpisz liczbę, np. 12.'
const WPISZ_TEKST = 'Wpisz odpowiedź.'
const ZA_DLUGA = 'Odpowiedź jest za długa. Skróć ją.'
const ZA_DLUGA_NOTATKA = 'Notatka jest za długa. Skróć ją.'
/** Chipy pytania tak/nie: wartosci z silnika, etykieta wielka litera jak w opisOdpowiedzi („Tak”, „Nie”). */
const TAK_NIE = Object.freeze(ODPOWIEDZI_TAK_NIE.map((wartosc) => ({ wartosc, etykieta: wartosc.charAt(0).toLocaleUpperCase('pl-PL') + wartosc.slice(1) })))

/**
 * Tekst bledu wczytania pytan: brak sieci albo limit czasu to stan oczekiwany (log bez zgloszenia), plik niezgodny z katalogiem
 * jest zglaszany; inne bledy leca dalej.
 * @param {unknown} blad @returns {string}
 */
export function tekstBleduPytan(blad) {
  const czyLimit = blad instanceof DOMException && (blad.name === 'TimeoutError' || blad.name === 'AbortError')
  if (czyLimit || blad instanceof TypeError) {
    console.warn(JSON.stringify({ modul: 'pytania', kod: 'pytania_polaczenie', przyczyna: blad.name }))
    return BLAD_POLACZENIA
  }
  if (!(blad instanceof BladKatalogu) && !(blad instanceof BladWejscia)) throw blad
  reportError(blad)
  return BLAD_DANYCH
}

/** @param {Pick<Wycena, 'id' | 'rodzaj'>} w @returns {string} ekran, z ktorego otwiera sie pytania: szybka wycena albo kreator */
const adresPowrotu = (w) => (w.rodzaj === 'szybka' ? sciezka('szybka', {}, { wycena: w.id }) : adresKroku('usluga', w.id))

/**
 * Wiersz „Pytania do klienta · {a} z {n}” z ikona i strzalka: link (adres) albo przycisk (naKlik). Licznik pojawia sie po
 * wczytaniu pytan; do tego czasu (i po bledzie wczytania) wiersz ma sam tytul.
 * @param {{ katalog: Katalog, uslugaId: string, odpowiedzi: Record<string, unknown>, adres?: string, naKlik?: () => void }} opcje
 * @returns {HTMLElement}
 */
export function wierszPytan({ katalog, uslugaId, odpowiedzi, adres, naKlik }) {
  const tekst = h('span', { class: 'wiersz-pytan__tekst' }, TYTUL)
  const tresc = [ikona('clipboard-list'), tekst, ikona('chevron-right', 'wiersz-pytan__strzalka')]
  const element = adres === undefined ? h('button', { type: 'button', class: 'wiersz-pytan', on: { click: naKlik } }, tresc)
    : h('a', { class: 'wiersz-pytan', href: adres }, tresc)
  void pytaniaAplikacji(katalog).then((pytania) => {
    const { odpowiedziane, liczba, bledne } = odpowiedziUslugi(uslugaId, odpowiedzi, pytania)
    for (const blad of bledne) reportError(blad)
    tekst.textContent = `${TYTUL} · ${odpowiedziane} z ${liczba}`
  }).catch(reportError)
  return element
}

/** @param {Pytanie} pytanie @param {Odpowiedz | null} odpowiedz @param {(wartosc: string) => void} naWybor @returns {HTMLElement} */
function poleOdpowiedzi(pytanie, odpowiedz, naWybor) {
  const wartosc = odpowiedz === null ? null : String(odpowiedz.wartosc)
  if (pytanie.typ === 'tak_nie' || pytanie.typ === 'wybor') {
    const opcje = pytanie.typ === 'tak_nie' ? TAK_NIE : (pytanie.opcje ?? []).map((o) => ({ wartosc: o, etykieta: o }))
    return h('div', { class: 'pole' }, chipy({ id: 'pytanie-odpowiedz', etykieta: 'Odpowiedź', opcje, wybrana: wartosc, naZmiane: naWybor }),
      h('p', { class: 'pole__blad', id: 'pytanie-odpowiedz-blad', role: 'alert', hidden: true }))
  }
  const czyLiczba = pytanie.typ === 'liczba'
  const tekst = typeof odpowiedz?.wartosc === 'number' ? tekstLiczby(odpowiedz.wartosc) : wartosc ?? ''
  return pole({ id: 'pytanie-odpowiedz', etykieta: 'Odpowiedź', rodzaj: czyLiczba ? 'liczba' : 'tekst', wartosc: tekst,
    podpowiedz: czyLiczba && pytanie.jednostka ? `Jednostka: ${pytanie.jednostka}` : undefined })
}

/**
 * Odpowiedz z pol arkusza albo tekst bledu pola odpowiedzi (pusta, nie liczba).
 * @param {Pytanie} pytanie @param {HTMLFormElement} formularz @param {string | null} wybrana wartosc chipow
 * @returns {Odpowiedz | string}
 */
function odpowiedzZPol(pytanie, formularz, wybrana) {
  const wpis = formularz.querySelector('#pytanie-odpowiedz')
  const notatka = formularz.querySelector('#pytanie-notatka')
  const tekstNotatki = notatka instanceof HTMLInputElement ? notatka.value : ''
  if (pytanie.typ === 'tak_nie' || pytanie.typ === 'wybor') return wybrana === null ? WYBIERZ : { wartosc: wybrana, notatka: tekstNotatki }
  const tekst = wpis instanceof HTMLInputElement ? wpis.value.trim() : ''
  if (pytanie.typ === 'tekst') return tekst === '' ? WPISZ_TEKST : { wartosc: tekst, notatka: tekstNotatki }
  const liczba = parsujLiczbe(tekst)
  return liczba === null ? WPISZ_LICZBE : { wartosc: liczba, notatka: tekstNotatki }
}

/** @param {HTMLFormElement} formularz @param {string | null} bladOdpowiedzi @param {string | null} bladNotatki */
function pokazBledyPol(formularz, bladOdpowiedzi, bladNotatki) {
  const odpowiedz = formularz.querySelector('#pytanie-odpowiedz')?.closest('.pole')
  const notatka = formularz.querySelector('#pytanie-notatka')?.closest('.pole')
  const bladWyboru = formularz.querySelector('#pytanie-odpowiedz-blad')
  if (bladWyboru instanceof HTMLElement) {
    bladWyboru.textContent = bladOdpowiedzi ?? ''
    bladWyboru.hidden = !bladOdpowiedzi
  } else if (odpowiedz instanceof HTMLElement) ustawBlad(odpowiedz, bladOdpowiedzi)
  if (notatka instanceof HTMLElement) ustawBlad(notatka, bladNotatki)
  const pierwszy = bladOdpowiedzi ? formularz.querySelector('#pytanie-odpowiedz, input[name="pytanie-odpowiedz"]') : bladNotatki ? notatka?.querySelector('input') : null
  if (pierwszy instanceof HTMLElement) pierwszy.focus()
}

/**
 * Arkusz odpowiedzi: pole wg typu pytania, notatka, „Zapisz” i (przy zapisanej odpowiedzi) „Usuń odpowiedź”. Blad zapisu
 * zostawia arkusz otwarty z komunikatem; po zapisie arkusz sie zamyka (fokus wraca do przycisku), a potem `poZapisie` rysuje liste.
 * @param {PytanieEkranu} wpis @param {ZapisOdpowiedzi} zapisz @param {(pytanieId: string) => void} poZapisie
 */
function otworzArkusz({ pytanie, odpowiedz }, zapisz, poZapisie) {
  let wybrana = odpowiedz === null ? null : String(odpowiedz.wartosc)
  const komunikat = h('div', { class: 'kreator__komunikat', 'aria-live': 'polite' })
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true },
    poleOdpowiedzi(pytanie, odpowiedz, (w) => { wybrana = w }),
    pole({ id: 'pytanie-notatka', etykieta: 'Notatka (opcjonalnie)', wartosc: odpowiedz?.notatka ?? '' }),
    komunikat,
    przycisk({ tekst: 'Zapisz', typ: 'submit' }),
    odpowiedz === null ? null : przycisk({ tekst: 'Usuń odpowiedź', rodzaj: 'tekstowy', ikona: 'trash', naKlik: () => wyslij(null) }))
  const dialog = arkusz({ tytul: pytanie.tresc }, formularz)

  /** @param {Odpowiedz | null} nowa */
  function wyslij(nowa) {
    const blad = zapisz(pytanie.id, nowa)
    if (blad === null) {
      dialog.close()
      return poZapisie(pytanie.id)
    }
    if (blad === ZA_DLUGA || blad === ZA_DLUGA_NOTATKA) return pokazBledyPol(formularz, blad === ZA_DLUGA ? blad : null, blad === ZA_DLUGA_NOTATKA ? blad : null)
    komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst: blad }))
  }

  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    const nowa = odpowiedzZPol(pytanie, formularz, wybrana)
    if (typeof nowa === 'string') return pokazBledyPol(formularz, nowa, null)
    pokazBledyPol(formularz, null, null)
    wyslij(nowa)
  })
  dialog.addEventListener('close', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  const pierwsze = formularz.querySelector('input:checked') ?? formularz.querySelector('input')
  if (pierwsze instanceof HTMLElement) pierwsze.focus()
}

/**
 * Pozycja listy: tresc pytania, odpowiedz (przycisk zmiany) z pigulka skutku albo „+ Dodaj odpowiedź”; wycena wykonana — bez akcji.
 * @param {PytanieEkranu} wpis @param {number} i @param {{ czyEdycja: boolean, naOtworz: (wpis: PytanieEkranu) => void }} opcje
 */
function elementPytania(wpis, i, { czyEdycja, naOtworz }) {
  const idTresci = `pytanie-${i}-tresc`
  const opis = wpis.opis
  const akcja = (/** @type {import('../ui/h.js').Dzieci} */ tresc, /** @type {string} */ klasa) => h('button', {
    type: 'button', class: klasa, 'data-pytanie': wpis.pytanie.id, 'aria-describedby': idTresci, on: { click: () => naOtworz(wpis) },
  }, tresc)
  const odpowiedz = opis === null
    ? czyEdycja ? akcja('+ Dodaj odpowiedź', 'przycisk przycisk--tekstowy pytanie__dodaj') : h('p', { class: 'pytanie__brak' }, '–')
    : czyEdycja ? akcja([h('span', { class: 'wizualnie-ukryte' }, 'Zmień odpowiedź: '), opis], 'pytanie__odpowiedz')
      : h('p', { class: 'pytanie__odpowiedz' }, opis)
  return h('li', { class: 'pytanie' },
    h('p', { class: 'pytanie__tresc', id: idTresci }, wpis.pytanie.tresc),
    odpowiedz,
    wpis.skutek ? h('p', { class: 'pigulka pigulka--skutek' }, ikona('check'), h('span', null, wpis.skutek)) : null)
}

/** Tekst prosby widoczny (i dla czytnika ekranu), gdy schowek odmowil, a tekst jest zaznaczony do skopiowania. @param {HTMLElement} element */
function pokazProsbe(element) {
  element.className = 'pytania__prosba'
  element.removeAttribute('aria-hidden')
}

/** @param {HTMLElement} kontener @param {string} tekst */
function pokazBrakWyceny(kontener, tekst) {
  kontener.replaceChildren(naglowek({ tytul: TYTUL, wstecz: sciezka('start') }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst }), przycisk({ tekst: 'Wróć na start', rodzaj: 'drugi', adres: sciezka('start') })))
}

/**
 * Tekst bledu zapisu odpowiedzi: zla wartosc i notatka przy polach, odmowa i awaria zapisu z tekstow kreatora.
 * @param {unknown} blad @returns {string}
 */
function tekstBleduZapisu(blad) {
  if (blad instanceof BladWejscia && blad.kod === 'odpowiedz') return ZA_DLUGA
  if (blad instanceof BladWejscia && blad.kod === 'notatka') return ZA_DLUGA_NOTATKA
  return zglosBladKreatora(blad)
}

/** @type {Widok} */
export const widokPytan = {
  render(kontener, { parametry, kontekst }) {
    const { katalog, magazyn } = kontekst
    const poczatkowa = znajdzWycene(wczytajStan(magazyn), parametry.id ?? '')
    if (!poczatkowa) return pokazBrakWyceny(kontener, 'Nie ma tej wyceny. Mogła zostać usunięta.')
    let wycena = poczatkowa
    let isAktualny = true
    const powrot = adresPowrotu(wycena)
    const nazwaUslugi = katalog.usluga(wycena.wejscie.uslugaId).nazwa
    let gora = naglowek({ tytul: TYTUL, podtytul: nazwaUslugi, wstecz: powrot })
    const tresc = h('div', { class: 'tresc pytania' })
    const komunikat = h('div', { class: 'kreator__komunikat', 'aria-live': 'polite' })
    kontener.replaceChildren(gora, tresc, h('div', { class: 'pytania__stopka' }, przycisk({ tekst: 'Gotowe', adres: powrot })))

    /** @type {string | null} komunikat po zamknieciu arkusza (odpowiedzi zmienione w innej karcie) */
    let informacja = null

    /** @type {(pytania: Pytania) => ZapisOdpowiedzi} */
    const zapisOdpowiedzi = (pytania) => (id, odpowiedz) => {
      try {
        wycena = zapiszOdpowiedz(kontekst, wycena.id, id, odpowiedz, pytania)
        return null
      } catch (blad) {
        if (!(blad instanceof BladWyceny) || blad.kod !== 'nieaktualna') return tekstBleduZapisu(blad)
        const swieza = znajdzWycene(wczytajStan(magazyn), wycena.id)
        if (swieza) wycena = swieza
        informacja = NIEAKTUALNA
        return null
      }
    }

    /** @type {(pytania: Pytania) => (pytanieId: string) => void} */
    const poZapisie = (pytania) => (pytanieId) => {
      rysuj(pytania, `[data-pytanie="${CSS.escape(pytanieId)}"]`)
      komunikat.replaceChildren(...(informacja === null ? [] : [baner({ rodzaj: 'info', tekst: informacja })]))
      informacja = null
    }

    /** @param {Pytania} pytania @returns {Node[]} baner prosby o zdjecia z „Kopiuj prośbę” i tekst prosby (zaznaczany zapasowo) */
    function prosbaOZdjecia(pytania) {
      const zdjecia = pytania.zdjecia && Object.hasOwn(pytania.zdjecia, wycena.wejscie.uslugaId) ? pytania.zdjecia[wycena.wejscie.uslugaId] : undefined
      if (!zdjecia) return []
      const tekstProsby = h('p', { class: 'wizualnie-ukryte', 'aria-hidden': 'true' }, zdjecia.prosba)
      const handleKopiuj = async () => {
        const czySkopiowano = await kopiujDoSchowka(zdjecia.prosba, tekstProsby)
        if (!isAktualny) return
        if (!czySkopiowano) pokazProsbe(tekstProsby)
        komunikat.replaceChildren(czySkopiowano ? h('p', { class: 'wizualnie-ukryte' }, 'Skopiowano') : baner({ rodzaj: 'info', tekst: NIE_SKOPIOWANO }))
      }
      return [baner({ rodzaj: 'info', tekst: zdjecia.podpowiedz, akcja: { tekst: 'Kopiuj prośbę', naKlik: () => void handleKopiuj().catch(reportError) } }), tekstProsby]
    }

    /** @param {Pytania} pytania @param {string} [fokus] */
    function rysuj(pytania, fokus) {
      const ekran = pytaniaWyceny(wycena, pytania, kontekst)
      for (const blad of ekran.bledne) reportError(blad)
      const nowa = naglowek({ tytul: TYTUL, podtytul: `${nazwaUslugi} · ${ekran.odpowiedziane} z ${ekran.liczba}`, wstecz: powrot })
      gora.replaceWith(nowa)
      gora = nowa
      const opcje = { czyEdycja: wycena.status !== 'wykonana',
        naOtworz: (/** @type {PytanieEkranu} */ wpis) => otworzArkusz(wpis, zapisOdpowiedzi(pytania), poZapisie(pytania)) }
      tresc.replaceChildren(
        karta({ klasa: 'karta--bez-odstepu' }, h('ul', { class: 'lista-pytan' }, ekran.lista.map((wpis, i) => elementPytania(wpis, i, opcje)))),
        ...prosbaOZdjecia(pytania),
        komunikat)
      const element = fokus ? tresc.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    async function wczytaj() {
      tresc.replaceChildren(h('p', { class: 'ladowanie', role: 'status' }, WCZYTYWANIE))
      try {
        const pytania = await pytaniaAplikacji(katalog)
        if (isAktualny) rysuj(pytania)
      } catch (blad) {
        if (!isAktualny) return
        tresc.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBleduPytan(blad),
          akcja: { tekst: 'Spróbuj jeszcze raz', naKlik: () => void wczytaj().catch(reportError) } }))
      }
    }

    void wczytaj().catch(reportError)
    return () => {
      isAktualny = false
    }
  },
}
