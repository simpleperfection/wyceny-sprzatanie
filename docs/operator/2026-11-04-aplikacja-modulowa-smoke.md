# Smoke operatora — Aplikacja z modułami, etap 5a (IU-1–IU-22)

Branch: `feature/aplikacja-modulowa` · Utworzono: 2026-11-04
Status: **do przejścia** — odhaczaj `[ ]` → `[x]` w miarę przechodzenia.

Automat (typecheck, testy zielone wg walidacji końcowej, 21 scenariuszy E2E w przeglądarce) jest zielony. Ta lista pokrywa
**wyłącznie to, czego automat nie mógł sprawdzić**: wygląd na prawdziwym ekranie wobec makiety, natywne okna (wybór pliku,
drukowanie do PDF), przejście do aplikacji telefonu i map, czas pracy palcem na realnym telefonie i jedną decyzję właściciela.

Dlaczego to nie jest formalność: E2E szło w emulowanym oknie 360×800 w Chromium na komputerze, a aplikacja ma działać głównie na telefonie.
Linki `tel:` i mapy kończą się w aplikacjach systemu, których test nie widzi. Pola daty, godziny i listy wyboru są natywne,
więc na telefonie wyglądają i działają inaczej niż w teście, a to one decydują o czasie założenia zlecenia.
Zrzut ani pomiar nie ocenią też, czy oferta wygląda jak dokument firmy, a PDF oferty sprawdzono tylko pod kątem liczby stron i tekstu, bez obejrzenia go jako obrazu.

## 0. Przygotowanie (5 min, plus jeden krok dzień wcześniej)
> Aplikacja nie ma backendu ani zmiennych środowiska (w gałęzi nie ma nowych zmiennych). Dane leżą w `localStorage` przeglądarki, więc nie ma projektu ani konta testowego do wybrania. Dane są osobne dla każdego adresu: na nowym adresie aplikacja startuje pusta, od kreatora startowego.

> **czystyzarobek.pl pokazuje wersję 1.** Publikuje się tam tylko `main`, więc ta gałąź będzie tam dopiero po scaleniu. Punkty **[fizyczne urządzenie]** wymagają osobnego adresu, patrz drugi punkt poniżej.

