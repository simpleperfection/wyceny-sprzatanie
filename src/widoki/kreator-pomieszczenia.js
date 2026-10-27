// Krok zakresu kreatora dla uslug w trybie pomieszczen (`#/kreator/zakres?wycena=<id>`, makieta kreator-pomieszczenia):
// karty pomieszczen (zwinieta: nazwa, typ, m², aktywny brud; rozwinieta: nazwa, metraz, poziomy brudu, usuwanie), arkusz typow
// z zestawu uslugi, chipy wariantu przy biurach, baner po zamianie szybkiej wyceny i stopka z m², czasem z tempem i kwota.
// Zmiany ida przez src/kreator/pomieszczenia.js i `zapisKroku` (src/widoki/kreator-wspolne.js); cene liczy silnik, widok tylko rysuje.

import { wczytajStan } from '../dane/magazyn.js'
import { pytaniaAplikacji } from '../dane/pytania.js'
import {
  dodajPomieszczenie, GRANICE_METRAZU, MAKS_DLUGOSC_NAZWY, opisPrzeniesienia, podsumowanieZakresu, rodzajeBrudu, ustawBrud, ustawMetraz,
  usunPomieszczenie, zmienNazwe,
} from '../kreator/pomieszczenia.js'
import { brudOdpowiedzi } from '../kreator/pytania.js'
import { zmienWybor } from '../kreator/stan.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { tempoDoWyceny } from '../silnik/tempo.js'
import { czas, m2, odmiana, tekstLiczby } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { chipy, licznik, pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, karta, wiersz } from '../ui/komponenty/uklad.js'
import { adresKroku, odswiezStopke, pokazKomunikat, ramaKroku, wycenaKroku, zapisKroku } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/cena.js').PomieszczenieWyceny} PomieszczenieWyceny */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Brud} Brud */
/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../kreator/pomieszczenia.js').OpisPrzeniesienia} OpisPrzeniesienia */
/**
 * @typedef {{ naRozwin: (i: number) => void, naZwin: (i: number) => void, naMetraz: (i: number, m2: number) => void,
 *   naNazwe: (i: number, nazwa: string, pole: HTMLElement, tytul: HTMLElement) => void,
 *   naBrud: (i: number, brudId: string, poziom: number) => void, naWszystkieBrudy: (i: number, brudId: string) => void,
 *   naUsun: (i: number) => void }} AkcjeKarty
 * @typedef {{ katalog: Katalog, nazwaTypu: (typ: string) => string, czyWszystkieBrudy: boolean,
 *   akcje: AkcjeKarty }} OpcjeKarty
 */

const LEGENDA = 'Brud: – brak, 1 lekki, 2 średni, 3 silny'
const PUSTA_LISTA = 'Dodaj pomieszczenia, które sprzątasz.'
const BLAD_METRAZU = `Wpisz metraż od ${tekstLiczby(GRANICE_METRAZU.min)} do ${tekstLiczby(GRANICE_METRAZU.max)} m².`
const BLAD_NAZWY = `Wpisz nazwę od 1 do ${MAKS_DLUGOSC_NAZWY} znaków.`
const NIEAKTUALNA = 'Pomieszczenia zmieniły się w innej karcie przeglądarki. Widzisz teraz aktualną listę.'
/** @type {readonly [string, string, string]} */
const FORMY_LAZIENKI = Object.freeze(['łazienka', 'łazienki', 'łazienek'])
/** Chipy poziomu brudu: tekst na chipie i nazwa dla czytnika ekranu (jak w legendzie). */
const POZIOMY = Object.freeze([
  { poziom: 0, tekst: '–', opis: 'brak' }, { poziom: 1, tekst: '1', opis: '1 lekki' },
  { poziom: 2, tekst: '2', opis: '2 średni' }, { poziom: 3, tekst: '3', opis: '3 silny' },
])
/** @type {ReadonlyMap<string, string>} oczekiwane bledy wpisu (bez zglaszania) */
const TEKSTY_BLEDOW_ZAKRESU = new Map([['metraz', BLAD_METRAZU], ['nazwa_pomieszczenia', BLAD_NAZWY]])
const FOKUS_DODAJ = '.kreator-pomieszczenia__dodaj button'

/** @param {string} tekst */
const malaPierwsza = (tekst) => tekst.charAt(0).toLocaleLowerCase('pl-PL') + tekst.slice(1)
/** @param {Katalog} katalog @param {string} brudId */
const nazwaBrudu = (katalog, brudId) => katalog.brud.find((b) => b.id === brudId)?.nazwa ?? brudId
/** @param {PomieszczenieWyceny} p @param {string} brudId */
const poziomBrudu = (p, brudId) => (p.brud ?? []).find((b) => b.id === brudId)?.poziom ?? 0

