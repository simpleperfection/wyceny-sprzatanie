// Wiersz srodka chemicznego (katalog `#/chemia` i krok chemii kreatora, makieta „Chemia, kategoria” w
// docs/operator/aplikacja-modulowa-makiety.html): nazwa, w drugiej linii pH, dostawca i cena opakowania, a przeznaczenie,
// stezenie i karta charakterystyki pod „Więcej”. Teksty z danych tylko jako wezly tekstowe (helper `h`); adres karty
// z data/chemia.json trafia do `href` dopiero po sprawdzeniu protokolu https (`kartaSds`).

import { kartaSds, opisProduktu } from '../silnik/chemia.js'
import { data } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { wiecej } from '../ui/komponenty/uklad.js'

/** @typedef {import('../silnik/chemia.js').Chemia} Chemia */
/** @typedef {import('../silnik/chemia.js').Produkt} Produkt */

const KARTA = 'Karta charakterystyki'
const KARTA_Z_FORMULARZEM = 'Karta charakterystyki (formularz na stronie)'
const BRAK_KARTY = 'Brak linku do karty charakterystyki'
/** Dopisek w nawiasie na koncu nazwy kategorii, np. „Środek uniwersalny (kurz, sierść, brud bieżący)”. */
const DOPISEK_W_NAWIASIE = /\s*\(([^()]*)\)$/

/**
 * Nazwa kategorii bez dopisku w nawiasie i sam dopisek (rodzaje brudu); nazwa bez dopisku albo z samym nawiasem zostaje cala.
 * @param {string} nazwa
 * @returns {{ nazwa: string, dopisek: string | null }}
 */
export function podzielNazweKategorii(nazwa) {
  const dopasowanie = DOPISEK_W_NAWIASIE.exec(nazwa)
  const dopisek = dopasowanie?.[1]?.trim()
  if (!dopasowanie || dopasowanie.index === 0 || !dopisek) return { nazwa, dopisek: null }
  return { nazwa: nazwa.slice(0, dopasowanie.index), dopisek }
}

/** @param {Produkt} produkt @param {Chemia} chemia @returns {string} nazwa dostawcy; id, gdy dostawcy nie ma w bazie */
const nazwaDostawcy = (produkt, chemia) => chemia.dostawcy.find((d) => d.id === produkt.dostawca)?.nazwa ?? produkt.dostawca

/** @param {string} tekst @returns {string} „gotowy do użycia” → „Gotowy do użycia” */
const zWielkiej = (tekst) => tekst.charAt(0).toLocaleUpperCase('pl') + tekst.slice(1)

/** @param {Produkt} produkt @param {string} stezenie z `opisProduktu` @returns {string} */
const tekstStezenia = (produkt, stezenie) =>
  produkt.gotowy || produkt.stezenia.length === 0 ? zWielkiej(stezenie) : `Stężenie: ${stezenie}`

/**
 * Link do karty charakterystyki jako przycisk drugi, w nowej karcie (bez dostepu strony docelowej do `window.opener` i bez
 * naglowka Referer); nazwa dostepna zaczyna sie od widocznego tekstu, data karty jest pod przyciskiem.
 * @param {Produkt} produkt
 * @returns {HTMLElement[]}
 */
function linkKarty(produkt) {
  const karta = kartaSds(produkt)
  if (!karta) return [h('span', { class: 'produkt-chemii__dopisek' }, BRAK_KARTY)]
  const tekst = karta.czyFormularz ? KARTA_Z_FORMULARZEM : KARTA
  const dataKarty = karta.data === null ? null : data(karta.data)
  const etykieta = [tekst, produkt.nazwa, dataKarty && `karta z ${dataKarty}`, 'otwiera się w nowej karcie'].filter(Boolean).join(', ')
  const link = h('a', { class: 'przycisk przycisk--drugi produkt-chemii__karta', href: karta.adres, target: '_blank',
    rel: 'noopener noreferrer', 'aria-label': etykieta }, ikona('download'), h('span', null, tekst))
  if (!dataKarty) return [link]
  return [link, h('span', { class: 'produkt-chemii__dopisek', 'aria-hidden': 'true' }, `Karta z ${dataKarty}`)]
}

/**
 * Wiersz srodka w dwoch liniach i „Więcej”. `poziom` to poziom naglowka nazwy: h2 pod tytulem ekranu, h3 pod karta kategorii.
 * @param {Produkt} produkt @param {Chemia} chemia @param {'h2' | 'h3'} [poziom]
 * @returns {HTMLElement}
 */
export function kartaProduktu(produkt, chemia, poziom = 'h3') {
  const opis = opisProduktu(produkt)
  return h('article', { class: 'produkt-chemii', 'data-produkt': produkt.id },
    h(poziom, { class: 'produkt-chemii__nazwa' }, produkt.nazwa),
    h('span', { class: 'produkt-chemii__opis' },
      h('span', { class: 'produkt-chemii__ph' }, `${opis.ph} · ${nazwaDostawcy(produkt, chemia)}`),
      h('span', { class: 'produkt-chemii__cena liczba' }, ` · ${opis.cena} za ${opis.opakowanie}`)),
    wiecej({},
      h('p', null, produkt.przeznaczenie),
      h('p', null, tekstStezenia(produkt, opis.stezenie)),
      ...linkKarty(produkt)))
}

/**
 * Karta kategorii srodkow: naglowek (nazwa i opis) i wiersze produktow; przy `limit` mniejszym niz liczba produktow — pierwsze
 * `limit` i przycisk „Pokaż wszystkie ({n})”, ktory dokłada reszte i przenosi fokus na pierwszy dolozony produkt.
 * @param {{ id: string, tytul: string, opis?: string | null, produkty: Produkt[], chemia: Chemia, limit?: number }} opcje
 * @returns {HTMLElement}
 */
export function kartaKategorii({ id, tytul, opis = null, produkty, chemia, limit = produkty.length }) {
  const idTytulu = `kategoria-chemii-${id}`
  const lista = h('div', { class: 'karta-chemii__produkty' }, produkty.slice(0, limit).map((p) => kartaProduktu(p, chemia)))
  const reszta = produkty.slice(limit)
  const pokazWszystkie = reszta.length === 0 ? null : h('button', {
    type: 'button', class: 'karta-chemii__wszystkie',
    on: { click: () => handlePokazWszystkie() },
  }, `Pokaż wszystkie (${produkty.length})`)

  function handlePokazWszystkie() {
    const nowe = reszta.map((p) => kartaProduktu(p, chemia))
    lista.append(...nowe)
    pokazWszystkie?.remove()
    const [pierwszy] = nowe
    if (!pierwszy) return
    pierwszy.tabIndex = -1
    pierwszy.focus()
  }

  return h('section', { class: 'karta-chemii', 'aria-labelledby': idTytulu, 'data-kategoria': id },
    h('div', { class: 'karta-chemii__naglowek' },
      h('h2', { class: 'karta-chemii__tytul', id: idTytulu }, tytul),
      opis ? h('p', { class: 'karta-chemii__opis' }, opis) : null),
    lista,
    pokazWszystkie)
}
