# PLAN – aplikacja do wycen dla początkujących firm sprzątających

Status: **w realizacji** – zaakceptowany 2026-10-23. Etapy 1–3 **zakończone**: publiczne repo https://github.com/simpleperfection/wyceny-sprzatanie (gałąź `main`, commity z adresu noreply), dane cen (`data/ceny.json`, `data/rynek.json`) i skalibrowane normy czasu (`data/normy.json`). Następny: etap 4 – lista 8 dystrybutorów chemii do zatwierdzenia.
Data: 2026-10-23

## Cel
Narzędzie dla właściciela małej firmy sprzątającej:
1. **Wycena**: wybór usługi → pomieszczenia i typy zabrudzeń → cena dla klienta, uwzględniająca stawki w danym województwie.
2. **Dobór chemii**: na podstawie zaznaczonych zabrudzeń lista środków (z kartami charakterystyki) od największych dystrybutorów w Polsce.
3. Na każdym etapie widać pasek postępu, a na końcu podsumowanie kosztów.

## Ustalenia (2026-10-23)
| Temat | Decyzja |
|---|---|
| Użytkownik | właściciel firmy sprzątającej |
| Forma | aplikacja webowa PWA (telefon i komputer), kod na GitHubie, hosting GitHub Pages |
| Metoda wyceny | **B: lista pomieszczeń i typów brudu** (kuchnia, łazienka, pokój, okna…; brud: kurz, tłuszcz, kamień, pył budowlany, sierść, pleśń; intensywność 1–3) |
| Wzór ceny | usługi z pomieszczeniami: czas = 30 min przygotowania + Σ m² × (norma pomieszczenia × mnożnik zakresu + dodatek za brud wg poziomu 1–3), cena = czas / 60 × stawka zł/h województwa + dodatki (okna, AGD, tapicerka, dywany); usługi z pozycjami (posadzki, kostka, elewacja, hale): m² × cena krajowa × wsp województwa × próg metrażu (× poziom brudu); wynik porównany z medianą rynkową. Szczegóły w `data/normy.json` (pole `meta.wzor`) |
| Dane cen | własny skan firm lokalnych **+ średnie z porównywarek** (np. kb.pl) jako drugie źródło; firma może nadpisać swoje stawki |
| Zabrudzenie → chemia | tłuszcz → środek zasadowy; kamień/osad → kwaśny; pleśń → chlorowy/grzybobójczy; pył budowlany → preparat poremontowy; szyby → płyn do szyb |
| GitHub | repo **publiczne** (darmowe GitHub Pages); Git i GitHub CLI instalowane przez winget, logowanie `gh auth login` robi właściciel |
| Dystrybutorzy chemii | listę 8 firm przygotowuje Claude (wg wielkości i dostępności kart SDS); lista do zatwierdzenia przed zbieraniem produktów |
| Podsumowanie kosztów | cena dla klienta **+ koszt firmy** (chemia, robocizna, dojazd) **i marża** w zł i % |
| Usługi w wersji 1 | mieszkanie: standard / gruntowne / po remoncie / po wynajmie; okna; tapicerka; dywany; **doczyszczanie; mycie posadzek; mycie kostki brukowej; mycie elewacji; sprzątanie biur; sprzątanie firm** (hale, magazyny, lokale usługowe) |

## Wyniki skanu cenników (etap 0)
- Pliki: `research/cenniki_firm.csv` (95 firm, z czego 80 ma ceny, każda z linkiem) i `research/srednie_wojewodztwa.csv`.
- Celu 20 firm z cennikiem na województwo nie da się osiągnąć: lokalne firmy z publicznym cennikiem to 3–7 na województwo, a w warmińsko-mazurskim są tylko pralnie tapicerki.
- Pominięte sieci działające w wielu miastach: Kastelnik, Vector, Reefa, CleanWhale, CzystaSprawa24, RentClean, Grupa VIP, Pranio.
- Średnio w Polsce (brutto): mieszkanie 50 m² ok. 250 zł · po remoncie ok. 12 zł/m² · okno ok. 30 zł · kanapa 3-os. ok. 155 zł · dywan ok. 17 zł/m² · godzina ok. 65 zł.
- Mnożniki wzięte z cenników: gruntowne ≈ 1,5× standard; po remoncie ≈ 3× standard za m²; silne zabrudzenie +30–50%.

