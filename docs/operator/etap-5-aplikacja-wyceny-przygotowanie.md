---
feature_slug: etap-5-aplikacja-wyceny
origin: docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md
utworzono: 2026-10-23
dotyka_ui: true
status: do-zrobienia
---

# Etap 5: aplikacja PWA do wycen. Przygotowanie przed implementacją

Uzupełnione przez /dev-plan 2026-10-24 — pozycje z Implementation Units oznaczone numerem blokowanej fazy. Plan: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`.

**Etap:** 5, aplikacja PWA (kreator wyceny z doborem chemii + funkcje dla początkujących A–D) · **Utworzono:** 2026-10-23 · **Zależy od:** etap 4 (✅, commit `fbd0dd9`)
Źródła: `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md` (R1–R24) oraz `PLAN.md`, etap 5 (kreator: usługa → województwo → pomieszczenia i brud → dodatki → chemia → podsumowanie, pasek postępu, zapis wycen w przeglądarce, eksport do PDF lub linku).

> Lista kroków, które robi **człowiek poza kodem**: decyzje, konta zewnętrzne, sekrety, assety, makiety.
> Kod (komponenty, silnik wyceny, testy) powstaje w implementacji i nie jest tutaj.
> Legenda: 🔓 publiczne (może iść do repo) · 🔒 sekret (nigdy do gita) · `[~]` świadomy dług · *(kod)* nie Twój krok.
> `/dev-plan` dopisze do tej listy pozycje wynikłe z Implementation Units i **zamieni** marker
> `[blokuje: planowanie]` na `[blokuje: faza N]` tam, gdzie zna numer blokowanej fazy.

## 1. Decyzje (zero plików, ale blokują resztę)

- [x] **Czy etap 5 ma makiety w Figmie?** — **[blokuje: planowanie]**
  - Opcje: A) makiety robi właściciel albo projektant w Figmie, a URL-e trafiają do sekcji 4; B) Claude projektuje makiety w Figmie (plugin `figma` jest na koncie właściciela), a właściciel akceptuje je przed planowaniem; C) bez makiet: plan ustala prosty, spójny styl w `docs/DESIGN.md`, a ekrany powstają prosto z wymagań (wtedy sekcja 4 zostaje jako lista ekranów, oznaczona `[~]`).
  - Dlaczego blokuje: od tego zależy, czy `/dev-plan` przypisze ekranom URL-e Figmy i buildery z Figmą. W repo nie ma `docs/DESIGN.md`, więc bez makiet styl ustala plan.
  - Ustalono: **B** – Claude projektuje makiety w Figmie na bazie szkicu `docs/operator/etap-5-szkic-ekranow.html`, a właściciel akceptuje każdy ekran (2026-10-23). Sprawdź limit z następnej pozycji.
- [x] **Jak zmieścić się w limicie MCP Figmy?** — **[blokuje: planowanie]**
  - Stan (sprawdzone 2026-10-23 przez `whoami`): konto Figma właściciela jest na planie Starter z miejscem **View**. Według [dokumentacji Figmy](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) przy miejscu View narzędzia czytające z Figmy mają limit **do 20 wywołań miesięcznie**. Limit nie obejmuje `create_new_file`, `generate_figma_design` i `whoami`. Dokumentacja nie mówi, czy miejsce View może edytować pliki przez `use_figma`; sprawdzimy to na pierwszym pliku.
  - Dlaczego blokuje: `/dev-plan` czyta makiety z Figmy, a buildery z Figmą czytają je przy każdym ekranie. Przy 15 ekranach 20 odczytów miesięcznie prawdopodobnie nie wystarczy.
  - Opcje: A) wykupić płatne miejsce Dev albo Full (plan Professional) na czas etapu 5; B) zostać na planie Starter i oszczędzać odczyty: makiety powstają z `generate_figma_design` i `create_new_file` (poza limitem), plan pobiera je raz, a buildery pracują na zapisanej specyfikacji i szkicu; C) wrócić do opcji C z poprzedniej decyzji (bez makiet).
  - Ustalono: **B** – zostajemy na planie Starter i oszczędzamy odczyty (2026-10-23). Czy da się rysować w pliku, sprawdzamy na pierwszym pliku makiet.
  - Zmiana 2026-10-24: rysowanie działa, ale `use_figma` też wlicza się do limitu i limit na ten miesiąc jest wyczerpany (szczegóły w sekcji 4).
- [x] **Jaki kierunek wyglądu?** — Ustalono: **wersja 3** (granat i zieleń, start „do zrobienia”, przycisk „+”, wycena jako lista pozycji, oferta jak dokument; sekcja „Wersja 3” w pliku Figmy) jest bazą makiet wszystkich ekranów (2026-10-23).
- [x] **Wariant kolorystyczny: wersja 3 czy wariant B „kartka i długopis”?** (propozycja 2026-10-24)
  - Opcje: A) zostaje wersja 3 (granat i szmaragd); B) wariant B: kremowy papier, grafit, niebieski tusz `#2340a8`, żółty zakreślacz, font Source Sans 3, zaokrąglenia 6–10 px, zieleń tylko dla pieniędzy, przykładowe dane jak z prawdziwego zeszytu. Podgląd: `docs/operator/etap-5-wariant-b.html`.
  - Dlaczego: wersja 3 jest bardzo blisko Jobbera (ciemny granat i limonka) i przypomina typowe projekty z generatorów; wariant B nie powtarza kolorów konkurencji (Joist, ServiceM8 i Booksy: zieleń lub limonka; Housecall Pro: niebieski z pomarańczem; ZenMaid: turkus; Fixly: żółty).
  - W Figmie wariant B ma być drugim trybem kolekcji kolorów (wersja 3 zostaje do porównania), razem ze zmianą fontu, zaokrągleń i przykładowych danych. Skrypt jest gotowy; nie został uruchomiony, bo limit Figmy jest wyczerpany. Planowania nie blokuje: kolory to zmienne, a w kodzie zmienne CSS.
  - Ustalono: **B** – kod dostaje kolory, font i zaokrąglenia wariantu B (2026-10-24, w `/dev-plan`). Tokeny są w `docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md` pod nazwami zmiennych Figmy, więc powrót do wersji 3 albo barwy marki to zmiana wartości w `src/style/tokeny.css`. Skrypt Figmy można uruchomić po odnowieniu limitu, ale plan go nie wymaga.
