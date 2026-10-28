import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DLUGOSC_OPISU, FORMY_ZAPLATY, jestZlecenie, MAKS_MINUT_PRACY, MAKS_WIZYT_ZLECENIA, MAKS_ZLECEN, ROZLICZENIA,
} from './zlecenia-ksztalt.js'

const UTWORZONE = '2026-11-02T08:00:00.000Z'

/** Seria co tydzien (wt, pt) od 2026-11-03, za wizyte, z jedna wizyta zrobiona i zaplacona. */
function seriaTygodniowa() {
  return {
    id: 'z1', klientId: 'k1', wycenaId: null, uslugaId: 'mieszkanie_standard', opis: null, rozliczenie: 'za_wizyte',
    start: '2026-11-03', koniec: null, plan: { minutyNormowe: 180, tempo: 1.2 },
    okresy: [
      { od: '2026-11-03', cykl: { co: 'tydzien', dni: [2, 5] }, godzina: '09:00', cenaWizyty: 250, cenaMiesiaca: null },
      { od: '2027-01-05', cykl: { co: 'tydzien', dni: [2] }, godzina: null, cenaWizyty: 270, cenaMiesiaca: null },
    ],
    wizyty: {
      '2026-11-03': { przeniesiona: null, odwolana: false, zrobiona: '2026-11-03T12:00:00.000Z',
        zaplata: { forma: 'gotowka', data: '2026-11-03', kwota: 250 }, minutyPracy: 200 },
      '2026-11-06': { przeniesiona: { data: '2026-11-07', godzina: null }, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null },
    },
    zaplatyMiesieczne: {}, utworzone: UTWORZONE, zmienione: UTWORZONE,
  }
}

/** Zlecenie jednorazowe 2026-11-10 bez cyklu. */
function jednorazowe() {
  return {
    ...seriaTygodniowa(), id: 'z2', opis: 'Mycie okien po zimie', start: '2026-11-10', plan: null,
    okresy: [{ od: '2026-11-10', cykl: null, godzina: '14:30', cenaWizyty: 0, cenaMiesiaca: null }], wizyty: {},
  }
}

/** Seria co miesiac rozliczana miesiecznie, z zaplata za listopad. */
function seriaMiesieczna() {
  return {
    ...seriaTygodniowa(), id: 'z3', rozliczenie: 'miesiecznie', start: '2026-11-15', koniec: '2027-06-30',
    okresy: [{ od: '2026-11-15', cykl: { co: 'miesiac', dni: [] }, godzina: null, cenaWizyty: null, cenaMiesiaca: 900 }],
    wizyty: {}, zaplatyMiesieczne: { '2026-11': { forma: 'przelew', data: '2026-11-30', kwota: 900 } },
  }
}

describe('stałe kształtu zlecenia', () => {
  it('rozliczenia, formy zapłaty i limity z planu', () => {
    assert.deepEqual(ROZLICZENIA, ['za_wizyte', 'miesiecznie'])
    assert.deepEqual(FORMY_ZAPLATY, ['gotowka', 'przelew', 'blik'])
    assert.deepEqual([MAKS_ZLECEN, MAKS_WIZYT_ZLECENIA, MAKS_MINUT_PRACY, DLUGOSC_OPISU], [10000, 2000, 1440, 120])
  })
})

describe('jestZlecenie: poprawne zlecenia', () => {
  it('seria tygodniowa za wizytę, jednorazowe z ceną 0 zł i seria miesięczna rozliczana miesięcznie → true', () => {
    assert.deepEqual([seriaTygodniowa(), jednorazowe(), seriaMiesieczna()].map(jestZlecenie), [true, true, true])
  })

  it('wizyta z wersji 1 z zapłatą bez formy, dwa tygodnie i minutyPracy 1440 → true', () => {
    const z = seriaTygodniowa()
    z.okresy[1].cykl = { co: 'dwa_tygodnie', dni: [7, 1] }
    z.wizyty['2026-11-03'] = { ...z.wizyty['2026-11-03'], zaplata: { forma: null, data: '2026-11-03', kwota: 250 }, minutyPracy: 1440 }

    assert.equal(jestZlecenie(z), true)
  })
})

