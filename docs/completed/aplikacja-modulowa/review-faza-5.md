# Review fazy 5 — Zlecenia i kalendarz

Data: 2026-11-04. Gate: **BLOKUJE**. Statystyki: P1 4, P2 20, P3 13, OPERATOR 0. E2E: 8 PASS, 0 FAIL, 0 SKIP.

## Findingi P1

### P1 · TEST · `src/zlecenia/wizyta-dane.test.js:161`

Pigułka „Niezapłacone” ma test tylko na zleceniu z jedną wizytą, więc warunek wyboru wizyty w pigulkiWizyty (src/zlecenia/wizyta-dane.js:85) nie jest sprawdzony. Na kopii repo przeżyły dwie mutacje: usunięcie `&& n.klucz === w.dataPierwotna` i usunięcie `n.zlecenieId === z.id &&`. Po każdej z nich opłacona wizyta serii dostaje pigułkę „Niezapłacone”, gdy inna wizyta klienta czeka na zapłatę, a zestaw zostaje zielony. To ścieżka płatności z tej fazy (R16). Poprawka: seria z dwiema zrobionymi wizytami, DZIS opłacona, 2026-11-09 nieopłacona; `model(magazyn, DZIS, '2026-11-09').pigulki` ma równać się ['zrobiona', 'zaplacona'], a model drugiej wizyty ['zrobiona', 'niezaplacona']. Drugi przypadek: drugie zlecenie tego samego klienta z niezapłaconą wizytą tego samego dnia nie zmienia pigułek pierwszego. (Usunięcie `n.rodzaj === 'wizyta'` też przeżywa, ale to mutant równoważny: klucz miesiąca RRRR-MM nigdy nie równa się dacie wizyty.) (źródło: test-coverage)

### P1 · TEST · `src/zlecenia/kalendarz-dane.test.js:121`

Żaden test modelDnia nie ma wizyty opłaconej i niezrobionej, choć plan pozwala oznaczyć zapłatę przed dniem wizyty. Na kopii przeżyła mutacja usuwająca `&& (w.stan?.zaplata ?? null) === null` w akcjeWizyty (src/zlecenia/kalendarz-dane.js:73): opłacona wizyta dostaje wtedy znowu przycisk „Zapłacone”, a zestaw zostaje zielony. Dotychczasowe testy tego nie widzą, bo opłacona wizyta Jana od razu wypada z „Do zamknięcia”. Poprawka: `oznaczZaplacona(magazyn, 'e2e-zlecenie-anna', DZIS)` bez „Zrobione”, potem `assert.deepEqual(modelDnia(wczytajStan(magazyn), KATALOG, DZIS, DZIS).wizyty[0].akcje, ['zrobione'])`. (źródło: test-coverage)

### P1 · TEST · `src/zlecenia/karta-dane.test.js:193`

Reguła miesięcy do zapłaty po końcu serii (R26) jest sprawdzona tylko dla jednej zrobionej wizyty. Na kopii przeżyły trzy mutacje. (1) Usunięcie `s.zrobiona !== null` w czyMiesiacZWizyta (src/zlecenia/karta-dane.js:171): wizyta po końcu z samym przesunięciem pokazuje miesiąc do zapłaty, a kwotaMiesiaca rzuca wtedy `brak_wizyty`. (2) Usunięcie `!s.odwolana` tamże: zrobiona i odwołana wizyta po końcu zostawia miesiąc. (3) Zamiana linii 188 na `if (!czyMiesiacZWizyta(z, miesiac)) continue`: zapłacony miesiąc bez wizyty, np. po wcześniejszym końcu serii, znika z listy razem z zapłatą i przyciskiem „Cofnij”. Poprawka: trzy przypadki na `miesieczna({ koniec: '2026-09-28', ... })`. Wizyta 2026-10-05 ze `stanWizyty({ przeniesiona: { data: '2026-10-06', godzina: null } })` daje ['2026-09']. Wizyta 2026-10-05 ze `stanWizyty({ zrobiona: CHWILA, odwolana: true })` daje ['2026-09']. `zaplatyMiesieczne: { '2026-10': zaplata }` bez wizyt daje ['2026-10', '2026-09'], a październik ma tekst zapłaty. (źródło: test-coverage)

### P1 · TEST · `src/zlecenia/formularz.test.js:317`

Test nazywa się „plan z migawki i tempa firmy”, ale stan nie ma tempa firmy, a oczekiwane 1.3 to `DOMYSLNE.tempo`. Na kopii przeżyła mutacja `const tempo = domyslne.tempo` w zapiszFormularz (src/zlecenia/formularz.js:251): zlecenie zapisuje wtedy plan z tempem domyślnym zamiast tempa firmy (ręcznego albo własnego), a z tego planu idą później Plan, Fakt i „Zostaje”. To zapisywana ścieżka danych tej fazy. Poprawka: stan z ręcznym tempem w ustawieniach, tak jak w teście tekstPlanu (`ustawienia: { tempo: { reczne: 1 } }`), i `assert.deepEqual(z.plan, { minutyNormowe: 95, tempo: 1 })`. (źródło: test-coverage)

## Findingi P2

### P2 · TEST · `src/ui/statusy.test.js:61`

