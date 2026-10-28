// Strona oferty dla klienta (makieta oferta-klient, R18, R21, R22): dokument z danymi firmy, cena, zakres i warunki z linku.
// Oferta z linku niesie tylko pola z bialej listy (src/oferta/kodek.js), wiec widok nie ma skad pokazac kosztow firmy ani tempa.
// Dane z linku sa niezaufane: kazdy tekst idzie przez `h` jako wezel tekstowy. Stany: wazna, po terminie (baner nad dokumentem),
// uszkodzony link i stara przegladarka (sam komunikat). Widok nie dotyka magazynu przegladarki ani `window`: druk podaje start strony.

import { data, tekstLiczby, zl, zlGr } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'

/** @typedef {import('../oferta/tresc.js').Oferta} Oferta */
/** @typedef {import('../oferta/kodek.js').PowodOdmowy} PowodOdmowy */
/** @typedef {{ czyWazna: boolean, naPobierz: () => void }} OpcjeOferty */

const JEZYK = 'pl-PL'
const NBSP = ' '
const WALUTA = `${NBSP}zł`
const LICZBA_INICJALOW = 2
const TEKSTY = Object.freeze({
  uszkodzony: 'Ten link do oferty jest niepełny albo uszkodzony. Poproś firmę o nowy link.',
  przegladarka: 'Ta przeglądarka nie otworzy oferty. Otwórz link w aktualnej wersji przeglądarki albo poproś firmę o PDF.',
  zwolniony: 'Kwota bez VAT – firma zwolniona z VAT.',
  razem: 'Razem do zapłaty',
})
/** Kwota szybkiej wyceny bez widelek: „ok.” (jedna kwota) i „od” (wycena po ogledzinach). */
const PRZEDROSTKI_KWOTY = Object.freeze({ ok: 'ok.', od: 'od' })
const KONIEC_ZDANIA = /[.!?…]$/u
const KONCOWA_INTERPUNKCJA = /[\s.,;:]+$/u

/** @param {number} x @returns {string} „290 zł”, a kwota z groszami „54,98 zł” */
const kwota = (x) => (Number.isInteger(x) ? zl(x) : zlGr(x))

/**
 * @param {Oferta['razem']} razem @param {Oferta['trybCeny']} [trybCeny] tryb kwoty szybkiej wyceny albo `stala`
 * @returns {{ etykieta: string, kwota: string }} widelki: „Razem do zapłaty: 254–304 zł”, szybka „ok. 290 zł”, ogledziny „od 290 zł”
 */
export function tekstRazem({ od, do: doKwoty }, trybCeny = 'stala') {
  if (od !== doKwoty) return { etykieta: `${TEKSTY.razem}: `, kwota: `${kwota(od).slice(0, -WALUTA.length)}–${kwota(doKwoty)}` }
  if (trybCeny === 'ok' || trybCeny === 'od') return { etykieta: `${TEKSTY.razem}: `, kwota: `${PRZEDROSTKI_KWOTY[trybCeny]} ${kwota(od)}` }
  return { etykieta: TEKSTY.razem, kwota: kwota(od) }
}

/**
 * @param {NonNullable<Oferta['abonament']>} abonament @param {Oferta['trybCeny']} trybCeny
 * @returns {string} „Kwota za jedną wizytę. Miesięcznie (4,33 wizyt): 1 273 zł.”
 */
export function tekstAbonamentu({ wizyt, miesiecznie }, trybCeny) {
  return `Kwota za jedną wizytę. Miesięcznie (${tekstLiczby(wizyt)} wizyt): ${tekstRazem(miesiecznie, trybCeny).kwota}.`
}

/** @param {Oferta['vat']} vat @returns {string} zdanie o VAT pod kwota; przy widelkach (bez kwot netto) tylko stawka */
export function tekstVat({ status, stawka, netto, kwotaVat }) {
  if (status === 'zwolniony') return TEKSTY.zwolniony
  if (netto === null || kwotaVat === null) return `Cena zawiera VAT ${tekstLiczby(stawka)}%.`
  return `Cena zawiera VAT ${tekstLiczby(stawka)}%: ${kwota(kwotaVat)} (netto ${kwota(netto)}).`
}

/** @param {string} nazwa @returns {string} „TF” z „Twoja Firma Sprzątająca”; pusty tekst, gdy nazwy brak */
export function inicjalyFirmy(nazwa) {
  const slowa = nazwa.trim().split(/\s+/u).filter(Boolean).slice(0, LICZBA_INICJALOW)
  return slowa.map((slowo) => Array.from(slowo)[0] ?? '').join('').toLocaleUpperCase(JEZYK)
}

