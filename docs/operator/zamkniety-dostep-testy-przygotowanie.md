---
feature_slug: zamkniety-dostep-testy
origin: docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md
utworzono: 2026-11-05
dotyka_ui: false
status: do-zrobienia
---

# Zamknięty dostęp na czas testów: przenosiny krok po kroku

Plan: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md` · Utworzono: 2026-11-05
Status: **do zrobienia po scaleniu kodu** — odhaczaj `[ ]` → `[x]`.

Autopilot przygotowuje tylko kod. Ta lista to wszystko, co dzieje się poza repo: Cloudflare, DNS, GitHub i firmy testowe. Nic tu nie blokuje autopilota. Kroki rób po kolei, bo kolejność chroni dane z telefonu i dostęp do strony. Hasła i dane płatnicze wpisujesz sam. Każda zmiana w DNS, Cloudflare i na GitHubie wymaga Twojej zgody, także wtedy, gdy prowadzi Cię Claude.

Fakty o domenie sprawdzono 2026-11-05, a dokumentację Cloudflare tego samego dnia. Ekrany panelu mogą się nazywać trochę inaczej.

## Wartości do wpisania

| Co | Wartość |
|---|---|
| Nazwa Workera | `czysty-zarobek` (musi być taka sama jak `name` w `wrangler.json`) |
| Build command | `node scripts/publikacja/zbuduj.mjs` |
| Deploy command | `npx wrangler@4.158.0 deploy` |
| Zmienna buildu | `SKIP_DEPENDENCY_INSTALL` = `1` |
| Adres próbny | `proba.czystyzarobek.pl` |
| Ścieżki bez logowania | `/oferta.html`, `/publiczne/*`, `/sw.js`, `/manifest.webmanifest`, `/ikony/*`, `/robots.txt` |

## 1. Przed przenosinami

- [x] **Scal kod do `main`** i sprawdź, czy https://czystyzarobek.pl działa jak dotąd. (2026-11-11: PR #5, `fc5c6e2`; strona wstaje bez błędów w przeglądarce na komputerze i serwuje nowy `sw.js`)
  - Po co: GitHub Pages opublikuje poprawiony `sw.js`, zanim domena pójdzie na Cloudflare.
- [x] **Na telefonie otwórz aplikację dwa razy z internetem, z przerwą między otwarciami.** (2026-11-11, wg właściciela)
  - Po co: telefon dostaje nowy `sw.js` przed logowaniem. Stary mógłby pokazać złą stronę przy powrocie z logowania.
- [x] **Zrób kopię danych do pliku** w aplikacji na telefonie i zachowaj plik poza telefonem. (2026-11-11, wg właściciela)
  - Po co: adres się nie zmienia, więc dane powinny zostać. Kopia jest na wypadek błędu.

## 2. Domena w Cloudflare

- [ ] **Załóż konto Cloudflare** na swój adres. Nie zakładaj kont w imieniu firm, bo zakazuje tego regulamin Cloudflare.
- [x] **Zapisz listę rekordów strefy z panelu Hostido** (zrzut ekranu albo skopiowana tabela; baza wiedzy Hostido nie opisuje przycisku eksportu). (2026-11-11: 19 rekordów, w tym 3 NS Hostido, których nie przenosimy; pozostałe 16 zgadza się z publicznym DNS i tabelą niżej, TTL 3600) Wejście: https://klient.hostido.pl/ → „Twoje usługi” → „Twoje domeny” → „Opcje” → „Zarządzaj” → „Zarządzanie DNS” → „Zarządzaj strefą DNS” → „Zarządzaj”, a po przekierowaniu „Domeny” → „Zarządzanie DNS”. Ta lista jest źródłem prawdy, a tabela niżej to tylko to, co widać z zewnątrz.
- [x] **Dodaj domenę `czystyzarobek.pl` w Cloudflare na planie Free i sprawdź rekordy.** Wszystkie mają mieć wyłączone proxy (szara chmurka). (2026-11-11: skan zgubił TXT `_github-pages-challenge-simpleperfection`, dodany ręcznie; wszystkie 16 rekordów na `ulla.ns.cloudflare.com` i `vicky.ns.cloudflare.com` jest identycznych z `ns1.hostido.net.pl`, razem z kluczem DKIM)
  - Dowód: w Cloudflare są co najmniej rekordy z tabeli, z tymi samymi wartościami.

| Typ | Nazwa | Wartość |
|---|---|---|
| A (4 sztuki) | `czystyzarobek.pl` | `185.199.108.153`, `.109.153`, `.110.153`, `.111.153` |
| AAAA (4 sztuki) | `czystyzarobek.pl` | `2606:50c0:8000::153`, `8001`, `8002`, `8003` |
| CNAME | `www` | `simpleperfection.github.io` |
| MX | `czystyzarobek.pl` | `10 mail.czystyzarobek.pl` |
| A | `mail` | `185.110.48.31` |
| TXT | `czystyzarobek.pl` | `v=spf1 a mx include:spf.hostido.pl -all` |
| TXT | `czystyzarobek.pl` | `google-site-verification=…` (weryfikacja Google, wartość z eksportu Hostido; rekord widoczny w DNS 2026-11-11, nie było go w tabeli) |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=s; aspf=s;` |
| TXT | `x._domainkey` | wartość z eksportu Hostido |
| TXT | `_github-pages-challenge-simpleperfection` | wartość z eksportu Hostido |

- [x] (2026-11-11, przed aktywacją strefy: Bot fight mode, Email Address Obfuscation, AI Labyrinth, Continuous script monitoring, Speed Brain i Rocket Loader wyłączone; RUM „Disabled”, a po aktywacji domeny o 17:21 nadal „Disabled”) **Wyłącz w strefie wszystko, co dokleja skrypty albo zbiera dane o ruchu** (R3): Web Analytics (RUM), Bot Fight Mode, Email Obfuscation, Rocket Loader, Speed Brain. Już przy dodawaniu domeny wyłącz „Enable Bot Preference Sync” (dopisuje treść na początku `robots.txt`), a zasady „Search”, „Training” i „Agents” zostaw na „Allow (do not block)”: `robots.txt` celowo wpuszcza roboty na strony HTML, żeby zobaczyły `noindex`.
  - Po co: `script-src 'self'` w aplikacji nie zatrzyma skryptów podawanych spod `/cdn-cgi/` tej samej domeny.
- [x] **Włącz Always Use HTTPS** (SSL/TLS → Edge Certificates). (potwierdzone z zewnątrz 2026-11-12: `http://proba.czystyzarobek.pl/` odpowiada 301 na `https://`)
- [x] **U Hostido zmień nameservery na dwa podane przez Cloudflare.** DNSSEC jest wyłączony, więc ten krok odpada. (2026-11-11 17:07: Hostido pozwala wpisać własne nameservery dopiero po przełączeniu „Ustawienia domeny” na „Przekierowanie na serwery DNS” → „Wyłącz bez przenoszenia”, a to od razu usuwa strefę u Hostido. Domena nie odpowiadała ok. 9 minut, do 17:16, gdy rejestr `.pl` pokazał `ulla.ns.cloudflare.com` i `vicky.ns.cloudflare.com`; potem Google, Cloudflare i Quad9 zwracały nowe nameservery, a strona 200)
  - Strony dalej serwuje GitHub, bo rekordy są bez proxy. Nikt nie powinien niczego zauważyć.
- [x] **Poczekaj, aż strefa będzie miała status Active** (zwykle kilka godzin, do 24 h), a certyfikat Universal SSL będzie aktywny (15 min do 24 h). (2026-11-11: strefa aktywna o 17:19, certyfikat „Active” o 17:21 wg właściciela)
  - Dowód: `nslookup -type=NS czystyzarobek.pl 8.8.8.8` pokazuje nameservery Cloudflare.
- [x] **Nie zmieniaj strefy u Hostido przez 48 h.** Część sieci może jeszcze pytać stare nameservery. (2026-11-11: nie dotyczy, strefa u Hostido została usunięta przy zmianie nameserverów; nie włączaj z powrotem „Zarządzania strefą DNS”)

Poczty w tej domenie nie używasz (ustalone 2026-11-05), więc nie trzeba jej testować. Rekordy poczty i tak przenosimy bez zmian. Gdyby skrzynka była kiedyś potrzebna, sprawdź najpierw certyfikat `*.czystyzarobek.pl` u Hostido: jego odnowienie po zmianie nameserverów może się nie udać.

## 3. Logowanie: Cloudflare Access

- [x] **Załóż organizację Zero Trust na planie Free** i wybierz nazwę zespołu, np. `czysty-zarobek`. (2026-11-11: plan Free wybrany; kreator nie zapytał o nazwę zespołu, więc właściciel zmienił ją w Zero Trust → Settings; 2026-11-12 logowanie przekierowuje na `czysty-zarobek.cloudflareaccess.com`)
  - Uwaga: Cloudflare wymaga danych płatniczych także przy planie Free. Koszt zostaje 0 zł przy 5 firmach, bo limit to 50 osób.
- [x] **Dodaj logowanie kodem** (Integrations → Identity providers → One-time PIN). Nowe organizacje nie mają go od razu. (2026-11-11: „One-time PIN” dodany; obok jest domyślny dostawca „Cloudflare”, którego aplikacja Access ma nie używać)
- [x] **Ustaw globalny czas sesji na 1 miesiąc** (Access controls → Access settings). Domyślnie to 24 godziny. (2026-11-12: ustawione według właściciela; potwierdzi to data ważności ciasteczka po logowaniu w kroku 5)
- [x] **Ustaw stronę logowania po polsku:** nazwa „Czysty Zarobek” i krótki opis „Wpisz adres e-mail. Wyślemy na niego kod do logowania”. Zapisane 2026-11-12 (Zero Trust → Reusable components → Custom pages → Access login page → Manage; opis to pole „Header text”). Potwierdzone tego samego dnia na stronie logowania `proba`: jest „Log in to Czysty Zarobek” i to zdanie, a adresu e-mail właściciela w kodzie strony nie ma.
- [x] **Utwórz aplikację „Czysty Zarobek”** (self-hosted): (2026-11-12: utworzona przez Access controls → Applications → Create new application → Self-hosted and private; lista osób to osobna reguła „Firmy z listy” z Access controls → Policies, typ Allow, i to do niej dopisuje się adresy firm. „Accept all available identity providers” wyłączone, wybrany tylko „One-time PIN”. Na zrzucie przed zapisem „Apply instant authentication” było włączone i nie ma potwierdzenia, że zostało wyłączone; strona logowania na `proba` pokazuje mimo to polski nagłówek i pole na adres. Po utworzeniu `https://czystyzarobek.pl/` nadal odpowiada 200 z GitHub Pages, bo rekordy są „DNS only”)
  - adresy: `czystyzarobek.pl` i `proba.czystyzarobek.pl`, bez ścieżki;
  - czas sesji: 1 miesiąc;
  - logowanie: tylko One-time PIN;
  - reguła: Allow, Include → Emails: **Twój adres** i adresy firm (na razie tylko Twój);
  - ustawienia ciasteczek zostaw domyślne, nie ustawiaj SameSite na Strict.
- [x] **Utwórz aplikację „Czysty Zarobek: bez logowania”** (self-hosted): (2026-11-12: formularz sprawdzony na zrzutach przed zapisem: 12 adresów, w polu „Path” bez ukośnika na początku, osobna reguła „Bez logowania” typu Bypass z Include → Everyone; zapis potwierdził właściciel, a działanie pokazały polecenia `curl` z kroku 5: sześć ścieżek odpowiada 200 bez logowania)
  - adresy: każda ścieżka z tabeli „Wartości do wpisania”, osobno dla `czystyzarobek.pl` i dla `proba.czystyzarobek.pl` (12 adresów);
  - reguła: Bypass, Include → Everyone.
  - Po co: bardziej szczegółowa ścieżka wygrywa z główną aplikacją, więc linki ofert działają bez logowania. Aplikacja zainstalowana dostaje `sw.js`, manifest i ikony także bez ciasteczka.

## 4. Publikacja z Cloudflare

- [x] **Utwórz Workera z repozytorium** (Workers & Pages → Create application → GitHub). Aplikacji „Cloudflare Workers and Pages” daj dostęp tylko do `wyceny-sprzatanie`. (2026-11-12 12:13: Worker `czysty-zarobek` utworzony przez Compute → Workers & Pages; w formularzu „Enable Preview builds” i „Protect with Cloudflare Access” wyłączone, „Path” `/`, zmienna wpisana w „Advanced settings”. Pierwszy build przeszedł: 145 plików wgranych, krok „Installing” trwał 275 ms, „Success! Build completed.”)
  - Wpisz wartości z tabeli na początku: nazwę, Build command, Deploy command, zmienną i gałąź `main`.
- [x] **Wyłącz Preview Builds** (Settings → Build → Branch control). (2026-11-12: wyłączone już w formularzu tworzenia; w Settings → Builds → zakładka „Previews Base” przełącznik „Builds for Preview branches” jest wyłączony, a w zakładce „Production” gałąź to `main` i jest zmienna `SKIP_DEPENDENCY_INSTALL` = `1`. Przy „API token” panel pokazuje „Configured API token unavailable”, choć pierwszy build przeszedł na tym tokenie; sprawdzić przy następnym buildzie i dopiero po błędzie użyć „Create new token”)
  - Po co: adresy podglądów są domyślnie publiczne i nie chroni ich Access.
- [x] **Sprawdź, czy pierwszy build przeszedł** i czy w Settings → Domains & Routes nie ma włączonego `workers.dev` ani Preview URLs. (2026-11-12: build przeszedł; te ustawienia są teraz w zakładce „Domains” Workera, a oba przełączniki „Worker URL”, Production i Preview, są wyłączone i nie ma żadnej domeny własnej. Z zewnątrz `https://czysty-zarobek.<konto>.workers.dev/`, `/index.html`, `/data/ceny.json` i adres podglądu odpowiadają 404 „error code: 1042”)
  - Domeny nie dodajemy w repo, tylko w panelu. Dzięki temu build sam nie przejmie głównego adresu.

## 5. Próba na adresie próbnym

Główny adres dalej działa na GitHubie, więc tu nic nie może się popsuć.

- [x] **Dodaj Workerowi Custom Domain `proba.czystyzarobek.pl`** (Settings → Domains & Routes). (2026-11-12 12:29: zakładka „Domains” Workera → „Add Domain”; w okienku najpierw wybiera się domenę `czystyzarobek.pl`, a dopiero potem wpisuje subdomenę `proba`. Wpisanie całego adresu daje „No zones match” i przycisk „Onboard domain”, którego nie klikamy)
- [x] **Sprawdź adresy z komputera** w Git Bash: (2026-11-12, sprawdzone przez Claude z zewnątrz: pięć ścieżek aplikacji daje 302 na `czysty-zarobek.cloudflareaccess.com`, sześć ścieżek publicznych 200, doklejonych znaczników 0, `robots.txt` taki sam jak w repo, nagłówki z `_headers` są na `/oferta.html`)

```bash
H=proba.czystyzarobek.pl
for p in / /index.html /src/app.js /data/ceny.json /PLAN.md; do curl -s -o /dev/null -w "%{http_code} $p\n" "https://$H$p"; done
```

  Oczekiwany wynik: wszędzie `302` (przekierowanie na logowanie).

```bash
H=proba.czystyzarobek.pl
for p in /oferta.html /sw.js /manifest.webmanifest /ikony/ikona-192.png /publiczne/src/oferta-start.js /robots.txt; do curl -s -o /dev/null -w "%{http_code} $p\n" "https://$H$p"; done
```

  Oczekiwany wynik: wszędzie `200`.

```bash
curl -s https://proba.czystyzarobek.pl/oferta.html | grep -c -E 'cdn-cgi|cloudflareinsights|email-decode'
```

  Oczekiwany wynik: `0` (Cloudflare niczego nie dokleił).

- [x] **Spróbuj obejść wyjątki od logowania** (uwaga z review fazy 2). Wyjątki działają po początku ścieżki, więc adres z `..` nie może wyprowadzić poza publiczny katalog: (2026-11-12, sprawdzone przez Claude: sześć adresów z listy i 17 dodatkowych, m.in. `/publiczne/..;/data/ceny.json`, `/PUBLICZNE/../data/ceny.json`, `/sw.js/../data/ceny.json`, `/publiczne/data/ceny.json`, `/sw.jsx`, `/robots.txt.bak`; wyniki to 302, 404 i raz 400, nigdzie 200)

```bash
H=proba.czystyzarobek.pl
for p in '/publiczne/../src/app.js' '/publiczne/%2e%2e/data/ceny.json' '/ikony/..%2fdata/ceny.json' '/publiczne/..%2F..%2Fdata/ceny.json' '/oferta.html/../index.html' '//publiczne/../data/ceny.json'; do curl --path-as-is -s -o /dev/null -w "%{http_code} $p\n" "https://$H$p"; done
```

  Oczekiwany wynik: wszędzie `302` (logowanie) albo `404`, nigdzie `200`. Przy `200` zatrzymaj się i nie przełączaj głównego adresu. W Cloudflare zostaw włączone „Normalize incoming URLs” (Rules → Settings).

- [ ] **Zaloguj się kodem z maila na telefonie** na `https://proba.czystyzarobek.pl`, zainstaluj aplikację i zobacz ekran Start.
  - 2026-11-12: dwie próby skończyły się komunikatem „That account does not have access”. Dziennik (Zero Trust → Insights & Logs → Logs → Access authentication logs → „View” przy wpisie) pokazał „Invalid One Time Pin entered by user” przy zaliczonej regule „Firmy z listy”. Kody na skrzynkę firmową właściciela przychodzą po ponad 10 minutach, czyli po wygaśnięciu, a każda nowa prośba unieważnia poprzedni kod. To samo może spotkać firmy testowe ze skrzynkami na hostingu współdzielonym: w wiadomości do firm (krok 8) trzeba napisać, żeby prosić o kod raz, i mieć w zapasie drugi adres albo dodanie nadawcy `noreply@notify.cloudflare.com` do zaufanych.
  - 2026-11-12: po dopisaniu do reguły drugiego adresu właściciela kod przyszedł od razu i logowanie przeszło, ale telefon wylądował na `czystyzarobek.pl/cdn-cgi/…` z błędem 404 z GitHub Pages. Przyczyna: aplikacja Access z kilkoma adresami po logowaniu ustawia ciasteczko na wszystkich swoich adresach łańcuchem przekierowań (ustawienie „Eager redirect”, domyślnie włączone w nowych aplikacjach), a `czystyzarobek.pl` nie jest jeszcze za Cloudflare. Dopóki główny adres jest na GitHubie, to ustawienie trzeba wyłączyć w aplikacji „Czysty Zarobek” (Additional settings → Cookie settings) albo trzymać `proba` w osobnej aplikacji. Po poprawce w ustawieniach aplikacji logowanie na telefonie działa (wg właściciela; nie widziałem zrzutu ustawienia, więc do potwierdzenia w panelu przed krokiem 6).
  - Sprawdź ikonę na ekranie telefonu, a potem na komputerze po zalogowaniu `/PLAN.md` i `/research/cenniki_firm.csv`: mają dawać 404.
  - 2026-11-12: aplikacja zainstalowana z `proba` i otwarta z ikony (wg właściciela). Z tego punktu zostaje kontrola na komputerze po zalogowaniu: `/PLAN.md` i `/research/cenniki_firm.csv` mają dawać 404.
- [x] **Włącz tryb samolotowy, zamknij aplikację i otwórz ją ponownie.** Ma działać bez internetu. (2026-11-12, wg właściciela)
- [x] **Wyłącz tryb samolotowy, uruchom telefon ponownie i otwórz aplikację.** (2026-11-12, wg właściciela: po restarcie ekran Start bez pytania o kod) Nie powinna prosić o logowanie. Inaczej sesja nie przeżywa restartu, a wiadomość do firm obiecuje logowanie raz w miesiącu.
- [x] **Sprawdź wygaśnięcie sesji:** (2026-11-12, wg właściciela: po wylogowaniu aplikacja z ikony pokazała logowanie, a po kodzie wróciła do ekranu Start) z internetem wejdź na `https://proba.czystyzarobek.pl/cdn-cgi/access/logout`, zamknij i otwórz aplikację. Masz zobaczyć logowanie, a po wpisaniu kodu wrócić do aplikacji.
- [ ] **Sprawdź aktualizację za logowaniem na komputerze.** Zaloguj się w Chrome na `proba`, wyloguj się przez `/cdn-cgi/access/logout`, wypchnij drobną zmianę na `main` i poczekaj na build. Zaloguj się ponownie, otwórz stronę, zamknij wszystkie jej karty i otwórz ją jeszcze raz. Samo odświeżenie nie wystarczy: nowa wersja wchodzi dopiero po zamknięciu strony, żeby stary kod nie dostał nowych danych. W F12 → Application → Cache storage ma zostać jeden cache o nazwie takiej samej jak wartość z `curl -s https://proba.czystyzarobek.pl/sw.js | grep WERSJA_CACHE`.
- [x] **Otwórz link oferty na telefonie bez logowania.** (2026-11-12, zrzut właściciela: oferta pod `proba.czystyzarobek.pl/oferta.html` otwiera się w całości bez logowania, czcionką Source Sans 3. Właściciel zauważył, że oferta dla klienta jest czarno-biała, a podgląd w aplikacji kolorowy: tak jest zaprojektowana, `tokeny.css`, `baza.css` i `oferta.css` są bajt w bajt takie same jak na głównym adresie) Wyślij sobie link z aplikacji na `proba`, otwórz go w oknie prywatnym albo na innym telefonie. Oferta ma się pokazać w całości, z właściwą czcionką.
- [x] **Sprawdź, czy `workers.dev` nie odpowiada.** (2026-11-12, po dodaniu domeny `proba`: `https://czysty-zarobek.<konto>.workers.dev/` i `/data/ceny.json` dają 404 „error code: 1042”) Adres Workera znajdziesz w panelu. Jeśli strona się otwiera, zatrzymaj się i dodaj w Access aplikację z miejscem docelowym `worker`.

- [x] **Zrób świeżą kopię danych na telefonie i wczytaj ją w aplikacji na `proba`.** (2026-11-12, wg właściciela: kopia wczytana, liczby się zgadzają) Porównaj liczbę klientów, wycen i zleceń. To sprawdza, czy kopia naprawdę się wczytuje, zanim ruszysz główny adres.
- [ ] **Usuń z telefonu ikonę aplikacji z `proba`.** Inaczej zostaną dwie takie same ikony, a ta z `proba` przestanie działać po usunięciu adresu.

Jeśli build odrzuci `_redirects` albo `/` nie otwiera aplikacji, nie idź dalej. Popraw to w repo i powtórz próbę.

## 6. Przełączenie głównego adresu

Od tego kroku do jego końca strona może chwilę nie działać. Teraz używasz jej tylko Ty.

- [ ] **Godzinę wcześniej ustaw TTL rekordów A i AAAA dla `czystyzarobek.pl` na 1 minutę.** Rekordy z importu mają 1 godzinę, a wtedy telefon długo trafiałby na GitHub, co wygląda jak awaria logowania.
- [ ] **Usuń rekordy A i AAAA dla `czystyzarobek.pl`** i od razu **dodaj Workerowi Custom Domain `czystyzarobek.pl`**.
- [ ] **Poczekaj, aż domena dostanie status Active, i dopiero wtedy sprawdzaj.** Jeśli po 15 minutach nie ma certyfikatu, wycofaj zmianę według tabeli „Gdy coś pójdzie źle”.
- [ ] **Przekieruj `www`:** usuń CNAME `www`, dodaj rekord `A www 192.0.2.0` z włączonym proxy i regułę Redirect Rule `https://www.*` → `https://${1}`, kod 301, z zachowaniem zapytania.
- [ ] **Powtórz polecenia z kroku 5 z `H=czystyzarobek.pl`.**
- [ ] **Sprawdź, czy osoba spoza listy nie wejdzie:** w oknie prywatnym wpisz inny adres e-mail. Kod nie przyjdzie, a ekran mimo to powie, że został wysłany. Tak działa Cloudflare.
- [ ] **Na telefonie otwórz aplikację pod https://czystyzarobek.pl, zaloguj się i sprawdź swoje dane.** Klienci, wyceny i zlecenia mają być na miejscu.
- [ ] **Otwórz stary link oferty** wysłany przed przenosinami. Ma działać bez logowania.
- [ ] **Włącz tryb samolotowy i otwórz aplikację.** Ma działać bez internetu także pod głównym adresem. Bez tego nie przechodź do kroku 7.
- [ ] **Usuń Custom Domain `proba.czystyzarobek.pl`** i jej adresy z obu aplikacji Access.

## 7. Repo prywatne

Dopiero teraz, bo przejście na prywatne repo od razu wyłącza GitHub Pages.

- [ ] **Zmień repo na prywatne:**

```bash
gh repo edit simpleperfection/wyceny-sprzatanie --visibility private --accept-visibility-change-consequences
```

- [ ] **Sprawdź w oknie prywatnym**, czy `https://github.com/simpleperfection/wyceny-sprzatanie` daje 404, a strona dalej działa.
- [ ] **Usuń z repo pliki po GitHub Pages** (`CNAME`, `.nojekyll`), popraw komentarz w `robots.txt` i uzupełnij `PLAN.md` oraz `CLAUDE.md`.
  - To jednocześnie test publikacji z prywatnego repo: ten push na `main` ma uruchomić build w Cloudflare.
  - Dowód: nowa wersja jest w Workers → Deployments.

## 8. Testerzy

- [ ] **Dodaj adresy firm** do reguły w aplikacji „Czysty Zarobek” (najwyżej 5 firm) i wyślij im wiadomość z końca tej listy.

**Dodanie testera:** dopisz adres do reguły Allow. Działa od razu.

**Usunięcie testera:** najpierw poproś o kopię danych. Potem usuń adres z reguły i wybierz Team & Resources → Users → zaznacz osobę → Action → Revoke. Bez tego drugiego kroku tester wchodzi do końca swojej sesji, czyli nawet przez miesiąc. Dane zostają na jego telefonie, ale po usunięciu dojdzie do nich tylko bez internetu, np. w trybie samolotowym.

**Kod nie przychodzi:** sprawdź literówkę w adresie w regule Allow i poproś o sprawdzenie spamu. Cloudflare zawsze pokazuje „kod wysłany”, także przy adresie spoza listy.

- [ ] **Sprawdź iPhone'a pierwszego dnia, zanim firma wpisze dane.** Gdy zainstaluje aplikację, zrób Revoke jej sesji i po minucie poproś o otwarcie ikony z internetem.
  - Dobrze: pojawia się logowanie, a po kodzie wraca aplikacja.
  - Źle: firma pracuje w Safari albo na innym urządzeniu. Safari może skasować dane po 7 dniach bez wizyty, więc wtedy ważna jest częsta kopia.

## Gdy coś pójdzie źle

| Na którym kroku | Co zrobić |
|---|---|
| Do końca kroku 5 | Nic nie trzeba cofać. Główny adres dalej stoi na GitHubie. |
| Krok 6 | Usuń Custom Domain `czystyzarobek.pl` i przywróć rekordy A oraz AAAA GitHuba bez proxy. Repo jest jeszcze publiczne, więc Pages działa. |
| Krok 7 | `gh repo edit simpleperfection/wyceny-sprzatanie --visibility public --accept-visibility-change-consequences`, a potem przywrócenie rekordów jak wyżej. Pages może wymagać ponownej publikacji. |
| Nameservery | Przywróć `ns1`, `ns2`, `ns3.hostido.net.pl` u Hostido. Część sieci może pytać Cloudflare jeszcze do 24 h, więc nie kasuj tam strefy. |

## Wiadomość do firmy

Tekst do wklejenia. Podmień `[data]`.

> Dzień dobry! Zapraszam do testów aplikacji Czysty Zarobek do [data]. Testy są bezpłatne.
>
> 1. Wejdź na https://czystyzarobek.pl i wpisz ten adres e-mail. Dostaniesz kod ważny 10 minut. Jeśli go nie widzisz, sprawdź spam.
> 2. Android: w przeglądarce wybierz z menu „Zainstaluj aplikację”. iPhone: zaloguj się w Safari, a dopiero potem wybierz Udostępnij → Do ekranu początkowego.
> 3. O ponowne logowanie aplikacja poprosi mniej więcej raz w miesiącu. Bez internetu działa bez logowania.
> 4. Dane o klientach, wycenach i zleceniach zostają na Twoim urządzeniu. Nie przenoszą się same na inne urządzenie, więc rób co jakiś czas kopię danych do pliku. Linki ofert wysyłasz klientom jak zwykle, otwierają się bez logowania.
>
> Ustalenie na czas testów: aplikacji i jej plików nie kopiujemy, a dostępu do niej nie przekazujemy nikomu dalej. Wszelkie prawa do aplikacji zostają przy autorze. Twój adres e-mail służy tylko do logowania, które obsługuje firma Cloudflare. Mogę zakończyć testy w dowolnym momencie, a Twoje dane zostaną wtedy na urządzeniu.
>
> Jeśli to pasuje, odpisz „OK”. Będę pytać raz w tygodniu, jak Ci się pracuje. Aplikacja sama nie zbiera danych o tym, jak jej używasz. Gdy testy się skończą, uprzedzę Cię wcześniej, żeby można było zrobić kopię danych.

Tekst ustalenia to nie porada prawna. Do sprzedaży (etap B) i tak potrzebny będzie regulamin.

