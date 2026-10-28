# PLAN – aplikacja do wycen dla początkujących firm sprzątających

Status: **w realizacji** – zaakceptowany 2026-10-23. Etapy 1–4 **zakończone**: publiczne repo https://github.com/simpleperfection/wyceny-sprzatanie (gałąź `main`, commity z adresu noreply; etap 1 – `802f4e4`, etapy 2–3 – `5f48976`, etap 4 – `11a6a91`, `88bb839`, `abbaa59` i `fbd0dd9`). Baza chemii: 87 produktów od 7 dostawców (Kärcher pominięty decyzją właściciela); każda pozycja usług ma przypisane środki, a kosztu chemii z bazy nie liczymy (decyzja właściciela 2026-10-23). Poza etapami: w `.claude/` jest szablon workflow Claude Code (claude-code-starter, commity `75a6d07` i `941713d`), doctor daje `WYNIK: OK`. Brainstorm 2026-10-23 poszerzył zakres etapu 5 o funkcje dla początkujących firm (`docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`); 2026-10-24 właściciel wyciął z nich cenę minimalną z kosztów firmy (blok A) i zaliczkę w warunkach oferty. **Etap 5 zaplanowany** (2026-10-24, `/dev-plan`): plan techniczny `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md` (6 faz, 24 jednostki), zadanie dla autopilota w `docs/active/etap-5-aplikacja-wyceny/` na gałęzi `feature/etap-5-aplikacja-wyceny` (commit `3d3f0e5`), makiety jako PNG ze specyfikacją w `docs/plans/etap-5-aplikacja-wyceny-figma/`, checklista `docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md`. Środowisko E2E gotowe 2026-10-24 (plik `.env.e2e`, `agent-browser` 0.39.2 z Chrome 156, doctor: OK). Maszyneria E2E szablonu ma poprawki dla Windows (`1438f9d`, `ca885e1`; opis w `CLAUDE.md`), a workflowy włącza `.claude/settings.local.json`, bo na planie Pro są domyślnie wyłączone. Pytania do klienta (`data/pytania.json`) i zakresy prac (`data/zakresy.json`) właściciel zatwierdził bez zmian (`d77ba37`), więc checklista nie ma już blokerów. **Etap 5 zbudowany** (2026-10-24 – 2026-10-27, autopilot w kilku runach przerywanych limitami planu Pro): 6 faz i 24 jednostki, każda faza po review, poprawkach i kontroli poprawek, testy 813/813, typecheck bez błędów; zadanie zarchiwizowane w `docs/completed/etap-5-aplikacja-wyceny/` (`7fafed0`, czubek gałęzi `b785429`). Po smoke'u (2026-10-28) wdrożone decyzje właściciela i założenia planu (`c7d52b5`, `5f293f3`; testy 831/831), przy okazji naprawione ponowne otwieranie zapisanej szybkiej wyceny okien, tapicerki i dywanów. Gałąź wypchnięta na GitHub 2026-10-28 (bez PR), jeszcze nie scalona z `main`. **Następny krok:** smoke operatora `docs/operator/2026-10-27-etap-5-aplikacja-wyceny-smoke.md` (decyzje właściciela, założenia planu, punkty na komputerze i porównania z makietami zrobione 2026-10-28; zostały punkty na telefonie, które potrzebują adresu HTTPS, więc najprościej po publikacji w etapie 6) i pull request w dwóch częściach: `/clear`, potem `/dev-pr --czesc 1` (fazy 1–3), po merge'u `/dev-pr --czesc 2` (fazy 4–6). Bramki domknięcia fazy uruchamiają narzędzia na Windows od `13a2a27` (opis w `CLAUDE.md`). Bez blokowania: potwierdzenie stawki VAT na sprzątanie, ceny usługi „doczyszczanie mieszkań i obiektów po budowie”, ikona aplikacji (na razie zastępcza).
Ostatnia aktualizacja: 2026-10-28

## Cel
Narzędzie dla właściciela małej firmy sprzątającej:
1. **Wycena**: wybór usługi → pomieszczenia i typy zabrudzeń → cena dla klienta, uwzględniająca stawki w danym województwie.
2. **Dobór chemii**: na podstawie zaznaczonych zabrudzeń lista środków (z kartami charakterystyki) od największych dystrybutorów w Polsce.
3. Na każdym etapie widać pasek postępu, a na końcu podsumowanie kosztów.

