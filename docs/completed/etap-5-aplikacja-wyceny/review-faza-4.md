# Review fazy 4 — Kreator dokładnej wyceny

Gate: **BLOKUJE** (P1: 1, P2: 20, P3: 13, OPERATOR: 0).

## Statystyki

- Findingi po weryfikacji: 34 (P1 1, P2 20, P3 13, OPERATOR 0); obalone: 0.
- Według typu: KOD 27, TEST 7, E2E 0.
- Przebiegi E2E: PASS 3, FAIL 1 (`kreator-okna-minimum`, brak informacji o minimum zlecenia), SKIP 0.

## Findingi P1

### P1 · KOD · `src/kreator/stan.js:175`

Plan IU-14 mówi, że zmiana usługi przy niepustym zakresie wymaga potwierdzenia i czyści zakres. Kod robi więcej, niż zamówiono: `zmienWybor` przy innej usłudze przenosi `dodatki` (i `dojazdKm`) ze starej wyceny, a nowa usługa nie jest sprawdzana pod kątem swojej listy `dodatki`. Przykład z danych: mieszkanie_standard z dodatkiem „tapicerka” w trybie `w_cenie` zmienione na „okna” albo „mycie_kostki”. Usługi w trybie pozycji nie mają `dodatki` w data/ceny.json, a mimo to dodatek zostaje w wejściu i `linieDodatkow` w src/silnik/cena.js:102 dalej dolicza go do ceny. Krok dodatków (src/widoki/kreator-dodatki.js:73) pokazuje wtedy „Ta usługa nie ma dodatków.”, więc ukrytej dopłaty nie da się zobaczyć ani usunąć (`ustawDodatek` odrzuca usługę spoza listy). Przy zmianie na biura znika podobnie tapicerka, bo biura mają tylko okna, AGD i dywany. Do tego potwierdzenie pojawia się tylko przy niepustych pomieszczeniach albo pozycjach, więc same dodatki przechodzą bez pytania. Poprawka: przy zmianie usługi zostawić tylko dodatki z `uslugaId` z `nowaUsluga.dodatki` albo wyczyścić je razem z zakresem.

*(źródło: spec-compliance)*

## Findingi P2

### P2 · KOD · `src/kreator/podsumowanie.js:49`

`STATUSY_DECYZJI_KLIENTA = new Set(['do_wyslania', 'wyslana'])` to druga definicja tej części `PRZEJSCIA` z `src/dane/wyceny.js:53-60`, z której wolno przejść do `przyjeta` i `odrzucona`. Gdy ktoś zmieni `PRZEJSCIA`, np. doda przejście `szkic → odrzucona` albo usunie `do_wyslania → przyjeta`, `akcjeWyceny` dalej pokaże przyciski, a kliknięcie skończy się `BladWyceny('przejscie')`. Poprawka: eksportować z `wyceny.js` funkcję `dozwolonePrzejscia(status)` (albo `czyMoznaPrzejsc(status, nowy)`) i w `akcjeWyceny` wybierać 'przyjeta'/'odrzucona' według niej zamiast lokalnego zbioru.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/podsumowanie.js:53`

Scenariusz IU-16 `kreator-okna-minimum` zamawia podsumowanie z ceną 150 zł i informacją o minimum zlecenia (4 okna = 120 zł podniesione do minimum). Takiej informacji nie ma nigdzie w tym przebiegu. Migawka z `przelicz` (src/kreator/stan.js:117-122) nie zapisuje `minimum` ani `czyMinimum`. `wynikZMigawki` wpisuje na sztywno `minimum: 0, czyMinimum: false`. Karty w src/widoki/podsumowanie-karty.js nie mają tekstu o minimum. Notka „Minimum zlecenia: {min} zł.” w kroku pozycji (src/widoki/kreator-pozycje.js:176) pojawia się tylko przy usługach m² z progami, więc przy oknach jej nie ma. Użytkownik widzi 150 zł bez wyjaśnienia, a scenariusz z planu nie może przejść.

*(źródło: spec-compliance)*

### P2 · KOD · `src/kreator/podsumowanie.js:59`

`mnoznikKlienta` drugi raz definiuje regułę VAT z `cenaDlaKlienta` (`src/silnik/vat.js:44-50`): czynny podatnik przy podstawie `netto` dolicza VAT, a zwolniony bierze kwotę bez zmian. Ma też własną stałą `PROCENT`. Według tej kopii przeliczane są widełki rynku i dojazd w rozbiciu ceny. Zmiana reguły w `vat.js`, np. nowa podstawa ceny albo inna stawka dla usługi, nie dotrze do widełek, a położenie ceny („w widełkach” / „powyżej”) będzie liczone inną regułą niż cena. Poprawka: przeliczać `m.widelki.od`, `m.widelki.do` i `m.dojazd.kwota` przez `cenaDlaKlienta({ kwota, podstawaCeny: m.podstawaCeny, statusVat: m.statusVat, stawkaVatProc: m.stawkaVatProc }).brutto` albo eksportować z `vat.js` funkcję `mnoznikCenyKlienta` i usunąć lokalną kopię.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/podsumowanie.js:99`

