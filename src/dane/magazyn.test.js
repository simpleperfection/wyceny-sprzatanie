import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { BladMagazynu, KLUCZ_MAGAZYNU, utworzMagazyn, WERSJA_SCHEMATU, zaktualizujStan } from './magazyn.js'

const TERAZ = '2026-10-24T08:30:00.000Z'
const PUSTY_STAN = {
  wersja: 1,
  ustawienia: null,
  wyceny: [],
  licznikNumerow: {},
  kopia: { ostatnia: null, zmianaOd: null },
  preferencje: { iosInstrukcjaZamknieta: false },
}

/** @param {PamiecMagazynu} [storage] @param {object} [opcje] */
function magazynTestowy(storage = new PamiecMagazynu(), opcje = {}) {
  const loguj = mock.fn()
  const poprosOTrwalosc = mock.fn(async () => true)
  const magazyn = utworzMagazyn(storage, { teraz: () => new Date(TERAZ), loguj, poprosOTrwalosc, ...opcje })
  return { magazyn, storage, loguj, poprosOTrwalosc }
}

/** @param {string} kod */
const bladMagazynu = (kod) => ({ name: BladMagazynu.name, kod })

describe('stałe magazynu', () => {
  it('klucz z przedrostkiem aplikacji i wersja schematu 1', () => {
    assert.equal(KLUCZ_MAGAZYNU, 'wyceny-sprzatanie:stan')
    assert.equal(WERSJA_SCHEMATU, 1)
  })
})

describe('wczytaj', () => {
  it('pusty storage → stan v1 bez ustawień i bez wycen, bez zapisu', () => {
    const { magazyn, storage } = magazynTestowy()

    const wynik = magazyn.wczytaj()

    assert.deepEqual(wynik, { stan: PUSTY_STAN })
    assert.equal(storage.length, 0)
  })

  it('uszkodzony JSON → blad uszkodzony z oryginalnym tekstem i wpisem w logu', () => {
    const storage = new PamiecMagazynu()
    storage.setItem(KLUCZ_MAGAZYNU, '{"wersja":1,')
    const { magazyn, loguj } = magazynTestowy(storage)

    const wynik = magazyn.wczytaj()

    assert.deepEqual(wynik, { blad: 'uszkodzony', surowe: '{"wersja":1,' })
    assert.deepEqual(loguj.mock.calls.map((c) => c.arguments[0].kod), ['magazyn_uszkodzony'])
  })

  it('zły kształt: wyceny nie są listą → uszkodzony', () => {
    const storage = new PamiecMagazynu()
    const surowe = JSON.stringify({ ...PUSTY_STAN, wyceny: {} })
    storage.setItem(KLUCZ_MAGAZYNU, surowe)

    assert.deepEqual(magazynTestowy(storage).magazyn.wczytaj(), { blad: 'uszkodzony', surowe })
  })

  it('zły kształt ustawień: województwo jako liczba albo nieznany status VAT → uszkodzony', () => {
    const storage = new PamiecMagazynu()
    const { magazyn } = magazynTestowy(storage)
    const ustawienia = {
      wojewodztwoId: null, statusVat: 'zwolniony', firma: { nazwa: '', telefon: '', email: '', nip: '' }, tempo: { reczne: null },
      koszty: { sprzet: {}, dojazd: {} }, zakresy: {}, warunki: null, przypomnienieKopiiDni: 7, kreatorZakonczony: false,
    }
    storage.setItem(KLUCZ_MAGAZYNU, JSON.stringify({ ...PUSTY_STAN, ustawienia }))
    assert.deepEqual(magazyn.wczytaj(), { stan: { ...PUSTY_STAN, ustawienia } })

    for (const zle of [{ wojewodztwoId: 14 }, { statusVat: 'inny' }, { firma: { nazwa: 'A' } }, { tempo: { reczne: '1.2' } }]) {
      const surowe = JSON.stringify({ ...PUSTY_STAN, ustawienia: { ...ustawienia, ...zle } })
      storage.setItem(KLUCZ_MAGAZYNU, surowe)
      assert.deepEqual(magazyn.wczytaj(), { blad: 'uszkodzony', surowe }, JSON.stringify(zle))
    }
  })

  it('stan z wersją 2 → nowsza_wersja z oryginalnym tekstem', () => {
    const storage = new PamiecMagazynu()
    const surowe = JSON.stringify({ ...PUSTY_STAN, wersja: 2 })
    storage.setItem(KLUCZ_MAGAZYNU, surowe)

    assert.deepEqual(magazynTestowy(storage).magazyn.wczytaj(), { blad: 'nowsza_wersja', surowe })
  })

  it('wersja 0 (bez kroku aktualizacji) i wersja ułamkowa → uszkodzony', () => {
    assert.deepEqual(zaktualizujStan({ ...PUSTY_STAN, wersja: 0 }), { blad: 'uszkodzony' })
    assert.deepEqual(zaktualizujStan({ ...PUSTY_STAN, wersja: 1.5 }), { blad: 'uszkodzony' })
    assert.deepEqual(zaktualizujStan(null), { blad: 'uszkodzony' })
  })
})

