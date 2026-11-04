// Podsumowanie wyceny (makieta podsumowanie-wyceny), dwa tryby: krok `cena` kreatora (`#/kreator/cena?wycena=<id>`) z paskiem
// postepu i „Zapisz” (arkusz z wyborem klienta → zapiszWycene: status `do_wyslania`, numer, przejscie do `#/wycena/<id>`) oraz
// zapisana wycena (`#/wycena/<id>`) z jedna glowna akcja wg stanu (Zaplanuj, Przygotuj ofertę albo Klient przyjął), pozostalymi
// akcjami w wierszach ze strzalka, lista „Zlecenia z tej wyceny” i „Usuń wycenę” na koncu. Oba maja te same karty
// (src/widoki/podsumowanie-karty.js), reczna cene i baner „Przelicz”; wycena ze zleceniem jest tylko do odczytu. Liczy
// src/kreator/podsumowanie.js, zapisuje src/dane/wyceny.js; widok tylko rysuje.

import { klient as znajdzKlienta } from '../dane/klienci.js'
import { wczytajStan } from '../dane/magazyn.js'
import { BladWyceny, czyStatusOferty, przypiszKlienta, usunWycene, wycena as znajdzWycene, zapiszWycene, zmienStatus } from '../dane/wyceny.js'
import { czyWycenaZamknieta, doZaplanowania, zleceniaWyceny } from '../dane/zlecenia.js'
import { akcjeWyceny, przeliczWycene, widokPodsumowania } from '../kreator/podsumowanie.js'
import { KROKI_KREATORA } from '../kreator/stan.js'
import { czas, data, procent, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { arkusz, baner, dialogPotwierdzenia, karta, naglowek, pasekPostepu, wiersz } from '../ui/komponenty/uklad.js'
import { ETYKIETY_STATUSOW, pigulkaStatusu } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { adresZaplanowania } from '../zlecenia/kalendarz-dane.js'
import { historiaPlanuIFaktu } from '../zlecenia/plan-fakt.js'
import { opisZlecenia } from '../zlecenia/teksty-wizyty.js'
import { adresKroku, wycenaKroku, zglosBladKreatora } from './kreator-wspolne.js'
import { banery, kartaCeny, kartaZostaje, otworzEdycjeCeny } from './podsumowanie-karty.js'
import { wyborKlienta } from './wybor-klienta.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../ui/komponenty/uklad.js').OpcjeBanera} OpcjeBanera */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').StatusWyceny} StatusWyceny */
/** @typedef {import('../kreator/podsumowanie.js').AkcjaWyceny} AkcjaWyceny */
/** @typedef {import('../ui/ikony.js').NazwaIkony} NazwaIkony */
/**
 * @typedef {'kreator' | 'zapisana'} TrybPodsumowania
 * @typedef {AkcjaWyceny | 'oferta'} AkcjaEkranu
 * @typedef {Exclude<AkcjaEkranu, 'usun'>} AkcjaZOpisem
 * @typedef {{ tekst: string, ikona: NazwaIkony, adres?: string, naKlik?: () => void }} OpisAkcji
 * @typedef {{ naStatus: (nowy: 'przyjeta' | 'odrzucona') => void, naUsun: (w: Wycena) => void }} ObslugaAkcji
 * @typedef {{ naPrzelicz: () => void, naZmien: (brutto: number) => void, czyKosztyOtwarte: () => boolean,
 *   naPrzelaczKoszty: (czyOtwarte: boolean) => void }} ObslugaKart
 */

const ZMIENIONA_W_INNEJ_KARCIE = 'Status tej wyceny zmienił się w innej karcie przeglądarki. Widzisz teraz aktualne dane.'
const BRAK_CENY = 'Ta wycena nie ma jeszcze ceny. Dodaj zakres prac, żeby ją policzyć.'
const TYTUL = 'Podsumowanie'
const POWROT_DO_WYCEN = Object.freeze({ wstecz: sciezka('wyceny'), wsteczTekst: 'Wycena' })
const INDEKS_KROKU_CENY = KROKI_KREATORA.findIndex((k) => k.id === 'cena')
const REGION_KOMUNIKATU = '.podsumowanie__komunikat'

/** @param {Wycena} w @returns {string} „Pani Test · nr 1/10/2026” albo „Nowa wycena” */
const podtytul = (w) => (w.numer ? [w.klient.nazwa, `nr ${w.numer}`].filter(Boolean).join(' · ') : 'Nowa wycena')

