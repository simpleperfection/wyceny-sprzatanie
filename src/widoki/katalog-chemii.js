// Modul Chemia (`#/chemia`, makieta „Chemia, kategoria” w docs/operator/aplikacja-modulowa-makiety.html): kategorie z liczba
// srodkow i powrotem „Start”, a po wybraniu (`?kategoria=<id>`) — wiersze srodkow kategorii z powrotem „Chemia”. Do tego stan
// wczytywania i bledu bazy chemii (src/dane/chemia.js) wspolny dla katalogu i kroku chemii kreatora.

import { chemiaAplikacji } from '../dane/chemia.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { dostawcyZProduktami, produktyKategorii } from '../silnik/chemia.js'
import { odmiana } from '../ui/format.js'
import { h } from '../ui/h.js'
import { baner, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { kartaProduktu, podzielNazweKategorii } from './karta-produktu.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../silnik/chemia.js').Chemia} Chemia */

const TYTUL = 'Chemia'
/** Korzen modulu wraca do Start, kategoria do listy kategorii (staly ekran nadrzedny, nie historia przegladarki). */
const POWROT_START = { wstecz: sciezka('start'), wsteczTekst: 'Start' }
const POWROT_CHEMIA = { wstecz: sciezka('chemia'), wsteczTekst: 'Chemia' }
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

/** @param {Chemia} chemia @returns {HTMLElement} kategorie: nazwa, w drugiej linii liczba srodkow i rodzaje brudu */
function listaKategorii(chemia) {
  return karta({ klasa: 'karta--bez-odstepu' }, chemia.kategorie.map((k) => {
    const { nazwa, dopisek } = podzielNazweKategorii(k.nazwa)
    const liczba = `${k.produkty.length} ${odmiana(k.produkty.length, FORMY_SRODKA)}`
    return wiersz({ tytul: nazwa, opis: dopisek ? `${liczba} · ${dopisek}` : liczba, adres: sciezka('chemia', {}, { kategoria: k.id }) })
  }))
}

/**
 * Ekran po wczytaniu bazy: korzen modulu (kategorie, powrot „Start”) albo wybrana kategoria (nazwa w tytule, rodzaje brudu
 * w podtytule, wiersze srodkow, powrot „Chemia”); nieznana kategoria daje komunikat z powrotem do kategorii.
 * @param {Chemia} chemia @param {string | null} id
 * @returns {{ gora: HTMLElement, tresc: Node }}
 */
function ekranKatalogu(chemia, id) {
  if (id === null) {
    return { gora: naglowek({ tytul: TYTUL, podtytul: `Środki od ${dostawcyZProduktami(chemia).length} dostawców`, ...POWROT_START }),
      tresc: listaKategorii(chemia) }
  }
  const kategoria = chemia.kategorie.find((k) => k.id === id)
  if (!kategoria) {
    return { gora: naglowek({ tytul: TYTUL, ...POWROT_CHEMIA }),
      tresc: baner({ rodzaj: 'info', tekst: NIE_MA_KATEGORII, akcja: { tekst: 'Pokaż wszystkie kategorie', adres: sciezka('chemia') } }) }
  }
  const { nazwa, dopisek } = podzielNazweKategorii(kategoria.nazwa)
  return { gora: naglowek({ tytul: nazwa, podtytul: dopisek ?? undefined, ...POWROT_CHEMIA }),
    tresc: karta({ klasa: 'karta--bez-odstepu' }, produktyKategorii(kategoria, chemia).map((p) => kartaProduktu(p, chemia, 'h2'))) }
}

/** @type {Widok} */
export const widokKataloguChemii = {
  render(kontener, { zapytanie }) {
    let isAktualny = true
    const wybrana = zapytanie.kategoria ?? null
    let gora = naglowek({ tytul: TYTUL, ...(wybrana === null ? POWROT_START : POWROT_CHEMIA) })
    const tresc = h('div', { class: 'tresc' })
    kontener.append(gora, tresc)
    void poChemii(tresc, (chemia) => {
      const ekran = ekranKatalogu(chemia, wybrana)
      tresc.replaceChildren(ekran.tresc)
      gora.replaceWith(ekran.gora)
      gora = ekran.gora
    }, () => isAktualny).catch(reportError)
    return () => {
      isAktualny = false
    }
  },
}
