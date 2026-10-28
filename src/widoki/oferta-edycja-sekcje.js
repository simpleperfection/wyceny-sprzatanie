// Karty ekranu przygotowania oferty (makieta oferta-edycja): „Twoja firma”, „Klient i termin”, „Zakres prac”, „Dodatki do
// zaproponowania” i „Warunki” z waznoscia oferty, wspolne pomocnicze dla sekcji oferty w ustawieniach (listy punktow, edytory
// zakresu) i wczytanie data/zakresy.json; reguly warunkow (R20) sa w src/oferta/tresc.js. Zapis robi widok przez `zapisz`
// (tekst bledu albo null).

import { dzienLokalny, jestDniem } from '../dane/ksztalt.js'
import { pobierzJson } from '../dane/pobierz.js'
import { warunkiPoEdycji, wczytajZakresy, widoczneWarunki } from '../oferta/tresc.js'
import { BladKatalogu } from '../silnik/bledy.js'
import { data, odmiana, zl } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { baner, karta, wiersz } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { edytorListy, punktyZTekstow } from './edytor-listy.js'
import { otworzArkusz } from './ustawienia-sekcje.js'

/** @typedef {import('../dane/magazyn.js').Firma} Firma */
/** @typedef {import('../dane/magazyn.js').WarunekOferty} WarunekOferty */
/** @typedef {import('../dane/magazyn.js').ZakresUslugi} ZakresUslugi */
/** @typedef {import('../dane/wyceny.js').KlientWyceny} KlientWyceny */
/** @typedef {import('../oferta/tresc.js').LiniaOferty} LiniaOferty */
/** @typedef {import('../oferta/tresc.js').Zakresy} Zakresy */
/** @typedef {import('../ui/ikony.js').NazwaIkony} NazwaIkony */
/**
 * @typedef {{ zakres?: ZakresUslugi | null, warunki?: WarunekOferty[] | null, waznaDo?: string | null, klient?: Partial<KlientWyceny> }}
 *   ZmianaOferty
 * @typedef {(zmiana: ZmianaOferty) => string | null} ZapisOferty tekst bledu zapisu albo null
 * @typedef {{ tekst: string, adres?: string, naKlik?: () => void, klucz?: string }} AkcjaKarty klucz: atrybut data-akcja (fokus)
 * @typedef {{ zakres: ZakresUslugi, czyZmieniony: boolean }} StanZakresu
 * @typedef {{ warunki: readonly WarunekOferty[], szybka: boolean, czyZmienione: boolean, waznaDo: string }} StanWarunkow
 */

const MS_DNIA = 86_400_000
const FORMY_DNI = /** @type {const} */ (['dzień', 'dni', 'dni'])
export const NOTKA_ZAKRESU = 'Zmiana dotyczy tylko tej oferty. Domyślny zakres ustawisz w ustawieniach.'
const WCZYTYWANIE = 'Wczytywanie zakresów prac…'
const BLAD_POLACZENIA = 'Nie udało się wczytać zakresów prac. Sprawdź połączenie z internetem i spróbuj jeszcze raz.'
const BLAD_DANYCH = 'Plik zakresów prac jest niepełny. Odśwież stronę, a jeśli to nie pomoże, zajrzyj tu później.'
const ZLA_DATA = 'Wybierz dzisiejszą albo późniejszą datę.'
const BRAK_PUNKTOW = 'Brak punktów.'

/** @type {Promise<Zakresy> | null} */
let wczytywanieZakresow = null

/**
 * data/zakresy.json wczytany raz na sesje strony; po bledzie nastepne wywolanie probuje od nowa.
 * @param {(sciezka: string) => Promise<unknown>} [pobierz] @returns {Promise<Zakresy>}
 */
export function zakresyAplikacji(pobierz = pobierzJson) {
  wczytywanieZakresow ??= wczytajZakresy(pobierz).catch((blad) => {
    wczytywanieZakresow = null
    throw blad
  })
  return wczytywanieZakresow
}

