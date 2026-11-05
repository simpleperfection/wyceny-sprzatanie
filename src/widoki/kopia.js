// Ekran kopii danych (`#/kopia`, powrot „Ustawienia firmy”): zapis calego stanu do pliku jedyna glowna akcja „Zrób kopię”,
// wczytanie kopii z pliku z wyborem „Połącz” / „Zastąp” i czestotliwosc przypomnien o kopii (R23); wyjasnienia pod „Więcej”.
// Przed kreatorem ustawien karta przypomnien jest ukryta.

import { dniOdKopii, odczytajKopie, oznaczKopie, podsumowanieKopii, utworzKopie, wczytajKopie } from '../dane/kopia.js'
import { wczytajStan } from '../dane/magazyn.js'
import { DNI_PRZYPOMNIENIA_KOPII, zapiszUstawienia } from '../dane/ustawienia.js'
import { czyUrzadzenieIos, srodowiskoPrzegladarki } from '../pwa/rejestracja.js'
import { h } from '../ui/h.js'
import { chipy, przycisk } from '../ui/komponenty/formularz.js'
import { baner, karta, naglowek, wiecej } from '../ui/komponenty/uklad.js'
import { wybierzPlik, zapiszPlik } from '../ui/plik.js'
import { sciezka } from '../ui/trasy.js'
import {
  czyPytacOTryb, etykietyPodsumowania, jestBledemPliku, PLIKI_KOPII, tekstBleduWczytania, tekstOstatniejKopii, tekstSprawdzPlik,
  tekstWczytania,
} from './kopia-teksty.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/kopia.js').TrybWczytania} TrybWczytania */
/** @typedef {{ rodzaj: 'sukces' | 'info', tekst: string }} KomunikatZapisu */

const ID_PRZYPOMNIEN = 'przypomnienie-kopii'
const BLAD_ZAPISU_KOPII = 'Nie udało się zapisać kopii. Spróbuj jeszcze raz.'
const KOPIA_ANULOWANA = 'Nie zapisano kopii: okno zamknięto bez wyboru miejsca.'
const BEZ_POTWIERDZENIA = 'Aplikacja nie może tego potwierdzić, więc nadal będzie przypominać o kopii.'
const NA_IPHONIE = 'W oknie udostępniania wybierz „Zachowaj w Plikach” i zatwierdź zapis.'
const BEZ_KONTA_I_SERWERA = 'Aplikacja nie ma konta ani serwera. Zapisz kopię do pliku i trzymaj ją np. w mailu albo w chmurze.'
const DANE_KLIENTOW_W_PLIKU = 'Plik kopii zawiera dane klientów, także notatki. Trzymaj go w bezpiecznym miejscu.'
const ID_UWAGI_O_DANYCH = 'kopia-dane-klientow'

/**
 * Zapisuje kopie do pliku. Data ostatniej kopii zmienia sie tylko po pewnym zapisie, bo wylacza przypomnienia, a dane sa tylko
 * na tym urzadzeniu. Trzeba wolac w obsludze klikniecia: `zapisz` otwiera okno wymagajace gestu uzytkownika.
 * @param {Magazyn} magazyn @param {Date} teraz @param {typeof zapiszPlik} [zapisz]
 * @returns {Promise<KomunikatZapisu>}
 */
export async function zapiszKopie(magazyn, teraz, zapisz = zapiszPlik) {
  const { nazwaPliku, tresc } = utworzKopie(wczytajStan(magazyn), teraz)
  const wynik = await zapisz(nazwaPliku, tresc, 'application/json')
  if (wynik === 'anulowany') return { rodzaj: 'info', tekst: KOPIA_ANULOWANA }
  if (wynik === 'niepotwierdzony') return { rodzaj: 'info', tekst: `${tekstSprawdzPlik(nazwaPliku)} ${BEZ_POTWIERDZENIA}` }
  oznaczKopie(magazyn, teraz)
  return { rodzaj: 'sukces', tekst: `Kopia zapisana: ${nazwaPliku}` }
}

