# Zadania: aplikacja-modulowa

Branch: `feature/aplikacja-modulowa`
Ostatnia aktualizacja: 2026-10-28
Plan techniczny: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`

Checkboxy odsyłają do jednostek planu technicznego (IU-K): cel, podejście, decyzje i teksty są tylko tam.

## Faza 1 — Kalendarz i nowe dane

Zależy od: Brak

### IU-1: Daty i wystąpienia wizyt (feature-builder-data)

- [ ] Stwórz: `src/kalendarz/daty.js`
- [ ] Stwórz: `src/kalendarz/wystapienia.js`
- [ ] Test (unit): `src/kalendarz/daty.test.js`
- [ ] Test (unit): `src/kalendarz/wystapienia.test.js`
- [ ] Test: [Unit] co tydzień w pn i czw od czwartku 2026-10-29, okno 2026-10-26–2026-11-08 → 2026-10-29, 2026-11-02, 2026-11-05
- [ ] Test: [Unit] co 2 tygodnie w pn od czwartku 2026-10-29 → pierwsza wizyta 2026-11-09, druga 2026-11-23
- [ ] Test: [Unit] co miesiąc od 2026-01-31 → 2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30
- [ ] Test: [Unit] co tydzień w nd przez 2026-10-25 i 2027-03-28 (zmiana czasu) → kolejne niedziele bez przesunięcia o dzień
- [ ] Test: [Unit] wizyta przesunięta z 2026-11-02 na 2026-11-10: w oknie 2026-11-08–2026-11-14 jest 2026-11-10 z godziną okresu daty pierwotnej, w oknie 2026-11-01–2026-11-07 nie ma jej 2026-11-02
- [ ] Test: [Unit] zapisana wizyta z dnia, którego nowy okres z innym cyklem już nie daje, nadal jest w wyniku
- [ ] Test: [Unit] nowy okres od 2026-11-16 z godziną 10:00 i dniem śr: wizyty przed 2026-11-16 mają stary okres, od 2026-11-16 nowy
- [ ] Test: [Unit] `koniec` 2026-11-05: brak wizyt z reguły po tym dniu, ale zrobiona wizyta z 2026-11-09 zostaje
- [ ] Test: [Unit] `najblizszaWizyta` serii z samymi odwołanymi wizytami zwraca null
- [ ] Test: [Unit] `siatkaMiesiaca(2026, 11)`: pierwszy tydzień ma 6 pustych dni i niedzielę 1 listopada, ostatni dzień to 30 listopada
- [ ] Test: [Unit] `dzienWMiesiacu(2027, 2, 31)` → 2027-02-28; `dzienTygodnia('2026-11-01')` → 7
- [ ] Weryfikacja: `node --test src/kalendarz/` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-2: Schemat v2: klienci i kształt zleceń (feature-builder-data)

- [ ] Stwórz: `src/dane/klienci.js`
- [ ] Stwórz: `src/dane/zlecenia-ksztalt.js`
- [ ] Stwórz: `src/dane/migracja-v2.js`
- [ ] Modyfikuj: `src/dane/magazyn.js`
- [ ] Test (unit): `src/dane/klienci.test.js`
- [ ] Test (unit): `src/dane/zlecenia-ksztalt.test.js`
- [ ] Modyfikuj: `src/dane/magazyn.test.js`
- [ ] Test: [Unit] stan v1 z `tests/fixtures/kopia-v1.json` po `zaktualizujStan` ma `wersja: 2`, puste `klienci` i `zlecenia`, a dwa wywołania dają równe wyniki (`deepEqual`)
- [ ] Test: [Unit] `jestZlecenie` odrzuca kolejno: okresy w złej kolejności, pierwszy `od` różny od `start`, cykl tygodniowy bez dni, dzień tygodnia 8, `miesiecznie` w zleceniu jednorazowym, ujemną cenę, formę `'karta'`, `minutyPracy: 1441`, klucz wizyty `'jutro'`, `koniec` przed `start`
- [ ] Test: [Unit] `jestStanem` odrzuca zlecenie z `klientId` nieistniejącego klienta i dwa zlecenia o tym samym id
- [ ] Test: [Unit] `dodajKlienta` dwa razy z tym samym id zapisuje jednego klienta; nazwa 121 znaków i telefon „123” dają `BladKlienta` z polem; 5001. klient → `za_duzo`
- [ ] Test: [Unit] `usunKlienta` klienta ze zleceniem rzuca `ma_historie`, klienta bez historii usuwa
- [ ] Test: [Unit] `szukajKlientow(stan, 'kow')` znajduje „Anna Kowalska” i „KOWALSKI Jan”; `listaKlientow` stawia „Lucyna” przed „Łukasz”
- [ ] Test: [Unit] `normalizujNazwe('  Anna   KOWALSKA ')` równa się `normalizujNazwe('anna kowalska')`; „Żaneta” w NFD i NFC daje ten sam wynik
- [ ] Test: [Unit] `WERSJA_SCHEMATU` = 2, pusty stan magazynu ma `klienci: []` i `zlecenia: []`
- [ ] Weryfikacja: `node --test src/dane/klienci.test.js src/dane/zlecenia-ksztalt.test.js src/dane/magazyn.test.js` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi (stare testy wycen i kopii zostają zielone)
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-3: Zapis zleceń, wizyt i zapłat (feature-builder-data)

- [ ] Stwórz: `src/dane/zlecenia.js`
- [ ] Stwórz: `src/dane/wizyty.js`
- [ ] Test (unit): `src/dane/zlecenia.test.js`
- [ ] Test (unit): `src/dane/wizyty.test.js`
- [ ] Test: [Unit] `zaplanujZWyceny` dla wyceny `do_wyslania` → `zly_status`; dla przyjętej wyceny biura z abonamentem daje zlecenie z `plan.minutyNormowe` z migawki i podanym tempem
- [ ] Test: [Unit] `utworzZlecenie` dwa razy z tym samym id daje jedno zlecenie; zlecenie bez klienta → `brak_klienta`
- [ ] Test: [Unit] `zmienOdWizyty(…, '2026-11-16', { cenaWizyty: 280 })` w serii od 2026-11-02: wizyta 2026-11-09 ma starą cenę, 2026-11-16 — 280; drugi zapis z tym samym dniem zastępuje okres zamiast dokładać
- [ ] Test: [Unit] `przesunWizyte` na dzień pierwotny z godziną okresu usuwa przesunięcie, a wpis bez innego stanu znika z `wizyty`
- [ ] Test: [Unit] `oznaczZaplacona` bez formy u klienta, którego ostatnia zapłata była BLIK-iem → forma `'blik'`, kwota = cena okresu z dnia pierwotnego, data = dzień z `teraz`
- [ ] Test: [Unit] zapłata wizyty w serii miesięcznej rzuca `rozliczenie_miesieczne`; `oznaczZaplateMiesiaca(…, '2026-11')` zapisuje kwotę `cenaMiesiaca`
- [ ] Test: [Unit] czas pracy 0 i 1441 → błąd; null usuwa czas
- [ ] Test: [Unit] `doZaplanowania`: przyjęta jednorazowa ze zleceniem → false; przyjęty abonament z samymi zleceniami jednorazowymi → true
- [ ] Test: [Unit] `czyWycenaZamknieta` true dla wyceny ze zleceniem, false bez
- [ ] Test: [Unit] `zakonczSerie` z dniem przed `start` → błąd
- [ ] Weryfikacja: `node --test src/dane/zlecenia.test.js src/dane/wizyty.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-4: Zapytania dnia: wizyty, do zamknięcia i niezapłacone (feature-builder-data)

