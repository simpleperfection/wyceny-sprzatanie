// Karty podsumowania wyceny z makiety podsumowanie-wyceny: „Cena dla klienta” (kwota z zakreslaczem, znacznik polozenia, rozbicie,
// VAT), „Twoja cena na tle rynku” (pasek widelek z mediana i znacznikiem ceny), „Zostaje dla Ciebie”, „Koszt zlecenia”, notka
// propozycji, banery ostrzezen i arkusz recznej ceny z przeliczeniem przy kazdej zmianie (R7). Liczby daje widokPodsumowania
// (src/kreator/podsumowanie.js); ten modul tylko rysuje. Polozenie na pasku idzie przez wlasciwosc CSS (CSP bez stylow inline).

import { GRANICE_CENY_RECZNEJ, przywrocCeneModelu, ustawCeneReczna } from '../kreator/podsumowanie.js'
import { bladZakresu, czas, kwotaJednostki, parsujLiczbe, procent, tekstLiczby, zl } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, karta } from '../ui/komponenty/uklad.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/podsumowanie.js').Podsumowanie} Podsumowanie */
/** @typedef {import('../kreator/podsumowanie.js').CenaPodsumowania} CenaPodsumowania */
/** @typedef {import('../kreator/podsumowanie.js').RynekPodsumowania} RynekPodsumowania */
/** @typedef {import('../kreator/podsumowanie.js').WierszKosztu} WierszKosztu */
/** @typedef {import('../kreator/podsumowanie.js').Ostrzezenie} Ostrzezenie */
/**
 * @typedef {{ kontekst: DaneAplikacji, id: string, brutto: number, naZmiane: (w: Wycena) => void, naZamkniecie: () => void,
 *   tekstBledu: (blad: unknown) => string }} OpcjeEdycjiCeny
 */

const ZNACZNIKI = Object.freeze({ ponizej: 'poniżej widełek rynku', w: 'w widełkach rynku', powyzej: 'powyżej widełek rynku' })
const NIEPELNE_WIDELKI = ' (część pozycji bez danych o widełkach)'
const NOWE_DANE = 'Dane rynkowe zmieniły się od zapisania tej wyceny.'
const OFERTA_NIEAKTUALNA = 'Wycena zmieniła się po wysłaniu oferty. Klient ma jej wcześniejszą wersję.'
/** Margines skali paska po obu stronach (ulamek rozpietosci), zeby znaczniki na koncach nie wychodzily poza pasek. */
const MARGINES_SKALI = 0.1
/** Podpis blizej brzegu paska niz ten ulamek wyrownuje sie do brzegu zamiast do srodka, zeby nie wychodzil poza karte. */
const BRZEG_PODPISU = 0.25
const PROCENT = 100

/** @param {number} kwota @returns {string} „−21 zł”; koszt zaokraglony do zera — „0 zł” */
const koszt = (kwota) => (Math.round(kwota) > 0 ? `−${zl(kwota)}` : zl(0))

/** @param {string} tekst @returns {string} „Mycie okien” → „mycie okien”; skrot („AGD”) zostaje */
function zMalej(tekst) {
  const druga = tekst.charAt(1)
  if (druga === '' || druga !== druga.toLocaleLowerCase('pl')) return tekst
  return tekst.charAt(0).toLocaleLowerCase('pl') + tekst.slice(1)
}

/** @param {CenaPodsumowania} cena @returns {string} rozbicie i VAT pod kwota */
function opisCeny(cena) {
  const vat = cena.statusVat === 'zwolniony' ? 'bez VAT (firma zwolniona)'
    : `w tym VAT ${tekstLiczby(cena.stawkaVatProc)}%: ${kwotaJednostki(cena.vat)} · netto ${kwotaJednostki(cena.netto)}`
  const { rozbicie } = cena
  return rozbicie ? `sprzątanie ${zl(rozbicie.uslugi)} + dojazd ${zl(rozbicie.dojazd)} · ${vat}` : vat
}

/** @param {number} minimum minimum zlecenia dla klienta @returns {string} */
const tekstMinimum = (minimum) => `Cena podniesiona do minimum zlecenia: ${zl(minimum)}.`

/** @param {Podsumowanie['abonament']} abonament @param {number} kwota @returns {HTMLElement | null} */
const miesiecznie = (abonament, kwota) => (abonament
  ? h('p', { class: 'podsumowanie__opis liczba' }, `miesięcznie (${tekstLiczby(abonament.wizyt)} wizyt): ${zl(kwota)}`) : null)

/**
 * @param {Podsumowanie} widok @param {(() => void) | null} naZmien null = bez „Zmień” (wycena wykonana)
 * @returns {HTMLElement}
 */
