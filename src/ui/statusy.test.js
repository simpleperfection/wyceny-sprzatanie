import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { pigulkaWizyty } from './statusy.js'

/** Atrapa elementu (Node nie ma DOM): tyle, ile uzywa `h()` przy pigulce. */
class AtrapaElementu {
  constructor() {
    /** @type {Map<string, string>} */
    this.atrybuty = new Map()
    /** @type {{ tekst: string }[]} */
    this.dzieci = []
  }

  /** @param {string} nazwa @param {string} wartosc */
  setAttribute(nazwa, wartosc) { this.atrybuty.set(nazwa, wartosc) }

  /** @param {{ tekst: string }} dziecko */
  appendChild(dziecko) { this.dzieci.push(dziecko) }
}

const atrapaDokumentu = {
  createElement: () => new AtrapaElementu(),
  /** @param {string} tekst */
  createTextNode: (tekst) => ({ tekst }),
}

/** @param {unknown} element @returns {{ klasa: string | undefined, tekst: string }} */
function opisPigulki(element) {
  assert.ok(element instanceof AtrapaElementu)
  return { klasa: element.atrybuty.get('class'), tekst: element.dzieci.map((d) => d.tekst).join('') }
}

describe('pigulkaWizyty', () => {
  const dokument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  beforeEach(() => Object.defineProperty(globalThis, 'document', { value: atrapaDokumentu, configurable: true }))
  afterEach(() => {
    if (dokument === undefined) Reflect.deleteProperty(globalThis, 'document')
    else Object.defineProperty(globalThis, 'document', dokument)
  })

  it('daje etykiety z planu i klasę koloru każdego stanu', () => {
    const stany = /** @type {const} */ (['zrobiona', 'zaplacona', 'niezaplacona', 'odwolana', 'przesunieta'])

    assert.deepEqual(stany.map((stan) => opisPigulki(pigulkaWizyty(stan))), [
      { klasa: 'pigulka pigulka--zrobiona', tekst: 'Zrobione' },
      { klasa: 'pigulka pigulka--zaplacona', tekst: 'Zapłacone' },
      { klasa: 'pigulka pigulka--niezaplacona', tekst: 'Niezapłacone' },
      { klasa: 'pigulka pigulka--odwolana', tekst: 'Odwołana' },
      { klasa: 'pigulka pigulka--przesunieta', tekst: 'Przesunięta' },
    ])
  })

  it('nieznany stan daje RangeError', () => {
    assert.throws(() => pigulkaWizyty(/** @type {never} */ ('wykonana')), RangeError)
  })
})
