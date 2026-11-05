import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { DLUGOSCI_KLIENTA, MAKS_KLIENTOW } from './klienci.js'
import { BladKopii, czyPrzypomniecOKopii, odczytajKopie, utworzKopie, wczytajKopie } from './kopia.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn } from './magazyn.js'
import { MAKS_ZLECEN } from './zlecenia-ksztalt.js'

const TERAZ = new Date('2026-10-24T08:30:00.000Z')
const DZIS = new Date('2026-10-24T12:00:00.000Z')
const FIXTURE_V1 = new URL('../../tests/fixtures/kopia-v1.json', import.meta.url)
const MIGAWKA = {
  cena: 250, netto: 250, vat: 0, mediana: 250, widelki: { od: 200, do: 300, pelne: true }, minutyNormowe: 180, linie: [], propozycje: [],
  dojazd: { km: 0, kwota: 0 }, wojewodztwo: { id: 'mazowieckie', nazwa: 'mazowieckie', stawka_h: 70, wsp: 1.08 }, statusVat: 'zwolniony',
  stawkaVatProc: 23, podstawaCeny: 'brutto', wizytWMiesiacu: 4, wersjaDanych: { ceny: 'c', normy: 'n', rynek: 'r' },
}

/** @param {string} id @param {object} [zmiana] */
const klientTestowy = (id, zmiana = {}) => ({
  id, nazwa: `Klient ${id}`, telefon: null, adres: null, notatki: null,
  utworzony: '2026-10-01T10:00:00.000Z', zmieniony: '2026-10-01T10:00:00.000Z', ...zmiana,
})

/** Zlecenie jednorazowe za wizyte u klienta `klientId`. @param {string} id @param {string} klientId @param {object} [zmiana] */
const zlecenieTestowe = (id, klientId, zmiana = {}) => ({
  id, klientId, wycenaId: null, uslugaId: null, opis: 'Mycie okien', rozliczenie: 'za_wizyte', start: '2026-11-02', koniec: null,
  plan: null, okresy: [{ od: '2026-11-02', cykl: null, godzina: null, cenaWizyty: 200, cenaMiesiaca: null }], wizyty: {},
  zaplatyMiesieczne: {}, utworzone: '2026-10-01T10:00:00.000Z', zmienione: '2026-10-01T10:00:00.000Z', ...zmiana,
})

/** Wycena przyjeta z abonamentu, przypisana klientowi `klientId`. @param {string} id @param {string | null} klientId */
const wycenaTestowa = (id, klientId) => ({
  id, numer: '1/10/2026', utworzona: '2026-10-10T10:00:00.000Z', zmieniona: '2026-10-10T10:00:00.000Z', status: 'przyjeta',
  rodzaj: 'dokladna', klient: { nazwa: 'Anna Nowak', adres: 'ul. Lipowa 4', termin: null }, wejscie: { uslugaId: 'biura' },
  klientId, szybka: null, odpowiedzi: {}, wynik: MIGAWKA, cenaReczna: null,
  oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false },
})

/** Seria miesieczna z wyceny: dwa okresy z cyklem, wizyty w kazdym stanie i zaplata za miesiac. */
const SERIA = zlecenieTestowe('z-seria', 'k-anna', {
  wycenaId: 'w1', uslugaId: 'biura', opis: null, rozliczenie: 'miesiecznie', plan: { minutyNormowe: 180, tempo: 1.2 },
  okresy: [
    { od: '2026-11-02', cykl: { co: 'tydzien', dni: [1] }, godzina: '09:00', cenaWizyty: null, cenaMiesiaca: 800 },
    { od: '2026-12-01', cykl: { co: 'dwa_tygodnie', dni: [2, 4] }, godzina: '10:30', cenaWizyty: null, cenaMiesiaca: 900 },
  ],
  wizyty: {
    '2026-11-02': { przeniesiona: null, odwolana: false, zrobiona: '2026-11-02T12:10:00.000Z', zaplata: null, minutyPracy: 165 },
    '2026-11-09': { przeniesiona: { data: '2026-11-10', godzina: '15:00' }, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null },
    '2026-11-16': { przeniesiona: null, odwolana: true, zrobiona: null, zaplata: null, minutyPracy: null },
  },
  zaplatyMiesieczne: { '2026-11': { forma: 'przelew', data: '2026-11-30', kwota: 800 } },
})