Funkcja `abonament` liczy to samo, co jest już zdefiniowane w dwóch innych miejscach. Kopiuje stałą `WIZYT_ZLECENIA_JEDNORAZOWEGO` (linia 45, komentarz „Jak w src/dane/wyceny.js”) i regułę `czyAbonament` z `wyceny.js:185`. `zostajeMiesiecznie = koszt.zostaje * wizyt` liczy drugi raz `koszt.miesiecznie.zostaje` z `kosztZlecenia` (`koszt.js:118`). Pierwsza zmiana progu abonamentu albo sposobu liczenia wartości miesięcznych rozjedzie podsumowanie z zapisem wykonań (`dodajWykonanie`) i z kosztem. Poprawka: eksportować `czyAbonament` z `wyceny.js` i jego używać zamiast lokalnej stałej, a `zostajeMiesiecznie` brać z `koszt.miesiecznie.zostaje`.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/podsumowanie.js:155`

`zapiszCeneReczna` zapisuje wycenę wprost przez `magazyn.zmien` i omija `src/dane/wyceny.js`, choć nagłówki `wyceny.js` i `stan.js` mówią, że każda zmiana wyceny idzie przez ten moduł. Przy tym kopiuje cztery rzeczy z `wyceny.js`: `zmienWycene` (szukanie wyceny i zapis `zmieniona`), `tylkoDoOdczytu` i `wymagajWyniku` (jako `sprawdzDoZmiany`, linie 144-148) oraz regułę „zmiana kwoty po wysłaniu unieważnia ofertę” z `zapiszWynik:286`. Skutek: następna reguła zapisu wyceny, np. nowy niezmiennik albo nowe pole oferty, dodana w `zmienWycene`, ominie cenę ręczną. Poprawka: dodać w `src/dane/wyceny.js` eksport `zapiszCeneReczna(magazyn, id, cenaReczna, opcje)` oparty na `zmienWycene`, `tylkoDoOdczytu` i `wymagajWyniku`, a w kreatorze zostawić tylko walidację kwoty (`GRANICE_CENY_RECZNEJ`) i wywołanie.

*(źródło: code-quality)*

### P2 · TEST · `src/kreator/podsumowanie.test.js:57`

Gałęzie położenia ceny na tle rynku w `rynek()` (src/kreator/podsumowanie.js:76) mają test tylko dla 'w': nikt nie sprawdza 'ponizej' ani 'powyzej'. Zestaw zostanie zielony po zamianie ich miejscami albo po zamianie `<` na `<=`. Tak samo w `ostrzezenia()` (podsumowanie.js:110) sprawdzana jest tylko górna granica szybkiej wyceny (380 > 300). Usunięcie warunku `brutto < w.szybka.od ||` też przechodzi niezauważone. Poprawka dla mieszkania 50 m² w mazowieckim: (1) `ustawCeneReczna(kontekst, id, 100)` daje `rynek.polozenie === 'ponizej'` i `procent(rynek.procent) === '-60%'`; (2) cena 500 daje `'powyzej'`; (3) `{ ...w, szybka: { stan: 'mieszkanie', od: 300, do: 350, tryb: 'pomieszczenia' } }` z ceną modelu 250 daje `ostrzezenia` równe `[{ rodzaj: 'poza_szybka', od: 300, do: 350 }]`.

*(źródło: test-coverage)*

### P2 · TEST · `src/kreator/podsumowanie.test.js:68`

Testy podsumowania idą tylko przez mieszkanie z podstawą ceny brutto, bez maszyny i z chemią liczoną od godziny. Bez testu zostają trzy gałęzie podsumowania: `mnoznikKlienta` (podsumowanie.js:59), czyli doliczenie 23% VAT do widełek i do dojazdu klienta przy czynnym VAT i podstawie netto, `chemiaH: null` przy liniach innych niż 'praca' (podsumowanie.js:90) oraz wiersz sprzętu z nazwą maszyny (podsumowanie.js:85). Usunięcie mnożnika pokaże firmie z VAT widełki i rozbicie dojazdu netto zamiast brutto, a test tego nie wykryje. Poprawka: kontekst 'czynny', `mycie_posadzek`, `mycie_maszynowe` 1000 m², `dojazdKm: 24`, mazowieckie. Asercje: `cena.rozbicie` równe `{ uslugi: 1550, dojazd: 34 }`, `rynek.od === 551`, `rynek.do === 8644`, wiersz chemii `{ rodzaj: 'chemia', kwota: 50, chemiaH: null }`, wiersz sprzętu z `nazwa: 'Szorowarka (jednotarczowa lub z odsysaniem)'`. Wartości odczytałem z bieżącej implementacji.

*(źródło: test-coverage)*

### P2 · TEST · `src/kreator/podsumowanie.test.js:158`

W `zapiszCeneReczna` (podsumowanie.js:159-160) jest gałąź `czyInnaKwota === false`: wpisanie kwoty równej obecnej nie zmienia `oferta`. Test sprawdza tylko zmianę kwoty po wysłaniu, czyli tylko wynik true. Mutant ustawiający `czyInnaKwota = true` (każdy zapis unieważnia ofertę) albo pominięcie porównania przechodzi przez zestaw. Poprawka: wycena wysłana z ceną modelu 250, `ustawCeneReczna(kontekst, id, 250)` daje `po.oferta.nieaktualna === false`, a `przywrocCeneModelu` po cenie 300 daje `nieaktualna === true`.

*(źródło: test-coverage)*

### P2 · KOD · `src/kreator/pozycje.js:25`

`TRYBY_DODATKU = ['w_cenie', 'propozycja']` jest drugą kopią stałej `TRYBY_DODATKU` z `src/silnik/cena.js:32` i unii `tryb` w typie `DodatekWyceny` (`cena.js:13`). Nowy tryb dopisany w silniku zostanie odrzucony przez `ustawDodatek` z `BladWejscia('tryb_dodatku')`. Tryb dopisany tylko tutaj przejdzie przez kreator i wywoła błąd w silniku. Poprawka: eksportować `TRYBY_DODATKU` (z `as const`) z `cena.js`, tam wyprowadzić typ `tryb` jako `typeof TRYBY_DODATKU[number]`, a w `pozycje.js` importować tę stałą zamiast definiować własną.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/pozycje.js:142`

