// Zapisane wyceny (R29, R22, R19): szkic z wejsciem, migawka wyniku, klient z listy (kopia nazwy i adresu z chwili wyboru)
// i cykl zycia statusow z numeracja NN/MM/RRRR, ktory konczy sie na „przyjeta” albo „odrzucona”; wykonanie i zaplata naleza
// do zlecenia, a wycena z co najmniej jednym zleceniem jest tylko do odczytu. Kazda zmiana idzie przez magazyn.zmien: odczyt
// swiezego stanu, sprawdzenie i zapis w jednym synchronicznym kroku. Straznik jestWycena jest jedynym opisem zapisanej wyceny:
// uzywa go zapis tutaj i kopia zapasowa (eksport i odczyt pliku).

import { DLUGOSCI_KLIENTA } from './klienci.js'
import {
  jestDataIso, jestDniem, jestId, jestLiczba, jestObiektem, jestTekstemLubNull, jestWarunkamiOferty, jestZakresemOferty, MAKS_DLUGOSC_TEKSTU,
  MAKS_ZAGLEBIENIE, maKrotkieTeksty,
} from './ksztalt.js'
import { czyAbonament, kwotaWyceny } from './kwota-wyceny.js'
import { warunkiZeZmiany, zakresZeZmiany } from './ustawienia.js'
import { STANY_SZYBKIEJ, TRYBY_SZYBKIEJ } from '../silnik/szybka.js'

export { czyAbonament, kwotaWyceny }

/** @typedef {import('./magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./magazyn.js').Stan} Stan */
/** @typedef {import('./magazyn.js').WarunekOferty} WarunekOferty */
/** @typedef {import('./magazyn.js').ZakresUslugi} ZakresUslugi */
/** @typedef {import('../silnik/cena.js').LiniaWyceny} LiniaWyceny */
/** @typedef {import('../silnik/cena.js').Propozycja} Propozycja */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/katalog.js').RegulaBrudu} RegulaBrudu */
/** @typedef {import('../silnik/szybka.js').SzybkaWyceny} SzybkaWyceny */
/** @typedef {import('../silnik/vat.js').StatusVat} StatusVat */
/** @typedef {import('../silnik/widelki.js').WidelkiRynku} WidelkiRynku */

/** Statusy wyceny w kolejnosci cyklu zycia; zrodlo stalej dla widokow i listy wycen. */
export const STATUSY_WYCENY = Object.freeze(/** @type {const} */ (['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona']))
/** Statusy, z ktorych przygotowuje sie i wysyla oferte; zrodlo reguly dla zapisu oferty i widokow (podsumowanie, ekran oferty). */
export const STATUSY_OFERTY = Object.freeze(/** @type {const} */ (['do_wyslania', 'wyslana', 'przyjeta']))
/** Rodzaje wyceny; zrodlo stalej dla zapisu, kopii zapasowej i widokow. */
export const RODZAJE_WYCENY = Object.freeze(/** @type {const} */ (['szybka', 'dokladna']))
/** Najwiecej zapisanych wycen (szkice tez); ta sama granica obowiazuje w kopii zapasowej. */
export const MAKS_WYCEN = 5000

/**
 * @typedef {typeof STATUSY_WYCENY[number]} StatusWyceny
 * @typedef {typeof RODZAJE_WYCENY[number]} RodzajWyceny
 * @typedef {{ nazwa: string, adres: string, termin: string | null }} KlientWyceny
 * @typedef {{ id: string | null, nazwa: string, stawka_h: number, wsp: number }} WojewodztwoMigawki id null = srednia krajowa
 * @typedef {{ cena: number, netto: number, vat: number, mediana: number, widelki: WidelkiRynku, minutyNormowe: number,
 *   linie: LiniaWyceny[], propozycje: Propozycja[], dojazd: { km: number, kwota: number }, wojewodztwo: WojewodztwoMigawki,
 *   statusVat: StatusVat, stawkaVatProc: number, podstawaCeny: string, wizytWMiesiacu: number | null,
 *   wersjaDanych: { ceny: string, normy: string, rynek: string }, minimum?: number, czyMinimum?: boolean }} MigawkaWyniku wynik z chwili
 *   wyceny; abonament: za wizyte; minimum zlecenia uslugi (kwota modelu) i czy podnioslo cene (brak w migawkach sprzed fazy 4)
 * @typedef {{ zakres: ZakresUslugi | null, warunki: WarunekOferty[] | null, waznaDo: string | null, wyslana: string | null,
 *   nieaktualna: boolean }} OfertaWyceny
 * @typedef {{ id: string, numer: string | null, utworzona: string, zmieniona: string, status: StatusWyceny, rodzaj: RodzajWyceny,
 *   klientId: string | null, klient: KlientWyceny, wejscie: WejscieWyceny, szybka: SzybkaWyceny | null,
 *   odpowiedzi: Record<string, unknown>, wynik: MigawkaWyniku | null, cenaReczna: number | null, oferta: OfertaWyceny }} Wycena
 *   klientId: klient z listy (null = bez klienta); klient: kopia nazwy i adresu z chwili wyboru (z niej korzysta oferta)
 * @typedef {{ rodzaj: RodzajWyceny, wejscie: WejscieWyceny, klientId?: string | null, klient?: Partial<KlientWyceny>,
 *   szybka?: SzybkaWyceny | null, odpowiedzi?: Record<string, unknown> }} NowySzkic klientId: klient z listy (jego nazwa i adres
 *   zastepuja nazwe i adres z `klient`)
 * @typedef {{ teraz?: () => Date }} OpcjeWycen zegar (do testow)
 * @typedef {OpcjeWycen & { wynik?: MigawkaWyniku | null }} OpcjeWejscia wynik: przeliczenie zapisywane razem z wejsciem (null = pusty zakres)
 * @typedef {{ wycena: Wycena, licznikNumerow?: Record<string, number> }} ZmianaWyceny
 * @typedef {{ wejscie?: WejscieWyceny, wynik?: MigawkaWyniku | null, rodzaj?: RodzajWyceny, szybka?: SzybkaWyceny | null,
 *   odpowiedzi?: Record<string, unknown> }} PolaWyceny pola zmieniane razem; nowe wejscie wymaga wyniku (null = pusty zakres)
 */

