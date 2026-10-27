// Zakonczenie zlecenia (R16, R17, R15): punkt startu licznika czasu, plan a fakt, realna stawka za godzine, tempo przed i po
// zapisie wpisu oraz historia „plan a fakt” do ustawien. Logika bez DOM; zapis wpisu idzie przez dodajWykonanie
// (src/dane/wyceny.js), widoki (src/widoki/zakonczenie.js, ustawienia-tempo.js, podsumowanie.js) tylko rysuja.

import { dzienLokalny } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { BladWyceny, czyAbonament, MAKS_MINUT_WYKONANIA } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { GRANICE_STOSUNKU_TEMPA, MIN_ZLECEN_TEMPA, tempoDoWyceny, tempoWlasne, wpisyTempa } from '../silnik/tempo.js'
import { kosztPrzyTempie } from './podsumowanie.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').MigawkaWyniku} MigawkaWyniku */
/** @typedef {import('../silnik/tempo.js').TempoWlasne} TempoWlasne */
/** @typedef {import('../silnik/tempo.js').TempoWyceny} TempoWyceny */
/**
 * @typedef {{ liczba: number, wymagane: number, tempo: TempoWlasne | null }} InfoTempa liczba: wpisy liczone do tempa (wszystkie
 *   uslugi); tempo: wlasne z zlecen (osobne dla uslugi albo wspolne), null przed MIN_ZLECEN_TEMPA wpisami
 * @typedef {{ przed: TempoWyceny, po: TempoWyceny, info: InfoTempa, osobne: number | null }} TempoZakonczenia osobne: wartosc
 *   pierwszego osobnego tempa uslugi, gdy daje je ten wpis
 * @typedef {{ plan: number, fakt: number, roznica: number, procent: number, tempoPlanu: number, stosunek: number,
 *   czyPozaGranicami: boolean, zostaje: number, stawka: number, stawkaPlanu: number, czyAbonament: boolean, wizyt: number,
 *   tempo: TempoZakonczenia }} WidokZakonczenia minuty: plan, fakt, roznica (fakt − plan); procent: ulamek roznicy wzgledem planu;
 *   stawka i stawkaPlanu: zl za godzine pracy przy tempie faktu i planu; wizyt: wizyty wpisane przed tym zapisem
 * @typedef {{ wycenaId: string, wykonanieId: string, data: string, uslugaId: string, plan: number, fakt: number, procent: number }}
 *   WierszHistorii
 */

/** Licznik czasu pracy zmienia sie o tyle minut (ustalenie z makiet). */
export const KROK_CZASU = 15
/** Lista „plan a fakt” w ustawieniach: tyle najnowszych wpisow. */
const WPISOW_HISTORII = 10
/** Id wpisu podgladu przed zapisem; prawdziwy wpis dostaje id nadane przez ekran. */
const ID_PODGLADU = 'podglad'

/** @param {number} norma @param {number} tempo @returns {number} plan w pelnych minutach, co najmniej 1 */
const minutyPlanu = (norma, tempo) => Math.max(1, Math.round(norma * tempo))

/** @param {Wycena} w @returns {MigawkaWyniku} */
function migawka(w) {
  if (w.wynik === null) throw new BladWyceny('brak_wyniku', `Wycena ${w.id} nie ma policzonej ceny`)
  return w.wynik
}

/** @param {readonly Wycena[]} wyceny @param {DaneAplikacji} kontekst @param {Wycena} w @returns {TempoWyceny} */
function tempoUslugi(wyceny, kontekst, w) {
  return tempoDoWyceny(wczytajStan(kontekst.magazyn).ustawienia, wyceny, w.wejscie.uslugaId, kontekst.domyslne)
}

/**
 * Czas pracy do sprawdzenia: null albo kod bledu `czas_poza_zakresem` (wymagane > 0 i ≤ MAKS_MINUT_WYKONANIA, czyli doba).
 * @param {number} minuty
 * @returns {null | 'czas_poza_zakresem'}
 */
export function poprawnyCzas(minuty) {
  return Number.isFinite(minuty) && minuty > 0 && minuty <= MAKS_MINUT_WYKONANIA ? null : 'czas_poza_zakresem'
}

/**
 * Punkt startu licznika: plan (czas normowy migawki × tempo firmy dla uslugi) zaokraglony do KROK_CZASU, w granicach licznika.
 * @param {Wycena} w @param {DaneAplikacji} kontekst
 * @returns {number} minuty
 */
export function czasStartowy(w, kontekst) {
  const { minutyNormowe } = migawka(w)
  const tempo = tempoUslugi(wczytajStan(kontekst.magazyn).wyceny, kontekst, w)
  const zaokraglony = Math.round((minutyNormowe * tempo.wartosc) / KROK_CZASU) * KROK_CZASU
  return Math.min(MAKS_MINUT_WYKONANIA, Math.max(KROK_CZASU, zaokraglony))
}

/**
 * Stan tempa po zapisie: liczba liczonych wpisow wobec MIN_ZLECEN_TEMPA i tempo wlasne (osobne dla uslugi albo wspolne).
 * @param {readonly Wycena[]} wyceny wyceny razem z nowym wpisem
 * @param {string} uslugaId
 * @returns {InfoTempa}
 */
