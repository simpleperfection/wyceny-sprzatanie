# Znane problemy — zamkniety-dostep-testy

## P3 faza 1

- 🟡 [P3] src/silnik/vat.js:9 — `STATUSY_VAT` (`string[]`) to druga definicja unii `StatusVat`; strażnik `jestStatusemVat` może rozjechać się z typedefem bez błędu tsc. Poprawka: `Object.freeze(/** @type {const} */ (['czynny', 'zwolniony']))`, typedef `typeof STATUSY_VAT[number]`, `STATUSY_VAT.some((s) => s === x)`.
- 🟡 [P3] sw.js:111 — `zapiszZasoby` filtruje adresy tylko po originie, bez `!czySciezkaCloudflare(adres)`; skrypty wstrzykiwane przez Cloudflare pod `/cdn-cgi/` trafiają do cache jako martwe wpisy. Dodać filtr i test komunikatu z `${ORIGIN}/cdn-cgi/x.js`.
