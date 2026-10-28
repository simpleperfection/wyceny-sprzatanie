import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import { czytajJson, katalogTestowy } from '../../tests/pomocnicze.js'
import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn } from './magazyn.js'
import {
  BladUstawien, brakujeUstawien, jestDomyslnymi, pominKreator, POLA_WYMAGANE_W_OFERCIE, scalKoszty, sprawdzUstawienia,
  ustawieniaDomyslne, wczytajDomyslne, zapiszUstawienia,
} from './ustawienia.js'

const DOMYSLNE = {
  meta: { wersja: 'test' },
  status_vat: 'zwolniony',
  stawka_vat_proc: 23,
  tempo: 1.3,
  wojewodztwo: null,
  oferta: { waznosc_dni: 14, warunki: [{ id: 'odwolanie', tresc: 'Odwołanie bezpłatne.', tylko_szybka: false }] },
  szybka_wycena: { zastrzezenie: 'Cena ostateczna po obejrzeniu.' },
}

function nowyMagazyn() {
  const storage = new PamiecMagazynu()
  const magazyn = utworzMagazyn(storage, { teraz: () => new Date('2026-10-24T08:00:00.000Z'), loguj: () => {}, poprosOTrwalosc: () => true })
  return { magazyn, storage }
}

/** @param {string} kod @param {string} pole */
const bladUstawien = (kod, pole) => ({ name: BladUstawien.name, kod, pole })

describe('ustawieniaDomyslne', () => {
  it('bierze status VAT i województwo z data/domyslne.json, resztę pustą', () => {
    assert.deepEqual(ustawieniaDomyslne({ ...DOMYSLNE, status_vat: 'czynny', wojewodztwo: 'mazowieckie' }), {
      wojewodztwoId: 'mazowieckie',
      statusVat: 'czynny',
      firma: { nazwa: '', telefon: '', email: '', nip: '' },
      tempo: { reczne: null },
      koszty: { sprzet: {}, dojazd: {} },
      zakresy: {},
      warunki: null,
      przypomnienieKopiiDni: 7,
      kreatorZakonczony: false,
    })
  })

  it('data/domyslne.json daje ustawienia: VAT zwolniony, średnia krajowa, przypomnienie co 7 dni', async () => {
    const ustawienia = ustawieniaDomyslne(await czytajJson('data/domyslne.json'))

    assert.equal(ustawienia.statusVat, 'zwolniony')
    assert.equal(ustawienia.wojewodztwoId, null)
    assert.equal(ustawienia.przypomnienieKopiiDni, 7)
  })

  it('nieznany status VAT w pliku domyślnych → BladKatalogu zly_format', () => {
    assert.throws(() => ustawieniaDomyslne({ ...DOMYSLNE, status_vat: 'brak' }), { name: BladKatalogu.name, kod: 'zly_format' })
    assert.throws(() => ustawieniaDomyslne({ ...DOMYSLNE, wojewodztwo: undefined }), { name: BladKatalogu.name, kod: 'zly_format' })
  })
})

describe('pominKreator i brakujeUstawien', () => {
  it('pominKreator daje VAT zwolniony, tempo ręczne null, województwo null; braki: województwo i firma', () => {
    const { magazyn, storage } = nowyMagazyn()

    const stan = pominKreator(magazyn, DOMYSLNE)

    assert.equal(stan.ustawienia?.statusVat, 'zwolniony')
    assert.equal(stan.ustawienia?.tempo.reczne, null)
    assert.equal(stan.ustawienia?.wojewodztwoId, null)
    assert.equal(stan.ustawienia?.kreatorZakonczony, false)
    assert.deepEqual(brakujeUstawien(stan.ustawienia), ['wojewodztwo', 'firma'])
    assert.deepEqual(JSON.parse(storage.getItem(KLUCZ_MAGAZYNU) ?? 'null').ustawienia, stan.ustawienia)
  })

  it('pominKreator nie nadpisuje istniejących ustawień', () => {
    const { magazyn } = nowyMagazyn()
    pominKreator(magazyn, DOMYSLNE)
    zapiszUstawienia(magazyn, { statusVat: 'czynny' })

    const stan = pominKreator(magazyn, DOMYSLNE)

    assert.equal(stan.ustawienia?.statusVat, 'czynny')
  })

  it('brak ustawień → oba braki; województwo, nazwa i telefon → brak braków; sama nazwa → firma', () => {
    const pelne = { ...ustawieniaDomyslne(DOMYSLNE), wojewodztwoId: 'mazowieckie' }

    assert.deepEqual(brakujeUstawien(null), ['wojewodztwo', 'firma'])
    assert.deepEqual(brakujeUstawien({ ...pelne, firma: { nazwa: 'Firma Test', telefon: '600 123 456', email: '', nip: '' } }), [])
    assert.deepEqual(brakujeUstawien({ ...pelne, firma: { nazwa: 'Firma Test', telefon: '  ', email: '', nip: '' } }), ['firma'])
  })
})

