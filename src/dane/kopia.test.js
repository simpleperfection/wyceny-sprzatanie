import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import {
  BladKopii, czyPrzypomniecOKopii, dniOdKopii, odczytajKopie, oznaczKopie, podsumowanieKopii, utworzKopie, wczytajKopie,
} from './kopia.js'
import { BladMagazynu, KLUCZ_MAGAZYNU, utworzMagazyn } from './magazyn.js'

const TERAZ = new Date('2026-10-24T08:30:00.000Z')
const DZIS = new Date('2026-10-24T12:00:00.000Z')
const FIXTURE = new URL('../../tests/fixtures/kopia-v1.json', import.meta.url)
const MIGAWKA = {
  cena: 250, netto: 250, vat: 0, mediana: 250, widelki: { od: 200, do: 300, pelne: true }, minutyNormowe: 180, linie: [], propozycje: [],
  dojazd: { km: 0, kwota: 0 }, wojewodztwo: { id: 'mazowieckie', nazwa: 'mazowieckie', stawka_h: 70, wsp: 1.08 }, statusVat: 'zwolniony',
  stawkaVatProc: 23, podstawaCeny: 'brutto', wizytWMiesiacu: null, wersjaDanych: { ceny: 'c', normy: 'n', rynek: 'r' },
}
const USTAWIENIA = {
  wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony', firma: { nazwa: 'Lśniący Dom', telefon: '600100200', email: '', nip: '' },
  tempo: { reczne: null }, koszty: { sprzet: {}, dojazd: {} }, zakresy: {}, warunki: null, przypomnienieKopiiDni: 7, kreatorZakonczony: true,
}

/** Zapisana wycena (`do_wyslania` z numerem i wynikiem); `zmiana` nadpisuje pola. @param {string} id @param {object} [zmiana] */
const wycenaTestowa = (id, zmiana = {}) => ({
  id, numer: '1/10/2026', utworzona: '2026-10-10T10:00:00.000Z', zmieniona: '2026-10-10T10:00:00.000Z', status: 'do_wyslania',
  rodzaj: 'dokladna', klient: { nazwa: 'Jan Kowalski', adres: 'Warszawa', termin: null }, wejscie: { uslugaId: 'mieszkanie_standard' },
  szybka: null, odpowiedzi: {}, wynik: MIGAWKA, cenaReczna: null, wykonania: [],
  oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false }, ...zmiana,
})
/** @param {string} id @param {object} [zmiana] */
const szkicTestowy = (id, zmiana = {}) => wycenaTestowa(id, { numer: null, status: 'szkic', wynik: null, ...zmiana })

/** @param {object} [zmiana] @returns {any} */
const stanTestowy = (zmiana = {}) => ({
  wersja: 1, ustawienia: USTAWIENIA, wyceny: [wycenaTestowa('a')], licznikNumerow: { '2026-10': 1 },
  kopia: { ostatnia: null, zmianaOd: null }, preferencje: { iosInstrukcjaZamknieta: false }, ...zmiana,
})

/** @param {object} [stan] */
function magazynZeStanem(stan) {
  const storage = new PamiecMagazynu()
  const magazyn = utworzMagazyn(storage, { teraz: () => TERAZ, loguj: () => {}, poprosOTrwalosc: () => true })
  if (stan) magazyn.zapiszCalosc(stan)
  return { magazyn, storage }
}

/** @param {{ wczytaj: () => object }} magazyn @returns {any} */
function zapisanyStan(magazyn) {
  const wynik = magazyn.wczytaj()
  assert.ok('stan' in wynik)
  return wynik.stan
}

/** @param {object} koperta zmiany koperty pliku */
const plik = (koperta) => JSON.stringify({ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: 1, utworzona: TERAZ.toISOString(), stan: stanTestowy(), ...koperta })
/** @param {string} kod */
const bladKopii = (kod) => ({ name: BladKopii.name, kod })

