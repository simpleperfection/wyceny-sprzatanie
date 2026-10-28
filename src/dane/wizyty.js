// Stan wizyt zlecenia (R13, R15, R16, R26): zrobione, zaplata z forma, czas pracy, przesuniecie, odwolanie i zaplata za miesiac.
// Stan lezy w `zlecenie.wizyty[dataPierwotna]`: wpis powstaje przy pierwszej zmianie i znika, gdy wizyta wraca do stanu
// domyslnego. Kazda akcja to jedno magazyn.zmien przez zmienZlecenie (src/dane/zlecenia.js); dni z src/kalendarz/.

import { jestGodzina, ostatniDzienMiesiaca, porownajDni } from '../kalendarz/daty.js'
import { wystapienia } from '../kalendarz/wystapienia.js'
import { dzienLokalny, jestDniem, jestLiczba } from './ksztalt.js'
import { BladZlecenia, okresWDniu, zleceniaKlienta, zmienZlecenie } from './zlecenia.js'
import { FORMY_ZAPLATY, MAKS_MINUT_PRACY, MAKS_WIZYT_ZLECENIA } from './zlecenia-ksztalt.js'

/**
 * @typedef {import('./magazyn.js').Magazyn} Magazyn
 * @typedef {import('./magazyn.js').Stan} Stan
 * @typedef {import('./zlecenia.js').OpcjeZlecen} OpcjeZlecen
 * @typedef {import('./zlecenia-ksztalt.js').FormaZaplaty} FormaZaplaty
 * @typedef {import('./zlecenia-ksztalt.js').StanWizyty} StanWizyty
 * @typedef {import('./zlecenia-ksztalt.js').Zaplata} Zaplata
 * @typedef {import('./zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {OpcjeZlecen & { forma?: FormaZaplaty }} OpcjeZaplaty bez formy: forma domyslna klienta (formaDomyslna)
 */

/** @type {Readonly<StanWizyty>} */
const STAN_DOMYSLNY = Object.freeze({ przeniesiona: null, odwolana: false, zrobiona: null, zaplata: null, minutyPracy: null })
/** Forma zaplaty klienta bez historii zaplat. */
const FORMA_BEZ_HISTORII = 'gotowka'
/** Najkrotszy czas pracy wizyty w minutach. */
const MIN_MINUT_PRACY = 1

/** @param {StanWizyty} w */
const czyDomyslny = (w) => w.przeniesiona === null && !w.odwolana && w.zrobiona === null && w.zaplata === null && w.minutyPracy === null

/** Wizyta istnieje: ma zapisany stan albo daje ja regula okresow. @param {Zlecenie} z @param {string} dataPierwotna */
function sprawdzWizyte(z, dataPierwotna) {
  if (Object.hasOwn(z.wizyty, dataPierwotna)) return
  const zReguly = wystapienia({ ...z, wizyty: {} }, dataPierwotna, dataPierwotna)
  if (zReguly.length === 0) throw new BladZlecenia('brak_wizyty', `Zlecenie ${z.id} nie ma wizyty ${dataPierwotna}`)
}

/**
 * Zmiana stanu jednej wizyty; oddany bez zmian obiekt nic nie zmienia, a stan domyslny usuwa wpis z `wizyty`.
 * @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {OpcjeZlecen} opcje
 * @param {(wizyta: StanWizyty, z: Zlecenie, stan: Stan, teraz: Date) => StanWizyty} fn
 * @returns {Stan}
 */
function zmienWizyte(magazyn, id, dataPierwotna, opcje, fn) {
  if (!jestDniem(dataPierwotna)) throw new BladZlecenia('data', `Dzień wizyty musi mieć postać RRRR-MM-DD, jest ${String(dataPierwotna)}`)
  return zmienZlecenie(magazyn, id, opcje, (z, stan, teraz) => {
    sprawdzWizyte(z, dataPierwotna)
    const obecna = Object.hasOwn(z.wizyty, dataPierwotna) ? z.wizyty[dataPierwotna] : STAN_DOMYSLNY
    const nowa = fn(obecna, z, stan, teraz)
    if (nowa === obecna) return z
    const pozostale = Object.fromEntries(Object.entries(z.wizyty).filter(([dzien]) => dzien !== dataPierwotna))
    if (czyDomyslny(nowa)) return { ...z, wizyty: pozostale }
    if (Object.keys(pozostale).length >= MAKS_WIZYT_ZLECENIA) throw new BladZlecenia('za_duzo', `Zlecenie ma najwyżej ${MAKS_WIZYT_ZLECENIA} wizyt ze stanem`)
    return { ...z, wizyty: { ...pozostale, [dataPierwotna]: nowa } }
  })
}

/** @param {unknown} forma @returns {FormaZaplaty} */
function sprawdzForme(forma) {
  const znana = FORMY_ZAPLATY.find((f) => f === forma)
  if (znana === undefined) throw new BladZlecenia('forma', `Forma zapłaty: ${FORMY_ZAPLATY.join(', ')}, jest ${String(forma)}`)
  return znana
}

