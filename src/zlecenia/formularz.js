// Logika formularza zlecenia (R12, R13, R19, R26): wartosci poczatkowe recznie albo z przyjetej wyceny (cena, termin, plan czasu,
// seria z abonamentu), zmiany pol, bledy i dane do zapisu. Bez DOM; widok src/widoki/zlecenie-formularz.js tylko rysuje. Zapis
// idzie przez src/dane/zlecenia.js, ktory sprawdza klienta, wycene i ksztalt rekordu na swiezym stanie.

import { klient as znajdzKlienta } from '../dane/klienci.js'
import { jestDniem, jestKwota, TERMIN_ISO } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { czyAbonament, kwotaWyceny, wycena as znajdzWycene } from '../dane/wyceny.js'
import { BladZlecenia, utworzZlecenie, zaplanujZWyceny } from '../dane/zlecenia.js'
import { ROZLICZENIA } from '../dane/zlecenia-ksztalt.js'
import { dzienTygodnia } from '../kalendarz/daty.js'
import { CYKLE } from '../kalendarz/wystapienia.js'
import { tempoDoWyceny } from '../silnik/tempo.js'
import { czas, dzienKrotko, godzina, parsujLiczbe, SKROTY_DNI, tekstLiczby } from '../ui/format.js'
import { sciezka } from '../ui/trasy.js'
import { daneTempa } from './dane-tempa.js'

/**
 * @typedef {import('../dane/magazyn.js').Stan} Stan
 * @typedef {import('../dane/wyceny.js').Wycena} Wycena
 * @typedef {import('../dane/zlecenia.js').NoweZlecenie} NoweZlecenie
 * @typedef {import('../dane/zlecenia-ksztalt.js').Rozliczenie} Rozliczenie
 * @typedef {import('../dane/zlecenia-ksztalt.js').Zlecenie} Zlecenie
 * @typedef {import('../kalendarz/wystapienia.js').RodzajCyklu} RodzajCyklu
 * @typedef {import('../silnik/katalog.js').Katalog} Katalog
 * @typedef {import('../silnik/szybka.js').SzybkaWyceny} SzybkaWyceny
 * @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji
 */
/**
 * @typedef {RodzajCyklu | typeof BEZ_POWTARZANIA} Powtarzanie
 * @typedef {{ wartosc: string, etykieta: string }} OpcjaUslugi
 * @typedef {{ wycenaId: string | null, klientId: string | null, data: string | null }} ZrodloFormularza zapytanie adresu: `?wycena=`,
 *   `?klient=`, `?data=`; klient i data licza sie tylko bez wyceny
 * @typedef {{ wycenaId: string | null, numerWyceny: string | null, klientId: string | null, usluga: string | null, opis: string,
 *   opcjeUslug: OpcjaUslugi[], cena: string, cenyWyceny: Record<Rozliczenie, string> | null, podpowiedzCeny: string | null, data: string,
 *   godzina: string, cykl: Powtarzanie, dni: number[], czyDniReczne: boolean, rozliczenie: Rozliczenie,
 *   minutyNormowe: number | null }} WartosciFormularza usluga: id z katalogu, INNA_USLUGA albo null (nie wybrano); cena: tekst pola
 *   wedlug rozliczenia; cenyWyceny: kwoty abonamentu za wizyte i za miesiac; czyDniReczne: dni nie ida za data; minutyNormowe: plan z migawki
 * @typedef {'klient' | 'usluga' | 'cena' | 'data' | 'dni'} PoleFormularza
 * @typedef {'brak_klienta' | 'brak_uslugi' | 'zla_cena' | 'brak_daty' | 'brak_dni'} KodBleduFormularza
 */

/** Wartosc chipa „Nie” (zlecenie jednorazowe). */
export const BEZ_POWTARZANIA = 'nie'
/** Wartosc opcji „Inna usługa”: zlecenie bez uslugi z katalogu, z polem opisu. */
export const INNA_USLUGA = 'inna'
/** Najwczesniejsza data zlecenia: niepelny rok w polu daty (0026-11-03) wypadlby poza lata kalendarza. */
export const NAJWCZESNIEJSZA_DATA = '2000-01-01'

