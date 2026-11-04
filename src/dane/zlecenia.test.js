import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { wystapienia } from '../kalendarz/wystapienia.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn, wczytajStan } from './magazyn.js'
import {
  BladZlecenia, czyWycenaZamknieta, doZaplanowania, usunZlecenie, utworzZlecenie, zakonczSerie, zaplanujZWyceny, zlecenie, zleceniaKlienta,
  zleceniaWyceny, zmienOdWizyty,
} from './zlecenia.js'
import { MAKS_ZLECEN } from './zlecenia-ksztalt.js'

const TERAZ = new Date('2026-11-02T08:00:00.000Z')
const POZNIEJ = new Date('2026-11-05T17:30:00.000Z')
const PUSTY_STAN = {
  wersja: 2, ustawienia: null, wyceny: [], klienci: [], zlecenia: [], licznikNumerow: {}, kopia: { ostatnia: null, zmianaOd: null },
  preferencje: { iosInstrukcjaZamknieta: false },
}
const TYDZIEN_PN = { co: 'tydzien', dni: [1] }

/** @param {object} [stan] stan zapisany w magazynie przed testem */
function magazynZeStanem(stan) {
  const storage = new PamiecMagazynu()
  const magazyn = utworzMagazyn(storage, { teraz: () => TERAZ, loguj: () => {}, poprosOTrwalosc: () => true })
  if (stan) magazyn.zapiszCalosc(stan)
  return { magazyn, storage }
}

/** @param {string} id */
const klientTestowy = (id) => ({
  id, nazwa: `Klient ${id}`, telefon: null, adres: null, notatki: null, utworzony: TERAZ.toISOString(), zmieniony: TERAZ.toISOString(),
})

/**
 * Wycena z polami, ktore czyta planowanie (status, klient, usluga, migawka, oferta); magazyn wymaga od wyceny tylko obiektu z id.
 * @param {string} id @param {string} status @param {object | null} [wynik]
 */
const wycenaTestowa = (id, status, wynik = { cena: 120, minutyNormowe: 95, wizytWMiesiacu: 13 }) => ({
  id, status, klientId: null, klient: { nazwa: '', adres: '', termin: null }, wejscie: { uslugaId: 'biura', wariantId: 'abonament_3' }, wynik,
  oferta: { wyslana: null, nieaktualna: false },
})

/** @param {string} id @param {object} [zmiana] */
const zlecenieTestowe = (id, zmiana = {}) => ({
  id, klientId: 'k1', wycenaId: null, uslugaId: null, opis: 'Mycie okien', rozliczenie: 'za_wizyte', start: '2026-11-02', koniec: null,
  plan: null, okresy: [{ od: '2026-11-02', cykl: null, godzina: null, cenaWizyty: 200, cenaMiesiaca: null }], wizyty: {},
  zaplatyMiesieczne: {}, utworzone: TERAZ.toISOString(), zmienione: TERAZ.toISOString(), ...zmiana,
})

/** @param {string} id seria co tydzien w poniedzialki od 2026-11-02, 250 zl za wizyte */
const seriaTestowa = (id, zmiana = {}) => zlecenieTestowe(id, {
  okresy: [{ od: '2026-11-02', cykl: TYDZIEN_PN, godzina: '09:00', cenaWizyty: 250, cenaMiesiaca: null }], ...zmiana,
})

/** @param {string} kod */
const blad = (kod) => ({ name: BladZlecenia.name, kod })

const DANE_RECZNE = { klientId: 'k1', opis: '  Mycie okien ', rozliczenie: 'za_wizyte', start: '2026-11-10', cykl: null, godzina: '10:00', cenaWizyty: 180 }

