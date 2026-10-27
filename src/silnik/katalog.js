// Katalog danych referencyjnych: data/ceny.json, data/normy.json i data/rynek.json z indeksami dla silnika wyceny.
// Kontrole spojnosci sa te same co w scripts/kalibracja.ps1 (norma czasu kazdej pozycji, przygotowanie uslug z pozycjami).

import { BladKatalogu, BladWejscia } from './bledy.js'

const PLIKI = { ceny: 'data/ceny.json', normy: 'data/normy.json', rynek: 'data/rynek.json' }
const NAZWA_SREDNIEJ_KRAJOWEJ = 'średnia krajowa'
const WSP_KRAJOWY = 1
const MNOZNIK_PROGU_DOMYSLNY = 1
/** Pole `szybka_wycena` uslugi w data/ceny.json: widelki ze stanu albo „orientacyjnie od” po ogledzinach; zrodlo stalej dla szybkiej wyceny. */
export const RODZAJE_SZYBKIEJ = Object.freeze(/** @type {const} */ (['widelki', 'ogledziny']))

/**
 * @typedef {{ pomieszczenie: string, brud: string, poziom: number }} RegulaBrudu
 * @typedef {typeof RODZAJE_SZYBKIEJ[number]} RodzajSzybkiej bez pola usluga wchodzi do szybkiej wyceny tylko jako dodatek
 * @typedef {{ id: string, nazwa: string, wizyt_w_miesiacu: number, mnoznik_zakresu: number }} Wariant
 * @typedef {{ id: string, nazwa: string, jednostka: string, cena: number, zakres: number[] | null, typ?: 'doplata',
 *   sprzet?: string, koszt_chemii_m2?: number, koszt_chemii_szt?: number, doliczaj_material?: boolean }} Pozycja
 * @typedef {{ id: string, nazwa: string, grupa: string, tryb: 'pomieszczenia' | 'pozycje', podstawa_ceny: string,
 *   minimum_zl?: number, zestaw_pomieszczen?: string, mnoznik_zakresu?: number, brud_domyslny?: RegulaBrudu[],
 *   dodatki?: string[], warianty?: Wariant[], pozycje?: Pozycja[], progi?: string, poziomy_brudu?: boolean,
 *   tylko_dodatek?: boolean, rynek_odniesienie?: string, szybka_wycena?: RodzajSzybkiej }} Usluga
 * @typedef {{ od_m2: number, mnoznik: number }} Prog
 * @typedef {{ od: number, do: number | null, mnoznik: number }} ProgMetrazu do: od_m2 nastepnego progu w danych (null przy ostatnim)
 * @typedef {{ poziom: number, nazwa: string, mnoznik: number }} PoziomBrudu
 * @typedef {{ praca?: { stawka_brutto_h: number, narzut_pracodawcy: number, koszt_h: number }, chemia_h: { wartosc: number },
 *   sprzet: Record<string, { nazwa: string, koszt_h: number } | string>,
 *   dojazd: { klient_zl_km: number, zakres_rynkowy?: number[], darmowy_promien_km: number, koszt_firmy_zl_km: number } }} KosztyFirmy
 * @typedef {{ meta: { wersja: string }, uslugi: Usluga[], progi_metrazu: Record<string, { progi: Prog[] }>,
 *   poziomy_brudu: { poziomy: PoziomBrudu[] }, koszty_firmy: KosztyFirmy }} Ceny
 * @typedef {{ id: string, nazwa: string, min_m2: number }} NormaPomieszczenia
 * @typedef {{ id: string, nazwa: string, chemia: string, min_m2: number[] }} Brud
 * @typedef {{ poziom: number, nazwa: string, opis: string }} Poziom
 * @typedef {{ min_na_jednostke: number, wydajnosc_m2_h?: number }} NormaPozycji
 * @typedef {{ kuchnia: { udzial: number, min_m2: number, max_m2: number }, aneks: { udzial: number, min_m2: number, max_m2: number },
 *   przedpokoj: { udzial: number }, lazienki: { do_m2: number | null, m2: number[] }[] }} UkladMieszkania
 * @typedef {{ mieszkanie: UkladMieszkania, biuro: { na_m2: number, pomieszczenia: { typ: string, m2: number }[] } }} Uklady
 * @typedef {{ meta: { wersja: string }, przygotowanie_min: number, przygotowanie_min_uslug: Record<string, number>,
 *   zestawy_pomieszczen: Record<string, NormaPomieszczenia[]>, progi_wydajnosci: { biuro: Prog[] }, uklady: Uklady,
 *   brud: Brud[], poziomy: Poziom[], pozycje: Record<string, NormaPozycji> }} Normy
 * @typedef {{ id: string | null, nazwa: string, wsp: number, stawka_h: number }} Wojewodztwo
 * @typedef {{ mediana: number, zakres: number[] }} PunktRynku
 * @typedef {{ meta: { wersja: string }, kraj: { stawka_h: PunktRynku } & Record<string, PunktRynku | undefined>, wojewodztwa: Wojewodztwo[] }} Rynek
 * @typedef {(sciezka: string) => Promise<unknown>} PobierzJson
 * @typedef {{
 *   usluga: (id: string) => Usluga, pozycja: (uslugaId: string, pozycjaId: string) => Pozycja,
 *   wojewodztwo: (id: string | null) => Wojewodztwo, rynekKraj: (klucz: string) => { mediana: number, zakres: [number, number] },
 *   normaPomieszczenia: (typ: string) => number,
 *   normaBrudu: (id: string, poziom: number) => number, zestaw: (id: string) => NormaPomieszczenia[],
 *   progMetrazu: (nazwa: string, m2: number) => number, progDlaMetrazu: (nazwa: string, m2: number) => ProgMetrazu | null, normaPozycji: (klucz: string) => NormaPozycji,
 *   przygotowanie: (uslugaId: string) => number, przygotowanieMin: number, progiWydajnosciBiura: Prog[],
 *   uslugi: Usluga[], wojewodztwa: Wojewodztwo[], brud: Brud[], poziomy: Poziom[], poziomyBrudu: PoziomBrudu[],
 *   kosztyFirmy: KosztyFirmy, uklady: Uklady, wersjaDanych: { ceny: string, normy: string, rynek: string }
 * }} Katalog
 */