/** @type {Readonly<Record<StatusWyceny, readonly StatusWyceny[]>>} */
const PRZEJSCIA = Object.freeze({
  szkic: ['do_wyslania'],
  do_wyslania: ['wyslana', 'przyjeta', 'odrzucona'],
  wyslana: ['przyjeta', 'odrzucona'],
  // Rezygnacja klienta po przyjeciu; zlecenia z tej wyceny zostaja.
  przyjeta: ['odrzucona'],
  odrzucona: ['do_wyslania'],
})
// Nazwa i adres wyceny trafiaja do klienta (zKlientemZListy, migracja v2), wiec granice sa te same co w kartotece klientow.
const DLUGOSC_KLIENTA = Object.freeze({ nazwa: DLUGOSCI_KLIENTA.nazwa, adres: DLUGOSCI_KLIENTA.adres, termin: 40 })
const POLA_KLIENTA = /** @type {const} */ (['nazwa', 'adres', 'termin'])
const POLA_KWOT = /** @type {const} */ (['cena', 'netto', 'vat'])
const PUSTY_KLIENT = Object.freeze({ nazwa: '', adres: '', termin: null })
const POLA_ZMIANY_OFERTY = /** @type {const} */ (['zakres', 'warunki', 'waznaDo', 'klient'])
/** Numer `NN/MM/RRRR` nadawany przez zNumerem. */
const NUMER_WYCENY = /^[1-9]\d*\/(0[1-9]|1[0-2])\/\d{4}$/
/** Bledna operacja na wycenie, np. `brak_wyceny`, `przejscie`, `tylko_odczyt`, `wynik`, `brak_wyniku`, `klient`, `brak_klienta`. */
export class BladWyceny extends Error {
  /**
   * @param {string} kod
   * @param {string} [komunikat]
   */
  constructor(kod, komunikat = kod) {
    super(komunikat)
    this.name = 'BladWyceny'
    this.kod = kod
  }
}

/** @param {OpcjeWycen} opcje */
const zegar = ({ teraz = () => new Date() }) => teraz()
/** @param {unknown} x */
const jestNieujemna = (x) => jestLiczba(x) && x >= 0
/** @param {unknown} x */
const jestDodatnia = (x) => jestLiczba(x) && x > 0
/** @param {unknown} x */
const jestWejsciem = (x) => jestObiektem(x) && typeof x.uslugaId === 'string' && x.uslugaId !== ''
/** @param {unknown} x regula brudu `{ pomieszczenie, brud, poziom }` (skutek odpowiedzi klienta) */
const jestRegulaBrudu = (x) => jestObiektem(x) && typeof x.pomieszczenie === 'string' && typeof x.brud === 'string' && Number.isInteger(x.poziom)
/** @param {unknown} x widelki szybkiej wyceny (SzybkaWyceny ze znanym stanem i trybem) albo null */
const jestSzybka = (x) => x === null || (jestObiektem(x) && STANY_SZYBKIEJ.some((s) => s.id === x.stan) &&
  TRYBY_SZYBKIEJ.some((t) => t === x.tryb) && jestLiczba(x.od) &&
  jestLiczba(x.do) && (x.brud === undefined || (Array.isArray(x.brud) && x.brud.every(jestRegulaBrudu))) &&
  (x.poziomGorny === undefined || Number.isInteger(x.poziomGorny)))
