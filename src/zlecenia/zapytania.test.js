import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { KLUCZ_MAGAZYNU, zaktualizujStan } from '../dane/magazyn.js'
import { jestWycena } from '../dane/wyceny.js'
import { dodajDni } from '../kalendarz/daty.js'
import { czyPlatnaZaWizyte, doZamkniecia, liczbaDzis, najblizsza, niezaplacone, wizytyDnia, wizytyOkresu } from './zapytania.js'

/** Sroda; dzien Z1, wczoraj Z3, seria Z2 w srody od 2026-10-21. */
const DZIS = '2026-11-04'
const NAZWY_USLUG = { mieszkanie_standard: 'Sprzątanie mieszkania', sprzatanie_biur: 'Sprzątanie biura', okna: 'Mycie okien' }
/** @param {string} id */
const nazwaUslugi = (id) => NAZWY_USLUG[id]
const SKRYPT_STANU = new URL('../../e2e/stany/moduly-dzis.js', import.meta.url)

/** Chwila w poludnie UTC: ten sam dzien lokalny w kazdej strefie od −11 do +11 h. @param {string} dzien */
const poludnie = (dzien) => `${dzien}T12:00:00.000Z`

/** @param {string} id @param {string} nazwa @param {string | null} adres */
const klientRek = (id, nazwa, adres) => ({ id, nazwa, telefon: null, adres, notatki: null, utworzony: poludnie('2026-10-01'),
  zmieniony: poludnie('2026-10-01') })

const KLIENCI = [
  klientRek('k-anna', 'Anna Kowalska', 'ul. Lipowa 3, Warszawa'),
  klientRek('k-biuro', 'Biuro Rachunkowe Lis', 'ul. Prosta 10, Warszawa'),
  klientRek('k-jan', 'Jan Nowak', null),
]

/** @param {Partial<import('../dane/zlecenia-ksztalt.js').StanWizyty>} pola */
const wizyta = (pola) => ({ przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null, ...pola })
const ZROBIONA = poludnie('2026-11-03')

/**
 * Zlecenie jednorazowe za wizyte (albo seria z `cykl`) zalozone w dniu `zalozone`.
 * @param {{ id: string, klientId: string, start: string, zalozone?: string, uslugaId?: string, godzina?: string | null,
 *   cena?: number, cykl?: object | null, rozliczenie?: string, wizyty?: object, zaplatyMiesieczne?: object }} p
 */
function zlecenieRek({ id, klientId, start, zalozone = start, uslugaId = 'okna', godzina = null, cena = 100, cykl = null,
  rozliczenie = 'za_wizyte', wizyty = {}, zaplatyMiesieczne = {} }) {
  const miesieczne = rozliczenie === 'miesiecznie'
  return { id, klientId, wycenaId: null, uslugaId, opis: null, rozliczenie, start,
    okresy: [{ od: start, cykl, godzina, cenaWizyty: miesieczne ? null : cena, cenaMiesiaca: miesieczne ? cena : null }],
    koniec: null, plan: null, wizyty, zaplatyMiesieczne, utworzone: poludnie(zalozone), zmienione: poludnie(zalozone) }
}

/** Pelny stan v2 sprawdzony straznikiem magazynu (zly fixture przerywa test). @param {object[]} zlecenia */
function stanZ(zlecenia) {
  const stan = { wersja: 2, ustawienia: null, wyceny: [], klienci: KLIENCI, zlecenia, licznikNumerow: {},
    kopia: { ostatnia: null, zmianaOd: null }, preferencje: { iosInstrukcjaZamknieta: false } }
  const wynik = zaktualizujStan(stan)
  assert.ok('stan' in wynik, 'fixture nie przechodzi straznika stanu')
  return wynik.stan
}

const Z1 = zlecenieRek({ id: 'z1', klientId: 'k-anna', uslugaId: 'mieszkanie_standard', start: DZIS, zalozone: '2026-11-02', godzina: '09:00',
  cena: 250 })