`infoProgu` drugi raz definiuje wybór progu metrażu. Sortuje `progiMetrazu` i szuka `findLastIndex(od_m2 ≤ m2)`, a `katalog.progMetrazu` (`src/silnik/katalog.js`, zmieniony w tej fazie) bierze ostatni pasujący próg w kolejności z danych, bez sortowania. Przy progach w `data/ceny.json` zapisanych nie po kolei baner „Małe/Duże zlecenie” pokaże inny próg i granice niż mnożnik, którym silnik liczy cenę. Następna zmiana reguły progu musi też trafić w dwa miejsca. Poprawka: dodać do katalogu jedną funkcję `progDlaMetrazu(nazwa, m2) → { od, do, mnoznik }`, wyprowadzić z niej `progMetrazu` i używać jej w `infoProgu` zamiast własnego sortowania.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/pozycje.js:158`

`infoDojazdu` trzeci raz definiuje model dojazdu. Kwota dla klienta (`max(0, km − darmowy_promien_km) × klient_zl_km`) jest kopią `dojazdKlienta` z `src/silnik/cena.js:116-118`. Koszt firmy z `KURSOW_NA_ZLECENIE = 2` (linia 27, komentarz „jak KURSOW_NA_ZLECENIE w src/silnik/koszt.js”) jest kopią `koszt.js:23,110`. Do tego `StawkiDojazdu` (linia 16) to trzecia definicja typu stawek obok `cena.js:21`. `podsumowanie.js:91` woła `infoDojazdu` tylko po `kmRazem`. Zmiana modelu dojazdu w silniku zostawi kartę „Dojazd” i wiersz kosztu z innymi kwotami niż cena i koszt. Poprawka: eksportować `dojazdKlienta` z `cena.js` i nową funkcję `dojazdFirmy(km, stawki) → { kmRazem, kwota }` z `koszt.js` (`kosztZlecenia` też z niej korzysta), zbudować z nich `infoDojazdu`, a typ stawek brać z `KosztyFirmy['dojazd']`.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/pozycje.js:179`