Przypięta stała: test przepisuje literał ETYKIETY_FORM_ZAPLATY ze statusy.js, więc sprawdza kopię, a nie zachowanie. Etykieta „Gotówka” nie występuje w żadnym tekście oczekiwanym przez testy modeli; wizyta-dane.test.js pokrywa tylko Przelew i BLIK. Poprawka: zamienić ten test na obserwowalny skutek w wizyta-dane.test.js, np. `oznaczZaplacona(magazyn, 'z1', DZIS, { forma: 'gotowka', ...POLUDNIE })` i `model(magazyn).zaplata.tekst === 'Zapłacone · Gotówka · pn 2 lis'`. (źródło: test-coverage)

### P2 · KOD · `src/widoki/wizyta.js:40`

Stałe tekstowe i opcje są zdefiniowane drugi raz. `BLAD_WIZYTY` i `tekstBleduWizyty` powtarzają się w wizyta.js:40,48 i zlecenia-dzien.js:27,33. 'Wybierz datę.' jest w wizyta.js:42, zlecenie-karta.js:38 i zlecenie-formularz.js:43. 'Wpisz cenę.' i 'Wybierz dni tygodnia.' są w karta-dane.js:44–45 i zlecenie-formularz.js:42,44. `OPCJE_FORM` jest w wizyta.js:45 i zlecenie-karta.js:42. Etykiety cykli są w `ETYKIETY_CYKLI` (formularz.js:51) i wpisane na sztywno w karta-dane.js:89–91, choć ten moduł już importuje z formularz.js. Do tego dwa formularze tych samych pól mają dwa kontrakty błędów: `bledyFormularza` oddaje kody mapowane w widoku, a `bledyZmiany` gotowe teksty. Skutek: każda zmiana treści wymaga poprawek w 2–3 plikach i kopie rozjadą się po cichu. Zmiana: jedno źródło stałych (teksty błędów, `OPCJE_FORM`, wyeksportowane `ETYKIETY_CYKLI`), a `bledyZmiany` przestawić na kody jak `bledyFormularza`. (źródło: code-quality)

### P2 · KOD · `src/widoki/wizyta.js:171`

Szkielet akcji jest powielony w dwóch nowych plikach około 350 linii: `pokazSkutek` i `wykonaj` są identyczne (wizyta.js:143,155 i zlecenie-karta.js:53,65), `ekranBraku` różni się tekstami, a `otworzArkusz` (wizyta.js:171, zlecenie-karta.js:81) już się rozjechał. Wersja z karty ma `<form>` z submit i czyści komunikat przed zapisem. Wersja z wizyty ma `div` z `naKlik`, więc Enter w arkuszu nie zapisuje, a stary baner błędu zostaje po nieudanej walidacji. To nie jest prosta duplikacja kilku linii, tylko ponad 40 linii logiki zapisu, fokusu i błędów. Skutek: każda poprawka tego przepływu wymaga dwóch zmian, a rozjazd już widać w zachowaniu. Zmiana: wydzielić np. src/widoki/ekran-akcji.js z `pokazSkutek`, `wykonaj` i jednym `otworzArkusz` na `<form>`, parametryzowanymi funkcją `rysuj` i tekstem błędu. (źródło: code-quality)

### P2 · TEST · `src/widoki/wizyta.js:221`

Bramki walidacji siedzą w widokach bez testu odmowy, a scenariusze E2E ich nie obejmują. Dolna granica daty przesunięcia (`data >= NAJWCZESNIEJSZA_DATA`) istnieje tylko tutaj, bo przesunWizyte (src/dane/wizyty.js:148) sprawdza samo jestDniem. Usunięcie bramki pozwala zapisać niepełny rok 0026-11-03 przy zielonym zestawie. Podobnie sprawdzenie dnia końca serii w src/widoki/zlecenie-karta.js:189. Poprawka: wydzielić czyste funkcje `bladPrzesuniecia(data)` do wizyta-dane.js i `bladKonca(dzien, start)` do karta-dane.js, wzorem bledyZmiany, z testami odmowy: `''`, `'0026-11-03'` i dzień przed startem dają błąd, poprawny dzień daje null. (źródło: test-coverage)

### P2 · KOD · `src/widoki/zlecenia-miesiac.js:40`

IU-15, częściowa realizacja. Widok Miesiąc nie ma przycisku „Nowe zlecenie”. Zamówienie: `zlecenia-wspolne.js` ma przycisk „Nowe zlecenie” (→ `#/zlecenie/nowe?data=<dzień>`), a pole „Wzorce do naśladowania” wskazuje makiety Dzień, Tydzień i Miesiąc. Makieta `zlecenia-miesiac` (docs/operator/aplikacja-modulowa-makiety.html:751) ma ten przycisk pod siatką. Implementacja woła `przyciskNowegoZlecenia` tylko w widoku Dzień (src/widoki/zlecenia-dzien.js:76), a `zlecenia-miesiac.js:40` przekazuje do `ekranKalendarza` samą siatkę. Użytkownik nie założy zlecenia z widoku Miesiąc. Poprawka: dodać `przyciskNowegoZlecenia(dzien)` pod `siatka(tygodnie)`. Tydzień zostaje bez zmian, bo jego makieta nie ma tego przycisku. (źródło: spec-compliance)

### P2 · TEST · `src/widoki/zlecenie-formularz.js:139`

