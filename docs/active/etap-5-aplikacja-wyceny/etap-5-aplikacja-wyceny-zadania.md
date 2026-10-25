# Zadania: etap-5-aplikacja-wyceny

Branch: `feature/etap-5-aplikacja-wyceny`
Ostatnia aktualizacja: 2026-10-24
Plan techniczny: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`

Checkboxy odsyłają do jednostek planu technicznego (IU-K): cel, podejście, decyzje i teksty są tylko tam.

## Faza 1 — Narzędzia i silnik wyceny

Zależy od: Brak

### IU-1: Narzędzia projektu i serwer deweloperski (feature-builder-data)

- [x] Stwórz: `package.json`
- [x] Stwórz: `package-lock.json`
- [x] Stwórz: `tsconfig.json`
- [x] Stwórz: `scripts/serwer-dev.mjs`
- [x] Test (unit): `scripts/serwer-dev.test.mjs`
- [x] Modyfikuj: `CLAUDE.md`
- [x] Test: [Unit] serwer na losowym porcie zwraca `index.html` dla `/` (jeśli plik istnieje) albo 404, a dla `/data/ceny.json` status 200 i `application/json`
- [x] Test: [Unit] żądanie `/../package.json` i `/%2e%2e/package.json` dostaje 403, a nieistniejący plik 404
- [x] Test: [Unit] plik `.webmanifest` ma typ `application/manifest+json`, `.woff2` — `font/woff2`, `.js` — `text/javascript`
- [x] Weryfikacja: `npm test` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [x] Weryfikacja: `node --test scripts/serwer-dev.test.mjs` przechodzi

### IU-2: Układy i scenariusze kalibracji dla silnika (feature-builder-data)

- [x] Modyfikuj: `scripts/kalibracja.ps1`
- [x] Modyfikuj: `data/normy.json`
- [x] Stwórz: `research/kalibracja-scenariusze.json`
- [x] Modyfikuj: `CLAUDE.md`
- [x] Weryfikacja: `bash -c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1"` kończy się bez wyjątku i wypisuje „niezgodności katalogu: 0”
- [x] Weryfikacja: `git diff --exit-code research/KALIBRACJA.md data/rynek.json` nie pokazuje zmian
- [x] Weryfikacja: `bash -c "head -c3 scripts/kalibracja.ps1 | od -An -tx1"` zwraca `ef bb bf`
- [x] Weryfikacja: `node -e "JSON.parse(require('fs').readFileSync('research/kalibracja-scenariusze.json','utf8'))"` kończy się bez błędu

### IU-3: Silnik: katalog danych, układy i czas pracy (feature-builder-data)

- [x] Stwórz: `src/silnik/katalog.js`
- [x] Stwórz: `src/silnik/bledy.js`
- [x] Stwórz: `src/silnik/uklad.js`
- [x] Stwórz: `src/silnik/czas.js`
- [x] Stwórz: `tests/pomocnicze.js`
- [x] Stwórz: `tests/fixtures/katalog-maly.json`
- [x] Test (unit): `src/silnik/katalog.test.js`
- [x] Test (unit): `src/silnik/uklad.test.js`
- [x] Test (unit): `src/silnik/czas.test.js`
- [x] Test: [Unit] `ukladMieszkania(50)` daje pokój 32, przedpokój 6, kuchnię 8 i łazienkę 4 m² (suma 50); dla 120 m² dwie łazienki 8 i 5 m²
- [x] Test: [Unit] `ukladMieszkania(50, { lazienki: 2 })` daje dwie łazienki po 4 m², a `kuchnia: 'aneks'` kuchnię 5 m² i pokój 35 m²
- [x] Test: [Unit] `ukladMieszkania(12, { lazienki: 3 })` rzuca `BladWejscia` z kodem `metraz`
- [x] Test: [Unit] minuty 50 m² standard (układ typowy, mnożnik 1) zgadzają się z polem `minuty` scenariusza w `research/kalibracja-scenariusze.json` z dokładnością 0,01
- [x] Test: [Unit] reguła brudu `pyl_budowlany` poziom 2 na `*` dokłada m² × norma pyłu do każdego pomieszczenia
- [x] Test: [Unit] `minutyPozycji('okna', [{ id: 'okno_1', ilosc: 8 }])` = 30 + 8 × 15; dla usługi z `poziomy_brudu` poziom 3 mnoży czas pozycji przez 1,4
- [x] Test: [Unit] `wczytajKatalog` z katalogiem bez normy pozycji rzuca `BladKatalogu` z kodem `brak_normy`; `wojewodztwo(null)` zwraca stawkę 65 i wsp 1
- [x] Weryfikacja: `node --test src/silnik/katalog.test.js src/silnik/uklad.test.js src/silnik/czas.test.js` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-4: Silnik: cena usługi i widełki rynku (feature-builder-data)

- [x] Stwórz: `src/silnik/cena.js`
- [x] Stwórz: `src/silnik/widelki.js`
- [x] Modyfikuj: `data/ceny.json`
- [x] Test (unit): `src/silnik/cena.test.js`
- [x] Test (unit): `src/silnik/widelki.test.js`
- [x] Test (unit): `src/silnik/parytet.test.js`
- [x] Test: [Unit] wszystkie scenariusze z `research/kalibracja-scenariusze.json` dają te same minuty i ceny z dokładnością 0,01
- [x] Test: [Unit] mieszkanie 50 m² standard w mazowieckim kosztuje 250 zł, a z dojazdem 32 km — 294 zł (dojazd 44 zł)
- [x] Test: [Unit] okna: 4 × okno 1-skrz. = 120 zł, cena 150 zł i `czyMinimum: true`; dojazd 8 km bez dopłaty
- [x] Test: [Unit] kostka 40 m²: mycie 40 × 15 × 1,15 = 690 zł, dopłata mech 40 × 7,50 = 300 zł bez progu, razem 990 zł (makieta `kreator-pozycje`); impregnacja 40 m² dokłada 40 × (21,50 + 8) bez progu
- [x] Test: [Unit] mieszkanie z dodatkiem okna 4 × okno 1-skrz. w trybie `propozycja`: cena bez zmian, `propozycje` ma pozycję 120 zł; w trybie `w_cenie` cena rośnie o 120 zł
- [x] Test: [Unit] doczyszczanie 200 m² z poziomem brudu 3: cena i czas pozycji × 1,4
- [x] Test: [Unit] abonament 1× w tygodniu dla 100 m²: `cenaMiesieczna` = cena wizyty × 4,33
- [x] Test: [Unit] usługa AGD jako główna rzuca `BladWejscia`; ujemna ilość i m² = 0 rzucają `BladWejscia`
- [x] Test: [Unit] widełki mieszkania 50 m² w mazowieckim to 120–450 zł; okno balkonowe (`zakres: null`) daje `pelne: false`
- [x] Weryfikacja: `node --test src/silnik/cena.test.js src/silnik/widelki.test.js src/silnik/parytet.test.js` przechodzi
- [x] Weryfikacja: `bash -c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1"` wypisuje „niezgodności katalogu: 0”
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-5: Silnik: VAT, koszt zlecenia i „zostaje dla Ciebie” (feature-builder-data)

