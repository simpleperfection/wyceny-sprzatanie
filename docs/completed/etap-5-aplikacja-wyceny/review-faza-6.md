# Review fazy 6 — Oferta dla klienta

Gate: **BLOKUJE** (P1: 1, P2: 13, P3: 8, OPERATOR: 3). E2E: 4 PASS / 0 FAIL / 0 SKIP.

## Findingi P1

### P1 · KOD · `src/oferta/tresc.js:212`

Fixture'y opisują pole klient.termin inaczej niż jego źródło, więc zestaw zostaje zielony mimo błędu w ofercie. Pole datetime-local (src/widoki/oferta-edycja-sekcje.js:198, :205) zapisuje 'RRRR-MM-DDTHH:mm', a src/widoki/start-dane.js:30-31 opisuje termin jako 'RRRR-MM-DD' z opcjonalną godziną; testy i fixture (src/oferta/tresc.test.js:40, tests/fixtures/oferta-typowa.json:7, oferta-klient.test.js:87) używają gotowego tekstu '14 listopada, 9:00'. ofertaZWyceny (tresc.js:212) i tekstDla (src/widoki/oferta-klient.js:54) przekazują termin bez formatowania, więc klient dostanie 'termin: 2026-11-14T09:00'. Poprawka: formatować termin po polsku w tresc.js albo oferta-klient.js; w fixture'ach wpisać '2026-11-14T09:00' i sprawdzać dosłownie 'ul. Przykładowa 1, 00-001 Warszawa · termin: 14 listopada 2026, 9:00' (albo inne zatwierdzone brzmienie).

## Findingi P2

### P2 · KOD · `src/dane/ksztalt.js:46`

Kształt zakresu i warunku oferty jest w trzech miejscach: strażniki liczą klucze magicznymi liczbami (`length === 2` w jestZakresemOferty, `=== 3` w jestWarunkamiOferty, :55), nazwy pól są w POLA_ZAKRESU/POLA_WARUNKU (src/dane/ustawienia.js:52-53) i KLUCZE.zakres (src/oferta/kodek.js:34). Dopisanie pola w jednym miejscu rozjedzie zapis ustawień ze strażnikiem stanu i kopii (jestOferta w wyceny.js). Zmiana: wyeksportować POLA_ZAKRESU i POLA_WARUNKU z ksztalt.js, przenieść tam maKlucze z kodek.js:46 i użyć w strażnikach; ustawienia.js i kodek.js importują stałe.

### P2 · TEST · `src/dane/ustawienia.test.js:248`

Bramki walidacji warunków i zakresów w src/dane/ustawienia.js bez testów odmowy: warunkiZeZmiany – nie-tablica (:135), 51 warunków → 'za_duzo' (:136), obcy klucz (:138), id 'Zaliczka!' → 'wartosc' z polem 'warunki.0.id' (:139), tylko_szybka: 'tak' → 'wartosc' 'warunki.0.tylko_szybka' (:140); sprawdzUstawienia – zakresy nie-obiekt albo klucz 'Okna' → 'wartosc'/'zakresy' (:91). Poprawka: assert.throws z bladUstawien(kod, pole) dla każdego wejścia i sprawdzenie, że ustawienia(magazyn).warunki zostają bez zmian.

### P2 · TEST · `src/dane/wyceny.test.js:464`

Dwie bramki z src/dane/wyceny.js bez testu odmowy: (1) tylkoDoOdczytu w zapiszOferte (:355) – test: wycena przyjęta z dodajWykonanie, assert.throws(() => zapiszOferte(magazyn, wykonana, { waznaDo: '2026-11-30' }), bladWyceny('tylko_odczyt')); (2) zaostrzony strażnik jestOferta (:309-310) – asercje modulWycen.jestWycena(...) === false dla waznaDo '7.11.2026', wyslana 'wczoraj' i zakresu z punktem 501 znaków.

### P2 · KOD · `src/oferta/kodek.js:24`

