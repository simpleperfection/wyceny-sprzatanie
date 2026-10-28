import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladMagazynu } from '../dane/magazyn.js'
import { BladUstawien } from '../dane/ustawienia.js'
import { TEKSTY_BLEDOW, tekstBleduZapisu } from './teksty-bledow.js'

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
