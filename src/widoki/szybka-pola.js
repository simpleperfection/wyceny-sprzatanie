// Pola szybkiej wyceny wg uslugi (makieta szybka-wycena; mieszkanie, biuro, ogledziny, liczniki pozycji), zwijane „AGD i dodatki”
// i arkusz „Usługa”. Stan formularza trzyma ekran (src/widoki/szybka.js), a logike src/kreator/szybka.js; ten modul tylko rysuje.

import { MAKS_ILOSCI, ustawDodatek, ustawIlosc } from '../kreator/pozycje.js'
import { pozycjeGlowne } from '../kreator/stan.js'
import { opcjeUslug, polaUslugi, RODZAJE_MIESZKANIA, zUsluga } from '../kreator/szybka.js'
import { STANY_SZYBKIEJ } from '../silnik/szybka.js'
import { nazwaJednostki } from '../ui/format.js'
import { h } from '../ui/h.js'
import { chipy, licznik } from '../ui/komponenty/formularz.js'
import { arkusz, karta, trzymajRozwiniecie, wiersz } from '../ui/komponenty/uklad.js'
import { BLAD_ILOSCI } from './kreator-wspolne.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../kreator/szybka.js').FormularzSzybkiej} FormularzSzybkiej */
/** @typedef {import('../ui/komponenty/uklad.js').StanWiecej} StanWiecej */
/** @typedef {(fn: (w: FormularzSzybkiej) => FormularzSzybkiej, opcje?: { fokus?: string, czyPola?: boolean }) => void} Zmiana */

const KROK_METRAZU = 5
const GRANICE_METRAZU = Object.freeze({ min: 1, max: MAKS_ILOSCI })
const USLUGA_DODATKOW = 'agd'
const KUCHNIE = Object.freeze(/** @type {const} */ ([{ wartosc: 'osobna', etykieta: 'Osobna' }, { wartosc: 'aneks', etykieta: 'Aneks' }]))
const STANY = STANY_SZYBKIEJ.map((s) => ({ wartosc: s.id, etykieta: s.etykieta }))

/**
 * Arkusz „Usługa”: lista opcji (wiersze-przyciski, wybrana z opisem „wybrana”); wybor zamyka arkusz i oddaje opcje, a fokus
 * wraca do pola uslugi.
 * @param {Katalog} katalog @param {string} wybrana wartosc opcji @param {(wartosc: string) => void} naWybor
 */