const Z2 = zlecenieRek({ id: 'z2', klientId: 'k-biuro', uslugaId: 'sprzatanie_biur', start: '2026-10-21', godzina: '15:00', cena: 1200,
  cykl: { co: 'tydzien', dni: [3] }, rozliczenie: 'miesiecznie', wizyty: { '2026-10-21': wizyta({ zrobiona: poludnie('2026-10-21') }) },
  zaplatyMiesieczne: { '2026-10': { forma: 'przelew', data: '2026-10-28', kwota: 1200 } } })
const Z3 = zlecenieRek({ id: 'z3', klientId: 'k-jan', start: '2026-11-03', zalozone: '2026-11-01', godzina: '10:00', cena: 180,
  wizyty: { '2026-11-03': wizyta({ zrobiona: ZROBIONA }) } })

/** @param {{ zlecenieId: string, data: string }[]} wiersze */
const klucze = (wiersze) => wiersze.map((w) => `${w.zlecenieId} ${w.data}`)

describe('zapytania dnia na stanie z Z1–Z3', () => {
  const stan = stanZ([Z1, Z2, Z3])

  it('liczbaDzis: Anna 9:00 i Biuro 15:00 → 2', () => {
    assert.equal(liczbaDzis(stan, DZIS), 2)
  })

  it('doZamkniecia: najpierw Biuro sprzed 7 dni (niezrobione), potem Jan z wczoraj (zrobione bez zapłaty)', () => {
    const wynik = doZamkniecia(stan, DZIS, nazwaUslugi)

    assert.deepEqual(klucze(wynik), ['z2 2026-10-28', 'z3 2026-11-03'])
    assert.equal(wynik[1].stan?.zrobiona, ZROBIONA)
  })

  it('niezaplacone: tylko wizyta Jana za 180 zł (miesiące serii Biura opłacone)', () => {
    assert.deepEqual(niezaplacone(stan, DZIS), [{ rodzaj: 'wizyta', zlecenieId: 'z3', klientId: 'k-jan', klucz: '2026-11-03', kwota: 180 }])
  })

  it('wizytyDnia: klient, adres z karty, nazwa usługi od wołającego, kwota wizyty albo null w serii miesięcznej', () => {
    const [anna, biuro] = wizytyDnia(stan, DZIS, nazwaUslugi)

    assert.deepEqual([anna.klient?.nazwa, anna.adres, anna.nazwa, anna.godzina, anna.kwota, anna.odwolana],
      ['Anna Kowalska', 'ul. Lipowa 3, Warszawa', 'Sprzątanie mieszkania', '09:00', 250, false])
    assert.deepEqual([biuro.klient?.nazwa, biuro.adres, biuro.nazwa, biuro.godzina, biuro.kwota], ['Biuro Rachunkowe Lis',
      'ul. Prosta 10, Warszawa', 'Sprzątanie biura', '15:00', null])
  })

  it('wizytyDnia: opis zlecenia zamiast nazwy usługi, klient bez adresu → adres null', () => {
    const zOpisem = stanZ([{ ...Z3, opis: 'Okna po remoncie' }])

    const [jan] = wizytyDnia(zOpisem, '2026-11-03', nazwaUslugi)

    assert.deepEqual([jan.nazwa, jan.adres, jan.kwota], ['Okna po remoncie', null, 180])
  })

  it('wizytyOkresu: wizyty wszystkich zleceń po dniu i godzinie w oknie dat', () => {
    assert.deepEqual(klucze(wizytyOkresu(stan, '2026-10-28', DZIS, nazwaUslugi)), ['z2 2026-10-28', 'z3 2026-11-03', 'z1 2026-11-04', 'z2 2026-11-04'])
  })

  it('odwołana wizyta dnia jest w wizytyDnia z flagą, ale nie w liczbaDzis', () => {
    const zOdwolana = stanZ([{ ...Z1, wizyty: { [DZIS]: wizyta({ odwolana: true }) } }, Z2])

    assert.deepEqual(wizytyDnia(zOdwolana, DZIS, nazwaUslugi).map((w) => [w.zlecenieId, w.odwolana]), [['z1', true], ['z2', false]])
    assert.equal(liczbaDzis(zOdwolana, DZIS), 1)
  })
})

