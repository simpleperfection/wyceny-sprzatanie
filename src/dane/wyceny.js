// Zapisane wyceny (R29): szkic z wejsciem, migawka wyniku, cykl zycia statusow z numeracja NN/MM/RRRR i wpisy wykonania (R16).
// Kazda zmiana idzie przez magazyn.zmien: odczyt swiezego stanu, sprawdzenie i zapis w jednym synchronicznym kroku.
// Straznik jestWycena jest jedynym opisem zapisanej wyceny: uzywa go zapis tutaj i kopia zapasowa (eksport i odczyt pliku).

import {
  jestDataIso, jestDniem, jestLiczba, jestObiektem, jestTekstemLubNull, jestWarunkamiOferty, jestZakresemOferty, MAKS_DLUGOSC_TEKSTU,
  MAKS_ZAGLEBIENIE, maKrotkieTeksty,
} from './ksztalt.js'
import { warunkiZeZmiany, zakresZeZmiany } from './ustawienia.js'
import { STANY_SZYBKIEJ, TRYBY_SZYBKIEJ } from '../silnik/szybka.js'

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
export const STATUSY_WYCENY = Object.freeze(/** @type {const} */ (['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona', 'wykonana']))
/** Najdluzsze wykonanie zlecenia w minutach (doba); zrodlo progu dla ekranu zakonczenia zlecenia. */
export const MAKS_MINUT_WYKONANIA = 1440
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
 * @typedef {{ id: string, data: string, minuty: number, tempoPlanu: number }} Wykonanie data RRRR-MM-DD
 * @typedef {Omit<Wykonanie, 'id'> & { id?: string }} NoweWykonanie id nadaje ekran przy otwarciu (ponowny zapis tego wpisu nic nie zmienia)
 * @typedef {{ zakres: ZakresUslugi | null, warunki: WarunekOferty[] | null, waznaDo: string | null, wyslana: string | null,
 *   nieaktualna: boolean }} OfertaWyceny
 * @typedef {{ id: string, numer: string | null, utworzona: string, zmieniona: string, status: StatusWyceny, rodzaj: RodzajWyceny,
 *   klient: KlientWyceny, wejscie: WejscieWyceny, szybka: SzybkaWyceny | null, odpowiedzi: Record<string, unknown>,
 *   wynik: MigawkaWyniku | null, cenaReczna: number | null, wykonania: Wykonanie[], oferta: OfertaWyceny }} Wycena
 * @typedef {{ rodzaj: RodzajWyceny, wejscie: WejscieWyceny, klient?: Partial<KlientWyceny>, szybka?: SzybkaWyceny | null,
 *   odpowiedzi?: Record<string, unknown> }} NowySzkic
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
  przyjeta: ['wykonana'],
  odrzucona: ['do_wyslania'],
  wykonana: [],
})
const DLUGOSC_KLIENTA = Object.freeze({ nazwa: 120, adres: 200, termin: 40 })
const POLA_KLIENTA = /** @type {const} */ (['nazwa', 'adres', 'termin'])
const POLA_KWOT = /** @type {const} */ (['cena', 'netto', 'vat'])
const PUSTY_KLIENT = Object.freeze({ nazwa: '', adres: '', termin: null })
const POLA_ZMIANY_OFERTY = /** @type {const} */ (['zakres', 'warunki', 'waznaDo', 'klient'])
/** Numer `NN/MM/RRRR` nadawany przez zNumerem. */
const NUMER_WYCENY = /^[1-9]\d*\/(0[1-9]|1[0-2])\/\d{4}$/
/** Zlecenie jednorazowe ma w migawce null (uslugi bez wariantow) albo 1 wizyte (wariant `jednorazowe` biura); wiecej = abonament. */
const WIZYT_ZLECENIA_JEDNORAZOWEGO = 1

