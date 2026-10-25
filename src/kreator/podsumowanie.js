// Podsumowanie dokladnej wyceny (R5, R7, R8, R9, R15): cena dla klienta z modelu albo reczna, polozenie na tle widelek rynku,
// koszt zlecenia i „zostaje dla Ciebie” z tempem firmy, abonament, propozycje i ostrzezenia. Zapis ceny recznej i przeliczenie
// migawki ida przez magazyn.zmien i src/dane/wyceny.js; logika bez DOM, widoki (src/widoki/podsumowanie*.js) tylko rysuja.

import { wczytajStan } from '../dane/magazyn.js'
import { scalKoszty } from '../dane/ustawienia.js'
import { BladWyceny, nieaktualnaPoWyslaniu, wycena as znajdzWycene, zapiszWynik } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { kosztZlecenia } from '../silnik/koszt.js'
import { tempoDoWyceny } from '../silnik/tempo.js'
import { sprawdzStatusVat, zCenyRecznej } from '../silnik/vat.js'
import { infoDojazdu } from './pozycje.js'
import { przelicz } from './stan.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/magazyn.js').Magazyn} Magazyn */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').MigawkaWyniku} MigawkaWyniku */
/** @typedef {import('../dane/wyceny.js').StatusWyceny} StatusWyceny */
/** @typedef {import('../silnik/cena.js').WynikWyceny} WynikWyceny */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').KosztyFirmy} KosztyFirmy */
/** @typedef {import('../silnik/koszt.js').KosztZlecenia} KosztZlecenia */
/** @typedef {import('../silnik/tempo.js').ZrodloTempa} ZrodloTempa */
/** @typedef {import('../silnik/vat.js').StatusVat} StatusVat */
/**
 * @typedef {{ brutto: number, netto: number, vat: number, czyReczna: boolean, statusVat: StatusVat, stawkaVatProc: number,
 *   rozbicie: { uslugi: number, dojazd: number } | null }} CenaPodsumowania rozbicie: tylko przy dojezdzie platnym przez klienta
 * @typedef {{ mediana: number, od: number, do: number, pelne: boolean, procent: number, polozenie: 'ponizej' | 'w' | 'powyzej' }}
 *   RynekPodsumowania procent: ulamek (0.16 = +16%) ceny wzgledem mediany
 * @typedef {{ kwota: number, naGodzine: number, minutyWlasne: number, tempo: number, zrodloTempa: ZrodloTempa }} ZostajePodsumowania
 * @typedef {{ rodzaj: 'cena' | 'zostaje', kwota: number } | { rodzaj: 'vat', kwota: number, stawkaVatProc: number }
 *   | { rodzaj: 'chemia', kwota: number, chemiaH: number | null } | { rodzaj: 'sprzet', kwota: number, nazwa: string | null }
 *   | { rodzaj: 'dojazd', kwota: number, kmRazem: number, stawka: number }} WierszKosztu chemiaH null = chemia na jednostke pozycji
 * @typedef {{ wizyt: number, zaWizyte: number, miesiecznie: number, zostajeMiesiecznie: number }} AbonamentPodsumowania
 * @typedef {{ rodzaj: 'nowe_dane' } | { rodzaj: 'poza_szybka', od: number, do: number } | { rodzaj: 'oferta_nieaktualna' }} Ostrzezenie
 * @typedef {{ cena: CenaPodsumowania, rynek: RynekPodsumowania, zostaje: ZostajePodsumowania, koszty: WierszKosztu[],
 *   abonament: AbonamentPodsumowania | null, propozycje: { opisy: string[], kwota: number } | null, ostrzezenia: Ostrzezenie[] }} Podsumowanie
 * @typedef {'edytuj' | 'przyjeta' | 'odrzucona' | 'usun'} AkcjaWyceny
 */

