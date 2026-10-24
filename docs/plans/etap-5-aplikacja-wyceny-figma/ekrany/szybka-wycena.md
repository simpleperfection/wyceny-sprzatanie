# szybka-wycena (`11:471`) — 360 px szer.

PNG: `../szybka-wycena.png`. Trasa: `#/szybka`.

**Co pokazuje:** krótki formularz do rozmowy telefonicznej (rodzaj sprzątania, metraż, łazienki, kuchnia lub aneks, spodziewany stan)
i wynik jako widełki z gotowym tekstem dla klienta.

**Stany:** usługa wyceniana przez telefon (widełki) · usługa wymagająca oględzin („orientacyjnie od X zł” i zalecenie oględzin
lub zdjęć) · tekst skopiowany · przejście do dokładnej wyceny.

**Wymagania:** R5, R10, R11, R12, R14.

**Hierarchia (z podglądu wariantu B):**
1. Nagłówek „Szybka wycena” / „Rozmowa z klientem”.
2. Karta formularza: „Usługa” (wybór), „Rodzaj sprzątania” (chipy), „Metraż” (licznik m²), „Łazienki” (licznik),
   „Kuchnia” (chipy „Osobna” / „Aneks”), „Spodziewany stan” (chipy „Lekki” / „Typowy” / „Mocny”).
3. Wiersz „Pytania do klienta · 4 z 7” ze strzałką — otwiera ekran `pytania-do-klienta`.
4. Karta wyniku: „Widełki dla klienta”, duża kwota z zakreślaczem („250–330 zł” na podglądzie — kwota przykładowa),
   pod nią „Mediana w mazowieckim: 250 zł” i „Rynek: 120–450 zł”, cytat z tekstem dla klienta.
5. Przyciski „Kopiuj tekst” i „Dokładna wycena”.
