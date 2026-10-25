# Kontekst: etap-5-aplikacja-wyceny

Branch: `feature/etap-5-aplikacja-wyceny`
Ostatnia aktualizacja: 2026-10-24
Plan techniczny: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`

## Źródła

- Plan techniczny: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`
- Requirements doc: `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`
- Przygotowanie dla operatora: `docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md`

## Plan techniczny

Kluczowe pliki, decyzje techniczne, odroczone pytania i wzorce do naśladowania: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md` (sekcje „Kluczowe decyzje techniczne”, „Otwarte pytania”, tabela plików i „Wzorce do naśladowania” w blokach IU).

## Designerski kontekst

- **DESIGN.md (projekt-wide):** null
- **SPEC.md (per-feature, pomiary z Figmy):** `./docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md`
- **Screeny referencyjne:**
  - `ekran-startowy`: `./docs/plans/etap-5-aplikacja-wyceny-figma/ekran-startowy.png`
  - `ustawienia-firmy`: `./docs/plans/etap-5-aplikacja-wyceny-figma/ustawienia-firmy.png`
  - `szybka-wycena`: `./docs/plans/etap-5-aplikacja-wyceny-figma/szybka-wycena.png`
  - `pytania-do-klienta`: `./docs/plans/etap-5-aplikacja-wyceny-figma/pytania-do-klienta.png`
  - `kreator-wybor-uslugi`: `./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-wybor-uslugi.png`
  - `kreator-pomieszczenia`: `./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-pomieszczenia.png`
  - `kreator-pozycje`: `./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-pozycje.png`
  - `kreator-dodatki`: `./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-dodatki.png`
  - `dobor-chemii`: `./docs/plans/etap-5-aplikacja-wyceny-figma/dobor-chemii.png`
  - `podsumowanie-wyceny`: `./docs/plans/etap-5-aplikacja-wyceny-figma/podsumowanie-wyceny.png`
  - `zakonczenie-zlecenia`: `./docs/plans/etap-5-aplikacja-wyceny-figma/zakonczenie-zlecenia.png`
  - `oferta-edycja`: `./docs/plans/etap-5-aplikacja-wyceny-figma/oferta-edycja.png`
  - `oferta-klient`: `./docs/plans/etap-5-aplikacja-wyceny-figma/oferta-klient.png`
  - `kopia-zapasowa`: `./docs/plans/etap-5-aplikacja-wyceny-figma/kopia-zapasowa.png`

## Wymagania wstępne operatora

Checklista: `docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md`.

- [x] faza 1 — 🔓 **Zainstalować `agent-browser`** — **[blokuje: faza 1]** (bramka środowiska E2E) · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:72
- [x] faza 1 — 🔓 **Utworzyć `.env.e2e` dla serwera `scripts/serwer-dev.mjs`** — **[blokuje: faza 1]** (bramka środowiska E2E; serwer powstaje w IU-1) · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:84
- [x] faza 6 — 🔓 **Zakres „wchodzi / nie wchodzi”** dla każdej usługi i rodzaju sprzątania (R19) — **[blokuje: faza 6]** (IU-22). Usługi: mieszkanie standard, gruntowne, po remoncie, po wynajmie; biura; okna; AGD; tapicerka; dywany; mycie posadzek; doczyszczanie; kostka; elewacja; hale. Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/zakresy.json`. · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:93
- [x] faza 5 — 🔓 **Pytania do klienta przed wyceną** dla każdej usługi (R13), z zaznaczeniem, które odpowiedzi ustawiają coś w wycenie (np. zwierzęta → sierść, odległość → dojazd) — **[blokuje: faza 5]** (IU-20). Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/pytania.json`. · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:97

## Dziennik

### 2026-10-24 — Faza 1: Narzędzia i silnik wyceny (IU-1–IU-5)

- Domknięcie fazy: `npm test` 146/146, `npm run typecheck` bez błędów, `scripts/kalibracja.ps1` bez wyjątku („niezgodności katalogu: 0”), `research/KALIBRACJA.md` i `data/rynek.json` bez zmian, BOM skryptu zachowany. Skrypt bramek (`bramki.mjs`) pada na Windows: `spawnSync` bez powłoki nie uruchamia `node_modules/.bin/tsc` (ENOENT); bramki puszczone osłoną łapiącą wyjątek (typecheck = `blad`, ta sama komenda `tsc --noEmit` ręcznie: kod 0), pozostałe `brak`/`pominieta`/`ok`.
- Korekta planu: minimum zlecenia w widełkach rynku tylko przy usługach z pozycjami (szczegóły w IU-4 planu technicznego; do potwierdzenia przez właściciela).
- IU-1: typescript 7.0.2 przypięty dokładnie; `tsconfig.json` ma `"references": []` (obejście TS18003, gdy `src/` było puste — do usunięcia, ale nieszkodliwe) i `verbatimModuleSyntax`; serwer dodatkowo odmawia segmentów z kropką (403), metod innych niż GET/HEAD (405), złego kodowania i NUL (400), sprawdza wynik w korzeniu i wysyła `nosniff`; pliki dłuższe niż budżet (92 i 94 linie); test na katalogach z `mkdtemp`, nie na fixture'ach. Dalej: `.env.e2e` ma wskazywać `node scripts/serwer-dev.mjs` i port 5174 (serwer słucha tylko na 127.0.0.1 — sprawdzić `localhost` vs `::1`); zdanie „kodu aplikacji jeszcze nie ma” w CLAUDE.md do aktualizacji.
- IU-2: kształt `uklady` w `data/normy.json` wybrany w IU (mieszkanie: kuchnia/aneks/przedpokój/łazienki z progami `do_m2`, zasady; biuro: wzorzec na 100 m²); skrypt i normy mają jedno źródło `$uklady`; scenariusze z funkcji `Scenariusz-Pomieszczen` i `Zlecenie-Wzorcowe` (35 + 8), `material` w scenariuszach pozycji to materiał na jednostkę, cena biura to cena wizyty; `.ToArray()` zamiast `@()` na liście słowników (PS 5.1). Dalej: wartości w pełnej precyzji — porównania z tolerancją 0,01; zlecenia wzorcowe nie pokrywają materiału doliczanego klientowi (osobny test jednostkowy).
- IU-3: katalog ma dodatkowo `przygotowanieMin` i `progiWydajnosciBiura`; kody błędów poza przykładami planu (`brak_przygotowania`, `brak_zestawu`, `brak_progu`, `zly_format`, kody `BladWejscia`); sygnatury z wymaganym katalogiem/układami (`ukladMieszkania(m2, opcje, uklady)`, `minutyPozycji(uslugaId, pozycje, poziomBrudu, katalog)`); `minutyDodatkow` nie filtruje trybu `propozycja` (robi to wywołujący); `tests/pomocnicze.js` z `czytajJson`, `daneTestowe`, `katalogZDanych`, `assertBlisko`; `katalog.js` 212+ linii przez JSDoc.
- IU-4: minimum w widełkach tylko dla usług z pozycjami (korekta planu wyżej); `katalog.rynekKraj(klucz)` z błędem `brak_rynku`; `LiniaWyceny` ma dodatkowo `klucz` i `minuty`; `stawkiDojazdu` trzecim parametrem `wycenUsluge`; `dezynfekcja` tylko w typie; nowe kody `pusty_zakres`, `tylko_dodatek`, `tryb_dodatku`, `dojazd`. Dalej: mnożnik brudu zdublowany w `czas.js` i `cena.js` (do wspólnego eksportu).
- IU-5: `vat.js` eksportuje `sprawdzStatusVat` (wspólny z `koszt.js`); linie `material` nie zwiększają kosztu chemii; chemia pozycji bez kosztu na jednostkę = `chemia_h` × minuty linii (z mnożnikiem brudu); `miesiecznie` = `{ przychod, kosztRazem, zostaje }` × wizyty albo null. Dalej: zdublowane `sprawdzIlosc`, `mnoznikBrudu`, `MINUT_W_GODZINIE` (cena/czas/koszt) do jednego modułu; `podstawa_ceny` zawęzić do `'brutto' | 'netto'`; w fazie 2 stawka VAT jako `stawkaVatProc`, a koszty firmy scala wywołujący przed `kosztZlecenia`.

### 2026-10-24 — Review fazy 1

- Gate: ZASTRZEZENIA (P1: 0, P2: 8, P3: 7, OPERATOR: 1); raport `docs/active/etap-5-aplikacja-wyceny/review-faza-1.md`, P3 w `known-issues.md`. Wszystkie 15 checkboxów „Weryfikacja:” fazy 1 przeszło (CLI). Najważniejsze: widełki biur (`rynek_odniesienie: stawka_h`) pomijają minimum zlecenia, więc cena 150 zł wypada nad górną granicą rynku; walidacja metrażu, mnożnik brudu i reguła czasu pozycji są zdublowane w czas.js/cena.js/uklad.js i już się rozjechały; brakuje testów odmowy (ścieżki z literą dysku w serwerze, poziom brudu w cena.js, bramki kosztu, wsp i brud w widełkach).

### 2026-10-24 — Faza 2: Dane w przeglądarce (IU-6–IU-8)

- Domknięcie fazy: `npm test` 279/279, `npm run typecheck` bez błędów; bramki: typecheck `ok`, testyUsuniete `ok`, eslint/knip/size-limit/stryker/testyTypow `brak` (brak zależności), migracje `pominieta`. Skrypt bramek na Windows nadal pada na `node_modules/.bin/tsc` (ENOENT), więc puszczony osłoną spoza repo, która podmienia shim na `tsc.cmd` przez powłokę (narzędzie bez zmian). Audyt obsługi błędów: catch-e mają re-throw albo kod błędu domeny; jedyne `console.warn` to strukturalny log JSON w `magazyn.js` (odmowa `persist()`, uszkodzony stan).
- IU-6: `utworzMagazyn(storage, { teraz, loguj, poprosOTrwalosc, okno })` (zależności do testów w Node); eksport `zaktualizujStan(dane)` dla kopii; typedefy schematu v1 w `magazyn.js`; `zapiszUstawienia(magazyn, zmiana, domyslne?)` tworzy ustawienia z `data/domyslne.json`, inaczej `BladUstawien('brak_ustawien')`; zwraca `Stan` (tak samo `pominKreator`); `BladUstawien(kod, pole)` z kodami telefon/email/nip/liczba/zakres/dlugosc/wartosc/nieznane_pole/status_vat/brak_ustawien; stałe `GRANICE_TEMPA` (0,5–3), `DNI_PRZYPOMNIENIA_KOPII` [7, 14, 30], `GRANICE_KOSZTOW` (górne granice ustalone przez wykonawcę: chemia 0–100 zł/h, sprzęt 0–500 zł/h, km 0–20 zł, darmowy promień 0–200 km); `data/domyslne.json` ma `stawka_vat_uwagi` („do potwierdzenia w źródłach”); pliki dłuższe niż budżet (magazyn 216, ustawienia ~290, walidacja 93 linie) przez kontrolę kształtu stanu pole po polu. Dalej: wspólny moduł logowania, gdy dojdzie trzecie miejsce (IU-10); `brakujeUstawien` zgłasza `wojewodztwo` przy świadomym wyborze średniej krajowej (decyzja w IU-11/IU-10); `SecurityError` z localStorage obsłużyć w `app.js` (IU-12); eksport listy statusów z `vat.js` uprościłby `jestStatusemVat`/`sprawdzStatus`.
- IU-7: typ `Wycena` w `magazyn.js` wskazuje `import('./wyceny.js').Wycena` (cykl tylko w JSDoc); `MigawkaWyniku` ma dodatkowo `propozycje` (IU-18, IU-22); oferta nieaktualna po wysłaniu także przy zmianie `cena` w `zapiszWynik`; API: `magazyn` pierwszym argumentem, opcjonalne `{ teraz }` ostatnim, `utworzSzkic` zwraca `Wycena`, reszta `Stan`, `wycena(stan, id)` → null dla nieznanego id, `zapiszWycene(magazyn, id, { klient? })`; `dodajWykonanie` tylko dla `przyjeta`, data RRRR-MM-DD, `tempoPlanu` > 0; wyjście ze szkicu wymaga wyniku (`brak_wyniku`); `usunWycene` w każdym statusie, numer nie wraca do puli; eksport `MAKS_MINUT_WYKONANIA = 1440`; `opisTempa` przy tempie ręcznym/domyślnym zwraca samo „1,3×”; `wyceny.js` 378 linii (po 811382a i kontroli diffu fazy 2). Zrobione w 811382a: `GRANICE_TEMPA` = `GRANICE_STOSUNKU_TEMPA` z `tempo.js`, jeden strażnik `jestWycena` dla zapisu i kopii, `dodajWykonanie` przyjmuje `id` wpisu (ekran zakończenia nadaje je przy otwarciu). Dalej: nowe settery (IU-18, IU-21, IU-22) przez wewnętrzny `zmienWycene`; szybka wycena „Kopiuj tekst” przez `zapiszWycene` + `zmienStatus(..., 'wyslana')`.
- IU-8: `kopia.js` 263 linie (pełna walidacja kształtu wyceny z pliku, limit zagnieżdżenia 32, unikalne id, `stan.wersja` = `wersjaSchematu`, wycena poza szkicem z numerem i wynikiem, teksty ≤ 2000 znaków → `uszkodzony`); `oznaczKopie` i `polacz` zapisują przez `zapiszCalosc` zamiast `zmien`, żeby `kopia.zmianaOd` nie przeskoczyło za `teraz`; przy uszkodzonym magazynie `polacz`/`oznaczKopie` rzucają `BladMagazynu`, a `zastap` działa bez odczytu (ekran ratunkowy); dni liczone kalendarzowo w czasie lokalnym, próg „co najmniej N dni”. Dalej: `jestStanem` w `magazyn.js` sprawdza tylko obiekty (kształt wyceny sprawdza od 811382a jeden strażnik `jestWycena` z `wyceny.js`); IU-12: limit `file.size`, `textContent`, odświeżenie widoków, teksty błędów; po `zastap` `kopia.ostatnia` pochodzi z pliku (baner może wrócić od razu — do decyzji). Zrobione w 811382a i kontroli diffu fazy 2: `polacz` ma limit 5000 wycen (`za_duzo_wycen` bez zapisu) i nadaje wycenie z pliku z numerem zajętym lokalnie kolejny numer miesiąca; numer nadany na tym urządzeniu zostaje przy kolejnych połączeniach, a wysłana oferta ze zmienionym numerem staje się nieaktualna.
