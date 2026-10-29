import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { czytajJson } from '../../tests/pomocnicze.js'
import { odczytajKopie } from '../dane/kopia.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn } from '../dane/magazyn.js'
import { brakujeUstawien } from '../dane/ustawienia.js'
import { BladFormatu } from '../ui/format.js'
import {
  adresWyceny, doZrobienia, inicjal, nazwaMiesiaca, podsumowanieMiesiaca, wierszTempa,
} from './start-dane.js'

const DZIS = new Date(2026, 9, 25, 12, 0)

/** Migawka z jedna linia pracy. @param {{ cena: number, minuty: number, km?: number }} p */
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
  klientId: null, szybka: null, odpowiedzi: {}, wynik: migawka({ cena: 250, minuty: 180 }), cenaReczna: null,
  oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false }, ...zmiana,
})

/** @param {string} id @param {string | null} termin @param {object} [zmiana] */
const przyjeta = (id, termin, zmiana = {}) => wycenaTestowa(id, { status: 'przyjeta', klient: { nazwa: id, adres: '', termin }, ...zmiana })

/** @param {string} plikStanu sciezka wzgledem repo */
async function tekstKopii(plikStanu) {
  const stan = await czytajJson(plikStanu)
  return { stan, tresc: JSON.stringify({ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: 1, utworzona: DZIS.toISOString(), stan }) }
}

describe('doZrobienia', () => {
  it('do wysłania daje „Wyślij ofertę”, a przyjęte (z terminem i bez) nie dają zadań, bo czas pracy wpisuje się przy wizycie', () => {
    const wyceny = [
      przyjeta('jutro', '2026-10-26T10:00'),
      przyjeta('wczoraj', '2026-10-24'),
      przyjeta('bez-terminu', null),
      wycenaTestowa('do-wyslania', { utworzona: '2026-10-11T10:00:00.000Z' }),
    ]

    const zadania = doZrobienia(wyceny)

    assert.deepEqual(zadania.map((z) => [z.tytul, z.wycena.id]), [['Wyślij ofertę', 'do-wyslania']])
  })

  it('szkic daje „Dokończ wycenę”; kolejność od najstarszej, wysłana i odrzucona bez zadań', () => {
    const wyceny = [
      wycenaTestowa('szkic', { status: 'szkic', numer: null, wynik: null, utworzona: '2026-10-20T08:00:00.000Z' }),
      wycenaTestowa('wyslana', { status: 'wyslana' }),
      wycenaTestowa('odrzucona', { status: 'odrzucona' }),
      wycenaTestowa('do-wyslania', { utworzona: '2026-10-02T08:00:00.000Z' }),
    ]

    const zadania = doZrobienia(wyceny)

    assert.deepEqual(zadania.map((z) => [z.rodzaj, z.tytul, z.wycena.id]), [['wyslij', 'Wyślij ofertę', 'do-wyslania'],
      ['dokoncz', 'Dokończ wycenę', 'szkic']])
  })
})

describe('podsumowanieMiesiaca', () => {
  it('liczy wyceny z października bez szkiców i z nich przyjęte; wyceny z września się nie liczą', () => {
    const wyceny = [
      przyjeta('a', null),
      przyjeta('b', '2026-10-20'),
      wycenaTestowa('c', { status: 'odrzucona' }),
      wycenaTestowa('szkic', { status: 'szkic', numer: null, wynik: null }),
      przyjeta('wrzesien', null, { utworzona: '2026-09-15T10:00:00.000Z' }),
    ]

    assert.deepEqual(podsumowanieMiesiaca(wyceny, DZIS), { wycen: 3, przyjetych: 2 })
  })

  it('bez daty dnia rzuca BladFormatu', () => {
    assert.throws(() => podsumowanieMiesiaca([], /** @type {any} */ ('2026-10-25')), BladFormatu)
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

describe('nazwaMiesiaca, adresWyceny, inicjal', () => {
  it('miesiąc wielką literą w mianowniku', () => {
    assert.equal(nazwaMiesiaca(DZIS), 'Październik')
    assert.throws(() => nazwaMiesiaca(new Date(Number.NaN)), BladFormatu)
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
  it('wyceny-do-zrobienia.json (wersja 1) przechodzi przez odczytajKopie i magazyn, a start ma jedno zadanie i trzy statusy', async () => {
    const { stan, tresc } = await tekstKopii('e2e/stany/wyceny-do-zrobienia.json')
    const storage = new PamiecMagazynu()
    storage.setItem(KLUCZ_MAGAZYNU, JSON.stringify(stan))

    const zKopii = odczytajKopie(tresc).stan
    const zMagazynu = utworzMagazyn(storage, { loguj: () => {}, poprosOTrwalosc: () => true }).wczytaj()

    assert.ok('stan' in zMagazynu, 'magazyn odrzucił stan')
    assert.deepEqual(zMagazynu.stan, zKopii)
    assert.deepEqual(zKopii.wyceny.map((w) => w.status), ['do_wyslania', 'wyslana', 'przyjeta'])
    assert.deepEqual(doZrobienia(zKopii.wyceny).map((z) => z.tytul), ['Wyślij ofertę'])
    assert.equal(zKopii.wersja, 2)
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