- [x] Stwórz: `src/silnik/vat.js`
- [x] Stwórz: `src/silnik/koszt.js`
- [x] Test (unit): `src/silnik/vat.test.js`
- [x] Test (unit): `src/silnik/koszt.test.js`
- [x] Test: [Unit] mieszkanie 250 zł, firma zwolniona: brutto 250, netto 250; czynny VAT: brutto 250, netto 203,25, vat 46,75
- [x] Test: [Unit] mycie posadzek 300 zł modelu (podstawa netto), czynny VAT: netto 300, brutto 369
- [x] Test: [Unit] mieszkanie 50 m² (230,82 min normy), tempo 1,3, dojazd 24 km, firma zwolniona: chemia = 4 × 230,82 / 60, dojazd firmy = 2 × 24 × 1,15, `zostajeNaGodzine` = zostaje / (230,82 × 1,3 / 60)
- [x] Test: [Unit] zlecenia wzorcowe z `research/kalibracja-scenariusze.json` przy tempie 1: chemia i sprzęt równe polom `chemia` i `sprzet` z dokładnością 0,01
- [x] Test: [Unit] ręczna cena 290 zł zmienia `zostaje` i `zostajeNaGodzine`, a nie zmienia `minutyWlasne`
- [x] Test: [Unit] tempo ≤ 0 albo brak `minutyNormowe` rzuca `BladWejscia`
- [x] Weryfikacja: `node --test src/silnik/vat.test.js src/silnik/koszt.test.js` przechodzi
- [x] Weryfikacja: `npm test` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Do poprawy po review fazy 1

Zamkniete cyklem fix: 8 pozycji — pelna tresc findingow i uzasadnienia w `review-faza-1.md`.

## Operator checklist faza 1

- [ ] [Manual] po uruchomieniu skryptu `research/kalibracja-scenariusze.json` ma scenariusz „mieszkanie_standard, 50 m², stawka 65” z ceną 250 ± 1 zł (automatycznie sprawdza go test parytetu w IU-4) (IU-2)
- [ ] [Manual] `git diff data/normy.json` pokazuje tylko nowe pole `uklady`, bez zmian norm (IU-2)
- [ ] Operator: widełki usług z pomieszczeniami bez minimum zlecenia (mieszkanie 50 m² w mazowieckim: 120 zamiast 150 zł); decyzja wykonawcy z IU-4 (`docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md:369`) nie trafiła na listę spraw do potwierdzenia — Operator action: dopisać tę pozycję do listy „Założenia planu do potwierdzenia przez właściciela w smoke'u” w PLAN.md:120; po potwierdzeniu usunąć dopisek „do potwierdzenia przez właściciela” z linii 369 planu.

## Faza 2 — Dane w przeglądarce

Zależy od: Faza 1

### IU-6: Magazyn, schemat stanu i ustawienia firmy (feature-builder-data)

- [x] Stwórz: `data/domyslne.json`
- [x] Stwórz: `src/dane/magazyn.js`
- [x] Stwórz: `src/dane/ustawienia.js`
- [x] Stwórz: `src/dane/walidacja.js`
- [x] Stwórz: `tests/pamiec-magazynu.js`
- [x] Test (unit): `src/dane/magazyn.test.js`
- [x] Test (unit): `src/dane/ustawienia.test.js`
- [x] Test (unit): `src/dane/walidacja.test.js`
- [x] Test: [Unit] pusty storage → `wczytaj()` zwraca stan v1 z `ustawienia: null` i pustą listą wycen
- [x] Test: [Unit] `zmien` zapisuje stan pod `wyceny-sprzatanie:stan` i ustawia `kopia.zmianaOd`
- [x] Test: [Unit] uszkodzony JSON pod kluczem → `{ blad: 'uszkodzony', surowe }` z oryginalnym tekstem; stan z wersją 2 → `nowsza_wersja`
- [x] Test: [Unit] przepełnienie (atrapa `setItem` rzuca `QuotaExceededError`) → `BladMagazynu` z kodem `pelny`
- [x] Test: [Unit] `pominKreator` daje status VAT „zwolniony”, tempo ręczne null, województwo null, a `brakujeUstawien` zwraca `['wojewodztwo', 'firma']`
- [x] Test: [Unit] NIP `5260250274` przechodzi, `5260250275` daje błąd; telefon `600 123 456` i `+48600123456` przechodzą, `12345` daje błąd
- [x] Test: [Unit] `scalKoszty` nadpisuje `chemia_h` z ustawień i zostawia pozostałe wartości z `data/ceny.json`
- [x] Weryfikacja: `node --test src/dane/magazyn.test.js src/dane/ustawienia.test.js src/dane/walidacja.test.js` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-7: Wyceny, zlecenia i własne tempo (feature-builder-data)

