// Zakonczenie zlecenia `#/wycena/<id>/koniec` (makieta zakonczenie-zlecenia, R15–R17): pigulki statusu, licznik czasu pracy
// co 15 min (godziny i minuty do wpisania po dotknieciu), na biezaco karty „Plan i fakt”, „Zostało dla Ciebie”, „Twoje tempo”,
// baner pierwszego osobnego tempa i ostrzezenie o czasie poza granicami; „Zapisz” → dodajWykonanie i powrot do wyceny.
// Ekran nadaje id wpisu przy otwarciu, wiec drugie „Zapisz” nie dopisuje drugiej wizyty. Liczy src/kreator/zakonczenie.js.

import { dzienLokalny } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { BladWyceny, czyAbonament as jestAbonamentem, dodajWykonanie, MAKS_MINUT_WYKONANIA, wycena as znajdzWycene } from '../dane/wyceny.js'
import { czasStartowy, KROK_CZASU, poprawnyCzas, widokZakonczenia } from '../kreator/zakonczenie.js'
import { czas, data, parsujLiczbe, tekstLiczby, tempo, zl } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, karta, naglowek } from '../ui/komponenty/uklad.js'
import { pigulkaStatusu } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { zglosBladKreatora } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../ui/router.js').Kontekst} Kontekst */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../kreator/zakonczenie.js').WidokZakonczenia} WidokZakonczenia */
/** @typedef {import('../kreator/zakonczenie.js').TempoZakonczenia} TempoZakonczenia */

const BLAD_CZASU = 'Wpisz czas większy od zera i nie dłuższy niż 24 godziny.'
const ZMIENIONA_W_INNEJ_KARCIE = 'Status tej wyceny zmienił się w innej karcie przeglądarki. Wróć do wyceny, żeby zobaczyć aktualne dane.'
const NIE_PRZYJETA = 'Czas pracy wpisujesz w wycenie, którą klient przyjął.'
const MINUT_W_GODZINIE = 60
const PROCENT = 100

/** @param {number} minuty @returns {string} „5 h 0 min”, „0 h 45 min” (wartosc licznika i karty „Plan i fakt”) */
const godzinyMinuty = (minuty) => `${Math.floor(minuty / MINUT_W_GODZINIE)} h ${Math.round(minuty % MINUT_W_GODZINIE)} min`

/** @param {WidokZakonczenia} widok @returns {string} zdanie o roznicy planu i faktu */
function zdanieRoznicy({ roznica, procent }) {
  const p = Math.round(Math.abs(procent) * PROCENT)
  if (roznica > 0) return `Praca trwała ${czas(roznica)} dłużej niż plan (+${p}%).`
  if (roznica < 0) return `Praca trwała ${czas(-roznica)} krócej niż plan (−${p}%).`
  return 'Praca trwała tyle, ile plan.'
}

/** @param {string} etykieta @param {number} minuty @param {number} najdluzszy @param {string} klasaPaska @returns {HTMLElement[]} */
function wierszPaska(etykieta, minuty, najdluzszy, klasaPaska) {
  const pasek = h('div', { class: ['plan-fakt__pasek', klasaPaska] })
  pasek.style.setProperty('--dlugosc', `${(minuty / najdluzszy) * PROCENT}%`)
  return [h('p', { class: 'plan-fakt__wiersz' }, h('span', null, etykieta), h('span', { class: 'liczba' }, godzinyMinuty(minuty))),
    h('div', { class: 'plan-fakt__tor', 'aria-hidden': 'true' }, pasek)]
}

/** @param {WidokZakonczenia} widok @returns {HTMLElement} */
function kartaPlanuIFaktu(widok) {
  const najdluzszy = Math.max(widok.plan, widok.fakt)
  const czyDluzej = widok.roznica > 0
  return karta({ tytul: 'Plan i fakt', klasa: 'plan-fakt' },
    wierszPaska('Plan', widok.plan, najdluzszy, 'plan-fakt__pasek--plan'),
    wierszPaska('Fakt', widok.fakt, najdluzszy, czyDluzej ? 'plan-fakt__pasek--dluzej' : 'plan-fakt__pasek--fakt'),
    h('p', { class: ['plan-fakt__zdanie', czyDluzej && 'plan-fakt__zdanie--dluzej'] }, zdanieRoznicy(widok)))
}

