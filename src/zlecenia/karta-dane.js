// Model karty zlecenia (`#/zlecenie/:id`, R13, R16, R22, R26): opis rodzaju i okresow, najblizsza wizyta, zaplaty za miesiace,
// dzien konca serii i wartosci formularza „Zmień od wizyty”. Czyste funkcje bez DOM i bez zapisu: stan odczytany raz na render
// i dzien `dzis` przychodza w argumentach, zapisy robia src/dane/zlecenia.js i src/dane/wizyty.js.

import { klient } from '../dane/klienci.js'
import { jestDniem, jestKwota } from '../dane/ksztalt.js'
import { czyMiesiacMaWizyte, formaDomyslna, kwotaMiesiaca } from '../dane/wizyty.js'
import { wycena } from '../dane/wyceny.js'
import { BladZlecenia, czySeria, zlecenie } from '../dane/zlecenia.js'
import { dodajDni, dzienTygodnia, miesiacDnia } from '../kalendarz/daty.js'
import { najblizszaWizyta, okresDnia, wystapienia } from '../kalendarz/wystapienia.js'
import { dzienKrotko, godzina, kiedy, kwotaJednostki, miesiacRok, parsujLiczbe, SKROTY_DNI, tekstLiczby } from '../ui/format.js'
import { sciezka } from '../ui/trasy.js'
import { czyMaDni, ETYKIETY_CYKLI, jestDataZlecenia } from './opcje.js'
import { dzienWizyty, nazwaZlecenia, nazwyUslug, tekstTerminu, tekstZaplaty } from './teksty-wizyty.js'
import { niezaplacone } from './zapytania.js'

/**
 * @typedef {import('../dane/magazyn.js').Stan} Stan
 * @typedef {import('../dane/zlecenia.js').ZmianaOkresu} ZmianaOkresu
 * @typedef {import('../dane/zlecenia-ksztalt.js').FormaZaplaty} FormaZaplaty
 * @typedef {import('../dane/zlecenia-ksztalt.js').Okres} Okres
 * @typedef {import('../dane/zlecenia-ksztalt.js').StanWizyty} StanWizyty
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('../kalendarz/wystapienia.js').RodzajCyklu} RodzajCyklu
 * @typedef {import('../kalendarz/wystapienia.js').Wystapienie<Okres, StanWizyty>} WystapienieZlecenia
 * @typedef {import('../silnik/katalog.js').Katalog} Katalog
 * @typedef {{ miesiac: string, nazwa: string, kwota: string, zaplata: string | null, czyNiezaplacony: boolean }} MiesiacDoZaplaty
 *   miesiac: RRRR-MM; nazwa: „Listopad 2026”; zaplata: „Zapłacone · Przelew · pn 2 lis”, bez zaplaty null
 * @typedef {{ tytul: string, opis: string }} OpisOkresu
 * @typedef {{ tytul: string, opis: string, adres: string }} WierszWizytyKarty
 * @typedef {{ cena: string, godzina: string, cykl: RodzajCyklu | null, dni: number[] }} WartosciZmiany cykl null w zleceniu jednorazowym
 * @typedef {{ zlecenie: Zlecenie, tytul: string, koniec: string | null, klient: { nazwa: string, adres: string }, rodzaj: string,
 *   wizyta: WierszWizytyKarty | null, okresy: OpisOkresu[], wycena: { tekst: string, adres: string } | null, czySeria: boolean,
 *   zmianaOd: string | null, domyslnyKoniec: string, czyMaZaplaty: boolean, miesiace: MiesiacDoZaplaty[], forma: FormaZaplaty }} ModelKarty
 *   zmianaOd: data pierwotna wizyty dla „Zmień cenę lub godzinę”, null bez akcji; forma: zaznaczona w chipach zaplaty za miesiac
 */

