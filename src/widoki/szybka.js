// Szybka wycena przez telefon (`#/szybka`, opcjonalnie `?wycena=<id>`, makieta szybka-wycena): pole „Usługa” z arkuszem, pola
// wg uslugi (mieszkanie: rodzaj, metraz, lazienki, kuchnia, stan, AGD; biuro: metraz i stan; okna, tapicerka, dywany: liczniki
// pozycji; ogledziny: metraz), opcjonalny klient z listy (wyborKlienta; `?klient=<id>` z karty klienta), karta wyniku liczona
// przy kazdej zmianie i wiersz pytan do klienta. Bez „Zapisz” (makieta):
// zapisuje „Kopiuj tekst” (status wyslana) i „Dokładna wycena” (zamiana w dokladna i krok zakresu kreatora), a zapisany rekord
// zapisuje sie przy kazdej zmianie. Logika w src/kreator/szybka.js, widok tylko rysuje.

import { wczytajStan } from '../dane/magazyn.js'
import { pytaniaAplikacji } from '../dane/pytania.js'
import { ustawieniaDomyslne } from '../dane/ustawienia.js'
import { klient as znajdzKlienta } from '../dane/klienci.js'
import { BladWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import { czyWycenaZamknieta } from '../dane/zlecenia.js'
import {
  formularzDomyslny, opcjeUslug, oznaczWyslana, przypiszKlientaSzybkiej, wejscieZWyceny, wynikFormularza, zapiszSzybka, zBrudemOdpowiedzi,
  zMetrazem, zSzybkiej, zUsluga,
} from '../kreator/szybka.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { domyslneLazienki } from '../silnik/uklad.js'
import { h } from '../ui/h.js'
import { licznik, przycisk } from '../ui/komponenty/formularz.js'
import { baner, naglowek } from '../ui/komponenty/uklad.js'
import { kopiujDoSchowka } from '../ui/schowek.js'
import { sciezka } from '../ui/trasy.js'
import { adresKroku, POWROT_DO_WYCEN, WYCENA_ZAMKNIETA, zglosBladKreatora } from './kreator-wspolne.js'
import { tekstBleduPytan, wierszPytan } from './pytania.js'
import { adresWyceny } from './start-dane.js'
import { otworzWyborUslugi, polaFormularza } from './szybka-pola.js'
import { kartaWyniku, kopiujTekstKlienta, ustawOczekiwanie } from './szybka-wynik.js'
import { wyborKlienta } from './wybor-klienta.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/szybka.js').StanWyniku} StanWyniku */
/** @typedef {import('./szybka-pola.js').Zmiana} Zmiana */

const GRANICE_LAZIENEK = Object.freeze({ min: 0, max: 9 })
const NIE_SKOPIOWANO = 'Nie udało się skopiować automatycznie. Tekst jest zaznaczony – skopiuj go ręcznie.'
const JUZ_DOKLADNA = 'Ta wycena jest już dokładną wyceną.'
const NIEAKTUALNA = 'Wycena zmieniła się w innej karcie przeglądarki. Widzisz teraz aktualne dane.'
const BRAK_WYNIKU = 'Uzupełnij usługę i zakres, żeby zapisać wycenę.'
const NAGLOWEK = Object.freeze({ tytul: 'Szybka wycena', podtytul: 'Rozmowa z klientem', ...POWROT_DO_WYCEN })

