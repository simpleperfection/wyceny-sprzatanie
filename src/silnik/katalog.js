// Katalog danych referencyjnych: data/ceny.json, data/normy.json i data/rynek.json z indeksami dla silnika wyceny.
// Kontrole spojnosci sa te same co w scripts/kalibracja.ps1 (norma czasu kazdej pozycji, przygotowanie uslug z pozycjami).

import { BladKatalogu, BladWejscia } from './bledy.js'

const PLIKI = { ceny: 'data/ceny.json', normy: 'data/normy.json', rynek: 'data/rynek.json' }
const NAZWA_SREDNIEJ_KRAJOWEJ = 'średnia krajowa'
const WSP_KRAJOWY = 1
const MNOZNIK_PROGU_DOMYSLNY = 1

/**
 * @typedef {{ pomieszczenie: string, brud: string, poziom: number }} RegulaBrudu
 * @typedef {{ id: string, nazwa: string, wizyt_w_miesiacu: number, mnoznik_zakresu: number }} Wariant
 * @typedef {{ id: string, nazwa: string, jednostka: string, cena: number, zakres: number[] | null, typ?: 'doplata',
 *   sprzet?: string, koszt_chemii_m2?: number, koszt_chemii_szt?: number, doliczaj_material?: boolean }} Pozycja
 * @typedef {{ id: string, nazwa: string, grupa: string, tryb: 'pomieszczenia' | 'pozycje', podstawa_ceny: string,
 *   minimum_zl?: number, zestaw_pomieszczen?: string, mnoznik_zakresu?: number, brud_domyslny?: RegulaBrudu[],
 *   dodatki?: string[], warianty?: Wariant[], pozycje?: Pozycja[], progi?: string, poziomy_brudu?: boolean,
 *   tylko_dodatek?: boolean, rynek_odniesienie?: string }} Usluga
 * @typedef {{ od_m2: number, mnoznik: number }} Prog
 * @typedef {{ poziom: number, nazwa: string, mnoznik: number }} PoziomBrudu
 * @typedef {{ praca: { stawka_brutto_h: number, narzut_pracodawcy: number, koszt_h: number }, chemia_h: { wartosc: number },
 *   sprzet: Record<string, { nazwa: string, koszt_h: number } | string>,
 *   dojazd: { klient_zl_km: number, zakres_rynkowy: number[], darmowy_promien_km: number, koszt_firmy_zl_km: number } }} KosztyFirmy
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
 *   progMetrazu: (nazwa: string, m2: number) => number, normaPozycji: (klucz: string) => NormaPozycji,
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
function maWersje(x) {
  return jestObiektem(x) && jestObiektem(x.meta) && typeof x.meta.wersja === 'string'
}

/** @param {unknown} x @returns {x is Ceny} */
function jestCenami(x) {
  return maWersje(x) && jestObiektem(x) && Array.isArray(x.uslugi) && jestObiektem(x.progi_metrazu) &&
    jestObiektem(x.poziomy_brudu) && Array.isArray(x.poziomy_brudu.poziomy) && jestObiektem(x.koszty_firmy)
}

/** @param {unknown} x @returns {x is Normy} */
function jestNormami(x) {
  return maWersje(x) && jestObiektem(x) && typeof x.przygotowanie_min === 'number' && jestObiektem(x.przygotowanie_min_uslug) &&
    jestObiektem(x.zestawy_pomieszczen) && jestObiektem(x.progi_wydajnosci) && Array.isArray(x.progi_wydajnosci.biuro) &&
    jestObiektem(x.uklady) && Array.isArray(x.brud) && Array.isArray(x.poziomy) && jestObiektem(x.pozycje)
}

/** @param {unknown} x @returns {x is Rynek} */
function jestRynkiem(x) {
  return maWersje(x) && jestObiektem(x) && jestObiektem(x.kraj) && jestObiektem(x.kraj.stawka_h) &&
    typeof x.kraj.stawka_h.mediana === 'number' && Array.isArray(x.wojewodztwa)
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

/** @param {Ceny} ceny @returns {Pick<Katalog, 'usluga' | 'pozycja' | 'progMetrazu'> & { czyPozycja: (klucz: string) => boolean }} */
function indeksyCen(ceny) {
  const uslugi = new Map(ceny.uslugi.map((u) => [u.id, u]))
  const pozycje = new Map(ceny.uslugi.flatMap((u) => (u.pozycje ?? []).map((p) => [`${u.id}.${p.id}`, p])))
  /** @param {string} id */
  const usluga = (id) => znajdz(uslugi, id, () => new BladWejscia('nieznana_usluga', `Nieznana usługa ${id}`))
  return {
    usluga,
    pozycja: (uslugaId, pozycjaId) => znajdz(pozycje, `${usluga(uslugaId).id}.${pozycjaId}`,
      () => new BladWejscia('nieznana_pozycja', `Nieznana pozycja ${pozycjaId} usługi ${uslugaId}`)),
    progMetrazu: (nazwa, m2) => {
      const progi = ceny.progi_metrazu[nazwa]
      if (!progi) throw new BladKatalogu('brak_progu', `Brak progów metrażu ${nazwa}`)
      return progi.progi.reduce((mnoznik, prog) => (m2 >= prog.od_m2 ? prog.mnoznik : mnoznik), MNOZNIK_PROGU_DOMYSLNY)
    },
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
