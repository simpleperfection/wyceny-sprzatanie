import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { opisPozycji } from './kreator-pozycje.js'

/** @typedef {import('../silnik/katalog.js').Pozycja} Pozycja */
/** @typedef {import('../silnik/cena.js').LiniaWyceny} LiniaWyceny */

const NBSP = ' '
const DOPLATA = /** @type {Pozycja} */ (/** @type {unknown} */ ({ typ: 'doplata' }))
const ZWYKLA = /** @type {Pozycja} */ (/** @type {unknown} */ ({}))
const LINIA = /** @type {LiniaWyceny} */ (/** @type {unknown} */ ({ ilosc: 20, cenaJedn: 7.5 }))
const CENA_BEZ_LINII = 9

describe('opisPozycji', () => {
  it('dopłata bez linii: prefiks i cena za m² z argumentu', () => {
    assert.equal(opisPozycji(DOPLATA, undefined, CENA_BEZ_LINII), `dopłata · 9${NBSP}zł/m²`)
  })

  it('dopłata z linią: prefiks, ilość i cena jednostkowa z linii', () => {
    assert.equal(opisPozycji(DOPLATA, LINIA, CENA_BEZ_LINII), `dopłata · 20${NBSP}m² × 7,50${NBSP}zł`)
  })

  it('zwykła pozycja bez linii: sama cena za m²', () => {
    assert.equal(opisPozycji(ZWYKLA, undefined, CENA_BEZ_LINII), `9${NBSP}zł/m²`)
  })

  it('zwykła pozycja z linią: ilość i cena jednostkowa z linii', () => {
    assert.equal(opisPozycji(ZWYKLA, LINIA, CENA_BEZ_LINII), `20${NBSP}m² × 7,50${NBSP}zł`)
  })
})