/** @param {Oferta['firma']} firma @returns {string} „tel. 500 000 000 · biuro@firma.pl · NIP 123…” z pol, ktore firma podala */
export function tekstKontaktu({ telefon, email, nip }) {
  return [telefon && `tel. ${telefon}`, email, nip && `NIP ${nip}`].filter(Boolean).join(' · ')
}

/** @param {Oferta['klient']} klient @returns {string} „ul. Przykładowa 1 · termin: 14 listopada 2026, 9:00” (termin po polsku z tresc.js) */
export const tekstDla = ({ adres, termin }) => [adres, termin && `termin: ${termin}`].filter(Boolean).join(' · ')

/** @param {string} telefon numer wpisany przez firme @returns {string | null} `tel:` z samych cyfr (i `+` na poczatku), null bez cyfr */
export function adresTelefonu(telefon) {
  const cyfry = telefon.replace(/\D/gu, '')
  if (cyfry === '') return null
  return `tel:${telefon.trim().startsWith('+') ? '+' : ''}${cyfry}`
}

/** @param {string} punkt @returns {string} punkt w srodku zdania: mala litera na poczatku (bez skrotow „AGD”), bez kropki na koncu */
function wSrodkuZdania(punkt) {
  const bezKropki = punkt.replace(KONCOWA_INTERPUNKCJA, '')
  const [pierwsza = '', druga = ''] = Array.from(bezKropki)
  const czySkrot = druga !== druga.toLocaleLowerCase(JEZYK)
  return czySkrot ? bezKropki : `${pierwsza.toLocaleLowerCase(JEZYK)}${bezKropki.slice(pierwsza.length)}`
}

/** @param {string[]} lista punkty „nie wchodzi” @returns {string} „Poza ceną: wnętrza szafek i AGD, mycie okien.” */
export const tekstPozaCena = (lista) => `Poza ceną: ${lista.map(wSrodkuZdania).join(', ')}.`

/** @param {string[]} warunki @returns {string} warunki jednym akapitem, kazdy zakonczony kropka */
export const tekstWarunkow = (warunki) => warunki.map((w) => (KONIEC_ZDANIA.test(w) ? w : `${w}.`)).join(' ')

/** @param {string} waznaDo RRRR-MM-DD @returns {string} tekst banera oferty po terminie */
export const tekstPoTerminie = (waznaDo) => `Oferta była ważna do ${data(waznaDo)}. Zadzwoń, żeby potwierdzić aktualną cenę.`

/** @param {Oferta} oferta @returns {string} tytul karty i nazwa pliku PDF: „Wycena nr 15/10/2026 – Twoja Firma” */
export const tytulOferty = ({ numer, firma }) => (firma.nazwa ? `Wycena nr ${numer} – ${firma.nazwa}` : `Wycena nr ${numer}`)

/** @param {string} opis @param {string | null} wartosc @param {string} [klasaWartosci] @returns {HTMLLIElement} */
const wiersz = (opis, wartosc, klasaWartosci) => h('li', { class: 'oferta__wiersz' },
  h('span', null, opis), wartosc === null ? null : h('span', { class: ['oferta__kwota', 'liczba', klasaWartosci] }, wartosc))

/** @param {Oferta['firma']} firma @returns {HTMLElement} */
function naglowekFirmy(firma) {
  const inicjaly = inicjalyFirmy(firma.nazwa)
  const kontakt = tekstKontaktu(firma)
  return h('header', { class: 'oferta__firma' },
    inicjaly ? h('span', { class: 'oferta__inicjaly', 'aria-hidden': 'true' }, inicjaly) : null,
    h('div', null,
      firma.nazwa ? h('p', { class: 'oferta__nazwa-firmy' }, firma.nazwa) : null,
      kontakt ? h('p', { class: 'oferta__kontakt' }, kontakt) : null))
}

/** @param {Oferta['klient']} klient @returns {HTMLElement | null} */
function sekcjaDla(klient) {
  const szczegoly = tekstDla(klient)
  if (!klient.nazwa && !szczegoly) return null
  return h('section', { class: 'oferta__pole', 'aria-labelledby': 'oferta-dla' },
    h('h2', { class: 'oferta__etykieta-dla', id: 'oferta-dla' }, 'Dla'),
    klient.nazwa ? h('p', { class: 'oferta__klient' }, klient.nazwa) : null,
    szczegoly ? h('p', { class: 'oferta__drobny' }, szczegoly) : null)
}