/** @type {Readonly<Record<RodzajCyklu, string>>} */
const ETYKIETY_CYKLI = Object.freeze({ tydzien: 'Co tydzień', dwa_tygodnie: 'Co 2 tygodnie', miesiac: 'Co miesiąc' })
/** @type {Readonly<Record<Rozliczenie, string>>} */
const ETYKIETY_ROZLICZEN = Object.freeze({ za_wizyte: 'Za wizytę', miesiecznie: 'Raz w miesiącu' })
/** @type {Readonly<Record<Rozliczenie, string>>} */
const ETYKIETY_CENY = Object.freeze({ za_wizyte: 'Cena (zł)', miesiecznie: 'Kwota za miesiąc (zł)' })

/** Chipy „Powtarzaj”. @type {readonly { wartosc: Powtarzanie, etykieta: string }[]} */
export const OPCJE_POWTARZANIA = Object.freeze([{ wartosc: BEZ_POWTARZANIA, etykieta: 'Nie' },
  ...CYKLE.map((c) => ({ wartosc: c, etykieta: ETYKIETY_CYKLI[c] }))])
/** Chipy „Płatność”. */
export const OPCJE_PLATNOSCI = Object.freeze(ROZLICZENIA.map((r) => ({ wartosc: r, etykieta: ETYKIETY_ROZLICZEN[r] })))
/** Chipy „Dni”: dzien ISO 1–7 i skrot. */
export const OPCJE_DNI = Object.freeze(SKROTY_DNI.map((etykieta, i) => ({ wartosc: i + 1, etykieta })))

/** Dni wizyt abonamentu wedlug wariantu; `abonament_1` nie ma wpisu, bo idzie za dniem tygodnia daty startu. */
const DNI_ABONAMENTU = new Map([['abonament_2', [1, 4]], ['abonament_3', [1, 3, 5]], ['abonament_5', [1, 2, 3, 4, 5]]])

/** Odmowy zapisu (stan zmienil sie w innej karcie albo limit), a nie awarie: bez zglaszania bledu. */
const TEKSTY_ODMOW = new Map([
  ['brak_klienta', 'Tego klienta już nie ma. Wybierz innego.'],
  ['brak_wyceny', 'Tej wyceny już nie ma, więc zlecenia nie zapisano.'],
  ['zly_status', 'Ta wycena nie jest już przyjęta, więc zlecenia nie zapisano.'],
  ['za_duzo', 'Masz już najwięcej zleceń, ile można zapisać.'],
])

/** @param {string} wycenaId @returns {string} adres formularza zlecenia z wyceny */
export const adresZaplanowania = (wycenaId) => sciezka('noweZlecenie', {}, { wycena: wycenaId })
/** @param {Rozliczenie} rozliczenie @returns {string} etykieta pola ceny */
export const etykietaCeny = (rozliczenie) => ETYKIETY_CENY[rozliczenie]
/** @param {Powtarzanie} cykl @returns {boolean} cykl z wyborem dni tygodnia */
export const czyMaDni = (cykl) => cykl === 'tydzien' || cykl === 'dwa_tygodnie'

/** @param {unknown} data @returns {data is string} */
const jestDataZlecenia = (data) => jestDniem(data) && data >= NAJWCZESNIEJSZA_DATA
/** @param {string} data @returns {number[]} dzien tygodnia daty; bez poprawnej daty pusta lista */
const domyslneDni = (data) => (jestDataZlecenia(data) ? [dzienTygodnia(data)] : [])
/** @param {number | null} kwota @returns {string} */
const tekstCeny = (kwota) => (kwota === null ? '' : tekstLiczby(kwota))

/**
 * Uslugi do wyboru: z katalogu bez dodatkow i „Inna usługa”; usluga wyceny, ktorej lista nie ma (dodatek, usunieta z danych), tez.
 * @param {Pick<Katalog, 'uslugi'>} katalog @param {string | null} wybrana @returns {OpcjaUslugi[]}
 */