/**
 * Forma ostatniej (po dniu zaplaty) zaplaty klienta we wszystkich jego zleceniach; bez historii `gotowka`.
 * @param {Pick<Stan, 'zlecenia'>} stan @param {string} klientId
 * @returns {FormaZaplaty}
 */
export function formaDomyslna(stan, klientId) {
  const zaplaty = zleceniaKlienta(stan, klientId).flatMap((z) => [...Object.values(z.wizyty).map((w) => w.zaplata), ...Object.values(z.zaplatyMiesieczne)])
  /** @type {Zaplata | null} */
  let ostatnia = null
  for (const zaplata of zaplaty) {
    if (zaplata?.forma == null) continue
    if (ostatnia === null || porownajDni(zaplata.data, ostatnia.data) >= 0) ostatnia = zaplata
  }
  return ostatnia?.forma ?? FORMA_BEZ_HISTORII
}

/**
 * Wizyta zrobiona teraz; drugie oznaczenie zostawia pierwszy znacznik.
 * @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {OpcjeZlecen} [opcje] @returns {Stan}
 */
export function oznaczZrobiona(magazyn, id, dataPierwotna, opcje = {}) {
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w, _z, _stan, teraz) => (w.zrobiona !== null ? w : { ...w, zrobiona: teraz.toISOString() }))
}

/** @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {OpcjeZlecen} [opcje] @returns {Stan} */
export function cofnijZrobiona(magazyn, id, dataPierwotna, opcje = {}) {
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w) => (w.zrobiona === null ? w : { ...w, zrobiona: null }))
}

/**
 * Zaplata za wizyte (rozliczenie za wizyte; seria miesieczna → `rozliczenie_miesieczne`, R26): forma (bez niej forma domyslna
 * klienta), dzien oznaczenia i cena okresu daty pierwotnej. Zaplacona juz wizyta zostaje bez zmian (forme zmienia zmienForme).
 * @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {OpcjeZaplaty} [opcje] @returns {Stan}
 */
export function oznaczZaplacona(magazyn, id, dataPierwotna, opcje = {}) {
  const forma = opcje.forma === undefined ? null : sprawdzForme(opcje.forma)
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w, z, stan, teraz) => {
    const { cenaWizyty } = okresWDniu(z, dataPierwotna)
    if (z.rozliczenie === 'miesiecznie' || cenaWizyty === null) {
      throw new BladZlecenia('rozliczenie_miesieczne', 'W serii rozliczanej miesięcznie płaci się za miesiąc, nie za wizytę')
    }
    if (w.zaplata !== null) return w
    return { ...w, zaplata: { forma: forma ?? formaDomyslna(stan, z.klientId), data: dzienLokalny(teraz), kwota: cenaWizyty } }
  })
}

/**
 * Inna forma zapisanej zaplaty wizyty; wizyta bez zaplaty → `brak_zaplaty`.
 * @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {FormaZaplaty} forma @param {OpcjeZlecen} [opcje]
 * @returns {Stan}
 */
export function zmienForme(magazyn, id, dataPierwotna, forma, opcje = {}) {
  const nowa = sprawdzForme(forma)
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w) => {
    if (w.zaplata === null) throw new BladZlecenia('brak_zaplaty', `Wizyta ${dataPierwotna} nie ma zapłaty`)
    return w.zaplata.forma === nowa ? w : { ...w, zaplata: { ...w.zaplata, forma: nowa } }
  })
}

/** @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {OpcjeZlecen} [opcje] @returns {Stan} */
export function cofnijZaplate(magazyn, id, dataPierwotna, opcje = {}) {
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w) => (w.zaplata === null ? w : { ...w, zaplata: null }))
}

/**
 * Czas pracy wizyty w minutach (MIN_MINUT_PRACY–MAKS_MINUT_PRACY); null usuwa wpisany czas.
 * @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {number | null} minuty @param {OpcjeZlecen} [opcje]
 * @returns {Stan}
 */
export function wpiszCzasPracy(magazyn, id, dataPierwotna, minuty, opcje = {}) {
  if (minuty !== null && !(jestLiczba(minuty) && minuty >= MIN_MINUT_PRACY && minuty <= MAKS_MINUT_PRACY)) {
    throw new BladZlecenia('minuty', `Czas pracy musi być w przedziale ${MIN_MINUT_PRACY}–${MAKS_MINUT_PRACY} min, jest ${String(minuty)}`)
  }
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w) => (w.minutyPracy === minuty ? w : { ...w, minutyPracy: minuty }))
}

/**
 * Wizyta w innym dniu albo o innej godzinie; powrot na date pierwotna z godzina okresu (albo bez godziny) usuwa przesuniecie.
 * @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {{ data: string, godzina?: string | null }} cel
 * @param {OpcjeZlecen} [opcje]
 * @returns {Stan}
 */
