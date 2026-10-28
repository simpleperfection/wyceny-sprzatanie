// Zlecenia firmy (R12, R13, R22, R26): zapis zlecenia recznego i z przyjetej wyceny, zmiana „od wizyty” jako nowy okres,
// zakonczenie serii, usuniecie i odczyty dla wycen. Kazda akcja to jedno magazyn.zmien na swiezym stanie; ksztalt rekordu
// opisuje jestZlecenie (src/dane/zlecenia-ksztalt.js), a spojnosc odwolan do klientow i wycen sprawdza magazyn.

import { jestGodzina, porownajDni } from '../kalendarz/daty.js'
import { okresDnia } from '../kalendarz/wystapienia.js'
import { jestDniem, jestId, jestKwota, jestLiczba, jestObiektem } from './ksztalt.js'
import { czyAbonament, wycena } from './wyceny.js'
import { DLUGOSC_OPISU, jestZlecenie, MAKS_WIZYT_ZLECENIA, MAKS_ZLECEN, ROZLICZENIA } from './zlecenia-ksztalt.js'

/**
 * @typedef {import('./magazyn.js').Magazyn} Magazyn
 * @typedef {import('./magazyn.js').Stan} Stan
 * @typedef {import('./wyceny.js').Wycena} Wycena
 * @typedef {import('./zlecenia-ksztalt.js').Cykl} Cykl
 * @typedef {import('./zlecenia-ksztalt.js').Okres} Okres
 * @typedef {import('./zlecenia-ksztalt.js').PlanZlecenia} PlanZlecenia
 * @typedef {import('./zlecenia-ksztalt.js').Rozliczenie} Rozliczenie
 * @typedef {import('./zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {{ teraz?: () => Date }} OpcjeZlecen zegar (do testow)
 * @typedef {{ cykl?: Cykl | null, godzina?: string | null, cenaWizyty?: number | null, cenaMiesiaca?: number | null }} ZmianaOkresu
 *   brak pola = bez zmiany; cena wedlug rozliczenia: cenaWizyty (`za_wizyte`) albo cenaMiesiaca (`miesiecznie`)
 * @typedef {ZmianaOkresu & { klientId: string, uslugaId?: string | null, opis?: string | null, rozliczenie: Rozliczenie,
 *   start: string }} NoweZlecenie pierwszy okres od `start`; pusty opis zapisuje null
 * @typedef {Omit<NoweZlecenie, 'uslugaId'> & { tempo?: number }} ZlecenieZWyceny tempo planu (tempoDoWyceny), wymagane przy migawce
 */

/** Pola okresu zmieniane „od wizyty”. */
const POLA_OKRESU = /** @type {const} */ (['cykl', 'godzina', 'cenaWizyty', 'cenaMiesiaca'])
/** @type {Readonly<Omit<Okres, 'od'>>} */
const PUSTY_OKRES = Object.freeze({ cykl: null, godzina: null, cenaWizyty: null, cenaMiesiaca: null })

/**
 * Bledna operacja na zleceniu albo wizycie: `brak_zlecenia`, `brak_klienta`, `brak_wyceny`, `brak_wizyty`, `brak_zaplaty`,
 * `zly_status`, `jednorazowe`, `rozliczenie_miesieczne`, `za_duzo` oraz bledy wejscia (`id`, `dane`, `nieznane_pole`, `usluga`,
 * `opis`, `rozliczenie`, `start`, `data`, `koniec`, `godzina`, `cena`, `cykl`, `tempo`, `forma`, `minuty`, `miesiac`).
 */
export class BladZlecenia extends Error {
  /** @param {string} kod @param {string} [komunikat] */
  constructor(kod, komunikat = kod) {
    super(komunikat)
    this.name = 'BladZlecenia'
    this.kod = kod
  }
}

/** @param {OpcjeZlecen} opcje */
const zegar = ({ teraz = () => new Date() }) => teraz()