describe('utworzKopie', () => {
  it('kopia odczytana z powrotem daje ten sam stan, a nazwa pliku ma dzień kopii', () => {
    const stan = stanTestowy({ licznikNumerow: { '2026-10': 3, '2026-09': 7 } })

    const { nazwaPliku, tresc } = utworzKopie(stan, TERAZ)
    const { stan: odczytany } = odczytajKopie(tresc)

    assert.equal(nazwaPliku, 'wyceny-kopia-2026-10-24.json')
    assert.deepEqual(odczytany.wyceny, [wycenaTestowa('a')])
    assert.deepEqual(odczytany.ustawienia, USTAWIENIA)
    assert.deepEqual(odczytany.licznikNumerow, { '2026-10': 3, '2026-09': 7 })
    assert.deepEqual(Object.keys(JSON.parse(tresc)), ['aplikacja', 'wersjaSchematu', 'utworzona', 'stan'])
    assert.equal(JSON.parse(tresc).utworzona, '2026-10-24T08:30:00.000Z')
  })

  it('stan złego kształtu albo zła data → BladKopii', () => {
    assert.throws(() => utworzKopie(stanTestowy({ wyceny: {} }), TERAZ), bladKopii('uszkodzony'))
    assert.throws(() => utworzKopie(stanTestowy(), new Date('nie data')), bladKopii('data'))
  })
})

describe('odczytajKopie', () => {
  it('plik tests/fixtures/kopia-v1.json wczytuje się bez błędów', async () => {
    const { stan } = odczytajKopie(await readFile(FIXTURE, 'utf8'))

    assert.deepEqual(stan.wyceny.map((w) => [w.numer, w.status]), [['1/10/2026', 'przyjeta'], [null, 'szkic']])
    assert.equal(stan.ustawienia?.firma.nazwa, 'Lśniący Dom')
    assert.deepEqual(stan.licznikNumerow, { '2026-10': 1 })
  })

  it('„to nie json”, inna aplikacja i wersja 2 → zly_plik, zly_plik, nowsza_wersja', () => {
    assert.throws(() => odczytajKopie('to nie json'), bladKopii('zly_plik'))
    assert.throws(() => odczytajKopie(plik({ aplikacja: 'inna' })), bladKopii('zly_plik'))
    assert.throws(() => odczytajKopie(plik({ wersjaSchematu: 2, stan: { ...stanTestowy(), wersja: 2 } })), bladKopii('nowsza_wersja'))
  })

  it('brak tablicy wyceny albo wersji schematu → zly_plik', () => {
    assert.throws(() => odczytajKopie(plik({ stan: stanTestowy({ wyceny: null }) })), bladKopii('zly_plik'))
    assert.throws(() => odczytajKopie(plik({ wersjaSchematu: '1' })), bladKopii('zly_plik'))
  })

  it('zły kształt wycen → uszkodzony', () => {
    const zle = [
      wycenaTestowa('a', { status: 'zaplacona' }),
      wycenaTestowa('a', { klient: { nazwa: 1, adres: '', termin: null } }),
      wycenaTestowa('a', { numer: null }),
      wycenaTestowa('a', { wykonania: [{ id: 'w', data: '2026-10-20', minuty: '90', tempoPlanu: 1 }] }),
    ]
    for (const wycena of zle) {
      assert.throws(() => odczytajKopie(plik({ stan: stanTestowy({ wyceny: [wycena] }) })), bladKopii('uszkodzony'))
    }
    assert.throws(() => odczytajKopie(plik({ stan: stanTestowy({ wyceny: [wycenaTestowa('a'), szkicTestowy('a')] }) })), bladKopii('uszkodzony'))
  })

  it('tekst do 2000 znaków przechodzi, dłuższy i ponad 5000 wycen → uszkodzony', () => {
    const zUwagami = (/** @type {number} */ n) => stanTestowy({ wyceny: [wycenaTestowa('a', { odpowiedzi: { uwagi: 'x'.repeat(n) } })] })
    const wiele = Array.from({ length: 5001 }, (_, i) => szkicTestowy(`s${i}`))

    assert.equal(odczytajKopie(plik({ stan: zUwagami(2000) })).stan.wyceny[0].odpowiedzi.uwagi, 'x'.repeat(2000))
    assert.throws(() => odczytajKopie(plik({ stan: zUwagami(2001) })), bladKopii('uszkodzony'))
    assert.throws(() => odczytajKopie(plik({ stan: stanTestowy({ wyceny: wiele }) })), bladKopii('uszkodzony'))
  })

  it('zagnieżdżenie ponad 32 poziomy i wersja stanu inna niż koperty → uszkodzony', () => {
    /** @type {object} */
    let gleboko = { koniec: true }
    for (let i = 0; i < 40; i += 1) gleboko = { dalej: gleboko }

    assert.throws(() => odczytajKopie(plik({ stan: stanTestowy({ wyceny: [wycenaTestowa('a', { odpowiedzi: gleboko })] }) })), bladKopii('uszkodzony'))
    assert.throws(() => odczytajKopie(plik({ stan: { ...stanTestowy(), wersja: 0 } })), bladKopii('uszkodzony'))
  })
})

