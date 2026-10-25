// Stan kreatora dokladnej wyceny (R25, R29): szkic zapisywany na biezaco, przeliczenie migawki silnikiem (R5) i reguly krokow.
// Logika bez DOM; zapisy ida przez src/dane/wyceny.js, ceny przez src/silnik/. Widoki kreatora (src/widoki/kreator-*.js) tylko rysuja.

import { wczytajStan } from '../dane/magazyn.js'
import { scalKoszty, ustawieniaDomyslne } from '../dane/ustawienia.js'
import { BladWyceny, utworzSzkic, wycena as znajdzWycene, zapiszWejscie } from '../dane/wyceny.js'
import { BladWejscia } from '../silnik/bledy.js'
import { wycenUsluge } from '../silnik/cena.js'
import { zBrudem } from '../silnik/czas.js'
import { cenaDlaKlienta } from '../silnik/vat.js'
import { widelkiRynku } from '../silnik/widelki.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/magazyn.js').Ustawienia} Ustawienia */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../dane/wyceny.js').MigawkaWyniku} MigawkaWyniku */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/czas.js').BrudPomieszczenia} BrudPomieszczenia */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/**
 * @typedef {typeof KROKI_KREATORA[number]['id']} KrokKreatora
 * @typedef {{ uslugaId: string, wariantId?: string | null, wojewodztwoId: string | null }} WyborUslugi pierwszy krok kreatora
 * @typedef {'pusty_zakres' | 'brak_wariantu'} BladKroku
 */

/** Kroki kreatora dokladnej wyceny; zrodlo stalej dla widokow kreatora i paska postepu. */
export const KROKI_KREATORA = Object.freeze(/** @type {const} */ ([
  { id: 'usluga', etykieta: 'Usługa' },
  { id: 'zakres', etykieta: 'Zakres' },
  { id: 'dodatki', etykieta: 'Dodatki' },
  { id: 'chemia', etykieta: 'Chemia' },
  { id: 'cena', etykieta: 'Cena' },
]))
/** Kurz na poziomie 1 jest w normie (0 min/m²), wiec nowe pomieszczenie ma go od razu, bez doplaty czasu. */
const BRUD_NOWEGO_POMIESZCZENIA = Object.freeze({ id: 'kurz', poziom: 1 })
const JEDNOSTKA_M2 = 'm2'

/** Usluga m² z progami (posadzki, doczyszczanie, kostka, elewacja, hale): jedna powierzchnia i przelaczniki pozycji. @param {Usluga} usluga */
export const czyPozycjeZPowierzchnia = (usluga) => usluga.progi !== undefined && (usluga.pozycje ?? []).some((p) => p.jednostka === JEDNOSTKA_M2)
/** Pozycje glowne uslugi (bez doplat `typ: 'doplata'`). @param {Usluga} usluga */
export const pozycjeGlowne = (usluga) => (usluga.pozycje ?? []).filter((p) => p.typ !== 'doplata')

/**
 * Wybor z pierwszego kroku: usluga do wyceny (nie tylko dodatek), wariant biura z `warianty` (domyslnie pierwszy), znane wojewodztwo.
 * @param {WyborUslugi} wybor @param {Katalog} katalog
 * @returns {{ usluga: Usluga, wariantId: string | null, wojewodztwoId: string | null }}
 */
function sprawdzWybor(wybor, katalog) {
  const usluga = katalog.usluga(wybor.uslugaId)
  if (usluga.tylko_dodatek) throw new BladWejscia('tylko_dodatek', `Usługa ${usluga.id} jest tylko dodatkiem`)
  const wojewodztwoId = katalog.wojewodztwo(wybor.wojewodztwoId).id
  const warianty = usluga.warianty ?? []
  if (warianty.length === 0) return { usluga, wariantId: null, wojewodztwoId }
  const wariant = (wybor.wariantId ?? null) === null ? warianty[0] : warianty.find((w) => w.id === wybor.wariantId)
  if (!wariant) throw new BladWejscia('nieznany_wariant', `Nieznany wariant ${wybor.wariantId} usługi ${usluga.id}`)
  return { usluga, wariantId: wariant.id, wojewodztwoId }
}

/**
 * Wejscie startowe: pomieszczenia puste; pozycje z iloscia 0 (uslugi m² z progami: tylko pierwsza pozycja glowna, wlaczona); dojazd 0.
 * @param {WyborUslugi} wybor @param {Katalog} katalog
 * @returns {WejscieWyceny}
 */
