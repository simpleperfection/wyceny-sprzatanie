// Formularze ustawien firmy jako czyste funkcje: teksty pol → zmiana dla zapiszUstawienia i bledy do pokazania pod polami.
// Do tego mieszkanie wzorcowe 50 m² (cena i czas normowy z silnika) dla kart „Rynek i VAT” i „Tempo pracy”.

import { POLA_FIRMY } from '../dane/ksztalt.js'
import { GRANICE_KOSZTOW, POLA_DOJAZDU, POLA_WYMAGANE_W_OFERCIE, WALIDATORY_FIRMY } from '../dane/ustawienia.js'
import { GRANICE_TEMPA } from '../dane/walidacja.js'
import { wycenUsluge } from '../silnik/cena.js'
import { zBrudem } from '../silnik/czas.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { bladZakresu, parsujLiczbe } from '../ui/format.js'
import { TEKSTY_BLEDOW } from './teksty-bledow.js'

/** Wspolny format liczb i tekst granic pola (src/ui/format.js); eksport dla sekcji ustawien. */
export { bladZakresu, tekstLiczby } from '../ui/format.js'

/** @typedef {import('../dane/ustawienia.js').ZmianaUstawien} ZmianaUstawien */
/** @typedef {import('../dane/ustawienia.js').ZmianaKosztow} ZmianaKosztow */
/** @typedef {import('../dane/ustawienia.js').PoleDojazdu} PoleDojazdu */
/** @typedef {import('../dane/magazyn.js').Firma} Firma */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/**
 * @typedef {keyof Firma} PoleFirmy
 * @typedef {Partial<Record<PoleFirmy | PoleDojazdu | 'chemia_h' | 'tempo', string>> & { sprzet?: Record<string, string> }} PolaFormularza
 *   teksty pol; brak klucza = pole nie bylo edytowane
 * @typedef {{ patch: ZmianaUstawien, bledy: Record<string, string>, ostrzezenia: Record<string, string> }} WynikFormularza
 *   bledy i ostrzezenia po kluczu pola (`sprzet.<id>` dla maszyn); patch tylko z poprawnych pol
 * @typedef {{ min: number, max: number }} Granice
 */

/** Nazwa firmy i telefon sa potrzebne dopiero w ofercie, wiec pusta wartosc to ostrzezenie, a nie blad. */
const OSTRZEZENIE_OFERTY = 'Potrzebne w ofercie dla klienta.'
const USLUGA_WZORCOWA = 'mieszkanie_standard'
export const METRAZ_WZORCOWY = 50

/**
 * Liczba z pola: pusty tekst = null (wraca wartosc domyslna z data/ceny.json), poza granicami albo nie liczba = blad.
 * @param {string} tekst @param {Granice} granice
 * @returns {{ wartosc: number | null } | { blad: string }}
 */
function liczbaPola(tekst, granice) {
  if (tekst.trim() === '') return { wartosc: null }
  const liczba = parsujLiczbe(tekst)
  return liczba === null || liczba < granice.min || liczba > granice.max ? { blad: bladZakresu(granice) } : { wartosc: liczba }
}

/** @param {PolaFormularza} pola @param {WynikFormularza} wynik */
function dodajFirme(pola, wynik) {
  /** @type {Partial<Firma>} */
  const firma = {}
  for (const klucz of POLA_FIRMY) {
    const tekst = pola[klucz]?.trim()
    if (tekst === undefined) continue
    if (tekst === '' && POLA_WYMAGANE_W_OFERCIE.some((pole) => pole === klucz)) wynik.ostrzezenia[klucz] = OSTRZEZENIE_OFERTY
    const kod = klucz === 'nazwa' || tekst === '' ? null : WALIDATORY_FIRMY[klucz](tekst)
    if (kod) wynik.bledy[klucz] = TEKSTY_BLEDOW[kod]
    else firma[klucz] = tekst
  }
  if (Object.keys(firma).length > 0) wynik.patch.firma = firma
}

/** @param {PolaFormularza} pola @param {WynikFormularza} wynik */
function dodajKoszty(pola, wynik) {
  /** @type {ZmianaKosztow} */
  const koszty = {}
  /** @param {string} klucz @param {string} tekst @param {Granice} granice @param {(wartosc: number | null) => void} ustaw */
  const przypisz = (klucz, tekst, granice, ustaw) => {
    const liczba = liczbaPola(tekst, granice)
    if ('blad' in liczba) wynik.bledy[klucz] = liczba.blad
    else ustaw(liczba.wartosc)
  }
  if (pola.chemia_h !== undefined) przypisz('chemia_h', pola.chemia_h, GRANICE_KOSZTOW.chemia_h, (x) => { koszty.chemia_h = x })
  for (const pole of POLA_DOJAZDU) {
    const tekst = pola[pole]
    if (tekst !== undefined) przypisz(pole, tekst, GRANICE_KOSZTOW[pole], (x) => { koszty.dojazd = { ...koszty.dojazd, [pole]: x } })
  }
  for (const [id, tekst] of Object.entries(pola.sprzet ?? {})) {
    przypisz(`sprzet.${id}`, tekst, GRANICE_KOSZTOW.sprzet, (x) => { koszty.sprzet = { ...koszty.sprzet, [id]: x } })
  }
  if (Object.keys(koszty).length > 0) wynik.patch.koszty = koszty
}

/** @param {PolaFormularza} pola @param {WynikFormularza} wynik */
function dodajTempo(pola, wynik) {
  if (pola.tempo === undefined) return
  const liczba = liczbaPola(pola.tempo, GRANICE_TEMPA)
  if ('blad' in liczba || liczba.wartosc === null) wynik.bledy.tempo = bladZakresu(GRANICE_TEMPA)
  else wynik.patch.tempo = { reczne: liczba.wartosc }
}

/**
 * Teksty pol ustawien → zmiana dla zapiszUstawienia. Liczby z przecinkiem albo kropka; puste NIP i e-mail dozwolone,
 * pusta nazwa i telefon daja ostrzezenie; puste pole kosztu usuwa nadpisanie, a puste tempo reczne to blad.
 * @param {PolaFormularza} pola
 * @returns {WynikFormularza}
 */
export function zmianaZPol(pola) {
  /** @type {WynikFormularza} */
  const wynik = { patch: {}, bledy: {}, ostrzezenia: {} }
  dodajFirme(pola, wynik)
  dodajKoszty(pola, wynik)
  dodajTempo(pola, wynik)
  return wynik
}

/**
 * Typowe mieszkanie 50 m² (sprzatanie standardowe, uklad i brud domyslny) w wojewodztwie: cena modelu i czas normowy.
 * @param {Katalog} katalog
 * @param {string | null} wojewodztwoId null = srednia krajowa
 * @returns {{ cena: number, minuty: number }}
 */
export function mieszkanieWzorcowe(katalog, wojewodztwoId) {
  const usluga = katalog.usluga(USLUGA_WZORCOWA)
  const pomieszczenia = zBrudem(ukladMieszkania(METRAZ_WZORCOWY, {}, katalog.uklady), usluga.brud_domyslny)
  const wynik = wycenUsluge({ uslugaId: usluga.id, wojewodztwoId, pomieszczenia }, katalog)
  return { cena: wynik.cena, minuty: wynik.minutyNormowe }
}