- [x] **Czyja marka?** (rozstrzygnij przed projektowaniem makiet)
  - Opcje: A) neutralny wygląd bez marki autora; B) barwy i logo Simple Perfection; C) neutralny wygląd z dyskretną stopką „przygotował Simple Perfection”.
  - Dlaczego ważne: aplikacja jest publiczna dla dowolnej firmy (ustalenie z brainstormu). Oferta (R18) idzie do klientów tych firm i nie ma logo w wersji 1.
  - Ustalono: **B** – barwy i logo Simple Perfection w całej aplikacji; kolory wersji 3 dopasujemy do marki (2026-10-23). Założenie do potwierdzenia przy makietach: oferta dla klienta pokazuje firmę, która z aplikacji korzysta, a nie markę Simple Perfection.
  - Zmiana 2026-10-24: na razie makiety zostają w kolorach wersji 3, a logo i barwy marki dołożymy później (sekcja 3).
- [x] **Czy zostaje cena minimalna z kosztów firmy (blok A)?** (2026-10-24)
  - Ustalono: **nie** – blok A wycięty z wersji 1 decyzją właściciela. Wycena pokazuje cenę rynkową (medianę województwa) jako cenę proponowaną, koszt zlecenia (czas pracy, chemia, sprzęt, dojazd) i zdanie „zostaje dla Ciebie X zł, czyli Y zł za godzinę pracy”, bez celu godzinowego. Z ustawień podatkowych zostaje tylko status VAT (czynny podatnik ma ceny brutto z kwotą netto obok). Znika ekran `stawka-minimalna` i pola ZUS, podatku, kosztów stałych, kwoty na rękę i godzin u klientów. Szczegóły: nagłówek i R1–R10 w dokumencie wymagań.
- [x] **Jak nazywa się aplikacja?** (tytuł, nazwa w manifeście PWA i na ekranie telefonu)
  - Opcje: A) robocza „Wyceny sprzątania” (jak repo); B) własna nazwa: _(wpisz)_.
  - Dlaczego ważne: od nazwy zależy ikona (sekcja 3), a nazwa pojawia się w nagłówkach makiet, więc warto ją ustalić przed ich projektowaniem. Planowania nie blokuje.
  - Ustalono: właściciel nie ma preferencji (2026-10-23), więc na makietach jest robocza „Wyceny sprzątania” z marką Simple Perfection w logo. Można ją zmienić do publikacji (etap 6).
