import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  KATALOG_PUBLIKACJI, PLIKI_CLOUDFLARE, plikiWKatalogu, PREFIKS_OFERTY, SCIEZKI_BEZ_LOGOWANIA, STRONA_APLIKACJI, STRONA_OFERTY,
  STRONA_STARTOWA,
} from './pliki.mjs'
import { zbuduj } from './zbuduj.mjs'

const KORZEN_REPO = fileURLToPath(new URL('../../', import.meta.url))
const KATALOG_KONFIGURACJI = fileURLToPath(new URL('./', import.meta.url))
const CHECKLISTA_OPERATORA = join(KORZEN_REPO, 'docs/operator/zamkniety-dostep-testy-przygotowanie.md')
const CACHE_HTML = 'public, max-age=0, must-revalidate, no-transform'

/** @typedef {{ sciezka: string, naglowki: Map<string, string[]> }} RegulaNaglowkow */

/** @param {string} tekst @returns {string[]} linie bez komentarzy `#` i pustych (z zachowanym wcieciem) */
function linieKonfiguracji(tekst) {
  return tekst.normalize('NFC').split(/\r?\n/).filter((linia) => linia.trim() !== '' && !linia.trim().startsWith('#'))
}

/**
 * Format _headers Cloudflare: linia bez wciecia to wzorzec adresu, linie z wcieciem `Nazwa: wartosc` naleza do niego.
 * @param {string} tekst @returns {RegulaNaglowkow[]} nazwy naglowkow malymi literami
 */
function regulyNaglowkow(tekst) {
  /** @type {RegulaNaglowkow[]} */ const reguly = []
  for (const linia of linieKonfiguracji(tekst)) {
    if (!/^\s/.test(linia)) {
      reguly.push({ sciezka: linia.trim(), naglowki: new Map() })
      continue
    }
    const regula = reguly.at(-1)
    const dwukropek = linia.indexOf(':')
    if (!regula || dwukropek <= 0) assert.fail(`naglowek bez wzorca adresu albo bez dwukropka: ${linia}`)
    const nazwa = linia.slice(0, dwukropek).trim().toLowerCase()
    regula.naglowki.set(nazwa, [...(regula.naglowki.get(nazwa) ?? []), linia.slice(dwukropek + 1).trim()])
  }
  return reguly
}

/** @param {string} wartosc @returns {string[]} dyrektywy naglowka rozdzielone przecinkiem, malymi literami */
function dyrektywy(wartosc) {
  return wartosc.split(',').map((czesc) => czesc.trim().toLowerCase())
}

/** @param {string} wzorzec sciezka z SCIEZKI_BEZ_LOGOWANIA @param {string} plik sciezka w katalogu publikacji (bez `/`) */
function czyObejmuje(wzorzec, plik) {
  return wzorzec.endsWith('/*') ? `/${plik}`.startsWith(wzorzec.slice(0, -1)) : `/${plik}` === wzorzec
}

