// Model ekranu wizyty (`#/zlecenie/:id/wizyta/:data`, R13, R15, R16, R22, R26): wystapienie po dacie pierwotnej, teksty stanow
// i widocznosc akcji. Czyste funkcje bez DOM i bez zapisu: stan odczytany raz na render i dzien `dzis` przychodza w argumentach,
// zapisy robi src/dane/wizyty.js. „Zrobione” i czas pracy sa od dnia wizyty, a zaplate mozna oznaczyc z wyprzedzeniem.

import { klient } from '../dane/klienci.js'
import { jestDniem } from '../dane/ksztalt.js'
import { formaDomyslna } from '../dane/wizyty.js'
import { wycena } from '../dane/wyceny.js'
import { czySeria, zlecenie } from '../dane/zlecenia.js'
import { porownajDni } from '../kalendarz/daty.js'
import { wystapienia } from '../kalendarz/wystapienia.js'
import { czas, dzienKrotko, godzina, zl } from '../ui/format.js'
import { ETYKIETY_FORM_ZAPLATY } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { adresKalendarza, W_ABONAMENCIE } from './kalendarz-dane.js'
import { czasStartowy, planIFaktWizyty } from './plan-fakt.js'
import { niezaplacone } from './zapytania.js'

/**
 * @typedef {import('../dane/magazyn.js').Stan} Stan
 * @typedef {import('../dane/zlecenia-ksztalt.js').FormaZaplaty} FormaZaplaty
 * @typedef {import('../dane/zlecenia-ksztalt.js').Okres} Okres
 * @typedef {import('../dane/zlecenia-ksztalt.js').StanWizyty} StanWizyty
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zaplata} Zaplata
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('../kalendarz/wystapienia.js').Wystapienie<Okres, StanWizyty>} WystapienieZlecenia
 * @typedef {import('../silnik/katalog.js').Katalog} Katalog
 * @typedef {import('../ui/statusy.js').StanPigulkiWizyty} StanPigulkiWizyty
 * @typedef {Pick<Stan, 'klienci' | 'zlecenia' | 'wyceny' | 'ustawienia'>} StanWizytyEkranu
 * @typedef {{ rodzaj: 'do_zaplaty', forma: FormaZaplaty } | { rodzaj: 'zapisana', tekst: string, forma: FormaZaplaty }} ZaplataWizyty
 *   forma: zaznaczona w chipach (do_zaplaty: domyslna klienta; zapisana: jej forma, a bez niej domyslna klienta)
 * @typedef {{ plan: string | null, fakt: string, zostaje: string | null }} CzasPracyWizyty
 * @typedef {{ zlecenieId: string, dataPierwotna: string, powrot: string, dzien: string, termin: string,
 *   klient: { nazwa: string, adres: string }, adres: string | null, kwota: string, usluga: string | null,
 *   pigulki: StanPigulkiWizyty[], czyOdwolana: boolean, czyZrobiona: boolean, czyMozeZrobione: boolean, zaplata: ZaplataWizyty | null,
 *   czasPracy: CzasPracyWizyty | null, startCzasu: number | null, przesuniecie: { data: string, godzina: string } | null,
 *   linki: { zmienOd: string | null, zlecenie: string, wycena: { tekst: string, adres: string } | null } }} ModelWizyty
 *   dzien: krotki tekst dnia wizyty; startCzasu: start licznika, null bez akcji „Dopisz czas pracy”; przesuniecie: wartosci
 *   poczatkowe pol, null bez akcji „Przesuń”
 */

/** Start licznika czasu pracy zlecenia bez planu, w minutach. */
const CZAS_BEZ_PLANU = 60

/**
 * Wizyta po dacie pierwotnej: okno to dzien wizyty po przesunieciu, bo tylko w nim `wystapienia` ja oddaje.
 * @param {Zlecenie} z @param {string} dataPierwotna @returns {WystapienieZlecenia | null}
 */
function wystapienieWizyty(z, dataPierwotna) {
  const dzien = Object.hasOwn(z.wizyty, dataPierwotna) ? z.wizyty[dataPierwotna].przeniesiona?.data ?? dataPierwotna : dataPierwotna
  return wystapienia(z, dzien, dzien).find((w) => w.dataPierwotna === dataPierwotna) ?? null
}

/** @param {WystapienieZlecenia} w @returns {string} „pn 2 lis, 9:00” albo sam dzien */
const tekstTerminu = (w) => (w.godzina === null ? dzienKrotko(w.data) : `${dzienKrotko(w.data)}, ${godzina(w.godzina)}`)

/** @param {Zaplata} zaplata @returns {string} „Zapłacone · Przelew · pn 2 lis”, a bez formy (wizyty z wersji 1) „Zapłacone” */
function tekstZaplaty({ forma, data }) {
  return forma === null ? 'Zapłacone' : `Zapłacone · ${ETYKIETY_FORM_ZAPLATY[forma]} · ${dzienKrotko(data)}`
}

/**
 * Zapisana zaplata albo akcja zaplaty (rozliczenie za wizyte, cena > 0, wizyta nieodwolana); inaczej null.
 * @param {Zlecenie} z @param {WystapienieZlecenia} w @param {StanWizytyEkranu} stan @returns {ZaplataWizyty | null}
 */
function zaplataWizyty(z, w, stan) {
  const zaplata = w.stan?.zaplata ?? null
  if (zaplata !== null) return { rodzaj: 'zapisana', tekst: tekstZaplaty(zaplata), forma: zaplata.forma ?? formaDomyslna(stan, z.klientId) }
  if ((w.stan?.odwolana ?? false) || z.rozliczenie !== 'za_wizyte' || (w.okres.cenaWizyty ?? 0) === 0) return null
  return { rodzaj: 'do_zaplaty', forma: formaDomyslna(stan, z.klientId) }
}

