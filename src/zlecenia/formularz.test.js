import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import { BladZlecenia, doZaplanowania } from '../dane/zlecenia.js'
import { wystapienia } from '../kalendarz/wystapienia.js'
import {
  adresZaplanowania, bledyFormularza, BEZ_POWTARZANIA, czyMaDni, doZapisu, etykietaCeny, INNA_USLUGA, opisZlecenia, tekstOdmowy, tekstPlanu,
  wartosciPoczatkowe, zapiszFormularz, zCyklem, zData, zDniem, zRozliczeniem,
} from './formularz.js'

const DZIS = '2026-11-03' // wtorek
const TERAZ = new Date('2026-11-03T08:00:00.000Z')
const DOMYSLNE = { tempo: 1.3 }
const KATALOG = {
  uslugi: [
    { id: 'mieszkanie_standard', nazwa: 'Sprzątanie mieszkania (standard)' },
    { id: 'sprzatanie_biur', nazwa: 'Sprzątanie biur' },
    { id: 'agd', nazwa: 'Mycie AGD', tylko_dodatek: true },
  ],
}
const KLIENT = { id: 'k1', nazwa: 'Jan Nowak', telefon: null, adres: null, notatki: null, utworzony: TERAZ.toISOString(), zmieniony: TERAZ.toISOString() }
const PUSTY_STAN = {
  wersja: 2, ustawienia: null, wyceny: [], klienci: [KLIENT], zlecenia: [], licznikNumerow: {}, kopia: { ostatnia: null, zmianaOd: null },
  preferencje: { iosInstrukcjaZamknieta: false },
}

/** @param {object} [zmiana] przyjeta wycena jednorazowa za 300 zl, 120 minut normowych */
const wycenaTestowa = (zmiana = {}) => ({
  id: 'w1', numer: '4/11/2026', status: 'przyjeta', rodzaj: 'dokladna', klientId: 'k1', klient: { nazwa: 'Jan Nowak', adres: '', termin: null },
  wejscie: { uslugaId: 'mieszkanie_standard', wariantId: null }, szybka: null, cenaReczna: null,
  wynik: { cena: 300, minutyNormowe: 120, wizytWMiesiacu: null }, ...zmiana,
})

/** @param {string} wariantId @param {number} wizytWMiesiacu @param {object} [zmiana] przyjety abonament za 120 zl za wizyte */
const abonamentTestowy = (wariantId, wizytWMiesiacu, zmiana = {}) => wycenaTestowa({
  wejscie: { uslugaId: 'sprzatanie_biur', wariantId }, wynik: { cena: 120, minutyNormowe: 95, wizytWMiesiacu }, ...zmiana,
})

/** @param {object} [zmiana] szybka wycena z widelkami 250–320 zl */
const szybkaTestowa = (zmiana = {}) => wycenaTestowa({ rodzaj: 'szybka', szybka: { stan: 'typowy', tryb: 'widelki', od: 250, do: 320 }, ...zmiana })

/** @param {object} w wycena @param {string} [dzis] */
const zWyceny = (w, dzis = DZIS) => {
  const wartosci = wartosciPoczatkowe({ ...PUSTY_STAN, wyceny: [w] }, KATALOG, { wycenaId: w.id, klientId: null, data: null }, dzis)
  assert.ok(wartosci)
  return wartosci
}

/** @param {{ klientId?: string | null, data?: string | null }} [zrodlo] */
const reczne = ({ klientId = null, data = null } = {}) => {
  const wartosci = wartosciPoczatkowe(PUSTY_STAN, KATALOG, { wycenaId: null, klientId, data }, DZIS)
  assert.ok(wartosci)
  return wartosci
}

/** Reczny formularz bez bledow: klient, usluga, 200 zl, dzis. @param {object} [zmiana] */
const wypelniony = (zmiana = {}) => ({ ...reczne({ klientId: 'k1' }), usluga: 'mieszkanie_standard', cena: '200', ...zmiana })

