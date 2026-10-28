// Szybka wycena przez telefon (R10–R12, R14): widelki ze spodziewanego stanu, „orientacyjnie od” dla uslug wymagajacych ogledzin,
// tekst dla klienta i zamiana w dokladna wycene. Kazda granica to wycenUsluge na ukladzie typowego lokalu, wiec dolna granica
// typowego stanu jest cena dokladnej wyceny tego ukladu (decyzja wlasciciela 2026-10-24: „typowy = mediana”).

import { BladWejscia } from './bledy.js'
import { wycenUsluge } from './cena.js'
import { ZESTAW_BIURA, zBrudem, zPoziomemBrudu } from './czas.js'
import { kosztZlecenia } from './koszt.js'
import { ukladBiura, ukladMieszkania } from './uklad.js'
import { cenaDlaKlienta, zCenyRecznej } from './vat.js'
import { widelkiRynku } from './widelki.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./katalog.js').KosztyFirmy} KosztyFirmy */
/** @typedef {import('./katalog.js').Usluga} Usluga */
/** @typedef {import('./katalog.js').RegulaBrudu} RegulaBrudu */
/** @typedef {import('./katalog.js').RodzajSzybkiej} RodzajSzybkiej */
/** @typedef {import('./cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('./cena.js').WynikWyceny} WynikWyceny */
/** @typedef {import('./cena.js').DodatekWyceny} DodatekWyceny */
/** @typedef {import('./czas.js').PomieszczenieCzasu} PomieszczenieCzasu */
/** @typedef {import('./uklad.js').RodzajKuchni} RodzajKuchni */
/** @typedef {import('./vat.js').StatusVat} StatusVat */
/**
 * @typedef {typeof STANY_SZYBKIEJ[number]['id']} StanSzybkiej
 * @typedef {typeof TRYBY_SZYBKIEJ[number]} TrybSzybkiej
 * @typedef {{ uslugaId: string, m2?: number, lazienki?: number, kuchnia?: RodzajKuchni, stan?: StanSzybkiej,
 *   pozycje?: { id: string, ilosc: number }[], dodatki?: DodatekWyceny[], dojazdKm?: number, wojewodztwoId?: string | null,
 *   odpowiedzi?: Record<string, unknown>, brud?: RegulaBrudu[], poziomGorny?: number | null }} WejscieSzybkiej brud: reguly
 *   ze skutkow odpowiedzi klienta (regulyBrudu z pytania.js), ustawiaja poziom w pasujacych pomieszczeniach ukladu; poziomGorny:
 *   poziom z poziomy_brudu gornej granicy widelek pozycji ze skutku odpowiedzi (poziomGornejGranicy), null = poziom 2
 * @typedef {{ katalog: Katalog, statusVat: StatusVat, stawkaVatProc: number, tempo: number, koszty: KosztyFirmy, zastrzezenie: string }}
 *   KontekstSzybkiej koszty: koszty_firmy scalone z ustawieniami (stawki dojazdu klienta i firmy), zastrzezenie z data/domyslne.json
 * @typedef {{ tryb: TrybSzybkiej, od: number, do: number }} KwotySzybkiej
 * @typedef {KwotySzybkiej & { mediana: number, rynek: { od: number, do: number, pelne: boolean },
 *   zostaje: { od: number, do: number, naGodzine: { od: number, do: number } }, tekst: string }} WynikSzybkiej
 * @typedef {{ wejscie: WejscieWyceny, wynik: WynikWyceny, kwota: number }} Granica kwota: cena modelu z minimum, bez dojazdu klienta
 * @typedef {{ granice: Granica[], dolna: Granica, bazowa: Granica }} GraniceSzybkiej bazowa: poziom 1 (mediana i widelki rynku)
 * @typedef {{ stan: StanSzybkiej, od: number, do: number, tryb: TrybSzybkiej, brud?: RegulaBrudu[], poziomGorny?: number }}
 *   SzybkaWyceny widelki szybkiej wyceny zapisane w rekordzie (src/dane/wyceny.js); brud i poziomGorny: skutki odpowiedzi
 *   klienta, z ktorych formularz szybkiej wyceny je odtwarza
 */

