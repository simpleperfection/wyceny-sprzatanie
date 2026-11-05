// Karty podsumowania wyceny z makiety podsumowanie-wyceny: „Cena dla klienta” (duza kwota w zieleni, znacznik polozenia, pasek
// widelek rynku z mediana i „?”), „Zostaje dla Ciebie” z rozbiciem kosztow, VAT i propozycjami pod „Więcej”, banery ostrzezen
// i arkusz recznej ceny z przeliczeniem przy kazdej zmianie (R7). Liczby daje widokPodsumowania (src/kreator/podsumowanie.js);
// ten modul tylko rysuje. Polozenie na pasku idzie przez wlasciwosc CSS (CSP bez stylow inline).

import { GRANICE_CENY_RECZNEJ, przywrocCeneModelu, ustawCeneReczna } from '../kreator/podsumowanie.js'
import { bladZakresu, czas, kwotaJednostki, miejscownikWojewodztwa, parsujLiczbe, procent, tekstLiczby, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, karta, podpowiedz, wiecej } from '../ui/komponenty/uklad.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {Pick<import('../dane/wyceny.js').WojewodztwoMigawki, 'id' | 'nazwa'>} WojewodztwoRynku id null = srednia krajowa */
/** @typedef {import('../kreator/podsumowanie.js').Podsumowanie} Podsumowanie */
/** @typedef {import('../kreator/podsumowanie.js').CenaPodsumowania} CenaPodsumowania */
/** @typedef {import('../kreator/podsumowanie.js').RynekPodsumowania} RynekPodsumowania */
/** @typedef {import('../kreator/podsumowanie.js').WierszKosztu} WierszKosztu */
/** @typedef {import('../kreator/podsumowanie.js').Ostrzezenie} Ostrzezenie */
/** @typedef {import('../ui/komponenty/uklad.js').StanWiecej} StanWiecej */
/**
 * @typedef {{ kontekst: DaneAplikacji, id: string, brutto: number, naZmiane: (w: Wycena) => void, naZamkniecie: () => void,
 *   tekstBledu: (blad: unknown) => string }} OpcjeEdycjiCeny
 */

const ZNACZNIKI = Object.freeze({ ponizej: 'poniżej widełek rynku', w: 'w widełkach rynku', powyzej: 'powyżej widełek rynku' })
const NIEPELNE_WIDELKI = 'Część pozycji nie ma danych o widełkach.'
const NOWE_DANE = 'Dane rynkowe zmieniły się od zapisania tej wyceny.'
const OFERTA_NIEAKTUALNA = 'Wycena zmieniła się po wysłaniu oferty. Klient ma jej wcześniejszą wersję.'
/** Margines skali paska po obu stronach (ulamek rozpietosci), zeby znaczniki na koncach nie wychodzily poza pasek. */
const MARGINES_SKALI = 0.1
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

/** @param {number} ulamek polozenie na pasku (0–1) @returns {string} np. „42%” */
const procentCss = (ulamek) => `${ulamek * PROCENT}%`

