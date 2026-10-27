import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { czytajJson, katalogTestowy, katalogZDysku } from '../../tests/pomocnicze.js'
import { ustawieniaDomyslne } from '../dane/ustawienia.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { BladOferty, czyWazna, ofertaZWyceny, sprawdzZakresy, wczytajZakresy } from './tresc.js'

/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').MigawkaWyniku} MigawkaWyniku */
/** @typedef {import('./tresc.js').KontekstOferty} KontekstOferty */

const DZIEN_WYSTAWIENIA = new Date(2026, 9, 24, 15, 30)
const ZAKRESY = {
  meta: {},
  uslugi: {
    mieszkanie_standard: { wchodzi: ['Odkurzanie i mycie podłóg'], nie_wchodzi: ['Mycie okien'] },
    sprzatanie_biur: {
      wchodzi: ['Biura: podłogi'], nie_wchodzi: [],
      warianty: { jednorazowe: { wchodzi: ['Biura jednorazowo: podłogi i kuchnia'], nie_wchodzi: ['Mycie okien'] } },
    },
  },
}

/** @param {Partial<import('../silnik/cena.js').LiniaWyceny>} pola */
const linia = (pola) => ({ rodzaj: 'praca', klucz: null, opis: 'Praca', ilosc: 1, jednostka: 'h', cenaJedn: 0, cenaBazowa: 0, mnoznikProgu: 1,
  kwota: 0, zakres: null, minuty: 0, ...pola })

/** @param {Partial<MigawkaWyniku>} [zmiana] @returns {MigawkaWyniku} */
const migawka = (zmiana = {}) => ({
  cena: 254, netto: 254, vat: 0, mediana: 250, widelki: /** @type {never} */ ({ od: 200, do: 300, pelne: true }), minutyNormowe: 195,
  linie: [/** @type {never} */ (linia({ kwota: 250, minuty: 195 }))], propozycje: [], dojazd: { km: 12, kwota: 4 },
  wojewodztwo: { id: 'mazowieckie', nazwa: 'mazowieckie', stawka_h: 70, wsp: 1.08 }, statusVat: 'zwolniony', stawkaVatProc: 23,
  podstawaCeny: 'brutto', wizytWMiesiacu: null, wersjaDanych: { ceny: 'c', normy: 'n', rynek: 'r' }, minimum: 180, czyMinimum: false, ...zmiana,
})

/** @param {Partial<Wycena>} [zmiana] @returns {Wycena} zapisana wycena mieszkania 50 m² */
const wycena = (zmiana = {}) => ({
  id: 'w1', numer: '15/10/2026', utworzona: '2026-10-24T10:00:00.000Z', zmieniona: '2026-10-24T10:00:00.000Z', status: 'do_wyslania',
  rodzaj: 'dokladna', klient: { nazwa: 'Anna Kowalska', adres: 'ul. Przykładowa 1, Warszawa', termin: '14 listopada, 9:00' },
  wejscie: { uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 30 }, { typ: 'kuchnia', m2: 20 }], dojazdKm: 12 },
  szybka: null, odpowiedzi: {}, wynik: migawka(), cenaReczna: null,
  wykonania: [{ id: 'x', data: '2026-10-20', minuty: 200, tempoPlanu: 1.3 }],
  oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false },
  ...zmiana,
})

/** @param {Partial<import('../dane/magazyn.js').Ustawienia>} [ustawienia] @returns {Promise<KontekstOferty>} */
async function kontekst(ustawienia = {}) {
  const domyslne = await czytajJson('data/domyslne.json')
  const firma = { nazwa: 'Twoja Firma Sprzątająca', telefon: '500 000 000', email: 'biuro@twojafirma.pl', nip: '' }
  return { katalog: await katalogTestowy(), domyslne, zakresy: ZAKRESY, ustawienia: { ...ustawieniaDomyslne(domyslne), firma, ...ustawienia } }
}

/** @param {unknown} x @returns {string[]} wszystkie klucze obiektu na kazdym poziomie */
const wszystkieKlucze = (x) => (typeof x !== 'object' || x === null ? []
  : Object.entries(x).flatMap(([klucz, w]) => [...(Array.isArray(x) ? [] : [klucz]), ...wszystkieKlucze(w)]))

