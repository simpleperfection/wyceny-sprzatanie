import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladKatalogu, BladWejscia } from './bledy.js'
import {
  bezKategorii, dostawcyZProduktami, kartaSds, kategorieDlaWyceny, kategorieDoRecznegoDodania, opisProduktu, produktyKategorii,
  wczytajChemie,
} from './chemia.js'

// Scenariusze planu dotycza prawdziwych uslug (po remoncie, hale, doczyszczanie) i produktow (Buzil), wiec testy doboru czytaja
// data/chemia.json i data/*.json; przypadki bledow pracuja na malych danych z tego pliku.

/** @param {string} kod */
const bladKatalogu = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladKatalogu && blad.kod === kod
const wczytajPrawdziwe = () => wczytajChemie(czytajJson)
/** @param {import('./chemia.js').KategoriaWyceny[]} lista */
const idKategorii = (lista) => lista.map((k) => k.kategoria.id)
/** @param {import('./chemia.js').Chemia} chemia @param {string} id */
const produkt = (chemia, id) => {
  const p = chemia.produkty.find((x) => x.id === id)
  if (!p) throw new Error(`Brak produktu ${id} w danych testu`)
  return p
}

/** Najmniejsza poprawna baza chemii: jedna kategoria z jednym produktem. */
function malaChemia() {
  return {
    meta: { wersja: 'test' },
    dostawcy: [{ id: 'a', nazwa: 'Dostawca A' }, { id: 'b', nazwa: 'Dostawca B' }],
    kategorie: [{ id: 'uniwersalny', nazwa: 'Uniwersalny', brud: ['kurz'], pozycje: [], produkty: ['a.plyn'] }],
    bez_kategorii: [],
    produkty: [{
      id: 'a.plyn', dostawca: 'a', nazwa: 'Płyn', przeznaczenie: 'Wszystko', kategorie: ['uniwersalny'], ph: [2, 3], gotowy: false,
      stezenia: [{ zastosowanie: 'mycie', proc: [0.5, 2] }], opakowanie: { ilosc: 1.5, jednostka: 'l' }, cena_brutto: 1234.5,
      sds: { url: 'https://example.com/karta.pdf', data: '2026-01-01' },
    }],
  }
}

describe('wczytajChemie', () => {
  it('prawdziwe data/chemia.json: 16 kategorii i 87 produktów', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.equal(chemia.kategorie.length, 16)
    assert.equal(chemia.produkty.length, 87)
  })

  it('zły format (produkt bez ceny) daje BladKatalogu zly_format', async () => {
    const dane = malaChemia()
    Reflect.deleteProperty(dane.produkty[0] ?? {}, 'cena_brutto')

    await assert.rejects(wczytajChemie(async () => dane), bladKatalogu('zly_format'))
  })

  it('kategoria z nieznanym produktem daje BladKatalogu brak_produktu', async () => {
    const dane = malaChemia()
    dane.kategorie[0]?.produkty.push('a.nie_ma')

    await assert.rejects(wczytajChemie(async () => dane), bladKatalogu('brak_produktu'))
  })
})