/** Polozenie przez wlasciwosc CSS `--pozycja`. @param {HTMLElement} element @param {number} ulamek @returns {HTMLElement} */
function naPozycji(element, ulamek) {
  element.style.setProperty('--pozycja', procentCss(ulamek))
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

/**
 * @param {RynekPodsumowania} rynek @param {WojewodztwoRynku} wojewodztwo
 * @returns {string[]} akapity arkusza „Mediana rynku”
 */
export function wyjasnienieMediany(rynek, { id, nazwa }) {
  const gdzie = id === null ? 'w Polsce' : `w ${miejscownikWojewodztwa(nazwa)}`
  return [
    `Środkowa cena z cenników firm ${gdzie}: połowa firm bierze mniej, połowa więcej.`,
    `Pasek pokazuje, ile za takie sprzątanie biorą firmy: od ${zl(rynek.od)} do ${zl(rynek.do)}.`,
    `Twoja cena względem mediany: ${procent(rynek.procent)}.`,
    ...(rynek.pelne ? [] : [NIEPELNE_WIDELKI]),
  ]
}

/**
 * Pasek widelek ze znacznikiem ceny (ozdobny, liczby sa pod nim tekstem) i mediana z wyjasnieniem pod „?”.
 * @param {RynekPodsumowania} rynek @param {number} brutto @param {WojewodztwoRynku} wojewodztwo
 * @returns {HTMLElement}
 */
function pasekRynku(rynek, brutto, wojewodztwo) {
  const pozycja = skalaPaska(rynek, brutto)
  const zakres = naPozycji(h('div', { class: 'wykres-rynku__zakres' }), pozycja(rynek.od))
  zakres.style.setProperty('--koniec', procentCss(pozycja(rynek.do)))
  return h('div', { class: 'karta-rynku' },
    h('div', { class: 'wykres-rynku', 'aria-hidden': 'true' },
      h('div', { class: 'wykres-rynku__tor' }),
      zakres,
      naPozycji(h('div', { class: 'wykres-rynku__kreska' }), pozycja(rynek.mediana)),
      naPozycji(h('div', { class: 'wykres-rynku__punkt' }), pozycja(brutto))),
    h('p', { class: 'karta-rynku__zakres liczba' }, h('span', null, `rynek od ${zl(rynek.od)}`), ' ', h('span', null, `do ${zl(rynek.do)}`)),
    h('div', { class: 'karta-rynku__mediana' }, h('span', { class: 'liczba' }, `Mediana rynku ${zl(rynek.mediana)}`),
      podpowiedz({ tytul: 'Mediana rynku', tresc: wyjasnienieMediany(rynek, wojewodztwo) })))
}

/**
 * @param {Podsumowanie} widok @param {WojewodztwoRynku} wojewodztwo
 * @param {(() => void) | null} naZmien null = bez „Zmień” (wycena ze zleceniem)
 * @returns {HTMLElement}
 */
export function kartaCeny({ cena, rynek, abonament }, wojewodztwo, naZmien) {
  const zmien = naZmien ? przycisk({ tekst: 'Zmień', rodzaj: 'tekstowy', ikona: 'pencil', naKlik: naZmien }) : null
  zmien?.setAttribute('data-akcja', 'zmien')
  return karta({ klasa: 'karta-ceny' },
    h('div', { class: 'karta-ceny__gora' }, h('h2', { class: 'karta-ceny__tytul' }, 'Cena dla klienta'), zmien),
    h('div', { class: 'karta-ceny__kwota' },
      h('span', { class: 'karta-ceny__liczba liczba' }, zl(cena.brutto)),
      abonament ? h('span', { class: 'podsumowanie__opis' }, 'za wizytę') : null,
      h('span', { class: ['pigulka', `pigulka--rynek-${rynek.polozenie}`] }, ZNACZNIKI[rynek.polozenie])),
    miesiecznie(abonament, abonament?.miesiecznie ?? 0),
    cena.minimum === null ? null : h('p', { class: 'podsumowanie__opis', 'data-pole': 'minimum' }, tekstMinimum(cena.minimum)),
    pasekRynku(rynek, cena.brutto, wojewodztwo))
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
const tabelaKosztow = (wiersze) => h('dl', { class: 'koszty' }, wiersze.map((w) => h('div', { class: ['koszty__wiersz', w.rodzaj === 'zostaje' && 'koszty__wiersz--razem'] },
  h('dt', null, etykietaKosztu(w)),
  h('dd', { class: 'liczba' }, w.rodzaj === 'cena' || w.rodzaj === 'zostaje' ? zl(w.kwota) : koszt(w.kwota)))))

/** @param {Podsumowanie['propozycje']} propozycje @returns {HTMLElement | null} */
const notkaPropozycji = (propozycje) => (propozycje
  ? h('p', { class: 'podsumowanie__opis' }, `Do zaproponowania w ofercie: ${propozycje.opisy.map(zMalej).join(', ')} +${zl(propozycje.kwota)}`)
  : null)

/**
 * Zdanie „Zostaje dla Ciebie” na wierzchu; czas pracy, koszty, rozbicie ceny z VAT i propozycje pod „Więcej” (R9).
 * @param {Podsumowanie} widok @param {StanWiecej} stanWiecej
 * @returns {HTMLElement}
 */
export function kartaZostaje({ zostaje, abonament, cena, koszty, propozycje }, stanWiecej) {
  const szczegoly = wiecej({ stan: stanWiecej },
    h('p', { class: 'podsumowanie__opis liczba' }, `Czas pracy: ${czas(zostaje.minutyWlasne)} (tempo ${tekstLiczby(zostaje.tempo)}×)`),
    tabelaKosztow(koszty),
    h('p', { class: 'podsumowanie__opis liczba' }, opisCeny(cena)),
    notkaPropozycji(propozycje))
  return karta({ klasa: 'karta-zostaje' },
    h('p', { class: 'liczba' }, h('strong', null, `Zostaje dla Ciebie ${zl(zostaje.kwota)}`), `, czyli ${zl(zostaje.naGodzine)} za godzinę pracy.`),
    miesiecznie(abonament, abonament?.zostajeMiesiecznie ?? 0),
    szczegoly)
}

/**
 * @param {Ostrzezenie[]} ostrzezenia @param {(() => void) | null} naPrzelicz null = bez „Przelicz” (wycena ze zleceniem)
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
