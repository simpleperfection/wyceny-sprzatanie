import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { niezaplacone } from '../zlecenia/zapytania.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn, wczytajStan } from './magazyn.js'
import {
  cofnijZaplate, cofnijZaplateMiesiaca, cofnijZrobiona, formaDomyslna, odwolajWizyte, oznaczZaplacona, oznaczZaplateMiesiaca, oznaczZrobiona,
  przesunWizyte, przywrocWizyte, wpiszCzasPracy, zmienForme,
} from './wizyty.js'
import { BladZlecenia, zlecenie } from './zlecenia.js'
import { MAKS_WIZYT_ZLECENIA } from './zlecenia-ksztalt.js'

const TERAZ = new Date('2026-11-02T08:00:00.000Z')
/** Czas lokalny: dzien oznaczenia 2026-11-18 niezaleznie od strefy maszyny testowej. */
const OZNACZENIE = new Date(2026, 10, 18, 10, 0)
const POZNIEJ = new Date(2026, 10, 19, 12, 0)
const PUSTY_STAN = {
  wersja: 2, ustawienia: null, wyceny: [], klienci: [], zlecenia: [], licznikNumerow: {}, kopia: { ostatnia: null, zmianaOd: null },
  preferencje: { iosInstrukcjaZamknieta: false },
}
const STAN_WIZYTY = { przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null }
const PON_SR_PT = { co: 'tydzien', dni: [1, 3, 5] }

/** @param {string} id */
const klientTestowy = (id) => ({
  id, nazwa: `Klient ${id}`, telefon: null, adres: null, notatki: null, utworzony: TERAZ.toISOString(), zmieniony: TERAZ.toISOString(),
})

/**
 * Seria w poniedzialki od 2026-11-02 o 09:00: 250 zl, od 2026-11-16 — 280 zl.
 * @param {string} id @param {object} [zmiana]
 */
const seriaTestowa = (id, zmiana = {}) => ({
  id, klientId: 'k1', wycenaId: null, uslugaId: 'mieszkania', opis: null, rozliczenie: 'za_wizyte', start: '2026-11-02', koniec: null,
  plan: null, wizyty: {}, zaplatyMiesieczne: {}, utworzone: TERAZ.toISOString(), zmienione: TERAZ.toISOString(),
  okresy: [
    { od: '2026-11-02', cykl: { co: 'tydzien', dni: [1] }, godzina: '09:00', cenaWizyty: 250, cenaMiesiaca: null },
    { od: '2026-11-16', cykl: { co: 'tydzien', dni: [1] }, godzina: '09:00', cenaWizyty: 280, cenaMiesiaca: null },
  ],
  ...zmiana,
})

/**
 * Abonament pn, sr, pt rozliczany miesiecznie: 1560 zl, od 2026-12-04 (piatek, nie pierwsza wizyta grudnia) — 1700 zl.
 * @param {string} id
 */
const abonamentTestowy = (id) => seriaTestowa(id, {
  rozliczenie: 'miesiecznie',
  okresy: [
    { od: '2026-11-02', cykl: PON_SR_PT, godzina: '18:00', cenaWizyty: null, cenaMiesiaca: 1560 },
    { od: '2026-12-04', cykl: PON_SR_PT, godzina: '18:00', cenaWizyty: null, cenaMiesiaca: 1700 },
  ],
})

/** @param {string} forma @param {string} data @param {number} [kwota] */
const zaplata = (forma, data, kwota = 250) => ({ forma, data, kwota })

/** @param {object[]} zlecenia @param {string[]} [klienci] */
function magazynZeZleceniami(zlecenia, klienci = ['k1']) {
  const storage = new PamiecMagazynu()
  const magazyn = utworzMagazyn(storage, { teraz: () => TERAZ, loguj: () => {}, poprosOTrwalosc: () => true })
  magazyn.zapiszCalosc({ ...PUSTY_STAN, klienci: klienci.map(klientTestowy), zlecenia })
  return { magazyn, storage }
}

/** @param {import('./magazyn.js').Stan} stan @param {string} [id] */
const wizytyZlecenia = (stan, id = 'z1') => zlecenie(stan, id)?.wizyty

