# Review fazy 6 — Wycena w nowym wyglądzie

Data: 2026-11-04. Gate: **ZASTRZEZENIA**. Statystyki: P1 0, P2 22, P3 7, OPERATOR 1. E2E: 3 PASS, 0 FAIL, 1 SKIP.

## Findingi P1

Brak.

## Findingi P2

### P2 · E2E · `e2e/stany/oferta-po-terminie.txt:1`

Zamówienie: IU-22, scenariusz `oferta-neutralna` (otwórz oferta.html z fragmentem z `e2e/stany/oferta-po-terminie.txt`, zmierz tło, kolor kwoty i rozmiar tekstu). Sprawdzone uruchomieniem: `odkodujOferte` zwraca dla tego seeda `{ ok: false, powod: 'uszkodzony' }`, więc strona nie pokaże oferty i pomiaru nie da się wykonać. Plik ostatnio zmieniono w etapie 5 (commit 7537790), a korekta IU-22 w planie tylko odnotowuje problem i niczego nie naprawia. Tym samym neutralny wygląd oferty, jedyna jednostka tej fazy dla klienta końcowego, nie ma wykonalnego dowodu E2E. Poprawka: wygenerować seed od nowa przez `zakodujOferte` z polami `trybCeny` i `abonament` i zachować termin ważności w przeszłości. (źródło: spec-compliance)

### P2 · TEST · `src/widoki/kreator-dodatki.js:95`

Nowa wyliczenieDojazdu (gałęzie kmPonad > 0 i „w promieniu”) oraz opis propozycji `w ofercie · …` (linia 50) nie mają testu. Odwrócenie warunku na kmPonad < 0 i usunięcie „w ofercie” przeszły na zielono (mutacja na kopii), więc wyjaśnienie kosztu dojazdu może pokazywać błędne kilometry. Poprawka: wyeksportuj wyliczenieDojazdu i sprawdź dosłownie dla stawek { darmowy_promien_km: 10, klient_zl_km: 2, koszt_firmy_zl_km: 1 }: 5 km daje „Dla klienta: w promieniu 10 km. Twój koszt: …”, a 25 km daje „Dla klienta: 15 km ponad 10 km × 2 zł…”, z kwotami i kmRazem wziętymi z infoDojazdu. (źródło: test-coverage)

### P2 · TEST · `src/widoki/kreator-pomieszczenia.js:84`

Przebudowana kartaZwinieta (jedna linia `m² · brud`) i link „Inne rodzaje brudu” (linia 104) nie mają testu. Usunięcie metrażu z opisu ([...brud].join) przeszło na zielono (mutacja na kopii), a metraż to wejście ceny widoczne na zwiniętej karcie. Poprawka: wyeksportuj kartaZwinieta i na atrapie sprawdź dosłowny tekst .karta-pomieszczenia__opis dla p = { m2: 12, brud: [{ id: 'kurz', poziom: 2 }, { id: 'tluszcz', poziom: 0 }] }, czyli `12 m² · kurz 2`, bez pozycji z poziomem 0, oraz `12 m²` bez brudu. (źródło: test-coverage)

### P2 · TEST · `src/widoki/kreator-pozycje.js:52`

Przepisana opisPozycji (dopłata lub zwykła pozycja, z linią lub bez) nie ma testu. Usunięcie prefiksu „dopłata · ” i zastąpienie `${m2(linia.ilosc)} × ${kwotaJednostki(linia.cenaJedn)}` samą ceną jednostkową przeszły na zielono (mutacja na kopii). Poprawka: wyeksportuj opisPozycji i sprawdź cztery wyniki dosłownie: { typ: 'doplata' } bez linii daje `dopłata · X/m²`, z linią `dopłata · 20 m² × X`, zwykła pozycja bez linii `X/m²`, z linią `20 m² × X`. (źródło: test-coverage)

### P2 · TEST · `src/widoki/kreator-usluga.js:129`

