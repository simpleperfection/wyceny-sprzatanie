// Lista plikow aplikacji, ktore trafiaja pod domene (R30), i graf strony oferty, ktora dziala bez logowania (R33).
// Lista dozwolonych zamiast zakazanych: nowy plik w repo nie trafia do publikacji, dopoki ktos nie dopisze go tutaj.
// Nowy katalog aplikacji dopisujesz do KATALOGI_APLIKACJI; nowy plik oferty wywraca test grafu w zbuduj.test.mjs.

import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

export const KATALOG_PUBLIKACJI = 'dist'
export const PREFIKS_OFERTY = 'publiczne'
export const STRONA_OFERTY = 'oferta.html'
export const STRONA_APLIKACJI = 'index.html'
/** Kopia index.html, na ktora wskazuje regula `/ /start.html 200` w _redirects (przy html_handling: none adres `/` daje 404). */
export const STRONA_STARTOWA = 'start.html'
/** Konfiguracja Cloudflare z katalogu scripts/publikacja/, kopiowana do korzenia katalogu publikacji. */
export const PLIKI_CLOUDFLARE = ['_headers', '_redirects']
/** Sciezki wyjete z logowania Cloudflare Access (R33, R34); ta sama lista jest w checkliscie operatora. */
export const SCIEZKI_BEZ_LOGOWANIA = ['/oferta.html', '/publiczne/*', '/sw.js', '/manifest.webmanifest', '/ikony/*', '/robots.txt']

/** Pliki z korzenia repo; kazdy musi istniec. */
const PLIKI_W_KORZENIU = [STRONA_APLIKACJI, STRONA_OFERTY, 'sw.js', 'manifest.webmanifest', 'robots.txt']
/** @type {ReadonlyArray<{ katalog: string, czyDozwolony: (nazwa: string) => boolean }>} */
const KATALOGI_APLIKACJI = [
  { katalog: 'data', czyDozwolony: (nazwa) => !nazwa.includes('/') && nazwa.endsWith('.json') },
  { katalog: 'fonty', czyDozwolony: (nazwa) => !nazwa.includes('/') && (nazwa.endsWith('.woff2') || nazwa === 'OFL.txt') },
  { katalog: 'ikony', czyDozwolony: (nazwa) => !nazwa.includes('/') },
  { katalog: 'src', czyDozwolony: (nazwa) => (nazwa.endsWith('.js') && !nazwa.endsWith('.test.js')) || nazwa.endsWith('.css') },
]

/** Siatka bezpieczenstwa po zapisie (porownanie bez wielkosci liter). Wyjatki dopisuje sie tu, a nie w zbuduj.mjs. */
export const ZAKAZANE_ROZSZERZENIA = ['.md', '.csv', '.ps1', '.pl', '.mjs', '.test.js']
export const ZAKAZANE_KATALOGI = ['docs', 'research', 'scripts', 'e2e', 'tests', '.claude', 'node_modules']

