# Kontekst: zamkniety-dostep-testy

Branch: `feature/zamkniety-dostep-testy`
Ostatnia aktualizacja: 2026-11-09
Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`

## Źródła

- Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`
- Requirements doc: `docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md`
- Przygotowanie dla operatora: `docs/operator/zamkniety-dostep-testy-przygotowanie.md`

## Plan techniczny

Kluczowe pliki, decyzje techniczne, odroczone pytania i wzorce do naśladowania: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md` (sekcje „Kluczowe decyzje techniczne”, „Otwarte pytania”, tabela plików i „Wzorce do naśladowania” w blokach IU).

## Wymagania wstępne operatora

Checklista: `docs/operator/zamkniety-dostep-testy-przygotowanie.md`.

Brak nieodhaczonych pozycji blokujących.

## Dziennik

### 2026-11-09 — Faza 1: Aplikacja gotowa na logowanie

- Walidacja domknięcia: `npm test` 1465/1465, `npm run typecheck` bez błędów, bramki mechaniczne bez porażek (typecheck i testyUsuniete ok, pozostałe brak lub pominięte), audyt diffu bez `console.*` i pustych `catch`.
- IU-1: `TRYBY_SZYBKIEJ` w nowym `src/silnik/tryby-szybkiej.js`, `jestStatusemVat` w `src/silnik/vat.js` jako czysty strażnik (`typeof` + `STATUSY_VAT.includes`), a `sprawdzStatusVat` go woła; `magazyn.js` i `szybka.js` dalej eksportują te same nazwy, z `magazyn.js` zniknęły nieużywane importy `BladWejscia` i `sprawdzStatusVat`. Graf od `src/oferta-start.js` to 13 modułów z planu. Weryfikacja grep z planu w dosłownym brzmieniu łapie typy JSDoc w `src/oferta/tresc.js` (linie 13–17), których przeglądarka nie ładuje; korekta brzmienia w planie przy IU-1. Następny krok buildera: rozważyć test pilnujący listy 13 modułów oferty (wpisany już do IU-3).
- IU-2: `sw.js` przepuszcza bez `respondWith` ścieżki zaczynające się od `/cdn-cgi/` (stała `PREFIKS_CLOUDFLARE`, porównanie `pathname.toLowerCase()` od korzenia domeny), manifest w `index.html` ma `crossorigin="use-credentials"`. Najpierw testy charakteryzujące (install, activate, opaqueredirect, TypeError przy odświeżeniu), potem wyjątek; `src/pwa/sw.test.js` 18/18. Liczby linii różnią się od tabeli planu (plan liczył od starszego stanu: sw.js 139 → 144). `WERSJA_CACHE` bez zmian, bo `PLIKI_STARTOWE` się nie zmieniła. Następne kroki: test „install zapisuje wszystkie PLIKI_STARTOWE” ma dosłowną listę, więc IU-4 musi go zaktualizować, jeśli zmieni listę w repo; znana usterka P3 `sw.js` (`zSieci` woła `waitUntil` po `respondWith`) zostaje poza zakresem.
