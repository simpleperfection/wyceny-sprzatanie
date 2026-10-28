import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { assertBlisko, katalogZDysku } from '../../tests/pomocnicze.js'
import { BladWejscia } from '../silnik/bledy.js'
import {
  infoDojazdu, infoProgu, przelaczPozycje, ustawDodatek, ustawDojazd, ustawIlosc, ustawPoziomBrudu, ustawPowierzchnie, wycenaDodatku,
} from './pozycje.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */

/** @type {Katalog} */
let katalog

before(async () => {
  katalog = await katalogZDysku()
})

/** Domyslne stawki dojazdu z data/ceny.json (koszty_firmy.dojazd). */
const STAWKI = Object.freeze({ klient_zl_km: 2, darmowy_promien_km: 10, koszt_firmy_zl_km: 1.15 })

/** @param {string} uslugaId @param {{ id: string, ilosc: number }[]} pozycje @returns {WejscieWyceny} */
const wejscie = (uslugaId, pozycje) => ({ uslugaId, wojewodztwoId: null, wariantId: null, pozycje, dodatki: [], dojazdKm: 0 })
/** @param {string} kod */
const bladWejscia = (kod) => ({ name: BladWejscia.name, kod })
const okna = () => wejscie('okna', [{ id: 'okno_1', ilosc: 0 }, { id: 'okno_2', ilosc: 0 }, { id: 'okno_balkonowe', ilosc: 0 }])
const mieszkanie = () => ({ ...wejscie('mieszkanie_standard', []), pomieszczenia: [{ typ: 'pokoj', m2: 10 }] })

describe('ustawIlosc', () => {
  it('okno 1-skrzydłowe: 4 szt. zapisuje 4, pozostałe pozycje bez zmian', () => {
    const wynik = ustawIlosc(okna(), 'okno_1', 4, katalog)

    assert.deepEqual(wynik.pozycje, [{ id: 'okno_1', ilosc: 4 }, { id: 'okno_2', ilosc: 0 }, { id: 'okno_balkonowe', ilosc: 0 }])
  })

  it('2,5 szt. okna, ilość ujemna i ponad 100 000 to błąd `ilosc`', () => {
    assert.throws(() => ustawIlosc(okna(), 'okno_1', 2.5, katalog), bladWejscia('ilosc'))
    assert.throws(() => ustawIlosc(okna(), 'okno_1', -1, katalog), bladWejscia('ilosc'))
    assert.throws(() => ustawIlosc(okna(), 'okno_1', 100_001, katalog), bladWejscia('ilosc'))
  })

  it('dywan w m² przyjmuje ułamek; brakująca pozycja dochodzi w kolejności katalogu', () => {
    const wynik = ustawIlosc(wejscie('dywany', [{ id: 'wykladzina', ilosc: 3 }]), 'dywan', 6.5, katalog)

    assert.deepEqual(wynik.pozycje, [{ id: 'dywan', ilosc: 6.5 }, { id: 'wykladzina', ilosc: 3 }])
  })

  it('usługa z jedną powierzchnią (kostka) i nieznana pozycja to błąd', () => {
    assert.throws(() => ustawIlosc(wejscie('mycie_kostki', [{ id: 'mycie', ilosc: 0 }]), 'mycie', 40, katalog), bladWejscia('tryb_uslugi'))
    assert.throws(() => ustawIlosc(okna(), 'okno_9', 1, katalog), bladWejscia('nieznana_pozycja'))
  })
})

