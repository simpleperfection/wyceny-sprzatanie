# Review fazy 3 — Nowy wygląd, szkielet i Start

Gate: **ZASTRZEZENIA** · P1: 0 · P2: 4 · P3: 11 · OPERATOR: 0 · E2E: 6 PASS / 0 FAIL / 0 SKIP

## Findingi P1

Brak.

## Findingi P2

### P2 · TEST · `src/app.js:88`

`odswiezajPoZmianieDnia` (nowa w fazie, IU-9: odświeżenie Start po północy) nie ma żadnego testu, ani unit, ani E2E. Nie są sprawdzane trzy gałęzie: wczesny `return` przy `visibilityState !== 'visible'`, wczesny `return` przy tym samym dniu i `router.odswiez()` przy nowym dniu. Nie jest też sprawdzany reset `dzienRenderu` na `hashchange`. Zestaw zostanie zielony po usunięciu `router.odswiez()`, zamianie porównania na `!==` albo usunięciu listenera `focus`. Poprawka: wydzielić funkcję do `src/ui/zmiana-dnia.js` z wstrzykiwanymi `teraz()`, `document`/`window` i `router`. Testy: zegar 2026-11-02 23:59 → 2026-11-03 00:01 i `focus` dają 1 odświeżenie; ten sam dzień 0; `hidden` przy nowym dniu 0; `hashchange` o 00:01, a po nim `focus` 0.

### P2 · KOD · `src/ui/format.js:39`

`FORMY.klient = ['klient', 'klientów', 'klientów']` to druga definicja tej samej odmiany. Pierwsza to `FORMY_KLIENTA` w src/widoki/kopia-teksty.js:20, używana w `etykietyPodsumowania`. Poprawka w jednym miejscu rozjedzie kafel Klienci z chipami kopii i opisem wiersza „Kopia danych”. Usunąć `FORMY_KLIENTA` i w linii 69 użyć `FORMY.klient`.

### P2 · KOD · `src/widoki/lista-wycen-dane.js:51`

`sekcjeWycen` woła `doZaplanowania(stan, w)` dla każdej wyceny, a ta woła `zleceniaWyceny` (`stan.zlecenia.filter(...)`, src/dane/zlecenia.js:55). Koszt rośnie jak O(przyjęte wyceny × zlecenia). Ten sam wzorzec ma `stanWycen` (src/widoki/start-dane.js:70), więc koszt płaci każdy render #/start i #/wyceny. Przy limitach (5000 wycen, 10000 zleceń) to do 5·10^7 wywołań, na telefonie kilkaset ms. Poprawka: `zleceniaPoWycenie(stan)` (Map w jednym przejściu) i wariant `doZaplanowania` na gotowej liście zleceń. Koszt spada do O(wyceny + zlecenia).

### P2 · KOD · `src/widoki/start-dane.js:65`

Reguła „co trzeba zrobić z wyceną” jest zapisana dwa razy: w `stanWycen` i w `sekcjaWyceny` (src/widoki/lista-wycen-dane.js:35). Po zmianie w jednym miejscu kafel Wycena pokaże inne liczby niż sekcje #/wyceny. Liczyć w `stanWycen` z `sekcjeWycen(stan)`: `const ile = (id) => sekcje.find((s) => s.id === id)?.wyceny.length ?? 0`.

## Findingi P3

### P3 · KOD · `src/widoki/start-dane.js:57`

`stanZlecen` liczy `liczbaDzis(stan, dzis)` drugi raz, choć ten sam render liczy ją w `zdanieDnia` (linia 47). Każde wywołanie przechodzi po wszystkich wizytach. Policzyć raz w `widokStartu` i przekazać `{ dzis, wizytDzis }`.

### P3 · KOD · `src/widoki/start-dane.js:122`

`inicjal` nie ma użytkownika produkcyjnego, został tylko test. Został też `const JEZYK = 'pl-PL'` (linia 23), a nagłówek pliku nadal opisuje „inicjal wiersza wyceny”. Usunąć funkcję, stałą i przypadki testu, a komentarz w linii 2 skrócić do „adres wiersza wyceny”.

### P3 · KOD · `src/widoki/start.js:79`

`banerEkranu` sprawdza jawnie tylko `'ios'` i `'ustawienia'`, a każdy inny rodzaj trafia do gałęzi kopii. Zamienić na `switch (wybrany.rodzaj)` z `case 'kopia':` i `default:` z `throw new RangeError(...)` na typie `never`.

### P3 · KOD · `src/widoki/ustawienia.js:32`

Opis wiersza „Kopia danych” zależy od kolejności etykiet z `etykietyPodsumowania` (`.slice(0, POZYCJE_OPISU_KOPII)`). Dodać w kopia-teksty.js `opisWierszaKopii({ wycen, klientow })` i usunąć `POZYCJE_OPISU_KOPII`.

### P3 · KOD · `src/widoki/lista-wycen-dane.js:20`

