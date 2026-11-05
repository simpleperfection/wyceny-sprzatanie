---
zadanie: aplikacja-modulowa
data: 2026-11-04
claude_md: do-uzgodnienia
---

# Decyzje — aplikacja-modulowa

## Decyzje
- Wizyty serii liczą się z okresów zlecenia, bez zapisu z góry; zapisywane są tylko wizyty ze stanem, a każdy okres liczy kotwicę cyklu od swojego `od` — dane nie rosną z wiekiem serii (`src/kalendarz/wystapienia.js`, `src/dane/wizyty.js`).
- Schemat danych v2 z migracją v1 → v2: zlecenie na termin z planem null, wizyta z wykonania zrobiona o dzień T00:00Z, znaczniki zlecenia z `wycena.zmieniona`, czas spoza 1–1440 min daje `minutyPracy` null — stare wykonania nie mogą uszkodzić stanu (`src/dane/migracja-v2.js`).
- Wykonanie, czas pracy i zapłata są w zleceniu, a status `wykonana` zniknął z wyceny; `daneTempa` ma osobny plik, bo inaczej powstawał cykl importów (`src/zlecenia/dane-tempa.js`, `src/zlecenia/plan-fakt.js`).
- `kwotaMiesiaca` ma jedno źródło dla zapisu zapłaty i listy „Niezapłacone”, bo dwie kopie blokowały zapłatę miesiąca po `koniec` (`src/dane/wizyty.js`).
- Wycena ze zleceniem jest zamknięta: oferta tylko do odczytu, link i PDF działają, a wysłanie nie zmienia statusu ani ważności, także gdy zlecenie powstało w innej karcie (`src/dane/wyceny.js`, `src/widoki/oferta-edycja.js`).
- Kopia zapasowa przepuszcza wynik przez `stanKopii`, a limity klientów i zleceń sprawdza na surowym pliku przed migracją; ponad limitem odmawia bez zapisu (`src/dane/kopia.js`).
- Granice minut pracy (`MIN_MINUT_PRACY`, `MAKS_MINUT_PRACY`) są w jednym miejscu i obowiązują w wizytach, kształcie zlecenia, migracji i `poprawnyCzas`, bo wcześniej się rozjeżdżały (`src/dane/zlecenia-ksztalt.js`).
- Zmiana zlecenia wysyła tylko zmienione pola, bo podane nadpisują późniejsze okresy, a zmiana cyklu je usuwa (`zmianaDoZapisu` w `src/zlecenia/karta-dane.js`).
- Sekcje ustawień zostały kartami z arkuszem „Zapisz” zamiast osobnych ekranów; osobne trasy to osobna jednostka albo decyzja właściciela (IU-12, korekta planu).
- Tokeny wyglądu z zaakceptowanej makiety: zieleń #0e7a4e (5,37:1), obramowanie pola `--tekst-trzeci` (3:1, WCAG 1.4.11) (`src/style/tokeny.css`).
- Oferta dla klienta neutralna, bez zieleni, z własnym `.oferta :focus-visible` i własnym paddingiem wydruku (`src/style/oferta.css`, `src/style/druk.css`).
- Wspólne mechanizmy ekranów akcji i teksty błędów wizyt są wydzielone, żeby nie kopiować ich między wizytą a kartą zlecenia; pola daty i godziny to rodzaje `pole` (`src/widoki/ekran-akcji.js`, `src/zlecenia/bledy-zapisu.js`, `src/ui/komponenty/formularz.js`).

## Do CLAUDE.md po merge'u
- Układ aplikacji: dochodzą `src/kalendarz/` i `src/zlecenia/` oraz moduły Zlecenia, Wycena, Klienci i Chemia na ekranie Start; opis „aplikacja z etapu 5” jest nieaktualny.
- Dokumenty: `docs/completed/aplikacja-modulowa/` (gałąź `feature/aplikacja-modulowa`), plan `docs/plans/2026-10-28-001-feat-aplikacja-modulowa-plan.md`, wymagania `docs/brainstorms/2026-10-28-aplikacja-modulowa-requirements.md`, makiety HTML nowego wyglądu `docs/operator/aplikacja-modulowa-makiety.html` (makiety w Figmie dotyczą etapu 5).
- Dane w przeglądarce mają schemat v2 (klienci, zlecenia, migracja z v1), a stany testowe E2E obejmują skrypt `e2e/stany/moduly-dzis.js`.
- Testy widoków korzystają ze wspólnej atrapy DOM `tests/atrapa-dom.js`; na Node 24 katalog jako argument `node --test` daje MODULE_NOT_FOUND, więc wskazuje się glob.

## Po smoke'u
- Wiersze list zawijają tekst zamiast go ucinać wielokropkiem, a pigułka stanu jest pod tekstem, nie obok nazwy — właściciel na telefonie nie widział pełnych nazw klientów i adresów; to zastępuje „wiersz ma najwyżej dwie linie” z R9 (2026-11-05, `src/ui/komponenty/uklad.js`, `src/style/komponenty.css`).
- Cały tekst aplikacji ma co najmniej 17 px: `--tekst-maly` i `--tekst-drobny` są podniesione z 15 i 14 px, wbrew `:root` makiety — właściciel wybrał to po porównaniu zrzutów, godząc się na więcej zawinięć w wierszach (2026-11-05, `src/style/tokeny.css`).
