// Czas lokalny ze zmiana czasu (25.10.2026 i 28.03.2027): arytmetyka dni na czasie lokalnym przesunelaby wynik o dzien.
process.env.TZ = 'Europe/Warsaw'

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  BladKalendarza, dniOdDo, dodajDni, dzienTygodnia, dzienWMiesiacu, jestGodzina, miesiacDnia, ostatniDzienMiesiaca,
  poczatekTygodnia, porownajDni, siatkaMiesiaca,
} from './daty.js'

/** @param {string} kod */
const bladKalendarza = (kod) => ({ name: BladKalendarza.name, kod })

describe('dodajDni', () => {
  it('przez koniec miesiąca i roku', () => {
    assert.equal(dodajDni('2026-10-30', 3), '2026-11-02')
    assert.equal(dodajDni('2026-12-31', 1), '2027-01-01')
    assert.equal(dodajDni('2026-03-01', -1), '2026-02-28')
  })

  it('przez zmianę czasu 25.10.2026 i 28.03.2027 bez przesunięcia o dzień', () => {
    assert.equal(dodajDni('2026-10-24', 1), '2026-10-25')
    assert.equal(dodajDni('2026-10-25', 1), '2026-10-26')
    assert.equal(dodajDni('2027-03-27', 1), '2027-03-28')
    assert.equal(dodajDni('2027-03-28', 1), '2027-03-29')
  })

  it('nieistniejący dzień albo ułamek dni → BladKalendarza', () => {
    assert.throws(() => dodajDni('2026-02-30', 1), bladKalendarza('dzien'))
    assert.throws(() => dodajDni('2026-10-29', 1.5), bladKalendarza('liczba_dni'))
  })
})

describe('dzienTygodnia i poczatekTygodnia', () => {
  it('ISO: 2026-11-01 to niedziela (7), 2026-11-02 poniedziałek (1)', () => {
    assert.equal(dzienTygodnia('2026-11-01'), 7)
    assert.equal(dzienTygodnia('2026-11-02'), 1)
    assert.equal(dzienTygodnia('2026-10-29'), 4)
  })

  it('tydzień zaczyna się w poniedziałek, także dla niedzieli', () => {
    assert.equal(poczatekTygodnia('2026-10-29'), '2026-10-26')
    assert.equal(poczatekTygodnia('2026-11-01'), '2026-10-26')
    assert.equal(poczatekTygodnia('2026-11-02'), '2026-11-02')
  })

  it('zły format dnia → BladKalendarza', () => {
    assert.throws(() => dzienTygodnia('29.10.2026'), bladKalendarza('dzien'))
  })
})

describe('dniOdDo i porownajDni', () => {
  it('liczba dni od pierwszego do drugiego dnia, przez zmianę czasu', () => {
    assert.equal(dniOdDo('2026-10-24', '2026-10-26'), 2)
    assert.equal(dniOdDo('2027-03-29', '2027-03-27'), -2)
    assert.equal(dniOdDo('2026-01-01', '2027-01-01'), 365)
  })

  it('porownajDni sortuje dni rosnąco', () => {
    assert.deepEqual(['2026-11-10', '2026-02-01', '2026-11-09'].sort(porownajDni), ['2026-02-01', '2026-11-09', '2026-11-10'])
    assert.equal(porownajDni('2026-11-09', '2026-11-09'), 0)
  })

  it('zły dzień → BladKalendarza', () => {
    assert.throws(() => dniOdDo('2026-10-24', '2026-13-01'), bladKalendarza('dzien'))
    assert.throws(() => porownajDni('2026-10-24', null), bladKalendarza('dzien'))
  })
})

describe('miesiące', () => {
  it('ostatniDzienMiesiaca: luty zwykły i przestępny, listopad, grudzień', () => {
    assert.equal(ostatniDzienMiesiaca(2027, 2), 28)
    assert.equal(ostatniDzienMiesiaca(2028, 2), 29)
    assert.equal(ostatniDzienMiesiaca(2026, 11), 30)
    assert.equal(ostatniDzienMiesiaca(2026, 12), 31)
  })

  it('dzienWMiesiacu(2027, 2, 31) → 2027-02-28; w dłuższym miesiącu bez przycięcia', () => {
    assert.equal(dzienWMiesiacu(2027, 2, 31), '2027-02-28')
    assert.equal(dzienWMiesiacu(2026, 3, 31), '2026-03-31')
    assert.equal(dzienWMiesiacu(2026, 11, 5), '2026-11-05')
  })

  it('miesiacDnia → RRRR-MM', () => {
    assert.equal(miesiacDnia('2026-11-05'), '2026-11')
  })

  it('miesiąc 13, dzień miesiąca 0 albo rok 99 → BladKalendarza', () => {
    assert.throws(() => dzienWMiesiacu(2026, 13, 1), bladKalendarza('miesiac'))
    assert.throws(() => dzienWMiesiacu(2026, 1, 0), bladKalendarza('dzien_miesiaca'))
    assert.throws(() => ostatniDzienMiesiaca(99, 1), bladKalendarza('miesiac'))
    assert.throws(() => miesiacDnia('2026-11'), bladKalendarza('dzien'))
  })
})

describe('siatkaMiesiaca', () => {
  it('listopad 2026: pierwszy tydzień ma 6 pustych dni i niedzielę 1 listopada, ostatni dzień to 30 listopada', () => {
    const siatka = siatkaMiesiaca(2026, 11)

    assert.deepEqual(siatka[0], [null, null, null, null, null, null, '2026-11-01'])
    assert.deepEqual(siatka.at(-1), ['2026-11-30', null, null, null, null, null, null])
    assert.equal(siatka.length, 6)
    assert.deepEqual(siatka[1], ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
    assert.equal(siatka.flat().filter((d) => d !== null).length, 30)
  })

  it('luty 2027 od poniedziałku do niedzieli: 4 pełne tygodnie bez pustych dni', () => {
    const siatka = siatkaMiesiaca(2027, 2)

    assert.equal(siatka.length, 4)
    assert.equal(siatka[0][0], '2027-02-01')
    assert.equal(siatka[3][6], '2027-02-28')
  })

  it('miesiąc 0 → BladKalendarza', () => {
    assert.throws(() => siatkaMiesiaca(2026, 0), bladKalendarza('miesiac'))
  })
})

describe('jestGodzina', () => {
  it('HH:MM od 00:00 do 23:59', () => {
    assert.equal(jestGodzina('00:00'), true)
    assert.equal(jestGodzina('09:30'), true)
    assert.equal(jestGodzina('23:59'), true)
  })

  it('odrzuca 24:00, 9:30, 10:60, sekundy i nie-tekst', () => {
    for (const zla of ['24:00', '9:30', '10:60', '10:00:00', '', null, 930]) assert.equal(jestGodzina(zla), false, String(zla))
  })
})
