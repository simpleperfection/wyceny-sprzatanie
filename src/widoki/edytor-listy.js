// Edytor listy punktow oferty (zakres „W cenie” / „Poza ceną”, warunki): dodaj, zmien, usun, przesun. Edytor trzyma liste
// u siebie i rysuje tylko swoje wiersze, wiec zapis po zmianie nie zabiera fokusu z pola. Kazda zmiana trafia do `naZmiane`
// jako lista bez pustych punktow (pusty wiersz zostaje na ekranie do wpisania); zapis robi widok.

import { GRANICE_OFERTY } from '../dane/ksztalt.js'
import { h, ikona } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'

/** @typedef {import('../ui/ikony.js').NazwaIkony} NazwaIkony */
/**
 * @typedef {{ id: string, tekst: string }} Punkt id stale przy przesuwaniu (warunek: id z danych, nowy punkt: losowe)
 * @typedef {{ id: string, etykieta: string, punkty: readonly Punkt[], naZmiane: (punkty: Punkt[]) => void, wiersze?: number }}
 *   OpcjeEdytora `id` przedrostek id pol, `wiersze` wysokosc pola tekstowego
 */

/** @param {readonly Punkt[]} punkty @param {string} id @returns {Punkt[]} lista z pustym punktem na koncu */
export const dodajPunkt = (punkty, id) => [...punkty, { id, tekst: '' }]

/** @param {readonly Punkt[]} punkty @param {string} id @param {string} tekst @returns {Punkt[]} */
export const zmienPunkt = (punkty, id, tekst) => punkty.map((p) => (p.id === id ? { id, tekst } : p))

/** @param {readonly Punkt[]} punkty @param {string} id @returns {Punkt[]} */
export const usunPunkt = (punkty, id) => punkty.filter((p) => p.id !== id)

/**
 * @param {readonly Punkt[]} punkty @param {string} id @param {-1 | 1} kierunek -1 w gore, 1 w dol
 * @returns {Punkt[]} punkt zamieniony z sasiadem; przy brzegu listy albo nieznanym id — ta sama kolejnosc
 */
export function przesunPunkt(punkty, id, kierunek) {
  const wynik = [...punkty]
  const i = wynik.findIndex((p) => p.id === id)
  const j = i + kierunek
  if (i < 0 || j < 0 || j >= wynik.length) return wynik
  ;[wynik[i], wynik[j]] = [wynik[j], wynik[i]]
  return wynik
}

/** @param {readonly Punkt[]} punkty @returns {Punkt[]} punkty z przycietym tekstem, bez pustych (do zapisu) */
export const punktyDoZapisu = (punkty) => punkty.map((p) => ({ id: p.id, tekst: p.tekst.trim() })).filter((p) => p.tekst !== '')

/** @param {readonly string[]} teksty @param {string} przedrostek @returns {Punkt[]} punkty z id `<przedrostek>-<indeks>` */
export const punktyZTekstow = (teksty, przedrostek) => teksty.map((tekst, i) => ({ id: `${przedrostek}-${i}`, tekst }))

/** @param {string} etykieta @param {NazwaIkony} nazwa @param {() => void} naKlik @param {boolean} czyWylaczony */
const przyciskIkony = (etykieta, nazwa, naKlik, czyWylaczony) => h('button', {
  class: 'edytor-listy__przycisk', type: 'button', 'aria-label': etykieta, disabled: czyWylaczony, on: { click: naKlik },
}, ikona(nazwa))

/**
 * Edytor listy: etykieta, wiersze z polem tekstowym i przyciskami „Przesuń wyżej”, „Przesuń niżej”, „Usuń”, pod spodem
 * „Dodaj punkt” (do GRANICE_OFERTY.lista punktow). Tekst zapisuje sie po wyjsciu z pola (zdarzenie `change`).
 * @param {OpcjeEdytora} opcje
 * @returns {HTMLDivElement}
 */
export function edytorListy({ id, etykieta, punkty, naZmiane, wiersze = 1 }) {
  let lista = [...punkty]
  const idEtykiety = `${id}-etykieta`
  const elementListy = h('ol', { class: 'edytor-listy__lista', 'aria-labelledby': idEtykiety })
  const dodaj = przycisk({ tekst: 'Dodaj punkt', rodzaj: 'tekstowy', ikona: 'plus', naKlik: () => {
    const nowy = crypto.randomUUID()
    zmien(dodajPunkt(lista, nowy), `#${CSS.escape(`${id}-${nowy}`)}`)
  } })
  dodaj.classList.add('edytor-listy__dodaj')

  /** @param {Punkt[]} nowa @param {string} fokus selektor elementu do fokusu po narysowaniu */
  function zmien(nowa, fokus) {
    lista = nowa
    naZmiane(punktyDoZapisu(lista))
    rysuj(fokus)
  }

  /** @param {Punkt} punkt @param {number} i */
  function wierszPunktu(punkt, i) {
    const pole = h('textarea', { id: `${id}-${punkt.id}`, class: 'edytor-listy__pole', rows: wiersze, maxlength: GRANICE_OFERTY.tekst,
      'aria-label': `${etykieta}, punkt ${i + 1}`, value: punkt.tekst })
    pole.addEventListener('change', () => {
      lista = zmienPunkt(lista, punkt.id, pole.value)
      naZmiane(punktyDoZapisu(lista))
    })
    const wiersz = `[data-punkt="${CSS.escape(punkt.id)}"]`
    const sasiad = lista[i + 1] ?? lista[i - 1]
    return h('li', { class: 'edytor-listy__wiersz', 'data-punkt': punkt.id }, pole,
      h('div', { class: 'edytor-listy__przyciski' },
        przyciskIkony('Przesuń wyżej', 'arrow-up', () => zmien(przesunPunkt(lista, punkt.id, -1), `${wiersz} [aria-label="Przesuń wyżej"]`), i === 0),
        przyciskIkony('Przesuń niżej', 'arrow-down', () => zmien(przesunPunkt(lista, punkt.id, 1), `${wiersz} [aria-label="Przesuń niżej"]`),
          i === lista.length - 1),
        przyciskIkony('Usuń', 'trash', () => zmien(usunPunkt(lista, punkt.id),
          sasiad ? `[data-punkt="${CSS.escape(sasiad.id)}"] textarea` : '.edytor-listy__dodaj'), false)))
  }

  /** @param {string} [fokus] przycisk wylaczony po przesunieciu (brzeg listy) oddaje fokus polu swojego wiersza */
  function rysuj(fokus) {
    elementListy.replaceChildren(...lista.map(wierszPunktu))
    if (dodaj instanceof HTMLButtonElement) dodaj.disabled = lista.length >= GRANICE_OFERTY.lista
    const cel = fokus ? edytor.querySelector(fokus) : null
    const zapasowy = cel?.closest('li')?.querySelector('textarea')
    const element = cel instanceof HTMLButtonElement && cel.disabled ? zapasowy : cel
    if (element instanceof HTMLElement) element.focus()
  }

  const edytor = h('div', { class: 'edytor-listy' }, h('p', { class: 'edytor-listy__etykieta', id: idEtykiety }, etykieta), elementListy, dodaj)
  rysuj()
  return edytor
}
