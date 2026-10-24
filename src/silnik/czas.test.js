import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, czytajJson, katalogTestowy, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladWejscia } from './bledy.js'
import { wycenUsluge } from './cena.js'
import { brudPozycji, minutyDodatkow, minutyJednejPozycji, minutyPomieszczen, minutyPozycji, mnoznikBrudu, mnoznikZakresu, skalaBiura, zBrudem } from './czas.js'
import { ukladBiura, ukladMieszkania } from './uklad.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */

const DOKLADNOSC_PARYTETU = 0.01

/** @param {string} kod */
const bladWejscia = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladWejscia && blad.kod === kod

describe('czas: parytet ze scenariuszami skryptu kalibracji (prawdziwe dane)', () => {
  /** @type {Katalog} */ let katalog
  /** @type {{ usluga: string, wariant: string | null, m2: number, wojewodztwo: string | null, minuty: number }[]} */ let scenariusze
  before(async () => {
    katalog = await katalogZDysku()
    scenariusze = (await czytajJson('research/kalibracja-scenariusze.json')).pomieszczenia
  })

  /** @param {string} uslugaId @param {string | null} wariant @param {number} m2 */
  function minutyTypowe(uslugaId, wariant, m2) {
    const usluga = katalog.usluga(uslugaId)
    const uklad = usluga.zestaw_pomieszczen === 'biuro' ? ukladBiura(m2, katalog.uklady) : ukladMieszkania(m2, {}, katalog.uklady)
    return minutyPomieszczen(zBrudem(uklad, usluga.brud_domyslny), mnoznikZakresu(usluga, wariant, m2, katalog), katalog)
  }

  /** @param {string} uslugaId @param {string | null} wariant @param {number} m2 */
  function minutyScenariusza(uslugaId, wariant, m2) {
    const s = scenariusze.find((x) => x.usluga === uslugaId && x.wariant === wariant && x.m2 === m2 && x.wojewodztwo === null)
    assert.ok(s, `brak scenariusza ${uslugaId} ${wariant} ${m2}`)
    return s.minuty
  }

  it('mieszkanie 50 m² standard: minuty jak w pliku scenariuszy', () => {
    const oczekiwane = minutyScenariusza('mieszkanie_standard', null, 50)

    const minuty = minutyTypowe('mieszkanie_standard', null, 50)

    assertBlisko(minuty, oczekiwane, DOKLADNOSC_PARYTETU)
    assertBlisko(minuty, 230.82, DOKLADNOSC_PARYTETU)
  })

  for (const { uslugaId, wariant, m2 } of [
    { uslugaId: 'mieszkanie_po_remoncie', wariant: null, m2: 50 },
    { uslugaId: 'mieszkanie_po_wynajmie', wariant: null, m2: 50 },
    { uslugaId: 'sprzatanie_biur', wariant: 'jednorazowe', m2: 100 },
    { uslugaId: 'sprzatanie_biur', wariant: 'abonament_1', m2: 1000 },
  ]) {
    it(`${uslugaId} ${wariant ?? ''} ${m2} m²: minuty jak w pliku scenariuszy`, () => {
      const oczekiwane = minutyScenariusza(uslugaId, wariant, m2)

      const minuty = minutyTypowe(uslugaId, wariant, m2)

      assertBlisko(minuty, oczekiwane, DOKLADNOSC_PARYTETU)
    })
  }

  it('okna: 8 × okno 1-skrzydłowe = przygotowanie 30 + 8 × 15 min', () => {
    const minuty = minutyPozycji('okna', [{ id: 'okno_1', ilosc: 8 }], 1, katalog)

    assert.equal(minuty, 30 + 8 * 15)
  })

  it('dodatki w cenie liczą się bez przygotowania usługi', () => {
    const dodatki = [{ uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 4 }, { uslugaId: 'agd', pozycjaId: 'piekarnik', ilosc: 1 }]

    const minuty = minutyDodatkow(dodatki, katalog)

    assert.equal(minuty, 4 * 15 + 45)
  })
})

