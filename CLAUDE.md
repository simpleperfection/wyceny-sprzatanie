# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

Aplikacja PWA do wycen usług sprzątających i doboru chemii dla małych firm sprzątających (cały projekt jest po polsku: dane, identyfikatory opisowe, dokumentacja, commity). **`PLAN.md` jest źródłem prawdy**: linia „Status” mówi, który etap jest w toku, a sekcje „Ustalenia” i „Otwarte pytania” zawierają decyzje właściciela. Przy wznowieniu pracy zacznij od pierwszego niezamkniętego etapu i po każdym etapie zaktualizuj `PLAN.md` (status, ✅ przy etapie, hash commita).

Na razie repo zawiera dane (`data/`), materiały źródłowe (`research/`), skrypt kalibracji, parsery do zbierania chemii i szablon workflow Claude Code w `.claude/`; kodu aplikacji jeszcze nie ma. Aplikacja (etap 5) ma powstać w czystym HTML/JS bez kroku budowania i działać na GitHub Pages.

## Środowisko i polecenia

- Windows 11, Windows PowerShell 5.1, Node.js 24 LTS (od 2026-10-23). Pythona nie ma. Node jest potrzebny maszynerii szablonu `.claude/` (hooki, doctor, workflowy); skrypty, które generują pliki w `data/`, nadal pisz w PowerShellu, a sama aplikacja nie ma kroku budowania.
- Git Bash (narzędzie Bash) ma `perl` z `JSON::PP` i `pdftotext`. Używamy ich tylko pomocniczo, do zbierania chemii: `scripts/chemia/{tenzi,merida,voigt}.pl` czytają pobrane strony produktów (`perl scripts/chemia/tenzi.pl strona.html` → JSON z ceną, pH, dozowaniem i linkiem do karty), a `pdftotext -layout karta.pdf -` wyciąga pH (sekcja 9) i datę karty SDS. Instrukcja dla pozostałych dostawców jest w `PLAN.md`, etap 4.
- Przeliczenie danych po każdej zmianie `data/ceny.json` lub plików CSV w `research/`:
  ```
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\kalibracja.ps1
  ```
  Nie ma osobnych testów. Kontrolą jest sam skrypt: przerywa się (`throw`), gdy dane są niespójne, a na końcu wypisuje liczbę „niezgodności katalogu” (powinno być 0). Zmiany w wynikach sprawdzaj przez `git diff` na `data/rynek.json`, `data/normy.json` i `research/KALIBRACJA.md`.
