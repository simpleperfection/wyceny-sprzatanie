import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { assertBlisko, czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { KLUCZ_MAGAZYNU, utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { BladWyceny, dodajWykonanie, listaWycen, wycena, zapiszWycene, zmienStatus } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { procent, tempo } from '../ui/format.js'
import { kosztPrzyTempie } from './podsumowanie.js'
import { nowySzkic, zmienWejscie } from './stan.js'
import { czasStartowy, historiaPlanuIFaktu, infoTempa, poprawnyCzas, widokZakonczenia } from './zakonczenie.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */

const KURZ_1 = { id: 'kurz', poziom: 1 }
const NORMA_MIESZKANIA_50 = 230.82

/** @type {Katalog} */
let katalog
/** @type {Domyslne} */
let domyslne

before(async () => {
  katalog = await katalogZDysku()
  domyslne = await wczytajDomyslne(czytajJson)
})

/** Mazowieckie, firma zwolniona z VAT, tempo domyslne 1,3 (bez wpisow). @returns {DaneAplikacji} */
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
  it('plan 266 min (norma 204,6 × tempo 1,3) startuje licznik od 270 min', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)
    const wynik = w.wynik ? { ...w.wynik, minutyNormowe: 204.6 } : null

    assert.equal(czasStartowy({ ...w, wynik }, kontekst), 270)
  })

  it('mieszkanie 50 m² (plan 300,07 min) startuje od 300 min', () => {
    const kontekst = kontekstFirmy()

    assert.equal(czasStartowy(przyjeteMieszkanie(kontekst), kontekst), 300)
  })

  it('wycena bez migawki wyniku daje BladWyceny brak_wyniku', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)

    assert.throws(() => czasStartowy({ ...w, wynik: null }, kontekst), (b) => b instanceof BladWyceny && b.kod === 'brak_wyniku')
  })
})

describe('widokZakonczenia', () => {
  it('norma 230,82 min, tempo planu 1,3, fakt 330 min: plan 300 min, +30 min (+10%), stosunek 1,43', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)

    const widok = widokZakonczenia(w, 330, kontekst)

    assertBlisko(w.wynik?.minutyNormowe ?? Number.NaN, NORMA_MIESZKANIA_50)
    assert.deepEqual([widok.plan, widok.fakt, widok.roznica, widok.tempoPlanu], [300, 330, 30, 1.3])
    assert.equal(procent(widok.procent), '+10%')
    assert.equal(tempo(widok.stosunek), '1,43×')
    assert.equal(widok.czyPozaGranicami, false)
    assert.deepEqual([widok.czyAbonament, widok.wizyt], [false, 0])
  })

  it('realna stawka liczy koszt przy tempie fakt / norma, stawka planu przy tempie 1,3', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)
    const kosztFaktu = kosztPrzyTempie(w, kontekst, 330 / NORMA_MIESZKANIA_50)

    const widok = widokZakonczenia(w, 330, kontekst)

    assertBlisko(widok.zostaje, kosztFaktu.zostaje)
    assertBlisko(widok.stawka, kosztFaktu.zostaje / (330 / 60))
    assertBlisko(widok.stawkaPlanu, kosztPrzyTempie(w, kontekst, 1.3).zostaje / ((NORMA_MIESZKANIA_50 * 1.3) / 60))
    assert.ok(widok.stawka < widok.stawkaPlanu)
  })

  it('fakt 800 min dla normy 230,82 (3,47×) jest poza granicami tempa i nie liczy się do tempa', () => {
    const kontekst = kontekstFirmy()

    const widok = widokZakonczenia(przyjeteMieszkanie(kontekst), 800, kontekst)

    assert.equal(widok.czyPozaGranicami, true)
    assert.equal(widok.tempo.info.liczba, 0)
  })

  it('pierwszy wpis: tempo zostaje 1,3 (domyślne), postęp 1 z 3', () => {
    const kontekst = kontekstFirmy()

    const { tempo: t } = widokZakonczenia(przyjeteMieszkanie(kontekst), 330, kontekst)

    assert.deepEqual([t.przed.wartosc, t.przed.zrodlo, t.po.wartosc, t.po.zrodlo], [1.3, 'domyslne', 1.3, 'domyslne'])
    assert.deepEqual([t.info.liczba, t.info.wymagane, t.info.tempo, t.osobne], [1, 3, null, null])
  })

  it('trzeci wpis usługi daje pierwsze osobne tempo (mediana 1,3; 1,43; 1,56 = 1,43)', () => {
    const kontekst = kontekstFirmy()
    const pierwsza = przyjeteMieszkanie(kontekst)
    const druga = przyjeteMieszkanie(kontekst)
    dodajWykonanie(kontekst.magazyn, pierwsza.id, { data: '2026-10-20', minuty: NORMA_MIESZKANIA_50 * 1.3, tempoPlanu: 1.3 })
    dodajWykonanie(kontekst.magazyn, druga.id, { data: '2026-10-21', minuty: NORMA_MIESZKANIA_50 * 1.56, tempoPlanu: 1.3 })
    const trzecia = przyjeteMieszkanie(kontekst)

    const { tempo: t } = widokZakonczenia(trzecia, 330, kontekst)

    assert.equal(t.info.liczba, 3)
    assert.equal(t.info.tempo?.zakres, 'usluga')
    assert.equal(tempo(t.osobne ?? Number.NaN), '1,43×')
    assert.deepEqual([t.przed.zrodlo, t.po.zrodlo, t.po.liczba], ['domyslne', 'usluga', 3])
  })

  it('czas 0 min daje BladWejscia czas', () => {
    const kontekst = kontekstFirmy()

    assert.throws(() => widokZakonczenia(przyjeteMieszkanie(kontekst), 0, kontekst), (b) => b instanceof BladWejscia && b.kod === 'czas')
  })
})