/** @param {object} stan */
function magazynZeStanem(stan) {
  const magazyn = utworzMagazyn(new PamiecMagazynu(), { teraz: () => TERAZ, loguj: () => {}, poprosOTrwalosc: () => true })
  magazyn.zapiszCalosc(stan)
  return magazyn
}

/** @param {string} kod */
const blad = (kod) => ({ name: BladZlecenia.name, kod })

describe('wartosciPoczatkowe z wyceny', () => {
  it('przyjęty abonament_3 po 120 zł i 13 wizytach: co tydzień pn, śr, pt, raz w miesiącu, 1560 zł, plan z migawki', () => {
    const w = zWyceny(abonamentTestowy('abonament_3', 13))

    assert.equal(w.cykl, 'tydzien')
    assert.deepEqual(w.dni, [1, 3, 5])
    assert.equal(w.rozliczenie, 'miesiecznie')
    assert.equal(w.cena, '1560')
    assert.equal(w.minutyNormowe, 95)
    assert.equal(w.usluga, 'sprzatanie_biur')
    assert.equal(w.klientId, 'k1')
    assert.equal(w.numerWyceny, '4/11/2026')
  })

  it('dni abonamentu: 2× pn i czw, 5× pn–pt, 1× dzień tygodnia daty startu', () => {
    assert.deepEqual(zWyceny(abonamentTestowy('abonament_2', 8.67)).dni, [1, 4])
    assert.deepEqual(zWyceny(abonamentTestowy('abonament_5', 21.67)).dni, [1, 2, 3, 4, 5])
    assert.deepEqual(zWyceny(abonamentTestowy('abonament_1', 4.33)).dni, [2])
  })

  it('kwota miesięczna zaokrągla się do złotówki, a cena ręczna zastępuje cenę za wizytę', () => {
    assert.equal(zWyceny(abonamentTestowy('abonament_1', 4.33)).cena, '520')
    assert.equal(zWyceny(abonamentTestowy('abonament_3', 13, { cenaReczna: 100 })).cena, '1300')
  })

  it('wycena jednorazowa: cena z migawki, bez serii i za wizytę; ręczna wygrywa', () => {
    const w = zWyceny(wycenaTestowa())

    assert.equal(w.cena, '300')
    assert.equal(w.cykl, BEZ_POWTARZANIA)
    assert.equal(w.rozliczenie, 'za_wizyte')
    assert.equal(w.podpowiedzCeny, null)
    assert.equal(zWyceny(wycenaTestowa({ cenaReczna: 280 })).cena, '280')
  })

  it('szybka z widełkami 250–320 zł: pusta cena z podpowiedzią; z ceną ręczną cena ręczna bez podpowiedzi', () => {
    const widelki = zWyceny(szybkaTestowa())
    const zReczna = zWyceny(szybkaTestowa({ cenaReczna: 290 }))

    assert.equal(widelki.cena, '')
    assert.equal(widelki.podpowiedzCeny, 'W wycenie: 250–320 zł')
    assert.equal(zReczna.cena, '290')
    assert.equal(zReczna.podpowiedzCeny, null)
  })

  it('szybka w trybie „od”: pusta cena z podpowiedzią; w trybie „ok”: kwota z szybkiej wyceny, nie cena z modelu', () => {
    const od = zWyceny(szybkaTestowa({ szybka: { stan: 'typowy', tryb: 'od', od: 400, do: 400 } }))
    const ok = zWyceny(szybkaTestowa({ szybka: { stan: 'typowy', tryb: 'ok', od: 250, do: 250 }, wynik: { cena: 253, minutyNormowe: 120, wizytWMiesiacu: null } }))

    assert.equal(od.cena, '')
    assert.equal(od.podpowiedzCeny, 'W wycenie: od 400 zł')
    assert.equal(ok.cena, '250')
    assert.equal(ok.podpowiedzCeny, null)
  })

  it('wycena zamieniona na dokładną liczy się z migawki, mimo zapisanych widełek', () => {
    assert.equal(zWyceny(szybkaTestowa({ rodzaj: 'dokladna' })).cena, '300')
  })

  it('termin „2026-11-14T09:00” daje datę i godzinę, sama data — datę bez godziny, „sobota rano” — dziś bez godziny', () => {
    /** @param {string} termin */
    const zTerminem = (termin) => zWyceny(wycenaTestowa({ klient: { nazwa: '', adres: '', termin } }))

    assert.equal(zTerminem('2026-11-14T09:00').data, '2026-11-14')
    assert.equal(zTerminem('2026-11-14T09:00').godzina, '09:00')
    assert.equal(zTerminem('2026-11-14').data, '2026-11-14')
    assert.equal(zTerminem('2026-11-14').godzina, '')
    assert.equal(zTerminem('sobota rano').data, DZIS)
    assert.equal(zTerminem('sobota rano').godzina, '')
    assert.equal(zTerminem('2026-13-45').data, DZIS)
  })

  it('abonament 1× bierze dzień tygodnia z terminu', () => {
    const w = zWyceny(abonamentTestowy('abonament_1', 4.33, { klient: { nazwa: '', adres: '', termin: '2026-11-14' } }))

    assert.deepEqual(w.dni, [6])
  })

  it('wycena nieprzyjęta albo usunięta nie daje formularza', () => {
    const stan = { ...PUSTY_STAN, wyceny: [wycenaTestowa({ status: 'wyslana' })] }

    assert.equal(wartosciPoczatkowe(stan, KATALOG, { wycenaId: 'w1', klientId: null, data: null }, DZIS), null)
    assert.equal(wartosciPoczatkowe(stan, KATALOG, { wycenaId: 'nie-ma', klientId: null, data: null }, DZIS), null)
  })

  it('usługa wyceny spoza listy (dodatek, usunięta z danych) zostaje wśród opcji', () => {
    const opcje = (/** @type {string} */ uslugaId) => zWyceny(wycenaTestowa({ wejscie: { uslugaId, wariantId: null } })).opcjeUslug.map((o) => o.wartosc)

    assert.ok(opcje('agd').includes('agd'))
    assert.equal(opcje('stara')[0], 'stara')
  })
})

