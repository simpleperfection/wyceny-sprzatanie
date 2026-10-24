import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, daneTestowe, katalogTestowy, katalogZDanych, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladKatalogu } from './bledy.js'
import { wycenUsluge } from './cena.js'
import { widelkiRynku } from './widelki.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./cena.js').WejscieWyceny} WejscieWyceny */

const MIESZKANIE_50 = [
  { typ: 'pokoj', m2: 32 },
  { typ: 'przedpokoj', m2: 6 },
  { typ: 'kuchnia', m2: 8 },
  { typ: 'lazienka', m2: 4 },
]

/** @param {WejscieWyceny} wejscie @param {Katalog} katalog */
function widelki(wejscie, katalog) {
  return widelkiRynku(wycenUsluge(wejscie, katalog), wejscie, katalog)
}

describe('widelkiRynku: prawdziwe dane', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('mieszkanie 50 m² standard w mazowieckim: 120–450 zł (zakres rynku × cena modelu / mediana 250)', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie', pomieszczenia: MIESZKANIE_50 }

    const wynik = widelki(wejscie, katalog)

    assert.deepEqual([Math.round(wynik.od), Math.round(wynik.do)], [120, 450])
    assertBlisko(wynik.od, (250.055 * 120) / 250, 1e-6)
    assertBlisko(wynik.do, (250.055 * 450) / 250, 1e-6)
    assert.equal(wynik.pelne, true)
  })

  it('dojazd klienta i dodatek „w cenie” wchodzą na oba końce', () => {
    const dodatki = [{ uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 4, tryb: /** @type {const} */ ('w_cenie') }]
    const wejscie = { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie', pomieszczenia: MIESZKANIE_50, dodatki, dojazdKm: 32 }

    const wynik = widelki(wejscie, katalog)

    assertBlisko(wynik.od, (250.055 * 120) / 250 + 4 * 10 + 44, 1e-6)
    assertBlisko(wynik.do, (250.055 * 450) / 250 + 4 * 70 + 44, 1e-6)
  })

  it('okna 8 × okno 1-skrz.: zakres 80–560 zł, dolny koniec podniesiony do minimum 150 zł', () => {
    const wynik = widelki({ uslugaId: 'okna', wojewodztwoId: 'mazowieckie', pozycje: [{ id: 'okno_1', ilosc: 8 }] }, katalog)

    assert.deepEqual(wynik, { od: 150, do: 560, pelne: true })
  })

  it('okno balkonowe bez zakresu wchodzi kwotą modelu na obu końcach i daje pelne: false', () => {
    const pozycje = [{ id: 'okno_1', ilosc: 8 }, { id: 'okno_balkonowe', ilosc: 2 }]

    const wynik = widelki({ uslugaId: 'okna', wojewodztwoId: 'mazowieckie', pozycje }, katalog)

    assert.deepEqual(wynik, { od: 8 * 10 + 2 * 50, do: 8 * 70 + 2 * 50, pelne: false })
  })

  it('kostka 40 m²: zakres mycia z progiem 1,15, dopłaty bez progu, materiał impregnatu na obu końcach', () => {
    const pozycje = [{ id: 'mycie', ilosc: 40 }, { id: 'mech', ilosc: 40 }, { id: 'impregnacja', ilosc: 40 }]

    const wynik = widelki({ uslugaId: 'mycie_kostki', wojewodztwoId: 'mazowieckie', pozycje }, katalog)

    assertBlisko(wynik.od, 40 * 8 * 1.15 + 40 * 5 + 40 * 15 + 40 * 8)
    assertBlisko(wynik.do, 40 * 21 * 1.15 + 40 * 10 + 40 * 28 + 40 * 8)
    assert.equal(wynik.pelne, true)
  })
})

describe('widelkiRynku: brak danych rynku (mały katalog)', () => {
  it('usługa z pomieszczeniami bez rynek_odniesienie rzuca BladKatalogu brak_rynku', async () => {
    const katalog = await katalogTestowy()
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 20 }] }

    assert.throws(() => widelki(wejscie, katalog), (blad) => blad instanceof BladKatalogu && blad.kod === 'brak_rynku')
  })

  it('rynek_odniesienie wskazujące punkt spoza kraj w data/rynek.json rzuca BladKatalogu brak_rynku', async () => {
    const dane = await daneTestowe()
    dane.ceny.uslugi[0].rynek_odniesienie = 'mieszkanie_50m2'
    const katalog = await katalogZDanych(dane)
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 20 }] }

    assert.throws(() => widelki(wejscie, katalog), (blad) => blad instanceof BladKatalogu && blad.kod === 'brak_rynku')
  })
})
