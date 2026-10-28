import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, katalogTestowy, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladWejscia } from './bledy.js'
import * as modulCeny from './cena.js'
import { wycenUsluge } from './cena.js'
import { ukladBiura } from './uklad.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */

/** @param {string} kod */
const bladWejscia = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladWejscia && blad.kod === kod

const MIESZKANIE_50 = [
  { typ: 'pokoj', nazwa: 'Pokój', m2: 32, brud: [{ id: 'kurz', poziom: 1 }] },
  { typ: 'przedpokoj', nazwa: 'Przedpokój', m2: 6, brud: [{ id: 'kurz', poziom: 1 }] },
  { typ: 'kuchnia', nazwa: 'Kuchnia', m2: 8, brud: [{ id: 'kurz', poziom: 1 }] },
  { typ: 'lazienka', nazwa: 'Łazienka', m2: 4, brud: [{ id: 'kurz', poziom: 1 }] },
]
const OKNA_4 = { uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 4 }

describe('wycenUsluge: scenariusze na prawdziwych danych', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('mieszkanie 50 m² standard w mazowieckim: 250 zł, z dojazdem 32 km 294 zł (dojazd 44 zł)', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie', pomieszczenia: MIESZKANIE_50 }

    const bezDojazdu = wycenUsluge(wejscie, katalog)
    const zDojazdem = wycenUsluge({ ...wejscie, dojazdKm: 32 }, katalog)

    assert.equal(bezDojazdu.cenaZaokraglona, 250)
    assertBlisko(bezDojazdu.cena, 250.055, 1e-6)
    assert.equal(bezDojazdu.czyMinimum, false)
    assert.deepEqual(bezDojazdu.linie.map((l) => [l.rodzaj, l.jednostka, l.cenaJedn]), [['praca', 'h', 65]])
    assertBlisko(bezDojazdu.minutyNormowe, 230.82, 1e-6)
    assert.deepEqual(zDojazdem.dojazd, { km: 32, kwota: 44 })
    assert.equal(zDojazdem.cenaZaokraglona, 294)
    assert.equal(zDojazdem.podstawaCeny, 'brutto')
    assert.equal(zDojazdem.wizytWMiesiacu, null)
    assert.equal(zDojazdem.cenaMiesieczna, null)
  })

  it('okna 4 × okno 1-skrzydłowe: 120 zł podnosi minimum do 150 zł, dojazd 8 km bez dopłaty', () => {
    const wejscie = { uslugaId: 'okna', wojewodztwoId: 'mazowieckie', pozycje: [{ id: 'okno_1', ilosc: 4 }], dojazdKm: 8 }

    const wynik = wycenUsluge(wejscie, katalog)

    assert.equal(wynik.cenaUslugi, 120)
    assert.equal(wynik.cena, 150)
    assert.equal(wynik.czyMinimum, true)
    assert.deepEqual(wynik.dojazd, { km: 8, kwota: 0 })
    assert.equal(wynik.minutyNormowe, 30 + 4 * 15)
  })

  it('okna w opolskim: cena pozycji × wsp województwa 1,07', () => {
    const wynik = wycenUsluge({ uslugaId: 'okna', wojewodztwoId: 'opolskie', pozycje: [{ id: 'okno_1', ilosc: 8 }] }, katalog)

    assertBlisko(wynik.cena, 8 * 30 * 1.07)
  })

  it('kostka 40 m²: mycie z progiem 1,15 = 690 zł, dopłata mech 300 zł bez progu, razem 990 zł', () => {
    const wejscie = { uslugaId: 'mycie_kostki', wojewodztwoId: 'mazowieckie', pozycje: [{ id: 'mycie', ilosc: 40 }, { id: 'mech', ilosc: 40 }] }

    const wynik = wycenUsluge(wejscie, katalog)

    assert.deepEqual(wynik.linie.map((l) => [l.rodzaj, l.mnoznikProgu]), [['pozycja', 1.15], ['doplata', 1]])
    assertBlisko(wynik.linie[0]?.kwota ?? 0, 690)
    assertBlisko(wynik.linie[1]?.kwota ?? 0, 300)
    assertBlisko(wynik.cena, 990)
  })

  it('kostka 40 m² z impregnacją: dopłata 40 × 21,50 zł i materiał 40 × 8 zł bez progu', () => {
    const pozycje = [{ id: 'mycie', ilosc: 40 }, { id: 'mech', ilosc: 40 }, { id: 'impregnacja', ilosc: 40 }]

    const wynik = wycenUsluge({ uslugaId: 'mycie_kostki', wojewodztwoId: 'mazowieckie', pozycje }, katalog)

    assert.deepEqual(wynik.linie.slice(2).map((l) => [l.rodzaj, l.kwota, l.mnoznikProgu]), [['doplata', 860, 1], ['material', 320, 1]])
    assertBlisko(wynik.cena, 990 + 40 * (21.5 + 8))
  })

  it('dodatek okna 4 × okno 1-skrz.: „propozycja” nie zmienia ceny, „w cenie” dodaje 120 zł i 60 min', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie', pomieszczenia: MIESZKANIE_50 }
    const bez = wycenUsluge(wejscie, katalog)

    const propozycja = wycenUsluge({ ...wejscie, dodatki: [{ ...OKNA_4, tryb: 'propozycja' }] }, katalog)
    const wCenie = wycenUsluge({ ...wejscie, dodatki: [{ ...OKNA_4, tryb: 'w_cenie' }] }, katalog)

    assert.equal(propozycja.cena, bez.cena)
    assert.equal(propozycja.minutyNormowe, bez.minutyNormowe)
    assert.deepEqual(propozycja.propozycje, [{ opis: 'Okno 1-skrzydłowe', ilosc: 4, jednostka: 'szt', kwota: 120 }])
    assertBlisko(wCenie.cena - bez.cena, 120)
    assertBlisko(wCenie.minutyNormowe - bez.minutyNormowe, 4 * 15)
    assert.deepEqual(wCenie.linie.map((l) => l.rodzaj), ['praca', 'dodatek'])
    assert.deepEqual(wCenie.propozycje, [])
  })

  it('doczyszczanie 200 m² z poziomem brudu 3: cena i czas pozycji × 1,4', () => {
    const wejscie = { uslugaId: 'doczyszczanie', wojewodztwoId: null, pozycje: [{ id: 'doczyszczanie_posadzki', ilosc: 200 }] }

    const poziom1 = wycenUsluge({ ...wejscie, poziomBrudu: 1 }, katalog)
    const poziom3 = wycenUsluge({ ...wejscie, poziomBrudu: 3 }, katalog)

    assert.equal(poziom1.cena, 2000)
    assertBlisko(poziom3.cena, 2000 * 1.4)
    assertBlisko(poziom3.linie[0]?.minuty ?? 0, 400 * 1.4)
    assertBlisko(poziom3.minutyNormowe, 60 + 400 * 1.4)
  })

  it('abonament 1× w tygodniu dla 100 m²: minimum za wizytę, cenaMiesieczna = cena wizyty × 4,33', () => {
    const wejscie = { uslugaId: 'sprzatanie_biur', wojewodztwoId: null, wariantId: 'abonament_1', pomieszczenia: ukladBiura(100, katalog.uklady) }

    const wynik = wycenUsluge(wejscie, katalog)

    assert.equal(wynik.wizytWMiesiacu, 4.33)
    assert.equal(wynik.cena, 150)
    assertBlisko(wynik.cenaMiesieczna ?? 0, 150 * 4.33)
    assert.equal(wynik.podstawaCeny, 'netto')
  })

  it('usługa AGD jako główna, nieznana usługa i nieznana pozycja rzucają BladWejscia', () => {
    assert.throws(() => wycenUsluge({ uslugaId: 'agd', pozycje: [{ id: 'piekarnik', ilosc: 1 }] }, katalog), bladWejscia('tylko_dodatek'))
    assert.throws(() => wycenUsluge({ uslugaId: 'brak', pozycje: [] }, katalog), bladWejscia('nieznana_usluga'))
    assert.throws(() => wycenUsluge({ uslugaId: 'okna', pozycje: [{ id: 'dywan', ilosc: 1 }] }, katalog), bladWejscia('nieznana_pozycja'))
  })
})

