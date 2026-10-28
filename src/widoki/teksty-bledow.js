// Teksty bledow zapisu ustawien i pol firmy, wspolne dla ekranow startu, kreatora, ustawien i kopii.
// Bez DOM i bez importow z innych widokow, zeby widoki nie zalezaly od siebie nawzajem.

import { BladMagazynu } from '../dane/magazyn.js'
import { BladUstawien } from '../dane/ustawienia.js'

/** Komunikaty pod polami firmy wg kodu walidatora (WALIDATORY_FIRMY w src/dane/ustawienia.js). */
export const TEKSTY_BLEDOW = Object.freeze({
  telefon: 'Wpisz 9 cyfr numeru telefonu.',
  email: 'Wpisz poprawny adres e-mail.',
  nip: 'NIP ma 10 cyfr i poprawną sumę kontrolną.',
})
const BLAD_ZAPISU = 'Nie udało się zapisać zmian. Spróbuj jeszcze raz.'
const BLAD_PELNEJ_PAMIECI = 'Nie udało się zapisać zmian: brak miejsca w pamięci przeglądarki.'
const BLAD_DLUGOSCI = 'Ten tekst jest za długi.'

/**
 * Tekst dla uzytkownika po nieudanym zapisie ustawien; inne bledy niz magazynu i ustawien leca dalej.
 * @param {unknown} blad
 * @returns {string}
 */
export function tekstBleduZapisu(blad) {
  if (blad instanceof BladMagazynu) return blad.kod === 'pelny' ? BLAD_PELNEJ_PAMIECI : BLAD_ZAPISU
  if (!(blad instanceof BladUstawien)) throw blad
  const { kod } = blad
  if (kod === 'telefon' || kod === 'email' || kod === 'nip') return TEKSTY_BLEDOW[kod]
  return kod === 'dlugosc' ? BLAD_DLUGOSCI : BLAD_ZAPISU
}
