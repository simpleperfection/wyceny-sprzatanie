import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { dopasuj, uruchomRouter } from './router.js'
import { BladTrasy, sciezka, TRASY } from './trasy.js'

describe('dopasuj', () => {
  it('rozpoznaje trasę z parametrem w środku wzorca', () => {
    const wynik = dopasuj('#/wycena/abc/oferta', TRASY)

    assert.deepEqual(wynik, { nazwa: 'oferta', parametry: { id: 'abc' }, zapytanie: {} })
  })

  it('odróżnia trasę wyceny od jej podstron', () => {
    assert.deepEqual(dopasuj('#/wycena/abc', TRASY), { nazwa: 'wycena', parametry: { id: 'abc' }, zapytanie: {} })
    assert.equal(dopasuj('#/wycena/abc/koniec', TRASY)?.nazwa, 'zakonczenie')
  })

  it('oddaje krok kreatora i zapytanie', () => {
    const wynik = dopasuj('#/kreator/zakres?wycena=x', TRASY)

    assert.deepEqual(wynik, { nazwa: 'kreator', parametry: { krok: 'zakres' }, zapytanie: { wycena: 'x' } })
  })

  it('dekoduje parametr i toleruje ukośnik na końcu', () => {
    assert.deepEqual(dopasuj('#/wycena/a%20b/', TRASY)?.parametry, { id: 'a b' })
    assert.equal(dopasuj('#/ustawienia/start', TRASY)?.nazwa, 'kreatorStartowy')
  })

  it('zwraca null dla nieznanej trasy', () => {
    assert.equal(dopasuj('#/nic', TRASY), null)
  })

  it('zwraca null dla pustego parametru, za długiej ścieżki i złego kodowania', () => {
    assert.equal(dopasuj('#/wycena//oferta', TRASY), null)
    assert.equal(dopasuj('#/start/dalej', TRASY), null)
    assert.equal(dopasuj('#/wycena/%E0%A4%A', TRASY), null)
    assert.equal(dopasuj('', TRASY), null)
  })
})

describe('sciezka', () => {
  it('buduje adres z parametrem i zapytaniem, który dopasuj rozpoznaje', () => {
    const adres = sciezka('kreator', { krok: 'zakres' }, { wycena: 'w 1' })

    assert.equal(adres, '#/kreator/zakres?wycena=w+1')
    assert.deepEqual(dopasuj(adres, TRASY), { nazwa: 'kreator', parametry: { krok: 'zakres' }, zapytanie: { wycena: 'w 1' } })
  })

  it('koduje znaki specjalne w parametrze', () => {
    assert.equal(sciezka('oferta', { id: 'a/b' }), '#/wycena/a%2Fb/oferta')
  })

  it('rzuca BladTrasy przy braku parametru i nieznanej nazwie', () => {
    assert.throws(() => sciezka('oferta'), (blad) => blad instanceof BladTrasy && blad.kod === 'brak_parametru')
    assert.throws(() => sciezka('nic'), (blad) => blad instanceof BladTrasy && blad.kod === 'nieznana_trasa')
  })
})

describe('uruchomRouter', () => {
  /** @type {Record<string, PropertyDescriptor | undefined>} */
  const poprzednie = {}
  const GLOBALNE = ['location', 'history', 'window', 'reportError']
  /** @type {{ hash: string }} */
  let lokalizacja
  /** @type {ReturnType<typeof mock.fn>} */
  let replaceState
  /** @type {ReturnType<typeof mock.fn>} */
  let reportError

  beforeEach(() => {
    for (const nazwa of GLOBALNE) poprzednie[nazwa] = Object.getOwnPropertyDescriptor(globalThis, nazwa)
    lokalizacja = { hash: '#/start' }
    // Atrapa API przegladarki: replaceState zmienia adres jak w przegladarce.
    replaceState = mock.fn((_stan, _tytul, adres) => { lokalizacja.hash = adres })
    reportError = mock.fn()
    const zastap = (/** @type {string} */ nazwa, /** @type {unknown} */ wartosc) =>
      Object.defineProperty(globalThis, nazwa, { value: wartosc, configurable: true, writable: true })
    zastap('location', lokalizacja)
    zastap('history', { replaceState })
    zastap('window', { addEventListener: mock.fn(), removeEventListener: mock.fn(), scrollTo: mock.fn() })
    zastap('reportError', reportError)
  })

  afterEach(() => {
    for (const nazwa of GLOBALNE) {
      const opis = poprzednie[nazwa]
      if (opis) Object.defineProperty(globalThis, nazwa, opis)
      else Reflect.deleteProperty(globalThis, nazwa)
    }
  })

  /** Kontener z metodami uzywanymi przez router; zapisuje kolejne czyszczenia. */
  function kontenerTestowy() {
    return { wyczyszczenia: 0, replaceChildren() { this.wyczyszczenia += 1 }, querySelector: () => null }
  }

  /** @param {string} nazwa */
  const widokZapisujacy = (nazwa) => ({ render: mock.fn(() => undefined), nazwa })
  const DANE = /** @type {any} */ ({ katalog: {}, domyslne: {}, magazyn: {} })

  it('widok, który rzuca przy render, daje ekran błędu w tym samym kontenerze i zgłoszenie błędu', () => {
    const blad = new Error('x')
    const start = { render: () => { throw blad } }
    const bladEkranu = widokZapisujacy('bladEkranu')
    const kontener = kontenerTestowy()

    uruchomRouter(/** @type {any} */ (kontener), { start, bladEkranu, nieZnaleziono: widokZapisujacy('nieZnaleziono') }, DANE)

    assert.equal(bladEkranu.render.mock.callCount(), 1)
    assert.equal(bladEkranu.render.mock.calls[0].arguments[0], kontener)
    assert.equal(kontener.wyczyszczenia, 2)
    assert.deepEqual(reportError.mock.calls.map((w) => w.arguments[0]), [blad])
  })

  it('pusty adres przekierowuje na #/start i pokazuje widok startu', () => {
    lokalizacja.hash = ''
    const start = widokZapisujacy('start')

    uruchomRouter(/** @type {any} */ (kontenerTestowy()), { start, bladEkranu: widokZapisujacy('b'), nieZnaleziono: widokZapisujacy('n') }, DANE)

    assert.deepEqual(replaceState.mock.calls[0].arguments, [null, '', '#/start'])
    assert.equal(start.render.mock.callCount(), 1)
    assert.equal(reportError.mock.callCount(), 0)
  })
})
