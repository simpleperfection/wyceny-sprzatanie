import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { wycenUsluge } from './cena.js'
import { zBrudem } from './czas.js'
import { naDokladna, STANY_SZYBKIEJ, szybkaWycena, tekstDlaKlienta } from './szybka.js'
import { ukladMieszkania } from './uklad.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./szybka.js').KontekstSzybkiej} KontekstSzybkiej */
/** @typedef {import('./szybka.js').WejscieSzybkiej} WejscieSzybkiej */
/** @typedef {{ opis: string, usluga: string, m2: number, wojewodztwo: string | null, uklad: { typ: string, m2: number }[], cena: number }} Scenariusz */

const ZASTRZEZENIE = 'Cena ostateczna po obejrzeniu lokalu lub zdjęć.'
const MIESZKANIE_50 = /** @type {const} */ ({ uslugaId: 'mieszkanie_standard', m2: 50, wojewodztwoId: 'mazowieckie' })

/** @type {{ pomieszczenia: Scenariusz[] }} */
const scenariusze = await czytajJson('research/kalibracja-scenariusze.json')

/** @param {Katalog} katalog @param {Partial<KontekstSzybkiej>} [zmiany] @returns {KontekstSzybkiej} */
function kontekst(katalog, zmiany = {}) {
  return { katalog, statusVat: 'zwolniony', stawkaVatProc: 23, tempo: 1.3, koszty: katalog.kosztyFirmy, zastrzezenie: ZASTRZEZENIE, ...zmiany }
}

/** @param {() => unknown} fn @param {string} kod */
function rzucaKod(fn, kod) {
  assert.throws(fn, (blad) => blad instanceof Error && 'kod' in blad && blad.kod === kod)
}

describe('STANY_SZYBKIEJ', () => {
  it('ma stany z rejestru planu w kolejności lekki, typowy, mocny', () => {
    assert.deepEqual(STANY_SZYBKIEJ, [{ id: 'lekki', etykieta: 'Lekki' }, { id: 'typowy', etykieta: 'Typowy' }, { id: 'mocny', etykieta: 'Mocny' }])
  })
})