function opcjeUslug(katalog, wybrana) {
  const opcje = katalog.uslugi.filter((u) => !u.tylko_dodatek || u.id === wybrana).map((u) => ({ wartosc: u.id, etykieta: u.nazwa }))
  const czyZnana = wybrana === null || opcje.some((o) => o.wartosc === wybrana)
  return [...(czyZnana ? [] : [{ wartosc: wybrana, etykieta: wybrana }]), ...opcje, { wartosc: INNA_USLUGA, etykieta: 'Inna usługa' }]
}

/** @param {string | null} termin termin klienta @param {string} dzis @returns {{ data: string, godzina: string }} dzis bez godziny, gdy termin to nie data */
function terminWyceny(termin, dzis) {
  const czesci = TERMIN_ISO.exec(termin ?? '')
  if (czesci === null || !jestDataZlecenia(czesci[1])) return { data: dzis, godzina: '' }
  const [, data, godziny, minuty] = czesci
  return { data, godzina: godziny === undefined ? '' : `${godziny}:${minuty}` }
}

/**
 * Cena za wizyte: reczna wygrywa; szybka wycena daje kwote tylko w trybie `ok` (ta, ktora uslyszal klient), widelki i „od” — null.
 * @param {Wycena} w @returns {number | null}
 */
function cenaZWyceny(w) {
  if (w.cenaReczna !== null || w.rodzaj !== 'szybka' || w.szybka === null) return kwotaWyceny(w)
  return w.szybka.tryb === 'ok' ? w.szybka.od : null
}

/** @param {SzybkaWyceny} szybka @returns {string} */
function tekstWidelek({ tryb, od, do: doKwoty }) {
  return tryb === 'widelki' ? `W wycenie: ${tekstLiczby(od)}–${tekstLiczby(doKwoty)} zł` : `W wycenie: od ${tekstLiczby(od)} zł`
}

/** @param {Pick<Katalog, 'uslugi'>} katalog @param {Partial<WartosciFormularza> & Pick<WartosciFormularza, 'data'>} pola @returns {WartosciFormularza} */
function wartosci(katalog, pola) {
  const usluga = pola.usluga ?? null
  return { wycenaId: null, numerWyceny: null, klientId: null, usluga, opis: '', opcjeUslug: opcjeUslug(katalog, usluga), cena: '', cenyWyceny: null,
    podpowiedzCeny: null, godzina: '', cykl: BEZ_POWTARZANIA, dni: domyslneDni(pola.data), czyDniReczne: false, rozliczenie: 'za_wizyte',
    minutyNormowe: null, ...pola }
}

/**
 * Seria z abonamentu: co tydzien z dniami wariantu, rozliczenie miesieczne, kwota = cena za wizyte × wizyty w miesiacu (R26).
 * @param {Wycena} w @param {number | null} cena za wizyte @returns {Partial<WartosciFormularza>}
 */
function polaAbonamentu(w, cena) {
  const wizyt = w.wynik?.wizytWMiesiacu ?? 0
  const cenyWyceny = cena === null ? null : { za_wizyte: tekstCeny(cena), miesiecznie: tekstCeny(Math.round(cena * wizyt)) }
  const dni = DNI_ABONAMENTU.get(w.wejscie.wariantId ?? '')
  return { cykl: 'tydzien', rozliczenie: 'miesiecznie', cena: cenyWyceny?.miesiecznie ?? '', cenyWyceny,
    ...(dni === undefined ? {} : { dni: [...dni], czyDniReczne: true }) }
}

/** @param {Wycena} w @param {Pick<Katalog, 'uslugi'>} katalog @param {string} dzis @returns {WartosciFormularza} */
function zWyceny(w, katalog, dzis) {
  const cena = cenaZWyceny(w)
  return wartosci(katalog, { wycenaId: w.id, numerWyceny: w.numer, klientId: w.klientId, usluga: w.wejscie.uslugaId, cena: tekstCeny(cena),
    podpowiedzCeny: cena === null && w.szybka !== null ? tekstWidelek(w.szybka) : null, minutyNormowe: w.wynik?.minutyNormowe ?? null,
    ...terminWyceny(w.klient.termin, dzis), ...(w.wynik !== null && czyAbonament(w.wynik) ? polaAbonamentu(w, cena) : {}) })
}

