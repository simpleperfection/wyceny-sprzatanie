// Komponenty ukladu z makiety biało-zielonej (docs/operator/aplikacja-modulowa-makiety.html): bialy naglowek z powrotem
// do ekranu nadrzednego, przelaczniki widokow modulu, karta, baner, pasek postepu kreatora, wiersz listy, „Więcej” i „?”,
// arkusz od dolu (natywny <dialog>) i dialog potwierdzenia. Aplikacja nie ma dolnego paska: modul zmienia sie przez Start.

import { h, ikona } from '../h.js'

/** @typedef {import('../ikony.js').NazwaIkony} NazwaIkony */
/** @typedef {import('../h.js').Dzieci} Dzieci */
/**
 * @typedef {{ tytul: string, podtytul?: string, wstecz?: string, wsteczTekst?: string, czyDuzy?: boolean, krok?: string,
 *   pasek?: Node }} OpcjeNaglowka krok: tekst obok powrotu („Krok 2 z 5”); pasek: pasek postepu nad tytulem
 * @typedef {{ czyOtwarte: boolean, naPrzelacz: (czyOtwarte: boolean) => void }} StanWiecej stan rozwiniecia trzyma ekran, bo tresc
 *   rysuje sie od nowa
 * @typedef {{ tekst: string, adres: string, czyAktywna: boolean }} PozycjaPrzelacznika
 * @typedef {{ tekst: string, adres?: string, naKlik?: () => void }} Akcja
 * @typedef {{ rodzaj: 'uwaga' | 'info' | 'blad' | 'sukces', tekst: string, akcja?: Akcja }} OpcjeBanera
 * @typedef {{ tytul: string, opis?: string, wartosc?: string, adres?: string, naKlik?: () => void, awatar?: string,
 *   ikona?: NazwaIkony, dodatek?: Node }} OpcjeWiersza
 * @typedef {{ tytul: string, tresc: string, potwierdz: string, anuluj?: string, czyNiebezpieczne?: boolean }} OpcjeDialogu
 */

const WIECEJ = 'Więcej'
let licznikId = 0

/**
 * Obsluga klikniecia, ktora zamyka <dialog> z kliknietym elementem.
 * @param {string} [wynik] wartosc `returnValue` dialogu
 * @returns {(zdarzenie: Event) => void}
 */
function zamykaDialog(wynik) {
  return (zdarzenie) => {
    const element = zdarzenie.currentTarget
    if (element instanceof Element) element.closest('dialog')?.close(wynik)
  }
}

/** @param {string} przedrostek @returns {string} id unikalne w dokumencie (aria-labelledby) */
const noweId = (przedrostek) => `${przedrostek}-${++licznikId}`

/**
 * Powrot do ekranu nadrzednego: strzalka z widocznym tekstem (np. „Start”), a bez tekstu sama strzalka z etykieta „Wstecz”.
 * @param {string} adres @param {string} [tekst] @returns {HTMLAnchorElement}
 */
function linkWstecz(adres, tekst) {
  if (tekst === undefined) return h('a', { class: 'naglowek__wstecz', href: adres, 'aria-label': 'Wstecz' }, ikona('chevron-left'))
  return h('a', { class: 'naglowek__wstecz naglowek__wstecz--tekst', href: adres }, ikona('chevron-left'), tekst)
}

/** @param {OpcjeNaglowka} opcje @returns {HTMLElement} bialy naglowek: powrot (i krok) nad tytulem (h1), pod nim podtytul */
export function naglowek({ tytul, podtytul, wstecz, wsteczTekst, czyDuzy = false, krok, pasek }) {
  return h('header', { class: ['naglowek', czyDuzy && 'naglowek--duzy'] },
    wstecz === undefined ? null : h('div', { class: 'naglowek__gora' }, linkWstecz(wstecz, wsteczTekst),
      krok === undefined ? null : h('span', { class: 'naglowek__krok' }, krok)),
    pasek ?? null,
    h('h1', { class: 'naglowek__tytul' }, tytul),
    podtytul ? h('p', { class: 'naglowek__podtytul' }, podtytul) : null)
}

/**
 * Przelaczniki widokow modulu (np. Dzień / Tydzień / Miesiąc) jako linki; aktywny ma `aria-current="page"`.
 * @param {readonly PozycjaPrzelacznika[]} pozycje najwyzej jedna aktywna
 * @param {string} [etykieta] nazwa nawigacji dla czytnika ekranu, np. „Widok kalendarza”
 * @returns {HTMLElement}
 */
