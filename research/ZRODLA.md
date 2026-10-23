# Źródła danych cenowych

Wszystkie strony pobrano 2026-10-23. Separator w plikach CSV to `;`, a część dziesiętna jest zapisana po kropce.

## Pliki
| Plik | Co zawiera |
|---|---|
| `cenniki_firm.csv` | skan 95 lokalnych firm (80 z cenami): mieszkanie 50 m², po remoncie, okno, kanapa, dywan, stawka/h |
| `srednie_wojewodztwa.csv` | średnia/mediana z `cenniki_firm.csv` dla każdego województwa |
| `kb_wojewodztwa.csv` | zakresy cen kb.pl dla 16 województw oraz płaca GUS w sekcji N (opis kolumn niżej) |
| `ceny_nowe_uslugi.csv` | ceny usług dodanych 2026-10-23 (posadzki, doczyszczanie, kostka, elewacje, biura, firmy), AGD i dojazd, płaca minimalna i kilometrówka; każdy wiersz ma źródło, datę i link |
| `KALIBRACJA.md` | raport z `scripts/kalibracja.ps1`: mediany, normy, porównanie modelu z rynkiem, województwa, marże |
| `DYSTRYBUTORZY.md` | zatwierdzona lista 8 dostawców chemii (kryteria, karty SDS, ceny, rezerwa i odrzuceni) |

Źródła cen środków chemicznych nie mają osobnego pliku: każdy produkt w `data/chemia.json` ma link do strony z ceną i datą pobrania (`cena_zrodlo`) oraz link do karty SDS z datą karty (`sds`).

Z tych plików powstają dane aplikacji: `data/ceny.json` (ręcznie, każda cena ma pole `zrodla` z kluczem z sekcji `zrodla`) oraz `data/rynek.json` i `data/normy.json` (generuje `scripts/kalibracja.ps1`).

## Kolumny `kb_wojewodztwa.csv`
| Kolumny | Źródło | Data cennika | Jednostka | VAT | Zakres ceny |
|---|---|---|---|---|---|
| `dom_*` | [kb.pl – sprzątanie domu](https://kb.pl/cenniki/sprzatanie-domu/) | 2026-05-23 | zł za usługę (do 40 / 40–100 / 100–200 m²) | brutto 8% | sama robocizna, jednorazowo, 2–3 h |
| `po_remoncie_h_*` | [kb.pl – sprzątanie po remoncie](https://kb.pl/cenniki/sprzatanie-po-remoncie/) | 2026-04-29 | zł/h, 1 osoba | brutto 8% | sama robocizna |
| `elewacja_atm_*` | [kb.pl – mycie elewacji karcherem](https://kb.pl/cenniki/mycie-elewacji-karcherem/) | 2026-04-29 | zł/m² | brutto 8% | kamień/beton do 200 m²; wg cennika z materiałem |
| `elewacja_bio_*`, `elewacja_chem_*` | [kb.pl – artykuł o myciu elewacji](https://kb.pl/elewacje-i-ocieplenie/elewacje/mycie-elewacji-cennik-w-roznych-miastach-w-polsce/) | 2026-01-07 | zł/m² | brutto | kamień/beton; „stawki robocizny” |
| `biuro_*` | [kb.pl – sprzątanie biur](https://kb.pl/cenniki/sprzatanie-biur/) | 2026-05-20 | zł za usługę (do 100 m² ≈ 2 h / do 200 m² ≈ 4 h) | brutto 8% | sama robocizna, usługa cykliczna |
| `tapicerka_*` | [kb.pl – czyszczenie tapicerki](https://kb.pl/cenniki/czyszczenie-tapicerki-meblowej/) | 2026-04-29 | zł (jednostka niepodana, prawdopodobnie za miejsce/element) | brutto 8% | sama robocizna, mała skala zabrudzeń |
| `gus_placa_N_*` | GUS BDL, zmienna 151738, za 2024 r. (przez [CleanConnect](https://cleanconnect.pl/blog/stawki-sprzatania-2026-ile-zarabiaja-firmy)) | 2024 | przeciętna płaca brutto/mies. i /h (168 h) w sekcji N | – | do liczenia kosztu robocizny firmy |

## Wiarygodność źródeł
- **kb.pl** podaje ceny szacunkowe „na podstawie ofert z internetu”. Różnice między województwami są tam małe (kilka–kilkanaście %), mniejsze niż w naszym skanie firm, co sugeruje mocne uśrednianie.
- **cenauslug.pl** przy wielu usługach pisze o „120 wycenach”, a na stronie kostki brukowej podaje 9 ofert. Liczby traktujemy jako orientacyjne.
- **Cenniki firm** to ceny „od” i często są stare (np. czyszczenie-posadzek.com.pl z 2022 r.). Duże zlecenia na hale mają ceny dużo niższe niż małe zlecenia (0,60 zł/m² w porównaniu z 10 zł/m²).
- **VAT**: porównywarki dla usług domowych podają kwoty brutto z 8% VAT, a firmy B2B ceny netto (+23%). Przed porównaniem trzeba to ujednolicić.
- **Cenniki usług dodatkowych** (AGD, balkon): CleaningRoom (Gdańsk, 2026), Czyściutko (Prudnik, 2025), SonicDom (Lublin, 2026) – żaden nie podaje, czy ceny są netto czy brutto.
- **kb.pl, biura**: „do 100 m², do 2 godzin” za 366–418 zł daje ok. 190 zł/h, czyli trzy razy więcej niż stawka kb.pl po remoncie (64 zł/h). Dlatego normy biur kalibrujemy do czasu (2 h na 100 m²), a nie do tej ceny.
- **CleanConnect, hale**: widełki 1,80–3,00 zł/m² stoją w zestawieniu obok stawek miesięcznych dla biur, więc przyjmujemy je jako miesięczne (przeliczone na wizytę przy sprzątaniu raz w tygodniu).

## Wartości ustawowe (koszty firmy)
- Płaca minimalna 2026: 4806 zł/mies., minimalna stawka godzinowa (umowa zlecenie) 31,40 zł brutto – rozporządzenie RM z 11.09.2025 (Dz.U. 2025 poz. 1242), [zielonalinia.gov.pl](https://zielonalinia.gov.pl/wynagrodzenie-minimalne-w-2026-1/).
- Składki pracodawcy na zleceniu: emerytalna 9,76%, rentowa 6,5%, wypadkowa 1,67% (stawka podstawowa), FP 2,45%, FGŚP 0,1% – razem 20,48%.
- Kilometrówka: 0,89 zł/km (do 900 cm³), 1,15 zł/km (powyżej 900 cm³), bez zmian od 17.01.2023 – [poradnikprzedsiebiorcy.pl](https://poradnikprzedsiebiorcy.pl/-stawka-za-1-km-przebiegu-pojazdu-jaki-limit).

## Struktura kosztów firmy sprzątającej (do modułu „koszt firmy i marża”)
Szacunek autora [CleanConnect](https://cleanconnect.pl/blog/stawki-sprzatania-2026-ile-zarabiaja-firmy) (2026-09-10), a nie dane GUS. Udział w kwocie z faktury:
pensje z ZUS pracodawcy 50–55% · chemia, sprzęt i paliwo ok. 10% · koszty stałe ok. 5% · podatek i ZUS właściciela ok. 7% · zostaje 20–30%.
