---
feature_slug: etap-5-aplikacja-wyceny
origin: docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md
utworzono: 2026-10-23
dotyka_ui: true
status: do-zrobienia
---

# Etap 5: aplikacja PWA do wycen. Przygotowanie przed implementacją

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
- [x] **Jaki kierunek wyglądu?** — Ustalono: **wersja 3** (granat i zieleń, start „do zrobienia”, przycisk „+”, wycena jako lista pozycji, oferta jak dokument; sekcja „Wersja 3” w pliku Figmy) jest bazą makiet wszystkich ekranów (2026-10-23).
- [x] **Czyja marka?** (rozstrzygnij przed projektowaniem makiet)
  - Opcje: A) neutralny wygląd bez marki autora; B) barwy i logo Simple Perfection; C) neutralny wygląd z dyskretną stopką „przygotował Simple Perfection”.
  - Dlaczego ważne: aplikacja jest publiczna dla dowolnej firmy (ustalenie z brainstormu). Oferta (R18) idzie do klientów tych firm i nie ma logo w wersji 1.
  - Ustalono: **B** – barwy i logo Simple Perfection w całej aplikacji; kolory wersji 3 dopasujemy do marki (2026-10-23). Założenie do potwierdzenia przy makietach: oferta dla klienta pokazuje firmę, która z aplikacji korzysta, a nie markę Simple Perfection.
- [x] **Jak nazywa się aplikacja?** (tytuł, nazwa w manifeście PWA i na ekranie telefonu)
  - Opcje: A) robocza „Wyceny sprzątania” (jak repo); B) własna nazwa: _(wpisz)_.
  - Dlaczego ważne: od nazwy zależy ikona (sekcja 3), a nazwa pojawia się w nagłówkach makiet, więc warto ją ustalić przed ich projektowaniem. Planowania nie blokuje.
  - Ustalono: właściciel nie ma preferencji (2026-10-23), więc na makietach jest robocza „Wyceny sprzątania” z marką Simple Perfection w logo. Można ją zmienić do publikacji (etap 6).
- [ ] **Pod jakim adresem będzie aplikacja?**
  - Opcje: A) `simpleperfection.github.io/wyceny-sprzatanie` (GitHub Pages, bez kosztów); B) własna domena albo subdomena: _(wpisz)_.
  - Dlaczego ważne: link do oferty (R18, R22) zawiera adres aplikacji. Zmiana adresu po rozesłaniu pierwszych ofert może zepsuć wysłane linki. Planowania nie blokuje; decyzja potrzebna przed publikacją (etap 6).
  - Ustalono: odłożone do etapu 6 – właściciel zdecyduje przed publikacją (2026-10-23). Opcje do wyboru wtedy: subdomena firmy (np. `wyceny.simple-perfection.pl`, wpis DNS) albo adres GitHub Pages.
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

- [ ] 🔓 **Zainstalować `agent-browser`**
  - Po co: tester E2E autopilota odgrywa scenariusze `[E2E]` w przeglądarce przez `agent-browser` wywoływany z PATH. Dziś doctor pokazuje „nie dotyczy”, bo nie ma jeszcze scenariuszy. Po `/dev-plan` pokaże BRAK i bramka gotowości nie przekaże zadania autopilotowi.
  - Jak: `npm install -g agent-browser && agent-browser install` (w Git Bash albo PowerShell z Node.js w PATH).
  - Dowód: `bash .claude/scripts/doctor/doctor.sh` pokazuje `OK` w wierszu `agent-browser`.
- [ ] 🔓 **Autoryzować serwer MCP pluginu `figma`**
  - Po co: buildery z Figmą (`feature-builder-ui-figma`, `feature-builder-fullstack-figma`) czytają makiety narzędziami `mcp__plugin_figma_figma__*`. W sesji 2026-10-23 serwer `plugin:figma:figma` wymagał autoryzacji. Łącznik Figmy w aplikacji Claude działa (`whoami`: konto „Łukasz XYZ”), ale to osobny serwer.
  - Jak: w interaktywnym terminalu `claude` polecenie `/mcp` → `plugin:figma:figma` → zaloguj się kontem Figma, na którym będą makiety.
  - Dowód: `/mcp` pokazuje `plugin:figma:figma` jako połączony.

## 3. Assety i treści