describe('infoTempa', () => {
  it('po pierwszym zapisanym wpisie: 1 z 3, bez tempa własnego', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)
    dodajWykonanie(kontekst.magazyn, w.id, { data: '2026-10-25', minuty: 330, tempoPlanu: 1.3 })

    const info = infoTempa(wczytajStan(kontekst.magazyn).wyceny, 'mieszkanie_standard')

    assert.deepEqual(info, { liczba: 1, wymagane: 3, tempo: null })
  })

  it('wyceny spoza listy dają BladWejscia', () => {
    assert.throws(() => infoTempa(/** @type {never} */ (null), 'mieszkanie_standard'), BladWejscia)
  })
})

describe('historiaPlanuIFaktu', () => {
  it('wpis 330 min przy tempie planu 1,3: data, usługa, plan 300, fakt 330, +10%', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)
    dodajWykonanie(kontekst.magazyn, w.id, { id: 'wpis-1', data: '2026-10-25', minuty: 330, tempoPlanu: 1.3 })

    const [wiersz, ...reszta] = historiaPlanuIFaktu(wczytajStan(kontekst.magazyn).wyceny)

    assert.deepEqual({ ...wiersz, procent: procent(wiersz?.procent ?? Number.NaN) },
      { wycenaId: w.id, wykonanieId: 'wpis-1', data: '2026-10-25', uslugaId: 'mieszkanie_standard', plan: 300, fakt: 330, procent: '+10%' })
    assert.equal(reszta.length, 0)
  })

  it('12 wpisów daje 10 najnowszych, od najnowszego', () => {
    const kontekst = kontekstFirmy()
    for (let dzien = 1; dzien <= 12; dzien += 1) {
      const w = przyjeteMieszkanie(kontekst)
      dodajWykonanie(kontekst.magazyn, w.id, { data: `2026-10-${String(dzien).padStart(2, '0')}`, minuty: 300, tempoPlanu: 1.3 })
    }

    const historia = historiaPlanuIFaktu(wczytajStan(kontekst.magazyn).wyceny)

    assert.equal(historia.length, 10)
    assert.deepEqual([historia[0]?.data, historia[9]?.data], ['2026-10-12', '2026-10-03'])
  })

  it('bez wpisów daje pustą listę, a nie-lista BladWejscia', () => {
    const kontekst = kontekstFirmy()
    przyjeteMieszkanie(kontekst)

    assert.deepEqual(historiaPlanuIFaktu(wczytajStan(kontekst.magazyn).wyceny), [])
    assert.throws(() => historiaPlanuIFaktu(/** @type {never} */ ('x')), BladWejscia)
  })
})

