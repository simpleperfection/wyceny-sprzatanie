import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn, wczytajStan, zaktualizujStan } from '../dane/magazyn.js'
import { oznaczZaplacona, oznaczZrobiona, przesunWizyte } from '../dane/wizyty.js'
import { BladKalendarza } from '../kalendarz/daty.js'
import { adresKalendarza, dzienKalendarza, jestWidokiemKalendarza, modelDnia, modelMiesiaca, modelTygodnia, sasiedni,
  WIDOKI_KALENDARZA } from './kalendarz-dane.js'

/** Poniedzialek; stan moduly-dzis liczy daty wzgledem tego dnia (seria biura w poniedzialki od 2026-10-19). */
const DZIS = '2026-11-02'
const SKRYPT_STANU = new URL('../../e2e/stany/moduly-dzis.js', import.meta.url)
const KATALOG = { uslugi: [{ id: 'mieszkanie_standard', nazwa: 'Sprzątanie mieszkania' }, { id: 'sprzatanie_biur', nazwa: 'Sprzątanie biura' },
  { id: 'okna', nazwa: 'Mycie okien' }] }
const NBSP = ' '
const BIURO = 'e2e-zlecenie-biuro'

/**
 * Stan ze skryptu e2e/stany/moduly-dzis.js uruchomionego jak `agent-browser eval`: atrapa localStorage i zegar przegladarki
 * o 10:00 czasu lokalnego dnia DZIS.
 * @returns {Promise<any>}
 */
async function stanModulowDzis() {
  const kod = await readFile(SKRYPT_STANU, 'utf8')
  const teraz = new Date(`${DZIS}T10:00:00`)
  class Zegar extends Date {
    /** @param {[]} argumenty */
    constructor(...argumenty) {
      if (argumenty.length === 0) super(teraz.getTime())
      else super(...argumenty)
    }
    static now() {
      return teraz.getTime()
    }
  }
  const localStorage = new PamiecMagazynu()
  runInNewContext(kod, { localStorage, Date: Zegar })
  const wynik = zaktualizujStan(JSON.parse(localStorage.getItem(KLUCZ_MAGAZYNU) ?? 'null'))
  assert.ok('stan' in wynik, 'stan ze skryptu nie przechodzi straznika magazynu')
  return wynik.stan
}

/** Magazyn w pamieci ze stanem moduly-dzis: zapisy ida tak samo jak z przyciskow widoku Dzień. */
async function magazynModulowDzis() {
  const storage = new PamiecMagazynu()
  storage.setItem(KLUCZ_MAGAZYNU, JSON.stringify(await stanModulowDzis()))
  return utworzMagazyn(storage)
}

/** Wizyta biura `dzien` odwolana. @param {any} stan @param {string} dzien */
function odwolajBiuro(stan, dzien) {
  const nowy = structuredClone(stan)
  nowy.zlecenia.find((/** @type {any} */ z) => z.id === BIURO).wizyty[dzien] = { przeniesiona: null, odwolana: true, zrobiona: null,
    zaplata: null, minutyPracy: null }
  return nowy
}

/** @param {{ tytul: string, miejsce: string | null, kwota: string, akcje: string[] }[]} wiersze */
const opis = (wiersze) => wiersze.map(({ tytul, miejsce, kwota, akcje }) => ({ tytul, miejsce, kwota, akcje }))

/** @param {string} kod */
const bladKalendarza = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladKalendarza && blad.kod === kod

