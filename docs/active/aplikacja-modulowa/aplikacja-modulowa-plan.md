# Plan: aplikacja-modulowa

Branch: `feature/aplikacja-modulowa`
Ostatnia aktualizacja: 2026-10-28
Plan techniczny: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`

## Źródła

- Plan techniczny: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`
- Requirements doc: `docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md`
- Przygotowanie dla operatora: `docs/operator/aplikacja-modulowa-przygotowanie.md`

## Cel

Aplikacja z etapu 5 staje się aplikacją do prowadzenia jednoosobowej firmy sprzątającej, a wycena jest w niej jednym z modułów. Ekran Start ma powitanie, jedno zdanie o dniu i kafle modułów Zlecenia, Wycena, Klienci i Chemia, a dolnego paska już nie ma. Wszystkie ekrany dostają biało-zielony wygląd z dużymi literami i przyciskami. Dochodzą dwa nowe moduły: Klienci (karta z telefonem, adresem, notatkami i historią) oraz Zlecenia z kalendarzem Dzień / Tydzień / Miesiąc. Zlecenia mogą się powtarzać, a wizytę zamyka się przyciskami „Zrobione” i „Zapłacone”. Wykonanie, czas pracy i zapłata przechodzą z wyceny do zlecenia. Dane zostają w przeglądarce, schemat dostaje wersję 2 z przeniesieniem danych z wersji 1, a kopia zapasowa obejmuje klientów i zlecenia. Działanie wyceny (silnik, ceny, VAT, oferta) się nie zmienia.

## Zakres

Wymagania i granice: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`, sekcje „Śledzenie wymagań” i „Granice zakresu”.

## Fazy

| Faza | Nazwa | IU | Zależy od | Delegaci |
|---|---|---|---|---|
| 1 | Kalendarz i nowe dane | IU-1, IU-2, IU-3, IU-4 | Brak | feature-builder-data |
| 2 | Przeniesienie wykonań i kopia v2 | IU-5, IU-6, IU-7 | Faza 1 | feature-builder-fullstack |
| 3 | Nowy wygląd, szkielet i Start | IU-8, IU-9, IU-10, IU-11, IU-12 | Faza 2 | feature-builder-ui |
| 4 | Klienci | IU-13, IU-14 | Faza 3 | feature-builder-ui, feature-builder-fullstack |
| 5 | Zlecenia i kalendarz | IU-15, IU-16, IU-17, IU-18 | Faza 4 | feature-builder-ui, feature-builder-fullstack |
| 6 | Wycena w nowym wyglądzie | IU-19, IU-20, IU-21, IU-22 | Faza 5 | feature-builder-ui |

## Kryteria akceptacji całości

Każda faza: typecheck 0 błędów, testy PASS, review bez otwartych P1; każdy `[E2E]` uruchomiony (nie odhaczony ręcznie).
Kryteria zadania: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`, sekcja „Śledzenie wymagań” (i „Metryki sukcesu”, gdy plan ją ma).

## Blokery operatora per faza

- [ ] faza 3 — **Makiety HTML nowego wyglądu w `docs/operator/aplikacja-modulowa-makiety.html`, zaakceptowane przez właściciela** — **[blokuje: faza 3]** (IU-8–IU-22) · docs/operator/aplikacja-modulowa-przygotowanie.md:19