## Ustalenia (2026-10-23 – 2026-10-28)
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
| Podsumowanie kosztów | cena dla klienta **+ koszt zlecenia** (czas pracy, chemia, sprzęt, dojazd) i zdanie „zostaje dla Ciebie X zł, czyli Y zł za godzinę pracy” zamiast marży w % (R9 z brainstormu, bez celu godzinowego – potwierdzone 2026-10-24) |
| Koszt chemii (2026-10-23) | **nie wyliczamy go z bazy chemii**, bo ceny i dozowanie są różne u każdego producenta; baza `data/chemia.json` służy tylko do doboru środków do usługi i brudu. W koszcie firmy zostaje szacunek z `data/ceny.json`, który firma może zmienić |
| Usługi w wersji 1 | mieszkanie: standard / gruntowne / po remoncie / po wynajmie; okna; tapicerka; dywany; **doczyszczanie; mycie posadzek; mycie kostki brukowej; mycie elewacji; sprzątanie biur; sprzątanie firm** (hale, magazyny, lokale usługowe) |
| Odbiorca i funkcje dla początkujących (brainstorm 2026-10-23) | aplikacja **publiczna** dla dowolnej początkującej firmy; wersja 1 zakłada firmę **jednoosobową** (sprząta właściciel). Do etapu 5 dochodzą: ~~**A** cena minimalna z kosztów firmy~~ (wycięta 2026-10-24 decyzją właściciela: bez ZUS, podatku dochodowego, kosztów stałych, kwoty na rękę i godzin u klientów; z ustawień podatkowych zostaje tylko status VAT), **B** szybka wycena przez telefon (widełki) i pytania do klienta, **C** własne tempo (domyślnie 1,3× normy, potem z zapisanych czasów zleceń), **D** oferta jako link lub PDF z zakresem „wchodzi / nie wchodzi” i warunkami. Wymagania R1–R24 w `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md` |
| Cena proponowana (2026-10-24) | **cena rynkowa**: mediana w województwie z modelu wyceny, z widełkami rynku; właściciel może ją zmienić ręcznie. Czynny podatnik VAT widzi cenę brutto z kwotą netto obok. Tempo zmienia czas pracy i to, co zostaje dla właściciela, nie cenę (wcześniej: wyższa z ceny rynkowej i minimalnej) |
| Dane użytkownika | tylko w przeglądarce, z kopią do pliku; konta i synchronizacji na razie nie planujemy |
| Makiety etapu 5 (2026-10-23) | projektuje Claude w Figmie, właściciel akceptuje każdy ekran; plik [Wyceny sprzątania – etap 5, szkice](https://www.figma.com/design/sDtiv6VdCbpyfM6Gfs7Xej). Bazą jest **wersja 3** (inspirowana Jobberem i Housecall Pro: start „do zrobienia”, przycisk „+”, wycena jako lista pozycji, oferta jak dokument). Konto Figma: plan Starter, miejsce View – do 20 odczytów przez MCP miesięcznie, więc odczyty oszczędzamy. 2026-10-24: makiety 14 ekranów na stronie „Makiety etapu 5” (główny stan zaakceptowany przez właściciela), kolory w zmiennych „Kolory v3” (barwy marki = zmiana wartości zmiennych). Tego dnia wyczerpał się miesięczny limit: `use_figma` też się wlicza |
| Marka (2026-10-23) | barwy i logo **Simple Perfection** w całej aplikacji; oferta dla klienta pokazuje firmę, która korzysta z aplikacji. Nazwa robocza „Wyceny sprzątania” (właściciel bez preferencji). Logo i barwy dołożymy później, makiety na razie w kolorach wersji 3 (2026-10-24) |
| Doczyszczanie, farba, dezynfekcja (2026-10-23) | „doczyszczanie” = posadzki i fugi **oraz** nowa usługa: doczyszczanie mieszkań i obiektów po budowie (ceny do zebrania); usuwanie farby bez podpowiedzi środka; dezynfekcja do ręcznego dodania przy każdej usłudze |
| Plan etapu 5 (2026-10-24, `/dev-plan`) | cały etap w jednym planie, 6 faz: silnik wyceny, dane w przeglądarce, szkielet i ustawienia, kreator dokładnej wyceny, zlecenia z szybką wyceną i pytaniami, oferta. Narzędzia: testy `node --test` i typy TypeScript z komentarzy (`checkJs`); jedyna zależność deweloperska to `typescript`, aplikacja zostaje bez kroku budowania. Wygląd: układ z makiet wersji 3, kolory, font i zaokrąglenia **wariantu B** („kartka i długopis”); bez `docs/DESIGN.md`, tokeny są w `SPEC.md` makiet |
| VAT i szybka wycena (2026-10-24) | czynny podatnik VAT: usługi domowe (cena rynkowa brutto) → netto = mediana / 1,23; usługi dla firm z ceną netto (biura, posadzki, doczyszczanie, hale) → 23% VAT doliczone na górze; „zostaje dla Ciebie” liczone od netto. Szybka wycena: stan **typowy = mediana** (widełki od poziomu 1 do 2 kurzu), mocny – od 2 do 3, lekki – ok. mediana |
| Treści do zatwierdzenia (2026-10-24) | pytania do klienta (`data/pytania.json`) i zakresy „wchodzi / nie wchodzi” (`data/zakresy.json`) szkicuje Claude w osobnej sesji, a właściciel zatwierdza; autopilot czeka na nie przed fazą 5 i 6 |
| Warunki oferty (2026-10-24) | bezpłatne odwołanie do 24 h przed terminem (później 50%), brak dostępu do lokalu 50%, zdjęcia przed i po, zastrzeżenie o stanie lokalu przy szybkiej wycenie, ważność 14 dni; **bez zaliczki**, bo w praktyce się jej nie stosuje |
| Decyzje ze smoke'a etapu 5 (2026-10-28) | aneks kuchenny liczony **jak osobna kuchnia** (16% metrażu w granicach 6–14 m²), bo praca w kuchni to fronty, blat, zlew i AGD, a nie podłoga: mieszkanie 50 m² z aneksem kosztuje w szybkiej wycenie 250–300 zł, a nie 230–290 zł. Potwierdzone bez zmian: koszt dojazdu firmy tam i z powrotem, widełki rynku mieszkań bez minimum zlecenia (50 m²: 120–450 zł) i domyślne warunki oferty. Pigułka na ekranie kopii mówi „N wykonanych zleceń”, bo liczy wpisy czasu pracy, a nie wyceny przyjęte |
| Założenia planu spoza smoke'a (2026-10-28) | okna, tapicerka i dywany w szybkiej wycenie: górna granica widełek **cena × 1,2**, a gdy klient potwierdzi trudne plamy (tapicerka, dywany) albo farbę i klej na szybach (okna) — **cena × 1,4** (skutek `gorna_granica` w `data/pytania.json`; kanapa 3-osobowa 150–180 zł, z plamami 150–210 zł; według rynku mocne zabrudzenie to +30–50%). Wycena dokładna bez zmian. Potwierdzone bez zmian: własne tempo od 3 zleceń z medianą ostatnich 10 (tempo zmienia czas pracy i „zostaje na godzinę”, a nie cenę) i mediana krajowa (65 zł/h, współczynnik 1,0) w wycenie bez województwa |
| Adres aplikacji (2026-10-28) | **subdomena firmy** na GitHub Pages, roboczo `wyceny.simple-perfection.pl` (pasuje do marki Simple Perfection). Własna domena oddziela dane w przeglądarce od innych stron Pages konta, a linki ofert przetrwają ewentualną zmianę hostingu. W etapie 6: wpis CNAME u rejestratora domeny, własna domena i HTTPS w ustawieniach Pages repo |

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
   - Do tego funkcje dla początkujących (szybka wycena, własne tempo, oferta z zakresem; cenę minimalną z kosztów firmy właściciel wyciął 2026-10-24) wg `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`. Chemia w koszcie zlecenia to szacunek z `data/ceny.json`, który firma może zmienić.
   - Zaplanowane 2026-10-24 (`/dev-plan`, commit `3d3f0e5` na gałęzi `feature/etap-5-aplikacja-wyceny`): plan `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`, zadanie `docs/active/etap-5-aplikacja-wyceny/`. Fazy: 1) narzędzia i silnik wyceny (parytet ze scenariuszami kalibracji przez nowy plik `research/kalibracja-scenariusze.json`), 2) dane w przeglądarce, kopia i własne tempo, 3) szkielet aplikacji, start, ustawienia, kopia i PWA, 4) kreator dokładnej wyceny z chemią i podsumowaniem, 5) zakończenie zlecenia, szybka wycena i pytania do klienta, 6) oferta (link i PDF). Pull request w dwóch częściach (fazy 1–3 i 4–6).
   - Przygotowanie do autopilota (2026-10-24): środowisko E2E (`b903268`); poprawki maszynerii E2E szablonu dla Windows, czyli próbny zrzut przeglądarki bez potoków, serwer przez `Get-Process` i `taskkill` bez `cmd.exe`, odroczenie startu serwera przed fazą 1 (`1438f9d`, `ca885e1`); `enableWorkflows` dla planu Pro (`1410138`); pytania do klienta i zakresy prac zatwierdzone dla 13 usług (`d77ba37`, podgląd `docs/operator/etap-5-pytania-i-zakresy.html`).
   - Założenia planu rozstrzygnięte w smoke'u 2026-10-28 (szczegóły w Ustaleniach): aneks kuchenny liczony jak osobna kuchnia (zamiast 10% metrażu w granicach 4–8 m²); potwierdzone: koszt dojazdu firmy tam i z powrotem, widełki rynku usług z pomieszczeniami bez minimum zlecenia (mieszkanie 50 m² w mazowieckim: od 120 zł, a nie od 150 zł; decyzja wykonawcy z IU-4). Założenia spoza listy smoke'a rozstrzygnięte tego samego dnia: okna, tapicerka i dywany w szybkiej wycenie do +20%, a przy trudnych plamach albo farbie i kleju na szybach do +40%; potwierdzone: własne tempo od 3 zleceń (mediana z ostatnich 10) i mediana krajowa w wycenie bez województwa.
   - Zbudowane 2026-10-27 (autopilot, gałąź `feature/etap-5-aplikacja-wyceny`, archiwum `7fafed0`): podsumowanie `docs/completed/etap-5-aplikacja-wyceny/etap-5-aplikacja-wyceny-podsumowanie.md`, smoke operatora `docs/operator/2026-10-27-etap-5-aplikacja-wyceny-smoke.md`, wniosek do bazy wiedzy `docs/solutions/runtime-errors/2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md`. ✅ po smoke'u i scaleniu obu części PR.
