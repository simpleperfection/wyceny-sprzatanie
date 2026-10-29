import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { dodajKlienta } from './klienci.js'
import { utworzMagazyn } from './magazyn.js'
import {
  BladWyceny, czyAbonament, czyStatusOferty, dozwolonePrzejscia, jestWycena, oznaczWyslana, STATUSY_OFERTY, STATUSY_WYCENY, utworzSzkic,
  przypiszKlienta, wycena, zapiszOferte, zapiszWejscie, zapiszWycene, zapiszWynik, zapiszWyslanieOferty, zmienStatus,
} from './wyceny.js'
import * as modulWycen from './wyceny.js'
import { zaplanujZWyceny } from './zlecenia.js'

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

/** Przyjeta wycena ze zleceniem (tylko do odczytu). @param {ReturnType<typeof nowyMagazyn>} magazyn */
function wycenaZeZleceniem(magazyn) {
  const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
  dodajKlienta(magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1' })
  zaplanujZWyceny(magazyn, id, { klientId: 'k1', rozliczenie: 'za_wizyte', start: '2026-10-20', cenaWizyty: 250, tempo: 1.3 }, { id: `z-${id}` })
  return id
}

/** @param {string} kod */
const bladWyceny = (kod) => ({ name: BladWyceny.name, kod })

describe('STATUSY_WYCENY i zmienStatus', () => {
  it('statusy kończą się na przyjętej albo odrzuconej, bez wykonanej', () => {
    assert.deepEqual(STATUSY_WYCENY, ['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona'])
  })

  it('szkic → przyjeta rzuca przejscie i nic nie zapisuje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, [])

    assert.throws(() => zmienStatus(magazyn, id, 'przyjeta'), bladWyceny('przejscie'))
    assert.equal(zMagazynu(magazyn, id).status, 'szkic')
  })

  it('do_wyslania → wyslana → przyjeta → odrzucona przechodzi (rezygnacja klienta po przyjęciu)', () => {
    const magazyn = nowyMagazyn()

    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana', 'przyjeta', 'odrzucona'])

    assert.deepEqual([zMagazynu(magazyn, id).status, zMagazynu(magazyn, id).numer], ['odrzucona', '1/10/2026'])
  })

  it('przyjęta ze zleceniem może przejść w odrzuconą, a zlecenie zostaje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaZeZleceniem(magazyn)

    const stan = zmienStatus(magazyn, id, 'odrzucona', LISTOPAD)

    assert.equal(wycena(stan, id)?.status, 'odrzucona')
    assert.deepEqual(stan.zlecenia.map((z) => [z.id, z.wycenaId]), [[`z-${id}`, id]])
  })

  it('odrzucona wraca do do_wyslania z tym samym numerem; nieznany status i wykonana → status', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'odrzucona', 'do_wyslania'])

    assert.deepEqual([zMagazynu(magazyn, id).status, zMagazynu(magazyn, id).numer], ['do_wyslania', '1/10/2026'])
    assert.throws(() => zmienStatus(magazyn, id, /** @type {never} */ ('archiwum')), bladWyceny('status'))
    assert.throws(() => zmienStatus(magazyn, id, /** @type {never} */ ('wykonana')), bladWyceny('status'))
  })
})

