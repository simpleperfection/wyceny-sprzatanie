// Krok chemii kreatora (`#/kreator/chemia?wycena=<id>`, makieta dobor-chemii): zdanie wstepne z szacunkiem kosztu chemii z ustawien,
// karty kategorii srodkow dobranych do brudu i pozycji wyceny (pierwsze dwa produkty i „Pokaż wszystkie”), notki pozycji bez
// kategorii, dezynfekcja dodawana recznie (`wejscie.dezynfekcja`) i stopka „Pomiń” / „Dalej”. Dobor liczy src/silnik/chemia.js,
// zapis idzie przez `zmienWejscie` (zapisKroku); widok tylko rysuje. Kosztu chemii z tej listy nie liczymy (decyzja 2026-10-23).

import { wczytajStan } from '../dane/magazyn.js'
import { scalKoszty } from '../dane/ustawienia.js'
import { bezKategorii, kategorieDlaWyceny, kategorieDoRecznegoDodania, produktyKategorii } from '../silnik/chemia.js'
import { tekstLiczby } from '../ui/format.js'
import { h } from '../ui/h.js'
import { przycisk } from '../ui/komponenty/formularz.js'
import { kartaKategorii } from './karta-produktu.js'
import { poChemii } from './katalog-chemii.js'
import { adresKroku, ramaKroku, wycenaKroku, zapisKroku } from './kreator-wspolne.js'

/** @typedef {import('../ui/router.js').Widok} Widok */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/chemia.js').Chemia} Chemia */
/** @typedef {import('../silnik/chemia.js').Powod} Powod */

/** Produkty widoczne na karcie kategorii przed „Pokaż wszystkie” (makieta). */
const PRODUKTOW_NA_KARCIE = 2
const KATEGORIA_DEZYNFEKCJI = 'dezynfekcja'
const DODAJ_DEZYNFEKCJE = '+ Dodaj dezynfekcję'
const USUN_DEZYNFEKCJE = 'Usuń dezynfekcję'
const DODANA_RECZNIE = 'dodana ręcznie'
const BRAK_DOBORU = 'Do tego zakresu nie ma dobranych środków.'
/** Dopisek w nawiasie na koncu nazwy kategorii (np. „(kurz, sierść, brud bieżący)”) — rodzaje brudu sa w drugiej linii naglowka. */
const DOPISEK_W_NAWIASIE = /\s*\([^()]*\)$/
/** @type {ReadonlyMap<string, string>} */
const BEZ_BLEDOW_WPISU = new Map()

/** @param {number} chemiaH szacunek kosztu chemii (zł/h) z ustawien albo data/ceny.json */
const wstep = (chemiaH) =>
  `Środki dobrane do zaznaczonego brudu. To podpowiedź – koszt chemii liczymy z Twojego szacunku (${tekstLiczby(chemiaH)} zł/h), nie z tej listy.`

/** @param {string} tekst @returns {string} „Kurz” → „kurz”; skrot („AGD”) zostaje */
function zMalej(tekst) {
  const druga = tekst.charAt(1)
  if (druga === '' || druga !== druga.toLocaleLowerCase('pl')) return tekst
  return tekst.charAt(0).toLocaleLowerCase('pl') + tekst.slice(1)
}

/** @param {Powod[]} powody @returns {string | null} „kurz, sierść zwierząt · pokój, przedpokój” */
function opisPowodow(powody) {
  const co = [...new Set(powody.map((p) => zMalej(p.co)))].join(', ')
  const gdzie = [...new Set(powody.flatMap((p) => (p.gdzie ? [zMalej(p.gdzie)] : [])))].join(', ')
  return [co, gdzie].filter(Boolean).join(' · ') || null
}

/**
 * Elementy listy kroku: karty dobranych kategorii, dezynfekcja (gdy dodana), notki pozycji bez kategorii i przycisk dezynfekcji.
 * @param {{ wycena: Wycena, chemia: Chemia, katalog: Katalog, naDezynfekcje: (czyDodana: boolean) => void }} opcje
 * @returns {Node[]}
 */
