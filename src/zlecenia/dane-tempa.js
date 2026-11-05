// Dane wlasnego tempa z wizyt zlecen (R15): adapter stanu na ksztalt WycenaTempa silnika tempa (src/silnik/tempo.js), ktory
// zostaje bez zmian. Liczy sie tylko zlecenie z planem z wyceny i jego wizyty z wpisanym czasem pracy. Osobny modul, bo
// korzysta z niego podsumowanie wyceny (src/kreator/podsumowanie.js), z ktorego z kolei liczy koszt src/zlecenia/plan-fakt.js.

import { BladWejscia } from '../silnik/bledy.js'

/**
 * @typedef {import('../dane/magazyn.js').Stan} Stan
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('../silnik/tempo.js').WycenaTempa} WycenaTempa
 * @typedef {import('../silnik/tempo.js').WykonanieTempa} WykonanieTempa
 * @typedef {{ dataPierwotna: string, data: string, zrobiona: number, minuty: number }} WizytaZCzasem zrobiona: ms od epoki,
 *   Infinity dla wizyty bez „Zrobione”
 */

/**
 * Id wpisu tempa wizyty: zlecenie i data pierwotna (klucz wizyty w `zlecenie.wizyty`).
 * @param {string} zlecenieId @param {string} dataPierwotna @returns {string}
 */
export const idWpisuWizyty = (zlecenieId, dataPierwotna) => `${zlecenieId}:${dataPierwotna}`

/**
 * Wczesniejszy dzien wizyty (przesuniety albo pierwotny), w tym samym dniu wczesniej zrobiona, wizyta bez „Zrobione” na koncu.
 * @param {WizytaZCzasem} a @param {WizytaZCzasem} b @returns {number}
 */
function wczesniejsza(a, b) {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1
  if (a.zrobiona !== b.zrobiona) return a.zrobiona < b.zrobiona ? -1 : 1
  return a.dataPierwotna < b.dataPierwotna ? -1 : 1
}

/** @param {string | null} zrobiona chwila ISO z oznaczZrobiona @returns {number} */
const chwilaZrobienia = (zrobiona) => (zrobiona === null ? Number.POSITIVE_INFINITY : Date.parse(zrobiona))

/** @param {Zlecenie} z @returns {WykonanieTempa[]} wizyty z czasem pracy w kolejnosci dni, w tym samym dniu wedlug `zrobiona` */
function wykonaniaZlecenia(z) {
  /** @type {WizytaZCzasem[]} */
  const wizyty = Object.entries(z.wizyty).flatMap(([dataPierwotna, w]) => (w.minutyPracy === null ? []
    : [{ dataPierwotna, data: w.przeniesiona?.data ?? dataPierwotna, zrobiona: chwilaZrobienia(w.zrobiona), minuty: w.minutyPracy }]))
  return wizyty.sort(wczesniejsza).map((w) => ({ id: idWpisuWizyty(z.id, w.dataPierwotna), data: w.data, minuty: w.minuty }))
}

/**
 * Wejscie silnika tempa z zlecen: jeden element na zlecenie z planem z wyceny (minuty normowe i usluga) i co najmniej jedna
 * wizyta z czasem pracy. Zlecenie bez planu (reczne, z wyceny bez migawki) nie liczy sie do tempa (R15).
 * @param {Pick<Stan, 'zlecenia'>} stan
 * @returns {WycenaTempa[]}
 */
export function daneTempa(stan) {
  if (!Array.isArray(stan?.zlecenia)) throw new BladWejscia('zlecenia', 'Zlecenia do tempa muszą być listą')
  return stan.zlecenia.flatMap((z) => {
    // Plan powstaje tylko z wyceny, wiec zlecenie z planem ma usluge z tej wyceny; bez uslugi nie ma tempa uslugi.
    if (z.plan === null || z.uslugaId === null) return []
    const wykonania = wykonaniaZlecenia(z)
    if (wykonania.length === 0) return []
    return [{ id: z.id, wejscie: { uslugaId: z.uslugaId }, wynik: { minutyNormowe: z.plan.minutyNormowe }, wykonania }]
  })
}