- [ ] Aplikacja wstaje (dev server): `npm start` w katalogu projektu → `Serwer: http://127.0.0.1:5174/`, strona otwiera się w przeglądarce na komputerze, bez błędów w konsoli
- [ ] Telefon ma dostęp do tej gałęzi: serwer dev nasłuchuje tylko na 127.0.0.1, więc telefon potrzebuje przekierowania, np. `adb reverse tcp:5174 tcp:5174` po USB (potem http://localhost:5174/ w Chrome na Androidzie) albo tunelu HTTPS → na telefonie otwiera się Start z kaflami modułów, a nie wersja 1 z dolnym menu

**Dzień przed punktem 4:** na telefonie załóż zlecenie jednorazowe z datą tego dnia, z ceną większą od 0 zł i płatnością za wizytę. Sekcja „Do zamknięcia” pomija wizyty sprzed dnia założenia zlecenia, więc zlecenie założone dziś z wczorajszą datą się w niej nie pojawi.

**Co będzie potrzebne w trakcie:** komputer z Chrome; telefon z dostępem do tej gałęzi; stoper; w aplikacji na telefonie uzupełnione dane firmy i co najmniej jeden klient z telefonem i adresem (najlepiej stały klient); jedna zapisana wycena z ofertą. Makieta: `docs/operator/aplikacja-modulowa-makiety.html`, przy działającym `npm start` pod http://127.0.0.1:5174/docs/operator/aplikacja-modulowa-makiety.html. Zrzuty z automatu są w `docs/active/aplikacja-modulowa/`, a po archiwizacji w `docs/completed/aplikacja-modulowa/`.

## 1. Wygląd i ekran Start (IU-8, IU-9)
Wejście: aplikacja na telefonie → ekran Start (`#/start`); makieta otwarta obok na komputerze.
- [ ] **[fizyczne urządzenie]** Porównaj nagłówek, przyciski, wiersze i kolory na telefonie z makietą (ekrany `start`, `wycena-modul`, `klienci-lista`, `zlecenia-dzien`) → układ i odcień zieleni zgodne z makietą zaakceptowaną 2026-11-03, tło białe, nie ma dolnego paska, tekst czytelny bez powiększania, przyciski dają się trafić palcem; każdą różnicę spisz jako uwagę
- [ ] **[fizyczne urządzenie]** Otwórz Start i bez instrukcji oceń, czy widać, że aplikacja ma moduły; potem dotknij kafla „Wycena” i „Szybka wycena” → kafle Zlecenia, Wycena, Klienci i Chemia są czytelne jako moduły, a po dwóch dotknięciach jesteś na formularzu szybkiej wyceny (`#/szybka`)

## 2. Klienci (IU-13)
Wejście: Start → kafel „Klienci” → karta klienta z telefonem i adresem.
- [ ] **[fizyczne urządzenie]** Dotknij wiersza z numerem („Zadzwoń”), wróć do aplikacji i dotknij wiersza z adresem („Pokaż na mapie”) → pierwszy otwiera dzwonienie z numerem klienta, drugi otwiera mapę z adresem klienta

## 3. Zlecenia: nowa seria (IU-16)
Wejście: Start → kafel „Zlecenia” → „Nowe zlecenie”.
- [ ] **[fizyczne urządzenie]** Ze stoperem załóż serię co tydzień u stałego klienta: klient, usługa, cena, data, godzina, „Co tydzień”, „Zapisz zlecenie” → całość trwa niecałą minutę; po zapisie widok Dzień daty startu pokazuje wizytę z godziną i nazwą klienta, a w widoku „Tydzień” kolejna wizyta jest tydzień później

## 4. Zlecenia: zamknięcie wizyty (IU-17)
Wejście: Start → kafel „Zlecenia” → widok Dzień, sekcja „Do zamknięcia” (zlecenie z kroku „Dzień przed punktem 4”).
- [ ] **[fizyczne urządzenie]** Przy wczorajszej wizycie dotknij „Zrobione”, potem „Zapłacone” → wizyta jest zamknięta z zapłatą po dwóch dotknięciach, bez wchodzenia w jej ekran, i znika z „Do zamknięcia”

## 5. Wycena: próg tekstu (faza 6, R8)
Wejście: Wycena → „Dokładna wycena”, potem „Szybka wycena”; rozmiary w `src/style/tokeny.css`.
- [ ] Decyzja właściciela: obejrzyj „Krok 2 z 5”, tytuł grupy dodatków „Mycie okien”, ceny pozycji w dodatkach i „Widełki dla klienta”. Tekst podstawowy ma 17 px, ale etykiety i opisy mają 15 px (`--tekst-maly`), a pigułki statusu i pasek postępu 14 px (`--tekst-drobny`), tak samo jak w makiecie. Scenariusze `kreator-wyglad-cena`, `szybka-pytania-wyglad` i `podsumowanie-wyglad` przeszły przy założeniu, że „tekst ≥ 17 px” dotyczy tekstu podstawowego → potwierdź to założenie albo zamów podniesienie tekstu drugorzędnego do 17 px; decyzję wpisz pod tym punktem

## 6. Oferta u klienta: link i PDF (IU-22)
Wejście: zapisana wycena → oferta → „Kopiuj link” i „PDF”.
- [ ] **[fizyczne urządzenie]** Skopiuj link oferty, otwórz go na tym samym telefonie, potem zapisz PDF i obejrzyj go → link i PDF wyglądają jak dokument Twojej firmy: nazwa i dane firmy są na miejscu, tło białe, kwota w kolorze tekstu bez zieleni, wszystko czytelne bez powiększania, PDF ma poprawny układ i nie ma w nim przycisków aplikacji

## 7. Ekran ratunkowy (IU-7)
Wejście: Chrome na komputerze, http://127.0.0.1:5174/. Ten punkt celowo psuje dane w przeglądarce, dlatego jest ostatni. Rób go tylko na adresie z serwera dev.
- [ ] Na `#/kopia` kliknij „Zrób kopię” i zapisz plik. W konsoli DevTools wpisz `localStorage.setItem('wyceny-sprzatanie:stan', '{uszkodzone')` i odśwież stronę. Na ekranie „Nie udało się odczytać danych zapisanych w przeglądarce.” kliknij „Wczytaj kopię z pliku”, wybierz zapisany plik i w dialogu kliknij „Anuluj” → systemowe okno wyboru pliku się otwiera, dialog ma tytuł „Zastąpić dane w tej przeglądarce?”, a po „Anuluj” ekran ratunkowy zostaje i `localStorage.getItem('wyceny-sprzatanie:stan')` nadal zwraca `{uszkodzone`. Na koniec wczytaj plik jeszcze raz i kliknij „Zastąp”, żeby odzyskać dane

## Znane problemy (nie blokują, sprawdź czy nadal występują)
Brak. Poza sekcją „Zamkniete” w `known-issues.md` są tylko nity P3, których smoke nie sprawdza, a wszystkie P1 i P2 z review są zamknięte.

## Punkty ze smoke'a etapu 5
Ta lista ich nie obejmuje, bo nie pochodzą z tego zadania. `PLAN.md` przewiduje jednak ich sprawdzenie razem z tym smokiem: iPhone, kopia przeniesiona z telefonu na komputer, link oferty na drugim telefonie i ekrany wobec makiet. Lista jest na końcu `docs/operator/2026-10-27-etap-5-aplikacja-wyceny-smoke.md`.

## Jak kontynuować w nowej sesji
Skopiuj jako pierwszą wiadomość:
```
Kontynuujemy smoke operatora zadania "aplikacja-modulowa" (branch feature/aplikacja-modulowa).
Checklista: docs/operator/2026-11-04-aplikacja-modulowa-smoke.md — prowadź mnie punkt po punkcie,
odhaczaj za mnie w pliku, a usterki naprawiaj od razu (z testem) zamiast odkładać.
Po ostatnim punkcie zakończ linią „Następny krok: /clear, potem /dev-pr --czesc 1” (podsumowanie zadania
bez sekcji „Części PR”: „Następny krok: /clear, potem /dev-pr”). /dev-pr w tej sesji nie uruchamiaj.
```
