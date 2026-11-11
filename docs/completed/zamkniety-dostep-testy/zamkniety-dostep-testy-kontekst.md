# Kontekst: zamkniety-dostep-testy

Branch: `feature/zamkniety-dostep-testy`
Ostatnia aktualizacja: 2026-11-09
Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`

## Źródła

- Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`
- Requirements doc: `docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md`
- Przygotowanie dla operatora: `docs/operator/zamkniety-dostep-testy-przygotowanie.md`

## Plan techniczny

Kluczowe pliki, decyzje techniczne, odroczone pytania i wzorce do naśladowania: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md` (sekcje „Kluczowe decyzje techniczne”, „Otwarte pytania”, tabela plików i „Wzorce do naśladowania” w blokach IU).

## Wymagania wstępne operatora

Checklista: `docs/operator/zamkniety-dostep-testy-przygotowanie.md`.

Brak nieodhaczonych pozycji blokujących.

## Dziennik

### 2026-11-09 — Faza 1: Aplikacja gotowa na logowanie

- Walidacja domknięcia: `npm test` 1465/1465, `npm run typecheck` bez błędów, bramki mechaniczne bez porażek (typecheck i testyUsuniete ok, pozostałe brak lub pominięte), audyt diffu bez `console.*` i pustych `catch`.
- IU-1: `TRYBY_SZYBKIEJ` w nowym `src/silnik/tryby-szybkiej.js`, `jestStatusemVat` w `src/silnik/vat.js` jako czysty strażnik (`typeof` + `STATUSY_VAT.includes`), a `sprawdzStatusVat` go woła; `magazyn.js` i `szybka.js` dalej eksportują te same nazwy, z `magazyn.js` zniknęły nieużywane importy `BladWejscia` i `sprawdzStatusVat`. Graf od `src/oferta-start.js` to 13 modułów z planu. Weryfikacja grep z planu w dosłownym brzmieniu łapie typy JSDoc w `src/oferta/tresc.js` (linie 13–17), których przeglądarka nie ładuje; korekta brzmienia w planie przy IU-1. Następny krok buildera: rozważyć test pilnujący listy 13 modułów oferty (wpisany już do IU-3).
- IU-2: `sw.js` przepuszcza bez `respondWith` ścieżki zaczynające się od `/cdn-cgi/` (stała `PREFIKS_CLOUDFLARE`, porównanie `pathname.toLowerCase()` od korzenia domeny), manifest w `index.html` ma `crossorigin="use-credentials"`. Najpierw testy charakteryzujące (install, activate, opaqueredirect, TypeError przy odświeżeniu), potem wyjątek; `src/pwa/sw.test.js` 18/18. Liczby linii różnią się od tabeli planu (plan liczył od starszego stanu: sw.js 139 → 144). `WERSJA_CACHE` bez zmian, bo `PLIKI_STARTOWE` się nie zmieniła. Następne kroki: test „install zapisuje wszystkie PLIKI_STARTOWE” ma dosłowną listę, więc IU-4 musi go zaktualizować, jeśli zmieni listę w repo; znana usterka P3 `sw.js` (`zSieci` woła `waitUntil` po `respondWith`) zostaje poza zakresem.

### 2026-11-09 — Review fazy 1

- Gate: ZASTRZEZENIA. P1 0, P2 3, P3 2, OPERATOR 0. Raport: `docs/active/zamkniety-dostep-testy/review-faza-1.md`.
- Wniosek: kod fazy działa (testy, typecheck, sw.test zielone), ale izolacji grafu oferty (R33) nie pilnuje żaden test, a weryfikacja grep w dosłownym brzmieniu pada na typedefach JSDoc w `tresc.js`; testy sw kopiują stałe z `sw.js`. P3 w `known-issues.md`.

### 2026-11-09 — Faza 2: Katalog publikacji

- Walidacja domknięcia: `npm test` 1510/1510, `npm run typecheck` bez błędów, `npm run publikacja` kod 0 (168 plików w `dist/`, ignorowany przez Git), bramki mechaniczne bez porażek (typecheck i testyUsuniete ok, eslint, testyTypow, knip, sizeLimit i stryker brak, migracje pominięte), audyt diffu bez `console.*` w kodzie aplikacji i bez pustych `catch`. Przy domknięciu poprawiona nazwa testu `wrangler.json` w `cloudflare.test.mjs` („bez html_handling” → „i html_handling none”), asercja bez zmian.
- IU-3: `scripts/publikacja/pliki.mjs` (lista dozwolonych, graf oferty, parser odwołań HTML/CSS) i `zbuduj.mjs`; pliki większe niż w planie (121/111/307 linii) przez parser `url()`/`@import`/`href` bez cudzysłowu i osobne ścieżki błędów. Zabezpieczenia poza Podejściem: odmowa, gdy katalog wyjściowy obejmuje repo; nieudana publikacja usuwa `dist/`; brak pliku z korzenia listy daje `BLAD_PUBLIKACJI`; pomijane pliki z kropką i dowiązania; CLI z `--korzen` i `--wyjscie`. 7 ręcznych mutacji wywraca testy. Regex importów jest teraz w `src/oferta/graf.test.js` i `pliki.mjs` (kandydat do jednego źródła). `tsconfig.json` nie obejmuje `scripts/**/*.mjs` (bez `@types/node`) — decyzja operatora.
- IU-4: `sw-publikacji.mjs` podmienia w `dist/sw.js` `WERSJA_CACHE` (hasz ścieżek i treści plików oraz `sw.js`), `PLIKI_STARTOWE` (pełna lista) i `ZAPIS_W_BIEGU = false`; `sw.js` dostał stałą `ZAPIS_W_BIEGU`. Fikstura `sw.js` w `zbuduj.test.mjs` (IU-3) dostała trzy stałe, asercje bez zmian. Następne kroki: hasz zależy od końców linii (CRLF na Windows vs LF w CI) — publikować z jednego miejsca albo ustawić `eol` w `.gitattributes`; `zapiszZasoby` w `sw.js` przy `!ZAPIS_W_BIEGU` mógłby wychodzić wcześnie.
- IU-5: `wrangler.json` (bez `main`/`routes`, `html_handling: none`), `_headers` i `_redirects` w `scripts/publikacja/` (kopiowane do `dist/`), `dist/start.html` = `index.html`, stałe `SCIEZKI_BEZ_LOGOWANIA`, `STRONA_STARTOWA`, `STRONA_APLIKACJI`, `PLIKI_CLOUDFLARE` w `pliki.mjs`; `serwer-dev.mjs` daje `index.html` dla adresu katalogu z `/`. `POZA_PAMIECIA` w `sw-publikacji.mjs` bierze stałe z `pliki.mjs`; testy IU-3 i IU-4 zaktualizowane do nowego zamówionego zachowania. Wranglera nie uruchamiano — przyjęcie `_headers`/`_redirects` z komentarzami `#` sprawdzi próba operatora. Następne kroki: komentarz JSDoc `celeOdwolan` (`pliki.mjs:81`) zawiera `@import`, co przy objęciu `scripts/` typecheckiem da TS1109.
- IU-6: `LICENSE` (wszelkie prawa zastrzeżone, nie trafia do `dist/`), `CLAUDE.md` opisuje publikację (`npm run publikacja` lokalnie, `node scripts/publikacja/zbuduj.mjs` w Workers Builds) i zdanie o GitHub Pages zaktualizowane. Następny krok: po przejściu repo na prywatne (krok 7 checklisty operatora) usunąć z `CLAUDE.md` wzmianki o publicznym repo i GitHub Pages.
- Review fazy 2 (2026-11-09): gate ZASTRZEZENIA, P1 0 / P2 8 / P3 6 / OPERATOR 1, raport `docs/active/zamkniety-dostep-testy/review-faza-2.md`. E2E 2/2 PASS, wszystkie 12 weryfikacji CLI/grep zielone. Najważniejsze: `dist/sw.js` przejmuje otwartą sesję (`skipWaiting`/`clients.claim`) i miesza stary kod z nowymi danymi (R34), `_headers` bez nagłówków bezpieczeństwa (clickjacking oferty bez logowania), luki w testach odmowy listy dozwolonych.
