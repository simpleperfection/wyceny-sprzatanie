// Czas pracy uslug: odpowiedniki Minuty, Z-Brudem i Skala-Biura ze scripts/kalibracja.ps1 oraz czas pozycji
// (wzor_pozycji w data/normy.json). Kolejnosc dzialan jak w skrypcie, zeby wyniki zgadzaly sie z research/KALIBRACJA.md.

import { BladWejscia } from './bledy.js'
import { sprawdzIlosc, sprawdzMetraz } from './walidacja.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./katalog.js').Usluga} Usluga */
/** @typedef {import('./katalog.js').Pozycja} Pozycja */
/** @typedef {import('./katalog.js').RegulaBrudu} RegulaBrudu */
/** @typedef {{ id: string, poziom: number }} BrudPomieszczenia */
/** @typedef {{ typ: string, m2: number, brud?: BrudPomieszczenia[] }} PomieszczenieCzasu */
/** @typedef {{ id: string, ilosc: number }} IloscPozycji */
/** @typedef {{ uslugaId: string, pozycjaId: string, ilosc: number }} IloscDodatku */

const ZESTAW_BIURA = 'biuro'
const MNOZNIK_NEUTRALNY = 1
const REGULA_KAZDE_POMIESZCZENIE = '*'

/**
 * Dopisuje do pomieszczen brud z regul uslugi (`pomieszczenie: '*'` = kazde pomieszczenie, inaczej typ pomieszczenia).
 * @template {PomieszczenieCzasu} T
 * @param {T[]} uklad
 * @param {RegulaBrudu[] | undefined} reguly
 * @returns {(T & { brud: BrudPomieszczenia[] })[]}
 */
export function zBrudem(uklad, reguly) {
  return uklad.map((p) => {
    const pasujace = (reguly ?? []).filter((r) => r.pomieszczenie === REGULA_KAZDE_POMIESZCZENIE || r.pomieszczenie === p.typ)
    return { ...p, brud: [...(p.brud ?? []), ...pasujace.map((r) => ({ id: r.brud, poziom: r.poziom }))] }
  })
}

/**
 * Ustawia poziom brudu z regul w pasujacych pomieszczeniach (`*` = kazde): zastepuje ten sam rodzaj brudu zamiast go dopisywac,
 * np. skutek odpowiedzi klienta wobec `brud_domyslny` uslugi.
 * @template {PomieszczenieCzasu} T
 * @param {T[]} pomieszczenia
 * @param {readonly RegulaBrudu[]} reguly
 * @returns {T[]}
 */
export function zPoziomemBrudu(pomieszczenia, reguly) {
  return reguly.reduce((wynik, r) => wynik.map((p) => (r.pomieszczenie === REGULA_KAZDE_POMIESZCZENIE || r.pomieszczenie === p.typ
    ? { ...p, brud: [...(p.brud ?? []).filter((b) => b.id !== r.brud), { id: r.brud, poziom: r.poziom }] }
    : p)), pomieszczenia)
}

/**
 * Minuty uslugi z pomieszczeniami = przygotowanie + Σ m² × norma pomieszczenia × mnoznik + Σ m² × norma brudu poziomu.
 * @param {PomieszczenieCzasu[]} pomieszczenia
 * @param {number} mnoznik mnoznik zakresu uslugi (z mnoznikZakresu)
 * @param {Katalog} katalog
 * @returns {number}
 */
export function minutyPomieszczen(pomieszczenia, mnoznik, katalog) {
  if (!Number.isFinite(mnoznik) || mnoznik <= 0) throw new BladWejscia('mnoznik', `Mnożnik zakresu musi być dodatni, jest ${mnoznik}`)
  let minuty = katalog.przygotowanieMin
  for (const p of pomieszczenia) {
    sprawdzMetraz(p.m2)
    minuty += p.m2 * katalog.normaPomieszczenia(p.typ) * mnoznik
    for (const b of p.brud ?? []) minuty += p.m2 * katalog.normaBrudu(b.id, b.poziom)
  }
  return minuty
}

/**
 * Mnoznik wydajnosci duzego biura z progi_wydajnosci.biuro (ostatni prog, ktorego od_m2 <= m2).
 * @param {number} m2
 * @param {Katalog} katalog
 * @returns {number}
 */
export function skalaBiura(m2, katalog) {
  sprawdzMetraz(m2)
  return katalog.progiWydajnosciBiura.reduce((mnoznik, prog) => (m2 >= prog.od_m2 ? prog.mnoznik : mnoznik), MNOZNIK_NEUTRALNY)
}

