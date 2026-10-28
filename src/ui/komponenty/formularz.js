// Komponenty formularza z makiet wariantu B: pole z bledem pod spodem, licznik − / wartosc / +, chipy pojedynczego
// wyboru, przelacznik i przycisk. Kazdy zwraca element DOM; zmiany wartosci zglasza przez `naZmiane`.

import { bladZakresu, parsujLiczbe, tekstLiczby } from '../format.js'
import { h, ikona } from '../h.js'

/** @typedef {import('../ikony.js').NazwaIkony} NazwaIkony */
/**
 * @typedef {'tekst' | 'liczba' | 'telefon' | 'email'} RodzajPola
 * @typedef {{ id: string, etykieta: string, wartosc?: string, rodzaj?: RodzajPola, blad?: string | null, podpowiedz?: string,
 *   autocomplete?: string, naZmiane?: (wartosc: string) => void }} OpcjePola
 * @typedef {{ id: string, etykieta: string, wartosc: number, min?: number, max?: number, krok?: number, jednostka?: string,
 *   tekstBledu?: string, naZmiane: (wartosc: number) => void }} OpcjeLicznika tekstBledu: komunikat zlego wpisu zamiast ogolnego „Wpisz liczbę od … do …”
 * @typedef {{ id: string, etykieta: string, opis?: string, czyWlaczony: boolean, naZmiane: (czyWlaczony: boolean) => void }} OpcjePrzelacznika
 * @typedef {{ tekst: string, rodzaj?: 'glowny' | 'drugi' | 'tekstowy', ikona?: NazwaIkony, adres?: string, naKlik?: () => void,
 *   typ?: 'button' | 'submit', czyWylaczony?: boolean, etykieta?: string }} OpcjePrzycisku
 */

/** Typ i klawiatura ekranowa pola; liczby jako tekst z `inputmode="decimal"`, bo `type="number"` nie przyjmuje przecinka. */
const TYPY_POLA = Object.freeze({
  tekst: { type: 'text' },
  liczba: { type: 'text', inputmode: 'decimal' },
  telefon: { type: 'tel', inputmode: 'tel' },
  email: { type: 'email', inputmode: 'email' },
})
const CYFRY_KROKU = 100

/**
 * Pokazuje albo czysci blad pod polem utworzonym przez `pole()` bez ponownego rysowania widoku.
 * @param {HTMLElement} elementPola
 * @param {string | null} blad
 */
export function ustawBlad(elementPola, blad) {
  const komunikat = elementPola.querySelector('.pole__blad')
  const wejscie = elementPola.querySelector('input')
  if (komunikat instanceof HTMLElement) {
    komunikat.textContent = blad ?? ''
    komunikat.hidden = !blad
  }
  wejscie?.setAttribute('aria-invalid', blad ? 'true' : 'false')
  elementPola.classList.toggle('pole--blad', Boolean(blad))
}

/** @param {OpcjePola} opcje @returns {HTMLDivElement} etykieta, pole i komunikat bledu pod spodem */
export function pole(opcje) {
  const { id, etykieta, wartosc = '', rodzaj = 'tekst', blad = null, podpowiedz, autocomplete = 'off', naZmiane } = opcje
  const idPodpowiedzi = `${id}-podpowiedz`
  const idBledu = `${id}-blad`
  const wejscie = h('input', {
    ...TYPY_POLA[rodzaj], id, name: id, value: wartosc, autocomplete, class: 'pole__wejscie',
    'aria-describedby': podpowiedz ? `${idPodpowiedzi} ${idBledu}` : idBledu,
  })
  wejscie.addEventListener('input', () => naZmiane?.(wejscie.value))
  const element = h('div', { class: 'pole' },
    h('label', { class: 'pole__etykieta', for: id }, etykieta),
    wejscie,
    podpowiedz ? h('p', { class: 'pole__podpowiedz', id: idPodpowiedzi }, podpowiedz) : null,
    h('p', { class: 'pole__blad', id: idBledu, role: 'alert' }))
  ustawBlad(element, blad)
  return element
}

