// Podsumowanie wyceny (makieta podsumowanie-wyceny), dwa tryby: krok `cena` kreatora (`#/kreator/cena?wycena=<id>`) z paskiem
// postepu i „Zapisz” (arkusz z polem klienta → zapiszWycene: status `do_wyslania`, numer, przejscie do `#/wycena/<id>`) oraz
// zapisana wycena (`#/wycena/<id>`) z akcjami wg statusu (Edytuj, Klient przyjął, Klient zrezygnował, Usuń wycenę). Oba maja
// te same karty (src/widoki/podsumowanie-karty.js), reczna cene i baner „Przelicz”; wykonana wycena jest tylko do odczytu.
// Liczy src/kreator/podsumowanie.js, zapisuje src/dane/wyceny.js; widok tylko rysuje.

import { wczytajStan } from '../dane/magazyn.js'
import { BladWyceny, usunWycene, wycena as znajdzWycene, zapiszWycene, zmienStatus } from '../dane/wyceny.js'
import { akcjeWyceny, przeliczWycene, widokPodsumowania } from '../kreator/podsumowanie.js'
import { KROKI_KREATORA } from '../kreator/stan.js'
import { zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, dialogPotwierdzenia, naglowek, pasekPostepu } from '../ui/komponenty/uklad.js'
import { ETYKIETY_STATUSOW, pigulkaStatusu } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { wycenaKroku } from './kreator-pozycje.js'
import { adresKroku, zglosBladKreatora } from './kreator-wspolne.js'
import { banery, kartaCeny, kartaKosztow, kartaRynku, kartaZostaje, notkaPropozycji, otworzEdycjeCeny } from './podsumowanie-karty.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../ui/komponenty/uklad.js').OpcjeBanera} OpcjeBanera */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/podsumowanie.js').AkcjaWyceny} AkcjaWyceny */
/**
 * @typedef {'kreator' | 'zapisana'} TrybPodsumowania
 * @typedef {{ naStatus: (nowy: 'przyjeta' | 'odrzucona') => void, naUsun: (w: Wycena) => void }} ObslugaAkcji
 * @typedef {{ naPrzelicz: () => void, naZmien: (brutto: number) => void }} ObslugaKart
 */

const ZMIENIONA_W_INNEJ_KARCIE = 'Status tej wyceny zmienił się w innej karcie przeglądarki. Widzisz teraz aktualne dane.'
const ZA_DLUGI_KLIENT = 'Opis klienta jest za długi. Skróć go.'
const BRAK_CENY = 'Ta wycena nie ma jeszcze ceny. Dodaj zakres prac, żeby ją policzyć.'
const INDEKS_KROKU_CENY = KROKI_KREATORA.findIndex((k) => k.id === 'cena')
const REGION_KOMUNIKATU = '.podsumowanie__komunikat'

/** @param {Wycena} w @returns {string} „Wycena 1/10/2026 · Pani Test” albo „Nowa wycena” */
const podtytul = (w) => (w.numer ? [`Wycena ${w.numer}`, w.klient.nazwa].filter(Boolean).join(' · ') : 'Nowa wycena')

/** @param {unknown} blad @returns {string} tekst bledu zapisu; status zmieniony w innej karcie nie jest zglaszany */
const tekstBledu = (blad) => (blad instanceof BladWyceny && blad.kod === 'przejscie' ? ZMIENIONA_W_INNEJ_KARCIE : zglosBladKreatora(blad))

/** @template T @param {(T | null)[]} lista @returns {T[]} */
const bezPustych = (lista) => lista.filter((x) => x !== null)

/**
 * Arkusz „Zapisz”: opcjonalny klient, potem zapiszWycene (szkic → `do_wyslania` z numerem) i przejscie do zapisanej wyceny.
 * @param {Kontekst} kontekst @param {Wycena} w
 */
function otworzZapis({ magazyn, nawiguj }, w) {
  let nazwa = w.klient.nazwa
  const poleKlienta = pole({ id: 'podsumowanie-klient', etykieta: 'Klient (np. imię i dzielnica)', wartosc: nazwa, naZmiane: (t) => { nazwa = t } })
  const bladArkusza = h('div', { class: 'arkusz__komunikat', 'aria-live': 'polite' })
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true }, poleKlienta, bladArkusza, przycisk({ tekst: 'Zapisz', typ: 'submit' }))
  const dialog = arkusz({ tytul: 'Zapisz wycenę' }, formularz)
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    try {
      zapiszWycene(magazyn, w.id, { klient: { nazwa } })
      dialog.close()
      nawiguj(sciezka('wycena', { id: w.id }))
    } catch (blad) {
      if (blad instanceof BladWyceny && blad.kod === 'klient') return ustawBlad(poleKlienta, ZA_DLUGI_KLIENT)
      bladArkusza.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBledu(blad) }))
    }
  })
  dialog.addEventListener('close', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  poleKlienta.querySelector('input')?.focus()
}

