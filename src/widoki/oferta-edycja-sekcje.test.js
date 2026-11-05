import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { AtrapaElementu, pierwszy, tekst, tekstPoza, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { warunkiPoEdycji, widoczneWarunki } from '../oferta/tresc.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { h } from '../ui/h.js'
import {
  kartaFirmy, kartaKlienta, kartaWarunkow, kartaZakresu, NOTKA_ZAKRESU, tekstBleduZakresow, tekstKwoty, tekstPunktow, tekstWaznosci, tekstZakresu,
  zakresyAplikacji,
} from './oferta-edycja-sekcje.js'

const NBSP = ' '
const DZIS = new Date(2026, 9, 24, 15, 30)
const WARUNKI = Object.freeze([
  { id: 'odwolanie', tresc: 'Odwołanie bezpłatne do 24 h.', tylko_szybka: false },
  { id: 'stan_lokalu', tresc: 'Cena zakłada stan lokalu z rozmowy.', tylko_szybka: true },
  { id: 'zdjecia', tresc: 'Robimy zdjęcia przed i po pracy.', tylko_szybka: false },
])

describe('tekstWaznosci', () => {
  it('data i liczba dni od dziś (dzień lokalny, bez godziny)', () => {
    assert.equal(tekstWaznosci('2026-11-07', DZIS), '7 listopada 2026 (14 dni)')
  })

  it('jutro — „1 dzień”, dziś — „dziś”, wczoraj — „termin minął”', () => {
    assert.equal(tekstWaznosci('2026-10-25', DZIS), '25 października 2026 (1 dzień)')
    assert.equal(tekstWaznosci('2026-10-24', DZIS), '24 października 2026 (dziś)')
    assert.equal(tekstWaznosci('2026-10-23', DZIS), '23 października 2026 (termin minął)')
  })

  it('przez zmianę czasu (koniec października) liczy pełne dni', () => {
    assert.equal(tekstWaznosci('2026-10-26', DZIS), '26 października 2026 (2 dni)')
  })
})

describe('tekstKwoty', () => {
  it('jedna kwota albo widełki z jednym „zł” na końcu', () => {
    assert.equal(tekstKwoty({ od: 294, do: 294 }), `294${NBSP}zł`)
    assert.equal(tekstKwoty({ od: 250, do: 1320 }), `250–1${NBSP}320${NBSP}zł`)
  })
})

describe('streszczenia kart oferty', () => {
  it('zakres to liczba punktów w cenie i poza ceną', () => {
    assert.equal(tekstZakresu({ wchodzi: ['Okna', 'Podłogi'], nie_wchodzi: ['Żaluzje'] }), '2 w cenie · 1 poza ceną')
  })

  it('warunki to liczba punktów z odmianą', () => {
    assert.deepEqual([1, 3, 5].map(tekstPunktow), ['1 punkt', '3 punkty', '5 punktów'])
  })
})

describe('karty oferty bez długich opisów na wierzchu', () => {
  uzyjAtrapyDom()
  const ZAKRES = Object.freeze({ wchodzi: ['Mycie okien'], nie_wchodzi: ['Mycie żaluzji'] })
  const zapisz = () => null
  // edytor listy potrzebuje CSS.escape i HTMLButtonElement, a atrapa DOM ich nie ma
  const ATRAPY_EDYTORA = Object.freeze({ CSS: { escape: String }, HTMLButtonElement: AtrapaElementu })
  /** @type {[string, PropertyDescriptor | undefined][]} */
  let poprzednie = []

  beforeEach(() => {
    poprzednie = Object.keys(ATRAPY_EDYTORA).map((nazwa) => [nazwa, Object.getOwnPropertyDescriptor(globalThis, nazwa)])
    for (const [nazwa, value] of Object.entries(ATRAPY_EDYTORA)) Object.defineProperty(globalThis, nazwa, { value, configurable: true, writable: true })
  })

  afterEach(() => {
    for (const [nazwa, opis] of poprzednie) {
      if (opis) Object.defineProperty(globalThis, nazwa, opis)
      else Reflect.deleteProperty(globalThis, nazwa)
    }
  })

  /** @param {unknown} element @param {string} napis @returns {AtrapaElementu | undefined} przycisk z tym tekstem */
  const przyciskZTekstem = (element, napis) => znajdz(element, (e) => e.tag === 'button' && tekst(e) === napis)[0]

  /** @param {unknown} element @param {string} napis */
  function kliknij(element, napis) {
    const obsluga = przyciskZTekstem(element, napis)?.obslugi.get('click')
    assert.ok(obsluga, `brak przycisku ${napis}`)
    obsluga()
  }

  it('firma to wiersz ze strzałką do ustawień z nazwą i telefonem', () => {
    const element = kartaFirmy({ nazwa: 'Monika Lis', telefon: '600 123 456', email: 'a@b.pl', nip: '123' })

    const link = pierwszy(element, 'a')
    assert.equal(link?.atrybuty.get('href'), '#/ustawienia')
    assert.equal(tekst(link), 'Twoja firmaMonika Lis · 600 123 456')
  })

  it('adres i termin są pod „Adres i termin”, a wybór klienta na wierzchu', () => {
    const element = kartaKlienta({ nazwa: 'Jan Nowak', adres: '', termin: null }, zapisz, h('div', null, 'Wybierz klienta'))

    const szczegoly = pierwszy(element, 'details')
    assert.equal(tekstPoza(element, szczegoly), 'Klient i terminWybierz klienta')
    assert.match(tekst(szczegoly), /^Adres i terminAdres \(opcjonalnie\)Termin \(opcjonalnie\)/)
  })

  it('adres i termin zapisują się do swoich pól, a pusty termin to null', (t) => {
    t.mock.method(AtrapaElementu.prototype, 'querySelector', function (/** @type {string} */ selektor) {
      return selektor === 'input' ? pierwszy(this, 'input') ?? null : null
    })
    const zapisywanie = mock.fn(() => null)

    const szczegoly = pierwszy(kartaKlienta({ nazwa: 'Jan Nowak', adres: '', termin: '2026-11-10T10:00' }, zapisywanie, h('div', null, 'Wybierz klienta')), 'details')
    const [adres, termin] = znajdz(szczegoly, (e) => e.tag === 'input')
    assert.ok(adres && termin)
    adres.value = 'ul. Lipowa 1'
    adres.obslugi.get('change')?.()
    termin.value = ''
    termin.obslugi.get('change')?.()
    termin.value = '2026-11-12T08:30'
    termin.obslugi.get('change')?.()

    assert.deepEqual(zapisywanie.mock.calls.map((c) => c.arguments), [
      [{ klient: { adres: 'ul. Lipowa 1' } }], [{ klient: { termin: null } }], [{ klient: { termin: '2026-11-12T08:30' } }],
    ])
  })

  it('niezmieniony zakres ma listę bez notki i bez „Przywróć domyślny”', () => {
    const element = kartaZakresu({ pobierz: () => ({ zakres: ZAKRES, czyZmieniony: false }), zapisz })

    const szczegoly = pierwszy(element, 'details')
    assert.equal(tekst(szczegoly), 'Pokaż zakresW cenieMycie okienPoza cenąMycie żaluzji')
    assert.doesNotMatch(tekst(element), /Przywróć domyślny/)
  })

  it('po „Edytuj” w zakresie notka o zmianie tylko w tej ofercie jest pod „Więcej”', () => {
    const element = kartaZakresu({ pobierz: () => ({ zakres: ZAKRES, czyZmieniony: false }), zapisz })

    kliknij(element, 'Edytuj')

    const szczegoly = pierwszy(element, 'details')
    assert.equal(tekst(szczegoly), `Więcej${NOTKA_ZAKRESU}`)
    assert.equal(tekst(przyciskZTekstem(element, 'Gotowe')), 'Gotowe')
    assert.doesNotMatch(tekstPoza(element, szczegoly), new RegExp(NOTKA_ZAKRESU))
  })

  it('„Gotowe” w zakresie wraca do odczytu z listą pod „Pokaż zakres”', () => {
    const element = kartaZakresu({ pobierz: () => ({ zakres: ZAKRES, czyZmieniony: false }), zapisz })

    kliknij(element, 'Edytuj')
    kliknij(element, 'Gotowe')

    assert.match(tekst(pierwszy(element, 'details')), /^Pokaż zakres/)
  })

  it('zakres: liczba punktów i „Edytuj” na wierzchu, lista i notka zmienionego zakresu pod „Pokaż zakres”', () => {
    const element = kartaZakresu({ pobierz: () => ({ zakres: ZAKRES, czyZmieniony: true }), zapisz })

    const szczegoly = pierwszy(element, 'details')
    assert.equal(tekstPoza(element, szczegoly), 'Zakres pracEdytuj1 w cenie · 1 poza cenąPrzywróć domyślny')
    assert.equal(tekst(szczegoly), `Pokaż zakresW cenieMycie okienPoza cenąMycie żaluzji${NOTKA_ZAKRESU}`)
  })

  it('warunki: liczba punktów na wierzchu, lista pod „Pokaż warunki”, ważność w wierszu z opisem', () => {
    const element = kartaWarunkow({ zapisz, dzis: DZIS,
      pobierz: () => ({ warunki: WARUNKI, szybka: false, czyZmienione: false, waznaDo: '2026-11-07' }) })

    const szczegoly = pierwszy(element, 'details')
    assert.equal(tekstPoza(element, szczegoly), 'WarunkiEdytuj2 punktyOferta ważna do7 listopada 2026 (14 dni)')
    assert.equal(tekst(szczegoly), 'Pokaż warunkiOdwołanie bezpłatne do 24 h.Robimy zdjęcia przed i po pracy.')
  })

  it('po „Edytuj” w warunkach jest edytor listy zamiast streszczenia i bez „Przywróć domyślne”', () => {
    const element = kartaWarunkow({ zapisz, dzis: DZIS,
      pobierz: () => ({ warunki: WARUNKI, szybka: false, czyZmienione: true, waznaDo: '2026-11-07' }) })
    assert.match(tekst(element), /Przywróć domyślne/)

    kliknij(element, 'Edytuj')

    assert.equal(pierwszy(element, 'details'), undefined)
    assert.doesNotMatch(tekst(element), /2 punkty|Przywróć domyślne/)
    assert.equal(tekst(przyciskZTekstem(element, 'Gotowe')), 'Gotowe')
    const pola = znajdz(element, (e) => e.tag === 'textarea').map((e) => e.atrybuty.get('value') ?? e.value ?? tekst(e))
    assert.deepEqual(pola, ['Odwołanie bezpłatne do 24 h.', 'Robimy zdjęcia przed i po pracy.'])
  })

  it('bez warunków zostaje „Brak punktów.” bez pustego „Więcej”', () => {
    const element = kartaWarunkow({ zapisz, dzis: DZIS,
      pobierz: () => ({ warunki: [], szybka: false, czyZmienione: false, waznaDo: '2026-11-07' }) })

    assert.equal(pierwszy(element, 'details'), undefined)
    assert.match(tekst(element), /Brak punktów\./)
  })
})

describe('widoczneWarunki', () => {
  it('oferta z dokładnej wyceny pomija warunki tylko dla szybkiej, szybka pokazuje wszystkie', () => {
    assert.deepEqual(widoczneWarunki(WARUNKI, false).map((w) => w.id), ['odwolanie', 'zdjecia'])
    assert.deepEqual(widoczneWarunki(WARUNKI, true).map((w) => w.id), ['odwolanie', 'stan_lokalu', 'zdjecia'])
  })
})

describe('warunkiPoEdycji', () => {
  it('kolejność i treść z edytora, nowy punkt bez „tylko_szybka”, ukryte warunki zostają na końcu', () => {
    const punkty = [{ id: 'zdjecia', tekst: 'Zdjęcia przed i po.' }, { id: 'nowy-1', tekst: 'Płatność gotówką albo przelewem.' }]
    assert.deepEqual(warunkiPoEdycji(WARUNKI, punkty, false), [
      { id: 'zdjecia', tresc: 'Zdjęcia przed i po.', tylko_szybka: false },
      { id: 'nowy-1', tresc: 'Płatność gotówką albo przelewem.', tylko_szybka: false },
      { id: 'stan_lokalu', tresc: 'Cena zakłada stan lokalu z rozmowy.', tylko_szybka: true },
    ])
  })

  it('przy wszystkich widocznych (szybka, ustawienia) usunięty warunek znika, a „tylko_szybka” zostaje z danych', () => {
    const punkty = [{ id: 'stan_lokalu', tekst: 'Stan lokalu jak w rozmowie.' }]
    assert.deepEqual(warunkiPoEdycji(WARUNKI, punkty, true), [{ id: 'stan_lokalu', tresc: 'Stan lokalu jak w rozmowie.', tylko_szybka: true }])
  })
})

describe('tekstBleduZakresow', () => {
  /** @type {PropertyDescriptor | undefined} */
  let poprzedni
  /** @type {ReturnType<typeof mock.fn>} */
  let reportError

  beforeEach(() => {
    poprzedni = Object.getOwnPropertyDescriptor(globalThis, 'reportError')
    reportError = mock.fn()
    Object.defineProperty(globalThis, 'reportError', { value: reportError, configurable: true, writable: true })
  })

  afterEach(() => {
    if (poprzedni) Object.defineProperty(globalThis, 'reportError', poprzedni)
    else Reflect.deleteProperty(globalThis, 'reportError')
  })

  it('brak sieci i limit czasu — tekst o połączeniu, bez zgłoszenia', () => {
    assert.match(tekstBleduZakresow(new TypeError('Failed to fetch')), /Sprawdź połączenie z internetem/)
    assert.match(tekstBleduZakresow(new DOMException('limit', 'TimeoutError')), /Sprawdź połączenie z internetem/)
    assert.equal(reportError.mock.callCount(), 0)
  })

  it('zły plik — tekst o niepełnym pliku i zgłoszenie błędu', () => {
    const blad = new BladKatalogu('zly_format', 'Nieprawidłowy format data/zakresy.json')
    assert.match(tekstBleduZakresow(blad), /Plik zakresów prac jest niepełny/)
    assert.deepEqual(reportError.mock.calls.map((c) => c.arguments), [[blad]])
  })

  it('inny błąd leci dalej', () => {
    assert.throws(() => tekstBleduZakresow(new RangeError('błąd programu')), RangeError)
  })
})

describe('zakresyAplikacji', () => {
  it('po błędzie próbuje od nowa, a wczytany plik pamięta do końca sesji', async () => {
    const zakresy = { uslugi: { okna: { wchodzi: ['Mycie szyb i ram'], nie_wchodzi: ['Mycie żaluzji'] } } }
    const zepsute = mock.fn(async () => { throw new TypeError('Failed to fetch') })
    const dobre = mock.fn(async () => zakresy)
    const inne = mock.fn(async () => ({ uslugi: {} }))

    await assert.rejects(zakresyAplikacji(zepsute), TypeError)
    const wczytane = await zakresyAplikacji(dobre)
    const zPamieci = await zakresyAplikacji(inne)

    assert.deepEqual(dobre.mock.calls.map((c) => c.arguments), [['data/zakresy.json']])
    assert.equal(wczytane, zakresy)
    assert.equal(zPamieci, zakresy)
    assert.equal(inne.mock.callCount(), 0)
  })
})
