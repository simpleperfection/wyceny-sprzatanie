import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { utworzMagazyn } from './magazyn.js'
import {
  BladWyceny, MAKS_MINUT_WYKONANIA, STATUSY_WYCENY, dodajWykonanie, listaWycen, usunWycene, utworzSzkic, wycena, zapiszWejscie,
  zapiszWycene, zapiszWynik, zmienStatus,
} from './wyceny.js'
import * as modulWycen from './wyceny.js'

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
 * @param {ReturnType<typeof nowyMagazyn>} magazyn @param {import('./wyceny.js').StatusWyceny[]} statusy @param {number | null} [wizyt]
 */
function wycenaWStatusie(magazyn, statusy, wizyt = null) {
  const { id } = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }, PAZDZIERNIK)
  zapiszWynik(magazyn, id, migawka({ wizytWMiesiacu: wizyt }), PAZDZIERNIK)
  for (const status of statusy) zmienStatus(magazyn, id, status, PAZDZIERNIK)
  return id
}

/** @param {string} kod */
const bladWyceny = (kod) => ({ name: BladWyceny.name, kod })

describe('utworzSzkic', () => {
  it('zapisuje szkic bez numeru i wyniku, z pustym klientem i aktualną ofertą', () => {
    const magazyn = nowyMagazyn()

    const szkic = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE, klient: { nazwa: '  Jan Kowalski ' } }, PAZDZIERNIK)

    assert.deepEqual(zMagazynu(magazyn, szkic.id), {
      id: szkic.id, numer: null, utworzona: '2026-10-15T10:00:00.000Z', zmieniona: '2026-10-15T10:00:00.000Z', status: 'szkic',
      rodzaj: 'dokladna', klient: { nazwa: 'Jan Kowalski', adres: '', termin: null }, wejscie: WEJSCIE, szybka: null, odpowiedzi: {},
      wynik: null, cenaReczna: null, wykonania: [], oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false },
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

describe('numeracja', () => {
  it('dwie wyceny z października 2026 → 1/10/2026 i 2/10/2026, pierwsza z listopada → 1/11/2026', () => {
    const magazyn = nowyMagazyn()
    const [a, b, c] = [1, 2, 3].map(() => utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }, PAZDZIERNIK).id)
    for (const id of [a, b, c]) zapiszWynik(magazyn, id, migawka())

    zapiszWycene(magazyn, a, {}, PAZDZIERNIK)
    zapiszWycene(magazyn, b, { klient: { adres: 'ul. Polna 1' } }, PAZDZIERNIK)
    const stan = zapiszWycene(magazyn, c, {}, LISTOPAD)

    assert.deepEqual([a, b, c].map((id) => zMagazynu(magazyn, id).numer), ['1/10/2026', '2/10/2026', '1/11/2026'])
    assert.deepEqual(stan.licznikNumerow, { '2026-10': 2, '2026-11': 1 })
    assert.equal(zMagazynu(magazyn, a).status, 'do_wyslania')
    assert.equal(zMagazynu(magazyn, b).klient.adres, 'ul. Polna 1')
  })

  it('ponowny zapis zostawia numer i status; zapis bez wyniku → brak_wyniku', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana'])
    const pusty = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }).id

    zapiszWycene(magazyn, id, {}, LISTOPAD)

    assert.deepEqual([zMagazynu(magazyn, id).numer, zMagazynu(magazyn, id).status], ['1/10/2026', 'wyslana'])
    assert.throws(() => zapiszWycene(magazyn, pusty), bladWyceny('brak_wyniku'))
    assert.throws(() => zapiszWycene(magazyn, 'nie-ma'), bladWyceny('brak_wyceny'))
  })
})