describe('utworzZlecenie', () => {
  it('zapisuje zlecenie ręczne bez wyceny i planu, z przyciętym opisem i datami z zegara', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')] })

    const zapisane = utworzZlecenie(magazyn, DANE_RECZNE, { id: 'z1', teraz: () => TERAZ })

    const oczekiwane = zlecenieTestowe('z1', {
      start: '2026-11-10', okresy: [{ od: '2026-11-10', cykl: null, godzina: '10:00', cenaWizyty: 180, cenaMiesiaca: null }],
    })
    assert.deepEqual(zapisane, oczekiwane)
    assert.deepEqual(wczytajStan(magazyn).zlecenia, [oczekiwane])
  })

  it('dwa razy z tym samym id daje jedno zlecenie i oddaje pierwszy zapis', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')] })
    utworzZlecenie(magazyn, DANE_RECZNE, { id: 'z1', teraz: () => TERAZ })

    const drugie = utworzZlecenie(magazyn, { ...DANE_RECZNE, cenaWizyty: 999 }, { id: 'z1', teraz: () => POZNIEJ })

    assert.equal(drugie.okresy[0].cenaWizyty, 180)
    assert.deepEqual(wczytajStan(magazyn).zlecenia.map((z) => [z.id, z.okresy[0].cenaWizyty]), [['z1', 180]])
  })

  it('bez klienta i z nieznanym klientem → brak_klienta, bez zapisu', () => {
    const { magazyn, storage } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')] })
    const przed = storage.getItem(KLUCZ_MAGAZYNU)
    const { klientId: _, ...bezKlienta } = DANE_RECZNE

    assert.throws(() => utworzZlecenie(magazyn, bezKlienta, { id: 'z1' }), blad('brak_klienta'))
    assert.throws(() => utworzZlecenie(magazyn, { ...DANE_RECZNE, klientId: 'k9' }, { id: 'z1' }), blad('brak_klienta'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })

  it('złe wejście: bez usługi i opisu, miesięczne bez cyklu, cena nie do rozliczenia, zły cykl, godzina, id', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')] })
    const opcje = { id: 'z1' }

    assert.throws(() => utworzZlecenie(magazyn, { ...DANE_RECZNE, opis: '   ' }, opcje), blad('usluga'))
    assert.throws(() => utworzZlecenie(magazyn, { ...DANE_RECZNE, rozliczenie: 'miesiecznie', cenaWizyty: null, cenaMiesiaca: 900 }, opcje),
      blad('rozliczenie'))
    assert.throws(() => utworzZlecenie(magazyn, { ...DANE_RECZNE, cenaMiesiaca: 900 }, opcje), blad('cena'))
    assert.throws(() => utworzZlecenie(magazyn, { ...DANE_RECZNE, cenaWizyty: -1 }, opcje), blad('cena'))
    assert.throws(() => utworzZlecenie(magazyn, { ...DANE_RECZNE, cykl: { co: 'tydzien', dni: [] } }, opcje), blad('cykl'))
    assert.throws(() => utworzZlecenie(magazyn, { ...DANE_RECZNE, godzina: '25:00' }, opcje), blad('godzina'))
    assert.throws(() => utworzZlecenie(magazyn, DANE_RECZNE, { id: '' }), blad('id'))
    assert.deepEqual(wczytajStan(magazyn).zlecenia, [])
  })

  it(`${MAKS_ZLECEN + 1}. zlecenie → za_duzo`, () => {
    const zlecenia = Array.from({ length: MAKS_ZLECEN }, (_, i) => zlecenieTestowe(`z${i}`))
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia })

    assert.throws(() => utworzZlecenie(magazyn, DANE_RECZNE, { id: 'nowe' }), blad('za_duzo'))
    assert.equal(wczytajStan(magazyn).zlecenia.length, MAKS_ZLECEN)
  })
})

