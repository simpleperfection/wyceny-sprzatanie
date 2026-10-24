// Uklad typowego mieszkania i biura z data/normy.json (pole uklady), odpowiedniki Uklad-Mieszkania i Uklad-Biura
// ze scripts/kalibracja.ps1. Kolejnosc dzialan jak w skrypcie, zeby wyniki zgadzaly sie co do bitu.

import { BladWejscia } from './bledy.js'
import { sprawdzMetraz } from './walidacja.js'

/** @typedef {import('./katalog.js').Uklady} Uklady */
/** @typedef {{ typ: string, m2: number }} PomieszczenieUkladu */
/** @typedef {'osobna' | 'aneks'} RodzajKuchni */

const MIN_M2_POKOI = 1

/** @param {number} wartosc @param {number} min @param {number} max */
function wGranicach(wartosc, min, max) {
  return Math.min(max, Math.max(min, wartosc))
}

/** Metraze lazienek z pierwszej pozycji listy, dla ktorej metraz < do_m2 (null = bez gornej granicy). @param {number} m2 @param {Uklady} uklady */
function lazienkiDomyslne(m2, uklady) {
  const lista = uklady.mieszkanie.lazienki
  const pasujaca = lista.find((l) => l.do_m2 === null || m2 < l.do_m2) ?? lista[lista.length - 1]
  return pasujaca.m2
}

/**
 * Domyslna liczba lazienek typowego mieszkania o danym metrazu.
 * @param {number} m2
 * @param {Uklady} uklady
 * @returns {number}
 */
export function domyslneLazienki(m2, uklady) {
  sprawdzMetraz(m2)
  return lazienkiDomyslne(m2, uklady).length
}

/** Inna liczba lazienek skraca liste domyslna albo doklada lazienki o metrazu ostatniej pozycji. @param {number[]} domyslne @param {number} liczba */
function lazienkiWLiczbie(domyslne, liczba) {
  if (!Number.isInteger(liczba) || liczba < 0) throw new BladWejscia('lazienki', `Liczba łazienek musi być całkowita i nieujemna, jest ${liczba}`)
  const ostatnia = domyslne[domyslne.length - 1]
  return Array.from({ length: liczba }, (_, i) => domyslne[i] ?? ostatnia)
}

/**
 * Uklad typowego mieszkania: pokoje (reszta metrazu), przedpokoj, kuchnia (osobna albo aneks) i lazienki.
 * @param {number} m2
 * @param {{ lazienki?: number, kuchnia?: RodzajKuchni }} opcje
 * @param {Uklady} uklady
 * @returns {PomieszczenieUkladu[]}
 */
export function ukladMieszkania(m2, opcje, uklady) {
  sprawdzMetraz(m2)
  const um = uklady.mieszkanie
  const parametryKuchni = opcje.kuchnia === 'aneks' ? um.aneks : um.kuchnia
  const kuchnia = wGranicach(m2 * parametryKuchni.udzial, parametryKuchni.min_m2, parametryKuchni.max_m2)
  const przedpokoj = m2 * um.przedpokoj.udzial
  const domyslne = lazienkiDomyslne(m2, uklady)
  const lazienki = opcje.lazienki === undefined ? domyslne : lazienkiWLiczbie(domyslne, opcje.lazienki)
  const pokoje = m2 - kuchnia - przedpokoj - lazienki.reduce((suma, l) => suma + l, 0)
  if (pokoje < MIN_M2_POKOI) throw new BladWejscia('metraz', `Za mały metraż ${m2} m² na kuchnię, przedpokój i ${lazienki.length} łazienki`)
  return [
    { typ: 'pokoj', m2: pokoje },
    { typ: 'przedpokoj', m2: przedpokoj },
    { typ: 'kuchnia', m2: kuchnia },
    ...lazienki.map((l) => ({ typ: 'lazienka', m2: l })),
  ]
}

/**
 * Uklad typowego biura: metraz pomieszczenia = m2 wzorca × metraz biura / na_m2.
 * @param {number} m2
 * @param {Uklady} uklady
 * @returns {PomieszczenieUkladu[]}
 */
export function ukladBiura(m2, uklady) {
  sprawdzMetraz(m2)
  const skala = m2 / uklady.biuro.na_m2
  return uklady.biuro.pomieszczenia.map((p) => ({ typ: p.typ, m2: p.m2 * skala }))
}
