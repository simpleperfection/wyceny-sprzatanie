import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { dodajKlienta } from './klienci.js'
import { utworzMagazyn } from './magazyn.js'
import {
  BladWyceny, kwotaWyceny, listaWycen, przypiszKlienta, usunWycene, utworzSzkic, wycena, zapiszWejscie, zapiszWycene,
  zapiszWynik, zmienStatus,
} from './wyceny.js'
import * as modulWycen from './wyceny.js'
import { zaplanujZWyceny, zlecenie } from './zlecenia.js'

const PAZDZIERNIK = { teraz: () => new Date('2026-10-15T10:00:00.000Z') }
const LISTOPAD = { teraz: () => new Date('2026-11-12T10:00:00.000Z') }
const WEJSCIE = { uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 20 }] }

/** Migawka wyniku; `wizytWMiesiacu` liczba = abonament. @param {Partial<import('./wyceny.js').MigawkaWyniku>} [zmiana] */
const migawka = (zmiana = {}) => ({
  cena: 250, netto: 250, vat: 0, mediana: 250, widelki: { od: 200, do: 300, pelne: true }, minutyNormowe: 180, linie: [], propozycje: [],
  dojazd: { km: 0, kwota: 0 }, wojewodztwo: { id: 'mazowieckie', nazwa: 'mazowieckie', stawka_h: 70, wsp: 1.08 }, statusVat: /** @type {const} */ ('zwolniony'),
  stawkaVatProc: 23, podstawaCeny: 'brutto', wizytWMiesiacu: null, wersjaDanych: { ceny: 'c', normy: 'n', rynek: 'r' }, ...zmiana,
})

function nowyMagazyn() {
  return utworzMagazyn(new PamiecMagazynu(), { teraz: () => new Date('2026-10-15T10:00:00.000Z'), loguj: () => {}, poprosOTrwalosc: () => true })
}

/** @param {ReturnType<typeof nowyMagazyn>} magazyn */
function stanMagazynu(magazyn) {
  const wynik = magazyn.wczytaj()
  assert.ok('stan' in wynik)
  return wynik.stan
}

/** @param {ReturnType<typeof nowyMagazyn>} magazyn @param {string} id */
function zMagazynu(magazyn, id) {
  const w = wycena(stanMagazynu(magazyn), id)
  assert.ok(w, `brak wyceny ${id} w magazynie`)
  return w
}

/**
 * Szkic z policzonym wynikiem, przeprowadzony przez podane statusy.
 * @param {ReturnType<typeof nowyMagazyn>} magazyn @param {import('./wyceny.js').StatusWyceny[]} statusy
 */
function wycenaWStatusie(magazyn, statusy) {
  const { id } = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }, PAZDZIERNIK)
  zapiszWynik(magazyn, id, migawka(), PAZDZIERNIK)
  for (const status of statusy) zmienStatus(magazyn, id, status, PAZDZIERNIK)
  return id
}

/** Przyjeta wycena ze zleceniem `z-<id>` klienta `k1` (tylko do odczytu). @param {ReturnType<typeof nowyMagazyn>} magazyn */
function wycenaZeZleceniem(magazyn) {
  const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
  dodajKlienta(magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1' })
  zaplanujZWyceny(magazyn, id, { klientId: 'k1', rozliczenie: 'za_wizyte', start: '2026-10-20', cenaWizyty: 250, tempo: 1.3 }, { id: `z-${id}` })
  return id
}

/** @param {string} kod */
const bladWyceny = (kod) => ({ name: BladWyceny.name, kod })

describe('utworzSzkic', () => {
  it('zapisuje szkic bez numeru, wyniku i klienta z listy, z wpisanym klientem i aktualną ofertą', () => {
    const magazyn = nowyMagazyn()

    const szkic = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE, klient: { nazwa: '  Jan Kowalski ' } }, PAZDZIERNIK)

    assert.deepEqual(zMagazynu(magazyn, szkic.id), {
      id: szkic.id, numer: null, utworzona: '2026-10-15T10:00:00.000Z', zmieniona: '2026-10-15T10:00:00.000Z', status: 'szkic',
      rodzaj: 'dokladna', klientId: null, klient: { nazwa: 'Jan Kowalski', adres: '', termin: null }, wejscie: WEJSCIE, szybka: null,
      odpowiedzi: {}, wynik: null, cenaReczna: null, oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false },
    })
    assert.match(szkic.id, /^[0-9a-f-]{36}$/)
  })

  it('zły rodzaj, wejście bez usługi i nieznane pole klienta → BladWyceny', () => {
    const magazyn = nowyMagazyn()

    assert.throws(() => utworzSzkic(magazyn, { rodzaj: /** @type {never} */ ('inna'), wejscie: WEJSCIE }), bladWyceny('rodzaj'))
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: /** @type {never} */ ({}) }), bladWyceny('wejscie'))
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, klient: /** @type {never} */ ({ telefon: '1' }) }),
      bladWyceny('klient'))
  })
})

