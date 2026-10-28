import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { assertBlisko, czytajJson } from '../../tests/pomocnicze.js'
import { BladKatalogu, BladWejscia } from './bledy.js'
import { GRANICE_STOSUNKU_TEMPA, MIN_ZLECEN_TEMPA, opisTempa, tempoDoWyceny, tempoWlasne, wpisyTempa } from './tempo.js'

const DOMYSLNE = { tempo: 1.3 }
const NORMA_MIN = 100

/**
 * Wycena z jednym wpisem wykonania: minuty = stosunek × norma (100 min).
 * @param {string} uslugaId @param {number} stosunek @param {string} data
 */
function wycena(uslugaId, stosunek, data) {
  return {
    id: `w-${uslugaId}-${data}-${stosunek}`,
    wejscie: { uslugaId },
    wynik: { minutyNormowe: NORMA_MIN },
    wykonania: [{ id: `x-${data}-${stosunek}`, data, minuty: stosunek * NORMA_MIN }],
  }
}

/** @param {string} uslugaId @param {number[]} stosunki wpisy kolejnych dni pazdziernika 2026, od najstarszego */
const wyceny = (uslugaId, stosunki) =>
  stosunki.map((s, i) => wycena(uslugaId, s, `2026-10-${String(i + 1).padStart(2, '0')}`))

describe('stale tempa', () => {
  it('próg 3 wpisów i granice stosunku 0,5–3', () => {
    assert.equal(MIN_ZLECEN_TEMPA, 3)
    assert.deepEqual(GRANICE_STOSUNKU_TEMPA, { min: 0.5, max: 3 })
  })
})

describe('wpisyTempa', () => {
  it('stosunek = minuty wykonania / czas normowy migawki; 3,5× zapisuje się z liczony: false', () => {
    const wpisy = wpisyTempa([wycena('okna', 1.2, '2026-10-01'), wycena('okna', 3.5, '2026-10-02')])

    assert.equal(wpisy.length, 2)
    assert.deepEqual(wpisy.map((w) => [w.data, w.liczony]), [['2026-10-02', false], ['2026-10-01', true]])
    assertBlisko(wpisy[0].stosunek, 3.5)
    assertBlisko(wpisy[1].stosunek, 1.2)
    assert.equal(wpisy[1].uslugaId, 'okna')
  })

  it('abonament: każda wizyta to osobny wpis względem czasu normowego jednej wizyty', () => {
    const abonament = { id: 'a', wejscie: { uslugaId: 'biuro' }, wynik: { minutyNormowe: 120, wizytWMiesiacu: 4 },
      wykonania: [{ id: 'v1', data: '2026-10-01', minuty: 120 }, { id: 'v2', data: '2026-10-08', minuty: 150 }] }

    assert.deepEqual(wpisyTempa([abonament]).map((w) => w.stosunek), [1.25, 1])
  })

  it('pomija wyceny bez migawki wyniku', () => {
    assert.deepEqual(wpisyTempa([{ id: 's', wejscie: { uslugaId: 'okna' }, wynik: null, wykonania: [] }]), [])
  })

  it('wyceny, które nie są listą → BladWejscia wyceny', () => {
    assert.throws(() => wpisyTempa(/** @type {never} */ ({})), { name: BladWejscia.name, kod: 'wyceny' })
  })
})

describe('tempoWlasne', () => {
  it('wpisy 1,1, 1,2 i 1,4 → mediana 1,2 z liczba: 3', () => {
    const tempo = tempoWlasne(wyceny('okna', [1.1, 1.4, 1.2]), 'okna')

    assert.ok(tempo)
    assertBlisko(tempo.wartosc, 1.2)
    assert.equal(tempo.liczba, 3)
    assert.equal(tempo.zakres, 'usluga')
  })

  it('dwa wpisy → null', () => {
    assert.equal(tempoWlasne(wyceny('okna', [1.1, 1.2]), 'okna'), null)
  })

  it('wpis 3,5× nie zmienia mediany', () => {
    const tempo = tempoWlasne(wyceny('okna', [1.1, 1.2, 1.4, 3.5]), 'okna')

    assert.ok(tempo)
    assertBlisko(tempo.wartosc, 1.2)
    assert.equal(tempo.liczba, 3)
  })

  it('z 12 wpisów liczy się 10 najnowszych', () => {
    // dwa najstarsze (2,0 i 2,0) wypadają; zostaje 1,0 ×5 i 1,5 ×5 → mediana 1,25 (przy 12 wpisach byłoby 1,5)
    const tempo = tempoWlasne(wyceny('okna', [2, 2, 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 1.5]), 'okna')

    assert.ok(tempo)
    assertBlisko(tempo.wartosc, 1.25)
    assert.equal(tempo.liczba, 10)
  })

  it('trzy wpisy usługi okna i dwa innej: okna → usluga, inna → wspolne z pięciu wpisów', () => {
    const lista = [...wyceny('okna', [1.1, 1.2, 1.3]), ...wyceny('dywany', [2, 2.2])]

    const okna = tempoWlasne(lista, 'okna')
    const dywany = tempoWlasne(lista, 'dywany')

    assert.equal(okna?.zakres, 'usluga')
    assertBlisko(okna?.wartosc ?? 0, 1.2)
    assert.equal(okna?.liczba, 3)
    assert.equal(dywany?.zakres, 'wspolne')
    assertBlisko(dywany?.wartosc ?? 0, 1.3)
    assert.equal(dywany?.liczba, 5)
  })
})

