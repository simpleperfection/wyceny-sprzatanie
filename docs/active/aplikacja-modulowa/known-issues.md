# Known issues — aplikacja-modulowa

## P3 faza 1

- 🟡 [P3] src/dane/magazyn.js:117 — Limity MAKS_KLIENTOW i MAKS_ZLECEN sprawdzają tylko dodajKlienta/dodajZlecenie; jestStanem/maSpojneRekordy i sprawdzStanKopii ich nie egzekwują, więc spreparowana kopia z ogromną liczbą klientów/zleceń zamrozi kartę i zablokuje dodawanie. Naprawa: `klienci.length <= MAKS_KLIENTOW` i `zlecenia.length <= MAKS_ZLECEN` w maSpojneRekordy + test odmowy w magazyn.test.js.
- 🟡 [P3] src/kalendarz/wystapienia.js:30 — `DNI_TYGODNIA = 7` powtarza stałą z src/kalendarz/daty.js:19, a zlecenia-ksztalt.js:23 używa tej nazwy dla innej wartości. Poprawka: eksport z daty.js, import w wystapienia.js, `DNI_DWOCH_TYGODNI = 2 * DNI_TYGODNIA`.
- 🟡 [P3] src/dane/zlecenia.js:182 — `zaplanujZWyceny` nie sprawdza `doZaplanowania` (bramka tylko w UI); dwie karty mogą utworzyć dwa zlecenia z jednej przyjętej wyceny jednorazowej. Poprawka: dla wyceny nie-abonamentowej z istniejącym zleceniem rzucić `BladZlecenia('zaplanowana')`.
- 🟡 [P3] src/dane/klienci.test.js:112 — Gałąź `stan.wyceny.some((w) => nalezyDoKlienta(w, id))` w usunKlienta (klienci.js:183) nie ma testu. Dopisz: klient 'k1' z wyceną `{ id: 'w1', klientId: 'k1' }` → `usunKlienta` rzuca `ma_historie`, klient zostaje.
- 🟡 [P3] src/dane/zlecenia.test.js:153 — Brak testu wstawienia okresu między istniejące (sortowanie, zlecenia.js:235). Dopisz: zmiana od '2026-11-23' na 300, potem od '2026-11-09' na 270 → okresy [['2026-11-02',250],['2026-11-09',270],['2026-11-23',300]].
- 🟡 [P3] src/zlecenia/zapytania.test.js:116 — Gałąź zastępcza `okresWDniu(z, dataZrobionej)` w kwotaMiesiaca (zapytania.js:101) i filtr `kwota > 0` nie mają testu. Dopisz: Z2 z `koniec: '2026-10-20'`, zrobioną wizytą '2026-10-21', `zaplatyMiesieczne: {}`, start '2026-10-14' → `niezaplacone` = [{ rodzaj: 'miesiac', klucz: '2026-10', kwota: 1200, … }].
- 🟡 [P3] src/dane/klienci.test.js:71 — Błędy wejścia `typ` i `dane` w dodajKlienta (klienci.js:80) nie mają testu odmowy. Dopisz: `dodajKlienta(magazyn, { nazwa: 5 }, opcje)` → `bladKlienta('typ','nazwa')` i `dodajKlienta(magazyn, null, opcje)` → `bladKlienta('dane')`.

## P3 faza 2

- 🟡 [P3] src/widoki/podsumowanie.js:90 — `kartaWpisowCzasu` drugi raz woła `wczytajStan`; podać `stan` z `rysuj` przez `elementyEkranu` i usunąć odczyt.
- 🟡 [P3] src/ui/format.js:35 — `FORMY.wykonaneZlecenie` martwy; usunąć (część o lokalnym `FORMY_KLIENTA` w kopia-teksty.js zrobiona w fixie fazy 3, 14c0ef9: kopia-teksty.js używa `FORMY.klient`).
- 🟡 [P3] src/style/tokeny.css:29 — nieużywany token `--status-wykonana-tlo`; usunąć.
- 🟡 [P3] src/dane/migracja-v2.js:49 — `wykonaniaV1` nie usuwa powtórzonych id wykonań → dwa zlecenia o tym samym id, stan odrzucony (ekran ratunkowy / „kopia uszkodzona”); pomijać powtórki i dodać test.
- 🟡 [P3] src/dane/wyceny-statusy.test.js:1651 — mutant „zawsze nieaktualnaPoWyslaniu” w `przypiszKlienta` przeżywa; dopisać przypadek tego samego klienta po wysłaniu → `oferta.nieaktualna === false`.

## P3 faza 3

- 🟡 [P3] src/widoki/start-dane.js:57 — `stanZlecen` liczy `liczbaDzis` drugi raz (już w `zdanieDnia`); policzyć raz w `widokStartu` i przekazać `{ dzis, wizytDzis }`.
- 🟡 [P3] src/widoki/start-dane.js:122 — `inicjal` i stała `JEZYK` bez użytkownika produkcyjnego; usunąć z testem i poprawić komentarz w linii 2.
- 🟡 [P3] src/widoki/start.js:79 — `banerEkranu` traktuje każdy nieznany rodzaj jako kopię; `switch` z `case 'kopia'` i `default` z `never` + RangeError.
- 🟡 [P3] src/widoki/ustawienia.js:32 — opis wiersza „Kopia danych” zależy od kolejności `etykietyPodsumowania` (`slice`); dodać `opisWierszaKopii({ wycen, klientow })` w kopia-teksty.js i usunąć `POZYCJE_OPISU_KOPII`.
- 🟡 [P3] src/widoki/lista-wycen-dane.js:20 — lokalny `formatDniaZmiany` i trzecia stała `JEZYK`; dodać `dzienKrotki(chwila)` w src/ui/format.js i użyć w `dzienZmiany`.
- 🟡 [P3] src/widoki/lista-wycen-dane.test.js:22 — `stanModulowDzis` skopiowana 1:1 ze start-dane.test.js:28; przenieść z `DZIS` do tests/stan-modulow-dzis.js.
- 🟡 [P3] src/ui/zmiana-dnia.js:30 — odświeżenie po zmianie dnia (`handlePowrot` w `odswiezajPoZmianieDnia`) na każdej trasie gubi niezapisane pola (szybka wycena, arkusz ustawień); `router.odswiez()` tylko na trasie Start, inaczej sama aktualizacja `dzienRenderu`, z przypadkiem w src/ui/zmiana-dnia.test.js.
- 🟡 [P3] src/ui/komponenty/uklad.test.js:164 — test `podpowiedz` nie sprawdza usunięcia arkusza po `close`; dodać `remove()`/`close()` do atrapy i `assert.deepEqual(cialo.dzieci, [])`.
- 🟡 [P3] src/ui/format.test.js:112 — test SKROTY_DNI przepina stałą; zastąpić asercjami `kiedy` dla śr/czw/sb/wt.
- 🟡 [P3] src/widoki/karta-produktu.test.js:120 — brak testów gałęzi `linkKarty`: `czyFormularz` i karta bez daty (bez dopisku „Karta z …”).
- 🟡 [P3] src/style/komponenty.css:179 — `.postep__krok` z `flex: 1` ucina „Województwo” do „Wojewód…” przy 360 px; `flex: 1 1 auto`.