- [x] Stwórz: `src/dane/wyceny.js`
- [x] Stwórz: `src/silnik/tempo.js`
- [x] Test (unit): `src/dane/wyceny.test.js`
- [x] Test (unit): `src/silnik/tempo.test.js`
- [x] Test: [Unit] dwie wyceny zapisane w październiku 2026 dostają numery `1/10/2026` i `2/10/2026`, a pierwsza w listopadzie `1/11/2026`
- [x] Test: [Unit] przejście `szkic → przyjeta` rzuca `BladWyceny` z kodem `przejscie`; `do_wyslania → wyslana → przyjeta → wykonana` przechodzi
- [x] Test: [Unit] zmiana wejścia wysłanej wyceny ustawia `oferta.nieaktualna`, a wykonanej rzuca `tylko_odczyt`
- [x] Test: [Unit] wykonanie 0 minut i 1500 minut rzuca błąd; abonament po dwóch wizytach ma status `przyjeta` i dwa wpisy
- [x] Test: [Unit] tempo z wpisów 1,1, 1,2 i 1,4 = 1,2 (mediana) z `liczba: 3`; dwa wpisy → null i `tempoDoWyceny` zwraca 1,3 ze źródłem `domyslne`
- [x] Test: [Unit] wpis 3,5× zapisuje się z `liczony: false` i nie zmienia mediany; z 12 wpisów liczy się 10 najnowszych
- [x] Test: [Unit] trzy wpisy usługi `okna` i dwa innej usługi: dla `okna` zakres `usluga`, dla innej `wspolne` z pięciu wpisów
- [x] Test: [Unit] `tempo.reczne = 1,5` wygrywa z tempem z zleceń; `opisTempa` daje „1,18× z 7 zleceń”
- [x] Weryfikacja: `node --test src/dane/wyceny.test.js src/silnik/tempo.test.js` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-8: Kopia zapasowa: eksport, import i przypomnienie (feature-builder-data)

- [x] Stwórz: `src/dane/kopia.js`
- [x] Stwórz: `tests/fixtures/kopia-v1.json`
- [x] Test (unit): `src/dane/kopia.test.js`
- [x] Test: [Unit] `utworzKopie` → `odczytajKopie` → ten sam stan (wyceny, ustawienia, licznik) i nazwa pliku `wyceny-kopia-2026-10-24.json`
- [x] Test: [Unit] plik `tests/fixtures/kopia-v1.json` wczytuje się bez błędów
- [x] Test: [Unit] tekst „to nie json”, plik z `aplikacja: 'inna'` i plik z `wersjaSchematu: 2` dają kody `zly_plik`, `zly_plik` i `nowsza_wersja`
- [x] Test: [Unit] `polacz`: wycena o tym samym `id` z nowszą datą w pliku zastępuje lokalną, starsza zostaje lokalna, nowe dochodzą; licznik numerów bierze maksimum
- [x] Test: [Unit] `zastap` usuwa wyceny spoza pliku
- [x] Test: [Unit] przypomnienie: kopia sprzed 8 dni i zmiana po niej → true; ta sama przy `przypomnienieKopiiDni: 14` → false; kopia sprzed 8 dni bez zmian → false; brak kopii i wycena sprzed 7 dni → true; same szkice → false
- [x] Weryfikacja: `node --test src/dane/kopia.test.js` przechodzi
- [x] Weryfikacja: `npm test` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Do poprawy po review fazy 2

Zamkniete cyklem fix: 16 pozycji — pelna tresc findingow i uzasadnienia w `review-faza-2.md`.

## Faza 3 — Szkielet aplikacji, start, ustawienia i kopia

Zależy od: Faza 2

### IU-9: Szkielet aplikacji: strona, router, komponenty i style (feature-builder-ui)

- [x] Stwórz: `index.html`
- [x] Stwórz: `src/app.js`
- [x] Stwórz: `src/ui/router.js`
- [x] Stwórz: `src/ui/trasy.js`
- [x] Stwórz: `src/widoki/indeks.js`
- [x] Stwórz: `src/ui/h.js`
- [x] Stwórz: `src/ui/format.js`
- [x] Stwórz: `src/ui/ikony.js`
- [x] Stwórz: `src/ui/komponenty/formularz.js`
- [x] Stwórz: `src/ui/komponenty/uklad.js`
- [x] Stwórz: `src/style/tokeny.css`
- [x] Stwórz: `src/style/baza.css`
- [x] Stwórz: `src/style/komponenty.css`
- [x] Stwórz: `fonty/source-sans-3-latin-wght.woff2`
- [x] Stwórz: `fonty/source-sans-3-latin-ext-wght.woff2`
- [x] Stwórz: `fonty/OFL.txt`
- [x] Test (unit): `src/ui/format.test.js`
- [x] Test (unit): `src/ui/router.test.js`
- [x] Test: [Unit] `dopasuj('#/wycena/abc/oferta', TRASY)` → `{ nazwa: 'oferta', parametry: { id: 'abc' } }`; `#/kreator/zakres?wycena=x` daje krok i zapytanie; `#/nic` → null
- [x] Test: [Unit] `zl(1234.5)` → „1 235 zł” z twardą spacją; `czas(315)` → „5 h 15 min”; `tempo(1.18)` → „1,18×”
- [x] Test: [Unit] `miejscownikWojewodztwa('kujawsko-pomorskie')` → „kujawsko-pomorskim”; `dniTemu` dla 0, 1 i 9 dni
- [x] Test: [E2E] `szkielet-nawigacja` — ustaw okno 360×800, otwórz http://localhost:5174/, wstrzyknij przez `agent-browser eval` treść `e2e/stany/ustawienia-mazowieckie.json` do `localStorage['wyceny-sprzatanie:stan']`, przeładuj, kliknij „Wyceny”, „Firma”, „+”, potem otwórz `#/zly-adres`, zrób screenshot → nagłówki ekranów zmieniają się, arkusz „+” ma dwie opcje, zły adres pokazuje „Nie ma takiego ekranu.”, konsola bez błędów, `document.fonts.check('16px "Source Sans 3"')` zwraca true
- [x] Weryfikacja: `node --test src/ui/format.test.js src/ui/router.test.js` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [x] Weryfikacja: `grep -rn "innerHTML" src/` nie zwraca wyników

### IU-10: Ekran startowy i lista wycen (feature-builder-ui)

