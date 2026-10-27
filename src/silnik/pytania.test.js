import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import {
  bezSkutkuBrudu, czySkutekWWejsciu, ODPOWIEDZI_TAK_NIE, opisOdpowiedzi, pytaniaUslugi, regulyBrudu, RODZAJE_SKUTKOW, sprawdzPytania,
  TYPY_ODPOWIEDZI, zastosujOdpowiedzi,
} from './pytania.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./pytania.js').Pytania} Pytania */
/** @typedef {import('./pytania.js').Pytanie} Pytanie */

/** @type {Pytanie} */
const DOJAZD = { id: 'dojazd', tresc: 'Parking i dojazd', typ: 'liczba', jednostka: 'km', skutek: { rodzaj: 'dojazd_km' } }
/** @type {Pytanie} */
const ZWIERZETA = {
  id: 'zwierzeta', tresc: 'Czy w domu są zwierzęta?', typ: 'tak_nie',
  skutek: { rodzaj: 'brud', brud: 'siersc', poziom: 2, pomieszczenie: '*', gdy: 'tak' },
}
/** @type {Pytanie} */
const SPRZET = { id: 'sprzet', tresc: 'Czyj sprzęt?', typ: 'wybor', opcje: ['Nasze', 'Klienta'] }
/** @type {Pytania} */
const PYTANIA = {
  wspolne: [DOJAZD],
  uslugi: { mieszkanie_standard: [ZWIERZETA, SPRZET], okna: [{ ...ZWIERZETA, id: 'zwierzeta_okna' }] },
}
const POKOJE = [
  { typ: 'pokoj', m2: 30, brud: [{ id: 'kurz', poziom: 1 }] },
  { typ: 'kuchnia', m2: 8, brud: [{ id: 'siersc', poziom: 1 }] },
]

/** @param {() => unknown} fn @param {string} kod */
function rzucaKod(fn, kod) {
  assert.throws(fn, (blad) => blad instanceof Error && 'kod' in blad && blad.kod === kod)
}

/** Plik pytan z jedna zmiana dla testow bledow. @param {(p: Pytania) => void} zmien @returns {Promise<Pytania>} */
async function zmienionePytania(zmien) {
  /** @type {Pytania} */
  const pytania = await czytajJson('data/pytania.json')
  zmien(pytania)
  return pytania
}

describe('stałe pytań', () => {
  it('rodzaje skutków i typy odpowiedzi z rejestru planu', () => {
    assert.deepEqual(RODZAJE_SKUTKOW, ['brud', 'dojazd_km'])
    assert.deepEqual(TYPY_ODPOWIEDZI, ['tak_nie', 'wybor', 'liczba', 'tekst'])
  })
})

describe('pytaniaUslugi', () => {
  it('wspólne, potem pytania usługi', () => {
    assert.deepEqual(pytaniaUslugi('mieszkanie_standard', PYTANIA).map((p) => p.id), ['dojazd', 'zwierzeta', 'sprzet'])
  })

  it('usługa bez wpisu daje BladWejscia nieznana_usluga (także klucz z prototypu obiektu)', () => {
    rzucaKod(() => pytaniaUslugi('agd', PYTANIA), 'nieznana_usluga')
    rzucaKod(() => pytaniaUslugi('toString', PYTANIA), 'nieznana_usluga')
  })
})

describe('opisOdpowiedzi', () => {
  it('tak z notatką: „Tak, kot”; liczba z jednostką i notatką: „12 km, parking pod blokiem”; wybór bez notatki', () => {
    assert.equal(opisOdpowiedzi(ZWIERZETA, { wartosc: 'tak', notatka: 'kot' }), 'Tak, kot')
    assert.equal(opisOdpowiedzi(DOJAZD, { wartosc: 12, notatka: 'parking pod blokiem' }), '12 km, parking pod blokiem')
    assert.equal(opisOdpowiedzi(SPRZET, { wartosc: 'Klienta' }), 'Klienta')
  })

  it('wartość spoza typu i notatka dłuższa niż 200 znaków dają BladWejscia', () => {
    rzucaKod(() => opisOdpowiedzi(SPRZET, { wartosc: 'Sąsiada' }), 'odpowiedz')
    rzucaKod(() => opisOdpowiedzi(DOJAZD, { wartosc: -3 }), 'odpowiedz')
    rzucaKod(() => opisOdpowiedzi(ZWIERZETA, { wartosc: 'tak', notatka: 'x'.repeat(201) }), 'notatka')
  })
})

