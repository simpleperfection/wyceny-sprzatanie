# Review fazy 3 — Szkielet aplikacji, start, ustawienia i kopia

Data: 2026-10-25. Gate: **ZASTRZEZENIA** (P1: 0, P2: 12, P3: 15, OPERATOR: 4). E2E: 7 PASS / 0 FAIL / 0 SKIP.

## Statystyki

- Findingi po verify: 31 (KOD: 21, TEST: 6, OPERATOR: 4)
- Obalone przez verify: 0

## Findingi P1

Brak.

## Findingi P2

### P2 · KOD · `src/app.js:41`

Strażnik `jestDomyslnymi` dla data/domyslne.json, czyli danych z granicy (fetch), jest predykatem `x is Domyslne` słabszym od typu. Sprawdza tylko `typeof status_vat === 'string'` (typ wymaga unii `StatusVat`), samo `jestObiektem(oferta)` bez `waznosc_dni` i `warunki[]` oraz samo `jestObiektem(szybka_wycena)` bez `zastrzezenie`. Typechecker uważa potem te pola za pewne. Drugi, częściowy walidator tego samego kontraktu siedzi w `ustawieniaDomyslne` (dane/ustawienia.js:208-215), a typ `Domyslne` jest zdefiniowany w dane/ustawienia.js. Zły plik danych (np. `warunki` jako obiekt albo `status_vat: "czynny "`) przejdzie przez start i wysypie się dopiero w widoku oferty albo da błędne VAT. Zmiana: przenieść strażnika do src/dane/ustawienia.js jako eksportowane `jestDomyslnymi`, sprawdzać w nim `sprawdzStatusVat`, `oferta.waznosc_dni` jako liczbę, `oferta.warunki.every(jestWarunkiem)` (ksztalt.js:29) i `szybka_wycena.zastrzezenie` jako tekst, a w app.js i `ustawieniaDomyslne` używać tylko tej jednej funkcji.

_Źródło: code-quality_

### P2 · TEST · `src/app.js:41`

Bramka walidacji `jestDomyslnymi` dla data/domyslne.json i ścieżka błędu `pokazBlad(kontener, BLAD_DANYCH)` (linia 122) nie mają testu odmowy. Zestaw zostaje zielony po zamianie bramki na `return true` albo po usunięciu sprawdzenia `typeof x.tempo === 'number'`. Wtedy plik bez `tempo` przechodzi do widoków i psuje wyceny zamiast pokazać komunikat „Nie udało się wczytać danych aplikacji…”. Poprawka: przenieś `jestDomyslnymi` i `wczytajDomyslne(pobierz)` do modułu bez DOM (np. src/dane/domyslne.js) i dopisz test. Wczytany data/domyslne.json → true. Ten sam obiekt bez `tempo` → false. `wczytajDomyslne` z atrapą `pobierz` zwracającą `{status_vat:'zwolniony'}` → rzuca BladKatalogu z kodem `zly_format`.

_Źródło: test-coverage_

### P2 · TEST · `src/ui/h.js:19`

Jedyną ochroną przed wstrzyknięciem HTML i skryptu w całej warstwie widoków jest bramka `ZAKAZANE = /^(on.|srcdoc$)|html$/i` w `ustawAtrybut`, a nie ma do niej żadnego testu odmowy. Nie ma pliku `src/ui/h.test.js`, a `BladAtrybutu` nie pojawia się w żadnym teście. Dziś bramka odrzuca wszystkie sprawdzone wejścia: `onclick`, `ONCLICK`, `onfocus`, `innerHTML`, `outerHTML`, `srcdoc`, `SrcDoc`. Nikt jednak nie pilnuje, żeby tak zostało. Scenariusz: przy zmianie regexu, np. usunięciu flagi `i` albo zmianie `on.` na `on[a-z]+$`, zaczyna przechodzić `h('a', { ONCLICK: ... })` albo `h('div', { innerHTML: tekstZKopii })`. Kolejne fazy dopiszą widoki oferty i chemii z danymi klienta z importowanej kopii, a jedyną zaporą zostanie wtedy CSP. Naprawa: dodać `src/ui/h.test.js` z atrapą DOM (np. lekki `document` w teście albo wydzielenie czystej funkcji `czyZakazany(nazwa)`) i asercjami, że `onclick`, `ONCLICK`, `onfocus`, `innerHTML`, `outerHTML`, `srcdoc` i `SRCDOC` rzucają `BladAtrybutu`, a `aria-label`, `data-x`, `href` i `class` przechodzą.