Nowe gałęzie opcjaUslugi (`!czyWybrana`, `!opis && warianty.length === 0`, podpowiedź ceny tylko pod wybraną usługą) nie mają testu. Usunięcie wczesnego `if (!czyWybrana) return [opcja]` przeszło na zielono (mutacja na kopii): podpowiedzi i chipy wariantów pojawiałyby się pod każdą usługą, wbrew R9. Poprawka: wydziel opcjaUslugi do funkcji z argumentami i na atrapie sprawdź, że niewybrana usługa zwraca jeden element bez .opcja-uslugi__szczegoly, a wybrana z wariantami ma dosłowną podpowiedź i radiogrupę 'kreator-wariant'. (źródło: test-coverage)

### P2 · TEST · `src/widoki/kreator-wspolne.js:71`

Powroty kreatora z planu (tekst verbatim „Wycena” z pierwszego kroku, adres #/wyceny zamiast #/start) nie mają testu; pliku kreator-wspolne.test.js nie ma. Mutacje na kopii przeszły na zielono: adresWstecz na sciezka('start') i wsteczTekst zawsze „Wycena” (linia 85). Bez testu są też pokazKomunikat i wycenaKroku z „Wróć do wycen” (linie 162, 176). Poprawka: wyeksportuj adresWstecz i tekst powrotu albo dodaj test ramaKroku na atrapie: krok 'usluga' bez numeru daje '#/wyceny' i „Wycena”, z numerem adres zapisanej wyceny, krok 'dodatki' adres i etykietę poprzedniego kroku. (źródło: test-coverage)

### P2 · KOD · `src/widoki/kreator-wspolne.js:87`

`naglowekKroku` po zbudowaniu nagłówka sięga do wewnętrznych klas komponentu z src/ui/komponenty/uklad.js: `querySelector('.naglowek__gora')?.append(...)` i `querySelector('.naglowek__tytul')?.before(...)`. Widok zależy więc od prywatnego markupu warstwy ui, a `?.` po cichu odrzuca licznik „Krok n z 5” i pasek postępu. Skutek: zmiana nazwy klasy albo struktury `naglowek` usuwa oba elementy ze wszystkich kroków bez błędu typów i bez wyjątku. Testy jednostkowe też tego nie złapią, bo `querySelector` w tests/atrapa-dom.js zawsze zwraca null. Zmiana: dodaj do `naglowek` opcje, np. `krok?: string` (tekst w `.naglowek__gora`) i `pasek?: Node` (przed `h1`), i przekaż je z `naglowekKroku` zamiast przeszukiwać gotowy element. (źródło: code-quality)

### P2 · TEST · `src/widoki/oferta-edycja-sekcje.test.js:57`

Stub zapisz = () => null nie sprawdza argumentów i nigdy nie jest wołany: AtrapaElementu.querySelector zawsze zwraca null, więc zapisujPole (oferta-edycja-sekcje.js:177) w teście wychodzi na `if (!wejscie) return element` i nie podpina zapisu. Mutacja na kopii zapisująca adres jako termin (`(adres) => ({ klient: { termin: adres } })`, linia 199) przeszła na zielono. Test przepuszcza więc zapis danych oferty do złego pola po przeniesieniu pól pod „Więcej”. Poprawka: atrapa querySelector('input') zwraca pole, a test ustawia value='ul. Lipowa 1', wywołuje obsługę change i sprawdza, że zapisz dostało dokładnie { klient: { adres: 'ul. Lipowa 1' } }, oraz { klient: { termin: null } } dla pustego terminu. (źródło: test-coverage)

### P2 · TEST · `src/widoki/oferta-edycja-sekcje.test.js:75`

kartaZakresu ma test tylko dla czyZmieniony: true i trybu odczytu. Zamiana `czyZmieniony ? notkaZakresu() : null` na zawsze notkę (oferta-edycja-sekcje.js:209) oraz usunięcie `wiecej({}, notkaZakresu())` z trybu edycji (linia 246) przeszły na zielono (mutacja na kopii). Poprawka: test czyZmieniony: false z dosłownym tekst(szczegoly) === 'Pokaż zakresW cenieMycie okienPoza cenąMycie żaluzji' i bez „Przywróć domyślny” oraz test, który klika „Edytuj” przez obslugi.get('click') i sprawdza NOTKA_ZAKRESU pod „Więcej”. Tak samo trzeba pokryć gałąź edycji w kartaWarunkow. (źródło: test-coverage)

### P2 · TEST · `src/widoki/podsumowanie-karty.js:168`

Gałęzie kart podsumowania bez testu: wszystkie fixture'y mają abonament: null, więc „za wizytę” i oba wiersze miesiecznie (linie 126 i 168) nigdy się nie wykonują. Podstawienie abonament?.miesiecznie zamiast abonament?.zostajeMiesiecznie w „Zostaje dla Ciebie” przeszło na zielono (mutacja na kopii), czyli właściciel widziałby przychód jako zysk. Bez testu są też opisCeny dla statusVat 'zwolniony' i dla rozbicia z dojazdem, przeniesione do „Więcej”, oraz propozycje: null. Poprawka: fixture abonament { wizyt: 4, zaWizyte: 300, miesiecznie: 1200, zostajeMiesiecznie: 820 } z asercjami `miesięcznie (4 wizyt): 1200 zł` w kartaCeny i `miesięcznie (4 wizyt): 820 zł` w kartaZostaje, a do tego dosłowne opisy `bez VAT (firma zwolniona)` i `sprzątanie … + dojazd …`. (źródło: test-coverage)

### P2 · TEST · `src/widoki/podsumowanie-karty.test.js:45`

Żaden test nie sprawdza paska rynku z pasekRynku (podsumowanie-karty.js:105-107). Zamiana pozycji kreski mediany ze znacznikiem ceny (pozycja(rynek.mediana) z pozycja(brutto)) oraz tekst `rynek od ${zl(rynek.do)}` przeszły na zielono (mutacja na kopii). Atrapa zbiera --pozycja w `wlasciwosci`, ale żaden test tego pola nie czyta. Poprawka: dla RYNEK i brutto 300 asercje na dosłowne wlasciwosci.get('--pozycja') elementów .wykres-rynku__kreska i .wykres-rynku__punkt oraz --koniec zakresu, a także tekst `rynek od 120 zł do 450 zł` w .karta-rynku__zakres. Warto też sprawdzić, że klik „?” dostaje akapity z wyjasnienieMediany z województwem wyceny. (źródło: test-coverage)

### P2 · TEST · `src/widoki/podsumowanie-karty.test.js:94`

Test „stan Więcej trzyma ekran” startuje z czyOtwarte: true, nie zmienia open przed zdarzeniem toggle i oczekuje [[true]]. Przepuszcza implementację naPrzelacz(czyOtwarte) zamiast naPrzelacz(szczegoly.open) w podsumowanie-karty.js:165. Sprawdzone mutacją na kopii: suite zielony. Skutek takiego błędu: zwinięte „Więcej” rozwija się po każdym przerysowaniu. Poprawka jak w szybka-wynik-karta.test.js:121: przed wywołaniem toggle ustaw szczegoly.open = false i oczekuj [[false]]. (źródło: test-coverage)

### P2 · KOD · `src/widoki/podsumowanie.js:47`

Powrót do modułu Wycena jest zdefiniowany w fazie pięć razy, w tym dwa razy identycznie: `POWROT_DO_WYCEN = { wstecz: sciezka('wyceny'), wsteczTekst: 'Wycena' }` w podsumowanie.js:47 i pytania.js:32. Do tego `POWROT_DO_WYCEN = 'Wycena'` w kreator-wspolne.js:55 (ta sama nazwa, inny typ: string zamiast obiektu), `POWROT = 'Wycena'` w oferta-edycja.js:37 i literał w `NAGLOWEK` w szybka.js:54. Reguła „Organizacja kodu”: stała w dwóch miejscach to od razu jedno źródło. Skutek: zmiana tekstu albo celu powrotu (tekst jest verbatim w planie) rozjedzie ekrany po cichu, a ta sama nazwa o dwóch kształtach zmyli przy przenoszeniu kodu. Zmiana: wyeksportuj z kreator-wspolne.js jeden `POWROT_DO_WYCEN` w kształcie obiektu (podsumowanie.js, pytania.js, szybka.js i oferta-edycja.js już importują ten moduł), użyj go tam, a w oferta-edycja.js bierz z niego `wsteczTekst`. (źródło: code-quality)

### P2 · KOD · `src/widoki/podsumowanie.js:105`

Reguła domeny siedzi w widoku. `ukladAkcji` decyduje, która akcja jest główna dla danego statusu (`do_wyslania` → zaplanuj/oferta/przyjeta), a typ `AkcjaEkranu = AkcjaWyceny | 'oferta'` i dołączanie 'oferta' przez `czyStatusOferty` (linia 157) rozszerzają kontrakt akcji poza modułem, który go definiuje. Tymczasem `akcjeWyceny` i `AkcjaWyceny` są w src/kreator/podsumowanie.js, a nagłówek pliku mówi „widok tylko rysuje”. Skutek: zmiana hierarchii akcji albo nowy status wymaga zmian w dwóch warstwach, a test czystej reguły (podsumowanie.test.js) ładuje cały graf importów widoku. Zmiana: przenieś `ukladAkcji`, `AkcjaEkranu` i `AkcjaZOpisem` do src/kreator/podsumowanie.js i dołącz tam 'oferta' (np. `ukladAkcjiWyceny(status, czyZamknieta, czyDoZaplanowania)`), a w widoku zostaw tylko `opisAkcji` i rysowanie. Test przenieś do src/kreator/podsumowanie.test.js. (źródło: code-quality)

### P2 · TEST · `src/widoki/podsumowanie.js:122`

Testy podsumowanie.test.js obejmują tylko ukladAkcji, a nowe opisAkcji i akcjeZapisanej nie mają testu. Mutacje na kopii przeszły na zielono: „Klient zrezygnował” zapisujący naStatus('przyjeta') (linia 122, czyli zły status wyceny), „Przygotuj ofertę” przy wycenie ze zleceniem zamiast „Pokaż ofertę” (linia 119) i podtytul bez nazwy klienta (linia 52). Bez testu jest też tytulWyceny z fallbackiem „Podsumowanie” (linia 55). Poprawka: wyeksportuj opisAkcji i sprawdź dosłownie dla każdej akcji tekst i adres, a dla 'przyjeta' i 'odrzucona' wywołanie atrapy naStatus z dokładnym argumentem; dodaj 'Pokaż ofertę' przy czyZamknieta=true, podtytul „Pani Test · nr 1/10/2026” i fallback tytułu. (źródło: test-coverage)

### P2 · TEST · `src/widoki/podsumowanie.js:184`

Bramka „wycena ze zleceniem jest tylko do odczytu” w karty() nie ma testu odmowy. Test kartaCeny z null sprawdza tylko komponent, a nie to, że ekran przekazuje null. Mutacja na kopii zastępująca `czyEdytowalna ? () => naZmien(widok.cena.brutto) : null` przez `() => naZmien(0)` przeszła na zielono: wraca „Zmień” przy zamkniętej wycenie, a do arkusza trafia zła kwota. Poprawka: wyeksportuj karty albo wydziel z niej funkcję i sprawdź dla czyZamknieta=true brak [data-akcja="zmien"] i brak „Przelicz” w banerach, a dla false, że obsługa naZmien dostaje brutto 300. (źródło: test-coverage)

### P2 · KOD · `src/widoki/podsumowanie.js:204`

Zamówienie: IU-19 (Cel: „Pięć kroków kreatora w nowym wyglądzie”, Podejście: „pasek postępu w nowym wyglądzie”, scenariusz `kreator-wyglad-cena`: każdy krok ma tekst ≥ 17 px) oraz R8. Realizacja częściowa: nowy wygląd działa tylko na krokach 1–4. Krok Cena rysuje `pasekPostepu` poza `.naglowek` (src/widoki/podsumowanie.js:204), a reguły `.naglowek .postep*` z src/style/kreator.css:15-34 go nie obejmują. Zostaje więc stary pasek z komponenty.css:169-187: widoczne etykiety kroków w `--tekst-drobny` (14 px), ucinane wielokropkiem, z dolną linią. Krok nie ma też „Krok 5 z 5”, a tytuł to „Podsumowanie” zamiast nazwy kroku, choć korekta IU-19 mówi: „Tytuł kroku to nazwa kroku z makiety”. Korekta planu wymienia `podsumowanie.js` tylko jako powód zostawienia reguł `.postep` w komponenty.css i nie zwalnia kroku Cena z nowego wyglądu. Poprawka: w trybie kreatora zbudować nagłówek jak `naglowekKroku` z kreator-wspolne.js, z paskiem wewnątrz `.naglowek` i tekstem „Krok 5 z 5”. (źródło: spec-compliance)

### P2 · TEST · `src/widoki/pytania.js:63`

powrotPytan ma dwie gałęzie (szybka albo kreator) i steruje adresem powrotu oraz adresem przycisku „Gotowe”, ale test nie ma żadnej; pytania.test.js importuje tylko tekstBleduPytan. Mutacja na kopii kierująca szybką wycenę do adresKroku('usluga') z tekstem „Usługa” przeszła na zielono. Zmieniony pokazBrakWyceny („Wróć do wycen”, #/wyceny, linia 198) też nie ma testu. Poprawka: wyeksportuj powrotPytan i sprawdź deepEqual dla rodzaj 'szybka' { wstecz: '#/szybka?wycena=w1', wsteczTekst: 'Szybka wycena' } oraz dla dokładnej { wstecz: adres kroku usluga, wsteczTekst: 'Usługa' }. (źródło: test-coverage)

### P2 · TEST · `src/widoki/szybka-wynik-karta.test.js:103`

Test „główna akcja stoi przed Kopiuj tekst” sprawdza tekst i data-akcja, a helper karta() podaje puste naKopiuj i naDokladna bez sprawdzenia. Podpięcie naKopiuj pod „Dokładna wycena” przeszło na zielono (mutacja na kopii szybka-wynik.js:92-93), choć w tej fazie zmieniono kolejność tych przycisków. Bez testu są też gałąź 'blad' (linia 79: BLAD_METRAZU i BLAD_LICZENIA) i czySkopiowano: true („Skopiowano”). Poprawka: mock.fn() dla obu obsług, klik przez obslugi.get('click') i liczba wywołań każdej (1 i 0), test stanu { stan: 'blad', kod: 'metraz' } z dosłownym tekstem błędu i wyłączonymi przyciskami oraz test czySkopiowano: true z tekstem 'Skopiowano'. (źródło: test-coverage)

### P2 · KOD · `src/widoki/szybka-wynik.js:14`

Kontrakt `StanWiecej` (`{ czyOtwarte, naPrzelacz }`) ma dwie definicje dodane w tej fazie: szybka-wynik.js:14 i podsumowanie-karty.js:23. Ten sam kształt jest też wpisany inline w szybka.js:87 i :127, a `ObslugaKart` w podsumowanie.js:41 rozbija go na `czyKosztyOtwarte()` i `naPrzelaczKoszty`. Powiązanie `szczegoly.open = czyOtwarte` + `addEventListener('toggle', ...)` występuje trzeci raz (szybka-wynik.js:58, podsumowanie-karty.js:164, szybka.js:133-140), czyli przekracza próg wydzielenia z reguły „Organizacja kodu”. Skutek: każdy kolejny ekran z zachowaniem stanu „Więcej” po przerysowaniu dopisze czwartą kopię, a zmiana kontraktu w jednym miejscu nie zostanie zauważona w pozostałych. Zmiana: zdefiniuj typ `StanWiecej` raz w src/ui/komponenty/uklad.js, dodaj do `wiecej` opcję `stan?: StanWiecej`, która ustawia `open` i podpina `toggle`, i usuń ręczne powiązania oraz typy z trzech widoków. (źródło: code-quality)

### P2 · TEST · `src/widoki/szybka.js:336`

Nowa ścieżka kopiowania nie ma testu. Podanie cytat (w zwiniętym details) zamiast zapasowy do kopiujDoSchowka oraz usunięcie otwierania „Więcej” po odmowie schowka (`czyWiecejOtwarte ||= !czyWSchowku`, linia 340) przeszły na zielono (mutacja na kopii). Test szybka-wynik-karta.test.js:110 sprawdza tylko, gdzie w drzewie leży zapasowy, a nie że szybka.js go używa. Od wyniku kopiowania zależy też zapis statusu „wysłana”. Poprawka: wydziel obsługę kopiowania do testowalnej funkcji, wstrzyknij kopiujDoSchowka jako atrapę i sprawdź: argument to element zapasowy; przy false stan „Więcej” jest true, a selectAllChildren dostaje nowy cytat; przy true oznaczWyslana jest wołane z id wyceny. (źródło: test-coverage)

### P2 · KOD · `src/widoki/szybka.js:395`

Zamówienie: IU-20, Podejście: „`szybka.js` zostaje poniżej 300 linii”. Plik ma 395 linii (391 przed fazą). Korekta dopisana w tym samym diffie sama stwierdza „warunek NIE jest spełniony”, a nie uchyla go decyzją, więc zamówienie stoi niezrealizowane. Skutek jest wyłącznie strukturalny: zachowanie dla użytkownika się nie zmienia. Poprawka opisana w korekcie: przenieść `otworzWyborUslugi`, `polaFormularza`, `licznikiPozycji` i `dodatkiAgd` do nowego `src/widoki/szybka-pola.js`, a `ustawOczekiwanie` do `szybka-wynik.js`. Alternatywa: właściciel formalnie uchyla ten warunek w planie. (źródło: spec-compliance)

## Findingi P3

### P3 · KOD · `src/widoki/podsumowanie.js:130`

Jeden render zapisanej wyceny czyta cały stan z localStorage 4 razy: `rysuj`, `widokPodsumowania` (src/kreator/podsumowanie.js:127), `kartaZlecen` (linia 130) i `kartaWpisowCzasu` (linia 142). Każdy odczyt to `getItem`, `JSON.parse` i walidacja `jestStanem` wszystkich rekordów, a dane są w tym czasie te same. Render następuje przy otwarciu ekranu i po każdej akcji (status, cena ręczna, Przelicz), nie przy każdym naciśnięciu klawisza. Pomiar `magazyn.wczytaj()` na stanie powielonym z seeda e2e/stany/wyceny-do-zrobienia.json, na komputerze w Node: 100 wycen (116 KB) 0,87 ms, 500 wycen (579 KB) 3,98 ms, 2000 wycen (2,3 MB) 16 ms na odczyt. Daje to około 16 ms na render przy 500 wycenach i 64 ms przy 2000. Koszt rośnie liniowo z liczbą wycen. Seed nie ma zleceń, więc stan z realnymi zleceniami waliduje się dłużej, a telefonu nie mierzyłem. Linie 130 i 142 pochodzą sprzed fazy 6, ale faza zmieniła wywołującą je funkcję `elementyEkranu`. Zmiana: w `rysuj` przekaż już wczytany `stan` przez `elementyEkranu` do `kartaZlecen(w, stan)` i `kartaWpisowCzasu(w, stan, katalog)`, a wywołania `wczytajStan(magazyn)` z linii 130 i 142 usuń. To zdejmuje 2 z 4 odczytów, czyli połowę tego kosztu. (źródło: performance)

### P3 · TEST · `src/widoki/szybka-wynik-karta.test.js:12`

Test dodany w tej fazie ma prywatną, luźniejszą kopię atrapy (`AtrapaElementu`, `atrapaDokumentu`, `tekst`, `znajdz`, ręczne beforeEach/afterEach na `document`), choć ta sama faza dodała wspólny tests/atrapa-dom.js. Kopia nie ma `style`, `classList` ani podmiany `HTMLElement`, więc rozjedzie się ze wspólną przy pierwszej zmianie karty. Zmiana: usuń linie 11-60 oraz blok beforeEach/afterEach, zaimportuj `AtrapaElementu, tekst, uzyjAtrapyDom, znajdz` z ../../tests/atrapa-dom.js i wywołaj `uzyjAtrapyDom()` w describe. (źródło: code-quality)

### P3 · KOD · `src/widoki/podsumowanie.js:122`

`opisAkcji` kończy się bezwarunkowym `return` dla 'Klient zrezygnował', więc nowa wartość `AkcjaWyceny` przejdzie typecheck i narysuje wiersz zmieniający status wyceny na `odrzucona`. Zmiana: zamień łańcuch `if` na mapę `/** @type {Record<AkcjaZOpisem, () => OpisAkcji>} */` z osobnym kluczem `odrzucona`, żeby brak obsługi nowej akcji był błędem tsc. (źródło: code-quality)

### P3 · KOD · `src/widoki/podsumowanie.js:202`

Nagłówek kroku Cena sam składa powrót: adres ma wpisane na sztywno `adresKroku('chemia', w.id)`, a tekst liczy z `KROKI_KREATORA[INDEKS_KROKU_CENY - 1]?.etykieta`. To dwa źródła tego samego poprzedniego kroku, obok istniejącego `adresWstecz` w kreator-wspolne.js. Po wstawieniu kroku adres i etykieta wskażą różne ekrany. Zmiana: wyeksportuj z kreator-wspolne.js `powrotKroku(krok, wycena)` zwracające `{ wstecz, wsteczTekst }`, użyj go w `naglowekKroku`, a tutaj wywołaj `...powrotKroku('cena', w)`. (źródło: code-quality)

### P3 · KOD · `src/style/tokeny.css:35`

Faza usunęła ostatnie użycia tokenów: `--zakreslacz-mocny` (klasa `.zakreslacz`) i `--marka-granat` (linia 13, wcześniej oferta.css). Oba zostały martwe; w src/style/ nie ma już żadnego `var()` z nimi. Zmiana: usuń linie 13 i 35 z tokeny.css oraz wzmiankę `// --marka-granat` w scripts/ikony-zastepcze.mjs:13. (źródło: code-quality)

### P3 · KOD · `src/widoki/oferta-klient.js:142`

Faza usunęła regułę `.oferta__kwota--dodatek` z oferta.css, ale widok nadal przekazuje tę klasę, a parametr `klasaWartosci` w `wiersz` (linia 98) nie ma innego użycia. Zmiana: usuń trzeci argument `'oferta__kwota--dodatek'` w linii 142 i parametr `klasaWartosci` z `wiersz` w linii 98. (źródło: code-quality)

### P3 · KOD · `src/widoki/podsumowanie-karty.js:83`

Tekst pomocniczy spod „?” może wywrócić cały ekran wyceny. Scenariusz: plik kopii zawiera wycenę z `wynik.wojewodztwo = { id: 'mazowieckie', nazwa: 'Mazowieckie' }` albo `{}`. Walidator `jestMigawkaWyniku` (src/dane/wyceny.js:129) to przepuszcza, bo sprawdza tylko `jestObiektem(x.wojewodztwo)`. Po otwarciu `#/wycena/<id>` albo kroku Cena `karty()` woła `kartaCeny` → `pasekRynku` → `wyjasnienieMediany`, a ta od razu, jeszcze przed kliknięciem „?”, woła `miejscownikWojewodztwa(nazwa)`. Ta funkcja rzuca `BladFormatu` (sprawdzone uruchomieniem: `THROW BladFormatu` dla obu wejść). `catch` w `karty()` (src/widoki/podsumowanie.js:186) przekazuje błąd do `zglosBladKreatora`, a ta rethrowuje wszystko poza BladWyceny, BladMagazynu, BladWejscia i BladKatalogu. Router pokazuje więc ekran błędu i użytkownik traci dostęp do ceny, oferty i „Usuń wycenę”. Przed fazą 6 podsumowanie nie czytało `nazwa`, więc taka kopia działała. Dane z `data/rynek.json` pasują do wzorca, stąd P3: wymaga to ręcznie zmienionej kopii. Akcja: w `wyjasnienieMediany` złap `BladFormatu` z `miejscownikWojewodztwa(nazwa)` i ustaw wtedy `gdzie = 'na rynku'`, żeby zła nazwa zmieniała tylko zdanie w arkuszu, a nie cały ekran. (źródło: correctness)

## Findingi OPERATOR

### OPERATOR · `src/style/tokeny.css:47`

Operator: [Manual] Rozstrzygnij próg tekstu w scenariuszach fazy 6 — Operator action: potwierdź, że „tekst ≥ 17 px” dotyczy tekstu podstawowego (R8 i makieta), albo zamów podniesienie tekstu drugorzędnego do 17 px. `kreator-wyglad-cena`, `szybka-pytania-wyglad` i `podsumowanie-wyglad` mają PASS przy tej pierwszej interpretacji. Tekst podstawowy ma 17 px, ale etykiety i opisy mają 15 px (--tekst-maly), a pigułki statusu i pasek postępu 14 px (--tekst-drobny). Te same tokeny i rozmiary są w docs/operator/aplikacja-modulowa-makiety.html, więc to nie jest rozjazd z makietą, tylko z dosłownym brzmieniem scenariuszy. Przykłady: „Krok 2 z 5”, tytuł grupy dodatków „Mycie okien”, ceny pozycji w dodatkach, „Widełki dla klienta”. (źródło: e2e)

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 10
- [E2E] odznaczone na podstawie przebiegow testera: 3
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 1
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [x] CLI: `node --test src/silnik/parytet.test.js` (IU-19) -> PASS (komenda: `node --test src/silnik/parytet.test.js`)
- [x] CLI: `npm run typecheck` (IU-19) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/kreator/szybka.test.js src/widoki/szybka-wynik.test.js src/widoki/pytania.test.js` (IU-20) -> PASS (komenda: `node --test src/kreator/szybka.test.js src/widoki/szybka-wynik.test.js src/widoki/pytania.test.js`)
- [x] CLI: `npm run typecheck` (IU-20) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/widoki/oferta-edycja.test.js src/widoki/oferta-edycja-sekcje.test.js src/kreator/podsumowanie.test.js` (IU-21) -> PASS (komenda: `node --test src/widoki/oferta-edycja.test.js src/widoki/oferta-edycja-sekcje.test.js src/kreator/podsumowanie.test.js`)
- [x] CLI: `npm test` (IU-21) -> PASS (komenda: `npm test`)
- [x] CLI: `npm run typecheck` (IU-21) -> PASS (komenda: `npm run typecheck`)
- [x] Grep: `grep -c "marka-zielen" src/style/oferta.css` (IU-22) -> PASS (komenda: `grep -c "marka-zielen" src/style/oferta.css`, wynik 0)
- [x] CLI: `node --test src/widoki/oferta-klient.test.js src/oferta/kodek.test.js` (IU-22) -> PASS (komenda: `node --test src/widoki/oferta-klient.test.js src/oferta/kodek.test.js`)
- [x] CLI: `npm test` (IU-22) -> PASS (komenda: `npm test`)
- [x] E2E: 3 flow fazy 6 -> PASS (e2e.mjs ksieguj: odznaczone 3, fail 0, skip 1, manual 0, bezWpisu 0)
- [ ] E2E SKIP: `oferta-neutralna` — brak-seeda: seed `e2e/stany/oferta-po-terminie.txt` nie dekoduje się (finding P2 E2E), kopia w Operator checklist

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 25 (17) |
| Flagi warstw | ui=true dane=false typowanie=true nowyModul=false |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 4 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 3 / 0 / 1 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 32 -> 32 -> 30 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 22 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 6 / 22 (batchowanie: 22 findingow w 6 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 22 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
