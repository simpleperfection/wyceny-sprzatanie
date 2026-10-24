import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, czytajJson, daneTestowe, katalogTestowy, katalogZDanych, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladKatalogu, BladWejscia } from './bledy.js'
import { wycenUsluge } from './cena.js'
import { kosztZlecenia } from './koszt.js'
import { cenaDlaKlienta, zCenyRecznej } from './vat.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('./vat.js').StatusVat} StatusVat */
/** @typedef {{ usluga: string, pozycja: string, ilosc: number, chemia: number, sprzet: number }} ScenariuszPozycji */

const STAWKA_VAT = 23
const DOKLADNOSC_PARYTETU = 0.01
const MIESZKANIE_50 = [
  { typ: 'pokoj', m2: 32 },
  { typ: 'przedpokoj', m2: 6 },
  { typ: 'kuchnia', m2: 8 },
  { typ: 'lazienka', m2: 4 },
]

/**
 * Wycena modelu → cena dla klienta → koszt zlecenia, jak w kreatorze.
 * @param {WejscieWyceny} wejscie @param {Katalog} katalog @param {{ tempo?: number, statusVat?: StatusVat }} [opcje]
 */
function policz(wejscie, katalog, { tempo = 1, statusVat = 'zwolniony' } = {}) {
  const wynik = wycenUsluge(wejscie, katalog)
  const cenaKlienta = cenaDlaKlienta({ kwota: wynik.cena, podstawaCeny: wynik.podstawaCeny, statusVat, stawkaVatProc: STAWKA_VAT })
  return { wynik, cenaKlienta, koszt: kosztZlecenia({ wynik, cenaKlienta, tempo, koszty: katalog.kosztyFirmy, statusVat }, katalog) }
}

describe('kosztZlecenia: mieszkanie z pomieszczeniami', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  it('50 m² (230,82 min), tempo 1,3, dojazd 24 km, firma zwolniona: chemia z czasu normowego, dojazd tam i z powrotem', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: MIESZKANIE_50, dojazdKm: 24 }

    const { cenaKlienta, koszt } = policz(wejscie, katalog, { tempo: 1.3 })

    assertBlisko(koszt.minutyNormowe, 230.82, 1e-9)
    assertBlisko(koszt.minutyWlasne, 230.82 * 1.3, 1e-9)
    assertBlisko(koszt.chemia, (4 * 230.82) / 60, 1e-9)
    assert.deepEqual(koszt.sprzet, [])
    assert.equal(koszt.dojazdFirmy.km, 24)
    assertBlisko(koszt.dojazdFirmy.kwota, 2 * 24 * 1.15, 1e-9)
    // cena 250,055 + dojazd klienta (24 − 10) × 2 = 278,055 → 278 zł
    assert.equal(cenaKlienta.brutto, 278)
    assert.equal(koszt.przychod, 278)
    assertBlisko(koszt.kosztRazem, (4 * 230.82) / 60 + 55.2, 1e-9)
    assertBlisko(koszt.zostaje, 278 - (4 * 230.82) / 60 - 55.2, 1e-9)
    assertBlisko(koszt.zostajeNaGodzine, koszt.zostaje / ((230.82 * 1.3) / 60), 1e-9)
    assertBlisko(koszt.zostajeNaGodzine, 41.47, 0.01)
    assert.equal(koszt.miesiecznie, null)
  })

  it('ręczna cena 290 zł zmienia „zostaje” i stawkę na godzinę, a nie zmienia czasu własnego', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: MIESZKANIE_50, dojazdKm: 24 }
    const { wynik, koszt: zModelu } = policz(wejscie, katalog, { tempo: 1.3 })

    const reczna = kosztZlecenia({ wynik, cenaKlienta: zCenyRecznej(290, 'zwolniony', STAWKA_VAT), tempo: 1.3, koszty: katalog.kosztyFirmy, statusVat: 'zwolniony' }, katalog)

    assert.equal(reczna.minutyWlasne, zModelu.minutyWlasne)
    assert.equal(reczna.przychod, 290)
    assertBlisko(reczna.zostaje - zModelu.zostaje, 290 - 278, 1e-9)
    assertBlisko(reczna.zostajeNaGodzine, reczna.zostaje / ((230.82 * 1.3) / 60), 1e-9)
    assert.ok(reczna.zostajeNaGodzine > zModelu.zostajeNaGodzine)
  })

  it('czynny podatnik liczy przychód od netto: 278 zł brutto → 226,02 zł netto', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: MIESZKANIE_50, dojazdKm: 24 }

    const { koszt } = policz(wejscie, katalog, { tempo: 1, statusVat: 'czynny' })

    assert.equal(koszt.przychod, 226.02)
    assertBlisko(koszt.zostaje, 226.02 - (4 * 230.82) / 60 - 55.2, 1e-9)
  })

  it('dodatek z innej usługi w cenie: chemia na m² dodatku i sprzęt z czasu dodatku × tempo', () => {
    const dodatki = [{ uslugaId: 'doczyszczanie', pozycjaId: 'doczyszczanie_posadzki', ilosc: 10, tryb: /** @type {const} */ ('w_cenie') }]

    const { koszt } = policz({ uslugaId: 'mieszkanie_standard', pomieszczenia: MIESZKANIE_50, dodatki }, katalog, { tempo: 1.5 })

    // praca: 4 zł/h × 230,82 min; dodatek: 10 m² × 0,8 zł; szorowarka: 10 × 2 min × 1,5 / 60 × 20 zł/h
    assertBlisko(koszt.chemia, (4 * 230.82) / 60 + 8, 1e-9)
    assert.deepEqual(koszt.sprzet.map((s) => s.id), ['szorowarka'])
    assertBlisko(koszt.sprzet[0]?.kwota ?? Number.NaN, 10, 1e-9)
    assertBlisko(koszt.minutyWlasne, (230.82 + 20) * 1.5, 1e-9)
  })
})