/** @param {unknown} x zapisany klient: teksty w granicach DLUGOSC_KLIENTA */
const jestKlientem = (x) => jestObiektem(x) && typeof x.nazwa === 'string' && typeof x.adres === 'string' && jestTekstemLubNull(x.termin) &&
  POLA_KLIENTA.every((pole) => String(x[pole] ?? '').length <= DLUGOSC_KLIENTA[pole])

/** @param {unknown} x */
function jestOferta(x) {
  return jestObiektem(x) && (x.zakres === null || jestZakresemOferty(x.zakres)) && (x.warunki === null || jestWarunkamiOferty(x.warunki)) &&
    (x.waznaDo === null || jestDniem(x.waznaDo)) && (x.wyslana === null || jestDataIso(x.wyslana)) && typeof x.nieaktualna === 'boolean'
}

/**
 * Migawka wyniku do zapisu i z pliku kopii: kwoty nieujemne, dodatni czas normowy, liczba wizyt null albo dodatnia (abonament 4,33);
 * minimum (gdy jest) nieujemne, czyMinimum (gdy jest) boolean.
 * @param {unknown} x
 * @returns {x is MigawkaWyniku}
 */
export function jestMigawkaWyniku(x) {
  return jestObiektem(x) && POLA_KWOT.every((p) => jestNieujemna(x[p])) && jestLiczba(x.mediana) && jestLiczba(x.stawkaVatProc) &&
    jestDodatnia(x.minutyNormowe) && (x.wizytWMiesiacu === null || jestDodatnia(x.wizytWMiesiacu)) && Array.isArray(x.linie) &&
    Array.isArray(x.propozycje) && jestObiektem(x.widelki) && jestObiektem(x.dojazd) && jestObiektem(x.wojewodztwo) &&
    typeof x.statusVat === 'string' && typeof x.podstawaCeny === 'string' && jestObiektem(x.wersjaDanych) &&
    (x.minimum === undefined || jestNieujemna(x.minimum)) && (x.czyMinimum === undefined || typeof x.czyMinimum === 'boolean')
}

/**
 * Zapisana wycena (stan magazynu, plik kopii); poza szkicem ma numer i wynik, tak jak nadaja je funkcje tego modulu. Czy
 * `klientId` wskazuje zapisanego klienta, sprawdza magazyn (spojnosc odwolan).
 * @param {unknown} x
 * @returns {x is Wycena}
 */
export function jestWycena(x) {
  return jestObiektem(x) && typeof x.id === 'string' && x.id !== '' && (x.numer === null || (typeof x.numer === 'string' &&
    NUMER_WYCENY.test(x.numer))) && jestDataIso(x.utworzona) && jestDataIso(x.zmieniona) && STATUSY_WYCENY.some((s) => s === x.status) &&
    RODZAJE_WYCENY.some((r) => r === x.rodzaj) && (x.klientId === null || jestId(x.klientId)) && jestKlientem(x.klient) &&
    jestWejsciem(x.wejscie) && jestSzybka(x.szybka) && jestObiektem(x.odpowiedzi) && (x.wynik === null || jestMigawkaWyniku(x.wynik)) &&
    (x.cenaReczna === null || jestDodatnia(x.cenaReczna)) && jestOferta(x.oferta) &&
    (x.status === 'szkic' || (x.numer !== null && x.wynik !== null))
}

/** @param {unknown} dane @param {string} co */
function sprawdzDlugosc(dane, co) {
  if (!maKrotkieTeksty(dane)) {
    throw new BladWyceny('dlugosc', `${co}: tekst albo klucz dłuższy niż ${MAKS_DLUGOSC_TEKSTU} znaków albo dane zagnieżdżone głębiej niż ` +
      `${MAKS_ZAGLEBIENIE} poziomy`)
  }
}

/** @param {unknown} wejscie @returns {asserts wejscie is WejscieWyceny} */
function sprawdzWejscie(wejscie) {
  if (!jestWejsciem(wejscie)) throw new BladWyceny('wejscie', 'Wejście wyceny musi mieć uslugaId')
  sprawdzDlugosc(wejscie, 'Wejście wyceny')
}

/** @param {unknown} zmiana @returns {Partial<KlientWyceny>} pola przyciete z bialych znakow */
function klientZeZmiany(zmiana) {
  if (!jestObiektem(zmiana)) throw new BladWyceny('klient', 'Dane klienta muszą być obiektem')
  const nieznane = Object.keys(zmiana).find((klucz) => !POLA_KLIENTA.some((pole) => pole === klucz))
  if (nieznane !== undefined) throw new BladWyceny('klient', `Nieznane pole klienta: ${nieznane}`)
  /** @type {Partial<KlientWyceny>} */
  const klient = {}
  for (const pole of POLA_KLIENTA) {
    const wartosc = zmiana[pole]
    if (wartosc === undefined) continue
    if (pole === 'termin' && wartosc === null) {
      klient.termin = null
      continue
    }
    if (typeof wartosc !== 'string') throw new BladWyceny('klient', `Pole klienta ${pole} musi być tekstem`)
    const tekst = wartosc.trim()
    if (tekst.length > DLUGOSC_KLIENTA[pole]) throw new BladWyceny('klient', `Pole klienta ${pole} jest za długie`)
    if (pole === 'termin') klient.termin = tekst === '' ? null : tekst
    else klient[pole] = tekst
  }
  return klient
}

