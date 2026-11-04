// Karta zlecenia (`#/zlecenie/:id`, `?od=` otwiera zmiane od tej wizyty): powrot „Zlecenia”, klient, opis rodzaju, najblizsza wizyta,
// kolejne okresy i wycena, „Zmień cenę lub godzinę”, „Zakończ serię”, zaplaty za miesiace (R26) i „Usuń zlecenie”. Dane liczy
// src/zlecenia/karta-dane.js, a kazda akcja to jeden zapis z src/dane/zlecenia.js albo src/dane/wizyty.js. Po zapisie ekran rysuje
// sie od nowa (magazyn.naZmiane zglasza tylko zmiany z innych kart), a fokus wraca do sekcji akcji, bo kliknieta kontrolka znika.

import { dzienLokalny, jestDniem } from '../dane/ksztalt.js'
import { wczytajStan } from '../dane/magazyn.js'
import { cofnijZaplateMiesiaca, oznaczZaplateMiesiaca } from '../dane/wizyty.js'
import { BladZlecenia, usunZlecenie, zakonczSerie, zmienOdWizyty } from '../dane/zlecenia.js'
import { FORMY_ZAPLATY } from '../dane/zlecenia-ksztalt.js'
import { dzienKrotko } from '../ui/format.js'
import { h, ikona } from '../ui/h.js'
import { chipy, pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, dialogPotwierdzenia, karta, naglowek, wiersz } from '../ui/komponenty/uklad.js'
import { ETYKIETY_FORM_ZAPLATY, pigulkaWizyty } from '../ui/statusy.js'
import { BEZ_POWTARZANIA, czyMaDni, etykietaCeny, OPCJE_DNI, OPCJE_POWTARZANIA } from '../zlecenia/formularz.js'
import { adresKalendarza } from '../zlecenia/kalendarz-dane.js'
import { bledyZmiany, modelKarty, przelaczDzien, wartosciZmiany, wizytaZAdresu, zmianaDoZapisu } from '../zlecenia/karta-dane.js'
import { tekstBleduZapisu } from './teksty-bledow.js'

/**
 * @typedef {import('../ui/router.js').Widok} Widok
 * @typedef {import('../ui/router.js').Kontekst} Kontekst
 * @typedef {import('../ui/h.js').Dzieci} Dzieci
 * @typedef {import('../ui/komponenty/formularz.js').OpcjePola} OpcjePola
 * @typedef {import('../dane/zlecenia-ksztalt.js').FormaZaplaty} FormaZaplaty
 * @typedef {import('../zlecenia/karta-dane.js').MiesiacDoZaplaty} MiesiacDoZaplaty
 * @typedef {import('../zlecenia/karta-dane.js').ModelKarty} ModelKarty
 * @typedef {Pick<Kontekst, 'magazyn' | 'katalog' | 'nawiguj'> & { kontener: HTMLElement, id: string, formy: Map<string, FormaZaplaty>,
 *   okno: HTMLDialogElement | null, czyPyta: boolean, czyAktywny: boolean }} EkranKarty
 *   formy: wybrane w chipach przed zapisem zaplaty, po miesiacu; okno: otwarty arkusz; czyPyta: otwarty dialog potwierdzenia
 * @typedef {{ tytul: string, zapis: string, sekcja: string }} OpcjeArkusza zapis: tekst przycisku; sekcja: miejsce fokusu po zapisie
 * @typedef {(zapis: () => void) => void} ZapisArkusza wykonuje zapis: udany zamyka arkusz, a blad zostaje w nim razem z wartosciami
 */

const NIE_MA_ZLECENIA = 'Nie ma takiego zlecenia.'
const BLAD_ZLECENIA = 'Nie udało się zapisać tego zlecenia. Spróbuj jeszcze raz.'
const BLAD_DATY = 'Wybierz datę.'
const TRESC_KONCA = 'Kolejne wizyty znikną z kalendarza. Zostaną tylko wizyty już oznaczone albo przesunięte.'
const TRESC_USUNIECIA = 'Tego nie można cofnąć.'
const TRESC_USUNIECIA_Z_ZAPLATAMI = 'Zapłaty zapisane przy tym zleceniu też znikną.'
const OPCJE_FORM = FORMY_ZAPLATY.map((wartosc) => ({ wartosc, etykieta: ETYKIETY_FORM_ZAPLATY[wartosc] }))
/** Chipy „Powtarzaj” w serii: seria nie moze stac sie zleceniem jednorazowym. */
const OPCJE_CYKLI = OPCJE_POWTARZANIA.filter((o) => o.wartosc !== BEZ_POWTARZANIA)

