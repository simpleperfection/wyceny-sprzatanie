# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

Aplikacja PWA do wycen usług sprzątających i doboru chemii dla małych firm sprzątających (cały projekt jest po polsku: dane, identyfikatory opisowe, dokumentacja, commity). **`PLAN.md` jest źródłem prawdy**: linia „Status” mówi, który etap jest w toku, a sekcje „Ustalenia” i „Otwarte pytania” zawierają decyzje właściciela. Przy wznowieniu pracy zacznij od pierwszego niezamkniętego etapu i po każdym etapie zaktualizuj `PLAN.md` (status, ✅ przy etapie, hash commita).

Na razie repo zawiera dane (`data/`), materiały źródłowe (`research/`), skrypt kalibracji, parsery do zbierania chemii, dokumenty wymagań z brainstormów (`docs/brainstorms/`), checklistę i szkice ekranów etapu 5 (`docs/operator/`), plan techniczny etapu 5 z makietami (`docs/plans/`), zadanie dla autopilota (`docs/active/etap-5-aplikacja-wyceny/`, gałąź `feature/etap-5-aplikacja-wyceny`), skrypty do Figmy (`scripts/figma/`) i szablon workflow Claude Code w `.claude/`; kodu aplikacji jeszcze nie ma. Aplikacja (etap 5) ma powstać w czystym HTML/JS bez kroku budowania i działać na GitHub Pages; układ plików, silnik i kolejność prac opisuje plan `docs/plans/2026-10-24-001-feat-etap-5-aplikacja-wyceny-plan.md`. Jej zakres poza kreatorem wyceny (szybka wycena przez telefon, własne tempo, oferta z zakresem prac; wymagania R1–R24, z których cenę minimalną z kosztów firmy, R1–R4 i R6, właściciel wyciął 2026-10-24) opisuje `docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md`.

## Środowisko i polecenia

- Windows 11, Windows PowerShell 5.1, Node.js 24 LTS (od 2026-10-23). Pythona nie ma. Node jest potrzebny maszynerii szablonu `.claude/` (hooki, doctor, workflowy); skrypty, które generują pliki w `data/`, nadal pisz w PowerShellu, a sama aplikacja nie ma kroku budowania.
- Git Bash (narzędzie Bash) ma `perl` z `JSON::PP` i `pdftotext`. Używamy ich tylko pomocniczo, do zbierania chemii: `scripts/chemia/{tenzi,merida,voigt}.pl` czytają pobrane strony sklepów (`perl scripts/chemia/tenzi.pl strona.html` → JSON z ceną, pH, dozowaniem i linkiem do karty), `scripts/chemia/{kiehl,medisept,buzil}.pl` – strony producentów (pH, dozowanie, karta; ceny tych marek są ze sklepów dystrybutorów), a `pdftotext -layout karta.pdf -` wyciąga pH (sekcja 9) i datę karty SDS. Karty Buzila pobiera się tylko formularzem POST (opis w nagłówku `buzil.pl`).
- Makiety etapu 5 są w pliku Figmy `sDtiv6VdCbpyfM6Gfs7Xej`: link i ID ekranów są w sekcji 4 `docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md`, a kolory w zmiennych (kolekcja „Kolory v3”). Konto właściciela (plan Starter, miejsce View) ma limit 20 wywołań MCP Figmy miesięcznie i **`use_figma` też się do niego wlicza**; limit wyczerpał się 2026-10-24. Zmiany w Figmie zbieraj w jeden skrypt (np. `scripts/figma/etap-5-wariant-b.js`), a przy wyczerpanym limicie pokazuj propozycje jako HTML w `docs/operator/`. Buildery nie czytają Figmy: makiety to PNG w `docs/plans/etap-5-aplikacja-wyceny-figma/` ze `SPEC.md` (tokeny wariantu B) i opisami w `ekrany/`. Eksport w aplikacji Figma nie zużywa limitu; gdy właściciel wyeksportuje całe sekcje zamiast ramek, ekrany wycina `node scripts/figma/wytnij-ekrany.mjs <katalog sekcji> <katalog wyjściowy>` (kolumny 720 px co 840 px od x = 80 przy eksporcie 2x).
- Przeliczenie danych po każdej zmianie `data/ceny.json` lub plików CSV w `research/`:
  ```
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\kalibracja.ps1
  ```
  Nie ma osobnych testów. Kontrolą jest sam skrypt: przerywa się (`throw`), gdy dane są niespójne, a na końcu wypisuje liczbę „niezgodności katalogu” (powinno być 0). Zmiany w wynikach sprawdzaj przez `git diff` na `data/rynek.json`, `data/normy.json` i `research/KALIBRACJA.md`.
