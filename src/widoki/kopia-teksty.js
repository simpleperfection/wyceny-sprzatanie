// Teksty ekranu kopii danych i ekranu ratunkowego (R23): komunikaty bledow wg kodu, ostatnia kopia, chipy podsumowania,
// komunikat po wczytaniu i nazwa pliku z surowymi danymi. Bez DOM, zeby dalo sie je sprawdzic testem w Node.

import { BladKopii } from '../dane/kopia.js'
import { dzienLokalny, jestDataIso, jestObiektem } from '../dane/ksztalt.js'
import { BladMagazynu } from '../dane/magazyn.js'
import { MAKS_WYCEN } from '../dane/wyceny.js'
import { data, dniTemu, FORMY, odmiana, sprawdzDate } from '../ui/format.js'
import { BladPliku, MAKS_ROZMIAR_PLIKU } from '../ui/plik.js'

/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/kopia.js').PodsumowanieKopii} PodsumowanieKopii */

/** Pliki w oknie wyboru: kopie JSON (rozszerzenie dla systemow, ktore nie znaja typu MIME pliku). */
export const PLIKI_KOPII = '.json,application/json'
const BAJTOW_W_MB = 1024 * 1024
/** Komunikaty bledow wczytania kopii wg kodu BladKopii. */
const TEKSTY_BLEDOW_KOPII = Object.freeze({
  zly_plik: 'To nie jest plik kopii tej aplikacji.',
  nowsza_wersja: 'Ta kopia pochodzi z nowszej wersji aplikacji. Odśwież aplikację i spróbuj ponownie.',
  uszkodzony: 'Plik kopii jest uszkodzony.',
  za_duzo_wycen: `Po połączeniu byłoby ponad ${MAKS_WYCEN} wycen. Wczytaj kopię opcją „Zastąp”.`,
})
const BLAD_ZA_DUZEGO_PLIKU = `Ten plik jest za duży na kopię tej aplikacji (ponad ${MAKS_ROZMIAR_PLIKU / BAJTOW_W_MB} MB).`
const BLAD_ODCZYTU = 'Nie udało się odczytać pliku. Spróbuj jeszcze raz.'
const BLAD_PELNEJ_PAMIECI = 'Nie udało się wczytać kopii: brak miejsca w pamięci przeglądarki.'
const BLAD_WCZYTANIA = 'Nie udało się wczytać kopii. Spróbuj jeszcze raz.'
const BEZ_KOPII = 'Nie masz jeszcze kopii.'

/** @param {string} kod @returns {kod is keyof typeof TEKSTY_BLEDOW_KOPII} */
const jestKodemZTekstem = (kod) => Object.hasOwn(TEKSTY_BLEDOW_KOPII, kod)

/**
 * Komunikat dla uzytkownika po nieudanym wczytaniu kopii (odczyt pliku, kontrola kopii, zapis w magazynie).
 * @param {unknown} blad
 * @returns {string}
 */
export function tekstBleduWczytania(blad) {
  if (blad instanceof BladKopii) return jestKodemZTekstem(blad.kod) ? TEKSTY_BLEDOW_KOPII[blad.kod] : BLAD_WCZYTANIA
  if (blad instanceof BladPliku) return blad.kod === 'za_duzy' ? BLAD_ZA_DUZEGO_PLIKU : BLAD_ODCZYTU
  if (blad instanceof BladMagazynu && blad.kod === 'pelny') return BLAD_PELNEJ_PAMIECI
  return BLAD_WCZYTANIA
}

/** Blad spodziewany przy wyborze zlego pliku (bez zgloszenia przez reportError). @param {unknown} blad */
export const jestBledemPliku = (blad) => blad instanceof BladKopii || blad instanceof BladPliku

/**
 * @param {number | null} dni wynik dniOdKopii; ujemne (zegar urzadzenia cofniety po kopii) czytamy jako „dziś”
 * @param {string | null} ostatnia data ostatniej kopii (ISO)
 * @returns {string} „Ostatnia kopia: 15 października 2026 (9 dni temu)” albo „Nie masz jeszcze kopii.”
 */
export function tekstOstatniejKopii(dni, ostatnia) {
  if (dni === null || ostatnia === null) return BEZ_KOPII
  return `Ostatnia kopia: ${data(ostatnia)} (${dniTemu(Math.max(0, dni))})`
}

/**
 * Liczba zlecen to wpisy czasu pracy, nie wyceny przyjete, stad „wykonanych” (decyzja wlasciciela 2026-10-28).
 * @param {PodsumowanieKopii} podsumowanie
 * @returns {string[]} „12 wycen”, „7 wykonanych zleceń”, „ustawienia firmy”
 */
export function etykietyPodsumowania({ wycen, wykonan, czyUstawienia }) {
  const etykiety = [`${wycen} ${odmiana(wycen, FORMY.wycena)}`, `${wykonan} ${odmiana(wykonan, FORMY.wykonaneZlecenie)}`]
  return czyUstawienia ? [...etykiety, 'ustawienia firmy'] : etykiety
}

/**
 * Data utworzenia z pliku, ktory przeszedl odczytajKopie (poprawny JSON z obiektem); null, gdy pole nie jest data.
 * @param {string} tekst
 * @returns {string | null}
 */
function dataUtworzenia(tekst) {
  const plik = JSON.parse(tekst)
  return jestObiektem(plik) && jestDataIso(plik.utworzona) ? plik.utworzona : null
}

/**
 * @param {string} tekst tresc pliku kopii przyjetego przez odczytajKopie
 * @param {Pick<Stan, 'wyceny'>} stanZPliku
 * @returns {string} „Wczytano kopię z 20 października 2026: 3 wyceny.”
 */
export function tekstWczytania(tekst, stanZPliku) {
  const n = stanZPliku.wyceny.length
  const utworzona = dataUtworzenia(tekst)
  const zrodlo = utworzona === null ? 'kopię' : `kopię z ${data(utworzona)}`
  return `Wczytano ${zrodlo}: ${n} ${odmiana(n, FORMY.wycena)}.`
}

/** @param {Date} dzis @returns {string} `wyceny-surowe-RRRR-MM-DD.txt` (dzien lokalny, jak nazwa pliku kopii) */
export function nazwaSurowegoPliku(dzis) {
  return `wyceny-surowe-${dzienLokalny(sprawdzDate(dzis))}.txt`
}

/**
 * Wczytanie kopii pyta o „Połącz” / „Zastąp”, gdy w aplikacji sa wyceny albo ustawienia; pusta aplikacja od razu je zastepuje.
 * @param {Pick<Stan, 'wyceny' | 'ustawienia'>} stan obecny stan aplikacji
 * @returns {boolean}
 */
export function czyPytacOTryb(stan) {
  return stan.wyceny.length > 0 || stan.ustawienia !== null
}
