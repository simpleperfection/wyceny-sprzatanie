// Cena wyceny dla obu trybow uslug (linie, dodatki, minimum zlecenia, dojazd klienta, abonament biura).
// Kolejnosc jak w sekcji „Zlecenia wzorcowe” scripts/kalibracja.ps1: Σ linii → max(minimum_zl, Σ) → + dojazd klienta.

import { BladWejscia } from './bledy.js'
import { brudPozycji, minutyDodatkow, minutyJednejPozycji, minutyPomieszczen, mnoznikBrudu, mnoznikZakresu } from './czas.js'
import { sprawdzIlosc, sprawdzMetraz } from './walidacja.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./katalog.js').Usluga} Usluga */
/** @typedef {import('./katalog.js').Pozycja} Pozycja */
/**
 * @typedef {{ typ: string, nazwa?: string, m2: number, brud?: { id: string, poziom: number }[] }} PomieszczenieWyceny
 * @typedef {{ uslugaId: string, pozycjaId: string, ilosc: number, tryb: typeof TRYBY_DODATKU[number] }} DodatekWyceny
 * @typedef {{ uslugaId: string, wojewodztwoId?: string | null, wariantId?: string | null, pomieszczenia?: PomieszczenieWyceny[],
 *   pozycje?: { id: string, ilosc: number }[], poziomBrudu?: number, dodatki?: DodatekWyceny[], dojazdKm?: number,
 *   dezynfekcja?: boolean }} WejscieWyceny
 * @typedef {{ rodzaj: 'praca' | 'pozycja' | 'doplata' | 'dodatek' | 'material', klucz: string | null, opis: string, ilosc: number,
 *   jednostka: string, cenaJedn: number, cenaBazowa: number, mnoznikProgu: number, kwota: number, zakres: [number, number] | null,
 *   minuty: number }} LiniaWyceny
 * @typedef {{ opis: string, ilosc: number, jednostka: string, kwota: number }} Propozycja
 * @typedef {{ klient_zl_km: number, darmowy_promien_km: number }} StawkiDojazdu
 * @typedef {{ linie: LiniaWyceny[], propozycje: Propozycja[], cenaUslugi: number, minimum: number, czyMinimum: boolean,
 *   dojazd: { km: number, kwota: number }, cena: number, cenaZaokraglona: number, minutyNormowe: number,
 *   wizytWMiesiacu: number | null, cenaMiesieczna: number | null, podstawaCeny: string }} WynikWyceny
 */

const MINUT_W_GODZINIE = 60
const MNOZNIK_NEUTRALNY = 1
const POZIOM_BRUDU_DOMYSLNY = 1
const JEDNOSTKA_M2 = 'm2'
const JEDNOSTKA_GODZINY = 'h'
/** Tryby dodatku z innej uslugi: wchodzi do ceny albo jest propozycja w ofercie („Możesz dobrać”); zrodlo stalej dla kreatora. */
export const TRYBY_DODATKU = Object.freeze(/** @type {const} */ (['w_cenie', 'propozycja']))

/**
 * Linia pozycji: kwota = ilosc × cena × wsp × prog × brud; zakres rynku tym samym mnoznikiem (null, gdy pozycja go nie ma).
 * @param {{ rodzaj: 'pozycja' | 'doplata' | 'dodatek', uslugaId: string, pozycja: Pozycja, ilosc: number, mnoznik: number, prog: number, minuty: number }} p
 * @returns {LiniaWyceny}
 */
function liniaPozycji({ rodzaj, uslugaId, pozycja, ilosc, mnoznik, prog, minuty }) {
  const zakres = pozycja.zakres
  return {
    rodzaj, klucz: `${uslugaId}.${pozycja.id}`, opis: pozycja.nazwa, ilosc, jednostka: pozycja.jednostka,
    cenaJedn: pozycja.cena * mnoznik, cenaBazowa: pozycja.cena, mnoznikProgu: prog, kwota: ilosc * pozycja.cena * mnoznik,
    zakres: zakres ? [ilosc * zakres[0] * mnoznik, ilosc * zakres[1] * mnoznik] : null, minuty,
  }
}

