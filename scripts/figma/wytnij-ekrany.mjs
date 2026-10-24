// Wycina pojedyncze ekrany z PNG sekcji wyeksportowanych z Figmy (2x): kolumny co 840 px od x = 80, szerokość 720 px.
// Użycie: node wytnij-ekrany.mjs <katalog z PNG sekcji> <katalog wyjściowy>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'

const [, , wej, wyj] = process.argv
const SEKCJE = {
  '1 · Start i ustawienia.png': ['ekran-startowy', 'ustawienia-firmy', 'kopia-zapasowa'],
  '2 · Szybka wycena.png': ['szybka-wycena', 'pytania-do-klienta'],
  '3 · Dokładna wycena_ usługa i zakres.png': ['kreator-wybor-uslugi', 'kreator-pomieszczenia', 'kreator-pozycje'],
  '4 · Dokładna wycena_ dodatki, chemia, cena.png': ['kreator-dodatki', 'dobor-chemii', 'podsumowanie-wyceny'],
  '5 · Oferta i zlecenie.png': ['oferta-edycja', 'oferta-klient', 'zakonczenie-zlecenia'],
}
const X0 = 80, KROK = 840, SZER = 720, MARGINES = 24, DOL = 48

const crcTab = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTab[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

function dekoduj(buf) {
  let p = 8, w = 0, h = 0, typ = 0, glebia = 0, przeplot = 0
  const idat = []
  while (p < buf.length) {
    const dl = buf.readUInt32BE(p), rodzaj = buf.toString('ascii', p + 4, p + 8), dane = buf.subarray(p + 8, p + 8 + dl)
    if (rodzaj === 'IHDR') { w = dane.readUInt32BE(0); h = dane.readUInt32BE(4); glebia = dane[8]; typ = dane[9]; przeplot = dane[12] }
    if (rodzaj === 'IDAT') idat.push(dane)
    p += 12 + dl
  }
  if (glebia !== 8 || przeplot !== 0 || ![2, 6].includes(typ)) throw new Error(`nieobsługiwany PNG: głębia ${glebia}, typ ${typ}, przeplot ${przeplot}`)
  const bpp = typ === 6 ? 4 : 3, wiersz = w * bpp, surowe = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(wiersz * h)
  for (let y = 0; y < h; y++) {
    const f = surowe[y * (wiersz + 1)], z = surowe.subarray(y * (wiersz + 1) + 1, (y + 1) * (wiersz + 1))
    for (let x = 0; x < wiersz; x++) {
      const a = x >= bpp ? px[y * wiersz + x - bpp] : 0, b = y > 0 ? px[(y - 1) * wiersz + x] : 0, c = x >= bpp && y > 0 ? px[(y - 1) * wiersz + x - bpp] : 0
      let v = z[x]
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      px[y * wiersz + x] = v & 0xff
    }
  }
  return { w, h, bpp, typ, px }
}

function koduj(w, h, bpp, typ, px) {
  const wiersz = w * bpp, surowe = Buffer.alloc((wiersz + 1) * h)
  for (let y = 0; y < h; y++) px.copy(surowe, y * (wiersz + 1) + 1, y * wiersz, (y + 1) * wiersz)
  const blok = (rodzaj, dane) => { const d = Buffer.alloc(4); d.writeUInt32BE(dane.length); const t = Buffer.concat([Buffer.from(rodzaj, 'ascii'), dane]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(t)); return Buffer.concat([d, t, c]) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = typ
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blok('IHDR', ihdr), blok('IDAT', deflateSync(surowe, { level: 9 })), blok('IEND', Buffer.alloc(0))])
}

for (const [plik, nazwy] of Object.entries(SEKCJE)) {
  const { w, h, bpp, typ, px } = dekoduj(readFileSync(join(wej, plik)))
  nazwy.forEach((nazwa, i) => {
    const x1 = X0 + i * KROK - MARGINES, x2 = Math.min(w, X0 + i * KROK + SZER + MARGINES), sw = x2 - x1
    const tlo = px.subarray(((h - 10) * w + x1) * bpp, ((h - 10) * w + x1) * bpp + bpp)
    let dol = h - 6
    for (; dol > 0; dol--) {
      let inny = false
      for (let x = x1; x < x2 && !inny; x++) for (let k = 0; k < 3; k++) if (Math.abs(px[(dol * w + x) * bpp + k] - tlo[k]) > 8) { inny = true; break }
      if (inny) break
    }
    const sh = Math.min(h, dol + DOL), wycinek = Buffer.alloc(sw * sh * bpp)
    for (let y = 0; y < sh; y++) px.copy(wycinek, y * sw * bpp, (y * w + x1) * bpp, (y * w + x2) * bpp)
    writeFileSync(join(wyj, `${nazwa}.png`), koduj(sw, sh, bpp, typ, wycinek))
    console.log(`${nazwa}.png ${sw}x${sh}`)
  })
}
