import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { utworzMagazyn } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { BladWyceny, utworzSzkic, wycena, zmienStatus } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import {
  dojazdZOdpowiedzi, formularzDomyslny, kontekstSzybkiej, opcjeUslug, oznaczWyslana, polaUslugi, wejscieZWyceny, wynikFormularza,
  zapiszSzybka, zBrudemOdpowiedzi, zMetrazem, zSzybkiej, zUsluga,
} from './szybka.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('./szybka.js').FormularzSzybkiej} FormularzSzybkiej */

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

/** Kontekst z magazynem w pamieci i firma w mazowieckim (zwolniona z VAT). @returns {DaneAplikacji} */
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

/** Mieszkanie 50 m² standard w mazowieckim, stan typowy (formularz na start ekranu). @returns {FormularzSzybkiej} */
const mieszkanie50 = () => formularzDomyslny(katalog, 'mazowieckie')

/** @param {string} kod */
const bladWyceny = (kod) => ({ name: BladWyceny.name, kod })
/** @param {string} kod */
const bladWejscia = (kod) => ({ name: BladWejscia.name, kod })

describe('opcje i pola formularza', () => {
  it('„Mieszkanie lub dom” zbiera trzy mieszkaniowe usługi; po remoncie i pozostałe mają nazwy z danych, bez AGD', () => {
    const opcje = opcjeUslug(katalog)

    assert.deepEqual(opcje[0], { wartosc: 'mieszkanie', etykieta: 'Mieszkanie lub dom',
      uslugi: ['mieszkanie_standard', 'mieszkanie_gruntowne', 'mieszkanie_po_wynajmie'] })
    assert.deepEqual(opcje.slice(1, 3).map((o) => o.etykieta), ['Mieszkanie lub dom – sprzątanie po remoncie', 'Sprzątanie biur i lokali usługowych'])
    assert.equal(opcje.some((o) => o.uslugi.includes('agd')), false)
    assert.equal(opcje.length, 11)
  })

  it('pola wg usługi: mieszkanie, biuro, liczniki pozycji, oględziny pomieszczeń i pozycji', () => {
    const pola = ['mieszkanie_gruntowne', 'sprzatanie_biur', 'tapicerka', 'mieszkanie_po_remoncie', 'mycie_kostki']
      .map((id) => polaUslugi(katalog.usluga(id)))

    assert.deepEqual(pola, ['mieszkanie', 'biuro', 'pozycje', 'ogledziny_pomieszczen', 'ogledziny_pozycji'])
  })

  it('formularz na start: standard 50 m², 1 łazienka, kuchnia osobna, stan typowy; zmiana usługi na tapicerkę zeruje jej pozycje', () => {
    const start = mieszkanie50()
    const zAgd = { ...start, dodatki: [{ uslugaId: 'agd', pozycjaId: 'piekarnik', ilosc: 1, tryb: /** @type {const} */ ('w_cenie') }] }

    const tapicerka = zUsluga(zAgd, 'tapicerka', katalog)

    assert.deepEqual([start.uslugaId, start.m2, start.lazienki, start.kuchnia, start.stan], ['mieszkanie_standard', 50, 1, 'osobna', 'typowy'])
    assert.deepEqual(tapicerka.pozycje.map((p) => [p.id, p.ilosc]), [['kanapa_3', 0], ['kanapa_2', 0], ['naroznik', 0], ['fotel', 0]])
    assert.deepEqual([tapicerka.dodatki, tapicerka.m2], [[], 50])
    assert.deepEqual(zUsluga(zAgd, 'mieszkanie_gruntowne', katalog).dodatki, zAgd.dodatki)
  })

  it('zmiana usługi czyści brud z odpowiedzi, a zBrudemOdpowiedzi liczy go od nowa wg pytań nowej usługi', () => {
    const zKotem = { ...mieszkanie50(), odpowiedzi: { zwierzeta: { wartosc: 'tak' } } }

    const poWynajmie = zUsluga(zBrudemOdpowiedzi(zKotem, pytania), 'mieszkanie_po_wynajmie', katalog)

    assert.deepEqual(zBrudemOdpowiedzi(zKotem, pytania).brud, [{ pomieszczenie: 'pokoj', brud: 'siersc', poziom: 1 }])
    assert.deepEqual(poWynajmie.brud, [])
    assert.deepEqual(zBrudemOdpowiedzi(poWynajmie, pytania).brud, [])
    assert.deepEqual(zBrudemOdpowiedzi({ ...poWynajmie, odpowiedzi: { zwierzeta_najemcow: { wartosc: 'tak' } } }, pytania).brud,
      [{ pomieszczenie: '*', brud: 'siersc', poziom: 2 }])
  })

  it('zła odpowiedź na pytanie ze skutkiem brudu daje BladWejscia odpowiedz', () => {
    assert.throws(() => zBrudemOdpowiedzi({ ...mieszkanie50(), odpowiedzi: { zwierzeta: { wartosc: 'kot' } } }, pytania), bladWejscia('odpowiedz'))
  })

  it('metraż zmienia domyślną liczbę łazienek, dopóki firma jej nie ustawiła ręcznie', () => {
    const start = mieszkanie50()

    assert.equal(zMetrazem(start, 120, katalog, false).lazienki, 2)
    assert.equal(zMetrazem({ ...start, lazienki: 3 }, 120, katalog, true).lazienki, 3)
  })
})

