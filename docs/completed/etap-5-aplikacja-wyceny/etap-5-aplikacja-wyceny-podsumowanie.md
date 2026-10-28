# Podsumowanie: etap-5-aplikacja-wyceny

Data ukończenia: 2026-10-27
Branch: `feature/etap-5-aplikacja-wyceny`
Plan techniczny: `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md` (wymagania R5, R7–R24)

## Co dostarczono

Aplikacja PWA w czystym HTML i JS (bez kroku budowania, hosting statyczny), w sześciu fazach autopilota (wszystkie execute/review/fix = done; testy w ostatniej fazie 785/785, typecheck bez błędów):

1. **Narzędzia i silnik wyceny** (IU-1–IU-5): `package.json` z przypiętym `typescript`, `tsconfig.json` (checkJs), serwer deweloperski `scripts/serwer-dev.mjs`, pole `uklady` w `data/normy.json`, scenariusze `research/kalibracja-scenariusze.json`, silnik `src/silnik/` (katalog, czas, cena, koszt, VAT) z testem parytetu wobec `scripts/kalibracja.ps1`.
2. **Dane w przeglądarce** (IU-6–IU-8): magazyn `localStorage` ze schematem v1, ustawienia firmy, wyceny ze statusami i numeracją, kopia zapasowa do pliku (połącz / zastąp).
3. **Szkielet aplikacji** (IU-9–IU-13): tokeny wariantu B, ikony Tabler, font Source Sans 3, router, ekran startowy z kartą miesiąca, kreator pierwszego uruchomienia i ustawienia, kopia i ekran ratunkowy, service worker i manifest PWA.
4. **Kreator dokładnej wyceny** (IU-14–IU-18): wybór usługi, pomieszczenia lub pozycje, dodatki i dojazd, dobór chemii z kartami SDS (`src/silnik/chemia.js`), podsumowanie z widełkami rynku i „zostaje dla Ciebie”.
5. **Zlecenia, szybka wycena i pytania do klienta** (IU-19–IU-21): zakończenie zlecenia (plan a fakt, własne tempo), szybka wycena przez telefon (`src/silnik/szybka.js`), pytania do klienta ze skutkami w wycenie (`data/pytania.json`).
6. **Oferta dla klienta** (IU-22–IU-24): treść oferty i kodek linku (`src/oferta/`), edycja oferty, zakresy i warunki w ustawieniach (`data/zakresy.json`), strona `oferta.html` z wydrukiem A4.

## Kluczowe decyzje

- Minimum zlecenia w widełkach rynku tylko przy usługach z pozycjami (korekta planu w IU-4; do potwierdzenia przez właściciela w smoke'u).
- Jedno źródło układów mieszkania i biura (`$uklady` w skrypcie → `data/normy.json`), silnik JS porównywany ze skryptem testem parytetu z tolerancją 0,01.
- Walidacja kształtu stanu w jednym strażniku (`jestWycena`, `src/dane/ksztalt.js`) dla zapisu, kopii i dekodera oferty, po tym jak eksport i import kopii rozjechały się w fazie 2.
- Service worker: nawigacja najpierw z sieci z limitem 4 s, pozostałe pliki stale-while-revalidate.
- Oferta jako link z danymi w fragmencie URL (bez serwera), limity rozmiaru i odrzucanie kluczy spoza schematu.
- Szybka wycena: kwota z minimum → VAT → zaokrąglenie do 10 zł, dojazd po zaokrągleniu; mediana i rynek z poziomu brudu 1.
- Ręczna cena oferty to kwota „razem” z dojazdem.

## Główne pliki

- `src/silnik/` (katalog, czas, cena, koszt, vat, uklad, chemia, szybka, pytania), `src/dane/` (magazyn, ustawienia, wyceny, kopia, ksztalt, chemia, pytania, pobierz), `src/kreator/`, `src/oferta/`, `src/widoki/`, `src/ui/`, `src/style/`
- `index.html`, `oferta.html`, `sw.js`, manifest, `fonty/`, `ikony/`
- `data/normy.json` (`uklady`), `data/ceny.json` (`szybka_wycena`), `data/domyslne.json`, `data/pytania.json`, `data/zakresy.json`
- `scripts/serwer-dev.mjs`, `scripts/ikony-zastepcze.mjs`, `scripts/kalibracja.ps1`, `e2e/stany/*.json`

## Wnioski

- Na Windows skrypt bramek autopilota nie uruchamia `node_modules/.bin/tsc` przez `spawnSync` bez powłoki (ENOENT); w każdej fazie bramki szły przez osłonę z `tsc.cmd`.
- Widoki nie mają testów automatycznych (brak DOM w `node --test`); pokrywają je E2E w agent-browser i smoke operatora.
- Reguły silnika (mnożnik brudu, VAT, dojazd, walidacje) łatwo się dublują w kreatorze i widokach; review kolejnych faz wyłapywało rozjazdy kopii.
- Skutki odpowiedzi klienta (brud, dojazd) muszą przechodzić przez ten sam model co dokładna wycena; częściowe przeniesienie dało niespójne widełki (faza 5).
- Otwarte sprawy są w `known-issues.md` (P3 i nity) oraz w „Następne kroki” dziennika w `etap-5-aplikacja-wyceny-kontekst.md`.

## Smoke operatora

`docs/operator/2026-10-27-etap-5-aplikacja-wyceny-smoke.md` — 24 pozycje do ręcznego sprawdzenia (telefon, natywne okna, wydruk PDF, porównania z makietami, decyzje właściciela).

## Ogród

Pomiar całego projektu (135 plików JS/TS, commit dd0ba4b); w nawiasie przyrost w liniach dodanych przez to zadanie (pierwszy pomiar w projekcie):
- wyciszenia lint/TS: 0 (0)
- any: 0 (0)
- wymuszone rzutowania: 0 (0)
- komentarze-obejscia: 0 (0)
- puste catch: 0 (0)

Bez oceny — bez oceny: przyrost ponizej progu w liniach dodanych przez zadanie (pierwszy pomiar), 1/5 pomiarow do przegladu okresowego.

Ogrodnik niczego nie zmienił w kodzie — każda propozycja czeka na decyzję operatora.

## Części PR

PR w 2 częściach (cięcie: sekcja „Części PR” planu; pliki do recenzji bota po filtrach .coderabbit.yaml, próg 150).

| Część | Fazy | Od | Do | Plików do recenzji |
|---|---|---|---|---|
| 1 | 1–3 | 144b66fb5a1b | 2b8f675f496e | 123 |
| 2 | 4–6 | 2b8f675f496e | czubek gałęzi | 113 |

Wysyłka: `/clear`, potem `/dev-pr --czesc 1`; po merge'u każdej części `/clear` i następna, do `/dev-pr --czesc 2` (rebase na główną gałąź).