/** @param {string} kod */
const blad = (kod) => ({ name: BladZlecenia.name, kod })

describe('oznaczZrobiona i cofnijZrobiona', () => {
  it('zapisuje znacznik z zegara i datę zmiany zlecenia; drugie oznaczenie nie zmienia znacznika', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])
    oznaczZrobiona(magazyn, 'z1', '2026-11-09', { teraz: () => OZNACZENIE })

    const stan = oznaczZrobiona(magazyn, 'z1', '2026-11-09', { teraz: () => POZNIEJ })

    assert.deepEqual(wizytyZlecenia(stan), { '2026-11-09': { ...STAN_WIZYTY, zrobiona: OZNACZENIE.toISOString() } })
    assert.equal(zlecenie(stan, 'z1')?.zmienione, OZNACZENIE.toISOString())
  })

  it('cofnięcie zostawia wizytę w stanie domyślnym, więc wpis znika', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])
    oznaczZrobiona(magazyn, 'z1', '2026-11-09', { teraz: () => OZNACZENIE })

    const stan = cofnijZrobiona(magazyn, 'z1', '2026-11-09')

    assert.deepEqual(wizytyZlecenia(stan), {})
  })

  it('dzień bez wizyty w regule → brak_wizyty, zły dzień → data, nieznane zlecenie → brak_zlecenia; bez zapisu', () => {
    const { magazyn, storage } = magazynZeZleceniami([seriaTestowa('z1')])
    const przed = storage.getItem(KLUCZ_MAGAZYNU)

    assert.throws(() => oznaczZrobiona(magazyn, 'z1', '2026-11-10'), blad('brak_wizyty'))
    assert.throws(() => oznaczZrobiona(magazyn, 'z1', '2026-10-26'), blad('brak_wizyty'))
    assert.throws(() => oznaczZrobiona(magazyn, 'z1', '2026-11-31'), blad('data'))
    assert.throws(() => oznaczZrobiona(magazyn, 'z9', '2026-11-09'), blad('brak_zlecenia'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })

  it('nowa wizyta ze stanem przy MAKS_WIZYT_ZLECENIA zapisanych → za_duzo, bez zapisu; zmiana zapisanej przechodzi', () => {
    const dni = Array.from({ length: MAKS_WIZYT_ZLECENIA }, (_, i) => new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10))
    const wizyty = Object.fromEntries(dni.map((d) => [d, { ...STAN_WIZYTY, minutyPracy: 60 }]))
    const { magazyn, storage } = magazynZeZleceniami([seriaTestowa('z1', { wizyty })])
    const przed = storage.getItem(KLUCZ_MAGAZYNU)

    assert.throws(() => oznaczZrobiona(magazyn, 'z1', '2026-11-09'), blad('za_duzo'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)

    const stan = wpiszCzasPracy(magazyn, 'z1', dni[0], 90)
    assert.equal(wizytyZlecenia(stan)?.[dni[0]].minutyPracy, 90)
  })
})