/** @param {unknown} blad @returns {string} tekst bledu zapisu; blad spoza zlecenia i magazynu leci dalej */
const tekstBledu = (blad) => (blad instanceof BladZlecenia ? BLAD_ZLECENIA : tekstBleduZapisu(blad))

/**
 * Po narysowaniu: blad w sekcji akcji i fokus na jej pierwszej kontrolce (sekcji juz nie ma: powrot w naglowku).
 * @param {HTMLElement} kontener @param {string | null} sekcja @param {string | null} blad
 */
function pokazSkutek(kontener, sekcja, blad) {
  if (sekcja === null) return
  const miejsce = kontener.querySelector(`[data-sekcja="${sekcja}"]`)
  if (blad !== null) miejsce?.append(baner({ rodzaj: 'blad', tekst: blad }))
  const cel = miejsce?.matches('a, button') ? miejsce : miejsce?.querySelector('button, a') ?? kontener.querySelector('a')
  if (cel instanceof HTMLElement) cel.focus()
}

/**
 * Zapis jednej akcji i ekran narysowany od nowa; blad zostaje przy akcji, a jej kontrolki dzialaja dalej.
 * @param {EkranKarty} e @param {string} sekcja @param {() => void} zapis
 */
function wykonaj(e, sekcja, zapis) {
  try {
    zapis()
  } catch (blad) {
    rysuj(e, sekcja, tekstBledu(blad))
    reportError(blad)
    return
  }
  rysuj(e, sekcja)
}

/**
 * Arkusz z formularzem: Enter i przycisk zapisu daja to samo, a `naZapisz` sprawdza pola i woła `zapisz`.
 * @param {EkranKarty} e @param {OpcjeArkusza} opcje @param {Dzieci} pola
 * @param {(zapisz: ZapisArkusza, okno: HTMLDialogElement) => void | Promise<void>} naZapisz
 */
function otworzArkusz(e, { tytul, zapis, sekcja }, pola, naZapisz) {
  const komunikat = h('div', { class: 'wizyta-ekran__komunikat' })
  /** @type {ZapisArkusza} */
  function zapisz(wykonajZapis) {
    try {
      wykonajZapis()
    } catch (blad) {
      komunikat.replaceChildren(baner({ rodzaj: 'blad', tekst: tekstBledu(blad) }))
      reportError(blad)
      return
    }
    okno.close()
    rysuj(e, sekcja)
  }
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true }, pola, komunikat, przycisk({ tekst: zapis, typ: 'submit' }))
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    komunikat.replaceChildren()
    void Promise.resolve(naZapisz(zapisz, okno)).catch(reportError)
  })
  const okno = arkusz({ tytul }, formularz)
  okno.addEventListener('close', () => {
    okno.remove()
    if (e.okno === okno) e.okno = null
  })
  document.body.append(okno)
  e.okno = okno
  okno.showModal()
}

/**
 * Pole `pole()` z natywnym wyborem daty albo godziny.
 * @param {OpcjePola} opcje @param {'date' | 'time'} typ @param {string} [min] @returns {HTMLDivElement}
 */
function poleCzasu(opcje, typ, min) {
  const element = pole(opcje)
  const wejscie = element.querySelector('input')
  wejscie?.setAttribute('type', typ)
  if (min !== undefined) wejscie?.setAttribute('min', min)
  return element
}

/**
 * Chipy wielokrotnego wyboru dni tygodnia: pola checkbox w grupie (`chipy()` ma tylko pojedynczy wybor).
 * @param {readonly number[]} dni @param {(dzien: number) => void} naZmiane @returns {HTMLDivElement}
 */
function poleDni(dni, naZmiane) {
  const id = 'zmiana-dni'
  const element = h('div', { class: 'grupa-chipow' },
    h('p', { class: 'grupa-chipow__etykieta', id: `${id}-etykieta` }, 'Dni'),
    h('div', { class: 'chipy chipy--dni', role: 'group', 'aria-labelledby': `${id}-etykieta`, 'aria-describedby': `${id}-blad` },
      OPCJE_DNI.map(({ wartosc, etykieta }) => h('label', { class: 'chip' },
        h('input', { type: 'checkbox', name: id, value: String(wartosc), class: 'chip__wejscie', checked: dni.includes(wartosc),
          on: { change: () => naZmiane(wartosc) } }),
        h('span', { class: 'chip__tekst' }, etykieta)))),
    h('p', { class: 'pole__blad', id: `${id}-blad`, role: 'alert' }))
  ustawBlad(element, null)
  return element
}

