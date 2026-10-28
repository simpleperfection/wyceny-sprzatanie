# Plan: etap-5-aplikacja-wyceny

Branch: `feature/etap-5-aplikacja-wyceny`
Ostatnia aktualizacja: 2026-10-24
Plan techniczny: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`

## Źródła

- Plan techniczny: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`
- Requirements doc: `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`
- Przygotowanie dla operatora: `docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md`

## Cel

Powstaje aplikacja PWA w czystym HTML i JavaScript (bez kroku budowania, hosting statyczny): silnik wyceny przeniesiony ze `scripts/kalibracja.ps1`, dane firmy i wycen w przeglądarce z kopią do pliku, kreator dokładnej wyceny z doborem chemii i podsumowaniem („zostaje dla Ciebie X zł, czyli Y zł za godzinę”), szybka wycena przez telefon z pytaniami do klienta, zakończenie zlecenia z własnym tempem oraz oferta dla klienta jako link i PDF. Plan obejmuje cały etap 5 z `PLAN.md` i wymagania R5, R7–R24 z dokumentu źródłowego.

## Zakres

Wymagania i granice: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`, sekcje „Śledzenie wymagań” i „Granice zakresu”.

## Fazy

| Faza | Nazwa | IU | Zależy od | Delegaci |
|---|---|---|---|---|
| 1 | Narzędzia i silnik wyceny | IU-1, IU-2, IU-3, IU-4, IU-5 | Brak | feature-builder-data |
| 2 | Dane w przeglądarce | IU-6, IU-7, IU-8 | Faza 1 | feature-builder-data |
| 3 | Szkielet aplikacji, start, ustawienia i kopia | IU-9, IU-10, IU-11, IU-12, IU-13 | Faza 2 | feature-builder-ui |
| 4 | Kreator dokładnej wyceny | IU-14, IU-15, IU-16, IU-17, IU-18 | Faza 3 | feature-builder-fullstack |
| 5 | Zlecenia, szybka wycena i pytania do klienta | IU-19, IU-20, IU-21 | Faza 4 | feature-builder-fullstack, feature-builder-data |
| 6 | Oferta dla klienta | IU-22, IU-23, IU-24 | Faza 5 | feature-builder-data, feature-builder-ui |

## Kryteria akceptacji całości

Każda faza: typecheck 0 błędów, testy PASS, review bez otwartych P1; każdy `[E2E]` uruchomiony (nie odhaczony ręcznie).
Kryteria zadania: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`, sekcja „Śledzenie wymagań” (i „Metryki sukcesu”, gdy plan ją ma).

## Blokery operatora per faza

- [x] faza 6 — 🔓 **Zakres „wchodzi / nie wchodzi”** dla każdej usługi i rodzaju sprzątania (R19) — **[blokuje: faza 6]** (IU-22). Usługi: mieszkanie standard, gruntowne, po remoncie, po wynajmie; biura; okna; AGD; tapicerka; dywany; mycie posadzek; doczyszczanie; kostka; elewacja; hale. Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/zakresy.json`. · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:93
- [x] faza 5 — 🔓 **Pytania do klienta przed wyceną** dla każdej usługi (R13), z zaznaczeniem, które odpowiedzi ustawiają coś w wycenie (np. zwierzęta → sierść, odległość → dojazd) — **[blokuje: faza 5]** (IU-20). Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/pytania.json`. · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:97
