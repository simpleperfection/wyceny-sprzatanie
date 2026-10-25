import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { daneTestowe, katalogTestowy, katalogZDanych, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladKatalogu, BladWejscia } from './bledy.js'
import { wczytajKatalog } from './katalog.js'

/** @param {string} kod */
const bladKatalogu = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladKatalogu && blad.kod === kod
/** @param {string} kod */
const bladWejscia = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladWejscia && blad.kod === kod

describe('wczytajKatalog: indeksy', () => {
  it('prawdziwe dane: średnia krajowa ma stawkę 65 zł/h i wsp 1', async () => {
    const katalog = await katalogZDysku()

    assert.deepEqual(katalog.wojewodztwo(null), { id: null, nazwa: 'średnia krajowa', wsp: 1, stawka_h: 65 })
    assert.equal(katalog.wojewodztwa.length, 16)
  })

  it('województwo, usługa i pozycja z małego katalogu', async () => {
    const katalog = await katalogTestowy()

    assert.deepEqual(katalog.wojewodztwo('opolskie'), { id: 'opolskie', nazwa: 'opolskie', wsp: 1.07, stawka_h: 69.5 })
    assert.equal(katalog.usluga('doczyszczanie').minimum_zl, 300)
    assert.equal(katalog.pozycja('doczyszczanie', 'zabezpieczenie').typ, 'doplata')
    assert.deepEqual(katalog.wersjaDanych, { ceny: 'test-ceny', normy: 'test-normy', rynek: 'test-rynek' })
  })

  it('normy pomieszczeń, brudu i pozycji oraz zestaw', async () => {
    const katalog = await katalogTestowy()

    assert.equal(katalog.normaPomieszczenia('lazienka'), 11.56)
    assert.equal(katalog.normaPomieszczenia('toaleta'), 4.93)
    assert.equal(katalog.normaBrudu('pyl_budowlany', 2), 4)
    assert.equal(katalog.normaPozycji('doczyszczanie.zabezpieczenie').min_na_jednostke, 1.5)
    assert.deepEqual(katalog.zestaw('biuro').map((p) => p.id), ['biuro', 'sala', 'kuchnia_socjalna', 'toaleta', 'korytarz'])
  })

  it('progMetrazu bierze ostatni próg, którego od_m2 ≤ metraż', async () => {
    const katalog = await katalogTestowy()

    assert.deepEqual([50, 100, 499, 600].map((m2) => katalog.progMetrazu('maszynowe', m2)), [1.3, 1, 1, 0.7])
  })

  it('przygotowanie: usługa z pozycjami z przygotowanie_min_uslug, z pomieszczeniami przygotowanie_min', async () => {
    const katalog = await katalogTestowy()

    assert.equal(katalog.przygotowanie('doczyszczanie'), 60)
    assert.equal(katalog.przygotowanie('mieszkanie_standard'), 30)
  })

  it('nieznane identyfikatory rzucają BladWejscia, a brak progów i zestawu BladKatalogu', async () => {
    const katalog = await katalogTestowy()

    assert.throws(() => katalog.usluga('nieznana'), bladWejscia('nieznana_usluga'))
    assert.throws(() => katalog.pozycja('doczyszczanie', 'brak'), bladWejscia('nieznana_pozycja'))
    assert.throws(() => katalog.pozycja('nieznana', 'brak'), bladWejscia('nieznana_usluga'))
    assert.throws(() => katalog.wojewodztwo('nieznane'), bladWejscia('nieznane_wojewodztwo'))
    assert.throws(() => katalog.normaBrudu('kurz', 4), bladWejscia('poziom_brudu'))
    assert.throws(() => katalog.normaBrudu('blota', 1), bladWejscia('nieznany_brud'))
    assert.throws(() => katalog.normaPozycji('doczyszczanie.brak'), bladWejscia('nieznana_pozycja'))
    assert.throws(() => katalog.progMetrazu('brak', 10), bladKatalogu('brak_progu'))
    assert.throws(() => katalog.zestaw('brak'), bladKatalogu('brak_zestawu'))
  })
})

