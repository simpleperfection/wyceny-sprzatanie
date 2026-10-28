import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { assertBlisko, czytajJson, katalogZDysku } from '../../tests/pomocnicze.js'
import { utworzMagazyn } from '../dane/magazyn.js'
import { wczytajDomyslne, zapiszUstawienia } from '../dane/ustawienia.js'
import { BladWyceny, dodajWykonanie, utworzSzkic, wycena, zapiszWycene, zmienStatus } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { procent } from '../ui/format.js'
import { akcjeWyceny, przeliczWycene, przywrocCeneModelu, ustawCeneReczna, widokPodsumowania } from './podsumowanie.js'
import { nowySzkic, przelicz, zmienWejscie } from './stan.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('./podsumowanie.js').WierszKosztu} WierszKosztu */

const KURZ_1 = { id: 'kurz', poziom: 1 }

/** @type {Katalog} */
let katalog
/** @type {Domyslne} */
let domyslne

before(async () => {
  katalog = await katalogZDysku()
  domyslne = await wczytajDomyslne(czytajJson)
})

/** Kontekst z magazynem w pamieci: mazowieckie, status VAT jak podany, tempo domyslne 1,3. @returns {DaneAplikacji} */
function kontekstFirmy(statusVat = /** @type {'zwolniony' | 'czynny'} */ ('zwolniony')) {
  const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
  zapiszUstawienia(magazyn, { wojewodztwoId: 'mazowieckie', statusVat }, domyslne)
  return { katalog, domyslne, magazyn }
}

/** Mieszkanie 50 m² standard w mazowieckim (cena modelu 250 zł, widełki 120–450 zł). @param {DaneAplikacji} kontekst */
function mieszkanie(kontekst, dojazdKm = 0) {
  const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })
  const pomieszczenia = ukladMieszkania(50, {}, katalog.uklady).map((p) => ({ ...p, brud: [{ ...KURZ_1 }] }))
  return zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pomieszczenia, dojazdKm }))
}

/** @param {WierszKosztu[]} wiersze @param {WierszKosztu['rodzaj']} rodzaj */
const kwotaWiersza = (wiersze, rodzaj) => wiersze.filter((w) => w.rodzaj === rodzaj).reduce((suma, w) => suma + w.kwota, 0)

