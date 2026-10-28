// Ksztalt zapisanego zlecenia (R12, R13, R24): okresy z cyklem, godzina i jedna cena wedlug rozliczenia, stany wizyt pod
// data pierwotna, zaplaty miesieczne pod RRRR-MM. Straznik jestZlecenie jest jedynym opisem rekordu: uzywa go magazyn
// (src/dane/magazyn.js) i kopia zapasowa. Sprawdza wartosci, nie tylko typy, bo dane przychodza tez z pliku kopii.

import { jestGodzina } from '../kalendarz/daty.js'
import { CYKLE } from '../kalendarz/wystapienia.js'
import { jestDataIso, jestDniem, jestId, jestKwota, jestLiczba, jestMiesiacem, jestObiektem } from './ksztalt.js'

/** Sposoby rozliczenia zlecenia; zrodlo stalej dla ksztaltu, formularza zlecenia i kopii. */
export const ROZLICZENIA = Object.freeze(/** @type {const} */ (['za_wizyte', 'miesiecznie']))
/** Formy zaplaty; zrodlo stalej dla ksztaltu, ekranu zamkniecia wizyty i kopii. */
export const FORMY_ZAPLATY = Object.freeze(/** @type {const} */ (['gotowka', 'przelew', 'blik']))
/** Najwiecej zapisanych zlecen; ta sama granica obowiazuje przy zapisie i w kopii zapasowej. */
export const MAKS_ZLECEN = 10000
/** Najwiecej wpisow w `wizyty`, w `zaplatyMiesieczne` i w `okresy` jednego zlecenia. */
export const MAKS_WIZYT_ZLECENIA = 2000
/** Najdluzszy czas pracy jednej wizyty w minutach (doba). */
export const MAKS_MINUT_PRACY = 1440
/** Najdluzszy opis zlecenia (nazwa wyswietlana zamiast nazwy uslugi). */
export const DLUGOSC_OPISU = 120

/** Dni tygodnia ISO w cyklu: 1 = poniedzialek … 7 = niedziela. */
const DNI_TYGODNIA = Object.freeze({ min: 1, max: 7 })

/**
 * @typedef {typeof ROZLICZENIA[number]} Rozliczenie
 * @typedef {typeof FORMY_ZAPLATY[number]} FormaZaplaty
 * @typedef {import('../kalendarz/wystapienia.js').RodzajCyklu} RodzajCyklu
 * @typedef {{ co: RodzajCyklu, dni: number[] }} Cykl dni tygodnia ISO 1–7 bez powtorzen, puste dla `miesiac`
 * @typedef {{ od: string, cykl: Cykl | null, godzina: string | null, cenaWizyty: number | null, cenaMiesiaca: number | null }} Okres
 *   dokladnie jedna cena wedlug rozliczenia zlecenia
 * @typedef {{ forma: FormaZaplaty | null, data: string, kwota: number }} Zaplata forma null tylko w wizytach z wersji 1
 * @typedef {{ przeniesiona: { data: string, godzina: string | null } | null, odwolana: boolean, zrobiona: string | null,
 *   zaplata: Zaplata | null, minutyPracy: number | null }} StanWizyty
 * @typedef {{ minutyNormowe: number, tempo: number }} PlanZlecenia
 * @typedef {{ id: string, klientId: string, wycenaId: string | null, uslugaId: string | null, opis: string | null,
 *   rozliczenie: Rozliczenie, start: string, okresy: Okres[], koniec: string | null, plan: PlanZlecenia | null,
 *   wizyty: Record<string, StanWizyty>, zaplatyMiesieczne: Record<string, Zaplata>, utworzone: string, zmienione: string }} Zlecenie
 *   wizyty pod data pierwotna RRRR-MM-DD, zaplaty miesieczne pod RRRR-MM
 */

/** @param {unknown} x */
const jestDodatnia = (x) => jestLiczba(x) && x > 0
/** @param {unknown} x */
const jestOpisem = (x) => x === null || (typeof x === 'string' && x !== '' && x === x.trim() && x.length <= DLUGOSC_OPISU)
/** @param {unknown} x */
const jestDniemTygodnia = (x) => Number.isInteger(x) && Number(x) >= DNI_TYGODNIA.min && Number(x) <= DNI_TYGODNIA.max

/** @param {unknown} x @returns {x is Cykl} */
function jestCyklem(x) {
  if (!jestObiektem(x) || !CYKLE.some((c) => c === x.co) || !Array.isArray(x.dni)) return false
  const dni = x.dni
  if (!dni.every(jestDniemTygodnia) || new Set(dni).size !== dni.length) return false
  return x.co === 'miesiac' ? dni.length === 0 : dni.length > 0
}

