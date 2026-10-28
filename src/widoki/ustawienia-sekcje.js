// Sekcje ustawien firmy z makiety `ustawienia-firmy`: karty z wierszami „etykieta — wartość — strzałka”, a wiersz otwiera
// arkusz z polem. Te same sekcje sklada ekran ustawien (`#/ustawienia`) i kreator pierwszego uruchomienia; zapis robi widok.

import { scalKoszty } from '../dane/ustawienia.js'
import { zl } from '../ui/format.js'
import { h } from '../ui/h.js'
import { chipy, pole, przycisk, ustawBlad } from '../ui/komponenty/formularz.js'
import { arkusz, baner, karta, wiersz } from '../ui/komponenty/uklad.js'
import { METRAZ_WZORCOWY, mieszkanieWzorcowe, tekstLiczby, zmianaZPol } from './ustawienia-formularz.js'

/** @typedef {import('../dane/magazyn.js').Ustawienia} Ustawienia */
/** @typedef {import('../dane/magazyn.js').Firma} Firma */
/** @typedef {import('../dane/ustawienia.js').Domyslne} Domyslne */
/** @typedef {import('../dane/ustawienia.js').ZmianaUstawien} ZmianaUstawien */
/** @typedef {import('../dane/wyceny.js').Wycena} Wycena */
/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */
/** @typedef {import('../silnik/katalog.js').KosztyFirmy} KosztyFirmy */
/** @typedef {import('../silnik/vat.js').StatusVat} StatusVat */
/** @typedef {import('../ui/komponenty/formularz.js').RodzajPola} RodzajPola */
/** @typedef {import('./ustawienia-formularz.js').PolaFormularza} PolaFormularza */
/**
 * @typedef {{ ustawienia: Ustawienia, katalog: Katalog, domyslne: Domyslne, wyceny: readonly Wycena[],
 *   zapisz: (zmiana: ZmianaUstawien, fokus?: string) => string | null }} DaneSekcji
 *   `zapisz` zwraca tekst bledu zapisu albo null; widok rysuje potem sekcje od nowa i ustawia fokus na selektorze `fokus`
 * @typedef {{ czyZamknac: true } | { czyZamknac: false, blad: string | null }} WynikZatwierdzenia
 * @typedef {{ klucz: string, etykieta: string, wartosc: string, rodzaj?: RodzajPola, podpowiedz?: string, autocomplete?: string }} PoleArkusza
 */

const NIE_PODANO = 'nie podano'
/** @type {readonly { klucz: keyof Firma, tytul: string, rodzaj: RodzajPola, autocomplete: string }[]} */
const POLA_FIRMY = Object.freeze([
  { klucz: 'nazwa', tytul: 'Nazwa firmy', rodzaj: 'tekst', autocomplete: 'organization' },
  { klucz: 'telefon', tytul: 'Telefon', rodzaj: 'telefon', autocomplete: 'tel' },
  { klucz: 'email', tytul: 'E-mail', rodzaj: 'email', autocomplete: 'email' },
  { klucz: 'nip', tytul: 'NIP (opcjonalnie)', rodzaj: 'tekst', autocomplete: 'off' },
])
/** @type {readonly { wartosc: StatusVat, etykieta: string }[]} */
const STATUSY_VAT = Object.freeze([
  { wartosc: 'zwolniony', etykieta: 'Zwolniony z VAT' },
  { wartosc: 'czynny', etykieta: 'Czynny podatnik VAT' },
])

/** @param {string} klucz @returns {string} selektor wiersza ustawienia (fokus po ponownym narysowaniu) */
export const fokusPola = (klucz) => `[data-pole="${klucz}"]`

/** @param {number} wartosc @param {string} jednostka */
const domyslnie = (wartosc, jednostka) => `Domyślnie: ${tekstLiczby(wartosc)} ${jednostka}`

/** @param {string} klucz @param {string} tytul @param {string} wartosc @param {() => void} naKlik */
function wierszUstawienia(klucz, tytul, wartosc, naKlik) {
  const element = wiersz({ tytul, wartosc: wartosc || NIE_PODANO, naKlik })
  element.dataset.pole = klucz
  return element
}

