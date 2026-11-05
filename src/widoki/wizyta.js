// Ekran wizyty (`#/zlecenie/:id/wizyta/:data`, data pierwotna; makieta „Wizyta” w docs/operator/aplikacja-modulowa-makiety.html):
// wiersze klienta, adresu, terminu, kwoty i uslugi, „Zrobione”, zaplata z forma, czas pracy z planem i faktem, przesuniecie,
// odwolanie i linki do zlecenia i wyceny. Dane i widocznosc akcji liczy src/zlecenia/wizyta-dane.js, a kazda akcja to jeden zapis
// z src/dane/wizyty.js. Zapis, fokus i arkusz od dolu (czas, termin, zmiana formy) daje src/widoki/ekran-akcji.js.

import { dzienLokalny } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { cofnijZaplate, cofnijZrobiona, odwolajWizyte, oznaczZaplacona, oznaczZrobiona, przesunWizyte, przywrocWizyte, wpiszCzasPracy,
  zmienForme } from '../dane/wizyty.js'
import { MAKS_MINUT_PRACY } from '../dane/zlecenia-ksztalt.js'
import { czas, parsujLiczbe } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { chipy, pole, przycisk, przyciskLicznika, ustawBlad } from '../ui/komponenty/formularz.js'
import { dialogPotwierdzenia, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { pigulkaWizyty } from '../ui/statusy.js'
import { tekstBleduWizyty } from '../zlecenia/bledy-zapisu.js'
import { NAJWCZESNIEJSZA_DATA, OPCJE_FORM, tekstBleduPola } from '../zlecenia/opcje.js'
import { KROK_CZASU, poprawnyCzas } from '../zlecenia/plan-fakt.js'
import { bladPrzesuniecia, modelWizyty } from '../zlecenia/wizyta-dane.js'
import { ekranBraku, otworzArkusz, pokazSkutek, wykonaj } from './ekran-akcji.js'
import { linkMapy } from './klienci-dane.js'

/**
 * @typedef {import('../ui/router.js').Widok} Widok
 * @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji
 * @typedef {import('../ui/komponenty/uklad.js').OpcjeWiersza} OpcjeWiersza
 * @typedef {import('../dane/zlecenia-ksztalt.js').FormaZaplaty} FormaZaplaty
 * @typedef {import('../zlecenia/wizyta-dane.js').ModelWizyty} ModelWizyty
 * @typedef {import('./ekran-akcji.js').EkranAkcji} EkranAkcji
 * @typedef {'zrobione' | 'zaplata' | 'czas' | 'termin' | 'odwolanie'} SekcjaWizyty miejsce fokusu i bledu po akcji
 * @typedef {EkranAkcji & Pick<DaneAplikacji, 'magazyn' | 'katalog'> & { kontener: HTMLElement, id: string, dataPierwotna: string,
 *   forma: FormaZaplaty | null, czyPyta: boolean, czyAktywny: boolean }} EkranWizyty
 *   forma: wybrana w chipach przed zapisem zaplaty; czyPyta: otwarty dialog odwolania
 */

const NIE_MA_WIZYTY = 'Nie ma takiej wizyty.'
const BLAD_CZASU = 'Wpisz czas większy od zera i nie dłuższy niż 24 godziny.'
const PYTANIE_O_FORME = 'Jak zapłacił klient?'
const MINUT_W_GODZINIE = 60

/** @param {string} tekst @returns {number} pusty tekst = 0, zly = NaN */
const liczbaPola = (tekst) => (tekst.trim() === '' ? 0 : parsujLiczbe(tekst) ?? Number.NaN)

/**
 * Licznik czasu pracy: godziny i minuty do wpisania, − / + co KROK_CZASU.
 * @param {number} start minuty @param {(minuty: number) => void} naZmiane
 * @returns {{ element: HTMLElement, fokus: () => void }}
 */
function licznikCzasu(start, naZmiane) {
  let minuty = start
  const blad = h('p', { class: 'pole__blad', id: 'wizyta-czas-blad', role: 'alert', hidden: true })
  const ogloszenie = h('span', { class: 'wizualnie-ukryte', 'aria-live': 'polite' })
  /** @param {string} id @param {string} etykieta */
  const poleLiczby = (id, etykieta) => h('input', { id, name: id, type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'licznik__wejscie',
    'aria-label': etykieta, 'aria-describedby': blad.id })
  const godziny = poleLiczby('wizyta-godziny', 'Ile trwała praca? Godziny')
  const minutyPola = poleLiczby('wizyta-minuty', 'Ile trwała praca? Minuty')
  const minus = przyciskLicznika('minus', `Zmniejsz czas pracy o ${KROK_CZASU} min`, () => ustaw(minuty - KROK_CZASU))
  const plus = przyciskLicznika('plus', `Zwiększ czas pracy o ${KROK_CZASU} min`, () => ustaw(minuty + KROK_CZASU))

  function odswiez() {
    const czyBlad = poprawnyCzas(minuty) !== null
    blad.textContent = czyBlad ? BLAD_CZASU : ''
    blad.hidden = !czyBlad
    for (const wejscie of [godziny, minutyPola]) wejscie.setAttribute('aria-invalid', String(czyBlad))
    minus.setAttribute('aria-disabled', String(!(minuty - KROK_CZASU >= KROK_CZASU)))
    plus.setAttribute('aria-disabled', String(!(minuty + KROK_CZASU <= MAKS_MINUT_PRACY)))
    naZmiane(minuty)
  }

  function pokazMinuty() {
    godziny.value = String(Math.floor(minuty / MINUT_W_GODZINIE))
    minutyPola.value = String(minuty % MINUT_W_GODZINIE)
  }

  /** @param {number} nowa */
  function ustaw(nowa) {
    minuty = Math.min(MAKS_MINUT_PRACY, Math.max(KROK_CZASU, Number.isFinite(nowa) ? nowa : start))
    pokazMinuty()
    ogloszenie.textContent = czas(minuty)
    odswiez()
  }

  function handleWpis() {
    minuty = Math.round(liczbaPola(godziny.value) * MINUT_W_GODZINIE + liczbaPola(minutyPola.value))
    odswiez()
  }

  godziny.addEventListener('input', handleWpis)
  minutyPola.addEventListener('input', handleWpis)
  pokazMinuty()
  odswiez()
  const element = h('div', { class: 'licznik licznik-czasu' },
    h('div', { class: 'licznik__opis' },
      h('label', { class: 'licznik__etykieta', for: godziny.id }, 'Ile trwała praca?'),
      h('span', { class: 'licznik__wartosc' }, godziny, h('span', { class: 'licznik__jednostka' }, 'h'), minutyPola,
        h('span', { class: 'licznik__jednostka' }, 'min'))),
    h('div', { class: 'licznik__przyciski' }, minus, plus), blad, ogloszenie)
  return { element, fokus: () => godziny.focus() }
}

/** @param {string} id @param {FormaZaplaty} wybrana @param {(forma: FormaZaplaty) => void} naZmiane @returns {HTMLElement} chipy rownej szerokosci */
const chipyFormy = (id, wybrana, naZmiane) => h('div', { class: 'wizyta-formy' },
  chipy({ id, etykieta: PYTANIE_O_FORME, opcje: OPCJE_FORM, wybrana, naZmiane }))

/** @param {EkranWizyty} e @param {number} start minuty */
function handleDopiszCzas(e, start) {
  let minuty = start
  const licznik = licznikCzasu(start, (wartosc) => { minuty = wartosc })
  otworzArkusz(e, { tytul: 'Dopisz czas pracy', zapis: 'Zapisz czas', sekcja: 'czas' },
    [licznik.element, h('p', { class: 'wizyta-ekran__notka' }, 'Licz cały czas u klienta, bez dojazdu.')],
    (zapisz) => {
      if (poprawnyCzas(minuty) !== null) return licznik.fokus()
      zapisz(() => wpiszCzasPracy(e.magazyn, e.id, e.dataPierwotna, minuty))
    })
}

/** @param {EkranWizyty} e @param {{ data: string, godzina: string }} poczatek */
function handlePrzesun(e, poczatek) {
  let { data, godzina } = poczatek
  const poleDaty = pole({ id: 'wizyta-data', etykieta: 'Data', rodzaj: 'data', wartosc: data, min: NAJWCZESNIEJSZA_DATA,
    naZmiane: (wartosc) => {
      data = wartosc
      ustawBlad(poleDaty, null)
    } })
  const poleGodziny = pole({ id: 'wizyta-godzina', etykieta: 'Godzina', rodzaj: 'godzina', wartosc: godzina, naZmiane: (wartosc) => { godzina = wartosc } })
  otworzArkusz(e, { tytul: 'Przesuń', zapis: 'Zapisz nowy termin', sekcja: 'termin' },
    h('div', { class: 'zlecenie-formularz__dwa-pola' }, poleDaty, poleGodziny),
    (zapisz) => {
      const blad = bladPrzesuniecia(data)
      ustawBlad(poleDaty, tekstBleduPola(blad))
      if (blad !== null) return poleDaty.querySelector('input')?.focus()
      zapisz(() => przesunWizyte(e.magazyn, e.id, e.dataPierwotna, { data, godzina: godzina === '' ? null : godzina }))
    })
}

/** @param {EkranWizyty} e @param {FormaZaplaty} forma zaznaczona na starcie */
function handleZmienForme(e, forma) {
  let wybrana = forma
  otworzArkusz(e, { tytul: 'Zmień formę', zapis: 'Zmień formę', sekcja: 'zaplata' },
    chipyFormy('wizyta-nowa-forma', forma, (wartosc) => { wybrana = wartosc }),
    (zapisz) => zapisz(() => zmienForme(e.magazyn, e.id, e.dataPierwotna, wybrana)))
}

/** Pytanie zamyka sie po dluzszej chwili: ekran mogl zniknac albo druga karta zmienic wizyte. @param {EkranWizyty} e @param {string} dzien */
async function handleOdwolaj(e, dzien) {
  if (e.czyPyta) return
  e.czyPyta = true
  const czyOdwolac = await dialogPotwierdzenia({ tytul: `Odwołać wizytę ${dzien}?`, tresc: 'Wizytę będzie można przywrócić.', potwierdz: 'Odwołaj',
    anuluj: 'Anuluj', czyNiebezpieczne: true })
  e.czyPyta = false
  if (czyOdwolac && e.czyAktywny) wykonaj(e, 'odwolanie', () => odwolajWizyte(e.magazyn, e.id, e.dataPierwotna))
}

/** @param {string} adres @returns {HTMLElement} wiersz „Adres” → mapa w nowej karcie */
function wierszAdresu(adres) {
  const element = wiersz({ tytul: 'Adres', opis: adres, adres: linkMapy(adres) })
  element.setAttribute('target', '_blank')
  element.setAttribute('rel', 'noopener noreferrer')
  element.querySelector('.wiersz__strzalka')?.replaceWith(ikona('map-pin', 'wiersz__strzalka'))
  return element
}

/** @param {ModelWizyty} m @returns {HTMLElement} klient, adres, termin, kwota i usluga */
function kartaDanych(m) {
  return karta({ klasa: 'karta--bez-odstepu wizyta-dane' },
    wiersz({ tytul: 'Klient', opis: m.klient.nazwa, adres: m.klient.adres }),
    m.adres === null ? null : wierszAdresu(m.adres),
    wiersz({ tytul: 'Termin', opis: m.termin }),
    wiersz({ tytul: 'Kwota', opis: m.kwota }),
    m.usluga === null ? null : wiersz({ tytul: 'Usługa', opis: m.usluga }))
}

/** @param {string} tekst @param {...HTMLElement} akcje @returns {HTMLElement} zapisany stan w kolorze sukcesu z akcjami po prawej */
const zapisanyStan = (tekst, ...akcje) => h('div', { class: 'wizyta-stan' }, ikona('check'), h('span', { class: 'wizyta-stan__tekst' }, tekst),
  h('div', { class: 'wizyta-stan__akcje' }, akcje))

/** @param {EkranWizyty} e @param {ModelWizyty} m @returns {HTMLElement | null} */
function sekcjaZrobione(e, m) {
  const { magazyn, id, dataPierwotna } = e
  if (!m.czyZrobiona && !m.czyMozeZrobione) return null
  return h('div', { class: 'wizyta-ekran__sekcja', 'data-sekcja': 'zrobione' }, m.czyZrobiona
    ? zapisanyStan('Zrobione', przycisk({ tekst: 'Cofnij', rodzaj: 'tekstowy', etykieta: 'Cofnij: Zrobione',
      naKlik: () => wykonaj(e, 'zrobione', () => cofnijZrobiona(magazyn, id, dataPierwotna)) }))
    : przycisk({ tekst: 'Zrobione', ikona: 'check', naKlik: () => wykonaj(e, 'zrobione', () => oznaczZrobiona(magazyn, id, dataPierwotna)) }))
}

/** @param {EkranWizyty} e @param {ModelWizyty} m @returns {HTMLElement | null} chipy formy z „Zapłacone” albo zapisana zaplata */
function sekcjaZaplaty(e, { zaplata, czyZrobiona }) {
  const { magazyn, id, dataPierwotna } = e
  if (zaplata === null) return null
  if (zaplata.rodzaj === 'zapisana') {
    return h('div', { class: 'wizyta-ekran__sekcja', 'data-sekcja': 'zaplata' }, zapisanyStan(zaplata.tekst,
      przycisk({ tekst: 'Zmień formę', rodzaj: 'tekstowy', naKlik: () => handleZmienForme(e, zaplata.forma) }),
      przycisk({ tekst: 'Cofnij', rodzaj: 'tekstowy', etykieta: 'Cofnij: Zapłacone',
        naKlik: () => wykonaj(e, 'zaplata', () => cofnijZaplate(magazyn, id, dataPierwotna)) })))
  }
  const handleZaplacone = () => wykonaj(e, 'zaplata', () => {
    oznaczZaplacona(magazyn, id, dataPierwotna, { forma: e.forma ?? zaplata.forma })
    e.forma = null
  })
  return h('div', { class: 'karta wizyta-zaplata', 'data-sekcja': 'zaplata' },
    chipyFormy('wizyta-forma', e.forma ?? zaplata.forma, (forma) => { e.forma = forma }),
    przycisk({ tekst: 'Zapłacone', rodzaj: czyZrobiona ? 'glowny' : 'drugi', naKlik: handleZaplacone }))
}

/** @param {ModelWizyty} m @returns {HTMLElement | null} plan, fakt i stawka po zapisie czasu */
function kartaCzasu({ czasPracy }) {
  if (czasPracy === null) return null
  const { plan, fakt, zostaje } = czasPracy
  return karta({ klasa: 'wizyta-czas' }, [plan, fakt, zostaje].map((tekst) => (tekst === null ? null : h('p', { class: 'wizyta-czas__wiersz liczba' }, tekst))))
}

/** @param {OpcjeWiersza} opcje @param {SekcjaWizyty} sekcja @returns {HTMLElement} wiersz otwierajacy arkusz */
function wierszArkusza(opcje, sekcja) {
  const element = wiersz(opcje)
  element.dataset.sekcja = sekcja
  return element
}

/** @param {EkranWizyty} e @param {ModelWizyty} m @returns {HTMLElement} czas pracy, przesuniecie i linki */
function kartaAkcji(e, { startCzasu, przesuniecie, linki }) {
  return karta({ klasa: 'karta--bez-odstepu' },
    startCzasu === null ? null : wierszArkusza({ tytul: 'Dopisz czas pracy', ikona: 'clock', naKlik: () => handleDopiszCzas(e, startCzasu) }, 'czas'),
    przesuniecie === null ? null : wierszArkusza({ tytul: 'Przesuń', ikona: 'calendar', naKlik: () => handlePrzesun(e, przesuniecie) }, 'termin'),
    linki.zmienOd === null ? null : wiersz({ tytul: 'Zmień od tej wizyty', ikona: 'pencil', adres: linki.zmienOd }),
    wiersz({ tytul: 'Zlecenie', ikona: 'clipboard-list', adres: linki.zlecenie }),
    linki.wycena === null ? null : wiersz({ tytul: linki.wycena.tekst, ikona: 'file-text', adres: linki.wycena.adres }))
}

/** @param {EkranWizyty} e @param {ModelWizyty} m @returns {HTMLElement} „Odwołaj wizytę” albo „Przywróć wizytę” */
function sekcjaOdwolania(e, { czyOdwolana, dzien }) {
  const akcja = czyOdwolana
    ? przycisk({ tekst: 'Przywróć wizytę', rodzaj: 'drugi', naKlik: () => wykonaj(e, 'odwolanie', () => przywrocWizyte(e.magazyn, e.id, e.dataPierwotna)) })
    : przycisk({ tekst: 'Odwołaj wizytę', rodzaj: 'tekstowy', naKlik: () => void handleOdwolaj(e, dzien).catch(reportError) })
  return h('div', { class: 'wizyta-ekran__odwolanie', 'data-sekcja': 'odwolanie' }, akcja)
}

/**
 * Ekran ze swiezego stanu.
 * @param {EkranWizyty} e @param {string | null} [sekcja] akcja, po ktorej ekran rysuje sie od nowa @param {string | null} [blad]
 */
function rysuj(e, sekcja = null, blad = null) {
  const m = modelWizyty(wczytajStan(e.magazyn), e.katalog, e.id, e.dataPierwotna, dzienLokalny(new Date()))
  if (m === null) {
    e.kontener.replaceChildren(...ekranBraku('Wizyta', NIE_MA_WIZYTY))
    return
  }
  e.kontener.replaceChildren(naglowek({ tytul: 'Wizyta', wstecz: m.powrot, wsteczTekst: 'Zlecenia' }),
    h('div', { class: 'tresc' },
      m.pigulki.length === 0 ? null : h('div', { class: 'wizyta-ekran__pigulki' }, m.pigulki.map((stan) => pigulkaWizyty(stan))),
      kartaDanych(m), sekcjaZrobione(e, m), sekcjaZaplaty(e, m), kartaCzasu(m), kartaAkcji(e, m), sekcjaOdwolania(e, m)))
  pokazSkutek(e.kontener, sekcja, blad)
}

/** @type {Widok} */
export const widokWizyty = {
  render(kontener, { parametry, kontekst }) {
    const { magazyn, katalog } = kontekst
    /** @type {EkranWizyty} */
    const e = { kontener, magazyn, katalog, id: parametry.id ?? '', dataPierwotna: parametry.data ?? '', forma: null, okno: null, czyPyta: false,
      czyAktywny: true, tekstBledu: tekstBleduWizyty, rysuj: (sekcja, blad) => rysuj(e, sekcja, blad) }
    rysuj(e)
    return () => {
      e.czyAktywny = false
      e.okno?.close()
    }
  },
}