export function otworzWyborUslugi(katalog, wybrana, naWybor) {
  const wiersze = opcjeUslug(katalog).map((o) => {
    const element = wiersz({ tytul: o.etykieta, opis: o.wartosc === wybrana ? 'wybrana' : undefined, naKlik: () => {
      dialog.close()
      naWybor(o.wartosc)
    } })
    if (o.wartosc === wybrana) element.setAttribute('aria-current', 'true')
    return element
  })
  const dialog = arkusz({ tytul: 'Usługa' }, karta({ klasa: 'karta--bez-odstepu' }, wiersze))
  dialog.addEventListener('close', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  const zaznaczona = dialog.querySelector('[aria-current="true"]')
  if (zaznaczona instanceof HTMLElement) zaznaczona.focus()
}

/** @param {FormularzSzybkiej} formularz @param {Katalog} katalog @param {Zmiana} zmien @returns {HTMLElement[]} */
function licznikiPozycji(formularz, katalog, zmien) {
  return formularz.pozycje.map((p) => {
    const pozycja = katalog.pozycja(formularz.uslugaId, p.id)
    return licznik({ id: `szybka-pozycja-${p.id}`, etykieta: pozycja.nazwa, wartosc: p.ilosc, max: MAKS_ILOSCI, tekstBledu: BLAD_ILOSCI,
      jednostka: nazwaJednostki(pozycja.jednostka), naZmiane: (n) => zmien((w) => ({ ...w, pozycje: ustawIlosc(w, p.id, n, katalog).pozycje ?? [] })) })
  })
}

/**
 * Zwijane „AGD i dodatki”: liczniki pozycji AGD (dodatki w cenie); z dodatkami w formularzu zawsze rozwiniete.
 * @param {FormularzSzybkiej} formularz @param {Katalog} katalog @param {Zmiana} zmien @param {StanWiecej} stan
 * @returns {HTMLDetailsElement}
 */
function dodatkiAgd(formularz, katalog, zmien, stan) {
  const pozycje = katalog.usluga(USLUGA_DODATKOW).pozycje ?? []
  /** @param {string} pozycjaId */
  const ilosc = (pozycjaId) => formularz.dodatki.find((d) => d.uslugaId === USLUGA_DODATKOW && d.pozycjaId === pozycjaId)?.ilosc ?? 0
  const element = h('details', { class: 'szybka__dodatki' },
    h('summary', { class: 'szybka__dodatki-tytul' }, 'AGD i dodatki'),
    h('div', { class: 'szybka__dodatki-lista' }, pozycje.map((p) => licznik({
      id: `szybka-agd-${p.id}`, etykieta: p.nazwa, wartosc: ilosc(p.id), max: MAKS_ILOSCI, tekstBledu: BLAD_ILOSCI,
      jednostka: nazwaJednostki(p.jednostka),
      naZmiane: (n) => zmien((w) => ({ ...w, dodatki: ustawDodatek(w, USLUGA_DODATKOW, p.id, n, 'w_cenie', katalog).dodatki ?? [] })),
    }))))
  return trzymajRozwiniecie(element, { ...stan, czyOtwarte: stan.czyOtwarte || formularz.dodatki.length > 0 })
}

/**
 * Pola uslugi pod polem „Usługa” (bez lazienek, ktore maja wlasne miejsce, zeby zmiana metrazu nie zabierala fokusu).
 * @param {{ formularz: FormularzSzybkiej, katalog: Katalog, zmien: Zmiana, naMetraz: (m2: number) => void, lazienki: HTMLElement,
 *   dodatki: StanWiecej }} opcje
 * @returns {Node[]}
 */
export function polaFormularza({ formularz, katalog, zmien, naMetraz, lazienki, dodatki }) {
  const usluga = katalog.usluga(formularz.uslugaId)
  const pola = polaUslugi(usluga)
  const metraz = licznik({ id: 'szybka-metraz', etykieta: 'Metraż', wartosc: formularz.m2, krok: KROK_METRAZU, jednostka: 'm²',
    ...GRANICE_METRAZU, naZmiane: naMetraz })
  const stan = chipy({ id: 'szybka-stan', etykieta: 'Spodziewany stan', opcje: STANY, wybrana: formularz.stan,
    naZmiane: (s) => zmien((w) => ({ ...w, stan: s })) })
  if (pola === 'biuro') return [metraz, stan]
  if (pola === 'ogledziny_pomieszczen') return [metraz]
  if (pola === 'ogledziny_pozycji') {
    const [glowna] = pozycjeGlowne(usluga)
    return glowna ? [metraz, h('p', { class: 'szybka__notka' }, `Pozycja: ${glowna.nazwa}`)] : [metraz]
  }
  if (pola === 'pozycje') return licznikiPozycji(formularz, katalog, zmien)
  return [
    chipy({ id: 'szybka-rodzaj', etykieta: 'Rodzaj sprzątania', opcje: RODZAJE_MIESZKANIA, wybrana: formularz.uslugaId,
      naZmiane: (id) => zmien((w) => zUsluga(w, id, katalog), { czyPola: true, fokus: 'input[name="szybka-rodzaj"]:checked' }) }),
    metraz, lazienki,
    chipy({ id: 'szybka-kuchnia', etykieta: 'Kuchnia', opcje: KUCHNIE, wybrana: formularz.kuchnia ?? 'osobna',
      naZmiane: (k) => zmien((w) => ({ ...w, kuchnia: k })) }),
    stan,
    dodatkiAgd(formularz, katalog, zmien, dodatki),
  ]
}