/**
 * Arkusz „Zmiana od {dzień}”: cena, godzina, a w serii tez powtarzanie i dni. Bez zmian zamyka sie bez zapisu.
 * @param {EkranKarty} e @param {ModelKarty} m @param {string} dataPierwotna
 */
function handleZmiana(e, { zlecenie: z }, dataPierwotna) {
  let w = wartosciZmiany(z, dataPierwotna)
  const cena = pole({ id: 'zmiana-cena', etykieta: etykietaCeny(z.rozliczenie), rodzaj: 'liczba', wartosc: w.cena, naZmiane: (wartosc) => {
    w = { ...w, cena: wartosc }
    ustawBlad(cena, null)
  } })
  const godzina = poleCzasu({ id: 'zmiana-godzina', etykieta: 'Godzina', wartosc: w.godzina, naZmiane: (wartosc) => { w = { ...w, godzina: wartosc } } }, 'time')
  const dni = poleDni(w.dni, (dzien) => {
    w = { ...w, dni: przelaczDzien(w.dni, dzien) }
    ustawBlad(dni, null)
  })
  dni.hidden = w.cykl === null || !czyMaDni(w.cykl)
  const powtarzaj = w.cykl === null ? null : chipy({ id: 'zmiana-powtarzaj', etykieta: 'Powtarzaj', opcje: OPCJE_CYKLI, wybrana: w.cykl, naZmiane: (cykl) => {
    if (cykl === BEZ_POWTARZANIA) return
    w = { ...w, cykl }
    dni.hidden = !czyMaDni(cykl)
    ustawBlad(dni, null)
  } })
  otworzArkusz(e, { tytul: `Zmiana od ${dzienKrotko(dataPierwotna)}`, zapis: 'Zapisz zmianę', sekcja: 'zmiana' },
    [cena, godzina, powtarzaj, powtarzaj === null ? null : dni],
    (zapisz, okno) => {
      const bledy = bledyZmiany(w)
      ustawBlad(cena, bledy.cena ?? null)
      ustawBlad(dni, bledy.dni ?? null)
      if (bledy.cena !== undefined || bledy.dni !== undefined) return (bledy.cena === undefined ? dni : cena).querySelector('input')?.focus()
      const zmiana = zmianaDoZapisu(z, dataPierwotna, w)
      if (Object.keys(zmiana).length === 0) return okno.close()
      zapisz(() => zmienOdWizyty(e.magazyn, e.id, dataPierwotna, zmiana))
    })
}

/**
 * Arkusz wyboru ostatniego dnia serii z pytaniem o potwierdzenie; pytanie zamyka sie po dluzszej chwili, wiec po nim ekran
 * moze juz nie istniec.
 * @param {EkranKarty} e @param {ModelKarty} m
 */
function handleKoniec(e, { domyslnyKoniec, zlecenie: { start } }) {
  let dzien = domyslnyKoniec
  const poleDaty = poleCzasu({ id: 'koniec-dzien', etykieta: 'Ostatni dzień', wartosc: dzien, naZmiane: (wartosc) => {
    dzien = wartosc
    ustawBlad(poleDaty, null)
  } }, 'date', start)
  otworzArkusz(e, { tytul: 'Zakończ serię', zapis: 'Zakończ serię', sekcja: 'koniec' }, poleDaty, async (zapisz) => {
    const ostatni = dzien
    if (!jestDniem(ostatni) || ostatni < start) {
      ustawBlad(poleDaty, BLAD_DATY)
      return poleDaty.querySelector('input')?.focus()
    }
    if (e.czyPyta) return
    e.czyPyta = true
    const czyZakonczyc = await dialogPotwierdzenia({ tytul: `Zakończyć serię po ${dzienKrotko(ostatni)}?`, tresc: TRESC_KONCA, potwierdz: 'Zakończ',
      anuluj: 'Anuluj', czyNiebezpieczne: true })
    e.czyPyta = false
    if (czyZakonczyc && e.czyAktywny) zapisz(() => zakonczSerie(e.magazyn, e.id, ostatni))
  })
}

