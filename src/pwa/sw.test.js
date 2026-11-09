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

  /** Przy `install`; test podmienia implementacje, zeby odrzucic zapis. */
  addAll = mock.fn(async (/** @type {unknown[]} */ _zadania) => {})
}

/** Request z Node nie przyjmuje adresow wzglednych; jak przegladarka rozwiazuje je wzgledem katalogu workera. */
class AtrapaZadania {
  /** @param {string} adres @param {{ cache?: string }} [opcje] */
  constructor(adres, opcje = {}) {
    this.url = new URL(adres, KATALOG).href
    this.cache = opcje.cache
  }
}

/** @param {(zadanie: unknown) => Promise<unknown>} implementacjaFetch @param {object} [zamiennikiPrzegladarki] np. starsze AbortSignal */
function uruchomSw(implementacjaFetch, zamiennikiPrzegladarki = {}) {
  /** @type {Record<string, (zdarzenie: unknown) => void>} */
  const obslugi = {}
  const cache = new PamiecCache()
  const fetch = mock.fn(implementacjaFetch)
  const reportError = mock.fn()
  const self = {
    location: new URL(`${KATALOG}sw.js`),
    addEventListener: (typ, obsluga) => { obslugi[typ] = obsluga },
    reportError,
    skipWaiting: mock.fn(async () => {}),
    clients: { claim: mock.fn(async () => {}) },
  }
  /** Nazwy cache w przegladarce; test wpisuje je przed `activate`. */
  const nazwyCache = new Set()
  const caches = {
    open: async () => cache,
    keys: async () => [...nazwyCache],
    delete: mock.fn(async (/** @type {string} */ nazwa) => nazwyCache.delete(nazwa)),
  }
  vm.runInNewContext(KOD_SW, { self, caches, fetch, URL, Request: AtrapaZadania, AbortSignal, AbortController, setTimeout, clearTimeout, Promise, Error, TypeError, JSON, String, ...zamiennikiPrzegladarki })
  return { obslugi, cache, fetch, reportError, self, nazwyCache, caches }
}

