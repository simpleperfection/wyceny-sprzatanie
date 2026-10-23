# Kalibracja norm i cen

Raport generowany przez `scripts/kalibracja.ps1` (2026-10-23). Wejście: `research/cenniki_firm.csv`, `research/kb_wojewodztwa.csv`, `data/ceny.json`. Wyjście: `data/rynek.json`, `data/normy.json`.

## 1. Punkty odniesienia (mediany krajowe ze skanu firm)

| Pozycja | Mediana | Średnia | n | Zakres |
|---|---|---|---|---|
| Stawka godzinowa (zł/h) | 65,00 | 69,09 | 11 | 45,00–120,00 |
| Mieszkanie 50 m², standard (zł) | 250,00 | 247,37 | 38 | 120,00–450,00 |
| Po remoncie (zł/m²) | 11,75 | 12,17 | 20 | 7,00–20,00 |
| Okno 1-skrzydłowe (zł) | 30,00 | 28,82 | 39 | 10,00–70,00 |
| Kanapa 3-os. (zł) | 150,00 | 147,17 | 23 | 60,00–240,00 |
| Dywan (zł/m²) | 17,50 | 16,36 | 14 | 5,00–27,00 |

Pominięte wartości (8):
- Mika, `mieszkanie_50m2_zl`: cena sprzątania cyklicznego (1–2 zł/m²), oznaczona w skanie jako odstająca
- Mika, `po_remoncie_zl_m2`: oznaczona w skanie jako odstająca
- Tanie Sprzątanie, `mieszkanie_50m2_zl`: pakiet podstawowy do 60 m², oznaczony w skanie jako odstający
- Tanie Sprzątanie, `stawka_h_zl`: oznaczona w skanie jako odstająca
- Manutarg, `po_remoncie_zl_m2`: oznaczona w skanie jako odstająca
- Efekt Rzeszów, `mieszkanie_50m2_zl`: cena sprzątania generalnego, nie standardowego
- PERFECT, `mieszkanie_50m2_zl`: cena sprzątania generalnego (8 zł/m²)
- EffectBcleaner, `mieszkanie_50m2_zl`: cena jednej wizyty w abonamencie

Kontrola: kb.pl podaje dla sprzątania po remoncie średnio 64,30 zł/h brutto, a mediana skanu to 65,00 zł/h.

## 2. Kalibracja norm pomieszczeń

Cel: mieszkanie 50 m² (standard) = 250 zł przy 65,00 zł/h, czyli 230,8 min pracy. Przygotowanie i odbiór zlecenia to stałe 30 min, reszta jest rozłożona na pomieszczenia według wag (pokój 2,5 : kuchnia 6,5 : łazienka 11).

| Pomieszczenie | Norma (min/m²) |
|---|---|
| Pokój, sypialnia, salon (dom) | 2,63 |
| Przedpokój, korytarz, schowek (dom) | 2,63 |
| Kuchnia lub aneks (dom) | 6,83 |
| Łazienka lub WC (dom) | 11,56 |
| Biuro, gabinet, open space (biuro) | 0,62 |
| Sala konferencyjna, sala sprzedaży, poczekalnia (biuro) | 0,56 |
| Kuchnia socjalna (biuro) | 2,47 |
| Toaleta (biuro) | 4,93 |
| Korytarz, hol, klatka schodowa (biuro) | 0,37 |

Pył budowlany (poziom 2) skalibrowany do mediany po remoncie 11,75 zł/m²: **4,0 min/m²**.

| Usługa, 50 m² | Czas | Cena modelu | Cel | Odchylenie |
|---|---|---|---|---|
| Mieszkanie lub dom – sprzątanie standardowe | 3,8 h | 250 zł | 250 zł (mediana skanu) | 0% |
| Mieszkanie lub dom – sprzątanie gruntowne | 5,7 h | 370 zł | 375 zł (1,5 × standard (mediana z 3 cenników: 1,56)) | -1% |
| Mieszkanie lub dom – sprzątanie po remoncie | 9,0 h | 586 zł | 588 zł (mediana 11,75 zł/m² × 50) | 0% |
| Mieszkanie – sprzątanie po wynajmie lub przeprowadzce | 5,7 h | 372 zł | brak danych – założenie | 1,49 × standard |