/** @param {HTMLElement} kontener @param {string} tekst @param {{ tekst: string, adres: string }} akcja */
function pokazKomunikat(kontener, tekst, akcja) {
  kontener.replaceChildren(naglowek(NAGLOWEK),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst }), przycisk({ tekst: akcja.tekst, rodzaj: 'drugi', adres: akcja.adres })))
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
    if (zapisana && (zapisana.rodzaj !== 'szybka' || czyWycenaZamknieta(stanMagazynu, zapisana.id))) {
      const tekst = zapisana.rodzaj === 'szybka' ? WYCENA_ZAMKNIETA : JUZ_DOKLADNA
      return pokazKomunikat(kontener, tekst, { tekst: 'Pokaż wycenę', adres: adresWyceny(zapisana) })
    }
    const ustawienia = stanMagazynu.ustawienia ?? ustawieniaDomyslne(domyslne)
    let id = zapisana?.id ?? null
    /** @type {string | null} znacznik zmiany rekordu widziany na ekranie (ochrona przed nadpisaniem zmian z innej karty) */
    let zmieniona = zapisana?.zmieniona ?? null
    let formularz = zapisana ? wejscieZWyceny(zapisana, katalog) : formularzDomyslny(katalog, ustawienia.wojewodztwoId)
    /** Klient wyceny; przed pierwszym zapisem z `?klient=<id>` (klienta, ktorego nie ma, pomija), zapisuje sie z rekordem. */
    let klientId = zapisana ? zapisana.klientId : znajdzKlienta(stanMagazynu, zapytanie.klient ?? '')?.id ?? null
    let czyLazienkiReczne = formularz.lazienki !== undefined && formularz.lazienki !== domyslneLazienki(formularz.m2, katalog.uklady)
    let czyDodatkiOtwarte = false
    let czyWiecejOtwarte = false
    let czySkopiowano = false
    let czyWToku = false
    let czyAktywny = true
    /** @type {StanWyniku} */
    let stanWyniku = wynikFormularza(kontekst, formularz)
    /** @type {import('./szybka-wynik.js').TekstKlienta} */
    let tekstKlienta = { cytat: null, zapasowy: null }
    const pola = h('div', { class: 'szybka__pola' })
    const miejsceKlienta = h('div', { class: 'szybka__klient' })
    const miejsceLazienek = h('div', { class: 'szybka__lazienki' })
    const miejsceWyniku = h('div', { class: 'szybka__wynik' })
    const miejscePytan = h('div', { class: 'szybka__pytania' })
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
      const { element: karta, ...tekst } = kartaWyniku({ stan: stanWyniku, czySkopiowano,
        wiecej: { czyOtwarte: czyWiecejOtwarte, naPrzelacz: (czy) => { czyWiecejOtwarte = czy } },
        naKopiuj: () => void handleKopiuj().catch(reportError), naDokladna: () => void handleDokladna().catch(reportError) })
      tekstKlienta = tekst
      miejsceWyniku.replaceChildren(karta)
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
      const w = zapiszSzybka(kontekst, id, formularz, { zmieniona, klientId })
      zmieniona = w.zmieniona
      klientId = w.klientId
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
      klientId = swieza.klientId
      rysujKlienta()
      stanWyniku = wynikFormularza(kontekst, formularz)
      rysujPola()
      rysujWynik()
      komunikat.replaceChildren(baner({ rodzaj: 'info', tekst: NIEAKTUALNA }))
    }

    /**
     * Wybor klienta: przed pierwszym zapisem tylko na ekranie, w zapisanym rekordzie od razu (przypiszKlientaSzybkiej). Znacznik
     * zmiany idzie za zapisem tylko wtedy, gdy rekord nie zmienil sie wczesniej w innej karcie (ta zmiana ma dalej dac `nieaktualna`).
     * @param {string | null} nowy @returns {string | null} tekst bledu albo null
     */
    function handleKlient(nowy) {
      if (id === null) {
        klientId = nowy
        return null
      }
      try {
        zmieniona = przypiszKlientaSzybkiej(kontekst, id, nowy, zmieniona)
      } catch (blad) {
        return zglosBladKreatora(blad)
      }
      klientId = nowy
      return null
    }

    function rysujKlienta() {
      miejsceKlienta.replaceChildren(wyborKlienta({ magazyn, wybranyId: klientId, naWybor: handleKlient, czyAktywny: () => czyAktywny,
        id: 'szybka-klient' }).element)
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

    /** @param {boolean} czy @param {string} [fokus] */
    const oczekuj = (czy, fokus) => ustawOczekiwanie(miejsceWyniku, czy, stanWyniku.stan === 'wynik', fokus)

    /** @param {boolean} czyWSchowku */
    function pokazKopiowanie(czyWSchowku) {
      czySkopiowano = czyWSchowku
      komunikat.replaceChildren(czyWSchowku ? h('p', { class: 'wizualnie-ukryte' }, 'Skopiowano') : baner({ rodzaj: 'info', tekst: NIE_SKOPIOWANO }))
      rysujWynik('[data-akcja="kopiuj"]')
    }

    async function handleKopiuj() {
      if (czyWToku || stanWyniku.stan !== 'wynik') return
      czyWToku = true
      oczekuj(true)
      try {
        await kopiujTekstKlienta({ tekst: stanWyniku.wynik.tekst, kopiuj: kopiujDoSchowka, zapisz, tekstKlienta: () => tekstKlienta,
          naWyslanie: (w) => { if (w.id === id) zmieniona = oznaczWyslana(kontekst, w.id).zmieniona },
          czyAktywny: () => czyAktywny, naRozwin: () => { czyWiecejOtwarte = true }, naWynik: pokazKopiowanie })
      } catch (blad) {
        if (czyAktywny) obsluzBlad(blad)
      } finally {
        czyWToku = false
        if (czyAktywny) oczekuj(false, '[data-akcja="kopiuj"]')
      }
    }

    async function handleDokladna() {
      if (czyWToku || stanWyniku.stan !== 'wynik') return
      czyWToku = true
      oczekuj(true)
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
        if (czyAktywny) oczekuj(false, '[data-akcja="dokladna"]')
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
          dodatki: { czyOtwarte: czyDodatkiOtwarte, naPrzelacz: (czy) => { czyDodatkiOtwarte = czy } } }))
      miejscePytan.replaceChildren(wierszPytan({ katalog, uslugaId: formularz.uslugaId, odpowiedzi: formularz.odpowiedzi, naKlik: handlePytania }))
      const element = fokus ? pola.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    kontener.replaceChildren(naglowek(NAGLOWEK), h('div', { class: 'tresc szybka' }, miejsceKlienta, pola, miejsceWyniku, komunikat, miejscePytan))
    rysujKlienta()
    rysujPola()
    rysujWynik()
    return () => { czyAktywny = false }
  },
}