`wycenaDodatku` i `cenaZaJednostke` kopiują formułę silnika dla dodatków (komentarz: „Kwota dodatku jak w silniku”): ilość × cena × wsp plus materiał `koszt_chemii_m2` bez wsp. To ta sama formuła co `linieDodatkow` i `liniaMaterialu` w `src/silnik/cena.js:48-57,97-113`. Kwota w wierszu dodatku (`kreator-dodatki.js:45`) pochodzi więc z kopii, a „Razem” z silnika. Pierwsza zmiana wyceny dodatków, np. próg albo brud dla dodatków, da w wierszu inną kwotę niż w sumie. Poprawka: wydzielić w `cena.js` eksportowaną funkcję `kwotaDodatku(pozycja, ilosc, wsp)`, z której korzystają `linieDodatkow` i kreator, albo kwoty dodatków w cenie brać z `wycena.wynik.linie` (rodzaj `dodatek` i `material`) i `wynik.propozycje`, tak jak robi to już `kreator-pozycje.js:135`.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/stan.js:38`

`METRAZ_PODPOWIEDZI = 50` (komentarz: „jak mieszkanie wzorcowe w ustawieniach”) kopiuje `METRAZ_WZORCOWY = 50` z `src/widoki/ustawienia-formularz.js:33`. `podpowiedzCeny` w liniach 194-195 powtarza obliczenie `mieszkanieWzorcowe` z `ustawienia-formularz.js:111-116` (`zBrudem(ukladMieszkania(50, {}, …), brud_domyslny)` → `wycenUsluge`). Zmiana metrażu wzorcowego w ustawieniach rozjedzie tekst „mieszkanie 50 m² ok. X zł” z ustawień i podpowiedź w kreatorze. Do tego `stan.js` zyskuje odpowiedzialność niezwiązaną ze stanem szkicu, czyli podpowiedzi cen dla listy usług. Poprawka: przenieść `mieszkanieWzorcowe(katalog, uslugaId, wojewodztwoId)` i stałą metrażu do modułu bez DOM (np. `src/silnik/uklad.js` albo nowego `src/kreator/podpowiedzi.js`), tam też przenieść `podpowiedzCeny` i importować je zarówno w `ustawienia-formularz.js`, jak i w `kreator-usluga.js`.

*(źródło: code-quality)*

### P2 · KOD · `src/kreator/stan.js:144`

Każda zmiana w kreatorze (zdarzenie `input` licznika metrażu, ilości, km i pola nazwy, czyli każde naciśnięcie klawisza; każdy chip brudu) idzie przez `zmienWejscie`, a ta funkcja kilka razy z rzędu przechodzi przez cały stan z localStorage. `wczytajStan` w linii 146 robi pierwszy `JSON.parse`. `przelicz` w linii 112 woła `wczytajStan` po raz drugi i robi kolejny parse. `zapiszWejscie` w linii 152 to `magazyn.zmien`, czyli parse i `JSON.stringify` całości. `zapiszWynik` w linii 153 to drugie `magazyn.zmien` z kolejnym parse i stringify. Razem: 4× JSON.parse i 2× JSON.stringify całego stanu (wszystkich wycen) na jedno naciśnięcie. Zmierzyłem to na Node (desktop) w osobnym skrypcie, z wyceną mieszkania 50 m² o rozmiarze 1,4 KB. Przy 100 wycenach stan ma 138 KB, a `zmienWejscie` trwa 3,8 ms. Przy 1000 wycen (rok do dwóch pracy małej firmy; MAKS_WYCEN = 5000) stan ma 1,37 MB, a `zmienWejscie` trwa 34,9 ms. Na telefonie, który jest 4–6× wolniejszy, wychodzi ok. 150–200 ms opóźnienia na każdy znak wpisany w licznik. Czas rośnie liniowo z liczbą zapisanych wycen. Poprawka: wczytać stan raz, policzyć migawkę ze `stan.ustawienia` przekazanymi do `przelicz` (np. parametr `ustawienia` zamiast `wczytajStan` w linii 112) i zapisać wejście razem z wynikiem w jednym `magazyn.zmien`, np. nowa funkcja `zapiszWejscieIWynik(magazyn, id, wejscie, wynik)` w src/dane/wyceny.js z tą samą logiką `tylkoDoOdczytu` i `nieaktualnaPoWyslaniu`. Zostaje 1 parse i 1 stringify na zmianę, około 3× mniej pracy.

*(źródło: performance)*

### P2 · KOD · `src/kreator/stan.js:151`

Pusty zakres zostawia starą migawkę wyniku. `zmienWejscie` przy `czyPustyZakres(wejscie)` zapisuje samo wejście (`wynik === null` → tylko `wczytajStan`), a `wycena.wynik` z poprzednią ceną zostaje w magazynie. Scenariusz 1 (zapisana wycena): wycena 1/10/2026 `do_wyslania` za 250 zł → „Edytuj” → „Dalej” → w kroku zakresu „Usuń pomieszczenie” przy każdym z 4 pomieszczeń → strzałka wstecz do kroku usługi → strzałka wstecz (`adresWstecz` przy numerze prowadzi do `#/wycena/<id>`). Podsumowanie pokazuje „Cena dla klienta 250 zł”, linie i koszty usuniętych pomieszczeń, a `wejscie.pomieszczenia` jest puste. Można kliknąć „Klient przyjął”, a oferta (IU-23) zbuduje się z pustego zakresu. Scenariusz 2 (szkic): po dojściu do podsumowania wróć strzałkami do zakresu, ustaw „Okno 1-skrzydłowe” z 4 na 0 (albo usuń wszystkie pomieszczenia) i cofnij się przyciskiem wstecz telefonu do `#/kreator/dodatki`. W krokach dodatków i chemii „Dalej” nie jest blokowane, bo `bledyKroku` sprawdza tylko krok `zakres`. W `#/kreator/cena` „Zapisz” przechodzi, bo `wymagajWyniku` widzi starą migawkę, i wycena dostaje numer z ceną za 4 okna przy zakresie 0. W kroku pozycji `wierszPozycji` dalej rysuje kwoty linii ze starej migawki przy liczniku 0. Poprawka: przy pustym zakresie `zmienWejscie` powinno zerować `wynik` w tym samym `magazyn.zmien` (dla szkicu). Dla wyceny z numerem, której `jestWycena` nie pozwala zostawić bez wyniku, trzeba odmówić zapisu pustego zakresu albo oznaczyć wynik jako nieaktualny. Do tego podsumowanie (`src/widoki/podsumowanie.js:90`) i `zapiszWycene` powinny sprawdzać `bledyKroku('zakres')`.