describe('przesunWizyte, odwolajWizyte i przywrocWizyte', () => {
  it('przesunięcie zapisuje dzień i godzinę; powrót na dzień pierwotny z godziną okresu usuwa przesunięcie i pusty wpis', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])

    const przesuniete = przesunWizyte(magazyn, 'z1', '2026-11-09', { data: '2026-11-10', godzina: '12:00' })
    assert.deepEqual(wizytyZlecenia(przesuniete), { '2026-11-09': { ...STAN_WIZYTY, przeniesiona: { data: '2026-11-10', godzina: '12:00' } } })

    const powrot = przesunWizyte(magazyn, 'z1', '2026-11-09', { data: '2026-11-09', godzina: '09:00' })
    assert.deepEqual(wizytyZlecenia(powrot), {})
  })

  it('powrót wizyty z innym stanem zostawia wpis z przeniesiona null; ta sama data o innej godzinie to przesunięcie', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])
    przesunWizyte(magazyn, 'z1', '2026-11-09', { data: '2026-11-11', godzina: null })
    wpiszCzasPracy(magazyn, 'z1', '2026-11-09', 120)

    const powrot = przesunWizyte(magazyn, 'z1', '2026-11-09', { data: '2026-11-09' })
    const innaGodzina = przesunWizyte(magazyn, 'z1', '2026-11-16', { data: '2026-11-16', godzina: '07:30' })

    assert.deepEqual(wizytyZlecenia(powrot), { '2026-11-09': { ...STAN_WIZYTY, minutyPracy: 120 } })
    assert.deepEqual(wizytyZlecenia(innaGodzina)?.['2026-11-16'].przeniesiona, { data: '2026-11-16', godzina: '07:30' })
  })

  it('zły dzień albo godzina przesunięcia → data, godzina', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])

    assert.throws(() => przesunWizyte(magazyn, 'z1', '2026-11-09', { data: '10.11.2026' }), blad('data'))
    assert.throws(() => przesunWizyte(magazyn, 'z1', '2026-11-09', { data: '2026-11-10', godzina: '9:00' }), blad('godzina'))
  })

  it('odwołanie zapisuje odwolana, przywrócenie usuwa wpis', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])

    assert.deepEqual(wizytyZlecenia(odwolajWizyte(magazyn, 'z1', '2026-11-23')), { '2026-11-23': { ...STAN_WIZYTY, odwolana: true } })
    assert.deepEqual(wizytyZlecenia(przywrocWizyte(magazyn, 'z1', '2026-11-23')), {})
  })
})

describe('oznaczZaplacona, zmienForme, cofnijZaplate i formaDomyslna', () => {
  /** Zlecenie z historia zaplat klienta k1: gotowka 2026-11-02, potem BLIK 2026-11-09 (wpisany wczesniej w obiekcie). */
  const historia = seriaTestowa('z0', {
    wizyty: {
      '2026-11-09': { ...STAN_WIZYTY, zaplata: zaplata('blik', '2026-11-09') },
      '2026-11-02': { ...STAN_WIZYTY, zaplata: zaplata('gotowka', '2026-11-02') },
    },
  })
  /** Pozniejsza zaplata przelewem innego klienta nie zmienia formy k1. */
  const innyKlient = seriaTestowa('z2', { klientId: 'k2', wizyty: { '2026-11-16': { ...STAN_WIZYTY, zaplata: zaplata('przelew', '2026-11-17', 280) } } })

  it('bez formy u klienta z ostatnią zapłatą BLIK-iem → blik, kwota ceny okresu dnia pierwotnego, data z teraz', () => {
    const { magazyn } = magazynZeZleceniami([historia, seriaTestowa('z1'), innyKlient], ['k1', 'k2'])

    const stan = oznaczZaplacona(magazyn, 'z1', '2026-11-16', { teraz: () => OZNACZENIE })

    assert.deepEqual(wizytyZlecenia(stan)?.['2026-11-16'], { ...STAN_WIZYTY, zaplata: zaplata('blik', '2026-11-18', 280) })
  })

  it('formaDomyslna: bez historii gotówka, v1 z formą null pomijana', () => {
    const zV1 = seriaTestowa('z3', { wizyty: { '2026-11-23': { ...STAN_WIZYTY, zaplata: { forma: null, data: '2026-11-23', kwota: 280 } } } })

    assert.equal(formaDomyslna({ zlecenia: [innyKlient] }, 'k1'), 'gotowka')
    assert.equal(formaDomyslna({ zlecenia: [historia, zV1] }, 'k1'), 'blik')
    assert.equal(formaDomyslna({ zlecenia: [historia, innyKlient] }, 'k2'), 'przelew')
  })

  it('podana forma wygrywa; drugie oznaczenie nie zmienia zapłaty; zmienForme i cofnijZaplate', () => {
    const { magazyn } = magazynZeZleceniami([historia, seriaTestowa('z1')])
    oznaczZaplacona(magazyn, 'z1', '2026-11-09', { forma: 'przelew', teraz: () => OZNACZENIE })

    const drugie = oznaczZaplacona(magazyn, 'z1', '2026-11-09', { forma: 'gotowka', teraz: () => POZNIEJ })
    assert.deepEqual(wizytyZlecenia(drugie)?.['2026-11-09'].zaplata, zaplata('przelew', '2026-11-18'))

    const zmieniona = zmienForme(magazyn, 'z1', '2026-11-09', 'blik')
    assert.deepEqual(wizytyZlecenia(zmieniona)?.['2026-11-09'].zaplata, zaplata('blik', '2026-11-18'))

    assert.deepEqual(wizytyZlecenia(cofnijZaplate(magazyn, 'z1', '2026-11-09')), {})
  })

  it('nieznana forma → forma, zmiana formy bez zapłaty → brak_zaplaty', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])

    assert.throws(() => oznaczZaplacona(magazyn, 'z1', '2026-11-09', { forma: 'karta' }), blad('forma'))
    assert.throws(() => zmienForme(magazyn, 'z1', '2026-11-09', 'blik'), blad('brak_zaplaty'))
    assert.deepEqual(wizytyZlecenia(wczytajStan(magazyn)), {})
  })
})

