import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { opisOdpowiedzi, pytaniaUslugi, RODZAJE_SKUTKOW, sprawdzPytania, TYPY_ODPOWIEDZI, zastosujOdpowiedzi } from './pytania.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./pytania.js').Pytania} Pytania */
/** @typedef {import('./pytania.js').Pytanie} Pytanie */

/** @type {Pytanie} */
const DOJAZD = { id: 'dojazd', tresc: 'Parking i dojazd', typ: 'liczba', jednostka: 'km', skutek: { rodzaj: 'dojazd_km' } }
/** @type {Pytanie} */
const ZWIERZETA = {
  id: 'zwierzeta', tresc: 'Czy w domu są zwierzęta?', typ: 'tak_nie',
  skutek: { rodzaj: 'brud', brud: 'siersc', poziom: 2, pomieszczenie: '*', gdy: 'tak' },
}
/** @type {Pytanie} */
const SPRZET = { id: 'sprzet', tresc: 'Czyj sprzęt?', typ: 'wybor', opcje: ['Nasze', 'Klienta'] }
/** @type {Pytania} */
const PYTANIA = {
  wspolne: [DOJAZD],
  uslugi: { mieszkanie_standard: [ZWIERZETA, SPRZET], okna: [{ ...ZWIERZETA, id: 'zwierzeta_okna' }] },
}
const POKOJE = [
  { typ: 'pokoj', m2: 30, brud: [{ id: 'kurz', poziom: 1 }] },
  { typ: 'kuchnia', m2: 8, brud: [{ id: 'siersc', poziom: 1 }] },
]

/** @param {() => unknown} fn @param {string} kod */
function rzucaKod(fn, kod) {
  assert.throws(fn, (blad) => blad instanceof Error && 'kod' in blad && blad.kod === kod)
}

/** Plik pytan z jedna zmiana dla testow bledow. @param {(p: Pytania) => void} zmien @returns {Promise<Pytania>} */
async function zmienionePytania(zmien) {
  /** @type {Pytania} */
  const pytania = await czytajJson('data/pytania.json')
  zmien(pytania)
  return pytania
}

describe('stałe pytań', () => {
  it('rodzaje skutków i typy odpowiedzi z rejestru planu', () => {
    assert.deepEqual(RODZAJE_SKUTKOW, ['brud', 'dojazd_km'])
    assert.deepEqual(TYPY_ODPOWIEDZI, ['tak_nie', 'wybor', 'liczba', 'tekst'])
  })
})

describe('pytaniaUslugi', () => {
  it('wspólne, potem pytania usługi', () => {
    assert.deepEqual(pytaniaUslugi('mieszkanie_standard', PYTANIA).map((p) => p.id), ['dojazd', 'zwierzeta', 'sprzet'])
  })

  it('usługa bez wpisu daje BladWejscia nieznana_usluga (także klucz z prototypu obiektu)', () => {
    rzucaKod(() => pytaniaUslugi('agd', PYTANIA), 'nieznana_usluga')
    rzucaKod(() => pytaniaUslugi('toString', PYTANIA), 'nieznana_usluga')
  })
})

describe('opisOdpowiedzi', () => {
  it('tak z notatką: „Tak, kot”; liczba z jednostką i notatką: „12 km, parking pod blokiem”; wybór bez notatki', () => {
    assert.equal(opisOdpowiedzi(ZWIERZETA, { wartosc: 'tak', notatka: 'kot' }), 'Tak, kot')
    assert.equal(opisOdpowiedzi(DOJAZD, { wartosc: 12, notatka: 'parking pod blokiem' }), '12 km, parking pod blokiem')
    assert.equal(opisOdpowiedzi(SPRZET, { wartosc: 'Klienta' }), 'Klienta')
  })

  it('wartość spoza typu i notatka dłuższa niż 200 znaków dają BladWejscia', () => {
    rzucaKod(() => opisOdpowiedzi(SPRZET, { wartosc: 'Sąsiada' }), 'odpowiedz')
    rzucaKod(() => opisOdpowiedzi(DOJAZD, { wartosc: -3 }), 'odpowiedz')
    rzucaKod(() => opisOdpowiedzi(ZWIERZETA, { wartosc: 'tak', notatka: 'x'.repeat(201) }), 'notatka')
  })
})

