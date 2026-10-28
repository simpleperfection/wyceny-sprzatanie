import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { BladFormatu } from '../ui/format.js'
import {
  adresTelefonu, inicjalyFirmy, tekstAbonamentu, tekstKontaktu, tekstPozaCena, tekstRazem, tekstVat, tekstWarunkow, tytulOferty, widokOdmowy,
  widokOferty,
} from './oferta-klient.js'

/** @typedef {import('../oferta/tresc.js').Oferta} Oferta */

const NBSP = ' '
const FIXTURE = new URL('../../tests/fixtures/oferta-typowa.json', import.meta.url)

/** Atrapa API przegladarki (Node nie ma DOM): element z atrybutami, dziecmi i obsluga zdarzen. */
class AtrapaElementu {
  /** @param {string} tag */
  constructor(tag) {
    this.tag = tag
    /** @type {Map<string, string>} */
    this.atrybuty = new Map()
    /** @type {(AtrapaElementu | { tekst: string })[]} */
    this.dzieci = []
    /** @type {Map<string, () => void>} */
    this.zdarzenia = new Map()
  }

  /** @param {string} nazwa @param {string} wartosc */
  setAttribute(nazwa, wartosc) { this.atrybuty.set(nazwa, wartosc) }

  /** @param {AtrapaElementu | { tekst: string }} dziecko */
  appendChild(dziecko) { this.dzieci.push(dziecko) }

  /** @param {string} zdarzenie @param {() => void} obsluga */
  addEventListener(zdarzenie, obsluga) { this.zdarzenia.set(zdarzenie, obsluga) }

  /** @returns {string} */
  get tekst() { return this.dzieci.map((d) => d.tekst).join('') }

  /** @returns {AtrapaElementu[]} ten element i wszyscy potomkowie */
  get wszystkie() { return [this, ...this.dzieci.flatMap((d) => (d instanceof AtrapaElementu ? d.wszystkie : []))] }
}

const atrapaDokumentu = {
  /** @param {string} tag */
  createElement: (tag) => new AtrapaElementu(tag),
  /** @param {string} _ns @param {string} tag */
  createElementNS: (_ns, tag) => new AtrapaElementu(tag),
  /** @param {string} tekst */
  createTextNode: (tekst) => ({ tekst }),
}

/** @param {unknown} x @returns {AtrapaElementu} */
function atrapa(x) {
  assert.ok(x instanceof AtrapaElementu)
  return x
}

/** @param {unknown[]} wezly @returns {AtrapaElementu[]} */
const wszystkie = (wezly) => wezly.flatMap((w) => atrapa(w).wszystkie)
/** @param {unknown[]} wezly @param {string} klasa @returns {AtrapaElementu[]} */
const zKlasa = (wezly, klasa) => wszystkie(wezly).filter((e) => (e.atrybuty.get('class') ?? '').split(' ').includes(klasa))
/** @param {unknown[]} wezly @param {string} klasa @returns {string[]} */
const teksty = (wezly, klasa) => zKlasa(wezly, klasa).map((e) => e.tekst)

/** @returns {Promise<Oferta>} */
const ofertaTypowa = async () => JSON.parse(await readFile(FIXTURE, 'utf8'))
const BEZ_DRUKU = { czyWazna: true, naPobierz: () => {} }

