import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { czytajJson } from '../../tests/pomocnicze.js'
import { odczytajKopie } from '../dane/kopia.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn, zaktualizujStan } from '../dane/magazyn.js'
import { brakujeUstawien } from '../dane/ustawienia.js'
import { adresWyceny, banerStartu, inicjal, powitanie, stanKafla, zdanieDnia } from './start-dane.js'

/** Poniedzialek; stan moduly-dzis liczy daty wzgledem tego dnia. */
const DZIS = '2026-11-02'
const SKRYPT_STANU = new URL('../../e2e/stany/moduly-dzis.js', import.meta.url)
const KOMPUTER = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36', standalone: false }
const IPHONE = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  standalone: false,
}

/**
 * Stan ze skryptu e2e/stany/moduly-dzis.js uruchomionego jak `agent-browser eval`: atrapa localStorage i zegar przegladarki
 * o 10:00 czasu lokalnego dnia DZIS.
 * @returns {Promise<any>}
 */
async function stanModulowDzis() {
  const kod = await readFile(SKRYPT_STANU, 'utf8')
  const teraz = new Date(`${DZIS}T10:00:00`)
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
  runInNewContext(kod, { localStorage, Date: Zegar })
  const wynik = zaktualizujStan(JSON.parse(localStorage.getItem(KLUCZ_MAGAZYNU) ?? 'null'))
  assert.ok('stan' in wynik, 'stan ze skryptu nie przechodzi straznika magazynu')
  return wynik.stan
}

/** @param {any} stan @param {string} id */
const zlecenieStanu = (stan, id) => stan.zlecenia.find((/** @type {any} */ z) => z.id === id)

/** Obie wizyty „Do zamknięcia” zamkniete: wizyta biura sprzed tygodnia zrobiona, wczorajsza wizyta Jana zaplacona. @param {any} stan */
function zamknijZalegle(stan) {
  const nowy = structuredClone(stan)
  zlecenieStanu(nowy, 'e2e-zlecenie-biuro').wizyty['2026-10-26'] = { przeniesiona: null, odwolana: false,
    zrobiona: '2026-10-26T16:00:00.000Z', zaplata: null, minutyPracy: null }
  zlecenieStanu(nowy, 'e2e-zlecenie-jan').wizyty['2026-11-01'].zaplata = { forma: 'gotowka', data: '2026-11-01', kwota: 180 }
  return nowy
}

/** Bez wizyt dzis: dzisiejsza wizyta biura odwolana, zlecenie Anny przeniesione na jutro (9:00). @param {any} stan */
function bezWizytDzis(stan) {
  const nowy = zamknijZalegle(stan)
  zlecenieStanu(nowy, 'e2e-zlecenie-biuro').wizyty[DZIS] = { przeniesiona: null, odwolana: true, zrobiona: null, zaplata: null, minutyPracy: null }
  const anna = zlecenieStanu(nowy, 'e2e-zlecenie-anna')
  anna.start = '2026-11-03'
  anna.okresy[0].od = '2026-11-03'
  return nowy
}

/** @param {any} stan @param {string} id */
const bezWyceny = (stan, id) => ({ ...stan, wyceny: stan.wyceny.filter((/** @type {any} */ w) => w.id !== id) })

/** Zapisana wycena (`do_wyslania`) do testow adresu; `zmiana` nadpisuje pola. @param {string} id @param {object} [zmiana] @returns {any} */
const wycenaTestowa = (id, zmiana = {}) => ({
  id, numer: '1/10/2026', utworzona: '2026-10-10T10:00:00.000Z', zmieniona: '2026-10-10T10:00:00.000Z', status: 'do_wyslania',
  rodzaj: 'dokladna', klient: { nazwa: 'Jan Kowalski', adres: '', termin: null }, wejscie: { uslugaId: 'mieszkanie_standard' },
  klientId: null, szybka: null, odpowiedzi: {}, wynik: null, cenaReczna: null,
  oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false }, ...zmiana,
})

/** @param {string} plikStanu sciezka wzgledem repo */
async function tekstKopii(plikStanu) {
  const stan = await czytajJson(plikStanu)
  return { stan, tresc: JSON.stringify({ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: 1, utworzona: '2026-10-25T10:00:00.000Z', stan }) }
}

describe('powitanie', () => {
  it('z nazwą firmy (przyciętą) i samo „Dzień dobry”, gdy nazwy albo ustawień brak', async () => {
    const { ustawienia } = await stanModulowDzis()

    assert.equal(powitanie(ustawienia), 'Dzień dobry, Usługi Sprzątające Monika Lis')
    assert.equal(powitanie({ ...ustawienia, firma: { ...ustawienia.firma, nazwa: '  Lśniąco  ' } }), 'Dzień dobry, Lśniąco')
    assert.equal(powitanie({ ...ustawienia, firma: { ...ustawienia.firma, nazwa: '   ' } }), 'Dzień dobry')
    assert.equal(powitanie(null), 'Dzień dobry')
  })
})