describe('wartosciPoczatkowe ręcznie', () => {
  it('klient z `?klient=`, data z `?data=`, za wizytę, bez serii i planu', () => {
    const w = reczne({ klientId: 'k1', data: '2026-11-20' })

    assert.equal(w.klientId, 'k1')
    assert.equal(w.data, '2026-11-20')
    assert.equal(w.rozliczenie, 'za_wizyte')
    assert.equal(w.cykl, BEZ_POWTARZANIA)
    assert.equal(w.minutyNormowe, null)
    assert.equal(w.wycenaId, null)
  })

  it('nieznany klient i zła data z adresu: bez klienta, dziś', () => {
    const w = reczne({ klientId: 'nie-ma', data: '2026-02-31' })

    assert.equal(w.klientId, null)
    assert.equal(w.data, DZIS)
  })

  it('opcje usług: katalog bez dodatków i „Inna usługa” na końcu', () => {
    assert.deepEqual(reczne().opcjeUslug, [
      { wartosc: 'mieszkanie_standard', etykieta: 'Sprzątanie mieszkania (standard)' },
      { wartosc: 'sprzatanie_biur', etykieta: 'Sprzątanie biur' },
      { wartosc: INNA_USLUGA, etykieta: 'Inna usługa' },
    ])
  })
})

