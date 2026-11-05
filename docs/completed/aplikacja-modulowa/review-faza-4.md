# Review fazy 4 — Klienci

Data: 2026-11-03. Gate: **ZASTRZEZENIA**. Statystyki: P1 0, P2 8, P3 7, OPERATOR 0. E2E: 2 PASS, 0 FAIL, 0 SKIP.

## Findingi P1

Brak.

## Findingi P2

### P2 · KOD · `src/ui/komponenty/wybor-klienta.js:8`

Import idzie pod prąd warstw. Komponent z src/ui/komponenty importuje src/widoki/klienci-dane.js (linia 8) i src/widoki/teksty-bledow.js (linia 9). Do tego sam czyta i zapisuje magazyn (wczytajStan, dodajKlienta z src/dane). To jedyny moduł w src/ui, który importuje z src/widoki, i jedyny komponent ui, który robi zapis; pozostałe komponenty (formularz.js, uklad.js) zależą tylko od h.js i format.js. Skutek: zmiany danych lub tekstów błędów modułu Klienci przeciekają do warstwy ogólnych komponentów, a ui ⇄ widoki przestają być jednokierunkowe; grozi cykl widoki → ui/komponenty → widoki. Zmiana: przenieść plik do src/widoki/wybor-klienta.js i poprawić trzy importy w podsumowanie.js, szybka.js i oferta-edycja.js. (źródło: code-quality)

### P2 · KOD · `src/ui/komponenty/wybor-klienta.js:152`

„Bez klienta” zdejmuje tylko `klientId`, a kopia nazwy i adresu zostaje w wycenie, bo `przypiszKlienta(…, null)` w src/dane/wyceny.js:317 zwraca `{ ...w, klientId: null }`. Faza 4 usunęła jedyne miejsca, w których tę kopię dało się poprawić: pole „Klient” w karcie „Klient i termin” (src/widoki/oferta-edycja-sekcje.js:190) i pole klienta w arkuszu „Zapisz” podsumowania. Scenariusz: użytkownik wybiera przez pomyłkę „Anna Kowalska”, potem „Zmień”, „Bez klienta”, „Zapisz”. Wiersz pokazuje „Wybierz klienta”, a podtytuł, lista wycen (lista-wycen-dane.js:94) i oferta/PDF (oferta/tresc.js:254) mają nazwę i adres Anny, bez możliwości usunięcia. Tak samo zachowują się wyceny sprzed fazy 4 z nazwą wpisaną ręcznie. Poprawka: przy `klientId === null` czyścić w `przypiszKlienta` także `klient.nazwa` i `klient.adres` (termin zostaje) albo przywrócić w ofercie edytowalne pole nazwy, gdy `klientId === null`. (źródło: correctness)

### P2 · KOD · `src/widoki/klienci-dane.js:17`

Normalizacja numeru telefonu jest trzecią kopią reguły. `SEPARATORY_TELEFONU = /[\s-]/gu` z NFKC (linie 17 i 41–43) powtarza `SEPARATORY`/`bezSeparatorow` z src/dane/walidacja.js, a `NUMER_TELEFONU = /^\+?\d+$/u` to luźniejsza wersja kontraktu `bladTelefonu`. Jeśli walidacja dopuści np. nawiasy albo kropki, `linkTelefonu` rzuci RangeError i karta klienta się nie narysuje. Zmiana: wyeksportować z src/dane/walidacja.js `numerTelefonu(tekst)` i w `linkTelefonu` zwracać `tel:${numerTelefonu(telefon)}`, lokalne stałe usunąć. (źródło: code-quality)

### P2 · KOD · `src/widoki/klienci-dane.js:84`

Reguła „klient ma historię” ma drugą definicję. `czyMaHistorie` powtarza warunek z `usunKlienta` w src/dane/klienci.js:181. Od niej zależą widoczność „Usuń klienta” i blokada zapisu. Gdy kolejna faza doda nowe źródło historii i zmieni tylko jedno miejsce, karta pokaże przycisk kończący się błędem `ma_historie` albo ukryje go niesłusznie. Zmiana: wyeksportować `czyMaHistorie(stan, id)` z src/dane/klienci.js, użyć w `usunKlienta` i klient-karta.js, kopię usunąć. (źródło: code-quality)

### P2 · KOD · `src/widoki/klienci-lista.js:47`