describe('szybkaWycena: usługi z pomieszczeniami', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('mieszkanie 50 m² standard w mazowieckim, typowy: 250–300 zł, mediana 250, rynek 120–450', () => {
    const wynik = szybkaWycena({ ...MIESZKANIE_50, stan: 'typowy' }, kontekst(katalog))

    assert.equal(wynik.tryb, 'widelki')
    assert.deepEqual([wynik.od, wynik.do, wynik.mediana], [250, 300, 250])
    assert.deepEqual(wynik.rynek, { od: 120, do: 450, pelne: true })
    assert.equal(wynik.tekst, 'Sprzątanie mieszkania 50 m², standard: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.')
  })

  it('mocny: 290–360 zł (kurz poziom 2 i 3), mediana i rynek nadal z poziomu 1', () => {
    const wynik = szybkaWycena({ ...MIESZKANIE_50, stan: 'mocny' }, kontekst(katalog))

    assert.deepEqual([wynik.tryb, wynik.od, wynik.do, wynik.mediana], ['widelki', 290, 360, 250])
    assert.deepEqual(wynik.rynek, { od: 120, do: 450, pelne: true })
  })

  it('lekki: „ok. 250 zł” (jedna kwota zaokrąglona do 10 zł)', () => {
    const wynik = szybkaWycena({ ...MIESZKANIE_50, stan: 'lekki' }, kontekst(katalog))

    assert.deepEqual([wynik.tryb, wynik.od, wynik.do], ['ok', 250, 250])
    assert.equal(wynik.tekst, `Sprzątanie mieszkania 50 m², standard: ok. 250 zł. ${ZASTRZEZENIE}`)
  })

  for (const usluga of ['mieszkanie_standard', 'mieszkanie_gruntowne', 'mieszkanie_po_wynajmie']) {
    it(`${usluga} 50 m²: dolna granica typowego = cena dokładnej wyceny układu ze scenariusza kalibracji (R14, R27)`, () => {
      const s = scenariusze.pomieszczenia.find((x) => x.usluga === usluga && x.m2 === 50 && x.wojewodztwo === null && x.opis.startsWith('sekcja 2'))
      assert.ok(s, `brak scenariusza sekcji 2 dla ${usluga}`)
      const wejscie = { uslugaId: usluga, m2: 50, stan: /** @type {const} */ ('typowy'), wojewodztwoId: null }

      const wynik = szybkaWycena(wejscie, kontekst(katalog))
      const dokladna = naDokladna(wejscie, kontekst(katalog))

      assert.equal(wynik.mediana, Math.round(s.cena))
      assert.equal(wynik.od, Math.floor(Math.round(s.cena) / 10) * 10)
      assert.deepEqual(dokladna.wejscie.pomieszczenia?.map((p) => ({ typ: p.typ, m2: p.m2 })), s.uklad)
      assertBlisko(wycenUsluge(dokladna.wejscie, katalog).cenaUslugi, s.cena, 0.01)
    })
  }

  it('mieszkanie 20 m²: obie granice co najmniej minimum 150 zł; dojazd 32 km dokłada 44 zł na obu końcach', () => {
    const bezDojazdu = szybkaWycena({ uslugaId: 'mieszkanie_standard', m2: 20, stan: 'typowy' }, kontekst(katalog))
    const zDojazdem = szybkaWycena({ uslugaId: 'mieszkanie_standard', m2: 20, stan: 'typowy', dojazdKm: 32 }, kontekst(katalog))

    assert.deepEqual([bezDojazdu.od, bezDojazdu.do], [150, 180])
    assert.deepEqual([zDojazdem.od, zDojazdem.do], [150 + 44, 180 + 44])
  })

  it('mieszkanie 15 m², lekki: cena modelu poniżej minimum daje „ok. 150 zł”', () => {
    const wynik = szybkaWycena({ uslugaId: 'mieszkanie_standard', m2: 15, stan: 'lekki' }, kontekst(katalog))

    assert.deepEqual([wynik.tryb, wynik.od, wynik.do, wynik.mediana], ['ok', 150, 150, 150])
  })

  it('mieszkanie po remoncie 60 m²: „orientacyjnie od” ceny poziomu 1 z pyłem budowlanym, w dół do 10 zł', () => {
    const usluga = katalog.usluga('mieszkanie_po_remoncie')
    const pomieszczenia = zBrudem(ukladMieszkania(60, {}, katalog.uklady), usluga.brud_domyslny)
    const cena = wycenUsluge({ uslugaId: usluga.id, pomieszczenia }, katalog).cena

    const wynik = szybkaWycena({ uslugaId: usluga.id, m2: 60 }, kontekst(katalog))

    assert.equal(wynik.tryb, 'od')
    assert.equal(wynik.od, Math.floor(Math.round(cena) / 10) * 10)
    assert.equal(wynik.od, 700)
    assert.equal(wynik.tekst, `Sprzątanie mieszkania po remoncie 60 m²: orientacyjnie od 700 zł. ${ZASTRZEZENIE}`)
  })

  it('biuro 100 m² jednorazowo u czynnego podatnika: VAT 23% na górze ceny netto, potem zaokrąglenie', () => {
    const zwolniony = szybkaWycena({ uslugaId: 'sprzatanie_biur', m2: 100, stan: 'typowy' }, kontekst(katalog))
    const czynny = szybkaWycena({ uslugaId: 'sprzatanie_biur', m2: 100, stan: 'typowy' }, kontekst(katalog, { statusVat: 'czynny' }))

    assert.deepEqual([zwolniony.od, zwolniony.do], [170, 280])
    assert.deepEqual([czynny.od, czynny.do], [220, 340])
    assert.equal(czynny.tekst, 'Sprzątanie biura 100 m², jednorazowo: 220–340 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.')
  })

  it('„zostaje dla Ciebie” na obu końcach: cena granicy minus koszt zlecenia (czynny podatnik od netto)', () => {
    const zwolniony = szybkaWycena({ ...MIESZKANIE_50, stan: 'typowy' }, kontekst(katalog))
    const czynny = szybkaWycena({ ...MIESZKANIE_50, stan: 'typowy' }, kontekst(katalog, { statusVat: 'czynny' }))

    assertBlisko(zwolniony.zostaje.od, 234.612, 1e-6)
    assertBlisko(zwolniony.zostaje.do, 281.612, 1e-6)
    assertBlisko(zwolniony.zostaje.naGodzine.od, 234.612 / ((250.055 / 65) * 1.3), 1e-2)
    assertBlisko(czynny.zostaje.od, 250 / 1.23 - (250 - 234.612), 1e-2)
  })
})