describe('jestZlecenie: odmowy', () => {
  /** @type {[string, () => unknown][]} */
  const zle = [
    ['okresy w złej kolejności', () => {
      const z = seriaTygodniowa()
      z.okresy = [z.okresy[0], { ...z.okresy[1], od: '2026-11-01' }]
      return z
    }],
    ['dwa okresy z tym samym od', () => {
      const z = seriaTygodniowa()
      z.okresy = [z.okresy[0], { ...z.okresy[1], od: z.okresy[0].od }]
      return z
    }],
    ['pierwszy od różny od start', () => ({ ...seriaTygodniowa(), start: '2026-11-02' })],
    ['cykl tygodniowy bez dni', () => {
      const z = seriaTygodniowa()
      z.okresy[0].cykl = { co: 'tydzien', dni: [] }
      return z
    }],
    ['dzień tygodnia 8', () => {
      const z = seriaTygodniowa()
      z.okresy[0].cykl = { co: 'tydzien', dni: [2, 8] }
      return z
    }],
    ['powtórzony dzień tygodnia', () => {
      const z = seriaTygodniowa()
      z.okresy[0].cykl = { co: 'tydzien', dni: [2, 2] }
      return z
    }],
    ['cykl miesięczny z dniami tygodnia', () => {
      const z = seriaMiesieczna()
      z.okresy[0].cykl = { co: 'miesiac', dni: [1] }
      return z
    }],
    ['nieznany cykl', () => {
      const z = seriaMiesieczna()
      z.okresy[0].cykl = { co: 'kwartal', dni: [] }
      return z
    }],
    ['miesiecznie w zleceniu jednorazowym', () => {
      const z = jednorazowe()
      z.rozliczenie = 'miesiecznie'
      z.okresy[0] = { ...z.okresy[0], cenaWizyty: null, cenaMiesiaca: 300 }
      return z
    }],
    ['seria z okresem bez cyklu', () => {
      const z = seriaTygodniowa()
      z.okresy[1].cykl = null
      return z
    }],
    ['miesiecznie z ceną wizyty zamiast miesiąca', () => {
      const z = seriaMiesieczna()
      z.okresy[0] = { ...z.okresy[0], cenaWizyty: 250, cenaMiesiaca: null }
      return z
    }],
    ['za_wizyte z obiema cenami', () => {
      const z = seriaTygodniowa()
      z.okresy[0].cenaMiesiaca = 900
      return z
    }],
    ['ujemna cena', () => {
      const z = seriaTygodniowa()
      z.okresy[0].cenaWizyty = -1
      return z
    }],
    ['nieznane rozliczenie', () => ({ ...seriaTygodniowa(), rozliczenie: 'ryczalt' })],
    ['forma karta', () => {
      const z = seriaTygodniowa()
      z.wizyty['2026-11-03'] = { ...z.wizyty['2026-11-03'], zaplata: { forma: 'karta', data: '2026-11-03', kwota: 250 } }
      return z
    }],
    ['minutyPracy 1441', () => {
      const z = seriaTygodniowa()
      z.wizyty['2026-11-03'] = { ...z.wizyty['2026-11-03'], minutyPracy: 1441 }
      return z
    }],
    ['klucz wizyty jutro', () => {
      const z = seriaTygodniowa()
      return { ...z, wizyty: { ...z.wizyty, jutro: z.wizyty['2026-11-03'] } }
    }],
    ['klucz zapłaty miesięcznej 2026-13', () => {
      const z = seriaMiesieczna()
      return { ...z, zaplatyMiesieczne: { '2026-13': z.zaplatyMiesieczne['2026-11'] } }
    }],
    ['koniec przed start', () => ({ ...seriaTygodniowa(), koniec: '2026-11-02' })],
    ['godzina 24:00', () => {
      const z = seriaTygodniowa()
      z.okresy[0].godzina = '24:00'
      return z
    }],
    ['godzina przeniesienia 9:00', () => {
      const z = seriaTygodniowa()
      z.wizyty['2026-11-06'] = { ...z.wizyty['2026-11-06'], przeniesiona: { data: '2026-11-07', godzina: '9:00' } }
      return z
    }],
    ['opis z białym znakiem na końcu', () => ({ ...jednorazowe(), opis: 'Okna ' })],
    ['opis 121 znaków', () => ({ ...jednorazowe(), opis: 'a'.repeat(DLUGOSC_OPISU + 1) })],
    ['puste klientId', () => ({ ...seriaTygodniowa(), klientId: '' })],
    ['brak okresów', () => ({ ...seriaTygodniowa(), okresy: [] })],
    ['plan z zerowym tempem', () => ({ ...seriaTygodniowa(), plan: { minutyNormowe: 180, tempo: 0 } })],
    ['data utworzenia „wczoraj”', () => ({ ...seriaTygodniowa(), utworzone: 'wczoraj' })],
  ]

  for (const [opis, zlecenie] of zle) {
    it(`${opis} → false`, () => {
      assert.equal(jestZlecenie(zlecenie()), false)
    })
  }

  it(`${MAKS_WIZYT_ZLECENIA + 1} wpisów w wizyty → false, ${MAKS_WIZYT_ZLECENIA} → true`, () => {
    const stanWizyty = { przeniesiona: null, odwolana: true, zrobiona: null, zaplata: null, minutyPracy: null }
    const dni = Array.from({ length: MAKS_WIZYT_ZLECENIA + 1 }, (_, i) => new Date(Date.UTC(2026, 10, 3 + i)).toISOString().slice(0, 10))
    const wizyty = (n) => Object.fromEntries(dni.slice(0, n).map((d) => [d, stanWizyty]))

    assert.equal(jestZlecenie({ ...seriaTygodniowa(), wizyty: wizyty(MAKS_WIZYT_ZLECENIA) }), true)
    assert.equal(jestZlecenie({ ...seriaTygodniowa(), wizyty: wizyty(MAKS_WIZYT_ZLECENIA + 1) }), false)
  })

  it('null, tablica i tekst → false', () => {
    assert.deepEqual([null, [], 'z1'].map(jestZlecenie), [false, false, false])
  })
})