function elementyListy({ wycena, chemia, katalog, naDezynfekcje }) {
  const { wejscie } = wycena
  const dezynfekcja = kategorieDoRecznegoDodania(chemia).find((k) => k.id === KATEGORIA_DEZYNFEKCJI)
  const czyDodana = dezynfekcja !== undefined && wejscie.dezynfekcja === true
  const karty = kategorieDlaWyceny(wejscie, chemia, katalog).map(({ kategoria, powody }) => kartaKategorii({
    id: kategoria.id, tytul: kategoria.nazwa.replace(DOPISEK_W_NAWIASIE, ''), opis: opisPowodow(powody),
    produkty: produktyKategorii(kategoria, chemia), chemia, limit: PRODUKTOW_NA_KARCIE,
  }))
  if (czyDodana) {
    karty.push(kartaKategorii({ id: dezynfekcja.id, tytul: dezynfekcja.nazwa, opis: DODANA_RECZNIE,
      produkty: produktyKategorii(dezynfekcja, chemia), chemia, limit: PRODUKTOW_NA_KARCIE }))
  }
  const notki = bezKategorii(wejscie, chemia).map((n) => h('p', { class: 'dobor-chemii__notka' },
    `${katalog.pozycja(n.uslugaId, n.pozycjaId).nazwa}: ${n.powod}`))
  const akcja = dezynfekcja === undefined ? null : h('button', {
    type: 'button', class: 'przycisk przycisk--tekstowy dobor-chemii__dezynfekcja', 'data-akcja': 'dezynfekcja',
    on: { click: () => naDezynfekcje(!czyDodana) },
  }, czyDodana ? USUN_DEZYNFEKCJE : DODAJ_DEZYNFEKCJE)
  const pusto = karty.length === 0 && notki.length === 0 ? h('p', { class: 'dobor-chemii__notka' }, BRAK_DOBORU) : null
  return [pusto, ...karty, ...notki, akcja].filter((x) => x !== null)
}

/** @type {Widok} */
export const widokDoboruChemii = {
  render(kontener, { zapytanie, kontekst }) {
    const { katalog, magazyn, nawiguj } = kontekst
    const poczatkowa = wycenaKroku(kontener, zapytanie, kontekst)
    if (!poczatkowa) return
    let wycena = poczatkowa
    let isAktualny = true
    /** @type {Chemia | null} */
    let chemia = null
    const chemiaH = scalKoszty(katalog.kosztyFirmy, wczytajStan(magazyn).ustawienia).chemia_h.wartosc
    const lista = h('div', { class: 'dobor-chemii__lista' })
    const { zapisz, pokazBlad, komunikat } = zapisKroku({
      kontekst, wycena: () => wycena, teksty: BEZ_BLEDOW_WPISU, naZapis: (w) => { wycena = w },
      naEkranie: (w) => String(w.dezynfekcja === true),
      naNieaktualnej: (w) => { wycena = w; rysujListe() },
    })

    /** @param {string} [fokus] selektor elementu do fokusu po narysowaniu */
    function rysujListe(fokus) {
      if (chemia === null) return
      lista.replaceChildren(...elementyListy({ wycena, chemia, katalog, naDezynfekcje: handleDezynfekcja }))
      const element = fokus ? lista.querySelector(fokus) : null
      if (element instanceof HTMLElement) element.focus()
    }

    /** @param {boolean} czyDodana */
    function handleDezynfekcja(czyDodana) {
      const blad = zapisz((w) => ({ ...w, dezynfekcja: czyDodana }))
      rysujListe('[data-akcja="dezynfekcja"]')
      if (blad !== null) pokazBlad(blad)
    }

    const handleDalej = () => nawiguj(adresKroku('cena', wycena.id))
    const rama = ramaKroku({ krok: 'chemia', wycena, katalog, naDalej: handleDalej,
      tresc: [h('p', { class: 'dobor-chemii__wstep' }, wstep(chemiaH)), komunikat, lista] })
    rama.dalej.before(przycisk({ tekst: 'Pomiń', rodzaj: 'drugi', naKlik: handleDalej }))
    kontener.replaceChildren(...rama.elementy)
    void poChemii(lista, (wczytana) => {
      chemia = wczytana
      rysujListe()
    }, () => isAktualny).catch(reportError)
    return () => {
      isAktualny = false
    }
  },
}
