import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { AtrapaElementu, pierwszy, tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { utworzMagazyn } from '../dane/magazyn.js'
import { adresKroku, naglowekKroku, pokazKomunikat, POWROT_DO_WYCEN, wycenaKroku } from './kreator-wspolne.js'

/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */

/** @param {string | null} numer @returns {Wycena} */
const wycena = (numer) => /** @type {Wycena} */ (/** @type {unknown} */ ({ id: 'w1', numer }))

/** @param {unknown} element @param {string} klasa @returns {AtrapaElementu | undefined} */
const poKlasie = (element, klasa) => znajdz(element, (e) => e.atrybuty.get('class') === klasa)[0]

/** @param {unknown} element @returns {{ adres: string | undefined, napis: string }} adres i tekst powrotu z naglowka */
function powrot(element) {
  const link = pierwszy(element, 'a')
  return { adres: link?.atrybuty.get('href'), napis: tekst(link) }
}

describe('POWROT_DO_WYCEN', () => {
  it('prowadzi do modułu Wycena z tekstem z planu', () => {
    assert.deepEqual(POWROT_DO_WYCEN, { wstecz: '#/wyceny', wsteczTekst: 'Wycena' })
  })
})

describe('naglowekKroku', () => {
  uzyjAtrapyDom()

  it('pierwszy krok nowej wyceny wraca do modułu Wycena, a nie na Start', () => {
    assert.deepEqual(powrot(naglowekKroku('usluga', null)), { adres: '#/wyceny', napis: 'Wycena' })
  })

  it('pierwszy krok wyceny z numerem wraca do zapisanej wyceny', () => {
    assert.deepEqual(powrot(naglowekKroku('usluga', wycena('1/10/2026'))), { adres: '#/wycena/w1', napis: 'Wycena' })
  })

  it('pierwszy krok szkicu bez numeru wraca do modułu Wycena', () => {
    assert.deepEqual(powrot(naglowekKroku('usluga', wycena(null))), { adres: '#/wyceny', napis: 'Wycena' })
  })

  it('kolejny krok ma adres i nazwę poprzedniego kroku', () => {
    assert.deepEqual(powrot(naglowekKroku('dodatki', wycena(null))), { adres: adresKroku('zakres', 'w1'), napis: 'Zakres' })
  })

  it('krok Cena ma tytuł z nazwy kroku, „Krok 5 z 5” obok powrotu i pasek przed tytułem, a nie poza nagłówkiem', () => {
    const element = naglowekKroku('cena', wycena(null))

    assert.equal(tekst(pierwszy(element, 'h1')), 'Cena')
    assert.equal(tekst(poKlasie(element, 'naglowek__gora')), 'ChemiaKrok 5 z 5')
    assert.deepEqual(element.dzieci.map((d) => (d instanceof AtrapaElementu ? d.tag : null)), ['div', 'ol', 'h1'])
    assert.equal(pierwszy(element, 'ol')?.atrybuty.get('aria-label'), 'Krok 5 z 5')
  })

  it('pasek zaznacza bieżący krok, a wycena z numerem ma podtytuł', () => {
    const element = naglowekKroku('zakres', wycena('1/10/2026'))

    const biezace = znajdz(element, (e) => e.atrybuty.get('aria-current') === 'step')
    assert.deepEqual(biezace.map(tekst), ['Zakres'])
    assert.equal(tekst(poKlasie(element, 'naglowek__podtytul')), 'Wycena 1/10/2026')
    assert.equal(poKlasie(naglowekKroku('zakres', wycena(null)), 'naglowek__podtytul'), undefined)
  })
})

describe('komunikat zamiast kroku', () => {
  uzyjAtrapyDom()

  it('pokazKomunikat: nagłówek wraca do modułu Wycena, pod nim tekst i jedna akcja', () => {
    const kontener = new AtrapaElementu('main')

    pokazKomunikat(/** @type {HTMLElement} */ (/** @type {unknown} */ (kontener)), 'Ta usługa ma inny krok.', { tekst: 'Pokaż wycenę', adres: '#/wycena/w1' })

    const [gora, tresc] = kontener.dzieci
    assert.deepEqual(powrot(gora), { adres: '#/wyceny', napis: 'Wycena' })
    assert.equal(tekst(pierwszy(gora, 'h1')), 'Nowa wycena')
    assert.match(tekst(tresc), /Ta usługa ma inny krok\./)
    assert.equal(znajdz(tresc, (e) => e.atrybuty.get('href') === '#/wycena/w1').length, 1)
  })

  it('wycenaKroku: brak wyceny rysuje komunikat z „Wróć do wycen” i daje null', () => {
    const kontener = new AtrapaElementu('main')
    const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
    const kontekst = /** @type {import('../ui/router.js').Kontekst} */ (/** @type {unknown} */ ({ magazyn }))

    const wynik = wycenaKroku(/** @type {HTMLElement} */ (/** @type {unknown} */ (kontener)), { wycena: 'nie-ma' }, kontekst)

    assert.equal(wynik, null)
    assert.match(tekst(kontener.dzieci[1]), /Nie ma tej wyceny\. Mogła zostać usunięta\./)
    const [akcja] = znajdz(kontener.dzieci[1], (e) => e.tag === 'a')
    assert.equal(tekst(akcja), 'Wróć do wycen')
    assert.equal(akcja?.atrybuty.get('href'), '#/wyceny')
  })
})
