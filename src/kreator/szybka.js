// Szybka wycena przez telefon (R10–R14, R5) dla ekranu `#/szybka`: kontekst silnika z ustawien firmy, uslugi i pola formularza,
// wynik ze stanem pustym i bledu, zapis rekordu szybkiej wyceny, oznaczenie jako wyslanej po skopiowaniu tekstu i zamiana
// w dokladna wycene (zSzybkiej). Rekord ma w `wejscie` wejscie dolnej granicy z naDokladna (pomieszczenia ukladu albo pozycje),
// wiec podsumowanie, lista i oferta czytaja go jak kazda wycene; formularz odtwarza z niego wejscieZWyceny. Bez DOM.

import { wczytajStan } from '../dane/magazyn.js'
import { scalKoszty, ustawieniaDomyslne } from '../dane/ustawienia.js'
import { BladWyceny, utworzSzkic, wycena as znajdzWycene, zmienStatus } from '../dane/wyceny.js'
import { BladKatalogu, BladWejscia } from '../silnik/bledy.js'
import { ZESTAW_BIURA } from '../silnik/czas.js'
import { poziomGornejGranicy, regulyBrudu, zastosujOdpowiedzi } from '../silnik/pytania.js'
import { naDokladna, STAN_DOMYSLNY_SZYBKIEJ, STANY_SZYBKIEJ, szybkaWycena } from '../silnik/szybka.js'
import { tempoDoWyceny } from '../silnik/tempo.js'
import { domyslneLazienki } from '../silnik/uklad.js'
import { METRAZ_WZORCOWY } from './podpowiedzi.js'
import { dodajPomieszczenie, opisPrzeniesienia, zmienNazwe } from './pomieszczenia.js'
import { pozycjeGlowne, zapiszZmianyWyceny } from './stan.js'

/** @typedef {import('../ui/router.js').DaneAplikacji} DaneAplikacji */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/pytania.js').Pytania} Pytania */
/** @typedef {import('../silnik/szybka.js').WejscieSzybkiej} WejscieSzybkiej */
/** @typedef {import('../silnik/szybka.js').KontekstSzybkiej} KontekstSzybkiej */
/** @typedef {import('../silnik/szybka.js').WynikSzybkiej} WynikSzybkiej */
/** @typedef {import('../silnik/szybka.js').StanSzybkiej} StanSzybkiej */
/**
 * @typedef {WejscieSzybkiej & { m2: number, stan: StanSzybkiej, pozycje: { id: string, ilosc: number }[],
 *   dodatki: import('../silnik/cena.js').DodatekWyceny[], odpowiedzi: Record<string, unknown>,
 *   brud: import('../silnik/katalog.js').RegulaBrudu[], poziomGorny: number | null }} FormularzSzybkiej
 *   wejscie formularza: zawsze z metrazem, stanem, brudem i poziomem gornej granicy z odpowiedzi (pola niewidoczne dla uslugi
 *   silnik pomija)
 * @typedef {'mieszkanie' | 'biuro' | 'pozycje' | 'ogledziny_pomieszczen' | 'ogledziny_pozycji'} PolaSzybkiej pola formularza uslugi
 * @typedef {{ wartosc: string, etykieta: string, uslugi: string[] }} OpcjaUslugi opcja arkusza „Usługa” (mieszkania jako jedna)
 * @typedef {{ stan: 'wynik', wynik: WynikSzybkiej, wojewodztwo: { id: string | null, nazwa: string } } | { stan: 'pusty' }
 *   | { stan: 'blad', kod: 'metraz' | 'liczenie', blad: unknown }} StanWyniku
 */

/** Rodzaje sprzatania mieszkania (chipy „Rodzaj sprzątania”); usluga pierwszego jest domyslna na ekranie. */
export const RODZAJE_MIESZKANIA = Object.freeze([
  { wartosc: 'mieszkanie_standard', etykieta: 'Standard' },
  { wartosc: 'mieszkanie_gruntowne', etykieta: 'Gruntowne' },
  { wartosc: 'mieszkanie_po_wynajmie', etykieta: 'Po wynajmie' },
])
const OPCJA_MIESZKANIA = 'mieszkanie'
const NAZWA_OPCJI_MIESZKANIA = 'Mieszkanie lub dom'
const USLUGA_DODATKOW = 'agd'
const CYFRY_METRAZU = 100