/** Pytanie zamyka sie po dluzszej chwili: ekran mogl zniknac albo druga karta zmienic zlecenie. @param {EkranKarty} e @param {ModelKarty} m */
async function handleUsun(e, { czyMaZaplaty }) {
  if (e.czyPyta) return
  e.czyPyta = true
  const czyUsunac = await dialogPotwierdzenia({ tytul: 'Usunąć zlecenie?', tresc: czyMaZaplaty ? TRESC_USUNIECIA_Z_ZAPLATAMI : TRESC_USUNIECIA,
    potwierdz: 'Usuń', anuluj: 'Anuluj', czyNiebezpieczne: true })
  e.czyPyta = false
  if (!czyUsunac || !e.czyAktywny) return
  try {
    usunZlecenie(e.magazyn, e.id)
  } catch (blad) {
    rysuj(e, 'usun', tekstBledu(blad))
    reportError(blad)
    return
  }
  e.nawiguj(adresKalendarza('dzien', null))
}

/** @param {ModelKarty} m @returns {HTMLElement} klient, rodzaj, najblizsza wizyta, kolejne okresy i wycena */
function kartaDanych({ klient, rodzaj, wizyta, okresy, wycena }) {
  return karta({ klasa: 'karta--bez-odstepu wizyta-dane' },
    wiersz({ tytul: 'Klient', opis: klient.nazwa, adres: klient.adres }),
    wiersz({ tytul: 'Rodzaj', opis: rodzaj }),
    wizyta === null ? null : wiersz(wizyta),
    okresy.map((okres) => wiersz(okres)),
    wycena === null ? null : wiersz({ tytul: 'Wycena', opis: wycena.tekst, adres: wycena.adres }))
}

/** @param {EkranKarty} e @param {ModelKarty} m @returns {HTMLElement | null} zmiana od wizyty i koniec serii */
function sekcjaAkcji(e, m) {
  const { zmianaOd } = m
  if (zmianaOd === null && !m.czySeria) return null
  return h('div', { class: 'karta-zlecenia__akcje' },
    zmianaOd === null ? null : h('div', { 'data-sekcja': 'zmiana' },
      przycisk({ tekst: 'Zmień cenę lub godzinę', rodzaj: 'drugi', naKlik: () => handleZmiana(e, m, zmianaOd) })),
    m.czySeria ? h('div', { 'data-sekcja': 'koniec' }, przycisk({ tekst: 'Zakończ serię', rodzaj: 'drugi', naKlik: () => handleKoniec(e, m) })) : null)
}

/** @param {EkranKarty} e @param {ModelKarty} m @param {MiesiacDoZaplaty} pozycja @returns {HTMLElement} chipy formy z „Zapłacone” */
function akcjaZaplaty(e, m, { miesiac, nazwa, czyNiezaplacony }) {
  const forma = () => e.formy.get(miesiac) ?? m.forma
  const wybor = h('div', { class: 'wizyta-formy' }, chipy({ id: `forma-${miesiac}`, etykieta: `Forma zapłaty: ${nazwa}`, opcje: OPCJE_FORM, wybrana: forma(),
    naZmiane: (wartosc) => { e.formy.set(miesiac, wartosc) } }))
  wybor.querySelector('.grupa-chipow__etykieta')?.classList.add('wizualnie-ukryte')
  const handleZaplacone = () => wykonaj(e, `miesiac-${miesiac}`, () => {
    oznaczZaplateMiesiaca(e.magazyn, e.id, miesiac, { forma: forma() })
    e.formy.delete(miesiac)
  })
  return h('div', { class: 'wizyta-zaplata' }, wybor,
    przycisk({ tekst: 'Zapłacone', rodzaj: czyNiezaplacony ? 'glowny' : 'drugi', etykieta: `Zapłacone: ${nazwa}`, naKlik: handleZaplacone }))
}

/** @param {EkranKarty} e @param {string} tekst zapisana zaplata @param {MiesiacDoZaplaty} pozycja @returns {HTMLElement} */
function zapisanaZaplata(e, tekst, { miesiac, nazwa }) {
  return h('div', { class: 'wizyta-stan' }, ikona('check'), h('span', { class: 'wizyta-stan__tekst' }, tekst),
    h('div', { class: 'wizyta-stan__akcje' }, przycisk({ tekst: 'Cofnij', rodzaj: 'tekstowy', etykieta: `Cofnij: Zapłacone, ${nazwa}`,
      naKlik: () => wykonaj(e, `miesiac-${miesiac}`, () => cofnijZaplateMiesiaca(e.magazyn, e.id, miesiac)) })))
}