describe('zastosujOdpowiedzi', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('„tak” na pytanie o zwierzęta (sierść poziom 2 na *) ustawia sierść we wszystkich pomieszczeniach; 32 km ustawia dojazdKm', () => {
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: POKOJE }

    const wynik = zastosujOdpowiedzi(wejscie, { zwierzeta: { wartosc: 'tak' }, dojazd: { wartosc: 32 } }, PYTANIA, katalog)

    assert.deepEqual(wynik.wejscie.pomieszczenia, [
      { typ: 'pokoj', m2: 30, brud: [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 2 }] },
      { typ: 'kuchnia', m2: 8, brud: [{ id: 'siersc', poziom: 2 }] },
    ])
    assert.equal(wynik.wejscie.dojazdKm, 32)
    assert.deepEqual(wynik.skutki, [
      { pytanieId: 'dojazd', opis: 'dojazd: 44 zł dla klienta' },
      { pytanieId: 'zwierzeta', opis: 'sierść zwierząt, poziom 2 we wszystkich pomieszczeniach' },
    ])
    assert.deepEqual(wejscie.pomieszczenia, POKOJE)
  })

  it('„nie”, odpowiedź bez skutku i usługa z pozycjami nie zmieniają brudu', () => {
    const mieszkanie = zastosujOdpowiedzi({ uslugaId: 'mieszkanie_standard', pomieszczenia: POKOJE }, { zwierzeta: { wartosc: 'nie' }, sprzet: { wartosc: 'Nasze' } }, PYTANIA, katalog)
    const okna = zastosujOdpowiedzi({ uslugaId: 'okna', pozycje: [{ id: 'okno_1', ilosc: 2 }] }, { zwierzeta_okna: { wartosc: 'tak' } }, PYTANIA, katalog)

    assert.deepEqual(mieszkanie, { wejscie: { uslugaId: 'mieszkanie_standard', pomieszczenia: POKOJE }, skutki: [] })
    assert.deepEqual(okna, { wejscie: { uslugaId: 'okna', pozycje: [{ id: 'okno_1', ilosc: 2 }] }, skutki: [] })
  })

  it('zła odpowiedź na pytanie ze skutkiem daje BladWejscia odpowiedz', () => {
    rzucaKod(() => zastosujOdpowiedzi({ uslugaId: 'mieszkanie_standard' }, { dojazd: { wartosc: 'daleko' } }, PYTANIA, katalog), 'odpowiedz')
  })
})

describe('regulyBrudu', () => {
  it('„tak” na pytanie o zwierzęta daje regułę sierści; dojazd i odpowiedź bez skutku nie dają reguł', () => {
    const odpowiedzi = { zwierzeta: { wartosc: 'tak' }, dojazd: { wartosc: 32 }, sprzet: { wartosc: 'Nasze' } }

    const reguly = regulyBrudu('mieszkanie_standard', odpowiedzi, PYTANIA)

    assert.deepEqual(reguly, [{ pomieszczenie: '*', brud: 'siersc', poziom: 2 }])
  })

  it('„nie” nie daje reguły', () => {
    assert.deepEqual(regulyBrudu('mieszkanie_standard', { zwierzeta: { wartosc: 'nie' } }, PYTANIA), [])
  })

  it('zła odpowiedź na pytanie ze skutkiem brudu daje BladWejscia odpowiedz, usługa bez pytań — nieznana_usluga', () => {
    rzucaKod(() => regulyBrudu('mieszkanie_standard', { zwierzeta: { wartosc: 'może' } }, PYTANIA), 'odpowiedz')
    rzucaKod(() => regulyBrudu('dywany', {}, PYTANIA), 'nieznana_usluga')
  })
})

