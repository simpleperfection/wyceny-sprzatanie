import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { assertBlisko, czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { dodajKlienta } from '../dane/klienci.js'
import { utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { wpiszCzasPracy } from '../dane/wizyty.js'
import { wycena, zapiszWycene, zmienStatus } from '../dane/wyceny.js'
import { zaplanujZWyceny } from '../dane/zlecenia.js'
import { kosztPrzyTempie } from '../kreator/podsumowanie.js'
import { nowySzkic, zmienWejscie } from '../kreator/stan.js'
import { BladWejscia } from '../silnik/bledy.js'
import { tempoWlasne, wpisyTempa } from '../silnik/tempo.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { procent } from '../ui/format.js'
import { daneTempa } from './dane-tempa.js'
import { czasStartowy, historiaPlanuIFaktu, KROK_CZASU, planIFaktWizyty, planZakonczenia, poprawnyCzas } from './plan-fakt.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie */
/** @typedef {import('../dane/zlecenia-ksztalt.js').StanWizyty} StanWizyty */
/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */

const KURZ_1 = { id: 'kurz', poziom: 1 }
const NORMA_MIESZKANIA_50 = 230.82
const DOKLADNOSC_ZL = 1e-3
/** Realna stawka wizyty 330 min mieszkania 50 m² przy cenie ręcznej 400 zł (zwolniony z VAT, mazowieckie). */
const STAWKA_RECZNA_330 = 69.929

/** @type {Katalog} */
let katalog
/** @type {Domyslne} */
let domyslne

before(async () => {
  katalog = await katalogZDysku()
  domyslne = await wczytajDomyslne(czytajJson)
})

/** Chwila w poludnie UTC: ten sam dzien lokalny w kazdej strefie od −11 do +11 h. @param {string} dzien @param {string} [godzina] */
const chwila = (dzien, godzina = '12:00') => `${dzien}T${godzina}:00.000Z`

/** @param {Partial<StanWizyty>} pola @returns {StanWizyty} */
const wizyta = (pola) => ({ przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null, ...pola })

/**
 * Zlecenie za wizyte (seria tygodniowa w srody, gdy `wizyty` ma kilka dni); plan null = zlecenie reczne.
 * @param {{ id: string, uslugaId?: string | null, wycenaId?: string | null, plan?: { minutyNormowe: number, tempo: number } | null,
 *   wizyty?: Record<string, StanWizyty> }} p
 * @returns {Zlecenie}
 */
function zlecenieRek({ id, uslugaId = 'mieszkanie_standard', wycenaId = null, plan = null, wizyty = {} }) {
  return { id, klientId: 'k1', wycenaId, uslugaId, opis: null, rozliczenie: 'za_wizyte', start: '2026-10-21',
    okresy: [{ od: '2026-10-21', cykl: { co: 'tydzien', dni: [3] }, godzina: null, cenaWizyty: 250, cenaMiesiaca: null }],
    koniec: null, plan, wizyty, zaplatyMiesieczne: {}, utworzone: chwila('2026-10-20'), zmienione: chwila('2026-10-20') }
}

/** Mazowieckie, firma zwolniona z VAT, tempo domyslne 1,3. @returns {DaneAplikacji} */
function kontekstFirmy() {
  const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
  zapiszUstawienia(magazyn, { wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony' }, domyslne)
  return { katalog, domyslne, magazyn }
}

/** Przyjeta wycena mieszkania 50 m² standard (czas normowy 230,82 min). @param {DaneAplikacji} kontekst @returns {Wycena} */
function przyjeteMieszkanie(kontekst) {
  const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
  const pomieszczenia = ukladMieszkania(50, {}, katalog.uklady).map((p) => ({ ...p, brud: [{ ...KURZ_1 }] }))
  zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia, dojazdKm: 0 }))
  zapiszWycene(kontekst.magazyn, id)
  const w = wycena(zmienStatus(kontekst.magazyn, id, 'przyjeta'), id)
  if (!w) throw new Error('brak wyceny w teście')
  return w
}

/**
 * Stan z przyjeta wycena mieszkania i zleceniami z niej (plan: norma wyceny × tempo).
 * @param {(w: Wycena) => Zlecenie[]} zlecenia
 * @returns {{ stan: Stan, w: Wycena }}
 */
function stanZWycena(zlecenia) {
  const kontekst = kontekstFirmy()
  const w = przyjeteMieszkanie(kontekst)
  return { stan: { ...wczytajStan(kontekst.magazyn), zlecenia: zlecenia(w) }, w }
}

/** @param {Wycena} w @param {number} tempo */
const planZ = (w, tempo) => ({ minutyNormowe: w.wynik?.minutyNormowe ?? Number.NaN, tempo })

describe('daneTempa', () => {
  it('dwa zlecenia z planem (270 i 300 min) i zlecenie ręczne bez planu dają dwa elementy w kształcie WycenaTempa', () => {
    const stan = { zlecenia: [
      zlecenieRek({ id: 'z1', plan: { minutyNormowe: 200, tempo: 1.3 }, wizyty: { '2026-10-21': wizyta({ minutyPracy: 270 }) } }),
      zlecenieRek({ id: 'reczne', wizyty: { '2026-10-21': wizyta({ minutyPracy: 120 }) } }),
      zlecenieRek({ id: 'z2', uslugaId: 'okna', plan: { minutyNormowe: 250, tempo: 1.2 },
        wizyty: { '2026-10-28': wizyta({ minutyPracy: 300 }), '2026-10-21': wizyta({ zrobiona: chwila('2026-10-21') }) } }),
    ] }

    const dane = daneTempa(stan)

    assert.deepEqual(dane, [
      { id: 'z1', wejscie: { uslugaId: 'mieszkanie_standard' }, wynik: { minutyNormowe: 200 },
        wykonania: [{ id: 'z1:2026-10-21', data: '2026-10-21', minuty: 270 }] },
      { id: 'z2', wejscie: { uslugaId: 'okna' }, wynik: { minutyNormowe: 250 }, wykonania: [{ id: 'z2:2026-10-28', data: '2026-10-28', minuty: 300 }] },
    ])
  })

  it('tempoWlasne z trzech wizyt mieszkania (260, 300 i 240 min przy normie 200) daje medianę 1,3 osobną dla usługi', () => {
    const stan = { zlecenia: [zlecenieRek({ id: 'z1', plan: { minutyNormowe: 200, tempo: 1.3 }, wizyty: {
      '2026-10-21': wizyta({ minutyPracy: 260 }), '2026-10-28': wizyta({ minutyPracy: 300 }), '2026-11-04': wizyta({ minutyPracy: 240 }),
    } })] }

    assert.deepEqual(tempoWlasne(daneTempa(stan), 'mieszkanie_standard'), { wartosc: 1.3, liczba: 3, zakres: 'usluga' })
  })

  it('wizyta przesunięta liczy się w dniu przesunięcia, a dwie wizyty tego dnia idą według „Zrobione”, bez niego na końcu', () => {
    const stan = { zlecenia: [zlecenieRek({ id: 'z1', plan: { minutyNormowe: 200, tempo: 1.3 }, wizyty: {
      '2026-10-21': wizyta({ przeniesiona: { data: '2026-10-28', godzina: null }, zrobiona: chwila('2026-10-28', '15:00'), minutyPracy: 240 }),
      '2026-10-28': wizyta({ zrobiona: chwila('2026-10-28', '09:00'), minutyPracy: 260 }),
      '2026-11-04': wizyta({ przeniesiona: { data: '2026-10-28', godzina: null }, minutyPracy: 280 }),
    } })] }

    const [element] = daneTempa(stan)

    assert.deepEqual(element?.wykonania.map((x) => [x.id, x.data]),
      [['z1:2026-10-28', '2026-10-28'], ['z1:2026-10-21', '2026-10-28'], ['z1:2026-11-04', '2026-10-28']])
    assert.equal(wpisyTempa(daneTempa(stan))[0]?.wykonanieId, 'z1:2026-11-04')
  })

  it('zlecenie z planem bez wizyt z czasem pracy nie daje elementu, a stan bez listy zleceń daje BladWejscia', () => {
    const stan = { zlecenia: [zlecenieRek({ id: 'z1', plan: { minutyNormowe: 200, tempo: 1.3 },
      wizyty: { '2026-10-21': wizyta({ zrobiona: chwila('2026-10-21') }) } })] }

    assert.deepEqual(daneTempa(stan), [])
    assert.throws(() => daneTempa(/** @type {never} */ ({ wyceny: [] })), (b) => b instanceof BladWejscia && b.kod === 'zlecenia')
  })
})

describe('poprawnyCzas', () => {
  it('330 min jest poprawne', () => {
    assert.equal(poprawnyCzas(330), null)
  })

  it('0 min, 1500 min i NaN dają kod błędu, a pełna doba (1440 min) przechodzi', () => {
    assert.deepEqual([poprawnyCzas(0), poprawnyCzas(1500), poprawnyCzas(Number.NaN), poprawnyCzas(1440)],
      ['czas_poza_zakresem', 'czas_poza_zakresem', 'czas_poza_zakresem', null])
  })
})

describe('czasStartowy', () => {
  it('plan 266 min (norma 204,6 × tempo planu 1,3) startuje licznik od 270 min, co 15 min', () => {
    const z = zlecenieRek({ id: 'z1', plan: { minutyNormowe: 204.6, tempo: 1.3 } })

    assert.deepEqual([czasStartowy(z), KROK_CZASU], [270, 15])
  })

  it('mieszkanie 50 m² (plan 300,07 min) startuje od 300 min, a tempo planu 1,5 od 345 min', () => {
    const planMieszkania = (tempo) => zlecenieRek({ id: 'z1', plan: { minutyNormowe: NORMA_MIESZKANIA_50, tempo } })

    assert.deepEqual([czasStartowy(planMieszkania(1.3)), czasStartowy(planMieszkania(1.5))], [300, 345])
  })

  it('plan krótszy niż krok startuje od 15 min, plan ponad dobę od 1440 min', () => {
    assert.deepEqual([czasStartowy(zlecenieRek({ id: 'a', plan: { minutyNormowe: 4, tempo: 1 } })),
      czasStartowy(zlecenieRek({ id: 'b', plan: { minutyNormowe: 1200, tempo: 1.5 } }))], [15, 1440])
  })

  it('zlecenie bez planu daje BladWejscia plan', () => {
    assert.throws(() => czasStartowy(zlecenieRek({ id: 'reczne' })), (b) => b instanceof BladWejscia && b.kod === 'plan')
  })
})

describe('planZakonczenia', () => {
  it('mieszkanie 50 m² z tempem planu 1,3: plan 300 min i 46,912 zł za godzinę', () => {
    const { stan, w } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: planZ(x, 1.3) })])

    const plan = planZakonczenia(stan.zlecenia[0], stan, katalog)

    assert.deepEqual([plan.plan, plan.tempoPlanu], [300, 1.3])
    assertBlisko(plan.stawkaPlanu ?? Number.NaN, 46.912, DOKLADNOSC_ZL)
    assertBlisko(plan.stawkaPlanu ?? Number.NaN, kosztPrzyTempie(w, katalog, 1.3, stan.ustawienia).zostajeNaGodzine)
  })

  it('zlecenie z planem bez wyceny ma plan bez stawki, a zlecenie bez planu daje BladWejscia plan', () => {
    const z = zlecenieRek({ id: 'z1', plan: { minutyNormowe: NORMA_MIESZKANIA_50, tempo: 1.3 } })
    const stan = { zlecenia: [z], wyceny: [], ustawienia: null }

    assert.deepEqual(planZakonczenia(z, stan, katalog), { plan: 300, tempoPlanu: 1.3, stawkaPlanu: null })
    assert.throws(() => planZakonczenia(zlecenieRek({ id: 'r' }), stan, katalog), (b) => b instanceof BladWejscia && b.kod === 'plan')
  })
})