describe('e2e/stany/zlecenie-przyjete.json', () => {
  /** Stan z pliku wstrzykniety do magazynu jak w scenariuszu E2E. @returns {Promise<DaneAplikacji>} */
  async function kontekstZPliku() {
    const storage = new PamiecMagazynu()
    storage.setItem(KLUCZ_MAGAZYNU, JSON.stringify(await czytajJson('e2e/stany/zlecenie-przyjete.json')))
    return { katalog, domyslne, magazyn: utworzMagazyn(storage, { loguj: () => {}, poprosOTrwalosc: () => true }) }
  }

  it('przyjęta wycena mieszkania: licznik od 5 h, fakt 5 h 30 min daje plan 300, +10% i tempo 1 z 3', async () => {
    const kontekst = await kontekstZPliku()
    const [w, ...reszta] = listaWycen(wczytajStan(kontekst.magazyn))
    if (!w) throw new Error('brak wyceny w pliku stanu')

    const widok = widokZakonczenia(w, 330, kontekst)

    assert.deepEqual([w.status, w.wejscie.uslugaId, reszta.length, czasStartowy(w, kontekst)], ['przyjeta', 'mieszkanie_standard', 0, 300])
    assert.deepEqual([widok.plan, widok.roznica, procent(widok.procent)], [300, 30, '+10%'])
    assert.deepEqual([widok.tempo.info.liczba, widok.tempo.info.wymagane], [1, 3])
  })

  it('zapis 330 min: status „wykonana” i jeden wiersz „plan a fakt”', async () => {
    const kontekst = await kontekstZPliku()
    const [w] = listaWycen(wczytajStan(kontekst.magazyn))
    if (!w) throw new Error('brak wyceny w pliku stanu')

    const stan = dodajWykonanie(kontekst.magazyn, w.id, { id: 'wpis-e2e', data: '2026-10-27', minuty: 330, tempoPlanu: 1.3 })

    assert.equal(wycena(stan, w.id)?.status, 'wykonana')
    assert.deepEqual(historiaPlanuIFaktu(stan.wyceny).map((x) => [x.plan, x.fakt, procent(x.procent)]), [[300, 330, '+10%']])
  })
})

describe('dodajWykonanie z id nadanym przez ekran', () => {
  it('drugie „Zapisz” z tym samym id nie dopisuje drugiej wizyty abonamentu', () => {
    const kontekst = kontekstFirmy()
    const w = przyjeteMieszkanie(kontekst)
    const abonament = w.wynik ? { ...w, wynik: { ...w.wynik, wizytWMiesiacu: 4 } } : w
    kontekst.magazyn.zmien((stan) => ({ ...stan, wyceny: stan.wyceny.map((x) => (x.id === w.id ? abonament : x)) }))
    const wpis = { id: 'wizyta-1', data: '2026-10-27', minuty: 300, tempoPlanu: 1.3 }

    dodajWykonanie(kontekst.magazyn, w.id, wpis)
    const stan = dodajWykonanie(kontekst.magazyn, w.id, wpis)

    assert.deepEqual([wycena(stan, w.id)?.status, wycena(stan, w.id)?.wykonania.length], ['przyjeta', 1])
  })
})
