import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { kartaProduktu, podzielNazweKategorii } from './karta-produktu.js'

/** @typedef {import('../silnik/chemia.js').Chemia} Chemia */
/** @typedef {import('../silnik/chemia.js').Produkt} Produkt */

/** Atrapa elementu DOM (Node nie ma DOM): tag, atrybuty i dzieci; wezly tekstowe to `{ tekst }`. */
class AtrapaElementu {
  /** @param {string} tag */
  constructor(tag) {
    this.tag = tag
    /** @type {Map<string, string>} */
    this.atrybuty = new Map()
    /** @type {unknown[]} */
    this.dzieci = []
  }

  /** @param {string} nazwa @param {string} wartosc */
  setAttribute(nazwa, wartosc) { this.atrybuty.set(nazwa, wartosc) }

  /** @param {unknown} dziecko */
  appendChild(dziecko) { this.dzieci.push(dziecko) }

  addEventListener() {}
}

const atrapaDokumentu = {
  /** @param {string} tag */
  createElement: (tag) => new AtrapaElementu(tag),
  /** @param {string} _ns @param {string} tag */
  createElementNS: (_ns, tag) => new AtrapaElementu(tag),
  /** @param {string} tresc */
  createTextNode: (tresc) => ({ tekst: tresc }),
}

/** @param {unknown} wezel @returns {wezel is AtrapaElementu} */
const czyElement = (wezel) => wezel instanceof AtrapaElementu

/** @param {unknown} wezel @returns {string} */
function tekst(wezel) {
  if (czyElement(wezel)) return wezel.dzieci.map(tekst).join('')
  if (typeof wezel === 'object' && wezel !== null && 'tekst' in wezel) return String(wezel.tekst)
  return ''
}

/** @param {unknown} wezel @param {(e: AtrapaElementu) => boolean} warunek @returns {AtrapaElementu[]} */
function znajdz(wezel, warunek) {
  if (!czyElement(wezel)) return []
  return [...(warunek(wezel) ? [wezel] : []), ...wezel.dzieci.flatMap((dziecko) => znajdz(dziecko, warunek))]
}

/** @param {unknown} wezel @param {string} klasa @returns {AtrapaElementu} jedyny element z klasa */
function poKlasie(wezel, klasa) {
  const [element, ...reszta] = znajdz(wezel, (e) => (e.atrybuty.get('class') ?? '').split(' ').includes(klasa))
  assert.ok(element, `brak elementu .${klasa}`)
  assert.equal(reszta.length, 0)
  return element
}

const NBSP = ' '
/** @type {Chemia} */
const CHEMIA = { meta: { wersja: 'test' }, dostawcy: [{ id: 'tenzi', nazwa: 'Tenzi' }], kategorie: [], bez_kategorii: [], produkty: [] }
/** @type {Produkt} */
const OFFICE_CLEAN = {
  id: 'tenzi.office_clean', dostawca: 'tenzi', nazwa: 'OFFICE CLEAN', kategorie: ['uniwersalny'],
  przeznaczenie: 'Meble biurowe i inne powierzchnie ponadpodłogowe; nie zostawia smug.', ph: [7, 7], gotowy: true, stezenia: [],
  opakowanie: { ilosc: 5, jednostka: 'l' }, cena_brutto: 82.87,
  sds: { url: 'https://tenzi.pl/index.php?controller=attachment&id_attachment=1239', data: '2023-03-14' },
}

describe('podzielNazweKategorii', () => {
  it('oddziela dopisek w nawiasie od nazwy kategorii', () => {
    assert.deepEqual(podzielNazweKategorii('Środek uniwersalny (kurz, sierść, brud bieżący)'),
      { nazwa: 'Środek uniwersalny', dopisek: 'kurz, sierść, brud bieżący' })
  })

  it('nazwę bez dopisku, z samym nawiasem albo z pustym nawiasem zostawia całą', () => {
    assert.deepEqual(podzielNazweKategorii('Płyn do szyb'), { nazwa: 'Płyn do szyb', dopisek: null })
    assert.deepEqual(podzielNazweKategorii('(pleśń)'), { nazwa: '(pleśń)', dopisek: null })
    assert.deepEqual(podzielNazweKategorii('Impregnat ( )'), { nazwa: 'Impregnat ( )', dopisek: null })
  })
})