describe('historiaPlanuIFaktu', () => {
  it('wizyta 330 min przy tempie planu 1,3: plan 300, fakt 330, +10% i realna stawka 42,657 zł/h', () => {
    const { stan, w } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: planZ(x, 1.3),
      wizyty: { '2026-10-21': wizyta({ zrobiona: chwila('2026-10-21'), minutyPracy: 330 }) } })])

    const [wiersz, ...reszta] = historiaPlanuIFaktu(stan, katalog)

    assert.deepEqual({ ...wiersz, procent: procent(wiersz?.procent ?? Number.NaN), stawka: null },
      { zlecenieId: 'z1', dataPierwotna: '2026-10-21', data: '2026-10-21', uslugaId: 'mieszkanie_standard', plan: 300, fakt: 330,
        procent: '+10%', stawka: null })
    assertBlisko(wiersz?.stawka ?? Number.NaN, 42.657, DOKLADNOSC_ZL)
    assertBlisko(wiersz?.stawka ?? Number.NaN, kosztPrzyTempie(w, katalog, 330 / NORMA_MIESZKANIA_50, stan.ustawienia).zostajeNaGodzine)
    assert.equal(reszta.length, 0)
  })

  it('plan liczy się z tempa planu zlecenia (1,5), a nie z bieżącego tempa firmy: plan 346, fakt 330, -5%', () => {
    const { stan } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: planZ(x, 1.5),
      wizyty: { '2026-10-21': wizyta({ minutyPracy: 330 }) } })])

    const [wiersz] = historiaPlanuIFaktu(stan, katalog)

    assert.deepEqual([wiersz?.plan, wiersz?.fakt, procent(wiersz?.procent ?? Number.NaN)], [346, 330, '-5%'])
  })

  it('wizyta przesunięta ma dzień przesunięcia i datę pierwotną, a zlecenie bez wyceny ma wiersz bez stawki', () => {
    const z = zlecenieRek({ id: 'z1', plan: { minutyNormowe: 200, tempo: 1.3 },
      wizyty: { '2026-10-21': wizyta({ przeniesiona: { data: '2026-10-23', godzina: '10:00' }, minutyPracy: 260 }) } })

    const [wiersz] = historiaPlanuIFaktu({ zlecenia: [z], wyceny: [], ustawienia: null }, katalog)

    assert.deepEqual(wiersz, { zlecenieId: 'z1', dataPierwotna: '2026-10-21', data: '2026-10-23', uslugaId: 'mieszkanie_standard',
      plan: 260, fakt: 260, procent: 0, stawka: null })
  })

  it('12 wizyt z czasem daje 10 najnowszych, od najnowszego, bez wizyt zlecenia ręcznego', () => {
    /** @type {Record<string, StanWizyty>} */
    const wizyty = {}
    for (let dzien = 1; dzien <= 12; dzien += 1) wizyty[`2026-10-${String(dzien).padStart(2, '0')}`] = wizyta({ minutyPracy: 300 })
    const { stan } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: planZ(x, 1.3), wizyty }),
      zlecenieRek({ id: 'reczne', wizyty: { '2026-10-30': wizyta({ minutyPracy: 300 }) } })])

    const historia = historiaPlanuIFaktu(stan, katalog)

    assert.equal(historia.length, 10)
    assert.deepEqual([historia[0]?.data, historia[9]?.data], ['2026-10-12', '2026-10-03'])
  })

  it('bez wizyt z czasem daje pustą listę, a stan bez listy zleceń BladWejscia', () => {
    const { stan } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: planZ(x, 1.3) })])

    assert.deepEqual(historiaPlanuIFaktu(stan, katalog), [])
    assert.throws(() => historiaPlanuIFaktu(/** @type {never} */ ({ wyceny: [] }), katalog), BladWejscia)
  })

  it('zlecenie z przyjętej wyceny (zaplanujZWyceny) z czasem wpisanym przy wizycie daje wiersz „plan a fakt”', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)
    dodajKlienta(kontekst.magazyn, { nazwa: 'Anna Kowalska' }, { id: 'k1' })
    zaplanujZWyceny(kontekst.magazyn, w.id, { klientId: 'k1', rozliczenie: 'za_wizyte', start: '2026-10-27', cenaWizyty: 300, tempo: 1.3 },
      { id: 'z-wyc' })

    const stan = wpiszCzasPracy(kontekst.magazyn, 'z-wyc', '2026-10-27', 330)

    assert.deepEqual(historiaPlanuIFaktu(stan, katalog).map((x) => [x.zlecenieId, x.plan, x.fakt, procent(x.procent)]),
      [['z-wyc', 300, 330, '+10%']])
  })
})

