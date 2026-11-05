import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { odswiezajPoZmianieDnia } from './zmiana-dnia.js'

const PRZED_POLNOCA = new Date(2026, 10, 2, 23, 59)
const PO_POLNOCY = new Date(2026, 10, 3, 0, 1)
const TEN_SAM_DZIEN = new Date(2026, 10, 2, 23, 59, 30)

/** Zegar, karta (document/window jako EventTarget) i router z licznikiem odswiezen; start o `poczatek`. @param {Date} poczatek */
function przygotuj(poczatek) {
  let chwila = poczatek
  const dokument = Object.assign(new EventTarget(), { visibilityState: /** @type {DocumentVisibilityState} */ ('visible') })
  const okno = new EventTarget()
  const router = { odswiezen: 0, odswiez() { this.odswiezen += 1 } }
  odswiezajPoZmianieDnia({ router, teraz: () => chwila, dokument, okno })
  return {
    router,
    dokument,
    /** @param {Date} nowa */
    ustawZegar(nowa) { chwila = nowa },
    /** @param {'focus' | 'hashchange'} typ */
    okno: (typ) => okno.dispatchEvent(new Event(typ)),
    widocznosc: () => dokument.dispatchEvent(new Event('visibilitychange')),
  }
}

describe('odswiezajPoZmianieDnia', () => {
  it('nowy dzień: 23:59 → 00:01 i focus dają jedno odświeżenie, kolejny focus tego dnia już nie', () => {
    const karta = przygotuj(PRZED_POLNOCA)
    karta.ustawZegar(PO_POLNOCY)
    karta.okno('focus')
    karta.okno('focus')
    assert.equal(karta.router.odswiezen, 1)
  })

  it('nowy dzień: powrót do widocznej karty (visibilitychange) odświeża widok', () => {
    const karta = przygotuj(PRZED_POLNOCA)
    karta.ustawZegar(PO_POLNOCY)
    karta.widocznosc()
    assert.equal(karta.router.odswiezen, 1)
  })

  it('ten sam dzień: focus i visibilitychange nie odświeżają', () => {
    const karta = przygotuj(PRZED_POLNOCA)
    karta.ustawZegar(TEN_SAM_DZIEN)
    karta.okno('focus')
    karta.widocznosc()
    assert.equal(karta.router.odswiezen, 0)
  })

  it('ukryta karta przy nowym dniu nie odświeża; po powrocie do widocznej odświeża raz', () => {
    const karta = przygotuj(PRZED_POLNOCA)
    karta.ustawZegar(PO_POLNOCY)
    karta.dokument.visibilityState = 'hidden'
    karta.widocznosc()
    karta.okno('focus')
    assert.equal(karta.router.odswiezen, 0)
    karta.dokument.visibilityState = 'visible'
    karta.widocznosc()
    assert.equal(karta.router.odswiezen, 1)
  })

  it('hashchange o 00:01 renderuje nowy dzień, więc następny focus nie odświeża', () => {
    const karta = przygotuj(PRZED_POLNOCA)
    karta.ustawZegar(PO_POLNOCY)
    karta.okno('hashchange')
    karta.okno('focus')
    assert.equal(karta.router.odswiezen, 0)
  })
})
