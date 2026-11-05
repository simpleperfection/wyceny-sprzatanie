import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { BladKatalogu } from '../silnik/bledy.js'
import { pobierzJson, sygnalLimitu } from './pobierz.js'

const fetchOryginalny = globalThis.fetch

/** Atrapa fetch (usluga zewnetrzna): zapisuje adres i sygnal, odpowiada podanym statusem i trescia. @param {number} status @param {unknown} tresc */
function atrapaFetch(status, tresc) {
  /** @type {{ adres: string, sygnal: unknown }[]} */
  const wywolania = []
  globalThis.fetch = async (adres, opcje) => {
    wywolania.push({ adres: String(adres), sygnal: opcje?.signal })
    return new Response(JSON.stringify(tresc), { status })
  }
  return wywolania
}

afterEach(() => {
  globalThis.fetch = fetchOryginalny
})

describe('pobierzJson', () => {
  it('odpowiedź 200: treść JSON; żądanie z sygnałem limitu czasu', async () => {
    const wywolania = atrapaFetch(200, { wersja: 'test' })

    const dane = await pobierzJson('data/ceny.json')

    assert.deepEqual(dane, { wersja: 'test' })
    assert.equal(wywolania[0]?.adres, 'data/ceny.json')
    assert.ok(wywolania[0]?.sygnal instanceof AbortSignal)
  })

  it('odpowiedź 404 daje BladKatalogu brak_pliku z adresem i statusem', async () => {
    atrapaFetch(404, null)

    await assert.rejects(pobierzJson('data/brak.json'), { name: BladKatalogu.name, kod: 'brak_pliku', message: 'data/brak.json: HTTP 404' })
  })
})

describe('sygnalLimitu', () => {
  /** @param {AbortSignal} sygnal @returns {Promise<void>} */
  const przerwanie = (sygnal) => new Promise((resolve) => { sygnal.addEventListener('abort', () => resolve(), { once: true }) })

  it('przeglądarka z AbortSignal.timeout: sygnał przerywa się po czasie błędem TimeoutError', async () => {
    const sygnal = sygnalLimitu(1)

    await przerwanie(sygnal)

    assert.equal(sygnal.reason.name, 'TimeoutError')
  })

  it('Safari starsze niż 16 (bez AbortSignal.timeout): sygnał też przerywa się po czasie błędem TimeoutError', async () => {
    const opis = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout')
    Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true })
    try {
      const sygnal = sygnalLimitu(1)
      assert.equal(sygnal.aborted, false)

      await przerwanie(sygnal)

      assert.equal(sygnal.reason.name, 'TimeoutError')
    } finally {
      if (opis) Object.defineProperty(AbortSignal, 'timeout', opis)
    }
  })
})