- [ ] Stwórz: `src/zlecenia/zapytania.js`
- [ ] Test (unit): `src/zlecenia/zapytania.test.js`
- [ ] Stwórz: `e2e/stany/moduly-dzis.js`
- [ ] Test: [Unit] na stanie z Z1–Z3: `liczbaDzis` = 2, `doZamkniecia` = 2 (najpierw Biuro sprzed 7 dni, potem Jan z wczoraj), `niezaplacone` = 1 (Jan, 180 zł)
- [ ] Test: [Unit] seria co tydzień założona dziś ze startem 4 tygodnie wstecz nie daje pozycji w `doZamkniecia`
- [ ] Test: [Unit] wizyta zrobiona i zapłacona wypada z `doZamkniecia`; zrobiona bez zapłaty z ceną 0 zł nie jest niezapłacona
- [ ] Test: [Unit] seria miesięczna: poprzedni miesiąc ze zrobioną wizytą bez zapłaty → jedna pozycja `miesiac`; bieżący miesiąc nie jest niezapłacony
- [ ] Test: [Unit] wizyta przesunięta z dziś na jutro nie liczy się w `liczbaDzis` dziś, a liczy jutro
- [ ] Test: [Unit] skrypt `e2e/stany/moduly-dzis.js` uruchomiony w `node:vm` z atrapą `localStorage` i zegarem ustawionym na 2026-11-02 (pn), 2026-11-08 (nd) i 2026-12-01 daje stan, który przechodzi `jestStanem`, z liczbami jak wyżej
- [ ] Weryfikacja: `node --test src/zlecenia/zapytania.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Faza 2 — Przeniesienie wykonań i kopia v2

Zależy od: Faza 1

### IU-5: Tempo i „plan a fakt” z wizyt, bez ekranu zakończenia (feature-builder-fullstack)

- [ ] Stwórz: `src/zlecenia/plan-fakt.js`
- [ ] Test (unit): `src/zlecenia/plan-fakt.test.js`
- [ ] Usuń: `src/kreator/zakonczenie.js`
- [ ] Usuń: `src/kreator/zakonczenie.test.js`
- [ ] Usuń: `src/widoki/zakonczenie.js`
- [ ] Usuń: `src/widoki/zakonczenie.test.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/ui/trasy.js`
- [ ] Modyfikuj: `src/ui/router.test.js`
- [ ] Modyfikuj: `src/kreator/podsumowanie.js`
- [ ] Modyfikuj: `src/kreator/szybka.js`
- [ ] Modyfikuj: `src/widoki/kreator-pomieszczenia.js`
- [ ] Modyfikuj: `src/widoki/start.js`
- [ ] Modyfikuj: `src/widoki/ustawienia-tempo.js`
- [ ] Modyfikuj: `src/widoki/podsumowanie.js`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [Unit] `daneTempa` dla dwóch zleceń z planem (wizyty z czasem 270 i 300 min) i zlecenia ręcznego bez planu daje dwa elementy; `tempoWlasne` z trzech wizyt usługi `mieszkanie_standard` daje medianę stosunków czasu do minut normowych
- [ ] Test: [Unit] dwie wizyty z czasem w tym samym dniu są w kolejności `zrobiona`
- [ ] Test: [Unit] `historiaPlanuIFaktu` z wizyt pokazuje plan z `plan.tempo`, fakt i realną stawkę (przypadki przeniesione z `src/kreator/zakonczenie.test.js`)
- [ ] Test: [Unit] `dopasuj('#/wycena/abc/koniec', TRASY)` zwraca null
- [ ] Weryfikacja: `node --test src/zlecenia/plan-fakt.test.js src/ui/router.test.js` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [ ] Weryfikacja: `grep -rn "kreator/zakonczenie\|widokZakonczeniaZlecenia\|'zakonczenie'" src/` nie zwraca wyników

### IU-6: Wycena v2 i przeniesienie danych z wersji 1 (feature-builder-fullstack)

- [ ] Modyfikuj: `src/dane/migracja-v2.js`
- [ ] Test (unit): `src/dane/migracja-v2.test.js`
- [ ] Stwórz: `tests/fixtures/stan-v1-pelny.json`
- [ ] Modyfikuj: `src/dane/wyceny.js`
- [ ] Modyfikuj: `src/dane/wyceny.test.js`
- [ ] Stwórz: `src/dane/wyceny-statusy.test.js`
- [ ] Modyfikuj: `src/dane/magazyn.js`
- [ ] Modyfikuj: `src/dane/magazyn.test.js`
- [ ] Modyfikuj: `src/dane/ksztalt.js`
- [ ] Modyfikuj: `src/dane/kopia.js`
- [ ] Modyfikuj: `src/app.js`
- [ ] Modyfikuj: `src/ui/format.js`
- [ ] Modyfikuj: `src/ui/statusy.js`
- [ ] Modyfikuj: `src/kreator/podsumowanie.js`
- [ ] Modyfikuj: `src/kreator/podsumowanie.test.js`
- [ ] Modyfikuj: `src/kreator/stan.js`
- [ ] Modyfikuj: `src/kreator/stan.test.js`
- [ ] Modyfikuj: `src/widoki/kreator-wspolne.js`
- [ ] Modyfikuj: `src/widoki/podsumowanie.js`
- [ ] Modyfikuj: `src/widoki/pytania.js`
- [ ] Modyfikuj: `src/widoki/szybka.js`
- [ ] Modyfikuj: `src/widoki/start-dane.js`
- [ ] Modyfikuj: `src/widoki/start-dane.test.js`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [Unit] fixture `tests/fixtures/stan-v1-pelny.json` (wykonana z jednym wykonaniem, abonament przyjęty z trzema wykonaniami, przyjęta z terminem „2026-11-14T09:00”, przyjęta z terminem „sobota rano”, szkic z nazwą „test”, wyceny „Anna Kowalska” i „anna  kowalska” z różnymi adresami, szybka bez klienta) po migracji: jeden klient Anna z adresem z nowszej wyceny, bez klienta „test”, cztery zlecenia z wykonań, jedno zlecenie na 2026-11-14 9:00, przyjęta z „sobota rano” i abonament w `doZaplanowania`
- [ ] Test: [Unit] migracja dwa razy daje równe stany, a wynik przechodzi `jestStanem`
- [ ] Test: [Unit] tempo przed migracją (wartość zapisana z charakteryzacji) = `tempoWlasne(daneTempa(stanPoMigracji))`
- [ ] Test: [Unit] wizyty z migracji są zrobione, zapłacone z formą null i kwotą wyceny (cena ręczna wygrywa)
- [ ] Test: [Unit] przejście `przyjeta → odrzucona` dozwolone; status `wykonana` w stanie v2 odrzuca `jestWycena`
- [ ] Test: [Unit] `przypiszKlienta` kopiuje nazwę i adres; po wysłaniu oferty ustawia „nieaktualna”
- [ ] Test: [Unit] `usunWycene` zeruje `wycenaId` w zleceniu, zlecenie zostaje
- [ ] Test: [Unit] zapis wejścia wyceny ze zleceniem rzuca `tylko_odczyt`
- [ ] Test: [Unit] stan z localStorage w wersji 1 zostaje zapisany jako wersja 2 przy starcie, a `kopia.zmianaOd` się nie zmienia
- [ ] Test: [E2E] `migracja-v1` — okno 360×800, wstrzyknij przez `agent-browser eval` treść `e2e/stany/wyceny-do-zrobienia.json` (stan v1) do `localStorage['wyceny-sprzatanie:stan']`, otwórz http://localhost:5174/#/start, potem #/wyceny, odczytaj `JSON.parse(localStorage['wyceny-sprzatanie:stan'])`, zrób screenshot → brak ekranu ratunkowego, lista ma trzy wyceny z pigułkami jak przed zmianą, zapisany stan ma `wersja: 2` i klientów z nazw wycen, konsola bez błędów
- [ ] Weryfikacja: `node --test src/dane/migracja-v2.test.js src/dane/wyceny.test.js src/dane/wyceny-statusy.test.js src/dane/magazyn.test.js` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi (w tym `src/dane/kopia.test.js` z `tests/fixtures/kopia-v1.json`)
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [ ] Weryfikacja: `grep -rn "wykonana\|wykonania\|dodajWykonanie" src/ --include=*.js` zwraca tylko `src/dane/migracja-v2.js` i jego test

### IU-7: Kopia zapasowa v2 i ekran ratunkowy (feature-builder-fullstack)

- [ ] Modyfikuj: `src/dane/kopia.js`
- [ ] Modyfikuj: `src/dane/kopia.test.js`
- [ ] Stwórz: `src/dane/kopia-v2.test.js`
- [ ] Modyfikuj: `src/widoki/kopia-teksty.js`
- [ ] Modyfikuj: `src/widoki/kopia-teksty.test.js`
- [ ] Modyfikuj: `src/widoki/kopia.js`
- [ ] Modyfikuj: `src/widoki/ratunek.js`
- [ ] Test: [Unit] round-trip: stan v2 z klientem i serią (dwa okresy, wizyty ze stanem, zapłata miesięczna) → `utworzKopie` → `odczytajKopie` → równy stan
- [ ] Test: [Unit] odmowa: zlecenie wskazujące nieistniejącego klienta → `uszkodzony`; 5001 klientów → `za_duzo_klientow`; zlecenie z formą `'karta'` → `uszkodzony`; eksport stanu ponad limitem odmawia tak samo jak import
- [ ] Test: [Unit] plik `tests/fixtures/kopia-v1.json` wczytuje się jako stan v2 z klientami z nazw wycen
- [ ] Test: [Unit] „połącz”: klient zmieniony później w pliku wygrywa; zlecenie tylko lokalne zostaje; zlecenie z pliku wchodzi razem ze swoim klientem z pliku
- [ ] Test: [Unit] `czyPytacOTryb` = true dla stanu z samym klientem; `czyPrzypomniecOKopii` = true po 7 dniach od pierwszego zlecenia bez kopii
- [ ] Test: [Unit] etykiety podsumowania: „1 klient”, „2 klientów”, „5 zleceń”
- [ ] Weryfikacja: `node --test src/dane/kopia.test.js src/dane/kopia-v2.test.js src/widoki/kopia-teksty.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Operator checklist faza 2