describe('sprawdzPytania', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('prawdziwy data/pytania.json nie ma błędów', async () => {
    assert.deepEqual(sprawdzPytania(await czytajJson('data/pytania.json'), katalog), [])
  })

  it('nieznany brud „blotko” daje błąd z miejscem pytania', async () => {
    const pytania = await zmienionePytania((p) => {
      p.uslugi.mieszkanie_standard?.splice(0, 1, { ...ZWIERZETA, skutek: { rodzaj: 'brud', brud: 'blotko', poziom: 1, pomieszczenie: 'pokoj', gdy: 'tak' } })
    })

    assert.deepEqual(sprawdzPytania(pytania, katalog), ['uslugi.mieszkanie_standard[0] (zwierzeta): nieznany brud blotko'])
  })

  it('nieznana usługa, brak wpisu usługi, skutek przy złym typie, pusta treść i powtórzone id', async () => {
    const pytania = await zmienionePytania((p) => {
      p.uslugi.mycie_jachtow = [{ id: 'maszt', tresc: 'Maszt?', typ: 'tak_nie' }]
      delete p.uslugi.okna
      p.uslugi.tapicerka = [{ id: 'termin', tresc: ' ', typ: 'tekst', skutek: { rodzaj: 'dojazd_km' } }]
    })

    assert.deepEqual(sprawdzPytania(pytania, katalog), [
      'uslugi.tapicerka[0] (termin): pusta treść',
      'uslugi.tapicerka[0] (termin): skutek dojazd_km przy typie tekst',
      'uslugi.tapicerka: powtórzone id termin',
      'uslugi.mycie_jachtow: nieznana usługa',
      'uslugi: brak pytań usługi okna',
    ])
  })

  it('plik bez listy wspolne daje jeden błąd kształtu', () => {
    assert.deepEqual(sprawdzPytania({ uslugi: {} }, katalog), ['Plik pytań musi mieć listę wspolne i obiekt uslugi'])
  })
})

describe('sprawdzPytania: odmowy pojedynczych reguł', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  const MIEJSCE = 'uslugi.mieszkanie_standard[0] (zwierzeta)'
  const SKUTEK = { rodzaj: 'brud', brud: 'siersc', poziom: 1, pomieszczenie: 'pokoj', gdy: 'tak' }
  /** @type {[string, Record<string, unknown>, string[]][]} */
  const przypadki = [
    ['poziom brudu poza 1–3', { ...ZWIERZETA, skutek: { ...SKUTEK, poziom: 4 } }, [`${MIEJSCE}: poziom brudu 4 poza 1–3`]],
    ['poziom brudu ułamkowy', { ...ZWIERZETA, skutek: { ...SKUTEK, poziom: 1.5 } }, [`${MIEJSCE}: poziom brudu 1.5 poza 1–3`]],
    ['nieznane pomieszczenie', { ...ZWIERZETA, skutek: { ...SKUTEK, pomieszczenie: 'garaz' } }, [`${MIEJSCE}: nieznane pomieszczenie garaz`]],
    ['skutek brud przy liczbie', { ...ZWIERZETA, typ: 'liczba', skutek: SKUTEK }, [`${MIEJSCE}: skutek brud przy typie liczba`]],
    ['skutek brud przy tekście', { ...ZWIERZETA, typ: 'tekst', skutek: SKUTEK }, [`${MIEJSCE}: skutek brud przy typie tekst`]],
    ['warunek gdy spoza odpowiedzi tak/nie', { ...ZWIERZETA, skutek: { ...SKUTEK, gdy: 'moze' } },
      [`${MIEJSCE}: warunek skutku moze nie jest możliwą odpowiedzią`]],
    ['warunek gdy spoza opcji wyboru', { ...ZWIERZETA, typ: 'wybor', opcje: ['Kot', 'Pies'], skutek: { ...SKUTEK, gdy: 'Chomik' } },
      [`${MIEJSCE}: warunek skutku Chomik nie jest możliwą odpowiedzią`]],
    ['puste opcje wyboru', { ...ZWIERZETA, typ: 'wybor', opcje: [], skutek: undefined }, [`${MIEJSCE}: puste opcje`]],
    ['opcja wyboru ze spacji', { ...ZWIERZETA, typ: 'wybor', opcje: ['Kot', ' '], skutek: undefined }, [`${MIEJSCE}: puste opcje`]],
    ['nieznany typ odpowiedzi', { ...ZWIERZETA, typ: 'data', skutek: undefined }, [`${MIEJSCE}: nieznany typ data`]],
    ['nieznany rodzaj skutku', { ...ZWIERZETA, skutek: { rodzaj: 'czas' } }, [`${MIEJSCE}: nieznany rodzaj skutku`]],
    ['skutek nie jest obiektem', { ...ZWIERZETA, skutek: 'brud' }, [`${MIEJSCE}: nieznany rodzaj skutku`]],
    ['puste id', { ...ZWIERZETA, id: ' ' }, ['uslugi.mieszkanie_standard[0] ( ): puste id']],
  ]
  for (const [regula, pytanie, bledy] of przypadki) {
    it(`${regula} → ${bledy.join('; ')}`, async () => {
      const pytania = await zmienionePytania((p) => { p.uslugi.mieszkanie_standard?.splice(0, 1, /** @type {Pytanie} */ (pytanie)) })

      assert.deepEqual(sprawdzPytania(pytania, katalog), bledy)
    })
  }

  it('pytanie wspólne, które nie jest obiektem, i lista usługi, która nie jest tablicą', async () => {
    const pytania = await zmienionePytania((p) => {
      p.wspolne.splice(0, 1, /** @type {Pytanie} */ (/** @type {unknown} */ ('dojazd')))
      p.uslugi.okna = /** @type {Pytanie[]} */ (/** @type {unknown} */ ({ id: 'okna' }))
    })

    assert.deepEqual(sprawdzPytania(pytania, katalog), ['wspolne[0]: pytanie musi być obiektem', 'uslugi.okna: lista pytań musi być tablicą'])
  })

  it('zdjęcia: nie-obiekt, nieznana usługa i pusta podpowiedź albo prośba', async () => {
    const lista = await zmienionePytania((p) => { p.zdjecia = /** @type {never} */ ([]) })
    const zle = await zmienionePytania((p) => {
      p.zdjecia = { jachty: { podpowiedz: 'Maszt', prosba: 'Zdjęcie masztu' }, okna: { podpowiedz: ' ', prosba: 'Zdjęcie okien' } }
    })

    assert.deepEqual(sprawdzPytania(lista, katalog), ['zdjecia: musi być obiektem'])
    assert.deepEqual(sprawdzPytania(zle, katalog), ['zdjecia.jachty: nieznana usługa', 'zdjecia.okna: pusta podpowiedź albo prośba'])
  })
})

