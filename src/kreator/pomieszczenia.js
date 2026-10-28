// Krok zakresu kreatora dla uslug w trybie pomieszczen (R25, R14): czyste funkcje na `wejscie.pomieszczenia` (dodanie z nazwa
// i brudem domyslnym, nazwa, metraz, brud, usuniecie) oraz podsumowanie metrazu i czasu normowego z tempem. Bez DOM i magazynu;
// widok zapisuje wynik przez `zmienWejscie` z src/kreator/stan.js.

import { BladWejscia } from '../silnik/bledy.js'
import { minutyPomieszczen, mnoznikZakresu, zPoziomemBrudu } from '../silnik/czas.js'
import { brudNowegoPomieszczenia } from './stan.js'

/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/cena.js').PomieszczenieWyceny} PomieszczenieWyceny */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Brud} Brud */
/** @typedef {import('../silnik/katalog.js').RegulaBrudu} RegulaBrudu */
/**
 * @typedef {{ m2: number, minutyNormowe: number, minutyZTempem: number }} PodsumowanieZakresu
 * @typedef {{ m2: number, lazienki: number, kuchnia: 'kuchnia' | 'aneks' | null }} OpisPrzeniesienia
 */

/** Granice metrazu jednego pomieszczenia w kreatorze (tekst bledu w widoku: „od 0,5 do 1000 m²”). */
export const GRANICE_METRAZU = Object.freeze({ min: 0.5, max: 1000 })
/** Nazwa pomieszczenia: 1–40 znakow po obcieciu spacji. */
export const MAKS_DLUGOSC_NAZWY = 40
/** Metraz nowego pomieszczenia, zanim firma go zmieni licznikiem (karta otwiera sie rozwinieta). */
export const METRAZ_NOWEGO_POMIESZCZENIA = 10
/** Najwyzszy poziom brudu; 0 = brak brudu tego rodzaju. */
const MAKS_POZIOM_BRUDU = 3
/** Rodzaje brudu zawsze widoczne w rozwinietej karcie (makieta); pozostale z `normy.brud` dodaje link pod lista. */
const BRUD_PODSTAWOWY = Object.freeze(['kurz', 'tluszcz', 'kamien', 'plesn'])
const NAZWA_ANEKSU = 'Aneks kuchenny'
/** @type {Readonly<Record<string, string>>} */
const NAZWY_DOMYSLNE = Object.freeze({
  pokoj: 'Pokój', przedpokoj: 'Przedpokój', kuchnia: 'Kuchnia', lazienka: 'Łazienka', biuro: 'Biuro', sala: 'Sala',
  kuchnia_socjalna: 'Kuchnia socjalna', toaleta: 'Toaleta', korytarz: 'Korytarz',
})

/** @param {WejscieWyceny} wejscie @param {number} indeks */
function sprawdzIndeks(wejscie, indeks) {
  const pomieszczenia = wejscie.pomieszczenia ?? []
  if (!Number.isInteger(indeks) || indeks < 0 || indeks >= pomieszczenia.length) {
    throw new BladWejscia('nieznane_pomieszczenie', `Nie ma pomieszczenia nr ${indeks}`)
  }
  return pomieszczenia
}

/**
 * @param {WejscieWyceny} wejscie @param {number} indeks
 * @param {(p: PomieszczenieWyceny) => PomieszczenieWyceny} fn
 * @returns {WejscieWyceny}
 */
function zmienPomieszczenie(wejscie, indeks, fn) {
  const pomieszczenia = sprawdzIndeks(wejscie, indeks)
  return { ...wejscie, pomieszczenia: pomieszczenia.map((p, i) => (i === indeks ? fn(p) : p)) }
}

