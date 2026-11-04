import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { kartaWyniku, kopiujTekstKlienta } from './szybka-wynik.js'

/** @typedef {import('../kreator/szybka.js').StanWyniku} StanWyniku */

const NBSP = ' '
const TEKST_KLIENTA = 'Sprzątanie mieszkania 50 m²: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.'

/** Atrapa elementu DOM (Node nie ma DOM): tag, atrybuty, dzieci i zdarzenia; wezly tekstowe to `{ tekst }`. */
class AtrapaElementu {
  /** @param {string} tag */
  constructor(tag) {
    this.tag = tag
    /** @type {Map<string, string>} */
    this.atrybuty = new Map()
    /** @type {unknown[]} */
    this.dzieci = []
    /** @type {Map<string, () => void>} */
    this.obslugi = new Map()
    /** @type {Record<string, string>} */
    this.dataset = {}
    this.open = false
    this.disabled = false
  }

  /** @param {string} nazwa @param {string} wartosc */
  setAttribute(nazwa, wartosc) { this.atrybuty.set(nazwa, wartosc) }

  /** @param {unknown} dziecko */
  appendChild(dziecko) { this.dzieci.push(dziecko) }

  /** @param {string} zdarzenie @param {() => void} obsluga */
  addEventListener(zdarzenie, obsluga) { this.obslugi.set(zdarzenie, obsluga) }
}

const atrapaDokumentu = {
  /** @param {string} tag */
  createElement: (tag) => new AtrapaElementu(tag),
  /** @param {string} _ns @param {string} tag */
  createElementNS: (_ns, tag) => new AtrapaElementu(tag),
  /** @param {string} tresc */
  createTextNode: (tresc) => ({ tekst: tresc }),
}

/** @param {unknown} wezel @returns {string} */
function tekst(wezel) {
  if (wezel instanceof AtrapaElementu) return wezel.dzieci.map(tekst).join('')
  if (typeof wezel === 'object' && wezel !== null && 'tekst' in wezel) return String(wezel.tekst)
  return ''
}

/** @param {unknown} wezel @param {(element: AtrapaElementu) => boolean} warunek @returns {AtrapaElementu[]} */
function znajdz(wezel, warunek) {
  if (!(wezel instanceof AtrapaElementu)) return []
  return [...(warunek(wezel) ? [wezel] : []), ...wezel.dzieci.flatMap((dziecko) => znajdz(dziecko, warunek))]
}

/** @param {unknown} element @returns {AtrapaElementu} */
function jakoAtrapa(element) {
  assert.ok(element instanceof AtrapaElementu)
  return element
}

/** @param {Partial<{ tryb: string, od: number, do: number }>} [zmiany] @returns {StanWyniku} */
function stanWyniku(zmiany = {}) {
  const wynik = { tryb: 'widelki', od: 250, do: 300, mediana: 250, rynek: { od: 120, do: 450 },
    zostaje: { od: 100, do: 130, naGodzine: { od: 41, do: 51 } }, tekst: TEKST_KLIENTA, ...zmiany }
  return /** @type {StanWyniku} */ (/** @type {unknown} */ ({ stan: 'wynik', wynik, wojewodztwo: { id: 'mazowieckie', nazwa: 'mazowieckie' } }))
}

const ZWINIETE = Object.freeze({ czyOtwarte: false, naPrzelacz: () => {} })

/** @param {StanWyniku} stan @param {{ czyOtwarte?: boolean, naPrzelacz?: (czyOtwarte: boolean) => void }} [wiecej] */
function karta(stan, { czyOtwarte = false, naPrzelacz = () => {} } = {}) {
  return kartaWyniku({ stan, czySkopiowano: false, wiecej: { czyOtwarte, naPrzelacz }, naKopiuj: () => {}, naDokladna: () => {} })
}

