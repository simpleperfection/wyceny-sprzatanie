# PLAN – aplikacja do wycen dla początkujących firm sprzątających

Status: **w realizacji** – zaakceptowany 2026-10-23. Etapy 1–4 **zakończone**: publiczne repo https://github.com/simpleperfection/wyceny-sprzatanie (gałąź `main`, commity z adresu noreply; etap 1 – `802f4e4`, etapy 2–3 – `5f48976`, etap 4 – `11a6a91`, `88bb839`, `abbaa59` i `fbd0dd9`). Baza chemii: 87 produktów od 7 dostawców (Kärcher pominięty decyzją właściciela); każda pozycja usług ma przypisane środki, a kosztu chemii z bazy nie liczymy (decyzja właściciela 2026-10-23). Poza etapami: w `.claude/` jest szablon workflow Claude Code (claude-code-starter, commity `75a6d07` i `941713d`), doctor daje `WYNIK: OK`. Brainstorm 2026-10-23 poszerzył zakres etapu 5 o funkcje dla początkujących firm (`docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`). **Następny krok:** `/dev-plan` dla etapu 5 (aplikacja PWA z funkcjami A–D z dokumentu wymagań).
Ostatnia aktualizacja: 2026-10-23

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
| Wzór ceny | **usługi z pomieszczeniami** (mieszkania, biura): czas = 30 min przygotowania + Σ m² × (norma pomieszczenia × mnożnik zakresu usługi + dodatek za brud wg poziomu 1–3), cena = czas / 60 × stawka zł/h województwa; **usługi z pozycjami** (okna, AGD, tapicerka, dywany, posadzki, kostka, elewacja, hale): ilość × cena krajowa × wsp województwa × próg metrażu (× poziom brudu). Do tego dodatki, dojazd i minimum zlecenia; wynik porównany z medianą rynkową. Pełne wzory w `data/normy.json` (`meta.wzor`, `meta.wzor_pozycji`) |
| Dane cen | własny skan firm lokalnych **+ średnie z porównywarek** (np. kb.pl) jako drugie źródło; firma może nadpisać swoje stawki |
| Zabrudzenie → chemia | kurz, sierść → środek uniwersalny; tłuszcz → zasadowy; kamień/osad → kwaśny; pleśń → chlorowy/grzybobójczy; pył budowlany → preparat poremontowy; szyby → płyn do szyb |
| GitHub | repo **publiczne** `simpleperfection/wyceny-sprzatanie` (darmowe GitHub Pages); Git i GitHub CLI zainstalowane przez winget, logowanie `gh auth login` robi właściciel (w osobnym oknie PowerShell) |
| Workflow Claude Code | szablon [claude-code-starter](https://github.com/AIBiz-Automatyzacje/claude-code-starter) w `.claude/` (pipeline `dev-*`, review, baza wiedzy); dla jego hooków i doctora doinstalowany Node.js 24 LTS; pluginy `dev-browser` (projekt) i `figma` (konto) zainstalowane – opis w `CLAUDE.md` |
| Dystrybutorzy chemii | listę 8 firm przygotowuje Claude (wg wielkości i dostępności kart SDS); lista zatwierdzona 2026-10-23 (Voigt zamiast Diversey) – `research/DYSTRYBUTORZY.md` |
| Podsumowanie kosztów | cena dla klienta **+ koszt firmy** (chemia, robocizna, sprzęt, dojazd) **i marża** w zł i % |
| Koszt chemii (2026-10-23) | **nie wyliczamy go z bazy chemii**, bo ceny i dozowanie są różne u każdego producenta; baza `data/chemia.json` służy tylko do doboru środków do usługi i brudu. W koszcie firmy zostaje szacunek z `data/ceny.json`, który firma może zmienić |
| Usługi w wersji 1 | mieszkanie: standard / gruntowne / po remoncie / po wynajmie; okna; tapicerka; dywany; **doczyszczanie; mycie posadzek; mycie kostki brukowej; mycie elewacji; sprzątanie biur; sprzątanie firm** (hale, magazyny, lokale usługowe) |
| Odbiorca i funkcje dla początkujących (brainstorm 2026-10-23) | aplikacja **publiczna** dla dowolnej początkującej firmy; wersja 1 zakłada firmę **jednoosobową** (sprząta właściciel). Do etapu 5 dochodzą: **A** cena minimalna z kosztów firmy (ZUS liczony na następnym progu, podatek, VAT, koszty stałe, kwota na rękę, godziny u klientów), **B** szybka wycena przez telefon (widełki) i pytania do klienta, **C** własne tempo (domyślnie 1,3× normy, potem z zapisanych czasów zleceń), **D** oferta jako link lub PDF z zakresem „wchodzi / nie wchodzi” i warunkami. Wymagania R1–R24 w `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md` |
| Cena proponowana | **wyższa z dwóch**: mediana rynku w województwie albo cena minimalna firmy; ostrzeżenie, gdy wychodzi ponad widełki rynku. Tempo zmienia koszt i cenę minimalną, nie cenę rynkową |
| Dane użytkownika | tylko w przeglądarce, z kopią do pliku; konta i synchronizacji na razie nie planujemy |

## Wyniki skanu cenników (etap 0)
- Pliki: `research/cenniki_firm.csv` (95 firm, z czego 80 ma ceny, każda z linkiem) i `research/srednie_wojewodztwa.csv`.
- Celu 20 firm z cennikiem na województwo nie da się osiągnąć: lokalne firmy z publicznym cennikiem to 3–7 na województwo, a w warmińsko-mazurskim są tylko pralnie tapicerki.
- Pominięte sieci działające w wielu miastach: Kastelnik, Vector, Reefa, CleanWhale, CzystaSprawa24, RentClean, Grupa VIP, Pranio.
- Mediany w Polsce po odrzuceniu 8 wartości odstających (szczegóły w `research/KALIBRACJA.md`): mieszkanie 50 m² **250 zł** (n=38) · po remoncie **11,75 zł/m²** (n=20) · okno **30 zł** (n=39) · kanapa 3-os. **150 zł** (n=23) · dywan **17,50 zł/m²** (n=14) · godzina **65 zł** (n=11). Większość cenników nie podaje, czy to kwoty netto czy brutto.
- Mnożniki z cenników: gruntowne ≈ 1,5× standard (mediana z 3 cenników: 1,56); po remoncie ≈ 2,4× standard za m² (11,75 wobec 5 zł/m²); silne zabrudzenie +30–50%.

## Ceny nowych usług (2026-10-23, początek etapu 2)
Pliki: `research/ceny_nowe_uslugi.csv` (każda cena ze źródłem i linkiem), `research/kb_wojewodztwa.csv` (16 województw) oraz opis źródeł w `research/ZRODLA.md`.
| Usługa | Typowe ceny |
|---|---|
| Mycie posadzek (bieżące, maszynowe) | duże powierzchnie 0,60–1,80 zł/m² netto; małe zlecenia od ok. 10 zł/m² (minimum 150–2000 zł) |
| Doczyszczanie (posadzki, fugi) | firmy 4–15 zł/m² netto; porównywarka ok. 20 zł/m² (16–25); fugi ok. 19 zł/m²; zabezpieczenie polimerem +6–10 zł/m² |
| Mycie kostki brukowej | 8–21 zł/m² (średnio ok. 17); mech +5–10, plamy olejowe +4–7; impregnacja 15–42 zł/m² (sama robocizna, bez impregnatu) |
| Mycie elewacji | brud atmosferyczny 22–29 zł/m² brutto; biologiczny (glony, mech) 34–43; chemiczny (sadza, graffiti) 33–45 |
| Sprzątanie biur | jednorazowo do 100 m² ok. 390 zł brutto (kb.pl, niespójne z jego stawką godzinową); abonament 2,80–7,00 zł/m²/mies.; minimum ok. 1200 zł/mies. (1 źródło) |
| Sprzątanie firm (hale, magazyny) | za wizytę: zamiatanie maszynowe 0,40, odkurzanie 1,00 zł/m²; utrzymanie 1,80–3,00 zł/m² miesięcznie (ok. 0,55 zł/m² za wizytę przy sprzątaniu raz w tygodniu); jednorazowo ok. 7 zł/m² (3–9) |
| AGD i dodatki | piekarnik 70, lodówka 60, mikrofalówka 30, okap 50, zmywarka 55 zł; wnętrze szafki 10 zł/szt.; balkon 45 zł; dojazd 1,40–3,00 zł/km |
| Koszt robocizny firmy | płaca minimalna 2026: 31,40 zł/h na zleceniu (37,83 zł/h z ZUS pracodawcy); średnia GUS w sekcji N: 31–44 zł/h brutto zależnie od województwa |

Wnioski:
- Typy brudu na elewacji (atmosferyczny / biologiczny / chemiczny) mają osobne ceny rynkowe, więc w danych są osobnymi pozycjami usługi „mycie elewacji”, a nie dodatkiem za brud jak przy pomieszczeniach.
- Dla posadzek, kostki, elewacji i hal cena za m² mocno spada z metrażem, więc są progi metrażu. W biurach zamiast tego rośnie wydajność (szybciej na m² od 300 i od 1000 m²).

## Dane i normy (etapy 2–3, 2026-10-23)
| Plik | Zawartość | Jak powstaje |
|---|---|---|
| `data/ceny.json` | 14 usług, 35 pozycji z ceną, zakresem, pewnością i źródłem; progi metrażu, poziomy brudu, koszty firmy (praca, chemia, sprzęt, dojazd) | ręcznie, z plików `research/` |
| `data/rynek.json` | mediany krajowe, współczynnik i stawka godzinowa 16 województw, płaca GUS | `scripts/kalibracja.ps1` |
| `data/normy.json` | normy min/m² pomieszczeń i brudu, czasy pozycji, czas przygotowania, progi wydajności biur | `scripts/kalibracja.ps1` |
| `research/KALIBRACJA.md` | raport: model a rynek, województwa, marże | `scripts/kalibracja.ps1` |

Uruchomienie po zmianie danych: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\kalibracja.ps1`.

Usługi w danych (`id` w `data/ceny.json`):
| Usługa | `id` | Tryb |
|---|---|---|
| Mieszkanie lub dom: standard / gruntowne / po remoncie / po wynajmie | `mieszkanie_standard`, `mieszkanie_gruntowne`, `mieszkanie_po_remoncie`, `mieszkanie_po_wynajmie` | pomieszczenia (mnożnik zakresu 1,0 / 1,55 / 1,55 + pył budowlany / 1,3 + tłuszcz i kamień) |
| Sprzątanie biur i lokali usługowych (sklep, gabinet) | `sprzatanie_biur` | pomieszczenia; jednorazowo albo abonament 1×, 2×, 3× lub 5× w tygodniu |
| Mycie okien | `okna` | pozycje (okno 1-skrz., 2-skrz., balkonowe) |
| AGD, szafki, balkon | `agd` | pozycje, tylko jako dodatek |
| Pranie tapicerki | `tapicerka` | pozycje (kanapa 2- i 3-os., narożnik, fotel) |
| Pranie dywanów i wykładzin | `dywany` | pozycje za m² |
| Maszynowe mycie posadzek | `mycie_posadzek` | pozycje za m², progi „maszynowe” |
| Doczyszczanie posadzek i fug | `doczyszczanie` | pozycje za m², progi „maszynowe”, poziomy brudu |
| Mycie kostki brukowej | `mycie_kostki` | pozycje za m², progi „zewnętrzne”; impregnat doliczany klientowi |
| Mycie elewacji | `mycie_elewacji` | pozycje za m² wg rodzaju brudu, progi „zewnętrzne” |
| Sprzątanie hal i magazynów | `sprzatanie_firm` | pozycje za m², progi „maszynowe”, poziomy brudu |

Ustawienia domyślne (właściciel może je zmienić w aplikacji):
- Progi metrażu: maszynowe do 100 m² ×1,3 · 100–500 ×1,0 · 500–2000 ×0,7 · od 2000 ×0,5; zewnętrzne do 50 m² ×1,15 · 50–300 ×1,0 · od 300 ×0,9. Poziomy brudu w usługach z pozycjami: ×1,0 / 1,2 / 1,4.
- Minimum zlecenia: 150 zł (dom, okna, tapicerka, dywany, biura), 300 zł (usługi maszynowe i zewnętrzne).
- Koszty firmy: praca 37,83 zł/h; chemia 4 zł na godzinę pracy (szacunek, firma może go zmienić; z bazy chemii go nie wyliczamy); sprzęt 5–25 zł/h zależnie od maszyny; dojazd: klient 2 zł/km poza promieniem 10 km, koszt firmy 1,15 zł/km (kilometrówka).

Najważniejsze wyniki:
- Punkty kalibracji (mediany skanu): **65 zł/h**, **mieszkanie 50 m² = 250 zł** (3,8 h pracy), **po remoncie 11,75 zł/m²**. Model trafia w nie z dokładnością do 1%, gruntowne wychodzi 1,48× standard.
- Normy: pokój 2,63 · kuchnia 6,83 · łazienka 11,56 min/m²; pył budowlany (poziom 2) +4 min/m²; kurz na poziomie 3 wydłuża pracę o 41% (rynek: +30–50%).
- Wzrost ceny z metrażem: zgodny z cennikiem Czyściutko (1,36× przy 55 m² wobec 35 m²); Kwik rośnie szybciej, a kb.pl wolniej, więc model leży pomiędzy.
- Współczynnik województwa łączy nasz skan (waga = liczba firm) z kb.pl (waga 5 firm): od 0,80 (świętokrzyskie) do 1,16 (wielkopolskie); stawki 52–75,50 zł/h. Mazowieckie wychodzi 1,00 (w skanie są 4 firmy z Warszawy i 2 z Radomia).
- Marża brutto na zleceniu przy płacy minimalnej (37,83 zł/h z ZUS pracodawcy): mieszkania 36%, okna/tapicerka/dywany 57–65%, usługi maszynowe 70–82% (bez kosztu zakupu sprzętu i auta).

Do weryfikacji na pierwszych zleceniach (pewność „niska” w danych):
- sprzątanie po wynajmie (brak danych rynkowych, przyjęto 1,49× standard);
- duże biura przy częstym sprzątaniu: model jest powyżej widełek CleanConnect;
- czasy pozycji i wydajności maszyn (m²/h), koszt sprzętu i chemii (szacunki, które firma może zmienić);
- „doczyszczanie” przyjęto jako doczyszczanie posadzek i fug (szorowarka, usuwanie powłok, zabezpieczenie) – patrz „Otwarte pytania”.

## Etapy prac (po akceptacji)
1. ✅ **Repozytorium**: `git init`, `.gitignore`, pierwszy commit, publiczne repo na GitHubie, wypchnięcie kodu (commit `802f4e4`).
2. ✅ **Dane cen**: średnie z porównywarek i skanu dla 16 województw → `data/ceny.json` i `data/rynek.json` (źródło przy każdej cenie). Ceny krajowe × współczynnik województwa, który łączy skan firm (wszystkie kolumny cennika, waga = liczba firm) z indeksem kb.pl (commit `5f48976`).
3. ✅ **Normy czasu pracy**: normy min/m² pomieszczeń i brudu → `data/normy.json`, skalibrowane tak, żeby mieszkanie 50 m² i sprzątanie po remoncie zgadzały się z medianą rynkową; raport `research/KALIBRACJA.md` (commit `5f48976`).
4. ✅ **Baza chemii**: produkty i karty charakterystyki (SDS) od 8 dystrybutorów → `data/chemia.json` (nazwa, przeznaczenie, pH, rozcieńczenie, cena, link do SDS). Baza służy **tylko do doboru środków do usługi i brudu**. Kosztu chemii z niej nie liczymy, bo ceny i dozowanie są różne u każdego producenta (decyzja właściciela 2026-10-23). W koszcie firmy zostaje szacunek z `data/ceny.json` (chemia 4 zł/h, impregnat 8–12 zł/m²), który firma może zmienić.
   - Zatwierdzone 2026-10-23: Tenzi, Merida, Clinex (Amtra), Kärcher, Kiehl, Medi-Sept, Buzil, Voigt (właściciel wybrał Voigt zamiast Diversey/TASKI; Diversey jest pierwszą rezerwą). Kärchera właściciel kazał potem pominąć (2026-10-23). Uzasadnienie, odrzuceni i sposób zbierania produktów w `research/DYSTRYBUTORZY.md`.
   - Polskie karty SDS bez zastrzeżeń ma 6 pierwszych firm. Voigt ma publiczne karty przy produktach w sklepie (sprawdzone 2026-10-23). U Buzila dostęp do kart trzeba potwierdzić. Publiczne ceny mają Tenzi, Merida i Voigt, więc pozostałe ceny weźmiemy z jednego wskazanego sklepu internetowego (pewność „średnia”).
   - Zebrane 2026-10-23 (`data/chemia.json`): Tenzi 16, Merida 11, Clinex 14 (ceny z hurtowniachemiczna.com), Voigt 14 – razem 55 produktów. Każdy ma cenę netto i brutto ze źródłem, pH (opis producenta albo sekcja 9 karty SDS), stężenia robocze i link do karty SDS z datą; wszystkie linki sprawdzone. Clinex podaje dodatkowo stężenia dla 3 poziomów brudu i wydajność 4 m² na litr roztworu (z kalkulatora na stronie producenta).
   - Zebrane 2026-10-23 (druga tura, commit `abbaa59`): Kiehl 10 i Medi-Sept 10 (ceny z sklep.miwa.net.pl), Buzil 12 (ceny z higienagpt.pl) – razem 87 produktów. Kärcher **pominięty** decyzją właściciela (2026-10-23). Parsery stron producentów: `scripts/chemia/{kiehl,medisept,buzil}.pl`. Kiehl i Medi-Sept 142 podają zużycie w ml/m² (nowe pole `zuzycie`). Buzil nie ma stałych linków do kart (formularz POST), więc `sds.url` to strona produktu, a `sds.plik` – nazwa pliku karty; pH w jego kartach to zwykle „nie dotyczy” (`ph: null`).
   - 16 kategorii środków powiązanych z brudem z `normy.json` i pozycjami z `ceny.json`. Luki zamknięte: powłoki (5 środków), poremontowe (5). Zostały: impregnat do kostki ma 1 środek (Kiehl Impran, do kamienia naturalnego i sztucznego – na kostce sprawdzić na próbce), biobójcze na zewnątrz – 2, zewnętrzne – 3.
   - Domknięcie 2026-10-23 (commit `fbd0dd9`): każda pozycja usług z `data/ceny.json` ma kategorię środków albo wpis w `bez_kategorii`. Dopisane: lodówka, szafka i balkon → uniwersalny; zmywarka → zasadowy i kwasowy. Bez kategorii: zamiatanie i odkurzanie (na sucho) oraz usuwanie farby (w bazie nie ma zmywacza farb). Dezynfekcja nie jest przypisana do brudu ani pozycji. Wszystkie 174 linki (ceny i karty SDS) działają.
5. **Aplikacja PWA**: kreator z paskiem postępu (usługa → województwo → pomieszczenia i brud → dodatki → chemia → podsumowanie kosztów), zapis wycen w przeglądarce, eksport do PDF lub linku. Silnik wyceny w JS ma dawać te same wyniki co scenariusze z `research/KALIBRACJA.md`.
   - Do tego funkcje dla początkujących A–D (cena minimalna, szybka wycena, własne tempo, oferta z zakresem) wg `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`. Planowanie przez `/dev-plan`. Chemia w cenie minimalnej to szacunek z `data/ceny.json`, który firma może zmienić.
6. **Testy i publikacja** na GitHub Pages.
7. **Zdobywanie klientów** (po wersji 1): cennik z własnych stawek do publikacji, szablony odpowiedzi na zapytania (Fixly, Oferteo, komunikatory), lista wysłanych ofert z przypomnieniem o kontakcie, lista startowa (wizytówka Google, OC z klauzulą o mieniu powierzonym, polecenia).
8. **Bezpieczeństwo chemii** (po wersji 1): czego nie mieszać i jakie środki ochrony, z kart SDS w `data/chemia.json`.

## Środowisko
- Windows 11, PowerShell 5.1; Git 2.55, GitHub CLI 2.103 i Node.js 24 LTS (winget; Node od 2026-10-23 dla szablonu `.claude/`). Brak Pythona – skrypty danych są w PowerShellu (`scripts/kalibracja.ps1`, zapisany jako UTF-8 z BOM).
- Git Bash ma `perl` z `JSON::PP` i `pdftotext`; w Perlu są pomocnicze parsery stron dostawców chemii (`scripts/chemia/`).
- Aplikacja będzie w czystym HTML/JS, bez kroku budowania.

## Otwarte pytania
1. **„Doczyszczanie”**: czy chodzi o doczyszczanie posadzek i fug (tak jest teraz w danych), czy też o inne usługi, np. doczyszczanie mieszkań lub obiektów po budowie?
