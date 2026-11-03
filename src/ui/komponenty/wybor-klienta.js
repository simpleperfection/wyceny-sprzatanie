// Wybor klienta w wycenie i zleceniu (R19): wiersz „Klient” z wybranym klientem i przyciskiem „Zmień” albo przycisk „Wybierz
// klienta”. Arkusz „Klient” ma pole wyszukiwania, propozycje (propozycjeKlientow), wiersz „Dodaj nowego klienta: {tekst}” z krotkim
// formularzem w tym samym arkuszu i opcje „Bez klienta”, gdy wybor nie jest wymagany. Nowy klient zapisuje sie dopiero przy
// „Zapisz klienta” (id nadane przy otwarciu formularza), wiec porzucony arkusz nie zostawia klienta. Zapis wyboru robi `naWybor`.

import { DLUGOSCI_KLIENTA, dodajKlienta, klient as znajdzKlienta } from '../../dane/klienci.js'
import { wczytajStan } from '../../dane/magazyn.js'
import { inicjaly, opisWiersza, propozycjeKlientow } from '../../widoki/klienci-dane.js'
import { tekstBleduKlienta } from '../../widoki/teksty-bledow.js'
import { h } from '../h.js'
import { pole, przycisk, ustawBlad } from './formularz.js'
import { arkusz, baner, karta, wiersz } from './uklad.js'

/**
 * @typedef {import('../../dane/magazyn.js').Magazyn} Magazyn
 * @typedef {import('../../dane/klienci.js').Klient} Klient
 * @typedef {import('../../dane/klienci.js').PoleKlienta} PoleKlienta
 * @typedef {{ magazyn: Magazyn, wybranyId: string | null, wymagany?: boolean, naWybor: (klientId: string | null) => string | null,
 *   czyAktywny?: () => boolean, id?: string }} OpcjeWyboruKlienta naWybor: zapis wyboru (tekst bledu albo null); czyAktywny: ekran,
 *   ktory otworzyl arkusz, jest jeszcze otwarty; id: przedrostek id elementow (dwa wybory na jednym ekranie)
 * @typedef {{ element: HTMLElement, sprawdz: () => boolean }} WyborKlienta sprawdz: wymagany wybor bez klienta pokazuje „Wybierz
 *   klienta.”, przenosi fokus na wiersz i daje false
 */

const BRAK_WYBORU = 'Wybierz klienta.'
const POLA_NOWEGO = /** @type {const} */ ([
  { nazwa: 'nazwa', etykieta: 'Nazwa', rodzaj: 'tekst' },
  { nazwa: 'telefon', etykieta: 'Telefon', rodzaj: 'telefon' },
  { nazwa: 'adres', etykieta: 'Adres', rodzaj: 'tekst' },
])

/** @param {HTMLElement} element pole z `pole()` @returns {HTMLInputElement} */
function wejsciePola(element) {
  const wejscie = element.querySelector('input')
  if (!(wejscie instanceof HTMLInputElement)) throw new TypeError('Pole bez wejścia')
  return wejscie
}

/**
 * Krotki formularz nowego klienta w arkuszu: nazwa z wpisanego tekstu, telefon i adres; „Zapisz klienta” zapisuje go (dodajKlienta)
 * i oddaje id. Bledy zapisu pod polem albo nad przyciskiem.
 * @param {{ magazyn: Magazyn, nazwa: string, przedrostek: string, naZapis: (klientId: string) => void }} opcje
 * @returns {HTMLFormElement}
 */
function formularzNowego({ magazyn, nazwa, przedrostek, naZapis }) {
  const id = crypto.randomUUID()
  /** @type {Record<PoleKlienta, HTMLElement | undefined>} */
  const pola = { nazwa: undefined, telefon: undefined, adres: undefined, notatki: undefined }
  const elementy = POLA_NOWEGO.map(({ nazwa: p, etykieta, rodzaj }) => {
    const element = pole({ id: `${przedrostek}-${p}`, etykieta, rodzaj, wartosc: p === 'nazwa' ? nazwa.trim() : '',
      autocomplete: p === 'adres' ? 'street-address' : 'off', naZmiane: () => ustawBlad(element, null) })
    wejsciePola(element).maxLength = DLUGOSCI_KLIENTA[p]
    pola[p] = element
    return element
  })
  const komunikat = h('div', { class: 'arkusz__komunikat', 'aria-live': 'polite' })
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true }, elementy, komunikat,
    przycisk({ tekst: 'Zapisz klienta', typ: 'submit' }))
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    komunikat.replaceChildren()
    const [nowaNazwa = '', telefon = '', adres = ''] = elementy.map((e) => wejsciePola(e).value)
    try {
      dodajKlienta(magazyn, { nazwa: nowaNazwa, telefon, adres }, { id })
    } catch (blad) {
      const { tekst, pole: przyczyna } = tekstBleduKlienta(blad)
      const element = przyczyna === null ? undefined : pola[przyczyna]
      if (element === undefined) return komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))
      ustawBlad(element, tekst)
      return wejsciePola(element).focus()
    }
    naZapis(id)
  })
  return formularz
}

