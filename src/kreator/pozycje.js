// Kroki zakresu (tryb `pozycje`) i dodatkow kreatora (R25): czyste funkcje na `wejscie.pozycje`, `poziomBrudu`, `dodatki`
// i `dojazdKm` oraz dane banera progu metrazu i karty dojazdu. Bez DOM i magazynu; widoki zapisuja wynik przez `zmienWejscie`
// z src/kreator/stan.js. Usluga m² z progami ma jedna powierzchnie: wszystkie wlaczone pozycje maja te sama ilosc m².

import { BladWejscia } from '../silnik/bledy.js'
import { czyPozycjeZPowierzchnia, pozycjeGlowne } from './stan.js'

/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/cena.js').DodatekWyceny} DodatekWyceny */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/** @typedef {import('../silnik/katalog.js').Pozycja} Pozycja */
/**
 * @typedef {{ od: number, do: number | null, mnoznik: number }} InfoProgu do: poczatek nastepnego progu (null przy ostatnim)
 * @typedef {{ kwotaKlienta: number, kmPonad: number, kosztFirmy: number, kmRazem: number }} InfoDojazdu
 * @typedef {{ klient_zl_km: number, darmowy_promien_km: number, koszt_firmy_zl_km: number }} StawkiDojazdu
 * @typedef {{ cenaJedn: number, kwota: number }} WycenaDodatku
 */

/** Najwieksza ilosc pozycji, dodatku i powierzchnia w kreatorze (tekst bledu w widoku: „od 0 do 100 000”). */
export const MAKS_ILOSCI = 100_000
/** Najdalszy dojazd w jedna strone (km). */
export const MAKS_DOJAZDU_KM = 500
/** Tryby dodatku z innej uslugi: wchodzi do ceny albo jest propozycja w ofercie („Możesz dobrać”). */
export const TRYBY_DODATKU = Object.freeze(/** @type {const} */ (['w_cenie', 'propozycja']))
/** Koszt firmy liczy dojazd tam i z powrotem (jak KURSOW_NA_ZLECENIE w src/silnik/koszt.js). */
const KURSOW_NA_ZLECENIE = 2
const JEDNOSTKA_SZT = 'szt'
const MNOZNIK_NEUTRALNY = 1

/** @param {Pozycja} pozycja @param {number} ilosc 0–MAKS_ILOSCI, sztuki calkowite; inaczej BladWejscia `ilosc` */
function sprawdzIlosc(pozycja, ilosc) {
  const czyCalkowita = pozycja.jednostka !== JEDNOSTKA_SZT || Number.isInteger(ilosc)
  if (!Number.isFinite(ilosc) || ilosc < 0 || ilosc > MAKS_ILOSCI || !czyCalkowita) {
    throw new BladWejscia('ilosc', `Ilość ${pozycja.id} ma być od 0 do ${MAKS_ILOSCI} (${pozycja.jednostka}), jest ${ilosc}`)
  }
}

/** @param {WejscieWyceny} wejscie @param {Katalog} katalog @returns {Usluga} usluga m² z progami, inaczej BladWejscia `tryb_uslugi` */
function uslugaZPowierzchnia(wejscie, katalog) {
  const usluga = katalog.usluga(wejscie.uslugaId)
  if (!czyPozycjeZPowierzchnia(usluga)) throw new BladWejscia('tryb_uslugi', `Usługa ${usluga.id} nie ma jednej powierzchni`)
  return usluga
}

/**
 * Pozycje w kolejnosci katalogu uslugi (stala kolejnosc wierszy i linii wyceny niezaleznie od kolejnosci klikniec).
 * @param {Usluga} usluga @param {{ id: string, ilosc: number }[]} pozycje
 */
function wKolejnosciKatalogu(usluga, pozycje) {
  const kolejnosc = (usluga.pozycje ?? []).map((p) => p.id)
  return [...pozycje].sort((a, b) => kolejnosc.indexOf(a.id) - kolejnosc.indexOf(b.id))
}

/**
 * Ilosc pozycji uslugi z licznikami (okna, tapicerka, dywany). Uslugi m² z progami zmieniaja ilosc przez `ustawPowierzchnie`.
 * @param {WejscieWyceny} wejscie @param {string} pozycjaId @param {number} ilosc @param {Katalog} katalog
 * @returns {WejscieWyceny}
 */
