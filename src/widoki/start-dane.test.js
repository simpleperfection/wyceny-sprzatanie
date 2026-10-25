import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { czytajJson, katalogTestowy } from '../../tests/pomocnicze.js'
import { odczytajKopie } from '../dane/kopia.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn } from '../dane/magazyn.js'
import { brakujeUstawien, scalKoszty } from '../dane/ustawienia.js'
import {
  adresWyceny, BladDaty, doZrobienia, inicjal, kwotaWyceny, nazwaMiesiaca, podsumowanieMiesiaca, wierszTempa,
} from './start-dane.js'

/** @typedef {import('./start-dane.js').DaneKosztow} DaneKosztow */

const DZIS = new Date(2026, 9, 25, 12, 0)
const USTAWIENIA = {
  wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony', firma: { nazwa: 'Lśniący Dom', telefon: '600100200', email: '', nip: '' },
  tempo: { reczne: null }, koszty: { chemia_h: 6, sprzet: {}, dojazd: { koszt_firmy_zl_km: 1 } }, zakresy: {}, warunki: null,
  przypomnienieKopiiDni: 7, kreatorZakonczony: true,
}

/**
 * Migawka z jedna linia pracy: chemia = 6 zl/h × minuty / 60, dojazd firmy = 2 × km × 1 zl (koszty z USTAWIENIA).
 * @param {{ cena: number, minuty: number, km?: number }} p
 */
const migawka = ({ cena, minuty, km = 0 }) => ({
  cena, netto: cena, vat: 0, mediana: cena, widelki: { od: cena, do: cena, pelne: true }, minutyNormowe: minuty,
  linie: [{ rodzaj: 'praca', klucz: null, opis: 'Praca', ilosc: 1, jednostka: 'h', cenaJedn: cena, cenaBazowa: cena, mnoznikProgu: 1,
    kwota: cena, zakres: null, minuty }],
  propozycje: [], dojazd: { km, kwota: 0 }, wojewodztwo: { id: 'mazowieckie', nazwa: 'mazowieckie', stawka_h: 65, wsp: 1 },
  statusVat: 'zwolniony', stawkaVatProc: 23, podstawaCeny: 'brutto', wizytWMiesiacu: null, wersjaDanych: { ceny: 'c', normy: 'n', rynek: 'r' },
})

/**
 * Zapisana wycena (`do_wyslania`); `zmiana` nadpisuje pola.
 * @param {string} id @param {object} [zmiana]
 * @returns {any}
 */
const wycenaTestowa = (id, zmiana = {}) => ({
  id, numer: '1/10/2026', utworzona: '2026-10-10T10:00:00.000Z', zmieniona: '2026-10-10T10:00:00.000Z', status: 'do_wyslania',
  rodzaj: 'dokladna', klient: { nazwa: 'Jan Kowalski', adres: '', termin: null }, wejscie: { uslugaId: 'mieszkanie_standard' },
  szybka: null, odpowiedzi: {}, wynik: migawka({ cena: 250, minuty: 180 }), cenaReczna: null, wykonania: [],
  oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false }, ...zmiana,
})

/** @param {string} id @param {string | null} termin @param {object} [zmiana] */
const przyjeta = (id, termin, zmiana = {}) => wycenaTestowa(id, { status: 'przyjeta', klient: { nazwa: id, adres: '', termin }, ...zmiana })

/** @param {string} id @param {string} data @param {number} minuty */
const wykonanie = (id, data, minuty) => ({ id, data, minuty, tempoPlanu: 1.3 })

/** @param {string} plikStanu sciezka wzgledem repo */
async function tekstKopii(plikStanu) {
  const stan = await czytajJson(plikStanu)
  return { stan, tresc: JSON.stringify({ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: 1, utworzona: DZIS.toISOString(), stan }) }
}