describe('zapiszUstawienia', () => {
  it('scala firmę, koszty i tempo z istniejącymi ustawieniami i przycina teksty', () => {
    const { magazyn } = nowyMagazyn()
    pominKreator(magazyn, DOMYSLNE)

    zapiszUstawienia(magazyn, { firma: { nazwa: ' Firma Test ', telefon: '600 123 456' }, wojewodztwoId: 'mazowieckie' })
    zapiszUstawienia(magazyn, { koszty: { chemia_h: 6, sprzet: { szorowarka: 25 }, dojazd: { klient_zl_km: 2.5 } }, tempo: { reczne: 1.2 } })
    const { ustawienia } = zapiszUstawienia(magazyn, { firma: { email: 'kontakt@firma.pl' }, przypomnienieKopiiDni: 14 })

    assert.deepEqual(ustawienia?.firma, { nazwa: 'Firma Test', telefon: '600 123 456', email: 'kontakt@firma.pl', nip: '' })
    assert.deepEqual(ustawienia?.koszty, { chemia_h: 6, sprzet: { szorowarka: 25 }, dojazd: { klient_zl_km: 2.5 } })
    assert.equal(ustawienia?.tempo.reczne, 1.2)
    assert.equal(ustawienia?.wojewodztwoId, 'mazowieckie')
    assert.equal(ustawienia?.przypomnienieKopiiDni, 14)
  })

  it('null w kosztach usuwa nadpisanie, a tempo null wraca do liczenia ze zleceń', () => {
    const { magazyn } = nowyMagazyn()
    pominKreator(magazyn, DOMYSLNE)
    zapiszUstawienia(magazyn, { koszty: { chemia_h: 6, sprzet: { szorowarka: 25 } }, tempo: { reczne: 1.2 } })

    const { ustawienia } = zapiszUstawienia(magazyn, { koszty: { chemia_h: null, sprzet: { szorowarka: null } }, tempo: { reczne: null } })

    assert.deepEqual(ustawienia?.koszty, { sprzet: {}, dojazd: {} })
    assert.equal(ustawienia?.tempo.reczne, null)
  })

  it('bez ustawień w stanie: z domyślnymi tworzy ustawienia, bez nich BladUstawien brak_ustawien', () => {
    const { magazyn, storage } = nowyMagazyn()

    assert.throws(() => zapiszUstawienia(magazyn, { statusVat: 'czynny' }), bladUstawien('brak_ustawien', 'ustawienia'))
    assert.equal(storage.length, 0)

    const { ustawienia } = zapiszUstawienia(magazyn, { statusVat: 'czynny', kreatorZakonczony: true }, DOMYSLNE)
    assert.equal(ustawienia?.statusVat, 'czynny')
    assert.equal(ustawienia?.kreatorZakonczony, true)
  })

  it('odrzuca złe wartości kodem i polem, bez zapisu', () => {
    const { magazyn, storage } = nowyMagazyn()
    pominKreator(magazyn, DOMYSLNE)
    const przed = storage.getItem(KLUCZ_MAGAZYNU)
    /** @type {[object, string, string][]} */
    const przypadki = [
      [{ firma: { telefon: '12345' } }, 'telefon', 'firma.telefon'],
      [{ firma: { email: 'kontakt@firma' } }, 'email', 'firma.email'],
      [{ firma: { nip: '5260250275' } }, 'nip', 'firma.nip'],
      [{ firma: { nazwa: 'x'.repeat(121) } }, 'dlugosc', 'firma.nazwa'],
      [{ firma: { adres: 'Długa 1' } }, 'nieznane_pole', 'firma.adres'],
      [{ tempo: { reczne: 3.5 } }, 'zakres', 'tempo.reczne'],
      [{ koszty: { chemia_h: -1 } }, 'zakres', 'koszty.chemia_h'],
      [{ koszty: { sprzet: { __proto__x: 5 } } }, 'wartosc', 'koszty.sprzet'],
      [{ koszty: { dojazd: { zakres_rynkowy: 2 } } }, 'nieznane_pole', 'koszty.dojazd.zakres_rynkowy'],
      [{ statusVat: 'brak' }, 'status_vat', 'statusVat'],
      [{ wojewodztwoId: 'Mazowieckie!' }, 'wartosc', 'wojewodztwoId'],
      [{ przypomnienieKopiiDni: 10 }, 'wartosc', 'przypomnienieKopiiDni'],
      [{ kreatorZakonczony: 'tak' }, 'wartosc', 'kreatorZakonczony'],
      [{ warunki: [] }, 'nieznane_pole', 'warunki'],
    ]

    for (const [patch, kod, pole] of przypadki) {
      assert.throws(() => zapiszUstawienia(magazyn, patch), bladUstawien(kod, pole), JSON.stringify(patch))
    }
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })

  it('pusty e-mail i NIP są dozwolone (pola opcjonalne)', () => {
    const { magazyn } = nowyMagazyn()
    pominKreator(magazyn, DOMYSLNE)

    const { ustawienia } = zapiszUstawienia(magazyn, { firma: { email: '', nip: '', telefon: '' } })

    assert.deepEqual(ustawienia?.firma, { nazwa: '', telefon: '', email: '', nip: '' })
  })
})