describe('dozwolonePrzejscia, czyAbonament i jestWycena ze statusem', () => {
  it('do wysłania: wysłanie i decyzja klienta; przyjęta: rezygnacja; nieznany status bez przejść', () => {
    assert.deepEqual(dozwolonePrzejscia('do_wyslania'), ['wyslana', 'przyjeta', 'odrzucona'])
    assert.deepEqual(dozwolonePrzejscia('przyjeta'), ['odrzucona'])
    assert.deepEqual(dozwolonePrzejscia(/** @type {any} */ ('wykonana')), [])
  })

  it('abonament to więcej niż 1 wizyta w miesiącu; null i 1 wizyta to zlecenie jednorazowe', () => {
    assert.deepEqual([4.33, 1, null].map((wizytWMiesiacu) => czyAbonament({ wizytWMiesiacu })), [true, false, false])
  })

  it('status wykonana w stanie v2 odrzuca jestWycena; przyjęta przechodzi', () => {
    const magazyn = nowyMagazyn()
    const przyjeta = zMagazynu(magazyn, wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta']))

    assert.equal(jestWycena(przyjeta), true)
    assert.equal(jestWycena({ ...przyjeta, status: 'wykonana' }), false)
  })
})

describe('oznaczWyslana', () => {
  it('zmienia status z do_wyslania na wyslana, zapisuje datę wysłania i kasuje nieaktualna', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    oznaczWyslana(magazyn, id, PAZDZIERNIK)
    zmienStatus(magazyn, id, 'odrzucona', PAZDZIERNIK)
    zmienStatus(magazyn, id, 'do_wyslania', PAZDZIERNIK)
    zapiszWynik(magazyn, id, migawka({ cena: 300, netto: 300 }), PAZDZIERNIK)
    const przed = zMagazynu(magazyn, id)

    oznaczWyslana(magazyn, id, LISTOPAD)

    const po = zMagazynu(magazyn, id)
    assert.deepEqual([przed.status, przed.oferta.nieaktualna], ['do_wyslania', true])
    assert.deepEqual([po.status, po.oferta.nieaktualna, po.oferta.wyslana], ['wyslana', false, '2026-11-12T10:00:00.000Z'])
  })

  it('przyjęta zostaje przyjęta; szkic i wycena ze zleceniem → BladWyceny', () => {
    const magazyn = nowyMagazyn()
    const przyjeta = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
    const szkic = wycenaWStatusie(magazyn, [])
    const zeZleceniem = wycenaZeZleceniem(magazyn)

    oznaczWyslana(magazyn, przyjeta, LISTOPAD)

    assert.deepEqual([zMagazynu(magazyn, przyjeta).status, zMagazynu(magazyn, przyjeta).oferta.wyslana], ['przyjeta', '2026-11-12T10:00:00.000Z'])
    assert.throws(() => oznaczWyslana(magazyn, szkic), bladWyceny('przejscie'))
    assert.throws(() => oznaczWyslana(magazyn, zeZleceniem), bladWyceny('tylko_odczyt'))
    assert.throws(() => oznaczWyslana(magazyn, 'nie-ma'), bladWyceny('brak_wyceny'))
  })
})

describe('zapiszWyslanieOferty', () => {
  it('wycena bez zlecenia: ważność z linku, gdy jej nie było, i status wyslana', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])

    const czyZapisane = zapiszWyslanieOferty(magazyn, id, '2026-11-26', LISTOPAD)

    const w = zMagazynu(magazyn, id)
    assert.equal(czyZapisane, true)
    assert.deepEqual([w.status, w.oferta.waznaDo, w.oferta.wyslana], ['wyslana', '2026-11-26', '2026-11-12T10:00:00.000Z'])
  })

  it('Kopiuj link w wycenie ze zleceniem: nic nie zapisuje i nie rzuca', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
    zapiszOferte(magazyn, id, { waznaDo: '2026-11-30' }, PAZDZIERNIK)
    dodajKlienta(magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1' })
    zaplanujZWyceny(magazyn, id, { klientId: 'k1', rozliczenie: 'za_wizyte', start: '2026-10-20', cenaWizyty: 250, tempo: 1.3 }, { id: `z-${id}` })
    const przed = zMagazynu(magazyn, id)

    const czyZapisane = zapiszWyslanieOferty(magazyn, id, '2026-11-30', LISTOPAD)

    assert.equal(czyZapisane, false)
    assert.deepEqual(zMagazynu(magazyn, id), przed)
  })

  it('zlecenie z drugiej karty po otwarciu ekranu oferty: wysłanie sprawdza świeży stan i nic nie zapisuje', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
    const przyOtwarciu = stanMagazynu(magazyn)
    dodajKlienta(magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1' })
    zaplanujZWyceny(magazyn, id, { klientId: 'k1', rozliczenie: 'za_wizyte', start: '2026-10-20', cenaWizyty: 250, tempo: 1.3 }, { id: `z-${id}` })
    const przed = zMagazynu(magazyn, id)

    const czyZapisane = zapiszWyslanieOferty(magazyn, id, '2026-11-26', LISTOPAD)

    assert.deepEqual(przyOtwarciu.zlecenia, [])
    assert.equal(czyZapisane, false)
    assert.deepEqual(zMagazynu(magazyn, id), przed)
  })

  it('PDF z gotowym linkiem w wycenie ze zleceniem bez daty ważności: data z linku nie trafia do wyceny', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaZeZleceniem(magazyn)
    const przed = zMagazynu(magazyn, id)

    const czyZapisane = zapiszWyslanieOferty(magazyn, id, '2026-11-26', LISTOPAD)

    assert.equal(przed.oferta.waznaDo, null)
    assert.equal(czyZapisane, false)
    assert.deepEqual(zMagazynu(magazyn, id), przed)
  })
})

