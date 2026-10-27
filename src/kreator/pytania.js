// Pytania do klienta przy wycenie (R13) dla ekranu `#/wycena/:id/pytania` i licznika „Pytania do klienta · a z n”: lista pytan
// uslugi z odpowiedziami i skutkami w modelu oraz zapis odpowiedzi. Dokladna wycena dostaje skutek zmienionej odpowiedzi
// w wejsciu (reczne zmiany w kreatorze zostaja), szybka liczy sie od nowa z formularza z dojazdem z odpowiedzi. Bez DOM.

import { wczytajStan } from '../dane/magazyn.js'
import { scalKoszty } from '../dane/ustawienia.js'
import { BladWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { opisOdpowiedzi, pytaniaUslugi, zastosujOdpowiedzi } from '../silnik/pytania.js'
import { zapiszZmianyWyceny } from './stan.js'
import { dojazdZOdpowiedzi, kontekstSzybkiej, wejscieZWyceny, zapiszSzybka } from './szybka.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../silnik/pytania.js').Pytanie} Pytanie */
/** @typedef {import('../silnik/pytania.js').Odpowiedz} Odpowiedz */
/**
 * @typedef {{ pytanie: Pytanie, odpowiedz: Odpowiedz | null, opis: string | null, skutek: string | null }} PytanieEkranu
 *   opis: odpowiedz do pokazania („Tak, kot”), skutek: co odpowiedz ustawila w wycenie („sierść, poziom 1 w pokojach”)
 * @typedef {{ lista: PytanieEkranu[], odpowiedziane: number, liczba: number, bledne: BladWejscia[] }} OdpowiedziUslugi
 *   bledne: zapisane odpowiedzi o zlym ksztalcie (np. z pliku kopii), pokazane jak brak odpowiedzi
 */

/** @param {unknown} x @returns {x is Odpowiedz} ksztalt odpowiedzi; wartosc wg typu pytania sprawdza opisOdpowiedzi */
const jestOdpowiedzia = (x) => typeof x === 'object' && x !== null && 'wartosc' in x && (typeof x.wartosc === 'string' || typeof x.wartosc === 'number')

/** @param {Pytanie} pytanie @param {unknown} odpowiedz @returns {{ odpowiedz: Odpowiedz, opis: string } | BladWejscia} */
function odczytajOdpowiedz(pytanie, odpowiedz) {
  try {
    const opis = opisOdpowiedzi(pytanie, odpowiedz)
    if (!jestOdpowiedzia(odpowiedz)) return new BladWejscia('odpowiedz', `Odpowiedź na pytanie ${pytanie.id} nie ma wartości`)
    return { odpowiedz, opis }
  } catch (blad) {
    if (blad instanceof BladWejscia) return blad
    throw blad
  }
}

/**
 * Pytania uslugi z zapisanymi odpowiedziami: opis odpowiedzi i licznik odpowiedzianych (odpowiedz o zlym ksztalcie trafia do
 * `bledne` i liczy sie jak jej brak).
 * @param {string} uslugaId @param {Record<string, unknown>} odpowiedzi @param {Pytania} pytania
 * @returns {OdpowiedziUslugi}
 */
export function odpowiedziUslugi(uslugaId, odpowiedzi, pytania) {
  /** @type {BladWejscia[]} */
  const bledne = []
  const lista = pytaniaUslugi(uslugaId, pytania).map((pytanie) => {
    if (!Object.hasOwn(odpowiedzi, pytanie.id)) return { pytanie, odpowiedz: null, opis: null, skutek: null }
    const odczyt = odczytajOdpowiedz(pytanie, odpowiedzi[pytanie.id])
    if (odczyt instanceof BladWejscia) {
      bledne.push(odczyt)
      return { pytanie, odpowiedz: null, opis: null, skutek: null }
    }
    return { pytanie, ...odczyt, skutek: null }
  })
  return { lista, odpowiedziane: lista.filter((p) => p.odpowiedz !== null).length, liczba: lista.length, bledne }
}

/**
 * Ekran pytan wyceny: odpowiedzi z opisem i skutkiem kazdej odpowiedzi w modelu (zastosujOdpowiedzi na wejsciu wyceny: brud
 * w pomieszczeniach, dojazd ze stawka klienta z ustawien).
 * @param {Wycena} wycena @param {Pytania} pytania @param {DaneAplikacji} kontekst
 * @returns {OdpowiedziUslugi}
 */