*(źródło: correctness)*

### P2 · TEST · `src/kreator/stan.test.js:155`

Test 'czynny podatnik przy podstawie netto (posadzki)' ma dwie słabe asercje. Oczekiwaną cenę liczy z `migawka.linie`, czyli z wyniku tego samego kodu, który sprawdza (samoodniesienie). Druga asercja to `assert.ok(migawka.vat > 0)` (słaby matcher). Błąd w kwotach linii albo w progu metrażu przesunie linie i cenę razem, a zły podział netto i VAT przejdzie, dopóki VAT jest dodatni. Poprawka: dla 1000 m² `mycie_maszynowe` w mazowieckim przy dojeździe 0 wpisz dosłowne `[migawka.cena, migawka.netto, migawka.vat]` odczytane z jednego przebiegu (cena brutto ok. 1550, netto × 1,23 = cena) zamiast liczyć je z `linie`.

*(źródło: test-coverage)*

### P2 · KOD · `src/widoki/katalog-chemii.js:16`

Widok katalogu chemii zawiera warstwę danych. `LIMIT_POBIERANIA_MS = 10000` i `pobierzJson` (linie 16-31) są dosłowną kopią `src/app.js:21-36`. Do tego dochodzi globalna pamięć `wczytywanie` i `chemiaAplikacji`, a krok kreatora `dobor-chemii.js:13` importuje `poChemii` z widoku katalogu. Plan mówił o danych „pamiętanych w kontekście”. Zmiana limitu czasu albo obsługi HTTP (np. kod błędu, nagłówki cache) trzeba wprowadzić w dwóch miejscach, a test kroku chemii wymaga modułu widoku katalogu. Poprawka: przenieść `pobierzJson` z limitem do `src/dane/pobierz.js` (import w `app.js` i tutaj) albo przekazać go w kontekście routera, a `chemiaAplikacji` z pamięcią wydzielić do osobnego modułu danych, z którego importują oba widoki.

*(źródło: code-quality)*

### P2 · KOD · `src/widoki/kreator-pomieszczenia.js:158`

`tekstBledu` i `zapisz` (linie 158-186) to trzecia kopia `zapisKroku` z `kreator-pozycje.js:89-121`. Jest tu ten sam mechanizm `KOD_NIEAKTUALNEJ` z porównaniem JSON „naEkranie”, oczekiwane kody z mapy i odwołanie do `zglosBladKreatora`. Ten sam plik powiela też ustalanie wyceny z `wycenaKroku` (linie 133-140, a `kreator-usluga.js:108-116` robi to czwarty raz). `pokazKomunikat` występuje w trzech plikach (`kreator-usluga.js:70`, `kreator-pozycje.js:59`, tu linia 68), `odswiezStopke` w trzech (tu 272, `kreator-pozycje.js:193`, `kreator-dodatki.js:124`), a `kwotaJednostki` w `kreator-usluga.js:39`. Reguła projektu każe wydzielić logikę przy trzecim użyciu. Poprawka obsługi wyceny zmienionej w innej karcie albo usuniętej trafi teraz do jednej kopii, a druga zostanie z błędem. Poprawka: po przeniesieniu narzędzi do `kreator-wspolne.js` (finding wyżej) zastąpić lokalne `tekstBledu`/`zapisz` wywołaniem `zapisKroku({ …, naEkranie: (w) => JSON.stringify(w.pomieszczenia ?? []), teksty: TEKSTY_BLEDOW_ZAKRESU })`, a inline'owe szukanie wyceny wywołaniem `wycenaKroku`.

*(źródło: code-quality)*

### P2 · KOD · `src/widoki/kreator-pozycje.js:5`

`kreator-pozycje.js` ma trzy powody do zmiany (nagłówek w linii 5 sam to opisuje): widok kroku z pozycjami, routing `#/kreator/zakres` po trybie usługi (`widokKreatoraZakresu`, który importuje sąsiedni widok `kreator-pomieszczenia.js`) oraz wspólne narzędzia kroków: `wycenaKroku`, `zapisKroku`, `kwotaJednostki`, `nazwaJednostki`, `BLAD_ILOSCI`. Z tych narzędzi korzystają `kreator-dodatki.js`, `dobor-chemii.js`, `podsumowanie.js` i `podsumowanie-karty.js`, więc każda zmiana widoku pozycji dotyka pięciu ekranów, a podsumowanie zależy od widoku kroku zakresu. Poprawka: przenieść `wycenaKroku`, `zapisKroku`, `pokazKomunikat` i `odswiezStopke` do `kreator-wspolne.js` (rama kroku już tam jest), `kwotaJednostki` i `nazwaJednostki` do `src/ui/format.js`, a `widokKreatoraZakresu` do `kreator-wspolne.js` albo `indeks.js`.