/** @param {WidokZakonczenia} widok @returns {HTMLElement} karta w kolorach sukcesu z realna stawka */
function kartaZostalo({ zostaje, stawka, stawkaPlanu }) {
  return karta({ klasa: 'karta-zostaje' },
    h('h2', { class: 'karta-zostaje__tytul' }, 'Zostało dla Ciebie'),
    h('p', { class: 'karta-zostaje__kwota liczba' }, zl(zostaje)),
    h('p', { class: 'karta-zostaje__opis liczba' }, `${zl(stawka)} za godzinę pracy (plan: ${tekstLiczby(Math.round(stawkaPlanu))} zł/h)`))
}

/** @param {TempoZakonczenia} t @returns {HTMLElement} */
function kartaTempaZlecenia({ przed, po, info }) {
  const czyZZlecen = po.zrodlo === 'usluga' || po.zrodlo === 'wspolne'
  const zmiana = h('p', { class: 'karta-tempa__wartosc liczba' }, `${tempo(przed.wartosc)} → ${tempo(po.wartosc)} normy`)
  if (czyZZlecen) {
    return karta({ tytul: 'Twoje tempo' }, zmiana,
      h('p', { class: 'ustawienia__opis' }, `Liczone z ${po.liczba} zleceń. Możesz wrócić do wartości ręcznej w ustawieniach.`))
  }
  if (info.liczba >= info.wymagane) return karta({ tytul: 'Twoje tempo' }, zmiana)
  return karta({ tytul: 'Twoje tempo' },
    h('p', { class: 'ustawienia__opis' }, `Własne tempo policzymy po ${info.wymagane} zleceniach (${info.liczba} z ${info.wymagane}).`))
}

/** @param {Wycena} w @param {WidokZakonczenia} widok @param {Kontekst} kontekst @returns {HTMLElement[]} */
function kartyZlecenia(w, widok, { katalog }) {
  const nazwa = katalog.uslugi.find((u) => u.id === w.wejscie.uslugaId)?.nazwa ?? w.wejscie.uslugaId
  return [kartaPlanuIFaktu(widok), kartaZostalo(widok), kartaTempaZlecenia(widok.tempo),
    widok.tempo.osobne === null ? null : baner({ rodzaj: 'sukces',
      tekst: `Masz 3 zlecenia: ${nazwa} – od teraz liczymy dla nich osobne tempo: ${tempo(widok.tempo.osobne)}.` }),
    widok.czyPozaGranicami ? baner({ rodzaj: 'uwaga',
      tekst: `Ten czas bardzo odbiega od normy (${tempo(widok.stosunek)}). Zapiszemy go, ale nie wliczymy do Twojego tempa.` }) : null,
  ].filter((x) => x !== null)
}

/** @param {string} tekst @returns {number} pusty tekst = 0, zly = NaN */
const liczbaPola = (tekst) => (tekst.trim() === '' ? 0 : parsujLiczbe(tekst) ?? Number.NaN)

/**
 * Licznik czasu pracy: godziny i minuty do wpisania (wygladaja jak wartosc „5 h 45 min”), − / + co KROK_CZASU.
 * @param {number} start minuty @param {(minuty: number) => void} naZmiane
 * @returns {{ element: HTMLElement, fokus: () => void }}
 */
