import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { BladKodeka, linkOferty, MAKS_DLUGOSC_LINKU, odkodujOferte, zakodujOferte } from './kodek.js'

/** @typedef {import('./tresc.js').Oferta} Oferta */

const ADRES_APLIKACJI = 'https://simpleperfection.github.io/wyceny-sprzatanie/index.html?zrodlo=pwa#/wycena/w1/oferta'
const STRONA_OFERTY = 'https://simpleperfection.github.io/wyceny-sprzatanie/oferta.html#'

/** @returns {Promise<Oferta>} swieza kopia tests/fixtures/oferta-typowa.json (8 punktow zakresu, 4 warunki) */
async function typowa() {
  return JSON.parse(await readFile(new URL('../../tests/fixtures/oferta-typowa.json', import.meta.url), 'utf8'))
}

/**
 * Link sfabrykowany poza aplikacja: dowolny JSON spakowany jak w kodeku, bez walidacji kodera.
 * @param {string} json @returns {Promise<string>}
 */
async function sfabrykowany(json) {
  const strumien = new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  const bajty = new Uint8Array(await new Response(strumien).arrayBuffer())
  return `v1.${Buffer.from(bajty).toString('base64url')}`
}

/** @param {number} n @returns {string} tekst bez powtorzen (slabo sie pakuje), deterministyczny */
function tekstLosowy(n) {
  let ziarno = n
  return Array.from({ length: n }, () => {
    ziarno = (ziarno * 1103515245 + 12345) % 2147483648
    return 'abcdefghijklmnopqrstuvwxyz ąęółżź'[ziarno % 33]
  }).join('').trim() || 'x'
}

describe('zakodujOferte i odkodujOferte', () => {
  it('kod wraca do tej samej oferty', async () => {
    const oferta = await typowa()

    const kod = await zakodujOferte(oferta)

    assert.match(kod, /^v1\.[A-Za-z0-9_-]+$/)
    assert.deepEqual(await odkodujOferte(`#${kod}`), { ok: true, oferta })
  })

  it('typowa oferta (8 punktów zakresu, 4 warunki) ma link krótszy niż 2000 znaków', async () => {
    const link = await linkOferty(ADRES_APLIKACJI, await typowa())

    assert.ok(link.url.startsWith(`${STRONA_OFERTY}v1.`), link.url)
    assert.equal(link.dlugosc, link.url.length)
    assert.ok(link.dlugosc < MAKS_DLUGOSC_LINKU, `link ma ${link.dlugosc} znaków`)
    assert.equal(link.dlugi, false)
  })

  it('oferta z 50 długimi punktami zakresu daje link oznaczony jako długi', async () => {
    const oferta = await typowa()
    oferta.zakres.wchodzi = Array.from({ length: 50 }, (_, i) => tekstLosowy(400 + i))

    const link = await linkOferty(ADRES_APLIKACJI, oferta)

    assert.ok(link.dlugosc > MAKS_DLUGOSC_LINKU)
    assert.equal(link.dlugi, true)
  })

  it('koder odrzuca ofertę z polem spoza białej listy (R21) i z ujemną kwotą', async () => {
    const zZostaje = { ...(await typowa()), zostaje: 120 }
    const ujemna = { ...(await typowa()), dojazd: -4 }

    await assert.rejects(zakodujOferte(/** @type {never} */ (zZostaje)), (b) => b instanceof BladKodeka && b.kod === 'ksztalt')
    await assert.rejects(zakodujOferte(ujemna), (b) => b instanceof BladKodeka && b.kod === 'ksztalt')
  })
})

