import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { dzienWizyty, nazwaZlecenia, nazwyUslug, opisZlecenia, tekstTerminu, tekstZaplaty } from './teksty-wizyty.js'

const DZIS = '2026-11-03' // wtorek
const KATALOG = { uslugi: [{ id: 'mieszkanie_standard', nazwa: 'Mieszkanie lub dom' }] }

describe('tekstTerminu', () => {
  it('dzień z godziną, a bez godziny sam dzień', () => {
    assert.equal(tekstTerminu(DZIS, '09:30'), 'wt 3 lis, 9:30')
    assert.equal(tekstTerminu(DZIS, null), 'wt 3 lis')
  })
})

describe('tekstZaplaty', () => {
  it('forma i dzień zapłaty, a bez formy samo „Zapłacone”', () => {
    assert.equal(tekstZaplaty({ forma: 'przelew', data: DZIS, kwota: 250 }), 'Zapłacone · Przelew · wt 3 lis')
    assert.equal(tekstZaplaty({ forma: null, data: DZIS, kwota: 250 }), 'Zapłacone')
  })
})

describe('dzienWizyty', () => {
  const stan = { przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null }

  it('wizyta przesunięta jest w nowym dniu, a bez przesunięcia i bez stanu w dniu pierwotnym', () => {
    const wizyty = { [DZIS]: { ...stan, przeniesiona: { data: '2026-11-04', godzina: null } }, '2026-11-10': stan }

    assert.equal(dzienWizyty({ wizyty }, DZIS), '2026-11-04')
    assert.equal(dzienWizyty({ wizyty }, '2026-11-10'), '2026-11-10')
    assert.equal(dzienWizyty({ wizyty }, '2026-11-17'), '2026-11-17')
  })
})

describe('nazwaZlecenia', () => {
  const nazwaUslugi = nazwyUslug(KATALOG)

  it('opis wygrywa z usługą, a bez opisu jest nazwa usługi z katalogu', () => {
    assert.equal(nazwaZlecenia({ opis: 'Klatka schodowa', uslugaId: 'mieszkanie_standard' }, nazwaUslugi), 'Klatka schodowa')
    assert.equal(nazwaZlecenia({ opis: null, uslugaId: 'mieszkanie_standard' }, nazwaUslugi), 'Mieszkanie lub dom')
  })

  it('usługa spoza katalogu pokazuje swoje id', () => {
    assert.equal(nazwaZlecenia({ opis: null, uslugaId: 'usunieta' }, nazwaUslugi), 'usunieta')
  })

  it('bez opisu i bez usługi jest „Zlecenie”', () => {
    assert.equal(nazwaZlecenia({ opis: null, uslugaId: null }, nazwaUslugi), 'Zlecenie')
  })
})

describe('opisZlecenia', () => {
  /** @param {object} okres */
  const opis = (okres) => opisZlecenia({ start: DZIS, okresy: [{ od: DZIS, cykl: null, godzina: null, cenaWizyty: 100, cenaMiesiaca: null, ...okres }] })

  it('dzień, godzina i powtarzanie', () => {
    assert.equal(opis({}), 'wt 3 lis')
    assert.equal(opis({ godzina: '09:30' }), 'wt 3 lis, 9:30')
    assert.equal(opis({ godzina: '10:00', cykl: { co: 'tydzien', dni: [2] } }), 'wt 3 lis, 10:00 · Co tydzień')
    assert.equal(opis({ cykl: { co: 'miesiac', dni: [] } }), 'wt 3 lis · Co miesiąc')
  })
})
