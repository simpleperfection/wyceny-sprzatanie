---
title: "feat: Czysty Zarobek jako aplikacja z modułami"
type: feat
status: active
date: 2026-10-28
origin: docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md
design_md: null
figma_spec: null
figma_screens: {}
operator_prep: docs/operator/aplikacja-modulowa-przygotowanie.md
---

# feat: Czysty Zarobek jako aplikacja z modułami

## Przegląd

Aplikacja z etapu 5 staje się aplikacją do prowadzenia jednoosobowej firmy sprzątającej, a wycena jest w niej jednym z modułów. Ekran Start ma powitanie, jedno zdanie o dniu i kafle modułów Zlecenia, Wycena, Klienci i Chemia, a dolnego paska już nie ma. Wszystkie ekrany dostają biało-zielony wygląd z dużymi literami i przyciskami. Dochodzą dwa nowe moduły: Klienci (karta z telefonem, adresem, notatkami i historią) oraz Zlecenia z kalendarzem Dzień / Tydzień / Miesiąc. Zlecenia mogą się powtarzać, a wizytę zamyka się przyciskami „Zrobione” i „Zapłacone”. Wykonanie, czas pracy i zapłata przechodzą z wyceny do zlecenia. Dane zostają w przeglądarce, schemat dostaje wersję 2 z przeniesieniem danych z wersji 1, a kopia zapasowa obejmuje klientów i zlecenia. Działanie wyceny (silnik, ceny, VAT, oferta) się nie zmienia.

## Ujęcie problemu

Etap 5 zbudował aplikację do wycen, a właściciel chciał aplikacji do prowadzenia początkującej firmy, w której wycena jest jednym z modułów. Do tego ocenił obecny wygląd jako nieczytelny: za dużo tekstu, za małe litery i przyciski, nie wiadomo, gdzie kliknąć, beżowe tło i ciemny nagłówek zlewają się w jedno. Wzorem są aplikacje dla firm usługowych (Cleanlo, InTool, Jobber): stan dnia zamiast menu, klienci, zlecenia z kalendarzem i pieniądze (zob. źródło: docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md).

## Śledzenie wymagań

- R1. Aplikacja składa się z modułów: w tym etapie Zlecenia, Wycena, Klienci i Chemia oraz ustawienia firmy. Moduł nie ma kafla, dopóki nie jest gotowy (bez kafli „Wkrótce”).
- R2. Start od góry: powitanie z nazwą firmy (bez niej samo powitanie), jedno zdanie o dniu („Dziś 2 zlecenia · 1 niezapłacone” albo „Dziś nie masz zleceń”), kafle modułów (na telefonie dwie kolumny), odnośnik „Ustawienia firmy”.
- R3. Kafel ma ikonę, nazwę i jedną linię stanu z liczbą; bez użycia modułu linia podpowiada pierwszy krok.
- R4. Bez dolnego paska. W module na górze „← Start” i nazwa modułu, pod nimi przełączniki widoków; zmiana modułu przez Start.
- R5. Przypomnienie o kopii i znacznik „ustawienia domyślne – uzupełnij” zostają na Start, najwyżej jeden baner naraz. Kreator ustawień przy pierwszym uruchomieniu zostaje i kończy się na Start.
- R6. Szybka wycena najwyżej dwa dotknięcia od Start: kafel Wycena, potem „Szybka wycena”.
- R7. Wygląd biało-zielony: białe tło, jeden mocny zielony kolor dla głównych akcji i kwot, odcień własny. Zastępuje wariant B.
- R8. Tekst podstawowy co najmniej 17 px, wszystko klikalne co najmniej 48 px wysokości, tytuły i kwoty duże i pogrubione.
- R9. Mniej tekstu: jedna główna akcja na ekranie, wyjaśnienia pod „Więcej” albo „?”, wiersz listy najwyżej w dwóch liniach.
- R10. Klikalne wygląda jak przycisk albo wiersz ze strzałką, nieklikalne nie wygląda jak przycisk; pusty ekran to jedno zdanie i jeden przycisk.
- R11. Kontrast tekstu co najmniej WCAG AA.
- R12. Zlecenie: klient, adres z karty klienta, usługa albo krótki opis, data i godzina, cena, planowany czas (z wyceny), stan wykonania i zapłaty. Powstaje z przyjętej wyceny („Zaplanuj”: cena, zakres i plan czasu z wyceny) albo ręcznie.
- R13. Zlecenie cykliczne: co tydzień, co 2 tygodnie, co miesiąc; abonament biura z wyceny (1×, 2×, 3×, 5× w tygodniu) daje serię. Kolejne wizyty tworzą się same; pojedynczą wizytę można przesunąć albo odwołać; zmiana ceny albo godziny działa od wybranej wizyty w przód; serię można zakończyć.
- R14. Kalendarz: Dzień (domyślny, wizyty z godziną, klientem, adresem i kwotą), Tydzień, Miesiąc (dni z liczbą wizyt, dotknięcie → Dzień).
- R15. Po terminie wizyta ma „Zrobione” i „Zapłacone” (zamknięcie najwyżej dwa dotknięcia; „Zrobione” także w dniu wizyty); czas pracy opcjonalny i bez przypominania; własne tempo tylko z wizyt z czasem pracy i planem z wyceny; minione niezrobione wizyty w sekcji „Do zamknięcia” na górze widoku Dzień, ich liczba na kaflu.
- R16. Zapłata przy wizycie: zapłacone albo nie, forma (gotówka, przelew, BLIK). Wykonane niezapłacone widać w zdaniu dnia, na kaflu Zlecenia i w historii klienta.
- R17. Klient: nazwa, telefon (dotknięcie dzwoni), adres (dotknięcie otwiera mapę), notatki.
- R18. Karta klienta: dane, historia wycen i zleceń z kwotą i stanem zapłaty, przyciski „Nowa wycena” i „Nowe zlecenie”.
- R19. W wycenie i zleceniu klienta wybiera się z listy albo dodaje bez wychodzenia z ekranu; w szybkiej wycenie klient nie jest wymagany, przy „Zaplanuj” tak.
- R20. Moduł Wycena: dwa duże przyciski „Szybka wycena” i „Dokładna wycena”, pod nimi lista: do wysłania, przyjęte bez zlecenia z „Zaplanuj”, czekające na odpowiedź, reszta.
- R21. Działanie wyceny bez zmian (silnik, ceny, VAT, pytania, oferta, warunki); zmienia się wygląd i ilość tekstu.
- R22. Wycena kończy się na „przyjęta” albo „odrzucona”; wykonanie i zapłata należą do zlecenia; wycena i zlecenie prowadzą do siebie nawzajem.
- R23. Moduł Chemia: obecny katalog i dobór środków w nowym wyglądzie.
- R24. Dane tylko w przeglądarce; kopia do pliku obejmuje klientów i zlecenia.
- R25. Dane i stare pliki kopii z wersji 1 dalej działają: przyjęte i wykonane wyceny stają się zleceniami (wykonane z czasem pracy), nazwy klientów z wycen trafiają na listę klientów.
- R26. Abonament biura rozlicza się raz w miesiącu: wizyty abonamentu mają tylko „Zrobione”, zapłatę oznacza się raz na miesiąc w karcie zlecenia z kwotą miesięczną, a miesiąc po swoim końcu bez zapłaty jest niezapłacony (decyzja właściciela w `/dev-plan` 2026-10-28; doprecyzowuje R16).

## Granice zakresu

- Bez modułów Pieniądze, Start firmy, Zdobywanie klientów i Bezpieczeństwo chemii (osobne etapy z własnym brainstormem) i bez kafli dla nich.
- Bez przypomnień (wpis do kalendarza telefonu, SMS do klienta), dolnego paska i przycisku „+”, mapy dnia i tras, faktur, akceptacji oferty online, powiadomień push, kont i synchronizacji, pracowników, płatności i rezerwacji online.
- Bez zmian modelu wyceny i plików `data/ceny.json`, `data/normy.json`, `data/chemia.json`, `data/rynek.json`; format linku oferty (`oferta.html#v1.…`) i jego pola zostają.
- Zlecenie ma adres z karty klienta (bez osobnego adresu zlecenia), jedną cenę na okres serii (bez innej ceny pojedynczej wizyty), bez stanu „bez opłaty” (wizyta z ceną 0 zł nie czeka na zapłatę) i bez zbiorczego „zamknij wszystkie” w „Do zamknięcia”.
- „Połącz” kopii łączy zlecenie w całości (nowsza zmiana wygrywa) i nie ma śladów usunięć: zmiany wizyt jednego zlecenia z dwóch urządzeń nie sumują się, a rekord usunięty lokalnie wraca z pliku.
- Bez łączenia i rozdzielania klientów oraz bez usuwania klienta z historią (wycenami albo zleceniami).
- Bez odwrotnej migracji: stara wersja aplikacji przy danych v2 pokazuje ekran ratunkowy.
- Zmiana klienta na karcie nie zmienia nazwy i adresu w zapisanych wycenach i wysłanych ofertach (to kopia z chwili wyboru).
- Publikacja pod `czystyzarobek.pl` (etap 6) po tym planie.

## Kontekst i research

### Relevantny kod i wzorce