Lokalny `formatDniaZmiany` i trzecia w repo stała `JEZYK = 'pl-PL'` (linia 17) dublują `formatDniaKrotki` z src/ui/format.js. Dodać w format.js `dzienKrotki(chwila: Date)` (czas lokalny, walidacja `sprawdzDate`) i użyć go w `dzienZmiany`.

### P3 · TEST · `src/widoki/lista-wycen-dane.test.js:22`

`stanModulowDzis()` wraz z `DZIS` i `SKRYPT_STANU` to kopia 1:1 z src/widoki/start-dane.test.js:28. Przenieść do tests/stan-modulow-dzis.js i importować w obu testach.

### P3 · KOD · `src/app.js:137`

`odswiezajPoZmianieDnia` woła `router.odswiez()` na każdej trasie. Gdy po północy użytkownik wraca do niezapisanej szybkiej wyceny (`#/szybka`, bez `id`) albo do otwartego arkusza ustawień, widok rysuje się od nowa i wpisane dane znikają. Dzień pokazuje tylko Start, więc `router.odswiez()` wołać tylko przy `location.hash === sciezka('start')`, a na innych trasach samo `dzienRenderu = dzis`.

### P3 · TEST · `src/ui/komponenty/uklad.test.js:164`

Test `podpowiedz` nie sprawdza usunięcia arkusza po zamknięciu (uklad.js:169). Dodać do `AtrapaElementu` metody `remove()` i `close()`, a po kliknięciu wywołać `arkusz.close()` i sprawdzić `assert.deepEqual(cialo.dzieci, [])`.

### P3 · TEST · `src/ui/format.test.js:112`

Test „SKROTY_DNI od poniedziałku do niedzieli” przepisuje stałą zamiast sprawdzać zachowanie. Zastąpić asercjami `kiedy`: '2026-11-04' → 'śr 4 lis', '2026-11-05' → 'czw 5 lis', '2026-11-07' → 'sb 7 lis', '2026-11-10' → 'wt 10 lis' (dzień odniesienia '2026-11-02').

### P3 · TEST · `src/widoki/karta-produktu.test.js:120`

Brak testów dwóch gałęzi `linkKarty` (karta-produktu.js:51 i :56): `czyFormularz` z tekstem „Karta charakterystyki (formularz na stronie)” i karta bez daty bez dopisku „Karta z …”. Dodać oba przypadki (aria-label i brak `.produkt-chemii__dopisek`).

### P3 · KOD · `src/style/komponenty.css:179`

Przy 360×800 pasek postępu kreatora ucina aktywny krok do „Wojewód…” (zrzut kreator-startowy-wyglad.png), bo `.postep__krok` ma `flex: 1` (ok. 76 px). Zamienić na `flex: 1 1 auto`. Cztery etykiety mają razem ok. 215 px, więc zmieszczą się w 320 px.

## Findingi OPERATOR

Brak.

## Statystyki

| Severity | KOD | TEST | E2E | Razem |
|---|---|---|---|---|
| P1 | 0 | 0 | 0 | 0 |
| P2 | 3 | 1 | 0 | 4 |
| P3 | 7 | 4 | 0 | 11 |
| OPERATOR | – | – | – | 0 |

Źródła: code-quality 6, test-coverage 4, performance 2, correctness 1, e2e 1.

## Obalone przez verify (nie do naprawy)

Brak — każdy weryfikowany finding przetrwał próbę obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]
- Odznaczone automatycznie (CLI/grep): 12
- [E2E] odznaczone na podstawie przebiegow testera: 6
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0
### Szczegoly
- [x] CLI: `node --test src/ui/komponenty/uklad.test.js przechodzi` -> PASS (komenda: `node --test src/ui/komponenty/uklad.test.js`)
- [x] CLI: `npm run typecheck przechodzi bez błędów` (6 wystąpień) -> PASS (komenda: `npm run typecheck`)
- [x] Grep: `grep -rn "dolnyPasek\|dolny-pasek" src/ index.html nie zwraca wyników` -> PASS (brak wyników)
- [x] Grep: `grep -c "src/style/zlecenia.css" index.html zwraca 1` -> PASS (wynik 1)
- [x] CLI: `node --test src/widoki/start-dane.test.js src/ui/format.test.js przechodzi` -> PASS
- [x] CLI: `node --test src/widoki/lista-wycen-dane.test.js przechodzi` -> PASS
- [x] CLI: `npm test przechodzi` (2 wystąpienia) -> PASS (komenda: `npm test`)
- Skrypt ksieguj: `{"odznaczone":6,"fail":0,"skip":0,"manual":0,"bezWpisu":0,"manualPozycje":[]}`, kod wyjścia 0.

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 40 (25) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 6 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 6 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 15 -> 15 -> 15 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 4 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 1 / 4 (batchowanie: 4 findingow w 1 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 4 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
