# Review fazy 5 — Zlecenia, szybka wycena i pytania do klienta

Gate: **ZASTRZEZENIA**. P1: 0, P2: 15, P3: 8, OPERATOR: 4. E2E: 4 PASS / 0 FAIL / 0 SKIP.

## Findingi P1

Brak.

## Findingi P2

### P2 · KOD · `src/kreator/pytania.js:574`

Skutek brudu z odpowiedzi trafia w dokładnej wycenie tylko do pomieszczeń istniejących w chwili zapisu odpowiedzi; `dodajPomieszczenie` (src/kreator/pomieszczenia.js:67) bierze tylko `brud_domyslny`, a pigułka skutku liczy `zastosujOdpowiedzi` od nowa i twierdzi, że skutek działa (także pigułka dojazdu po ręcznej zmianie km). Naprawa: nakładać `regulyBrudu(uslugaId, odpowiedzi, pytania)` w `dodajPomieszczenie`, pigułkę liczyć z rzeczywistego wejścia.

### P2 · KOD · `src/kreator/pytania.js:575`

Zmiana odpowiedzi z „tak” na „nie” zostawia w dokładnej wycenie brud z poprzedniej odpowiedzi (`zastosujSkutek` daje null, src/silnik/pytania.js:103), a szybka wycena go usuwa. Naprawa: zdejmować regułę brudu skutku z pomieszczeń, w których poziom wciąż równa się poziomowi skutku.

### P2 · KOD · `src/kreator/pytania.js:578`

Odpowiedź bez skutku (np. „termin”) zapisuje `wejscie`, więc `zapiszZmianyWyceny` przelicza migawkę i ustawia `oferta.nieaktualna`; cena przyjętej wyceny może się zmienić po cichu. Naprawa: przekazywać `wejscie` tylko przy niepustych `skutki`, inaczej samo `{ odpowiedzi }`.

### P2 · KOD · `src/kreator/stan.js:175`

`zapiszZmianyWyceny` woła `magazyn.zmien` bezpośrednio i kopiuje reguły zapisu z `src/dane/wyceny.js` (`tylko_odczyt`, `pusty_zakres`, `nieaktualnaPoWyslaniu`, `zmieniona`, walidatory). Do zrobienia: przenieść do `src/dane/wyceny.js` jako `zapiszPolaWyceny(magazyn, id, fn, opcje)` na `zmienWycene`.

### P2 · KOD · `src/kreator/szybka.js:53`

Pole `szybka_wycena` nie jest w typedefie `Usluga` ani w walidacji katalogu; dwie różne `rodzajSzybkiej`, kreator wpuszcza każdą wartość. Do zrobienia: dodać pole do `Usluga` i walidacji w katalog.js, jedna `rodzajSzybkiej` z `src/silnik/szybka.js`, usunąć kopię.

### P2 · TEST · `src/kreator/szybka.test.js:124`

Bez testu gałęzie `wynikFormularza` (src/kreator/szybka.js:144-149): BladKatalogu → `liczenie`, ponowne rzucenie, `lazienki` → `metraz`, inny BladWejscia → `liczenie`. Poprawka: trzy przypadki z opisu review.

### P2 · KOD · `src/kreator/zakonczenie.js:109`

`widokZakonczenia` przy każdym kroku licznika parsuje stan z localStorage 5 razy i 5–6 razy sortuje wszystkie wykonania. Zmiana: czytać stan raz w `rysujEkran`, liczyć raz `przed` i `stawkaPlanu`, `kosztPrzyTempie` i `tempoUslugi` z gotowymi danymi.

### P2 · TEST · `src/kreator/zakonczenie.test.js:101`

Test realnej stawki liczy oczekiwania tą samą `kosztPrzyTempie`; brak własnego testu i gałęzi `brak_wyniku`. Poprawka: dosłowne wartości (zostaje 234.612, stawka 42.657, stawkaPlanu 46.912), test `brak_wyniku` i test z `cenaReczna`.

### P2 · TEST · `src/silnik/pytania.test.js:150`

