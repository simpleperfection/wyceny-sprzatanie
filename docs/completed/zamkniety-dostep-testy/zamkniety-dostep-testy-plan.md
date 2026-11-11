# Plan: zamkniety-dostep-testy

Branch: `feature/zamkniety-dostep-testy`
Ostatnia aktualizacja: 2026-11-05
Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`

## Źródła

- Plan techniczny: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`
- Requirements doc: `docs/brainstorms/2026-11-05-dostep-i-trial-requirements.md`
- Przygotowanie dla operatora: `docs/operator/zamkniety-dostep-testy-przygotowanie.md`

## Cel

Aplikacja Czysty Zarobek przechodzi z publicznego GitHub Pages na Cloudflare za logowaniem kodem z maila, dla najwyżej 5 firm testowych. Ten plan przygotowuje kod: strona oferty przestaje ciągnąć silnik wyceny, service worker jest gotowy na logowanie i działa offline po każdej publikacji, a nowy skrypt tworzy katalog publikacji `dist/` z listy dozwolonych plików. Konfiguracja Cloudflare trafia do repo. Przenosiny DNS, ustawienia Access i przejście repo na prywatne robi właściciel po scaleniu, według `docs/operator/zamkniety-dostep-testy-przygotowanie.md`.

## Zakres

Wymagania i granice: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`, sekcje „Śledzenie wymagań” i „Granice zakresu”.

## Fazy

| Faza | Nazwa | IU | Zależy od | Delegaci |
|---|---|---|---|---|
| 1 | Aplikacja gotowa na logowanie | IU-1, IU-2 | Brak | feature-builder-data |
| 2 | Katalog publikacji | IU-3, IU-4, IU-5, IU-6 | Faza 1 | feature-builder-data |

## Kryteria akceptacji całości

Każda faza: typecheck 0 błędów, testy PASS, review bez otwartych P1; każdy `[E2E]` uruchomiony (nie odhaczony ręcznie).
Kryteria zadania: `docs/plans/2026-11-05-001-feat-zamkniety-dostep-testy-plan.md`, sekcja „Śledzenie wymagań” (i „Metryki sukcesu”, gdy plan ją ma).