/** Spodziewany stan lokalu w szybkiej wycenie; zrodlo stalej dla ekranu szybkiej wyceny. */
export const STANY_SZYBKIEJ = Object.freeze(/** @type {const} */ ([
  { id: 'lekki', etykieta: 'Lekki' },
  { id: 'typowy', etykieta: 'Typowy' },
  { id: 'mocny', etykieta: 'Mocny' },
]))
/** Stan lokalu, gdy formularz go nie podal (ogledziny i pozycje go nie uzywaja); domyslny na ekranie szybkiej wyceny. */
export const STAN_DOMYSLNY_SZYBKIEJ = 'typowy'
/** Postac kwoty szybkiej wyceny: widelki od–do, „ok. X zł” albo „orientacyjnie od”; zrodlo stalej dla zapisu widelek. */
export const TRYBY_SZYBKIEJ = Object.freeze(/** @type {const} */ (['widelki', 'ok', 'od']))

/** Poziomy reguly `kurz` na `*` dla granic widelek: lekki = jedna kwota, typowy 1–2, mocny 2–3. */
const POZIOMY_STANU = Object.freeze({ lekki: [1], typowy: [1, 2], mocny: [2, 3] })
const POZIOM_BEZ_REGULY = 1 // poziom 1 kurzu jest juz w normie pomieszczenia
const POZIOM_GORNY_POZYCJI = 2 // gorna granica pozycji: cena × mnoznik poziomu 2 z poziomy_brudu, chyba ze skutek odpowiedzi daje inny
const BRUD_STANU = 'kurz'
const WARIANT_SZYBKIEJ = 'jednorazowe' // biura tylko jednorazowo (R10)
const ZAOKRAGLENIE_ZL = 10
/** Opis uslugi z pomieszczeniami w tekscie dla klienta: nazwa i rodzaj sprzatania (bez wpisu: nazwa uslugi z danych). */
const OPISY_POMIESZCZEN = new Map([
  ['mieszkanie_standard', { nazwa: 'Sprzątanie mieszkania', rodzaj: 'standard' }],
  ['mieszkanie_gruntowne', { nazwa: 'Sprzątanie mieszkania', rodzaj: 'gruntowne' }],
  ['mieszkanie_po_wynajmie', { nazwa: 'Sprzątanie mieszkania', rodzaj: 'po wynajmie' }],
  ['mieszkanie_po_remoncie', { nazwa: 'Sprzątanie mieszkania po remoncie', rodzaj: null }],
  ['sprzatanie_biur', { nazwa: 'Sprzątanie biura', rodzaj: 'jednorazowo' }],
])
const FORMAT_LICZBY = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2, useGrouping: 'always' })

/** @param {Usluga} usluga @returns {RodzajSzybkiej} pole `szybka_wycena` (wartosc sprawdza wczytajKatalog) */
function rodzajSzybkiej(usluga) {
  if (usluga.szybka_wycena === undefined) throw new BladWejscia('bez_szybkiej', `Usługa ${usluga.id} nie ma szybkiej wyceny`)
  return usluga.szybka_wycena
}

/** @param {WejscieSzybkiej} wejscie @returns {readonly number[]} */
function poziomyStanu(wejscie) {
  const stan = wejscie.stan
  if (stan === undefined || !Object.hasOwn(POZIOMY_STANU, stan)) throw new BladWejscia('stan', `Nieznany stan lokalu ${stan}`)
  return POZIOMY_STANU[stan]
}

/** @param {WejscieSzybkiej} wejscie @returns {number} */
function metraz(wejscie) {
  const m2 = wejscie.m2
  if (m2 === undefined || !Number.isFinite(m2) || m2 <= 0) throw new BladWejscia('metraz', `Metraż musi być dodatni, jest ${m2}`)
  return m2
}

/**
 * Uklad typowego lokalu (mieszkanie albo biuro wg zestawu uslugi) z regulami `brud_domyslny`, potem brud z odpowiedzi klienta
 * (zastepuje ten sam rodzaj brudu, np. tluszcz poziom 3 zamiast 2 po wynajmie).
 * @param {Usluga} usluga @param {WejscieSzybkiej} wejscie @param {Katalog} katalog
 */
function ukladSzybkiej(usluga, wejscie, katalog) {
  const m2 = metraz(wejscie)
  const uklad = usluga.zestaw_pomieszczen === ZESTAW_BIURA
    ? ukladBiura(m2, katalog.uklady)
    : ukladMieszkania(m2, { lazienki: wejscie.lazienki, kuchnia: wejscie.kuchnia }, katalog.uklady)
  return zPoziomemBrudu(zBrudem(uklad, usluga.brud_domyslny), wejscie.brud ?? [])
}

/** @param {PomieszczenieCzasu[]} uklad @param {number} poziom @returns {PomieszczenieCzasu[]} */
function zKurzem(uklad, poziom) {
  return poziom === POZIOM_BEZ_REGULY ? uklad : zBrudem(uklad, [{ pomieszczenie: '*', brud: BRUD_STANU, poziom }])
}