describe('zmiany pól', () => {
  it('„Co tydzień” bierze dzień tygodnia daty, a dni idą za zmianą daty, dopóki nie zmieni ich użytkownik', () => {
    const seria = zCyklem(reczne(), 'tydzien')

    assert.deepEqual(seria.dni, [2])
    assert.deepEqual(zData(seria, '2026-11-06').dni, [5])
    assert.deepEqual(zData(zDniem(seria, 4), '2026-11-06').dni, [2, 4])
  })

  it('dni abonamentu 3× nie idą za datą', () => {
    assert.deepEqual(zData(zWyceny(abonamentTestowy('abonament_3', 13)), '2026-11-04').dni, [1, 3, 5])
  })

  it('zDniem włącza dzień rosnąco i wyłącza wybrany', () => {
    const seria = zCyklem(reczne(), 'tydzien')

    assert.deepEqual(zDniem(seria, 1).dni, [1, 2])
    assert.deepEqual(zDniem(seria, 2).dni, [])
  })

  it('„Nie” wraca do rozliczenia za wizytę z ceną za wizytę z abonamentu', () => {
    const w = zCyklem(zWyceny(abonamentTestowy('abonament_3', 13)), BEZ_POWTARZANIA)

    assert.equal(w.rozliczenie, 'za_wizyte')
    assert.equal(w.cena, '120')
  })

  it('zmiana płatności abonamentu zamienia kwotę, a wpisana ręcznie zostaje', () => {
    const abonament = zWyceny(abonamentTestowy('abonament_3', 13))

    assert.equal(zRozliczeniem(abonament, 'za_wizyte').cena, '120')
    assert.equal(zRozliczeniem(zRozliczeniem(abonament, 'za_wizyte'), 'miesiecznie').cena, '1560')
    assert.equal(zRozliczeniem({ ...abonament, cena: '1500' }, 'za_wizyte').cena, '1500')
  })

  it('etykieta ceny zależy od rozliczenia; dni mają tylko cykle tygodniowe', () => {
    assert.equal(etykietaCeny('za_wizyte'), 'Cena (zł)')
    assert.equal(etykietaCeny('miesiecznie'), 'Kwota za miesiąc (zł)')
    assert.deepEqual(['tydzien', 'dwa_tygodnie', 'miesiac', BEZ_POWTARZANIA].map(czyMaDni), [true, true, false, false])
  })
})

describe('bledyFormularza', () => {
  it('wypełniony formularz nie ma błędów, także z ceną 0 zł', () => {
    assert.deepEqual(bledyFormularza(wypelniony()), {})
    assert.deepEqual(bledyFormularza(wypelniony({ cena: '0' })), {})
  })

  it('bez klienta → klient', () => {
    assert.deepEqual(bledyFormularza(wypelniony({ klientId: null })), { klient: 'brak_klienta' })
  })

  it('cena „-5”, pusta i nie-liczba → cena', () => {
    assert.deepEqual(bledyFormularza(wypelniony({ cena: '-5' })), { cena: 'zla_cena' })
    assert.deepEqual(bledyFormularza(wypelniony({ cena: '' })), { cena: 'zla_cena' })
    assert.deepEqual(bledyFormularza(wypelniony({ cena: 'dwieście' })), { cena: 'zla_cena' })
    assert.deepEqual(bledyFormularza(wypelniony({ cena: '9'.repeat(400) })), { cena: 'zla_cena' })
  })

  it('cykl tygodniowy i dwutygodniowy bez dni → dni, miesięczny bez dni jest poprawny', () => {
    assert.deepEqual(bledyFormularza(wypelniony({ cykl: 'tydzien', dni: [] })), { dni: 'brak_dni' })
    assert.deepEqual(bledyFormularza(wypelniony({ cykl: 'dwa_tygodnie', dni: [] })), { dni: 'brak_dni' })
    assert.deepEqual(bledyFormularza(wypelniony({ cykl: 'miesiac', dni: [] })), {})
  })

  it('bez daty, zła data i niepełny rok → data', () => {
    assert.deepEqual(bledyFormularza(wypelniony({ data: '' })), { data: 'brak_daty' })
    assert.deepEqual(bledyFormularza(wypelniony({ data: '2026-02-31' })), { data: 'brak_daty' })
    assert.deepEqual(bledyFormularza(wypelniony({ data: '0026-11-03' })), { data: 'brak_daty' })
  })

  it('bez usługi albo „Inna usługa” bez opisu → usluga; z opisem poprawnie', () => {
    assert.deepEqual(bledyFormularza(wypelniony({ usluga: null })), { usluga: 'brak_uslugi' })
    assert.deepEqual(bledyFormularza(wypelniony({ usluga: INNA_USLUGA, opis: '   ' })), { usluga: 'brak_uslugi' })
    assert.deepEqual(bledyFormularza(wypelniony({ usluga: INNA_USLUGA, opis: 'Mycie witryny' })), {})
  })
})

