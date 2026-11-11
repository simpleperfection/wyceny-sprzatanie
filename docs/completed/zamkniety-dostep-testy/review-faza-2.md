# Review fazy 2 — Katalog publikacji

Gate: **ZASTRZEZENIA** (P1: 0, P2: 8, P3: 6, OPERATOR: 1). E2E: 2 PASS / 0 FAIL / 0 SKIP.

## Findingi P1

Brak.

## Findingi P2

### P2 · KOD · `scripts/publikacja/_headers:2`

Nowy hosting (Cloudflare Workers assets) dostaje własne nagłówki odpowiedzi, ale `_headers` ustawia tylko `X-Robots-Tag` i `Cache-Control`. Brakuje `frame-ancestors` / `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` i `Referrer-Policy` (dla index.html; oferta.html ma go w meta). CSP w `<meta>` nie może ustawić `frame-ancestors`. Ścieżka ataku: obca strona osadza `<iframe src="https://czystyzarobek.pl/oferta.html#<kod>">` (ścieżka wyjęta z Access) albo `https://czystyzarobek.pl/` przy ciasteczku Access w ramce i robi clickjacking (np. usunięcie klienta lub zlecenia). Brak HSTS zostawia pierwsze wejście po `http://` otwarte na downgrade. Naprawa: w regule `/*` dopisz `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security: max-age=31536000`; w `scripts/publikacja/cloudflare.test.mjs` asercja, że `/*` ma każdy z nich.

### P2 · KOD · `scripts/publikacja/pliki.mjs:34`

`IMPORT_STATYCZNY` jest skopiowane znak w znak z `src/oferta/graf.test.js:14`, a lista 13 modułów oferty jest w `src/oferta/graf.test.js:43-57` i w `GRAF_OFERTY` w `zbuduj.test.mjs`. Przy poprawce parsera jedna kopia się rozjedzie i test grafu w src/ policzy inny graf niż publikacja. Zmiana: graf.test.js liczy graf przez `celeOdwolan`/`grafOferty` z `pliki.mjs` (odfiltruj `.js`) albo test 13 modułów z graf.test.js znika, bo pokrywa go `GRAF_OFERTY`.

### P2 · KOD · `scripts/publikacja/pliki.mjs:71`

`plikiAplikacji` zamienia ENOENT katalogu z `KATALOGI_APLIKACJI` na `[]` bez śladu. Gdy brakuje `data/`, `src/` albo `fonty/`, build kończy się kodem 0 i do wdrożenia idzie `dist/` bez danych lub kodu (`sprawdzWynik` zamyka tylko graf oferty). Wyjątek istnieje tylko dla atrapy `MALE_REPO` w `sw-publikacji.test.mjs:657`. Zmiana: przy ENOENT `new BladPublikacji('brak katalogu aplikacji', katalog)`, a w `MALE_REPO` po jednym pliku w `data/`, `fonty/`, `ikony/`.

### P2 · KOD · `scripts/publikacja/zbuduj.mjs:125`

Kod `'BLAD_PUBLIKACJI'` jest zapisany drugi raz jako literał w obsłudze błędu CLI (pierwszy raz w klasie `BladPublikacji`, `pliki.mjs:42`), a CLI wypisuje go dla każdego wyjątku, także EACCES/EBUSY. Awarii dysku nie da się odróżnić od naruszenia listy dozwolonych. Zmiana: wyeksportuj `KOD_BLEDU_PUBLIKACJI` z `pliki.mjs` i użyj w klasie; w CLI `blad instanceof BladPublikacji ? blad.kod : 'BLAD_PUBLIKACJI_IO'` (albo importowana stała, jeśli właściciel chce jeden kod).

### P2 · TEST · `scripts/publikacja/zbuduj.test.mjs:963`

