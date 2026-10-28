# Kontekst: aplikacja-modulowa

Branch: `feature/aplikacja-modulowa`
Ostatnia aktualizacja: 2026-10-28 (faza 1 domknięta)
Plan techniczny: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`

## Źródła

- Plan techniczny: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`
- Requirements doc: `docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md`
- Przygotowanie dla operatora: `docs/operator/aplikacja-modulowa-przygotowanie.md`

## Plan techniczny

Kluczowe pliki, decyzje techniczne, odroczone pytania i wzorce do naśladowania: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md` (sekcje „Kluczowe decyzje techniczne”, „Otwarte pytania”, tabela plików i „Wzorce do naśladowania” w blokach IU).

## Wymagania wstępne operatora

Checklista: `docs/operator/aplikacja-modulowa-przygotowanie.md`.

- [ ] faza 3 — **Makiety HTML nowego wyglądu w `docs/operator/aplikacja-modulowa-makiety.html`, zaakceptowane przez właściciela** — **[blokuje: faza 3]** (IU-8–IU-22) · docs/operator/aplikacja-modulowa-przygotowanie.md:19

## Dziennik

### 2026-10-28 — Faza 1 (Kalendarz i nowe dane) domknięta

- Walidacja: `npm test` 983/983, `npm run typecheck` bez błędów, bramki mechaniczne bez porażek (typecheck ok; eslint, knip, size-limit, vitest, stryker niezainstalowane; migracje pominięte). Bramka `testyUsuniete` wskazała 4 testy w `src/dane/kopia.test.js` i `src/dane/magazyn.test.js`: to zmiany nazw po podniesieniu `WERSJA_SCHEMATU` do 2, nie usunięcia.
- Korekta planu: weryfikacja IU-1 to `node --test "src/kalendarz/*.test.js"`, bo na Node 24 katalog jako argument daje MODULE_NOT_FOUND (poprawione w planie technicznym).
- IU-1: dodana klasa `BladKalendarza` (kody dzien, miesiac, dzien_miesiaca, liczba_dni, okno, cykl, okresy); `daty.js` importuje `jestDniem` z `src/dane/ksztalt.js` (bez cyklu, ale wbrew kierunkowi warstw kalendarz ← dane); `dniOdDo` zwraca różnicę dni ze znakiem, `ostatniDzienMiesiaca` numer dnia; typy `ZlecenieKalendarza`/`Wystapienie` generyczne (`@template`); testy wymuszają `TZ=Europe/Warsaw`. Następne: zastąpić `dzienUtc` w `src/widoki/oferta-edycja-sekcje.js:92` przez `dniOdDo`; `wystapienia` zakłada okresy rosnące i poprawne klucze wizyt (pilnuje `jestZlecenie`).
- IU-2: `WERSJA_SCHEMATU` = 2; zmieniony też `src/dane/kopia.test.js` (stan testowy v2, „nowsza_wersja” na wersji 3; ścieżkę v1 sprawdza fixture `tests/fixtures/kopia-v1.json`); `magazyn.js` miał 215 linii (nie 123), `klienci.js` 215; `jestZlecenie` ogranicza też liczbę okresów do `MAKS_WIZYT_ZLECENIA`; limitów `MAKS_KLIENTOW`/`MAKS_ZLECEN` nie ma w `jestStanem` (pilnuje zapis, import kopii zrobi IU-7). Następne: IU-7 — limity klientów i zleceń w `odczytajKopie`/`wczytajKopie` (także suma przy „połącz”); IU-6 — `wycena.klientId` w `odwolaniaSpojne` i w `zV1DoV2`; drobne: `dodajKlienta` przy wyścigu kart zapisuje stan bez zmian z nowym `kopia.zmianaOd`.
- IU-3: `zaplanujZWyceny` bierze `klientId` z `dane` (wycena dostanie `klientId` w IU-6); `BladZlecenia` ma dodatkowe kody (`brak_wizyty`, `brak_zaplaty`, kody złego wejścia, `jednorazowe` dla `zakonczSerie` zlecenia jednorazowego); operacje na wizycie przyjmują tylko dzień z zapisanym stanem albo z reguły okresów; powtórne oznaczenie zapłaty nic nie zmienia; `okresWDniu` w `zlecenia.js` powtarza `okresDnia` z `src/kalendarz/wystapienia.js:100`. Następne: decyzja właściciela, czy `zmienOdWizyty` ma przechodzić na późniejsze okresy (formularz IU-18; uwaga na kotwicę parzystości `dwa_tygodnie`); wyeksportować `okresDnia` zamiast `okresWDniu`; `formaDomyslna` przy dwóch zapłatach z jednego dnia bierze ostatnią; `docs/CONCEPTS.md` („Status wyceny”, `wykonana`) do aktualizacji z IU-6.
- IU-4: zapytania dostają argument `nazwaUslugi: (uslugaId) => string` (wizytyDnia, wizytyOkresu, doZamkniecia, najblizsza); test sprawdza stan skryptu E2E przez `zaktualizujStan` (bo `jestStanem` nie jest eksportowany) i `jestWycena`; kwota zlecenia Biura (1200 zł/mies.) ustalona ręcznie, nie z silnika; `e2e/stany/moduly-dzis.js` sprawdzony w `node:vm` i w strefach LA/Tokio/UTC, w przeglądarce uruchomi go tester. Następne: `kwotaMiesiaca` w `src/dane/wizyty.js:186-193` — miesiąc ze zrobioną wizytą spoza reguły okresów nie da się opłacić (`brak_wizyty`), a `zapytania.js` pokazuje go jako niezapłacony; wspólna funkcja kwoty miesiąca; helper `stanZeSkryptu` z `src/zlecenia/zapytania.test.js` przenieść do `tests/` przy trzecim użyciu.