Treści ustala właściciel na podstawie praktyki własnej firmy. Ustalono 2026-10-23: zakresy, pytania do klienta i warunki oferty szkicuje Claude (z cenników w `research/` i researchu z brainstormu), a właściciel je poprawia i zatwierdza. Usług jest 15, bo doszło doczyszczanie mieszkań i obiektów po budowie.

- [ ] 🔓 **Zakres „wchodzi / nie wchodzi”** dla każdej usługi i rodzaju sprzątania (R19). Usługi: mieszkanie standard, gruntowne, po remoncie, po wynajmie; biura; okna; AGD; tapicerka; dywany; mycie posadzek; doczyszczanie; kostka; elewacja; hale. Dostarcza: właściciel (szkic: Claude). Ląduje w: `data/` (plik ustali plan).
- [ ] 🔓 **Pytania do klienta przed wyceną** dla każdej usługi (R13), z zaznaczeniem, które odpowiedzi ustawiają coś w wycenie (np. zwierzęta → sierść, odległość → dojazd). Dostarcza: właściciel (szkic: Claude). Ląduje w: `data/`.
- [ ] 🔓 **Treść domyślnych warunków oferty** (R20): odwołanie (bezpłatnie do 24 h, później 50%), brak dostępu do lokalu (50%), zaliczka (domyślnie wyłączona, podpowiedź 50%), zdjęcia przed i po, zastrzeżenie o stanie lokalu przy szybkiej wycenie, ważność 14 dni. Dostarcza: właściciel (potwierdza brzmienie). Ląduje w: `data/`.
- [ ] 🔓 **Domyślne wartości ustawień firmy** (R1, R24): koszty stałe (auto i paliwo, OC, księgowość, telefon i internet, reklama), domyślna liczba godzin u klientów w miesiącu i kwota „na rękę”. Research daje tylko szerokie widełki (OC: pewność niska), więc najlepsze są realne kwoty z firmy właściciela. Dostarcza: właściciel. Ląduje w: `data/`.
- [ ] 🔓 **Potwierdzenie kwot podatkowych i ZUS na 2026** (R4): tabela w dokumencie wymagań, zwłaszcza VAT 23% na sprzątanie (pewność średnio-wysoka) i ryczałt 8,5%, oraz brzmienie zastrzeżenia „to nie jest porada podatkowa”. Dostarcza: właściciel, opcjonalnie z księgowym. Ląduje w: `data/`.
- [ ] 🔓 **Logo i kolory Simple Perfection**: logo w wektorze (SVG, ewentualnie PNG 1024 px) w wersji na jasne i ciemne tło oraz kody kolorów marki (HEX). Bez nich makiety zostaną w kolorach wersji 3. Dostarcza: właściciel. Ląduje w: plik Figmy (zmienne kolorów) i katalog ikon aplikacji.
- [ ] 🔓 **Ikona aplikacji (PWA)**: 512×512 i 192×192 (także w wersji maskable), 180×180 dla iPhone'a, favicon. Zależy od nazwy i stylu (sekcja 1). Dostarcza: właściciel albo projektant. Gdy wybrany jest neutralny styl bez marki: `[~]` prosta ikona wygenerowana przy implementacji. Ląduje w: katalog ikon aplikacji (ustali plan).

## 4. Makiety

Po zaprojektowaniu wklej URL-e — `/dev-plan` weźmie je stąd zamiast pytać. Wszystkie ekrany są nowe (w repo nie ma jeszcze kodu aplikacji). Breakpointy: telefon i komputer (`PLAN.md`: PWA na telefon i komputer).

Makiety projektuje Claude w Figmie (decyzja z 2026-10-23). Punkty wyjścia to dwa szkice: wersja 1 neutralna (`docs/operator/etap-5-szkic-ekranow.html`, 4 ekrany) i wersja 2 w stylu aplikacji na telefon (`docs/operator/etap-5-szkic-ekranow-v2.html`, 5 ekranów). Wersja 3 powstała tylko w Figmie i czerpie z najlepiej ocenianych aplikacji dla firm usługowych (Housecall Pro 4,7/5 i Jobber 4,6/5 na Capterra, do tego QuotePro i Joist). Przejmuje z nich: ekran startowy jako listę „do zrobienia” z podsumowaniem miesiąca, przycisk „+” w dolnym pasku, wycenę jako listę pozycji z pozycjami opcjonalnymi i paskiem „Razem”, kolorowe statusy oraz ofertę w formie dokumentu. Wszystkie trzy wersje są w pliku Figmy [Wyceny sprzątania – etap 5, szkice](https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej) (strona „Szkice etapu 5”, sekcje „Wersja 1”, „Wersja 2”, „Wersja 3” i „Komponenty”). Kolejność: najpierw decyzje o limicie MCP, stylu i nazwie (sekcja 1), potem makiety. Właściciel akceptuje każdy ekran i dopiero wtedy stawia `[x]` przy pozycji z URL-em.