- [ ] [Manual] na ekranie ratunkowym „Wczytaj kopię z pliku” pokazuje dialog „Zastąpić dane w tej przeglądarce?”, a „Anuluj” zostawia dane (IU-7)

## Faza 3 — Nowy wygląd, szkielet i Start

Zależy od: Faza 2

### IU-8: Tokeny, komponenty i nagłówek modułu bez dolnego paska (feature-builder-ui)

- [ ] Modyfikuj: `src/style/tokeny.css`
- [ ] Modyfikuj: `src/style/baza.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Stwórz: `src/style/start.css`
- [ ] Stwórz: `src/style/wyceny.css`
- [ ] Stwórz: `src/style/chemia.css`
- [ ] Stwórz: `src/style/ustawienia.css`
- [ ] Stwórz: `src/style/klienci.css`
- [ ] Stwórz: `src/style/zlecenia.css`
- [ ] Stwórz: `src/style/kreator.css`
- [ ] Stwórz: `src/style/szybka.css`
- [ ] Stwórz: `src/style/podsumowanie.css`
- [ ] Modyfikuj: `index.html`
- [ ] Modyfikuj: `manifest.webmanifest`
- [ ] Modyfikuj: `src/ui/komponenty/uklad.js`
- [ ] Test (unit): `src/ui/komponenty/uklad.test.js`
- [ ] Modyfikuj: `src/ui/ikony.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/widoki/lista-wycen.js`
- [ ] Modyfikuj: `src/widoki/katalog-chemii.js`
- [ ] Modyfikuj: `src/widoki/ustawienia.js`
- [ ] Modyfikuj: `src/widoki/start.js`
- [ ] Test: [Unit] `naglowek` z `wsteczTekst: 'Start'` daje link z tekstem „Start” i ikoną; bez `wsteczTekst` — link z `aria-label="Wstecz"`
- [ ] Test: [Unit] `przelaczniki` ustawia `aria-current="page"` tylko na aktywnej pozycji
- [ ] Test: [Unit] `wiecej` daje `details` z `summary` „Więcej” i treścią w środku; `podpowiedz` ma `aria-label` „Wyjaśnienie: Mediana rynku”
- [ ] Test: [E2E] `wyglad-podstawy` — okno 360×800, wstrzyknij przez `agent-browser eval` treść `e2e/stany/ustawienia-mazowieckie.json` do `localStorage['wyceny-sprzatanie:stan']`, otwórz http://localhost:5174/#/ustawienia, #/chemia i #/wyceny, na każdym przez eval zmierz `getComputedStyle` tekstu akapitów i wysokość widocznych `a, button, input, select, summary` w `main`, policz kontrast koloru tekstu przycisku głównego do jego tła, zrób screenshot → tekst podstawowy ≥ 17 px, każdy element klikalny ≥ 48 px wysokości, kontrast przycisku głównego ≥ 4,5:1, brak elementu dolnego paska, tło strony białe, konsola bez błędów
- [ ] Weryfikacja: `node --test src/ui/komponenty/uklad.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [ ] Weryfikacja: `grep -rn "dolnyPasek\|dolny-pasek" src/ index.html` nie zwraca wyników
- [ ] Weryfikacja: `grep -c "src/style/zlecenia.css" index.html` zwraca 1

