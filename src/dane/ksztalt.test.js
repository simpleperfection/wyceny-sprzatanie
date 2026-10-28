import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  dzienLokalny, jestData, jestWarunkamiOferty, jestZakresemOferty, maKlucze, miesiacLokalny, POLA_WARUNKU, POLA_ZAKRESU,
} from './ksztalt.js'

describe('jestData, dzienLokalny i miesiacLokalny', () => {
  it('jestData: poprawny Date → true; niepoprawny Date, tekst daty i liczba → false', () => {
    assert.deepEqual([new Date(2026, 9, 25), new Date('x'), '2026-10-25', 0].map(jestData), [true, false, false, false])
  })

  it('dzień i miesiąc w czasie lokalnym z zerami wiodącymi', () => {
    const data = new Date(2026, 0, 5, 23, 59)

    assert.equal(dzienLokalny(data), '2026-01-05')
    assert.equal(miesiacLokalny(data), '2026-01')
  })
})

describe('maKlucze i strażniki zakresu i warunków oferty (POLA_ZAKRESU, POLA_WARUNKU)', () => {
  it('maKlucze: dokładnie te klucze; brak, nadmiar i nie-obiekt → false', () => {
    assert.deepEqual([{ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2, c: 3 }, ['a', 'b'], null].map((x) => maKlucze(x, ['a', 'b'])),
      [true, false, false, false, false])
  })

  it('zakres i warunek z kluczami spoza POLA_ZAKRESU / POLA_WARUNKU albo bez nich → false', () => {
    const zakres = Object.fromEntries(POLA_ZAKRESU.map((pole) => [pole, ['Podłogi']]))
    const warunek = { id: 'zaliczka', tresc: 'Bez zaliczki.', tylko_szybka: false }

    assert.deepEqual([jestZakresemOferty(zakres), jestZakresemOferty({ ...zakres, uwagi: [] }), jestZakresemOferty({ wchodzi: ['Podłogi'] })],
      [true, false, false])
    assert.deepEqual(Object.keys(warunek), [...POLA_WARUNKU])
    assert.deepEqual([jestWarunkamiOferty([warunek]), jestWarunkamiOferty([{ ...warunek, kolor: 'zielony' }])], [true, false])
  })
})
