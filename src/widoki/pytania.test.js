import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { BladKatalogu } from '../silnik/bledy.js'
import { tekstBleduPytan } from './pytania.js'

describe('tekstBleduPytan', () => {
  /** @type {PropertyDescriptor | undefined} */
  let poprzedni
  /** @type {ReturnType<typeof mock.fn>} */
  let reportError

  beforeEach(() => {
    poprzedni = Object.getOwnPropertyDescriptor(globalThis, 'reportError')
    reportError = mock.fn()
    Object.defineProperty(globalThis, 'reportError', { value: reportError, configurable: true, writable: true })
  })

  afterEach(() => {
    if (poprzedni) Object.defineProperty(globalThis, 'reportError', poprzedni)
    else Reflect.deleteProperty(globalThis, 'reportError')
  })

  it('brak sieci i limit czasu: tekst o połączeniu bez zgłoszenia błędu', () => {
    const teksty = [new TypeError('Failed to fetch'), new DOMException('limit', 'TimeoutError')].map(tekstBleduPytan)

    assert.deepEqual(teksty, Array(2).fill('Nie udało się wczytać pytań do klienta. Sprawdź połączenie z internetem i spróbuj jeszcze raz.'))
    assert.equal(reportError.mock.callCount(), 0)
  })

  it('plik pytań niezgodny z katalogiem: tekst o niepełnej liście i zgłoszenie błędu; inny błąd leci dalej', () => {
    const blad = new BladKatalogu('zly_format', 'Nieprawidłowy data/pytania.json')

    const tekst = tekstBleduPytan(blad)

    assert.equal(tekst, 'Lista pytań do klienta jest niepełna. Odśwież stronę, a jeśli to nie pomoże, zajrzyj tu później.')
    assert.deepEqual(reportError.mock.calls.map((c) => c.arguments), [[blad]])
    assert.throws(() => tekstBleduPytan(new RangeError('błąd programu')), RangeError)
  })
})