Kontrola brudu: kurz na poziomie 3 w całym mieszkaniu 50 m² wydłuża pracę o 41% (rynek: silne zabrudzenie +30–50%).

## 3. Walidacja: zależność ceny od metrażu

| Porównanie | Rynek | Model | Różnica |
|---|---|---|---|
| kb.pl: cena 40–100 m² / do 40 m² (model: 70 / 35 m²) | 1,50 | 1,67 | +11% |
| kb.pl: cena 100–200 m² / do 40 m² (model: 150 / 35 m²) | 2,54 | 3,28 | +29% |
| kb.pl: do 40 m², średnia krajowa (model: 35 m²) | 303 zł | 198 zł | -35% |

Cenniki firm z progami metrażu. Poziom cen zależy od firmy, dlatego ważniejszy jest kształt: ile razy cena rośnie względem najmniejszego progu tej samej firmy.

| Firma, próg (model: metraż, stawka województwa) | Cena firmy | Model | Różnica poziomu | Firma: × najmniejszy próg | Model: × najmniejszy próg |
|---|---|---|---|---|---|
| Czyściutko (Prudnik), do 40 m²: 250–300 (model: 35 m², 69,50 zł/h) | 275 zł | 212 zł | -23% | 1,00 | 1,00 |
| Czyściutko (Prudnik), 41–70 m²: 300–450 (model: 55 m², 69,50 zł/h) | 375 zł | 287 zł | -23% | 1,36 | 1,36 |
| Czyściutko (Prudnik), 71–100 m²: 450–700 (model: 85 m², 69,50 zł/h) | 575 zł | 414 zł | -28% | 2,09 | 1,95 |
| Kwik Czystości (Lublin), 30 m²: 250 (model: 30 m², 69,50 zł/h) | 250 zł | 197 zł | -21% | 1,00 | 1,00 |
| Kwik Czystości (Lublin), 51–74 m²: 500 (model: 62 m², 69,50 zł/h) | 500 zł | 324 zł | -35% | 2,00 | 1,65 |
| Kwik Czystości (Lublin), 75–98 m²: 600 (model: 86 m², 69,50 zł/h) | 600 zł | 417 zł | -31% | 2,40 | 2,12 |
| DoMi (Lublin), 50–70 m²: 325 (model: 60 m², 69,50 zł/h) | 325 zł | 318 zł | -2% | 1,00 | 1,00 |

## 4. Walidacja: biura

| Scenariusz | Model | Rynek | Uwagi |
|---|---|---|---|
| Jednorazowo, 100 m² | 179 zł netto (2,8 h) | 366–418 zł brutto (kb.pl) | kb.pl podaje „do 2 h”, ale ta cena to ok. 190 zł/h – niespójne z jego stawką po remoncie (64 zł/h) |
| Abonament 1× w tygodniu, 100 m² | 5,64 zł/m²/mies. netto | 4,50–7,00 zł/m²/mies. brutto (CleanConnect) | 564 zł/mies. |
| Abonament 1× w tygodniu, 1000 m² | 3,10 zł/m²/mies. netto | 4,50–7,00 zł/m²/mies. brutto (CleanConnect) | 3 104 zł/mies. |
| Abonament 3× w tygodniu, 100 m² | 13,76 zł/m²/mies. netto | 2,80–4,50 zł/m²/mies. brutto (CleanConnect) | 1 376 zł/mies.; przy 13 wizytach 4,50 zł/m² dawałoby 35 zł za wizytę w biurze 100 m² – poniżej kosztu pracy, więc widełki CleanConnect dotyczą raczej dużych biur |
| Abonament 3× w tygodniu, 1000 m² | 7,10 zł/m²/mies. netto | 2,80–4,50 zł/m²/mies. brutto (CleanConnect) | 7 095 zł/mies.; mnożnik wydajności dużego biura 0,70 – model nadal powyżej rynku, do weryfikacji |