describe('czas: brud, skala biura i pozycje (mały katalog)', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  it('reguła pył budowlany poziom 2 na „*” dokłada m² × norma pyłu do każdego pomieszczenia', () => {
    const uklad = [{ typ: 'pokoj', m2: 10 }, { typ: 'lazienka', m2: 4 }]
    const bezBrudu = minutyPomieszczen(uklad, 1, katalog)

    const zBrudemPylu = minutyPomieszczen(zBrudem(uklad, [{ pomieszczenie: '*', brud: 'pyl_budowlany', poziom: 2 }]), 1, katalog)

    assert.equal(bezBrudu, 30 + 10 * 2.63 + 4 * 11.56)
    assertBlisko(zBrudemPylu - bezBrudu, (10 + 4) * 4)
  })

  it('reguła z typem pomieszczenia trafia tylko do tego typu i zachowuje brud wpisany ręcznie', () => {
    const uklad = [{ typ: 'pokoj', m2: 10, brud: [{ id: 'kurz', poziom: 3 }] }, { typ: 'lazienka', m2: 4 }]

    const wynik = zBrudem(uklad, [{ pomieszczenie: 'lazienka', brud: 'pyl_budowlany', poziom: 1 }])

    assert.deepEqual(wynik.map((p) => p.brud), [[{ id: 'kurz', poziom: 3 }], [{ id: 'pyl_budowlany', poziom: 1 }]])
  })

  it('minutyPomieszczen: mnożnik zakresu mnoży normę pomieszczenia, a nie brud', () => {
    const minuty = minutyPomieszczen([{ typ: 'kuchnia', m2: 10, brud: [{ id: 'kurz', poziom: 2 }] }], 1.5, katalog)

    assertBlisko(minuty, 30 + 10 * 6.83 * 1.5 + 10 * 0.9)
  })

  it('minutyPomieszczen odrzuca nieznany typ, zły metraż i nieznany poziom brudu', () => {
    assert.throws(() => minutyPomieszczen([{ typ: 'garaz', m2: 10 }], 1, katalog), bladWejscia('nieznane_pomieszczenie'))
    assert.throws(() => minutyPomieszczen([{ typ: 'pokoj', m2: -5 }], 1, katalog), bladWejscia('metraz'))
    assert.throws(() => minutyPomieszczen([{ typ: 'pokoj', m2: 5, brud: [{ id: 'kurz', poziom: 4 }] }], 1, katalog), bladWejscia('poziom_brudu'))
    assert.throws(() => minutyPomieszczen([{ typ: 'pokoj', m2: 5 }], 0, katalog), bladWejscia('mnoznik'))
  })

  it('skalaBiura: 1 do 299 m², 0,85 od 300 m², 0,7 od 1000 m²', () => {
    assert.deepEqual([skalaBiura(299, katalog), skalaBiura(300, katalog), skalaBiura(1000, katalog)], [1, 0.85, 0.7])
  })

  it('mnoznikZakresu: biuro = wariant × skala biura, mieszkanie = mnoznik_zakresu usługi', () => {
    const biuro = katalog.usluga('sprzatanie_biur')

    assertBlisko(mnoznikZakresu(biuro, 'jednorazowe', 400, katalog), 1.5 * 0.85)
    assert.equal(mnoznikZakresu(katalog.usluga('mieszkanie_standard'), null, 400, katalog), 1)
    assert.throws(() => mnoznikZakresu(biuro, null, 100, katalog), bladWejscia('nieznany_wariant'))
  })

  it('usługa z poziomy_brudu: poziom 3 mnoży czas pozycji głównej przez 1,4, a dopłaty nie', () => {
    const pozycje = [{ id: 'doczyszczanie_posadzki', ilosc: 100 }, { id: 'zabezpieczenie', ilosc: 100 }]

    const poziom1 = minutyPozycji('doczyszczanie', pozycje, 1, katalog)
    const poziom3 = minutyPozycji('doczyszczanie', pozycje, 3, katalog)

    assert.equal(poziom1, 60 + 100 * 2 + 100 * 1.5)
    assertBlisko(poziom3, 60 + 100 * 2 * 1.4 + 100 * 1.5)
  })

  it('minutyPozycji odrzuca ujemną ilość, nieznaną pozycję i poziom brudu spoza 1–3', () => {
    assert.throws(() => minutyPozycji('doczyszczanie', [{ id: 'doczyszczanie_posadzki', ilosc: -1 }], 1, katalog), bladWejscia('ilosc'))
    assert.throws(() => minutyPozycji('doczyszczanie', [{ id: 'okno_1', ilosc: 1 }], 1, katalog), bladWejscia('nieznana_pozycja'))
    assert.throws(() => minutyPozycji('doczyszczanie', [], 4, katalog), bladWejscia('poziom_brudu'))
    assert.throws(() => minutyPozycji('nieznana', [], 1, katalog), bladWejscia('nieznana_usluga'))
  })

  it('minutyDodatkow odrzuca nieznaną pozycję dodatku', () => {
    assert.throws(() => minutyDodatkow([{ uslugaId: 'doczyszczanie', pozycjaId: 'brak', ilosc: 1 }], katalog), bladWejscia('nieznana_pozycja'))
  })
})