- [ ] **Pod jakim adresem będzie aplikacja?**
  - Opcje: A) `simpleperfection.github.io/wyceny-sprzatanie` (GitHub Pages, bez kosztów); B) własna domena albo subdomena: _(wpisz)_.
  - Dlaczego ważne: link do oferty (R18, R22) zawiera adres aplikacji. Zmiana adresu po rozesłaniu pierwszych ofert może zepsuć wysłane linki. Planowania nie blokuje; decyzja potrzebna przed publikacją (etap 6).
  - Ustalono: odłożone do etapu 6 – właściciel zdecyduje przed publikacją (2026-10-23). Opcje do wyboru wtedy: subdomena firmy (np. `wyceny.simple-perfection.pl`, wpis DNS) albo adres GitHub Pages.
  - Uwaga z `/dev-plan` (2026-10-24): dane firm są w przeglądarce i są przypisane do adresu aplikacji. Zmiana adresu po pierwszym użyciu z prawdziwymi danymi oznacza, że użytkownicy muszą przenieść dane kopią z pliku. Adres trzeba wybrać przed udostępnieniem aplikacji innym firmom. Autopilota etapu 5 to nie blokuje.
- [x] **„Doczyszczanie”: co obejmuje?** (otwarte pytanie 1 w `PLAN.md`)
  - Opcje: A) tylko doczyszczanie posadzek i fug (tak jest teraz w danych); B) także doczyszczanie mieszkań lub obiektów po budowie, czyli nowa usługa w danych.
  - Dlaczego ważne: wyznacza listę usług w kreatorze, zakres „wchodzi / nie wchodzi” (R19) i pytania do klienta (R13). Bez odpowiedzi plan przyjmie A.
  - Ustalono: **B** – zostaje doczyszczanie posadzek i fug, a dochodzi doczyszczanie mieszkań i obiektów po budowie jako nowa usługa (2026-10-23). Do zrobienia przed implementacją *(dane – robi Claude)*: zebrać ceny rynkowe ze źródłami, dopisać usługę do `data/ceny.json` i normy w `scripts/kalibracja.ps1`, przeliczyć kalibrację. Nowa usługa potrzebuje też zakresu i pytań do klienta (sekcja 3).
- [x] **Usuwanie farby z posadzki: skąd środek?** (otwarte pytanie 2 w `PLAN.md`)
  - Opcje: A) dozbierać zmywacz farb od jednego z 7 dostawców; B) zostawić pozycję bez podpowiedzi środka (jak teraz, `bez_kategorii`).
  - Ustalono: **B** – bez podpowiedzi środka; aplikacja informuje, że środek dobiera się do rodzaju farby i posadzki (2026-10-23).
- [x] **Dezynfekcja: przy jakich usługach ją podsuwać?** (otwarte pytanie 3 w `PLAN.md`)
  - Opcje: A) przypiąć do sprzątania biur i sprzątania po wynajmie; B) pokazywać jako kategorię do ręcznego wyboru przy każdej usłudze; C) nie pokazywać w wersji 1.
  - Dlaczego ważne: wpływa na ekran doboru chemii. Dziś 5 środków dezynfekcyjnych nie jest przypisanych do żadnej usługi.
  - Ustalono: **B** – dezynfekcję można dodać ręcznie przy każdej usłudze, aplikacja jej nie podsuwa (2026-10-23).

## 2. Konta, konsole, sekrety

Aplikacja nie ma serwera ani kluczy API (dane tylko w przeglądarce, R23), a hosting to GitHub Pages na istniejącym repo, w którym `gh` jest zalogowany (doctor: OK). Kont zewnętrznych i sekretów nie trzeba. Włączenie GitHub Pages należy do etapu 6.

- [x] 🔓 **Zainstalować `agent-browser`** — **[blokuje: faza 1]** (bramka środowiska E2E)
  - Po co: tester E2E autopilota odgrywa scenariusze `[E2E]` w przeglądarce przez `agent-browser` wywoływany z PATH. Plan ma 19 scenariuszy w fazach 3–6, a bramka gotowości sprawdza narzędzie przed startem autopilota.
  - Jak: `npm install -g agent-browser && agent-browser install` (w Git Bash albo PowerShell z Node.js w PATH).
  - Dowód: `bash .claude/scripts/doctor/doctor.sh` pokazuje `OK` w wierszu `agent-browser`.
  - Zrobione 2026-10-24: `agent-browser` 0.39.2 (npm pominął skrypt postinstall, ale binarka dla Windows jest w paczce) i Chrome 156 w `~/.agent-browser/browsers/`; doctor: `OK`.
