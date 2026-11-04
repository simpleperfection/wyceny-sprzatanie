// Ekran modulu Wycena (`#/wyceny`, makieta „Moduł Wycena” w docs/operator/aplikacja-modulowa-makiety.html): powrot „Start”,
// dwa duze przyciski „Szybka wycena” i „Dokładna wycena” (R6: szybka wycena dwa dotkniecia od Start), pod nimi wyceny
// w sekcjach wedlug tego, co trzeba zrobic (R20), a w „Do zaplanowania” z przyciskiem „Zaplanuj” pod wierszem (jak „Zrobione”
// w zleceniach). Sekcje i tresc wierszy licza czyste funkcje z lista-wycen-dane.js.

import { wczytajStan } from '../dane/magazyn.js'
import { h, ikona } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { pigulkaStatusu } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { adresZaplanowania } from '../zlecenia/formularz.js'
import { sekcjeWycen, wierszWyceny } from './lista-wycen-dane.js'
import { adresWyceny } from './start-dane.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../ui/ikony.js').NazwaIkony} NazwaIkony */
/** @typedef {import('./lista-wycen-dane.js').SekcjaWycen} SekcjaWycen */
/** @typedef {{ nazwa: string, podpis: string, adres: string, ikona: NazwaIkony, czyGlowny: boolean }} OpcjeDuzegoPrzycisku */

const BEZ_WYCEN = 'Nie masz jeszcze wycen.'

/** Duzy przycisk wyboru wyceny: ikona, nazwa z podpisem i strzalka; caly jest linkiem. @param {OpcjeDuzegoPrzycisku} opcje */
function duzyPrzycisk({ nazwa, podpis, adres, ikona: nazwaIkony, czyGlowny }) {
  return h('a', { class: ['wybor-wyceny', czyGlowny ? 'wybor-wyceny--glowny' : 'wybor-wyceny--drugi'], href: adres },
    h('span', { class: 'wybor-wyceny__ikona' }, ikona(nazwaIkony)),
    h('span', { class: 'wybor-wyceny__tekst' },
      h('span', { class: 'wybor-wyceny__nazwa' }, nazwa),
      h('span', { class: 'wybor-wyceny__podpis' }, podpis)),
    ikona('chevron-right', 'wybor-wyceny__strzalka'))
}

/** Wiersz sekcji „Do zaplanowania”: link do wyceny, pod nim „Zaplanuj”. @param {Wycena} w @param {Katalog} katalog */
function wierszDoZaplanowania(w, katalog) {
  const { tytul, szczegoly } = wierszWyceny(w, katalog)
  return h('div', { class: 'wizyta' },
    wiersz({ tytul, opis: szczegoly, adres: adresWyceny(w) }),
    h('div', { class: 'wizyta__akcje' },
      przycisk({ tekst: 'Zaplanuj', rodzaj: 'drugi', ikona: 'calendar', adres: adresZaplanowania(w.id), etykieta: `Zaplanuj: ${tytul}` })))
}

/** Pigulka statusu tylko w „Pozostałe”: w innych sekcjach status mowi naglowek. @param {SekcjaWycen} sekcja @param {Katalog} katalog */
function sekcjaEkranu({ id, tytul, wyceny }, katalog) {
  const idTytulu = `sekcja-wycen-${id}`
  const czyZeStatusem = id === 'pozostale'
  return h('section', { class: 'sekcja-wycen', 'aria-labelledby': idTytulu },
    h('h2', { class: 'sekcja-wycen__tytul', id: idTytulu }, tytul),
    id === 'do_zaplanowania'
      ? wyceny.map((w) => wierszDoZaplanowania(w, katalog))
      : karta({ klasa: 'karta--bez-odstepu' }, wyceny.map((w) => {
        const { tytul: tytulWiersza, szczegoly } = wierszWyceny(w, katalog)
        return wiersz({ tytul: tytulWiersza, opis: szczegoly, adres: adresWyceny(w),
          dodatek: czyZeStatusem ? pigulkaStatusu(w.status) : undefined })
      })))
}

/** @type {Widok} */
export const widokListyWycen = {
  render(kontener, { kontekst }) {
    const sekcje = sekcjeWycen(wczytajStan(kontekst.magazyn))
    kontener.append(
      naglowek({ tytul: 'Wycena', wstecz: sciezka('start'), wsteczTekst: 'Start' }),
      h('div', { class: 'tresc' },
        duzyPrzycisk({ nazwa: 'Szybka wycena', podpis: 'przez telefon', adres: sciezka('szybka'), ikona: 'phone', czyGlowny: true }),
        duzyPrzycisk({ nazwa: 'Dokładna wycena', podpis: 'na miejscu', adres: sciezka('kreator', { krok: 'usluga' }),
          ikona: 'ruler-measure', czyGlowny: false }),
        sekcje.length === 0
          ? h('p', { class: 'wyceny-pusto' }, BEZ_WYCEN)
          : sekcje.map((sekcja) => sekcjaEkranu(sekcja, kontekst.katalog))))
  },
}