export function przesunWizyte(magazyn, id, dataPierwotna, cel, opcje = {}) {
  const { data, godzina = null } = cel ?? {}
  if (!jestDniem(data)) throw new BladZlecenia('data', `Nowy dzień wizyty musi mieć postać RRRR-MM-DD, jest ${String(data)}`)
  if (godzina !== null && !jestGodzina(godzina)) throw new BladZlecenia('godzina', `Godzina musi mieć postać HH:MM, jest ${String(godzina)}`)
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w, z) => {
    const naMiejscu = data === dataPierwotna && (godzina === null || godzina === okresWDniu(z, dataPierwotna).godzina)
    const przeniesiona = naMiejscu ? null : { data, godzina }
    const bezZmiany = przeniesiona?.data === w.przeniesiona?.data && przeniesiona?.godzina === w.przeniesiona?.godzina
    return bezZmiany ? w : { ...w, przeniesiona }
  })
}

/** @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {OpcjeZlecen} [opcje] @returns {Stan} */
export function odwolajWizyte(magazyn, id, dataPierwotna, opcje = {}) {
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w) => (w.odwolana ? w : { ...w, odwolana: true }))
}

/** @param {Magazyn} magazyn @param {string} id @param {string} dataPierwotna @param {OpcjeZlecen} [opcje] @returns {Stan} */
export function przywrocWizyte(magazyn, id, dataPierwotna, opcje = {}) {
  return zmienWizyte(magazyn, id, dataPierwotna, opcje, (w) => (w.odwolana ? { ...w, odwolana: false } : w))
}

/** @param {unknown} miesiac @returns {asserts miesiac is string} RRRR-MM */
function sprawdzMiesiac(miesiac) {
  if (typeof miesiac !== 'string' || !jestDniem(`${miesiac}-01`)) throw new BladZlecenia('miesiac', `Miesiąc musi mieć postać RRRR-MM, jest ${String(miesiac)}`)
}

/** @param {Zlecenie} z */
function wymagajMiesiecznego(z) {
  if (z.rozliczenie !== 'miesiecznie') throw new BladZlecenia('rozliczenie', 'Za miesiąc płaci się tylko w serii rozliczanej miesięcznie')
}

/**
 * Kwota miesiaca: cenaMiesiaca okresu pierwszej wizyty z reguly w tym miesiacu; miesiac bez wizyty → `brak_wizyty`.
 * @param {Zlecenie} z @param {string} miesiac RRRR-MM @returns {number}
 */
function kwotaMiesiaca(z, miesiac) {
  const ostatni = ostatniDzienMiesiaca(Number(miesiac.slice(0, 4)), Number(miesiac.slice(5, 7)))
  const [pierwsza] = wystapienia({ ...z, wizyty: {} }, `${miesiac}-01`, `${miesiac}-${ostatni}`)
  if (pierwsza === undefined) throw new BladZlecenia('brak_wizyty', `Zlecenie ${z.id} nie ma wizyty w miesiącu ${miesiac}`)
  const kwota = pierwsza.okres.cenaMiesiaca
  if (kwota === null) throw new BladZlecenia('rozliczenie', `Okres od ${pierwsza.okres.od} nie ma ceny za miesiąc`)
  return kwota
}

/**
 * Zaplata za miesiac serii rozliczanej miesiecznie (inne → `rozliczenie`): forma (bez niej domyslna klienta), dzien oznaczenia
 * i kwota miesiaca. Zaplacony juz miesiac zostaje bez zmian.
 * @param {Magazyn} magazyn @param {string} id @param {string} miesiac RRRR-MM @param {OpcjeZaplaty} [opcje] @returns {Stan}
 */
export function oznaczZaplateMiesiaca(magazyn, id, miesiac, opcje = {}) {
  sprawdzMiesiac(miesiac)
  const forma = opcje.forma === undefined ? null : sprawdzForme(opcje.forma)
  return zmienZlecenie(magazyn, id, opcje, (z, stan, teraz) => {
    wymagajMiesiecznego(z)
    if (Object.hasOwn(z.zaplatyMiesieczne, miesiac)) return z
    const kwota = kwotaMiesiaca(z, miesiac)
    if (Object.keys(z.zaplatyMiesieczne).length >= MAKS_WIZYT_ZLECENIA) throw new BladZlecenia('za_duzo', `Zlecenie ma najwyżej ${MAKS_WIZYT_ZLECENIA} zapłat miesięcznych`)
    const zaplata = { forma: forma ?? formaDomyslna(stan, z.klientId), data: dzienLokalny(teraz), kwota }
    return { ...z, zaplatyMiesieczne: { ...z.zaplatyMiesieczne, [miesiac]: zaplata } }
  })
}

/** @param {Magazyn} magazyn @param {string} id @param {string} miesiac RRRR-MM @param {OpcjeZlecen} [opcje] @returns {Stan} */
export function cofnijZaplateMiesiaca(magazyn, id, miesiac, opcje = {}) {
  sprawdzMiesiac(miesiac)
  return zmienZlecenie(magazyn, id, opcje, (z) => {
    wymagajMiesiecznego(z)
    if (!Object.hasOwn(z.zaplatyMiesieczne, miesiac)) return z
    return { ...z, zaplatyMiesieczne: Object.fromEntries(Object.entries(z.zaplatyMiesieczne).filter(([m]) => m !== miesiac)) }
  })
}
