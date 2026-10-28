# Smoke operatora — Aplikacja wyceny, etap 5 (IU-1–IU-24)

Branch: `feature/etap-5-aplikacja-wyceny` · Utworzono: 2026-10-27
Status: **do przejścia** — odhaczaj `[ ]` → `[x]` w miarę przechodzenia.

Automat (typecheck, testy zielone wg walidacji końcowej, 19 scenariuszy E2E w przeglądarce) jest zielony. Ta lista pokrywa
**wyłącznie to, czego automat nie mógł sprawdzić**: wygląd na prawdziwym ekranie wobec makiet, natywne
okna przeglądarki (wybór pliku, drukowanie do PDF, schowek), instalację PWA i pracę offline, przeglądarki wbudowane komunikatorów,
odczucie szybkości na realnym telefonie i decyzje właściciela o założeniach planu.

Dlaczego to nie jest formalność: E2E szło w emulowanym viewporcie Chromium na komputerze, a aplikacja ma działać głównie na telefonie.
Safari na iPhonie inaczej obsługuje schowek, `window.open` po `await` i drukowanie, a przeglądarki wbudowane Messengera i WhatsAppa
mają własne ograniczenia. Zrzuty `visual-diff` to porównanie z makietą, którego automat nie ocenia: kolory wariantu B różnią się od
makiety celowo, więc tylko człowiek odróżni zamierzone odstępstwo od błędu układu.

## 0. Przygotowanie (5 min)
> Aplikacja nie ma backendu ani zmiennych środowiska (skrypt zmiennych gałęzi: brak nowych zmiennych). Dane leżą w `localStorage` przeglądarki, więc nie ma projektu ani konta testowego do wybrania. Zrzuty i makiety: po archiwizacji w `docs/completed/etap-5-aplikacja-wyceny/` (przed nią w `docs/active/etap-5-aplikacja-wyceny/`), makiety w `docs/plans/etap-5-aplikacja-wyceny-figma/` (PNG i opisy w `ekrany/`).

- [x] Aplikacja wstaje (dev server): `npm start` w katalogu projektu → `Serwer: http://127.0.0.1:5174/`, strona otwiera się w przeglądarce na komputerze, bez błędów w konsoli
  - 2026-10-28 (Claude): serwer na porcie 5175 z czystym `localStorage` → kreator ustawień, po „Pomiń” ekran startowy; konsola pusta, service worker aktywny, w cache 91 plików.

