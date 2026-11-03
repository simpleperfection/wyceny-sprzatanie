// Dane ekranu Start i listy wycen (czyste funkcje, bez DOM): powitanie, zdanie o dniu, linie stanu kafli modulow, jeden
// baner (R2, R3, R5) oraz adres i inicjal wiersza wyceny. Dzien `dzis` (RRRR-MM-DD, dzienLokalny) przychodzi w argumencie;
// wizyty, „Do zamknięcia” i „Niezapłacone” licza zapytania modulu Zlecenia (src/zlecenia/zapytania.js).

import { czyPrzypomniecOKopii } from '../dane/kopia.js'
import { brakujeUstawien } from '../dane/ustawienia.js'
import { doZaplanowania } from '../dane/zlecenia.js'
import { czyPokazacInstrukcjeIos } from '../pwa/rejestracja.js'
import { FORMY, kiedy, odmiana } from '../ui/format.js'
import { sciezka } from '../ui/trasy.js'
import { doZamkniecia, liczbaDzis, najblizsza, niezaplacone } from '../zlecenia/zapytania.js'

/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/ustawienia.js').Ustawienia} Ustawienia */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../pwa/rejestracja.js').Srodowisko} Srodowisko */
/** @typedef {import('../ui/moduly.js').IdModulu} IdModulu */
/**
 * @typedef {{ tekst: string, czyAkcja: boolean }} StanKafla czyAkcja: linia wymaga dzialania (wyrozniona na kaflu)
 * @typedef {{ rodzaj: 'ios' } | { rodzaj: 'kopia' } | { rodzaj: 'ustawienia' }} BanerStartu
 */

const JEZYK = 'pl-PL'
const POWITANIE = 'Dzień dobry'
const CHEMIA = 'Środki do każdego brudu'
/** Liczniki kafli nie pokazuja nazw uslug wizyt. */
const BEZ_NAZWY_USLUGI = () => ''

/** @param {string} tekst @returns {StanKafla} */
const akcja = (tekst) => ({ tekst, czyAkcja: true })
/** @param {string} tekst @returns {StanKafla} */
const informacja = (tekst) => ({ tekst, czyAkcja: false })

/** @param {Ustawienia | null} ustawienia @returns {string} „Dzień dobry, Firma” albo samo „Dzień dobry” bez nazwy firmy */
export function powitanie(ustawienia) {
  const nazwa = ustawienia?.firma.nazwa.trim() ?? ''
  return nazwa === '' ? POWITANIE : `${POWITANIE}, ${nazwa}`
}

/**
 * Jedno zdanie o dniu: wizyty dzis (nieodwolane) i, gdy sa, niezaplacone wizyty i miesiace serii.
 * Zly dzien → BladKalendarza `dzien`.
 * @param {Pick<Stan, 'klienci' | 'zlecenia'>} stan @param {string} dzis RRRR-MM-DD
 * @returns {string} „Dziś 2 zlecenia · 1 niezapłacone”, „Dziś nie masz zleceń”
 */
export function zdanieDnia(stan, dzis) {
  const wizyt = liczbaDzis(stan, dzis)
  const doZaplaty = niezaplacone(stan, dzis).length
  const poczatek = wizyt === 0 ? 'Dziś nie masz zleceń' : `Dziś ${wizyt} ${odmiana(wizyt, FORMY.zlecenie)}`
  return doZaplaty === 0 ? poczatek : `${poczatek} · ${doZaplaty} ${odmiana(doZaplaty, FORMY.niezaplacone)}`
}

/** @param {Pick<Stan, 'klienci' | 'zlecenia'>} stan @param {string} dzis @returns {StanKafla} */
function stanZlecen(stan, dzis) {
  const zamkniecia = doZamkniecia(stan, dzis, BEZ_NAZWY_USLUGI).length
  if (zamkniecia > 0) return akcja(`${zamkniecia} do zamknięcia`)
  const dzisiaj = liczbaDzis(stan, dzis)
  if (dzisiaj > 0) return informacja(`${dzisiaj} dziś`)
  const wizyta = najblizsza(stan, dzis, BEZ_NAZWY_USLUGI)
  if (wizyta !== null) return informacja(`Najbliższe: ${kiedy(wizyta.data, wizyta.godzina, dzis)}`)
  return stan.zlecenia.length === 0 ? akcja('Dodaj pierwsze zlecenie') : informacja('Brak zaplanowanych wizyt')
}

