// Krok dodatkow kreatora (`#/kreator/dodatki?wycena=<id>`, makieta kreator-dodatki): karta „Dodatki” z pozycjami uslug z listy
// `dodatki` wybranej uslugi (pogrupowane wg uslugi, przelacznik „w cenie”, arkusz ilosci z „Zaproponuj w ofercie”), karta
// „Dojazd” z licznikiem km, kwota dla klienta i kosztem firmy, stopka z „Razem” i suma propozycji. Zmiany przez
// src/kreator/pozycje.js i `zmienWejscie`; widok tylko rysuje.

import { wczytajStan } from '../dane/magazyn.js'
import { scalKoszty } from '../dane/ustawienia.js'
import { infoDojazdu, MAKS_DOJAZDU_KM, MAKS_ILOSCI, ustawDodatek, ustawDojazd, wycenaDodatku } from '../kreator/pozycje.js'
import { bladZakresu, kwotaJednostki, nazwaJednostki, tekstLiczby, zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { licznik, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, karta } from '../ui/komponenty/uklad.js'
import { adresKroku, BLAD_ILOSCI, odswiezStopke, ramaKroku, wycenaKroku, zapisKroku } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/cena.js').WejscieWyceny} WejscieWyceny */
/** @typedef {import('../silnik/cena.js').DodatekWyceny} DodatekWyceny */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').Usluga} Usluga */
/** @typedef {import('../silnik/katalog.js').Pozycja} Pozycja */
/** @typedef {import('../kreator/pozycje.js').StawkiDojazdu} StawkiDojazdu */
/**
 * @typedef {{ usluga: Usluga, pozycja: Pozycja }} PozycjaDodatku
 * @typedef {{ naPrzelacz: (d: PozycjaDodatku, czyWCenie: boolean) => void, naOtworz: (d: PozycjaDodatku) => void }} AkcjeDodatku
 */

const NOTKA = 'Włączone dodatki wchodzą do ceny. „Zaproponuj w ofercie” – klient zobaczy je jako „Możesz dobrać”.'
const BEZ_DODATKOW = 'Ta usługa nie ma dodatków.'
const BLAD_DOJAZDU = bladZakresu({ min: 0, max: MAKS_DOJAZDU_KM })
/** @type {ReadonlyMap<string, string>} */
const TEKSTY_BLEDOW = new Map([['ilosc', BLAD_ILOSCI], ['dojazd', BLAD_DOJAZDU]])
const ILOSC_NOWEGO_DODATKU = 1

/** @param {PozycjaDodatku} d */
const kluczDodatku = (d) => `${d.usluga.id}.${d.pozycja.id}`
/** @param {Wycena} wycena @param {PozycjaDodatku} d @returns {DodatekWyceny | undefined} */
const zapisanyDodatek = (wycena, d) => (wycena.wejscie.dodatki ?? []).find((x) => x.uslugaId === d.usluga.id && x.pozycjaId === d.pozycja.id)

/** @param {PozycjaDodatku} d @param {Wycena} wycena @param {Katalog} katalog @param {AkcjeDodatku} akcje @returns {HTMLElement} */
function wierszDodatku(d, wycena, katalog, akcje) {
  const dodatek = zapisanyDodatek(wycena, d)
  const klucz = kluczDodatku(d)
  const { cenaJedn, kwota } = wycenaDodatku({ uslugaId: d.usluga.id, pozycjaId: d.pozycja.id, ilosc: dodatek?.ilosc ?? 0 },
    wycena.wejscie.wojewodztwoId ?? null, katalog)
  const cena = d.pozycja.jednostka === 'szt' ? kwotaJednostki(cenaJedn) : `${kwotaJednostki(cenaJedn)}/${nazwaJednostki(d.pozycja.jednostka)}`
  const iloczyn = dodatek ? `${tekstLiczby(dodatek.ilosc)} × ${kwotaJednostki(cenaJedn)}` : cena
  const czyPropozycja = dodatek?.tryb === 'propozycja'
  const idOpisu = `dodatek-${d.usluga.id}-${d.pozycja.id}-opis`
  return h('div', { class: ['wiersz-pozycji', dodatek?.tryb !== 'w_cenie' && 'wiersz-pozycji--wylaczona'] },
    h('input', {
      type: 'checkbox', role: 'switch', class: 'przelacznik__wejscie', checked: dodatek?.tryb === 'w_cenie', 'data-przelacznik': klucz,
      'aria-label': `W cenie: ${d.pozycja.nazwa}`, 'aria-describedby': idOpisu,
      on: { change: (zdarzenie) => akcje.naPrzelacz(d, zdarzenie.currentTarget instanceof HTMLInputElement && zdarzenie.currentTarget.checked) },
    }),
    h('button', { type: 'button', class: 'wiersz-pozycji__tresc wiersz-pozycji__przycisk', 'aria-haspopup': 'dialog', 'data-dodatek': klucz,
      on: { click: () => akcje.naOtworz(d) } },
    h('span', { class: 'wiersz-pozycji__nazwa' }, d.pozycja.nazwa),
    h('span', { class: 'wiersz-pozycji__opis', id: idOpisu }, czyPropozycja ? `${iloczyn} · zaproponuj w ofercie` : iloczyn)),
    h('span', { class: 'wiersz-pozycji__kwota liczba' }, dodatek ? `${czyPropozycja ? '+' : ''}${zl(kwota)}` : '–'))
}

/** @param {Usluga} usluga @param {Katalog} katalog @returns {{ usluga: Usluga, pozycje: PozycjaDodatku[] }[]} */
const grupyDodatkow = (usluga, katalog) => (usluga.dodatki ?? []).map((id) => {
  const zrodlo = katalog.usluga(id)
  return { usluga: zrodlo, pozycje: (zrodlo.pozycje ?? []).map((pozycja) => ({ usluga: zrodlo, pozycja })) }
})

/** @param {Usluga} usluga @param {Wycena} wycena @param {Katalog} katalog @param {AkcjeDodatku} akcje @returns {Node[]} */
function kartaDodatkow(usluga, wycena, katalog, akcje) {
  const grupy = grupyDodatkow(usluga, katalog)
  if (grupy.length === 0) return [h('p', { class: 'kreator-pozycje__notka' }, BEZ_DODATKOW)]
  return [
    karta({ tytul: 'Dodatki', klasa: 'karta-pozycji' }, grupy.map((g) => h('section', { class: 'grupa-dodatkow', 'aria-label': g.usluga.nazwa },
      h('h3', { class: 'grupa-dodatkow__tytul' }, g.usluga.nazwa),
      g.pozycje.map((d) => wierszDodatku(d, wycena, katalog, akcje))))),
    h('p', { class: 'kreator-pozycje__notka' }, NOTKA),
  ]
}

/** @param {number} km @param {StawkiDojazdu} stawki @returns {Node[]} wiersze „Dla klienta” i „Twój koszt” */
function wierszeDojazdu(km, stawki) {
  const info = infoDojazdu(km, stawki)
  const promien = tekstLiczby(stawki.darmowy_promien_km)
  const dlaKlienta = info.kmPonad > 0
    ? `Dla klienta (${tekstLiczby(info.kmPonad)} km ponad ${promien} km × ${kwotaJednostki(stawki.klient_zl_km)})`
    : `Dla klienta (w promieniu ${promien} km)`
  /** @param {string} tekst @param {number} kwota @param {string} [klasa] */
  const wiersz = (tekst, kwota, klasa) => h('p', { class: ['wiersz-dojazdu', klasa] },
    h('span', null, tekst), h('span', { class: 'wiersz-dojazdu__kwota liczba' }, kwotaJednostki(kwota)))
  return [
    wiersz(dlaKlienta, info.kwotaKlienta),
    wiersz(`Twój koszt (${tekstLiczby(info.kmRazem)} km × ${kwotaJednostki(stawki.koszt_firmy_zl_km)})`, info.kosztFirmy, 'wiersz-dojazdu--koszt'),
  ]
}

/** @type {Widok} */
export const widokKreatoraDodatkow = {
  render(kontener, { zapytanie, kontekst }) {
    const { katalog, magazyn, nawiguj } = kontekst
    const poczatkowa = wycenaKroku(kontener, zapytanie, kontekst)
    if (!poczatkowa) return
    const usluga = katalog.usluga(poczatkowa.wejscie.uslugaId)
    const stawki = scalKoszty(katalog.kosztyFirmy, wczytajStan(magazyn).ustawienia).dojazd
    let wycena = poczatkowa
    const dojazd = h('div', { class: 'kreator-dodatki__dojazd', 'aria-live': 'polite' })
    const { zapisz, pokazBlad, komunikat } = zapisKroku({
      kontekst, wycena: () => wycena, teksty: TEKSTY_BLEDOW, naZapis: (w) => { wycena = w },
      naEkranie: (w) => JSON.stringify([w.dodatki ?? [], w.dojazdKm ?? 0]),
      naNieaktualnej: (w) => { wycena = w; rysuj() },
    })

    /** @param {Node[]} tresc */
    function rama(tresc) {
      const wynik = ramaKroku({ krok: 'dodatki', wycena, katalog, tresc, naDalej: () => nawiguj(adresKroku('chemia', wycena.id)) })
      const doZaproponowania = (wycena.wynik?.propozycje ?? []).reduce((suma, p) => suma + p.kwota, 0)
      const razem = wynik.elementy.at(-1)
      const kwota = razem instanceof HTMLElement ? razem.querySelector('.stopka-kreatora__razem') : null
      if (kwota && doZaproponowania > 0) kwota.append(h('span', { class: 'stopka-kreatora__etykieta' }, `+${zl(doZaproponowania)} do zaproponowania`))
      return wynik
    }

    /** @param {PozycjaDodatku} d @param {number} ilosc @param {DodatekWyceny['tryb']} tryb @returns {string | null} */
    const zapiszDodatek = (d, ilosc, tryb) => zapisz((w) => ustawDodatek(w, d.usluga.id, d.pozycja.id, ilosc, tryb, katalog))

    /** @type {AkcjeDodatku} */
    const akcje = {
      naPrzelacz(d, czyWCenie) {
        const blad = zapiszDodatek(d, czyWCenie ? zapisanyDodatek(wycena, d)?.ilosc ?? ILOSC_NOWEGO_DODATKU : 0, 'w_cenie')
        rysuj(`[data-przelacznik="${kluczDodatku(d)}"]`)
        if (blad !== null) pokazBlad(blad)
      },
      naOtworz: handleOtworz,
    }

    /** @param {PozycjaDodatku} d */
    function handleOtworz(d) {
      const zapisany = zapisanyDodatek(wycena, d)
      let ilosc = zapisany?.ilosc ?? ILOSC_NOWEGO_DODATKU
      const pole = licznik({ id: 'dodatek-ilosc', etykieta: 'Ilość', wartosc: Math.min(ilosc, MAKS_ILOSCI), max: MAKS_ILOSCI,
        jednostka: nazwaJednostki(d.pozycja.jednostka), tekstBledu: BLAD_ILOSCI, naZmiane: (n) => { ilosc = n } })
      /** @param {DodatekWyceny['tryb']} tryb @param {number} [wymuszona] */
      function handleZapisz(tryb, wymuszona) {
        if (wymuszona === undefined && pole.querySelector('[aria-invalid="true"]')) return
        const blad = zapiszDodatek(d, wymuszona ?? ilosc, tryb)
        if (blad === BLAD_ILOSCI) return ustawBlad(pole, blad)
        dialog.close()
        rysuj(`[data-dodatek="${kluczDodatku(d)}"]`)
        if (blad !== null) pokazBlad(blad)
      }
      const dialog = arkusz({ tytul: d.pozycja.nazwa }, h('div', { class: 'arkusz__formularz' },
        pole,
        przycisk({ tekst: 'W cenie', naKlik: () => handleZapisz('w_cenie') }),
        przycisk({ tekst: 'Zaproponuj w ofercie', rodzaj: 'drugi', naKlik: () => handleZapisz('propozycja') }),
        zapisany ? przycisk({ tekst: 'Usuń', rodzaj: 'tekstowy', ikona: 'trash', naKlik: () => handleZapisz(zapisany.tryb, 0) }) : null))
      dialog.addEventListener('close', () => dialog.remove())
      document.body.append(dialog)
      dialog.showModal()
    }

    /** @param {number} km @param {HTMLElement} pole licznik z bledem pod spodem */
    function handleDojazd(km, pole) {
      const blad = zapisz((w) => ustawDojazd(w, km))
      if (blad !== null && blad !== BLAD_DOJAZDU) return pokazBlad(blad)
      ustawBlad(pole, blad)
      if (blad !== null) return
      dojazd.replaceChildren(...wierszeDojazdu(km, stawki))
      odswiezStopke(kontener, rama)
    }

    function kartaDojazdu() {
      const km = wycena.wejscie.dojazdKm ?? 0
      const pole = licznik({ id: 'dojazd-km', etykieta: 'Odległość w jedną stronę', wartosc: Math.min(km, MAKS_DOJAZDU_KM), max: MAKS_DOJAZDU_KM,
        jednostka: 'km', tekstBledu: BLAD_DOJAZDU, naZmiane: (n) => handleDojazd(n, pole) })
      dojazd.replaceChildren(...wierszeDojazdu(km, stawki))
      return karta({ tytul: 'Dojazd', klasa: 'karta-dojazdu' }, pole, dojazd)
    }

    /** @param {string} [fokus] selektor elementu do fokusu po narysowaniu */
    function rysuj(fokus) {
      kontener.replaceChildren(...rama([...kartaDodatkow(usluga, wycena, katalog, akcje), komunikat, kartaDojazdu()]).elementy)
      const element = fokus ? kontener.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    rysuj()
  },
}
