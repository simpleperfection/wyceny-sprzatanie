# Znane problemy — zamkniety-dostep-testy

## P3 faza 1

- 🟡 [P3] src/silnik/vat.js:9 — `STATUSY_VAT` (`string[]`) to druga definicja unii `StatusVat`; strażnik `jestStatusemVat` może rozjechać się z typedefem bez błędu tsc. Poprawka: `Object.freeze(/** @type {const} */ (['czynny', 'zwolniony']))`, typedef `typeof STATUSY_VAT[number]`, `STATUSY_VAT.some((s) => s === x)`.
- 🟡 [P3] sw.js:111 — `zapiszZasoby` filtruje adresy tylko po originie, bez `!czySciezkaCloudflare(adres)`; skrypty wstrzykiwane przez Cloudflare pod `/cdn-cgi/` trafiają do cache jako martwe wpisy. Dodać filtr i test komunikatu z `${ORIGIN}/cdn-cgi/x.js`.

## P3 faza 2

- 🟡 [P3] scripts/publikacja/pliki.mjs:25 — Lista dozwolonych dla `ikony` przepuszcza każdy plik bez kropki (np. `ikony/kopia-danych.json`, `notatki.txt`, zrzuty), a `/ikony/*` jest bez logowania. Ogranicz do `/\.(png|svg)$/` bez podkatalogów i dodaj test odmowy `ikony/notatki.txt`, `ikony/kopia.json`.
- 🟡 [P3] scripts/publikacja/zbuduj.mjs:26 — `sprawdzKatalogWyjsciowy` przepuszcza katalog wyjściowy wewnątrz repo (`--wyjscie src`, `.git`, `data`), a potem `rm -r` go kasuje. Odrzucaj `cel` wewnątrz `zrodlo` różny od `join(zrodlo, KATALOG_PUBLIKACJI)`; test z `join(korzen, 'src')`.
- 🟡 [P3] scripts/publikacja/pliki.mjs:20 — Nazwy `'sw.js'` i `'robots.txt'` w literałach w kilku modułach; przenieś `PLIK_WORKERA`, dodaj `PLIK_ROBOTS` w `pliki.mjs` i używaj ich w `PLIKI_W_KORZENIU`, `SCIEZKI_BEZ_LOGOWANIA` i `POZA_PAMIECIA`.
- 🟡 [P3] scripts/publikacja/pliki.mjs:92 — `celeOdwolan` wybiera grupy adresu przez `wzorzec === ATRYBUT_ADRESU`; zamień `WZORCE_ODWOLAN` na `{ wzorzec, grupy }` i bierz `grupy.map((i) => dopasowanie[i])`.
- 🟡 [P3] sw.js:44 — Flaga `ZAPIS_W_BIEGU` wbudowana w predykat `czyDoZapisu`; `zapiszZasoby` w `dist/sw.js` pobiera do 300 zasobów i je wyrzuca. Przywróć czysty predykat, warunek `ZAPIS_W_BIEGU &&` w `zSieci` i wczesny `return` w `zapiszZasoby`.
- 🟡 [P3] sw.js:95 — Kontrola poprawek fazy 2 (2026-11-11): poprawka P2 `sw.js:133` zamknęła mieszanie starego kodu z nowymi `data/*.json`, ale drugi scenariusz z tej uwagi został. Przy starym workerze `siecPotemCache` bierze `index.html` z sieci, więc strona przeładowana po publikacji dostaje nowy `index.html` ze starymi modułami z cache, dopóki aplikacja nie zostanie zamknięta. Dziś `index.html` to lista arkuszy i `src/app.js`, więc skutek jest mały. Poprawka: przy `ZAPIS_W_BIEGU = false` nawigacja najpierw z cache wersji, sieć tylko bez wpisu.