/** Cena wpisana recznie: pelne zlote (jak brutto z cenaDlaKlienta) w tych granicach. */
export const GRANICE_CENY_RECZNEJ = Object.freeze({ min: 1, max: 1_000_000 })
/** Jak w src/dane/wyceny.js: 1 wizyta (wariant `jednorazowe`) to zlecenie jednorazowe, wiecej — abonament. */
const WIZYT_ZLECENIA_JEDNORAZOWEGO = 1
const PROCENT = 100
const KLUCZE_WERSJI = /** @type {const} */ (['ceny', 'normy', 'rynek'])
/** Statusy, w ktorych czeka sie na decyzje klienta (przejscia do `przyjeta` i `odrzucona` w src/dane/wyceny.js). */
const STATUSY_DECYZJI_KLIENTA = new Set(['do_wyslania', 'wyslana'])

/** Migawka w ksztalcie wyniku silnika; kosztZlecenia czyta z niego linie, dojazd, minutyNormowe i wizytWMiesiacu. @param {MigawkaWyniku} m @returns {WynikWyceny} */
function wynikZMigawki(m) {
  return { linie: m.linie, propozycje: m.propozycje, cenaUslugi: m.cena - m.dojazd.kwota, minimum: 0, czyMinimum: false, dojazd: m.dojazd,
    cena: m.cena, cenaZaokraglona: m.cena, minutyNormowe: m.minutyNormowe, wizytWMiesiacu: m.wizytWMiesiacu, cenaMiesieczna: null,
    podstawaCeny: m.podstawaCeny }
}

/** Kwoty modelu (dojazd, widelki) w cenie dla klienta: czynny podatnik przy podstawie netto dolicza VAT na gorze (jak cenaDlaKlienta). @param {MigawkaWyniku} m */
const mnoznikKlienta = (m) => (m.statusVat === 'czynny' && m.podstawaCeny === 'netto' ? 1 + m.stawkaVatProc / PROCENT : 1)

/** @param {MigawkaWyniku} m @param {number | null} cenaReczna @returns {CenaPodsumowania} */
function cenaKlienta(m, cenaReczna) {
  const statusVat = m.statusVat
  sprawdzStatusVat(statusVat)
  const cena = cenaReczna === null ? { brutto: m.cena, netto: m.netto, vat: m.vat } : zCenyRecznej(cenaReczna, statusVat, m.stawkaVatProc)
  const dojazd = Math.round(m.dojazd.kwota * mnoznikKlienta(m))
  return { ...cena, czyReczna: cenaReczna !== null, statusVat, stawkaVatProc: m.stawkaVatProc,
    rozbicie: dojazd > 0 ? { uslugi: Math.max(0, cena.brutto - dojazd), dojazd } : null }
}

/** @param {MigawkaWyniku} m @param {number} brutto @returns {RynekPodsumowania} */
function rynek(m, brutto) {
  const mnoznik = mnoznikKlienta(m)
  const od = Math.round(m.widelki.od * mnoznik)
  const doKwoty = Math.round(m.widelki.do * mnoznik)
  const polozenie = brutto < od ? 'ponizej' : brutto > doKwoty ? 'powyzej' : 'w'
  return { mediana: m.mediana, od, do: doKwoty, pelne: m.widelki.pelne, procent: m.mediana > 0 ? brutto / m.mediana - 1 : 0, polozenie }
}

/** @param {MigawkaWyniku} m @param {CenaPodsumowania} cena @param {KosztZlecenia} koszt @param {KosztyFirmy} koszty @returns {WierszKosztu[]} */
function wierszeKosztow(m, cena, koszt, koszty) {
  const czySzacunekGodzinowy = m.linie.every((l) => l.rodzaj === 'praca')
  /** @type {WierszKosztu[]} */
  const sprzet = koszt.sprzet.length === 0 ? [{ rodzaj: 'sprzet', kwota: 0, nazwa: null }]
    : koszt.sprzet.map((s) => ({ rodzaj: 'sprzet', kwota: s.kwota, nazwa: s.nazwa }))
  const { km } = koszt.dojazdFirmy
  return [
    { rodzaj: 'cena', kwota: cena.brutto },
    ...(cena.statusVat === 'czynny' ? [{ rodzaj: /** @type {const} */ ('vat'), kwota: cena.vat, stawkaVatProc: cena.stawkaVatProc }] : []),
    { rodzaj: 'chemia', kwota: koszt.chemia, chemiaH: czySzacunekGodzinowy ? koszty.chemia_h.wartosc : null },
    ...(km > 0 ? [{ rodzaj: /** @type {const} */ ('dojazd'), kwota: koszt.dojazdFirmy.kwota, kmRazem: infoDojazdu(km, koszty.dojazd).kmRazem,
      stawka: koszty.dojazd.koszt_firmy_zl_km }] : []),
    ...sprzet,
    { rodzaj: 'zostaje', kwota: koszt.zostaje },
  ]
}

