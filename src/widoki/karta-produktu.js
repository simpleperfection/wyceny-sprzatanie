// Karta srodka chemicznego (krok chemii kreatora i katalog z dolnego paska, makieta dobor-chemii): nazwa z chipem dostawcy,
// przeznaczenie, pH i stezenie, opakowanie z cena brutto oraz link do karty SDS z data. Teksty z danych tylko jako wezly tekstowe
// (helper `h`); adres karty z data/chemia.json trafia do `href` dopiero po sprawdzeniu protokolu https (`kartaSds`).

import { kartaSds, opisProduktu } from '../silnik/chemia.js'
import { data } from '../ui/format.js'
import { h } from '../ui/h.js'

/** @typedef {import('../silnik/chemia.js').Chemia} Chemia */
/** @typedef {import('../silnik/chemia.js').Produkt} Produkt */

const KARTA = 'Karta SDS'
const KARTA_Z_FORMULARZEM = 'Karta SDS (formularz na stronie)'
const BRAK_KARTY = 'Brak linku do karty SDS'

/** @param {Produkt} produkt @param {Chemia} chemia @returns {string} nazwa dostawcy; id, gdy dostawcy nie ma w bazie */
const nazwaDostawcy = (produkt, chemia) => chemia.dostawcy.find((d) => d.id === produkt.dostawca)?.nazwa ?? produkt.dostawca

/**
 * Link do karty SDS w nowej karcie (bez dostepu strony docelowej do `window.opener` i bez naglowka Referer); nazwa dostepna
 * zaczyna sie od widocznego tekstu linku.
 * @param {Produkt} produkt
 * @returns {HTMLElement}
 */
function linkKarty(produkt) {
  const karta = kartaSds(produkt)
  if (!karta) return h('span', { class: 'produkt-chemii__brak-karty' }, BRAK_KARTY)
  const tekst = karta.czyFormularz ? KARTA_Z_FORMULARZEM : KARTA
  const dataKarty = karta.data === null ? null : data(karta.data)
  const etykieta = [tekst, produkt.nazwa, dataKarty && `karta z ${dataKarty}`, 'otwiera się w nowej karcie'].filter(Boolean).join(', ')
  return h('span', { class: 'produkt-chemii__karta' },
    h('a', { class: 'produkt-chemii__link', href: karta.adres, target: '_blank', rel: 'noopener noreferrer', 'aria-label': etykieta }, tekst),
    dataKarty ? h('span', { class: 'produkt-chemii__data', 'aria-hidden': 'true' }, `karta z ${dataKarty}`) : null)
}

/**
 * @param {Produkt} produkt @param {Chemia} chemia
 * @returns {HTMLElement}
 */
export function kartaProduktu(produkt, chemia) {
  const opis = opisProduktu(produkt)
  return h('article', { class: 'produkt-chemii', 'data-produkt': produkt.id },
    h('div', { class: 'produkt-chemii__gora' },
      h('h3', { class: 'produkt-chemii__nazwa' }, produkt.nazwa),
      h('span', { class: 'produkt-chemii__dostawca' }, nazwaDostawcy(produkt, chemia))),
    h('p', { class: 'produkt-chemii__przeznaczenie' }, produkt.przeznaczenie),
    h('p', { class: 'produkt-chemii__opis' }, `${opis.ph} · ${opis.stezenie}`),
    h('div', { class: 'produkt-chemii__dol' },
      h('span', { class: 'produkt-chemii__cena liczba' }, `${opis.opakowanie} · ${opis.cena} brutto`),
      linkKarty(produkt)))
}

/**
 * Karta kategorii srodkow: naglowek (nazwa i opis) i produkty; przy `limit` mniejszym niz liczba produktow — pierwsze `limit`
 * i przycisk „Pokaż wszystkie ({n})”, ktory dokłada reszte i przenosi fokus na pierwszy dolozony produkt.
 * @param {{ id: string, tytul: string, opis?: string | null, produkty: Produkt[], chemia: Chemia, limit?: number }} opcje
 * @returns {HTMLElement}
 */
export function kartaKategorii({ id, tytul, opis = null, produkty, chemia, limit = produkty.length }) {
  const idTytulu = `kategoria-chemii-${id}`
  const lista = h('div', { class: 'karta-chemii__produkty' }, produkty.slice(0, limit).map((p) => kartaProduktu(p, chemia)))
  const reszta = produkty.slice(limit)
  const wiecej = reszta.length === 0 ? null : h('button', {
    type: 'button', class: 'karta-chemii__wiecej',
    on: { click: () => handlePokazWszystkie() },
  }, `Pokaż wszystkie (${produkty.length})`)

  function handlePokazWszystkie() {
    const nowe = reszta.map((p) => kartaProduktu(p, chemia))
    lista.append(...nowe)
    wiecej?.remove()
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
    wiecej)
}
