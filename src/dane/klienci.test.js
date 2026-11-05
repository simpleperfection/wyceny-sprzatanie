import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import {
  BladKlienta, czyMaHistorie, DLUGOSCI_KLIENTA, dodajKlienta, dopasowanieFrazy, indeksKlientow, klient, listaKlientow, MAKS_KLIENTOW,
  normalizujNazwe, szukajKlientow, usunKlienta, zapiszKlienta,
} from './klienci.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn, wczytajStan } from './magazyn.js'

const TERAZ = new Date('2026-11-02T08:00:00.000Z')
const POZNIEJ = new Date('2026-11-05T17:30:00.000Z')
const PUSTY_STAN = {
  wersja: 2, ustawienia: null, wyceny: [], klienci: [], zlecenia: [], licznikNumerow: {}, kopia: { ostatnia: null, zmianaOd: null },
  preferencje: { iosInstrukcjaZamknieta: false },
}

/** @param {object} [stan] stan zapisany w magazynie przed testem */
function magazynZeStanem(stan) {
  const storage = new PamiecMagazynu()
  const magazyn = utworzMagazyn(storage, { teraz: () => TERAZ, loguj: () => {}, poprosOTrwalosc: () => true })
  if (stan) magazyn.zapiszCalosc(stan)
  return { magazyn, storage }
}

/** @param {string} id @param {string} [nazwa] @param {object} [zmiana] */
const klientTestowy = (id, nazwa = `Klient ${id}`, zmiana = {}) => ({
  id, nazwa, telefon: null, adres: null, notatki: null, utworzony: TERAZ.toISOString(), zmieniony: TERAZ.toISOString(), ...zmiana,
})

/** @param {string} id @param {string} klientId */
const zlecenieTestowe = (id, klientId) => ({
  id, klientId, wycenaId: null, uslugaId: null, opis: 'Mycie okien', rozliczenie: 'za_wizyte', start: '2026-11-10', koniec: null, plan: null,
  okresy: [{ od: '2026-11-10', cykl: null, godzina: null, cenaWizyty: 200, cenaMiesiaca: null }],
  wizyty: {}, zaplatyMiesieczne: {}, utworzone: TERAZ.toISOString(), zmienione: TERAZ.toISOString(),
})

/** @param {string} kod @param {string | null} [pole] */
const bladKlienta = (kod, pole = null) => ({ name: BladKlienta.name, kod, pole })

describe('stałe klienta', () => {
  it('długości pól i limit klientów z planu', () => {
    assert.deepEqual(DLUGOSCI_KLIENTA, { nazwa: 120, telefon: 20, adres: 200, notatki: 1000 })
    assert.equal(MAKS_KLIENTOW, 5000)
  })
})

