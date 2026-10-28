import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { BladMagazynu, KLUCZ_MAGAZYNU, utworzMagazyn } from '../dane/magazyn.js'
import { czyPokazacInstrukcjeIos, zamknijInstrukcjeIos, zarejestrujServiceWorker } from './rejestracja.js'

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
}

function nowyMagazyn() {
  const storage = new PamiecMagazynu()
  const magazyn = utworzMagazyn(storage, { teraz: () => new Date('2026-10-25T08:00:00.000Z'), loguj: () => {}, poprosOTrwalosc: () => true })
  return { magazyn, storage }
}

/** @param {{ register?: (adres: string) => Promise<unknown> }} [opcje] */
function atrapaKontenera({ register = async () => ({}) } = {}) {
  /** @type {{ rejestracje: string[], komunikaty: unknown[] }} */
  const zapis = { rejestracje: [], komunikaty: [] }
  const kontener = {
    /** @param {string} adres */
    register: (adres) => {
      zapis.rejestracje.push(adres)
      return register(adres)
    },
    ready: Promise.resolve({ active: { postMessage: (/** @type {unknown} */ dane) => zapis.komunikaty.push(dane) } }),
  }
  return { kontener, zapis }
}

describe('czyPokazacInstrukcjeIos', () => {
  it('Safari na iPhonie poza trybem aplikacji → true', () => {
    assert.equal(czyPokazacInstrukcjeIos({ userAgent: UA.iphoneSafari, standalone: false, zamknieta: false }), true)
  })

  it('iPad w Safari (podaje się jako Macintosh z dotykiem) → true, Mac bez dotyku → false', () => {
    assert.equal(czyPokazacInstrukcjeIos({ userAgent: UA.ipadSafari, standalone: false, punktyDotyku: 5, zamknieta: false }), true)
    assert.equal(czyPokazacInstrukcjeIos({ userAgent: UA.ipadSafari, standalone: false, punktyDotyku: 0, zamknieta: false }), false)
  })

  it('w trybie standalone → false', () => {
    assert.equal(czyPokazacInstrukcjeIos({ userAgent: UA.iphoneSafari, standalone: true, zamknieta: false }), false)
  })

  it('na Androidzie → false', () => {
    assert.equal(czyPokazacInstrukcjeIos({ userAgent: UA.android, standalone: false, punktyDotyku: 5, zamknieta: false }), false)
  })

  it('po zamknięciu → false', () => {
    assert.equal(czyPokazacInstrukcjeIos({ userAgent: UA.iphoneSafari, standalone: false, zamknieta: true }), false)
  })

  it('Chrome na iPhonie (inna przeglądarka niż Safari) → false', () => {
    assert.equal(czyPokazacInstrukcjeIos({ userAgent: UA.iphoneChrome, standalone: false, zamknieta: false }), false)
  })

  it('userAgent, który nie jest tekstem → TypeError', () => {
    assert.throws(() => czyPokazacInstrukcjeIos({ userAgent: undefined, standalone: false, zamknieta: false }), TypeError)
  })
})

describe('zarejestrujServiceWorker', () => {
  it('rejestruje ./sw.js i przekazuje aktywnemu workerowi pliki wczytane przez stronę', async () => {
    const { kontener, zapis } = atrapaKontenera()
    const zgloszone = /** @type {unknown[]} */ ([])

    await zarejestrujServiceWorker({ kontener, adresyZasobow: () => ['http://localhost/src/app.js'], zglos: (b) => zgloszone.push(b) })

    assert.deepEqual(zapis.rejestracje, ['./sw.js'])
    assert.deepEqual(zapis.komunikaty, [{ typ: 'zapisz-zasoby', adresy: ['http://localhost/src/app.js'] }])
    assert.deepEqual(zgloszone, [])
  })

  it('błąd rejestracji jest zgłaszany, nie przerywa aplikacji i nie wysyła komunikatu', async () => {
    const blad = new TypeError('Failed to register a ServiceWorker')
    const { kontener, zapis } = atrapaKontenera({ register: async () => { throw blad } })
    const zgloszone = /** @type {unknown[]} */ ([])

    await zarejestrujServiceWorker({ kontener, adresyZasobow: () => [], zglos: (b) => zgloszone.push(b) })

    assert.deepEqual(zgloszone, [blad])
    assert.deepEqual(zapis.komunikaty, [])
  })

  it('przeglądarka bez service workera (Node: navigator.serviceWorker undefined) — bez rejestracji i bez zgłoszeń', async () => {
    const zgloszone = /** @type {unknown[]} */ ([])

    await zarejestrujServiceWorker({ kontener: undefined, zglos: (b) => zgloszone.push(b) })

    assert.equal(globalThis.navigator?.serviceWorker, undefined)
    assert.deepEqual(zgloszone, [])
  })
})

describe('zamknijInstrukcjeIos', () => {
  it('zapisuje preferencję w stanie i zostawia resztę stanu', () => {
    const { magazyn, storage } = nowyMagazyn()
    magazyn.zmien((stan) => ({ ...stan, kopia: { ...stan.kopia, ostatnia: '2026-10-20T10:00:00.000Z' } }))

    zamknijInstrukcjeIos(magazyn)

    const zapisany = JSON.parse(storage.getItem(KLUCZ_MAGAZYNU) ?? 'null')
    assert.deepEqual(zapisany.preferencje, { iosInstrukcjaZamknieta: true })
    assert.equal(zapisany.kopia.ostatnia, '2026-10-20T10:00:00.000Z')
  })

  it('brak miejsca w pamięci → BladMagazynu „pelny”, preferencja nie zapisana', () => {
    const { magazyn, storage } = nowyMagazyn()
    storage.pelna = true

    assert.throws(() => zamknijInstrukcjeIos(magazyn), (blad) => blad instanceof BladMagazynu && blad.kod === 'pelny')
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), null)
  })
})
