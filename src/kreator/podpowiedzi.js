// Mieszkanie wzorcowe 50 m² (cena i czas normowy z silnika) i podpowiedzi cen uslug na liscie wyboru kreatora.
// Jedno zrodlo metrazu i obliczenia dla ustawien („mieszkanie 50 m² ok. X zł”, tempo pracy) i kreatora; logika bez DOM.

import { BladWejscia } from '../silnik/bledy.js'
import { wycenUsluge } from '../silnik/cena.js'
import { zBrudem } from '../silnik/czas.js'
import { ukladMieszkania } from '../silnik/uklad.js'
import { pozycjeGlowne } from './stan.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/**
 * @typedef {{ rodzaj: 'metraz', m2: number, kwota: number } | { rodzaj: 'za_m2', kwota: number } | { rodzaj: 'warianty' }
 *   | { rodzaj: 'od', kwota: number, jednostka: string }} PodpowiedzCeny podpowiedz ceny uslugi na liscie wyboru
 */

/** Metraz mieszkania wzorcowego w ustawieniach i w podpowiedzi ceny uslug z pomieszczeniami. */
export const METRAZ_WZORCOWY = 50
const USLUGA_WZORCOWA = 'mieszkanie_standard'
/** Punkty rynku z przyrostkiem `_m2` w data/rynek.json to cena za metr (np. po_remoncie_m2), a nie cena calego zlecenia. */
const PRZYROSTEK_RYNKU_ZA_M2 = '_m2'

/**
 * Typowe mieszkanie 50 m² (uklad i brud domyslny uslugi) w wojewodztwie: cena modelu i czas normowy.
 * @param {Katalog} katalog @param {string | null} wojewodztwoId null = srednia krajowa
 * @param {string} [uslugaId] usluga z pomieszczeniami; domyslnie sprzatanie standardowe
 * @returns {{ cena: number, minuty: number }}
 */
export function mieszkanieWzorcowe(katalog, wojewodztwoId, uslugaId = USLUGA_WZORCOWA) {
  const usluga = katalog.usluga(uslugaId)
  const pomieszczenia = zBrudem(ukladMieszkania(METRAZ_WZORCOWY, {}, katalog.uklady), usluga.brud_domyslny)
  const wynik = wycenUsluge({ uslugaId: usluga.id, wojewodztwoId, pomieszczenia }, katalog)
  return { cena: wynik.cena, minuty: wynik.minutyNormowe }
}

/**
 * Podpowiedz ceny na liscie uslug: mieszkanie wzorcowe albo cena za m² z niego, biura — warianty, uslugi z pozycjami —
 * najnizsza cena pozycji glownej × wsp wojewodztwa za jednostke. Kwoty modelu, przed VAT na gorze.
 * @param {Katalog} katalog @param {string} uslugaId @param {string | null} wojewodztwoId
 * @returns {PodpowiedzCeny}
 */
export function podpowiedzCeny(katalog, uslugaId, wojewodztwoId) {
  const usluga = katalog.usluga(uslugaId)
  if ((usluga.warianty ?? []).length > 0) return { rodzaj: 'warianty' }
  if (usluga.tryb === 'pozycje') {
    const [najtansza] = pozycjeGlowne(usluga).sort((a, b) => a.cena - b.cena)
    if (!najtansza) throw new BladWejscia('brak_pozycji', `Usługa ${usluga.id} nie ma pozycji głównej`)
    return { rodzaj: 'od', kwota: najtansza.cena * katalog.wojewodztwo(wojewodztwoId).wsp, jednostka: najtansza.jednostka }
  }
  const { cena } = mieszkanieWzorcowe(katalog, wojewodztwoId, usluga.id)
  if (usluga.rynek_odniesienie?.endsWith(PRZYROSTEK_RYNKU_ZA_M2)) return { rodzaj: 'za_m2', kwota: cena / METRAZ_WZORCOWY }
  return { rodzaj: 'metraz', m2: METRAZ_WZORCOWY, kwota: cena }
}
