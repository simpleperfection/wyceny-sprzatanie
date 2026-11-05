// Krok aktualizacji stanu z wersji 1 do 2 (R25, R22, R17): klienci z nazw wycen, zlecenia z wykonan i przyjetych wycen
// z terminem, wycena bez statusu „wykonana” i bez wykonan. Funkcja czysta i calkowita, bez zegara i losowych id, bo magazyn
// aktualizuje stan przy kazdym odczycie i kazdy odczyt ma dac ten sam wynik. Dane nieczytelne nie daja zlecenia (wycena zostaje
// „do zaplanowania”), zamiast konczyc sie ekranem ratunkowym. Wzor czystej transformacji: polaczStany w src/dane/kopia.js.

import { DLUGOSCI_KLIENTA, normalizujNazwe } from './klienci.js'
import { jestDataIso, jestDniem, jestId, jestKwota, jestLiczba, jestObiektem, TERMIN_ISO } from './ksztalt.js'
import { czyAbonament, kwotaWyceny } from './kwota-wyceny.js'
import { MAKS_MINUT_PRACY, MIN_MINUT_PRACY } from './zlecenia-ksztalt.js'

/**
 * @typedef {import('./klienci.js').Klient} Klient
 * @typedef {import('./zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('./zlecenia-ksztalt.js').PlanZlecenia} PlanZlecenia
 * @typedef {{ id: string, data: string, minuty: unknown, tempoPlanu: unknown }} WykonanieV1 wpis czasu pracy z wersji 1
 * @typedef {Record<string, unknown> & { id: string, numer: unknown, utworzona: string, zmieniona: string, status: unknown,
 *   klient: Record<string, unknown>, wejscie: unknown, wynik: unknown, cenaReczna: unknown, wykonania: unknown }} WycenaV1
 *   wycena z wersji 1 z polami, ktore czyta migracja
 */

/** Wersja schematu po tym kroku. */
const WERSJA_PO_KROKU = 2
/** Status wersji 1 po wpisaniu czasu pracy zlecenia jednorazowego; w wersji 2 wycena konczy sie na „przyjeta”. */
const STATUS_WYKONANA_V1 = 'wykonana'
/** Wersja 1 nie zapisywala chwili wpisu czasu pracy: wizyta z wykonania jest zrobiona o polnocy UTC dnia wykonania. */
const CHWILA_ZROBIENIA_V1 = 'T00:00:00.000Z'

/** @param {unknown} x @returns {string} */
const tekst = (x) => (typeof x === 'string' ? x : '')

/** @param {string} x @param {number} dlugosc @returns {string} tekst przyciety z bialych znakow i do dlugosci pola klienta */
const przytnij = (x, dlugosc) => x.trim().slice(0, dlugosc).trim()

/** @param {WycenaV1} a @param {WycenaV1} b @returns {number} starsza (data utworzenia, potem id) najpierw */
const starsza = (a, b) => Date.parse(a.utworzona) - Date.parse(b.utworzona) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** @param {string} idWyceny @param {string} [idWykonania] @returns {string} id zlecenia z wyceny (i wykonania) wersji 1 */
const idZlecenia = (idWyceny, idWykonania) => (idWykonania === undefined ? `z-${idWyceny}` : `z-${idWyceny}-${idWykonania}`)

/**
 * Rekord, z ktorego migracja moze wziac klienta i zlecenia; id z przedrostkiem klienta (`k-`) i zlecenia (`z-`) musi zostac
 * w granicy id, inaczej magazyn odrzucilby caly stan.
 * @param {unknown} x @returns {x is WycenaV1}
 */
const jestWycenaV1 = (x) => jestObiektem(x) && jestId(x.id) && jestId(idZlecenia(x.id)) && jestDataIso(x.utworzona) &&
  jestDataIso(x.zmieniona) && jestObiektem(x.klient) && x.status !== 'szkic'

/** @param {WycenaV1} w @returns {WykonanieV1[]} wykonania z dniem RRRR-MM-DD i id, z ktorego powstaje poprawne id zlecenia */
const wykonaniaV1 = (w) => (Array.isArray(w.wykonania) ? w.wykonania : [])
  .filter((x) => jestObiektem(x) && jestId(x.id) && jestDniem(x.data) && jestId(idZlecenia(w.id, x.id)))

/** @param {WycenaV1} w @returns {number | null} kwota wyceny dla klienta (cena reczna wygrywa); null, gdy nie da sie jej odczytac */
function kwotaV1(w) {
  const cenaReczna = jestLiczba(w.cenaReczna) && w.cenaReczna > 0 ? w.cenaReczna : null
  const cena = jestObiektem(w.wynik) && jestKwota(w.wynik.cena) ? w.wynik.cena : null
  const kwota = kwotaWyceny({ cenaReczna, wynik: cena === null ? null : { cena } })
  return jestKwota(kwota) ? kwota : null
}