### IU-9: Ekran Start z kaflami modułów (feature-builder-ui)

- [ ] Stwórz: `src/ui/moduly.js`
- [ ] Modyfikuj: `src/widoki/start.js`
- [ ] Modyfikuj: `src/widoki/start-dane.js`
- [ ] Modyfikuj: `src/widoki/start-dane.test.js`
- [ ] Modyfikuj: `src/ui/format.js`
- [ ] Modyfikuj: `src/ui/format.test.js`
- [ ] Modyfikuj: `src/app.js`
- [ ] Modyfikuj: `src/style/start.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [Unit] `zdanieDnia` na stanie z `e2e/stany/moduly-dzis.js` (zegar 2026-11-02) → „Dziś 2 zlecenia · 1 niezapłacone”; bez zleceń → „Dziś nie masz zleceń”; bez wizyt dziś, z jedną niezapłaconą → „Dziś nie masz zleceń · 1 niezapłacone”; 5 niezapłaconych → „· 5 niezapłaconych”
- [ ] Test: [Unit] `stanKafla('zlecenia', …)` daje „2 do zamknięcia”, po zamknięciu obu — „2 dziś”, bez dzisiejszych — „Najbliższe: jutro 9:00”, bez zleceń — „Dodaj pierwsze zlecenie”
- [ ] Test: [Unit] `stanKafla('wycena', …)` daje „1 do wysłania”, bez niej „1 do zaplanowania”, bez wycen „Zrób pierwszą wycenę”
- [ ] Test: [Unit] `banerStartu` przy braku kopii i ustawieniach domyślnych zwraca tylko baner kopii
- [ ] Test: [Unit] `kiedy('2026-11-03', '09:00', '2026-11-02')` → „jutro 9:00”; `kiedy('2026-11-06', '09:00', '2026-11-02')` → „pt 6 lis, 9:00”
- [ ] Test: [E2E] `start-moduly` — okno 360×800, uruchom w stronie przez `agent-browser eval` skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, zrób screenshot, kliknij kafel „Wycena”, potem „Szybka wycena” → nagłówek „Dzień dobry, Usługi Sprzątające Monika Lis”, zdanie „Dziś 2 zlecenia · 1 niezapłacone”, kafel „Wycena” z linią „1 do wysłania” i kafel „Chemia”, kafle w dwóch kolumnach, jeden baner („Nie masz jeszcze kopii danych…”), odnośnik „Ustawienia firmy”, brak dolnego paska, po dwóch dotknięciach adres #/szybka
- [ ] Weryfikacja: `node --test src/widoki/start-dane.test.js src/ui/format.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-10: Moduł Wycena: ekran główny (feature-builder-ui)

- [ ] Modyfikuj: `src/widoki/lista-wycen.js`
- [ ] Stwórz: `src/widoki/lista-wycen-dane.js`
- [ ] Test (unit): `src/widoki/lista-wycen-dane.test.js`
- [ ] Modyfikuj: `src/style/wyceny.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [Unit] `sekcjeWycen` na stanie z `e2e/stany/moduly-dzis.js`: kolejność „Do wysłania” (Jan Nowak), „Do zaplanowania” (Anna Kowalska), „Czekają na odpowiedź” (Anna Kowalska), „Pozostałe” (Biuro Rachunkowe Lis)
- [ ] Test: [Unit] przyjęty abonament z samymi zleceniami jednorazowymi jest w „Do zaplanowania”; wycena bez klienta ma tytuł z nazwą usługi
- [ ] Test: [E2E] `wycena-modul` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij kafel „Wycena”, zrób screenshot → nagłówek „Wycena” z powrotem „Start”, przyciski „Szybka wycena” i „Dokładna wycena” na górze, sekcje w kolejności „Do wysłania”, „Do zaplanowania”, „Czekają na odpowiedź”, „Pozostałe”, każdy wiersz w najwyżej dwóch liniach
- [ ] Weryfikacja: `node --test src/widoki/lista-wycen-dane.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-11: Moduł Chemia w nowym wyglądzie (feature-builder-ui)

