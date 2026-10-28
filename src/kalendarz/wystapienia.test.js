// Czas lokalny ze zmiana czasu (25.10.2026 i 28.03.2027): liczenie dni na czasie lokalnym przesuneloby wizyty o dzien.
process.env.TZ = 'Europe/Warsaw'

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladKalendarza } from './daty.js'
import { CYKLE, dniOkresu, najblizszaWizyta, wystapienia } from './wystapienia.js'

/** @param {string} kod */
const bladKalendarza = (kod) => ({ name: BladKalendarza.name, kod })

/** @param {'tydzien' | 'dwa_tygodnie' | 'miesiac'} co @param {number[]} [dni] */
const cykl = (co, dni = []) => ({ co, dni })

/**
 * Okres jak w pelnym zleceniu (cena zostaje w wyniku, bo funkcja oddaje caly obiekt okresu).
 * @param {string} od @param {{ co: string, dni: number[] } | null} cyklOkresu @param {string | null} [godzina]
 */
const okres = (od, cyklOkresu, godzina = null) => ({ od, cykl: cyklOkresu, godzina, cenaWizyty: 200, cenaMiesiaca: null })

/** @param {Record<string, unknown>} [zmiany] */
const stan = (zmiany = {}) => ({ przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null, ...zmiany })

/**
 * @param {{ okresy: ReturnType<typeof okres>[], koniec?: string | null, wizyty?: Record<string, ReturnType<typeof stan>> }} dane
 */
const zlecenie = ({ okresy, koniec = null, wizyty = {} }) => ({ start: okresy[0].od, koniec, okresy, wizyty })

/** Co tydzien w pn i czw od czwartku 2026-10-29, godz. 09:00. */
const PN_CZW = okres('2026-10-29', cykl('tydzien', [1, 4]), '09:00')

/** @param {{ data: string }[]} lista */
const dni = (lista) => lista.map((w) => w.data)

describe('CYKLE', () => {
  it('trzy rodzaje cyklu w stałej kolejności', () => {
    assert.deepEqual(CYKLE, ['tydzien', 'dwa_tygodnie', 'miesiac'])
  })
})