## 5. Województwa

wsp = (n × indeks skanu + 5 × indeks kb.pl) / (n + 5). Stawka = 65,00 zł/h × wsp.

| Województwo | wsp | Skan (n) | kb.pl | Stawka zł/h | Model 50 m² | Skan 50 m² (n) | GUS sekcja N zł/h |
|---|---|---|---|---|---|---|---|
| dolnośląskie | 1,04 | 1,03 (6) | 1,04 | 67,50 | 260 zł | 300 (1) | 38,64 |
| kujawsko-pomorskie | 0,86 | 0,63 (3) | 1,00 | 56,00 | 215 zł | 150 (3) | 33,86 |
| lubelskie | 1,07 | 1,17 (5) | 0,97 | 69,50 | 267 zł | 318 (2) | 34,26 |
| lubuskie | 1,05 | 1,20 (1) | 1,02 | 68,50 | 264 zł | 300 (1) | 33,50 |
| łódzkie | 0,88 | 0,67 (3) | 1,01 | 57,00 | 219 zł | 150 (1) | 35,76 |
| małopolskie | 1,00 | 1,02 (5) | 0,99 | 65,00 | 250 zł | 260 (5) | 44,21 |
| mazowieckie | 1,00 | 0,97 (6) | 1,03 | 65,00 | 250 zł | 230 (5) | 41,20 |
| opolskie | 1,07 | 1,12 (5) | 1,03 | 69,50 | 267 zł | 215 (2) | 35,39 |
| podkarpackie | 0,90 | 0,81 (4) | 0,98 | 58,50 | 225 zł | 230 (3) | 31,01 |
| podlaskie | 0,98 | 1,00 (6) | 0,96 | 63,50 | 244 zł | 350 (1) | 31,59 |
| pomorskie | 1,13 | 1,27 (6) | 0,98 | 73,50 | 283 zł | 275 (4) | 38,85 |
| śląskie | 1,05 | 1,10 (4) | 1,01 | 68,50 | 264 zł | 330 (2) | 34,36 |
| świętokrzyskie | 0,80 | 0,56 (4) | 1,00 | 52,00 | 200 zł | 190 (2) | 32,44 |
| warmińsko-mazurskie | 0,92 | 0,84 (3) | 0,97 | 60,00 | 231 zł | – | 31,86 |
| wielkopolskie | 1,16 | 1,28 (6) | 1,01 | 75,50 | 290 zł | 240 (2) | 38,24 |
| zachodniopomorskie | 0,91 | 0,85 (7) | 1,00 | 59,00 | 227 zł | 300 (4) | 39,49 |

## 6. Spójność katalogu cen ze skanem

- `okna.okno_1`: ceny.json 30,00 zł, mediana skanu 30,00 zł – zgodne
- `tapicerka.kanapa_3`: ceny.json 150,00 zł, mediana skanu 150,00 zł – zgodne
- `dywany.dywan`: ceny.json 17,50 zł, mediana skanu 17,50 zł – zgodne

## 7. Marże przy domyślnych kosztach

Koszt pracy 37,83 zł/h (płaca minimalna 2026 + składki pracodawcy), chemia w usługach pomieszczeń 4 zł/h, sprzęt wg `koszty_firmy.sprzet`. Ceny krajowe bez VAT i bez dojazdu. Koszt nie obejmuje zakupu sprzętu, auta, reklamy ani podatków – to marża brutto na zleceniu. ⚠ oznacza marżę poniżej 20% albo powyżej 85% (do sprawdzenia: cena, czas albo koszt sprzętu).

### Zlecenia wzorcowe (z przygotowaniem, progiem metrażu i minimum zlecenia)

