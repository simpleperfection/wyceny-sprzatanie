import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { dodajKlienta } from '../dane/klienci.js'
import { utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { odwolajWizyte, oznaczZaplacona, oznaczZrobiona, przesunWizyte, wpiszCzasPracy } from '../dane/wizyty.js'
import { zapiszWycene, zmienStatus } from '../dane/wyceny.js'
import { utworzZlecenie } from '../dane/zlecenia.js'
import { nowySzkic, zmienWejscie } from '../kreator/stan.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { zl } from '../ui/format.js'
import { historiaPlanuIFaktu } from './plan-fakt.js'
import { modelWizyty } from './wizyta-dane.js'

/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../dane/zlecenia-ksztalt.js').StanWizyty} StanWizyty */
/** @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */

const NBSP = ' '
const DZIS = '2026-11-02'
const JUTRO = '2026-11-03'
const PRZED_WIZYTA = '2026-11-01'
const ADRES = 'ul. Lipowa 3, Warszawa'
const ZA_WIZYTE = { uslugaId: 'mieszkanie_standard', rozliczenie: 'za_wizyte', start: DZIS, godzina: '09:00', cenaWizyty: 250 }
const TYGODNIOWA = { cykl: { co: 'tydzien', dni: [1] } }
const POLUDNIE = { teraz: () => new Date('2026-11-02T12:00:00Z') }

/** @type {Katalog} */
let katalog
/** @type {Domyslne} */
let domyslne

before(async () => {
  katalog = await katalogZDysku()
  domyslne = await wczytajDomyslne(czytajJson)
})

const nowyMagazyn = () => utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })

/**
 * Magazyn z klientem i zleceniem za wizyte (9:00, 250 zl) na DZIS.
 * @param {Record<string, unknown>} [dane] pola zlecenia zamiast domyslnych @returns {Magazyn}
 */
function magazynZZleceniem(dane = {}) {
  const magazyn = nowyMagazyn()
  dodajKlienta(magazyn, { nazwa: 'Anna Kowalska', adres: ADRES }, { id: 'k1' })
  utworzZlecenie(magazyn, /** @type {never} */ ({ klientId: 'k1', ...ZA_WIZYTE, ...dane }), { id: 'z1' })
  return magazyn
}

/** @param {Magazyn} magazyn @param {string} [data] @param {string} [dzis] */
function model(magazyn, data = DZIS, dzis = DZIS) {
  const wynik = modelWizyty(wczytajStan(magazyn), katalog, 'z1', data, dzis)
  assert.ok(wynik !== null, `brak modelu wizyty ${data}`)
  return wynik
}

/**
 * Stan z podmienionymi polami, ktorych nie da sie ustawic zapisem (wizyty z wersji 1, plan i wycena zlecenia).
 * @param {Magazyn} magazyn @param {(z: Zlecenie) => Zlecenie} zmiana @param {Partial<Stan>} [pola] @returns {Stan}
 */
function stanZeZmiana(magazyn, zmiana, pola = {}) {
  const stan = wczytajStan(magazyn)
  return { ...stan, zlecenia: stan.zlecenia.map(zmiana), ...pola }
}

/** @param {Partial<StanWizyty>} pola @returns {StanWizyty} */
const wizyta = (pola) => ({ przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null, ...pola })

/** Magazyn firmy z przyjeta wycena mieszkania 50 m²; zlecenie `z1` ma jej id. @returns {Magazyn} */
function magazynZWycena() {
  const magazyn = nowyMagazyn()
  zapiszUstawienia(magazyn, { wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony' }, domyslne)
  const kontekst = { katalog, domyslne, magazyn }
  const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
  const pomieszczenia = ukladMieszkania(50, {}, katalog.uklady).map((p) => ({ ...p, brud: [{ id: 'kurz', poziom: 1 }] }))
  zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia, dojazdKm: 0 }))
  zapiszWycene(magazyn, id)
  zmienStatus(magazyn, id, 'przyjeta')
  dodajKlienta(magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1' })
  utworzZlecenie(magazyn, /** @type {never} */ ({ klientId: 'k1', ...ZA_WIZYTE }), { id: 'z1' })
  return magazyn
}

