// Teksty nieudanego zapisu zlecen i wizyt dla widokow (R12, R13, R15, R16). Czyste mapowanie bledow, jedno dla formularza, karty,
// ekranu wizyty i widoku Dzień: BladZlecenia ma tekst ekranu, BladMagazynu tekst z src/widoki/teksty-bledow.js, a inny blad leci dalej.

import { BladZlecenia } from '../dane/zlecenia.js'
import { tekstBleduZapisu } from '../widoki/teksty-bledow.js'

const BLAD_FORMULARZA = 'Nie udało się zapisać zlecenia. Spróbuj jeszcze raz.'
const BLAD_KARTY = 'Nie udało się zapisać tego zlecenia. Spróbuj jeszcze raz.'
const BLAD_WIZYTY = 'Nie udało się zapisać tej wizyty. Spróbuj jeszcze raz.'

/** Odmowy zapisu (stan zmienil sie w innej karcie albo limit), a nie awarie: bez zglaszania bledu. */
const TEKSTY_ODMOW = new Map([
  ['brak_klienta', 'Tego klienta już nie ma. Wybierz innego.'],
  ['brak_wyceny', 'Tej wyceny już nie ma, więc zlecenia nie zapisano.'],
  ['zly_status', 'Ta wycena nie jest już przyjęta, więc zlecenia nie zapisano.'],
  ['za_duzo', 'Masz już najwięcej zleceń, ile można zapisać.'],
])

/** @param {unknown} blad @returns {string | null} tekst odmowy zapisu; inny blad to awaria (null) */
export const tekstOdmowy = (blad) => (blad instanceof BladZlecenia ? TEKSTY_ODMOW.get(blad.kod) ?? null : null)

/** @param {unknown} blad @returns {string} tekst bledu formularza zlecenia: odmowa albo awaria; blad spoza zlecenia i magazynu leci dalej */
export function tekstBleduFormularza(blad) {
  const odmowa = tekstOdmowy(blad)
  if (odmowa !== null) return odmowa
  return blad instanceof BladZlecenia ? BLAD_FORMULARZA : tekstBleduZapisu(blad)
}

/** @param {unknown} blad @returns {string} tekst bledu zapisu na karcie zlecenia; blad spoza zlecenia i magazynu leci dalej */
export const tekstBleduKarty = (blad) => (blad instanceof BladZlecenia ? BLAD_KARTY : tekstBleduZapisu(blad))

/** @param {unknown} blad @returns {string} tekst bledu zapisu wizyty; blad spoza zlecenia i magazynu leci dalej */
export const tekstBleduWizyty = (blad) => (blad instanceof BladZlecenia ? BLAD_WIZYTY : tekstBleduZapisu(blad))