/** @param {Wycena} w @param {AkcjaWyceny} akcja @param {ObslugaAkcji} obsluga @returns {HTMLElement} */
function przyciskAkcji(w, akcja, { naStatus, naUsun }) {
  if (akcja === 'edytuj') return przycisk({ tekst: 'Edytuj', rodzaj: 'drugi', adres: adresKroku('usluga', w.id) })
  if (akcja === 'przyjeta') return przycisk({ tekst: 'Klient przyjął', naKlik: () => naStatus('przyjeta') })
  if (akcja === 'odrzucona') return przycisk({ tekst: 'Klient zrezygnował', rodzaj: 'drugi', naKlik: () => naStatus('odrzucona') })
  const usun = przycisk({ tekst: 'Usuń wycenę', rodzaj: 'tekstowy', ikona: 'trash', naKlik: () => naUsun(w) })
  usun.classList.add('podsumowanie__usun')
  return usun
}

/**
 * Karty podsumowania; wycena bez ceny albo z migawka, ktorej nie da sie policzyc z biezacymi danymi — komunikat.
 * @param {Wycena} w @param {Kontekst} kontekst @param {TrybPodsumowania} tryb @param {ObslugaKart} obsluga
 * @returns {Node[]}
 */
function karty(w, kontekst, tryb, { naPrzelicz, naZmien }) {
  if (w.wynik === null) {
    return bezPustych([baner({ rodzaj: 'info', tekst: BRAK_CENY }),
      tryb === 'kreator' ? przycisk({ tekst: 'Przejdź do zakresu', rodzaj: 'drugi', adres: adresKroku('zakres', w.id) }) : null])
  }
  const czyEdytowalna = w.status !== 'wykonana'
  try {
    const widok = widokPodsumowania(w, kontekst)
    return bezPustych([...banery(widok.ostrzezenia, czyEdytowalna ? naPrzelicz : null),
      kartaCeny(widok, czyEdytowalna ? () => naZmien(widok.cena.brutto) : null), kartaRynku(widok.rynek, widok.cena.brutto),
      kartaZostaje(widok), kartaKosztow(widok.koszty), notkaPropozycji(widok.propozycje)])
  } catch (blad) {
    return [baner({ rodzaj: 'blad', tekst: zglosBladKreatora(blad) })]
  }
}

/**
 * Naglowek, pasek postepu (kreator), status (zapisana), region komunikatu, karty, akcje albo stopka z „Zapisz”.
 * @param {{ w: Wycena, kontekst: Kontekst, tryb: TrybPodsumowania, komunikat: OpcjeBanera | null, obslugaKart: ObslugaKart,
 *   obslugaAkcji: ObslugaAkcji }} opcje
 * @returns {Node[]}
 */
function elementyEkranu({ w, kontekst, tryb, komunikat, obslugaKart, obslugaAkcji }) {
  const czyKreator = tryb === 'kreator'
  return bezPustych([
    naglowek({ tytul: 'Podsumowanie', podtytul: podtytul(w), wstecz: czyKreator ? adresKroku('chemia', w.id) : sciezka('wyceny') }),
    czyKreator ? pasekPostepu(KROKI_KREATORA.map((k) => k.etykieta), INDEKS_KROKU_CENY) : null,
    h('div', { class: 'tresc podsumowanie' },
      czyKreator ? null : h('div', { class: 'podsumowanie__status' }, pigulkaStatusu(w.status)),
      h('div', { class: 'podsumowanie__komunikat', 'aria-live': 'polite', tabIndex: -1 }, komunikat ? baner(komunikat) : null),
      karty(w, kontekst, tryb, obslugaKart),
      czyKreator ? null : h('div', { class: 'podsumowanie__akcje' }, akcjeWyceny(w.status).map((a) => przyciskAkcji(w, a, obslugaAkcji)))),
    czyKreator ? h('div', { class: 'stopka-kreatora' }, przycisk({ tekst: 'Zapisz', naKlik: () => otworzZapis(kontekst, w) })) : null,
  ])
}