describe('zmienStatus', () => {
  it('szkic → przyjeta rzuca przejscie i nic nie zapisuje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, [])

    assert.throws(() => zmienStatus(magazyn, id, 'przyjeta'), bladWyceny('przejscie'))
    assert.equal(zMagazynu(magazyn, id).status, 'szkic')
  })

  it('do_wyslania → wyslana → przyjeta → wykonana przechodzi', () => {
    const magazyn = nowyMagazyn()

    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana', 'przyjeta', 'wykonana'])

    assert.equal(zMagazynu(magazyn, id).status, 'wykonana')
    assert.equal(STATUSY_WYCENY.length, 6)
  })

  it('odrzucona wraca do do_wyslania z tym samym numerem; nieznany status → status', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'odrzucona', 'do_wyslania'])

    assert.deepEqual([zMagazynu(magazyn, id).status, zMagazynu(magazyn, id).numer], ['do_wyslania', '1/10/2026'])
    assert.throws(() => zmienStatus(magazyn, id, /** @type {never} */ ('archiwum')), bladWyceny('status'))
    assert.throws(() => zmienStatus(magazyn, id, 'wykonana'), bladWyceny('przejscie'))
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

  it('zmiana wejścia albo wyniku wykonanej wyceny rzuca tylko_odczyt', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta', 'wykonana'])

    assert.throws(() => zapiszWejscie(magazyn, id, WEJSCIE), bladWyceny('tylko_odczyt'))
    assert.throws(() => zapiszWynik(magazyn, id, migawka()), bladWyceny('tylko_odczyt'))
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

describe('dodajWykonanie', () => {
  const WPIS = { data: '2026-10-20', minuty: 240, tempoPlanu: 1.3 }

  it('0 minut i 1500 minut rzuca minuty; zła data rzuca data', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])

    assert.throws(() => dodajWykonanie(magazyn, id, { ...WPIS, minuty: 0 }), bladWyceny('minuty'))
    assert.throws(() => dodajWykonanie(magazyn, id, { ...WPIS, minuty: 1500 }), bladWyceny('minuty'))
    assert.throws(() => dodajWykonanie(magazyn, id, { ...WPIS, data: '2026-02-30' }), bladWyceny('data'))
    assert.equal(MAKS_MINUT_WYKONANIA, 1440)
    assert.deepEqual(zMagazynu(magazyn, id).wykonania, [])
  })

  it('zlecenie jednorazowe po wpisie → wykonana z jednym wpisem', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])

    dodajWykonanie(magazyn, id, { ...WPIS, minuty: MAKS_MINUT_WYKONANIA })

    const zapisana = zMagazynu(magazyn, id)
    assert.equal(zapisana.status, 'wykonana')
    assert.deepEqual(zapisana.wykonania.map(({ id: _id, ...wpis }) => wpis), [{ ...WPIS, minuty: 1440 }])
  })

  it('abonament po dwóch wizytach ma status przyjeta i dwa wpisy', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'], 4)

    dodajWykonanie(magazyn, id, WPIS)
    dodajWykonanie(magazyn, id, { ...WPIS, data: '2026-10-27', minuty: 210 })

    const zapisana = zMagazynu(magazyn, id)
    assert.equal(zapisana.status, 'przyjeta')
    assert.deepEqual(zapisana.wykonania.map((w) => [w.data, w.minuty]), [['2026-10-20', 240], ['2026-10-27', 210]])
  })

  it('wycena nieprzyjęta → przejscie, wykonana → tylko_odczyt', () => {
    const magazyn = nowyMagazyn()
    const doWyslania = wycenaWStatusie(magazyn, ['do_wyslania'])
    const wykonana = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta', 'wykonana'])

    assert.throws(() => dodajWykonanie(magazyn, doWyslania, WPIS), bladWyceny('przejscie'))
    assert.throws(() => dodajWykonanie(magazyn, wykonana, WPIS), bladWyceny('tylko_odczyt'))
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
})

describe('abonament biura z ułamkową liczbą wizyt i jednorazowe biuro', () => {
  const WPIS = { data: '2026-10-20', minuty: 240, tempoPlanu: 1.3 }

  it('migawka abonamentu z 4,33, 8,67 i 21,67 wizyty w miesiącu zapisuje się i przechodzi do przyjeta', () => {
    const magazyn = nowyMagazyn()

    const zapisane = [4.33, 8.67, 21.67].map((wizyt) => zMagazynu(magazyn, wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'], wizyt)))

    assert.deepEqual(zapisane.map((w) => [w.status, w.wynik?.wizytWMiesiacu]), [['przyjeta', 4.33], ['przyjeta', 8.67], ['przyjeta', 21.67]])
  })

  it('jednorazowe biuro (1 wizyta w miesiącu) po wpisie → wykonana; abonament 3× w tygodniu (13) zostaje przyjeta', () => {
    const magazyn = nowyMagazyn()
    const jednorazowe = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'], 1)
    const abonament = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'], 13)

    dodajWykonanie(magazyn, jednorazowe, WPIS)
    dodajWykonanie(magazyn, abonament, WPIS)

    assert.equal(zMagazynu(magazyn, jednorazowe).status, 'wykonana')
    assert.equal(zMagazynu(magazyn, abonament).status, 'przyjeta')
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
    const szybka = { stan: 'standard', od: 200, do: 300, tryb: 'pomieszczenia' }

    const szkic = utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka })

    assert.deepEqual(zMagazynu(magazyn, szkic.id).szybka, szybka)
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, szybka: /** @type {never} */ ({ ...szybka, do: 'x' }) }),
      bladWyceny('szybka'))
    assert.throws(() => utworzSzkic(magazyn, { rodzaj: 'szybka', wejscie: WEJSCIE, odpowiedzi: /** @type {never} */ ([]) }), bladWyceny('odpowiedzi'))
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

  it('tempo planu 0 → tempo, bez wpisu', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])

    assert.throws(() => dodajWykonanie(magazyn, id, { data: '2026-10-20', minuty: 240, tempoPlanu: 0 }), bladWyceny('tempo'))
    assert.deepEqual(zMagazynu(magazyn, id).wykonania, [])
  })

  it('przyjęta wycena z datą wysłania oferty: zmiana wejścia → oferta nieaktualna', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
    const stan = stanMagazynu(magazyn)
    magazyn.zapiszCalosc({ ...stan, wyceny: stan.wyceny.map((w) => ({ ...w, oferta: { ...w.oferta, wyslana: '2026-10-16T09:00:00.000Z' } })) })

    zapiszWejscie(magazyn, id, { ...WEJSCIE, dojazdKm: 5 })

    assert.equal(zMagazynu(magazyn, id).status, 'przyjeta')
    assert.equal(zMagazynu(magazyn, id).oferta.nieaktualna, true)
  })
})

