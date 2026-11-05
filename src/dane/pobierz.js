// Pobieranie plikow danych z serwera aplikacji (adres wzgledny, bo adres publikacji rozstrzyga etap 6) z limitem czasu.
// Jedno zrodlo dla startu aplikacji (data/ceny.json, normy, rynek, domyslne) i bazy chemii.

import { BladKatalogu } from '../silnik/bledy.js'

/** Limit czasu pobrania jednego pliku danych (ms). */
const LIMIT_POBIERANIA_MS = 10000

/**
 * Sygnal przerwania po czasie. `AbortSignal.timeout` ma dopiero Safari 16, a iPhone 7 i starsze zostaja na iOS 15.
 * @param {number} ms
 * @returns {AbortSignal}
 */
export function sygnalLimitu(ms) {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const kontroler = new AbortController()
  setTimeout(() => kontroler.abort(new DOMException('Przekroczono limit czasu', 'TimeoutError')), ms)
  return kontroler.signal
}

/**
 * Plik JSON z serwera aplikacji z limitem czasu; odpowiedz inna niz 2xx daje BladKatalogu `brak_pliku`.
 * @param {string} sciezka
 * @returns {Promise<unknown>}
 */
export async function pobierzJson(sciezka) {
  const odpowiedz = await fetch(sciezka, { signal: sygnalLimitu(LIMIT_POBIERANIA_MS) })
  if (!odpowiedz.ok) throw new BladKatalogu('brak_pliku', `${sciezka}: HTTP ${odpowiedz.status}`)
  return odpowiedz.json()
}
