import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { katalogTestowy } from '../../tests/pomocnicze.js'
import { infoDojazdu } from '../kreator/pozycje.js'
import { wierszDodatku, wyliczenieDojazdu } from './kreator-dodatki.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */

const NBSP = ' '
const STAWKI = Object.freeze({ darmowy_promien_km: 10, klient_zl_km: 2, koszt_firmy_zl_km: 1 })

describe('wyliczenieDojazdu', () => {
  it('w promieniu: klient nie płaci, a koszt firmy liczy kursy w obie strony', () => {
    const info = infoDojazdu(5, STAWKI)

    assert.deepEqual([info.kmPonad, info.kmRazem], [0, 10])
    assert.equal(wyliczenieDojazdu(5, STAWKI), `Dla klienta: w promieniu 10 km. Twój koszt: 10 km × 1${NBSP}zł.`)
  })

  it('ponad promień: klient płaci za kilometry ponad promień, a firma za całą trasę', () => {
    const info = infoDojazdu(25, STAWKI)

    assert.deepEqual([info.kmPonad, info.kmRazem], [15, 50])
    assert.equal(wyliczenieDojazdu(25, STAWKI), `Dla klienta: 15 km ponad 10 km × 2${NBSP}zł. Twój koszt: 50 km × 1${NBSP}zł.`)
  })

  it('dokładnie na granicy promienia klient jeszcze nie płaci', () => {
    assert.match(wyliczenieDojazdu(10, STAWKI), /^Dla klienta: w promieniu 10 km\./)
  })
})

describe('wiersz dodatku', () => {
  uzyjAtrapyDom()
  const AKCJE = Object.freeze({ naPrzelacz: () => {}, naOtworz: () => {} })
  /** @type {Katalog} */
  let katalog

  before(async () => {
    katalog = await katalogTestowy()
  })

  /** @param {string} tryb @returns {{ opis: string, kwota: string }} */
  function wiersz(tryb) {
    const usluga = katalog.usluga('doczyszczanie')
    const pozycja = katalog.pozycja('doczyszczanie', 'doczyszczanie_posadzki')
    const wejscie = { dodatki: [{ uslugaId: usluga.id, pozycjaId: pozycja.id, ilosc: 3, tryb }] }
    const element = wierszDodatku({ usluga, pozycja }, /** @type {Wycena} */ (/** @type {unknown} */ ({ wejscie })), katalog, AKCJE)
    const [opis] = znajdz(element, (e) => e.atrybuty.get('class') === 'wiersz-pozycji__opis')
    const [kwota] = znajdz(element, (e) => e.atrybuty.get('class') === 'wiersz-pozycji__kwota liczba')
    return { opis: tekst(opis), kwota: tekst(kwota) }
  }

  it('propozycja ma w opisie „w ofercie” i kwotę z plusem, bo nie wchodzi do ceny', () => {
    assert.deepEqual(wiersz('propozycja'), { opis: `w ofercie · 3 × 10${NBSP}zł`, kwota: `+30${NBSP}zł` })
  })

  it('dodatek w cenie ma sam iloczyn i kwotę bez plusa', () => {
    assert.deepEqual(wiersz('w_cenie'), { opis: `3 × 10${NBSP}zł`, kwota: `30${NBSP}zł` })
  })
})