Dekoder linku ma własne kopie kontraktów: STATUSY_VAT powiela listę z src/silnik/vat.js:9 (jestStatusemVat w src/dane/magazyn.js:58 to „jedno zrodlo”), MAKS_STAWKI_VAT = 100 (:25) powiela PROCENT z vat.js, KLUCZE.firma (:29) powiela POLA_FIRMY z src/dane/ksztalt.js:5. Nowy status VAT albo pole firmy sprawi, że strona oferty odrzuci link jako „uszkodzony”, a typechecker tego nie zauważy. Zmiana: jestStatusemVat w jestCzescia, eksport granicy stawki z vat.js, `firma: POLA_FIRMY`.

### P2 · TEST · `src/oferta/kodek.test.js:103`

Warunki jestCzescia i odkodujOferte bez testów odmowy: vat.status spoza listy (:68), stawka > 100 (:68), ujemne netto/kwotaVat (:69), pusty punkt zakresu (:70), pole firmy > 500 znaków (:65), klient.termin liczba (:66), szybka nie-boolean (:81), limit MAKS_DLUGOSC_FRAGMENTU 20 000 (:165). Poprawka: dopisać przypadki do testu 'zła kwota, zła data…' z asercją { ok: false, powod: 'uszkodzony' } oraz odkodujOferte('v1.' + 'A'.repeat(20_001)).

### P2 · KOD · `src/oferta/tresc.js:32`

JEDNOSTKI i FORMAT_LICZBY powielają NAZWY_JEDNOSTEK i formatM2 z src/ui/format.js:11, :18 i już się rozjechały: wpis `mb` nie istnieje w format.js ani w data/ceny.json, brak `useGrouping: 'always'` (oferta „1200 m²”, aplikacja „1 200 m²”). Zmiana: mapa jednostek i format metrażu w module bez zależności od UI (np. src/dane/ksztalt.js), użyte w tresc.js i format.js, bez `mb`.

### P2 · KOD · `src/oferta/tresc.js:109`

Zakres z ustawień usługi przykrywa zakres wariantu z data/zakresy.json (`w.oferta.zakres ?? ustawienia.zakresy[uslugaId] ?? wariant ?? domyslny`), a edytor ustawień (src/widoki/ustawienia-oferta.js:62) pokazuje zakres bazowy bez wariantu. Po edycji „Sprzątanie biur” w ustawieniach oferta jednorazowego sprzątania biura pokazuje zakres abonamentu, wbrew R19. Poprawka: nadpisania kluczowane `uslugaId.wariantId` (osobny wiersz w edytorze) albo wariant przed ustawieniami usługi w zakresOferty.

### P2 · KOD · `src/oferta/tresc.js:164`

Szybka wycena w trybie „od” (oględziny) albo „ok.” trafia do oferty jako cena sztywna: silnik zwraca od === do (src/silnik/szybka.js:168-169), kwotyRazem liczy netto i VAT, typ Oferta nie ma trybu. Klient widzi „Razem do zapłaty 1 200 zł” i VAT zamiast „od 1200 zł”. Poprawka: przenieść tryb (`razem.tryb: 'widelki'|'ok'|'od'`) przez schemat kodeka i pokazać „od X zł”/„ok. X zł” w oferta-klient.js, albo dla 'od' netto/VAT = null i ukryć kwoty wierszy.

### P2 · KOD · `src/oferta/tresc.js:169`

Oferta abonamentu (sprzatanie_biur, abonament_1…abonament_5, wizyt_w_miesiacu > 1) pokazuje kwotę za jedną wizytę jako „Razem do zapłaty” bez dopisku „za wizytę” i kwoty miesięcznej (podsumowanie-karty.js:57, :70 pokazuje obie). Poprawka: gdy czyAbonament(m), dodać `abonament: { wizyt, miesiecznie } | null` z walidacją w kodeku i pokazać „za wizytę” oraz „miesięcznie (N wizyt): …”.

### P2 · TEST · `src/oferta/tresc.test.js:60`

Dwie gałęzie tresc.js bez testu: (1) linieOferty :184 – reszta < 0 łączy dodatki z usługą; test: dodatek 'Okno' 100 zł, cenaReczna 50, dojazd 4 → uslugi = [{ opis: 'Mieszkanie – sprzątanie standardowe, 50 m²', kwota: 46 }], dojazd 4; (2) kwotyRazem :166 – szybka z od === do (netto i VAT z zCenyRecznej) i szybka bez w.szybka; test: szybka { od: 294, do: 294 }, status czynny, vat.netto/kwotaVat = zCenyRecznej(294, 'czynny', 23), nie null.

