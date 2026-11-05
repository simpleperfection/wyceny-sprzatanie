// Stan E2E „moduly-dzis” (wersja 2): klienci, zlecenia i wyceny z datami liczonymi wzgledem dzisiejszego dnia przegladarki.
// Samodzielny skrypt bez importow do `agent-browser eval`: buduje stan i zapisuje go pod kluczem magazynu
// (KLUCZ_MAGAZYNU w src/dane/magazyn.js). Oczekiwane: dzis 2 wizyty, 2 do zamkniecia, 1 niezaplacona (test w
// src/zlecenia/zapytania.test.js). Migawki wycen policzone raz silnikiem (przelicz z src/kreator/stan.js, dane 2026-10-23).
(() => {
  const KLUCZ = 'wyceny-sprzatanie:stan'
  const teraz = new Date()
  const [rok, miesiac, dzien] = [teraz.getFullYear(), teraz.getMonth(), teraz.getDate()]
  const dwie = (n) => String(n).padStart(2, '0')
  /** Dzien RRRR-MM-DD `n` dni od dzis (arytmetyka w UTC, bez przesuniecia przy zmianie czasu). */
  const d = (n) => new Date(Date.UTC(rok, miesiac, dzien + n)).toISOString().slice(0, 10)
  /** Chwila ISO dnia `n` o godzinie lokalnej `h`. */
  const iso = (n, h) => new Date(rok, miesiac, dzien + n, h, 0).toISOString()
  const lokalnyMiesiac = (n) => { const t = new Date(rok, miesiac, dzien + n); return `${t.getFullYear()}-${dwie(t.getMonth() + 1)}` }
  const dzienTygodniaDzis = ((new Date(Date.UTC(rok, miesiac, dzien)).getUTCDay() + 6) % 7) + 1

  const ADRES_ANNY = 'ul. Lipowa 3, Warszawa'
  const ADRES_BIURA = 'ul. Prosta 10, Warszawa'
  const klienci = [
    { id: 'e2e-klient-anna', nazwa: 'Anna Kowalska', telefon: '600 100 200', adres: ADRES_ANNY, notatki: 'Klucze u sąsiadki, kod 1234' },
    { id: 'e2e-klient-biuro', nazwa: 'Biuro Rachunkowe Lis', telefon: null, adres: ADRES_BIURA, notatki: null },
    { id: 'e2e-klient-jan', nazwa: 'Jan Nowak', telefon: null, adres: null, notatki: null },
  ].map((k) => ({ ...k, utworzony: iso(-20, 9), zmieniony: iso(-20, 9) }))

  const WSPOLNE_MIGAWKI = {
    propozycje: [], dojazd: { km: 0, kwota: 0 }, wojewodztwo: { id: 'mazowieckie', nazwa: 'mazowieckie', stawka_h: 65, wsp: 1 },
    statusVat: 'zwolniony', stawkaVatProc: 23, vat: 0, wersjaDanych: { ceny: '2026-10-23', normy: '2026-10-23', rynek: '2026-10-23' },
    minimum: 150, czyMinimum: false,
  }
  const pozycja = (klucz, opis, ilosc, cenaJedn, zakres, minuty) => ({ rodzaj: 'pozycja', klucz, opis, ilosc, jednostka: 'szt', cenaJedn,
    cenaBazowa: cenaJedn, mnoznikProgu: 1, kwota: ilosc * cenaJedn, zakres, minuty })
  const praca = (opis, ilosc, kwota, minuty) => ({ rodzaj: 'praca', klucz: null, opis, ilosc, jednostka: 'h', cenaJedn: 65, cenaBazowa: 65,
    mnoznikProgu: 1, kwota, zakres: null, minuty })
  const migawka = (cena, pola) => ({ ...WSPOLNE_MIGAWKI, cena, netto: cena, mediana: cena, podstawaCeny: 'brutto', wizytWMiesiacu: null, ...pola })
  const wejscie = (uslugaId, pola) => ({ uslugaId, wojewodztwoId: 'mazowieckie', wariantId: null, dodatki: [], dojazdKm: 0, ...pola })

  const WYNIK_BIURA = migawka(179, { widelki: { od: 150, do: 330.75000000000006, pelne: true }, minutyNormowe: 165.37500000000003,
    linie: [praca('Sprzątanie biur i lokali usługowych – Abonament 1× w tygodniu', 2.7562500000000005, 179.15625000000003, 165.37500000000003)],
    podstawaCeny: 'netto', wizytWMiesiacu: 4.33 })
  const wyceny = [
    { id: 'e2e-wycena-biuro', dzien: -16, status: 'przyjeta', klientId: 'e2e-klient-biuro', klient: { nazwa: 'Biuro Rachunkowe Lis', adres: ADRES_BIURA },
      wejscie: wejscie('sprzatanie_biur', { wariantId: 'abonament_1', pomieszczenia: [{ typ: 'biuro', m2: 90 }, { typ: 'sala', m2: 22.5 },
        { typ: 'kuchnia_socjalna', m2: 9 }, { typ: 'toaleta', m2: 7.5 }, { typ: 'korytarz', m2: 21 }] }), wynik: WYNIK_BIURA },
    { id: 'e2e-wycena-mieszkanie', dzien: -4, status: 'przyjeta', klientId: 'e2e-klient-anna', klient: { nazwa: 'Anna Kowalska', adres: ADRES_ANNY },
      wejscie: wejscie('mieszkanie_standard', { pomieszczenia: [{ typ: 'pokoj', m2: 32 }, { typ: 'przedpokoj', m2: 6 }, { typ: 'kuchnia', m2: 8 },
        { typ: 'lazienka', m2: 4 }] }),
      wynik: migawka(250, { widelki: { od: 120.0264, do: 450.09900000000005, pelne: true }, minutyNormowe: 230.82,
        linie: [praca('Mieszkanie lub dom – sprzątanie standardowe', 3.847, 250.055, 230.82)] }) },
    { id: 'e2e-wycena-tapicerka', dzien: -3, status: 'wyslana', klientId: 'e2e-klient-anna', klient: { nazwa: 'Anna Kowalska', adres: ADRES_ANNY },
      wejscie: wejscie('tapicerka', { pozycje: [{ id: 'kanapa_3', ilosc: 1 }] }),
      wynik: migawka(150, { widelki: { od: 150, do: 240, pelne: true }, minutyNormowe: 90,
        linie: [pozycja('tapicerka.kanapa_3', 'Kanapa 3-osobowa', 1, 150, [60, 240], 60)] }) },
    { id: 'e2e-wycena-okna', dzien: -2, status: 'do_wyslania', klientId: 'e2e-klient-jan', klient: { nazwa: 'Jan Nowak', adres: '' },
      wejscie: wejscie('okna', { pozycje: [{ id: 'okno_1', ilosc: 6 }] }),
      wynik: migawka(180, { widelki: { od: 150, do: 420, pelne: true }, minutyNormowe: 120,
        linie: [pozycja('okna.okno_1', 'Okno 1-skrzydłowe', 6, 30, [60, 420], 90)] }) },
  ]
  /** @type {Record<string, number>} */
  const licznikNumerow = {}
  const zapisaneWyceny = wyceny.map(({ dzien: n, ...w }) => {
    const mies = lokalnyMiesiac(n)
    licznikNumerow[mies] = (licznikNumerow[mies] ?? 0) + 1
    const numer = `${licznikNumerow[mies]}/${mies.slice(5, 7)}/${mies.slice(0, 4)}`
    const wyslana = w.status === 'do_wyslania' ? null : iso(n, 11)
    return { ...w, numer, utworzona: iso(n, 10), zmieniona: wyslana ?? iso(n, 10), rodzaj: 'dokladna', klient: { ...w.klient, termin: null },
      szybka: null, odpowiedzi: {}, cenaReczna: null,
      oferta: { zakres: null, warunki: null, waznaDo: null, wyslana, nieaktualna: false } }
  })

  const okres = (od, pola) => ({ od, cykl: null, godzina: null, cenaWizyty: null, cenaMiesiaca: null, ...pola })
  const zrobiona = (n, h) => ({ przeniesiona: null, odwolana: false, zrobiona: iso(n, h), zaplata: null, minutyPracy: null })
  const zlecenie = (pola, n) => ({ wycenaId: null, opis: null, rozliczenie: 'za_wizyte', koniec: null, plan: null, wizyty: {},
    zaplatyMiesieczne: {}, utworzone: iso(n, 8), zmienione: iso(n, 8), ...pola })
  const zlecenia = [
    zlecenie({ id: 'e2e-zlecenie-anna', klientId: 'e2e-klient-anna', uslugaId: 'mieszkanie_standard', start: d(0),
      okresy: [okres(d(0), { godzina: '09:00', cenaWizyty: 250 })] }, -2),
    zlecenie({ id: 'e2e-zlecenie-biuro', klientId: 'e2e-klient-biuro', wycenaId: 'e2e-wycena-biuro', uslugaId: 'sprzatanie_biur',
      rozliczenie: 'miesiecznie', start: d(-14), plan: { minutyNormowe: WYNIK_BIURA.minutyNormowe, tempo: 1.3 },
      okresy: [okres(d(-14), { cykl: { co: 'tydzien', dni: [dzienTygodniaDzis] }, godzina: '15:00', cenaMiesiaca: 1200 })],
      wizyty: { [d(-14)]: zrobiona(-14, 17) },
      zaplatyMiesieczne: {
        [d(-14).slice(0, 7)]: { forma: 'przelew', data: d(-14), kwota: 1200 },
        [d(-7).slice(0, 7)]: { forma: 'przelew', data: d(-7), kwota: 1200 },
      } }, -14),
    zlecenie({ id: 'e2e-zlecenie-jan', klientId: 'e2e-klient-jan', uslugaId: 'okna', start: d(-1),
      okresy: [okres(d(-1), { godzina: '10:00', cenaWizyty: 180 })], wizyty: { [d(-1)]: zrobiona(-1, 12) } }, -3),
  ]

  const stan = {
    wersja: 2,
    ustawienia: { wojewodztwoId: 'mazowieckie', statusVat: 'zwolniony',
      firma: { nazwa: 'Usługi Sprzątające Monika Lis', telefon: '600 123 456', email: '', nip: '' }, tempo: { reczne: null },
      koszty: { sprzet: {}, dojazd: {} }, zakresy: {}, warunki: null, przypomnienieKopiiDni: 7, kreatorZakonczony: true },
    wyceny: zapisaneWyceny, klienci, zlecenia, licznikNumerow,
    kopia: { ostatnia: null, zmianaOd: iso(-2, 8) },
    preferencje: { iosInstrukcjaZamknieta: false },
  }
  localStorage.setItem(KLUCZ, JSON.stringify(stan))
  return `moduly-dzis ${d(0)}: ${klienci.length} klientów, ${zlecenia.length} zlecenia, ${zapisaneWyceny.length} wyceny`
})()
