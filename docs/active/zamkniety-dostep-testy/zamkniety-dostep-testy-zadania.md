# Zadania: zamkniety-dostep-testy

Branch: `feature/zamkniety-dostep-testy`
Ostatnia aktualizacja: 2026-11-05
Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`

Checkboxy odsyłają do jednostek planu technicznego (IU-K): cel, podejście, decyzje i teksty są tylko tam.

## Faza 1 — Aplikacja gotowa na logowanie

Zależy od: Brak

### IU-1: Strona oferty bez silnika wyceny (feature-builder-data)

- [x] Stwórz: `src/silnik/tryby-szybkiej.js`
- [x] Modyfikuj: `src/silnik/szybka.js`
- [x] Modyfikuj: `src/silnik/vat.js`
- [x] Modyfikuj: `src/dane/magazyn.js`
- [x] Modyfikuj: `src/oferta/tresc.js`
- [x] Modyfikuj: `src/oferta/kodek.js`
- [x] Test (unit): `src/silnik/vat.test.js`
- [x] Test: [Unit] `jestStatusemVat` z `src/silnik/vat.js` daje `true` dla `czynny` i `zwolniony`, a `false` dla innego tekstu, liczby i `undefined`
- [x] Test: [Unit] istniejące testy `src/oferta/tresc.test.js`, `src/oferta/kodek.test.js` i `src/silnik/szybka.test.js` przechodzą bez zmian
- [x] Weryfikacja: `npm test` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [x] Weryfikacja: `grep -E "^import .*(dane/wyceny|dane/magazyn|silnik/szybka)" src/oferta/tresc.js src/oferta/kodek.js` nic nie znajduje (typedefy JSDoc pomija; graf pilnuje `src/oferta/graf.test.js`)

### IU-2: Service worker i manifest przy logowaniu (feature-builder-data)

- [x] Modyfikuj: `sw.js`
- [x] Modyfikuj: `index.html`
- [x] Test (unit): `src/pwa/sw.test.js`
- [x] Test: [Unit] nawigacja na `/cdn-cgi/access/authorized?kod=1` i zasób spod `/cdn-cgi/` nie wywołują `respondWith`
- [x] Test: [Unit] nawigacja, na którą sieć odpowiada `opaqueredirect` ze statusem 0, zwraca tę odpowiedź, a cache zostaje pusty
- [x] Test: [Unit] plik z cache przy odrzuconym odświeżeniu (przekierowanie modułu kończy się `TypeError`) zwraca kopię z cache i zgłasza `sw_odswiezenie`
- [x] Test: [Unit] `install` przekazuje `addAll` wszystkie `PLIKI_STARTOWE` z `cache: 'reload'`, a odrzucone `addAll` odrzuca obietnicę z `waitUntil`
- [x] Test: [Unit] `activate` usuwa cache o innej nazwie i zostawia bieżący
- [x] Weryfikacja: `node --test src/pwa/sw.test.js` przechodzi
- [x] Weryfikacja: `grep -c 'rel="manifest" href="manifest.webmanifest" crossorigin="use-credentials"' index.html` zwraca 1

## Do poprawy po review fazy 1

Zamkniete cyklem fix: 3 pozycji — pelna tresc findingow i uzasadnienia w `review-faza-1.md`.

## Faza 2 — Katalog publikacji

Zależy od: Faza 1

### IU-3: Katalog publikacji z listy dozwolonych plików (feature-builder-data)

- [ ] Stwórz: `scripts/publikacja/pliki.mjs`
- [ ] Stwórz: `scripts/publikacja/zbuduj.mjs`
- [ ] Test (unit): `scripts/publikacja/zbuduj.test.mjs`
- [ ] Modyfikuj: `.gitignore`
- [ ] Modyfikuj: `package.json`
- [ ] Test: [Unit] na prawdziwym repo `dist/` nie ma `PLAN.md`, `CLAUDE.md`, `research/`, `docs/`, `scripts/`, `.claude/`, `e2e/`, `tests/` ani żadnego `*.test.js`
- [ ] Test: [Unit] plik dodany do `mkdtemp` poza listą (np. `notatki.md` i `tajne/x.js`) nie trafia do katalogu wyjściowego
- [ ] Test: [Unit] graf oferty jest równy zapisanej liście 13 modułów, 4 arkuszy, 2 czcionek i ikony; test pada z nazwą pliku, gdy dojdzie nowy, żeby publiczny plik był świadomą decyzją
- [ ] Test: [Unit] każde odwołanie w `dist/oferta.html` i w plikach `dist/publiczne/` istnieje w `dist/publiczne/`; brakujący import w `mkdtemp` kończy build błędem `BLAD_PUBLIKACJI`
- [ ] Test: [Unit] w `dist/publiczne/` nie ma `src/silnik/cena.js`, `src/silnik/szybka.js`, `src/dane/wyceny.js` ani `src/dane/magazyn.js`
- [ ] Test: [Unit] `dist/index.html` jest identyczny z `index.html`, a `dist/oferta.html` ma `noindex`, tę samą politykę CSP i `<script type="module" src="publiczne/src/oferta-start.js">`
- [ ] Test: [Unit] żaden plik `dist/src/` nie zawiera `sendBeacon`, a oba pliki HTML mają `connect-src 'self'` (R3)
- [ ] Weryfikacja: `node --test scripts/publikacja/zbuduj.test.mjs` przechodzi
- [ ] Weryfikacja: `npm run publikacja` kończy się kodem 0 i tworzy `dist/index.html`
- [ ] Weryfikacja: `git check-ignore dist/index.html` zwraca ścieżkę pliku

### IU-4: Pełna pamięć offline po każdej publikacji (feature-builder-data)

- [ ] Stwórz: `scripts/publikacja/sw-publikacji.mjs`
- [ ] Modyfikuj: `scripts/publikacja/zbuduj.mjs`
- [ ] Modyfikuj: `sw.js`
- [ ] Test (unit): `scripts/publikacja/sw-publikacji.test.mjs`
- [ ] Test: [Unit] wynik uruchomiony w `node:vm` wywołuje przy `install` `addAll` z każdym plikiem `dist/`, także `src/app.js` i `publiczne/src/oferta-start.js`
- [ ] Test: [Unit] lista nie zawiera `sw.js`, `robots.txt`, `_headers` ani `_redirects`
- [ ] Test: [Unit] przy `ZAPIS_W_BIEGU = false` plik z cache wraca bez żądania do sieci, a nawigacja z sieci nic nie zapisuje; w `sw.js` z repo odświeżanie w tle działa jak dotąd
- [ ] Test: [Unit] dwa zbudowania tego samego repo dają identyczny `dist/sw.js`, a zmiana jednego bajtu w pliku aplikacji zmienia wersję
- [ ] Test: [Unit] tekst bez `WERSJA_CACHE`, bez `ZAPIS_W_BIEGU` albo z dwiema tablicami `PLIKI_STARTOWE` kończy się błędem `BLAD_PUBLIKACJI`
- [ ] Weryfikacja: `node --test scripts/publikacja/sw-publikacji.test.mjs` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi

### IU-5: Konfiguracja Cloudflare i próba katalogu w przeglądarce (feature-builder-data)

- [ ] Stwórz: `wrangler.json`
- [ ] Stwórz: `scripts/publikacja/_headers`
- [ ] Stwórz: `scripts/publikacja/_redirects`
- [ ] Modyfikuj: `scripts/publikacja/pliki.mjs`
- [ ] Modyfikuj: `scripts/publikacja/zbuduj.mjs`
- [ ] Modyfikuj: `scripts/serwer-dev.mjs`
- [ ] Test (unit): `scripts/publikacja/cloudflare.test.mjs`
- [ ] Test (unit): `scripts/serwer-dev.test.mjs`
- [ ] Test: [Unit] `wrangler.json` ma `workers_dev: false`, `preview_urls: false`, `assets.directory: ./dist`, `html_handling: none`, a nie ma `main`, `route`, `routes` ani `observability`
- [ ] Test: [Unit] `dist/_redirects` ma dokładnie jedną regułę, a `dist/start.html` jest bajtowo równy `dist/index.html`
- [ ] Test: [Unit] `dist/_headers` ma `noindex` na `/*`, `no-transform` na trzech adresach HTML i nie ma `Cache-Control` w `/*`
- [ ] Test: [Unit] każda ścieżka z `SCIEZKI_BEZ_LOGOWANIA` istnieje w `dist/`, a dla ścieżek z `*` katalog nie jest pusty
- [ ] Test: [Unit] `docs/operator/zamkniety-dostep-testy-przygotowanie.md` zawiera każdą ścieżkę z `SCIEZKI_BEZ_LOGOWANIA`, nazwę z `wrangler.json` i polecenie `node scripts/publikacja/zbuduj.mjs`
- [ ] Test: [Unit] serwer na adres `/podkatalog/` zwraca `podkatalog/index.html`, a na `/podkatalog` dalej 404
- [ ] Test: [E2E] `publikacja-oferta-bez-logowania` — uruchom `node scripts/publikacja/zbuduj.mjs`, otwórz `<E2E_URL>/dist/oferta.html#<kod z e2e/stany/oferta-po-terminie.txt>`, odczytaj `performance.getEntriesByType('resource')` i konsolę, zrób screenshot → oferta się rysuje, wszystkie pobrane pliki leżą pod `/dist/publiczne/`, konsola nie ma błędów
- [ ] Test: [E2E] `publikacja-aplikacja-offline` — usuń rejestrację workera i cache z poprzednich przebiegów, uruchom `node scripts/publikacja/zbuduj.mjs`, otwórz `<E2E_URL>/dist/index.html`, poczekaj na `navigator.serviceWorker.ready`, sprawdź w `caches`, czy jest `src/app.js` i `publiczne/src/oferta-start.js`, włącz `agent-browser set offline on`, przeładuj stronę, przejdź na `#/start`, zrób screenshot, wyłącz tryb offline → ekran Start rysuje się bez sieci, bez ekranu błędu
- [ ] Weryfikacja: `node --test scripts/publikacja/cloudflare.test.mjs` przechodzi
- [ ] Weryfikacja: `node --test scripts/serwer-dev.test.mjs` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-6: Zastrzeżenie praw i dokumentacja publikacji (feature-builder-data)

- [ ] Stwórz: `LICENSE`
- [ ] Modyfikuj: `CLAUDE.md`
- [ ] Test (unit): `scripts/publikacja/zbuduj.test.mjs`
- [ ] Test: [Unit] `LICENSE` istnieje w repo, a nie ma go w `dist/`
- [ ] Weryfikacja: `grep -c "Wszelkie prawa zastrzeżone" LICENSE` zwraca 1
- [ ] Weryfikacja: `grep -c "npm run publikacja" CLAUDE.md` zwraca co najmniej 1
- [ ] Weryfikacja: `npm test` przechodzi

## Operator checklist faza 2

- [ ] Operator: Kroki 1–8 z `docs/operator/zamkniety-dostep-testy-przygotowanie.md`, po kolei i za osobną zgodą właściciela (IU-6)
- [ ] Operator: Próba na `proba.czystyzarobek.pl`: osoba spoza listy nie wchodzi, logowanie kodem działa, link oferty otwiera się bez logowania, aplikacja działa offline i po wygaśnięciu sesji pokazuje logowanie (IU-6)
- [ ] Operator: Po przełączeniu dane z telefonu właściciela są na miejscu, `czystyzarobek.pl/PLAN.md` nie działa, repo jest prywatne, a push na `main` publikuje nową wersję (IU-6)
- [ ] Operator: Pierwsza firma z iPhone'em sprawdza logowanie w zainstalowanej aplikacji (IU-6)
