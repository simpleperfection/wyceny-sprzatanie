import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladWejscia } from '../silnik/bledy.js'
import { podpowiedzCeny } from './podpowiedzi.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */

/** @type {Katalog} */
let katalog

before(async () => {
  katalog = await katalogZDysku()
})

/** @param {string} kod */
const bladWejscia = (kod) => ({ name: BladWejscia.name, kod })

describe('podpowiedzCeny', () => {
  it('mieszkanie standard: 50 m² ok. 250 zł w mazowieckim; po remoncie: cena za m² z 50 m²', () => {
    const standard = podpowiedzCeny(katalog, 'mieszkanie_standard', 'mazowieckie')
    const poRemoncie = podpowiedzCeny(katalog, 'mieszkanie_po_remoncie', 'mazowieckie')

    assert.equal(standard.rodzaj, 'metraz')
    assert.ok(standard.rodzaj === 'metraz' && Math.round(standard.kwota) === 250 && standard.m2 === 50)
    assert.equal(poRemoncie.rodzaj, 'za_m2')
    assert.ok(poRemoncie.rodzaj === 'za_m2')
    assertBlisko(poRemoncie.kwota, 11.75, 0.05)
  })

  it('biura: warianty; usługi z pozycjami: najtańsza pozycja główna × wsp województwa za jednostkę', () => {
    assert.deepEqual(podpowiedzCeny(katalog, 'sprzatanie_biur', 'mazowieckie'), { rodzaj: 'warianty' })
    assert.deepEqual(podpowiedzCeny(katalog, 'okna', 'mazowieckie'), { rodzaj: 'od', kwota: 30, jednostka: 'szt' })
    const posadzki = podpowiedzCeny(katalog, 'mycie_posadzek', 'pomorskie')
    assert.ok(posadzki.rodzaj === 'od')
    assert.equal(posadzki.jednostka, 'm2')
    assertBlisko(posadzki.kwota, 1.8 * 1.13)
  })

  it('nieznana usługa daje BladWejscia', () => {
    assert.throws(() => podpowiedzCeny(katalog, 'pranie_firan', null), bladWejscia('nieznana_usluga'))
  })
})