- [ ] Modyfikuj: `src/widoki/katalog-chemii.js`
- [ ] Modyfikuj: `src/widoki/karta-produktu.js`
- [ ] Modyfikuj: `src/widoki/dobor-chemii.js`
- [ ] Modyfikuj: `src/style/chemia.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [E2E] `chemia-modul` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/start, kliknij kafel „Chemia”, wybierz pierwszą kategorię, rozwiń „Więcej” przy pierwszym produkcie, zrób screenshot → nagłówek „Chemia” z powrotem „Start”, w kategorii powrót „Chemia”, wiersze w najwyżej dwóch liniach, tekst ≥ 17 px, opis widoczny dopiero po „Więcej”
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-12: Ustawienia, kreator startowy i kopia w nowym wyglądzie (feature-builder-ui)

- [ ] Modyfikuj: `src/widoki/ustawienia.js`
- [ ] Modyfikuj: `src/widoki/ustawienia-sekcje.js`
- [ ] Modyfikuj: `src/widoki/ustawienia-tempo.js`
- [ ] Modyfikuj: `src/widoki/ustawienia-oferta.js`
- [ ] Modyfikuj: `src/widoki/kreator-startowy.js`
- [ ] Modyfikuj: `src/widoki/kopia.js`
- [ ] Modyfikuj: `src/widoki/ratunek.js`
- [ ] Modyfikuj: `src/style/ustawienia.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [E2E] `ustawienia-kopia-wyglad` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij „Ustawienia firmy”, potem wiersz „Kopia danych”, zrób screenshot → tytuł „Ustawienia firmy” z powrotem „Start”, na kopii powrót „Ustawienia firmy”, chipy podsumowania „4 wyceny”, „3 klientów”, „3 zlecenia” i zdanie „Plik kopii zawiera dane klientów, także notatki. Trzymaj go w bezpiecznym miejscu.”
- [ ] Test: [E2E] `kreator-startowy-wyglad` — okno 360×800, wyczyść localStorage, otwórz http://localhost:5174/, przejdź kreator z województwem mazowieckim i kliknij „Gotowe”, zrób screenshot → kreator w nowym wyglądzie, po „Gotowe” ekran Start z powitaniem „Dzień dobry”
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Operator checklist faza 3

- [ ] Operator: Właściciel porównuje na telefonie nagłówek, przyciski, wiersze i kolory z zaakceptowaną makietą (IU-8)
- [ ] Operator: Właściciel otwiera Start na telefonie i bez instrukcji ocenia, że aplikacja ma moduły, a szybka wycena jest w dwóch dotknięciach (IU-9)

## Faza 4 — Klienci

Zależy od: Faza 3

### IU-13: Lista, karta i formularz klienta (feature-builder-ui)

- [ ] Modyfikuj: `src/ui/trasy.js`
- [ ] Modyfikuj: `src/ui/router.test.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/ui/moduly.js`
- [ ] Stwórz: `src/widoki/klienci-lista.js`
- [ ] Stwórz: `src/widoki/klient-karta.js`
- [ ] Stwórz: `src/widoki/klient-formularz.js`
- [ ] Stwórz: `src/widoki/klienci-dane.js`
- [ ] Test (unit): `src/widoki/klienci-dane.test.js`
- [ ] Modyfikuj: `src/style/klienci.css`
- [ ] Test: [Unit] `linkTelefonu('600 100 200')` → `tel:600100200`; `linkTelefonu('+48 600-100-200')` → `tel:+48600100200`; `linkMapy('ul. Lipowa 3, Warszawa')` koduje spacje i przecinek
- [ ] Test: [Unit] `podobnyKlient(stan, '  anna KOWALSKA')` znajduje „Anna Kowalska”, a z `pomijanyId` tej klientki — nie
- [ ] Test: [Unit] `historiaWycen` zwraca wyceny klienta od najnowszej z kwotą
- [ ] Test: [Unit] `dopasuj('#/klienci/nowy', TRASY)` → `nowyKlient`; `dopasuj('#/klienci/k-1/edycja', TRASY)` → `edycjaKlienta` z `id: 'k-1'`
- [ ] Test: [E2E] `klienci-dodaj-karta` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij kafel „Klienci”, „Dodaj klienta”, wpisz „Ewa Zielińska”, telefon „601 202 303”, adres „ul. Polna 5, Kraków”, kliknij „Zapisz”, wróć do listy, wpisz w wyszukiwanie „ziel”, zrób screenshot → Start ma kafel „Klienci” z „3 klientów”, po zapisie karta „Ewa Zielińska” z linkiem `tel:601202303` i linkiem mapy z adresem, lista po wyszukaniu ma jedną pozycję, przycisk wstecz przeglądarki z karty nie otwiera ponownie pustego formularza
- [ ] Weryfikacja: `node --test src/widoki/klienci-dane.test.js src/ui/router.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-14: Wybór klienta w wycenie (feature-builder-fullstack)

- [ ] Stwórz: `src/ui/komponenty/wybor-klienta.js`
- [ ] Modyfikuj: `src/widoki/klienci-dane.js`
- [ ] Modyfikuj: `src/widoki/klienci-dane.test.js`
- [ ] Modyfikuj: `src/widoki/podsumowanie.js`
- [ ] Modyfikuj: `src/widoki/oferta-edycja-sekcje.js`
- [ ] Modyfikuj: `src/widoki/oferta-edycja.js`
- [ ] Modyfikuj: `src/kreator/stan.js`
- [ ] Modyfikuj: `src/kreator/stan.test.js`
- [ ] Modyfikuj: `src/widoki/kreator-usluga.js`
- [ ] Modyfikuj: `src/kreator/szybka.js`
- [ ] Modyfikuj: `src/widoki/szybka.js`
- [ ] Modyfikuj: `src/style/klienci.css`
- [ ] Test: [Unit] `propozycjeKlientow(stan, 'an')` zwraca najwyżej 8 klientów, najpierw tych, których nazwa zaczyna się od frazy
- [ ] Test: [Unit] szkic utworzony z parametrem `klient` ma `klientId` i nazwę klienta w `wycena.klient`; nieistniejący klient daje szkic bez klienta
- [ ] Test: [E2E] `wycena-klient-z-listy` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/klienci, otwórz kartę „Anna Kowalska”, kliknij „Nowa wycena”, przejdź kreator mieszkania 50 m² do podsumowania i kliknij „Zapisz”; potem otwórz ekran Wycena, „Szybka wycena”, kliknij „Wybierz klienta”, wpisz „Piotr Wiśniewski”, kliknij „Dodaj nowego klienta: Piotr Wiśniewski” i zamknij arkusz bez zapisu, otwórz listę klientów, zrób screenshot → zapisana wycena ma klienta „Anna Kowalska” bez wpisywania nazwy, na karcie Anny w „Wyceny” jest nowa wycena, a na liście klientów nie ma „Piotr Wiśniewski” (porzucony arkusz nie dodał klienta)
- [ ] Weryfikacja: `node --test src/widoki/klienci-dane.test.js src/kreator/stan.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Operator checklist faza 4

