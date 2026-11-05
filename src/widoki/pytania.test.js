import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { AtrapaElementu, pierwszy, tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { adresKroku } from './kreator-wspolne.js'
import { pokazBrakWyceny, powrotPytan, tekstBleduPytan } from './pytania.js'

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

describe('powrotPytan', () => {
  it('szybka wycena wraca na ekran szybkiej z numerem rekordu', () => {
    assert.deepEqual(powrotPytan({ id: 'w1', rodzaj: 'szybka' }), { wstecz: '#/szybka?wycena=w1', wsteczTekst: 'Szybka wycena' })
  })

  it('dokładna wycena wraca do kroku „Usługa” kreatora', () => {
    assert.deepEqual(powrotPytan({ id: 'w1', rodzaj: 'dokladna' }), { wstecz: adresKroku('usluga', 'w1'), wsteczTekst: 'Usługa' })
  })
})

describe('pokazBrakWyceny', () => {
  uzyjAtrapyDom()

  it('nagłówek i przycisk wracają do modułu Wycena', () => {
    const kontener = new AtrapaElementu('main')

    pokazBrakWyceny(/** @type {HTMLElement} */ (/** @type {unknown} */ (kontener)), 'Nie ma tej wyceny.')

    const [gora, tresc] = kontener.dzieci
    const powrot = pierwszy(gora, 'a')
    assert.deepEqual([powrot?.atrybuty.get('href'), tekst(powrot)], ['#/wyceny', 'Wycena'])
    assert.match(tekst(tresc), /Nie ma tej wyceny\./)
    const [akcja] = znajdz(tresc, (e) => e.tag === 'a')
    assert.deepEqual([akcja?.atrybuty.get('href'), tekst(akcja)], ['#/wyceny', 'Wróć do wycen'])
  })
})
