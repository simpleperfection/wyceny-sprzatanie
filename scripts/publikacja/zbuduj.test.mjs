import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { celeOdwolan, grafOferty, plikiWKatalogu } from './pliki.mjs'
import { zbuduj } from './zbuduj.mjs'

const KORZEN_REPO = fileURLToPath(new URL('../../', import.meta.url))
const SKRYPT = fileURLToPath(new URL('./zbuduj.mjs', import.meta.url))

/** Pliki strony oferty, ktore sa publiczne (R33). Nowy plik w grafie to swiadoma decyzja: dopisz go tutaj. */
const GRAF_OFERTY = [
  'fonty/source-sans-3-latin-ext-wght.woff2',
  'fonty/source-sans-3-latin-wght.woff2',
  'ikony/ikona.svg',
  'src/dane/ksztalt.js',
  'src/dane/kwota-wyceny.js',
  'src/kalendarz/daty.js',
  'src/oferta-start.js',
  'src/oferta/kodek.js',
  'src/oferta/tresc.js',
  'src/silnik/bledy.js',
  'src/silnik/tryby-szybkiej.js',
  'src/silnik/vat.js',
  'src/style/baza.css',
  'src/style/druk.css',
  'src/style/oferta.css',
  'src/style/tokeny.css',
  'src/ui/format.js',
  'src/ui/h.js',
  'src/ui/ikony.js',
  'src/widoki/oferta-klient.js',
]

/** @param {Record<string, string>} pliki sciezka wzgledna → tresc @returns {Promise<string>} */
async function utworzRepo(pliki) {
  const katalog = await mkdtemp(join(tmpdir(), 'publikacja-repo-'))
  for (const [sciezka, tresc] of Object.entries(pliki)) {
    await mkdir(dirname(join(katalog, sciezka)), { recursive: true })
    await writeFile(join(katalog, sciezka), tresc)
  }
  return katalog
}

/** @param {string} html @returns {string | undefined} tresc meta Content-Security-Policy */
function politykaCsp(html) {
  return /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(html)?.[1]
}

/** @param {string | undefined} csp @param {string} nazwa @returns {string | undefined} */
function dyrektywa(csp, nazwa) {
  return csp?.split(';').map((czesc) => czesc.trim().replace(/\s+/g, ' ')).find((czesc) => czesc.split(' ')[0] === nazwa)
}

const MALE_REPO = {
  'index.html': '<!doctype html><link rel="stylesheet" href="src/style/a.css"><script type="module" src="src/a.js"></script>',
  'oferta.html': '<!doctype html><link rel="stylesheet" href="src/style/o.css"><script type="module" src="src/o.js"></script>',
  // Publikacja podmienia te trzy stale (sw-publikacji.mjs), wiec worker bez nich przerywa build.
  'sw.js': "const WERSJA_CACHE = 'v1'\nconst ZAPIS_W_BIEGU = true\nconst PLIKI_STARTOWE = ['./']\nself.addEventListener('fetch', () => {})",
  'manifest.webmanifest': '{}',
  'robots.txt': 'User-agent: *',
  'data/ceny.json': '{}',
  'fonty/f.woff2': 'wOF2',
  'fonty/OFL.txt': 'licencja',
  'ikony/i.svg': '<svg/>',
  'src/a.js': 'export const a = 1',
  'src/o.js': "import { l } from './l.js'\nexport const o = l",
  'src/l.js': 'export const l = 1',
  'src/l.test.js': "import { l } from './l.js'",
  'src/narzedzie.mjs': 'export {}',
  'src/style/a.css': 'body {}',
  'src/style/o.css': "@font-face { src: url('../../fonty/f.woff2') format('woff2') }",
  'notatki.md': '# tajne notatki',
  'tajne/x.js': 'export const haslo = 1',
}