describe('dniOkresu', () => {
  it('co tydzień w pn i czw od czwartku 2026-10-29, okno 2026-10-26–2026-11-08 → 29.10, 2.11, 5.11', () => {
    assert.deepEqual(dniOkresu(PN_CZW, '2026-10-26', '2026-11-08'), ['2026-10-29', '2026-11-02', '2026-11-05'])
  })

  it('co 2 tygodnie w pn od czwartku 2026-10-29 → 9.11 i 23.11 (kotwicą tydzień od 26.10)', () => {
    const coDwa = okres('2026-10-29', cykl('dwa_tygodnie', [1]))

    assert.deepEqual(dniOkresu(coDwa, '2026-10-26', '2026-11-29'), ['2026-11-09', '2026-11-23'])
  })

  it('co miesiąc od 2026-01-31 → 31.01, 28.02, 31.03, 30.04, 31.05 (zawsze od dnia z `od`)', () => {
    const coMiesiac = okres('2026-01-31', cykl('miesiac'))

    assert.deepEqual(dniOkresu(coMiesiac, '2026-01-01', '2026-05-31'),
      ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'])
  })

  it('co tydzień w nd przez zmianę czasu 25.10.2026 i 28.03.2027 → kolejne niedziele bez przesunięcia', () => {
    const niedziele = okres('2026-10-04', cykl('tydzien', [7]))

    assert.deepEqual(dniOkresu(niedziele, '2026-10-18', '2026-11-08'), ['2026-10-18', '2026-10-25', '2026-11-01', '2026-11-08'])
    assert.deepEqual(dniOkresu(niedziele, '2027-03-21', '2027-04-04'), ['2027-03-21', '2027-03-28', '2027-04-04'])
  })

  it('bez cyklu tylko dzień `od`, a nic przed `od`', () => {
    const raz = okres('2026-11-03', null)

    assert.deepEqual(dniOkresu(raz, '2026-11-01', '2026-11-07'), ['2026-11-03'])
    assert.deepEqual(dniOkresu(raz, '2026-11-04', '2026-11-30'), [])
    assert.deepEqual(dniOkresu(PN_CZW, '2026-10-01', '2026-10-28'), [])
  })

  it('nieznany cykl albo okno od późniejszego dnia → BladKalendarza', () => {
    const coRok = okres('2026-10-29', { co: 'co_rok', dni: [] })

    assert.throws(() => dniOkresu(/** @type {never} */ (coRok), '2026-10-26', '2026-11-08'), bladKalendarza('cykl'))
    assert.throws(() => dniOkresu(PN_CZW, '2026-11-08', '2026-10-26'), bladKalendarza('okno'))
  })
})

describe('wystapienia', () => {
  it('element ma datę pierwotną, dzień, godzinę okresu, cały okres i stan (null bez zapisu)', () => {
    const wynik = wystapienia(zlecenie({ okresy: [PN_CZW] }), '2026-10-29', '2026-10-29')

    assert.deepEqual(wynik, [{ dataPierwotna: '2026-10-29', data: '2026-10-29', godzina: '09:00', okres: PN_CZW, stan: null }])
  })

  it('wizyta przesunięta z 2.11 na 10.11 jest 10.11 z godziną okresu daty pierwotnej i nie ma jej 2.11', () => {
    const przesunieta = stan({ przeniesiona: { data: '2026-11-10', godzina: null } })
    const z = zlecenie({ okresy: [PN_CZW], wizyty: { '2026-11-02': przesunieta } })

    const tydzienPo = wystapienia(z, '2026-11-08', '2026-11-14')
    const tydzienPrzed = wystapienia(z, '2026-11-01', '2026-11-07')

    assert.deepEqual(dni(tydzienPo), ['2026-11-09', '2026-11-10', '2026-11-12'])
    assert.deepEqual(tydzienPo[1], { dataPierwotna: '2026-11-02', data: '2026-11-10', godzina: '09:00', okres: PN_CZW, stan: przesunieta })
    assert.deepEqual(dni(tydzienPrzed), ['2026-11-05'])
  })

  it('godzina przesunięcia wygrywa z godziną okresu', () => {
    const z = zlecenie({ okresy: [PN_CZW], wizyty: { '2026-11-02': stan({ przeniesiona: { data: '2026-11-03', godzina: '14:30' } }) } })

    assert.equal(wystapienia(z, '2026-11-03', '2026-11-03')[0].godzina, '14:30')
  })

  it('zapisana wizyta z dnia, którego nowy okres z innym cyklem już nie daje, nadal jest w wyniku', () => {
    const sroda = okres('2026-11-09', cykl('tydzien', [3]), '10:00')
    const zrobiona = stan({ zrobiona: '2026-11-16T12:00:00.000Z' })
    const z = zlecenie({ okresy: [PN_CZW, sroda], wizyty: { '2026-11-16': zrobiona } })

    const wynik = wystapienia(z, '2026-11-16', '2026-11-22')

    assert.deepEqual(dni(wynik), ['2026-11-16', '2026-11-18'])
    assert.equal(wynik[0].stan, zrobiona)
    assert.equal(wynik[1].stan, null)
  })

  it('nowy okres od 2026-11-16 (śr, 10:00): wizyty przed 16.11 mają stary okres, od 16.11 nowy', () => {
    const nowy = okres('2026-11-16', cykl('tydzien', [3]), '10:00')
    const wynik = wystapienia(zlecenie({ okresy: [PN_CZW, nowy] }), '2026-11-09', '2026-11-22')

    assert.deepEqual(wynik.map((w) => [w.data, w.godzina, w.okres]),
      [['2026-11-09', '09:00', PN_CZW], ['2026-11-12', '09:00', PN_CZW], ['2026-11-18', '10:00', nowy]])
  })

  it('`koniec` 2026-11-05: brak wizyt z reguły po tym dniu, ale zrobiona wizyta z 2026-11-09 zostaje', () => {
    const z = zlecenie({ okresy: [PN_CZW], koniec: '2026-11-05', wizyty: { '2026-11-09': stan({ zrobiona: '2026-11-09T10:00:00.000Z' }) } })

    assert.deepEqual(dni(wystapienia(z, '2026-10-26', '2026-11-22')), ['2026-10-29', '2026-11-02', '2026-11-05', '2026-11-09'])
  })

  it('w tym samym dniu po godzinie, a wizyta bez godziny na końcu', () => {
    const rano = okres('2026-11-02', null, '08:00')
    const z = zlecenie({ okresy: [okres('2026-11-02', cykl('tydzien', [1]))],
      wizyty: { '2026-11-03': stan({ przeniesiona: { data: '2026-11-09', godzina: '07:00' } }),
        '2026-11-04': stan({ przeniesiona: { data: '2026-11-09', godzina: '16:00' } }) } })

    assert.deepEqual(wystapienia(z, '2026-11-09', '2026-11-09').map((w) => [w.dataPierwotna, w.godzina]),
      [['2026-11-03', '07:00'], ['2026-11-04', '16:00'], ['2026-11-09', null]])
    assert.equal(wystapienia(zlecenie({ okresy: [rano] }), '2026-11-02', '2026-11-02')[0].godzina, '08:00')
  })

  it('okno od późniejszego dnia, zły dzień albo zlecenie bez okresów → BladKalendarza', () => {
    assert.throws(() => wystapienia(zlecenie({ okresy: [PN_CZW] }), '2026-11-08', '2026-11-01'), bladKalendarza('okno'))
    assert.throws(() => wystapienia(zlecenie({ okresy: [PN_CZW] }), '2026-11-31', '2026-12-01'), bladKalendarza('dzien'))
    assert.throws(() => wystapienia({ start: '2026-11-01', koniec: null, okresy: [], wizyty: {} }, '2026-11-01', '2026-11-08'),
      bladKalendarza('okresy'))
  })
})

describe('najblizszaWizyta', () => {
  it('pierwsza nieodwołana od dnia, z pominięciem odwołanej', () => {
    const z = zlecenie({ okresy: [PN_CZW], wizyty: { '2026-11-02': stan({ odwolana: true }) } })

    const najblizsza = najblizszaWizyta(z, '2026-10-30')

    assert.equal(najblizsza?.data, '2026-11-05')
    assert.equal(najblizsza?.godzina, '09:00')
  })

  it('seria z samymi odwołanymi wizytami (z końcem) → null', () => {
    const odwolane = Object.fromEntries(['2026-11-02', '2026-11-09', '2026-11-16'].map((d) => [d, stan({ odwolana: true })]))
    const z = zlecenie({ okresy: [okres('2026-11-02', cykl('tydzien', [1]))], koniec: '2026-11-16', wizyty: odwolane })

    assert.equal(najblizszaWizyta(z, '2026-11-01'), null)
  })

  it('szuka najwyżej 366 dni: odwołane poniedziałki przez 366 dni → null, choć seria trwa dalej', () => {
    const poniedzialki = okres('2026-11-02', cykl('tydzien', [1]))
    /** @type {Record<string, ReturnType<typeof stan>>} */
    const odwolane = {}
    for (const w of wystapienia(zlecenie({ okresy: [poniedzialki] }), '2026-11-02', '2027-11-02')) odwolane[w.data] = stan({ odwolana: true })
    const z = zlecenie({ okresy: [poniedzialki], wizyty: odwolane })

    assert.equal(najblizszaWizyta(z, '2026-11-02'), null)
    assert.equal(najblizszaWizyta(z, '2026-11-10')?.data, '2027-11-08')
  })

  it('zły dzień → BladKalendarza', () => {
    assert.throws(() => najblizszaWizyta(zlecenie({ okresy: [PN_CZW] }), 'jutro'), bladKalendarza('dzien'))
  })
})