export function przelaczniki(pozycje, etykieta) {
  if (pozycje.length === 0) throw new RangeError('Przełączniki bez pozycji')
  const aktywnych = pozycje.filter((pozycja) => pozycja.czyAktywna).length
  if (aktywnych > 1) throw new RangeError(`Aktywne przełączniki: ${aktywnych}`)
  return h('nav', { class: 'przelaczniki', 'aria-label': etykieta },
    pozycje.map(({ tekst, adres, czyAktywna }) =>
      h('a', { class: 'przelaczniki__pozycja', href: adres, 'aria-current': czyAktywna ? 'page' : null }, tekst)))
}

/**
 * @param {{ tytul?: string, klasa?: string }} opcje `klasa` np. `karta--bez-odstepu` dla listy wierszy
 * @param {...Dzieci} dzieci
 * @returns {HTMLDivElement}
 */
export function karta({ tytul, klasa }, ...dzieci) {
  return h('div', { class: ['karta', klasa] }, tytul ? h('h2', { class: 'karta__tytul' }, tytul) : null, ...dzieci)
}

/** @param {Akcja} akcja @param {string} klasa */
function elementAkcji({ tekst, adres, naKlik }, klasa) {
  if (adres !== undefined) return h('a', { class: klasa, href: adres, on: { click: naKlik } }, tekst)
  return h('button', { class: klasa, type: 'button', on: { click: naKlik } }, tekst)
}

/** @param {OpcjeBanera} opcje @returns {HTMLDivElement} blad ogloszony przez `role="alert"`, pozostale przez `role="status"` */
export function baner({ rodzaj, tekst, akcja }) {
  return h('div', { class: ['baner', `baner--${rodzaj}`], role: rodzaj === 'blad' ? 'alert' : 'status' },
    h('span', { class: 'baner__tekst' }, tekst),
    akcja ? elementAkcji(akcja, 'baner__akcja') : null)
}

/**
 * @param {readonly string[]} kroki nazwy krokow, np. Usługa, Zakres, Dodatki, Chemia, Cena
 * @param {number} aktywny indeks biezacego kroku (od 0)
 * @returns {HTMLOListElement}
 */
export function pasekPostepu(kroki, aktywny) {
  if (!Number.isInteger(aktywny) || aktywny < 0 || aktywny >= kroki.length) throw new RangeError(`Krok ${aktywny} poza paskiem postępu`)
  return h('ol', { class: 'postep', 'aria-label': `Krok ${aktywny + 1} z ${kroki.length}` },
    kroki.map((krok, i) => h('li', {
      class: ['postep__krok', i <= aktywny && 'postep__krok--zrobiony', i === aktywny && 'postep__krok--aktywny'],
      'aria-current': i === aktywny ? 'step' : null,
    }, h('span', { class: 'postep__kreska', 'aria-hidden': 'true' }), krok)))
}

/** @param {OpcjeWiersza} opcje @returns {HTMLElement} link (adres), przycisk (naKlik) albo zwykly wiersz listy */
export function wiersz({ tytul, opis, wartosc, adres, naKlik, awatar, ikona: nazwaIkony, dodatek }) {
  const czyAkcja = adres !== undefined || naKlik !== undefined
  const tresc = [
    awatar ? h('span', { class: 'wiersz__awatar', 'aria-hidden': 'true' }, awatar) : null,
    nazwaIkony ? ikona(nazwaIkony, 'wiersz__ikona') : null,
    h('span', { class: 'wiersz__tresc' },
      h('span', { class: 'wiersz__tytul' }, tytul),
      opis ? h('span', { class: 'wiersz__opis' }, opis) : null),
    dodatek ?? null,
    wartosc ? h('span', { class: 'wiersz__wartosc' }, wartosc) : null,
    czyAkcja ? ikona('chevron-right', 'wiersz__strzalka') : null,
  ]
  const klasa = ['wiersz', czyAkcja && 'wiersz--akcja']
  if (adres !== undefined) return h('a', { class: klasa, href: adres, on: { click: naKlik } }, tresc)
  if (naKlik) return h('button', { class: klasa, type: 'button', on: { click: naKlik } }, tresc)
  return h('div', { class: klasa }, tresc)
}

/**
 * Arkusz od dolu ekranu na natywnym <dialog>: `showModal()` trzyma fokus w srodku, Escape i klik w tlo zamykaja,
 * a fokus wraca do elementu, ktory go otworzyl.
 * @param {{ tytul: string }} opcje
 * @param {...Dzieci} dzieci
 * @returns {HTMLDialogElement}
 */
