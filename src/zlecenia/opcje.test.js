import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BEZ_POWTARZANIA, czyMaDni, etykietaCeny, jestDataZlecenia, OPCJE_FORM, OPCJE_POWTARZANIA, przelaczDzien, tekstBleduPola } from './opcje.js'

describe('opcje pól zlecenia', () => {
  it('etykieta ceny zależy od rozliczenia; dni mają tylko cykle tygodniowe', () => {
    assert.equal(etykietaCeny('za_wizyte'), 'Cena (zł)')
    assert.equal(etykietaCeny('miesiecznie'), 'Kwota za miesiąc (zł)')
    assert.deepEqual(['tydzien', 'dwa_tygodnie', 'miesiac', BEZ_POWTARZANIA].map(czyMaDni), [true, true, false, false])
  })

  it('chipy „Powtarzaj” zaczynają się od „Nie”, a chipy formy mają wszystkie formy zapłaty', () => {
    assert.deepEqual(OPCJE_POWTARZANIA.map((o) => o.wartosc), [BEZ_POWTARZANIA, 'tydzien', 'dwa_tygodnie', 'miesiac'])
    assert.deepEqual(OPCJE_FORM.map((o) => o.wartosc), ['gotowka', 'przelew', 'blik'])
  })
})

describe('jestDataZlecenia', () => {
  it('poprawny dzień od 2000 roku jest datą zlecenia', () => {
    assert.equal(jestDataZlecenia('2000-01-01'), true)
    assert.equal(jestDataZlecenia('2026-11-03'), true)
  })

  it('pusty tekst, niepełny rok i zły dzień nie są datą zlecenia', () => {
    assert.deepEqual(['', '0026-11-03', '2026-02-30', null].map(jestDataZlecenia), [false, false, false, false])
  })
})

describe('tekstBleduPola', () => {
  it('kod błędu ma tekst pod polem', () => {
    assert.equal(tekstBleduPola('brak_uslugi'), 'Wybierz usługę albo wpisz opis.')
    assert.equal(tekstBleduPola('zla_cena'), 'Wpisz cenę.')
    assert.equal(tekstBleduPola('brak_daty'), 'Wybierz datę.')
    assert.equal(tekstBleduPola('brak_dni'), 'Wybierz dni tygodnia.')
  })

  it('bez kodu nie ma tekstu', () => {
    assert.equal(tekstBleduPola(null), null)
    assert.equal(tekstBleduPola(undefined), null)
  })
})

describe('przelaczDzien', () => {
  it('włącza dzień z zachowaniem kolejności i wyłącza włączony', () => {
    assert.deepEqual(przelaczDzien([1, 4], 2), [1, 2, 4])
    assert.deepEqual(przelaczDzien([1, 4], 4), [1])
  })
})
