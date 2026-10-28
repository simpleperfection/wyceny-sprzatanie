# Review fazy 2 — Dane w przeglądarce

Data: 2026-10-24. Gate: **BLOKUJE** (P1: 3, P2: 13, P3: 8, OPERATOR: 0). Adversarial verify: 16 weryfikowanych, 0 obalonych. E2E: brak checkboxów [E2E] w fazie (0 / 0 / 0).

## Findingi P1

### P1 · KOD · `src/dane/kopia.js:220`

Eksport i import kopii sprawdzają dane różnie, więc aplikacja może zapisać kopię, której potem nie wczyta. `utworzKopie` sprawdza tylko `zaktualizujStan` → `jestStanem`, a ten przy wycenach wymaga jedynie, żeby każda była obiektem. `odczytajKopie` (kopia.js:265-270) odrzuca cały plik kodem `uszkodzony`, gdy jakikolwiek tekst ma ponad 2000 znaków, wycen jest więcej niż 5000 albo któraś wycena nie spełnia `jestWycena`. Na ścieżce zapisu żadna z tych granic nie obowiązuje: `utworzSzkic` przyjmuje dowolne `odpowiedzi`, a liczba szkiców nie ma limitu. Sprawdzone w node: szkic z `uwagi` o długości 2500 znaków → `utworzKopie` bez błędu → `odczytajKopie` rzuca `BladKopii('uszkodzony')`; tak samo przy 5001 wycenach. Skutek: jedyna kopia wszystkich danych nie daje się wczytać, a błąd wychodzi dopiero przy odtwarzaniu. Poprawka: w `utworzKopie` uruchomić tę samą walidację co w `odczytajKopie` (`maKrotkieTeksty`, `MAKS_WYCEN`, `every(jestWycena)`) i rzucić błąd przy eksporcie; te same limity egzekwować przy zapisie (`utworzSzkic`, zapisy odpowiedzi). (źródło: correctness)

### P1 · KOD · `src/dane/wyceny.js:118`

IU-7: `sprawdzWynik` przepuszcza `wizytWMiesiacu` tylko jako dodatnią liczbę całkowitą. Silnik (src/silnik/cena.js:139) wpisuje tam `wariant.wizyt_w_miesiacu` z data/ceny.json:112-115, czyli 4.33, 8.67 albo 21.67. Skutek: `zapiszWynik` rzuca `BladWyceny('wynik')` dla każdego abonamentu biura poza 3× w tygodniu (13), więc takiej wyceny nie da się zapisać ani zamienić w zlecenie. Test w wyceny.test.js używa `wizyt = 4` i zostaje zielony. Poprawka: przyjmować dodatnią liczbę skończoną (`jestLiczba(wizyt) && wizyt > 0`). (źródło: spec-compliance)

### P1 · KOD · `src/dane/wyceny.js:2050`

IU-7 `dodajWykonanie` („zlecenie jednorazowe → `wykonana`, abonament zostaje `przyjeta`”): rodzaj zlecenia rozpoznaje się po `wynik.wizytWMiesiacu === null`. Wariant biura `jednorazowe` ma w data/ceny.json:111 `wizyt_w_miesiacu: 1`, a src/silnik/cena.js:139 zapisuje wtedy 1, nie null. Jednorazowe sprzątanie biura zostaje więc w statusie `przyjeta` i nigdy nie przechodzi w `wykonana`. Poprawka: rozpoznawać abonament po identyfikatorze wariantu albo po `wizytWMiesiacu > 1` (drugi wariant wymaga uzgodnienia znaczenia pola z silnikiem). (źródło: spec-compliance)

## Findingi P2

### P2 · KOD · `src/dane/kopia.js:23`

Lista `RODZAJE_WYCENY = ['szybka', 'dokladna']` jest skopiowana z src/dane/wyceny.js:50, a typ RodzajWyceny opisuje ją trzeci raz. Nowy rodzaj dopisany tylko w wyceny.js sprawi, że kopie z taką wyceną będą odrzucane jako `uszkodzony`. Zmiana: wyeksportować zamrożoną stałą z wyceny.js, wyprowadzić z niej typ (`typeof RODZAJE_WYCENY[number]`) i importować ją w kopia.js. (źródło: code-quality)

### P2 · KOD · `src/dane/kopia.js:60`