/** @param {Usluga} usluga @param {WejscieSzybkiej} wejscie @returns {WejscieWyceny} */
function wejscieWspolne(usluga, wejscie) {
  return {
    uslugaId: usluga.id, wojewodztwoId: wejscie.wojewodztwoId ?? null, wariantId: usluga.warianty ? WARIANT_SZYBKIEJ : null,
    dodatki: wejscie.dodatki ?? [], dojazdKm: wejscie.dojazdKm ?? 0,
  }
}

/** @param {WejscieWyceny} wejscie @param {KontekstSzybkiej} kontekst @returns {Granica} */
function granica(wejscie, kontekst) {
  const wynik = wycenUsluge(wejscie, kontekst.katalog, { stawkiDojazdu: kontekst.koszty.dojazd })
  return { wejscie, wynik, kwota: wynik.cena - wynik.dojazd.kwota }
}

/**
 * Pomieszczenia: granica poziomu N = uklad z kurzem N, ogledziny tylko poziom 1; bazowa = poziom 1 (mediana i rynek).
 * @param {Usluga} usluga @param {WejscieSzybkiej} wejscie @param {RodzajSzybkiej} rodzaj @param {KontekstSzybkiej} kontekst
 * @returns {GraniceSzybkiej}
 */
function granicePomieszczen(usluga, wejscie, rodzaj, kontekst) {
  const uklad = ukladSzybkiej(usluga, wejscie, kontekst.katalog)
  const poziomy = rodzaj === 'ogledziny' ? [POZIOM_BEZ_REGULY] : poziomyStanu(wejscie)
  const naPoziomie = (/** @type {number} */ poziom) => granica({ ...wejscieWspolne(usluga, wejscie), pomieszczenia: zKurzem(uklad, poziom) }, kontekst)
  const granice = poziomy.map(naPoziomie)
  const [dolna] = granice
  if (!dolna) throw new BladWejscia('stan', 'Stan lokalu bez poziomów')
  return { granice, dolna, bazowa: poziomy[0] === POZIOM_BEZ_REGULY ? dolna : naPoziomie(POZIOM_BEZ_REGULY) }
}

/**
 * Pozycje: widelki od ceny do ceny z pozycjami glownymi × mnoznik poziomu 2 (albo `poziomGorny` ze skutku odpowiedzi klienta,
 * np. 3 przy trudnych plamach; decyzja wlasciciela 2026-10-28), ogledziny: glowna pozycja × metraz; bazowa = dolna.
 * @param {Usluga} usluga @param {WejscieSzybkiej} wejscie @param {RodzajSzybkiej} rodzaj @param {KontekstSzybkiej} kontekst
 * @returns {GraniceSzybkiej}
 */
function granicePozycji(usluga, wejscie, rodzaj, kontekst) {
  if (rodzaj === 'ogledziny') {
    const glowna = (usluga.pozycje ?? []).find((p) => p.typ !== 'doplata')
    if (!glowna) throw new BladWejscia('pusty_zakres', `Usługa ${usluga.id} nie ma pozycji głównej`)
    const jedyna = granica({ ...wejscieWspolne(usluga, wejscie), pozycje: [{ id: glowna.id, ilosc: metraz(wejscie) }] }, kontekst)
    return { granice: [jedyna], dolna: jedyna, bazowa: jedyna }
  }
  const dolna = granica({ ...wejscieWspolne(usluga, wejscie), pozycje: wejscie.pozycje ?? [] }, kontekst)
  const poziom = wejscie.poziomGorny ?? POZIOM_GORNY_POZYCJI
  const mnoznik = kontekst.katalog.poziomyBrudu.find((p) => p.poziom === poziom)?.mnoznik
  if (mnoznik === undefined) throw new BladWejscia('poziom_brudu', `Brak poziomu ${poziom} w poziomy_brudu`)
  const glowne = dolna.wynik.linie.filter((l) => l.rodzaj === 'pozycja').reduce((suma, l) => suma + l.kwota, 0)
  const gorna = { ...dolna, kwota: Math.max(dolna.wynik.minimum, dolna.wynik.cenaUslugi + glowne * (mnoznik - 1)) }
  return { granice: [dolna, gorna], dolna, bazowa: dolna }
}

/** @param {number} kwota */
const wDol = (kwota) => Math.floor(kwota / ZAOKRAGLENIE_ZL) * ZAOKRAGLENIE_ZL
/** @param {number} kwota */
const wGore = (kwota) => Math.ceil(kwota / ZAOKRAGLENIE_ZL) * ZAOKRAGLENIE_ZL
/** @param {number} kwota */
const doDziesiatek = (kwota) => Math.round(kwota / ZAOKRAGLENIE_ZL) * ZAOKRAGLENIE_ZL