describe('zapiszOferte', () => {
  it('zapisuje zakres z przyciętymi punktami, warunki, ważność i klienta tylko w tej wycenie', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    const warunki = [{ id: 'zaliczka', tresc: ' Bez zaliczki. ', tylko_szybka: false }]

    zapiszOferte(magazyn, id, { zakres: { wchodzi: [' Podłogi '], nie_wchodzi: [] }, warunki, waznaDo: '2026-11-30',
      klient: { nazwa: ' Marzena Wróbel ' } }, LISTOPAD)

    const w = zMagazynu(magazyn, id)
    assert.deepEqual(w.oferta, { zakres: { wchodzi: ['Podłogi'], nie_wchodzi: [] }, warunki: [{ id: 'zaliczka', tresc: 'Bez zaliczki.', tylko_szybka: false }],
      waznaDo: '2026-11-30', wyslana: null, nieaktualna: false })
    assert.equal(w.klient.nazwa, 'Marzena Wróbel')
  })

  it('null wraca do zakresu i warunków z ustawień; zmiana po wysłaniu oznacza ofertę jako nieaktualną, ta sama wartość nie', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    zapiszOferte(magazyn, id, { zakres: { wchodzi: ['Podłogi'], nie_wchodzi: [] } }, PAZDZIERNIK)
    oznaczWyslana(magazyn, id, PAZDZIERNIK)

    zapiszOferte(magazyn, id, { zakres: { wchodzi: ['Podłogi'], nie_wchodzi: [] } }, LISTOPAD)
    const takSamo = zMagazynu(magazyn, id).oferta.nieaktualna
    zapiszOferte(magazyn, id, { zakres: null, warunki: null }, LISTOPAD)

    const po = zMagazynu(magazyn, id).oferta
    assert.equal(takSamo, false)
    assert.deepEqual([po.zakres, po.warunki, po.nieaktualna], [null, null, true])
  })

  it('nieznane pole, zła data, pusty punkt i szkic → błąd bez zapisu', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    const szkic = wycenaWStatusie(magazyn, [])

    assert.throws(() => zapiszOferte(magazyn, id, /** @type {never} */ ({ cena: 1 })), bladWyceny('oferta'))
    assert.throws(() => zapiszOferte(magazyn, id, { waznaDo: '30.11.2026' }), bladWyceny('wazna_do'))
    assert.throws(() => zapiszOferte(magazyn, id, { zakres: { wchodzi: ['  '], nie_wchodzi: [] } }),
      { name: 'BladUstawien', kod: 'pusty', pole: 'oferta.zakres.wchodzi.0' })
    assert.throws(() => zapiszOferte(magazyn, szkic, { waznaDo: '2026-11-30' }), bladWyceny('przejscie'))
    assert.equal(zMagazynu(magazyn, id).oferta.zakres, null)
  })
})

