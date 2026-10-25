import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { dopasuj } from './router.js'
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