*(źródło: code-quality)*

### P2 · KOD · `src/widoki/kreator-pozycje.js:38`

`BLAD_ILOSCI = 'Wpisz liczbę od 0 do 100 000.'` ma wpisaną na sztywno granicę `MAKS_ILOSCI` z `src/kreator/pozycje.js:21`. Podobnie `BLAD_METRAZU = 'Wpisz metraż od 0,5 do 1000 m².'` w `src/widoki/kreator-pomieszczenia.js:39` powtarza `GRANICE_METRAZU` z `src/kreator/pomieszczenia.js:19`. Po zmianie granicy w module kreatora komunikat będzie podawał stary zakres. Gałęzie `blad !== BLAD_ILOSCI` w widokach dalej będą działać, więc nic tego nie zasygnalizuje. Dla dojazdu ten sam plik robi to poprawnie: `kreator-dodatki.js:31` ma `bladZakresu({ min: 0, max: MAKS_DOJAZDU_KM })`. Poprawka: `BLAD_ILOSCI = bladZakresu({ min: 0, max: MAKS_ILOSCI })`, a `BLAD_METRAZU` budować z `GRANICE_METRAZU` przez `tekstLiczby` (`Wpisz metraż od ${tekstLiczby(min)} do ${tekstLiczby(max)} m².`).

*(źródło: code-quality)*

## Findingi P3

### P3 · KOD · `src/kreator/podsumowanie.js:180`

Arkusz ręcznej ceny zapisuje i przelicza karty przy każdym naciśnięciu klawisza (podsumowanie-karty.js:188 → `ustawCeneReczna` → `naZmiane` → `rysuj`). Na jeden znak przypada: `magazyn.zmien` w `zapiszCeneReczna` (parse i stringify całego stanu), `rysuj` w podsumowanie.js:185 (`wczytajStan`, czyli parse) i jeszcze raz `wczytajStan(magazyn)` w `widokPodsumowania` w linii 180 (parse). Razem 3× JSON.parse i 1× stringify, a przy 1000 wycen (1,37 MB stanu, ok. 10 ms na parse na desktopie) to ok. 40 ms na znak na desktopie i ok. 150 ms na telefonie. Poprawka: dodać do `widokPodsumowania(w, kontekst, stan)` parametr `stan` i przekazać stan wczytany już w `rysuj` (podsumowanie.js:185) przez `karty()`, zamiast wołać `wczytajStan(magazyn)` w linii 180. Odpada jeden pełny parse na każdy render podsumowania.

*(źródło: performance)*

### P3 · KOD · `src/kreator/podsumowanie.js:52`

`wynikZMigawki` tworzy pełny `WynikWyceny` ze zmyślonymi polami (`minimum: 0`, `czyMinimum: false`, `cenaMiesieczna: null`, `cenaZaokraglona: m.cena`) tylko po to, żeby spełnić typ `WejscieKosztu.wynik`, choć `kosztZlecenia` czyta wyłącznie `linie`, `dojazd`, `minutyNormowe` i `wizytWMiesiacu`. Gdy `kosztZlecenia` zacznie czytać np. `czyMinimum`, typechecker tego nie wyłapie, a koszt będzie liczony z fałszywego zera. Poprawka: w `src/silnik/koszt.js:19` zawęzić typ do `wynik: Pick<WynikWyceny, 'linie' | 'dojazd' | 'minutyNormowe' | 'wizytWMiesiacu'>`, przekazywać `m` wprost i usunąć `wynikZMigawki`.

*(źródło: code-quality)*

### P3 · KOD · `src/widoki/kreator-dodatki.js:115`

`rama()` dopisuje „+X do zaproponowania”, sięgając w DOM zwrócony przez `ramaKroku` (`elementy.at(-1)` i `querySelector('.stopka-kreatora__razem')`). Zmiana klasy albo kolejności elementów w `kreator-wspolne.js` po cichu zgubi ten dopisek. Poprawka: dodać do `OpcjeRamy` w `kreator-wspolne.js:21` opcjonalne pole `dopisekKwoty?: string`, rysowane w funkcji `razem()` (linia 61), i przekazywać tu `dopisekKwoty: doZaproponowania > 0 ? `+${zl(doZaproponowania)} do zaproponowania` : undefined` zamiast modyfikować DOM.

*(źródło: code-quality)*

### P3 · KOD · `src/widoki/kreator-pozycje.js:104`

