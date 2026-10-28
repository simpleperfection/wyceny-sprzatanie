// Pomocnicze funkcje testow silnika (tylko Node): katalog z prawdziwych plikow data/ albo z malego fixture'a.

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { wczytajKatalog } from '../src/silnik/katalog.js'

const KORZEN_REPO = new URL('../', import.meta.url)
const FIXTURE_KATALOGU = new URL('fixtures/katalog-maly.json', import.meta.url)
const PLIK_FIXTURE = /** @type {Record<string, 'ceny' | 'normy' | 'rynek'>} */ ({
  'data/ceny.json': 'ceny',
  'data/normy.json': 'normy',
  'data/rynek.json': 'rynek',
})

/** @param {string} sciezka sciezka wzgledem katalogu glownego repo */
export async function czytajJson(sciezka) {
  return JSON.parse(await readFile(fileURLToPath(new URL(sciezka, KORZEN_REPO)), 'utf8'))
}

export function katalogZDysku() {
  return wczytajKatalog(czytajJson)
}

/** Swieza kopia danych z tests/fixtures/katalog-maly.json ({ ceny, normy, rynek }), do zmiany w tescie. */
export async function daneTestowe() {
  return JSON.parse(await readFile(fileURLToPath(FIXTURE_KATALOGU), 'utf8'))
}

/** @param {{ ceny: unknown, normy: unknown, rynek: unknown }} dane */
export function katalogZDanych(dane) {
  return wczytajKatalog(async (sciezka) => dane[PLIK_FIXTURE[sciezka]])
}

export async function katalogTestowy() {
  return katalogZDanych(await daneTestowe())
}

/** @param {number} wynik @param {number} oczekiwany @param {number} [dokladnosc] */
export function assertBlisko(wynik, oczekiwany, dokladnosc = 1e-9) {
  assert.ok(Math.abs(wynik - oczekiwany) <= dokladnosc, `${wynik} rozni sie od ${oczekiwany} o wiecej niz ${dokladnosc}`)
}