Pary „makieta / aplikacja” do punktów 2, 4, 5, 6, 8, 9, 10 i 11 są zebrane na jednej stronie `docs/operator/2026-10-28-etap-5-porownanie-makiet.html`, z uwagami o celowych odstępstwach. Otwieraj ją przez serwer (`npm start`, potem http://127.0.0.1:5174/docs/operator/2026-10-28-etap-5-porownanie-makiet.html), bo obrazki leżą w `docs/completed/`.
- [ ] Telefon ma dostęp do aplikacji: serwer dev nasłuchuje tylko na 127.0.0.1, a instalacja PWA, service worker i schowek wymagają HTTPS (albo localhost). Do punktów **[fizyczne urządzenie]** przygotuj adres HTTPS dostępny z telefonu → aplikacja otwiera się na Androidzie i na iPhonie

**Co będzie potrzebne w trakcie:** komputer z Chrome; telefon z Androidem (Chrome) i iPhone (Safari); drugi telefon do odebrania linku oferty; Messenger i WhatsApp; jedno prawdziwe (albo symulowane) zlecenie mieszkania z pełnymi danymi klienta; stoper.

## 1. Dane i silnik wyceny (IU-2)
Wejście: terminal PowerShell w katalogu projektu.
- [x] Uruchom `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\kalibracja.ps1` → skrypt kończy się bez `throw`, „niezgodności katalogu” = 0, a `research/kalibracja-scenariusze.json` ma scenariusz „mieszkanie_standard, 50 m², stawka 65” z ceną 250 ± 1 zł
  - 2026-10-28 (Claude): bez `throw`, niezgodności 0, scenariusz z sekcji 2 ma cenę 250,055 zł; pliki wygenerowane od nowa są identyczne z zapisanymi w repo.
- [x] `git diff main -- data/normy.json` → jedyna zmiana to nowe pole `uklady`; wartości norm bez zmian
  - 2026-10-28 (Claude): 58 linii dodanych (pole `uklady`: mieszkanie i biuro), 0 usuniętych ani zmienionych.

## 2. Pierwsze uruchomienie i ustawienia firmy (IU-11)
Wejście: aplikacja na czystym telefonie → kreator ustawień; potem dolne menu → Ustawienia (`#/ustawienia`).
- [ ] **[fizyczne urządzenie]** Przejdź kreator ustawień na telefonie, potem otwórz Ustawienia i porównaj z makietą `ustawienia-firmy` oraz z `visual-diff/ustawienia-firmy-figma.png` obok `visual-diff/ustawienia-firmy-actual.png` (zrzut 768×2579, trasa `#/ustawienia`) → układ sekcji zgodny z makietą; są sekcje dodane w późniejszych fazach: lista „Plan a fakt” pod „Tempo pracy” (po pierwszym wpisie czasu), „Zakres prac” i „Warunki oferty”. Dolne menu w połowie zrzutu całej strony to artefakt (`position: fixed`), nie defekt; na telefonie menu stoi na dole ekranu

## 3. Szkielet, nawigacja i komponenty (IU-9)
Wejście: dowolny ekran aplikacji na telefonie.
- [ ] **[fizyczne urządzenie]** Porównaj dolny pasek, nagłówek i komponenty formularza (pola, chipy, liczniki, przyciski) z makietami i `docs/plans/etap-5-aplikacja-wyceny-figma/komponenty.png` → kolory wariantu B z `SPEC.md`, pasek nie zasłania treści ani przycisków, elementy dotykowe dają się trafić palcem

## 4. Ekran startowy (IU-10)
Wejście: `#/start` po skończonym kreatorze, z kilkoma wycenami w różnych statusach.
- [ ] **[fizyczne urządzenie]** Otwórz `visual-diff/ekran-startowy-figma.png` obok `visual-diff/ekran-startowy-actual.png` (zrzut 768×1839, stan `wyceny-do-zrobienia`), potem porównaj start na telefonie z makietą `ekran-startowy` → kolejność sekcji zgodna: nagłówek, dwa kafle wyceny, karta miesiąca z tempem, „Do zrobienia”, baner kopii, dolne menu; teksty i statusy jak w makiecie; kolory różnią się tylko celowo (tokeny wariantu B)

## 5. Szybka wycena przez telefon (IU-21)
Wejście: start → kafel szybkiej wyceny (`#/szybka`).
- [ ] Otwórz `visual-diff/szybka-wycena-figma.png` obok `visual-diff/szybka-wycena-actual.png` (mieszkanie standard 50 m², typowy, województwo mazowieckie) → układ zgodny z makietą; pigułka „Zostaje ok. 47 zł/h” i zwijane „AGD i dodatki” to zaplanowane odstępstwa
- [ ] **[fizyczne urządzenie]** Zrób szybką wycenę mieszkania w trakcie symulowanej rozmowy telefonicznej i zmierz czas stoperem → od otwarcia ekranu do gotowych widełek mniej niż minuta
- [ ] **[fizyczne urządzenie]** „Kopiuj tekst” na iPhonie w Safari i w aplikacji zainstalowanej na ekranie początkowym → tekst wyceny trafia do schowka i wkleja się w SMS/komunikator; nie ma komunikatu o nieudanym kopiowaniu
- [x] Decyzja właściciela: widełki usług z pomieszczeniami liczone bez minimum zlecenia (mieszkanie 50 m² w mazowieckim: dolna granica 120 zamiast 150 zł; decyzja wykonawcy z IU-4, plan techniczny linia 369) → potwierdź albo odrzuć; dopisz tę pozycję do listy „Założenia planu do potwierdzenia przez właściciela w smoke'u” w `PLAN.md` (sekcja etapu 5), a po potwierdzeniu usuń dopisek „do potwierdzenia przez właściciela” z linii 369 planu technicznego
  - 2026-10-28: potwierdzone bez minimum; zapisane w `PLAN.md` (Ustalenia i sekcja etapu 5), w planie technicznym dopisek zamieniony na „potwierdzone przez właściciela 2026-10-28”.

## 6. Pytania do klienta
Wejście: szybka wycena → pytania (`#/wycena/<id>/pytania`).
- [ ] Otwórz `visual-diff/pytania-do-klienta-figma.png` obok `visual-diff/pytania-do-klienta-actual.png` (szybka wycena 50 m², zwierzęta „Tak”, dojazd 32 km) → układ zgodny z makietą; oceń kolejność pytań (z `data/pytania.json`) i pełną nazwę usługi w podtytule

## 7. Dokładna wycena i podsumowanie (IU-18)
Wejście: start → kafel dokładnej wyceny → kreator (usługa → zakres → pomieszczenia → dodatki → chemia) → podsumowanie.
- [ ] **[fizyczne urządzenie]** Przejdź dokładną wycenę mieszkania na telefonie i porównaj podsumowanie z makietą `podsumowanie-wyceny` → układ kart i kwoty czytelne, cena, koszt firmy i to, co zostaje, w kolejności jak w makiecie
- [x] Decyzja właściciela: aneks kuchenny = 10% metrażu (w granicach 4–8 m²) i koszt dojazdu firmy liczony tam i z powrotem → potwierdź albo odrzuć oba założenia (lista w `PLAN.md`, sekcja etapu 5)
  - 2026-10-28: aneks **odrzucony** – liczy się jak osobna kuchnia (16% w granicach 6–14 m²), bo praca w kuchni to fronty, blat, zlew i AGD. Zmienione `$uklady` w `scripts/kalibracja.ps1`, wygenerowane `data/normy.json` i fixture testów; 50 m² z aneksem daje teraz 250–300 zł zamiast 230–290 zł (sprawdzone w aplikacji). Dojazd tam i z powrotem potwierdzony.

## 8. Oferta — edycja
Wejście: wycena → „Oferta” (`#/wycena/<id>/oferta`).
- [ ] Otwórz `visual-diff/oferta-edycja-figma.png` obok `visual-diff/oferta-edycja-actual.png` (zrzut 768×2719, stan `wyceny-do-zrobienia`) → karty „Twoja firma”, „Klient i termin”, „Zakres prac”, „Warunki”, „Oferta ważna do” i stopka „PDF”/„Kopiuj link” zgodne z makietą; brak karty „Dodatki” jest prawidłowy (wycena bez propozycji); makieta ma kolory spoza tokenów wariantu B

## 9. Oferta u klienta — link i PDF (IU-23, IU-24)
Wejście: edycja oferty → „Kopiuj link” albo „PDF”; strona `oferta.html` z linku.
- [ ] **[fizyczne urządzenie]** Przygotuj ofertę z prawdziwej wyceny, wyślij link do siebie SMS-em, Messengerem i WhatsAppem i otwórz go na drugim telefonie, także w przeglądarce wbudowanej Messengera i WhatsAppa → oferta otwiera się w całości (nie jako „uszkodzony link”), polskie litery i kwoty poprawne
- [ ] **[fizyczne urządzenie]** Porównaj ofertę na telefonie i wydruk z makietą `oferta-klient` oraz `visual-diff/oferta-klient-figma.png` obok `visual-diff/oferta-klient-actual.png` (zrzut 768×2279 bez dojazdu i „Możesz dobrać”; pełny wariant w `oferta-po-terminie.png`) i zatwierdź brzmienie warunków → układ zgodny z makietą, brzmienie warunków zaakceptowane albo spisane poprawki
  - 2026-10-28: brzmienie domyślnych warunków zaakceptowane bez zmian; zostaje porównanie układu na telefonie i wydruku.
- [ ] **[fizyczne urządzenie]** „Pobierz PDF” na Androidzie (Chrome) i iPhonie (Safari) → zapisuje się jedna strona A4, bez przycisków aplikacji na wydruku

## 10. Zakończenie zlecenia (IU-19)
Wejście: przyjęta wycena → „Wpisz czas pracy” (`#/wycena/<id>/koniec`).
- [ ] **[fizyczne urządzenie]** Wpisz czas po prawdziwym zleceniu na telefonie i porównaj ekran z makietą `zakonczenie-zlecenia` oraz `visual-diff/zakonczenie-zlecenia-figma.png` obok `visual-diff/zakonczenie-zlecenia-actual.png` (licznik 5 h 30 min) → układ zgodny; oceń, czy „Zostało dla Ciebie” 235 zł przy planie i fakcie, przy zmianie tylko stawki 47 → 43 zł/h, jest dla Ciebie zrozumiałe

## 11. Kopia zapasowa (IU-12)
Wejście: dolne menu → Kopia (`#/kopia`).
- [ ] Otwórz `visual-diff/kopia-zapasowa-figma.png` obok `visual-diff/kopia-zapasowa-actual.png` (stan `wyceny-do-zrobienia`) → układ zgodny z makietą; oceń pigułkę „0 zleceń”: liczy tylko wyceny wykonane, więc przy jednej wycenie „Przyjęta” pokazuje 0 (w makiecie liczba zleceń równa się liczbie przyjętych na starcie) — zostaw albo zgłoś do zmiany
  - 2026-10-28: liczba zostaje, napis zmieniony na „N wykonanych zleceń” (`FORMY.wykonaneZlecenie`, test w `src/widoki/kopia-teksty.test.js`; zrzut `kopia-zapasowa-actual.png` jest sprzed zmiany). Zostaje porównanie układu z makietą.
- [ ] **[fizyczne urządzenie]** Zapisz kopię na telefonie, przenieś plik na komputer i wczytaj ją opcją „Połącz”; potem na Androidzie i iPhonie wczytaj plik kopii z systemowego okna wyboru plików, raz „Połącz”, raz „Zastąp” → okno wyboru pliku się otwiera, plik się wczytuje, „Połącz” zachowuje obecne wyceny i dokłada te z pliku, „Zastąp” zostawia tylko dane z kopii

## 12. PWA: offline i ekran początkowy (IU-13)
Wejście: aplikacja otwarta raz z siecią.
- [x] Chrome DevTools → Network → „Offline”, przeładuj stronę → aplikacja otwiera się i liczy wycenę z danych w cache
  - 2026-10-28 (Claude): zamiast trybu offline w DevTools zatrzymany serwer (adres nie odpowiada). Po przeładowaniu `#/szybka` otwiera się z cache: 50 m² daje 250–300 zł, a po zmianie na 60 m² 290–360 zł; konsola bez błędów.
- [ ] **[fizyczne urządzenie]** Dodaj aplikację do ekranu początkowego na Androidzie i na iPhonie → instaluje się, ikona zastępcza jest widoczna, aplikacja startuje bez paska przeglądarki

## 13. Przed publikacją (etap 6)
- [x] Decyzja właściciela o adresie publikacji: na GitHub Pages pod `simpleperfection.github.io` każda inna strona Pages tego konta ma dostęp do `localStorage` z danymi klientów i do cache service workera (i może wysłać do `sw.js` komunikat `zapisz-zasoby`) → wybierz własną (sub)domenę albo osobne konto lub organizację GitHub tylko z tą aplikacją; zapisz decyzję w „Otwarte pytania” `PLAN.md` (punkt 1). Kodu etapu 5 to nie blokuje
  - 2026-10-28: subdomena firmy na GitHub Pages, roboczo `wyceny.simple-perfection.pl`; zapisane w Ustaleniach `PLAN.md`, a pytanie przeniesione do rozstrzygniętych. W etapie 6: CNAME u rejestratora, własna domena i HTTPS w ustawieniach Pages.

## Jak kontynuować w nowej sesji
Skopiuj jako pierwszą wiadomość:
```
Kontynuujemy smoke operatora zadania "etap-5-aplikacja-wyceny" (branch feature/etap-5-aplikacja-wyceny).
Checklista: docs/operator/2026-10-27-etap-5-aplikacja-wyceny-smoke.md — prowadź mnie punkt po punkcie,
odhaczaj za mnie w pliku, a usterki naprawiaj od razu (z testem) zamiast odkładać.
Po ostatnim punkcie zakończ linią „Następny krok: /clear, potem /dev-pr --czesc 1” (podsumowanie zadania
bez sekcji „Części PR”: „Następny krok: /clear, potem /dev-pr”). /dev-pr w tej sesji nie uruchamiaj.
```
