// Parytet silnika wyceny ze skryptem kalibracji (R27): kazdy scenariusz z research/kalibracja-scenariusze.json
// (generowany przez scripts/kalibracja.ps1) daje te same minuty i ceny co wycenUsluge na prawdziwych danych z data/.

import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { wycenUsluge } from './cena.js'
import { zBrudem } from './czas.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/**
 * @typedef {{ opis: string, usluga: string, wariant: string | null, m2: number, wojewodztwo: string | null, stawka_h: number,
 *   uklad: { typ: string, m2: number }[], minuty: number, cena: number, wizyt_w_miesiacu: number | null }} ScenariuszPomieszczen
 * @typedef {{ usluga: string, pozycja: string, ilosc: number, prog: number, material: number, cena: number, minuty: number }} ScenariuszPozycji
 */

const DOKLADNOSC_PARYTETU = 0.01
const PLIK_SCENARIUSZY = 'research/kalibracja-scenariusze.json'

/** @type {{ pomieszczenia: ScenariuszPomieszczen[], pozycje: ScenariuszPozycji[] }} */
const scenariusze = await czytajJson(PLIK_SCENARIUSZY)

describe('parytet: scenariusze pomieszczeń ze skryptu kalibracji', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('plik scenariuszy ma scenariusze obu trybów', () => {
    assert.ok(scenariusze.pomieszczenia.length >= 30, `za mało scenariuszy pomieszczeń: ${scenariusze.pomieszczenia.length}`)
    assert.ok(scenariusze.pozycje.length >= 8, `za mało scenariuszy pozycji: ${scenariusze.pozycje.length}`)
  })

  for (const s of scenariusze.pomieszczenia) {
    it(`${s.opis}: minuty ${s.minuty.toFixed(2)}, cena ${s.cena.toFixed(2)} zł`, () => {
      const usluga = katalog.usluga(s.usluga)
      const pomieszczenia = zBrudem(s.uklad.map((p) => ({ ...p, nazwa: p.typ })), usluga.brud_domyslny)

      const wynik = wycenUsluge({ uslugaId: s.usluga, wojewodztwoId: s.wojewodztwo, wariantId: s.wariant, pomieszczenia }, katalog)

      assertBlisko(wynik.minutyNormowe, s.minuty, DOKLADNOSC_PARYTETU)
      assertBlisko(wynik.cenaUslugi, s.cena, DOKLADNOSC_PARYTETU)
      assert.equal(wynik.wizytWMiesiacu, s.wizyt_w_miesiacu)
    })
  }
})

describe('parytet: zlecenia wzorcowe w trybie pozycji ze skryptu kalibracji', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  for (const s of scenariusze.pozycje) {
    it(`${s.usluga}.${s.pozycja} × ${s.ilosc}: cena ${s.cena} zł, minuty ${s.minuty}`, () => {
      const wejscie = { uslugaId: s.usluga, wojewodztwoId: null, pozycje: [{ id: s.pozycja, ilosc: s.ilosc }], poziomBrudu: 1 }

      const wynik = wycenUsluge(wejscie, katalog)

      assertBlisko(wynik.cena, s.cena, DOKLADNOSC_PARYTETU)
      assertBlisko(wynik.minutyNormowe, s.minuty, DOKLADNOSC_PARYTETU)
      assert.equal(wynik.linie[0]?.mnoznikProgu, s.prog)
    })
  }
})