describe('kosztZlecenia: usługi z pozycjami i abonament', () => {
  it('doczyszczanie 200 m² z zabezpieczeniem, tempo 1,5: chemia na m², sprzęt tylko z pozycji z szorowarką', async () => {
    const katalog = await katalogTestowy()
    const pozycje = [{ id: 'doczyszczanie_posadzki', ilosc: 200 }, { id: 'zabezpieczenie', ilosc: 200 }]

    const { koszt } = policz({ uslugaId: 'doczyszczanie', pozycje, poziomBrudu: 1 }, katalog, { tempo: 1.5 })

    assertBlisko(koszt.chemia, 200 * 0.8 + 200 * 2.5, 1e-9)
    assert.equal(koszt.sprzet.length, 1)
    assert.equal(koszt.sprzet[0]?.nazwa, 'Szorowarka')
    assertBlisko(koszt.sprzet[0]?.kwota ?? Number.NaN, ((200 * 2 * 1.5) / 60) * 20, 1e-9)
    // przygotowanie 60 min + 400 + 300 min pracy
    assertBlisko(koszt.minutyWlasne, (60 + 400 + 300) * 1.5, 1e-9)
  })

  it('materiał doliczany klientowi nie zwiększa drugi raz kosztu chemii', async () => {
    const dane = await daneTestowe()
    dane.ceny.uslugi[2].pozycje[1].doliczaj_material = true
    const katalog = await katalogZDanych(dane)
    const pozycje = [{ id: 'doczyszczanie_posadzki', ilosc: 200 }, { id: 'zabezpieczenie', ilosc: 200 }]

    const { wynik, koszt } = policz({ uslugaId: 'doczyszczanie', pozycje, poziomBrudu: 1 }, katalog)

    assert.ok(wynik.linie.some((l) => l.rodzaj === 'material'))
    assertBlisko(koszt.chemia, 200 * 0.8 + 200 * 2.5, 1e-9)
  })

  it('abonament biura: wartości za wizytę, a miesięcznie × 4,33 wizyty', async () => {
    const katalog = await katalogTestowy()
    const pomieszczenia = [{ typ: 'biuro', m2: 100 }]

    const { koszt } = policz({ uslugaId: 'sprzatanie_biur', wariantId: 'abonament_1', pomieszczenia, dojazdKm: 5 }, katalog, { statusVat: 'czynny' })

    assert.ok(koszt.miesiecznie)
    assertBlisko(koszt.miesiecznie.przychod, koszt.przychod * 4.33, 1e-9)
    assertBlisko(koszt.miesiecznie.kosztRazem, koszt.kosztRazem * 4.33, 1e-9)
    assertBlisko(koszt.miesiecznie.zostaje, koszt.zostaje * 4.33, 1e-9)
    assertBlisko(koszt.dojazdFirmy.kwota, 2 * 5 * 1.15, 1e-9)
  })
})