export function ustawIlosc(wejscie, pozycjaId, ilosc, katalog) {
  const usluga = katalog.usluga(wejscie.uslugaId)
  if (czyPozycjeZPowierzchnia(usluga)) throw new BladWejscia('tryb_uslugi', `Usługa ${usluga.id} ma jedną powierzchnię`)
  sprawdzIlosc(katalog.pozycja(usluga.id, pozycjaId), ilosc)
  const pozycje = wejscie.pozycje ?? []
  if (!pozycje.some((p) => p.id === pozycjaId)) return { ...wejscie, pozycje: wKolejnosciKatalogu(usluga, [...pozycje, { id: pozycjaId, ilosc }]) }
  return { ...wejscie, pozycje: pozycje.map((p) => (p.id === pozycjaId ? { id: pozycjaId, ilosc } : p)) }
}

/** @param {WejscieWyceny} wejscie @returns {number} powierzchnia uslugi m² z progami (ilosc wlaczonych pozycji; 0 bez pozycji) */
export const powierzchnia = (wejscie) => wejscie.pozycje?.[0]?.ilosc ?? 0

/**
 * Jedna powierzchnia uslugi m² z progami: wszystkie wlaczone pozycje dostaja te sama ilosc m².
 * @param {WejscieWyceny} wejscie @param {number} m2 0–MAKS_ILOSCI, inaczej BladWejscia `ilosc` @param {Katalog} katalog
 * @returns {WejscieWyceny}
 */
export function ustawPowierzchnie(wejscie, m2, katalog) {
  const usluga = uslugaZPowierzchnia(wejscie, katalog)
  const [pierwsza] = usluga.pozycje ?? []
  if (pierwsza) sprawdzIlosc(pierwsza, m2)
  return { ...wejscie, pozycje: (wejscie.pozycje ?? []).map((p) => ({ id: p.id, ilosc: m2 })) }
}

/**
 * Wlaczenie pozycji (z biezaca powierzchnia) albo wylaczenie; zostaje co najmniej jedna pozycja glowna (BladWejscia `brak_pozycji_glownej`).
 * @param {WejscieWyceny} wejscie @param {string} pozycjaId @param {boolean} czyWlaczona @param {Katalog} katalog
 * @returns {WejscieWyceny}
 */
export function przelaczPozycje(wejscie, pozycjaId, czyWlaczona, katalog) {
  const usluga = uslugaZPowierzchnia(wejscie, katalog)
  katalog.pozycja(usluga.id, pozycjaId)
  const pozycje = wejscie.pozycje ?? []
  if (czyWlaczona) {
    if (pozycje.some((p) => p.id === pozycjaId)) return wejscie
    return { ...wejscie, pozycje: wKolejnosciKatalogu(usluga, [...pozycje, { id: pozycjaId, ilosc: powierzchnia(wejscie) }]) }
  }
  const pozostale = pozycje.filter((p) => p.id !== pozycjaId)
  const glowne = new Set(pozycjeGlowne(usluga).map((p) => p.id))
  if (!pozostale.some((p) => glowne.has(p.id))) throw new BladWejscia('brak_pozycji_glownej', `Usługa ${usluga.id} potrzebuje pozycji głównej`)
  return { ...wejscie, pozycje: pozostale }
}

/** @param {WejscieWyceny} wejscie @param {number} poziom poziom z `poziomy_brudu` w data/ceny.json (1–3) @param {Katalog} katalog @returns {WejscieWyceny} */
export function ustawPoziomBrudu(wejscie, poziom, katalog) {
  if (!katalog.poziomyBrudu.some((p) => p.poziom === poziom)) throw new BladWejscia('poziom_brudu', `Nieznany poziom brudu ${poziom}`)
  return { ...wejscie, poziomBrudu: poziom }
}

/**
 * Dodatek z uslugi z listy `dodatki` wycenianej uslugi: ilosc > 0 zapisuje (z trybem), 0 usuwa.
 * @param {WejscieWyceny} wejscie @param {string} uslugaId @param {string} pozycjaId @param {number} ilosc
 * @param {DodatekWyceny['tryb']} tryb @param {Katalog} katalog
 * @returns {WejscieWyceny}
 */