function licznikCzasu(start, naZmiane) {
  let minuty = start
  const blad = h('p', { class: 'pole__blad', id: 'zakonczenie-czas-blad', role: 'alert', hidden: true })
  const ogloszenie = h('span', { class: 'wizualnie-ukryte', 'aria-live': 'polite' })
  /** @param {string} id @param {string} etykieta */
  const pole = (id, etykieta) => h('input', { id, name: id, type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'licznik__wejscie',
    'aria-label': etykieta, 'aria-describedby': blad.id })
  const godziny = pole('zakonczenie-godziny', 'Ile trwała praca? Godziny')
  const minutyPola = pole('zakonczenie-minuty', 'Ile trwała praca? Minuty')
  const minus = przyciskKroku('minus', `Zmniejsz czas pracy o ${KROK_CZASU} min`, () => ustaw(minuty - KROK_CZASU))
  const plus = przyciskKroku('plus', `Zwiększ czas pracy o ${KROK_CZASU} min`, () => ustaw(minuty + KROK_CZASU))

  /** @param {boolean} czyBlad */
  function pokazBlad(czyBlad) {
    blad.textContent = czyBlad ? BLAD_CZASU : ''
    blad.hidden = !czyBlad
    for (const wejscie of [godziny, minutyPola]) wejscie.setAttribute('aria-invalid', String(czyBlad))
  }

  function odswiezPrzyciski() {
    minus.setAttribute('aria-disabled', String(!(minuty - KROK_CZASU >= KROK_CZASU)))
    plus.setAttribute('aria-disabled', String(!(minuty + KROK_CZASU <= MAKS_MINUT_WYKONANIA)))
  }

  function odswiez() {
    odswiezPrzyciski()
    pokazBlad(poprawnyCzas(minuty) !== null)
    naZmiane(minuty)
  }

  /** @param {number} nowa */
  function ustaw(nowa) {
    minuty = Math.min(MAKS_MINUT_WYKONANIA, Math.max(KROK_CZASU, Number.isFinite(nowa) ? nowa : start))
    godziny.value = String(Math.floor(minuty / MINUT_W_GODZINIE))
    minutyPola.value = String(minuty % MINUT_W_GODZINIE)
    ogloszenie.textContent = godzinyMinuty(minuty)
    odswiez()
  }

  function handleWpis() {
    minuty = Math.round(liczbaPola(godziny.value) * MINUT_W_GODZINIE + liczbaPola(minutyPola.value))
    odswiez()
  }

  godziny.addEventListener('input', handleWpis)
  minutyPola.addEventListener('input', handleWpis)
  godziny.value = String(Math.floor(start / MINUT_W_GODZINIE))
  minutyPola.value = String(start % MINUT_W_GODZINIE)
  odswiezPrzyciski()
  const element = h('div', { class: 'licznik licznik-czasu' },
    h('div', { class: 'licznik__opis' },
      h('label', { class: 'licznik__etykieta', for: godziny.id }, 'Ile trwała praca?'),
      h('span', { class: 'licznik__wartosc' }, godziny, h('span', { class: 'licznik__jednostka' }, 'h'), minutyPola,
        h('span', { class: 'licznik__jednostka' }, 'min'))),
    h('div', { class: 'licznik__przyciski' }, minus, plus), blad, ogloszenie)
  return { element, fokus: () => godziny.focus() }
}

/** @param {'minus' | 'plus'} rodzaj @param {string} etykieta @param {() => void} naKlik */
function przyciskKroku(rodzaj, etykieta, naKlik) {
  const element = h('button', { type: 'button', class: ['licznik__przycisk', rodzaj === 'plus' && 'licznik__przycisk--plus'], 'aria-label': etykieta },
    ikona(rodzaj))
  element.addEventListener('click', () => {
    if (element.getAttribute('aria-disabled') !== 'true') naKlik()
  })
  return element
}

/** @param {Wycena} w @param {boolean} czyAbonament @returns {HTMLElement} */
function statusy(w, czyAbonament) {
  if (czyAbonament) return h('div', { class: 'zakonczenie__statusy' }, pigulkaStatusu('przyjeta'), h('span', { class: 'pigulka' }, `Wizyty: ${w.wykonania.length}`))
  return h('div', { class: 'zakonczenie__statusy' }, pigulkaStatusu('przyjeta'), ikona('arrow-left', 'zakonczenie__strzalka'),
    h('span', { class: 'wizualnie-ukryte' }, 'zmieni się na'), pigulkaStatusu('wykonana'))
}

