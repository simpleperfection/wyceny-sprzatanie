// Ekran wizyty (`#/zlecenie/:id/wizyta/:data`, data pierwotna; makieta „Wizyta” w docs/operator/aplikacja-modulowa-makiety.html):
// wiersze klienta, adresu, terminu, kwoty i uslugi, „Zrobione”, zaplata z forma, czas pracy z planem i faktem, przesuniecie,
// odwolanie i linki do zlecenia i wyceny. Dane i widocznosc akcji liczy src/zlecenia/wizyta-dane.js, a kazda akcja to jeden zapis
// z src/dane/wizyty.js. Po zapisie ekran rysuje sie od nowa (magazyn.naZmiane zglasza tylko zmiany z innych kart), a fokus
// wraca do sekcji akcji, bo kliknieta kontrolka znika razem ze starym ekranem. Czas, termin i zmiana formy sa w arkuszu od dolu.

import { dzienLokalny, jestDniem } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { cofnijZaplate, cofnijZrobiona, odwolajWizyte, oznaczZaplacona, oznaczZrobiona, przesunWizyte, przywrocWizyte, wpiszCzasPracy,
  zmienForme } from '../dane/wizyty.js'
import { BladZlecenia } from '../dane/zlecenia.js'
import { FORMY_ZAPLATY, MAKS_MINUT_PRACY } from '../dane/zlecenia-ksztalt.js'
import { czas, parsujLiczbe } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { chipy, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, dialogPotwierdzenia, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { ETYKIETY_FORM_ZAPLATY, pigulkaWizyty } from '../ui/statusy.js'
import { NAJWCZESNIEJSZA_DATA } from '../zlecenia/formularz.js'
import { adresKalendarza } from '../zlecenia/kalendarz-dane.js'
import { KROK_CZASU, poprawnyCzas } from '../zlecenia/plan-fakt.js'
import { modelWizyty } from '../zlecenia/wizyta-dane.js'
import { linkMapy } from './klienci-dane.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/**
 * @typedef {import('../ui/router.js').Widok} Widok
 * @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji
 * @typedef {import('../ui/h.js').Dzieci} Dzieci
 * @typedef {import('../ui/komponenty/uklad.js').OpcjeWiersza} OpcjeWiersza
 * @typedef {import('../dane/zlecenia-ksztalt.js').FormaZaplaty} FormaZaplaty
 * @typedef {import('../zlecenia/wizyta-dane.js').ModelWizyty} ModelWizyty
 * @typedef {'zrobione' | 'zaplata' | 'czas' | 'termin' | 'odwolanie'} SekcjaWizyty miejsce fokusu i bledu po akcji
 * @typedef {Pick<DaneAplikacji, 'magazyn' | 'katalog'> & { kontener: HTMLElement, id: string, dataPierwotna: string,
 *   forma: FormaZaplaty | null, okno: HTMLDialogElement | null, czyPyta: boolean, czyAktywny: boolean }} EkranWizyty
 *   forma: wybrana w chipach przed zapisem zaplaty; okno: otwarty arkusz; czyPyta: otwarty dialog odwolania
 * @typedef {{ tytul: string, zapis: string, sekcja: SekcjaWizyty }} OpcjeArkusza zapis: tekst przycisku zapisu
 */

const NIE_MA_WIZYTY = 'Nie ma takiej wizyty.'
const BLAD_WIZYTY = 'Nie udało się zapisać tej wizyty. Spróbuj jeszcze raz.'
const BLAD_CZASU = 'Wpisz czas większy od zera i nie dłuższy niż 24 godziny.'
const BLAD_DATY = 'Wybierz datę.'
const PYTANIE_O_FORME = 'Jak zapłacił klient?'
const MINUT_W_GODZINIE = 60
const OPCJE_FORM = FORMY_ZAPLATY.map((wartosc) => ({ wartosc, etykieta: ETYKIETY_FORM_ZAPLATY[wartosc] }))

/** @param {unknown} blad @returns {string} tekst bledu zapisu wizyty; blad spoza zlecenia i magazynu leci dalej */
const tekstBleduWizyty = (blad) => (blad instanceof BladZlecenia ? BLAD_WIZYTY : tekstBleduZapisu(blad))

/** @param {string} tekst @returns {number} pusty tekst = 0, zly = NaN */
const liczbaPola = (tekst) => (tekst.trim() === '' ? 0 : parsujLiczbe(tekst) ?? Number.NaN)

/** @param {'minus' | 'plus'} rodzaj @param {string} etykieta @param {() => void} naKlik @returns {HTMLButtonElement} */
function przyciskKroku(rodzaj, etykieta, naKlik) {
  const element = h('button', { type: 'button', class: ['licznik__przycisk', rodzaj === 'plus' && 'licznik__przycisk--plus'], 'aria-label': etykieta },
    ikona(rodzaj))
  element.addEventListener('click', () => {
    if (element.getAttribute('aria-disabled') !== 'true') naKlik()
  })
  return element
}

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
  const minus = przyciskKroku('minus', `Zmniejsz czas pracy o ${KROK_CZASU} min`, () => ustaw(minuty - KROK_CZASU))
  const plus = przyciskKroku('plus', `Zwiększ czas pracy o ${KROK_CZASU} min`, () => ustaw(minuty + KROK_CZASU))

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

/**
 * Pole daty albo godziny z natywnym wyborem (uklad `pole()`).
 * @param {{ id: string, etykieta: string, typ: 'date' | 'time', wartosc: string, min?: string, naZmiane: (wartosc: string) => void }} opcje
 * @returns {HTMLDivElement}
 */
function poleTerminu({ id, etykieta, typ, wartosc, min, naZmiane }) {
  const wejscie = h('input', { type: typ, id, name: id, class: 'pole__wejscie', value: wartosc, min, 'aria-describedby': `${id}-blad` })
  wejscie.addEventListener('input', () => naZmiane(wejscie.value))
  const element = h('div', { class: 'pole' }, h('label', { class: 'pole__etykieta', for: id }, etykieta), wejscie,
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert' }))
  ustawBlad(element, null)
  return element
}

/** @param {string} id @param {FormaZaplaty} wybrana @param {(forma: FormaZaplaty) => void} naZmiane @returns {HTMLElement} chipy rownej szerokosci */
const chipyFormy = (id, wybrana, naZmiane) => h('div', { class: 'wizyta-formy' },
  chipy({ id, etykieta: PYTANIE_O_FORME, opcje: OPCJE_FORM, wybrana, naZmiane }))

/**
 * Po narysowaniu: blad w sekcji akcji i fokus na jej pierwszej kontrolce (sekcji juz nie ma: powrot w naglowku).
 * @param {HTMLElement} kontener @param {SekcjaWizyty | null} sekcja @param {string | null} blad
 */
function pokazSkutek(kontener, sekcja, blad) {
  if (sekcja === null) return
  const miejsce = kontener.querySelector(`[data-sekcja="${sekcja}"]`)
  if (blad !== null) miejsce?.append(baner({ rodzaj: 'blad', tekst: blad }))
  const cel = miejsce?.matches('a, button') ? miejsce : miejsce?.querySelector('button, a') ?? kontener.querySelector('a')
  if (cel instanceof HTMLElement) cel.focus()
}

/**
 * Zapis jednej akcji i ekran narysowany od nowa; blad zostaje przy akcji, a jej kontrolki dzialaja dalej.
 * @param {EkranWizyty} e @param {SekcjaWizyty} sekcja @param {() => void} zapis
 */
function wykonaj(e, sekcja, zapis) {
  try {
    zapis()
  } catch (blad) {
    rysuj(e, sekcja, tekstBleduWizyty(blad))
    reportError(blad)
    return
  }
  rysuj(e, sekcja)
}

/**
 * Arkusz z polami i przyciskiem zapisu: udany zapis zamyka arkusz, a blad zostaje w nim razem z wpisanymi wartosciami.
 * @param {EkranWizyty} e @param {OpcjeArkusza} opcje @param {Dzieci} pola
 * @param {() => (() => void) | null} przygotujZapis zapis gotowy do wykonania; null, gdy pola maja blad (pokazuje go sama)
 */
function otworzArkusz(e, { tytul, zapis, sekcja }, pola, przygotujZapis) {
  const komunikat = h('div', { class: 'wizyta-ekran__komunikat' })
  function handleZapisz() {
    const wykonajZapis = przygotujZapis()
    if (wykonajZapis === null) return
    try {
      wykonajZapis()
    } catch (blad) {
      komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBleduWizyty(blad) }))
      reportError(blad)
      return
    }
    okno.close()
    rysuj(e, sekcja)
  }
  const okno = arkusz({ tytul }, h('div', { class: 'arkusz__formularz' }, pola, komunikat, przycisk({ tekst: zapis, naKlik: handleZapisz })))
  okno.addEventListener('close', () => {
    okno.remove()
    if (e.okno === okno) e.okno = null
  })
  document.body.append(okno)
  e.okno = okno
  okno.showModal()
}