describe('skutek odpowiedzi w wejściu', () => {
  const SIERSC_POKOJ = /** @type {const} */ ({ rodzaj: 'brud', brud: 'siersc', poziom: 1, pomieszczenie: 'pokoj', gdy: 'tak' })
  const WEJSCIE = { uslugaId: 'mieszkanie_standard', dojazdKm: 12, pomieszczenia: [
    { typ: 'pokoj', m2: 15, brud: [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 1 }] },
    { typ: 'pokoj', m2: 15, brud: [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 2 }] },
    { typ: 'kuchnia', m2: 8, brud: [{ id: 'siersc', poziom: 1 }] },
  ] }

  it('odpowiedzi tak/nie z jednego źródła', () => {
    assert.deepEqual(ODPOWIEDZI_TAK_NIE, ['tak', 'nie'])
  })

  it('czySkutekWWejsciu: dojazd równy odpowiedzi i sierść 1 w pokoju są; inne km, sierść tylko w kuchni albo na poziomie 2 — nie', () => {
    const bezPokoju1 = { ...WEJSCIE, pomieszczenia: WEJSCIE.pomieszczenia.slice(1) }

    assert.equal(czySkutekWWejsciu(WEJSCIE, { rodzaj: 'dojazd_km' }, { wartosc: 12 }), true)
    assert.equal(czySkutekWWejsciu(WEJSCIE, { rodzaj: 'dojazd_km' }, { wartosc: 32 }), false)
    assert.equal(czySkutekWWejsciu(WEJSCIE, SIERSC_POKOJ, { wartosc: 'tak' }), true)
    assert.equal(czySkutekWWejsciu(bezPokoju1, SIERSC_POKOJ, { wartosc: 'tak' }), false)
  })

  it('bezSkutkuBrudu: pokój z poziomem skutku traci sierść (albo wraca poziom domyślny), pokój z poziomem 2 i kuchnia zostają', () => {
    const bezDomyslnego = bezSkutkuBrudu(WEJSCIE, SIERSC_POKOJ, () => [{ id: 'kurz', poziom: 1 }])
    const zDomyslnym = bezSkutkuBrudu(WEJSCIE, SIERSC_POKOJ, () => [{ id: 'siersc', poziom: 3 }])

    assert.deepEqual(bezDomyslnego.pomieszczenia?.map((p) => p.brud), [
      [{ id: 'kurz', poziom: 1 }], [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 2 }], [{ id: 'siersc', poziom: 1 }],
    ])
    assert.deepEqual(zDomyslnym.pomieszczenia?.[0]?.brud, [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 3 }])
    assert.equal(zDomyslnym.dojazdKm, 12)
  })
})
