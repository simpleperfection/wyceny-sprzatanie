// Karta wyniku szybkiej wyceny (makieta szybka-wycena): „Widełki dla klienta” z zakreslaczem, pigulki z mediana w wojewodztwie,
// rynkiem i „Zostaje…” (R5, swiadome odstepstwo od makiety), cytat tekstu dla klienta i przyciski „Kopiuj tekst” / „Dokładna
// wycena”. Usluga z ogledzinami ma „Orientacyjnie od” i zalecenie ogledzin, pusty zakres i blad — tekst zamiast kwoty.
// Kwoty liczy src/kreator/szybka.js (silnik), karta tylko rysuje.

import { miejscownikWojewodztwa, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, karta } from '../ui/komponenty/uklad.js'

/** @typedef {import('../kreator/szybka.js').StanWyniku} StanWyniku */
/** @typedef {import('../silnik/szybka.js').WynikSzybkiej} WynikSzybkiej */
/**
 * @typedef {{ stan: StanWyniku, czySkopiowano: boolean, naKopiuj: () => void, naDokladna: () => void }} OpcjeKarty
 * @typedef {{ element: HTMLElement, cytat: HTMLElement | null }} KartaWyniku cytat: tekst do zaznaczenia, gdy schowek odmowi
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

/** @param {StanWyniku & { stan: 'wynik' }} stan @returns {{ elementy: (Node | null)[], cytat: HTMLElement }} */
function trescWyniku({ wynik, wojewodztwo }) {
  const cytat = h('q', { class: 'karta-szybkiej__cytat' }, wynik.tekst)
  return {
    cytat,
    elementy: [
      wynik.tryb === 'od' ? null : h('p', { class: 'karta-szybkiej__etykieta' }, 'Widełki dla klienta'),
      h('p', { class: 'karta-szybkiej__kwota liczba' }, h('span', { class: 'zakreslacz' }, tekstKwoty(wynik))),
      wynik.tryb === 'od' ? h('p', { class: 'karta-szybkiej__ogledziny' }, OGLEDZINY) : null,
      h('div', { class: 'karta-szybkiej__pigulki' },
        h('span', { class: 'pigulka liczba' }, tekstMediany(wynik.mediana, wojewodztwo)),
        h('span', { class: 'pigulka liczba' }, tekstRynku(wynik.rynek)),
        h('span', { class: 'pigulka pigulka--zostaje liczba' }, tekstZostaje(wynik.zostaje.naGodzine))),
      cytat,
    ],
  }
}

/** @param {StanWyniku} stan @returns {{ elementy: (Node | null)[], cytat: HTMLElement | null }} */
function tresc(stan) {
  if (stan.stan === 'wynik') return trescWyniku(stan)
  if (stan.stan === 'pusty') return { elementy: [h('p', { class: 'karta-szybkiej__pusto' }, PUSTY_ZAKRES)], cytat: null }
  return { elementy: [baner({ rodzaj: 'blad', tekst: stan.kod === 'metraz' ? BLAD_METRAZU : BLAD_LICZENIA })], cytat: null }
}

/**
 * Karta wyniku z przyciskami („data-akcja” do przywrocenia fokusu po przerysowaniu); bez wyniku (pusty zakres, blad) przyciski
 * sa wylaczone.
 * @param {OpcjeKarty} opcje
 * @returns {KartaWyniku}
 */
export function kartaWyniku({ stan, czySkopiowano, naKopiuj, naDokladna }) {
  const { elementy, cytat } = tresc(stan)
  const czyWylaczony = stan.stan !== 'wynik'
  const kopiuj = przycisk({ tekst: czySkopiowano ? 'Skopiowano' : 'Kopiuj tekst', rodzaj: 'drugi', ikona: czySkopiowano ? 'check' : undefined,
    naKlik: naKopiuj, czyWylaczony })
  const dokladna = przycisk({ tekst: 'Dokładna wycena', naKlik: naDokladna, czyWylaczony })
  kopiuj.dataset.akcja = 'kopiuj'
  dokladna.dataset.akcja = 'dokladna'
  return { element: karta({ klasa: 'karta-szybkiej' }, ...elementy, h('div', { class: 'karta-szybkiej__przyciski' }, kopiuj, dokladna)), cytat }
}