- [ ] 🔓 **Autoryzować serwer MCP pluginu `figma`**
  - Po co: buildery z Figmą (`feature-builder-ui-figma`, `feature-builder-fullstack-figma`) czytają makiety narzędziami `mcp__plugin_figma_figma__*`. W sesji 2026-10-23 serwer `plugin:figma:figma` wymagał autoryzacji. Łącznik Figmy w aplikacji Claude działa (`whoami`: konto „Łukasz XYZ”), ale to osobny serwer.
  - Jak: w interaktywnym terminalu `claude` polecenie `/mcp` → `plugin:figma:figma` → zaloguj się kontem Figma, na którym będą makiety.
  - Dowód: `/mcp` pokazuje `plugin:figma:figma` jako połączony.
  - Nie blokuje etapu 5 (`/dev-plan` 2026-10-24): buildery nie czytają Figmy, tylko PNG i `docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md`, bo limit MCP konta jest wyczerpany.

### Środowisko E2E

- [x] 🔓 **Utworzyć `.env.e2e` dla serwera `scripts/serwer-dev.mjs`** — **[blokuje: faza 1]** (bramka środowiska E2E; serwer powstaje w IU-1)
  - Po co: plan ma 19 scenariuszy `[E2E]`. Bez `.env.e2e` bramka gotowości zatrzyma autopilota przed fazą 1. Aplikacja nie ma bazy ani serwera API, więc wystarczą dwa klucze (bez Supabase i konta testowego).
  - Jak: w katalogu projektu utwórz plik `.env.e2e` z dwiema liniami: `E2E_URL=http://localhost:5174` i `E2E_START="node scripts/serwer-dev.mjs --port 5174"`. Plik jest już ignorowany przez `.gitignore` (wzorzec `.env.*`). Skrypt serwera napisze autopilot w IU-1. Do tego czasu start serwera jest odroczony, bo repo nie ma jeszcze aplikacji, a pierwsze scenariusze są w fazie 3.
  - Dowód: `test -f .env.e2e && git check-ignore -q .env.e2e && echo OK` zwraca OK, a `grep -c '^E2E_START=' .env.e2e` zwraca 1.
  - Zrobione 2026-10-24: oba dowody przechodzą, doctor pokazuje `OK` w wierszu „port E2E”.

## 3. Assety i treści

Treści ustala właściciel na podstawie praktyki własnej firmy. Ustalono 2026-10-23: zakresy, pytania do klienta i warunki oferty szkicuje Claude (z cenników w `research/` i researchu z brainstormu), a właściciel je poprawia i zatwierdza. Usług jest 15, bo doszło doczyszczanie mieszkań i obiektów po budowie.

- [x] 🔓 **Zakres „wchodzi / nie wchodzi”** dla każdej usługi i rodzaju sprzątania (R19) — **[blokuje: faza 6]** (IU-22). Usługi: mieszkanie standard, gruntowne, po remoncie, po wynajmie; biura; okna; AGD; tapicerka; dywany; mycie posadzek; doczyszczanie; kostka; elewacja; hale. Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/zakresy.json`.
  - Zatwierdzone przez właściciela 2026-10-24 bez zmian (przegląd: `docs/operator/etap-5-pytania-i-zakresy.html`). 13 usług; biura mają osobny zakres wariantu `jednorazowe`, a zakres wariantu zastępuje w całości zakres usługi. Wnętrza szafek są „poza ceną” (dodatek AGD), z wyjątkiem sprzątania po wynajmie (puste szafki w cenie); w halach kurz i pajęczyny do 2 m.
  - Format (z planu): `{ "meta": { "wersja", "opis" }, "uslugi": { "<id usługi z data/ceny.json>": { "wchodzi": ["…"], "nie_wchodzi": ["…"], "warianty": { "<id wariantu>": { "wchodzi": [], "nie_wchodzi": [] } } } } }`. Wpis potrzebuje każda usługa poza AGD (`tylko_dodatek`); `warianty` są opcjonalne (np. biuro jednorazowo i w abonamencie). Teksty to krótkie punkty, jak na makiecie `oferta-klient` („Odkurzanie i mycie podłóg”).
  - Jak: po fazie 5 albo wcześniej — sesja z Claude: szkic z cenników w `research/`, Twoja poprawka, zapis pliku, commit, odhaczenie tej pozycji i świeży run autopilota.
  - Dowód: plik istnieje, a test `src/oferta/tresc.test.js` (IU-22) nie zgłasza braków.
- [x] 🔓 **Pytania do klienta przed wyceną** dla każdej usługi (R13), z zaznaczeniem, które odpowiedzi ustawiają coś w wycenie (np. zwierzęta → sierść, odległość → dojazd) — **[blokuje: faza 5]** (IU-20). Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/pytania.json`.
  - Zatwierdzone przez właściciela 2026-10-24 bez zmian (przegląd: `docs/operator/etap-5-pytania-i-zakresy.html`). Wspólne są tylko dojazd (`dojazd_km`) i termin, a na ekranie idą przed pytaniami usługi. To samo `id` w kilku usługach oznacza to samo pytanie (ten sam typ i opcje), więc `sprawdzPytania` sprawdza powtórzone `id` w liście jednej usługi (wspólne + usługa), nie w całym pliku. Skutki brudu: zwierzęta → sierść 1 w pokojach (jak na makiecie); gruntowne: tłuszcz 2 w kuchni, kamień 2 i pleśń 2 w łazience; po wynajmie: zwierzęta najemców → sierść 2 wszędzie, pleśń 2 w łazience; po remoncie: remont „Generalny” → pył budowlany 3 wszędzie.
  - Format (z planu): `{ "meta": { "wersja", "opis" }, "wspolne": [Pytanie], "uslugi": { "<id usługi>": [Pytanie] }, "zdjecia": { "<id usługi>": { "podpowiedz", "prosba" } } }` (`zdjecia` opcjonalne: podpowiedź na ekranie pytań, np. „Poproś o zdjęcia łazienki i kuchni – łatwiej ocenić stan.”, i tekst prośby do skopiowania dla klienta), gdzie `Pytanie = { "id", "tresc", "typ": "tak_nie" | "wybor" | "liczba" | "tekst", "opcje"?, "jednostka"?, "skutek"? }`. Skutki są tylko dwa: `{ "rodzaj": "brud", "brud": "<id z data/normy.json, np. siersc>", "poziom": 1–3, "pomieszczenie": "*" albo typ, "gdy": "tak" albo opcja }` i `{ "rodzaj": "dojazd_km" }` (tylko przy typie `liczba`). Wpis w `uslugi` potrzebuje każda usługa poza AGD (może być pusta lista, jeśli wystarczą wspólne).
  - Jak: po fazie 4 albo wcześniej — sesja z Claude jak przy zakresie; plik, commit, odhaczenie, świeży run autopilota.
  - Dowód: test `src/silnik/pytania.test.js` (IU-20) — `sprawdzPytania` na tym pliku zwraca pustą listę.
