// Szybka wycena przez telefon (`#/szybka`, opcjonalnie `?wycena=<id>`, makieta szybka-wycena): pole „Usługa” z arkuszem, pola
// wg uslugi (mieszkanie: rodzaj, metraz, lazienki, kuchnia, stan, AGD; biuro: metraz i stan; okna, tapicerka, dywany: liczniki
// pozycji; ogledziny: metraz), wiersz pytan do klienta i karta wyniku liczona przy kazdej zmianie. Bez „Zapisz” (makieta):
// zapisuje „Kopiuj tekst” (status wyslana) i „Dokładna wycena” (zamiana w dokladna i krok zakresu kreatora), a zapisany rekord
// zapisuje sie przy kazdej zmianie. Logika w src/kreator/szybka.js, widok tylko rysuje.

import { wczytajStan } from '../dane/magazyn.js'
import { pytaniaAplikacji } from '../dane/pytania.js'
import { ustawieniaDomyslne } from '../dane/ustawienia.js'
import { BladWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import { MAKS_ILOSCI, ustawDodatek, ustawIlosc } from '../kreator/pozycje.js'
import { pozycjeGlowne } from '../kreator/stan.js'
import {
  formularzDomyslny, opcjeUslug, oznaczWyslana, polaUslugi, RODZAJE_MIESZKANIA, wejscieZWyceny, wynikFormularza, zapiszSzybka,
  zBrudemOdpowiedzi, zMetrazem, zSzybkiej, zUsluga,
} from '../kreator/szybka.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { STANY_SZYBKIEJ } from '../silnik/szybka.js'
import { domyslneLazienki } from '../silnik/uklad.js'
import { bladZakresu, nazwaJednostki } from '../ui/format.js'
import { h } from '../ui/h.js'
import { chipy, licznik, przycisk } from '../ui/komponenty/formularz.js'
import { arkusz, baner, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { kopiujDoSchowka } from '../ui/schowek.js'
import { sciezka } from '../ui/trasy.js'
import { adresKroku, zglosBladKreatora } from './kreator-wspolne.js'
import { tekstBleduPytan, wierszPytan } from './pytania.js'
import { adresWyceny } from './start-dane.js'
import { kartaWyniku } from './szybka-wynik.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/szybka.js').FormularzSzybkiej} FormularzSzybkiej */
/** @typedef {import('../kreator/szybka.js').StanWyniku} StanWyniku */
/** @typedef {(fn: (w: FormularzSzybkiej) => FormularzSzybkiej, opcje?: { fokus?: string, czyPola?: boolean }) => void} Zmiana */

const KROK_METRAZU = 5
const GRANICE_METRAZU = Object.freeze({ min: 1, max: MAKS_ILOSCI })
const GRANICE_LAZIENEK = Object.freeze({ min: 0, max: 9 })
const USLUGA_DODATKOW = 'agd'
const KUCHNIE = Object.freeze(/** @type {const} */ ([{ wartosc: 'osobna', etykieta: 'Osobna' }, { wartosc: 'aneks', etykieta: 'Aneks' }]))
const STANY = STANY_SZYBKIEJ.map((s) => ({ wartosc: s.id, etykieta: s.etykieta }))
const NIE_SKOPIOWANO = 'Nie udało się skopiować automatycznie. Tekst jest zaznaczony – skopiuj go ręcznie.'
const JUZ_DOKLADNA = 'Ta wycena jest już dokładną wyceną.'
const NIEAKTUALNA = 'Wycena zmieniła się w innej karcie przeglądarki. Widzisz teraz aktualne dane.'
const BRAK_WYNIKU = 'Uzupełnij usługę i zakres, żeby zapisać wycenę.'
const BLAD_ILOSCI = bladZakresu({ min: 0, max: MAKS_ILOSCI })