describe('scalKoszty', () => {
  it('nadpisuje chemia_h z ustawień i zostawia pozostałe wartości z data/ceny.json', async () => {
    const { kosztyFirmy } = await katalogTestowy()
    const ustawienia = { ...ustawieniaDomyslne(DOMYSLNE), koszty: { chemia_h: 6, sprzet: {}, dojazd: {} } }

    const koszty = scalKoszty(kosztyFirmy, ustawienia)

    assert.deepEqual(koszty.chemia_h, { wartosc: 6 })
    assert.deepEqual(koszty.sprzet, { szorowarka: { nazwa: 'Szorowarka', koszt_h: 20 } })
    assert.deepEqual(koszty.dojazd, { klient_zl_km: 2, zakres_rynkowy: [1.4, 3], darmowy_promien_km: 10, koszt_firmy_zl_km: 1.15 })
    assert.equal(kosztyFirmy.chemia_h.wartosc, 4)
  })

  it('nadpisuje koszt godziny sprzętu i stawki dojazdu, pomija sprzęt spoza katalogu', async () => {
    const { kosztyFirmy } = await katalogTestowy()
    const ustawienia = {
      ...ustawieniaDomyslne(DOMYSLNE),
      koszty: { sprzet: { szorowarka: 30, nieznana: 99 }, dojazd: { klient_zl_km: 2.5, koszt_firmy_zl_km: 0.9 } },
    }

    const koszty = scalKoszty(kosztyFirmy, ustawienia)

    assert.deepEqual(koszty.chemia_h, { wartosc: 4 })
    assert.deepEqual(koszty.sprzet, { szorowarka: { nazwa: 'Szorowarka', koszt_h: 30 } })
    assert.deepEqual(koszty.dojazd, { klient_zl_km: 2.5, zakres_rynkowy: [1.4, 3], darmowy_promien_km: 10, koszt_firmy_zl_km: 0.9 })
  })

  it('bez ustawień zwraca koszty z data/ceny.json', async () => {
    const { kosztyFirmy } = await katalogTestowy()

    assert.deepEqual(scalKoszty(kosztyFirmy, null), kosztyFirmy)
  })
})

describe('zapiszUstawienia: zakres sprzętu i dojazdu, wartości złego typu', () => {
  it('odrzuca kodem i polem: sprzęt 501, dojazd 25 zł/km, promień tekstem, telefon liczbą, firma tekstem, sprzęt listą', () => {
    const { magazyn, storage } = nowyMagazyn()
    pominKreator(magazyn, DOMYSLNE)
    const przed = storage.getItem(KLUCZ_MAGAZYNU)
    /** @type {[object, string, string][]} */
    const przypadki = [
      [{ koszty: { sprzet: { szorowarka: 501 } } }, 'zakres', 'koszty.sprzet.szorowarka'],
      [{ koszty: { dojazd: { klient_zl_km: 25 } } }, 'zakres', 'koszty.dojazd.klient_zl_km'],
      [{ koszty: { dojazd: { darmowy_promien_km: '10' } } }, 'liczba', 'koszty.dojazd.darmowy_promien_km'],
      [{ firma: { telefon: 600123456 } }, 'wartosc', 'firma.telefon'],
      [{ firma: 'Firma' }, 'wartosc', 'firma'],
      [{ koszty: { sprzet: [] } }, 'wartosc', 'koszty.sprzet'],
    ]

    for (const [patch, kod, pole] of przypadki) {
      assert.throws(() => zapiszUstawienia(magazyn, /** @type {never} */ (patch)), bladUstawien(kod, pole), JSON.stringify(patch))
    }
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })
})