Ścieżki błędu zapisu dodane w widokach nie mają testu: tekstBledu tutaj oraz tekstBleduWizyty w src/widoki/zlecenia-dzien.js:33 i src/widoki/wizyta.js:48, a także tekstBledu w src/widoki/zlecenie-karta.js:47. Żadne E2E nie wymusza błędu zapisu, więc zamiana mapowania (BladMagazynu pokazany jak BladZlecenia) albo zgubienie ponownego rzucenia obcego błędu zostawia zielony zestaw. Poprawka: przenieść mapowanie do czystej funkcji obok tekstOdmowy w src/zlecenia/formularz.js i dosłownie sprawdzić trzy przypadki: BladZlecenia('cykl') → „Nie udało się zapisać zlecenia. Spróbuj jeszcze raz.”, BladMagazynu → tekst z tekstBleduZapisu, TypeError → rzucony dalej. (źródło: test-coverage)

### P2 · KOD · `src/widoki/zlecenie-formularz.js:229`

Klient wybrany przy „Zaplanuj” nie trafia do wyceny. naWybor zmienia tylko ekran.wartosci, a zaplanujZWyceny (src/dane/zlecenia.js:170) ustawia klientId wyłącznie na zleceniu. Scenariusz: szybka wycena bez klienta (R19 na to pozwala), status przyjęta, „Zaplanuj”, klient wybrany z listy albo przez „Dodaj nowego klienta”, „Zapisz zlecenie”. Wycena zostaje z klientId null i pustą nazwą w ofercie. Od tej chwili jest zamknięta, więc przypiszKlienta rzuca tylko_odczyt (src/dane/wyceny.js:316) i nie da się tego poprawić. Karta klienta pokazuje „Brak wycen.” (historiaWycen filtruje po w.klientId, src/widoki/klienci-dane.js:86), choć ma zlecenie z tej wyceny, co jest niezgodne z R18. Podsumowanie wyceny nie ma nazwy klienta. Zapis z wyceny powinien w tym samym magazyn.zmien ustawić klienta wyceny, gdy jej klientId jest null. Scenariusz wynika z odczytu kodu, nie był uruchamiany. (źródło: correctness)

### P2 · KOD · `src/widoki/zlecenie-karta.js:127`

Komponenty pól są kopiowane między widokami zamiast rozszerzać src/ui/komponenty/formularz.js. `poleDni` jest identyczne w zlecenie-karta.js:127 i zlecenie-formularz.js:93 (różni się tylko id). Pole daty i godziny ma trzy wersje: `poleCzasu` w zlecenie-formularz.js:80, identyczne `poleTerminu` w wizyta.js:126 i wariant w zlecenie-karta.js:115, który po `pole()` podmienia atrybut `type` przez `querySelector('input')?.setAttribute`. `przyciskKroku` (wizyta.js:54) to kopia prywatnego `przyciskLicznika`, a `przelaczDzien` (karta-dane.js:219) powtarza ciało `zDniem` (formularz.js:192). Skutek: poprawka dostępności albo walidacji pola trafi tylko do części ekranów. Zmiana: dodać do `pole()` rodzaje 'data' i 'godzina' z opcją `min`, wyeksportować chipy wielokrotnego wyboru i przycisk licznika, usunąć lokalne kopie. (źródło: code-quality)

### P2 · KOD · `src/zlecenia/formularz.js:262`

Moduł formularza łączy niezależne odpowiedzialności i stał się punktem zależności dla modułów, które formularza nie używają. Ma stan i walidację formularza, zapis (`zapiszFormularz`), teksty odmów, budowę adresu (`adresZaplanowania`), opis wiersza zlecenia pod wyceną (`opisZlecenia`, linia 262) i słowniki cykli. Z tego powodu karta-dane.js:15, opisana jako czyste funkcje bez zapisu, importuje formularz.js dla jednego `czyMaDni`. wizyta.js:18 importuje go dla `NAJWCZESNIEJSZA_DATA`, a lista-wycen.js:12 i podsumowanie.js:19 dla adresu i opisu wiersza. Skutek: moduł ma kilka powodów do zmiany, a zmiana formularza dotyka ekranów Wyceny, wizyty i karty zlecenia. Zmiana: przenieść `czyMaDni`, `BEZ_POWTARZANIA`, opcje i etykiety do np. src/zlecenia/opcje.js, `opisZlecenia` do modelu z tekstami zlecenia, a `adresZaplanowania` obok `adresKalendarza`. (źródło: code-quality)

### P2 · TEST · `src/zlecenia/formularz.test.js:193`

Gałęzie formularz.js bez testu; obie grupy przeżyły jako mutacje. (a) domyslneDni (linia 86): po usunięciu osłony wyczyszczenie pola daty woła dzienTygodnia na pustym tekście. Żaden test nie sprawdza zData ze złą datą. Test: `assert.deepEqual(zData(zCyklem(reczne(), 'tydzien'), '').dni, [])`. (b) TEKSTY_ODMOW `brak_wyceny` i `za_duzo` (linie 71 i 73): usunięcie wpisu zamienia odmowę w awarię widoku, a test tekstOdmowy (linia 350) ma tylko `zly_status` i `brak_klienta`. Dodać dosłowne asercje: `tekstOdmowy(new BladZlecenia('brak_wyceny'))` → „Tej wyceny już nie ma, więc zlecenia nie zapisano.”, `tekstOdmowy(new BladZlecenia('za_duzo'))` → „Masz już najwięcej zleceń, ile można zapisać.”. (źródło: test-coverage)

### P2 · KOD · `src/zlecenia/kalendarz-dane.js:73`