describe('doZamkniecia i niezaplacone: granice', () => {
  it('seria co tydzień założona dziś ze startem 4 tygodnie wstecz nie daje pozycji w doZamkniecia', () => {
    const start = dodajDni(DZIS, -28)
    const stan = stanZ([zlecenieRek({ id: 'z', klientId: 'k-anna', start, zalozone: DZIS, cykl: { co: 'tydzien', dni: [3] } })])

    assert.equal(wizytyOkresu(stan, start, dodajDni(DZIS, -1), nazwaUslugi).length, 4)
    assert.deepEqual(doZamkniecia(stan, DZIS, nazwaUslugi), [])
  })

  it('odwołane wizyty nie trafiają do doZamkniecia (jednorazowa wczoraj i wizyta serii sprzed tygodnia)', () => {
    const odwolanaJednorazowa = stanZ([{ ...Z3, wizyty: { '2026-11-03': wizyta({ odwolana: true }) } }])
    const odwolanaWSerii = stanZ([{ ...Z2, wizyty: { ...Z2.wizyty, '2026-10-28': wizyta({ odwolana: true }) }, zaplatyMiesieczne: {} }])

    assert.deepEqual(doZamkniecia(odwolanaJednorazowa, DZIS, nazwaUslugi), [])
    assert.deepEqual(klucze(doZamkniecia(odwolanaWSerii, DZIS, nazwaUslugi)), [])
    assert.deepEqual(klucze(doZamkniecia(stanZ([Z2]), DZIS, nazwaUslugi)), ['z2 2026-10-28'])
  })

  it('wizyta zrobiona i zapłacona wypada z doZamkniecia i z niezaplacone', () => {
    const zaplata = { forma: 'gotowka', data: '2026-11-03', kwota: 180 }
    const stan = stanZ([{ ...Z3, wizyty: { '2026-11-03': wizyta({ zrobiona: ZROBIONA, zaplata }) } }])

    assert.deepEqual(doZamkniecia(stan, DZIS, nazwaUslugi), [])
    assert.deepEqual(niezaplacone(stan, DZIS), [])
  })

  it('wizyta zrobiona bez zapłaty z ceną 0 zł nie jest niezapłacona ani do zamknięcia', () => {
    const stan = stanZ([{ ...Z3, okresy: [{ ...Z3.okresy[0], cenaWizyty: 0 }] }])

    assert.deepEqual(niezaplacone(stan, DZIS), [])
    assert.deepEqual(doZamkniecia(stan, DZIS, nazwaUslugi), [])
  })

  it('niezrobiona wizyta za 0 zł nadal czeka na „Zrobione”', () => {
    const stan = stanZ([{ ...Z3, wizyty: {}, okresy: [{ ...Z3.okresy[0], cenaWizyty: 0 }] }])

    assert.deepEqual(klucze(doZamkniecia(stan, DZIS, nazwaUslugi)), ['z3 2026-11-03'])
  })

  it('seria miesięczna: poprzedni miesiąc ze zrobioną wizytą bez zapłaty → jedna pozycja `miesiac`, bieżący nie', () => {
    const zrobiona = wizyta({ zrobiona: poludnie('2026-10-21') })
    const stan = stanZ([{ ...Z2, zaplatyMiesieczne: {}, wizyty: { '2026-10-21': zrobiona, '2026-10-28': zrobiona,
      '2026-11-04': wizyta({ zrobiona: poludnie(DZIS) }) } }])

    assert.deepEqual(niezaplacone(stan, DZIS), [{ rodzaj: 'miesiac', zlecenieId: 'z2', klientId: 'k-biuro', klucz: '2026-10', kwota: 1200 }])
  })

  it('seria miesięczna: miesiąc bez zrobionej wizyty nie jest niezapłacony', () => {
    const stan = stanZ([{ ...Z2, zaplatyMiesieczne: {}, wizyty: {} }])

    assert.deepEqual(niezaplacone(stan, DZIS), [])
  })

  it('niezaplacone z klientId zwraca tylko pozycje tego klienta', () => {
    const stan = stanZ([Z3, { ...Z1, id: 'z1b', start: '2026-11-02', okresy: [{ ...Z1.okresy[0], od: '2026-11-02' }],
      wizyty: { '2026-11-02': wizyta({ zrobiona: ZROBIONA }) } }])

    assert.deepEqual(niezaplacone(stan, DZIS).map((n) => n.zlecenieId), ['z1b', 'z3'])
    assert.deepEqual(niezaplacone(stan, DZIS, 'k-anna').map((n) => [n.zlecenieId, n.kwota]), [['z1b', 250]])
    assert.deepEqual(niezaplacone(stan, DZIS, 'k-biuro'), [])
  })
})