describe('publikacja: male repo w mkdtemp', () => {
  /** @type {string[]} */ const katalogi = []
  after(() => Promise.all(katalogi.map((katalog) => rm(katalog, { recursive: true, force: true }))))

  /** @param {Record<string, string>} pliki @returns {Promise<{ korzen: string, wyjscie: string }>} */
  async function przygotuj(pliki) {
    const korzen = await utworzRepo(pliki)
    const wyjscie = await mkdtemp(join(tmpdir(), 'publikacja-dist-'))
    katalogi.push(korzen, wyjscie)
    return { korzen, wyjscie }
  }

  it('kopiuje tylko pliki z listy dozwolonych: bez notatki.md, tajne/x.js, *.test.js i *.mjs', async () => {
    const { korzen, wyjscie } = await przygotuj(MALE_REPO)

    const pliki = await zbuduj(korzen, wyjscie)

    assert.deepEqual(pliki, [
      '_headers', '_redirects',
      'data/ceny.json', 'fonty/OFL.txt', 'fonty/f.woff2', 'ikony/i.svg', 'index.html', 'manifest.webmanifest', 'oferta.html',
      'publiczne/fonty/f.woff2', 'publiczne/src/l.js', 'publiczne/src/o.js', 'publiczne/src/style/o.css',
      'robots.txt', 'src/a.js', 'src/l.js', 'src/o.js', 'src/style/a.css', 'src/style/o.css', 'start.html', 'sw.js',
    ])
    assert.deepEqual(await plikiWKatalogu(wyjscie), pliki)
  })

  it('czysci katalog wyjsciowy przed zapisem (stary plik znika)', async () => {
    const { korzen, wyjscie } = await przygotuj(MALE_REPO)
    await writeFile(join(wyjscie, 'stary.md'), 'z poprzedniej publikacji')

    const pliki = await zbuduj(korzen, wyjscie)

    assert.ok(!pliki.includes('stary.md'))
    await assert.rejects(stat(join(wyjscie, 'stary.md')), { code: 'ENOENT' })
  })

  it('dist/oferta.html dostaje prefiks publiczne/ we wzglednych href i src, a adresy bezwzgledne zostaja', async () => {
    const { korzen, wyjscie } = await przygotuj({
      ...MALE_REPO,
      'oferta.html': "<link href='src/style/o.css' rel=stylesheet><script src=src/o.js></script><a href=\"#gora\">x</a>",
    })

    await zbuduj(korzen, wyjscie)

    assert.equal(
      await readFile(join(wyjscie, 'oferta.html'), 'utf8'),
      "<link href='publiczne/src/style/o.css' rel=stylesheet><script src=publiczne/src/o.js></script><a href=\"#gora\">x</a>",
    )
  })

  it('brakujacy import oferty konczy build bledem BLAD_PUBLIKACJI z nazwa pliku i nie zostawia katalogu', async () => {
    const { korzen, wyjscie } = await przygotuj({ ...MALE_REPO, 'src/o.js': "import { b } from './brak.js'\nexport const o = b" })

    await assert.rejects(zbuduj(korzen, wyjscie), { kod: 'BLAD_PUBLIKACJI', message: /src\/brak\.js/ })
    await assert.rejects(stat(wyjscie), { code: 'ENOENT' })
  })

  it('oferta odwolujaca sie do pliku spoza listy (tajne/x.js) konczy build bledem', async () => {
    const { korzen, wyjscie } = await przygotuj({ ...MALE_REPO, 'src/o.js': "import { haslo } from '../tajne/x.js'\nexport const o = haslo" })

    await assert.rejects(zbuduj(korzen, wyjscie), { kod: 'BLAD_PUBLIKACJI', message: /tajne\/x\.js/ })
  })

  it('odwolanie od korzenia (/src/o.js) w oferta.html prowadzi poza publiczne/ i konczy build bledem', async () => {
    const { korzen, wyjscie } = await przygotuj({ ...MALE_REPO, 'oferta.html': '<script type="module" src="/src/o.js"></script>' })

    await assert.rejects(zbuduj(korzen, wyjscie), { kod: 'BLAD_PUBLIKACJI', message: /oferta\.html -> src\/o\.js/ })
  })

  it('odwolanie do innej domeny w oferta.html konczy build bledem', async () => {
    const { korzen, wyjscie } = await przygotuj({ ...MALE_REPO, 'oferta.html': '<script src="https://cdn.example.com/x.js"></script>' })

    await assert.rejects(zbuduj(korzen, wyjscie), { kod: 'BLAD_PUBLIKACJI', message: /cdn\.example\.com/ })
  })

  it('plik .md w ikony/ trafilby do katalogu, wiec sprawdzenie wyniku przerywa publikacje', async () => {
    const { korzen, wyjscie } = await przygotuj({ ...MALE_REPO, 'ikony/OPIS.MD': '# opis' })

    await assert.rejects(zbuduj(korzen, wyjscie), { kod: 'BLAD_PUBLIKACJI', message: /ikony\/OPIS\.MD/ })
    await assert.rejects(stat(wyjscie), { code: 'ENOENT' })
  })

  it('brak pliku z korzenia listy (robots.txt) konczy build bledem', async () => {
    const { korzen, wyjscie } = await przygotuj({ ...MALE_REPO, 'robots.txt': '' })
    await rm(join(korzen, 'robots.txt'))

    await assert.rejects(zbuduj(korzen, wyjscie), { kod: 'BLAD_PUBLIKACJI', message: /robots\.txt/ })
  })

  it('odmawia katalogu wyjsciowego rownego korzeniowi repo albo nad nim i niczego nie usuwa', async () => {
    const { korzen } = await przygotuj(MALE_REPO)

    await assert.rejects(zbuduj(korzen, korzen), { kod: 'BLAD_PUBLIKACJI' })
    await assert.rejects(zbuduj(join(korzen, 'src'), korzen), { kod: 'BLAD_PUBLIKACJI' })
    assert.equal(await readFile(join(korzen, 'notatki.md'), 'utf8'), '# tajne notatki')
  })

  it('z wiersza polecen: blad idzie na stderr jako JSON z kodem BLAD_PUBLIKACJI i kodem wyjscia 1', async () => {
    const { korzen, wyjscie } = await przygotuj({ ...MALE_REPO, 'src/o.js': "import './brak.js'" })

    const wynik = spawnSync(process.execPath, [SKRYPT, '--korzen', korzen, '--wyjscie', wyjscie], { encoding: 'utf8' })

    assert.equal(wynik.status, 1)
    const blad = JSON.parse(wynik.stderr.trim())
    assert.equal(blad.kod, 'BLAD_PUBLIKACJI')
    assert.match(blad.przyczyna, /src\/brak\.js/)
  })

  it('z wiersza polecen: udany build konczy sie kodem 0 i tworzy index.html', async () => {
    const { korzen, wyjscie } = await przygotuj(MALE_REPO)

    const wynik = spawnSync(process.execPath, [SKRYPT, '--korzen', korzen, '--wyjscie', wyjscie], { encoding: 'utf8' })

    assert.equal(wynik.status, 0, wynik.stderr)
    assert.equal(await readFile(join(wyjscie, 'index.html'), 'utf8'), MALE_REPO['index.html'])
  })
})