export function kartaCeny({ cena, rynek, abonament }, naZmien) {
  const zmien = naZmien ? przycisk({ tekst: 'Zmień', rodzaj: 'tekstowy', ikona: 'pencil', naKlik: naZmien }) : null
  zmien?.setAttribute('data-akcja', 'zmien')
  return karta({ klasa: 'karta-ceny' },
    h('div', { class: 'karta-ceny__gora' }, h('h2', { class: 'karta-ceny__tytul' }, 'Cena dla klienta'), zmien),
    h('div', { class: 'karta-ceny__kwota' },
      h('span', { class: 'karta-ceny__liczba liczba' }, h('span', { class: 'zakreslacz' }, zl(cena.brutto))),
      abonament ? h('span', { class: 'podsumowanie__opis' }, 'za wizytę') : null,
      h('span', { class: ['pigulka', `pigulka--rynek-${rynek.polozenie}`] }, ZNACZNIKI[rynek.polozenie])),
    miesiecznie(abonament, abonament?.miesiecznie ?? 0),
    h('p', { class: 'podsumowanie__opis' }, opisCeny(cena)),
    cena.minimum === null ? null : h('p', { class: 'podsumowanie__opis', 'data-pole': 'minimum' }, tekstMinimum(cena.minimum)))
}

/** @param {number} ulamek polozenie na pasku (0–1) @returns {string} np. „42%” */
const procentCss = (ulamek) => `${ulamek * PROCENT}%`

/**
 * Polozenie przez wlasciwosc CSS `--pozycja`; `data-brzeg` mowi podpisowi, czy wyrownac sie do lewego albo prawego brzegu.
 * @param {HTMLElement} element @param {number} ulamek @returns {HTMLElement}
 */
function naPozycji(element, ulamek) {
  element.style.setProperty('--pozycja', procentCss(ulamek))
  element.dataset.brzeg = ulamek < BRZEG_PODPISU ? 'lewy' : ulamek > 1 - BRZEG_PODPISU ? 'prawy' : 'srodek'
  return element
}

/** @param {RynekPodsumowania} rynek @param {number} brutto @returns {(kwota: number) => number} polozenie kwoty na pasku (0–1) */
function skalaPaska(rynek, brutto) {
  const min = Math.min(rynek.od, rynek.mediana, brutto)
  const max = Math.max(rynek.do, rynek.mediana, brutto)
  const margines = (max - min) * MARGINES_SKALI || 1
  const poczatek = min - margines
  const rozpietosc = max + margines - poczatek
  return (kwota) => (kwota - poczatek) / rozpietosc
}

/** @param {RynekPodsumowania} rynek @param {number} brutto @returns {HTMLElement} */
export function kartaRynku(rynek, brutto) {
  const pozycja = skalaPaska(rynek, brutto)
  const zakres = naPozycji(h('div', { class: 'wykres-rynku__zakres', 'aria-hidden': 'true' }), pozycja(rynek.od))
  zakres.style.setProperty('--koniec', procentCss(pozycja(rynek.do)))
  return karta({ tytul: 'Twoja cena na tle rynku', klasa: 'karta-rynku' },
    h('div', { class: 'wykres-rynku' },
      naPozycji(h('p', { class: 'wykres-rynku__mediana liczba' }, `mediana ${tekstLiczby(Math.round(rynek.mediana))}`), pozycja(rynek.mediana)),
      h('div', { class: 'wykres-rynku__tor', 'aria-hidden': 'true' }),
      zakres,
      naPozycji(h('div', { class: 'wykres-rynku__kreska', 'aria-hidden': 'true' }), pozycja(rynek.mediana)),
      naPozycji(h('div', { class: 'wykres-rynku__punkt', 'aria-hidden': 'true' }), pozycja(brutto)),
      naPozycji(h('p', { class: 'wykres-rynku__cena liczba' }, `Twoja cena ${tekstLiczby(brutto)} (${procent(rynek.procent)})`), pozycja(brutto))),
    h('p', { class: 'karta-rynku__zakres liczba' },
      h('span', null, `rynek od ${zl(rynek.od)}`), ' ', h('span', null, `do ${zl(rynek.do)}`),
      rynek.pelne ? null : h('span', { class: 'karta-rynku__niepelne' }, NIEPELNE_WIDELKI)))
}

/** @param {Podsumowanie} widok @returns {HTMLElement} */
export function kartaZostaje({ zostaje, abonament }) {
  return karta({ klasa: 'karta-zostaje' },
    h('h2', { class: 'karta-zostaje__tytul' }, 'Zostaje dla Ciebie'),
    h('p', { class: 'karta-zostaje__kwota liczba' }, zl(zostaje.kwota)),
    h('p', { class: 'karta-zostaje__opis liczba' }, ikona('check'),
      h('span', null, `${zl(zostaje.naGodzine)} za godzinę pracy · ${czas(zostaje.minutyWlasne)} (tempo ${tekstLiczby(zostaje.tempo)}×)`)),
    miesiecznie(abonament, abonament?.zostajeMiesiecznie ?? 0))
}

