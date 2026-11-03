// Dane ekranu modulu Wycena (`#/wyceny`, czyste funkcje bez DOM): wyceny w sekcjach wedlug tego, co trzeba zrobic (R20),
// i tresc wiersza w najwyzej dwoch liniach (R9). Regula „Do zaplanowania” mieszka w src/dane/zlecenia.js (doZaplanowania).

import { kwotaWyceny, listaWycen } from '../dane/wyceny.js'
import { doZaplanowania } from '../dane/zlecenia.js'
import { zl } from '../ui/format.js'

/** @typedef {import('../dane/magazyn.js').Stan} Stan */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/**
 * @typedef {'do_wyslania' | 'do_zaplanowania' | 'czekaja' | 'pozostale'} IdSekcji
 * @typedef {{ id: IdSekcji, tytul: string, wyceny: Wycena[] }} SekcjaWycen
 * @typedef {{ tytul: string, szczegoly: string }} TrescWiersza tytul: klient albo usluga; szczegoly: druga linia wiersza
 */

const JEZYK = 'pl-PL'
const SEPARATOR = ' · '
/** Dzien ostatniej zmiany w czasie lokalnym: „28 paź”. */
const formatDniaZmiany = new Intl.DateTimeFormat(JEZYK, { day: 'numeric', month: 'short' })

/** Sekcje w kolejnosci na ekranie: najpierw to, co trzeba zrobic. */
const SEKCJE = Object.freeze(/** @type {const} */ ([
  { id: 'do_wyslania', tytul: 'Do wysłania' },
  { id: 'do_zaplanowania', tytul: 'Do zaplanowania' },
  { id: 'czekaja', tytul: 'Czekają na odpowiedź' },
  { id: 'pozostale', tytul: 'Pozostałe' },
]))

/**
 * Sekcja wyceny: do wysłania, przyjeta bez zlecenia (abonament bez serii), wyslana, a reszta (szkice, przyjete ze
 * zleceniem, odrzucone) w „Pozostałe”.
 * @param {Pick<Stan, 'zlecenia'>} stan @param {Wycena} w @returns {IdSekcji}
 */
function sekcjaWyceny(stan, w) {
  if (w.status === 'do_wyslania') return 'do_wyslania'
  if (doZaplanowania(stan, w)) return 'do_zaplanowania'
  if (w.status === 'wyslana') return 'czekaja'
  return 'pozostale'
}

/**
 * Wyceny w sekcjach „Do wysłania”, „Do zaplanowania”, „Czekają na odpowiedź”, „Pozostałe”; w sekcji od ostatnio
 * zmienionej, bez pustych sekcji.
 * @param {Pick<Stan, 'wyceny' | 'zlecenia'>} stan
 * @returns {SekcjaWycen[]}
 */
export function sekcjeWycen(stan) {
  /** @type {Record<IdSekcji, Wycena[]>} */
  const grupy = { do_wyslania: [], do_zaplanowania: [], czekaja: [], pozostale: [] }
  for (const w of listaWycen(stan)) grupy[sekcjaWyceny(stan, w)].push(w)
  return SEKCJE.filter(({ id }) => grupy[id].length > 0).map(({ id, tytul }) => ({ id, tytul, wyceny: grupy[id] }))
}

/** @param {Pick<Katalog, 'uslugi'>} katalog @param {string} uslugaId @returns {string} nazwa uslugi; id, gdy usluge usunieto z danych */
const nazwaUslugi = (katalog, uslugaId) => katalog.uslugi.find((u) => u.id === uslugaId)?.nazwa ?? uslugaId

/** @param {string} chwila ISO @returns {string} „28 paź”; nieprawidlowa data → RangeError */
function dzienZmiany(chwila) {
  const wartosc = new Date(chwila)
  if (Number.isNaN(wartosc.getTime())) throw new RangeError(`Nieprawidłowa data zmiany wyceny: ${chwila}`)
  return formatDniaZmiany.format(wartosc)
}

/**
 * Tresc wiersza wyceny: tytul to nazwa klienta (kopia z wyceny), a bez niej nazwa uslugi; szczegoly to kwota i usluga,
 * a bez klienta kwota i dzien ostatniej zmiany. Szkic bez ceny nie ma kwoty.
 * @param {Wycena} w @param {Pick<Katalog, 'uslugi'>} katalog
 * @returns {TrescWiersza}
 */
export function wierszWyceny(w, katalog) {
  const usluga = nazwaUslugi(katalog, w.wejscie.uslugaId)
  const klient = w.klient.nazwa.trim()
  const kwota = kwotaWyceny(w)
  const cena = kwota === null ? [] : [zl(kwota)]
  if (klient !== '') return { tytul: klient, szczegoly: [...cena, usluga].join(SEPARATOR) }
  return { tytul: usluga, szczegoly: [...cena, dzienZmiany(w.zmieniona)].join(SEPARATOR) }
}