/**
 * Wartosci otwartego formularza. Z wyceny: tylko przyjeta (inna albo brak → null, widok pokazuje komunikat); klient, usluga, cena,
 * termin, plan i abonament z wyceny. Recznie: klient z `?klient=`, gdy istnieje, data z `?data=` albo dzis.
 * @param {Pick<Stan, 'wyceny' | 'klienci'>} stan @param {Pick<Katalog, 'uslugi'>} katalog @param {ZrodloFormularza} zrodlo @param {string} dzis RRRR-MM-DD
 * @returns {WartosciFormularza | null}
 */
export function wartosciPoczatkowe(stan, katalog, { wycenaId, klientId, data }, dzis) {
  if (wycenaId !== null) {
    const w = znajdzWycene(stan, wycenaId)
    return w === null || w.status !== 'przyjeta' ? null : zWyceny(w, katalog, dzis)
  }
  const klient = klientId === null ? null : znajdzKlienta(stan, klientId)
  return wartosci(katalog, { klientId: klient?.id ?? null, data: jestDataZlecenia(data) ? data : dzis })
}

/**
 * Zmiana rozliczenia; kwota abonamentu nietknieta recznie przechodzi na kwote nowego rozliczenia, wpisana zostaje.
 * @param {WartosciFormularza} w @param {Rozliczenie} rozliczenie @returns {WartosciFormularza}
 */
export function zRozliczeniem(w, rozliczenie) {
  const { cenyWyceny } = w
  const czyZWyceny = cenyWyceny !== null && w.cena === cenyWyceny[w.rozliczenie]
  return { ...w, rozliczenie, cena: czyZWyceny ? cenyWyceny[rozliczenie] : w.cena }
}

/**
 * Zmiana „Powtarzaj”: bez serii tylko rozliczenie za wizyte (rozliczenie miesieczne ma tylko seria).
 * @param {WartosciFormularza} w @param {Powtarzanie} cykl @returns {WartosciFormularza}
 */
export const zCyklem = (w, cykl) => zRozliczeniem({ ...w, cykl }, cykl === BEZ_POWTARZANIA ? 'za_wizyte' : w.rozliczenie)

/**
 * Zmiana daty; dni nietkniete recznie ida za dniem tygodnia daty.
 * @param {WartosciFormularza} w @param {string} data @returns {WartosciFormularza}
 */
export const zData = (w, data) => ({ ...w, data, dni: w.czyDniReczne ? w.dni : domyslneDni(data) })

/**
 * Wlaczenie albo wylaczenie dnia tygodnia; dni rosnaco.
 * @param {WartosciFormularza} w @param {number} dzien 1–7 @returns {WartosciFormularza}
 */
export function zDniem(w, dzien) {
  const dni = w.dni.includes(dzien) ? w.dni.filter((d) => d !== dzien) : [...w.dni, dzien].sort((a, b) => a - b)
  return { ...w, dni, czyDniReczne: true }
}

/**
 * Bledy formularza (R19: klient wymagany zawsze); bez bledow pusty obiekt.
 * @param {WartosciFormularza} w @returns {Partial<Record<PoleFormularza, KodBleduFormularza>>}
 */
export function bledyFormularza(w) {
  const czyUsluga = w.usluga === INNA_USLUGA ? w.opis.trim() !== '' : w.usluga !== null
  return {
    ...(w.klientId === null ? { klient: 'brak_klienta' } : {}),
    ...(czyUsluga ? {} : { usluga: 'brak_uslugi' }),
    ...(jestKwota(parsujLiczbe(w.cena)) ? {} : { cena: 'zla_cena' }),
    ...(jestDataZlecenia(w.data) ? {} : { data: 'brak_daty' }),
    ...(czyMaDni(w.cykl) && w.dni.length === 0 ? { dni: 'brak_dni' } : {}),
  }
}