`sprawdzPytania` (src/silnik/pytania.js:159-217) bez testów odmowy dla wielu reguł (poziom poza 1–N, nieznane pomieszczenie, brud przy liczba/tekst, `gdy` spoza odpowiedzi, puste opcje, nieznany typ i rodzaj skutku, lista usługi nie-tablica, błędy `zdjecia`). Poprawka: jeden przypadek na regułę z dosłownym komunikatem.

### P2 · KOD · `src/silnik/szybka.js:94`

Id zestawu `'biuro'` w trzech miejscach (literał, `ZESTAW_BIURA` w src/kreator/szybka.js:49 i src/silnik/czas.js:16). Do zrobienia: wyeksportować jedną stałą i ją importować.

### P2 · KOD · `src/silnik/szybka.js:259`

Kontrakt widełek ma dwie definicje (`naDokladna` i `SzybkaWyceny` w src/dane/wyceny.js:34 z `tryb: string`); `jestSzybka` przepuszcza dowolny string. Do zrobienia: jeden typedef `SzybkaWyceny` w silniku, `jestSzybka` sprawdza `tryb` i `stan`.

### P2 · TEST · `src/ui/schowek.js:16`

`kopiujDoSchowka` bez testu (gałąź `catch` z zapasowym zaznaczeniem i ponowne rzucenie). Poprawka: test z podmienionym clipboard, `getSelection` i `execCommand`, plus przypadek `RangeError`.

### P2 · KOD · `src/widoki/pytania.js:40`

Odpowiedzi tak/nie zdefiniowane dwa razy (`TAK_NIE` w widoku, `ODPOWIEDZI_TAK_NIE` w src/silnik/pytania.js:30). Do zrobienia: wyeksportować z silnika i użyć w `poleOdpowiedzi`.

### P2 · TEST · `src/widoki/zakonczenie.js:34`

`zdanieRoznicy` i `godzinyMinuty` bez testu jednostkowego (gałęzie „krócej” i „tyle, ile plan”, warianty karty tempa). Poprawka: wyeksportować i sprawdzić dosłownie wartości z opisu review.

### P2 · KOD · `src/widoki/zakonczenie.js:85`

Baner ma na sztywno „Masz 3 zlecenia”. Do zrobienia: `${widok.tempo.info.wymagane}` zamiast literału.

## Findingi P3

### P3 · KOD · `src/widoki/szybka.js:209`

Ekran szybkiej wyceny zapisuje cały magazyn przy każdym kliknięciu licznika albo chipa, gdy rekord już istnieje (3× JSON.parse, ponowne `naDokladna`/`wycenUsluge`, synchroniczny `localStorage.setItem`); przy ok. 1000 wycen rzędu 100–200 ms na kliknięcie. Zmiana: `kontekstSzybkiej` raz na zmianę, gotowy wynik do `zapiszSzybka`, zapis odroczony o ok. 500 ms albo przy akcjach i wyjściu. *(sceptyk: P2 → P3, sprzeciw bez dowodu obalenia)*

### P3 · KOD · `src/kreator/szybka.js:48`

Martwa stała `USLUGA_DODATKOW = 'agd'` (używana kopia w src/widoki/szybka.js:42). Usunąć linię 48.

### P3 · KOD · `src/kreator/zakonczenie.js:41`

Kontrola „wycena bez migawki → `BladWyceny('brak_wyniku')`” w trzech miejscach (`migawka`, `kosztPrzyTempie`, `wymagajWyniku` w src/dane/wyceny.js:201). Wyeksportować `wymagajWyniku` i użyć go wszędzie.

### P3 · KOD · `src/kreator/pytania.js:33`

Nieosiągalna gałąź `!jestOdpowiedzia(odpowiedz)`; wyeksportować `sprawdzOdpowiedz` (asserts) z src/silnik/pytania.js i usunąć `jestOdpowiedzia`.

### P3 · KOD · `src/widoki/pytania.js:34`

`NIE_SKOPIOWANO` ma kopię w src/widoki/szybka.js:45; wyeksportować z src/ui/schowek.js.

### P3 · KOD · `src/kreator/szybka.js:230`

