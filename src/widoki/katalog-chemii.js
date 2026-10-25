// Katalog srodkow z dolnego paska (`#/chemia`): wszystkie kategorie z liczba srodkow, a po wybraniu (`?kategoria=<id>`) — produkty
// kategorii. Do tego stan wczytywania i bledu bazy chemii (src/dane/chemia.js) wspolny dla katalogu i kroku chemii kreatora.

import { chemiaAplikacji } from '../dane/chemia.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { dostawcyZProduktami, produktyKategorii } from '../silnik/chemia.js'
import { odmiana } from '../ui/format.js'
import { h } from '../ui/h.js'
import { baner, dolnyPasek, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { kartaKategorii } from './karta-produktu.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../silnik/chemia.js').Chemia} Chemia */

const FORMY_SRODKA = /** @type {const} */ (['środek', 'środki', 'środków'])
const WCZYTYWANIE = 'Wczytywanie środków…'
const BLAD_POLACZENIA = 'Nie udało się wczytać bazy środków. Sprawdź połączenie z internetem i spróbuj jeszcze raz.'
const BLAD_DANYCH = 'Baza środków jest niepełna. Odśwież stronę, a jeśli to nie pomoże, zajrzyj tu później.'
const NIE_MA_KATEGORII = 'Nie ma takiej kategorii środków.'

/**
 * Brak sieci albo przekroczony limit czasu to oczekiwany stan (bez zgloszenia); bledne albo niepelne dane sa zglaszane.
 * @param {unknown} blad @returns {string}
 */
function tekstBledu(blad) {
  const czyLimit = blad instanceof DOMException && (blad.name === 'TimeoutError' || blad.name === 'AbortError')
  if (czyLimit || blad instanceof TypeError) return BLAD_POLACZENIA
  reportError(blad)
  return BLAD_DANYCH
}

/**
 * W `miejsce` stan wczytywania, potem `naDane(chemia)`; blad wczytania daje baner z „Spróbuj jeszcze raz”. Wynik przychodzi po
 * await, wiec rysuje tylko, gdy widok jest nadal na ekranie (`czyAktualny`). Niespojne dane w `naDane` (nieznana usluga,
 * pozycja albo produkt) tez daja baner.
 * @param {HTMLElement} miejsce @param {(chemia: Chemia) => void} naDane @param {() => boolean} czyAktualny
 * @returns {Promise<void>}
 */
export async function poChemii(miejsce, naDane, czyAktualny) {
  miejsce.replaceChildren(h('p', { class: 'ladowanie', role: 'status' }, WCZYTYWANIE))
  /** @param {string} tekst */
  const pokazBlad = (tekst) => miejsce.replaceChildren(baner({ rodzaj: 'blad', tekst,
    akcja: { tekst: 'Spróbuj jeszcze raz', naKlik: () => void poChemii(miejsce, naDane, czyAktualny).catch(reportError) } }))
  /** @type {Chemia} */
  let chemia
  try {
    chemia = await chemiaAplikacji()
  } catch (blad) {
    const tekst = tekstBledu(blad)
    if (czyAktualny()) pokazBlad(tekst)
    return
  }
  if (!czyAktualny()) return
  try {
    naDane(chemia)
  } catch (blad) {
    if (!(blad instanceof BladKatalogu) && !(blad instanceof BladWejscia)) throw blad
    reportError(blad)
    pokazBlad(BLAD_DANYCH)
  }
}

/** @param {Chemia} chemia @returns {HTMLElement} lista kategorii z liczba srodkow */
function listaKategorii(chemia) {
  return karta({ klasa: 'karta--bez-odstepu' }, chemia.kategorie.map((k) => wiersz({
    tytul: k.nazwa,
    opis: `${k.produkty.length} ${odmiana(k.produkty.length, FORMY_SRODKA)}`,
    adres: sciezka('chemia', {}, { kategoria: k.id }),
  })))
}

/** @param {Chemia} chemia @param {string} id @returns {Node} produkty kategorii albo komunikat o nieznanej kategorii */
function produktyWybranej(chemia, id) {
  const kategoria = chemia.kategorie.find((k) => k.id === id)
  if (!kategoria) return baner({ rodzaj: 'info', tekst: NIE_MA_KATEGORII, akcja: { tekst: 'Pokaż wszystkie kategorie', adres: sciezka('chemia') } })
  return kartaKategorii({ id: kategoria.id, tytul: kategoria.nazwa, produkty: produktyKategorii(kategoria, chemia), chemia })
}

/** @type {Widok} */
export const widokKataloguChemii = {
  render(kontener, { zapytanie }) {
    let isAktualny = true
    const wybrana = zapytanie.kategoria ?? null
    const wstecz = wybrana === null ? undefined : sciezka('chemia')
    let gora = naglowek({ tytul: 'Chemia', wstecz })
    const tresc = h('div', { class: 'tresc' })
    kontener.append(gora, tresc, dolnyPasek('chemia'))
    void poChemii(tresc, (chemia) => {
      const nowa = naglowek({ tytul: 'Chemia', podtytul: `Środki od ${dostawcyZProduktami(chemia).length} dostawców`, wstecz })
      tresc.replaceChildren(wybrana === null ? listaKategorii(chemia) : produktyWybranej(chemia, wybrana))
      gora.replaceWith(nowa)
      gora = nowa
    }, () => isAktualny).catch(reportError)
    return () => {
      isAktualny = false
    }
  },
}