- [x] 🔓 **Treść domyślnych warunków oferty** (R20): odwołanie (bezpłatnie do 24 h, później 50%), brak dostępu do lokalu (50%), zdjęcia przed i po, zastrzeżenie o stanie lokalu przy szybkiej wycenie, ważność 14 dni. Zatwierdzone przez właściciela 2026-10-24; zaliczka wypadła, bo w praktyce się jej nie stosuje. Ląduje w: `data/`.
- [x] ~~**Domyślne wartości ustawień firmy** (R1, R24)~~ — nie dotyczy: blok A (koszty stałe, godziny u klientów, kwota „na rękę”) wycięty 2026-10-24. Ustawienia z R24 mają już wartości domyślne (zwolniony z VAT, tempo 1,3×).
- [ ] 🔓 **Potwierdzenie stawki VAT na sprzątanie** (R8): 23% (pewność średnio-wysoka). Kwoty ZUS i podatku dochodowego nie są już potrzebne (blok A wycięty 2026-10-24). Dostarcza: Claude – sprawdzenie w źródłach z datą i linkiem (decyzja właściciela 2026-10-24). Ląduje w: `data/domyslne.json` (`stawka_vat_proc`).
  - Nie blokuje autopilota: IU-6 wpisuje 23% z uwagą „do potwierdzenia”, a inna stawka to zmiana jednej wartości w danych. Plan liczy VAT według `podstawa_ceny` usługi (decyzja właściciela 2026-10-24).
- [ ] 🔓 **Ceny i normy nowej usługi „doczyszczanie mieszkań i obiektów po budowie”** (decyzja z sekcji 1). Dostarcza: Claude – ceny ze źródłami w `research/`, wpis w `data/ceny.json` i normy w `scripts/kalibracja.ps1`, przeliczenie kalibracji.
  - Nie blokuje autopilota: aplikacja czyta katalog usług z danych, więc nowa usługa pojawi się bez zmian w kodzie. Najlepiej zrobić ją przed fazą 5 albo razem z pytaniami i zakresami, bo testy wymagają dla każdej usługi wpisu w `data/pytania.json` i `data/zakresy.json` oraz pola `szybka_wycena` w `data/ceny.json`.