/** @param {OpisPrzeniesienia} o @returns {string} */
function tekstPrzeniesienia(o) {
  const kuchnia = o.kuchnia ? `, ${o.kuchnia}` : ''
  return `Przeniesione z szybkiej wyceny: ${m2(o.m2)}, ${o.lazienki} ${odmiana(o.lazienki, FORMY_LAZIENKI)}${kuchnia}.`
}

/** @param {number} i @param {Brud} brud @param {number} poziom @param {AkcjeKarty['naBrud']} naBrud */
function wierszBrudu(i, brud, poziom, naBrud) {
  const grupa = `brud-${i}-${brud.id}`
  return h('div', { class: 'wiersz-brudu' },
    h('span', { class: 'wiersz-brudu__nazwa', id: `${grupa}-etykieta` }, brud.nazwa),
    h('div', { class: 'chipy wiersz-brudu__poziomy', role: 'radiogroup', 'aria-labelledby': `${grupa}-etykieta` },
      POZIOMY.map((p) => h('label', { class: 'chip chip--poziom' },
        h('input', { type: 'radio', name: grupa, value: String(p.poziom), class: 'chip__wejscie', checked: p.poziom === poziom,
          'aria-label': p.opis, on: { change: () => naBrud(i, brud.id, p.poziom) } }),
        h('span', { class: 'chip__tekst', 'aria-hidden': 'true' }, p.tekst)))))
}

/** @param {number} i @param {PomieszczenieWyceny} p @param {OpcjeKarty} opcje @returns {HTMLButtonElement} */
function kartaZwinieta(i, p, { katalog, nazwaTypu, akcje }) {
  const aktywne = (p.brud ?? []).filter((b) => b.poziom > 0)
  const gora = h('span', { class: 'karta-pomieszczenia__gora' },
    h('span', { class: 'karta-pomieszczenia__nazwy' },
      h('span', { class: 'karta-pomieszczenia__nazwa' }, p.nazwa ?? nazwaTypu(p.typ)),
      h('span', { class: 'karta-pomieszczenia__typ' }, malaPierwsza(nazwaTypu(p.typ)))),
    h('span', { class: 'karta-pomieszczenia__metraz liczba' }, m2(p.m2)),
    ikona('chevron-right', 'karta-pomieszczenia__strzalka'))
  const brud = aktywne.length === 0 ? null : h('span', { class: 'karta-pomieszczenia__brud' },
    aktywne.map((b) => h('span', { class: 'znacznik-brudu' }, `${nazwaBrudu(katalog, b.id)} ${b.poziom}`)))
  return h('button', { type: 'button', class: 'karta-pomieszczenia', 'aria-expanded': 'false', 'data-pomieszczenie': String(i),
    on: { click: () => akcje.naRozwin(i) } }, gora, brud)
}

/** @param {number} i @param {PomieszczenieWyceny} p @param {OpcjeKarty} opcje @returns {HTMLElement} */
function kartaRozwinieta(i, p, { katalog, nazwaTypu, czyWszystkieBrudy, akcje }) {
  const nazwa = p.nazwa ?? nazwaTypu(p.typ)
  const tytul = h('h2', { class: 'karta-pomieszczenia__nazwa', id: `pomieszczenie-${i}-tytul` }, nazwa)
  const poleNazwy = pole({ id: `pomieszczenie-${i}-nazwa`, etykieta: 'Nazwa', wartosc: nazwa,
    naZmiane: (w) => akcje.naNazwe(i, w, poleNazwy, tytul) })
  const { widoczne, pozostale } = rodzajeBrudu(katalog, p)
  const wiersze = czyWszystkieBrudy ? katalog.brud : widoczne
  const pierwszyPozostaly = pozostale[0]
  const link = czyWszystkieBrudy || !pierwszyPozostaly ? null : przycisk({
    tekst: `+ ${pozostale.map((b, j) => (j === 0 ? b.nazwa : malaPierwsza(b.nazwa))).join(', ')}`, rodzaj: 'tekstowy',
    naKlik: () => akcje.naWszystkieBrudy(i, pierwszyPozostaly.id),
  })
  const gora = h('div', { class: 'karta-pomieszczenia__gora' },
    h('div', { class: 'karta-pomieszczenia__nazwy' }, tytul, h('span', { class: 'karta-pomieszczenia__typ' }, malaPierwsza(nazwaTypu(p.typ)))),
    h('button', { type: 'button', class: 'karta-pomieszczenia__zwin', 'aria-expanded': 'true', on: { click: () => akcje.naZwin(i) } }, 'Zwiń'))
  const metraz = licznik({ id: `metraz-${i}`, etykieta: 'Metraż', wartosc: p.m2, krok: 1, jednostka: 'm²', tekstBledu: BLAD_METRAZU,
    min: Math.min(GRANICE_METRAZU.min, p.m2), max: Math.max(GRANICE_METRAZU.max, p.m2), naZmiane: (w) => akcje.naMetraz(i, w) })
  return h('section', { class: 'karta-pomieszczenia karta-pomieszczenia--rozwinieta', 'aria-labelledby': tytul.id, 'data-pomieszczenie': String(i) },
    gora,
    poleNazwy,
    metraz,
    h('p', { class: 'karta-pomieszczenia__legenda' }, LEGENDA),
    wiersze.map((b) => wierszBrudu(i, b, poziomBrudu(p, b.id), akcje.naBrud)),
    link,
    przycisk({ tekst: 'Usuń pomieszczenie', rodzaj: 'tekstowy', ikona: 'trash', naKlik: () => akcje.naUsun(i) }))
}

