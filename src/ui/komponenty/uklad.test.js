import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { naglowek, podpowiedz, przelaczniki, trzymajRozwiniecie, wiecej } from './uklad.js'

/** Atrapa API przegladarki (Node nie ma DOM): element z atrybutami, dziecmi, zdarzeniami i `showModal`. */
class AtrapaElementu {
  /** @param {string} tag */
  constructor(tag) {
    this.tag = tag
    /** @type {Map<string, string>} */
    this.atrybuty = new Map()
    /** @type {unknown[]} */
    this.dzieci = []
    /** @type {Map<string, ((zdarzenie: unknown) => void)[]>} */
    this.obslugi = new Map()
    this.czyOtwarty = false
  }

  /** @param {string} nazwa @param {string} wartosc */
  setAttribute(nazwa, wartosc) { this.atrybuty.set(nazwa, wartosc) }

  /** @param {string} nazwa @returns {string | null} */
  getAttribute(nazwa) { return this.atrybuty.get(nazwa) ?? null }

  /** @param {unknown} dziecko */
  appendChild(dziecko) { this.dzieci.push(dziecko) }

  /** @param {...unknown} dzieci */
  append(...dzieci) { this.dzieci.push(...dzieci) }

  /** @param {string} zdarzenie @param {(zdarzenie: unknown) => void} obsluga */
  addEventListener(zdarzenie, obsluga) { this.obslugi.set(zdarzenie, [...(this.obslugi.get(zdarzenie) ?? []), obsluga]) }

  showModal() { this.czyOtwarty = true }

  kliknij() {
    for (const obsluga of this.obslugi.get('click') ?? []) obsluga({ currentTarget: this, target: this })
  }
}

/** @param {unknown} wezel @returns {wezel is AtrapaElementu} */
const czyElement = (wezel) => wezel instanceof AtrapaElementu

/** @param {unknown} wezel @returns {string} tekst wezla i potomkow (wezly tekstowe atrapy to `{ tekst }`) */
function tekst(wezel) {
  if (czyElement(wezel)) return wezel.dzieci.map(tekst).join('')
  if (typeof wezel === 'object' && wezel !== null && 'tekst' in wezel) return String(wezel.tekst)
  return ''
}

/** @param {AtrapaElementu} element @param {(e: AtrapaElementu) => boolean} warunek @returns {AtrapaElementu[]} */
function znajdz(element, warunek) {
  const dzieci = element.dzieci.filter(czyElement)
  return [...(warunek(element) ? [element] : []), ...dzieci.flatMap((dziecko) => znajdz(dziecko, warunek))]
}

/** @param {string} tag */
const poTagu = (tag) => (/** @type {AtrapaElementu} */ e) => e.tag === tag

/** @param {unknown} element @returns {AtrapaElementu} */
function jakoAtrapa(element) {
  assert.ok(czyElement(element))
  return element
}

const cialo = new AtrapaElementu('body')
const atrapaDokumentu = {
  body: cialo,
  /** @param {string} tag */
  createElement: (tag) => new AtrapaElementu(tag),
  /** @param {string} _ns @param {string} tag */
  createElementNS: (_ns, tag) => new AtrapaElementu(tag),
  /** @param {string} tresc */
  createTextNode: (tresc) => ({ tekst: tresc }),
}