/** @param {Pick<Stan, 'zlecenia'>} stan @param {string} id @returns {Zlecenie | null} */
export const zlecenie = (stan, id) => stan.zlecenia.find((z) => z.id === id) ?? null
/** Zlecenia klienta w kolejnosci zapisu. @param {Pick<Stan, 'zlecenia'>} stan @param {string} klientId @returns {Zlecenie[]} */
export const zleceniaKlienta = (stan, klientId) => stan.zlecenia.filter((z) => z.klientId === klientId)
/** Zlecenia z wyceny w kolejnosci zapisu. @param {Pick<Stan, 'zlecenia'>} stan @param {string} wycenaId @returns {Zlecenie[]} */
export const zleceniaWyceny = (stan, wycenaId) => stan.zlecenia.filter((z) => z.wycenaId === wycenaId)
/** Seria (okresy z cyklem), a nie zlecenie jednorazowe. @param {Pick<Zlecenie, 'okresy'>} z @returns {boolean} */
export const czySeria = (z) => z.okresy[0].cykl !== null

/**
 * Wycena z co najmniej jednym zleceniem jest tylko do odczytu.
 * @param {Pick<Stan, 'zlecenia'>} stan @param {string} wycenaId @returns {boolean}
 */
export const czyWycenaZamknieta = (stan, wycenaId) => stan.zlecenia.some((z) => z.wycenaId === wycenaId)

/**
 * „Do zaplanowania”: przyjeta wycena bez zlecenia, a abonament (czyAbonament) — bez zlecenia z cyklem.
 * @param {Pick<Stan, 'zlecenia'>} stan @param {Pick<Wycena, 'id' | 'status' | 'wynik'>} w @returns {boolean}
 */
export function doZaplanowania(stan, w) {
  if (w.status !== 'przyjeta') return false
  const zlecenia = zleceniaWyceny(stan, w.id)
  return w.wynik !== null && czyAbonament(w.wynik) ? !zlecenia.some(czySeria) : zlecenia.length === 0
}

/**
 * Okres `od` z polami bazy nadpisanymi przez zmiane; godzina HH:MM albo null, jedna cena ≥ 0 wedlug rozliczenia.
 * @param {Omit<Okres, 'od'>} baza @param {ZmianaOkresu} zmiana @param {Rozliczenie} rozliczenie @param {string} od @returns {Okres}
 */
function okresZeZmiany(baza, zmiana, rozliczenie, od) {
  const { cykl = baza.cykl, godzina = baza.godzina, cenaWizyty = baza.cenaWizyty, cenaMiesiaca = baza.cenaMiesiaca } = zmiana
  if (godzina !== null && !jestGodzina(godzina)) throw new BladZlecenia('godzina', `Godzina musi mieć postać HH:MM, jest ${String(godzina)}`)
  const [cena, inna] = rozliczenie === 'miesiecznie' ? [cenaMiesiaca, cenaWizyty] : [cenaWizyty, cenaMiesiaca]
  if (!jestKwota(cena) || inna !== null) {
    const pole = rozliczenie === 'miesiecznie' ? 'cenaMiesiaca' : 'cenaWizyty'
    throw new BladZlecenia('cena', `Zlecenie rozliczane ${rozliczenie} ma tylko cenę ${pole} (liczba ≥ 0), jest ${String(cena)}`)
  }
  return { od, cykl, godzina, cenaWizyty, cenaMiesiaca }
}

/** @param {unknown} x @returns {string | null} opis przyciety; pusty = null */
function opisZDanych(x) {
  if (x === undefined || x === null) return null
  if (typeof x !== 'string') throw new BladZlecenia('opis', 'Opis zlecenia musi być tekstem')
  const opis = x.trim()
  if (opis.length > DLUGOSC_OPISU) throw new BladZlecenia('opis', `Opis zlecenia może mieć najwyżej ${DLUGOSC_OPISU} znaków`)
  return opis === '' ? null : opis
}

/**
 * Rekord ze zmienionym polem sprawdzony straznikiem; po sprawdzeniu godziny i ceny zostaje tylko zly cykl.
 * @param {Zlecenie} z @returns {Zlecenie}
 */
