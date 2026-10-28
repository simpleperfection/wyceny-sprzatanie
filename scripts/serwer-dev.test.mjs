import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

import { utworzSerwer } from './serwer-dev.mjs'

/** @typedef {{ status: number | undefined, typ: string | undefined, cache: string | undefined, tresc: string }} Odpowiedz */

/**
 * Serwer na losowym porcie; zadania z surowa sciezka (http.request nie normalizuje `..`, w odroznieniu od fetch).
 * @param {string | undefined} korzen
 */
async function uruchomSerwer(korzen) {
  const serwer = utworzSerwer(korzen)
  await new Promise((gotowe) => serwer.listen(0, '127.0.0.1', () => gotowe(undefined)))
  const adres = serwer.address()
  assert.ok(adres && typeof adres === 'object')
  /** @param {string} sciezka @param {string} [metoda] @returns {Promise<Odpowiedz>} */
  const pobierz = (sciezka, metoda = 'GET') => new Promise((gotowe, blad) => {
    request({ host: '127.0.0.1', port: adres.port, path: sciezka, method: metoda }, (res) => {
      let tresc = ''
      res.setEncoding('utf8').on('data', (kawalek) => { tresc += kawalek })
      res.on('end', () => gotowe({ status: res.statusCode, typ: res.headers['content-type'], cache: res.headers['cache-control'], tresc }))
    }).on('error', blad).end()
  })
  return { pobierz, zamknij: () => new Promise((gotowe) => serwer.close(gotowe)) }
}

describe('serwer-dev: katalog z plikami aplikacji', () => {
  /** @type {string} */ let katalog
  /** @type {Awaited<ReturnType<typeof uruchomSerwer>>} */ let serwer
  before(async () => {
    katalog = await mkdtemp(join(tmpdir(), 'serwer-dev-'))
    await writeFile(join(katalog, 'index.html'), '<!doctype html><title>Wyceny</title>')
    await writeFile(join(katalog, 'manifest.webmanifest'), '{"short_name":"Wyceny"}')
    await writeFile(join(katalog, 'font.woff2'), 'wOF2')
    await writeFile(join(katalog, 'app.js'), 'export const a = 1')
    await writeFile(join(katalog, '.env.e2e'), 'E2E_URL=x')
    serwer = await uruchomSerwer(katalog)
  })
  after(async () => {
    await serwer.zamknij()
    await rm(katalog, { recursive: true, force: true })
  })

  it('dla / zwraca index.html z text/html i Cache-Control no-store', async () => {
    const odpowiedz = await serwer.pobierz('/')
    assert.deepEqual(odpowiedz, {
      status: 200, typ: 'text/html; charset=utf-8', cache: 'no-store', tresc: '<!doctype html><title>Wyceny</title>',
    })
  })

  it('nadaje typy MIME: .webmanifest, .woff2 i .js', async () => {
    assert.equal((await serwer.pobierz('/manifest.webmanifest')).typ, 'application/manifest+json')
    assert.equal((await serwer.pobierz('/font.woff2')).typ, 'font/woff2')
    assert.equal((await serwer.pobierz('/app.js?v=2')).typ, 'text/javascript; charset=utf-8')
  })

  it('odmawia plikow ukrytych (.env*) i nie wysyla ich tresci', async () => {
    const odpowiedz = await serwer.pobierz('/.env.e2e')
    assert.equal(odpowiedz.status, 403)
    assert.doesNotMatch(odpowiedz.tresc, /E2E_URL/)
  })

  it('odrzuca metody inne niz GET i HEAD statusem 405', async () => {
    assert.equal((await serwer.pobierz('/index.html', 'POST')).status, 405)
  })
})

describe('serwer-dev: katalog repo i proby wyjscia poza korzen', () => {
  /** @type {Awaited<ReturnType<typeof uruchomSerwer>>} */ let serwer
  before(async () => { serwer = await uruchomSerwer(undefined) })
  after(() => serwer.zamknij())

  it('dla /data/ceny.json zwraca 200 i application/json', async () => {
    const odpowiedz = await serwer.pobierz('/data/ceny.json')
    assert.equal(odpowiedz.status, 200)
    assert.equal(odpowiedz.typ, 'application/json; charset=utf-8')
    assert.equal(typeof JSON.parse(odpowiedz.tresc), 'object')
  })

  for (const sciezka of ['/../package.json', '/%2e%2e/package.json', '/%2E%2E%5Cpackage.json', '/..%2f..%2fCLAUDE.md']) {
    it(`odpowiada 403 na ${sciezka}`, async () => {
      assert.equal((await serwer.pobierz(sciezka)).status, 403)
    })
  }

  // Segment z litera dysku nie zaczyna sie od kropki, wiec zatrzymuje go dopiero sprawdzenie prefiksu korzenia:
  // na Windows path.resolve wychodzi nim poza repo (403), na innych systemach to zwykla nazwa w repo (403 albo 404).
  for (const sciezka of ['/C:..%5Cpackage.json', '/C:../C:../CLAUDE.md', '/D:/x']) {
    it(`odpowiada 403 na sciezke z litera dysku ${sciezka} (nigdy 200)`, async () => {
      const oczekiwane = process.platform === 'win32' ? [403] : [403, 404]

      const { status } = await serwer.pobierz(sciezka)

      assert.ok(oczekiwane.includes(status ?? 0), `status ${status}, oczekiwany ${oczekiwane.join(' albo ')}`)
      assert.notEqual(status, 200)
    })
  }

  it('odpowiada 404 na nieistniejacy plik i na katalog (bez listowania)', async () => {
    assert.equal((await serwer.pobierz('/nie-ma-takiego-pliku.js')).status, 404)
    const katalog = await serwer.pobierz('/data/')
    assert.equal(katalog.status, 404)
    assert.doesNotMatch(katalog.tresc, /ceny\.json/)
  })

  it('odpowiada 400 na zle zakodowany adres', async () => {
    assert.equal((await serwer.pobierz('/%E0%A4%A')).status, 400)
  })
})

describe('serwer-dev: katalog bez index.html', () => {
  it('dla / odpowiada 404', async () => {
    const katalog = await mkdtemp(join(tmpdir(), 'serwer-dev-pusty-'))
    const serwer = await uruchomSerwer(katalog)
    try {
      assert.equal((await serwer.pobierz('/')).status, 404)
    } finally {
      await serwer.zamknij()
      await rm(katalog, { recursive: true, force: true })
    }
  })
})