export function infoTempa(wyceny, uslugaId) {
  const liczba = wpisyTempa(wyceny).filter((w) => w.liczony).length
  return { liczba, wymagane: MIN_ZLECEN_TEMPA, tempo: tempoWlasne(wyceny, uslugaId) }
}

/** @param {readonly Wycena[]} wyceny @param {Wycena} w @param {number} minuty @param {number} tempoPlanu @returns {Wycena[]} */
function zPodgladem(wyceny, w, minuty, tempoPlanu) {
  const wpis = { id: ID_PODGLADU, data: dzienLokalny(new Date()), minuty, tempoPlanu }
  /** @param {Wycena} x */
  const zWpisem = (x) => ({ ...x, wykonania: [...x.wykonania, wpis] })
  return wyceny.some((x) => x.id === w.id) ? wyceny.map((x) => (x.id === w.id ? zWpisem(x) : x)) : [...wyceny, zWpisem(w)]
}

/**
 * @param {readonly Wycena[]} wyceny stan przed zapisem @param {Wycena} w @param {number} minuty @param {DaneAplikacji} kontekst
 * @returns {TempoZakonczenia}
 */
function tempoZakonczenia(wyceny, w, minuty, kontekst) {
  const przed = tempoUslugi(wyceny, kontekst, w)
  const po = zPodgladem(wyceny, w, minuty, przed.wartosc)
  const info = infoTempa(po, w.wejscie.uslugaId)
  const czyPierwszeOsobne = tempoWlasne(wyceny, w.wejscie.uslugaId)?.zakres !== 'usluga' && info.tempo?.zakres === 'usluga'
  return { przed, po: tempoUslugi(po, kontekst, w), info, osobne: czyPierwszeOsobne && info.tempo ? info.tempo.wartosc : null }
}

/**
 * Plan a fakt na biezaco przed zapisem: plan (czas normowy × tempo planu), roznica, realna stawka (koszt przy tempie
 * fakt / norma), stosunek tempa z flaga poza GRANICE_STOSUNKU_TEMPA i tempo przed oraz po zapisie tego wpisu.
 * @param {Wycena} w @param {number} minutyFakt @param {DaneAplikacji} kontekst
 * @returns {WidokZakonczenia}
 */
export function widokZakonczenia(w, minutyFakt, kontekst) {
  if (poprawnyCzas(minutyFakt) !== null) throw new BladWejscia('czas', `Czas pracy poza zakresem (0, ${MAKS_MINUT_WYKONANIA}] min: ${minutyFakt}`)
  const m = migawka(w)
  const tempo = tempoZakonczenia(wczytajStan(kontekst.magazyn).wyceny, w, minutyFakt, kontekst)
  const tempoPlanu = tempo.przed.wartosc
  const plan = minutyPlanu(m.minutyNormowe, tempoPlanu)
  const stosunek = minutyFakt / m.minutyNormowe
  const fakt = kosztPrzyTempie(w, kontekst, stosunek)
  return {
    plan, fakt: minutyFakt, roznica: minutyFakt - plan, procent: (minutyFakt - plan) / plan, tempoPlanu, stosunek,
    czyPozaGranicami: stosunek < GRANICE_STOSUNKU_TEMPA.min || stosunek > GRANICE_STOSUNKU_TEMPA.max,
    zostaje: fakt.zostaje, stawka: fakt.zostajeNaGodzine, stawkaPlanu: kosztPrzyTempie(w, kontekst, tempoPlanu).zostajeNaGodzine,
    czyAbonament: czyAbonament(m), wizyt: w.wykonania.length, tempo,
  }
}

/**
 * Najnowsze wpisy czasu (od najnowszego, kolejnosc jak wpisyTempa): data, usluga, plan z tempa zapisanego przy wpisie, fakt
 * i roznica jako ulamek planu. Wycena bez migawki z czasem normowym nie daje wierszy.
 * @param {readonly Wycena[]} wyceny
 * @returns {WierszHistorii[]}
 */
export function historiaPlanuIFaktu(wyceny) {
  if (!Array.isArray(wyceny)) throw new BladWejscia('wyceny', 'Wyceny do historii muszą być listą')
  /** @type {Map<string, Wycena>} */
  const wgId = new Map(wyceny.map((w) => [w.id, w]))
  return wpisyTempa(wyceny).slice(0, WPISOW_HISTORII).flatMap((wpis) => {
    const w = wgId.get(wpis.wycenaId)
    const wykonanie = w?.wykonania.find((x) => x.id === wpis.wykonanieId)
    if (!w?.wynik || !wykonanie) return []
    const plan = minutyPlanu(w.wynik.minutyNormowe, wykonanie.tempoPlanu)
    return [{ wycenaId: w.id, wykonanieId: wykonanie.id, data: wykonanie.data, uslugaId: wpis.uslugaId, plan, fakt: wykonanie.minuty,
      procent: (wykonanie.minuty - plan) / plan }]
  })
}
