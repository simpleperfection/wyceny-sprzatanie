import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PamiecMagazynu } from '../../tests/pamiec-magazynu.js'
import { dodajKlienta } from '../dane/klienci.js'
import { utworzMagazyn, wczytajStan } from '../dane/magazyn.js'
import { czyStatusOferty, STATUSY_WYCENY, utworzSzkic, wycena } from '../dane/wyceny.js'
import { MAKS_DLUGOSC_LINKU } from '../oferta/kodek.js'
import { czyDaneFirmy, przypiszKlientaOferty, tekstDlugiegoLinku, zablokujEdycje } from './oferta-edycja.js'

describe('czyStatusOferty', () => {
  it('ofertę przygotowuje się z wyceny do wysłania, wysłanej i przyjętej, z pozostałych nie', () => {
    assert.deepEqual(STATUSY_WYCENY.filter(czyStatusOferty), ['do_wyslania', 'wyslana', 'przyjeta'])
  })
})

describe('tekstDlugiegoLinku', () => {
  it('liczba znaków linku w ostrzeżeniu', () => {
    assert.equal(tekstDlugiegoLinku(MAKS_DLUGOSC_LINKU + 345),
      'Link ma 2345 znaków — w SMS-ie może się nie zmieścić. Wyślij go komunikatorem albo wydrukuj PDF.')
  })
})

describe('czyDaneFirmy', () => {
  const firma = { nazwa: 'Usługi Sprzątające Monika Lis', telefon: '600 123 456', email: '', nip: '' }

  it('nazwa i telefon wystarczą, e-mail i NIP są opcjonalne', () => {
    assert.equal(czyDaneFirmy({ firma }), true)
  })

  it('bez nazwy albo telefonu (także same spacje) oferty nie da się wysłać', () => {
    assert.equal(czyDaneFirmy({ firma: { ...firma, nazwa: '' } }), false)
    assert.equal(czyDaneFirmy({ firma: { ...firma, telefon: '  ' } }), false)
  })
})

describe('zablokujEdycje', () => {
  /** Karta oferty z kontrolkami (Node nie ma DOM): zapisuje selektor i zwraca kontrolki. @param {{ disabled: boolean }[]} kontrolki */
  const karta = (kontrolki) => {
    /** @type {string[]} */
    const selektory = []
    return { selektory, kontrolki, querySelectorAll: (/** @type {string} */ selektor) => (selektory.push(selektor), kontrolki) }
  }

  it('wyłącza pola i przyciski w każdej karcie wyceny ze zleceniem', () => {
    const klient = karta([{ disabled: false }, { disabled: false }])
    const warunki = karta([{ disabled: false }])

    zablokujEdycje(/** @type {Pick<ParentNode, 'querySelectorAll'>[]} */ (/** @type {unknown} */ ([klient, warunki])))

    assert.deepEqual([...klient.kontrolki, ...warunki.kontrolki].map((k) => k.disabled), [true, true, true])
    assert.deepEqual([klient.selektory, warunki.selektory], [['input, textarea, select, button'], ['input, textarea, select, button']])
  })
})

describe('przypiszKlientaOferty', () => {
  /** Magazyn w pamieci z szkicem wyceny i klientem k-anna. */
  function magazynZWycena() {
    const magazyn = utworzMagazyn(new PamiecMagazynu(), { loguj: () => {}, poprosOTrwalosc: () => true })
    const { id } = utworzSzkic(magazyn, { rodzaj: 'dokladna', wejscie: { uslugaId: 'mieszkanie_standard', pomieszczenia: [{ typ: 'pokoj', m2: 20 }] } })
    dodajKlienta(magazyn, { nazwa: 'Anna Kowalska', adres: 'ul. Lipowa 3' }, { id: 'k-anna' })
    return { magazyn, id }
  }

  it('wybrany klient trafia do wyceny (klientId, kopia nazwy), a jego adres wraca do pola adresu karty', () => {
    const { magazyn, id } = magazynZWycena()

    const wynik = przypiszKlientaOferty(magazyn, id, 'k-anna')

    const w = wycena(wczytajStan(magazyn), id)
    assert.deepEqual(wynik, { blad: null, adres: 'ul. Lipowa 3' })
    assert.deepEqual([w?.klientId, w?.klient.nazwa], ['k-anna', 'Anna Kowalska'])
  })

  it('wycena usunięta w innej karcie daje tekst błędu i niczego nie zapisuje', () => {
    const { magazyn } = magazynZWycena()
    const przed = wczytajStan(magazyn)

    const wynik = przypiszKlientaOferty(magazyn, 'w-usunieta', 'k-anna')

    assert.deepEqual(wynik, { blad: 'Nie ma już tej wyceny. Mogła zostać usunięta w innej karcie przeglądarki.' })
    assert.deepEqual(wczytajStan(magazyn), przed)
  })
})