### P2 · KOD · `src/widoki/oferta-edycja.js:34`

Reguła „z jakich statusów przygotowuje się ofertę” (STATUSY_OFERTY, czyStatusOferty) jest w widoku, a warstwa danych ma luźniejszą (wymagajZapisanej w src/dane/wyceny.js przyjmuje też `odrzucona`); src/widoki/podsumowanie.js:19 importuje ją z całego ekranu oferty (kodek, treść, schowek). Zmiana: przenieść do src/dane/wyceny.js obok STATUSY_WYCENY, w wymagajZapisanej rzucać BladWyceny('przejscie') poza listą, importy z dane/wyceny.js.

### P2 · KOD · `src/widoki/oferta-edycja.js:53`

czyDaneFirmy na sztywno wymaga nazwy i telefonu, powielając POLA_WYMAGANE_W_OFERCIE (src/dane/ustawienia.js:47), używane przez brakujeUstawien (:322) i formularz ustawień (ustawienia-formularz.js:49). Zmiana: `export const czyDaneFirmy = (oferta) => POLA_WYMAGANE_W_OFERCIE.every((pole) => oferta.firma[pole].trim() !== '')` z importem z ../dane/ustawienia.js.

### P2 · KOD · `src/widoki/oferta-edycja.js:262`

Kolejność źródeł warunków (oferta → ustawienia → domyślne) i reguła R20 (tylko_szybka) mają kopie poza src/oferta/tresc.js:118-119: tutaj, w widoczneWarunki (src/widoki/oferta-edycja-sekcje.js:108) i w src/widoki/ustawienia-oferta.js:92. oferta-edycja-sekcje.js miesza też karty DOM, regułę domeny i wczytywanie z pamięcią modułu. Zmiana: wyeksportować z tresc.js `warunkiZrodlowe(wycena, ustawienia, domyslne)`, `widoczneWarunki(warunki, szybka)` i `warunkiPoEdycji`, oprzeć na nich warunkiOferty, widoki importują.

## Findingi P3

### P3 · KOD · `src/widoki/oferta-edycja.js:165`

Jedna zmiana oferty czyta i parsuje cały stan z localStorage 4 razy (odswiezStan :172, przygotujLink/aktualnyLink :146, .then :155, odswiezPrzywrocenie → pobierz :256) i liczy ofertaZWyceny od nowa; koszt rośnie z liczbą wycen. Zmiana: w `zapisz` zachować wynik zapiszOferte i policzyć raz `ostatnia` z numerem `wersja`; biezaca() zwraca ją, wczytajStan tylko przy pierwszym rysowaniu i w oznacz().

### P3 · KOD · `oferta.html:17`

Strona oferty ładuje moduły kaskadą 4 sekwencyjnych żądań (ok. 0,9 s przy RTT 300 ms). Zmiana: `<link rel="modulepreload">` w `<head>` dla 9 modułów grafu (src/oferta/kodek.js, src/oferta/tresc.js, src/widoki/oferta-klient.js, src/dane/ksztalt.js, src/silnik/bledy.js, src/silnik/vat.js, src/ui/format.js, src/ui/h.js, src/ui/ikony.js).

### P3 · KOD · `src/widoki/oferta-edycja-sekcje.js:34`

MS_DNIA i dzienUtc (:92) to druga implementacja dni kalendarzowych obok dniKalendarzowe (src/dane/kopia.js:21, :209). Zmiana: przenieść dniKalendarzowe do src/dane/ksztalt.js i użyć w tekstWaznosci, usunąć MS_DNIA i dzienUtc.

### P3 · KOD · `src/widoki/oferta-klient.js:32`

Format widełek „od–do zł” ma trzy implementacje (slice po WALUTA tutaj, replace w tekstKwoty oferta-edycja-sekcje.js:105, KWOTA.format w szybka-wynik.js:26). Zmiana: `zlOdDo(od, doKwoty, { grosze })` w src/ui/format.js i użycie zamiast slice.

### P3 · KOD · `src/oferta/tresc.js:60`

