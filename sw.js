// Service worker aplikacji (R28): nawigacja (index.html, oferta.html) najpierw z sieci (limit 4 s), potem z pamieci podrecznej;
// wszystkie pliki poza nawigacja (src/, data/, style/, fonty/, ikony/, manifest) od razu z pamieci, odswiezane w tle
// (stale-while-revalidate). Moduly src/ i data/*.json odswiezaja sie tym samym trybem, wiec nowa wersja kodu i danych
// dziala razem od nastepnego uruchomienia, bez startu starego kodu z nowymi danymi.
// Zmiana WERSJA_CACHE (np. po zmianie PLIKI_STARTOWE) instaluje nowego workera, ktory kasuje stary cache.
// Po pierwszym uruchomieniu online aplikacja dziala offline.
// Klasyczny skrypt (bez importow modulow), poza typecheck. Zakres = katalog aplikacji.

const WERSJA_CACHE = 'czysty-zarobek-v1'
const LIMIT_SIECI_MS = 4000
/** Zapis w tle (pliki od strony) nie blokuje uzytkownika, wiec ma dluzszy limit na wolnym laczu. */
const LIMIT_ZAPISU_W_TLE_MS = 30000
const MAKS_ZASOBOW = 300
const KOMUNIKAT_ZASOBOW = 'zapisz-zasoby'
const STRONA_ZAPASOWA = 'index.html'
// Tylko pliki, ktore istnieja. oferta.html jest tu dla aplikacji wlasciciela; strona oferty sama workera nie rejestruje.
const PLIKI_STARTOWE = [
  './',
  'index.html',
  'oferta.html',
  'manifest.webmanifest',
  'data/ceny.json',
  'data/normy.json',
  'data/rynek.json',
  'data/chemia.json',
  'data/domyslne.json',
  'data/pytania.json',
  'data/zakresy.json',
]

class PrzekroczenieCzasu extends Error {}

/** @param {string} kod @param {unknown} przyczyna */
const zglos = (kod, przyczyna) => self.reportError(new Error(JSON.stringify({ kod, przyczyna: String(przyczyna) })))

/** @param {Response} odpowiedz */
const czyDoZapisu = (odpowiedz) => odpowiedz.status === 200 && odpowiedz.type === 'basic'

/** @param {string} adres @returns {boolean} */
function czyTenSamOrigin(adres) {
  try {
    return new URL(adres, self.location.href).origin === self.location.origin
  } catch (blad) {
    if (blad instanceof TypeError) return false
    throw blad
  }
}

/** @template T @param {Promise<T>} obietnica @param {number} ms @returns {Promise<T>} odrzuca PrzekroczenieCzasu po `ms` */
function zLimitem(obietnica, ms) {
  let zegar
  const limit = new Promise((_, odrzuc) => { zegar = setTimeout(() => odrzuc(new PrzekroczenieCzasu()), ms) })
  return Promise.race([obietnica, limit]).finally(() => clearTimeout(zegar))
}

/** @param {Cache} cache @param {Request} zadanie @returns {Promise<Response | undefined>} nawigacja zapasowo dostaje index.html */
async function zapisana(cache, zadanie) {
  const czyNawigacja = zadanie.mode === 'navigate'
  const odpowiedz = await cache.match(zadanie, { ignoreSearch: czyNawigacja })
  return odpowiedz ?? (czyNawigacja ? cache.match(STRONA_ZAPASOWA) : undefined)
}

/** @param {FetchEvent} zdarzenie @param {Cache} cache @returns {Promise<Response>} odpowiedz sieci; poprawna trafia do cache w tle */
function zSieci(zdarzenie, cache) {
  const zadanie = zdarzenie.request
  return fetch(zadanie).then((odpowiedz) => {
    if (czyDoZapisu(odpowiedz)) zdarzenie.waitUntil(cache.put(zadanie, odpowiedz.clone()).catch((blad) => zglos('sw_zapis', blad)))
    return odpowiedz
  })
}

/** Plik aplikacji albo danych: od razu z cache i odswiezenie w tle; bez wpisu w cache czeka na siec. @param {FetchEvent} zdarzenie @param {Cache} cache */
async function cachePotemSiec(zdarzenie, cache) {
  const zCache = await cache.match(zdarzenie.request)
  const siec = zSieci(zdarzenie, cache)
  if (!zCache) return siec
  zdarzenie.waitUntil(siec.catch((blad) => zglos('sw_odswiezenie', blad)))
  return zCache
}

/** @param {FetchEvent} zdarzenie @param {Cache} cache @returns {Promise<Response>} */
async function siecPotemCache(zdarzenie, cache) {
  const zadanie = zdarzenie.request
  const siec = zSieci(zdarzenie, cache)
  try {
    return await zLimitem(siec, LIMIT_SIECI_MS)
  } catch (blad) {
    const zCache = await zapisana(cache, zadanie)
    if (zCache) return zCache
    if (blad instanceof PrzekroczenieCzasu) return siec
    throw blad
  }
}

/** Pliki wczytane przez strone przed przejeciem jej przez service workera (src/pwa/rejestracja.js). @param {unknown[]} adresy */
async function zapiszZasoby(adresy) {
  const cache = await caches.open(WERSJA_CACHE)
  const wlasne = adresy.filter((adres) => typeof adres === 'string' && czyTenSamOrigin(adres)).slice(0, MAKS_ZASOBOW)
  const wyniki = await Promise.allSettled(wlasne.map(async (adres) => {
    if (await cache.match(adres)) return
    const odpowiedz = await fetch(adres, { signal: AbortSignal.timeout(LIMIT_ZAPISU_W_TLE_MS) })
    if (czyDoZapisu(odpowiedz)) await cache.put(adres, odpowiedz)
  }))
  const nieudane = wyniki.filter((wynik) => wynik.status === 'rejected')
  if (nieudane.length > 0) zglos('sw_zasoby_niezapisane', `${nieudane.length} z ${wlasne.length}: ${nieudane[0].reason}`)
}

self.addEventListener('install', (zdarzenie) => {
  zdarzenie.waitUntil(caches.open(WERSJA_CACHE)
    .then((cache) => cache.addAll(PLIKI_STARTOWE.map((plik) => new Request(plik, { cache: 'reload' }))))
    .then(() => self.skipWaiting()))
})

self.addEventListener('activate', (zdarzenie) => {
  zdarzenie.waitUntil(caches.keys()
    .then((nazwy) => Promise.all(nazwy.filter((nazwa) => nazwa !== WERSJA_CACHE).map((nazwa) => caches.delete(nazwa))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (zdarzenie) => {
  const { request } = zdarzenie
  if (request.method !== 'GET' || !czyTenSamOrigin(request.url)) return
  zdarzenie.respondWith(caches.open(WERSJA_CACHE)
    .then((cache) => (request.mode === 'navigate' ? siecPotemCache(zdarzenie, cache) : cachePotemSiec(zdarzenie, cache))))
})

self.addEventListener('message', (zdarzenie) => {
  const dane = zdarzenie.data
  if (typeof dane !== 'object' || dane === null || dane.typ !== KOMUNIKAT_ZASOBOW || !Array.isArray(dane.adresy)) return
  zdarzenie.waitUntil(zapiszZasoby(dane.adresy))
})