Reguła „wizyta jest płatna za wizytę” ma trzy sformułowania: kalendarz-dane.js:73 (`w.kwota !== null && w.kwota > 0`), wizyta-dane.js:69 (`z.rozliczenie !== 'za_wizyte' || (cenaWizyty ?? 0) === 0`) i zapytania.js:76 (`czekaNaZaplate`). Dziś dają to samo tylko dzięki niejawnej zależności: cenaWizyty jest null wyłącznie w rozliczeniu miesięcznym. Skutek: zmiana reguły (np. wizyty za 0 zł albo nowy rodzaj rozliczenia) rozjedzie przycisk „Zapłacone” w widoku Dzień, akcję na ekranie wizyty i listę „Niezapłacone”, czyli ścieżkę zapłaty. Zmiana: wyeksportować z zapytania.js jeden predykat, np. `czyPlatnaZaWizyte(z, okres)`, użyć go w `czekaNaZaplate` i `zaplataWizyty`, a `WizytaDnia` uzupełnić o jego wynik dla `akcjeWizyty`. (źródło: code-quality)

### P2 · KOD · `src/zlecenia/kalendarz-dane.js:88`

Cena z groszami wyświetla się zaokrąglona do pełnych złotych. Formularz zlecenia i arkusz zmiany przyjmują ułamki (jestKwota, parsujLiczbe), ale kwoty idą przez zl() z maximumFractionDigits: 0. Sprawdzone: zl(149.5) daje „150 zł”, a tekstLiczby(149.5) daje „149,5”. Wejście: cena „149,50” w „Nowe zlecenie”. Kalendarz, ekran wizyty (src/zlecenia/wizyta-dane.js:140), karta zlecenia (src/zlecenia/karta-dane.js:96 i :116) oraz „Niezapłacone” na karcie klienta (src/widoki/klienci-dane.js:121) pokazują 150 zł, a zaplata.kwota zapisuje 149,5. Właściciel widzi inną kwotę do pobrania niż zapisana. W tych miejscach trzeba użyć kwotaJednostki zamiast zl, albo odrzucać grosze przy walidacji ceny zlecenia. (źródło: correctness)

### P2 · KOD · `src/zlecenia/kalendarz-dane.js:103`

Koszt widoku Dzień rośnie z całą historią zamkniętych wizyt, a nie z liczbą wizyt do pokazania. `modelDnia` dla dnia dzisiejszego woła `doZamkniecia` (src/zlecenia/zapytania.js:91), które dla każdego zlecenia liczy `wystapienia(z, dzienZalozenia, wczoraj)`, czyli wszystkie wizyty od założenia zlecenia. Dzieje się to przy każdym otwarciu ekranu i po każdym dotknięciu „Zrobione” albo „Zapłacone” (zlecenia-dzien.js:104 → rysuj). Główny koszt to walidacja w gorącej pętli: `porownajDni` (src/kalendarz/daty.js:71) przy każdym porównaniu wywołuje dwa razy `jestDniem`, a ten tworzy `Date` i robi `toISOString`. Te porównania są w oknie (wystapienia.js:176), w sortowaniu (wystapienia.js:153, zapytania.js:34 i :37) i w `okresDnia` (wystapienia.js:116). W profilu CPU `jestDniem` zajmuje 72% czasu. Pomiar w Node na desktopie, prawdziwy kod, stan syntetyczny, sekcja „Do zamknięcia” pusta: 1 rok, 15 serii, 300 zleceń jednorazowych rocznie (2331 wizyt ze stanem, 0,54 MB): `modelDnia` 39 ms. 3 lata (7002 wizyty, 1,55 MB): `modelDnia` 117 ms, z czego `doZamkniecia` 79 ms. 3 lata, 40 serii, 500 zleceń rocznie (18 710 wizyt, 3,78 MB): 259 ms. Jedno dotknięcie w wariancie 3 lata/15 serii to 64 ms zapisu + 23 ms `wczytajStan` + 117 ms modelu, czyli około 200 ms blokady wątku; w wariancie 3 lata/40 serii około 490 ms. Na telefonie będzie to kilka razy więcej (szacunek 3–5×, nie mierzone), a R15 przewiduje zamykanie wizyty dwoma dotknięciami. Ten sam mechanizm obciąża Tydzień i Miesiąc (około 30 ms przy 7002 wizytach, bo `wystapienia` przechodzi po wszystkich kluczach `wizyty` dla każdego okna) oraz kafel Start (start-dane.js:56). Zmiana: w `wystapienia`, `porownajWystapienia`, `okresDnia` i `porownajWizyty` porównywać dni jako teksty (`data < odDnia`, `a.data < b.data`), bez `porownajDni`. Format RRRR-MM-DD jest bezpieczny: klucze `wizyty`, `okresy[].od` i `przeniesiona.data` sprawdza `jestZlecenie` przy odczycie stanu, a granice okna sprawdza `sprawdzOkno`. Na kopii kodu w scratchpadzie ta zmiana dała `modelDnia` 117 → 32 ms i `doZamkniecia` 79 → 22 ms przy 7002 wizytach, ale koszt nadal rośnie liniowo z historią, więc `doZamkniecia` warto też odciąć od wizyt już zamkniętych, jeśli stan urośnie. (źródło: performance)

### P2 · TEST · `src/zlecenia/kalendarz-dane.test.js:99`

