# Review fazy 1 — Narzędzia i silnik wyceny

Data: 2026-10-24. Gate: **ZASTRZEZENIA** (P1: 0, P2: 8, P3: 7, OPERATOR: 1). Adversarial verify: 8 weryfikowanych, 0 obalonych. E2E: brak checkboxów [E2E] w fazie (0 / 0 / 0).

## Findingi P1

Brak.

## Findingi P2

### P2 · TEST · `scripts/serwer-dev.test.mjs:85`

Nie ma testu odmowy dla jedynej bariery przed ścieżkami z literą dysku Windows, czyli sprawdzenia prefiksu w scripts/serwer-dev.mjs:57. Wszystkie cztery wektory z pętli testu (`..`, `%2e%2e`, `%5C`, `..%2f`) zatrzymuje wcześniej filtr segmentów zaczynających się od kropki (serwer-dev.mjs:55), więc linia 57 nie ma testu. Segment `C:..` albo `D:` nie zaczyna się od kropki, a `path.resolve` na win32 liczy ścieżkę względną na dysku od cwd procesu (`resolve(korzen,'D:','x')` daje `D:\x`). Dziś `/C:..%5Cpackage.json` i `/D:/x` dostają 403 tylko dzięki linii 57; jej usunięcie przy zielonych testach pozwoliłoby czytać pliki spoza repo. Naprawa: do tablicy w linii 85 dopisać `'/C:..%5Cpackage.json'`, `'/C:../C:../CLAUDE.md'` i `'/D:/x'` z oczekiwanym 403 (na innych systemach 403 albo 404, nigdy 200). (źródło: security)

### P2 · KOD · `src/silnik/cena.js:40`

Walidacja metrażu ma trzy kopie i już się rozjechała: `sprawdzMetraz` w cena.js:40 odrzuca m² > `M2_MAKS` (100 000), a kopie w uklad.js:13 i czas.js:19 przyjmują każdą dodatnią liczbę, choć rzucają ten sam kod `metraz`. `sprawdzIlosc` jest w czas.js:24 i cena.js:35. Skutek: `ukladMieszkania(150000)` i `minutyPomieszczen` liczą wynik, a `wycenUsluge` rzuca błąd. Poprawka: przenieść `sprawdzMetraz` (z `M2_MAKS`) i `sprawdzIlosc` do jednego modułu, np. `src/silnik/walidacja.js`, i importować w uklad.js, czas.js i cena.js. (źródło: code-quality)

### P2 · TEST · `src/silnik/cena.test.js:300`

Ścieżka błędu w cena.js:48 (`throw new BladWejscia('poziom_brudu')` we własnej kopii `mnoznikBrudu`) nie ma testu; odmowę poziomu 4 sprawdza tylko czas.test.js dla osobnej funkcji. Zastąpienie wyjątku `return 1` dałoby po cichu cenę poziomu 1 przy zielonym zestawie. Poprawka: w bloku walidacji dodać `assert.throws(() => wycenUsluge({ uslugaId: 'doczyszczanie', pozycje: [{ id: 'doczyszczanie_posadzki', ilosc: 10 }], poziomBrudu: 4 }, katalog), bladWejscia('poziom_brudu'))`. (źródło: test-coverage)

### P2 · KOD · `src/silnik/czas.js:103`

Reguła czasu pozycji jest zapisana dwa razy: `minutyPozycji` w czas.js:103-113 (wołana tylko z czas.test.js) i produkcyjnie w `liniePozycji` (cena.js:105-109). `mnoznikBrudu` jest skopiowany w czas.js:87 i cena.js:45. Test czasu sprawdza kod, którego silnik nie używa, więc zmiana reguły w jednej kopii przejdzie przez testy. Poprawka: wyeksportować z czas.js `mnoznikBrudu` i funkcję minut jednej pozycji, wołać ją z `minutyPozycji` i `liniePozycji`, usunąć kopię w cena.js:45 (albo usunąć nieużywany `minutyPozycji` i przenieść jego testy na `wycenUsluge`). (źródło: code-quality)

### P2 · KOD · `src/silnik/katalog.js:64`

Predykaty `jestCenami` (64), `jestNormami` (70) i `jestRynkiem` (77) zawężają `unknown` do pełnych typów `Ceny`, `Normy`, `Rynek`, ale sprawdzają tylko klucze najwyższego poziomu (bez `uslugi[].tryb/id/pozycje[].cena`, `wojewodztwa[].stawka_h/wsp`, `koszty_firmy.dojazd.*`, `uklady.mieszkanie.kuchnia.udzial`). Ręcznie edytowany JSON z literówką daje cicho `NaN` w cenie, widełkach albo dojeździe zamiast `BladKatalogu('zly_format')`. Poprawka: dopisać kontrolę pól czytanych przez silnik albo zawęzić predykat do typu, który rzeczywiście sprawdza, i resztę walidować w `sprawdzSpojnosc`. (źródło: code-quality)