describe('kategorieDlaWyceny: usługi z pomieszczeniami', () => {
  it('mieszkanie po remoncie: uniwersalny (kurz) i poremontowy (pył budowlany) z nazwą pokoju', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])
    const wejscie = { uslugaId: 'mieszkanie_po_remoncie', pomieszczenia: [
      { typ: 'pokoj', nazwa: 'Pokój', m2: 20, brud: [{ id: 'kurz', poziom: 1 }, { id: 'pyl_budowlany', poziom: 2 }] },
    ] }

    const wynik = kategorieDlaWyceny(wejscie, chemia, katalog)

    assert.deepEqual(wynik.map((k) => ({ id: k.kategoria.id, powody: k.powody })), [
      { id: 'uniwersalny', powody: [{ co: 'Kurz', gdzie: 'Pokój' }] },
      { id: 'poremontowy', powody: [{ co: 'Pył budowlany', gdzie: 'Pokój' }] },
    ])
  })

  it('sierść poziom 1 nie dubluje kategorii uniwersalnej, tylko dopisuje powód', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: [
      { typ: 'pokoj', nazwa: 'Pokój', m2: 20, brud: [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 1 }] },
      { typ: 'przedpokoj', nazwa: 'Przedpokój', m2: 6, brud: [{ id: 'kurz', poziom: 0 }, { id: 'tluszcz', poziom: 0 }] },
    ] }

    const wynik = kategorieDlaWyceny(wejscie, chemia, katalog)

    assert.deepEqual(wynik.map((k) => ({ id: k.kategoria.id, powody: k.powody })), [{ id: 'uniwersalny', powody: [
      { co: 'Kurz', gdzie: 'Pokój' }, { co: 'Sierść zwierząt', gdzie: 'Pokój' }, { co: 'Kurz', gdzie: 'Przedpokój' },
    ] }])
  })

  it('bez pomieszczeń zostaje sama kategoria kurzu bez powodów', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])

    const wynik = kategorieDlaWyceny({ uslugaId: 'mieszkanie_standard', pomieszczenia: [] }, chemia, katalog)

    assert.deepEqual(wynik.map((k) => ({ id: k.kategoria.id, powody: k.powody })), [{ id: 'uniwersalny', powody: [] }])
  })

  it('dodatek z ilością > 0 dokłada kategorię pozycji; dodatek z ilością 0 nie', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])
    const wejscie = { uslugaId: 'mieszkanie_standard', pomieszczenia: [], dodatki: [
      { uslugaId: 'agd', pozycjaId: 'piekarnik', ilosc: 1, tryb: /** @type {const} */ ('propozycja') },
      { uslugaId: 'agd', pozycjaId: 'zmywarka', ilosc: 0, tryb: /** @type {const} */ ('w_cenie') },
    ] }

    const wynik = kategorieDlaWyceny(wejscie, chemia, katalog)

    assert.deepEqual(idKategorii(wynik), ['uniwersalny', 'zasadowy'])
    assert.deepEqual(wynik[1]?.powody, [{ co: 'Piekarnik (wnętrze)', gdzie: null }])
  })

  it('nieznana usługa to błąd katalogu, a nie pusta lista', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])

    assert.throws(() => kategorieDlaWyceny({ uslugaId: 'nie_ma_takiej' }, chemia, katalog), (b) => b instanceof BladWejscia && b.kod === 'nieznana_usluga')
  })
})

describe('bezKategorii i usługi z pozycjami', () => {
  it('sprzątanie hal z zamiataniem: notka „zamiatanie na sucho” i żadnej kategorii', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])
    const wejscie = { uslugaId: 'sprzatanie_firm', pozycje: [{ id: 'zamiatanie', ilosc: 500 }] }

    assert.deepEqual(bezKategorii(wejscie, chemia), [{ uslugaId: 'sprzatanie_firm', pozycjaId: 'zamiatanie', powod: 'zamiatanie na sucho' }])
    assert.deepEqual(kategorieDlaWyceny(wejscie, chemia, katalog), [])
  })

  it('doczyszczanie z usuwaniem farby: notka o zmywaczu farb i kategoria doczyszczania posadzek', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])
    const wejscie = { uslugaId: 'doczyszczanie', pozycje: [{ id: 'doczyszczanie_posadzki', ilosc: 80 }, { id: 'usuwanie_farby', ilosc: 80 }] }

    const notki = bezKategorii(wejscie, chemia)
    const kategorie = kategorieDlaWyceny(wejscie, chemia, katalog)

    assert.equal(notki.length, 1)
    assert.equal(notki[0]?.pozycjaId, 'usuwanie_farby')
    assert.match(notki[0]?.powod ?? '', /zmywacza farb/)
    assert.deepEqual(kategorie.map((k) => ({ id: k.kategoria.id, powody: k.powody })), [
      { id: 'posadzki_doczyszczanie', powody: [{ co: 'Doczyszczanie posadzki szorowarką jednotarczową', gdzie: null }] },
    ])
  })

  it('pozycja z ilością 0 nie daje notki', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.deepEqual(bezKategorii({ uslugaId: 'sprzatanie_firm', pozycje: [{ id: 'zamiatanie', ilosc: 0 }] }, chemia), [])
  })
})

describe('dezynfekcja', () => {
  it('jest w kategorieDoRecznegoDodania i w żadnym doborze, nawet przy całym brudzie', async () => {
    const [katalog, chemia] = await Promise.all([katalogZDysku(), wczytajPrawdziwe()])
    const brud = katalog.brud.map((b) => ({ id: b.id, poziom: 3 }))
    const wejscie = { uslugaId: 'mieszkanie_gruntowne', pomieszczenia: [{ typ: 'lazienka', nazwa: 'Łazienka', m2: 5, brud }] }

    const dobor = idKategorii(kategorieDlaWyceny(wejscie, chemia, katalog))

    assert.deepEqual(kategorieDoRecznegoDodania(chemia).map((k) => k.id), ['dezynfekcja'])
    assert.deepEqual(dobor, ['uniwersalny', 'zasadowy', 'kwasowy', 'grzybobojczy', 'poremontowy'])
  })
})

