import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, katalogTestowy } from '../../tests/pomocnicze.js'
import { BladWejscia } from '../silnik/bledy.js'
import { bladZakresu, mieszkanieWzorcowe, tekstLiczby, zmianaZPol } from './ustawienia-formularz.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */

describe('zmianaZPol: dane firmy', () => {
  it('telefon „600-123-456” i pusty NIP dają zmianę firmy bez błędów', () => {
    const wynik = zmianaZPol({ telefon: '600-123-456', nip: '' })

    assert.deepEqual(wynik.bledy, {})
    assert.deepEqual(wynik.patch, { firma: { telefon: '600-123-456', nip: '' } })
  })

  it('zły e-mail, telefon i NIP dają teksty błędów pod polami i nie trafiają do zmiany', () => {
    const wynik = zmianaZPol({ email: 'biuro@', telefon: '12345', nip: '1234567890', nazwa: '  Lśniący Dom ' })

    assert.deepEqual(wynik.bledy, {
      email: 'Wpisz poprawny adres e-mail.',
      telefon: 'Wpisz 9 cyfr numeru telefonu.',
      nip: 'NIP ma 10 cyfr i poprawną sumę kontrolną.',
    })
    assert.deepEqual(wynik.patch, { firma: { nazwa: 'Lśniący Dom' } })
  })

  it('pusta nazwa i pusty telefon to ostrzeżenie, a nie błąd', () => {
    const wynik = zmianaZPol({ nazwa: ' ', telefon: '' })

    assert.deepEqual(wynik.bledy, {})
    assert.deepEqual(wynik.ostrzezenia, { nazwa: 'Potrzebne w ofercie dla klienta.', telefon: 'Potrzebne w ofercie dla klienta.' })
    assert.deepEqual(wynik.patch, { firma: { nazwa: '', telefon: '' } })
  })
})

describe('zmianaZPol: koszty zlecenia', () => {
  it('chemia „4,5” daje 4.5 zł/h', () => {
    assert.deepEqual(zmianaZPol({ chemia_h: '4,5' }).patch, { koszty: { chemia_h: 4.5 } })
  })

  it('chemia „-1” daje błąd zakresu i pustą zmianę', () => {
    const wynik = zmianaZPol({ chemia_h: '-1' })

    assert.deepEqual(wynik.bledy, { chemia_h: 'Wpisz liczbę od 0 do 100.' })
    assert.deepEqual(wynik.patch, {})
  })

  it('puste pole kosztu usuwa nadpisanie (null), a dojazd i sprzęt trafiają do swoich grup', () => {
    const wynik = zmianaZPol({ chemia_h: '', klient_zl_km: '2,5', darmowy_promien_km: '15', sprzet: { szorowarka: '25', ekstraktor: '600' } })

    assert.deepEqual(wynik.patch, { koszty: { chemia_h: null, dojazd: { klient_zl_km: 2.5, darmowy_promien_km: 15 }, sprzet: { szorowarka: 25 } } })
    assert.deepEqual(wynik.bledy, { 'sprzet.ekstraktor': 'Wpisz liczbę od 0 do 500.' })
  })
})

describe('zmianaZPol: tempo ręczne', () => {
  it('tempo „3,5” daje błąd „Wpisz liczbę od 0,5 do 3.”', () => {
    const wynik = zmianaZPol({ tempo: '3,5' })

    assert.deepEqual(wynik.bledy, { tempo: 'Wpisz liczbę od 0,5 do 3.' })
    assert.deepEqual(wynik.patch, {})
  })

  it('tempo „1,25” ustawia wartość ręczną, a puste tempo jest błędem', () => {
    assert.deepEqual(zmianaZPol({ tempo: '1,25' }).patch, { tempo: { reczne: 1.25 } })
    assert.deepEqual(zmianaZPol({ tempo: '' }).bledy, { tempo: 'Wpisz liczbę od 0,5 do 3.' })
  })
})

describe('tekstLiczby i bladZakresu', () => {
  it('liczby z przecinkiem dziesiętnym bez zbędnych zer', () => {
    assert.equal(tekstLiczby(1.15), '1,15')
    assert.equal(tekstLiczby(1.3), '1,3')
    assert.equal(bladZakresu({ min: 0, max: 20 }), 'Wpisz liczbę od 0 do 20.')
  })
})

describe('mieszkanieWzorcowe', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  it('50 m² na małym katalogu: 230,82 min (30 + 32×2,63 + 6×2,63 + 8×6,83 + 4×11,56) i cena przy 65 zł/h', () => {
    const wynik = mieszkanieWzorcowe(katalog, 'mazowieckie')

    assertBlisko(wynik.minuty, 230.82, 1e-9)
    assertBlisko(wynik.cena, (230.82 / 60) * 65, 1e-9)
  })

  it('stawka województwa zmienia cenę, nie czas', () => {
    const wynik = mieszkanieWzorcowe(katalog, 'opolskie')

    assertBlisko(wynik.minuty, 230.82, 1e-9)
    assertBlisko(wynik.cena, (230.82 / 60) * 69.5, 1e-9)
  })

  it('nieznane województwo rzuca błąd wejścia', () => {
    assert.throws(() => mieszkanieWzorcowe(katalog, 'atlantyda'), BladWejscia)
  })
})