describe('zapiszOferte i oznaczWyslana: bramki statusu i strażnik oferty w wycenie', () => {
  it('wycena ze zleceniem → tylko_odczyt, odrzucona → przejscie (status spoza STATUSY_OFERTY); oferta bez zmian', () => {
    const magazyn = nowyMagazyn()
    const zeZleceniem = wycenaZeZleceniem(magazyn)
    const odrzucona = wycenaWStatusie(magazyn, ['do_wyslania', 'odrzucona'])

    assert.throws(() => zapiszOferte(magazyn, zeZleceniem, { waznaDo: '2026-11-30' }), bladWyceny('tylko_odczyt'))
    assert.throws(() => zapiszOferte(magazyn, odrzucona, { waznaDo: '2026-11-30' }), bladWyceny('przejscie'))
    assert.throws(() => oznaczWyslana(magazyn, odrzucona), bladWyceny('przejscie'))
    assert.deepEqual([zMagazynu(magazyn, zeZleceniem).oferta.waznaDo, zMagazynu(magazyn, odrzucona).oferta.waznaDo], [null, null])
    assert.equal(zMagazynu(magazyn, odrzucona).oferta.wyslana, null)
  })

  it('czyStatusOferty: ofertę przygotowuje się z do_wyslania, wyslana i przyjeta (STATUSY_OFERTY)', () => {
    assert.deepEqual(STATUSY_WYCENY.filter(czyStatusOferty), [...STATUSY_OFERTY])
    assert.deepEqual(STATUSY_OFERTY, ['do_wyslania', 'wyslana', 'przyjeta'])
  })

  it('jestWycena odrzuca ofertę z datą ważności spoza RRRR-MM-DD, datą wysłania „wczoraj” i punktem zakresu ponad 500 znaków', () => {
    const magazyn = nowyMagazyn()
    const zapisana = zMagazynu(magazyn, wycenaWStatusie(magazyn, ['do_wyslania']))
    const zOferta = (/** @type {object} */ zmiana) => ({ ...zapisana, oferta: { ...zapisana.oferta, ...zmiana } })

    assert.equal(jestWycena(zOferta({ waznaDo: '2026-11-07', wyslana: '2026-10-15T10:00:00.000Z' })), true)
    assert.equal(jestWycena(zOferta({ waznaDo: '7.11.2026' })), false)
    assert.equal(jestWycena(zOferta({ wyslana: 'wczoraj' })), false)
    assert.equal(jestWycena(zOferta({ zakres: { wchodzi: ['x'.repeat(501)], nie_wchodzi: [] } })), false)
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

describe('abonament biura z ułamkową liczbą wizyt i jednorazowe biuro', () => {
  it('migawka abonamentu z 4,33, 8,67 i 21,67 wizyty w miesiącu zapisuje się i przechodzi do przyjeta', () => {
    const magazyn = nowyMagazyn()

    const zapisane = [4.33, 8.67, 21.67].map((wizyt) => zMagazynu(magazyn, wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'], wizyt)))

    assert.deepEqual(zapisane.map((w) => [w.status, w.wynik?.wizytWMiesiacu]), [['przyjeta', 4.33], ['przyjeta', 8.67], ['przyjeta', 21.67]])
  })
})

describe('zapiszCeneReczna', () => {
  it('cena ręczna i powrót do modelu; po wysłaniu inna kwota unieważnia ofertę, ta sama nie', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'wyslana'])

    modulWycen.zapiszCeneReczna(magazyn, id, 250)
    const taSama = zMagazynu(magazyn, id)
    modulWycen.zapiszCeneReczna(magazyn, id, 300)

    assert.deepEqual([taSama.cenaReczna, taSama.oferta.nieaktualna], [250, false])
    assert.deepEqual([zMagazynu(magazyn, id).cenaReczna, zMagazynu(magazyn, id).oferta.nieaktualna], [300, true])
  })

  it('kwota niedodatnia: cena_reczna; szkic bez wyniku: brak_wyniku; wycena ze zleceniem: tylko_odczyt', () => {
    const magazyn = nowyMagazyn()
    const { id: szkic } = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: WEJSCIE }, PAZDZIERNIK)
    const zeZleceniem = wycenaZeZleceniem(magazyn)

    assert.throws(() => modulWycen.zapiszCeneReczna(magazyn, szkic, 0), bladWyceny('cena_reczna'))
    assert.throws(() => modulWycen.zapiszCeneReczna(magazyn, szkic, 300), bladWyceny('brak_wyniku'))
    assert.throws(() => modulWycen.zapiszCeneReczna(magazyn, zeZleceniem, 300), bladWyceny('tylko_odczyt'))
    assert.equal(zMagazynu(magazyn, zeZleceniem).cenaReczna, null)
  })
})

describe('zmiany po wysłaniu oferty: wejście przyjętej wyceny i klient z listy', () => {
  it('przyjęta wycena z datą wysłania oferty: zmiana wejścia → oferta nieaktualna', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania', 'przyjeta'])
    const stan = stanMagazynu(magazyn)
    magazyn.zapiszCalosc({ ...stan, wyceny: stan.wyceny.map((w) => ({ ...w, oferta: { ...w.oferta, wyslana: '2026-10-16T09:00:00.000Z' } })) })

    zapiszWejscie(magazyn, id, { ...WEJSCIE, dojazdKm: 5 })

    assert.equal(zMagazynu(magazyn, id).status, 'przyjeta')
    assert.equal(zMagazynu(magazyn, id).oferta.nieaktualna, true)
  })

  it('po wysłaniu oferty inny klient ustawia ofertę jako nieaktualną; null odłącza klienta i zostawia kopię nazwy', () => {
    const magazyn = nowyMagazyn()
    const id = wycenaWStatusie(magazyn, ['do_wyslania'])
    oznaczWyslana(magazyn, id, PAZDZIERNIK)
    dodajKlienta(magazyn, { nazwa: 'Jan Nowak' }, { id: 'k-jan' })

    przypiszKlienta(magazyn, id, 'k-jan')
    const poWyborze = zMagazynu(magazyn, id)
    przypiszKlienta(magazyn, id, null)

    assert.deepEqual([poWyborze.klientId, poWyborze.klient.nazwa, poWyborze.klient.adres, poWyborze.oferta.nieaktualna], ['k-jan', 'Jan Nowak', '', true])
    assert.deepEqual([zMagazynu(magazyn, id).klientId, zMagazynu(magazyn, id).klient.nazwa], [null, 'Jan Nowak'])
  })
})