describe('modelWizyty: dane ekranu', () => {
  it('wizyta za wizytę ma klienta, adres, termin, kwotę, usługę, powrót do dnia i link do zlecenia', () => {
    const m = model(magazynZZleceniem(), DZIS, PRZED_WIZYTA)

    assert.deepEqual(m.klient, { nazwa: 'Anna Kowalska', adres: '#/klienci/k1' })
    assert.deepEqual([m.adres, m.termin, m.kwota], [ADRES, 'pn 2 lis, 9:00', `250${NBSP}zł`])
    assert.equal(m.usluga, 'Mieszkanie lub dom – sprzątanie standardowe')
    assert.equal(m.powrot, '#/zlecenia/dzien?data=2026-11-02')
    assert.deepEqual(m.linki, { zmienOd: null, zlecenie: '#/zlecenie/z1', wycena: null })
  })

  it('powrót z wizyty dzisiejszej idzie do widoku Dzień bez daty, a opis zlecenia zastępuje nazwę usługi', () => {
    const m = model(magazynZZleceniem({ uslugaId: null, opis: 'Mycie witryny' }))

    assert.deepEqual([m.powrot, m.usluga], ['#/zlecenia/dzien', 'Mycie witryny'])
  })

  it('wizyta bez godziny ma sam dzień w terminie', () => {
    assert.equal(model(magazynZZleceniem({ godzina: null })).termin, 'pn 2 lis')
  })

  it('wizyta serii ma link „Zmień od tej wizyty” z datą pierwotną', () => {
    const m = model(magazynZZleceniem(TYGODNIOWA), '2026-11-09')

    assert.equal(m.linki.zmienOd, '#/zlecenie/z1?od=2026-11-09')
  })

  it('zlecenie z wyceny ma link „Wycena {numer}”, a wycena bez numeru albo usunięta go nie ma', () => {
    const magazyn = magazynZZleceniem()
    const zWycena = (/** @type {Zlecenie} */ z) => ({ ...z, wycenaId: 'w1' })
    const zNumerem = stanZeZmiana(magazyn, zWycena, { wyceny: /** @type {never} */ ([{ id: 'w1', numer: '3/11/2026' }]) })
    const szkic = stanZeZmiana(magazyn, zWycena, { wyceny: /** @type {never} */ ([{ id: 'w1', numer: null }]) })

    assert.deepEqual(modelWizyty(zNumerem, katalog, 'z1', DZIS, DZIS)?.linki.wycena, { tekst: 'Wycena 3/11/2026', adres: '#/wycena/w1' })
    assert.equal(modelWizyty(szkic, katalog, 'z1', DZIS, DZIS)?.linki.wycena, null)
    assert.equal(modelWizyty(stanZeZmiana(magazyn, zWycena), katalog, 'z1', DZIS, DZIS)?.linki.wycena, null)
  })

  it('nieznane zlecenie, zły dzień i dzień, którego reguła nie daje, dają null', () => {
    const stan = wczytajStan(magazynZZleceniem())

    assert.deepEqual([modelWizyty(stan, katalog, 'brak', DZIS, DZIS), modelWizyty(stan, katalog, 'z1', 'wczoraj', DZIS),
      modelWizyty(stan, katalog, 'z1', JUTRO, DZIS)], [null, null, null])
  })
})