export function ustawDodatek(wejscie, uslugaId, pozycjaId, ilosc, tryb, katalog) {
  if (!TRYBY_DODATKU.includes(tryb)) throw new BladWejscia('tryb_dodatku', `Nieznany tryb dodatku ${tryb}`)
  const usluga = katalog.usluga(wejscie.uslugaId)
  if (!(usluga.dodatki ?? []).includes(uslugaId)) throw new BladWejscia('nieznany_dodatek', `Usługa ${usluga.id} nie ma dodatków z ${uslugaId}`)
  sprawdzIlosc(katalog.pozycja(uslugaId, pozycjaId), ilosc)
  const dodatki = wejscie.dodatki ?? []
  /** @param {DodatekWyceny} d */
  const czyTen = (d) => d.uslugaId === uslugaId && d.pozycjaId === pozycjaId
  if (ilosc === 0) return { ...wejscie, dodatki: dodatki.filter((d) => !czyTen(d)) }
  const dodatek = { uslugaId, pozycjaId, ilosc, tryb }
  if (!dodatki.some(czyTen)) return { ...wejscie, dodatki: [...dodatki, dodatek] }
  return { ...wejscie, dodatki: dodatki.map((d) => (czyTen(d) ? dodatek : d)) }
}

/** @param {WejscieWyceny} wejscie @param {number} km 0–MAKS_DOJAZDU_KM w jedna strone, inaczej BladWejscia `dojazd` @returns {WejscieWyceny} */
export function ustawDojazd(wejscie, km) {
  if (!Number.isFinite(km) || km < 0 || km > MAKS_DOJAZDU_KM) {
    throw new BladWejscia('dojazd', `Odległość ma być od 0 do ${MAKS_DOJAZDU_KM} km, jest ${km}`)
  }
  return { ...wejscie, dojazdKm: km }
}

/**
 * Prog metrazu powierzchni uslugi (ten sam co w silniku: ostatni prog z od_m2 ≤ m²) do banera „Małe/Duże zlecenie”.
 * @param {Usluga} usluga @param {number} m2 @param {Katalog} katalog
 * @returns {InfoProgu | null} null bez progow, przy pustej powierzchni albo mnozniku 1
 */
export function infoProgu(usluga, m2, katalog) {
  if (usluga.progi === undefined || !(m2 > 0)) return null
  const mnoznik = katalog.progMetrazu(usluga.progi, m2)
  if (mnoznik === MNOZNIK_NEUTRALNY) return null
  const progi = [...katalog.progiMetrazu(usluga.progi)].sort((a, b) => a.od_m2 - b.od_m2)
  const indeks = progi.findLastIndex((p) => p.od_m2 <= m2)
  const prog = progi[indeks]
  if (!prog) return null
  return { od: prog.od_m2, do: progi[indeks + 1]?.od_m2 ?? null, mnoznik }
}

/**
 * Dojazd: klient placi km ponad darmowy promien × stawka klienta, firma jezdzi tam i z powrotem po kilometrowce.
 * @param {number} km odleglosc w jedna strone @param {StawkiDojazdu} stawki z ustawien (scalKoszty) albo z data/ceny.json
 * @returns {InfoDojazdu}
 */
export function infoDojazdu(km, stawki) {
  if (!Number.isFinite(km) || km < 0) throw new BladWejscia('dojazd', `Odległość dojazdu musi być nieujemna, jest ${km}`)
  const kmPonad = Math.max(0, km - stawki.darmowy_promien_km)
  const kmRazem = KURSOW_NA_ZLECENIE * km
  return { kwotaKlienta: kmPonad * stawki.klient_zl_km, kmPonad, kosztFirmy: kmRazem * stawki.koszt_firmy_zl_km, kmRazem }
}

/**
 * Cena za jednostke pozycji w wojewodztwie (cena × wsp), bez progu i brudu — jak doplaty i dodatki w silniku.
 * @param {Katalog} katalog @param {string} uslugaId @param {string} pozycjaId @param {string | null} wojewodztwoId
 * @returns {number}
 */
export function cenaZaJednostke(katalog, uslugaId, pozycjaId, wojewodztwoId) {
  return katalog.pozycja(uslugaId, pozycjaId).cena * katalog.wojewodztwo(wojewodztwoId).wsp
}

/**
 * Kwota dodatku jak w silniku: ilosc × cena × wsp, a przy `doliczaj_material` plus material bez wsp.
 * @param {Pick<DodatekWyceny, 'uslugaId' | 'pozycjaId' | 'ilosc'>} dodatek @param {string | null} wojewodztwoId @param {Katalog} katalog
 * @returns {WycenaDodatku}
 */
export function wycenaDodatku({ uslugaId, pozycjaId, ilosc }, wojewodztwoId, katalog) {
  const pozycja = katalog.pozycja(uslugaId, pozycjaId)
  const cenaJedn = cenaZaJednostke(katalog, uslugaId, pozycjaId, wojewodztwoId)
  const material = pozycja.doliczaj_material ? ilosc * (pozycja.koszt_chemii_m2 ?? 0) : 0
  return { cenaJedn, kwota: ilosc * cenaJedn + material }
}