6. **Testy i publikacja** na GitHub Pages.
7. **Zdobywanie klientów** (po wersji 1): cennik z własnych stawek do publikacji, szablony odpowiedzi na zapytania (Fixly, Oferteo, komunikatory), lista wysłanych ofert z przypomnieniem o kontakcie, lista startowa (wizytówka Google, OC z klauzulą o mieniu powierzonym, polecenia).
8. **Bezpieczeństwo chemii** (po wersji 1): czego nie mieszać i jakie środki ochrony, z kart SDS w `data/chemia.json`.

## Środowisko
- Windows 11, PowerShell 5.1; Git 2.55, GitHub CLI 2.103 i Node.js 24 LTS (winget; Node od 2026-10-23 dla szablonu `.claude/`). Brak Pythona – skrypty danych są w PowerShellu (`scripts/kalibracja.ps1`, zapisany jako UTF-8 z BOM).
- Git Bash ma `perl` z `JSON::PP` i `pdftotext`; w Perlu są pomocnicze parsery stron dostawców chemii (`scripts/chemia/`).
- Aplikacja będzie w czystym HTML/JS, bez kroku budowania.

## Otwarte pytania
Brak otwartych pytań.

Rozstrzygnięte 2026-10-23 (szczegóły w Ustaleniach): „doczyszczanie”, usuwanie farby, dezynfekcja. Rozstrzygnięte 2026-10-28: adres aplikacji (subdomena firmy; pod `simpleperfection.github.io` każda inna strona Pages konta miałaby dostęp do `localStorage` z danymi klientów i do cache service workera).