describe('dodajKlienta', () => {
  it('zapisuje klienta z przyciętymi polami, pustym adresem jako null i datami z zegara', () => {
    const { magazyn } = magazynZeStanem()

    const zapisany = dodajKlienta(magazyn, { nazwa: '  Anna Kowalska ', telefon: '600 100 200', adres: ' ', notatki: 'Klucz u sąsiadki' },
      { id: 'k1', teraz: () => TERAZ })

    const oczekiwany = klientTestowy('k1', 'Anna Kowalska', { telefon: '600 100 200', notatki: 'Klucz u sąsiadki' })
    assert.deepEqual(zapisany, oczekiwany)
    assert.deepEqual(wczytajStan(magazyn).klienci, [oczekiwany])
  })

  it('dwa razy z tym samym id zapisuje jednego klienta i oddaje pierwszy zapis', () => {
    const { magazyn } = magazynZeStanem()
    dodajKlienta(magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1', teraz: () => TERAZ })

    const drugi = dodajKlienta(magazyn, { nazwa: 'Anna K.' }, { id: 'k1', teraz: () => POZNIEJ })

    assert.equal(drugi.nazwa, 'Anna Kowalska')
    assert.deepEqual(wczytajStan(magazyn).klienci.map((k) => k.nazwa), ['Anna Kowalska'])
  })

  it('nazwa 121 znaków, telefon „123”, pusta nazwa i nieznane pole → BladKlienta z kodem i polem, bez zapisu', () => {
    const { magazyn, storage } = magazynZeStanem()
    const opcje = { id: 'k1', teraz: () => TERAZ }

    assert.throws(() => dodajKlienta(magazyn, { nazwa: 'a'.repeat(121) }, opcje), bladKlienta('dlugosc', 'nazwa'))
    assert.throws(() => dodajKlienta(magazyn, { nazwa: 'Jan', telefon: '123' }, opcje), bladKlienta('telefon', 'telefon'))
    assert.throws(() => dodajKlienta(magazyn, { nazwa: '   ' }, opcje), bladKlienta('pusta_nazwa', 'nazwa'))
    assert.throws(() => dodajKlienta(magazyn, { telefon: '600100200' }, opcje), bladKlienta('pusta_nazwa', 'nazwa'))
    assert.throws(() => dodajKlienta(magazyn, { nazwa: 'Jan', email: 'jan@example.com' }, opcje), bladKlienta('nieznane_pole'))
    assert.throws(() => dodajKlienta(magazyn, { nazwa: 'Jan' }, { id: '', teraz: () => TERAZ }), bladKlienta('id'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), null)
  })

  it(`${MAKS_KLIENTOW + 1}. klient → za_duzo, zapis bez zmian`, () => {
    const klienci = Array.from({ length: MAKS_KLIENTOW }, (_, i) => klientTestowy(`k${i}`))
    const { magazyn, storage } = magazynZeStanem({ ...PUSTY_STAN, klienci })
    const przed = storage.getItem(KLUCZ_MAGAZYNU)

    assert.throws(() => dodajKlienta(magazyn, { nazwa: 'Nowy' }, { id: 'nowy', teraz: () => TERAZ }), bladKlienta('za_duzo'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })
})

describe('zapiszKlienta', () => {
  it('zmienia podane pola i datę zmiany, pozostałe zostają; pusty telefon zapisuje null', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1', 'Anna', { telefon: '600100200', adres: 'Długa 1' })] })

    const zapisany = zapiszKlienta(magazyn, 'k1', { adres: 'Krótka 2', telefon: '' }, { teraz: () => POZNIEJ })

    const oczekiwany = klientTestowy('k1', 'Anna', { adres: 'Krótka 2', zmieniony: POZNIEJ.toISOString() })
    assert.deepEqual(zapisany, oczekiwany)
    assert.deepEqual(klient(wczytajStan(magazyn), 'k1'), oczekiwany)
  })

  it('nieznany klient → brak_klienta, za długie notatki → dlugosc z polem', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')] })

    assert.throws(() => zapiszKlienta(magazyn, 'k9', { nazwa: 'Jan' }), bladKlienta('brak_klienta'))
    assert.throws(() => zapiszKlienta(magazyn, 'k1', { notatki: 'x'.repeat(1001) }), bladKlienta('dlugosc', 'notatki'))
  })
})

describe('usunKlienta', () => {
  it('klient ze zleceniem → ma_historie, klient zostaje', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1')], zlecenia: [zlecenieTestowe('z1', 'k1')] })

    assert.throws(() => usunKlienta(magazyn, 'k1'), bladKlienta('ma_historie'))
    assert.deepEqual(wczytajStan(magazyn).klienci.map((k) => k.id), ['k1'])
  })

  it('klient bez historii znika, inni zostają; nieznany → brak_klienta', () => {
    const { magazyn } = magazynZeStanem({ ...PUSTY_STAN, klienci: [klientTestowy('k1'), klientTestowy('k2')], zlecenia: [zlecenieTestowe('z1', 'k1')] })

    const stan = usunKlienta(magazyn, 'k2')

    assert.deepEqual(stan.klienci.map((k) => k.id), ['k1'])
    assert.deepEqual(wczytajStan(magazyn).klienci.map((k) => k.id), ['k1'])
    assert.throws(() => usunKlienta(magazyn, 'k2'), bladKlienta('brak_klienta'))
  })
})