describe('zaplanujZWyceny', () => {
  const daneAbonamentu = {
    klientId: 'k1', rozliczenie: 'miesiecznie', start: '2026-11-02', cykl: { co: 'tydzien', dni: [1, 3, 5] }, godzina: '18:00',
    cenaMiesiaca: 1560, tempo: 1.3,
  }

  it('wycena do_wyslania → zly_status, nieznana → brak_wyceny, bez zapisu', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], wyceny: [wycenaTestowa('w1', 'do_wyslania')] })

    assert.throws(() => zaplanujZWyceny(magazyn, 'w1', daneAbonamentu, { id: 'z1' }), blad('zly_status'))
    assert.throws(() => zaplanujZWyceny(magazyn, 'w9', daneAbonamentu, { id: 'z1' }), blad('brak_wyceny'))
    assert.deepEqual(wczytajStan(magazyn).zlecenia, [])
  })

  it('przyjęty abonament biura daje serię z usługą wyceny i planem z minut normowych migawki i podanego tempa', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], wyceny: [wycenaTestowa('w1', 'przyjeta')] })

    const zapisane = zaplanujZWyceny(magazyn, 'w1', daneAbonamentu, { id: 'z1', teraz: () => TERAZ })

    assert.deepEqual(zapisane, zlecenieTestowe('z1', {
      wycenaId: 'w1', uslugaId: 'biura', opis: null, rozliczenie: 'miesiecznie', plan: { minutyNormowe: 95, tempo: 1.3 },
      okresy: [{ od: '2026-11-02', cykl: { co: 'tydzien', dni: [1, 3, 5] }, godzina: '18:00', cenaWizyty: null, cenaMiesiaca: 1560 }],
    }))
    assert.deepEqual(zlecenie(wczytajStan(magazyn), 'z1')?.plan, { minutyNormowe: 95, tempo: 1.3 })
  })

  it('wycena bez migawki daje plan null; migawka bez dodatniego tempa → tempo', () => {
    const wyceny = [wycenaTestowa('w1', 'przyjeta', null), wycenaTestowa('w2', 'przyjeta')]
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], wyceny })
    const jednorazowe = { klientId: 'k1', rozliczenie: 'za_wizyte', start: '2026-11-10', cykl: null, godzina: null, cenaWizyty: 300 }

    assert.equal(zaplanujZWyceny(magazyn, 'w1', jednorazowe, { id: 'z1' }).plan, null)
    assert.throws(() => zaplanujZWyceny(magazyn, 'w2', jednorazowe, { id: 'z2' }), blad('tempo'))
    assert.throws(() => zaplanujZWyceny(magazyn, 'w2', { ...jednorazowe, tempo: 0 }, { id: 'z2' }), blad('tempo'))
  })
})

describe('zaplanujZWyceny: klient wyceny', () => {
  const DANE = { klientId: 'k1', rozliczenie: 'za_wizyte', start: '2026-11-10', cykl: null, godzina: null, cenaWizyty: 180, tempo: 1.3 }
  /** @param {object} [zmiana] */
  const wycena = (zmiana = {}) => ({ ...wycenaTestowa('w1', 'przyjeta'), ...zmiana })

  it('wycena bez klienta dostaje w tym samym zapisie klienta zlecenia z kopią nazwy i adresu', () => {
    const k1 = { ...klientTestowy('k1'), adres: 'ul. Lipowa 3' }
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [k1], wyceny: [wycena()] })

    zaplanujZWyceny(magazyn, 'w1', DANE, { id: 'z1', teraz: () => POZNIEJ })

    const [w] = wczytajStan(magazyn).wyceny
    assert.deepEqual([w.klientId, w.klient], ['k1', { nazwa: 'Klient k1', adres: 'ul. Lipowa 3', termin: null }])
    assert.equal(w.zmieniona, POZNIEJ.toISOString())
  })

  it('wysłana oferta bez klienta zostaje aktualna, bo zamkniętej wyceny nie da się wysłać od nowa', () => {
    const oferta = { wyslana: '2026-10-30', nieaktualna: false }
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], wyceny: [wycena({ oferta })] })

    zaplanujZWyceny(magazyn, 'w1', DANE, { id: 'z1' })

    const [w] = wczytajStan(magazyn).wyceny
    assert.deepEqual([w.klientId, w.klient.nazwa, w.oferta.nieaktualna], ['k1', 'Klient k1', false])
  })

  it('wycena z klientem zostaje przy swoim kliencie, nawet gdy zlecenie ma innego', () => {
    const klient = { nazwa: 'Klient k2', adres: '', termin: null }
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1'), klientTestowy('k2')], wyceny: [wycena({ klientId: 'k2', klient })] })

    const z = zaplanujZWyceny(magazyn, 'w1', DANE, { id: 'z1' })

    const [w] = wczytajStan(magazyn).wyceny
    assert.deepEqual([z.klientId, w.klientId, w.klient], ['k1', 'k2', klient])
  })

  it('zlecenie, którego nie można zapisać, nie zmienia wyceny', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k2')], wyceny: [wycena()] })

    assert.throws(() => zaplanujZWyceny(magazyn, 'w1', DANE, { id: 'z1' }), blad('brak_klienta'))
    assert.equal(wczytajStan(magazyn).wyceny[0].klientId, null)
  })
})

