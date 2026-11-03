// Formularz klienta: nowy (`#/klienci/nowy`) i edycja (`#/klienci/<id>/edycja`). Pola nazwa, telefon, adres i notatki
// z granicami DLUGOSCI_KLIENTA; id nowego klienta powstaje przy otwarciu ekranu, wiec podwojne „Zapisz” nie dubluje klienta.
// Po zapisie adres formularza w historii zamienia sie na karte klienta (wstecz z karty nie otwiera pustego formularza).
// Przy wpisywaniu nazwy podpowiedz, gdy klient o tej nazwie juz jest (podobnyKlient), z linkiem do jego karty.

import { DLUGOSCI_KLIENTA, dodajKlienta, klient, zapiszKlienta } from '../dane/klienci.js'
import { wczytajStan } from '../dane/magazyn.js'
import { h } from '../ui/h.js'
import { pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { baner, naglowek } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { podobnyKlient } from './klienci-dane.js'
import { tekstBleduKlienta } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/klienci.js').Klient} Klient */
/** @typedef {import('../dane/klienci.js').PoleKlienta} PoleKlienta */

const PRZEDROSTEK_ID = 'klient-'
const WIERSZE_NOTATEK = 4
const NIE_MA_KLIENTA = 'Nie ma takiego klienta.'

/** @param {PoleKlienta} nazwa */
const idPola = (nazwa) => `${PRZEDROSTEK_ID}${nazwa}`

/**
 * Pole notatek jako <textarea> w ukladzie pola z `pole()` (etykieta, podpis, komunikat bledu pod spodem).
 * @param {string} wartosc @returns {HTMLDivElement}
 */
function poleNotatek(wartosc) {
  const id = idPola('notatki')
  return h('div', { class: 'pole' },
    h('label', { class: 'pole__etykieta', for: id }, 'Notatki'),
    h('textarea', { id, name: id, class: 'pole__wejscie klient-formularz__notatki', rows: WIERSZE_NOTATEK,
      maxlength: DLUGOSCI_KLIENTA.notatki, 'aria-describedby': `${id}-podpowiedz ${id}-blad` }, wartosc),
    h('p', { class: 'pole__podpowiedz', id: `${id}-podpowiedz` }, 'Np. klucze, kod do domofonu, zwierzęta'),
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert', hidden: true }))
}

/** @param {HTMLElement} element pole z `pole()` albo poleNotatek @returns {HTMLInputElement | HTMLTextAreaElement} */
function wejsciePola(element) {
  const wejscie = element.querySelector('input, textarea')
  if (!(wejscie instanceof HTMLInputElement) && !(wejscie instanceof HTMLTextAreaElement)) throw new TypeError('Pole bez wejścia')
  return wejscie
}

/** @param {HTMLElement} element @param {string | null} blad komunikat pod polem; `aria-invalid` takze na <textarea> */
function pokazBladPola(element, blad) {
  ustawBlad(element, blad)
  wejsciePola(element).setAttribute('aria-invalid', blad ? 'true' : 'false')
}

/** @param {HTMLElement} kontener */
function ekranBrakuKlienta(kontener) {
  kontener.append(
    naglowek({ tytul: 'Edycja klienta', wstecz: sciezka('klienci'), wsteczTekst: 'Klienci' }),
    h('div', { class: 'tresc' },
      baner({ rodzaj: 'info', tekst: NIE_MA_KLIENTA, akcja: { tekst: 'Pokaż wszystkich klientów', adres: sciezka('klienci') } })))
}

/** @type {Widok} */
export const widokFormularzaKlienta = {
  render(kontener, { parametry, kontekst }) {
    const { magazyn, nawiguj } = kontekst
    const stan = wczytajStan(magazyn)
    const edytowanyId = parametry.id ?? null
    const edytowany = edytowanyId === null ? null : klient(stan, edytowanyId)
    if (edytowanyId !== null && edytowany === null) return ekranBrakuKlienta(kontener)
    const id = edytowany?.id ?? crypto.randomUUID()

    /** @type {Record<PoleKlienta, HTMLDivElement>} */
    const pola = {
      nazwa: pole({ id: idPola('nazwa'), etykieta: 'Nazwa', wartosc: edytowany?.nazwa ?? '', podpowiedz: 'Imię i nazwisko albo firma',
        naZmiane: (wartosc) => handleNazwa(wartosc) }),
      telefon: pole({ id: idPola('telefon'), etykieta: 'Telefon', rodzaj: 'telefon', wartosc: edytowany?.telefon ?? '',
        naZmiane: () => pokazBladPola(pola.telefon, null) }),
      adres: pole({ id: idPola('adres'), etykieta: 'Adres', wartosc: edytowany?.adres ?? '', naZmiane: () => pokazBladPola(pola.adres, null) }),
      notatki: poleNotatek(edytowany?.notatki ?? ''),
    }
    for (const nazwa of /** @type {const} */ (['nazwa', 'telefon', 'adres'])) wejsciePola(pola[nazwa]).maxLength = DLUGOSCI_KLIENTA[nazwa]
    const duplikat = h('div', { class: 'klient-formularz__duplikat', 'aria-live': 'polite' })
    const komunikat = h('div', { class: 'klient-formularz__komunikat', 'aria-live': 'polite' })
    /** @type {string | null} */
    let podpowiedzianyId = null

    /** @param {string} wartosc */
    function handleNazwa(wartosc) {
      pokazBladPola(pola.nazwa, null)
      const podobny = podobnyKlient(stan, wartosc, id)
      if ((podobny?.id ?? null) === podpowiedzianyId) return
      podpowiedzianyId = podobny?.id ?? null
      duplikat.replaceChildren(podobny === null ? '' : baner({ rodzaj: 'info', tekst: `Masz już klienta ${podobny.nazwa}.`,
        akcja: { tekst: 'Otwórz kartę', adres: sciezka('klient', { id: podobny.id }) } }))
    }

    /** @param {SubmitEvent} zdarzenie */
    function handleZapisz(zdarzenie) {
      zdarzenie.preventDefault()
      komunikat.replaceChildren()
      /** @param {PoleKlienta} nazwa */
      const wartosc = (nazwa) => wejsciePola(pola[nazwa]).value
      const dane = { nazwa: wartosc('nazwa'), telefon: wartosc('telefon'), adres: wartosc('adres'), notatki: wartosc('notatki') }
      try {
        if (edytowany === null) dodajKlienta(magazyn, dane, { id })
        else zapiszKlienta(magazyn, id, dane)
      } catch (blad) {
        const { tekst, pole: polePrzyczyny } = tekstBleduKlienta(blad)
        if (polePrzyczyny === null) return komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))
        pokazBladPola(pola[polePrzyczyny], tekst)
        return wejsciePola(pola[polePrzyczyny]).focus()
      }
      const adresKarty = sciezka('klient', { id })
      history.replaceState(null, '', adresKarty)
      nawiguj(adresKarty)
    }

    const formularz = h('form', { class: 'tresc klient-formularz', novalidate: true },
      pola.nazwa, duplikat, pola.telefon, pola.adres, pola.notatki, komunikat,
      przycisk({ tekst: 'Zapisz', typ: 'submit' }))
    formularz.addEventListener('submit', handleZapisz)
    wejsciePola(pola.notatki).addEventListener('input', () => pokazBladPola(pola.notatki, null))
    kontener.append(
      edytowany === null
        ? naglowek({ tytul: 'Nowy klient', wstecz: sciezka('klienci'), wsteczTekst: 'Klienci' })
        : naglowek({ tytul: 'Edycja klienta', wstecz: sciezka('klient', { id }), wsteczTekst: 'Karta klienta' }),
      formularz)
  },
}
