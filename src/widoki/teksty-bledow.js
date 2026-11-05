// Teksty bledow zapisu ustawien, pol firmy i karty klienta, wspolne dla ekranow startu, kreatora, ustawien, kopii i klientow.
// Bez DOM i bez importow z innych widokow, zeby widoki nie zalezaly od siebie nawzajem.

import { BladKlienta } from '../dane/klienci.js'
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
const BRAK_NAZWY_KLIENTA = 'Wpisz nazwę klienta.'
const BLAD_KLIENTA = 'Nie udało się zapisać klienta. Spróbuj jeszcze raz.'

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

/**
 * Tekst dla uzytkownika po nieudanym zapisie formularza klienta (BladKlienta, BladMagazynu); `pole` bledu mowi formularzowi,
 * pod ktorym polem go pokazac. Inne bledy leca dalej.
 * @param {unknown} blad
 * @returns {{ tekst: string, pole: import('../dane/klienci.js').PoleKlienta | null }}
 */
export function tekstBleduKlienta(blad) {
  if (blad instanceof BladMagazynu) return { tekst: tekstBleduZapisu(blad), pole: null }
  if (!(blad instanceof BladKlienta)) throw blad
  const { kod, pole } = blad
  if (kod === 'pusta_nazwa') return { tekst: BRAK_NAZWY_KLIENTA, pole: 'nazwa' }
  if (kod === 'telefon') return { tekst: TEKSTY_BLEDOW.telefon, pole: 'telefon' }
  if (kod === 'dlugosc') return { tekst: BLAD_DLUGOSCI, pole }
  return { tekst: BLAD_KLIENTA, pole: null }
}
