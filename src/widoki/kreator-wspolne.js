// Rama krokow kreatora dokladnej wyceny z makiet: naglowek „Nowa wycena” / „Wycena {numer}” ze strzalka wstecz i podtytulem
// „Krok n z 5 · …”, pasek postepu, tresc kroku i stopka z „Razem” (kroki zakresu i dodatkow) oraz „Dalej”. Do tego wybor
// widoku kroku z adresu `#/kreator/:krok`, teksty bledow zapisu i narzedzia wspolne dla wszystkich krokow: wycena kroku z adresu,
// komunikat zamiast kroku, zapis zmian kroku (z ochrona przed nadpisaniem zmian z innej karty) i odswiezenie stopki.

import { BladMagazynu, wczytajStan } from '../dane/magazyn.js'
import { BladWyceny, MAKS_WYCEN, wycena as znajdzWycene } from '../dane/wyceny.js'
import { MAKS_ILOSCI } from '../kreator/pozycje.js'
import { bledyKroku, KROKI_KREATORA, zmienWejscie } from '../kreator/stan.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { bladZakresu, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, naglowek, pasekPostepu } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/stan.js').KrokKreatora} KrokKreatora */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/**
 * @typedef {{ krok: KrokKreatora, wycena: Wycena | null, katalog: Katalog, tresc: Node[], naDalej: () => void,
 *   opisKwoty?: string }} OpcjeRamy opisKwoty: tekst nad kwota w stopce zamiast „Razem” (np. metraz i czas w kroku pomieszczen)
 * @typedef {{ elementy: Node[], dalej: HTMLButtonElement | HTMLAnchorElement }} RamaKroku
 * @typedef {{ zapisz: (fn: (w: WejscieWyceny) => WejscieWyceny) => string | null, pokazBlad: (tekst: string) => void,
 *   tekstBledu: (blad: unknown) => string, komunikat: HTMLElement }} ZapisKroku
 * @typedef {{ kontekst: Kontekst, wycena: () => Wycena, naZapis: (w: Wycena) => void, naNieaktualnej: (w: Wycena) => void,
 *   naEkranie: (w: WejscieWyceny) => string, teksty: ReadonlyMap<string, string>, nieaktualna?: string }} OpcjeZapisuKroku
 *   nieaktualna: tekst po odswiezeniu danych zmienionych w innej karcie (domyslnie NIEAKTUALNA)
 */

/** Tekst bledu ilosci pozycji, dodatku i powierzchni (licznik i zapis) z granic src/kreator/pozycje.js. */
export const BLAD_ILOSCI = bladZakresu({ min: 0, max: MAKS_ILOSCI })
/** Kroki ze stopka „Razem {kwota}” (makiety kreator-pomieszczenia, kreator-pozycje, kreator-dodatki). */
const KROKI_Z_KWOTA = new Set(['zakres', 'dodatki'])
/** @type {ReadonlyMap<string, string>} */
const TEKSTY_BLEDOW_WYCENY = new Map([
  ['tylko_odczyt', 'Ta wycena jest wykonana – można ją tylko przeglądać.'],
  ['brak_wyceny', 'Nie ma już tej wyceny. Mogła zostać usunięta w innej karcie przeglądarki.'],
  ['limit_wycen', `Masz już ${MAKS_WYCEN} zapisanych wycen. Usuń niepotrzebne, żeby dodać nową.`],
  ['pusty_zakres', 'Zapisana wycena musi mieć co najmniej jedno pomieszczenie albo pozycję.'],
])
const NIEAKTUALNA = 'Wycena zmieniła się w innej karcie przeglądarki. Widzisz teraz aktualne dane.'
const KOD_NIEAKTUALNEJ = 'nieaktualna'
const BLAD_ZAPISU_WYCENY = 'Nie udało się zapisać wyceny. Spróbuj jeszcze raz.'
const BLAD_LICZENIA = 'Nie udało się policzyć ceny dla tych danych. Sprawdź wybraną usługę i wpisany zakres.'

/** @param {KrokKreatora} krok */
const indeksKroku = (krok) => KROKI_KREATORA.findIndex((k) => k.id === krok)

/**
 * Adres kroku kreatora; z wycena — z zapytaniem `?wycena=<id>`.
 * @param {KrokKreatora} krok @param {string | null} [id]
 * @returns {string}
 */
