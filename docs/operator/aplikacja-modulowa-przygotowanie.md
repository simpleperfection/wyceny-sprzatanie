---
feature_slug: aplikacja-modulowa
origin: docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md
utworzono: 2026-10-28
dotyka_ui: true
status: do-zrobienia
---

# Przygotowanie dla operatora — Czysty Zarobek jako aplikacja z modułami

Plan: `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md` · Utworzono: 2026-10-28
Status: **zrobione 2026-11-03** (makiety zaakceptowane) — odhaczaj `[ ]` → `[x]`. `/dev-plan` sprawdza tę listę w bramce gotowości, a autopilot zatrzymuje się przed fazą 3, dopóki pozycja jest nieodhaczona.

Lista rzeczy, których autopilot nie zrobi sam. Każda pozycja ma marker **[blokuje: faza N]** z numerem pierwszej fazy,
która bez niej nie ruszy. Fazy 1–2 (dane) mogą biec bez niej.

## 1. Makiety

- [x] **Makiety HTML nowego wyglądu w `docs/operator/aplikacja-modulowa-makiety.html`, zaakceptowane przez właściciela** — **[blokuje: faza 3]** (IU-8–IU-22)
  - Po co: buildery faz 3–6 biorą z makiety układ ekranów i wartości tokenów (`:root`), a właściciel akceptuje wygląd przed budową (wymaganie źródła). Bez makiety builder IU-8 nie ma odcienia zieleni ani rozmiarów.
  - Jak: w osobnej sesji (limit Figmy wyczerpany, więc HTML zgodnie z `CLAUDE.md`), równolegle z fazami 1–2 autopilota. Jeden plik, ekran przy ekranie w ramkach telefonu 360 px, każdy w elemencie z `data-ekran="<nazwa>"`: `start`, `wycena-modul`, `podsumowanie-wyceny`, `klienci-lista`, `karta-klienta`, `zlecenia-dzien`, `zlecenia-tydzien`, `zlecenia-miesiac`, `wizyta`, `zlecenie-formularz`, `oferta-klient` (neutralna, bez zieleni). Kolory i rozmiary jako zmienne w `:root` o nazwach z `src/style/tokeny.css` (`--marka-zielen`, `--marka-zielen-ciemna`, `--marka-zielen-tlo`, `--tlo-strona`, `--tlo-karta`, `--tekst-glowny`, `--tekst-drugi`, `--tekst-podstawowy`, `--tekst-maly`, `--tekst-kwota`, `--tekst-tytul-modulu`, `--cel-dotyku` i pozostałe istniejące). Progi: tekst podstawowy ≥ 17 px, elementy klikalne ≥ 48 px, biały tekst na zieleni i zieleń na białym ≥ 4,5:1 (WCAG AA), odcień własny (nie kopia Cleanlo), font Source Sans 3. Teksty z pól „Teksty (verbatim)” planu (IU-8–IU-22); jeśli właściciel je zmieni, sesja makiet poprawia te pola w planie technicznym na gałęzi `feature/aplikacja-modulowa` i commituje przed fazą 3 (bez zmian tabel plików i faz). Po akceptacji wpisz datę akceptacji pod tą pozycją, odhacz ją i zacommituj checklistę.
  - Dowód: `grep -c 'data-ekran=' docs/operator/aplikacja-modulowa-makiety.html` zwraca co najmniej 11, `grep -c -- '--marka-zielen:' docs/operator/aplikacja-modulowa-makiety.html` zwraca 1, pod pozycją jest data akceptacji właściciela
  - Zaakceptowane przez właściciela 2026-11-03: 16 ekranów (11 wymaganych oraz `chemia`, `ustawienia`, `szybka-wycena`, `kreator-pomieszczenia`, `arkusz-wyjasnienie`), zieleń `#0e7a4e`, wzorce z Mobbin. Trzy nowe teksty z makiety są dopisane do „Teksty (verbatim)” IU-15 i IU-17 w planie.

---
Po odhaczeniu: świeży run autopilota z tymi samymi args (`docs/active/aplikacja-modulowa`).
