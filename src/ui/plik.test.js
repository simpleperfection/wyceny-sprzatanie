import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladPliku, czytajTekst, MAKS_ROZMIAR_PLIKU } from './plik.js'

describe('czytajTekst', () => {
  it('plik z tekstem „{"a":1}” daje ten tekst', async () => {
    const plik = new File(['{"a":1}'], 'kopia.json', { type: 'application/json' })

    const tekst = await czytajTekst(plik)

    assert.equal(tekst, '{"a":1}')
  })

  it('plik o 1 bajt większy niż 10 MB daje BladPliku za_duzy bez czytania', async () => {
    const plik = new File([new Uint8Array(MAKS_ROZMIAR_PLIKU + 1)], 'duzy.json')

    await assert.rejects(czytajTekst(plik), (blad) => blad instanceof BladPliku && blad.kod === 'za_duzy')
  })

  it('plik dokładnie 10 MB przechodzi', async () => {
    const plik = new File([new Uint8Array(MAKS_ROZMIAR_PLIKU)], 'graniczny.json')

    const tekst = await czytajTekst(plik)

    assert.equal(tekst.length, MAKS_ROZMIAR_PLIKU)
  })

  it('odmowa odczytu przez przeglądarkę (NotReadableError) daje BladPliku odczyt', async () => {
    // Atrapa API przegladarki: plik, ktory zniknal z dysku po wyborze, odrzuca text() z DOMException.
    const plik = { size: 3, text: () => Promise.reject(new DOMException('Plik zniknął', 'NotReadableError')) }

    await assert.rejects(czytajTekst(plik), (blad) => blad instanceof BladPliku && blad.kod === 'odczyt')
  })

  it('błąd innego typu niż DOMException leci dalej bez zmiany', async () => {
    const plik = { size: 3, text: () => Promise.reject(new TypeError('inny')) }

    await assert.rejects(czytajTekst(plik), (blad) => blad instanceof TypeError && blad.message === 'inny')
  })
})