describe('wczytajKopie', () => {
  const lokalny = stanTestowy({
    wyceny: [wycenaTestowa('a', { zmieniona: '2026-10-10T10:00:00.000Z' }), wycenaTestowa('b', { zmieniona: '2026-10-20T10:00:00.000Z' }),
      szkicTestowy('c')],
    licznikNumerow: { '2026-10': 5, '2026-09': 2 },
  })
  const zPliku = stanTestowy({
    ustawienia: { ...USTAWIENIA, przypomnienieKopiiDni: 30 },
    wyceny: [wycenaTestowa('a', { zmieniona: '2026-10-15T10:00:00.000Z', numer: '9/10/2026' }),
      wycenaTestowa('b', { zmieniona: '2026-10-12T10:00:00.000Z', numer: '9/10/2026' }), wycenaTestowa('d', { numer: '6/10/2026' })],
    licznikNumerow: { '2026-10': 7, '2026-08': 1 },
  })

  it('polacz: nowsza z pliku zastępuje lokalną, starsza zostaje lokalna, nowe dochodzą, licznik = maksimum', () => {
    const { magazyn } = magazynZeStanem(lokalny)

    wczytajKopie(magazyn, zPliku, 'polacz')

    const stan = zapisanyStan(magazyn)
    assert.deepEqual(stan.wyceny.map((/** @type {any} */ w) => [w.id, w.zmieniona]), [
      ['a', '2026-10-15T10:00:00.000Z'], ['b', '2026-10-20T10:00:00.000Z'], ['c', '2026-10-10T10:00:00.000Z'], ['d', '2026-10-10T10:00:00.000Z'],
    ])
    assert.deepEqual(stan.licznikNumerow, { '2026-10': 7, '2026-09': 2, '2026-08': 1 })
    assert.equal(stan.ustawienia.przypomnienieKopiiDni, 7)
  })

  it('polacz bez lokalnych ustawień bierze ustawienia z pliku', () => {
    const { magazyn } = magazynZeStanem(stanTestowy({ ustawienia: null }))

    wczytajKopie(magazyn, zPliku, 'polacz')

    assert.equal(zapisanyStan(magazyn).ustawienia.przypomnienieKopiiDni, 30)
  })

  it('zastap usuwa wyceny spoza pliku i zapisuje cały stan z pliku', () => {
    const { magazyn, storage } = magazynZeStanem(lokalny)

    wczytajKopie(magazyn, zPliku, 'zastap')

    assert.deepEqual(JSON.parse(storage.getItem(KLUCZ_MAGAZYNU) ?? 'null'), zPliku)
  })

  it('zastap działa przy uszkodzonym magazynie, polacz → BladMagazynu; nieznany tryb → BladKopii', () => {
    const { magazyn, storage } = magazynZeStanem()
    storage.setItem(KLUCZ_MAGAZYNU, '{"wersja":1,')

    assert.throws(() => wczytajKopie(magazyn, zPliku, 'polacz'), { name: BladMagazynu.name, kod: 'uszkodzony' })
    assert.throws(() => wczytajKopie(magazyn, zPliku, /** @type {any} */ ('dopisz')), bladKopii('tryb'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), '{"wersja":1,')
    wczytajKopie(magazyn, zPliku, 'zastap')
    assert.deepEqual(zapisanyStan(magazyn).wyceny.map((/** @type {any} */ w) => w.id), ['a', 'b', 'd'])
  })
})

