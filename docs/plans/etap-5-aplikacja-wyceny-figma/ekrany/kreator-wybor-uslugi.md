# kreator-wybor-uslugi (`11:622`) — 360 px szer.

PNG: `../kreator-wybor-uslugi.png`. Trasa: `#/kreator/usluga`.

**Co pokazuje:** pierwszy krok dokładnej wyceny z paskiem postępu: wybór usługi i województwa (podpowiedziane z ustawień firmy).

**Stany:** brak wyboru · wybrana usługa z pomieszczeniami · wybrana usługa z pozycjami · AGD tylko jako dodatek.

**Wymagania:** `PLAN.md` etap 5 (kreator, pasek postępu).

**Uwagi:** pasek postępu „Usługa, Zakres, Dodatki, Chemia, Cena”. Usługi z `data/ceny.json` pogrupowane wg pola `grupa`
(dom, firma, zewnątrz); AGD (`tylko_dodatek`) nie jest wybieralne jako usługa i ma dopisek, że dodaje się je w kroku dodatków.
Przy sprzątaniu biur wybór wariantu (jednorazowo albo abonament).
