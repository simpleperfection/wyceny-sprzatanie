// Wizyty zlecenia w oknie dat (R13, R14): wizyt serii nie zapisuje sie z gory, licza sie z okresow (cykl, godzina, cena),
// a zapis istnieje tylko dla wizyty ze stanem albo wyjatkiem, pod data pierwotna. Kalendarz liczy okno, ktore pokazuje.
// Czyste funkcje bez DOM, magazynu i zegara; dni RRRR-MM-DD z src/kalendarz/daty.js.

import { BladKalendarza, dniOdDo, dodajDni, dzienTygodnia, dzienWMiesiacu, poczatekTygodnia, porownajDni } from './daty.js'

/** Rodzaje cyklu okresu; zrodlo dla ksztaltu zlecenia (src/dane/zlecenia-ksztalt.js) i formularza zlecenia. */
export const CYKLE = Object.freeze(/** @type {const} */ (['tydzien', 'dwa_tygodnie', 'miesiac']))

/**
 * Tyle zlecenia potrzebuje kalendarz; pelne Zlecenie (src/dane/zlecenia-ksztalt.js) spelnia ten ksztalt, a funkcje
 * oddaja jego wlasne obiekty okresu i stanu (z cena, zaplata), wiec typy sa parametrami.
 * @typedef {typeof CYKLE[number]} RodzajCyklu
 * @typedef {{ co: RodzajCyklu, dni: readonly number[] }} CyklKalendarza dni tygodnia ISO 1–7, puste dla `miesiac`
 * @typedef {{ od: string, cykl: CyklKalendarza | null, godzina: string | null }} OkresKalendarza
 * @typedef {{ przeniesiona: { data: string, godzina: string | null } | null, odwolana: boolean }} StanKalendarza
 */
/**
 * @template {OkresKalendarza} [O=OkresKalendarza]
 * @template {StanKalendarza} [S=StanKalendarza]
 * @typedef {{ start: string, koniec: string | null, okresy: readonly O[], wizyty: Readonly<Record<string, S>> }} ZlecenieKalendarza
 */
/**
 * Wizyta w oknie: `dataPierwotna` to klucz stanu w `wizyty`, `data` to dzien po przesunieciu.
 * @template {OkresKalendarza} [O=OkresKalendarza]
 * @template {StanKalendarza} [S=StanKalendarza]
 * @typedef {{ dataPierwotna: string, data: string, godzina: string | null, okres: O, stan: S | null }} Wystapienie
 */

const DNI_TYGODNIA = 7
const DNI_DWOCH_TYGODNI = 14
const MIESIECY_W_ROKU = 12
/** Najblizsza wizyte szuka sie w tylu dniach od podanego (seria z samymi odwolaniami konczy sie null). */
const HORYZONT_NAJBLIZSZEJ_DNI = 366

/** @param {string} odDnia @param {string} doDnia */
function sprawdzOkno(odDnia, doDnia) {
  if (dniOdDo(odDnia, doDnia) < 0) throw new BladKalendarza('okno', `Okno dat od ${odDnia} kończy się wcześniej (${doDnia})`)
}

/** @param {string} a @param {string} b @returns {string} */
const pozniejszy = (a, b) => (porownajDni(a, b) >= 0 ? a : b)
/** @param {string} a @param {string} b @returns {string} */
const wczesniejszy = (a, b) => (porownajDni(a, b) <= 0 ? a : b)

/**
 * Dzien miesiaca z `odOkresu` w kolejnych miesiacach, w krotszym ostatni dzien (31.01 → 28.02 → 31.03).
 * @param {string} odOkresu @param {string} odDnia nie wczesniej niz odOkresu @param {string} doDnia @returns {string[]}
 */
function dniMiesieczne(odOkresu, odDnia, doDnia) {
  const dzienMiesiaca = Number(odOkresu.slice(8, 10))
  let rok = Number(odDnia.slice(0, 4))
  let miesiac = Number(odDnia.slice(5, 7))
  const wynik = []
  for (let dzien = dzienWMiesiacu(rok, miesiac, dzienMiesiaca); porownajDni(dzien, doDnia) <= 0;
    dzien = dzienWMiesiacu(rok, miesiac, dzienMiesiaca)) {
    if (porownajDni(dzien, odDnia) >= 0) wynik.push(dzien)
    ;[rok, miesiac] = miesiac === MIESIECY_W_ROKU ? [rok + 1, 1] : [rok, miesiac + 1]
  }
  return wynik
}

/**
 * Dni tygodniowe; przy `dwa_tygodnie` tylko tygodnie o parzystej odleglosci od tygodnia (od poniedzialku) `odOkresu`.
 * @param {string} odOkresu @param {CyklKalendarza} cykl @param {string} odDnia nie wczesniej niz odOkresu @param {string} doDnia
 * @returns {string[]}
 */
function dniTygodniowe(odOkresu, cykl, odDnia, doDnia) {
  const kotwica = poczatekTygodnia(odOkresu)
  const wynik = []
  for (let dzien = odDnia; porownajDni(dzien, doDnia) <= 0; dzien = dodajDni(dzien, 1)) {
    const nieparzystyTydzien = cykl.co === 'dwa_tygodnie' && dniOdDo(kotwica, dzien) % DNI_DWOCH_TYGODNI >= DNI_TYGODNIA
    if (!nieparzystyTydzien && cykl.dni.includes(dzienTygodnia(dzien))) wynik.push(dzien)
  }
  return wynik
}

