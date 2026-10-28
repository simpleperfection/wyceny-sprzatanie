// Budowanie DOM bez wstawiania HTML z tekstu: teksty zawsze jako wezly tekstowe, zdarzenia przez `on`, ikony SVG przez createElementNS.

import { IKONY } from './ikony.js'

/** @typedef {import('./ikony.js').NazwaIkony} NazwaIkony */
/** @typedef {string | number | Node | null | undefined | false} Dziecko */
/** @typedef {Dziecko | Dziecko[]} Dzieci */
/**
 * `class` (tekst albo lista, falsy pomijane), `on` (nazwa zdarzenia → obsluga), wlasciwosci pol (`value`, `checked`,
 * `disabled`, `hidden`, `tabIndex`), reszta jako atrybuty (`aria-*`, `data-*`, `role`, `href`...): `true` → pusty
 * atrybut, `false`/`null`/`undefined` → pominiety.
 * @typedef {{ on?: Record<string, EventListener | undefined>, class?: string | (string | false | null | undefined)[] }
 *   & Record<string, unknown>} Atrybuty
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const WLASCIWOSCI = new Set(['value', 'checked', 'disabled', 'hidden', 'tabIndex', 'indeterminate'])
// Wlasciwosci wstawiajace HTML (inner/outer...HTML), `srcdoc` i obsluga zdarzen jako tekst (onclick="...").
const ZAKAZANE = /^(on.|srcdoc$)|html$/i

/** Atrybutu nie da sie bezpiecznie ustawic (wstawiajacego HTML albo `onclick` jako tekst). */
export class BladAtrybutu extends Error {
  /** @param {string} nazwa */
  constructor(nazwa) {
    super(`Niedozwolony atrybut: ${nazwa}`)
    this.name = 'BladAtrybutu'
    this.kod = 'niedozwolony_atrybut'
  }
}

/** @param {Element} element @param {string} nazwa @param {unknown} wartosc */
function ustawAtrybut(element, nazwa, wartosc) {
  if (ZAKAZANE.test(nazwa)) throw new BladAtrybutu(nazwa)
  if (wartosc === false || wartosc === null || wartosc === undefined) return
  if (nazwa === 'class') {
    element.setAttribute('class', Array.isArray(wartosc) ? wartosc.filter(Boolean).join(' ') : String(wartosc))
  } else if (WLASCIWOSCI.has(nazwa)) {
    Reflect.set(element, nazwa, wartosc)
  } else {
    element.setAttribute(nazwa, wartosc === true ? '' : String(wartosc))
  }
}

/** @param {Node} rodzic @param {Dzieci[]} dzieci */
function dodajDzieci(rodzic, dzieci) {
  for (const dziecko of dzieci.flat()) {
    if (dziecko === null || dziecko === undefined || dziecko === false) continue
    rodzic.appendChild(typeof dziecko === 'object' ? dziecko : document.createTextNode(String(dziecko)))
  }
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Atrybuty | null} [atrybuty]
 * @param {...Dzieci} dzieci
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, atrybuty, ...dzieci) {
  const element = document.createElement(tag)
  const { on: zdarzenia = {}, ...reszta } = atrybuty ?? {}
  for (const [nazwa, wartosc] of Object.entries(reszta)) ustawAtrybut(element, nazwa, wartosc)
  for (const [zdarzenie, obsluga] of Object.entries(zdarzenia)) if (obsluga) element.addEventListener(zdarzenie, obsluga)
  dodajDzieci(element, dzieci)
  return element
}

/**
 * Ikona Tabler jako SVG dziedziczacy kolor tekstu (`currentColor`); ozdobna, wiec ukryta przed czytnikiem ekranu.
 * @param {NazwaIkony} nazwa
 * @param {string} [klasa] dodatkowa klasa, np. rozmiar
 * @returns {SVGSVGElement}
 */
export function ikona(nazwa, klasa) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  const atrybuty = {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round',
    'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: klasa ? `ikona ${klasa}` : 'ikona',
  }
  for (const [atrybut, wartosc] of Object.entries(atrybuty)) svg.setAttribute(atrybut, wartosc)
  for (const d of IKONY[nazwa]) {
    const sciezka = document.createElementNS(SVG_NS, 'path')
    sciezka.setAttribute('d', d)
    svg.appendChild(sciezka)
  }
  return svg
}