/**
 * @param {OpcjeWyboruKlienta} opcje
 * @returns {WyborKlienta}
 */
export function wyborKlienta({ magazyn, wybranyId, wymagany = false, naWybor, czyAktywny = () => true, id = 'wybor-klienta' }) {
  let wybrany = wybranyId
  const idBledu = `${id}-blad`
  const blad = h('p', { class: 'pole__blad', id: idBledu, role: 'alert', hidden: true })
  const miejsce = h('div', { class: 'wybor-klienta__wiersz' })
  const element = h('div', { class: 'wybor-klienta', 'data-pole': 'klient' }, miejsce, blad)

  /** @param {string | null} tekst */
  function pokazBlad(tekst) {
    blad.textContent = tekst ?? ''
    blad.hidden = tekst === null
    element.classList.toggle('pole--blad', tekst !== null)
  }

  /** @returns {Klient | null} wybrany klient, gdy jest zapisany (usuniety w innej karcie — null) */
  const wybranyKlient = () => (wybrany === null ? null : znajdzKlienta(wczytajStan(magazyn), wybrany))

  function rysuj() {
    const k = wybranyKlient()
    const etykieta = h('span', { class: 'wybor-pola__etykieta' }, 'Klient')
    if (k === null) {
      return miejsce.replaceChildren(h('button', { type: 'button', class: 'wybor-pola', 'aria-haspopup': 'dialog',
        'aria-describedby': idBledu, on: { click: otworz } }, etykieta, h('span', { class: 'wybor-pola__wartosc' }, 'Wybierz klienta')))
    }
    miejsce.replaceChildren(h('div', { class: 'wybor-pola wybor-klienta__wybrany' },
      h('span', { class: 'wybor-klienta__tresc' }, etykieta, h('span', { class: 'wybor-pola__wartosc' }, k.nazwa)),
      h('button', { type: 'button', class: 'przycisk przycisk--tekstowy', 'aria-haspopup': 'dialog',
        'aria-label': `Zmień klienta: ${k.nazwa}`, on: { click: otworz } }, 'Zmień')))
  }

  function otworz() {
    const stan = wczytajStan(magazyn)
    const lista = h('div', { class: 'wybor-klienta__lista' })
    const komunikat = h('div', { class: 'arkusz__komunikat', 'aria-live': 'polite' })
    const szukaj = pole({ id: `${id}-szukaj`, etykieta: 'Szukaj albo wpisz nowego', naZmiane: () => rysujListe() })
    const wejscie = wejsciePola(szukaj)
    wejscie.maxLength = DLUGOSCI_KLIENTA.nazwa
    wejscie.type = 'search'
    const tresc = h('div', { class: 'wybor-klienta__arkusz' }, h('search', null, szukaj), lista)
    const dialog = arkusz({ tytul: 'Klient' }, tresc, komunikat)

    /** @param {string | null} klientId */
    function wybierz(klientId) {
      if (!czyAktywny()) return dialog.close()
      const tekst = naWybor(klientId)
      if (tekst !== null) return komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))
      wybrany = klientId
      pokazBlad(null)
      dialog.close()
      rysuj()
      miejsce.querySelector('button')?.focus()
    }

    function handleDodaj() {
      komunikat.replaceChildren()
      const formularz = formularzNowego({ magazyn, nazwa: wejscie.value, przedrostek: `${id}-nowy`, naZapis: wybierz })
      tresc.replaceChildren(formularz)
      formularz.querySelector('input')?.focus()
    }

    function rysujListe() {
      const fraza = wejscie.value.trim()
      /** @param {Klient} k */
      const wierszKlienta = (k) => {
        const w = wiersz({ tytul: k.nazwa, opis: opisWiersza(k) ?? undefined, awatar: inicjaly(k.nazwa), naKlik: () => wybierz(k.id) })
        if (k.id === wybrany) w.setAttribute('aria-current', 'true')
        return w
      }
      const wiersze = [
        ...propozycjeKlientow(stan, fraza).map(wierszKlienta),
        fraza === '' ? null : wiersz({ tytul: `Dodaj nowego klienta: ${fraza}`, ikona: 'plus', naKlik: handleDodaj }),
        wymagany ? null : wiersz({ tytul: 'Bez klienta', naKlik: () => wybierz(null) }),
      ].filter((w) => w !== null)
      lista.replaceChildren(wiersze.length === 0 ? '' : karta({ klasa: 'karta--bez-odstepu' }, wiersze))
    }

    rysujListe()
    dialog.addEventListener('close', () => dialog.remove())
    document.body.append(dialog)
    dialog.showModal()
    wejscie.focus()
  }

  rysuj()
  return {
    element,
    sprawdz() {
      if (!wymagany || wybranyKlient() !== null) return true
      pokazBlad(BRAK_WYBORU)
      miejsce.querySelector('button')?.focus()
      return false
    },
  }
}
