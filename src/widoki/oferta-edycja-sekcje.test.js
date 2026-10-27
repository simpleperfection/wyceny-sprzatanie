import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { BladKatalogu } from '../silnik/bledy.js'
import { tekstBleduZakresow, tekstKwoty, tekstWaznosci, warunkiPoEdycji, widoczneWarunki, zakresyAplikacji } from './oferta-edycja-sekcje.js'

const NBSP = ' '
const DZIS = new Date(2026, 9, 24, 15, 30)
const WARUNKI = Object.freeze([
  { id: 'odwolanie', tresc: 'Odwołanie bezpłatne do 24 h.', tylko_szybka: false },
  { id: 'stan_lokalu', tresc: 'Cena zakłada stan lokalu z rozmowy.', tylko_szybka: true },
  { id: 'zdjecia', tresc: 'Robimy zdjęcia przed i po pracy.', tylko_szybka: false },
])

describe('tekstWaznosci', () => {
  it('data i liczba dni od dziś (dzień lokalny, bez godziny)', () => {
    assert.equal(tekstWaznosci('2026-11-07', DZIS), '7 listopada 2026 (14 dni)')
  })

  it('jutro — „1 dzień”, dziś — „dziś”, wczoraj — „termin minął”', () => {
    assert.equal(tekstWaznosci('2026-10-25', DZIS), '25 października 2026 (1 dzień)')
    assert.equal(tekstWaznosci('2026-10-24', DZIS), '24 października 2026 (dziś)')
    assert.equal(tekstWaznosci('2026-10-23', DZIS), '23 października 2026 (termin minął)')
  })

  it('przez zmianę czasu (koniec października) liczy pełne dni', () => {
    assert.equal(tekstWaznosci('2026-10-26', DZIS), '26 października 2026 (2 dni)')
  })
})

describe('tekstKwoty', () => {
  it('jedna kwota albo widełki z jednym „zł” na końcu', () => {
    assert.equal(tekstKwoty({ od: 294, do: 294 }), `294${NBSP}zł`)
    assert.equal(tekstKwoty({ od: 250, do: 1320 }), `250–1${NBSP}320${NBSP}zł`)
  })
})

describe('widoczneWarunki', () => {
  it('oferta z dokładnej wyceny pomija warunki tylko dla szybkiej, szybka pokazuje wszystkie', () => {
    assert.deepEqual(widoczneWarunki(WARUNKI, false).map((w) => w.id), ['odwolanie', 'zdjecia'])
    assert.deepEqual(widoczneWarunki(WARUNKI, true).map((w) => w.id), ['odwolanie', 'stan_lokalu', 'zdjecia'])
  })
})

describe('warunkiPoEdycji', () => {
  it('kolejność i treść z edytora, nowy punkt bez „tylko_szybka”, ukryte warunki zostają na końcu', () => {
    const punkty = [{ id: 'zdjecia', tekst: 'Zdjęcia przed i po.' }, { id: 'nowy-1', tekst: 'Płatność gotówką albo przelewem.' }]
    assert.deepEqual(warunkiPoEdycji(WARUNKI, punkty, false), [
      { id: 'zdjecia', tresc: 'Zdjęcia przed i po.', tylko_szybka: false },
      { id: 'nowy-1', tresc: 'Płatność gotówką albo przelewem.', tylko_szybka: false },
      { id: 'stan_lokalu', tresc: 'Cena zakłada stan lokalu z rozmowy.', tylko_szybka: true },
    ])
  })

  it('przy wszystkich widocznych (szybka, ustawienia) usunięty warunek znika, a „tylko_szybka” zostaje z danych', () => {
    const punkty = [{ id: 'stan_lokalu', tekst: 'Stan lokalu jak w rozmowie.' }]
    assert.deepEqual(warunkiPoEdycji(WARUNKI, punkty, true), [{ id: 'stan_lokalu', tresc: 'Stan lokalu jak w rozmowie.', tylko_szybka: true }])
  })
})

describe('tekstBleduZakresow', () => {
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

  it('brak sieci i limit czasu — tekst o połączeniu, bez zgłoszenia', () => {
    assert.match(tekstBleduZakresow(new TypeError('Failed to fetch')), /Sprawdź połączenie z internetem/)
    assert.match(tekstBleduZakresow(new DOMException('limit', 'TimeoutError')), /Sprawdź połączenie z internetem/)
    assert.equal(reportError.mock.callCount(), 0)
  })

  it('zły plik — tekst o niepełnym pliku i zgłoszenie błędu', () => {
    const blad = new BladKatalogu('zly_format', 'Nieprawidłowy format data/zakresy.json')
    assert.match(tekstBleduZakresow(blad), /Plik zakresów prac jest niepełny/)
    assert.deepEqual(reportError.mock.calls.map((c) => c.arguments), [[blad]])
  })

  it('inny błąd leci dalej', () => {
    assert.throws(() => tekstBleduZakresow(new RangeError('błąd programu')), RangeError)
  })
})

describe('zakresyAplikacji', () => {
  it('po błędzie próbuje od nowa, a wczytany plik pamięta do końca sesji', async () => {
    const zakresy = { uslugi: { okna: { wchodzi: ['Mycie szyb i ram'], nie_wchodzi: ['Mycie żaluzji'] } } }
    const zepsute = mock.fn(async () => { throw new TypeError('Failed to fetch') })
    const dobre = mock.fn(async () => zakresy)
    const inne = mock.fn(async () => ({ uslugi: {} }))

    await assert.rejects(zakresyAplikacji(zepsute), TypeError)
    const wczytane = await zakresyAplikacji(dobre)
    const zPamieci = await zakresyAplikacji(inne)

    assert.deepEqual(dobre.mock.calls.map((c) => c.arguments), [['data/zakresy.json']])
    assert.equal(wczytane, zakresy)
    assert.equal(zPamieci, zakresy)
    assert.equal(inne.mock.callCount(), 0)
  })
})
