import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { KLUCZ_MAGAZYNU, zaktualizujStan } from '../dane/magazyn.js'
import { sekcjeWycen, wierszWyceny } from './lista-wycen-dane.js'

/** Poniedzialek; stan moduly-dzis liczy daty wzgledem tego dnia. */
const DZIS = '2026-11-02'
const SKRYPT_STANU = new URL('../../e2e/stany/moduly-dzis.js', import.meta.url)
const NBSP = ' '
const KATALOG = { uslugi: [{ id: 'okna', nazwa: 'Mycie okien' }, { id: 'sprzatanie_biur', nazwa: 'Sprzątanie biur i lokali usługowych' }] }

/**
 * Stan ze skryptu e2e/stany/moduly-dzis.js uruchomionego jak `agent-browser eval`: atrapa localStorage i zegar przegladarki
 * o 10:00 czasu lokalnego dnia DZIS (ta sama procedura co w start-dane.test.js i src/zlecenia/zapytania.test.js).
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

/**
 * Wycena z polami, ktore czytaja sekcje i wiersz; reszta jak w zapisanej wycenie.
 * @param {string} id @param {string} status @param {string} zmieniona @param {Record<string, unknown>} [pola]
 */
function wycenaTestowa(id, status, zmieniona, pola = {}) {
  return { id, numer: null, utworzona: zmieniona, zmieniona, status, rodzaj: 'dokladna', klientId: null,
    klient: { nazwa: '', adres: '', termin: null }, wejscie: { uslugaId: 'okna' }, szybka: null, odpowiedzi: {},
    wynik: { cena: 180, wizytWMiesiacu: null }, cenaReczna: null,
    oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false }, ...pola }
}

/** @param {string} id @param {string} wycenaId @param {{ co: string, dni: number[] } | null} cykl */
const zlecenieTestowe = (id, wycenaId, cykl) => ({ id, wycenaId, okresy: [{ od: DZIS, cykl }] })

/** @param {ReturnType<typeof sekcjeWycen>} sekcje */
const tytulyIIdy = (sekcje) => sekcje.map(({ tytul, wyceny }) => [tytul, wyceny.map((w) => w.id)])

describe('sekcjeWycen', () => {
  it('stan moduly-dzis: do wysłania Jan, do zaplanowania i czekająca Anna, w pozostałych biuro z serią zleceń', async () => {
    const stan = await stanModulowDzis()

    const sekcje = sekcjeWycen(stan)

    assert.deepEqual(sekcje.map(({ id, tytul, wyceny }) => [id, tytul, wyceny.map((w) => w.klient.nazwa)]), [
      ['do_wyslania', 'Do wysłania', ['Jan Nowak']],
      ['do_zaplanowania', 'Do zaplanowania', ['Anna Kowalska']],
      ['czekaja', 'Czekają na odpowiedź', ['Anna Kowalska']],
      ['pozostale', 'Pozostałe', ['Biuro Rachunkowe Lis']],
    ])
    assert.deepEqual(tytulyIIdy(sekcje).map(([, idy]) => idy),
      [['e2e-wycena-okna'], ['e2e-wycena-mieszkanie'], ['e2e-wycena-tapicerka'], ['e2e-wycena-biuro']])
  })

  it('przyjęty abonament z samymi zleceniami jednorazowymi jest w „Do zaplanowania”, od najnowszej zmiany', async () => {
    const stan = structuredClone(await stanModulowDzis())
    const biuro = stan.zlecenia.find((/** @type {any} */ z) => z.id === 'e2e-zlecenie-biuro')
    biuro.okresy[0].cykl = null

    const sekcje = sekcjeWycen(stan)

    assert.deepEqual(tytulyIIdy(sekcje), [
      ['Do wysłania', ['e2e-wycena-okna']],
      ['Do zaplanowania', ['e2e-wycena-mieszkanie', 'e2e-wycena-biuro']],
      ['Czekają na odpowiedź', ['e2e-wycena-tapicerka']],
    ])
  })

  it('„Pozostałe”: szkic, przyjęta ze zleceniem i odrzucona, od najnowszej zmiany', () => {
    const stan = {
      wyceny: [
        wycenaTestowa('odrzucona', 'odrzucona', '2026-10-20T10:00:00.000Z'),
        wycenaTestowa('szkic', 'szkic', '2026-10-28T10:00:00.000Z', { wynik: null }),
        wycenaTestowa('przyjeta', 'przyjeta', '2026-10-25T10:00:00.000Z'),
      ],
      zlecenia: [zlecenieTestowe('z1', 'przyjeta', null)],
    }

    const sekcje = sekcjeWycen(/** @type {any} */ (stan))

    assert.deepEqual(tytulyIIdy(sekcje), [['Pozostałe', ['szkic', 'przyjeta', 'odrzucona']]])
  })

  it('kilka wycen w jednej sekcji: najnowsza zmiana pierwsza, puste sekcje pominięte', () => {
    const stan = {
      wyceny: [
        wycenaTestowa('starsza', 'wyslana', '2026-10-01T10:00:00.000Z'),
        wycenaTestowa('nowsza', 'wyslana', '2026-10-30T10:00:00.000Z'),
      ],
      zlecenia: [],
    }

    const sekcje = sekcjeWycen(/** @type {any} */ (stan))

    assert.deepEqual(tytulyIIdy(sekcje), [['Czekają na odpowiedź', ['nowsza', 'starsza']]])
  })

  it('bez wycen nie ma żadnej sekcji', () => {
    assert.deepEqual(sekcjeWycen({ wyceny: [], zlecenia: [] }), [])
  })

  it('przyjęta jednorazowa wycena z jednym zleceniem nie jest już do zaplanowania', () => {
    const stan = {
      wyceny: [wycenaTestowa('w1', 'przyjeta', '2026-10-25T10:00:00.000Z')],
      zlecenia: [zlecenieTestowe('z1', 'w1', null), zlecenieTestowe('z2', 'inna', null)],
    }

    const sekcje = sekcjeWycen(/** @type {any} */ (stan))

    assert.deepEqual(tytulyIIdy(sekcje), [['Pozostałe', ['w1']]])
  })
})

