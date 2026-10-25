import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { dzienLokalny, jestData, miesiacLokalny } from './ksztalt.js'

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
