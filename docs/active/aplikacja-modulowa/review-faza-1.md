# Review fazy 1 — aplikacja-modulowa

Gate: **BLOKUJE**. Findingi: P1 = 2, P2 = 12, P3 = 6, OPERATOR = 0. E2E: 0 / 0 / 0 (tester pominięty przez routing).

## Findingi P1

### P1 · KOD · `src/kalendarz/wystapienia.js:71`

`dniTygodniowe` przechodzi okno dzień po dniu (porownajDni, dzienTygodnia, dodajDni z regexem i Date w każdej iteracji). `doZamkniecia` (src/zlecenia/zapytania.js:86) liczy okno od założenia zlecenia do wczoraj, które rośnie bez granicy: 30 serii tygodniowych po roku 73 ms, po 3 latach 214 ms, 100 serii po 2 latach 475 ms (telefon 3–5× wolniej); płaci każdy render Startu i Dnia (R2, R15). Zmiana: dla każdego dnia z `cykl.dni` pierwszy dzień ≥ `odDnia` = `dodajDni(odDnia, (d - dzienTygodnia(odDnia) + 7) % 7)` (przy `dwa_tygodnie` korekta o 7 wg parzystości od kotwicy), dalej krok 7/14 dni na liczbie dni (`Date.UTC`/`MS_DNIA`), tekst dopiero przy `push`, na końcu scalić i posortować.

### P1 · KOD · `src/zlecenia/zapytania.js:98`

Reguła „kwota miesiąca serii” jest zapisana dwa razy i działa inaczej: `kwotaMiesiaca` w zapytania.js:98-102 przy braku wizyty z reguły bierze cenę okresu zrobionej wizyty (`okresWDniu`), a ta sama funkcja w src/dane/wizyty.js:184-191 rzuca `BladZlecenia('brak_wizyty')`. Seria miesięczna z `koniec` 2026-10-31 i zrobioną wizytą 2026-11-02: `niezaplacone()` pokazuje 2026-11, a `oznaczZaplateMiesiaca(…,'2026-11')` rzuca `brak_wizyty` — pozycja zostaje niezapłacona na stałe. Poprawka: jedna funkcja `kwotaMiesiaca(z, miesiac)` (eksport z src/dane/wizyty.js albo src/kalendarz/) wołana w obu miejscach; kopia w zapytania.js znika.

## Findingi P2

### P2 · TEST · `src/dane/magazyn.test.js:341`

Strażnik `jestKlient` (klienci.js:59–62) na granicy zaufania (import kopii) ma test odmowy tylko dla pustej nazwy. Brak: telefon '123', nazwa 121 znaków, adres 'Lipowa 3 ', notatki 1001 znaków, `utworzony: 'wczoraj'`, brak pola `telefon`. Poprawka: dopisać je do tablicy `zle` w teście 'dwaj klienci o tym samym id… → uszkodzony', każdy z oczekiwaniem `{ blad: 'uszkodzony' }`.

### P2 · TEST · `src/dane/wizyty.test.js:190`

Brak testu powtórnego `oznaczZaplateMiesiaca` (wizyty.js:203). Poprawka: dwa wywołania dla '2026-11' (przelew/OZNACZENIE, potem gotowka/POZNIEJ) i `assert.deepEqual(zlecenie(stan,'z1')?.zaplatyMiesieczne, {'2026-11': zaplata('przelew','2026-11-18',1560)})`; sprawdzić też, że `zmienione` zostaje z pierwszego zapisu.

### P2 · TEST · `src/dane/wizyty.test.js:224`

Limit MAKS_WIZYT_ZLECENIA nie ma testu odmowy w zmienWizyte (wizyty.js:54) ani w oznaczZaplateMiesiaca (wizyty.js:205). Poprawka: zlecenie z 2000 wpisami w `wizyty` i `oznaczZrobiona` na nowy dzień → `blad('za_duzo')` i storage bez zmian; analogicznie 2000 kluczy `zaplatyMiesieczne` i kolejny miesiąc → `za_duzo`.

### P2 · KOD · `src/dane/zlecenia-ksztalt.js:24`

Regex miesiąca RRRR-MM jest zdefiniowany dwa razy (`MIESIAC` tutaj i `MIESIAC_NUMERACJI` w src/dane/magazyn.js:45), a trzecia, inna definicja to `sprawdzMiesiac` w src/dane/wizyty.js:172. Zapis może przyjąć klucz, przez który `jestStanem` odrzuci stan. Poprawka: eksport `jestMiesiacem` z src/dane/ksztalt.js używany w magazyn.js:45, zlecenia-ksztalt.js:24/52 i wizyty.js:172.