/** @param {Oferta} oferta @returns {HTMLElement[]} wiersze uslug, dojazd, „Razem do zapłaty”, abonament i zdanie o VAT */
function sekcjaCeny({ uslugi, dojazd, razem, trybCeny, abonament, vat }) {
  const czyBezKwotLinii = razem.od !== razem.do || trybCeny === 'od'
  const suma = tekstRazem(razem, trybCeny)
  // Przy widelkach i „od” linie uslug maja kwote dolnej granicy, wiec pokazujemy same opisy, a kwote tylko w „Razem”.
  const linie = uslugi.map((u) => wiersz(u.opis, czyBezKwotLinii ? null : kwota(u.kwota)))
  return [
    h('ul', { class: 'oferta__wiersze' }, linie, dojazd > 0 ? wiersz('Dojazd', kwota(dojazd)) : null),
    h('p', { class: 'oferta__razem' }, h('span', null, suma.etykieta), h('strong', { class: 'liczba' }, suma.kwota)),
    abonament ? h('p', { class: 'oferta__abonament' }, tekstAbonamentu(abonament, trybCeny)) : null,
    h('p', { class: 'oferta__vat' }, tekstVat(vat)),
  ].filter((wezel) => wezel !== null)
}

/** @param {Oferta['dodatkiOpcjonalne']} dodatki @returns {HTMLElement | null} */
function sekcjaDodatkow(dodatki) {
  if (dodatki.length === 0) return null
  return h('section', { class: 'oferta__pole', 'aria-labelledby': 'oferta-dodatki' },
    h('h2', { class: 'oferta__etykieta', id: 'oferta-dodatki' }, 'Możesz dobrać'),
    h('ul', { class: 'oferta__wiersze oferta__wiersze--dodatki' },
      dodatki.map((d) => wiersz(d.opis, `+${kwota(d.kwota)}`, 'oferta__kwota--dodatek'))))
}

/** @param {Oferta['zakres']} zakres @returns {HTMLElement | null} */
function sekcjaZakresu({ wchodzi, nie_wchodzi: nieWchodzi }) {
  if (wchodzi.length === 0 && nieWchodzi.length === 0) return null
  return h('section', { class: 'oferta__zakres', 'aria-labelledby': wchodzi.length > 0 ? 'oferta-w-cenie' : null },
    wchodzi.length > 0 ? h('h2', { class: 'oferta__naglowek', id: 'oferta-w-cenie' }, 'W cenie') : null,
    wchodzi.length > 0
      ? h('ul', { class: 'oferta__lista' }, wchodzi.map((punkt) => h('li', null, ikona('check', 'oferta__znacznik'), h('span', null, punkt))))
      : null,
    nieWchodzi.length > 0 ? h('p', { class: 'oferta__poza' }, tekstPozaCena(nieWchodzi)) : null)
}

/** @param {string} telefon @param {() => void} naPobierz @returns {HTMLElement} */
function przyciski(telefon, naPobierz) {
  const adres = adresTelefonu(telefon)
  return h('div', { class: 'oferta__przyciski' },
    adres ? h('a', { class: 'oferta__przycisk oferta__przycisk--glowny', href: adres }, `Zadzwoń: ${telefon}`) : null,
    h('button', { type: 'button', class: 'oferta__przycisk oferta__przycisk--drugi', on: { click: () => naPobierz() } }, 'Pobierz PDF'))
}

/**
 * Tresc strony oferty: baner po terminie (gdy oferta niewazna) i dokument wg makiety oferta-klient.
 * @param {Oferta} oferta po walidacji schematu (odkodujOferte) @param {OpcjeOferty} opcje
 * @returns {HTMLElement[]} wezly do wstawienia w <main>; zla data waznosci rzuca BladFormatu
 */
export function widokOferty(oferta, { czyWazna, naPobierz }) {
  const baner = czyWazna ? null : h('p', { class: 'oferta__baner' }, tekstPoTerminie(oferta.waznaDo))
  const dokument = h('article', { class: 'oferta__dokument', 'aria-labelledby': 'oferta-tytul' },
    naglowekFirmy(oferta.firma),
    h('div', { class: 'oferta__tytul' },
      h('h1', { id: 'oferta-tytul' }, `Wycena nr ${oferta.numer}`),
      h('p', { class: 'oferta__drobny' }, `ważna do ${data(oferta.waznaDo)}`)),
    sekcjaDla(oferta.klient),
    sekcjaCeny(oferta),
    sekcjaDodatkow(oferta.dodatkiOpcjonalne),
    sekcjaZakresu(oferta.zakres),
    oferta.warunki.length > 0 ? h('p', { class: 'oferta__warunki' }, tekstWarunkow(oferta.warunki)) : null,
    przyciski(oferta.firma.telefon, naPobierz))
  return baner ? [baner, dokument] : [dokument]
}

/**
 * Sam komunikat zamiast oferty: stara przegladarka albo link pusty, z inna wersja kodu, obciety lub zmieniony.
 * @param {PowodOdmowy} powod @returns {HTMLElement}
 */
export function widokOdmowy(powod) {
  return h('p', { class: 'oferta__komunikat', role: 'alert' }, powod === 'przegladarka' ? TEKSTY.przegladarka : TEKSTY.uszkodzony)
}