describe('szybkaWycena: usługi z pozycjami', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('okna 4 × okno 1-skrzydłowe: 150 zł z minimum, tryb „ok”', () => {
    const wynik = szybkaWycena({ uslugaId: 'okna', pozycje: [{ id: 'okno_1', ilosc: 4 }] }, kontekst(katalog))

    assert.deepEqual([wynik.tryb, wynik.od, wynik.do], ['ok', 150, 150])
    assert.equal(wynik.tekst, `Mycie okien, 4 × okno 1-skrzydłowe: ok. 150 zł. ${ZASTRZEZENIE}`)
  })

  it('tapicerka kanapa 3-os. i fotel: widełki od ceny (200 zł) do ceny × 1,2 (240 zł)', () => {
    const pozycje = [{ id: 'kanapa_3', ilosc: 1 }, { id: 'fotel', ilosc: 1 }]

    const wynik = szybkaWycena({ uslugaId: 'tapicerka', pozycje }, kontekst(katalog))

    assert.deepEqual([wynik.tryb, wynik.od, wynik.do, wynik.mediana], ['widelki', 200, 240, 200])
  })

  it('mycie kostki 100 m² (oględziny): „orientacyjnie od” głównej pozycji bez dopłat', () => {
    const wynik = szybkaWycena({ uslugaId: 'mycie_kostki', m2: 100 }, kontekst(katalog))

    assert.deepEqual([wynik.tryb, wynik.od], ['od', 1500])
  })
})

describe('szybkaWycena: błędy wejścia', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('usługa bez pola szybka_wycena (AGD) daje BladWejscia bez_szybkiej', () => {
    rzucaKod(() => szybkaWycena({ uslugaId: 'agd', pozycje: [{ id: 'piekarnik', ilosc: 1 }] }, kontekst(katalog)), 'bez_szybkiej')
  })

  it('nieznany stan lokalu daje BladWejscia stan', () => {
    const wejscie = /** @type {WejscieSzybkiej} */ (/** @type {unknown} */ ({ ...MIESZKANIE_50, stan: 'brudny' }))
    rzucaKod(() => szybkaWycena(wejscie, kontekst(katalog)), 'stan')
  })

  it('mieszkanie bez metrażu daje BladWejscia metraz', () => {
    rzucaKod(() => szybkaWycena({ uslugaId: 'mieszkanie_standard', stan: 'typowy' }, kontekst(katalog)), 'metraz')
  })
})

describe('tekstDlaKlienta', () => {
  it('opis, widełki i zastrzeżenie', () => {
    const tekst = tekstDlaKlienta('Sprzątanie mieszkania 50 m², standard', { tryb: 'widelki', od: 250, do: 300 }, ZASTRZEZENIE)

    assert.equal(tekst, 'Sprzątanie mieszkania 50 m², standard: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.')
  })

  it('pusty opis daje BladWejscia opis', () => {
    rzucaKod(() => tekstDlaKlienta(' ', { tryb: 'ok', od: 150, do: 150 }, ZASTRZEZENIE), 'opis')
  })
})

describe('naDokladna', () => {
  /** @type {Katalog} */ let katalog
  before(async () => {
    katalog = await katalogZDysku()
  })

  it('mocny stan: 4 pomieszczenia układu 50 m² z kurzem poziom 2, te same odpowiedzi i widełki szybkiej wyceny', () => {
    const odpowiedzi = { zwierzeta: { wartosc: 'tak', notatka: 'kot' }, dojazd: { wartosc: 12 } }

    const wynik = naDokladna({ ...MIESZKANIE_50, stan: 'mocny', odpowiedzi }, kontekst(katalog))

    assert.deepEqual(wynik.wejscie.pomieszczenia, [
      { typ: 'pokoj', m2: 32, brud: [{ id: 'kurz', poziom: 2 }] },
      { typ: 'przedpokoj', m2: 6, brud: [{ id: 'kurz', poziom: 2 }] },
      { typ: 'kuchnia', m2: 8, brud: [{ id: 'kurz', poziom: 2 }] },
      { typ: 'lazienka', m2: 4, brud: [{ id: 'kurz', poziom: 2 }] },
    ])
    assert.deepEqual(wynik.odpowiedzi, odpowiedzi)
    assert.deepEqual(wynik.szybka, { stan: 'mocny', od: 290, do: 360, tryb: 'widelki' })
    assert.equal(wynik.wejscie.wojewodztwoId, 'mazowieckie')
  })

  it('typowy stan: pomieszczenia bez reguły kurzu, pozycje i dodatki przechodzą do wejścia', () => {
    const dodatki = [{ uslugaId: 'agd', pozycjaId: 'piekarnik', ilosc: 1, tryb: /** @type {const} */ ('w_cenie') }]

    const wynik = naDokladna({ ...MIESZKANIE_50, stan: 'typowy', dodatki, dojazdKm: 20 }, kontekst(katalog))

    assert.deepEqual(wynik.wejscie.pomieszczenia?.map((p) => p.brud), [[], [], [], []])
    assert.deepEqual(wynik.wejscie.dodatki, dodatki)
    assert.equal(wynik.wejscie.dojazdKm, 20)
  })

  it('nieznana usługa daje BladWejscia nieznana_usluga', () => {
    rzucaKod(() => naDokladna({ uslugaId: 'mycie_jachtow', m2: 50, stan: 'typowy' }, kontekst(katalog)), 'nieznana_usluga')
  })
})