/** Kwoty bez dojazdu: od w dol, do w gore do 10 zl; jedna granica albo rowne granice → „ok.”, ogledziny → „od”. @param {RodzajSzybkiej} rodzaj @param {number[]} ceny @returns {KwotySzybkiej} */
function kwotySzybkiej(rodzaj, ceny) {
  const [dolna = 0, gorna] = ceny
  if (rodzaj === 'ogledziny') return { tryb: 'od', od: wDol(dolna), do: wDol(dolna) }
  if (gorna === undefined) return { tryb: 'ok', od: doDziesiatek(dolna), do: doDziesiatek(dolna) }
  const od = wDol(dolna)
  const doKwoty = wGore(gorna)
  return od === doKwoty ? { tryb: 'ok', od, do: od } : { tryb: 'widelki', od, do: doKwoty }
}

/** @param {number} m2 */
const tekstM2 = (m2) => `${FORMAT_LICZBY.format(m2)} m²`
/** @param {string} tekst */
const malaLitera = (tekst) => tekst.charAt(0).toLocaleLowerCase('pl-PL') + tekst.slice(1)

/** @param {Usluga} usluga @param {WejscieSzybkiej} wejscie @param {RodzajSzybkiej} rodzaj @param {Katalog} katalog */
function opisSzybkiej(usluga, wejscie, rodzaj, katalog) {
  if (usluga.tryb === 'pomieszczenia') {
    const opis = OPISY_POMIESZCZEN.get(usluga.id) ?? { nazwa: usluga.nazwa, rodzaj: null }
    return `${opis.nazwa} ${tekstM2(metraz(wejscie))}${opis.rodzaj ? `, ${opis.rodzaj}` : ''}`
  }
  if (rodzaj === 'ogledziny') return `${usluga.nazwa} ${tekstM2(metraz(wejscie))}`
  const pozycje = (wejscie.pozycje ?? []).filter((p) => p.ilosc > 0).map(({ id, ilosc }) => {
    const pozycja = katalog.pozycja(usluga.id, id)
    return pozycja.jednostka === 'm2' ? `${malaLitera(pozycja.nazwa)} ${tekstM2(ilosc)}` : `${FORMAT_LICZBY.format(ilosc)} × ${malaLitera(pozycja.nazwa)}`
  })
  return [usluga.nazwa, ...pozycje].join(', ')
}

/**
 * Tekst szybkiej wyceny do wyslania klientowi: opis, kwoty i zastrzezenie (np. „…: 250–300 zł. Cena ostateczna po obejrzeniu…”).
 * @param {string} opis @param {KwotySzybkiej} kwoty @param {string} zastrzezenie szybka_wycena.zastrzezenie z data/domyslne.json
 * @returns {string}
 */
export function tekstDlaKlienta(opis, kwoty, zastrzezenie) {
  if (opis.trim() === '') throw new BladWejscia('opis', 'Tekst dla klienta wymaga opisu usługi')
  const od = FORMAT_LICZBY.format(kwoty.od)
  const kwota = { widelki: `${od}–${FORMAT_LICZBY.format(kwoty.do)} zł`, ok: `ok. ${od} zł`, od: `orientacyjnie od ${od} zł` }[kwoty.tryb]
  return [`${opis}: ${kwota}.`, zastrzezenie.trim()].filter((t) => t !== '').join(' ')
}

/** „Zostaje dla Ciebie” na obu koncach, z ceny granicy dla klienta (czynny podatnik od netto). @param {Granica} granica @param {number} brutto @param {KontekstSzybkiej} k */
function zostaje(granica, brutto, k) {
  const cenaKlienta = zCenyRecznej(brutto, k.statusVat, k.stawkaVatProc)
  return kosztZlecenia({ wynik: granica.wynik, cenaKlienta, tempo: k.tempo, koszty: k.koszty, statusVat: k.statusVat }, k.katalog)
}

/**
 * Granice szybkiej wyceny uslugi: wycenUsluge kazdej granicy (pomieszczenia albo pozycje).
 * @param {WejscieSzybkiej} wejscie @param {KontekstSzybkiej} kontekst
 * @returns {GraniceSzybkiej & { usluga: Usluga, rodzaj: RodzajSzybkiej }}
 */
function obliczGranice(wejscie, kontekst) {
  const usluga = kontekst.katalog.usluga(wejscie.uslugaId)
  const rodzaj = rodzajSzybkiej(usluga)
  const granice = usluga.tryb === 'pomieszczenia' ? granicePomieszczen(usluga, wejscie, rodzaj, kontekst) : granicePozycji(usluga, wejscie, rodzaj, kontekst)
  return { usluga, rodzaj, ...granice }
}