`zapisz` zwraca sam tekst komunikatu (`string | null`) i gubi kod błędu, więc wywołujący decydują po porównaniu tekstu dla użytkownika: `blad !== BLAD_ILOSCI` (tu linia 234, `kreator-dodatki.js:153`), `blad !== BLAD_DOJAZDU` (`kreator-dodatki.js:171`). Dwa kody z tym samym tekstem albo edycja tekstu zmienią sposób obsługi błędu. Poprawka: zmienić typ zwracany przez `zapisz` w `ZapisKroku` na `{ kod: string, tekst: string } | null` i w wywołujących porównywać `blad.kod === 'ilosc'` / `'dojazd'` zamiast tekstu.

*(źródło: code-quality)*

### P3 · KOD · `src/widoki/podsumowanie-karty.js:39`

`zMalej` jest dosłowną kopią `zMalej` z `src/widoki/dobor-chemii.js:40`, a `malaPierwsza` w `src/widoki/kreator-pomieszczenia.js:55` to trzeci wariant tej samej funkcji, który nie chroni skrótów, więc „AGD” zamieni na „aGD”. Poprawka: przenieść `zMalej` do `src/ui/format.js` jako eksport i importować go w `podsumowanie-karty.js`, `dobor-chemii.js` oraz `kreator-pomieszczenia.js`, a `malaPierwsza` usunąć.

*(źródło: code-quality)*

### P3 · KOD · `src/kreator/stan.js:90`

`brudNowegoPomieszczenia` może zwrócić dwa wpisy tego samego rodzaju brudu (kurz 1 i regułę `brud_domyslny` z kurzem). Dopiero wywołujący w `src/kreator/pomieszczenia.js:67` usuwa duplikaty przez `new Map(...map((b) => [b.id, b]))`. Każde nowe miejsce, które z niej skorzysta, zapisze w wejściu powtórzony brud. Poprawka: przenieść usuwanie duplikatów do `brudNowegoPomieszczenia` (`return [...new Map((pomieszczenie?.brud ?? []).map((b) => [b.id, b])).values()]`) i w `dodajPomieszczenie` używać jej wyniku wprost.

*(źródło: code-quality)*

### P3 · KOD · `src/kreator/stan.js:152`

`zmienWejscie` zapisuje wejście i wynik w dwóch osobnych transakcjach: `zapiszWejscie`, a potem `zapiszWynik`, każda przez własne `magazyn.zmien`. Gdy drugi zapis się nie powiedzie (np. `QuotaExceededError` localStorage przy większej migawce z liniami), nowe wejście jest już zapisane, a wynik zostaje stary. Użytkownik widzi baner „Nie udało się zapisać…”, choć zakres (np. metraż 15 zamiast 10 m²) się zapisał, a cena i stopka pokazują stan sprzed zmiany. Akcja: zastąp dwa wywołania jednym `magazyn.zmien`, które w jednym kroku ustawia `{ ...w, wejscie, wynik, oferta }` (z `tylkoDoOdczytu` i `nieaktualnaPoWyslaniu` jak w `zapiszWejscie`/`zapiszWynik` z `src/dane/wyceny.js`).

*(źródło: correctness)*

### P3 · KOD · `src/widoki/kreator-usluga.js:182`

Przycisk wstecz przeglądarki tworzy duplikat szkicu. Na `#/kreator/usluga` bez `?wycena=` każde „Dalej” woła `nowySzkic`. Scenariusz: wybierz „Mieszkanie…”, „Dalej” (powstaje szkic A, adres `#/kreator/zakres?wycena=A`), cofnij przyciskiem wstecz telefonu na `#/kreator/usluga`, potem znowu „Dalej”. Powstaje szkic B, a A zostaje osierocony i wisi na starcie jako zadanie „Dokończ wycenę”. Akcja: po `nowySzkic` w `zapiszWybor` wywołaj `history.replaceState(null, '', adresKroku('usluga', nowa.id))` przed `nawiguj(adresKroku('zakres', …))`. Powrót trafi wtedy do kroku usługi z `?wycena=<id>` i pójdzie ścieżką `zmienWybor`.

*(źródło: correctness)*

### P3 · KOD · `src/widoki/podsumowanie-karty.js:191`

Arkusz ręcznej ceny zapisuje każdy poprawny stan pola po każdym naciśnięciu klawisza (`handleWpis` → `ustawCeneReczna`). `zapiszCeneReczna` przy innej kwocie ustawia `oferta.nieaktualna = true` po wysłaniu i tej flagi już nie cofa. Scenariusz: wycena `wyslana` za 250 zł → „Zmień” → wpisz „250” (pole jest zaznaczone, więc pierwszy znak zastępuje treść). Kolejne zapisy to 2 zł, 25 zł i 250 zł. Kwota końcowa jest taka sama jak wysłana, a podsumowanie na stałe pokazuje „Wycena zmieniła się po wysłaniu oferty. Klient ma jej wcześniejszą wersję.”. Akcja: w `handleWpis` aktualizuj tylko podgląd kart, a `ustawCeneReczna` wołaj przy zamknięciu arkusza (submit/`close`). Alternatywa: w `zapiszCeneReczna` (`src/kreator/podsumowanie.js:159`) liczyć `czyInnaKwota` względem kwoty z chwili wysłania oferty, a nie poprzedniego zapisu.

