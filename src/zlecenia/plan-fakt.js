// Plan a fakt wizyt zlecen (R15, R16): krok licznika czasu pracy, sprawdzenie czasu, punkt startu licznika i plan wizyty
// z planu zlecenia oraz lista „plan a fakt” z realna stawka. Logika bez DOM i bez zapisu (czas pracy zapisuje wpiszCzasPracy
// z src/dane/wizyty.js). Tempo planu to `plan.tempo` zlecenia z chwili zaplanowania; koszt i realna stawka licza sie
// z migawki wyceny zlecenia (kosztPrzyTempie z src/kreator/podsumowanie.js), a kolejnosc wpisow — jak w tempie wlasnym.

import { wycena } from '../dane/wyceny.js'
import { MAKS_MINUT_PRACY } from '../dane/zlecenia-ksztalt.js'
import { kosztPrzyTempie } from '../kreator/podsumowanie.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { wpisyTempa } from '../silnik/tempo.js'
import { daneTempa, idWpisuWizyty } from './dane-tempa.js'

/**
 * @typedef {import('../dane/magazyn.js').Stan} Stan
 * @typedef {import('../dane/zlecenia-ksztalt.js').PlanZlecenia} PlanZlecenia
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('../silnik/katalog.js').Katalog} Katalog
 * @typedef {Pick<Stan, 'zlecenia' | 'wyceny' | 'ustawienia'>} StanPlanu
 * @typedef {{ plan: number, tempoPlanu: number, stawkaPlanu: number | null }} PlanWizyty plan: minuty (czas normowy × tempo
 *   planu); stawkaPlanu: zl za godzine pracy przy tempie planu, null bez wyceny z migawka albo gdy migawki nie da sie policzyc
 * @typedef {{ zlecenieId: string, dataPierwotna: string, data: string, uslugaId: string, plan: number, fakt: number,
 *   procent: number, stawka: number | null }} WierszHistorii data: dzien wizyty (przesuniety albo pierwotny); plan i fakt
 *   w minutach; procent: ulamek roznicy wzgledem planu; stawka: realna stawka (zl za godzine faktu), null jak stawkaPlanu
 */

/** Licznik czasu pracy zmienia sie o tyle minut (ustalenie z makiet). */
export const KROK_CZASU = 15
/** Lista „plan a fakt”: tyle najnowszych wpisow. */
const WPISOW_HISTORII = 10

/** @param {number} norma @param {number} tempo @returns {number} plan w pelnych minutach, co najmniej 1 */
const minutyPlanu = (norma, tempo) => Math.max(1, Math.round(norma * tempo))

/** @param {Zlecenie} z @returns {PlanZlecenia} plan z wyceny; zlecenie bez planu → BladWejscia `plan` */
function planZlecenia(z) {
  if (z.plan === null) throw new BladWejscia('plan', `Zlecenie ${z.id} nie ma planu z wyceny`)
  return z.plan
}

/**
 * Zl za godzine pracy, ktore zostaja przy tempie (krotnosc czasu normowego), z migawki wyceny zlecenia. Null, gdy zlecenie nie
 * ma wyceny z migawka albo migawki nie da sie policzyc z biezacym katalogiem (np. pozycja usunieta z danych).
 * @param {Zlecenie} z @param {StanPlanu} stan @param {Katalog} katalog @param {number} tempo
 * @returns {number | null}
 */
function stawkaPrzyTempie(z, stan, katalog, tempo) {
  const w = z.wycenaId === null ? null : wycena(stan, z.wycenaId)
  if (w === null || w.wynik === null) return null
  try {
    return kosztPrzyTempie(w, katalog, tempo, stan.ustawienia).zostajeNaGodzine
  } catch (blad) {
    if (blad instanceof BladWejscia || blad instanceof BladKatalogu) return null
    throw blad
  }
}

/**
 * Czas pracy do sprawdzenia: null albo kod bledu `czas_poza_zakresem` (wymagane > 0 i ≤ MAKS_MINUT_PRACY, czyli doba).
 * @param {number} minuty
 * @returns {null | 'czas_poza_zakresem'}
 */
export function poprawnyCzas(minuty) {
  return Number.isFinite(minuty) && minuty > 0 && minuty <= MAKS_MINUT_PRACY ? null : 'czas_poza_zakresem'
}

/**
 * Punkt startu licznika: plan zlecenia (czas normowy × tempo planu) zaokraglony do KROK_CZASU, w granicach licznika.
 * Zlecenie bez planu daje BladWejscia `plan`.
 * @param {Zlecenie} z
 * @returns {number} minuty
 */
export function czasStartowy(z) {
  const { minutyNormowe, tempo } = planZlecenia(z)
  const zaokraglony = Math.round((minutyNormowe * tempo) / KROK_CZASU) * KROK_CZASU
  return Math.min(MAKS_MINUT_PRACY, Math.max(KROK_CZASU, zaokraglony))
}

/**
 * Plan wizyty niezalezny od czasu faktu: minuty planu, tempo planu i stawka przy tym tempie. Zlecenie bez planu daje
 * BladWejscia `plan`.
 * @param {Zlecenie} z @param {StanPlanu} stan @param {Katalog} katalog
 * @returns {PlanWizyty}
 */
export function planZakonczenia(z, stan, katalog) {
  const { minutyNormowe, tempo } = planZlecenia(z)
  return { plan: minutyPlanu(minutyNormowe, tempo), tempoPlanu: tempo, stawkaPlanu: stawkaPrzyTempie(z, stan, katalog, tempo) }
}

/**
 * Najnowsze wpisy czasu pracy wizyt (od najnowszego, kolejnosc jak wpisyTempa): dzien, usluga, plan z tempa planu zlecenia,
 * fakt, roznica jako ulamek planu i realna stawka (koszt przy tempie fakt / norma). Licza sie wizyty z czasem pracy zlecen
 * z planem (daneTempa).
 * @param {StanPlanu} stan @param {Katalog} katalog
 * @returns {WierszHistorii[]}
 */
export function historiaPlanuIFaktu(stan, katalog) {
  const wpisy = wpisyTempa(daneTempa(stan)).slice(0, WPISOW_HISTORII)
  // WycenaTempa z daneTempa ma id zlecenia, wiec `wycenaId` wpisu silnika to id zlecenia.
  const zlecenia = new Set(wpisy.map((wpis) => wpis.wycenaId))
  /** @type {Map<string, { z: Zlecenie, dataPierwotna: string, fakt: number }>} wizyty z czasem pracy zlecen z listy wpisow */
  const wizyty = new Map()
  for (const z of stan.zlecenia.filter((x) => zlecenia.has(x.id))) {
    for (const [dataPierwotna, w] of Object.entries(z.wizyty)) {
      if (w.minutyPracy !== null) wizyty.set(idWpisuWizyty(z.id, dataPierwotna), { z, dataPierwotna, fakt: w.minutyPracy })
    }
  }
  return wpisy.flatMap((wpis) => {
    const wizyta = wizyty.get(wpis.wykonanieId)
    if (wizyta === undefined || wizyta.z.plan === null) return []
    const { z, dataPierwotna, fakt } = wizyta
    const { minutyNormowe, tempo } = wizyta.z.plan
    const plan = minutyPlanu(minutyNormowe, tempo)
    return [{ zlecenieId: z.id, dataPierwotna, data: wpis.data, uslugaId: wpis.uslugaId, plan, fakt, procent: (fakt - plan) / plan,
      stawka: stawkaPrzyTempie(z, stan, katalog, fakt / minutyNormowe) }]
  })
}