describe('wycenUsluge: walidacja i opcje (mały katalog)', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  it('ujemna ilość pozycji i dodatku rzuca BladWejscia ilosc', () => {
    const pozycje = [{ id: 'doczyszczanie_posadzki', ilosc: -1 }]
    const dodatki = [{ uslugaId: 'doczyszczanie', pozycjaId: 'zabezpieczenie', ilosc: -2, tryb: /** @type {const} */ ('w_cenie') }]

    assert.throws(() => wycenUsluge({ uslugaId: 'doczyszczanie', pozycje }, katalog), bladWejscia('ilosc'))
    assert.throws(() => wycenUsluge({ uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 10 }], dodatki }, katalog), bladWejscia('ilosc'))
  })

  it('metraż 0, ujemny i powyżej 100 000 m² rzuca BladWejscia metraz', () => {
    for (const m2 of [0, -5, 100_001, Number.NaN]) {
      assert.throws(() => wycenUsluge({ uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2 }] }, katalog), bladWejscia('metraz'))
    }
  })

  it('wycena bez pomieszczeń albo z samymi zerowymi ilościami rzuca BladWejscia pusty_zakres', () => {
    assert.throws(() => wycenUsluge({ uslugaId: 'mieszkanie_standard', pomieszczenia: [] }, katalog), bladWejscia('pusty_zakres'))
    assert.throws(() => wycenUsluge({ uslugaId: 'doczyszczanie', pozycje: [{ id: 'doczyszczanie_posadzki', ilosc: 0 }] }, katalog), bladWejscia('pusty_zakres'))
  })

  it('ujemny dojazd i nieznany tryb dodatku rzucają BladWejscia', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 10 }] }
    const dodatek = { uslugaId: 'doczyszczanie', pozycjaId: 'zabezpieczenie', ilosc: 1, tryb: 'gratis' }

    assert.throws(() => wycenUsluge({ ...wejscie, dojazdKm: -1 }, katalog), bladWejscia('dojazd'))
    assert.throws(() => wycenUsluge({ ...wejscie, dodatki: [dodatek] }, katalog), bladWejscia('tryb_dodatku'))
  })

  it('poziom brudu 4 w usłudze z poziomy_brudu rzuca BladWejscia poziom_brudu zamiast liczyć cenę poziomu 1', () => {
    const wejscie = { uslugaId: 'doczyszczanie', pozycje: [{ id: 'doczyszczanie_posadzki', ilosc: 10 }], poziomBrudu: 4 }

    assert.throws(() => wycenUsluge(wejscie, katalog), bladWejscia('poziom_brudu'))
  })

  it('pozycje z ilością 0 nie tworzą linii, a dopłata nie dostaje progu metrażu', () => {
    const pozycje = [{ id: 'doczyszczanie_posadzki', ilosc: 50 }, { id: 'zabezpieczenie', ilosc: 50 }, { id: 'zabezpieczenie', ilosc: 0 }]

    const wynik = wycenUsluge({ uslugaId: 'doczyszczanie', wojewodztwoId: 'opolskie', pozycje }, katalog)

    assert.deepEqual(wynik.linie.map((l) => [l.rodzaj, l.mnoznikProgu]), [['pozycja', 1.3], ['doplata', 1]])
    assertBlisko(wynik.cenaUslugi, 50 * 10 * 1.07 * 1.3 + 50 * 9.5 * 1.07)
  })

  it('stawkiDojazdu z ustawień zastępują stawki z data/ceny.json', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 100 }], dojazdKm: 25 }

    const domyslne = wycenUsluge(wejscie, katalog)
    const wlasne = wycenUsluge(wejscie, katalog, { stawkiDojazdu: { klient_zl_km: 3, darmowy_promien_km: 5 } })

    assert.equal(domyslne.dojazd.kwota, (25 - 10) * 2)
    assert.equal(wlasne.dojazd.kwota, (25 - 5) * 3)
    assertBlisko(wlasne.cena - domyslne.cena, 60 - 30)
  })
})

