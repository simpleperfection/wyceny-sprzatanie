// Karta „Tempo pracy” ustawien firmy (R15, R17): zrodlo tempa, krotnosc normy rynkowej, czas mieszkania 50 m² z tempem
// i wedlug normy, powrot do wartosci recznej albo liczenie z zlecen; wartosc reczna w arkuszu 0,5–3 co 0,05.

import { GRANICE_TEMPA } from '../dane/walidacja.js'
import { MIN_ZLECEN_TEMPA, tempoDoWyceny } from '../silnik/tempo.js'
import { czas } from '../ui/format.js'
import { h } from '../ui/h.js'
import { licznik, przycisk } from '../ui/komponenty/formularz.js'
import { karta } from '../ui/komponenty/uklad.js'
import { METRAZ_WZORCOWY, mieszkanieWzorcowe, tekstLiczby, zmianaZPol } from './ustawienia-formularz.js'
import { otworzArkusz, zapiszWArkuszu } from './ustawienia-sekcje.js'

/** @typedef {import('./ustawienia-sekcje.js').DaneSekcji} DaneSekcji */
/** @typedef {import('../silnik/tempo.js').TempoWyceny} TempoWyceny */
/** @typedef {import('../silnik/tempo.js').ZrodloTempa} ZrodloTempa */

const KROK_TEMPA = 0.05
const SETNE = 100
/** Po zmianie zrodla fokus wraca na przycisk zrodla (jeden zastepuje drugi), a gdy go nie ma — na „Ustaw tempo ręcznie”. */
const FOKUS_ZRODLA = '[data-akcja="tempo-zrodlo"], [data-akcja="tempo-reczne"]'
const FOKUS_RECZNEGO = '[data-akcja="tempo-reczne"]'
/** @type {Readonly<Record<ZrodloTempa, (liczba: number) => string>>} */
const ZRODLA = Object.freeze({
  reczne: () => 'ręczne',
  domyslne: () => 'domyślne',
  wspolne: (liczba) => `z ${liczba} zleceń`,
  usluga: (liczba) => `z ${liczba} zleceń`,
})

/** @param {DaneSekcji} dane @param {number} wartosc biezace tempo */
function arkuszTempa(dane, wartosc) {
  const element = licznik({ id: 'ustawienia-tempo', etykieta: 'Tempo (krotność normy rynkowej)', wartosc: Math.round(wartosc * SETNE) / SETNE,
    min: GRANICE_TEMPA.min, max: GRANICE_TEMPA.max, krok: KROK_TEMPA, jednostka: '×', naZmiane: () => {} })
  // Blad wpisu pokazuje sam licznik pod polem (przy kazdej zmianie tekstu), wiec arkusz nie powtarza go w banerze.
  otworzArkusz('Tempo pracy', [element], () => {
    const wejscie = element.querySelector('input')
    const { patch, bledy } = zmianaZPol({ tempo: wejscie?.value ?? '' })
    if (!bledy.tempo) return zapiszWArkuszu(dane, patch, FOKUS_RECZNEGO)
    wejscie?.focus()
    return { czyZamknac: false, blad: null }
  })
}

/** @param {string} tekst @param {string} akcja @param {() => void} naKlik */
function przyciskTempa(tekst, akcja, naKlik) {
  const element = przycisk({ tekst, rodzaj: 'tekstowy', naKlik })
  element.dataset.akcja = akcja
  return element
}

/** @param {DaneSekcji} dane @param {TempoWyceny} tempo @returns {HTMLElement[]} */
function akcjeTempa(dane, tempo) {
  const reczne = dane.ustawienia.tempo.reczne
  const doReki = dane.domyslne.tempo
  /** @type {HTMLElement[]} pierwszy przycisk zrodla, zeby selektor FOKUS_ZRODLA trafial w niego przed „Ustaw tempo ręcznie” */
  const akcje = []
  if (reczne !== null) {
    akcje.push(przyciskTempa('Licz z moich zleceń', 'tempo-zrodlo', () => { dane.zapisz({ tempo: { reczne: null } }, FOKUS_ZRODLA) }))
  } else if (tempo.zrodlo !== 'domyslne') {
    akcje.push(przyciskTempa(`Wróć do wartości ręcznej (${tekstLiczby(doReki)}×)`, 'tempo-zrodlo',
      () => { dane.zapisz({ tempo: { reczne: doReki } }, FOKUS_ZRODLA) }))
  }
  akcje.push(przyciskTempa('Ustaw tempo ręcznie', 'tempo-reczne', () => arkuszTempa(dane, tempo.wartosc)))
  return akcje
}

/** @param {DaneSekcji} dane @returns {HTMLElement} karta „Tempo pracy” */
export function kartaTempa(dane) {
  const { ustawienia, wyceny, domyslne, katalog } = dane
  const tempo = tempoDoWyceny(ustawienia, wyceny, null, domyslne)
  const { minuty } = mieszkanieWzorcowe(katalog, ustawienia.wojewodztwoId)
  return karta({ klasa: 'karta-ustawien karta-tempa' },
    h('div', { class: 'karta-tempa__gora' },
      h('h2', { class: 'karta__tytul' }, 'Tempo pracy'),
      h('span', { class: 'pigulka pigulka--tempo' }, ZRODLA[tempo.zrodlo](tempo.liczba))),
    h('p', { class: 'karta-tempa__wartosc liczba' }, `${tekstLiczby(tempo.wartosc)}× normy rynkowej`),
    h('p', { class: 'ustawienia__opis' },
      `Mieszkanie ${METRAZ_WZORCOWY} m² zajmuje Ci ok. ${czas(minuty * tempo.wartosc)} (norma rynku: ${czas(minuty)}). ` +
      'Tempo zmienia czas pracy i to, ile zostaje dla Ciebie – nie cenę.'),
    tempo.liczba < MIN_ZLECEN_TEMPA
      ? h('p', { class: 'ustawienia__opis' }, `Własne tempo policzymy po ${MIN_ZLECEN_TEMPA} zleceniach z wpisanym czasem.`)
      : null,
    akcjeTempa(dane, tempo))
}