/** Tyle dni daje trzy kolejne wizyty cyklu miesiecznego, wiec co najmniej jedna wypada w dniu kotwicy. */
const OKNO_KOTWICY_DNI = 62
/** Pierwszy dzien miesiaca plus tyle dni to zawsze nastepny miesiac (i nigdy kolejny). */
const DNI_DO_NASTEPNEGO_MIESIACA = 31

/** @param {string} dzien RRRR-MM-DD @returns {number} dzien miesiaca 1–31 */
const numerDnia = (dzien) => Number(dzien.slice(8, 10))

/**
 * Jedyna wizyta zlecenia jednorazowego: okno to jej dzien po przesunieciu, bo tylko w nim `wystapienia` ja oddaje.
 * @param {Zlecenie} z @returns {WystapienieZlecenia}
 */
function jedynaWizyta(z) {
  const dzien = dzienWizyty(z, z.start)
  return wystapienia(z, dzien, dzien)[0]
}

/**
 * Dzien miesiaca okresu miesiecznego: najwiekszy wsrod kilku pierwszych wizyt okresu, bo krotszy miesiac przycina dzien kotwicy,
 * a okres od wizyty 28.02 w serii od 31.01 dalej wypada 31. dnia (kotwice liczy `wystapienia`).
 * @param {Zlecenie} z @param {number} indeks okresu @returns {number}
 */
function dzienMiesiacaOkresu(z, indeks) {
  const { od } = z.okresy[indeks]
  const regula = { ...z, okresy: z.okresy.slice(0, indeks + 1), koniec: null, wizyty: {} }
  return Math.max(...wystapienia(regula, od, dodajDni(od, OKNO_KOTWICY_DNI)).map((w) => numerDnia(w.data)))
}

/** @param {readonly number[]} dni tygodnia ISO @returns {string} „pn, czw” */
const tekstDni = (dni) => [...dni].sort((a, b) => a - b).map((d) => SKROTY_DNI[d - 1]).join(', ')

/**
 * Powtarzanie okresu: „Co tydzień: pn, czw”, „Co 2 tygodnie: wt”, „Co miesiąc, 14. dnia”.
 * @param {Zlecenie} z @param {number} indeks okresu serii @returns {string}
 */
function tekstCyklu(z, indeks) {
  const { cykl } = z.okresy[indeks]
  if (cykl?.co === 'tydzien' || cykl?.co === 'dwa_tygodnie') return `${ETYKIETY_CYKLI[cykl.co]}: ${tekstDni(cykl.dni)}`
  return `${ETYKIETY_CYKLI.miesiac}, ${dzienMiesiacaOkresu(z, indeks)}. dnia`
}

/** @param {Zlecenie} z @param {Okres} okres @returns {string} „250 zł za wizytę” albo „1 560 zł miesięcznie” */
function tekstKwoty({ rozliczenie }, { cenaWizyty, cenaMiesiaca }) {
  return rozliczenie === 'miesiecznie' ? `${kwotaJednostki(cenaMiesiaca ?? 0)} miesięcznie` : `${kwotaJednostki(cenaWizyty ?? 0)} za wizytę`
}

/** @param {Zlecenie} z @param {number} indeks @returns {string} opis okresu serii, bez godziny w okresie bez godziny */
function opisOkresu(z, indeks) {
  const okres = z.okresy[indeks]
  return [tekstCyklu(z, indeks), okres.godzina === null ? null : godzina(okres.godzina), tekstKwoty(z, okres)].filter((t) => t !== null).join(' · ')
}

/**
 * Opis rodzaju zlecenia z pierwszego okresu: „Co tydzień: pn, czw · 9:00 · 250 zł za wizytę”, „Jednorazowe · pn 2 lis, 9:00 · 250 zł”.
 * Pozniejsze okresy opisuje okresyDoPokazania.
 * @param {Zlecenie} z @returns {string}
 */