/** @param {HTMLElement} kontener @param {string} tekst @param {string} wstecz */
function pokazKomunikat(kontener, tekst, wstecz) {
  kontener.replaceChildren(naglowek({ tytul: 'Zlecenie wykonane', wstecz }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst }), przycisk({ tekst: 'Wróć do wyceny', rodzaj: 'drugi', adres: wstecz })))
}

/** @param {HTMLElement} kontener @param {Kontekst} kontekst @param {Wycena} w */
function rysujEkran(kontener, kontekst, w) {
  const wpisId = crypto.randomUUID()
  const dzien = dzienLokalny(new Date())
  const powrot = sciezka('wycena', { id: w.id })
  const region = h('div', { class: 'zakonczenie__karty' })
  const komunikat = h('div', { class: 'podsumowanie__komunikat', 'aria-live': 'polite' })
  /** @type {WidokZakonczenia | null} */
  let widok = null

  /** @param {number} minuty */
  function przelicz(minuty) {
    widok = null
    if (poprawnyCzas(minuty) !== null) return region.replaceChildren()
    try {
      widok = widokZakonczenia(w, minuty, kontekst)
      region.replaceChildren(...kartyZlecenia(w, widok, kontekst))
    } catch (blad) {
      region.replaceChildren(baner({ rodzaj: 'blad', tekst: zglosBladKreatora(blad) }))
    }
  }

  const start = czasStartowy(w, kontekst)
  const licznik = licznikCzasu(start, przelicz)
  function handleZapisz() {
    if (!widok) return licznik.fokus()
    try {
      dodajWykonanie(kontekst.magazyn, w.id, { id: wpisId, data: dzien, minuty: widok.fakt, tempoPlanu: widok.tempoPlanu })
      kontekst.nawiguj(powrot)
    } catch (blad) {
      const tekst = blad instanceof BladWyceny && blad.kod === 'przejscie' ? ZMIENIONA_W_INNEJ_KARCIE : zglosBladKreatora(blad)
      komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst }))
    }
  }

  const czyAbonament = w.wynik !== null && jestAbonamentem(w.wynik)
  przelicz(start)
  const podtytul = [w.numer ? `Wycena ${w.numer}` : null, w.klient.nazwa, data(dzien)].filter(Boolean).join(' · ')
  kontener.replaceChildren(
    naglowek({ tytul: czyAbonament ? 'Wizyta wykonana' : 'Zlecenie wykonane', podtytul, wstecz: powrot }),
    h('div', { class: 'tresc zakonczenie' }, statusy(w, czyAbonament), licznik.element,
      h('p', { class: 'zakonczenie__notka' }, 'Licz cały czas u klienta, bez dojazdu.'), region, komunikat),
    h('div', { class: 'stopka-kreatora' }, przycisk({ tekst: czyAbonament ? 'Zapisz wizytę' : 'Zapisz', naKlik: handleZapisz })))
}

/** Ekran `#/wycena/<id>/koniec`; wycena nieprzyjeta albo usunieta — komunikat z powrotem. @type {Widok} */
export const widokZakonczeniaZlecenia = {
  render(kontener, { parametry, kontekst }) {
    const id = parametry.id ?? ''
    const w = znajdzWycene(wczytajStan(kontekst.magazyn), id)
    if (!w) return pokazKomunikat(kontener, 'Nie ma tej wyceny. Mogła zostać usunięta.', sciezka('wyceny'))
    if (w.status !== 'przyjeta' || w.wynik === null) return pokazKomunikat(kontener, NIE_PRZYJETA, sciezka('wycena', { id }))
    try {
      rysujEkran(kontener, kontekst, w)
    } catch (blad) {
      pokazKomunikat(kontener, zglosBladKreatora(blad), sciezka('wycena', { id }))
    }
  },
}