### P2 · TEST · `src/silnik/koszt.test.js:297`

Dwie bramki walidacji w sprawdzWejscie (src/silnik/koszt.js:88-91) nie mają testu odmowy: brak lub NaN w `cenaKlienta.brutto`/`netto` (kod `cena_klienta`) oraz brak `koszty.chemia_h.wartosc` albo `koszty.dojazd.koszt_firmy_zl_km` (kod `koszty_firmy`). Bez testu można je usunąć, a `zostaje` i `zostajeNaGodzine` dostaną NaN. Poprawka: dodać `assert.throws(() => kosztZlecenia(wejscie({ cenaKlienta: { brutto: Number.NaN, netto: 0, vat: 0 } }), katalog), { name: BladWejscia.name, kod: 'cena_klienta' })` i analogiczną z `koszty: { ...katalog.kosztyFirmy, chemia_h: {} }` i kodem `koszty_firmy`. (źródło: test-coverage)

### P2 · KOD · `src/silnik/widelki.js:53`

Widełki pomijają minimum zlecenia we wszystkich usługach z pomieszczeniami, choć uzasadnienie (zakres rynku = ceny całych zleceń) dotyczy tylko mieszkań. `sprzatanie_biur` ma `rynek_odniesienie: "stawka_h"`, więc `wycenUsluge` doda minimum, a widełki nie. Na prawdziwych danych: biuro 20 m², `jednorazowe`, stawka krajowa: cena 150 zł (czyMinimum), widełki 42,81–114,15 zł; 10 m²: 150 zł przy widełkach 32,65–87,07. Cena wypada nad górną granicą rynku, wbrew R5. Poprawka: `const minimum = usluga.tryb === TRYB_POZYCJI || usluga.rynek_odniesienie === 'stawka_h' ? wynik.minimum : 0` albo flaga w danych przy punkcie rynku. (źródło: correctness)

### P2 · TEST · `src/silnik/widelki.test.js:110`

Zakres pozycji w cena.js:62 (`ilosc * zakres[i] * mnoznik`, mnoznik = wsp × próg × brud) jest testowany tylko w mazowieckim (wsp 1) i bez poziomu brudu, więc mnożenie samym `prog` przeszłoby testy. Poprawka: dodać test `widelki({ uslugaId: 'okna', wojewodztwoId: 'opolskie', pozycje: [{ id: 'okno_1', ilosc: 8 }] })` z `do` = 8 × 70 × 1,07 = 599,2 oraz test doczyszczania 200 m² na poziomie brudu 3 z `od`/`do` policzonymi z progu z data/ceny.json × 1,4, zapisanymi jako liczby. (źródło: test-coverage)

## Findingi P3

### P3 · KOD · `scripts/serwer-dev.mjs:63`

Serwer nie sprawdza nagłówka `Host` (`Host: evil.example:5174` dostaje 200). DNS rebinding pozwala stronie atakującego czytać pliki spoza katalogów z kropką przy uruchomionym `npm start`; dziś te pliki są publiczne albo z npm, więc skutek mały. Naprawa: w `obsluzZadanie` odrzucać 403 żądania z `req.headers.host` innym niż `127.0.0.1:<port>`/`localhost:<port>` i dopisać test z `Host: evil.example`. (źródło: security)

### P3 · KOD · `src/silnik/koszt.js:33`

`pozycjeWgKlucza` przy każdym `kosztZlecenia` buduje od nowa mapę `usluga.pozycja → Pozycja`, którą `indeksyCen` w katalog.js:126 już trzyma. Poprawka: akcesor `katalog.pozycjaWgKlucza(klucz)` rzucający `BladWejscia('nieznana_pozycja')`, usunąć `pozycjeWgKlucza` i parametr `pozycje` z `chemiaLinii`/`kosztSprzetu`. (źródło: code-quality)

### P3 · KOD · `src/silnik/cena.js:16`

`LiniaWyceny` opisuje dwa stany jednym typem z polami nullable (`klucz === null` dokładnie przy `rodzaj === 'praca'`), przez co koszt.js:39 używa `linia.klucz ?? ''`. Poprawka: unia rozłączna po `rodzaj` i usunięcie `?? ''`. (źródło: code-quality)

### P3 · KOD · `src/silnik/katalog.js:16`

`podstawa_ceny: string` w typedef `Usluga`, choć dopuszczalne są tylko `'brutto' | 'netto'`; szeroki typ idzie do `WynikWyceny.podstawaCeny` (cena.js:23) i `cenaDlaKlienta` (vat.js:37). Poprawka: `@typedef {'brutto' | 'netto'} PodstawaCeny` użyty we wszystkich trzech miejscach. (źródło: code-quality)

### P3 · KOD · `src/silnik/uklad.js:18`

