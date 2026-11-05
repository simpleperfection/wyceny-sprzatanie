import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { wierszWizyty } from './zlecenia-wspolne.js'

/** @typedef {import('../zlecenia/kalendarz-dane.js').WierszWizyty} WierszWizyty */

/** @param {Partial<WierszWizyty>} [zmiany] @returns {WierszWizyty} */
const wizyta = (zmiany) => /** @type {WierszWizyty} */ ({
  tytul: '9:00 · Anna Kowalska', miejsce: 'ul. Lipowa 3, Warszawa', kwota: '250 zł', adres: '#/zlecenie/z1/wizyta/2026-11-02',
  czyOdwolana: false, czyZrobiona: false, czyPrzesunieta: false, ...zmiany,
})

/** @param {unknown} element @param {string} klasa */
const poKlasie = (element, klasa) => znajdz(element, (e) => (e.atrybuty.get('class') ?? '').split(' ').includes(klasa))

describe('wierszWizyty', () => {
  uzyjAtrapyDom()

  it('łączy adres i kwotę w jednym opisie, który może się zawinąć', () => {
    assert.equal(tekst(poKlasie(wierszWizyty(wizyta()), 'wiersz__opis')[0]), 'ul. Lipowa 3, Warszawa · 250 zł')
  })

  it('bez adresu pokazuje samą kwotę', () => {
    assert.equal(tekst(poKlasie(wierszWizyty(wizyta({ miejsce: null })), 'wiersz__opis')[0]), '250 zł')
  })

  it('pigułka stanu jest w treści wiersza, pod tekstem, a nie obok nazwy', () => {
    const [tresc] = poKlasie(wierszWizyty(wizyta({ czyZrobiona: true })), 'wiersz__tresc')
    assert.deepEqual(poKlasie(tresc, 'pigulka').map(tekst), ['Zrobione'])
  })

  it('wizyta bez stanu nie ma pigułki', () => {
    assert.deepEqual(poKlasie(wierszWizyty(wizyta()), 'pigulka'), [])
  })
})