function sprawdzony(z) {
  if (z.okresy.length > MAKS_WIZYT_ZLECENIA) throw new BladZlecenia('za_duzo', `Zlecenie może mieć najwyżej ${MAKS_WIZYT_ZLECENIA} okresów`)
  if (!jestZlecenie(z)) throw new BladZlecenia('cykl', 'Powtarzanie ma zły rodzaj albo dni tygodnia (1–7, bez powtórzeń)')
  return z
}

/**
 * Nowy rekord zlecenia z danych formularza.
 * @param {NoweZlecenie} dane
 * @param {{ id: string, teraz: string, wycenaId: string | null, uslugaId: string | null, plan: PlanZlecenia | null }} pola
 * @returns {Zlecenie}
 */
function rekordZlecenia(dane, { id, teraz, wycenaId, uslugaId, plan }) {
  if (!jestObiektem(dane)) throw new BladZlecenia('dane', 'Dane zlecenia muszą być obiektem')
  if (!jestId(dane.klientId)) throw new BladZlecenia('brak_klienta', 'Zlecenie musi mieć klienta')
  const rozliczenie = ROZLICZENIA.find((r) => r === dane.rozliczenie)
  if (rozliczenie === undefined) throw new BladZlecenia('rozliczenie', `Rozliczenie: ${ROZLICZENIA.join(' albo ')}`)
  if (!jestDniem(dane.start)) throw new BladZlecenia('start', `Początek zlecenia musi mieć postać RRRR-MM-DD, jest ${String(dane.start)}`)
  if (uslugaId !== null && !jestId(uslugaId)) throw new BladZlecenia('usluga', 'Identyfikator usługi musi być niepustym tekstem')
  const opis = opisZDanych(dane.opis)
  if (uslugaId === null && opis === null) throw new BladZlecenia('usluga', 'Zlecenie musi mieć usługę albo opis')
  const { cykl, godzina, cenaWizyty, cenaMiesiaca } = dane
  const okres = okresZeZmiany(PUSTY_OKRES, { cykl, godzina, cenaWizyty, cenaMiesiaca }, rozliczenie, dane.start)
  if (rozliczenie === 'miesiecznie' && okres.cykl === null) throw new BladZlecenia('rozliczenie', 'Rozliczenie miesięczne ma tylko seria')
  return sprawdzony({ id, klientId: dane.klientId, wycenaId, uslugaId, opis, rozliczenie, start: dane.start, okresy: [okres],
    koniec: null, plan, wizyty: {}, zaplatyMiesieczne: {}, utworzone: teraz, zmienione: teraz })
}

/**
 * Zapis nowego zlecenia z id od wolajacego: zapisane juz id (podwojne „Zapisz”, druga karta) oddaje zapisane bez zmian.
 * @param {Magazyn} magazyn @param {OpcjeZlecen & { id: string }} opcje
 * @param {(stan: Stan, id: string, teraz: string) => Zlecenie} zbuduj rekord na swiezym stanie; moze rzucic BladZlecenia
 * @returns {Zlecenie}
 */
function dodajZlecenie(magazyn, opcje, zbuduj) {
  const id = opcje?.id
  if (!jestId(id)) throw new BladZlecenia('id', 'Identyfikator zlecenia musi być niepustym tekstem')
  const obecny = magazyn.wczytaj()
  const zapisane = 'stan' in obecny ? zlecenie(obecny.stan, id) : null
  if (zapisane !== null) return zapisane
  const teraz = zegar(opcje).toISOString()
  const stan = magazyn.zmien((s) => {
    if (zlecenie(s, id) !== null) return s
    if (s.zlecenia.length >= MAKS_ZLECEN) throw new BladZlecenia('za_duzo', `Można zapisać najwyżej ${MAKS_ZLECEN} zleceń`)
    const nowe = zbuduj(s, id, teraz)
    if (!s.klienci.some((k) => k.id === nowe.klientId)) throw new BladZlecenia('brak_klienta', `Nie ma klienta ${nowe.klientId}`)
    return { ...s, zlecenia: [...s.zlecenia, nowe] }
  })
  const wynik = zlecenie(stan, id)
  if (wynik === null) throw new BladZlecenia('brak_zlecenia', `Nie zapisano zlecenia ${id}`)
  return wynik
}