_Źródło: security_

### P2 · KOD · `src/ui/komponenty/formularz.js:66`

Komunikat „Wpisz liczbę od {min} do {max}.” i formatowanie liczby do niego mają dwie definicje. Pierwsza to `tekstLiczby` jako `String(x).replace('.', ',')` i `bladZakresu(min, max)` w formularz.js:66-71. Druga to `tekstLiczby` na `Intl.NumberFormat('pl-PL', {maximumFractionDigits: 2})` i `bladZakresu({min,max})` w widoki/ustawienia-formularz.js:41-44. W arkuszu tempa (ustawienia-tempo.js:34) użytkownik widzi tekst z formularz.js, a test jednostkowy (ustawienia-formularz.test.js) sprawdza kopię z ustawienia-formularz.js. Zmiana treści albo formatu w jednym miejscu przejdzie testy, a ekran pokaże starą wersję. Granica liczona z błędem zmiennoprzecinkowym, np. 0.1+0.2, da „0,30000000000000004” tylko w liczniku. Zmiana: przenieść `tekstLiczby` i `bladZakresu` do src/ui/format.js, który już importują oba moduły, i usunąć obie lokalne kopie.

_Źródło: code-quality_

### P2 · TEST · `src/ui/router.js:119`

Żaden test nie wywołuje gałęzi `catch` w `uruchomRouter`, w której widok rzucił wyjątek przy render, a router czyści kontener i pokazuje `widoki.bladEkranu`. To samo dotyczy przekierowania pustego adresu na `#/start` (`ADRESY_POCZATKOWE`). router.test.js testuje tylko czystą `dopasuj`, a E2E `szkielet-nawigacja` nie ma widoku, który by rzucał. Zestaw przejdzie po usunięciu try/catch: wyjątek widoku zostawi wtedy pusty ekran albo pół-wyrenderowaną treść. Poprawka: w router.test.js podstaw na czas testu atrapy `globalThis.location` ({hash:'#/start'}), `history.replaceState`, `window.addEventListener`/`scrollTo` i `reportError` oraz kontener z `replaceChildren`/`querySelector`. Asercje: widok `start` z `render(){ throw new Error('x') }` → wywołany `bladEkranu.render` z tym samym kontenerem, a `reportError` dostał ten błąd. `location.hash = ''` → `replaceState` wywołane z `'#/start'`.

_Źródło: test-coverage_

### P2 · KOD · `src/widoki/kopia-teksty.js:89`

Format dnia lokalnego RRRR-MM-DD istnieje w trzech kopiach. Pierwsza to `dzienLokalny` w src/dane/kopia.js:72 (nazwa pliku kopii, nieeksportowana). Druga jest inline w `nazwaSurowegoPliku` (kopia-teksty.js:89, komentarz „jak nazwa pliku kopii” jawnie wiąże ją z pierwszą). Trzecia to `dwieCyfry`/`miesiacLokalny`/`dzienLokalny` w start-dane.js:49-53. Do tego dochodzą trzy różne strażniki poprawnej daty z trzema klasami błędu: `sprawdzDate` z `BladKopii('data')` w dane/kopia.js:66, nowa klasa `BladDaty` (kod `zla_data`) w start-dane.js:33-46 i `BladFormatu('zla_data')` w kopia-teksty.js:88. Zmiana formatu albo strefy w jednej kopii rozjedzie nazwę pliku surowego z nazwą kopii i porównania terminów „Do zrobienia”, a wywołujący muszą łapać trzy typy błędu dla tego samego warunku. Zmiana: wyeksportować `dzienLokalny`, `miesiacLokalny` i jeden strażnik daty, np. z src/dane/ksztalt.js, usunąć klasę `BladDaty` i lokalne kopie w kopia-teksty.js i start-dane.js.

_Źródło: code-quality_

### P2 · TEST · `src/widoki/kopia.js:142`

Żaden test nie sprawdza decyzji `czyPytac = obecny.wyceny.length > 0 || obecny.ustawienia !== null`, która rozstrzyga, czy wczytanie kopii zapyta o „Połącz”/„Zastąp”, czy od razu zastąpi dane. Zestaw zostaje zielony po zamianie na `const czyPytac = false` albo `&&` zamiast `||`. Wtedy wczytanie kopii przy istniejących wycenach albo ustawieniach po cichu kasuje dane użytkownika. E2E `kopia-eksport` sprawdza tylko zapis kopii, a import jest jedynie scenariuszem [Manual]. Poprawka: wydziel czystą funkcję `czyPytacOTryb(stan)` do src/widoki/kopia-teksty.js, użyj jej w kopia.js i dopisz do kopia-teksty.test.js trzy asercje: stan z 1 wyceną i `ustawienia: null` → true, stan bez wycen z ustawieniami → true, stan bez wycen i bez ustawień → false.

