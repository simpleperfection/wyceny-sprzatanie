import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import { zapiszKopie } from './kopia.js'

const TERAZ = new Date('2026-11-05T12:00:00.000Z')
const NAZWA = 'wyceny-kopia-2026-11-05.json'

const nowyMagazyn = () => utworzMagazyn(new PamiecMagazynu(), { teraz: () => TERAZ, loguj: () => {}, poprosOTrwalosc: () => true })

describe('zapiszKopie', () => {
  it('plik zapisany: data ostatniej kopii i komunikat sukcesu z nazwą pliku', async () => {
    const magazyn = nowyMagazyn()
    /** @type {string[][]} */
    const zapisy = []

    const komunikat = await zapiszKopie(magazyn, TERAZ, async (...argumenty) => { zapisy.push(argumenty); return 'pobrany' })

    assert.deepEqual(komunikat, { rodzaj: 'sukces', tekst: `Kopia zapisana: ${NAZWA}` })
    assert.equal(wczytajStan(magazyn).kopia.ostatnia, TERAZ.toISOString())
    assert.equal(zapisy[0]?.[0], NAZWA)
    assert.equal(zapisy[0]?.[2], 'application/json')
    assert.ok(typeof JSON.parse(zapisy[0]?.[1] ?? 'null') === 'object')
  })

  it('zatwierdzone okno udostępniania liczy się jak zapisana kopia', async () => {
    const magazyn = nowyMagazyn()

    const komunikat = await zapiszKopie(magazyn, TERAZ, async () => 'udostepniony')

    assert.equal(komunikat.rodzaj, 'sukces')
    assert.equal(wczytajStan(magazyn).kopia.ostatnia, TERAZ.toISOString())
  })

  it('okno zamknięte bez wyboru: bez daty kopii, aplikacja nadal przypomina', async () => {
    const magazyn = nowyMagazyn()

    const komunikat = await zapiszKopie(magazyn, TERAZ, async () => 'anulowany')

    assert.deepEqual(komunikat, { rodzaj: 'info', tekst: 'Nie zapisano kopii: okno zamknięto bez wyboru miejsca.' })
    assert.equal(wczytajStan(magazyn).kopia.ostatnia, null)
  })

  it('zapis niepotwierdzony: bez daty kopii, komunikat każe sprawdzić plik w aplikacji Pliki', async () => {
    const magazyn = nowyMagazyn()

    const komunikat = await zapiszKopie(magazyn, TERAZ, async () => 'niepotwierdzony')

    assert.equal(komunikat.rodzaj, 'info')
    assert.match(komunikat.tekst, new RegExp(`Sprawdź w aplikacji Pliki, czy jest tam ${NAZWA}`))
    assert.equal(wczytajStan(magazyn).kopia.ostatnia, null)
  })

  it('błąd zapisu leci dalej i nie zostawia daty kopii', async () => {
    const magazyn = nowyMagazyn()

    await assert.rejects(zapiszKopie(magazyn, TERAZ, () => Promise.reject(new TypeError('zapis'))), { message: 'zapis' })

    assert.equal(wczytajStan(magazyn).kopia.ostatnia, null)
  })
})
