// Wspolna walidacja wejscia silnika wyceny: metraz i ilosc (jedno zrodlo progu i kodow bledow dla cena.js, czas.js i uklad.js).

import { BladWejscia } from './bledy.js'

/** Najwiekszy metraz pomieszczenia (i laczny metraz biura) przyjmowany przez silnik. */
const M2_MAKS = 100_000

/**
 * Metraz musi byc liczba z przedzialu (0, M2_MAKS].
 * @param {number} m2
 * @returns {void}
 */
export function sprawdzMetraz(m2) {
  if (!Number.isFinite(m2) || m2 <= 0 || m2 > M2_MAKS) throw new BladWejscia('metraz', `Metraż musi być w przedziale (0, ${M2_MAKS}], jest ${m2}`)
}

/**
 * Ilosc pozycji albo dodatku musi byc skonczona i nieujemna.
 * @param {number} ilosc
 * @returns {void}
 */
export function sprawdzIlosc(ilosc) {
  if (!Number.isFinite(ilosc) || ilosc < 0) throw new BladWejscia('ilosc', `Ilość musi być nieujemna, jest ${ilosc}`)
}
