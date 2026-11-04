// Szkielet ekranow z akcjami zapisu (ekran wizyty i karta zlecenia): zapis jednej akcji z rysowaniem od nowa, fokus i blad w sekcji
// akcji, arkusz od dolu z formularzem i ekran braku. Ekran podaje `rysuj` i `tekstBledu`; po zapisie rysuje sie od nowa, bo
// magazyn.naZmiane zglasza tylko zmiany z innych kart, a fokus wraca do sekcji akcji, bo kliknieta kontrolka znika ze starym ekranem.

import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { arkusz, baner, naglowek } from '../ui/komponenty/uklad.js'
import { adresKalendarza } from '../zlecenia/kalendarz-dane.js'

/**
 * @typedef {import('../ui/h.js').Dzieci} Dzieci
 * @typedef {{ okno: HTMLDialogElement | null, rysuj: (sekcja: string | null, blad?: string | null) => void,
 *   tekstBledu: (blad: unknown) => string }} EkranAkcji okno: otwarty arkusz; rysuj: ekran ze swiezego stanu, ze skutkiem akcji
 * @typedef {{ tytul: string, zapis: string, sekcja: string }} OpcjeArkusza zapis: tekst przycisku; sekcja: miejsce fokusu po zapisie
 * @typedef {(zapis: () => void) => void} ZapisArkusza wykonuje zapis: udany zamyka arkusz, a blad zostaje w nim razem z wartosciami
 */

/**
 * Po narysowaniu: blad w sekcji akcji i fokus na jej pierwszej kontrolce (sekcji juz nie ma: powrot w naglowku).
 * @param {HTMLElement} kontener @param {string | null} sekcja @param {string | null} blad
 */
export function pokazSkutek(kontener, sekcja, blad) {
  if (sekcja === null) return
  const miejsce = kontener.querySelector(`[data-sekcja="${sekcja}"]`)
  if (blad !== null) miejsce?.append(baner({ rodzaj: 'blad', tekst: blad }))
  const cel = miejsce?.matches('a, button') ? miejsce : miejsce?.querySelector('button, a') ?? kontener.querySelector('a')
  if (cel instanceof HTMLElement) cel.focus()
}

/**
 * Zapis jednej akcji i ekran narysowany od nowa; blad zostaje przy akcji, a jej kontrolki dzialaja dalej.
 * @param {EkranAkcji} e @param {string} sekcja @param {() => void} zapis
 */
export function wykonaj(e, sekcja, zapis) {
  try {
    zapis()
  } catch (blad) {
    e.rysuj(sekcja, e.tekstBledu(blad))
    reportError(blad)
    return
  }
  e.rysuj(sekcja)
}

/**
 * Arkusz z formularzem: Enter i przycisk zapisu daja to samo, a `naZapisz` sprawdza pola i woła `zapisz`. Komunikat poprzedniej
 * proby znika przed kazdym zapisem.
 * @param {EkranAkcji} e @param {OpcjeArkusza} opcje @param {Dzieci} pola
 * @param {(zapisz: ZapisArkusza, okno: HTMLDialogElement) => void | Promise<void>} naZapisz
 */
export function otworzArkusz(e, { tytul, zapis, sekcja }, pola, naZapisz) {
  const komunikat = h('div', { class: 'wizyta-ekran__komunikat' })
  /** @type {ZapisArkusza} */
  function zapisz(wykonajZapis) {
    try {
      wykonajZapis()
    } catch (blad) {
      komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst: e.tekstBledu(blad) }))
      reportError(blad)
      return
    }
    okno.close()
    e.rysuj(sekcja)
  }
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true }, pola, komunikat, przycisk({ tekst: zapis, typ: 'submit' }))
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    komunikat.replaceChildren()
    void Promise.resolve(naZapisz(zapisz, okno)).catch(reportError)
  })
  const okno = arkusz({ tytul }, formularz)
  okno.addEventListener('close', () => {
    okno.remove()
    if (e.okno === okno) e.okno = null
  })
  document.body.append(okno)
  e.okno = okno
  okno.showModal()
}

/**
 * Ekran rekordu, ktorego nie ma (zly adres, zlecenie usuniete w innej karcie).
 * @param {string} tytul naglowek ekranu @param {string} tekst @returns {HTMLElement[]}
 */
export function ekranBraku(tytul, tekst) {
  const dzis = adresKalendarza('dzien', null)
  return [naglowek({ tytul, wstecz: dzis, wsteczTekst: 'Zlecenia' }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst, akcja: { tekst: 'Pokaż dzisiejsze wizyty', adres: dzis } }))]
}
