# Known issues — etap-5-aplikacja-wyceny

## P3 faza 1

- 🟡 [P3] scripts/serwer-dev.mjs:63 — Serwer nie sprawdza nagłówka `Host` (`Host: evil.example:5174` dostaje 200). DNS rebinding pozwala stronie atakującego czytać pliki spoza katalogów z kropką przy uruchomionym `npm start`; dziś te pliki są publiczne albo z npm, więc skutek mały. Naprawa: w `obsluzZadanie` odrzucać 403 żądania z `req.headers.host` innym niż `127.0.0.1:<port>`/`localhost:<port>` i dopisać test z `Host: evil.example`.
- 🟡 [P3] src/silnik/koszt.js:33 — `pozycjeWgKlucza` przy każdym `kosztZlecenia` buduje od nowa mapę `usluga.pozycja → Pozycja`, którą `indeksyCen` w katalog.js:126 już trzyma. Poprawka: akcesor `katalog.pozycjaWgKlucza(klucz)` rzucający `BladWejscia('nieznana_pozycja')`, usunąć `pozycjeWgKlucza` i parametr `pozycje` z `chemiaLinii`/`kosztSprzetu`.
- 🟡 [P3] src/silnik/cena.js:16 — `LiniaWyceny` opisuje dwa stany jednym typem z polami nullable (`klucz === null` dokładnie przy `rodzaj === 'praca'`), przez co koszt.js:39 używa `linia.klucz ?? ''`. Poprawka: unia rozłączna po `rodzaj` i usunięcie `?? ''`.
- 🟡 [P3] src/silnik/katalog.js:16 — `podstawa_ceny: string` w typedef `Usluga`, choć dopuszczalne są tylko `'brutto' | 'netto'`; szeroki typ idzie do `WynikWyceny.podstawaCeny` (cena.js:23) i `cenaDlaKlienta` (vat.js:37). Poprawka: `@typedef {'brutto' | 'netto'} PodstawaCeny` użyty we wszystkich trzech miejscach.
- 🟡 [P3] src/silnik/uklad.js:18 — Nazwa `wGranicach(wartosc, min, max)` brzmi jak predykat, a funkcja przycina wartość. Poprawka: zmienić na `przytnijDoGranic` (linia 18 i wywołanie w linii 58).
- 🟡 [P3] scripts/serwer-dev.mjs:81 — `createReadStream(...).pipe(res)` nie zamyka strumienia pliku, gdy klient przerwie żądanie; deskryptory kumulują się w długiej sesji E2E. Poprawka: `pipeline(createReadStream(wynik.plik), res, (blad) => { if (blad && blad.code !== 'ERR_STREAM_PREMATURE_CLOSE') zapiszBlad(req.url, blad) })` z `node:stream`.
- 🟡 [P3] scripts/serwer-dev.test.mjs:216 — Gałąź `if (zdekodowana.includes('\0')) return { status: 400 }` (scripts/serwer-dev.mjs:53) nie ma testu; po jej usunięciu serwer odda 500 zamiast 400 przy zielonym zestawie. Poprawka: w teście z linii 216 dopisać `assert.equal((await serwer.pobierz('/index.html%00.js')).status, 400)`.

## P3 faza 2

- 🟡 [P3] src/dane/walidacja.js:73 — `bladEmaila` przepuszcza znaki sterujące C0 (poza białymi) i U+007F, np. `kontakt@firma.pl\u0000`. Naprawa: `/[\s\u0000-\u001f\u007f]/.test(adres)` i dopisanie tych wejść do testu.
- 🟡 [P3] src/dane/kopia.js:160 — `odczytajKopie` nie ogranicza rozmiaru tekstu przed `JSON.parse`; plik rzędu setek MB zamraża kartę. Naprawa: `MAKS_DLUGOSC_PLIKU = 5_000_000` i `BladKopii('zly_plik', 'Plik kopii jest za duży')`.
- 🟡 [P3] src/dane/kopia.js:33 — Kod błędu `BladKopii` ma typ `string`, choć zbiór kodów jest zamknięty. Dodać typedef `KodBleduKopii` ('zly_plik' | 'nowsza_wersja' | 'uszkodzony' | 'tryb' | 'data') i użyć go w konstruktorze i polu `kod`.
- 🟡 [P3] src/dane/ustawienia.js:38 — Limit 254 dla e-maila w `DLUGOSC_POL_FIRMY.email` dubluje `DLUGOSC_EMAILA_MAKS` z walidacja.js:14. Wyeksportować stałą i użyć jej.
- 🟡 [P3] src/dane/magazyn.js:71 — Wzorzec „wywołaj `sprawdzStatusVat` i złap BladWejscia” występuje trzy razy (magazyn.js:71, ustawienia.js:81, ustawienia.js:205). Dodać w src/silnik/vat.js strażnik `jestStatusemVat` i zastąpić nim bloki try/catch.
- 🟡 [P3] src/dane/wyceny.js:247 — `zmienStatus(..., 'wyslana')` nie ustawia `oferta.wyslana`, więc po przejściu do `przyjeta` zmiana wejścia lub ceny nie oznacza oferty jako nieaktualnej. Poprawka: przy `nowy === 'wyslana'` ustawiać `oferta.wyslana = teraz.toISOString()` i `nieaktualna: false`.
- 🟡 [P3] src/dane/ustawienia.js:233 — `brakujeUstawien` zgłasza 'wojewodztwo' zawsze przy `wojewodztwoId === null`, także przy świadomym wyborze „średnia krajowa” (plan, linie 755 i 932). Poprawka: `if (ustawienia.wojewodztwoId === null && !ustawienia.kreatorZakonczony)`.
- 🟡 [P3] src/dane/kopia.test.js:146 — Test `polacz` nie sprawdza równych dat `zmieniona` (lokalna ma wygrać, kopia.js:286 `>`). Dodać test: lokalna `1/10/2026` i z pliku `9/10/2026` z tą samą `zmieniona` → zostaje `1/10/2026`.