/** Zdarzenie install albo activate: obietnica przekazana do waitUntil. @param {(zdarzenie: unknown) => void} obsluga */
function zdarzenieCyklu(obsluga) {
  /** @type {Promise<unknown> | undefined} */
  let obietnica
  obsluga({ waitUntil: (/** @type {Promise<unknown>} */ p) => { obietnica = p } })
  return obietnica
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

  it('przekierowanie na logowanie (opaqueredirect, status 0) idzie do przeglądarki i nie trafia do cache', async () => {
    const { obslugi, cache } = uruchomSw(async () => odpowiedz(0, '', 'opaqueredirect'))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}index.html`, mode: 'navigate' })

    assert.equal(wynik?.type, 'opaqueredirect')
    assert.equal(wynik?.status, 0)
    assert.equal(cache.wpisy.size, 0)
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

  it('moduł z cache, którego odświeżenie przekierowano na logowanie (TypeError): wraca kopia z cache i zgłoszenie sw_odswiezenie', async () => {
    const { obslugi, cache, reportError } = uruchomSw(async () => { throw new TypeError('Failed to fetch') })
    await cache.put('src/app.js', odpowiedz(200, 'modul z cache'))

    const wynik = await pobierz(obslugi.fetch, { url: `${KATALOG}src/app.js` })

    assert.equal(wynik?.tresc, 'modul z cache')
    assert.equal((await cache.match(`${KATALOG}src/app.js`))?.tresc, 'modul z cache')
    assert.equal(reportError.mock.callCount(), 1)
    assert.deepEqual(
      JSON.parse(String(reportError.mock.calls[0].arguments[0].message)),
      { kod: 'sw_odswiezenie', przyczyna: 'TypeError: Failed to fetch' },
    )
  })

  it('żądania spoza originu i inne niż GET przechodzą bez service workera', () => {
    const { obslugi } = uruchomSw(async () => odpowiedz(200, 'x'))
    const respondWith = mock.fn()

    obslugi.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://obcy.pl/x.js' }, respondWith, waitUntil: () => {} })
    obslugi.fetch({ request: { method: 'POST', mode: 'cors', url: `${KATALOG}src/app.js` }, respondWith, waitUntil: () => {} })

    assert.equal(respondWith.mock.callCount(), 0)
  })

  it('powrót z logowania i zasoby spod /cdn-cgi/ przechodzą bez service workera; podobna ścieżka w katalogu aplikacji nie', () => {
    const { obslugi } = uruchomSw(async () => odpowiedz(200, 'x'))
    const respondWith = mock.fn()
    const zKatalogu = mock.fn()

    obslugi.fetch({ request: { method: 'GET', mode: 'navigate', url: `${ORIGIN}/cdn-cgi/access/authorized?kod=1` }, respondWith, waitUntil: () => {} })
    obslugi.fetch({ request: { method: 'GET', mode: 'cors', url: `${ORIGIN}/cdn-cgi/scripts/skrypt.js` }, respondWith, waitUntil: () => {} })
    obslugi.fetch({ request: { method: 'GET', mode: 'cors', url: `${ORIGIN}/CDN-CGI/access/logout` }, respondWith, waitUntil: () => {} })
    obslugi.fetch({ request: { method: 'GET', mode: 'cors', url: `${KATALOG}cdn-cgi/notatka.json` }, respondWith: zKatalogu, waitUntil: () => {} })

    assert.equal(respondWith.mock.callCount(), 0)
    assert.equal(zKatalogu.mock.callCount(), 1)
  })
})

describe('sw.js: install i activate', () => {
  it('install zapisuje wszystkie PLIKI_STARTOWE z pominięciem cache HTTP, potem skipWaiting', async () => {
    const { obslugi, cache, self } = uruchomSw(async () => odpowiedz(200, 'x'))

    await zdarzenieCyklu(obslugi.install)

    assert.equal(cache.addAll.mock.callCount(), 1)
    const zadania = [...cache.addAll.mock.calls[0].arguments[0]].map(({ url, cache: tryb }) => ({ url, tryb }))
    assert.deepEqual(zadania, [
      './', 'index.html', 'oferta.html', 'manifest.webmanifest',
      'data/ceny.json', 'data/normy.json', 'data/rynek.json', 'data/chemia.json',
      'data/domyslne.json', 'data/pytania.json', 'data/zakresy.json',
    ].map((plik) => ({ url: new URL(plik, KATALOG).href, tryb: 'reload' })))
    assert.equal(self.skipWaiting.mock.callCount(), 1)
  })

  it('odrzucone addAll (np. przekierowanie na logowanie) odrzuca obietnicę z waitUntil i nie przejmuje strony', async () => {
    const { obslugi, cache, self } = uruchomSw(async () => odpowiedz(200, 'x'))
    const blad = new TypeError('Failed to fetch')
    cache.addAll.mock.mockImplementation(async () => { throw blad })

    await assert.rejects(zdarzenieCyklu(obslugi.install), (odrzucenie) => odrzucenie === blad)

    assert.equal(self.skipWaiting.mock.callCount(), 0)
  })

  it('activate usuwa cache o innej nazwie, zostawia bieżący i przejmuje strony', async () => {
    const { obslugi, nazwyCache, caches, self } = uruchomSw(async () => odpowiedz(200, 'x'))
    for (const nazwa of ['czysty-zarobek-v0', 'czysty-zarobek-v1', 'obcy-cache']) nazwyCache.add(nazwa)

    await zdarzenieCyklu(obslugi.activate)

    assert.deepEqual([...nazwyCache], ['czysty-zarobek-v1'])
    assert.deepEqual(caches.delete.mock.calls.map((wywolanie) => wywolanie.arguments[0]), ['czysty-zarobek-v0', 'obcy-cache'])
    assert.equal(self.clients.claim.mock.callCount(), 1)
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

  it('Safari starsze niż 16 (bez AbortSignal.timeout): zasób i tak jest pobierany z limitem czasu i zapisany', async () => {
    const zegar = (/** @type {() => void} */ obsluga, /** @type {number} */ ms) => setTimeout(obsluga, ms).unref()
    const { obslugi, fetch, cache, reportError } = uruchomSw(async () => odpowiedz(200, 'styl'), { AbortSignal: {}, setTimeout: zegar })

    await wyslij(obslugi.message, { typ: 'zapisz-zasoby', adresy: [`${KATALOG}style/aplikacja.css`] })

    assert.ok(fetch.mock.calls[0].arguments[1].signal instanceof AbortSignal)
    assert.equal((await cache.match(`${KATALOG}style/aplikacja.css`))?.tresc, 'styl')
    assert.equal(reportError.mock.callCount(), 0)
  })
})
