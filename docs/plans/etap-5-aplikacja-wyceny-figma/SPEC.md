# Etap 5: aplikacja do wycen — specyfikacja makiet

> Spisane 2026-10-24 bez odczytu Figmy przez MCP (limit konta wyczerpany 2026-10-24). Źródła: zrzuty PNG wyeksportowane ręcznie
> z aplikacji Figma (ramki ze strony „Makiety etapu 5”, stan główny, telefon 360 px), opisy ekranów z sekcji 4
> `docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md` i podgląd wariantu B `docs/operator/etap-5-wariant-b.html`
> (4 ekrany w układzie zaakceptowanych makiet). Źródło: Figma `sDtiv6VdCbpyfM6Gfs7Xej`.
>
> **Nie wywołuj narzędzi Figma MCP** (`get_design_context`, `get_screenshot`, `use_figma` i pozostałych): konto ma limit
> 20 wywołań miesięcznie i jest on wyczerpany. Źródłem są PNG, pliki `ekrany/*.md` i ten SPEC.

## Jak czytać makiety

- **Układ** (kolejność sekcji, hierarchia, komponenty, teksty) bierzesz z PNG i z pliku ekranu w `ekrany/`.
- **Kolory, font i zaokrąglenia** bierzesz z tabeli tokenów niżej (wariant B „kartka i długopis”, decyzja właściciela
  2026-10-24 w `/dev-plan`), a nie z PNG: zrzuty pokazują wersję 3 (granat i szmaragd, font Plus Jakarta Sans).
- **Dane na PNG są przykładowe** (Anna Kowalska, „Twoja Firma Sprzątająca”, kwoty). Kwoty liczy silnik wyceny; nie przepisuj
  ich do kodu. Teksty interfejsu (etykiety, nagłówki, przyciski) bierzesz dosłownie z pola „Teksty (verbatim)” jednostki planu,
  a gdy go nie ma — z pliku ekranu.
- Makiety pokazują tylko **stan główny na telefonie**. Pozostałe stany z pliku ekranu i wersję na komputer projektujesz
  z tych samych komponentów (zasady niżej); właściciel akceptuje je po implementacji.

## Screeny referencyjne

PNG to wycinki z eksportu sekcji (2x): 768 px szerokości = ekran 720 px (360 px × 2) i 24 px marginesu z każdej strony; nad ekranem
jest podpis z nazwą ekranu i opisem z makiety (nie jest częścią interfejsu). Arkusz komponentów etapu: `./komponenty.png`.

| Nazwa | Plik | SPEC ekranu | Wymiary | Frame |
|---|---|---|---|---|
| ekran-startowy | `./ekran-startowy.png` | `./ekrany/ekran-startowy.md` | 360 px szer. | `10:322` |
| ustawienia-firmy | `./ustawienia-firmy.png` | `./ekrany/ustawienia-firmy.md` | 360 px szer. | `10:429` |
| szybka-wycena | `./szybka-wycena.png` | `./ekrany/szybka-wycena.md` | 360 px szer. | `11:471` |
| pytania-do-klienta | `./pytania-do-klienta.png` | `./ekrany/pytania-do-klienta.md` | 360 px szer. | `11:561` |
| kreator-wybor-uslugi | `./kreator-wybor-uslugi.png` | `./ekrany/kreator-wybor-uslugi.md` | 360 px szer. | `11:622` |
| kreator-pomieszczenia | `./kreator-pomieszczenia.png` | `./ekrany/kreator-pomieszczenia.md` | 360 px szer. | `11:786` |
| kreator-pozycje | `./kreator-pozycje.png` | `./ekrany/kreator-pozycje.md` | 360 px szer. | `11:965` |
| kreator-dodatki | `./kreator-dodatki.png` | `./ekrany/kreator-dodatki.md` | 360 px szer. | `11:1073` |
| dobor-chemii | `./dobor-chemii.png` | `./ekrany/dobor-chemii.md` | 360 px szer. | `11:1212` |
| podsumowanie-wyceny | `./podsumowanie-wyceny.png` | `./ekrany/podsumowanie-wyceny.md` | 360 px szer. | `11:1339` |
| zakonczenie-zlecenia | `./zakonczenie-zlecenia.png` | `./ekrany/zakonczenie-zlecenia.md` | 360 px szer. | `11:1602` |
| oferta-edycja | `./oferta-edycja.png` | `./ekrany/oferta-edycja.md` | 360 px szer. | `11:1438` |
| oferta-klient | `./oferta-klient.png` | `./ekrany/oferta-klient.md` | 360 px szer. | `11:1545` |
| kopia-zapasowa | `./kopia-zapasowa.png` | `./ekrany/kopia-zapasowa.md` | 360 px szer. | `10:578` |

## Tokeny (zmienne Figmy → `src/style/tokeny.css`)

Nazwy zmiennych CSS powstają z nazw zmiennych Figmy (kolekcja „Kolory v3”): `/` → `-`, przedrostek `--`. Wartości to wariant B.
Nazwy „zielen” są spuścizną wersji 3: w wariancie B to kolor akcji (niebieski tusz). Zmiana wariantu albo barw marki
Simple Perfection = zmiana wartości w `src/style/tokeny.css`, bez zmian w innych plikach.