/** @param {unknown} x @returns {x is Record<string, unknown>} */
function jestObiektem(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** @param {unknown} x */
function jestTekstem(x) {
  return typeof x === 'string'
}

/** @param {unknown} x */
function jestLiczba(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

/** @param {unknown} x @param {(element: unknown) => boolean} czyElement */
function jestTablica(x, czyElement) {
  return Array.isArray(x) && x.every(czyElement)
}

/** Pole opcjonalne: brak albo poprawna wartosc. @param {unknown} x @param {(wartosc: unknown) => boolean} czyWartosc */
function brakAlbo(x, czyWartosc) {
  return x === undefined || czyWartosc(x)
}

/** @param {unknown} x @param {(wartosc: unknown) => boolean} czyWartosc */
function maWartosci(x, czyWartosc) {
  return jestObiektem(x) && Object.values(x).every(czyWartosc)
}

/** Obiekt z polami liczbowymi. @param {unknown} x @param {string[]} pola */
function maLiczby(x, pola) {
  return jestObiektem(x) && pola.every((pole) => jestLiczba(x[pole]))
}

/** Obiekt z polami tekstowymi. @param {unknown} x @param {string[]} pola */
function maTeksty(x, pola) {
  return jestObiektem(x) && pola.every((pole) => jestTekstem(x[pole]))
}

/** @param {unknown} x */
function maWersje(x) {
  return jestObiektem(x) && maTeksty(x.meta, ['wersja'])
}

/** @param {unknown} x */
function jestProgiem(x) {
  return maLiczby(x, ['od_m2', 'mnoznik'])
}

/** @param {unknown} x */
function jestZakresem(x) {
  return Array.isArray(x) && x.length === 2 && x.every(jestLiczba)
}

/** Pola pozycji czytane przez silnik (cena, zakres, chemia, sprzet). @param {unknown} x */
function jestPozycja(x) {
  return jestObiektem(x) && maTeksty(x, ['id', 'nazwa', 'jednostka']) && jestLiczba(x.cena) &&
    (x.zakres === undefined || x.zakres === null || jestZakresem(x.zakres)) && brakAlbo(x.koszt_chemii_m2, jestLiczba) &&
    brakAlbo(x.koszt_chemii_szt, jestLiczba) && brakAlbo(x.sprzet, jestTekstem)
}

/** Pola uslugi czytane przez silnik (tryb, minimum, mnoznik zakresu, warianty, pozycje, progi, rynek, szybka wycena). @param {unknown} x */
function jestUsluga(x) {
  const czyWariant = (/** @type {unknown} */ w) => maTeksty(w, ['id', 'nazwa']) && maLiczby(w, ['wizyt_w_miesiacu', 'mnoznik_zakresu'])
  const czyRegulaBrudu = (/** @type {unknown} */ r) => maTeksty(r, ['pomieszczenie', 'brud']) && maLiczby(r, ['poziom'])
  return jestObiektem(x) && maTeksty(x, ['id', 'nazwa', 'podstawa_ceny']) && (x.tryb === 'pomieszczenia' || x.tryb === 'pozycje') &&
    brakAlbo(x.minimum_zl, jestLiczba) && brakAlbo(x.mnoznik_zakresu, jestLiczba) && brakAlbo(x.zestaw_pomieszczen, jestTekstem) &&
    brakAlbo(x.progi, jestTekstem) && brakAlbo(x.rynek_odniesienie, jestTekstem) &&
    brakAlbo(x.pozycje, (p) => jestTablica(p, jestPozycja)) && brakAlbo(x.warianty, (w) => jestTablica(w, czyWariant)) &&
    brakAlbo(x.brud_domyslny, (b) => jestTablica(b, czyRegulaBrudu)) && brakAlbo(x.szybka_wycena, (r) => RODZAJE_SZYBKIEJ.some((z) => z === r))
}

/**
 * Tylko pola kosztow firmy czytane przez silnik: chemia na godzine, slownik sprzetu (koszt.js czyta koszty.sprzet[id],
 * a koszt godziny wpisu sprawdza przy uzyciu) i stawki dojazdu. Pol praca i dojazd.zakres_rynkowy silnik nie czyta.
 * @param {unknown} x
 */
function jestKosztamiFirmy(x) {
  return jestObiektem(x) && maLiczby(x.chemia_h, ['wartosc']) && jestObiektem(x.sprzet) &&
    maLiczby(x.dojazd, ['klient_zl_km', 'darmowy_promien_km', 'koszt_firmy_zl_km'])
}

/** @param {unknown} x @returns {x is Ceny} */
function jestCenami(x) {
  return maWersje(x) && jestObiektem(x) && jestTablica(x.uslugi, jestUsluga) &&
    maWartosci(x.progi_metrazu, (p) => jestObiektem(p) && jestTablica(p.progi, jestProgiem)) &&
    jestObiektem(x.poziomy_brudu) && jestTablica(x.poziomy_brudu.poziomy, (p) => maLiczby(p, ['poziom', 'mnoznik'])) &&
    jestKosztamiFirmy(x.koszty_firmy)
}

/** Uklady typowego mieszkania i biura (uklad.js). @param {unknown} x */
function jestUkladami(x) {
  if (!jestObiektem(x) || !jestObiektem(x.mieszkanie) || !jestObiektem(x.biuro)) return false
  const { mieszkanie, biuro } = x
  const czyLazienki = (/** @type {unknown} */ l) => jestObiektem(l) && (l.do_m2 === null || jestLiczba(l.do_m2)) && jestTablica(l.m2, jestLiczba)
  return maLiczby(mieszkanie.kuchnia, ['udzial', 'min_m2', 'max_m2']) && maLiczby(mieszkanie.aneks, ['udzial', 'min_m2', 'max_m2']) &&
    maLiczby(mieszkanie.przedpokoj, ['udzial']) && Array.isArray(mieszkanie.lazienki) && mieszkanie.lazienki.length > 0 &&
    jestTablica(mieszkanie.lazienki, czyLazienki) && jestLiczba(biuro.na_m2) &&
    jestTablica(biuro.pomieszczenia, (p) => maTeksty(p, ['typ']) && maLiczby(p, ['m2']))
}

/** @param {unknown} x @returns {x is Normy} */
function jestNormami(x) {
  const czyNormaPomieszczenia = (/** @type {unknown} */ p) => maTeksty(p, ['id', 'nazwa']) && maLiczby(p, ['min_m2'])
  const czyBrud = (/** @type {unknown} */ b) => jestObiektem(b) && maTeksty(b, ['id', 'nazwa']) && jestTablica(b.min_m2, jestLiczba)
  return maWersje(x) && jestObiektem(x) && jestLiczba(x.przygotowanie_min) && maWartosci(x.przygotowanie_min_uslug, jestLiczba) &&
    maWartosci(x.zestawy_pomieszczen, (z) => jestTablica(z, czyNormaPomieszczenia)) &&
    jestObiektem(x.progi_wydajnosci) && jestTablica(x.progi_wydajnosci.biuro, jestProgiem) && jestUkladami(x.uklady) &&
    jestTablica(x.brud, czyBrud) && jestTablica(x.poziomy, (p) => maLiczby(p, ['poziom']) && maTeksty(p, ['nazwa'])) &&
    maWartosci(x.pozycje, jestObiektem)
}

/** @param {unknown} x @returns {x is Rynek} */
function jestRynkiem(x) {
  return maWersje(x) && jestObiektem(x) && jestObiektem(x.kraj) && maLiczby(x.kraj.stawka_h, ['mediana']) &&
    jestTablica(x.wojewodztwa, (w) => jestObiektem(w) && (w.id === null || jestTekstem(w.id)) && maTeksty(w, ['nazwa']) &&
      maLiczby(w, ['wsp', 'stawka_h']))
}

/** @param {PobierzJson} pobierzJson @returns {Promise<{ ceny: unknown, normy: unknown, rynek: unknown }>} */
async function pobierzPliki(pobierzJson) {
  const sciezki = [PLIKI.ceny, PLIKI.normy, PLIKI.rynek]
  const wyniki = await Promise.allSettled(sciezki.map((sciezka) => pobierzJson(sciezka)))
  const [ceny, normy, rynek] = wyniki.map((wynik, i) => {
    if (wynik.status === 'fulfilled') return wynik.value
    throw new BladKatalogu('brak_pliku', `Nie udało się wczytać ${sciezki[i]}`, { cause: wynik.reason })
  })
  return { ceny, normy, rynek }
}

/** Te same kontrole co scripts/kalibracja.ps1: norma czasu kazdej pozycji i przygotowanie uslug z pozycjami. @param {Ceny} ceny @param {Normy} normy */
function sprawdzSpojnosc(ceny, normy) {
  for (const usluga of ceny.uslugi) {
    for (const pozycja of usluga.pozycje ?? []) {
      const klucz = `${usluga.id}.${pozycja.id}`
      if (typeof normy.pozycje[klucz]?.min_na_jednostke !== 'number') throw new BladKatalogu('brak_normy', `Brak normy czasu dla pozycji ${klucz}`)
    }
    const czyPotrzebujePrzygotowania = usluga.tryb === 'pozycje' && !usluga.tylko_dodatek
    if (czyPotrzebujePrzygotowania && typeof normy.przygotowanie_min_uslug[usluga.id] !== 'number') {
      throw new BladKatalogu('brak_przygotowania', `Brak czasu przygotowania dla usługi ${usluga.id}`)
    }
    if (usluga.tryb === 'pomieszczenia' && !normy.zestawy_pomieszczen[usluga.zestaw_pomieszczen ?? '']) {
      throw new BladKatalogu('brak_zestawu', `Brak zestawu pomieszczeń dla usługi ${usluga.id}`)
    }
  }
}

/**
 * @template T
 * @param {Map<string, T>} mapa
 * @param {string} klucz
 * @param {() => Error} blad
 * @returns {T}
 */
function znajdz(mapa, klucz, blad) {
  const wartosc = mapa.get(klucz)
  if (wartosc === undefined) throw blad()
  return wartosc
}

/** @param {Ceny} ceny @returns {Pick<Katalog, 'usluga' | 'pozycja' | 'progMetrazu' | 'progDlaMetrazu'> & { czyPozycja: (klucz: string) => boolean }} */
function indeksyCen(ceny) {
  const uslugi = new Map(ceny.uslugi.map((u) => [u.id, u]))
  const pozycje = new Map(ceny.uslugi.flatMap((u) => (u.pozycje ?? []).map((p) => [`${u.id}.${p.id}`, p])))
  /** @param {string} id */
  const usluga = (id) => znajdz(uslugi, id, () => new BladWejscia('nieznana_usluga', `Nieznana usługa ${id}`))
  /**
   * Prog metrazu: ostatni w kolejnosci danych z od_m2 ≤ m²; jedna regula dla mnoznika ceny i banera progu w kreatorze.
   * @param {string} nazwa @param {number} m2 @returns {ProgMetrazu | null} null, gdy zaden prog nie pasuje (mnoznik domyslny)
   */
  const progDlaMetrazu = (nazwa, m2) => {
    const progi = ceny.progi_metrazu[nazwa]?.progi
    if (!progi) throw new BladKatalogu('brak_progu', `Brak progów metrażu ${nazwa}`)
    const indeks = progi.findLastIndex((p) => m2 >= p.od_m2)
    const prog = progi[indeks]
    return prog ? { od: prog.od_m2, do: progi[indeks + 1]?.od_m2 ?? null, mnoznik: prog.mnoznik } : null
  }
  return {
    usluga,
    pozycja: (uslugaId, pozycjaId) => znajdz(pozycje, `${usluga(uslugaId).id}.${pozycjaId}`,
      () => new BladWejscia('nieznana_pozycja', `Nieznana pozycja ${pozycjaId} usługi ${uslugaId}`)),
    progMetrazu: (nazwa, m2) => progDlaMetrazu(nazwa, m2)?.mnoznik ?? MNOZNIK_PROGU_DOMYSLNY,
    progDlaMetrazu,
    czyPozycja: (klucz) => pozycje.has(klucz),
  }
}

/**
 * @param {Normy} normy
 * @param {(klucz: string) => boolean} czyPozycja
 * @returns {Pick<Katalog, 'normaPomieszczenia' | 'normaBrudu' | 'zestaw' | 'normaPozycji'>}
 */
function indeksyNorm(normy, czyPozycja) {
  const normyPomieszczen = new Map(Object.values(normy.zestawy_pomieszczen).flat().map((p) => [p.id, p.min_m2]))
  const brud = new Map(normy.brud.map((b) => [b.id, b]))
  return {
    normaPomieszczenia: (typ) => znajdz(normyPomieszczen, typ, () => new BladWejscia('nieznane_pomieszczenie', `Nieznany typ pomieszczenia ${typ}`)),
    normaBrudu: (id, poziom) => {
      const norma = znajdz(brud, id, () => new BladWejscia('nieznany_brud', `Nieznany rodzaj brudu ${id}`)).min_m2[poziom - 1]
      if (typeof norma !== 'number') throw new BladWejscia('poziom_brudu', `Brak poziomu ${poziom} brudu ${id}`)
      return norma
    },
    zestaw: (id) => {
      const zestaw = normy.zestawy_pomieszczen[id]
      if (!zestaw) throw new BladKatalogu('brak_zestawu', `Brak zestawu pomieszczeń ${id}`)
      return zestaw
    },
    normaPozycji: (klucz) => {
      const norma = normy.pozycje[klucz]
      if (!norma || !czyPozycja(klucz)) throw new BladWejscia('nieznana_pozycja', `Nieznana pozycja ${klucz}`)
      return norma
    },
  }
}

/** @param {Rynek} rynek @returns {Pick<Katalog, 'wojewodztwo' | 'wojewodztwa' | 'rynekKraj'>} */
function indeksRynku(rynek) {
  const wojewodztwa = rynek.wojewodztwa.map((w) => ({ id: w.id, nazwa: w.nazwa, wsp: w.wsp, stawka_h: w.stawka_h }))
  const poId = new Map(wojewodztwa.map((w) => [String(w.id), w]))
  const krajowe = { id: null, nazwa: NAZWA_SREDNIEJ_KRAJOWEJ, wsp: WSP_KRAJOWY, stawka_h: rynek.kraj.stawka_h.mediana }
  return {
    wojewodztwo: (id) => (id === null ? krajowe : znajdz(poId, id, () => new BladWejscia('nieznane_wojewodztwo', `Nieznane województwo ${id}`))),
    wojewodztwa,
    rynekKraj: (klucz) => {
      const punkt = rynek.kraj[klucz]
      const zakres = punkt?.zakres
      if (!punkt || typeof punkt.mediana !== 'number' || punkt.mediana <= 0 || !Array.isArray(zakres) || zakres.length !== 2) {
        throw new BladKatalogu('brak_rynku', `Brak danych rynku kraj.${klucz} w ${PLIKI.rynek}`)
      }
      return { mediana: punkt.mediana, zakres: [zakres[0], zakres[1]] }
    },
  }
}

/** @param {Ceny} ceny @param {Normy} normy @param {Rynek} rynek @returns {Katalog} */
function zbudujKatalog(ceny, normy, rynek) {
  const { czyPozycja, ...cen } = indeksyCen(ceny)
  return {
    ...cen,
    ...indeksyNorm(normy, czyPozycja),
    ...indeksRynku(rynek),
    // Usluga tylko_dodatek nie ma wlasnego przygotowania: wchodzi w czas wizyty innej uslugi.
    przygotowanie: (uslugaId) => (cen.usluga(uslugaId).tryb === 'pomieszczenia' ? normy.przygotowanie_min : normy.przygotowanie_min_uslug[uslugaId] ?? 0),
    przygotowanieMin: normy.przygotowanie_min,
    progiWydajnosciBiura: normy.progi_wydajnosci.biuro,
    uslugi: ceny.uslugi,
    brud: normy.brud,
    poziomy: normy.poziomy,
    poziomyBrudu: ceny.poziomy_brudu.poziomy,
    kosztyFirmy: ceny.koszty_firmy,
    uklady: normy.uklady,
    wersjaDanych: { ceny: ceny.meta.wersja, normy: normy.meta.wersja, rynek: rynek.meta.wersja },
  }
}

/**
 * Wczytuje dane referencyjne przez `pobierzJson` (w przegladarce fetch, w testach odczyt z dysku) i buduje indeksy.
 * @param {PobierzJson} pobierzJson
 * @returns {Promise<Katalog>}
 */
export async function wczytajKatalog(pobierzJson) {
  const { ceny, normy, rynek } = await pobierzPliki(pobierzJson)
  if (!jestCenami(ceny)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIKI.ceny}`)
  if (!jestNormami(normy)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIKI.normy}`)
  if (!jestRynkiem(rynek)) throw new BladKatalogu('zly_format', `Nieprawidłowy format ${PLIKI.rynek}`)
  sprawdzSpojnosc(ceny, normy)
  return zbudujKatalog(ceny, normy, rynek)
}