/** @param {number} x */
const zaokraglij = (x) => Math.round(x * CYFRY_KROKU) / CYFRY_KROKU
/** @param {OpcjeLicznika} opcje @returns {HTMLDivElement} karta z etykieta, wartoscia do wpisania i przyciskami − / + */
export function licznik(opcje) {
  const { id, etykieta, min = 0, max = Number.POSITIVE_INFINITY, krok = 1, jednostka, tekstBledu, naZmiane } = opcje
  let wartosc = opcje.wartosc
  if (!(wartosc >= min && wartosc <= max)) throw new RangeError(`Licznik ${id}: wartość ${wartosc} poza zakresem ${min}–${max}`)
  const ogloszenie = h('span', { class: 'wizualnie-ukryte', 'aria-live': 'polite' })
  const blad = h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert', hidden: true })
  const wejscie = h('input', {
    id, name: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'licznik__wejscie',
    value: tekstLiczby(wartosc), 'aria-describedby': blad.id,
  })
  const minus = przyciskLicznika('minus', `Zmniejsz: ${etykieta}`, () => ustaw(wartosc - krok))
  const plus = przyciskLicznika('plus', `Zwiększ: ${etykieta}`, () => ustaw(wartosc + krok))

  function odswiezPrzyciski() {
    minus.setAttribute('aria-disabled', String(wartosc <= min))
    plus.setAttribute('aria-disabled', String(wartosc >= max))
  }

  /** @param {number} nowa */
  function ustaw(nowa) {
    const ograniczona = zaokraglij(Math.min(max, Math.max(min, nowa)))
    if (ograniczona === wartosc) return
    wartosc = ograniczona
    wejscie.value = tekstLiczby(wartosc)
    dopasujSzerokosc()
    ogloszenie.textContent = jednostka ? `${wejscie.value} ${jednostka}` : wejscie.value
    pokazBlad(null)
    odswiezPrzyciski()
    naZmiane(wartosc)
  }

  /** @param {string | null} tekst */
  function pokazBlad(tekst) {
    blad.textContent = tekst ?? ''
    blad.hidden = !tekst
    wejscie.setAttribute('aria-invalid', tekst ? 'true' : 'false')
  }

  // Szerokosc pola wg tresci tam, gdzie CSS nie ma `field-sizing: content`.
  function dopasujSzerokosc() {
    wejscie.size = Math.max(2, wejscie.value.length)
  }

  function handleWpis() {
    dopasujSzerokosc()
    const liczba = parsujLiczbe(wejscie.value)
    if (liczba === null || liczba < min || liczba > max) return pokazBlad(tekstBledu ?? bladZakresu({ min, max }))
    pokazBlad(null)
    wartosc = liczba
    odswiezPrzyciski()
    naZmiane(wartosc)
  }

  wejscie.addEventListener('input', handleWpis)
  dopasujSzerokosc()
  odswiezPrzyciski()
  return h('div', { class: 'licznik' },
    h('div', { class: 'licznik__opis' },
      h('label', { class: 'licznik__etykieta', for: id }, etykieta),
      h('span', { class: 'licznik__wartosc' }, wejscie, jednostka ? h('span', { class: 'licznik__jednostka' }, jednostka) : null)),
    h('div', { class: 'licznik__przyciski' }, minus, plus),
    blad,
    ogloszenie)
}

/** @param {'minus' | 'plus'} rodzaj @param {string} etykieta @param {() => void} naKlik */
function przyciskLicznika(rodzaj, etykieta, naKlik) {
  const przycisk = h('button', {
    type: 'button', class: ['licznik__przycisk', rodzaj === 'plus' && 'licznik__przycisk--plus'], 'aria-label': etykieta,
  }, ikona(rodzaj))
  przycisk.addEventListener('click', () => {
    if (przycisk.getAttribute('aria-disabled') !== 'true') naKlik()
  })
  return przycisk
}

/**
 * Chipy pojedynczego wyboru: natywne pola radio (strzalki zmieniaja wybor) w grupie `role="radiogroup"`.
 * @template {string} T
 * @param {{ id: string, etykieta: string, opcje: readonly { wartosc: T, etykieta: string }[], wybrana: T | null,
 *   naZmiane: (wartosc: T) => void }} opcje
 * @returns {HTMLDivElement}
 */
export function chipy({ id, etykieta, opcje, wybrana, naZmiane }) {
  const idEtykiety = `${id}-etykieta`
  return h('div', { class: 'grupa-chipow' },
    h('p', { class: 'grupa-chipow__etykieta', id: idEtykiety }, etykieta),
    h('div', { class: 'chipy', role: 'radiogroup', 'aria-labelledby': idEtykiety },
      opcje.map((opcja) => h('label', { class: 'chip' },
        h('input', {
          type: 'radio', name: id, value: opcja.wartosc, class: 'chip__wejscie', checked: opcja.wartosc === wybrana,
          on: { change: () => naZmiane(opcja.wartosc) },
        }),
        h('span', { class: 'chip__tekst' }, opcja.etykieta)))))
}

/** @param {OpcjePrzelacznika} opcje @returns {HTMLLabelElement} etykieta z opisem i przelacznik `role="switch"` */
export function przelacznik({ id, etykieta, opis, czyWlaczony, naZmiane }) {
  const wejscie = h('input', {
    type: 'checkbox', role: 'switch', id, name: id, class: 'przelacznik__wejscie', checked: czyWlaczony,
    'aria-describedby': opis ? `${id}-opis` : null,
  })
  wejscie.addEventListener('change', () => naZmiane(wejscie.checked))
  return h('label', { class: 'przelacznik', for: id },
    h('span', { class: 'przelacznik__tekst' },
      h('span', { class: 'przelacznik__etykieta' }, etykieta),
      opis ? h('span', { class: 'przelacznik__opis', id: `${id}-opis` }, opis) : null),
    wejscie)
}

/**
 * Przycisk albo link wygladajacy jak przycisk (gdy podany `adres`): glowny (kolor akcji), drugi (obrys), tekstowy.
 * @param {OpcjePrzycisku} opcje
 * @returns {HTMLButtonElement | HTMLAnchorElement}
 */
export function przycisk({ tekst, rodzaj = 'glowny', ikona: nazwaIkony, adres, naKlik, typ = 'button', czyWylaczony = false, etykieta }) {
  const klasa = ['przycisk', `przycisk--${rodzaj}`]
  const tresc = [nazwaIkony ? ikona(nazwaIkony) : null, h('span', null, tekst)]
  const wspolne = { class: klasa, 'aria-label': etykieta, on: { click: naKlik } }
  if (adres !== undefined) return h('a', { ...wspolne, href: adres }, tresc)
  return h('button', { ...wspolne, type: typ, disabled: czyWylaczony }, tresc)
}
