# Podsumowanie: zamkniety-dostep-testy

Data ukończenia: 2026-11-11
Branch: `feature/zamkniety-dostep-testy`
Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`
Wymagania: `docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md`

## Co dostarczono

Kod potrzebny do zamknięcia aplikacji na czas testów (etap 6a): publikacja na Cloudflare za logowaniem Cloudflare Access dla listy do 5 firm. Dwie fazy autopilota, 6 jednostek (wszystkie execute/review/fix = done, `otwarteFindingi` puste). Walidacja końcowa: testy 1518/1518, typecheck bez błędów, `npm run publikacja` buduje 168 plików; 2 scenariusze E2E w przeglądarce zaliczone. Same przenosiny (DNS, Access, Worker, prywatne repo) robi właściciel po scaleniu.

1. **Aplikacja gotowa na logowanie** (IU-1, IU-2): strona oferty nie ładuje silnika wyceny ani magazynu danych (13 modułów zamiast 28), service worker pomija ścieżki `/cdn-cgi/`, a manifest idzie z ciasteczkiem.
2. **Katalog publikacji** (IU-3–IU-6): `scripts/publikacja/` buduje `dist/` z listy dozwolonych plików, pliki oferty trafiają do `dist/publiczne/`, `dist/sw.js` dostaje wersję z hasza treści i pełną listę plików, a `wrangler.json`, `_headers` i `_redirects` konfigurują Cloudflare. Doszedł plik `LICENSE` i opis publikacji w `CLAUDE.md`.

Autopilot przerwał się 2026-11-09 po commicie poprawek fazy 2 (limit planu). Kontrolę tych poprawek, walidację końcową, compound i archiwum dokończono ręcznie 2026-11-11, bez workflowu; kroki „compound-refresh” i „ogrodnik” pominięto.

## Kluczowe decyzje

- Lista dozwolonych plików zamiast listy zakazanych: nowy plik w repo domyślnie nie trafia pod domenę (R30).
- Oferta w `dist/publiczne/` z przepisanymi ścieżkami: Access ma dwie ścieżki bez logowania zamiast dwudziestu, a graf oferty liczy się przy każdej publikacji.
- Opublikowany worker zmienia cache tylko przy instalacji i nie przejmuje otwartych stron. Nową wersję widać po zamknięciu i ponownym otwarciu aplikacji.
- Workers Static Assets bez skryptu Workera, `html_handling: none`, bez `routes` w `wrangler.json`: domenę dodaje właściciel w panelu, żeby build nie przejął adresu przed ustawieniem Access.
- `wrangler` bez wpisu w `package.json`, wersja przypięta w poleceniu wdrożenia.

Pełna lista z plikami: `docs/decisions/2026-11-11-zamkniety-dostep-testy.md`.

## Główne pliki

- Publikacja: `scripts/publikacja/pliki.mjs`, `zbuduj.mjs`, `sw-publikacji.mjs`, `_headers`, `_redirects`, `wrangler.json`
- Aplikacja: `sw.js`, `index.html`, `src/silnik/tryby-szybkiej.js`, `src/silnik/vat.js`, `src/oferta/tresc.js`, `src/oferta/kodek.js`, `src/dane/magazyn.js`
- Testy: `scripts/publikacja/zbuduj.test.mjs`, `sw-publikacji.test.mjs`, `cloudflare.test.mjs`, `src/oferta/graf.test.js`, `src/pwa/sw.test.js`, `scripts/serwer-dev.test.mjs`
- Inne: `LICENSE`, `scripts/serwer-dev.mjs` (adres katalogu z `/` daje `index.html`), `package.json` (`npm run publikacja`), `.gitignore` (`dist/`)

## Wnioski

- Review fazy 2 znalazł 8 uwag P2 przy zielonych testach. Najpoważniejsze: `dist/sw.js` przejmował otwartą stronę i mieszał stary kod z nowymi danymi, a `_headers` nie miał nagłówków bezpieczeństwa, choć oferta jest dostępna bez logowania. Wniosek o workerze zapisany w `docs/solutions/deployment-issues/2026-11-11-nowy-service-worker-przejmuje-otwarta-strone-i-miesza-wersje.md`.
- Bramki listy dozwolonych nie miały testów odmowy: usunięcie gałęzi `ZAKAZANE_KATALOGI` albo filtra plików ukrytych nie wywracało testów, a brak katalogu `data/` kończył build kodem 0. Każda bramka publikacji potrzebuje testu z wejściem, które ma zostać odrzucone.
- Wyjątki Access działają po początku ścieżki, więc checklista operatora dostała próbę obejścia adresami z `..` (`curl --path-as-is`), a krok o aktualizacji opisuje zamknięcie kart zamiast odświeżenia.
- Audyt testów w commitach poprawek: `9d71eed` zmienił asercje w `src/pwa/sw.test.js` (lista plików i nazwa cache brane ze stałych `sw.js`, zgodnie z uwagą P2 fazy 1); `90aa3f8` nie zmienił istniejących asercji.
- Wranglera nie uruchamiano. Przyjęcie `_headers` i `_redirects` sprawdzi dopiero próba na `proba.czystyzarobek.pl`.
- Hasz wersji cache zależy od końców linii, więc publikacja z Windows i z Cloudflare daje różne nazwy cache dla tej samej treści. Publikować ma tylko Cloudflare.
- W worktree pliki `.md` mają końce CRLF i skrypt `wiedza.mjs indeks` pomija wtedy stare wpisy bazy wiedzy. Przed generowaniem indeksu trzeba je zamienić na LF w kopii roboczej.
- Otwarte P3 (8 pozycji) są w `known-issues.md`. Dwie warte uwagi przed kolejnymi zmianami w publikacji: `--wyjscie` wskazujące katalog wewnątrz repo zostałby skasowany, a `ikony/` przepuszcza każdy plik pod adres bez logowania.

## Smoke operatora

`docs/operator/2026-11-11-zamkniety-dostep-testy-smoke.md` — 17 pozycji do ręcznego sprawdzenia, wszystkie po scaleniu z `main` (przenosiny według `docs/operator/zamkniety-dostep-testy-przygotowanie.md`). Dwie pozycje sprzed scalenia sprawdzone 2026-11-11 w przeglądarce.
