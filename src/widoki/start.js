// Ekran startowy (`#/start`, makieta ekran-startowy): data i firma, kafle szybkiej i dokładnej wyceny, karta miesiąca
// z tempem, „Do zrobienia”, baner kopii danych, znacznik ustawien domyslnych i instrukcja dla iPhone'a (R23);
// pierwsze uruchomienie — stan pusty.

import { czyPrzypomniecOKopii, dniOdKopii } from '../dane/kopia.js'
import { wczytajStan } from '../dane/magazyn.js'
import { brakujeUstawien, scalKoszty } from '../dane/ustawienia.js'
import { czyPokazacInstrukcjeIos, srodowiskoPrzegladarki, zamknijInstrukcjeIos } from '../pwa/rejestracja.js'
import { tempoDoWyceny } from '../silnik/tempo.js'
import { dataDnia, dniTemu, FORMY, odmiana, zl } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { baner, dolnyPasek, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { pigulkaStatusu } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { adresWyceny, doZrobienia, inicjal, kwotaWyceny, nazwaMiesiaca, podsumowanieMiesiaca, wierszTempa } from './start-dane.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('./start-dane.js').Zadanie} Zadanie */

const TYTUL_BEZ_FIRMY = 'Wyceny sprzątania'
const PUSTY_START = 'Nie masz jeszcze wycen. Zacznij od szybkiej wyceny przez telefon albo dokładnej wyceny na miejscu.'
const BEZ_KOPII = 'Nie masz jeszcze kopii danych. Dane są tylko w tej przeglądarce.'
const ZOSTAJE = 'zostaje średnio'
const INSTRUKCJA_IOS = 'Na iPhonie dodaj aplikację do ekranu początkowego: Udostępnij → Do ekranu początkowego. Dane z Safari nie przechodzą do aplikacji na ekranie początkowym, więc zrób to przed pierwszą wyceną.'

/** @param {string} adres @param {'bolt' | 'file-text'} nazwaIkony @param {string} tytul @param {string} opis @param {boolean} czyGlowny */
function kafel(adres, nazwaIkony, tytul, opis, czyGlowny) {
  return h('a', { class: ['kafel', czyGlowny && 'kafel--glowny'], href: adres },
    ikona(nazwaIkony, 'kafel__ikona'),
    h('span', { class: 'kafel__tytul' }, tytul),
    h('span', { class: 'kafel__opis' }, opis))
}

/** @param {string} wartosc @param {string} etykieta */
const statystyka = (wartosc, etykieta) =>
  h('div', { class: 'statystyka' }, h('span', { class: 'statystyka__wartosc liczba' }, wartosc), h('span', { class: 'statystyka__etykieta' }, etykieta))

/** @param {Stan} stan @param {Kontekst} kontekst @param {Date} dzis */
function kartaMiesiaca(stan, { katalog, domyslne }, dzis) {
  const koszty = scalKoszty(katalog.kosztyFirmy, stan.ustawienia)
  const { wycen, przyjetych, stawka, pominiete } = podsumowanieMiesiaca(stan.wyceny, dzis, { katalog, koszty })
  if (pominiete > 0) reportError(new RangeError(`Start: ${pominiete} wykonań bez realnej stawki (migawka spoza katalogu)`))
  const tempo = wierszTempa(tempoDoWyceny(stan.ustawienia, stan.wyceny, null, domyslne))
  return karta({ klasa: 'karta-miesiaca' },
    h('h2', { class: 'karta-miesiaca__miesiac' }, nazwaMiesiaca(dzis)),
    h('div', { class: 'statystyki' },
      statystyka(String(wycen), odmiana(wycen, FORMY.wycena)),
      statystyka(String(przyjetych), odmiana(przyjetych, FORMY.przyjeta)),
      statystyka(stawka === null ? '—' : `${zl(stawka)}/h`, ZOSTAJE)),
    h('p', { class: 'karta-miesiaca__tempo' },
      h('span', { class: 'karta-miesiaca__etykieta' }, tempo.etykieta), ' ',
      h('span', { class: 'karta-miesiaca__wartosc' }, tempo.wartosc)))
}

/** @param {Zadanie} zadanie */
function wierszZadania({ tytul, wycena }) {
  const kwota = kwotaWyceny(wycena)
  const nazwa = wycena.klient.nazwa
  const opis = [nazwa || (wycena.numer && `Wycena ${wycena.numer}`), kwota === null ? null : zl(kwota)].filter(Boolean).join(' · ')
  const litera = inicjal(nazwa)
  return wiersz({ tytul, opis: opis || undefined, adres: adresWyceny(wycena), awatar: litera || undefined,
    ikona: litera ? undefined : 'file-text', dodatek: pigulkaStatusu(wycena.status) })
}

/** @param {Zadanie[]} zadania */
function sekcjaZadan(zadania) {
  return h('section', { class: 'sekcja', 'aria-labelledby': 'start-zadania' },
    h('h2', { class: 'sekcja__naglowek', id: 'start-zadania' },
      'Do zrobienia ', h('span', { class: 'sekcja__licznik liczba' }, String(zadania.length))),
    karta({ klasa: 'karta--bez-odstepu' }, zadania.map(wierszZadania)))
}

/** @param {Stan} stan @param {Date} dzis @returns {HTMLElement | null} */
function banerKopii(stan, dzis) {
  if (!czyPrzypomniecOKopii(stan, dzis)) return null
  const dni = dniOdKopii(stan, dzis)
  const tekst = dni === null ? BEZ_KOPII : `Ostatnia kopia danych: ${dniTemu(dni)}`
  return baner({ rodzaj: 'uwaga', tekst, akcja: { tekst: 'Zrób kopię', adres: sciezka('kopia') } })
}

/** @param {Stan} stan @returns {HTMLElement | null} */
function banerUstawien(stan) {
  if (brakujeUstawien(stan.ustawienia).length === 0) return null
  return baner({ rodzaj: 'info', tekst: 'Ustawienia domyślne – uzupełnij', akcja: { tekst: 'Uzupełnij', adres: sciezka('ustawienia') } })
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
 * @param {Stan} stan @param {Kontekst} kontekst @returns {HTMLElement | null}
 */
function banerIos(stan, { magazyn }) {
  if (!czyPokazacInstrukcjeIos({ ...srodowiskoPrzegladarki(), zamknieta: stan.preferencje.iosInstrukcjaZamknieta })) return null
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

/** @param {Stan} stan @param {Kontekst} kontekst @param {Date} dzis @returns {(HTMLElement | null)[]} */
function trescStartu(stan, kontekst, dzis) {
  if (stan.wyceny.length === 0) return [karta({}, h('p', { class: 'start-pusty' }, PUSTY_START))]
  const zadania = doZrobienia(stan.wyceny, dzis)
  return [kartaMiesiaca(stan, kontekst, dzis), zadania.length === 0 ? null : sekcjaZadan(zadania)]
}

/** @type {Widok} */
export const widokStartu = {
  render(kontener, { kontekst }) {
    const stan = wczytajStan(kontekst.magazyn)
    const dzis = new Date()
    const nazwaFirmy = stan.ustawienia?.firma.nazwa.trim() ?? ''
    kontener.append(
      naglowek({ tytul: dataDnia(dzis), podtytul: nazwaFirmy || TYTUL_BEZ_FIRMY, czyDuzy: true }),
      h('div', { class: 'tresc' },
        banerIos(stan, kontekst),
        banerUstawien(stan),
        h('div', { class: 'kafle' },
          kafel(sciezka('szybka'), 'bolt', 'Szybka wycena', 'przez telefon, widełki', true),
          kafel(sciezka('kreator', { krok: 'usluga' }), 'file-text', 'Dokładna wycena', 'pomieszczenia i brud', false)),
        trescStartu(stan, kontekst, dzis),
        banerKopii(stan, dzis)),
      dolnyPasek('start'))
  },
}
