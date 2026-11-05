import assert from 'node:assert/strict'
import { before, describe, it, mock } from 'node:test'

import { pierwszy, tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { utworzMagazyn } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { ustawCeneReczna } from '../kreator/podsumowanie.js'
import { nowySzkic, zmienWejscie } from '../kreator/stan.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { adresZaplanowania } from '../zlecenia/kalendarz-dane.js'
import { akcjeZapisanej, elementyEkranu, karty, opisAkcji, podtytul, tytulWyceny } from './podsumowanie.js'

/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/podsumowanie.js').AkcjaZOpisem} AkcjaZOpisem */

const NBSP = ' '
const OBSLUGA_AKCJI = Object.freeze({ naStatus: () => {}, naUsun: () => {} })

/** @param {Partial<Wycena>} [zmiany] @returns {Wycena} */
const wycena = (zmiany = {}) => /** @type {Wycena} */ (/** @type {unknown} */ ({
  id: 'w1', numer: '1/10/2026', status: 'do_wyslania', klient: { nazwa: 'Pani Test' }, wejscie: { uslugaId: 'mieszkanie_standard' }, wynik: null, ...zmiany,
}))

describe('opisAkcji', () => {
  /** @param {AkcjaZOpisem} akcja @param {boolean} [czyZamknieta] @returns {{ tekst: string, adres?: string }} */
  function opis(akcja, czyZamknieta = false) {
    const { tekst: napis, adres } = opisAkcji(wycena(), akcja, czyZamknieta, OBSLUGA_AKCJI)
    return { tekst: napis, adres }
  }

  it('„Zaplanuj” i „Zaplanuj kolejne” prowadzą do planowania z tej wyceny', () => {
    assert.deepEqual(opis('zaplanuj'), { tekst: 'Zaplanuj', adres: adresZaplanowania('w1') })
    assert.deepEqual(opis('zaplanuj_kolejne'), { tekst: 'Zaplanuj kolejne', adres: adresZaplanowania('w1') })
  })

  it('oferta: przygotowanie przy otwartej wycenie, podgląd przy wycenie ze zleceniem', () => {
    assert.deepEqual(opis('oferta'), { tekst: 'Przygotuj ofertę', adres: '#/wycena/w1/oferta' })
    assert.deepEqual(opis('oferta', true), { tekst: 'Pokaż ofertę', adres: '#/wycena/w1/oferta' })
  })

  it('„Edytuj” otwiera kreator od kroku usługi', () => {
    assert.deepEqual(opis('edytuj'), { tekst: 'Edytuj', adres: '#/kreator/usluga?wycena=w1' })
  })

  it('decyzje klienta zapisują swój status i nie mają adresu', () => {
    const naStatus = mock.fn()
    const obsluga = { ...OBSLUGA_AKCJI, naStatus }

    const przyjal = opisAkcji(wycena(), 'przyjeta', false, obsluga)
    const zrezygnowal = opisAkcji(wycena(), 'odrzucona', false, obsluga)
    przyjal.naKlik?.()
    zrezygnowal.naKlik?.()

    assert.deepEqual([przyjal.tekst, przyjal.adres], ['Klient przyjął', undefined])
    assert.deepEqual([zrezygnowal.tekst, zrezygnowal.adres], ['Klient zrezygnował', undefined])
    assert.deepEqual(naStatus.mock.calls.map((c) => c.arguments), [['przyjeta'], ['odrzucona']])
  })
})

describe('teksty nagłówka wyceny', () => {
  it('podtytuł: klient i numer, bez klienta sam numer, a szkic „Nowa wycena”', () => {
    assert.equal(podtytul(wycena()), 'Pani Test · nr 1/10/2026')
    assert.equal(podtytul(wycena({ klient: /** @type {Wycena['klient']} */ (/** @type {unknown} */ ({ nazwa: '' })) })), 'nr 1/10/2026')
    assert.equal(podtytul(wycena({ numer: null })), 'Nowa wycena')
  })

  it('tytuł to nazwa usługi, a usługa spoza katalogu daje „Podsumowanie”', () => {
    const kontekst = /** @type {import('../ui/router.js').Kontekst} */ (/** @type {unknown} */ ({
      katalog: { uslugi: [{ id: 'mieszkanie_standard', nazwa: 'Sprzątanie mieszkania' }] },
    }))
    const spozaKatalogu = wycena({ wejscie: /** @type {Wycena['wejscie']} */ (/** @type {unknown} */ ({ uslugaId: 'usunieta' })) })

    assert.equal(tytulWyceny(wycena(), kontekst), 'Sprzątanie mieszkania')
    assert.equal(tytulWyceny(spozaKatalogu, kontekst), 'Podsumowanie')
  })
})

describe('akcje zapisanej wyceny', () => {
  uzyjAtrapyDom()

  /** @param {unknown} element @returns {string[]} */
  const klikalne = (element) => znajdz(element, (e) => e.tag === 'a' || e.tag === 'button').map(tekst)

  it('wycena do wysłania: główny przycisk „Przygotuj ofertę”, decyzje i edycja w wierszach, usunięcie osobno', () => {
    const { akcje, usun } = akcjeZapisanej(wycena(), false, false, OBSLUGA_AKCJI)

    assert.deepEqual(klikalne(akcje), ['Przygotuj ofertę', 'Klient przyjął', 'Klient zrezygnował', 'Edytuj'])
    assert.equal(tekst(usun), 'Usuń wycenę')
  })

  it('przyjęta ze zleceniem pokazuje ofertę tylko do podglądu i nie ma edycji', () => {
    const { akcje } = akcjeZapisanej(wycena({ status: 'przyjeta' }), true, false, OBSLUGA_AKCJI)

    assert.deepEqual(klikalne(akcje), ['Pokaż ofertę', 'Zaplanuj kolejne', 'Klient zrezygnował'])
  })

  it('„Usuń wycenę” oddaje wycenę ekranowi', () => {
    const naUsun = mock.fn()
    const w = wycena()

    const { usun } = akcjeZapisanej(w, false, false, { ...OBSLUGA_AKCJI, naUsun })
    Reflect.get(usun ?? {}, 'obslugi')?.get('click')?.()

    assert.deepEqual(naUsun.mock.calls.map((c) => c.arguments), [[w]])
  })
})

describe('karty i nagłówek ekranu podsumowania', () => {
  uzyjAtrapyDom()
  /** @type {import('../silnik/katalog.js').Katalog} */
  let katalog
  /** @type {import('../dane/ustawienia.js').Domyslne} */
  let domyslne

  before(async () => {
    katalog = await katalogZDysku()
    domyslne = await wczytajDomyslne(czytajJson)
  })

  /** Mieszkanie 50 m² z ceną reczną 300 zł i danymi rynku starszymi od katalogu (baner „Przelicz”). */
  function wycenaZCena() {
    const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
    zapiszUstawienia(magazyn, { wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony' }, domyslne)
    const kontekst = /** @type {import('../ui/router.js').Kontekst} */ (/** @type {unknown} */ ({ katalog, domyslne, magazyn }))
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: ukladMieszkania(50, {}, katalog.uklady) }))
    const w = ustawCeneReczna(kontekst, id, 300)
    const wynik = w.wynik && { ...w.wynik, wersjaDanych: { ...w.wynik.wersjaDanych, rynek: 'starsza' } }
    return { kontekst, w: { ...w, wynik } }
  }

  /** @param {Partial<import('./podsumowanie.js').ObslugaKart>} [zmiany] */
  const obslugaKart = (zmiany = {}) => ({ naPrzelicz: () => {}, naZmien: () => {},
    stanKosztow: () => ({ czyOtwarte: false, naPrzelacz: () => {} }), ...zmiany })

  /** @param {unknown[]} elementy @param {(e: import('../../tests/atrapa-dom.js').AtrapaElementu) => boolean} warunek */
  const wszystkie = (elementy, warunek) => elementy.flatMap((e) => znajdz(e, warunek))

  /** @param {import('../../tests/atrapa-dom.js').AtrapaElementu} e */
  const czyZmien = (e) => e.atrybuty.get('data-akcja') === 'zmien'

  /** @param {import('../../tests/atrapa-dom.js').AtrapaElementu} e */
  const czyPrzelicz = (e) => e.tag === 'button' && tekst(e) === 'Przelicz'

  it('wycena ze zleceniem jest tylko do odczytu: bez „Zmień” i bez „Przelicz”', () => {
    const { w, kontekst } = wycenaZCena()

    const elementy = karty(w, kontekst, 'zapisana', true, obslugaKart())

    assert.deepEqual(wszystkie(elementy, czyZmien), [])
    assert.deepEqual(wszystkie(elementy, czyPrzelicz), [])
    assert.match(elementy.map(tekst).join(''), new RegExp(`300${NBSP}zł`))
  })

  it('wycena do edycji ma „Zmień” z kwotą brutto wyceny i „Przelicz”', () => {
    const { w, kontekst } = wycenaZCena()
    const naZmien = mock.fn()
    const naPrzelicz = mock.fn()

    const elementy = karty(w, kontekst, 'zapisana', false, obslugaKart({ naZmien, naPrzelicz }))
    wszystkie(elementy, czyZmien)[0]?.obslugi.get('click')?.()
    wszystkie(elementy, czyPrzelicz)[0]?.obslugi.get('click')?.()

    assert.deepEqual(naZmien.mock.calls.map((c) => c.arguments), [[300]])
    assert.equal(naPrzelicz.mock.callCount(), 1)
  })

  it('stan rozwinięcia kosztów bierze od ekranu', () => {
    const { w, kontekst } = wycenaZCena()

    const elementy = karty(w, kontekst, 'zapisana', false, obslugaKart({ stanKosztow: () => ({ czyOtwarte: true, naPrzelacz: () => {} }) }))

    assert.deepEqual(wszystkie(elementy, (e) => e.tag === 'details').map((e) => e.open), [true])
  })

  it('krok Cena ma nagłówek kroku z paskiem w środku i tytuł „Cena”', () => {
    const { kontekst } = wycenaZCena()
    const w = wycena({ numer: null })

    const [gora, ...reszta] = elementyEkranu({ w, czyZamknieta: false, czyDoZaplanowania: false, kontekst, tryb: 'kreator', komunikat: null,
      obslugaKart: obslugaKart(), obslugaAkcji: OBSLUGA_AKCJI })

    assert.equal(tekst(pierwszy(gora, 'h1')), 'Cena')
    assert.match(tekst(gora), /Krok 5 z 5/)
    assert.equal(pierwszy(gora, 'a')?.atrybuty.get('href'), '#/kreator/chemia?wycena=w1')
    assert.equal(tekst(pierwszy(gora, 'a')), 'Chemia')
    assert.equal(pierwszy(gora, 'ol')?.atrybuty.get('class'), 'postep')
    assert.deepEqual(wszystkie(reszta, (e) => e.tag === 'ol'), [])
  })

  it('zapisana wycena nie ma paska, tytułem jest usługa, a powrót idzie do modułu Wycena', () => {
    const { kontekst } = wycenaZCena()

    const [gora] = elementyEkranu({ w: wycena(), czyZamknieta: false, czyDoZaplanowania: false, kontekst, tryb: 'zapisana', komunikat: null,
      obslugaKart: obslugaKart(), obslugaAkcji: OBSLUGA_AKCJI })

    assert.equal(tekst(pierwszy(gora, 'h1')), katalog.usluga('mieszkanie_standard').nazwa)
    assert.equal(pierwszy(gora, 'ol'), undefined)
    assert.equal(pierwszy(gora, 'a')?.atrybuty.get('href'), '#/wyceny')
    assert.equal(tekst(pierwszy(gora, 'a')), 'Wycena')
  })
})