/** @param {HTMLElement} kontener @param {string} tekst @param {{ tekst: string, adres: string }} akcja */
function pokazKomunikat(kontener, tekst, akcja) {
  kontener.replaceChildren(naglowek({ tytul: 'Szybka wycena', podtytul: 'Rozmowa z klientem', wstecz: sciezka('start') }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst }), przycisk({ tekst: akcja.tekst, rodzaj: 'drugi', adres: akcja.adres })))
}

/**
 * Arkusz „Usługa”: lista opcji (wiersze-przyciski, wybrana z opisem „wybrana”); wybor zamyka arkusz i oddaje opcje, a fokus
 * wraca do pola uslugi.
 * @param {Katalog} katalog @param {string} wybrana wartosc opcji @param {(wartosc: string) => void} naWybor
 */
function otworzWyborUslugi(katalog, wybrana, naWybor) {
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

/**
 * Pola uslugi pod polem „Usługa” (bez lazienek, ktore maja wlasne miejsce, zeby zmiana metrazu nie zabierala fokusu).
 * @param {{ formularz: FormularzSzybkiej, katalog: Katalog, zmien: Zmiana, naMetraz: (m2: number) => void, lazienki: HTMLElement,
 *   dodatki: { czyOtwarte: boolean, naPrzelacz: (czyOtwarte: boolean) => void } }} opcje
 * @returns {Node[]}
 */
function polaFormularza({ formularz, katalog, zmien, naMetraz, lazienki, dodatki }) {
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

/** @param {FormularzSzybkiej} formularz @param {Katalog} katalog @param {Zmiana} zmien @returns {HTMLElement[]} */
function licznikiPozycji(formularz, katalog, zmien) {
  return formularz.pozycje.map((p) => {
    const pozycja = katalog.pozycja(formularz.uslugaId, p.id)
    return licznik({ id: `szybka-pozycja-${p.id}`, etykieta: pozycja.nazwa, wartosc: p.ilosc, max: MAKS_ILOSCI, tekstBledu: BLAD_ILOSCI,
      jednostka: nazwaJednostki(pozycja.jednostka), naZmiane: (n) => zmien((w) => ({ ...w, pozycje: ustawIlosc(w, p.id, n, katalog).pozycje ?? [] })) })
  })
}

/**
 * Zwijane „AGD i dodatki”: liczniki pozycji AGD (dodatki w cenie).
 * @param {FormularzSzybkiej} formularz @param {Katalog} katalog @param {Zmiana} zmien
 * @param {{ czyOtwarte: boolean, naPrzelacz: (czyOtwarte: boolean) => void }} stan
 */
function dodatkiAgd(formularz, katalog, zmien, { czyOtwarte, naPrzelacz }) {
  const pozycje = katalog.usluga(USLUGA_DODATKOW).pozycje ?? []
  /** @param {string} pozycjaId */
  const ilosc = (pozycjaId) => formularz.dodatki.find((d) => d.uslugaId === USLUGA_DODATKOW && d.pozycjaId === pozycjaId)?.ilosc ?? 0
  const element = h('details', { class: 'szybka__dodatki', open: czyOtwarte || formularz.dodatki.length > 0 },
    h('summary', { class: 'szybka__dodatki-tytul' }, 'AGD i dodatki'),
    h('div', { class: 'szybka__dodatki-lista' }, pozycje.map((p) => licznik({
      id: `szybka-agd-${p.id}`, etykieta: p.nazwa, wartosc: ilosc(p.id), max: MAKS_ILOSCI, tekstBledu: BLAD_ILOSCI,
      jednostka: nazwaJednostki(p.jednostka),
      naZmiane: (n) => zmien((w) => ({ ...w, dodatki: ustawDodatek(w, USLUGA_DODATKOW, p.id, n, 'w_cenie', katalog).dodatki ?? [] })),
    }))))
  element.addEventListener('toggle', () => naPrzelacz(element.open))
  return element
}

/** @type {Widok} */
export const widokSzybkiejWyceny = {
  render(kontener, { zapytanie, kontekst }) {
    const { katalog, magazyn, domyslne, nawiguj } = kontekst
    const stanMagazynu = wczytajStan(magazyn)
    const zapisana = zapytanie.wycena ? znajdzWycene(stanMagazynu, zapytanie.wycena) : null
    if (zapytanie.wycena && !zapisana) {
      return pokazKomunikat(kontener, 'Nie ma tej wyceny. Mogła zostać usunięta.', { tekst: 'Nowa szybka wycena', adres: sciezka('szybka') })
    }
    if (zapisana && (zapisana.rodzaj !== 'szybka' || zapisana.status === 'wykonana')) {
      const tekst = zapisana.rodzaj === 'szybka' ? 'Ta wycena jest wykonana – można ją tylko przeglądać.' : JUZ_DOKLADNA
      return pokazKomunikat(kontener, tekst, { tekst: 'Pokaż wycenę', adres: adresWyceny(zapisana) })
    }
    const ustawienia = stanMagazynu.ustawienia ?? ustawieniaDomyslne(domyslne)
    let id = zapisana?.id ?? null
    /** @type {string | null} znacznik zmiany rekordu widziany na ekranie (ochrona przed nadpisaniem zmian z innej karty) */
    let zmieniona = zapisana?.zmieniona ?? null
    let formularz = zapisana ? wejscieZWyceny(zapisana, katalog) : formularzDomyslny(katalog, ustawienia.wojewodztwoId)
    let czyLazienkiReczne = formularz.lazienki !== undefined && formularz.lazienki !== domyslneLazienki(formularz.m2, katalog.uklady)
    let czyDodatkiOtwarte = false
    let czySkopiowano = false
    let czyWToku = false
    let czyAktywny = true
    /** @type {StanWyniku} */
    let stanWyniku = wynikFormularza(kontekst, formularz)
    /** @type {HTMLElement | null} */
    let cytat = null
    const pola = h('div', { class: 'szybka__pola' })
    const miejsceLazienek = h('div', { class: 'szybka__lazienki' })
    const miejsceWyniku = h('div', { class: 'szybka__wynik' })
    const komunikat = h('div', { class: 'kreator__komunikat', 'aria-live': 'polite' })

    /** @param {string} tekst */
    const pokazBlad = (tekst) => komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))

    /** Zapisany rekord: adres z `?wycena=<id>`, zeby powrot i odswiezenie strony wracaly do tej wyceny. @param {string} noweId */
    function ustawId(noweId) {
      if (id === noweId) return
      id = noweId
      history.replaceState(null, '', sciezka('szybka', {}, { wycena: noweId }))
    }

    /** @param {string} [fokus] */
    function rysujWynik(fokus) {
      const karta = kartaWyniku({ stan: stanWyniku, czySkopiowano, naKopiuj: () => void handleKopiuj().catch(reportError),
        naDokladna: () => void handleDokladna().catch(reportError) })
      cytat = karta.cytat
      miejsceWyniku.replaceChildren(karta.element)
      if (stanWyniku.stan === 'blad' && stanWyniku.kod === 'liczenie') reportError(stanWyniku.blad)
      const element = fokus ? miejsceWyniku.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    function rysujLazienki() {
      if (formularz.lazienki === undefined) return miejsceLazienek.replaceChildren()
      miejsceLazienek.replaceChildren(licznik({ id: 'szybka-lazienki', etykieta: 'Łazienki', wartosc: formularz.lazienki, ...GRANICE_LAZIENEK,
        naZmiane: (n) => { czyLazienkiReczne = true; zmien((w) => ({ ...w, lazienki: n })) } }))
    }

    /** @type {Zmiana} */
    function zmien(fn, { fokus, czyPola = false } = {}) {
      try {
        formularz = fn(formularz)
      } catch (blad) {
        if (!(blad instanceof BladWejscia) && !(blad instanceof BladKatalogu)) throw blad
        return pokazBlad(zglosBladKreatora(blad))
      }
      czySkopiowano = false
      stanWyniku = wynikFormularza(kontekst, formularz)
      komunikat.replaceChildren()
      if (id !== null && stanWyniku.stan === 'wynik') zapiszRekord(id)
      rysujWynik()
      if (czyPola) rysujPola(fokus)
    }

    /** @param {string} zapisywane */
    function zapiszRekord(zapisywane) {
      if (zapisywane !== id) return
      try {
        zapisz()
      } catch (blad) {
        obsluzBlad(blad)
      }
    }

    /** Zapis formularza (nowy rekord albo zmiana zapisanego) bez nadpisania zmian z innej karty. @returns {Wycena} */
    function zapisz() {
      const w = zapiszSzybka(kontekst, id, formularz, { zmieniona })
      zmieniona = w.zmieniona
      ustawId(w.id)
      return w
    }

    /** Rekord zmieniony w innej karcie: formularz z aktualnego rekordu i komunikat; inne bledy z tekstow kreatora. @param {unknown} blad */
    function obsluzBlad(blad) {
      if (!(blad instanceof BladWyceny) || blad.kod !== 'nieaktualna' || id === null) return pokazBlad(zglosBladKreatora(blad))
      const swieza = znajdzWycene(wczytajStan(magazyn), id)
      if (!swieza) return pokazBlad(zglosBladKreatora(new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)))
      if (swieza.rodzaj !== 'szybka') return pokazBlad(JUZ_DOKLADNA)
      formularz = wejscieZWyceny(swieza, katalog)
      zmieniona = swieza.zmieniona
      stanWyniku = wynikFormularza(kontekst, formularz)
      rysujPola()
      rysujWynik()
      komunikat.replaceChildren(baner({ rodzaj: 'info', tekst: NIEAKTUALNA }))
    }

    /** @param {number} m2 */
    function handleMetraz(m2) {
      const przed = formularz.lazienki
      zmien((w) => zMetrazem(w, m2, katalog, czyLazienkiReczne))
      if (formularz.lazienki !== przed) rysujLazienki()
    }

    /** @param {string} wartosc opcja arkusza: usluga albo „mieszkanie” (zostaje biezacy rodzaj, gdy jest mieszkaniem) */
    function handleUsluga(wartosc) {
      const opcja = opcjeUslug(katalog).find((o) => o.wartosc === wartosc)
      if (!opcja || opcja.uslugi.includes(formularz.uslugaId)) return rysujPola('[data-pole="usluga"]')
      const [uslugaId = formularz.uslugaId] = opcja.uslugi
      zmien((w) => zUsluga(w, uslugaId, katalog), { czyPola: true, fokus: '[data-pole="usluga"]' })
      if (Object.keys(formularz.odpowiedzi).length > 0) odswiezBrud(uslugaId)
    }

    /** Brud z odpowiedzi klienta wg pytan nowej uslugi (zUsluga go czysci), gdy uzytkownik nie zmienil juz uslugi. @param {string} uslugaId */
    function odswiezBrud(uslugaId) {
      void pytaniaAplikacji(katalog).then((pytania) => {
        if (czyAktywny && formularz.uslugaId === uslugaId) zmien((w) => zBrudemOdpowiedzi(w, pytania))
      }).catch(reportError)
    }

    function handlePytania() {
      if (czyWToku) return
      if (stanWyniku.stan !== 'wynik') return pokazBlad(BRAK_WYNIKU)
      try {
        nawiguj(sciezka('pytania', { id: zapisz().id }))
      } catch (blad) {
        obsluzBlad(blad)
      }
    }

    /**
     * Akcja w toku (zapis, schowek, wczytanie pytan): przyciski karty wyniku wylaczone, karta z aria-busy; po zakonczeniu
     * przyciski wracaja, a fokus wraca na przycisk akcji, gdy wylaczenie go zabralo.
     * @param {boolean} czy @param {string} [fokus]
     */
    function ustawOczekiwanie(czy, fokus) {
      miejsceWyniku.firstElementChild?.setAttribute('aria-busy', String(czy))
      for (const akcja of miejsceWyniku.querySelectorAll('button')) akcja.disabled = czy || stanWyniku.stan !== 'wynik'
      const element = fokus ? miejsceWyniku.querySelector(fokus) : null
      if (!czy && element instanceof HTMLElement && !miejsceWyniku.contains(document.activeElement)) element.focus()
    }

    async function handleKopiuj() {
      if (czyWToku || stanWyniku.stan !== 'wynik') return
      czyWToku = true
      ustawOczekiwanie(true)
      const { tekst } = stanWyniku.wynik
      try {
        const w = zapisz()
        const czyWSchowku = cytat ? await kopiujDoSchowka(tekst, cytat) : false
        if (czyWSchowku && w.id === id) zmieniona = oznaczWyslana(kontekst, w.id).zmieniona
        if (!czyAktywny) return
        czySkopiowano = czyWSchowku
        komunikat.replaceChildren(czyWSchowku ? h('p', { class: 'wizualnie-ukryte' }, 'Skopiowano') : baner({ rodzaj: 'info', tekst: NIE_SKOPIOWANO }))
        rysujWynik('[data-akcja="kopiuj"]')
        if (!czyWSchowku && cytat) getSelection()?.selectAllChildren(cytat)
      } catch (blad) {
        if (czyAktywny) obsluzBlad(blad)
      } finally {
        czyWToku = false
        if (czyAktywny) ustawOczekiwanie(false, '[data-akcja="kopiuj"]')
      }
    }

    async function handleDokladna() {
      if (czyWToku || stanWyniku.stan !== 'wynik') return
      czyWToku = true
      ustawOczekiwanie(true)
      try {
        const pytania = await pytaniaAplikacji(katalog).catch((blad) => {
          if (czyAktywny) pokazBlad(tekstBleduPytan(blad))
          return null
        })
        if (!pytania || !czyAktywny || stanWyniku.stan !== 'wynik') return
        const w = zapisz()
        zSzybkiej(kontekst, w, pytania)
        nawiguj(adresKroku('zakres', w.id))
      } catch (blad) {
        if (czyAktywny) obsluzBlad(blad)
      } finally {
        czyWToku = false
        if (czyAktywny) ustawOczekiwanie(false, '[data-akcja="dokladna"]')
      }
    }

    /** @param {string} [fokus] */
    function rysujPola(fokus) {
      const opcja = opcjeUslug(katalog).find((o) => o.uslugi.includes(formularz.uslugaId))
      const poleUslugi = h('button', { type: 'button', class: 'wybor-pola', 'data-pole': 'usluga', 'aria-haspopup': 'dialog',
        on: { click: () => otworzWyborUslugi(katalog, opcja?.wartosc ?? formularz.uslugaId, handleUsluga) } },
      h('span', { class: 'wybor-pola__etykieta' }, 'Usługa'),
      h('span', { class: 'wybor-pola__wartosc' }, opcja?.etykieta ?? katalog.usluga(formularz.uslugaId).nazwa))
      rysujLazienki()
      pola.replaceChildren(poleUslugi,
        ...polaFormularza({ formularz, katalog, zmien, naMetraz: handleMetraz, lazienki: miejsceLazienek,
          dodatki: { czyOtwarte: czyDodatkiOtwarte, naPrzelacz: (czy) => { czyDodatkiOtwarte = czy } } }),
        wierszPytan({ katalog, uslugaId: formularz.uslugaId, odpowiedzi: formularz.odpowiedzi, naKlik: handlePytania }))
      const element = fokus ? pola.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    kontener.replaceChildren(naglowek({ tytul: 'Szybka wycena', podtytul: 'Rozmowa z klientem', wstecz: sciezka('start') }),
      h('div', { class: 'tresc szybka' }, pola, miejsceWyniku, komunikat))
    rysujPola()
    rysujWynik()
    return () => { czyAktywny = false }
  },
}
