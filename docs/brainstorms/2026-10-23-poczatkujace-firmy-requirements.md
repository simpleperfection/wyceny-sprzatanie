---
date: 2026-10-23
topic: poczatkujace-firmy
---

# Aplikacja dla początkujących firm: ile brać, ile to potrwa, co obejmuje cena

## Problem

Aplikacja jest publiczna i darmowa, dla dowolnej początkującej firmy sprzątającej w Polsce. Właściciel (sam prowadzi firmę sprzątającą) wskazał bóle startu w kolejności: **nie wiedziałem, ile brać** (główny), brak zleceń, zlecenia trwały dłużej niż zakładałem, spory z klientem o zakres prac.

Obecny plan (etap 5 w `PLAN.md`) mówi, ile bierze rynek, ale nie mówi:
- **ile musi brać ta konkretna firma**: marża na zleceniu nie uwzględnia ZUS właściciela, auta, OC, księgowości ani godzin bez zleceń;
- **ile naprawdę potrwa praca nowicjusza**: normy są skalibrowane na cenach doświadczonych firm (mieszkanie 50 m² = 3,8 h); w przypadku z researchu firma zakładała ok. 23 m²/h, a robiła ok. 14 m²/h;
- **co obejmuje cena**: bez spisanego zakresu i warunków każda reklamacja kończy się sporem.

Research (2026-10-23): w Polsce nie ma narzędzia do wycen dla firm sprzątających (są kalkulatory dla klientów, np. cenauslug.pl, i rezerwacje, np. Anolla). Najbliższy odpowiednik to amerykański QuotePro (widełki rynkowe, warianty cenowe, 19–99 USD/mies.). Próg rentowności liczą tylko osobne kalkulatory (Housecall Pro, Harvest); żaden nie łączy go z wyceną. Połączenie lokalnej mediany rynku, ceny minimalnej z kosztów firmy i doboru chemii nie ma odpowiednika.

## Wymagania

Wersja 1 (etap 5) obejmuje cztery bloki: A (cena minimalna), B (wycena w dwóch krokach), C (własne tempo), D (oferta). Firma jest **jednoosobowa: sprząta sam właściciel**.

**A. Twoja firma i cena minimalna**
- R1. Ustawienia firmy: województwo; status VAT (zwolniony podmiotowo albo czynny); forma opodatkowania (ryczałt 8,5%, skala, liniowy); etap ZUS (ulga na start, preferencyjny, mały ZUS plus, pełny) z datą rozpoczęcia działalności; miesięczne koszty stałe (auto i paliwo, OC, księgowość, telefon i internet, reklama, inne), każdy z podpowiedzią kwoty; docelowa kwota „na rękę” miesięcznie; liczba godzin pracy u klientów w miesiącu, z podpowiedzią, że na starcie to zwykle mniej niż pełny etat.
- R2. Aplikacja wylicza **minimalną stawkę za godzinę pracy u klienta** z ZUS, składki zdrowotnej, podatku, kosztów stałych i kwoty na rękę podzielonych przez godziny u klientów. Pokazuje rozbicie i liczbę zleceń „mieszkanie 50 m², standard” potrzebnych w miesiącu.
- R3. ZUS w cenie minimalnej liczy się **na następnym progu**: na uldze na start jak dla preferencyjnego, na preferencyjnym jak dla pełnego, na małym ZUS plus i pełnym według aktualnego. Aplikacja pokazuje, ile dziś zostaje ponad minimum dzięki niższej składce i od którego miesiąca (z daty rozpoczęcia) składka rośnie.
- R4. Kwoty ZUS, składki zdrowotnej, stawki podatku i limit zwolnienia z VAT mają datę „stan na” i źródło. Aplikacja pokazuje je razem z zastrzeżeniem: „to nie jest porada podatkowa, sprawdź z księgowym”. Kwoty aktualizuje się raz w roku.
- R5. W każdej wycenie, szybkiej i dokładnej, aplikacja pokazuje trzy liczby:
  - cenę rynkową: medianę w województwie i widełki rynku;
  - cenę minimalną firmy: własny czas (R15) × minimalna stawka + chemia, sprzęt i dojazd, a u czynnego podatnika VAT do tego VAT;
  - **cenę proponowaną, czyli wyższą z dwóch**, z informacją, gdzie leży względem rynku (np. „+12% nad medianą, w widełkach 220–290 zł”).
