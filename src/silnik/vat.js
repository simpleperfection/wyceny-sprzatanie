// Cena dla klienta wedlug statusu VAT firmy i podstawy ceny uslugi (decyzja wlasciciela 2026-10-24: „wg podstawy ceny”).
// Brutto (kwota placona przez klienta) w pelnych zlotych; netto i VAT w groszach liczone od zaokraglonego brutto.

import { BladWejscia } from './bledy.js'

/** @typedef {'czynny' | 'zwolniony'} StatusVat */
/** @typedef {{ brutto: number, netto: number, vat: number }} CenaKlienta */

const STATUSY_VAT = ['czynny', 'zwolniony']
const PODSTAWY_CENY = ['brutto', 'netto']
const PROCENT = 100
const GROSZE_W_ZLOTYM = 100

/** @param {number} kwota */
function doGroszy(kwota) {
  return Math.round(kwota * GROSZE_W_ZLOTYM) / GROSZE_W_ZLOTYM
}

/**
 * @param {unknown} status
 * @returns {asserts status is StatusVat}
 */
export function sprawdzStatusVat(status) {
  if (typeof status !== 'string' || !STATUSY_VAT.includes(status)) throw new BladWejscia('status_vat', `Nieznany status VAT ${String(status)}`)
}

/** @param {number} stawkaVatProc */
function sprawdzStawke(stawkaVatProc) {
  if (!Number.isFinite(stawkaVatProc) || stawkaVatProc < 0 || stawkaVatProc > PROCENT) {
    throw new BladWejscia('stawka_vat', `Stawka VAT musi być w przedziale [0, ${PROCENT}], jest ${stawkaVatProc}`)
  }
}

/**
 * Cena dla klienta z kwoty modelu: firma zwolniona bierze kwote bez zmian; czynny podatnik przy podstawie `brutto`
 * traktuje kwote jako brutto, a przy `netto` dolicza VAT na gorze.
 * @param {{ kwota: number, podstawaCeny: string, statusVat: StatusVat, stawkaVatProc: number }} wejscie
 * @returns {CenaKlienta}
 */
export function cenaDlaKlienta({ kwota, podstawaCeny, statusVat, stawkaVatProc }) {
  if (!Number.isFinite(kwota) || kwota < 0) throw new BladWejscia('kwota', `Kwota musi być nieujemna, jest ${kwota}`)
  if (!PODSTAWY_CENY.includes(podstawaCeny)) throw new BladWejscia('podstawa_ceny', `Nieznana podstawa ceny ${podstawaCeny}`)
  sprawdzStatusVat(statusVat)
  if (statusVat === 'zwolniony') {
    const brutto = Math.round(kwota)
    return { brutto, netto: brutto, vat: 0 }
  }
  sprawdzStawke(stawkaVatProc)
  const mnoznik = 1 + stawkaVatProc / PROCENT
  const brutto = Math.round(podstawaCeny === 'netto' ? kwota * mnoznik : kwota)
  const netto = doGroszy(brutto / mnoznik)
  return { brutto, netto, vat: doGroszy(brutto - netto) }
}

/**
 * Cena wpisana recznie to zawsze kwota placona przez klienta (brutto), niezaleznie od podstawy ceny uslugi.
 * @param {number} brutto
 * @param {StatusVat} statusVat
 * @param {number} stawkaVatProc
 * @returns {CenaKlienta}
 */
export function zCenyRecznej(brutto, statusVat, stawkaVatProc) {
  return cenaDlaKlienta({ kwota: brutto, podstawaCeny: 'brutto', statusVat, stawkaVatProc })
}
