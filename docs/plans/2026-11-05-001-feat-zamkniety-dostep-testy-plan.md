---
title: "feat: Zamknięty dostęp na czas testów"
type: feat
status: active
date: 2026-11-05
origin: docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md
design_md: null
figma_spec: null
figma_screens: {}
operator_prep: docs/operator/zamkniety-dostep-testy-przygotowanie.md
---

# feat: Zamknięty dostęp na czas testów

## Przegląd

Aplikacja Czysty Zarobek przechodzi z publicznego GitHub Pages na Cloudflare za logowaniem kodem z maila, dla najwyżej 5 firm testowych. Ten plan przygotowuje kod: strona oferty przestaje ciągnąć silnik wyceny, service worker jest gotowy na logowanie i działa offline po każdej publikacji, a nowy skrypt tworzy katalog publikacji `dist/` z listy dozwolonych plików. Konfiguracja Cloudflare trafia do repo. Przenosiny DNS, ustawienia Access i przejście repo na prywatne robi właściciel po scaleniu, według `docs/operator/zamkniety-dostep-testy-przygotowanie.md`.

## Ujęcie problemu

Dziś każdy może otworzyć aplikację i pobrać `PLAN.md`, `research/` oraz `.claude/`. Właściciel chce zamkniętego dostępu już na czas testów, bo obawia się oszukania, a darmowe Pages nie ma kontroli dostępu (zob. źródło: docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md). Logowanie nie może przy tym popsuć trzech rzeczy: linków ofert u klientów firm, pracy offline i danych w `localStorage`.

## Śledzenie wymagań

- R1. Do aplikacji wchodzą tylko osoby z listy właściciela, do 5 firm, kodem z maila przez Cloudflare Access; w aplikacji nie ma kont.
- R2. Strona zostaje ukryta przed wyszukiwarkami, a link do firm idzie dopiero po zamknięciu.
- R3. Aplikacja nie zbiera danych o użyciu.
- R29. Aplikacja przechodzi z GitHub Pages na Cloudflare, a nameservery z Hostido na Cloudflare, z odtworzeniem rekordów; adres się nie zmienia, więc `localStorage` i service worker zostają.
- R30. Pod domeną są tylko pliki aplikacji; `PLAN.md`, `research/`, `docs/`, `scripts/` i `.claude/` nie są dostępne.
- R31. Repo staje się prywatne dopiero, gdy nowy hosting działa.
- R33. Linki ofert działają bez logowania; wyjątek obejmuje `oferta.html` i wszystkie pliki, których potrzebuje.
- R34. Po wygaśnięciu sesji tester z internetem widzi ekran logowania, sesja trwa do miesiąca, a offline aplikacja działa dalej z cache.
- R35. Właściciel sam dodaje i usuwa testerów; usunięty tester traci dostęp online, a dane zostają na jego telefonie.

## Granice zakresu

- Tylko etap A. Bez kont w aplikacji, triala, płatności, serwera i regulaminu (etap B rusza po warunku startu ze źródła).
- Bez zmian w modelu wyceny, w `data/` i w wyglądzie aplikacji. Ekran logowania należy do Cloudflare, więc plan nie ma makiet.
- Autopilot nie dotyka Cloudflare, DNS ani ustawień GitHuba. Te kroki robi właściciel za osobną zgodą (zob. źródło: sekcja „Zależności i założenia”).
- `CNAME` i `.nojekyll` zostają w repo do końca przenosin, bo bez nich przestałoby działać Pages. Usuwa je krok 7 checklisty.
- Bez wykrywania wygaśnięcia sesji w otwartej aplikacji: logowanie pojawia się przy następnym uruchomieniu z internetem.
- P3 `zdarzenie.waitUntil` po `respondWith` w `sw.js` (etap 5) zostaje jako znana usterka, bo nie dotyczy logowania.

## Kontekst i research

### Relevantny kod i wzorce

- `sw.js` — nawigacja najpierw z sieci (limit 4 s), reszta z cache z odświeżaniem w tle; `czyDoZapisu` zapisuje tylko odpowiedzi `200` typu `basic`, więc przekierowań nie zapisze.
- `src/pwa/sw.test.js` — `sw.js` uruchomiony w `node:vm` na atrapach; dziś nie pokrywa `install`, `activate` i `PLIKI_STARTOWE`.
- `src/oferta-start.js` — strona oferty nie rejestruje workera i nie czyta danych aplikacji; ciągnie dziś 28 modułów, w tym silnik, przez trzy importy w `src/oferta/tresc.js` i `src/oferta/kodek.js`.
- `src/dane/kwota-wyceny.js` z reeksportem w `src/dane/wyceny.js` — wzorzec małego modułu bez importów.
- `scripts/serwer-dev.mjs` i `scripts/serwer-dev.test.mjs` — wzorzec skryptu Node: eksport funkcji, `node:test`, `mkdtemp`, kody błędów w JSON na stderr.
- `src/oferta/kodek.js` — `STRONA_OFERTY = 'oferta.html'`; adres linku oferty musi zostać taki sam.

### Wiedza instytucjonalna