describe('klient, listaKlientow i szukajKlientow', () => {
  const stan = {
    klienci: [
      klientTestowy('k1', 'Łukasz Nowak', { adres: 'Kowalska 3, Kraków' }),
      klientTestowy('k2', 'Anna Kowalska', { telefon: '600 100 200' }),
      klientTestowy('k3', 'Lucyna Wiśniewska'),
      klientTestowy('k4', 'KOWALSKI Jan'),
      klientTestowy('k5', 'Zenon Mazur', { telefon: '+48 501-200-300' }),
    ],
  }
  /** @param {{ nazwa: string }[]} klienci */
  const nazwy = (klienci) => klienci.map((k) => k.nazwa)

  it('listaKlientow sortuje po polsku: „Lucyna” przed „Łukasz”', () => {
    assert.deepEqual(nazwy(listaKlientow(stan)), ['Anna Kowalska', 'KOWALSKI Jan', 'Lucyna Wiśniewska', 'Łukasz Nowak', 'Zenon Mazur'])
  })

  it('szukajKlientow „kow” znajduje „Anna Kowalska”, „KOWALSKI Jan” i adres „Kowalska 3”, bez innych', () => {
    assert.deepEqual(nazwy(szukajKlientow(stan, 'kow')), ['Anna Kowalska', 'KOWALSKI Jan', 'Łukasz Nowak'])
  })

  it('szukajKlientow po telefonie bez spacji i myślników, po nazwie z polskimi literami; pusta fraza daje wszystkich', () => {
    assert.deepEqual(nazwy(szukajKlientow(stan, '600100')), ['Anna Kowalska'])
    assert.deepEqual(nazwy(szukajKlientow(stan, '501 200')), ['Zenon Mazur'])
    assert.deepEqual(nazwy(szukajKlientow(stan, 'WIŚNIEW')), ['Lucyna Wiśniewska'])
    assert.deepEqual(nazwy(szukajKlientow(stan, 'brak')), [])
    assert.equal(szukajKlientow(stan, '  ').length, 5)
  })

  it('klient po id albo null', () => {
    assert.equal(klient(stan, 'k3')?.nazwa, 'Lucyna Wiśniewska')
    assert.equal(klient(stan, 'k9'), null)
  })
})

describe('normalizujNazwe', () => {
  it('zwija i przycina spacje, zmniejsza litery', () => {
    assert.equal(normalizujNazwe('  Anna   KOWALSKA '), 'anna kowalska')
    assert.equal(normalizujNazwe('  Anna   KOWALSKA '), normalizujNazwe('anna kowalska'))
  })

  it('„Żaneta” w NFD i NFC daje ten sam wynik', () => {
    const nfd = 'Żaneta'.normalize('NFD')
    assert.notEqual(nfd, 'Żaneta'.normalize('NFC'))

    assert.equal(normalizujNazwe(nfd), normalizujNazwe('Żaneta'.normalize('NFC')))
    assert.equal(normalizujNazwe(nfd), 'żaneta')
  })
})

describe('indeksKlientow i dopasowanieFrazy', () => {
  const stan = {
    klienci: [
      klientTestowy('k1', 'Łukasz Nowak', { adres: 'Kowalska 3, Kraków' }),
      klientTestowy('k2', 'Anna  Kowalska', { telefon: '+48 600-100-200' }),
    ],
  }

  it('indeks ma klientów po nazwie z polami do wyszukiwania i jest liczony raz na tablicę klientów stanu', () => {
    const indeks = indeksKlientow(stan)

    assert.deepEqual(indeks.map((w) => [w.klient.id, w.nazwa, w.adres, w.telefon]), [
      ['k2', 'anna kowalska', '', '+48600100200'],
      ['k1', 'łukasz nowak', 'kowalska 3, kraków', ''],
    ])
    assert.equal(indeksKlientow({ klienci: stan.klienci }), indeks)
    assert.notEqual(indeksKlientow({ klienci: [...stan.klienci] }), indeks)
  })

  it('fraza pasuje do nazwy, adresu i telefonu w zapisie zwartym; pusta fraza do każdego, inna do nikogo', () => {
    const [anna, lukasz] = indeksKlientow(stan)
    /** @param {string} fraza */
    const pasujace = (fraza) => indeksKlientow(stan).filter(dopasowanieFrazy(fraza).pasuje).map((w) => w.klient.id)

    assert.deepEqual([pasujace('KOWALSKA'), pasujace('600 100'), pasujace('kraków'), pasujace('  ')], [['k2', 'k1'], ['k2'], ['k1'], ['k2', 'k1']])
    assert.deepEqual([dopasowanieFrazy(' Anna  K').szukana, dopasowanieFrazy('xyz').pasuje(anna), dopasowanieFrazy('xyz').pasuje(lukasz)],
      ['anna k', false, false])
  })
})

describe('czyMaHistorie', () => {
  const stan = {
    wyceny: [{ id: 'w-1', klientId: 'k-anna' }, null],
    zlecenia: [{ id: 'z-1', klientId: 'k-biuro', wycenaId: null }],
  }

  it('wycena albo zlecenie klienta to historia', () => {
    assert.deepEqual([czyMaHistorie(stan, 'k-anna'), czyMaHistorie(stan, 'k-biuro')], [true, true])
  })

  it('klient bez wycen i zleceń nie ma historii (wpis bez obiektu pomijany)', () => {
    assert.equal(czyMaHistorie(stan, 'k-jan'), false)
  })
})