describe('zapiszWejscie i zapiszWynik', () => {
  it('zmiana wejścia wysłanej wyceny ustawia oferta.nieaktualna; przed wysłaniem oferta zostaje aktualna', () => {
    const magazyn = nowyMagazyn()
    const wyslana = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana'])
    const niewyslana = wycenaWStatusie(magazyn, ['do_wyslania'])
    const nowe = { ...WEJSCIE, dojazdKm: 12 }

    zapiszWejscie(magazyn, wyslana, nowe)
    zapiszWejscie(magazyn, niewyslana, nowe)

    assert.equal(zMagazynu(magazyn, wyslana).oferta.nieaktualna, true)
    assert.deepEqual(zMagazynu(magazyn, wyslana).wejscie, nowe)
    assert.equal(zMagazynu(magazyn, niewyslana).oferta.nieaktualna, false)
  })

  it('zapis wejścia albo wyniku wyceny ze zleceniem rzuca tylko_odczyt i nic nie zapisuje; przyjęta bez zlecenia się zapisuje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaZeZleceniem(magazyn)
    const bezZlecenia = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
    const przed = zMagazynu(magazyn, id)

    assert.throws(() => zapiszWejscie(magazyn, id, { ...WEJSCIE, dojazdKm: 7 }), bladWyceny('tylko_odczyt'))
    assert.throws(() => zapiszWynik(magazyn, id, migawka({ cena: 300 })), bladWyceny('tylko_odczyt'))
    assert.deepEqual(zMagazynu(magazyn, id), przed)
    zapiszWejscie(magazyn, bezZlecenia, { ...WEJSCIE, dojazdKm: 7 })
    assert.equal(zMagazynu(magazyn, bezZlecenia).wejscie.dojazdKm, 7)
  })

  it('nowa cena po wysłaniu → oferta nieaktualna; ta sama cena zostawia ofertę aktualną', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana'])

    zapiszWynik(magazyn, id, migawka({ minutyNormowe: 190 }))
    const poTejSamejCenie = zMagazynu(magazyn, id).oferta.nieaktualna
    zapiszWynik(magazyn, id, migawka({ cena: 270 }))

    assert.equal(poTejSamejCenie, false)
    assert.equal(zMagazynu(magazyn, id).oferta.nieaktualna, true)
    assert.equal(zMagazynu(magazyn, id).wynik?.cena, 270)
  })

  it('migawka bez czasu normowego albo z ujemną ceną → wynik', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, [])

    assert.throws(() => zapiszWynik(magazyn, id, migawka({ minutyNormowe: 0 })), bladWyceny('wynik'))
    assert.throws(() => zapiszWynik(magazyn, id, migawka({ cena: -1 })), bladWyceny('wynik'))
  })
})