Gałęzie kalendarz-dane.js bez testu; pierwsze cztery zmiany przeżyły jako mutacje. (a) Linia 85, zaległa wizyta bez godziny: usunięcie gałęzi daje „pn 26 paź, null”. Test: Biuro z `godzina: null`, `model.doZamkniecia[0].miejsce === 'pn 26 paź'`. (b) Linia 83, fallback `w.klient?.nazwa ?? w.nazwa`, oraz (c) linia 60, `nazwy.get(id) ?? id`: nazwa usługi nigdzie nie jest sprawdzona, więc KATALOG w testach nie ma wpływu na wynik. Test: stan bez klienta zlecenia daje tytuł „9:00 · Sprzątanie mieszkania”, a usługa spoza katalogu daje jej id. (d) Linia 148, etykieta dnia bez wizyt. Test: `model.tygodnie[1][1]?.etykieta === 'Wtorek, 3 listopada'`. (e) Linia 164, `sprawdzDzien` w sasiedni dla miesiąca: dodać `assert.throws(() => sasiedni('miesiac', 'zly', 1), bladKalendarza('dzien'))`; ten kod błędu potwierdziłem wywołaniem. Do tego linia 232 testu przepisuje etykiety WIDOKI_KALENDARZA (przypięta stała), więc nie sprawdza zachowania. (źródło: test-coverage)

### P2 · KOD · `src/zlecenia/karta-dane.js:168`

`czyMiesiacZWizyta` kopiuje warunek `kwotaMiesiaca` z src/dane/wizyty.js:183 i 195–196: to samo okno miesiąca z `wizyty: {}` i ten sam filtr zrobionych, nieodwołanych wizyt. Komentarz w kodzie sam nazywa to warunkiem kwotaMiesiaca. Wynik filtra decyduje, czy linia 189 zawoła `kwotaMiesiaca`, która rzuca BladZlecenia `brak_wizyty`, a `modelKarty` w `rysuj` nie ma try/catch. Skutek: zmiana reguły w dane/wizyty.js bez zmiany kopii wysadzi render karty zlecenia albo ukryje miesiąc do zapłaty (R26). Zmiana: wyeksportować z src/dane/wizyty.js jeden predykat, np. `czyMiesiacMaWizyte(z, miesiac)`, użyć go w `kwotaMiesiaca` i w `miesiaceDoZaplaty`, a `czyMiesiacZWizyta` usunąć. (źródło: code-quality)

### P2 · KOD · `src/zlecenia/karta-dane.js:213`

„Zmień cenę lub godzinę” nie działa dla przesuniętej wizyty, a zapis wygląda na udany. wartosciZmiany czyta godzinę z okresu, a wystapienia (src/kalendarz/wystapienia.js:178) daje pierwszeństwo przeniesiona.godzina. Scenariusz odtworzony na prawdziwym kodzie: zlecenie jednorazowe pn 2 lis 9:00 przesunięte na śr 4 lis 11:00. Karta pokazuje „Jednorazowe · śr 4 lis, 11:00 · 250 zł”, ale arkusz ma tytuł „Zmiana od pn 2 lis” i pole 09:00. Użytkownik wpisuje 12:00, zmianaDoZapisu daje { godzina: '12:00' }, zmienOdWizyty zapisuje okres, arkusz się zamyka, a wizyta dalej jest o 11:00. Ta sama ścieżka dotyczy serii przez ?od= z przesuniętej wizyty. Właściciel uważa termin za zmieniony, a kalendarz pokazuje stary. Formularz powinien brać dzień i godzinę z wystąpienia, a zmiana godziny na wizycie z przeniesiona.godzina musi trafić do przesunięcia (przesunWizyte) albo zdjąć jego godzinę. (źródło: correctness)

### P2 · TEST · `src/zlecenia/karta-dane.test.js:58`

Gałęzie karta-dane.js bez testu; wszystkie trzy zmiany przeżyły jako mutacje. (a) Linia 56, `uslugaId === null` → „Zlecenie”. Test: `nazwaZlecenia(zlecenie({ uslugaId: null }), KATALOG) === 'Zlecenie'`. (b) Linia 153, `.sort()` w domyslnyKoniec: fixture ma klucze rosnąco, więc usunięcie sortowania przechodzi, a w praktyce starszą wizytę można zamknąć później. Test: `wizyty: { '2026-10-05': ZROBIONA, '2026-09-21': ZROBIONA }` daje '2026-10-05'. (c) Linia 263, wycena bez numeru: po usunięciu gałęzi powstaje „Wycena null”. Test: `{ id: 'w1', numer: null }` daje `m.wycena.tekst === 'Wycena'`. (źródło: test-coverage)

### P2 · KOD · `src/zlecenia/wizyta-dane.js:55`

Teksty i reguły wizyty są skopiowane między modelami. `tekstTerminu` jest identyczny w wizyta-dane.js:55 i karta-dane.js:106, a ten sam format „dzień, godzina” liczą jeszcze kalendarz-dane.js:85 i formularz.js:264 (cztery kopie). `tekstZaplaty` jest identyczny w wizyta-dane.js:58 i karta-dane.js:159. Dzień wizyty po przesunięciu liczą trzy miejsca: wizyta-dane.js:50, karta-dane.js:65 i klienci-dane.js (`pozycjaNiezaplacona`, tam bez `Object.hasOwn`). Reguła kodu nakazuje wspólny moduł przy trzecim użyciu. Skutek: zmiana formatu „Zapłacone · {forma} · {data}” albo terminu rozjedzie ekran wizyty, kartę zlecenia i kalendarz. Zmiana: dodać np. src/zlecenia/teksty-wizyty.js z `tekstTerminu(data, godzina)`, `tekstZaplaty(zaplata)` i `dzienWizyty(z, dataPierwotna)` i użyć ich we wszystkich tych miejscach. (źródło: code-quality)