describe('doZapisu', () => {
  it('zlecenie jednorazowe za wizytę z godziną', () => {
    assert.deepEqual(doZapisu(wypelniony({ cena: '199,50', godzina: '10:00' })), {
      klientId: 'k1', uslugaId: 'mieszkanie_standard', opis: null, rozliczenie: 'za_wizyte', start: DZIS, cykl: null, godzina: '10:00',
      cenaWizyty: 199.5, cenaMiesiaca: null,
    })
  })

  it('seria co tydzień bez godziny, z dniami; co miesiąc bez dni; „Inna usługa” z opisem bez usługi', () => {
    const tydzien = doZapisu(zCyklem(wypelniony(), 'tydzien'))
    const miesiac = doZapisu(zCyklem(wypelniony(), 'miesiac'))
    const inna = doZapisu(wypelniony({ usluga: INNA_USLUGA, opis: 'Mycie witryny' }))

    assert.deepEqual(tydzien.cykl, { co: 'tydzien', dni: [2] })
    assert.equal(tydzien.godzina, null)
    assert.deepEqual(miesiac.cykl, { co: 'miesiac', dni: [] })
    assert.equal(inna.uslugaId, null)
    assert.equal(inna.opis, 'Mycie witryny')
  })

  it('rozliczenie miesięczne ma tylko kwotę za miesiąc', () => {
    const dane = doZapisu(zWyceny(abonamentTestowy('abonament_3', 13)))

    assert.equal(dane.rozliczenie, 'miesiecznie')
    assert.equal(dane.cenaMiesiaca, 1560)
    assert.equal(dane.cenaWizyty, null)
  })

  it('formularz z błędami daje BladZlecenia `dane`', () => {
    assert.throws(() => doZapisu(wypelniony({ klientId: null })), blad('dane'))
    assert.throws(() => doZapisu(wypelniony({ cena: '' })), blad('dane'))
  })
})