/**
 * Pigulki ekranu: odwolanie ma pierwszenstwo, reszta w kolejnosci przesuniecie, wykonanie, zaplata.
 * @param {Zlecenie} z @param {WystapienieZlecenia} w @param {StanWizytyEkranu} stan @param {string} dzis @returns {StanPigulkiWizyty[]}
 */
function pigulkiWizyty(z, w, stan, dzis) {
  if (w.stan === null) return []
  if (w.stan.odwolana) return ['odwolana']
  /** @type {StanPigulkiWizyty[]} */
  const pigulki = []
  if (w.stan.przeniesiona !== null) pigulki.push('przesunieta')
  if (w.stan.zrobiona !== null) pigulki.push('zrobiona')
  if (w.stan.zaplata !== null) pigulki.push('zaplacona')
  const czyCzeka = niezaplacone(stan, dzis, z.klientId).some((n) => n.rodzaj === 'wizyta' && n.zlecenieId === z.id && n.klucz === w.dataPierwotna)
  if (czyCzeka) pigulki.push('niezaplacona')
  return pigulki
}

/**
 * Plan i fakt po zapisie czasu; plan tylko w zleceniu z planem, „Zostaje” tylko ze stawka z wyceny.
 * @param {Zlecenie} z @param {WystapienieZlecenia} w @param {StanWizytyEkranu} stan @param {Katalog} katalog
 * @returns {CzasPracyWizyty | null}
 */
function czasPracyWizyty(z, w, stan, katalog) {
  const minuty = w.stan?.minutyPracy ?? null
  if (minuty === null) return null
  const planIFakt = planIFaktWizyty(z, w.dataPierwotna, stan, katalog)
  const stawka = planIFakt?.stawka ?? null
  return { plan: planIFakt === null ? null : `Plan ${czas(planIFakt.plan)}`, fakt: `Fakt ${czas(minuty)}`,
    zostaje: stawka === null ? null : `Zostaje ${zl(stawka)}/h` }
}

/** @param {Zlecenie} z @param {WystapienieZlecenia} w @returns {number} minuty startu licznika: zapisany czas, plan albo czas bez planu */
function startLicznika(z, w) {
  const zapisane = w.stan?.minutyPracy ?? null
  if (zapisane !== null) return zapisane
  return z.plan === null ? CZAS_BEZ_PLANU : czasStartowy(z)
}

/** @param {Zlecenie} z @param {string} dataPierwotna @param {Pick<Stan, 'wyceny'>} stan @returns {ModelWizyty['linki']} */
function linkiWizyty(z, dataPierwotna, stan) {
  const w = z.wycenaId === null ? null : wycena(stan, z.wycenaId)
  return { zmienOd: czySeria(z) ? sciezka('zlecenie', { id: z.id }, { od: dataPierwotna }) : null, zlecenie: sciezka('zlecenie', { id: z.id }),
    wycena: w === null || w.numer === null ? null : { tekst: `Wycena ${w.numer}`, adres: sciezka('wycena', { id: w.id }) } }
}

/** @param {Zlecenie} z @param {Pick<Katalog, 'uslugi'>} katalog @returns {string | null} opis albo nazwa uslugi z katalogu */
function nazwaZlecenia(z, katalog) {
  if (z.opis !== null || z.uslugaId === null) return z.opis
  const { uslugaId } = z
  return katalog.uslugi.find((u) => u.id === uslugaId)?.nazwa ?? uslugaId
}

/**
 * Model ekranu wizyty; nieznane zlecenie albo wizyta (zly dzien, dzien bez wizyty) daja null.
 * @param {StanWizytyEkranu} stan @param {Katalog} katalog @param {string} id @param {string} dataPierwotna @param {string} dzis RRRR-MM-DD
 * @returns {ModelWizyty | null}
 */
export function modelWizyty(stan, katalog, id, dataPierwotna, dzis) {
  const z = zlecenie(stan, id)
  const k = z === null ? null : klient(stan, z.klientId)
  const w = z === null || !jestDniem(dataPierwotna) ? null : wystapienieWizyty(z, dataPierwotna)
  if (z === null || k === null || w === null) return null
  const czyOdwolana = w.stan?.odwolana ?? false
  const czyZrobiona = (w.stan?.zrobiona ?? null) !== null
  const czyOdDnia = !czyOdwolana && porownajDni(w.data, dzis) <= 0
  return { zlecenieId: z.id, dataPierwotna, powrot: adresKalendarza('dzien', w.data === dzis ? null : w.data), dzien: dzienKrotko(w.data),
    termin: tekstTerminu(w), klient: { nazwa: k.nazwa, adres: sciezka('klient', { id: k.id }) }, adres: k.adres,
    kwota: w.okres.cenaWizyty === null ? W_ABONAMENCIE : zl(w.okres.cenaWizyty), usluga: nazwaZlecenia(z, katalog),
    pigulki: pigulkiWizyty(z, w, stan, dzis), czyOdwolana, czyZrobiona, czyMozeZrobione: czyOdDnia && !czyZrobiona,
    zaplata: zaplataWizyty(z, w, stan), czasPracy: czasPracyWizyty(z, w, stan, katalog), startCzasu: czyOdDnia ? startLicznika(z, w) : null,
    przesuniecie: czyOdwolana ? null : { data: w.data, godzina: w.godzina ?? '' }, linki: linkiWizyty(z, dataPierwotna, stan) }
}
