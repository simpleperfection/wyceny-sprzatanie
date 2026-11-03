import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { BladKlienta, dodajKlienta, usunKlienta } from '../dane/klienci.js'
import { utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import {
  czyMaHistorie, historiaWycen, inicjaly, klientFormularza, linkMapy, linkTelefonu, opisWiersza, podobnyKlient, propozycjeKlientow,
  zapiszFormularzKlienta,
} from './klienci-dane.js'

const CHWILA = '2026-10-20T10:00:00.000Z'

/** @param {string} id @param {string} nazwa @param {{ telefon?: string | null, adres?: string | null }} [pola] */
const klient = (id, nazwa, { telefon = null, adres = null } = {}) =>
  ({ id, nazwa, telefon, adres, notatki: null, utworzony: CHWILA, zmieniony: CHWILA })

/**
 * Wycena z polami, z ktorych korzysta historia: klient, data utworzenia i cena (z wyniku albo reczna).
 * @param {string} id @param {string | null} klientId @param {string} utworzona @param {{ cena?: number, cenaReczna?: number }} [ceny]
 */
const wycena = (id, klientId, utworzona, { cena, cenaReczna } = {}) => ({
  id, klientId, utworzona, zmieniona: utworzona, status: 'wyslana', cenaReczna: cenaReczna ?? null,
  wynik: cena === undefined ? null : { cena },
})

const ANNA = klient('k-anna', 'Anna Kowalska', { telefon: '600 100 200', adres: 'ul. Lipowa 3, Warszawa' })
const BIURO = klient('k-biuro', 'Biuro Rachunkowe Lis', { adres: 'ul. Prosta 10, Warszawa' })
const JAN = klient('k-jan', 'Jan Nowak')

describe('linkTelefonu', () => {
  it('usuwa spacje i myślniki, zostawia +48', () => {
    assert.equal(linkTelefonu('600 100 200'), 'tel:600100200')
    assert.equal(linkTelefonu('+48 600-100-200'), 'tel:+48600100200')
  })

  it('tekst, który nie jest numerem, daje RangeError', () => {
    assert.throws(() => linkTelefonu('600 100 200 wew. 5'), RangeError)
    assert.throws(() => linkTelefonu(' - '), RangeError)
  })
})

describe('linkMapy', () => {
  it('koduje spacje i przecinek adresu w zapytaniu Map Google', () => {
    assert.equal(linkMapy('ul. Lipowa 3, Warszawa'), 'https://www.google.com/maps/search/?api=1&query=ul.%20Lipowa%203%2C%20Warszawa')
  })

  it('koduje znaki, które zmieniłyby zapytanie, i przycina spacje na końcach', () => {
    const adres = new URL(linkMapy('  Polna 5/2 & Kraków #3 '))

    assert.equal(adres.searchParams.get('query'), 'Polna 5/2 & Kraków #3')
    assert.equal(adres.searchParams.get('api'), '1')
    assert.equal(adres.hash, '')
  })

  it('pusty adres daje RangeError', () => {
    assert.throws(() => linkMapy('   '), RangeError)
  })
})

describe('opisWiersza', () => {
  it('telefon, bez telefonu adres, bez obu null', () => {
    assert.equal(opisWiersza(ANNA), '600 100 200')
    assert.equal(opisWiersza(BIURO), 'ul. Prosta 10, Warszawa')
    assert.equal(opisWiersza(JAN), null)
  })
})

describe('inicjaly', () => {
  it('pierwsza litera pierwszego i ostatniego słowa, wielkie', () => {
    assert.equal(inicjaly('Anna Kowalska'), 'AK')
    assert.equal(inicjaly('Biuro Rachunkowe Lis'), 'BL')
    assert.equal(inicjaly('  łucja   żak '), 'ŁŻ')
    assert.equal(inicjaly('Jan'), 'J')
  })

  it('pusta nazwa daje pusty tekst', () => {
    assert.equal(inicjaly('   '), '')
  })
})

describe('podobnyKlient', () => {
  const stan = { klienci: [BIURO, ANNA, JAN] }

  it('znajduje klienta o tej samej nazwie bez względu na wielkość liter i spacje', () => {
    assert.equal(podobnyKlient(stan, '  anna KOWALSKA'), ANNA)
    assert.equal(podobnyKlient(stan, 'Anna   Kowalska'), ANNA)
  })

  it('pomija klienta edytowanego', () => {
    assert.equal(podobnyKlient(stan, '  anna KOWALSKA', 'k-anna'), null)
  })

  it('nie podpowiada przy samym fragmencie nazwy ani przy pustej nazwie', () => {
    assert.equal(podobnyKlient(stan, 'Anna'), null)
    assert.equal(podobnyKlient(stan, '   '), null)
  })
})

describe('historiaWycen', () => {
  const stan = {
    wyceny: [
      wycena('w-stara', 'k-anna', '2026-10-29T12:00:00.000Z', { cena: 250 }),
      wycena('w-biuro', 'k-biuro', '2026-10-31T12:00:00.000Z', { cena: 900 }),
      wycena('w-nowa', 'k-anna', '2026-10-30T12:00:00.000Z', { cena: 180, cenaReczna: 150 }),
      wycena('w-szkic', 'k-anna', '2026-10-28T12:00:00.000Z'),
      wycena('w-bez', null, '2026-11-01T12:00:00.000Z', { cena: 300 }),
    ],
  }

  it('zwraca wyceny klienta od najnowszej z kwotą (cena ręczna przed wynikiem) i dniem', () => {
    const historia = historiaWycen(stan, 'k-anna')

    assert.deepEqual(historia.map((p) => [p.wycena.id, p.kwota, p.opis]), [
      ['w-nowa', 150, '150 zł · 30 paź'],
      ['w-stara', 250, '250 zł · 29 paź'],
      ['w-szkic', null, '28 paź'],
    ])
  })

  it('klient bez wycen ma pustą historię', () => {
    assert.deepEqual(historiaWycen(stan, 'k-jan'), [])
  })

  it('nieprawidłowa data utworzenia daje RangeError', () => {
    assert.throws(() => historiaWycen({ wyceny: [wycena('w-zla', 'k-anna', 'wczoraj')] }, 'k-anna'), RangeError)
  })
})

describe('czyMaHistorie', () => {
  const stan = {
    wyceny: [wycena('w-1', 'k-anna', CHWILA, { cena: 250 })],
    zlecenia: [{ id: 'z-1', klientId: 'k-biuro', wycenaId: null }],
  }

  it('wycena albo zlecenie klienta to historia', () => {
    assert.equal(czyMaHistorie(stan, 'k-anna'), true)
    assert.equal(czyMaHistorie(stan, 'k-biuro'), true)
  })

  it('klient bez wycen i zleceń nie ma historii', () => {
    assert.equal(czyMaHistorie(stan, 'k-jan'), false)
  })
})

describe('propozycjeKlientow', () => {
  const nazwy = ['Jan Nowak', 'Biuro Rachunkowe Lis', 'Anna Kowalska', 'Andrzej Kos', 'Danuta Wanat', 'Hanna Bąk', 'Joanna Lis',
    'Stefan Kot', 'Zuzanna Pająk', 'Iwona Rak', 'Marian Sowa', 'Antoni Dąb']
  const stan = { klienci: nazwy.map((nazwa, i) => klient(`k-${i}`, nazwa)) }

  it('najwyżej 8 klientów, najpierw ci, których nazwa zaczyna się od frazy (bez wielkości liter), potem pozostali po nazwie', () => {
    const propozycje = propozycjeKlientow(stan, ' AN')

    assert.deepEqual(propozycje.map((k) => k.nazwa), [
      'Andrzej Kos', 'Anna Kowalska', 'Antoni Dąb', 'Danuta Wanat', 'Hanna Bąk', 'Jan Nowak', 'Joanna Lis', 'Marian Sowa',
    ])
  })

  it('pasuje też po telefonie i adresie, a fraza bez dopasowania daje pustą listę', () => {
    const zKontaktem = { klienci: [ANNA, BIURO, JAN] }

    assert.deepEqual(propozycjeKlientow(zKontaktem, '600-100').map((k) => k.id), ['k-anna'])
    assert.deepEqual(propozycjeKlientow(zKontaktem, 'prosta').map((k) => k.id), ['k-biuro'])
    assert.deepEqual(propozycjeKlientow(zKontaktem, 'xyz'), [])
  })

  it('pusta fraza daje pierwszych 8 klientów po nazwie', () => {
    const propozycje = propozycjeKlientow(stan, '   ')

    assert.deepEqual(propozycje.map((k) => k.nazwa), [
      'Andrzej Kos', 'Anna Kowalska', 'Antoni Dąb', 'Biuro Rachunkowe Lis', 'Danuta Wanat', 'Hanna Bąk', 'Iwona Rak', 'Jan Nowak',
    ])
  })
})

describe('propozycjeKlientow: przegląd kończy się po komplecie pierwszej grupy', () => {
  it('więcej niż 8 klientów z nazwą od frazy: 8 pierwszych po nazwie, bez klientów pasujących w środku nazwy', () => {
    const stan = { klienci: [...Array.from({ length: 10 }, (_, i) => klient(`k-${i}`, `Kowal ${String.fromCharCode(65 + i)}`)),
      klient('k-anna', 'Anna Kowalska')] }

    assert.deepEqual(propozycjeKlientow(stan, 'kowal').map((k) => k.nazwa),
      ['Kowal A', 'Kowal B', 'Kowal C', 'Kowal D', 'Kowal E', 'Kowal F', 'Kowal G', 'Kowal H'])
  })
})

/** Magazyn w pamieci z zapisanymi klientami Anna (k-anna) i Biuro (k-biuro). */
function magazynZKlientami() {
  const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
  dodajKlienta(magazyn, { nazwa: 'Anna Kowalska', telefon: '600 100 200', adres: 'ul. Lipowa 3' }, { id: 'k-anna' })
  dodajKlienta(magazyn, { nazwa: 'Biuro Rachunkowe Lis' }, { id: 'k-biuro' })
  return magazyn
}

/** @param {string} kod */
const bladKlienta = (kod) => ({ name: BladKlienta.name, kod })

describe('klientFormularza', () => {
  const stan = { klienci: [ANNA, BIURO] }

  it('bez id formularz nowego klienta, z id zapisanego klienta edycja tego klienta', () => {
    assert.deepEqual(klientFormularza(stan, null), { rodzaj: 'nowy' })
    assert.deepEqual(klientFormularza(stan, 'k-anna'), { rodzaj: 'edycja', klient: ANNA })
  })

  it('id klienta, którego nie ma (usunięty w innej karcie, zły link), daje ekran braku klienta', () => {
    assert.deepEqual(klientFormularza(stan, 'k-usuniety'), { rodzaj: 'brak' })
  })
})

describe('zapiszFormularzKlienta', () => {
  const PUSTE = { telefon: '', adres: '', notatki: '' }

  it('edycja zmienia zapisanego klienta: nowa nazwa, puste pola opcjonalne jako null, bez nowego klienta', () => {
    const magazyn = magazynZKlientami()
    const anna = klientFormularza(wczytajStan(magazyn), 'k-anna')
    assert.equal(anna.rodzaj, 'edycja')

    const zapisany = zapiszFormularzKlienta(magazyn, anna.rodzaj === 'edycja' ? anna.klient : null, 'k-anna', { nazwa: 'Anna Nowak', ...PUSTE })

    const { klienci } = wczytajStan(magazyn)
    assert.deepEqual([zapisany.nazwa, zapisany.telefon, zapisany.adres], ['Anna Nowak', null, null])
    assert.deepEqual(klienci.map((k) => [k.id, k.nazwa, k.telefon]), [['k-anna', 'Anna Nowak', null], ['k-biuro', 'Biuro Rachunkowe Lis', null]])
  })

  it('nowy klient z id ekranu zapisany dwa razy (podwójne „Zapisz”) daje jednego klienta', () => {
    const magazyn = magazynZKlientami()

    zapiszFormularzKlienta(magazyn, null, 'k-nowy', { nazwa: 'Jan Nowak', ...PUSTE })
    zapiszFormularzKlienta(magazyn, null, 'k-nowy', { nazwa: 'Jan Nowak', ...PUSTE })

    assert.deepEqual(wczytajStan(magazyn).klienci.map((k) => k.id), ['k-anna', 'k-biuro', 'k-nowy'])
  })

  it('edycja klienta usuniętego w innej karcie → BladKlienta brak_klienta, a błędny telefon → telefon; nic się nie zapisuje', () => {
    const magazyn = magazynZKlientami()
    const { klienci: [anna, biuro] } = wczytajStan(magazyn)
    usunKlienta(magazyn, 'k-biuro')
    const przed = wczytajStan(magazyn)

    assert.throws(() => zapiszFormularzKlienta(magazyn, biuro, 'k-biuro', { nazwa: 'Biuro', ...PUSTE }), bladKlienta('brak_klienta'))
    assert.throws(() => zapiszFormularzKlienta(magazyn, anna, 'k-anna', { nazwa: 'Anna', ...PUSTE, telefon: '123' }), bladKlienta('telefon'))
    assert.deepEqual(wczytajStan(magazyn), przed)
  })
})