/**
 * Brak sieci albo limit czasu to stan oczekiwany (bez zgloszenia); zly plik jest zglaszany; inne bledy leca dalej.
 * @param {unknown} blad @returns {string}
 */
export function tekstBleduZakresow(blad) {
  const czyLimit = blad instanceof DOMException && (blad.name === 'TimeoutError' || blad.name === 'AbortError')
  if (czyLimit || blad instanceof TypeError) return BLAD_POLACZENIA
  if (!(blad instanceof BladKatalogu) && !(blad instanceof SyntaxError)) throw blad
  reportError(blad)
  return BLAD_DANYCH
}

/**
 * W `miejsce` stan wczytywania, potem `naDane(zakresy)`; blad daje baner z „Spróbuj jeszcze raz”. Rysuje tylko, gdy widok
 * jest nadal na ekranie (`czyAktualny`), bo wynik przychodzi po await.
 * @param {HTMLElement} miejsce @param {(zakresy: Zakresy) => void} naDane @param {() => boolean} czyAktualny
 * @returns {Promise<void>}
 */
export async function poZakresach(miejsce, naDane, czyAktualny) {
  miejsce.replaceChildren(h('p', { class: 'ladowanie', role: 'status' }, WCZYTYWANIE))
  /** @type {Zakresy} */
  let zakresy
  try {
    zakresy = await zakresyAplikacji()
  } catch (blad) {
    const tekst = tekstBleduZakresow(blad)
    if (czyAktualny()) miejsce.replaceChildren(baner({ rodzaj: 'blad', tekst,
      akcja: { tekst: 'Spróbuj jeszcze raz', naKlik: () => void poZakresach(miejsce, naDane, czyAktualny).catch(reportError) } }))
    return
  }
  if (czyAktualny()) naDane(zakresy)
}

/** @param {string} dzien RRRR-MM-DD @returns {number} */
const dzienUtc = (dzien) => Date.UTC(Number(dzien.slice(0, 4)), Number(dzien.slice(5, 7)) - 1, Number(dzien.slice(8, 10)))

/**
 * @param {string} waznaDo RRRR-MM-DD @param {Date} dzis
 * @returns {string} „7 listopada 2026 (14 dni)”, „(1 dzień)”, „(dziś)” albo „(termin minął)”
 */
export function tekstWaznosci(waznaDo, dzis) {
  const dni = Math.round((dzienUtc(waznaDo) - dzienUtc(dzienLokalny(dzis))) / MS_DNIA)
  const ile = dni < 0 ? 'termin minął' : dni === 0 ? 'dziś' : `${dni} ${odmiana(dni, FORMY_DNI)}`
  return `${data(waznaDo)} (${ile})`
}

/** @param {{ od: number, do: number }} razem @returns {string} „294 zł” albo widelki „250–320 zł” */
export const tekstKwoty = (razem) => (razem.od === razem.do ? zl(razem.od) : `${zl(razem.od).replace(/\s?zł$/u, '')}–${zl(razem.do)}`)

/** @param {string} tytul @param {AkcjaKarty} [akcja] @param {NazwaIkony} [nazwaIkony] @returns {HTMLDivElement} tytul karty z akcja po prawej */
export function naglowekKarty(tytul, akcja, nazwaIkony) {
  const element = akcja ? przycisk({ tekst: akcja.tekst, rodzaj: 'tekstowy', ikona: nazwaIkony, adres: akcja.adres, naKlik: akcja.naKlik }) : null
  if (element && akcja?.klucz) element.dataset.akcja = akcja.klucz
  return h('div', { class: 'karta-oferty__gora' }, h('h2', { class: 'karta__tytul' }, tytul), element)
}

/**
 * @param {readonly string[]} teksty @param {'w-cenie' | 'poza-cena' | 'warunek'} rodzaj znak ✓ (w cenie, warunek) albo ✗ (poza ceną)
 * @param {readonly (string | null)[]} [opisy] drobny opis pod punktem (ten sam indeks)
 * @returns {HTMLElement}
 */