describe('publikacja: prawdziwe repo', () => {
  /** @type {string} */ let wyjscie
  /** @type {string[]} */ let pliki
  before(async () => {
    wyjscie = await mkdtemp(join(tmpdir(), 'publikacja-repo-dist-'))
    pliki = await zbuduj(KORZEN_REPO, wyjscie)
  })
  after(() => rm(wyjscie, { recursive: true, force: true }))

  it('katalog ma pliki aplikacji, a nie ma PLAN.md, CLAUDE.md, research/, docs/, scripts/, .claude/, e2e/, tests/ ani *.test.js', async () => {
    const naDysku = await plikiWKatalogu(wyjscie)

    assert.deepEqual(naDysku, pliki)
    for (const plik of ['index.html', 'oferta.html', 'sw.js', 'src/app.js', 'data/ceny.json', 'fonty/OFL.txt']) {
      assert.ok(naDysku.includes(plik), `brak ${plik}`)
    }
    const zakazane = naDysku.filter((plik) => ['PLAN.md', 'CLAUDE.md'].includes(plik)
      || /^(research|docs|scripts|\.claude|e2e|tests)\//.test(plik) || plik.endsWith('.test.js'))
    assert.deepEqual(zakazane, [])
  })

  it('LICENSE jest w repo, a nie ma go w katalogu publikacji', async () => {
    const licencja = await readFile(join(KORZEN_REPO, 'LICENSE'), 'utf8')

    assert.equal(licencja.split(/\r?\n/)[0], 'Copyright © 2026 simpleperfection. Wszelkie prawa zastrzeżone.')
    assert.equal(pliki.includes('LICENSE'), false)
    await assert.rejects(stat(join(wyjscie, 'LICENSE')), { code: 'ENOENT' })
  })

  it('graf oferty jest rowny zapisanej liscie 13 modulow, 4 arkuszy, 2 czcionek i ikony', async () => {
    const graf = await grafOferty(KORZEN_REPO)

    assert.deepEqual(graf, GRAF_OFERTY)
    assert.deepEqual(
      pliki.filter((plik) => plik.startsWith('publiczne/')),
      GRAF_OFERTY.map((plik) => `publiczne/${plik}`),
    )
  })

  it('kazde odwolanie w dist/oferta.html i w plikach dist/publiczne/ istnieje w dist/publiczne/', async () => {
    const istniejace = new Set(pliki)
    const zOferty = celeOdwolan('oferta.html', await readFile(join(wyjscie, 'oferta.html'), 'utf8'))
    /** @type {string[]} */ const wszystkie = [...zOferty]
    for (const plik of pliki.filter((p) => p.startsWith('publiczne/'))) {
      if (!/\.(js|css)$/.test(plik)) continue
      wszystkie.push(...celeOdwolan(plik, await readFile(join(wyjscie, plik), 'utf8')))
    }

    assert.deepEqual([...new Set(zOferty)].sort(), [
      'publiczne/fonty/source-sans-3-latin-wght.woff2',
      'publiczne/ikony/ikona.svg',
      'publiczne/src/oferta-start.js',
      'publiczne/src/style/baza.css',
      'publiczne/src/style/druk.css',
      'publiczne/src/style/oferta.css',
      'publiczne/src/style/tokeny.css',
    ])
    assert.ok(wszystkie.length > zOferty.length, 'pliki publiczne nie maja zadnych odwolan')
    assert.deepEqual(wszystkie.filter((cel) => !cel.startsWith('publiczne/') || !istniejace.has(cel)), [])
  })

  it('w dist/publiczne/ nie ma silnika wyceny, magazynu ani zapisanych wycen', async () => {
    const publiczne = await plikiWKatalogu(join(wyjscie, 'publiczne'))

    assert.deepEqual(publiczne, GRAF_OFERTY)
    for (const plik of ['src/silnik/cena.js', 'src/silnik/szybka.js', 'src/dane/wyceny.js', 'src/dane/magazyn.js']) {
      assert.ok(!publiczne.includes(plik), plik)
      assert.ok(pliki.includes(plik), `${plik} zostaje w aplikacji za logowaniem`)
    }
  })

  it('dist/index.html jest identyczny z index.html, a dist/oferta.html ma noindex, te sama CSP i skrypt z publiczne/', async () => {
    const indeks = await readFile(join(wyjscie, 'index.html'))
    const oferta = await readFile(join(wyjscie, 'oferta.html'), 'utf8')
    const ofertaRepo = await readFile(join(KORZEN_REPO, 'oferta.html'), 'utf8')

    assert.ok(indeks.equals(await readFile(join(KORZEN_REPO, 'index.html'))))
    assert.match(oferta, /<meta name="robots" content="noindex">/)
    assert.equal(politykaCsp(oferta), politykaCsp(ofertaRepo))
    assert.notEqual(politykaCsp(oferta), undefined)
    assert.ok(oferta.includes('<script type="module" src="publiczne/src/oferta-start.js"></script>'))
  })

  it('zaden plik dist/src/ ani dist/publiczne/ nie zawiera sendBeacon, a oba pliki HTML maja connect-src \'self\' (R3)', async () => {
    const skrypty = pliki.filter((plik) => /^(src|publiczne)\//.test(plik) && plik.endsWith('.js'))
    /** @type {string[]} */ const zSendBeacon = []
    for (const plik of skrypty) {
      if ((await readFile(join(wyjscie, plik), 'utf8')).includes('sendBeacon')) zSendBeacon.push(plik)
    }

    assert.ok(skrypty.length > 20, `sprawdzono tylko ${skrypty.length} plikow`)
    assert.deepEqual(zSendBeacon, [])
    for (const strona of ['index.html', 'oferta.html']) {
      const csp = politykaCsp(await readFile(join(wyjscie, strona), 'utf8'))
      assert.equal(dyrektywa(csp, 'connect-src'), "connect-src 'self'", strona)
    }
  })

  it('katalog wyjsciowy w repo (dist/) nie jest sledzony przez Git', async () => {
    const wynik = spawnSync('git', ['check-ignore', 'dist/index.html'], { cwd: KORZEN_REPO, encoding: 'utf8' })

    assert.equal(wynik.stdout.trim(), 'dist/index.html')
  })
})

describe('publikacja: odwolania w plikach', () => {
  it('celeOdwolan: importy statyczne tak, typedef import(...) z komentarza nie; url() w CSS; data: pomijane', () => {
    const js = "/** @typedef {import('./typy.js').T} T */\nimport {\n  a,\n} from './a.js'\nexport { b } from '../b.js'\nimport './c.js'"
    const css = "a { background: url(data:image/png;base64,AAA) } @font-face { src: url(\"../f.woff2\") }"

    assert.deepEqual(celeOdwolan('src/x/m.js', js), ['src/x/a.js', 'src/b.js', 'src/x/c.js'])
    assert.deepEqual(celeOdwolan('src/style/s.css', css), ['src/f.woff2'])
    assert.deepEqual(celeOdwolan('ikony/i.svg', '<svg href="x.js"/>'), [])
  })

  it('plikiWKatalogu: nieistniejacy katalog daje blad ENOENT', async () => {
    await assert.rejects(plikiWKatalogu(join(tmpdir(), 'publikacja-nie-ma-takiego-katalogu')), { code: 'ENOENT' })
  })
})