export function opisRodzaju(z) {
  if (czySeria(z)) return opisOkresu(z, 0)
  const w = jedynaWizyta(z)
  return `Jednorazowe · ${tekstTerminu(w.data, w.godzina)} · ${kwotaJednostki(w.okres.cenaWizyty ?? 0)}`
}

/** Okresy serii od drugiego: „Od pn 9 lis” i opis okresu. @param {Zlecenie} z @returns {OpisOkresu[]} */
export const okresyDoPokazania = (z) => z.okresy.slice(1).map((okres, i) => ({ tytul: `Od ${dzienKrotko(okres.od)}`, opis: opisOkresu(z, i + 1) }))

/**
 * Najblizsza wizyta do wykonania: w serii pierwsza od `dzis` nieodwolana i niezrobiona (zrobiona dla szukania liczy sie jak
 * odwolana), a w zleceniu jednorazowym jego wizyta, dopoki nie jest zrobiona ani odwolana, takze po terminie. Bez takiej null.
 * @param {Zlecenie} z @param {string} dzis RRRR-MM-DD @returns {WystapienieZlecenia | null}
 */
export function najblizszaOtwarta(z, dzis) {
  if (!czySeria(z)) {
    const w = jedynaWizyta(z)
    return w.stan === null || (w.stan.zrobiona === null && !w.stan.odwolana) ? w : null
  }
  const wizyty = Object.fromEntries(Object.entries(z.wizyty).map(([dzien, s]) => [dzien, s.zrobiona === null ? s : { ...s, odwolana: true }]))
  return najblizszaWizyta({ ...z, wizyty }, dzis)
}

/**
 * Wiersz wizyty na karcie: najblizsza, a w zleceniu jednorazowym po zamknieciu ta jedyna, bo inaczej nie byloby do niej przejscia.
 * @param {Zlecenie} z @param {string} dzis @returns {WierszWizytyKarty | null}
 */
function wierszWizyty(z, dzis) {
  const najblizsza = najblizszaOtwarta(z, dzis)
  const w = najblizsza ?? (czySeria(z) ? null : jedynaWizyta(z))
  if (w === null) return null
  return { tytul: najblizsza === null ? 'Wizyta' : 'Najbliższa wizyta', opis: kiedy(w.data, w.godzina, dzis),
    adres: sciezka('wizyta', { id: z.id, data: w.dataPierwotna }) }
}

/**
 * Domyslny ostatni dzien serii: ostatnia zrobiona wizyta, a bez takiej dzis (seria z przyszlym startem: dzien startu).
 * @param {Zlecenie} z @param {string} dzis RRRR-MM-DD @returns {string}
 */
export function domyslnyKoniec(z, dzis) {
  const zrobione = Object.entries(z.wizyty).filter(([, s]) => s.zrobiona !== null && !s.odwolana).map(([dzien]) => dzien).sort()
  const ostatnia = zrobione.at(-1) ?? dzis
  return ostatnia < z.start ? z.start : ostatnia
}

/**
 * Blad ostatniego dnia serii: dzien przed startem albo niepelna data daje kod, poprawny dzien null.
 * @param {string} dzien @param {string} start RRRR-MM-DD @returns {'brak_daty' | null}
 */
export const bladKonca = (dzien, start) => (jestDataZlecenia(dzien) && dzien >= start ? null : 'brak_daty')

/**
 * Miesiace serii miesiecznej od pierwszego z wizyta do miesiaca `dzis`, najnowszy pierwszy; miesiace bez wizyt (po koncu serii)
 * odpadaja, a zaplacony pokazuje zapisana kwote. Flaga niezaplaconego z tej samej reguly co zdanie dnia i karta klienta
 * (`niezaplacone`, src/zlecenia/zapytania.js). Zlecenie rozliczane za wizyte i seria przed startem daja pusta liste.
 * @param {Zlecenie} z @param {string} dzis RRRR-MM-DD @returns {MiesiacDoZaplaty[]}
 */
