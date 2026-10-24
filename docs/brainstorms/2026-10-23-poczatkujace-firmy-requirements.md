---
date: 2026-10-23
topic: poczatkujace-firmy
---

# Aplikacja dla początkujących firm: ile brać, ile to potrwa, co obejmuje cena

> **Zmiana 2026-10-24 (decyzja właściciela):** blok A „cena minimalna z kosztów firmy” wycięty z wersji 1 (R1–R4 i R6 usunięte, R5, R7–R10, R15, R21 i R24 poprawione). Z ustawień podatkowych zostaje tylko status VAT. Z warunków oferty wypada zaliczka (R20). Numeracja wymagań bez zmian.

## Problem

Aplikacja jest publiczna i darmowa, dla dowolnej początkującej firmy sprzątającej w Polsce. Właściciel (sam prowadzi firmę sprzątającą) wskazał bóle startu w kolejności: **nie wiedziałem, ile brać** (główny), brak zleceń, zlecenia trwały dłużej niż zakładałem, spory z klientem o zakres prac.

Obecny plan (etap 5 w `PLAN.md`) mówi, ile bierze rynek, ale nie mówi:
- **ile musi brać ta konkretna firma**: marża na zleceniu nie uwzględnia ZUS właściciela, auta, OC, księgowości ani godzin bez zleceń;
- **ile naprawdę potrwa praca nowicjusza**: normy są skalibrowane na cenach doświadczonych firm (mieszkanie 50 m² = 3,8 h); w przypadku z researchu firma zakładała ok. 23 m²/h, a robiła ok. 14 m²/h;
- **co obejmuje cena**: bez spisanego zakresu i warunków każda reklamacja kończy się sporem.

Research (2026-10-23): w Polsce nie ma narzędzia do wycen dla firm sprzątających (są kalkulatory dla klientów, np. cenauslug.pl, i rezerwacje, np. Anolla). Najbliższy odpowiednik to amerykański QuotePro (widełki rynkowe, warianty cenowe, 19–99 USD/mies.). Próg rentowności liczą tylko osobne kalkulatory (Housecall Pro, Harvest); żaden nie łączy go z wyceną. Połączenie lokalnej mediany rynku, ceny minimalnej z kosztów firmy i doboru chemii nie ma odpowiednika.

## Wymagania

Wersja 1 (etap 5) obejmuje bloki: A (cena w wycenie), B (wycena w dwóch krokach), C (własne tempo), D (oferta). Firma jest **jednoosobowa: sprząta sam właściciel**.

**A. Cena w wycenie** (do 2026-10-24: „Twoja firma i cena minimalna”)
- R1–R4. *Usunięte 2026-10-24 decyzją właściciela:* ustawienia kosztowe i podatkowe firmy (forma opodatkowania, etap ZUS, koszty stałe, kwota „na rękę”, godziny u klientów), minimalna stawka za godzinę, ZUS liczony na następnym progu oraz kwoty podatkowe z datą „stan na”. Status VAT przeszedł do R8, a województwo do kreatora z R24.
- R5. W każdej wycenie, szybkiej i dokładnej, aplikacja pokazuje cenę rynkową, czyli medianę w województwie (wynik modelu wyceny) z widełkami rynku. To jest cena proponowana. Pod nią jest koszt zlecenia: czas pracy z własnym tempem (R15), chemia, sprzęt i dojazd (szacunki z `data/ceny.json`, które firma może zmienić).
- R6. *Usunięte 2026-10-24:* ostrzeżenie o cenie ponad widełkami rynku wynikało z ceny minimalnej.
- R7. Właściciel może ręcznie zmienić cenę proponowaną. Aplikacja na bieżąco pokazuje, ile zostaje dla niego i ile wynosi jego realna stawka za godzinę na tym zleceniu.
- R8. Ceny w aplikacji to kwoty, które płaci klient. Jedyne ustawienie podatkowe firmy to status VAT (zwolniony podmiotowo albo czynny; decyzja 2026-10-24). Dla czynnego podatnika VAT ceny są z VAT 23% (z kwotą netto obok), dla zwolnionego bez VAT. Mediany rynkowe traktujemy jako kwoty płacone przez klienta.
- R9. W podsumowaniu wyceny zamiast „marży %” jest zdanie: „zostaje dla Ciebie X zł, czyli Y zł za godzinę Twojej pracy” (cena minus chemia, sprzęt i dojazd, podzielone przez czas pracy). Celu godzinowego nie ma, bo nie ma ceny minimalnej (decyzja 2026-10-24).