describe('linieDodatku i dojazdKlienta', () => {
  it('dopłata 10 m² w opolskim: 10 × 9,5 × wsp 1,07 bez progu; materiał doliczany bez wsp', async () => {
    const katalog = await katalogTestowy()
    const pozycja = katalog.pozycja('doczyszczanie', 'zabezpieczenie')

    const [linia, ...reszta] = modulCeny.linieDodatku({ uslugaId: 'doczyszczanie', pozycja, ilosc: 10, wsp: 1.07 })
    const zMaterialem = modulCeny.linieDodatku({ uslugaId: 'doczyszczanie', pozycja: { ...pozycja, doliczaj_material: true }, ilosc: 10, wsp: 1.07 })

    assert.deepEqual([linia?.rodzaj, linia?.klucz, linia?.mnoznikProgu, reszta.length], ['dodatek', 'doczyszczanie.zabezpieczenie', 1, 0])
    assertBlisko(linia?.kwota ?? Number.NaN, 101.65)
    assertBlisko(linia?.cenaJedn ?? Number.NaN, 10.165)
    assert.deepEqual(zMaterialem.map((l) => [l.rodzaj, l.kwota]), [['dodatek', linia?.kwota], ['material', 25]])
  })

  it('dojazd 24 km: 14 km ponad darmowy promień × 2 zł; w promieniu 0 zł; ujemny dojazd daje BladWejscia', () => {
    const stawki = { klient_zl_km: 2, darmowy_promien_km: 10 }

    assert.deepEqual(modulCeny.dojazdKlienta(24, stawki), { km: 24, kwota: 28 })
    assert.deepEqual(modulCeny.dojazdKlienta(8, stawki), { km: 8, kwota: 0 })
    assert.throws(() => modulCeny.dojazdKlienta(-1, stawki), bladWejscia('dojazd'))
  })
})