describe('liczbaDzis i najblizsza: przesunięcia i odwołania', () => {
  const jutro = dodajDni(DZIS, 1)

  it('wizyta przesunięta z dziś na jutro nie liczy się dziś, a liczy jutro', () => {
    const stan = stanZ([{ ...Z1, wizyty: { [DZIS]: wizyta({ przeniesiona: { data: jutro, godzina: null } }) } }])

    assert.equal(liczbaDzis(stan, DZIS), 0)
    assert.equal(liczbaDzis(stan, jutro), 1)
  })

  it('najblizsza: pierwsza nieodwołana wizyta od jutra wśród wszystkich zleceń', () => {
    const z4 = zlecenieRek({ id: 'z4', klientId: 'k-jan', start: '2026-11-06', zalozone: DZIS, godzina: '08:00' })
    const stan = stanZ([Z1, { ...Z2, wizyty: { '2026-11-11': wizyta({ odwolana: true }) } }, z4])

    const wynik = najblizsza(stan, DZIS, nazwaUslugi)

    assert.deepEqual([wynik?.zlecenieId, wynik?.data, wynik?.godzina, wynik?.nazwa], ['z4', '2026-11-06', '08:00', 'Mycie okien'])
  })

  it('najblizsza: pomija odwołaną wizytę serii i bierze następną', () => {
    const stan = stanZ([{ ...Z2, wizyty: { '2026-11-11': wizyta({ odwolana: true }) } }])

    assert.equal(najblizsza(stan, DZIS, nazwaUslugi)?.data, '2026-11-18')
  })

  it('najblizsza: bez wizyt od jutra → null', () => {
    assert.equal(najblizsza(stanZ([Z1, Z3]), DZIS, nazwaUslugi), null)
  })
})

describe('czyPlatnaZaWizyte', () => {
  it('płatna jest wizyta za wizytę z ceną większą od zera', () => {
    assert.equal(czyPlatnaZaWizyte({ rozliczenie: 'za_wizyte' }, { cenaWizyty: 250 }), true)
  })

  it('wizyta za 0 zł, bez ceny i seria miesięczna nie są płatne za wizytę', () => {
    assert.equal(czyPlatnaZaWizyte({ rozliczenie: 'za_wizyte' }, { cenaWizyty: 0 }), false)
    assert.equal(czyPlatnaZaWizyte({ rozliczenie: 'za_wizyte' }, { cenaWizyty: null }), false)
    assert.equal(czyPlatnaZaWizyte({ rozliczenie: 'miesiecznie' }, { cenaWizyty: 250 }), false)
  })

  it('wiersz dnia niesie wynik reguły', () => {
    const za0zl = zlecenieRek({ id: 'z-0', klientId: 'k-anna', start: DZIS, cena: 0 })
    const platna = zlecenieRek({ id: 'z-p', klientId: 'k-jan', start: DZIS, cena: 100 })

    const wiersze = wizytyDnia(stanZ([za0zl, platna]), DZIS, nazwaUslugi)

    assert.deepEqual(wiersze.map((w) => [w.zlecenieId, w.czyPlatna]), [['z-0', false], ['z-p', true]])
  })
})

describe('nazwa wiersza wizyty', () => {
  it('zlecenie bez opisu i bez usługi ma nazwę „Zlecenie”, tak jak karta zlecenia', () => {
    const z = { ...zlecenieRek({ id: 'z-bez', klientId: 'k-anna', start: DZIS }), uslugaId: null }

    assert.equal(wizytyDnia({ klienci: KLIENCI, zlecenia: [z] }, DZIS, nazwaUslugi)[0].nazwa, 'Zlecenie')
  })
})

