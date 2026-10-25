// Lista wszystkich wycen (`#/wyceny`): od ostatnio zmienionej, z numerem, klientem, kwota i pigulka statusu.

import { BladMagazynu } from '../dane/magazyn.js'
import { listaWycen } from '../dane/wyceny.js'
import { zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { dolnyPasek, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { pigulkaStatusu } from '../ui/statusy.js'
import { adresWyceny, inicjal, kwotaWyceny } from './start-dane.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */

/** @param {Katalog} katalog @param {string} uslugaId @returns {string} nazwa uslugi; id, gdy usluge usunieto z danych */
const nazwaUslugi = (katalog, uslugaId) => katalog.uslugi.find((u) => u.id === uslugaId)?.nazwa ?? uslugaId

/** @param {Wycena} w @param {Katalog} katalog */
function wierszWyceny(w, katalog) {
  const usluga = nazwaUslugi(katalog, w.wejscie.uslugaId)
  const nazwa = w.klient.nazwa
  const kwota = kwotaWyceny(w)
  const litera = inicjal(nazwa)
  return wiersz({
    tytul: nazwa || usluga,
    opis: [w.numer, nazwa ? usluga : null].filter(Boolean).join(' · ') || undefined,
    adres: adresWyceny(w),
    awatar: litera || undefined,
    ikona: litera ? undefined : 'file-text',
    dodatek: h('span', { class: 'wiersz-wyceny__status' },
      kwota === null ? null : h('span', { class: 'wiersz__wartosc' }, zl(kwota)), pigulkaStatusu(w.status)),
  })
}

/** @type {Widok} */
export const widokListyWycen = {
  render(kontener, { kontekst }) {
    const wynik = kontekst.magazyn.wczytaj()
    if (!('stan' in wynik)) throw new BladMagazynu(wynik.blad, 'Zapisanych danych nie da się odczytać')
    const wyceny = listaWycen(wynik.stan)
    kontener.append(
      naglowek({ tytul: 'Wyceny' }),
      h('div', { class: 'tresc' },
        wyceny.length === 0
          ? karta({}, h('p', { class: 'start-pusty' }, 'Brak zapisanych wycen.'))
          : karta({ klasa: 'karta--bez-odstepu' }, wyceny.map((w) => wierszWyceny(w, kontekst.katalog)))),
      dolnyPasek('wyceny'))
  },
}