/** @param {string} tekst markdown @param {string} etykieta pierwsza komorka wiersza tabeli @returns {string[]} wartosci w `...` */
function wartosciWierszaTabeli(tekst, etykieta) {
  const wiersz = tekst.normalize('NFC').split(/\r?\n/)
    .filter((linia) => linia.trim().startsWith('|'))
    .map((linia) => linia.trim().split('|').slice(1, -1).map((komorka) => komorka.trim()))
    .find((komorki) => komorki[0] === etykieta.normalize('NFC'))
  if (!wiersz) assert.fail(`checklista nie ma wiersza „${etykieta}”`)
  return [...(wiersz[1] ?? '').matchAll(/`([^`]+)`/g)].map((dopasowanie) => dopasowanie[1] ?? '')
}

describe('cloudflare: wrangler.json', () => {
  it('ma workers_dev i preview_urls false, assets z katalogu publikacji i html_handling none, a nie ma main, route, routes ani observability', async () => {
    const konfiguracja = JSON.parse(await readFile(join(KORZEN_REPO, 'wrangler.json'), 'utf8'))

    assert.equal(konfiguracja.name, 'czysty-zarobek')
    assert.equal(konfiguracja.compatibility_date, '2026-11-05')
    assert.equal(konfiguracja.workers_dev, false)
    assert.equal(konfiguracja.preview_urls, false)
    assert.deepEqual(konfiguracja.assets, { directory: `./${KATALOG_PUBLIKACJI}`, html_handling: 'none' })
    for (const klucz of ['main', 'route', 'routes', 'observability']) assert.ok(!(klucz in konfiguracja), `wrangler.json ma ${klucz}`)
  })
})

describe('cloudflare: katalog publikacji z prawdziwego repo', () => {
  /** @type {string} */ let wyjscie
  /** @type {string[]} */ let pliki
  before(async () => {
    wyjscie = await mkdtemp(join(tmpdir(), 'publikacja-cloudflare-'))
    pliki = await zbuduj(KORZEN_REPO, wyjscie)
  })
  after(() => rm(wyjscie, { recursive: true, force: true }))

  it('_headers i _redirects w katalogu sa bajtowo rowne plikom z scripts/publikacja/', async () => {
    for (const plik of PLIKI_CLOUDFLARE) {
      assert.ok(pliki.includes(plik), `brak ${plik}`)
      assert.ok((await readFile(join(wyjscie, plik))).equals(await readFile(join(KATALOG_KONFIGURACJI, plik))), plik)
    }
  })

  it('_redirects ma dokladnie jedna regule / -> /start.html 200, a start.html jest bajtowo rowny index.html', async () => {
    const reguly = linieKonfiguracji(await readFile(join(wyjscie, '_redirects'), 'utf8')).map((linia) => linia.trim().split(/\s+/))
    const start = await readFile(join(wyjscie, STRONA_STARTOWA))

    assert.deepEqual(reguly, [['/', `/${STRONA_STARTOWA}`, '200']])
    assert.ok(start.equals(await readFile(join(wyjscie, STRONA_APLIKACJI))))
    assert.ok(start.equals(await readFile(join(KORZEN_REPO, STRONA_APLIKACJI))))
  })

  it('_headers: noindex, nofollow na /*, no-transform na /, /index.html i /oferta.html, a /* bez Cache-Control', async () => {
    const reguly = regulyNaglowkow(await readFile(join(wyjscie, '_headers'), 'utf8'))
    const wszystkie = reguly.find((regula) => regula.sciezka === '/*')

    assert.deepEqual(wszystkie?.naglowki.get('x-robots-tag')?.flatMap(dyrektywy), ['noindex', 'nofollow'])
    assert.equal(wszystkie?.naglowki.has('cache-control'), false)
    const zCache = reguly.filter((regula) => regula.naglowki.has('cache-control'))
    assert.deepEqual(zCache.map((regula) => regula.sciezka), ['/', `/${STRONA_APLIKACJI}`, `/${STRONA_OFERTY}`])
    for (const regula of zCache) {
      assert.deepEqual(regula.naglowki.get('cache-control')?.flatMap(dyrektywy), dyrektywy(CACHE_HTML), regula.sciezka)
      assert.ok(regula.naglowki.get('cache-control')?.flatMap(dyrektywy).includes('no-transform'), regula.sciezka)
    }
  })

  it('_headers: /* zakazuje ramek, zgadywania typu i Referer i wymusza HTTPS (HSTS na rok)', async () => {
    const reguly = regulyNaglowkow(await readFile(join(wyjscie, '_headers'), 'utf8'))
    const wszystkie = reguly.find((regula) => regula.sciezka === '/*')

    assert.deepEqual(wszystkie?.naglowki.get('content-security-policy'), ["frame-ancestors 'none'"])
    assert.deepEqual(wszystkie?.naglowki.get('x-frame-options'), ['DENY'])
    assert.deepEqual(wszystkie?.naglowki.get('x-content-type-options'), ['nosniff'])
    assert.deepEqual(wszystkie?.naglowki.get('referrer-policy'), ['no-referrer'])
    assert.deepEqual(wszystkie?.naglowki.get('strict-transport-security'), ['max-age=31536000'])
  })

  it('kazda sciezka bez logowania istnieje w katalogu, a sciezka z * obejmuje niepusty katalog', async () => {
    for (const sciezka of SCIEZKI_BEZ_LOGOWANIA) {
      assert.match(sciezka, /^\/[^*]+$|^\/[^*]+\/\*$/, `gwiazdka tylko jako /* na koncu: ${sciezka}`)
      if (!sciezka.endsWith('/*')) {
        assert.ok(pliki.includes(sciezka.slice(1)), `brak ${sciezka}`)
        continue
      }
      const wKatalogu = await plikiWKatalogu(join(wyjscie, sciezka.slice(1, -2)))
      assert.ok(wKatalogu.length > 0, `pusty katalog ${sciezka}`)
    }
    assert.ok(SCIEZKI_BEZ_LOGOWANIA.includes(`/${PREFIKS_OFERTY}/*`))
  })

  it('sciezki bez logowania nie obejmuja aplikacji: index.html, start.html, src/, data/ ani fonty/ zostaja za logowaniem', () => {
    const publiczne = pliki.filter((plik) => SCIEZKI_BEZ_LOGOWANIA.some((wzorzec) => czyObejmuje(wzorzec, plik)))

    assert.ok(publiczne.includes(STRONA_OFERTY) && publiczne.includes(`${PREFIKS_OFERTY}/src/oferta-start.js`))
    assert.deepEqual(publiczne.filter((plik) => /^(src|data|fonty)\//.test(plik) || [STRONA_APLIKACJI, STRONA_STARTOWA].includes(plik)), [])
    for (const plik of ['src/app.js', 'src/silnik/cena.js', 'data/ceny.json', STRONA_APLIKACJI]) {
      assert.ok(pliki.includes(plik) && !publiczne.includes(plik), `${plik} ma byc w katalogu i za logowaniem`)
    }
  })
})

describe('cloudflare: checklista operatora', () => {
  it('ma te same sciezki bez logowania, nazwe Workera z wrangler.json i polecenie budowania', async () => {
    const checklista = await readFile(CHECKLISTA_OPERATORA, 'utf8')
    const { name } = JSON.parse(await readFile(join(KORZEN_REPO, 'wrangler.json'), 'utf8'))

    assert.deepEqual(wartosciWierszaTabeli(checklista, 'Ścieżki bez logowania'), SCIEZKI_BEZ_LOGOWANIA)
    // Komorka nazwy ma dopisek z `name` i `wrangler.json`; nazwa Workera to pierwsza wartosc.
    assert.equal(wartosciWierszaTabeli(checklista, 'Nazwa Workera')[0], name)
    assert.deepEqual(wartosciWierszaTabeli(checklista, 'Build command'), ['node scripts/publikacja/zbuduj.mjs'])
  })
})