/** Bledna operacja na wycenie, np. `brak_wyceny`, `przejscie`, `tylko_odczyt`, `minuty`, `wynik`, `brak_wyniku`. */
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
const jestMinutamiWykonania = (x) => jestDodatnia(x) && Number(x) <= MAKS_MINUT_WYKONANIA
/** @param {unknown} x */
const jestWejsciem = (x) => jestObiektem(x) && typeof x.uslugaId === 'string' && x.uslugaId !== ''
/** @param {unknown} x regula brudu `{ pomieszczenie, brud, poziom }` (skutek odpowiedzi klienta) */
const jestRegulaBrudu = (x) => jestObiektem(x) && typeof x.pomieszczenie === 'string' && typeof x.brud === 'string' && Number.isInteger(x.poziom)
/** @param {unknown} x widelki szybkiej wyceny (SzybkaWyceny ze znanym stanem i trybem) albo null */
const jestSzybka = (x) => x === null || (jestObiektem(x) && STANY_SZYBKIEJ.some((s) => s.id === x.stan) &&
  TRYBY_SZYBKIEJ.some((t) => t === x.tryb) && jestLiczba(x.od) &&
  jestLiczba(x.do) && (x.brud === undefined || (Array.isArray(x.brud) && x.brud.every(jestRegulaBrudu))))
/** @param {unknown} x zapisany klient: teksty w granicach DLUGOSC_KLIENTA */
const jestKlientem = (x) => jestObiektem(x) && typeof x.nazwa === 'string' && typeof x.adres === 'string' && jestTekstemLubNull(x.termin) &&
  POLA_KLIENTA.every((pole) => String(x[pole] ?? '').length <= DLUGOSC_KLIENTA[pole])
/** @param {unknown} x */
const jestWykonaniem = (x) => jestObiektem(x) && typeof x.id === 'string' && x.id !== '' && jestDniem(x.data) &&
  jestMinutamiWykonania(x.minuty) && jestDodatnia(x.tempoPlanu)

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
 * Zapisana wycena (stan magazynu, plik kopii); poza szkicem ma numer i wynik, tak jak nadaja je funkcje tego modulu.
 * @param {unknown} x
 * @returns {x is Wycena}
 */