/** @param {string} uslugaId */
const czyMieszkanie = (uslugaId) => RODZAJE_MIESZKANIA.some((r) => r.wartosc === uslugaId)
/** @param {unknown} stan @returns {stan is StanSzybkiej} */
const jestStanem = (stan) => STANY_SZYBKIEJ.some((s) => s.id === stan)

/**
 * Opcje arkusza „Usługa”: uslugi z polem `szybka_wycena` w kolejnosci danych, trzy mieszkaniowe zebrane jako „Mieszkanie lub dom”.
 * @param {Katalog} katalog @returns {OpcjaUslugi[]}
 */
export function opcjeUslug(katalog) {
  const zSzybka = katalog.uslugi.filter((u) => !u.tylko_dodatek && u.szybka_wycena !== undefined)
  const mieszkania = zSzybka.filter((u) => czyMieszkanie(u.id)).map((u) => u.id)
  /** @type {OpcjaUslugi[]} */
  const opcje = []
  for (const u of zSzybka) {
    if (!czyMieszkanie(u.id)) opcje.push({ wartosc: u.id, etykieta: u.nazwa, uslugi: [u.id] })
    else if (u.id === mieszkania[0]) opcje.push({ wartosc: OPCJA_MIESZKANIA, etykieta: NAZWA_OPCJI_MIESZKANIA, uslugi: mieszkania })
  }
  return opcje
}

/** @param {Usluga} usluga @returns {PolaSzybkiej} */
export function polaUslugi(usluga) {
  const czyOgledziny = usluga.szybka_wycena === 'ogledziny'
  if (usluga.tryb === 'pozycje') return czyOgledziny ? 'ogledziny_pozycji' : 'pozycje'
  if (czyOgledziny) return 'ogledziny_pomieszczen'
  return usluga.zestaw_pomieszczen === ZESTAW_BIURA ? 'biuro' : 'mieszkanie'
}

/**
 * Wejscie formularza po wyborze uslugi: metraz, stan i odpowiedzi zostaja; pozycje od zera (tylko uslugi z licznikami pozycji),
 * dodatki AGD tylko przy mieszkaniu. Brud i poziom gornej granicy z odpowiedzi znikaja, bo zaleza od pytan uslugi
 * (zBrudemOdpowiedzi liczy je od nowa).
 * @param {FormularzSzybkiej} wejscie @param {string} uslugaId @param {Katalog} katalog @returns {FormularzSzybkiej}
 */
export function zUsluga(wejscie, uslugaId, katalog) {
  const usluga = katalog.usluga(uslugaId)
  const pola = polaUslugi(usluga)
  const pozycje = pola === 'pozycje' ? pozycjeGlowne(usluga).map((p) => ({ id: p.id, ilosc: 0 })) : []
  return { ...wejscie, uslugaId, pozycje, dodatki: pola === 'mieszkanie' ? wejscie.dodatki : [], brud: [], poziomGorny: null }
}

/**
 * Formularz na start: mieszkanie standardowe 50 m², domyslna liczba lazienek, kuchnia osobna, stan typowy, wojewodztwo z ustawien.
 * @param {Katalog} katalog @param {string | null} wojewodztwoId @returns {FormularzSzybkiej}
 */
export function formularzDomyslny(katalog, wojewodztwoId) {
  const [{ wartosc: uslugaId }] = RODZAJE_MIESZKANIA
  return {
    uslugaId, m2: METRAZ_WZORCOWY, lazienki: domyslneLazienki(METRAZ_WZORCOWY, katalog.uklady), kuchnia: 'osobna', stan: STAN_DOMYSLNY_SZYBKIEJ,
    pozycje: [], dodatki: [], dojazdKm: 0, wojewodztwoId: katalog.wojewodztwo(wojewodztwoId).id, odpowiedzi: {}, brud: [], poziomGorny: null,
  }
}