**B. Wycena w dwóch krokach**
- R10. **Szybka wycena** (telefon, czat) dla mieszkań (standard, gruntowne, po wynajmie), biur jednorazowo, okien, tapicerki, dywanów i AGD. Przy mieszkaniach i biurach właściciel podaje rodzaj sprzątania, metraż, liczbę łazienek, kuchnię albo aneks i spodziewany stan (lekki, typowy, mocny). Wynik to widełki od–do obejmujące sąsiednie poziomy zabrudzenia.
- R11. Przy usługach, które wymagają oględzin (po remoncie, doczyszczanie, mycie posadzek, kostka, elewacja, hale), szybka wycena daje tylko „orientacyjnie od X zł” i zaleca oględziny albo zdjęcia.
- R12. Szybka wycena daje gotowy tekst do wysłania klientowi: widełki i zastrzeżenie „cena ostateczna po obejrzeniu lokalu lub zdjęć”.
- R13. **Pytania do klienta przed wyceną**, osobne dla każdej usługi: zwierzęta, parking i dojazd, piętro i winda, dostęp do wody i prądu, czyj sprzęt i chemia, termin, prośba o zdjęcia. Odpowiedzi zapisują się przy wycenie. Jeśli pytanie ma odpowiednik w modelu (zwierzęta → sierść, odległość → dojazd), odpowiedź ustawia go automatycznie.
- R14. Szybką wycenę można zamienić w dokładną (obecny kreator: pomieszczenia i brud) bez wpisywania danych od nowa.

**C. Własne tempo**
- R15. Domyślne tempo nowej firmy to **1,3× normy rynkowej** (mieszkanie 50 m²: ok. 5 h zamiast 3,8 h). Tempo jest widoczne i można je zmienić w ustawieniach. Wpływa na czas pracy i na to, ile zostaje dla właściciela za godzinę, ale **nie zmienia ceny rynkowej**.
- R16. Po wykonaniu zlecenia właściciel oznacza wycenę jako wykonaną i wpisuje faktyczny czas pracy. Aplikacja pokazuje plan i fakt oraz realną stawkę za godzinę na tym zleceniu.
- R17. Z zapisanych zleceń aplikacja liczy własne tempo i używa go zamiast 1,3×. Najpierw jest jedno wspólne tempo; osobne dla danej usługi pojawia się, gdy w tej usłudze są co najmniej 3 wpisy. Aplikacja podaje podstawę wyliczenia (np. „1,18× z 7 zleceń”). Właściciel może wrócić do wartości ręcznej.

**D. Oferta jako mini-umowa**
- R18. Z wyceny powstaje oferta dla klienta jako link (do otwarcia w telefonie) i jako PDF do wydruku. Oferta zawiera: dane firmy (nazwa, telefon, e-mail, opcjonalnie NIP), usługę, opcjonalnie adres i termin, cenę (zgodnie z R8), zakres „wchodzi / nie wchodzi”, dodatki opcjonalne z cenami, warunki i datę ważności (domyślnie 14 dni).
- R19. Zakres „wchodzi / nie wchodzi” jest gotowy dla każdej usługi i rodzaju sprzątania. Właściciel może go zmienić raz w ustawieniach albo tylko w jednej ofercie.
- R20. Warunki domyślne, wszystkie do edycji (zatwierdzone przez właściciela 2026-10-24; zaliczki nie ma, bo w praktyce się jej nie stosuje):
  - bezpłatne odwołanie do 24 h przed terminem, później opłata 50%;
  - brak dostępu do lokalu: opłata 50%;
  - zdjęcia przed i po pracy;
  - przy szybkiej wycenie zastrzeżenie o stanie lokalu.
- R21. Oferta nigdy nie pokazuje kosztów firmy, tempa ani tego, ile zostaje dla właściciela.
- R22. Link do oferty działa bez logowania i bez instalowania czegokolwiek, a dane klienta nie są zapisywane na żadnym serwerze.

**Wspólne**
- R23. Wszystkie dane (ustawienia, wyceny, zlecenia) są tylko w przeglądarce. Jest eksport i import kopii do pliku oraz regularne przypomnienie o zrobieniu kopii.
- R24. Przy pierwszym uruchomieniu krótki kreator ustawień firmy: województwo, status VAT (R8), dane firmy do oferty (R18) i tempo (R15). Można go pominąć: wtedy działają wartości domyślne (zwolniony z VAT, tempo 1,3×), a aplikacja pokazuje znacznik „ustawienia domyślne – uzupełnij”.

