// Router hash: dopasowanie adresu do trasy (czysta funkcja) i przelaczanie widokow w kontenerze aplikacji.
// Widok to modul z `render(kontener, { parametry, zapytanie, kontekst })`, ktory zwraca funkcje sprzatajaca albo nic.

import { jestNazwaTrasy, TRASY } from './trasy.js'

/** @typedef {import('./trasy.js').NazwaTrasy} NazwaTrasy */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/**
 * @typedef {{ nazwa: NazwaTrasy, parametry: Record<string, string>, zapytanie: Record<string, string> }} Dopasowanie
 * @typedef {{ katalog: Katalog, domyslne: Domyslne, magazyn: Magazyn }} DaneAplikacji
 * @typedef {DaneAplikacji & { nawiguj: (adres: string) => void, odswiez: () => void }} Kontekst
 * @typedef {{ parametry: Record<string, string>, zapytanie: Record<string, string>, kontekst: Kontekst }} ArgumentyWidoku
 * @typedef {{ render: (kontener: HTMLElement, argumenty: ArgumentyWidoku) => (() => void) | void }} Widok
 * @typedef {{ nieZnaleziono: Widok, bladEkranu: Widok } & Partial<Record<NazwaTrasy, Widok>>} Widoki
 * @typedef {{ nawiguj: (adres: string) => void, odswiez: () => void, zatrzymaj: () => void }} Router
 */

const ADRESY_POCZATKOWE = new Set(['', '#', '#/'])

/**
 * Zle kodowanie procentowe (np. `%E0%A4%A`) traktujemy jak nieznany adres: uzytkownik widzi ekran „nie znaleziono”.
 * @param {string} segment
 * @returns {string | null}
 */
function zdekoduj(segment) {
  try {
    return decodeURIComponent(segment)
  } catch (blad) {
    if (blad instanceof URIError) return null
    throw blad
  }
}

/** @param {string} hash @returns {{ segmenty: string[], zapytanie: Record<string, string> }} */
function rozbierz(hash) {
  const adres = hash.startsWith('#') ? hash.slice(1) : hash
  const znakZapytania = adres.indexOf('?')
  const sciezka = znakZapytania === -1 ? adres : adres.slice(0, znakZapytania)
  const zapytanie = znakZapytania === -1 ? '' : adres.slice(znakZapytania + 1)
  return { segmenty: sciezka.replace(/\/$/, '').split('/'), zapytanie: Object.fromEntries(new URLSearchParams(zapytanie)) }
}

/** @param {string[]} wzorzec @param {string[]} segmenty @returns {Record<string, string> | null} */
function parametryWzorca(wzorzec, segmenty) {
  if (wzorzec.length !== segmenty.length) return null
  /** @type {Record<string, string>} */
  const parametry = {}
  for (const [i, czesc] of wzorzec.entries()) {
    const segment = segmenty[i] ?? ''
    if (!czesc.startsWith(':')) {
      if (czesc !== segment) return null
      continue
    }
    const wartosc = segment === '' ? null : zdekoduj(segment)
    if (wartosc === null) return null
    parametry[czesc.slice(1)] = wartosc
  }
  return parametry
}

/**
 * Dopasowuje adres hash do wzorcow tras, np. `#/wycena/abc/oferta` → `{ nazwa: 'oferta', parametry: { id: 'abc' }, zapytanie: {} }`.
 * @param {string} hash np. `location.hash`
 * @param {Readonly<Record<NazwaTrasy, string>>} trasy
 * @returns {Dopasowanie | null} null dla nieznanego adresu
 */
export function dopasuj(hash, trasy) {
  const { segmenty, zapytanie } = rozbierz(hash)
  for (const [nazwa, wzorzec] of Object.entries(trasy)) {
    const parametry = parametryWzorca(rozbierz(wzorzec).segmenty, segmenty)
    if (parametry && jestNazwaTrasy(nazwa)) return { nazwa, parametry, zapytanie }
  }
  return null
}

/** Nowy ekran zaczyna sie od gory, a fokus trafia na jego naglowek (czytnik ekranu odczytuje tytul). @param {HTMLElement} kontener */
function ustawPoczatekEkranu(kontener) {
  window.scrollTo(0, 0)
  const naglowek = kontener.querySelector('h1')
  if (!naglowek) return
  naglowek.tabIndex = -1
  naglowek.focus({ preventScroll: true })
}

/**
 * Pokazuje widok trasy z `location.hash` i przelacza go przy `hashchange`; pusty adres prowadzi na start.
 * @param {HTMLElement} kontener
 * @param {Widoki} widoki
 * @param {DaneAplikacji} dane
 * @returns {Router}
 */
export function uruchomRouter(kontener, widoki, dane) {
  /** @type {(() => void) | void} */
  let sprzatanie
  /** @type {Kontekst} */
  const kontekst = { ...dane, nawiguj, odswiez }

  function zakonczWidok() {
    const poprzednie = sprzatanie
    sprzatanie = undefined
    if (poprzednie) poprzednie()
  }

  /** @param {boolean} czyNowyEkran */
  function pokaz(czyNowyEkran) {
    if (ADRESY_POCZATKOWE.has(location.hash)) history.replaceState(null, '', TRASY.start)
    zakonczWidok()
    const dopasowanie = dopasuj(location.hash, TRASY)
    const widok = (dopasowanie && widoki[dopasowanie.nazwa]) ?? widoki.nieZnaleziono
    /** @type {ArgumentyWidoku} */
    const argumenty = { parametry: dopasowanie?.parametry ?? {}, zapytanie: dopasowanie?.zapytanie ?? {}, kontekst }
    kontener.replaceChildren()
    try {
      sprzatanie = widok.render(kontener, argumenty)
    } catch (blad) {
      kontener.replaceChildren()
      sprzatanie = widoki.bladEkranu.render(kontener, argumenty)
      reportError(blad)
    }
    if (czyNowyEkran) ustawPoczatekEkranu(kontener)
  }

  /** @param {string} adres adres hash z `sciezka()` */
  function nawiguj(adres) {
    if (adres === location.hash) pokaz(true)
    else location.hash = adres
  }

  function odswiez() {
    pokaz(false)
  }

  const handleHashChange = () => pokaz(true)
  window.addEventListener('hashchange', handleHashChange)
  pokaz(false)
  return {
    nawiguj,
    odswiez,
    zatrzymaj: () => {
      window.removeEventListener('hashchange', handleHashChange)
      zakonczWidok()
    },
  }
}