_Źródło: test-coverage_

### P2 · KOD · `src/widoki/start.js:93`

Ten sam null w `wojewodztwoId` znaczy dwie rzeczy: „średnia krajowa” i „nie wybrano”. Kreator i ustawienia pokazują „średnią krajową” jako zwykłą opcję do wyboru (ustawienia-sekcje.js:242 i 247 zamieniają '' na null), a `brakujeUstawien` (wywołane tu w `banerUstawien`) każdy null liczy jako brak. Scenariusz: świeży start, data/domyslne.json ma `wojewodztwo: null`, użytkownik na kroku „Województwo” klika „Dalej” (wiersz pokazuje „Średnia krajowa”), wpisuje nazwę firmy i telefon i klika „Gotowe”. Kreator zapisuje `kreatorZakonczony: true`, a start i tak pokazuje „Ustawienia domyślne – uzupełnij”. Baneru nie da się zdjąć bez wyboru konkretnego województwa, choć według R24 baner należy się tylko po pominięciu kreatora. Akcja: w `banerUstawien` pomijać brak 'wojewodztwo', gdy `stan.ustawienia.kreatorZakonczony === true` albo gdy użytkownik zapisał województwo w arkuszu. Inna droga: osobna wartość (np. 'kraj') dla świadomie wybranej średniej krajowej.

_Źródło: correctness_

### P2 · KOD · `src/widoki/ustawienia-formularz.js:33`

Kontrakt pól ustawień ma drugą definicję w warstwie widoku. `WALIDATORY_FIRMY` (l.34) i `POLA_DOJAZDU` (l.35) to dosłowne kopie stałych z src/dane/ustawienia.js:39-40, mimo że typ `PoleDojazdu` jest już importowany z dane/ustawienia.js. `POLA_DO_OFERTY = ['nazwa','telefon']` (l.33) powtarza regułę z `brakujeUstawien` (dane/ustawienia.js:242), która osobno sprawdza nazwę i telefon. Skutek: nowe pole dojazdu albo nowy walidator dodany tylko w dane/ustawienia.js przejdzie przez typechecker, ale formularz go pominie. Zmiana wymaganych pól oferty rozjedzie ostrzeżenie w arkuszu i baner „Ustawienia domyślne – uzupełnij”. Zmiana: wyeksportować `WALIDATORY_FIRMY`, `POLA_DOJAZDU` i nową stałą `POLA_WYMAGANE_W_OFERCIE` z src/dane/ustawienia.js, użyć jej w `brakujeUstawien` i zaimportować w ustawienia-formularz.js w miejsce lokalnych kopii.

_Źródło: code-quality_

### P2 · KOD · `src/widoki/ustawienia.js:28`

Widok trasy `#/ustawienia` jest też wspólną biblioteką dla innych ekranów. Eksportuje `wczytajStan` (l.28) i `tekstBleduZapisu` (l.39), a importują je kreator-startowy.js:9, kopia.js:14 i start.js:16. Ten sam odczyt stanu z rzutem `BladMagazynu('Zapisanych danych nie da się odczytać')` jest skopiowany jeszcze w start.js:30 (`stanAplikacji`), lista-wycen.js:39 (inline) i dane/kopia.js:76 (`stanMagazynu`). Moduł ma więc kilka niezależnych powodów do zmiany: każda zmiana ekranu ustawień dotyka startu, kopii i kreatora, a zmiana komunikatu albo kodu błędu odczytu wymaga poprawek w 4 miejscach. Propozycja: przenieść odczyt do `src/dane/magazyn.js` jako jedną eksportowaną funkcję (np. `stanLubBlad(magazyn)`) i użyć jej we wszystkich czterech miejscach. `tekstBleduZapisu` razem z jego stałymi BLAD_* przenieść do nowego `src/widoki/teksty-bledow.js`, żeby widoki nie importowały się nawzajem.

_Źródło: code-quality_

### P2 · TEST · `sw.js:56`

