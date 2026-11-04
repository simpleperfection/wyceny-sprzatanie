import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladMagazynu } from '../dane/magazyn.js'
import { BladZlecenia } from '../dane/zlecenia.js'
import { tekstBleduZapisu } from '../widoki/teksty-bledow.js'
import { tekstBleduFormularza, tekstBleduKarty, tekstBleduWizyty, tekstOdmowy } from './bledy-zapisu.js'

const BLAD_MAGAZYNU = new BladMagazynu('pelny', 'Brak miejsca')

describe('tekstOdmowy', () => {
  it('odmowa zapisu ma własny tekst, a inny błąd zlecenia i obcy błąd to awaria', () => {
    assert.equal(tekstOdmowy(new BladZlecenia('zly_status')), 'Ta wycena nie jest już przyjęta, więc zlecenia nie zapisano.')
    assert.equal(tekstOdmowy(new BladZlecenia('brak_klienta')), 'Tego klienta już nie ma. Wybierz innego.')
    assert.equal(tekstOdmowy(new BladZlecenia('cykl')), null)
    assert.equal(tekstOdmowy(new TypeError('x')), null)
  })

  it('brak wyceny i limit zleceń mają własne teksty', () => {
    assert.equal(tekstOdmowy(new BladZlecenia('brak_wyceny')), 'Tej wyceny już nie ma, więc zlecenia nie zapisano.')
    assert.equal(tekstOdmowy(new BladZlecenia('za_duzo')), 'Masz już najwięcej zleceń, ile można zapisać.')
  })
})

describe('tekstBleduFormularza', () => {
  it('odmowa ma swój tekst, a inny błąd zlecenia tekst nieudanego zapisu', () => {
    assert.equal(tekstBleduFormularza(new BladZlecenia('zly_status')), 'Ta wycena nie jest już przyjęta, więc zlecenia nie zapisano.')
    assert.equal(tekstBleduFormularza(new BladZlecenia('cykl')), 'Nie udało się zapisać zlecenia. Spróbuj jeszcze raz.')
  })

  it('błąd magazynu ma tekst z tekstBleduZapisu', () => {
    assert.equal(tekstBleduFormularza(BLAD_MAGAZYNU), tekstBleduZapisu(BLAD_MAGAZYNU))
    assert.equal(tekstBleduFormularza(BLAD_MAGAZYNU), 'Nie udało się zapisać zmian: brak miejsca w pamięci przeglądarki.')
  })

  it('obcy błąd leci dalej', () => {
    assert.throws(() => tekstBleduFormularza(new TypeError('x')), TypeError)
  })
})

describe('tekstBleduKarty i tekstBleduWizyty', () => {
  it('błąd zlecenia ma tekst swojego ekranu', () => {
    assert.equal(tekstBleduKarty(new BladZlecenia('cykl')), 'Nie udało się zapisać tego zlecenia. Spróbuj jeszcze raz.')
    assert.equal(tekstBleduWizyty(new BladZlecenia('cykl')), 'Nie udało się zapisać tej wizyty. Spróbuj jeszcze raz.')
  })

  it('błąd magazynu ma tekst z tekstBleduZapisu', () => {
    assert.equal(tekstBleduKarty(BLAD_MAGAZYNU), tekstBleduZapisu(BLAD_MAGAZYNU))
    assert.equal(tekstBleduWizyty(BLAD_MAGAZYNU), tekstBleduZapisu(BLAD_MAGAZYNU))
  })

  it('obcy błąd leci dalej', () => {
    assert.throws(() => tekstBleduKarty(new TypeError('x')), TypeError)
    assert.throws(() => tekstBleduWizyty(new TypeError('x')), TypeError)
  })
})
