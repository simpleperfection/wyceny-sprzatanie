import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  BladFormatu,
  bladZakresu,
  czas,
  data,
  dataDnia,
  dniTemu,
  FORMY,
  m2,
  miejscownikWojewodztwa,
  odmiana,
  parsujLiczbe,
  procent,
  sprawdzDate,
  tekstLiczby,
  tempo,
  zl,
  zlGr,
} from './format.js'
import * as modulFormatu from './format.js'

const NBSP = ' '

/** @param {string} kod */
const bladFormatu = (kod) => (/** @type {unknown} */ blad) => blad instanceof BladFormatu && blad.kod === kod

describe('kwoty i liczby', () => {
  it('zl zaokrągla do złotówki i grupuje tysiące twardą spacją', () => {
    assert.equal(zl(1234.5), `1${NBSP}235${NBSP}zł`)
    assert.equal(zl(290), `290${NBSP}zł`)
  })

  it('zlGr pokazuje grosze z przecinkiem', () => {
    assert.equal(zlGr(1.15), `1,15${NBSP}zł`)
    assert.equal(zlGr(1234), `1${NBSP}234,00${NBSP}zł`)
  })

  it('m2, tempo i procent mają polski zapis', () => {
    assert.equal(m2(50), `50${NBSP}m²`)
    assert.equal(m2(12.5), `12,5${NBSP}m²`)
    assert.equal(tempo(1.18), '1,18×')
    assert.equal(tempo(1), '1,00×')
    assert.equal(procent(0.16), '+16%')
    assert.equal(procent(-0.05), '-5%')
  })

  it('odrzuca wartość, która nie jest liczbą skończoną', () => {
    assert.throws(() => zl(Number.NaN), bladFormatu('nie_liczba'))
    assert.throws(() => m2('50'), bladFormatu('nie_liczba'))
  })
})

describe('czas', () => {
  it('zamienia minuty na godziny i minuty', () => {
    assert.equal(czas(315), '5 h 15 min')
    assert.equal(czas(45), '45 min')
    assert.equal(czas(180), '3 h')
    assert.equal(czas(0), '0 min')
  })

  it('odrzuca ujemny czas', () => {
    assert.throws(() => czas(-1), bladFormatu('ujemna'))
  })
})

describe('daty', () => {
  it('data i dataDnia z nazwą miesiąca w dopełniaczu', () => {
    assert.equal(data(new Date(2026, 10, 7)), '7 listopada 2026')
    assert.equal(data('2026-11-07'), '7 listopada 2026')
    assert.equal(dataDnia(new Date(2026, 9, 24)), 'Sobota, 24 października')
  })

  it('odrzuca nieprawidłową datę', () => {
    assert.throws(() => data('jutro'), bladFormatu('zla_data'))
  })

  it('dniTemu dla 0, 1 i 9 dni', () => {
    assert.equal(dniTemu(0), 'dziś')
    assert.equal(dniTemu(1), 'wczoraj')
    assert.equal(dniTemu(9), '9 dni temu')
  })

  it('dniTemu odrzuca ujemną i ułamkową liczbę dni', () => {
    assert.throws(() => dniTemu(-1), bladFormatu('zle_dni'))
    assert.throws(() => dniTemu(1.5), bladFormatu('zle_dni'))
  })
})

describe('odmiana', () => {
  it('miejscownik województwa', () => {
    assert.equal(miejscownikWojewodztwa('kujawsko-pomorskie'), 'kujawsko-pomorskim')
    assert.equal(miejscownikWojewodztwa('mazowieckie'), 'mazowieckim')
  })

  it('miejscownik odrzuca nazwę, która nie jest województwem', () => {
    assert.throws(() => miejscownikWojewodztwa('średnia krajowa'), bladFormatu('nie_wojewodztwo'))
  })

  it('liczebniki: 1, 2–4, 5+ i nastki', () => {
    assert.deepEqual([1, 2, 5, 12, 22, 25].map((n) => odmiana(n, FORMY.wycena)), ['wycena', 'wyceny', 'wycen', 'wycen', 'wyceny', 'wycen'])
    assert.equal(odmiana(3, FORMY.zlecenie), 'zlecenia')
    assert.equal(odmiana(0, FORMY.zlecenie), 'zleceń')
    assert.equal(odmiana(7, FORMY.przyjeta), 'przyjętych')
  })

  it('odmiana odrzuca liczbę ujemną', () => {
    assert.throws(() => odmiana(-2, FORMY.wycena), bladFormatu('zla_liczebnosc'))
  })
})

describe('parsujLiczbe', () => {
  it('czyta przecinek i spacje tysięcy', () => {
    assert.equal(parsujLiczbe('12,5'), 12.5)
    assert.equal(parsujLiczbe(' 1 200 '), 1200)
    assert.equal(parsujLiczbe(`1${NBSP}200`), 1200)
  })

  it('zwraca null dla tekstu, który nie jest liczbą', () => {
    assert.equal(parsujLiczbe(''), null)
    assert.equal(parsujLiczbe('12a'), null)
    assert.equal(parsujLiczbe('1,2,3'), null)
  })
})

describe('tekstLiczby, bladZakresu i sprawdzDate', () => {
  it('tekstLiczby: przecinek dziesiętny, najwyżej 2 miejsca, bez grupowania tysięcy', () => {
    assert.equal(tekstLiczby(1.15), '1,15')
    assert.equal(tekstLiczby(0.1 + 0.2), '0,3')
    assert.equal(tekstLiczby(1500), '1500')
  })

  it('tekstLiczby odrzuca NaN', () => {
    assert.throws(() => tekstLiczby(Number.NaN), bladFormatu('nie_liczba'))
  })

  it('bladZakresu z górną granicą i bez niej', () => {
    assert.equal(bladZakresu({ min: 0.5, max: 3 }), 'Wpisz liczbę od 0,5 do 3.')
    assert.equal(bladZakresu({ min: 1, max: Number.POSITIVE_INFINITY }), 'Wpisz liczbę co najmniej 1.')
  })

  it('sprawdzDate oddaje poprawną datę, a zła data i tekst dają BladFormatu zla_data', () => {
    const dzis = new Date(2026, 9, 25)

    assert.equal(sprawdzDate(dzis), dzis)
    assert.throws(() => sprawdzDate(new Date('x')), bladFormatu('zla_data'))
    assert.throws(() => sprawdzDate('2026-10-25'), bladFormatu('zla_data'))
  })
})

describe('kwotaJednostki i nazwaJednostki', () => {
  it('pełne złote bez groszy, inaczej z groszami; zaokrąglenie do grosza; NaN daje BladFormatu', () => {
    assert.equal(modulFormatu.kwotaJednostki(30), '30 zł')
    assert.equal(modulFormatu.kwotaJednostki(7.5), '7,50 zł')
    assert.equal(modulFormatu.kwotaJednostki(2.034), '2,03 zł')
    assert.throws(() => modulFormatu.kwotaJednostki(Number.NaN), BladFormatu)
  })

  it('m2 → „m²”, szt → „szt.”, inna jednostka z danych bez zmian', () => {
    assert.deepEqual(['m2', 'szt', 'mb'].map(modulFormatu.nazwaJednostki), ['m²', 'szt.', 'mb'])
  })
})