describe('oznaczKopie', () => {
  it('zapisuje datę kopii i zostawia datę zmiany', () => {
    const { magazyn } = magazynZeStanem(stanTestowy({ kopia: { ostatnia: null, zmianaOd: '2026-10-20T10:00:00.000Z' } }))

    oznaczKopie(magazyn, TERAZ)

    assert.deepEqual(zapisanyStan(magazyn).kopia, { ostatnia: '2026-10-24T08:30:00.000Z', zmianaOd: '2026-10-20T10:00:00.000Z' })
  })

  it('uszkodzony magazyn → BladMagazynu, zła data → BladKopii', () => {
    const { magazyn, storage } = magazynZeStanem()
    assert.throws(() => oznaczKopie(magazyn, new Date('nie data')), bladKopii('data'))
    storage.setItem(KLUCZ_MAGAZYNU, 'zepsute')
    assert.throws(() => oznaczKopie(magazyn, TERAZ), { name: BladMagazynu.name, kod: 'uszkodzony' })
  })
})

describe('przypomnienie o kopii', () => {
  const KOPIA_SPRZED_8_DNI = '2026-10-16T12:00:00.000Z'
  const zKopia = (/** @type {string | null} */ zmianaOd, ustawienia = USTAWIENIA) =>
    stanTestowy({ ustawienia, kopia: { ostatnia: KOPIA_SPRZED_8_DNI, zmianaOd } })

  it('kopia sprzed 8 dni i zmiana po niej → true; przy 14 dniach → false; bez zmian → false', () => {
    assert.equal(czyPrzypomniecOKopii(zKopia('2026-10-18T09:00:00.000Z'), DZIS), true)
    assert.equal(czyPrzypomniecOKopii(zKopia('2026-10-18T09:00:00.000Z', { ...USTAWIENIA, przypomnienieKopiiDni: 14 }), DZIS), false)
    assert.equal(czyPrzypomniecOKopii(zKopia('2026-10-15T09:00:00.000Z'), DZIS), false)
    assert.equal(czyPrzypomniecOKopii(zKopia(null), DZIS), false)
  })

  it('brak kopii: wycena sprzed 7 dni → true, sprzed 6 dni → false; same szkice → false', () => {
    const zWycena = (/** @type {string} */ utworzona, status = 'do_wyslania') =>
      stanTestowy({ ustawienia: null, wyceny: [wycenaTestowa('a', { utworzona, status }), szkicTestowy('s', { utworzona: '2026-09-01T12:00:00.000Z' })] })

    assert.equal(czyPrzypomniecOKopii(zWycena('2026-10-17T12:00:00.000Z'), DZIS), true)
    assert.equal(czyPrzypomniecOKopii(zWycena('2026-10-18T12:00:00.000Z'), DZIS), false)
    assert.equal(czyPrzypomniecOKopii(stanTestowy({ wyceny: [szkicTestowy('s', { utworzona: '2026-09-01T12:00:00.000Z' })] }), DZIS), false)
  })

  it('dniOdKopii: 8 dni albo null bez kopii; zła data → BladKopii', () => {
    assert.equal(dniOdKopii(zKopia(null), DZIS), 8)
    assert.equal(dniOdKopii(stanTestowy(), DZIS), null)
    assert.throws(() => dniOdKopii(stanTestowy(), new Date('nie data')), bladKopii('data'))
    assert.throws(() => czyPrzypomniecOKopii(stanTestowy(), new Date('nie data')), bladKopii('data'))
  })
})

describe('podsumowanieKopii', () => {
  it('liczy wyceny, wykonania i obecność ustawień', () => {
    const wykonanie = { id: 'w', data: '2026-10-20', minuty: 90, tempoPlanu: 1 }
    const stan = stanTestowy({ wyceny: [wycenaTestowa('a', { wykonania: [wykonanie, wykonanie] }), wycenaTestowa('b', { wykonania: [wykonanie] }), szkicTestowy('c')] })

    assert.deepEqual(podsumowanieKopii(stan), { wycen: 3, wykonan: 3, czyUstawienia: true })
    assert.deepEqual(podsumowanieKopii(stanTestowy({ ustawienia: null, wyceny: [] })), { wycen: 0, wykonan: 0, czyUstawienia: false })
  })
})