- `src/dane/magazyn.js` — `KLUCZ_MAGAZYNU = 'wyceny-sprzatanie:stan'`, `WERSJA_SCHEMATU = 1`, pusta mapa `AKTUALIZACJE`, `zaktualizujStan` wołane przy każdym `wczytaj()` (bez zapisu wyniku) i przy imporcie kopii, `jestStanem`, `zmien(fn)` czyta świeży stan.
- `src/dane/wyceny.js` — `STATUSY_WYCENY`, prywatne `PRZEJSCIA`, rekord `Wycena` z `klient: { nazwa, adres, termin }`, `wykonania`, `dodajWykonanie` (idempotentne po id od wołającego), `czyAbonament(wynik)` (`wizytWMiesiacu > 1`), `jestWycena`, `BladWyceny`.
- `src/dane/kopia.js` — `odczytajKopie` (aplikacja, wersja, limity na surowym stanie, `zaktualizujStan`, `sprawdzStanKopii`), `polaczStany` (wyceny po id, nowsza `zmieniona`), `czyPrzypomniecOKopii`, `podsumowanieKopii`; `NAZWA_APLIKACJI = 'wyceny-sprzatanie'` nie zmienia się.
- `src/dane/ksztalt.js` — strażniki (`jestDniem`, `jestDataIso`, `maKrotkieTeksty`), `dzienLokalny`, `miesiacLokalny`; moduł bez importów.
- `src/silnik/tempo.js` — `wpisyTempa`, `tempoWlasne`, `tempoDoWyceny` na kształcie `WycenaTempa = { id, wejscie: { uslugaId }, wynik: { minutyNormowe }, wykonania: { id, data, minuty }[] }`; okno 10 wpisów, próg 3 wpisów.
- `src/kreator/zakonczenie.js` — `historiaPlanuIFaktu`, `czasStartowy`, `planZakonczenia`, `poprawnyCzas`, `KROK_CZASU = 15`; ekran `src/widoki/zakonczenie.js` (`#/wycena/:id/koniec`).
- `src/ui/router.js` — `dopasuj` bierze pierwsze dopasowanie w kolejności `TRASY` (trasa dosłowna przed trasą z parametrem); `uruchomRouter` → `{ nawiguj, odswiez }`; widok `render(kontener, { parametry, zapytanie, kontekst })` zwraca funkcję sprzątającą.
- `src/ui/komponenty/uklad.js` — `naglowek`, `karta`, `baner`, `wiersz`, `arkusz`, `dialogPotwierdzenia`, `dolnyPasek` (wołany w `indeks.js`, `start.js`, `lista-wycen.js`, `katalog-chemii.js`, `ustawienia.js`).
- `src/widoki/start.js`, `src/widoki/start-dane.js` — dzisiejszy Start (nagłówek z datą, kafle szybkiej i dokładnej wyceny, karta miesiąca, „Do zrobienia”, banery iPhone'a, ustawień i kopii); `kwotaWyceny`.
- `src/style/tokeny.css` — tokeny wariantu B (`--marka-zielen*` ma dziś niebieskie wartości, `--tekst-podstawowy: 14px`, `--cel-dotyku: 44px`); `src/style/komponenty.css` — 2509 linii z sekcjami według widoków, 29 rozmiarów fontu i 4 wysokości poniżej 48 px wpisane na sztywno; `oferta.css` i `druk.css` dla `oferta.html`, która też ładuje `tokeny.css`.
- `sw.js` — wstępnie zapisuje tylko strony i `data/*.json`; moduły `src/` i style trafiają do pamięci podręcznej z `performance.getEntriesByType('resource')`, więc nowe moduły muszą być importowane statycznie z grafu `app.js` (bez `import()`), a nowe arkusze — podpięte w `index.html`.
- Testy: `node:test` bez jsdom; logika ekranów w czystych modułach (`*-dane.js`, `*-teksty.js`, `src/kreator/*`), DOM przez ręczną atrapę (`AtrapaElementu` w `src/ui/h.test.js`, `src/widoki/oferta-klient.test.js`); `tests/pamiec-magazynu.js`, `tests/fixtures/kopia-v1.json`; stany E2E w `e2e/stany/` wstrzykiwane przez `agent-browser eval` do `localStorage['wyceny-sprzatanie:stan']`.

### Wiedza instytucjonalna

- Reguła indeksu `kontrakt-wspolny` (`src/dane/**`, `src/oferta/**`, waga wysoka): stan zapisywany i wczytywany sprawdza jedna funkcja walidacji z jednego modułu, wołana po obu stronach; granice importowane ze źródła; każda granica importu ma test odmowy i test round-trip eksport → import ([solution](../solutions/runtime-errors/2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md)). Dotyczy klientów, zleceń, kopii v2 i migracji.
- Z review etapu 5: jedna akcja użytkownika = jedno `magazyn.zmien` (zapis klawisz po klawiszu kosztował 150–200 ms na telefonie); reguły domeny w `src/dane/*`, nie w widokach; widoki nie importują się nawzajem; po utworzeniu rekordu `history.replaceState` na adres z id (wstecz nie dubluje); arkusze i callbacki asynchroniczne sprawdzają `czyAktywny`; jedna wartość nie znaczy dwóch rzeczy; testy bez liczenia oczekiwanej wartości testowaną funkcją; każda bramka walidacji ma test odmowy.
- Z review etapu 5: dwa P1 fazy 2 wzięły się z traktowania `wizytWMiesiacu` jako liczby całkowitej — abonament rozpoznaje tylko `czyAbonament`.
- Otwarty P3 z etapu 5: ekran ratunkowy wczytuje kopię trybem „zastąp” bez pytania (`src/widoki/ratunek.js`); po wdrożeniu v2 stara karta zobaczy `nowsza_wersja` i ten ekran, więc poprawka wchodzi do tego planu (IU-7).
- `CLAUDE.md`: limit Figmy wyczerpany, makiety jako HTML w `docs/operator/`; nazwa `wyceny-sprzatanie` w kluczu magazynu i pliku kopii zostaje, żeby stare dane się wczytywały; na Windows `E2E_START` to program z argumentami.
- Szablon `.claude/` jest zestrojony pod React + Supabase: reguły Reacta, Supabase i Zod nie mają tu zastosowania, reszta (rozmiar plików i funkcji, nazewnictwo, testy, obsługa błędów, bezpieczeństwo) obowiązuje.

### Referencje zewnętrzne

- Link do mapy działający na Androidzie, iOS i komputerze: `https://www.google.com/maps/search/?api=1&query=<adres>` (Google Maps URLs, parametr `query` zakodowany `encodeURIComponent`); link `tel:` z numerem bez spacji.
- WCAG 2.2 AA: kontrast 4,5:1 dla zwykłego tekstu (pogrubiony poniżej 18,66 px to zwykły tekst), 3:1 dla dużego tekstu i elementów interfejsu.

## Kluczowe decyzje techniczne

- Kolejność prac: dwie fazy danych (bez zmian wyglądu), potem nowy wygląd i szkielet, Klienci, Zlecenia, a na końcu ekrany wyceny. Fazy UI czekają na akceptację makiet HTML (checklista, `[blokuje: faza 3]`); makiety powstają w osobnej sesji równolegle z fazami 1–2 (decyzja właściciela w `/dev-plan` 2026-10-28). Sesja makiet może poprawić pola „Teksty (verbatim)” jednostek faz 3–6 w tym planie przed fazą 3; struktury jednostek (pliki, fazy) nie zmienia.
- Stan v2: `{ wersja: 2, ustawienia, wyceny, klienci, zlecenia, licznikNumerow, kopia, preferencje }`. Klient: `{ id, nazwa, telefon: string|null, adres: string|null, notatki: string|null, utworzony, zmieniony }`. Wycena dostaje `klientId: string|null` i traci `wykonania`; `wycena.klient` zostaje kopią nazwy i adresu z chwili wyboru (z niej korzysta oferta i link, którego format się nie zmienia).
- Zlecenie: `{ id, klientId, wycenaId: string|null, uslugaId: string|null, opis: string|null, rozliczenie: 'za_wizyte'|'miesiecznie', start: 'RRRR-MM-DD', okresy: Okres[], koniec: 'RRRR-MM-DD'|null, plan: { minutyNormowe, tempo }|null, wizyty: Record<dataPierwotna, StanWizyty>, zaplatyMiesieczne: Record<'RRRR-MM', Zaplata>, utworzone, zmienione }`. Nazwa wyświetlana = `opis` albo nazwa usługi z katalogu. Okres: `{ od, cykl: { co: 'tydzien'|'dwa_tygodnie'|'miesiac', dni: number[] }|null, godzina: 'HH:MM'|null, cenaWizyty: number|null, cenaMiesiaca: number|null }` (dokładnie jedna cena według rozliczenia). StanWizyty: `{ przeniesiona: { data, godzina }|null, odwolana, zrobiona: iso|null, zaplata: Zaplata|null, minutyPracy: number|null }`. Zaplata: `{ forma: 'gotowka'|'przelew'|'blik'|null, data: 'RRRR-MM-DD', kwota }` (forma null tylko w wizytach przeniesionych z wersji 1).
- Wizyty serii nie są zapisywane z góry: liczy je czysta funkcja z okresów (cykl jest w okresie, więc zmiana dni albo częstotliwości „od wizyty” to nowy okres, jak cena i godzina). Zapis jest tylko dla wizyty ze stanem albo wyjątkiem, pod datą pierwotną; wizyta z zapisanym stanem jest widoczna zawsze, także gdy reguła jej już nie daje. Przesunięta wizyta bierze okres (cenę, godzinę) z daty pierwotnej. Odpowiedź na odroczone pytanie źródła „jak daleko w przód tworzyć wizyty”: wcale, kalendarz liczy okno, które pokazuje.
- Daty to teksty `RRRR-MM-DD` liczone w UTC (`Date.UTC`), bez dodawania milisekund do czasu lokalnego (zmiana czasu 25.10 i 28.03). Funkcje kalendarza dostają `dzis` w argumencie; dzień lokalny daje `dzienLokalny` z `src/dane/ksztalt.js`. Co 2 tygodnie: kotwicą jest tydzień (od poniedziałku) daty `od` okresu. Co miesiąc: dzień miesiąca z `od`, w krótszym miesiącu ostatni dzień (31.01 → 28.02 → 31.03); okres miesięczny, który zaczyna się w dniu wizyty poprzedniego okresu miesięcznego, dziedziczy jego dzień kotwicy (`dniKotwic` w `src/kalendarz/wystapienia.js`: seria od 31.01 ze zmianą od wizyty 28.02 dalej wypada 31.03). Szukanie najbliższej wizyty najwyżej 366 dni.
- Abonament biura (`czyAbonament(wynik)`) daje serię tygodniową z dniami według `wejscie.wariantId`: `abonament_1` — dzień tygodnia daty startu, `abonament_2` — pn i czw, `abonament_3` — pn, śr, pt, `abonament_5` — pn–pt (dni do zmiany w formularzu), z rozliczeniem miesięcznym i kwotą miesięczną = cena za wizytę × `wizytWMiesiacu` zaokrąglona do 1 zł (R26).
- „Do zamknięcia” = wizyty z dniem wcześniejszym niż dziś i nie wcześniejszym niż dzień założenia zlecenia (seria wpisana dziś „od stycznia” nie robi zaległości), nieodwołane, niezrobione albo zrobione bez zapłaty (rozliczenie za wizytę, cena > 0). Dzięki temu po „Zrobione” wiersz zostaje z przyciskiem „Zapłacone” i zamknięcie wczorajszej wizyty to nadal dwa dotknięcia; liczba na kaflu liczy to samo. „Niezapłacone” = zrobione wizyty za wizytę bez zapłaty z ceną > 0 (każdego dnia) plus miesiące serii miesięcznych przed bieżącym, z co najmniej jedną zrobioną wizytą i bez zapłaty. „Dziś N zleceń” = nieodwołane wizyty dzisiejszego dnia.
- „Zapłacone” w wierszu kalendarza zapisuje formę ostatniej zapłaty tego klienta (bez historii: gotówka), dzień oznaczenia i cenę wizyty; formę zmienia się w szczegółach wizyty. Tak zamknięcie zostaje przy dwóch dotknięciach. Przyciski w wierszach są od dnia wizyty; w szczegółach wizyty zapłatę można oznaczyć z wyprzedzeniem.
- Wycena: statusy `szkic → do_wyslania → wyslana → przyjeta | odrzucona`, nowe przejście `przyjeta → odrzucona` (rezygnacja klienta; zlecenia zostają), bez `wykonana`. Wycena z co najmniej jednym zleceniem jest tylko do odczytu (zastępuje dawną regułę „wykonana”). „Do zaplanowania” = przyjęta bez zlecenia, a abonament — bez zlecenia z cyklem. Z jednej wyceny może powstać kilka zleceń. Usunięcie wyceny zeruje `wycenaId` w jej zleceniach (zlecenie i plan zostają).
- Klient: usunąć można tylko klienta bez wycen i zleceń; nowy klient z wyboru w wycenie zapisuje się przy zatwierdzeniu wyboru (porzucony arkusz nie zostawia klienta); zmiana karty nie zmienia kopii w wycenach; ręczna zmiana nazwy albo adresu w edycji oferty zmienia tylko wycenę.
- Migracja v1 → v2 (`src/dane/migracja-v2.js`, jeden krok w `AKTUALIZACJE`) jest czysta i całkowita: bez zegara i losowych id, ten sam wynik przy każdym odczycie, dane nieczytelne spadają do „do zaplanowania”, a nie do ekranu ratunkowego. Klienci z nazw wycen poza szkicami, grupowani `normalizujNazwe` (NFC, `toLocaleLowerCase('pl')`, zwinięte spacje), id `k-<id najstarszej wyceny grupy>`, nazwa z najnowszej wyceny, adres z najnowszej wyceny z adresem. Każde wykonanie → zlecenie jednorazowe `z-<id wyceny>-<id wykonania>` z wizytą zrobioną w dniu wykonania, czasem pracy, planem `{ minutyNormowe, tempo: tempoPlanu }` i zapłatą `{ forma: null, data: dzień wykonania, kwota: cena wyceny }` (decyzja właściciela: zapłacone, forma nieznana). Przyjęta bez wykonań, nie abonament, z czytelnym terminem → zlecenie jednorazowe `z-<id wyceny>` na termin. Abonament bez zlecenia z cyklem i przyjęta bez czytelnego terminu zostają „do zaplanowania”. `wykonana` → `przyjeta`. Wycena z wykonaniami bez nazwy klienta dostaje klienta „Klient z wyceny {numer}”. Znaczniki czasu z danych (`utworzona`, `zmieniona`), nie z zegara. `app.js` utrwala wynik migracji raz przy starcie (bez ustawiania `kopia.zmianaOd`), a gdy zapis się nie uda, migracja działa dalej przy każdym odczycie.
- Własne tempo z wizyt: adapter `daneTempa(stan)` daje `src/silnik/tempo.js` ten sam kształt `WycenaTempa` (plan z `zlecenie.plan`, wizyty z czasem pracy w kolejności dni, a w tym samym dniu według `zrobiona`), więc silnik tempa się nie zmienia. Zlecenia bez planu (ręczne, szybka wycena bez migawki) nie liczą się do tempa (R15). Test sprawdza, że tempo przed migracją = tempo po migracji.
- Kopia v2: te same strażniki co magazyn (`jestKlient`, `jestZlecenie`, spójność odwołań w `jestStanem`); limity `MAKS_KLIENTOW` i `MAKS_ZLECEN` obowiązują przy zapisie i imporcie; „połącz” klientów i zleceń po id, wygrywa późniejszy `zmieniony`/`zmienione`, remis — lokalny; przypomnienie i pytanie o tryb liczą też klientów i zlecenia.
- Spójność odwołań sprawdza `jestStanem` (twardo): `zlecenie.klientId` wskazuje klienta, `wycena.klientId` null albo klienta, `zlecenie.wycenaId` null albo wycenę. Operacje utrzymują ją same (usunięcie wyceny zeruje `wycenaId`, klienta z historią nie da się usunąć, „połącz” to suma rekordów).
- Nawigacja: korzeń modułu ma „← Start”; ekran szczegółów ma stały ekran nadrzędny („← Klienci”, „← Zlecenia”, „← Wycena”, „← Chemia”, „← Ustawienia firmy”), a nie historię przeglądarki. `naglowek` dostaje widoczny tekst powrotu (`wsteczTekst`) i zostaje zgodny wstecz z dotychczasowymi wywołaniami.
- Trasy modułów: `klienci`, `nowyKlient` (`#/klienci/nowy`, przed `klient`), `klient`, `edycjaKlienta`; `zlecenia` (`#/zlecenia/:widok`, widok `dzien|tydzien|miesiac`, `?data=`), `noweZlecenie` (`#/zlecenie/nowe`, przed `zlecenie`), `zlecenie`, `wizyta` (`#/zlecenie/:id/wizyta/:data`). Trasa `zakonczenie` znika. Wszystkie trasy modułu Zlecenia powstają w IU-15, a ekrany IU-16–IU-18 podmieniają tymczasowy widok „Nie ma takiego ekranu” w tej samej fazie.
- Kafle: `MODULY` w `src/ui/moduly.js` (kolejność R1: Zlecenia, Wycena, Klienci, Chemia); moduł dopisuje swój kafel w jednostce, która go kończy. Linie stanu liczy `start-dane.js` (wszystkie cztery od IU-9). Jeden baner naraz w kolejności: instrukcja dla iPhone'a, przypomnienie o kopii, ustawienia domyślne. Karta miesiąca, sekcja „Do zrobienia” i kafle szybkiej i dokładnej wyceny znikają ze Start (statystyki miesiąca wrócą w module Pieniądze; tempo jest w ustawieniach).
- Wygląd: nazwy tokenów zostają (`--marka-zielen*`, `--tlo-*`, `--tekst-*`, `--cel-dotyku`), zmieniają się wartości: z `:root` zaakceptowanej makiety `docs/operator/aplikacja-modulowa-makiety.html`. Progi: `--tekst-podstawowy` ≥ 17 px, `--cel-dotyku` = 48 px, biały tekst na `--marka-zielen` i `--marka-zielen` na białym ≥ 4,5:1, tekst drugorzędny na tle karty ≥ 4,5:1. Dochodzą tokeny `--tekst-kwota` i `--tekst-tytul-modulu`. Odpowiedź na odroczone pytanie źródła (odcień, font, rozmiary): wartości wybiera sesja makiet z tymi progami, font Source Sans 3 zostaje.
- Style modułów w osobnych arkuszach `src/style/{start,wyceny,chemia,ustawienia,klienci,zlecenia,kreator,szybka,podsumowanie}.css`, które IU-8 tworzy puste i podpina w `index.html` w stałej kolejności po `komponenty.css`. Każda późniejsza jednostka zmienia tylko swój arkusz i przenosi do niego swoją sekcję z `komponenty.css`, bez konfliktów w `index.html` i bez rozrastania `komponenty.css`.
- Widok Tydzień na telefonie to lista 7 dni, nie siatka: siatka 7 kolumn na 360 px daje ok. 48 px na dzień, za mało na tekst 17 px (odroczone pytanie źródła do R14). Miesiąc to siatka z numerem dnia i liczbą wizyt.
- Oferta dla klienta (`oferta.html`) jest neutralna: białe tło, ciemny tekst, większe litery, bez zieleni aplikacji (zieleń to marka „Czystego Zarobku”, a oferta pokazuje firmę); wydruk zostaje czarno-biały (decyzja właściciela w `/dev-plan` 2026-10-28, odroczone pytanie źródła do R7).
- Po północy otwarta aplikacja odświeża widok przy powrocie do karty (`visibilitychange`, `focus`), gdy zmienił się dzień lokalny.
- Stany E2E z zleceniami to skrypty `e2e/stany/*.js` uruchamiane w stronie przez `agent-browser eval`, które liczą daty względem dzisiejszego dnia przeglądarki; jeden stan v1 (`e2e/stany/wyceny-do-zrobienia.json`) zostaje do sprawdzenia migracji w przeglądarce.

## Rejestr stałych

| Stała | Wartość | Plik | IU-źródło | Konsumenci |
|---|---|---|---|---|
| `WERSJA_SCHEMATU` | `2` (było `1`) | `src/dane/magazyn.js` | IU-2 | IU-2, IU-6, IU-7 |
| `CYKLE` | `['tydzien', 'dwa_tygodnie', 'miesiac']` | `src/kalendarz/wystapienia.js` | IU-1 | IU-1, IU-2, IU-16 |
| `DLUGOSCI_KLIENTA` | `{ nazwa: 120, telefon: 20, adres: 200, notatki: 1000 }` | `src/dane/klienci.js` | IU-2 | IU-2, IU-13, IU-14 |
| `MAKS_KLIENTOW` | `5000` | `src/dane/klienci.js` | IU-2 | IU-2, IU-7 |
| `MAKS_ZLECEN` | `10000` | `src/dane/zlecenia-ksztalt.js` | IU-2 | IU-2, IU-3, IU-7 |
| `ROZLICZENIA` | `['za_wizyte', 'miesiecznie']` | `src/dane/zlecenia-ksztalt.js` | IU-2 | IU-2, IU-3, IU-16 |
| `FORMY_ZAPLATY` | `['gotowka', 'przelew', 'blik']` | `src/dane/zlecenia-ksztalt.js` | IU-2 | IU-2, IU-3, IU-17, IU-18 |
| `MAKS_MINUT_PRACY` | `1440` (zastępuje `MAKS_MINUT_WYKONANIA` z `src/dane/wyceny.js`) | `src/dane/zlecenia-ksztalt.js` | IU-2 | IU-2, IU-3, IU-17 |
| `KROK_CZASU` | `15` (przeniesiona z `src/kreator/zakonczenie.js`) | `src/zlecenia/plan-fakt.js` | IU-5 | IU-5, IU-17 |
| `STATUSY_WYCENY` | `['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona']` | `src/dane/wyceny.js` | IU-6 | IU-6, IU-10 |
| `ETYKIETY_STATUSOW` | jak dotąd, bez `wykonana` | `src/ui/statusy.js` | IU-6 | IU-6, IU-10, IU-13 |
| `TERMIN_ISO` | wzorzec `RRRR-MM-DD` z opcjonalnym `THH:MM` (przeniesiony z `src/ui/format.js`) | `src/dane/ksztalt.js` | IU-6 | IU-6, IU-16 |
| tokeny wyglądu (`--marka-zielen`, `--marka-zielen-ciemna`, `--marka-zielen-tlo`, `--tlo-strona`, `--tlo-karta`, `--tekst-glowny`, `--tekst-drugi`, `--tekst-podstawowy`, `--tekst-maly`, `--tekst-kwota`, `--tekst-tytul-modulu`, `--cel-dotyku`) | wartości z `:root` zaakceptowanej makiety | `src/style/tokeny.css` | IU-8 | IU-8, IU-9, IU-10, IU-11, IU-12, IU-13, IU-15, IU-19, IU-20, IU-21 |
| `MODULY` | `[{ id: 'zlecenia', nazwa: 'Zlecenia', ikona: 'calendar', trasa: 'zlecenia' }, { id: 'wycena', nazwa: 'Wycena', ikona: 'file-text', trasa: 'wyceny' }, { id: 'klienci', nazwa: 'Klienci', ikona: 'users', trasa: 'klienci' }, { id: 'chemia', nazwa: 'Chemia', ikona: 'flask', trasa: 'chemia' }]` | `src/ui/moduly.js` | IU-9 | IU-9, IU-13, IU-15 |
| `TRASY` modułu Klienci | `klienci: '#/klienci'`, `nowyKlient: '#/klienci/nowy'`, `klient: '#/klienci/:id'`, `edycjaKlienta: '#/klienci/:id/edycja'` | `src/ui/trasy.js` | IU-13 | IU-13, IU-14, IU-17, IU-18 |
| `TRASY` modułu Zlecenia | `zlecenia: '#/zlecenia/:widok'`, `noweZlecenie: '#/zlecenie/nowe'`, `zlecenie: '#/zlecenie/:id'`, `wizyta: '#/zlecenie/:id/wizyta/:data'` | `src/ui/trasy.js` | IU-15 | IU-15, IU-16, IU-17, IU-18 |
| `SKROTY_DNI` | `['pn', 'wt', 'śr', 'czw', 'pt', 'sb', 'nd']` | `src/ui/format.js` | IU-15 | IU-15, IU-16, IU-18 |
| `ETYKIETY_FORM_ZAPLATY` | `{ gotowka: 'Gotówka', przelew: 'Przelew', blik: 'BLIK' }` | `src/ui/statusy.js` | IU-17 | IU-17, IU-18 |

## Części PR

| Część | Fazy |
|---|---|
| 1 | 1–3 |
| 2 | 4–6 |

## Otwarte pytania

### Rozwiązane podczas planowania

- Makiety: plan teraz, makiety HTML w osobnej sesji równolegle z fazami 1–2, akceptacja przed fazą 3 (decyzja właściciela 2026-10-28).
- Wizyty przeniesione z wersji 1: zapłacone, forma nieznana (decyzja właściciela 2026-10-28).
- Oferta dla klienta: neutralna, bez zieleni (decyzja właściciela 2026-10-28; odroczone pytanie źródła do R7).
- Abonament biura: zapłata raz w miesiącu w karcie zlecenia (decyzja właściciela 2026-10-28, R26).
- Seria i wyjątki (odroczone pytanie źródła do R13): wizyty liczone z okresów bez zapisu z góry, cykl w okresie, zapis tylko wizyt ze stanem.
- Przeniesienie danych (odroczone pytanie źródła do R25): migracja v1 → v2 wg „Kluczowe decyzje techniczne”; kopia v2 z tą samą nazwą aplikacji i plikiem.
- Widok Tydzień: lista dni (odroczone pytanie źródła do R14).
- Teksty linii stanu i zdania o dniu (odroczone pytanie źródła do R3): w polach „Teksty (verbatim)” IU-9; sesja makiet może je poprawić.
- Z analizy przepływów: seria wpisana ze startem w przeszłości nie robi zaległości sprzed dnia założenia; „Do zamknięcia” obejmuje też zrobione bez zapłaty; zakończenie serii nie ukrywa wizyt z zapisanym stanem; przyjętą wycenę można odrzucić; klienta z historią nie da się usunąć; cena przy „Zaplanuj” z szybkiej wyceny z widełkami albo „od” jest pustym polem do wpisania (podpowiedź z widełkami), z trybu „ok” — kwota.

### Odroczone do implementacji

- Wartości tokenów (odcień zieleni, rozmiary tytułów i kwot, promienie) — z zaakceptowanej makiety; IU-8 przepisuje je z `:root` makiety.
- Które wyjaśnienia na ekranach kreatora, szybkiej wyceny, podsumowania, chemii i ustawień trafią pod „Więcej” albo „?” — builder ocenia według R9 (zostaje to, co potrzebne do decyzji na tym ekranie) i makiety; właściciel sprawdza w smoke'u.
- Dokładna kolejność wpisów tempa z migracji przy kilku wykonaniach w jednym dniu (znaczniki `zrobiona` z danych) — rozstrzyga test „tempo przed = po migracji”.
- Czy `zapiszCalosc` magazynu nadaje się do utrwalenia migracji bez ustawiania `kopia.zmianaOd`, czy potrzebna jest osobna metoda — builder IU-6 sprawdza w `src/dane/magazyn.js`.
- Brak `docs/DESIGN.md` — buildery UI opierają się na makiecie HTML i tokenach; utworzyć przed kolejnym etapem z UI.

## Wymagania wstępne operatora

Checklista: `docs/operator/aplikacja-modulowa-przygotowanie.md` (utworzona przez `/dev-plan` 2026-10-28).

- [ ] Makiety HTML nowego wyglądu w `docs/operator/aplikacja-modulowa-makiety.html` zaakceptowane przez właściciela, tokeny w `:root` makiety — **[blokuje: faza 3]** (IU-8–IU-22)

## Implementation Units

### Faza 1 — Kalendarz i nowe dane

**Zależy od:** Brak

- [x] **IU-1: Daty i wystąpienia wizyt**

**Cel:** Czyste funkcje dat `RRRR-MM-DD` i liczenia wizyt zlecenia w oknie dat z okresów, cyklu i wyjątków.

**Wymagania:** R13, R14

**Zależności:** Brak

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/kalendarz/daty.js` | 0 → 90 | — | nowy |
| Stwórz | `src/kalendarz/wystapienia.js` | 0 → 170 | — | nowy |
| Test (unit) | `src/kalendarz/daty.test.js` | 0 → 110 | — | nowy |
| Test (unit) | `src/kalendarz/wystapienia.test.js` | 0 → 260 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc), testy `node:test`; `src/kalendarz/` to warstwa bez DOM i bez magazynu (jak `src/silnik/`), funkcje nie czytają zegara — dzień `dzis` przychodzi w argumencie.
- Dzień to tekst `RRRR-MM-DD` (jak `jestDniem` w `src/dane/ksztalt.js`), godzina `HH:MM` albo null; arytmetyka dni w UTC (`Date.UTC`), nigdy przez dodawanie milisekund do daty lokalnej (zmiana czasu 25.10.2026 i 28.03.2027).
- `daty.js`: `dodajDni`, `dzienTygodnia` (ISO: 1 = pn … 7 = nd), `poczatekTygodnia` (poniedziałek), `dniOdDo`, `porownajDni`, `ostatniDzienMiesiaca`, `dzienWMiesiacu(rok, miesiac, dzienMiesiaca)` (przycięty do ostatniego dnia), `miesiacDnia` (`RRRR-MM`), `siatkaMiesiaca(rok, miesiac)` (tygodnie od poniedziałku, dni spoza miesiąca jako null), `jestGodzina`.
- `wystapienia.js`: `CYKLE = ['tydzien', 'dwa_tygodnie', 'miesiac']` (źródło stałej); typ wejścia `ZlecenieKalendarza = { start, koniec, okresy: { od, cykl, godzina }[], wizyty }` zgodny strukturalnie z pełnym zleceniem z IU-2 (model zlecenia: „Kluczowe decyzje techniczne”).
- `dniOkresu(okres, odDnia, doDnia)`: `cykl: null` → tylko `okres.od`; `tydzien` → dni z `cykl.dni` w każdym tygodniu; `dwa_tygodnie` → dni z `cykl.dni` w tygodniach o parzystej odległości od tygodnia `okres.od` (kotwica: poniedziałek tego tygodnia); `miesiac` → dzień miesiąca z `okres.od` w każdym miesiącu, w krótszym — ostatni dzień, zawsze liczony od dnia z `okres.od` (31.01 → 28.02 → 31.03); nic przed `okres.od`.
- `wystapienia(zlecenie, odDnia, doDnia)`: okres obowiązuje od swojego `od` do dnia przed `od` następnego okresu; nic po `koniec`; wizyta z zapisanym stanem (`wizyty[dataPierwotna]`) jest w wyniku zawsze, także gdy reguła jej już nie daje (zmiana cyklu, zakończenie serii); wizyta przesunięta jest w dniu `przeniesiona.data` (także gdy data pierwotna jest poza oknem) i nie ma jej w dniu pierwotnym; godzina i okres według daty pierwotnej (godzina przesunięcia wygrywa, gdy jest). Element wyniku: `{ dataPierwotna, data, godzina, okres, stan }`, posortowany po dniu, potem godzinie (bez godziny na końcu).
- `najblizszaWizyta(zlecenie, odDnia)`: pierwsze nieodwołane wystąpienie od `odDnia`, szukane najwyżej 366 dni (seria z samymi odwołaniami kończy się null, bez zapętlenia).

**Notatka wykonawcza:** Test-first: przypadki brzegowe dat z listy scenariuszy są specyfikacją.

**Wzorce do naśladowania:**
- `src/dane/ksztalt.js` — `jestDniem`, `dzienLokalny`, moduł bez importów
- `src/silnik/tempo.js` — czyste funkcje z typami JSDoc i testem obok

**Scenariusze testowe:**
- [Unit] co tydzień w pn i czw od czwartku 2026-10-29, okno 2026-10-26–2026-11-08 → 2026-10-29, 2026-11-02, 2026-11-05
- [Unit] co 2 tygodnie w pn od czwartku 2026-10-29 → pierwsza wizyta 2026-11-09, druga 2026-11-23
- [Unit] co miesiąc od 2026-01-31 → 2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30
- [Unit] co tydzień w nd przez 2026-10-25 i 2027-03-28 (zmiana czasu) → kolejne niedziele bez przesunięcia o dzień
- [Unit] wizyta przesunięta z 2026-11-02 na 2026-11-10: w oknie 2026-11-08–2026-11-14 jest 2026-11-10 z godziną okresu daty pierwotnej, w oknie 2026-11-01–2026-11-07 nie ma jej 2026-11-02
- [Unit] zapisana wizyta z dnia, którego nowy okres z innym cyklem już nie daje, nadal jest w wyniku
- [Unit] nowy okres od 2026-11-16 z godziną 10:00 i dniem śr: wizyty przed 2026-11-16 mają stary okres, od 2026-11-16 nowy
- [Unit] `koniec` 2026-11-05: brak wizyt z reguły po tym dniu, ale zrobiona wizyta z 2026-11-09 zostaje
- [Unit] `najblizszaWizyta` serii z samymi odwołanymi wizytami zwraca null
- [Unit] `siatkaMiesiaca(2026, 11)`: pierwszy tydzień ma 6 pustych dni i niedzielę 1 listopada, ostatni dzień to 30 listopada
- [Unit] `dzienWMiesiacu(2027, 2, 31)` → 2027-02-28; `dzienTygodnia('2026-11-01')` → 7

**Weryfikacja:**
- `node --test "src/kalendarz/*.test.js"` przechodzi (na Node 24 katalog jako argument daje MODULE_NOT_FOUND; korekta z fazy 1)
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-2: Schemat v2: klienci i kształt zleceń**

**Cel:** Stan v2 z listami klientów i zleceń, rekord i operacje klienta, kształt zlecenia ze strażnikiem i strukturalny krok migracji v1 → v2.

**Wymagania:** R17, R12, R24

**Zależności:** IU-1

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/dane/klienci.js` | 0 → 150 | — | nowy |
| Stwórz | `src/dane/zlecenia-ksztalt.js` | 0 → 160 | — | nowy |
| Stwórz | `src/dane/migracja-v2.js` | 0 → 25 | — | nowy |
| Modyfikuj | `src/dane/magazyn.js` | 123 → 150 | — | zostaje |
| Test (unit) | `src/dane/klienci.test.js` | 0 → 170 | — | nowy |
| Test (unit) | `src/dane/zlecenia-ksztalt.test.js` | 0 → 200 | — | nowy |
| Modyfikuj | `src/dane/magazyn.test.js` | 229 → 260 | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stan v2: `{ wersja: 2, ustawienia, wyceny, klienci, zlecenia, licznikNumerow, kopia, preferencje }`; `WERSJA_SCHEMATU = 2` w `src/dane/magazyn.js` (źródło stałej, było 1); `KLUCZ_MAGAZYNU = 'wyceny-sprzatanie:stan'` bez zmian.
- `src/dane/migracja-v2.js`: `zV1DoV2(stan)` zarejestrowane w `AKTUALIZACJE.set(1, …)`; w tej jednostce tylko dokłada puste `klienci` i `zlecenia` i ustawia `wersja: 2` (przeniesienie danych dopisuje IU-6). Funkcja czysta: bez zegara i losowych id, ten sam wynik przy każdym odczycie (magazyn migruje przy każdym `wczytaj`).
- Klient `{ id, nazwa, telefon, adres, notatki, utworzony, zmieniony }`; `DLUGOSCI_KLIENTA = { nazwa: 120, telefon: 20, adres: 200, notatki: 1000 }` i `MAKS_KLIENTOW = 5000` w `src/dane/klienci.js` (źródło stałych); nazwa niepusta po przycięciu; telefon przez `bladTelefonu` z `src/dane/walidacja.js`; `jestKlient` to jedyny opis rekordu (magazyn i kopia, reguła kontrakt-wspolny).
- `klienci.js`: `dodajKlienta(magazyn, dane, { id, teraz })` (id od wołającego, drugi zapis z tym samym id nie dubluje; limit `MAKS_KLIENTOW` → `za_duzo`), `zapiszKlienta(magazyn, id, zmiany, { teraz })`, `usunKlienta(magazyn, id)` (klient z wyceną albo zleceniem → `BladKlienta('ma_historie')`; decyzja planu: bez usuwania klienta z historią), `listaKlientow(stan)` (po nazwie, `localeCompare` z `'pl'`), `klient(stan, id)`, `szukajKlientow(stan, fraza)` (nazwa, telefon, adres, bez wielkości liter), `normalizujNazwe(tekst)` (NFC, `toLocaleLowerCase('pl')`, zwinięte i przycięte spacje), `BladKlienta(kod, pole)`. Każda akcja to jedno `magazyn.zmien`.
- `zlecenia-ksztalt.js`: typy `Zlecenie`, `Okres`, `Cykl`, `StanWizyty`, `Zaplata` (model z „Kluczowe decyzje techniczne”: okresy z cyklem, godziną i jedną ceną według rozliczenia, wizyty pod datą pierwotną, zapłaty miesięczne pod `RRRR-MM`); stałe (źródło): `ROZLICZENIA = ['za_wizyte', 'miesiecznie']`, `FORMY_ZAPLATY = ['gotowka', 'przelew', 'blik']`, `MAKS_ZLECEN = 10000`, `MAKS_WIZYT_ZLECENIA = 2000`, `MAKS_MINUT_PRACY = 1440`, `DLUGOSC_OPISU = 120`; `CYKLE` importowane z `src/kalendarz/wystapienia.js`.
- `jestZlecenie` sprawdza wartości, nie tylko typy: okresy niepuste, rosnące `od`, pierwszy `od` = `start`; zlecenie jednorazowe ma jeden okres z `cykl: null`, seria — wszystkie okresy z cyklem; dni cyklu 1–7 bez powtórzeń, niepuste dla `tydzien` i `dwa_tygodnie`, puste dla `miesiac`; `miesiecznie` tylko w serii i z `cenaMiesiaca` (a `cenaWizyty: null`) w każdym okresie, `za_wizyte` odwrotnie; kwoty skończone ≥ 0; `koniec` null albo dzień ≥ `start`; klucze `wizyty` to dni, `zaplatyMiesieczne` — miesiące `RRRR-MM`, nie więcej niż `MAKS_WIZYT_ZLECENIA` wpisów; forma z `FORMY_ZAPLATY` albo null; `minutyPracy` null albo 1–`MAKS_MINUT_PRACY`; godziny przez `jestGodzina`.
- `jestStanem` dokłada: tablice `klienci` i `zlecenia` przez `jestKlient` i `jestZlecenie`, unikalne id i funkcję `odwolaniaSpojne(stan)` (`zlecenie.klientId` wskazuje istniejącego klienta, `zlecenie.wycenaId` null albo istniejącą wycenę); `wycena.klientId` dopisuje do niej IU-6. Jedna funkcja dla zapisu i importu kopii.

**Wzorce do naśladowania:**
- `src/dane/wyceny.js` — `jestWycena`, `BladWyceny`, operacje przez `magazyn.zmien`, id od wołającego w `dodajWykonanie`
- `src/dane/magazyn.test.js` i `tests/pamiec-magazynu.js` — testy magazynu na atrapie Storage

**Scenariusze testowe:**
- [Unit] stan v1 z `tests/fixtures/kopia-v1.json` po `zaktualizujStan` ma `wersja: 2`, puste `klienci` i `zlecenia`, a dwa wywołania dają równe wyniki (`deepEqual`)
- [Unit] `jestZlecenie` odrzuca kolejno: okresy w złej kolejności, pierwszy `od` różny od `start`, cykl tygodniowy bez dni, dzień tygodnia 8, `miesiecznie` w zleceniu jednorazowym, ujemną cenę, formę `'karta'`, `minutyPracy: 1441`, klucz wizyty `'jutro'`, `koniec` przed `start`
- [Unit] `jestStanem` odrzuca zlecenie z `klientId` nieistniejącego klienta i dwa zlecenia o tym samym id
- [Unit] `dodajKlienta` dwa razy z tym samym id zapisuje jednego klienta; nazwa 121 znaków i telefon „123” dają `BladKlienta` z polem; 5001. klient → `za_duzo`
- [Unit] `usunKlienta` klienta ze zleceniem rzuca `ma_historie`, klienta bez historii usuwa
- [Unit] `szukajKlientow(stan, 'kow')` znajduje „Anna Kowalska” i „KOWALSKI Jan”; `listaKlientow` stawia „Lucyna” przed „Łukasz”
- [Unit] `normalizujNazwe('  Anna   KOWALSKA ')` równa się `normalizujNazwe('anna kowalska')`; „Żaneta” w NFD i NFC daje ten sam wynik
- [Unit] `WERSJA_SCHEMATU` = 2, pusty stan magazynu ma `klienci: []` i `zlecenia: []`

**Weryfikacja:**
- `node --test src/dane/klienci.test.js src/dane/zlecenia-ksztalt.test.js src/dane/magazyn.test.js` przechodzi
- `npm test` przechodzi (stare testy wycen i kopii zostają zielone)
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-3: Zapis zleceń, wizyt i zapłat**

**Cel:** Operacje zapisu zleceń (ręczne, z wyceny, zmiana od wizyty, zakończenie, usunięcie) i stanu wizyt (zrobione, zapłata, czas pracy, przesunięcie, odwołanie, zapłata miesięczna).

**Wymagania:** R12, R13, R15, R16, R22, R26

**Zależności:** IU-2

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/dane/zlecenia.js` | 0 → 230 | — | nowy |
| Stwórz | `src/dane/wizyty.js` | 0 → 210 | — | nowy |
| Test (unit) | `src/dane/zlecenia.test.js` | 0 → 280 | — | nowy |
| Test (unit) | `src/dane/wizyty.test.js` | 0 → 290 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Każda akcja użytkownika to jedno `magazyn.zmien`; id zlecenia od wołającego (drugi zapis z tym samym id nie dubluje, jak `dodajWykonanie`); każda zmiana ustawia `zmienione` z `teraz` w opcjach (domyślnie `new Date()`); wynik przechodzi `jestStanem` (spójność odwołań). Limit `MAKS_ZLECEN = 10000` z `src/dane/zlecenia-ksztalt.js` → `BladZlecenia('za_duzo')`.
- `zlecenia.js`: `utworzZlecenie(magazyn, dane, { id, teraz })` (ręczne: `klientId` wymagany, `uslugaId` albo `opis`, `rozliczenie` z `ROZLICZENIA`, `start`, pierwszy okres z cyklem, godziną i ceną, `plan: null`); `zaplanujZWyceny(magazyn, wycenaId, dane, { id, teraz })` (wycena musi mieć status `przyjeta`, inaczej `zly_status`; `wycenaId` i `uslugaId` z wyceny; `plan = { minutyNormowe: wynik.minutyNormowe, tempo }`, gdy wycena ma migawkę — tempo podaje wołający z `tempoDoWyceny`); `zmienOdWizyty(magazyn, id, dataPierwotna, zmiany)` (nowy okres od daty pierwotnej z nową ceną, godziną albo cyklem; okres o tym samym `od` zostaje zastąpiony; podane pola nadpisują też późniejsze okresy (R13 „w przód”, ich pozostałe pola zostają), a zmiana cyklu usuwa późniejsze okresy, bo każdy okres liczy kotwicę cyklu od swojego `od`; w zleceniu jednorazowym zmienia jedyny okres, a dodanie cyklu → `jednorazowe`); `zakonczSerie(magazyn, id, ostatniDzien)` (`koniec`, nie wcześniej niż `start`); `usunZlecenie`; odczyty `zlecenie`, `zleceniaKlienta`, `zleceniaWyceny`, `czyWycenaZamknieta(stan, wycenaId)` (wycena z co najmniej jednym zleceniem jest tylko do odczytu), `doZaplanowania(stan, wycena)` (przyjęta bez zlecenia; abonament — `czyAbonament` z `src/dane/wyceny.js` — bez zlecenia z cyklem). Błędy `BladZlecenia(kod)`: `brak_zlecenia`, `brak_klienta`, `brak_wyceny`, `zly_status`, `jednorazowe`, `rozliczenie_miesieczne`, `za_duzo`.
- `wizyty.js` (stan w `zlecenie.wizyty[dataPierwotna]`; wpis powstaje przy pierwszej zmianie i znika, gdy wizyta wraca do stanu domyślnego): `oznaczZrobiona` / `cofnijZrobiona` (drugie oznaczenie nie zmienia znacznika `zrobiona`); `oznaczZaplacona(magazyn, id, dataPierwotna, { forma, teraz })` zapisuje `{ forma, data: dzień oznaczenia, kwota: cenaWizyty okresu daty pierwotnej }`, a bez `forma` bierze `formaDomyslna(stan, klientId)` (forma ostatniej zapłaty klienta, bez historii `'gotowka'`); `zmienForme`, `cofnijZaplate`; `wpiszCzasPracy(magazyn, id, dataPierwotna, minuty | null)` (1–`MAKS_MINUT_PRACY`, null usuwa); `przesunWizyte(magazyn, id, dataPierwotna, { data, godzina })` (powrót na datę pierwotną z godziną okresu → `przeniesiona: null`); `odwolajWizyte` / `przywrocWizyte`; `oznaczZaplateMiesiaca(magazyn, id, 'RRRR-MM', { forma, teraz })` / `cofnijZaplateMiesiaca` (tylko `rozliczenie: 'miesiecznie'`, kwota z `kwotaMiesiaca(z, miesiac)`: `cenaMiesiaca` okresu pierwszej wizyty z reguły w tym miesiącu, a gdy reguła nie daje w nim wizyty, np. po końcu serii — okresu pierwszej zrobionej, nieodwołanej wizyty z datą pierwotną w tym miesiącu; ta sama funkcja liczy „Niezapłacone” w `src/zlecenia/zapytania.js`). Zapłata pojedynczej wizyty w serii miesięcznej → `rozliczenie_miesieczne` (R26).
- Dni i miesiące przez `src/kalendarz/` (IU-1); dzień oznaczenia z `dzienLokalny(teraz)`.

**Wzorce do naśladowania:**
- `src/dane/wyceny.js` — `dodajWykonanie`, `zmienStatus`, `BladWyceny`
- `src/dane/klienci.js` (IU-2)

**Scenariusze testowe:**
- [Unit] `zaplanujZWyceny` dla wyceny `do_wyslania` → `zly_status`; dla przyjętej wyceny biura z abonamentem daje zlecenie z `plan.minutyNormowe` z migawki i podanym tempem
- [Unit] `utworzZlecenie` dwa razy z tym samym id daje jedno zlecenie; zlecenie bez klienta → `brak_klienta`
- [Unit] `zmienOdWizyty(…, '2026-11-16', { cenaWizyty: 280 })` w serii od 2026-11-02: wizyta 2026-11-09 ma starą cenę, 2026-11-16 — 280; drugi zapis z tym samym dniem zastępuje okres zamiast dokładać
- [Unit] `przesunWizyte` na dzień pierwotny z godziną okresu usuwa przesunięcie, a wpis bez innego stanu znika z `wizyty`
- [Unit] `oznaczZaplacona` bez formy u klienta, którego ostatnia zapłata była BLIK-iem → forma `'blik'`, kwota = cena okresu z dnia pierwotnego, data = dzień z `teraz`
- [Unit] zapłata wizyty w serii miesięcznej rzuca `rozliczenie_miesieczne`; `oznaczZaplateMiesiaca(…, '2026-11')` zapisuje kwotę `cenaMiesiaca`
- [Unit] czas pracy 0 i 1441 → błąd; null usuwa czas
- [Unit] `doZaplanowania`: przyjęta jednorazowa ze zleceniem → false; przyjęty abonament z samymi zleceniami jednorazowymi → true
- [Unit] `czyWycenaZamknieta` true dla wyceny ze zleceniem, false bez
- [Unit] `zakonczSerie` z dniem przed `start` → błąd

**Weryfikacja:**
- `node --test src/dane/zlecenia.test.js src/dane/wizyty.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-4: Zapytania dnia: wizyty, do zamknięcia i niezapłacone**

**Cel:** Czyste zapytania na stanie dla Start, kafli i kalendarza oraz stan E2E z zleceniami liczonymi względem dzisiejszego dnia.

**Wymagania:** R2, R14, R15, R16, R26

**Zależności:** IU-3

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/zlecenia/zapytania.js` | 0 → 170 | — | nowy |
| Test (unit) | `src/zlecenia/zapytania.test.js` | 0 → 250 | — | nowy |
| Stwórz | `e2e/stany/moduly-dzis.js` | 0 → 150 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `src/zlecenia/` to logika modułu Zlecenia bez DOM i bez zapisu (jak `src/kreator/` dla wyceny); funkcje dostają stan odczytany raz na render i `dzis` (`dzienLokalny`).
- `wizytyDnia(stan, dzien)` i `wizytyOkresu(stan, od, do)`: wizyty wszystkich zleceń z klientem (`klient(stan, id)`), adresem z karty klienta, nazwą (opis albo usługa — nazwę usługi podaje wołający z katalogu), kwotą (`cenaWizyty` albo null w serii miesięcznej) i stanem; odwołane z flagą.
- `doZamkniecia(stan, dzis)`: wizyty z dniem < `dzis` i ≥ dniem założenia zlecenia (`utworzone` w czasie lokalnym), nieodwołane, niezrobione albo zrobione bez zapłaty (rozliczenie za wizytę, cena > 0); najstarsze najpierw (decyzja planu: po „Zrobione” wiersz zostaje z „Zapłacone”).
- `niezaplacone(stan, dzis, klientId?)`: zrobione wizyty za wizytę bez zapłaty z ceną > 0 (każdego dnia) i miesiące serii miesięcznych przed bieżącym miesiącem z co najmniej jedną zrobioną wizytą i bez zapłaty (R26); element `{ rodzaj: 'wizyta' | 'miesiac', zlecenieId, klientId, klucz, kwota }`.
- `liczbaDzis(stan, dzis)` — nieodwołane wizyty dnia; `najblizsza(stan, dzis)` — najbliższa nieodwołana wizyta od jutra (`najblizszaWizyta` z IU-1).
- `e2e/stany/moduly-dzis.js`: samodzielny skrypt do `agent-browser eval` (bez importów), który buduje stan v2 z datami względem dzisiejszego dnia przeglądarki i zapisuje go do `localStorage['wyceny-sprzatanie:stan']` (`KLUCZ_MAGAZYNU`). Zawartość: ustawienia jak `e2e/stany/ustawienia-mazowieckie.json` (firma „Usługi Sprzątające Monika Lis”, kopia nigdy niezrobiona); klienci „Anna Kowalska” (600 100 200, „ul. Lipowa 3, Warszawa”, notatki „Klucze u sąsiadki, kod 1234”), „Biuro Rachunkowe Lis” („ul. Prosta 10, Warszawa”), „Jan Nowak” (bez telefonu i adresu); zlecenia: Z1 — Anna, jednorazowe dziś 9:00, 250 zł; Z2 — Biuro, seria co tydzień w dzień tygodnia dzisiejszego dnia, start i założenie 14 dni temu, 15:00, rozliczenie miesięczne 1200 zł, wizyta sprzed 14 dni zrobiona, sprzed 7 dni niezrobiona, zapłaty miesięczne za miesiące obu tych dni; Z3 — Jan, jednorazowe wczoraj 10:00, 180 zł, zrobione bez zapłaty; wyceny: do wysłania (Jan Nowak, okna), wysłana (Anna Kowalska), przyjęta bez zlecenia (Anna Kowalska, mieszkanie), przyjęta ze zleceniem Z2 (Biuro, abonament 1× w tygodniu); migawki wycen policzone raz silnikiem i wpisane do skryptu. Oczekiwane: dziś 2 wizyty, 2 do zamknięcia, 1 niezapłacona.

**Wzorce do naśladowania:**
- `src/widoki/start-dane.js` — czyste funkcje ekranu z testem
- `e2e/stany/wyceny-do-zrobienia.json` — stan do wstrzyknięcia z migawkami policzonymi silnikiem

**Scenariusze testowe:**
- [Unit] na stanie z Z1–Z3: `liczbaDzis` = 2, `doZamkniecia` = 2 (najpierw Biuro sprzed 7 dni, potem Jan z wczoraj), `niezaplacone` = 1 (Jan, 180 zł)
- [Unit] seria co tydzień założona dziś ze startem 4 tygodnie wstecz nie daje pozycji w `doZamkniecia`
- [Unit] wizyta zrobiona i zapłacona wypada z `doZamkniecia`; zrobiona bez zapłaty z ceną 0 zł nie jest niezapłacona
- [Unit] seria miesięczna: poprzedni miesiąc ze zrobioną wizytą bez zapłaty → jedna pozycja `miesiac`; bieżący miesiąc nie jest niezapłacony
- [Unit] wizyta przesunięta z dziś na jutro nie liczy się w `liczbaDzis` dziś, a liczy jutro
- [Unit] skrypt `e2e/stany/moduly-dzis.js` uruchomiony w `node:vm` z atrapą `localStorage` i zegarem ustawionym na 2026-11-02 (pn), 2026-11-08 (nd) i 2026-12-01 daje stan, który przechodzi `jestStanem`, z liczbami jak wyżej

**Weryfikacja:**
- `node --test src/zlecenia/zapytania.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

### Faza 2 — Przeniesienie wykonań i kopia v2

**Zależy od:** Faza 1

- [x] **IU-5: Tempo i „plan a fakt” z wizyt, bez ekranu zakończenia**

**Cel:** Własne tempo i lista „plan a fakt” liczą się z wizyt zleceń, a ekran zakończenia zlecenia przy wycenie znika.

**Wymagania:** R15, R22

**Zależności:** IU-3

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/zlecenia/plan-fakt.js` | 0 → 100 | — | nowy |
| Test (unit) | `src/zlecenia/plan-fakt.test.js` | 0 → 230 | — | nowy |
| Usuń | `src/kreator/zakonczenie.js` | 78 → 0 | — | usuń |
| Usuń | `src/kreator/zakonczenie.test.js` | 232 → 0 | — | usuń |
| Usuń | `src/widoki/zakonczenie.js` | 186 → 0 | — | usuń |
| Usuń | `src/widoki/zakonczenie.test.js` | 31 → 0 | — | usuń |
| Modyfikuj | `src/widoki/indeks.js` | 60 → 58 | — | zostaje |
| Modyfikuj | `src/ui/trasy.js` | 32 → 31 | — | zostaje |
| Modyfikuj | `src/ui/router.test.js` | 95 → 95 | — | zostaje |
| Modyfikuj | `src/kreator/podsumowanie.js` | 121 → 121 | — | zostaje |
| Modyfikuj | `src/kreator/szybka.js` | 157 → 157 | — | zostaje |
| Modyfikuj | `src/widoki/kreator-pomieszczenia.js` | 198 → 198 | — | zostaje |
| Modyfikuj | `src/widoki/start.js` | 114 → 114 | — | zostaje |
| Modyfikuj | `src/widoki/ustawienia-tempo.js` | 76 → 76 | — | zostaje |
| Modyfikuj | `src/widoki/podsumowanie.js` | 165 → 160 | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `src/zlecenia/plan-fakt.js` (korekta po fazie 2: `daneTempa` i `idWpisuWizyty` są w `src/zlecenia/dane-tempa.js`, bo plan-fakt.js importuje `src/kreator/podsumowanie.js`, który potrzebuje `daneTempa` — wspólny plik dałby cykl importów): `daneTempa(stan)` → tablica w kształcie `WycenaTempa` dla `src/silnik/tempo.js` (silnik bez zmian): jeden element na zlecenie z `plan` i co najmniej jedną wizytą z `minutyPracy`; `wejscie.uslugaId` = `zlecenie.uslugaId`, `wynik.minutyNormowe` = `plan.minutyNormowe`, `wykonania` = wizyty z czasem pracy `{ id: '<id zlecenia>:<data pierwotna>', data: dzień wizyty (przesunięty albo pierwotny), minuty }` w kolejności dni, a w tym samym dniu według `zrobiona` (kolejność decyduje o oknie 10 wpisów). Zlecenia bez planu nie liczą się do tempa (R15: tylko wizyty z czasem pracy i planem z wyceny).
- Do `plan-fakt.js` przechodzą z `src/kreator/zakonczenie.js`: `historiaPlanuIFaktu` (liczona z wizyt, tempo planu = `plan.tempo` zlecenia), `czasStartowy`, `planZakonczenia`, `poprawnyCzas`, `KROK_CZASU = 15` (źródło stałej; użyje ich ekran wizyty w IU-17). Funkcji bez użytkownika po usunięciu ekranu nie przenosisz.
- Wywołania `tempoDoWyceny` / `tempoWlasne` / `historiaPlanuIFaktu` w `src/kreator/podsumowanie.js`, `src/kreator/szybka.js`, `src/widoki/kreator-pomieszczenia.js`, `src/widoki/start.js`, `src/widoki/ustawienia-tempo.js`, `src/widoki/podsumowanie.js` dostają `daneTempa(stan)` zamiast `stan.wyceny`. Do migracji danych (IU-6) tempo liczy się z pustej listy zleceń — stan przejściowy w obrębie fazy.
- Ekran `#/wycena/:id/koniec` znika: trasa `zakonczenie` z `TRASY`, widok z `WIDOKI`, przycisk „Wpisz czas pracy” z podsumowania zapisanej wyceny i sekcja CSS ekranu zakończenia (zostaje część używana przez listę „Plan a fakt”). Czas pracy wpisuje się odtąd przy wizycie (IU-17); stary adres pokazuje „Nie ma takiego ekranu.”.

**Wzorce do naśladowania:**
- `src/kreator/zakonczenie.js` i `src/kreator/zakonczenie.test.js` — przypadki do przeniesienia
- `src/silnik/tempo.js` — kształt `WycenaTempa`

**Scenariusze testowe:**
- [Unit] `daneTempa` dla dwóch zleceń z planem (wizyty z czasem 270 i 300 min) i zlecenia ręcznego bez planu daje dwa elementy; `tempoWlasne` z trzech wizyt usługi `mieszkanie_standard` daje medianę stosunków czasu do minut normowych
- [Unit] dwie wizyty z czasem w tym samym dniu są w kolejności `zrobiona`
- [Unit] `historiaPlanuIFaktu` z wizyt pokazuje plan z `plan.tempo`, fakt i realną stawkę (przypadki przeniesione z `src/kreator/zakonczenie.test.js`)
- [Unit] `dopasuj('#/wycena/abc/koniec', TRASY)` zwraca null

**Weryfikacja:**
- `node --test src/zlecenia/plan-fakt.test.js src/ui/router.test.js` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów
- `grep -rn "kreator/zakonczenie\|widokZakonczeniaZlecenia\|'zakonczenie'" src/` nie zwraca wyników

- [x] **IU-6: Wycena v2 i przeniesienie danych z wersji 1**

**Cel:** Wycena bez statusu „wykonana” i bez wykonań, z klientem z listy, oraz migracja danych v1: klienci z nazw, wykonania i przyjęte wyceny jako zlecenia.

**Wymagania:** R22, R25, R19

**Zależności:** IU-5

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/dane/migracja-v2.js` | 25 → 175 | — | zostaje |
| Test (unit) | `src/dane/migracja-v2.test.js` | 0 → 290 | — | nowy |
| Stwórz | `tests/fixtures/stan-v1-pelny.json` | — → — | — | nowy |
| Modyfikuj | `src/dane/wyceny.js` | 284 → 285 | — | zostaje |
| Modyfikuj | `src/dane/wyceny.test.js` | 564 → 300 | przed zmianą 564 (ponad próg); powody zmiany 2 (zapis i walidacja wyceny; statusy i oferta); test-lustro tak — wyceny.js ma oddzielne bloki statusów i oferty; reguła 5 s nie | wydziel testy statusów, przejść i oferty do `src/dane/wyceny-statusy.test.js` |
| Stwórz | `src/dane/wyceny-statusy.test.js` | 0 → 270 | — | nowy |
| Modyfikuj | `src/dane/magazyn.js` | 150 → 170 | — | zostaje |
| Modyfikuj | `src/dane/magazyn.test.js` | 260 → 285 | — | zostaje |
| Modyfikuj | `src/dane/ksztalt.js` | 41 → 43 | — | zostaje |
| Modyfikuj | `src/dane/kopia.js` | 150 → 150 | — | zostaje |
| Modyfikuj | `src/app.js` | 73 → 80 | — | zostaje |
| Modyfikuj | `src/ui/format.js` | 106 → 105 | — | zostaje |
| Modyfikuj | `src/ui/statusy.js` | 13 → 12 | — | zostaje |
| Modyfikuj | `src/kreator/podsumowanie.js` | 121 → 122 | — | zostaje |
| Modyfikuj | `src/kreator/podsumowanie.test.js` | 197 → 197 | — | zostaje |
| Modyfikuj | `src/kreator/stan.js` | 107 → 108 | — | zostaje |
| Modyfikuj | `src/kreator/stan.test.js` | 302 → 304 | po zmianie 304; powody zmiany 1 (stan kreatora); eksporty bez zmian; importy z 2 domen (dane, silnik); test-lustro tak; reguła 5 s tak | zostaje |
| Modyfikuj | `src/widoki/kreator-wspolne.js` | 130 → 131 | — | zostaje |
| Modyfikuj | `src/widoki/podsumowanie.js` | 160 → 160 | — | zostaje |
| Modyfikuj | `src/widoki/pytania.js` | 217 → 217 | — | zostaje |
| Modyfikuj | `src/widoki/szybka.js` | 279 → 279 | — | zostaje |
| Modyfikuj | `src/widoki/start-dane.js` | 91 → 78 | — | zostaje |
| Modyfikuj | `src/widoki/start-dane.test.js` | 148 → 128 | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `src/dane/wyceny.js`: `STATUSY_WYCENY = ['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona']` (źródło stałej; bez `wykonana`); `PRZEJSCIA`: `przyjeta → odrzucona` (rezygnacja klienta, zlecenia zostają), reszta jak dotąd; usunięte `wykonania`, `dodajWykonanie`, `MAKS_MINUT_WYKONANIA` (zastępuje `MAKS_MINUT_PRACY` z IU-2) i reguła tylko do odczytu oparta na `wykonana`; nowe pole `klientId: string | null` w `jestWycena`; `przypiszKlienta(magazyn, wycenaId, klientId | null)` kopiuje nazwę i adres klienta do `wycena.klient` (termin zostaje), po wysłaniu oferty ustawia „nieaktualna” jak inne zmiany; `utworzSzkic` przyjmuje opcjonalny `klientId`; `usunWycene` w tym samym `zmien` zeruje `wycenaId` w zleceniach tej wyceny; `kwotaWyceny` przechodzi tu z `src/widoki/start-dane.js` (cena ręczna ?? cena z migawki), żeby migracja i formularz zlecenia miały jedno źródło kwoty.
- `odwolaniaSpojne` w `src/dane/magazyn.js` dokłada `wycena.klientId` (null albo istniejący klient).
- `TERMIN_ISO` przechodzi z `src/ui/format.js` do `src/dane/ksztalt.js` (źródło stałej; `format.js` go importuje), bo migracja w warstwie danych czyta termin wyceny.
- Reguła „wykonana = tylko do odczytu” zamienia się na `czyWycenaZamknieta(stan, id)` z `src/dane/zlecenia.js` w `src/kreator/stan.js` (`tylko_odczyt`), `src/kreator/podsumowanie.js` (`akcjeWyceny`), `src/widoki/kreator-wspolne.js`, `src/widoki/podsumowanie.js`, `src/widoki/pytania.js`, `src/widoki/szybka.js`. `ETYKIETY_STATUSOW` w `src/ui/statusy.js` i pigułka `.pigulka--wykonana` tracą `wykonana`.
- `src/widoki/start-dane.js`: bez zadania „Wpisz czas pracy” i bez realnej stawki z wykonań w karcie miesiąca (karta pokazuje „—” do IU-9, które ją usuwa); `src/dane/kopia.js`: `podsumowanieKopii` liczy zrobione wizyty zamiast wykonań (pełna kopia v2 — IU-7).
- Migracja `zV1DoV2` (decyzje z „Kluczowe decyzje techniczne”, migracja v1 → v2): klienci z nazw wycen poza szkicami grupowani `normalizujNazwe`, id `k-<id najstarszej wyceny grupy>`, nazwa z najnowszej wyceny, adres z najnowszej wyceny z adresem, telefon i notatki null, `utworzony` i `zmieniony` z dat wycen; wycena dostaje `klientId` grupy (szkice — null); każde wykonanie → zlecenie jednorazowe `z-<id wyceny>-<id wykonania>` (dzień wykonania, godzina z terminu tego dnia albo null, `cenaWizyty` = `kwotaWyceny`, `uslugaId` wyceny, `opis: null`, plan `{ minutyNormowe, tempo: tempoPlanu }` przy migawce, wizyta zrobiona z czasem pracy i zapłatą `{ forma: null, data: dzień wykonania, kwota }`); przyjęta bez wykonań, nie abonament, z terminem zgodnym z `TERMIN_ISO` → zlecenie jednorazowe `z-<id wyceny>` na termin; abonament bez zlecenia z cyklem i przyjęta bez czytelnego terminu — bez zlecenia („do zaplanowania”); `wykonana` → `przyjeta`; wycena z wykonaniami bez nazwy klienta → klient „Klient z wyceny {numer}”; znaczniki czasu z danych, `wycena.zmieniona` bez zmian. Wynik przechodzi `jestStanem`.
- Utrwalenie migracji: magazyn zapisuje wynik migracji raz, gdy w localStorage jest starsza wersja (bez ustawiania `kopia.zmianaOd`); `src/app.js` woła to przy starcie; błąd zapisu (brak miejsca) nie blokuje startu.

**Notatka wykonawcza:** Characterization-first: zanim usuniesz `wykonania`, policz w teście tempo i listę „plan a fakt” na fixture v1 starym kodem i zapisz wartości jako oczekiwane po migracji.

**Wzorce do naśladowania:**
- `tests/fixtures/kopia-v1.json` — kształt stanu v1
- `src/dane/kopia.js` — `polaczStany` i `bezPowtorzonychNumerow` jako wzór czystej transformacji stanu

**Scenariusze testowe:**
- [Unit] fixture `tests/fixtures/stan-v1-pelny.json` (wykonana z jednym wykonaniem, abonament przyjęty z trzema wykonaniami, przyjęta z terminem „2026-11-14T09:00”, przyjęta z terminem „sobota rano”, szkic z nazwą „test”, wyceny „Anna Kowalska” i „anna  kowalska” z różnymi adresami, szybka bez klienta) po migracji: jeden klient Anna z adresem z nowszej wyceny, bez klienta „test”, cztery zlecenia z wykonań, jedno zlecenie na 2026-11-14 9:00, przyjęta z „sobota rano” i abonament w `doZaplanowania`
- [Unit] migracja dwa razy daje równe stany, a wynik przechodzi `jestStanem`
- [Unit] tempo przed migracją (wartość zapisana z charakteryzacji) = `tempoWlasne(daneTempa(stanPoMigracji))`
- [Unit] wizyty z migracji są zrobione, zapłacone z formą null i kwotą wyceny (cena ręczna wygrywa)
- [Unit] przejście `przyjeta → odrzucona` dozwolone; status `wykonana` w stanie v2 odrzuca `jestWycena`
- [Unit] `przypiszKlienta` kopiuje nazwę i adres; po wysłaniu oferty ustawia „nieaktualna”
- [Unit] `usunWycene` zeruje `wycenaId` w zleceniu, zlecenie zostaje
- [Unit] zapis wejścia wyceny ze zleceniem rzuca `tylko_odczyt`
- [Unit] stan z localStorage w wersji 1 zostaje zapisany jako wersja 2 przy starcie, a `kopia.zmianaOd` się nie zmienia
- [E2E] `migracja-v1` — okno 360×800, wstrzyknij przez `agent-browser eval` treść `e2e/stany/wyceny-do-zrobienia.json` (stan v1) do `localStorage['wyceny-sprzatanie:stan']`, otwórz http://localhost:5174/#/start, potem #/wyceny, odczytaj `JSON.parse(localStorage['wyceny-sprzatanie:stan'])`, zrób screenshot → brak ekranu ratunkowego, lista ma trzy wyceny z pigułkami jak przed zmianą, zapisany stan ma `wersja: 2` i klientów z nazw wycen, konsola bez błędów

**Weryfikacja:**
- `node --test src/dane/migracja-v2.test.js src/dane/wyceny.test.js src/dane/wyceny-statusy.test.js src/dane/magazyn.test.js` przechodzi
- `npm test` przechodzi (w tym `src/dane/kopia.test.js` z `tests/fixtures/kopia-v1.json`)
- `npm run typecheck` przechodzi bez błędów
- `grep -rn "wykonana\|wykonania\|dodajWykonanie" src/ --include=*.js` zwraca tylko `src/dane/migracja-v2.js` i jego test (korekta po fazie 2: trafiają też testy odmowy statusu „wykonana” w stanie v2 oraz kontrakt silnika tempa `WycenaTempa.wykonania` w `src/silnik/tempo.js`, `src/zlecenia/dane-tempa.js` i ich testach, bo silnik tempa zostaje bez zmian)

- [x] **IU-7: Kopia zapasowa v2 i ekran ratunkowy**

**Cel:** Kopia obejmuje klientów i zlecenia z tymi samymi strażnikami co magazyn, łączy je po id, a ekran ratunkowy pyta przed zastąpieniem danych.

**Wymagania:** R24, R25

**Zależności:** IU-6

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/dane/kopia.js` | 150 → 205 | — | zostaje |
| Modyfikuj | `src/dane/kopia.test.js` | 281 → 285 | — | zostaje |
| Stwórz | `src/dane/kopia-v2.test.js` | 0 → 230 | — | nowy |
| Modyfikuj | `src/widoki/kopia-teksty.js` | 51 → 62 | — | zostaje |
| Modyfikuj | `src/widoki/kopia-teksty.test.js` | 97 → 120 | — | zostaje |
| Modyfikuj | `src/widoki/kopia.js` | 138 → 140 | — | zostaje |
| Modyfikuj | `src/widoki/ratunek.js` | 47 → 60 | — | zostaje |

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `sprawdzStanKopii`: klienci przez `jestKlient`, zlecenia przez `jestZlecenie`, unikalne id, limity `MAKS_KLIENTOW = 5000` (z `src/dane/klienci.js`) i `MAKS_ZLECEN = 10000` (z `src/dane/zlecenia-ksztalt.js`), spójność odwołań przez `jestStanem` — ta sama walidacja co zapis do magazynu (reguła kontrakt-wspolny). Nowe kody `BladKopii`: `za_duzo_klientow`, `za_duzo_zlecen`.
- `odczytajKopie`: plik v1 przechodzi przez ten sam `zaktualizujStan` (migracja z IU-6), plik v2 bez migracji; `NAZWA_APLIKACJI = 'wyceny-sprzatanie'` i nazwa pliku `wyceny-kopia-RRRR-MM-DD.json` bez zmian (stare kopie się wczytują).
- `polaczStany`: klienci i zlecenia po id, wygrywa późniejszy `zmieniony` / `zmienione`, remis — lokalny (jak wyceny); zlecenie łączy się w całości, a rekord usunięty lokalnie wraca z pliku (granica zakresu); wynik przechodzi `jestStanem`.
- `czyPrzypomniecOKopii` liczy też klientów i zlecenia; `podsumowanieKopii` → `{ wycen, klientow, zlecen, czyUstawienia }`; `etykietyPodsumowania` i `czyPytacOTryb` w `src/widoki/kopia-teksty.js` uwzględniają klientów i zlecenia (stan z samym klientem pyta „połącz / zastąp”).
- Ekran kopii: zdanie o danych klientów w pliku pod przyciskiem zrobienia kopii.
- `src/widoki/ratunek.js`: „Wczytaj kopię z pliku” zastępuje dane dopiero po potwierdzeniu w `dialogPotwierdzenia` (otwarty P3 z etapu 5; po wdrożeniu v2 stara karta zobaczy ten ekran przy `nowsza_wersja`).

**Teksty (verbatim):**
- Etykiety podsumowania kopii: „{n} wycena” / „{n} wyceny” / „{n} wycen”; „{n} klient” / „{n} klientów”; „{n} zlecenie” / „{n} zlecenia” / „{n} zleceń”
- Ekran kopii: „Plik kopii zawiera dane klientów, także notatki. Trzymaj go w bezpiecznym miejscu.”
- Dialog ratunku: tytuł „Zastąpić dane w tej przeglądarce?”, treść „Dane, których nie ma w pliku, znikną.”, przyciski „Zastąp” i „Anuluj”

**Wzorce do naśladowania:**
- `src/dane/kopia.test.js` — testy odmowy i round-trip wycen
- `src/ui/komponenty/uklad.js` — `dialogPotwierdzenia`

**Scenariusze testowe:**
- [Unit] round-trip: stan v2 z klientem i serią (dwa okresy, wizyty ze stanem, zapłata miesięczna) → `utworzKopie` → `odczytajKopie` → równy stan
- [Unit] odmowa: zlecenie wskazujące nieistniejącego klienta → `uszkodzony`; 5001 klientów → `za_duzo_klientow`; zlecenie z formą `'karta'` → `uszkodzony`; eksport stanu ponad limitem odmawia tak samo jak import
- [Unit] plik `tests/fixtures/kopia-v1.json` wczytuje się jako stan v2 z klientami z nazw wycen
- [Unit] „połącz”: klient zmieniony później w pliku wygrywa; zlecenie tylko lokalne zostaje; zlecenie z pliku wchodzi razem ze swoim klientem z pliku
- [Unit] `czyPytacOTryb` = true dla stanu z samym klientem; `czyPrzypomniecOKopii` = true po 7 dniach od pierwszego zlecenia bez kopii
- [Unit] etykiety podsumowania: „1 klient”, „2 klientów”, „5 zleceń”
- [Manual] na ekranie ratunkowym „Wczytaj kopię z pliku” pokazuje dialog „Zastąpić dane w tej przeglądarce?”, a „Anuluj” zostawia dane

**Weryfikacja:**
- `node --test src/dane/kopia.test.js src/dane/kopia-v2.test.js src/widoki/kopia-teksty.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

### Faza 3 — Nowy wygląd, szkielet i Start

**Zależy od:** Faza 2

- [x] **IU-8: Tokeny, komponenty i nagłówek modułu bez dolnego paska**

**Cel:** Biało-zielony wygląd w tokenach i wspólnych komponentach, nagłówek modułu z „← Start”, przełączniki widoków, „Więcej” i „?”, arkusze modułów, bez dolnego paska.

**Wymagania:** R4, R7, R8, R9, R10, R11

**Zależności:** Faza 2; makiety zaakceptowane (checklista)

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/style/tokeny.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/baza.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |
| Stwórz | `src/style/start.css` | — → — | — | nowy |
| Stwórz | `src/style/wyceny.css` | — → — | — | nowy |
| Stwórz | `src/style/chemia.css` | — → — | — | nowy |
| Stwórz | `src/style/ustawienia.css` | — → — | — | nowy |
| Stwórz | `src/style/klienci.css` | — → — | — | nowy |
| Stwórz | `src/style/zlecenia.css` | — → — | — | nowy |
| Stwórz | `src/style/kreator.css` | — → — | — | nowy |
| Stwórz | `src/style/szybka.css` | — → — | — | nowy |
| Stwórz | `src/style/podsumowanie.css` | — → — | — | nowy |
| Modyfikuj | `index.html` | — → — | — | zostaje |
| Modyfikuj | `manifest.webmanifest` | — → — | — | zostaje |
| Modyfikuj | `src/ui/komponenty/uklad.js` | 118 → 150 | — | zostaje |
| Test (unit) | `src/ui/komponenty/uklad.test.js` | 0 → 150 | — | nowy |
| Modyfikuj | `src/ui/ikony.js` | 31 → 37 | — | zostaje |
| Modyfikuj | `src/widoki/indeks.js` | 58 → 56 | — | zostaje |
| Modyfikuj | `src/widoki/lista-wycen.js` | 35 → 34 | — | zostaje |
| Modyfikuj | `src/widoki/katalog-chemii.js` | 71 → 70 | — | zostaje |
| Modyfikuj | `src/widoki/ustawienia.js` | 64 → 63 | — | zostaje |
| Modyfikuj | `src/widoki/start.js` | 114 → 113 | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript i zwykły CSS (bez Reacta i Tailwinda); źródło wyglądu: zaakceptowana makieta `docs/operator/aplikacja-modulowa-makiety.html` (układ i `:root`); nie wywołuj narzędzi Figma MCP.
- `tokeny.css`: nazwy tokenów zostają (decyzja planu: zmiana wyglądu = zmiana wartości), wartości z `:root` makiety; progi — `--tekst-podstawowy` ≥ 17 px, `--cel-dotyku: 48px`, biały tekst na `--marka-zielen` i `--marka-zielen` na białym ≥ 4,5:1, `--tekst-drugi` na `--tlo-karta` ≥ 4,5:1 (R11); nowe `--tekst-kwota` i `--tekst-tytul-modulu`; bez `--rozmiar-plus`; komentarz nagłówka pliku opisuje nowy wygląd zamiast wariantu B.
- `komponenty.css`: wspólne sekcje (nagłówek, karta, baner, wiersz ze strzałką, przyciski główny, drugi i tekstowy, pole, licznik, chipy, przełącznik, arkusz i dialog, komunikaty, pigułki) w nowym wyglądzie; rozmiary fontu tylko z tokenów; wysokości elementów klikalnych ≥ `--cel-dotyku` (dziś 36 i 40 px); R10: element klikalny wygląda jak przycisk albo wiersz ze strzałką, tekst nieklikalny nie ma ramki ani tła przycisku. Sekcja „Dolny pasek” i `scroll-padding-bottom` pod pasek znikają.
- Arkusze modułów `src/style/{start,wyceny,chemia,ustawienia,klienci,zlecenia,kreator,szybka,podsumowanie}.css` powstają z samym komentarzem nagłówka (która jednostka je wypełnia) i są podpięte w `index.html` w tej kolejności po `komponenty.css`; późniejsze jednostki zmieniają tylko swój arkusz.
- `index.html` (`theme-color`) i `manifest.webmanifest` (`background_color`, `theme_color`) — biel i zieleń z makiety.
- `uklad.js`: `naglowek({ tytul, podtytul, wstecz, wsteczTekst, czyDuzy })` — biały nagłówek, link powrotu z ikoną strzałki i widocznym tekstem `wsteczTekst` (bez niego: sama ikona z `aria-label="Wstecz"`, jak dotąd — dotychczasowe wywołania działają bez zmian); `przelaczniki(pozycje)` — `nav` z linkami (`aria-current="page"` na aktywnym), każdy ≥ 48 px; `wiecej({ etykieta }, ...tresc)` — `<details>` z `<summary>` „Więcej”; `podpowiedz({ tytul, tresc })` — przycisk z ikoną `help-circle` i `aria-label` „Wyjaśnienie: {tytul}”, otwiera `arkusz` z tekstem. Usunięte `dolnyPasek` i `POZYCJE_PASKA` oraz ich wywołania w `src/widoki/indeks.js`, `src/widoki/start.js`, `src/widoki/lista-wycen.js`, `src/widoki/katalog-chemii.js`, `src/widoki/ustawienia.js`.
- `ikony.js`: dochodzą `calendar`, `users`, `help-circle`, `chevron-left`, `settings` (Tabler Icons outline, ta sama przypięta wersja co reszta).

**Teksty (verbatim):**
- Rozwinięcie wyjaśnień: „Więcej”
- Etykieta przycisku „?” dla czytnika: „Wyjaśnienie: {tytuł}”
- Link powrotu do Start w module: „Start” (z ikoną strzałki w lewo)

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — `:root`, nagłówek, wiersz, przyciski, przełączniki
- `src/ui/h.test.js` — `AtrapaElementu` do testu komponentów bez jsdom

**Scenariusze testowe:**
- [Unit] `naglowek` z `wsteczTekst: 'Start'` daje link z tekstem „Start” i ikoną; bez `wsteczTekst` — link z `aria-label="Wstecz"`
- [Unit] `przelaczniki` ustawia `aria-current="page"` tylko na aktywnej pozycji
- [Unit] `wiecej` daje `details` z `summary` „Więcej” i treścią w środku; `podpowiedz` ma `aria-label` „Wyjaśnienie: Mediana rynku”
- [E2E] `wyglad-podstawy` — okno 360×800, wstrzyknij przez `agent-browser eval` treść `e2e/stany/ustawienia-mazowieckie.json` do `localStorage['wyceny-sprzatanie:stan']`, otwórz http://localhost:5174/#/ustawienia, #/chemia i #/wyceny, na każdym przez eval zmierz `getComputedStyle` tekstu akapitów i wysokość widocznych `a, button, input, select, summary` w `main`, policz kontrast koloru tekstu przycisku głównego do jego tła, zrób screenshot → tekst podstawowy ≥ 17 px, każdy element klikalny ≥ 48 px wysokości, kontrast przycisku głównego ≥ 4,5:1, brak elementu dolnego paska, tło strony białe, konsola bez błędów

**Weryfikacja:**
- `node --test src/ui/komponenty/uklad.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów
- `grep -rn "dolnyPasek\|dolny-pasek" src/ index.html` nie zwraca wyników
- `grep -c "src/style/zlecenia.css" index.html` zwraca 1

**Operator checklist:**
- [ ] Właściciel porównuje na telefonie nagłówek, przyciski, wiersze i kolory z zaakceptowaną makietą

- [x] **IU-9: Ekran Start z kaflami modułów**

**Cel:** Start z powitaniem, zdaniem o dniu, kaflami modułów z linią stanu, odnośnikiem „Ustawienia firmy” i jednym banerem.

**Wymagania:** R1, R2, R3, R5, R6

**Zależności:** IU-8

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/ui/moduly.js` | 0 → 35 | — | nowy |
| Modyfikuj | `src/widoki/start.js` | 113 → 115 | — | zostaje |
| Modyfikuj | `src/widoki/start-dane.js` | 78 → 160 | — | zostaje |
| Modyfikuj | `src/widoki/start-dane.test.js` | 128 → 240 | — | zostaje |
| Modyfikuj | `src/ui/format.js` | 105 → 115 | — | zostaje |
| Modyfikuj | `src/ui/format.test.js` | 152 → 165 | — | zostaje |
| Modyfikuj | `src/app.js` | 80 → 88 | — | zostaje |
| Modyfikuj | `src/style/start.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- `src/ui/moduly.js`: `MODULY` (źródło stałej) w kolejności R1; ta jednostka wpisuje Wycenę (`file-text`, trasa `wyceny`) i Chemię (`flask`, trasa `chemia`), Klientów dopisuje IU-13, Zlecenia — IU-15 (R1: kafel tylko dla gotowego modułu).
- `start-dane.js` (czyste funkcje z testem): `powitanie(ustawienia)`; `zdanieDnia(stan, dzis)` z `liczbaDzis` i `niezaplacone` z `src/zlecenia/zapytania.js`; `stanKafla(id, stan, dzis)` dla wszystkich czterech modułów (kolejność warunków w tekstach niżej; Wycena: `doZaplanowania` z `src/dane/zlecenia.js`, „czekają” = status `wyslana`; Chemia — stały tekst bez licznika, bez wczytywania `data/chemia.json` na Start); `banerStartu(stan, …)` — jeden baner w kolejności: instrukcja dla iPhone'a, przypomnienie o kopii, ustawienia domyślne (R5). Usunięte `doZrobienia`, `podsumowanieMiesiaca`, `wierszTempa`, `nazwaMiesiaca` i ich testy (karta miesiąca i „Do zrobienia” znikają ze Start; decyzja planu).
- `start.js`: `h1` z powitaniem, zdanie dnia, lista kafli z `MODULY` (`ul`, kafel to link ≥ 48 px z ikoną, nazwą i linią stanu; na telefonie dwie kolumny), wiersz-link „Ustawienia firmy” → `#/ustawienia` z ikoną `settings`, baner. Bez nagłówka z datą i bez kafli szybkiej i dokładnej wyceny (szybka wycena: kafel Wycena → „Szybka wycena”, R6). Kreator pierwszego uruchomienia kończy się na Start jak dotąd (R5).
- `format.js`: formy odmiany dla „niezapłacone”, „klient”, „czeka”; `kiedy(dzien, godzina, dzis)` („jutro 9:00”, „pt 7 lis, 9:00”).
- `app.js`: przy `visibilitychange` (strona widoczna) i `focus` porównuje dzień lokalny z dniem ostatniego renderu i woła `router.odswiez()`, gdy się zmienił.
- Stan E2E `e2e/stany/moduly-dzis.js` z IU-4.

**Teksty (verbatim):**
- Powitanie: „Dzień dobry, {nazwa firmy}”; bez nazwy firmy: „Dzień dobry”
- Zdanie o dniu: „Dziś {n} zlecenie” / „Dziś {n} zlecenia” / „Dziś {n} zleceń”; bez wizyt dziś: „Dziś nie masz zleceń”; gdy są niezapłacone, po kropce środkowej: „ · {m} niezapłacone” / „ · {m} niezapłaconych” (1–4 i 22–24… niezapłacone, 5+ niezapłaconych, jak `odmiana`)
- Nazwy kafli: „Zlecenia”, „Wycena”, „Klienci”, „Chemia”
- Linia stanu Zlecenia (pierwszy spełniony warunek): „{n} do zamknięcia”; „{n} dziś”; „Najbliższe: {kiedy}”; „Brak zaplanowanych wizyt”; bez zleceń: „Dodaj pierwsze zlecenie”
- Linia stanu Wycena: „{n} do wysłania”; „{n} do zaplanowania”; „{n} czeka na odpowiedź” / „{n} czekają na odpowiedź”; bez wycen: „Zrób pierwszą wycenę”; w pozostałych przypadkach: „{n} wycena” / „{n} wyceny” / „{n} wycen”
- Linia stanu Klienci: „{n} klient” / „{n} klientów”; bez klientów: „Dodaj pierwszego klienta”
- Linia stanu Chemia: „Środki do każdego brudu”
- Odnośnik: „Ustawienia firmy”
- Banery jak dotąd: „Ostatnia kopia danych: {dni temu}” z przyciskiem „Zrób kopię”; „Nie masz jeszcze kopii danych. Dane są tylko w tej przeglądarce.” z przyciskiem „Zrób kopię”; „Ustawienia domyślne – uzupełnij” z przyciskiem „Uzupełnij”; instrukcja dla iPhone'a bez zmian z przyciskiem „Rozumiem”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — ekran Start
- `src/widoki/start-dane.js` — czyste funkcje ekranu z testem

**Scenariusze testowe:**
- [Unit] `zdanieDnia` na stanie z `e2e/stany/moduly-dzis.js` (zegar 2026-11-02) → „Dziś 2 zlecenia · 1 niezapłacone”; bez zleceń → „Dziś nie masz zleceń”; bez wizyt dziś, z jedną niezapłaconą → „Dziś nie masz zleceń · 1 niezapłacone”; 5 niezapłaconych → „· 5 niezapłaconych”
- [Unit] `stanKafla('zlecenia', …)` daje „2 do zamknięcia”, po zamknięciu obu — „2 dziś”, bez dzisiejszych — „Najbliższe: jutro 9:00”, bez zleceń — „Dodaj pierwsze zlecenie”
- [Unit] `stanKafla('wycena', …)` daje „1 do wysłania”, bez niej „1 do zaplanowania”, bez wycen „Zrób pierwszą wycenę”
- [Unit] `banerStartu` przy braku kopii i ustawieniach domyślnych zwraca tylko baner kopii
- [Unit] `kiedy('2026-11-03', '09:00', '2026-11-02')` → „jutro 9:00”; `kiedy('2026-11-06', '09:00', '2026-11-02')` → „pt 6 lis, 9:00”
- [E2E] `start-moduly` — okno 360×800, uruchom w stronie przez `agent-browser eval` skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, zrób screenshot, kliknij kafel „Wycena”, potem „Szybka wycena” → nagłówek „Dzień dobry, Usługi Sprzątające Monika Lis”, zdanie „Dziś 2 zlecenia · 1 niezapłacone”, kafel „Wycena” z linią „1 do wysłania” i kafel „Chemia”, kafle w dwóch kolumnach, jeden baner („Nie masz jeszcze kopii danych…”), odnośnik „Ustawienia firmy”, brak dolnego paska, po dwóch dotknięciach adres #/szybka

**Weryfikacja:**
- `node --test src/widoki/start-dane.test.js src/ui/format.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel otwiera Start na telefonie i bez instrukcji ocenia, że aplikacja ma moduły, a szybka wycena jest w dwóch dotknięciach

- [x] **IU-10: Moduł Wycena: ekran główny**

**Cel:** Ekran modułu Wycena z dwoma dużymi przyciskami i listą wycen w sekcjach według tego, co trzeba zrobić.

**Wymagania:** R20, R6, R9

**Zależności:** IU-8

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/widoki/lista-wycen.js` | 34 → 85 | — | zostaje |
| Stwórz | `src/widoki/lista-wycen-dane.js` | 0 → 80 | — | nowy |
| Test (unit) | `src/widoki/lista-wycen-dane.test.js` | 0 → 140 | — | nowy |
| Modyfikuj | `src/style/wyceny.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- `lista-wycen-dane.js` (czyste): `sekcjeWycen(stan)` — „Do wysłania” (`do_wyslania`), „Do zaplanowania” (`doZaplanowania` z `src/dane/zlecenia.js`), „Czekają na odpowiedź” (`wyslana`), „Pozostałe” (szkice, przyjęte ze zleceniem, odrzucone); w sekcji od najnowszej `zmieniona`; pustych sekcji nie ma w wyniku. `wierszWyceny(w, katalog)` → tytuł (nazwa klienta, a bez niej nazwa usługi) i jedna linia szczegółów (kwota z `kwotaWyceny` i usługa, bez klienta — kwota i data); statusy z `STATUSY_WYCENY` (`src/dane/wyceny.js`), etykiety z `ETYKIETY_STATUSOW`.
- `lista-wycen.js` (`#/wyceny`): nagłówek z powrotem „Start” i tytułem „Wycena”; dwa duże przyciski (główny „Szybka wycena” → `#/szybka`, drugi „Dokładna wycena” → `#/kreator/usluga`); sekcje z nagłówkami; wiersz ze strzałką → `#/wycena/<id>` (szkic → kreator jak dotąd); pigułka statusu tylko w „Pozostałe”. Przycisk „Zaplanuj” w wierszach „Do zaplanowania” dokłada IU-16.
- Sekcja „Lista wycen” przechodzi z `komponenty.css` do `src/style/wyceny.css`.

**Teksty (verbatim):**
- Tytuł: „Wycena”
- Przyciski: „Szybka wycena” z podpisem „przez telefon”; „Dokładna wycena” z podpisem „na miejscu”
- Sekcje: „Do wysłania”, „Do zaplanowania”, „Czekają na odpowiedź”, „Pozostałe”
- Bez wycen (pod przyciskami): „Nie masz jeszcze wycen.”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — ekran modułu Wycena
- `src/widoki/start-dane.js` — `kwotaWyceny`, `adresWyceny` (przed IU-6 tam; od IU-6 `kwotaWyceny` w `src/dane/wyceny.js`)

**Scenariusze testowe:**
- [Unit] `sekcjeWycen` na stanie z `e2e/stany/moduly-dzis.js`: kolejność „Do wysłania” (Jan Nowak), „Do zaplanowania” (Anna Kowalska), „Czekają na odpowiedź” (Anna Kowalska), „Pozostałe” (Biuro Rachunkowe Lis)
- [Unit] przyjęty abonament z samymi zleceniami jednorazowymi jest w „Do zaplanowania”; wycena bez klienta ma tytuł z nazwą usługi
- [E2E] `wycena-modul` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij kafel „Wycena”, zrób screenshot → nagłówek „Wycena” z powrotem „Start”, przyciski „Szybka wycena” i „Dokładna wycena” na górze, sekcje w kolejności „Do wysłania”, „Do zaplanowania”, „Czekają na odpowiedź”, „Pozostałe”, każdy wiersz w najwyżej dwóch liniach

**Weryfikacja:**
- `node --test src/widoki/lista-wycen-dane.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-11: Moduł Chemia w nowym wyglądzie**

**Cel:** Katalog środków, karta produktu i krok doboru chemii w nowym wyglądzie z mniejszą ilością tekstu.

**Wymagania:** R23, R4, R9, R10

**Zależności:** IU-8

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/widoki/katalog-chemii.js` | 70 → 76 | — | zostaje |
| Modyfikuj | `src/widoki/karta-produktu.js` | 53 → 56 | — | zostaje |
| Modyfikuj | `src/widoki/dobor-chemii.js` | 90 → 93 | — | zostaje |
| Modyfikuj | `src/style/chemia.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Katalog (`#/chemia`): nagłówek z powrotem „Start” i tytułem „Chemia”; po wyborze kategorii powrót „Chemia”. Wiersz produktu w dwóch liniach (nazwa; pH, producent i cena w jednej linii); opisy kategorii, stężenia i uwagi o karcie SDS pod `wiecej` albo `podpowiedz` (IU-8); link do karty charakterystyki jako przycisk drugi.
- Dobór chemii w kreatorze (`dobor-chemii.js`) używa tych samych wierszy i reguły „Więcej”; logika doboru bez zmian (R21).
- Sekcja „Dobór chemii i katalog środków” przechodzi z `komponenty.css` do `src/style/chemia.css`.

**Teksty (verbatim):**
- Tytuł: „Chemia”
- Powrót z kategorii: „Chemia”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — wiersz listy i „Więcej”

**Scenariusze testowe:**
- [E2E] `chemia-modul` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/start, kliknij kafel „Chemia”, wybierz pierwszą kategorię, rozwiń „Więcej” przy pierwszym produkcie, zrób screenshot → nagłówek „Chemia” z powrotem „Start”, w kategorii powrót „Chemia”, wiersze w najwyżej dwóch liniach, tekst ≥ 17 px, opis widoczny dopiero po „Więcej”

**Weryfikacja:**
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-12: Ustawienia, kreator startowy i kopia w nowym wyglądzie**

**Cel:** Ustawienia firmy, kreator pierwszego uruchomienia, kopia i ekran ratunkowy w nowym wyglądzie z jedną główną akcją na ekranie.

**Wymagania:** R5, R8, R9, R10

**Zależności:** IU-8

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/widoki/ustawienia.js` | 63 → 66 | — | zostaje |
| Modyfikuj | `src/widoki/ustawienia-sekcje.js` | 160 → 165 | — | zostaje |
| Modyfikuj | `src/widoki/ustawienia-tempo.js` | 76 → 78 | — | zostaje |
| Modyfikuj | `src/widoki/ustawienia-oferta.js` | 63 → 64 | — | zostaje |
| Modyfikuj | `src/widoki/kreator-startowy.js` | 86 → 88 | — | zostaje |
| Modyfikuj | `src/widoki/kopia.js` | 140 → 142 | — | zostaje |
| Modyfikuj | `src/widoki/ratunek.js` | 60 → 61 | — | zostaje |
| Modyfikuj | `src/style/ustawienia.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Ustawienia (`#/ustawienia`): tytuł „Ustawienia firmy”, powrót „Start”; kopia (`#/kopia`): powrót „Ustawienia firmy”; sekcje ustawień w wierszach ze strzałką; wyjaśnienia (VAT, tempo, warunki oferty) pod „Więcej” albo „?”; jedna główna akcja na ekranie („Zapisz”, „Zrób kopię”).
- Kreator pierwszego uruchomienia: te same kroki i teksty decyzji, nowy wygląd; „Gotowe” i „Pomiń” prowadzą na Start (R5).
- Korekta po fazie 3: sekcje ustawień zostały kartami z wierszami ze strzałką, a każdy wiersz otwiera arkusz z jedną akcją „Zapisz” — osobny ekran na sekcję (jak w makiecie) wymaga nowych tras w `src/ui/trasy.js` i `src/app.js`, których ta jednostka nie miała; to osobna jednostka albo decyzja właściciela.
- Sekcje „Ustawienia firmy i kreator pierwszego uruchomienia” i „Kopia danych i ekran ratunkowy” przechodzą z `komponenty.css` do `src/style/ustawienia.css`.

**Teksty (verbatim):**
- Tytuł ustawień: „Ustawienia firmy”
- Powrót z kopii: „Ustawienia firmy”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — formularze i wiersze

**Scenariusze testowe:**
- [E2E] `ustawienia-kopia-wyglad` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij „Ustawienia firmy”, potem wiersz „Kopia danych”, zrób screenshot → tytuł „Ustawienia firmy” z powrotem „Start”, na kopii powrót „Ustawienia firmy”, chipy podsumowania „4 wyceny”, „3 klientów”, „3 zlecenia” i zdanie „Plik kopii zawiera dane klientów, także notatki. Trzymaj go w bezpiecznym miejscu.”
- [E2E] `kreator-startowy-wyglad` — okno 360×800, wyczyść localStorage, otwórz http://localhost:5174/, przejdź kreator z województwem mazowieckim i kliknij „Gotowe”, zrób screenshot → kreator w nowym wyglądzie, po „Gotowe” ekran Start z powitaniem „Dzień dobry”

**Weryfikacja:**
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

### Faza 4 — Klienci

**Zależy od:** Faza 3

- [x] **IU-13: Lista, karta i formularz klienta**

**Cel:** Moduł Klienci: lista z wyszukiwaniem, formularz dodania i edycji, karta z telefonem, mapą, notatkami i historią wycen.

**Wymagania:** R17, R18, R1, R3

**Zależności:** Faza 3

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/ui/trasy.js` | 31 → 35 | — | zostaje |
| Modyfikuj | `src/ui/router.test.js` | 95 → 103 | — | zostaje |
| Modyfikuj | `src/widoki/indeks.js` | 56 → 62 | — | zostaje |
| Modyfikuj | `src/ui/moduly.js` | 35 → 36 | — | zostaje |
| Stwórz | `src/widoki/klienci-lista.js` | 0 → 90 | — | nowy |
| Stwórz | `src/widoki/klient-karta.js` | 0 → 140 | — | nowy |
| Stwórz | `src/widoki/klient-formularz.js` | 0 → 130 | — | nowy |
| Stwórz | `src/widoki/klienci-dane.js` | 0 → 110 | — | nowy |
| Test (unit) | `src/widoki/klienci-dane.test.js` | 0 → 170 | — | nowy |
| Modyfikuj | `src/style/klienci.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Trasy (źródło stałych): `klienci: '#/klienci'`, `nowyKlient: '#/klienci/nowy'` (przed `klient`, bo router bierze pierwsze dopasowanie), `klient: '#/klienci/:id'`, `edycjaKlienta: '#/klienci/:id/edycja'`; widoki w `WIDOKI`.
- `MODULY` dostaje kafel Klienci (`users`, trasa `klienci`); linię stanu liczy już `stanKafla` z IU-9.
- Lista: powrót „Start”, tytuł „Klienci”, pole wyszukiwania (filtr w pamięci przez `szukajKlientow` z `src/dane/klienci.js`, bez zapisu), główny przycisk „Dodaj klienta”, wiersze ze strzałką (nazwa; telefon, a bez niego adres) → karta.
- Formularz (nowy i edycja): pola z `maxlength` z `DLUGOSCI_KLIENTA = { nazwa: 120, telefon: 20, adres: 200, notatki: 1000 }` (`src/dane/klienci.js`); błędy `BladKlienta` przez `src/widoki/teksty-bledow.js`; id nowego klienta nadany przy otwarciu ekranu (`crypto.randomUUID()`), zapis `dodajKlienta` / `zapiszKlienta` jednym `zmien`, po zapisie `history.replaceState` na kartę; podpowiedź duplikatu przy wpisywaniu nazwy (`podobnyKlient`, porównanie `normalizujNazwe`) z linkiem do karty istniejącego klienta.
- Karta: nazwa (`h1`), powrót „Klienci”; telefon jako link `tel:` (numer bez spacji i myślników), adres jako link do mapy `https://www.google.com/maps/search/?api=1&query=<encodeURIComponent(adres)>` z `target="_blank"` i `rel="noopener noreferrer"`; notatki w całości; główny przycisk „Nowa wycena” (→ `#/kreator/usluga?klient=<id>`; parametr obsługuje IU-14); sekcja „Wyceny” (historia z kwotą i pigułką statusu → `#/wycena/<id>`); „Edytuj”; „Usuń klienta” tylko bez historii, z `dialogPotwierdzenia` (klient z historią — bez przycisku; decyzja planu). Sekcje zleceń i „Nowe zlecenie” dokłada IU-18.
- `klienci-dane.js` (czyste): `historiaWycen(stan, klientId)`, `opisWiersza(klient)`, `linkTelefonu(telefon)`, `linkMapy(adres)`, `podobnyKlient(stan, nazwa, pomijanyId)`.

**Teksty (verbatim):**
- Lista: tytuł „Klienci”; pole „Szukaj klienta”; przycisk „Dodaj klienta”; pusta lista: „Nie masz jeszcze klientów.” z przyciskiem „Dodaj klienta”; brak wyników: „Nie ma klienta „{fraza}”.”
- Formularz: tytuły „Nowy klient” / „Edycja klienta”; pola „Nazwa” (podpis „Imię i nazwisko albo firma”), „Telefon”, „Adres”, „Notatki” (podpis „Np. klucze, kod do domofonu, zwierzęta”); przycisk „Zapisz”; błąd nazwy „Wpisz nazwę klienta.”; podpowiedź „Masz już klienta {nazwa}.” z linkiem „Otwórz kartę”
- Karta: „Zadzwoń” przy telefonie, „Pokaż na mapie” przy adresie, „Notatki”, przyciski „Nowa wycena” i „Edytuj”, sekcja „Wyceny”, bez wycen: „Brak wycen.”, „Usuń klienta”; dialog: „Usunąć klienta {nazwa}?”, „Usuń”, „Anuluj”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — lista klientów i karta klienta
- `src/widoki/kreator-usluga.js` — `history.replaceState` po utworzeniu rekordu i `czyAktywny`

**Scenariusze testowe:**
- [Unit] `linkTelefonu('600 100 200')` → `tel:600100200`; `linkTelefonu('+48 600-100-200')` → `tel:+48600100200`; `linkMapy('ul. Lipowa 3, Warszawa')` koduje spacje i przecinek
- [Unit] `podobnyKlient(stan, '  anna KOWALSKA')` znajduje „Anna Kowalska”, a z `pomijanyId` tej klientki — nie
- [Unit] `historiaWycen` zwraca wyceny klienta od najnowszej z kwotą
- [Unit] `dopasuj('#/klienci/nowy', TRASY)` → `nowyKlient`; `dopasuj('#/klienci/k-1/edycja', TRASY)` → `edycjaKlienta` z `id: 'k-1'`
- [E2E] `klienci-dodaj-karta` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij kafel „Klienci”, „Dodaj klienta”, wpisz „Ewa Zielińska”, telefon „601 202 303”, adres „ul. Polna 5, Kraków”, kliknij „Zapisz”, wróć do listy, wpisz w wyszukiwanie „ziel”, zrób screenshot → Start ma kafel „Klienci” z „3 klientów”, po zapisie karta „Ewa Zielińska” z linkiem `tel:601202303` i linkiem mapy z adresem, lista po wyszukaniu ma jedną pozycję, przycisk wstecz przeglądarki z karty nie otwiera ponownie pustego formularza

**Weryfikacja:**
- `node --test src/widoki/klienci-dane.test.js src/ui/router.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Na telefonie dotknięcie numeru na karcie klienta otwiera dzwonienie, a adresu — mapę

- [x] **IU-14: Wybór klienta w wycenie**

**Cel:** W wycenie klienta wybiera się z listy albo dodaje w tym samym arkuszu, a „Nowa wycena” z karty klienta zaczyna wycenę z tym klientem.

**Wymagania:** R19, R18

**Zależności:** IU-13

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/ui/komponenty/wybor-klienta.js` | 0 → 160 | — | nowy |
| Modyfikuj | `src/widoki/klienci-dane.js` | 110 → 130 | — | zostaje |
| Modyfikuj | `src/widoki/klienci-dane.test.js` | 170 → 200 | — | zostaje |
| Modyfikuj | `src/widoki/podsumowanie.js` | 160 → 168 | — | zostaje |
| Modyfikuj | `src/widoki/oferta-edycja-sekcje.js` | 206 → 210 | — | zostaje |
| Modyfikuj | `src/widoki/oferta-edycja.js` | 238 → 240 | — | zostaje |
| Modyfikuj | `src/kreator/stan.js` | 108 → 112 | — | zostaje |
| Modyfikuj | `src/kreator/stan.test.js` | 304 → 312 | po zmianie 312; powody zmiany 1 (stan kreatora); eksporty bez zmian; importy z 2 domen; test-lustro tak; reguła 5 s tak | zostaje |
| Modyfikuj | `src/widoki/kreator-usluga.js` | 163 → 166 | — | zostaje |
| Modyfikuj | `src/kreator/szybka.js` | 157 → 160 | — | zostaje |
| Modyfikuj | `src/widoki/szybka.js` | 279 → 283 | — | zostaje |
| Modyfikuj | `src/style/klienci.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `wyborKlienta({ stan, wybranyId, wymagany, naWybor })`: wiersz-przycisk z wybranym klientem albo „Wybierz klienta”; otwiera `arkusz` z polem wyszukiwania, listą pasujących (`propozycjeKlientow(stan, fraza)`, najwyżej 8), wierszem „Dodaj nowego klienta: {tekst}” (w tym samym arkuszu krótki formularz: nazwa wypełniona wpisanym tekstem, telefon, adres) i opcją „Bez klienta”, gdy wybór nie jest wymagany. Nowy klient zapisuje się (`dodajKlienta`, id z `crypto.randomUUID()` przy otwarciu formularza) dopiero przy „Zapisz klienta”; porzucony arkusz nie zostawia klienta. Arkusz sprawdza `czyAktywny`.
- Korekta po implementacji (faza 4, 2026-11-03): sygnatura to `wyborKlienta({ magazyn, wybranyId, wymagany, naWybor, czyAktywny, id })` → `{ element, sprawdz }`. Komponent dostaje `magazyn` (potrzebny `dodajKlienta`, arkusz czyta świeży stan przy otwarciu), `naWybor(klientId)` zwraca tekst błędu albo `null` (przy błędzie arkusz zostaje otwarty z banerem), a `sprawdz()` pokazuje „Wybierz klienta.” przy wymaganym wyborze (IU-16).
- Wycena: wybór woła `przypiszKlienta(magazyn, wycenaId, klientId)` z `src/dane/wyceny.js` (kopiuje nazwę i adres do `wycena.klient`; decyzja planu: zmiana karty nie zmienia kopii). Pole „Klient (np. imię i dzielnica)” w arkuszu „Zapisz” podsumowania i pole „Klient” w karcie „Klient i termin” edycji oferty zastępuje `wyborKlienta`; pole adresu w ofercie zostaje i zmienia tylko wycenę; termin bez zmian.
- Klient opcjonalny w szybkiej i dokładnej wycenie (R19); wymagany przy „Zaplanuj” (IU-16). Szybka wycena dostaje opcjonalny wiersz `wyborKlienta` (bez wymogu), a wybór zapisuje się do jej rekordu tak jak inne pola szybkiej wyceny.
- `#/kreator/usluga?klient=<id>` i `#/szybka?klient=<id>` (karta klienta → „Nowa wycena”, R18): szkic powstaje z `klientId` (`utworzSzkic` z IU-6), nieistniejący klient w parametrze jest pomijany.

**Teksty (verbatim):**
- Wiersz: „Klient”, bez wyboru „Wybierz klienta”, przycisk „Zmień”
- Arkusz: tytuł „Klient”, pole „Szukaj albo wpisz nowego”, wiersz „Dodaj nowego klienta: {tekst}”, opcja „Bez klienta”, przycisk „Zapisz klienta”
- Błąd przy wymaganym wyborze: „Wybierz klienta.”

**Wzorce do naśladowania:**
- `src/widoki/podsumowanie.js` — arkusz „Zapisz” z polem klienta
- `src/widoki/kreator-usluga.js` — arkusz z `czyAktywny`

**Scenariusze testowe:**
- [Unit] `propozycjeKlientow(stan, 'an')` zwraca najwyżej 8 klientów, najpierw tych, których nazwa zaczyna się od frazy
- [Unit] szkic utworzony z parametrem `klient` ma `klientId` i nazwę klienta w `wycena.klient`; nieistniejący klient daje szkic bez klienta
- [E2E] `wycena-klient-z-listy` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/klienci, otwórz kartę „Anna Kowalska”, kliknij „Nowa wycena”, przejdź kreator mieszkania 50 m² do podsumowania i kliknij „Zapisz”; potem otwórz ekran Wycena, „Szybka wycena”, kliknij „Wybierz klienta”, wpisz „Piotr Wiśniewski”, kliknij „Dodaj nowego klienta: Piotr Wiśniewski” i zamknij arkusz bez zapisu, otwórz listę klientów, zrób screenshot → zapisana wycena ma klienta „Anna Kowalska” bez wpisywania nazwy, na karcie Anny w „Wyceny” jest nowa wycena, a na liście klientów nie ma „Piotr Wiśniewski” (porzucony arkusz nie dodał klienta)

**Weryfikacja:**
- `node --test src/widoki/klienci-dane.test.js src/kreator/stan.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

### Faza 5 — Zlecenia i kalendarz

**Zależy od:** Faza 4

- [x] **IU-15: Kalendarz: Dzień, Tydzień i Miesiąc**

**Cel:** Moduł Zlecenia z widokami Dzień (z „Do zamknięcia” i szybkim zamykaniem wizyt), Tydzień i Miesiąc oraz trasami całego modułu.

**Wymagania:** R14, R15, R16, R4, R1

**Zależności:** Faza 4

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/ui/trasy.js` | 35 → 40 | — | zostaje |
| Modyfikuj | `src/ui/router.test.js` | 103 → 112 | — | zostaje |
| Modyfikuj | `src/widoki/indeks.js` | 62 → 70 | — | zostaje |
| Modyfikuj | `src/ui/moduly.js` | 36 → 37 | — | zostaje |
| Stwórz | `src/zlecenia/kalendarz-dane.js` | 0 → 140 | — | nowy |
| Test (unit) | `src/zlecenia/kalendarz-dane.test.js` | 0 → 210 | — | nowy |
| Stwórz | `src/widoki/zlecenia-wspolne.js` | 0 → 90 | — | nowy |
| Stwórz | `src/widoki/zlecenia-dzien.js` | 0 → 140 | — | nowy |
| Stwórz | `src/widoki/zlecenia-tydzien.js` | 0 → 80 | — | nowy |
| Stwórz | `src/widoki/zlecenia-miesiac.js` | 0 → 90 | — | nowy |
| Modyfikuj | `src/ui/format.js` | 115 → 125 | — | zostaje |
| Modyfikuj | `src/ui/format.test.js` | 165 → 180 | — | zostaje |
| Modyfikuj | `src/style/zlecenia.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Trasy modułu (źródło stałych): `zlecenia: '#/zlecenia/:widok'` (`dzien` | `tydzien` | `miesiac`, zapytanie `?data=RRRR-MM-DD`, domyślnie dziś; inny widok → „Nie ma takiego ekranu.”), `noweZlecenie: '#/zlecenie/nowe'` (przed `zlecenie`), `zlecenie: '#/zlecenie/:id'`, `wizyta: '#/zlecenie/:id/wizyta/:data'`. Do czasu IU-16–IU-18 (ta sama faza) `noweZlecenie`, `zlecenie` i `wizyta` mają w `WIDOKI` widok „Nie ma takiego ekranu.”.
- `MODULY` dostaje kafel Zlecenia (`calendar`, trasa `zlecenia` z widokiem `dzien`) jako pierwszy (kolejność R1); linię stanu liczy `stanKafla` z IU-9.
- `kalendarz-dane.js` (czyste, z `src/zlecenia/zapytania.js` i `src/kalendarz/`): `WIDOKI_KALENDARZA = [{ id: 'dzien', etykieta: 'Dzień' }, { id: 'tydzien', etykieta: 'Tydzień' }, { id: 'miesiac', etykieta: 'Miesiąc' }]`; `modelDnia(stan, katalog, dzien, dzis)` (sekcja „Do zamknięcia” tylko gdy `dzien` = `dzis`, wizyty dnia, przyciski wiersza), `modelTygodnia` (7 dni od poniedziałku z wizytami), `modelMiesiaca` (siatka z `siatkaMiesiaca` i liczbą nieodwołanych wizyt na dzień), `sasiedni(widok, dzien, kierunek)`.
- `zlecenia-wspolne.js`: nagłówek modułu (powrót „Start”, tytuł „Zlecenia”, `przelaczniki` z IU-8 zachowujące `data`), pasek daty z „‹”, „›” i „Dziś”, wiersz wizyty (dwie linie: „{godzina} · {klient}”; „{adres} · {kwota}”, wiersz → `#/zlecenie/<id>/wizyta/<data pierwotna>`), przycisk „Nowe zlecenie” (→ `#/zlecenie/nowe?data=<dzień>`).
- Dzień: na górze „Do zamknięcia” (dziś), potem wizyty dnia; odwołane przekreślone z pigułką „Odwołana”. W wierszu wizyty z dniem ≤ dziś: „Zrobione” (gdy niezrobiona) i „Zapłacone” (gdy rozliczenie za wizytę, cena > 0 i bez zapłaty) — `oznaczZrobiona` i `oznaczZaplacona` bez formy (forma domyślna klienta) z `src/dane/wizyty.js`, każde jednym zapisem; zrobiona i zapłacona wizyta wypada z „Do zamknięcia” (zamknięcie dwoma dotknięciami, R15). Wizyty serii miesięcznej mają tylko „Zrobione” (R26).
- Tydzień: lista 7 dni od poniedziałku (decyzja planu: lista, nie siatka), dzień jako nagłówek „{skrót} {dzień} {miesiąc}” z liczbą wizyt, pod nim wiersze bez przycisków zamknięcia; pusty dzień „Brak wizyt”. Miesiąc: siatka 7 kolumn (pn–nd) z numerem dnia i liczbą wizyt, dzisiaj wyróżniony, komórka ≥ 48 px, dotknięcie → widok Dzień tego dnia.
- `format.js`: `SKROTY_DNI = ['pn', 'wt', 'śr', 'czw', 'pt', 'sb', 'nd']` (źródło stałej), `dzienKrotko` („pn 3 lis”), `miesiacRok` („Listopad 2026”), `godzina` („9:00”).

**Teksty (verbatim):**
- Tytuł: „Zlecenia”; przełączniki: „Dzień”, „Tydzień”, „Miesiąc”
- Nawigacja: „Dziś”; etykiety dla czytnika: „Poprzedni dzień”, „Następny dzień”, „Poprzedni tydzień”, „Następny tydzień”, „Poprzedni miesiąc”, „Następny miesiąc”
- Sekcje: „Do zamknięcia”; nad wizytami dnia, gdy wyżej jest „Do zamknięcia”: „Wizyty dnia”
- Wiersz w „Do zamknięcia” (zaległa wizyta z innego dnia): pierwsza linia „{klient}”, druga „{dzień}, {godzina} · {kwota}” (np. „nd 1 lis, 10:00 · 180 zł”) zamiast adresu
- Przyciski wiersza: „Zrobione”, „Zapłacone”; pigułka „Odwołana”; kwota w serii miesięcznej: „w abonamencie”
- Pusty dzień: „Brak wizyt tego dnia.” z przyciskiem „Nowe zlecenie”; pusty dzień w tygodniu: „Brak wizyt”
- Wiersz bez godziny: „Bez godziny · {klient}”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — Dzień, Tydzień, Miesiąc
- `src/widoki/start-dane.js` — czyste modele ekranu z testem

**Scenariusze testowe:**
- [Unit] `modelDnia` na stanie z `e2e/stany/moduly-dzis.js` (zegar 2026-11-02): „Do zamknięcia” ma Biuro (tylko „Zrobione”) i Jana (tylko „Zapłacone”), dzień ma Annę 9:00 i Biuro 15:00
- [Unit] `modelDnia` dla dnia innego niż dziś nie ma sekcji „Do zamknięcia”; wizyta jutrzejsza nie ma przycisków
- [Unit] `modelMiesiaca(2026, 11)` liczy wizyty serii co tydzień w każdym tygodniu i pomija odwołane
- [Unit] `dzienKrotko('2026-11-03')` → „wt 3 lis”; `dopasuj('#/zlecenie/nowe', TRASY)` → `noweZlecenie`; `dopasuj('#/zlecenie/z1/wizyta/2026-11-02', TRASY)` → `wizyta`
- [E2E] `zlecenia-dzien-zamkniecie` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij kafel „Zlecenia”, w „Do zamknięcia” kliknij „Zrobione” przy Biurze Rachunkowym Lis i „Zapłacone” przy Janie Nowaku, wróć „Start”, zrób screenshot → kafel „Zlecenia” był pierwszy z linią „2 do zamknięcia”, widok Dzień otworzył się domyślnie, po dwóch dotknięciach sekcja „Do zamknięcia” znika, Start pokazuje „Dziś 2 zlecenia” bez niezapłaconych, a kafel „2 dziś”
- [E2E] `kalendarz-widoki` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/zlecenia/dzien, kliknij „Tydzień”, potem „Miesiąc”, dotknij dnia za tydzień w siatce, zrób screenshot każdego widoku → Tydzień to lista 7 dni od poniedziałku z wizytą Biura w dzisiejszym dniu tygodnia, Miesiąc ma liczby wizyt w dniach, dotknięcie dnia otwiera widok Dzień tego dnia z wizytą Biura 15:00

**Weryfikacja:**
- `node --test src/zlecenia/kalendarz-dane.test.js src/ui/format.test.js src/ui/router.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-16: Nowe zlecenie: ręcznie i „Zaplanuj” z wyceny**

**Cel:** Formularz zlecenia jednorazowego i cyklicznego, ręcznie albo z przyjętej wyceny z ceną, planem czasu i cyklem z abonamentu.

**Wymagania:** R12, R13, R19, R20, R22, R26

**Zależności:** IU-15

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/zlecenia/formularz.js` | 0 → 180 | — | nowy |
| Test (unit) | `src/zlecenia/formularz.test.js` | 0 → 260 | — | nowy |
| Stwórz | `src/widoki/zlecenie-formularz.js` | 0 → 210 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 70 → 70 | — | zostaje |
| Modyfikuj | `src/widoki/podsumowanie.js` | 168 → 180 | — | zostaje |
| Modyfikuj | `src/kreator/podsumowanie.js` | 122 → 126 | — | zostaje |
| Modyfikuj | `src/kreator/podsumowanie.test.js` | 197 → 205 | — | zostaje |
| Modyfikuj | `src/widoki/lista-wycen.js` | 85 → 92 | — | zostaje |
| Modyfikuj | `src/style/zlecenia.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `src/zlecenia/formularz.js` (czyste): `wartosciPoczatkowe(stan, katalog, { wycenaId, klientId, data }, dzis)`. Z wyceny: klient wyceny, usługa, cena = `kwotaWyceny` z `src/dane/wyceny.js` (cena ręczna wygrywa); szybka wycena w trybie „widełki” albo „od” — puste pole ceny z podpowiedzią widełek (decyzja planu), w trybie „ok” — kwota; data i godzina z terminu wyceny zgodnego z `TERMIN_ISO` (`src/dane/ksztalt.js`), inaczej dziś bez godziny; abonament (`czyAbonament`) → cykl `tydzien` z dniami według `wejscie.wariantId` (`abonament_1`: dzień tygodnia daty startu, `abonament_2`: [1, 4], `abonament_3`: [1, 3, 5], `abonament_5`: [1, 2, 3, 4, 5]), rozliczenie `miesiecznie`, kwota miesięczna = cena za wizytę × `wizytWMiesiacu` zaokrąglona do 1 zł (R26). Ręcznie: klient z `?klient=`, data z `?data=` albo dziś, `za_wizyte`. `bledyFormularza(wartosci)` → `{ pole: kod }` (klient wymagany zawsze, R19; cena ≥ 0 wymagana; data; dni przy cyklu tygodniowym i dwutygodniowym; usługa albo opis); `doZapisu(wartosci)` → dane dla `utworzZlecenie` / `zaplanujZWyceny` (`src/dane/zlecenia.js`). Cykle z `CYKLE` (`src/kalendarz/wystapienia.js`), rozliczenia z `ROZLICZENIA` (`src/dane/zlecenia-ksztalt.js`), dni z `SKROTY_DNI` (`src/ui/format.js`).
- Ekran `#/zlecenie/nowe` (podmienia tymczasowy widok z IU-15): powrót „Zlecenia” (z wyceny: „Wycena”), tytuł „Nowe zlecenie”, podtytuł z wyceny „Z wyceny {numer}”; pola w kolejności: Klient (`wyborKlienta` z IU-14, wymagany), Usługa (wybór z katalogu albo „Inna” z polem opisu, `DLUGOSC_OPISU = 120`), Cena, Data, Godzina, Powtarzaj (chipy), Dni (chipy wielokrotnego wyboru przy cyklu tygodniowym; domyślnie dzień tygodnia daty), Płatność (tylko przy serii), planowany czas z wyceny jako tekst; jedna główna akcja „Zapisz zlecenie”. Id zlecenia nadane przy otwarciu ekranu; po zapisie `history.replaceState` na `#/zlecenia/dzien?data=<start>`. Tempo planu w chwili zapisu: `tempoDoWyceny(ustawienia, daneTempa(stan), uslugaId, domyslne)`.
- „Zaplanuj”: główny przycisk na podsumowaniu przyjętej wyceny, gdy `doZaplanowania` (akcja `zaplanuj` w `akcjeWyceny`); pod podsumowaniem przyjętej wyceny lista „Zlecenia z tej wyceny” z wierszami → `#/zlecenie/<id>` (R22); przycisk „Zaplanuj” w wierszach sekcji „Do zaplanowania” ekranu Wycena. Z jednej wyceny można zaplanować kolejne zlecenie (przycisk drugi „Zaplanuj kolejne”, gdy wycena ma już zlecenie).
- Korekta po implementacji (faza 5, 2026-11-04): `akcjeWyceny` ma trzeci wymagany argument `czyDoZaplanowania` i akcję `zaplanuj_kolejne`: przyjęta wycena ze zleceniem dostaje ją zamiast `zaplanuj`, a abonament z samym zleceniem jednorazowym nadal dostaje `zaplanuj`. `src/zlecenia/formularz.js` ma też `zapiszFormularz(kontekst, id, wartosci)` (wzór: `zapiszSzybka`), więc nie jest w całości czysty.
- Seria co tydzień zakłada się w niecałą minutę: klient, cena, data, „Co tydzień” (dzień tygodnia z daty), „Zapisz zlecenie”.

**Teksty (verbatim):**
- Tytuł „Nowe zlecenie”; podtytuł „Z wyceny {numer}”
- Pola: „Klient”, „Usługa”, „Inna usługa” (pole „Opis”), „Cena (zł)” — przy rozliczeniu miesięcznym „Kwota za miesiąc (zł)”, „Data”, „Godzina”, „Powtarzaj”, „Dni”, „Płatność”
- Chipy powtarzania: „Nie”, „Co tydzień”, „Co 2 tygodnie”, „Co miesiąc”; płatność: „Za wizytę”, „Raz w miesiącu”
- Podpowiedź ceny z szybkiej wyceny: „W wycenie: {od}–{do} zł” albo „W wycenie: od {od} zł”
- Planowany czas: „Planowany czas: {czas}”
- Przycisk: „Zapisz zlecenie”
- Błędy: „Wybierz klienta.”, „Wpisz cenę.”, „Wybierz datę.”, „Wybierz dni tygodnia.”, „Wybierz usługę albo wpisz opis.”
- Wycena: przycisk „Zaplanuj”, „Zaplanuj kolejne”; sekcja „Zlecenia z tej wyceny”

**Wzorce do naśladowania:**
- `src/kreator/szybka.js` i `src/widoki/szybka.js` — logika formularza w czystym module, widok tylko rysuje
- `src/ui/komponenty/formularz.js` — `pole`, `chipy`

**Scenariusze testowe:**
- [Unit] `wartosciPoczatkowe` dla przyjętego abonamentu `abonament_3` z ceną 120 zł za wizytę i `wizytWMiesiacu` 13 → cykl `tydzien` z dniami [1, 3, 5], rozliczenie `miesiecznie`, kwota 1560 zł, plan z migawki
- [Unit] dla szybkiej wyceny z widełkami 250–320 zł cena jest pusta, a podpowiedź „W wycenie: 250–320 zł”; z ceną ręczną — cena ręczna
- [Unit] termin wyceny „2026-11-14T09:00” daje datę 2026-11-14 i godzinę 9:00; termin „sobota rano” — dziś bez godziny
- [Unit] `bledyFormularza` bez klienta → `klient`; cykl tygodniowy bez dni → `dni`; cena „-5” → `cena`
- [Unit] `akcjeWyceny` dla przyjętej wyceny do zaplanowania zawiera `zaplanuj`, dla przyjętej ze zleceniem — nie
- [E2E] `zlecenie-seria-co-tydzien` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/zlecenia/dzien, kliknij „Nowe zlecenie”, wybierz klienta „Jan Nowak”, usługę „Sprzątanie mieszkania (standard)”, cenę 200, datę jutrzejszą, godzinę 10:00, „Co tydzień”, kliknij „Zapisz zlecenie”, przejdź na „Tydzień”, zrób screenshot → po zapisie widok Dzień daty startu z wizytą „10:00 · Jan Nowak”, w widoku tygodnia wizyta w dniu tygodnia daty startu, a za tydzień kolejna; formularz wymagał najwyżej 8 dotknięć poza wpisywaniem
- [E2E] `zaplanuj-z-wyceny` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/wyceny, w sekcji „Do zaplanowania” kliknij „Zaplanuj” przy Annie Kowalskiej, sprawdź wypełnione pola, wybierz datę jutrzejszą i kliknij „Zapisz zlecenie”, wróć do ekranu Wycena i otwórz tę wycenę, zrób screenshot → formularz ma klienta „Anna Kowalska”, cenę z wyceny i planowany czas, wycena znika z „Do zaplanowania”, a jej podsumowanie ma sekcję „Zlecenia z tej wyceny” z nowym zleceniem
- [E2E] `abonament-raz-w-miesiacu` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, w kreatorze dokładnej wyceny zrób wycenę biura 100 m² z abonamentem 3× w tygodniu, zapisz ją, oznacz jako przyjętą, kliknij „Zaplanuj”, wybierz klienta przez „Dodaj nowego klienta: Biuro Testowe”, zrób screenshot formularza i kliknij „Zapisz zlecenie” → formularz ma „Co tydzień” z dniami pn, śr, pt, płatność „Raz w miesiącu” i „Kwota za miesiąc (zł)” równą cenie za wizytę × 13; po zapisie wizyty w widoku tygodnia w pn, śr i pt mają tylko „Zrobione” i „w abonamencie”

**Weryfikacja:**
- `node --test src/zlecenia/formularz.test.js src/kreator/podsumowanie.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel zakłada na telefonie serię co tydzień u stałego klienta i mierzy, że trwa to niecałą minutę

- [x] **IU-17: Wizyta: zamknięcie, zapłata, czas pracy, przesunięcie i odwołanie**

**Cel:** Ekran wizyty z „Zrobione”, zapłatą z formą, opcjonalnym czasem pracy z planem i faktem, przesunięciem i odwołaniem.

**Wymagania:** R13, R15, R16, R12, R22

**Zależności:** IU-16

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/widoki/wizyta.js` | 0 → 220 | — | nowy |
| Stwórz | `src/zlecenia/wizyta-dane.js` | 0 → 110 | — | nowy |
| Test (unit) | `src/zlecenia/wizyta-dane.test.js` | 0 → 190 | — | nowy |
| Modyfikuj | `src/zlecenia/plan-fakt.js` | 100 → 110 | — | zostaje |
| Modyfikuj | `src/zlecenia/plan-fakt.test.js` | 230 → 250 | — | zostaje |
| Modyfikuj | `src/widoki/indeks.js` | 70 → 70 | — | zostaje |
| Modyfikuj | `src/ui/statusy.js` | 12 → 30 | — | zostaje |
| Modyfikuj | `src/style/zlecenia.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Ekran `#/zlecenie/:id/wizyta/:data` (data pierwotna; podmienia tymczasowy widok z IU-15): powrót „Zlecenia” (do widoku Dzień dnia wizyty), tytuł „Wizyta”; wiersze: klient (→ karta klienta), adres z karty klienta (→ mapa, `linkMapy` z IU-13), termin, kwota (seria miesięczna: „w abonamencie”), usługa.
- Akcje (`src/dane/wizyty.js`, każda jednym zapisem): „Zrobione” albo stan „Zrobione” z „Cofnij”; zapłata (tylko rozliczenie za wizytę) — „Zapłacone” z chipami formy (`FORMY_ZAPLATY` z `src/dane/zlecenia-ksztalt.js`, etykiety `ETYKIETY_FORM_ZAPLATY` w `src/ui/statusy.js` — źródło stałej; domyślna forma klienta zaznaczona), po zapisie „Zapłacone · {forma} · {data}” z „Zmień formę” i „Cofnij”; zapłatę można oznaczyć przed dniem wizyty; „Dopisz czas pracy” (licznik co `KROK_CZASU = 15` min od `czasStartowy` z `src/zlecenia/plan-fakt.js`, zapis `wpiszCzasPracy`; limit `MAKS_MINUT_PRACY = 1440`), po zapisie „Plan / Fakt / zostaje na godzinę” z `historiaPlanuIFaktu`, gdy zlecenie ma plan; aplikacja nie przypomina o czasie pracy (R15); „Przesuń” (data i godzina, `przesunWizyte`); „Odwołaj wizytę” z `dialogPotwierdzenia` albo „Przywróć wizytę”; w serii link „Zmień od tej wizyty” → `#/zlecenie/<id>?od=<data pierwotna>` (formularz w IU-18); link „Zlecenie” → `#/zlecenie/<id>` i „Wycena {numer}” → `#/wycena/<id>`, gdy zlecenie ma wycenę (R22).
- `wizyta-dane.js` (czyste): model ekranu z wystąpienia (`wystapienia` z `src/kalendarz/wystapienia.js` w oknie dnia pierwotnego i przesuniętego), widoczność akcji, teksty stanów; `plan-fakt.js` dostaje plan i fakt jednej wizyty.
- `statusy.js`: pigułki wizyty („Zrobione”, „Zapłacone”, „Niezapłacone”, „Odwołana”, „Przesunięta”) i `ETYKIETY_FORM_ZAPLATY = { gotowka: 'Gotówka', przelew: 'Przelew', blik: 'BLIK' }`; przeniesione wizyty z wersji 1 (forma null) — „Zapłacone” bez formy.

**Teksty (verbatim):**
- Tytuł „Wizyta”; wiersze „Klient”, „Adres”, „Termin”, „Kwota”, „Usługa”
- Przyciski: „Zrobione”, „Cofnij”, „Zapłacone”, „Zmień formę”, „Dopisz czas pracy”, „Zapisz czas”, „Przesuń”, „Zapisz nowy termin”, „Odwołaj wizytę”, „Przywróć wizytę”, „Zmień od tej wizyty”, „Zlecenie”, „Wycena {numer}”
- Stan zapłaty: „Zapłacone · {forma} · {data}”; bez formy: „Zapłacone”; kwota w abonamencie: „w abonamencie”
- Formy: „Gotówka”, „Przelew”, „BLIK”; podpis nad chipami formy: „Jak zapłacił klient?”
- Plan i fakt: „Plan {czas}”, „Fakt {czas}”, „Zostaje {kwota}/h”
- Dialog odwołania: „Odwołać wizytę {data}?”, „Odwołaj”, „Anuluj”
- Pigułki: „Zrobione”, „Zapłacone”, „Niezapłacone”, „Odwołana”, „Przesunięta”

**Wzorce do naśladowania:**
- `src/widoki/zakonczenie.js` (stan przed IU-5, w historii Gita) — licznik czasu co 15 min i plan a fakt
- `src/ui/komponenty/formularz.js` — `licznik`, `chipy`

**Scenariusze testowe:**
- [Unit] model wizyty serii miesięcznej nie ma akcji zapłaty, a model wizyty za wizytę ma
- [Unit] model wizyty przesuniętej pokazuje nowy termin i pigułkę „Przesunięta”, a cofnięcie przesunięcia na datę pierwotną ją usuwa
- [Unit] plan i fakt wizyty z planem 270 min i czasem 300 min daje „Plan 4 h 30 min”, „Fakt 5 h” i stawkę z `historiaPlanuIFaktu`; wizyta zlecenia bez planu nie pokazuje planu
- [Unit] przeniesiona wizyta z formą null pokazuje „Zapłacone” bez formy
- [E2E] `wizyta-przesun-i-czas` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/zlecenia/dzien, kliknij wizytę „9:00 · Anna Kowalska”, kliknij „Zrobione”, „Zapłacone” i wybierz formę „Przelew”, kliknij „Dopisz czas pracy”, ustaw 4 h 15 min i „Zapisz czas”; wróć do widoku Dzień, kliknij wizytę „15:00 · Biuro Rachunkowe Lis”, kliknij „Przesuń”, ustaw jutro 11:00 i „Zapisz nowy termin”, zrób screenshot widoku Dzień jutra i ekranu Start → wizyta Anny ma „Zapłacone · Przelew · {dziś}” i zapisany czas, wizyta Biura jest jutro o 11:00 z pigułką „Przesunięta” i nie ma jej dziś, Start pokazuje „Dziś 1 zlecenie · 1 niezapłacone”

**Weryfikacja:**
- `node --test src/zlecenia/wizyta-dane.test.js src/zlecenia/plan-fakt.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel zamyka na telefonie wczorajszą wizytę z zapłatą dwoma dotknięciami w widoku Dzień

- [x] **IU-18: Karta zlecenia, seria i historia klienta**

**Cel:** Karta zlecenia z opisem serii, zmianą od wizyty, zakończeniem serii, zapłatami miesięcznymi i usunięciem oraz zlecenia i niezapłacone na karcie klienta.

**Wymagania:** R13, R16, R18, R22, R26

**Zależności:** IU-17

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/widoki/zlecenie-karta.js` | 0 → 210 | — | nowy |
| Stwórz | `src/zlecenia/karta-dane.js` | 0 → 130 | — | nowy |
| Test (unit) | `src/zlecenia/karta-dane.test.js` | 0 → 200 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 70 → 70 | — | zostaje |
| Modyfikuj | `src/widoki/klient-karta.js` | 140 → 170 | — | zostaje |
| Modyfikuj | `src/widoki/klienci-dane.js` | 130 → 165 | — | zostaje |
| Modyfikuj | `src/widoki/klienci-dane.test.js` | 200 → 240 | — | zostaje |
| Modyfikuj | `src/style/zlecenia.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/klienci.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Ekran `#/zlecenie/:id` (podmienia tymczasowy widok z IU-15): powrót „Zlecenia”, tytuł = nazwa zlecenia (opis albo usługa); wiersze: klient (→ karta), opis rodzaju („Jednorazowe · {termin} · {kwota}”, „Co tydzień: pn, czw · 9:00 · 250 zł za wizytę”, „Co tydzień: pn, śr, pt · 15:00 · 1560 zł miesięcznie”), najbliższa wizyta (→ wizyta), okresy od drugiego („Od {dzień}: …”), wycena (→ `#/wycena/<id>`, R22).
- „Zmień od wizyty”: formularz cena / godzina / dni i powtarzanie dla wizyty z `?od=` (z ekranu wizyty) albo najbliższej (przycisk „Zmień cenę lub godzinę”); zapis `zmienOdWizyty` (`src/dane/zlecenia.js`). W zleceniu jednorazowym ten sam formularz zmienia cenę i godzinę bez cyklu.
- „Zakończ serię”: wybór ostatniego dnia z wizytą (domyślnie ostatnia zrobiona albo dziś), `dialogPotwierdzenia`, `zakonczSerie`; wizyty z zapisanym stanem po tym dniu zostają widoczne (decyzja planu).
- Zapłaty miesięczne (seria z `rozliczenie: 'miesiecznie'`, R26): lista miesięcy od pierwszego z wizytą do bieżącego, najnowszy na górze: „{Miesiąc rok} · {kwota}” z „Zapłacone” i chipami formy (`FORMY_ZAPLATY`, `ETYKIETY_FORM_ZAPLATY` z IU-17) albo „Zapłacone · {forma} · {data}” z „Cofnij”; miesiąc przed bieżącym bez zapłaty ma pigułkę „Niezapłacone”.
- „Usuń zlecenie”: `dialogPotwierdzenia`; gdy zlecenie ma zapłaty, treść mówi, że zapłaty też znikną.
- Karta klienta: sekcja „Zlecenia” (nazwa, najbliższa wizyta albo „Zakończone”), sekcja „Niezapłacone” z `niezaplacone(stan, dzis, klientId)` (`src/zlecenia/zapytania.js`; wiersz „{data albo miesiąc} · {kwota}” → wizyta albo zlecenie), przycisk „Nowe zlecenie” (→ `#/zlecenie/nowe?klient=<id>`, R18); `klienci-dane.js`: `historiaZlecen`, `niezaplaconeKlienta`.
- `karta-dane.js` (czyste): `opisRodzaju(zlecenie, katalog)` (dni przez `SKROTY_DNI` z `src/ui/format.js`), `miesiaceDoZaplaty(zlecenie, dzis)`, `okresyDoPokazania`, `domyslnyKoniec`.
- Korekta po implementacji (faza 5, 2026-11-04): `opisRodzaju(zlecenie)` nie ma argumentu `katalog`, nazwę liczy `nazwaZlecenia(z, nazwaUslugi)` z `src/zlecenia/teksty-wizyty.js` (`nazwaUslugi` daje `nazwyUslug(katalog)`). Kwoty idą przez `kwotaJednostki`, więc seria miesięczna daje „1 560 zł miesięcznie” (twarde spacje), a nie „1560 zł”, a cena 149,5 daje „149,50 zł”, bez zaokrąglenia. `miesiaceDoZaplaty` pomija miesiące bez wizyt, a flaga niezapłaconego miesiąca to reguła `niezaplacone` z `src/zlecenia/zapytania.js` (miesiąc przed bieżącym, co najmniej jedna zrobiona wizyta, bez zapłaty).

**Teksty (verbatim):**
- Rodzaj: „Jednorazowe”, „Co tydzień: {dni} · {godzina}”, „Co 2 tygodnie: {dni} · {godzina}”, „Co miesiąc, {dzień}. dnia · {godzina}”, z kwotą „· {kwota} za wizytę” albo „· {kwota} miesięcznie”
- „Najbliższa wizyta”, „Od {dzień}”, „Zakończona {dzień}”
- Przyciski: „Zmień cenę lub godzinę”, „Zapisz zmianę”, „Zakończ serię”, „Usuń zlecenie”, „Zapłacone”, „Cofnij”
- Formularz zmiany: tytuł „Zmiana od {dzień}”, pola „Cena (zł)” albo „Kwota za miesiąc (zł)”, „Godzina”, „Powtarzaj”, „Dni”
- Dialog zakończenia: „Zakończyć serię po {dzień}?”, „Zakończ”, „Anuluj”
- Dialog usunięcia: „Usunąć zlecenie?”; z zapłatami: „Zapłaty zapisane przy tym zleceniu też znikną.”; przyciski „Usuń”, „Anuluj”
- Zapłaty: sekcja „Zapłaty za miesiące”, wiersz „{Miesiąc rok} · {kwota}”, pigułka „Niezapłacone”
- Karta klienta: sekcje „Zlecenia”, „Niezapłacone”; przycisk „Nowe zlecenie”; bez zleceń: „Brak zleceń.”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — karta klienta
- `src/widoki/podsumowanie.js` — karty z wierszami i dialogi

**Scenariusze testowe:**
- [Unit] `opisRodzaju` dla serii co tydzień pn i czw 9:00 za 250 zł → „Co tydzień: pn, czw · 9:00 · 250 zł za wizytę”; dla serii miesięcznej → „… · 1560 zł miesięcznie”
- [Unit] `miesiaceDoZaplaty` dla serii od 2026-09-14 przy dziś 2026-11-02: listopad, październik, wrzesień; październik bez zapłaty ma flagę niezapłaconego, listopad nie
- [Unit] `niezaplaconeKlienta` zwraca tylko pozycje danego klienta; `historiaZlecen` ma „Zakończone” dla serii z `koniec` w przeszłości
- [E2E] `seria-zmiana-i-zakonczenie` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz kartę zlecenia Biura Rachunkowego Lis z widoku Dzień, kliknij „Zmień cenę lub godzinę”, ustaw 16:00, zapisz, potem „Zakończ serię” z dniem za 2 tygodnie, otwórz widok Miesiąc, zrób screenshot → najbliższa wizyta ma 16:00, wcześniejsze zostały 15:00, po dniu zakończenia w Miesiącu nie ma wizyt Biura, zapłaty miesięczne pokazują opłacone miesiące jako „Zapłacone”
- [E2E] `klient-historia-zlecen` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz kartę klienta „Jan Nowak”, zrób screenshot, kliknij „Nowe zlecenie” → karta ma sekcję „Niezapłacone” z wczorajszą wizytą za 180 zł i sekcję „Zlecenia”; „Nowe zlecenie” otwiera formularz z wybranym Janem Nowakiem

**Weryfikacja:**
- `node --test src/zlecenia/karta-dane.test.js src/widoki/klienci-dane.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

### Faza 6 — Wycena w nowym wyglądzie

**Zależy od:** Faza 5

- [x] **IU-19: Kreator dokładnej wyceny w nowym wyglądzie**

**Cel:** Pięć kroków kreatora w nowym wyglądzie z jedną główną akcją, wyjaśnieniami pod „Więcej” i bez zmian w cenach.

**Wymagania:** R21, R7, R8, R9, R10, R11

**Zależności:** Faza 5

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/widoki/kreator-wspolne.js` | 131 → 134 | — | zostaje |
| Modyfikuj | `src/widoki/kreator-usluga.js` | 166 → 168 | — | zostaje |
| Modyfikuj | `src/widoki/kreator-pomieszczenia.js` | 198 → 200 | — | zostaje |
| Modyfikuj | `src/widoki/kreator-pozycje.js` | 139 → 141 | — | zostaje |
| Modyfikuj | `src/widoki/kreator-dodatki.js` | 139 → 141 | — | zostaje |
| Modyfikuj | `src/style/kreator.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Logika kreatora i silnik bez zmian (R21); zmieniają się wygląd i ilość tekstu: pasek postępu w nowym wyglądzie, jedna główna akcja „Dalej” na krok, opisy pozycji, dodatków i podpowiedzi pod `wiecej` / `podpowiedz` (IU-8), wiersz listy najwyżej w dwóch liniach, liczniki i chipy ≥ 48 px. Kreator wraca do ekranu Wycena (powrót „Wycena” na pierwszym kroku).
- Sekcje kreatora (rama kroku, wybór usługi, pomieszczenia, pozycje i dodatki) przechodzą z `komponenty.css` do `src/style/kreator.css`.
- Korekta po implementacji (faza 6, 2026-11-04): reguły `.postep` zostały w `komponenty.css`, bo pasek jest też w `kreator-startowy.js` i `podsumowanie.js`; wygląd kreatora nadpisuje `.naglowek .postep` w `kreator.css`. Tytuł kroku to nazwa kroku z makiety („Zakres”), a powrót pokazuje poprzedni krok, z pierwszego kroku „Wycena”.

**Teksty (verbatim):**
- Powrót z pierwszego kroku: „Wycena”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — formularze, liczniki i „Więcej”

**Scenariusze testowe:**
- [E2E] `kreator-wyglad-cena` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/wyceny, kliknij „Dokładna wycena”, wybierz „Sprzątanie mieszkania (standard)”, ustaw 50 m² z domyślnym układem, przejdź do podsumowania, zrób screenshot każdego kroku → każdy krok ma jeden główny przycisk, tekst ≥ 17 px i elementy klikalne ≥ 48 px, cena dla klienta 250 zł jak w scenariuszu kalibracji mieszkania 50 m² w mazowieckim

**Weryfikacja:**
- `node --test src/silnik/parytet.test.js` przechodzi bez zmian w teście (ceny jak przed przebudową)
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-20: Szybka wycena i pytania do klienta w nowym wyglądzie**

**Cel:** Szybka wycena przez telefon i pytania do klienta w nowym wyglądzie z mniejszą ilością tekstu.

**Wymagania:** R21, R6, R8, R9, R10

**Zależności:** IU-19

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/widoki/szybka.js` | 283 → 286 | — | zostaje |
| Modyfikuj | `src/widoki/szybka-wynik.js` | 54 → 56 | — | zostaje |
| Modyfikuj | `src/widoki/pytania.js` | 217 → 219 | — | zostaje |
| Modyfikuj | `src/style/szybka.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Działanie szybkiej wyceny i pytań bez zmian (R21: widełki, tryby „ok” i „od”, skutki odpowiedzi, kopiowanie tekstu); nowy wygląd: wynik z dużą kwotą (`--tekst-kwota`), jedna główna akcja, wyjaśnienia (skąd widełki, zastrzeżenie o stanie lokalu) pod „Więcej” albo „?”; powrót „Wycena”.
- Sekcje „Szybka wycena” i „Pytania do klienta” przechodzą z `komponenty.css` do `src/style/szybka.css`; `szybka.js` zostaje poniżej 300 linii.
- Korekta po implementacji (faza 6, 2026-11-04): warunek „`szybka.js` poniżej 300 linii” NIE jest spełniony, plik ma 395 linii (przed fazą 391, tabela wyżej była nieaktualna). Zejście pod próg wymaga nowego pliku `src/widoki/szybka-pola.js` poza polem Pliki (`otworzWyborUslugi`, `polaFormularza`, `licznikiPozycji`, `dodatkiAgd`) i przeniesienia `ustawOczekiwanie` do `szybka-wynik.js`. Blok `.wybor-pola` został w `komponenty.css`, bo opiera się na nim wybór klienta i `klienci.css`. Ekran pytań z zapisaną wyceną ma powrót „Szybka wycena” albo „Usługa” (nazwa celu), a „Wycena” tylko bez zapisanej wyceny.

**Teksty (verbatim):**
- Powrót: „Wycena”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — duża kwota i „Więcej”

**Scenariusze testowe:**
- [E2E] `szybka-pytania-wyglad` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/start, kliknij kafel „Wycena” i „Szybka wycena”, wybierz mieszkanie 50 m² z aneksem, stan typowy, otwórz pytania do klienta i odpowiedz na jedno, zrób screenshot → widełki 250–300 zł duże i pogrubione, wyjaśnienie widełek widoczne dopiero po „Więcej”, tekst ≥ 17 px, elementy klikalne ≥ 48 px

**Weryfikacja:**
- `node --test src/kreator/szybka.test.js src/widoki/szybka-wynik.test.js src/widoki/pytania.test.js` przechodzi bez zmian w testach (widełki jak przed przebudową)
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-21: Podsumowanie wyceny i edycja oferty w nowym wyglądzie**

**Cel:** Podsumowanie wyceny i edycja oferty z dużą ceną, jedną główną akcją i wyjaśnieniami pod „?”.

**Wymagania:** R21, R8, R9, R10, R11

**Zależności:** IU-20

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/widoki/podsumowanie.js` | 180 → 182 | — | zostaje |
| Modyfikuj | `src/widoki/podsumowanie-karty.js` | 145 → 148 | — | zostaje |
| Modyfikuj | `src/widoki/oferta-edycja.js` | 240 → 242 | — | zostaje |
| Modyfikuj | `src/widoki/oferta-edycja-sekcje.js` | 210 → 212 | — | zostaje |
| Modyfikuj | `src/widoki/edytor-listy.js` | 62 → 63 | — | zostaje |
| Modyfikuj | `src/style/podsumowanie.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/komponenty.css` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Podsumowanie: cena dla klienta duża i pogrubiona w zieleni (`--tekst-kwota`, `--marka-zielen`), pasek widełek rynku zostaje, opis mediany rynku i rozbicie kosztów pod „?” albo „Więcej” (przykład z R9); jedna główna akcja zależna od statusu (zapis, wysłanie oferty, „Zaplanuj” z IU-16); powrót „Wycena”.
- Edycja oferty: sekcje zakresu, warunków i klienta w wierszach ze strzałką albo kartach z jedną akcją; teksty pomocnicze pod „Więcej”; działanie linku i PDF bez zmian (R21).
- Sekcje „Podsumowanie wyceny”, „Pasek widełek rynku”, „Plan a fakt” i „Edycja oferty” przechodzą z `komponenty.css` do `src/style/podsumowanie.css`.
- Korekta po implementacji (faza 6, 2026-11-04): `edytor-listy.js` bez zmian, układ jest w `podsumowanie.css`. Rozmiary: `podsumowanie.js` 316, `podsumowanie-karty.js` 235, `oferta-edycja.js` 364, `oferta-edycja-sekcje.js` 339 linii. Krok Cena w kreatorze ma powrót „Chemia”, „Wycena” tylko zapisana wycena. Przy wycenie ze zleceniem „Zaplanuj kolejne” jest wierszem, więc ekran nie ma głównego przycisku. Od makiety różni się: pigułka statusu nad kartą, arkusz „?” bez „Rozumiem”, „?” przy wierszu „Mediana rynku”, brak wierszy „Zakres” i „Chemia”.

**Teksty (verbatim):**
- Powrót: „Wycena”
- Etykieta przycisku „?” przy medianie dla czytnika: „Wyjaśnienie: Mediana rynku”

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — podsumowanie wyceny

**Scenariusze testowe:**
- [E2E] `podsumowanie-wyglad` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz z ekranu Wycena przyjętą wycenę Anny Kowalskiej, dotknij „?” przy medianie, potem otwórz ofertę wyceny do wysłania Jana Nowaka, zrób screenshot → cena duża i zielona, opis mediany w arkuszu po „?”, jeden główny przycisk („Zaplanuj” przy przyjętej), edycja oferty z wyborem klienta i bez długich opisów na wierzchu

**Weryfikacja:**
- `node --test src/widoki/oferta-edycja.test.js src/widoki/oferta-edycja-sekcje.test.js src/kreator/podsumowanie.test.js` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [x] **IU-22: Oferta dla klienta w neutralnym wyglądzie**

**Cel:** Strona oferty dla klienta i wydruk w neutralnym, czytelnym wyglądzie bez zieleni aplikacji.

**Wymagania:** R7, R8, R11, R21

**Zależności:** IU-21

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `src/style/oferta.css` | — → — | — | zostaje |
| Modyfikuj | `src/style/druk.css` | — → — | — | zostaje |
| Modyfikuj | `oferta.html` | — → — | — | zostaje |

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Decyzja właściciela (2026-10-28): oferta neutralna — białe tło, ciemny tekst, kwota duża i pogrubiona w kolorze tekstu, bez `--marka-zielen*` (oferta pokazuje firmę, nie aplikację); tekst ≥ 17 px, kontrast AA; `oferta.css` używa tokenów neutralnych (`--tekst-*`, `--tlo-*`, `--linia-*`) albo własnych zmiennych lokalnych; przyciski strony oferty (druk) ≥ 48 px.
- `druk.css` zostaje czarno-biały (A4), z większym tekstem, jeśli makieta tak pokazuje; `oferta.html` — `theme-color` biały.
- Treść oferty, kodek linku i strona bez localStorage i service workera bez zmian (R21).
- Korekta po implementacji (faza 6, 2026-11-04): `e2e/stany/oferta-po-terminie.txt` nie dekoduje się (`{ ok: false, powod: 'uszkodzony' }`), bo JSON seeda nie ma pól `trybCeny` i `abonament`, których wymaga `jestOferta`. Scenariusz `oferta-neutralna` wymaga seeda wygenerowanego od nowa przez `zakodujOferte`. Kontakt firmy i etykiety sekcji mają 17 px zamiast 15 px z makiety, a przyciski nie mają ikon, bo `oferta-klient.js` nie należał do jednostki.

**Wzorce do naśladowania:**
- `docs/operator/aplikacja-modulowa-makiety.html` — ekran oferty (jeśli jest), inaczej tokeny neutralne makiety

**Scenariusze testowe:**
- [E2E] `oferta-neutralna` — okno 360×800, otwórz http://localhost:5174/oferta.html z fragmentem z `e2e/stany/oferta-po-terminie.txt`, zmierz przez eval kolor tła, kolor kwoty i rozmiar tekstu akapitów, zrób screenshot → tło białe, kwota w kolorze tekstu (bez zieleni), tekst ≥ 17 px, oferta czytelna bez powiększania

**Weryfikacja:**
- `grep -c "marka-zielen" src/style/oferta.css` zwraca 0
- `node --test src/widoki/oferta-klient.test.js src/oferta/kodek.test.js` przechodzi (link `v1.` dekoduje się jak dotąd)
- `npm test` przechodzi

**Operator checklist:**
- [ ] Właściciel otwiera link oferty i PDF na telefonie i ocenia, że wyglądają jak dokument jego firmy

## Wpływ systemowy

- **Graf interakcji:** `src/kalendarz/` (czyste daty) ← `src/dane/` (klienci, zlecenia, wizyty, migracja, kopia) ← `src/zlecenia/` (zapytania, plan a fakt, modele ekranów) ← `src/widoki/` i `src/ui/`. Wycena (`src/dane/wyceny.js`) nie importuje zleceń; zlecenia importują wycenę (`czyAbonament`, `kwotaWyceny`). Silnik wyceny i tempa bez zmian.
- **Propagacja błędów:** nowe klasy `BladKlienta` i `BladZlecenia` z kodami tłumaczonymi w `src/widoki/teksty-bledow.js`; uszkodzony albo niespójny stan → ekran ratunkowy jak dotąd; brak miejsca przy utrwalaniu migracji nie blokuje startu.
- **Cykl życia stanu:** v1 → v2 przy pierwszym starcie nowej wersji (utrwalone raz), stare pliki kopii migrują przy imporcie; wycena przyjęta → zlecenie(-a) → wizyty liczone z okresów → stan wizyt zapisywany tylko przy zmianie; zapłaty przy wizycie albo za miesiąc.
- **Parytet:** wycena daje te same ceny (test parytetu, R21); tempo przed i po migracji równe (test IU-6); link oferty `v1.` bez zmian.
- **Pokrycie integracyjne:** scenariusze E2E na stanie `e2e/stany/moduly-dzis.js` z datami względem dziś; migracja w przeglądarce na stanie v1.
- **Interesariusze:** właściciel (jedyny użytkownik z danymi v1, akceptuje makiety i robi smoke na telefonie); przyszłe moduły Pieniądze (korzystają z zapłat od tego etapu) i Start firmy (dopisują kafel do `MODULY`).

## Ryzyka i zależności

- **Makiety blokują fazy 3–6:** bez akceptacji makiet autopilot zatrzyma się przed fazą 3. Mitigacja: sesja makiet startuje równolegle z fazą 1; teksty z planu są punktem wyjścia makiet.
- **Migracja danych właściciela:** dane v1 są tylko u właściciela, ale błąd migracji = ekran ratunkowy. Mitigacja: migracja czysta i całkowita, fixture z przypadkami brzegowymi, test idempotencji, test tempa przed i po, E2E na stanie v1; przed aktualizacją właściciel robi kopię (smoke).
- **Stan przejściowy faz 2–5:** po IU-5 i IU-6 stary Start traci kartę miesiąca i „Wpisz czas pracy”, a moduł Zlecenia pojawia się dopiero w fazie 5. To stan gałęzi, nie wydania; aplikacja działa i testy przechodzą po każdej fazie.
- **Rozmiar zmian CSS:** `komponenty.css` (2509 linii) dzieli się po kawałku na arkusze modułów; każda jednostka przenosi tylko swoją sekcję, więc review fazy czyta mniejsze różnice.
- **Daty i strefa czasowa:** arytmetyka dni w UTC i testy przez zmianę czasu; E2E liczy daty względem dzisiejszego dnia przeglądarki.
- **Service worker:** nowe moduły muszą być importowane statycznie z `src/widoki/indeks.js`, a nowe arkusze — w `index.html` (IU-8), inaczej nie trafią do pamięci podręcznej offline; `PLIKI_STARTOWE` się nie zmienia (bez nowych plików `data/`).
- **Kolejność merge'ów:** po tym planie etap 6 (publikacja pod `czystyzarobek.pl`) i smoke na telefonie.

## Dokumentacja / Notatki operacyjne

- `PLAN.md`: nowy „Cel” (aplikacja z modułami), ustalenia z tego planu, nowy etap przed publikacją, etapy 7 i 8 jako moduły — aktualizacja razem z commitem inicjalnym planu; po zakończeniu etapu ✅ i hash.
- `docs/CONCEPTS.md`: hasła „Status wyceny” (bez `wykonana`), „Zlecenie”, „Wizyta”, „Okres serii”, „Do zamknięcia”, „Niezapłacone” — przez `/dev-compound` po zakończeniu.
- Po wdrożeniu: wniosek o migracji v1 → v2 do `docs/solutions/` (`/dev-compound`).

## Źródła i referencje

- **Dokument źródłowy:** docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md
- Wymagania wyceny: docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md
- Plan etapu 5: docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md
- Raporty review etapu 5: docs/completed/etap-5-aplikacja-wyceny/
- Wiedza projektu: docs/learned-patterns.md, docs/solutions/runtime-errors/2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md
- Checklista operatora: docs/operator/aplikacja-modulowa-przygotowanie.md
