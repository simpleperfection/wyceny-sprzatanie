#!/usr/bin/env node
// Katalog publikacji: kopia plikow aplikacji z listy dozwolonych (R30) i katalog publiczne/ z grafem strony oferty,
// ktora dziala bez logowania (R33). Aplikacja nie ma kompilacji: skrypt tylko kopiuje pliki, przepisuje sciezki
// w dist/oferta.html, podmienia w dist/sw.js wersje cache i liste plikow (R34, sw-publikacji.mjs) i dodaje konfiguracje
// Cloudflare (_headers, _redirects) z kopia index.html jako start.html dla adresu `/`. Nieudana publikacja nie zostawia katalogu wyjsciowego, wiec nie ma czego wdrozyc.
//
// Uzycie: node scripts/publikacja/zbuduj.mjs [--korzen <repo>] [--wyjscie <katalog>]   (domyslnie repo i <repo>/dist)

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import {
  ATRYBUT_ADRESU, BladPublikacji, celeOdwolan, grafOferty, KATALOG_PUBLIKACJI, PLIKI_CLOUDFLARE, plikiAplikacji, plikiWKatalogu,
  PREFIKS_OFERTY, STRONA_APLIKACJI, STRONA_OFERTY, STRONA_STARTOWA, ZAKAZANE_KATALOGI, ZAKAZANE_ROZSZERZENIA,
} from './pliki.mjs'
import { PLIK_WORKERA, plikiPamieci, swPublikacji, wersjaCache } from './sw-publikacji.mjs'

const KORZEN_REPO = fileURLToPath(new URL('../..', import.meta.url))
/** _headers i _redirects leza obok skryptu: to konfiguracja publikacji, a nie plik repo z --korzen. */
const KATALOG_KONFIGURACJI = fileURLToPath(new URL('.', import.meta.url))
const KOD_BLEDU_PUBLIKACJI = 1

/** @param {string} korzen @param {string} wyjscie */
function sprawdzKatalogWyjsciowy(korzen, wyjscie) {
  const odWyjscia = relative(wyjscie, korzen)
  if (!odWyjscia.startsWith('..') && !isAbsolute(odWyjscia)) {
    throw new BladPublikacji('katalog wyjsciowy obejmuje repo, nie usune go', wyjscie)
  }
}

/** @param {string} wartosc @returns {boolean} adres wzgledny wobec strony (bez domeny, korzenia i samej kotwicy) */
function czyWzgledny(wartosc) {
  return wartosc !== '' && !wartosc.startsWith('#') && !wartosc.startsWith('/') && !wartosc.startsWith('\\') && !URL.canParse(wartosc)
}

/** @param {string} html @returns {string} html z prefiksem `publiczne/` w kazdym wzglednym href i src */
function przepiszStroneOferty(html) {
  return html.replace(ATRYBUT_ADRESU, (calosc, poczatek, cudzyslow = '', wCudzyslowie, bezCudzyslowu) => {
    const wartosc = wCudzyslowie ?? bezCudzyslowu ?? ''
    return czyWzgledny(wartosc) ? `${poczatek}${cudzyslow}${PREFIKS_OFERTY}/${wartosc}${cudzyslow}` : calosc
  })
}

/** @param {string} zrodlo @param {string} cel @param {string[]} pliki */
async function skopiuj(zrodlo, cel, pliki) {
  for (const plik of pliki) {
    await mkdir(dirname(join(cel, plik)), { recursive: true })
    await copyFile(join(zrodlo, plik), join(cel, plik))
  }
}

/** @param {string} plik */
function sprawdzNazwe(plik) {
  const segmenty = plik.toLowerCase().split('/')
  const nazwa = segmenty.pop() ?? ''
  if (segmenty.some((segment) => ZAKAZANE_KATALOGI.includes(segment))) throw new BladPublikacji('zakazany katalog w publikacji', plik)
  if (ZAKAZANE_ROZSZERZENIA.some((koncowka) => nazwa.endsWith(koncowka))) throw new BladPublikacji('zakazany plik w publikacji', plik)
}