Bramka w `sprawdzWynik` (pętla `for (const plik of [STRONA_OFERTY, ...publiczne])`) nie ma testu odmowy dla plików z dist/publiczne/; mutant `[STRONA_OFERTY]` przechodzi. Taki błąd zostawia publiczny moduł, który pobiera plik zza logowania (R33). Poprawka: w „publikacja: male repo w mkdtemp” przypadek `{ ...MALE_REPO, 'src/o.js': "import { l } from '/src/l.js'\nexport const o = l" }` z `assert.rejects(zbuduj(korzen, wyjscie), { kod: 'BLAD_PUBLIKACJI', message: /publiczne\/src\/o\.js -> src\/l\.js/ })` i `stat(wyjscie)` → ENOENT.

### P2 · TEST · `scripts/publikacja/zbuduj.test.mjs:975`

Dwie bramki listy dozwolonych (R30) nie mają testu odmowy: (1) gałąź `ZAKAZANE_KATALOGI` w `sprawdzNazwe` — jej usunięcie nie wywraca testów; (2) filtr plików ukrytych w `plikiAplikacji` — `MALE_REPO` nie ma plików z kropką. Poprawka: (a) `{ ...MALE_REPO, 'src/docs/x.js': 'export {}' }` → `assert.rejects(..., { kod: 'BLAD_PUBLIKACJI', message: /zakazany katalog.*src\/docs\/x\.js/ })`; (b) dopisz do `MALE_REPO` `ikony/.ukryty.svg` i `src/.lokalne.js`, oczekiwana lista z linii 917 bez zmian.

### P2 · TEST · `scripts/publikacja/zbuduj.test.mjs:1124`

Ścieżka `URIError` w `sciezkaAdresu` (`pliki.mjs`) nie ma testu; po usunięciu catch build rzuci surowym URIError albo przepuści niezdekodowaną ścieżkę. Poprawka: `assert.throws(() => celeOdwolan('src/m.js', "import './%E0%A4%A.js'"), { kod: 'BLAD_PUBLIKACJI', message: /zle zakodowany adres: src\/m\.js -> \.\/%E0%A4%A\.js/ })`.

### P2 · KOD · `sw.js:133`

R34 obiecuje aplikację „w całości nową albo w całości starą”, ale `dist/sw.js` łamie to w otwartej sesji: każda publikacja zmienia `WERSJA_CACHE`, a zostaje `self.skipWaiting()` (sw.js:130) i `clients.claim()` z kasowaniem starego cache (sw.js:133-136). Scenariusz: stary worker oddaje stare moduły, nowy przejmuje stronę i kasuje stary cache, a leniwe `fetch('data/chemia.json')` (`src/dane/chemia.js:19`, podobnie `zakresyAplikacji` i `pytaniaAplikacji`) dostaje nowe dane do starego parsera. To samo przy pierwszym uruchomieniu po wdrożeniu: `siecPotemCache` (sw.js:93) bierze nowy `index.html`, a moduły ze starego cache. Poprawka: przy `ZAPIS_W_BIEGU=false` bez `skipWaiting` i `clients.claim` (nowy cache od następnego uruchomienia) albo leniwe `data/*.json` z cache wersji startowej strony. Brakuje testu z dwiema wersjami cache.

## Findingi P3

### P3 · E2E · `docs/active/zamkniety-dostep-testy/zamkniety-dostep-testy-zadania.md:255`

IU-5 („Konfiguracja Cloudflare i próba katalogu w przeglądarce”, R33, R34) była oznaczona w planie (`docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md:304`) jako zrobiona, choć scenariusze `publikacja-oferta-bez-logowania` i `publikacja-aplikacja-offline` nie były uruchomione. Testy jednostkowe nie sprawdzają, że oferta pod /dist/oferta.html pobiera wyłącznie pliki z /dist/publiczne/ bez błędów w konsoli ani że dist/sw.js zapisuje w cache `src/app.js` i `publiczne/src/oferta-start.js` i rysuje #/start offline. W tym review oba scenariusze przeszły w testerze E2E (PASS, zrzuty w katalogu zadania), więc linie [E2E] są odznaczone, a [x] przy IU-5 w planie ma pokrycie.
*(sceptyk: P2 → P3, sprzeciw bez dowodu obalenia)*