describe('czas: wspólna reguła czasu pozycji i mnożnika brudu (mały katalog)', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  it('mnoznikBrudu: poziom 3 usługi z poziomy_brudu to 1,4, usługa bez poziomów zawsze 1', () => {
    assert.equal(mnoznikBrudu(katalog.usluga('doczyszczanie'), 3, katalog), 1.4)
    assert.equal(mnoznikBrudu(katalog.usluga('mieszkanie_standard'), 3, katalog), 1)
  })

  it('mnoznikBrudu odrzuca poziom 4 kodem poziom_brudu', () => {
    assert.throws(() => mnoznikBrudu(katalog.usluga('doczyszczanie'), 4, katalog), bladWejscia('poziom_brudu'))
  })

  it('brudPozycji: pozycja główna dostaje mnożnik brudu, dopłata 1', () => {
    assert.equal(brudPozycji(katalog.pozycja('doczyszczanie', 'doczyszczanie_posadzki'), 1.4), 1.4)
    assert.equal(brudPozycji(katalog.pozycja('doczyszczanie', 'zabezpieczenie'), 1.4), 1)
  })

  it('minutyJednejPozycji: 100 m² doczyszczania przy brudzie 1,4 to 100 × 2 × 1,4, dopłata bez brudu 100 × 1,5', () => {
    assertBlisko(minutyJednejPozycji('doczyszczanie', katalog.pozycja('doczyszczanie', 'doczyszczanie_posadzki'), 100, 1.4, katalog), 280)
    assert.equal(minutyJednejPozycji('doczyszczanie', katalog.pozycja('doczyszczanie', 'zabezpieczenie'), 100, 1.4, katalog), 150)
  })

  it('minutyJednejPozycji odrzuca ujemną ilość kodem ilosc', () => {
    const pozycja = katalog.pozycja('doczyszczanie', 'doczyszczanie_posadzki')

    assert.throws(() => minutyJednejPozycji('doczyszczanie', pozycja, -1, 1, katalog), bladWejscia('ilosc'))
  })

  it('wycenUsluge liczy minuty normowe tą samą regułą co minutyPozycji (poziom brudu 3, z dopłatą)', () => {
    const pozycje = [{ id: 'doczyszczanie_posadzki', ilosc: 120 }, { id: 'zabezpieczenie', ilosc: 120 }]

    const wynik = wycenUsluge({ uslugaId: 'doczyszczanie', pozycje, poziomBrudu: 3 }, katalog)

    assert.equal(wynik.minutyNormowe, minutyPozycji('doczyszczanie', pozycje, 3, katalog))
    assertBlisko(wynik.minutyNormowe, 60 + 120 * 2 * 1.4 + 120 * 1.5)
  })
})
