import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladWejscia } from '../silnik/bledy.js'
import {
  dodajPomieszczenie, METRAZ_NOWEGO_POMIESZCZENIA, opisPrzeniesienia, podsumowanieZakresu, rodzajeBrudu, ustawBrud, ustawMetraz,
  usunPomieszczenie, zmienNazwe,
} from './pomieszczenia.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */

/** @type {Katalog} */
let katalog

before(async () => {
  katalog = await katalogZDysku()
})

/** @param {string} uslugaId @returns {WejscieWyceny} */
const puste = (uslugaId) => ({ uslugaId, wojewodztwoId: null, wariantId: null, pomieszczenia: [], dodatki: [], dojazdKm: 0 })
/** @param {string} kod */
const bladWejscia = (kod) => ({ name: BladWejscia.name, kod })
/** Mieszkanie standard z jednym pokojem 10 m² (kurz 1). */
const zPokojem = () => dodajPomieszczenie(puste('mieszkanie_standard'), 'pokoj', katalog)

describe('dodajPomieszczenie', () => {
  it('po remoncie: kuchnia i łazienka dostają kurz 1 i pył budowlany 2; nazwy „Kuchnia” i „Łazienka”', () => {
    const z1 = dodajPomieszczenie(puste('mieszkanie_po_remoncie'), 'kuchnia', katalog)

    const wejscie = dodajPomieszczenie(z1, 'lazienka', katalog)

    assert.deepEqual(wejscie.pomieszczenia, [
      { typ: 'kuchnia', nazwa: 'Kuchnia', m2: METRAZ_NOWEGO_POMIESZCZENIA, brud: [{ id: 'kurz', poziom: 1 }, { id: 'pyl_budowlany', poziom: 2 }] },
      { typ: 'lazienka', nazwa: 'Łazienka', m2: METRAZ_NOWEGO_POMIESZCZENIA, brud: [{ id: 'kurz', poziom: 1 }, { id: 'pyl_budowlany', poziom: 2 }] },
    ])
    assert.equal(METRAZ_NOWEGO_POMIESZCZENIA, 10)
  })

  it('kuchnia jako aneks ma nazwę „Aneks kuchenny”; biuro dostaje nazwę „Kuchnia socjalna” i sam kurz 1', () => {
    const aneks = dodajPomieszczenie(puste('mieszkanie_standard'), 'kuchnia', katalog, { czyAneks: true })
    const biuro = dodajPomieszczenie({ ...puste('sprzatanie_biur'), wariantId: 'jednorazowe' }, 'kuchnia_socjalna', katalog)

    assert.equal(aneks.pomieszczenia?.[0]?.nazwa, 'Aneks kuchenny')
    assert.deepEqual(biuro.pomieszczenia?.[0], { typ: 'kuchnia_socjalna', nazwa: 'Kuchnia socjalna', m2: 10, brud: [{ id: 'kurz', poziom: 1 }] })
  })

  it('typ spoza zestawu usługi i usługa z pozycjami dają BladWejscia; wejście zostaje bez zmian', () => {
    const wejscie = puste('mieszkanie_standard')

    assert.throws(() => dodajPomieszczenie(wejscie, 'toaleta', katalog), bladWejscia('nieznane_pomieszczenie'))
    assert.throws(() => dodajPomieszczenie(puste('okna'), 'pokoj', katalog), bladWejscia('tryb_uslugi'))
    assert.deepEqual(wejscie.pomieszczenia, [])
  })
})

describe('ustawMetraz', () => {
  it('0 i 1500 dają BladWejscia `metraz`, 12,5 zapisuje 12,5', () => {
    const wejscie = zPokojem()

    assert.throws(() => ustawMetraz(wejscie, 0, 0), bladWejscia('metraz'))
    assert.throws(() => ustawMetraz(wejscie, 0, 1500), bladWejscia('metraz'))
    assert.equal(ustawMetraz(wejscie, 0, 12.5).pomieszczenia?.[0]?.m2, 12.5)
    assert.equal(wejscie.pomieszczenia?.[0]?.m2, 10)
  })

  it('granice 0,5 i 1000 m² przechodzą, 0,4 i NaN nie; nieznany numer pomieszczenia daje BladWejscia', () => {
    const wejscie = zPokojem()

    assert.equal(ustawMetraz(wejscie, 0, 0.5).pomieszczenia?.[0]?.m2, 0.5)
    assert.equal(ustawMetraz(wejscie, 0, 1000).pomieszczenia?.[0]?.m2, 1000)
    assert.throws(() => ustawMetraz(wejscie, 0, 0.4), bladWejscia('metraz'))
    assert.throws(() => ustawMetraz(wejscie, 0, Number.NaN), bladWejscia('metraz'))
    assert.throws(() => ustawMetraz(wejscie, 1, 12), bladWejscia('nieznane_pomieszczenie'))
  })
})

describe('ustawBrud', () => {
  it('ustawia tłuszcz 2, zmienia kurz na 3 w miejscu i usuwa kurz poziomem 0', () => {
    const z1 = ustawBrud(zPokojem(), 0, 'tluszcz', 2)
    const z2 = ustawBrud(z1, 0, 'kurz', 3)

    const z3 = ustawBrud(z2, 0, 'kurz', 0)

    assert.deepEqual(z1.pomieszczenia?.[0]?.brud, [{ id: 'kurz', poziom: 1 }, { id: 'tluszcz', poziom: 2 }])
    assert.deepEqual(z2.pomieszczenia?.[0]?.brud, [{ id: 'kurz', poziom: 3 }, { id: 'tluszcz', poziom: 2 }])
    assert.deepEqual(z3.pomieszczenia?.[0]?.brud, [{ id: 'tluszcz', poziom: 2 }])
  })

  it('poziom 4 i 1,5 dają BladWejscia `poziom_brudu`', () => {
    assert.throws(() => ustawBrud(zPokojem(), 0, 'kurz', 4), bladWejscia('poziom_brudu'))
    assert.throws(() => ustawBrud(zPokojem(), 0, 'kurz', 1.5), bladWejscia('poziom_brudu'))
  })
})