describe('usunWycene, listaWycen i wycena', () => {
  it('lista od ostatnio zmienionej; usunięta znika, numer nie wraca do puli', () => {
    const magazyn = nowyMagazyn()
    const [a, b, c] = [1, 2, 3].map(() => wycenaWStatusie(magazyn, ['do_wyslania']))
    zapiszWejscie(magazyn, a, WEJSCIE, LISTOPAD)
    zapiszWejscie(magazyn, c, WEJSCIE, { teraz: () => new Date('2026-10-20T10:00:00.000Z') })

    const lista = listaWycen(stanMagazynu(magazyn))
    const poUsunieciu = usunWycene(magazyn, a)

    assert.deepEqual(lista.map((w) => w.id), [a, c, b])
    assert.deepEqual(poUsunieciu.wyceny.map((w) => w.id), [b, c])
    assert.equal(wycena(poUsunieciu, a), null)
    assert.deepEqual(poUsunieciu.licznikNumerow, { '2026-10': 3 })
  })

  it('usunięcie nieistniejącej wyceny → brak_wyceny', () => {
    assert.throws(() => usunWycene(nowyMagazyn(), 'nie-ma'), bladWyceny('brak_wyceny'))
  })

  it('usunięcie wyceny zeruje wycenaId w jej zleceniu; zlecenie zostaje z planem', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaZeZleceniem(magazyn)

    const stan = usunWycene(magazyn, id)

    assert.equal(wycena(stan, id), null)
    assert.deepEqual([zlecenie(stan, `z-${id}`)?.wycenaId, zlecenie(stan, `z-${id}`)?.plan], [null, { minutyNormowe: 180, tempo: 1.3 }])
  })
})

describe('przypiszKlienta i szkic z klientem z listy', () => {
  it('kopiuje nazwę i adres klienta do wyceny, termin zostaje; przed wysłaniem oferta zostaje aktualna', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    zapiszWycene(magazyn, id, { klient: { termin: '2026-11-14T09:00' } })
    dodajKlienta(magazyn, { nazwa: 'Anna Kowalska', adres: 'ul. Lipowa 3, Warszawa' }, { id: 'k-anna' })

    przypiszKlienta(magazyn, id, 'k-anna', LISTOPAD)

    const w = zMagazynu(magazyn, id)
    assert.deepEqual([w.klientId, w.klient, w.oferta.nieaktualna, w.zmieniona],
      ['k-anna', { nazwa: 'Anna Kowalska', adres: 'ul. Lipowa 3, Warszawa', termin: '2026-11-14T09:00' }, false, '2026-11-12T10:00:00.000Z'])
  })

  it('„Bez klienta” (null) czyści kopię nazwy i adresu poprzedniego klienta, termin zostaje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    zapiszWycene(magazyn, id, { klient: { termin: '2026-11-14T09:00' } })
    dodajKlienta(magazyn, { nazwa: 'Anna Kowalska', adres: 'ul. Lipowa 3, Warszawa' }, { id: 'k-anna' })
    przypiszKlienta(magazyn, id, 'k-anna')

    przypiszKlienta(magazyn, id, null, LISTOPAD)

    const w = zMagazynu(magazyn, id)
    assert.deepEqual([w.klientId, w.klient, w.zmieniona], [null, { nazwa: '', adres: '', termin: '2026-11-14T09:00' }, '2026-11-12T10:00:00.000Z'])
  })

  it('nieznany klient → brak_klienta, id liczbą → klient, wycena ze zleceniem → tylko_odczyt; nic się nie zapisuje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    const zeZleceniem = wycenaZeZleceniem(magazyn)
    const przed = stanMagazynu(magazyn)

    assert.throws(() => przypiszKlienta(magazyn, id, 'k-brak'), bladWyceny('brak_klienta'))
    assert.throws(() => przypiszKlienta(magazyn, id, /** @type {never} */ (42)), bladWyceny('klient'))
    assert.throws(() => przypiszKlienta(magazyn, zeZleceniem, 'k1'), bladWyceny('tylko_odczyt'))
    assert.deepEqual(stanMagazynu(magazyn), przed)
  })

  it('utworzSzkic z klientId kopiuje nazwę i adres klienta; nieznany klient → brak_klienta bez zapisu', () => {
    const magazyn = nowyMagazyn()
    dodajKlienta(magazyn, { nazwa: 'Anna Kowalska', adres: 'ul. Lipowa 3' }, { id: 'k-anna' })

    const szkic = utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, klientId: 'k-anna', klient: { termin: 'sobota' } })

    assert.deepEqual([szkic.klientId, szkic.klient], ['k-anna', { nazwa: 'Anna Kowalska', adres: 'ul. Lipowa 3', termin: 'sobota' }])
    assert.deepEqual(zMagazynu(magazyn, szkic.id), szkic)
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, klientId: 'k-brak' }), bladWyceny('brak_klienta'))
    assert.equal(stanMagazynu(magazyn).wyceny.length, 1)
  })

  it('kwotaWyceny: cena ręczna wygrywa z migawką, szkic bez ceny daje null', () => {
    assert.deepEqual([kwotaWyceny({ cenaReczna: 290, wynik: migawka() }), kwotaWyceny({ cenaReczna: null, wynik: migawka() }),
      kwotaWyceny({ cenaReczna: null, wynik: null })], [290, 250, null])
  })
})