describe('widokPodsumowania', () => {
  it('wycena 250 zł z ręczną ceną 290 zł: w widełkach, +16%, zostaje więcej o 40 zł, czas bez zmian', () => {
    const kontekst = kontekstFirmy()
    const w = mieszkanie(kontekst)
    const przed = widokPodsumowania(w, kontekst)

    const po = widokPodsumowania(ustawCeneReczna(kontekst, w.id, 290), kontekst)

    assert.deepEqual([przed.cena.brutto, przed.cena.czyReczna, przed.rynek.polozenie, przed.rynek.od, przed.rynek.do], [250, false, 'w', 120, 450])
    assert.deepEqual([po.cena.brutto, po.cena.czyReczna, po.rynek.polozenie, po.rynek.mediana], [290, true, 'w', 250])
    assert.equal(procent(po.rynek.procent), '+16%')
    assertBlisko(po.zostaje.kwota - przed.zostaje.kwota, 40)
    assert.equal(po.zostaje.minutyWlasne, przed.zostaje.minutyWlasne)
    assert.deepEqual([po.zostaje.tempo, po.zostaje.zrodloTempa], [1.3, 'domyslne'])
    assertBlisko(po.zostaje.minutyWlasne, w.wynik ? w.wynik.minutyNormowe * 1.3 : Number.NaN)
    assert.deepEqual(po.koszty.map((k) => k.rodzaj), ['cena', 'chemia', 'sprzet', 'zostaje'])
    assert.equal(kwotaWiersza(po.koszty, 'cena'), 290)
  })

  it('czynny VAT przy mieszkaniu: brutto 250, netto 203,25, zostaje liczone od netto', () => {
    const kontekst = kontekstFirmy('czynny')

    const widok = widokPodsumowania(mieszkanie(kontekst), kontekst)

    assert.deepEqual([widok.cena.brutto, widok.cena.netto, widok.cena.vat, widok.cena.statusVat], [250, 203.25, 46.75, 'czynny'])
    assert.deepEqual(widok.koszty.find((k) => k.rodzaj === 'vat'), { rodzaj: 'vat', kwota: 46.75, stawkaVatProc: 23 })
    const koszty = kwotaWiersza(widok.koszty, 'chemia') + kwotaWiersza(widok.koszty, 'sprzet')
    assert.ok(koszty > 0)
    assertBlisko(widok.zostaje.kwota, 203.25 - koszty)
  })

  it('dojazd 24 km: rozbicie ceny i wiersz kosztu dojazdu tam i z powrotem po kilometrówce', () => {
    const kontekst = kontekstFirmy()
    const { dojazd } = katalog.kosztyFirmy

    const widok = widokPodsumowania(mieszkanie(kontekst, 24), kontekst)

    const kwotaKlienta = Math.round((24 - dojazd.darmowy_promien_km) * dojazd.klient_zl_km)
    assert.deepEqual(widok.cena.rozbicie, { uslugi: widok.cena.brutto - kwotaKlienta, dojazd: kwotaKlienta })
    assert.deepEqual(widok.koszty.find((k) => k.rodzaj === 'dojazd'),
      { rodzaj: 'dojazd', kwota: 48 * dojazd.koszt_firmy_zl_km, kmRazem: 48, stawka: dojazd.koszt_firmy_zl_km })
  })

  it('migawka ze starszą wersją danych daje ostrzeżenie nowe_dane; cena 380 zł przy szybkiej 250–300 zł — poza widełkami', () => {
    const kontekst = kontekstFirmy()
    const w = mieszkanie(kontekst)
    assert.ok(w.wynik)
    const stara = { ...w, wynik: { ...w.wynik, wersjaDanych: { ...w.wynik.wersjaDanych, rynek: '2026-01-01' } } }
    const zSzybka = { ...w, cenaReczna: 380, szybka: { stan: 'mieszkanie', od: 250, do: 300, tryb: 'pomieszczenia' } }

    assert.deepEqual(widokPodsumowania(w, kontekst).ostrzezenia, [])
    assert.deepEqual(widokPodsumowania(stara, kontekst).ostrzezenia, [{ rodzaj: 'nowe_dane' }])
    assert.deepEqual(widokPodsumowania(zSzybka, kontekst).ostrzezenia, [{ rodzaj: 'poza_szybka', od: 250, do: 300 }])
    assert.deepEqual(widokPodsumowania({ ...w, oferta: { ...w.oferta, nieaktualna: true } }, kontekst).ostrzezenia,
      [{ rodzaj: 'oferta_nieaktualna' }])
  })

  it('abonament biura 1× w tygodniu: kwota za wizytę, miesięczna i 4,33 wizyty; jednorazowe biuro bez abonamentu', () => {
    const kontekst = kontekstFirmy()
    const wejscie = { uslugaId: 'sprzatanie_biur', wojewodztwoId: 'mazowieckie', pomieszczenia: [{ typ: 'biuro', m2: 100, brud: [KURZ_1] }] }
    const abonament = utworzSzkic(kontekst.magazyn, { rodzaj: 'dokladna', wejscie: { ...wejscie, wariantId: 'abonament_1' } })
    const jednorazowe = utworzSzkic(kontekst.magazyn, { rodzaj: 'dokladna', wejscie: { ...wejscie, wariantId: 'jednorazowe' } })

    const widok = widokPodsumowania({ ...abonament, wynik: przelicz(abonament, kontekst) }, kontekst)

    assert.ok(widok.abonament)
    assert.equal(widok.abonament.wizyt, 4.33)
    assert.equal(widok.abonament.zaWizyte, widok.cena.brutto)
    assertBlisko(widok.abonament.miesiecznie, widok.cena.brutto * 4.33)
    assertBlisko(widok.abonament.zostajeMiesiecznie, widok.zostaje.kwota * 4.33)
    assert.equal(widokPodsumowania({ ...jednorazowe, wynik: przelicz(jednorazowe, kontekst) }, kontekst).abonament, null)
  })

  it('cena 100 zł jest poniżej widełek (−60% od mediany), 500 zł powyżej; cena modelu 250 zł pod szybką 300–350 zł — poza widełkami', () => {
    const kontekst = kontekstFirmy()
    const w = mieszkanie(kontekst)
    const zSzybka = { ...w, szybka: { stan: 'mieszkanie', od: 300, do: 350, tryb: 'pomieszczenia' } }

    const ponizej = widokPodsumowania(ustawCeneReczna(kontekst, w.id, 100), kontekst)
    const powyzej = widokPodsumowania(ustawCeneReczna(kontekst, w.id, 500), kontekst)

    assert.deepEqual([ponizej.rynek.polozenie, ponizej.rynek.od, ponizej.rynek.do], ['ponizej', 120, 450])
    assert.equal(procent(ponizej.rynek.procent), procent(-0.6))
    assertBlisko(ponizej.rynek.procent, -0.6)
    assert.equal(powyzej.rynek.polozenie, 'powyzej')
    assert.deepEqual(widokPodsumowania(zSzybka, kontekst).ostrzezenia, [{ rodzaj: 'poza_szybka', od: 300, do: 350 }])
  })

  it('czynny VAT przy podstawie netto (posadzki 1000 m², dojazd 24 km): widełki i dojazd z VAT, chemia na m², szorowarka', () => {
    const kontekst = kontekstFirmy('czynny')
    const { id } = nowySzkic(kontekst, { uslugaId: 'mycie_posadzek', wojewodztwoId: 'mazowieckie' })
    const w = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pozycje: [{ id: 'mycie_maszynowe', ilosc: 1000 }], dojazdKm: 24 }))

    const widok = widokPodsumowania(w, kontekst)

    assert.deepEqual(widok.cena.rozbicie, { uslugi: 1550, dojazd: 34 })
    assert.deepEqual([widok.rynek.od, widok.rynek.do], [551, 8644])
    assert.deepEqual(widok.koszty.find((k) => k.rodzaj === 'chemia'), { rodzaj: 'chemia', kwota: 50, chemiaH: null })
    assert.deepEqual(widok.koszty.filter((k) => k.rodzaj === 'sprzet').map((k) => k.rodzaj === 'sprzet' && k.nazwa),
      ['Szorowarka (jednotarczowa lub z odsysaniem)'])
  })

  it('4 okna za 120 zł podniesione do minimum zlecenia 150 zł: cena 150 i informacja o minimum; cena ręczna bez niej', () => {
    const kontekst = kontekstFirmy()
    const { id } = nowySzkic(kontekst, { uslugaId: 'okna', wojewodztwoId: 'mazowieckie' })
    const w = zmienWejscie(kontekst, id, (wejscie) => ({ ...wejscie, pozycje: [{ id: 'okno_1', ilosc: 4 }] }))

    const widok = widokPodsumowania(w, kontekst)

    assert.deepEqual([widok.cena.brutto, widok.cena.minimum], [150, 150])
    assert.deepEqual([w.wynik?.minimum, w.wynik?.czyMinimum], [150, true])
    assert.equal(widokPodsumowania(ustawCeneReczna(kontekst, id, 170), kontekst).cena.minimum, null)
    assert.equal(widokPodsumowania(mieszkanie(kontekst), kontekst).cena.minimum, null)
  })

  it('szkic bez migawki wyniku daje BladWyceny brak_wyniku', () => {
    const kontekst = kontekstFirmy()
    const szkic = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })

    assert.throws(() => widokPodsumowania(szkic, kontekst), { name: BladWyceny.name, kod: 'brak_wyniku' })
  })
})