describe('odkodujOferte: link uszkodzony albo sfabrykowany', () => {
  it('fragment obcięty o 10 znaków → uszkodzony', async () => {
    const kod = await zakodujOferte(await typowa())

    assert.deepEqual(await odkodujOferte(kod.slice(0, -10)), { ok: false, powod: 'uszkodzony' })
  })

  it('v9.… → wersja; pusty fragment → brak; śmieci → uszkodzony', async () => {
    const kod = await zakodujOferte(await typowa())

    assert.deepEqual(await odkodujOferte(`v9.${kod.slice(3)}`), { ok: false, powod: 'wersja' })
    assert.deepEqual(await odkodujOferte('#'), { ok: false, powod: 'brak' })
    assert.deepEqual(await odkodujOferte('v1.zepsute'), { ok: false, powod: 'uszkodzony' })
    assert.deepEqual(await odkodujOferte('v1.@@@'), { ok: false, powod: 'uszkodzony' })
    assert.deepEqual(await odkodujOferte('oferta'), { ok: false, powod: 'uszkodzony' })
  })

  it('JSON z kluczem spoza schematu, z __proto__ albo z tekstem 600 znaków → uszkodzony', async () => {
    const oferta = await typowa()
    const zKluczem = await sfabrykowany(JSON.stringify({ ...oferta, zostaje: 120 }))
    const zProto = await sfabrykowany(JSON.stringify(oferta).replace('"firma":{', '"firma":{"__proto__":{"x":1},'))
    const dlugi = await sfabrykowany(JSON.stringify({ ...oferta, klient: { ...oferta.klient, nazwa: 'a'.repeat(600) } }))

    assert.deepEqual(await odkodujOferte(await sfabrykowany(JSON.stringify(oferta))), { ok: true, oferta })
    assert.deepEqual(await odkodujOferte(zKluczem), { ok: false, powod: 'uszkodzony' })
    assert.deepEqual(await odkodujOferte(zProto), { ok: false, powod: 'uszkodzony' })
    assert.deepEqual(await odkodujOferte(dlugi), { ok: false, powod: 'uszkodzony' })
  })

  it('zła kwota, zła data, 51 warunków i nie-JSON → uszkodzony', async () => {
    const oferta = await typowa()
    const przypadki = [
      { ...oferta, razem: { od: 300, do: 294 } }, { ...oferta, uslugi: [{ opis: 'Sprzątanie', kwota: '290' }] }, { ...oferta, waznaDo: '7.11.2026' },
      { ...oferta, warunki: Array.from({ length: 51 }, () => 'Warunek') }, { ...oferta, v: 2 }, { ...oferta, uslugi: [] },
    ]

    for (const przypadek of przypadki) {
      assert.deepEqual(await odkodujOferte(await sfabrykowany(JSON.stringify(przypadek))), { ok: false, powod: 'uszkodzony' })
    }
    assert.deepEqual(await odkodujOferte(await sfabrykowany('{"v":1,')), { ok: false, powod: 'uszkodzony' })
  })

  it('zły VAT, ujemne netto, pusty punkt, długie pole firmy, termin-liczba, szybka nie-boolean, zły tryb i abonament → uszkodzony', async () => {
    const oferta = await typowa()
    const przypadki = [
      { ...oferta, vat: { ...oferta.vat, status: 'ryczalt' } }, { ...oferta, vat: { ...oferta.vat, status: 'czynny', stawka: 101 } },
      { ...oferta, vat: { ...oferta.vat, netto: -1 } }, { ...oferta, vat: { ...oferta.vat, kwotaVat: -0.01 } },
      { ...oferta, zakres: { ...oferta.zakres, wchodzi: [''] } }, { ...oferta, firma: { ...oferta.firma, email: 'a'.repeat(501) } },
      { ...oferta, klient: { ...oferta.klient, termin: 20261114 } }, { ...oferta, szybka: 'tak' }, { ...oferta, trybCeny: 'okolo' },
      { ...oferta, abonament: { wizyt: 0, miesiecznie: { od: 0, do: 0 } } }, { ...oferta, abonament: { wizyt: 4.33, miesiecznie: { od: 2, do: 1 } } },
    ]

    for (const przypadek of przypadki) {
      assert.deepEqual(await odkodujOferte(await sfabrykowany(JSON.stringify(przypadek))), { ok: false, powod: 'uszkodzony' }, JSON.stringify(przypadek))
    }
  })

  it('granice: stawka 100% i abonament przechodzą; fragment dłuższy niż 20 000 znaków → uszkodzony bez rozpakowania', async () => {
    const oferta = await typowa()
    const graniczna = { ...oferta, vat: { status: /** @type {const} */ ('czynny'), stawka: 100, netto: 147, kwotaVat: 147 },
      abonament: { wizyt: 4.33, miesiecznie: { od: 1273, do: 1273 } } }

    assert.deepEqual(await odkodujOferte(await sfabrykowany(JSON.stringify(graniczna))), { ok: true, oferta: graniczna })
  })

  it('poprawny kod dłuższy niż 20 000 znaków → uszkodzony (limit fragmentu przed rozpakowaniem)', async () => {
    const oferta = await typowa()
    const punkty = (przesuniecie) => Array.from({ length: 50 }, (_, i) => tekstLosowy(500 - przesuniecie - i))
    const kod = await zakodujOferte({ ...oferta, zakres: { wchodzi: punkty(0), nie_wchodzi: punkty(50) }, warunki: punkty(100) })

    assert.ok(kod.length > 20_000, `kod ma ${kod.length} znaków`)
    assert.deepEqual(await odkodujOferte(kod), { ok: false, powod: 'uszkodzony' })
  })

  it('mały link z poprawną ofertą rozpakowującą się do ponad 128 KB („bomba” deflate) → uszkodzony', async () => {
    const punkt = 'ą'.repeat(500)
    const linie = Array.from({ length: 50 }, () => ({ opis: punkt, kwota: 1 }))
    const ogromna = { ...(await typowa()), uslugi: linie, dodatkiOpcjonalne: linie, warunki: linie.map((l) => l.opis) }
    const bomba = await sfabrykowany(JSON.stringify(ogromna))

    assert.ok(bomba.length < 2000)
    assert.deepEqual(await odkodujOferte(bomba), { ok: false, powod: 'uszkodzony' })
  })

  it('przeglądarka bez DecompressionStream → przegladarka', async () => {
    const kod = await zakodujOferte(await typowa())
    const oryginal = globalThis.DecompressionStream
    Reflect.deleteProperty(globalThis, 'DecompressionStream')
    try {
      assert.deepEqual(await odkodujOferte(kod), { ok: false, powod: 'przegladarka' })
    } finally {
      globalThis.DecompressionStream = oryginal
    }
  })
})

describe('linkOferty: adres aplikacji', () => {
  it('adres spoza http(s) albo nie-adres → BladKodeka adres', async () => {
    const oferta = await typowa()

    await assert.rejects(linkOferty('javascript:alert(1)', oferta), (b) => b instanceof BladKodeka && b.kod === 'adres')
    await assert.rejects(linkOferty('nie adres', oferta), (b) => b instanceof BladKodeka && b.kod === 'adres')
  })
})