export const adresKroku = (krok, id = null) => sciezka('kreator', { krok }, id ? { wycena: id } : {})

/** @param {KrokKreatora} krok @param {Wycena | null} wycena */
function adresWstecz(krok, wycena) {
  const poprzedni = KROKI_KREATORA[indeksKroku(krok) - 1]
  if (poprzedni) return adresKroku(poprzedni.id, wycena?.id)
  return wycena?.numer ? sciezka('wycena', { id: wycena.id }) : sciezka('start')
}

/** @param {KrokKreatora} krok @param {Wycena | null} wycena @param {Katalog} katalog */
function opisKroku(krok, wycena, katalog) {
  if (krok === 'zakres' && wycena) return katalog.usluga(wycena.wejscie.uslugaId).nazwa
  return KROKI_KREATORA[indeksKroku(krok)]?.etykieta.toLowerCase() ?? krok
}

/** @param {KrokKreatora} krok @param {Wycena | null} wycena @param {Katalog} katalog @param {string} opis @returns {HTMLElement | null} */
function razem(krok, wycena, katalog, opis) {
  if (!KROKI_Z_KWOTA.has(krok) || !wycena?.wynik || bledyKroku('zakres', wycena, katalog).length > 0) return null
  return h('p', { class: 'stopka-kreatora__razem' },
    h('span', { class: 'stopka-kreatora__etykieta' }, opis),
    h('span', { class: 'stopka-kreatora__kwota liczba' }, zl(wycena.wynik.cena)))
}

/**
 * Rama kroku: naglowek, pasek postepu, tresc i stopka. „Dalej” jest zablokowane, gdy krok ma bledy (`bledyKroku`) — poza
 * krokiem uslugi, ktory sprawdza wybor sam (wybor nie jest jeszcze zapisany w wycenie).
 * @param {OpcjeRamy} opcje
 * @returns {RamaKroku}
 */
export function ramaKroku({ krok, wycena, katalog, tresc, naDalej, opisKwoty = 'Razem' }) {
  const indeks = indeksKroku(krok)
  const czyZablokowany = krok !== 'usluga' && wycena !== null && bledyKroku(krok, wycena, katalog).length > 0
  const dalej = przycisk({ tekst: 'Dalej', naKlik: naDalej, czyWylaczony: czyZablokowany })
  return {
    dalej,
    elementy: [
      naglowek({
        tytul: wycena?.numer ? `Wycena ${wycena.numer}` : 'Nowa wycena',
        podtytul: `Krok ${indeks + 1} z ${KROKI_KREATORA.length} · ${opisKroku(krok, wycena, katalog)}`,
        wstecz: adresWstecz(krok, wycena),
      }),
      pasekPostepu(KROKI_KREATORA.map((k) => k.etykieta), indeks),
      h('div', { class: 'tresc kreator__tresc' }, tresc),
      h('div', { class: 'stopka-kreatora' }, razem(krok, wycena, katalog, opisKwoty), dalej),
    ],
  }
}

/**
 * Tekst bledu operacji kreatora dla uzytkownika. Odmowa (wycena wykonana, usunieta, limit wycen) ma wlasny tekst i nie jest
 * zglaszana; awaria zapisu albo liczenia ceny jest zglaszana przez `reportError`. Inne bledy leca dalej (ekran bledu routera).
 * @param {unknown} blad
 * @returns {string}
 */
export function zglosBladKreatora(blad) {
  if (blad instanceof BladWyceny) {
    const tekst = TEKSTY_BLEDOW_WYCENY.get(blad.kod)
    if (tekst) return tekst
    reportError(blad)
    return BLAD_ZAPISU_WYCENY
  }
  if (blad instanceof BladMagazynu) {
    reportError(blad)
    return tekstBleduZapisu(blad)
  }
  if (!(blad instanceof BladWejscia) && !(blad instanceof BladKatalogu)) throw blad
  reportError(blad)
  return BLAD_LICZENIA
}

/**
 * Widok trasy `#/kreator/:krok`: widok kroku z `widokiKrokow`, a nieznany krok — `nieZnaleziono`.
 * @param {Partial<Record<KrokKreatora, Widok>>} widokiKrokow @param {Widok} nieZnaleziono
 * @returns {Widok}
 */
