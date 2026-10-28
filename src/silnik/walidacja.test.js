import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { katalogTestowy } from '../../tests/pomocnicze.js'
import { BladWejscia } from './bledy.js'
import { wycenUsluge } from './cena.js'
import { minutyPomieszczen, skalaBiura } from './czas.js'
import { ukladBiura, ukladMieszkania } from './uklad.js'
import { sprawdzIlosc, sprawdzMetraz } from './walidacja.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */

/** @param {string} kod */
const bladWejscia = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladWejscia && blad.kod === kod

describe('walidacja: metraż i ilość', () => {
  it('sprawdzMetraz przyjmuje 0,5 m² i dokładnie 100 000 m²', () => {
    assert.equal(sprawdzMetraz(0.5), undefined)
    assert.equal(sprawdzMetraz(100_000), undefined)
  })

  it('sprawdzMetraz odrzuca 0, ujemny, NaN i 100 001 m² kodem metraz', () => {
    for (const m2 of [0, -5, Number.NaN, 100_001]) {
      assert.throws(() => sprawdzMetraz(m2), bladWejscia('metraz'))
    }
  })

  it('sprawdzIlosc przyjmuje 0 i 12,5', () => {
    assert.equal(sprawdzIlosc(0), undefined)
    assert.equal(sprawdzIlosc(12.5), undefined)
  })

  it('sprawdzIlosc odrzuca ujemną, NaN i nieskończoną ilość kodem ilosc', () => {
    for (const ilosc of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => sprawdzIlosc(ilosc), bladWejscia('ilosc'))
    }
  })
})

describe('walidacja: ten sam próg metrażu w układzie, czasie i cenie (mały katalog)', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  it('150 000 m² odrzucają ukladMieszkania, ukladBiura, skalaBiura, minutyPomieszczen i wycenUsluge', () => {
    const m2 = 150_000

    assert.throws(() => ukladMieszkania(m2, {}, katalog.uklady), bladWejscia('metraz'))
    assert.throws(() => ukladBiura(m2, katalog.uklady), bladWejscia('metraz'))
    assert.throws(() => skalaBiura(m2, katalog), bladWejscia('metraz'))
    assert.throws(() => minutyPomieszczen([{ typ: 'pokoj', m2 }], 1, katalog), bladWejscia('metraz'))
    assert.throws(() => wycenUsluge({ uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2 }] }, katalog), bladWejscia('metraz'))
  })
})