## Kryteria sukcesu
- Przy każdej wycenie właściciel widzi, gdzie cena leży na rynku województwa i ile zostaje dla niego za godzinę pracy.
- Szybka wycena mieszkania podczas rozmowy telefonicznej trwa poniżej minuty i kończy się tekstem do wysłania.
- Po kilku zleceniach z wpisanym czasem planowany czas zbliża się do faktycznego: aplikacja pokazuje, jak zmieniała się różnica między planem a faktem.
- Właściciel używa ofert z zakresem i warunkami w swojej firmie zamiast dotychczasowej formy (sprawdzian na żywym rynku).
- Cena rynkowa nadal odtwarza scenariusze z `research/KALIBRACJA.md`, bo nowe funkcje jej nie zmieniają.

## Granice scope'u
- **Po wersji 1, jako osobne etapy:**
  - E. Zdobywanie klientów: cennik z własnych stawek do publikacji (strona, Facebook, wizytówka Google), szablony odpowiedzi na zapytania (Fixly, Oferteo, komunikatory), lista wysłanych ofert z przypomnieniem o kontakcie, lista startowa (wizytówka Google, OC z klauzulą o mieniu powierzonym, polecenia).
  - G. Bezpieczeństwo chemii: czego nie mieszać, jakie środki ochrony (z kart SDS).
- **Na razie nie planujemy:**
  - ceny minimalnej z kosztów firmy (dawny blok A: ZUS, podatek dochodowy, koszty stałe, kwota „na rękę”, godziny u klientów) – wycięta 2026-10-24 decyzją właściciela;
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
  - doradztwo podatkowe: aplikacja zna tylko status VAT firmy.

## Kluczowe decyzje
- **Cena proponowana to cena rynkowa** (mediana województwa z modelu wyceny), którą właściciel może zmienić ręcznie. Cenę minimalną z kosztów firmy wycięto 2026-10-24 decyzją właściciela.
- **Domyślne tempo 1,3×.** To środek między normą rynku a przypadkiem z researchu (ok. 1,67×). Z czasem zastępują je dane z własnych zleceń.
- **Tempo nie zmienia ceny rynkowej.** Klient płaci za efekt, nie za wolniejsze tempo; tempo zmienia tylko czas pracy i to, ile zostaje dla właściciela za godzinę.
- **Firma jednoosobowa.** Zamiast kosztu robocizny aplikacja pokazuje, ile zostaje dla właściciela za godzinę pracy (R9). Pracownicy zmieniają cały rachunek, więc dojdą w kolejnej wersji.
- **Oferta bez zaliczki** (2026-10-24): w praktyce właściciela zaliczek się nie stosuje.
- **Dane tylko w przeglądarce.** Bez serwera nie ma kosztów ani obowiązków RODO po naszej stronie; kopia w pliku zastępuje synchronizację.

## Zależności / Założenia
- Chemia w koszcie zlecenia to szacunek z `data/ceny.json` (4 zł na godzinę pracy, przy impregnacie koszt na m²), który firma może zmienić. Z `data/chemia.json` kosztu nie liczymy, bo ceny i dozowanie są różne u każdego producenta (decyzja właściciela 2026-10-23).
- Domyślne listy „wchodzi / nie wchodzi” (R19) i pytania do klienta (R13) przygotuje Claude z researchu, a właściciel zatwierdzi je na podstawie doświadczenia własnej firmy.
- Kwoty ZUS, składki zdrowotnej i podatku dochodowego na 2026 z researchu przestały być potrzebne po wycięciu bloku A (tabela jest w historii repo, w wersji tego pliku z commita `abbaa59`). Zostaje stawka VAT na sprzątanie mieszkań i biur: 23% (pewność średnio-wysoka; właściciel zlecił sprawdzenie w źródłach 2026-10-24).

## Otwarte pytania

### Do rozwiązania przed planowaniem
(brak)

### Odroczone do planowania
- [Dotyczy R10][Techniczne] Jak rozłożyć metraż na pomieszczenia w szybkiej wycenie (typowe proporcje), żeby szybka wycena mieszkania 50 m² dawała to samo co kreator i `research/KALIBRACJA.md`.
- [Dotyczy R17][Techniczne] Jak liczyć własne tempo: średnia czy mediana, odrzucanie skrajnych zleceń, większa waga nowszych.
- [Dotyczy R18, R22][Techniczne] Jak zmieścić ofertę w linku bez serwera (długość adresu) i jak wygenerować PDF.
- [Dotyczy R8][Wymaga researchu] Czy mediany z cenników to kwoty brutto. Większość cenników tego nie podaje, a według właściciela (2026-10-24) firmy podają je różnie. Od tego zależy, jak czynny podatnik VAT ma czytać medianę: jako cenę z VAT czy bez.

## Następne kroki
→ `/dev-plan` do planowania technicznego etapu 5 z tymi wymaganiami.
