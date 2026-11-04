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
/** Kolejne okna szukania najblizszej wizyty: dwa tygodnie, dwa miesiace, horyzont. */
const OKNA_NAJBLIZSZEJ_DNI = Object.freeze([14, 62, HORYZONT_NAJBLIZSZEJ_DNI])

/** @param {string} odDnia @param {string} doDnia */
function sprawdzOkno(odDnia, doDnia) {
  if (dniOdDo(odDnia, doDnia) < 0) throw new BladKalendarza('okno', `Okno dat od ${odDnia} kończy się wcześniej (${doDnia})`)
}

/** @param {string} a @param {string} b @returns {string} */
const pozniejszy = (a, b) => (porownajDni(a, b) >= 0 ? a : b)
/** @param {string} a @param {string} b @returns {string} */
const wczesniejszy = (a, b) => (porownajDni(a, b) <= 0 ? a : b)

/** @param {string} dzien RRRR-MM-DD @returns {number} dzien miesiaca 1–31 */
const numerDnia = (dzien) => Number(dzien.slice(8, 10))

/**
 * Dzien miesiaca w kolejnych miesiacach, w krotszym ostatni dzien (31.01 → 28.02 → 31.03).
 * @param {number} dzienMiesiaca 1–31 @param {string} odDnia @param {string} doDnia @returns {string[]}
 */
