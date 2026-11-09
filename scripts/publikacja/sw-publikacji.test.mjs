// dist/sw.js (R34): podmiana stalych, lista plikow i wersja z hasza; worker uruchamiany w node:vm jak w src/pwa/sw.test.js.

import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, describe, it, mock } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

import { plikiPamieci, swPublikacji, wersjaCache } from './sw-publikacji.mjs'
import { zbuduj } from './zbuduj.mjs'

const KORZEN_REPO = fileURLToPath(new URL('../../', import.meta.url))
const KOD_SW_REPO = await readFile(join(KORZEN_REPO, 'sw.js'), 'utf8')
const KATALOG = 'https://app.test/'
/** @type {string[]} */ const katalogi = []
after(() => Promise.all(katalogi.map((katalog) => rm(katalog, { recursive: true, force: true }))))

/** @param {number} status @param {string} tresc @returns {{ status: number, type: string, tresc: string, clone: () => unknown }} */
const odpowiedz = (status, tresc) => ({ status, type: 'basic', tresc, clone: () => odpowiedz(status, tresc) })

/** Worker w node:vm z atrapami cache, caches i sieci (siec zawsze odpowiada 200 „z sieci”). @param {string} kod */
function uruchomSw(kod) {
  /** @type {Record<string, (zdarzenie: unknown) => void>} */ const obslugi = {}
  const adres = (/** @type {{ url: string } | string} */ zadanie) => new URL(typeof zadanie === 'string' ? zadanie : zadanie.url, KATALOG).href
  const wpisy = new Map()
  const cache = {
    wpisy,
    match: async (/** @type {{ url: string } | string} */ zadanie) => wpisy.get(adres(zadanie)),
    put: async (/** @type {{ url: string } | string} */ zadanie, /** @type {unknown} */ wartosc) => { wpisy.set(adres(zadanie), wartosc) },
    addAll: mock.fn(async (/** @type {Array<{ url: string, cache: string }>} */ _zadania) => {}),
  }
  const nazwyCache = new Set()
  const caches = { open: async () => cache, keys: async () => [...nazwyCache], delete: async (/** @type {string} */ nazwa) => nazwyCache.delete(nazwa) }
  const fetch = mock.fn(async () => odpowiedz(200, 'z sieci'))
  const self = {
    location: new URL(`${KATALOG}sw.js`), addEventListener: (/** @type {string} */ typ, /** @type {(z: unknown) => void} */ obsluga) => { obslugi[typ] = obsluga },
    reportError: mock.fn(), skipWaiting: async () => {}, clients: { claim: async () => {} },
  }
  class Zadanie { constructor(/** @type {string} */ sciezka, /** @type {{ cache?: string }} */ opcje = {}) { this.url = adres(sciezka); this.cache = opcje.cache } }
  const kontekst = vm.createContext({ self, caches, fetch, URL, Request: Zadanie, AbortSignal, AbortController, setTimeout, clearTimeout, Promise, Error, TypeError, JSON, String })
  vm.runInContext(kod, kontekst)
  const stale = JSON.parse(vm.runInContext('JSON.stringify({ WERSJA_CACHE, PLIKI_STARTOWE, ZAPIS_W_BIEGU })', kontekst))
  return { obslugi, cache, fetch, nazwyCache, stale }
}

/** Zdarzenie install, activate albo fetch z zebranymi obietnicami; wynik respondWith, gdy byl. @param {(z: unknown) => void} obsluga @param {object} [zadanie] */
async function wyslij(obsluga, zadanie) {
  /** @type {Promise<unknown>[]} */ const wTle = []
  /** @type {unknown} */ let wynik
  obsluga({ request: { method: 'GET', mode: 'cors', ...zadanie }, respondWith: (/** @type {unknown} */ o) => { wynik = o }, waitUntil: (/** @type {Promise<unknown>} */ o) => { wTle.push(o) } })
  const odpowiedzSw = /** @type {{ tresc?: string } | undefined} */ (await wynik)
  for (let i = 0; i < wTle.length; i += 1) await wTle[i]
  return odpowiedzSw
}

/** @param {Record<string, string>} pliki @returns {Promise<string>} */
async function katalogTymczasowy(pliki = {}) {
  const katalog = await mkdtemp(join(tmpdir(), 'sw-publikacji-'))
  katalogi.push(katalog)
  for (const [sciezka, tresc] of Object.entries(pliki)) {
    await mkdir(dirname(join(katalog, sciezka)), { recursive: true })
    await writeFile(join(katalog, sciezka), tresc)
  }
  return katalog
}