describe('ustawCeneReczna i przywrocCeneModelu', () => {
  it('zapisuje kwotę zaokrągloną do złotych, a przywrócenie wraca do ceny z modelu', () => {
    const kontekst = kontekstFirmy()
    const { id } = mieszkanie(kontekst)

    assert.equal(ustawCeneReczna(kontekst, id, 289.6).cenaReczna, 290)
    const przywrocona = przywrocCeneModelu(kontekst, id)

    assert.equal(przywrocona.cenaReczna, null)
    assert.equal(widokPodsumowania(przywrocona, kontekst).cena.brutto, 250)
  })

  it('zła kwota daje BladWejscia cena_reczna i nic nie zapisuje; wykonana wycena jest tylko do odczytu', () => {
    const kontekst = kontekstFirmy()
    const { id } = mieszkanie(kontekst)
    zapiszWycene(kontekst.magazyn, id)
    zmienStatus(kontekst.magazyn, id, 'przyjeta')
    const stanPrzed = kontekst.magazyn.wczytaj()

    for (const zla of [0, -5, Number.NaN, 2_000_000]) {
      assert.throws(() => ustawCeneReczna(kontekst, id, zla), { name: BladWejscia.name, kod: 'cena_reczna' })
    }
    assert.deepEqual(kontekst.magazyn.wczytaj(), stanPrzed)
    dodajWykonanie(kontekst.magazyn, id, { data: '2026-10-25', minuty: 240, tempoPlanu: 1.3 })
    assert.throws(() => ustawCeneReczna(kontekst, id, 300), { name: BladWyceny.name, kod: 'tylko_odczyt' })
    assert.throws(() => przywrocCeneModelu(kontekst, 'brak'), { name: BladWyceny.name, kod: 'brak_wyceny' })
  })

  it('zmiana kwoty po wysłaniu oferty oznacza ofertę jako nieaktualną', () => {
    const kontekst = kontekstFirmy()
    const { id } = mieszkanie(kontekst)
    zapiszWycene(kontekst.magazyn, id)
    zmienStatus(kontekst.magazyn, id, 'wyslana')

    const po = ustawCeneReczna(kontekst, id, 300)

    assert.equal(po.oferta.nieaktualna, true)
  })

  it('po wysłaniu ta sama kwota (250 zł = cena modelu) nie unieważnia oferty, a powrót do modelu po 300 zł unieważnia', () => {
    const kontekst = kontekstFirmy()
    const { id } = mieszkanie(kontekst)
    zapiszWycene(kontekst.magazyn, id)
    zmienStatus(kontekst.magazyn, id, 'wyslana')

    const taSama = ustawCeneReczna(kontekst, id, 250)
    ustawCeneReczna(kontekst, id, 300)
    kontekst.magazyn.zmien((stan) => ({ ...stan, wyceny: stan.wyceny.map((x) => (x.id === id ? { ...x, oferta: { ...x.oferta, nieaktualna: false } } : x)) }))
    const przywrocona = przywrocCeneModelu(kontekst, id)

    assert.equal(taSama.oferta.nieaktualna, false)
    assert.equal(przywrocona.oferta.nieaktualna, true)
  })
})

