// Karta klienta (`#/klienci/<id>`, makieta „Karta klienta” w docs/operator/aplikacja-modulowa-makiety.html): powrot „Klienci”,
// „Edytuj”, inicjaly i nazwa, telefon (link `tel:`) i adres (link do mapy) jednym dotknieciem, notatki w calosci, „Nowa wycena”
// z tym klientem i historia wycen z kwota i statusem. „Usuń klienta” tylko bez historii (wyceny ani zlecenia, R18).

import { BladKlienta, klient, usunKlienta } from '../dane/klienci.js'
import { wczytajStan } from '../dane/magazyn.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { baner, dialogPotwierdzenia, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { pigulkaStatusu } from '../ui/statusy.js'
import { sciezka } from '../ui/trasy.js'
import { czyMaHistorie, historiaWycen, inicjaly, linkMapy, linkTelefonu } from './klienci-dane.js'
import { adresWyceny } from './start-dane.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../dane/klienci.js').Klient} Klient */
/** @typedef {import('./klienci-dane.js').PozycjaHistorii} PozycjaHistorii */

const POWROT = { wstecz: sciezka('klienci'), wsteczTekst: 'Klienci' }
const ID_WYCEN = 'karta-klienta-wyceny'
const NIE_MA_KLIENTA = 'Nie ma takiego klienta.'
const MA_HISTORIE = 'Tego klienta nie można usunąć, bo ma wyceny albo zlecenia.'
const BLAD_USUNIECIA = 'Nie udało się usunąć klienta. Spróbuj jeszcze raz.'

/** @param {unknown} blad @returns {string} tekst bledu usuniecia; blad spoza klienta i magazynu leci dalej */
function tekstBleduUsuniecia(blad) {
  if (!(blad instanceof BladKlienta)) return tekstBleduZapisu(blad)
  return blad.kod === 'ma_historie' ? MA_HISTORIE : BLAD_USUNIECIA
}

/** @param {Klient} k @returns {HTMLElement} naglowek: powrot „Klienci” i „Edytuj” w gornym pasku, inicjaly nad nazwa */
function naglowekKarty(k) {
  const gora = naglowek({ tytul: k.nazwa, ...POWROT })
  gora.classList.add('karta-klienta__naglowek')
  gora.querySelector('.naglowek__gora')?.append(przycisk({ tekst: 'Edytuj', rodzaj: 'tekstowy', adres: sciezka('edycjaKlienta', { id: k.id }) }))
  gora.querySelector('.naglowek__tytul')?.before(h('span', { class: 'karta-klienta__awatar', 'aria-hidden': 'true' }, inicjaly(k.nazwa)))
  return gora
}

/** @param {Klient} k @returns {HTMLElement | null} telefon i adres jako wiersze-linki z akcja w drugiej linii; bez obu null */
function kontakt(k) {
  const mapa = k.adres === null ? null : wiersz({ tytul: k.adres, opis: 'Pokaż na mapie', ikona: 'map-pin', adres: linkMapy(k.adres) })
  mapa?.setAttribute('target', '_blank')
  mapa?.setAttribute('rel', 'noopener noreferrer')
  const telefon = k.telefon === null ? null : wiersz({ tytul: k.telefon, opis: 'Zadzwoń', ikona: 'phone', adres: linkTelefonu(k.telefon) })
  if (telefon === null && mapa === null) return null
  return karta({ klasa: 'karta--bez-odstepu karta-klienta__kontakt' }, telefon, mapa)
}

/** @param {Pick<Katalog, 'uslugi'>} katalog @param {PozycjaHistorii} pozycja @returns {HTMLElement} */
function wierszWyceny(katalog, { wycena, opis }) {
  const usluga = katalog.uslugi.find((u) => u.id === wycena.wejscie.uslugaId)?.nazwa ?? wycena.wejscie.uslugaId
  return wiersz({ tytul: usluga, opis, adres: adresWyceny(wycena), dodatek: pigulkaStatusu(wycena.status) })
}

/** @param {Pick<Katalog, 'uslugi'>} katalog @param {PozycjaHistorii[]} historia @returns {HTMLElement} sekcja „Wyceny” */
function sekcjaWycen(katalog, historia) {
  return h('section', { class: 'karta-klienta__sekcja', 'aria-labelledby': ID_WYCEN },
    h('h2', { class: 'karta-klienta__tytul-sekcji', id: ID_WYCEN }, 'Wyceny'),
    historia.length === 0
      ? h('p', { class: 'karta-klienta__pusto' }, 'Brak wycen.')
      : karta({ klasa: 'karta--bez-odstepu' }, historia.map((pozycja) => wierszWyceny(katalog, pozycja))))
}

/** @param {HTMLElement} kontener */
function ekranBrakuKlienta(kontener) {
  kontener.append(naglowek({ tytul: 'Klienci', ...POWROT }),
    h('div', { class: 'tresc' },
      baner({ rodzaj: 'info', tekst: NIE_MA_KLIENTA, akcja: { tekst: 'Pokaż wszystkich klientów', adres: sciezka('klienci') } })))
}

/** @type {Widok} */
export const widokKartyKlienta = {
  render(kontener, { parametry, kontekst }) {
    const { magazyn, katalog, nawiguj } = kontekst
    const stan = wczytajStan(magazyn)
    const k = klient(stan, parametry.id ?? '')
    if (k === null) return ekranBrakuKlienta(kontener)
    const komunikat = h('div', { class: 'karta-klienta__komunikat', 'aria-live': 'polite' })
    let czyPytaOUsuniecie = false
    let czyAktywny = true
    const { id, nazwa } = k

    async function handleUsun() {
      if (czyPytaOUsuniecie) return
      czyPytaOUsuniecie = true
      const czyUsunac = await dialogPotwierdzenia({ tytul: `Usunąć klienta ${nazwa}?`, tresc: 'Tego nie można cofnąć.', potwierdz: 'Usuń',
        anuluj: 'Anuluj', czyNiebezpieczne: true })
      czyPytaOUsuniecie = false
      if (!czyUsunac || !czyAktywny) return
      try {
        usunKlienta(magazyn, id)
        nawiguj(sciezka('klienci'))
      } catch (blad) {
        komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBleduUsuniecia(blad) }))
      }
    }

    const notatki = k.notatki === null ? null : karta({ tytul: 'Notatki' }, h('p', { class: 'karta-klienta__notatki' }, k.notatki))
    const usun = czyMaHistorie(stan, k.id) ? null : h('div', { class: 'karta-klienta__usun' },
      przycisk({ tekst: 'Usuń klienta', rodzaj: 'tekstowy', ikona: 'trash', naKlik: () => void handleUsun().catch(reportError) }))
    kontener.append(naglowekKarty(k), h('div', { class: 'tresc karta-klienta' },
      kontakt(k),
      notatki,
      h('div', { class: 'karta-klienta__akcje' },
        przycisk({ tekst: 'Nowa wycena', adres: sciezka('kreator', { krok: 'usluga' }, { klient: k.id }) })),
      sekcjaWycen(katalog, historiaWycen(stan, k.id)),
      komunikat,
      usun))
    return () => { czyAktywny = false }
  },
}
