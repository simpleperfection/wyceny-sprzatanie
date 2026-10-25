#!/usr/bin/env node
// Ikony zastepcze PWA (do etapu 6, checklista: ikona aplikacji): grafitowe tlo i niebieskie kolo z tokenow wariantu B.
// Pisze ikony/ikona.svg i PNG 180 (apple-touch-icon), 192, 512 oraz maskable 512 — PNG koduje node:zlib + CRC32, bez zaleznosci.
//
// Uzycie: node scripts/ikony-zastepcze.mjs

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const KATALOG_IKON = fileURLToPath(new URL('../ikony/', import.meta.url))
const TLO = '#26282c' // --marka-granat
const ZNAK = '#2340a8' // --marka-zielen (kolor akcji)
/** Promien kola jako czesc boku ikony. */
const PROMIEN = 0.32
/** Ikona maskable: znak pomniejszony o 20%, zeby zostal w bezpiecznej strefie po przycieciu do kola lub ksztaltu systemu. */
const MARGINES_MASKABLE = 0.2
/** Probki na bok piksela (wygladzenie krawedzi kola). */
const PROBKI = 4
const SYGNATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const KOLOR_RGB = 2
const GLEBIA_BITOW = 8
const BAJTY_NA_PIKSEL = 3
const IKONY = [
  { plik: 'apple-touch-icon.png', bok: 180, promien: PROMIEN },
  { plik: 'ikona-192.png', bok: 192, promien: PROMIEN },
  { plik: 'ikona-512.png', bok: 512, promien: PROMIEN },
  { plik: 'ikona-maskable-512.png', bok: 512, promien: PROMIEN * (1 - MARGINES_MASKABLE) },
]

const TABLICA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

/** @param {Buffer} bajty @returns {number} CRC32 wg specyfikacji PNG */
function crc32(bajty) {
  let c = 0xffffffff
  for (const bajt of bajty) c = (TABLICA_CRC[(c ^ bajt) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** @param {string} typ @param {Buffer} dane @returns {Buffer} */
function blok(typ, dane) {
  const naglowek = Buffer.alloc(8)
  naglowek.writeUInt32BE(dane.length, 0)
  naglowek.write(typ, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([naglowek.subarray(4), dane])), 0)
  return Buffer.concat([naglowek, dane, crc])
}

/** @param {string} hex `#rrggbb` @returns {[number, number, number]} */
function rgb(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new RangeError(`Zły kolor: ${hex}`)
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

/** @param {number} bok @param {number} promien czesc boku @param {number} x @param {number} y @returns {number} pokrycie piksela kolem 0–1 */
function pokrycie(bok, promien, x, y) {
  const srodek = bok / 2
  const r2 = (promien * bok) ** 2
  let trafienia = 0
  for (let i = 0; i < PROBKI; i++) {
    for (let j = 0; j < PROBKI; j++) {
      const dx = x + (i + 0.5) / PROBKI - srodek
      const dy = y + (j + 0.5) / PROBKI - srodek
      if (dx * dx + dy * dy <= r2) trafienia++
    }
  }
  return trafienia / (PROBKI * PROBKI)
}

/** @param {number} bok @param {number} promien @returns {Buffer} plik PNG (RGB 8 bit, filtr 0 w kazdym wierszu) */
function png(bok, promien) {
  const [tlo, znak] = [rgb(TLO), rgb(ZNAK)]
  const wiersz = 1 + bok * BAJTY_NA_PIKSEL
  const piksele = Buffer.alloc(wiersz * bok)
  for (let y = 0; y < bok; y++) {
    for (let x = 0; x < bok; x++) {
      const a = pokrycie(bok, promien, x, y)
      for (let k = 0; k < BAJTY_NA_PIKSEL; k++) piksele[y * wiersz + 1 + x * BAJTY_NA_PIKSEL + k] = Math.round(tlo[k] + (znak[k] - tlo[k]) * a)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(bok, 0)
  ihdr.writeUInt32BE(bok, 4)
  ihdr.set([GLEBIA_BITOW, KOLOR_RGB, 0, 0, 0], 8)
  return Buffer.concat([SYGNATURA_PNG, blok('IHDR', ihdr), blok('IDAT', deflateSync(piksele)), blok('IEND', Buffer.alloc(0))])
}

/** @returns {string} ten sam znak co PNG (ikona karty przegladarki) */
function svg() {
  const bok = 512
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bok} ${bok}">`
    + `<rect width="${bok}" height="${bok}" fill="${TLO}"/>`
    + `<circle cx="${bok / 2}" cy="${bok / 2}" r="${PROMIEN * bok}" fill="${ZNAK}"/></svg>\n`
}

function uruchom() {
  mkdirSync(KATALOG_IKON, { recursive: true })
  writeFileSync(join(KATALOG_IKON, 'ikona.svg'), svg())
  for (const { plik, bok, promien } of IKONY) writeFileSync(join(KATALOG_IKON, plik), png(bok, promien))
  process.stdout.write(`Ikony zastępcze: ${IKONY.map(({ plik }) => plik).join(', ')}, ikona.svg → ${KATALOG_IKON}\n`)
}

uruchom()
