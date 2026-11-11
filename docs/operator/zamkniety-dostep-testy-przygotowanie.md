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

- [ ] **Scal kod do `main`** i sprawdź, czy https://czystyzarobek.pl działa jak dotąd.
  - Po co: GitHub Pages opublikuje poprawiony `sw.js`, zanim domena pójdzie na Cloudflare.
- [ ] **Na telefonie otwórz aplikację dwa razy z internetem, z przerwą między otwarciami.**
  - Po co: telefon dostaje nowy `sw.js` przed logowaniem. Stary mógłby pokazać złą stronę przy powrocie z logowania.
- [ ] **Zrób kopię danych do pliku** w aplikacji na telefonie i zachowaj plik poza telefonem.
  - Po co: adres się nie zmienia, więc dane powinny zostać. Kopia jest na wypadek błędu.

## 2. Domena w Cloudflare

- [ ] **Załóż konto Cloudflare** na swój adres. Nie zakładaj kont w imieniu firm, bo zakazuje tego regulamin Cloudflare.
- [ ] **Pobierz eksport strefy z panelu Hostido.** To on jest źródłem prawdy, a tabela niżej to tylko to, co widać z zewnątrz.
- [ ] **Dodaj domenę `czystyzarobek.pl` w Cloudflare na planie Free i sprawdź rekordy.** Wszystkie mają mieć wyłączone proxy (szara chmurka).
  - Dowód: w Cloudflare są co najmniej rekordy z tabeli, z tymi samymi wartościami.

| Typ | Nazwa | Wartość |
|---|---|---|
| A (4 sztuki) | `czystyzarobek.pl` | `185.199.108.153`, `.109.153`, `.110.153`, `.111.153` |
| AAAA (4 sztuki) | `czystyzarobek.pl` | `2606:50c0:8000::153`, `8001`, `8002`, `8003` |
| CNAME | `www` | `simpleperfection.github.io` |
| MX | `czystyzarobek.pl` | `10 mail.czystyzarobek.pl` |
| A | `mail` | `185.110.48.31` |
| TXT | `czystyzarobek.pl` | `v=spf1 a mx include:spf.hostido.pl -all` |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=s; aspf=s;` |
| TXT | `x._domainkey` | wartość z eksportu Hostido |
| TXT | `_github-pages-challenge-simpleperfection` | wartość z eksportu Hostido |

- [ ] **Wyłącz w strefie wszystko, co dokleja skrypty albo zbiera dane o ruchu** (R3): Web Analytics (RUM), Bot Fight Mode, Email Obfuscation, Rocket Loader, Speed Brain.
  - Po co: `script-src 'self'` w aplikacji nie zatrzyma skryptów podawanych spod `/cdn-cgi/` tej samej domeny.
- [ ] **Włącz Always Use HTTPS** (SSL/TLS → Edge Certificates).
- [ ] **U Hostido zmień nameservery na dwa podane przez Cloudflare.** DNSSEC jest wyłączony, więc ten krok odpada.
  - Strony dalej serwuje GitHub, bo rekordy są bez proxy. Nikt nie powinien niczego zauważyć.
- [ ] **Poczekaj, aż strefa będzie miała status Active** (zwykle kilka godzin, do 24 h), a certyfikat Universal SSL będzie aktywny (15 min do 24 h).
  - Dowód: `nslookup -type=NS czystyzarobek.pl 8.8.8.8` pokazuje nameservery Cloudflare.
- [ ] **Nie zmieniaj strefy u Hostido przez 48 h.** Część sieci może jeszcze pytać stare nameservery.

Poczty w tej domenie nie używasz (ustalone 2026-11-05), więc nie trzeba jej testować. Rekordy poczty i tak przenosimy bez zmian. Gdyby skrzynka była kiedyś potrzebna, sprawdź najpierw certyfikat `*.czystyzarobek.pl` u Hostido: jego odnowienie po zmianie nameserverów może się nie udać.

## 3. Logowanie: Cloudflare Access

- [ ] **Załóż organizację Zero Trust na planie Free** i wybierz nazwę zespołu, np. `czysty-zarobek`.
  - Uwaga: Cloudflare wymaga danych płatniczych także przy planie Free. Koszt zostaje 0 zł przy 5 firmach, bo limit to 50 osób.
- [ ] **Dodaj logowanie kodem** (Integrations → Identity providers → One-time PIN). Nowe organizacje nie mają go od razu.
- [ ] **Ustaw globalny czas sesji na 1 miesiąc** (Access controls → Access settings). Domyślnie to 24 godziny.
- [ ] **Ustaw stronę logowania po polsku:** nazwa „Czysty Zarobek” i krótki opis „Wpisz adres e-mail. Wyślemy na niego kod do logowania”.
- [ ] **Utwórz aplikację „Czysty Zarobek”** (self-hosted):
  - adresy: `czystyzarobek.pl` i `proba.czystyzarobek.pl`, bez ścieżki;
  - czas sesji: 1 miesiąc;
  - logowanie: tylko One-time PIN;
  - reguła: Allow, Include → Emails: **Twój adres** i adresy firm (na razie tylko Twój);
  - ustawienia ciasteczek zostaw domyślne, nie ustawiaj SameSite na Strict.
- [ ] **Utwórz aplikację „Czysty Zarobek: bez logowania”** (self-hosted):
  - adresy: każda ścieżka z tabeli „Wartości do wpisania”, osobno dla `czystyzarobek.pl` i dla `proba.czystyzarobek.pl` (12 adresów);
  - reguła: Bypass, Include → Everyone.
  - Po co: bardziej szczegółowa ścieżka wygrywa z główną aplikacją, więc linki ofert działają bez logowania. Aplikacja zainstalowana dostaje `sw.js`, manifest i ikony także bez ciasteczka.

## 4. Publikacja z Cloudflare

- [ ] **Utwórz Workera z repozytorium** (Workers & Pages → Create application → GitHub). Aplikacji „Cloudflare Workers and Pages” daj dostęp tylko do `wyceny-sprzatanie`.
  - Wpisz wartości z tabeli na początku: nazwę, Build command, Deploy command, zmienną i gałąź `main`.
- [ ] **Wyłącz Preview Builds** (Settings → Build → Branch control).
  - Po co: adresy podglądów są domyślnie publiczne i nie chroni ich Access.
- [ ] **Sprawdź, czy pierwszy build przeszedł** i czy w Settings → Domains & Routes nie ma włączonego `workers.dev` ani Preview URLs.
  - Domeny nie dodajemy w repo, tylko w panelu. Dzięki temu build sam nie przejmie głównego adresu.

## 5. Próba na adresie próbnym

Główny adres dalej działa na GitHubie, więc tu nic nie może się popsuć.

- [ ] **Dodaj Workerowi Custom Domain `proba.czystyzarobek.pl`** (Settings → Domains & Routes).
- [ ] **Sprawdź adresy z komputera** w Git Bash:

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

- [ ] **Spróbuj obejść wyjątki od logowania** (uwaga z review fazy 2). Wyjątki działają po początku ścieżki, więc adres z `..` nie może wyprowadzić poza publiczny katalog:

```bash
H=proba.czystyzarobek.pl
for p in '/publiczne/../src/app.js' '/publiczne/%2e%2e/data/ceny.json' '/ikony/..%2fdata/ceny.json' '/publiczne/..%2F..%2Fdata/ceny.json' '/oferta.html/../index.html' '//publiczne/../data/ceny.json'; do curl --path-as-is -s -o /dev/null -w "%{http_code} $p\n" "https://$H$p"; done
```

  Oczekiwany wynik: wszędzie `302` (logowanie) albo `404`, nigdzie `200`. Przy `200` zatrzymaj się i nie przełączaj głównego adresu. W Cloudflare zostaw włączone „Normalize incoming URLs” (Rules → Settings).

- [ ] **Zaloguj się kodem z maila na telefonie** na `https://proba.czystyzarobek.pl`, zainstaluj aplikację i zobacz ekran Start.
  - Sprawdź ikonę na ekranie telefonu, a potem na komputerze po zalogowaniu `/PLAN.md` i `/research/cenniki_firm.csv`: mają dawać 404.
