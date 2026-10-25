// Pierwszy krok kreatora dokladnej wyceny (`#/kreator/usluga`, opcjonalnie `?wycena=<id>`, makieta kreator-wybor-uslugi):
// wojewodztwo (podpowiedziane z ustawien) ze stawka, uslugi w dwoch grupach wg trybu z podpowiedzia ceny z silnika, warianty biur.
// „Dalej” tworzy szkic albo zapisuje zmiane wyboru i przechodzi do kroku zakresu.

import { wczytajStan } from '../dane/magazyn.js'
import { ustawieniaDomyslne } from '../dane/ustawienia.js'
import { BladWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import { podpowiedzCeny } from '../kreator/podpowiedzi.js'
import { czyZmianaCzysciZakres, nowySzkic, zmienWybor } from '../kreator/stan.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { kwotaJednostki, m2, nazwaJednostki, tekstLiczby, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { chipy, przycisk } from '../ui/komponenty/formularz.js'
import { arkusz, baner, dialogPotwierdzenia, karta, wiersz } from '../ui/komponenty/uklad.js'
import { adresKroku, ramaKroku, wycenaKroku, zglosBladKreatora } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/podpowiedzi.js').PodpowiedzCeny} PodpowiedzCeny */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/** @typedef {{ uslugaId: string | null, wariantId: string | null, wojewodztwoId: string | null }} Wybor */

const NAZWA_POLA_USLUGI = 'kreator-usluga'
const FOKUS_USLUGI = `input[name="${NAZWA_POLA_USLUGI}"]:checked`
const FOKUS_WOJEWODZTWA = '[data-pole="wojewodztwo"]'
const SREDNIA_KRAJOWA = ''
const GRUPY = Object.freeze([
  { tryb: 'pomieszczenia', tytul: 'Dom i biuro – wycena z pomieszczeń' },
  { tryb: 'pozycje', tytul: 'Wycena z pozycji – ilość lub metraż' },
])
const ZMIANA_USLUGI = 'Zmiana usługi wyczyści wpisane pomieszczenia i pozycje oraz dodatki, których nowa usługa nie ma. Zmienić?'
const BRAK_USLUGI = 'Wybierz usługę, żeby przejść dalej.'

/** @param {PodpowiedzCeny} p @returns {string} */
function tekstPodpowiedzi(p) {
  if (p.rodzaj === 'metraz') return `${m2(p.m2)} ok. ${zl(p.kwota)}`
  if (p.rodzaj === 'za_m2') return `ok. ${kwotaJednostki(p.kwota)}/m²`
  if (p.rodzaj === 'warianty') return 'jednorazowo albo abonament'
  return `od ${kwotaJednostki(p.kwota)}/${nazwaJednostki(p.jednostka)}`
}

/** @param {Kontekst} kontekst @param {Usluga} usluga @param {string | null} wojewodztwoId @returns {string | null} */
function podpowiedz(kontekst, usluga, wojewodztwoId) {
  try {
    return tekstPodpowiedzi(podpowiedzCeny(kontekst.katalog, usluga.id, wojewodztwoId))
  } catch (blad) {
    if (!(blad instanceof BladWejscia) && !(blad instanceof BladKatalogu)) throw blad
    reportError(blad)
    return null
  }
}

/** @param {Wycena | null} w @param {string | null} domyslneWojewodztwo @returns {Wybor} */
function wyborPoczatkowy(w, domyslneWojewodztwo) {
  if (!w) return { uslugaId: null, wariantId: null, wojewodztwoId: domyslneWojewodztwo }
  return { uslugaId: w.wejscie.uslugaId, wariantId: w.wejscie.wariantId ?? null, wojewodztwoId: w.wejscie.wojewodztwoId ?? null }
}

/**
 * Arkusz wyboru wojewodztwa: 16 wojewodztw i srednia krajowa jako chipy; „Wybierz” zamyka arkusz i oddaje wybor.
 * @param {Kontekst} kontekst @param {string | null} obecne @param {(id: string | null) => void} naWybor
 */
function otworzWyborWojewodztwa(kontekst, obecne, naWybor) {
  const { katalog } = kontekst
  let wybrane = obecne ?? SREDNIA_KRAJOWA
  const opcje = [
    ...katalog.wojewodztwa.flatMap((w) => (w.id === null ? [] : [{ wartosc: w.id, etykieta: w.nazwa }])),
    { wartosc: SREDNIA_KRAJOWA, etykieta: katalog.wojewodztwo(null).nazwa },
  ]
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true },
    chipy({ id: 'kreator-wojewodztwo', etykieta: 'Województwo', opcje, wybrana: wybrane, naZmiane: (w) => { wybrane = w } }),
    przycisk({ tekst: 'Wybierz', typ: 'submit' }))
  const dialog = arkusz({ tytul: 'Województwo' }, formularz)
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    dialog.close()
    naWybor(wybrane === SREDNIA_KRAJOWA ? null : wybrane)
  })
  dialog.addEventListener('close', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  const zaznaczone = formularz.querySelector('input:checked') ?? formularz.querySelector('input')
  if (zaznaczone instanceof HTMLElement) zaznaczone.focus()
}

