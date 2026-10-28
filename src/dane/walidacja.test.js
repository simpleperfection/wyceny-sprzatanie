import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { bladEmaila, bladLiczby, bladNip, bladTelefonu, bladTempa, GRANICE_TEMPA } from './walidacja.js'

describe('bladTelefonu', () => {
  it('przepuszcza 9 cyfr ze spacjami, z myślnikami i z +48', () => {
    assert.equal(bladTelefonu('600 123 456'), null)
    assert.equal(bladTelefonu('600-123-456'), null)
    assert.equal(bladTelefonu('+48600123456'), null)
    assert.equal(bladTelefonu('+48 600 123 456'), null)
  })

  it('odrzuca za krótki numer, 10 cyfr bez +48, litery i +49', () => {
    assert.equal(bladTelefonu('12345'), 'telefon')
    assert.equal(bladTelefonu('6001234567'), 'telefon')
    assert.equal(bladTelefonu('600 12a 456'), 'telefon')
    assert.equal(bladTelefonu('+49600123456'), 'telefon')
    assert.equal(bladTelefonu(''), 'telefon')
  })
})

describe('bladNip', () => {
  it('NIP 5260250274 z poprawną sumą kontrolną przechodzi, także z myślnikami', () => {
    assert.equal(bladNip('5260250274'), null)
    assert.equal(bladNip('526-025-02-74'), null)
  })

  it('NIP 5260250275 ze złą cyfrą kontrolną, 9 cyfr i litery dają błąd', () => {
    assert.equal(bladNip('5260250275'), 'nip')
    assert.equal(bladNip('526025027'), 'nip')
    assert.equal(bladNip('52602502a4'), 'nip')
  })

  it('cyfra kontrolna to suma ważona mod 11: 1000000006 przechodzi, 1000000000 nie', () => {
    // 1 × 6 = 6 → cyfra kontrolna 6
    assert.equal(bladNip('1000000006'), null)
    assert.equal(bladNip('1000000000'), 'nip')
  })

  it('reszta 10 nie daje cyfry kontrolnej: 0200000000 i 0200000001 to błąd', () => {
    // 2 × 5 = 10 → reszta 10, żadna ostatnia cyfra nie pasuje
    assert.equal(bladNip('0200000000'), 'nip')
    assert.equal(bladNip('0200000001'), 'nip')
  })
})

describe('bladEmaila', () => {
  it('przepuszcza zwykły adres i adres z poddomeną', () => {
    assert.equal(bladEmaila('kontakt@firma.pl'), null)
    assert.equal(bladEmaila('jan.kowalski+oferty@poczta.firma.com.pl'), null)
    assert.equal(bladEmaila('Biuro@Sprzątanie-Łódź.PL'), null)
  })

  it('odrzuca brak @, dwa @, brak kropki w domenie, spację, ścieżkę i port w domenie', () => {
    assert.equal(bladEmaila('kontakt.firma.pl'), 'email')
    assert.equal(bladEmaila('a@b@firma.pl'), 'email')
    assert.equal(bladEmaila('kontakt@firma'), 'email')
    assert.equal(bladEmaila('kon takt@firma.pl'), 'email')
    assert.equal(bladEmaila('kontakt@firma.pl/x'), 'email')
    assert.equal(bladEmaila('kontakt@firma.pl:80'), 'email')
    assert.equal(bladEmaila('kontakt@firma..pl'), 'email')
    assert.equal(bladEmaila('kontakt@firma.pl.'), 'email')
    assert.equal(bladEmaila('kontakt@firma.pl?'), 'email')
    assert.equal(bladEmaila('@firma.pl'), 'email')
  })
})

describe('bladLiczby', () => {
  it('liczba w przedziale i na jego granicach przechodzi', () => {
    assert.equal(bladLiczby(4.5, { min: 0, max: 100 }), null)
    assert.equal(bladLiczby(0, { min: 0, max: 100 }), null)
    assert.equal(bladLiczby(100, { min: 0, max: 100 }), null)
  })

  it('poza przedziałem daje zakres, NaN i tekst dają liczba', () => {
    assert.equal(bladLiczby(-1, { min: 0, max: 100 }), 'zakres')
    assert.equal(bladLiczby(100.01, { min: 0, max: 100 }), 'zakres')
    assert.equal(bladLiczby(Number.NaN, { min: 0, max: 100 }), 'liczba')
    assert.equal(bladLiczby('4', { min: 0, max: 100 }), 'liczba')
  })
})

describe('bladTempa', () => {
  it('granice tempa to 0,5–3,0', () => {
    assert.deepEqual(GRANICE_TEMPA, { min: 0.5, max: 3 })
  })

  it('1,3 i granice przechodzą, 3,5 i 0,4 dają zakres', () => {
    assert.equal(bladTempa(1.3), null)
    assert.equal(bladTempa(0.5), null)
    assert.equal(bladTempa(3), null)
    assert.equal(bladTempa(3.5), 'zakres')
    assert.equal(bladTempa(0.4), 'zakres')
  })
})