describe('ofertaZWyceny: kwoty', () => {
  it('ręczna cena 294 zł z dojazdem 4 zł: usługa 290 zł, dojazd 4 zł, razem 294 zł (od = do)', async () => {
    const oferta = ofertaZWyceny(wycena({ cenaReczna: 294 }), await kontekst(), DZIEN_WYSTAWIENIA)

    assert.deepEqual(oferta.uslugi, [{ opis: 'Mieszkanie – sprzątanie standardowe, 50 m²', kwota: 290 }])
    assert.equal(oferta.dojazd, 4)
    assert.deepEqual(oferta.razem, { od: 294, do: 294 })
  })

  it('ręczna cena 290 zł to kwota płacona przez klienta z dojazdem (jak w podsumowaniu): usługa 286 zł, razem 290 zł', async () => {
    const oferta = ofertaZWyceny(wycena({ cenaReczna: 290 }), await kontekst(), DZIEN_WYSTAWIENIA)

    assert.deepEqual([oferta.uslugi[0]?.kwota, oferta.dojazd, oferta.razem], [286, 4, { od: 290, do: 290 }])
  })

  it('dodatek „w cenie” z materiałem jest osobną linią, propozycja trafia do „Możesz dobrać”, linie sumują się do razem', async () => {
    const m = migawka({
      cena: 314, netto: 314,
      linie: /** @type {never} */ ([linia({ kwota: 200 }), linia({ rodzaj: 'dodatek', opis: 'Okno jednoskrzydłowe', ilosc: 4, jednostka: 'szt', kwota: 100 }),
        linia({ rodzaj: 'material', opis: 'Materiał: okno', kwota: 10 })]),
      propozycje: [{ opis: 'Mycie okien 1-skrz.', ilosc: 4, jednostka: 'szt', kwota: 120 }],
    })

    const oferta = ofertaZWyceny(wycena({ wynik: m }), await kontekst(), DZIEN_WYSTAWIENIA)

    assert.deepEqual(oferta.uslugi, [
      { opis: 'Mieszkanie – sprzątanie standardowe, 50 m²', kwota: 200 }, { opis: 'Okno jednoskrzydłowe (4 szt.)', kwota: 110 },
    ])
    assert.deepEqual(oferta.dodatkiOpcjonalne, [{ opis: 'Mycie okien 1-skrz. (4 szt.)', kwota: 120 }])
    assert.deepEqual(oferta.razem, { od: 314, do: 314 })
  })

  it('czynny podatnik, usługa od netto: dojazd 10 zł netto to 12 zł dla klienta, VAT z migawki', async () => {
    const m = migawka({ cena: 135, netto: 109.76, vat: 25.24, podstawaCeny: 'netto', statusVat: 'czynny', dojazd: { km: 20, kwota: 10 } })

    const oferta = ofertaZWyceny(wycena({ wynik: m }), await kontekst(), DZIEN_WYSTAWIENIA)

    assert.deepEqual([oferta.uslugi[0]?.kwota, oferta.dojazd], [123, 12])
    assert.deepEqual(oferta.vat, { status: 'czynny', stawka: 23, netto: 109.76, kwotaVat: 25.24 })
  })

  it('szybka wycena: razem to widełki od–do, VAT bez kwot netto przy widełkach', async () => {
    const szybka = { stan: /** @type {const} */ ('typowy'), od: 254, do: 304, tryb: /** @type {const} */ ('widelki') }

    const oferta = ofertaZWyceny(wycena({ rodzaj: 'szybka', szybka }), await kontekst(), DZIEN_WYSTAWIENIA)

    assert.deepEqual([oferta.razem, oferta.szybka, oferta.uslugi[0]?.kwota], [{ od: 254, do: 304 }, true, 250])
    assert.deepEqual(oferta.vat, { status: 'zwolniony', stawka: 23, netto: null, kwotaVat: null })
  })

  it('szkic bez numeru, wycena bez wyniku i zła data → BladOferty', async () => {
    const k = await kontekst()

    assert.throws(() => ofertaZWyceny(wycena({ numer: null, status: 'szkic' }), k, DZIEN_WYSTAWIENIA), { name: 'BladOferty', kod: 'brak_numeru' })
    assert.throws(() => ofertaZWyceny(wycena({ wynik: null }), k, DZIEN_WYSTAWIENIA), { name: 'BladOferty', kod: 'brak_wyniku' })
    assert.throws(() => ofertaZWyceny(wycena(), k, new Date('zła')), BladOferty)
  })
})

