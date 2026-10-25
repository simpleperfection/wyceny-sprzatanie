// Krok zakresu kreatora dla uslug w trybie pozycji (`#/kreator/zakres?wycena=<id>`, makieta kreator-pozycje): uslugi m² z progami
// maja licznik powierzchni (krok 5 m²), baner progu metrazu, karte „Pozycje” z przelacznikami i notke o materiale i minimum;
// okna, tapicerka i dywany — liczniki pozycji. Chipy zabrudzenia przy `poziomy_brudu`, stopka z „Razem” i „Dalej”.
// Zmiany ida przez src/kreator/pozycje.js i `zmienWejscie`; kwoty linii bierze z migawki wyniku (silnik), widok tylko rysuje.
// Ten modul wybiera tez widok trasy `#/kreator/zakres` po trybie uslugi i daje wspolne elementy krokow z pozycjami i dodatkami.

import { wczytajStan } from '../dane/magazyn.js'
import { BladWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import {
  cenaZaJednostke, infoProgu, MAKS_ILOSCI, powierzchnia, przelaczPozycje, ustawIlosc, ustawPoziomBrudu, ustawPowierzchnie,
} from '../kreator/pozycje.js'
import { czyPozycjeZPowierzchnia, pozycjeGlowne, zmienWejscie } from '../kreator/stan.js'
import { BladWejscia } from '../silnik/bledy.js'
import { m2, zl, zlGr } from '../ui/format.js'
import { h } from '../ui/h.js'
import { chipy, licznik, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { baner, karta, naglowek } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import { widokKreatoraPomieszczen } from './kreator-pomieszczenia.js'
import { adresKroku, ramaKroku, zglosBladKreatora } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/cena.js').LiniaWyceny} LiniaWyceny */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/** @typedef {import('../silnik/katalog.js').Pozycja} Pozycja */
/** @typedef {import('../kreator/pozycje.js').InfoProgu} InfoProgu */
/**
 * @typedef {{ zapisz: (fn: (w: WejscieWyceny) => WejscieWyceny) => string | null, pokazBlad: (tekst: string) => void,
 *   komunikat: HTMLElement }} ZapisKroku
 * @typedef {{ wycena: Wycena, usluga: Usluga, katalog: Katalog, naPrzelacz: (pozycjaId: string, czyWlaczona: boolean) => void }} OpcjeKartyPozycji
 */

/** Tekst bledu ilosci i powierzchni (licznik i zapis). */
export const BLAD_ILOSCI = 'Wpisz liczbę od 0 do 100 000.'
const BRAK_POZYCJI = 'Wybierz co najmniej jedną pozycję.'
const NIEAKTUALNA = 'Wycena zmieniła się w innej karcie przeglądarki. Widzisz teraz aktualne dane.'
const KOD_NIEAKTUALNEJ = 'nieaktualna'
const KROK_POWIERZCHNI = 5
const GROSZE = 100
const PROCENT = 100
const JEDNOSTKI = Object.freeze({ m2: 'm²', szt: 'szt.' })
/** @type {ReadonlyMap<string, string>} oczekiwane bledy wpisu (bez zglaszania) */
const TEKSTY_BLEDOW = new Map([['ilosc', BLAD_ILOSCI], ['brak_pozycji_glownej', BRAK_POZYCJI]])

/** @param {number} kwota @returns {string} „30 zł” albo „7,50 zł” */
export function kwotaJednostki(kwota) {
  const wGroszach = Math.round(kwota * GROSZE) / GROSZE
  return Number.isInteger(wGroszach) ? zl(wGroszach) : zlGr(wGroszach)
}

/** @param {string} jednostka @returns {string} „m²”, „szt.” albo jednostka z danych */
export const nazwaJednostki = (jednostka) => (jednostka === 'm2' || jednostka === 'szt' ? JEDNOSTKI[jednostka] : jednostka)

/** @param {HTMLElement} kontener @param {string} tekst @param {{ tekst: string, adres: string }} akcja */
function pokazKomunikat(kontener, tekst, akcja) {
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
 * @param {{ kontekst: Kontekst, wycena: () => Wycena, naZapis: (w: Wycena) => void, naNieaktualnej: (w: Wycena) => void,
 *   naEkranie: (w: WejscieWyceny) => string, teksty: ReadonlyMap<string, string> }} opcje
 * @returns {ZapisKroku}
 */
export function zapisKroku({ kontekst, wycena, naZapis, naNieaktualnej, naEkranie, teksty }) {
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
    return NIEAKTUALNA
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

  return { zapisz, pokazBlad, komunikat }
}

/** @param {number} mnoznik @returns {string} „+15%” albo „−30%” */
const tekstMnoznika = (mnoznik) => `${mnoznik > 1 ? '+' : '−'}${Math.round(Math.abs(mnoznik - 1) * PROCENT)}%`

/** @param {InfoProgu | null} info @returns {string | null} */
function tekstProgu(info) {
  if (!info) return null
  const procent = Math.round(Math.abs(info.mnoznik - 1) * PROCENT)
  if (info.mnoznik < 1) return `Duże zlecenie (od ${m2(info.od)}): cena za m² −${procent}%.`
  return info.do === null ? null : `Małe zlecenie (do ${m2(info.do)}): cena za m² +${procent}%.`
}

/** @param {Wycena} wycena @param {Usluga} usluga @param {Pozycja} pozycja @returns {LiniaWyceny[]} linie pozycji z migawki (pozycja albo doplata, material) */
const liniePozycji = (wycena, usluga, pozycja) => (wycena.wynik?.linie ?? []).filter((l) => l.klucz === `${usluga.id}.${pozycja.id}` && l.rodzaj !== 'dodatek')

/** @param {Pozycja} pozycja @param {LiniaWyceny | undefined} linia @param {number} cenaJedn cena × wsp (bez linii) @returns {string} */
function opisPozycji(pozycja, linia, cenaJedn) {
  const material = pozycja.doliczaj_material ? ' + impregnat' : ''
  const czyDoplata = pozycja.typ === 'doplata'
  if (!linia) return `${czyDoplata && !material ? 'dopłata · ' : ''}${kwotaJednostki(cenaJedn)}/m²${material}`
  const iloczyn = `${m2(linia.ilosc)} × ${kwotaJednostki(linia.cenaJedn)}`
  if (czyDoplata) return `dopłata · ${iloczyn}${material}`
  if (linia.mnoznikProgu === 1) return iloczyn
  return `${iloczyn} (${kwotaJednostki(linia.cenaJedn / linia.mnoznikProgu)} ${tekstMnoznika(linia.mnoznikProgu)})`
}

/** @param {Pozycja} pozycja @param {OpcjeKartyPozycji & { czyJedynaGlowna: boolean }} opcje @returns {HTMLElement} */
function wierszPozycji(pozycja, { wycena, usluga, katalog, naPrzelacz, czyJedynaGlowna }) {
  const czyWlaczona = (wycena.wejscie.pozycje ?? []).some((p) => p.id === pozycja.id)
  const linia = liniePozycji(wycena, usluga, pozycja).find((l) => l.rodzaj !== 'material')
  const idPola = `pozycja-${pozycja.id}`
  const opis = opisPozycji(pozycja, czyWlaczona ? linia : undefined,
    cenaZaJednostke(katalog, usluga.id, pozycja.id, wycena.wejscie.wojewodztwoId ?? null))
  const przelacznik = czyJedynaGlowna ? null : h('input', {
    type: 'checkbox', role: 'switch', id: idPola, class: 'przelacznik__wejscie', checked: czyWlaczona, 'aria-describedby': `${idPola}-opis`,
    on: { change: (zdarzenie) => naPrzelacz(pozycja.id, zdarzenie.currentTarget instanceof HTMLInputElement && zdarzenie.currentTarget.checked) },
  })
  const nazwa = czyJedynaGlowna ? h('span', { class: 'wiersz-pozycji__nazwa' }, pozycja.nazwa)
    : h('label', { class: 'wiersz-pozycji__nazwa', for: idPola }, pozycja.nazwa)
  return h('div', { class: ['wiersz-pozycji', !czyWlaczona && 'wiersz-pozycji--wylaczona'] },
    przelacznik,
    h('span', { class: 'wiersz-pozycji__tresc' }, nazwa, h('span', { class: 'wiersz-pozycji__opis', id: `${idPola}-opis` }, opis)),
    h('span', { class: 'wiersz-pozycji__kwota liczba' }, czyWlaczona && linia ? zl(linia.kwota) : '–'))
}

/** @param {OpcjeKartyPozycji} opcje @returns {Node[]} baner progu, karta „Pozycje” i notka o materiale i minimum */
function trescPowierzchni(opcje) {
  const { wycena, usluga, katalog } = opcje
  const tekst = tekstProgu(infoProgu(usluga, powierzchnia(wycena.wejscie), katalog))
  const czyJedynaGlowna = pozycjeGlowne(usluga).length === 1
  const wiersze = (usluga.pozycje ?? []).map((p) => wierszPozycji(p, { ...opcje, czyJedynaGlowna: czyJedynaGlowna && p.typ !== 'doplata' }))
  const wlaczone = new Set((wycena.wejscie.pozycje ?? []).map((p) => p.id))
  const materialy = (usluga.pozycje ?? []).filter((p) => p.doliczaj_material)
  const material = materialy.find((p) => wlaczone.has(p.id)) ?? materialy[0]
  const minimum = usluga.minimum_zl === undefined ? '' : `Minimum zlecenia: ${zl(usluga.minimum_zl)}.`
  const oMaterial = material ? `Impregnat doliczamy klientowi osobno (ok. ${kwotaJednostki(material.koszt_chemii_m2 ?? 0)}/m²). ` : ''
  return [
    tekst ? baner({ rodzaj: 'info', tekst }) : null,
    karta({ tytul: 'Pozycje', klasa: 'karta-pozycji' }, wiersze),
    oMaterial || minimum ? h('p', { class: 'kreator-pozycje__notka' }, `${oMaterial}${minimum}`.trim()) : null,
  ].filter((element) => element !== null)
}

/** @param {Wycena} wycena @param {Katalog} katalog @param {(w: number) => void} naZmiane @returns {Node | null} chipy „Zabrudzenie” */
function chipyBrudu(wycena, katalog, naZmiane) {
  if (!katalog.usluga(wycena.wejscie.uslugaId).poziomy_brudu) return null
  return chipy({ id: 'kreator-brud', etykieta: 'Zabrudzenie', wybrana: String(wycena.wejscie.poziomBrudu ?? 1),
    opcje: katalog.poziomyBrudu.map((p) => ({ wartosc: String(p.poziom), etykieta: p.nazwa })), naZmiane: (w) => naZmiane(Number(w)) })
}

/** @param {HTMLElement} kontener @param {RamaKrokuFn} rama */
function odswiezStopke(kontener, rama) {
  const nowa = rama([]).elementy.at(-1)
  const stara = kontener.querySelector('.stopka-kreatora')
  if (stara && nowa) stara.replaceWith(nowa)
}
/** @typedef {(tresc: Node[]) => import('./kreator-wspolne.js').RamaKroku} RamaKrokuFn */

/** @type {Widok} */
export const widokKreatoraPozycji = {
  render(kontener, { zapytanie, kontekst }) {
    const { katalog, nawiguj } = kontekst
    const poczatkowa = wycenaKroku(kontener, zapytanie, kontekst)
    if (!poczatkowa) return
    const usluga = katalog.usluga(poczatkowa.wejscie.uslugaId)
    if (usluga.tryb !== 'pozycje') {
      return pokazKomunikat(kontener, 'Tej usługi nie wycenia się z pozycji.', { tekst: 'Zmień usługę', adres: adresKroku('usluga', poczatkowa.id) })
    }
    const czyPowierzchnia = czyPozycjeZPowierzchnia(usluga)
    let wycena = poczatkowa
    const zmienna = h('div', { class: 'kreator-pozycje__zmienne' })
    const { zapisz, pokazBlad, komunikat } = zapisKroku({
      kontekst, wycena: () => wycena, teksty: TEKSTY_BLEDOW, naZapis: (w) => { wycena = w },
      naEkranie: (w) => JSON.stringify([w.pozycje ?? [], w.poziomBrudu ?? null]),
      naNieaktualnej: (w) => { wycena = w; rysuj() },
    })
    /** @type {RamaKrokuFn} */
    const rama = (tresc) => ramaKroku({ krok: 'zakres', wycena, katalog, tresc, naDalej: () => nawiguj(adresKroku('dodatki', wycena.id)) })

    /** @param {string} [fokus] */
    function rysujZmienne(fokus) {
      const pusto = !czyPowierzchnia && !(wycena.wejscie.pozycje ?? []).some((p) => p.ilosc > 0)
      zmienna.replaceChildren(...(czyPowierzchnia ? trescPowierzchni({ wycena, usluga, katalog, naPrzelacz: handlePrzelacz }) : []),
        ...(pusto ? [h('p', { class: 'kreator-pozycje__notka' }, BRAK_POZYCJI)] : []))
      odswiezStopke(kontener, rama)
      const element = fokus ? kontener.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    /** @param {(w: WejscieWyceny) => WejscieWyceny} fn @param {HTMLElement} pole licznik z bledem pod spodem */
    function zapiszLicznik(fn, pole) {
      const blad = zapisz(fn)
      if (blad !== null && blad !== BLAD_ILOSCI) return pokazBlad(blad)
      ustawBlad(pole, blad)
      if (blad === null) rysujZmienne()
    }

    /** @param {string} pozycjaId @param {boolean} czyWlaczona */
    function handlePrzelacz(pozycjaId, czyWlaczona) {
      const blad = zapisz((w) => przelaczPozycje(w, pozycjaId, czyWlaczona, katalog))
      rysujZmienne(`#pozycja-${pozycjaId}`)
      if (blad !== null) pokazBlad(blad)
    }

    /** @param {number} poziom */
    function handleBrud(poziom) {
      const blad = zapisz((w) => ustawPoziomBrudu(w, poziom, katalog))
      if (blad !== null) return pokazBlad(blad)
      rysujZmienne('input[name="kreator-brud"]:checked')
    }

    function licznikPowierzchni() {
      const element = licznik({ id: 'powierzchnia', etykieta: 'Powierzchnia (m²)', wartosc: powierzchnia(wycena.wejscie), krok: KROK_POWIERZCHNI,
        jednostka: 'm²', max: MAKS_ILOSCI, tekstBledu: BLAD_ILOSCI, naZmiane: (m) => zapiszLicznik((w) => ustawPowierzchnie(w, m, katalog), element) })
      return element
    }

    /** @param {Pozycja} p */
    function licznikPozycji(p) {
      const ilosc = (wycena.wejscie.pozycje ?? []).find((x) => x.id === p.id)?.ilosc ?? 0
      const cena = cenaZaJednostke(katalog, usluga.id, p.id, wycena.wejscie.wojewodztwoId ?? null)
      const element = licznik({ id: `pozycja-${p.id}`, etykieta: p.nazwa, wartosc: ilosc, jednostka: nazwaJednostki(p.jednostka), max: MAKS_ILOSCI,
        tekstBledu: BLAD_ILOSCI, naZmiane: (n) => zapiszLicznik((w) => ustawIlosc(w, p.id, n, katalog), element) })
      return h('div', { class: 'licznik-pozycji' }, element,
        h('p', { class: 'licznik-pozycji__cena' }, `${kwotaJednostki(cena)}/${nazwaJednostki(p.jednostka)}`))
    }

    function rysuj() {
      const liczniki = czyPowierzchnia ? [licznikPowierzchni()] : (usluga.pozycje ?? []).map(licznikPozycji)
      const brud = chipyBrudu(wycena, katalog, handleBrud)
      kontener.replaceChildren(...rama([...liczniki, ...(brud ? [brud] : []), zmienna, komunikat]).elementy)
      rysujZmienne()
    }

    rysuj()
  },
}

/** @type {Widok} widok trasy `#/kreator/zakres`: uslugi w trybie pozycji — ten modul, pozostale (i brak wyceny) — krok pomieszczen */
export const widokKreatoraZakresu = {
  render(kontener, argumenty) {
    const id = argumenty.zapytanie.wycena ?? null
    const wycena = id === null ? null : znajdzWycene(wczytajStan(argumenty.kontekst.magazyn), id)
    const czyPozycje = wycena !== null && argumenty.kontekst.katalog.usluga(wycena.wejscie.uslugaId).tryb === 'pozycje'
    return (czyPozycje ? widokKreatoraPozycji : widokKreatoraPomieszczen).render(kontener, argumenty)
  },
}