/**
 * Zlecenie reczne (bez wyceny i bez planu, wiec nie liczy sie do tempa, R15): klient, usluga albo opis, rozliczenie, start
 * i pierwszy okres z cyklem (null = jednorazowe), godzina i cena. Wiecej niz MAKS_ZLECEN → `za_duzo`.
 * @param {Magazyn} magazyn @param {NoweZlecenie} dane @param {OpcjeZlecen & { id: string }} opcje
 * @returns {Zlecenie}
 */
export function utworzZlecenie(magazyn, dane, opcje) {
  const uslugaId = jestObiektem(dane) ? dane.uslugaId ?? null : null
  return dodajZlecenie(magazyn, opcje, (_stan, id, teraz) => rekordZlecenia(dane, { id, teraz, wycenaId: null, uslugaId, plan: null }))
}

/**
 * Zlecenie z przyjetej wyceny (inny status → `zly_status`): usluga z wyceny, plan z minut normowych migawki i tempa
 * od wolajacego (bez migawki plan null); okres i cykl z `dane` (dni abonamentu podpowiada formularz).
 * @param {Magazyn} magazyn @param {string} wycenaId @param {ZlecenieZWyceny} dane @param {OpcjeZlecen & { id: string }} opcje
 * @returns {Zlecenie}
 */
export function zaplanujZWyceny(magazyn, wycenaId, dane, opcje) {
  return dodajZlecenie(magazyn, opcje, (stan, id, teraz) => {
    const w = wycena(stan, wycenaId)
    if (w === null) throw new BladZlecenia('brak_wyceny', `Nie ma wyceny ${wycenaId}`)
    if (w.status !== 'przyjeta') throw new BladZlecenia('zly_status', `Planuje się przyjętą wycenę, ta ma status ${w.status}`)
    const tempo = jestObiektem(dane) ? dane.tempo : undefined
    if (w.wynik !== null && !(jestLiczba(tempo) && tempo > 0)) throw new BladZlecenia('tempo', `Tempo planu musi być dodatnie, jest ${tempo}`)
    const plan = w.wynik === null || tempo === undefined ? null : { minutyNormowe: w.wynik.minutyNormowe, tempo }
    return rekordZlecenia(dane, { id, teraz, wycenaId: w.id, uslugaId: w.wejscie.uslugaId, plan })
  })
}

/**
 * Zmiana jednego zlecenia na swiezym stanie magazynu z `zmienione` = teraz; `fn` moze rzucic BladZlecenia (nic sie nie
 * zapisuje), a oddany bez zmian obiekt zostawia zlecenie i jego `zmienione`. Wspolna dla zlecen i wizyt (src/dane/wizyty.js).
 * @param {Magazyn} magazyn @param {string} id @param {OpcjeZlecen} opcje
 * @param {(z: Zlecenie, stan: Stan, teraz: Date) => Zlecenie} fn
 * @returns {Stan}
 */
export function zmienZlecenie(magazyn, id, opcje, fn) {
  const teraz = zegar(opcje)
  return magazyn.zmien((stan) => {
    const indeks = stan.zlecenia.findIndex((z) => z.id === id)
    if (indeks === -1) throw new BladZlecenia('brak_zlecenia', `Nie ma zlecenia ${id}`)
    const obecne = stan.zlecenia[indeks]
    const nowe = fn(obecne, stan, teraz)
    if (nowe === obecne) return stan
    const zapisane = { ...nowe, zmienione: teraz.toISOString() }
    return { ...stan, zlecenia: stan.zlecenia.map((z, i) => (i === indeks ? zapisane : z)) }
  })
}

/** @param {unknown} zmiany @returns {ZmianaOkresu} */
function zmianaOkresu(zmiany) {
  if (!jestObiektem(zmiany)) throw new BladZlecenia('dane', 'Zmiana zlecenia musi być obiektem')
  const nieznane = Object.keys(zmiany).find((klucz) => !POLA_OKRESU.some((pole) => pole === klucz))
  if (nieznane !== undefined) throw new BladZlecenia('nieznane_pole', `Nieznane pole okresu: ${nieznane}`)
  return zmiany
}