/** @param {ReturnType<typeof obliczGranice>} obliczone @param {WejscieSzybkiej} wejscie @param {KontekstSzybkiej} kontekst @returns {WynikSzybkiej} */
function wynikSzybkiej({ usluga, rodzaj, granice, dolna, bazowa }, wejscie, kontekst) {
  const { katalog, statusVat, stawkaVatProc } = kontekst
  const klient = (/** @type {number} */ kwota) => cenaDlaKlienta({ kwota, podstawaCeny: usluga.podstawa_ceny, statusVat, stawkaVatProc }).brutto
  const dojazd = klient(dolna.wynik.dojazd.kwota)
  const kwoty = kwotySzybkiej(rodzaj, granice.map((g) => klient(g.kwota)))
  const od = kwoty.od + dojazd
  const doKwoty = kwoty.do + dojazd
  const gorna = kwoty.tryb === 'widelki' ? granice[granice.length - 1] ?? dolna : dolna
  const [zostajeOd, zostajeDo] = [zostaje(dolna, od, kontekst), zostaje(gorna, doKwoty, kontekst)]
  const rynek = widelkiRynku(bazowa.wynik, bazowa.wejscie, katalog)
  return {
    tryb: kwoty.tryb, od, do: doKwoty, mediana: klient(bazowa.wynik.cena),
    rynek: { od: klient(rynek.od), do: klient(rynek.do), pelne: rynek.pelne },
    zostaje: { od: zostajeOd.zostaje, do: zostajeDo.zostaje, naGodzine: { od: zostajeOd.zostajeNaGodzine, do: zostajeDo.zostajeNaGodzine } },
    tekst: tekstDlaKlienta(opisSzybkiej(usluga, wejscie, rodzaj, katalog), { tryb: kwoty.tryb, od, do: doKwoty }, kontekst.zastrzezenie),
  }
}

/**
 * Szybka wycena: widelki (pomieszczenia: uklad z kurzem wg stanu; pozycje: cena–cena × mnoznik poziomu 2), „ok. X zł” albo
 * „orientacyjnie od” dla uslug z ogledzinami. Minimum na obu koncach, kwoty dla klienta wg statusu VAT zaokraglone do 10 zl,
 * potem dojazd klienta. Mediana = cena dokladnej wyceny ukladu (dolna granica), rynek = widelkiRynku tej wyceny.
 * @param {WejscieSzybkiej} wejscie
 * @param {KontekstSzybkiej} kontekst
 * @returns {WynikSzybkiej}
 */
export function szybkaWycena(wejscie, kontekst) {
  return wynikSzybkiej(obliczGranice(wejscie, kontekst), wejscie, kontekst)
}

/**
 * Zamiana szybkiej wyceny w dokladna: wejscie dolnej granicy (pomieszczenia ukladu z kurzem na dolnym poziomie stanu: lekki
 * i typowy bez reguly, mocny poziom 2; albo pozycje) z dodatkami i dojazdem, te same odpowiedzi klienta i widelki szybkiej
 * wyceny (do ostrzezenia w podsumowaniu, gdy cena dokladna z nich wyjdzie). Reguly brudu i poziom gornej granicy z odpowiedzi
 * klienta (gdy sa) zostaja w `szybka.brud` i `szybka.poziomGorny`, zeby formularz szybkiej wyceny odtworzyl je z rekordu.
 * @param {WejscieSzybkiej} szybkaWejscie
 * @param {KontekstSzybkiej} kontekst
 * @returns {{ wejscie: WejscieWyceny, odpowiedzi: Record<string, unknown>, szybka: SzybkaWyceny }}
 */
export function naDokladna(szybkaWejscie, kontekst) {
  const obliczone = obliczGranice(szybkaWejscie, kontekst)
  const wynik = wynikSzybkiej(obliczone, szybkaWejscie, kontekst)
  const brud = szybkaWejscie.brud ?? []
  const poziomGorny = szybkaWejscie.poziomGorny ?? null
  return {
    wejscie: obliczone.dolna.wejscie,
    odpowiedzi: { ...szybkaWejscie.odpowiedzi },
    szybka: {
      stan: szybkaWejscie.stan ?? STAN_DOMYSLNY_SZYBKIEJ, od: wynik.od, do: wynik.do, tryb: wynik.tryb,
      ...(brud.length > 0 ? { brud: [...brud] } : {}), ...(poziomGorny === null ? {} : { poziomGorny }),
    },
  }
}
