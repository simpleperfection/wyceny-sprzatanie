import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, katalogTestowy } from '../../tests/pomocnicze.js'
import { BladWejscia } from './bledy.js'
import { domyslneLazienki, ukladBiura, ukladMieszkania } from './uklad.js'

/** @typedef {import('./katalog.js').Uklady} Uklady */

/** @param {string} kod */
const bladWejscia = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladWejscia && blad.kod === kod

/** @param {{ typ: string, m2: number }[]} uklad */
const suma = (uklad) => uklad.reduce((s, p) => s + p.m2, 0)

describe('uklad mieszkania', () => {
  /** @type {Uklady} */ let uklady
  before(async () => {
    uklady = (await katalogTestowy()).uklady
  })

  it('50 m²: pokój 32, przedpokój 6, kuchnia 8 i łazienka 4 m² (suma 50)', () => {
    const uklad = ukladMieszkania(50, {}, uklady)

    assert.deepEqual(uklad, [
      { typ: 'pokoj', m2: 32 }, { typ: 'przedpokoj', m2: 6 }, { typ: 'kuchnia', m2: 8 }, { typ: 'lazienka', m2: 4 },
    ])
    assert.equal(suma(uklad), 50)
  })

  it('120 m²: kuchnia do 14 m², dwie łazienki 8 i 5 m², reszta pokoje', () => {
    const uklad = ukladMieszkania(120, {}, uklady)

    assert.deepEqual(uklad.filter((p) => p.typ === 'lazienka').map((p) => p.m2), [8, 5])
    assert.equal(uklad.find((p) => p.typ === 'kuchnia')?.m2, 14)
    assertBlisko(uklad[0].m2, 120 - 14 - 14.4 - 13)
    assertBlisko(suma(uklad), 120)
  })

  it('50 m² z dwiema łazienkami: dwie łazienki po 4 m², pokój 28 m²', () => {
    const uklad = ukladMieszkania(50, { lazienki: 2 }, uklady)

    assert.deepEqual(uklad.filter((p) => p.typ === 'lazienka').map((p) => p.m2), [4, 4])
    assert.equal(uklad[0].m2, 28)
  })

  it('120 m² z jedną łazienką skraca listę domyślną do 8 m²', () => {
    const uklad = ukladMieszkania(120, { lazienki: 1 }, uklady)

    assert.deepEqual(uklad.filter((p) => p.typ === 'lazienka').map((p) => p.m2), [8])
  })

  it('50 m² z aneksem: kuchnia 5 m² i pokój 35 m²', () => {
    const uklad = ukladMieszkania(50, { kuchnia: 'aneks' }, uklady)

    assert.deepEqual(uklad.slice(0, 3), [{ typ: 'pokoj', m2: 35 }, { typ: 'przedpokoj', m2: 6 }, { typ: 'kuchnia', m2: 5 }])
  })

  it('12 m² z trzema łazienkami rzuca BladWejscia z kodem metraz', () => {
    assert.throws(() => ukladMieszkania(12, { lazienki: 3 }, uklady), bladWejscia('metraz'))
  })

  it('odrzuca metraż 0 i ułamkową albo ujemną liczbę łazienek', () => {
    assert.throws(() => ukladMieszkania(0, {}, uklady), bladWejscia('metraz'))
    assert.throws(() => ukladMieszkania(50, { lazienki: 1.5 }, uklady), bladWejscia('lazienki'))
    assert.throws(() => ukladMieszkania(50, { lazienki: -1 }, uklady), bladWejscia('lazienki'))
  })

  it('domyslneLazienki: 1 do 100 m², 2 od 100 m²', () => {
    assert.deepEqual([domyslneLazienki(50, uklady), domyslneLazienki(99, uklady), domyslneLazienki(100, uklady)], [1, 1, 2])
    assert.throws(() => domyslneLazienki(Number.NaN, uklady), bladWejscia('metraz'))
  })
})

describe('uklad biura', () => {
  /** @type {Uklady} */ let uklady
  before(async () => {
    uklady = (await katalogTestowy()).uklady
  })

  it('200 m²: wzorzec 100 m² razy 2', () => {
    const uklad = ukladBiura(200, uklady)

    assert.deepEqual(uklad, [
      { typ: 'biuro', m2: 120 }, { typ: 'sala', m2: 30 }, { typ: 'kuchnia_socjalna', m2: 12 }, { typ: 'toaleta', m2: 10 }, { typ: 'korytarz', m2: 28 },
    ])
  })

  it('odrzuca ujemny metraż', () => {
    assert.throws(() => ukladBiura(-100, uklady), bladWejscia('metraz'))
  })
})