/** @param {unknown} szybka */
function sprawdzSzybka(szybka) {
  if (!jestSzybka(szybka)) throw new BladWyceny('szybka', 'Widełki szybkiej wyceny mają zły kształt')
}

/** @param {unknown} wynik @returns {asserts wynik is MigawkaWyniku} */
function sprawdzWynik(wynik) {
  if (!jestMigawkaWyniku(wynik)) throw new BladWyceny('wynik', 'Migawka wyniku ma zły kształt, ujemną kwotę, zerowy czas albo złą liczbę wizyt')
  sprawdzDlugosc(wynik, 'Migawka wyniku')
}

/**
 * Wycena z co najmniej jednym zleceniem jest tylko do odczytu (zrodlo reguly; src/dane/zlecenia.js eksportuje ja dla widokow).
 * @param {Pick<Stan, 'zlecenia'>} stan @param {string} wycenaId @returns {boolean}
 */
export const czyWycenaZamknieta = (stan, wycenaId) => stan.zlecenia.some((z) => z.wycenaId === wycenaId)

/** @param {Wycena} w @param {Pick<Stan, 'zlecenia'>} stan */
function tylkoDoOdczytu(w, stan) {
  if (czyWycenaZamknieta(stan, w.id)) throw new BladWyceny('tylko_odczyt', `Z wyceny ${w.numer ?? w.id} powstało zlecenie`)
}

/** @param {unknown} klientId @returns {string} id klienta z listy; inny typ → BladWyceny `klient` */
function sprawdzKlientId(klientId) {
  if (!jestId(klientId)) throw new BladWyceny('klient', 'Identyfikator klienta musi być niepustym tekstem')
  return klientId
}

/**
 * Wycena z klientem z listy: `klientId` i kopia jego nazwy i adresu (brak adresu = pusty tekst); termin zostaje.
 * @param {Wycena} w @param {Pick<Stan, 'klienci'>} stan @param {string} klientId @returns {Wycena}
 */
function zKlientemZListy(w, stan, klientId) {
  const k = stan.klienci.find((x) => x.id === klientId)
  if (k === undefined) throw new BladWyceny('brak_klienta', `Nie ma klienta ${klientId}`)
  return { ...w, klientId, klient: { ...w.klient, nazwa: k.nazwa, adres: k.adres ?? '' } }
}

/** @param {Wycena} w @returns {MigawkaWyniku} */
function wymagajWyniku(w) {
  if (w.wynik === null) throw new BladWyceny('brak_wyniku', `Wycena ${w.id} nie ma policzonej ceny`)
  return w.wynik
}

/**
 * Statusy, do ktorych wolno przejsc z danego (PRZEJSCIA); zrodlo akcji wyceny w podsumowaniu.
 * @param {StatusWyceny} status @returns {readonly StatusWyceny[]}
 */
export const dozwolonePrzejscia = (status) => PRZEJSCIA[status] ?? []

/** Oferta mogla trafic do klienta: status `wyslana` albo data wyslania (po wyslaniu przyjeta lub odrzucona). @param {Wycena} w */
const poWyslaniu = (w) => w.status === 'wyslana' || w.oferta.wyslana !== null

/**
 * Oferta po zmianie ceny, wejscia albo numeru: po wyslaniu nieaktualna, przed wyslaniem bez zmian (tez dla kopii zapasowej).
 * @param {Wycena} w @returns {OfertaWyceny}
 */
export const nieaktualnaPoWyslaniu = (w) => (poWyslaniu(w) ? { ...w.oferta, nieaktualna: true } : w.oferta)

/**
 * Wycena planowana bez klienta dostaje kopie danych klienta zlecenia; wycena z klientem zostaje bez zmian. Wolajacy zapisuje ja razem
 * ze zleceniem, bo zamknietej wyceny nie da sie juz zmienic. Oferta nie staje sie nieaktualna: wyslania nie da sie juz zapisac, wiec
 * flaga zostalaby na stale, a wyslana oferta dalej mowi o tej samej pracy i cenie.
 * @param {Wycena} w @param {Pick<Stan, 'klienci'>} stan @param {{ klientId: string, utworzone: string }} zlecenie @returns {Wycena}
 */