- Git, GitHub CLI i Node.js są zainstalowane w Program Files. Jeśli w PowerShellu nie ma ich w PATH, odśwież zmienną: `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')` (w Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"`). Polecenie `gh auth login` uruchamia właściciel w osobnym oknie PowerShell, nie w panelu terminala aplikacji.

## Szablon workflow `.claude/`

- `.claude/` to szablon [claude-code-starter](https://github.com/AIBiz-Automatyzacje/claude-code-starter) (commit `ba195e3`, zainstalowany 2026-10-23): pipeline `dev-*` (`/dev-brainstorm` → `/dev-plan` → `dev-autopilot-wf` → `/dev-pr`), agenci, reguły, hooki i workflowy. Szablon jest zestrojony pod React + Supabase; w tym projekcie przydają się głównie pipeline, review i baza wiedzy. Zmiany z szablonu zaciąga `/sync-template`.
- Sprawdzian środowiska (w Git Bash): `bash .claude/scripts/doctor/doctor.sh`. `WYNIK: OK` = można startować. Jedyna uwaga to niezainstalowany plugin `dev-browser` (pipeline go nie woła).
- Dostosowania do tego repo: `.gitattributes` wymusza LF w `*.sh` (przy `core.autocrlf=true` Git Bash nie czyta CRLF), `.gitignore` przepuszcza wzorce `.env*.example`, a ścieżki hooków Stop w `.claude/settings.json` są w cudzysłowie, bo katalog projektu ma spacje. Po `/sync-template` sprawdź, czy cudzysłowy zostały.
- `claude` nie ma w PATH. Polecenia `claude plugin …` uruchamia się CLI dołączonym do aplikacji desktop: `%LOCALAPPDATA%\Claude-Data\<profil>\claude-code\<wersja>\<hash>\claude.exe`.

## Przepływ danych

```
research/*.csv ──(ręcznie)──────────────► data/ceny.json
research/cenniki_firm.csv ┐
research/kb_wojewodztwa.csv ├─► scripts/kalibracja.ps1 ─► data/rynek.json
data/ceny.json ────────────┘                           ├► data/normy.json
                                                       └► research/KALIBRACJA.md
strony dostawców + karty SDS ──(scripts/chemia, ręcznie)──► data/chemia.json
```

- `data/ceny.json` edytuje się ręcznie: katalog usług, ceny krajowe, progi metrażu, poziomy brudu i koszty firmy. Każda cena ma `zrodla` (klucze z sekcji `zrodla` na początku pliku), `zakres`, `pewnosc` (wysoka/średnia/niska wg liczby punktów danych) i zwykle `wyliczenie`. Nowe źródło dopisz do `zrodla` i opisz w `research/ZRODLA.md` (z datą i linkiem).
- `data/chemia.json` też edytuje się ręcznie: dostawcy z `research/DYSTRYBUTORZY.md`, kategorie środków powiązane z `brud[].id` w `normy.json` i kluczami pozycji (`usługa.pozycja`) w `ceny.json`, produkty z ceną, pH, stężeniami (`proc` = % koncentratu w roztworze) i linkiem do karty SDS. Opis pól jest w `meta` pliku. Po zmianie sprawdź, czy JSON się wczytuje (np. `perl -MJSON::PP -e 'local $/; open my $f, "<", "data/chemia.json"; JSON::PP->new->utf8->decode(<$f>); print "OK\n"'` w Git Bash) i czy działają nowe linki `cena_zrodlo.url` i `sds.url`. Skrypt kalibracji jeszcze nie czyta tego pliku: koszt chemii w `data/ceny.json` (`koszty_firmy.chemia_h`, `koszt_chemii_m2`, `koszt_chemii_szt`) to wciąż szacunki, które mają zostać wyliczone z `chemia.json` (etap 4).
- `data/rynek.json`, `data/normy.json` i `research/KALIBRACJA.md` są **generowane** – nie edytuj ich ręcznie, tylko zmień dane wejściowe albo skrypt. Data wersji jest wpisana na sztywno w `$dzis` na początku skryptu.
- Pliki CSV w `research/` mają separator `;` i kropkę dziesiętną. Każdy wiersz ceny ma źródło i link.

## Model wyceny

Pełne wzory są w `data/normy.json` (`meta.wzor`, `meta.wzor_pozycji`, `meta.cena`). Są dwa tryby usług (pole `tryb` w `data/ceny.json`):

- **`pomieszczenia`** (mieszkania, biura): czas = przygotowanie + Σ m² × (norma pomieszczenia × `mnoznik_zakresu` usługi × próg wydajności biura + dodatek za brud wg poziomu 1–3); cena = czas / 60 × `stawka_h` województwa z `data/rynek.json`.
- **`pozycje`** (okna, tapicerka, dywany, posadzki, kostka, elewacje, hale, AGD): cena = ilość × cena krajowa × `wsp` województwa × mnożnik progu metrażu (`progi_metrazu`) × mnożnik poziomu brudu. Czas pozycji służy tylko do liczenia kosztu firmy.
- Do tego dodatki, dojazd i `minimum_zl`. Podsumowanie pokazuje cenę, koszt firmy (praca, chemia, sprzęt, dojazd) i marżę.

Normy są kalibrowane tak, żeby model trafiał w mediany rynkowe: stawka 65 zł/h, mieszkanie 50 m² = 250 zł, sprzątanie po remoncie 11,75 zł/m². Przyszły silnik wyceny w JS ma dawać **te same wyniki co scenariusze w `research/KALIBRACJA.md`**, więc logika `Minuty`, `Prog`, `Chemia-Jednostki` i `Material` w skrypcie jest specyfikacją referencyjną.

Zależności, które skrypt sprawdza (dodając dane, uzupełnij obie strony):
- każda pozycja usługi w `data/ceny.json` musi mieć normę czasu w `$czasPozycji` (min/szt.) albo w `$wydajnosc` (m²/h) w skrypcie, i odwrotnie;
- każda usługa w trybie `pozycje` (oprócz `tylko_dodatek`) musi mieć wpis w `$przygotowanieUslug`;
- każde wykluczenie wartości odstającej w `$wykluczenia` musi pasować do wiersza `research/cenniki_firm.csv`;
- ceny `okna.okno_1`, `tapicerka.kanapa_3` i `dywany.dywan` w `data/ceny.json` muszą być równe medianom skanu.

## Pułapki PowerShell 5.1 w `scripts/kalibracja.ps1`

- Plik musi być zapisany jako **UTF-8 z BOM**, inaczej polskie litery w literałach się psują. Po edycji sprawdź pierwsze bajty (`EF BB BF`).
- Zmienne nie rozróżniają wielkości liter (`$H` i `$h` to ta sama zmienna, podobnie `$F`/`$f`, `$K`/`$k`).
- Nazwy funkcji nie mogą pokrywać się z aliasami (np. `R` to `Invoke-History`, dlatego funkcja nazywa się `Rnd`).
- Polskie cudzysłowy „ ” w stringu w podwójnym cudzysłowie kończą string – używaj ich tylko w '…'.
- JSON zapisuje własna funkcja `To-Json` (UTF-8 bez BOM, polskie znaki bez `\u`, krótkie tablice w jednej linii), a nie `ConvertTo-Json`.

## Repozytorium

Repo jest publiczne: https://github.com/simpleperfection/wyceny-sprzatanie (gałąź `main`). Lokalna tożsamość Git to adres noreply GitHuba – nie zmieniaj jej, żeby prywatny e-mail właściciela nie trafił do historii. Commity piszemy po polsku.
