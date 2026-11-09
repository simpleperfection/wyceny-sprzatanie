// Graf modulow strony oferty (src/oferta-start.js): wyjatek Access dla oferta.html obejmuje tylko te pliki (R33),
// wiec strona oferty nie moze ladowac silnika wyceny, magazynu ani zapisanych wycen.

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { celeOdwolan } from '../../scripts/publikacja/pliki.mjs'

const KATALOG_REPO = new URL('../../', import.meta.url)
const START_OFERTY = 'src/oferta-start.js'

// Importy liczy ten sam parser co publikacja (celeOdwolan w scripts/publikacja/pliki.mjs): statyczne `import ... from`,
// `export ... from` i `import '...'` na poczatku linii, bez typedefow JSDoc `import(...)` z komentarzy.
// Sprawdzone: import z '../silnik/szybka.js' dopisany do tresc.js wywraca test grafu (dochodzi caly silnik).

/** @param {string} sciezka sciezka wzgledem katalogu repo @returns {Promise<string[]>} */
async function importyPliku(sciezka) {
  const kod = await readFile(fileURLToPath(new URL(sciezka, KATALOG_REPO)), 'utf8')
  return celeOdwolan(sciezka, kod)
}

/** @param {string} start @returns {Promise<string[]>} posortowane sciezki wszystkich modulow osiagalnych ze startu */
async function grafModulow(start) {
  const odwiedzone = new Set([start])
  const doSprawdzenia = [start]
  while (doSprawdzenia.length > 0) {
    const sciezka = doSprawdzenia.pop()
    if (sciezka === undefined) break
    for (const cel of await importyPliku(sciezka)) {
      if (odwiedzone.has(cel)) continue
      odwiedzone.add(cel)
      doSprawdzenia.push(cel)
    }
  }
  return [...odwiedzone].sort()
}

describe('graf modułów strony oferty', () => {
  it('src/oferta-start.js ładuje dokładnie 13 modułów z planu, bez silnika szybkiej wyceny, magazynu i wycen', async () => {
    const graf = await grafModulow(START_OFERTY)

    assert.deepEqual(graf, [
      'src/dane/ksztalt.js',
      'src/dane/kwota-wyceny.js',
      'src/kalendarz/daty.js',
      'src/oferta-start.js',
      'src/oferta/kodek.js',
      'src/oferta/tresc.js',
      'src/silnik/bledy.js',
      'src/silnik/tryby-szybkiej.js',
      'src/silnik/vat.js',
      'src/ui/format.js',
      'src/ui/h.js',
      'src/ui/ikony.js',
      'src/widoki/oferta-klient.js',
    ])
  })

  it('statyczny import w kodzie wchodzi do grafu, a typedef JSDoc import(...) nie', async () => {
    const importy = await importyPliku('src/oferta/tresc.js')

    assert.ok(importy.includes('src/silnik/tryby-szybkiej.js'))
    assert.ok(!importy.includes('src/dane/wyceny.js'))
    assert.ok(!importy.includes('src/dane/magazyn.js'))
  })
})