describe('modelWizyty: zapłata', () => {
  it('wizyta serii miesięcznej nie ma akcji zapłaty, a kwota to „w abonamencie”; wizyta za wizytę ma akcję z formą domyślną', () => {
    const miesieczna = model(magazynZZleceniem({ ...TYGODNIOWA, rozliczenie: 'miesiecznie', cenaWizyty: undefined, cenaMiesiaca: 1200 }))
    const zaWizyte = model(magazynZZleceniem())

    assert.deepEqual([miesieczna.zaplata, miesieczna.kwota], [null, 'w abonamencie'])
    assert.deepEqual(zaWizyte.zaplata, { rodzaj: 'do_zaplaty', forma: 'gotowka' })
  })

  it('domyślna forma to forma ostatniej zapłaty klienta', () => {
    const magazyn = magazynZZleceniem(TYGODNIOWA)
    oznaczZaplacona(magazyn, 'z1', DZIS, { forma: 'blik' })

    assert.deepEqual(model(magazyn, '2026-11-09').zaplata, { rodzaj: 'do_zaplaty', forma: 'blik' })
  })

  it('zapłatę można oznaczyć przed dniem wizyty, a „Zrobione” dopiero od dnia wizyty', () => {
    const przed = model(magazynZZleceniem(), DZIS, PRZED_WIZYTA)
    const wDniu = model(magazynZZleceniem())

    assert.deepEqual([przed.zaplata?.rodzaj, przed.czyMozeZrobione], ['do_zaplaty', false])
    assert.equal(wDniu.czyMozeZrobione, true)
  })

  it('zapisana zapłata daje „Zapłacone · {forma} · {data}” i pigułkę „Zapłacone” zamiast „Niezapłacone”', () => {
    const magazyn = magazynZZleceniem()
    oznaczZrobiona(magazyn, 'z1', DZIS, POLUDNIE)
    const przed = model(magazyn)
    oznaczZaplacona(magazyn, 'z1', DZIS, { forma: 'przelew', ...POLUDNIE })

    const m = model(magazyn)

    assert.deepEqual([przed.pigulki, przed.czyZrobiona, przed.czyMozeZrobione], [['zrobiona', 'niezaplacona'], true, false])
    assert.deepEqual(m.zaplata, { rodzaj: 'zapisana', tekst: 'Zapłacone · Przelew · pn 2 lis', forma: 'przelew' })
    assert.deepEqual(m.pigulki, ['zrobiona', 'zaplacona'])
  })

  it('przeniesiona wizyta z formą null pokazuje „Zapłacone” bez formy, a zmiana formy startuje od formy domyślnej', () => {
    const zaplata = { forma: null, data: DZIS, kwota: 250 }
    const stan = stanZeZmiana(magazynZZleceniem(), (z) => ({ ...z, wizyty: { [DZIS]: wizyta({ zrobiona: '2026-11-02T12:00:00.000Z', zaplata }) } }))

    assert.deepEqual(modelWizyty(stan, katalog, 'z1', DZIS, DZIS)?.zaplata, { rodzaj: 'zapisana', tekst: 'Zapłacone', forma: 'gotowka' })
  })

  it('wizyta za 0 zł nie ma akcji zapłaty ani pigułki „Niezapłacone”', () => {
    const magazyn = magazynZZleceniem({ cenaWizyty: 0 })
    oznaczZrobiona(magazyn, 'z1', DZIS)

    const m = model(magazyn)

    assert.deepEqual([m.zaplata, m.pigulki], [null, ['zrobiona']])
  })
})

describe('modelWizyty: przesunięcie', () => {
  it('przesunięta wizyta pokazuje nowy termin i pigułkę „Przesunięta”, a powrót na datę pierwotną ją usuwa', () => {
    const magazyn = magazynZZleceniem()
    przesunWizyte(magazyn, 'z1', DZIS, { data: JUTRO, godzina: '11:00' })

    const przesunieta = model(magazyn)
    przesunWizyte(magazyn, 'z1', DZIS, { data: DZIS })
    const poCofnieciu = model(magazyn)

    assert.deepEqual([przesunieta.termin, przesunieta.pigulki], ['wt 3 lis, 11:00', ['przesunieta']])
    assert.deepEqual([przesunieta.powrot, przesunieta.przesuniecie], ['#/zlecenia/dzien?data=2026-11-03', { data: JUTRO, godzina: '11:00' }])
    assert.deepEqual([poCofnieciu.termin, poCofnieciu.pigulki], ['pn 2 lis, 9:00', []])
  })

  it('wizyta przesunięta bez godziny zostaje przy godzinie i cenie okresu daty pierwotnej', () => {
    const magazyn = magazynZZleceniem({ cenaWizyty: 300 })
    przesunWizyte(magazyn, 'z1', DZIS, { data: '2026-12-01', godzina: null })

    const m = model(magazyn)

    assert.deepEqual([m.kwota, m.termin], [`300${NBSP}zł`, 'wt 1 gru, 9:00'])
  })

  it('wizyta bez godziny daje w przesunięciu pustą godzinę, a pole daty startuje od jej dnia', () => {
    assert.deepEqual(model(magazynZZleceniem({ godzina: null })).przesuniecie, { data: DZIS, godzina: '' })
  })
})