describe('produkty i dostawcy', () => {
  it('produktyKategorii zwraca produkty w kolejności kategorii', async () => {
    const chemia = await wczytajPrawdziwe()
    const poremontowy = chemia.kategorie.find((k) => k.id === 'poremontowy')
    if (!poremontowy) throw new Error('Brak kategorii poremontowy w danych testu')

    assert.deepEqual(produktyKategorii(poremontowy, chemia).map((p) => p.nazwa).slice(0, 2), ['DEKAM', 'MERIDA ACID FLOOR PLUS'])
  })

  it('produktyKategorii z nieznanym produktem rzuca brak_produktu', () => {
    const chemia = malaChemia()
    const kategoria = { id: 'x', nazwa: 'X', brud: [], pozycje: [], produkty: ['a.nie_ma'] }

    assert.throws(() => produktyKategorii(kategoria, chemia), bladKatalogu('brak_produktu'))
  })

  it('dostawcyZProduktami pomija dostawcę bez produktów (Kärcher)', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.deepEqual(dostawcyZProduktami(chemia).map((d) => d.id), ['tenzi', 'merida', 'clinex', 'kiehl', 'medisept', 'buzil', 'voigt'])
  })
})

describe('opisProduktu', () => {
  it('produkt gotowy z pH 7: „pH 7”, „gotowy do użycia”, „5 l”, „82,87 zł”', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.deepEqual(opisProduktu(produkt(chemia, 'tenzi.office_clean')),
      { ph: 'pH 7', stezenie: 'gotowy do użycia', opakowanie: '5 l', cena: '82,87 zł' })
  })

  it('produkt Buzil bez pH daje „pH: brak danych”', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.equal(opisProduktu(produkt(chemia, 'buzil.blitz_citro_g481')).ph, 'pH: brak danych')
  })

  it('otwarty zakres pH z danych (A20 CHLORAL [12, null]) daje „pH od 12”', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.equal(opisProduktu(produkt(chemia, 'merida.a20_chloral')).ph, 'pH od 12')
  })

  it('koncentrat: zakres pH i stężeń z przecinkiem dziesiętnym i półpauzą', () => {
    const p = malaChemia().produkty[0]
    if (!p) throw new Error('Brak produktu w danych testu')

    assert.deepEqual(opisProduktu({ ...p, stezenia: [...p.stezenia, { zastosowanie: 'szorowarka', proc: [0.25, 0.25] }] }),
      { ph: 'pH 2–3', stezenie: '0,5–2% mycie, 0,25% szorowarka', opakowanie: '1,5 l', cena: '1234,50 zł' })
  })
})

describe('kartaSds', () => {
  it('zwykła karta: adres https i data, bez formularza', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.deepEqual(kartaSds(produkt(chemia, 'tenzi.office_clean')),
      { adres: 'https://tenzi.pl/index.php?controller=attachment&id_attachment=1239', data: '2023-03-14', czyFormularz: false })
  })

  it('Buzil: strona produktu z formularzem', async () => {
    const chemia = await wczytajPrawdziwe()

    assert.deepEqual(kartaSds(produkt(chemia, 'buzil.blitz_citro_g481')),
      { adres: 'https://www.buzil.pl/produkty/nawierzchnie/blitz-citro-g-481', data: '2026-07-02', czyFormularz: true })
  })

  it('nieczytelna data karty daje data: null przy zachowanym adresie', () => {
    const p = malaChemia().produkty[0]
    if (!p) throw new Error('Brak produktu w danych testu')

    assert.deepEqual(kartaSds({ ...p, sds: { url: 'https://example.com/k.pdf', data: 'marzec' } }),
      { adres: 'https://example.com/k.pdf', data: null, czyFormularz: false })
  })

  it('adres javascript:, http: albo nieczytelny daje null', () => {
    const p = malaChemia().produkty[0]
    if (!p) throw new Error('Brak produktu w danych testu')

    for (const url of ['javascript:alert(1)', 'JavaScript:alert(1)', 'http://example.com/karta.pdf', 'karta.pdf', '']) {
      assert.equal(kartaSds({ ...p, sds: { url, data: '2026-01-01' } }), null, url)
    }
  })
})