export function zKlientemZlecenia(w, stan, { klientId, utworzone }) {
  return w.klientId !== null ? w : { ...zKlientemZListy(w, stan, klientId), zmieniona: utworzone }
}

/**
 * Pierwsze wyjscie ze szkicu: kolejny numer miesiaca z licznikNumerow[RRRR-MM] (czas lokalny). Numer raz nadany zostaje.
 * @param {Wycena} w @param {Record<string, number>} licznik @param {Date} teraz
 * @returns {ZmianaWyceny}
 */
function zNumerem(w, licznik, teraz) {
  if (w.numer !== null) return { wycena: w }
  const rok = teraz.getFullYear()
  const miesiac = String(teraz.getMonth() + 1).padStart(2, '0')
  const klucz = `${rok}-${miesiac}`
  const kolejny = (licznik[klucz] ?? 0) + 1
  return { wycena: { ...w, numer: `${kolejny}/${miesiac}/${rok}` }, licznikNumerow: { ...licznik, [klucz]: kolejny } }
}

/**
 * Zmiana jednej wyceny na swiezym stanie magazynu; `fn` sprawdza stan wyceny i moze rzucic BladWyceny (nic sie nie zapisuje).
 * @param {Magazyn} magazyn @param {string} id @param {OpcjeWycen} opcje
 * @param {(w: Wycena, stan: Stan, teraz: Date) => ZmianaWyceny} fn
 * @returns {Stan}
 */
function zmienWycene(magazyn, id, opcje, fn) {
  const teraz = zegar(opcje)
  return magazyn.zmien((stan) => {
    const indeks = stan.wyceny.findIndex((w) => w.id === id)
    if (indeks === -1) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
    const { wycena: zmieniona, licznikNumerow = stan.licznikNumerow } = fn(stan.wyceny[indeks], stan, teraz)
    const zapisana = { ...zmieniona, zmieniona: teraz.toISOString() }
    return { ...stan, licznikNumerow, wyceny: stan.wyceny.map((w, i) => (i === indeks ? zapisana : w)) }
  })
}

/**
 * Nowa wycena w statusie `szkic`, bez numeru i bez wyniku; z `klientId` kopiuje nazwe i adres klienta z listy (nieznany klient
 * → BladWyceny `brak_klienta`, nic sie nie zapisuje).
 * @param {Magazyn} magazyn @param {NowySzkic} dane @param {OpcjeWycen} [opcje]
 * @returns {Wycena}
 */
export function utworzSzkic(magazyn, dane, opcje = {}) {
  if (!jestObiektem(dane) || !RODZAJE_WYCENY.some((r) => r === dane.rodzaj)) throw new BladWyceny('rodzaj', 'Rodzaj wyceny: szybka albo dokladna')
  sprawdzWejscie(dane.wejscie)
  const klientId = dane.klientId === undefined || dane.klientId === null ? null : sprawdzKlientId(dane.klientId)
  const klient = { ...PUSTY_KLIENT, ...klientZeZmiany(dane.klient ?? {}) }
  const szybka = dane.szybka ?? null
  const odpowiedzi = dane.odpowiedzi ?? {}
  sprawdzDlugosc({ szybka, odpowiedzi }, 'Szkic wyceny')
  sprawdzSzybka(szybka)
  if (!jestObiektem(odpowiedzi)) throw new BladWyceny('odpowiedzi', 'Odpowiedzi klienta muszą być obiektem')
  const teraz = zegar(opcje).toISOString()
  /** @type {Wycena} */
  const nowa = { id: crypto.randomUUID(), numer: null, utworzona: teraz, zmieniona: teraz, status: 'szkic', rodzaj: dane.rodzaj, klientId: null,
    klient, wejscie: dane.wejscie, szybka, odpowiedzi, wynik: null, cenaReczna: null,
    oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false } }
  let zapisana = nowa
  magazyn.zmien((stan) => {
    if (stan.wyceny.length >= MAKS_WYCEN) throw new BladWyceny('limit_wycen', `Można zapisać najwyżej ${MAKS_WYCEN} wycen`)
    zapisana = klientId === null ? nowa : zKlientemZListy(nowa, stan, klientId)
    return { ...stan, wyceny: [...stan.wyceny, zapisana] }
  })
  return zapisana
}

