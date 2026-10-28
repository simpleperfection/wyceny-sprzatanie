import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { godzinyMinuty, tekstOsobnegoTempa, zdanieRoznicy } from './zakonczenie.js'

describe('godzinyMinuty', () => {
  it('5 h 45 min, pełne godziny z 0 min i same minuty z 0 h', () => {
    assert.equal(godzinyMinuty(345), '5 h 45 min')
    assert.equal(godzinyMinuty(300), '5 h 0 min')
    assert.equal(godzinyMinuty(45), '0 h 45 min')
  })
})

describe('zdanieRoznicy', () => {
  it('dłużej niż plan: czas i procent ze znakiem +', () => {
    assert.equal(zdanieRoznicy({ roznica: 90, procent: 0.25 }), 'Praca trwała 1 h 30 min dłużej niż plan (+25%).')
  })

  it('krócej niż plan: czas bez minusa i procent ze znakiem −', () => {
    assert.equal(zdanieRoznicy({ roznica: -30, procent: -0.1 }), 'Praca trwała 30 min krócej niż plan (−10%).')
  })

  it('tyle, ile plan, przy zerowej różnicy', () => {
    assert.equal(zdanieRoznicy({ roznica: 0, procent: 0 }), 'Praca trwała tyle, ile plan.')
  })
})

describe('tekstOsobnegoTempa', () => {
  it('liczba zleceń z InfoTempa.wymagane z odmianą; bez osobnego tempa — null', () => {
    const info = { liczba: 3, wymagane: 3, tempo: null }

    assert.equal(tekstOsobnegoTempa('Mycie okien', { osobne: 1.2, info }),
      'Masz 3 zlecenia: Mycie okien – od teraz liczymy dla nich osobne tempo: 1,20×.')
    assert.equal(tekstOsobnegoTempa('Mycie okien', { osobne: 0.9, info: { ...info, wymagane: 5 } }),
      'Masz 5 zleceń: Mycie okien – od teraz liczymy dla nich osobne tempo: 0,90×.')
    assert.equal(tekstOsobnegoTempa('Mycie okien', { osobne: null, info }), null)
  })
})
