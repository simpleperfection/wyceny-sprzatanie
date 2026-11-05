# Podsumowanie: aplikacja-modulowa

Data ukończenia: 2026-11-04
Branch: `feature/aplikacja-modulowa`
Plan techniczny: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`
Wymagania: `docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md`

## Co dostarczono

Aplikacja z etapu 5 stała się aplikacją do prowadzenia jednoosobowej firmy sprzątającej, a wycena jest w niej jednym z modułów. Sześć faz autopilota, 22 jednostki (wszystkie execute/review/fix = done, `otwarteFindingi` puste). Walidacja końcowa: testy 1433/1433, typecheck bez błędów; 21 scenariuszy E2E w przeglądarce zaliczonych.

1. **Kalendarz i nowe dane** (IU-1–IU-4): `src/kalendarz/` (daty, wystąpienia serii z okresów), schemat v2 z klientami i zleceniami, operacje na zleceniach i wizytach, zapytania dla ekranów.
2. **Przeniesienie wykonań i kopia v2** (IU-5–IU-7): wykonanie, czas pracy i zapłata przeszły z wyceny do zlecenia, migracja v1 → v2, kopia zapasowa z klientami i zleceniami.
3. **Nowy wygląd, szkielet i Start** (IU-8–IU-12): biało-zielone tokeny, Start z powitaniem, zdaniem o dniu i kaflami modułów, bez dolnego paska, moduły Wycena i Chemia, ustawienia w nowym wyglądzie.
4. **Klienci** (IU-13, IU-14): lista, karta z telefonem, adresem, notatkami i historią, wybór klienta w kreatorze, szybkiej wycenie i ofercie.
5. **Zlecenia i kalendarz** (IU-15–IU-18): widoki Dzień, Tydzień i Miesiąc, formularz zlecenia z seriami i abonamentem, ekran wizyty z „Zrobione” i „Zapłacone”, karta zlecenia.
6. **Wycena w nowym wyglądzie** (IU-19–IU-22): pięć kroków kreatora, szybka wycena, podsumowanie i edycja oferty, neutralna oferta dla klienta bez zieleni. Działanie wyceny (silnik, ceny, VAT, oferta) się nie zmieniło.

Makiety nowego wyglądu właściciel zaakceptował przed fazą 3 (8e46a30).

## Kluczowe decyzje

- Wizyty serii liczone z okresów, bez zapisywania ich z góry; zapisywane są tylko wizyty ze stanem. Każdy okres liczy kotwicę cyklu od swojego `od`.
- Migracja v1 → v2 w `src/dane/migracja-v2.js`: zlecenie na termin z planem null, wizyta z wykonania zrobiona o dzień T00:00Z, czas spoza 1–1440 minut daje `minutyPracy` null, wizyty przeniesione z wersji 1 zapłacone z nieznaną formą.
- Wycena ze zleceniem jest zamknięta: oferta otwiera się tylko do odczytu, „Kopiuj link” i PDF działają, a wysłanie nie zmienia statusu ani ważności.
- Limity kopii sprawdzane na surowym pliku przed migracją; ponad limitem kopia odmawia bez zapisu.
- `zmianaDoZapisu` wysyła tylko zmienione pola, bo podane nadpisują późniejsze okresy, a zmiana cyklu je usuwa.
- Sekcje ustawień zostały kartami z arkuszem „Zapisz”; osobne ekrany z trasami to osobna jednostka albo decyzja właściciela.
- Abonament biura rozliczany raz w miesiącu w karcie zlecenia, oferta dla klienta neutralna (decyzje właściciela 2026-10-28).

## Główne pliki

- Nowe katalogi: `src/kalendarz/`, `src/zlecenia/`
- Dane: `src/dane/klienci.js`, `zlecenia.js`, `wizyty.js`, `zlecenia-ksztalt.js`, `migracja-v2.js`, `kwota-wyceny.js`, zmiany w `magazyn.js`, `kopia.js`, `wyceny.js`
- Widoki: `src/widoki/klienci-*.js`, `klient-*.js`, `zlecenia-*.js`, `zlecenie-*.js`, `wizyta.js`, `ekran-akcji.js`, `wybor-klienta.js`, `szybka-pola.js`, zmienione `start.js`, `kreator-*.js`, `podsumowanie*.js`, `oferta-*.js`
- Wspólne: `src/ui/moduly.js`, `src/ui/zmiana-dnia.js`, `src/ui/komponenty/`
- Style: `src/style/tokeny.css`, `komponenty.css` i pliki modułów (`start.css`, `klienci.css`, `zlecenia.css`, `kreator.css`, `szybka.css`, `podsumowanie.css`, `chemia.css`, `wyceny.css`, `ustawienia.css`)
- Testy i stany: `tests/atrapa-dom.js`, `tests/fixtures/`, `e2e/stany/moduly-dzis.js`, `e2e/stany/oferta-po-terminie.txt`

## Wnioski

- Zielony zestaw testów nie wystarczył przy płatnościach i rozliczeniach: wszystkie P1 fazy 5 to luki testów, w których mutacje przeżywały. Ścieżki pieniędzy wymagają testu na każdą gałąź.
- Dwie kopie jednej reguły rozjeżdżają się szybko (`kwotaMiesiaca` blokowała zapłatę miesiąca po `koniec`); regułę trzeba eksportować z jednego miejsca.
- Seed E2E może się zestarzeć wobec strażnika kształtu: `oferta-po-terminie.txt` nie dekodował się i `oferta-neutralna` miała SKIP w review, dopóki fix fazy 6 nie wygenerował seeda od nowa i nie odegrał scenariusza (PASS).
- Środowisko E2E: service worker serwuje stare moduły (stale-while-revalidate), wyjście `agent-browser` trzeba kierować do pliku, a `agent-browser fill` nie ustawia daty (działa `eval` z `value` i zdarzeniem `input`).
- Otwarte P3 są w `known-issues.md`, a sprawy do decyzji właściciela we wpisach „Następne” dziennika `aplikacja-modulowa-kontekst.md` (m.in. czy Miesiąc pokazuje dni sąsiednich miesięcy, długie nazwy usług na 360 px).

## Smoke operatora

`docs/operator/2026-11-04-aplikacja-modulowa-smoke.md` — 10 pozycji do ręcznego sprawdzenia.

## Ogród

Pomiar całego projektu (201 plików JS/TS, commit 4b38e93); w nawiasie przyrost względem poprzedniego zadania:
- wyciszenia lint/TS: 0 (0)
- any: 0 (0)
- wymuszone rzutowania: 0 (0)
- komentarze-obejscia: 0 (0)
- puste catch: 0 (0)

Bez oceny — bez oceny: przyrost ponizej progu wzgledem poprzedniego zadania, 2/5 pomiarow do przegladu okresowego.

Ogrodnik niczego nie zmienił w kodzie — każda propozycja czeka na decyzję operatora.

## Części PR

PR w 2 częściach (cięcie: sekcja „Części PR” planu; pliki do recenzji bota po filtrach .coderabbit.yaml, próg 150).

| Część | Fazy | Od | Do | Plików do recenzji |
|---|---|---|---|---|
| 1 | 1–3 | 3f0601c4e569 | 0068aadab0f6 | 108 |
| 2 | 4–6 | 0068aadab0f6 | czubek gałęzi | 123 |

Wysyłka: `/clear`, potem `/dev-pr --czesc 1`; po merge'u każdej części `/clear` i następna, do `/dev-pr --czesc 2` (rebase na główną gałąź).
