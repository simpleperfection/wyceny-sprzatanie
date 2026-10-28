---
zadanie: etap-5-aplikacja-wyceny
data: 2026-10-27
claude_md: do-uzgodnienia
---

# Decyzje — etap-5-aplikacja-wyceny

## Decyzje
- Minimum zlecenia wchodzi do widełek rynku tylko przy usługach z pozycjami; usługi z pomieszczeniami pokazują widełki bez minimum — inaczej cena 150 zł wypadała nad górną granicą rynku (`src/silnik/cena.js`, IU-4; do potwierdzenia przez właściciela).
- Układy mieszkania i biura mają jedno źródło `$uklady` w `scripts/kalibracja.ps1`, zapisywane do `data/normy.json` (`uklady`); silnik JS sprawdza test parytetu na `research/kalibracja-scenariusze.json` z tolerancją 0,01 (`src/silnik/parytet.test.js`).
- Stan aplikacji w `localStorage` (schemat v1, `src/dane/magazyn.js`), zależności wstrzykiwane (`utworzMagazyn(storage, { teraz, … })`), żeby logika danych była testowalna w Node bez DOM.
- Jeden strażnik kształtu danych dla zapisu, kopii i dekodera oferty (`jestWycena` w `src/dane/wyceny.js`, `GRANICE_OFERTY` w `src/dane/ksztalt.js`) — eksport i import kopii z różnymi walidacjami dawały kopię, której aplikacja nie wczyta.
- Kopia zapasowa: „Połącz” nadaje kolidującym numerom kolejny numer miesiąca i ma limit 5000 wycen; „Zastąp” działa bez odczytu uszkodzonego magazynu (ekran ratunkowy) (`src/dane/kopia.js`).
- Service worker: nawigacja najpierw z sieci z limitem 4 s, pozostałe pliki stale-while-revalidate, `WERSJA_CACHE` zmienia się ze zmianą `PLIKI_STARTOWE` (`sw.js`).
- Baza chemii wczytywana leniwie do zmiennej modułu z limitem 10 s; karty SDS tylko przez https (`src/dane/chemia.js`, `src/silnik/chemia.js`).
- Szybka wycena: kwota z minimum → cena z VAT → zaokrąglenie do 10 zł, dojazd po zaokrągleniu; mediana i rynek z poziomu brudu 1; biura w wariancie jednorazowym (`src/silnik/szybka.js`).
- „Kopiuj tekst” szybkiej wyceny nadaje numer i status `wyslana` tylko po udanym skopiowaniu (`src/kreator/szybka.js`, `src/ui/schowek.js`).
- Oferta to link z danymi zakodowanymi we fragmencie URL (bez serwera), z limitami (fragment 20 000 znaków, JSON 128 KB) i odrzuceniem kluczy spoza schematu (`src/oferta/kodek.js`); ręczna cena oferty to kwota „razem” z dojazdem (`src/oferta/tresc.js`).
- Strona oferty `oferta.html` osobno od aplikacji, z wydrukiem A4 w `druk.css`; przy widełkach kwota tylko w „Razem do zapłaty” (`src/widoki/oferta-klient.js`).
- Drobny tekst w `--tekst-drugi` zamiast `--tekst-trzeci` (kontrast WCAG 4,5:1), wbrew części PNG makiet (`src/style/`).

## Do CLAUDE.md po merge'u
- Zdanie „kodu aplikacji jeszcze nie ma” jest nieaktualne: aplikacja jest w `index.html`, `oferta.html`, `sw.js` i `src/` (silnik, dane, kreator, oferta, widoki, ui, style).
- Nowe pliki danych edytowane ręcznie: `data/domyslne.json`, `data/pytania.json`, `data/zakresy.json`; `data/ceny.json` ma pole `szybka_wycena` w usługach i `meta.szybka_wycena`.
- Stany testowe E2E w `e2e/stany/`; ikony zastępcze generuje `scripts/ikony-zastepcze.mjs`.
- Na Windows skrypt bramek autopilota nie uruchamia `node_modules/.bin/tsc` przez `spawnSync` bez powłoki (ENOENT) — potrzebna osłona z `tsc.cmd`.
