import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { dodajKlienta } from '../dane/klienci.js'
import { utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import { BladZlecenia, utworzZlecenie, zakonczSerie, zlecenie as znajdzZlecenie, zmienOdWizyty } from '../dane/zlecenia.js'
import {
  bledyZmiany, domyslnyKoniec, miesiaceDoZaplaty, modelKarty, najblizszaOtwarta, nazwaZlecenia, okresyDoPokazania, opisRodzaju, przelaczDzien,
  wartosciZmiany, wizytaZAdresu, zmianaDoZapisu,
} from './karta-dane.js'

/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/zlecenia-ksztalt.js').Okres} Okres */
/** @typedef {import('../dane/zlecenia-ksztalt.js').StanWizyty} StanWizyty */
/** @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie */

const NBSP = ' '
const CHWILA = '2026-09-01T08:00:00.000Z'
/** Poniedzialek. */
const DZIS = '2026-11-02'
const START = '2026-09-14'
const KATALOG = { uslugi: [{ id: 'mieszkanie_standard', nazwa: 'Mieszkanie lub dom' }] }
const KLIENT = { id: 'k1', nazwa: 'Anna Kowalska', telefon: null, adres: null, notatki: null, utworzony: CHWILA, zmieniony: CHWILA }

/** @param {string} od @param {Partial<Okres>} [pola] @returns {Okres} */
const okres = (od, pola = {}) => ({ od, cykl: null, godzina: null, cenaWizyty: null, cenaMiesiaca: null, ...pola })

/** @param {Partial<StanWizyty>} [pola] @returns {StanWizyty} */
const stanWizyty = (pola = {}) => ({ przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null, ...pola })
const ZROBIONA = stanWizyty({ zrobiona: CHWILA })

/** @param {Partial<Zlecenie>} [pola] @returns {Zlecenie} */
const zlecenie = (pola = {}) => ({ id: 'z1', klientId: 'k1', wycenaId: null, uslugaId: 'mieszkanie_standard', opis: null, rozliczenie: 'za_wizyte',
  start: START, okresy: [okres(START, { godzina: '09:00', cenaWizyty: 250 })], koniec: null, plan: null, wizyty: {}, zaplatyMiesieczne: {},
  utworzone: CHWILA, zmienione: CHWILA, ...pola })

/** @param {readonly number[]} dni @param {Partial<Okres>} [pola] @returns {Zlecenie} seria co tydzien od START, 9:00, 250 zl */
const seria = (dni, pola = {}) => zlecenie({ okresy: [okres(START, { cykl: { co: 'tydzien', dni: [...dni] }, godzina: '09:00', cenaWizyty: 250, ...pola })] })

/** @param {Partial<Zlecenie>} [pola] @returns {Zlecenie} seria w poniedzialki od START za 1200 zl miesiecznie */
const miesieczna = (pola = {}) => zlecenie({ rozliczenie: 'miesiecznie',
  okresy: [okres(START, { cykl: { co: 'tydzien', dni: [1] }, godzina: '15:00', cenaMiesiaca: 1200 })], ...pola })

/** @returns {Magazyn} magazyn z klientem `k1` i seria `z1` w poniedzialki za 250 zl o 9:00 */
function magazynZSeria() {
  const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
  dodajKlienta(magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1' })
  utworzZlecenie(magazyn, { klientId: 'k1', uslugaId: 'mieszkanie_standard', rozliczenie: 'za_wizyte', start: START, cykl: { co: 'tydzien', dni: [1] },
    godzina: '09:00', cenaWizyty: 250 }, { id: 'z1' })
  return magazyn
}

/** @param {Magazyn} magazyn @returns {Zlecenie} */
const zapisane = (magazyn) => /** @type {Zlecenie} */ (znajdzZlecenie(wczytajStan(magazyn), 'z1'))

describe('nazwaZlecenia', () => {
  it('opis wygrywa z usługą, a bez opisu jest nazwa usługi z katalogu', () => {
    assert.equal(nazwaZlecenia(zlecenie({ opis: 'Klatka schodowa' }), KATALOG), 'Klatka schodowa')
    assert.equal(nazwaZlecenia(zlecenie(), KATALOG), 'Mieszkanie lub dom')
  })

  it('usługa spoza katalogu pokazuje swoje id', () => {
    assert.equal(nazwaZlecenia(zlecenie({ uslugaId: 'usunieta' }), KATALOG), 'usunieta')
  })
})

describe('opisRodzaju', () => {
  it('seria co tydzień w pn i czw o 9:00 za 250 zł', () => {
    assert.equal(opisRodzaju(seria([1, 4])), `Co tydzień: pn, czw · 9:00 · 250${NBSP}zł za wizytę`)
  })

  it('seria rozliczana miesięcznie ma kwotę za miesiąc', () => {
    const z = zlecenie({ rozliczenie: 'miesiecznie', okresy: [okres(START, { cykl: { co: 'tydzien', dni: [1, 3, 5] }, godzina: '15:00', cenaMiesiaca: 1560 })] })

    assert.equal(opisRodzaju(z), `Co tydzień: pn, śr, pt · 15:00 · 1${NBSP}560${NBSP}zł miesięcznie`)
  })

  it('dni idą od poniedziałku, a seria bez godziny nie ma jej w opisie', () => {
    assert.equal(opisRodzaju(seria([5, 2], { godzina: null })), `Co tydzień: wt, pt · 250${NBSP}zł za wizytę`)
  })

  it('co 2 tygodnie i co miesiąc', () => {
    const coDwa = seria([2], { cykl: { co: 'dwa_tygodnie', dni: [2] } })
    const coMiesiac = seria([], { cykl: { co: 'miesiac', dni: [] } })

    assert.equal(opisRodzaju(coDwa), `Co 2 tygodnie: wt · 9:00 · 250${NBSP}zł za wizytę`)
    assert.equal(opisRodzaju(coMiesiac), `Co miesiąc, 14. dnia · 9:00 · 250${NBSP}zł za wizytę`)
  })

  it('zlecenie jednorazowe ma termin i kwotę bez „za wizytę”', () => {
    assert.equal(opisRodzaju(zlecenie()), `Jednorazowe · pn 14 wrz, 9:00 · 250${NBSP}zł`)
  })

  it('przesunięte zlecenie jednorazowe ma nowy termin', () => {
    const z = zlecenie({ wizyty: { [START]: stanWizyty({ przeniesiona: { data: '2026-09-16', godzina: '11:30' } }) } })

    assert.equal(opisRodzaju(z), `Jednorazowe · śr 16 wrz, 11:30 · 250${NBSP}zł`)
  })
})

describe('okresyDoPokazania', () => {
  it('pomija pierwszy okres i opisuje kolejne od ich dnia', () => {
    const cykl = { co: /** @type {const} */ ('tydzien'), dni: [1] }
    const z = zlecenie({ okresy: [okres(START, { cykl, godzina: '15:00', cenaWizyty: 250 }), okres('2026-11-09', { cykl, godzina: '16:00', cenaWizyty: 280 })] })

    assert.deepEqual(okresyDoPokazania(z), [{ tytul: 'Od pn 9 lis', opis: `Co tydzień: pn · 16:00 · 280${NBSP}zł za wizytę` }])
  })

  it('seria jednookresowa nie ma czego pokazać', () => {
    assert.deepEqual(okresyDoPokazania(seria([1])), [])
  })

  it('okres od wizyty 28.02 w serii od 31.01 pokazuje dzień kotwicy, a nie 28.', () => {
    const cykl = { co: /** @type {const} */ ('miesiac'), dni: [] }
    const z = zlecenie({ start: '2027-01-31', okresy: [okres('2027-01-31', { cykl, cenaWizyty: 300 }), okres('2027-02-28', { cykl, cenaWizyty: 350 })] })

    assert.equal(opisRodzaju(z), `Co miesiąc, 31. dnia · 300${NBSP}zł za wizytę`)
    assert.deepEqual(okresyDoPokazania(z), [{ tytul: 'Od nd 28 lut', opis: `Co miesiąc, 31. dnia · 350${NBSP}zł za wizytę` }])
  })
})

describe('najblizszaOtwarta', () => {
  it('seria: dzisiejsza wizyta, a gdy jest zrobiona, następna', () => {
    const poWizycie = { ...seria([1]), wizyty: { [DZIS]: ZROBIONA } }

    assert.equal(najblizszaOtwarta(seria([1]), DZIS)?.dataPierwotna, DZIS)
    assert.equal(najblizszaOtwarta(poWizycie, DZIS)?.dataPierwotna, '2026-11-09')
  })

  it('seria pomija odwołaną wizytę', () => {
    const z = { ...seria([1]), wizyty: { [DZIS]: stanWizyty({ odwolana: true }) } }

    assert.equal(najblizszaOtwarta(z, DZIS)?.dataPierwotna, '2026-11-09')
  })

  it('seria po dniu końca nie ma wizyty', () => {
    assert.equal(najblizszaOtwarta({ ...seria([1]), koniec: '2026-10-26' }, DZIS), null)
  })

  it('zlecenie jednorazowe po terminie zostaje otwarte, dopóki nie jest zrobione ani odwołane', () => {
    assert.equal(najblizszaOtwarta(zlecenie(), DZIS)?.dataPierwotna, START)
    assert.equal(najblizszaOtwarta(zlecenie({ wizyty: { [START]: ZROBIONA } }), DZIS), null)
    assert.equal(najblizszaOtwarta(zlecenie({ wizyty: { [START]: stanWizyty({ odwolana: true }) } }), DZIS), null)
  })
})

describe('domyslnyKoniec', () => {
  it('ostatnia zrobiona wizyta, bez odwołanych', () => {
    const z = { ...seria([1]), wizyty: { '2026-09-21': ZROBIONA, '2026-10-05': ZROBIONA, '2026-10-12': stanWizyty({ zrobiona: CHWILA, odwolana: true }) } }

    assert.equal(domyslnyKoniec(z, DZIS), '2026-10-05')
  })

  it('bez zrobionych wizyt dziś, a seria z przyszłym startem dzień startu', () => {
    assert.equal(domyslnyKoniec(seria([1]), DZIS), DZIS)
    assert.equal(domyslnyKoniec(seria([1]), '2026-09-01'), START)
  })
})

describe('miesiaceDoZaplaty', () => {
  const zaplata = { forma: /** @type {const} */ ('przelew'), data: '2026-10-05', kwota: 1000 }

  it('od pierwszego miesiąca z wizytą do bieżącego, najnowszy pierwszy; październik bez zapłaty jest niezapłacony, listopad nie', () => {
    const z = miesieczna({ wizyty: { '2026-10-05': ZROBIONA, '2026-11-02': ZROBIONA } })

    assert.deepEqual(miesiaceDoZaplaty(z, DZIS).map((m) => [m.miesiac, m.nazwa, m.kwota, m.czyNiezaplacony]), [
      ['2026-11', 'Listopad 2026', `1${NBSP}200${NBSP}zł`, false],
      ['2026-10', 'Październik 2026', `1${NBSP}200${NBSP}zł`, true],
      ['2026-09', 'Wrzesień 2026', `1${NBSP}200${NBSP}zł`, false],
    ])
  })

  it('zapłacony miesiąc ma tekst zapłaty i zapisaną kwotę, nie kwotę okresu', () => {
    const z = miesieczna({ wizyty: { '2026-09-14': ZROBIONA }, zaplatyMiesieczne: { '2026-09': zaplata } })

    const wrzesien = miesiaceDoZaplaty(z, DZIS).at(-1)

    assert.deepEqual(wrzesien, { miesiac: '2026-09', nazwa: 'Wrzesień 2026', kwota: `1${NBSP}000${NBSP}zł`, zaplata: 'Zapłacone · Przelew · pn 5 paź',
      czyNiezaplacony: false })
  })

  it('zapłata bez formy to samo „Zapłacone”', () => {
    const z = miesieczna({ zaplatyMiesieczne: { '2026-09': { ...zaplata, forma: null } } })

    assert.equal(miesiaceDoZaplaty(z, DZIS).at(-1)?.zaplata, 'Zapłacone')
  })

  it('miesiąc bez zrobionej wizyty nie jest niezapłacony, tak jak w regule „Niezapłacone”', () => {
    assert.deepEqual(miesiaceDoZaplaty(miesieczna(), DZIS).map((m) => m.czyNiezaplacony), [false, false, false])
  })

  it('miesiące po końcu serii odpadają, a zrobiona wizyta po końcu zostawia swój miesiąc', () => {
    const koniec = '2026-09-28'
    const zWizyta = miesieczna({ koniec, wizyty: { '2026-10-05': ZROBIONA } })

    assert.deepEqual(miesiaceDoZaplaty(miesieczna({ koniec }), DZIS).map((m) => m.miesiac), ['2026-09'])
    assert.deepEqual(miesiaceDoZaplaty(zWizyta, DZIS).map((m) => m.miesiac), ['2026-10', '2026-09'])
  })

  it('miesiąc startu bez wizyty odpada: seria od 30.09 w poniedziałki ma pierwszą wizytę w październiku', () => {
    const start = '2026-09-30'
    const z = miesieczna({ start, okresy: [okres(start, { cykl: { co: 'tydzien', dni: [1] }, cenaMiesiaca: 1200 })] })

    assert.deepEqual(miesiaceDoZaplaty(z, DZIS).map((m) => m.miesiac), ['2026-11', '2026-10'])
  })

  it('rok się przełamuje, a seria przed startem i zlecenie za wizytę nie mają miesięcy', () => {
    assert.deepEqual(miesiaceDoZaplaty(miesieczna(), '2027-01-15').map((m) => m.miesiac), ['2027-01', '2026-12', '2026-11', '2026-10', '2026-09'])
    assert.deepEqual(miesiaceDoZaplaty(miesieczna(), '2026-08-31'), [])
    assert.deepEqual(miesiaceDoZaplaty(seria([1]), DZIS), [])
  })
})

describe('wizytaZAdresu', () => {
  it('oddaje dzień wizyty z reguły i z zapisanego stanu', () => {
    const z = { ...seria([1]), koniec: '2026-10-05', wizyty: { '2026-10-12': ZROBIONA } }

    assert.equal(wizytaZAdresu(z, '2026-09-21'), '2026-09-21')
    assert.equal(wizytaZAdresu(z, '2026-10-12'), '2026-10-12')
  })

  it('dzień bez wizyty, zły tekst i brak parametru dają null', () => {
    assert.equal(wizytaZAdresu(seria([1]), '2026-09-22'), null)
    assert.equal(wizytaZAdresu(seria([1]), 'wczoraj'), null)
    assert.equal(wizytaZAdresu(seria([1]), null), null)
  })
})

describe('wartosciZmiany', () => {
  it('bierze cenę, godzinę i cykl z okresu wizyty', () => {
    const cykl = { co: /** @type {const} */ ('tydzien'), dni: [1, 4] }
    const z = zlecenie({ okresy: [okres(START, { cykl, godzina: '09:00', cenaWizyty: 250 }), okres('2026-10-05', { cykl, godzina: '16:00', cenaWizyty: 280.5 })] })

    assert.deepEqual(wartosciZmiany(z, '2026-09-21'), { cena: '250', godzina: '09:00', cykl: 'tydzien', dni: [1, 4] })
    assert.deepEqual(wartosciZmiany(z, '2026-10-12'), { cena: '280,5', godzina: '16:00', cykl: 'tydzien', dni: [1, 4] })
  })

  it('cykl co miesiąc podpowiada dzień tygodnia wizyty, a zlecenie jednorazowe nie ma cyklu', () => {
    const z = seria([], { cykl: { co: 'miesiac', dni: [] }, godzina: null })

    assert.deepEqual(wartosciZmiany(z, START), { cena: '250', godzina: '', cykl: 'miesiac', dni: [1] })
    assert.equal(wartosciZmiany(zlecenie(), START).cykl, null)
  })
})

describe('przelaczDzien', () => {
  it('włącza dzień z zachowaniem kolejności i wyłącza włączony', () => {
    assert.deepEqual(przelaczDzien([1, 4], 2), [1, 2, 4])
    assert.deepEqual(przelaczDzien([1, 4], 4), [1])
  })
})

describe('bledyZmiany', () => {
  const poprawne = { cena: '250', godzina: '09:00', cykl: /** @type {const} */ ('tydzien'), dni: [1] }

  it('poprawne wartości nie mają błędów, a cena może być zerem', () => {
    assert.deepEqual(bledyZmiany(poprawne), {})
    assert.deepEqual(bledyZmiany({ ...poprawne, cena: '0' }), {})
  })

  it('zła cena i brak dni w cyklu tygodniowym to błędy pól', () => {
    assert.deepEqual(bledyZmiany({ ...poprawne, cena: 'dużo', dni: [] }), { cena: 'Wpisz cenę.', dni: 'Wybierz dni tygodnia.' })
  })

  it('cykl co miesiąc i zlecenie jednorazowe nie wymagają dni', () => {
    assert.deepEqual(bledyZmiany({ ...poprawne, cykl: 'miesiac', dni: [] }), {})
    assert.deepEqual(bledyZmiany({ ...poprawne, cykl: null, dni: [] }), {})
  })
})

describe('zmianaDoZapisu', () => {
  it('bez zmian daje pusty obiekt', () => {
    const z = seria([1, 4])

    assert.deepEqual(zmianaDoZapisu(z, START, wartosciZmiany(z, START)), {})
  })

  it('niesie tylko zmienione pola', () => {
    const z = seria([1, 4])
    const przed = wartosciZmiany(z, START)

    assert.deepEqual(zmianaDoZapisu(z, START, { ...przed, godzina: '16:00' }), { godzina: '16:00' })
    assert.deepEqual(zmianaDoZapisu(z, START, { ...przed, cena: '280' }), { cenaWizyty: 280 })
    assert.deepEqual(zmianaDoZapisu(z, START, { ...przed, dni: [2, 4] }), { cykl: { co: 'tydzien', dni: [2, 4] } })
  })

  it('pusta godzina usuwa godzinę, a ta sama cena w innym zapisie nie jest zmianą', () => {
    const z = seria([1])

    assert.deepEqual(zmianaDoZapisu(z, START, { ...wartosciZmiany(z, START), godzina: '', cena: '250,00' }), { godzina: null })
  })

  it('seria miesięczna zmienia kwotę za miesiąc', () => {
    const z = miesieczna()

    assert.deepEqual(zmianaDoZapisu(z, START, { ...wartosciZmiany(z, START), cena: '1300' }), { cenaMiesiaca: 1300 })
  })

  it('zmiana na co miesiąc zapisuje cykl bez dni', () => {
    const z = seria([1, 4])

    assert.deepEqual(zmianaDoZapisu(z, START, { ...wartosciZmiany(z, START), cykl: 'miesiac' }), { cykl: { co: 'miesiac', dni: [] } })
  })

  it('zlecenie jednorazowe nigdy nie dostaje cyklu', () => {
    const z = zlecenie()

    assert.deepEqual(zmianaDoZapisu(z, START, { ...wartosciZmiany(z, START), godzina: '10:00' }), { godzina: '10:00' })
  })

  it('formularz z błędem daje BladZlecenia', () => {
    const z = seria([1])

    assert.throws(() => zmianaDoZapisu(z, START, { ...wartosciZmiany(z, START), cena: 'dużo' }), (blad) => blad instanceof BladZlecenia && blad.kod === 'dane')
  })

  it('sama zmiana godziny zostawia cenę i cykl późniejszego okresu', () => {
    const magazyn = magazynZSeria()
    zmienOdWizyty(magazyn, 'z1', '2026-11-09', { cenaWizyty: 300, cykl: { co: 'tydzien', dni: [1, 4] } })
    const z = zapisane(magazyn)

    zmienOdWizyty(magazyn, 'z1', DZIS, zmianaDoZapisu(z, DZIS, { ...wartosciZmiany(z, DZIS), godzina: '16:00' }))

    assert.deepEqual(zapisane(magazyn).okresy.map((o) => [o.od, o.godzina, o.cenaWizyty, o.cykl?.dni]), [
      [START, '09:00', 250, [1]],
      [DZIS, '16:00', 250, [1]],
      ['2026-11-09', '16:00', 300, [1, 4]],
    ])
  })
})

describe('modelKarty', () => {
  const STAN = { klienci: [KLIENT], wyceny: [], zlecenia: [seria([1])] }

  it('nieznane zlecenie albo klient dają null', () => {
    assert.equal(modelKarty(STAN, KATALOG, 'obce', DZIS), null)
    assert.equal(modelKarty({ ...STAN, klienci: [] }, KATALOG, 'z1', DZIS), null)
  })

  it('seria: nazwa, klient, rodzaj, najbliższa wizyta i adresy', () => {
    const m = modelKarty(STAN, KATALOG, 'z1', DZIS)

    assert.equal(m?.tytul, 'Mieszkanie lub dom')
    assert.deepEqual(m?.klient, { nazwa: 'Anna Kowalska', adres: '#/klienci/k1' })
    assert.equal(m?.rodzaj, `Co tydzień: pn · 9:00 · 250${NBSP}zł za wizytę`)
    assert.deepEqual(m?.wizyta, { tytul: 'Najbliższa wizyta', opis: 'dziś 9:00', adres: `#/zlecenie/z1/wizyta/${DZIS}` })
    assert.equal(m?.zmianaOd, DZIS)
    assert.equal(m?.czySeria, true)
    assert.equal(m?.koniec, null)
  })

  it('zakończona seria nie ma wizyty ani zmiany i pokazuje dzień końca', () => {
    const m = modelKarty({ ...STAN, zlecenia: [{ ...seria([1]), koniec: '2026-10-26' }] }, KATALOG, 'z1', DZIS)

    assert.equal(m?.koniec, 'Zakończona pn 26 paź')
    assert.equal(m?.wizyta, null)
    assert.equal(m?.zmianaOd, null)
  })

  it('wizyta z zapisanym stanem po dniu końca zostaje widoczna', () => {
    const magazyn = magazynZSeria()
    magazyn.zmien((stan) => ({ ...stan, zlecenia: stan.zlecenia.map((z) => ({ ...z,
      wizyty: { '2026-11-09': stanWizyty({ przeniesiona: { data: '2026-11-10', godzina: null } }) } })) }))
    zakonczSerie(magazyn, 'z1', DZIS)

    const m = modelKarty(wczytajStan(magazyn), KATALOG, 'z1', '2026-11-03')

    assert.equal(m?.koniec, 'Zakończona pn 2 lis')
    assert.deepEqual(m?.wizyta, { tytul: 'Najbliższa wizyta', opis: 'wt 10 lis, 9:00', adres: '#/zlecenie/z1/wizyta/2026-11-09' })
  })

  it('zamknięte zlecenie jednorazowe prowadzi do swojej wizyty i zostaje do zmiany ceny', () => {
    const m = modelKarty({ ...STAN, zlecenia: [zlecenie({ wizyty: { [START]: ZROBIONA } })] }, KATALOG, 'z1', DZIS)

    assert.deepEqual(m?.wizyta, { tytul: 'Wizyta', opis: 'pn 14 wrz, 9:00', adres: `#/zlecenie/z1/wizyta/${START}` })
    assert.equal(m?.zmianaOd, START)
    assert.equal(m?.czySeria, false)
  })

  it('czyMaZaplaty widzi zapłatę wizyty i zapłatę za miesiąc', () => {
    const zaplata = { forma: /** @type {const} */ ('gotowka'), data: START, kwota: 250 }
    const zZaplataWizyty = zlecenie({ wizyty: { [START]: stanWizyty({ zaplata }) } })
    const zZaplataMiesiaca = miesieczna({ zaplatyMiesieczne: { '2026-09': zaplata } })

    assert.equal(modelKarty(STAN, KATALOG, 'z1', DZIS)?.czyMaZaplaty, false)
    assert.equal(modelKarty({ ...STAN, zlecenia: [zZaplataWizyty] }, KATALOG, 'z1', DZIS)?.czyMaZaplaty, true)
    assert.equal(modelKarty({ ...STAN, zlecenia: [zZaplataMiesiaca] }, KATALOG, 'z1', DZIS)?.czyMaZaplaty, true)
  })

  it('forma w chipach zapłaty to ostatnia forma klienta', () => {
    const zaplata = { forma: /** @type {const} */ ('blik'), data: START, kwota: 1200 }
    const z = miesieczna({ zaplatyMiesieczne: { '2026-09': zaplata } })

    assert.equal(modelKarty({ ...STAN, zlecenia: [z] }, KATALOG, 'z1', DZIS)?.forma, 'blik')
  })

  it('wycena prowadzi do siebie z numerem', () => {
    const w = /** @type {import('../dane/wyceny.js').Wycena} */ (/** @type {unknown} */ ({ id: 'w1', numer: '3/10/2026' }))
    const m = modelKarty({ ...STAN, wyceny: [w], zlecenia: [{ ...seria([1]), wycenaId: 'w1' }] }, KATALOG, 'z1', DZIS)

    assert.deepEqual(m?.wycena, { tekst: 'Wycena 3/10/2026', adres: '#/wycena/w1' })
  })
})