/**
 * Ekran podsumowania jednej wyceny; `rysuj` czyta swiezy stan, wiec po kazdej akcji widac zapisane dane.
 * @param {HTMLElement} kontener @param {Kontekst} kontekst @param {string} id @param {TrybPodsumowania} tryb
 * @returns {() => void} sprzatanie widoku
 */
function uruchomPodsumowanie(kontener, kontekst, id, tryb) {
  const { magazyn, nawiguj } = kontekst
  /** @type {OpcjeBanera | null} */
  let komunikat = null
  let czyAktywny = true
  let czyPytaOUsuniecie = false

  /** @param {() => OpcjeBanera} akcja zapis i komunikat sukcesu; blad zapisu daje komunikat bledu */
  function wykonaj(akcja) {
    try {
      komunikat = akcja()
    } catch (blad) {
      komunikat = { rodzaj: 'blad', tekst: tekstBledu(blad) }
    }
    rysuj(REGION_KOMUNIKATU)
  }

  /** @param {Wycena} w */
  async function handleUsun(w) {
    if (czyPytaOUsuniecie) return
    czyPytaOUsuniecie = true
    const tytul = w.numer ? `Usunąć wycenę ${w.numer}?` : 'Usunąć wycenę?'
    const czyUsunac = await dialogPotwierdzenia({ tytul, tresc: 'Tego nie można cofnąć.', potwierdz: 'Usuń wycenę', czyNiebezpieczne: true })
    czyPytaOUsuniecie = false
    if (!czyUsunac || !czyAktywny) return
    try {
      usunWycene(magazyn, id)
      nawiguj(sciezka('wyceny'))
    } catch (blad) {
      komunikat = { rodzaj: 'blad', tekst: tekstBledu(blad) }
      rysuj(REGION_KOMUNIKATU)
    }
  }

  /** @type {ObslugaKart} */
  const obslugaKart = {
    naPrzelicz: () => wykonaj(() => {
      const { stara, nowa } = przeliczWycene(kontekst, id)
      return { rodzaj: 'info', tekst: `Cena wynosiła ${zl(stara)}, teraz ${zl(nowa)}.` }
    }),
    naZmien: (brutto) => otworzEdycjeCeny({ kontekst, id, brutto, tekstBledu, naZmiane: () => rysuj(), naZamkniecie: () => rysuj('[data-akcja="zmien"]') }),
  }

  /** @type {ObslugaAkcji} */
  const obslugaAkcji = {
    naStatus: (nowy) => wykonaj(() => {
      zmienStatus(magazyn, id, nowy)
      return { rodzaj: 'sukces', tekst: `Status wyceny: ${ETYKIETY_STATUSOW[nowy]}.` }
    }),
    naUsun: (w) => void handleUsun(w),
  }

  /** @param {string} [fokus] selektor elementu do fokusu po narysowaniu */
  function rysuj(fokus) {
    if (!czyAktywny) return
    const w = znajdzWycene(wczytajStan(magazyn), id)
    if (!w) return pokazBrak(kontener)
    kontener.replaceChildren(...elementyEkranu({ w, kontekst, tryb, komunikat, obslugaKart, obslugaAkcji }))
    const element = fokus ? kontener.querySelector(fokus) : null
    if (element instanceof HTMLElement) element.focus()
  }

  rysuj()
  return () => { czyAktywny = false }
}

/** @param {HTMLElement} kontener */
function pokazBrak(kontener) {
  kontener.replaceChildren(
    naglowek({ tytul: 'Podsumowanie', wstecz: sciezka('wyceny') }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst: 'Nie ma tej wyceny. Mogła zostać usunięta.' }),
      przycisk({ tekst: 'Wróć do listy wycen', rodzaj: 'drugi', adres: sciezka('wyceny') })))
}

/** Krok `cena` kreatora; brak wyceny albo wycena wykonana — komunikat z wycenaKroku. @type {Widok} */
export const widokPodsumowaniaKreatora = {
  render(kontener, { zapytanie, kontekst }) {
    const wycena = wycenaKroku(kontener, zapytanie, kontekst)
    if (!wycena) return
    return uruchomPodsumowanie(kontener, kontekst, wycena.id, 'kreator')
  },
}

/** Zapisana wycena `#/wycena/<id>`. @type {Widok} */
export const widokZapisanejWyceny = {
  render(kontener, { parametry, kontekst }) {
    return uruchomPodsumowanie(kontener, kontekst, parametry.id ?? '', 'zapisana')
  },
}