Lista klientów nie ma limitu i przy każdym naciśnięciu klawisza liczy wszystko od nowa. Listener `input` woła `szukajKlientow`, która przy każdym znaku kopiuje i sortuje całą listę (`localeCompare`), normalizuje do 3 pól na klienta, a potem `replaceChildren` rysuje od nowa wiersz DOM dla każdego trafienia (przy pustej frazie dla wszystkich). Przy 5000 klientach (MAKS_KLIENTOW) to ok. 61 tys. porównań, 15 tys. normalizacji i ponad 30 tys. węzłów na znak. Ten sam koszt ponosi `propozycjeKlientow` (klienci-dane.js:672), która pokazuje tylko 8 pozycji. Poprawka: w `render` raz zbudować posortowaną tablicę `{ klient, klucz }`, `rysujWyniki` niech filtruje po `klucz.includes`, rysować najwyżej ~50 wierszy z „Pokaż więcej”, a w `propozycjeKlientow` przerwać po 8 trafieniach z przedrostkiem. (źródło: performance)

### P2 · TEST · `src/widoki/klient-formularz.js:105`

Ścieżka edycji klienta (`else zapiszKlienta(magazyn, id, dane)`) nie ma testu. Zamiana gałęzi na `dodajKlienta(magazyn, dane, { id })` przejdzie niezauważona, bo `dodajKlienta` z istniejącym id zwraca klienta bez zmian (src/dane/klienci.js:136). Bez testu jest też ekran braku klienta (linia 68). Poprawka: wydzielić `zapiszFormularzKlienta(magazyn, edytowany, id, dane)` do klienci-dane.js i przetestować: `k-anna` po zapisie z `{ nazwa: 'Anna Nowak', telefon: '', adres: '', notatki: '' }` ma nazwę 'Anna Nowak' i `telefon: null`; nowy klient z tym samym id zapisany dwa razy daje jednego klienta. (źródło: test-coverage)

### P2 · TEST · `src/widoki/oferta-edycja.js:195`

Funkcja `przypisz` (wybór klienta w edycji oferty) nie ma testu: ani gałąź sukcesu (`#oferta-adres` dostaje adres klienta, `wersja += 1`, `przygotujLink()`), ani `catch` z `tekstBleduZapisuOferty(blad)`. Scenariusze E2E nie wchodzą do edycji oferty. Poprawka: test w src/widoki/oferta-edycja.test.js na atrapie DOM (jak w oferta-klient.test.js): po wyborze `k-anna` pole adresu ma 'ul. Lipowa 3', wycena ma `klientId: 'k-anna'` i `klient.nazwa: 'Anna Kowalska'`; dla nieistniejącej wyceny `naWybor` zwraca tekst błędu i niczego nie zapisuje. (źródło: test-coverage)

### P2 · TEST · `src/widoki/szybka.js:261`

Gałąź `handleKlient` nie ma testu: rekord dostaje `przypiszKlienta`, a znacznik `zmieniona` przesuwa się tylko przy `przed === zmieniona` (linia 269), co chroni przed nadpisaniem zmiany z innej karty. Usunięcie warunku zostawi zestaw zielony. Poprawka: wydzielić `przypiszKlientaSzybkiej(kontekst, id, klientId, zmieniona)` do src/kreator/szybka.js i przetestować: (1) bez zmiany w innej karcie rekord ma `klientId: 'k-anna'`, funkcja zwraca `w.zmieniona`; (2) po zmianie w innej karcie zwrócony znacznik jest stary, a kolejne `zapiszSzybka(..., { zmieniona })` daje `BladWyceny` z kodem `nieaktualna`. (źródło: test-coverage)

## Findingi P3

### P3 · KOD · `src/widoki/klienci-dane.js:20`

`formatDniaWyceny` i `dzienWyceny` to kopia `formatDniaZmiany` i `dzienZmiany` z src/widoki/lista-wycen-dane.js:21 i :80; trzecia podobna wersja (z `timeZone: 'UTC'`) jest w src/ui/format.js:26. Zmiana formatu na liście wycen rozjedzie się z kartą klienta. Zmiana: eksport `dzienKrotki(chwilaIso)` w src/ui/format.js, używany w obu plikach, lokalne kopie usunąć. (źródło: code-quality) *(sceptyk: P2 → P3, sprzeciw bez dowodu obalenia)*

### P3 · KOD · `src/ui/komponenty/wybor-klienta.js:96`