describe('widokOferty: dokument oferty wg makiety', () => {
  /** @type {unknown} */
  let poprzedni
  beforeEach(() => {
    poprzedni = Reflect.get(globalThis, 'document')
    Reflect.set(globalThis, 'document', atrapaDokumentu)
  })
  afterEach(() => { Reflect.set(globalThis, 'document', poprzedni) })

  it('ważna oferta: nagłówek firmy, numer, ważność, „Dla”, kwoty, VAT, dodatki, zakres i warunki bez banera', async () => {
    const wezly = widokOferty(await ofertaTypowa(), BEZ_DRUKU)

    assert.equal(wezly.length, 1)
    assert.deepEqual(teksty(wezly, 'oferta__inicjaly'), ['TF'])
    assert.deepEqual(teksty(wezly, 'oferta__nazwa-firmy'), ['Twoja Firma Sprzątająca'])
    assert.deepEqual(teksty(wezly, 'oferta__kontakt'), ['tel. 500 000 000 · biuro@twojafirma.pl'])
    assert.deepEqual(wszystkie(wezly).filter((e) => e.tag === 'h1').map((e) => e.tekst), ['Wycena nr 15/10/2026'])
    assert.deepEqual(teksty(wezly, 'oferta__drobny'), ['ważna do 7 listopada 2026', 'ul. Przykładowa 1, 00-001 Warszawa · termin: 14 listopada 2026, 9:00'])
    assert.deepEqual(teksty(wezly, 'oferta__klient'), ['Anna Kowalska'])
    assert.deepEqual(teksty(wezly, 'oferta__wiersz'), [
      `Mieszkanie lub dom – sprzątanie standardowe, 50 m²290${NBSP}zł`, `Dojazd4${NBSP}zł`, `Mycie okien 1-skrzydłowych (4 szt.)+120${NBSP}zł`,
    ])
    assert.deepEqual(teksty(wezly, 'oferta__razem'), [`Razem do zapłaty294${NBSP}zł`])
    assert.deepEqual(teksty(wezly, 'oferta__vat'), ['Kwota bez VAT – firma zwolniona z VAT.'])
    assert.equal(zKlasa(wezly, 'oferta__lista')[0]?.dzieci.length, 5)
    assert.deepEqual(teksty(wezly, 'oferta__poza'), ['Poza ceną: wnętrza szafek i AGD, mycie okien, pranie tapicerki i dywanów.'])
    assert.match(teksty(wezly, 'oferta__warunki')[0] ?? '', /^Odwołanie zlecenia jest bezpłatne .* obejrzeniu lokalu lub zdjęć\.$/)
    assert.deepEqual(zKlasa(wezly, 'oferta__baner'), [])
  })

  it('„Zadzwoń” to link tel: z cyfr numeru, a „Pobierz PDF” woła druk', async () => {
    let wydruki = 0
    const wezly = widokOferty(await ofertaTypowa(), { czyWazna: true, naPobierz: () => { wydruki += 1 } })
    const [zadzwon, pobierz] = zKlasa(wezly, 'oferta__przycisk')

    assert.deepEqual([zadzwon?.tag, zadzwon?.atrybuty.get('href'), zadzwon?.tekst], ['a', 'tel:500000000', 'Zadzwoń: 500 000 000'])
    assert.deepEqual([pobierz?.tag, pobierz?.atrybuty.get('type'), pobierz?.tekst], ['button', 'button', 'Pobierz PDF'])
    pobierz?.zdarzenia.get('click')?.()
    assert.equal(wydruki, 1)
  })

  it('po terminie: baner z datą ważności nad dokumentem, dokument zostaje', async () => {
    const oferta = { ...await ofertaTypowa(), waznaDo: '2026-10-01' }

    const wezly = widokOferty(oferta, { ...BEZ_DRUKU, czyWazna: false })

    assert.deepEqual(wezly.map((w) => atrapa(w).tag), ['p', 'article'])
    assert.equal(atrapa(wezly[0]).tekst, 'Oferta była ważna do 1 października 2026. Zadzwoń, żeby potwierdzić aktualną cenę.')
    assert.deepEqual(teksty(wezly, 'oferta__razem'), [`Razem do zapłaty294${NBSP}zł`])
  })

  it('szybka wycena z widełkami: „Razem do zapłaty: 254–304 zł”, linie usług bez kwot, VAT czynny bez kwot', async () => {
    const typowa = await ofertaTypowa()
    const oferta = { ...typowa, szybka: true, razem: { od: 254, do: 304 }, uslugi: [{ opis: 'Sprzątanie mieszkania', kwota: 250 }],
      vat: { status: /** @type {const} */ ('czynny'), stawka: 23, netto: null, kwotaVat: null } }

    const wezly = widokOferty(oferta, BEZ_DRUKU)

    assert.deepEqual(teksty(wezly, 'oferta__razem'), [`Razem do zapłaty: 254–304${NBSP}zł`])
    assert.deepEqual(teksty(wezly, 'oferta__wiersz').slice(0, 2), ['Sprzątanie mieszkania', `Dojazd4${NBSP}zł`])
    assert.deepEqual(teksty(wezly, 'oferta__vat'), ['Cena zawiera VAT 23%.'])
  })

  it('szybka po oględzinach: „Razem do zapłaty: od 1 200 zł”, linie usług bez kwot, VAT bez kwot', async () => {
    const typowa = await ofertaTypowa()
    const oferta = { ...typowa, szybka: true, razem: { od: 1200, do: 1200 }, trybCeny: /** @type {const} */ ('od'),
      uslugi: [{ opis: 'Sprzątanie po remoncie', kwota: 1196 }], vat: { status: /** @type {const} */ ('czynny'), stawka: 23, netto: null, kwotaVat: null } }

    const wezly = widokOferty(oferta, BEZ_DRUKU)

    assert.deepEqual(teksty(wezly, 'oferta__razem'), [`Razem do zapłaty: od 1${NBSP}200${NBSP}zł`])
    assert.deepEqual(teksty(wezly, 'oferta__wiersz').slice(0, 2), ['Sprzątanie po remoncie', `Dojazd4${NBSP}zł`])
    assert.deepEqual(teksty(wezly, 'oferta__vat'), ['Cena zawiera VAT 23%.'])
  })

  it('abonament: pod „Razem” dopisek o kwocie za wizytę i kwota miesięczna; bez abonamentu dopisku nie ma', async () => {
    const typowa = await ofertaTypowa()
    const oferta = { ...typowa, abonament: { wizyt: 4.33, miesiecznie: { od: 1273, do: 1273 } } }

    const wezly = widokOferty(oferta, BEZ_DRUKU)

    assert.deepEqual(teksty(wezly, 'oferta__abonament'), [`Kwota za jedną wizytę. Miesięcznie (4,33 wizyt): 1${NBSP}273${NBSP}zł.`])
    assert.deepEqual(teksty(widokOferty(typowa, BEZ_DRUKU), 'oferta__abonament'), [])
  })

  it('pola puste: bez dojazdu 0 zł, bez „Dla”, dodatków, zakresu, warunków i „Zadzwoń” przy firmie bez telefonu', async () => {
    const typowa = await ofertaTypowa()
    const oferta = { ...typowa, dojazd: 0, firma: { nazwa: '', telefon: '', email: '', nip: '' }, klient: { nazwa: '', adres: '', termin: null },
      dodatkiOpcjonalne: [], zakres: { wchodzi: [], nie_wchodzi: [] }, warunki: [] }

    const wezly = widokOferty(oferta, BEZ_DRUKU)

    assert.deepEqual(teksty(wezly, 'oferta__wiersz'), [`Mieszkanie lub dom – sprzątanie standardowe, 50 m²290${NBSP}zł`])
    for (const klasa of ['oferta__inicjaly', 'oferta__kontakt', 'oferta__pole', 'oferta__zakres', 'oferta__warunki']) {
      assert.deepEqual(zKlasa(wezly, klasa), [], klasa)
    }
    assert.deepEqual(teksty(wezly, 'oferta__przycisk'), ['Pobierz PDF'])
  })

  it('tekst z linku trafia jako węzeł tekstowy, nie jako HTML', async () => {
    const wstawka = '<img src=x onerror=alert(1)>'
    const oferta = { ...await ofertaTypowa(), klient: { nazwa: wstawka, adres: '', termin: null } }

    const wezly = widokOferty(oferta, BEZ_DRUKU)

    assert.deepEqual(zKlasa(wezly, 'oferta__klient')[0]?.dzieci, [{ tekst: wstawka }])
    assert.equal(wszystkie(wezly).some((e) => e.tag === 'img'), false)
  })

  it('data ważności spoza formatu rzuca BladFormatu (dekoder takiej oferty nie przepuści)', async () => {
    const oferta = { ...await ofertaTypowa(), waznaDo: 'jutro' }

    assert.throws(() => widokOferty(oferta, BEZ_DRUKU), BladFormatu)
  })
})