- [ ] Operator: Na telefonie dotknięcie numeru na karcie klienta otwiera dzwonienie, a adresu — mapę (IU-13)

## Faza 5 — Zlecenia i kalendarz

Zależy od: Faza 4

### IU-15: Kalendarz: Dzień, Tydzień i Miesiąc (feature-builder-ui)

- [ ] Modyfikuj: `src/ui/trasy.js`
- [ ] Modyfikuj: `src/ui/router.test.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/ui/moduly.js`
- [ ] Stwórz: `src/zlecenia/kalendarz-dane.js`
- [ ] Test (unit): `src/zlecenia/kalendarz-dane.test.js`
- [ ] Stwórz: `src/widoki/zlecenia-wspolne.js`
- [ ] Stwórz: `src/widoki/zlecenia-dzien.js`
- [ ] Stwórz: `src/widoki/zlecenia-tydzien.js`
- [ ] Stwórz: `src/widoki/zlecenia-miesiac.js`
- [ ] Modyfikuj: `src/ui/format.js`
- [ ] Modyfikuj: `src/ui/format.test.js`
- [ ] Modyfikuj: `src/style/zlecenia.css`
- [ ] Test: [Unit] `modelDnia` na stanie z `e2e/stany/moduly-dzis.js` (zegar 2026-11-02): „Do zamknięcia” ma Biuro (tylko „Zrobione”) i Jana (tylko „Zapłacone”), dzień ma Annę 9:00 i Biuro 15:00
- [ ] Test: [Unit] `modelDnia` dla dnia innego niż dziś nie ma sekcji „Do zamknięcia”; wizyta jutrzejsza nie ma przycisków
- [ ] Test: [Unit] `modelMiesiaca(2026, 11)` liczy wizyty serii co tydzień w każdym tygodniu i pomija odwołane
- [ ] Test: [Unit] `dzienKrotko('2026-11-03')` → „wt 3 lis”; `dopasuj('#/zlecenie/nowe', TRASY)` → `noweZlecenie`; `dopasuj('#/zlecenie/z1/wizyta/2026-11-02', TRASY)` → `wizyta`
- [ ] Test: [E2E] `zlecenia-dzien-zamkniecie` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/start, kliknij kafel „Zlecenia”, w „Do zamknięcia” kliknij „Zrobione” przy Biurze Rachunkowym Lis i „Zapłacone” przy Janie Nowaku, wróć „Start”, zrób screenshot → kafel „Zlecenia” był pierwszy z linią „2 do zamknięcia”, widok Dzień otworzył się domyślnie, po dwóch dotknięciach sekcja „Do zamknięcia” znika, Start pokazuje „Dziś 2 zlecenia” bez niezapłaconych, a kafel „2 dziś”
- [ ] Test: [E2E] `kalendarz-widoki` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/zlecenia/dzien, kliknij „Tydzień”, potem „Miesiąc”, dotknij dnia za tydzień w siatce, zrób screenshot każdego widoku → Tydzień to lista 7 dni od poniedziałku z wizytą Biura w dzisiejszym dniu tygodnia, Miesiąc ma liczby wizyt w dniach, dotknięcie dnia otwiera widok Dzień tego dnia z wizytą Biura 15:00
- [ ] Weryfikacja: `node --test src/zlecenia/kalendarz-dane.test.js src/ui/format.test.js src/ui/router.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-16: Nowe zlecenie: ręcznie i „Zaplanuj” z wyceny (feature-builder-fullstack)

- [ ] Stwórz: `src/zlecenia/formularz.js`
- [ ] Test (unit): `src/zlecenia/formularz.test.js`
- [ ] Stwórz: `src/widoki/zlecenie-formularz.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/widoki/podsumowanie.js`
- [ ] Modyfikuj: `src/kreator/podsumowanie.js`
- [ ] Modyfikuj: `src/kreator/podsumowanie.test.js`
- [ ] Modyfikuj: `src/widoki/lista-wycen.js`
- [ ] Modyfikuj: `src/style/zlecenia.css`
- [ ] Test: [Unit] `wartosciPoczatkowe` dla przyjętego abonamentu `abonament_3` z ceną 120 zł za wizytę i `wizytWMiesiacu` 13 → cykl `tydzien` z dniami [1, 3, 5], rozliczenie `miesiecznie`, kwota 1560 zł, plan z migawki
- [ ] Test: [Unit] dla szybkiej wyceny z widełkami 250–320 zł cena jest pusta, a podpowiedź „W wycenie: 250–320 zł”; z ceną ręczną — cena ręczna
- [ ] Test: [Unit] termin wyceny „2026-11-14T09:00” daje datę 2026-11-14 i godzinę 9:00; termin „sobota rano” — dziś bez godziny
- [ ] Test: [Unit] `bledyFormularza` bez klienta → `klient`; cykl tygodniowy bez dni → `dni`; cena „-5” → `cena`
- [ ] Test: [Unit] `akcjeWyceny` dla przyjętej wyceny do zaplanowania zawiera `zaplanuj`, dla przyjętej ze zleceniem — nie
- [ ] Test: [E2E] `zlecenie-seria-co-tydzien` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/zlecenia/dzien, kliknij „Nowe zlecenie”, wybierz klienta „Jan Nowak”, usługę „Sprzątanie mieszkania (standard)”, cenę 200, datę jutrzejszą, godzinę 10:00, „Co tydzień”, kliknij „Zapisz zlecenie”, przejdź na „Tydzień”, zrób screenshot → po zapisie widok Dzień daty startu z wizytą „10:00 · Jan Nowak”, w widoku tygodnia wizyta w dniu tygodnia daty startu, a za tydzień kolejna; formularz wymagał najwyżej 8 dotknięć poza wpisywaniem
- [ ] Test: [E2E] `zaplanuj-z-wyceny` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/wyceny, w sekcji „Do zaplanowania” kliknij „Zaplanuj” przy Annie Kowalskiej, sprawdź wypełnione pola, wybierz datę jutrzejszą i kliknij „Zapisz zlecenie”, wróć do ekranu Wycena i otwórz tę wycenę, zrób screenshot → formularz ma klienta „Anna Kowalska”, cenę z wyceny i planowany czas, wycena znika z „Do zaplanowania”, a jej podsumowanie ma sekcję „Zlecenia z tej wyceny” z nowym zleceniem
- [ ] Test: [E2E] `abonament-raz-w-miesiacu` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, w kreatorze dokładnej wyceny zrób wycenę biura 100 m² z abonamentem 3× w tygodniu, zapisz ją, oznacz jako przyjętą, kliknij „Zaplanuj”, wybierz klienta przez „Dodaj nowego klienta: Biuro Testowe”, zrób screenshot formularza i kliknij „Zapisz zlecenie” → formularz ma „Co tydzień” z dniami pn, śr, pt, płatność „Raz w miesiącu” i „Kwota za miesiąc (zł)” równą cenie za wizytę × 13; po zapisie wizyty w widoku tygodnia w pn, śr i pt mają tylko „Zrobione” i „w abonamencie”
- [ ] Weryfikacja: `node --test src/zlecenia/formularz.test.js src/kreator/podsumowanie.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-17: Wizyta: zamknięcie, zapłata, czas pracy, przesunięcie i odwołanie (feature-builder-ui)

