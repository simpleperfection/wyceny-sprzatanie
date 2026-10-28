// Krok aktualizacji stanu z wersji 1 do 2 (R17, R12): doklada listy klientow i zlecen. Funkcja czysta i calkowita, bez zegara
// i losowych id, bo magazyn aktualizuje stan przy kazdym odczycie i kazdy odczyt ma dac ten sam wynik.
// Przeniesienie klientow z nazw wycen i zlecen z wykonan dopisuje kolejna jednostka planu (IU-6).

/** Wersja schematu po tym kroku. */
const WERSJA_PO_KROKU = 2

/**
 * Stan wersji 1 → stan wersji 2 z pustymi `klienci` i `zlecenia`; wejscia nie zmienia.
 * @param {Record<string, unknown>} stan
 * @returns {Record<string, unknown>}
 */
export function zV1DoV2(stan) {
  return { ...stan, wersja: WERSJA_PO_KROKU, klienci: [], zlecenia: [] }
}