/** @param {unknown} x @param {Rozliczenie} rozliczenie @returns {x is Okres} */
function jestOkresem(x, rozliczenie) {
  if (!jestObiektem(x) || !jestDniem(x.od) || (x.godzina !== null && !jestGodzina(x.godzina))) return false
  if (x.cykl !== null && !jestCyklem(x.cykl)) return false
  return rozliczenie === 'miesiecznie'
    ? x.cenaWizyty === null && jestKwota(x.cenaMiesiaca)
    : x.cenaMiesiaca === null && jestKwota(x.cenaWizyty)
}

/**
 * Okresy: niepuste, rosnace `od`, pierwszy od `start`; jednorazowe = jeden okres bez cyklu, seria = kazdy okres z cyklem;
 * rozliczenie miesieczne tylko w serii.
 * @param {unknown} okresy @param {Rozliczenie} rozliczenie @param {string} start @returns {okresy is Okres[]}
 */
function saOkresami(okresy, rozliczenie, start) {
  if (!Array.isArray(okresy) || okresy.length === 0 || okresy.length > MAKS_WIZYT_ZLECENIA) return false
  if (!okresy.every((o) => jestOkresem(o, rozliczenie))) return false
  if (okresy[0].od !== start || !okresy.every((o, i) => i === 0 || okresy[i - 1].od < o.od)) return false
  const jednorazowe = okresy.length === 1 && okresy[0].cykl === null
  if (jednorazowe) return rozliczenie === 'za_wizyte'
  return okresy.every((o) => o.cykl !== null)
}

/** @param {unknown} x @returns {x is Zaplata} */
const jestZaplata = (x) => jestObiektem(x) && (x.forma === null || FORMY_ZAPLATY.some((f) => f === x.forma)) && jestDniem(x.data) &&
  jestKwota(x.kwota)

/** @param {unknown} x */
const jestPrzeniesieniem = (x) => x === null || (jestObiektem(x) && jestDniem(x.data) && (x.godzina === null || jestGodzina(x.godzina)))

/** @param {unknown} x */
const jestMinutamiPracy = (x) => x === null || (jestLiczba(x) && x >= 1 && x <= MAKS_MINUT_PRACY)

/** @param {unknown} x @returns {x is StanWizyty} */
const jestStanemWizyty = (x) => jestObiektem(x) && jestPrzeniesieniem(x.przeniesiona) && typeof x.odwolana === 'boolean' &&
  (x.zrobiona === null || jestDataIso(x.zrobiona)) && (x.zaplata === null || jestZaplata(x.zaplata)) && jestMinutamiPracy(x.minutyPracy)

/**
 * Obiekt do MAKS_WIZYT_ZLECENIA wpisow, kazdy klucz i wartosc spelniaja warunek.
 * @param {unknown} x @param {(klucz: string) => boolean} czyKlucz @param {(wartosc: unknown) => boolean} czyWartosc
 */
function jestRejestrem(x, czyKlucz, czyWartosc) {
  if (!jestObiektem(x)) return false
  const wpisy = Object.entries(x)
  return wpisy.length <= MAKS_WIZYT_ZLECENIA && wpisy.every(([klucz, wartosc]) => czyKlucz(klucz) && czyWartosc(wartosc))
}

/** @param {unknown} x */
const jestPlanem = (x) => x === null || (jestObiektem(x) && jestDodatnia(x.minutyNormowe) && jestDodatnia(x.tempo))

/**
 * Zapisane zlecenie (stan magazynu, plik kopii): odwolania jako niepuste id (czy wskazuja istniejace rekordy, sprawdza magazyn),
 * okresy zgodne z rozliczeniem, koniec nie przed startem, wizyty pod dniami, zaplaty miesieczne pod miesiacami RRRR-MM.
 * @param {unknown} x
 * @returns {x is Zlecenie}
 */
export function jestZlecenie(x) {
  if (!jestObiektem(x) || !jestId(x.id) || !jestId(x.klientId) || !(x.wycenaId === null || jestId(x.wycenaId))) return false
  if (!(x.uslugaId === null || jestId(x.uslugaId)) || !jestOpisem(x.opis) || !jestPlanem(x.plan)) return false
  const rozliczenie = ROZLICZENIA.find((r) => r === x.rozliczenie)
  if (rozliczenie === undefined || !jestDniem(x.start) || !saOkresami(x.okresy, rozliczenie, x.start)) return false
  if (x.koniec !== null && !(jestDniem(x.koniec) && x.koniec >= x.start)) return false
  return jestRejestrem(x.wizyty, jestDniem, jestStanemWizyty) && jestRejestrem(x.zaplatyMiesieczne, jestMiesiacem, jestZaplata) &&
    jestDataIso(x.utworzone) && jestDataIso(x.zmienione)
}