describe('zastosujOdpowiedzi', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('„tak” na pytanie o zwierzęta (sierść poziom 2 na *) ustawia sierść we wszystkich pomieszczeniach; 32 km ustawia dojazdKm', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: POKOJE }

    const wynik = zastosujOdpowiedzi(wejscie, { zwierzeta: { wartosc: 'tak' }, dojazd: { wartosc: 32 } }, PYTANIA, katalog)

    assert.deepEqual(wynik.wejscie.pomieszczenia, [
      { typ: 'pokoj', m2: 30, brud: [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 2 }] },
      { typ: 'kuchnia', m2: 8, brud: [{ id: 'siersc', poziom: 2 }] },
    ])
    assert.equal(wynik.wejscie.dojazdKm, 32)
    assert.deepEqual(wynik.skutki, [
      { pytanieId: 'dojazd', opis: 'dojazd: 44 zł dla klienta' },
      { pytanieId: 'zwierzeta', opis: 'sierść zwierząt, poziom 2 we wszystkich pomieszczeniach' },
    ])
    assert.deepEqual(wejscie.pomieszczenia, POKOJE)
  })

  it('„nie”, odpowiedź bez skutku i usługa z pozycjami nie zmieniają brudu', () => {
    const mieszkanie = zastosujOdpowiedzi({ uslugaId: 'mieszkanie_standard', pomieszczenia: POKOJE }, { zwierzeta: { wartosc: 'nie' }, sprzet: { wartosc: 'Nasze' } }, PYTANIA, katalog)
    const okna = zastosujOdpowiedzi({ uslugaId: 'okna', pozycje: [{ id: 'okno_1', ilosc: 2 }] }, { zwierzeta_okna: { wartosc: 'tak' } }, PYTANIA, katalog)

    assert.deepEqual(mieszkanie, { wejscie: { uslugaId: 'mieszkanie_standard', pomieszczenia: POKOJE }, skutki: [] })
    assert.deepEqual(okna, { wejscie: { uslugaId: 'okna', pozycje: [{ id: 'okno_1', ilosc: 2 }] }, skutki: [] })
  })

  it('zła odpowiedź na pytanie ze skutkiem daje BladWejscia odpowiedz', () => {
    rzucaKod(() => zastosujOdpowiedzi({ uslugaId: 'mieszkanie_standard' }, { dojazd: { wartosc: 'daleko' } }, PYTANIA, katalog), 'odpowiedz')
  })
})

describe('sprawdzPytania', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('prawdziwy data/pytania.json nie ma błędów', async () => {
    assert.deepEqual(sprawdzPytania(await czytajJson('data/pytania.json'), katalog), [])
  })

  it('nieznany brud „blotko” daje błąd z miejscem pytania', async () => {
    const pytania = await zmienionePytania((p) => {
      p.uslugi.mieszkanie_standard?.splice(0, 1, { ...ZWIERZETA, skutek: { rodzaj: 'brud', brud: 'blotko', poziom: 1, pomieszczenie: 'pokoj', gdy: 'tak' } })
    })

    assert.deepEqual(sprawdzPytania(pytania, katalog), ['uslugi.mieszkanie_standard[0] (zwierzeta): nieznany brud blotko'])
  })

  it('nieznana usługa, brak wpisu usługi, skutek przy złym typie, pusta treść i powtórzone id', async () => {
    const pytania = await zmienionePytania((p) => {
      p.uslugi.mycie_jachtow = [{ id: 'maszt', tresc: 'Maszt?', typ: 'tak_nie' }]
      delete p.uslugi.okna
      p.uslugi.tapicerka = [{ id: 'termin', tresc: ' ', typ: 'tekst', skutek: { rodzaj: 'dojazd_km' } }]
    })

    assert.deepEqual(sprawdzPytania(pytania, katalog), [
      'uslugi.tapicerka[0] (termin): pusta treść',
      'uslugi.tapicerka[0] (termin): skutek dojazd_km przy typie tekst',
      'uslugi.tapicerka: powtórzone id termin',
      'uslugi.mycie_jachtow: nieznana usługa',
      'uslugi: brak pytań usługi okna',
    ])
  })

  it('plik bez listy wspolne daje jeden błąd kształtu', () => {
    assert.deepEqual(sprawdzPytania({ uslugi: {} }, katalog), ['Plik pytań musi mieć listę wspolne i obiekt uslugi'])
  })
})