describe('ustawPowierzchnie i przelaczPozycje', () => {
  it('ustawPowierzchnie(40) z włączonymi myciem i mchem daje obu pozycjom 40 m²', () => {
    const kostka = wejscie('mycie_kostki', [{ id: 'mycie', ilosc: 0 }, { id: 'mech', ilosc: 0 }])

    const wynik = ustawPowierzchnie(kostka, 40, katalog)

    assert.deepEqual(wynik.pozycje, [{ id: 'mycie', ilosc: 40 }, { id: 'mech', ilosc: 40 }])
  })

  it('powierzchnia poza 0–100 000 i usługa z licznikami to błąd', () => {
    const kostka = wejscie('mycie_kostki', [{ id: 'mycie', ilosc: 0 }])

    assert.throws(() => ustawPowierzchnie(kostka, -5, katalog), bladWejscia('ilosc'))
    assert.throws(() => ustawPowierzchnie(kostka, 100_005, katalog), bladWejscia('ilosc'))
    assert.throws(() => ustawPowierzchnie(okna(), 40, katalog), bladWejscia('tryb_uslugi'))
  })

  it('włączenie dopłaty dodaje ją z bieżącą powierzchnią w kolejności katalogu', () => {
    const kostka = wejscie('mycie_kostki', [{ id: 'mycie', ilosc: 40 }, { id: 'olej', ilosc: 40 }])

    const wynik = przelaczPozycje(kostka, 'mech', true, katalog)

    assert.deepEqual(wynik.pozycje, [{ id: 'mycie', ilosc: 40 }, { id: 'mech', ilosc: 40 }, { id: 'olej', ilosc: 40 }])
  })

  it('wyłączenie dopłaty ją usuwa, a wyłączenie jedynej pozycji głównej to błąd `brak_pozycji_glownej`', () => {
    const kostka = wejscie('mycie_kostki', [{ id: 'mycie', ilosc: 40 }, { id: 'mech', ilosc: 40 }])

    assert.deepEqual(przelaczPozycje(kostka, 'mech', false, katalog).pozycje, [{ id: 'mycie', ilosc: 40 }])
    assert.throws(() => przelaczPozycje(kostka, 'mycie', false, katalog), bladWejscia('brak_pozycji_glownej'))
  })

  it('przy dwóch pozycjach głównych jedną można wyłączyć', () => {
    const doczyszczanie = wejscie('doczyszczanie', [{ id: 'doczyszczanie_posadzki', ilosc: 80 }, { id: 'doczyszczanie_fug', ilosc: 80 }])

    const wynik = przelaczPozycje(doczyszczanie, 'doczyszczanie_posadzki', false, katalog)

    assert.deepEqual(wynik.pozycje, [{ id: 'doczyszczanie_fug', ilosc: 80 }])
  })
})

describe('ustawPoziomBrudu', () => {
  it('poziom 3 zapisuje 3, poziom 4 i 0 to błąd `poziom_brudu`', () => {
    const doczyszczanie = wejscie('doczyszczanie', [{ id: 'doczyszczanie_posadzki', ilosc: 80 }])

    assert.equal(ustawPoziomBrudu(doczyszczanie, 3, katalog).poziomBrudu, 3)
    assert.throws(() => ustawPoziomBrudu(doczyszczanie, 4, katalog), bladWejscia('poziom_brudu'))
    assert.throws(() => ustawPoziomBrudu(doczyszczanie, 0, katalog), bladWejscia('poziom_brudu'))
  })
})

describe('ustawDodatek', () => {
  it('tryb `propozycja` zapisuje dodatek poza ceną; zmiana trybu podmienia wpis', () => {
    const zPropozycja = ustawDodatek(mieszkanie(), 'okna', 'okno_1', 4, 'propozycja', katalog)
    const wCenie = ustawDodatek(zPropozycja, 'okna', 'okno_1', 4, 'w_cenie', katalog)

    assert.deepEqual(zPropozycja.dodatki, [{ uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 4, tryb: 'propozycja' }])
    assert.deepEqual(wCenie.dodatki, [{ uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 4, tryb: 'w_cenie' }])
  })

  it('ilość 0 usuwa dodatek, inne zostają', () => {
    const z1 = ustawDodatek(mieszkanie(), 'agd', 'piekarnik', 1, 'w_cenie', katalog)
    const z2 = ustawDodatek(z1, 'agd', 'okap', 1, 'w_cenie', katalog)

    const wynik = ustawDodatek(z2, 'agd', 'piekarnik', 0, 'w_cenie', katalog)

    assert.deepEqual(wynik.dodatki, [{ uslugaId: 'agd', pozycjaId: 'okap', ilosc: 1, tryb: 'w_cenie' }])
  })

  it('usługa spoza listy `dodatki`, zły tryb i ułamek sztuki to błąd', () => {
    assert.throws(() => ustawDodatek(mieszkanie(), 'mycie_kostki', 'mycie', 10, 'w_cenie', katalog), bladWejscia('nieznany_dodatek'))
    assert.throws(() => ustawDodatek(okna(), 'agd', 'piekarnik', 1, 'w_cenie', katalog), bladWejscia('nieznany_dodatek'))
    assert.throws(() => ustawDodatek(mieszkanie(), 'agd', 'piekarnik', 1, 'gratis', katalog), bladWejscia('tryb_dodatku'))
    assert.throws(() => ustawDodatek(mieszkanie(), 'agd', 'szafka', 1.5, 'w_cenie', katalog), bladWejscia('ilosc'))
  })
})