- Git, GitHub CLI i Node.js są zainstalowane w Program Files. Jeśli w PowerShellu nie ma ich w PATH, odśwież zmienną: `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')` (w Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"`). Polecenie `gh auth login` uruchamia właściciel w osobnym oknie PowerShell, nie w panelu terminala aplikacji.

## Szablon workflow `.claude/`

- `.claude/` to szablon [claude-code-starter](https://github.com/AIBiz-Automatyzacje/claude-code-starter) (commit `ba195e3`, zainstalowany 2026-10-23): pipeline `dev-*` (`/dev-brainstorm` → `/dev-plan` → `dev-autopilot-wf` → `/dev-pr`), agenci, reguły, hooki i workflowy. Szablon jest zestrojony pod React + Supabase; w tym projekcie przydają się głównie pipeline, review i baza wiedzy. Zmiany z szablonu zaciąga `/sync-template`.
- Sprawdzian środowiska (w Git Bash): `bash .claude/scripts/doctor/doctor.sh`. `WYNIK: OK` = można startować (stan z 2026-10-23: OK, bez uwag). Pluginy projektu: `dev-browser` w zakresie projektu, `figma` na koncie właściciela.
- Dostosowania do tego repo: `.gitattributes` wymusza LF w `*.sh` (przy `core.autocrlf=true` Git Bash nie czyta CRLF), `.gitignore` przepuszcza wzorce `.env*.example`, a ścieżki hooków Stop w `.claude/settings.json` są w cudzysłowie, bo katalog projektu ma spacje. Próbny zrzut `agent-browser` w `.claude/scripts/e2e/srodowisko.mjs` (`NARZEDZIA.zrzut`) pisze wyjście do pliku zamiast do potoków: na Windows demon przeglądarki dziedziczy potoki i bez tego bootstrap autopilota wisiał 30 s i stawał (2026-10-24). Po `/sync-template` sprawdź, czy cudzysłowy i ta poprawka zostały. 23 testy w `.claude/scripts/e2e/__tests__/` są czerwone na Windows już w szablonie (ścieżki `/tmp`).
- `claude` nie ma w PATH. Polecenia `claude plugin …` uruchamia się CLI dołączonym do aplikacji desktop: `%LOCALAPPDATA%\Claude-Data\<profil>\claude-code\<wersja>\<hash>\claude.exe`.
- Autopilota (`Workflow({ scriptPath: ".claude/workflows/dev-autopilot-wf.js", … })`) uruchamia się w tym interaktywnym CLI, w osobnym oknie PowerShell (`Start-Process powershell …`), bo w panelu terminala aplikacji klawisze nie docierają do CLI. Sesja w zakładce Code aplikacji desktop nie ma narzędzia `Workflow` (sprawdzone 2026-10-24).
- `agent-browser` (npm global, od 2026-10-24) ma w `%APPDATA%\npm` dodatkowo `agent-browser.exe`: twarde dowiązanie do `node_modules\agent-browser\bin\agent-browser-win32-x64.exe`. Skrypty szablonu wołają go przez `spawnSync` bez powłoki, a to na Windows nie widzi skrótów `.cmd`. Po `npm update -g agent-browser` dowiązanie trzeba utworzyć od nowa, bo zostaje przy starej binarce.

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
- `data/chemia.json` też edytuje się ręcznie: dostawcy z `research/DYSTRYBUTORZY.md`, kategorie środków powiązane z `brud[].id` w `normy.json` i kluczami pozycji (`usługa.pozycja`) w `ceny.json` (każda pozycja ma kategorię albo wpis w `bez_kategorii`; nową pozycję usługi dopisz do jednego z nich), produkty z ceną, pH, stężeniami (`proc` = % koncentratu w roztworze) i linkiem do karty SDS. Opis pól jest w `meta` pliku. Po zmianie sprawdź, czy JSON się wczytuje (np. `perl -MJSON::PP -e 'local $/; open my $f, "<", "data/chemia.json"; JSON::PP->new->utf8->decode(<$f>); print "OK\n"'` w Git Bash) i czy działają nowe linki `cena_zrodlo.url` i `sds.url`. Plik służy tylko do doboru środków do usługi i brudu. **Kosztu chemii z niego nie liczymy**, bo ceny i dozowanie są różne u każdego producenta (decyzja właściciela 2026-10-23). Skrypt kalibracji go nie czyta, a koszt chemii w `data/ceny.json` (`koszty_firmy.chemia_h`, `koszt_chemii_m2`, `koszt_chemii_szt`) to szacunki, które firma może zmienić w aplikacji.
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