`zapiszSzybka` z `id === null` zapisuje dwa razy; gdy drugi zapis padnie, zostaje osierocony szkic bez wyniku (kolejne przy każdej próbie). Naprawa: try/catch z `usunWycene` i ponownym rzuceniem.

### P3 · TEST · `src/kreator/pytania.test.js:132`

Strażnik `nieaktualna` w `zapiszOdpowiedz` (src/kreator/pytania.js:113) bez testu odmowy; test z podklasą `PamiecMagazynu` zmieniającą `zmieniona` przy drugim odczycie.

### P3 · TEST · `src/kreator/zakonczenie.test.js:63`

Przycięcie `czasStartowy` do granic licznika bez testu: `minutyNormowe: 3` → 15, `2000` → 1440.

## Findingi OPERATOR

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/zakonczenie-zlecenia-actual.png`

visual review (układ się zgadza; do oceny: „Zostało dla Ciebie” 235 zł przy planie i fakcie, zmienia się tylko stawka 47 → 43 zł/h) — Operator action: otwórz visual-diff/zakonczenie-zlecenia-figma.png obok visual-diff/zakonczenie-zlecenia-actual.png (stan e2e/stany/zlecenie-przyjete.json, trasa #/wycena/e2e-zlecenie-przyjete/koniec, licznik 5 h 30 min)

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/ustawienia-firmy-actual.png`

visual review (nowa lista „Plan a fakt” pod „Tempo pracy”; dolne menu w środku zrzutu to artefakt) — Operator action: otwórz visual-diff/ustawienia-firmy-figma.png obok visual-diff/ustawienia-firmy-actual.png (stan e2e/stany/zlecenie-przyjete.json po jednym wpisie czasu, trasa #/ustawienia)

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/szybka-wycena-actual.png`

visual review (pigułka „Zostaje ok. 47 zł/h” i zwijane „AGD i dodatki” to zaplanowane odstępstwa) — Operator action: otwórz visual-diff/szybka-wycena-figma.png obok visual-diff/szybka-wycena-actual.png (stan e2e/stany/ustawienia-mazowieckie.json, trasa #/szybka, mieszkanie standard 50 m², typowy)

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/pytania-do-klienta-actual.png`

visual review (do oceny: kolejność pytań z data/pytania.json i pełna nazwa usługi w podtytule) — Operator action: otwórz visual-diff/pytania-do-klienta-figma.png obok visual-diff/pytania-do-klienta-actual.png (szybka wycena 50 m², zwierzęta „Tak”, dojazd 32 km, trasa #/wycena/<id>/pytania)

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 8
- [E2E] odznaczone na podstawie przebiegow testera: 4
- [E2E] przeniesione w trakcie runu na [Manual]: 0 (lista: brak)
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [x] CLI: `node --test src/kreator/zakonczenie.test.js przechodzi` -> PASS (komenda: `node --test src/kreator/zakonczenie.test.js`)
- [x] CLI: `npm run typecheck przechodzi bez błędów` (IU-19) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/silnik/szybka.test.js src/silnik/pytania.test.js przechodzi` -> PASS (komenda: ta sama)
- [x] CLI: `kalibracja.ps1 wypisuje „niezgodności katalogu: 0”` -> PASS (komenda: `bash -c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1"`, pliki generowane bez zmian)
- [x] CLI: `npm run typecheck przechodzi bez błędów` (IU-20) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/kreator/stan.test.js przechodzi` -> PASS (komenda: ta sama)
- [x] CLI: `npm test przechodzi` -> PASS (komenda: `npm test`, 658/658)
- [x] CLI: `npm run typecheck przechodzi bez błędów` (IU-21) -> PASS (komenda: `npm run typecheck`)
- e2e.mjs ksieguj: `{"odznaczone":4,"fail":0,"skip":0,"manual":0,"bezWpisu":0,"manualPozycje":[]}`, kod wyjscia 0.

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 35 (31) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 4 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 4 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 28 -> 28 -> 27 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 16 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (zapasowy agent w review) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 4 / 16 (batchowanie: 16 findingow w 4 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 15 / 0 / 1 / 1 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