describe('utworzKopie: te same granice co odczyt kopii', () => {
  it('tekst ponad 2000 znaków, ponad 5000 wycen albo wycena złego kształtu → uszkodzony już przy tworzeniu kopii', () => {
    const dlugiTekst = stanTestowy({ wyceny: [szkicTestowy('a', { odpowiedzi: { uwagi: 'x'.repeat(2500) } })] })
    const wiele = stanTestowy({ wyceny: Array.from({ length: 5001 }, (_, i) => szkicTestowy(`s${i}`)) })
    const zlaWycena = stanTestowy({ wyceny: [wycenaTestowa('a', { status: 'zaplacona' })] })

    for (const stan of [dlugiTekst, wiele, zlaWycena]) {
      assert.throws(() => utworzKopie(stan, TERAZ), bladKopii('uszkodzony'))
    }
  })
})

describe('odczytajKopie: odmowy kształtu wyniku, oferty i części wyceny', () => {
  it('wynik z ceną tekstem albo bez linii, oferta z nieaktualna tekstem, wejście bez usługi i złe widełki → uszkodzony', () => {
    const zle = [
      wycenaTestowa('a', { wynik: { ...MIGAWKA, cena: '250' } }),
      wycenaTestowa('a', { wynik: { ...MIGAWKA, linie: null } }),
      wycenaTestowa('a', { oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: 'nie' } }),
      wycenaTestowa('a', { wejscie: {} }),
      wycenaTestowa('a', { szybka: { stan: 's', tryb: 't', od: '1', do: 2 } }),
    ]

    for (const wycena of zle) {
      assert.throws(() => odczytajKopie(plik({ stan: stanTestowy({ wyceny: [wycena] }) })), bladKopii('uszkodzony'), JSON.stringify(wycena))
    }
  })

  it('treść, która nie jest tekstem (42) → zly_plik', () => {
    assert.throws(() => odczytajKopie(42), bladKopii('zly_plik'))
  })
})

describe('odczytajKopie: wartości ustawień i limity wycen jak przy zapisie', () => {
  it('złe wartości ustawień → uszkodzony, poprawne przechodzą', () => {
    const zleUstawienia = [
      { tempo: { reczne: 0 } }, { tempo: { reczne: 99 } }, { przypomnienieKopiiDni: 3 }, { wojewodztwoId: '<b>' },
      { firma: { ...USTAWIENIA.firma, email: 'nie-email' } }, { koszty: { sprzet: { odkurzacz: 501 }, dojazd: {} } },
    ]

    assert.deepEqual(odczytajKopie(plik({})).stan.ustawienia, USTAWIENIA)
    for (const zle of zleUstawienia) {
      assert.throws(() => odczytajKopie(plik({ stan: stanTestowy({ ustawienia: { ...USTAWIENIA, ...zle } }) })), bladKopii('uszkodzony'),
        JSON.stringify(zle))
    }
  })

  it('klucz kosztu sprzętu __proto__ → uszkodzony', () => {
    const tresc = plik({ stan: stanTestowy({ ustawienia: { ...USTAWIENIA, koszty: { sprzet: { KLUCZ: 5 }, dojazd: {} } } }) })

    assert.throws(() => odczytajKopie(tresc.replace('"KLUCZ"', '"__proto__"')), bladKopii('uszkodzony'))
  })

  it('wykonanie 5000 min albo z datą „jutro”, nazwa klienta 121 znaków, licznik ponad 100 000 → uszkodzony', () => {
    const wykonanie = { id: 'w', data: '2026-10-20', minuty: 240, tempoPlanu: 1.3 }
    const zleStany = [
      stanTestowy({ wyceny: [wycenaTestowa('a', { status: 'przyjeta', wykonania: [{ ...wykonanie, minuty: 5000 }] })] }),
      stanTestowy({ wyceny: [wycenaTestowa('a', { status: 'przyjeta', wykonania: [{ ...wykonanie, data: 'jutro' }] })] }),
      stanTestowy({ wyceny: [wycenaTestowa('a', { klient: { nazwa: 'x'.repeat(121), adres: '', termin: null } })] }),
      stanTestowy({ licznikNumerow: { '2026-10': 100_001 } }),
    ]

    assert.equal(odczytajKopie(plik({ stan: stanTestowy({ wyceny: [wycenaTestowa('a', { status: 'przyjeta', wykonania: [wykonanie] })] }) }))
      .stan.wyceny[0].wykonania.length, 1)
    for (const stan of zleStany) assert.throws(() => odczytajKopie(plik({ stan })), bladKopii('uszkodzony'))
  })

  it('utworzKopie odrzuca ustawienia, których odczyt by nie przyjął', () => {
    assert.throws(() => utworzKopie(stanTestowy({ ustawienia: { ...USTAWIENIA, tempo: { reczne: 0 } } }), TERAZ), bladKopii('uszkodzony'))
  })
})

