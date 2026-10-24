// Widelki rynku dla wyceny (R5): od–do tego, ile za ten sam zakres biora firmy na rynku.
// Praca w pomieszczeniach: cena modelu × zakres / mediana punktu kraj[rynek_odniesienie] z data/rynek.json.
// Pozycje, doplaty, material i dodatki „w cenie”: Σ zakresow linii (zakres × wsp × prog × brud × ilosc z cena.js);
// linia bez zakresu wchodzi kwota modelu na obu koncach i oznacza widelki jako niepelne.

import { BladKatalogu } from './bledy.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./katalog.js').Usluga} Usluga */
/** @typedef {import('./cena.js').WynikWyceny} WynikWyceny */
/** @typedef {import('./cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('./cena.js').LiniaWyceny} LiniaWyceny */
/** @typedef {{ od: number, do: number, pelne: boolean }} WidelkiRynku */

const TRYB_POZYCJI = 'pozycje'

/** @param {Usluga} usluga @param {Katalog} katalog @returns {[number, number]} */
function proporcjeRynkuPracy(usluga, katalog) {
  if (!usluga.rynek_odniesienie) throw new BladKatalogu('brak_rynku', `Usługa ${usluga.id} nie ma pola rynek_odniesienie`)
  const { mediana, zakres } = katalog.rynekKraj(usluga.rynek_odniesienie)
  return [zakres[0] / mediana, zakres[1] / mediana]
}

/** @param {LiniaWyceny} linia @param {Usluga} usluga @param {Katalog} katalog @returns {{ od: number, do: number, pelne: boolean }} */
function widelkiLinii(linia, usluga, katalog) {
  if (linia.rodzaj === 'praca') {
    const [od, doProporcji] = proporcjeRynkuPracy(usluga, katalog)
    return { od: linia.kwota * od, do: linia.kwota * doProporcji, pelne: true }
  }
  if (linia.zakres === null) return { od: linia.kwota, do: linia.kwota, pelne: false }
  return { od: linia.zakres[0], do: linia.zakres[1], pelne: true }
}

/**
 * Widelki rynku wyceny. Uslugi z pozycjami dostaja na obu koncach minimum zlecenia (zakres pozycji to cena jednostki,
 * bez minimum firm); uslugi z pomieszczeniami nie, bo zakres z data/rynek.json to ceny calych zlecen. Na koncu dojazd klienta.
 * @param {WynikWyceny} wynik wynik wycenUsluge dla tego samego wejscia
 * @param {WejscieWyceny} wejscie
 * @param {Katalog} katalog
 * @returns {WidelkiRynku}
 */
export function widelkiRynku(wynik, wejscie, katalog) {
  const usluga = katalog.usluga(wejscie.uslugaId)
  let od = 0
  let doKwoty = 0
  let pelne = true
  for (const linia of wynik.linie) {
    const w = widelkiLinii(linia, usluga, katalog)
    od += w.od
    doKwoty += w.do
    pelne &&= w.pelne
  }
  const minimum = usluga.tryb === TRYB_POZYCJI ? wynik.minimum : 0
  return {
    od: Math.max(minimum, od) + wynik.dojazd.kwota,
    do: Math.max(minimum, doKwoty) + wynik.dojazd.kwota,
    pelne,
  }
}