describe('granice zapisu wyceny (te same co w kopii zapasowej)', () => {
  it('odpowiedź dłuższa niż 2000 znaków → dlugosc przy utworzSzkic i zapiszWejscie, bez zapisu', () => {
    const magazyn = nowyMagazyn()
    const { id } = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE, odpowiedzi: { uwagi: 'x'.repeat(2000) } })

    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE, odpowiedzi: { uwagi: 'x'.repeat(2001) } }),
      bladWyceny('dlugosc'))
    assert.throws(() => zapiszWejscie(magazyn, id, { ...WEJSCIE, opis: 'x'.repeat(2001) }), bladWyceny('dlugosc'))
    assert.deepEqual(stanMagazynu(magazyn).wyceny.map((w) => w.id), [id])
  })

  it('przy 5000 zapisanych wycenach kolejny szkic → limit_wycen', () => {
    const magazyn = nowyMagazyn()
    const wzor = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE })
    const stan = stanMagazynu(magazyn)
    magazyn.zapiszCalosc({ ...stan, wyceny: Array.from({ length: 5000 }, (_, i) => ({ ...wzor, id: `w${i}` })) })

    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }), bladWyceny('limit_wycen'))
    assert.equal(stanMagazynu(magazyn).wyceny.length, 5000)
  })
})

describe('gałęzie walidacji szkicu, klienta i wyniku', () => {
  it('szkic z poprawnymi widełkami szybkiej wyceny zapisuje je; widełki z do: "x" → szybka, odpowiedzi listą → odpowiedzi', () => {
    const magazyn = nowyMagazyn()
    const szybka = { stan: 'typowy', od: 200, do: 300, tryb: 'widelki' }

    const szkic = utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka })

    assert.deepEqual(zMagazynu(magazyn, szkic.id).szybka, szybka)
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka: /** @type {never} */ ({ ...szybka, do: 'x' }) }),
      bladWyceny('szybka'))
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE,
      szybka: /** @type {never} */ ({ ...szybka, brud: [{ pomieszczenie: 'pokoj', brud: 'siersc', poziom: '1' }] }) }), bladWyceny('szybka'))
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, odpowiedzi: /** @type {never} */ ([]) }), bladWyceny('odpowiedzi'))
  })

  it('poziom górnej granicy 3 zapisuje się w widełkach; poziom "3" (tekst) i 2,5 → szybka', () => {
    const magazyn = nowyMagazyn()
    const szybka = { stan: 'typowy', od: 150, do: 210, tryb: 'widelki', poziomGorny: 3 }

    const szkic = utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka })

    assert.deepEqual(zMagazynu(magazyn, szkic.id).szybka, szybka)
    for (const poziomGorny of ['3', 2.5]) {
      assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka: /** @type {never} */ ({ ...szybka, poziomGorny }) }),
        bladWyceny('szybka'))
    }
  })

  it('nazwa klienta 121 znaków i adres liczbą → klient; termin ze spacji zapisuje się jako null', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, [])

    assert.throws(() => zapiszWycene(magazyn, id, { klient: { nazwa: 'x'.repeat(121) } }), bladWyceny('klient'))
    assert.throws(() => zapiszWycene(magazyn, id, { klient: { adres: /** @type {never} */ (5) } }), bladWyceny('klient'))
    zapiszWycene(magazyn, id, { klient: { nazwa: 'Anna', termin: '  ' } })

    assert.deepEqual(zMagazynu(magazyn, id).klient, { nazwa: 'Anna', adres: '', termin: null })
  })

  it('migawka z VAT -1, zerem wizyt albo bez listy linii → wynik', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, [])

    for (const zmiana of [{ vat: -1 }, { wizytWMiesiacu: 0 }, { linie: /** @type {never} */ (null) }]) {
      assert.throws(() => zapiszWynik(magazyn, id, migawka(zmiana)), bladWyceny('wynik'), JSON.stringify(zmiana))
    }
  })
})

