# kreator-pozycje (`11:965`) — 360 px szer.

PNG: `../kreator-pozycje.png`. Trasa: `#/kreator/zakres` dla usług w trybie `pozycje`.

**Co pokazuje:** usługi z pozycjami (okna, tapicerka, dywany, posadzki, doczyszczanie, kostka, elewacja, hale): ilości lub metraż
pozycji, dopłaty, poziom brudu tam, gdzie usługa go ma.

**Stany:** brak pozycji · pozycje wybrane · dopłata (np. mech, olej) · próg metrażu zmieniający cenę za m² · błąd ilości.

**Wymagania:** `PLAN.md` etap 5.

**Uwagi:** usługi m² z `progi` mają jedną powierzchnię (licznik) i przełączniki pozycji; dopłaty (`typ: "doplata"`) liczą się bez progu.
Baner progu pokazuje dopłatę albo zniżkę za m² („Małe zlecenie (do 50 m²): cena za m² +15%.”). Okna, tapicerka i dywany mają liczniki
pozycji. Poziom brudu (lekkie / średnie / silne) tylko przy usługach z `poziomy_brudu: true`.