/** @param {object} [zmiana] @returns {any} */
const stanTestowy = (zmiana = {}) => ({
  wersja: 2, ustawienia: null, wyceny: [wycenaTestowa('w1', 'k-anna')],
  klienci: [klientTestowy('k-anna', { nazwa: 'Anna Nowak', telefon: '600 100 200', adres: 'ul. Lipowa 4', notatki: 'Klucz u sąsiadki' })],
  zlecenia: [SERIA], licznikNumerow: { '2026-10': 1 }, kopia: { ostatnia: null, zmianaOd: null },
  preferencje: { iosInstrukcjaZamknieta: false }, ...zmiana,
})

/** @param {object} stan */
const plik = (stan) => JSON.stringify({ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: 2, utworzona: TERAZ.toISOString(), stan })
/** @param {string} kod */
const bladKopii = (kod) => ({ name: BladKopii.name, kod })
/** @param {number} n @param {string} prefiks */
const wieluKlientow = (n, prefiks) => Array.from({ length: n }, (_, i) => klientTestowy(`${prefiks}${i}`))

/** @param {object} stan */
function magazynZeStanem(stan) {
  const storage = new PamiecMagazynu()
  const magazyn = utworzMagazyn(storage, { teraz: () => TERAZ, loguj: () => {}, poprosOTrwalosc: () => true })
  magazyn.zapiszCalosc(stan)
  return { magazyn, storage }
}

/** @param {{ wczytaj: () => object }} magazyn @returns {any} */
function zapisanyStan(magazyn) {
  const wynik = magazyn.wczytaj()
  assert.ok('stan' in wynik)
  return wynik.stan
}

describe('kopia v2: round-trip', () => {
  it('stan z klientem i serią (dwa okresy, wizyty ze stanem, zapłata miesięczna) wraca z pliku bez zmian', () => {
    const stan = stanTestowy()

    const { tresc } = utworzKopie(stan, TERAZ)
    const { stan: odczytany } = odczytajKopie(tresc)

    assert.deepEqual(odczytany, stan)
    assert.equal(JSON.parse(tresc).wersjaSchematu, 2)
  })
})

describe('kopia v2: odmowy importu i eksportu', () => {
  it('zlecenie u nieistniejącego klienta, zlecenie z nieistniejącą wyceną i wycena u nieistniejącego klienta → uszkodzony', () => {
    const zle = [
      stanTestowy({ zlecenia: [{ ...SERIA, klientId: 'k-brak' }] }),
      stanTestowy({ zlecenia: [{ ...SERIA, wycenaId: 'w-brak' }] }),
      stanTestowy({ wyceny: [wycenaTestowa('w1', 'k-brak')] }),
    ]

    for (const stan of zle) {
      assert.throws(() => odczytajKopie(plik(stan)), bladKopii('uszkodzony'))
      assert.throws(() => utworzKopie(stan, TERAZ), bladKopii('uszkodzony'))
    }
  })

  it('zapłata formą „karta” w wizycie albo za miesiąc → uszkodzony', () => {
    const karta = { forma: 'karta', data: '2026-11-30', kwota: 800 }
    const wizyta = { przeniesiona: null, odwolana: false, zrobiona: '2026-11-02T12:10:00.000Z', zaplata: karta, minutyPracy: 165 }
    const zle = [
      stanTestowy({ zlecenia: [{ ...SERIA, zaplatyMiesieczne: { '2026-11': karta } }] }),
      stanTestowy({ zlecenia: [{ ...SERIA, rozliczenie: 'za_wizyte', okresy: [{ od: '2026-11-02', cykl: null, godzina: null, cenaWizyty: 200,
        cenaMiesiaca: null }], wizyty: { '2026-11-02': wizyta }, zaplatyMiesieczne: {} }] }),
    ]

    for (const stan of zle) assert.throws(() => odczytajKopie(plik(stan)), bladKopii('uszkodzony'))
  })

  it('powtórzone id klienta albo notatki dłuższe niż limit karty klienta → uszkodzony', () => {
    const anna = stanTestowy().klienci[0]
    const zle = [
      stanTestowy({ klienci: [anna, { ...anna, nazwa: 'Druga Anna' }] }),
      stanTestowy({ klienci: [{ ...anna, notatki: 'x'.repeat(DLUGOSCI_KLIENTA.notatki + 1) }] }),
    ]

    for (const stan of zle) assert.throws(() => odczytajKopie(plik(stan)), bladKopii('uszkodzony'))
  })

  it(`${MAKS_KLIENTOW + 1} klientów → za_duzo_klientow przy imporcie i przy eksporcie, ${MAKS_KLIENTOW} przechodzi`, () => {
    const zaDuzo = stanTestowy({ klienci: [...stanTestowy().klienci, ...wieluKlientow(MAKS_KLIENTOW, 'k')] })
    const naGranicy = stanTestowy({ klienci: [...stanTestowy().klienci, ...wieluKlientow(MAKS_KLIENTOW - 1, 'k')] })

    assert.throws(() => odczytajKopie(plik(zaDuzo)), bladKopii('za_duzo_klientow'))
    assert.throws(() => utworzKopie(zaDuzo, TERAZ), bladKopii('za_duzo_klientow'))
    assert.equal(odczytajKopie(utworzKopie(naGranicy, TERAZ).tresc).stan.klienci.length, MAKS_KLIENTOW)
  })

  it(`${MAKS_ZLECEN + 1} zleceń → za_duzo_zlecen przy imporcie i przy eksporcie`, () => {
    const zlecenia = Array.from({ length: MAKS_ZLECEN + 1 }, (_, i) => zlecenieTestowe(`z${i}`, 'k-anna'))
    const zaDuzo = stanTestowy({ zlecenia })

    assert.throws(() => odczytajKopie(plik(zaDuzo)), bladKopii('za_duzo_zlecen'))
    assert.throws(() => utworzKopie(zaDuzo, TERAZ), bladKopii('za_duzo_zlecen'))
  })
})