/**
 * Arkusz z formularzem na natywnym <dialog> (dodany do <body>, usuwany po zamknieciu); „Zapisz” wywoluje `zatwierdz`.
 * @param {string} tytul @param {Node[]} tresc @param {() => WynikZatwierdzenia} zatwierdz
 */
export function otworzArkusz(tytul, tresc, zatwierdz) {
  const komunikat = h('div', { class: 'arkusz__komunikat' })
  const formularz = h('form', { class: 'arkusz__formularz', novalidate: true }, ...tresc, komunikat, przycisk({ tekst: 'Zapisz', typ: 'submit' }))
  const dialog = arkusz({ tytul }, formularz)
  formularz.addEventListener('submit', (zdarzenie) => {
    zdarzenie.preventDefault()
    const wynik = zatwierdz()
    if (wynik.czyZamknac) return dialog.close()
    komunikat.replaceChildren(...(wynik.blad ? [baner({ rodzaj: 'blad', tekst: wynik.blad })] : []))
  })
  dialog.addEventListener('close', () => dialog.remove())
  document.body.append(dialog)
  dialog.showModal()
  const pierwsze = formularz.querySelector('input:checked') ?? formularz.querySelector('input')
  if (pierwsze instanceof HTMLElement) pierwsze.focus()
}

/** @param {DaneSekcji} dane @param {ZmianaUstawien} zmiana @param {string} fokus @returns {WynikZatwierdzenia} */
export function zapiszWArkuszu(dane, zmiana, fokus) {
  const blad = dane.zapisz(zmiana, fokus)
  return blad === null ? { czyZamknac: true } : { czyZamknac: false, blad }
}

/**
 * Arkusz z polami tekstowymi: zmienione pola → zmianaZPol → bledy pod polami albo zapis; bez zmian arkusz sie zamyka.
 * @param {DaneSekcji} dane
 * @param {{ tytul: string, pola: PoleArkusza[], naPola: (wartosci: Record<string, string>) => PolaFormularza, fokus: string }} opcje
 */
function arkuszPol(dane, { tytul, pola, naPola, fokus }) {
  const elementy = pola.map((p) => ({ ...p, element: pole({ ...p, id: `ustawienia-${p.klucz.replaceAll('.', '-')}` }) }))
  /** @param {HTMLElement} element */
  const wejscie = (element) => element.querySelector('input')
  otworzArkusz(tytul, elementy.map((e) => e.element), () => {
    const zmienione = elementy.filter((e) => (wejscie(e.element)?.value ?? e.wartosc) !== e.wartosc)
    if (zmienione.length === 0) return { czyZamknac: true }
    const { patch, bledy } = zmianaZPol(naPola(Object.fromEntries(zmienione.map((e) => [e.klucz, wejscie(e.element)?.value ?? '']))))
    for (const e of elementy) ustawBlad(e.element, bledy[e.klucz] ?? null)
    const zBledem = elementy.find((e) => bledy[e.klucz])
    if (!zBledem) return zapiszWArkuszu(dane, patch, fokus)
    wejscie(zBledem.element)?.focus()
    return { czyZamknac: false, blad: null }
  })
}

/** @param {keyof Firma} klucz @param {string | undefined} tekst @returns {PolaFormularza} */
function poleFirmy(klucz, tekst) {
  /** @type {PolaFormularza} */
  const pola = {}
  if (tekst !== undefined) pola[klucz] = tekst
  return pola
}

/** @param {DaneSekcji} dane @returns {HTMLElement} karta „Dane do oferty” */
export function kartaFirmy(dane) {
  const { firma } = dane.ustawienia
  return karta({ tytul: 'Dane do oferty', klasa: 'karta-ustawien' }, POLA_FIRMY.map(({ klucz, tytul, rodzaj, autocomplete }) =>
    wierszUstawienia(klucz, tytul, firma[klucz], () => arkuszPol(dane, {
      tytul, fokus: fokusPola(klucz), naPola: (w) => poleFirmy(klucz, w[klucz]),
      pola: [{ klucz, etykieta: tytul, wartosc: firma[klucz], rodzaj, autocomplete, podpowiedz: zmianaZPol(poleFirmy(klucz, firma[klucz])).ostrzezenia[klucz] }],
    }))))
}