/**
 * Nowy metraz; liczba lazienek idzie za metrazem (domyslneLazienki), dopoki firma nie zmienila jej licznikiem.
 * @param {FormularzSzybkiej} wejscie @param {number} m2 @param {Katalog} katalog @param {boolean} czyLazienkiReczne
 * @returns {FormularzSzybkiej}
 */
export function zMetrazem(wejscie, m2, katalog, czyLazienkiReczne) {
  if (czyLazienkiReczne || !(m2 > 0)) return { ...wejscie, m2 }
  return { ...wejscie, m2, lazienki: domyslneLazienki(m2, katalog.uklady) }
}

/**
 * Kontekst silnika szybkiej wyceny z ustawien firmy (status VAT, koszty i stawki dojazdu, tempo do wyceny) i data/domyslne.json.
 * @param {DaneAplikacji} kontekst @param {string} uslugaId usluga do tempa z zlecen
 * @returns {KontekstSzybkiej}
 */
export function kontekstSzybkiej(kontekst, uslugaId) {
  const { katalog, domyslne, magazyn } = kontekst
  const stan = wczytajStan(magazyn)
  const ustawienia = stan.ustawienia ?? ustawieniaDomyslne(domyslne)
  return {
    katalog, statusVat: ustawienia.statusVat, stawkaVatProc: domyslne.stawka_vat_proc,
    tempo: tempoDoWyceny(stan.ustawienia, stan.wyceny, uslugaId, domyslne).wartosc, koszty: scalKoszty(katalog.kosztyFirmy, stan.ustawienia),
    zastrzezenie: domyslne.szybka_wycena.zastrzezenie,
  }
}

/**
 * Wynik formularza do pokazania: widelki (z wojewodztwem do mediany), pusty zakres (brak pozycji) albo blad (za maly metraz
 * na uklad mieszkania; inne bledy danych jako `liczenie` z bledem do zgloszenia).
 * @param {DaneAplikacji} kontekst @param {FormularzSzybkiej} wejscie
 * @returns {StanWyniku}
 */
export function wynikFormularza(kontekst, wejscie) {
  try {
    const wynik = szybkaWycena(wejscie, kontekstSzybkiej(kontekst, wejscie.uslugaId))
    const { id, nazwa } = kontekst.katalog.wojewodztwo(wejscie.wojewodztwoId ?? null)
    return { stan: 'wynik', wynik, wojewodztwo: { id, nazwa } }
  } catch (blad) {
    if (blad instanceof BladKatalogu) return { stan: 'blad', kod: 'liczenie', blad }
    if (!(blad instanceof BladWejscia)) throw blad
    if (blad.kod === 'pusty_zakres') return { stan: 'pusty' }
    return { stan: 'blad', kod: blad.kod === 'metraz' || blad.kod === 'lazienki' ? 'metraz' : 'liczenie', blad }
  }
}

/**
 * Formularz z zapisanej szybkiej wyceny (`?wycena=<id>`): metraz i lazienki z pomieszczen, kuchnia z nazwy aneksu, metraz
 * ogledzin z glownej pozycji (przy licznikach pozycji wzorcowy), stan, brud i poziom gornej granicy z odpowiedzi z widelek;
 * odpowiedzi, dodatki, dojazd i wojewodztwo bez zmian.
 * @param {Wycena} wycena rodzaj `szybka` (inna daje BladWyceny `rodzaj`) @param {Katalog} katalog
 * @returns {FormularzSzybkiej}
 */