- [ ] Stwórz: `src/widoki/wizyta.js`
- [ ] Stwórz: `src/zlecenia/wizyta-dane.js`
- [ ] Test (unit): `src/zlecenia/wizyta-dane.test.js`
- [ ] Modyfikuj: `src/zlecenia/plan-fakt.js`
- [ ] Modyfikuj: `src/zlecenia/plan-fakt.test.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/ui/statusy.js`
- [ ] Modyfikuj: `src/style/zlecenia.css`
- [ ] Test: [Unit] model wizyty serii miesięcznej nie ma akcji zapłaty, a model wizyty za wizytę ma
- [ ] Test: [Unit] model wizyty przesuniętej pokazuje nowy termin i pigułkę „Przesunięta”, a cofnięcie przesunięcia na datę pierwotną ją usuwa
- [ ] Test: [Unit] plan i fakt wizyty z planem 270 min i czasem 300 min daje „Plan 4 h 30 min”, „Fakt 5 h” i stawkę z `historiaPlanuIFaktu`; wizyta zlecenia bez planu nie pokazuje planu
- [ ] Test: [Unit] przeniesiona wizyta z formą null pokazuje „Zapłacone” bez formy
- [ ] Test: [E2E] `wizyta-przesun-i-czas` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz http://localhost:5174/#/zlecenia/dzien, kliknij wizytę „9:00 · Anna Kowalska”, kliknij „Zrobione”, „Zapłacone” i wybierz formę „Przelew”, kliknij „Dopisz czas pracy”, ustaw 4 h 15 min i „Zapisz czas”; wróć do widoku Dzień, kliknij wizytę „15:00 · Biuro Rachunkowe Lis”, kliknij „Przesuń”, ustaw jutro 11:00 i „Zapisz nowy termin”, zrób screenshot widoku Dzień jutra i ekranu Start → wizyta Anny ma „Zapłacone · Przelew · {dziś}” i zapisany czas, wizyta Biura jest jutro o 11:00 z pigułką „Przesunięta” i nie ma jej dziś, Start pokazuje „Dziś 1 zlecenie · 1 niezapłacone”
- [ ] Weryfikacja: `node --test src/zlecenia/wizyta-dane.test.js src/zlecenia/plan-fakt.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-18: Karta zlecenia, seria i historia klienta (feature-builder-ui)

- [ ] Stwórz: `src/widoki/zlecenie-karta.js`
- [ ] Stwórz: `src/zlecenia/karta-dane.js`
- [ ] Test (unit): `src/zlecenia/karta-dane.test.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/widoki/klient-karta.js`
- [ ] Modyfikuj: `src/widoki/klienci-dane.js`
- [ ] Modyfikuj: `src/widoki/klienci-dane.test.js`
- [ ] Modyfikuj: `src/style/zlecenia.css`
- [ ] Modyfikuj: `src/style/klienci.css`
- [ ] Test: [Unit] `opisRodzaju` dla serii co tydzień pn i czw 9:00 za 250 zł → „Co tydzień: pn, czw · 9:00 · 250 zł za wizytę”; dla serii miesięcznej → „… · 1560 zł miesięcznie”
- [ ] Test: [Unit] `miesiaceDoZaplaty` dla serii od 2026-09-14 przy dziś 2026-11-02: listopad, październik, wrzesień; październik bez zapłaty ma flagę niezapłaconego, listopad nie
- [ ] Test: [Unit] `niezaplaconeKlienta` zwraca tylko pozycje danego klienta; `historiaZlecen` ma „Zakończone” dla serii z `koniec` w przeszłości
- [ ] Test: [E2E] `seria-zmiana-i-zakonczenie` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz kartę zlecenia Biura Rachunkowego Lis z widoku Dzień, kliknij „Zmień cenę lub godzinę”, ustaw 16:00, zapisz, potem „Zakończ serię” z dniem za 2 tygodnie, otwórz widok Miesiąc, zrób screenshot → najbliższa wizyta ma 16:00, wcześniejsze zostały 15:00, po dniu zakończenia w Miesiącu nie ma wizyt Biura, zapłaty miesięczne pokazują opłacone miesiące jako „Zapłacone”
- [ ] Test: [E2E] `klient-historia-zlecen` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz kartę klienta „Jan Nowak”, zrób screenshot, kliknij „Nowe zlecenie” → karta ma sekcję „Niezapłacone” z wczorajszą wizytą za 180 zł i sekcję „Zlecenia”; „Nowe zlecenie” otwiera formularz z wybranym Janem Nowakiem
- [ ] Weryfikacja: `node --test src/zlecenia/karta-dane.test.js src/widoki/klienci-dane.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Operator checklist faza 5

