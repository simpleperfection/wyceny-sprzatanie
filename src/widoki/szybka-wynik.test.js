import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladFormatu } from '../ui/format.js'
import { tekstKwoty, tekstMediany, tekstRynku, tekstZostaje } from './szybka-wynik.js'

const NBSP = ' '

describe('teksty karty wyniku szybkiej wyceny', () => {
  it('kwota: widełki „250–300 zł”, lekki stan „ok. 250 zł”, oględziny „Orientacyjnie od 960 zł”', () => {
    assert.equal(tekstKwoty({ tryb: 'widelki', od: 250, do: 300 }), `250–300${NBSP}zł`)
    assert.equal(tekstKwoty({ tryb: 'widelki', od: 1200, do: 1500 }), `1${NBSP}200–1${NBSP}500${NBSP}zł`)
    assert.equal(tekstKwoty({ tryb: 'ok', od: 250, do: 250 }), `ok. 250${NBSP}zł`)
    assert.equal(tekstKwoty({ tryb: 'od', od: 960, do: 960 }), `Orientacyjnie od 960${NBSP}zł`)
  })

  it('mediana w województwie w miejscowniku, a średnia krajowa jako „Mediana krajowa”', () => {
    assert.equal(tekstMediany(250, { id: 'mazowieckie', nazwa: 'mazowieckie' }), `Mediana w mazowieckim: 250${NBSP}zł`)
    assert.equal(tekstMediany(240, { id: null, nazwa: 'średnia krajowa' }), `Mediana krajowa: 240${NBSP}zł`)
    assert.throws(() => tekstMediany(250, { id: 'x', nazwa: 'Warszawa' }), BladFormatu)
  })

  it('rynek „Rynek: 120–450 zł”; zostaje na godzinę zaokrąglone do złotówek, jedna kwota przy równych końcach', () => {
    assert.equal(tekstRynku({ od: 120, do: 450 }), `Rynek: 120–450${NBSP}zł`)
    assert.equal(tekstZostaje({ od: 44.6, do: 52.2 }), 'Zostaje ok. 45–52 zł/h')
    assert.equal(tekstZostaje({ od: 38.4, do: 38.2 }), 'Zostaje ok. 38 zł/h')
  })
})