- Reguły indeksu „kontrakt-wspolny” dotyczą kopii i rozliczeń, nie tego obszaru.
- `docs/completed/aplikacja-modulowa/known-issues.md`: po publikacji drugi start offline może paść, bo `PLIKI_STARTOWE` nie ma modułów `src/` (P3). IU-4 to zamyka.
- `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`: moduły importujemy statycznie z grafu `app.js`, bez `import()`. W kodzie nie ma dziś żadnego `import()`.
- `.claude/scripts/e2e/serwer.mjs` startuje na Windows bez powłoki, więc `E2E_START` nie może mieć `&&`. Wyjście `agent-browser` kieruj do pliku. Worker podaje stare moduły między przebiegami.

### Referencje zewnętrzne

- Workers Static Assets: [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [headers](https://developers.cloudflare.com/workers/static-assets/headers/), [kod asset workera](https://github.com/cloudflare/workers-sdk/blob/main/packages/workers-shared/asset-worker/src/handler.ts).
- Access: [ścieżki](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/), [sesje](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/), [limity](https://developers.cloudflare.com/cloudflare-one/account-limits/#access).
- Przeglądarka: [aktualizacja service workera](https://w3c.github.io/ServiceWorker/#update-algorithm), [manifest i poświadczenia](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest).
- Regulaminy: [umowa Cloudflare](https://www.cloudflare.com/terms/), [Developer Platform](https://www.cloudflare.com/service-specific-terms-developer-platform/), [Zero Trust](https://www.cloudflare.com/service-specific-terms-zero-trust-services/).

## Kluczowe decyzje techniczne

- Hosting to Workers Static Assets bez skryptu Workera: pasuje do statycznych plików, a źródło zakłada Workers Free. Skrypt Workera dałby limit żądań z odpowiedzią 429 i wyłączyłby `_headers`.
- `html_handling: "none"`: inne tryby przekierowują `/oferta.html` kodem 307 na `/oferta`, a przekierowana odpowiedź w cache psuje nawigację offline. W trybie `none` adres `/` daje 404, więc obsługuje go reguła `/ /start.html 200`.
- Reguła wskazuje kopię `start.html`, nie `index.html`: reguła `/ /index.html 200` przechodzi w parserze, ale nie wiadomo, czy przyjmie ją API przy publikacji. Kopia działa w obu wersjach i kosztuje jeden plik.
- Katalog `dist/` z listy dozwolonych plików zamiast listy zakazanych: nowy plik w repo domyślnie nie trafia pod domenę (R30). Aplikacja dalej nie ma kompilacji, publikacja tylko kopiuje i wstawia listę plików.
- Pliki oferty idą do `dist/publiczne/`, a `dist/oferta.html` dostaje przepisane ścieżki: Access potrzebuje wtedy dwóch ścieżek zamiast dwudziestu, a nowy import oferty nie psuje linków u klientów, bo skrypt liczy graf przy każdej publikacji.
- Oferta bez silnika wyceny (28 → 13 modułów): pliki oferty muszą być publiczne (R33), a właściciel obawia się kopiowania. Odcięcie to trzy małe przenosiny.
- Bez logowania: `/oferta.html`, `/publiczne/*`, `/sw.js`, `/manifest.webmanifest`, `/ikony/*`, `/robots.txt`. Manifest idzie domyślnie bez ciasteczka, a ikony do instalacji na Androidzie też. `sw.js` zostaje publiczny zgodnie ze źródłem, bo odpowiedź 302 przerywa aktualizację. Zwykła aktualizacja i tak czeka na logowanie, bo `addAll` pobiera chronione pliki. Publiczny `sw.js` daje jednak drogę awaryjną: worker bez `addAll` chronionych plików i bez kasowania cache dojdzie też do osoby z wygasłą sesją. Publiczne są wtedy nazwy plików, nie ich treść.
- `crossorigin="use-credentials"` na manifeście zostaje jako drugi bezpiecznik, gdyby wyjątek w Access był źle ustawiony.
- Service worker pomija `/cdn-cgi/`: inaczej przy wolnej sieci powrót z logowania dostałby `index.html` z cache pod adresem `/cdn-cgi/access/authorized`.
- Wersja cache z hasza zawartości i pełna lista plików w `dist/sw.js`: nowa wersja instaluje się w całości albo wcale. `addAll` przy wygasłej sesji odrzuca instalację, a stary worker działa dalej.
- Opublikowany worker zapisuje do cache tylko przy instalacji: odświeżanie w tle dopisywałoby nowe pliki do starego cache, a po nieudanym `addAll` start offline dostałby mieszankę modułów. Praca lokalna i GitHub Pages zostają przy odświeżaniu w tle, bo mają krótką listę plików.
- Publikacja przez Workers Builds z pushu na `main`: zachowuje dzisiejszy przepływ, działa z prywatnym repo i nie wymaga sekretów w repo.
- `wrangler` bez wpisu w `package.json`: build potrzebuje tylko Node, a wersję przypina polecenie `npx wrangler@4.158.0 deploy`. Bez nowej zależności nie ma ryzyka błędu `npm ci` z innym npm.
- Bez `routes` w `wrangler.json`: wrangler w CI bez pytania nadpisuje konflikty DNS, więc pierwszy build przejąłby główny adres przed ustawieniem Access. Domenę dodaje właściciel w panelu.
- `workers_dev: false` i `preview_urls: false`: adresy `*.workers.dev` nie są chronione przez Access na domenie.

## Rejestr stałych

| Stała | Wartość | Plik | IU-źródło | Konsumenci |
|---|---|---|---|---|
| `TRYBY_SZYBKIEJ` | `['widelki', 'ok', 'od']` | `src/silnik/tryby-szybkiej.js` | IU-1 | IU-1 |
| `KATALOG_PUBLIKACJI` | `'dist'` | `scripts/publikacja/pliki.mjs` | IU-3 | IU-3, IU-4, IU-5 |
| `PREFIKS_OFERTY` | `'publiczne'` | `scripts/publikacja/pliki.mjs` | IU-3 | IU-3, IU-5 |
| `SCIEZKI_BEZ_LOGOWANIA` | `['/oferta.html', '/publiczne/*', '/sw.js', '/manifest.webmanifest', '/ikony/*', '/robots.txt']` | `scripts/publikacja/pliki.mjs` | IU-5 | IU-5 |

## Otwarte pytania

### Rozwiązane podczas planowania

- Poczta na domenie: właściciel jej nie używa (2026-11-05). Rekordy MX, `mail`, SPF, DMARC i DKIM przenosimy bez zmian, bez testu poczty.
- Regulamin Cloudflare: zakazu użycia komercyjnego na planie Free nie znaleziono, a warunki Developer Platform dopuszczają hosting treści. Testy bez opłat nie są odsprzedażą Access. To odczyt tekstu, nie porada prawna.
- Publikacja z prywatnego repo: Workers Builds po pushu na `main`.
- Wyjątki Access i poprawki aplikacji: zob. „Kluczowe decyzje techniczne”.
- Czas sesji: 1 miesiąc w ustawieniu globalnym i w aplikacji Access, bo domyślnie obie mają 24 h.
- Prawa (R1): właściciel wybrał oba elementy, plik `LICENSE` w repo i ustalenie z testerami. Tekst ustalenia jest w checkliście operatora.

### Odroczone do implementacji

- Dokładna liczba plików w `dist/` i lista grafu oferty: test zapisuje wynik pomiaru. Przewidywane 13 modułów, 4 arkusze, 2 czcionki i 1 ikona.
- Czy `/`, `dist/start.html`, `_headers` i wyłączone adresy `workers.dev` działają tak, jak wynika z dokumentacji i kodu: potwierdza krok 5 checklisty na adresie próbnym, bo lokalnie nie ma Access ani API Cloudflare.
- Logowanie w zainstalowanej aplikacji na iPhonie: sprawdzi pierwsza firma testowa (ryzyko przyjęte w źródle).

## Wymagania wstępne operatora

Autopilot nie potrzebuje niczego od operatora. Przenosiny robi właściciel po scaleniu, według [checklisty](../operator/zamkniety-dostep-testy-przygotowanie.md).

## Implementation Units

### Faza 1 — Aplikacja gotowa na logowanie

**Zależy od:** Brak

- [x] **IU-1: Strona oferty bez silnika wyceny**

**Cel:** Graf modułów `oferta.html` przestaje obejmować `src/dane/wyceny.js`, `src/dane/magazyn.js` i `src/silnik/szybka.js`, bez zmiany zachowania.

**Wymagania:** R33, R30

**Zależności:** Brak

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/silnik/tryby-szybkiej.js` | 0 → 3 | — | nowy |
| Modyfikuj | `src/silnik/szybka.js` | 161 → 161 | — | zostaje |
| Modyfikuj | `src/silnik/vat.js` | 34 → 44 | — | zostaje |
| Modyfikuj | `src/dane/magazyn.js` | 154 → 146 | — | zostaje |
| Modyfikuj | `src/oferta/tresc.js` | 143 → 143 | — | zostaje |
| Modyfikuj | `src/oferta/kodek.js` | 128 → 128 | — | zostaje |
| Test (unit) | `src/silnik/vat.test.js` | 48 → 58 | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `src/oferta/tresc.js` importuje `czyAbonament` wprost z `src/dane/kwota-wyceny.js`, bo definicja już tam jest.
- `TRYBY_SZYBKIEJ = Object.freeze(['widelki', 'ok', 'od'])` przechodzi do nowego modułu bez importów `src/silnik/tryby-szybkiej.js` (to źródło stałej). `src/silnik/szybka.js` eksportuje dalej tę samą nazwę, więc `src/dane/wyceny.js` i testy zostają bez zmian. `src/oferta/tresc.js` importuje z nowego modułu. Moduł zostaje w `src/silnik`, bo silnik nie importuje z `src/dane`.
- `jestStatusemVat` przechodzi z `src/dane/magazyn.js` do `src/silnik/vat.js`, obok `sprawdzStatusVat`. `src/dane/magazyn.js` używa jej dalej i eksportuje ją dalej, więc `src/dane/ustawienia.js` i test w `src/dane/magazyn.test.js` zostają bez zmian. `src/oferta/kodek.js` importuje z `src/silnik/vat.js`.
- Po zmianie graf `src/oferta-start.js` to 13 modułów: `src/oferta-start.js`, `src/oferta/kodek.js`, `src/oferta/tresc.js`, `src/widoki/oferta-klient.js`, `src/ui/format.js`, `src/ui/h.js`, `src/ui/ikony.js`, `src/dane/ksztalt.js`, `src/dane/kwota-wyceny.js`, `src/kalendarz/daty.js`, `src/silnik/bledy.js`, `src/silnik/vat.js`, `src/silnik/tryby-szybkiej.js`.

**Wzorce do naśladowania:**
- `src/dane/kwota-wyceny.js` i reeksport w `src/dane/wyceny.js`

**Scenariusze testowe:**
- [Unit] `jestStatusemVat` z `src/silnik/vat.js` daje `true` dla `czynny` i `zwolniony`, a `false` dla innego tekstu, liczby i `undefined`
- [Unit] istniejące testy `src/oferta/tresc.test.js`, `src/oferta/kodek.test.js` i `src/silnik/szybka.test.js` przechodzą bez zmian

**Weryfikacja:**
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów
- `grep -E "dane/wyceny|dane/magazyn|silnik/szybka" src/oferta/tresc.js src/oferta/kodek.js` nic nie znajduje
  - Korekta po fazie 1 (2026-11-09): ten grep trafia w typy JSDoc `@typedef {import(...)}` w `src/oferta/tresc.js` (linie 13–17), których przeglądarka nie ładuje. Sprawdzian grafu modułów to `grep -nE "^(import|export) .*(dane/wyceny|dane/magazyn|silnik/szybka)" src/oferta/tresc.js src/oferta/kodek.js`, który nic nie znajduje.

- [x] **IU-2: Service worker i manifest przy logowaniu**

**Cel:** Powrót z logowania omija service workera, przekierowanie na logowanie przechodzi do przeglądarki, a manifest nie zależy od wyjątku w Access.

**Wymagania:** R34

**Zależności:** Brak

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `sw.js` | 104 → 108 | — | zostaje |
| Modyfikuj | `index.html` | 34 → 34 | — | zostaje |
| Test (unit) | `src/pwa/sw.test.js` | 161 → 235 | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- W obsłudze `fetch` żądanie, którego ścieżka zaczyna się od `/cdn-cgi/`, wraca bez `respondWith`, tak jak żądania spoza originu. Prefiks to stała w `sw.js`. Powód: przy wolnej sieci limit 4 s dałby `index.html` z cache pod adresem `/cdn-cgi/access/authorized`, a ścieżki względne by się rozjechały.
- Logika nawigacji się nie zmienia. Testy mają ją zamknąć: odpowiedź typu `opaqueredirect` ze statusem 0 idzie do `respondWith`, a `czyDoZapisu` jej nie zapisuje.
- `<link rel="manifest">` w `index.html` dostaje `crossorigin="use-credentials"`, bo przeglądarki bez tego atrybutu pobierają manifest bez ciasteczka.
- Atrapa w `src/pwa/sw.test.js` potrzebuje `addAll`, `keys` i `delete` oraz zamiennika `Request`, bo `Request` z Node nie przyjmuje adresów względnych.

**Notatka wykonawcza:** Characterization-first: najpierw testy `install`, `activate` i przekierowania na obecnym kodzie, potem wyjątek `/cdn-cgi/`.

**Wzorce do naśladowania:**
- `src/pwa/sw.test.js`, test „żądania spoza originu i inne niż GET przechodzą bez service workera”

**Scenariusze testowe:**
- [Unit] nawigacja na `/cdn-cgi/access/authorized?kod=1` i zasób spod `/cdn-cgi/` nie wywołują `respondWith`
- [Unit] nawigacja, na którą sieć odpowiada `opaqueredirect` ze statusem 0, zwraca tę odpowiedź, a cache zostaje pusty
- [Unit] plik z cache przy odrzuconym odświeżeniu (przekierowanie modułu kończy się `TypeError`) zwraca kopię z cache i zgłasza `sw_odswiezenie`
- [Unit] `install` przekazuje `addAll` wszystkie `PLIKI_STARTOWE` z `cache: 'reload'`, a odrzucone `addAll` odrzuca obietnicę z `waitUntil`
- [Unit] `activate` usuwa cache o innej nazwie i zostawia bieżący

**Weryfikacja:**
- `node --test src/pwa/sw.test.js` przechodzi
- `grep -c 'rel="manifest" href="manifest.webmanifest" crossorigin="use-credentials"' index.html` zwraca 1

### Faza 2 — Katalog publikacji

**Zależy od:** Faza 1

- [ ] **IU-3: Katalog publikacji z listy dozwolonych plików**

**Cel:** Skrypt tworzy `dist/` wyłącznie z plików aplikacji i osobny katalog `dist/publiczne/` z tym, czego potrzebuje strona oferty.

**Wymagania:** R30, R33, R2, R3

**Zależności:** IU-1

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `scripts/publikacja/pliki.mjs` | 0 → 90 | — | nowy |
| Stwórz | `scripts/publikacja/zbuduj.mjs` | 0 → 100 | — | nowy |
| Test (unit) | `scripts/publikacja/zbuduj.test.mjs` | 0 → 170 | — | nowy |
| Modyfikuj | `.gitignore` | 17 → 18 | — | zostaje |
| Modyfikuj | `package.json` | 18 → 19 | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `scripts/publikacja/pliki.mjs` (źródło `KATALOG_PUBLIKACJI = 'dist'` i `PREFIKS_OFERTY = 'publiczne'`) trzyma listę dozwolonych plików i liczy graf oferty. `scripts/publikacja/zbuduj.mjs` eksportuje `zbuduj(korzen, katalogWyjsciowy)`, działa też z wiersza poleceń i dostaje skrypt `npm run publikacja`.
- Lista dozwolonych: `index.html`, `oferta.html`, `sw.js`, `manifest.webmanifest`, `robots.txt`, `data/*.json`, `fonty/*.woff2`, `fonty/OFL.txt` (licencja czcionek wymaga dołączenia), `ikony/*`, `src/**/*.js` bez `*.test.js`, `src/**/*.css`. Skrypt bez zależności, tylko Node.
- Graf oferty zaczyna się od `oferta.html`: atrybuty `href` i `src`, statyczne `import … from` i `export … from` na początku linii (bez `@typedef {import(…)}` z komentarzy), `url(…)` w CSS. Pliki grafu trafiają do `dist/publiczne/` pod tą samą ścieżką względną, więc importy i `../../fonty/…` działają bez zmian.
- `dist/oferta.html` dostaje prefiks `publiczne/` w każdym względnym `href` i `src`. `oferta.html` w repo się nie zmienia, a adres strony zostaje `oferta.html`, bo linki ofert są już u klientów.
- Przed zapisem skrypt czyści tylko katalog wyjściowy. Po zapisie sprawdza wynik i przerywa z kodem wyjścia różnym od 0, gdy w katalogu jest plik `.md`, `.csv`, `.ps1`, `.pl`, `.mjs`, `*.test.js` albo katalog `docs`, `research`, `scripts`, `e2e`, `tests`, `.claude`, `node_modules`, oraz gdy odwołanie w `dist/publiczne/` lub `dist/oferta.html` prowadzi poza `dist/publiczne/` albo do brakującego pliku. Błąd idzie na stderr jako JSON z kodem `BLAD_PUBLIKACJI`, jak w `scripts/serwer-dev.mjs`. Nieudany build nie dochodzi do wdrożenia.
- `.gitignore` dostaje `dist/`.

**Notatka wykonawcza:** Test-first dla zamknięcia grafu i listy dozwolonych plików, bo to one chronią R30 i R33.

**Wzorce do naśladowania:**
- `scripts/serwer-dev.mjs`, `scripts/serwer-dev.test.mjs`

**Scenariusze testowe:**
- [Unit] na prawdziwym repo `dist/` nie ma `PLAN.md`, `CLAUDE.md`, `research/`, `docs/`, `scripts/`, `.claude/`, `e2e/`, `tests/` ani żadnego `*.test.js`
- [Unit] plik dodany do `mkdtemp` poza listą (np. `notatki.md` i `tajne/x.js`) nie trafia do katalogu wyjściowego
- [Unit] graf oferty jest równy zapisanej liście 13 modułów, 4 arkuszy, 2 czcionek i ikony; test pada z nazwą pliku, gdy dojdzie nowy, żeby publiczny plik był świadomą decyzją
- [Unit] każde odwołanie w `dist/oferta.html` i w plikach `dist/publiczne/` istnieje w `dist/publiczne/`; brakujący import w `mkdtemp` kończy build błędem `BLAD_PUBLIKACJI`
- [Unit] w `dist/publiczne/` nie ma `src/silnik/cena.js`, `src/silnik/szybka.js`, `src/dane/wyceny.js` ani `src/dane/magazyn.js`
- [Unit] `dist/index.html` jest identyczny z `index.html`, a `dist/oferta.html` ma `noindex`, tę samą politykę CSP i `<script type="module" src="publiczne/src/oferta-start.js">`
- [Unit] żaden plik `dist/src/` nie zawiera `sendBeacon`, a oba pliki HTML mają `connect-src 'self'` (R3)

**Weryfikacja:**
- `node --test scripts/publikacja/zbuduj.test.mjs` przechodzi
- `npm run publikacja` kończy się kodem 0 i tworzy `dist/index.html`
- `git check-ignore dist/index.html` zwraca ścieżkę pliku

- [ ] **IU-4: Pełna pamięć offline po każdej publikacji**

**Cel:** `dist/sw.js` ma pełną listę plików i wersję z hasza zawartości, więc po publikacji aplikacja startuje offline w całości nowa albo w całości stara.

**Wymagania:** R34

**Zależności:** IU-2, IU-3

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `scripts/publikacja/sw-publikacji.mjs` | 0 → 45 | — | nowy |
| Modyfikuj | `scripts/publikacja/zbuduj.mjs` | 100 → 110 | — | zostaje |
| Modyfikuj | `sw.js` | 108 → 114 | — | zostaje |
| Test (unit) | `scripts/publikacja/sw-publikacji.test.mjs` | 0 → 120 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `scripts/publikacja/sw-publikacji.mjs` eksportuje funkcję, która z tekstu `sw.js`, listy plików i wersji robi tekst `dist/sw.js`. Podmienia dokładnie jedną stałą `WERSJA_CACHE`, jedną tablicę `PLIKI_STARTOWE` i jedną stałą `ZAPIS_W_BIEGU`; przy innej liczbie dopasowań przerywa błędem `BLAD_PUBLIKACJI`.
- Lista to `./` i każdy plik `dist/` (z `dist/publiczne/` włącznie) poza `sw.js`, `robots.txt` oraz plikami konfiguracji Cloudflare. Ścieżki względne, z ukośnikami, posortowane.
- Wersja to `czysty-zarobek-` i 12 znaków SHA-256 z posortowanych par ścieżka i zawartość, więc ta sama zawartość daje tę samą wersję, a `sw.js` zmienia się tylko przy zmianie plików. Pierwsza taka wersja usuwa przy aktywacji stary cache `czysty-zarobek-v1`; `localStorage` zostaje nietknięty.
- Nowa stała `ZAPIS_W_BIEGU` w `sw.js`: w repo `true`, w `dist/sw.js` `false`. Przy `false` `czyDoZapisu` zawsze odmawia, a `cachePotemSiec` zwraca plik z cache bez odświeżania w tle. Cache zmienia wtedy tylko `install`, więc po nieudanym `addAll` stary cache zostaje nietknięty i spójny.
- `sw.js` w repo działa dalej z krótką listą i odświeżaniem w tle, do pracy lokalnej i na GitHub Pages. Komentarz na początku pliku mówi, że publikacja podmienia te trzy stałe.
- `addAll` zostaje atomowe: nieudana instalacja zostawia starego workera i stary cache w całości.

**Wzorce do naśladowania:**
- `src/pwa/sw.test.js` (uruchamianie kodu workera w `node:vm`)

**Scenariusze testowe:**
- [Unit] wynik uruchomiony w `node:vm` wywołuje przy `install` `addAll` z każdym plikiem `dist/`, także `src/app.js` i `publiczne/src/oferta-start.js`
- [Unit] lista nie zawiera `sw.js`, `robots.txt`, `_headers` ani `_redirects`
- [Unit] przy `ZAPIS_W_BIEGU = false` plik z cache wraca bez żądania do sieci, a nawigacja z sieci nic nie zapisuje; w `sw.js` z repo odświeżanie w tle działa jak dotąd
- [Unit] dwa zbudowania tego samego repo dają identyczny `dist/sw.js`, a zmiana jednego bajtu w pliku aplikacji zmienia wersję
- [Unit] tekst bez `WERSJA_CACHE`, bez `ZAPIS_W_BIEGU` albo z dwiema tablicami `PLIKI_STARTOWE` kończy się błędem `BLAD_PUBLIKACJI`

**Weryfikacja:**
- `node --test scripts/publikacja/sw-publikacji.test.mjs` przechodzi
- `npm test` przechodzi

- [ ] **IU-5: Konfiguracja Cloudflare i próba katalogu w przeglądarce**

**Cel:** Repo zawiera konfigurację publikacji, a katalog `dist/` jest sprawdzony w prawdziwej przeglądarce.

**Wymagania:** R2, R3, R30, R33, R34

**Zależności:** IU-3, IU-4

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `wrangler.json` | — → — | — | nowy |
| Stwórz | `scripts/publikacja/_headers` | — → — | — | nowy |
| Stwórz | `scripts/publikacja/_redirects` | — → — | — | nowy |
| Modyfikuj | `scripts/publikacja/pliki.mjs` | 90 → 100 | — | zostaje |
| Modyfikuj | `scripts/publikacja/zbuduj.mjs` | 110 → 120 | — | zostaje |
| Modyfikuj | `scripts/serwer-dev.mjs` | 92 → 93 | — | zostaje |
| Test (unit) | `scripts/publikacja/cloudflare.test.mjs` | 0 → 110 | — | nowy |
| Test (unit) | `scripts/serwer-dev.test.mjs` | 102 → 112 | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `wrangler.json`: `name` = `czysty-zarobek`, `compatibility_date` = `2026-11-05`, `workers_dev` = `false`, `preview_urls` = `false`, `assets.directory` = `./dist`, `assets.html_handling` = `none`. Bez `main`, bez `route` i `routes`, bez `observability`. Powody: adresy `*.workers.dev` omijają Access, a wrangler w CI bez pytania przejmuje domenę z `routes`.
- `_redirects` ma jedną regułę `/ /start.html 200`, bo przy `html_handling: none` adres `/` daje 404. Skrypt kopiuje `index.html` do `dist/start.html` bez zmian. `dist/sw.js` nie ma `start.html` na liście, a `./` zostaje.
- `_headers`: `/*` dostaje `X-Robots-Tag: noindex, nofollow`. Wpisy `/`, `/index.html` i `/oferta.html` dostają `Cache-Control: public, max-age=0, must-revalidate, no-transform`, bo `no-transform` blokuje doklejanie skryptów Cloudflare do HTML. `Cache-Control` nie może być w `/*`, bo pasujące reguły łączą się przecinkiem, a `no-transform` na reszcie wyłączyłby kompresję.
- Skrypt kopiuje `_headers` i `_redirects` do `dist/`, a sprawdzenie z IU-3 je dopuszcza.
- `SCIEZKI_BEZ_LOGOWANIA = ['/oferta.html', '/publiczne/*', '/sw.js', '/manifest.webmanifest', '/ikony/*', '/robots.txt']` w `scripts/publikacja/pliki.mjs` (to źródło stałej). Test porównuje ją z katalogiem i z checklistą operatora.
- `scripts/serwer-dev.mjs`: adres kończący się `/` serwuje `index.html` z tego katalogu, bo instalacja workera w `dist/` pobiera `./`, a dziś dostałaby 404. Pozostałe zachowania bez zmian.
- `.env.e2e` zostaje bez zmian: scenariusze budują katalog i otwierają go pod `/dist/` na tym samym serwerze.

**Wzorce do naśladowania:**
- `scripts/serwer-dev.test.mjs`

**Scenariusze testowe:**
- [Unit] `wrangler.json` ma `workers_dev: false`, `preview_urls: false`, `assets.directory: ./dist`, `html_handling: none`, a nie ma `main`, `route`, `routes` ani `observability`
- [Unit] `dist/_redirects` ma dokładnie jedną regułę, a `dist/start.html` jest bajtowo równy `dist/index.html`
- [Unit] `dist/_headers` ma `noindex` na `/*`, `no-transform` na trzech adresach HTML i nie ma `Cache-Control` w `/*`
- [Unit] każda ścieżka z `SCIEZKI_BEZ_LOGOWANIA` istnieje w `dist/`, a dla ścieżek z `*` katalog nie jest pusty
- [Unit] `docs/operator/zamkniety-dostep-testy-przygotowanie.md` zawiera każdą ścieżkę z `SCIEZKI_BEZ_LOGOWANIA`, nazwę z `wrangler.json` i polecenie `node scripts/publikacja/zbuduj.mjs`
- [Unit] serwer na adres `/podkatalog/` zwraca `podkatalog/index.html`, a na `/podkatalog` dalej 404
- [E2E] `publikacja-oferta-bez-logowania` — uruchom `node scripts/publikacja/zbuduj.mjs`, otwórz `<E2E_URL>/dist/oferta.html#<kod z e2e/stany/oferta-po-terminie.txt>`, odczytaj `performance.getEntriesByType('resource')` i konsolę, zrób screenshot → oferta się rysuje, wszystkie pobrane pliki leżą pod `/dist/publiczne/`, konsola nie ma błędów
- [E2E] `publikacja-aplikacja-offline` — usuń rejestrację workera i cache z poprzednich przebiegów, uruchom `node scripts/publikacja/zbuduj.mjs`, otwórz `<E2E_URL>/dist/index.html`, poczekaj na `navigator.serviceWorker.ready`, sprawdź w `caches`, czy jest `src/app.js` i `publiczne/src/oferta-start.js`, włącz `agent-browser set offline on`, przeładuj stronę, przejdź na `#/start`, zrób screenshot, wyłącz tryb offline → ekran Start rysuje się bez sieci, bez ekranu błędu

**Weryfikacja:**
- `node --test scripts/publikacja/cloudflare.test.mjs` przechodzi
- `node --test scripts/serwer-dev.test.mjs` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-6: Zastrzeżenie praw i dokumentacja publikacji**

**Cel:** Repo ma zastrzeżenie praw, a `CLAUDE.md` opisuje nowy sposób publikacji i to, co zostaje do przenosin.

**Wymagania:** R1, R29, R31, R35

**Zależności:** IU-5

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `LICENSE` | — → — | — | nowy |
| Modyfikuj | `CLAUDE.md` | — → — | — | zostaje |
| Test (unit) | `scripts/publikacja/zbuduj.test.mjs` | 170 → 175 | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `LICENSE` ma dosłownie tekst z „Teksty (verbatim)”. Nie trafia do `dist/`.
- `CLAUDE.md`: akapit „Projekt” wymienia `scripts/publikacja/`, `dist/` i `wrangler.json`. Sekcja „Środowisko i polecenia” opisuje `npm run publikacja` i zdanie, że aplikacja nie ma kompilacji, a publikacja tylko kopiuje wybrane pliki i wstawia listę do `dist/sw.js`. Dopisz regułę: nowy plik oferty pada w teście grafu, nowy katalog aplikacji trzeba dodać do listy w `scripts/publikacja/pliki.mjs`, a zmiana ścieżek bez logowania wymaga zmiany w Access. Sekcja „Repozytorium” mówi, że do końca przenosin repo jest publiczne, a `main` publikuje GitHub Pages; szczegóły są w `docs/operator/zamkniety-dostep-testy-przygotowanie.md`.

**Teksty (verbatim):**
- `LICENSE`, wiersz 1: „Copyright © 2026 simpleperfection. Wszelkie prawa zastrzeżone.”
- `LICENSE`, wiersz 3: „Kod, dane i pozostałe pliki tego repozytorium nie są udostępniane na żadnej licencji otwartej. Bez pisemnej zgody autora nie wolno ich kopiować, rozpowszechniać ani wykorzystywać.”
- `LICENSE`, wiersz 5: „Wyjątek: czcionki w katalogu fonty/ podlegają licencji SIL Open Font License (fonty/OFL.txt).”

**Wzorce do naśladowania:**
- Sekcje `CLAUDE.md` z opisem poleceń

**Scenariusze testowe:**
- [Unit] `LICENSE` istnieje w repo, a nie ma go w `dist/`

**Weryfikacja:**
- `grep -c "Wszelkie prawa zastrzeżone" LICENSE` zwraca 1
- `grep -c "npm run publikacja" CLAUDE.md` zwraca co najmniej 1
- `npm test` przechodzi

**Operator checklist:**
- [ ] Kroki 1–8 z `docs/operator/zamkniety-dostep-testy-przygotowanie.md`, po kolei i za osobną zgodą właściciela
- [ ] Próba na `proba.czystyzarobek.pl`: osoba spoza listy nie wchodzi, logowanie kodem działa, link oferty otwiera się bez logowania, aplikacja działa offline i po wygaśnięciu sesji pokazuje logowanie
- [ ] Po przełączeniu dane z telefonu właściciela są na miejscu, `czystyzarobek.pl/PLAN.md` nie działa, repo jest prywatne, a push na `main` publikuje nową wersję
- [ ] Pierwsza firma z iPhone'em sprawdza logowanie w zainstalowanej aplikacji

## Wpływ systemowy

- **Graf interakcji:** nowy skrypt czyta `sw.js`, `index.html`, `oferta.html` i CSS. Zmiana nazw `WERSJA_CACHE` albo `PLIKI_STARTOWE` kończy build błędem, a nie cichym brakiem listy.
- **Propagacja błędów:** błąd w `dist/` zatrzymuje build, więc w Cloudflare zostaje poprzednia wersja. Nieudana instalacja workera zostawia poprzedni cache.
- **Cykl życia stanu:** `localStorage` zależy tylko od adresu, a ten się nie zmienia. Pierwsza wersja z Cloudflare wymienia cache plików, nie dane.
- **Przepływ pracy:** praca lokalna i E2E dalej działają z katalogu repo. `dist/` powstaje tylko do publikacji i prób.
- **Pokrycie integracyjne:** testy i E2E sprawdzają katalog, ale nie Access ani API Cloudflare. To sprawdza próba na adresie `proba.czystyzarobek.pl` przed przełączeniem.

## Ryzyka i zależności

- **Kod scalony do `main` publikuje się najpierw na GitHub Pages.** Zmiany w `sw.js`, `index.html` i modułach działają na obu hostingach, a `wrangler.json` i `LICENSE` są tam tylko zwykłymi plikami. To celowe: telefon właściciela dostaje poprawionego workera przed przenosinami.
- **Długa lista w `addAll` na słabym łączu:** jeden nieudany plik przerywa instalację, a pierwsza instalacja bez starego workera oznacza brak trybu offline do następnego uruchomienia. Przyjmujemy to, bo częściowy cache psuje start offline gorzej.
- **`sw.js` publiczny odsłania nazwy plików aplikacji,** ale nie ich treść. Nazwy i tak były w publicznym repo.
- **Pliki oferty są publiczne z konieczności:** 13 modułów, w tym `src/silnik/vat.js`. Silnik wyceny zostaje za logowaniem.
- **Dane płatnicze:** Zero Trust wymaga ich także na planie Free. Bez ich podania nie ma Access.
- **Cloudflare widzi ruch** i może zakończyć darmową usługę. Na testy to akceptowalne.
- **iPhone niesprawdzony:** ryzyko przyjęte w źródle. Checklista sprawdza to pierwszego dnia, zanim firma wpisze dane, i ma plan B.
- **Nie widać, którą wersję ma telefon:** aplikacja nie pokazuje wersji, a R3 wyklucza telemetrię. Na czas testów wystarcza porównanie nazwy cache w przeglądarce na komputerze z próby w checkliście.

## Dokumentacja / Notatki operacyjne

- `docs/operator/zamkniety-dostep-testy-przygotowanie.md` to pełna lista przenosin, wycofania, dodawania i usuwania testerów oraz wiadomość do firm z ustaleniem.
- Do etapu B przechodzą dwa zapisy regulaminu Cloudflare: §2.2 warunków Zero Trust zakazuje odsprzedaży Access (R36 i tak go usuwa), a §2.2.1(h) umowy zakazuje zbierania danych kart na stronie korzystającej z darmowych usług.
- Po przenosinach trzeba uzupełnić `PLAN.md` (wiersze o hostingu, etap 6a) i `CLAUDE.md` (sekcja „Repozytorium”).

## Źródła i referencje

- **Dokument źródłowy:** docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md
- Powiązany kod: `sw.js`, `src/oferta-start.js`, `src/oferta/kodek.js`, `scripts/serwer-dev.mjs`
- Znane problemy: `docs/completed/aplikacja-modulowa/known-issues.md`