describe('doZrobienia', () => {
  it('do wysłania daje „Wyślij ofertę”, a z przyjętych tylko ta z terminem wczoraj „Wpisz czas pracy”', () => {
    const wyceny = [
      przyjeta('jutro', '2026-10-26T10:00'),
      przyjeta('wczoraj', '2026-10-24'),
      wycenaTestowa('do-wyslania', { utworzona: '2026-10-11T10:00:00.000Z' }),
    ]

    const zadania = doZrobienia(wyceny, DZIS)

    assert.deepEqual(zadania.map((z) => [z.tytul, z.wycena.id]), [['Wpisz czas pracy', 'wczoraj'], ['Wyślij ofertę', 'do-wyslania']])
  })

  it('przyjęta bez terminu i szkic dają zadania; kolejność od najstarszej, wysłana i wykonana bez zadań', () => {
    const wyceny = [
      wycenaTestowa('szkic', { status: 'szkic', numer: null, wynik: null, utworzona: '2026-10-20T08:00:00.000Z' }),
      przyjeta('bez-terminu', null, { utworzona: '2026-10-02T08:00:00.000Z' }),
      wycenaTestowa('wyslana', { status: 'wyslana' }),
      wycenaTestowa('wykonana', { status: 'wykonana' }),
      przyjeta('dzis', '2026-10-25T18:00', { utworzona: '2026-10-05T08:00:00.000Z' }),
    ]

    const zadania = doZrobienia(wyceny, DZIS)

    assert.deepEqual(zadania.map((z) => [z.rodzaj, z.wycena.id]), [['czas', 'bez-terminu'], ['czas', 'dzis'], ['dokoncz', 'szkic']])
    assert.equal(zadania[2]?.tytul, 'Dokończ wycenę')
  })

  it('bez daty dnia rzuca BladDaty', () => {
    assert.throws(() => doZrobienia([], new Date('nie data')), (blad) => blad instanceof BladDaty && blad.kod === 'zla_data')
  })
})

describe('podsumowanieMiesiaca', () => {
  /** @type {DaneKosztow} */
  let dane

  before(async () => {
    const katalog = await katalogTestowy()
    dane = { katalog, koszty: scalKoszty(katalog.kosztyFirmy, /** @type {any} */ (USTAWIENIA)) }
  })

  it('liczy wyceny z października bez szkiców, przyjęte i wykonane oraz średnią realną stawkę z wykonań października', () => {
    const wyceny = [
      // 300 zl − chemia 6 × 3 h − dojazd 2 × 10 km = 262 zl za 4 h faktycznej pracy → 65,50 zl/h
      wycenaTestowa('a', { status: 'wykonana', wynik: migawka({ cena: 300, minuty: 180, km: 10 }),
        wykonania: [wykonanie('a1', '2026-10-03', 240)] }),
      // reczna cena 200 zl − chemia 6 × 2 h = 188 zl za 2 h → 94 zl/h
      wycenaTestowa('b', { status: 'wykonana', wynik: migawka({ cena: 260, minuty: 120 }), cenaReczna: 200,
        wykonania: [wykonanie('b1', '2026-10-20', 120)] }),
      przyjeta('c', null),
      wycenaTestowa('d', { status: 'odrzucona' }),
      wycenaTestowa('szkic', { status: 'szkic', numer: null, wynik: null }),
      // wyceny z wrzesnia: nie licza sie do wycen; wykonanie z wrzesnia nie liczy sie do stawki
      wycenaTestowa('wrzesien', { status: 'wykonana', utworzona: '2026-09-15T10:00:00.000Z',
        wykonania: [wykonanie('w1', '2026-09-30', 60)] }),
    ]

    const wynik = podsumowanieMiesiaca(wyceny, DZIS, dane)

    assert.deepEqual({ ...wynik, stawka: Number(wynik.stawka?.toFixed(6)) }, { wycen: 4, przyjetych: 3, stawka: 79.75, pominiete: 0 })
  })

  it('bez wykonań w miesiącu daje stawkę null, a wykonanie z pozycją spoza katalogu pomija i liczy', () => {
    const bezPozycji = migawka({ cena: 100, minuty: 60 })
    const wyceny = [
      przyjeta('c', null),
      wycenaTestowa('nieznana', { status: 'wykonana', utworzona: '2026-09-01T10:00:00.000Z',
        wynik: { ...bezPozycji, linie: [{ ...bezPozycji.linie[0], rodzaj: 'pozycja', klucz: 'brak.pozycji' }] },
        wykonania: [wykonanie('n1', '2026-10-02', 60)] }),
    ]

    assert.deepEqual(podsumowanieMiesiaca(wyceny, DZIS, dane), { wycen: 1, przyjetych: 1, stawka: null, pominiete: 1 })
  })

  it('bez daty dnia rzuca BladDaty', () => {
    assert.throws(() => podsumowanieMiesiaca([], /** @type {any} */ ('2026-10-25'), dane), BladDaty)
  })
})