export function miesiaceDoZaplaty(z, dzis) {
  if (z.rozliczenie !== 'miesiecznie') return []
  const biezacy = miesiacDnia(dzis)
  const zalegle = new Set(niezaplacone({ klienci: [], zlecenia: [z] }, dzis).map((n) => n.klucz))
  /** @type {MiesiacDoZaplaty[]} */
  const wynik = []
  for (let miesiac = miesiacDnia(z.start); miesiac <= biezacy; miesiac = miesiacDnia(dodajDni(`${miesiac}-01`, DNI_DO_NASTEPNEGO_MIESIACA))) {
    const zaplata = Object.hasOwn(z.zaplatyMiesieczne, miesiac) ? z.zaplatyMiesieczne[miesiac] : null
    if (zaplata === null && !czyMiesiacMaWizyte(z, miesiac)) continue
    wynik.unshift({ miesiac, nazwa: miesiacRok(`${miesiac}-01`), kwota: kwotaJednostki(zaplata?.kwota ?? kwotaMiesiaca(z, miesiac)),
      zaplata: zaplata === null ? null : tekstZaplaty(zaplata), czyNiezaplacony: zalegle.has(miesiac) })
  }
  return wynik
}

/** @param {Zlecenie} z @returns {boolean} czy usuniecie zlecenia zabierze zapisane zaplaty */
const czyMaZaplaty = (z) => Object.keys(z.zaplatyMiesieczne).length > 0 || Object.values(z.wizyty).some((s) => s.zaplata !== null)

/**
 * Data pierwotna z `?od=`, gdy zlecenie ma taka wizyte (zapisany stan albo regula okresow); zla albo obca data daje null.
 * @param {Zlecenie} z @param {string | null} od @returns {string | null}
 */
export function wizytaZAdresu(z, od) {
  if (od === null || !jestDniem(od)) return null
  return Object.hasOwn(z.wizyty, od) || wystapienia({ ...z, wizyty: {} }, od, od).length > 0 ? od : null
}

/**
 * Wartosci formularza zmiany: cena i cykl z okresu wizyty, a godzina taka, jaka widac w kalendarzu (godzina przesuniecia wygrywa,
 * jak w `wystapienia`). Cykl bez dni tygodnia (co miesiac) podpowiada dzien tygodnia wizyty na wypadek zmiany powtarzania.
 * @param {Zlecenie} z @param {string} dataPierwotna @returns {WartosciZmiany}
 */
export function wartosciZmiany(z, dataPierwotna) {
  const { cykl, godzina: czasOkresu, cenaWizyty, cenaMiesiaca } = okresDnia(z.okresy, dataPierwotna)
  const czasPrzesuniecia = Object.hasOwn(z.wizyty, dataPierwotna) ? z.wizyty[dataPierwotna].przeniesiona?.godzina : null
  const dni = cykl === null || cykl.dni.length === 0 ? [dzienTygodnia(dataPierwotna)] : [...cykl.dni]
  return { cena: tekstLiczby(cenaWizyty ?? cenaMiesiaca ?? 0), godzina: czasPrzesuniecia ?? czasOkresu ?? '', cykl: cykl?.co ?? null, dni }
}

/**
 * Tytul arkusza zmiany. W serii dzien pierwotny, bo od niego dziala zapisany okres, wiec po przesunieciu za kolejna wizyte tytul z nowym
 * dniem pomijalby ja. Zlecenie jednorazowe ma jedna wizyte, wiec dzien z kalendarza.
 * @param {Zlecenie} z @param {string} dataPierwotna @returns {string}
 */
export function tytulZmiany(z, dataPierwotna) {
  const czySeria = okresDnia(z.okresy, dataPierwotna).cykl !== null
  return `Zmiana od ${dzienKrotko(czySeria ? dataPierwotna : dzienWizyty(z, dataPierwotna))}`
}

/** @param {WartosciZmiany} w @returns {boolean} */
const czyZDniami = ({ cykl }) => cykl !== null && czyMaDni(cykl)