/** Materiał doliczany klientowi (`doliczaj_material`): koszt_chemii_m2 bez wsp, progu i brudu. @param {string} uslugaId @param {Pozycja} pozycja @param {number} ilosc @returns {LiniaWyceny[]} */
function liniaMaterialu(uslugaId, pozycja, ilosc) {
  if (!pozycja.doliczaj_material) return []
  const cena = pozycja.koszt_chemii_m2 ?? 0
  const kwota = ilosc * cena
  return [{
    rodzaj: 'material', klucz: `${uslugaId}.${pozycja.id}`, opis: `Materiał: ${pozycja.nazwa}`, ilosc, jednostka: pozycja.jednostka,
    cenaJedn: cena, cenaBazowa: cena, mnoznikProgu: MNOZNIK_NEUTRALNY, kwota, zakres: [kwota, kwota], minuty: 0,
  }]
}

/** Praca uslugi z pomieszczeniami: minuty / 60 × stawka_h wojewodztwa. @param {Usluga} usluga @param {WejscieWyceny} wejscie @param {Katalog} katalog */
function liniePomieszczen(usluga, wejscie, katalog) {
  const pomieszczenia = wejscie.pomieszczenia ?? []
  for (const p of pomieszczenia) sprawdzMetraz(p.m2)
  const wariant = (usluga.warianty ?? []).find((w) => w.id === wejscie.wariantId) ?? null
  if (pomieszczenia.length === 0) return { linie: [], minutyPrzygotowania: 0, wariant }
  const m2Razem = pomieszczenia.reduce((suma, p) => suma + p.m2, 0)
  const mnoznik = mnoznikZakresu(usluga, wejscie.wariantId ?? null, m2Razem, katalog)
  const minuty = minutyPomieszczen(pomieszczenia, mnoznik, katalog)
  const stawka = katalog.wojewodztwo(wejscie.wojewodztwoId ?? null).stawka_h
  /** @type {LiniaWyceny} */
  const linia = {
    rodzaj: 'praca', klucz: null, opis: wariant ? `${usluga.nazwa} – ${wariant.nazwa}` : usluga.nazwa, ilosc: minuty / MINUT_W_GODZINIE,
    jednostka: JEDNOSTKA_GODZINY, cenaJedn: stawka, cenaBazowa: stawka, mnoznikProgu: MNOZNIK_NEUTRALNY,
    kwota: (minuty / MINUT_W_GODZINIE) * stawka, zakres: null, minuty,
  }
  return { linie: [linia], minutyPrzygotowania: 0, wariant }
}

/** Pozycje glowne (prog z ilosci pozycji m², brud) i doplaty (`typ: 'doplata'`: tylko cena × wsp) uslugi. @param {Usluga} usluga @param {WejscieWyceny} wejscie @param {Katalog} katalog */
function liniePozycji(usluga, wejscie, katalog) {
  const wsp = katalog.wojewodztwo(wejscie.wojewodztwoId ?? null).wsp
  const brud = mnoznikBrudu(usluga, wejscie.poziomBrudu ?? POZIOM_BRUDU_DOMYSLNY, katalog)
  /** @type {LiniaWyceny[]} */
  const linie = []
  for (const { id, ilosc } of wejscie.pozycje ?? []) {
    sprawdzIlosc(ilosc)
    const pozycja = katalog.pozycja(usluga.id, id)
    if (ilosc === 0) continue
    const czyDoplata = pozycja.typ === 'doplata'
    const prog = !czyDoplata && usluga.progi && pozycja.jednostka === JEDNOSTKA_M2 ? katalog.progMetrazu(usluga.progi, ilosc) : MNOZNIK_NEUTRALNY
    const minuty = minutyJednejPozycji(usluga.id, pozycja, ilosc, brud, katalog)
    linie.push(liniaPozycji({ rodzaj: czyDoplata ? 'doplata' : 'pozycja', uslugaId: usluga.id, pozycja, ilosc, mnoznik: wsp * prog * brudPozycji(pozycja, brud), prog, minuty }))
    linie.push(...liniaMaterialu(usluga.id, pozycja, ilosc))
  }
  return { linie, minutyPrzygotowania: linie.length > 0 ? katalog.przygotowanie(usluga.id) : 0, wariant: null }
}

/**
 * Linie jednego dodatku z innej uslugi: ilosc × cena × wsp (bez progu i brudu) i material doliczany klientowi; zrodlo kwoty dodatku dla kreatora.
 * @param {{ uslugaId: string, pozycja: Pozycja, ilosc: number, wsp: number, minuty?: number }} p
 * @returns {LiniaWyceny[]} pierwsza linia to sam dodatek
 */