- R6. Gdy cena proponowana przekracza górną granicę widełek rynku, aplikacja pokazuje osobne ostrzeżenie: klient prawdopodobnie odmówi. Podpowiada też, co zmienić: koszty stałe, liczbę godzin u klientów, tempo albo minimum zlecenia.
- R7. Właściciel może ręcznie zmienić cenę proponowaną. Aplikacja na bieżąco pokazuje, ile zostaje dla niego i ile wynosi jego realna stawka za godzinę na tym zleceniu. Poniżej minimum ta stawka jest na czerwono.
- R8. Ceny w aplikacji to kwoty, które płaci klient. Dla czynnego podatnika VAT są z VAT 23% (z kwotą netto obok), dla zwolnionego bez VAT. Mediany rynkowe traktujemy jako kwoty płacone przez klienta.
- R9. W podsumowaniu wyceny zamiast „marży %” jest zdanie: „zostaje dla Ciebie X zł, czyli Y zł za godzinę Twojej pracy (cel: Z zł/h)”.

**B. Wycena w dwóch krokach**
- R10. **Szybka wycena** (telefon, czat) dla mieszkań (standard, gruntowne, po wynajmie), biur jednorazowo, okien, tapicerki, dywanów i AGD. Przy mieszkaniach i biurach właściciel podaje rodzaj sprzątania, metraż, liczbę łazienek, kuchnię albo aneks i spodziewany stan (lekki, typowy, mocny). Wynik to widełki od–do obejmujące sąsiednie poziomy zabrudzenia. Dolna granica nigdy nie schodzi poniżej ceny minimalnej (R5).
- R11. Przy usługach, które wymagają oględzin (po remoncie, doczyszczanie, mycie posadzek, kostka, elewacja, hale), szybka wycena daje tylko „orientacyjnie od X zł” i zaleca oględziny albo zdjęcia.
- R12. Szybka wycena daje gotowy tekst do wysłania klientowi: widełki i zastrzeżenie „cena ostateczna po obejrzeniu lokalu lub zdjęć”.
- R13. **Pytania do klienta przed wyceną**, osobne dla każdej usługi: zwierzęta, parking i dojazd, piętro i winda, dostęp do wody i prądu, czyj sprzęt i chemia, termin, prośba o zdjęcia. Odpowiedzi zapisują się przy wycenie. Jeśli pytanie ma odpowiednik w modelu (zwierzęta → sierść, odległość → dojazd), odpowiedź ustawia go automatycznie.
- R14. Szybką wycenę można zamienić w dokładną (obecny kreator: pomieszczenia i brud) bez wpisywania danych od nowa.

**C. Własne tempo**
- R15. Domyślne tempo nowej firmy to **1,3× normy rynkowej** (mieszkanie 50 m²: ok. 5 h zamiast 3,8 h). Tempo jest widoczne i można je zmienić w ustawieniach. Wpływa na czas pracy, cenę minimalną i to, co zostaje dla właściciela, ale **nie zmienia ceny rynkowej**.
- R16. Po wykonaniu zlecenia właściciel oznacza wycenę jako wykonaną i wpisuje faktyczny czas pracy. Aplikacja pokazuje plan i fakt oraz realną stawkę za godzinę na tym zleceniu.
- R17. Z zapisanych zleceń aplikacja liczy własne tempo i używa go zamiast 1,3×. Najpierw jest jedno wspólne tempo; osobne dla danej usługi pojawia się, gdy w tej usłudze są co najmniej 3 wpisy. Aplikacja podaje podstawę wyliczenia (np. „1,18× z 7 zleceń”). Właściciel może wrócić do wartości ręcznej.

**D. Oferta jako mini-umowa**
- R18. Z wyceny powstaje oferta dla klienta jako link (do otwarcia w telefonie) i jako PDF do wydruku. Oferta zawiera: dane firmy (nazwa, telefon, e-mail, opcjonalnie NIP), usługę, opcjonalnie adres i termin, cenę (zgodnie z R8), zakres „wchodzi / nie wchodzi”, dodatki opcjonalne z cenami, warunki i datę ważności (domyślnie 14 dni).
- R19. Zakres „wchodzi / nie wchodzi” jest gotowy dla każdej usługi i rodzaju sprzątania. Właściciel może go zmienić raz w ustawieniach albo tylko w jednej ofercie.
- R20. Warunki domyślne, wszystkie do edycji:
  - bezpłatne odwołanie do 24 h przed terminem, później opłata 50%;
  - brak dostępu do lokalu: opłata 50%;
  - zaliczka (domyślnie wyłączona, z podpowiedzią 50% przy pierwszym zleceniu);
  - zdjęcia przed i po pracy;
  - przy szybkiej wycenie zastrzeżenie o stanie lokalu.
