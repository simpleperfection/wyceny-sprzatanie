// Zapisane wyceny (R29): szkic z wejsciem, migawka wyniku, cykl zycia statusow z numeracja NN/MM/RRRR i wpisy wykonania (R16).
// Kazda zmiana idzie przez magazyn.zmien: odczyt swiezego stanu, sprawdzenie i zapis w jednym synchronicznym kroku.

/** @typedef {import('./magazyn.js').Magazyn} Magazyn */
/** @typedef {import('./magazyn.js').Stan} Stan */
/** @typedef {import('./magazyn.js').WarunekOferty} WarunekOferty */
/** @typedef {import('./magazyn.js').ZakresUslugi} ZakresUslugi */
/** @typedef {import('../silnik/cena.js').LiniaWyceny} LiniaWyceny */
/** @typedef {import('../silnik/cena.js').Propozycja} Propozycja */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/vat.js').StatusVat} StatusVat */
/** @typedef {import('../silnik/widelki.js').WidelkiRynku} WidelkiRynku */

/** Statusy wyceny w kolejnosci cyklu zycia; zrodlo stalej dla widokow i listy wycen. */
export const STATUSY_WYCENY = Object.freeze(/** @type {const} */ (['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona', 'wykonana']))
/** Najdluzsze wykonanie zlecenia w minutach (doba); zrodlo progu dla ekranu zakonczenia zlecenia. */
export const MAKS_MINUT_WYKONANIA = 1440

/**
 * @typedef {typeof STATUSY_WYCENY[number]} StatusWyceny
 * @typedef {'szybka' | 'dokladna'} RodzajWyceny
 * @typedef {{ nazwa: string, adres: string, termin: string | null }} KlientWyceny
 * @typedef {{ stan: string, od: number, do: number, tryb: string }} SzybkaWyceny widelki szybkiej wyceny, z ktorej powstala dokladna
 * @typedef {{ id: string | null, nazwa: string, stawka_h: number, wsp: number }} WojewodztwoMigawki id null = srednia krajowa
 * @typedef {{ cena: number, netto: number, vat: number, mediana: number, widelki: WidelkiRynku, minutyNormowe: number,
 *   linie: LiniaWyceny[], propozycje: Propozycja[], dojazd: { km: number, kwota: number }, wojewodztwo: WojewodztwoMigawki,
 *   statusVat: StatusVat, stawkaVatProc: number, podstawaCeny: string, wizytWMiesiacu: number | null,
 *   wersjaDanych: { ceny: string, normy: string, rynek: string } }} MigawkaWyniku wynik z chwili wyceny; abonament: za wizyte
 * @typedef {{ id: string, data: string, minuty: number, tempoPlanu: number }} Wykonanie data RRRR-MM-DD
 * @typedef {{ zakres: ZakresUslugi | null, warunki: WarunekOferty[] | null, waznaDo: string | null, wyslana: string | null,
 *   nieaktualna: boolean }} OfertaWyceny
 * @typedef {{ id: string, numer: string | null, utworzona: string, zmieniona: string, status: StatusWyceny, rodzaj: RodzajWyceny,
 *   klient: KlientWyceny, wejscie: WejscieWyceny, szybka: SzybkaWyceny | null, odpowiedzi: Record<string, unknown>,
 *   wynik: MigawkaWyniku | null, cenaReczna: number | null, wykonania: Wykonanie[], oferta: OfertaWyceny }} Wycena
 * @typedef {{ rodzaj: RodzajWyceny, wejscie: WejscieWyceny, klient?: Partial<KlientWyceny>, szybka?: SzybkaWyceny | null,
 *   odpowiedzi?: Record<string, unknown> }} NowySzkic
 * @typedef {{ teraz?: () => Date }} OpcjeWycen zegar (do testow)
 * @typedef {{ wycena: Wycena, licznikNumerow?: Record<string, number> }} ZmianaWyceny
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
const RODZAJE_WYCENY = ['szybka', 'dokladna']
const DLUGOSC_KLIENTA = Object.freeze({ nazwa: 120, adres: 200, termin: 40 })
const POLA_KLIENTA = /** @type {const} */ (['nazwa', 'adres', 'termin'])
const POLA_KWOT = /** @type {const} */ (['cena', 'netto', 'vat'])
const PUSTY_KLIENT = Object.freeze({ nazwa: '', adres: '', termin: null })
const DZIEN = /^\d{4}-\d{2}-\d{2}$/

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