describe('karta wyniku szybkiej wyceny', () => {
  /** @type {PropertyDescriptor | undefined} */
  let poprzedni

  beforeEach(() => {
    poprzedni = Object.getOwnPropertyDescriptor(globalThis, 'document')
    Object.defineProperty(globalThis, 'document', { value: atrapaDokumentu, configurable: true, writable: true })
  })

  afterEach(() => {
    if (poprzedni) Object.defineProperty(globalThis, 'document', poprzedni)
    else Reflect.deleteProperty(globalThis, 'document')
  })

  it('kwota i „Zostaje” są na wierzchu, a mediana, rynek i tekst dla klienta dopiero pod „Więcej”', () => {
    const wynik = jakoAtrapa(karta(stanWyniku()).element)

    const [szczegoly] = znajdz(wynik, (e) => e.tag === 'details')
    assert.ok(szczegoly)
    assert.equal(szczegoly.open, false)
    assert.equal(tekst(szczegoly), `WięcejMediana w mazowieckim: 250${NBSP}złRynek: 120–450${NBSP}zł${TEKST_KLIENTA}`)
    const poza = wynik.dzieci.filter((dziecko) => dziecko !== szczegoly).map(tekst)
    assert.deepEqual(poza.slice(0, 3), ['Widełki dla klienta', `250–300${NBSP}zł`, 'Zostaje ok. 41–51 zł/h'])
  })

  it('główna akcja „Dokładna wycena” stoi przed „Kopiuj tekst”', () => {
    const przyciski = znajdz(karta(stanWyniku()).element, (e) => e.tag === 'button')

    assert.deepEqual(przyciski.map(tekst), ['Dokładna wycena', 'Kopiuj tekst'])
    assert.deepEqual(przyciski.map((p) => p.dataset.akcja), ['dokladna', 'kopiuj'])
  })

  it('tekst do kopiowania przez zaznaczenie leży poza „Więcej”, bo zwinięty <details> nie jest rysowany', () => {
    const { element, cytat, zapasowy } = karta(stanWyniku())

    const [szczegoly] = znajdz(element, (e) => e.tag === 'details')
    assert.equal(tekst(zapasowy), TEKST_KLIENTA)
    assert.equal(tekst(cytat), TEKST_KLIENTA)
    assert.deepEqual(znajdz(szczegoly, (e) => e === /** @type {unknown} */ (zapasowy)), [])
    assert.equal(znajdz(szczegoly, (e) => e === /** @type {unknown} */ (cytat)).length, 1)
    assert.equal(jakoAtrapa(zapasowy).atrybuty.get('aria-hidden'), 'true')
  })

  it('stan „Więcej” przeżywa przerysowanie: karta otwiera się wg ekranu i zgłasza każde przełączenie', () => {
    const naPrzelacz = mock.fn()

    const [szczegoly] = znajdz(karta(stanWyniku(), { czyOtwarte: true, naPrzelacz }).element, (e) => e.tag === 'details')
    assert.ok(szczegoly)
    assert.equal(szczegoly.open, true)
    szczegoly.open = false
    szczegoly.obslugi.get('toggle')?.()

    assert.deepEqual(naPrzelacz.mock.calls.map((c) => c.arguments), [[false]])
  })

  it('każdy przycisk woła swoją obsługę', () => {
    const naKopiuj = mock.fn()
    const naDokladna = mock.fn()
    const { element } = kartaWyniku({ stan: stanWyniku(), czySkopiowano: false, wiecej: ZWINIETE, naKopiuj, naDokladna })
    const [dokladna] = znajdz(element, (e) => e.dataset.akcja === 'dokladna')

    dokladna?.obslugi.get('click')?.()

    assert.deepEqual([naDokladna.mock.callCount(), naKopiuj.mock.callCount()], [1, 0])
    const [kopiuj] = znajdz(element, (e) => e.dataset.akcja === 'kopiuj')
    kopiuj?.obslugi.get('click')?.()
    assert.deepEqual([naDokladna.mock.callCount(), naKopiuj.mock.callCount()], [1, 1])
  })

  it('po skopiowaniu przycisk ma tekst „Skopiowano”', () => {
    const { element } = kartaWyniku({ stan: stanWyniku(), czySkopiowano: true, wiecej: ZWINIETE, naKopiuj: () => {}, naDokladna: () => {} })

    assert.deepEqual(znajdz(element, (e) => e.tag === 'button').map(tekst), ['Dokładna wycena', 'Skopiowano'])
  })

  it('błąd metrażu: tekst o metrażu zamiast kwoty i wyłączone przyciski', () => {
    const { element, cytat, zapasowy } = karta(/** @type {StanWyniku} */ (/** @type {unknown} */ ({ stan: 'blad', kod: 'metraz' })))

    assert.deepEqual([cytat, zapasowy], [null, null])
    assert.equal(tekst(jakoAtrapa(element).dzieci[0]), 'Za mały metraż na kuchnię, przedpokój i łazienki. Zwiększ metraż albo zmniejsz liczbę łazienek.')
    assert.deepEqual(znajdz(element, (e) => e.tag === 'button').map((p) => p.disabled), [true, true])
  })

  it('błąd liczenia: tekst o danych zamiast kwoty', () => {
    const { element } = karta(/** @type {StanWyniku} */ (/** @type {unknown} */ ({ stan: 'blad', kod: 'liczenie', blad: new Error('x') })))

    assert.equal(tekst(jakoAtrapa(element).dzieci[0]), 'Nie udało się policzyć ceny dla tych danych. Wybierz usługę jeszcze raz albo zmień metraż.')
  })

  it('oględziny: bez etykiety widełek, z zaleceniem oględzin na wierzchu', () => {
    const wynik = jakoAtrapa(karta(stanWyniku({ tryb: 'od', od: 960, do: 960 })).element)

    assert.deepEqual(wynik.dzieci.slice(0, 2).map(tekst), [`Orientacyjnie od 960${NBSP}zł`,
      'Ta usługa wymaga oględzin. Poproś o zdjęcia albo umów się na obejrzenie przed podaniem ceny.'])
  })

  it('pusty zakres: tekst zamiast kwoty, bez „Więcej” i z wyłączonymi przyciskami', () => {
    const { element, cytat, zapasowy } = karta({ stan: 'pusty' })

    assert.equal(cytat, null)
    assert.equal(zapasowy, null)
    assert.deepEqual(znajdz(element, (e) => e.tag === 'details'), [])
    assert.deepEqual(znajdz(element, (e) => e.tag === 'button').map((p) => p.disabled), [true, true])
    assert.equal(tekst(jakoAtrapa(element).dzieci[0]), 'Wpisz liczbę pozycji, żeby zobaczyć widełki.')
  })
})