describe('sw-publikacji: tekst workera, lista i wersja', () => {
  it('podmienia wersje, liste (z ./ na poczatku) i ZAPIS_W_BIEGU na false', () => {
    const wynik = swPublikacji(KOD_SW_REPO, ['index.html', 'src/app.js'], 'czysty-zarobek-abcdef123456')

    assert.deepEqual(uruchomSw(wynik).stale, {
      WERSJA_CACHE: 'czysty-zarobek-abcdef123456', PLIKI_STARTOWE: ['./', 'index.html', 'src/app.js'], ZAPIS_W_BIEGU: false,
    })
    assert.deepEqual(uruchomSw(KOD_SW_REPO).stale.ZAPIS_W_BIEGU, true)
  })

  const bledneTeksty = [
    ['bez WERSJA_CACHE', 'WERSJA_CACHE', KOD_SW_REPO.replace(/^const WERSJA_CACHE = .*$/m, '')],
    ['bez ZAPIS_W_BIEGU', 'ZAPIS_W_BIEGU', KOD_SW_REPO.replace(/^const ZAPIS_W_BIEGU = .*$/m, '')],
    ['z dwiema tablicami PLIKI_STARTOWE', 'PLIKI_STARTOWE', `${KOD_SW_REPO}\nconst PLIKI_STARTOWE = ['./']\n`],
    ['z ZAPIS_W_BIEGU w nieznanej postaci', 'ZAPIS_W_BIEGU', KOD_SW_REPO.replace(/^const ZAPIS_W_BIEGU = true/m, 'let ZAPIS_W_BIEGU = 1')],
  ]
  for (const [opis, nazwa, tekst] of bledneTeksty) {
    it(`tekst ${opis} konczy sie bledem BLAD_PUBLIKACJI`, () => {
      assert.notEqual(tekst, KOD_SW_REPO)
      assert.throws(() => swPublikacji(tekst, ['index.html'], 'czysty-zarobek-abcdef123456'), { kod: 'BLAD_PUBLIKACJI', message: new RegExp(`${nazwa}.*sw\\.js`) })
    })
  }

  it('lista pomija sw.js, robots.txt, _headers, _redirects i start.html (bez wielkosci liter) i jest posortowana', () => {
    const pliki = ['src/app.js', '_headers', 'ROBOTS.TXT', 'index.html', '_redirects', 'start.html', 'sw.js', 'publiczne/src/oferta-start.js', 'robots.txt']

    assert.deepEqual(plikiPamieci(pliki), ['index.html', 'publiczne/src/oferta-start.js', 'src/app.js'])
  })

  it('wersja to czysty-zarobek- i 12 znakow SHA-256 z par sciezka i zawartosc, niezaleznie od kolejnosci par', () => {
    assert.equal(wersjaCache([['a.js', 'x']]), 'czysty-zarobek-483719bb4c0d')
    assert.equal(wersjaCache([['b.js', 'y'], ['a.js', Buffer.from('x')]]), 'czysty-zarobek-19fbeb1dfd1c')
  })
})