describe('tempoDoWyceny', () => {
  it('dwa wpisy → 1,3 z data/domyslne.json ze źródłem domyslne', async () => {
    const domyslne = await czytajJson('data/domyslne.json')

    assert.deepEqual(tempoDoWyceny({ tempo: { reczne: null } }, wyceny('okna', [1.1, 1.2]), 'okna', domyslne),
      { wartosc: 1.3, zrodlo: 'domyslne', liczba: 2 })
  })

  it('bez ustawień (przed kreatorem) liczy z zleceń', () => {
    const tempo = tempoDoWyceny(null, wyceny('okna', [1.1, 1.4, 1.2]), 'okna', DOMYSLNE)

    assert.equal(tempo.zrodlo, 'usluga')
    assertBlisko(tempo.wartosc, 1.2)
  })

  it('tempo.reczne = 1,5 wygrywa z tempem z zleceń', () => {
    assert.deepEqual(tempoDoWyceny({ tempo: { reczne: 1.5 } }, wyceny('okna', [1.1, 1.4, 1.2]), 'okna', DOMYSLNE),
      { wartosc: 1.5, zrodlo: 'reczne', liczba: 3 })
  })

  it('tempo wspólne, gdy usługa ma mniej niż 3 wpisy', () => {
    const lista = [...wyceny('okna', [1.1, 1.2, 1.3]), ...wyceny('dywany', [2])]

    const tempo = tempoDoWyceny({ tempo: { reczne: null } }, lista, 'dywany', DOMYSLNE)

    assert.equal(tempo.zrodlo, 'wspolne')
    assert.equal(tempo.liczba, 4)
  })

  it('zepsute tempo w data/domyslne.json → BladKatalogu zly_format', () => {
    assert.throws(() => tempoDoWyceny(null, [], 'okna', { tempo: 0 }), { name: BladKatalogu.name, kod: 'zly_format' })
  })
})

describe('opisTempa', () => {
  it('tempo z zleceń: „1,18× z 7 zleceń”', () => {
    assert.equal(opisTempa({ wartosc: 1.18, zrodlo: 'wspolne', liczba: 7 }), '1,18× z 7 zleceń')
  })

  it('zaokrągla do dwóch miejsc; tempo domyślne i ręczne bez liczby zleceń', () => {
    assert.equal(opisTempa({ wartosc: 1.1834, zrodlo: 'usluga', liczba: 10 }), '1,18× z 10 zleceń')
    assert.equal(opisTempa({ wartosc: 1.3, zrodlo: 'domyslne', liczba: 2 }), '1,3×')
    assert.equal(opisTempa({ wartosc: 1.5, zrodlo: 'reczne', liczba: 3 }), '1,5×')
  })

  it('tempo, które nie jest dodatnią liczbą → BladWejscia tempo', () => {
    assert.throws(() => opisTempa({ wartosc: Number.NaN, zrodlo: 'reczne', liczba: 0 }), { name: BladWejscia.name, kod: 'tempo' })
  })
})

describe('dolna granica stosunku tempa', () => {
  it('0,4× zapisuje się z liczony: false, 0,5× z liczony: true', () => {
    const wpisy = wpisyTempa([wycena('okna', 0.4, '2026-10-01'), wycena('okna', 0.5, '2026-10-02')])

    assert.deepEqual(wpisy.map((w) => [w.data, w.liczony]), [['2026-10-02', true], ['2026-10-01', false]])
  })

  it('wpis 0,3× nie liczy się do mediany: [1,1; 1,2; 1,4; 0,3] → 1,2 z 3 wpisów', () => {
    const tempo = tempoWlasne(wyceny('okna', [1.1, 1.2, 1.4, 0.3]), 'okna')

    assert.ok(tempo)
    assertBlisko(tempo.wartosc, 1.2)
    assert.equal(tempo.liczba, 3)
  })
})