describe('kartaProduktu', () => {
  /** @type {unknown} */
  let poprzedni
  beforeEach(() => {
    poprzedni = Reflect.get(globalThis, 'document')
    Reflect.set(globalThis, 'document', atrapaDokumentu)
  })
  afterEach(() => { Reflect.set(globalThis, 'document', poprzedni) })

  it('nazwa w nagłówku podanego poziomu, w drugiej linii pH, dostawca i cena opakowania', () => {
    const wiersz = kartaProduktu(OFFICE_CLEAN, CHEMIA, 'h2')

    assert.equal(tekst(poKlasie(wiersz, 'produkt-chemii__nazwa')), 'OFFICE CLEAN')
    assert.equal(poKlasie(wiersz, 'produkt-chemii__nazwa').tag, 'h2')
    assert.equal(tekst(poKlasie(wiersz, 'produkt-chemii__opis')), `pH 7 · Tenzi · 82,87${NBSP}zł za 5${NBSP}l`)
  })

  it('przeznaczenie, stężenie i kartę charakterystyki chowa pod zwiniętym „Więcej”', () => {
    const wiersz = kartaProduktu(OFFICE_CLEAN, CHEMIA)

    const [szczegoly, ...inne] = znajdz(wiersz, (e) => e.tag === 'details')
    assert.ok(szczegoly)
    assert.equal(inne.length, 0)
    assert.equal(szczegoly.atrybuty.has('open'), false)
    assert.equal(tekst(znajdz(szczegoly, (e) => e.tag === 'summary')[0]), 'Więcej')
    const tresc = tekst(poKlasie(szczegoly, 'wiecej__tresc'))
    assert.ok(tresc.includes('Meble biurowe i inne powierzchnie ponadpodłogowe; nie zostawia smug.'))
    assert.ok(tresc.includes('Gotowy do użycia'))
    assert.ok(tresc.includes('Karta z 14 marca 2023'))
    assert.ok(czyElement(wiersz))
    const pozaWiecej = wiersz.dzieci.filter((d) => d !== szczegoly).map(tekst).join(' ')
    assert.equal(pozaWiecej, `OFFICE CLEAN pH 7 · Tenzi · 82,87${NBSP}zł za 5${NBSP}l`)
  })

  it('kartę charakterystyki daje jako przycisk drugi otwierany w nowej karcie, z nazwą dostępną od widocznego tekstu', () => {
    const link = poKlasie(kartaProduktu(OFFICE_CLEAN, CHEMIA), 'produkt-chemii__karta')

    assert.equal(link.tag, 'a')
    assert.equal(link.atrybuty.get('class'), 'przycisk przycisk--drugi produkt-chemii__karta')
    assert.equal(link.atrybuty.get('href'), 'https://tenzi.pl/index.php?controller=attachment&id_attachment=1239')
    assert.equal(link.atrybuty.get('target'), '_blank')
    assert.equal(link.atrybuty.get('rel'), 'noopener noreferrer')
    assert.equal(tekst(link), 'Karta charakterystyki')
    assert.equal(link.atrybuty.get('aria-label'),
      'Karta charakterystyki, OFFICE CLEAN, karta z 14 marca 2023, otwiera się w nowej karcie')
  })

  it('adres karty bez https daje informację o braku linku zamiast przycisku, a koncentrat podaje stężenie', () => {
    /** @type {Produkt} */
    const koncentrat = { ...OFFICE_CLEAN, gotowy: false, stezenia: [{ zastosowanie: 'mycie ręczne', proc: [0.25, 0.5] }],
      sds: { url: 'http://tenzi.pl/karta.pdf', data: '2023-03-14' } }

    const wiersz = kartaProduktu(koncentrat, CHEMIA)

    assert.equal(znajdz(wiersz, (e) => e.tag === 'a').length, 0)
    assert.equal(tekst(poKlasie(wiersz, 'produkt-chemii__dopisek')), 'Brak linku do karty charakterystyki')
    assert.ok(tekst(poKlasie(wiersz, 'wiecej__tresc')).includes('Stężenie: 0,25–0,5% mycie ręczne'))
  })
})