export function listaPunktow(teksty, rodzaj, opisy = []) {
  if (teksty.length === 0) return h('p', { class: 'karta-oferty__pusto' }, BRAK_PUNKTOW)
  return h('ul', { class: ['lista-punktow', `lista-punktow--${rodzaj}`] }, teksty.map((tekst, i) => h('li', { class: 'lista-punktow__punkt' },
    ikona(rodzaj === 'poza-cena' ? 'x' : 'check', 'lista-punktow__znak'),
    h('span', null, tekst, opisy[i] ? h('span', { class: 'lista-punktow__opis' }, opisy[i]) : null))))
}

/** @param {ZakresUslugi} zakres @returns {Node[]} „W cenie” z ✓ i „Poza ceną” z ✗ */
export const widokZakresu = (zakres) => [
  h('h3', { class: 'karta-oferty__podtytul' }, 'W cenie'), listaPunktow(zakres.wchodzi, 'w-cenie'),
  h('h3', { class: 'karta-oferty__podtytul' }, 'Poza ceną'), listaPunktow(zakres.nie_wchodzi, 'poza-cena'),
]

/**
 * Edytory „W cenie” i „Poza ceną”; po kazdej zmianie `naZmiane` dostaje caly zakres bez pustych punktow.
 * @param {string} id przedrostek id pol @param {ZakresUslugi} zakres @param {(zakres: ZakresUslugi) => void} naZmiane
 * @returns {HTMLElement[]}
 */
export function edytoryZakresu(id, zakres, naZmiane) {
  let wchodzi = [...zakres.wchodzi]
  let nieWchodzi = [...zakres.nie_wchodzi]
  return [
    edytorListy({ id: `${id}-wchodzi`, etykieta: 'W cenie', punkty: punktyZTekstow(wchodzi, 'w'), naZmiane: (punkty) => {
      wchodzi = punkty.map((p) => p.tekst)
      naZmiane({ wchodzi, nie_wchodzi: nieWchodzi })
    } }),
    edytorListy({ id: `${id}-poza`, etykieta: 'Poza ceną', punkty: punktyZTekstow(nieWchodzi, 'poza'), naZmiane: (punkty) => {
      nieWchodzi = punkty.map((p) => p.tekst)
      naZmiane({ wchodzi, nie_wchodzi: nieWchodzi })
    } }),
  ]
}

/** @param {HTMLElement} element @param {(Node | null)[]} dzieci dzieci bez pustych miejsc (null) */
const wymienDzieci = (element, dzieci) => element.replaceChildren(...dzieci.filter((d) => d !== null))

/** @param {HTMLElement} miejsce @param {string | null} blad */
const pokazBlad = (miejsce, blad) => miejsce.replaceChildren(...(blad ? [baner({ rodzaj: 'blad', tekst: blad })] : []))

/** @param {Firma} firma @returns {HTMLElement} karta „Twoja firma” (tylko do odczytu) */
export function kartaFirmy(firma) {
  const kontakt = [firma.telefon ? `tel. ${firma.telefon}` : '', firma.email, firma.nip ? `NIP ${firma.nip}` : ''].filter(Boolean).join(' · ')
  return karta({ klasa: 'karta-oferty' }, naglowekKarty('Twoja firma', { tekst: 'Zmień w ustawieniach', adres: sciezka('ustawienia') }),
    firma.nazwa ? h('p', { class: 'karta-oferty__firma' }, firma.nazwa) : null,
    kontakt ? h('p', { class: 'karta-oferty__kontakt' }, kontakt) : null)
}

/**
 * Pole zapisywane po wyjsciu z niego (`change`); blad zapisu pod polem.
 * @param {HTMLElement} element pole z `pole()` albo o tym samym ukladzie @param {(wartosc: string) => ZmianaOferty} zmiana
 * @param {ZapisOferty} zapisz
 */
function zapisujPole(element, zmiana, zapisz) {
  const wejscie = element.querySelector('input')
  if (!wejscie) return element
  wejscie.addEventListener('change', () => ustawBlad(element, zapisz(zmiana(wejscie.value))))
  return element
}