/** @param {Wycena} w @param {Kontekst} kontekst @returns {string} nazwa uslugi wyceny; usluga spoza katalogu — „Podsumowanie” */
const tytulWyceny = (w, { katalog }) => katalog.uslugi.find((u) => u.id === w.wejscie.uslugaId)?.nazwa ?? TYTUL

/** @param {unknown} blad @returns {string} tekst bledu zapisu; status zmieniony w innej karcie nie jest zglaszany */
const tekstBledu = (blad) => (blad instanceof BladWyceny && blad.kod === 'przejscie' ? ZMIENIONA_W_INNEJ_KARCIE : zglosBladKreatora(blad))

/** @template T @param {(T | null)[]} lista @returns {T[]} */
const bezPustych = (lista) => lista.filter((x) => x !== null)

/**
 * Arkusz „Zapisz”: opcjonalny klient z listy (wyborKlienta; wybor od razu kopiuje nazwe i adres klienta do wyceny przez
 * przypiszKlienta), potem zapiszWycene (szkic → `do_wyslania` z numerem) i przejscie do zapisanej wyceny.
 * @param {Kontekst} kontekst @param {Wycena} w
 */
function otworzZapis({ magazyn, nawiguj }, w) {
  const bladArkusza = h('div', { class: 'arkusz__komunikat', 'aria-live': 'polite' })
  /** @param {string | null} klientId @returns {string | null} */
  const naWybor = (klientId) => {
    try {
      przypiszKlienta(magazyn, w.id, klientId)
      return null
    } catch (blad) {
      return tekstBledu(blad)
    }
  }
  const { klientId } = znajdzWycene(wczytajStan(magazyn), w.id) ?? w
  const wybor = wyborKlienta({ magazyn, wybranyId: klientId, naWybor, czyAktywny: () => dialog.open, id: 'podsumowanie-klient' })
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true }, wybor.element, bladArkusza, przycisk({ tekst: 'Zapisz', typ: 'submit' }))
  const dialog = arkusz({ tytul: 'Zapisz wycenę' }, formularz)
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    try {
      zapiszWycene(magazyn, w.id)
      dialog.close()
      nawiguj(sciezka('wycena', { id: w.id }))
    } catch (blad) {
      bladArkusza.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBledu(blad) }))
    }
  })
  dialog.addEventListener('close', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  wybor.element.querySelector('button')?.focus()
}

/**
 * Hierarchia akcji ekranu (R9): jedna glowna wg stanu — „Zaplanuj” przy wycenie do zaplanowania, oferta przy wycenie do wysłania,
 * potem decyzja klienta; reszta to wiersze, a usuniecie stoi osobno. Bez takiej akcji ekran nie ma glownej (np. wycena ze zleceniem).
 * @param {readonly AkcjaEkranu[]} akcje @param {StatusWyceny} status
 * @returns {{ glowna: AkcjaZOpisem | null, wiersze: AkcjaZOpisem[], czyUsun: boolean }}
 */
export function ukladAkcji(akcje, status) {
  /** @type {readonly AkcjaZOpisem[]} */
  const kandydaci = status === 'do_wyslania' ? ['zaplanuj', 'oferta', 'przyjeta'] : ['zaplanuj', 'przyjeta']
  const glowna = kandydaci.find((a) => akcje.includes(a)) ?? null
  return { glowna, wiersze: akcje.filter((a) => a !== 'usun').filter((a) => a !== glowna), czyUsun: akcje.includes('usun') }
}

/**
 * @param {Wycena} w @param {AkcjaZOpisem} akcja @param {boolean} czyZamknieta wycena ze zleceniem: oferta tylko do podglądu i wysłania
 * @param {ObslugaAkcji} obsluga @returns {OpisAkcji}
 */
function opisAkcji(w, akcja, czyZamknieta, { naStatus }) {
  if (akcja === 'zaplanuj') return { tekst: 'Zaplanuj', ikona: 'calendar', adres: adresZaplanowania(w.id) }
  if (akcja === 'zaplanuj_kolejne') return { tekst: 'Zaplanuj kolejne', ikona: 'calendar', adres: adresZaplanowania(w.id) }
  if (akcja === 'oferta') return { tekst: czyZamknieta ? 'Pokaż ofertę' : 'Przygotuj ofertę', ikona: 'file-text', adres: sciezka('oferta', { id: w.id }) }
  if (akcja === 'edytuj') return { tekst: 'Edytuj', ikona: 'pencil', adres: adresKroku('usluga', w.id) }
  if (akcja === 'przyjeta') return { tekst: 'Klient przyjął', ikona: 'check', naKlik: () => naStatus('przyjeta') }
  return { tekst: 'Klient zrezygnował', ikona: 'x', naKlik: () => naStatus('odrzucona') }
}

