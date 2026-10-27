import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { STATUSY_WYCENY } from '../dane/wyceny.js'
import { MAKS_DLUGOSC_LINKU } from '../oferta/kodek.js'
import { czyDaneFirmy, czyStatusOferty, tekstDlugiegoLinku } from './oferta-edycja.js'

describe('czyStatusOferty', () => {
  it('ofertę przygotowuje się z wyceny do wysłania, wysłanej i przyjętej, z pozostałych nie', () => {
    assert.deepEqual(STATUSY_WYCENY.filter(czyStatusOferty), ['do_wyslania', 'wyslana', 'przyjeta'])
  })
})

describe('tekstDlugiegoLinku', () => {
  it('liczba znaków linku w ostrzeżeniu', () => {
    assert.equal(tekstDlugiegoLinku(MAKS_DLUGOSC_LINKU + 345),
      'Link ma 2345 znaków — w SMS-ie może się nie zmieścić. Wyślij go komunikatorem albo wydrukuj PDF.')
  })
})

describe('czyDaneFirmy', () => {
  const firma = { nazwa: 'Usługi Sprzątające Monika Lis', telefon: '600 123 456', email: '', nip: '' }

  it('nazwa i telefon wystarczą, e-mail i NIP są opcjonalne', () => {
    assert.equal(czyDaneFirmy({ firma }), true)
  })

  it('bez nazwy albo telefonu (także same spacje) oferty nie da się wysłać', () => {
    assert.equal(czyDaneFirmy({ firma: { ...firma, nazwa: '' } }), false)
    assert.equal(czyDaneFirmy({ firma: { ...firma, telefon: '  ' } }), false)
  })
})