- [~] 🔓 **Logo i kolory Simple Perfection**: logo w wektorze (SVG, ewentualnie PNG 1024 px) w wersji na jasne i ciemne tło oraz kody kolorów marki (HEX). Odłożone 2026-10-24: makiety powstają w kolorach wersji 3, a markę dołożymy najpóźniej przed publikacją (etap 6). Dostarcza: właściciel. Ląduje w: plik Figmy (zmienne kolorów) i katalog ikon aplikacji.
- [ ] 🔓 **Ikona aplikacji (PWA)**: 512×512 i 192×192 (także w wersji maskable), 180×180 dla iPhone'a, favicon. Zależy od nazwy i stylu (sekcja 1). Dostarcza: właściciel albo projektant. Gdy wybrany jest neutralny styl bez marki: `[~]` prosta ikona wygenerowana przy implementacji. Ląduje w: `ikony/` (`ikona.svg`, `ikona-192.png`, `ikona-512.png`, `ikona-maskable-512.png`, `apple-touch-icon.png`).
  - Nie blokuje autopilota: IU-13 generuje ikony zastępcze skryptem `scripts/ikony-zastepcze.mjs`. Właściwa ikona jest potrzebna przed publikacją (etap 6).

## 4. Makiety

Po zaprojektowaniu wklej URL-e — `/dev-plan` weźmie je stąd zamiast pytać. Wszystkie ekrany są nowe (w repo nie ma jeszcze kodu aplikacji). Breakpointy: telefon i komputer (`PLAN.md`: PWA na telefon i komputer).

Makiety projektuje Claude w Figmie (decyzja z 2026-10-23). Punkty wyjścia to dwa szkice: wersja 1 neutralna (`docs/operator/etap-5-szkic-ekranow.html`, 4 ekrany) i wersja 2 w stylu aplikacji na telefon (`docs/operator/etap-5-szkic-ekranow-v2.html`, 5 ekranów). Wersja 3 powstała tylko w Figmie i czerpie z najlepiej ocenianych aplikacji dla firm usługowych (Housecall Pro 4,7/5 i Jobber 4,6/5 na Capterra, do tego QuotePro i Joist). Przejmuje z nich: ekran startowy jako listę „do zrobienia” z podsumowaniem miesiąca, przycisk „+” w dolnym pasku, wycenę jako listę pozycji z pozycjami opcjonalnymi i paskiem „Razem”, kolorowe statusy oraz ofertę w formie dokumentu. Wszystkie trzy wersje są w pliku Figmy [Wyceny sprzątania – etap 5, szkice](https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej) (strona „Szkice etapu 5”, sekcje „Wersja 1”, „Wersja 2”, „Wersja 3” i „Komponenty”). Kolejność: najpierw decyzje o limicie MCP, stylu i nazwie (sekcja 1), potem makiety. Właściciel akceptuje każdy ekran i dopiero wtedy stawia `[x]` przy pozycji z URL-em.

- [x] **Wyeksportować 14 PNG makiet z aplikacji Figma** — **[blokuje: faza 3]** (IU-9 i kolejne jednostki UI)
  - Zrobione 2026-10-24: właściciel wyeksportował 5 sekcji i arkusz komponentów; Claude wyciął z nich 14 ekranów skryptem (kolumny 720 px + 24 px marginesu), arkusz zapisany jako `komponenty.png`.
  - Po co: buildery UI biorą układ ekranów z PNG i z `docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md`, bo limit MCP Figmy jest wyczerpany. Skrypt sprawdzający plan wymaga tych plików już przy generowaniu zadania.
  - Jak: w Figmie na stronie „Makiety etapu 5” zaznacz 14 ramek (nazwy jak niżej), w panelu Export ustaw PNG 2x i kliknij Export. Pliki zapisz w `docs/plans/etap-5-aplikacja-wyceny-figma/` z nazwami ramek: `ekran-startowy.png`, `ustawienia-firmy.png`, `szybka-wycena.png`, `pytania-do-klienta.png`, `kreator-wybor-uslugi.png`, `kreator-pomieszczenia.png`, `kreator-pozycje.png`, `kreator-dodatki.png`, `dobor-chemii.png`, `podsumowanie-wyceny.png`, `zakonczenie-zlecenia.png`, `oferta-edycja.png`, `oferta-klient.png`, `kopia-zapasowa.png`. Eksport w aplikacji Figma nie zużywa limitu MCP.
  - Dowód: `ls docs/plans/etap-5-aplikacja-wyceny-figma/*.png | wc -l` zwraca 14.

