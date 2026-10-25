// Pobieranie plikow danych z serwera aplikacji (adres wzgledny, bo adres publikacji rozstrzyga etap 6) z limitem czasu.
// Jedno zrodlo dla startu aplikacji (data/ceny.json, normy, rynek, domyslne) i bazy chemii.

import { BladKatalogu } from '../silnik/bledy.js'

/** Limit czasu pobrania jednego pliku danych (ms). */
const LIMIT_POBIERANIA_MS = 10000

/**
 * Plik JSON z serwera aplikacji z limitem czasu; odpowiedz inna niz 2xx daje BladKatalogu `brak_pliku`.
 * @param {string} sciezka
 * @returns {Promise<unknown>}
 */
export async function pobierzJson(sciezka) {
  const odpowiedz = await fetch(sciezka, { signal: AbortSignal.timeout(LIMIT_POBIERANIA_MS) })
  if (!odpowiedz.ok) throw new BladKatalogu('brak_pliku', `${sciezka}: HTTP ${odpowiedz.status}`)
  return odpowiedz.json()
}
