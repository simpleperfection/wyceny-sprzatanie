import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladWejscia } from './bledy.js'
import { cenaDlaKlienta, zCenyRecznej } from './vat.js'

const STAWKA_VAT = 23

describe('cenaDlaKlienta', () => {
  it('mieszkanie 250 zł, firma zwolniona: brutto = netto = 250, vat 0', () => {
    const cena = cenaDlaKlienta({ kwota: 250, podstawaCeny: 'brutto', statusVat: 'zwolniony', stawkaVatProc: STAWKA_VAT })

    assert.deepEqual(cena, { brutto: 250, netto: 250, vat: 0 })
  })

  it('mieszkanie 250 zł, czynny VAT przy podstawie brutto: brutto 250, netto 203,25, vat 46,75', () => {
    const cena = cenaDlaKlienta({ kwota: 250, podstawaCeny: 'brutto', statusVat: 'czynny', stawkaVatProc: STAWKA_VAT })

    assert.deepEqual(cena, { brutto: 250, netto: 203.25, vat: 46.75 })
  })

  it('mycie posadzek 300 zł modelu, czynny VAT przy podstawie netto: netto 300, brutto 369, vat 69', () => {
    const cena = cenaDlaKlienta({ kwota: 300, podstawaCeny: 'netto', statusVat: 'czynny', stawkaVatProc: STAWKA_VAT })

    assert.deepEqual(cena, { brutto: 369, netto: 300, vat: 69 })
  })

  it('firma zwolniona przy podstawie netto nie dolicza VAT: 300 zł modelu = 300 zł dla klienta', () => {
    const cena = cenaDlaKlienta({ kwota: 300, podstawaCeny: 'netto', statusVat: 'zwolniony', stawkaVatProc: STAWKA_VAT })

    assert.deepEqual(cena, { brutto: 300, netto: 300, vat: 0 })
  })

  it('brutto zaokrągla do pełnych zł, a netto i vat liczy w groszach od zaokrąglonego brutto', () => {
    const cena = cenaDlaKlienta({ kwota: 250.055, podstawaCeny: 'netto', statusVat: 'czynny', stawkaVatProc: STAWKA_VAT })

    // 250,055 × 1,23 = 307,57 → 308; 308 / 1,23 = 250,406… → 250,41; vat 57,59
    assert.deepEqual(cena, { brutto: 308, netto: 250.41, vat: 57.59 })
  })

  it('odrzuca ujemną kwotę, nieznany status VAT, nieznaną podstawę ceny i stawkę spoza [0, 100]', () => {
    const poprawne = { kwota: 250, podstawaCeny: 'brutto', statusVat: 'czynny', stawkaVatProc: STAWKA_VAT }

    assert.throws(() => cenaDlaKlienta({ ...poprawne, kwota: -1 }), { name: BladWejscia.name, kod: 'kwota' })
    assert.throws(() => cenaDlaKlienta({ ...poprawne, kwota: Number.NaN }), { name: BladWejscia.name, kod: 'kwota' })
    assert.throws(() => cenaDlaKlienta({ ...poprawne, statusVat: 'ryczalt' }), { name: BladWejscia.name, kod: 'status_vat' })
    assert.throws(() => cenaDlaKlienta({ ...poprawne, podstawaCeny: 'BRUTTO' }), { name: BladWejscia.name, kod: 'podstawa_ceny' })
    assert.throws(() => cenaDlaKlienta({ ...poprawne, stawkaVatProc: 123 }), { name: BladWejscia.name, kod: 'stawka_vat' })
  })
})

describe('zCenyRecznej', () => {
  it('ręczna cena 290 zł u czynnego podatnika to brutto: netto 235,77, vat 54,23', () => {
    const cena = zCenyRecznej(290, 'czynny', STAWKA_VAT)

    assert.deepEqual(cena, { brutto: 290, netto: 235.77, vat: 54.23 })
  })

  it('ręczna cena 290 zł u firmy zwolnionej: brutto = netto = 290', () => {
    const cena = zCenyRecznej(290, 'zwolniony', STAWKA_VAT)

    assert.deepEqual(cena, { brutto: 290, netto: 290, vat: 0 })
  })

  it('odrzuca ujemną cenę ręczną', () => {
    assert.throws(() => zCenyRecznej(-10, 'czynny', STAWKA_VAT), { name: BladWejscia.name, kod: 'kwota' })
  })
})
