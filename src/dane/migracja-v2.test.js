import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { before, describe, it } from 'node:test'

import { katalogTestowy } from '../../tests/pomocnicze.js'
import { tempoWlasne } from '../silnik/tempo.js'
import { daneTempa } from '../zlecenia/dane-tempa.js'
import { historiaPlanuIFaktu } from '../zlecenia/plan-fakt.js'
import { zaktualizujStan } from './magazyn.js'
import { zV1DoV2 } from './migracja-v2.js'
import { jestWycena } from './wyceny.js'
import { doZaplanowania, zlecenie } from './zlecenia.js'

/** @typedef {import('./magazyn.js').Stan} Stan */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */

const FIXTURE = new URL('../../tests/fixtures/stan-v1-pelny.json', import.meta.url)

/**
 * Charakteryzacja przed usunieciem wykonan (IU-6): tempoWlasne(stan.wyceny, usluga) i lista „plan a fakt” policzone kodem
 * wersji 1 na tests/fixtures/stan-v1-pelny.json (wycena z wykonaniami miala ksztalt WycenaTempa silnika tempa).
 */
const TEMPO_PRZED = Object.freeze({
  mieszkanie_standard: { wartosc: 1.2083333333333335, liczba: 4, zakres: 'wspolne' },
  sprzatanie_biur: { wartosc: 1.1666666666666667, liczba: 3, zakres: 'usluga' },
})
/** [dzien, usluga, plan, fakt, procent] od najnowszego wpisu. */
const PLAN_I_FAKT_PRZED = Object.freeze([
  ['2026-10-21', 'sprzatanie_biur', 144, 140, -0.027777777777777776],
  ['2026-10-14', 'sprzatanie_biur', 150, 130, -0.13333333333333333],
  ['2026-10-07', 'sprzatanie_biur', 156, 150, -0.038461538461538464],
  ['2026-10-05', 'mieszkanie_standard', 234, 240, 0.02564102564102564],
])

/** @returns {Promise<Record<string, any>>} stan wersji 1 z fixture (nowy obiekt przy kazdym wywolaniu) */
const stanV1 = async () => JSON.parse(await readFile(FIXTURE, 'utf8'))

/** @param {unknown} dane @returns {Stan} stan wersji 2 po aktualizacji; uszkodzony wynik oblewa test */
function poMigracji(dane) {
  const wynik = zaktualizujStan(dane)
  assert.ok('stan' in wynik, `migracja dała ${JSON.stringify(wynik)}`)
  return wynik.stan
}

/** @param {Record<string, any>} v1 @param {string} id @param {object} zmiana @returns {Record<string, any>} v1 ze zmieniona wycena */
const zWycena = (v1, id, zmiana) => ({ ...v1, wyceny: v1.wyceny.map((/** @type {any} */ w) => (w.id === id ? { ...w, ...zmiana } : w)) })