- R21. Oferta nigdy nie pokazuje kosztów firmy, ceny minimalnej, tempa ani tego, ile zostaje dla właściciela.
- R22. Link do oferty działa bez logowania i bez instalowania czegokolwiek, a dane klienta nie są zapisywane na żadnym serwerze.

**Wspólne**
- R23. Wszystkie dane (ustawienia, wyceny, zlecenia) są tylko w przeglądarce. Jest eksport i import kopii do pliku oraz regularne przypomnienie o zrobieniu kopii.
- R24. Przy pierwszym uruchomieniu krótki kreator ustawień firmy (R1). Można go pominąć: wtedy działają wartości domyślne (zwolniony z VAT, ryczałt 8,5%, ulga na start, tempo 1,3×), a aplikacja pokazuje znacznik „ustawienia domyślne – uzupełnij”.

## Kryteria sukcesu
- Nowa firma w ok. 5 minut wypełnia ustawienia i widzi swoją minimalną stawkę za godzinę. Przy każdej wycenie wie, czy cena jest powyżej jej minimum i gdzie leży na rynku województwa.
- Szybka wycena mieszkania podczas rozmowy telefonicznej trwa poniżej minuty i kończy się tekstem do wysłania.
- Po kilku zleceniach z wpisanym czasem planowany czas zbliża się do faktycznego: aplikacja pokazuje, jak zmieniała się różnica między planem a faktem.
- Właściciel używa ofert z zakresem i warunkami w swojej firmie zamiast dotychczasowej formy (sprawdzian na żywym rynku).
- Cena rynkowa nadal odtwarza scenariusze z `research/KALIBRACJA.md`, bo nowe funkcje jej nie zmieniają.

## Granice scope'u
- **Po wersji 1, jako osobne etapy:**
  - E. Zdobywanie klientów: cennik z własnych stawek do publikacji (strona, Facebook, wizytówka Google), szablony odpowiedzi na zapytania (Fixly, Oferteo, komunikatory), lista wysłanych ofert z przypomnieniem o kontakcie, lista startowa (wizytówka Google, OC z klauzulą o mieniu powierzonym, polecenia).
  - G. Bezpieczeństwo chemii: czego nie mieszać, jakie środki ochrony (z kart SDS).
- **Na razie nie planujemy:**
  - rabatu za częstotliwość przy mieszkaniach (F);
  - konta i synchronizacji między urządzeniami (zostaje plik kopii);
  - pracowników i kilku osób na zleceniu (wersja 1 to firma jednoosobowa);
  - działalności nierejestrowanej, bo ma inne zasady (bez ZUS, limit kwartalny).
- **Poza zakresem:**
  - akceptacja oferty online, zaliczki i płatności przez aplikację (wymagałyby serwera);
  - warianty cenowe „dobry / lepszy / najlepszy”;
  - zdjęcia w aplikacji (aplikacja tylko przypomina, żeby o nie poprosić);
  - logo w ofercie;
  - grafik, kalendarz i faktury;
  - doradztwo podatkowe: aplikacja podaje tylko kwoty ze źródłem i zastrzeżenie.

## Kluczowe decyzje
- **Cena proponowana to wyższa z ceny rynkowej i minimalnej.** Zaniżanie cen to błąd numer 1 początkujących firm, a widełki rynku są szerokie (mieszkanie 50 m²: 120–450 zł). Gdy cena wychodzi ponad całe widełki, chroni przed tym ostrzeżenie z R6.
- **ZUS na następnym progu.** Ceny ustalone w czasie ulgi na start trudno potem podnieść stałym klientom.
- **Domyślne tempo 1,3×.** To środek między normą rynku a przypadkiem z researchu (ok. 1,67×). Z czasem zastępują je dane z własnych zleceń.
- **Tempo nie zmienia ceny rynkowej.** Klient płaci za efekt, nie za wolniejsze tempo; tempo zmienia tylko koszt i cenę minimalną.
- **Firma jednoosobowa.** Koszt pracy to kwota „na rękę”, której chce właściciel. Pracownicy zmieniają cały rachunek, więc dojdą w kolejnej wersji.
- **Dane tylko w przeglądarce.** Bez serwera nie ma kosztów ani obowiązków RODO po naszej stronie; kopia w pliku zastępuje synchronizację.