describe('wierszWyceny', () => {
  it('z klientem: tytuł to nazwa klienta, szczegóły to kwota i usługa', () => {
    const w = wycenaTestowa('w1', 'do_wyslania', '2026-10-28T10:00:00.000Z', { klient: { nazwa: 'Jan Nowak', adres: '', termin: null } })

    assert.deepEqual(wierszWyceny(/** @type {any} */ (w), /** @type {any} */ (KATALOG)),
      { tytul: 'Jan Nowak', szczegoly: `180${NBSP}zł · Mycie okien` })
  })

  it('bez klienta: tytuł to nazwa usługi, szczegóły to kwota i dzień ostatniej zmiany', () => {
    const w = wycenaTestowa('w1', 'szkic', '2026-10-28T10:00:00.000Z', { klient: { nazwa: '  ', adres: '', termin: null } })

    assert.deepEqual(wierszWyceny(/** @type {any} */ (w), /** @type {any} */ (KATALOG)),
      { tytul: 'Mycie okien', szczegoly: `180${NBSP}zł · 28 paź` })
  })

  it('cena ręczna wygrywa z ceną z migawki', () => {
    const w = wycenaTestowa('w1', 'wyslana', '2026-10-28T10:00:00.000Z', { cenaReczna: 1250,
      klient: { nazwa: 'Biuro', adres: '', termin: null }, wejscie: { uslugaId: 'sprzatanie_biur' } })

    assert.deepEqual(wierszWyceny(/** @type {any} */ (w), /** @type {any} */ (KATALOG)),
      { tytul: 'Biuro', szczegoly: `1${NBSP}250${NBSP}zł · Sprzątanie biur i lokali usługowych` })
  })

  it('szkic bez ceny: z klientem sama usługa, bez klienta sam dzień', () => {
    const zKlientem = wycenaTestowa('w1', 'szkic', '2026-10-28T10:00:00.000Z', { wynik: null,
      klient: { nazwa: 'Anna', adres: '', termin: null } })
    const bezKlienta = wycenaTestowa('w2', 'szkic', '2026-10-28T10:00:00.000Z', { wynik: null })

    assert.deepEqual(wierszWyceny(/** @type {any} */ (zKlientem), /** @type {any} */ (KATALOG)),
      { tytul: 'Anna', szczegoly: 'Mycie okien' })
    assert.deepEqual(wierszWyceny(/** @type {any} */ (bezKlienta), /** @type {any} */ (KATALOG)),
      { tytul: 'Mycie okien', szczegoly: '28 paź' })
  })

  it('usługa usunięta z danych: zostaje jej id', () => {
    const w = wycenaTestowa('w1', 'wyslana', '2026-10-28T10:00:00.000Z', { wejscie: { uslugaId: 'stara_usluga' } })

    assert.equal(wierszWyceny(/** @type {any} */ (w), /** @type {any} */ (KATALOG)).tytul, 'stara_usluga')
  })

  it('bez klienta i z nieprawidłową datą zmiany: RangeError', () => {
    const w = wycenaTestowa('w1', 'szkic', 'nie-data')

    assert.throws(() => wierszWyceny(/** @type {any} */ (w), /** @type {any} */ (KATALOG)), RangeError)
  })
})