describe('wczytajKatalog: kontrole danych', () => {
  it('pozycja bez normy czasu rzuca BladKatalogu z kodem brak_normy', async () => {
    const dane = await daneTestowe()
    delete dane.normy.pozycje['doczyszczanie.zabezpieczenie']

    await assert.rejects(katalogZDanych(dane), bladKatalogu('brak_normy'))
  })

  it('usługa z pozycjami bez przygotowania rzuca BladKatalogu z kodem brak_przygotowania', async () => {
    const dane = await daneTestowe()
    dane.normy.przygotowanie_min_uslug = {}

    await assert.rejects(katalogZDanych(dane), bladKatalogu('brak_przygotowania'))
  })

  it('usługa z pomieszczeniami bez zestawu rzuca BladKatalogu z kodem brak_zestawu', async () => {
    const dane = await daneTestowe()
    delete dane.normy.zestawy_pomieszczen.biuro

    await assert.rejects(katalogZDanych(dane), bladKatalogu('brak_zestawu'))
  })

  it('plik o złym kształcie rzuca BladKatalogu z kodem zly_format', async () => {
    const dane = await daneTestowe()
    dane.rynek.wojewodztwa = null

    await assert.rejects(katalogZDanych(dane), bladKatalogu('zly_format'))
  })

  /** @type {[string, (dane: Awaited<ReturnType<typeof daneTestowe>>) => void][]} */
  const brakiPol = [
    ['cena pozycji usługi', (dane) => { delete dane.ceny.uslugi[2].pozycje[0].cena }],
    ['tryb usługi', (dane) => { dane.ceny.uslugi[0].tryb = 'pomieszczenie' }],
    ['mnoznik_zakresu wariantu biura', (dane) => { delete dane.ceny.uslugi[1].warianty[0].mnoznik_zakresu }],
    ['koszt_firmy_zl_km dojazdu', (dane) => { delete dane.ceny.koszty_firmy.dojazd.koszt_firmy_zl_km }],
    ['mnoznik progu metrażu', (dane) => { dane.ceny.progi_metrazu.maszynowe.progi[1].mnoznik = '1' }],
    ['udzial kuchni w układzie mieszkania', (dane) => { delete dane.normy.uklady.mieszkanie.kuchnia.udzial }],
    ['min_m2 normy pomieszczenia', (dane) => { delete dane.normy.zestawy_pomieszczen.dom[0].min_m2 }],
    ['wsp województwa (tekst z przecinkiem)', (dane) => { dane.rynek.wojewodztwa[1].wsp = '1,07' }],
    ['stawka_h województwa', (dane) => { delete dane.rynek.wojewodztwa[0].stawka_h }],
  ]
  for (const [pole, zepsuj] of brakiPol) {
    it(`brak albo zły typ pola (${pole}) rzuca BladKatalogu zly_format zamiast liczyć NaN`, async () => {
      const dane = await daneTestowe()
      zepsuj(dane)

      await assert.rejects(katalogZDanych(dane), bladKatalogu('zly_format'))
    })
  }

  it('pola, których silnik nie czyta (koszty_firmy.praca, dojazd.zakres_rynkowy), nie są wymagane', async () => {
    const dane = await daneTestowe()
    delete dane.ceny.koszty_firmy.praca
    delete dane.ceny.koszty_firmy.dojazd.zakres_rynkowy

    const katalog = await katalogZDanych(dane)

    assert.equal(katalog.kosztyFirmy.dojazd.koszt_firmy_zl_km, 1.15)
  })

  it('niepobrany plik rzuca BladKatalogu z kodem brak_pliku i przyczyną', async () => {
    const przyczyna = new Error('HTTP 404')
    const dane = await daneTestowe()
    /** @param {string} sciezka */
    const pobierz = async (sciezka) => {
      if (sciezka === 'data/normy.json') throw przyczyna
      return sciezka === 'data/ceny.json' ? dane.ceny : dane.rynek
    }

    await assert.rejects(wczytajKatalog(pobierz), (blad) => bladKatalogu('brak_pliku')(blad) && blad instanceof Error && blad.cause === przyczyna)
  })
})

describe('progDlaMetrazu', () => {
  it('próg z granicami: 50 m² → 0–100 (×1,3), 600 m² → od 500 bez końca (×0,7); progi nie po kolei — ostatni pasujący w danych', async () => {
    const katalog = await katalogTestowy()
    const dane = await daneTestowe()
    const progi = [{ od_m2: 500, mnoznik: 0.7 }, { od_m2: 0, mnoznik: 1.3 }]
    const nieposortowane = await katalogZDanych({ ...dane, ceny: { ...dane.ceny, progi_metrazu: { ...dane.ceny.progi_metrazu, maszynowe: { progi } } } })

    assert.deepEqual(katalog.progDlaMetrazu('maszynowe', 50), { od: 0, do: 100, mnoznik: 1.3 })
    assert.deepEqual(katalog.progDlaMetrazu('maszynowe', 600), { od: 500, do: null, mnoznik: 0.7 })
    assert.deepEqual(nieposortowane.progDlaMetrazu('maszynowe', 600), { od: 0, do: null, mnoznik: 1.3 })
    assert.equal(nieposortowane.progMetrazu('maszynowe', 600), 1.3)
  })

  it('nieznana nazwa progów daje BladKatalogu brak_progu', async () => {
    const katalog = await katalogTestowy()

    assert.throws(() => katalog.progDlaMetrazu('brak', 10), bladKatalogu('brak_progu'))
  })
})
