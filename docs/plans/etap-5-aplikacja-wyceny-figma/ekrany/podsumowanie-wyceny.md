# podsumowanie-wyceny (`11:1339`) — 360 px szer.

PNG: `../podsumowanie-wyceny.png`. Trasy: `#/kreator/cena` (ostatni krok) i `#/wycena/<id>` (zapisana wycena).

**Co pokazuje:** cena rynkowa (mediana i widełki) jako cena proponowana, koszt zlecenia (czas pracy, chemia, sprzęt, dojazd)
i zdanie „zostaje dla Ciebie X zł, czyli Y zł za godzinę pracy”; ręczna zmiana ceny z bieżącym przeliczeniem.

**Stany:** cena z modelu · cena zmieniona ręcznie · firma zwolniona z VAT · czynny podatnik VAT (brutto i netto).

**Wymagania:** R5, R7, R8, R9.

**Hierarchia (z podglądu wariantu B):**
1. Nagłówek „Podsumowanie” / numer wyceny i klient („Wycena 15/10 · Marzena, Bielany”), pasek postępu kreatora.
2. Karta „Cena dla klienta” z przyciskiem „Zmień”: kwota z zakreślaczem i znacznik „w widełkach rynku”; pod nią rozbicie
   („sprzątanie 290 zł + dojazd 4 zł · bez VAT (firma zwolniona)”).
3. Karta „Twoja cena na tle rynku”: pasek widełek z medianą i znacznikiem ceny („mediana 250”, „Twoja cena 290 (+16%)”),
   pod nim „rynek od 120 zł do 450 zł”.
4. Karta „Zostaje dla Ciebie” (kolory sukcesu): kwota i „47 zł za godzinę pracy · 5 h 15 min (tempo 1,18×)”.
5. Karta „Koszt zlecenia”: wiersze „Cena dla klienta”, „Chemia (szacunek 4 zł/h)”, „Dojazd (…)”, „Zostaje dla Ciebie”.
6. Przyciski „Zapisz” i „Przygotuj ofertę”.

Kwoty na podglądzie są przykładowe.