/** @type {Widok} */
export const widokKreatoraPomieszczen = {
  render(kontener, { zapytanie, kontekst }) {
    const { magazyn, katalog, domyslne, nawiguj } = kontekst
    const poczatkowa = wycenaKroku(kontener, zapytanie, kontekst)
    if (!poczatkowa) return
    const usluga = katalog.usluga(poczatkowa.wejscie.uslugaId)
    if (usluga.tryb !== 'pomieszczenia' || !usluga.zestaw_pomieszczen) {
      return pokazKomunikat(kontener, 'Tej usługi nie wycenia się z pomieszczeń.', { tekst: 'Zmień usługę', adres: adresKroku('usluga', poczatkowa.id) })
    }
    const zestaw = katalog.zestaw(usluga.zestaw_pomieszczen)
    const stan = wczytajStan(magazyn)
    const tempo = tempoDoWyceny(stan.ustawienia, stan.wyceny, usluga.id, domyslne).wartosc
    let wycena = poczatkowa
    /** @type {number | null} */
    let rozwiniety = null
    let czyWszystkieBrudy = false
    /** @type {Pytania | null} pytania do brudu z odpowiedzi klienta w nowym pomieszczeniu (wczytane w tle; bez nich sam brud uslugi) */
    let pytania = null
    void pytaniaAplikacji(katalog).then((wczytane) => { pytania = wczytane }).catch(reportError)

    /** @param {string} typ */
    const nazwaTypu = (typ) => zestaw.find((n) => n.id === typ)?.nazwa ?? typ
    const { zapisz, pokazBlad, tekstBledu, komunikat } = zapisKroku({
      kontekst, wycena: () => wycena, teksty: TEKSTY_BLEDOW_ZAKRESU, nieaktualna: NIEAKTUALNA, naZapis: (w) => { wycena = w },
      naEkranie: (w) => JSON.stringify(w.pomieszczenia ?? []),
      naNieaktualnej: (w) => { wycena = w; rozwiniety = null; rysuj() },
    })

    /** @param {string | null} blad @param {() => void} poZapisie */
    const poZmianie = (blad, poZapisie) => (blad === null ? poZapisie() : pokazBlad(blad))

    /** @type {AkcjeKarty} */
    const akcje = {
      naRozwin: (i) => { rozwiniety = i; czyWszystkieBrudy = false; rysuj(`[data-pomieszczenie="${i}"] .karta-pomieszczenia__zwin`) },
      naZwin: (i) => { rozwiniety = null; rysuj(`button[data-pomieszczenie="${i}"]`) },
      naMetraz: (i, wartosc) => poZmianie(zapisz((w) => ustawMetraz(w, i, wartosc)), () => odswiezStopke(kontener, rama)),
      naNazwe(i, wartosc, elementPola, tytul) {
        const blad = zapisz((w) => zmienNazwe(w, i, wartosc))
        if (blad !== null && blad !== BLAD_NAZWY) return pokazBlad(blad)
        ustawBlad(elementPola, blad)
        if (blad === null) tytul.textContent = wartosc.trim()
      },
      naBrud: (i, brudId, poziom) => poZmianie(zapisz((w) => ustawBrud(w, i, brudId, poziom)), () => rysuj(`input[name="brud-${i}-${brudId}"]:checked`)),
      naWszystkieBrudy: (i, brudId) => { czyWszystkieBrudy = true; rysuj(`input[name="brud-${i}-${brudId}"]:checked`) },
      naUsun: (i) => poZmianie(zapisz((w) => usunPomieszczenie(w, i)), () => { rozwiniety = null; rysuj(FOKUS_DODAJ) }),
    }

    /** @param {string} typ */
    function handleDodaj(typ) {
      const zOdpowiedzi = (/** @type {WejscieWyceny} */ w) => (pytania ? brudOdpowiedzi({ wejscie: w, odpowiedzi: wycena.odpowiedzi }, pytania) : [])
      poZmianie(zapisz((w) => dodajPomieszczenie(w, typ, katalog, { brudOdpowiedzi: zOdpowiedzi(w) })), () => {
        rozwiniety = (wycena.wejscie.pomieszczenia ?? []).length - 1
        czyWszystkieBrudy = false
        rysuj(`#metraz-${rozwiniety}`)
      })
    }

    function handleOtworzTypy() {
      const dialog = arkusz({ tytul: 'Dodaj pomieszczenie' }, karta({ klasa: 'karta--bez-odstepu' },
        zestaw.map((n) => wiersz({ tytul: n.nazwa, naKlik: () => { dialog.close(); handleDodaj(n.id) } }))))
      dialog.addEventListener('close', () => dialog.remove())
      document.body.append(dialog)
      dialog.showModal()
    }

    /** @param {string} wariantId */
    function handleWariant(wariantId) {
      try {
        wycena = zmienWybor(kontekst, wycena.id, { uslugaId: usluga.id, wariantId, wojewodztwoId: wycena.wejscie.wojewodztwoId ?? null })
        komunikat.replaceChildren()
      } catch (blad) {
        pokazBlad(tekstBledu(blad))
      }
      rysuj('input[name="kreator-wariant"]:checked')
    }

    /** @returns {string | undefined} „{m²} · ok. {czas z tempem}” albo undefined (stopka z „Razem”) */
    function opisStopki() {
      try {
        const podsumowanie = podsumowanieZakresu(wycena.wejscie, katalog, tempo)
        return podsumowanie.m2 > 0 ? `${m2(podsumowanie.m2)} · ok. ${czas(podsumowanie.minutyZTempem)}` : undefined
      } catch (blad) {
        if (!(blad instanceof BladWejscia) && !(blad instanceof BladKatalogu)) throw blad
        reportError(blad)
        return undefined
      }
    }

    function trescKroku() {
      const pomieszczenia = wycena.wejscie.pomieszczenia ?? []
      const warianty = usluga.warianty ?? []
      /** @param {PomieszczenieWyceny} p @param {number} i */
      const kartaPomieszczenia = (p, i) => {
        const opcje = { katalog, nazwaTypu, czyWszystkieBrudy, akcje }
        return h('li', null, i === rozwiniety ? kartaRozwinieta(i, p, opcje) : kartaZwinieta(i, p, opcje))
      }
      return [
        wycena.szybka ? baner({ rodzaj: 'info', tekst: tekstPrzeniesienia(opisPrzeniesienia(wycena.wejscie)) }) : null,
        warianty.length === 0 ? null : chipy({ id: 'kreator-wariant', etykieta: 'Wariant', wybrana: wycena.wejscie.wariantId ?? null,
          opcje: warianty.map((w) => ({ wartosc: w.id, etykieta: w.nazwa })), naZmiane: handleWariant }),
        pomieszczenia.length === 0
          ? h('p', { class: 'kreator-pomieszczenia__pusto' }, PUSTA_LISTA)
          : h('ul', { class: 'lista-pomieszczen' }, pomieszczenia.map(kartaPomieszczenia)),
        komunikat,
        h('div', { class: 'kreator-pomieszczenia__dodaj' },
          przycisk({ tekst: '+ Dodaj pomieszczenie', rodzaj: 'tekstowy', naKlik: handleOtworzTypy })),
      ].filter((element) => element !== null)
    }

    const handleDalej = () => nawiguj(adresKroku('dodatki', wycena.id))
    /** @param {Node[]} tresc */
    const rama = (tresc) => ramaKroku({ krok: 'zakres', wycena, katalog, tresc, naDalej: handleDalej, opisKwoty: opisStopki() })

    /** @param {string} [fokus] selektor elementu do fokusu po narysowaniu */
    function rysuj(fokus) {
      kontener.replaceChildren(...rama(trescKroku()).elementy)
      const element = fokus ? kontener.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    rysuj()
  },
}
