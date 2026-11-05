import assert from 'node:assert/strict'
import { before, describe, it, mock } from 'node:test'

import { tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { katalogTestowy } from '../../tests/pomocnicze.js'
import { kartaRozwinieta, kartaZwinieta } from './kreator-pomieszczenia.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */

const NBSP = ' '

describe('karty pomieszczeń', () => {
  uzyjAtrapyDom()
  /** @type {Katalog} */
  let katalog

  before(async () => {
    katalog = await katalogTestowy()
  })

  /** @param {Partial<import('./kreator-pomieszczenia.js').OpcjeKarty['akcje']>} [akcje] */
  const opcje = (akcje = {}, czyWszystkieBrudy = false) => /** @type {import('./kreator-pomieszczenia.js').OpcjeKarty} */ (/** @type {unknown} */ ({
    katalog, nazwaTypu: () => 'Pokój', czyWszystkieBrudy, akcje,
  }))

  /** @param {unknown} karta @returns {string} tekst linii pod nazwa pomieszczenia */
  const opis = (karta) => tekst(znajdz(karta, (e) => e.atrybuty.get('class') === 'karta-pomieszczenia__opis liczba')[0])

  /** @param {unknown} karta @returns {import('../../tests/atrapa-dom.js').AtrapaElementu[]} */
  const linkiBrudu = (karta) => znajdz(karta, (e) => e.tag === 'button' && tekst(e) === 'Inne rodzaje brudu')

  it('zwinięta: metraż i brud z poziomem w jednej linii, bez brudu na poziomie 0', () => {
    const p = { typ: 'pokoj', m2: 12, brud: [{ id: 'kurz', poziom: 2 }, { id: 'pyl_budowlany', poziom: 0 }] }

    assert.equal(opis(kartaZwinieta(0, p, opcje())), `12${NBSP}m² · kurz 2`)
  })

  it('zwinięta bez brudu pokazuje sam metraż', () => {
    assert.equal(opis(kartaZwinieta(0, { typ: 'pokoj', m2: 12 }, opcje())), `12${NBSP}m²`)
  })

  it('zwinięta otwiera się kliknięciem z numerem pomieszczenia', () => {
    const naRozwin = mock.fn()

    kartaZwinieta(3, { typ: 'pokoj', m2: 12 }, opcje({ naRozwin })).obslugi.get('click')?.()

    assert.deepEqual(naRozwin.mock.calls.map((c) => c.arguments), [[3]])
  })

  it('rozwinięta: link „Inne rodzaje brudu” dodaje pierwszy pozostały rodzaj', () => {
    const naWszystkieBrudy = mock.fn()

    const [link] = linkiBrudu(kartaRozwinieta(2, { typ: 'pokoj', m2: 12 }, opcje({ naWszystkieBrudy })))
    link?.obslugi.get('click')?.()

    assert.deepEqual(naWszystkieBrudy.mock.calls.map((c) => c.arguments), [[2, 'pyl_budowlany']])
  })

  it('rozwinięta po pokazaniu wszystkich brudów nie ma linku i ma wiersz każdego rodzaju', () => {
    const karta = kartaRozwinieta(0, { typ: 'pokoj', m2: 12 }, opcje({}, true))

    assert.deepEqual(linkiBrudu(karta), [])
    const nazwy = znajdz(karta, (e) => e.atrybuty.get('class') === 'wiersz-brudu__nazwa').map(tekst)
    assert.deepEqual(nazwy, ['Kurz', 'Pył budowlany'])
  })
})
