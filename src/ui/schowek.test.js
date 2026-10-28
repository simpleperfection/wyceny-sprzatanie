import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { kopiujDoSchowka } from './schowek.js'

/** Atrapy API przegladarki (Node nie ma schowka, zaznaczenia ani document.execCommand). */
const GLOBALNE = /** @type {const} */ (['navigator', 'getSelection', 'document'])

describe('kopiujDoSchowka', () => {
  /** @type {Map<string, PropertyDescriptor | undefined>} */
  const poprzednie = new Map()
  const zapasowy = /** @type {HTMLElement} */ (/** @type {unknown} */ ({ id: 'tekst-szybkiej' }))
  /** @type {ReturnType<typeof mock.fn>} */
  let zaznacz
  /** @type {ReturnType<typeof mock.fn>} */
  let wykonaj

  /** @param {unknown} clipboard */
  function ustawPrzegladarke(clipboard) {
    const wartosci = {
      navigator: { clipboard },
      getSelection: () => ({ selectAllChildren: zaznacz }),
      document: { execCommand: wykonaj },
    }
    for (const nazwa of GLOBALNE) Object.defineProperty(globalThis, nazwa, { value: wartosci[nazwa], configurable: true, writable: true })
  }

  beforeEach(() => {
    for (const nazwa of GLOBALNE) poprzednie.set(nazwa, Object.getOwnPropertyDescriptor(globalThis, nazwa))
    zaznacz = mock.fn()
    wykonaj = mock.fn(() => true)
    mock.method(console, 'warn', () => {})
  })

  afterEach(() => {
    for (const nazwa of GLOBALNE) {
      const opis = poprzednie.get(nazwa)
      if (opis) Object.defineProperty(globalThis, nazwa, opis)
      else Reflect.deleteProperty(globalThis, nazwa)
    }
    mock.restoreAll()
  })

  it('Clipboard API przyjmuje tekst: true, bez zaznaczania i bez execCommand', async () => {
    const writeText = mock.fn(async () => {})
    ustawPrzegladarke({ writeText })

    const wynik = await kopiujDoSchowka('Sprzątanie mieszkania 50 m²: 250–300 zł.', zapasowy)

    assert.equal(wynik, true)
    assert.deepEqual(writeText.mock.calls.map((c) => c.arguments), [['Sprzątanie mieszkania 50 m²: 250–300 zł.']])
    assert.equal(zaznacz.mock.callCount(), 0)
    assert.equal(wykonaj.mock.callCount(), 0)
  })

  it('odmowa (DOMException NotAllowedError): zaznacza element zapasowy, kopiuje execCommand i zostawia ślad schowek_odmowa', async () => {
    wykonaj = mock.fn(() => false)
    ustawPrzegladarke({ writeText: async () => { throw new DOMException('Brak uprawnienia', 'NotAllowedError') } })

    const wynik = await kopiujDoSchowka('tekst', zapasowy)

    assert.equal(wynik, false)
    assert.deepEqual(zaznacz.mock.calls.map((c) => c.arguments), [[zapasowy]])
    assert.deepEqual(wykonaj.mock.calls.map((c) => c.arguments), [['copy']])
    const ostrzezenia = /** @type {{ mock: { calls: { arguments: unknown[] }[] } }} */ (/** @type {unknown} */ (console.warn))
    assert.deepEqual(ostrzezenia.mock.calls.map((c) => c.arguments),
      [[JSON.stringify({ modul: 'schowek', kod: 'schowek_odmowa', przyczyna: 'NotAllowedError' })]])
  })

  it('brak Clipboard API (TypeError przy navigator.clipboard undefined): kopiuje przez zaznaczenie, execCommand daje true', async () => {
    ustawPrzegladarke(undefined)

    const wynik = await kopiujDoSchowka('tekst', zapasowy)

    assert.equal(wynik, true)
    assert.deepEqual(zaznacz.mock.calls.map((c) => c.arguments), [[zapasowy]])
    assert.deepEqual(wykonaj.mock.calls.map((c) => c.arguments), [['copy']])
  })

  it('błąd programu (RangeError) leci dalej bez zaznaczania', async () => {
    ustawPrzegladarke({ writeText: async () => { throw new RangeError('za długi tekst') } })

    await assert.rejects(kopiujDoSchowka('tekst', zapasowy), RangeError)
    assert.equal(zaznacz.mock.callCount(), 0)
    assert.equal(wykonaj.mock.callCount(), 0)
  })
})
