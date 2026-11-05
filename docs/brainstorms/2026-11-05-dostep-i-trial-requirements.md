---
date: 2026-11-05
topic: dostep-i-trial
---

# Ograniczenie dostępu do Czystego Zarobku i 7-dniowy trial

## Problem

Czysty Zarobek stoi publicznie pod https://czystyzarobek.pl i korzystać może z niego każdy. Właściciel zapytał 2026-11-05, jak zabezpieczyć domenę przed obcymi i czy dawać konta z darmowym okresem próbnym. Jego cel: **najpierw testy z kilkoma znajomymi firmami, potem sprzedaż**.

Dziś nie ma czym tego zrobić. Darmowe GitHub Pages nie ma kontroli dostępu, a hasło albo data triala w samym JS nie są zabezpieczeniem. Dane firm leżą tylko w przeglądarce, więc obcy i tak nie widzą niczyich klientów. Ograniczenie jest potrzebne do sprzedaży, nie do ochrony danych.

Wnioski z researchu (2026-11-05):
- [Warunki GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) zabraniają prowadzenia na nim płatnej aplikacji (SaaS). Testy za darmo są dozwolone, sprzedaż nie.
- Cloudflare Access pasuje do zamkniętej grupy, nie do triala. [Darmowy plan to 50 osób](https://www.cloudflare.com/plans/sase-zero-trust.md), ale nie ma daty końca dostępu, a [domena musi przejść na nameservery Cloudflare](https://developers.cloudflare.com/dns/zone-setups/partial-setup/). Działa tylko na sieci, więc zainstalowana aplikacja dalej działa offline z cache, a online blokuje też dostęp do własnych danych i kopii.
- Triale w tej branży to 14 dni, często bez karty ([Jobber](https://www.getjobber.com/pricing/), [Housecall Pro](https://www.housecallpro.com/pricing/), [ZenMaid](https://get.zenmaid.com/pricing)). Pięciu dni nie znaleźliśmy. [Eksperyment na 337 tys. osób](https://ar5iv.labs.arxiv.org/html/2006.13420), dotyczący innej aplikacji, wypadł lepiej dla 7 dni niż dla 14 i 30.
- Aplikacje offline sprzedają dostęp podpisanym plikiem licencji z datą ważności ([Keygen](https://keygen.sh/docs/api/cryptography/)), a dane zostają u użytkownika.
- Pages publikuje całe repo: `czystyzarobek.pl/PLAN.md`, `/research/cenniki_firm.csv` i `/.claude/settings.json` zwracały 200 (sprawdzone 2026-11-05). Repo nie ma licencji, regulaminu ani polityki prywatności.

## Wybrany wariant

Dwa etapy, a drugi rusza tylko po spełnieniu warunku z sekcji „Kryteria sukcesu”.

| | Etap A: testy | Etap B: sprzedaż |
|---|---|---|
| Kto | do 5 znajomych firm | każda firma po założeniu konta |
| Dostęp | strona otwarta, ukryta przed wyszukiwarkami | konto z e-mailem, trial 7 dni, potem abonament |
| Hosting | GitHub Pages bez zmian | Cloudflare (serwer i pliki aplikacji) |
| Repo | publiczne | prywatne |
| Dane firm | tylko w przeglądarce | tylko w przeglądarce |
| Koszt stały | 0 zł | ok. 0–5 USD/mies. + prowizje |

## Wymagania

Numery R dotyczą tego dokumentu. Odwołania do innych brainstormów mają ich datę.

**Etap A: testy**
- R1. Aplikacja zostaje na GitHub Pages pod tym samym adresem. Nie ma logowania, listy adresów ani zmian w DNS.
- R2. Strona znika z wyszukiwarek, a link dostaje tylko grupa testowa. Właściciel wie, że to ukrycie, a nie zabezpieczenie: każdy, kto zna adres, wejdzie.
- R3. Aplikacja nie zbiera danych o użyciu. Właściciel pyta firmy sam, np. raz w tygodniu.

**Etap B: wejście i trial**
- R4. Kto pierwszy raz wchodzi na czystyzarobek.pl, widzi ekran wejścia: co robi aplikacja, ile kosztuje, regulamin, polityka prywatności i pole na e-mail.
- R5. Podanie e-maila i kodu z maila uruchamia 7-dniowy trial od razu, bez karty i bez udziału właściciela. Ten sam ekran służy do logowania na nowym urządzeniu.
- R6. W trialu działa cała aplikacja, bez ograniczeń.
- R7. Jeden e-mail daje jeden trial. Nowy e-mail to nowy trial i godzimy się na to.
- R8. Dopóki aplikacja nie jest zainstalowana, trial zachęca do instalacji i kopii, bo Safari bez instalacji [może skasować dane po 7 dniach nieużywania](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/).

**Etap B: przypomnienia**
- R9. Przez cały trial na ekranie Start jest codziennie baner „zostało X dni: zapłać albo zrób kopię”. Ma pierwszeństwo przed innymi banerami (R5 z 2026-10-28: nie więcej niż jeden naraz).
- R10. E-mail idzie 2 dni przed końcem triala i w dniu końca, z linkiem do płatności i przypomnieniem o kopii.

**Etap B: koniec dostępu**
- R11. Po końcu triala bez opłaty, po nieudanej płatności albo po rezygnacji aplikacja pokazuje tylko jeden ekran: „zapłać albo pobierz kopię danych”. Wycen, klientów ani zleceń nie widać.
- R12. Nieudana płatność blokuje od razu, bez okresu na poprawę. Gdy płatność przejdzie, aplikacja wraca po następnym połączeniu z siecią.
- R13. Ekran z R11 i pobranie kopii działają też offline. Kopia obejmuje wszystkie dane.
- R14. Aplikacja nigdy nie kasuje danych z urządzenia. Po opłacie wszystko wraca w tym samym stanie.
- R15. Wysłane linki ofert działają zawsze, bez logowania i bez licencji (R22 z 2026-10-23). Klient firmy nie widzi informacji o trialu ani o blokadzie.

**Etap B: płatność**
- R16. Firma płaci sama, BLIK-iem albo kartą, a abonament przedłuża się sam, bez udziału właściciela. Dla metod, które nie pozwalają na automatyczne odnowienie, zob. otwarte pytania.
- R17. Firma sama rezygnuje, zmienia sposób płatności i pobiera faktury.
- R18. Faktury wystawiają się automatycznie.
- R19. Konsument i jednoosobowa firma na prawach konsumenta mogą odstąpić od umowy w 14 dni, na zasadach z regulaminu.

**Etap B: licencja i urządzenia**
- R20. Aplikacja działa do wcześniejszej z dwóch dat: końca opłaconego okresu albo 7 dni od ostatniego połączenia z serwerem. Dotyczy to też firmy, która opłaciła abonament. Po połączeniu wraca sama.
- R21. Konto działa najwyżej na 2 urządzeniach. Na trzecim użytkownik widzi listę urządzeń i sam usuwa jedno po potwierdzeniu kodem z maila. Wyczyszczenie danych przeglądarki też zajmuje nowe miejsce, więc samodzielne usuwanie jest konieczne.
- R22. Dane nie synchronizują się między urządzeniami. Przenosi je kopia do pliku, jak dziś.

**Etap B: dane konta**
- R23. Serwer zna tylko e-mail, daty triala i abonamentu, stan płatności i listę urządzeń. Dane do faktury trafiają do operatora płatności albo faktur.
- R24. Dane firmy o jej klientach, wycenach i zleceniach nie opuszczają urządzenia, także w logach i diagnostyce.
- R25. Użytkownik może sam usunąć konto. Zostają tylko dokumenty, które trzeba przechowywać z mocy prawa.
- R26. Dane konta są przechowywane w UE.

**Etap B: przejście z wersji otwartej**
- R27. Kto ma już dane na urządzeniu, po wejściu wersji z licencją widzi ekran wejścia, a dane zostają nietknięte. Z tego ekranu może pobrać kopię bez podawania e-maila.
- R28. Firmy testowe nie mają wyjątków: 7 dni triala jak wszyscy, potem płatność.

**Etap B: hosting, repo i prawo**
- R29. Przed pierwszym trialem aplikacja przechodzi z GitHub Pages na Cloudflare, a nameservery z Hostido na Cloudflare, z odtworzeniem rekordów (domena ma rekord MX). Adres się nie zmienia, więc `localStorage` i service worker zostają.
- R30. Pod domeną są tylko pliki aplikacji. `PLAN.md`, `research/`, `docs/`, `scripts/` i `.claude/` nie są dostępne.
- R31. Repo staje się prywatne, dopiero gdy nowy hosting działa, bo darmowe Pages nie działa z prywatnego repo. Kolejność: najpierw hosting, potem repo.
- R32. Regulamin i polityka prywatności są gotowe przed pierwszym trialem i akceptowane przy zakładaniu konta. Zgoda na maile sprzedażowe jest osobna i dobrowolna.

## Kryteria sukcesu

**Warunek startu etapu B:** co najmniej 3 z 5 firm używa aplikacji co tydzień przez miesiąc i mówi, że by zapłaciło. Wcześniej nie budujemy serwera, płatności ani przenosin.

Etap B działa, gdy:
- firma przechodzi drogę od e-maila przez trial i płatność do rezygnacji bez kontaktu z właścicielem;
- zwykła firma bez ważnej licencji nie używa aplikacji;
- ruch sieciowy pokazuje, że dane klientów, wycen i zleceń nie opuszczają urządzenia;
- kopia pobrana z ekranu blokady działa offline i wczytuje się na innym urządzeniu;
- link oferty otwiera się po zablokowaniu firmy, która go wysłała;
- po przenosinach dane firm testowych są na miejscu.

## Granice scope'u

- **Nie robimy:** Cloudflare Access, bo nie daje triala, a konfiguracja i tak byłaby do wymiany przed sprzedażą.
- **Nie robimy:** synchronizacji danych. Może wrócić jako płatny dodatek, ale wtedy dochodzi umowa powierzenia z każdą firmą.
- **Nie robimy:** darmowej wersji po trialu ani trybu podglądu. Właściciel wybrał ekran „zapłać albo pobierz kopię”.
- **Później:** pełna strona sprzedażowa, reklamy i przekierowania z `ilewziac.pl`.
- **Bez zmian:** kont dla pracowników nadal nie ma, a płatności i rezerwacje klientów firm zostają poza zakresem (2026-10-28).
- **Bez zmian:** model wyceny i dane w `data/`.

## Kluczowe decyzje

- **Konto tylko do licencji, dane na urządzeniu:** to najmniejsza zmiana względem dzisiejszej aplikacji. Zwykle odpada umowa powierzenia, bo operator nie ma dostępu do danych klientów ([wytyczne EDPB](https://www.edpb.europa.eu/system/files/2023-10/edpb_guidelines_202007_controllerprocessor_final_en.pdf); to nasz wniosek, bez źródła wprost). Ceną jest brak synchronizacji.
- **Na testy ukrycie zamiast kłódki:** przy 5 znajomych i braku danych na serwerze nie ma czego chronić. Testy mogą ruszyć od razu i bez przenosin DNS.
- **Trial 7 dni, wybór właściciela:** rekomendacja brzmiała 14 dni, bo tyle daje konkurencja, a początkująca firma ma mało zleceń. Właściciel wybrał 7 dni zamiast pierwotnych 5.
- **Pełna automatyzacja od startu sprzedaży, wybór właściciela:** rekomendacja brzmiała „ręcznie na początek”. Automat to największa budowa, ale działa bez właściciela i pod reklamy. Warunek startu chroni przed budowaniem jej za wcześnie.
- **Twarda blokada bez okresu na poprawę, wybór właściciela:** rekomendacja brzmiała „podgląd i kopia” oraz 3 dni przy nieudanej płatności.
- **Sprawdzanie co 7 dni i limit 2 urządzeń, wybór właściciela:** właściciel nie przyjął założenia, że blokada tylko odstrasza. Te zasady ją wzmacniają, ale jej nie domykają.
- **Hosting na Cloudflare, nie Supabase:** domena i pliki aplikacji i tak tam przechodzą. Supabase na darmowym planie [pauzuje projekt po tygodniu bezczynności](https://supabase.com/pricing), a Pro kosztuje od 25 USD/mies.

## Świadomie przyjęte ryzyka

- **Programista obejdzie blokadę.** Kod działa na urządzeniu klienta, więc pełnego zabezpieczenia nie ma, nawet z R20 i R21. Chroni prywatne repo, prawo autorskie i to, że docelowy klient nie jest programistą. Repo nie ma dziś licencji, więc prawa zostają przy autorze.
- **Firma może stracić grafik z dnia na dzień.** Wygasła karta w dniu odnowienia zamyka aplikację przed zleceniem, a do odzyskania dostępu trzeba zapłacić.
- **W dniu odnowienia abonamentu aplikacja potrzebuje internetu.** Bez niego także firma z udaną płatnością zobaczy blokadę, dopóki się nie połączy. To samo po ponad 7 dniach bez sieci.
- **Odstąpienie od umowy:** w ciągu 14 dni może się zdarzyć zwrot pieniędzy, a przy żądaniu rozpoczęcia usługi firma płaci tylko proporcjonalnie ([art. 35 i 38 ustawy o prawach konsumenta](https://api.sejm.gov.pl/eli/acts/DU/2024/1796/text.pdf)).

## Koszty i obowiązki

Poniższe to wstępne ustalenia, nie porada prawna. Regulamin, politykę prywatności i rozliczenia trzeba przed startem sprawdzić z prawnikiem i księgową.

| Co | Etap A | Etap B |
|---|---|---|
| Hosting i serwer | 0 zł | [Workers](https://developers.cloudflare.com/workers/platform/pricing/) Free albo Paid 5 USD/mies., [D1](https://developers.cloudflare.com/d1/platform/pricing/) w planie |
| E-maile | brak | [Resend](https://resend.com/pricing) 3000/mies. i 100/dzień gratis albo [Cloudflare Email](https://developers.cloudflare.com/email-service/platform/pricing/) (beta, Workers Paid) |
| Płatności | brak | [Stripe](https://stripe.com/pl/pricing): karta 1,5% + 1 zł, BLIK 1,6% + 1 zł, Billing 0,7%; przy przykładowych 49 zł ok. 4% (ceny jeszcze nie ma) |
| Faktury | brak | automatyczne faktury, [KSeF przy sprzedaży firmom](https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/zakres-obowiazkowego-ksef/); koszt narzędzia do sprawdzenia |
| Regulamin | do oceny, zob. otwarte pytania | [art. 8 ustawy o świadczeniu usług drogą elektroniczną](https://api.sejm.gov.pl/eli/acts/DU/2002/1204/text.html), także przy darmowym trialu |
| RODO | właściciel nie dostaje danych firm | administrator danych konta: polityka prywatności, lista dostawców, czas przechowywania, usuwanie na żądanie |
| Umowa powierzenia | nie | zwykle nie, dopóki spełnione jest R24; synchronizacja, kopie albo diagnostyka z danymi klientów to zmieniają |
| Maile sprzedażowe | brak | [zgoda z art. 398 Prawa komunikacji elektronicznej](https://www.prawo.pl/biznes/zgody-marketingowe-i-kontakty-handlowe-co-mowi-prawo-komunikacji-elektronicznej,530981.html), także przy firmach |

## Zależności i założenia

- Ta decyzja zmienia wcześniejsze ustalenia: „Dane tylko w przeglądarce” i wykluczenie kont (2026-10-23), konta w „Poza zakresem” (2026-10-28) oraz wiersze „Dane użytkownika” i „Odbiorca” w `PLAN.md`. Dane firm nadal zostają w przeglądarce, ale konta i obowiązki RODO dochodzą.
- Adres czystyzarobek.pl się nie zmienia, inaczej firmy straciłyby dostęp do danych w `localStorage`.
- Listę do 5 firm testowych ustala właściciel.

## Otwarte pytania

### Do rozwiązania przed planowaniem

Brak dla etapu A. Etapu B nie planujemy przed spełnieniem warunku startu.

### Odroczone do planowania etapu B

- [R4, R16][Decyzja użytkownika] Cena i okres rozliczeń. Właściciel może zapytać o nie firmy w testach.
- [R16, R18][Decyzja użytkownika] Kto sprzedaje: obecna firma czy nowa, status VAT i czy wpis w CEIDG obejmuje sprzedaż oprogramowania.
- [R16, R18][Wymaga researchu] Stripe czy pośrednik ([Paddle](https://www.paddle.com/pricing), [Stripe Managed Payments](https://docs.stripe.com/payments/managed-payments)): pośrednik zdejmuje VAT i spory, ale przy małych kwotach kosztuje ok. dwa razy więcej, a dostępność dla JDG nie jest potwierdzona.
- [R16][Wymaga researchu] Czy BLIK w Stripe pozwala na automatyczne odnowienie. Jeśli nie, a R12 zostaje bez zmian, taka firma musi płacić ręcznie co okres i przy spóźnieniu trafia na blokadę, więc potrzebne będą przypomnienia przed odnowieniem.
- [R18][Wymaga researchu] Narzędzie do faktur i KSeF. Zwykłe faktury Stripe nie obsłużą polskich obowiązków.
- [R19, R32][Wymaga prawnika] Status JDG na prawach konsumenta ([art. 7aa](https://api.sejm.gov.pl/eli/acts/DU/2024/1796/text.pdf)), brzmienie odstąpienia, [przycisk odstąpienia](https://www.prawo.pl/biznes/zwrot-jednym-kliknieciem-kto-i-kiedy-musi-wdrozyc,1546214.html) i czy maile z R10 są informacją o usłudze, czy marketingiem.
- [R25, R32][Decyzja użytkownika] Jak długo trzymać dane konta po zakończeniu korzystania.
- [R20, R21][Techniczne] Jak wygląda licencja podpisywana przez serwer, jak wykryć cofnięcie daty i jak liczyć urządzenia. Na iPhonie aplikacja zainstalowana i Safari [mają osobne dane](https://firt.dev/notes/pwa-ios/), więc mogą zająć dwa miejsca.
- [R13, R20][Techniczne] Service worker nie może zapisywać odpowiedzi serwera w cache, a serwer musi być na tym samym adresie, bo CSP ma `connect-src 'self'`.
- [R29][Wymaga researchu] Czy poczta na domenie jest używana i co trzeba odtworzyć w DNS. Czy regulamin Cloudflare dopuszcza takie użycie (nie czytaliśmy go).
- [R1, R32][Wymaga prawnika] Czy aplikacja bez kont też potrzebuje regulaminu (art. 8 nie ogranicza się do usług płatnych). Przy etapie A ryzyko jest małe, ale pytanie zostaje.

## Następne kroki

→ Etap A: dodać ukrycie przed wyszukiwarkami i wysłać link 5 firmom. Zmiana jest mała, więc wystarczy krótki `/dev-plan` albo pojedynczy commit.

→ Etap B: po spełnieniu warunku startu `/dev-prep` (cena, sprzedawca, prawnik, konta) i `/dev-plan`.
