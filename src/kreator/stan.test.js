import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { assertBlisko, czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { utworzMagazyn } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { BladWyceny, dodajWykonanie, utworzSzkic, wycena, zmienStatus } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import {
  brudNowegoPomieszczenia, bledyKroku, czyZmianaCzysciZakres, KROKI_KREATORA, nowySzkic, przelicz, zmienWejscie, zmienWybor,
} from './stan.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */

const KURZ_1 = { id: 'kurz', poziom: 1 }

/** Pamiec magazynu, ktora liczy odczyty i zapisy klucza stanu (koszt zmiany wejscia). */
class LicznikMagazynu extends PamiecMagazynu {
  odczyty = 0
  zapisy = 0
  zeruj() {
    this.odczyty = 0
    this.zapisy = 0
  }

  /** @param {string} klucz */
  getItem(klucz) {
    this.odczyty += 1
    return super.getItem(klucz)
  }

  /** @param {string} klucz @param {string} wartosc */
  setItem(klucz, wartosc) {
    this.zapisy += 1
    super.setItem(klucz, wartosc)
  }
}

/** @type {Katalog} */
let katalog
/** @type {Domyslne} */
let domyslne

before(async () => {
  katalog = await katalogZDysku()
  domyslne = await wczytajDomyslne(czytajJson)
})

/** Kontekst z magazynem w pamieci i ustawieniami firmy: mazowieckie, status VAT jak podany. @returns {DaneAplikacji} */
function kontekstFirmy(statusVat = /** @type {'zwolniony' | 'czynny'} */ ('zwolniony')) {
  const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
  zapiszUstawienia(magazyn, { wojewodztwoId: 'mazowieckie', statusVat }, domyslne)
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

/** Typowe mieszkanie 50 m² (pokoje, przedpokoj, kuchnia, lazienka) z kurzem na poziomie 1. */
const mieszkanie50 = () => ukladMieszkania(50, {}, katalog.uklady).map((p) => ({ ...p, brud: [{ ...KURZ_1 }] }))

/** @param {string} kod */
const bladWejscia = (kod) => ({ name: BladWejscia.name, kod })
/** @param {string} kod */
const bladWyceny = (kod) => ({ name: BladWyceny.name, kod })

describe('KROKI_KREATORA', () => {
  it('ma pięć kroków w kolejności z rejestru planu', () => {
    assert.deepEqual(KROKI_KREATORA.map((k) => [k.id, k.etykieta]),
      [['usluga', 'Usługa'], ['zakres', 'Zakres'], ['dodatki', 'Dodatki'], ['chemia', 'Chemia'], ['cena', 'Cena']])
  })
})

describe('nowySzkic', () => {
  it('po remoncie: zapisany szkic z pustymi pomieszczeniami; nowe pomieszczenie dostaje kurz 1 i pył budowlany 2', () => {
    const kontekst = kontekstFirmy()

    const szkic = nowySzkic(kontekst, { uslugaId: 'mieszkanie_po_remoncie', wojewodztwoId: 'mazowieckie' })

    const w = zapisana(kontekst, szkic.id)
    assert.equal(w.status, 'szkic')
    assert.equal(w.rodzaj, 'dokladna')
    assert.equal(w.wynik, null)
    assert.deepEqual(w.wejscie, { uslugaId: 'mieszkanie_po_remoncie', wojewodztwoId: 'mazowieckie', wariantId: null, dodatki: [], dojazdKm: 0,
      pomieszczenia: [] })
    assert.deepEqual(brudNowegoPomieszczenia(katalog, w.wejscie.uslugaId, 'kuchnia'), [KURZ_1, { id: 'pyl_budowlany', poziom: 2 }])
  })

  it('po wynajmie reguła tłuszczu dotyczy tylko kuchni, a standard daje sam kurz 1', () => {
    assert.deepEqual(brudNowegoPomieszczenia(katalog, 'mieszkanie_po_wynajmie', 'kuchnia'), [KURZ_1, { id: 'tluszcz', poziom: 2 }])
    assert.deepEqual(brudNowegoPomieszczenia(katalog, 'mieszkanie_po_wynajmie', 'pokoj'), [KURZ_1])
    assert.deepEqual(brudNowegoPomieszczenia(katalog, 'mieszkanie_standard', 'lazienka'), [KURZ_1])
  })

  it('nieznany typ pomieszczenia daje BladWejscia', () => {
    assert.throws(() => brudNowegoPomieszczenia(katalog, 'mieszkanie_standard', 'garaz'), bladWejscia('nieznane_pomieszczenie'))
  })

  it('okna mają wszystkie pozycje z ilością 0, a posadzki m² z progami tylko pierwszą pozycję główną', () => {
    const kontekst = kontekstFirmy()

    const okna = nowySzkic(kontekst, { uslugaId: 'okna', wojewodztwoId: null })
    const posadzki = nowySzkic(kontekst, { uslugaId: 'mycie_posadzek', wojewodztwoId: null })

    assert.deepEqual(okna.wejscie.pozycje, [{ id: 'okno_1', ilosc: 0 }, { id: 'okno_2', ilosc: 0 }, { id: 'okno_balkonowe', ilosc: 0 }])
    assert.deepEqual(posadzki.wejscie.pozycje, [{ id: 'mycie_maszynowe', ilosc: 0 }])
    assert.equal(okna.wejscie.wojewodztwoId, null)
  })

  it('biura bez wybranego wariantu dostają pierwszy wariant, a podany wariant zostaje', () => {
    const kontekst = kontekstFirmy()

    const domyslny = nowySzkic(kontekst, { uslugaId: 'sprzatanie_biur', wojewodztwoId: 'mazowieckie' })
    const abonament = nowySzkic(kontekst, { uslugaId: 'sprzatanie_biur', wariantId: 'abonament_2', wojewodztwoId: 'mazowieckie' })

    assert.equal(domyslny.wejscie.wariantId, 'jednorazowe')
    assert.equal(abonament.wejscie.wariantId, 'abonament_2')
  })

  it('AGD tylko jako dodatek, nieznany wariant i nieznane województwo dają BladWejscia i nie zapisują szkicu', () => {
    const kontekst = kontekstFirmy()

    assert.throws(() => nowySzkic(kontekst, { uslugaId: 'agd', wojewodztwoId: null }), bladWejscia('tylko_dodatek'))
    assert.throws(() => nowySzkic(kontekst, { uslugaId: 'sprzatanie_biur', wariantId: 'co_miesiac', wojewodztwoId: null }),
      bladWejscia('nieznany_wariant'))
    assert.throws(() => nowySzkic(kontekst, { uslugaId: 'okna', wojewodztwoId: 'mazury' }), bladWejscia('nieznane_wojewodztwo'))
    const wynik = kontekst.magazyn.wczytaj()
    assert.ok('stan' in wynik)
    assert.equal(wynik.stan.wyceny.length, 0)
  })
})

describe('przelicz', () => {
  it('4 pomieszczenia układu 50 m² standard w mazowieckim: cena 250, mediana 250, widełki 120–450', () => {
    const kontekst = kontekstFirmy()
    const wejscie = { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie', pomieszczenia: mieszkanie50(), dojazdKm: 0 }

    const migawka = przelicz({ wejscie }, kontekst)

    assert.equal(wejscie.pomieszczenia.length, 4)
    assert.equal(migawka.cena, 250)
    assert.equal(migawka.mediana, 250)
    assert.deepEqual([Math.round(migawka.widelki.od), Math.round(migawka.widelki.do), migawka.widelki.pelne], [120, 450, true])
    assert.deepEqual([migawka.netto, migawka.vat, migawka.statusVat, migawka.podstawaCeny], [250, 0, 'zwolniony', 'brutto'])
    assert.deepEqual(migawka.wojewodztwo, { id: 'mazowieckie', nazwa: 'mazowieckie', stawka_h: 65, wsp: 1 })
    assert.deepEqual(migawka.wersjaDanych, katalog.wersjaDanych)
    assertBlisko(migawka.minutyNormowe, 230.82, 0.01)
  })

  it('czynny podatnik przy podstawie brutto: cena 250 z VAT 23% w środku', () => {
    const kontekst = kontekstFirmy('czynny')
    const wejscie = { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie', pomieszczenia: mieszkanie50() }

    const migawka = przelicz({ wejscie }, kontekst)

    assert.deepEqual([migawka.cena, migawka.netto, migawka.vat, migawka.stawkaVatProc], [250, 203.25, 46.75, 23])
  })

  it('czynny podatnik przy podstawie netto (posadzki): VAT 23% na górze kwoty modelu', () => {
    const kontekst = kontekstFirmy('czynny')
    const wejscie = { uslugaId: 'mycie_posadzek', wojewodztwoId: 'mazowieckie', pozycje: [{ id: 'mycie_maszynowe', ilosc: 1000 }] }

    const migawka = przelicz({ wejscie }, kontekst)

    const model = migawka.linie.reduce((suma, l) => suma + l.kwota, 0)
    assert.equal(migawka.podstawaCeny, 'netto')
    assert.equal(migawka.cena, Math.round(Math.max(300, model) * 1.23))
    assert.ok(migawka.vat > 0)
  })

  it('czynny podatnik przy podstawie netto (posadzki 1000 m²): brutto 1550, netto 1260,16, VAT 289,84', () => {
    const kontekst = kontekstFirmy('czynny')
    const wejscie = { uslugaId: 'mycie_posadzek', wojewodztwoId: 'mazowieckie', pozycje: [{ id: 'mycie_maszynowe', ilosc: 1000 }], dojazdKm: 0 }

    const migawka = przelicz({ wejscie }, kontekst)

    assert.deepEqual([migawka.cena, migawka.netto, migawka.vat, migawka.podstawaCeny], [1550, 1260.16, 289.84, 'netto'])
  })

  it('pusty zakres daje BladWejscia z silnika', () => {
    const kontekst = kontekstFirmy()

    assert.throws(() => przelicz({ wejscie: { uslugaId: 'mieszkanie_standard', pomieszczenia: [] } }, kontekst), bladWejscia('pusty_zakres'))
  })
})

describe('bledyKroku', () => {
  it('zakres bez pomieszczeń i z pozycjami o ilości 0 zwraca pusty_zakres; pomieszczenie albo pozycja > 0 – brak błędów', () => {
    assert.deepEqual(bledyKroku('zakres', { wejscie: { uslugaId: 'mieszkanie_standard', pomieszczenia: [] } }, katalog), ['pusty_zakres'])
    assert.deepEqual(bledyKroku('zakres', { wejscie: { uslugaId: 'okna', pozycje: [{ id: 'okno_1', ilosc: 0 }] } }, katalog), ['pusty_zakres'])
    assert.deepEqual(bledyKroku('zakres', { wejscie: { uslugaId: 'okna', pozycje: [{ id: 'okno_1', ilosc: 2 }] } }, katalog), [])
    assert.deepEqual(bledyKroku('zakres', { wejscie: { uslugaId: 'mieszkanie_standard', pomieszczenia: mieszkanie50() } }, katalog), [])
  })

  it('krok usługi biur bez wariantu zwraca brak_wariantu, a nieznany krok rzuca BladWejscia', () => {
    assert.deepEqual(bledyKroku('usluga', { wejscie: { uslugaId: 'sprzatanie_biur' } }, katalog), ['brak_wariantu'])
    assert.deepEqual(bledyKroku('usluga', { wejscie: { uslugaId: 'okna' } }, katalog), [])
    assert.throws(() => bledyKroku(/** @type {any} */ ('platnosc'), { wejscie: { uslugaId: 'okna' } }, katalog), bladWejscia('nieznany_krok'))
  })
})

describe('zmienWejscie i zmienWybor', () => {
  it('zmiana wejścia zapisuje pomieszczenia i przeliczoną migawkę', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })

    const po = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: mieszkanie50() }))

    assert.equal(po.wynik?.cena, 250)
    assert.equal(zapisana(kontekst, id).wejscie.pomieszczenia?.length, 4)
    assert.equal(zapisana(kontekst, id).wynik?.mediana, 250)
  })

  it('zmiana usługi przy niepustym zakresie wymaga potwierdzenia i czyści pomieszczenia; dojazd zostaje', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    const zPomieszczeniami = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: mieszkanie50(), dojazdKm: 12 }))

    const czyPytac = czyZmianaCzysciZakres(zPomieszczeniami, 'okna')
    const po = zmienWybor(kontekst, id, { uslugaId: 'okna', wojewodztwoId: 'opolskie' })

    assert.equal(czyPytac, true)
    assert.equal(czyZmianaCzysciZakres(zPomieszczeniami, 'mieszkanie_standard'), false)
    assert.deepEqual(po.wejscie, { uslugaId: 'okna', wojewodztwoId: 'opolskie', wariantId: null, dodatki: [], dojazdKm: 12,
      pozycje: [{ id: 'okno_1', ilosc: 0 }, { id: 'okno_2', ilosc: 0 }, { id: 'okno_balkonowe', ilosc: 0 }] })
    assert.equal(zapisana(kontekst, id).wejscie.pomieszczenia, undefined)
  })

  it('zmiana usługi zostawia tylko dodatki z listy nowej usługi; usługa bez dodatków nie dolicza starej dopłaty', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: mieszkanie50(), dodatki: [
      { uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 2, tryb: 'w_cenie' },
      { uslugaId: 'tapicerka', pozycjaId: 'kanapa_3', ilosc: 1, tryb: 'w_cenie' },
    ] }))

    const biura = zmienWybor(kontekst, id, { uslugaId: 'sprzatanie_biur', wojewodztwoId: 'mazowieckie' })
    const okna = zmienWybor(kontekst, id, { uslugaId: 'okna', wojewodztwoId: 'mazowieckie' })
    const poOknach = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pozycje: [{ id: 'okno_1', ilosc: 4 }] }))

    assert.deepEqual(biura.wejscie.dodatki, [{ uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 2, tryb: 'w_cenie' }])
    assert.deepEqual(okna.wejscie.dodatki, [])
    assert.deepEqual(poOknach.wynik?.linie.map((l) => l.rodzaj), ['pozycja'])
  })

  it('same dodatki spoza listy nowej usługi wymagają potwierdzenia; dodatki, które zostają, nie', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    const zDodatkiem = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie,
      dodatki: [{ uslugaId: 'tapicerka', pozycjaId: 'kanapa_3', ilosc: 1, tryb: 'propozycja' }] }))

    assert.equal(czyZmianaCzysciZakres(zDodatkiem, 'okna', katalog), true)
    assert.equal(czyZmianaCzysciZakres(zDodatkiem, 'sprzatanie_biur', katalog), true)
    assert.equal(czyZmianaCzysciZakres(zDodatkiem, 'mieszkanie_po_remoncie', katalog), false)
  })

  it('ta sama usługa w innym województwie zostawia pomieszczenia i przelicza cenę stawką województwa', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: mieszkanie50() }))

    const po = zmienWybor(kontekst, id, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'wielkopolskie' })

    assert.equal(po.wejscie.pomieszczenia?.length, 4)
    assert.equal(po.wynik?.wojewodztwo.stawka_h, 75.5)
    assert.equal(po.wynik?.cena, Math.round(250.055 * 75.5 / 65))
  })

  it('wycena wykonana jest tylko do odczytu: BladWyceny tylko_odczyt i wejście bez zmian', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: mieszkanie50() }))
    zmienStatus(kontekst.magazyn, id, 'do_wyslania')
    zmienStatus(kontekst.magazyn, id, 'przyjeta')
    dodajWykonanie(kontekst.magazyn, id, { data: '2026-10-20', minuty: 240, tempoPlanu: 1.3 })

    assert.throws(() => zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: [] })), bladWyceny('tylko_odczyt'))
    assert.equal(zapisana(kontekst, id).status, 'wykonana')
    assert.equal(zapisana(kontekst, id).wejscie.pomieszczenia?.length, 4)
  })

  it('usunięcie całego zakresu szkicu czyści migawkę wyniku (nie da się zapisać starej ceny)', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'okna', wojewodztwoId: 'mazowieckie' })
    zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pozycje: [{ id: 'okno_1', ilosc: 4 }] }))

    const po = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pozycje: [{ id: 'okno_1', ilosc: 0 }] }))

    assert.equal(po.wynik, null)
    assert.equal(zapisana(kontekst, id).wynik, null)
    assert.deepEqual(zapisana(kontekst, id).wejscie.pozycje, [{ id: 'okno_1', ilosc: 0 }])
  })

  it('wycena z numerem nie przyjmuje pustego zakresu: BladWyceny pusty_zakres, wejście i cena bez zmian', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: mieszkanie50() }))
    zmienStatus(kontekst.magazyn, id, 'do_wyslania')

    assert.throws(() => zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: [] })), bladWyceny('pusty_zakres'))
    assert.equal(zapisana(kontekst, id).wejscie.pomieszczenia?.length, 4)
    assert.equal(zapisana(kontekst, id).wynik?.cena, 250)
  })

  it('jedna zmiana wejścia to jeden zapis stanu i dwa odczyty magazynu (wejście i migawka razem)', () => {
    const pamiec = new LicznikMagazynu()
    const magazyn = utworzMagazyn(pamiec, { loguj: () => {}, poprosOTrwalosc: () => true })
    zapiszUstawienia(magazyn, { wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony' }, domyslne)
    const kontekst = { katalog, domyslne, magazyn }
    const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
    pamiec.zeruj()

    const po = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia: mieszkanie50() }))

    assert.equal(po.wynik?.cena, 250)
    assert.deepEqual([pamiec.zapisy, pamiec.odczyty], [1, 2])
  })

  it('nieznana wycena daje BladWyceny brak_wyceny', () => {
    const kontekst = kontekstFirmy()
    utworzSzkic(kontekst.magazyn, { rodzaj: 'dokladna', wejscie: { uslugaId: 'okna' } })

    assert.throws(() => zmienWejscie(kontekst, 'nie-ma', (w) => w), bladWyceny('brak_wyceny'))
  })
})