describe('zV1DoV2 na tests/fixtures/stan-v1-pelny.json', () => {
  it('jeden klient Anna z adresem z nowszej wyceny, bez klienta „test” i bez klienta szybkiej wyceny', async () => {
    const stan = poMigracji(await stanV1())

    assert.deepEqual(stan.klienci.map((k) => [k.id, k.nazwa, k.adres]), [
      ['k-w-wykonana', 'Anna Kowalska', 'ul. Polna 7, Warszawa'],
      ['k-w-abonament', 'Biuro Rachunkowe Bilans', 'ul. Długa 1, Warszawa'],
      ['k-w-sobota', 'Jan Nowak', null],
    ])
    assert.deepEqual(stan.klienci[0], { id: 'k-w-wykonana', nazwa: 'Anna Kowalska', telefon: null, adres: 'ul. Polna 7, Warszawa',
      notatki: null, utworzony: '2026-10-01T08:00:00.000Z', zmieniony: '2026-10-12T08:00:00.000Z' })
    assert.deepEqual(stan.wyceny.map((w) => [w.id, w.klientId]), [['w-wykonana', 'k-w-wykonana'], ['w-abonament', 'k-w-abonament'],
      ['w-termin', 'k-w-wykonana'], ['w-sobota', 'k-w-sobota'], ['w-szkic', null], ['w-szybka', null]])
  })

  it('cztery zlecenia z wykonań, jedno na 2026-11-14 9:00, a przyjęta z „sobota rano” i abonament są do zaplanowania', async () => {
    const stan = poMigracji(await stanV1())

    assert.deepEqual(stan.zlecenia.map((z) => [z.id, z.wycenaId, z.start, z.okresy[0].godzina, z.okresy[0].cenaWizyty]), [
      ['z-w-wykonana-e-1', 'w-wykonana', '2026-10-05', '10:00', 280],
      ['z-w-abonament-e-2', 'w-abonament', '2026-10-07', null, 200],
      ['z-w-abonament-e-3', 'w-abonament', '2026-10-14', null, 200],
      ['z-w-abonament-e-4', 'w-abonament', '2026-10-21', null, 200],
      ['z-w-termin', 'w-termin', '2026-11-14', '09:00', 300],
    ])
    assert.deepEqual(zlecenie(stan, 'z-w-termin'), { id: 'z-w-termin', klientId: 'k-w-wykonana', wycenaId: 'w-termin',
      uslugaId: 'mieszkanie_standard', opis: null, rozliczenie: 'za_wizyte', start: '2026-11-14',
      okresy: [{ od: '2026-11-14', cykl: null, godzina: '09:00', cenaWizyty: 300, cenaMiesiaca: null }], koniec: null, plan: null,
      wizyty: {}, zaplatyMiesieczne: {}, utworzone: '2026-10-12T08:00:00.000Z', zmienione: '2026-10-12T08:00:00.000Z' })
    assert.deepEqual(stan.wyceny.filter((w) => doZaplanowania(stan, w)).map((w) => w.id), ['w-abonament', 'w-sobota'])
  })

  it('wykonana staje się przyjętą, wyceny tracą wykonania, a zmieniona i reszta pól zostają', async () => {
    const v1 = await stanV1()

    const stan = poMigracji(v1)

    assert.deepEqual(stan.wyceny.map((w) => w.status), ['przyjeta', 'przyjeta', 'przyjeta', 'przyjeta', 'szkic', 'do_wyslania'])
    assert.equal(stan.wyceny.some((w) => Object.hasOwn(w, 'wykonania')), false)
    const { wykonania: _wykonania, ...bezWykonan } = v1.wyceny[1]
    assert.deepEqual(stan.wyceny[1], { ...bezWykonan, klientId: 'k-w-abonament' })
    assert.deepEqual([stan.licznikNumerow, stan.kopia, stan.ustawienia], [v1.licznikNumerow, v1.kopia, v1.ustawienia])
  })

  it('wizyty z migracji są zrobione w dniu wykonania i zapłacone z formą null i kwotą wyceny (cena ręczna wygrywa)', async () => {
    const stan = poMigracji(await stanV1())

    assert.deepEqual(zlecenie(stan, 'z-w-wykonana-e-1')?.wizyty, { '2026-10-05': { przeniesiona: null, odwolana: false,
      zrobiona: '2026-10-05T00:00:00.000Z', zaplata: { forma: null, data: '2026-10-05', kwota: 280 }, minutyPracy: 240 } })
    assert.deepEqual(zlecenie(stan, 'z-w-abonament-e-3')?.wizyty['2026-10-14']?.zaplata, { forma: null, data: '2026-10-14', kwota: 200 })
    assert.deepEqual(zlecenie(stan, 'z-w-abonament-e-3')?.plan, { minutyNormowe: 120, tempo: 1.25 })
  })
})

describe('zV1DoV2: tempo i „plan a fakt” jak przed migracją', () => {
  /** @type {Katalog} */
  let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  it('tempoWlasne(daneTempa(stan po migracji)) = tempo z charakteryzacji dla obu usług', async () => {
    const stan = poMigracji(await stanV1())

    const po = { mieszkanie_standard: tempoWlasne(daneTempa(stan), 'mieszkanie_standard'),
      sprzatanie_biur: tempoWlasne(daneTempa(stan), 'sprzatanie_biur') }

    assert.deepEqual(po, TEMPO_PRZED)
  })

  it('lista „plan a fakt” z wizyt ma te same dni, usługi, plan, fakt i różnicę co z wykonań', async () => {
    const stan = poMigracji(await stanV1())

    const wiersze = historiaPlanuIFaktu(stan, katalog).map((x) => [x.data, x.uslugaId, x.plan, x.fakt, x.procent])

    assert.deepEqual(wiersze, PLAN_I_FAKT_PRZED)
  })
})

describe('zV1DoV2: powtórzenia i wynik', () => {
  it('migracja dwa razy daje równe stany, wejście zostaje wersją 1, a każda wycena przechodzi jestWycena', async () => {
    const v1 = await stanV1()

    const pierwszy = zaktualizujStan(v1)
    const drugi = zaktualizujStan(v1)

    assert.ok('stan' in pierwszy)
    assert.deepEqual(pierwszy, drugi)
    assert.deepEqual(pierwszy.stan.wyceny.map(jestWycena), [true, true, true, true, true, true])
    assert.equal(v1.wersja, 1)
    assert.equal(v1.wyceny[0].wykonania.length, 1)
    assert.equal(Object.hasOwn(v1, 'klienci'), false)
  })

  it('wyceny, które nie są listą, dają stan bez klientów i zleceń, który magazyn odrzuca jako uszkodzony', () => {
    const v1 = { wersja: 1, wyceny: 'brak' }

    assert.deepEqual(zV1DoV2(v1), { wersja: 2, wyceny: 'brak', klienci: [], zlecenia: [] })
    assert.deepEqual(zaktualizujStan(v1), { blad: 'uszkodzony' })
  })
})

