// Pytania do klienta przy wycenie (R13) dla ekranu `#/wycena/:id/pytania` i licznika „Pytania do klienta · a z n”: lista pytan
// uslugi z odpowiedziami i skutkami obecnymi w wejsciu oraz zapis odpowiedzi. Dokladna wycena dostaje skutek zmienionej
// albo usunietej odpowiedzi w wejsciu (reczne zmiany w kreatorze zostaja, nowe pomieszczenie dostaje brud z brudOdpowiedzi), szybka
// liczy sie od nowa z formularza z dojazdem i brudem z odpowiedzi. Bez DOM.

import { wczytajStan } from '../dane/magazyn.js'
import { scalKoszty } from '../dane/ustawienia.js'
import { BladWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import {
  bezSkutkuBrudu, czySkutekWWejsciu, opisOdpowiedzi, pytaniaUslugi, regulyBrudu, zastosujOdpowiedzi,
} from '../silnik/pytania.js'
import { brudNowegoPomieszczenia, zapiszZmianyWyceny } from './stan.js'
import { kontekstSzybkiej, wejscieZWyceny, zapiszSzybka, zSkutkamiOdpowiedzi } from './szybka.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../silnik/pytania.js').Pytanie} Pytanie */
/** @typedef {import('../silnik/pytania.js').Odpowiedz} Odpowiedz */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/katalog.js').RegulaBrudu} RegulaBrudu */
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

/** @param {OdpowiedziUslugi} wynik @returns {Record<string, unknown>} odpowiedzi o dobrym ksztalcie (bez `bledne`) */
const poprawneOdpowiedzi = (wynik) => Object.fromEntries(wynik.lista.flatMap((p) => (p.odpowiedz ? [[p.pytanie.id, p.odpowiedz]] : [])))

/**
 * Ekran pytan wyceny: odpowiedzi z opisem i skutkiem odpowiedzi, ktory jest w wejsciu wyceny (brud skutku na jego poziomie
 * w pasujacym pomieszczeniu, kilometry dojazdu rowne odpowiedzi; opis dojazdu ze stawka klienta z ustawien). Skutek zdjety
 * recznie w kreatorze nie ma pigulki.
 * @param {Wycena} wycena @param {Pytania} pytania @param {DaneAplikacji} kontekst
 * @returns {OdpowiedziUslugi}
 */
export function pytaniaWyceny(wycena, pytania, kontekst) {
  const { katalog, magazyn } = kontekst
  const wynik = odpowiedziUslugi(wycena.wejscie.uslugaId, wycena.odpowiedzi, pytania)
  const stawkiDojazdu = scalKoszty(katalog.kosztyFirmy, wczytajStan(magazyn).ustawienia).dojazd
  const { skutki } = zastosujOdpowiedzi(wycena.wejscie, poprawneOdpowiedzi(wynik), pytania, katalog, { stawkiDojazdu })
  const opisy = new Map(skutki.map((s) => [s.pytanieId, s.opis]))
  return {
    ...wynik,
    lista: wynik.lista.map((p) => {
      const opis = opisy.get(p.pytanie.id)
      const czyObecny = opis !== undefined && p.pytanie.skutek !== undefined && p.odpowiedz !== null &&
        czySkutekWWejsciu(wycena.wejscie, p.pytanie.skutek, p.odpowiedz)
      return { ...p, skutek: czyObecny ? opis : null }
    }),
  }
}

/**
 * Reguly brudu z odpowiedzi klienta wyceny (skutek `brud` z odpowiedzia rowna `gdy`) dla pomieszczenia dodanego w kreatorze
 * po odpowiedzi; odpowiedzi o zlym ksztalcie sa pomijane.
 * @param {Pick<Wycena, 'wejscie' | 'odpowiedzi'>} wycena @param {Pytania} pytania
 * @returns {RegulaBrudu[]}
 */
export function brudOdpowiedzi(wycena, pytania) {
  const { uslugaId } = wycena.wejscie
  return regulyBrudu(uslugaId, poprawneOdpowiedzi(odpowiedziUslugi(uslugaId, wycena.odpowiedzi, pytania)), pytania)
}