describe('kopiowanie tekstu dla klienta', () => {
  /** @type {PropertyDescriptor | undefined} */
  let poprzedniDokument
  /** @type {PropertyDescriptor | undefined} */
  let poprzednieZaznaczenie
  /** @type {ReturnType<typeof mock.fn>} */
  let selectAllChildren
  const WYCENA = Object.freeze({ id: 'w1' })

  beforeEach(() => {
    poprzedniDokument = Object.getOwnPropertyDescriptor(globalThis, 'document')
    poprzednieZaznaczenie = Object.getOwnPropertyDescriptor(globalThis, 'getSelection')
    selectAllChildren = mock.fn()
    Object.defineProperty(globalThis, 'document', { value: atrapaDokumentu, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'getSelection', { value: () => ({ selectAllChildren }), configurable: true, writable: true })
  })

  afterEach(() => {
    if (poprzedniDokument) Object.defineProperty(globalThis, 'document', poprzedniDokument)
    else Reflect.deleteProperty(globalThis, 'document')
    if (poprzednieZaznaczenie) Object.defineProperty(globalThis, 'getSelection', poprzednieZaznaczenie)
    else Reflect.deleteProperty(globalThis, 'getSelection')
  })

  /**
   * Ekran jak w szybka.js: `naWynik` rysuje karte od nowa, wiec po nim `tekstKlienta` daje nowy cytat.
   * @param {boolean} czyWSchowku wynik schowka @param {{ czyAktywny?: boolean }} [opcje]
   */
  function ekran(czyWSchowku, { czyAktywny = true } = {}) {
    let tekstKlienta = karta(stanWyniku())
    const pierwotny = tekstKlienta
    const kopiuj = mock.fn(async () => czyWSchowku)
    const naWyslanie = mock.fn()
    const naRozwin = mock.fn()
    const naWynik = mock.fn(() => { tekstKlienta = karta(stanWyniku()) })
    const opcje = { tekst: TEKST_KLIENTA, kopiuj, naWyslanie, naRozwin, naWynik, zapisz: () => WYCENA, czyAktywny: () => czyAktywny,
      tekstKlienta: () => tekstKlienta }
    return { opcje, pierwotny, kopiuj, naWyslanie, naRozwin, naWynik, obecny: () => tekstKlienta }
  }

  it('kopiuje z elementu zapasowego, a nie z cytatu w zwiniętym „Więcej”', async () => {
    const { opcje, pierwotny, kopiuj } = ekran(true)

    await kopiujTekstKlienta(opcje)

    assert.equal(kopiuj.mock.callCount(), 1)
    const [tekstKopii, element] = kopiuj.mock.calls[0]?.arguments ?? []
    assert.equal(tekstKopii, TEKST_KLIENTA)
    assert.equal(element, pierwotny.zapasowy)
    assert.notEqual(element, pierwotny.cytat)
  })

  it('tekst w schowku: wycena idzie do oznaczenia jako wysłana, „Więcej” zostaje i nic nie jest zaznaczane', async () => {
    const { opcje, naWyslanie, naRozwin, naWynik } = ekran(true)

    await kopiujTekstKlienta(opcje)

    assert.deepEqual(naWyslanie.mock.calls.map((c) => c.arguments), [[WYCENA]])
    assert.equal(naRozwin.mock.callCount(), 0)
    assert.deepEqual(naWynik.mock.calls.map((c) => c.arguments), [[true]])
    assert.equal(selectAllChildren.mock.callCount(), 0)
  })

  it('odmowa schowka: „Więcej” się rozwija, wycena nie jest wysłana, a zaznaczony jest nowy cytat', async () => {
    const { opcje, pierwotny, naWyslanie, naRozwin, naWynik, obecny } = ekran(false)

    await kopiujTekstKlienta(opcje)

    assert.equal(naRozwin.mock.callCount(), 1)
    assert.equal(naWyslanie.mock.callCount(), 0)
    assert.deepEqual(naWynik.mock.calls.map((c) => c.arguments), [[false]])
    assert.equal(selectAllChildren.mock.callCount(), 1)
    const [zaznaczony] = selectAllChildren.mock.calls[0]?.arguments ?? []
    assert.equal(zaznaczony, obecny().cytat)
    assert.notEqual(zaznaczony, pierwotny.cytat)
  })

  it('„Więcej” rozwija się przed narysowaniem karty, żeby karta wyszła już rozwinięta', async () => {
    const kolejnosc = /** @type {string[]} */ ([])
    const { opcje } = ekran(false)

    await kopiujTekstKlienta({ ...opcje, naRozwin: () => kolejnosc.push('rozwin'), naWynik: () => { kolejnosc.push('rysuj') } })

    assert.deepEqual(kolejnosc, ['rozwin', 'rysuj'])
  })

  it('ekran zamknięty w trakcie kopiowania: wycena jest wysłana, ale niczego nie rysuje', async () => {
    const { opcje, naWyslanie, naWynik } = ekran(true, { czyAktywny: false })

    await kopiujTekstKlienta(opcje)

    assert.equal(naWyslanie.mock.callCount(), 1)
    assert.equal(naWynik.mock.callCount(), 0)
  })

  it('bez tekstu na karcie nie ma kopiowania i wycena nie jest wysłana', async () => {
    const { opcje, kopiuj, naWyslanie } = ekran(true)

    await kopiujTekstKlienta({ ...opcje, tekstKlienta: () => ({ cytat: null, zapasowy: null }) })

    assert.equal(kopiuj.mock.callCount(), 0)
    assert.equal(naWyslanie.mock.callCount(), 0)
  })

  it('błąd zapisu leci do ekranu, zanim cokolwiek trafi do schowka', async () => {
    const { opcje, kopiuj } = ekran(true)
    const blad = new RangeError('zapis')

    await assert.rejects(kopiujTekstKlienta({ ...opcje, zapisz: () => { throw blad } }), blad)

    assert.equal(kopiuj.mock.callCount(), 0)
  })
})
