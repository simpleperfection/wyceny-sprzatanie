import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import { pierwszy, tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { opcjaUslugi } from './kreator-usluga.js'

/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */

const PODPOWIEDZ = 'Mieszkanie 50 m²: około 250 zł'
const BIURO = /** @type {Usluga} */ (/** @type {unknown} */ ({ id: 'biuro', nazwa: 'Sprzątanie biur', warianty: [
  { id: 'jednorazowe', nazwa: 'Jednorazowo' }, { id: 'abonament_1', nazwa: 'Abonament 1× w tygodniu' },
] }))
const MIESZKANIE = /** @type {Usluga} */ (/** @type {unknown} */ ({ id: 'mieszkanie', nazwa: 'Mieszkanie' }))

/** @param {string | null} uslugaId @param {Partial<import('./kreator-usluga.js').OpcjeUslugi>} [zmiany] */
const opcje = (uslugaId, zmiany = {}) => ({
  wybor: { uslugaId, wariantId: 'abonament_1', wojewodztwoId: null },
  opisCeny: () => PODPOWIEDZ, naWybor: () => {}, naWariant: () => {}, ...zmiany,
})

/** @param {unknown} element @returns {import('../../tests/atrapa-dom.js').AtrapaElementu[]} */
const szczegoly = (element) => znajdz(element, (e) => e.atrybuty.get('class') === 'opcja-uslugi__szczegoly')

describe('opcjaUslugi', () => {
  uzyjAtrapyDom()

  it('niewybrana usługa to jeden element bez podpowiedzi i wariantów, a cena nie jest liczona', () => {
    const opisCeny = mock.fn(() => PODPOWIEDZ)

    const elementy = opcjaUslugi(BIURO, opcje('mieszkanie', { opisCeny }))

    assert.equal(elementy.length, 1)
    assert.deepEqual(szczegoly(elementy[0]), [])
    assert.equal(tekst(elementy[0]), 'Sprzątanie biur')
    assert.equal(opisCeny.mock.callCount(), 0)
  })

  it('wybrana z wariantami ma podpowiedź i radiogrupę „kreator-wariant” z zaznaczonym wariantem', () => {
    const [, dol] = opcjaUslugi(BIURO, opcje('biuro'))

    assert.equal(tekst(pierwszy(dol, 'p')), PODPOWIEDZ)
    const grupa = znajdz(dol, (e) => e.atrybuty.get('role') === 'radiogroup')
    assert.equal(grupa.length, 1)
    const wejscia = znajdz(dol, (e) => e.atrybuty.get('name') === 'kreator-wariant')
    assert.deepEqual(wejscia.map((e) => e.value), ['jednorazowe', 'abonament_1'])
    assert.deepEqual(wejscia.map((e) => e.checked === true), [false, true])
  })

  it('wybór wariantu i usługi idzie do obsługi ekranu', () => {
    const naWariant = mock.fn()
    const naWybor = mock.fn()

    const [gora, dol] = opcjaUslugi(BIURO, opcje('biuro', { naWariant, naWybor }))
    znajdz(dol, (e) => e.tag === 'input' && e.value === 'jednorazowe')[0]?.obslugi.get('change')?.()
    pierwszy(gora, 'input')?.obslugi.get('change')?.()

    assert.deepEqual(naWariant.mock.calls.map((c) => c.arguments), [['jednorazowe']])
    assert.deepEqual(naWybor.mock.calls.map((c) => c.arguments), [[BIURO]])
  })

  it('wybrana bez wariantów ma samą podpowiedź', () => {
    const [, dol] = opcjaUslugi(MIESZKANIE, opcje('mieszkanie'))

    assert.equal(tekst(dol), PODPOWIEDZ)
    assert.deepEqual(znajdz(dol, (e) => e.atrybuty.get('role') === 'radiogroup'), [])
  })

  it('wybrana bez podpowiedzi i bez wariantów nie ma pustego miejsca na szczegóły', () => {
    const elementy = opcjaUslugi(MIESZKANIE, opcje('mieszkanie', { opisCeny: () => null }))

    assert.equal(elementy.length, 1)
  })

  it('wybrana z wariantami, ale bez podpowiedzi, ma same warianty', () => {
    const [, dol] = opcjaUslugi(BIURO, opcje('biuro', { opisCeny: () => null }))

    assert.equal(znajdz(dol, (e) => e.atrybuty.get('class') === 'opcja-uslugi__opis liczba').length, 0)
    assert.equal(znajdz(dol, (e) => e.atrybuty.get('role') === 'radiogroup').length, 1)
  })
})
