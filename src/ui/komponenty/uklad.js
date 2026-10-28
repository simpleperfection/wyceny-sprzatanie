// Komponenty ukladu z makiet wariantu B: grafitowy naglowek, karta, baner, pasek postepu kreatora, wiersz listy,
// dolny pasek nawigacji z arkuszem „+”, arkusz od dolu (natywny <dialog>) i dialog potwierdzenia.

import { h, ikona } from '../h.js'
import { sciezka } from '../trasy.js'

/** @typedef {import('../ikony.js').NazwaIkony} NazwaIkony */
/** @typedef {import('../h.js').Dzieci} Dzieci */
/**
 * @typedef {{ tytul: string, podtytul?: string, wstecz?: string, czyDuzy?: boolean }} OpcjeNaglowka
 * @typedef {{ tekst: string, adres?: string, naKlik?: () => void }} Akcja
 * @typedef {{ rodzaj: 'uwaga' | 'info' | 'blad' | 'sukces', tekst: string, akcja?: Akcja }} OpcjeBanera
 * @typedef {{ tytul: string, opis?: string, wartosc?: string, adres?: string, naKlik?: () => void, awatar?: string,
 *   ikona?: NazwaIkony, dodatek?: Node }} OpcjeWiersza
 * @typedef {'start' | 'wyceny' | 'chemia' | 'ustawienia'} PozycjaPaska
 * @typedef {{ tytul: string, tresc: string, potwierdz: string, anuluj?: string, czyNiebezpieczne?: boolean }} OpcjeDialogu
 */

/** @type {readonly { trasa: PozycjaPaska, tekst: string, ikona: NazwaIkony }[]} */
const POZYCJE_PASKA = Object.freeze([
  { trasa: 'start', tekst: 'Start', ikona: 'home' },
  { trasa: 'wyceny', tekst: 'Wyceny', ikona: 'file-text' },
  { trasa: 'chemia', tekst: 'Chemia', ikona: 'flask' },
  { trasa: 'ustawienia', tekst: 'Firma', ikona: 'briefcase' },
])
const POZYCJI_PRZED_PLUSEM = 2
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

/** @param {OpcjeNaglowka} opcje @returns {HTMLElement} grafitowy pas z tytulem (h1), podtytulem i strzalka wstecz */
export function naglowek({ tytul, podtytul, wstecz, czyDuzy = false }) {
  return h('header', { class: ['naglowek', czyDuzy && 'naglowek--duzy'] },
    h('div', { class: 'naglowek__wiersz' },
      wstecz === undefined ? null : h('a', { class: 'naglowek__wstecz', href: wstecz, 'aria-label': 'Wstecz' }, ikona('arrow-left')),
      h('h1', { class: 'naglowek__tytul' }, tytul)),
    podtytul ? h('p', { class: 'naglowek__podtytul' }, podtytul) : null)
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

/** @param {string} adres @param {NazwaIkony} nazwaIkony @param {string} tytul @param {string} opis */
function opcjaArkusza(adres, nazwaIkony, tytul, opis) {
  return h('a', { class: 'opcja-arkusza', href: adres, on: { click: zamykaDialog() } },
    ikona(nazwaIkony, 'opcja-arkusza__ikona'),
    h('span', { class: 'opcja-arkusza__tresc' },
      h('span', { class: 'opcja-arkusza__tytul' }, tytul),
      h('span', { class: 'opcja-arkusza__opis' }, opis)))
}

/** @param {{ trasa: PozycjaPaska, tekst: string, ikona: NazwaIkony }} pozycja @param {PozycjaPaska | null} aktywna */
function pozycjaPaska(pozycja, aktywna) {
  const czyAktywna = pozycja.trasa === aktywna
  return h('a', { class: ['dolny-pasek__pozycja', czyAktywna && 'dolny-pasek__pozycja--aktywna'], href: sciezka(pozycja.trasa),
    'aria-current': czyAktywna ? 'page' : null }, ikona(pozycja.ikona), h('span', null, pozycja.tekst))
}

/**
 * Dolny pasek ekranow glownych: Start, Wyceny, „+” (arkusz z szybka i dokladna wycena), Chemia, Firma.
 * @param {PozycjaPaska | null} aktywna
 * @returns {HTMLElement}
 */
export function dolnyPasek(aktywna) {
  const wybor = arkusz({ tytul: 'Nowa wycena' },
    opcjaArkusza(sciezka('szybka'), 'bolt', 'Szybka wycena', 'przez telefon, widełki'),
    opcjaArkusza(sciezka('kreator', { krok: 'usluga' }), 'file-text', 'Dokładna wycena', 'pomieszczenia i brud'))
  const plus = h('button', { class: 'dolny-pasek__plus', type: 'button', 'aria-label': 'Nowa wycena', 'aria-haspopup': 'dialog',
    on: { click: () => wybor.showModal() } }, h('span', { class: 'dolny-pasek__kolo' }, ikona('plus')))
  const pozycje = POZYCJE_PASKA.map((pozycja) => pozycjaPaska(pozycja, aktywna))
  return h('nav', { class: 'dolny-pasek', 'aria-label': 'Menu główne' },
    pozycje.slice(0, POZYCJI_PRZED_PLUSEM), plus, pozycje.slice(POZYCJI_PRZED_PLUSEM), wybor)
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
