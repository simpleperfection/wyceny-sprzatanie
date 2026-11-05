import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladPliku, czytajTekst, MAKS_ROZMIAR_PLIKU, zapiszPlik } from './plik.js'

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

describe('zapiszPlik', () => {
  const IPHONE = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1', standalone: true }
  const IPAD = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15', standalone: false, punktyDotyku: 5 }
  const ANDROID = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36', standalone: false }
  const NAZWA = 'wyceny-kopia-2026-11-05.json'

  /**
   * Atrapy API przegladarki: systemowe okno udostepniania i pobranie pliku.
   * @param {{ srodowisko: object, canShare?: boolean | null, share?: () => Promise<void> }} opcje null: brak funkcji canShare
   */
  function atrapy({ srodowisko, canShare = true, share = async () => {} }) {
    /** @type {unknown[][]} */
    const pobrania = []
    /** @type {{ files: File[] }[]} */
    const udostepnione = []
    const udostepnianie = {
      canShare: canShare === null ? undefined : () => canShare,
      /** @param {{ files: File[] }} dane */
      share: (dane) => { udostepnione.push(dane); return share() },
    }
    return { pobrania, udostepnione, opcje: { srodowisko, udostepnianie, pobierz: (...argumenty) => pobrania.push(argumenty) } }
  }

  it('Android: plik jest pobierany, bez okna udostępniania', async () => {
    const { pobrania, udostepnione, opcje } = atrapy({ srodowisko: ANDROID })

    const wynik = await zapiszPlik(NAZWA, '{"a":1}', 'application/json', opcje)

    assert.equal(wynik, 'pobrany')
    assert.deepEqual(pobrania, [[NAZWA, '{"a":1}', 'application/json']])
    assert.equal(udostepnione.length, 0)
  })

  it('iPhone: plik o tej nazwie, typie i treści idzie do okna udostępniania, bez pobierania', async () => {
    const { pobrania, udostepnione, opcje } = atrapy({ srodowisko: IPHONE })

    const wynik = await zapiszPlik(NAZWA, '{"a":1}', 'application/json', opcje)

    const plik = udostepnione[0]?.files[0]
    assert.equal(wynik, 'udostepniony')
    assert.equal(plik?.name, NAZWA)
    assert.equal(plik?.type, 'application/json')
    assert.equal(await plik?.text(), '{"a":1}')
    assert.equal(pobrania.length, 0)
  })

  it('iPad podający się za Maca z ekranem dotykowym też dostaje okno udostępniania', async () => {
    const { udostepnione, opcje } = atrapy({ srodowisko: IPAD })

    const wynik = await zapiszPlik(NAZWA, 'x', 'text/plain', opcje)

    assert.equal(wynik, 'udostepniony')
    assert.equal(udostepnione.length, 1)
  })

  it('iPhone: okno zamknięte bez wyboru daje anulowany i nic nie pobiera', async () => {
    const { pobrania, opcje } = atrapy({ srodowisko: IPHONE, share: () => Promise.reject(new DOMException('Zamknięte', 'AbortError')) })

    const wynik = await zapiszPlik(NAZWA, 'x', 'text/plain', opcje)

    assert.equal(wynik, 'anulowany')
    assert.equal(pobrania.length, 0)
  })

  it('iPhone bez udostępniania tego pliku: pobranie, ale zapis zostaje niepotwierdzony', async () => {
    const { pobrania, udostepnione, opcje } = atrapy({ srodowisko: IPHONE, canShare: false })

    const wynik = await zapiszPlik(NAZWA, 'x', 'text/plain', opcje)

    assert.equal(wynik, 'niepotwierdzony')
    assert.deepEqual(pobrania, [[NAZWA, 'x', 'text/plain']])
    assert.equal(udostepnione.length, 0)
  })

  it('iPhone bez funkcji canShare: pobranie, ale zapis zostaje niepotwierdzony', async () => {
    const { pobrania, opcje } = atrapy({ srodowisko: IPHONE, canShare: null })

    const wynik = await zapiszPlik(NAZWA, 'x', 'text/plain', opcje)

    assert.equal(wynik, 'niepotwierdzony')
    assert.equal(pobrania.length, 1)
  })

  it('iPhone: odmowa okna (NotAllowedError) kończy się pobraniem bez potwierdzenia', async () => {
    const { pobrania, opcje } = atrapy({ srodowisko: IPHONE, share: () => Promise.reject(new DOMException('Odmowa', 'NotAllowedError')) })

    const wynik = await zapiszPlik(NAZWA, 'x', 'text/plain', opcje)

    assert.equal(wynik, 'niepotwierdzony')
    assert.equal(pobrania.length, 1)
  })

  it('iPhone: błąd innego typu leci dalej bez pobierania', async () => {
    const { pobrania, opcje } = atrapy({ srodowisko: IPHONE, share: () => Promise.reject(new TypeError('inny')) })

    await assert.rejects(zapiszPlik(NAZWA, 'x', 'text/plain', opcje), (blad) => blad instanceof TypeError && blad.message === 'inny')
    assert.equal(pobrania.length, 0)
  })
})