/**
 * Klient z listy dla wyceny (R19): kopiuje jego nazwe i adres do `wycena.klient` (termin zostaje), a po wyslaniu oferty zmiana
 * nazwy albo adresu oznacza oferte jako nieaktualna. Null („Bez klienta”) odlacza klienta z listy i czysci kopie nazwy i adresu
 * (termin zostaje), zeby oferta nie pokazywala poprzedniego klienta. Nieznany klient → BladWyceny `brak_klienta`, wycena
 * ze zleceniem → `tylko_odczyt`; nic sie wtedy nie zapisuje.
 * @param {Magazyn} magazyn @param {string} id @param {string | null} klientId @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function przypiszKlienta(magazyn, id, klientId, opcje = {}) {
  const wybrany = klientId === null ? null : sprawdzKlientId(klientId)
  return zmienWycene(magazyn, id, opcje, (w, stan) => {
    tylkoDoOdczytu(w, stan)
    const nowa = wybrany === null
      ? { ...w, klientId: null, klient: { ...w.klient, nazwa: '', adres: '' } }
      : zKlientemZListy(w, stan, wybrany)
    const czyInnaKopia = nowa.klient.nazwa !== w.klient.nazwa || nowa.klient.adres !== w.klient.adres
    return { wycena: czyInnaKopia ? { ...nowa, oferta: nieaktualnaPoWyslaniu(nowa) } : nowa }
  })
}

/**
 * Nowe wejscie wyceny, z `opcje.wynik` razem z przeliczeniem w jednym zapisie; po wyslaniu oferta staje sie nieaktualna,
 * wycena ze zleceniem jest tylko do odczytu. Wynik null (pusty zakres) czysci migawke szkicu; wycena z numerem musi miec zakres
 * (BladWyceny `pusty_zakres`), bo poza szkicem zawsze ma wynik.
 * @param {Magazyn} magazyn @param {string} id @param {WejscieWyceny} wejscie @param {OpcjeWejscia} [opcje]
 * @returns {Stan}
 */
export function zapiszWejscie(magazyn, id, wejscie, opcje = {}) {
  sprawdzWejscie(wejscie)
  const { wynik } = opcje
  if (wynik !== undefined && wynik !== null) sprawdzWynik(wynik)
  return zmienWycene(magazyn, id, opcje, (w, stan) => {
    tylkoDoOdczytu(w, stan)
    const zWejsciem = { ...w, wejscie, oferta: nieaktualnaPoWyslaniu(w) }
    if (wynik === undefined) return { wycena: zWejsciem }
    if (wynik === null && w.status !== 'szkic') throw new BladWyceny('pusty_zakres', `Wycena ${w.numer ?? id} musi mieć zakres`)
    return { wycena: { ...zWejsciem, wynik } }
  })
}

/**
 * Zmiana pol wyceny poza samym wejsciem (rodzaj, widelki szybkiej, odpowiedzi klienta) w jednym zapisie na swiezym stanie:
 * `fn` dostaje swieza wycene i stan magazynu (ustawienia do przeliczenia) i moze rzucic (nic sie nie zapisuje). Nowe wejscie
 * idzie razem z wynikiem jak w zapiszWejscie (null czysci migawke szkicu, wycena z numerem daje BladWyceny `pusty_zakres`)
 * i po wyslaniu oznacza oferte jako nieaktualna; wycena ze zleceniem jest tylko do odczytu. Wynik o zlym ksztalcie albo za dlugim tekscie
 * daje BladWyceny `ksztalt`.
 * @param {Magazyn} magazyn @param {string} id @param {(w: Wycena, stan: Stan) => PolaWyceny} fn @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszPolaWyceny(magazyn, id, fn, opcje = {}) {
  return zmienWycene(magazyn, id, opcje, (w, stan) => {
    tylkoDoOdczytu(w, stan)
    const { wejscie, wynik, ...pola } = fn(w, stan)
    /** @type {Wycena} */
    let nowa = { ...w, ...pola }
    if (wejscie !== undefined) {
      if (wynik === undefined) throw new BladWyceny('wynik', `Nowe wejście wyceny ${id} wymaga przeliczenia`)
      if (wynik === null && w.status !== 'szkic') throw new BladWyceny('pusty_zakres', `Wycena ${w.numer ?? id} musi mieć zakres`)
      nowa = { ...nowa, wejscie, wynik, oferta: nieaktualnaPoWyslaniu(w) }
    }
    if (!jestWycena(nowa) || !maKrotkieTeksty(nowa)) throw new BladWyceny('ksztalt', `Zmiana wyceny ${id} daje zły kształt albo za długi tekst`)
    return { wycena: nowa }
  })
}

