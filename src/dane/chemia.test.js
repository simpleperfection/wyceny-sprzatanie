import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { czytajJson } from '../../tests/pomocnicze.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { chemiaAplikacji } from './chemia.js'

describe('chemiaAplikacji', () => {
  it('błąd wczytania nie zostaje w pamięci; udane wczytanie jest pamiętane do końca sesji', async () => {
    const zepsute = async () => { throw new BladKatalogu('brak_pliku', 'data/chemia.json: HTTP 404') }
    /** @type {string[]} */
    const pobrane = []
    /** @param {string} sciezka */
    const zDysku = async (sciezka) => { pobrane.push(sciezka); return czytajJson(sciezka) }

    await assert.rejects(chemiaAplikacji(zepsute), { name: BladKatalogu.name, kod: 'brak_pliku' })
    const pierwsza = await chemiaAplikacji(zDysku)
    const druga = await chemiaAplikacji(zepsute)

    assert.ok(pierwsza.kategorie.length > 0)
    assert.equal(druga, pierwsza)
    assert.deepEqual(pobrane, ['data/chemia.json'])
  })
})