export function pytaniaWyceny(wycena, pytania, kontekst) {
  const { katalog, magazyn } = kontekst
  const wynik = odpowiedziUslugi(wycena.wejscie.uslugaId, wycena.odpowiedzi, pytania)
  /** @type {Record<string, unknown>} */
  const poprawne = Object.fromEntries(wynik.lista.flatMap((p) => (p.odpowiedz ? [[p.pytanie.id, p.odpowiedz]] : [])))
  const stawkiDojazdu = scalKoszty(katalog.kosztyFirmy, wczytajStan(magazyn).ustawienia).dojazd
  const { skutki } = zastosujOdpowiedzi(wycena.wejscie, poprawne, pytania, katalog, { stawkiDojazdu })
  const opisy = new Map(skutki.map((s) => [s.pytanieId, s.opis]))
  return { ...wynik, lista: wynik.lista.map((p) => ({ ...p, skutek: opisy.get(p.pytanie.id) ?? null })) }
}

/** @param {Odpowiedz} odpowiedz @returns {Odpowiedz} wartosc tekstowa i notatka bez spacji na koncach, pusta notatka pominieta */
function bezSpacji({ wartosc, notatka }) {
  const tekst = typeof wartosc === 'string' ? wartosc.trim() : wartosc
  const krotka = notatka?.trim() ?? ''
  return krotka === '' ? { wartosc: tekst } : { wartosc: tekst, notatka: krotka }
}

/**
 * Zapis odpowiedzi na pytanie (null usuwa odpowiedz). Zla wartosc albo za dluga notatka daje BladWejscia (`odpowiedz`, `notatka`),
 * pytanie spoza listy uslugi — BladWejscia `nieznane_pytanie`. Dokladna wycena: skutek tej odpowiedzi trafia do wejscia razem
 * z odpowiedziami w jednym zapisie (zmiana w innej karcie miedzy odczytem a zapisem daje BladWyceny `nieaktualna`); usuniecie
 * odpowiedzi zostawia wejscie. Szybka: formularz z nowymi odpowiedziami i dojazdem z nich zapisuje zapiszSzybka.
 * @param {DaneAplikacji} kontekst @param {string} id @param {string} pytanieId @param {Odpowiedz | null} odpowiedz
 * @param {Pytania} pytania
 * @returns {Wycena}
 */
export function zapiszOdpowiedz(kontekst, id, pytanieId, odpowiedz, pytania) {
  const { katalog, magazyn } = kontekst
  const obecna = znajdzWycene(wczytajStan(magazyn), id)
  if (!obecna) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
  const pytanie = pytaniaUslugi(obecna.wejscie.uslugaId, pytania).find((p) => p.id === pytanieId)
  if (!pytanie) throw new BladWejscia('nieznane_pytanie', `Usługa ${obecna.wejscie.uslugaId} nie ma pytania ${pytanieId}`)
  const czysta = odpowiedz === null ? null : bezSpacji(odpowiedz)
  if (czysta !== null) opisOdpowiedzi(pytanie, czysta)
  const pozostale = Object.fromEntries(Object.entries(obecna.odpowiedzi).filter(([klucz]) => klucz !== pytanieId))
  const odpowiedzi = czysta === null ? pozostale : { ...pozostale, [pytanieId]: czysta }
  if (obecna.rodzaj === 'szybka') {
    const formularz = { ...wejscieZWyceny(obecna, katalog), odpowiedzi }
    const dojazdKm = dojazdZOdpowiedzi(formularz, pytania, kontekstSzybkiej(kontekst, formularz.uslugaId))
    return zapiszSzybka(kontekst, id, { ...formularz, dojazdKm })
  }
  const stawkiDojazdu = scalKoszty(katalog.kosztyFirmy, wczytajStan(magazyn).ustawienia).dojazd
  const wejscie = czysta === null ? undefined
    : zastosujOdpowiedzi(obecna.wejscie, { [pytanieId]: czysta }, pytania, katalog, { stawkiDojazdu }).wejscie
  return zapiszZmianyWyceny(kontekst, id, (w) => {
    if (w.zmieniona !== obecna.zmieniona) throw new BladWyceny('nieaktualna', `Wycena ${id} zmieniła się w innej karcie`)
    return wejscie === undefined ? { odpowiedzi } : { odpowiedzi, wejscie }
  })
}