describe('sprawdzUstawienia', () => {
  it('ustawienia domyślne przechodzą; tempo 0, przypomnienie co 3 dni i województwo z HTML → BladUstawien', () => {
    const ustawienia = ustawieniaDomyslne(DOMYSLNE)

    assert.doesNotThrow(() => sprawdzUstawienia(ustawienia))
    assert.throws(() => sprawdzUstawienia({ ...ustawienia, tempo: { reczne: 0 } }), bladUstawien('zakres', 'tempo.reczne'))
    assert.throws(() => sprawdzUstawienia({ ...ustawienia, przypomnienieKopiiDni: 3 }), bladUstawien('wartosc', 'przypomnienieKopiiDni'))
    assert.throws(() => sprawdzUstawienia({ ...ustawienia, wojewodztwoId: '<b>' }), bladUstawien('wartosc', 'wojewodztwoId'))
  })
})

describe('jestDomyslnymi i wczytajDomyslne', () => {
  it('data/domyslne.json → true', async () => {
    assert.equal(jestDomyslnymi(await czytajJson('data/domyslne.json')), true)
  })

  it('brak tempo, zły status VAT, warunki jako obiekt, brak zastrzeżenia, waznosc_dni jako tekst → false', () => {
    const { tempo: _tempo, ...bezTempa } = DOMYSLNE
    const zle = [
      bezTempa,
      { ...DOMYSLNE, status_vat: 'czynny ' },
      { ...DOMYSLNE, oferta: { waznosc_dni: 14, warunki: { id: 'odwolanie' } } },
      { ...DOMYSLNE, oferta: { waznosc_dni: '14', warunki: [] } },
      { ...DOMYSLNE, oferta: { waznosc_dni: 14, warunki: [{ id: 'x', tresc: 'Treść' }] } },
      { ...DOMYSLNE, szybka_wycena: {} },
      { ...DOMYSLNE, wojewodztwo: undefined },
      null,
    ]

    assert.deepEqual(zle.map(jestDomyslnymi), zle.map(() => false))
  })

  it('wczytajDomyslne pobiera data/domyslne.json i oddaje poprawny plik', async () => {
    const pobierz = mock.fn(async () => DOMYSLNE)

    const wynik = await wczytajDomyslne(pobierz)

    assert.equal(wynik, DOMYSLNE)
    assert.deepEqual(pobierz.mock.calls[0].arguments, ['data/domyslne.json'])
  })

  it('wczytajDomyslne: plik bez tempo i oferty → BladKatalogu zly_format', async () => {
    await assert.rejects(wczytajDomyslne(async () => ({ status_vat: 'zwolniony' })), { name: BladKatalogu.name, kod: 'zly_format' })
  })

  it('ustawieniaDomyslne używa tego samego strażnika: warunki jako obiekt → BladKatalogu zly_format', () => {
    assert.throws(() => ustawieniaDomyslne({ ...DOMYSLNE, oferta: { waznosc_dni: 14, warunki: {} } }), { name: BladKatalogu.name, kod: 'zly_format' })
  })
})

describe('brakujeUstawien po zakończonym kreatorze', () => {
  it('średnia krajowa wybrana w kreatorze (wojewodztwoId null, kreatorZakonczony) nie jest brakiem', () => {
    const poKreatorze = {
      ...ustawieniaDomyslne(DOMYSLNE), kreatorZakonczony: true, firma: { nazwa: 'Firma Test', telefon: '600 123 456', email: '', nip: '' },
    }

    assert.deepEqual(brakujeUstawien(poKreatorze), [])
    assert.deepEqual(brakujeUstawien({ ...poKreatorze, kreatorZakonczony: false }), ['wojewodztwo'])
  })

  it('pola wymagane w ofercie to nazwa i telefon; pusta nazwa daje brak firmy', () => {
    const pelne = { ...ustawieniaDomyslne(DOMYSLNE), wojewodztwoId: 'mazowieckie', firma: { nazwa: ' ', telefon: '600 123 456', email: '', nip: '' } }

    assert.deepEqual(POLA_WYMAGANE_W_OFERCIE, ['nazwa', 'telefon'])
    assert.deepEqual(brakujeUstawien(pelne), ['firma'])
  })
})