| Zlecenie | Cena | Czas | Koszt | Marża |
|---|---|---|---|---|
| Mieszkanie lub dom – sprzątanie standardowe, 50 m² | 250 zł | 3,8 h | 161 zł | 36% |
| Mieszkanie lub dom – sprzątanie gruntowne, 50 m² | 370 zł | 5,7 h | 238 zł | 36% |
| Mieszkanie lub dom – sprzątanie po remoncie, 50 m² | 586 zł | 9,0 h | 377 zł | 36% |
| Mieszkanie – sprzątanie po wynajmie lub przeprowadzce, 50 m² | 372 zł | 5,7 h | 239 zł | 36% |
| Mycie okien: Okno 1-skrzydłowe, 8 szt. | 240 zł | 2,5 h | 103 zł | 57% |
| Pranie tapicerki: Kanapa 3-osobowa, 2 szt. | 300 zł | 2,5 h | 123 zł | 59% |
| Pranie dywanów i wykładzin: Dywan, 20 m² | 350 zł | 2,5 h | 123 zł | 65% |
| Maszynowe mycie posadzek: Mycie szorowarką (beton, żywica, PCV), 300 m² | 540 zł | 2,0 h | 111 zł | 80% |
| Doczyszczanie posadzek i fug: Doczyszczanie posadzki szorowarką jednotarczową, 200 m² | 2 000 zł | 7,7 h | 583 zł | 71% |
| Mycie kostki brukowej: Mycie ciśnieniowe, 100 m² | 1 500 zł | 7,7 h | 430 zł | 71% |
| Mycie elewacji: Brud atmosferyczny (kurz, osady), 150 m² | 3 675 zł | 11,5 h | 660 zł | 82% |
| Sprzątanie hal i magazynów: Zamiatanie maszynowe, 1000 m² | 300 zł | 1,8 h | 91 zł | 70% |

### Pozycje na jednostkę (bez przygotowania zlecenia)