| Zmienna Figmy | Zmienna CSS | Wariant B (HEX) | Użycie |
|---|---|---|---|
| tlo/strona | `--tlo-strona` | `#f4f1ea` | tło ekranu (kremowy papier) |
| tlo/karta | `--tlo-karta` | `#fffdf8` | karty, dolny pasek, dokument oferty |
| tlo/miekkie | `--tlo-miekkie` | `#ebe6dc` | awatary, pola nieaktywne, tło chipów |
| marka/granat | `--marka-granat` | `#26282c` | nagłówek ekranu (grafit) |
| marka/granat-jasny | `--marka-granat-jasny` | `#aaa59b` | podtytuł w nagłówku |
| marka/zielen | `--marka-zielen` | `#2340a8` | kolor akcji: przyciski główne, aktywne chipy, ikony kafli, przycisk „+” |
| marka/zielen-ciemna | `--marka-zielen-ciemna` | `#1a2f7d` | przycisk główny po najechaniu i wciśnięciu |
| marka/zielen-tlo | `--marka-zielen-tlo` | `#e6ebf8` | tło wybranej opcji, status „Wysłana” |
| marka/zielen-wykres | `--marka-zielen-wykres` | `#c9d3ef` | pasek widełek rynku |
| tekst/glowny | `--tekst-glowny` | `#26282c` | tekst podstawowy |
| tekst/drugi | `--tekst-drugi` | `#5f5b54` | opisy, etykiety pól |
| tekst/trzeci | `--tekst-trzeci` | `#948f86` | podpowiedzi, nieaktywne pozycje paska |
| tekst/na-ciemnym | `--tekst-na-ciemnym` | `#fffdf8` | tekst na grafitowym nagłówku i na przycisku głównym |
| linia/podzial | `--linia-podzial` | `#e4ded3` | podziały wierszy, obrys kart |
| linia/obrys | `--linia-obrys` | `#d3ccbf` | obrys pól formularza |
| uwaga/tlo | `--uwaga-tlo` | `#fbefb6` | baner uwagi, status „Do wysłania”, zakreślacz |
| uwaga/tekst | `--uwaga-tekst` | `#6e5300` | tekst na tle uwagi |
| info/tlo | `--info-tlo` | `#e6ebf8` | baner informacji |
| info/tekst | `--info-tekst` | `#2340a8` | tekst banera informacji |
| blad/tlo | `--blad-tlo` | `#f8e1dc` | baner błędu, pole z błędem |
| blad/tekst | `--blad-tekst` | `#a8321f` | komunikat błędu |
| status/szkic-tekst | `--status-szkic-tekst` | `#5f5b54` | status „Szkic” |
| status/wykonana-tlo | `--status-wykonana-tlo` | `#e2ddd3` | status „Wykonana” |
| sukces/tlo | `--sukces-tlo` | `#e3efe2` | status „Przyjęta”, baner sukcesu, „w widełkach rynku” |
| sukces/tekst | `--sukces-tekst` | `#2f6b3a` | „Zostaje dla Ciebie”, „Realna stawka”, skutek pytania |
| — (podgląd B) | `--zakreslacz-mocny` | `#f5dc62` | podkreślenie zakreślaczem jednej liczby na ekranie |

Typografia (z podglądu wariantu B): font **Source Sans 3** (plik w `fonty/`, bez Google Fonts), tekst podstawowy 14 px;
tytuł nagłówka ekranu 19 px / 700; podtytuł nagłówka 12,5 px; tytuł karty 14 px / 700; etykieta pola 12,5 px / 600 w kolorze
`--tekst-drugi`; duża kwota 19–28 px / 700–800; drobne opisy 11,5–12,5 px.

Zaokrąglenia wariantu B: karty 10 px, przyciski 8 px, chipy i pigułki statusów 6–8 px, arkusz od dołu 14 px (górne rogi),
przycisk „+” w dolnym pasku — koło 48 px.

## Zasady wspólne

- **Zieleń tylko dla pieniędzy**: kolory `--sukces-*` mają wyłącznie „Zostaje dla Ciebie”, „Realna stawka”, status „Przyjęta”,
  znacznik „w widełkach rynku” i skutek pytania, które ustawiło coś w wycenie. Akcje mają kolor `--marka-zielen` (tusz).
- **Zakreślacz tylko na jednej liczbie na ekranie** (widełki w szybkiej wycenie, cena dla klienta w podsumowaniu).
- Nagłówek ekranu: grafitowy pas (`--marka-granat`) z tytułem, strzałką wstecz i podtytułem.
- Dolny pasek nawigacji (ekrany główne): Start, Wyceny, „+”, Chemia, Firma; „+” otwiera wybór „Szybka wycena” / „Dokładna wycena”.
- Kreator dokładnej wyceny ma pasek postępu z krokami: Usługa, Zakres, Dodatki, Chemia, Cena.
- Pola liczbowe (metraż, ilości, kilometry, czas) mają klawiaturę numeryczną (`inputmode="decimal"`), błędy pod polem
  na tle `--blad-tlo`.
- Wersja na komputer (makiet brak): ta sama kolumna co na telefonie, wyśrodkowana, szerokość do 560 px; dolny pasek zostaje
  w kolumnie. Druk oferty: A4 bez nagłówka aplikacji i bez przycisków.
- Ikony: Tabler Icons (MIT) jako SVG w kodzie, bez fontu ikon z CDN.

## Rozjazdy vs DESIGN.md — Figma jest źródłem prawdy

Projekt nie ma `docs/DESIGN.md` (decyzja w `/dev-plan` 2026-10-24: tokeny są w tym pliku). Jedyny świadomy rozjazd:
PNG pokazują kolory, font i zaokrąglenia wersji 3, a kod dostaje wariant B z tabeli tokenów.