describe('modelDnia', () => {
  it('dziś na stanie moduly-dzis: „Do zamknięcia” z Biurem (tylko Zrobione) i Janem (tylko Zapłacone), dzień z Anną i Biurem', async () => {
    const stan = await stanModulowDzis()

    const model = modelDnia(stan, KATALOG, DZIS, DZIS)

    assert.equal(model.tytul, 'pn 2 lis')
    assert.deepEqual(opis(model.doZamkniecia), [
      { tytul: 'Biuro Rachunkowe Lis', miejsce: 'pn 26 paź, 15:00', kwota: 'w abonamencie', akcje: ['zrobione'] },
      { tytul: 'Jan Nowak', miejsce: 'nd 1 lis, 10:00', kwota: `180${NBSP}zł`, akcje: ['zaplacone'] },
    ])
    assert.deepEqual(opis(model.wizyty), [
      { tytul: '9:00 · Anna Kowalska', miejsce: 'ul. Lipowa 3, Warszawa', kwota: `250${NBSP}zł`, akcje: ['zrobione', 'zaplacone'] },
      { tytul: '15:00 · Biuro Rachunkowe Lis', miejsce: 'ul. Prosta 10, Warszawa', kwota: 'w abonamencie', akcje: ['zrobione'] },
    ])
    assert.equal(model.wizyty[1].adres, `#/zlecenie/${BIURO}/wizyta/2026-11-02`)
    assert.equal(model.doZamkniecia[1].czyZrobiona, true)
  })

  it('dzień inny niż dziś nie ma „Do zamknięcia”; wczoraj ma przyciski, a wizyta za tydzień — nie', async () => {
    const stan = await stanModulowDzis()

    const wczoraj = modelDnia(stan, KATALOG, '2026-11-01', DZIS)
    const zaTydzien = modelDnia(stan, KATALOG, '2026-11-09', DZIS)

    assert.deepEqual(wczoraj.doZamkniecia, [])
    assert.deepEqual(opis(wczoraj.wizyty), [{ tytul: '10:00 · Jan Nowak', miejsce: null, kwota: `180${NBSP}zł`, akcje: ['zaplacone'] }])
    assert.deepEqual(zaTydzien.doZamkniecia, [])
    assert.deepEqual(opis(zaTydzien.wizyty),
      [{ tytul: '15:00 · Biuro Rachunkowe Lis', miejsce: 'ul. Prosta 10, Warszawa', kwota: 'w abonamencie', akcje: [] }])
  })

  it('odwołana wizyta dnia zostaje na liście bez przycisków, a wizyta bez godziny ma „Bez godziny”', async () => {
    const stan = odwolajBiuro(await stanModulowDzis(), DZIS)
    const anna = stan.zlecenia.find((/** @type {any} */ z) => z.id === 'e2e-zlecenie-anna')
    anna.okresy[0].godzina = null

    const model = modelDnia(stan, KATALOG, DZIS, DZIS)

    assert.deepEqual(model.wizyty.map((w) => [w.tytul, w.czyOdwolana, w.akcje]),
      [['15:00 · Biuro Rachunkowe Lis', true, []], ['Bez godziny · Anna Kowalska', false, ['zrobione', 'zaplacone']]])
  })

  it('wizyta jutrzejsza nie ma przycisków, a wizyta za 0 zł ma tylko „Zrobione”', async () => {
    const stan = await stanModulowDzis()
    stan.zlecenia.find((/** @type {any} */ z) => z.id === 'e2e-zlecenie-anna').okresy[0].cenaWizyty = 0

    const jutro = modelDnia(stan, KATALOG, '2026-11-09', '2026-11-08')
    const dzis = modelDnia(stan, KATALOG, DZIS, DZIS)

    assert.deepEqual(jutro.wizyty.map((w) => w.akcje), [[]])
    assert.deepEqual(opis(dzis.wizyty)[0], { tytul: '9:00 · Anna Kowalska', miejsce: 'ul. Lipowa 3, Warszawa', kwota: `0${NBSP}zł`, akcje: ['zrobione'] })
  })

  it('„Zrobione” Biura i „Zapłacone” Jana zamykają „Do zamknięcia” (R15), a zapłata ma formę domyślną klienta', async () => {
    const magazyn = await magazynModulowDzis()
    const [biuro, jan] = modelDnia(wczytajStan(magazyn), KATALOG, DZIS, DZIS).doZamkniecia

    oznaczZrobiona(magazyn, biuro.zlecenieId, biuro.dataPierwotna)
    const poZrobione = modelDnia(wczytajStan(magazyn), KATALOG, DZIS, DZIS)
    oznaczZaplacona(magazyn, jan.zlecenieId, jan.dataPierwotna)
    const stan = wczytajStan(magazyn)

    assert.deepEqual(poZrobione.doZamkniecia.map((w) => w.tytul), ['Jan Nowak'])
    assert.deepEqual(modelDnia(stan, KATALOG, DZIS, DZIS).doZamkniecia, [])
    assert.equal(stan.zlecenia.find((z) => z.id === jan.zlecenieId)?.wizyty[jan.dataPierwotna].zaplata?.forma, 'gotowka')
  })

  it('niezrobiona wizyta za wizytę po „Zrobione” zostaje w „Do zamknięcia” z samym „Zapłacone”', async () => {
    const magazyn = await magazynModulowDzis()
    const JUTRO = '2026-11-03'
    const anna = modelDnia(wczytajStan(magazyn), KATALOG, JUTRO, JUTRO).doZamkniecia.find((w) => w.tytul === 'Anna Kowalska')
    assert.deepEqual(anna?.akcje, ['zrobione', 'zaplacone'])

    oznaczZrobiona(magazyn, 'e2e-zlecenie-anna', DZIS)

    const poZrobione = modelDnia(wczytajStan(magazyn), KATALOG, JUTRO, JUTRO).doZamkniecia.find((w) => w.tytul === 'Anna Kowalska')
    assert.deepEqual([poZrobione?.akcje, poZrobione?.czyZrobiona], [['zaplacone'], true])
  })

  it('wizyta przesunięta jest w nowym dniu z flagą przesunięcia, a w dniu pierwotnym jej nie ma', async () => {
    const magazyn = await magazynModulowDzis()

    przesunWizyte(magazyn, 'e2e-zlecenie-biuro', DZIS, { data: '2026-11-03', godzina: '11:00' })

    const stan = wczytajStan(magazyn)
    assert.deepEqual(modelDnia(stan, KATALOG, '2026-11-03', DZIS).wizyty.map((w) => [w.tytul, w.czyPrzesunieta]),
      [['11:00 · Biuro Rachunkowe Lis', true]])
    assert.deepEqual(modelDnia(stan, KATALOG, DZIS, DZIS).wizyty.map((w) => [w.tytul, w.czyPrzesunieta]), [['9:00 · Anna Kowalska', false]])
  })

  it('zły dzień daje BladKalendarza `dzien`', async () => {
    const stan = await stanModulowDzis()

    assert.throws(() => modelDnia(stan, KATALOG, '2026-02-30', DZIS), bladKalendarza('dzien'))
    assert.throws(() => modelDnia(stan, KATALOG, DZIS, 'dziś'), bladKalendarza('dzien'))
  })
})