describe('granice długości tekstów i zagnieżdżenia w szkicu i migawce', () => {
  it('opis linii migawki 2001 znaków → dlugosc przy zapiszWynik, wynik bez zmian', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, [])
    const linie = /** @type {never} */ ([{ opis: 'x'.repeat(2001) }])

    assert.throws(() => zapiszWynik(magazyn, id, migawka({ linie })), bladWyceny('dlugosc'))
    assert.deepEqual(zMagazynu(magazyn, id).wynik?.linie, [])
  })

  it('stan szybkiej wyceny 2001 znaków → dlugosc przy utworzSzkic, bez zapisu', () => {
    const magazyn = nowyMagazyn()
    const szybka = { stan: 'x'.repeat(2001), od: 200, do: 300, tryb: 'pomieszczenia' }

    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka }), bladWyceny('dlugosc'))
    assert.deepEqual(stanMagazynu(magazyn).wyceny, [])
  })

  it('odpowiedzi zagnieżdżone na 33 poziomy → dlugosc z komunikatem o zagnieżdżeniu, bez zapisu', () => {
    const magazyn = nowyMagazyn()
    /** @type {Record<string, unknown>} */
    let odpowiedzi = {}
    for (let i = 0; i < 33; i++) odpowiedzi = { glebiej: odpowiedzi }

    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE, odpowiedzi }),
      { ...bladWyceny('dlugosc'), message: /zagnieżdżone głębiej niż 32 poziomy/ })
    assert.deepEqual(stanMagazynu(magazyn).wyceny, [])
  })
})