describe('kopia v2: plik z wersji 1', () => {
  it('tests/fixtures/kopia-v1.json wczytuje się jako stan v2 z klientem z nazwy przyjętej wyceny i jej zleceniem', async () => {
    const { stan } = odczytajKopie(await readFile(FIXTURE_V1, 'utf8'))

    assert.equal(stan.wersja, 2)
    assert.deepEqual(stan.klienci.map((k) => [k.id, k.nazwa, k.adres]), [
      ['k-8c5a1d2e-4b7f-4c1a-9e0d-1f2a3b4c5d6e', 'Anna Nowak', 'ul. Lipowa 4, Warszawa'],
    ])
    assert.deepEqual(stan.wyceny.map((w) => [w.status, w.klientId]), [
      ['przyjeta', 'k-8c5a1d2e-4b7f-4c1a-9e0d-1f2a3b4c5d6e'], ['szkic', null],
    ])
    assert.deepEqual(stan.zlecenia.map((z) => [z.id, z.klientId, z.wycenaId, z.start]), [
      ['z-8c5a1d2e-4b7f-4c1a-9e0d-1f2a3b4c5d6e', 'k-8c5a1d2e-4b7f-4c1a-9e0d-1f2a3b4c5d6e', '8c5a1d2e-4b7f-4c1a-9e0d-1f2a3b4c5d6e',
        '2026-10-25'],
    ])
  })

  it('plik v1 po migracji przechodzi eksport i odczyt v2 bez zmian', async () => {
    const { stan } = odczytajKopie(await readFile(FIXTURE_V1, 'utf8'))

    assert.deepEqual(odczytajKopie(utworzKopie(stan, TERAZ).tresc).stan, stan)
  })
})

