// Karta wyniku szybkiej wyceny (makieta szybka-wycena): „Widełki dla klienta” z duza kwota i „Zostaje…” na wierzchu, bo pomaga
// w decyzji, a mediana w wojewodztwie, rynek i tekst dla klienta pod „Więcej”; pod nimi „Dokładna wycena” (glowna akcja) i „Kopiuj
// tekst”. Usluga z ogledzinami ma „Orientacyjnie od” i zalecenie ogledzin, pusty zakres i blad — tekst zamiast kwoty.
// Kwoty liczy src/kreator/szybka.js (silnik), karta tylko rysuje.

import { miejscownikWojewodztwa, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, karta, wiecej } from '../ui/komponenty/uklad.js'

/** @typedef {import('../kreator/szybka.js').StanWyniku} StanWyniku */
/** @typedef {import('../silnik/szybka.js').WynikSzybkiej} WynikSzybkiej */
/**
 * @typedef {{ czyOtwarte: boolean, naPrzelacz: (czyOtwarte: boolean) => void }} StanWiecej stan „Więcej” trzyma ekran, bo karta rysuje sie od nowa
 * @typedef {{ stan: StanWyniku, czySkopiowano: boolean, wiecej: StanWiecej, naKopiuj: () => void, naDokladna: () => void }} OpcjeKarty
 * @typedef {{ cytat: HTMLElement | null, zapasowy: HTMLElement | null }} TekstKlienta cytat: tekst pod „Więcej” do recznego
 *   skopiowania; zapasowy: ten sam tekst poza „Więcej” dla kopiowania przez zaznaczenie, bo zwiniete <details> nie jest rysowane
 * @typedef {TekstKlienta & { element: HTMLElement }} KartaWyniku
 */

const OGLEDZINY = 'Ta usługa wymaga oględzin. Poproś o zdjęcia albo umów się na obejrzenie przed podaniem ceny.'
const PUSTY_ZAKRES = 'Wpisz liczbę pozycji, żeby zobaczyć widełki.'
const BLAD_METRAZU = 'Za mały metraż na kuchnię, przedpokój i łazienki. Zwiększ metraż albo zmniejsz liczbę łazienek.'
const BLAD_LICZENIA = 'Nie udało się policzyć ceny dla tych danych. Wybierz usługę jeszcze raz albo zmień metraż.'
/** Kwota bez waluty jak w zl() (pelne zlote, tysiace z twarda spacja), do zakresow „1 200–1 500 zł” zgodnych z tekstem dla klienta. */
const KWOTA = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0, useGrouping: 'always' })

/** @param {number} od @param {number} doKwoty @returns {string} „250–300 zł” albo „250 zł”, gdy granice sa rowne */
const zakres = (od, doKwoty) => (od === doKwoty ? zl(od) : `${KWOTA.format(od)}–${zl(doKwoty)}`)

/** @param {Pick<WynikSzybkiej, 'tryb' | 'od' | 'do'>} wynik @returns {string} duza kwota: widelki, „ok. X zł” albo „Orientacyjnie od X zł” */
export function tekstKwoty({ tryb, od, do: doKwoty }) {
  if (tryb === 'od') return `Orientacyjnie od ${zl(od)}`
  return tryb === 'ok' ? `ok. ${zl(od)}` : zakres(od, doKwoty)
}

/** @param {number} mediana @param {{ id: string | null, nazwa: string }} wojewodztwo @returns {string} */
export function tekstMediany(mediana, wojewodztwo) {
  if (wojewodztwo.id === null) return `Mediana krajowa: ${zl(mediana)}`
  return `Mediana w ${miejscownikWojewodztwa(wojewodztwo.nazwa)}: ${zl(mediana)}`
}

/** @param {{ od: number, do: number }} rynek @returns {string} „Rynek: 120–450 zł” */
export const tekstRynku = (rynek) => `Rynek: ${zakres(rynek.od, rynek.do)}`