describe('dodajWykonanie z identyfikatorem wpisu', () => {
  const WPIS = { id: 'wpis-1', data: '2026-10-20', minuty: 240, tempoPlanu: 1.3 }

  it('ponowny zapis wpisu o tym samym id nie dopisuje drugiej wizyty abonamentu ani nie rzuca przy zleceniu wykonanym', () => {
    const magazyn = nowyMagazyn()
    const abonament = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'], 4.33)
    const jednorazowe = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])

    dodajWykonanie(magazyn, abonament, WPIS)
    dodajWykonanie(magazyn, abonament, WPIS)
    dodajWykonanie(magazyn, jednorazowe, WPIS)
    const poDrugimKliknieciu = dodajWykonanie(magazyn, jednorazowe, WPIS)

    assert.deepEqual(zMagazynu(magazyn, abonament).wykonania, [WPIS])
    assert.deepEqual(wycena(poDrugimKliknieciu, jednorazowe)?.wykonania, [WPIS])
    assert.equal(zMagazynu(magazyn, jednorazowe).status, 'wykonana')
  })

  it('pusty identyfikator wpisu → id', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])

    assert.throws(() => dodajWykonanie(magazyn, id, { ...WPIS, id: '' }), bladWyceny('id'))
  })

  it('identyfikator liczbą 42, null albo 2001 znaków → id, bez wpisu', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])

    assert.throws(() => dodajWykonanie(magazyn, id, { ...WPIS, id: /** @type {never} */ (42) }), bladWyceny('id'))
    assert.throws(() => dodajWykonanie(magazyn, id, { ...WPIS, id: /** @type {never} */ (null) }), bladWyceny('id'))
    assert.throws(() => dodajWykonanie(magazyn, id, { ...WPIS, id: 'x'.repeat(2001) }), bladWyceny('id'))
    assert.deepEqual(zMagazynu(magazyn, id).wykonania, [])
    assert.equal(zMagazynu(magazyn, id).status, 'przyjeta')
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

  it('numer 01/10/2026 albo 1/10/26, cena ręczna 0, wykonanie z tempem 0 albo pustym id, adres 201 i termin 41 znaków → false', () => {
    const magazyn = nowyMagazyn()
    const zapisana = zMagazynu(magazyn, wycenaWStatusie(magazyn, ['do_wyslania']))
    const wykonanie = { id: 'wpis-1', data: '2026-10-20', minuty: 240, tempoPlanu: 1.3 }
    const zWykonaniem = (/** @type {object} */ zmiana) => ({ ...zapisana, wykonania: [{ ...wykonanie, ...zmiana }] })

    assert.equal(modulWycen.jestWycena(zWykonaniem({})), true)
    assert.equal(modulWycen.jestWycena({ ...zapisana, numer: '01/10/2026' }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, numer: '1/10/26' }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, cenaReczna: 0 }), false)
    assert.equal(modulWycen.jestWycena(zWykonaniem({ tempoPlanu: 0 })), false)
    assert.equal(modulWycen.jestWycena(zWykonaniem({ id: '' })), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, klient: { ...zapisana.klient, adres: 'x'.repeat(201) } }), false)
    assert.equal(modulWycen.jestWycena({ ...zapisana, klient: { ...zapisana.klient, termin: 'x'.repeat(41) } }), false)
  })

  it('rodzaje wyceny: szybka i dokladna', () => {
    assert.deepEqual(modulWycen.RODZAJE_WYCENY, ['szybka', 'dokladna'])
  })
})