export function linieDodatku({ uslugaId, pozycja, ilosc, wsp, minuty = 0 }) {
  return [liniaPozycji({ rodzaj: 'dodatek', uslugaId, pozycja, ilosc, mnoznik: wsp, prog: MNOZNIK_NEUTRALNY, minuty }), ...liniaMaterialu(uslugaId, pozycja, ilosc)]
}

/** Dodatki z innych uslug: ilosc × cena × wsp, bez minimum, przygotowania, progu i brudu. @param {WejscieWyceny} wejscie @param {Katalog} katalog */
function linieDodatkow(wejscie, katalog) {
  const wsp = katalog.wojewodztwo(wejscie.wojewodztwoId ?? null).wsp
  /** @type {LiniaWyceny[]} */ const wCenie = []
  /** @type {Propozycja[]} */ const propozycje = []
  for (const { uslugaId, pozycjaId, ilosc, tryb } of wejscie.dodatki ?? []) {
    sprawdzIlosc(ilosc)
    if (!TRYBY_DODATKU.includes(tryb)) throw new BladWejscia('tryb_dodatku', `Nieznany tryb dodatku ${tryb}`)
    const pozycja = katalog.pozycja(uslugaId, pozycjaId)
    if (ilosc === 0) continue
    const minuty = minutyDodatkow([{ uslugaId, pozycjaId, ilosc }], katalog)
    const linie = linieDodatku({ uslugaId, pozycja, ilosc, wsp, minuty })
    if (tryb === 'w_cenie') wCenie.push(...linie)
    else propozycje.push({ opis: pozycja.nazwa, ilosc, jednostka: pozycja.jednostka, kwota: linie.reduce((s, l) => s + l.kwota, 0) })
  }
  return { wCenie, propozycje }
}

/**
 * Dojazd placony przez klienta: km ponad darmowy promien × stawka klienta; zrodlo modelu dojazdu dla kreatora.
 * @param {number} km odleglosc w jedna strone @param {StawkiDojazdu} stawki
 * @returns {{ km: number, kwota: number }}
 */
export function dojazdKlienta(km, stawki) {
  if (!Number.isFinite(km) || km < 0) throw new BladWejscia('dojazd', `Odległość dojazdu musi być nieujemna, jest ${km}`)
  return { km, kwota: Math.max(0, km - stawki.darmowy_promien_km) * stawki.klient_zl_km }
}

/**
 * Wycena uslugi: linie pracy albo pozycji, dodatki „w cenie”, minimum zlecenia, dojazd klienta i abonament (cena za wizyte).
 * @param {WejscieWyceny} wejscie
 * @param {Katalog} katalog
 * @param {{ stawkiDojazdu?: StawkiDojazdu }} [opcje] stawki dojazdu z ustawien; domyslnie koszty_firmy.dojazd z data/ceny.json
 * @returns {WynikWyceny}
 */
export function wycenUsluge(wejscie, katalog, opcje = {}) {
  const usluga = katalog.usluga(wejscie.uslugaId)
  if (usluga.tylko_dodatek) throw new BladWejscia('tylko_dodatek', `Usługa ${usluga.id} jest tylko dodatkiem`)
  const glowne = usluga.tryb === 'pomieszczenia' ? liniePomieszczen(usluga, wejscie, katalog) : liniePozycji(usluga, wejscie, katalog)
  const { wCenie, propozycje } = linieDodatkow(wejscie, katalog)
  const linie = [...glowne.linie, ...wCenie]
  if (glowne.linie.length === 0) throw new BladWejscia('pusty_zakres', `Wycena usługi ${usluga.id} nie ma pomieszczeń ani pozycji`)
  const cenaUslugi = linie.reduce((suma, l) => suma + l.kwota, 0)
  const minimum = usluga.minimum_zl ?? 0
  const dojazd = dojazdKlienta(wejscie.dojazdKm ?? 0, opcje.stawkiDojazdu ?? katalog.kosztyFirmy.dojazd)
  const cena = Math.max(minimum, cenaUslugi) + dojazd.kwota
  const wizytWMiesiacu = glowne.wariant?.wizyt_w_miesiacu ?? null
  return {
    linie, propozycje, cenaUslugi, minimum, czyMinimum: cenaUslugi < minimum, dojazd, cena, cenaZaokraglona: Math.round(cena),
    minutyNormowe: glowne.minutyPrzygotowania + linie.reduce((suma, l) => suma + l.minuty, 0),
    wizytWMiesiacu, cenaMiesieczna: wizytWMiesiacu === null ? null : cena * wizytWMiesiacu, podstawaCeny: usluga.podstawa_ceny,
  }
}
