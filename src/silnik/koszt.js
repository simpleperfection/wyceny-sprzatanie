// Koszt zlecenia jednoosobowej firmy (chemia, sprzet, dojazd firmy; bez robocizny) i kwota, ktora zostaje dla wlasciciela.
// Chemia jak Chemia-Jednostki w scripts/kalibracja.ps1; tempo zmienia czas pracy i sprzetu, nie cene (R15).

import { BladKatalogu, BladWejscia } from './bledy.js'
import { sprawdzStatusVat } from './vat.js'

/** @typedef {import('./katalog.js').Katalog} Katalog */
/** @typedef {import('./katalog.js').KosztyFirmy} KosztyFirmy */
/** @typedef {import('./katalog.js').Pozycja} Pozycja */
/** @typedef {import('./cena.js').LiniaWyceny} LiniaWyceny */
/** @typedef {import('./cena.js').WynikWyceny} WynikWyceny */
/** @typedef {import('./vat.js').CenaKlienta} CenaKlienta */
/** @typedef {import('./vat.js').StatusVat} StatusVat */
/**
 * @typedef {{ id: string, nazwa: string, kwota: number }} KosztSprzetu
 * @typedef {{ przychod: number, kosztRazem: number, zostaje: number }} WynikMiesieczny
 * @typedef {{ minutyNormowe: number, minutyWlasne: number, chemia: number, sprzet: KosztSprzetu[], dojazdFirmy: { km: number, kwota: number },
 *   kosztRazem: number, przychod: number, zostaje: number, zostajeNaGodzine: number, miesiecznie: WynikMiesieczny | null }} KosztZlecenia
 * @typedef {{ wynik: WynikWyceny, cenaKlienta: CenaKlienta, tempo: number, koszty: KosztyFirmy, statusVat: StatusVat }} WejscieKosztu
 */

const MINUT_W_GODZINIE = 60
const KURSOW_NA_ZLECENIE = 2 // dojazd do klienta i powrot
const RODZAJ_PRACY = 'praca'
const RODZAJ_MATERIALU = 'material'

/** @param {number} x */
function jestDodatnia(x) {
  return Number.isFinite(x) && x > 0
}

/** @param {Katalog} katalog @returns {Map<string, Pozycja>} */
function pozycjeWgKlucza(katalog) {
  return new Map(katalog.uslugi.flatMap((u) => (u.pozycje ?? []).map((p) => [`${u.id}.${p.id}`, p])))
}

/** @param {Map<string, Pozycja>} pozycje @param {LiniaWyceny} linia @returns {Pozycja} */
function pozycjaLinii(pozycje, linia) {
  const pozycja = pozycje.get(linia.klucz ?? '')
  if (!pozycja) throw new BladWejscia('nieznana_pozycja', `Linia wyceny bez pozycji katalogu: ${linia.klucz}`)
  return pozycja
}

/**
 * Chemia linii: praca w pomieszczeniach = chemia_h × minuty normowe / 60; pozycja = ilosc × koszt chemii na jednostke,
 * a bez niego chemia_h × czas pozycji. Material doliczany klientowi to ta sama chemia pozycji, wiec nie liczy sie drugi raz.
 * @param {LiniaWyceny} linia @param {Map<string, Pozycja>} pozycje @param {number} chemiaH
 */
function chemiaLinii(linia, pozycje, chemiaH) {
  if (linia.rodzaj === RODZAJ_MATERIALU) return 0
  if (linia.rodzaj === RODZAJ_PRACY) return (chemiaH * linia.minuty) / MINUT_W_GODZINIE
  const pozycja = pozycjaLinii(pozycje, linia)
  const naJednostke = pozycja.koszt_chemii_m2 ?? pozycja.koszt_chemii_szt
  return naJednostke === undefined ? (chemiaH * linia.minuty) / MINUT_W_GODZINIE : linia.ilosc * naJednostke
}

/** @param {KosztyFirmy} koszty @param {string} id @returns {{ nazwa: string, koszt_h: number }} */
function sprzetFirmy(koszty, id) {
  const sprzet = koszty.sprzet[id]
  if (typeof sprzet !== 'object' || !Number.isFinite(sprzet.koszt_h)) throw new BladKatalogu('brak_sprzetu', `Brak kosztu godziny sprzętu ${id}`)
  return sprzet
}