/**
 * Mnoznik zakresu: w biurze mnoznik wariantu × skala biura, w pozostalych uslugach mnoznik_zakresu uslugi.
 * @param {Usluga} usluga
 * @param {string | null} wariantId
 * @param {number} m2Razem metraz wszystkich pomieszczen
 * @param {Katalog} katalog
 * @returns {number}
 */
export function mnoznikZakresu(usluga, wariantId, m2Razem, katalog) {
  if (usluga.zestaw_pomieszczen !== ZESTAW_BIURA) return usluga.mnoznik_zakresu ?? MNOZNIK_NEUTRALNY
  const wariant = (usluga.warianty ?? []).find((w) => w.id === wariantId)
  if (!wariant) throw new BladWejscia('nieznany_wariant', `Nieznany wariant ${wariantId} usługi ${usluga.id}`)
  return wariant.mnoznik_zakresu * skalaBiura(m2Razem, katalog)
}

/**
 * Mnoznik poziomu brudu z data/ceny.json; tylko dla uslug z poziomy_brudu, w pozostalych 1.
 * @param {Usluga} usluga
 * @param {number} poziom
 * @param {Katalog} katalog
 * @returns {number}
 */
export function mnoznikBrudu(usluga, poziom, katalog) {
  if (!usluga.poziomy_brudu) return MNOZNIK_NEUTRALNY
  const znaleziony = katalog.poziomyBrudu.find((p) => p.poziom === poziom)
  if (!znaleziony) throw new BladWejscia('poziom_brudu', `Nieznany poziom brudu ${poziom}`)
  return znaleziony.mnoznik
}

/**
 * Mnoznik brudu pozycji: doplaty (`typ: 'doplata'`) ida bez niego, pozycje glowne z mnoznikiem brudu uslugi.
 * @param {Pozycja} pozycja
 * @param {number} brud mnoznik brudu uslugi (z mnoznikBrudu)
 * @returns {number}
 */
export function brudPozycji(pozycja, brud) {
  return pozycja.typ === 'doplata' ? MNOZNIK_NEUTRALNY : brud
}

/**
 * Minuty jednej pozycji uslugi = ilosc × min na jednostke × mnoznik brudu pozycji (bez przygotowania).
 * @param {string} uslugaId
 * @param {Pozycja} pozycja
 * @param {number} ilosc
 * @param {number} brud mnoznik brudu uslugi (z mnoznikBrudu)
 * @param {Katalog} katalog
 * @returns {number}
 */
export function minutyJednejPozycji(uslugaId, pozycja, ilosc, brud, katalog) {
  sprawdzIlosc(ilosc)
  return ilosc * katalog.normaPozycji(`${uslugaId}.${pozycja.id}`).min_na_jednostke * brudPozycji(pozycja, brud)
}

/**
 * Minuty uslugi z pozycjami = przygotowanie uslugi + Σ minut pozycji (minutyJednejPozycji).
 * @param {string} uslugaId
 * @param {IloscPozycji[]} pozycje
 * @param {number} poziomBrudu 1–3; brany pod uwage tylko przy uslugach z poziomy_brudu
 * @param {Katalog} katalog
 * @returns {number}
 */
export function minutyPozycji(uslugaId, pozycje, poziomBrudu, katalog) {
  const usluga = katalog.usluga(uslugaId)
  const brud = mnoznikBrudu(usluga, poziomBrudu, katalog)
  let minuty = katalog.przygotowanie(uslugaId)
  for (const { id, ilosc } of pozycje) {
    sprawdzIlosc(ilosc)
    minuty += minutyJednejPozycji(uslugaId, katalog.pozycja(uslugaId, id), ilosc, brud, katalog)
  }
  return minuty
}

/**
 * Minuty dodatkow z innych uslug wliczonych w cene (bez przygotowania i bez mnoznika brudu).
 * @param {IloscDodatku[]} dodatki
 * @param {Katalog} katalog
 * @returns {number}
 */
export function minutyDodatkow(dodatki, katalog) {
  let minuty = 0
  for (const { uslugaId, pozycjaId, ilosc } of dodatki) {
    sprawdzIlosc(ilosc)
    minuty += ilosc * katalog.normaPozycji(`${uslugaId}.${pozycjaId}`).min_na_jednostke
  }
  return minuty
}