describe('zapiszFormularz', () => {
  it('ręczne zlecenie co tydzień: bez planu i wyceny, wizyty co 7 dni od daty startu', () => {
    const magazyn = magazynZeStanem(PUSTY_STAN)

    const z = zapiszFormularz({ magazyn, domyslne: DOMYSLNE }, 'z1', zCyklem(wypelniony({ godzina: '10:00' }), 'tydzien'))

    assert.equal(z.id, 'z1')
    assert.equal(z.plan, null)
    assert.equal(z.wycenaId, null)
    assert.deepEqual(wystapienia(z, DZIS, '2026-11-17').map((w) => [w.data, w.godzina]),
      [[DZIS, '10:00'], ['2026-11-10', '10:00'], ['2026-11-17', '10:00']])
  })

  it('z abonamentu: plan z migawki i tempa firmy, kwota miesięczna, wycena przestaje być do zaplanowania', () => {
    const magazyn = magazynZeStanem({ ...PUSTY_STAN, wyceny: [abonamentTestowy('abonament_3', 13)] })
    const wartosci = zWyceny(abonamentTestowy('abonament_3', 13))

    const z = zapiszFormularz({ magazyn, domyslne: DOMYSLNE }, 'z1', wartosci)

    const stan = wczytajStan(magazyn)
    assert.deepEqual(z.plan, { minutyNormowe: 95, tempo: 1.3 })
    assert.equal(z.wycenaId, 'w1')
    assert.equal(z.uslugaId, 'sprzatanie_biur')
    assert.equal(z.okresy[0].cenaMiesiaca, 1560)
    assert.equal(doZaplanowania(stan, stan.wyceny[0]), false)
  })

  it('drugi zapis z tym samym id nie dubluje zlecenia', () => {
    const magazyn = magazynZeStanem(PUSTY_STAN)
    const kontekst = { magazyn, domyslne: DOMYSLNE }

    zapiszFormularz(kontekst, 'z1', wypelniony())
    zapiszFormularz(kontekst, 'z1', wypelniony())

    assert.equal(wczytajStan(magazyn).zlecenia.length, 1)
  })

  it('wycena odrzucona po otwarciu formularza: odmowa `zly_status` i brak zlecenia', () => {
    const magazyn = magazynZeStanem({ ...PUSTY_STAN, wyceny: [wycenaTestowa({ status: 'odrzucona' })] })

    assert.throws(() => zapiszFormularz({ magazyn, domyslne: DOMYSLNE }, 'z1', zWyceny(wycenaTestowa())), blad('zly_status'))
    assert.deepEqual(wczytajStan(magazyn).zlecenia, [])
  })
})

describe('tekstOdmowy', () => {
  it('odmowa zapisu ma własny tekst, a inny błąd zlecenia i obcy błąd to awaria', () => {
    assert.equal(tekstOdmowy(new BladZlecenia('zly_status')), 'Ta wycena nie jest już przyjęta, więc zlecenia nie zapisano.')
    assert.equal(tekstOdmowy(new BladZlecenia('brak_klienta')), 'Tego klienta już nie ma. Wybierz innego.')
    assert.equal(tekstOdmowy(new BladZlecenia('cykl')), null)
    assert.equal(tekstOdmowy(new TypeError('x')), null)
  })
})

describe('tekstPlanu', () => {
  it('planowany czas: minuty normowe × tempo firmy; bez migawki brak tekstu', () => {
    assert.equal(tekstPlanu({ minutyNormowe: 120, usluga: 'mieszkanie_standard' }, PUSTY_STAN, DOMYSLNE), 'Planowany czas: 2 h 36 min')
    assert.equal(tekstPlanu({ minutyNormowe: null, usluga: null }, PUSTY_STAN, DOMYSLNE), null)
  })

  it('ręczne tempo z ustawień zastępuje domyślne', () => {
    const stan = { ...PUSTY_STAN, ustawienia: { tempo: { reczne: 1 } } }

    assert.equal(tekstPlanu({ minutyNormowe: 120, usluga: 'mieszkanie_standard' }, stan, DOMYSLNE), 'Planowany czas: 2 h')
  })
})

describe('opisZlecenia', () => {
  /** @param {object} okres */
  const opis = (okres) => opisZlecenia({ start: DZIS, okresy: [{ od: DZIS, cykl: null, godzina: null, cenaWizyty: 100, cenaMiesiaca: null, ...okres }] })

  it('dzień, godzina i powtarzanie', () => {
    assert.equal(opis({}), 'wt 3 lis')
    assert.equal(opis({ godzina: '09:30' }), 'wt 3 lis, 9:30')
    assert.equal(opis({ godzina: '10:00', cykl: { co: 'tydzien', dni: [2] } }), 'wt 3 lis, 10:00 · Co tydzień')
    assert.equal(opis({ cykl: { co: 'miesiac', dni: [] } }), 'wt 3 lis · Co miesiąc')
  })
})

describe('adresZaplanowania', () => {
  it('prowadzi do formularza z wyceną w zapytaniu', () => {
    assert.equal(adresZaplanowania('w 1'), '#/zlecenie/nowe?wycena=w+1')
  })
})