describe('modelTygodnia', () => {
  it('7 dni od poniedziałku z liczbą wizyt, wiersze bez przycisków zamknięcia', async () => {
    const stan = await stanModulowDzis()

    const model = modelTygodnia(stan, KATALOG, '2026-11-04', DZIS)

    assert.equal(model.tytul, '2–8 lis')
    assert.deepEqual(model.dni.map((d) => [d.naglowek, d.czyDzis, d.opisLiczby]), [
      ['pn 2 lis', true, '2 wizyty'], ['wt 3 lis', false, null], ['śr 4 lis', false, null], ['czw 5 lis', false, null],
      ['pt 6 lis', false, null], ['sb 7 lis', false, null], ['nd 8 lis', false, null],
    ])
    assert.deepEqual(model.dni[0].wizyty.map((w) => [w.tytul, w.akcje]),
      [['9:00 · Anna Kowalska', []], ['15:00 · Biuro Rachunkowe Lis', []]])
  })

  it('odwołana wizyta nie wlicza się do liczby dnia; zły dzień daje BladKalendarza', async () => {
    const stan = odwolajBiuro(await stanModulowDzis(), DZIS)

    const model = modelTygodnia(stan, KATALOG, DZIS, DZIS)

    assert.deepEqual([model.dni[0].liczba, model.dni[0].opisLiczby, model.dni[0].wizyty.length], [1, '1 wizyta', 2])
    assert.throws(() => modelTygodnia(stan, KATALOG, '2026-13-01', DZIS), bladKalendarza('dzien'))
  })
})