describe('kopia v2: „połącz” klientów i zleceń', () => {
  const lokalny = stanTestowy({
    wyceny: [],
    klienci: [klientTestowy('k1', { nazwa: 'Lokalna nazwa', zmieniony: '2026-10-10T10:00:00.000Z' }),
      klientTestowy('k2', { nazwa: 'Nowsza lokalnie', zmieniony: '2026-10-20T10:00:00.000Z' }),
      klientTestowy('k3', { nazwa: 'Remis lokalny', zmieniony: '2026-10-15T10:00:00.000Z' })],
    zlecenia: [zlecenieTestowe('z-lokalne', 'k1')],
  })
  const zPliku = stanTestowy({
    wyceny: [],
    klienci: [klientTestowy('k1', { nazwa: 'Nowsza w pliku', zmieniony: '2026-10-12T10:00:00.000Z' }),
      klientTestowy('k2', { nazwa: 'Starsza w pliku', zmieniony: '2026-10-11T10:00:00.000Z' }),
      klientTestowy('k3', { nazwa: 'Remis z pliku', zmieniony: '2026-10-15T10:00:00.000Z' }),
      klientTestowy('k-plik', { nazwa: 'Tylko w pliku' })],
    zlecenia: [zlecenieTestowe('z-plik', 'k-plik')],
  })

  it('klient zmieniony później w pliku wygrywa, wcześniej albo w tej samej chwili zostaje lokalny', () => {
    const { magazyn } = magazynZeStanem(lokalny)

    wczytajKopie(magazyn, zPliku, 'polacz')

    assert.deepEqual(zapisanyStan(magazyn).klienci.map((/** @type {any} */ k) => [k.id, k.nazwa]), [
      ['k1', 'Nowsza w pliku'], ['k2', 'Nowsza lokalnie'], ['k3', 'Remis lokalny'], ['k-plik', 'Tylko w pliku'],
    ])
  })

  it('zlecenie tylko lokalne zostaje, a zlecenie z pliku wchodzi razem ze swoim klientem z pliku', () => {
    const { magazyn } = magazynZeStanem(lokalny)

    wczytajKopie(magazyn, zPliku, 'polacz')

    const stan = zapisanyStan(magazyn)
    assert.deepEqual(stan.zlecenia.map((/** @type {any} */ z) => [z.id, z.klientId]), [['z-lokalne', 'k1'], ['z-plik', 'k-plik']])
    assert.equal(stan.klienci.find((/** @type {any} */ k) => k.id === 'k-plik')?.nazwa, 'Tylko w pliku')
  })

  it('zlecenie zmienione później w pliku zastępuje lokalne w całości (wizyty lokalne nie sumują się)', () => {
    const zrobiona = { przeniesiona: null, odwolana: false, zrobiona: '2026-11-02T12:00:00.000Z', zaplata: null, minutyPracy: 120 }
    const odwolana = { przeniesiona: null, odwolana: true, zrobiona: null, zaplata: null, minutyPracy: null }
    const { magazyn } = magazynZeStanem(stanTestowy({ zlecenia: [{ ...SERIA, wizyty: { '2026-11-02': zrobiona } }] }))
    const nowszeWPliku = stanTestowy({ zlecenia: [{ ...SERIA, wizyty: { '2026-11-09': odwolana }, zmienione: '2026-11-10T08:00:00.000Z' }] })

    wczytajKopie(magazyn, nowszeWPliku, 'polacz')

    assert.deepEqual(zapisanyStan(magazyn).zlecenia[0].wizyty, { '2026-11-09': odwolana })
  })

  it(`połączenie ponad ${MAKS_KLIENTOW} klientów → za_duzo_klientow bez zapisu`, () => {
    const { magazyn, storage } = magazynZeStanem(stanTestowy({ klienci: [...stanTestowy().klienci, ...wieluKlientow(2999, 'l')] }))
    const przed = storage.getItem(KLUCZ_MAGAZYNU)
    const zPlikuDuzo = stanTestowy({ klienci: [...stanTestowy().klienci, ...wieluKlientow(2001, 'p')] })

    assert.throws(() => wczytajKopie(magazyn, zPlikuDuzo, 'polacz'), bladKopii('za_duzo_klientow'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })

  it('stan z pliku, którego odwołania wskazują nieistniejącego klienta → uszkodzony bez zapisu, także przy „zastąp”', () => {
    const { magazyn, storage } = magazynZeStanem(lokalny)
    const przed = storage.getItem(KLUCZ_MAGAZYNU)
    const niespojny = stanTestowy({ zlecenia: [{ ...SERIA, klientId: 'k-brak' }] })

    assert.throws(() => wczytajKopie(magazyn, niespojny, 'zastap'), bladKopii('uszkodzony'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })
})

describe('kopia v2: przypomnienie liczy klientów i zlecenia', () => {
  const bezWycen = (/** @type {string} */ klientUtworzony, /** @type {string} */ zlecenieUtworzone) => stanTestowy({
    wyceny: [], klienci: [klientTestowy('k-anna', { utworzony: klientUtworzony })],
    zlecenia: [zlecenieTestowe('z1', 'k-anna', { utworzone: zlecenieUtworzone })],
  })

  it('bez kopii: zlecenie sprzed 7 dni → true, sprzed 6 dni → false (klient z ostatnich dni)', () => {
    assert.equal(czyPrzypomniecOKopii(bezWycen('2026-10-22T12:00:00.000Z', '2026-10-17T12:00:00.000Z'), DZIS), true)
    assert.equal(czyPrzypomniecOKopii(bezWycen('2026-10-22T12:00:00.000Z', '2026-10-18T12:00:00.000Z'), DZIS), false)
  })

  it('bez kopii: sam klient sprzed 7 dni → true; bez wycen, klientów i zleceń → false', () => {
    const samKlient = stanTestowy({ wyceny: [], zlecenia: [], klienci: [klientTestowy('k1', { utworzony: '2026-10-17T12:00:00.000Z' })] })

    assert.equal(czyPrzypomniecOKopii(samKlient, DZIS), true)
    assert.equal(czyPrzypomniecOKopii(stanTestowy({ wyceny: [], klienci: [], zlecenia: [] }), DZIS), false)
  })
})