describe('jestWycena, jestMigawkaWyniku i RODZAJE_WYCENY', () => {
  it('zapisana wycena i jej migawka przechodzą; numer spoza wzoru, ujemna cena ręczna i migawka bez propozycji nie', () => {
    const magazyn = nowyMagazyn()
    const zapisana = zMagazynu(magazyn, wycenaWStatusie(magazyn, ['do_wyslania']))

    assert.equal(modulWycen.jestWycena(zapisana), true)
    assert.equal(modulWycen.jestMigawkaWyniku(zapisana.wynik), true)
    assert.equal(modulWycen.jestWycena({ ...zapisana, numer: '0/13/2026' }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, cenaReczna: -10 }), false)
    assert.equal(modulWycen.jestMigawkaWyniku({ ...migawka(), propozycje: undefined }), false)
  })

  it('minimum tekstem, ujemne albo nieskończone przy czyMinimum true → false; czyMinimum nie boolean → false; poprawne minimum → true', () => {
    assert.equal(modulWycen.jestMigawkaWyniku(migawka({ minimum: 'abc', czyMinimum: true })), false)
    assert.equal(modulWycen.jestMigawkaWyniku(migawka({ minimum: -50, czyMinimum: true })), false)
    assert.equal(modulWycen.jestMigawkaWyniku(migawka({ minimum: 1e309, czyMinimum: true })), false)
    assert.equal(modulWycen.jestMigawkaWyniku(migawka({ minimum: 300, czyMinimum: 'tak' })), false)
    assert.equal(modulWycen.jestMigawkaWyniku(migawka({ minimum: 300, czyMinimum: true })), true)
  })

  it('zapiszWynik z minimum tekstem, ujemnym albo nieskończonym: BladWyceny wynik', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])

    assert.throws(() => zapiszWynik(magazyn, id, migawka({ minimum: 'abc', czyMinimum: true })), bladWyceny('wynik'))
    assert.throws(() => zapiszWynik(magazyn, id, migawka({ minimum: -50, czyMinimum: true })), bladWyceny('wynik'))
    assert.throws(() => zapiszWynik(magazyn, id, migawka({ minimum: 1e309, czyMinimum: true })), bladWyceny('wynik'))
  })

  it('numer 01/10/2026 albo 1/10/26, cena ręczna 0, klientId pusty, liczbą albo brak pola, adres 201 i termin 41 znaków → false', () => {
    const magazyn = nowyMagazyn()
    const zapisana = zMagazynu(magazyn, wycenaWStatusie(magazyn, ['do_wyslania']))
    const { klientId: _klientId, ...bezKlientId } = zapisana

    assert.equal(modulWycen.jestWycena({ ...zapisana, klientId: 'k-anna' }), true)
    assert.equal(modulWycen.jestWycena({ ...zapisana, numer: '01/10/2026' }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, numer: '1/10/26' }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, cenaReczna: 0 }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, klientId: '' }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, klientId: 7 }), false)
    assert.equal(modulWycen.jestWycena(bezKlientId), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, klient: { ...zapisana.klient, adres: 'x'.repeat(201) } }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, klient: { ...zapisana.klient, termin: 'x'.repeat(41) } }), false)
  })

  it('rodzaje wyceny: szybka i dokladna', () => {
    assert.deepEqual(modulWycen.RODZAJE_WYCENY, ['szybka', 'dokladna'])
  })
})

describe('zapiszWejscie z wynikiem', () => {
  it('wejście i migawka w jednym zapisie; wynik null czyści migawkę szkicu', () => {
    const magazyn = nowyMagazyn()
    const { id } = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }, PAZDZIERNIK)

    zapiszWejscie(magazyn, id, { ...WEJSCIE, dojazdKm: 3 }, { wynik: migawka({ cena: 270 }) })
    const zWynikiem = zMagazynu(magazyn, id)
    zapiszWejscie(magazyn, id, { ...WEJSCIE, pomieszczenia: [] }, { wynik: null })

    assert.deepEqual([zWynikiem.wejscie.dojazdKm, zWynikiem.wynik?.cena], [3, 270])
    assert.equal(zMagazynu(magazyn, id).wynik, null)
  })

  it('wycena z numerem i wynik null: BladWyceny pusty_zakres; zła migawka: BladWyceny wynik; nic się nie zapisuje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    const przed = stanMagazynu(magazyn)

    assert.throws(() => zapiszWejscie(magazyn, id, WEJSCIE, { wynik: null }), bladWyceny('pusty_zakres'))
    assert.throws(() => zapiszWejscie(magazyn, id, WEJSCIE, { wynik: migawka({ cena: -1 }) }), bladWyceny('wynik'))
    assert.deepEqual(stanMagazynu(magazyn), przed)
  })

  it('wynik false, 0 albo pusty tekst: BladWyceny wynik; nic się nie zapisuje', () => {
    const magazyn = nowyMagazyn()
    const { id } = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }, PAZDZIERNIK)
    const przed = stanMagazynu(magazyn)

    assert.throws(() => zapiszWejscie(magazyn, id, WEJSCIE, { wynik: /** @type {never} */ (false) }), bladWyceny('wynik'))
    assert.throws(() => zapiszWejscie(magazyn, id, WEJSCIE, { wynik: /** @type {never} */ (0) }), bladWyceny('wynik'))
    assert.throws(() => zapiszWejscie(magazyn, id, WEJSCIE, { wynik: /** @type {never} */ ('') }), bladWyceny('wynik'))
    assert.deepEqual(stanMagazynu(magazyn), przed)
  })
})