describe('wierszTempa', () => {
  it('tempo z zleceń, domyślne i ręczne mają teksty z planu', () => {
    assert.deepEqual(wierszTempa({ wartosc: 1.18, zrodlo: 'wspolne', liczba: 7 }), { etykieta: 'Twoje tempo', wartosc: '1,18× normy · z 7 zleceń' })
    assert.deepEqual(wierszTempa({ wartosc: 1.3, zrodlo: 'domyslne', liczba: 1 }), { etykieta: 'Tempo', wartosc: '1,3× normy · domyślne dla nowej firmy' })
    assert.deepEqual(wierszTempa({ wartosc: 1.1, zrodlo: 'reczne', liczba: 0 }), { etykieta: 'Tempo', wartosc: '1,1× normy · ustawione ręcznie' })
  })

  it('tempo zerowe odrzuca', () => {
    assert.throws(() => wierszTempa({ wartosc: 0, zrodlo: 'domyslne', liczba: 0 }), { name: 'BladWejscia', kod: 'tempo' })
  })
})

describe('nazwaMiesiaca, kwotaWyceny, adresWyceny, inicjal', () => {
  it('miesiąc wielką literą w mianowniku', () => {
    assert.equal(nazwaMiesiaca(DZIS), 'Październik')
    assert.throws(() => nazwaMiesiaca(new Date(Number.NaN)), BladDaty)
  })

  it('kwota: ręczna wygrywa z migawką, szkic bez ceny daje null', () => {
    assert.equal(kwotaWyceny(wycenaTestowa('a', { cenaReczna: 290 })), 290)
    assert.equal(kwotaWyceny(wycenaTestowa('a')), 250)
    assert.equal(kwotaWyceny(wycenaTestowa('a', { status: 'szkic', wynik: null })), null)
  })

  it('adres: zapisana do ekranu wyceny, szkic dokładnej do kreatora, szkic szybkiej do szybkiej wyceny', () => {
    assert.equal(adresWyceny(wycenaTestowa('abc')), '#/wycena/abc')
    assert.equal(adresWyceny(wycenaTestowa('abc', { status: 'szkic' })), '#/kreator/usluga?wycena=abc')
    assert.equal(adresWyceny(wycenaTestowa('abc', { status: 'szkic', rodzaj: 'szybka' })), '#/szybka?wycena=abc')
  })

  it('inicjał: pierwsza litera wielka (także polska), pusta nazwa daje pusty tekst', () => {
    assert.equal(inicjal('  łucja Nowak'), 'Ł')
    assert.equal(inicjal('   '), '')
  })
})

describe('e2e/stany', () => {
  it('wyceny-do-zrobienia.json przechodzi przez odczytajKopie i magazyn, a start ma dwa zadania i trzy statusy', async () => {
    const { stan, tresc } = await tekstKopii('e2e/stany/wyceny-do-zrobienia.json')
    const storage = new PamiecMagazynu()
    storage.setItem(KLUCZ_MAGAZYNU, JSON.stringify(stan))

    const zKopii = odczytajKopie(tresc).stan
    const zMagazynu = utworzMagazyn(storage, { loguj: () => {}, poprosOTrwalosc: () => true }).wczytaj()

    assert.ok('stan' in zMagazynu, 'magazyn odrzucił stan')
    assert.deepEqual(zMagazynu.stan, zKopii)
    assert.deepEqual(zKopii.wyceny.map((w) => w.status), ['do_wyslania', 'wyslana', 'przyjeta'])
    assert.deepEqual(doZrobienia(zKopii.wyceny, DZIS).map((z) => z.tytul), ['Wyślij ofertę', 'Wpisz czas pracy'])
    assert.deepEqual(zKopii.kopia, { ostatnia: null, zmianaOd: '2026-10-12T09:00:00.000Z' })
  })

  it('ustawienia-mazowieckie.json: mazowieckie, zwolniony z VAT, firma z telefonem, bez wycen i bez braków ustawień', async () => {
    const { tresc } = await tekstKopii('e2e/stany/ustawienia-mazowieckie.json')

    const { ustawienia, wyceny } = odczytajKopie(tresc).stan

    assert.deepEqual([ustawienia?.wojewodztwoId, ustawienia?.statusVat, ustawienia?.firma.nazwa, ustawienia?.firma.telefon,
      ustawienia?.kreatorZakonczony, wyceny.length], ['mazowieckie', 'zwolniony', 'Usługi Sprzątające Monika Lis', '600 123 456', true, 0])
    assert.deepEqual(brakujeUstawien(ustawienia ?? null), [])
  })
})