/** @param {Pick<Stan, 'wyceny' | 'zlecenia'>} stan @returns {StanKafla} */
function stanWycen(stan) {
  const { wyceny } = stan
  if (wyceny.length === 0) return akcja('Zrób pierwszą wycenę')
  const doWyslania = wyceny.filter((w) => w.status === 'do_wyslania').length
  if (doWyslania > 0) return akcja(`${doWyslania} do wysłania`)
  const zaplanowania = wyceny.filter((w) => doZaplanowania(stan, w)).length
  if (zaplanowania > 0) return akcja(`${zaplanowania} do zaplanowania`)
  const czekaja = wyceny.filter((w) => w.status === 'wyslana').length
  if (czekaja > 0) return informacja(`${czekaja} ${odmiana(czekaja, FORMY.czeka)} na odpowiedź`)
  return informacja(`${wyceny.length} ${odmiana(wyceny.length, FORMY.wycena)}`)
}

/** @param {Pick<Stan, 'klienci'>} stan @returns {StanKafla} */
function stanKlientow({ klienci }) {
  if (klienci.length === 0) return akcja('Dodaj pierwszego klienta')
  return informacja(`${klienci.length} ${odmiana(klienci.length, FORMY.klient)}`)
}

/**
 * Linia stanu kafla modulu (R3): pierwszy spelniony warunek z liczba; bez uzycia modulu pierwszy krok. Chemia ma staly
 * tekst (bez wczytywania data/chemia.json na Start). Nieznany modul → RangeError, zly dzien → BladKalendarza `dzien`.
 * @param {IdModulu} id @param {Pick<Stan, 'wyceny' | 'klienci' | 'zlecenia'>} stan @param {string} dzis RRRR-MM-DD
 * @returns {StanKafla}
 */
export function stanKafla(id, stan, dzis) {
  switch (id) {
    case 'zlecenia': return stanZlecen(stan, dzis)
    case 'wycena': return stanWycen(stan)
    case 'klienci': return stanKlientow(stan)
    case 'chemia': return informacja(CHEMIA)
    default: throw new RangeError(`Nieznany moduł: ${String(id)}`)
  }
}

/**
 * Najwyzej jeden baner na Start (R5), w kolejnosci: instrukcja dla iPhone'a, przypomnienie o kopii, ustawienia domyslne.
 * @param {Stan} stan @param {Date} teraz dzien przypomnienia o kopii @param {Srodowisko} srodowisko przegladarka (instrukcja iOS)
 * @returns {BanerStartu | null}
 */
export function banerStartu(stan, teraz, srodowisko) {
  if (czyPokazacInstrukcjeIos({ ...srodowisko, zamknieta: stan.preferencje.iosInstrukcjaZamknieta })) return { rodzaj: 'ios' }
  if (czyPrzypomniecOKopii(stan, teraz)) return { rodzaj: 'kopia' }
  if (brakujeUstawien(stan.ustawienia).length > 0) return { rodzaj: 'ustawienia' }
  return null
}

/**
 * Adres wiersza wyceny: szkic wraca do kreatora (dokładna) albo szybkiej wyceny, zapisana otwiera `#/wycena/<id>`.
 * @param {Wycena} w
 * @returns {string}
 */
export function adresWyceny(w) {
  if (w.status !== 'szkic') return sciezka('wycena', { id: w.id })
  return w.rodzaj === 'szybka' ? sciezka('szybka', {}, { wycena: w.id }) : sciezka('kreator', { krok: 'usluga' }, { wycena: w.id })
}

/** @param {string} nazwa @returns {string} pierwsza litera nazwy klienta, wielka; pusty tekst, gdy nazwy brak */
export function inicjal(nazwa) {
  const [pierwsza = ''] = Array.from(nazwa.trim())
  return pierwsza.toLocaleUpperCase(JEZYK)
}