/** @param {WartosciFormularza} w @returns {NoweZlecenie['cykl']} */
function cyklZapisu({ cykl, dni }) {
  if (cykl === BEZ_POWTARZANIA) return null
  return { co: cykl, dni: czyMaDni(cykl) ? [...dni] : [] }
}

/**
 * Dane dla utworzZlecenie i zaplanujZWyceny; formularz z bledami daje BladZlecenia `dane`.
 * @param {WartosciFormularza} w @returns {NoweZlecenie}
 */
export function doZapisu(w) {
  const pola = Object.keys(bledyFormularza(w))
  const cena = parsujLiczbe(w.cena)
  if (pola.length > 0 || w.klientId === null || cena === null) throw new BladZlecenia('dane', `Formularz zlecenia ma błędy w polach: ${pola.join(', ')}`)
  const czyInna = w.usluga === INNA_USLUGA
  const czyMiesiecznie = w.rozliczenie === 'miesiecznie'
  return { klientId: w.klientId, uslugaId: czyInna ? null : w.usluga, opis: czyInna ? w.opis : null, rozliczenie: w.rozliczenie, start: w.data,
    cykl: cyklZapisu(w), godzina: w.godzina === '' ? null : w.godzina, cenaWizyty: czyMiesiecznie ? null : cena, cenaMiesiaca: czyMiesiecznie ? cena : null }
}

/** @param {Pick<Stan, 'ustawienia' | 'zlecenia'>} stan @param {string | null} uslugaId @param {DaneAplikacji['domyslne']} domyslne @returns {number} */
const tempoPlanu = (stan, uslugaId, domyslne) => tempoDoWyceny(stan.ustawienia, daneTempa(stan), uslugaId, domyslne).wartosc

/**
 * Planowany czas wizyty przy dzisiejszym tempie firmy; bez migawki wyceny null.
 * @param {Pick<WartosciFormularza, 'minutyNormowe' | 'usluga'>} w @param {Pick<Stan, 'ustawienia' | 'zlecenia'>} stan
 * @param {DaneAplikacji['domyslne']} domyslne @returns {string | null}
 */
export function tekstPlanu({ minutyNormowe, usluga }, stan, domyslne) {
  return minutyNormowe === null ? null : `Planowany czas: ${czas(minutyNormowe * tempoPlanu(stan, usluga, domyslne))}`
}

/**
 * Zapis formularza z id nadanym przy otwarciu ekranu: recznie albo z wyceny z tempem planu z chwili zapisu. Bledy zapisu
 * (BladZlecenia, BladMagazynu) leca do widoku.
 * @param {Pick<DaneAplikacji, 'magazyn' | 'domyslne'>} kontekst @param {string} id @param {WartosciFormularza} w @returns {Zlecenie}
 */
export function zapiszFormularz({ magazyn, domyslne }, id, w) {
  const dane = doZapisu(w)
  if (w.wycenaId === null) return utworzZlecenie(magazyn, dane, { id })
  const tempo = tempoPlanu(wczytajStan(magazyn), w.usluga, domyslne)
  return zaplanujZWyceny(magazyn, w.wycenaId, { ...dane, tempo }, { id })
}

/** @param {unknown} blad @returns {string | null} tekst odmowy zapisu; inny blad to awaria (null) */
export const tekstOdmowy = (blad) => (blad instanceof BladZlecenia ? TEKSTY_ODMOW.get(blad.kod) ?? null : null)

/**
 * Wiersz zlecenia pod wycena: pierwsza wizyta i powtarzanie.
 * @param {Pick<Zlecenie, 'start' | 'okresy'>} z @returns {string} „wt 3 lis, 10:00 · Co tydzień”
 */
export function opisZlecenia({ start, okresy }) {
  const { cykl, godzina: czasWizyty } = okresy[0]
  const kiedy = czasWizyty === null ? dzienKrotko(start) : `${dzienKrotko(start)}, ${godzina(czasWizyty)}`
  return cykl === null ? kiedy : `${kiedy} · ${ETYKIETY_CYKLI[cykl.co]}`
}