| Usługa / pozycja | Cena | Czas | Koszt | Marża |
|---|---|---|---|---|
| Mycie okien: Okno 1-skrzydłowe | 30,00 zł/szt. | 15,0 min/szt. | 10,46 zł | 65% |
| Mycie okien: Okno 2-skrzydłowe | 42,00 zł/szt. | 22,0 min/szt. | 15,34 zł | 63% |
| Mycie okien: Okno balkonowe lub drzwi tarasowe | 50,00 zł/szt. | 25,0 min/szt. | 17,43 zł | 65% |
| AGD, szafki i balkon (tylko jako dodatek): Piekarnik (wnętrze) | 70,00 zł/szt. | 45,0 min/szt. | 31,37 zł | 55% |
| AGD, szafki i balkon (tylko jako dodatek): Lodówka (wnętrze) | 60,00 zł/szt. | 30,0 min/szt. | 20,92 zł | 65% |
| AGD, szafki i balkon (tylko jako dodatek): Mikrofalówka | 30,00 zł/szt. | 10,0 min/szt. | 6,97 zł | 77% |
| AGD, szafki i balkon (tylko jako dodatek): Okap | 50,00 zł/szt. | 25,0 min/szt. | 17,43 zł | 65% |
| AGD, szafki i balkon (tylko jako dodatek): Zmywarka | 55,00 zł/szt. | 20,0 min/szt. | 13,94 zł | 75% |
| AGD, szafki i balkon (tylko jako dodatek): Wnętrze szafki kuchennej | 10,00 zł/szt. | 5,0 min/szt. | 3,49 zł | 65% |
| AGD, szafki i balkon (tylko jako dodatek): Balkon (do ok. 5 m²) | 45,00 zł/szt. | 35,0 min/szt. | 24,40 zł | 46% |
| Pranie tapicerki: Kanapa 3-osobowa | 150,00 zł/szt. | 60,0 min/szt. | 51,83 zł | 65% |
| Pranie tapicerki: Kanapa 2-osobowa | 120,00 zł/szt. | 45,0 min/szt. | 39,37 zł | 67% |
| Pranie tapicerki: Narożnik | 160,00 zł/szt. | 75,0 min/szt. | 65,29 zł | 59% |
| Pranie tapicerki: Fotel | 50,00 zł/szt. | 25,0 min/szt. | 21,10 zł | 58% |
| Pranie dywanów i wykładzin: Dywan | 17,50 zł/m² | 6,0 min/m² | 5,18 zł | 70% |
| Pranie dywanów i wykładzin: Wykładzina | 15,00 zł/m² | 4,0 min/m² | 3,56 zł | 76% |
| Maszynowe mycie posadzek: Mycie szorowarką (beton, żywica, PCV) | 1,80 zł/m² | 0,2 min/m² | 0,24 zł | 87% ⚠ |
| Maszynowe mycie posadzek: Mycie płytek razem z fugami | 4,00 zł/m² | 1,0 min/m² | 1,06 zł | 73% |
| Doczyszczanie posadzek i fug: Doczyszczanie posadzki szorowarką jednotarczową | 10,00 zł/m² | 2,0 min/m² | 2,73 zł | 73% |
| Doczyszczanie posadzek i fug: Mechaniczne czyszczenie fug | 13,50 zł/m² | 5,0 min/m² | 5,82 zł | 57% |
| Doczyszczanie posadzek i fug: Usuwanie starych powłok (akryl, wosk) | 6,00 zł/m² | 2,4 min/m² | 3,51 zł | 41% |
| Doczyszczanie posadzek i fug: Zabezpieczenie powłoką (polimer, wosk, akryl) | 9,50 zł/m² | 1,5 min/m² | 3,45 zł | 64% |
| Doczyszczanie posadzek i fug: Usuwanie farby z posadzki | 15,00 zł/m² | 4,0 min/m² | 5,36 zł | 64% |
| Mycie kostki brukowej: Mycie ciśnieniowe | 15,00 zł/m² | 4,0 min/m² | 3,92 zł | 74% |
| Mycie kostki brukowej: Usuwanie mchu z fug i ponowne piaskowanie | 7,50 zł/m² | 4,0 min/m² | 4,02 zł | 46% |
| Mycie kostki brukowej: Usuwanie plam oleju | 5,50 zł/m² | 2,0 min/m² | 2,26 zł | 59% |
| Mycie kostki brukowej: Impregnacja bezbarwna (z materiałem 8,00 zł) | 29,50 zł/m² | 2,0 min/m² | 9,26 zł | 69% |
| Mycie kostki brukowej: Impregnacja z efektem mokrej kostki (z materiałem 12,00 zł) | 40,50 zł/m² | 2,4 min/m² | 13,51 zł | 67% |
| Mycie elewacji: Brud atmosferyczny (kurz, osady) | 24,50 zł/m² | 4,0 min/m² | 4,02 zł | 84% |
| Mycie elewacji: Glony, mech, pleśń | 38,50 zł/m² | 6,0 min/m² | 7,28 zł | 81% |
| Mycie elewacji: Sadza, smog, graffiti | 39,00 zł/m² | 7,5 min/m² | 9,10 zł | 77% |
| Sprzątanie hal i magazynów: Zamiatanie maszynowe | 0,40 zł/m² | 0,1 min/m² | 0,06 zł | 84% |
| Sprzątanie hal i magazynów: Odkurzanie posadzki | 1,00 zł/m² | 0,4 min/m² | 0,29 zł | 71% |
| Sprzątanie hal i magazynów: Utrzymanie hali (zamiatanie i odkurzanie), cena za wizytę | 0,55 zł/m² | 0,2 min/m² | 0,23 zł | 58% |
| Sprzątanie hal i magazynów: Sprzątanie kompleksowe jednorazowe | 7,00 zł/m² | 2,0 min/m² | 2,08 zł | 70% |