describe('zmien', () => {
  it('zapisuje stan pod wyceny-sprzatanie:stan i ustawia kopia.zmianaOd na teraz', () => {
    const { magazyn, storage } = magazynTestowy()

    const stan = magazyn.zmien((s) => ({ ...s, licznikNumerow: { '2026-10': 3 } }))

    const oczekiwany = { ...PUSTY_STAN, licznikNumerow: { '2026-10': 3 }, kopia: { ostatnia: null, zmianaOd: TERAZ } }
    assert.deepEqual(stan, oczekiwany)
    assert.deepEqual(JSON.parse(storage.getItem(KLUCZ_MAGAZYNU) ?? 'null'), oczekiwany)
  })

  it('czyta stan na nowo przy każdej zmianie: zapis innej karty nie ginie', () => {
    const storage = new PamiecMagazynu()
    const kartaA = magazynTestowy(storage).magazyn
    const kartaB = magazynTestowy(storage).magazyn

    kartaA.zmien((s) => ({ ...s, licznikNumerow: { '2026-10': 1 } }))
    kartaB.zmien((s) => ({ ...s, preferencje: { iosInstrukcjaZamknieta: true } }))

    const { stan } = /** @type {{ stan: typeof PUSTY_STAN }} */ (kartaA.wczytaj())
    assert.deepEqual(stan.licznikNumerow, { '2026-10': 1 })
    assert.equal(stan.preferencje.iosInstrukcjaZamknieta, true)
  })

  it('przepełnienie (setItem rzuca QuotaExceededError) → BladMagazynu pelny, poprzedni zapis zostaje', () => {
    const { magazyn, storage } = magazynTestowy()
    magazyn.zmien((s) => ({ ...s, licznikNumerow: { '2026-10': 1 } }))
    const przed = storage.getItem(KLUCZ_MAGAZYNU)
    storage.pelna = true

    assert.throws(() => magazyn.zmien((s) => ({ ...s, licznikNumerow: { '2026-10': 2 } })), bladMagazynu('pelny'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), przed)
  })

  it('inny błąd setItem przechodzi bez zmiany', () => {
    const storage = new PamiecMagazynu()
    storage.setItem = () => {
      throw new DOMException('Brak dostępu', 'SecurityError')
    }

    assert.throws(() => magazynTestowy(storage).magazyn.zmien((s) => s), { name: 'SecurityError' })
  })

  it('na uszkodzonym stanie rzuca BladMagazynu uszkodzony i nie nadpisuje surowych danych', () => {
    const storage = new PamiecMagazynu()
    storage.setItem(KLUCZ_MAGAZYNU, 'nie json')
    const { magazyn } = magazynTestowy(storage)

    assert.throws(() => magazyn.zmien((s) => s), bladMagazynu('uszkodzony'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), 'nie json')
  })

  it('funkcja zwracająca stan złego kształtu → BladMagazynu zly_stan, bez zapisu', () => {
    const { magazyn, storage } = magazynTestowy()

    assert.throws(() => magazyn.zmien((s) => ({ ...s, wyceny: null })), bladMagazynu('zly_stan'))
    assert.equal(storage.getItem(KLUCZ_MAGAZYNU), null)
  })

  it('prosi o trwały magazyn tylko przy pierwszym zapisie', async () => {
    const { magazyn, poprosOTrwalosc } = magazynTestowy()

    magazyn.zmien((s) => s)
    magazyn.zmien((s) => s)
    await new Promise((gotowe) => setImmediate(gotowe))

    assert.equal(poprosOTrwalosc.mock.callCount(), 1)
  })

  it('odmowa trwałego magazynu trafia do logu i nie przerywa zapisu', async () => {
    const poprosOTrwalosc = mock.fn(async () => {
      throw new TypeError('persist niedostępne')
    })
    const { magazyn, storage, loguj } = magazynTestowy(new PamiecMagazynu(), { poprosOTrwalosc })

    magazyn.zmien((s) => s)
    await new Promise((gotowe) => setImmediate(gotowe))

    assert.notEqual(storage.getItem(KLUCZ_MAGAZYNU), null)
    assert.deepEqual(loguj.mock.calls[0].arguments[0], { kod: 'trwalosc_niedostepna', przyczyna: 'TypeError: persist niedostępne' })
  })
})