/**
 * Nowa migawka wyniku (przeliczenie); zmiana ceny po wyslaniu oznacza oferte jako nieaktualna.
 * @param {Magazyn} magazyn @param {string} id @param {MigawkaWyniku} wynik @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszWynik(magazyn, id, wynik, opcje = {}) {
  sprawdzWynik(wynik)
  return zmienWycene(magazyn, id, opcje, (w, stan) => {
    tylkoDoOdczytu(w, stan)
    const oferta = w.wynik?.cena === wynik.cena ? w.oferta : nieaktualnaPoWyslaniu(w)
    return { wycena: { ...w, wynik, oferta } }
  })
}

/**
 * Cena reczna dla klienta (null = cena z modelu); zmiana kwoty dla klienta po wyslaniu oznacza oferte jako nieaktualna.
 * @param {Magazyn} magazyn @param {string} id @param {number | null} cenaReczna dodatnia albo null @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszCeneReczna(magazyn, id, cenaReczna, opcje = {}) {
  if (cenaReczna !== null && !jestDodatnia(cenaReczna)) throw new BladWyceny('cena_reczna', `Cena ręczna musi być dodatnia, jest ${cenaReczna}`)
  return zmienWycene(magazyn, id, opcje, (w, stan) => {
    tylkoDoOdczytu(w, stan)
    const { cena } = wymagajWyniku(w)
    const czyInnaKwota = (w.cenaReczna ?? cena) !== (cenaReczna ?? cena)
    return { wycena: { ...w, cenaReczna, oferta: czyInnaKwota ? nieaktualnaPoWyslaniu(w) : w.oferta } }
  })
}

/**
 * „Zapisz” w podsumowaniu: szkic → `do_wyslania` z numerem; zapisana wcześniej wycena zostaje w swoim statusie.
 * @param {Magazyn} magazyn @param {string} id @param {{ klient?: Partial<KlientWyceny> }} [dane] @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszWycene(magazyn, id, dane = {}, opcje = {}) {
  const klient = dane.klient === undefined ? {} : klientZeZmiany(dane.klient)
  return zmienWycene(magazyn, id, opcje, (w, stan, teraz) => {
    tylkoDoOdczytu(w, stan)
    wymagajWyniku(w)
    const zKlientem = { ...w, klient: { ...w.klient, ...klient } }
    if (w.status !== 'szkic') return { wycena: zKlientem }
    return zNumerem({ ...zKlientem, status: 'do_wyslania' }, stan.licznikNumerow, teraz)
  })
}

/**
 * Zmiana statusu wg PRZEJSCIA; wyjscie ze szkicu wymaga wyniku i nadaje numer.
 * @param {Magazyn} magazyn @param {string} id @param {StatusWyceny} nowy @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zmienStatus(magazyn, id, nowy, opcje = {}) {
  if (!STATUSY_WYCENY.includes(nowy)) throw new BladWyceny('status', `Nieznany status wyceny: ${nowy}`)
  return zmienWycene(magazyn, id, opcje, (w, stan, teraz) => {
    if (!dozwolonePrzejscia(w.status).includes(nowy)) throw new BladWyceny('przejscie', `Niedozwolone przejście ${w.status} → ${nowy}`)
    if (w.status !== 'szkic') return { wycena: { ...w, status: nowy } }
    wymagajWyniku(w)
    return zNumerem({ ...w, status: nowy }, stan.licznikNumerow, teraz)
  })
}

/** @param {StatusWyceny} status @returns {boolean} z wyceny o tym statusie przygotowuje sie oferte (STATUSY_OFERTY) */
export const czyStatusOferty = (status) => STATUSY_OFERTY.some((s) => s === status)

/** @param {Wycena} w oferta tylko z wyceny o statusie z STATUSY_OFERTY; inna (szkic, odrzucona) daje BladWyceny `przejscie` */
function wymagajStatusuOferty(w) {
  if (!czyStatusOferty(w.status)) {
    throw new BladWyceny('przejscie', `Ofertę przygotowuje się z wyceny do wysłania, wysłanej albo przyjętej, ${w.numer ?? w.id} ma status ${w.status}`)
  }
}

/**
 * @param {unknown} zmiana
 * @returns {{ zakres?: ZakresUslugi | null, warunki?: WarunekOferty[] | null, waznaDo?: string | null, klient: Partial<KlientWyceny> }}
 */
function zmianaOferty(zmiana) {
  if (!jestObiektem(zmiana)) throw new BladWyceny('oferta', 'Zmiana oferty musi być obiektem')
  const nieznane = Object.keys(zmiana).find((klucz) => !POLA_ZMIANY_OFERTY.some((pole) => pole === klucz))
  if (nieznane !== undefined) throw new BladWyceny('oferta', `Nieznane pole oferty: ${nieznane}`)
  const { zakres, warunki, waznaDo, klient } = zmiana
  if (waznaDo !== undefined && waznaDo !== null && !jestDniem(waznaDo)) {
    throw new BladWyceny('wazna_do', `Data ważności oferty musi mieć postać RRRR-MM-DD, jest ${String(waznaDo)}`)
  }
  return {
    ...(zakres === undefined ? {} : { zakres: zakres === null ? null : zakresZeZmiany(zakres, 'oferta.zakres') }),
    ...(warunki === undefined ? {} : { warunki: warunki === null ? null : warunkiZeZmiany(warunki, 'oferta.warunki') }),
    ...(waznaDo === undefined ? {} : { waznaDo }),
    klient: klient === undefined ? {} : klientZeZmiany(klient),
  }
}