/** @param {WycenaV1} w @returns {{ dzien: string, godzina: string | null } | null} termin klienta zgodny z TERMIN_ISO */
function terminV1(w) {
  const czesci = TERMIN_ISO.exec(tekst(w.klient.termin))
  if (czesci === null || !jestDniem(czesci[1])) return null
  const [, dzien, godzina, minuta] = czesci
  return { dzien, godzina: godzina === undefined ? null : `${godzina}:${minuta}` }
}

/** @param {WycenaV1} w @returns {boolean} wycena, z ktorej powstana zlecenia z wykonan */
const maZleceniaZWykonan = (w) => wykonaniaV1(w).length > 0 && kwotaV1(w) !== null

/**
 * Klient z grupy wycen o tej samej nazwie (po normalizujNazwe): id z najstarszej wyceny, nazwa z najnowszej, adres z najnowszej
 * wyceny z adresem, daty z dat wycen.
 * @param {WycenaV1[]} grupa niepusta, od najstarszej
 * @returns {Klient}
 */
function klientZGrupy(grupa) {
  const najstarsza = grupa[0]
  const najnowsza = grupa[grupa.length - 1]
  const adresy = grupa.map((w) => przytnij(tekst(w.klient.adres), DLUGOSCI_KLIENTA.adres)).filter((a) => a !== '')
  const zmieniony = grupa.reduce((max, w) => (Date.parse(w.zmieniona) > Date.parse(max) ? w.zmieniona : max), najstarsza.zmieniona)
  return { id: `k-${najstarsza.id}`, nazwa: przytnij(tekst(najnowsza.klient.nazwa), DLUGOSCI_KLIENTA.nazwa), telefon: null,
    adres: adresy.at(-1) ?? null, notatki: null, utworzony: najstarsza.utworzona, zmieniony }
}

/**
 * Klienci z nazw wycen poza szkicami, a dla wyceny z wykonaniami bez nazwy — klient „Klient z wyceny {numer}”.
 * @param {WycenaV1[]} wyceny
 * @returns {{ klienci: Klient[], klientWyceny: Map<string, string> }} klientWyceny: id wyceny → id klienta
 */
function klienciZWycen(wyceny) {
  /** @type {Map<string, WycenaV1[]>} */
  const grupy = new Map()
  /** @type {WycenaV1[]} */
  const bezNazwy = []
  for (const w of [...wyceny].sort(starsza)) {
    const klucz = normalizujNazwe(tekst(w.klient.nazwa))
    const grupa = grupy.get(klucz)
    if (klucz === '') {
      if (maZleceniaZWykonan(w)) bezNazwy.push(w)
    } else if (grupa === undefined) grupy.set(klucz, [w])
    else grupa.push(w)
  }
  const klienci = [...grupy.values()].map(klientZGrupy)
  const klientWyceny = new Map([...grupy.values()].flatMap((g) => g.map((w) => [w.id, `k-${g[0].id}`])))
  for (const w of bezNazwy) {
    const nazwa = przytnij(`Klient z wyceny ${typeof w.numer === 'string' ? w.numer : w.id}`, DLUGOSCI_KLIENTA.nazwa)
    klienci.push({ id: `k-${w.id}`, nazwa, telefon: null, adres: null, notatki: null, utworzony: w.utworzona, zmieniony: w.zmieniona })
    klientWyceny.set(w.id, `k-${w.id}`)
  }
  return { klienci, klientWyceny }
}

/**
 * Zlecenie jednorazowe z wyceny v1 rozliczane za wizyte, ze znacznikami czasu z wyceny.
 * @param {WycenaV1} w @param {{ id: string, klientId: string, dzien: string, godzina: string | null, kwota: number,
 *   plan: PlanZlecenia | null, wizyty: Zlecenie['wizyty'] }} pola
 * @returns {Zlecenie}
 */
function zlecenieJednorazowe(w, { id, klientId, dzien, godzina, kwota, plan, wizyty }) {
  const uslugaId = jestObiektem(w.wejscie) && jestId(w.wejscie.uslugaId) ? w.wejscie.uslugaId : null
  return { id, klientId, wycenaId: w.id, uslugaId, opis: null, rozliczenie: 'za_wizyte', start: dzien,
    okresy: [{ od: dzien, cykl: null, godzina, cenaWizyty: kwota, cenaMiesiaca: null }], koniec: null, plan, wizyty,
    zaplatyMiesieczne: {}, utworzone: w.zmieniona, zmienione: w.zmieniona }
}

/**
 * Kazde wykonanie → zlecenie jednorazowe `z-<id wyceny>-<id wykonania>` z wizyta zrobiona i zaplacona (forma nieznana, kwota
 * wyceny) w dniu wykonania, czasem pracy i planem z czasu normowego migawki i tempa planu wpisu.
 * @param {WycenaV1} w @param {string} klientId @param {number} kwota
 * @returns {Zlecenie[]}
 */