/**
 * @param {Wycena} w @param {Kontekst} kontekst
 * @returns {HTMLElement | null} karta „Zlecenia z tej wyceny” z wierszami do zlecen (R22); bez zlecen null
 */
function kartaZlecen(w, { magazyn }) {
  const stan = wczytajStan(magazyn)
  const zlecenia = zleceniaWyceny(stan, w.id)
  if (zlecenia.length === 0) return null
  return karta({ tytul: 'Zlecenia z tej wyceny', klasa: 'karta--bez-odstepu' }, zlecenia.map((z) =>
    wiersz({ tytul: znajdzKlienta(stan, z.klientId)?.nazwa ?? w.klient.nazwa, opis: opisZlecenia(z), adres: sciezka('zlecenie', { id: z.id }) })))
}

/**
 * @param {Wycena} w @param {Kontekst} kontekst
 * @returns {HTMLElement | null} wpisy czasu pracy wizyt zlecen z tej wyceny, od najnowszego
 */
function kartaWpisowCzasu(w, { magazyn, katalog }) {
  const stan = wczytajStan(magazyn)
  const wpisy = historiaPlanuIFaktu({ ...stan, zlecenia: zleceniaWyceny(stan, w.id) }, katalog)
  if (wpisy.length === 0) return null
  return karta({ tytul: 'Wpisany czas pracy', klasa: 'karta--bez-odstepu' }, h('ul', { class: 'plan-fakt-lista' },
    wpisy.map((x) => h('li', { class: 'plan-fakt-lista__wiersz liczba' },
      `${data(x.data)} · plan ${czas(x.plan)} · fakt ${czas(x.fakt)} (${procent(x.procent)})`))))
}

/**
 * @param {Wycena} w @param {boolean} czyZamknieta wycena ze zleceniem: bez edycji, oferta tylko do podglądu i wysłania
 * @param {boolean} czyDoZaplanowania @param {ObslugaAkcji} obsluga
 * @returns {{ akcje: HTMLElement, usun: HTMLElement | null }} glowny przycisk i karta wierszy; „Usuń wycenę” osobno, bo stoi na koncu ekranu
 */
function akcjeZapisanej(w, czyZamknieta, czyDoZaplanowania, obsluga) {
  const wedlugStatusu = akcjeWyceny(w.status, czyZamknieta, czyDoZaplanowania)
  const { glowna, wiersze, czyUsun } = ukladAkcji(czyStatusOferty(w.status) ? ['oferta', ...wedlugStatusu] : wedlugStatusu, w.status)
  const wierszAkcji = (/** @type {AkcjaZOpisem} */ akcja) => {
    const { tekst, ...reszta } = opisAkcji(w, akcja, czyZamknieta, obsluga)
    return wiersz({ tytul: tekst, ...reszta })
  }
  const usun = czyUsun ? przycisk({ tekst: 'Usuń wycenę', rodzaj: 'tekstowy', ikona: 'trash', naKlik: () => obsluga.naUsun(w) }) : null
  usun?.classList.add('podsumowanie__usun')
  return { usun, akcje: h('div', { class: 'podsumowanie__akcje' },
    glowna ? przycisk(opisAkcji(w, glowna, czyZamknieta, obsluga)) : null,
    wiersze.length === 0 ? null : karta({ klasa: 'karta--bez-odstepu' }, wiersze.map(wierszAkcji))) }
}

/**
 * Karty podsumowania; wycena bez ceny albo z migawka, ktorej nie da sie policzyc z biezacymi danymi — komunikat.
 * @param {Wycena} w @param {Kontekst} kontekst @param {TrybPodsumowania} tryb @param {boolean} czyZamknieta wycena ze zleceniem
 *   (bez „Przelicz” i „Zmień”) @param {ObslugaKart} obsluga
 * @returns {Node[]}
 */