function wejscieStartowe(wybor, katalog) {
  const { usluga, wariantId, wojewodztwoId } = sprawdzWybor(wybor, katalog)
  const wspolne = { uslugaId: usluga.id, wojewodztwoId, wariantId, dodatki: [], dojazdKm: 0 }
  if (usluga.tryb === 'pomieszczenia') return { ...wspolne, pomieszczenia: [] }
  const pozycje = czyPozycjeZPowierzchnia(usluga) ? pozycjeGlowne(usluga).slice(0, 1) : usluga.pozycje ?? []
  return { ...wspolne, pozycje: pozycje.map((p) => ({ id: p.id, ilosc: 0 })) }
}

/** @param {WejscieWyceny} wejscie */
const czyPustyZakres = (wejscie) => (wejscie.pomieszczenia ?? []).length === 0 && !(wejscie.pozycje ?? []).some((p) => p.ilosc > 0)

/**
 * Brud nowego pomieszczenia: kurz poziom 1 i reguly `brud_domyslny` uslugi pasujace do typu (np. pyl budowlany 2 po remoncie).
 * @param {Katalog} katalog @param {string} uslugaId @param {string} typ
 * @returns {BrudPomieszczenia[]}
 */
export function brudNowegoPomieszczenia(katalog, uslugaId, typ) {
  const usluga = katalog.usluga(uslugaId)
  katalog.normaPomieszczenia(typ)
  const [pomieszczenie] = zBrudem([{ typ, m2: 1, brud: [{ ...BRUD_NOWEGO_POMIESZCZENIA }] }], usluga.brud_domyslny)
  return pomieszczenie?.brud ?? []
}

/**
 * Nowa dokladna wycena w statusie `szkic` z wejsciem startowym wybranej uslugi (bez wyniku: zakres jest pusty).
 * @param {DaneAplikacji} kontekst @param {WyborUslugi} wybor
 * @returns {Wycena}
 */
export function nowySzkic(kontekst, wybor) {
  return utworzSzkic(kontekst.magazyn, { rodzaj: 'dokladna', wejscie: wejscieStartowe(wybor, kontekst.katalog) })
}

/**
 * Migawka wyniku z biezacymi danymi i ustawieniami firmy (null = domyslne).
 * @param {WejscieWyceny} wejscie @param {DaneAplikacji} kontekst @param {Ustawienia | null} zapisane
 * @returns {MigawkaWyniku}
 */
function migawkaWyniku(wejscie, kontekst, zapisane) {
  const { katalog, domyslne } = kontekst
  const ustawienia = zapisane ?? ustawieniaDomyslne(domyslne)
  const wynik = wycenUsluge(wejscie, katalog, { stawkiDojazdu: scalKoszty(katalog.kosztyFirmy, ustawienia).dojazd })
  const stawkaVatProc = domyslne.stawka_vat_proc
  const cena = cenaDlaKlienta({ kwota: wynik.cena, podstawaCeny: wynik.podstawaCeny, statusVat: ustawienia.statusVat, stawkaVatProc })
  const { id, nazwa, stawka_h, wsp } = katalog.wojewodztwo(wejscie.wojewodztwoId ?? null)
  return {
    cena: cena.brutto, netto: cena.netto, vat: cena.vat, mediana: cena.brutto, widelki: widelkiRynku(wynik, wejscie, katalog),
    minutyNormowe: wynik.minutyNormowe, linie: wynik.linie, propozycje: wynik.propozycje, dojazd: wynik.dojazd,
    wojewodztwo: { id, nazwa, stawka_h, wsp }, statusVat: ustawienia.statusVat, stawkaVatProc, podstawaCeny: wynik.podstawaCeny,
    wizytWMiesiacu: wynik.wizytWMiesiacu, wersjaDanych: { ...katalog.wersjaDanych }, minimum: wynik.minimum, czyMinimum: wynik.czyMinimum,
  }
}

/**
 * Migawka wyniku z biezacymi danymi: cena silnika, widelki rynku i cena dla klienta wg statusu VAT firmy i podstawy ceny uslugi.
 * Mediana to cena modelu dla klienta (R5: cena proponowana = mediana wojewodztwa z modelu). Koszt zlecenia liczy podsumowanie.
 * @param {Pick<Wycena, 'wejscie'>} wycena @param {DaneAplikacji} kontekst
 * @returns {MigawkaWyniku}
 */
export const przelicz = (wycena, kontekst) => migawkaWyniku(wycena.wejscie, kontekst, wczytajStan(kontekst.magazyn).ustawienia)