- [x] Stwórz: `src/widoki/start.js`
- [x] Stwórz: `src/widoki/lista-wycen.js`
- [x] Stwórz: `src/widoki/start-dane.js`
- [x] Stwórz: `src/ui/statusy.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Stwórz: `e2e/stany/ustawienia-mazowieckie.json`
- [x] Stwórz: `e2e/stany/wyceny-do-zrobienia.json`
- [x] Test (unit): `src/widoki/start-dane.test.js`
- [x] Test: [Unit] `doZrobienia` dla wycen do wysłania, przyjętej z terminem jutro i przyjętej z terminem wczoraj daje „Wyślij ofertę” i jedno „Wpisz czas pracy”
- [x] Test: [Unit] `podsumowanieMiesiaca` liczy wyceny z bieżącego miesiąca bez szkiców i średnią realną stawkę z wykonań
- [x] Test: [Unit] `e2e/stany/wyceny-do-zrobienia.json` wczytuje się przez `odczytajKopie`-zgodny kształt stanu v1 (magazyn bez błędu)
- [x] Test: [E2E] `ekran-startowy-zadania` — okno 360×800, wstrzyknij `e2e/stany/wyceny-do-zrobienia.json` do `localStorage['wyceny-sprzatanie:stan']`, otwórz http://localhost:5174/#/start, zrób screenshot, kliknij wiersz „Wyślij ofertę”, wróć, kliknij „Wyceny” → karta „Do zrobienia 2” z „Wyślij ofertę” i „Wpisz czas pracy”, baner „Nie masz jeszcze kopii danych…”, wiersz otwiera `#/wycena/<id>`, lista wycen ma trzy pozycje z pigułkami „Do wysłania”, „Wysłana”, „Przyjęta”
- [x] Weryfikacja: `node --test src/widoki/start-dane.test.js` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-11: Ustawienia firmy i kreator pierwszego uruchomienia (feature-builder-ui)

- [x] Stwórz: `src/widoki/ustawienia.js`
- [x] Stwórz: `src/widoki/ustawienia-sekcje.js`
- [x] Stwórz: `src/widoki/ustawienia-tempo.js`
- [x] Stwórz: `src/widoki/kreator-startowy.js`
- [x] Stwórz: `src/widoki/ustawienia-formularz.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Modyfikuj: `src/app.js`
- [x] Test (unit): `src/widoki/ustawienia-formularz.test.js`
- [x] Test: [Unit] formularz z telefonem „600-123-456” i NIP-em pustym daje patch bez błędów; chemia „4,5” → 4.5; chemia „-1” → błąd zakresu
- [x] Test: [Unit] tempo „3,5” daje błąd „Wpisz liczbę od 0,5 do 3.”
- [x] Test: [E2E] `kreator-ustawien` — okno 360×800, wyczyść localStorage, otwórz http://localhost:5174/, przejdź kreator: województwo „mazowieckie”, „Czynny podatnik VAT”, nazwa „Firma Test”, telefon „600 123 456”, tempo bez zmian, „Gotowe”; potem otwórz „Firma” → start bez banera „Ustawienia domyślne – uzupełnij”, w ustawieniach „Czynny podatnik VAT” zaznaczony i „1,3× normy rynkowej”
- [x] Test: [E2E] `kreator-ustawien-pominiety` — wyczyść localStorage, otwórz http://localhost:5174/, kliknij „Pomiń” → start z banerem „Ustawienia domyślne – uzupełnij”, a „Uzupełnij” otwiera `#/ustawienia`
- [x] Weryfikacja: `node --test src/widoki/ustawienia-formularz.test.js` przechodzi
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-12: Ekran kopii zapasowej i ekran ratunkowy (feature-builder-ui)