/** @param {unknown} x @returns {x is Record<string, unknown>} */
const jestObiektem = (x) => typeof x === 'object' && x !== null && !Array.isArray(x)
/** @param {unknown} x @returns {x is number} */
const jestLiczba = (x) => typeof x === 'number' && Number.isFinite(x)
/** @param {OpcjeWycen} opcje */
const zegar = ({ teraz = () => new Date() }) => teraz()

/** @param {unknown} wejscie @returns {asserts wejscie is WejscieWyceny} */
function sprawdzWejscie(wejscie) {
  if (!jestObiektem(wejscie) || typeof wejscie.uslugaId !== 'string' || wejscie.uslugaId === '') {
    throw new BladWyceny('wejscie', 'Wejście wyceny musi mieć uslugaId')
  }
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
  if (szybka === null) return
  if (!jestObiektem(szybka) || typeof szybka.stan !== 'string' || typeof szybka.tryb !== 'string' || !jestLiczba(szybka.od) ||
    !jestLiczba(szybka.do)) throw new BladWyceny('szybka', 'Widełki szybkiej wyceny mają zły kształt')
}

/** @param {unknown} wynik @returns {asserts wynik is MigawkaWyniku} */
function sprawdzWynik(wynik) {
  if (!jestObiektem(wynik)) throw new BladWyceny('wynik', 'Migawka wyniku musi być obiektem')
  const zlaKwota = POLA_KWOT.find((p) => !jestLiczba(wynik[p]) || Number(wynik[p]) < 0)
  if (zlaKwota) throw new BladWyceny('wynik', `Migawka wyniku: ${zlaKwota} musi być nieujemną liczbą`)
  if (!jestLiczba(wynik.minutyNormowe) || wynik.minutyNormowe <= 0) throw new BladWyceny('wynik', 'Migawka wyniku bez czasu normowego')
  const wizyt = wynik.wizytWMiesiacu
  if (wizyt !== null && !(Number.isInteger(wizyt) && Number(wizyt) > 0)) throw new BladWyceny('wynik', 'Migawka wyniku: zła liczba wizyt')
  if (!Array.isArray(wynik.linie)) throw new BladWyceny('wynik', 'Migawka wyniku bez linii')
}

/** @param {Wycena} w */
function tylkoDoOdczytu(w) {
  if (w.status === 'wykonana') throw new BladWyceny('tylko_odczyt', `Wycena ${w.numer ?? w.id} jest wykonana`)
}

/** @param {Wycena} w @returns {MigawkaWyniku} */
function wymagajWyniku(w) {
  if (w.wynik === null) throw new BladWyceny('brak_wyniku', `Wycena ${w.id} nie ma policzonej ceny`)
  return w.wynik
}

/** Oferta mogla trafic do klienta: status `wyslana` albo data wyslania (po wyslaniu przyjeta lub odrzucona). @param {Wycena} w */
const poWyslaniu = (w) => w.status === 'wyslana' || w.oferta.wyslana !== null