export function widokKreatora(widokiKrokow, nieZnaleziono) {
  return {
    render(kontener, argumenty) {
      const krok = KROKI_KREATORA.find((k) => k.id === argumenty.parametry.krok)?.id
      const widok = (krok && widokiKrokow[krok]) || nieZnaleziono
      return widok.render(kontener, argumenty)
    },
  }
}

/**
 * Komunikat zamiast kroku (brak wyceny, wycena wykonana, usluga innego trybu) z jedna akcja.
 * @param {HTMLElement} kontener @param {string} tekst @param {{ tekst: string, adres: string }} akcja
 */
export function pokazKomunikat(kontener, tekst, akcja) {
  kontener.replaceChildren(
    naglowek({ tytul: 'Nowa wycena', wstecz: sciezka('start') }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst }), przycisk({ tekst: akcja.tekst, rodzaj: 'drugi', adres: akcja.adres })))
}

/**
 * Wycena kroku z `?wycena=<id>`; brak wyceny albo wycena wykonana rysuje komunikat i daje null.
 * @param {HTMLElement} kontener @param {Record<string, string>} zapytanie @param {Kontekst} kontekst
 * @returns {Wycena | null}
 */
export function wycenaKroku(kontener, zapytanie, kontekst) {
  const id = zapytanie.wycena ?? null
  const wycena = id === null ? null : znajdzWycene(wczytajStan(kontekst.magazyn), id)
  if (!wycena) {
    pokazKomunikat(kontener, 'Nie ma tej wyceny. Mogła zostać usunięta.', { tekst: 'Wróć na start', adres: sciezka('start') })
    return null
  }
  if (wycena.status !== 'wykonana') return wycena
  pokazKomunikat(kontener, 'Ta wycena jest wykonana – można ją tylko przeglądać.', { tekst: 'Pokaż wycenę', adres: sciezka('wycena', { id: wycena.id }) })
  return null
}

/**
 * Zapis zmian kroku: czesc wejscia z ekranu (`naEkranie`) zmieniona w innej karcie nie jest nadpisywana — widok dostaje
 * swieza wycene (`naNieaktualnej`) i komunikat. Oczekiwane bledy wpisu daja tekst z `teksty`, pozostale `zglosBladKreatora`.
 * @param {OpcjeZapisuKroku} opcje
 * @returns {ZapisKroku}
 */
export function zapisKroku({ kontekst, wycena, naZapis, naNieaktualnej, naEkranie, teksty, nieaktualna = NIEAKTUALNA }) {
  const komunikat = h('div', { class: 'kreator__komunikat', 'aria-live': 'polite' })
  /** @param {string} tekst */
  const pokazBlad = (tekst) => komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))

  /** @param {unknown} blad @returns {string} */
  function tekstBledu(blad) {
    const tekst = blad instanceof BladWejscia ? teksty.get(blad.kod) : undefined
    if (tekst) return tekst
    if (!(blad instanceof BladWyceny) || blad.kod !== KOD_NIEAKTUALNEJ) return zglosBladKreatora(blad)
    const swieza = znajdzWycene(wczytajStan(kontekst.magazyn), wycena().id)
    if (swieza) naNieaktualnej(swieza)
    return nieaktualna
  }

  /** @param {(w: WejscieWyceny) => WejscieWyceny} fn @returns {string | null} tekst bledu albo null po zapisie */
  function zapisz(fn) {
    const obecna = wycena()
    const widoczne = naEkranie(obecna.wejscie)
    try {
      naZapis(zmienWejscie(kontekst, obecna.id, (w) => {
        if (naEkranie(w) !== widoczne) throw new BladWyceny(KOD_NIEAKTUALNEJ, 'Wycena zmieniła się w innej karcie')
        return fn(w)
      }))
      komunikat.replaceChildren()
      return null
    } catch (blad) {
      return tekstBledu(blad)
    }
  }

  return { zapisz, pokazBlad, tekstBledu, komunikat }
}

/**
 * Nowa stopka kroku (np. „Razem” po zmianie ilosci) bez przerysowania tresci, zeby fokus zostal w polu.
 * @param {HTMLElement} kontener @param {(tresc: Node[]) => RamaKroku} rama
 */
export function odswiezStopke(kontener, rama) {
  const nowa = rama([]).elementy.at(-1)
  const stara = kontener.querySelector('.stopka-kreatora')
  if (stara && nowa) stara.replaceWith(nowa)
}