describe('widokOdmowy: sam komunikat zamiast oferty', () => {
  /** @type {unknown} */
  let poprzedni
  beforeEach(() => {
    poprzedni = Reflect.get(globalThis, 'document')
    Reflect.set(globalThis, 'document', atrapaDokumentu)
  })
  afterEach(() => { Reflect.set(globalThis, 'document', poprzedni) })

  it('stara przeglądarka ma własny komunikat w regionie alertu', () => {
    const komunikat = atrapa(widokOdmowy('przegladarka'))

    assert.equal(komunikat.atrybuty.get('role'), 'alert')
    assert.equal(komunikat.tekst, 'Ta przeglądarka nie otworzy oferty. Otwórz link w aktualnej wersji przeglądarki albo poproś firmę o PDF.')
  })

  for (const powod of /** @type {const} */ (['uszkodzony', 'brak', 'wersja'])) {
    it(`powód „${powod}” pokazuje komunikat o uszkodzonym linku`, () => {
      assert.equal(atrapa(widokOdmowy(powod)).tekst, 'Ten link do oferty jest niepełny albo uszkodzony. Poproś firmę o nowy link.')
    })
  }
})

describe('teksty oferty', () => {
  it('tekstVat: zwolniony, czynny z kwotami (grosze), czynny przy widełkach', () => {
    assert.equal(tekstVat({ status: 'zwolniony', stawka: 23, netto: 294, kwotaVat: 0 }), 'Kwota bez VAT – firma zwolniona z VAT.')
    assert.equal(tekstVat({ status: 'czynny', stawka: 23, netto: 239.02, kwotaVat: 54.98 }),
      `Cena zawiera VAT 23%: 54,98${NBSP}zł (netto 239,02${NBSP}zł).`)
    assert.equal(tekstVat({ status: 'czynny', stawka: 23, netto: 300, kwotaVat: 69 }), `Cena zawiera VAT 23%: 69${NBSP}zł (netto 300${NBSP}zł).`)
  })

  it('tekstRazem: jedna kwota bez dwukropka, widełki z dwukropkiem, tysiące z twardą spacją', () => {
    assert.deepEqual(tekstRazem({ od: 294, do: 294 }), { etykieta: 'Razem do zapłaty', kwota: `294${NBSP}zł` })
    assert.deepEqual(tekstRazem({ od: 1200, do: 1500 }), { etykieta: 'Razem do zapłaty: ', kwota: `1${NBSP}200–1${NBSP}500${NBSP}zł` })
  })

  it('tekstRazem z trybem szybkiej wyceny: „ok. 290 zł”, „od 290 zł”; widełki zostają widełkami', () => {
    assert.deepEqual(tekstRazem({ od: 290, do: 290 }, 'ok'), { etykieta: 'Razem do zapłaty: ', kwota: `ok. 290${NBSP}zł` })
    assert.deepEqual(tekstRazem({ od: 290, do: 290 }, 'od'), { etykieta: 'Razem do zapłaty: ', kwota: `od 290${NBSP}zł` })
    assert.deepEqual(tekstRazem({ od: 290, do: 290 }, 'stala'), { etykieta: 'Razem do zapłaty', kwota: `290${NBSP}zł` })
    assert.deepEqual(tekstRazem({ od: 250, do: 320 }, 'widelki').kwota, `250–320${NBSP}zł`)
  })

  it('tekstAbonamentu: liczba wizyt z przecinkiem i kwota miesięczna w trybie kwoty', () => {
    assert.equal(tekstAbonamentu({ wizyt: 4.33, miesiecznie: { od: 1100, do: 1316 } }, 'widelki'),
      `Kwota za jedną wizytę. Miesięcznie (4,33 wizyt): 1${NBSP}100–1${NBSP}316${NBSP}zł.`)
    assert.equal(tekstAbonamentu({ wizyt: 8.67, miesiecznie: { od: 2514, do: 2514 } }, 'ok'),
      `Kwota za jedną wizytę. Miesięcznie (8,67 wizyt): ok. 2${NBSP}514${NBSP}zł.`)
  })

  it('inicjalyFirmy: dwie pierwsze litery słów, wielkie; pusta nazwa daje pusty tekst', () => {
    assert.equal(inicjalyFirmy('Twoja Firma Sprzątająca'), 'TF')
    assert.equal(inicjalyFirmy('  łucja '), 'Ł')
    assert.equal(inicjalyFirmy('   '), '')
  })

  it('tekstKontaktu: telefon, e-mail i NIP tylko te, które firma podała', () => {
    assert.equal(tekstKontaktu({ nazwa: 'X', telefon: '600 123 456', email: '', nip: '5250000000' }), 'tel. 600 123 456 · NIP 5250000000')
    assert.equal(tekstKontaktu({ nazwa: 'X', telefon: '', email: '', nip: '' }), '')
  })

  it('adresTelefonu: same cyfry z + na początku; bez cyfr null', () => {
    assert.equal(adresTelefonu(' +48 500-000-000 '), 'tel:+48500000000')
    assert.equal(adresTelefonu('javascript:alert(1)'), 'tel:1')
    assert.equal(adresTelefonu('brak'), null)
  })

  it('tekstPozaCena: mała litera poza skrótami, bez kropek w środku, jedno zdanie', () => {
    assert.equal(tekstPozaCena(['Mycie okien.', 'AGD z zewnątrz', 'Ł']), 'Poza ceną: mycie okien, AGD z zewnątrz, ł.')
  })

  it('tekstWarunkow: jeden akapit, kropka dopisana tylko tam, gdzie zdanie jej nie ma', () => {
    assert.equal(tekstWarunkow(['Bez zaliczki', 'Płatność gotówką.', 'Pytania?']), 'Bez zaliczki. Płatność gotówką. Pytania?')
    assert.equal(tekstWarunkow([]), '')
  })

  it('tytulOferty: numer i nazwa firmy, bez nazwy sam numer', async () => {
    const oferta = await ofertaTypowa()
    assert.equal(tytulOferty(oferta), 'Wycena nr 15/10/2026 – Twoja Firma Sprzątająca')
    assert.equal(tytulOferty({ ...oferta, firma: { ...oferta.firma, nazwa: '' } }), 'Wycena nr 15/10/2026')
  })
})