Nazwa `wGranicach(wartosc, min, max)` brzmi jak predykat, a funkcja przycina wartość. Poprawka: zmienić na `przytnijDoGranic` (linia 18 i wywołanie w linii 58). (źródło: code-quality)

### P3 · KOD · `scripts/serwer-dev.mjs:81`

`createReadStream(...).pipe(res)` nie zamyka strumienia pliku, gdy klient przerwie żądanie; deskryptory kumulują się w długiej sesji E2E. Poprawka: `pipeline(createReadStream(wynik.plik), res, (blad) => { if (blad && blad.code !== 'ERR_STREAM_PREMATURE_CLOSE') zapiszBlad(req.url, blad) })` z `node:stream`. (źródło: correctness)

### P3 · TEST · `scripts/serwer-dev.test.mjs:216`

Gałąź `if (zdekodowana.includes('\0')) return { status: 400 }` (scripts/serwer-dev.mjs:53) nie ma testu; po jej usunięciu serwer odda 500 zamiast 400 przy zielonym zestawie. Poprawka: w teście z linii 216 dopisać `assert.equal((await serwer.pobierz('/index.html%00.js')).status, 400)`. (źródło: test-coverage)

## Findingi OPERATOR

### OPERATOR · `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md:369`

IU-4, `widelki.js`: wykonawca zmienił plan — minimum zlecenia wchodzi na oba końce widełek tylko w usługach z pozycjami (src/silnik/widelki.js:76), dzięki czemu widełki mieszkania 50 m² w mazowieckim to 120–450 zł (przy pierwotnej regule 150–450). Decyzja oznaczona „do potwierdzenia przez właściciela” nie trafiła na listę w PLAN.md:120. Akcja: dopisać tam pozycję „widełki usług z pomieszczeniami bez minimum zlecenia (mieszkanie 50 m²: 120 zamiast 150 zł)”, a po potwierdzeniu usunąć dopisek z linii 369 planu. (źródło: spec-compliance)

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]

- Odznaczone automatycznie (CLI/grep): 15
- [E2E] odznaczone na podstawie przebiegow testera: 0
- [E2E] przeniesione w trakcie runu na [Manual]: 0 (lista: brak)
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 0

Skrypt `e2e.mjs ksieguj`: kod wyjścia 0, wynik `{"odznaczone":0,"fail":0,"skip":0,"manual":0,"bezWpisu":0,"manualPozycje":[]}`.

### Szczegoly

- [x] CLI: `IU-1: `npm test` przechodzi` -> PASS (komenda: `npm test`)
- [x] CLI: `IU-1: `npm run typecheck` przechodzi bez błędów` -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `IU-1: `node --test scripts/serwer-dev.test.mjs` przechodzi` -> PASS (komenda: `node --test scripts/serwer-dev.test.mjs`)
- [x] CLI: `IU-2: kalibracja.ps1 bez wyjątku, „niezgodności katalogu: 0”` -> PASS (komenda: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1`)
- [x] CLI: `IU-2: KALIBRACJA.md i rynek.json bez zmian` -> PASS (komenda: `git diff --exit-code research/KALIBRACJA.md data/rynek.json`)
- [x] CLI: `IU-2: BOM kalibracja.ps1 = ef bb bf` -> PASS (komenda: `head -c3 scripts/kalibracja.ps1 | od -An -tx1`)
- [x] CLI: `IU-2: kalibracja-scenariusze.json się parsuje` -> PASS (komenda: `node -e JSON.parse(...)`)
- [x] CLI: `IU-3: testy katalog/uklad/czas przechodzą` -> PASS (komenda: `node --test src/silnik/katalog.test.js src/silnik/uklad.test.js src/silnik/czas.test.js`)
- [x] CLI: `IU-3: typecheck bez błędów` -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `IU-4: testy cena/widelki/parytet przechodzą` -> PASS (komenda: `node --test src/silnik/cena.test.js src/silnik/widelki.test.js src/silnik/parytet.test.js`)
- [x] CLI: `IU-4: kalibracja.ps1 „niezgodności katalogu: 0”` -> PASS (komenda: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1`)
- [x] CLI: `IU-4: typecheck bez błędów` -> PASS (komenda: `npm run typecheck`)
- [x] CLI: `IU-5: testy vat/koszt przechodzą` -> PASS (komenda: `node --test src/silnik/vat.test.js src/silnik/koszt.test.js`)
- [x] CLI: `IU-5: `npm test` przechodzi` -> PASS (komenda: `npm test`)
- [x] CLI: `IU-5: typecheck bez błędów` -> PASS (komenda: `npm run typecheck`)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 29 (19) |
| Flagi warstw | ui=false dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 0 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany — brak checkboxow [E2E] w fazie |
| Przebiegi E2E PASS / FAIL / SKIP | 0 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 17 -> 17 -> 16 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 8 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 0 / 2 / 8 (batchowanie: 8 findingow w 2 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 8 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