describe('planIFaktWizyty', () => {
  it('wizyta z planem 270 min i czasem 300 min daje plan, fakt, różnicę i tę samą stawkę co historiaPlanuIFaktu', () => {
    const { stan } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: { minutyNormowe: 200, tempo: 1.35 },
      wizyty: { '2026-10-21': wizyta({ minutyPracy: 300 }) } })])

    const wynik = planIFaktWizyty(stan.zlecenia[0], '2026-10-21', stan, katalog)
    const [wiersz] = historiaPlanuIFaktu(stan, katalog)

    assert.deepEqual([wynik?.plan, wynik?.fakt, wynik?.procent], [270, 300, 30 / 270])
    assert.equal(typeof wynik?.stawka, 'number')
    assert.equal(wynik?.stawka, wiersz?.stawka)
  })

  it('wizyta starsza niż 10 najnowszych wpisów historii nadal ma plan i fakt', () => {
    const dni = Array.from({ length: 11 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
    const wizyty = Object.fromEntries(dni.map((d) => [d, wizyta({ minutyPracy: 300 })]))
    const z = zlecenieRek({ id: 'z1', plan: { minutyNormowe: 200, tempo: 1.35 }, wizyty })
    const stan = { zlecenia: [z], wyceny: [], ustawienia: /** @type {never} */ ({}) }

    const wynik = planIFaktWizyty(z, '2026-10-01', stan, katalog)

    assert.equal(historiaPlanuIFaktu(stan, katalog).some((w) => w.dataPierwotna === '2026-10-01'), false)
    assert.deepEqual([wynik?.plan, wynik?.fakt, wynik?.stawka], [270, 300, null])
  })

  it('wizyta bez czasu pracy, wizyta bez wpisu i zlecenie bez planu dają null', () => {
    const zPlanem = zlecenieRek({ id: 'z1', plan: { minutyNormowe: 200, tempo: 1.35 }, wizyty: { '2026-10-21': wizyta({ zrobiona: chwila('2026-10-21') }) } })
    const bezPlanu = zlecenieRek({ id: 'z2', wizyty: { '2026-10-21': wizyta({ minutyPracy: 300 }) } })
    const stan = { zlecenia: [zPlanem, bezPlanu], wyceny: [], ustawienia: /** @type {never} */ ({}) }

    assert.deepEqual([planIFaktWizyty(zPlanem, '2026-10-21', stan, katalog), planIFaktWizyty(zPlanem, '2026-10-28', stan, katalog),
      planIFaktWizyty(bezPlanu, '2026-10-21', stan, katalog)], [null, null, null])
  })
})