/**
 * Sprzet: Σ czas pozycji z `sprzet` × tempo / 60 × koszt_h, zsumowany wg rodzaju sprzetu.
 * @param {LiniaWyceny[]} linie @param {Map<string, Pozycja>} pozycje @param {number} tempo @param {KosztyFirmy} koszty
 * @returns {KosztSprzetu[]}
 */
function kosztSprzetu(linie, pozycje, tempo, koszty) {
  /** @type {Map<string, KosztSprzetu>} */
  const wgId = new Map()
  for (const linia of linie) {
    if (linia.rodzaj === RODZAJ_PRACY || linia.rodzaj === RODZAJ_MATERIALU) continue
    const id = pozycjaLinii(pozycje, linia).sprzet
    if (!id) continue
    const sprzet = sprzetFirmy(koszty, id)
    const kwota = ((linia.minuty * tempo) / MINUT_W_GODZINIE) * sprzet.koszt_h
    const dotychczas = wgId.get(id)
    wgId.set(id, { id, nazwa: sprzet.nazwa, kwota: (dotychczas?.kwota ?? 0) + kwota })
  }
  return [...wgId.values()]
}

/** @param {WejscieKosztu} wejscie */
function sprawdzWejscie({ wynik, cenaKlienta, tempo, koszty, statusVat }) {
  if (!jestDodatnia(tempo)) throw new BladWejscia('tempo', `Tempo musi być dodatnie, jest ${tempo}`)
  if (!jestDodatnia(wynik?.minutyNormowe)) throw new BladWejscia('minuty_normowe', `Wycena bez dodatniego czasu normowego: ${wynik?.minutyNormowe}`)
  if (!Number.isFinite(cenaKlienta?.brutto) || !Number.isFinite(cenaKlienta?.netto)) throw new BladWejscia('cena_klienta', 'Brak ceny dla klienta')
  if (!Number.isFinite(koszty?.chemia_h?.wartosc) || !Number.isFinite(koszty?.dojazd?.koszt_firmy_zl_km)) {
    throw new BladWejscia('koszty_firmy', 'Niepełne koszty firmy: chemia_h albo koszt_firmy_zl_km')
  }
  sprawdzStatusVat(statusVat)
}

/**
 * Koszt zlecenia i „zostaje dla Ciebie”. Przychod czynnego podatnika to netto, firmy zwolnionej brutto.
 * Abonament: wartosci za wizyte, a `miesiecznie` × wizyt_w_miesiacu.
 * @param {WejscieKosztu} wejscie `koszty` to koszty_firmy z data/ceny.json juz scalone z ustawieniami
 * @param {Katalog} katalog
 * @returns {KosztZlecenia}
 */
export function kosztZlecenia(wejscie, katalog) {
  sprawdzWejscie(wejscie)
  const { wynik, cenaKlienta, tempo, koszty, statusVat } = wejscie
  const pozycje = pozycjeWgKlucza(katalog)
  const minutyWlasne = wynik.minutyNormowe * tempo
  const chemia = wynik.linie.reduce((suma, l) => suma + chemiaLinii(l, pozycje, koszty.chemia_h.wartosc), 0)
  const sprzet = kosztSprzetu(wynik.linie, pozycje, tempo, koszty)
  const km = wynik.dojazd.km
  const dojazdFirmy = { km, kwota: KURSOW_NA_ZLECENIE * km * koszty.dojazd.koszt_firmy_zl_km }
  const kosztRazem = chemia + sprzet.reduce((suma, s) => suma + s.kwota, 0) + dojazdFirmy.kwota
  const przychod = statusVat === 'czynny' ? cenaKlienta.netto : cenaKlienta.brutto
  const zostaje = przychod - kosztRazem
  const wizyt = wynik.wizytWMiesiacu
  return {
    minutyNormowe: wynik.minutyNormowe, minutyWlasne, chemia, sprzet, dojazdFirmy, kosztRazem, przychod, zostaje,
    zostajeNaGodzine: zostaje / (minutyWlasne / MINUT_W_GODZINIE),
    miesiecznie: wizyt === null ? null : { przychod: przychod * wizyt, kosztRazem: kosztRazem * wizyt, zostaje: zostaje * wizyt },
  }
}