describe('zmienOdWizyty', () => {
  /** @param {object} z @returns {[string, number | null][]} */
  const cenyWizyt = (z) => wystapienia(z, '2026-11-02', '2026-11-23').map((w) => [w.dataPierwotna, w.okres.cenaWizyty])
  const STAN_WIZYTY = { przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null }

  it('jednorazowe przesunięte na środę o 11:00: nowa godzina 12:00 widać w kalendarzu', () => {
    const wizyty = { '2026-11-02': { ...STAN_WIZYTY, przeniesiona: { data: '2026-11-04', godzina: '11:00' } } }
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [zlecenieTestowe('z1', { wizyty })] })

    const z = zlecenie(zmienOdWizyty(magazyn, 'z1', '2026-11-02', { godzina: '12:00' }), 'z1')

    assert.deepEqual(wystapienia(z, '2026-11-02', '2026-11-08').map((w) => [w.data, w.godzina]), [['2026-11-04', '12:00']])
    assert.deepEqual(z?.wizyty['2026-11-02'].przeniesiona, { data: '2026-11-04', godzina: null })
  })

  it('przesunięcie samej godziny znika po zmianie godziny, a wpis bez innych zmian razem z nim', () => {
    const wizyty = { '2026-11-09': { ...STAN_WIZYTY, przeniesiona: { data: '2026-11-09', godzina: '11:00' } } }
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1', { wizyty })] })

    const z = zlecenie(zmienOdWizyty(magazyn, 'z1', '2026-11-09', { godzina: '12:00' }), 'z1')

    assert.deepEqual(z?.wizyty, {})
    assert.deepEqual(wystapienia(z, '2026-11-09', '2026-11-09').map((w) => w.godzina), ['12:00'])
  })

  it('zrobiona wizyta z przesunięciem samej godziny zostaje zrobiona po zmianie godziny', () => {
    const zrobiona = TERAZ.toISOString()
    const wizyty = { '2026-11-09': { ...STAN_WIZYTY, zrobiona, przeniesiona: { data: '2026-11-09', godzina: '11:00' } } }
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1', { wizyty })] })

    const z = zlecenie(zmienOdWizyty(magazyn, 'z1', '2026-11-09', { godzina: '12:00' }), 'z1')

    assert.deepEqual(z?.wizyty['2026-11-09'], { ...STAN_WIZYTY, zrobiona })
  })

  it('zmiana ceny zostawia godzinę przesunięcia', () => {
    const przeniesiona = { data: '2026-11-10', godzina: '11:00' }
    const wizyty = { '2026-11-09': { ...STAN_WIZYTY, przeniesiona } }
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1', { wizyty })] })

    const z = zlecenie(zmienOdWizyty(magazyn, 'z1', '2026-11-09', { cenaWizyty: 280 }), 'z1')

    assert.deepEqual(z?.wizyty['2026-11-09'].przeniesiona, przeniesiona)
  })

  it('w serii od 2026-11-02 cena 280 od 2026-11-16: 09.11 ma starą cenę, 16.11 i dalej — 280', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1')] })

    const stan = zmienOdWizyty(magazyn, 'z1', '2026-11-16', { cenaWizyty: 280 }, { teraz: () => POZNIEJ })

    const z = zlecenie(stan, 'z1')
    assert.deepEqual(cenyWizyt(z), [['2026-11-02', 250], ['2026-11-09', 250], ['2026-11-16', 280], ['2026-11-23', 280]])
    assert.deepEqual(z?.okresy[1], { od: '2026-11-16', cykl: TYDZIEN_PN, godzina: '09:00', cenaWizyty: 280, cenaMiesiaca: null })
    assert.equal(z?.zmienione, POZNIEJ.toISOString())
  })

  it('drugi zapis z tym samym dniem zastępuje okres zamiast dokładać', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1')] })
    zmienOdWizyty(magazyn, 'z1', '2026-11-16', { cenaWizyty: 280 })

    const stan = zmienOdWizyty(magazyn, 'z1', '2026-11-16', { godzina: '11:00' })

    assert.deepEqual(zlecenie(stan, 'z1')?.okresy.map((o) => [o.od, o.godzina, o.cenaWizyty]),
      [['2026-11-02', '09:00', 250], ['2026-11-16', '11:00', 280]])
  })

  it('zmiana od wizyty działa w przód: cena 300 od 16.11 nadpisuje też późniejszy okres godziny od 30.11 (R13)', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1')] })
    zmienOdWizyty(magazyn, 'z1', '2026-11-30', { godzina: '11:00' })

    const stan = zmienOdWizyty(magazyn, 'z1', '2026-11-16', { cenaWizyty: 300 })

    const z = zlecenie(stan, 'z1')
    assert.deepEqual(z?.okresy.map((o) => [o.od, o.godzina, o.cenaWizyty]),
      [['2026-11-02', '09:00', 250], ['2026-11-16', '09:00', 300], ['2026-11-30', '11:00', 300]])
    assert.deepEqual(wystapienia(z, '2026-11-23', '2026-12-14').map((w) => [w.data, w.godzina, w.okres.cenaWizyty]),
      [['2026-11-23', '09:00', 300], ['2026-11-30', '11:00', 300], ['2026-12-07', '11:00', 300], ['2026-12-14', '11:00', 300]])
  })

  it('zmiana cyklu na co dwa tygodnie od 16.11 usuwa późniejszy okres godziny od 23.11: wizyty 16.11, 30.11, 14.12', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1')] })
    zmienOdWizyty(magazyn, 'z1', '2026-11-23', { godzina: '11:00' })

    const stan = zmienOdWizyty(magazyn, 'z1', '2026-11-16', { cykl: { co: 'dwa_tygodnie', dni: [1] } })

    const z = zlecenie(stan, 'z1')
    assert.deepEqual(z?.okresy.map((o) => o.od), ['2026-11-02', '2026-11-16'])
    assert.deepEqual(wystapienia(z, '2026-11-16', '2026-12-20').map((w) => [w.data, w.godzina]),
      [['2026-11-16', '09:00'], ['2026-11-30', '09:00'], ['2026-12-14', '09:00']])
  })

  it('zmiana cyklu na co miesiąc od 16.11 przy późniejszym okresie od 30.11 daje jedną wizytę w miesiącu, 16. dnia', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1')] })
    zmienOdWizyty(magazyn, 'z1', '2026-11-30', { cenaWizyty: 300 })

    const stan = zmienOdWizyty(magazyn, 'z1', '2026-11-16', { cykl: { co: 'miesiac', dni: [] } })

    assert.deepEqual(wystapienia(zlecenie(stan, 'z1'), '2026-11-16', '2027-01-31').map((w) => [w.data, w.okres.cenaWizyty]),
      [['2026-11-16', 250], ['2026-12-16', 250], ['2027-01-16', 250]])
  })

  it('seria co miesiąc od 31.01 po zmianie ceny od wizyty 28.02 dalej wypada 31.03, 30.04, 31.05', () => {
    const coMiesiac = zlecenieTestowe('z1', { start: '2026-01-31',
      okresy: [{ od: '2026-01-31', cykl: { co: 'miesiac', dni: [] }, godzina: null, cenaWizyty: 250, cenaMiesiaca: null }] })
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [coMiesiac] })

    const stan = zmienOdWizyty(magazyn, 'z1', '2026-02-28', { cenaWizyty: 300 })

    assert.deepEqual(wystapienia(zlecenie(stan, 'z1'), '2026-01-01', '2026-05-31').map((w) => [w.data, w.okres.cenaWizyty]),
      [['2026-01-31', 250], ['2026-02-28', 300], ['2026-03-31', 300], ['2026-04-30', 300], ['2026-05-31', 300]])
  })

  it('w zleceniu jednorazowym zmienia jedyny okres; dodanie cyklu → jednorazowe', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [zlecenieTestowe('z1')] })

    const stan = zmienOdWizyty(magazyn, 'z1', '2026-11-02', { cenaWizyty: 220, godzina: '08:30' })

    assert.deepEqual(zlecenie(stan, 'z1')?.okresy, [{ od: '2026-11-02', cykl: null, godzina: '08:30', cenaWizyty: 220, cenaMiesiaca: null }])
    assert.throws(() => zmienOdWizyty(magazyn, 'z1', '2026-11-02', { cykl: TYDZIEN_PN }), blad('jednorazowe'))
  })

  it('wizyta przed startem → data, nieznane pole → nieznane_pole, seria bez cyklu → cykl, nieznane zlecenie → brak_zlecenia', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1')] })

    assert.throws(() => zmienOdWizyty(magazyn, 'z1', '2026-10-26', { cenaWizyty: 280 }), blad('data'))
    assert.throws(() => zmienOdWizyty(magazyn, 'z1', '2026-11-16', { cena: 280 }), blad('nieznane_pole'))
    assert.throws(() => zmienOdWizyty(magazyn, 'z1', '2026-11-16', { cykl: null }), blad('cykl'))
    assert.throws(() => zmienOdWizyty(magazyn, 'z9', '2026-11-16', { cenaWizyty: 280 }), blad('brak_zlecenia'))
    assert.equal(zlecenie(wczytajStan(magazyn), 'z1')?.okresy.length, 1)
  })
})