describe('poprawnyCzas: dolna granica wspólna z zapisem wizyty', () => {
  it('0,5 min daje kod błędu jak wpiszCzasPracy, a 1 min przechodzi', () => {
    assert.deepEqual([poprawnyCzas(0.5), poprawnyCzas(1)], ['czas_poza_zakresem', null])
  })
})

describe('kosztPrzyTempie i stawka przy tempie', () => {
  it('cena ręczna 400 zł podnosi „zostaje” o 400 zł minus cenę wyceny, a wiersz historii liczy stawkę z ceny ręcznej', () => {
    const { stan, w } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: planZ(x, 1.3),
      wizyty: { '2026-10-21': wizyta({ minutyPracy: 330 }) } })])
    const reczna = { ...w, cenaReczna: 400 }
    const stanReczna = { ...stan, wyceny: stan.wyceny.map((x) => (x.id === w.id ? reczna : x)) }

    const bez = kosztPrzyTempie(w, katalog, 1.3, stan.ustawienia)
    const zReczna = kosztPrzyTempie(reczna, katalog, 1.3, stan.ustawienia)
    const [wiersz] = historiaPlanuIFaktu(stanReczna, katalog)

    assert.equal(zReczna.przychod, 400)
    assertBlisko(zReczna.zostaje - bez.zostaje, 400 - (w.wynik?.cena ?? Number.NaN), DOKLADNOSC_ZL)
    assertBlisko(wiersz?.stawka ?? Number.NaN, STAWKA_RECZNA_330, DOKLADNOSC_ZL)
  })

  it('wycena bez migawki daje BladWyceny brak_wyniku', () => {
    const { stan, w } = stanZWycena(() => [])

    assert.throws(() => kosztPrzyTempie({ ...w, wynik: null }, katalog, 1.3, stan.ustawienia), { kod: 'brak_wyniku' })
  })

  it('migawka z pozycją, której nie ma w katalogu, daje plan bez stawki zamiast błędu', () => {
    const { stan, w } = stanZWycena((x) => [zlecenieRek({ id: 'z1', wycenaId: x.id, plan: planZ(x, 1.3) })])
    const m = w.wynik
    if (m === null) throw new Error('brak migawki w teście')
    const zla = { ...w, wynik: { ...m, linie: [...m.linie, /** @type {never} */ ({ rodzaj: 'pozycja', klucz: 'brak.pozycji', minuty: 10 })] } }
    const stanZly = { ...stan, wyceny: stan.wyceny.map((x) => (x.id === w.id ? zla : x)) }

    assert.deepEqual(planZakonczenia(stanZly.zlecenia[0], stanZly, katalog), { plan: 300, tempoPlanu: 1.3, stawkaPlanu: null })
  })
})