/** @param {DaneSekcji} dane */
function arkuszWojewodztwa(dane) {
  const { katalog, ustawienia } = dane
  let wybrane = ustawienia.wojewodztwoId ?? ''
  const opcje = [
    ...katalog.wojewodztwa.flatMap((w) => (w.id === null ? [] : [{ wartosc: w.id, etykieta: w.nazwa }])),
    { wartosc: '', etykieta: katalog.wojewodztwo(null).nazwa },
  ]
  const wybor = chipy({ id: 'ustawienia-wojewodztwo', etykieta: 'Województwo', opcje, wybrana: wybrane, naZmiane: (w) => { wybrane = w } })
  otworzArkusz('Województwo', [wybor], () => {
    if (wybrane === (ustawienia.wojewodztwoId ?? '')) return { czyZamknac: true }
    return zapiszWArkuszu(dane, { wojewodztwoId: wybrane === '' ? null : wybrane }, fokusPola('wojewodztwo'))
  })
}

/** @param {DaneSekcji} dane @returns {HTMLElement[]} wiersz wojewodztwa i linia ze stawka rynku oraz cena mieszkania 50 m² */
export function trescWojewodztwa(dane) {
  const { katalog, ustawienia } = dane
  const wojewodztwo = katalog.wojewodztwo(ustawienia.wojewodztwoId)
  const { cena } = mieszkanieWzorcowe(katalog, ustawienia.wojewodztwoId)
  return [
    wierszUstawienia('wojewodztwo', 'Województwo', wojewodztwo.nazwa, () => arkuszWojewodztwa(dane)),
    h('p', { class: 'ustawienia__linia liczba' },
      `Stawka rynku ${tekstLiczby(wojewodztwo.stawka_h)} zł/h · mieszkanie ${METRAZ_WZORCOWY} m² ok. ${zl(cena)}`),
  ]
}

/** @param {DaneSekcji} dane @returns {HTMLElement[]} chipy statusu VAT z opisem */
export function trescVat(dane) {
  const id = 'ustawienia-status-vat'
  return [
    chipy({ id, etykieta: 'Status VAT', opcje: STATUSY_VAT, wybrana: dane.ustawienia.statusVat,
      naZmiane: (statusVat) => { dane.zapisz({ statusVat }, `input[name="${id}"]:checked`) } }),
    h('p', { class: 'ustawienia__opis' },
      `Ceny w ofercie bez VAT. Czynny podatnik zobaczy cenę brutto (VAT ${dane.domyslne.stawka_vat_proc}%) i netto obok.`),
  ]
}

/** @param {DaneSekcji} dane @returns {HTMLElement} karta „Rynek i VAT” */
export function kartaRynku(dane) {
  return karta({ tytul: 'Rynek i VAT', klasa: 'karta-ustawien' }, trescWojewodztwa(dane), trescVat(dane))
}

/** @param {DaneSekcji} dane @param {KosztyFirmy} koszty koszty z nadpisaniami */
function arkuszSprzetu(dane, koszty) {
  const zDanych = dane.katalog.kosztyFirmy.sprzet
  const maszyny = Object.entries(koszty.sprzet).flatMap(([id, wpis]) => (typeof wpis === 'object' ? [{ id, ...wpis }] : []))
  /** @param {string} id */
  const domyslnyKoszt = (id) => {
    const wpis = zDanych[id]
    return typeof wpis === 'object' ? domyslnie(wpis.koszt_h, 'zł/h') : undefined
  }
  arkuszPol(dane, {
    tytul: 'Sprzęt', fokus: fokusPola('sprzet'),
    pola: maszyny.map((m) => ({ klucz: `sprzet.${m.id}`, etykieta: `${m.nazwa} (zł/h)`, wartosc: tekstLiczby(m.koszt_h), rodzaj: 'liczba',
      podpowiedz: domyslnyKoszt(m.id) })),
    naPola: (w) => ({ sprzet: Object.fromEntries(maszyny.flatMap((m) => {
      const tekst = w[`sprzet.${m.id}`]
      return tekst === undefined ? [] : [[m.id, tekst]]
    })) }),
  })
}