## Zależności / Założenia
- **Skutek do świadomości.** Przykład: ryczałt, ZUS liczony jako preferencyjny, koszty stałe ok. 1130 zł/mies., 4000 zł na rękę, 100 h u klientów. Minimalna stawka wychodzi ok. 70 zł/h, a mieszkanie 50 m² przy tempie 1,3× ok. 350–370 zł, przy medianie 250 zł. Aplikacja będzie więc często proponować ceny wyraźnie powyżej mediany. To zamierzone, ale komunikaty z R5 i R6 muszą to dobrze tłumaczyć.
- Cena minimalna korzysta z kosztu chemii, który etap 4 ma wyliczyć z `data/chemia.json`. Planowanie może iść teraz, implementacja po domknięciu etapu 4.
- Domyślne listy „wchodzi / nie wchodzi” (R19) i pytania do klienta (R13) przygotuje Claude z researchu, a właściciel zatwierdzi je na podstawie doświadczenia własnej firmy.
- Kwoty na 2026 z researchu (do sprawdzenia przy planowaniu):

  | Pozycja | Kwota | Źródło |
  |---|---|---|
  | Ulga na start | 6 miesięcy bez składek społecznych | ZUS |
  | ZUS preferencyjny | 420,87 zł (456,19 zł z chorobowym) | [ZUS](https://www.zus.pl/documents/10182/13364587/Sk%C5%82adki+przedsi%C4%99biorc%C3%B3w+w+2026+roku_DFF.pdf/c8d4e1dc-c80b-91d6-7453-02309976f713?t=1772712579703) |
  | ZUS pełny | 1788,29 zł (1926,76 zł z chorobowym) | ZUS |
  | Mały ZUS plus | podstawa 1441,80–5652 zł, nie w pierwszym roku | [biznes.gov.pl](https://www.biznes.gov.pl/pl/portal/00284) |
  | Zdrowotna na ryczałcie | 498,35 / 830,58 / 1495,04 zł (przychód do 60 tys. / do 300 tys. / powyżej) | [Firmove](https://www.firmove.pl/aktualnosci/finanse/zus/wysokosc-skladek-zus) |
  | Zdrowotna na skali i liniowym | 9% / 4,9% dochodu, minimum 432,54 zł | Firmove |
  | Ryczałt dla sprzątania (PKWiU 81.21, 81.22) | 8,5% | [interpretacja KIS](https://solidnaksiegowa.com/uslugi-sprzatajace-a-ryczalt-jaka-stawka-podatku/) |
  | Limit zwolnienia z VAT | 240 000 zł, proporcjonalnie przy starcie w trakcie roku | [Infor](https://ksiegowosc.infor.pl/wiadomosci/6852348,nowy-limit-zwolnienia-z-vat-od-2026-roku-240-tys-zl-sejm-uchwalil-nowelizacje-ustawy-o-podatku-od-towarow-i-uslug.html) |
  | VAT na sprzątanie mieszkań i biur | 23% | pewność średnio-wysoka |
  | OC działalności | 300–800 zł rocznie | jedno źródło (Orange), pewność niska |

## Otwarte pytania

### Do rozwiązania przed planowaniem
(brak)

### Odroczone do planowania
- [Dotyczy R2][Techniczne] Jak dokładnie liczyć podatek i składkę zdrowotną na skali i liniowym (zależą od dochodu, więc wymagają rachunku wstecznego) oraz progi zdrowotnej na ryczałcie liczone od przewidywanego przychodu.
- [Dotyczy R10][Techniczne] Jak rozłożyć metraż na pomieszczenia w szybkiej wycenie (typowe proporcje), żeby szybka wycena mieszkania 50 m² dawała to samo co kreator i `research/KALIBRACJA.md`.
- [Dotyczy R17][Techniczne] Jak liczyć własne tempo: średnia czy mediana, odrzucanie skrajnych zleceń, większa waga nowszych.
- [Dotyczy R18, R22][Techniczne] Jak zmieścić ofertę w linku bez serwera (długość adresu) i jak wygenerować PDF.
- [Dotyczy R8][Wymaga researchu] Czy mediany z cenników to kwoty brutto. Większość cenników tego nie podaje, a od tego zależy porównanie ceny minimalnej czynnego podatnika VAT z rynkiem.
- [Dotyczy R1][Wymaga researchu] Domyślne kwoty kosztów stałych: auto i paliwo, księgowość, OC (Orange podaje paliwo i auto 300–1000 zł/mies., księgowość 50–500 zł/mies., OC 300–800 zł rocznie).

## Następne kroki
→ `/dev-plan` do planowania technicznego etapu 5 z tymi wymaganiami (implementacja po domknięciu etapu 4).