/** @param {{ od: number, do: number }} naGodzine „zostaje dla Ciebie” za godzine na obu koncach @returns {string} „Zostaje ok. 45–52 zł/h” */
export function tekstZostaje(naGodzine) {
  const [od, doKwoty] = [Math.round(naGodzine.od), Math.round(naGodzine.do)]
  return `Zostaje ok. ${od === doKwoty ? KWOTA.format(od) : `${KWOTA.format(od)}–${KWOTA.format(doKwoty)}`} zł/h`
}

/** @param {StanWyniku & { stan: 'wynik' }} stan @param {StanWiecej} stanWiecej @returns {TekstKlienta & { elementy: (Node | null)[] }} */
function trescWyniku({ wynik, wojewodztwo }, { czyOtwarte, naPrzelacz }) {
  const cytat = h('q', { class: 'karta-szybkiej__cytat' }, wynik.tekst)
  const zapasowy = h('p', { class: 'wizualnie-ukryte', 'aria-hidden': 'true' }, wynik.tekst)
  const szczegoly = wiecej({}, h('p', { class: 'liczba' }, tekstMediany(wynik.mediana, wojewodztwo)),
    h('p', { class: 'liczba' }, tekstRynku(wynik.rynek)), cytat)
  szczegoly.open = czyOtwarte
  szczegoly.addEventListener('toggle', () => naPrzelacz(szczegoly.open))
  return {
    cytat,
    zapasowy,
    elementy: [
      wynik.tryb === 'od' ? null : h('p', { class: 'karta-szybkiej__etykieta' }, 'Widełki dla klienta'),
      h('p', { class: 'karta-szybkiej__kwota liczba' }, tekstKwoty(wynik)),
      wynik.tryb === 'od' ? h('p', { class: 'karta-szybkiej__ogledziny' }, OGLEDZINY) : null,
      h('p', { class: 'karta-szybkiej__zostaje liczba' }, tekstZostaje(wynik.zostaje.naGodzine)),
      szczegoly,
      zapasowy,
    ],
  }
}

/** @param {StanWyniku} stan @param {StanWiecej} stanWiecej @returns {TekstKlienta & { elementy: (Node | null)[] }} */
function tresc(stan, stanWiecej) {
  if (stan.stan === 'wynik') return trescWyniku(stan, stanWiecej)
  const brak = { cytat: null, zapasowy: null }
  if (stan.stan === 'pusty') return { ...brak, elementy: [h('p', { class: 'karta-szybkiej__pusto' }, PUSTY_ZAKRES)] }
  return { ...brak, elementy: [baner({ rodzaj: 'blad', tekst: stan.kod === 'metraz' ? BLAD_METRAZU : BLAD_LICZENIA })] }
}

/**
 * Karta wyniku z przyciskami („data-akcja” do przywrocenia fokusu po przerysowaniu); bez wyniku (pusty zakres, blad) przyciski
 * sa wylaczone.
 * @param {OpcjeKarty} opcje
 * @returns {KartaWyniku}
 */
export function kartaWyniku({ stan, czySkopiowano, wiecej: stanWiecej, naKopiuj, naDokladna }) {
  const { elementy, cytat, zapasowy } = tresc(stan, stanWiecej)
  const czyWylaczony = stan.stan !== 'wynik'
  const kopiuj = przycisk({ tekst: czySkopiowano ? 'Skopiowano' : 'Kopiuj tekst', rodzaj: 'drugi', ikona: czySkopiowano ? 'check' : 'copy',
    naKlik: naKopiuj, czyWylaczony })
  const dokladna = przycisk({ tekst: 'Dokładna wycena', naKlik: naDokladna, czyWylaczony })
  kopiuj.dataset.akcja = 'kopiuj'
  dokladna.dataset.akcja = 'dokladna'
  return { element: karta({ klasa: 'karta-szybkiej' }, ...elementy, h('div', { class: 'karta-szybkiej__przyciski' }, dokladna, kopiuj)), cytat, zapasowy }
}
