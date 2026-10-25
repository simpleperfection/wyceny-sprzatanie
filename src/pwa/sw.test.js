// Service worker (sw.js w katalogu glownym) w Node przez node:vm: atrapy self, caches i fetch, prawdziwa logika strategii.

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it, mock } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const KOD_SW = await readFile(fileURLToPath(new URL('../../sw.js', import.meta.url)), 'utf8')
const ORIGIN = 'https://app.test'
const KATALOG = `${ORIGIN}/wyceny/`

/** @param {number} status @param {string} tresc @param {string} [typ] */
function odpowiedz(status, tresc, typ = 'basic') {
  return { status, type: typ, tresc, clone() { return odpowiedz(status, tresc, typ) } }
}

/** Cache po adresie bezwzglednym; `ignoreSearch` pomija zapytanie jak w przegladarce. */
class PamiecCache {
  constructor() {
    /** @type {Map<string, ReturnType<typeof odpowiedz>>} */
    this.wpisy = new Map()
  }

  /** @param {{ url: string } | string} zadanie */
  static adres(zadanie) {
    return new URL(typeof zadanie === 'string' ? zadanie : zadanie.url, KATALOG).href
  }

  /** @param {{ url: string } | string} zadanie @param {{ ignoreSearch?: boolean }} [opcje] */
  async match(zadanie, opcje = {}) {
    const adres = new URL(PamiecCache.adres(zadanie))
    adres.hash = ''
    if (opcje.ignoreSearch) adres.search = ''
    return this.wpisy.get(adres.href)
  }

  /** @param {{ url: string } | string} zadanie @param {ReturnType<typeof odpowiedz>} wartosc */
  async put(zadanie, wartosc) {
    this.wpisy.set(PamiecCache.adres(zadanie), wartosc)
  }
}

/** @param {(zadanie: unknown) => Promise<unknown>} implementacjaFetch */
function uruchomSw(implementacjaFetch) {
  /** @type {Record<string, (zdarzenie: unknown) => void>} */
  const obslugi = {}
  const cache = new PamiecCache()
  const fetch = mock.fn(implementacjaFetch)
  const reportError = mock.fn()
  const self = {
    location: new URL(`${KATALOG}sw.js`),
    addEventListener: (typ, obsluga) => { obslugi[typ] = obsluga },
    reportError,
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  }
  const caches = { open: async () => cache, keys: async () => [], delete: async () => true }
  vm.runInNewContext(KOD_SW, { self, caches, fetch, URL, Request, AbortSignal, setTimeout, clearTimeout, Promise, Error, TypeError, JSON, String })
  return { obslugi, cache, fetch, reportError }
}

/**
 * Zdarzenie fetch z zebranymi obietnicami waitUntil.
 * @param {(zdarzenie: unknown) => void} obsluga @param {{ url: string, mode?: string, method?: string }} zadanie
 */
async function pobierz(obsluga, zadanie) {
  /** @type {Promise<unknown>[]} */
  const wTle = []
  let wynik
  obsluga({
    request: { method: 'GET', mode: 'cors', ...zadanie },
    respondWith: (obietnica) => { wynik = obietnica },
    waitUntil: (obietnica) => { wTle.push(obietnica) },
  })
  const odpowiedzSw = await wynik
  // waitUntil moze dopisac kolejne obietnice w trakcie, wiec czekamy do ustania listy
  for (let i = 0; i < wTle.length; i += 1) await wTle[i]
  return odpowiedzSw
}

