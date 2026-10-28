# kreator-dodatki (`11:1073`) — 360 px szer.

PNG: `../kreator-dodatki.png`. Trasa: `#/kreator/dodatki`.

**Co pokazuje:** dodatki do usługi (AGD, szafki, balkon) i dojazd w kilometrach.

**Stany:** bez dodatków · wybrane dodatki · dojazd w promieniu bez opłat · dojazd płatny.

**Wymagania:** `PLAN.md` etap 5.

**Uwagi:** dodatki to pozycje usług z listy `dodatki` wybranej usługi w `data/ceny.json` (np. okna, AGD, tapicerka, dywany).
Usługi bez listy dodatków pokazują tylko dojazd. Dodatek jest „w cenie” (przełącznik) albo „zaproponuj w ofercie” — wtedy nie wchodzi do ceny, a klient widzi go w ofercie jako „Możesz dobrać”. Karta dojazdu pokazuje kwotę dla klienta i koszt firmy (tam i z powrotem).
