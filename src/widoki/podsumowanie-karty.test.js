import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import { AtrapaElementu, pierwszy, tekst, tekstPoza, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { kartaCeny, kartaZostaje, wyjasnienieMediany } from './podsumowanie-karty.js'

/** @typedef {import('../kreator/podsumowanie.js').Podsumowanie} Podsumowanie */

const NBSP = ' '
const MAZOWIECKIE = Object.freeze({ id: 'mazowieckie', nazwa: 'mazowieckie' })
const RYNEK = Object.freeze({ mediana: 249.6, od: 120, do: 450, pelne: true, procent: 0.2, polozenie: /** @type {const} */ ('w') })
const ABONAMENT = Object.freeze({ wizyt: 4, zaWizyte: 300, miesiecznie: 1200, zostajeMiesiecznie: 820 })

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
  /** @param {unknown} element @param {string} klasa */
  const poKlasie = (element, klasa) => znajdz(element, (e) => e.atrybuty.get('class') === klasa)[0]

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

  it('pasek rynku: zakres, kreska mediany i punkt ceny stoją na swoich miejscach skali', () => {
    const element = kartaCeny(widok(), MAZOWIECKIE, null)

    const procentPaska = (/** @type {string} */ klasa, /** @type {string} */ wlasciwosc) =>
      Number.parseFloat(poKlasie(element, klasa)?.wlasciwosci.get(wlasciwosc) ?? '').toFixed(2)
    assert.equal(procentPaska('wykres-rynku__zakres', '--pozycja'), '8.33')
    assert.equal(procentPaska('wykres-rynku__zakres', '--koniec'), '91.67')
    assert.equal(procentPaska('wykres-rynku__kreska', '--pozycja'), '41.06')
    assert.equal(procentPaska('wykres-rynku__punkt', '--pozycja'), '53.79')
  })

  it('pasek rynku podaje widełki tekstem', () => {
    const element = kartaCeny(widok(), MAZOWIECKIE, null)

    assert.equal(tekst(poKlasie(element, 'karta-rynku__zakres liczba')), `rynek od 120${NBSP}zł do 450${NBSP}zł`)
  })

  it('„?” przy medianie otwiera akapity z województwem wyceny', () => {
    const cialo = new AtrapaElementu('body')
    cialo.append = (/** @type {AtrapaElementu} */ okno) => {
      okno.showModal = () => {}
      cialo.dzieci.push(okno)
    }
    Reflect.set(document, 'body', cialo)
    const pomoc = pierwszy(kartaCeny(widok(), MAZOWIECKIE, null), 'button')

    pomoc?.obslugi.get('click')?.()
    Reflect.deleteProperty(document, 'body')

    const akapity = znajdz(cialo, (e) => e.tag === 'p').map(tekst)
    assert.deepEqual(akapity, wyjasnienieMediany(RYNEK, MAZOWIECKIE))
  })

  it('abonament: „za wizytę” przy kwocie i miesięczny przychód klienta', () => {
    const element = kartaCeny(widok({ abonament: ABONAMENT }), MAZOWIECKIE, null)

    assert.match(tekst(element), /za wizytę/)
    assert.match(tekst(element), new RegExp(`miesięcznie \\(4 wizyt\\): 1${NBSP}200${NBSP}zł`))
  })

  it('bez abonamentu karta nie ma „za wizytę” ani miesięcznej kwoty', () => {
    assert.doesNotMatch(tekst(kartaCeny(widok(), MAZOWIECKIE, null)), /za wizytę|miesięcznie/)
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

  it('abonament: miesięcznie pokazuje to, co zostaje, a nie przychód', () => {
    const element = kartaZostaje(widok({ abonament: ABONAMENT }), zamkniete)

    const szczegoly = pierwszy(element, 'details')
    assert.match(tekstPoza(element, szczegoly), new RegExp(`miesięcznie \\(4 wizyt\\): 820${NBSP}zł`))
    assert.doesNotMatch(tekst(element), /1.200/)
  })

  it('firma zwolniona z VAT ma opis bez kwot VAT', () => {
    const { cena } = widok()

    const szczegoly = pierwszy(kartaZostaje(widok({ cena: { ...cena, statusVat: 'zwolniony' } }), zamkniete), 'details')

    assert.equal(tekst(znajdz(szczegoly, (e) => e.tag === 'p')[1]), 'bez VAT (firma zwolniona)')
  })

  it('rozbicie z dojazdem stoi przed VAT', () => {
    const { cena } = widok()

    const szczegoly = pierwszy(kartaZostaje(widok({ cena: { ...cena, rozbicie: { uslugi: 270, dojazd: 30 } } }), zamkniete), 'details')

    assert.equal(tekst(znajdz(szczegoly, (e) => e.tag === 'p')[1]),
      `sprzątanie 270${NBSP}zł + dojazd 30${NBSP}zł · w tym VAT 23%: 56${NBSP}zł · netto 244${NBSP}zł`)
  })

  it('bez propozycji pod „Więcej” nie ma notki o ofercie', () => {
    assert.doesNotMatch(tekst(kartaZostaje(widok({ propozycje: null }), zamkniete)), /Do zaproponowania/)
  })

  it('zwinięcie „Więcej” zgłasza stan elementu, a nie stan z ostatniego rysowania', () => {
    const naPrzelacz = mock.fn()
    const szczegoly = pierwszy(kartaZostaje(widok(), { czyOtwarte: true, naPrzelacz }), 'details')
    assert.ok(szczegoly)

    szczegoly.open = false
    szczegoly.obslugi.get('toggle')?.()

    assert.deepEqual(naPrzelacz.mock.calls.map((c) => c.arguments), [[false]])
  })

  it('stan „Więcej” trzyma ekran: rozwinięte po przerysowaniu i zgłasza przełączenie', () => {
    const naPrzelacz = mock.fn()

    const szczegoly = pierwszy(kartaZostaje(widok(), { czyOtwarte: true, naPrzelacz }), 'details')

    assert.equal(szczegoly?.open, true)
    szczegoly?.obslugi.get('toggle')?.()
    assert.deepEqual(naPrzelacz.mock.calls.map((c) => c.arguments), [[true]])
  })
})