describe('kosztZlecenia: zlecenia wzorcowe ze skryptu kalibracji (tempo 1)', async () => {
  /** @type {{ pozycje: ScenariuszPozycji[] }} */
  const scenariusze = await czytajJson('research/kalibracja-scenariusze.json')
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('plik ma zlecenia wzorcowe w trybie pozycji', () => {
    assert.ok(scenariusze.pozycje.length >= 8, `za mało zleceń wzorcowych: ${scenariusze.pozycje.length}`)
  })

  for (const s of scenariusze.pozycje) {
    it(`${s.usluga}.${s.pozycja} × ${s.ilosc}: chemia ${s.chemia} zł, sprzęt ${s.sprzet.toFixed(2)} zł`, () => {
      const { koszt } = policz({ uslugaId: s.usluga, pozycje: [{ id: s.pozycja, ilosc: s.ilosc }], poziomBrudu: 1 }, katalog)

      assertBlisko(koszt.chemia, s.chemia, DOKLADNOSC_PARYTETU)
      assertBlisko(koszt.sprzet.reduce((suma, x) => suma + x.kwota, 0), s.sprzet, DOKLADNOSC_PARYTETU)
    })
  }
})

describe('kosztZlecenia: błędne wejście', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogTestowy()
  })

  /** @param {Record<string, unknown>} zmiany */
  function wejscie(zmiany) {
    const wynik = wycenUsluge({ uslugaId: 'mieszkanie_standard', pomieszczenia: MIESZKANIE_50 }, katalog)
    return { wynik, cenaKlienta: zCenyRecznej(250, 'zwolniony', STAWKA_VAT), tempo: 1, koszty: katalog.kosztyFirmy, statusVat: 'zwolniony', ...zmiany }
  }

  for (const tempo of [0, -0.5, Number.NaN]) {
    it(`tempo ${tempo} rzuca BladWejscia`, () => {
      assert.throws(() => kosztZlecenia(wejscie({ tempo }), katalog), { name: BladWejscia.name, kod: 'tempo' })
    })
  }

  it('wycena bez minutyNormowe rzuca BladWejscia', () => {
    const { wynik, ...reszta } = wejscie({})
    const bezMinut = { ...wynik, minutyNormowe: undefined }

    assert.throws(() => kosztZlecenia({ ...reszta, wynik: bezMinut }, katalog), { name: BladWejscia.name, kod: 'minuty_normowe' })
  })

  it('nieznany status VAT rzuca BladWejscia', () => {
    assert.throws(() => kosztZlecenia(wejscie({ statusVat: 'ryczalt' }), katalog), { name: BladWejscia.name, kod: 'status_vat' })
  })

  it('sprzęt pozycji bez kosztu godziny w kosztach firmy rzuca BladKatalogu', () => {
    const wynik = wycenUsluge({ uslugaId: 'doczyszczanie', pozycje: [{ id: 'doczyszczanie_posadzki', ilosc: 50 }] }, katalog)
    const koszty = { ...katalog.kosztyFirmy, sprzet: {} }

    assert.throws(
      () => kosztZlecenia({ wynik, cenaKlienta: zCenyRecznej(500, 'zwolniony', STAWKA_VAT), tempo: 1, koszty, statusVat: 'zwolniony' }, katalog),
      { name: BladKatalogu.name, kod: 'brak_sprzetu' },
    )
  })
})