function dniMiesieczne(dzienMiesiaca, odDnia, doDnia) {
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
 * Dla kazdego dnia cyklu pierwszy pasujacy dzien okna, dalej krok 7 albo 14 dni liczony na numerze dnia (Date.UTC), wiec
 * koszt rosnie z liczba wizyt, a nie z dlugoscia okna.
 * @param {string} odOkresu @param {CyklKalendarza} cykl @param {string} odDnia nie wczesniej niz odOkresu @param {string} doDnia
 * @returns {string[]}
 */
function dniTygodniowe(odOkresu, cykl, odDnia, doDnia) {
  const coDwa = cykl.co === 'dwa_tygodnie'
  const krok = coDwa ? DNI_DWOCH_TYGODNI : DNI_TYGODNIA
  const dniOkna = dniOdDo(odDnia, doDnia)
  const dniOdKotwicy = dniOdDo(poczatekTygodnia(odOkresu), odDnia)
  const tydzienOd = dzienTygodnia(odDnia)
  const [rok, miesiac, dzien] = odDnia.split('-').map(Number)
  const wynik = []
  for (const dzienCyklu of cykl.dni) {
    let przesuniecie = (dzienCyklu - tydzienOd + DNI_TYGODNIA) % DNI_TYGODNIA
    if (coDwa && (dniOdKotwicy + przesuniecie) % DNI_DWOCH_TYGODNI >= DNI_TYGODNIA) przesuniecie += DNI_TYGODNIA
    for (let i = przesuniecie; i <= dniOkna; i += krok) {
      wynik.push(new Date(Date.UTC(rok, miesiac - 1, dzien + i)).toISOString().slice(0, 10))
    }
  }
  return wynik.sort()
}

/**
 * Dni, ktore daje regula okresu w oknie `odDnia`–`doDnia` (wlacznie), rosnaco; nic przed `okres.od`.
 * Bez cyklu tylko `okres.od`. Konca okresu (nastepny okres, koniec zlecenia) nie zna: przycina go `wystapienia`.
 * Cykl `miesiac` wypada w dniu `dzienMiesiaca` (domyslnie dzien z `okres.od`; kotwice serii podaje dniKotwic).
 * @param {OkresKalendarza} okres @param {string} odDnia @param {string} doDnia @param {number} [dzienMiesiaca] 1–31
 * @returns {string[]}
 */
export function dniOkresu(okres, odDnia, doDnia, dzienMiesiaca = numerDnia(okres.od)) {
  sprawdzOkno(odDnia, doDnia)
  if (okres.cykl !== null && !CYKLE.includes(okres.cykl.co)) {
    throw new BladKalendarza('cykl', `Nieznany cykl okresu: ${String(okres.cykl.co)}`)
  }
  const od = pozniejszy(okres.od, odDnia)
  if (porownajDni(od, doDnia) > 0) return []
  if (okres.cykl === null) return od === okres.od ? [od] : []
  if (okres.cykl.co === 'miesiac') return dniMiesieczne(dzienMiesiaca, od, doDnia)
  return dniTygodniowe(okres.od, okres.cykl, od, doDnia)
}

/**
 * Okres obowiazujacy w dniu: ostatni z `od` nie pozniejszym niz dzien (dzien przed pierwszym okresem dostaje pierwszy).
 * Jedyna regula okresu dnia dla kalendarza, zapisu wizyt i zaplat (src/dane/) i zapytan (src/zlecenia/). Dni porownuje jako
 * teksty (RRRR-MM-DD sprawdza jestZlecenie przy odczycie stanu), bo to goraca petla po calej historii zlecenia.
 * @template {OkresKalendarza} O @param {readonly O[]} okresy niepuste, rosnace `od` @param {string} dzien @returns {O}
 */
export const okresDnia = (okresy, dzien) => okresy.findLast((o) => o.od <= dzien) ?? okresy[0]

/**
 * Dzien miesiaca kazdego okresu: okres miesieczny, ktory zaczyna sie w dniu wizyty poprzedniego okresu miesiecznego
 * (zmiana „od wizyty” 28.02 w serii od 31.01), dziedziczy jego dzien, wiec seria nie przesuwa sie na stale na 28.;
 * pozostale okresy biora dzien ze swojego `od`.
 * @param {readonly OkresKalendarza[]} okresy @returns {number[]}
 */
function dniKotwic(okresy) {
  /** @type {number[]} */
  const wynik = []
  okresy.forEach((okres, i) => {
    const poprzedni = okresy[i - 1]
    const kotwica = wynik[i - 1]
    const miesieczne = poprzedni?.cykl?.co === 'miesiac' && okres.cykl?.co === 'miesiac'
    const wDniuWizyty = miesieczne && dzienWMiesiacu(Number(okres.od.slice(0, 4)), Number(okres.od.slice(5, 7)), kotwica) === okres.od
    wynik.push(wDniuWizyty ? kotwica : numerDnia(okres.od))
  })
  return wynik
}

/**
 * Daty pierwotne z reguly w oknie: okres od swojego `od` do dnia przed `od` nastepnego, nic po `koniec` zlecenia.
 * @param {ZlecenieKalendarza} zlecenie @param {string} odDnia @param {string} doDnia @returns {string[]}
 */
function dniZReguly(zlecenie, odDnia, doDnia) {
  const koniecOkna = zlecenie.koniec === null ? doDnia : wczesniejszy(doDnia, zlecenie.koniec)
  const kotwice = dniKotwic(zlecenie.okresy)
  return zlecenie.okresy.flatMap((okres, i) => {
    const nastepny = zlecenie.okresy[i + 1]
    const doOkresu = nastepny ? wczesniejszy(koniecOkna, dodajDni(nastepny.od, -1)) : koniecOkna
    return porownajDni(doOkresu, odDnia) < 0 ? [] : dniOkresu(okres, odDnia, doOkresu, kotwice[i])
  })
}

/** @param {Wystapienie<OkresKalendarza, StanKalendarza>} a @param {Wystapienie<OkresKalendarza, StanKalendarza>} b @returns {number} */
function porownajWystapienia(a, b) {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1
  if (a.godzina !== b.godzina) return a.godzina === null ? 1 : b.godzina === null ? -1 : a.godzina < b.godzina ? -1 : 1
  return a.dataPierwotna === b.dataPierwotna ? 0 : a.dataPierwotna < b.dataPierwotna ? -1 : 1
}

/**
 * Wizyty zlecenia w dniach `odDnia`–`doDnia` (wlacznie), po dniu i godzinie (bez godziny na koncu dnia).
 * Wizyta z zapisanym stanem jest zawsze, takze gdy regula jej juz nie daje; przesunieta jest w dniu `przeniesiona.data`
 * (takze gdy data pierwotna jest poza oknem), a okres i godzine bierze z daty pierwotnej (godzina przesuniecia wygrywa).
 * Granice okna sprawdza sprawdzOkno, a daty wizyt jestZlecenie przy odczycie stanu, wiec petla porownuje je jako teksty.
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
    if (data < odDnia || data > doDnia) continue
    const okres = okresDnia(okresy, dataPierwotna)
    wynik.push({ dataPierwotna, data, godzina: stan?.przeniesiona?.godzina ?? okres.godzina, okres, stan })
  }
  return wynik.sort(porownajWystapienia)
}

/**
 * Pierwsza nieodwolana wizyta od `odDnia` (wlacznie), szukana w HORYZONT_NAJBLIZSZEJ_DNI dniach; inaczej null.
 * Okna rosna (OKNA_NAJBLIZSZEJ_DNI): okno ma kazda wizyte z dniem w nim, wiec pierwsza w krotszym jest pierwsza w dluzszym.
 * @template {OkresKalendarza} O @template {StanKalendarza} S
 * @param {ZlecenieKalendarza<O, S>} zlecenie @param {string} odDnia
 * @returns {Wystapienie<O, S> | null}
 */
export function najblizszaWizyta(zlecenie, odDnia) {
  for (const dni of OKNA_NAJBLIZSZEJ_DNI) {
    const pierwsza = wystapienia(zlecenie, odDnia, dodajDni(odDnia, dni - 1)).find((w) => !w.stan?.odwolana)
    if (pierwsza !== undefined) return pierwsza
  }
  return null
}