/**
 * Nowe pomieszczenie na koncu listy: nazwa domyslna z typu, metraz METRAZ_NOWEGO_POMIESZCZENIA, kurz 1 i reguly `brud_domyslny`
 * uslugi (np. pyl budowlany 2 po remoncie; przy powtorzonym rodzaju brudu wygrywa regula), potem brud z odpowiedzi klienta
 * (np. sierść 1 w pokoju po „tak” o zwierzetach; zastepuje ten sam rodzaj). Typ musi byc z zestawu uslugi.
 * @param {WejscieWyceny} wejscie @param {string} typ @param {Katalog} katalog
 * @param {{ czyAneks?: boolean, brudOdpowiedzi?: readonly RegulaBrudu[] }} [opcje] kuchnia jako aneks (nazwa „Aneks kuchenny”);
 *   brudOdpowiedzi: reguly ze skutkow odpowiedzi wyceny (brudOdpowiedzi z src/kreator/pytania.js)
 * @returns {WejscieWyceny}
 */
export function dodajPomieszczenie(wejscie, typ, katalog, opcje = {}) {
  const usluga = katalog.usluga(wejscie.uslugaId)
  if (usluga.tryb !== 'pomieszczenia' || !usluga.zestaw_pomieszczen) throw new BladWejscia('tryb_uslugi', `Usługa ${usluga.id} nie ma pomieszczeń`)
  if (!katalog.zestaw(usluga.zestaw_pomieszczen).some((n) => n.id === typ)) {
    throw new BladWejscia('nieznane_pomieszczenie', `Typ ${typ} nie należy do zestawu ${usluga.zestaw_pomieszczen}`)
  }
  const brud = [...new Map(brudNowegoPomieszczenia(katalog, usluga.id, typ).map((b) => [b.id, b])).values()]
  const nazwa = typ === 'kuchnia' && opcje.czyAneks ? NAZWA_ANEKSU : NAZWY_DOMYSLNE[typ] ?? typ
  const [nowe] = zPoziomemBrudu([{ typ, nazwa, m2: METRAZ_NOWEGO_POMIESZCZENIA, brud }], opcje.brudOdpowiedzi ?? [])
  return { ...wejscie, pomieszczenia: [...(wejscie.pomieszczenia ?? []), ...(nowe ? [nowe] : [])] }
}

/** @param {WejscieWyceny} wejscie @param {number} indeks @param {string} nazwa @returns {WejscieWyceny} */
export function zmienNazwe(wejscie, indeks, nazwa) {
  const obcieta = typeof nazwa === 'string' ? nazwa.trim() : ''
  if (obcieta.length === 0 || obcieta.length > MAKS_DLUGOSC_NAZWY) {
    throw new BladWejscia('nazwa_pomieszczenia', `Nazwa pomieszczenia ma mieć 1–${MAKS_DLUGOSC_NAZWY} znaków`)
  }
  return zmienPomieszczenie(wejscie, indeks, (p) => ({ ...p, nazwa: obcieta }))
}

/** @param {WejscieWyceny} wejscie @param {number} indeks @returns {WejscieWyceny} */
export function usunPomieszczenie(wejscie, indeks) {
  const pomieszczenia = sprawdzIndeks(wejscie, indeks)
  return { ...wejscie, pomieszczenia: pomieszczenia.filter((_, i) => i !== indeks) }
}

/** @param {WejscieWyceny} wejscie @param {number} indeks @param {number} m2 GRANICE_METRAZU, inaczej BladWejscia `metraz` */
export function ustawMetraz(wejscie, indeks, m2) {
  if (!Number.isFinite(m2) || m2 < GRANICE_METRAZU.min || m2 > GRANICE_METRAZU.max) {
    throw new BladWejscia('metraz', `Metraż pomieszczenia ma być od ${GRANICE_METRAZU.min} do ${GRANICE_METRAZU.max} m², jest ${m2}`)
  }
  return zmienPomieszczenie(wejscie, indeks, (p) => ({ ...p, m2 }))
}

