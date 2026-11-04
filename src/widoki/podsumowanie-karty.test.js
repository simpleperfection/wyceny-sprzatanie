import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import { pierwszy, tekst, tekstPoza, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { kartaCeny, kartaZostaje, wyjasnienieMediany } from './podsumowanie-karty.js'

/** @typedef {import('../kreator/podsumowanie.js').Podsumowanie} Podsumowanie */

const NBSP = ' '
const MAZOWIECKIE = Object.freeze({ id: 'mazowieckie', nazwa: 'mazowieckie' })
const RYNEK = Object.freeze({ mediana: 249.6, od: 120, do: 450, pelne: true, procent: 0.2, polozenie: /** @type {const} */ ('w') })

/** @param {Partial<Podsumowanie>} [zmiany] @returns {Podsumowanie} */
const widok = (zmiany = {}) => ({
  cena: { brutto: 300, netto: 244, vat: 56, czyReczna: false, statusVat: 'czynny', stawkaVatProc: 23, rozbicie: null, minimum: null },
  rynek: RYNEK,
  zostaje: { kwota: 205, naGodzine: 41, minutyWlasne: 300, tempo: 1.3, zrodloTempa: 'reczne' },
  koszty: [{ rodzaj: 'cena', kwota: 300 }, { rodzaj: 'sprzet', kwota: 25, nazwa: null }, { rodzaj: 'zostaje', kwota: 205 }],
  abonament: null,
  propozycje: null,
  ostrzezenia: [],
  ...zmiany,
})

describe('wyjasnienieMediany', () => {
  it('opisuje medianę w województwie wyceny, widełki i położenie ceny', () => {
    assert.deepEqual(wyjasnienieMediany(RYNEK, MAZOWIECKIE), [
      'Środkowa cena z cenników firm w mazowieckim: połowa firm bierze mniej, połowa więcej.',
      `Pasek pokazuje, ile za takie sprzątanie biorą firmy: od 120${NBSP}zł do 450${NBSP}zł.`,
      'Twoja cena względem mediany: +20%.',
    ])
  })

  it('wycena ze średnią krajową nie ma województwa, a niepełne widełki dostają dopisek', () => {
    const akapity = wyjasnienieMediany({ ...RYNEK, pelne: false }, { id: null, nazwa: 'średnia krajowa' })

    assert.equal(akapity[0], 'Środkowa cena z cenników firm w Polsce: połowa firm bierze mniej, połowa więcej.')
    assert.equal(akapity.at(-1), 'Część pozycji nie ma danych o widełkach.')
  })
})

describe('karta ceny', () => {
  uzyjAtrapyDom()

  it('kwota i mediana z przyciskiem „?” są na karcie, a VAT i rozbicia na wierzchu nie ma', () => {
    const element = kartaCeny(widok(), MAZOWIECKIE, null)

    const kwota = znajdz(element, (e) => e.atrybuty.get('class') === 'karta-ceny__liczba liczba')
    const pomoc = pierwszy(element, 'button')
    assert.deepEqual(kwota.map(tekst), [`300${NBSP}zł`])
    assert.equal(pomoc?.atrybuty.get('aria-label'), 'Wyjaśnienie: Mediana rynku')
    assert.match(tekst(element), new RegExp(`Mediana rynku 250${NBSP}zł`))
    assert.doesNotMatch(tekst(element), /VAT/)
  })

  it('„Zmień” jest tylko przy wycenie do edycji i wywołuje obsługę', () => {
    const naZmien = mock.fn()

    const element = kartaCeny(widok(), MAZOWIECKIE, naZmien)

    const [zmien] = znajdz(element, (e) => e.atrybuty.get('data-akcja') === 'zmien')
    assert.equal(tekst(zmien), 'Zmień')
    zmien?.obslugi.get('click')?.()
    assert.equal(naZmien.mock.callCount(), 1)
    assert.deepEqual(znajdz(kartaCeny(widok(), MAZOWIECKIE, null), (e) => e.atrybuty.get('data-akcja') === 'zmien'), [])
  })

  it('cena podniesiona do minimum zostaje na wierzchu', () => {
    const { cena } = widok()

    const element = kartaCeny(widok({ cena: { ...cena, minimum: 150 } }), MAZOWIECKIE, null)

    assert.match(tekst(element), new RegExp(`Cena podniesiona do minimum zlecenia: 150${NBSP}zł\\.`))
  })
})

describe('karta „Zostaje dla Ciebie”', () => {
  uzyjAtrapyDom()
  const zamkniete = { czyOtwarte: false, naPrzelacz: () => {} }

  it('na wierzchu jedno zdanie, a czas, koszty, VAT i propozycje dopiero pod „Więcej”', () => {
    const element = kartaZostaje(widok({ propozycje: { opisy: ['Mycie okien'], kwota: 100 } }), zamkniete)

    const szczegoly = pierwszy(element, 'details')
    assert.equal(tekstPoza(element, szczegoly), `Zostaje dla Ciebie 205${NBSP}zł, czyli 41${NBSP}zł za godzinę pracy.`)
    assert.equal(szczegoly?.open, false)
    const ukryte = tekst(szczegoly)
    assert.match(ukryte, /Czas pracy: 5 h \(tempo 1,3×\)/)
    assert.match(ukryte, new RegExp(`Sprzęt−25${NBSP}zł`))
    assert.match(ukryte, new RegExp(`w tym VAT 23%: 56${NBSP}zł · netto 244${NBSP}zł`))
    assert.match(ukryte, new RegExp(`Do zaproponowania w ofercie: mycie okien \\+100${NBSP}zł`))
  })

  it('stan „Więcej” trzyma ekran: rozwinięte po przerysowaniu i zgłasza przełączenie', () => {
    const naPrzelacz = mock.fn()

    const szczegoly = pierwszy(kartaZostaje(widok(), { czyOtwarte: true, naPrzelacz }), 'details')

    assert.equal(szczegoly?.open, true)
    szczegoly?.obslugi.get('toggle')?.()
    assert.deepEqual(naPrzelacz.mock.calls.map((c) => c.arguments), [[true]])
  })
})