describe('ofertaZWyceny: biała lista pól (R21)', () => {
  it('oferta ma tylko pola typu Oferta, bez kosztów, tempa, czasu i „zostaje”', async () => {
    const oferta = ofertaZWyceny(wycena(), await kontekst({ tempo: { reczne: 1.2 } }), DZIEN_WYSTAWIENIA)
    const klucze = wszystkieKlucze(oferta)

    assert.deepEqual(Object.keys(oferta).sort(), ['data', 'dodatkiOpcjonalne', 'dojazd', 'firma', 'klient', 'numer', 'razem', 'szybka', 'uslugi', 'v',
      'vat', 'warunki', 'waznaDo', 'zakres'])
    for (const zakazany of ['zostaje', 'tempo', 'koszt', 'minuty', 'chemia', 'sprzet']) {
      assert.ok(!klucze.some((k) => k.toLowerCase().includes(zakazany)), `klucz z „${zakazany}” w ofercie`)
      assert.ok(!JSON.stringify(oferta).includes(`"${zakazany}`), `„${zakazany}” w JSON oferty`)
    }
  })

  it('dane firmy z ustawień, klient i numer z wyceny', async () => {
    const oferta = ofertaZWyceny(wycena(), await kontekst(), DZIEN_WYSTAWIENIA)

    assert.deepEqual([oferta.firma, oferta.klient, oferta.numer, oferta.data], [
      { nazwa: 'Twoja Firma Sprzątająca', telefon: '500 000 000', email: 'biuro@twojafirma.pl', nip: '' },
      { nazwa: 'Anna Kowalska', adres: 'ul. Przykładowa 1, Warszawa', termin: '14 listopada, 9:00' }, '15/10/2026', '2026-10-24',
    ])
  })
})

describe('ofertaZWyceny: zakres i warunki', () => {
  const ZAKRES_USTAWIEN = { wchodzi: ['Z ustawień'], nie_wchodzi: [] }
  const ZAKRES_OFERTY = { wchodzi: ['Tylko w tej ofercie'], nie_wchodzi: ['Okna'] }

  it('zakres z wyceny wygrywa z ustawieniami, a ustawień z data/zakresy.json', async () => {
    const k = await kontekst({ zakresy: { mieszkanie_standard: ZAKRES_USTAWIEN } })
    const bezUstawien = await kontekst()

    assert.deepEqual(ofertaZWyceny(wycena({ oferta: { ...wycena().oferta, zakres: ZAKRES_OFERTY } }), k, DZIEN_WYSTAWIENIA).zakres, ZAKRES_OFERTY)
    assert.deepEqual(ofertaZWyceny(wycena(), k, DZIEN_WYSTAWIENIA).zakres, ZAKRES_USTAWIEN)
    assert.deepEqual(ofertaZWyceny(wycena(), bezUstawien, DZIEN_WYSTAWIENIA).zakres,
      { wchodzi: ['Odkurzanie i mycie podłóg'], nie_wchodzi: ['Mycie okien'] })
  })

  it('wariant usługi z wpisem w data/zakresy.json zastępuje zakres usługi', async () => {
    const biuro = wycena({ wejscie: { uslugaId: 'sprzatanie_biur', wariantId: 'jednorazowe', pomieszczenia: [{ typ: 'biuro', m2: 80 }] } })

    const oferta = ofertaZWyceny(biuro, await kontekst(), DZIEN_WYSTAWIENIA)

    assert.deepEqual(oferta.zakres, { wchodzi: ['Biura jednorazowo: podłogi i kuchnia'], nie_wchodzi: ['Mycie okien'] })
    assert.equal(oferta.uslugi[0]?.opis, 'Sprzątanie biur – jednorazowo, 80 m²')
  })

  it('warunek stan_lokalu jest tylko w ofercie z szybkiej wyceny', async () => {
    const k = await kontekst()
    const stanLokalu = k.domyslne.oferta.warunki.find((w) => w.id === 'stan_lokalu')?.tresc
    const szybka = { stan: /** @type {const} */ ('typowy'), od: 254, do: 304, tryb: /** @type {const} */ ('widelki') }

    const dokladna = ofertaZWyceny(wycena(), k, DZIEN_WYSTAWIENIA).warunki
    const zSzybkiej = ofertaZWyceny(wycena({ rodzaj: 'szybka', szybka }), k, DZIEN_WYSTAWIENIA).warunki

    assert.equal(typeof stanLokalu, 'string')
    assert.equal(dokladna.length, 3)
    assert.ok(!dokladna.includes(String(stanLokalu)))
    assert.deepEqual(zSzybkiej, k.domyslne.oferta.warunki.map((w) => w.tresc))
  })

  it('warunki z wyceny wygrywają z ustawieniami, a ustawień z data/domyslne.json', async () => {
    const zUstawien = [{ id: 'zaliczka', tresc: 'Bez zaliczki.', tylko_szybka: false }]
    const zOferty = [{ id: 'klucze', tresc: 'Klucze odbieramy dzień wcześniej.', tylko_szybka: false }]
    const k = await kontekst({ warunki: zUstawien })

    assert.deepEqual(ofertaZWyceny(wycena(), k, DZIEN_WYSTAWIENIA).warunki, ['Bez zaliczki.'])
    assert.deepEqual(ofertaZWyceny(wycena({ oferta: { ...wycena().oferta, warunki: zOferty } }), k, DZIEN_WYSTAWIENIA).warunki,
      ['Klucze odbieramy dzień wcześniej.'])
  })
})

