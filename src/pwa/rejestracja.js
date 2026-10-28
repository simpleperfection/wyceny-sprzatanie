// PWA (R28, R23): rejestracja service workera (sw.js) i decyzja o banerze instalacji na iPhonie — aplikacja z ekranu
// poczatkowego iOS ma osobny magazyn od Safari, a Safari usuwa dane strony po 7 dniach bez wizyty.

/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/**
 * @typedef {{ userAgent: string, standalone: boolean, punktyDotyku?: number }} Srodowisko
 * @typedef {{ kontener?: Pick<ServiceWorkerContainer, 'register' | 'ready'>, adresyZasobow?: () => string[],
 *   zglos?: (blad: unknown) => void }} OpcjeRejestracji
 */

const ADRES_WORKERA = './sw.js'
/** Typ komunikatu do sw.js: zapisz w pamieci podrecznej pliki pobrane przed przejeciem strony przez service workera. */
const KOMUNIKAT_ZASOBOW = 'zapisz-zasoby'
const IOS_MOBILNY = /\b(iPhone|iPod|iPad)\b/
const MAC = /\bMacintosh\b/
const SAFARI = /\bVersion\/[\d.]+.*\bSafari\//
const INNA_PRZEGLADARKA_IOS = /\b(CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram)\b/

/** @returns {string[]} adresy plikow wczytanych przez strone (moduly, style, fonty, dane) */
const wczytaneZasoby = () => performance.getEntriesByType('resource').map((wpis) => wpis.name)

/**
 * Rejestruje sw.js i przekazuje mu pliki wczytane przed jego startem, zeby aplikacja dzialala offline od pierwszego
 * uruchomienia. Blad jest tylko zglaszany: aplikacja dziala dalej bez trybu offline.
 * @param {OpcjeRejestracji} [opcje] atrapy do testow
 * @returns {Promise<void>}
 */
export async function zarejestrujServiceWorker(opcje = {}) {
  const { kontener = navigator.serviceWorker, adresyZasobow = wczytaneZasoby, zglos = reportError } = opcje
  if (!kontener) return
  try {
    await kontener.register(ADRES_WORKERA)
    const { active } = await kontener.ready
    active?.postMessage({ typ: KOMUNIKAT_ZASOBOW, adresy: adresyZasobow() })
  } catch (blad) {
    zglos(blad)
  }
}

/**
 * Baner instalacji: iPhone albo iPad (iPadOS w Safari podaje sie jako Macintosh z ekranem dotykowym) w Safari, poza
 * aplikacja z ekranu poczatkowego, gdy uzytkownik go nie zamknal.
 * @param {Srodowisko & { zamknieta: boolean }} opcje
 * @returns {boolean}
 */
export function czyPokazacInstrukcjeIos({ userAgent, standalone, punktyDotyku = 0, zamknieta }) {
  if (typeof userAgent !== 'string') throw new TypeError('userAgent musi być tekstem')
  if (standalone || zamknieta) return false
  const czyUrzadzenieIos = IOS_MOBILNY.test(userAgent) || (MAC.test(userAgent) && punktyDotyku > 1)
  return czyUrzadzenieIos && SAFARI.test(userAgent) && !INNA_PRZEGLADARKA_IOS.test(userAgent)
}

/** @returns {Srodowisko} biezaca przegladarka; `navigator.standalone` ma tylko Safari na iOS */
export function srodowiskoPrzegladarki() {
  const standalone = ('standalone' in navigator && navigator.standalone === true) || matchMedia('(display-mode: standalone)').matches
  return { userAgent: navigator.userAgent, standalone, punktyDotyku: navigator.maxTouchPoints }
}

/** „Rozumiem” na banerze: zapis preferencji w stanie; blad magazynu (np. `pelny`) leci dalej. @param {Magazyn} magazyn @returns {Stan} */
export function zamknijInstrukcjeIos(magazyn) {
  return magazyn.zmien((stan) => ({ ...stan, preferencje: { ...stan.preferencje, iosInstrukcjaZamknieta: true } }))
}