describe('sw-publikacji: dist/sw.js z prawdziwego repo', () => {
  /** @type {string[]} */ let pliki
  /** @type {string} */ let kodDist
  before(async () => {
    const wyjscie = await katalogTymczasowy()
    pliki = await zbuduj(KORZEN_REPO, wyjscie)
    kodDist = await readFile(join(wyjscie, 'sw.js'), 'utf8')
  })

  it('install wywoluje addAll z ./ i kazdym plikiem dist/ poza sw.js, robots.txt, _headers, _redirects i start.html, takze src/app.js i publiczne/src/oferta-start.js', async () => {
    const { obslugi, cache, stale } = uruchomSw(kodDist)

    await wyslij(obslugi.install)

    // Array.from: tablica z kontekstu vm ma inny prototyp niz tablica testu.
    const adresy = Array.from(cache.addAll.mock.calls[0].arguments[0], ({ url, cache: tryb }) => `${tryb} ${url}`)
    const pozaPamiecia = ['sw.js', 'robots.txt', '_headers', '_redirects', 'start.html']
    assert.deepEqual(pozaPamiecia.filter((plik) => !pliki.includes(plik)), [], 'dist/ nie ma ktoregos z plikow poza pamiecia')
    const oczekiwane = ['./', ...pliki.filter((plik) => !pozaPamiecia.includes(plik))]
    assert.deepEqual(adresy, oczekiwane.map((plik) => `reload ${new URL(plik, KATALOG).href}`))
    for (const plik of ['src/app.js', 'publiczne/src/oferta-start.js', 'index.html']) assert.ok(stale.PLIKI_STARTOWE.includes(plik), plik)
    assert.match(stale.WERSJA_CACHE, /^czysty-zarobek-[0-9a-f]{12}$/)
  })

  it('ZAPIS_W_BIEGU = false: plik z cache wraca bez sieci, a nawigacja i plik spoza cache z sieci nic nie zapisuja', async () => {
    const { obslugi, cache, fetch } = uruchomSw(kodDist)
    await cache.put('src/app.js', odpowiedz(200, 'z cache'))

    const modul = await wyslij(obslugi.fetch, { url: `${KATALOG}src/app.js` })
    assert.equal(modul?.tresc, 'z cache')
    assert.equal(fetch.mock.callCount(), 0)

    const strona = await wyslij(obslugi.fetch, { url: `${KATALOG}index.html`, mode: 'navigate' })
    const dane = await wyslij(obslugi.fetch, { url: `${KATALOG}data/ceny.json` })
    assert.deepEqual([strona?.tresc, dane?.tresc], ['z sieci', 'z sieci'])
    assert.deepEqual([...cache.wpisy.keys()], [`${KATALOG}src/app.js`])
  })

  it('sw.js z repo dalej oddaje plik z cache i odswieza go w tle', async () => {
    const { obslugi, cache, fetch } = uruchomSw(KOD_SW_REPO)
    await cache.put('src/app.js', odpowiedz(200, 'z cache'))

    const modul = await wyslij(obslugi.fetch, { url: `${KATALOG}src/app.js` })

    assert.equal(modul?.tresc, 'z cache')
    assert.equal(fetch.mock.callCount(), 1)
    assert.equal((await cache.match('src/app.js'))?.tresc, 'z sieci')
  })

  it('activate usuwa stary cache czysty-zarobek-v1 i zostawia biezacy', async () => {
    const { obslugi, nazwyCache, stale } = uruchomSw(kodDist)
    for (const nazwa of ['czysty-zarobek-v1', stale.WERSJA_CACHE]) nazwyCache.add(nazwa)

    await wyslij(obslugi.activate)

    assert.notEqual(stale.WERSJA_CACHE, 'czysty-zarobek-v1')
    assert.deepEqual([...nazwyCache], [stale.WERSJA_CACHE])
  })
})

describe('sw-publikacji: wersja z zawartosci plikow', () => {
  const MALE_REPO = {
    'index.html': '<!doctype html>', 'oferta.html': '<!doctype html>', 'sw.js': KOD_SW_REPO,
    'manifest.webmanifest': '{}', 'robots.txt': 'User-agent: *', 'src/a.js': 'export const a = 1',
  }

  /** @param {Record<string, string>} pliki @returns {Promise<string>} tekst dist/sw.js */
  async function zbudujSw(pliki) {
    const korzen = await katalogTymczasowy(pliki)
    const wyjscie = await katalogTymczasowy()
    await zbuduj(korzen, wyjscie)
    return readFile(join(wyjscie, 'sw.js'), 'utf8')
  }

  it('dwa zbudowania tego samego repo daja identyczny dist/sw.js, a jeden bajt w pliku aplikacji zmienia wersje', async () => {
    const pierwszy = await zbudujSw(MALE_REPO)
    const drugi = await zbudujSw(MALE_REPO)
    const poZmianie = await zbudujSw({ ...MALE_REPO, 'src/a.js': 'export const a = 2' })

    assert.equal(drugi, pierwszy)
    assert.notEqual(uruchomSw(poZmianie).stale.WERSJA_CACHE, uruchomSw(pierwszy).stale.WERSJA_CACHE)
    assert.deepEqual(uruchomSw(poZmianie).stale.PLIKI_STARTOWE, uruchomSw(pierwszy).stale.PLIKI_STARTOWE)
  })
})
