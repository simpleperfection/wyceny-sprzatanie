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