`jestZakresami` to martwy eksport (używa go tylko wczytajZakresy w tym pliku). Zmiana: usunąć `export`.

### P3 · KOD · `src/oferta/tresc.js:211`

waznaDo zapisane przy pierwszym wysłaniu (oferta-edycja.js:180) jest używane bez sprawdzenia względem dnia wystawienia: ponownie wysłana po zmianie oferta od razu pokazuje „Oferta była ważna do…”. Poprawka: użyć w.oferta.waznaDo tylko gdy >= dzienLokalny(dzis), inaczej poDniach(dzis, domyslne.oferta.waznosc_dni).

### P3 · KOD · `src/widoki/oferta-edycja.js:240`

„PDF” woła window.open po `await aktualnyLink()`, poza obsługą kliknięcia, i bezwarunkowo oznacz(); na iOS Safari karta się nie otwiera, a wycena przechodzi na „Wysłana”. Poprawka: synchroniczne window.open('about:blank') przed await, potem location.href; oznacz() tylko gdy okno !== null, inaczej baner z prośbą o ponowne kliknięcie.

### P3 · KOD · `src/oferta/kodek.js:189`

Koder nie sprawdza limitów dekodera (MAKS_DLUGOSC_FRAGMENTU 20000, MAKS_BAJTOW_JSON 128 KiB): długi zakres daje link, który klient widzi jako uszkodzony. Poprawka: `new BladKodeka('dlugosc')` w linkOferty/zakodujOferte i obsługa w oferta-edycja.js banerem BLAD_LINKU.

## Findingi OPERATOR

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/oferta-edycja-actual.png`

oferta-edycja: visual review — Operator action: otwórz visual-diff/oferta-edycja-figma.png obok visual-diff/oferta-edycja-actual.png (viewport 768×2719); trasa #/wycena/e2e-wycena-do-wyslania/oferta ze stanem e2e/stany/wyceny-do-zrobienia.json; sprawdź karty Twoja firma, Klient i termin, Zakres prac, Warunki, Oferta ważna do i stopkę PDF/Kopiuj link (karty Dodatki brak, bo wycena nie ma propozycji; makieta ma kolory spoza tokenów wariantu B).

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/oferta-klient-actual.png`

oferta-klient: visual review — Operator action: otwórz visual-diff/oferta-klient-figma.png obok visual-diff/oferta-klient-actual.png (viewport 768×2279); zrzut z linku scenariusza oferta-link, bez dojazdu i Możesz dobrać; pełny wariant w docs/active/etap-5-aplikacja-wyceny/oferta-po-terminie.png.

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/ustawienia-firmy-actual.png`

ustawienia-firmy: visual review — Operator action: otwórz visual-diff/ustawienia-firmy-figma.png obok visual-diff/ustawienia-firmy-actual.png (viewport 768×2579); trasa #/ustawienia; w tej fazie doszły sekcje Zakres prac i Warunki oferty.

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 8
- [E2E] odznaczone na podstawie przebiegow testera: 4
- [E2E] przeniesione w trakcie runu na [Manual]: 0 (lista: brak)
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [x] CLI: IU-22: `node --test src/oferta/tresc.test.js src/oferta/kodek.test.js` przechodzi -> PASS (komenda: `node --test src/oferta/tresc.test.js src/oferta/kodek.test.js`)
- [x] CLI: IU-22: `npm test` przechodzi -> PASS (komenda: `npm test`)
- [x] CLI: IU-22: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] CLI: IU-23: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] CLI: IU-23: `npm test` przechodzi -> PASS (komenda: `npm test`)
- [x] CLI: IU-24: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] CLI: IU-24: `npm test` przechodzi -> PASS (komenda: `npm test`)
- [x] CLI: IU-24: grep localStorage/serviceWorker w src/oferta-start.js i src/widoki/oferta-klient.js nie zwraca wyników -> PASS (komenda: `grep -n "localStorage\`)
- Skrypt ksieguj: odznaczone 4, fail 0, skip 0, manual 0, bezWpisu 0.

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 31 (24) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 4 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 4 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 27 -> 27 -> 25 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 14 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 3 / 4 / 13 (batchowanie: 13 findingow w 4 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 16 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