Kształt migawki wyniku jest zdefiniowany dwa razy i każda definicja sprawdza co innego: `sprawdzWynik` (wyceny.js:115) przy zapisie i `jestWynikiem` (kopia.js:60) przy imporcie; podobnie wycena (`jestWycena`, kopia.js:90) ma osobny schemat, a magazyn sprawdza ją tylko jako obiekt. Skutek: wynik przyjęty przez `zapiszWynik` może dać kopię nie do wczytania, a z pliku wchodzą migawki, których aplikacja by nie zapisała. Zmiana: wyeksportować z wyceny.js jeden strażnik `jestMigawkaWyniku(x)` (i `jestWycena(x)`), użyć go w `sprawdzWynik` i w kopia.js zamiast `jestWynikiem`/`jestWycena`/`jestCzescia`. (źródło: code-quality)

### P2 · KOD · `src/dane/kopia.js:72`

Strażnik `jestWarunkiem` ma dwie identyczne definicje (kopia.js:72 i magazyn.js:88), a pomocnicze `jestObiektem`, `jestLiczba`, `jestTekstemLubNull`, `jestListaTekstow` są skopiowane w czterech modułach; lista pól firmy w magazyn.js:93 dubluje `POLA_FIRMY` z ustawienia.js:37. Zmiana: utworzyć `src/dane/ksztalt.js` z tymi strażnikami i importować je; `POLA_FIRMY` przenieść do magazyn.js albo ksztalt.js. (źródło: code-quality)

### P2 · KOD · `src/dane/kopia.js:171`

Import kopii omija walidację wartości z warstwy zapisu: `odczytajKopie` sprawdza ustawienia tylko typami (`jestUstawieniami`), a `wczytajKopie` zapisuje przez `zapiszCalosc`. Pomija `IDENTYFIKATOR` dla `wojewodztwoId` i kluczy `koszty.sprzet`, `bladTempa`, `GRANICE_KOSZTOW`, `DNI_PRZYPOMNIENIA_KOPII`, walidację e-maila/telefonu/NIP i `DLUGOSC_POL_FIRMY`; po stronie wycen limity klienta 120/200/40, zakres minut wykonania (0, 1440], format daty, nieujemne kwoty, dodatnie `minutyNormowe` i górną granicę liczników. Spreparowany plik z `tempo.reczne: 0`, `przypomnienieKopiiDni: -1` albo `wojewodztwoId` z HTML przechodzi i w trybie `zastap` zostaje w localStorage (trwała awaria `opisTempa`, martwe przypomnienie, niezaufane wartości dla widoków IU-12). Naprawa: wyeksportować z ustawienia.js `sprawdzUstawienia` (pełny `sprawdzZmiane` + `IDENTYFIKATOR`) i wołać ją w `odczytajKopie`; w `jestWycena` użyć limitów z wyceny.js (`DLUGOSC_KLIENTA`, `MAKS_MINUT_WYKONANIA`, `jestDniem`, `sprawdzWynik`); `licznikNumerow` ≤ 100000. (źródło: security)

### P2 · KOD · `src/dane/kopia.js:282`

Tryb „połącz” tworzy zdublowane numery wycen: `polaczStany` łączy po `id`, licznik bierze maksimum, ale nie sprawdza, czy wyceny o różnych `id` mają ten sam `numer` (np. 1/10/2026 z telefonu i z laptopa). Poprawka: wycenie z pliku z zajętym numerem nadać kolejny numer jej miesiąca z połączonego licznika albo zablokować połączenie i pokazać listę kolizji. (źródło: correctness)

### P2 · TEST · `src/dane/kopia.test.js:101`

Bramki `jestWynikiem` (kopia.js:157), `jestOferta` (kopia.js:172) i część `jestCzescia` (`wejscie` bez uslugaId, zła `szybka`) nie mają testów odmowy, podobnie gałąź `typeof tekst !== 'string'` (kopia.js:257). Dodać przypadki: wynik z `cena: '250'` i `linie: null`, oferta z `nieaktualna: 'nie'`, `{ wejscie: {} }`, `{ szybka: { stan: 's', tryb: 't', od: '1', do: 2 } }` → `uszkodzony`; `odczytajKopie(42)` → `zly_plik`. (źródło: test-coverage)

### P2 · TEST · `src/dane/kopia.test.js:461`

Brak testów odmowy dla wartości ustawień i limitów wycen w imporcie kopii: `tempo.reczne: 0` i `99`, `przypomnienieKopiiDni: 3`, `wojewodztwoId: "<b>"`, `koszty.sprzet: { "__proto__": 5 }`, `firma.email: "nie-email"`, wykonanie `{ minuty: 5000 }` i `{ data: "jutro" }`, nazwa klienta > 120 znaków powinny dawać `BladKopii('uszkodzony')`. Dodać pętlę w `describe('odczytajKopie')` razem z poprawką walidacji. (źródło: security)

