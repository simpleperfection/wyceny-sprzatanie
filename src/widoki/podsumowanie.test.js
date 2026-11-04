import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ukladAkcji } from './podsumowanie.js'

describe('ukladAkcji', () => {
  it('wycena do wysłania: główna jest oferta, decyzje klienta i edycja to wiersze, usunięcie osobno', () => {
    assert.deepEqual(ukladAkcji(['oferta', 'przyjeta', 'odrzucona', 'edytuj', 'usun'], 'do_wyslania'),
      { glowna: 'oferta', wiersze: ['przyjeta', 'odrzucona', 'edytuj'], czyUsun: true })
  })

  it('wycena wysłana: główna jest decyzja klienta, oferta schodzi do wierszy', () => {
    assert.deepEqual(ukladAkcji(['oferta', 'przyjeta', 'odrzucona', 'edytuj', 'usun'], 'wyslana'),
      { glowna: 'przyjeta', wiersze: ['oferta', 'odrzucona', 'edytuj'], czyUsun: true })
  })

  it('przyjęta do zaplanowania: główne jest „Zaplanuj”', () => {
    assert.deepEqual(ukladAkcji(['oferta', 'zaplanuj', 'odrzucona', 'edytuj', 'usun'], 'przyjeta'),
      { glowna: 'zaplanuj', wiersze: ['oferta', 'odrzucona', 'edytuj'], czyUsun: true })
  })

  it('wycena ze zleceniem bez czekającej akcji nie ma głównej, „Zaplanuj kolejne” jest wierszem', () => {
    assert.deepEqual(ukladAkcji(['oferta', 'zaplanuj_kolejne', 'odrzucona', 'usun'], 'przyjeta'),
      { glowna: null, wiersze: ['oferta', 'zaplanuj_kolejne', 'odrzucona'], czyUsun: true })
  })

  it('odrzucona ze zleceniem zostawia samo usunięcie', () => {
    assert.deepEqual(ukladAkcji(['usun'], 'odrzucona'), { glowna: null, wiersze: [], czyUsun: true })
  })
})