### P3 · KOD · `scripts/publikacja/pliki.mjs:25`

Lista dozwolonych dla `ikony` przepuszcza każdy plik bez kropki na początku nazwy, a `/ikony/*` jest wyjęty z logowania. `ZAKAZANE_ROZSZERZENIA` blokuje tylko .md, .csv, .ps1, .pl, .mjs, .test.js, więc `ikony/kopia-danych.json`, `notatki.txt`, `oferta-klienta.pdf` czy `zrzut.jpg` trafią pod publiczny adres. Naprawa: `czyDozwolony` dla `ikony` = `(nazwa) => !nazwa.includes('/') && /\.(png|svg)$/.test(nazwa)`; test odmowy `ikony/notatki.txt` i `ikony/kopia.json` w `mkdtemp`.

### P3 · KOD · `scripts/publikacja/zbuduj.mjs:26`

`sprawdzKatalogWyjsciowy` odrzuca tylko katalog wyjściowy równy korzeniowi albo nad nim, a potem `zbuduj` robi `rm(cel, { recursive: true, force: true })` (linia 96). `--wyjscie src`, `.git`, `data` albo `--korzen C:\tmp\x --wyjscie <repo>` kasuje kod, historię albo dane. Naprawa: `BladPublikacji`, gdy `cel` leży wewnątrz `zrodlo` i nie jest `join(zrodlo, KATALOG_PUBLIKACJI)`; w teście `assert.rejects(zbuduj(korzen, join(korzen, 'src')), { kod: 'BLAD_PUBLIKACJI' })` i `src/a.js` nadal istnieje.

### P3 · KOD · `scripts/publikacja/pliki.mjs:20`

Nazwy plików korzenia są w literałach: `'sw.js'` tu i jako `PLIK_WORKERA` w `sw-publikacji.mjs:8`, `'robots.txt'` tu, w `SCIEZKI_BEZ_LOGOWANIA` (linia 17) i w `POZA_PAMIECIA` (`sw-publikacji.mjs:13`). Zmiana: `export const PLIK_WORKERA` i `PLIK_ROBOTS` w `pliki.mjs`, użyte w `PLIKI_W_KORZENIU`, `SCIEZKI_BEZ_LOGOWANIA` (także `/${STRONA_OFERTY}`, `/${PREFIKS_OFERTY}/*`) i `POZA_PAMIECIA`.

### P3 · KOD · `scripts/publikacja/pliki.mjs:92`

`celeOdwolan` wybiera grupy adresu przez `wzorzec === ATRYBUT_ADRESU`; nowa grupa przechwytująca w `IMPORT_STATYCZNY` albo `ADRES_W_CSS` po cichu stanie się adresem. Zmiana: `WZORCE_ODWOLAN` jako `Record<string, { wzorzec: RegExp, grupy: number[] }>` (`.html` [3, 4], `.js` [1, 2], `.css` [1, 2, 3, 4, 5]) i `grupy.map((i) => dopasowanie[i])`.

### P3 · KOD · `sw.js:44`

Flaga `ZAPIS_W_BIEGU` jest wbudowana w predykat `czyDoZapisu`, więc `zapiszZasoby` (sw.js:115-125) w `dist/sw.js` pobiera do 300 zasobów i je wyrzuca, a nazwa ukrywa, że w publikacji zawsze zwraca false. Zmiana: `czyDoZapisu = (odpowiedz) => odpowiedz.status === 200 && odpowiedz.type === 'basic'`, w `zSieci` (linia 77) `if (ZAPIS_W_BIEGU && czyDoZapisu(odpowiedz))`, na początku `zapiszZasoby` `if (!ZAPIS_W_BIEGU) return`.

## Findingi OPERATOR

### OPERATOR · `docs/operator/zamkniety-dostep-testy-przygotowanie.md:111`