/**
 * Oferta tylko tej wyceny (R19, R20, R18): zakres i warunki (null = wroc do ustawien albo domyslnych), data waznosci RRRR-MM-DD
 * (null = dzis + oferta.waznosc_dni) i dane klienta. Zly zakres albo warunki daja BladUstawien (te same reguly co w ustawieniach),
 * szkic i odrzucona (status spoza STATUSY_OFERTY) oraz wycena ze zleceniem daja BladWyceny; zmiana po wyslaniu oznacza oferte jako nieaktualna.
 * @param {Magazyn} magazyn @param {string} id
 * @param {{ zakres?: ZakresUslugi | null, warunki?: WarunekOferty[] | null, waznaDo?: string | null, klient?: Partial<KlientWyceny> }} zmiana
 * @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszOferte(magazyn, id, zmiana, opcje = {}) {
  const { klient, ...pola } = zmianaOferty(zmiana)
  return zmienWycene(magazyn, id, opcje, (w, stan) => {
    tylkoDoOdczytu(w, stan)
    wymagajStatusuOferty(w)
    const nowa = { ...w, klient: { ...w.klient, ...klient }, oferta: { ...w.oferta, ...pola } }
    const czyZmiana = JSON.stringify([nowa.klient, nowa.oferta]) !== JSON.stringify([w.klient, w.oferta])
    return { wycena: czyZmiana ? { ...nowa, oferta: nieaktualnaPoWyslaniu(nowa) } : w }
  })
}

/**
 * Oferta trafila do klienta (skopiowany albo udostepniony link, otwarta do druku): `do_wyslania` → `wyslana`, data wyslania
 * = teraz, oferta znow aktualna; przyjeta i juz wyslana zostaja w swoim statusie. Szkic, odrzucona i wycena ze zleceniem daja BladWyceny.
 * @param {Magazyn} magazyn @param {string} id @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function oznaczWyslana(magazyn, id, opcje = {}) {
  return zmienWycene(magazyn, id, opcje, (w, stan, teraz) => {
    tylkoDoOdczytu(w, stan)
    wymagajStatusuOferty(w)
    const status = w.status === 'do_wyslania' ? 'wyslana' : w.status
    return { wycena: { ...w, status, oferta: { ...w.oferta, wyslana: teraz.toISOString(), nieaktualna: false } } }
  })
}

/**
 * Wyslanie oferty z ekranu oferty (link skopiowany albo udostepniony, PDF otwarty do druku), sprawdzane na swiezym stanie.
 * Wycena ze zleceniem (takze powstalym w innej karcie po otwarciu ekranu) jest tylko do odczytu: wyslanie niczego nie zapisuje
 * i nie daje bledu. Inaczej data waznosci z linku, gdy wycena jej nie miala, i oznaczWyslana.
 * @param {Magazyn} magazyn @param {string} id @param {string | null} waznaDo data waznosci RRRR-MM-DD z wyslanego linku
 * @param {OpcjeWycen} [opcje]
 * @returns {boolean} czy zapisano wyslanie; false — wycena ze zleceniem
 */
export function zapiszWyslanieOferty(magazyn, id, waznaDo, opcje = {}) {
  const wynik = magazyn.wczytaj()
  const stan = 'stan' in wynik ? wynik.stan : null
  if (stan && czyWycenaZamknieta(stan, id)) return false
  if (stan && waznaDo !== null && wycena(stan, id)?.oferta.waznaDo === null) zapiszOferte(magazyn, id, { waznaDo }, opcje)
  oznaczWyslana(magazyn, id, opcje)
  return true
}

/**
 * Usuniecie wyceny; jej numer nie wraca do puli. Zlecenia z tej wyceny zostaja razem z planem, a ich `wycenaId` zeruje sie
 * w tym samym zapisie (spojnosc odwolan sprawdza magazyn).
 * @param {Magazyn} magazyn @param {string} id
 * @returns {Stan}
 */
export function usunWycene(magazyn, id) {
  return magazyn.zmien((stan) => {
    if (!stan.wyceny.some((w) => w.id === id)) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
    const zlecenia = stan.zlecenia.map((z) => (z.wycenaId === id ? { ...z, wycenaId: null } : z))
    return { ...stan, wyceny: stan.wyceny.filter((w) => w.id !== id), zlecenia }
  })
}

/**
 * Wyceny od ostatnio zmienionej.
 * @param {Pick<Stan, 'wyceny'>} stan
 * @returns {Wycena[]}
 */
export function listaWycen(stan) {
  return [...stan.wyceny].sort((a, b) => (a.zmieniona === b.zmieniona ? 0 : a.zmieniona < b.zmieniona ? 1 : -1))
}

/**
 * @param {Pick<Stan, 'wyceny'>} stan @param {string} id
 * @returns {Wycena | null}
 */
export function wycena(stan, id) {
  return stan.wyceny.find((w) => w.id === id) ?? null
}