describe('wczytajKopie polacz: numery wycen z dwóch urządzeń', () => {
  it('wycena z pliku z numerem zajętym lokalnie dostaje kolejny numer miesiąca, licznik rośnie', () => {
    const { magazyn } = magazynZeStanem(stanTestowy({ wyceny: [wycenaTestowa('telefon')], licznikNumerow: { '2026-10': 1 } }))
    const zLaptopa = stanTestowy({ wyceny: [wycenaTestowa('laptop'), wycenaTestowa('laptop2', { numer: '2/10/2026' })],
      licznikNumerow: { '2026-10': 2 } })

    wczytajKopie(magazyn, zLaptopa, 'polacz')

    const stan = zapisanyStan(magazyn)
    assert.deepEqual(stan.wyceny.map((/** @type {any} */ w) => [w.id, w.numer]), [
      ['telefon', '1/10/2026'], ['laptop', '3/10/2026'], ['laptop2', '2/10/2026'],
    ])
    assert.deepEqual(stan.licznikNumerow, { '2026-10': 3 })
  })

  it('dwa kolejne połączenia: zmieniona na laptopie wysłana wycena zostaje przy numerze nadanym na telefonie i jest nieaktualna', () => {
    const { magazyn } = magazynZeStanem(stanTestowy({ wyceny: [wycenaTestowa('telefon')], licznikNumerow: { '2026-10': 1 } }))
    const wyslana = { status: 'wyslana', oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: '2026-10-11T09:00:00.000Z', nieaktualna: false } }
    const zLaptopa = (/** @type {string} */ zmieniona) => stanTestowy({ wyceny: [wycenaTestowa('laptop', { ...wyslana, zmieniona })], licznikNumerow: { '2026-10': 1 } })

    wczytajKopie(magazyn, zLaptopa('2026-10-11T09:00:00.000Z'), 'polacz')
    wczytajKopie(magazyn, zLaptopa('2026-10-20T09:00:00.000Z'), 'polacz')

    const stan = zapisanyStan(magazyn)
    assert.deepEqual(stan.wyceny.map((/** @type {any} */ w) => [w.id, w.numer, w.zmieniona, w.oferta.nieaktualna]), [
      ['telefon', '1/10/2026', '2026-10-10T10:00:00.000Z', false], ['laptop', '2/10/2026', '2026-10-20T09:00:00.000Z', true],
    ])
    assert.deepEqual(stan.licznikNumerow, { '2026-10': 2 })
  })

  it('połączenie ponad 5000 wycen → za_duzo_wycen bez zapisu', () => {
    const { magazyn, storage } = magazynZeStanem(stanTestowy({ wyceny: Array.from({ length: 3000 }, (_, i) => szkicTestowy(`l${i}`)) }))
    const przed = storage.getItem(KLUCZ_MAGAZYNU)
    const zPliku = stanTestowy({ wyceny: Array.from({ length: 2001 }, (_, i) => szkicTestowy(`p${i}`)) })

    assert.throws(() => wczytajKopie(magazyn, zPliku, 'polacz'), bladKopii('za_duzo_wycen'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })
})
