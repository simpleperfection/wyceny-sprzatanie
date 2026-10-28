# pytania-do-klienta (`11:561`) — 360 px szer.

PNG: `../pytania-do-klienta.png`. Osobny ekran `#/wycena/<id>/pytania`, otwierany z szybkiej i z dokładnej wyceny.

**Co pokazuje:** lista pytań do klienta dla wybranej usługi z miejscem na odpowiedzi zapisywane przy wycenie.

**Stany:** bez odpowiedzi · częściowo wypełnione · odpowiedź, która ustawiła coś w wycenie (np. sierść, dojazd).

**Wymagania:** R13.

**Uwagi:** nagłówek ekranu z usługą i licznikiem odpowiedzi („Mieszkanie · standard · 4 z 7”), karta z listą pytań, pytanie bez odpowiedzi ma link „+ Dodaj odpowiedź”, pod listą baner prośby o zdjęcia z „Kopiuj prośbę”, na dole „Gotowe”. Pytanie z odpowiedzią, która zmieniła wycenę,
pokazuje pod spodem skutek w kolorach `--sukces-*` (jedyny wyjątek od zasady „zieleń tylko dla pieniędzy”). Treść pytań pochodzi
z `data/pytania.json`.