- [ ] **`ekran-startowy`** — nowy
  - Co pokazuje: zapisane wyceny i wykonane zlecenia, wejście do szybkiej i do dokładnej wyceny, przypomnienie o kopii danych.
  - Stany: pierwsze uruchomienie (pusta lista) · lista wycen i zleceń · przypomnienie o kopii · znacznik „ustawienia domyślne – uzupełnij”
  - Breakpointy: mobile + desktop
  - Wymagania: R16, R23, R24; `PLAN.md` etap 5 (zapis wycen)
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`ustawienia-firmy`** — nowy
  - Co pokazuje: kreator pierwszego uruchomienia i późniejsza edycja ustawień firmy: województwo, VAT, forma podatku, etap ZUS z datą rozpoczęcia, koszty stałe, kwota na rękę, godziny u klientów, tempo pracy.
  - Stany: pierwsze uruchomienie krok po kroku · pominięty kreator (wartości domyślne) · błędy walidacji · podpowiedzi kwot ze źródłem i datą „stan na” · tempo domyślne 1,3× · tempo z N zleceń z powrotem do wartości ręcznej
  - Breakpointy: mobile + desktop
  - Wymagania: R1, R3, R4, R15, R17, R24
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`stawka-minimalna`** — nowy
  - Co pokazuje: minimalna stawka za godzinę z rozbiciem (ZUS, zdrowotna, podatek, koszty stałe, kwota na rękę), liczba zleceń „mieszkanie 50 m²” potrzebnych w miesiącu, ile dziś zostaje ponad minimum dzięki niższej składce i od którego miesiąca składka rośnie.
  - Stany: ulga na start · ZUS preferencyjny · mały ZUS plus lub pełny (bez dopłaty z niższej składki) · ustawienia domyślne (nieuzupełnione)
  - Breakpointy: mobile + desktop
  - Wymagania: R2, R3, R4
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`szybka-wycena`** — nowy
  - Co pokazuje: krótki formularz do rozmowy telefonicznej (rodzaj sprzątania, metraż, łazienki, kuchnia lub aneks, spodziewany stan) i wynik jako widełki z gotowym tekstem dla klienta.
  - Stany: usługa wyceniana przez telefon (widełki) · usługa wymagająca oględzin („orientacyjnie od X zł” i zalecenie oględzin lub zdjęć) · dolna granica podniesiona do ceny minimalnej · ostrzeżenie: cena ponad widełkami rynku · tekst skopiowany · przejście do dokładnej wyceny
  - Breakpointy: mobile + desktop (głównie telefon w trakcie rozmowy)
  - Wymagania: R5, R6, R10, R11, R12, R14
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`pytania-do-klienta`** — nowy (komponent szybkiej i dokładnej wyceny)
  - Co pokazuje: lista pytań do klienta dla wybranej usługi z miejscem na odpowiedzi zapisywane przy wycenie.
  - Stany: bez odpowiedzi · częściowo wypełnione · odpowiedź, która ustawiła coś w wycenie (np. sierść, dojazd)
  - Breakpointy: mobile + desktop
  - Wymagania: R13
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`kreator-wybor-uslugi`** — nowy
  - Co pokazuje: pierwszy krok dokładnej wyceny z paskiem postępu: wybór usługi i województwa (podpowiedziane z ustawień firmy).
  - Stany: brak wyboru · wybrana usługa z pomieszczeniami · wybrana usługa z pozycjami · AGD tylko jako dodatek
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5 (kreator, pasek postępu)
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`kreator-pomieszczenia`** — nowy
  - Co pokazuje: usługi z pomieszczeniami (mieszkania, biura): lista pomieszczeń z metrażem i poziomem brudu 1–3 dla każdego rodzaju brudu; przy biurach wariant jednorazowy albo abonament.
  - Stany: pusta lista pomieszczeń · dodane pomieszczenia · dane przeniesione z szybkiej wyceny · błąd metrażu
  - Breakpointy: mobile + desktop
  - Wymagania: R14; `PLAN.md` etap 5
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`kreator-pozycje`** — nowy
  - Co pokazuje: usługi z pozycjami (okna, tapicerka, dywany, posadzki, doczyszczanie, kostka, elewacja, hale): ilości lub metraż pozycji, dopłaty, poziom brudu tam, gdzie usługa go ma.
  - Stany: brak pozycji · pozycje wybrane · dopłata (np. mech, olej) · próg metrażu zmieniający cenę za m² · błąd ilości
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`kreator-dodatki`** — nowy
  - Co pokazuje: dodatki do usługi (AGD, szafki, balkon) i dojazd w kilometrach.
  - Stany: bez dodatków · wybrane dodatki · dojazd w promieniu bez opłat · dojazd płatny
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`dobor-chemii`** — nowy
  - Co pokazuje: środki dobrane do zaznaczonego brudu i pozycji usługi, z przeznaczeniem, pH, stężeniem roboczym, ceną i linkiem do karty SDS.
  - Stany: kilka kategorii środków · pozycja bez kategorii (zamiatanie na sucho, usuwanie farby) · produkt bez pH (np. Buzil) · karta SDS dostępna tylko na stronie produktu (Buzil)
  - Breakpointy: mobile + desktop
  - Wymagania: `PLAN.md` etap 5 (krok chemii), cel 2 w `PLAN.md`
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`podsumowanie-wyceny`** — nowy
  - Co pokazuje: cena rynkowa (mediana i widełki), cena minimalna firmy i cena proponowana z miejscem na rynku; ręczna zmiana ceny z bieżącym „zostaje dla Ciebie X zł, Y zł/h”.
  - Stany: rynek powyżej minimum · minimum powyżej mediany (proponowane minimum) · cena ponad widełkami rynku (ostrzeżenie z podpowiedziami) · ręczna cena poniżej minimum (na czerwono) · firma zwolniona z VAT · czynny podatnik VAT (brutto i netto)
  - Breakpointy: mobile + desktop
  - Wymagania: R5, R6, R7, R8, R9
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`zakonczenie-zlecenia`** — nowy
  - Co pokazuje: oznaczenie wyceny jako wykonanej, wpis faktycznego czasu pracy, plan i fakt, realna stawka za godzinę i nowe tempo.
  - Stany: pierwsze zlecenie · tempo z N zleceń · pierwsze osobne tempo usługi (po 3 wpisach) · stawka poniżej minimum · błąd czasu
  - Breakpointy: mobile + desktop
  - Wymagania: R15, R16, R17
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`oferta-edycja`** — nowy
  - Co pokazuje: przygotowanie oferty z wyceny: dane firmy, opcjonalnie adres i termin, zakres „wchodzi / nie wchodzi”, dodatki opcjonalne z cenami, warunki, ważność; utworzenie linku i PDF.
  - Stany: brak danych firmy (nazwa, telefon) · zakres zmieniony tylko dla tej oferty · warunki zmienione · link skopiowany · PDF gotowy do druku
  - Breakpointy: mobile + desktop
  - Wymagania: R18, R19, R20, R21
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`oferta-klient`** — nowy
  - Co pokazuje: oferta, którą klient otwiera z linku bez logowania, i jej wersja do druku. Nigdy nie pokazuje kosztów firmy, ceny minimalnej, tempa ani tego, ile zostaje dla właściciela.
  - Stany: oferta ważna · oferta po terminie ważności · uszkodzony lub niepełny link · wydruk A4
  - Breakpointy: mobile + desktop + druk A4
  - Wymagania: R18, R21, R22
  - URL Figma: _(wklej po zaprojektowaniu)_
- [ ] **`kopia-zapasowa`** — nowy
  - Co pokazuje: eksport wszystkich danych do pliku i import z pliku.
  - Stany: eksport gotowy · import udany · zły lub uszkodzony plik · import nadpisujący istniejące dane (potwierdzenie)
  - Breakpointy: mobile + desktop
  - Wymagania: R23
  - URL Figma: _(wklej po zaprojektowaniu)_

## Gdzie to ląduje

- 🔓 Treści z sekcji 3 (zakresy, pytania, warunki, wartości domyślne, kwoty 2026) → pliki danych w `data/` (nazwy ustali plan), w repo.
- 🔓 Ikony → katalog aplikacji w repo.
- 🔒 Brak sekretów: aplikacja nie ma serwera ani kluczy API.

---
Gdy **[blokuje: planowanie]** są odhaczone: `/dev-plan docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`