Wyjątki od logowania z `SCIEZKI_BEZ_LOGOWANIA` (`/publiczne/*`, `/ikony/*`, `/oferta.html`, `/sw.js`) to bramka Access po prefiksie ścieżki, a checklista sprawdza curl tylko na ścieżkach kanonicznych. Osoba bez konta może spróbować `curl --path-as-is` na `/publiczne/../src/app.js`, `/publiczne/%2e%2e/data/ceny.json`, `/ikony/..%2fdata/ceny.json`, `/publiczne/..%2F..%2Fdata/ceny.json`, `/oferta.html/../index.html`, `//publiczne/../data/ceny.json`; jeśli Access dopasuje wyjątek przed normalizacją, a serwer assetów rozwiąże `..` po niej, aplikacja i dane wychodzą bez logowania (R30, R1). Naprawa: w kroku próby na `proba.czystyzarobek.pl` pętla `curl --path-as-is -s -o /dev/null -w "%{http_code} $p\n"` po tych sześciu adresach — każdy 302 do Access albo 404, nigdy 200; normalizacja URL zostaje na „Normalize incoming URLs”. Pozycja dopisana do „Operator checklist faza 2”.

## Statystyki

| Severity | KOD | TEST | E2E | Razem |
|---|---|---|---|---|
| P1 | 0 | 0 | 0 | 0 |
| P2 | 5 | 3 | 0 | 8 |
| P3 | 5 | 0 | 1 | 6 |
| OPERATOR | — | — | — | 1 |

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 12
- [E2E] odznaczone na podstawie przebiegow testera: 2
- [E2E] przeniesione w trakcie runu na [Manual]: 0 (lista: brak)
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

Wynik `e2e.mjs ksieguj`: `{"odznaczone":2,"fail":0,"skip":0,"manual":0,"bezWpisu":0,"manualPozycje":[]}`, kod wyjscia 0.

### Szczegoly

- [x] CLI: `node --test scripts/publikacja/zbuduj.test.mjs przechodzi` -> PASS (komenda: `node --test scripts/publikacja/zbuduj.test.mjs`)
- [x] CLI: `npm run publikacja kończy się kodem 0 i tworzy dist/index.html` -> PASS (komenda: `npm run publikacja && test -f dist/index.html`)
- [x] CLI: `git check-ignore dist/index.html zwraca ścieżkę pliku` -> PASS (komenda: `git check-ignore dist/index.html`)
- [x] CLI: `node --test scripts/publikacja/sw-publikacji.test.mjs przechodzi` -> PASS (komenda: `node --test scripts/publikacja/sw-publikacji.test.mjs`)
- [x] CLI: `npm test przechodzi` (IU-4) -> PASS (komenda: `npm test`)
- [x] CLI: `node --test scripts/publikacja/cloudflare.test.mjs przechodzi` -> PASS (komenda: `node --test scripts/publikacja/cloudflare.test.mjs`)
- [x] CLI: `node --test scripts/serwer-dev.test.mjs przechodzi` -> PASS (komenda: `node --test scripts/serwer-dev.test.mjs`)
- [x] CLI: `npm test przechodzi` (IU-5) -> PASS (komenda: `npm test`)
- [x] CLI: `npm run typecheck przechodzi bez błędów` -> PASS (komenda: `npm run typecheck`)
- [x] Grep: `grep -c "Wszelkie prawa zastrzeżone" LICENSE zwraca 1` -> PASS (wynik 1)
- [x] Grep: `grep -c "npm run publikacja" CLAUDE.md zwraca co najmniej 1` -> PASS (wynik 1)
- [x] CLI: `npm test przechodzi` (IU-6) -> PASS (komenda: `npm test`)
- [x] E2E: `publikacja-oferta-bez-logowania` -> PASS (tester)
- [x] E2E: `publikacja-aplikacja-offline` -> PASS (tester)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 17 (9) |
| Flagi warstw | ui=false dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 2 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 2 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 16 -> 16 -> 15 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 9 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 3 / 9 (batchowanie: 9 findingow w 3 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 8 / 0 / 1 / 1 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