- [ ] **Włącz tryb samolotowy, zamknij aplikację i otwórz ją ponownie.** Ma działać bez internetu.
- [ ] **Wyłącz tryb samolotowy, uruchom telefon ponownie i otwórz aplikację.** Nie powinna prosić o logowanie. Inaczej sesja nie przeżywa restartu, a wiadomość do firm obiecuje logowanie raz w miesiącu.
- [ ] **Sprawdź wygaśnięcie sesji:** z internetem wejdź na `https://proba.czystyzarobek.pl/cdn-cgi/access/logout`, zamknij i otwórz aplikację. Masz zobaczyć logowanie, a po wpisaniu kodu wrócić do aplikacji.
- [ ] **Sprawdź aktualizację za logowaniem na komputerze.** Zaloguj się w Chrome na `proba`, wyloguj się przez `/cdn-cgi/access/logout`, wypchnij drobną zmianę na `main` i poczekaj na build. Zaloguj się ponownie, otwórz stronę, zamknij wszystkie jej karty i otwórz ją jeszcze raz. Samo odświeżenie nie wystarczy: nowa wersja wchodzi dopiero po zamknięciu strony, żeby stary kod nie dostał nowych danych. W F12 → Application → Cache storage ma zostać jeden cache o nazwie takiej samej jak wartość z `curl -s https://proba.czystyzarobek.pl/sw.js | grep WERSJA_CACHE`.
- [ ] **Otwórz link oferty na telefonie bez logowania.** Wyślij sobie link z aplikacji na `proba`, otwórz go w oknie prywatnym albo na innym telefonie. Oferta ma się pokazać w całości, z właściwą czcionką.
- [ ] **Sprawdź, czy `workers.dev` nie odpowiada.** Adres Workera znajdziesz w panelu. Jeśli strona się otwiera, zatrzymaj się i dodaj w Access aplikację z miejscem docelowym `worker`.

- [ ] **Zrób świeżą kopię danych na telefonie i wczytaj ją w aplikacji na `proba`.** Porównaj liczbę klientów, wycen i zleceń. To sprawdza, czy kopia naprawdę się wczytuje, zanim ruszysz główny adres.
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

