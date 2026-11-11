---
zadanie: zamkniety-dostep-testy
data: 2026-11-11
claude_md: uzgodniono
---

# Decyzje — zamkniety-dostep-testy

## Decyzje
- Pod domenę trafia katalog `dist/` zbudowany z listy dozwolonych plików, a nie repo bez listy zakazanych — nowy plik w repo domyślnie nie jest publiczny (R30); po zapisie skrypt sprawdza wynik drugi raz i przy naruszeniu usuwa `dist/` (`scripts/publikacja/pliki.mjs`, `scripts/publikacja/zbuduj.mjs`).
- Strona oferty i jej pliki idą do `dist/publiczne/`, a `dist/oferta.html` dostaje przepisane ścieżki — Access potrzebuje dwóch ścieżek zamiast dwudziestu, a graf oferty liczy się przy każdej publikacji (`grafOferty` w `scripts/publikacja/pliki.mjs`).
- Oferta nie ładuje silnika wyceny ani magazynu danych: 13 modułów zamiast 28 — pliki oferty są publiczne (R33), więc wyszły z niej `TRYBY_SZYBKIEJ` i `jestStatusemVat` (`src/silnik/tryby-szybkiej.js`, `src/silnik/vat.js`); listy pilnują `src/oferta/graf.test.js` i `GRAF_OFERTY` w `scripts/publikacja/zbuduj.test.mjs`.
- Graf importów liczy jeden parser (`celeOdwolan`) dla publikacji i dla testu grafu w `src/` — dwie kopie wzorca mogły policzyć różne grafy (review fazy 2).
- `dist/sw.js` ma wersję cache z hasza treści, pełną listę plików i `ZAPIS_W_BIEGU = false`: cache zmienia tylko `install`, więc wersja instaluje się w całości albo wcale (`scripts/publikacja/sw-publikacji.mjs`).
- Opublikowany worker nie przejmuje otwartych stron (bez `skipWaiting` i `clients.claim`) — inaczej stary kod dostawał nowe `data/*.json`; nową wersję widać po zamknięciu i ponownym otwarciu aplikacji. `sw.js` z repo dalej przejmuje stronę (`sw.js`, review fazy 2).
- Service worker pomija ścieżki `/cdn-cgi/` — powrót z logowania Access nie może dostać `index.html` z cache; manifest ma `crossorigin="use-credentials"` jako drugi bezpiecznik (`sw.js`, `index.html`).
- Hosting to Workers Static Assets bez skryptu Workera, z `html_handling: none` i regułą `/ /start.html 200`; `wrangler.json` nie ma `routes`, a `workers_dev` i `preview_urls` są wyłączone — domenę dodaje właściciel w panelu, żeby build nie przejął adresu przed ustawieniem Access (`wrangler.json`, `scripts/publikacja/_redirects`).
- `_headers` w regule `/*` zakazuje osadzania w ramce, zgadywania typu i nagłówka Referer oraz wymusza HTTPS (HSTS na rok) — oferta jest dostępna bez logowania, więc była podatna na clickjacking (`scripts/publikacja/_headers`, review fazy 2).
- Brak katalogu aplikacji przerywa publikację, a CLI odróżnia awarię odczytu i zapisu (`BLAD_PUBLIKACJI_IO`) od naruszenia zasad (`BLAD_PUBLIKACJI`) — wcześniej build bez `data/` kończył się kodem 0 (`scripts/publikacja/pliki.mjs`, `scripts/publikacja/zbuduj.mjs`).
- `wrangler` nie ma wpisu w `package.json`; wersję przypina polecenie `npx wrangler@4.158.0 deploy`, a build w Cloudflare nie robi `npm install`.
- Kod i dane mają zastrzeżenie praw w pliku `LICENSE`, który nie trafia do `dist/`.

## Do CLAUDE.md po merge'u
- `CLAUDE.md` opisuje już publikację (`npm run publikacja`, `scripts/publikacja/`, `wrangler.json`, ścieżki bez logowania) i zastrzeżenie praw; dopisane w gałęzi przez IU-6.
- Do dopisania: opublikowany worker nie przejmuje otwartych stron, więc nową wersję widać po zamknięciu i ponownym otwarciu aplikacji; kod `BLAD_PUBLIKACJI_IO` dla awarii dysku.
- Zarchiwizowane zadanie: `docs/completed/zamkniety-dostep-testy/` (gałąź `feature/zamkniety-dostep-testy`), smoke `docs/operator/2026-11-11-zamkniety-dostep-testy-smoke.md`.
- Po kroku 7 checklisty operatora (repo prywatne): usunąć wzmianki o publicznym repo, GitHub Pages, `CNAME` i `.nojekyll`.