export function wejscieZWyceny(wycena, katalog) {
  if (wycena.rodzaj !== 'szybka') throw new BladWyceny('rodzaj', `Wycena ${wycena.id} nie jest szybką wyceną`)
  const { wejscie } = wycena
  const usluga = katalog.usluga(wejscie.uslugaId)
  const pola = polaUslugi(usluga)
  const opis = opisPrzeniesienia(wejscie)
  const pozycje = wejscie.pozycje ?? []
  // liczniki pozycji nie maja metrazu w rekordzie, a licznik metrazu na ekranie nie przyjmuje 0
  const m2 = pola === 'ogledziny_pozycji' ? pozycje[0]?.ilosc ?? 0
    : pola === 'pozycje' ? METRAZ_WZORCOWY : Math.round(opis.m2 * CYFRY_METRAZU) / CYFRY_METRAZU
  const stan = wycena.szybka?.stan
  return {
    uslugaId: usluga.id, m2, lazienki: pola === 'mieszkanie' || pola === 'ogledziny_pomieszczen' ? opis.lazienki : undefined,
    kuchnia: opis.kuchnia === 'aneks' ? 'aneks' : 'osobna', stan: jestStanem(stan) ? stan : STAN_DOMYSLNY_SZYBKIEJ,
    pozycje: pola === 'pozycje' ? pozycje : [], dodatki: wejscie.dodatki ?? [], dojazdKm: wejscie.dojazdKm ?? 0,
    wojewodztwoId: wejscie.wojewodztwoId ?? null, odpowiedzi: { ...wycena.odpowiedzi }, brud: [...(wycena.szybka?.brud ?? [])],
    poziomGorny: wycena.szybka?.poziomGorny ?? null,
  }
}

/**
 * Kuchnia jako aneks: nazwa z dodajPomieszczenie (jedno zrodlo nazwy, po ktorej opisPrzeniesienia rozpoznaje aneks).
 * @param {WejscieWyceny} wejscie @param {Katalog} katalog @returns {WejscieWyceny}
 */
function zNazwaAneksu(wejscie, katalog) {
  const indeks = (wejscie.pomieszczenia ?? []).findIndex((p) => p.typ === 'kuchnia')
  const [aneks] = dodajPomieszczenie({ uslugaId: wejscie.uslugaId, pomieszczenia: [] }, 'kuchnia', katalog, { czyAneks: true }).pomieszczenia ?? []
  return indeks === -1 || !aneks?.nazwa ? wejscie : zmienNazwe(wejscie, indeks, aneks.nazwa)
}

/** @param {FormularzSzybkiej} formularz @param {KontekstSzybkiej} k */
function dokladnaZFormularza(formularz, k) {
  const dokladna = naDokladna(formularz, k)
  const wejscie = formularz.kuchnia === 'aneks' ? zNazwaAneksu(dokladna.wejscie, k.katalog) : dokladna.wejscie
  return { ...dokladna, wejscie }
}

/**
 * Kilometry dojazdu z odpowiedzi klienta (skutek `dojazd_km`); bez takiej odpowiedzi 0.
 * @param {FormularzSzybkiej} formularz @param {Pytania} pytania @param {KontekstSzybkiej} k @returns {number}
 */
export function dojazdZOdpowiedzi(formularz, pytania, k) {
  const { wejscie } = zastosujOdpowiedzi({ uslugaId: formularz.uslugaId, dojazdKm: 0 }, formularz.odpowiedzi, pytania, k.katalog,
    { stawkiDojazdu: k.koszty.dojazd })
  return wejscie.dojazdKm ?? 0
}

/**
 * Formularz z regulami brudu z odpowiedzi klienta wg pytan biezacej uslugi (skutek `brud`, np. sierść przy zwierzetach;
 * szybka wycena naklada je na uklad typowego lokalu) i poziomem gornej granicy widelek pozycji (skutek `gorna_granica`,
 * np. trudne plamy na tapicerce).
 * @param {FormularzSzybkiej} formularz @param {Pytania} pytania @returns {FormularzSzybkiej}
 */
export function zBrudemOdpowiedzi(formularz, pytania) {
  const { uslugaId, odpowiedzi } = formularz
  return { ...formularz, brud: regulyBrudu(uslugaId, odpowiedzi, pytania), poziomGorny: poziomGornejGranicy(uslugaId, odpowiedzi, pytania) }
}

/**
 * Formularz ze wszystkimi skutkami odpowiedzi klienta: kilometry dojazdu i reguly brudu.
 * @param {FormularzSzybkiej} formularz @param {Pytania} pytania @param {KontekstSzybkiej} k @returns {FormularzSzybkiej}
 */
export function zSkutkamiOdpowiedzi(formularz, pytania, k) {
  return { ...zBrudemOdpowiedzi(formularz, pytania), dojazdKm: dojazdZOdpowiedzi(formularz, pytania, k) }
}