/** @param {WierszKosztu} w @returns {string} */
function etykietaKosztu(w) {
  switch (w.rodzaj) {
    case 'cena': return 'Cena dla klienta'
    case 'vat': return `VAT ${tekstLiczby(w.stawkaVatProc)}%`
    case 'chemia': return w.chemiaH === null ? 'Chemia i materiały' : `Chemia (szacunek ${kwotaJednostki(w.chemiaH)}/h)`
    case 'dojazd': return `Dojazd (${tekstLiczby(w.kmRazem)} km × ${kwotaJednostki(w.stawka)})`
    case 'sprzet': return w.nazwa ? `Sprzęt (${w.nazwa})` : 'Sprzęt'
    default: return 'Zostaje dla Ciebie'
  }
}

/** @param {WierszKosztu[]} wiersze @returns {HTMLElement} */
export function kartaKosztow(wiersze) {
  return karta({ tytul: 'Koszt zlecenia', klasa: 'karta-kosztow' },
    h('dl', { class: 'koszty' }, wiersze.map((w) => h('div', { class: ['koszty__wiersz', w.rodzaj === 'zostaje' && 'koszty__wiersz--razem'] },
      h('dt', null, etykietaKosztu(w)),
      h('dd', { class: 'liczba' }, w.rodzaj === 'cena' || w.rodzaj === 'zostaje' ? zl(w.kwota) : koszt(w.kwota))))))
}

/** @param {Podsumowanie['propozycje']} propozycje @returns {HTMLElement | null} */
export const notkaPropozycji = (propozycje) => (propozycje
  ? h('p', { class: 'podsumowanie__notka' }, `Do zaproponowania w ofercie: ${propozycje.opisy.map(zMalej).join(', ')} +${zl(propozycje.kwota)}`)
  : null)

/**
 * @param {Ostrzezenie[]} ostrzezenia @param {(() => void) | null} naPrzelicz null = bez „Przelicz” (wycena wykonana)
 * @returns {HTMLElement[]}
 */
export function banery(ostrzezenia, naPrzelicz) {
  return ostrzezenia.map((o) => {
    if (o.rodzaj === 'nowe_dane') return baner({ rodzaj: 'uwaga', tekst: NOWE_DANE, akcja: naPrzelicz ? { tekst: 'Przelicz', naKlik: naPrzelicz } : undefined })
    if (o.rodzaj === 'poza_szybka') {
      return baner({ rodzaj: 'uwaga', tekst: `Cena jest poza widełkami podanymi klientowi w szybkiej wycenie (${tekstLiczby(o.od)}–${tekstLiczby(o.do)} zł).` })
    }
    return baner({ rodzaj: 'info', tekst: OFERTA_NIEAKTUALNA })
  })
}

/**
 * Arkusz recznej ceny: kazda poprawna kwota zapisuje sie od razu i przelicza karty (`naZmiane`), zla — blad pod polem.
 * „Przywróć cenę z modelu” wraca do kwoty z migawki. Enter i „Zamknij” zamykaja arkusz.
 * @param {OpcjeEdycjiCeny} opcje
 */
export function otworzEdycjeCeny({ kontekst, id, brutto, naZmiane, naZamkniecie, tekstBledu }) {
  const poleCeny = pole({ id: 'cena-reczna', etykieta: 'Twoja cena dla klienta (zł)', rodzaj: 'liczba', wartosc: tekstLiczby(brutto),
    naZmiane: handleWpis })
  const wejscie = poleCeny.querySelector('input')

  /** @param {() => Wycena} zapis @returns {Wycena | null} */
  function zapisz(zapis) {
    try {
      const w = zapis()
      ustawBlad(poleCeny, null)
      naZmiane(w)
      return w
    } catch (blad) {
      ustawBlad(poleCeny, tekstBledu(blad))
      return null
    }
  }

  /** @param {string} tekst */
  function handleWpis(tekst) {
    const kwota = parsujLiczbe(tekst)
    if (kwota === null || kwota < GRANICE_CENY_RECZNEJ.min || kwota > GRANICE_CENY_RECZNEJ.max) return ustawBlad(poleCeny, bladZakresu(GRANICE_CENY_RECZNEJ))
    zapisz(() => ustawCeneReczna(kontekst, id, kwota))
  }

  function handlePrzywroc() {
    const w = zapisz(() => przywrocCeneModelu(kontekst, id))
    if (w?.wynik && wejscie) wejscie.value = tekstLiczby(w.wynik.cena)
  }

  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true }, poleCeny,
    przycisk({ tekst: 'Przywróć cenę z modelu', rodzaj: 'drugi', naKlik: handlePrzywroc }))
  const dialog = arkusz({ tytul: 'Cena dla klienta' }, formularz)
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    dialog.close()
  })
  dialog.addEventListener('close', () => {
    dialog.remove()
    naZamkniecie()
  })
  document.body.append(dialog)
  dialog.showModal()
  wejscie?.select()
}