- [x] Stwórz: `src/widoki/kopia.js`
- [x] Stwórz: `src/widoki/ratunek.js`
- [x] Stwórz: `src/ui/plik.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Modyfikuj: `src/app.js`
- [x] Test: [E2E] `kopia-eksport` — okno 360×800, wstrzyknij `e2e/stany/wyceny-do-zrobienia.json`, otwórz http://localhost:5174/#/kopia, kliknij „Zapisz kopię”, wróć na start → baner „Kopia zapisana: wyceny-kopia-<dzisiejsza data>.json”, na starcie brak banera przypomnienia o kopii
- [x] Test: [E2E] `ekran-ratunkowy` — wstrzyknij do `localStorage['wyceny-sprzatanie:stan']` tekst `{zepsute`, otwórz http://localhost:5174/ → ekran „Nie udało się odczytać danych zapisanych w przeglądarce.” z trzema przyciskami
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [x] Weryfikacja: `npm test` przechodzi

### IU-13: PWA: manifest, service worker, ikony zastępcze i instrukcja dla iPhone'a (feature-builder-ui)

- [x] Stwórz: `manifest.webmanifest`
- [x] Stwórz: `sw.js`
- [x] Stwórz: `src/pwa/rejestracja.js`
- [x] Stwórz: `scripts/ikony-zastepcze.mjs`
- [x] Stwórz: `ikony/ikona.svg`
- [x] Stwórz: `ikony/ikona-192.png`
- [x] Stwórz: `ikony/ikona-512.png`
- [x] Stwórz: `ikony/ikona-maskable-512.png`
- [x] Stwórz: `ikony/apple-touch-icon.png`
- [x] Modyfikuj: `index.html`
- [x] Modyfikuj: `src/app.js`
- [x] Modyfikuj: `src/widoki/start.js`
- [x] Test (unit): `src/pwa/rejestracja.test.js`
- [x] Test: [Unit] `czyPokazacInstrukcjeIos` dla Safari na iPhonie poza trybem aplikacji → true; w trybie standalone, na Androidzie i po zamknięciu → false
- [x] Test: [E2E] `pwa-manifest` — otwórz http://localhost:5174/, przeładuj, sprawdź przez `agent-browser eval` `navigator.serviceWorker.controller !== null` i `fetch('manifest.webmanifest').then(r => r.json())` → service worker kontroluje stronę, manifest ma `short_name` „Wyceny” i trzy ikony
- [x] Weryfikacja: `node --test src/pwa/rejestracja.test.js` przechodzi
- [x] Weryfikacja: `node scripts/ikony-zastepcze.mjs` tworzy cztery pliki PNG w `ikony/`
- [x] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Do poprawy po review fazy 3

Zamkniete cyklem fix: 12 pozycji — pelna tresc findingow i uzasadnienia w `review-faza-3.md`.

## Operator checklist faza 3

- [ ] Operator: Właściciel sprawdza na telefonie dolny pasek, nagłówek i komponenty formularza wobec makiet (kolory wariantu B) (IU-9)
- [ ] Operator: Właściciel porównuje start na telefonie z makietą `ekran-startowy` (układ, teksty, statusy) (IU-10)
- [ ] Operator: Właściciel przechodzi kreator na telefonie i porównuje ustawienia z makietą `ustawienia-firmy` (IU-11)
- [ ] Operator: Właściciel zapisuje kopię na telefonie i wczytuje ją na komputerze (opcja „Połącz”) (IU-12)
- [ ] [Manual] import pliku kopii z systemowego okna wyboru plików na Androidzie i iPhonie (połącz i zastąp) (IU-12)
- [ ] [Manual] Chrome DevTools → Network „Offline” → aplikacja otwiera się i liczy wycenę z danych w cache (IU-13)
- [ ] [Manual] instalacja na ekranie początkowym Androida i iPhone'a; ikona zastępcza widoczna (IU-13)
- [ ] Operator: Plan zakłada hosting na GitHub Pages repo `simpleperfection/wyceny-sprzatanie`, czyli adres projektowy pod originem `simpleperfection.github.io`. Ten origin dzielą wszystkie strony Pages tego konta. `localStorage['wyceny-sprzatanie:stan']` z danymi klientów (nazwiska, telefony, adresy, NIP firmy) oraz Cache Storage service workera są dostępne dla każdej innej strony Pages właściciela. Taka strona może też wysłać do `sw.js` komunikat `zapisz-zasoby`, bo handler `message` nie sprawdza `zdarzenie.source`. Scenariusz: XSS albo złośliwa zależność w innym repo właściciela na github.io → odczyt i podmiana danych wszystkich wycen. Wymiana nagłówków (`frame-ancestors`, `X-Frame-Options`) też nie jest możliwa na Pages, bo meta CSP ich nie obsługuje. Decyzja operatora w etapie 6, który rozstrzyga adres publikacji: własna (sub)domena dla aplikacji albo osobne konto lub organizacja tylko z tą aplikacją. Kodu fazy to nie blokuje. — Operator action: zdecydować w etapie 6 o adresie publikacji: własna (sub)domena albo osobne konto lub organizacja GitHub tylko z tą aplikacją
- [ ] Operator: [Manual] ekran-startowy: visual review — Operator action: otwórz visual-diff/ekran-startowy-figma.png obok visual-diff/ekran-startowy-actual.png (viewport: 768×1839; zrzut zrobiony jako 384×920 przy deviceScaleFactor 2, bo makieta to eksport 2x ekranu 360 px; stan e2e/stany/wyceny-do-zrobienia.json, trasa #/start). Kolory różnią się celowo (tokeny wariantu B z SPEC.md). Układ sekcji jest zgodny: nagłówek, dwa kafle wyceny, karta miesiąca z tempem, „Do zrobienia”, baner kopii, dolne menu.
- [ ] Operator: [Manual] ustawienia-firmy: visual review — Operator action: otwórz visual-diff/ustawienia-firmy-figma.png obok visual-diff/ustawienia-firmy-actual.png (viewport: 768×2579; zrzut 384×920 przy skali 2 z --full, stan e2e/stany/ustawienia-mazowieckie.json, trasa #/ustawienia). Dolne menu w połowie zrzutu to artefakt zrzutu całej strony: menu ma position fixed i zostaje na dole okna 920 px. To nie jest defekt.
- [ ] Operator: [Manual] kopia-zapasowa: visual review — Operator action: otwórz visual-diff/kopia-zapasowa-figma.png obok visual-diff/kopia-zapasowa-actual.png (viewport: 768×1839; zrzut 384×920 przy skali 2, stan e2e/stany/wyceny-do-zrobienia.json, trasa #/kopia). Do oceny: pigułka „0 zleceń” liczy tylko wyceny wykonane (kopia-teksty.js:60, `wykonan`), więc przy jednej wycenie „Przyjęta” pokazuje 0. W makiecie liczba zleceń (7) jest równa liczbie przyjętych na starcie.

## Faza 4 — Kreator dokładnej wyceny

Zależy od: Faza 3

### IU-14: Stan kreatora i wybór usługi (feature-builder-fullstack)

- [x] Stwórz: `src/kreator/stan.js`
- [x] Stwórz: `src/widoki/kreator-wspolne.js`
- [x] Stwórz: `src/widoki/kreator-usluga.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Test (unit): `src/kreator/stan.test.js`
- [x] Test: [Unit] `nowySzkic` dla `mieszkanie_po_remoncie` daje wycenę `szkic` z regułą brudu pył budowlany poziom 2 stosowaną do nowego pomieszczenia
- [x] Test: [Unit] `przelicz` dla 4 pomieszczeń układu 50 m² standard w mazowieckim daje migawkę z ceną 250, medianą 250 i widełkami 120–450
- [x] Test: [Unit] `bledyKroku('zakres')` dla wyceny bez pomieszczeń zwraca błąd; zmiana usługi czyści pomieszczenia
- [x] Test: [Unit] `zmienWejscie` na wycenie wykonanej rzuca `BladWyceny` z kodem `tylko_odczyt`
- [ ] Weryfikacja: `node --test src/kreator/stan.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-15: Krok zakresu: pomieszczenia i brud (feature-builder-fullstack)

- [x] Stwórz: `src/kreator/pomieszczenia.js`
- [x] Stwórz: `src/widoki/kreator-pomieszczenia.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Test (unit): `src/kreator/pomieszczenia.test.js`
- [x] Test: [Unit] dodanie kuchni i łazienki do wyceny po remoncie ustawia kurz 1 i pył budowlany poziom 2 w obu; nazwa łazienki „Łazienka”
- [x] Test: [Unit] `ustawMetraz` z 0 i 1500 zwraca kod błędu, z 12,5 zapisuje 12,5
- [x] Test: [Unit] `podsumowanieZakresu` dla układu 50 m² standard daje 50 m² i minuty ze scenariusza kalibracji
- [ ] Weryfikacja: `node --test src/kreator/pomieszczenia.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-16: Kroki zakresu z pozycjami i dodatków z dojazdem (feature-builder-fullstack)

- [x] Stwórz: `src/kreator/pozycje.js`
- [x] Stwórz: `src/widoki/kreator-pozycje.js`
- [x] Stwórz: `src/widoki/kreator-dodatki.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Test (unit): `src/kreator/pozycje.test.js`
- [x] Test: [Unit] `ustawIlosc` dla okna z 2,5 szt. zwraca błąd, z 4 zapisuje 4; `infoProgu` dla kostki 40 m² daje mnożnik 1,15, a dla 100 m² null
- [x] Test: [Unit] `ustawPowierzchnie(40)` z włączonymi myciem i mchem daje obu pozycjom 40 m²; wyłączenie jedynej pozycji głównej zwraca błąd
- [x] Test: [Unit] `infoDojazdu(12, domyślne stawki)` daje 4 zł dla klienta (2 km ponad 10 km) i 27,60 zł kosztu (24 km × 1,15 zł); `infoDojazdu(8)` — 0 zł dla klienta
- [x] Test: [Unit] `ustawDodatek` z trybem `propozycja` zapisuje dodatek poza ceną; ilość 0 usuwa dodatek
- [ ] Test: [E2E] `kreator-okna-minimum` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/kreator/usluga, wybierz „Mycie okien”, „Dalej”, ustaw „Okno 1-skrzydłowe” na 4, „Dalej”, „Dalej”, „Dalej” → podsumowanie z ceną 150 zł i informacją o minimum zlecenia
- [ ] Weryfikacja: `node --test src/kreator/pozycje.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-17: Dobór chemii: krok kreatora i katalog (feature-builder-fullstack)

- [x] Stwórz: `src/silnik/chemia.js`
- [x] Stwórz: `src/widoki/karta-produktu.js`
- [x] Stwórz: `src/widoki/dobor-chemii.js`
- [x] Stwórz: `src/widoki/katalog-chemii.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Test (unit): `src/silnik/chemia.test.js`
- [x] Test: [Unit] mieszkanie po remoncie daje kategorie uniwersalny (kurz) i poremontowy (pył budowlany); sierść poziom 1 nie dubluje kategorii uniwersalnej
- [x] Test: [Unit] sprzątanie hal z zamiataniem daje notkę „zamiatanie na sucho” bez kategorii; doczyszczanie z usuwaniem farby — notkę o zmywaczu farb
- [x] Test: [Unit] dezynfekcja jest w `kategorieDoRecznegoDodania`, a nie w `kategorieDlaWyceny`; produkt Buzil bez pH daje „pH: brak danych”
- [ ] Test: [E2E] `dobor-chemii-po-remoncie` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, utwórz dokładną wycenę „Mieszkanie lub dom – sprzątanie po remoncie” z pokojem 20 m², przejdź do kroku „Chemia”, zrób screenshot, kliknij pierwszą „Karta SDS” → widać kategorię środków poremontowych z produktami, link SDS otwiera nową kartę z adresem z `data/chemia.json`
- [ ] Weryfikacja: `node --test src/silnik/chemia.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-18: Podsumowanie wyceny i zapisana wycena (feature-builder-fullstack)

- [x] Stwórz: `src/kreator/podsumowanie.js`
- [x] Stwórz: `src/widoki/podsumowanie.js`
- [x] Stwórz: `src/widoki/podsumowanie-karty.js`
- [x] Modyfikuj: `src/widoki/indeks.js`
- [x] Test (unit): `src/kreator/podsumowanie.test.js`
- [x] Test: [Unit] wycena 250 zł, ręczna cena 290 zł: `polozenie: 'w'`, procent „+16%”, `zostaje` rośnie o 40 zł, czas bez zmian
- [x] Test: [Unit] czynny VAT przy mieszkaniu: brutto 250, netto 203,25, `zostaje` liczone od netto
- [x] Test: [Unit] migawka z `wersjaDanych` starszą niż katalog daje ostrzeżenie „Dane rynkowe zmieniły się…”; cena dokładna 380 zł przy szybkiej 250–300 zł daje ostrzeżenie o widełkach
- [x] Test: [Unit] abonament 1× w tygodniu: `abonament` z kwotą miesięczną i liczbą wizyt 4,33
- [ ] Test: [E2E] `dokladna-wycena-mieszkania` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/kreator/usluga, wybierz „Mieszkanie lub dom – sprzątanie standardowe”, „Dalej”, dodaj pokój 32, przedpokój 6, kuchnię 8 i łazienkę 4 m², przejdź „Dalej” przez dodatki i chemię, zrób screenshot podsumowania, kliknij „Zapisz”, w arkuszu wpisz klienta „Pani Test” i potwierdź „Zapisz” → cena 250 zł „w widełkach rynku”, „rynek od 120 zł do 450 zł”, karta „Zostaje dla Ciebie” z tempem 1,3×, po zapisie adres `#/wycena/<id>` i numer „1/<miesiąc>/<rok>” w podtytule
- [ ] Test: [E2E] `podsumowanie-cena-reczna` — w zapisanej wycenie z poprzedniego scenariusza kliknij „Zmień”, wpisz 290 → kwota 290 zł, „Twoja cena 290 (+16%)”, kwota „Zostaje dla Ciebie” większa o 40 zł, „Przywróć cenę z modelu” wraca do 250 zł
- [ ] Weryfikacja: `node --test src/kreator/podsumowanie.test.js` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Operator checklist faza 4

- [ ] Operator: Właściciel przechodzi dokładną wycenę mieszkania na telefonie i porównuje podsumowanie z makietą `podsumowanie-wyceny` (IU-18)
- [ ] Operator: Właściciel potwierdza założenia: aneks 10% metrażu (4–8 m²) i koszt dojazdu tam i z powrotem (IU-18)

## Faza 5 — Zlecenia, szybka wycena i pytania do klienta

Zależy od: Faza 4

### IU-19: Zakończenie zlecenia i plan a fakt (feature-builder-fullstack)

- [ ] Stwórz: `src/kreator/zakonczenie.js`
- [ ] Stwórz: `src/widoki/zakonczenie.js`
- [ ] Modyfikuj: `src/widoki/podsumowanie.js`
- [ ] Modyfikuj: `src/widoki/ustawienia-tempo.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Stwórz: `e2e/stany/zlecenie-przyjete.json`
- [ ] Test (unit): `src/kreator/zakonczenie.test.js`
- [ ] Test: [Unit] `poprawnyCzas(330)` → null; `poprawnyCzas(0)` i `poprawnyCzas(1500)` → kod błędu; `czasStartowy` dla planu 266 min → 270
- [ ] Test: [Unit] wycena 230,82 min normy, tempo planu 1,3, fakt 330 min: plan 300 min, różnica +10%, stosunek 1,43
- [ ] Test: [Unit] fakt 800 min dla normy 230,82 daje flagę poza granicami; `infoTempa` po pierwszym wpisie daje „1 z 3”
- [ ] Test: [E2E] `zakonczenie-zlecenia` — okno 360×800, wstrzyknij `e2e/stany/zlecenie-przyjete.json`, otwórz zapisaną wycenę z listy „Wyceny”, kliknij „Wpisz czas pracy”, ustaw licznikiem 5 h 30 min, zrób screenshot, kliknij „Zapisz”, wejdź w „Firma” → przed zapisem karta „Plan i fakt” z planem 5 h 0 min, faktem 5 h 30 min i zdaniem „Praca trwała 30 min dłużej niż plan (+10%).”, karta tempa z „Własne tempo policzymy po 3 zleceniach (1 z 3).”; po zapisie wycena ma status „Wykonana”, w ustawieniach lista „Plan a fakt” ma jeden wiersz
- [ ] Weryfikacja: `node --test src/kreator/zakonczenie.test.js` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-20: Silnik szybkiej wyceny i pytań do klienta (feature-builder-data)

- [ ] Stwórz: `src/silnik/szybka.js`
- [ ] Stwórz: `src/silnik/pytania.js`
- [ ] Modyfikuj: `data/ceny.json`
- [ ] Modyfikuj: `sw.js`
- [ ] Test (unit): `src/silnik/szybka.test.js`
- [ ] Test (unit): `src/silnik/pytania.test.js`
- [ ] Test: [Unit] mieszkanie 50 m² standard, mazowieckie, typowy: widełki 250–300 zł, `mediana` 250, rynek 120–450; mocny: 290–360 zł; lekki: „ok. 250 zł”
- [ ] Test: [Unit] dolna granica typowego dla 50 m² równa się cenie dokładnej wyceny układu 50 m² ze scenariusza kalibracji (R14, R27)
- [ ] Test: [Unit] mieszkanie 20 m² standard: obie granice ≥ 150 zł (minimum); dojazd 32 km dokłada 44 zł na obu końcach
- [ ] Test: [Unit] okna 4 × okno 1-skrz.: 150 zł (minimum) — `tryb: 'ok'`; tapicerka kanapa 3-os. i fotel: widełki od ceny do ceny × 1,2
- [ ] Test: [Unit] mieszkanie po remoncie 60 m²: `tryb: 'od'` i `od` = cena poziomu 1 z pyłem budowlanym, zaokrąglona w dół do 10 zł
- [ ] Test: [Unit] tekst: „Sprzątanie mieszkania 50 m², standard: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.”
- [ ] Test: [Unit] `naDokladna` dla mocnego stanu daje 4 pomieszczenia układu 50 m² z kurzem poziom 2 i te same odpowiedzi
- [ ] Test: [Unit] odpowiedź „tak” na pytanie o zwierzęta ze skutkiem sierść poziom 2 na `*` dodaje sierść do wszystkich pomieszczeń; odpowiedź 32 na pytanie z `dojazd_km` ustawia `dojazdKm` 32
- [ ] Test: [Unit] `sprawdzPytania` na prawdziwym `data/pytania.json` zwraca pustą listę; plik z nieznanym brudem `blotko` zwraca błąd
- [ ] Weryfikacja: `node --test src/silnik/szybka.test.js src/silnik/pytania.test.js` przechodzi
- [ ] Weryfikacja: `bash -c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1"` wypisuje „niezgodności katalogu: 0”
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-21: Ekrany szybkiej wyceny i pytań do klienta (feature-builder-fullstack)

- [ ] Stwórz: `src/widoki/szybka.js`
- [ ] Stwórz: `src/widoki/szybka-wynik.js`
- [ ] Stwórz: `src/widoki/pytania.js`
- [ ] Modyfikuj: `src/kreator/stan.js`
- [ ] Modyfikuj: `src/widoki/kreator-usluga.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Modyfikuj: `src/kreator/stan.test.js`
- [ ] Test: [Unit] `zSzybkiej` zostawia `id` i numer, ustawia `rodzaj: 'dokladna'`, pomieszczenia z układu i pole `szybka` z widełkami
- [ ] Test: [E2E] `szybka-wycena-mieszkania` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/szybka, wybierz „Mieszkanie lub dom”, „Standard”, metraż 50, stan „Typowy”, zrób screenshot, kliknij „Kopiuj tekst”, potem „Dokładna wycena” → widełki „250–300 zł”, „Mediana w mazowieckim: 250 zł”, „Rynek: 120–450 zł”, cytat „Sprzątanie mieszkania 50 m², standard: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.”, „Skopiowano”, kreator otwiera krok pomieszczeń z czterema pomieszczeniami (pokój 32, przedpokój 6, kuchnia 8, łazienka 4 m²)
- [ ] Test: [E2E] `szybka-wycena-ogledziny` — w `#/szybka` wybierz usługę „Mieszkanie lub dom – sprzątanie po remoncie”, metraż 60 → „Orientacyjnie od {x} zł” i zalecenie oględzin, bez widełek
- [ ] Test: [E2E] `pytania-do-klienta-skutek` — w `#/szybka` dla mieszkania 50 m² kliknij „Pytania do klienta · 0 z {n}”, przy pytaniu o zwierzęta „+ Dodaj odpowiedź” → „tak”, przy pytaniu o dojazd wpisz 32, kliknij „Gotowe” → na ekranie pytań pigułki skutków (sierść, „dojazd: 44 zł dla klienta”), po powrocie licznik „2 z {n}” i widełki wyższe o dojazd 44 zł i sierść
- [ ] Weryfikacja: `node --test src/kreator/stan.test.js` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

## Operator checklist faza 5

- [ ] Operator: Właściciel wpisuje czas po prawdziwym zleceniu i porównuje ekran z makietą `zakonczenie-zlecenia` (IU-19)
- [ ] Operator: Właściciel robi szybką wycenę mieszkania w trakcie symulowanej rozmowy i mierzy czas (cel źródła: poniżej minuty) (IU-21)
- [ ] [Manual] „Kopiuj tekst” na iPhonie w Safari i w aplikacji z ekranu początkowego (IU-21)

## Faza 6 — Oferta dla klienta

Zależy od: Faza 5

### IU-22: Treść oferty, kodowanie linku i nadpisania zakresu i warunków (feature-builder-data)

- [ ] Stwórz: `src/oferta/tresc.js`
- [ ] Stwórz: `src/oferta/kodek.js`
- [ ] Modyfikuj: `src/dane/ustawienia.js`
- [ ] Modyfikuj: `src/dane/wyceny.js`
- [ ] Modyfikuj: `sw.js`
- [ ] Test (unit): `src/oferta/tresc.test.js`
- [ ] Test (unit): `src/oferta/kodek.test.js`
- [ ] Test: [Unit] oferta z wyceny mieszkania z ręczną ceną 290 zł i dojazdem 4 zł: `uslugi[0].kwota` 290, `dojazd` 4, `razem` 294 (od = do)
- [ ] Test: [Unit] `JSON.stringify(oferta)` nie zawiera kluczy `zostaje`, `tempo`, `koszt`, `minuty`, `chemia` ani `sprzet` (R21)
- [ ] Test: [Unit] zakres z wyceny wygrywa z ustawieniami, a ustawień z `data/zakresy.json`; warunek `stan_lokalu` jest tylko w ofercie z szybkiej wyceny
- [ ] Test: [Unit] ważność: oferta z 24.10.2026 jest ważna 7.11.2026 i nieważna 8.11.2026
- [ ] Test: [Unit] `zakodujOferte` → `odkodujOferte` zwraca tę samą ofertę; typowa oferta (fixture z 8 liniami zakresu i 4 warunkami) ma link krótszy niż 2000 znaków
- [ ] Test: [Unit] fragment obcięty o 10 znaków, `v9.…` i JSON z kluczem spoza schematu albo tekstem 600 znaków dają `ok: false` z powodem `uszkodzony`, `wersja`, `uszkodzony`
- [ ] Test: [Unit] `sprawdzZakresy` na prawdziwym `data/zakresy.json` zwraca pustą listę
- [ ] Test: [Unit] `oznaczWyslana` zmienia status z `do_wyslania` na `wyslana` i kasuje `nieaktualna`
- [ ] Weryfikacja: `node --test src/oferta/tresc.test.js src/oferta/kodek.test.js` przechodzi
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów

### IU-23: Edycja oferty oraz zakres prac i warunki w ustawieniach (feature-builder-ui)

- [ ] Stwórz: `src/widoki/oferta-edycja.js`
- [ ] Stwórz: `src/widoki/oferta-edycja-sekcje.js`
- [ ] Stwórz: `src/widoki/edytor-listy.js`
- [ ] Stwórz: `src/widoki/ustawienia-oferta.js`
- [ ] Modyfikuj: `src/widoki/ustawienia.js`
- [ ] Modyfikuj: `src/widoki/podsumowanie.js`
- [ ] Modyfikuj: `src/widoki/indeks.js`
- [ ] Test: [E2E] `oferta-link` — okno 360×800, wstrzyknij `e2e/stany/wyceny-do-zrobienia.json`, otwórz wycenę „Do wysłania”, kliknij „Przygotuj ofertę”, wpisz klienta „Marzena Wróbel”, w „Zakres prac” kliknij „Edytuj” i usuń jeden punkt „W cenie”, kliknij „Kopiuj link”, odczytaj link przez `agent-browser eval "navigator.clipboard.readText()"` i otwórz go w nowej karcie → „Link skopiowany”, status wyceny „Wysłana”, oferta pokazuje „Marzena Wróbel”, nazwę firmy, kwotę i zakres bez usuniętego punktu, a tekst strony nie zawiera „Zostaje”, „tempo” ani „Koszt zlecenia”
- [ ] Test: [E2E] `oferta-brak-danych-firmy` — wyczyść localStorage, pomiń kreator, utwórz i zapisz wycenę okien, kliknij „Przygotuj ofertę” → baner „Uzupełnij nazwę firmy i telefon…”, „Kopiuj link” nieaktywny
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [ ] Weryfikacja: `npm test` przechodzi

### IU-24: Strona oferty dla klienta i wydruk A4 (feature-builder-ui)

- [ ] Stwórz: `oferta.html`
- [ ] Stwórz: `src/oferta-start.js`
- [ ] Stwórz: `src/widoki/oferta-klient.js`
- [ ] Stwórz: `src/style/oferta.css`
- [ ] Stwórz: `src/style/druk.css`
- [ ] Modyfikuj: `sw.js`
- [ ] Stwórz: `e2e/stany/oferta-po-terminie.txt`
- [ ] Test: [E2E] `oferta-po-terminie` — otwórz http://localhost:5174/oferta.html# z treścią `e2e/stany/oferta-po-terminie.txt`, zrób screenshot → baner „Oferta była ważna do 1 października 2026…” nad dokumentem z danymi firmy i kwotą
- [ ] Test: [E2E] `oferta-uszkodzony-link` — otwórz http://localhost:5174/oferta.html#v1.zepsute → tylko komunikat „Ten link do oferty jest niepełny albo uszkodzony…”, konsola bez nieobsłużonych błędów, `localStorage.length` w eval równe 0
- [ ] Weryfikacja: `npm run typecheck` przechodzi bez błędów
- [ ] Weryfikacja: `npm test` przechodzi
- [ ] Weryfikacja: `grep -n "localStorage\|serviceWorker" src/oferta-start.js src/widoki/oferta-klient.js` nie zwraca wyników

## Operator checklist faza 6

- [ ] Operator: Właściciel przygotowuje ofertę z prawdziwej wyceny, wysyła link do siebie przez SMS i komunikator i otwiera go na drugim telefonie (IU-23)
- [ ] Operator: Właściciel porównuje ofertę na telefonie i wydruk z makietą `oferta-klient` i zatwierdza brzmienie warunków (IU-24)
- [ ] [Manual] „Pobierz PDF” na Androidzie (Chrome) i iPhonie (Safari) zapisuje jedną stronę A4 bez przycisków (IU-24)
- [ ] [Manual] link otwarty w przeglądarce wbudowanej Messengera i WhatsAppa (IU-24)
