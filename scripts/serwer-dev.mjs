#!/usr/bin/env node
// Serwer plikow statycznych do pracy lokalnej i testow E2E (aplikacja nie ma kroku budowania).
// Korzen = katalog glowny repo, nasluch tylko na 127.0.0.1, bez listowania katalogow i bez pamieci podrecznej.
//
// Uzycie: node scripts/serwer-dev.mjs [--port 5174]

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const DOMYSLNY_PORT = 5174
const MAKS_PORT = 65535
const HOST = '127.0.0.1'
const KOD_ZLYCH_ARGUMENTOW = 2
const KORZEN_REPO = fileURLToPath(new URL('..', import.meta.url))
const TYP_DOMYSLNY = 'application/octet-stream'
const TYPY_MIME = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
})

/** @param {import('node:http').ServerResponse} res @param {number} status @param {string} tekst */
function odpowiedzBledem(res, status, tekst) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(`${tekst}\n`)
}

/**
 * Sciezka pliku w korzeniu albo kod odmowy. Segmenty `..` (takze zakodowane) i ukryte (`.git`, `.env*`) daja 403.
 * @param {string} korzen @param {string} adres surowe `req.url` (bez normalizacji, ktora zjadlaby `..`)
 * @returns {{ plik: string } | { status: 400 | 403 }}
 */
function plikDlaAdresu(korzen, adres) {
  const sciezka = adres.split(/[?#]/, 1)[0] ?? ''
  let zdekodowana
  try {
    zdekodowana = decodeURIComponent(sciezka)
  } catch (blad) {
    if (blad instanceof URIError) return { status: 400 }
    throw blad
  }
  if (zdekodowana.includes('\0')) return { status: 400 }
  const segmenty = zdekodowana.split(/[\\/]/).filter((segment) => segment !== '')
  if (segmenty.some((segment) => segment.startsWith('.'))) return { status: 403 }
  const plik = segmenty.length === 0 ? join(korzen, 'index.html') : resolve(korzen, ...segmenty)
  if (!plik.startsWith(korzen.endsWith(sep) ? korzen : korzen + sep)) return { status: 403 }
  return { plik }
}

/** @param {string} korzen @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
async function obsluzZadanie(korzen, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return odpowiedzBledem(res, 405, 'Metoda niedozwolona')
  }
  const wynik = plikDlaAdresu(korzen, req.url ?? '/')
  if ('status' in wynik) return odpowiedzBledem(res, wynik.status, wynik.status === 403 ? 'Brak dostępu' : 'Zły adres')
  const info = await stat(wynik.plik).catch((/** @type {NodeJS.ErrnoException} */ blad) => {
    if (blad.code === 'ENOENT' || blad.code === 'ENOTDIR') return null
    throw blad
  })
  if (!info?.isFile()) return odpowiedzBledem(res, 404, 'Nie znaleziono')
  res.writeHead(200, {
    'Content-Type': TYPY_MIME[extname(wynik.plik).toLowerCase()] ?? TYP_DOMYSLNY,
    'Content-Length': info.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  if (req.method === 'HEAD') return res.end()
  createReadStream(wynik.plik).on('error', (blad) => {
    zapiszBlad(req.url, blad)
    res.destroy()
  }).pipe(res)
}

/** @param {string | undefined} adres @param {unknown} blad */
function zapiszBlad(adres, blad) {
  process.stderr.write(`${JSON.stringify({ kod: 'BLAD_SERWERA', adres, przyczyna: String(blad) })}\n`)
}

/**
 * Serwer plikow statycznych z katalogu `korzen` (bez nasluchu — wola go `listen`).
 * @param {string} [korzen] katalog glowny serwowanych plikow; domyslnie katalog repo
 * @returns {import('node:http').Server}
 */
export function utworzSerwer(korzen = KORZEN_REPO) {
  const korzenBezwzgledny = resolve(korzen)
  return createServer((req, res) => {
    obsluzZadanie(korzenBezwzgledny, req, res).catch((/** @type {unknown} */ blad) => {
      zapiszBlad(req.url, blad)
      if (res.headersSent) return res.destroy()
      odpowiedzBledem(res, 500, 'Błąd serwera')
    })
  })
}

function uruchom() {
  const { values } = parseArgs({ options: { port: { type: 'string' } } })
  const port = Number(values.port ?? DOMYSLNY_PORT)
  if (!Number.isInteger(port) || port < 1 || port > MAKS_PORT) {
    process.stderr.write(`serwer-dev: --port musi być liczbą 1–${MAKS_PORT}\n`)
    process.exit(KOD_ZLYCH_ARGUMENTOW)
  }
  utworzSerwer().listen(port, HOST, () => process.stdout.write(`Serwer: http://${HOST}:${port}/\n`))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) uruchom()