### P2 · KOD · `src/zlecenia/wizyta-dane.js:119`

Reguła nazwy zlecenia ma trzy definicje z trzema wynikami dla braku opisu i usługi. Prywatna `nazwaZlecenia` w wizyta-dane.js:119 oddaje null. Eksportowana funkcja o tej samej nazwie w karta-dane.js:54 oddaje 'Zlecenie'. zapytania.js:50 oddaje ''. Skutek: zmiana nazwy wyświetlanej (np. nowy fallback) objmie tylko część ekranów, a typecheck tego nie pokaże, bo funkcje mają tę samą nazwę i różne typy zwracane. Zmiana: przenieść jedną `nazwaZlecenia` do wspólnego modułu w src/zlecenia/, usunąć kopię z wizyta-dane.js, a różnicę ukrycia wiersza „Usługa” wyrazić w modelu wizyty. (źródło: code-quality)

### P2 · TEST · `src/zlecenia/wizyta-dane.test.js:129`

Gałęzie modelWizyty bez testu; wszystkie trzy zmiany przeżyły jako mutacje. (a) Linia 134, `k === null`: test „dają null” ma zlecenie, dzień i regułę, ale nie brak klienta, więc po usunięciu warunku model rzuca TypeError na `k.nazwa`. Test: `modelWizyty({ ...stan, klienci: [] }, katalog, 'z1', DZIS, DZIS)` → null. (b) Linia 122, usługa spoza katalogu: po zamianie `?? uslugaId` na `?? null` wiersz „Usługa” znika. Test: zlecenie z `uslugaId: 'stara'` daje `m.usluga === 'stara'`. (c) Linia 68, `zaplata.forma ?? formaDomyslna(...)`: test z linii 174 oczekuje 'gotowka', a to też domyślna wartość funkcji, więc stała 'gotowka' zamiast formaDomyslna przechodzi. Test: klient z wcześniejszą zapłatą `blik` na innej wizycie i oczekiwane `forma: 'blik'` dla wizyty z formą null. (źródło: test-coverage)

## Findingi P3

### P3 · KOD · `src/dane/zlecenia-ksztalt.js:119`

Rekord zlecenia z rokiem spoza lat kalendarza (1000-9999) przechodzi strażnika, a nowa karta zlecenia się na nim wywraca i nie da się go usunąć. Ścieżka ataku: spreparowany plik kopii wczytany trybem „połącz” ze zleceniem `start: "0999-01-15"` i cyklem `miesiac` albo adres `#/zlecenie/nowe?data=9999-12-31` z wyborem „Co miesiąc” i zapisem użytkownika → `jestDniem` przepuszcza taką datę, `jestZlecenie` zwraca true (sprawdzone uruchomieniem) → `dzienMiesiacaOkresu` (src/zlecenia/karta-dane.js:77) rzuca BladKalendarza, więc `modelKarty` nie zwraca modelu, a router pokazuje ekran błędu. Skutek: „Usuń zlecenie” jest tylko na tej karcie (src/widoki/zlecenie-karta.js:211), więc rekordu nie da się usunąć z aplikacji, a klient z historią też zostaje zablokowany przed usunięciem. Bez dostępu do danych. Naprawa: przenieś NAJWCZESNIEJSZA_DATA z src/zlecenia/formularz.js do src/dane/zlecenia-ksztalt.js, dodaj stałą NAJPOZNIEJSZA_DATA = '9998-12-31' i w `jestZlecenie` odrzucaj `start` poza tym zakresem. Dodaj testy odmowy w src/dane/zlecenia-ksztalt.test.js dla '0999-01-15' i '9999-12-31'. (źródło: security)

### P3 · KOD · `src/zlecenia/kalendarz-dane.js:52`

Bramka `dzienKalendarza` ma zamieniać zły `?data=` na dziś, ale przepuszcza dni spoza lat kalendarza. Odrzuca poprawnie '2026-02-31', '2026-11-03T00:00', '+02026-11-03', ' 2026-11-03', '2026-11-03\n' i cyfry arabskie. Przechodzą '0026-11-03', '0999-12-31', '0000-01-01' i '9999-12-31' (sprawdzone uruchomieniem). Ścieżka ataku: link `#/zlecenia/miesiac?data=0999-12-31` albo `#/zlecenia/tydzien?data=9999-12-31` → `modelMiesiaca` lub `modelTygodnia` rzuca BladKalendarza → ekran „Nie udało się otworzyć tego ekranu”. Link `#/zlecenia/dzien?data=9999-12-31` też pada, bo `sasiedni('miesiac', …)` w pasku daty rzuca przy budowie ekranu. Skutek ogranicza się do ekranu błędu do czasu zmiany adresu, zapisane dane zostają nietknięte. Naprawa: w `dzienKalendarza` zamień warunek na `jestDniem(zapytanie.data) && zapytanie.data >= NAJWCZESNIEJSZA_DATA && zapytanie.data <= NAJPOZNIEJSZA_DATA`. Dopisz testy odmowy w src/zlecenia/kalendarz-dane.test.js obok linii 230 dla '0026-11-03' i '9999-12-31', bo dziś test odmowy ma tylko '2026-02-30'. (źródło: security)

