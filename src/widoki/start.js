// Ekran Start (`#/start`, makieta „Start” w docs/operator/aplikacja-modulowa-makiety.html): powitanie z nazwa firmy, jedno
// zdanie o dniu, kafle gotowych modulow z linia stanu (R1–R3), najwyzej jeden baner (R5) i odnosnik „Ustawienia firmy”.
// Szybka wycena jest dwa dotkniecia od Start: kafel Wycena, potem „Szybka wycena” (R6). Teksty licza czyste funkcje
// z start-dane.js; widok tylko je sklada.

import { dniOdKopii } from '../dane/kopia.js'
import { dzienLokalny } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { srodowiskoPrzegladarki, zamknijInstrukcjeIos } from '../pwa/rejestracja.js'
import { dniTemu } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { baner, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { MODULY } from '../ui/moduly.js'
import { sciezka } from '../ui/trasy.js'
import { banerStartu, powitanie, stanKafla, zdanieDnia } from './start-dane.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../ui/moduly.js').Modul} Modul */
/** @typedef {import('./start-dane.js').StanKafla} StanKafla */

const BEZ_KOPII = 'Nie masz jeszcze kopii danych. Dane są tylko w tej przeglądarce.'
const INSTRUKCJA_IOS = 'Na iPhonie dodaj aplikację do ekranu początkowego: Udostępnij → Do ekranu początkowego. Dane z Safari nie przechodzą do aplikacji na ekranie początkowym, więc zrób to przed pierwszą wyceną.'

/** Kafel modulu: link na cala powierzchnie z ikona, nazwa i linia stanu. @param {Readonly<Modul>} modul @param {StanKafla} stanLinii */
function kafel({ nazwa, ikona: nazwaIkony, trasa, parametry }, { tekst, czyAkcja }) {
  return h('li', { class: 'kafle__pozycja' },
    h('a', { class: 'kafel', href: sciezka(trasa, parametry) },
      h('span', { class: 'kafel__ikona' }, ikona(nazwaIkony)),
      h('span', { class: 'kafel__nazwa' }, nazwa),
      h('span', { class: ['kafel__stan', czyAkcja && 'kafel__stan--akcja'] }, tekst)))
}

/** Fokus po zniknieciu klikniętego przycisku wraca na tytul ekranu, a nie na poczatek dokumentu. @param {HTMLElement} element */
function fokusNaTytul(element) {
  const tytul = element.closest('main')?.querySelector('h1')
  if (!tytul) return
  tytul.tabIndex = -1
  tytul.focus({ preventScroll: true })
}

/**
 * Instrukcja dla iPhone'a (osobne dane Safari i aplikacji z ekranu poczatkowego); „Rozumiem” zapisuje preferencje w stanie,
 * a nieudany zapis pokazuje blad pod banerem i zostawia przycisk do ponowienia.
 * @param {Kontekst} kontekst @returns {HTMLElement}
 */
function banerIos({ magazyn }) {
  /** @type {HTMLElement | null} */
  let bladZapisu = null
  const handleRozumiem = () => {
    try {
      zamknijInstrukcjeIos(magazyn)
    } catch (blad) {
      const nowy = baner({ rodzaj: 'blad', tekst: tekstBleduZapisu(blad) })
      if (bladZapisu) bladZapisu.replaceWith(nowy)
      else instrukcja.after(nowy)
      bladZapisu = nowy
      reportError(blad)
      return
    }
    fokusNaTytul(instrukcja)
    bladZapisu?.remove()
    instrukcja.remove()
  }
  const instrukcja = baner({ rodzaj: 'info', tekst: INSTRUKCJA_IOS, akcja: { tekst: 'Rozumiem', naKlik: handleRozumiem } })
  return instrukcja
}

/** Jeden baner w kolejnosci z banerStartu. @param {Stan} stan @param {Kontekst} kontekst @param {Date} teraz @returns {HTMLElement | null} */
function banerEkranu(stan, kontekst, teraz) {
  const wybrany = banerStartu(stan, teraz, srodowiskoPrzegladarki())
  if (wybrany === null) return null
  if (wybrany.rodzaj === 'ios') return banerIos(kontekst)
  if (wybrany.rodzaj === 'ustawienia') {
    return baner({ rodzaj: 'info', tekst: 'Ustawienia domyślne – uzupełnij', akcja: { tekst: 'Uzupełnij', adres: sciezka('ustawienia') } })
  }
  const dni = dniOdKopii(stan, teraz)
  const tekst = dni === null ? BEZ_KOPII : `Ostatnia kopia danych: ${dniTemu(dni)}`
  return baner({ rodzaj: 'uwaga', tekst, akcja: { tekst: 'Zrób kopię', adres: sciezka('kopia') } })
}

/** @type {Widok} */
export const widokStartu = {
  render(kontener, { kontekst }) {
    const stan = wczytajStan(kontekst.magazyn)
    const teraz = new Date()
    const dzis = dzienLokalny(teraz)
    kontener.append(
      naglowek({ tytul: powitanie(stan.ustawienia), podtytul: zdanieDnia(stan, dzis), czyDuzy: true }),
      h('div', { class: 'tresc' },
        h('ul', { class: 'kafle', 'aria-label': 'Moduły' }, MODULY.map((modul) => kafel(modul, stanKafla(modul.id, stan, dzis)))),
        banerEkranu(stan, kontekst, teraz),
        karta({ klasa: 'karta--bez-odstepu' },
          wiersz({ tytul: 'Ustawienia firmy', adres: sciezka('ustawienia'), ikona: 'settings' }))))
  },
}