/**
 * Bledy blokujace „Dalej” w kroku: zakres wymaga co najmniej jednego pomieszczenia albo pozycji z iloscia > 0.
 * @param {KrokKreatora} krok @param {Pick<Wycena, 'wejscie'>} wycena @param {Katalog} katalog
 * @returns {BladKroku[]}
 */
export function bledyKroku(krok, wycena, katalog) {
  if (!KROKI_KREATORA.some((k) => k.id === krok)) throw new BladWejscia('nieznany_krok', `Nieznany krok kreatora ${krok}`)
  const usluga = katalog.usluga(wycena.wejscie.uslugaId)
  if (krok === 'usluga') return (usluga.warianty ?? []).length > 0 && !wycena.wejscie.wariantId ? ['brak_wariantu'] : []
  if (krok === 'zakres') return czyPustyZakres(wycena.wejscie) ? ['pusty_zakres'] : []
  return []
}

/**
 * Zmiana wejscia szkicu albo zapisanej wyceny: `fn` dostaje swieze wejscie, wynik zapisuje sie razem z przeliczeniem w jednym
 * zapisie magazynu (jeden zapis i dwa odczyty stanu na zmiane: wczytajStan tutaj i magazyn.zmien w zapiszWejscie). Pusty zakres
 * czysci migawke szkicu (silnik nie wycenia pustego zakresu), a wycena z numerem go odmawia (BladWyceny `pusty_zakres`).
 * Wszystko synchronicznie, bez await miedzy odczytem a zapisem.
 * @param {DaneAplikacji} kontekst @param {string} id @param {(wejscie: WejscieWyceny) => WejscieWyceny} fn
 * @returns {Wycena} wycena po zapisie
 */
export function zmienWejscie(kontekst, id, fn) {
  const { magazyn, katalog } = kontekst
  const stan = wczytajStan(magazyn)
  const obecna = znajdzWycene(stan, id)
  if (!obecna) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
  if (obecna.status === 'wykonana') throw new BladWyceny('tylko_odczyt', `Wycena ${obecna.numer ?? id} jest wykonana`)
  const wejscie = fn(obecna.wejscie)
  katalog.usluga(wejscie.uslugaId)
  const wynik = czyPustyZakres(wejscie) ? null : migawkaWyniku(wejscie, kontekst, stan.ustawienia)
  const zapisana = znajdzWycene(zapiszWejscie(magazyn, id, wejscie, { wynik }), id)
  if (!zapisana) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
  return zapisana
}

/**
 * Dodatki, ktore zostaja po zmianie uslugi: tylko z uslug z listy `dodatki` nowej uslugi (krok dodatkow pokazuje tylko te).
 * @param {WejscieWyceny} wejscie @param {Usluga} nowaUsluga
 */
const dodatkiNowejUslugi = (wejscie, nowaUsluga) => (wejscie.dodatki ?? []).filter((d) => (nowaUsluga.dodatki ?? []).includes(d.uslugaId))

/**
 * Czy zmiana uslugi wyczysci wpisany zakres albo dodatki spoza listy nowej uslugi (wtedy widok pyta o potwierdzenie).
 * @param {Pick<Wycena, 'wejscie'>} wycena @param {string} uslugaId @param {Katalog} katalog
 */
export function czyZmianaCzysciZakres(wycena, uslugaId, katalog) {
  const { wejscie } = wycena
  if (wejscie.uslugaId === uslugaId) return false
  if (!czyPustyZakres(wejscie)) return true
  return dodatkiNowejUslugi(wejscie, katalog.usluga(uslugaId)).length !== (wejscie.dodatki ?? []).length
}

/**
 * Nowy wybor z pierwszego kroku w istniejacej wycenie: inna usluga czysci pomieszczenia, pozycje i dodatki spoza swojej listy
 * `dodatki` (dojazd zostaje), ta sama zmienia tylko wariant i wojewodztwo.
 * @param {DaneAplikacji} kontekst @param {string} id @param {WyborUslugi} wybor
 * @returns {Wycena}
 */
export function zmienWybor(kontekst, id, wybor) {
  const { usluga, wariantId, wojewodztwoId } = sprawdzWybor(wybor, kontekst.katalog)
  return zmienWejscie(kontekst, id, (wejscie) => {
    if (wejscie.uslugaId === wybor.uslugaId) return { ...wejscie, wariantId, wojewodztwoId }
    return { ...wejscieStartowe(wybor, kontekst.katalog), dodatki: dodatkiNowejUslugi(wejscie, usluga), dojazdKm: wejscie.dojazdKm ?? 0 }
  })
}