describe('modelWizyty: czas pracy', () => {
  it('plan 270 min i czas 300 min dają „Plan 4 h 30 min”, „Fakt 5 h” i stawkę z historiaPlanuIFaktu', () => {
    const magazyn = magazynZWycena()
    wpiszCzasPracy(magazyn, 'z1', DZIS, 300)
    const [w] = wczytajStan(magazyn).wyceny
    const stan = stanZeZmiana(magazyn, (z) => ({ ...z, wycenaId: w.id, plan: { minutyNormowe: 200, tempo: 1.35 } }))

    const czasPracy = modelWizyty(stan, katalog, 'z1', DZIS, DZIS)?.czasPracy
    const stawka = historiaPlanuIFaktu(stan, katalog)[0]?.stawka ?? Number.NaN

    assert.deepEqual([czasPracy?.plan, czasPracy?.fakt], ['Plan 4 h 30 min', 'Fakt 5 h'])
    assert.equal(czasPracy?.zostaje, `Zostaje ${zl(stawka)}/h`)
    assert.match(czasPracy?.zostaje ?? '', /^Zostaje \d+ zł\/h$/)
  })

  it('zlecenie z planem bez wyceny pokazuje plan i fakt bez „Zostaje”', () => {
    const magazyn = magazynZZleceniem()
    wpiszCzasPracy(magazyn, 'z1', DZIS, 300)
    const stan = stanZeZmiana(magazyn, (z) => ({ ...z, plan: { minutyNormowe: 200, tempo: 1.35 } }))

    assert.deepEqual(modelWizyty(stan, katalog, 'z1', DZIS, DZIS)?.czasPracy, { plan: 'Plan 4 h 30 min', fakt: 'Fakt 5 h', zostaje: null })
  })

  it('wizyta zlecenia bez planu pokazuje sam fakt', () => {
    const magazyn = magazynZZleceniem()
    wpiszCzasPracy(magazyn, 'z1', DZIS, 255)

    assert.deepEqual(model(magazyn).czasPracy, { plan: null, fakt: 'Fakt 4 h 15 min', zostaje: null })
  })

  it('wizyta bez czasu nie ma planu i faktu, a licznik zlecenia bez planu startuje od godziny', () => {
    const m = model(magazynZZleceniem())

    assert.deepEqual([m.czasPracy, m.startCzasu], [null, 60])
  })

  it('licznik startuje od planu zaokrąglonego do 15 min, przy zapisanym czasie od niego, a przed dniem wizyty go nie ma', () => {
    const magazyn = magazynZZleceniem()
    const stanPlanu = stanZeZmiana(magazyn, (z) => ({ ...z, plan: { minutyNormowe: 200, tempo: 1.3 } }))
    wpiszCzasPracy(magazyn, 'z1', DZIS, 317)

    assert.equal(modelWizyty(stanPlanu, katalog, 'z1', DZIS, DZIS)?.startCzasu, 255)
    assert.equal(model(magazyn).startCzasu, 317)
    assert.equal(modelWizyty(stanPlanu, katalog, 'z1', DZIS, PRZED_WIZYTA)?.startCzasu, null)
  })
})

describe('modelWizyty: odwołanie', () => {
  it('odwołana wizyta ma tylko pigułkę „Odwołana” i nie ma zamknięcia, zapłaty, czasu ani przesunięcia', () => {
    const magazyn = magazynZZleceniem()
    przesunWizyte(magazyn, 'z1', DZIS, { data: JUTRO, godzina: '11:00' })
    odwolajWizyte(magazyn, 'z1', DZIS)

    const m = model(magazyn, DZIS, JUTRO)

    assert.deepEqual([m.czyOdwolana, m.pigulki, m.czyMozeZrobione], [true, ['odwolana'], false])
    assert.deepEqual([m.zaplata, m.startCzasu, m.przesuniecie], [null, null, null])
  })

  it('odwołana wizyta z zapłatą zostawia zapisany stan do cofnięcia', () => {
    const magazyn = magazynZZleceniem()
    oznaczZaplacona(magazyn, 'z1', DZIS, { forma: 'blik', ...POLUDNIE })
    odwolajWizyte(magazyn, 'z1', DZIS)

    assert.deepEqual(model(magazyn).zaplata, { rodzaj: 'zapisana', tekst: 'Zapłacone · BLIK · pn 2 lis', forma: 'blik' })
  })
})