describe('widełki szybkiej wyceny: stan i tryb z kontraktu silnika', () => {
  it('nieznany tryb (pomieszczenia) albo stan (standard) widełek → szybka, bez zapisu', () => {
    const magazyn = nowyMagazyn()
    const szybka = { stan: 'typowy', od: 200, do: 300, tryb: 'widelki' }

    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka: /** @type {never} */ ({ ...szybka, tryb: 'pomieszczenia' }) }),
      bladWyceny('szybka'))
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka: /** @type {never} */ ({ ...szybka, stan: 'standard' }) }),
      bladWyceny('szybka'))
    assert.deepEqual(stanMagazynu(magazyn).wyceny, [])
  })
})

describe('zapiszPolaWyceny', () => {
  it('zapisuje odpowiedzi i widełki bez wejścia: wejście, wynik i oferta zostają, zmieniona = zegar', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana'])
    const szybka = { stan: 'mocny', od: 300, do: 360, tryb: /** @type {const} */ ('widelki') }

    modulWycen.zapiszPolaWyceny(magazyn, id, () => ({ odpowiedzi: { termin: { wartosc: 'jutro' } }, szybka }), LISTOPAD)

    const po = zMagazynu(magazyn, id)
    assert.deepEqual([po.odpowiedzi, po.szybka, po.wejscie, po.wynik?.cena, po.oferta.nieaktualna, po.zmieniona],
      [{ termin: { wartosc: 'jutro' } }, szybka, WEJSCIE, 250, false, '2026-11-12T10:00:00.000Z'])
  })

  it('nowe wejście z wynikiem po wysłaniu oznacza ofertę jako nieaktualną; fn dostaje świeżą wycenę i stan magazynu', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana'])
    const nowe = { ...WEJSCIE, pomieszczenia: [{ typ: 'pokoj', m2: 30 }] }
    /** @type {unknown[]} */
    const widziane = []

    modulWycen.zapiszPolaWyceny(magazyn, id, (w, stan) => {
      widziane.push(w.status, stan.wyceny.length)
      return { wejscie: nowe, wynik: migawka({ cena: 300 }) }
    })

    const po = zMagazynu(magazyn, id)
    assert.deepEqual(widziane, ['wyslana', 1])
    assert.deepEqual([po.wejscie, po.wynik?.cena, po.oferta.nieaktualna], [nowe, 300, true])
  })

  it('odmowy: ze zleceniem → tylko_odczyt, nieznana → brak_wyceny, wejście bez wyniku → wynik, pusty zakres z numerem → pusty_zakres, zły kształt → ksztalt', () => {
    const magazyn = nowyMagazyn()
    const zeZleceniem = wycenaZeZleceniem(magazyn)
    const zNumerem = wycenaWStatusie(magazyn, ['do_wyslania'])
    const przed = stanMagazynu(magazyn)

    assert.throws(() => modulWycen.zapiszPolaWyceny(magazyn, zeZleceniem, () => ({ odpowiedzi: {} })), bladWyceny('tylko_odczyt'))
    assert.throws(() => modulWycen.zapiszPolaWyceny(magazyn, 'nie-ma', () => ({})), bladWyceny('brak_wyceny'))
    assert.throws(() => modulWycen.zapiszPolaWyceny(magazyn, zNumerem, () => ({ wejscie: WEJSCIE })), bladWyceny('wynik'))
    assert.throws(() => modulWycen.zapiszPolaWyceny(magazyn, zNumerem, () => ({ wejscie: WEJSCIE, wynik: null })), bladWyceny('pusty_zakres'))
    assert.throws(() => modulWycen.zapiszPolaWyceny(magazyn, zNumerem, () => ({ szybka: /** @type {never} */ ({ od: 'dużo' }) })), bladWyceny('ksztalt'))
    assert.deepEqual(stanMagazynu(magazyn), przed)
  })
})
