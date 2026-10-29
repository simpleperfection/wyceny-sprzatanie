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
- 🟡 [P3] src/ui/format.js:29 — `FORMY.wykonaneZlecenie` martwy; zastąpić `klient`, a w kopia-teksty.js użyć `FORMY.klient` zamiast lokalnego `FORMY_KLIENTA`.
- 🟡 [P3] src/style/tokeny.css:29 — nieużywany token `--status-wykonana-tlo`; usunąć.
- 🟡 [P3] src/dane/migracja-v2.js:49 — `wykonaniaV1` nie usuwa powtórzonych id wykonań → dwa zlecenia o tym samym id, stan odrzucony (ekran ratunkowy / „kopia uszkodzona”); pomijać powtórki i dodać test.
- 🟡 [P3] src/dane/wyceny-statusy.test.js:1651 — mutant „zawsze nieaktualnaPoWyslaniu” w `przypiszKlienta` przeżywa; dopisać przypadek tego samego klienta po wysłaniu → `oferta.nieaktualna === false`.