### P2 · TEST · `src/dane/magazyn.test.js:64`

Warunki `jestUstawieniami`/`jestStanem` (koszty, zakresy, warunki, przypomnienieKopiiDni, kreatorZakonczony, miesiąc licznika, kopia.ostatnia/zmianaOd, preferencje) nie mają testu odmowy. Dopisać do pętli `{ koszty: { sprzet: 'x', dojazd: {} } }`, `{ zakresy: { okna: { wchodzi: 'mycie' } } }`, `{ warunki: [{ id: 'a' }] }`, `{ przypomnienieKopiiDni: 7.5 }`, `{ kreatorZakonczony: 'tak' }` oraz asercje `wczytaj()` → `uszkodzony` dla `licznikNumerow: { '2026-13': 1 }`, `kopia: { ostatnia: 'wczoraj', zmianaOd: null }` i `preferencje: {}`. (źródło: test-coverage)

### P2 · TEST · `src/dane/ustawienia.test.js:129`

Zakres sprawdzany tylko dla `koszty.chemia_h`; brak testów odmowy dla sprzętu, dojazdu i gałęzi `wartosc`. Dopisać: `koszty.sprzet.szorowarka: 501` → zakres, `koszty.dojazd.klient_zl_km: 25` → zakres, `darmowy_promien_km: '10'` → liczba, `firma.telefon: 600123456` → wartosc, `firma: 'Firma'` → wartosc, `koszty.sprzet: []` → wartosc. (źródło: test-coverage)

### P2 · KOD · `src/dane/walidacja.js:8`

Próg tempa `{ min: 0.5, max: 3 }` jest zdefiniowany dwa razy: `GRANICE_TEMPA` (walidacja.js:8) i `GRANICE_STOSUNKU_TEMPA` (src/silnik/tempo.js:21). Po zmianie jednej kopii tempo wyliczone z zleceń może wypaść poza zakres akceptowany jako ręczne. Zmiana: w walidacja.js importować `GRANICE_STOSUNKU_TEMPA` z silnika i eksportować jako `GRANICE_TEMPA` (albo jedna stała w silniku). (źródło: code-quality)

### P2 · KOD · `src/dane/wyceny.js:265`

`dodajWykonanie` nie jest idempotentne: id wpisu powstaje wewnątrz (`crypto.randomUUID()`), więc podwójne kliknięcie „Zapisz” dopisuje abonamentowi drugi identyczny wpis (zawyża wizyty i przesuwa medianę tempa), a przy zleceniu jednorazowym kończy się `tylko_odczyt`. Zmiana: przyjmować `id` wpisu od wywołującego i zwracać wycenę bez zmian, gdy wpis o tym id już istnieje. (źródło: code-quality)

### P2 · TEST · `src/dane/wyceny.test.js:68`

Gałęzie wyceny.js bez testu: (1) `sprawdzSzybka` – szybka wycena z poprawnymi i złymi widełkami (`do: 'x'` → `szybka`); (2) `odpowiedzi: []` → `odpowiedzi`; (3) `klientZeZmiany` – nazwa 121 znaków i `adres: 5` → `klient`, `termin: '  '` → null; (4) `sprawdzWynik` – `vat: -1`, `wizytWMiesiacu: 0`, `linie: null` → `wynik` (po poprawce P1 ułamkowe wizyty mają przechodzić); (5) `tempoPlanu: 0` → `tempo`; (6) gałąź `w.oferta.wyslana !== null` w `poWyslaniu` (przyjęta wycena z ustawionym `oferta.wyslana` → po `zapiszWejscie` `nieaktualna === true`). (źródło: test-coverage)

### P2 · TEST · `src/silnik/tempo.test.js:29`

Dolna granica stosunku tempa (tempo.js:52) nie ma testu zachowania. Dodać w `wpisyTempa` przypadek 0.4 → `liczony: false` i 0.5 → `liczony: true`, a w `tempoWlasne` `[1.1, 1.2, 1.4, 0.3]` → mediana 1,2 z `liczba: 3`. (źródło: test-coverage)

## Findingi P3

### P3 · KOD · `src/dane/walidacja.js:73`

`bladEmaila` przepuszcza znaki sterujące C0 (poza białymi) i U+007F, np. `kontakt@firma.pl\u0000`. Naprawa: `/[\s\u0000-\u001f\u007f]/.test(adres)` i dopisanie tych wejść do testu. (źródło: security)