`wybranyKlient()` przy każdym `rysuj()` czyta cały magazyn (`wczytajStan`: getItem, JSON.parse, walidacja do kilku MB) tylko po nazwę klienta. Otwarcie arkusza „Zapisz” to 3 pełne odczyty, każdy wybór 2 kolejne, w szybkiej wycenie 3. Poprawka: `wybierz(klientId)` dostaje obiekt `Klient` ze `stan` arkusza, `rysuj(k)` z tym obiektem; `wczytajStan` tylko przy pierwszym rysowaniu i w `sprawdz()`. (źródło: performance)

### P3 · KOD · `src/widoki/oferta-edycja.js:200`

`przypisz` odświeża adres przez `karta.querySelector('#oferta-adres')` z id zdefiniowanym w oferta-edycja-sekcje.js:191; guard `instanceof HTMLInputElement` po cichu pomija odświeżenie po zmianie id. Zmiana: `kartaKlienta` zwraca `{ element, ustawAdres(adres) }` albo eksportuje `ID_ADRESU_OFERTY`. (źródło: code-quality)

### P3 · KOD · `src/widoki/klient-karta.js:37`

`naglowekKarty` wchodzi w strukturę `naglowek` przez `querySelector('.naglowek__gora')?.append(...)` i `querySelector('.naglowek__tytul')?.before(...)`; zmiana klas w src/ui/komponenty/uklad.js:47–51 po cichu usunie „Edytuj” (jedyne wejście do edycji) i awatar. Zmiana: opcje `akcja` i `nadTytulem` w `naglowek`. (źródło: code-quality)

### P3 · KOD · `src/widoki/teksty-bledow.js:46`

`tekstBleduKlienta` zamienia każdy inny kod `BladKlienta` na „Nie udało się zapisać klienta. Spróbuj jeszcze raz.”, także trwałe `za_duzo` (5000 klientów) i `brak_klienta` (klient usunięty w innej karcie). Poprawka: osobne teksty dla obu kodów (z importem `MAKS_KLIENTOW`). (źródło: correctness)

### P3 · KOD · `src/widoki/kreator-usluga.js:192`

Po szkicu z `?klient=<id>` historia zostaje `#/kreator/usluga?klient=<id>` bez `?wycena=`; wstecz i ponowne „Dalej” tworzy drugi szkic z tym samym klientem, a porzucony szkic chowa „Usuń klienta”. Poprawka: w `handleDalej` przy `id === null` `history.replaceState(null, '', sciezka('kreator', { krok: 'usluga' }, { wycena: docelowa }))`, jak w src/widoki/szybka.js:185. (źródło: correctness)

### P3 · TEST · `src/widoki/klient-karta.js:28`

`tekstBleduUsuniecia` ma trzy gałęzie bez testu (`ma_historie`, inny `BladKlienta`, `BladMagazynu` → `tekstBleduZapisu`). Akcja: przenieść do src/widoki/teksty-bledow.js jako `tekstBleduUsunieciaKlienta` i dopisać w teksty-bledow.test.js trzy asercje z dosłownymi tekstami. (źródło: test-coverage)

## Findingi OPERATOR

Brak.

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 4
- [E2E] odznaczone na podstawie przebiegow testera: 2
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [x] CLI: `node --test src/widoki/klienci-dane.test.js src/ui/router.test.js` przechodzi -> PASS (komenda: `node --test src/widoki/klienci-dane.test.js src/ui/router.test.js`)
- [x] CLI: `npm run typecheck` przechodzi bez błędów (IU-13) -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `node --test src/widoki/klienci-dane.test.js src/kreator/stan.test.js` przechodzi -> PASS (komenda: `node --test src/widoki/klienci-dane.test.js src/kreator/stan.test.js`)
- [x] CLI: `npm run typecheck` przechodzi bez błędów (IU-14) -> PASS (komenda: `npm run typecheck`)
- [x] E2E: `klienci-dodaj-karta` i `wycena-klient-z-listy` -> PASS (e2e.mjs ksieguj: odznaczone 2, fail 0, skip 0, manual 0, bezWpisu 0)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 23 (21) |
| Flagi warstw | ui=true dane=false typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 2 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 2 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 16 -> 16 -> 15 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 9 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 3 / 9 (batchowanie: 9 findingow w 3 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 8 / 0 / 1 / 1 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