describe('zapytania: złe wejście', () => {
  const stan = stanZ([])

  it('zły dzień → BladKalendarza `dzien` także bez zleceń', () => {
    const zlyDzien = { name: 'BladKalendarza', kod: 'dzien' }

    assert.throws(() => liczbaDzis(stan, '2026-13-01'), zlyDzien)
    assert.throws(() => wizytyDnia(stan, '04.11.2026', nazwaUslugi), zlyDzien)
    assert.throws(() => doZamkniecia(stan, '2026-02-30', nazwaUslugi), zlyDzien)
    assert.throws(() => niezaplacone(stan, ''), zlyDzien)
    assert.throws(() => najblizsza(stan, 'jutro', nazwaUslugi), zlyDzien)
  })

  it('okno kończące się przed początkiem → BladKalendarza `okno`', () => {
    assert.throws(() => wizytyOkresu(stanZ([Z1]), DZIS, '2026-11-01', nazwaUslugi), { name: 'BladKalendarza', kod: 'okno' })
  })
})

/**
 * Uruchamia skrypt stanu E2E jak `agent-browser eval`: atrapa localStorage i zegar przegladarki o 10:00 czasu lokalnego dnia.
 * @param {string} kod @param {string} dzien
 */
function stanZeSkryptu(kod, dzien) {
  const teraz = new Date(`${dzien}T10:00:00`)
  class Zegar extends Date {
    /** @param {[]} argumenty */
    constructor(...argumenty) {
      if (argumenty.length === 0) super(teraz.getTime())
      else super(...argumenty)
    }
    static now() {
      return teraz.getTime()
    }
  }
  const localStorage = new PamiecMagazynu()
  const opis = runInNewContext(kod, { localStorage, Date: Zegar })
  const surowe = localStorage.getItem(KLUCZ_MAGAZYNU)
  assert.ok(surowe !== null, 'skrypt nie zapisał stanu')
  return { opis, wynik: zaktualizujStan(JSON.parse(surowe)) }
}

describe('stan E2E e2e/stany/moduly-dzis.js', () => {
  for (const dzien of ['2026-11-02', '2026-11-08', '2026-12-01']) {
    it(`zegar ${dzien}: stan v2 przechodzi straznik, dziś 2 wizyty, 2 do zamknięcia, 1 niezapłacona`, async () => {
      const kod = await readFile(SKRYPT_STANU, 'utf8')

      const { opis, wynik } = stanZeSkryptu(kod, dzien)

      assert.ok('stan' in wynik, 'stan ze skryptu nie przechodzi straznika magazynu')
      const { stan } = wynik
      assert.equal(opis, `moduly-dzis ${dzien}: 3 klientów, 3 zlecenia, 4 wyceny`)
      assert.equal(stan.wersja, 2)
      assert.ok(stan.wyceny.every(jestWycena), 'wycena ze skryptu nie przechodzi jestWycena')
      assert.equal(liczbaDzis(stan, dzien), 2)
      assert.deepEqual(doZamkniecia(stan, dzien, nazwaUslugi).map((w) => [w.klient?.nazwa, w.data]),
        [['Biuro Rachunkowe Lis', dodajDni(dzien, -7)], ['Jan Nowak', dodajDni(dzien, -1)]])
      assert.deepEqual(niezaplacone(stan, dzien), [{ rodzaj: 'wizyta', zlecenieId: 'e2e-zlecenie-jan', klientId: 'e2e-klient-jan',
        klucz: dodajDni(dzien, -1), kwota: 180 }])
      assert.deepEqual(stan.wyceny.map((w) => [w.klient.nazwa, w.status]), [['Biuro Rachunkowe Lis', 'przyjeta'],
        ['Anna Kowalska', 'przyjeta'], ['Anna Kowalska', 'wyslana'], ['Jan Nowak', 'do_wyslania']])
    })
  }
})