function zleceniaZWykonan(w, klientId, kwota) {
  const termin = terminV1(w)
  const norma = jestObiektem(w.wynik) && jestLiczba(w.wynik.minutyNormowe) && w.wynik.minutyNormowe > 0 ? w.wynik.minutyNormowe : null
  return wykonaniaV1(w).map((e) => {
    const minutyPracy = jestLiczba(e.minuty) && e.minuty >= MIN_MINUT_PRACY && e.minuty <= MAKS_MINUT_PRACY ? e.minuty : null
    const plan = norma !== null && jestLiczba(e.tempoPlanu) && e.tempoPlanu > 0 ? { minutyNormowe: norma, tempo: e.tempoPlanu } : null
    const wizyta = { przeniesiona: null, odwolana: false, zrobiona: `${e.data}${CHWILA_ZROBIENIA_V1}`,
      zaplata: { forma: null, data: e.data, kwota }, minutyPracy }
    return zlecenieJednorazowe(w, { id: idZlecenia(w.id, e.id), klientId, dzien: e.data, godzina: termin?.dzien === e.data ? termin.godzina : null,
      kwota, plan, wizyty: { [e.data]: wizyta } })
  })
}

/**
 * Przyjeta wycena bez wykonan, nie abonament, z terminem zgodnym z TERMIN_ISO → zlecenie jednorazowe `z-<id wyceny>` na termin
 * (bez planu, bo tempo do planu daja dopiero dane aplikacji). Inaczej brak zlecenia: wycena zostaje „do zaplanowania”.
 * @param {WycenaV1} w @param {string} klientId @param {number} kwota
 * @returns {Zlecenie[]}
 */
function zlecenieNaTermin(w, klientId, kwota) {
  const termin = terminV1(w)
  const czyPrzyjeta = w.status === 'przyjeta' || w.status === STATUS_WYKONANA_V1
  if (!czyPrzyjeta || termin === null || wykonaniaV1(w).length > 0) return []
  const wizytWMiesiacu = jestObiektem(w.wynik) && jestLiczba(w.wynik.wizytWMiesiacu) ? w.wynik.wizytWMiesiacu : null
  if (czyAbonament({ wizytWMiesiacu })) return []
  return [zlecenieJednorazowe(w, { id: idZlecenia(w.id), klientId, dzien: termin.dzien, godzina: termin.godzina, kwota, plan: null, wizyty: {} })]
}

/**
 * Stan wersji 1 → stan wersji 2 z klientami i zleceniami z wycen; wejscia nie zmienia. Wyceny traca `wykonania`, `wykonana`
 * staje sie `przyjeta`, a kazda dostaje `klientId` (szkic i wycena bez nazwy klienta — null); `zmieniona` zostaje.
 * @param {Record<string, unknown>} stan
 * @returns {Record<string, unknown>}
 */
export function zV1DoV2(stan) {
  if (!Array.isArray(stan.wyceny)) return { ...stan, wersja: WERSJA_PO_KROKU, klienci: [], zlecenia: [] }
  const rekordy = rekordyDoPrzeniesienia(stan.wyceny)
  const { klienci, klientWyceny } = klienciZWycen(rekordy)
  const zlecenia = rekordy.flatMap((w) => {
    const klientId = klientWyceny.get(w.id)
    const kwota = kwotaV1(w)
    if (klientId === undefined || kwota === null) return []
    return [...zleceniaZWykonan(w, klientId, kwota), ...zlecenieNaTermin(w, klientId, kwota)]
  })
  const wyceny = stan.wyceny.map((w) => {
    if (!jestObiektem(w)) return w
    const { wykonania: _wykonania, ...reszta } = w
    const klientId = typeof w.id === 'string' ? klientWyceny.get(w.id) ?? null : null
    // Wykonanie nalezy teraz do zlecenia, wiec wycena konczy sie na „przyjeta”.
    return { ...reszta, status: w.status === STATUS_WYKONANA_V1 ? 'przyjeta' : w.status, klientId }
  })
  return { ...stan, wersja: WERSJA_PO_KROKU, wyceny, klienci, zlecenia }
}

/**
 * Wyceny poza szkicami, z ktorych migracja bierze klientow i zlecenia; z powtorzonym id liczy sie tylko pierwsza.
 * @param {readonly unknown[]} wyceny @returns {WycenaV1[]}
 */
function rekordyDoPrzeniesienia(wyceny) {
  /** @type {Map<string, WycenaV1>} */
  const wgId = new Map()
  for (const w of wyceny) {
    if (jestWycenaV1(w) && !wgId.has(w.id)) wgId.set(w.id, w)
  }
  return [...wgId.values()]
}
