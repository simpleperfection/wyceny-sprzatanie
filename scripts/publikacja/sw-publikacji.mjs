// dist/sw.js z pelna lista plikow i wersja cache z hasza zawartosci (R34): po publikacji aplikacja startuje offline
// w calosci nowa albo w calosci stara, bo cache zmienia tylko install, a addAll zapisuje wszystko albo nic.

import { createHash } from 'node:crypto'

import { BladPublikacji, PLIKI_CLOUDFLARE, STRONA_STARTOWA } from './pliki.mjs'

export const PLIK_WORKERA = 'sw.js'
/**
 * Pliki katalogu publikacji poza pamiecia offline (porownanie bez wielkosci liter). Kolejne wykluczenia dopisuje sie tutaj.
 * start.html to kopia index.html dla adresu `/`, ktory w pamieci reprezentuje `./`.
 */
export const POZA_PAMIECIA = [PLIK_WORKERA, 'robots.txt', ...PLIKI_CLOUDFLARE, STRONA_STARTOWA]
const ADRES_KATALOGU = './'
const PREFIKS_WERSJI = 'czysty-zarobek-'
const ZNAKI_WERSJI = 12

/** @param {string[]} pliki sciezki katalogu publikacji (z `/`) @returns {string[]} posortowane pliki do pamieci offline */
export function plikiPamieci(pliki) {
  return pliki.filter((plik) => !POZA_PAMIECIA.includes(plik.toLowerCase())).sort()
}

/** @param {ReadonlyArray<readonly [string, Uint8Array | string]>} zawartosci pary sciezka i zawartosc @returns {string} */
export function wersjaCache(zawartosci) {
  const skrot = createHash('sha256')
  const posortowane = [...zawartosci].sort(([a], [b]) => (a < b ? -1 : Number(a > b)))
  for (const [sciezka, zawartosc] of posortowane) {
    const bajty = typeof zawartosc === 'string' ? Buffer.from(zawartosc, 'utf8') : zawartosc
    skrot.update(`${sciezka}\0${bajty.length}\0`).update(bajty)
  }
  return `${PREFIKS_WERSJI}${skrot.digest('hex').slice(0, ZNAKI_WERSJI)}`
}

/** @param {string} tekst @param {string} nazwa @param {RegExp} wzorzec deklaracja w jednej linii (flagi gm) @param {string} wartosc */
function podmienStala(tekst, nazwa, wzorzec, wartosc) {
  const deklaracje = tekst.match(new RegExp(`\\b(?:const|let|var)\\s+${nazwa}\\b`, 'g'))?.length ?? 0
  const dopasowania = tekst.match(wzorzec)?.length ?? 0
  if (deklaracje !== 1 || dopasowania !== 1) {
    throw new BladPublikacji(`oczekiwano jednej deklaracji ${nazwa}, jest ${deklaracje} (w znanej postaci ${dopasowania})`, PLIK_WORKERA)
  }
  return tekst.replace(wzorzec, () => `const ${nazwa} = ${wartosc}`)
}

/**
 * Tekst dist/sw.js: wersja cache, lista `./` i plikow do pamieci oraz ZAPIS_W_BIEGU = false.
 * @param {string} tekst sw.js z repo @param {string[]} pliki pliki do pamieci (bez `./`) @param {string} wersja
 * @returns {string} @throws {BladPublikacji} gdy ktorejs stalej nie ma albo jest wiecej niz jedna
 */
export function swPublikacji(tekst, pliki, wersja) {
  // Koniec linii przed opcjonalnym \r: plik w repo moze miec CRLF (core.autocrlf).
  const tekstZWersja = podmienStala(tekst, 'WERSJA_CACHE', /^const WERSJA_CACHE = '[^'\r\n]*'(?=\r?$)/gm, JSON.stringify(wersja))
  const lista = JSON.stringify([ADRES_KATALOGU, ...pliki], null, 2)
  const tekstZLista = podmienStala(tekstZWersja, 'PLIKI_STARTOWE', /^const PLIKI_STARTOWE = \[[^\]]*\](?=\r?$)/gm, lista)
  return podmienStala(tekstZLista, 'ZAPIS_W_BIEGU', /^const ZAPIS_W_BIEGU = (?:true|false)(?=\r?$)/gm, 'false')
}