Logika offline service workera (R28) nie ma żadnego testu. Chodzi o `siecPotemCache` (gdy sieć padnie albo przekroczy 4 s, odpowiedź idzie z cache), o `zapisana` (nawigacja bez trafienia w cache dostaje `index.html`, linia 49), o `czyTenSamOrigin` i o walidację komunikatu `zapisz-zasoby` (linia 104). E2E `pwa-manifest` sprawdza tylko `controller !== null` i manifest, a offline jest scenariuszem [Manual]. Zestaw przejdzie np. po usunięciu fallbacku `cache.match(STRONA_ZAPASOWA)` albo po zapisie odpowiedzi 404/opaque (zmiana `czyDoZapisu` na `true`). Poprawka: test w Node, który ładuje sw.js przez `node:vm` z atrapami `self`, `caches` (Map) i `fetch` i sprawdza konkretne wyniki. (1) fetch odrzuca TypeError, a cache ma `index.html` → nawigacja `mode:'navigate'` na `./#/start` zwraca odpowiedź z `index.html`. (2) fetch zwraca 200 basic → `caches` zawiera wpis dla tego adresu. (3) fetch zwraca 404 → wpisu nie ma. (4) komunikat `{typ:'zapisz-zasoby', adresy:['https://obcy.pl/x.js']}` → fetch nie jest wołany.

_Źródło: test-coverage_

### P2 · KOD · `sw.js:64`