describe('ustawDojazd', () => {
  it('12 km zapisuje 12; ponad 500 km i ujemne to błąd `dojazd`', () => {
    assert.equal(ustawDojazd(mieszkanie(), 12).dojazdKm, 12)
    assert.throws(() => ustawDojazd(mieszkanie(), 501), bladWejscia('dojazd'))
    assert.throws(() => ustawDojazd(mieszkanie(), -1), bladWejscia('dojazd'))
  })
})

describe('infoProgu', () => {
  it('kostka 40 m²: mnożnik 1,15 do 50 m²; 100 m²: null (mnożnik 1)', () => {
    const kostka = katalog.usluga('mycie_kostki')

    assert.deepEqual(infoProgu(kostka, 40, katalog), { od: 0, do: 50, mnoznik: 1.15 })
    assert.equal(infoProgu(kostka, 100, katalog), null)
  })

  it('posadzki 2500 m²: zniżka 0,5 od 2000 m² bez górnej granicy; okna i pusta powierzchnia: null', () => {
    assert.deepEqual(infoProgu(katalog.usluga('mycie_posadzek'), 2500, katalog), { od: 2000, do: null, mnoznik: 0.5 })
    assert.equal(infoProgu(katalog.usluga('okna'), 40, katalog), null)
    assert.equal(infoProgu(katalog.usluga('mycie_kostki'), 0, katalog), null)
  })
})

describe('infoDojazdu', () => {
  it('12 km z domyślnymi stawkami: 4 zł dla klienta (2 km ponad 10 km), 27,60 zł kosztu (24 km × 1,15 zł)', () => {
    const wynik = infoDojazdu(12, STAWKI)

    assert.equal(wynik.kmPonad, 2)
    assert.equal(wynik.kwotaKlienta, 4)
    assert.equal(wynik.kmRazem, 24)
    assertBlisko(wynik.kosztFirmy, 27.6)
  })

  it('8 km: 0 zł dla klienta w promieniu, koszt firmy 16 km × 1,15 zł; ujemna odległość to błąd', () => {
    const wynik = infoDojazdu(8, STAWKI)

    assert.equal(wynik.kwotaKlienta, 0)
    assert.equal(wynik.kmPonad, 0)
    assertBlisko(wynik.kosztFirmy, 18.4)
    assert.throws(() => infoDojazdu(-2, STAWKI), bladWejscia('dojazd'))
  })
})

describe('wycenaDodatku', () => {
  it('4 okna 1-skrzydłowe w pomorskim: 30 zł × 1,13 za sztukę, razem 135,60 zł', () => {
    const wynik = wycenaDodatku({ uslugaId: 'okna', pozycjaId: 'okno_1', ilosc: 4 }, 'pomorskie', katalog)

    assertBlisko(wynik.cenaJedn, 33.9)
    assertBlisko(wynik.kwota, 135.6)
  })

  it('nieznana pozycja to błąd `nieznana_pozycja`', () => {
    assert.throws(() => wycenaDodatku({ uslugaId: 'agd', pozycjaId: 'pralka', ilosc: 1 }, null, katalog), bladWejscia('nieznana_pozycja'))
  })
})