describe('wynikFormularza', () => {
  it('mieszkanie 50 m² standard, typowy: widełki 250–300 zł, mediana 250, rynek 120–450 i tekst dla klienta', () => {
    const stan = wynikFormularza(kontekstFirmy(), mieszkanie50())

    assert.equal(stan.stan, 'wynik')
    assert.ok(stan.stan === 'wynik')
    assert.deepEqual([stan.wynik.tryb, stan.wynik.od, stan.wynik.do, stan.wynik.mediana], ['widelki', 250, 300, 250])
    assert.deepEqual([stan.wynik.rynek.od, stan.wynik.rynek.do], [120, 450])
    assert.equal(stan.wynik.tekst, 'Sprzątanie mieszkania 50 m², standard: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.')
    assert.deepEqual(stan.wojewodztwo, { id: 'mazowieckie', nazwa: 'mazowieckie' })
  })

  it('okna bez pozycji to stan pusty, a za mały metraż mieszkania — błąd metrazu', () => {
    const kontekst = kontekstFirmy()

    assert.deepEqual(wynikFormularza(kontekst, zUsluga(mieszkanie50(), 'okna', katalog)), { stan: 'pusty' })
    assert.deepEqual(Object.entries(wynikFormularza(kontekst, { ...mieszkanie50(), m2: 5 })).slice(0, 2), [['stan', 'blad'], ['kod', 'metraz']])
  })
})

describe('zapis szybkiej wyceny', () => {
  it('nowy szkic `szybka`: wejście dolnej granicy (4 pomieszczenia układu), widełki w `szybka` i migawka 250 zł', () => {
    const kontekst = kontekstFirmy()

    const w = zapiszSzybka(kontekst, null, mieszkanie50())

    assert.deepEqual([w.rodzaj, w.status, w.numer, w.szybka], ['szybka', 'szkic', null, { stan: 'typowy', od: 250, do: 300, tryb: 'widelki' }])
    assert.deepEqual(w.wejscie.pomieszczenia?.map((p) => [p.typ, p.m2]), [['pokoj', 32], ['przedpokoj', 6], ['kuchnia', 8], ['lazienka', 4]])
    assert.equal(zapisana(kontekst, w.id).wynik?.cena, 250)
  })

  it('formularz wraca z rekordu bez strat (aneks, 2 łazienki, mocny stan, AGD, odpowiedzi) i zapis zmienia ten sam rekord', () => {
    const kontekst = kontekstFirmy()
    const dodatki = [{ uslugaId: 'agd', pozycjaId: 'piekarnik', ilosc: 1, tryb: /** @type {const} */ ('w_cenie') }]
    /** @type {FormularzSzybkiej} */
    const formularz = { ...mieszkanie50(), m2: 65, lazienki: 2, kuchnia: 'aneks', stan: 'mocny', dodatki, odpowiedzi: { termin: { wartosc: 'jutro' } } }
    const { id } = zapiszSzybka(kontekst, null, formularz)

    const odtworzony = wejscieZWyceny(zapisana(kontekst, id), katalog)
    const po = zapiszSzybka(kontekst, id, { ...odtworzony, m2: 70 })

    assert.deepEqual(odtworzony, formularz)
    assert.equal(zapisana(kontekst, id).wejscie.pomieszczenia?.find((p) => p.typ === 'kuchnia')?.nazwa, 'Aneks kuchenny')
    assert.deepEqual([po.id, wejscieZWyceny(po, katalog).m2], [id, 70])
  })

  it('zapis ze znacznikiem starszym niż rekord (zmiana w innej karcie) daje BladWyceny nieaktualna i nie nadpisuje odpowiedzi', () => {
    const kontekst = kontekstFirmy()
    const pierwszy = zapiszSzybka(kontekst, null, mieszkanie50())
    const zOdpowiedzia = zapiszSzybka(kontekst, pierwszy.id, { ...mieszkanie50(), odpowiedzi: { termin: { wartosc: 'jutro' } } })

    const zly = () => zapiszSzybka(kontekst, pierwszy.id, { ...mieszkanie50(), m2: 70 }, { zmieniona: `${pierwszy.zmieniona}-stary` })
    const dobry = zapiszSzybka(kontekst, pierwszy.id, { ...wejscieZWyceny(zOdpowiedzia, katalog), m2: 70 }, { zmieniona: zOdpowiedzia.zmieniona })

    assert.throws(zly, bladWyceny('nieaktualna'))
    assert.deepEqual([dobry.odpowiedzi, wejscieZWyceny(dobry, katalog).m2], [{ termin: { wartosc: 'jutro' } }, 70])
  })

  it('oględziny pozycji: formularz wraca z metrażu głównej pozycji, a tryb „od” trafia do widełek', () => {
    const kontekst = kontekstFirmy()
    const kostka = { ...zUsluga(mieszkanie50(), 'mycie_kostki', katalog), m2: 100 }

    const w = zapiszSzybka(kontekst, null, kostka)

    assert.deepEqual(w.wejscie.pozycje?.map((p) => p.ilosc), [100])
    assert.equal(w.szybka?.tryb, 'od')
    assert.equal(wejscieZWyceny(w, katalog).m2, 100)
  })

  it('formularz z błędem nie zapisuje niczego (BladWejscia), a dokładnej wyceny nie da się nadpisać szybką (BladWyceny rodzaj)', () => {
    const kontekst = kontekstFirmy()
    const { id } = utworzSzkic(kontekst.magazyn, { rodzaj: 'dokladna', wejscie: { uslugaId: 'mieszkanie_standard' } })

    assert.throws(() => zapiszSzybka(kontekst, null, zUsluga(mieszkanie50(), 'okna', katalog)), bladWejscia('pusty_zakres'))
    assert.throws(() => zapiszSzybka(kontekst, id, mieszkanie50()), bladWyceny('rodzaj'))
    assert.throws(() => wejscieZWyceny(zapisana(kontekst, id), katalog), bladWyceny('rodzaj'))
    assert.equal(zapisana(kontekst, id).rodzaj, 'dokladna')
  })

  it('skopiowany tekst: szkic dostaje numer i status wysłana; przyjęta zostaje przyjętą', () => {
    const kontekst = kontekstFirmy()
    const { id } = zapiszSzybka(kontekst, null, mieszkanie50())

    const wyslana = oznaczWyslana(kontekst, id)
    zmienStatus(kontekst.magazyn, id, 'przyjeta')

    assert.equal(wyslana.status, 'wyslana')
    assert.match(wyslana.numer ?? '', /^1\/\d{2}\/\d{4}$/)
    assert.equal(oznaczWyslana(kontekst, id).status, 'przyjeta')
    assert.throws(() => oznaczWyslana(kontekst, 'nie-ma'), bladWyceny('brak_wyceny'))
  })

  it('dojazd z odpowiedzi „Parking i dojazd” (32 km) dokłada 44 zł na obu końcach widełek', () => {
    const kontekst = kontekstFirmy()
    const formularz = { ...mieszkanie50(), odpowiedzi: { dojazd: { wartosc: 32 } } }

    const km = dojazdZOdpowiedzi(formularz, pytania, kontekstSzybkiej(kontekst, formularz.uslugaId))
    const stan = wynikFormularza(kontekst, { ...formularz, dojazdKm: km })

    assert.equal(km, 32)
    assert.ok(stan.stan === 'wynik')
    assert.deepEqual([stan.wynik.od, stan.wynik.do], [294, 344])
  })
})

