# Review fazy 1 — Aplikacja gotowa na logowanie

Gate: **ZASTRZEZENIA** · P1: 0 · P2: 3 · P3: 2 · OPERATOR: 0 · E2E: 0 / 0 / 0

## Findingi P1

Brak.

## Findingi P2

### P2 · TEST · `src/oferta/kodek.js:8`

Cel IU-1 (R33: wyjątek Access dla oferta.html obejmuje tylko pliki, których strona oferty potrzebuje) to graf modułów src/oferta-start.js złożony z 13 plików z planu, bez src/dane/wyceny.js, src/dane/magazyn.js i src/silnik/szybka.js. Żaden test tego nie sprawdza; pilnuje tego tylko grep z sekcji Weryfikacja. Gdy kodek.js wróci do `import { jestStatusemVat } from '../dane/magazyn.js'` albo tresc.js do `import { TRYBY_SZYBKIEJ } from '../silnik/szybka.js'`, `npm test` zostaje zielony, a strona oferty za Access zacznie ładować silnik i magazyn. Poprawka: test np. src/oferta/graf.test.js, rekurencyjnie po statycznych `import`/`export ... from` z src/oferta-start.js (tylko linie kodu, bez JSDoc `@typedef {import(...)}`), `assert.deepEqual` posortowanej listy 13 ścieżek: src/oferta-start.js, src/oferta/kodek.js, src/oferta/tresc.js, src/widoki/oferta-klient.js, src/ui/format.js, src/ui/h.js, src/ui/ikony.js, src/dane/ksztalt.js, src/dane/kwota-wyceny.js, src/kalendarz/daty.js, src/silnik/bledy.js, src/silnik/vat.js, src/silnik/tryby-szybkiej.js. (źródło: test-coverage)

### P2 · TEST · `src/pwa/sw.test.js:257`

Nowe testy install i activate wpisują na sztywno kopie stałych z sw.js: listę PLIKI_STARTOWE (linie 256–259, kopia sw.js:19–31) i nazwę 'czysty-zarobek-v1' (linie 276, 280–281, kopia WERSJA_CACHE z sw.js:9). Każde zwykłe wydanie z podbiciem WERSJA_CACHE wywróci oba testy bez zmiany zachowania. Poprawka: w uruchomSw (linia 77) zachować kontekst `vm` i zwracać `stale: vm.runInContext('({ WERSJA_CACHE, PLIKI_STARTOWE })', kontekst)`; test install porównuje z `stale.PLIKI_STARTOWE.map((plik) => ({ url: new URL(plik, KATALOG).href, tryb: 'reload' }))`, test activate używa `stale.WERSJA_CACHE` obok `'czysty-zarobek-v0'` i `'obcy-cache'`. (źródło: code-quality)

### P2 · TEST · `src/oferta/tresc.js:13`

Bookkeeping: weryfikacja `grep -E "dane/wyceny|dane/magazyn|silnik/szybka" src/oferta/tresc.js src/oferta/kodek.js` nic nie znajduje — FAIL. Grep zwraca 5 linii typedefów JSDoc w src/oferta/tresc.js (linie 13–17: `import('../dane/wyceny.js')`, `import('../dane/magazyn.js')`). Przeglądarka ich nie ładuje, ale weryfikacja w obecnym brzmieniu nie przechodzi. Poprawka: przeformułować weryfikację (pomijać komentarze) albo zastąpić ją testem grafu z findingu wyżej. (źródło: bookkeeping)

## Findingi P3

### P3 · KOD · `src/silnik/vat.js:9`

Strażnik jestStatusemVat (linie 25–27), któremu ufa dekoder linku oferty (src/oferta/kodek.js:74) i magazyn, zawęża typ do `x is StatusVat` na podstawie tablicy `STATUSY_VAT` typu `string[]` — drugiej definicji unii z typedefu w linii 6, której tsc nie pilnuje. Poprawka wg wzorca TRYBY_SZYBKIEJ: `const STATUSY_VAT = Object.freeze(/** @type {const} */ (['czynny', 'zwolniony']))`, typedef `/** @typedef {typeof STATUSY_VAT[number]} StatusVat */`, w strażniku `STATUSY_VAT.some((s) => s === x)` jak w src/dane/wyceny.js:107. (źródło: code-quality)

### P3 · KOD · `sw.js:111`

Zapis do cache ma dwie drogi, a bramkę `/cdn-cgi/` dostała tylko obsługa `fetch` (sw.js:135). `zapiszZasoby` (komunikat `zapisz-zasoby` z src/pwa/rejestracja.js) filtruje tylko po originie, więc skrypty wstrzykiwane przez Cloudflare (np. `/cdn-cgi/challenge-platform/scripts/jsd/main.js`) trafiają do `czysty-zarobek-v1` jako martwe wpisy, sprzecznie z decyzją, że `/cdn-cgi/` idzie wyłącznie do sieci. Akcja: filtr `typeof adres === 'string' && czyTenSamOrigin(adres) && !czySciezkaCloudflare(adres)` i test komunikatu z `${ORIGIN}/cdn-cgi/x.js` (bez `fetch`, cache pusty). (źródło: correctness)

## Findingi OPERATOR

Brak.

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Statystyki

- Findingi z review: 4 (P2: 2, P3: 2); z bookkeepingu: 1 (P2).
- Razem: P1 0, P2 3, P3 2, OPERATOR 0.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]
- Odznaczone automatycznie (CLI/grep): 4
- [E2E] odznaczone na podstawie przebiegow testera: 0
- [E2E] przeniesione w trakcie runu na [Manual]: 0 (lista: brak)
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 1
### Szczegoly
- [x] CLI: `npm test przechodzi` -> PASS (komenda: `npm test`)
- [x] CLI: `npm run typecheck przechodzi bez błędów` -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/pwa/sw.test.js przechodzi` -> PASS (komenda: `node --test src/pwa/sw.test.js`)
- [x] Grep: `grep -c 'rel="manifest" ... crossorigin="use-credentials"' index.html zwraca 1` -> PASS (komenda: ta sama, wynik 1)
- [ ] FAIL: `grep -E "dane/wyceny|dane/magazyn|silnik/szybka" src/oferta/tresc.js src/oferta/kodek.js nic nie znajduje` — `5 trafień w typedefach JSDoc src/oferta/tresc.js:13–17` (P2)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 11 (9) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 0 |
| Tryb testera E2E | pominiety |
| Tester E2E | pominiety przez routing |
| Przebiegi E2E PASS / FAIL / SKIP | 0 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage |
| Reviewerzy pominieci | e2e (zero checkboxow [E2E] (0) i brak makiet figma_screens) |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 4 -> 4 -> 4 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 2 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 1 / 2 (batchowanie: 2 findingow w 1 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 2 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