describe('modelMiesiaca', () => {
  it('listopad 2026: wizyty serii co tydzień w każdym tygodniu, bez odwołanych, dziś wyróżniony', async () => {
    const stan = odwolajBiuro(await stanModulowDzis(), '2026-11-16')

    const model = modelMiesiaca(stan, 2026, 11, DZIS)
    const komorki = model.tygodnie.flat()
    const zWizytami = Object.fromEntries(komorki.flatMap((k) => (k !== null && k.liczba > 0 ? [[k.dzien, k.liczba]] : [])))

    assert.equal(model.tytul, 'Listopad 2026')
    assert.equal(model.tygodnie.length, 6)
    assert.deepEqual(model.tygodnie[0].map((k) => k?.numer ?? null), [null, null, null, null, null, null, 1])
    assert.deepEqual(zWizytami, { '2026-11-01': 1, '2026-11-02': 2, '2026-11-09': 1, '2026-11-23': 1, '2026-11-30': 1 })
    assert.deepEqual(komorki.filter((k) => k?.czyDzis).map((k) => k?.dzien), [DZIS])
    assert.equal(model.tygodnie[1][0]?.adres, '#/zlecenia/dzien?data=2026-11-02')
    assert.equal(model.tygodnie[1][0]?.etykieta, 'Poniedziałek, 2 listopada, 2 wizyty')
  })

  it('zły miesiąc daje BladKalendarza `miesiac`', async () => {
    const stan = await stanModulowDzis()

    assert.throws(() => modelMiesiaca(stan, 2026, 13, DZIS), bladKalendarza('miesiac'))
  })
})

describe('nawigacja kalendarza', () => {
  it('sasiedni: dzień, tydzień i miesiąc z przycięciem do krótszego miesiąca', () => {
    assert.equal(sasiedni('dzien', '2026-10-31', 1), '2026-11-01')
    assert.equal(sasiedni('tydzien', '2026-11-02', -1), '2026-10-26')
    assert.equal(sasiedni('miesiac', '2027-01-31', 1), '2027-02-28')
    assert.equal(sasiedni('miesiac', '2027-01-15', -1), '2026-12-15')
  })

  it('sasiedni odrzuca nieznany widok i kierunek', () => {
    assert.throws(() => sasiedni(/** @type {any} */ ('rok'), DZIS, 1), bladKalendarza('widok'))
    assert.throws(() => sasiedni('dzien', DZIS, /** @type {any} */ (2)), bladKalendarza('kierunek'))
  })

  it('dzień z zapytania, widoki i adres kalendarza', () => {
    assert.equal(dzienKalendarza({ data: '2026-11-09' }, DZIS), '2026-11-09')
    assert.equal(dzienKalendarza({ data: '2026-02-30' }, DZIS), DZIS)
    assert.equal(dzienKalendarza({}, DZIS), DZIS)
    assert.deepEqual(WIDOKI_KALENDARZA.map((w) => w.etykieta), ['Dzień', 'Tydzień', 'Miesiąc'])
    assert.equal(jestWidokiemKalendarza('tydzien'), true)
    assert.equal(jestWidokiemKalendarza('rok'), false)
    assert.equal(adresKalendarza('miesiac', null), '#/zlecenia/miesiac')
    assert.equal(adresKalendarza('tydzien', '2026-11-02'), '#/zlecenia/tydzien?data=2026-11-02')
  })
})