### P3 · KOD · `src/widoki/podsumowanie.js:103`

Jeden render podsumowania zapisanej wyceny trzy razy parsuje i waliduje cały stan z localStorage: `rysuj` (linia 242), nowa w tej fazie `kartaZlecen` (linia 103) i `kartaWpisowCzasu` (linia 115). `wczytajStan` kosztuje 23 ms przy 1,55 MB (3 lata, 7002 wizyty) i 60 ms przy 3,78 MB (Node na desktopie), więc dwa zbędne odczyty dokładają 46–120 ms do każdego renderu, także po każdej akcji na wycenie. Zmiana: dodać `stan` do opcji `elementyEkranu` (linia 166), przekazać tam `stan` odczytany w `rysuj` w linii 242 i zamienić sygnatury na `kartaZlecen(w, stan)` oraz `kartaWpisowCzasu(w, stan, kontekst.katalog)`, usuwając `wczytajStan` z linii 103 i 115. (źródło: performance)

### P3 · KOD · `src/zlecenia/plan-fakt.js:85`

`planZakonczenia` nie ma wywołań produkcyjnych, tylko testy w plan-fakt.test.js: ekran wizyty z tej fazy używa `planIFaktWizyty`, a knip nie działał w bramce (status brak). Usuń `planZakonczenia` i typedef `PlanWizyty` (linia 19) oraz odpowiadający im `describe('planZakonczenia')` i asercję z plan-fakt.test.js:336. (źródło: code-quality)

### P3 · KOD · `src/zlecenia/wizyta-dane.js:34`

`ModelWizyty` używa nazwy `adres` w dwóch znaczeniach o tym samym typie string: `klient.adres` to trasa aplikacji, a `adres` to adres ulicy klienta, więc pomyłki w wizyta.js:260–261 typecheck nie wyłapie. Zmień pole `adres` modelu na `adresKlienta` w typedefie, w `modelWizyty` (linia 139) i w `kartaDanych` w src/widoki/wizyta.js. (źródło: code-quality)

### P3 · KOD · `src/widoki/wizyta.js:221`

Warunek `jestDniem(data) && data >= NAJWCZESNIEJSZA_DATA` powtarza w widoku prywatne `jestDataZlecenia` z src/zlecenia/formularz.js:84. Wyeksportuj `jestDataZlecenia`, zastąp nim ten warunek i usuń z wizyta.js niepotrzebne już importy `jestDniem` oraz, jeśli to możliwe, użycie stałej tylko do walidacji. (źródło: code-quality)

### P3 · KOD · `src/zlecenia/karta-dane.js:183`

`niezaplacone({ klienci: [], zlecenia: [z] }, dzis)` buduje sztuczny stan z pustą listą klientów tylko dlatego, że typ parametru wymaga `klienci`, choć `niezaplacone` go nie czyta. Zawęź typ parametru w src/zlecenia/zapytania.js:127 do `Pick<Stan, 'zlecenia'>` i wywołuj tu `niezaplacone({ zlecenia: [z] }, dzis)`. (źródło: code-quality)

### P3 · KOD · `src/widoki/wizyta.js:97`

Granice licznika `Math.min(MAKS_MINUT_PRACY, Math.max(KROK_CZASU, ...))` powtarzają w widoku regułę z src/zlecenia/plan-fakt.js:76. Dodaj w plan-fakt.js eksport `wGranicachLicznika(minuty)`, użyj go w `czasStartowy` i tutaj w `ustaw`. (źródło: code-quality)

### P3 · KOD · `src/zlecenia/formularz.js:262`

Wiersz w „Zlecenia z tej wyceny” pokazuje pierwotny termin zlecenia jednorazowego po przesunięciu, bo opisZlecenia czyta tylko start i okresy[0]. Wejście: zlecenie z wyceny na wt 3 lis 10:00 przesunięte na pt 6 lis 12:00, wiersz dalej mówi „wt 3 lis, 10:00”. Zmień: dodaj do Pick pole wizyty i dla zlecenia bez cyklu bierz termin z z.wizyty[start].przeniesiona (data i godzina), gdy jest ustawione, a w pozostałych przypadkach zostaw start i okresy[0]. (źródło: correctness)

### P3 · KOD · `src/zlecenia/dane-tempa.js:38`

Odwołana wizyta z wpisanym czasem pracy nadal liczy się do własnego tempa firmy. Ekran wizyty pozwala odwołać wizytę z zapisanym czasem, a wykonaniaZlecenia filtruje tylko po minutyPracy. Wejście: wizyta z planem 120 min i czasem 480 min, potem „Odwołaj wizytę”; tempo zostaje zawyżone i psuje „zostaje dla Ciebie” w kolejnych wycenach. Zmień warunek na `w.minutyPracy === null || w.odwolana ? []`. (źródło: correctness)

### P3 · KOD · `sw.js:17`