/** @param {EkranWizyty} e @param {number} start minuty */
function handleDopiszCzas(e, start) {
  let minuty = start
  const licznik = licznikCzasu(start, (wartosc) => { minuty = wartosc })
  otworzArkusz(e, { tytul: 'Dopisz czas pracy', zapis: 'Zapisz czas', sekcja: 'czas' },
    [licznik.element, h('p', { class: 'wizyta-ekran__notka' }, 'Licz cały czas u klienta, bez dojazdu.')],
    () => {
      if (poprawnyCzas(minuty) === null) return () => wpiszCzasPracy(e.magazyn, e.id, e.dataPierwotna, minuty)
      licznik.fokus()
      return null
    })
}

/** @param {EkranWizyty} e @param {{ data: string, godzina: string }} poczatek */
function handlePrzesun(e, poczatek) {
  let { data, godzina } = poczatek
  const poleDaty = poleTerminu({ id: 'wizyta-data', etykieta: 'Data', typ: 'date', wartosc: data, min: NAJWCZESNIEJSZA_DATA,
    naZmiane: (wartosc) => {
      data = wartosc
      ustawBlad(poleDaty, null)
    } })
  const poleGodziny = poleTerminu({ id: 'wizyta-godzina', etykieta: 'Godzina', typ: 'time', wartosc: godzina, naZmiane: (wartosc) => { godzina = wartosc } })
  otworzArkusz(e, { tytul: 'Przesuń', zapis: 'Zapisz nowy termin', sekcja: 'termin' },
    h('div', { class: 'zlecenie-formularz__dwa-pola' }, poleDaty, poleGodziny),
    () => {
      if (jestDniem(data) && data >= NAJWCZESNIEJSZA_DATA) {
        return () => przesunWizyte(e.magazyn, e.id, e.dataPierwotna, { data, godzina: godzina === '' ? null : godzina })
      }
      ustawBlad(poleDaty, BLAD_DATY)
      poleDaty.querySelector('input')?.focus()
      return null
    })
}