describe('zmienNazwe i usunPomieszczenie', () => {
  it('nazwa jest obcinana ze spacji; pusta i 41 znaków dają BladWejscia', () => {
    assert.equal(zmienNazwe(zPokojem(), 0, '  Salon ').pomieszczenia?.[0]?.nazwa, 'Salon')
    assert.throws(() => zmienNazwe(zPokojem(), 0, '   '), bladWejscia('nazwa_pomieszczenia'))
    assert.throws(() => zmienNazwe(zPokojem(), 0, 'a'.repeat(41)), bladWejscia('nazwa_pomieszczenia'))
  })

  it('usuwa wskazane pomieszczenie, a nieznany numer daje BladWejscia', () => {
    const wejscie = dodajPomieszczenie(zPokojem(), 'lazienka', katalog)

    assert.deepEqual(usunPomieszczenie(wejscie, 0).pomieszczenia?.map((p) => p.typ), ['lazienka'])
    assert.throws(() => usunPomieszczenie(wejscie, 2), bladWejscia('nieznane_pomieszczenie'))
  })
})

describe('rodzajeBrudu', () => {
  it('nowe pomieszczenie pokazuje kurz, tłuszcz, kamień i pleśń; sierść i pył budowlany są do dodania', () => {
    const pokoj = zPokojem().pomieszczenia?.[0]
    assert.ok(pokoj)

    const { widoczne, pozostale } = rodzajeBrudu(katalog, pokoj)

    assert.deepEqual(widoczne.map((b) => b.id), ['kurz', 'tluszcz', 'kamien', 'plesn'])
    assert.deepEqual(pozostale.map((b) => b.id), ['siersc', 'pyl_budowlany'])
  })

  it('ustawiony pył budowlany przechodzi do widocznych', () => {
    const pokoj = ustawBrud(zPokojem(), 0, 'pyl_budowlany', 2).pomieszczenia?.[0]
    assert.ok(pokoj)

    const { widoczne, pozostale } = rodzajeBrudu(katalog, pokoj)

    assert.deepEqual(widoczne.map((b) => b.id), ['kurz', 'tluszcz', 'kamien', 'plesn', 'pyl_budowlany'])
    assert.deepEqual(pozostale.map((b) => b.id), ['siersc'])
  })
})

describe('podsumowanieZakresu', () => {
  /** Układ 50 m² standard ze scenariusza kalibracji (sekcja 2): pokój 32, przedpokój 6, kuchnia 8, łazienka 4; kurz 1. */
  function mieszkanie50() {
    let wejscie = puste('mieszkanie_standard')
    for (const [typ, m2] of /** @type {const} */ ([['pokoj', 32], ['przedpokoj', 6], ['kuchnia', 8], ['lazienka', 4]])) {
      wejscie = dodajPomieszczenie(wejscie, typ, katalog)
      wejscie = ustawMetraz(wejscie, (wejscie.pomieszczenia?.length ?? 0) - 1, m2)
    }
    return wejscie
  }

  it('układ 50 m² standard: 50 m², 230,82 min normowych i 300,066 min z tempem 1,3', () => {
    const wynik = podsumowanieZakresu(mieszkanie50(), katalog, 1.3)

    assert.equal(wynik.m2, 50)
    assertBlisko(wynik.minutyNormowe, 230.82)
    assertBlisko(wynik.minutyZTempem, 300.066)
  })

  it('biuro jednorazowe liczy mnożnik wariantu 1,5: kuchnia socjalna 10 m² = 30 + 10 × 2,47 × 1,5 min', () => {
    const wejscie = dodajPomieszczenie({ ...puste('sprzatanie_biur'), wariantId: 'jednorazowe' }, 'kuchnia_socjalna', katalog)

    assertBlisko(podsumowanieZakresu(wejscie, katalog, 1).minutyNormowe, 30 + 10 * 2.47 * 1.5)
  })

  it('pusta lista daje zera, a tempo 0 daje BladWejscia `tempo`', () => {
    assert.deepEqual(podsumowanieZakresu(puste('mieszkanie_standard'), katalog, 1.3), { m2: 0, minutyNormowe: 0, minutyZTempem: 0 })
    assert.throws(() => podsumowanieZakresu(mieszkanie50(), katalog, 0), bladWejscia('tempo'))
  })
})

describe('opisPrzeniesienia', () => {
  it('liczy metraż, łazienki i rozpoznaje aneks po nazwie; bez kuchni — null', () => {
    let wejscie = dodajPomieszczenie(zPokojem(), 'lazienka', katalog)
    wejscie = dodajPomieszczenie(wejscie, 'lazienka', katalog)
    const zAneksem = dodajPomieszczenie(wejscie, 'kuchnia', katalog, { czyAneks: true })
    const zKuchnia = dodajPomieszczenie(wejscie, 'kuchnia', katalog)

    assert.deepEqual(opisPrzeniesienia(zAneksem), { m2: 40, lazienki: 2, kuchnia: 'aneks' })
    assert.deepEqual(opisPrzeniesienia(zKuchnia), { m2: 40, lazienki: 2, kuchnia: 'kuchnia' })
    assert.deepEqual(opisPrzeniesienia(wejscie), { m2: 30, lazienki: 2, kuchnia: null })
  })
})