/** @param {Wycena} w @returns {OfertaWyceny} */
const nieaktualnaPoWyslaniu = (w) => (poWyslaniu(w) ? { ...w.oferta, nieaktualna: true } : w.oferta)

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
  if (!jestObiektem(dane) || !RODZAJE_WYCENY.includes(String(dane.rodzaj))) throw new BladWyceny('rodzaj', 'Rodzaj wyceny: szybka albo dokladna')
  sprawdzWejscie(dane.wejscie)
  const klient = { ...PUSTY_KLIENT, ...klientZeZmiany(dane.klient ?? {}) }
  const szybka = dane.szybka ?? null
  sprawdzSzybka(szybka)
  const odpowiedzi = dane.odpowiedzi ?? {}
  if (!jestObiektem(odpowiedzi)) throw new BladWyceny('odpowiedzi', 'Odpowiedzi klienta muszą być obiektem')
  const teraz = zegar(opcje).toISOString()
  /** @type {Wycena} */
  const nowa = { id: crypto.randomUUID(), numer: null, utworzona: teraz, zmieniona: teraz, status: 'szkic', rodzaj: dane.rodzaj, klient,
    wejscie: dane.wejscie, szybka, odpowiedzi, wynik: null, cenaReczna: null, wykonania: [],
    oferta: { zakres: null, warunki: null, waznaDo: null, wyslana: null, nieaktualna: false } }
  magazyn.zmien((stan) => ({ ...stan, wyceny: [...stan.wyceny, nowa] }))
  return nowa
}

/**
 * Nowe wejscie wyceny; po wyslaniu oferta staje sie nieaktualna, wykonana jest tylko do odczytu.
 * @param {Magazyn} magazyn @param {string} id @param {WejscieWyceny} wejscie @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function zapiszWejscie(magazyn, id, wejscie, opcje = {}) {
  sprawdzWejscie(wejscie)
  return zmienWycene(magazyn, id, opcje, (w) => {
    tylkoDoOdczytu(w)
    return { wycena: { ...w, wejscie, oferta: nieaktualnaPoWyslaniu(w) } }
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
    if (!PRZEJSCIA[w.status].includes(nowy)) throw new BladWyceny('przejscie', `Niedozwolone przejście ${w.status} → ${nowy}`)
    if (w.status !== 'szkic') return { wycena: { ...w, status: nowy } }
    wymagajWyniku(w)
    return zNumerem({ ...w, status: nowy }, stan.licznikNumerow, teraz)
  })
}

/** @param {unknown} data @returns {boolean} istniejacy dzien w postaci RRRR-MM-DD */
function jestDniem(data) {
  if (typeof data !== 'string' || !DZIEN.test(data)) return false
  const dzien = new Date(`${data}T00:00:00Z`)
  return !Number.isNaN(dzien.getTime()) && dzien.toISOString().startsWith(data)
}

/**
 * Wpis faktycznego czasu przyjetego zlecenia (R16): jednorazowe → `wykonana`, abonament zostaje `przyjeta` i zbiera wizyty.
 * @param {Magazyn} magazyn @param {string} id @param {Omit<Wykonanie, 'id'>} wpis @param {OpcjeWycen} [opcje]
 * @returns {Stan}
 */
export function dodajWykonanie(magazyn, id, { data, minuty, tempoPlanu }, opcje = {}) {
  if (!jestLiczba(minuty) || minuty <= 0 || minuty > MAKS_MINUT_WYKONANIA) {
    throw new BladWyceny('minuty', `Czas pracy musi być w przedziale (0, ${MAKS_MINUT_WYKONANIA}] min, jest ${minuty}`)
  }
  if (!jestDniem(data)) throw new BladWyceny('data', `Data wykonania musi mieć postać RRRR-MM-DD, jest ${data}`)
  if (!jestLiczba(tempoPlanu) || tempoPlanu <= 0) throw new BladWyceny('tempo', `Tempo planu musi być dodatnie, jest ${tempoPlanu}`)
  /** @type {Wykonanie} */
  const wykonanie = { id: crypto.randomUUID(), data, minuty, tempoPlanu }
  return zmienWycene(magazyn, id, opcje, (w) => {
    tylkoDoOdczytu(w)
    if (w.status !== 'przyjeta') throw new BladWyceny('przejscie', `Czas pracy wpisuje się do przyjętej wyceny, ta ma status ${w.status}`)
    const status = wymagajWyniku(w).wizytWMiesiacu === null ? 'wykonana' : 'przyjeta'
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