/**
 * Bledy pol formularza zmiany, kody jak w bledyFormularza; bez bledow pusty obiekt.
 * @param {WartosciZmiany} w @returns {{ cena?: 'zla_cena', dni?: 'brak_dni' }}
 */
export function bledyZmiany(w) {
  return { ...(jestKwota(parsujLiczbe(w.cena)) ? {} : { cena: 'zla_cena' }), ...(czyZDniami(w) && w.dni.length === 0 ? { dni: 'brak_dni' } : {}) }
}

/** @param {WartosciZmiany} przed @param {WartosciZmiany} po @returns {boolean} */
function czyInnyCykl(przed, po) {
  if (przed.cykl !== po.cykl) return true
  return czyZDniami(po) && [...przed.dni].sort().join() !== [...po.dni].sort().join()
}

/**
 * Tylko pola, ktore uzytkownik zmienil: zmienOdWizyty nadpisuje podanymi polami pozniejsze okresy, a podany cykl je usuwa, wiec
 * sama zmiana godziny nie moze niesc ceny i cyklu. Bez zmian pusty obiekt; formularz z bledami → BladZlecenia `dane`.
 * @param {Zlecenie} z @param {string} dataPierwotna @param {WartosciZmiany} w @returns {ZmianaOkresu}
 */
export function zmianaDoZapisu(z, dataPierwotna, w) {
  const cena = parsujLiczbe(w.cena)
  if (cena === null || Object.keys(bledyZmiany(w)).length > 0) throw new BladZlecenia('dane', 'Formularz zmiany ma błędy')
  const przed = wartosciZmiany(z, dataPierwotna)
  const nowaCena = z.rozliczenie === 'miesiecznie' ? { cenaMiesiaca: cena } : { cenaWizyty: cena }
  return { ...(cena === parsujLiczbe(przed.cena) ? {} : nowaCena),
    ...(w.godzina === przed.godzina ? {} : { godzina: w.godzina === '' ? null : w.godzina }),
    ...(w.cykl === null || !czyInnyCykl(przed, w) ? {} : { cykl: { co: w.cykl, dni: czyZDniami(w) ? [...w.dni] : [] } }) }
}

/**
 * Model karty zlecenia; nieznane zlecenie albo klient daja null.
 * @param {Pick<Stan, 'klienci' | 'zlecenia' | 'wyceny'>} stan @param {Pick<Katalog, 'uslugi'>} katalog @param {string} id
 * @param {string} dzis RRRR-MM-DD @returns {ModelKarty | null}
 */
export function modelKarty(stan, katalog, id, dzis) {
  const z = zlecenie(stan, id)
  const k = z === null ? null : klient(stan, z.klientId)
  if (z === null || k === null) return null
  const w = z.wycenaId === null ? null : wycena(stan, z.wycenaId)
  const seria = czySeria(z)
  return { zlecenie: z, tytul: nazwaZlecenia(z, nazwyUslug(katalog)), koniec: z.koniec === null ? null : `Zakończona ${dzienKrotko(z.koniec)}`,
    klient: { nazwa: k.nazwa, adres: sciezka('klient', { id: k.id }) }, rodzaj: opisRodzaju(z), wizyta: wierszWizyty(z, dzis),
    okresy: okresyDoPokazania(z), wycena: w === null ? null : { tekst: w.numer === null ? 'Wycena' : `Wycena ${w.numer}`, adres: sciezka('wycena', { id: w.id }) },
    czySeria: seria, zmianaOd: seria ? najblizszaOtwarta(z, dzis)?.dataPierwotna ?? null : z.start, domyslnyKoniec: domyslnyKoniec(z, dzis),
    czyMaZaplaty: czyMaZaplaty(z), miesiace: miesiaceDoZaplaty(z, dzis), forma: formaDomyslna(stan, z.klientId) }
}