/**
 * Poziom brudu jednego rodzaju w pomieszczeniu: 1–3 ustawia (zmiana zostaje na swoim miejscu listy), 0 usuwa. Rodzaj sprawdza silnik przy przeliczeniu.
 * @param {WejscieWyceny} wejscie @param {number} indeks @param {string} brudId @param {number} poziom
 * @returns {WejscieWyceny}
 */
export function ustawBrud(wejscie, indeks, brudId, poziom) {
  if (!Number.isInteger(poziom) || poziom < 0 || poziom > MAKS_POZIOM_BRUDU) throw new BladWejscia('poziom_brudu', `Nieznany poziom brudu ${poziom}`)
  return zmienPomieszczenie(wejscie, indeks, (p) => {
    const brud = p.brud ?? []
    if (poziom === 0) return { ...p, brud: brud.filter((b) => b.id !== brudId) }
    if (!brud.some((b) => b.id === brudId)) return { ...p, brud: [...brud, { id: brudId, poziom }] }
    return { ...p, brud: brud.map((b) => (b.id === brudId ? { id: brudId, poziom } : b)) }
  })
}

/**
 * Rodzaje brudu w rozwinietej karcie: podstawowe i juz ustawione (w kolejnosci `normy.brud`) oraz pozostale do dodania linkiem.
 * @param {Katalog} katalog @param {PomieszczenieWyceny} pomieszczenie
 * @returns {{ widoczne: Brud[], pozostale: Brud[] }}
 */
export function rodzajeBrudu(katalog, pomieszczenie) {
  const ustawione = new Set((pomieszczenie.brud ?? []).filter((b) => b.poziom > 0).map((b) => b.id))
  const czyWidoczny = (/** @type {Brud} */ b) => BRUD_PODSTAWOWY.includes(b.id) || ustawione.has(b.id)
  return { widoczne: katalog.brud.filter(czyWidoczny), pozostale: katalog.brud.filter((b) => !czyWidoczny(b)) }
}

/**
 * Metraz razem, minuty normowe pomieszczen (z przygotowaniem, mnoznikiem zakresu uslugi albo wariantu biura) i minuty × tempo.
 * @param {WejscieWyceny} wejscie @param {Katalog} katalog @param {number} tempo krotnosc normy (tempoDoWyceny().wartosc)
 * @returns {PodsumowanieZakresu}
 */
export function podsumowanieZakresu(wejscie, katalog, tempo) {
  if (!Number.isFinite(tempo) || tempo <= 0) throw new BladWejscia('tempo', `Tempo musi być liczbą dodatnią, jest ${tempo}`)
  const pomieszczenia = wejscie.pomieszczenia ?? []
  if (pomieszczenia.length === 0) return { m2: 0, minutyNormowe: 0, minutyZTempem: 0 }
  const m2 = pomieszczenia.reduce((suma, p) => suma + p.m2, 0)
  const mnoznik = mnoznikZakresu(katalog.usluga(wejscie.uslugaId), wejscie.wariantId ?? null, m2, katalog)
  const minutyNormowe = minutyPomieszczen(pomieszczenia, mnoznik, katalog)
  return { m2, minutyNormowe, minutyZTempem: minutyNormowe * tempo }
}

/**
 * Dane banera po zamianie szybkiej wyceny: metraz razem, liczba lazienek i kuchnia osobna albo aneks (po nazwie „Aneks kuchenny”).
 * @param {WejscieWyceny} wejscie
 * @returns {OpisPrzeniesienia}
 */
export function opisPrzeniesienia(wejscie) {
  const pomieszczenia = wejscie.pomieszczenia ?? []
  const kuchnia = pomieszczenia.find((p) => p.typ === 'kuchnia')
  return {
    m2: pomieszczenia.reduce((suma, p) => suma + p.m2, 0),
    lazienki: pomieszczenia.filter((p) => p.typ === 'lazienka').length,
    kuchnia: kuchnia ? (kuchnia.nazwa === NAZWA_ANEKSU ? 'aneks' : 'kuchnia') : null,
  }
}