describe('ważność oferty', () => {
  it('oferta z 24.10.2026 jest ważna 7.11.2026 i nieważna 8.11.2026', async () => {
    const oferta = ofertaZWyceny(wycena(), await kontekst(), DZIEN_WYSTAWIENIA)

    assert.equal(oferta.waznaDo, '2026-11-07')
    assert.equal(czyWazna(oferta, new Date(2026, 10, 7, 23, 59)), true)
    assert.equal(czyWazna(oferta, new Date(2026, 10, 8, 0, 1)), false)
  })

  it('data ważności zmieniona w wycenie wygrywa z liczbą dni z data/domyslne.json', async () => {
    const w = wycena({ oferta: { ...wycena().oferta, waznaDo: '2026-12-01' } })

    assert.equal(ofertaZWyceny(w, await kontekst(), DZIEN_WYSTAWIENIA).waznaDo, '2026-12-01')
  })

  it('zła data ważności albo zły dzień sprawdzenia → BladOferty', () => {
    assert.throws(() => czyWazna({ waznaDo: '7.11.2026' }, DZIEN_WYSTAWIENIA), { name: 'BladOferty', kod: 'wazna_do' })
    assert.throws(() => czyWazna({ waznaDo: '2026-11-07' }, new Date(Number.NaN)), { name: 'BladOferty', kod: 'data' })
  })
})

describe('sprawdzZakresy i wczytajZakresy', () => {
  it('prawdziwy data/zakresy.json pasuje do prawdziwego katalogu', async () => {
    const zakresy = await wczytajZakresy(czytajJson)

    assert.deepEqual(sprawdzZakresy(zakresy, await katalogZDysku()), [])
  })

  it('brak usługi, usługa spoza katalogu, nieznany wariant i pusta lista „wchodzi” są błędami', async () => {
    const zakresy = { uslugi: {
      mieszkanie_standard: { wchodzi: [], nie_wchodzi: [] },
      sprzatanie_biur: { wchodzi: ['Podłogi'], nie_wchodzi: [], warianty: { co_godzine: { wchodzi: ['Podłogi'], nie_wchodzi: [] } } },
      okna: { wchodzi: ['Szyby'], nie_wchodzi: [] },
    } }

    assert.deepEqual(sprawdzZakresy(zakresy, await katalogTestowy()), [
      'brak zakresu usługi doczyszczanie', 'pusty albo zły zakres mieszkanie_standard', 'nieznany wariant sprzatanie_biur.co_godzine',
      'zakres usługi spoza katalogu albo dodatku: okna',
    ])
  })

  it('plik zakresów złego kształtu → BladKatalogu zly_format', async () => {
    const zlyPlik = { uslugi: { okna: { wchodzi: 'Szyby', nie_wchodzi: [] } } }

    await assert.rejects(wczytajZakresy(async () => zlyPlik), (blad) => blad instanceof BladKatalogu && blad.kod === 'zly_format')
  })
})