export function arkusz({ tytul }, ...dzieci) {
  const idTytulu = noweId('arkusz')
  const dialog = h('dialog', { class: 'arkusz', 'aria-labelledby': idTytulu },
    h('div', { class: 'arkusz__wnetrze' },
      h('div', { class: 'arkusz__gora' },
        h('h2', { class: 'arkusz__tytul', id: idTytulu }, tytul),
        h('button', { class: 'arkusz__zamknij', type: 'button', 'aria-label': 'Zamknij', on: { click: zamykaDialog() } },
          ikona('x'))),
      ...dzieci))
  dialog.addEventListener('click', (zdarzenie) => {
    if (zdarzenie.target === dialog) dialog.close()
  })
  return dialog
}

/**
 * Rozwiniecie <details> ze stanu ekranu; kazde przelaczenie wraca do ekranu, zeby przetrwalo przerysowanie.
 * @template {HTMLDetailsElement} T @param {T} szczegoly @param {StanWiecej} stan @returns {T}
 */
export function trzymajRozwiniecie(szczegoly, { czyOtwarte, naPrzelacz }) {
  szczegoly.open = czyOtwarte
  szczegoly.addEventListener('toggle', () => naPrzelacz(szczegoly.open))
  return szczegoly
}

/**
 * Wyjasnienia schowane pod „Więcej” (natywne <details>, dziala z klawiatury bez skryptu).
 * @param {{ etykieta?: string, stan?: StanWiecej }} opcje `etykieta` zamiast „Więcej”; `stan`: rozwiniecie trzymane przez ekran
 * @param {...Dzieci} tresc co najmniej jeden element albo tekst
 * @returns {HTMLDetailsElement}
 */
export function wiecej({ etykieta = WIECEJ, stan }, ...tresc) {
  if (tresc.length === 0) throw new RangeError('„Więcej” bez treści')
  const szczegoly = h('details', { class: 'wiecej' },
    h('summary', null, etykieta, ikona('chevron-right', 'wiecej__znak')),
    h('div', { class: 'wiecej__tresc' }, ...tresc))
  return stan ? trzymajRozwiniecie(szczegoly, stan) : szczegoly
}

/**
 * Przycisk „?” z wyjasnieniem w arkuszu od dolu. Arkusz powstaje przy kliknieciu w <body> i znika po zamknieciu.
 * @param {{ tytul: string, tresc: string | readonly string[] }} opcje kazdy tekst `tresc` to osobny akapit
 * @returns {HTMLButtonElement}
 */
export function podpowiedz({ tytul, tresc }) {
  if (tytul.trim() === '') throw new RangeError('Podpowiedź bez tytułu')
  const akapity = typeof tresc === 'string' ? [tresc] : tresc
  const handleOtworz = () => {
    const okno = arkusz({ tytul }, akapity.map((akapit) => h('p', { class: 'arkusz__tekst' }, akapit)))
    okno.addEventListener('close', () => okno.remove())
    document.body.append(okno)
    okno.showModal()
  }
  return h('button', { class: 'podpowiedz', type: 'button', 'aria-label': `Wyjaśnienie: ${tytul}`, 'aria-haspopup': 'dialog',
    on: { click: handleOtworz } }, ikona('help-circle'))
}

/**
 * Pyta o potwierdzenie w modalnym dialogu dodanym do <body>; Escape i „Anuluj” daja false. Przy akcji niebezpiecznej
 * fokus startuje na „Anuluj”.
 * @param {OpcjeDialogu} opcje
 * @returns {Promise<boolean>}
 */
export function dialogPotwierdzenia({ tytul, tresc, potwierdz, anuluj = 'Anuluj', czyNiebezpieczne = false }) {
  const idTytulu = noweId('dialog')
  const idTresci = noweId('dialog-tresc')
  return new Promise((resolve) => {
    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': idTytulu, 'aria-describedby': idTresci },
      h('div', { class: 'dialog__wnetrze' },
        h('h2', { class: 'dialog__tytul', id: idTytulu }, tytul),
        h('p', { class: 'dialog__tresc', id: idTresci }, tresc),
        h('div', { class: 'dialog__przyciski' },
          h('button', { type: 'button', class: 'przycisk przycisk--drugi', autofocus: czyNiebezpieczne,
            on: { click: zamykaDialog('nie') } }, anuluj),
          h('button', { type: 'button', class: ['przycisk', czyNiebezpieczne ? 'przycisk--niebezpieczny' : 'przycisk--glowny'],
            autofocus: !czyNiebezpieczne, on: { click: zamykaDialog('tak') } }, potwierdz))))
    dialog.addEventListener('close', () => {
      dialog.remove()
      resolve(dialog.returnValue === 'tak')
    })
    document.body.append(dialog)
    dialog.showModal()
  })
}