describe('zapłata w serii miesięcznej', () => {
  it('zapłata pojedynczej wizyty → rozliczenie_miesieczne', () => {
    const { magazyn } = magazynZeZleceniami([abonamentTestowy('z1')])

    assert.throws(() => oznaczZaplacona(magazyn, 'z1', '2026-11-04', { forma: 'gotowka' }), blad('rozliczenie_miesieczne'))
  })

  it('oznaczZaplateMiesiaca 2026-11 zapisuje cenaMiesiaca, formę i dzień oznaczenia', () => {
    const { magazyn } = magazynZeZleceniami([abonamentTestowy('z1')])

    const stan = oznaczZaplateMiesiaca(magazyn, 'z1', '2026-11', { forma: 'przelew', teraz: () => OZNACZENIE })

    assert.deepEqual(zlecenie(stan, 'z1')?.zaplatyMiesieczne, { '2026-11': zaplata('przelew', '2026-11-18', 1560) })
  })

  it('powtórne oznaczZaplateMiesiaca zostawia pierwszą zapłatę i datę zmiany zlecenia', () => {
    const { magazyn } = magazynZeZleceniami([abonamentTestowy('z1')])
    oznaczZaplateMiesiaca(magazyn, 'z1', '2026-11', { forma: 'przelew', teraz: () => OZNACZENIE })

    const stan = oznaczZaplateMiesiaca(magazyn, 'z1', '2026-11', { forma: 'gotowka', teraz: () => POZNIEJ })

    assert.deepEqual(zlecenie(stan, 'z1')?.zaplatyMiesieczne, { '2026-11': zaplata('przelew', '2026-11-18', 1560) })
    assert.equal(zlecenie(stan, 'z1')?.zmienione, OZNACZENIE.toISOString())
  })

  it('zapłata za kolejny miesiąc przy MAKS_WIZYT_ZLECENIA zapisanych miesiącach → za_duzo, bez zapisu', () => {
    const miesiace = Array.from({ length: MAKS_WIZYT_ZLECENIA }, (_, i) => `${1800 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`)
    const zaplatyMiesieczne = Object.fromEntries(miesiace.map((m) => [m, zaplata('gotowka', '2026-11-02', 1560)]))
    const { magazyn, storage } = magazynZeZleceniami([{ ...abonamentTestowy('z1'), zaplatyMiesieczne }])
    const przed = storage.getItem(KLUCZ_MAGAZYNU)

    assert.throws(() => oznaczZaplateMiesiaca(magazyn, 'z1', '2026-11', { forma: 'przelew' }), blad('za_duzo'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })

  it('kwota grudnia z okresu pierwszej wizyty miesiąca (2026-12-02), a nie ze zmiany od 2026-12-04; cofnięcie usuwa', () => {
    const { magazyn } = magazynZeZleceniami([abonamentTestowy('z1')])

    const stan = oznaczZaplateMiesiaca(magazyn, 'z1', '2026-12', { teraz: () => OZNACZENIE })
    assert.deepEqual(zlecenie(stan, 'z1')?.zaplatyMiesieczne['2026-12'], zaplata('gotowka', '2026-11-18', 1560))

    assert.deepEqual(zlecenie(cofnijZaplateMiesiaca(magazyn, 'z1', '2026-12'), 'z1')?.zaplatyMiesieczne, {})
  })

  it('miesiąc po końcu serii ze zrobioną wizytą: „Niezapłacone” i zapłata liczą tę samą kwotę, a zapłata zamyka pozycję', () => {
    const zrobiona = { ...STAN_WIZYTY, zrobiona: '2026-12-02T18:00:00.000Z' }
    const { magazyn } = magazynZeZleceniami([{ ...abonamentTestowy('z1'), koniec: '2026-11-30', wizyty: { '2026-12-02': zrobiona } }])
    const przed = niezaplacone(wczytajStan(magazyn), '2027-01-10').filter((n) => n.klucz === '2026-12')

    const stan = oznaczZaplateMiesiaca(magazyn, 'z1', '2026-12', { forma: 'blik', teraz: () => OZNACZENIE })

    assert.deepEqual(przed, [{ rodzaj: 'miesiac', zlecenieId: 'z1', klientId: 'k1', klucz: '2026-12', kwota: 1560 }])
    assert.deepEqual(zlecenie(stan, 'z1')?.zaplatyMiesieczne, { '2026-12': zaplata('blik', '2026-11-18', 1560) })
    assert.deepEqual(niezaplacone(stan, '2027-01-10').filter((n) => n.klucz === '2026-12'), [])
  })

  it('miesiąc po końcu serii bez zrobionej wizyty → brak_wizyty', () => {
    const odwolana = { ...STAN_WIZYTY, zrobiona: '2026-12-02T18:00:00.000Z', odwolana: true }
    const { magazyn } = magazynZeZleceniami([{ ...abonamentTestowy('z1'), koniec: '2026-11-30', wizyty: { '2026-12-02': odwolana } }])

    assert.throws(() => oznaczZaplateMiesiaca(magazyn, 'z1', '2026-12'), blad('brak_wizyty'))
    assert.throws(() => oznaczZaplateMiesiaca(magazyn, 'z1', '2027-01'), blad('brak_wizyty'))
    assert.deepEqual(zlecenie(wczytajStan(magazyn), 'z1')?.zaplatyMiesieczne, {})
  })

  it('zlecenie za wizytę → rozliczenie, miesiąc przed startem → brak_wizyty, zły miesiąc → miesiac', () => {
    const { magazyn } = magazynZeZleceniami([abonamentTestowy('z1'), seriaTestowa('z2')])

    assert.throws(() => oznaczZaplateMiesiaca(magazyn, 'z2', '2026-11'), blad('rozliczenie'))
    assert.throws(() => oznaczZaplateMiesiaca(magazyn, 'z1', '2026-10'), blad('brak_wizyty'))
    assert.throws(() => oznaczZaplateMiesiaca(magazyn, 'z1', '2026-13'), blad('miesiac'))
    assert.deepEqual(zlecenie(wczytajStan(magazyn), 'z1')?.zaplatyMiesieczne, {})
  })
})

describe('wpiszCzasPracy', () => {
  it('czas pracy 0 i 1441 → minuty, bez zapisu', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])

    assert.throws(() => wpiszCzasPracy(magazyn, 'z1', '2026-11-09', 0), blad('minuty'))
    assert.throws(() => wpiszCzasPracy(magazyn, 'z1', '2026-11-09', 1441), blad('minuty'))
    assert.deepEqual(wizytyZlecenia(wczytajStan(magazyn)), {})
  })

  it('zapisuje 1440 minut, a null usuwa czas razem z pustym wpisem', () => {
    const { magazyn } = magazynZeZleceniami([seriaTestowa('z1')])

    assert.deepEqual(wizytyZlecenia(wpiszCzasPracy(magazyn, 'z1', '2026-11-09', 1440)), { '2026-11-09': { ...STAN_WIZYTY, minutyPracy: 1440 } })
    assert.deepEqual(wizytyZlecenia(wpiszCzasPracy(magazyn, 'z1', '2026-11-09', null)), {})
  })
})
