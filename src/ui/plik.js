// Pliki bez serwera: pobranie tekstu jako pliku (Blob + <a download>) i wybor pliku z urzadzenia (ukryte <input type="file">)
// z limitem rozmiaru, zeby wielki plik nie zamrozil karty przy odczycie i JSON.parse.

import { h } from './h.js'

/** Najwiekszy plik do odczytu: 10 MB (kopia z 5000 wycen to kilka MB). */
export const MAKS_ROZMIAR_PLIKU = 10 * 1024 * 1024
/** Adres obiektu zwalniamy z opoznieniem, bo czesc przegladarek zaczyna pobieranie dopiero po zakonczeniu obslugi klikniecia. */
const ZWOLNIENIE_ADRESU_MS = 40_000

/** Pliku nie da sie odczytac: `za_duzy` (ponad MAKS_ROZMIAR_PLIKU) albo `odczyt` (przegladarka odmowila odczytu). */
export class BladPliku extends Error {
  /**
   * @param {'za_duzy' | 'odczyt'} kod
   * @param {string} komunikat
   * @param {{ cause?: unknown }} [opcje]
   */
  constructor(kod, komunikat, opcje) {
    super(komunikat, opcje)
    this.name = 'BladPliku'
    this.kod = kod
  }
}

/**
 * Zapisuje tekst jako plik w folderze pobranych.
 * @param {string} nazwa np. `wyceny-kopia-2026-10-25.json`
 * @param {string} tresc
 * @param {string} typ typ MIME, np. `application/json`
 */
export function pobierzPlik(nazwa, tresc, typ) {
  const adres = URL.createObjectURL(new Blob([tresc], { type: typ }))
  const link = h('a', { href: adres, download: nazwa, hidden: true })
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(adres), ZWOLNIENIE_ADRESU_MS)
}

/**
 * Tekst pliku wybranego przez uzytkownika; plik ponad limit odrzuca bez czytania.
 * @param {Blob} plik
 * @returns {Promise<string>}
 */
export async function czytajTekst(plik) {
  if (plik.size > MAKS_ROZMIAR_PLIKU) throw new BladPliku('za_duzy', `Plik ma ${plik.size} B, limit ${MAKS_ROZMIAR_PLIKU} B`)
  try {
    return await plik.text()
  } catch (blad) {
    if (blad instanceof DOMException) throw new BladPliku('odczyt', `Nie udało się odczytać pliku: ${blad.name}`, { cause: blad })
    throw blad
  }
}

/**
 * Systemowe okno wyboru pliku; null, gdy uzytkownik je zamknal bez wyboru (zdarzenie `cancel`).
 * @param {string} accept np. `.json,application/json`
 * @returns {Promise<File | null>}
 */
function oknoWyboru(accept) {
  return new Promise((resolve) => {
    const wejscie = h('input', { type: 'file', accept, hidden: true })
    /** @param {File | null} plik */
    const zakoncz = (plik) => {
      wejscie.remove()
      resolve(plik)
    }
    wejscie.addEventListener('change', () => zakoncz(wejscie.files?.[0] ?? null), { once: true })
    wejscie.addEventListener('cancel', () => zakoncz(null), { once: true })
    document.body.append(wejscie)
    wejscie.click()
  })
}

/**
 * Pyta o plik i zwraca jego tekst; null, gdy uzytkownik nic nie wybral.
 * @param {string} accept
 * @returns {Promise<string | null>}
 */
export async function wybierzPlik(accept) {
  const plik = await oknoWyboru(accept)
  return plik === null ? null : czytajTekst(plik)
}