describe('zakonczSerie i usunZlecenie', () => {
  it('zakonczSerie zapisuje ostatni dzień; dzień przed startem → koniec, zlecenie jednorazowe → jednorazowe', () => {
    const { magazyn } = magazynZeStanem({
      ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1'), zlecenieTestowe('z2')],
    })

    assert.throws(() => zakonczSerie(magazyn, 'z1', '2026-11-01'), blad('koniec'))
    assert.throws(() => zakonczSerie(magazyn, 'z2', '2026-11-30'), blad('jednorazowe'))
    assert.equal(zlecenie(zakonczSerie(magazyn, 'z1', '2026-11-30'), 'z1')?.koniec, '2026-11-30')
  })

  it('usunZlecenie usuwa tylko wskazane; nieznane → brak_zlecenia', () => {
    const { magazyn } = magazynZeStanem({
      ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [seriaTestowa('z1'), zlecenieTestowe('z2')],
    })

    assert.deepEqual(usunZlecenie(magazyn, 'z1').zlecenia.map((z) => z.id), ['z2'])
    assert.throws(() => usunZlecenie(magazyn, 'z1'), blad('brak_zlecenia'))
  })
})

describe('odczyty wycen i klientów', () => {
  const stan = {
    zlecenia: [
      zlecenieTestowe('z1', { wycenaId: 'w1' }),
      seriaTestowa('z2', { klientId: 'k2', wycenaId: 'w2' }),
      zlecenieTestowe('z3', { klientId: 'k2' }),
    ],
  }

  it('czyWycenaZamknieta: true dla wyceny ze zleceniem, false bez', () => {
    assert.equal(czyWycenaZamknieta(stan, 'w1'), true)
    assert.equal(czyWycenaZamknieta(stan, 'w3'), false)
  })

  it('zleceniaKlienta i zleceniaWyceny w kolejności zapisu', () => {
    assert.deepEqual(zleceniaKlienta(stan, 'k2').map((z) => z.id), ['z2', 'z3'])
    assert.deepEqual(zleceniaWyceny(stan, 'w2').map((z) => z.id), ['z2'])
    assert.deepEqual(zleceniaWyceny(stan, 'w9'), [])
  })

  it('doZaplanowania: przyjęta jednorazowa ze zleceniem → false, bez zlecenia → true, nieprzyjęta → false', () => {
    const jednorazowa = { cena: 300, minutyNormowe: 200, wizytWMiesiacu: 1 }

    assert.equal(doZaplanowania(stan, wycenaTestowa('w1', 'przyjeta', jednorazowa)), false)
    assert.equal(doZaplanowania(stan, wycenaTestowa('w3', 'przyjeta', jednorazowa)), true)
    assert.equal(doZaplanowania(stan, wycenaTestowa('w3', 'wyslana', jednorazowa)), false)
  })

  it('doZaplanowania: przyjęty abonament z samymi zleceniami jednorazowymi → true, ze zleceniem z cyklem → false', () => {
    assert.equal(doZaplanowania(stan, wycenaTestowa('w1', 'przyjeta')), true)
    assert.equal(doZaplanowania(stan, wycenaTestowa('w2', 'przyjeta')), false)
  })
})
