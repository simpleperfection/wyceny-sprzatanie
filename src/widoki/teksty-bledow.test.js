import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladKlienta } from '../dane/klienci.js'
import { BladMagazynu } from '../dane/magazyn.js'
import { BladUstawien } from '../dane/ustawienia.js'
import { TEKSTY_BLEDOW, tekstBleduKlienta, tekstBleduZapisu } from './teksty-bledow.js'

describe('tekstBleduZapisu', () => {
  it('pełna pamięć, inny błąd magazynu, telefon, długość i inny kod ustawień', () => {
    assert.equal(tekstBleduZapisu(new BladMagazynu('pelny')), 'Nie udało się zapisać zmian: brak miejsca w pamięci przeglądarki.')
    assert.equal(tekstBleduZapisu(new BladMagazynu('uszkodzony')), 'Nie udało się zapisać zmian. Spróbuj jeszcze raz.')
    assert.equal(tekstBleduZapisu(new BladUstawien('telefon', 'firma.telefon')), TEKSTY_BLEDOW.telefon)
    assert.equal(tekstBleduZapisu(new BladUstawien('dlugosc', 'firma.nazwa')), 'Ten tekst jest za długi.')
    assert.equal(tekstBleduZapisu(new BladUstawien('zakres', 'koszty.chemia_h')), 'Nie udało się zapisać zmian. Spróbuj jeszcze raz.')
  })

  it('błąd spoza magazynu i ustawień leci dalej', () => {
    const blad = new TypeError('x')

    assert.throws(() => tekstBleduZapisu(blad), (wyjatek) => wyjatek === blad)
  })
})

describe('tekstBleduKlienta', () => {
  it('pusta nazwa, telefon i długość trafiają pod swoje pole', () => {
    assert.deepEqual(tekstBleduKlienta(new BladKlienta('pusta_nazwa', 'nazwa')), { tekst: 'Wpisz nazwę klienta.', pole: 'nazwa' })
    assert.deepEqual(tekstBleduKlienta(new BladKlienta('telefon', 'telefon')), { tekst: 'Wpisz 9 cyfr numeru telefonu.', pole: 'telefon' })
    assert.deepEqual(tekstBleduKlienta(new BladKlienta('dlugosc', 'adres')), { tekst: 'Ten tekst jest za długi.', pole: 'adres' })
  })

  it('inny kod klienta i błąd magazynu dają komunikat bez pola', () => {
    assert.deepEqual(tekstBleduKlienta(new BladKlienta('brak_klienta')),
      { tekst: 'Nie udało się zapisać klienta. Spróbuj jeszcze raz.', pole: null })
    assert.deepEqual(tekstBleduKlienta(new BladMagazynu('pelny')),
      { tekst: 'Nie udało się zapisać zmian: brak miejsca w pamięci przeglądarki.', pole: null })
  })

  it('błąd spoza klienta i magazynu leci dalej', () => {
    const blad = new TypeError('x')

    assert.throws(() => tekstBleduKlienta(blad), (wyjatek) => wyjatek === blad)
  })
})