describe('zapiszCalosc i wyczysc', () => {
  it('zapiszCalosc zapisuje stan bez zmiany kopia.zmianaOd', () => {
    const { magazyn, storage } = magazynTestowy()
    const stan = { ...PUSTY_STAN, kopia: { ostatnia: '2026-10-01T10:00:00.000Z', zmianaOd: null } }

    magazyn.zapiszCalosc(stan)

    assert.deepEqual(JSON.parse(storage.getItem(KLUCZ_MAGAZYNU) ?? 'null'), stan)
  })

  it('zapiszCalosc odrzuca stan innej wersji i zły kształt', () => {
    const { magazyn, storage } = magazynTestowy()

    assert.throws(() => magazyn.zapiszCalosc({ ...PUSTY_STAN, wersja: 2 }), bladMagazynu('zly_stan'))
    assert.throws(() => magazyn.zapiszCalosc({ ...PUSTY_STAN, licznikNumerow: { '2026-10': -1 } }), bladMagazynu('zly_stan'))
    assert.equal(storage.length, 0)
  })

  it('wyczysc usuwa uszkodzony stan, potem wczytaj daje pusty stan', () => {
    const storage = new PamiecMagazynu()
    storage.setItem(KLUCZ_MAGAZYNU, 'nie json')
    storage.setItem('inna-aplikacja', 'zostaje')
    const { magazyn } = magazynTestowy(storage)

    magazyn.wyczysc()

    assert.deepEqual(magazyn.wczytaj(), { stan: PUSTY_STAN })
    assert.equal(storage.getItem('inna-aplikacja'), 'zostaje')
  })
})

describe('naZmiane', () => {
  /** @param {string | null} key @param {unknown} storageArea */
  const zdarzenie = (key, storageArea) => Object.assign(new Event('storage'), { key, storageArea })

  it('woła callback dla zmiany klucza magazynu i czyszczenia, nie dla innego klucza ani innego magazynu', () => {
    const okno = new EventTarget()
    const { magazyn, storage } = magazynTestowy(new PamiecMagazynu(), { okno })
    const callback = mock.fn()
    magazyn.naZmiane(callback)

    okno.dispatchEvent(zdarzenie(KLUCZ_MAGAZYNU, storage))
    okno.dispatchEvent(zdarzenie(null, storage))
    okno.dispatchEvent(zdarzenie('inny-klucz', storage))
    okno.dispatchEvent(zdarzenie(KLUCZ_MAGAZYNU, new PamiecMagazynu()))

    assert.equal(callback.mock.callCount(), 2)
  })

  it('funkcja zwrócona przez naZmiane odpina callback', () => {
    const okno = new EventTarget()
    const { magazyn, storage } = magazynTestowy(new PamiecMagazynu(), { okno })
    const callback = mock.fn()

    const odepnij = magazyn.naZmiane(callback)
    odepnij()
    okno.dispatchEvent(zdarzenie(KLUCZ_MAGAZYNU, storage))

    assert.equal(callback.mock.callCount(), 0)
  })
})