Stan 2026-10-24: makiety głównego stanu wszystkich 14 ekranów (telefon, 360 px) są na stronie „Makiety etapu 5” w sekcjach 1–5 według przepływu, a nazwy ramek są takie same jak nazwy ekranów niżej. Wszystkie ekrany pokazują jeden przykład: mieszkanie 50 m², standard, mazowieckie, 294 zł z dojazdem. Nowe komponenty (chip, licznik, wiersz, opcja, pytanie, produkt chemii, pole, baner, pasek postępu) są w sekcji „Komponenty etapu 5”. Kolory wszystkich komponentów i ekranów v3 są podpięte pod zmienne kolekcji „Kolory v3”, więc przejście na barwy Simple Perfection to zmiana wartości zmiennych. Zakres prac i warunki na ekranach ofert to szkic do zatwierdzenia (sekcja 3). Do zrobienia po akceptacji: pozostałe stany z listy przy każdym ekranie i wersja na komputer. Właściciel zaakceptował główny stan wszystkich 14 ekranów (2026-10-24). **Limit Figmy wyczerpany 2026-10-24:** `use_figma` jednak wlicza się do limitu 20 wywołań miesięcznie (po 21 wywołaniach z 23–24 października, w tym `whoami`, Figma odrzuca kolejne). Do odnowienia limitu Claude nie może ani zmieniać, ani czytać pliku. Plan i buildery nie mogą więc czytać makiet z Figmy; specyfikacją dla nich są opisy ekranów w tej sekcji, podgląd HTML i zrzuty wyeksportowane ręcznie z Figmy (eksport w aplikacji Figma nie korzysta z limitu).