describe('komponenty układu modułu', () => {
  /** @type {unknown} */
  let poprzedni
  beforeEach(() => {
    poprzedni = Reflect.get(globalThis, 'document')
    Reflect.set(globalThis, 'document', atrapaDokumentu)
    cialo.dzieci = []
  })
  afterEach(() => { Reflect.set(globalThis, 'document', poprzedni) })

  describe('naglowek', () => {
    it('z wsteczTekst „Start” daje link z widocznym tekstem „Start” i ikoną strzałki, bez aria-label', () => {
      const element = jakoAtrapa(naglowek({ tytul: 'Zlecenia', wstecz: '#/start', wsteczTekst: 'Start' }))

      const [link] = znajdz(element, poTagu('a'))
      assert.equal(link.getAttribute('href'), '#/start')
      assert.equal(link.getAttribute('aria-label'), null)
      assert.equal(tekst(link), 'Start')
      assert.deepEqual(znajdz(link, poTagu('svg')).map((ikona) => ikona.getAttribute('class')), ['ikona'])
      assert.equal(tekst(znajdz(element, poTagu('h1'))[0]), 'Zlecenia')
    })

    it('bez wsteczTekst daje sam link-ikonę z aria-label „Wstecz” (dotychczasowe wywołania)', () => {
      const element = jakoAtrapa(naglowek({ tytul: 'Kreator', wstecz: '#/wyceny' }))

      const [link] = znajdz(element, poTagu('a'))
      assert.equal(link.getAttribute('aria-label'), 'Wstecz')
      assert.equal(link.getAttribute('href'), '#/wyceny')
      assert.equal(tekst(link), '')
      assert.equal(znajdz(link, poTagu('svg')).length, 1)
    })

    it('krok stoi obok powrotu, a pasek między górą a tytułem', () => {
      const pasek = new AtrapaElementu('ol')

      const element = jakoAtrapa(naglowek({ tytul: 'Zakres', wstecz: '#/kreator/usluga', wsteczTekst: 'Usługa', krok: 'Krok 2 z 5',
        pasek: /** @type {Node} */ (/** @type {unknown} */ (pasek)) }))

      const [gora, srodek, tytul] = element.dzieci
      assert.equal(tekst(gora), 'UsługaKrok 2 z 5')
      assert.equal(srodek, pasek)
      assert.equal(jakoAtrapa(tytul).tag, 'h1')
    })

    it('bez kroku i paska nagłówek ma samą górę i tytuł', () => {
      const element = jakoAtrapa(naglowek({ tytul: 'Zlecenia', wstecz: '#/start', wsteczTekst: 'Start' }))

      assert.deepEqual(element.dzieci.map((d) => jakoAtrapa(d).tag), ['div', 'h1'])
      assert.equal(tekst(element.dzieci[0]), 'Start')
    })

    it('bez wstecz nie ma linku powrotu, a podtytuł jest pod tytułem', () => {
      const element = jakoAtrapa(naglowek({ tytul: 'Start', podtytul: 'Firma Lis' }))

      assert.equal(znajdz(element, poTagu('a')).length, 0)
      assert.deepEqual(element.dzieci.filter(czyElement).map((e) => [e.tag, tekst(e)]), [['h1', 'Start'], ['p', 'Firma Lis']])
    })
  })

  describe('przelaczniki', () => {
    const POZYCJE = [
      { tekst: 'Dzień', adres: '#/zlecenia/dzien', czyAktywna: false },
      { tekst: 'Tydzień', adres: '#/zlecenia/tydzien', czyAktywna: true },
      { tekst: 'Miesiąc', adres: '#/zlecenia/miesiac', czyAktywna: false },
    ]

    it('ustawia aria-current="page" tylko na aktywnej pozycji', () => {
      const element = jakoAtrapa(przelaczniki(POZYCJE, 'Widok kalendarza'))

      const linki = znajdz(element, poTagu('a'))
      assert.equal(element.tag, 'nav')
      assert.equal(element.getAttribute('aria-label'), 'Widok kalendarza')
      assert.deepEqual(linki.map((l) => [tekst(l), l.getAttribute('href'), l.getAttribute('aria-current')]), [
        ['Dzień', '#/zlecenia/dzien', null],
        ['Tydzień', '#/zlecenia/tydzien', 'page'],
        ['Miesiąc', '#/zlecenia/miesiac', null],
      ])
    })

    it('odrzuca listę bez pozycji i z więcej niż jedną aktywną', () => {
      assert.throws(() => przelaczniki([]), /Przełączniki bez pozycji/)
      assert.throws(() => przelaczniki(POZYCJE.map((p) => ({ ...p, czyAktywna: true }))), /Aktywne przełączniki: 3/)
    })
  })

  describe('wiecej', () => {
    it('daje details z summary „Więcej” i treścią w środku', () => {
      const element = jakoAtrapa(wiecej({}, 'Meble biurowe; nie zostawia smug.'))

      const [podsumowanie, tresc] = element.dzieci.filter(czyElement)
      assert.equal(element.tag, 'details')
      assert.equal(podsumowanie.tag, 'summary')
      assert.equal(tekst(podsumowanie), 'Więcej')
      assert.equal(tekst(tresc), 'Meble biurowe; nie zostawia smug.')
    })

    it('stan z ekranu ustawia rozwinięcie i wraca przy każdym przełączeniu', () => {
      const naPrzelacz = mock.fn()
      const element = jakoAtrapa(wiecej({ stan: { czyOtwarte: true, naPrzelacz } }, 'woda'))

      assert.equal(Reflect.get(element, 'open'), true)
      Reflect.set(element, 'open', false)
      for (const obsluga of element.obslugi.get('toggle') ?? []) obsluga({})

      assert.deepEqual(naPrzelacz.mock.calls.map((c) => c.arguments), [[false]])
    })

    it('bez stanu nie podpina przełączania', () => {
      assert.equal(jakoAtrapa(wiecej({}, 'woda')).obslugi.has('toggle'), false)
    })

    it('trzymajRozwiniecie działa na dowolnym <details> i oddaje ten sam element', () => {
      const szczegoly = new AtrapaElementu('details')
      const wynik = trzymajRozwiniecie(/** @type {HTMLDetailsElement} */ (/** @type {unknown} */ (szczegoly)), { czyOtwarte: true, naPrzelacz: () => {} })

      assert.equal(wynik, szczegoly)
      assert.equal(Reflect.get(szczegoly, 'open'), true)
    })

    it('przyjmuje własną etykietę i odrzuca brak treści', () => {
      const element = jakoAtrapa(wiecej({ etykieta: 'Skład' }, 'woda'))

      assert.equal(tekst(znajdz(element, poTagu('summary'))[0]), 'Skład')
      assert.throws(() => wiecej({}), /„Więcej” bez treści/)
    })
  })

  describe('podpowiedz', () => {
    it('ma aria-label „Wyjaśnienie: Mediana rynku”, a klik otwiera arkusz z tytułem i tekstem', () => {
      const przycisk = jakoAtrapa(podpowiedz({ tytul: 'Mediana rynku', tresc: 'Środkowa cena z cenników firm.' }))

      assert.equal(przycisk.tag, 'button')
      assert.equal(przycisk.getAttribute('aria-label'), 'Wyjaśnienie: Mediana rynku')
      assert.equal(przycisk.getAttribute('aria-haspopup'), 'dialog')
      przycisk.kliknij()

      const [arkusz] = cialo.dzieci.filter(czyElement)
      assert.equal(arkusz.tag, 'dialog')
      assert.equal(arkusz.czyOtwarty, true)
      assert.equal(tekst(znajdz(arkusz, poTagu('h2'))[0]), 'Mediana rynku')
      assert.deepEqual(znajdz(arkusz, poTagu('p')).map(tekst), ['Środkowa cena z cenników firm.'])
    })

    it('odrzuca pusty tytuł, bo etykieta czytnika byłaby bez nazwy', () => {
      assert.throws(() => podpowiedz({ tytul: ' ', tresc: 'x' }), /Podpowiedź bez tytułu/)
    })
  })
})
