// Ekran ratunkowy (R23): pokazuje go src/app.js zamiast routera, gdy danych zapisanych w przegladarce nie da sie odczytac
// (uszkodzony JSON albo stan z nowszej wersji). Pozwala pobrac surowe dane (jedyna glowna akcja), wczytac kopie z pliku
// (zastepuje dane po potwierdzeniu) albo wyczyscic dane.

import { odczytajKopie, wczytajKopie } from '../dane/kopia.js'
import { h, ikona } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, dialogPotwierdzenia } from '../ui/komponenty/uklad.js'
import { pobierzPlik, wybierzPlik } from '../ui/plik.js'
import { jestBledemPliku, nazwaSurowegoPliku, PLIKI_KOPII, tekstBleduWczytania } from './kopia-teksty.js'

/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/magazyn.js').BladStanu} BladStanu */

const NOWSZA_WERSJA = 'Dane zapisała nowsza wersja aplikacji. Odśwież stronę, a jeśli to nie pomoże, pobierz zapisane dane, zanim je wyczyścisz.'
const BLAD_CZYSZCZENIA = 'Nie udało się usunąć danych. Odśwież stronę i spróbuj jeszcze raz.'
const PYTANIE_O_ZASTAPIENIE = Object.freeze({
  tytul: 'Zastąpić dane w tej przeglądarce?', tresc: 'Dane, których nie ma w pliku, znikną.', potwierdz: 'Zastąp', anuluj: 'Anuluj',
})

/**
 * @param {HTMLElement} kontener
 * @param {{ magazyn: Magazyn, blad: BladStanu, surowe: string }} opcje wynik magazyn.wczytaj() z bledem
 */
export function pokazRatunek(kontener, { magazyn, blad, surowe }) {
  const komunikat = h('div', { 'aria-live': 'polite' })
  let numerWczytania = 0

  /** @param {string} tekst */
  const pokazBlad = (tekst) => komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))

  /** Kopia zastepuje zapisane dane dopiero po potwierdzeniu; wynik starszego wyboru pliku (drugie klikniecie) jest pomijany. */
  async function handleWczytanie() {
    const numer = ++numerWczytania
    try {
      const tekst = await wybierzPlik(PLIKI_KOPII)
      if (tekst === null || numer !== numerWczytania) return
      const { stan: zPliku } = odczytajKopie(tekst)
      const czyZastapic = await dialogPotwierdzenia({ ...PYTANIE_O_ZASTAPIENIE, czyNiebezpieczne: true })
      if (!czyZastapic || numer !== numerWczytania) return
      wczytajKopie(magazyn, zPliku, 'zastap')
      location.reload()
    } catch (wyjatek) {
      pokazBlad(tekstBleduWczytania(wyjatek))
      if (!jestBledemPliku(wyjatek)) reportError(wyjatek)
    }
  }

  async function handleCzyszczenie() {
    const czyUsunac = await dialogPotwierdzenia({ tytul: 'Usunąć wszystkie dane z tej przeglądarki?', tresc: 'Tego nie można cofnąć.',
      potwierdz: 'Usuń dane', czyNiebezpieczne: true })
    if (!czyUsunac) return
    try {
      magazyn.wyczysc()
      location.reload()
    } catch (wyjatek) {
      if (!(wyjatek instanceof DOMException)) throw wyjatek
      pokazBlad(BLAD_CZYSZCZENIA)
      reportError(wyjatek)
    }
  }

  kontener.replaceChildren(h('div', { class: 'tresc tresc--komunikat ratunek' },
    ikona('alert-triangle', 'ratunek__ikona'),
    h('h1', { class: 'komunikat' }, 'Nie udało się odczytać danych zapisanych w przeglądarce.'),
    blad === 'nowsza_wersja' ? h('p', { class: 'ratunek__opis' }, NOWSZA_WERSJA) : null,
    komunikat,
    h('div', { class: 'ratunek__przyciski' },
      przycisk({ tekst: 'Pobierz zapisane dane', ikona: 'download',
        naKlik: () => pobierzPlik(nazwaSurowegoPliku(new Date()), surowe, 'text/plain') }),
      przycisk({ tekst: 'Wczytaj kopię z pliku', rodzaj: 'drugi', ikona: 'upload', naKlik: () => void handleWczytanie() }),
      przycisk({ tekst: 'Wyczyść dane i zacznij od nowa', rodzaj: 'tekstowy', naKlik: () => void handleCzyszczenie() }))))
}