/** @param {HTMLDialogElement} dialog @param {string} tryb @param {string} tytul @param {string} opis */
function opcjaWczytania(dialog, tryb, tytul, opis) {
  return h('button', { type: 'button', class: 'opcja-arkusza opcja-dialogu', on: { click: () => dialog.close(tryb) } },
    h('span', { class: 'opcja-arkusza__tresc' },
      h('span', { class: 'opcja-arkusza__tytul' }, tytul),
      h('span', { class: 'opcja-arkusza__opis' }, opis)))
}

/**
 * Modalny wybor trybu wczytania; Escape i „Anuluj” daja null. Natywny <dialog> trzyma fokus i oddaje go po zamknieciu.
 * @param {(dialog: HTMLDialogElement) => void} naOtwarcie dostaje dialog, zeby widok mogl go zamknac przy wyjsciu z ekranu
 * @returns {Promise<TrybWczytania | null>}
 */
function zapytajOTryb(naOtwarcie) {
  return new Promise((resolve) => {
    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'kopia-dialog-tytul' })
    dialog.append(h('div', { class: 'dialog__wnetrze' },
      h('h2', { class: 'dialog__tytul', id: 'kopia-dialog-tytul' }, 'W aplikacji są już dane. Co zrobić z kopią?'),
      opcjaWczytania(dialog, 'polacz', 'Połącz', 'Dodaj wyceny z kopii, a przy tych samych zostaw nowsze.'),
      opcjaWczytania(dialog, 'zastap', 'Zastąp', 'Usuń obecne dane i wczytaj tylko kopię.'),
      przycisk({ tekst: 'Anuluj', rodzaj: 'drugi', naKlik: () => dialog.close() })))
    dialog.addEventListener('close', () => {
      dialog.remove()
      const tryb = dialog.returnValue
      resolve(tryb === 'polacz' || tryb === 'zastap' ? tryb : null)
    })
    document.body.append(dialog)
    dialog.showModal()
    naOtwarcie(dialog)
  })
}

/**
 * @param {Stan} stan @param {boolean} czyIos @param {() => void} naZapis
 * @returns {HTMLElement} karta z jedyna glowna akcja ekranu „Zrób kopię”
 */
function kartaZapisu(stan, czyIos, naZapis) {
  const dni = dniOdKopii(stan, new Date())
  const zapisz = przycisk({ tekst: 'Zrób kopię', ikona: 'download', naKlik: naZapis })
  zapisz.setAttribute('aria-describedby', ID_UWAGI_O_DANYCH)
  return karta({ klasa: 'kopia__karta' },
    h('h2', { class: 'karta__tytul' }, 'Zapisz kopię do pliku'),
    h('p', { class: 'kopia__opis' }, tekstOstatniejKopii(dni, stan.kopia.ostatnia)),
    h('ul', { class: 'kopia__podsumowanie', 'aria-label': 'Zawartość kopii' },
      etykietyPodsumowania(podsumowanieKopii(stan)).map((etykieta) => h('li', { class: 'pigulka' }, etykieta))),
    h('div', { class: 'kopia__akcja', 'data-akcja': 'zapisz' },
      zapisz,
      czyIos ? h('p', { class: 'kopia__uwaga' }, NA_IPHONIE) : null,
      h('p', { class: 'kopia__uwaga', id: ID_UWAGI_O_DANYCH }, DANE_KLIENTOW_W_PLIKU)),
    wiecej({}, h('p', null, BEZ_KONTA_I_SERWERA)))
}

/** @param {() => void} naWybor */
function kartaOdczytu(naWybor) {
  return karta({ klasa: 'kopia__karta' },
    h('h2', { class: 'karta__tytul' }, 'Wczytaj kopię z pliku'),
    h('div', { class: 'kopia__akcja', 'data-akcja': 'wczytaj' },
      przycisk({ tekst: 'Wybierz plik', rodzaj: 'drugi', ikona: 'upload', naKlik: naWybor })),
    wiecej({}, h('p', null, 'Zanim wczytamy kopię, zapytamy, czy połączyć ją z danymi na tym urządzeniu, czy je zastąpić.')))
}

/** @param {number} wybrane @param {(dni: number) => void} naZmiane */
function kartaPrzypomnien(wybrane, naZmiane) {
  return karta({},
    chipy({
      id: ID_PRZYPOMNIEN, etykieta: 'Przypominaj o kopii', wybrana: String(wybrane), naZmiane: (wartosc) => naZmiane(Number(wartosc)),
      opcje: DNI_PRZYPOMNIENIA_KOPII.map((dni) => ({ wartosc: String(dni), etykieta: `co ${dni} dni` })),
    }))
}

