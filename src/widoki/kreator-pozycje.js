// Krok zakresu kreatora dla uslug w trybie pozycji (`#/kreator/zakres?wycena=<id>`, makieta kreator-pozycje): uslugi m² z progami
// maja licznik powierzchni (krok 5 m²), baner progu metrazu, karte „Pozycje” z przelacznikami i notke o materiale i minimum;
// okna, tapicerka i dywany — liczniki pozycji. Chipy zabrudzenia przy `poziomy_brudu`, stopka z „Razem” i „Dalej”.
// Zmiany ida przez src/kreator/pozycje.js i `zapisKroku` (src/widoki/kreator-wspolne.js); kwoty linii bierze z migawki wyniku
// (silnik), widok tylko rysuje.

import {
  cenaZaJednostke, infoProgu, MAKS_ILOSCI, powierzchnia, przelaczPozycje, ustawIlosc, ustawPoziomBrudu, ustawPowierzchnie,
} from '../kreator/pozycje.js'
import { czyPozycjeZPowierzchnia, pozycjeGlowne } from '../kreator/stan.js'
import { kwotaJednostki, m2, nazwaJednostki, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { chipy, licznik, ustawBlad } from '../ui/komponenty/formularz.js'
import { baner, karta } from '../ui/komponenty/uklad.js'
import { adresKroku, BLAD_ILOSCI, odswiezStopke, pokazKomunikat, ramaKroku, wycenaKroku, zapisKroku } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/cena.js').LiniaWyceny} LiniaWyceny */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/** @typedef {import('../silnik/katalog.js').Pozycja} Pozycja */
/** @typedef {import('../kreator/pozycje.js').InfoProgu} InfoProgu */
/** @typedef {(tresc: Node[]) => import('./kreator-wspolne.js').RamaKroku} RamaKrokuFn */
/**
 * @typedef {{ wycena: Wycena, usluga: Usluga, katalog: Katalog, naPrzelacz: (pozycjaId: string, czyWlaczona: boolean) => void }} OpcjeKartyPozycji
 */

const BRAK_POZYCJI = 'Wybierz co najmniej jedną pozycję.'
const KROK_POWIERZCHNI = 5
const PROCENT = 100
/** @type {ReadonlyMap<string, string>} oczekiwane bledy wpisu (bez zglaszania) */
const TEKSTY_BLEDOW = new Map([['ilosc', BLAD_ILOSCI], ['brak_pozycji_glownej', BRAK_POZYCJI]])

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
      if (blad !== null && blad !== BLAD_ILOSCI) return cofnijLiczniki(pole, blad)
      ustawBlad(pole, blad)
      if (blad === null) rysujZmienne()
    }

    /**
     * Odmowa zapisu (np. pusty zakres wyceny z numerem): licznik ma juz nowa wartosc, wiec krok rysuje sie od nowa z zapisanej wyceny.
     * @param {HTMLElement} pole licznik, ktory dostaje z powrotem fokus @param {string} blad
     */
    function cofnijLiczniki(pole, blad) {
      const id = pole.querySelector('input')?.id
      rysuj()
      const element = id ? kontener.querySelector(`#${CSS.escape(id)}`) : null
      if (element instanceof HTMLElement) element.focus()
      pokazBlad(blad)
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