- [x] **`ekran-startowy`** — nowy
  - Co pokazuje: zapisane wyceny i wykonane zlecenia, wejście do szybkiej i do dokładnej wyceny, przypomnienie o kopii danych.
  - Stany: pierwsze uruchomienie (pusta lista) · lista wycen i zleceń · przypomnienie o kopii · znacznik „ustawienia domyślne – uzupełnij”
  - Breakpointy: mobile + desktop
  - Wymagania: R16, R23, R24; `PLAN.md` etap 5 (zapis wycen)
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=10-322 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`ustawienia-firmy`** — nowy
  - Co pokazuje: kreator pierwszego uruchomienia i późniejsza edycja ustawień firmy: województwo, status VAT, dane firmy do oferty (nazwa, telefon, e-mail, opcjonalnie NIP), tempo pracy i szacunki kosztów zlecenia (chemia, sprzęt, dojazd).
  - Stany: pierwsze uruchomienie krok po kroku · pominięty kreator (wartości domyślne) · błędy walidacji · tempo domyślne 1,3× · tempo z N zleceń z powrotem do wartości ręcznej
  - Breakpointy: mobile + desktop
  - Wymagania: R5, R8, R15, R17, R24
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=10-429 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- ~~`stawka-minimalna`~~ — ekran usunięty 2026-10-24 razem z ceną minimalną (blok A).
- [x] **`szybka-wycena`** — nowy
  - Co pokazuje: krótki formularz do rozmowy telefonicznej (rodzaj sprzątania, metraż, łazienki, kuchnia lub aneks, spodziewany stan) i wynik jako widełki z gotowym tekstem dla klienta.
  - Stany: usługa wyceniana przez telefon (widełki) · usługa wymagająca oględzin („orientacyjnie od X zł” i zalecenie oględzin lub zdjęć) · tekst skopiowany · przejście do dokładnej wyceny
  - Breakpointy: mobile + desktop (głównie telefon w trakcie rozmowy)
  - Wymagania: R5, R10, R11, R12, R14
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-471 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`pytania-do-klienta`** — nowy (komponent szybkiej i dokładnej wyceny)
  - Co pokazuje: lista pytań do klienta dla wybranej usługi z miejscem na odpowiedzi zapisywane przy wycenie.
  - Stany: bez odpowiedzi · częściowo wypełnione · odpowiedź, która ustawiła coś w wycenie (np. sierść, dojazd)
  - Breakpointy: mobile + desktop
  - Wymagania: R13
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-561 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`kreator-wybor-uslugi`** — nowy
  - Co pokazuje: pierwszy krok dokładnej wyceny z paskiem postępu: wybór usługi i województwa (podpowiedziane z ustawień firmy).
  - Stany: brak wyboru · wybrana usługa z pomieszczeniami · wybrana usługa z pozycjami · AGD tylko jako dodatek
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5 (kreator, pasek postępu)
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-622 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`kreator-pomieszczenia`** — nowy
  - Co pokazuje: usługi z pomieszczeniami (mieszkania, biura): lista pomieszczeń z metrażem i poziomem brudu 1–3 dla każdego rodzaju brudu; przy biurach wariant jednorazowy albo abonament.
  - Stany: pusta lista pomieszczeń · dodane pomieszczenia · dane przeniesione z szybkiej wyceny · błąd metrażu
  - Breakpointy: mobile + desktop
  - Wymagania: R14; `PLAN.md` etap 5
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-786 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`kreator-pozycje`** — nowy
  - Co pokazuje: usługi z pozycjami (okna, tapicerka, dywany, posadzki, doczyszczanie, kostka, elewacja, hale): ilości lub metraż pozycji, dopłaty, poziom brudu tam, gdzie usługa go ma.
  - Stany: brak pozycji · pozycje wybrane · dopłata (np. mech, olej) · próg metrażu zmieniający cenę za m² · błąd ilości
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-965 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`kreator-dodatki`** — nowy
  - Co pokazuje: dodatki do usługi (AGD, szafki, balkon) i dojazd w kilometrach.
  - Stany: bez dodatków · wybrane dodatki · dojazd w promieniu bez opłat · dojazd płatny
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-1073 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`dobor-chemii`** — nowy
  - Co pokazuje: środki dobrane do zaznaczonego brudu i pozycji usługi, z przeznaczeniem, pH, stężeniem roboczym, ceną i linkiem do karty SDS.
  - Stany: kilka kategorii środków · pozycja bez kategorii (zamiatanie na sucho, usuwanie farby) · produkt bez pH (np. Buzil) · karta SDS dostępna tylko na stronie produktu (Buzil)
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5 (krok chemii), cel 2 w `PLAN.md`
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-1212 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`podsumowanie-wyceny`** — nowy
  - Co pokazuje: cena rynkowa (mediana i widełki) jako cena proponowana, koszt zlecenia (czas pracy, chemia, sprzęt, dojazd) i zdanie „zostaje dla Ciebie X zł, czyli Y zł za godzinę pracy”; ręczna zmiana ceny z bieżącym przeliczeniem.
  - Stany: cena z modelu · cena zmieniona ręcznie · firma zwolniona z VAT · czynny podatnik VAT (brutto i netto)
  - Breakpointy: mobile + desktop
  - Wymagania: R5, R7, R8, R9
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-1339 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`zakonczenie-zlecenia`** — nowy
  - Co pokazuje: oznaczenie wyceny jako wykonanej, wpis faktycznego czasu pracy, plan i fakt, realna stawka za godzinę i nowe tempo.
  - Stany: pierwsze zlecenie · tempo z N zleceń · pierwsze osobne tempo usługi (po 3 wpisach) · błąd czasu
  - Breakpointy: mobile + desktop
  - Wymagania: R15, R16, R17
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-1602 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`oferta-edycja`** — nowy
  - Co pokazuje: przygotowanie oferty z wyceny: dane firmy, opcjonalnie adres i termin, zakres „wchodzi / nie wchodzi”, dodatki opcjonalne z cenami, warunki, ważność; utworzenie linku i PDF.
  - Stany: brak danych firmy (nazwa, telefon) · zakres zmieniony tylko dla tej oferty · warunki zmienione · link skopiowany · PDF gotowy do druku
  - Breakpointy: mobile + desktop
  - Wymagania: R18, R19, R20, R21
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-1438 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`oferta-klient`** — nowy
  - Co pokazuje: oferta, którą klient otwiera z linku bez logowania, i jej wersja do druku. Nigdy nie pokazuje kosztów firmy, tempa ani tego, ile zostaje dla właściciela.
  - Stany: oferta ważna · oferta po terminie ważności · uszkodzony lub niepełny link · wydruk A4
  - Breakpointy: mobile + desktop + druk A4
  - Wymagania: R18, R21, R22
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=11-1545 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)
- [x] **`kopia-zapasowa`** — nowy
  - Co pokazuje: eksport wszystkich danych do pliku i import z pliku.
  - Stany: eksport gotowy · import udany · zły lub uszkodzony plik · import nadpisujący istniejące dane (potwierdzenie)
  - Breakpointy: mobile + desktop
  - Wymagania: R23
  - URL Figma: https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej?node-id=10-578 (stan główny, telefon; zaakceptowany przez właściciela 2026-10-24)

## Gdzie to ląduje

- 🔓 Treści z sekcji 3 (zakresy, pytania, warunki, stawka VAT) → pliki danych w `data/` (nazwy ustali plan), w repo.
- 🔓 Ikony → katalog aplikacji w repo.
- 🔒 Brak sekretów: aplikacja nie ma serwera ani kluczy API.

---
Gdy **[blokuje: planowanie]** są odhaczone: `/dev-plan docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`