/** @param {DaneSekcji} dane */
function przywrocDomyslne(dane) {
  const sprzet = Object.fromEntries(Object.keys(dane.ustawienia.koszty.sprzet).map((id) => [id, null]))
  dane.zapisz({ koszty: { chemia_h: null, sprzet, dojazd: { klient_zl_km: null, darmowy_promien_km: null, koszt_firmy_zl_km: null } } },
    fokusPola('chemia_h'))
}

/** @param {DaneSekcji} dane @returns {HTMLElement} karta „Koszty zlecenia (szacunki do zmiany)” */
export function kartaKosztow(dane) {
  const zDanych = dane.katalog.kosztyFirmy
  const koszty = scalKoszty(zDanych, dane.ustawienia)
  const { chemia_h: chemia, dojazd } = koszty
  const nadpisania = dane.ustawienia.koszty
  const czyNadpisane = nadpisania.chemia_h !== undefined || Object.keys(nadpisania.sprzet).length > 0 || Object.keys(nadpisania.dojazd).length > 0
  const czySprzet = Object.values(koszty.sprzet).some((wpis) => typeof wpis === 'object')
  return karta({ tytul: 'Koszty zlecenia (szacunki do zmiany)', klasa: 'karta-ustawien' },
    wierszUstawienia('chemia_h', 'Chemia', `${tekstLiczby(chemia.wartosc)} zł za godzinę`, () => arkuszPol(dane, {
      tytul: 'Chemia', fokus: fokusPola('chemia_h'), naPola: (w) => ({ chemia_h: w.chemia_h }),
      pola: [{ klucz: 'chemia_h', etykieta: 'Chemia (zł za godzinę)', wartosc: tekstLiczby(chemia.wartosc), rodzaj: 'liczba',
        podpowiedz: domyslnie(zDanych.chemia_h.wartosc, 'zł za godzinę') }],
    })),
    wierszUstawienia('dojazd_klienta', 'Dojazd dla klienta',
      `${tekstLiczby(dojazd.klient_zl_km)} zł/km ponad ${tekstLiczby(dojazd.darmowy_promien_km)} km`, () => arkuszPol(dane, {
        tytul: 'Dojazd dla klienta', fokus: fokusPola('dojazd_klienta'),
        naPola: (w) => ({ klient_zl_km: w.klient_zl_km, darmowy_promien_km: w.darmowy_promien_km }),
        pola: [
          { klucz: 'klient_zl_km', etykieta: 'Stawka dla klienta (zł/km)', wartosc: tekstLiczby(dojazd.klient_zl_km), rodzaj: 'liczba',
            podpowiedz: domyslnie(zDanych.dojazd.klient_zl_km, 'zł/km') },
          { klucz: 'darmowy_promien_km', etykieta: 'Bez dopłaty do (km)', wartosc: tekstLiczby(dojazd.darmowy_promien_km), rodzaj: 'liczba',
            podpowiedz: domyslnie(zDanych.dojazd.darmowy_promien_km, 'km') },
        ],
      })),
    wierszUstawienia('koszt_firmy_zl_km', 'Twój koszt dojazdu', `${tekstLiczby(dojazd.koszt_firmy_zl_km)} zł/km`, () => arkuszPol(dane, {
      tytul: 'Twój koszt dojazdu', fokus: fokusPola('koszt_firmy_zl_km'), naPola: (w) => ({ koszt_firmy_zl_km: w.koszt_firmy_zl_km }),
      pola: [{ klucz: 'koszt_firmy_zl_km', etykieta: 'Twój koszt dojazdu (zł/km)', wartosc: tekstLiczby(dojazd.koszt_firmy_zl_km),
        rodzaj: 'liczba', podpowiedz: domyslnie(zDanych.dojazd.koszt_firmy_zl_km, 'zł/km') }],
    })),
    czySprzet ? wierszUstawienia('sprzet', 'Sprzęt', 'wg maszyny', () => arkuszSprzetu(dane, koszty)) : null,
    czyNadpisane ? przycisk({ tekst: 'Przywróć domyślne', rodzaj: 'tekstowy', naKlik: () => przywrocDomyslne(dane) }) : null)
}
