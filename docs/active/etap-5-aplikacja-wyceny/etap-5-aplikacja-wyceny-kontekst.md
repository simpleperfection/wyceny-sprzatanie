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
- [ ] faza 6 — 🔓 **Zakres „wchodzi / nie wchodzi”** dla każdej usługi i rodzaju sprzątania (R19) — **[blokuje: faza 6]** (IU-22). Usługi: mieszkanie standard, gruntowne, po remoncie, po wynajmie; biura; okna; AGD; tapicerka; dywany; mycie posadzek; doczyszczanie; kostka; elewacja; hale. Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/zakresy.json`. · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:93
- [ ] faza 5 — 🔓 **Pytania do klienta przed wyceną** dla każdej usługi (R13), z zaznaczeniem, które odpowiedzi ustawiają coś w wycenie (np. zwierzęta → sierść, odległość → dojazd) — **[blokuje: faza 5]** (IU-20). Dostarcza: właściciel (szkic: Claude w osobnej sesji). Ląduje w: `data/pytania.json`. · docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md:97

## Dziennik
