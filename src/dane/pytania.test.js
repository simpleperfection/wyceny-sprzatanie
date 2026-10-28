import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { pytaniaAplikacji } from './pytania.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */

/** @type {Katalog} */
let katalog
/** @type {unknown} */
let plik

before(async () => {
  katalog = await katalogZDysku()
  plik = await czytajJson('data/pytania.json')
})

describe('pytaniaAplikacji', () => {
  it('plik niezgodny z katalogiem daje BladKatalogu zly_format, a następne wywołanie wczytuje od nowa i pamięta wynik', async () => {
    /** @type {string[]} */
    const pobrane = []
    /** @param {unknown} dane */
    const zrodlo = (dane) => async (/** @type {string} */ sciezka) => {
      pobrane.push(sciezka)
      return dane
    }

    await assert.rejects(pytaniaAplikacji(katalog, zrodlo({ wspolne: [], uslugi: { mycie_jachtow: [] } })),
      (blad) => blad instanceof BladKatalogu && blad.kod === 'zly_format' && blad.message.includes('uslugi.mycie_jachtow: nieznana usługa'))
    const pytania = await pytaniaAplikacji(katalog, zrodlo(plik))
    const ponownie = await pytaniaAplikacji(katalog, zrodlo({ wspolne: [], uslugi: {} }))

    assert.deepEqual(pobrane, ['data/pytania.json', 'data/pytania.json'])
    assert.equal(ponownie, pytania)
    assert.deepEqual(pytania.wspolne.map((p) => p.id), ['dojazd', 'termin'])
  })
})
