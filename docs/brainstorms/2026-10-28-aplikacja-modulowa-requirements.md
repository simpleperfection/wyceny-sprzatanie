---
date: 2026-10-28
topic: aplikacja-modulowa
---

# Czysty Zarobek jako aplikacja z modułami: szkielet, nowy wygląd, zlecenia i klienci

## Problem

Etap 5 zbudował aplikację do wycen, bo tak opisywały ją `PLAN.md` („Cel”: wycena i dobór chemii) i brainstorm z 2026-10-23. Właściciel chciał jednak czegoś innego. „Czysty Zarobek” ma być aplikacją do prowadzenia początkującej, jednoosobowej firmy sprzątającej, a wycena ma być w niej tylko jednym z modułów. Dziś cała aplikacja kręci się wokół wyceny: dolny pasek ma zakładki Start, Wyceny, „+”, Chemia i Firma, a ekran startowy zaczyna się od kafli szybkiej i dokładnej wyceny.

Właściciel ocenia też aplikację jako bardzo nieczytelną w porównaniu z innymi. Wskazał wszystkie cztery przyczyny: za dużo tekstu, za małe litery i przyciski, nie wiadomo, gdzie kliknąć, a wygląd i kolory (beżowe tło, ciemny nagłówek, mały kontrast) zlewają się w jedno. Jako wzór podał aplikacje do prowadzenia firm sprzątających, np. [Cleanlo](https://cleanlo.pl/): białe tło, jeden mocny kolor, duże pogrubione tytuły i kwoty, mało tekstu.

Wnioski z researchu (2026-10-28):
- Rdzeń aplikacji dla firm usługowych to klienci, zlecenia z kalendarzem (także cykliczne), wyceny i pieniądze. Tak jest w Jobberze, Housecall Pro i ZenMaid, a z polskich w [InTool](https://intool.pl/) od Fakturowni.
- InTool i Jobber otwierają się stanem dnia, a nie menu: jedno zdanie („Masz dziś 2 aktywne zlecenia i 2 niezapłacone”) i kafle z liczbami.
- Żadna znaleziona aplikacja nie ma przewodnika zakładania firmy, doboru chemii ani wyceny opartej na stawkach rynkowych. To nasza przewaga.
- Dla jednej osoby bez serwera nie mają sensu: dyspozytornia, ewidencja czasu zespołu, wbudowane SMS-y, płatności i rezerwacje online.

## Moduły

| Moduł | Kiedy | Uwagi |
|---|---|---|
| Zlecenia (z kalendarzem) | **ten etap** | nowy |
| Wycena | **ten etap** | obecny kreator, szybka wycena i oferta w nowym wyglądzie |
| Klienci | **ten etap** | nowy, korzystają z niego inne moduły |
| Chemia | **ten etap** | obecny katalog i dobór środków w nowym wyglądzie; później bezpieczeństwo chemii (dawny etap 8) |
| Pieniądze | osobny etap | przychody i koszty w miesiącu, ile zostaje, kto nie zapłacił |
| Start firmy | osobny etap | przewodnik zakładania firmy krok po kroku |
| Zdobywanie klientów | osobny etap | dawny etap 7: cennik do publikacji, gotowe odpowiedzi na zapytania, przypomnienia o ofertach |

Każdy z modułów na później dostanie przed planowaniem własny brainstorm.

## Wymagania

**A. Szkielet i ekran główny**
- R1. Aplikacja składa się z modułów. W tym etapie są cztery: Zlecenia, Wycena, Klienci i Chemia, a do tego ustawienia firmy. Moduły z późniejszych etapów nie mają kafla, dopóki nie są gotowe (żadnych kafli „Wkrótce”).
- R2. Ekran główny (Start) zawiera, od góry:
  - powitanie z nazwą firmy, a bez niej samo powitanie;
  - jedno zdanie o dniu, np. „Dziś 2 zlecenia · 1 niezapłacone”, a gdy nic nie ma, „Dziś nie masz zleceń”;
  - kafle modułów (na telefonie w dwóch kolumnach);
  - odnośnik „Ustawienia firmy”.
- R3. Każdy kafel ma ikonę, nazwę i jedną linię stanu z liczbą:
  - Zlecenia: „2 dziś” albo najbliższy termin;
  - Wycena: oferty do wysłania, przyjęte do zaplanowania albo czekające na odpowiedź;
  - Klienci: liczba klientów;
  - Chemia: bez licznika albo liczba środków.

  Gdy modułu jeszcze nie użyto, linia stanu podpowiada pierwszy krok („Dodaj pierwsze zlecenie”).
- R4. Nie ma dolnego paska. W module na górze jest „← Start” i nazwa modułu, a pod nimi przełączniki widoków modułu (np. Dzień / Tydzień / Miesiąc). Żeby przejść do innego modułu, wraca się na Start.
- R5. Przypomnienie o kopii danych i znacznik „ustawienia domyślne – uzupełnij” zostają na ekranie Start, nie więcej niż jeden baner naraz. Kreator ustawień przy pierwszym uruchomieniu (R24 z 2026-10-23) zostaje. Po nim, albo po jego pominięciu, użytkownik trafia na Start.
- R6. Szybka wycena przez telefon jest najwyżej dwa dotknięcia od ekranu Start: kafel Wycena, a potem „Szybka wycena”.

**B. Czytelność i wygląd** (dotyczy wszystkich ekranów, także obecnych: kreatora wyceny, oferty, chemii, ustawień i kopii)
- R7. Wygląd jest biało-zielony: białe tło i jeden mocny zielony kolor dla głównych akcji i kwot. Odcień jest własny, nie kopia Cleanlo. Zastępuje wariant B („kartka i długopis”) z etapu 5.
- R8. Litery i przyciski są duże:
  - tekst podstawowy ma co najmniej 17 px;
  - wszystko, co da się dotknąć, ma co najmniej 48 px wysokości;
  - tytuły i kwoty są duże i pogrubione.
- R9. Tekstu jest mniej:
  - każdy ekran ma jedną wyraźną główną akcję;
  - wyjaśnienia (np. skąd mediana rynku czy opis pozycji) są schowane pod „Więcej” albo ikoną „?”;
  - wiersz listy ma najwyżej dwie linie: tytuł i jedną linię szczegółów.
- R10. Od razu wiadomo, gdzie kliknąć. Wszystko klikalne wygląda jak przycisk albo wiersz ze strzałką, a tekst, którego nie da się kliknąć, nie wygląda jak przycisk. Pusty ekran to jedno zdanie i jeden przycisk.
- R11. Kontrast tekstu spełnia co najmniej WCAG AA, żeby ekran był czytelny także w słońcu.

**C. Zlecenia i kalendarz**
- R12. Zlecenie ma:
  - klienta, adres z karty klienta, usługę lub krótki opis;
  - datę i godzinę;
  - cenę;
  - planowany czas, gdy powstało z wyceny;
  - stan wykonania i zapłaty.

  Zlecenie powstaje na dwa sposoby:
  - z przyjętej wyceny przyciskiem „Zaplanuj”: cena, zakres i planowany czas przechodzą z wyceny;
  - ręcznie: klient, usługa, cena i termin, np. stały klient bez wyceny.
- R13. Zlecenie może być cykliczne: co tydzień, co 2 tygodnie albo co miesiąc. Abonament biura z wyceny (1×, 2×, 3× lub 5× w tygodniu) daje serię z tą częstotliwością. Kolejne wizyty tworzą się same.
  - Pojedynczą wizytę można przesunąć albo odwołać, a seria zostaje bez zmian.
  - Zmiana ceny albo godziny serii działa od wybranej wizyty w przód.
  - Serię można zakończyć.
- R14. Kalendarz ma trzy widoki:
  - Dzień: widok domyślny, lista wizyt z godziną, klientem, adresem i kwotą;
  - Tydzień;
  - Miesiąc: dni z liczbą wizyt, a dotknięcie dnia otwiera widok Dzień.
- R15. Po terminie wizyta ma przyciski „Zrobione” i „Zapłacone”, więc zamknięcie wizyty to najwyżej dwa dotknięcia. Czas pracy można dopisać, ale nie trzeba, a aplikacja nie przypomina o nim przy każdej wizycie.
  - Zmienia to R16 z 2026-10-23: wykonanie i czas pracy należą teraz do zlecenia, nie do wyceny.
  - Własne tempo (R17 z 2026-10-23) liczy się tylko z wizyt, które mają wpisany czas pracy i planowany czas z wyceny.
  - „Zrobione” można dotknąć także przed końcem dnia wizyty.
  - Wizyty z minionym terminem, których nikt nie oznaczył jako zrobione, są na górze widoku Dzień w sekcji „Do zamknięcia”, a ich liczba jest w linii stanu kafla Zlecenia.
- R16. Zapłatę oznacza się przy wizycie: zapłacone albo niezapłacone oraz forma (gotówka, przelew, BLIK). Wykonane, a niezapłacone wizyty widać w zdaniu o dniu na Start (R2), na kaflu Zlecenia i w historii klienta. Te dane posłużą później modułowi Pieniądze.

**D. Klienci**
- R17. Klient ma:
  - nazwę (imię i nazwisko albo firmę);
  - telefon: dotknięcie numeru dzwoni;
  - adres: dotknięcie otwiera mapę;
  - notatki, np. klucze, kod do domofonu, zwierzęta.
- R18. Karta klienta pokazuje jego dane, historię wycen i zleceń (z kwotą i stanem zapłaty) oraz przyciski „Nowa wycena” i „Nowe zlecenie” dla tego klienta.
- R19. W wycenie i w zleceniu klienta wybiera się z listy albo dodaje nowego bez wychodzenia z ekranu. W szybkiej wycenie klient nie jest wymagany, ale przy „Zaplanuj” już tak.

**E. Wycena i chemia w nowym układzie**
- R20. Pierwszy ekran modułu Wycena to dwa duże przyciski: „Szybka wycena” (przez telefon) i „Dokładna wycena” (na miejscu). Pod nimi jest lista wycen w tej kolejności:
  - do wysłania;
  - przyjęte, jeszcze bez zlecenia, z przyciskiem „Zaplanuj”;
  - czekające na odpowiedź;
  - reszta.
- R21. Działanie wyceny się nie zmienia: silnik, ceny, VAT, pytania do klienta, oferta (link i PDF) i warunki działają tak jak dziś (wymagania z `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`). Zmieniają się tylko wygląd i ilość tekstu (R7–R11).
- R22. Wycena kończy się na „przyjęta” albo „odrzucona”, a wykonanie i zapłata należą do zlecenia. Przyjęta wycena prowadzi do swojego zlecenia, a zlecenie do wyceny, z której powstało.
- R23. Moduł Chemia to obecny katalog i dobór środków w nowym wyglądzie.

**F. Dane**
- R24. Dane zostają tylko w przeglądarce. Kopia do pliku obejmuje teraz także klientów i zlecenia.
- R25. Dane z obecnej wersji dalej działają. Ustawienia, wyceny i wpisy czasu pracy wczytują się, także ze starych plików kopii. Przyjęte i wykonane wyceny stają się zleceniami (wykonane z czasem pracy), a nazwy klientów z wycen trafiają na listę klientów.

## Kryteria sukcesu
- Osoba, która pierwszy raz otwiera aplikację, bez instrukcji rozumie, że ma ona kilka modułów. Do szybkiej wyceny dochodzi w dwóch dotknięciach.
- Właściciel sprawdza aplikację na swoim telefonie i ocenia ją jako co najmniej tak czytelną jak Cleanlo i InTool. Każdy ekran da się przeczytać bez powiększania.
- Serię u stałego klienta (co tydzień) zakłada się w niecałą minutę, a zamknięcie wizyty z zapłatą to dwa dotknięcia.
- Ekran Start w jednym zdaniu mówi, co jest dziś do zrobienia i kto nie zapłacił.
- Wycena daje te same ceny co przed przebudową: test parytetu ze scenariuszami `research/KALIBRACJA.md` przechodzi.
- Dane i kopie z obecnej wersji wczytują się bez strat.

## Granice scope'u
- **Osobne etapy później:**
  - Pieniądze: korzystają z zapłat zapisanych od tego etapu;
  - Start firmy: CEIDG, ZUS na start (ulga na start, preferencyjny ZUS), ubezpieczenie OC, sprzęt i chemia, pierwsze ogłoszenia; przy każdej kwocie i każdym terminie link do źródła i data sprawdzenia;
  - Zdobywanie klientów;
  - Bezpieczeństwo chemii.
- **Nie w tym etapie:**
  - przypomnienia: wpis do kalendarza w telefonie i SMS do klienta z gotowym tekstem (właściciel ich nie wybrał);
  - dolny pasek i przycisk „+”;
  - mapa dnia i planowanie tras;
  - faktury;
  - akceptacja oferty online.
- **Poza zakresem, bo wymagałyby serwera albo zespołu:** powiadomienia push, konta i synchronizacja, pracownicy, płatności i rezerwacje online.
- **Bez zmian:** model wyceny, `data/ceny.json`, `data/normy.json`, `data/chemia.json`.

## Kluczowe decyzje
- **Kafle zamiast ekranu „Mój dzień”:** to wybór właściciela. Stan dnia mieści się w jednym zdaniu nad kaflami i w liczbach na kaflach, jak w InTool.
- **Bez dolnego paska:** mniej elementów na ekranie. Kosztem jest powrót na Start przy zmianie modułu.
- **Klienci jako osobny kafel:** korzystają z nich wycena, zlecenia i później pieniądze.
- **Moduły z późniejszych etapów są ukryte:** na ekranie jest tylko to, co działa.
- **Wygląd biało-zielony:** zielony kojarzy się z czystością i z pieniędzmi, więc pasuje do nazwy „Czysty Zarobek”. Zastępuje beżowy wariant B.
- **Kolejność:** najpierw szkielet, nowy wygląd, Zlecenia i Klienci, a dopiero potem publikacja pod `czystyzarobek.pl` (etap 6 czeka).
- **Zapłata oznaczana od razu:** moduł Pieniądze będzie miał dane od pierwszego dnia.
- **Czas pracy nieobowiązkowy:** przy stałych klientach mniej wpisywania. Kosztem jest wolniejsze uczenie się tempa.

## Zależności / Założenia
- Wymagania wyceny z 2026-10-23 obowiązują dalej, z wyjątkiem R16, który zastępuje R15 z tego dokumentu.
- Miesięczny limit Figmy wyczerpał się 2026-10-24. Makiety nowego wyglądu (Start, moduł Zlecenia, karta klienta, ekran wyceny) powstają więc jako HTML w `docs/operator/`, a właściciel akceptuje je przed budową. CLAUDE.md przewiduje to przy wyczerpanym limicie.
- `PLAN.md` wymaga zmian: nowy „Cel” (aplikacja z modułami), ustalenia z tego dokumentu, nowy etap przed publikacją oraz etapy 7 i 8 opisane jako moduły.

## Otwarte pytania

### Do rozwiązania przed planowaniem
Brak.

### Odroczone do planowania
- [R13][Techniczne] Jak daleko w przód tworzyć wizyty serii i jak zapisać serię z wyjątkami (wizyty przesunięte i odwołane).
- [R25][Techniczne] Przeniesienie danych: przyjęte i wykonane wyceny jako zlecenia, łączenie klientów o tej samej nazwie, nowa wersja pliku kopii.
- [R7, R8][Makiety] Odcień zieleni (biały tekst na zielonym przycisku musi spełniać R11), font i dokładne rozmiary.
- [R3][Treść] Dokładne teksty linii stanu na kaflach i zdania o dniu.
- [R7][Decyzja przy makietach] Czy oferta dla klienta (`oferta.html`) też dostaje zielony wygląd, czy zostaje neutralna z danymi firmy.
- [R14][Techniczne] Widok Tydzień na telefonie: lista dni czy siatka.

## Następne kroki
→ `/dev-plan` do planowania technicznego, a przed budową makiety HTML do akceptacji (R7–R11).