### P2 · KOD · `src/dane/zlecenia.js:49`

`jestId` skopiowany trzy razy (klienci.js:48, zlecenia-ksztalt.js:44, zlecenia.js:49), `jestKwota` dwa razy (zlecenia-ksztalt.js:46, zlecenia.js:51). Zmiana granicy w jednym miejscu przepuści rekord, który strażnik odrzuci z mylącym kodem `cykl` (zlecenia.js:110), albo odwrotnie. Poprawka: eksport `jestId` i `jestKwota` z src/dane/ksztalt.js i import w trzech modułach.

### P2 · KOD · `src/dane/zlecenia.js:62`

`okresWDniu` powtarza `okresDnia` z src/kalendarz/wystapienia.js:100; kalendarz i zapis zapłaty korzystają z różnych kopii reguły okresu (cena, godzina), a czysty moduł src/zlecenia/zapytania.js:7 importuje moduł zapisu tylko dla tego pomocnika. Poprawka: wyeksportować `okresDnia(okresy, dzien)` z wystapienia.js, usunąć `okresWDniu`, wołać `okresDnia(z.okresy, dzien)` w wizyty.js, zlecenia.js i zapytania.js.

### P2 · KOD · `src/dane/zlecenia.js:234`

Seria miesięczna przesuwa dzień miesiąca na stałe po `zmienOdWizyty` w krótszym miesiącu: nowy okres ma `od = dataPierwotna`, a `dniMiesieczne` (wystapienia.js:51) bierze dzień z `okres.od`. Seria od 2026-01-31 i zmiana ceny od 2026-02-28 daje 03-28, 04-28, 05-28 zamiast 03-31, 04-30, 05-31. Poprawka: przy cyklu `miesiac` zapisać w nowym okresie dzień kotwicy pierwszego okresu (np. `dzienMiesiaca` w cyklu) albo w `dniMiesieczne` brać dzień ze `start` zlecenia.

### P2 · KOD · `src/dane/zlecenia.js:235`

Zmiana ceny „od wizyty” nie obejmuje późniejszych okresów (R13: „od wybranej wizyty w przód”). Seria tygodniowa od 2026-11-02 za 200 zł: zmiana godziny od 11-30, potem ceny 300 od 11-16 — 11-30, 12-07, 12-14 wracają do 200 zł w kalendarzu, zapłacie i „Niezapłacone”. Poprawka: podane pola `zmiana` nadpisać też we wszystkich okresach z `od` > `dataPierwotna`.

### P2 · KOD · `src/kalendarz/wystapienia.js:154`

`najblizszaWizyta` zawsze liczy okno 366 dni, choć potrzebna jest pierwsza wizyta; `najblizsza` (zapytania.js:157) woła ją dla każdego zlecenia na Starcie: 30 serii 74 ms, 100 serii 264 ms (telefon 3–5×). Zmiana: rosnące okna `for (const dni of [14, 62, 366])`, w każdym `wystapienia(zlecenie, odDnia, dodajDni(odDnia, dni - 1))` i zwrot pierwszego nieodwołanego.

### P2 · KOD · `src/zlecenia/zapytania.js:46`

`wiersz` szuka klienta przez `stan.klienci.find` w każdym wierszu; w `wizytyOkresu`, `doZamkniecia` i `najblizsza` to O(wiersze × klienci) (10 440 wierszy przy 2000 klientach: +166 ms). Zmiana: raz `new Map(stan.klienci.map((k) => [k.id, k]))`, przekazać do `wiersz` i użyć `klienciPoId.get(z.klientId) ?? null`.

### P2 · TEST · `src/zlecenia/zapytania.test.js:116`

Brak testu, że „Do zamknięcia” odrzuca odwołane wizyty (`!w.stan.odwolana`, zapytania.js:87). Poprawka: `stanZ([{ ...Z3, wizyty: { '2026-11-03': wizyta({ odwolana: true }) } }])` → `doZamkniecia(stan, DZIS, nazwaUslugi)` = []; oraz Z2 z odwołaną wizytą '2026-10-28' i `zaplatyMiesieczne: {}` → wynik bez 'z2 2026-10-28'.

### P2 · TEST · `docs/active/aplikacja-modulowa/aplikacja-modulowa-zadania.md:30`

Bookkeeping: checkbox „Weryfikacja: `node --test src/kalendarz/` przechodzi” failuje (exit 1, Cannot find module src\kalendarz — Node 24 nie przyjmuje katalogu jako argumentu). `node --test "src/kalendarz/*.test.js"` przechodzi. Poprawka: przeformułować checkbox na wariant z globem (plan techniczny już poprawiony).