/** @param {string} katalog @returns {Promise<string[]>} pliki katalogu po sprawdzeniu nazw i zamkniecia grafu oferty */
async function sprawdzWynik(katalog) {
  const pliki = await plikiWKatalogu(katalog)
  pliki.forEach(sprawdzNazwe)
  const istniejace = new Set(pliki)
  const publiczne = pliki.filter((plik) => plik.startsWith(`${PREFIKS_OFERTY}/`))
  for (const plik of [STRONA_OFERTY, ...publiczne]) {
    for (const cel of celeOdwolan(plik, await readFile(join(katalog, plik), 'utf8'))) {
      if (cel.startsWith(`${PREFIKS_OFERTY}/`) && istniejace.has(cel)) continue
      throw new BladPublikacji('odwolanie poza katalog publiczny albo do brakujacego pliku', `${plik} -> ${cel}`)
    }
  }
  return pliki
}

/** Podmienia dist/sw.js na wersje z pelna lista plikow; wersja cache to hasz plikow listy i samego workera. @param {string} katalog @param {string[]} pliki */
async function zapiszWorkera(katalog, pliki) {
  const sciezka = join(katalog, PLIK_WORKERA)
  const szablon = await readFile(sciezka, 'utf8')
  const doPamieci = plikiPamieci(pliki)
  const zawartosci = await Promise.all(doPamieci.map(async (plik) => /** @type {const} */ ([plik, await readFile(join(katalog, plik))])))
  await writeFile(sciezka, swPublikacji(szablon, doPamieci, wersjaCache([...zawartosci, [PLIK_WORKERA, szablon]])))
}

/**
 * Tworzy katalog publikacji: czysci katalog wyjsciowy, kopiuje pliki aplikacji i graf oferty, sprawdza wynik.
 * @param {string} korzen katalog repo @param {string} katalogWyjsciowy
 * @returns {Promise<string[]>} posortowane sciezki plikow w katalogu wyjsciowym (z `/`)
 * @throws {BladPublikacji} gdy brakuje pliku, oferta wychodzi poza liste albo w wyniku jest plik zakazany
 */
export async function zbuduj(korzen, katalogWyjsciowy) {
  const zrodlo = resolve(korzen)
  const cel = resolve(katalogWyjsciowy)
  sprawdzKatalogWyjsciowy(zrodlo, cel)
  await rm(cel, { recursive: true, force: true })
  try {
    const pliki = await plikiAplikacji(zrodlo)
    const graf = await grafOferty(zrodlo)
    await skopiuj(zrodlo, cel, pliki.filter((plik) => plik !== STRONA_OFERTY))
    await skopiuj(zrodlo, join(cel, PREFIKS_OFERTY), graf)
    await writeFile(join(cel, STRONA_OFERTY), przepiszStroneOferty(await readFile(join(zrodlo, STRONA_OFERTY), 'utf8')))
    await copyFile(join(zrodlo, STRONA_APLIKACJI), join(cel, STRONA_STARTOWA))
    await skopiuj(KATALOG_KONFIGURACJI, cel, PLIKI_CLOUDFLARE)
    const wynik = await sprawdzWynik(cel)
    await zapiszWorkera(cel, wynik)
    return wynik
  } catch (blad) {
    await rm(cel, { recursive: true, force: true })
    throw blad
  }
}

async function uruchom() {
  const { values } = parseArgs({ options: { korzen: { type: 'string' }, wyjscie: { type: 'string' } } })
  const korzen = values.korzen ?? KORZEN_REPO
  const wyjscie = values.wyjscie ?? join(korzen, KATALOG_PUBLIKACJI)
  const pliki = await zbuduj(korzen, wyjscie)
  process.stdout.write(`Publikacja: ${pliki.length} plikow w ${wyjscie}\n`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  uruchom().catch((/** @type {unknown} */ blad) => {
    const przyczyna = blad instanceof Error ? blad.message : String(blad)
    process.stderr.write(`${JSON.stringify({ kod: 'BLAD_PUBLIKACJI', przyczyna })}\n`)
    process.exitCode = KOD_BLEDU_PUBLIKACJI
  })
}