/** @param {KlientWyceny} klient @param {ZapisOferty} zapisz @returns {HTMLElement} karta „Klient i termin” */
export function kartaKlienta(klient, zapisz) {
  const id = 'oferta-termin'
  const termin = h('div', { class: 'pole' },
    h('label', { class: 'pole__etykieta', for: id }, 'Termin (opcjonalnie)'),
    h('input', { type: 'datetime-local', id, name: id, class: 'pole__wejscie', value: klient.termin ?? '', 'aria-describedby': `${id}-blad` }),
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert' }))
  ustawBlad(termin, null)
  return karta({ tytul: 'Klient i termin', klasa: 'karta-oferty' },
    zapisujPole(pole({ id: 'oferta-klient', etykieta: 'Klient', wartosc: klient.nazwa, autocomplete: 'name' }), (nazwa) => ({ klient: { nazwa } }), zapisz),
    zapisujPole(pole({ id: 'oferta-adres', etykieta: 'Adres (opcjonalnie)', wartosc: klient.adres, autocomplete: 'street-address' }),
      (adres) => ({ klient: { adres } }), zapisz),
    zapisujPole(termin, (wartosc) => ({ klient: { termin: wartosc === '' ? null : wartosc } }), zapisz))
}

/**
 * Karta „Zakres prac”: lista albo (po „Edytuj”) edytory zapisujace po kazdej zmianie; notka i „Przywróć domyślny” przy zakresie
 * zmienionym w tej ofercie. `pobierz` czyta swiezy stan.
 * @param {{ pobierz: () => StanZakresu, zapisz: ZapisOferty }} opcje
 * @returns {HTMLElement}
 */
export function kartaZakresu({ pobierz, zapisz }) {
  const element = karta({ klasa: 'karta-oferty' })
  let czyEdycja = false
  const komunikat = h('div', { class: 'karta-oferty__komunikat' })
  const miejscePrzywrocenia = h('div', { class: 'karta-oferty__przywroc' })

  function odswiezPrzywrocenie() {
    miejscePrzywrocenia.replaceChildren(...(pobierz().czyZmieniony ? [przycisk({ tekst: 'Przywróć domyślny', rodzaj: 'tekstowy', naKlik: () => {
      const blad = zapisz({ zakres: null })
      if (blad) return pokazBlad(komunikat, blad)
      czyEdycja = false
      rysuj('[data-akcja="zakres"]')
    } })] : []))
  }

  /** @param {string} [fokus] */
  function rysuj(fokus) {
    const { zakres, czyZmieniony } = pobierz()
    pokazBlad(komunikat, null)
    const naZmiane = (/** @type {ZakresUslugi} */ nowy) => {
      pokazBlad(komunikat, zapisz({ zakres: nowy }))
      odswiezPrzywrocenie()
    }
    wymienDzieci(element, [
      naglowekKarty('Zakres prac', { tekst: czyEdycja ? 'Gotowe' : 'Edytuj', klucz: 'zakres', naKlik: () => {
        czyEdycja = !czyEdycja
        rysuj('[data-akcja="zakres"]')
      } }, czyEdycja ? 'check' : 'pencil'),
      ...(czyEdycja ? edytoryZakresu('oferta-zakres', zakres, naZmiane) : widokZakresu(zakres)),
      komunikat,
      czyEdycja || czyZmieniony ? h('p', { class: 'karta-oferty__notka' }, NOTKA_ZAKRESU) : null,
      miejscePrzywrocenia])
    odswiezPrzywrocenie()
    const cel = fokus ? element.querySelector(fokus) : null
    if (cel instanceof HTMLElement) cel.focus()
  }

  rysuj()
  return element
}

/** @param {readonly LiniaOferty[]} dodatki @returns {HTMLElement | null} karta „Dodatki do zaproponowania”; bez dodatkow — null */
export function kartaDodatkow(dodatki) {
  if (dodatki.length === 0) return null
  return karta({ tytul: 'Dodatki do zaproponowania', klasa: 'karta-oferty' }, h('ul', { class: 'lista-dodatkow' }, dodatki.map((d) =>
    h('li', { class: 'lista-dodatkow__wiersz' }, h('span', null, d.opis), h('span', { class: 'lista-dodatkow__kwota liczba' }, `+${zl(d.kwota)}`)))))
}

/**
 * Arkusz z data waznosci (od dzis); zapis przez `zapisz`, po zamknieciu `naZapis`.
 * @param {string} waznaDo @param {Date} dzis @param {ZapisOferty} zapisz @param {() => void} naZapis
 */
function otworzWaznosc(waznaDo, dzis, zapisz, naZapis) {
  const id = 'oferta-wazna-do'
  const dzien = dzienLokalny(dzis)
  const wejscie = h('input', { type: 'date', id, name: id, class: 'pole__wejscie', value: waznaDo, min: dzien, 'aria-describedby': `${id}-blad` })
  const element = h('div', { class: 'pole' }, h('label', { class: 'pole__etykieta', for: id }, 'Oferta ważna do'), wejscie,
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert' }))
  ustawBlad(element, null)
  otworzArkusz('Oferta ważna do', [element], () => {
    if (wejscie.value === waznaDo) return { czyZamknac: true }
    if (!jestDniem(wejscie.value) || wejscie.value < dzien) {
      ustawBlad(element, ZLA_DATA)
      wejscie.focus()
      return { czyZamknac: false, blad: null }
    }
    const blad = zapisz({ waznaDo: wejscie.value })
    if (blad) return { czyZamknac: false, blad }
    queueMicrotask(naZapis)
    return { czyZamknac: true }
  })
}

/**
 * Karta „Warunki”: lista ✓ albo (po „Edytuj”) edytor warunkow widocznych w tej ofercie, „Przywróć domyślne” przy warunkach
 * zmienionych w tej ofercie i wiersz „Oferta ważna do” z arkuszem daty.
 * @param {{ pobierz: () => StanWarunkow, zapisz: ZapisOferty, dzis: Date }} opcje
 * @returns {HTMLElement}
 */
export function kartaWarunkow({ pobierz, zapisz, dzis }) {
  const element = karta({ klasa: 'karta-oferty' })
  let czyEdycja = false
  const komunikat = h('div', { class: 'karta-oferty__komunikat' })

  /** @param {string} [fokus] */
  function rysuj(fokus) {
    const { warunki, szybka, czyZmienione, waznaDo } = pobierz()
    const widoczne = widoczneWarunki(warunki, szybka)
    pokazBlad(komunikat, null)
    const edytor = () => edytorListy({ id: 'oferta-warunki', etykieta: 'Warunki', wiersze: 2,
      punkty: widoczne.map((w) => ({ id: w.id, tekst: w.tresc })),
      naZmiane: (punkty) => pokazBlad(komunikat, zapisz({ warunki: warunkiPoEdycji(warunki, punkty, szybka) })) })
    const przywroc = () => {
      const blad = zapisz({ warunki: null })
      if (blad) return pokazBlad(komunikat, blad)
      czyEdycja = false
      rysuj('[data-akcja="warunki"]')
    }
    const waznosc = wiersz({ tytul: 'Oferta ważna do', wartosc: tekstWaznosci(waznaDo, dzis),
      naKlik: () => otworzWaznosc(waznaDo, dzis, zapisz, () => rysuj('[data-akcja="waznosc"]')) })
    waznosc.dataset.akcja = 'waznosc'
    wymienDzieci(element, [
      naglowekKarty('Warunki', { tekst: czyEdycja ? 'Gotowe' : 'Edytuj', klucz: 'warunki', naKlik: () => {
        czyEdycja = !czyEdycja
        rysuj('[data-akcja="warunki"]')
      } }, czyEdycja ? 'check' : 'pencil'),
      czyEdycja ? edytor() : listaPunktow(widoczne.map((w) => w.tresc), 'warunek'),
      komunikat,
      czyZmienione && !czyEdycja ? przycisk({ tekst: 'Przywróć domyślne', rodzaj: 'tekstowy', naKlik: przywroc }) : null,
      waznosc])
    const cel = fokus ? element.querySelector(fokus) : null
    if (cel instanceof HTMLElement) cel.focus()
  }

  rysuj()
  return element
}