function karty(w, kontekst, tryb, czyZamknieta, { naPrzelicz, naZmien, czyKosztyOtwarte, naPrzelaczKoszty }) {
  if (w.wynik === null) {
    return bezPustych([baner({ rodzaj: 'info', tekst: BRAK_CENY }),
      tryb === 'kreator' ? przycisk({ tekst: 'Przejdź do zakresu', rodzaj: 'drugi', adres: adresKroku('zakres', w.id) }) : null])
  }
  const czyEdytowalna = !czyZamknieta
  try {
    const widok = widokPodsumowania(w, kontekst)
    return [...banery(widok.ostrzezenia, czyEdytowalna ? naPrzelicz : null),
      kartaCeny(widok, w.wynik.wojewodztwo, czyEdytowalna ? () => naZmien(widok.cena.brutto) : null),
      kartaZostaje(widok, { czyOtwarte: czyKosztyOtwarte(), naPrzelacz: naPrzelaczKoszty })]
  } catch (blad) {
    return [baner({ rodzaj: 'blad', tekst: zglosBladKreatora(blad) })]
  }
}

/**
 * Naglowek, pasek postepu (kreator), status (zapisana), region komunikatu, karty, akcje albo stopka z „Zapisz”.
 * @param {{ w: Wycena, czyZamknieta: boolean, czyDoZaplanowania: boolean, kontekst: Kontekst, tryb: TrybPodsumowania,
 *   komunikat: OpcjeBanera | null, obslugaKart: ObslugaKart, obslugaAkcji: ObslugaAkcji }} opcje
 * @returns {Node[]}
 */
function elementyEkranu({ w, czyZamknieta, czyDoZaplanowania, kontekst, tryb, komunikat, obslugaKart, obslugaAkcji }) {
  const czyKreator = tryb === 'kreator'
  const zapisana = czyKreator ? null : akcjeZapisanej(w, czyZamknieta, czyDoZaplanowania, obslugaAkcji)
  return bezPustych([
    czyKreator
      ? naglowek({ tytul: TYTUL, podtytul: podtytul(w), wstecz: adresKroku('chemia', w.id), wsteczTekst: KROKI_KREATORA[INDEKS_KROKU_CENY - 1]?.etykieta })
      : naglowek({ tytul: tytulWyceny(w, kontekst), podtytul: podtytul(w), ...POWROT_DO_WYCEN }),
    czyKreator ? pasekPostepu(KROKI_KREATORA.map((k) => k.etykieta), INDEKS_KROKU_CENY) : null,
    h('div', { class: 'tresc podsumowanie' },
      czyKreator ? null : h('div', { class: 'podsumowanie__status' }, pigulkaStatusu(w.status)),
      h('div', { class: 'podsumowanie__komunikat', 'aria-live': 'polite', tabIndex: -1 }, komunikat ? baner(komunikat) : null),
      karty(w, kontekst, tryb, czyZamknieta, obslugaKart),
      zapisana?.akcje ?? null,
      czyKreator ? null : kartaZlecen(w, kontekst),
      czyKreator ? null : kartaWpisowCzasu(w, kontekst),
      zapisana?.usun ?? null),
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
  let czyKosztyOtwarte = false

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
    czyKosztyOtwarte: () => czyKosztyOtwarte,
    naPrzelaczKoszty: (czy) => { czyKosztyOtwarte = czy },
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
    const stan = wczytajStan(magazyn)
    const w = znajdzWycene(stan, id)
    if (!w) return pokazBrak(kontener)
    const czyZamknieta = czyWycenaZamknieta(stan, id)
    const czyDoZaplanowania = doZaplanowania(stan, w)
    kontener.replaceChildren(...elementyEkranu({ w, czyZamknieta, czyDoZaplanowania, kontekst, tryb, komunikat, obslugaKart, obslugaAkcji }))
    const element = fokus ? kontener.querySelector(fokus) : null
    if (element instanceof HTMLElement) element.focus()
  }

  rysuj()
  return () => { czyAktywny = false }
}

/** @param {HTMLElement} kontener */
function pokazBrak(kontener) {
  kontener.replaceChildren(
    naglowek({ tytul: TYTUL, ...POWROT_DO_WYCEN }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst: 'Nie ma tej wyceny. Mogła zostać usunięta.' }),
      przycisk({ tekst: 'Wróć do listy wycen', rodzaj: 'drugi', adres: sciezka('wyceny') })))
}

/** Krok `cena` kreatora; brak wyceny albo wycena ze zleceniem — komunikat z wycenaKroku. @type {Widok} */
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