/** @param {MigawkaWyniku} m @param {CenaPodsumowania} cena @param {KosztZlecenia} koszt @returns {AbonamentPodsumowania | null} */
function abonament(m, cena, koszt) {
  const wizyt = m.wizytWMiesiacu
  if (wizyt === null || wizyt <= WIZYT_ZLECENIA_JEDNORAZOWEGO) return null
  return { wizyt, zaWizyte: cena.brutto, miesiecznie: cena.brutto * wizyt, zostajeMiesiecznie: koszt.zostaje * wizyt }
}

/** @param {Wycena} w @param {MigawkaWyniku} m @param {number} brutto @param {Katalog} katalog @returns {Ostrzezenie[]} */
function ostrzezenia(w, m, brutto, katalog) {
  /** @type {Ostrzezenie[]} */
  const lista = []
  if (KLUCZE_WERSJI.some((k) => m.wersjaDanych[k] !== katalog.wersjaDanych[k])) lista.push({ rodzaj: 'nowe_dane' })
  if (w.szybka && (brutto < w.szybka.od || brutto > w.szybka.do)) lista.push({ rodzaj: 'poza_szybka', od: w.szybka.od, do: w.szybka.do })
  if (w.oferta.nieaktualna) lista.push({ rodzaj: 'oferta_nieaktualna' })
  return lista
}

/**
 * Wszystko, co pokazuje podsumowanie wyceny. Koszt z kosztZlecenia z kosztami firmy z ustawien i tempem firmy (reczne, z zlecen
 * albo domyslne); czynny podatnik ma „zostaje” od netto. Wycena bez migawki wyniku daje BladWyceny `brak_wyniku`.
 * @param {Wycena} w @param {DaneAplikacji} kontekst
 * @returns {Podsumowanie}
 */
export function widokPodsumowania(w, kontekst) {
  const m = w.wynik
  if (m === null) throw new BladWyceny('brak_wyniku', `Wycena ${w.id} nie ma policzonej ceny`)
  const { katalog, domyslne, magazyn } = kontekst
  const stan = wczytajStan(magazyn)
  const cena = cenaKlienta(m, w.cenaReczna)
  const tempo = tempoDoWyceny(stan.ustawienia, stan.wyceny, w.wejscie.uslugaId, domyslne)
  const koszty = scalKoszty(katalog.kosztyFirmy, stan.ustawienia)
  const koszt = kosztZlecenia({ wynik: wynikZMigawki(m), cenaKlienta: cena, tempo: tempo.wartosc, koszty, statusVat: cena.statusVat }, katalog)
  return {
    cena,
    rynek: rynek(m, cena.brutto),
    zostaje: { kwota: koszt.zostaje, naGodzine: koszt.zostajeNaGodzine, minutyWlasne: koszt.minutyWlasne, tempo: tempo.wartosc,
      zrodloTempa: tempo.zrodlo },
    koszty: wierszeKosztow(m, cena, koszt, koszty),
    abonament: abonament(m, cena, koszt),
    propozycje: m.propozycje.length === 0 ? null
      : { opisy: m.propozycje.map((p) => p.opis), kwota: m.propozycje.reduce((suma, p) => suma + p.kwota, 0) },
    ostrzezenia: ostrzezenia(w, m, cena.brutto, katalog),
  }
}