describe('zSzybkiej', () => {
  it('zostawia id i numer, ustawia rodzaj dokładna, pomieszczenia z układu ze skutkami odpowiedzi i pole szybka z widełkami', () => {
    const kontekst = kontekstFirmy()
    const odpowiedzi = { zwierzeta: { wartosc: 'tak', notatka: 'kot' }, dojazd: { wartosc: 12 } }
    const szybka = zapiszSzybka(kontekst, null, { ...mieszkanie50(), dojazdKm: 12, odpowiedzi })
    const { numer } = oznaczWyslana(kontekst, szybka.id)

    const dokladna = zSzybkiej(kontekst, szybka, pytania)

    assert.deepEqual([dokladna.id, dokladna.numer, dokladna.rodzaj, dokladna.status], [szybka.id, numer, 'dokladna', 'wyslana'])
    assert.deepEqual(dokladna.wejscie.pomieszczenia?.map((p) => [p.typ, p.m2, p.brud]), [
      ['pokoj', 32, [{ id: 'siersc', poziom: 1 }]], ['przedpokoj', 6, []], ['kuchnia', 8, []], ['lazienka', 4, []],
    ])
    assert.deepEqual(dokladna.szybka, { stan: 'typowy', od: szybka.szybka?.od, do: szybka.szybka?.do, tryb: 'widelki' })
    assert.deepEqual([dokladna.odpowiedzi, dokladna.wejscie.dojazdKm], [odpowiedzi, 12])
    assert.equal(zapisana(kontekst, szybka.id).rodzaj, 'dokladna')
  })

  it('dokładnej wyceny nie zamienia drugi raz (BladWyceny rodzaj), a nieznana daje brak_wyceny', () => {
    const kontekst = kontekstFirmy()
    const szybka = zapiszSzybka(kontekst, null, mieszkanie50())
    zSzybkiej(kontekst, szybka, pytania)

    assert.throws(() => zSzybkiej(kontekst, szybka, pytania), bladWyceny('rodzaj'))
    assert.throws(() => zSzybkiej(kontekst, { id: 'nie-ma' }, pytania), bladWyceny('brak_wyceny'))
  })
})