*(źródło: correctness)*

### P3 · KOD · `src/widoki/kreator-pomieszczenia.js:218`

Arkusze kreatora (`arkusz` w `document.body`) nie są zamykane przy zmianie trasy, a ich callbacki zapisują i rysują bez sprawdzenia, czy widok jest nadal aktywny. Router nie zamyka dialogów, a `widokKreatoraPomieszczen.render` nie zwraca funkcji sprzątającej. Scenariusz: otwórz „+ Dodaj pomieszczenie”, wróć gestem wstecz (iOS Safari, hash się zmienia, dialog zostaje), potem wybierz „Kuchnia”. `handleDodaj` dopisuje pomieszczenie do wyceny, której użytkownik już nie edytuje, a `rysuj` nadpisuje `kontener` nowego ekranu starym krokiem zakresu. To samo dzieje się w `kreator-dodatki.js:155` (`handleZapisz` → `rysuj`) i przy wyborze województwa w `kreator-usluga.js:94`. Akcja: zwracaj z `render` sprzątanie, które ustawia `czyAktywny = false` i zamyka otwarty arkusz (`dialog.close()`), a w `handleDodaj` i `rysuj` wychodź wcześnie, gdy `!czyAktywny`.

*(źródło: correctness)*

### P3 · TEST · `src/silnik/chemia.test.js:202`

W `tekstPh` (chemia.js:196) gałąź „pH do X” i w `opisProduktu` (chemia.js:209) gałąź 'stężenie: brak danych' nie mają testu. Akcja: obok testu 'pH od 12' dodaj `opisProduktu({ ...malaChemia().produkty[0], ph: [null, 3], stezenia: [] })` z oczekiwanym `ph === 'pH do 3'` i `stezenie === 'stężenie: brak danych'`.

*(źródło: test-coverage)*

### P3 · TEST · `src/kreator/podsumowanie.test.js:186`

Gałąź `brak_wyniku` w `sprawdzDoZmiany` (podsumowanie.js:147) nie ma testu dla `przeliczWycene` ani `ustawCeneReczna`. Testowany jest tylko `widokPodsumowania` na szkicu. Akcja: w describe 'przeliczWycene' dodaj test: `const { id } = nowySzkic(kontekst, { uslugaId: 'mieszkanie_standard', wojewodztwoId: 'mazowieckie' })`, a potem `assert.throws(() => przeliczWycene(kontekst, id), { name: BladWyceny.name, kod: 'brak_wyniku' })` i to samo dla `ustawCeneReczna(kontekst, id, 300)`.

*(źródło: test-coverage)*

### P3 · TEST · `src/kreator/pozycje.test.js:72`

`przelaczPozycje` z `czyWlaczona = true` dla pozycji, która już jest włączona, zwraca wejście bez zmian (pozycje.js:94). Ta gałąź nie ma testu, więc jej usunięcie (dopisanie duplikatu pozycji) przejdzie przez zestaw. Akcja: dodaj asercję `assert.deepEqual(przelaczPozycje(kostka, 'mycie', true, katalog).pozycje, [{ id: 'mycie', ilosc: 40 }, { id: 'olej', ilosc: 40 }])`.

*(źródło: test-coverage)*

## Findingi OPERATOR

Brak.

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 11
- [E2E] odznaczone na podstawie przebiegow testera: 3
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0 (E2E FAIL `kreator-okna-minimum` zostaje niezaznaczony; pokrywa go finding P2 `src/kreator/podsumowanie.js:53`)

### Szczegoly

- [x] CLI: `node --test src/kreator/stan.test.js przechodzi` -> PASS (komenda: `node --test src/kreator/stan.test.js`)
- [x] CLI: `node --test src/kreator/pomieszczenia.test.js przechodzi` -> PASS (komenda: `node --test src/kreator/pomieszczenia.test.js`)
- [x] CLI: `node --test src/kreator/pozycje.test.js przechodzi` -> PASS (komenda: `node --test src/kreator/pozycje.test.js`)
- [x] CLI: `node --test src/silnik/chemia.test.js przechodzi` -> PASS (komenda: `node --test src/silnik/chemia.test.js`)
- [x] CLI: `node --test src/kreator/podsumowanie.test.js przechodzi` -> PASS (komenda: `node --test src/kreator/podsumowanie.test.js`)
- [x] CLI: `npm test przechodzi` -> PASS (komenda: `npm test`)
- [x] CLI: `npm run typecheck przechodzi bez błędów` (5 linii, IU-14 do IU-18) -> PASS (komenda: `npm run typecheck`)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 25 (23) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 4 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 3 / 1 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 36 -> 36 -> 34 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 21 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 3 / 5 / 20 (batchowanie: 20 findingow w 5 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 23 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
