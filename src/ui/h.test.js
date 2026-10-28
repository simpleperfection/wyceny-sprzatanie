import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { BladAtrybutu, h } from './h.js'

/** Atrapa API przegladarki (Node nie ma DOM): element z atrybutami, dziecmi i zdarzeniami. */
class AtrapaElementu {
  /** @param {string} tag */
  constructor(tag) {
    this.tag = tag
    /** @type {Map<string, string>} */
    this.atrybuty = new Map()
    /** @type {unknown[]} */
    this.dzieci = []
    /** @type {string[]} */
    this.zdarzenia = []
  }

  /** @param {string} nazwa @param {string} wartosc */
  setAttribute(nazwa, wartosc) { this.atrybuty.set(nazwa, wartosc) }

  /** @param {unknown} dziecko */
  appendChild(dziecko) { this.dzieci.push(dziecko) }

  /** @param {string} zdarzenie */
  addEventListener(zdarzenie) { this.zdarzenia.push(zdarzenie) }
}

const atrapaDokumentu = {
  /** @param {string} tag */
  createElement: (tag) => new AtrapaElementu(tag),
  /** @param {string} tekst */
  createTextNode: (tekst) => ({ tekst }),
}

/** @param {string} nazwa */
const bladAtrybutu = (nazwa) => (/** @type {unknown} */ blad) =>
  blad instanceof BladAtrybutu && blad.kod === 'niedozwolony_atrybut' && blad.message === `Niedozwolony atrybut: ${nazwa}`

describe('h: bramka atrybutów wstawiających HTML i skrypt', () => {
  /** @type {unknown} */
  let poprzedni
  beforeEach(() => {
    poprzedni = Reflect.get(globalThis, 'document')
    Reflect.set(globalThis, 'document', atrapaDokumentu)
  })
  afterEach(() => { Reflect.set(globalThis, 'document', poprzedni) })

  for (const nazwa of ['onclick', 'ONCLICK', 'onfocus', 'innerHTML', 'outerHTML', 'srcdoc', 'SRCDOC', 'SrcDoc']) {
    it(`${nazwa} rzuca BladAtrybutu`, () => {
      assert.throws(() => h('div', { [nazwa]: 'alert(1)' }), bladAtrybutu(nazwa))
    })
  }

  it('zakazany atrybut rzuca także z wartością null (nazwa sprawdzana przed wartością)', () => {
    assert.throws(() => h('a', { onclick: null }), bladAtrybutu('onclick'))
  })

  it('aria-label, data-x, href i class przechodzą jako atrybuty', () => {
    const element = /** @type {AtrapaElementu} */ (/** @type {unknown} */ (
      h('a', { 'aria-label': 'Zamknij', 'data-x': '1', href: '#/start', class: ['przycisk', false, 'przycisk--glowny'] })))

    assert.deepEqual(Object.fromEntries(element.atrybuty), {
      'aria-label': 'Zamknij', 'data-x': '1', href: '#/start', class: 'przycisk przycisk--glowny',
    })
  })

  it('zdarzenie przez `on` jest dozwolone, a tekst dziecka idzie jako węzeł tekstowy', () => {
    const element = /** @type {AtrapaElementu} */ (/** @type {unknown} */ (
      h('button', { on: { click: () => {} } }, '<b>Zapisz</b>')))

    assert.deepEqual(element.zdarzenia, ['click'])
    assert.deepEqual(element.dzieci, [{ tekst: '<b>Zapisz</b>' }])
  })
})
