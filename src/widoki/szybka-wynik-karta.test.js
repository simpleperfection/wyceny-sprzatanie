import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { kartaWyniku } from './szybka-wynik.js'

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