/** @param {HTMLElement} kontener @param {string} selektor */
function ustawFokus(kontener, selektor) {
  const element = kontener.querySelector(selektor)
  if (element instanceof HTMLElement) element.focus()
}

/** @type {Widok} */
export const widokKopii = {
  render(kontener, { kontekst }) {
    const { magazyn, domyslne } = kontekst
    const komunikat = h('div', { class: 'kopia__komunikat', 'aria-live': 'polite' })
    const tresc = h('div', { class: 'tresc' })
    const czyIos = czyUrzadzenieIos(srodowiskoPrzegladarki())
    let numerWczytania = 0
    let czyZakonczony = false
    let czyZapisywanie = false
    /** @type {HTMLDialogElement | null} */
    let otwartyDialog = null

    /** @param {'sukces' | 'info' | 'blad'} rodzaj @param {string} tekst */
    const pokaz = (rodzaj, tekst) => komunikat.replaceChildren(baner({ rodzaj, tekst }))

    /** @param {string} [fokus] selektor elementu, ktory ma dostac fokus po przerysowaniu */
    function rysuj(fokus) {
      const stan = wczytajStan(magazyn)
      tresc.replaceChildren(
        komunikat,
        kartaZapisu(stan, czyIos, () => void handleZapis()),
        kartaOdczytu(() => void handleWczytanie()),
        ...(stan.ustawienia ? [kartaPrzypomnien(stan.ustawienia.przypomnienieKopiiDni, handlePrzypomnienie)] : []))
      if (fokus) ustawFokus(tresc, fokus)
    }

    /** Drugie klikniecie przy otwartym oknie udostepniania jest pomijane; po wyjsciu z ekranu nie ma czego przerysowac. */
    async function handleZapis() {
      if (czyZapisywanie) return
      czyZapisywanie = true
      try {
        const { rodzaj, tekst } = await zapiszKopie(magazyn, new Date())
        pokaz(rodzaj, tekst)
      } catch (blad) {
        pokaz('blad', BLAD_ZAPISU_KOPII)
        reportError(blad)
      } finally {
        czyZapisywanie = false
      }
      if (!czyZakonczony) rysuj('[data-akcja="zapisz"] button')
    }

    /** Wczytanie z pliku; wynik starszego wyboru (drugie klikniecie, wyjscie z ekranu) jest pomijany. */
    async function handleWczytanie() {
      const numer = ++numerWczytania
      const czyAktualne = () => !czyZakonczony && numer === numerWczytania
      try {
        const tekst = await wybierzPlik(PLIKI_KOPII)
        if (tekst === null || !czyAktualne()) return
        const { stan: zPliku } = odczytajKopie(tekst)
        const tryb = czyPytacOTryb(wczytajStan(magazyn)) ? await zapytajOTryb((dialog) => { otwartyDialog = dialog }) : 'zastap'
        otwartyDialog = null
        if (tryb === null || !czyAktualne()) return
        wczytajKopie(magazyn, zPliku, tryb)
        pokaz('sukces', tekstWczytania(tekst, zPliku))
      } catch (blad) {
        if (!czyAktualne()) return
        pokaz('blad', tekstBleduWczytania(blad))
        if (!jestBledemPliku(blad)) reportError(blad)
      }
      rysuj('[data-akcja="wczytaj"] button')
    }

    /** @param {number} dni */
    function handlePrzypomnienie(dni) {
      try {
        zapiszUstawienia(magazyn, { przypomnienieKopiiDni: dni }, domyslne)
        komunikat.replaceChildren()
      } catch (blad) {
        pokaz('blad', tekstBleduZapisu(blad))
        reportError(blad)
        rysuj(`input[name="${ID_PRZYPOMNIEN}"]:checked`)
      }
    }

    kontener.append(
      naglowek({ tytul: 'Kopia danych', podtytul: 'Twoje dane są tylko na tym urządzeniu', wstecz: sciezka('ustawienia'),
        wsteczTekst: 'Ustawienia firmy' }),
      tresc)
    rysuj()
    return () => {
      czyZakonczony = true
      otwartyDialog?.close()
    }
  },
}