/** @type {Widok} */
export const widokKreatoraUslugi = {
  render(kontener, { zapytanie, kontekst }) {
    const { magazyn, katalog, domyslne, nawiguj } = kontekst
    const id = zapytanie.wycena ?? null
    const zapisana = id === null ? null : wycenaKroku(kontener, zapytanie, kontekst)
    if (id !== null && !zapisana) return
    const stan = wczytajStan(magazyn)
    const ustawienia = stan.ustawienia ?? ustawieniaDomyslne(domyslne)
    const komunikat = h('div', { class: 'kreator__komunikat', 'aria-live': 'polite' })
    let wybor = wyborPoczatkowy(zapisana, ustawienia.wojewodztwoId)
    let czyWToku = false
    let czyAktywny = true

    /** @param {string} tekst */
    const pokazBlad = (tekst) => komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))

    /** @param {Partial<Wybor>} zmiana @param {string} fokus */
    function zmienWyborEkranu(zmiana, fokus) {
      wybor = { ...wybor, ...zmiana }
      komunikat.replaceChildren()
      rysuj(fokus)
    }

    /** @param {Usluga} usluga */
    function handleWyborUslugi(usluga) {
      if (usluga.id === wybor.uslugaId) return
      zmienWyborEkranu({ uslugaId: usluga.id, wariantId: usluga.warianty?.[0]?.id ?? null }, FOKUS_USLUGI)
    }

    /** @param {Usluga} usluga @returns {Node[]} opcja uslugi, a pod wybrana usluga z wariantami — chipy wariantow */
    function opcjaUslugi(usluga) {
      const czyWybrana = usluga.id === wybor.uslugaId
      const opis = podpowiedz(kontekst, usluga, wybor.wojewodztwoId)
      const opcja = h('label', { class: 'opcja-uslugi' },
        h('input', { type: 'radio', name: NAZWA_POLA_USLUGI, value: usluga.id, class: 'opcja-uslugi__wejscie', checked: czyWybrana,
          on: { change: () => handleWyborUslugi(usluga) } }),
        h('span', { class: 'opcja-uslugi__tresc' },
          h('span', { class: 'opcja-uslugi__tytul' }, usluga.nazwa),
          opis ? h('span', { class: 'opcja-uslugi__opis liczba' }, opis) : null))
      const warianty = usluga.warianty ?? []
      if (!czyWybrana || warianty.length === 0) return [opcja]
      return [opcja, h('div', { class: 'opcja-uslugi__warianty' }, chipy({
        id: 'kreator-wariant', etykieta: 'Wariant', opcje: warianty.map((w) => ({ wartosc: w.id, etykieta: w.nazwa })), wybrana: wybor.wariantId,
        naZmiane: (wariantId) => zmienWyborEkranu({ wariantId }, 'input[name="kreator-wariant"]:checked'),
      }))]
    }

    function trescKroku() {
      const wojewodztwo = katalog.wojewodztwo(wybor.wojewodztwoId)
      const wierszWojewodztwa = wiersz({ tytul: 'Województwo', wartosc: `${wojewodztwo.nazwa} · ${tekstLiczby(wojewodztwo.stawka_h)} zł/h`,
        naKlik: () => otworzWyborWojewodztwa(kontekst, wybor.wojewodztwoId, (wojewodztwoId) => zmienWyborEkranu({ wojewodztwoId }, FOKUS_WOJEWODZTWA)) })
      wierszWojewodztwa.dataset.pole = 'wojewodztwo'
      const wybieralne = katalog.uslugi.filter((u) => !u.tylko_dodatek)
      const grupy = GRUPY.map(({ tryb, tytul }) => ({ tytul, uslugi: wybieralne.filter((u) => u.tryb === tryb) }))
        .filter((g) => g.uslugi.length > 0)
        .map((g) => h('fieldset', { class: 'lista-uslug' },
          h('legend', { class: 'lista-uslug__tytul' }, g.tytul),
          h('div', { class: 'lista-uslug__opcje' }, g.uslugi.flatMap(opcjaUslugi))))
      return [
        karta({ klasa: 'karta--bez-odstepu' }, wierszWojewodztwa),
        ...grupy,
        katalog.uslugi.some((u) => u.tylko_dodatek) ? h('p', { class: 'kreator-usluga__notka' }, 'AGD, szafki i balkon dodasz w kroku „Dodatki”.') : null,
        komunikat,
      ].filter((element) => element !== null)
    }

    /**
     * Zapis wyboru: nowy szkic albo zmiana zapisanej wyceny (inna usluga przy wpisanym zakresie albo dodatkach spoza jej listy — po potwierdzeniu).
     * @param {Wybor & { uslugaId: string }} doZapisu
     * @returns {Promise<string | null>} id wyceny albo null, gdy uzytkownik nie potwierdzil zmiany uslugi
     */
    async function zapiszWybor(doZapisu) {
      if (id === null) return nowySzkic(kontekst, doZapisu).id
      const obecna = znajdzWycene(wczytajStan(magazyn), id)
      if (!obecna) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
      const { uslugaId, wariantId = null, wojewodztwoId = null } = obecna.wejscie
      if (uslugaId === doZapisu.uslugaId && wariantId === doZapisu.wariantId && wojewodztwoId === doZapisu.wojewodztwoId) return id
      if (czyZmianaCzysciZakres(obecna, doZapisu.uslugaId, kontekst.katalog)) {
        const czyZmienic = await dialogPotwierdzenia({ tytul: 'Zmienić usługę?', tresc: ZMIANA_USLUGI, potwierdz: 'Zmień usługę' })
        if (!czyZmienic || !czyAktywny) return null
      }
      zmienWybor(kontekst, id, doZapisu)
      return id
    }

    async function handleDalej() {
      if (czyWToku) return
      const { uslugaId } = wybor
      if (uslugaId === null) {
        pokazBlad(BRAK_USLUGI)
        const pierwsza = kontener.querySelector(`input[name="${NAZWA_POLA_USLUGI}"]`)
        if (pierwsza instanceof HTMLElement) pierwsza.focus()
        return
      }
      czyWToku = true
      try {
        const docelowa = await zapiszWybor({ ...wybor, uslugaId })
        if (docelowa !== null && czyAktywny) return nawiguj(adresKroku('zakres', docelowa))
      } catch (blad) {
        pokazBlad(zglosBladKreatora(blad))
      }
      czyWToku = false
    }

    /** @param {string} [fokus] selektor elementu do fokusu po narysowaniu */
    function rysuj(fokus) {
      const { elementy } = ramaKroku({ krok: 'usluga', wycena: zapisana, katalog, tresc: trescKroku(), naDalej: () => void handleDalej() })
      kontener.replaceChildren(...elementy)
      const element = fokus ? kontener.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    rysuj()
    return () => { czyAktywny = false }
  },
}