describe('zV1DoV2: wycena bez nazwy klienta i dane nieczytelne', () => {
  it('wycena z wykonaniami bez nazwy klienta dostaje klienta „Klient z wyceny {numer}”', async () => {
    const v1 = await stanV1()
    const bezNazwy = zWycena(v1, 'w-wykonana', { klient: { nazwa: '  ', adres: '', termin: null } })

    const stan = poMigracji(bezNazwy)

    assert.deepEqual(stan.klienci.map((k) => [k.id, k.nazwa]), [['k-w-abonament', 'Biuro Rachunkowe Bilans'], ['k-w-termin', 'Anna Kowalska'],
      ['k-w-sobota', 'Jan Nowak'], ['k-w-wykonana', 'Klient z wyceny 1/10/2026']])
    assert.equal(zlecenie(stan, 'z-w-wykonana-e-1')?.klientId, 'k-w-wykonana')
  })

  it('przyjęta bez nazwy i bez wykonań oraz szybka bez klienta nie dają klienta ani zlecenia', async () => {
    const v1 = await stanV1()
    const bezNazwy = zWycena(v1, 'w-termin', { klient: { nazwa: '', adres: '', termin: '2026-11-14T09:00' } })

    const stan = poMigracji(bezNazwy)

    assert.equal(zlecenie(stan, 'z-w-termin'), null)
    assert.deepEqual(stan.wyceny.filter((w) => doZaplanowania(stan, w)).map((w) => w.id), ['w-abonament', 'w-termin', 'w-sobota'])
    assert.equal(stan.klienci.some((k) => k.nazwa === ''), false)
  })

  it('nieistniejący dzień terminu, wykonanie z datą „wczoraj” i czas pracy 0,5 min nie kończą się ekranem ratunkowym', async () => {
    const v1 = await stanV1()
    const zlyTermin = zWycena(v1, 'w-termin', { klient: { nazwa: 'Anna Kowalska', adres: '', termin: '2026-02-30T10:00' } })
    const zleWykonania = zWycena(zlyTermin, 'w-abonament', { wykonania: [
      { id: 'e-2', data: 'wczoraj', minuty: 150, tempoPlanu: 1.3 },
      { id: 'e-3', data: '2026-10-14', minuty: 0.5, tempoPlanu: 1.25 },
    ] })

    const stan = poMigracji(zleWykonania)

    assert.equal(zlecenie(stan, 'z-w-termin'), null)
    assert.equal(zlecenie(stan, 'z-w-abonament-e-2'), null)
    assert.deepEqual(zlecenie(stan, 'z-w-abonament-e-3')?.wizyty['2026-10-14']?.minutyPracy, null)
    assert.equal(zlecenie(stan, 'z-w-abonament-e-3')?.wizyty['2026-10-14']?.zrobiona, '2026-10-14T00:00:00.000Z')
  })

  it('id wyceny, z którego id klienta i zlecenia przekroczyłoby 2000 znaków, nie daje klienta ani zleceń, a stan się wczytuje', async () => {
    const v1 = await stanV1()
    const dlugieId = 'w'.repeat(1999)
    const zDlugimId = { ...v1, wyceny: v1.wyceny.map((/** @type {any} */ w) => (w.id === 'w-sobota' ? { ...w, id: dlugieId } : w)) }

    const stan = poMigracji(zDlugimId)

    assert.equal(stan.wyceny.find((w) => w.id === dlugieId)?.klientId, null)
    assert.equal(stan.klienci.some((k) => k.nazwa === 'Jan Nowak'), false)
  })

  it('wycena bez czytelnej kwoty (cena ręczna tekstem, bez migawki) nie daje zleceń, a jej klient zostaje', async () => {
    const v1 = await stanV1()
    const bezKwoty = zWycena(v1, 'w-wykonana', { cenaReczna: '280', wynik: null })

    const stan = poMigracji(bezKwoty)

    assert.equal(zlecenie(stan, 'z-w-wykonana-e-1'), null)
    assert.equal(stan.wyceny[0].klientId, 'k-w-wykonana')
  })
})