Po wdrożeniu aplikacja może nie wystartować offline przy drugim uruchomieniu. PLIKI_STARTOWE nie ma modułów src/, a stale-while-revalidate odświeża tylko pliki już wczytane przez stronę. Pierwsze uruchomienie online po wdrożeniu daje w cache nowy src/widoki/indeks.js, ale bez nowych plików tej fazy (np. src/widoki/wizyta.js, src/zlecenia/formularz.js). Drugie uruchomienie bez sieci nie pobierze statycznego importu, więc graf modułów pada i uruchom() się nie wykona, mimo że dane są w pamięci telefonu. Zmień: dopisz do PLIKI_STARTOWE wszystkie moduły src/**/*.js bez testów i arkusze src/style/*.css (lista generowana skryptem) i podbij WERSJA_CACHE na 'czysty-zarobek-v2', żeby install nowego workera pobrał komplet przed aktywacją. (źródło: correctness)

### P3 · E2E · `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md:1079`

IU-16, scenariusz E2E `zlecenie-seria-co-tydzien` każe wybrać usługę „Sprzątanie mieszkania (standard)”, a takiej opcji w formularzu nie ma. Formularz bierze nazwy z katalogu (`opcjeUslug`, src/zlecenia/formularz.js:94–98), a data/ceny.json:39 ma dla `mieszkanie_standard` nazwę „Mieszkanie lub dom – sprzątanie standardowe”. Nazwa ze scenariusza występuje tylko w makiecie i w fixture src/zlecenia/formularz.test.js:18, więc test jednostkowy tego rozjazdu nie pokaże. Kod jest zgodny z zamówieniem „wybór z katalogu”. Akcja: w kroku scenariusza zamienić nazwę usługi na „Mieszkanie lub dom – sprzątanie standardowe”. (źródło: spec-compliance)

### P3 · E2E · `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md:1081`

IU-16, scenariusz E2E `abonament-raz-w-miesiacu` oczekuje, że wizyty „w widoku tygodnia” w pn, śr i pt mają „tylko „Zrobione” i „w abonamencie””. Podejście IU-15 zamawia w Tygodniu wiersze bez przycisków zamknięcia i tak działa kod (`czyAkcje: false`, src/zlecenia/kalendarz-dane.js:124), więc „Zrobione” nie pojawi się tam nigdy. Kod jest zgodny z Podejściem, a sprzeczny jest sam scenariusz. Akcja: przepisać oczekiwanie na: w Tygodniu wizyty w pn, śr i pt z kwotą „w abonamencie”, a przycisk „Zrobione” bez „Zapłacone” sprawdzać w widoku Dzień. (źródło: spec-compliance)

## Findingi OPERATOR

Brak.

## Przebiegi E2E

| Flow | Wynik | Uwagi |
|---|---|---|
| `zlecenia-dzien-zamkniecie` | PASS | Bez zastrzeżeń. |
| `kalendarz-widoki` | PASS | Bez zastrzeżeń. |
| `zlecenie-seria-co-tydzien` | PASS | Wybrana usługa to „Mieszkanie lub dom – sprzątanie standardowe” (finding P3). Liczba 8 dotknięć zawiera szacunek dla daty. Datę i godzinę ustawiono wartością ze zdarzeniami input i change. |
| `zaplanuj-z-wyceny` | PASS | Datę ustawiono wartością ze zdarzeniami input i change. |
| `abonament-raz-w-miesiacu` | PASS | Literalnego „Zrobione” w Tygodniu nie ma (finding P3). PASS opiera się na sensie R26, sprawdzonym w widoku Dzień i na ekranie przyszłej wizyty. |
| `wizyta-przesun-i-czas` | PASS | Chip „Przelew” wybrany przed „Zapłacone”, bo tak działa ekran. Datę i godzinę ustawiono wartością ze zdarzeniami input i change. |
| `seria-zmiana-i-zakonczenie` | PASS | Godzinę i dzień końca ustawiono wartością ze zdarzeniami input i change. |
| `klient-historia-zlecen` | PASS | Bez zastrzeżeń. |

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 8
- [E2E] odznaczone na podstawie przebiegow testera: 8
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [x] CLI: `node --test src/zlecenia/kalendarz-dane.test.js src/ui/format.test.js src/ui/router.test.js` (IU-15) -> PASS (komenda: `node --test src/zlecenia/kalendarz-dane.test.js src/ui/format.test.js src/ui/router.test.js`)
- [x] CLI: `npm run typecheck` (IU-15) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/zlecenia/formularz.test.js src/kreator/podsumowanie.test.js` (IU-16) -> PASS (komenda: `node --test src/zlecenia/formularz.test.js src/kreator/podsumowanie.test.js`)
- [x] CLI: `npm run typecheck` (IU-16) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/zlecenia/wizyta-dane.test.js src/zlecenia/plan-fakt.test.js` (IU-17) -> PASS (komenda: `node --test src/zlecenia/wizyta-dane.test.js src/zlecenia/plan-fakt.test.js`)
- [x] CLI: `npm run typecheck` (IU-17) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/zlecenia/karta-dane.test.js src/widoki/klienci-dane.test.js` (IU-18) -> PASS (komenda: `node --test src/zlecenia/karta-dane.test.js src/widoki/klienci-dane.test.js`)
- [x] CLI: `npm run typecheck` (IU-18) -> PASS (komenda: `npm run typecheck`)
- [x] E2E: 8 flow fazy 5 -> PASS (e2e.mjs ksieguj: odznaczone 8, fail 0, skip 0, manual 0, bezWpisu 0)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 36 (33) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 8 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 8 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 38 -> 38 -> 37 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 24 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 12 / 5 / 20 (batchowanie: 20 findingow w 5 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 32 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