/** @param {EkranWizyty} e @param {FormaZaplaty} forma zaznaczona na starcie */
function handleZmienForme(e, forma) {
  let wybrana = forma
  otworzArkusz(e, { tytul: 'Zmień formę', zapis: 'Zmień formę', sekcja: 'zaplata' },
    chipyFormy('wizyta-nowa-forma', forma, (wartosc) => { wybrana = wartosc }),
    () => () => zmienForme(e.magazyn, e.id, e.dataPierwotna, wybrana))
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

/** @returns {HTMLElement[]} ekran wizyty, ktorej nie ma (zly adres, zlecenie usuniete w innej karcie) */
function ekranBraku() {
  const dzis = adresKalendarza('dzien', null)
  return [naglowek({ tytul: 'Wizyta', wstecz: dzis, wsteczTekst: 'Zlecenia' }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst: NIE_MA_WIZYTY, akcja: { tekst: 'Pokaż dzisiejsze wizyty', adres: dzis } }))]
}

/**
 * Ekran ze swiezego stanu.
 * @param {EkranWizyty} e @param {SekcjaWizyty | null} [sekcja] akcja, po ktorej ekran rysuje sie od nowa @param {string | null} [blad]
 */
function rysuj(e, sekcja = null, blad = null) {
  const m = modelWizyty(wczytajStan(e.magazyn), e.katalog, e.id, e.dataPierwotna, dzienLokalny(new Date()))
  if (m === null) {
    e.kontener.replaceChildren(...ekranBraku())
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
      czyAktywny: true }
    rysuj(e)
    return () => {
      e.czyAktywny = false
      e.okno?.close()
    }
  },
}