/**
 * Zapis szybkiej wyceny: nowy szkic `szybka` (id null) albo zmiana zapisanego rekordu — wejscie dolnej granicy z naDokladna,
 * widelki w `szybka`, odpowiedzi klienta i migawka wyniku w jednym zapisie. Formularz z bledem (np. za maly metraz) daje
 * BladWejscia i nic nie zapisuje.
 * @param {DaneAplikacji} kontekst @param {string | null} id @param {FormularzSzybkiej} formularz
 * @param {{ zmieniona?: string | null }} [opcje] zmieniona: znacznik rekordu widziany na ekranie; inny w magazynie (zmiana
 *   w innej karcie, np. odpowiedzi klienta) daje BladWyceny `nieaktualna` zamiast nadpisania nowszych danych starszymi
 * @returns {Wycena}
 */
export function zapiszSzybka(kontekst, id, formularz, opcje = {}) {
  const { wejscie, szybka, odpowiedzi } = dokladnaZFormularza(formularz, kontekstSzybkiej(kontekst, formularz.uslugaId))
  const docelowe = id ?? utworzSzkic(kontekst.magazyn, { rodzaj: 'szybka', wejscie, szybka, odpowiedzi }).id
  return zapiszZmianyWyceny(kontekst, docelowe, (w) => {
    if (w.rodzaj !== 'szybka') throw new BladWyceny('rodzaj', `Wycena ${w.numer ?? w.id} nie jest szybką wyceną`)
    if (id !== null && opcje.zmieniona && w.zmieniona !== opcje.zmieniona) {
      throw new BladWyceny('nieaktualna', `Wycena ${w.numer ?? w.id} zmieniła się w innej karcie`)
    }
    return { wejscie, szybka, odpowiedzi }
  })
}

/**
 * Tekst szybkiej wyceny trafil do klienta (skopiowany): szkic dostaje numer, status idzie do `wyslana`; przyjeta, odrzucona
 * i juz wyslana zostaja w swoim statusie.
 * @param {DaneAplikacji} kontekst @param {string} id
 * @returns {Wycena}
 */
export function oznaczWyslana(kontekst, id) {
  const { magazyn } = kontekst
  /** @returns {Wycena} */
  const biezaca = () => {
    const w = znajdzWycene(wczytajStan(magazyn), id)
    if (!w) throw new BladWyceny('brak_wyceny', `Nie ma wyceny ${id}`)
    return w
  }
  if (biezaca().status === 'szkic') zmienStatus(magazyn, id, 'do_wyslania')
  if (biezaca().status === 'do_wyslania') zmienStatus(magazyn, id, 'wyslana')
  return biezaca()
}

/**
 * Zamiana szybkiej wyceny w dokladna (R14): ten sam id, numer i status, rodzaj `dokladna`, wejscie z naDokladna (pomieszczenia
 * ukladu albo pozycje, aneks z nazwa) ze skutkami odpowiedzi klienta (brud, dojazd) i widelki w `szybka` do ostrzezenia
 * w podsumowaniu. Liczy na swiezym rekordzie z magazynu; rekord innego rodzaju daje BladWyceny `rodzaj`.
 * @param {DaneAplikacji} kontekst @param {Pick<Wycena, 'id'>} wycenaSzybka @param {Pytania} pytania
 * @returns {Wycena}
 */
export function zSzybkiej(kontekst, wycenaSzybka, pytania) {
  const { katalog } = kontekst
  return zapiszZmianyWyceny(kontekst, wycenaSzybka.id, (w) => {
    const formularz = wejscieZWyceny(w, katalog)
    const k = kontekstSzybkiej(kontekst, formularz.uslugaId)
    const dokladna = dokladnaZFormularza(formularz, k)
    const { wejscie } = zastosujOdpowiedzi(dokladna.wejscie, dokladna.odpowiedzi, pytania, katalog, { stawkiDojazdu: k.koszty.dojazd })
    return { rodzaj: 'dokladna', wejscie, szybka: dokladna.szybka, odpowiedzi: dokladna.odpowiedzi }
  })
}