/** @param {EkranKarty} e @param {ModelKarty} m @param {MiesiacDoZaplaty} pozycja @returns {HTMLElement} miesiac z kwota i zaplata */
function kartaMiesiaca(e, m, pozycja) {
  const { miesiac, nazwa, kwota, zaplata, czyNiezaplacony } = pozycja
  const element = karta({ klasa: 'karta-zlecenia__miesiac' },
    h('div', { class: 'karta-zlecenia__miesiac-gora' },
      h('h3', { class: 'karta-zlecenia__miesiac-tytul' }, `${nazwa} · ${kwota}`),
      czyNiezaplacony ? pigulkaWizyty('niezaplacona') : null),
    zaplata === null ? akcjaZaplaty(e, m, pozycja) : zapisanaZaplata(e, zaplata, pozycja))
  element.dataset.sekcja = `miesiac-${miesiac}`
  return element
}

/** @param {EkranKarty} e @param {ModelKarty} m @returns {HTMLElement | null} sekcja „Zapłaty za miesiące” serii miesiecznej */
function sekcjaZaplat(e, m) {
  if (m.miesiace.length === 0) return null
  const idTytulu = 'karta-zlecenia-zaplaty'
  return h('section', { class: 'karta-zlecenia__sekcja', 'aria-labelledby': idTytulu },
    h('h2', { class: 'karta-zlecenia__tytul-sekcji', id: idTytulu }, 'Zapłaty za miesiące'),
    m.miesiace.map((pozycja) => kartaMiesiaca(e, m, pozycja)))
}

/** @returns {HTMLElement[]} ekran zlecenia, ktorego nie ma (zly adres, zlecenie usuniete w innej karcie) */
function ekranBraku() {
  const dzis = adresKalendarza('dzien', null)
  return [naglowek({ tytul: 'Zlecenie', wstecz: dzis, wsteczTekst: 'Zlecenia' }),
    h('div', { class: 'tresc' }, baner({ rodzaj: 'info', tekst: NIE_MA_ZLECENIA, akcja: { tekst: 'Pokaż dzisiejsze wizyty', adres: dzis } }))]
}

/**
 * Ekran ze swiezego stanu.
 * @param {EkranKarty} e @param {string | null} [sekcja] akcja, po ktorej ekran rysuje sie od nowa @param {string | null} [blad]
 * @returns {ModelKarty | null}
 */
function rysuj(e, sekcja = null, blad = null) {
  const m = modelKarty(wczytajStan(e.magazyn), e.katalog, e.id, dzienLokalny(new Date()))
  if (m === null) {
    e.kontener.replaceChildren(...ekranBraku())
    return null
  }
  e.kontener.replaceChildren(naglowek({ tytul: m.tytul, podtytul: m.koniec ?? undefined, wstecz: adresKalendarza('dzien', null), wsteczTekst: 'Zlecenia' }),
    h('div', { class: 'tresc' }, kartaDanych(m), sekcjaAkcji(e, m), sekcjaZaplat(e, m),
      h('div', { class: 'karta-zlecenia__usun', 'data-sekcja': 'usun' },
        przycisk({ tekst: 'Usuń zlecenie', rodzaj: 'tekstowy', ikona: 'trash', naKlik: () => void handleUsun(e, m).catch(reportError) }))))
  pokazSkutek(e.kontener, sekcja, blad)
  return m
}

/** @type {Widok} */
export const widokKartyZlecenia = {
  render(kontener, { parametry, zapytanie, kontekst }) {
    const { magazyn, katalog, nawiguj } = kontekst
    /** @type {EkranKarty} */
    const e = { kontener, magazyn, katalog, nawiguj, id: parametry.id ?? '', formy: new Map(), okno: null, czyPyta: false, czyAktywny: true }
    const m = rysuj(e)
    const od = m === null ? null : wizytaZAdresu(m.zlecenie, zapytanie.od ?? null)
    if (m !== null && od !== null) handleZmiana(e, m, od)
    return () => {
      e.czyAktywny = false
      e.okno?.close()
    }
  },
}