## Ceny nowych usług (2026-10-23, początek etapu 2)
Pliki: `research/ceny_nowe_uslugi.csv` (każda cena ze źródłem i linkiem), `research/kb_wojewodztwa.csv` (16 województw) oraz opis źródeł w `research/ZRODLA.md`.
| Usługa | Typowe ceny |
|---|---|
| Mycie posadzek (bieżące, maszynowe) | duże powierzchnie 0,60–1,80 zł/m² netto; małe zlecenia od ok. 10 zł/m² (minimum 150–2000 zł) |
| Doczyszczanie (posadzki, fugi) | firmy 4–15 zł/m² netto; porównywarka ok. 20 zł/m² (16–25); fugi ok. 19 zł/m²; zabezpieczenie polimerem +6–10 zł/m² |
| Mycie kostki brukowej | 8–21 zł/m² (średnio ok. 17); mech +5–10, plamy olejowe +4–7; impregnacja 15–42 zł/m² |
| Mycie elewacji | brud atmosferyczny 22–29 zł/m² brutto; biologiczny (glony, mech) 34–43; chemiczny (sadza, graffiti) 33–45 |
| Sprzątanie biur | jednorazowo do 100 m² ok. 390 zł brutto; abonament 2,80–7,00 zł/m²/mies.; minimum ok. 1200 zł/mies. |
| Sprzątanie firm (hale, magazyny) | utrzymanie 0,40–3,00 zł/m²; jednorazowo ok. 7 zł/m² (3–9) |
| Koszt robocizny firmy | płaca GUS w sekcji N: 31–44 zł/h brutto zależnie od województwa |

Wniosek: typy brudu z elewacji (atmosferyczny / biologiczny / chemiczny) pasują do metody B, więc w kreatorze będą tak samo jak przy pomieszczeniach. Dla posadzek, biur i hal cena mocno spada z metrażem, więc potrzebne są progi metrażu.

## Dane i normy (etapy 2–3, 2026-10-23)
| Plik | Zawartość | Jak powstaje |
|---|---|---|
| `data/ceny.json` | 14 usług, 35 pozycji z ceną, zakresem, pewnością i źródłem; progi metrażu, poziomy brudu, koszty firmy (praca, chemia, sprzęt, dojazd) | ręcznie, z plików `research/` |
| `data/rynek.json` | mediany krajowe, współczynnik i stawka godzinowa 16 województw, płaca GUS | `scripts/kalibracja.ps1` |
| `data/normy.json` | normy min/m² pomieszczeń i brudu, czasy pozycji, czas przygotowania | `scripts/kalibracja.ps1` |
| `research/KALIBRACJA.md` | raport: model a rynek, województwa, marże | `scripts/kalibracja.ps1` |

Uruchomienie po zmianie danych: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\kalibracja.ps1`.

Najważniejsze wyniki:
- Punkty kalibracji (mediany skanu): **65 zł/h**, **mieszkanie 50 m² = 250 zł** (3,8 h pracy), **po remoncie 11,75 zł/m²**. Model trafia w nie z dokładnością do 1%, gruntowne wychodzi 1,48× standard.
- Normy: pokój 2,63 · kuchnia 6,83 · łazienka 11,56 min/m²; pył budowlany (poziom 2) +4 min/m²; kurz na poziomie 3 wydłuża pracę o 41% (rynek: +30–50%).
- Współczynnik województwa łączy nasz skan (waga = liczba firm) z kb.pl (waga 5 firm): od 0,80 (świętokrzyskie) do 1,16 (wielkopolskie); stawki 52–75,50 zł/h.
- Marża brutto na zleceniu przy płacy minimalnej (37,83 zł/h z ZUS pracodawcy): mieszkania 36%, okna/tapicerka/dywany 57–65%, usługi maszynowe 70–82% (bez kosztu zakupu sprzętu i auta).

Do weryfikacji na pierwszych zleceniach (pewność „niska” w danych):
- sprzątanie po wynajmie (brak danych rynkowych, przyjęto 1,49× standard);
- duże biura przy częstym sprzątaniu: model jest powyżej widełek CleanConnect;
- czasy pozycji i wydajności maszyn (m²/h), koszt sprzętu i chemii (chemia zostanie zastąpiona cenami produktów z etapu 4);
- „doczyszczanie” przyjęto jako doczyszczanie posadzek i fug (szorowarka, usuwanie powłok, zabezpieczenie).

## Etapy prac (po akceptacji)
1. ✅ **Repozytorium**: `git init`, `.gitignore`, pierwszy commit, publiczne repo na GitHubie, wypchnięcie kodu.
2. ✅ **Dane cen**: uzupełnienie o średnie z porównywarek dla 16 województw → `data/ceny.json` (źródło i data przy każdej liczbie). Nowe usługi (doczyszczanie, posadzki, kostka, elewacja, biura, firmy) mają mało lokalnych cenników, więc dla nich: średnia krajowa z porównywarek × współczynnik województwa wyliczony ze stawek godzinowych i cen mieszkań.
3. ✅ **Normy czasu pracy**: tabela min/m² dla typów brudu, skalibrowana tak, żeby dla mieszkania 50 m² wynik zgadzał się z medianą rynkową.
4. **Baza chemii**: produkty i karty charakterystyki (SDS) od 8 dystrybutorów → `data/chemia.json` (nazwa, przeznaczenie, pH, rozcieńczenie, cena, link do SDS).
5. **Aplikacja PWA**: kreator z paskiem postępu (usługa → województwo → pomieszczenia i brud → dodatki → chemia → podsumowanie kosztów), zapis wycen w przeglądarce, eksport do PDF lub linku.
6. **Testy i publikacja** na GitHub Pages.

## Otwarte pytania
Brak – wszystkie rozstrzygnięte 2026-10-23 (patrz „Ustalenia”). Repo: `simpleperfection/wyceny-sprzatanie`.