/** @param {Wycena | null} w @param {string} id @returns {asserts w is Wycena & { wynik: MigawkaWyniku }} */
function sprawdzDoZmiany(w, id) {
  if (!w) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
  if (w.status === 'wykonana') throw new BladWyceny('tylko_odczyt', `Wycena ${w.numer ?? id} jest wykonana`)
  if (w.wynik === null) throw new BladWyceny('brak_wyniku', `Wycena ${id} nie ma policzonej ceny`)
}

/**
 * Zapis ceny recznej na swiezym stanie; zmiana kwoty dla klienta po wyslaniu oznacza oferte jako nieaktualna.
 * @param {Magazyn} magazyn @param {string} id @param {number | null} cenaReczna
 * @returns {Wycena}
 */
function zapiszCeneReczna(magazyn, id, cenaReczna) {
  const stan = magazyn.zmien((obecny) => {
    const w = znajdzWycene(obecny, id)
    sprawdzDoZmiany(w, id)
    const czyInnaKwota = (w.cenaReczna ?? w.wynik.cena) !== (cenaReczna ?? w.wynik.cena)
    const zmieniona = { ...w, cenaReczna, oferta: czyInnaKwota ? nieaktualnaPoWyslaniu(w) : w.oferta, zmieniona: new Date().toISOString() }
    return { ...obecny, wyceny: obecny.wyceny.map((x) => (x.id === id ? zmieniona : x)) }
  })
  const zapisana = znajdzWycene(stan, id)
  if (!zapisana) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
  return zapisana
}

/**
 * Reczna cena dla klienta (R7): kwota placona przez klienta, zaokraglona do zlotych, w GRANICE_CENY_RECZNEJ.
 * @param {DaneAplikacji} kontekst @param {string} id @param {number} brutto
 * @returns {Wycena} wycena po zapisie
 */
export function ustawCeneReczna(kontekst, id, brutto) {
  const kwota = Number.isFinite(brutto) ? Math.round(brutto) : Number.NaN
  if (!(kwota >= GRANICE_CENY_RECZNEJ.min && kwota <= GRANICE_CENY_RECZNEJ.max)) {
    throw new BladWejscia('cena_reczna', `Cena ręczna musi być w przedziale [${GRANICE_CENY_RECZNEJ.min}, ${GRANICE_CENY_RECZNEJ.max}] zł, jest ${brutto}`)
  }
  return zapiszCeneReczna(kontekst.magazyn, id, kwota)
}

/** @param {DaneAplikacji} kontekst @param {string} id @returns {Wycena} wycena z cena z modelu */
export const przywrocCeneModelu = (kontekst, id) => zapiszCeneReczna(kontekst.magazyn, id, null)

/**
 * „Przelicz”: nowa migawka z biezacymi danymi i ustawieniami; stara i nowa cena z modelu do komunikatu.
 * @param {DaneAplikacji} kontekst @param {string} id
 * @returns {{ stara: number, nowa: number, wycena: Wycena }}
 */
export function przeliczWycene(kontekst, id) {
  const obecna = znajdzWycene(wczytajStan(kontekst.magazyn), id)
  sprawdzDoZmiany(obecna, id)
  const wynik = przelicz(obecna, kontekst)
  const zapisana = znajdzWycene(zapiszWynik(kontekst.magazyn, id, wynik), id)
  if (!zapisana) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
  return { stara: obecna.wynik.cena, nowa: wynik.cena, wycena: zapisana }
}

/**
 * Akcje zapisanej wyceny wg statusu: decyzja klienta przy wycenie do wyslania i wyslanej, wykonana — tylko usuniecie.
 * @param {StatusWyceny} status
 * @returns {AkcjaWyceny[]}
 */
export function akcjeWyceny(status) {
  if (status === 'wykonana') return ['usun']
  return STATUSY_DECYZJI_KLIENTA.has(status) ? ['przyjeta', 'odrzucona', 'edytuj', 'usun'] : ['edytuj', 'usun']
}