describe('zdanieDnia', () => {
  it('stan moduly-dzis: dwie wizyty dziś i jedna niezapłacona', async () => {
    const stan = await stanModulowDzis()

    assert.equal(zdanieDnia(stan, DZIS), 'Dziś 2 zlecenia · 1 niezapłacone')
  })

  it('bez zleceń, bez wizyt dziś z jedną niezapłaconą i z pięcioma niezapłaconymi', async () => {
    const stan = await stanModulowDzis()
    const bezDzis = bezWizytDzis(stan)
    zlecenieStanu(bezDzis, 'e2e-zlecenie-jan').wizyty['2026-11-01'].zaplata = null
    const piec = structuredClone(stan)
    const jan = zlecenieStanu(piec, 'e2e-zlecenie-jan')
    for (const dzien of ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']) jan.wizyty[dzien] = { ...jan.wizyty['2026-11-01'] }
    jan.start = '2026-10-27'
    jan.okresy[0] = { ...jan.okresy[0], od: '2026-10-27', cykl: { co: 'tydzien', dni: [1, 2, 3, 4, 5, 6, 7] } }

    assert.equal(zdanieDnia({ ...stan, zlecenia: [] }, DZIS), 'Dziś nie masz zleceń')
    assert.equal(zdanieDnia(bezDzis, DZIS), 'Dziś nie masz zleceń · 1 niezapłacone')
    assert.equal(zdanieDnia(piec, DZIS), 'Dziś 3 zlecenia · 5 niezapłaconych')
  })

  it('zły dzień rzuca BladKalendarza', async () => {
    const stan = await stanModulowDzis()

    assert.throws(() => zdanieDnia(stan, '2026-11-31'), { name: 'BladKalendarza', kod: 'dzien' })
  })
})

describe('stanKafla', () => {
  it('Zlecenia: do zamknięcia, po zamknięciu dziś, bez wizyt dziś najbliższa, bez zleceń pierwszy krok', async () => {
    const stan = await stanModulowDzis()
    const zamkniete = zamknijZalegle(stan)

    assert.deepEqual(stanKafla('zlecenia', stan, DZIS), { tekst: '2 do zamknięcia', czyAkcja: true })
    assert.deepEqual(stanKafla('zlecenia', zamkniete, DZIS), { tekst: '2 dziś', czyAkcja: false })
    assert.deepEqual(stanKafla('zlecenia', bezWizytDzis(stan), DZIS), { tekst: 'Najbliższe: jutro 9:00', czyAkcja: false })
    assert.deepEqual(stanKafla('zlecenia', { ...stan, zlecenia: [] }, DZIS), { tekst: 'Dodaj pierwsze zlecenie', czyAkcja: true })
  })

  it('Zlecenia: same zamknięte wizyty w przeszłości → „Brak zaplanowanych wizyt”', async () => {
    const zamkniete = zamknijZalegle(await stanModulowDzis())
    const tylkoJan = { ...zamkniete, zlecenia: [zlecenieStanu(zamkniete, 'e2e-zlecenie-jan')] }

    assert.deepEqual(stanKafla('zlecenia', tylkoJan, DZIS), { tekst: 'Brak zaplanowanych wizyt', czyAkcja: false })
  })

  it('Wycena: do wysłania, bez niej do zaplanowania, bez wycen pierwszy krok', async () => {
    const stan = await stanModulowDzis()

    assert.deepEqual(stanKafla('wycena', stan, DZIS), { tekst: '1 do wysłania', czyAkcja: true })
    assert.deepEqual(stanKafla('wycena', bezWyceny(stan, 'e2e-wycena-okna'), DZIS), { tekst: '1 do zaplanowania', czyAkcja: true })
    assert.deepEqual(stanKafla('wycena', { ...stan, wyceny: [] }, DZIS), { tekst: 'Zrób pierwszą wycenę', czyAkcja: true })
  })

  it('Wycena: wysłane czekają na odpowiedź, a bez spraw do załatwienia sama liczba wycen', async () => {
    const stan = bezWyceny(await stanModulowDzis(), 'e2e-wycena-okna')
    stan.zlecenia = stan.zlecenia.map((/** @type {any} */ z) => (z.id === 'e2e-zlecenie-anna' ? { ...z, wycenaId: 'e2e-wycena-mieszkanie' } : z))
    const dwieWyslane = { ...stan, wyceny: [...stan.wyceny, { ...stan.wyceny[2], id: 'druga-wyslana' }] }
    const bezWyslanych = { ...stan, wyceny: stan.wyceny.map((/** @type {any} */ w) => ({ ...w, status: w.status === 'wyslana' ? 'odrzucona' : w.status })) }

    assert.deepEqual(stanKafla('wycena', stan, DZIS), { tekst: '1 czeka na odpowiedź', czyAkcja: false })
    assert.deepEqual(stanKafla('wycena', dwieWyslane, DZIS), { tekst: '2 czekają na odpowiedź', czyAkcja: false })
    assert.deepEqual(stanKafla('wycena', bezWyslanych, DZIS), { tekst: '3 wyceny', czyAkcja: false })
  })

  it('Klienci z liczbą (męskoosobowo), bez klientów pierwszy krok; Chemia stały tekst', async () => {
    const stan = await stanModulowDzis()

    assert.deepEqual(stanKafla('klienci', stan, DZIS), { tekst: '3 klientów', czyAkcja: false })
    assert.deepEqual(stanKafla('klienci', { ...stan, klienci: stan.klienci.slice(0, 1) }, DZIS), { tekst: '1 klient', czyAkcja: false })
    assert.deepEqual(stanKafla('klienci', { ...stan, klienci: [] }, DZIS), { tekst: 'Dodaj pierwszego klienta', czyAkcja: true })
    assert.deepEqual(stanKafla('chemia', stan, DZIS), { tekst: 'Środki do każdego brudu', czyAkcja: false })
  })

  it('nieznany moduł rzuca RangeError, zły dzień w Zleceniach BladKalendarza', async () => {
    const stan = await stanModulowDzis()

    assert.throws(() => stanKafla(/** @type {any} */ ('pieniadze'), stan, DZIS), RangeError)
    assert.throws(() => stanKafla('zlecenia', stan, '2.11.2026'), { name: 'BladKalendarza' })
  })
})

describe('banerStartu', () => {
  const TERAZ = new Date(`${DZIS}T10:00:00`)

  it('brak kopii i ustawienia domyślne → tylko baner kopii; po kopii baner ustawień; bez braków żadnego', async () => {
    const stan = await stanModulowDzis()
    const domyslne = { ...stan, ustawienia: { ...stan.ustawienia, firma: { ...stan.ustawienia.firma, telefon: '' } } }
    const poKopii = { ...domyslne, kopia: { ostatnia: '2026-11-02T08:00:00.000Z', zmianaOd: null } }

    assert.deepEqual(banerStartu(domyslne, TERAZ, KOMPUTER), { rodzaj: 'kopia' })
    assert.deepEqual(banerStartu(poKopii, TERAZ, KOMPUTER), { rodzaj: 'ustawienia' })
    assert.equal(banerStartu({ ...poKopii, ustawienia: stan.ustawienia }, TERAZ, KOMPUTER), null)
  })

  it('instrukcja dla iPhone’a ma pierwszeństwo przed kopią, a po zamknięciu wraca baner kopii', async () => {
    const stan = await stanModulowDzis()
    const zamknieta = { ...stan, preferencje: { iosInstrukcjaZamknieta: true } }

    assert.deepEqual(banerStartu(stan, TERAZ, IPHONE), { rodzaj: 'ios' })
    assert.deepEqual(banerStartu(zamknieta, TERAZ, IPHONE), { rodzaj: 'kopia' })
  })

  it('zła data dnia rzuca błąd przypomnienia o kopii', async () => {
    const stan = await stanModulowDzis()

    assert.throws(() => banerStartu(stan, new Date(Number.NaN), KOMPUTER), { name: 'BladKopii' })
  })
})

describe('adresWyceny, inicjal', () => {
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
  it('wyceny-do-zrobienia.json (wersja 1) przechodzi przez odczytajKopie i magazyn, a kafel Wycena ma jedną do wysłania', async () => {
    const { stan, tresc } = await tekstKopii('e2e/stany/wyceny-do-zrobienia.json')
    const storage = new PamiecMagazynu()
    storage.setItem(KLUCZ_MAGAZYNU, JSON.stringify(stan))

    const zKopii = odczytajKopie(tresc).stan
    const zMagazynu = utworzMagazyn(storage, { loguj: () => {}, poprosOTrwalosc: () => true }).wczytaj()

    assert.ok('stan' in zMagazynu, 'magazyn odrzucił stan')
    assert.deepEqual(zMagazynu.stan, zKopii)
    assert.deepEqual(zKopii.wyceny.map((w) => w.status), ['do_wyslania', 'wyslana', 'przyjeta'])
    assert.deepEqual(stanKafla('wycena', zKopii, DZIS), { tekst: '1 do wysłania', czyAkcja: true })
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