describe('przeliczWycene', () => {
  it('nowa migawka z bieżącymi danymi: stara i nowa cena, wersja danych jak w katalogu', () => {
    const kontekst = kontekstFirmy()
    const { id } = mieszkanie(kontekst)
    kontekst.magazyn.zmien((stan) => ({ ...stan, wyceny: stan.wyceny.map((w) => (w.id === id && w.wynik
      ? { ...w, wynik: { ...w.wynik, cena: 230, wersjaDanych: { ...w.wynik.wersjaDanych, rynek: '2026-01-01' } } } : w)) }))

    const { stara, nowa, wycena: po } = przeliczWycene(kontekst, id)

    assert.deepEqual([stara, nowa], [230, 250])
    assert.deepEqual(po.wynik?.wersjaDanych, katalog.wersjaDanych)
    const stan = kontekst.magazyn.wczytaj()
    assert.ok('stan' in stan)
    assert.equal(wycena(stan.stan, id)?.wynik?.cena, 250)
  })

  it('brak wyceny daje BladWyceny brak_wyceny', () => {
    assert.throws(() => przeliczWycene(kontekstFirmy(), 'brak'), { name: BladWyceny.name, kod: 'brak_wyceny' })
  })
})

describe('akcjeWyceny', () => {
  it('decyzja klienta przy wycenie do wysłania i wysłanej, przyjęta bez niej, wykonana tylko do usunięcia', () => {
    assert.deepEqual(akcjeWyceny('do_wyslania'), ['przyjeta', 'odrzucona', 'edytuj', 'usun'])
    assert.deepEqual(akcjeWyceny('wyslana'), ['przyjeta', 'odrzucona', 'edytuj', 'usun'])
    assert.deepEqual(akcjeWyceny('przyjeta'), ['edytuj', 'usun'])
    assert.deepEqual(akcjeWyceny('wykonana'), ['usun'])
  })
})