export function jestWycena(x) {
  return jestObiektem(x) && typeof x.id === 'string' && x.id !== '' && (x.numer === null || (typeof x.numer === 'string' &&
    NUMER_WYCENY.test(x.numer))) && jestDataIso(x.utworzona) && jestDataIso(x.zmieniona) && STATUSY_WYCENY.some((s) => s === x.status) &&
    RODZAJE_WYCENY.some((r) => r === x.rodzaj) && jestKlientem(x.klient) && jestWejsciem(x.wejscie) && jestSzybka(x.szybka) &&
    jestObiektem(x.odpowiedzi) && (x.wynik === null || jestMigawkaWyniku(x.wynik)) && (x.cenaReczna === null || jestDodatnia(x.cenaReczna)) &&
    Array.isArray(x.wykonania) && x.wykonania.every(jestWykonaniem) && jestOferta(x.oferta) &&
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

/** Abonament (wiecej niz 1 wizyta w miesiacu); zrodlo reguly dla wykonan i podsumowania. @param {Pick<MigawkaWyniku, 'wizytWMiesiacu'>} wynik */
export const czyAbonament = (wynik) => wynik.wizytWMiesiacu !== null && wynik.wizytWMiesiacu > WIZYT_ZLECENIA_JEDNORAZOWEGO

/** @param {Wycena} w */
function tylkoDoOdczytu(w) {
  if (w.status === 'wykonana') throw new BladWyceny('tylko_odczyt', `Wycena ${w.numer ?? w.id} jest wykonana`)
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
 * Nowa wycena w statusie `szkic`, bez numeru i bez wyniku.
 * @param {Magazyn} magazyn @param {NowySzkic} dane @param {OpcjeWycen} [opcje]
 * @returns {Wycena}
 */
export function utworzSzkic(magazyn, dane, opcje = {}) {
  if (!jestObiektem(dane) || !RODZAJE_WYCENY.some((r) => r === dane.rodzaj)) throw new BladWyceny('rodzaj', 'Rodzaj wyceny: szybka albo dokladna')
  sprawdzWejscie(dane.wejscie)
  const klient = { ...PUSTY_KLIENT, ...klientZeZmiany(dane.klient ?? {}) }
  const szybka = dane.szybka ?? null
  const odpowiedzi = dane.odpowiedzi ?? {}
  sprawdzDlugosc({ szybka, odpowiedzi }, 'Szkic wyceny')
  sprawdzSzybka(szybka)
  if (!jestObiektem(odpowiedzi)) throw new BladWyceny('odpowiedzi', 'Odpowiedzi klienta muszą być obiektem')
  const teraz = zegar(opcje).toISOString()
  /** @type {Wycena} */
  const nowa = { id: crypto.randomUUID(), numer: null, utworzona: teraz, zmieniona: teraz, status: 'szkic', rodzaj: dane.rodzaj, klient,
    wejscie: dane.wejscie, szybka, odpowiedzi, wynik: null, cenaReczna: null, wykonania: [],
    oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false } }
  magazyn.zmien((stan) => {
    if (stan.wyceny.length >= MAKS_WYCEN) throw new BladWyceny('limit_wycen', `Można zapisać najwyżej ${MAKS_WYCEN} wycen`)
    return { ...stan, wyceny: [...stan.wyceny, nowa] }
  })
  return nowa
}

/**
 * Nowe wejscie wyceny, z `opcje.wynik` razem z przeliczeniem w jednym zapisie; po wyslaniu oferta staje sie nieaktualna,
 * wykonana jest tylko do odczytu. Wynik null (pusty zakres) czysci migawke szkicu; wycena z numerem musi miec zakres
 * (BladWyceny `pusty_zakres`), bo poza szkicem zawsze ma wynik.
 * @param {Magazyn} magazyn @param {string} id @param {WejscieWyceny} wejscie @param {OpcjeWejscia} [opcje]
 * @returns {Stan}
 */
export function zapiszWejscie(magazyn, id, wejscie, opcje = {}) {
  sprawdzWejscie(wejscie)
  const { wynik } = opcje
  if (wynik !== undefined && wynik !== null) sprawdzWynik(wynik)
  return zmienWycene(magazyn, id, opcje, (w) => {
    tylkoDoOdczytu(w)
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
 * i po wyslaniu oznacza oferte jako nieaktualna; wykonana jest tylko do odczytu. Wynik o zlym ksztalcie albo za dlugim tekscie
 * daje BladWyceny `ksztalt`.
 * @param {Magazyn} magazyn @param {string} id @param {(w: Wycena, stan: Stan) => PolaWyceny} fn @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszPolaWyceny(magazyn, id, fn, opcje = {}) {
  return zmienWycene(magazyn, id, opcje, (w, stan) => {
    tylkoDoOdczytu(w)
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
  return zmienWycene(magazyn, id, opcje, (w) => {
    tylkoDoOdczytu(w)
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
  return zmienWycene(magazyn, id, opcje, (w) => {
    tylkoDoOdczytu(w)
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
    tylkoDoOdczytu(w)
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

/** @param {Wycena} w */
function wymagajZapisanej(w) {
  if (w.status === 'szkic') throw new BladWyceny('przejscie', `Ofertę przygotowuje się z zapisanej wyceny, ${w.id} jest szkicem`)
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
 * szkic i wykonana BladWyceny; zmiana po wyslaniu oznacza oferte jako nieaktualna.
 * @param {Magazyn} magazyn @param {string} id
 * @param {{ zakres?: ZakresUslugi | null, warunki?: WarunekOferty[] | null, waznaDo?: string | null, klient?: Partial<KlientWyceny> }} zmiana
 * @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszOferte(magazyn, id, zmiana, opcje = {}) {
  const { klient, ...pola } = zmianaOferty(zmiana)
  return zmienWycene(magazyn, id, opcje, (w) => {
    tylkoDoOdczytu(w)
    wymagajZapisanej(w)
    const nowa = { ...w, klient: { ...w.klient, ...klient }, oferta: { ...w.oferta, ...pola } }
    const czyZmiana = JSON.stringify([nowa.klient, nowa.oferta]) !== JSON.stringify([w.klient, w.oferta])
    return { wycena: czyZmiana ? { ...nowa, oferta: nieaktualnaPoWyslaniu(nowa) } : w }
  })
}

/**
 * Oferta trafila do klienta (skopiowany albo udostepniony link, otwarta do druku): `do_wyslania` → `wyslana`, data wyslania
 * = teraz, oferta znow aktualna; przyjeta, odrzucona i juz wyslana zostaja w swoim statusie. Szkic i wykonana daja BladWyceny.
 * @param {Magazyn} magazyn @param {string} id @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function oznaczWyslana(magazyn, id, opcje = {}) {
  return zmienWycene(magazyn, id, opcje, (w, _stan, teraz) => {
    tylkoDoOdczytu(w)
    wymagajZapisanej(w)
    const status = w.status === 'do_wyslania' ? 'wyslana' : w.status
    return { wycena: { ...w, status, oferta: { ...w.oferta, wyslana: teraz.toISOString(), nieaktualna: false } } }
  })
}

/** @param {NoweWykonanie} wpis @returns {Wykonanie} */
function wykonanieZWpisu({ id = crypto.randomUUID(), data, minuty, tempoPlanu }) {
  if (typeof id !== 'string' || id === '' || id.length > MAKS_DLUGOSC_TEKSTU) throw new BladWyceny('id', 'Identyfikator wpisu musi być tekstem')
  if (!jestMinutamiWykonania(minuty)) {
    throw new BladWyceny('minuty', `Czas pracy musi być w przedziale (0, ${MAKS_MINUT_WYKONANIA}] min, jest ${minuty}`)
  }
  if (!jestDniem(data)) throw new BladWyceny('data', `Data wykonania musi mieć postać RRRR-MM-DD, jest ${data}`)
  if (!jestDodatnia(tempoPlanu)) throw new BladWyceny('tempo', `Tempo planu musi być dodatnie, jest ${tempoPlanu}`)
  return { id, data, minuty, tempoPlanu }
}

/**
 * Wpis faktycznego czasu przyjetego zlecenia (R16): jednorazowe → `wykonana`, abonament zostaje `przyjeta` i zbiera wizyty.
 * Wpis z `id`, ktory wycena juz ma (podwojne „Zapisz”), niczego nie zmienia i zwraca biezacy stan.
 * @param {Magazyn} magazyn @param {string} id @param {NoweWykonanie} wpis @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function dodajWykonanie(magazyn, id, wpis, opcje = {}) {
  const wykonanie = wykonanieZWpisu(wpis)
  const obecny = magazyn.wczytaj()
  if ('stan' in obecny && wycena(obecny.stan, id)?.wykonania.some((w) => w.id === wykonanie.id)) return obecny.stan
  return zmienWycene(magazyn, id, opcje, (w) => {
    tylkoDoOdczytu(w)
    if (w.status !== 'przyjeta') throw new BladWyceny('przejscie', `Czas pracy wpisuje się do przyjętej wyceny, ta ma status ${w.status}`)
    const status = czyAbonament(wymagajWyniku(w)) ? 'przyjeta' : 'wykonana'
    return { wycena: { ...w, status, wykonania: [...w.wykonania, wykonanie] } }
  })
}

/**
 * Usuniecie wyceny; jej numer nie wraca do puli.
 * @param {Magazyn} magazyn @param {string} id
 * @returns {Stan}
 */
export function usunWycene(magazyn, id) {
  return magazyn.zmien((stan) => {
    if (!stan.wyceny.some((w) => w.id === id)) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
    return { ...stan, wyceny: stan.wyceny.filter((w) => w.id !== id) }
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
