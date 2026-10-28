// Kopiowanie tekstu do schowka (tekst szybkiej wyceny, prosba o zdjecia): Clipboard API, a gdy przegladarka go nie ma albo
// odmowi (brak uprawnienia, strona bez HTTPS) — zaznaczenie tekstu w elemencie na ekranie i polecenie kopiowania, zeby
// uzytkownik mogl tez skopiowac zaznaczony tekst sam.

/** @param {unknown} blad @returns {boolean} odmowa albo brak Clipboard API (oczekiwane), a nie blad programu */
const czyOdmowa = (blad) => blad instanceof DOMException || blad instanceof TypeError

/**
 * @param {string} tekst
 * @param {HTMLElement} zapasowy element z tym samym tekstem, zaznaczany, gdy Clipboard API odmowi
 * @returns {Promise<boolean>} true, gdy tekst trafil do schowka; false — tekst jest zaznaczony do skopiowania recznie
 */
export async function kopiujDoSchowka(tekst, zapasowy) {
  try {
    await navigator.clipboard.writeText(tekst)
    return true
  } catch (blad) {
    if (!czyOdmowa(blad)) throw blad
    console.warn(JSON.stringify({ modul: 'schowek', kod: 'schowek_odmowa', przyczyna: blad instanceof Error ? blad.name : String(blad) }))
  }
  getSelection()?.selectAllChildren(zapasowy)
  return document.execCommand('copy')
}
