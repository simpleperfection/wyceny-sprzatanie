// Sekcje oferty w ustawieniach firmy (makieta ustawienia-firmy, faza oferty): „Zakres prac” (lista uslug → arkusz z edytorami
// „W cenie” / „Poza ceną”, zapiszZakres, „Przywróć domyślny”) i „Warunki oferty” (lista ✓, arkusz z edytorem, zapiszWarunki,
// „Przywróć domyślne”). Zmiana obowiazuje w kazdej nowej ofercie; zapis i ponowne narysowanie ekranu robi `wykonaj` widoku.

import { zapiszWarunki, zapiszZakres } from '../dane/ustawienia.js'
import { warunkiPoEdycji, warunkiZrodlowe } from '../oferta/tresc.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { karta, wiersz } from '../ui/komponenty/uklad.js'
import { edytorListy } from './edytor-listy.js'
import { edytoryZakresu, listaPunktow, naglowekKarty, poZakresach } from './oferta-edycja-sekcje.js'
import { fokusPola, otworzArkusz } from './ustawienia-sekcje.js'

/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/magazyn.js').Ustawienia} Ustawienia */
/** @typedef {import('../dane/magazyn.js').WarunekOferty} WarunekOferty */
/** @typedef {import('../dane/magazyn.js').ZakresUslugi} ZakresUslugi */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/** @typedef {import('./edytor-listy.js').Punkt} Punkt */
/**
 * @typedef {{ ustawienia: Ustawienia, katalog: Katalog, domyslne: Domyslne, magazyn: Magazyn,
 *   wykonaj: (operacja: () => unknown, fokus?: string) => string | null }} DaneOfertyUstawien
 *   `wykonaj` zapisuje (operacja), zwraca tekst bledu albo null i rysuje ekran od nowa z fokusem na selektorze `fokus`
 */

const ZMIENIONY = 'zmieniony'
const DOMYSLNY = 'domyślny'
const TYLKO_SZYBKA = 'tylko przy szybkiej wycenie'
const AKCJA_WARUNKOW = '[data-akcja="warunki-ustawien"]'
const PUSTY_ZAKRES = Object.freeze({ wchodzi: [], nie_wchodzi: [] })

/** @param {string} uslugaId */
const kluczZakresu = (uslugaId) => `zakres-${uslugaId}`

/**
 * Arkusz zakresu uslugi: zapisany w ustawieniach od razu, domyslny po wczytaniu data/zakresy.json; „Zapisz” zapisuje zmiany,
 * „Przywróć domyślny” (przy zakresie zmienionym w ustawieniach) wraca do data/zakresy.json.
 * @param {DaneOfertyUstawien} dane @param {Usluga} usluga
 */
function otworzZakres(dane, usluga) {
  const { magazyn, domyslne } = dane
  const fokus = fokusPola(kluczZakresu(usluga.id))
  const zapisany = dane.ustawienia.zakresy[usluga.id]
  const miejsce = h('div', { class: 'ustawienia-oferta__edytory' })
  /** @type {ZakresUslugi | null} */
  let zmieniony = null
  let czyOtwarty = true
  /** @param {ZakresUslugi} zakres */
  const pokazEdytory = (zakres) => miejsce.replaceChildren(...edytoryZakresu(`ustawienia-zakres-${usluga.id}`, zakres, (nowy) => { zmieniony = nowy }))
  const przywroc = zapisany ? przycisk({ tekst: 'Przywróć domyślny', rodzaj: 'tekstowy', naKlik: () => {
    if (dane.wykonaj(() => zapiszZakres(magazyn, usluga.id, null, domyslne), fokus) === null) miejsce.closest('dialog')?.close()
  } }) : null
  otworzArkusz(`Zakres prac: ${usluga.nazwa}`, [miejsce, przywroc].filter((x) => x !== null), () => {
    if (zmieniony === null) return { czyZamknac: true }
    const zakres = zmieniony
    const blad = dane.wykonaj(() => zapiszZakres(magazyn, usluga.id, zakres, domyslne), fokus)
    return blad === null ? { czyZamknac: true } : { czyZamknac: false, blad }
  })
  miejsce.closest('dialog')?.addEventListener('close', () => { czyOtwarty = false })
  if (zapisany) return pokazEdytory(zapisany)
  void poZakresach(miejsce, (zakresy) => pokazEdytory(zakresy.uslugi[usluga.id] ?? PUSTY_ZAKRES), () => czyOtwarty).catch(reportError)
}

/** @param {DaneOfertyUstawien} dane @returns {HTMLElement} karta „Zakres prac”: usluga → zakres zmieniony albo domyslny */
export function kartaZakresowUstawien(dane) {
  return karta({ tytul: 'Zakres prac', klasa: 'karta-ustawien karta-zakresow' }, dane.katalog.uslugi.filter((u) => !u.tylko_dodatek).map((u) => {
    const element = wiersz({ tytul: u.nazwa, wartosc: Object.hasOwn(dane.ustawienia.zakresy, u.id) ? ZMIENIONY : DOMYSLNY,
      naKlik: () => otworzZakres(dane, u) })
    element.dataset.pole = kluczZakresu(u.id)
    return element
  }))
}

/** @param {DaneOfertyUstawien} dane @param {readonly WarunekOferty[]} warunki */
function otworzWarunki(dane, warunki) {
  /** @type {Punkt[] | null} */
  let punkty = null
  const edytor = edytorListy({ id: 'ustawienia-warunki', etykieta: 'Warunki oferty', wiersze: 2,
    punkty: warunki.map((w) => ({ id: w.id, tekst: w.tresc })), naZmiane: (nowe) => { punkty = nowe } })
  otworzArkusz('Warunki oferty', [edytor], () => {
    if (punkty === null) return { czyZamknac: true }
    const nowe = warunkiPoEdycji(warunki, punkty, true)
    const blad = dane.wykonaj(() => zapiszWarunki(dane.magazyn, nowe, dane.domyslne), AKCJA_WARUNKOW)
    return blad === null ? { czyZamknac: true } : { czyZamknac: false, blad }
  })
}

/** @param {DaneOfertyUstawien} dane @returns {HTMLElement} karta „Warunki oferty” z „Edytuj” i „Przywróć domyślne” */
export function kartaWarunkowUstawien(dane) {
  const zapisane = dane.ustawienia.warunki
  const warunki = warunkiZrodlowe(null, dane.ustawienia, dane.domyslne)
  return karta({ klasa: 'karta-ustawien karta-oferty' },
    naglowekKarty('Warunki oferty', { tekst: 'Edytuj', klucz: 'warunki-ustawien', naKlik: () => otworzWarunki(dane, warunki) }, 'pencil'),
    listaPunktow(warunki.map((w) => w.tresc), 'warunek', warunki.map((w) => (w.tylko_szybka ? TYLKO_SZYBKA : null))),
    zapisane === null ? null : przycisk({ tekst: 'Przywróć domyślne', rodzaj: 'tekstowy',
      naKlik: () => { dane.wykonaj(() => zapiszWarunki(dane.magazyn, null, dane.domyslne), AKCJA_WARUNKOW) } }))
}