- [ ] Operator: Właściciel zakłada na telefonie serię co tydzień u stałego klienta i mierzy, że trwa to niecałą minutę (IU-16)
- [ ] Operator: Właściciel zamyka na telefonie wczorajszą wizytę z zapłatą dwoma dotknięciami w widoku Dzień (IU-17)

## Faza 6 — Wycena w nowym wyglądzie

Zależy od: Faza 5

### IU-19: Kreator dokładnej wyceny w nowym wyglądzie (feature-builder-ui)

- [ ] Modyfikuj: `src/widoki/kreator-wspolne.js`
- [ ] Modyfikuj: `src/widoki/kreator-usluga.js`
- [ ] Modyfikuj: `src/widoki/kreator-pomieszczenia.js`
- [ ] Modyfikuj: `src/widoki/kreator-pozycje.js`
- [ ] Modyfikuj: `src/widoki/kreator-dodatki.js`
- [ ] Modyfikuj: `src/style/kreator.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [E2E] `kreator-wyglad-cena` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/wyceny, kliknij „Dokładna wycena”, wybierz „Sprzątanie mieszkania (standard)”, ustaw 50 m² z domyślnym układem, przejdź do podsumowania, zrób screenshot każdego kroku → każdy krok ma jeden główny przycisk, tekst ≥ 17 px i elementy klikalne ≥ 48 px, cena dla klienta 250 zł jak w scenariuszu kalibracji mieszkania 50 m² w mazowieckim
- [ ] Weryfikacja: `node --test src/silnik/parytet.test.js` przechodzi bez zmian w teście (ceny jak przed przebudową)
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-20: Szybka wycena i pytania do klienta w nowym wyglądzie (feature-builder-ui)

- [ ] Modyfikuj: `src/widoki/szybka.js`
- [ ] Modyfikuj: `src/widoki/szybka-wynik.js`
- [ ] Modyfikuj: `src/widoki/pytania.js`
- [ ] Modyfikuj: `src/style/szybka.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [E2E] `szybka-pytania-wyglad` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/start, kliknij kafel „Wycena” i „Szybka wycena”, wybierz mieszkanie 50 m² z aneksem, stan typowy, otwórz pytania do klienta i odpowiedz na jedno, zrób screenshot → widełki 250–300 zł duże i pogrubione, wyjaśnienie widełek widoczne dopiero po „Więcej”, tekst ≥ 17 px, elementy klikalne ≥ 48 px
- [ ] Weryfikacja: `node --test src/kreator/szybka.test.js src/widoki/szybka-wynik.test.js src/widoki/pytania.test.js` przechodzi bez zmian w testach (widełki jak przed przebudową)
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-21: Podsumowanie wyceny i edycja oferty w nowym wyglądzie (feature-builder-ui)

- [ ] Modyfikuj: `src/widoki/podsumowanie.js`
- [ ] Modyfikuj: `src/widoki/podsumowanie-karty.js`
- [ ] Modyfikuj: `src/widoki/oferta-edycja.js`
- [ ] Modyfikuj: `src/widoki/oferta-edycja-sekcje.js`
- [ ] Modyfikuj: `src/widoki/edytor-listy.js`
- [ ] Modyfikuj: `src/style/podsumowanie.css`
- [ ] Modyfikuj: `src/style/komponenty.css`
- [ ] Test: [E2E] `podsumowanie-wyglad` — okno 360×800, uruchom w stronie skrypt `e2e/stany/moduly-dzis.js`, otwórz z ekranu Wycena przyjętą wycenę Anny Kowalskiej, dotknij „?” przy medianie, potem otwórz ofertę wyceny do wysłania Jana Nowaka, zrób screenshot → cena duża i zielona, opis mediany w arkuszu po „?”, jeden główny przycisk („Zaplanuj” przy przyjętej), edycja oferty z wyborem klienta i bez długich opisów na wierzchu
- [ ] Weryfikacja: `node --test src/widoki/oferta-edycja.test.js src/widoki/oferta-edycja-sekcje.test.js src/kreator/podsumowanie.test.js` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-22: Oferta dla klienta w neutralnym wyglądzie (feature-builder-ui)

- [ ] Modyfikuj: `src/style/oferta.css`
- [ ] Modyfikuj: `src/style/druk.css`
- [ ] Modyfikuj: `oferta.html`
- [ ] Test: [E2E] `oferta-neutralna` — okno 360×800, otwórz http://localhost:5174/oferta.html z fragmentem z `e2e/stany/oferta-po-terminie.txt`, zmierz przez eval kolor tła, kolor kwoty i rozmiar tekstu akapitów, zrób screenshot → tło białe, kwota w kolorze tekstu (bez zieleni), tekst ≥ 17 px, oferta czytelna bez powiększania
- [ ] Weryfikacja: `grep -c "marka-zielen" src/style/oferta.css` zwraca 0
- [ ] Weryfikacja: `node --test src/widoki/oferta-klient.test.js src/oferta/kodek.test.js` przechodzi (link `v1.` dekoduje się jak dotąd)
- [ ] Weryfikacja: `npm test` przechodzi

## Operator checklist faza 6

- [ ] Operator: Właściciel otwiera link oferty i PDF na telefonie i ocenia, że wyglądają jak dokument jego firmy (IU-22)
