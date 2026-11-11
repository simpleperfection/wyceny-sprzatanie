# Smoke operatora — Zamknięty dostęp na czas testów, etap 6a (R1–R3, R29–R31, R33–R35)

Branch: `feature/zamkniety-dostep-testy` · Utworzono: 2026-11-11
Status: **do przejścia po scaleniu kodu** — odhaczaj `[ ]` → `[x]` w miarę przechodzenia.

Automat (typecheck, 1518 testów, 2 scenariusze E2E w przeglądarce) jest zielony. Ta lista pokrywa
**wyłącznie to, czego automat nie mógł sprawdzić**: prawdziwe logowanie Cloudflare Access, DNS, publikację
z Cloudflare i zachowanie zainstalowanej aplikacji na telefonie.

Dlaczego to nie jest formalność: kod przygotowuje tylko katalog `dist/` i konfigurację. Wranglera nikt nie uruchomił,
więc dopiero próba pokaże, czy Cloudflare przyjmuje `_headers` i `_redirects`. Wyjątki od logowania są wpisane ręcznie
w panelu Access, poza repo, a testy sprawdzają tylko, że lista w repo i lista w checkliście są takie same.
Powrotu z logowania do zainstalowanej aplikacji i sesji po restarcie telefonu nie da się odegrać bez prawdziwego Access.

Ten smoke różni się od poprzednich: prawie wszystko dzieje się **po** scaleniu z `main`, bo przenosiny zaczynają się
od opublikowania nowego `sw.js` przez GitHub Pages. Kroki i polecenia są w
`docs/operator/zamkniety-dostep-testy-przygotowanie.md` (dalej: checklista). Tu jest tylko kolejność i to, co ma wyjść.

## 0. Przed scaleniem (sprawdzone 2026-11-11, nic do zrobienia)

- [x] Aplikacja z tej gałęzi wstaje z katalogu repo tak, jak publikuje ją GitHub Pages (`npm start`): kreator startowy bez błędów w konsoli
- [x] Strona oferty z gałęzi pokazuje ofertę i ładuje 13 modułów, bez silnika wyceny i magazynu danych

W gałęzi nie ma nowych zmiennych środowiska. Jedyna zmienna to `SKIP_DEPENDENCY_INSTALL` w ustawieniach buildu Cloudflare (tabela „Wartości do wpisania” w checkliście).

**Co będzie potrzebne w trakcie:** konto Cloudflare z danymi płatniczymi (plan Free), dostęp do panelu Hostido, telefon z zainstalowaną aplikacją i Twoimi danymi, komputer z Git Bash i Chrome, drugi telefon albo okno prywatne do linku oferty.

## 1. Przenosiny (kroki 1–4 checklisty)

Wejście: checklista, od „1. Przed przenosinami”. Każda zmiana w DNS, Cloudflare i na GitHubie wymaga Twojej zgody.

- [ ] Kroki 1–4 po kolei: scalenie z `main`, kopia danych z telefonu, domena w Cloudflare, Access, Worker z repozytorium → strefa ma status Active, pierwszy build przeszedł, a `czystyzarobek.pl` dalej działa z GitHuba jak dotąd

## 2. Próba na `proba.czystyzarobek.pl` (krok 5 checklisty)

Wejście: checklista, „5. Próba na adresie próbnym”. Główny adres stoi jeszcze na GitHubie, więc nic nie może się popsuć.

- [ ] Polecenia `curl` z checklisty → adresy aplikacji dają `302`, sześć ścieżek bez logowania daje `200`, a Cloudflare niczego nie dokleja do `oferta.html`
- [ ] Próba obejścia wyjątków (`curl --path-as-is`, sześć adresów z `..`) → wszędzie `302` albo `404`, nigdzie `200`; przy `200` nie przełączaj głównego adresu
- [ ] **[fizyczne urządzenie]** Logowanie kodem z maila na telefonie, instalacja aplikacji → ekran Start, właściwa ikona na ekranie telefonu
- [ ] Osoba spoza listy (inny adres e-mail w oknie prywatnym) → kod nie przychodzi, strona się nie otwiera
- [ ] **[fizyczne urządzenie]** Tryb samolotowy, zamknięcie i ponowne otwarcie aplikacji → działa bez internetu
- [ ] **[fizyczne urządzenie]** Restart telefonu z internetem → aplikacja nie prosi o logowanie
- [ ] **[fizyczne urządzenie]** Wylogowanie przez `/cdn-cgi/access/logout`, zamknięcie i otwarcie aplikacji → ekran logowania, a po kodzie powrót do aplikacji
- [ ] Aktualizacja za logowaniem na komputerze → po publikacji, zamknięciu wszystkich kart i ponownym otwarciu zostaje jeden cache o nazwie z `WERSJA_CACHE`; samo odświeżenie strony pokazuje jeszcze starą wersję i tak ma być
- [ ] Link oferty w oknie prywatnym albo na drugim telefonie → oferta w całości, z właściwą czcionką, bez logowania
- [ ] Adres `workers.dev` Workera → nie odpowiada

## 3. Przełączenie głównego adresu i prywatne repo (kroki 6–7 checklisty)

Wejście: checklista, „6. Przełączenie głównego adresu”.

- [ ] **[fizyczne urządzenie]** Aplikacja pod `https://czystyzarobek.pl` po zalogowaniu → Twoi klienci, wyceny i zlecenia są na miejscu, a aplikacja działa w trybie samolotowym
- [ ] Stary link oferty wysłany przed przenosinami → otwiera się bez logowania
- [ ] `https://czystyzarobek.pl/PLAN.md` po zalogowaniu → 404
- [ ] Repo prywatne → `https://github.com/simpleperfection/wyceny-sprzatanie` w oknie prywatnym daje 404, a strona dalej działa
- [ ] Push na `main` (usunięcie `CNAME` i `.nojekyll`) → nowa wersja w Workers → Deployments; w aplikacji widać ją po zamknięciu i ponownym otwarciu

## 4. Pierwsza firma z iPhone'em (krok 8 checklisty)

- [ ] **[fizyczne urządzenie]** iPhone pierwszego dnia, zanim firma wpisze dane: Revoke sesji, po minucie otwarcie ikony z internetem → logowanie, a po kodzie wraca aplikacja zainstalowana na ekranie początkowym, nie Safari

## Jak kontynuować w nowej sesji

Skopiuj jako pierwszą wiadomość:

```
Kontynuujemy smoke operatora zadania "zamkniety-dostep-testy" (branch feature/zamkniety-dostep-testy).
Checklista: docs/operator/2026-11-11-zamkniety-dostep-testy-smoke.md — prowadź mnie punkt po punkcie,
odhaczaj za mnie w pliku, a usterki naprawiaj od razu (z testem) zamiast odkładać.
Ten smoke zaczyna się od scalenia kodu z main, więc najpierw /dev-pr, a dopiero potem punkty 1–4.
```