Service worker obsługuje każdy zasób z tego samego originu strategią „najpierw sieć, potem cache” z limitem 4 s (siecPotemCache → zLimitem(siec, LIMIT_SIECI_MS)), także niezmienne pliki aplikacji: moduły src/**, style, fonty, ikony. Bez kroku budowania graf modułów ma 38 plików, a najdłuższy łańcuch importów to 11 poziomów (app.js → widoki/indeks.js → kopia.js → ustawienia.js → ustawienia-tempo.js → ustawienia-sekcje.js → ustawienia-formularz.js → dane/ustawienia.js → dane/walidacja.js → silnik/tempo.js → silnik/bledy.js). Przeglądarka zna kolejny poziom dopiero po pobraniu poprzedniego. Przy słabym zasięgu (piwnica, klatka schodowa u klienta, a tam zwykle pracuje firma sprzątająca) każde żądanie czeka pełne 4 s, zanim SW sięgnie do cache. Zainstalowana aplikacja startuje więc po ok. 11 × 4 s ≈ 44 s, potem dochodzi jeszcze jeden poziom: 4 pliki data/*.json. Offline nie ma problemu, bo fetch odrzuca od razu. Zmiana: dla PLIKI_STARTOWE i ścieżek src/, fonty/, ikony/ podawaj od razu odpowiedź z cache, a w tle (zdarzenie.waitUntil) odświeżaj ją z sieci, czyli stale-while-revalidate. Wersję plików wymusza zmiana WERSJA_CACHE. „Najpierw sieć” zostaw tylko dla nawigacji i data/*.json, a jeśli ma zostać wszędzie, skróć dla nich limit do ok. 1,5 s.

_Źródło: performance_

## Findingi P3

### P3 · KOD · `src/ui/h.js:40`

Domyślna gałąź `ustawAtrybut` przepuszcza `href`, `src` i `formaction` z dowolnym schematem. Wejścia, które przechodzą: `javascript:alert(1)`, `JavaScript:alert(1)`, `java\tscript:alert(1)`, `data:text/html,<script>...`, `//evil.example/x`. Dziś wszystkie `href` w fazie pochodzą z `sciezka()` (parametry przez `encodeURIComponent`) albo z `URL.createObjectURL`, więc ataku nie ma. Do tego meta CSP `script-src 'self'` blokuje wykonanie `javascript:`. Mimo to helper zapowiada się jako jedyne miejsce budowania DOM, także dla przyszłych linków z danych (`sds.url`, `cena_zrodlo.url`, telefon w ofercie). Naprawa: w `ustawAtrybut` dla `href`, `src`, `action` i `formaction` liczyć `new URL(String(wartosc), location.href).protocol` i rzucać `BladAtrybutu`, gdy wartość nie zaczyna się od `#` i schemat jest spoza listy `https:`, `blob:`, `tel:`, `mailto:`.

_Źródło: security_

### P3 · KOD · `src/widoki/kopia-teksty.js:70`

tekstWczytania → dataUtworzenia robi drugi raz JSON.parse całego pliku kopii tylko po to, żeby odczytać pole `utworzona`. odczytajKopie (src/dane/kopia.js:127) już raz go sparsował, a plik może mieć do 10 MB (MAKS_ROZMIAR_PLIKU). Drugie parsowanie 5–10 MB na telefonie to dodatkowe ok. 100–300 ms zamrożenia głównego wątku przy każdym imporcie. Zmiana: niech odczytajKopie zwraca `{ stan, utworzona }` (utworzona = jestDataIso(plik.utworzona) ? plik.utworzona : null), tekstWczytania niech przyjmuje `utworzona` zamiast surowego `tekst`, a dataUtworzenia trzeba usunąć.

_Źródło: performance_

### P3 · KOD · `sw.js:60`

Gdy odpowiedź sieci przychodzi po limicie 4 s, a klient dostał już kopię z cache, `zdarzenie.waitUntil(...)` wywołane w `.then` może rzucić InvalidStateError, bo obietnica z `respondWith` jest już rozstrzygnięta. Wtedy `cache.put` się nie wykonuje i na wolnym łączu cache nigdy nie dostaje świeżej wersji pliku. Akcja: na początku `siecPotemCache` zarejestrować synchronicznie `zdarzenie.waitUntil(siec.then(...zapis...).catch(...))`, czyli przenieść zapis do cache do obietnicy przekazanej do `waitUntil` przed pierwszym `await`, a zamiast `zdarzenie.waitUntil` w `.then` zostawić samo `cache.put`.

_Źródło: correctness_

### P3 · KOD · `src/app.js:61`

Wrapper przedUstawieniami woła magazyn.wczytaj() przed każdym renderem trasy, a sam widok (start.js:31, lista-wycen.js:38, ustawienia.js:29) woła go zaraz potem drugi raz. Każde wczytaj to getItem i JSON.parse całego stanu z localStorage, a ten przy ok. 1,2 KB na wycenę i limicie MAKS_WYCEN = 5000 dochodzi do limitu 5 MB. Na jedną nawigację wypadają więc dwa parsowania całego stanu, a przy zdarzeniu storage (app.js:120 woła wczytaj, potem router.odswiez) trzy. Przy 3000 wycen (ok. 3,6 MB) to ok. 50–100 ms na każde zbędne parsowanie na telefonie. Zmiana: w przedUstawieniami przekaż odczytany wynik do widoku, np. `return widok.render(kontener, { ...argumenty, stan: wynik.stan })`, i dodaj opcjonalne pole `stan` do ArgumentyWidoku w router.js, a widoki niech biorą `argumenty.stan ?? wczytajStan(kontekst)` zamiast czytać magazyn ponownie.

_Źródło: performance_

### P3 · KOD · `src/widoki/ustawienia.js:51`

`kartaKopii` przekazuje wynik `dniOdKopii` prosto do `dniTemu`, które dla liczby ujemnej rzuca BladFormatu. Scenariusz: data ostatniej kopii jest „w przyszłości”, bo zegar urządzenia przy kopii się spieszył i potem go poprawiono albo stan wczytano z urządzenia z innym zegarem. Wtedy cały ekran `#/ustawienia` zamienia się w „Nie udało się otworzyć tego ekranu”, a to jedyne miejsce zmiany danych firmy. kopia-teksty.js:232 obsługuje ten przypadek przez `Math.max(0, dni)`, ten widok nie. Akcja: w linii 51 zamienić `dniTemu(dni)` na `dniTemu(Math.max(0, dni))`.

_Źródło: correctness_

### P3 · KOD · `src/app.js:120`

Zapis w innej karcie (zdarzenie `storage`) woła `router.odswiez()`, które rysuje widok od nowa. Kreator startowy trzyma wybory tylko w zmiennej `szkic` w domknięciu, więc odświeżenie wraca do kroku 1 z wartościami ze stanu. Województwo, VAT i dane firmy wpisane w tej karcie przepadają bez komunikatu. Akcja: w callbacku `naZmiane` nie odświeżać, gdy bieżąca trasa to `kreatorStartowy` (`dopasuj(location.hash, TRASY)?.nazwa === 'kreatorStartowy'`), albo trzymać szkic kreatora w `sessionStorage` i odtwarzać go w `render`.

_Źródło: correctness_

### P3 · KOD · `index.html:17`

Moduły ES ładują się bez kroku budowania: 38 plików, łańcuch importów o głębokości 11. Na zimnym starcie daje to ok. 10 kolejnych rund sieci, zanim app.js w ogóle zacznie pobierać data/*.json. Przy RTT 300 ms (3G) to ok. 3 s samego wodospadu. Zmiana: przed `<script type="module" src="src/app.js">` dodaj `<link rel="modulepreload" href="...">` dla modułów z najdłuższego łańcucha (src/widoki/indeks.js, src/widoki/kopia.js, src/widoki/ustawienia.js, src/widoki/ustawienia-tempo.js, src/widoki/ustawienia-sekcje.js, src/widoki/ustawienia-formularz.js, src/dane/ustawienia.js, src/dane/walidacja.js, src/silnik/tempo.js, src/silnik/bledy.js, src/silnik/katalog.js, src/dane/magazyn.js). Do tego `<link rel="preload" href="data/ceny.json" as="fetch" crossorigin>` dla czterech plików danych, wtedy wodospad spada do 1–2 rund.

_Źródło: performance_

### P3 · KOD · `src/widoki/start-dane.js:93`

`wynikZMigawki` buduje pełny `WynikWyceny` ze zmyślonymi polami (`minimum: 0`, `czyMinimum: false`, `cenaMiesieczna: null`, `cenaZaokraglona: m.cena`) tylko po to, żeby spełnić typ parametru `kosztZlecenia`, które czyta wyłącznie `linie`, `dojazd.km`, `minutyNormowe` i `wizytWMiesiacu` (silnik/koszt.js:106-114). Gdy `kosztZlecenia` zacznie czytać któreś z tych pól, realna stawka na starcie policzy się z fałszywych zer i typechecker tego nie wykryje. Zmiana: w silnik/koszt.js:19 zawęzić `WejscieKosztu.wynik` do `Pick<WynikWyceny, 'linie' | 'dojazd' | 'minutyNormowe' | 'wizytWMiesiacu'>`, przekazywać migawkę wprost i usunąć `wynikZMigawki`.

_Źródło: code-quality_

### P3 · KOD · `src/widoki/ustawienia-sekcje.js:254`

`trescWojewodztwa` woła `katalog.wojewodztwo(ustawienia.wojewodztwoId)` i `mieszkanieWzorcowe` bez obsługi BladWejscia('nieznane_wojewodztwo'). Walidacja ustawień (także z pliku kopii) sprawdza tylko wzorzec identyfikatora, a nie obecność id w data/rynek.json. Scenariusz: wczytanie kopii z `wojewodztwoId: "abc"` (ręcznie poprawiony plik albo id zmienione później w rynek.json). Od tej chwili `#/ustawienia` i krok 1 kreatora kończą się ekranem błędu, a województwa nie da się poprawić, bo zmienia się je właśnie tam. Akcja: w `trescWojewodztwa` (i w `kartaTempa` przy `mieszkanieWzorcowe`) brać `katalog.wojewodztwa.some(w => w.id === id) ? id : null` i pokazywać wiersz jako „Średnia krajowa”, żeby użytkownik mógł wybrać województwo od nowa.

_Źródło: correctness_

### P3 · TEST · `src/widoki/start-dane.js:58`

Gałąź `dzien === null` w `czyCzekaNaCzas` nie ma testu. Termin, z którego nie da się odczytać dnia, ma dawać zadanie „Wpisz czas pracy”, a zestaw przejdzie po zamianie na `dzien !== null && dzien[1] <= dzis`, która takie zlecenie ukryje. Poprawka: dopisz w src/widoki/start-dane.test.js asercję `doZrobienia([przyjeta('zly', 'jutro rano')], DZIS).map((z) => z.tytul)` → `['Wpisz czas pracy']`.

_Źródło: test-coverage_

### P3 · KOD · `index.html:13`

Preload dostaje tylko font latin (28 KB). Każdy ekran ma polskie litery (ą, ę, ł, ś, ż, ć, ń, np. „Sobota, 24 października”), a te są w osobnym pliku latin-ext (60 KB, unicode-range U+0100–02BA). Przeglądarka zaczyna go pobierać dopiero wtedy, gdy JS wyrenderuje widok z takim znakiem, czyli po całym grafie modułów i po pobraniu danych. Przy pierwszym uruchomieniu polskie litery długo stoją w foncie zastępczym, wymieszane z Source Sans w tych samych słowach, a po podmianie tekst się przelewa. Zmiana: dodaj obok linii 13 `<link rel="preload" href="fonty/source-sans-3-latin-ext-wght.woff2" as="font" type="font/woff2" crossorigin>`.

_Źródło: performance_

### P3 · KOD · `src/widoki/start-dane.js:162`

`wierszTempa` wywołuje `opisTempa({ ...tempo, zrodlo: 'reczne' })` z podmienionym źródłem tylko po to, żeby silnik nie dokleił „z N zleceń”, a potem sam dokleja ten sam tekst (l.164). To zależność od wewnętrznej gałęzi silnik/tempo.js:109: zmiana opisu ręcznego tempa w silniku zmieni kartę startu. Zmiana: zamienić to wywołanie na formatter krotności z src/ui/format.js. Eksportowane tam `tempo()` nie jest dziś nigdzie używane i daje „1,30×”, więc w `formatTempa` (format.js:13) trzeba zamienić `minimumFractionDigits: 2` na samo `maximumFractionDigits: 2` i użyć `tempo(tempo.wartosc)`.

_Źródło: code-quality_

### P3 · KOD · `src/widoki/ratunek.js:301`

„Wczytaj kopię z pliku” na ekranie ratunkowym od razu nadpisuje dane trybem 'zastap', bez potwierdzenia, a „Wyczyść dane” o potwierdzenie pyta. Przy `blad === 'nowsza_wersja'` w magazynie są poprawne, nowsze dane (np. stara wersja aplikacji z cache SW i dane zapisane przez nową). Wybór starszej kopii bezpowrotnie je kasuje, jeśli użytkownik nie kliknął wcześniej „Pobierz zapisane dane”. Akcja: przed `wczytajKopie` wywołać `dialogPotwierdzenia({ tytul: 'Zastąpić zapisane dane kopią z pliku?', tresc: 'Obecne dane zostaną usunięte. Najpierw możesz je pobrać.', potwierdz: 'Zastąp', czyNiebezpieczne: true })` i przerwać, gdy zwróci false.

_Źródło: correctness_

### P3 · KOD · `src/widoki/start-dane.js:150`

`nazwaMiesiaca` to formatowanie daty z własną kopią `JEZYK = 'pl-PL'` (l.27), własnym `Intl.DateTimeFormat` i powtórzonym kodem wielkiej litery z `dataDnia` (ui/format.js:92-94), choć plik deklaruje „czyste funkcje danych”. Zmiana języka albo reguły wielkiej litery w format.js ominie kartę miesiąca. Zmiana: przenieść `nazwaMiesiaca` do src/ui/format.js obok `dataDnia`, użyć tam wspólnego `JEZYK`, a w start-dane.js usunąć `JEZYK`, `formatMiesiaca` i `nazwaMiesiaca` (start.js importuje ją wtedy z format.js).

_Źródło: code-quality_

### P3 · KOD · `src/widoki/ustawienia-sekcje.js:60`

`otworzArkusz` to ogólny komponent: arkusz z formularzem na `<dialog>` z dodaniem do body, submitem, banerem błędu i sprzątaniem po zamknięciu. Leży jednak w module sekcji ekranu ustawień i ustawienia-tempo.js:11 importuje go stamtąd. Następny ekran z arkuszem formularza (kreator, oferta) będzie musiał importować z widoku ustawień albo skopiować kod. Zmiana: przenieść `otworzArkusz` i typ `WynikZatwierdzenia` do src/ui/komponenty/uklad.js obok `arkusz` i importować go stamtąd w ustawienia-sekcje.js i ustawienia-tempo.js.

_Źródło: code-quality_

## Findingi OPERATOR

### OPERATOR · `sw.js:29`

Plan zakłada hosting na GitHub Pages repo `simpleperfection/wyceny-sprzatanie`, czyli adres projektowy pod originem `simpleperfection.github.io`. Ten origin dzielą wszystkie strony Pages tego konta. `localStorage['wyceny-sprzatanie:stan']` z danymi klientów (nazwiska, telefony, adresy, NIP firmy) oraz Cache Storage service workera są dostępne dla każdej innej strony Pages właściciela. Taka strona może też wysłać do `sw.js` komunikat `zapisz-zasoby`, bo handler `message` nie sprawdza `zdarzenie.source`. Scenariusz: XSS albo złośliwa zależność w innym repo właściciela na github.io → odczyt i podmiana danych wszystkich wycen. Wymiana nagłówków (`frame-ancestors`, `X-Frame-Options`) też nie jest możliwa na Pages, bo meta CSP ich nie obsługuje. Decyzja operatora w etapie 6, który rozstrzyga adres publikacji: własna (sub)domena dla aplikacji albo osobne konto lub organizacja tylko z tą aplikacją. Kodu fazy to nie blokuje.

_Źródło: security_

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/ekran-startowy-actual.png`

Operator: [Manual] ekran-startowy: visual review — Operator action: otwórz visual-diff/ekran-startowy-figma.png obok visual-diff/ekran-startowy-actual.png (viewport: 768×1839; zrzut zrobiony jako 384×920 przy deviceScaleFactor 2, bo makieta to eksport 2x ekranu 360 px; stan e2e/stany/wyceny-do-zrobienia.json, trasa #/start). Kolory różnią się celowo (tokeny wariantu B z SPEC.md). Układ sekcji jest zgodny: nagłówek, dwa kafle wyceny, karta miesiąca z tempem, „Do zrobienia”, baner kopii, dolne menu.

_Źródło: e2e_

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/ustawienia-firmy-actual.png`

Operator: [Manual] ustawienia-firmy: visual review — Operator action: otwórz visual-diff/ustawienia-firmy-figma.png obok visual-diff/ustawienia-firmy-actual.png (viewport: 768×2579; zrzut 384×920 przy skali 2 z --full, stan e2e/stany/ustawienia-mazowieckie.json, trasa #/ustawienia). Dolne menu w połowie zrzutu to artefakt zrzutu całej strony: menu ma position fixed i zostaje na dole okna 920 px. To nie jest defekt.

_Źródło: e2e_

### OPERATOR · `docs/active/etap-5-aplikacja-wyceny/visual-diff/kopia-zapasowa-actual.png`

Operator: [Manual] kopia-zapasowa: visual review — Operator action: otwórz visual-diff/kopia-zapasowa-figma.png obok visual-diff/kopia-zapasowa-actual.png (viewport: 768×1839; zrzut 384×920 przy skali 2, stan e2e/stany/wyceny-do-zrobienia.json, trasa #/kopia). Do oceny: pigułka „0 zleceń” liczy tylko wyceny wykonane (kopia-teksty.js:60, `wykonan`), więc przy jednej wycenie „Przyjęta” pokazuje 0. W makiecie liczba zleceń (7) jest równa liczbie przyjętych na starcie.

_Źródło: e2e_

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 12
- [E2E] odznaczone na podstawie przebiegow testera: 7
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [x] CLI: IU-9: `node --test src/ui/format.test.js src/ui/router.test.js` przechodzi -> PASS (komenda: `node --test src/ui/format.test.js src/ui/router.test.js`)
- [x] CLI: IU-9: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] CLI: IU-9: `grep -rn "innerHTML" src/` nie zwraca wyników -> PASS (komenda: `grep -rn "innerHTML" src/ (brak wyników)`)
- [x] CLI: IU-10: `node --test src/widoki/start-dane.test.js` przechodzi -> PASS (komenda: `node --test src/widoki/start-dane.test.js`)
- [x] CLI: IU-10: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] CLI: IU-11: `node --test src/widoki/ustawienia-formularz.test.js` przechodzi -> PASS (komenda: `node --test src/widoki/ustawienia-formularz.test.js`)
- [x] CLI: IU-11: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] CLI: IU-12: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] CLI: IU-12: `npm test` przechodzi -> PASS (komenda: `npm test`)
- [x] CLI: IU-13: `node --test src/pwa/rejestracja.test.js` przechodzi -> PASS (komenda: `node --test src/pwa/rejestracja.test.js`)
- [x] CLI: IU-13: `node scripts/ikony-zastepcze.mjs` tworzy cztery pliki PNG w `ikony/` -> PASS (komenda: `node scripts/ikony-zastepcze.mjs (4 PNG, bez zmian w git)`)
- [x] CLI: IU-13: `npm run typecheck` przechodzi bez błędów -> PASS (komenda: `npm run typecheck`)
- [x] E2E: 7 flow (szkielet-nawigacja, ekran-startowy-zadania, kreator-ustawien, kreator-ustawien-pominiety, kopia-eksport, ekran-ratunkowy, pwa-manifest) odznaczone skryptem `e2e.mjs ksieguj` (odznaczone 7, fail 0, skip 0, manual 0, bezWpisu 0)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 48 (32) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 7 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 7 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 33 -> 33 -> 32 |
| P3 odrzucone limitem globalnym | 1 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 12 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 3 / 12 (batchowanie: 12 findingow w 3 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 12 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
