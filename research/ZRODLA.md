# Źródła danych cenowych

Wszystkie strony pobrano 2026-10-23. Separator w plikach CSV to `;`, a część dziesiętna jest zapisana po kropce.

## Pliki
| Plik | Co zawiera |
|---|---|
| `cenniki_firm.csv` | skan 95 lokalnych firm (80 z cenami): mieszkanie 50 m², po remoncie, okno, kanapa, dywan, stawka/h |
| `srednie_wojewodztwa.csv` | średnia/mediana z `cenniki_firm.csv` dla każdego województwa |
| `kb_wojewodztwa.csv` | zakresy cen kb.pl dla 16 województw oraz płaca GUS w sekcji N (opis kolumn niżej) |
| `ceny_nowe_uslugi.csv` | ceny usług dodanych 2026-10-23 (posadzki, doczyszczanie, kostka, elewacje, biura, firmy); każdy wiersz ma źródło, datę i link |

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

## Struktura kosztów firmy sprzątającej (do modułu „koszt firmy i marża”)
Szacunek autora [CleanConnect](https://cleanconnect.pl/blog/stawki-sprzatania-2026-ile-zarabiaja-firmy) (2026-09-10), a nie dane GUS. Udział w kwocie z faktury:
pensje z ZUS pracodawcy 50–55% · chemia, sprzęt i paliwo ok. 10% · koszty stałe ok. 5% · podatek i ZUS właściciela ok. 7% · zostaje 20–30%.
