// Ekran „Nowe zlecenie” (`#/zlecenie/nowe`, makieta `zlecenie-formularz` w docs/operator/aplikacja-modulowa-makiety.html): recznie
// (`?klient=`, `?data=`) albo z przyjetej wyceny (`?wycena=`). Wartosci, bledy i zapis licza czyste funkcje z src/zlecenia/formularz.js;
// widok rysuje pola raz, a po zmianie tylko je pokazuje, chowa i ustawia, zeby fokus zostawal na kontrolce. Id zlecenia powstaje przy
// otwarciu ekranu, wiec podwojne „Zapisz zlecenie” nie dubluje zlecenia; po zapisie adres formularza w historii zamienia sie na dzien startu.

import { dzienLokalny } from '../dane/ksztalt.js'
import { BladMagazynu, wczytajStan } from '../dane/magazyn.js'
import { BladZlecenia } from '../dane/zlecenia.js'
import { DLUGOSC_OPISU } from '../dane/zlecenia-ksztalt.js'
import { h } from '../ui/h.js'
import { chipy, pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { baner, naglowek } from '../ui/komponenty/uklad.js'
import { sciezka } from '../ui/trasy.js'
import {
  BEZ_POWTARZANIA, bledyFormularza, czyMaDni, etykietaCeny, INNA_USLUGA, NAJWCZESNIEJSZA_DATA, OPCJE_DNI, OPCJE_PLATNOSCI, OPCJE_POWTARZANIA,
  tekstOdmowy, tekstPlanu, wartosciPoczatkowe, zapiszFormularz, zCyklem, zData, zDniem, zRozliczeniem,
} from '../zlecenia/formularz.js'
import { adresKalendarza } from '../zlecenia/kalendarz-dane.js'
import { tekstBleduZapisu } from './teksty-bledow.js'
import { wyborKlienta } from './wybor-klienta.js'

/**
 * @typedef {import('../ui/router.js').Widok} Widok
 * @typedef {import('../ui/router.js').Kontekst} Kontekst
 * @typedef {import('../zlecenia/formularz.js').WartosciFormularza} WartosciFormularza
 * @typedef {import('../zlecenia/formularz.js').KodBleduFormularza} KodBleduFormularza
 * @typedef {import('../zlecenia/formularz.js').OpcjaUslugi} OpcjaUslugi
 * @typedef {import('../zlecenia/formularz.js').Powtarzanie} Powtarzanie
 * @typedef {import('./wybor-klienta.js').WyborKlienta} WyborKlienta
 * @typedef {import('../dane/zlecenia-ksztalt.js').Rozliczenie} Rozliczenie
 * @typedef {{ usluga: HTMLDivElement, opis: HTMLDivElement, cena: HTMLDivElement, data: HTMLDivElement, godzina: HTMLDivElement,
 *   powtarzaj: HTMLDivElement, dni: HTMLDivElement, platnosc: HTMLDivElement }} PolaZlecenia
 * @typedef {{ naUsluge: (usluga: string | null) => void, naOpis: (opis: string) => void, naCene: (cena: string) => void,
 *   naDate: (data: string) => void, naGodzine: (godzina: string) => void, naCykl: (cykl: Powtarzanie) => void, naDzien: (dzien: number) => void,
 *   naRozliczenie: (rozliczenie: Rozliczenie) => void }} ObslugaPol
 * @typedef {{ wartosci: WartosciFormularza }} EkranFormularza biezace wartosci otwartego ekranu
 */

/** @type {Readonly<Record<Exclude<KodBleduFormularza, 'brak_klienta'>, string>>} „Wybierz klienta.” pokazuje wyborKlienta */
const TEKSTY_BLEDOW = Object.freeze({
  brak_uslugi: 'Wybierz usługę albo wpisz opis.',
  zla_cena: 'Wpisz cenę.',
  brak_daty: 'Wybierz datę.',
  brak_dni: 'Wybierz dni tygodnia.',
})
/** Pola z bledem pod spodem w kolejnosci na ekranie (fokus idzie na pierwsze). */
const POLA_Z_BLEDEM = /** @type {const} */ (['usluga', 'cena', 'data', 'dni'])
const BLAD_ZAPISU = 'Nie udało się zapisać zlecenia. Spróbuj jeszcze raz.'
const WYCENY_NIE_MA = 'Tej wyceny nie można zaplanować. Mogła zostać usunięta albo zmienić status.'

/** @param {HTMLElement} element @param {string | null} blad komunikat pod polem; `aria-invalid` takze na <select> */
function pokazBlad(element, blad) {
  ustawBlad(element, blad)
  element.querySelector('select')?.setAttribute('aria-invalid', blad ? 'true' : 'false')
}

/**
 * Pole wyboru uslugi; przy zleceniu z wyceny zablokowane, bo usluge zapisuje sie z wyceny (zaplanujZWyceny).
 * @param {{ opcje: readonly OpcjaUslugi[], wybrana: string | null, czyZablokowane: boolean, naZmiane: (usluga: string | null) => void }} opcje
 * @returns {HTMLDivElement}
 */
function poleUslugi({ opcje, wybrana, czyZablokowane, naZmiane }) {
  const id = 'zlecenie-usluga'
  const wybor = h('select', { id, name: id, class: 'pole__wejscie', disabled: czyZablokowane, 'aria-describedby': `${id}-blad` },
    h('option', { value: '' }, 'Wybierz usługę'),
    opcje.map((o) => h('option', { value: o.wartosc }, o.etykieta)))
  wybor.value = wybrana ?? ''
  wybor.addEventListener('change', () => naZmiane(wybor.value === '' ? null : wybor.value))
  const element = h('div', { class: 'pole' }, h('label', { class: 'pole__etykieta', for: id }, 'Usługa'), wybor,
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert' }))
  ustawBlad(element, null)
  return element
}

/**
 * Pole daty albo godziny z natywnym wyborem (uklad `pole()`).
 * @param {{ id: string, etykieta: string, typ: 'date' | 'time', wartosc: string, min?: string, naZmiane: (wartosc: string) => void }} opcje
 * @returns {HTMLDivElement}
 */
function poleCzasu({ id, etykieta, typ, wartosc, min, naZmiane }) {
  const wejscie = h('input', { type: typ, id, name: id, class: 'pole__wejscie', value: wartosc, min, 'aria-describedby': `${id}-blad` })
  wejscie.addEventListener('input', () => naZmiane(wejscie.value))
  const element = h('div', { class: 'pole' }, h('label', { class: 'pole__etykieta', for: id }, etykieta), wejscie,
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert' }))
  ustawBlad(element, null)
  return element
}

/**
 * Chipy wielokrotnego wyboru dni tygodnia: pola checkbox w grupie (`chipy()` ma tylko pojedynczy wybor).
 * @param {readonly number[]} dni @param {(dzien: number) => void} naZmiane @returns {HTMLDivElement}
 */
function poleDni(dni, naZmiane) {
  const id = 'zlecenie-dni'
  const element = h('div', { class: 'grupa-chipow' },
    h('p', { class: 'grupa-chipow__etykieta', id: `${id}-etykieta` }, 'Dni'),
    h('div', { class: 'chipy chipy--dni', role: 'group', 'aria-labelledby': `${id}-etykieta`, 'aria-describedby': `${id}-blad` },
      OPCJE_DNI.map(({ wartosc, etykieta }) => h('label', { class: 'chip' },
        h('input', { type: 'checkbox', name: id, value: String(wartosc), class: 'chip__wejscie', checked: dni.includes(wartosc),
          on: { change: () => naZmiane(wartosc) } }),
        h('span', { class: 'chip__tekst' }, etykieta)))),
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert' }))
  ustawBlad(element, null)
  return element
}

/** @param {WartosciFormularza} w @param {ObslugaPol} obsluga @returns {PolaZlecenia} */
function polaZlecenia(w, obsluga) {
  const opis = pole({ id: 'zlecenie-opis', etykieta: 'Opis', wartosc: w.opis, naZmiane: obsluga.naOpis })
  const wejscieOpisu = opis.querySelector('input')
  if (wejscieOpisu) wejscieOpisu.maxLength = DLUGOSC_OPISU
  return {
    usluga: poleUslugi({ opcje: w.opcjeUslug, wybrana: w.usluga, czyZablokowane: w.wycenaId !== null, naZmiane: obsluga.naUsluge }),
    opis,
    cena: pole({ id: 'zlecenie-cena', etykieta: etykietaCeny(w.rozliczenie), rodzaj: 'liczba', wartosc: w.cena, podpowiedz: w.podpowiedzCeny ?? undefined,
      naZmiane: obsluga.naCene }),
    data: poleCzasu({ id: 'zlecenie-data', etykieta: 'Data', typ: 'date', wartosc: w.data, min: NAJWCZESNIEJSZA_DATA, naZmiane: obsluga.naDate }),
    godzina: poleCzasu({ id: 'zlecenie-godzina', etykieta: 'Godzina', typ: 'time', wartosc: w.godzina, naZmiane: obsluga.naGodzine }),
    powtarzaj: chipy({ id: 'zlecenie-powtarzaj', etykieta: 'Powtarzaj', opcje: OPCJE_POWTARZANIA, wybrana: w.cykl, naZmiane: obsluga.naCykl }),
    dni: poleDni(w.dni, obsluga.naDzien),
    platnosc: chipy({ id: 'zlecenie-platnosc', etykieta: 'Płatność', opcje: OPCJE_PLATNOSCI, wybrana: w.rozliczenie, naZmiane: obsluga.naRozliczenie }),
  }
}

/** Pokazuje pola zalezne od wartosci i ustawia kontrolki, ktore zmienily sie przy innym polu. @param {PolaZlecenia} pola @param {WartosciFormularza} w */
function odswiezPola(pola, w) {
  pola.opis.hidden = w.usluga !== INNA_USLUGA
  pola.dni.hidden = !czyMaDni(w.cykl)
  pola.platnosc.hidden = w.cykl === BEZ_POWTARZANIA
  const etykieta = pola.cena.querySelector('label')
  if (etykieta) etykieta.textContent = etykietaCeny(w.rozliczenie)
  const cena = pola.cena.querySelector('input')
  if (cena && cena.value !== w.cena) cena.value = w.cena
  for (const dzien of pola.dni.querySelectorAll('input')) dzien.checked = w.dni.includes(Number(dzien.value))
  for (const opcja of pola.platnosc.querySelectorAll('input')) opcja.checked = opcja.value === w.rozliczenie
}

/** @param {unknown} blad @returns {string} tekst nieudanego zapisu: odmowa bez zglaszania, awaria przez `reportError`, inne bledy leca dalej */
function tekstBledu(blad) {
  const odmowa = tekstOdmowy(blad)
  if (odmowa !== null) return odmowa
  if (!(blad instanceof BladMagazynu) && !(blad instanceof BladZlecenia)) throw blad
  reportError(blad)
  return blad instanceof BladMagazynu ? tekstBleduZapisu(blad) : BLAD_ZAPISU
}

/** @param {PolaZlecenia} pola @param {WartosciFormularza} w @param {typeof POLA_Z_BLEDEM[number]} nazwa @returns {HTMLElement} pole z bledem: blad uslugi przy „Inna usługa” pod opisem */
function poleBledu(pola, w, nazwa) {
  if (nazwa !== 'usluga') return pola[nazwa]
  return w.usluga === INNA_USLUGA ? pola.opis : pola.usluga
}

/**
 * Pola formularza z obsluga zmian: kazda zmiana czysci blad swojego pola, zapisuje wartosci ekranu i odswieza pola.
 * @param {EkranFormularza} ekran @returns {PolaZlecenia}
 */
function polaEkranu(ekran) {
  /** @param {WartosciFormularza} nowe */
  function zmien(nowe) {
    ekran.wartosci = nowe
    odswiezPola(pola, nowe)
  }
  const pola = polaZlecenia(ekran.wartosci, {
    naUsluge: (usluga) => {
      pokazBlad(poleBledu(pola, ekran.wartosci, 'usluga'), null)
      zmien({ ...ekran.wartosci, usluga })
    },
    naOpis: (opis) => {
      pokazBlad(pola.opis, null)
      zmien({ ...ekran.wartosci, opis })
    },
    naCene: (cena) => {
      pokazBlad(pola.cena, null)
      zmien({ ...ekran.wartosci, cena })
    },
    naDate: (data) => {
      pokazBlad(pola.data, null)
      zmien(zData(ekran.wartosci, data))
    },
    naGodzine: (godzina) => zmien({ ...ekran.wartosci, godzina }),
    naCykl: (cykl) => {
      pokazBlad(pola.dni, null)
      zmien(zCyklem(ekran.wartosci, cykl))
    },
    naDzien: (dzien) => {
      pokazBlad(pola.dni, null)
      zmien(zDniem(ekran.wartosci, dzien))
    },
    naRozliczenie: (rozliczenie) => zmien(zRozliczeniem(ekran.wartosci, rozliczenie)),
  })
  return pola
}

/**
 * Bledy pod polami i fokus na pierwszym (na kliencie ustawia go wyborKlienta).
 * @param {PolaZlecenia} pola @param {WartosciFormularza} w @param {WyborKlienta} wybor @returns {boolean} czy formularz jest poprawny
 */
function sprawdzPola(pola, w, wybor) {
  const czyKlient = wybor.sprawdz()
  const bledy = bledyFormularza(w)
  for (const nazwa of POLA_Z_BLEDEM) {
    const kod = bledy[nazwa]
    pokazBlad(poleBledu(pola, w, nazwa), kod === undefined || kod === 'brak_klienta' ? null : TEKSTY_BLEDOW[kod])
  }
  const pierwsze = POLA_Z_BLEDEM.find((nazwa) => bledy[nazwa] !== undefined)
  const kontrolka = pierwsze === undefined ? null : poleBledu(pola, w, pierwsze).querySelector('input, select')
  if (czyKlient && kontrolka instanceof HTMLElement) kontrolka.focus()
  return czyKlient && pierwsze === undefined
}

/** @param {WartosciFormularza} w @returns {HTMLElement} naglowek z powrotem do wyceny albo do dnia kalendarza */
function naglowekFormularza({ wycenaId, numerWyceny, data }) {
  if (wycenaId === null) return naglowek({ tytul: 'Nowe zlecenie', wstecz: adresKalendarza('dzien', data), wsteczTekst: 'Zlecenia' })
  return naglowek({ tytul: 'Nowe zlecenie', podtytul: numerWyceny ? `Z wyceny ${numerWyceny}` : undefined, wstecz: sciezka('wycena', { id: wycenaId }),
    wsteczTekst: 'Wycena' })
}

/**
 * @param {HTMLElement} kontener @param {Kontekst} kontekst @param {WartosciFormularza} poczatek @param {string | null} plan tekst planowanego czasu
 * @returns {() => void} sprzatanie widoku
 */
function uruchomFormularz(kontener, kontekst, poczatek, plan) {
  const { magazyn, nawiguj } = kontekst
  const id = crypto.randomUUID()
  /** @type {EkranFormularza} */
  const ekran = { wartosci: poczatek }
  let czyAktywny = true
  const komunikat = h('div', { class: 'zlecenie-formularz__komunikat', 'aria-live': 'polite' })
  const wybor = wyborKlienta({ magazyn, wybranyId: poczatek.klientId, wymagany: true, id: 'zlecenie-klient', czyAktywny: () => czyAktywny,
    naWybor: (klientId) => {
      ekran.wartosci = { ...ekran.wartosci, klientId }
      return null
    } })
  const pola = polaEkranu(ekran)

  /** @param {SubmitEvent} zdarzenie */
  function handleZapisz(zdarzenie) {
    zdarzenie.preventDefault()
    komunikat.replaceChildren()
    if (!sprawdzPola(pola, ekran.wartosci, wybor)) return
    /** @type {string} */
    let start
    try {
      start = zapiszFormularz(kontekst, id, ekran.wartosci).start
    } catch (blad) {
      return komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBledu(blad) }))
    }
    const adres = adresKalendarza('dzien', start)
    history.replaceState(null, '', adres)
    nawiguj(adres)
  }

  const formularz = h('form', { class: 'tresc zlecenie-formularz', novalidate: true },
    wybor.element, pola.usluga, pola.opis, pola.cena,
    h('div', { class: 'zlecenie-formularz__dwa-pola' }, pola.data, pola.godzina),
    pola.powtarzaj, pola.dni, pola.platnosc,
    plan === null ? null : h('p', { class: 'zlecenie-formularz__plan' }, plan),
    komunikat, przycisk({ tekst: 'Zapisz zlecenie', typ: 'submit' }))
  formularz.addEventListener('submit', handleZapisz)
  odswiezPola(pola, poczatek)
  kontener.append(naglowekFormularza(poczatek), formularz)
  return () => { czyAktywny = false }
}

/** @param {HTMLElement} kontener */
function ekranBrakuWyceny(kontener) {
  kontener.append(
    naglowek({ tytul: 'Nowe zlecenie', wstecz: sciezka('wyceny'), wsteczTekst: 'Wycena' }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst: WYCENY_NIE_MA, akcja: { tekst: 'Wróć do listy wycen', adres: sciezka('wyceny') } })))
}

/** @type {Widok} */
export const widokFormularzaZlecenia = {
  render(kontener, { zapytanie, kontekst }) {
    const stan = wczytajStan(kontekst.magazyn)
    const { wycena: wycenaId = null, klient: klientId = null, data = null } = zapytanie
    const poczatek = wartosciPoczatkowe(stan, kontekst.katalog, { wycenaId, klientId, data }, dzienLokalny(new Date()))
    if (poczatek === null) return ekranBrakuWyceny(kontener)
    return uruchomFormularz(kontener, kontekst, poczatek, tekstPlanu(poczatek, stan, kontekst.domyslne))
  },
}