/**
 * Zmiana ceny, godziny albo cyklu od wizyty z data pierwotna w przod (R13): w serii nowy okres od tego dnia (okres o tym samym
 * `od` zostaje zastapiony), a podane pola nadpisuja tez pozniejsze okresy (ich pozostale pola zostaja). Zmiana cyklu usuwa
 * pozniejsze okresy: kazdy okres liczy kotwice cyklu od swojego `od` (tydzien dla `dwa_tygodnie`, dzien dla `miesiac`), wiec
 * z nowym cyklem rozbilyby rytm nowego okresu. W zleceniu jednorazowym zmiana jedynego okresu (dodanie cyklu → `jednorazowe`).
 * @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {ZmianaOkresu} zmiany @param {OpcjeZlecen} [opcje]
 * @returns {Stan}
 */
export function zmienOdWizyty(magazyn, id, dataPierwotna, zmiany, opcje = {}) {
  if (!jestDniem(dataPierwotna)) throw new BladZlecenia('data', `Dzień wizyty musi mieć postać RRRR-MM-DD, jest ${String(dataPierwotna)}`)
  const zmiana = zmianaOkresu(zmiany)
  return zmienZlecenie(magazyn, id, opcje, (z) => {
    if (!czySeria(z)) {
      if (zmiana.cykl !== undefined && zmiana.cykl !== null) throw new BladZlecenia('jednorazowe', 'Zlecenie jednorazowe nie ma powtarzania')
      return sprawdzony({ ...z, okresy: [okresZeZmiany(z.okresy[0], zmiana, z.rozliczenie, z.start)] })
    }
    if (porownajDni(dataPierwotna, z.start) < 0) throw new BladZlecenia('data', `Seria zaczyna się ${z.start}, wizyta ${dataPierwotna} jest wcześniej`)
    if (zmiana.cykl === null) throw new BladZlecenia('cykl', 'Seria musi mieć powtarzanie')
    const okres = okresZeZmiany(okresDnia(z.okresy, dataPierwotna), zmiana, z.rozliczenie, dataPierwotna)
    const wczesniejsze = z.okresy.filter((o) => porownajDni(o.od, dataPierwotna) < 0)
    const pozniejsze = zmiana.cykl === undefined
      ? z.okresy.filter((o) => porownajDni(o.od, dataPierwotna) > 0).map((o) => okresZeZmiany(o, zmiana, z.rozliczenie, o.od))
      : []
    return sprawdzony({ ...z, okresy: [...wczesniejsze, okres, ...pozniejsze] })
  })
}

/**
 * Koniec serii: ostatni dzien z wizyta, nie wczesniej niz start (inaczej `koniec`); wizyty z zapisanym stanem po nim zostaja.
 * @param {Magazyn} magazyn @param {string} id @param {string} ostatniDzien @param {OpcjeZlecen} [opcje]
 * @returns {Stan}
 */
export function zakonczSerie(magazyn, id, ostatniDzien, opcje = {}) {
  if (!jestDniem(ostatniDzien)) throw new BladZlecenia('koniec', `Ostatni dzień serii musi mieć postać RRRR-MM-DD, jest ${String(ostatniDzien)}`)
  return zmienZlecenie(magazyn, id, opcje, (z) => {
    if (!czySeria(z)) throw new BladZlecenia('jednorazowe', 'Zlecenie jednorazowe nie ma serii do zakończenia')
    if (porownajDni(ostatniDzien, z.start) < 0) throw new BladZlecenia('koniec', `Seria zaczyna się ${z.start}, nie skończy się ${ostatniDzien}`)
    return z.koniec === ostatniDzien ? z : { ...z, koniec: ostatniDzien }
  })
}

/**
 * Usuniecie zlecenia razem ze stanem jego wizyt i zaplat.
 * @param {Magazyn} magazyn @param {string} id
 * @returns {Stan}
 */
export function usunZlecenie(magazyn, id) {
  return magazyn.zmien((stan) => {
    if (zlecenie(stan, id) === null) throw new BladZlecenia('brak_zlecenia', `Nie ma zlecenia ${id}`)
    return { ...stan, zlecenia: stan.zlecenia.filter((z) => z.id !== id) }
  })
}