/**
 * Dni, ktore daje regula okresu w oknie `odDnia`–`doDnia` (wlacznie), rosnaco; nic przed `okres.od`.
 * Bez cyklu tylko `okres.od`. Konca okresu (nastepny okres, koniec zlecenia) nie zna: przycina go `wystapienia`.
 * @param {OkresKalendarza} okres @param {string} odDnia @param {string} doDnia
 * @returns {string[]}
 */
export function dniOkresu(okres, odDnia, doDnia) {
  sprawdzOkno(odDnia, doDnia)
  if (okres.cykl !== null && !CYKLE.includes(okres.cykl.co)) {
    throw new BladKalendarza('cykl', `Nieznany cykl okresu: ${String(okres.cykl.co)}`)
  }
  const od = pozniejszy(okres.od, odDnia)
  if (porownajDni(od, doDnia) > 0) return []
  if (okres.cykl === null) return od === okres.od ? [od] : []
  if (okres.cykl.co === 'miesiac') return dniMiesieczne(okres.od, od, doDnia)
  return dniTygodniowe(okres.od, okres.cykl, od, doDnia)
}

/**
 * Okres obowiazujacy w dniu: ostatni z `od` nie pozniejszym niz dzien (dzien przed pierwszym okresem dostaje pierwszy).
 * @template {OkresKalendarza} O @param {readonly O[]} okresy niepuste, rosnace `od` @param {string} dzien @returns {O}
 */
const okresDnia = (okresy, dzien) => okresy.findLast((o) => porownajDni(o.od, dzien) <= 0) ?? okresy[0]

/**
 * Daty pierwotne z reguly w oknie: okres od swojego `od` do dnia przed `od` nastepnego, nic po `koniec` zlecenia.
 * @param {ZlecenieKalendarza} zlecenie @param {string} odDnia @param {string} doDnia @returns {string[]}
 */
function dniZReguly(zlecenie, odDnia, doDnia) {
  const koniecOkna = zlecenie.koniec === null ? doDnia : wczesniejszy(doDnia, zlecenie.koniec)
  return zlecenie.okresy.flatMap((okres, i) => {
    const nastepny = zlecenie.okresy[i + 1]
    const doOkresu = nastepny ? wczesniejszy(koniecOkna, dodajDni(nastepny.od, -1)) : koniecOkna
    return porownajDni(doOkresu, odDnia) < 0 ? [] : dniOkresu(okres, odDnia, doOkresu)
  })
}

/** @param {Wystapienie<OkresKalendarza, StanKalendarza>} a @param {Wystapienie<OkresKalendarza, StanKalendarza>} b @returns {number} */
function porownajWystapienia(a, b) {
  if (a.data !== b.data) return porownajDni(a.data, b.data)
  if (a.godzina !== b.godzina) return a.godzina === null ? 1 : b.godzina === null ? -1 : a.godzina < b.godzina ? -1 : 1
  return porownajDni(a.dataPierwotna, b.dataPierwotna)
}

/**
 * Wizyty zlecenia w dniach `odDnia`–`doDnia` (wlacznie), po dniu i godzinie (bez godziny na koncu dnia).
 * Wizyta z zapisanym stanem jest zawsze, takze gdy regula jej juz nie daje; przesunieta jest w dniu `przeniesiona.data`
 * (takze gdy data pierwotna jest poza oknem), a okres i godzine bierze z daty pierwotnej (godzina przesuniecia wygrywa).
 * @template {OkresKalendarza} O @template {StanKalendarza} S
 * @param {ZlecenieKalendarza<O, S>} zlecenie @param {string} odDnia @param {string} doDnia
 * @returns {Wystapienie<O, S>[]}
 */
export function wystapienia(zlecenie, odDnia, doDnia) {
  sprawdzOkno(odDnia, doDnia)
  const { okresy, wizyty } = zlecenie
  if (okresy.length === 0) throw new BladKalendarza('okresy', 'Zlecenie musi mieć co najmniej jeden okres')
  const pierwotne = new Set([...Object.keys(wizyty), ...dniZReguly(zlecenie, odDnia, doDnia)])
  /** @type {Wystapienie<O, S>[]} */
  const wynik = []
  for (const dataPierwotna of pierwotne) {
    const stan = Object.hasOwn(wizyty, dataPierwotna) ? wizyty[dataPierwotna] : null
    const data = stan?.przeniesiona?.data ?? dataPierwotna
    if (porownajDni(data, odDnia) < 0 || porownajDni(data, doDnia) > 0) continue
    const okres = okresDnia(okresy, dataPierwotna)
    wynik.push({ dataPierwotna, data, godzina: stan?.przeniesiona?.godzina ?? okres.godzina, okres, stan })
  }
  return wynik.sort(porownajWystapienia)
}

/**
 * Pierwsza nieodwolana wizyta od `odDnia` (wlacznie), szukana w HORYZONT_NAJBLIZSZEJ_DNI dniach; inaczej null.
 * @template {OkresKalendarza} O @template {StanKalendarza} S
 * @param {ZlecenieKalendarza<O, S>} zlecenie @param {string} odDnia
 * @returns {Wystapienie<O, S> | null}
 */
export function najblizszaWizyta(zlecenie, odDnia) {
  const okno = wystapienia(zlecenie, odDnia, dodajDni(odDnia, HORYZONT_NAJBLIZSZEJ_DNI - 1))
  return okno.find((w) => !w.stan?.odwolana) ?? null
}