describe('sw.js: najpierw sieć (nawigacja)', () => {
  it('sieć odrzuca TypeError, a w cache jest index.html → nawigacja na ./#/start dostaje index.html', async () => {
    const { obslugi, cache } = uruchomSw(async () => { throw new TypeError('Failed to fetch') })
    await cache.put('index.html', odpowiedz(200, '<!doctype html>'))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}?zrodlo=pwa#/start`, mode: 'navigate' })

    assert.equal(wynik?.tresc, '<!doctype html>')
  })

  it('świeży index.html z sieci wygrywa z wpisem w cache przy nawigacji', async () => {
    const { obslugi, cache } = uruchomSw(async () => odpowiedz(200, 'nowa strona'))
    await cache.put('index.html', odpowiedz(200, 'stara strona'))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}index.html`, mode: 'navigate' })

    assert.equal(wynik?.tresc, 'nowa strona')
    assert.equal((await cache.match(`${KATALOG}index.html`))?.tresc, 'nowa strona')
  })
})

describe('sw.js: pliki aplikacji i danych od razu z cache (stale-while-revalidate)', () => {
  it('odpowiedź 200 basic z sieci trafia do cache pod adresem żądania', async () => {
    const { obslugi, cache } = uruchomSw(async () => odpowiedz(200, '{"wersja":1}'))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}data/ceny.json` })

    assert.equal(wynik?.tresc, '{"wersja":1}')
    assert.equal((await cache.match(`${KATALOG}data/ceny.json`))?.tresc, '{"wersja":1}')
  })

  it('odpowiedź 404 i odpowiedź opaque nie trafiają do cache', async () => {
    const { obslugi, cache } = uruchomSw(async (zadanie) => (String(/** @type {{ url: string }} */ (zadanie).url).endsWith('normy.json')
      ? odpowiedz(404, 'brak')
      : odpowiedz(200, 'obcy', 'opaque')))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}data/normy.json` })
    await pobierz(obslugi.fetch, { url: `${KATALOG}data/rynek.json` })

    assert.equal(wynik?.status, 404)
    assert.equal(cache.wpisy.size, 0)
  })

  it('data/*.json idzie tym trybem co moduły: stara wersja z cache, nowa w cache na następne uruchomienie', async () => {
    const { obslugi, cache } = uruchomSw(async () => odpowiedz(200, 'nowe'))
    await cache.put('data/ceny.json', odpowiedz(200, 'stare'))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}data/ceny.json` })

    assert.equal(wynik?.tresc, 'stare')
    assert.equal((await cache.match(`${KATALOG}data/ceny.json`))?.tresc, 'nowe')
  })

  it('moduł z cache wraca bez czekania na sieć, a odświeżona wersja trafia do cache w tle', async () => {
    const { obslugi, cache, fetch } = uruchomSw(async () => odpowiedz(200, 'nowy modul'))
    await cache.put('src/app.js', odpowiedz(200, 'stary modul'))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}src/app.js` })

    assert.equal(wynik?.tresc, 'stary modul')
    assert.equal(fetch.mock.callCount(), 1)
    assert.equal((await cache.match(`${KATALOG}src/app.js`))?.tresc, 'nowy modul')
  })

  it('wolna sieć nie opóźnia modułu z cache', async () => {
    const { obslugi, cache } = uruchomSw(() => new Promise(() => {}))
    await cache.put('src/ui/h.js', odpowiedz(200, 'h z cache'))
    /** @type {unknown} */
    let wynik
    obslugi.fetch({
      request: { method: 'GET', mode: 'cors', url: `${KATALOG}src/ui/h.js` },
      respondWith: (obietnica) => { wynik = obietnica },
      waitUntil: () => {},
    })

    assert.equal((await /** @type {Promise<{ tresc: string }>} */ (wynik)).tresc, 'h z cache')
  })

  it('bez wpisu w cache czeka na sieć; nieudane odświeżenie w tle zgłasza sw_odswiezenie', async () => {
    const { obslugi, cache, reportError } = uruchomSw(async () => { throw new TypeError('offline') })
    await cache.put('ikony/ikona-192.png', odpowiedz(200, 'png'))

    await assert.rejects(pobierz(obslugi.fetch, { url: `${KATALOG}fonty/brak.woff2` }), TypeError)
    const zCache = await pobierz(obslugi.fetch, { url: `${KATALOG}ikony/ikona-192.png` })

    assert.equal(zCache?.tresc, 'png')
    assert.equal(reportError.mock.callCount(), 1)
    assert.match(String(reportError.mock.calls[0].arguments[0].message), /"kod":"sw_odswiezenie"/)
  })

  it('żądania spoza originu i inne niż GET przechodzą bez service workera', () => {
    const { obslugi } = uruchomSw(async () => odpowiedz(200, 'x'))
    const respondWith = mock.fn()

    obslugi.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://obcy.pl/x.js' }, respondWith, waitUntil: () => {} })
    obslugi.fetch({ request: { method: 'POST', mode: 'cors', url: `${KATALOG}src/app.js` }, respondWith, waitUntil: () => {} })

    assert.equal(respondWith.mock.callCount(), 0)
  })
})

describe('sw.js: komunikat zapisz-zasoby', () => {
  /** @param {(zdarzenie: unknown) => void} obsluga @param {unknown} dane */
  async function wyslij(obsluga, dane) {
    /** @type {Promise<unknown>[]} */
    const wTle = []
    obsluga({ data: dane, waitUntil: (obietnica) => { wTle.push(obietnica) } })
    await Promise.all(wTle)
    return wTle.length
  }

  it('adres spoza originu nie jest pobierany', async () => {
    const { obslugi, fetch, cache } = uruchomSw(async () => odpowiedz(200, 'obcy'))

    await wyslij(obslugi.message, { typ: 'zapisz-zasoby', adresy: ['https://obcy.pl/x.js'] })

    assert.equal(fetch.mock.callCount(), 0)
    assert.equal(cache.wpisy.size, 0)
  })

  it('własny adres bez wpisu jest pobierany i zapisany; inny typ komunikatu jest pomijany', async () => {
    const { obslugi, fetch, cache } = uruchomSw(async () => odpowiedz(200, 'styl'))

    const pominiete = await wyslij(obslugi.message, { typ: 'inny', adresy: [`${KATALOG}style/aplikacja.css`] })
    await wyslij(obslugi.message, { typ: 'zapisz-zasoby', adresy: [`${KATALOG}style/aplikacja.css`, 42] })

    assert.equal(pominiete, 0)
    assert.equal(fetch.mock.callCount(), 1)
    assert.equal(fetch.mock.calls[0].arguments[0], `${KATALOG}style/aplikacja.css`)
    assert.equal((await cache.match(`${KATALOG}style/aplikacja.css`))?.tresc, 'styl')
  })
})
