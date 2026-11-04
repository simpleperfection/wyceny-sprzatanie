// Atrapa DOM do testow widokow (Node nie ma DOM): `h()` buduje na niej drzewo, a testy czytaja tekst, atrybuty i zdarzenia.

import { afterEach, beforeEach } from 'node:test'

/** Element: tag, atrybuty, dzieci i zdarzenia; wezly tekstowe to `{ tekst }`. `querySelector` zawsze zwraca null. */
export class AtrapaElementu {
  /** @param {string} tag */
  constructor(tag) {
    this.tag = tag
    /** @type {Map<string, string>} */
    this.atrybuty = new Map()
    /** @type {unknown[]} */
    this.dzieci = []
    /** @type {Map<string, () => void>} */
    this.obslugi = new Map()
    /** @type {Record<string, string>} */
    this.dataset = {}
    this.open = false
    this.disabled = false
    /** @type {Map<string, string>} */
    this.wlasciwosci = new Map()
    this.style = { setProperty: (/** @type {string} */ nazwa, /** @type {string} */ wartosc) => this.wlasciwosci.set(nazwa, wartosc) }
    this.classList = { toggle: () => {} }
  }

  /** @param {string} nazwa @param {string} wartosc */
  setAttribute(nazwa, wartosc) { this.atrybuty.set(nazwa, wartosc) }

  /** @param {unknown} dziecko */
  appendChild(dziecko) { this.dzieci.push(dziecko) }

  /** @param {...unknown} dzieci */
  replaceChildren(...dzieci) { this.dzieci = dzieci }

  /** @param {string} zdarzenie @param {() => void} obsluga */
  addEventListener(zdarzenie, obsluga) { this.obslugi.set(zdarzenie, obsluga) }

  querySelector() { return null }
}

const atrapaDokumentu = {
  /** @param {string} tag */
  createElement: (tag) => new AtrapaElementu(tag),
  /** @param {string} _ns @param {string} tag */
  createElementNS: (_ns, tag) => new AtrapaElementu(tag),
  /** @param {string} tresc */
  createTextNode: (tresc) => ({ tekst: tresc }),
}

/** Podmienia `document` i `HTMLElement` na atrapy na czas kazdego testu biezacego bloku describe. */
export function uzyjAtrapyDom() {
  /** @type {[string, PropertyDescriptor | undefined][]} */
  let poprzednie = []
  const atrapy = { document: atrapaDokumentu, HTMLElement: AtrapaElementu }

  beforeEach(() => {
    poprzednie = Object.keys(atrapy).map((nazwa) => [nazwa, Object.getOwnPropertyDescriptor(globalThis, nazwa)])
    for (const [nazwa, value] of Object.entries(atrapy)) Object.defineProperty(globalThis, nazwa, { value, configurable: true, writable: true })
  })

  afterEach(() => {
    for (const [nazwa, opis] of poprzednie) {
      if (opis) Object.defineProperty(globalThis, nazwa, opis)
      else Reflect.deleteProperty(globalThis, nazwa)
    }
  })
}

/** @param {unknown} wezel @returns {string} tekst wezla i jego dzieci */
export function tekst(wezel) {
  if (wezel instanceof AtrapaElementu) return wezel.dzieci.map(tekst).join('')
  if (typeof wezel === 'object' && wezel !== null && 'tekst' in wezel) return String(wezel.tekst)
  return ''
}

/** @param {unknown} wezel @param {(element: AtrapaElementu) => boolean} warunek @returns {AtrapaElementu[]} */
export function znajdz(wezel, warunek) {
  if (!(wezel instanceof AtrapaElementu)) return []
  return [...(warunek(wezel) ? [wezel] : []), ...wezel.dzieci.flatMap((dziecko) => znajdz(dziecko, warunek))]
}

/** @param {unknown} wezel @param {string} tag @returns {AtrapaElementu | undefined} pierwszy element o tym tagu */
export const pierwszy = (wezel, tag) => znajdz(wezel, (e) => e.tag === tag)[0]

/** @param {unknown} wezel @param {unknown} pominiety @returns {string} tekst wezla bez poddrzewa `pominiety` */
export function tekstPoza(wezel, pominiety) {
  if (wezel === pominiety) return ''
  if (wezel instanceof AtrapaElementu) return wezel.dzieci.map((dziecko) => tekstPoza(dziecko, pominiety)).join('')
  return tekst(wezel)
}
