import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { utworzMagazyn } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { BladWyceny, utworzSzkic, wycena } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { odpowiedziUslugi, pytaniaWyceny, zapiszOdpowiedz } from './pytania.js'
import { formularzDomyslny, wejscieZWyceny, zapiszSzybka } from './szybka.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */

/** @type {Katalog} */
let katalog
/** @type {Domyslne} */
let domyslne
/** @type {Pytania} */
let pytania

before(async () => {
  katalog = await katalogZDysku()
  domyslne = await wczytajDomyslne(czytajJson)
  pytania = await czytajJson('data/pytania.json')
})

/** @returns {DaneAplikacji} */
function kontekstFirmy() {
  const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
  zapiszUstawienia(magazyn, { wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony' }, domyslne)
  return { katalog, domyslne, magazyn }
}

/** @param {DaneAplikacji} kontekst @param {string} id */
function zapisana(kontekst, id) {
  const wynik = kontekst.magazyn.wczytaj()
  assert.ok('stan' in wynik)
  const w = wycena(wynik.stan, id)
  assert.ok(w, `brak wyceny ${id}`)
  return w
}

/** Dokladna wycena mieszkania 50 m² (uklad typowy, kurz 1) w mazowieckim. @param {DaneAplikacji} kontekst */
function dokladna50(kontekst) {
  const pomieszczenia = ukladMieszkania(50, {}, katalog.uklady).map((p) => ({ ...p, brud: [{ id: 'kurz', poziom: 1 }] }))
  const { id } = utworzSzkic(kontekst.magazyn, { rodzaj: 'dokladna', wejscie: { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie',
    pomieszczenia, dojazdKm: 0 } })
  return id
}

/** @param {string} kod */
const bladWejscia = (kod) => ({ name: BladWejscia.name, kod })

describe('odpowiedziUslugi', () => {
  it('mieszkanie standard: 7 pytań (dojazd i termin na początku), opis odpowiedzi i licznik odpowiedzianych', () => {
    const odpowiedzi = { zwierzeta: { wartosc: 'tak', notatka: 'kot' }, dojazd: { wartosc: 12, notatka: 'parking pod blokiem' } }

    const wynik = odpowiedziUslugi('mieszkanie_standard', odpowiedzi, pytania)

    assert.deepEqual([wynik.liczba, wynik.odpowiedziane], [7, 2])
    assert.deepEqual(wynik.lista.slice(0, 3).map((p) => [p.pytanie.id, p.opis]),
      [['dojazd', '12 km, parking pod blokiem'], ['termin', null], ['zwierzeta', 'Tak, kot']])
    assert.deepEqual(wynik.bledne, [])
  })

  it('zapisana odpowiedź złego kształtu liczy się jak brak odpowiedzi i trafia do błędnych', () => {
    const wynik = odpowiedziUslugi('mieszkanie_standard', { zwierzeta: { wartosc: 'może' }, termin: 'jutro' }, pytania)

    assert.equal(wynik.odpowiedziane, 0)
    assert.deepEqual(wynik.bledne.map((b) => b.kod), ['odpowiedz', 'odpowiedz'])
  })
})

describe('zapiszOdpowiedz i pytaniaWyceny', () => {
  it('dokładna wycena: „tak” o zwierzętach daje sierść w pokojach, 32 km dojazdu — 44 zł dla klienta; skutki na ekranie pytań', () => {
    const kontekst = kontekstFirmy()
    const id = dokladna50(kontekst)

    zapiszOdpowiedz(kontekst, id, 'zwierzeta', { wartosc: 'tak', notatka: '  kot ' }, pytania)
    const po = zapiszOdpowiedz(kontekst, id, 'dojazd', { wartosc: 32, notatka: '   ' }, pytania)
    const ekran = pytaniaWyceny(po, pytania, kontekst)

    assert.deepEqual(po.odpowiedzi, { zwierzeta: { wartosc: 'tak', notatka: 'kot' }, dojazd: { wartosc: 32 } })
    assert.deepEqual(po.wejscie.pomieszczenia?.[0]?.brud, [{ id: 'kurz', poziom: 1 }, { id: 'siersc', poziom: 1 }])
    assert.equal(po.wynik?.dojazd.kwota, 44)
    assert.deepEqual(ekran.lista.filter((p) => p.skutek).map((p) => [p.pytanie.id, p.skutek]),
      [['dojazd', 'dojazd: 44 zł dla klienta'], ['zwierzeta', 'sierść zwierząt, poziom 1 w pokojach']])
    assert.equal(ekran.odpowiedziane, 2)
  })

  it('usunięcie odpowiedzi dokładnej wyceny zostawia wejście (ręczne zmiany wygrywają)', () => {
    const kontekst = kontekstFirmy()
    const id = dokladna50(kontekst)
    const z = zapiszOdpowiedz(kontekst, id, 'zwierzeta', { wartosc: 'tak' }, pytania)

    const po = zapiszOdpowiedz(kontekst, id, 'zwierzeta', null, pytania)

    assert.deepEqual(po.odpowiedzi, {})
    assert.deepEqual(po.wejscie, z.wejscie)
  })

  it('szybka wycena: dojazd z odpowiedzi trafia do formularza i widełek, usunięcie odpowiedzi go zeruje', () => {
    const kontekst = kontekstFirmy()
    const { id } = zapiszSzybka(kontekst, null, formularzDomyslny(katalog, 'mazowieckie'))

    const z = zapiszOdpowiedz(kontekst, id, 'dojazd', { wartosc: 32 }, pytania)
    const bez = zapiszOdpowiedz(kontekst, id, 'dojazd', null, pytania)

    assert.deepEqual([z.rodzaj, z.szybka?.od, z.szybka?.do, wejscieZWyceny(z, katalog).dojazdKm], ['szybka', 294, 344, 32])
    assert.deepEqual([bez.szybka?.od, bez.wejscie.dojazdKm, bez.odpowiedzi], [250, 0, {}])
  })

  it('szybka wycena: „tak” o zwierzętach i 32 km podnoszą widełki o sierść i dojazd (304–364 zł); formularz odtwarza brud', () => {
    const kontekst = kontekstFirmy()
    const { id } = zapiszSzybka(kontekst, null, formularzDomyslny(katalog, 'mazowieckie'))

    zapiszOdpowiedz(kontekst, id, 'zwierzeta', { wartosc: 'tak' }, pytania)
    const z = zapiszOdpowiedz(kontekst, id, 'dojazd', { wartosc: 32 }, pytania)
    const bez = zapiszOdpowiedz(kontekst, id, 'zwierzeta', null, pytania)

    assert.deepEqual([z.szybka?.od, z.szybka?.do], [304, 364])
    assert.deepEqual(wejscieZWyceny(z, katalog).brud, [{ pomieszczenie: 'pokoj', brud: 'siersc', poziom: 1 }])
    assert.deepEqual(z.wejscie.pomieszczenia?.find((p) => p.typ === 'pokoj')?.brud, [{ id: 'siersc', poziom: 1 }])
    assert.deepEqual([bez.szybka?.od, bez.szybka?.do, bez.szybka?.brud], [294, 344, undefined])
  })

  it('zła wartość, za długa notatka i pytanie spoza usługi dają BladWejscia; nic się nie zapisuje', () => {
    const kontekst = kontekstFirmy()
    const id = dokladna50(kontekst)

    assert.throws(() => zapiszOdpowiedz(kontekst, id, 'zwierzeta', { wartosc: 'może' }, pytania), bladWejscia('odpowiedz'))
    assert.throws(() => zapiszOdpowiedz(kontekst, id, 'dojazd', { wartosc: 5, notatka: 'x'.repeat(201) }, pytania), bladWejscia('notatka'))
    assert.throws(() => zapiszOdpowiedz(kontekst, id, 'remont', { wartosc: 'Generalny' }, pytania), bladWejscia('nieznane_pytanie'))
    assert.deepEqual(zapisana(kontekst, id).odpowiedzi, {})
  })

  it('nieznana wycena daje BladWyceny brak_wyceny', () => {
    assert.throws(() => zapiszOdpowiedz(kontekstFirmy(), 'nie-ma', 'termin', { wartosc: 'jutro' }, pytania),
      { name: BladWyceny.name, kod: 'brak_wyceny' })
  })
})