/** @param {Odpowiedz} odpowiedz @returns {Odpowiedz} wartosc tekstowa i notatka bez spacji na koncach, pusta notatka pominieta */
function bezSpacji({ wartosc, notatka }) {
  const tekst = typeof wartosc === 'string' ? wartosc.trim() : wartosc
  const krotka = notatka?.trim() ?? ''
  return krotka === '' ? { wartosc: tekst } : { wartosc: tekst, notatka: krotka }
}

/**
 * Wejscie dokladnej wyceny po zmianie albo usunieciu (null) odpowiedzi na pytanie ze skutkiem: skutek nowej wartosci albo
 * zdjecie brudu skutku, ktory poprzednia wartosc uruchamiala (`tak` → `nie` albo usuniecie „tak”). Undefined = wejscie bez
 * zmian (pytanie bez skutku, ta sama wartosc, np. inna notatka, albo zmiana bez wplywu), wiec migawka i oferta zostaja.
 * @param {Wycena} obecna @param {Pytanie} pytanie @param {Odpowiedz | null} odpowiedz @param {Pytania} pytania
 * @param {DaneAplikacji} kontekst
 * @returns {WejscieWyceny | undefined}
 */
function wejscieZOdpowiedzi(obecna, pytanie, odpowiedz, pytania, kontekst) {
  const { skutek } = pytanie
  const poprzednia = obecna.odpowiedzi[pytanie.id]
  if (!skutek || (jestOdpowiedzia(poprzednia) && poprzednia.wartosc === odpowiedz?.wartosc)) return undefined
  const { katalog, magazyn } = kontekst
  const stawkiDojazdu = scalKoszty(katalog.kosztyFirmy, wczytajStan(magazyn).ustawienia).dojazd
  const { wejscie, skutki } = odpowiedz === null ? { wejscie: obecna.wejscie, skutki: [] }
    : zastosujOdpowiedzi(obecna.wejscie, { [pytanie.id]: odpowiedz }, pytania, katalog, { stawkiDojazdu })
  const czyZdjac = skutek.rodzaj === 'brud' && skutki.length === 0 && jestOdpowiedzia(poprzednia) && poprzednia.wartosc === skutek.gdy
  const nowe = czyZdjac ? bezSkutkuBrudu(obecna.wejscie, skutek, (typ) => brudNowegoPomieszczenia(katalog, obecna.wejscie.uslugaId, typ)) : wejscie
  return JSON.stringify(nowe) === JSON.stringify(obecna.wejscie) ? undefined : nowe
}

/**
 * Zapis odpowiedzi na pytanie (null usuwa odpowiedz). Zla wartosc albo za dluga notatka daje BladWejscia (`odpowiedz`, `notatka`),
 * pytanie spoza listy uslugi — BladWejscia `nieznane_pytanie`. Dokladna wycena: zmiana wejscia z wejscieZOdpowiedzi trafia
 * do zapisu razem z odpowiedziami (zmiana w innej karcie miedzy odczytem a zapisem daje BladWyceny `nieaktualna`); bez zmiany
 * wejscia zapisuja sie same odpowiedzi. Szybka: formularz z nowymi odpowiedziami i ich skutkami (dojazd i brud) zapisuje zapiszSzybka.
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
    return zapiszSzybka(kontekst, id, zSkutkamiOdpowiedzi(formularz, pytania, kontekstSzybkiej(kontekst, formularz.uslugaId)))
  }
  const wejscie = wejscieZOdpowiedzi(obecna, pytanie, czysta, pytania, kontekst)
  return zapiszZmianyWyceny(kontekst, id, (w) => {
    if (w.zmieniona !== obecna.zmieniona) throw new BladWyceny('nieaktualna', `Wycena ${id} zmieniła się w innej karcie`)
    return wejscie === undefined ? { odpowiedzi } : { odpowiedzi, wejscie }
  })
}