### P3 · KOD · `src/dane/kopia.js:160`

`odczytajKopie` nie ogranicza rozmiaru tekstu przed `JSON.parse`; plik rzędu setek MB zamraża kartę. Naprawa: `MAKS_DLUGOSC_PLIKU = 5_000_000` i `BladKopii('zly_plik', 'Plik kopii jest za duży')`. (źródło: security)

### P3 · KOD · `src/dane/kopia.js:33`

Kod błędu `BladKopii` ma typ `string`, choć zbiór kodów jest zamknięty. Dodać typedef `KodBleduKopii` ('zly_plik' | 'nowsza_wersja' | 'uszkodzony' | 'tryb' | 'data') i użyć go w konstruktorze i polu `kod`. (źródło: code-quality)

### P3 · KOD · `src/dane/ustawienia.js:38`

Limit 254 dla e-maila w `DLUGOSC_POL_FIRMY.email` dubluje `DLUGOSC_EMAILA_MAKS` z walidacja.js:14. Wyeksportować stałą i użyć jej. (źródło: code-quality)

### P3 · KOD · `src/dane/magazyn.js:71`

Wzorzec „wywołaj `sprawdzStatusVat` i złap BladWejscia” występuje trzy razy (magazyn.js:71, ustawienia.js:81, ustawienia.js:205). Dodać w src/silnik/vat.js strażnik `jestStatusemVat` i zastąpić nim bloki try/catch. (źródło: code-quality)

### P3 · KOD · `src/dane/wyceny.js:247`

`zmienStatus(..., 'wyslana')` nie ustawia `oferta.wyslana`, więc po przejściu do `przyjeta` zmiana wejścia lub ceny nie oznacza oferty jako nieaktualnej. Poprawka: przy `nowy === 'wyslana'` ustawiać `oferta.wyslana = teraz.toISOString()` i `nieaktualna: false`. (źródło: correctness)

### P3 · KOD · `src/dane/ustawienia.js:233`

`brakujeUstawien` zgłasza 'wojewodztwo' zawsze przy `wojewodztwoId === null`, także przy świadomym wyborze „średnia krajowa” (plan, linie 755 i 932). Poprawka: `if (ustawienia.wojewodztwoId === null && !ustawienia.kreatorZakonczony)`. (źródło: correctness)

### P3 · TEST · `src/dane/kopia.test.js:146`

Test `polacz` nie sprawdza równych dat `zmieniona` (lokalna ma wygrać, kopia.js:286 `>`). Dodać test: lokalna `1/10/2026` i z pliku `9/10/2026` z tą samą `zmieniona` → zostaje `1/10/2026`. (źródło: test-coverage)

## Findingi OPERATOR

Brak.

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 7
- [E2E] odznaczone na podstawie przebiegow testera: 0
- [E2E] przeniesione w trakcie runu na [Manual]: 0 (lista: brak)
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

Skrypt `e2e.mjs ksieguj`: kod wyjścia 0, wynik `{"odznaczone":0,"fail":0,"skip":0,"manual":0,"bezWpisu":0,"manualPozycje":[]}`.

### Szczegoly

- [x] CLI: `IU-6: `node --test src/dane/magazyn.test.js src/dane/ustawienia.test.js src/dane/walidacja.test.js` przechodzi` -> PASS (komenda: `node --test src/dane/magazyn.test.js src/dane/ustawienia.test.js src/dane/walidacja.test.js`)
- [x] CLI: `IU-6: `npm run typecheck` przechodzi bez błędów` -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `IU-7: `node --test src/dane/wyceny.test.js src/silnik/tempo.test.js` przechodzi` -> PASS (komenda: `node --test src/dane/wyceny.test.js src/silnik/tempo.test.js`)
- [x] CLI: `IU-7: `npm run typecheck` przechodzi bez błędów` -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `IU-8: `node --test src/dane/kopia.test.js` przechodzi` -> PASS (komenda: `node --test src/dane/kopia.test.js`)
- [x] CLI: `IU-8: `npm test` przechodzi` -> PASS (komenda: `npm test`)
- [x] CLI: `IU-8: `npm run typecheck` przechodzi bez błędów` -> PASS (komenda: `npm run typecheck`)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 16 (13) |
| Flagi warstw | ui=false dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 0 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany — brak checkboxow [E2E] w fazie |
| Przebiegi E2E PASS / FAIL / SKIP | 0 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 25 -> 25 -> 24 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 16 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 9 / 4 / 13 (batchowanie: 13 findingow w 4 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 22 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