## Findingi P3

### P3 · KOD · `src/dane/magazyn.js:117`

Limity MAKS_KLIENTOW i MAKS_ZLECEN sprawdzają tylko dodajKlienta/dodajZlecenie; jestStanem/maSpojneRekordy i sprawdzStanKopii ich nie egzekwują, więc spreparowana kopia z ogromną liczbą klientów/zleceń zamrozi kartę i zablokuje dodawanie. Naprawa: `klienci.length <= MAKS_KLIENTOW` i `zlecenia.length <= MAKS_ZLECEN` w maSpojneRekordy + test odmowy w magazyn.test.js.

### P3 · KOD · `src/kalendarz/wystapienia.js:30`

`DNI_TYGODNIA = 7` powtarza stałą z src/kalendarz/daty.js:19, a zlecenia-ksztalt.js:23 używa tej nazwy dla innej wartości. Poprawka: eksport z daty.js, import w wystapienia.js, `DNI_DWOCH_TYGODNI = 2 * DNI_TYGODNIA`.

### P3 · KOD · `src/dane/zlecenia.js:182`

`zaplanujZWyceny` nie sprawdza `doZaplanowania` (bramka tylko w UI); dwie karty mogą utworzyć dwa zlecenia z jednej przyjętej wyceny jednorazowej. Poprawka: dla wyceny nie-abonamentowej z istniejącym zleceniem rzucić `BladZlecenia('zaplanowana')`.

### P3 · TEST · `src/dane/klienci.test.js:112`

Gałąź `stan.wyceny.some((w) => nalezyDoKlienta(w, id))` w usunKlienta (klienci.js:183) nie ma testu. Dopisz: klient 'k1' z wyceną `{ id: 'w1', klientId: 'k1' }` → `usunKlienta` rzuca `ma_historie`, klient zostaje.

### P3 · TEST · `src/dane/zlecenia.test.js:153`

Brak testu wstawienia okresu między istniejące (sortowanie, zlecenia.js:235). Dopisz: zmiana od '2026-11-23' na 300, potem od '2026-11-09' na 270 → okresy [['2026-11-02',250],['2026-11-09',270],['2026-11-23',300]].

### P3 · TEST · `src/zlecenia/zapytania.test.js:116`

Gałąź zastępcza `okresWDniu(z, dataZrobionej)` w kwotaMiesiaca (zapytania.js:101) i filtr `kwota > 0` nie mają testu. Dopisz: Z2 z `koniec: '2026-10-20'`, zrobioną wizytą '2026-10-21', `zaplatyMiesieczne: {}`, start '2026-10-14' → `niezaplacone` = [{ rodzaj: 'miesiac', klucz: '2026-10', kwota: 1200, … }].

### P3 · TEST · `src/dane/klienci.test.js:71`

Błędy wejścia `typ` i `dane` w dodajKlienta (klienci.js:80) nie mają testu odmowy. Dopisz: `dodajKlienta(magazyn, { nazwa: 5 }, opcje)` → `bladKlienta('typ','nazwa')` i `dodajKlienta(magazyn, null, opcje)` → `bladKlienta('dane')`.

## Findingi OPERATOR

Brak.

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 7
- [E2E] odznaczone na podstawie przebiegow testera: 0
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 1

### Szczegoly

- [ ] FAIL: `node --test src/kalendarz/ przechodzi` — `Cannot find module ...\src\kalendarz` (Node 24 nie przyjmuje katalogu; glob "src/kalendarz/*.test.js" przechodzi) (P2)
- [x] CLI: `npm run typecheck przechodzi bez błędów` (x4) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/dane/klienci.test.js src/dane/zlecenia-ksztalt.test.js src/dane/magazyn.test.js przechodzi` -> PASS (komenda: ta sama)
- [x] CLI: `npm test przechodzi` -> PASS (komenda: `npm test`)
- [x] CLI: `node --test src/dane/zlecenia.test.js src/dane/wizyty.test.js przechodzi` -> PASS (komenda: ta sama)
- [x] CLI: `node --test src/zlecenia/zapytania.test.js przechodzi` -> PASS (komenda: ta sama)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 20 (19) |
| Flagi warstw | ui=false dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 0 |
| Tryb testera E2E | pominiety |
| Tester E2E | pominiety przez routing |
| Przebiegi E2E PASS / FAIL / SKIP | 0 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage |
| Reviewerzy pominieci | e2e (zero checkboxow [E2E] (0) i brak makiet figma_screens) |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 22 -> 22 -> 20 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 13 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 6 / 3 / 11 (batchowanie: 11 findingow w 3 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 17 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