/** Wzorzec z src/oferta/graf.test.js: statyczne importy na poczatku linii, bez typedefow JSDoc `import(...)`. */
const IMPORT_STATYCZNY = /^\s*(?:import|export)\b[^'"`;=()]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm
/** Grupy: 1 poczatek atrybutu, 2 cudzyslow, 3 wartosc w cudzyslowie, 4 wartosc bez cudzyslowu. */
export const ATRYBUT_ADRESU = /(\s(?:href|src)\s*=\s*)(?:(["'])(.*?)\2|([^\s"'=<>`]+))/gis
const ADRES_W_CSS = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi
const WZORCE_ODWOLAN = /** @type {Record<string, RegExp>} */ ({ '.html': ATRYBUT_ADRESU, '.js': IMPORT_STATYCZNY, '.css': ADRES_W_CSS })
const BAZA_ADRESOW = 'https://publikacja.invalid/'

export class BladPublikacji extends Error {
  kod = 'BLAD_PUBLIKACJI'
  /** @param {string} przyczyna @param {string} plik */
  constructor(przyczyna, plik) {
    super(`${przyczyna}: ${plik}`)
    this.name = 'BladPublikacji'
  }
}

/** @param {string} katalog @returns {Promise<string[]>} wszystkie pliki (bez dowiazan) wzgledem katalogu, z `/`, posortowane */
export async function plikiWKatalogu(katalog) {
  const wpisy = await readdir(katalog, { recursive: true, withFileTypes: true })
  return wpisy.filter((wpis) => wpis.isFile())
    .map((wpis) => relative(katalog, join(wpis.parentPath, wpis.name)).split(sep).join('/'))
    .sort()
}

/** @param {string} korzen @returns {Promise<string[]>} posortowane sciezki plikow aplikacji z listy dozwolonych */
export async function plikiAplikacji(korzen) {
  const pliki = []
  for (const plik of PLIKI_W_KORZENIU) {
    const czyJest = await stat(join(korzen, plik)).then((info) => info.isFile(), (/** @type {NodeJS.ErrnoException} */ blad) => {
      if (blad.code === 'ENOENT') return false
      throw blad
    })
    if (!czyJest) throw new BladPublikacji('brak pliku aplikacji', plik)
    pliki.push(plik)
  }
  for (const { katalog, czyDozwolony } of KATALOGI_APLIKACJI) {
    const wKatalogu = await plikiWKatalogu(join(korzen, katalog)).catch((/** @type {NodeJS.ErrnoException} */ blad) => {
      if (blad.code === 'ENOENT') return []
      throw blad
    })
    const dozwolone = wKatalogu.filter((plik) => !plik.split('/').some((segment) => segment.startsWith('.')) && czyDozwolony(plik))
    pliki.push(...dozwolone.map((plik) => `${katalog}/${plik}`))
  }
  return pliki.sort()
}

/**
 * Pliki, do ktorych odwoluje sie tekst pliku (.html: href/src, .js: importy statyczne, .css: url() i @import).
 * Adresy rozwiazuje parser URL jak przegladarka; `data:` i same kotwice pomija, inna domena to blad.
 * @param {string} plik sciezka wzgledem korzenia strony @param {string} tekst @returns {string[]} sciezki wzgledem korzenia
 */
export function celeOdwolan(plik, tekst) {
  const wzorzec = WZORCE_ODWOLAN[extname(plik).toLowerCase()]
  if (!wzorzec) return []
  const adresPliku = new URL(plik, BAZA_ADRESOW)
  const cele = []
  for (const dopasowanie of tekst.matchAll(wzorzec)) {
    // W atrybucie grupa 2 to cudzyslow, a nie adres; w pozostalych wzorcach kazda grupa jest adresem.
    const grupyAdresu = wzorzec === ATRYBUT_ADRESU ? [dopasowanie[3], dopasowanie[4]] : dopasowanie.slice(1)
    const odwolanie = grupyAdresu.find((grupa) => grupa !== undefined) ?? ''
    if (odwolanie === '' || odwolanie.startsWith('#') || (URL.canParse(odwolanie) && new URL(odwolanie).protocol === 'data:')) continue
    const adres = new URL(odwolanie, adresPliku)
    if (adres.origin !== adresPliku.origin) throw new BladPublikacji('odwolanie do innej domeny', `${plik} -> ${odwolanie}`)
    cele.push(sciezkaAdresu(adres, `${plik} -> ${odwolanie}`))
  }
  return cele
}

/** @param {URL} adres @param {string} opis @returns {string} */
function sciezkaAdresu(adres, opis) {
  try {
    return decodeURIComponent(adres.pathname.slice(1))
  } catch (blad) {
    if (blad instanceof URIError) throw new BladPublikacji('zle zakodowany adres', opis)
    throw blad
  }
}

/** @param {string} korzen @returns {Promise<string[]>} posortowane pliki osiagalne z oferta.html (bez niej samej) */
export async function grafOferty(korzen) {
  const dozwolone = new Set(await plikiAplikacji(korzen))
  const odwiedzone = new Set([STRONA_OFERTY])
  const doSprawdzenia = [STRONA_OFERTY]
  for (let plik = doSprawdzenia.pop(); plik !== undefined; plik = doSprawdzenia.pop()) {
    if (!(extname(plik).toLowerCase() in WZORCE_ODWOLAN)) continue
    for (const cel of celeOdwolan(plik, await readFile(join(korzen, plik), 'utf8'))) {
      if (odwiedzone.has(cel)) continue
      if (!dozwolone.has(cel)) throw new BladPublikacji('oferta odwoluje sie do pliku brakujacego albo spoza listy', `${plik} -> ${cel}`)
      odwiedzone.add(cel)
      doSprawdzenia.push(cel)
    }
  }
  odwiedzone.delete(STRONA_OFERTY)
  return [...odwiedzone].sort()
}
