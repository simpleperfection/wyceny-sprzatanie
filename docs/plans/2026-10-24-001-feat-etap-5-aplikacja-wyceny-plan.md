---
title: "feat: Aplikacja PWA do wycen (etap 5)"
type: feat
status: active
date: 2026-10-24
origin: docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md
design_md: null
figma_spec: ./docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md
figma_screens:
  ekran-startowy: ./docs/plans/etap-5-aplikacja-wyceny-figma/ekran-startowy.png
  ustawienia-firmy: ./docs/plans/etap-5-aplikacja-wyceny-figma/ustawienia-firmy.png
  szybka-wycena: ./docs/plans/etap-5-aplikacja-wyceny-figma/szybka-wycena.png
  pytania-do-klienta: ./docs/plans/etap-5-aplikacja-wyceny-figma/pytania-do-klienta.png
  kreator-wybor-uslugi: ./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-wybor-uslugi.png
  kreator-pomieszczenia: ./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-pomieszczenia.png
  kreator-pozycje: ./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-pozycje.png
  kreator-dodatki: ./docs/plans/etap-5-aplikacja-wyceny-figma/kreator-dodatki.png
  dobor-chemii: ./docs/plans/etap-5-aplikacja-wyceny-figma/dobor-chemii.png
  podsumowanie-wyceny: ./docs/plans/etap-5-aplikacja-wyceny-figma/podsumowanie-wyceny.png
  zakonczenie-zlecenia: ./docs/plans/etap-5-aplikacja-wyceny-figma/zakonczenie-zlecenia.png
  oferta-edycja: ./docs/plans/etap-5-aplikacja-wyceny-figma/oferta-edycja.png
  oferta-klient: ./docs/plans/etap-5-aplikacja-wyceny-figma/oferta-klient.png
  kopia-zapasowa: ./docs/plans/etap-5-aplikacja-wyceny-figma/kopia-zapasowa.png
operator_prep: docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md
---

# feat: Aplikacja PWA do wycen (etap 5)

## Przegląd

Powstaje aplikacja PWA w czystym HTML i JavaScript (bez kroku budowania, hosting statyczny): silnik wyceny przeniesiony
ze `scripts/kalibracja.ps1`, dane firmy i wycen w przeglądarce z kopią do pliku, kreator dokładnej wyceny z doborem chemii
i podsumowaniem („zostaje dla Ciebie X zł, czyli Y zł za godzinę”), szybka wycena przez telefon z pytaniami do klienta,
zakończenie zlecenia z własnym tempem oraz oferta dla klienta jako link i PDF. Plan obejmuje cały etap 5 z `PLAN.md`
i wymagania R5, R7–R24 z dokumentu źródłowego.

## Ujęcie problemu

Początkująca firma sprzątająca nie wie, ile brać, nie zna swojego tempa i wpada w spory o zakres prac
(zob. źródło: docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md). Dane rynkowe i normy są gotowe
(`data/ceny.json`, `data/normy.json`, `data/rynek.json`, `data/chemia.json`), ale nie ma aplikacji, która z nich liczy
wycenę przy kliencie i daje ofertę. Firma jest jednoosobowa: sprząta sam właściciel, więc zamiast kosztu robocizny
aplikacja pokazuje, ile zostaje dla niego za godzinę pracy.

## Śledzenie wymagań

- R5. W każdej wycenie (szybkiej i dokładnej) cena proponowana = mediana województwa z modelu z widełkami rynku; pod nią koszt zlecenia: czas z własnym tempem, chemia, sprzęt i dojazd.
- R7. Właściciel może ręcznie zmienić cenę; aplikacja na bieżąco pokazuje, ile zostaje i realną stawkę za godzinę.
- R8. Ceny to kwoty płacone przez klienta; jedyne ustawienie podatkowe to status VAT (zwolniony albo czynny); czynny ma ceny z VAT 23% i netto obok.
- R9. Zamiast marży zdanie „zostaje dla Ciebie X zł, czyli Y zł za godzinę Twojej pracy” (cena minus chemia, sprzęt i dojazd, przez czas pracy); bez celu godzinowego.
- R10. Szybka wycena (mieszkania standard, gruntowne, po wynajmie; biura jednorazowo; okna; tapicerka; dywany; AGD): metraż, łazienki, kuchnia albo aneks, spodziewany stan; wynik to widełki.
- R11. Usługi wymagające oględzin (po remoncie, doczyszczanie, mycie posadzek, kostka, elewacja, hale): „orientacyjnie od X zł” i zalecenie oględzin albo zdjęć.
- R12. Szybka wycena daje gotowy tekst dla klienta z widełkami i zastrzeżeniem „cena ostateczna po obejrzeniu lokalu lub zdjęć”.
- R13. Pytania do klienta osobne dla każdej usługi; odpowiedzi zapisane przy wycenie; odpowiedź z odpowiednikiem w modelu (zwierzęta → sierść, odległość → dojazd) ustawia go sama.
- R14. Szybką wycenę można zamienić w dokładną bez wpisywania danych od nowa.
- R15. Domyślne tempo nowej firmy 1,3× normy, widoczne i zmienialne; zmienia czas i to, co zostaje za godzinę, nie cenę rynkową.
- R16. Po wykonaniu zlecenia wpis faktycznego czasu; plan i fakt oraz realna stawka za godzinę.
- R17. Własne tempo z zapisanych zleceń zamiast 1,3×: najpierw wspólne, osobne dla usługi od 3 wpisów; podstawa wyliczenia („1,18× z 7 zleceń”); powrót do wartości ręcznej.
- R18. Oferta jako link (telefon) i PDF: dane firmy, usługa, opcjonalnie adres i termin, cena wg R8, zakres „wchodzi / nie wchodzi”, dodatki opcjonalne z cenami, warunki, ważność (domyślnie 14 dni).
- R19. Zakres „wchodzi / nie wchodzi” gotowy dla każdej usługi i rodzaju sprzątania; zmiana raz w ustawieniach albo tylko w jednej ofercie.
- R20. Warunki domyślne do edycji: bezpłatne odwołanie do 24 h, później 50%; brak dostępu do lokalu 50%; zdjęcia przed i po; przy szybkiej wycenie zastrzeżenie o stanie lokalu; bez zaliczki.
- R21. Oferta nigdy nie pokazuje kosztów firmy, tempa ani tego, ile zostaje dla właściciela.
- R22. Link do oferty działa bez logowania i instalacji; dane klienta nie trafiają na żaden serwer.
- R23. Wszystkie dane tylko w przeglądarce; eksport i import kopii do pliku; regularne przypomnienie o kopii.
- R24. Krótki kreator ustawień przy pierwszym uruchomieniu (województwo, VAT, dane firmy, tempo); można go pominąć — wtedy wartości domyślne i znacznik „ustawienia domyślne – uzupełnij”.
- R25. Kreator dokładnej wyceny z paskiem postępu: usługa i województwo → pomieszczenia i brud albo pozycje → dodatki i dojazd → dobór chemii → podsumowanie (`PLAN.md`, etap 5).
- R26. Dobór chemii: środki z `data/chemia.json` dobrane do brudu i pozycji usługi, z przeznaczeniem, pH, stężeniem, ceną i linkiem do karty SDS; kosztu chemii z bazy nie liczymy (`PLAN.md`, cel 2 i decyzja 2026-10-23).
- R27. Silnik wyceny w JS daje te same wyniki co scenariusze z `research/KALIBRACJA.md` (`CLAUDE.md`, kryterium sukcesu źródła).
- R28. PWA na telefon i komputer: instalacja na ekranie początkowym, działanie offline, hosting statyczny bez kroku budowania (`PLAN.md`, Ustalenia).
- R29. Zapis wycen w przeglądarce i lista wycen ze statusami (`PLAN.md`, etap 5; makieta `ekran-startowy`).

R1–R4 i R6 zostały usunięte ze źródła 2026-10-24 (cena minimalna z kosztów firmy) i nie są realizowane.

## Granice zakresu

- Bez ceny minimalnej z kosztów firmy (ZUS, podatek dochodowy, koszty stałe, kwota „na rękę”) — decyzja właściciela 2026-10-24 (zob. źródło).
- Bez etapu E: przypomnień o kontakcie po wysłaniu oferty (wiersz „Brak odpowiedzi od 3 dni” z makiety startu), cennika do publikacji i szablonów odpowiedzi.
- Bez etapu G (bezpieczeństwo chemii z kart SDS), bez rabatu za częstotliwość przy mieszkaniach, bez pracowników, bez konta i synchronizacji, bez działalności nierejestrowanej.
- Bez akceptacji oferty online, zaliczek i płatności, wariantów cenowych, zdjęć w aplikacji, logo w ofercie, grafiku, faktur i doradztwa podatkowego (zob. źródło, „Poza zakresem”).
- Bez publikacji: GitHub Pages, adres aplikacji, `.nojekyll`, docelowe ikony i barwy marki należą do etapu 6.
- Bez edycji progów metrażu, minimum zlecenia i mnożników brudu w aplikacji (zostają w `data/ceny.json`); w ustawieniach zmienia się tylko szacunki kosztów (chemia, sprzęt, dojazd) i stawki dojazdu dla klienta.
- Bez faktycznej kwoty przy zakończeniu zlecenia (R16 przewiduje tylko czas); realna stawka liczy się z ceny wyceny.
- Bez danych nowej usługi „doczyszczanie mieszkań i obiektów po budowie”: to osobne zadanie danych (ceny ze źródłami, normy w `scripts/kalibracja.ps1`); aplikacja pokaże ją bez zmian w kodzie, gdy pojawi się w `data/ceny.json`.
- Bez liczenia kosztu chemii z `data/chemia.json` (decyzja 2026-10-23).
- Bez makiet na komputer i stanów innych niż główny: układ na komputer to ta sama kolumna wyśrodkowana do 560 px, pozostałe stany powstają z komponentów makiet; akceptuje je właściciel.

## Kontekst i research

### Relevantny kod i wzorce

- `scripts/kalibracja.ps1` — specyfikacja referencyjna silnika: `Uklad-Mieszkania`, `Uklad-Biura`, `Skala-Biura`, `Minuty`, `Z-Brudem`, `Minuty-Uslugi`, `Prog`, `Chemia-Jednostki`, `Material`, sekcje 2–7 raportu (scenariusze).
- `data/normy.json` — `przygotowanie_min`, `przygotowanie_min_uslug`, `zestawy_pomieszczen`, `progi_wydajnosci.biuro`, `brud` (min/m² dla poziomów 1–3), `poziomy`, `pozycje` (`min_na_jednostke`, `wydajnosc_m2_h`); wzory w `meta.wzor`, `meta.wzor_pozycji`, `meta.cena`.
- `data/ceny.json` — `uslugi` (`tryb`, `grupa`, `podstawa_ceny`, `mnoznik_zakresu`, `brud_domyslny`, `dodatki`, `minimum_zl`, `warianty`, `progi`, `poziomy_brudu`, `tylko_dodatek`, `pozycje` z `cena`, `zakres`, `jednostka`, `sprzet`, `koszt_chemii_m2|szt`, `doliczaj_material`, `typ: "doplata"`), `progi_metrazu`, `poziomy_brudu`, `koszty_firmy` (chemia_h, sprzęt, dojazd).
- `data/rynek.json` — `kraj` (mediany i zakresy: stawka_h, mieszkanie_50m2, po_remoncie_m2, okno, kanapa, dywan), `wojewodztwa` (`id`, `nazwa`, `wsp`, `stawka_h`).
- `data/chemia.json` — `kategorie` (`id`, `nazwa`, `brud`, `pozycje`, `produkty`), `bez_kategorii`, `produkty` (`ph`, `stezenia`, `gotowy`, `cena_brutto`, `opakowanie`, `sds`), `dostawcy`.
- `docs/operator/etap-5-wariant-b.html` — układ czterech zaakceptowanych ekranów (start, szybka wycena, podsumowanie, oferta) z tekstami i tokenami wariantu B.
- `scripts/chemia/*.pl` i `scripts/figma/etap-5-wariant-b.js` — bez wpływu na kod aplikacji.

### Wiedza instytucjonalna

- Repo nie ma `docs/solutions/` ani `docs/learned-patterns.md`; wiedza projektu jest w `CLAUDE.md` i pamięci sesji.
- Pułapki PowerShell 5.1 w `scripts/kalibracja.ps1` (`CLAUDE.md`): plik w UTF-8 z BOM, zmienne bez rozróżniania wielkości liter (`$H` = `$h`), funkcje nie mogą nazywać się jak aliasy (`R`), polskie cudzysłowy tylko w stringach '…', JSON zapisuje funkcja `To-Json`.
- `data/normy.json`, `data/rynek.json` i `research/KALIBRACJA.md` są generowane — zmienia się skrypt, nie pliki.
- Szablon `.claude/` jest zestrojony pod React + Supabase; reguły `.claude/rules/coding-rules.md` dotyczące Reacta, Supabase, Zod i Hono nie mają tu zastosowania, a reszta (rozmiar plików i funkcji, nazewnictwo, testy, obsługa błędów, bezpieczeństwo) obowiązuje.

### Referencje zewnętrzne

- Compression Streams API (`CompressionStream('deflate-raw')`, `DecompressionStream`): Chrome 80+, Firefox 113+, Safari 16.4+, Node 18+.
- Safari (ITP) usuwa dane strony zapisane skryptem po 7 dniach bez wizyty, gdy strona nie jest dodana do ekranu początkowego; aplikacja z ekranu początkowego na iOS ma osobny magazyn od Safari.
- `node --test` z wzorcami glob w argumentach (Node 22+); TypeScript `checkJs` dla typów JSDoc.
- Tabler Icons (MIT), Source Sans 3 (SIL OFL 1.1) — pliki dołączone do repo, bez CDN w działającej aplikacji.

## Kluczowe decyzje techniczne

- Stos: czysty JavaScript (moduły ES, typy w JSDoc), bez frameworka i bez kroku budowania; narzędzia deweloperskie w `package.json`: testy `node --test`, typy `tsc` z `checkJs` (jedyna zależność deweloperska: `typescript`, przypięta dokładnie). Decyzja właściciela w `/dev-plan` 2026-10-24.
- Typecheck obejmuje `src/**/*.js` bez plików testów; testy i skrypty Node (`scripts/*.mjs`, `tests/*.js`) biegną bez typecheck, żeby nie dokładać `@types/node`.
- Skrypt `test` wskazuje katalogi aplikacji jawnie (`src/**/*.test.js`, `scripts/**/*.test.mjs`), bo `node --test` bez argumentów zebrałby 113 testów maszynerii z `.claude/**`.
- Układ repo: `index.html`, `oferta.html`, `manifest.webmanifest` i `sw.js` w katalogu głównym (zakres service workera = katalog aplikacji), kod w `src/`, style w `src/style/`, fonty w `fonty/`, ikony w `ikony/`, dane w `data/`. Wszystkie adresy względne, bo adres publikacji (GitHub Pages albo subdomena) rozstrzyga etap 6.
- Warstwy: `src/silnik/` (czyste funkcje wyceny, bez DOM i bez magazynu) → `src/dane/` (stan użytkownika w localStorage) → `src/kreator/` i `src/oferta/` (logika ekranów i oferty) → `src/widoki/` i `src/ui/` (DOM). Widok nie liczy ceny sam i nie czyta localStorage bezpośrednio.
- Silnik czyta normy z `data/normy.json`, a układy typowego mieszkania i biura dostaje w strukturze `uklady` dopisanej do `normy.json` przez `scripts/kalibracja.ps1` — jedno źródło układu dla skryptu i aplikacji. Zgodność pilnuje test parytetu na pliku `research/kalibracja-scenariusze.json`, który skrypt zapisuje obok raportu (R27).
- Szybka wycena mieszkania rozkłada metraż funkcją układu ze skryptu (kuchnia 16% w granicach 6–14 m², przedpokój 12%, łazienka 4 m² do 60 m², 5 m² do 100 m², 8 + 5 m² powyżej, reszta pokoje); domyślna liczba łazienek wynika z metrażu, więc szybka wycena 50 m² daje to samo co skrypt (odroczone pytanie źródła do R10). Inna liczba łazienek skraca listę domyślną albo dokłada łazienki o metrażu ostatniej pozycji. Aneks ma 10% metrażu w granicach 4–8 m² (założenie planu, do potwierdzenia przez właściciela), reszta przechodzi do pokoi.
- Spodziewany stan w szybkiej wycenie (decyzja właściciela w `/dev-plan` 2026-10-24: „typowy = mediana”): poziom N = reguła brudu `kurz` na poziomie N we wszystkich pomieszczeniach (poziom 1 jest już w normie); typowy = widełki od poziomu 1 do 2, mocny = od 2 do 3, lekki = poziom 1 („ok. X zł”). Dla usług z pozycjami widełki od ceny do ceny × mnożnik poziomu 2 z `poziomy_brudu` w `data/ceny.json` (1,2). Granice zaokrąglane do 10 zł (dolna w dół, górna w górę).
- VAT (decyzja właściciela w `/dev-plan` 2026-10-24: „wg podstawy ceny”): firma zwolniona bierze kwotę modelu; czynny podatnik przy `podstawa_ceny: "brutto"` traktuje kwotę modelu jako brutto (netto = brutto / 1,23), a przy `"netto"` (biura, posadzki, doczyszczanie, hale) dolicza 23% na górze. „Zostaje dla Ciebie” czynnego podatnika liczy się od netto. Stawka VAT siedzi w `data/domyslne.json` (do potwierdzenia w źródłach; zmiana to zmiana danych).
- Widełki rynku: usługi z pomieszczeniami — cena modelu × (zakres / mediana) z pozycji `kraj` w `data/rynek.json` wskazanej nowym polem `rynek_odniesienie` usługi; usługi z pozycjami — suma zakresów pozycji × wsp × próg × brud; pozycja z `zakres: null` wchodzi kwotą modelu na obu końcach i oznacza widełki jako niepełne.
- Kolejność ceny: Σ linii usługi i dodatków „w cenie” → minimum zlecenia → dojazd klienta. Próg metrażu liczy się z ilości danej pozycji (jak `Prog` w skrypcie) i — tak jak mnożnik brudu z `poziomy_brudu` (cena i czas) — dotyczy tylko pozycji głównych; dopłaty (`typ: "doplata"`) idą po cenie × wsp (makieta `kreator-pozycje`: „dopłata · 40 m² × 7,50 zł”). Materiał doliczany klientowi (`doliczaj_material`) idzie bez wsp, progu i brudu. Dodatki z innych usług (np. okna przy mieszkaniu) mają tryb „w cenie” (bez własnego minimum i przygotowania) albo „zaproponuj w ofercie” (poza ceną i czasem, w ofercie jako „Możesz dobrać”; makieta `kreator-dodatki`). Abonament biura: cena, minimum i dojazd za wizytę, miesięcznie = × `wizyt_w_miesiacu`.
- Ustalenia z PNG makiet (eksport 2026-10-24): pomieszczenie ma nazwę (domyślna z typu, np. „Pokój”) i domyślnie kurz na poziomie 1, który jest w normie i nie dokłada czasu; usługi m² z progami (posadzki, doczyszczanie, kostka, elewacja, hale) mają jedną powierzchnię i przełączniki pozycji, a okna, tapicerka i dywany — liczniki pozycji; pytania do klienta to osobny ekran `#/wycena/:id/pytania`; przypomnienie o kopii co 7, 14 albo 30 dni (domyślnie 7); szybka wycena nie ma przycisku „Zapisz” — zapisuje ją „Kopiuj tekst” i „Dokładna wycena”; klienta wpisuje się przy zapisie podsumowania albo w ofercie; czas zlecenia wpisuje się licznikiem co 15 min; kreator ma nagłówek „Nowa wycena” i podtytuł „Krok n z 5 · …”.
- Świadome odstępstwa od makiet: nagłówek startu i dane przykładowe jak w podglądzie wariantu B (data i nazwa firmy zamiast „Dzień dobry, Anna”); szybka wycena dostaje dodatkową linię „Zostaje dla Ciebie” (R5 wymaga kosztu w każdej wycenie); zdanie o kopii w karcie „Wczytaj kopię z pliku” mówi o wyborze „połącz / zastąp”.
- Dojazd: pole „odległość do klienta (km, w jedną stronę)”; klient płaci (km − darmowy promień) × stawka klienta, koszt firmy to 2 × km × kilometrówka (tam i z powrotem). Stawki domyślne z `koszty_firmy.dojazd` w `data/ceny.json`, do zmiany w ustawieniach.
- Koszt zlecenia jednoosobowej firmy: chemia (pomieszczenia: chemia_h × czas normowy; pozycje: koszt chemii na jednostkę albo chemia_h × czas pozycji, jak `Chemia-Jednostki`), sprzęt (koszt_h × czas pozycji z tempem), dojazd firmy. Bez kosztu robocizny. Tempo mnoży czas normowy całego zlecenia (z przygotowaniem i dodatkami), nie zmienia ceny (R15).
- Wycena zapisuje dane wejściowe i migawkę wyniku (ceny, mediana, widełki, czas normowy, województwo, status VAT, wersje danych). Zmiana ustawień albo danych rynkowych nie przelicza zapisanych wycen; podsumowanie zapisanej wyceny pokazuje baner z przyciskiem „Przelicz”, gdy wersje danych się różnią. Wykonana wycena jest tylko do odczytu.
- Cykl życia wyceny: `szkic` → `do_wyslania` (zapis, numer `NN/MM/RRRR`) → `wyslana` (skopiowanie albo udostępnienie linku, otwarcie oferty do druku, skopiowanie tekstu szybkiej wyceny) → `przyjeta` albo `odrzucona` (ręcznie) → `wykonana` (po wpisie czasu; abonament zostaje `przyjeta` i zbiera kolejne wizyty). Zmiana wyceny po wysłaniu oznacza ofertę jako nieaktualną.
- Własne tempo: stosunek = faktyczny czas wizyty / czas normowy z migawki; mediana z ostatnich 10 wpisów; wpisy poza 0,5–3× zapisują się, ale nie liczą do tempa; wspólne tempo od 3 wpisów, osobne dla usługi (po `id`) od 3 wpisów tej usługi (R17). Ustawienie `tempo.reczne = null` znaczy „licz z zleceń, a do 3 wpisów 1,3×”; liczba znaczy „wartość ręczna”.
- Magazyn: jeden klucz localStorage `wyceny-sprzatanie:stan` (przedrostek, bo `*.github.io` dzieli origin między repozytoria), wersja schematu z łańcuchem aktualizacji starszych wersji stanu, zdarzenie `storage` odświeża inne karty, `navigator.storage.persist()` przy pierwszym zapisie; uszkodzony JSON daje ekran ratunkowy, nie pustą aplikację.
- Kopia: plik JSON `{ aplikacja, wersjaSchematu, utworzona, stan }`; import odrzuca plik z nowszej wersji schematu, przy istniejących danych pyta „połącz” (wyceny po `id`, wygrywa nowsza `zmieniona`) albo „zastąp”; przypomnienie po 7 dniach od ostatniej kopii przy zmianach albo 7 dni po pierwszej zapisanej wycenie, gdy kopii nie było.
- Oferta: link `oferta.html#v1.<base64url(deflate-raw(JSON))>`; dane w fragmencie adresu nie trafiają na serwer (R22). Link niesie gotowe kwoty i teksty (nie przelicza się po zmianie danych) i tylko pola z białej listy (R21). Strona oferty nie czyta localStorage i nie rejestruje service workera; dekoder sprawdza schemat i długości, bo link może sfabrykować każdy. PDF to druk przeglądarki z arkuszem A4, bez biblioteki.
- Bezpieczeństwo DOM: teksty z danych i z linku oferty wyłącznie przez `textContent`/węzły tekstowe (helper `h`), bez `innerHTML` z danymi; obie strony mają meta CSP `default-src 'self'` (bez skryptów i stylów inline, bez zasobów z CDN).
- Service worker: sieć najpierw (limit 4 s), potem pamięć podręczna; wstępnie zapisuje strony i pliki `data/*.json`, resztę zapisuje w trakcie użycia. Wszystkie widoki są importowane statycznie przy starcie, więc po pierwszym uruchomieniu online cała aplikacja działa offline.
- Wygląd: układ z PNG makiet (wersja 3), kolory, font i zaokrąglenia z tokenów wariantu B w `docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md` (decyzja właściciela w `/dev-plan` 2026-10-24). Nazwy zmiennych CSS jak zmienne Figmy, więc zmiana wariantu albo barw marki to podmiana wartości w `src/style/tokeny.css`. Buildery nie wywołują narzędzi Figma MCP (limit konta wyczerpany).
- Treści do zatwierdzenia przez właściciela (`data/pytania.json`, `data/zakresy.json`) powstają w osobnej sesji przed fazami 5 i 6 według schematów z tego planu (decyzja właściciela w `/dev-plan` 2026-10-24); testy sprawdzają, że każda usługa (poza `tylko_dodatek`) ma wpis.

## Rejestr stałych

| Stała | Wartość | Plik | IU-źródło | Konsumenci |
|---|---|---|---|---|
| `KLUCZ_MAGAZYNU` | `'wyceny-sprzatanie:stan'` | `src/dane/magazyn.js` | IU-6 | IU-6, IU-8, IU-12 |
| `WERSJA_SCHEMATU` | `1` | `src/dane/magazyn.js` | IU-6 | IU-6, IU-8 |
| domyślne ustawienia (`tempo` 1,3, `status_vat` „zwolniony”, `stawka_vat_proc` 23, `oferta.waznosc_dni` 14, `oferta.warunki`, `szybka_wycena.zastrzezenie`) | plik danych | `data/domyslne.json` | IU-6 | IU-6, IU-11, IU-20, IU-22 |
| `STATUSY_WYCENY` | `['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona', 'wykonana']` | `src/dane/wyceny.js` | IU-7 | IU-7, IU-10, IU-18, IU-19, IU-23 |
| `MIN_ZLECEN_TEMPA` | `3` | `src/silnik/tempo.js` | IU-7 | IU-7, IU-11, IU-19 |
| `GRANICE_STOSUNKU_TEMPA` | `{ min: 0.5, max: 3 }` | `src/silnik/tempo.js` | IU-7 | IU-7, IU-19 |
| `TRASY` | mapa nazw tras na wzorce hash (`start: '#/start'`, `wyceny: '#/wyceny'`, `szybka: '#/szybka'`, `kreator: '#/kreator/:krok'`, `wycena: '#/wycena/:id'`, `zakonczenie: '#/wycena/:id/koniec'`, `oferta: '#/wycena/:id/oferta'`, `pytania: '#/wycena/:id/pytania'`, `ustawienia: '#/ustawienia'`, `kreatorStartowy: '#/ustawienia/start'`, `kopia: '#/kopia'`, `chemia: '#/chemia'`) | `src/ui/trasy.js` | IU-9 | IU-9, IU-10, IU-11, IU-12, IU-14, IU-15, IU-16, IU-17, IU-18, IU-19, IU-21, IU-23 |
| `ETYKIETY_STATUSOW` | `{ szkic: 'Szkic', do_wyslania: 'Do wysłania', wyslana: 'Wysłana', przyjeta: 'Przyjęta', odrzucona: 'Odrzucona', wykonana: 'Wykonana' }` | `src/ui/statusy.js` | IU-10 | IU-10, IU-18, IU-19 |
| `KROKI_KREATORA` | `[{ id: 'usluga', etykieta: 'Usługa' }, { id: 'zakres', etykieta: 'Zakres' }, { id: 'dodatki', etykieta: 'Dodatki' }, { id: 'chemia', etykieta: 'Chemia' }, { id: 'cena', etykieta: 'Cena' }]` | `src/kreator/stan.js` | IU-14 | IU-14, IU-15, IU-16, IU-17, IU-18, IU-21 |
| `STANY_SZYBKIEJ` | `[{ id: 'lekki', etykieta: 'Lekki' }, { id: 'typowy', etykieta: 'Typowy' }, { id: 'mocny', etykieta: 'Mocny' }]` | `src/silnik/szybka.js` | IU-20 | IU-20, IU-21 |
| `RODZAJE_SKUTKOW` | `['brud', 'dojazd_km']` | `src/silnik/pytania.js` | IU-20 | IU-20, IU-21 |
| `TYPY_ODPOWIEDZI` | `['tak_nie', 'wybor', 'liczba', 'tekst']` | `src/silnik/pytania.js` | IU-20 | IU-20, IU-21 |
| `MAKS_DLUGOSC_LINKU` | `2000` | `src/oferta/kodek.js` | IU-22 | IU-22, IU-23 |

## Części PR

| Część | Fazy |
|---|---|
| 1 | 1–3 |
| 2 | 4–6 |

## Otwarte pytania

### Rozwiązane podczas planowania

- Zakres planu: cały etap 5 w jednym planie (decyzja właściciela 2026-10-24).
- Źródło wyglądu: PNG wyeksportowane ręcznie z Figmy + SPEC bez pomiarów; kolory wariantu B; bez `docs/DESIGN.md` (decyzje właściciela 2026-10-24).
- Narzędzia: `node --test` + TypeScript `checkJs` (decyzja właściciela 2026-10-24).
- Treści `data/pytania.json` i `data/zakresy.json`: osobna sesja przed fazami 5 i 6 (decyzja właściciela 2026-10-24).
- Netto czy brutto przy czynnym VAT: według `podstawa_ceny` usługi (decyzja właściciela 2026-10-24; odroczone pytanie źródła do R8).
- Stan w szybkiej wycenie: typowy = mediana (decyzja właściciela 2026-10-24).
- Rozkład metrażu w szybkiej wycenie: funkcja układu ze skryptu kalibracji (odroczone pytanie źródła do R10).
- Liczenie własnego tempa: mediana z ostatnich 10 wpisów, wpisy poza 0,5–3× bez wpływu, progi 3 wpisów (odroczone pytanie źródła do R17).
- Oferta w linku bez serwera: fragment adresu z kompresją deflate-raw i base64url; PDF przez druk przeglądarki (odroczone pytanie źródła do R18, R22).
- Statusy i numer wyceny przejęte z zaakceptowanych makiet (`ekran-startowy`, `oferta-klient`); „odrzucona” dodana, żeby lista „do zrobienia” nie zarastała.
- Domyślne województwo po pominięciu kreatora: brak (średnia krajowa, stawka 65 zł/h, wsp 1,0) ze znacznikiem „ustawienia domyślne – uzupełnij”.

### Odroczone do implementacji

- Brzmienie warunków oferty zostało zatwierdzone co do treści (2026-10-24); zdania w `data/domyslne.json` z IU-6 właściciel potwierdza w smoke'u.
- Udział aneksu (10%, 4–8 m²) i liczenie dojazdu tam i z powrotem w koszcie firmy — założenia planu do potwierdzenia przez właściciela w smoke'u.
- Czy `node --test` z wzorcem bez dopasowań kończy się błędem (pierwsza faza ma testy tylko w `scripts/` i `src/silnik/`) — builder IU-1 sprawdza i w razie potrzeby zawęża skrypt.
- Dokładne wersje: `typescript` (aktualna stabilna) i paczki fontu Source Sans 3 — builder sprawdza w rejestrze npm i przypina dokładnie.
- Zestaw ikon Tabler potrzebnych na ekranach — wynika z PNG przy implementacji (lista startowa w IU-9).
- Brak `docs/DESIGN.md` — buildery UI bazują na SPEC.md i PNG; utwórz przed kolejnym etapem z UI.

## Wymagania wstępne operatora

Checklista etapu: `docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md` (uzupełniona przez `/dev-plan` 2026-10-24).

- [ ] Zainstalować `agent-browser` — **[blokuje: faza 1]** (bramka środowiska E2E)
- [ ] Utworzyć `.env.e2e` z `E2E_URL` i `E2E_START` dla serwera `scripts/serwer-dev.mjs` — **[blokuje: faza 1]** (bramka środowiska E2E; serwer powstaje w IU-1)
- [x] Wyeksportować 14 PNG makiet do `docs/plans/etap-5-aplikacja-wyceny-figma/` — **[blokuje: faza 3]** (IU-9 i kolejne jednostki UI)
- [ ] Zatwierdzić `data/pytania.json` (szkic z Claude w osobnej sesji) — **[blokuje: faza 5]** (IU-20)
- [ ] Zatwierdzić `data/zakresy.json` (szkic z Claude w osobnej sesji) — **[blokuje: faza 6]** (IU-22)

## Implementation Units

### Faza 1 — Narzędzia i silnik wyceny

**Zależy od:** Brak

- [ ] **IU-1: Narzędzia projektu i serwer deweloperski**

**Cel:** `package.json` ze skryptami testów, typów i serwera, konfiguracja `tsc` dla JSDoc i zerozależnościowy serwer plików statycznych dla E2E i pracy lokalnej.

**Wymagania:** R28

**Zależności:** Brak

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `package.json` | — → — | — | nowy |
| Stwórz | `package-lock.json` | — → — | — | nowy |
| Stwórz | `tsconfig.json` | — → — | — | nowy |
| Stwórz | `scripts/serwer-dev.mjs` | 0 → 75 | — | nowy |
| Test (unit) | `scripts/serwer-dev.test.mjs` | 0 → 70 | — | nowy |
| Modyfikuj | `CLAUDE.md` | — → — | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos (dotyczy całego planu): czysty JavaScript (moduły ES, typy w JSDoc), bez Reacta, Tailwinda, Supabase i kroku budowania; testy `node:test` i `node:assert/strict`.
- `package.json`: `"private": true`, `"type": "module"`, `"engines": { "node": ">=24" }`, skrypty `test` = `node --test "src/**/*.test.js" "scripts/**/*.test.mjs"` (jawne katalogi, bo bez argumentów runner zebrałby 113 testów z `.claude/**`), `typecheck` = `tsc -p tsconfig.json`, `start` = `node scripts/serwer-dev.mjs`. Jedyna zależność deweloperska `typescript`, wersja przypięta dokładnie (bez `^`); `package-lock.json` z `npm install`.
- `tsconfig.json`: `allowJs`, `checkJs`, `noEmit`, `strict`, `target` i `lib` ES2023 + DOM + DOM.Iterable, `module` ESNext, `moduleResolution` Bundler, `include: ["src/**/*.js"]`, `exclude: ["src/**/*.test.js"]` (testy i skrypty Node bez typecheck, żeby nie dokładać `@types/node`).
- `scripts/serwer-dev.mjs`: `node:http` bez zależności, port z `--port` (domyślnie 5174), katalog główny repo jako korzeń, typy MIME (`.html`, `.js` → `text/javascript`, `.mjs`, `.css`, `.json`, `.webmanifest` → `application/manifest+json`, `.svg`, `.png`, `.woff2` → `font/woff2`, `.txt`), `/` → `index.html`, ścieżka spoza korzenia (`..`, zakodowane `%2e%2e`) → 403, brak pliku → 404, `Cache-Control: no-store`, bez listowania katalogów, nasłuch tylko na `127.0.0.1`. Eksportuje funkcję tworzącą serwer (dla testu), a uruchomiony wprost — startuje i wypisuje adres.
- `CLAUDE.md`, sekcja „Środowisko i polecenia”: polecenia `npm install`, `npm test`, `npm run typecheck`, `npm start` (serwer na 5174) i zasada, że aplikacja nie ma kroku budowania, a `package.json` służy tylko narzędziom.

**Wzorce do naśladowania:**
- `.claude/scripts/plan/plan.mjs` — styl modułu Node bez zależności (`node:` importy, JSDoc).

**Scenariusze testowe:**
- [Unit] serwer na losowym porcie zwraca `index.html` dla `/` (jeśli plik istnieje) albo 404, a dla `/data/ceny.json` status 200 i `application/json`
- [Unit] żądanie `/../package.json` i `/%2e%2e/package.json` dostaje 403, a nieistniejący plik 404
- [Unit] plik `.webmanifest` ma typ `application/manifest+json`, `.woff2` — `font/woff2`, `.js` — `text/javascript`

**Weryfikacja:**
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów
- `node --test scripts/serwer-dev.test.mjs` przechodzi

- [ ] **IU-2: Układy i scenariusze kalibracji dla silnika**

**Cel:** `scripts/kalibracja.ps1` zapisuje układy typowego mieszkania i biura do `data/normy.json` i scenariusze referencyjne do `research/kalibracja-scenariusze.json`, z których korzysta test parytetu silnika.

**Wymagania:** R27, R10

**Zależności:** Brak

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Modyfikuj | `scripts/kalibracja.ps1` | — → — | — | zostaje |
| Modyfikuj | `data/normy.json` | — → — | — | zostaje |
| Stwórz | `research/kalibracja-scenariusze.json` | — → — | — | nowy |
| Modyfikuj | `CLAUDE.md` | — → — | — | zostaje |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Plik `scripts/kalibracja.ps1` zostaje w UTF-8 z BOM; obowiązują pułapki PS 5.1 z `CLAUDE.md` (zmienne bez rozróżniania wielkości liter, brak nazw funkcji jak aliasy, polskie cudzysłowy tylko w '…', zapis JSON funkcją `To-Json`). Skrypt uruchamiasz z Git Bash przez `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1`.
- Parametry układów przenosisz do jednej struktury w skrypcie, z której korzystają `Uklad-Mieszkania`, `Uklad-Biura` i zapis do `normy.json` (wartości bez zmian: kuchnia udział 0,16 w granicach 6–14 m², przedpokój 0,12, łazienki `[{ do_m2: 60, m2: [4] }, { do_m2: 100, m2: [5] }, { do_m2: null, m2: [8, 5] }]`, biuro na 100 m²: biuro 60, sala 15, kuchnia_socjalna 6, toaleta 5, korytarz 14). Do `normy.json` dochodzi pole `uklady` z tymi wartościami i dodatkowo `mieszkanie.aneks = { udzial: 0.10, min_m2: 4, max_m2: 8 }` (założenie planu: aneks jest mniejszy od kuchni, różnica przechodzi do pokoi; skrypt aneksu nie używa) oraz opis zasady łazienek: inna liczba łazienek skraca listę domyślną albo dokłada łazienki o metrażu ostatniej pozycji listy.
- `research/kalibracja-scenariusze.json` (UTF-8 bez BOM, przez `To-Json` / `Save-Text`): `meta` (wersja = `$dzis`, opis, że plik jest generowany), `stawka_kraj`, lista `pomieszczenia` (sekcja 2: cztery usługi mieszkaniowe 50 m²; sekcja 3: standard 35, 70 i 150 m² oraz siedem progów firm z województwem i stawką; sekcja 4: biura jednorazowo 100 m², abonament_1 i abonament_3 dla 100 i 1000 m²; sekcja 5: standard 50 m² w 16 województwach) z polami `opis`, `usluga`, `wariant` (albo null), `m2`, `wojewodztwo` (albo null = stawka krajowa), `stawka_h`, `uklad` (lista `{ typ, m2 }`), `minuty`, `cena` (= minuty / 60 × stawka, bez minimum), `wizyt_w_miesiacu`; lista `pozycje` (sekcja 7, zlecenia wzorcowe) z polami `usluga`, `pozycja`, `ilosc`, `prog`, `material`, `cena` (z minimum, progiem i materiałem), `minuty_pracy`, `minuty` (z przygotowaniem), `chemia`, `sprzet` (koszt sprzętu z czasu normowego). Wartości bez zaokrągleń (pełna precyzja `[double]`).
- Raport `research/KALIBRACJA.md` i `data/rynek.json` nie zmieniają treści; data w `$dzis` zostaje bez zmian.
- `CLAUDE.md`, sekcja „Przepływ danych”: `research/kalibracja-scenariusze.json` dopisany do plików generowanych i do diagramu; zdanie, że test parytetu silnika (`src/silnik/parytet.test.js`) czyta ten plik.

**Wzorce do naśladowania:**
- `scripts/kalibracja.ps1` — `$normy` i `Save-Text 'data\normy.json'`, funkcje `Minuty-Uslugi`, sekcje 2–7 raportu

**Scenariusze testowe:**
- [Manual] po uruchomieniu skryptu `research/kalibracja-scenariusze.json` ma scenariusz „mieszkanie_standard, 50 m², stawka 65” z ceną 250 ± 1 zł (automatycznie sprawdza go test parytetu w IU-4)
- [Manual] `git diff data/normy.json` pokazuje tylko nowe pole `uklady`, bez zmian norm

**Weryfikacja:**
- `bash -c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1"` kończy się bez wyjątku i wypisuje „niezgodności katalogu: 0”
- `git diff --exit-code research/KALIBRACJA.md data/rynek.json` nie pokazuje zmian
- `bash -c "head -c3 scripts/kalibracja.ps1 | od -An -tx1"` zwraca `ef bb bf`
- `node -e "JSON.parse(require('fs').readFileSync('research/kalibracja-scenariusze.json','utf8'))"` kończy się bez błędu

- [ ] **IU-3: Silnik: katalog danych, układy i czas pracy**

**Cel:** Wczytanie i indeksy danych referencyjnych, układ typowego mieszkania i biura oraz czas pracy usług z pomieszczeniami i z pozycjami.

**Wymagania:** R27, R10, R25

**Zależności:** IU-1, IU-2

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/silnik/katalog.js` | 0 → 130 | — | nowy |
| Stwórz | `src/silnik/bledy.js` | 0 → 25 | — | nowy |
| Stwórz | `src/silnik/uklad.js` | 0 → 75 | — | nowy |
| Stwórz | `src/silnik/czas.js` | 0 → 110 | — | nowy |
| Stwórz | `tests/pomocnicze.js` | 0 → 35 | — | nowy |
| Stwórz | `tests/fixtures/katalog-maly.json` | — → — | — | nowy |
| Test (unit) | `src/silnik/katalog.test.js` | 0 → 80 | — | nowy |
| Test (unit) | `src/silnik/uklad.test.js` | 0 → 70 | — | nowy |
| Test (unit) | `src/silnik/czas.test.js` | 0 → 120 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc), bez Reacta, Tailwinda, Supabase i kroku budowania; moduły `src/silnik/` nie dotykają DOM, `fetch` ani localStorage.
- `bledy.js`: klasy `BladKatalogu` i `BladWejscia` (pole `kod`, np. `brak_pliku`, `brak_normy`, `nieznana_usluga`, `metraz`), używane przez cały silnik.
- `katalog.js`: `wczytajKatalog(pobierzJson)`, gdzie `pobierzJson(sciezka)` zwraca obiekt JSON dla `data/ceny.json`, `data/normy.json`, `data/rynek.json` (w przeglądarce `fetch`, w testach odczyt z dysku). Zwraca obiekt katalogu z indeksami: `usluga(id)`, `pozycja(uslugaId, pozycjaId)`, `wojewodztwo(id | null)` (null = średnia krajowa: nazwa „średnia krajowa”, `wsp` 1, `stawka_h` = `kraj.stawka_h.mediana`), `normaPomieszczenia(typ)`, `normaBrudu(id, poziom)`, `zestaw(id)`, `progMetrazu(nazwa, m2)`, `normaPozycji(klucz)`, `przygotowanie(uslugaId)`, listy `uslugi`, `wojewodztwa`, `brud`, `poziomy`, `poziomyBrudu`, `kosztyFirmy`, `uklady`, `wersjaDanych` (`meta.wersja` trzech plików). Brak normy pozycji albo przygotowania usługi w trybie `pozycje` → `BladKatalogu` (te same kontrole co skrypt).
- `uklad.js`: `ukladMieszkania(m2, { lazienki, kuchnia }, uklady)` → lista `{ typ, m2 }` (typy `pokoj`, `przedpokoj`, `kuchnia`, `lazienka`; kuchnia „osobna” domyślnie albo „aneks”; łazienki wg zasady z `normy.uklady`); pokoje < 1 m² → `BladWejscia('metraz')`; `ukladBiura(m2, uklady)`; `domyslneLazienki(m2, uklady)`.
- `czas.js` (odpowiedniki `Minuty`, `Z-Brudem`, `Skala-Biura`): `zBrudem(uklad, reguly)` (reguła `pomieszczenie: '*'` albo typ), `minutyPomieszczen(pomieszczenia, mnoznik, katalog)` = przygotowanie + Σ m² × norma × mnożnik + Σ m² × norma brudu poziomu; `skalaBiura(m2, katalog)` z `progi_wydajnosci.biuro`; `mnoznikZakresu(usluga, wariant, m2Razem, katalog)` (wariant biura × skala biura, inaczej `mnoznik_zakresu` usługi); `minutyPozycji(uslugaId, pozycje, poziomBrudu, katalog)` = przygotowanie usługi + Σ ilość × min na jednostkę × mnożnik brudu (tylko gdy usługa ma `poziomy_brudu`); `minutyDodatkow(dodatki, katalog)` bez przygotowania.
- `tests/pomocnicze.js` (tylko Node): `katalogZDysku()` czyta prawdziwe pliki `data/`, `katalogTestowy()` czyta `tests/fixtures/katalog-maly.json` (mały katalog: jedna usługa domowa, biuro z wariantem, jedna usługa z pozycjami i progami, dwa województwa).

**Notatka wykonawcza:** Test-first na wartościach z `research/kalibracja-scenariusze.json` — czas 50 m² standard ma się zgadzać z plikiem, zanim powstanie reszta silnika.

**Wzorce do naśladowania:**
- `scripts/kalibracja.ps1` — `Uklad-Mieszkania`, `Uklad-Biura`, `Skala-Biura`, `Minuty`, `Z-Brudem`

**Scenariusze testowe:**
- [Unit] `ukladMieszkania(50)` daje pokój 32, przedpokój 6, kuchnię 8 i łazienkę 4 m² (suma 50); dla 120 m² dwie łazienki 8 i 5 m²
- [Unit] `ukladMieszkania(50, { lazienki: 2 })` daje dwie łazienki po 4 m², a `kuchnia: 'aneks'` kuchnię 5 m² i pokój 35 m²
- [Unit] `ukladMieszkania(12, { lazienki: 3 })` rzuca `BladWejscia` z kodem `metraz`
- [Unit] minuty 50 m² standard (układ typowy, mnożnik 1) zgadzają się z polem `minuty` scenariusza w `research/kalibracja-scenariusze.json` z dokładnością 0,01
- [Unit] reguła brudu `pyl_budowlany` poziom 2 na `*` dokłada m² × norma pyłu do każdego pomieszczenia
- [Unit] `minutyPozycji('okna', [{ id: 'okno_1', ilosc: 8 }])` = 30 + 8 × 15; dla usługi z `poziomy_brudu` poziom 3 mnoży czas pozycji przez 1,4
- [Unit] `wczytajKatalog` z katalogiem bez normy pozycji rzuca `BladKatalogu` z kodem `brak_normy`; `wojewodztwo(null)` zwraca stawkę 65 i wsp 1

**Weryfikacja:**
- `node --test src/silnik/katalog.test.js src/silnik/uklad.test.js src/silnik/czas.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-4: Silnik: cena usługi i widełki rynku**

**Cel:** Cena wyceny dla obu trybów usług (linie, dodatki, minimum, dojazd klienta, abonament) i widełki rynku, zgodne ze scenariuszami kalibracji.

**Wymagania:** R5, R27, R25

**Zależności:** IU-3

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/silnik/cena.js` | 0 → 190 | — | nowy |
| Stwórz | `src/silnik/widelki.js` | 0 → 80 | — | nowy |
| Modyfikuj | `data/ceny.json` | — → — | — | zostaje |
| Test (unit) | `src/silnik/cena.test.js` | 0 → 170 | — | nowy |
| Test (unit) | `src/silnik/widelki.test.js` | 0 → 80 | — | nowy |
| Test (unit) | `src/silnik/parytet.test.js` | 0 → 120 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc), bez DOM; błędy przez `BladWejscia` z `src/silnik/bledy.js` (IU-3).
- `cena.js`: `wycenUsluge(wejscie, katalog)`; `wejscie` (typ JSDoc `WejscieWyceny`): `uslugaId`, `wojewodztwoId` (null = średnia krajowa), `wariantId`, `pomieszczenia` (`{ typ, nazwa, m2, brud: [{ id, poziom }] }`), `pozycje` (`{ id, ilosc }`), `poziomBrudu` (1–3), `dodatki` (`{ uslugaId, pozycjaId, ilosc, tryb: 'w_cenie' | 'propozycja' }`), `dojazdKm`, `dezynfekcja`. Wynik `WynikWyceny`: `linie` (`{ rodzaj: 'praca' | 'pozycja' | 'doplata' | 'dodatek' | 'material', opis, ilosc, jednostka, cenaJedn, cenaBazowa, mnoznikProgu, kwota, zakres }`), `propozycje` (dodatki w trybie `propozycja`: `{ opis, ilosc, jednostka, kwota }`, poza ceną i czasem), `cenaUslugi`, `minimum`, `czyMinimum`, `dojazd: { km, kwota }`, `cena` (bez zaokrągleń), `cenaZaokraglona` (pełne zł), `minutyNormowe` (praca + dodatki, z przygotowaniem), `wizytWMiesiacu`, `cenaMiesieczna`, `podstawaCeny`.
- Pomieszczenia: cena pracy = minuty / 60 × `stawka_h` województwa. Pozycje główne: ilość × (cena × wsp × próg × brud + materiał), próg z ilości pozycji m² przy usłudze z `progi`, brud z `poziomy_brudu` w `data/ceny.json` przy usłudze z `poziomy_brudu: true` (cena i czas). Dopłaty (`typ: "doplata"`): ilość × (cena × wsp + materiał), bez progu i brudu (makieta `kreator-pozycje`). Materiał (`doliczaj_material`) = `koszt_chemii_m2` bez wsp, progu i brudu. Dodatki `w_cenie`: ilość × cena × wsp, bez minimum i przygotowania; dodatki `propozycja` liczone tak samo, ale tylko do listy `propozycje`. Kolejność: Σ linii → `max(minimum_zl, Σ)` → + dojazd klienta = max(0, km − `darmowy_promien_km`) × `klient_zl_km` (stawki z `koszty_firmy.dojazd`, nadpisywalne parametrem `stawkiDojazdu`). Abonament biura: wszystko za wizytę, `cenaMiesieczna` = cena × `wizyt_w_miesiacu`.
- Walidacja na wejściu: nieznana usługa albo pozycja, usługa `tylko_dodatek` jako główna, m² ≤ 0 albo > 100 000, ilość < 0, brak linii o dodatniej ilości → `BladWejscia` z kodem.
- `widelki.js`: `widelkiRynku(wynik, wejscie, katalog)` → `{ od, do, pelne }`. Pomieszczenia: cena pracy × `zakres[i] / mediana` pozycji `kraj[rynek_odniesienie]` w `data/rynek.json`; pozycje i dodatki: Σ (zakres pozycji × wsp × próg × brud + materiał) × ilość, a pozycja z `zakres: null` wchodzi kwotą na obu końcach i ustawia `pelne: false`; na obu końcach minimum zlecenia, potem dojazd.
- `data/ceny.json`: pole `rynek_odniesienie` w usługach z pomieszczeniami — `mieszkanie_standard`, `mieszkanie_gruntowne`, `mieszkanie_po_wynajmie` → `"mieszkanie_50m2"`, `mieszkanie_po_remoncie` → `"po_remoncie_m2"`, `sprzatanie_biur` → `"stawka_h"`. Po zmianie skrypt kalibracji musi przejść bez wyjątku.
- `parytet.test.js` czyta prawdziwe dane (`katalogZDysku()` z `tests/pomocnicze.js`) i `research/kalibracja-scenariusze.json`: dla każdego scenariusza `pomieszczenia` minuty i cena (przed minimum) z dokładnością 0,01; dla `pozycje` cena (z minimum, progiem i materiałem) i minuty z dokładnością 0,01.

**Notatka wykonawcza:** Test-first: `parytet.test.js` przed implementacją `cena.js`.

**Wzorce do naśladowania:**
- `scripts/kalibracja.ps1` — `Prog`, `Material`, sekcja „Zlecenia wzorcowe” (kolejność minimum, progu i materiału)

**Scenariusze testowe:**
- [Unit] wszystkie scenariusze z `research/kalibracja-scenariusze.json` dają te same minuty i ceny z dokładnością 0,01
- [Unit] mieszkanie 50 m² standard w mazowieckim kosztuje 250 zł, a z dojazdem 32 km — 294 zł (dojazd 44 zł)
- [Unit] okna: 4 × okno 1-skrz. = 120 zł, cena 150 zł i `czyMinimum: true`; dojazd 8 km bez dopłaty
- [Unit] kostka 40 m²: mycie 40 × 15 × 1,15 = 690 zł, dopłata mech 40 × 7,50 = 300 zł bez progu, razem 990 zł (makieta `kreator-pozycje`); impregnacja 40 m² dokłada 40 × (21,50 + 8) bez progu
- [Unit] mieszkanie z dodatkiem okna 4 × okno 1-skrz. w trybie `propozycja`: cena bez zmian, `propozycje` ma pozycję 120 zł; w trybie `w_cenie` cena rośnie o 120 zł
- [Unit] doczyszczanie 200 m² z poziomem brudu 3: cena i czas pozycji × 1,4
- [Unit] abonament 1× w tygodniu dla 100 m²: `cenaMiesieczna` = cena wizyty × 4,33
- [Unit] usługa AGD jako główna rzuca `BladWejscia`; ujemna ilość i m² = 0 rzucają `BladWejscia`
- [Unit] widełki mieszkania 50 m² w mazowieckim to 120–450 zł; okno balkonowe (`zakres: null`) daje `pelne: false`

**Weryfikacja:**
- `node --test src/silnik/cena.test.js src/silnik/widelki.test.js src/silnik/parytet.test.js` przechodzi
- `bash -c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1"` wypisuje „niezgodności katalogu: 0”
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-5: Silnik: VAT, koszt zlecenia i „zostaje dla Ciebie”**

**Cel:** Cena dla klienta brutto i netto według statusu VAT i podstawy ceny oraz koszt zlecenia jednoosobowej firmy z tempem i kwotą, która zostaje dla właściciela.

**Wymagania:** R5, R7, R8, R9, R15

**Zależności:** IU-4

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/silnik/vat.js` | 0 → 55 | — | nowy |
| Stwórz | `src/silnik/koszt.js` | 0 → 140 | — | nowy |
| Test (unit) | `src/silnik/vat.test.js` | 0 → 70 | — | nowy |
| Test (unit) | `src/silnik/koszt.test.js` | 0 → 140 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc), bez DOM.
- `vat.js`: `cenaDlaKlienta({ kwota, podstawaCeny, statusVat, stawkaVatProc })` → `{ brutto, netto, vat }` (decyzja właściciela 2026-10-24: wg podstawy ceny): zwolniony → brutto = netto = kwota, vat 0; czynny i `brutto` → brutto = kwota, netto = brutto / (1 + stawka); czynny i `netto` → netto = kwota, brutto = netto × (1 + stawka). Brutto (kwota płacona przez klienta) zaokrąglone do pełnych zł, netto i vat do groszy liczone od zaokrąglonego brutto. `zCenyRecznej(brutto, statusVat, stawkaVatProc)` — ręczna cena to zawsze kwota płacona przez klienta (R7, R8).
- `koszt.js`: `kosztZlecenia({ wynik, cenaKlienta, tempo, koszty, statusVat }, katalog)` → `{ minutyNormowe, minutyWlasne, chemia, sprzet: [{ id, nazwa, kwota }], dojazdFirmy: { km, kwota }, kosztRazem, przychod, zostaje, zostajeNaGodzine, miesiecznie }`. `minutyWlasne` = `minutyNormowe` × tempo (tempo zmienia czas, nie cenę — R15). Chemia: praca z pomieszczeniami = `chemia_h` × minuty normowe pracy / 60; pozycje i dodatki = ilość × `koszt_chemii_m2` albo `koszt_chemii_szt`, a bez nich `chemia_h` × czas pozycji (jak `Chemia-Jednostki`). Sprzęt = Σ czas pozycji z `sprzet` × tempo / 60 × `koszt_h`. Dojazd firmy = 2 × km × `koszt_firmy_zl_km`. `przychod` = netto dla czynnego, brutto dla zwolnionego; `zostaje` = przychód − koszt; `zostajeNaGodzine` = zostaje / (minutyWlasne / 60). Abonament: wartości za wizytę i `miesiecznie` (× wizyty).
- `koszty` to `koszty_firmy` z `data/ceny.json` scalone z nadpisaniami z ustawień (chemia_h, sprzęt, stawki dojazdu) — scalanie robi wywołujący; funkcja przyjmuje gotowy obiekt.

**Wzorce do naśladowania:**
- `scripts/kalibracja.ps1` — `Chemia-Jednostki` i kolumna „Koszt” w sekcji 7 raportu

**Scenariusze testowe:**
- [Unit] mieszkanie 250 zł, firma zwolniona: brutto 250, netto 250; czynny VAT: brutto 250, netto 203,25, vat 46,75
- [Unit] mycie posadzek 300 zł modelu (podstawa netto), czynny VAT: netto 300, brutto 369
- [Unit] mieszkanie 50 m² (230,82 min normy), tempo 1,3, dojazd 24 km, firma zwolniona: chemia = 4 × 230,82 / 60, dojazd firmy = 2 × 24 × 1,15, `zostajeNaGodzine` = zostaje / (230,82 × 1,3 / 60)
- [Unit] zlecenia wzorcowe z `research/kalibracja-scenariusze.json` przy tempie 1: chemia i sprzęt równe polom `chemia` i `sprzet` z dokładnością 0,01
- [Unit] ręczna cena 290 zł zmienia `zostaje` i `zostajeNaGodzine`, a nie zmienia `minutyWlasne`
- [Unit] tempo ≤ 0 albo brak `minutyNormowe` rzuca `BladWejscia`

**Weryfikacja:**
- `node --test src/silnik/vat.test.js src/silnik/koszt.test.js` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

### Faza 2 — Dane w przeglądarce

**Zależy od:** Faza 1

- [ ] **IU-6: Magazyn, schemat stanu i ustawienia firmy**

**Cel:** Zapis stanu aplikacji w localStorage z wersją schematu i aktualizacją starszych wersji stanu oraz ustawienia firmy z wartościami domyślnymi i walidacją.

**Wymagania:** R23, R24, R8, R15

**Zależności:** Faza 1

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `data/domyslne.json` | — → — | — | nowy |
| Stwórz | `src/dane/magazyn.js` | 0 → 150 | — | nowy |
| Stwórz | `src/dane/ustawienia.js` | 0 → 140 | — | nowy |
| Stwórz | `src/dane/walidacja.js` | 0 → 75 | — | nowy |
| Stwórz | `tests/pamiec-magazynu.js` | 0 → 30 | — | nowy |
| Test (unit) | `src/dane/magazyn.test.js` | 0 → 130 | — | nowy |
| Test (unit) | `src/dane/ustawienia.test.js` | 0 → 120 | — | nowy |
| Test (unit) | `src/dane/walidacja.test.js` | 0 → 80 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc), bez DOM poza interfejsem `Storage`.
- `data/domyslne.json` (edytowany ręcznie, jak `data/ceny.json`): `meta` (wersja 2026-10-24, opis, źródła decyzji), `status_vat: "zwolniony"`, `stawka_vat_proc: 23` z uwagą „do potwierdzenia w źródłach (checklista etapu 5)”, `tempo: 1.3`, `wojewodztwo: null`, `oferta.waznosc_dni: 14`, `oferta.warunki` (lista `{ id, tresc, tylko_szybka }`, teksty niżej), `szybka_wycena.zastrzezenie: "Cena ostateczna po obejrzeniu lokalu lub zdjęć."`. Plik jest źródłem stałych domyślnych z rejestru (IU-6).
- `magazyn.js`: `KLUCZ_MAGAZYNU = 'wyceny-sprzatanie:stan'`, `WERSJA_SCHEMATU = 1` (źródło stałych). `utworzMagazyn(storage = globalThis.localStorage)` → `{ wczytaj, zmien, zapiszCalosc, naZmiane, wyczysc }`: `wczytaj()` zwraca `{ stan }` (brak klucza → pusty stan v1) albo `{ blad: 'uszkodzony', surowe }` (JSON nie do odczytu albo zły kształt); `zmien(fn)` czyta, stosuje `fn`, ustawia `kopia.zmianaOd` i zapisuje; przepełnienie → `BladMagazynu('pelny')`; `naZmiane(cb)` słucha zdarzenia `storage` dla tego klucza; przy pierwszym zapisie jednorazowo `navigator.storage?.persist?.()` (błąd tylko logowany). Aktualizacja starszych wersji stanu: mapa `wersja → funkcja` (na razie pusta), stan z wersją wyższą niż `WERSJA_SCHEMATU` → `blad: 'nowsza_wersja'`.
- Schemat stanu v1 (JSDoc `Stan`): `{ wersja, ustawienia: Ustawienia | null, wyceny: Wycena[], licznikNumerow: { 'RRRR-MM': n }, kopia: { ostatnia: ISO | null, zmianaOd: ISO | null }, preferencje: { iosInstrukcjaZamknieta: boolean } }`. `Ustawienia`: `wojewodztwoId` (null = średnia krajowa), `statusVat` (`zwolniony` | `czynny`), `firma: { nazwa, telefon, email, nip }`, `tempo: { reczne: number | null }`, `koszty: { chemia_h, sprzet: { [id]: koszt_h }, dojazd: { klient_zl_km, darmowy_promien_km, koszt_firmy_zl_km } }` (tylko nadpisania), `zakresy: { [uslugaId]: { wchodzi, nie_wchodzi } }`, `warunki: [{ id, tresc, tylko_szybka }] | null`, `przypomnienieKopiiDni` (7, 14 albo 30; domyślnie 7 — makieta `kopia-zapasowa`), `kreatorZakonczony: boolean`. Typ `Wycena` definiuje IU-7.
- `ustawienia.js`: `ustawieniaDomyslne(domyslne)`, `scalKoszty(kosztyFirmy, ustawienia)` (dla `kosztZlecenia` z IU-5), `brakujeUstawien(ustawienia)` → lista braków (`wojewodztwo`, `firma`) dla znacznika „ustawienia domyślne – uzupełnij” (R24), `zapiszUstawienia(magazyn, patch)` z walidacją, `pominKreator(magazyn, domyslne)`.
- `walidacja.js`: `bladTelefonu` (9 cyfr, opcjonalnie +48, spacje i myślniki dozwolone), `bladEmaila`, `bladNip` (10 cyfr z sumą kontrolną), `bladLiczby(x, { min, max })`, `bladTempa` (0,5–3,0); funkcje zwracają kod błędu albo null.

**Teksty (verbatim):**
- Warunek `odwolanie`: „Odwołanie zlecenia jest bezpłatne do 24 godzin przed terminem. Przy późniejszym odwołaniu opłata wynosi 50% ceny.”
- Warunek `brak_dostepu`: „Jeśli w umówionym terminie nie będzie dostępu do lokalu, opłata wynosi 50% ceny.”
- Warunek `zdjecia`: „Przed rozpoczęciem i po zakończeniu pracy robimy zdjęcia sprzątanych miejsc.”
- Warunek `stan_lokalu` (`tylko_szybka: true`): „Cena została podana na podstawie opisu lokalu. Ostateczną cenę potwierdzimy po obejrzeniu lokalu lub zdjęć.”

**Wzorce do naśladowania:**
- `data/ceny.json` — sekcja `meta` i `zrodla` (opis pól i źródeł w pliku danych)

**Scenariusze testowe:**
- [Unit] pusty storage → `wczytaj()` zwraca stan v1 z `ustawienia: null` i pustą listą wycen
- [Unit] `zmien` zapisuje stan pod `wyceny-sprzatanie:stan` i ustawia `kopia.zmianaOd`
- [Unit] uszkodzony JSON pod kluczem → `{ blad: 'uszkodzony', surowe }` z oryginalnym tekstem; stan z wersją 2 → `nowsza_wersja`
- [Unit] przepełnienie (atrapa `setItem` rzuca `QuotaExceededError`) → `BladMagazynu` z kodem `pelny`
- [Unit] `pominKreator` daje status VAT „zwolniony”, tempo ręczne null, województwo null, a `brakujeUstawien` zwraca `['wojewodztwo', 'firma']`
- [Unit] NIP `5260250274` przechodzi, `5260250275` daje błąd; telefon `600 123 456` i `+48600123456` przechodzą, `12345` daje błąd
- [Unit] `scalKoszty` nadpisuje `chemia_h` z ustawień i zostawia pozostałe wartości z `data/ceny.json`

**Weryfikacja:**
- `node --test src/dane/magazyn.test.js src/dane/ustawienia.test.js src/dane/walidacja.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-7: Wyceny, zlecenia i własne tempo**

**Cel:** Zapis wycen z migawką wyniku, cykl życia statusów, numeracja, wpisy wykonania i wyliczenie własnego tempa z zapisanych zleceń.

**Wymagania:** R16, R17, R29, R15

**Zależności:** IU-6

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/dane/wyceny.js` | 0 → 230 | — | nowy |
| Stwórz | `src/silnik/tempo.js` | 0 → 115 | — | nowy |
| Test (unit) | `src/dane/wyceny.test.js` | 0 → 210 | — | nowy |
| Test (unit) | `src/silnik/tempo.test.js` | 0 → 130 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc); zapis wyłącznie przez `magazyn.zmien` z IU-6.
- `wyceny.js`: `STATUSY_WYCENY = ['szkic', 'do_wyslania', 'wyslana', 'przyjeta', 'odrzucona', 'wykonana']` (źródło stałej). Typ `Wycena`: `id` (`crypto.randomUUID()`), `numer` (`NN/MM/RRRR` albo null), `utworzona`, `zmieniona`, `status`, `rodzaj` (`szybka` | `dokladna`), `klient: { nazwa, adres, termin }`, `wejscie` (`WejscieWyceny` z IU-4), `szybka: { stan, od, do, tryb } | null`, `odpowiedzi: { [pytanieId]: wartość }`, `wynik` (migawka: `cena`, `netto`, `vat`, `mediana`, `widelki`, `minutyNormowe`, `linie`, `dojazd`, `wojewodztwo: { id, nazwa, stawka_h, wsp }`, `statusVat`, `stawkaVatProc`, `podstawaCeny`, `wizytWMiesiacu`, `wersjaDanych`), `cenaReczna`, `wykonania: [{ id, data, minuty, tempoPlanu }]`, `oferta: { zakres, warunki, waznaDo, wyslana, nieaktualna }`.
- Funkcje: `utworzSzkic`, `zapiszWejscie` (zmiana wejścia przy `wyslana` → `oferta.nieaktualna = true`; wykonana → `BladWyceny('tylko_odczyt')`), `zapiszWynik`, `zapiszWycene` (szkic → `do_wyslania` i nadanie numeru z `licznikNumerow[RRRR-MM]`), `zmienStatus` (dozwolone przejścia: szkic → do_wyslania; do_wyslania → wyslana; do_wyslania | wyslana → przyjeta | odrzucona; odrzucona → do_wyslania; przyjeta → wykonana; inne → `BladWyceny('przejscie')`), `dodajWykonanie` (minuty > 0 i ≤ 1440; zlecenie jednorazowe → `wykonana`, abonament zostaje `przyjeta`), `usunWycene`, `listaWycen` (od najnowszej `zmieniona`), `wycena(id)`.
- `tempo.js`: `MIN_ZLECEN_TEMPA = 3`, `GRANICE_STOSUNKU_TEMPA = { min: 0.5, max: 3 }` (źródło stałych). `wpisyTempa(wyceny)` → stosunek = minuty wykonania / `wynik.minutyNormowe` (abonament: na wizytę), z flagą `liczony` (poza granicami false); `tempoWlasne(wyceny, uslugaId)` → `{ wartosc, liczba, zakres: 'usluga' | 'wspolne' } | null` — mediana z ostatnich 10 liczonych wpisów, osobne dla usługi od 3 wpisów tej usługi, wspólne od 3 wpisów razem, inaczej null; `tempoDoWyceny(ustawienia, wyceny, uslugaId, domyslne)` → `{ wartosc, zrodlo: 'reczne' | 'usluga' | 'wspolne' | 'domyslne', liczba }` (ręczne wygrywa, potem własne, potem 1,3 z `data/domyslne.json`); `opisTempa` → np. „1,18× z 7 zleceń” (R17).

**Wzorce do naśladowania:**
- `src/dane/ustawienia.js` (IU-6) — zapis przez `magazyn.zmien`, walidacja na wejściu funkcji

**Scenariusze testowe:**
- [Unit] dwie wyceny zapisane w październiku 2026 dostają numery `1/10/2026` i `2/10/2026`, a pierwsza w listopadzie `1/11/2026`
- [Unit] przejście `szkic → przyjeta` rzuca `BladWyceny` z kodem `przejscie`; `do_wyslania → wyslana → przyjeta → wykonana` przechodzi
- [Unit] zmiana wejścia wysłanej wyceny ustawia `oferta.nieaktualna`, a wykonanej rzuca `tylko_odczyt`
- [Unit] wykonanie 0 minut i 1500 minut rzuca błąd; abonament po dwóch wizytach ma status `przyjeta` i dwa wpisy
- [Unit] tempo z wpisów 1,1, 1,2 i 1,4 = 1,2 (mediana) z `liczba: 3`; dwa wpisy → null i `tempoDoWyceny` zwraca 1,3 ze źródłem `domyslne`
- [Unit] wpis 3,5× zapisuje się z `liczony: false` i nie zmienia mediany; z 12 wpisów liczy się 10 najnowszych
- [Unit] trzy wpisy usługi `okna` i dwa innej usługi: dla `okna` zakres `usluga`, dla innej `wspolne` z pięciu wpisów
- [Unit] `tempo.reczne = 1,5` wygrywa z tempem z zleceń; `opisTempa` daje „1,18× z 7 zleceń”

**Weryfikacja:**
- `node --test src/dane/wyceny.test.js src/silnik/tempo.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-8: Kopia zapasowa: eksport, import i przypomnienie**

**Cel:** Plik kopii ze wszystkimi danymi, import z walidacją i wyborem „połącz” albo „zastąp” oraz reguła przypomnienia o kopii.

**Wymagania:** R23

**Zależności:** IU-7

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/dane/kopia.js` | 0 → 170 | — | nowy |
| Stwórz | `tests/fixtures/kopia-v1.json` | — → — | — | nowy |
| Test (unit) | `src/dane/kopia.test.js` | 0 → 170 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc), bez DOM (pobranie i odczyt pliku robi warstwa UI w IU-12).
- `utworzKopie(stan, teraz)` → `{ nazwaPliku: 'wyceny-kopia-RRRR-MM-DD.json', tresc }`, gdzie treść to JSON `{ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: WERSJA_SCHEMATU, utworzona, stan }` (`WERSJA_SCHEMATU` = 1 z `src/dane/magazyn.js`); `oznaczKopie(magazyn, teraz)` ustawia `kopia.ostatnia`.
- `odczytajKopie(tekst)` → `{ stan }` albo `BladKopii` z kodem `zly_plik` (nie JSON, inna `aplikacja`, brak tablicy `wyceny`), `nowsza_wersja` (wersja > `WERSJA_SCHEMATU`) albo `uszkodzony` (zły kształt wycen); starsza wersja stanu przechodzi przez łańcuch aktualizacji z magazynu. Walidacja kształtu jak dane z zewnątrz: typy pól, długości tekstów do 2000 znaków, liczba wycen do 5000.
- `wczytajKopie(magazyn, stanZPliku, tryb)`: `zastap` — cały stan z pliku; `polacz` — wyceny po `id` (wygrywa nowsza `zmieniona`), ustawienia obecne (z pliku tylko gdy obecnych brak), `licznikNumerow` = maksimum na miesiąc; potem `zapiszCalosc` przez `KLUCZ_MAGAZYNU`.
- `czyPrzypomniecOKopii(stan, dzis)`: N = `ustawienia.przypomnienieKopiiDni` (domyślnie 7); true, gdy jest co najmniej jedna wycena poza szkicem i (`kopia.ostatnia` starsza niż N dni i `zmianaOd` późniejsza niż ostatnia kopia) albo (kopii nigdy nie było i najstarsza zapisana wycena ma co najmniej N dni); `dniOdKopii(stan, dzis)` dla tekstu banera; `podsumowanieKopii(stan)` → liczba wycen, liczba wykonań i czy są ustawienia (dla chipów na ekranie kopii).

**Wzorce do naśladowania:**
- `src/dane/magazyn.js` (IU-6) — wersja schematu i aktualizacja starszych wersji stanu

**Scenariusze testowe:**
- [Unit] `utworzKopie` → `odczytajKopie` → ten sam stan (wyceny, ustawienia, licznik) i nazwa pliku `wyceny-kopia-2026-10-24.json`
- [Unit] plik `tests/fixtures/kopia-v1.json` wczytuje się bez błędów
- [Unit] tekst „to nie json”, plik z `aplikacja: 'inna'` i plik z `wersjaSchematu: 2` dają kody `zly_plik`, `zly_plik` i `nowsza_wersja`
- [Unit] `polacz`: wycena o tym samym `id` z nowszą datą w pliku zastępuje lokalną, starsza zostaje lokalna, nowe dochodzą; licznik numerów bierze maksimum
- [Unit] `zastap` usuwa wyceny spoza pliku
- [Unit] przypomnienie: kopia sprzed 8 dni i zmiana po niej → true; ta sama przy `przypomnienieKopiiDni: 14` → false; kopia sprzed 8 dni bez zmian → false; brak kopii i wycena sprzed 7 dni → true; same szkice → false

**Weryfikacja:**
- `node --test src/dane/kopia.test.js` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

### Faza 3 — Szkielet aplikacji, start, ustawienia i kopia

**Zależy od:** Faza 2

- [ ] **IU-9: Szkielet aplikacji: strona, router, komponenty i style**

**Cel:** `index.html` z modułem startowym, router hash, helper DOM, formatowanie, ikony, wspólne komponenty i style z tokenami wariantu B.

**Wymagania:** R28, R25

**Zależności:** Faza 2

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `index.html` | — → — | — | nowy |
| Stwórz | `src/app.js` | 0 → 100 | — | nowy |
| Stwórz | `src/ui/router.js` | 0 → 90 | — | nowy |
| Stwórz | `src/ui/trasy.js` | 0 → 50 | — | nowy |
| Stwórz | `src/widoki/indeks.js` | 0 → 30 | — | nowy |
| Stwórz | `src/ui/h.js` | 0 → 60 | — | nowy |
| Stwórz | `src/ui/format.js` | 0 → 110 | — | nowy |
| Stwórz | `src/ui/ikony.js` | 0 → 90 | — | nowy |
| Stwórz | `src/ui/komponenty/formularz.js` | 0 → 170 | — | nowy |
| Stwórz | `src/ui/komponenty/uklad.js` | 0 → 180 | — | nowy |
| Stwórz | `src/style/tokeny.css` | — → — | — | nowy |
| Stwórz | `src/style/baza.css` | — → — | — | nowy |
| Stwórz | `src/style/komponenty.css` | — → — | — | nowy |
| Stwórz | `fonty/source-sans-3-latin-wght.woff2` | — → — | — | nowy |
| Stwórz | `fonty/source-sans-3-latin-ext-wght.woff2` | — → — | — | nowy |
| Stwórz | `fonty/OFL.txt` | — → — | — | nowy |
| Test (unit) | `src/ui/format.test.js` | 0 → 100 | — | nowy |
| Test (unit) | `src/ui/router.test.js` | 0 → 80 | — | nowy |

**Delegate to:** feature-builder-ui

**Makiety:** `ekran-startowy`, `szybka-wycena`, `kreator-pomieszczenia`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript (moduły ES, typy w JSDoc) i zwykły CSS, bez Reacta, Tailwinda i kroku budowania. Wygląd: układ z PNG makiet, kolory, font i zaokrąglenia z tokenów wariantu B w `docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md`; nie wywołuj narzędzi Figma MCP.
- `index.html`: `lang="pl"`, viewport, meta CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`, arkusze `src/style/*.css`, `<main id="aplikacja">`, `<script type="module" src="src/app.js">`, komunikat w `<noscript>`.
- `src/app.js`: wczytuje `data/ceny.json`, `data/normy.json`, `data/rynek.json`, `data/domyslne.json` przez `fetch` względny z `AbortSignal.timeout(10000)` i `wczytajKatalog` (IU-3), tworzy magazyn (IU-6), przekazuje widokom kontekst `{ katalog, domyslne, magazyn, nawiguj, odswiez }`, odświeża widok przy `hashchange` i przy `magazyn.naZmiane` (inna karta). Błąd wczytania danych → komunikat z tekstów niżej.
- `src/ui/trasy.js`: `TRASY` (źródło stałej, wartości jak w rejestrze) i `sciezka(nazwa, parametry)`; `src/ui/router.js`: czysta `dopasuj(hash, TRASY)` → `{ nazwa, parametry, zapytanie }` albo null oraz `uruchomRouter(kontener, widoki, kontekst)` (cleanup poprzedniego widoku, przewinięcie na górę, fokus na nagłówek). `src/widoki/indeks.js`: mapa nazwa trasy → moduł widoku; kolejne jednostki dopisują swoje widoki. Nieznana trasa → widok „nie znaleziono”.
- Widok to moduł z `render(kontener, { parametry, zapytanie, kontekst })` zwracający funkcję sprzątającą albo nic.
- `src/ui/h.js`: `h(tag, atrybuty, ...dzieci)` (teksty jako węzły tekstowe, zdarzenia przez `on: { click }`, `class`, `aria-*`, `data-*`, właściwości pól), `ikona(nazwa)` przez `createElementNS`; zakaz `innerHTML` z danymi.
- `src/ui/format.js` (Intl `pl-PL`): `zl` („1 234 zł”, twarda spacja), `zlGr` (2 miejsca), `m2` („50 m²”), `czas` (minuty → „5 h 15 min”), `tempo` („1,18×”), `procent` („+16%”), `data` („7 listopada 2026”), `dataDnia` („Sobota, 24 października”), `dniTemu` („dziś”, „wczoraj”, „9 dni temu”), `miejscownikWojewodztwa` („mazowieckie” → „mazowieckim”), odmiana liczebników (`wycena/wyceny/wycen`, `zlecenie/zlecenia/zleceń`, `przyjęta/przyjęte/przyjętych`).
- `src/ui/ikony.js`: ścieżki SVG Tabler Icons (MIT, `@tabler/icons` wersja przypięta, pliki z `icons/outline/`) dla: arrow-left, plus, home, file-text, flask, building-store, bolt, ruler-measure, copy, share, printer, phone, check, alert-triangle, info-circle, trash, pencil, chevron-right, download, upload, x, clock, map-pin, droplet; licencja w komentarzu nagłówka.
- `src/ui/komponenty/formularz.js`: `pole` (etykieta, pole, błąd pod spodem, `inputmode="decimal"` dla liczb), `licznik` (− / wartość / +, min, max, krok, jednostka), `chipy` (pojedynczy wybór, `role="radiogroup"`), `przelacznik`, `przycisk` (główny, drugi, tekstowy). `src/ui/komponenty/uklad.js`: `naglowek` (grafitowy pas, tytuł, podtytuł, wstecz), `karta`, `baner` (uwaga, info, błąd, sukces, z akcją), `pasekPostepu(kroki, aktywny)`, `wiersz`, `dolnyPasek(aktywna)` (Start, Wyceny, „+”, Chemia, Firma; „+” otwiera arkusz z „Szybka wycena” i „Dokładna wycena”), `arkusz`, `dialogPotwierdzenia`.
- Style: `tokeny.css` — zmienne z tabeli tokenów SPEC (nazwy jak zmienne Figmy, wartości wariantu B, `--zakreslacz-mocny`); `baza.css` — reset, `@font-face` Source Sans 3 (pliki z `fonty/`, `font-display: swap`), tło `--tlo-strona`, kolumna do 560 px wyśrodkowana na szerokim ekranie, widoczny fokus, `prefers-reduced-motion`; `komponenty.css` — komponenty z zaokrągleniami wariantu B (karty 10 px, przyciski 8 px, chipy 6–8 px).
- Fonty: Source Sans 3 w wersji zmiennej (wght), zestawy `latin` i `latin-ext`, z paczki `@fontsource-variable/source-sans-3` (wersja przypięta) pobranej z `cdn.jsdelivr.net/npm/`; licencja OFL w `fonty/OFL.txt`.

**Teksty (verbatim):**
- Dolny pasek: „Start”, „Wyceny”, „Chemia”, „Firma”; etykieta przycisku „+” dla czytnika: „Nowa wycena”
- Arkusz „+”: „Szybka wycena” / „przez telefon, widełki”; „Dokładna wycena” / „pomieszczenia i brud”
- Błąd danych: „Nie udało się wczytać danych aplikacji. Sprawdź połączenie z internetem i odśwież stronę.”
- Nieznana trasa: „Nie ma takiego ekranu.” i przycisk „Wróć na start”
- `<noscript>`: „Aplikacja wymaga włączonego JavaScriptu.”

**Wzorce do naśladowania:**
- `docs/operator/etap-5-wariant-b.html` — klasy `.top`, `.card`, `.tile`, `.nav`, `.chip`, `.banner` (wymiary i typografia)

**Scenariusze testowe:**
- [Unit] `dopasuj('#/wycena/abc/oferta', TRASY)` → `{ nazwa: 'oferta', parametry: { id: 'abc' } }`; `#/kreator/zakres?wycena=x` daje krok i zapytanie; `#/nic` → null
- [Unit] `zl(1234.5)` → „1 235 zł” z twardą spacją; `czas(315)` → „5 h 15 min”; `tempo(1.18)` → „1,18×”
- [Unit] `miejscownikWojewodztwa('kujawsko-pomorskie')` → „kujawsko-pomorskim”; `dniTemu` dla 0, 1 i 9 dni
- [E2E] `szkielet-nawigacja` — ustaw okno 360×800, otwórz http://localhost:5174/, wstrzyknij przez `agent-browser eval` treść `e2e/stany/ustawienia-mazowieckie.json` do `localStorage['wyceny-sprzatanie:stan']`, przeładuj, kliknij „Wyceny”, „Firma”, „+”, potem otwórz `#/zly-adres`, zrób screenshot → nagłówki ekranów zmieniają się, arkusz „+” ma dwie opcje, zły adres pokazuje „Nie ma takiego ekranu.”, konsola bez błędów, `document.fonts.check('16px "Source Sans 3"')` zwraca true

**Weryfikacja:**
- `node --test src/ui/format.test.js src/ui/router.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów
- `grep -rn "innerHTML" src/` nie zwraca wyników

**Operator checklist:**
- [ ] Właściciel sprawdza na telefonie dolny pasek, nagłówek i komponenty formularza wobec makiet (kolory wariantu B)

- [ ] **IU-10: Ekran startowy i lista wycen**

**Cel:** Start z kaflami wycen, podsumowaniem miesiąca, listą „do zrobienia”, przypomnieniem o kopii i znacznikiem ustawień domyślnych oraz lista wszystkich wycen.

**Wymagania:** R29, R23, R24, R16

**Zależności:** IU-9

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/widoki/start.js` | 0 → 160 | — | nowy |
| Stwórz | `src/widoki/lista-wycen.js` | 0 → 95 | — | nowy |
| Stwórz | `src/widoki/start-dane.js` | 0 → 120 | — | nowy |
| Stwórz | `src/ui/statusy.js` | 0 → 30 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 30 → 34 | — | zostaje |
| Stwórz | `e2e/stany/ustawienia-mazowieckie.json` | — → — | — | nowy |
| Stwórz | `e2e/stany/wyceny-do-zrobienia.json` | — → — | — | nowy |
| Test (unit) | `src/widoki/start-dane.test.js` | 0 → 130 | — | nowy |

**Delegate to:** feature-builder-ui

**Makiety:** `ekran-startowy`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; komponenty z `src/ui/komponenty/` (IU-9), trasy z `TRASY` w `src/ui/trasy.js`.
- `src/ui/statusy.js`: `ETYKIETY_STATUSOW` (źródło stałej, wartości jak w rejestrze) i `pigulkaStatusu(status)` (kolory: do wysłania — `--uwaga-*`, wysłana — `--marka-zielen-tlo`, przyjęta — `--sukces-*`, wykonana — `--status-wykonana-tlo`, szkic — `--status-szkic-tekst`). Statusy pochodzą z `STATUSY_WYCENY` w `src/dane/wyceny.js` (IU-7).
- `start-dane.js` (czyste funkcje, bez DOM): `doZrobienia(wyceny, dzis)` → zadania: `do_wyslania` → „Wyślij ofertę”; `przyjeta` z terminem do dziś albo bez terminu → „Wpisz czas pracy”; `szkic` → „Dokończ wycenę”; kolejność: najstarsze najpierw. `podsumowanieMiesiaca(wyceny, dzis)` → liczba zapisanych wycen z miesiąca (bez szkiców), przyjęte (przyjęta + wykonana), średnia realna stawka z wykonań w miesiącu (null, gdy brak). Tempo z `tempoDoWyceny` i `opisTempa` (IU-7).
- `start.js`: nagłówek (data dnia, nazwa firmy albo „Wyceny sprzątania”), kafle (szybka → `#/szybka`, dokładna → `#/kreator/usluga`), karta miesiąca, karta „Do zrobienia” (wiersz → `#/wycena/<id>`, „Dokończ wycenę” → kreator), baner kopii (`czyPrzypomniecOKopii`, `dniOdKopii` z IU-8) z przyciskiem do `#/kopia`, baner ustawień domyślnych (`brakujeUstawien` z IU-6) z przyciskiem do `#/ustawienia`, stan pusty. `lista-wycen.js` (`#/wyceny`): wszystkie wyceny od najnowszej z numerem, klientem, kwotą i pigułką statusu; pusta lista z tekstem.
- `e2e/stany/*.json`: stany v1 do wstrzyknięcia w testach przeglądarki — `ustawienia-mazowieckie.json` (mazowieckie, zwolniony z VAT, firma „Usługi Sprzątające Monika Lis”, telefon 600 123 456, kreator zakończony, bez wycen) i `wyceny-do-zrobienia.json` (te ustawienia i trzy wyceny: do wysłania, wysłana, przyjęta bez terminu; migawki policzone silnikiem).

**Teksty (verbatim):**
- Kafle: „Szybka wycena” / „przez telefon, widełki”; „Dokładna wycena” / „pomieszczenia i brud”
- Karta miesiąca: „{n} wycen” (odmiana), „{n} przyjętych” (odmiana), „{x} zł/h” / „zostaje średnio”; bez wykonań: „—” / „zostaje średnio”
- Tempo: „Twoje tempo {t}× normy · z {n} zleceń”; bez własnego tempa: „Tempo {t}× normy · domyślne dla nowej firmy”; ręczne: „Tempo {t}× normy · ustawione ręcznie”
- Lista: „Do zrobienia {n}”; zadania „Wyślij ofertę”, „Wpisz czas pracy”, „Dokończ wycenę”
- Pusty start: „Nie masz jeszcze wycen. Zacznij od szybkiej wyceny przez telefon albo dokładnej wyceny na miejscu.”
- Baner kopii: „Ostatnia kopia danych: {dni temu}” z przyciskiem „Zrób kopię”; bez kopii: „Nie masz jeszcze kopii danych. Dane są tylko w tej przeglądarce.” z przyciskiem „Zrób kopię”
- Baner ustawień: „Ustawienia domyślne – uzupełnij” z przyciskiem „Uzupełnij”
- Lista wycen: nagłówek „Wyceny”; pusta: „Brak zapisanych wycen.”

**Wzorce do naśladowania:**
- `docs/operator/etap-5-wariant-b.html` — sekcja `ekran-startowy` (klasy `.hello`, `.tiles`, `.stats`, `.task`, `.st`, `.banner.uw`)

**Scenariusze testowe:**
- [Unit] `doZrobienia` dla wycen do wysłania, przyjętej z terminem jutro i przyjętej z terminem wczoraj daje „Wyślij ofertę” i jedno „Wpisz czas pracy”
- [Unit] `podsumowanieMiesiaca` liczy wyceny z bieżącego miesiąca bez szkiców i średnią realną stawkę z wykonań
- [Unit] `e2e/stany/wyceny-do-zrobienia.json` wczytuje się przez `odczytajKopie`-zgodny kształt stanu v1 (magazyn bez błędu)
- [E2E] `ekran-startowy-zadania` — okno 360×800, wstrzyknij `e2e/stany/wyceny-do-zrobienia.json` do `localStorage['wyceny-sprzatanie:stan']`, otwórz http://localhost:5174/#/start, zrób screenshot, kliknij wiersz „Wyślij ofertę”, wróć, kliknij „Wyceny” → karta „Do zrobienia 2” z „Wyślij ofertę” i „Wpisz czas pracy”, baner „Nie masz jeszcze kopii danych…”, wiersz otwiera `#/wycena/<id>`, lista wycen ma trzy pozycje z pigułkami „Do wysłania”, „Wysłana”, „Przyjęta”

**Weryfikacja:**
- `node --test src/widoki/start-dane.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel porównuje start na telefonie z makietą `ekran-startowy` (układ, teksty, statusy)

- [ ] **IU-11: Ustawienia firmy i kreator pierwszego uruchomienia**

**Cel:** Ekran ustawień (województwo, VAT, dane firmy, tempo, szacunki kosztów) i kreator pierwszego uruchomienia z możliwością pominięcia.

**Wymagania:** R24, R8, R15, R17, R5

**Zależności:** IU-10

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/widoki/ustawienia.js` | 0 → 140 | — | nowy |
| Stwórz | `src/widoki/ustawienia-sekcje.js` | 0 → 210 | — | nowy |
| Stwórz | `src/widoki/ustawienia-tempo.js` | 0 → 80 | — | nowy |
| Stwórz | `src/widoki/kreator-startowy.js` | 0 → 120 | — | nowy |
| Stwórz | `src/widoki/ustawienia-formularz.js` | 0 → 100 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 34 → 37 | — | zostaje |
| Modyfikuj | `src/app.js` | 100 → 108 | — | zostaje |
| Test (unit) | `src/widoki/ustawienia-formularz.test.js` | 0 → 110 | — | nowy |

**Delegate to:** feature-builder-ui

**Makiety:** `ustawienia-firmy`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; zapis przez `zapiszUstawienia` i `pominKreator` (IU-6), walidacja przez `src/dane/walidacja.js` (IU-6).
- `ustawienia-formularz.js` (czyste funkcje): wartości pól → `{ patch, bledy }` (liczby z przecinkiem dziesiętnym, puste NIP i e-mail dozwolone, telefon i nazwa wymagane tylko do oferty — tu ostrzeżenie, nie błąd).
- `ustawienia-sekcje.js` (układ z makiety `ustawienia-firmy`: karty z wierszami „etykieta — wartość — strzałka”, wiersz otwiera arkusz z polem): karta „Dane do oferty” (nazwa, telefon, e-mail, NIP), karta „Rynek i VAT” (województwo — 16 z `katalog.wojewodztwa` + „średnia krajowa”, linia ze stawką województwa i ceną mieszkania 50 m² z silnika, chipy statusu VAT z opisem), karta „Koszty zlecenia (szacunki do zmiany)” (chemia zł/h, dojazd dla klienta zł/km i darmowy promień, Twój koszt dojazdu zł/km, sprzęt zł/h dla każdej maszyny z `koszty_firmy.sprzet` w arkuszu „wg maszyny”; wartości domyślne z `data/ceny.json` jako podpowiedź i „Przywróć domyślne”). `ustawienia-tempo.js`: karta „Tempo pracy” — chip źródła („z {n} zleceń”, „domyślne”, „ręczne”), tempo z `tempoDoWyceny` (IU-7), zdanie z czasem mieszkania 50 m² z tempem i według normy, link „Wróć do wartości ręcznej ({t}×)” (ustawia `tempo.reczne`, edytowalne w arkuszu 0,5–3,0 z krokiem 0,05) albo „Licz z moich zleceń” (`tempo.reczne = null`), informacja o progu `MIN_ZLECEN_TEMPA` (= 3, z `src/silnik/tempo.js`).
- `ustawienia.js` (`#/ustawienia`): nagłówek, karty w kolejności z makiety, na końcu wiersz „Kopia danych” z `dniOdKopii` (IU-8) prowadzący do `#/kopia`; zapis po zmianie pola z komunikatem „Zapisano”; dolny pasek z aktywną „Firma”.
- `kreator-startowy.js` (`#/ustawienia/start`): te same sekcje po jednej z paskiem postępu (Województwo, VAT, Firma, Tempo), przyciski „Dalej”, „Wstecz”, „Pomiń” (→ `pominKreator`, start z banerem ustawień domyślnych), na pierwszym kroku link „Mam kopię danych — przywróć” (→ `#/kopia`); koniec → `kreatorZakonczony: true` i start.
- `src/app.js`: gdy `ustawienia` w stanie są null i trasa nie jest `#/kopia`, przekierowanie na `#/ustawienia/start` (R24).

**Teksty (verbatim):**
- Nagłówek: „Twoja firma” / „Ustawienia używane w każdej wycenie”; kreator: „Ustawienia firmy” / „Krok {n} z 4”
- Karty: „Dane do oferty”, „Rynek i VAT”, „Tempo pracy”, „Koszty zlecenia (szacunki do zmiany)”; wiersz „Kopia danych” z wartością „{dni temu}”
- Wiersze firmy: „Nazwa firmy”, „Telefon”, „E-mail”, „NIP (opcjonalnie)”; pusta wartość: „nie podano”
- Rynek: „Województwo”; „Stawka rynku {x} zł/h · mieszkanie 50 m² ok. {y} zł”; „Status VAT” z chipami „Zwolniony z VAT”, „Czynny podatnik VAT”; opis: „Ceny w ofercie bez VAT. Czynny podatnik zobaczy cenę brutto (VAT 23%) i netto obok.”
- Tempo: chip „z {n} zleceń” / „domyślne” / „ręczne”; „{t}× normy rynkowej”; „Mieszkanie 50 m² zajmuje Ci ok. {czas z tempem} (norma rynku: {czas normy}). Tempo zmienia czas pracy i to, ile zostaje dla Ciebie – nie cenę.”; linki „Wróć do wartości ręcznej ({t}×)”, „Licz z moich zleceń”; „Własne tempo policzymy po 3 zleceniach z wpisanym czasem.”
- Koszty: „Chemia” — „{x} zł za godzinę”; „Dojazd dla klienta” — „{x} zł/km ponad {r} km”; „Twój koszt dojazdu” — „{x} zł/km”; „Sprzęt” — „wg maszyny”; „Przywróć domyślne”
- Błędy: „Wpisz 9 cyfr numeru telefonu.”, „Wpisz poprawny adres e-mail.”, „NIP ma 10 cyfr i poprawną sumę kontrolną.”, „Wpisz liczbę od {min} do {max}.”
- Przyciski kreatora: „Dalej”, „Wstecz”, „Pomiń”, „Gotowe”; link „Mam kopię danych — przywróć”
- Zapis: „Zapisano”

**Wzorce do naśladowania:**
- `src/widoki/start.js` (IU-10) — budowa widoku z komponentów i nawigacja przez `TRASY`

**Scenariusze testowe:**
- [Unit] formularz z telefonem „600-123-456” i NIP-em pustym daje patch bez błędów; chemia „4,5” → 4.5; chemia „-1” → błąd zakresu
- [Unit] tempo „3,5” daje błąd „Wpisz liczbę od 0,5 do 3.”
- [E2E] `kreator-ustawien` — okno 360×800, wyczyść localStorage, otwórz http://localhost:5174/, przejdź kreator: województwo „mazowieckie”, „Czynny podatnik VAT”, nazwa „Firma Test”, telefon „600 123 456”, tempo bez zmian, „Gotowe”; potem otwórz „Firma” → start bez banera „Ustawienia domyślne – uzupełnij”, w ustawieniach „Czynny podatnik VAT” zaznaczony i „1,3× normy rynkowej”
- [E2E] `kreator-ustawien-pominiety` — wyczyść localStorage, otwórz http://localhost:5174/, kliknij „Pomiń” → start z banerem „Ustawienia domyślne – uzupełnij”, a „Uzupełnij” otwiera `#/ustawienia`

**Weryfikacja:**
- `node --test src/widoki/ustawienia-formularz.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel przechodzi kreator na telefonie i porównuje ustawienia z makietą `ustawienia-firmy`

- [ ] **IU-12: Ekran kopii zapasowej i ekran ratunkowy**

**Cel:** Eksport danych do pliku, import z potwierdzeniem „połącz” albo „zastąp” i ekran ratunkowy przy uszkodzonych danych w przeglądarce.

**Wymagania:** R23

**Zależności:** IU-11

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/widoki/kopia.js` | 0 → 150 | — | nowy |
| Stwórz | `src/widoki/ratunek.js` | 0 → 65 | — | nowy |
| Stwórz | `src/ui/plik.js` | 0 → 50 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 37 → 39 | — | zostaje |
| Modyfikuj | `src/app.js` | 108 → 118 | — | zostaje |

**Delegate to:** feature-builder-ui

**Makiety:** `kopia-zapasowa`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; logika kopii w `src/dane/kopia.js` (IU-8), zapis pod `KLUCZ_MAGAZYNU` z `src/dane/magazyn.js`.
- `src/ui/plik.js`: `pobierzPlik(nazwa, tresc, typ)` (Blob + `<a download>` + `URL.revokeObjectURL`), `wybierzPlik(accept)` → tekst pliku (ukryte `<input type="file">`, `FileReader`), limit 10 MB.
- `kopia.js` (`#/kopia`, układ z makiety `kopia-zapasowa`): baner informacji, karta „Zapisz kopię do pliku” (ostatnia kopia, chipy z `podsumowanieKopii` z IU-8, przycisk: `utworzKopie` → `pobierzPlik` → `oznaczKopie`), karta „Wczytaj kopię z pliku” (`odczytajKopie`; przy istniejących wycenach albo ustawieniach dialog z wyborem „Połącz” / „Zastąp” / „Anuluj”, bez danych — od razu zastąpienie), karta „Przypominaj o kopii” (chipy 7, 14, 30 dni → `zapiszUstawienia({ przypomnienieKopiiDni })` z IU-6; przed kreatorem ustawień, gdy ustawień brak, karta jest ukryta), banery sukcesu i błędu wg kodu `BladKopii`.
- `ratunek.js`: pokazywany przez `src/app.js`, gdy `magazyn.wczytaj()` zwraca `blad` (`uszkodzony` albo `nowsza_wersja`), zamiast routera; „Pobierz zapisane dane” (surowy tekst do pliku `wyceny-surowe-RRRR-MM-DD.txt`), „Wczytaj kopię z pliku” i „Wyczyść dane i zacznij od nowa” (dialog potwierdzenia, potem `magazyn.wyczysc()` i przeładowanie).

**Teksty (verbatim):**
- Nagłówek: „Kopia danych” / „Twoje dane są tylko na tym urządzeniu”
- Baner: „Aplikacja nie ma konta ani serwera. Zapisz kopię do pliku i trzymaj ją np. w mailu albo w chmurze.”
- Karta zapisu: „Zapisz kopię do pliku”; „Ostatnia kopia: {data} ({dni temu})” / „Nie masz jeszcze kopii.”; chipy „{n} wycen” (odmiana), „{n} zleceń” (odmiana), „ustawienia firmy”; przycisk „Zapisz kopię”
- Karta odczytu: „Wczytaj kopię z pliku”; „Zanim wczytamy kopię, zapytamy, czy połączyć ją z danymi na tym urządzeniu, czy je zastąpić.”; przycisk „Wybierz plik”
- Karta przypomnień: „Przypominaj o kopii”; chipy „co 7 dni”, „co 14 dni”, „co 30 dni”
- Sukces eksportu: „Kopia zapisana: {nazwa pliku}”; sukces importu: „Wczytano kopię z {data}: {n} wycen.”
- Dialog: „W aplikacji są już dane. Co zrobić z kopią?”; „Połącz” / „Dodaj wyceny z kopii, a przy tych samych zostaw nowsze.”; „Zastąp” / „Usuń obecne dane i wczytaj tylko kopię.”; „Anuluj”
- Błędy: `zly_plik` „To nie jest plik kopii tej aplikacji.”; `nowsza_wersja` „Ta kopia pochodzi z nowszej wersji aplikacji. Odśwież aplikację i spróbuj ponownie.”; `uszkodzony` „Plik kopii jest uszkodzony.”
- Ratunek: „Nie udało się odczytać danych zapisanych w przeglądarce.”; „Pobierz zapisane dane”, „Wczytaj kopię z pliku”, „Wyczyść dane i zacznij od nowa”; potwierdzenie „Usunąć wszystkie dane z tej przeglądarki? Tego nie można cofnąć.”

**Wzorce do naśladowania:**
- `src/widoki/ustawienia.js` (IU-11) — karty i banery z `src/ui/komponenty/uklad.js`

**Scenariusze testowe:**
- [E2E] `kopia-eksport` — okno 360×800, wstrzyknij `e2e/stany/wyceny-do-zrobienia.json`, otwórz http://localhost:5174/#/kopia, kliknij „Zapisz kopię”, wróć na start → baner „Kopia zapisana: wyceny-kopia-<dzisiejsza data>.json”, na starcie brak banera przypomnienia o kopii
- [E2E] `ekran-ratunkowy` — wstrzyknij do `localStorage['wyceny-sprzatanie:stan']` tekst `{zepsute`, otwórz http://localhost:5174/ → ekran „Nie udało się odczytać danych zapisanych w przeglądarce.” z trzema przyciskami
- [Manual] import pliku kopii z systemowego okna wyboru plików na Androidzie i iPhonie (połącz i zastąp)

**Weryfikacja:**
- `npm run typecheck` przechodzi bez błędów
- `npm test` przechodzi

**Operator checklist:**
- [ ] Właściciel zapisuje kopię na telefonie i wczytuje ją na komputerze (opcja „Połącz”)

- [ ] **IU-13: PWA: manifest, service worker, ikony zastępcze i instrukcja dla iPhone'a**

**Cel:** Instalacja na ekranie początkowym, działanie offline po pierwszym uruchomieniu i ostrzeżenie dla iPhone'a o osobnych danych Safari i aplikacji z ekranu początkowego.

**Wymagania:** R28, R23

**Zależności:** IU-12

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `manifest.webmanifest` | — → — | — | nowy |
| Stwórz | `sw.js` | 0 → 80 | — | nowy |
| Stwórz | `src/pwa/rejestracja.js` | 0 → 60 | — | nowy |
| Stwórz | `scripts/ikony-zastepcze.mjs` | 0 → 95 | — | nowy |
| Stwórz | `ikony/ikona.svg` | — → — | — | nowy |
| Stwórz | `ikony/ikona-192.png` | — → — | — | nowy |
| Stwórz | `ikony/ikona-512.png` | — → — | — | nowy |
| Stwórz | `ikony/ikona-maskable-512.png` | — → — | — | nowy |
| Stwórz | `ikony/apple-touch-icon.png` | — → — | — | nowy |
| Modyfikuj | `index.html` | — → — | — | zostaje |
| Modyfikuj | `src/app.js` | 118 → 124 | — | zostaje |
| Modyfikuj | `src/widoki/start.js` | 160 → 178 | — | zostaje |
| Test (unit) | `src/pwa/rejestracja.test.js` | 0 → 60 | — | nowy |

**Delegate to:** feature-builder-ui

**Makiety:** —

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc); `sw.js` to klasyczny skrypt service workera (bez importów modułów, poza typecheck).
- `manifest.webmanifest`: `name` „Wyceny sprzątania”, `short_name` „Wyceny”, `lang` „pl”, `start_url` `./#/start`, `scope` `./`, `display` `standalone`, `background_color` `#f4f1ea`, `theme_color` `#26282c`, ikony 192, 512 i maskable 512. `index.html`: link manifestu, `apple-touch-icon`, `theme-color`, ikona SVG.
- `sw.js`: `WERSJA_CACHE = 'wyceny-v1'`; `install` — wstępny zapis `./`, `index.html`, `manifest.webmanifest`, `data/ceny.json`, `data/normy.json`, `data/rynek.json`, `data/chemia.json`, `data/domyslne.json` (tylko pliki istniejące; kolejne fazy dopisują swoje); `fetch` — tylko GET z tego samego originu: sieć najpierw z limitem 4 s, udana odpowiedź do cache, przy błędzie cache, dla nawigacji zapasowo `index.html`; `activate` — usunięcie innych cache i `clients.claim()`.
- `src/pwa/rejestracja.js`: `zarejestrujServiceWorker()` (`navigator.serviceWorker.register('./sw.js')`, błąd tylko logowany) wołane z `src/app.js`; czysta `czyPokazacInstrukcjeIos({ userAgent, standalone, zamknieta })` → true na iPhonie i iPadzie w Safari poza trybem aplikacji, gdy użytkownik jej nie zamknął (`preferencje.iosInstrukcjaZamknieta` w stanie z IU-6).
- `src/widoki/start.js`: baner informacji z instrukcją dla iPhone'a i przyciskiem zamknięcia.
- `scripts/ikony-zastepcze.mjs` (Node, `node:zlib` + CRC32, bez zależności): generuje PNG 180, 192, 512 i maskable 512 — tło `#26282c`, w środku koło `#2340a8` (maskable z marginesem 20%). `ikony/ikona.svg` — ten sam znak. Ikony są zastępcze do etapu 6 (checklista: ikona aplikacji).

**Teksty (verbatim):**
- Baner iPhone: „Na iPhonie dodaj aplikację do ekranu początkowego: Udostępnij → Do ekranu początkowego. Dane z Safari nie przechodzą do aplikacji na ekranie początkowym, więc zrób to przed pierwszą wyceną.” i przycisk „Rozumiem”

**Wzorce do naśladowania:**
- `scripts/serwer-dev.mjs` (IU-1) — skrypt Node bez zależności

**Scenariusze testowe:**
- [Unit] `czyPokazacInstrukcjeIos` dla Safari na iPhonie poza trybem aplikacji → true; w trybie standalone, na Androidzie i po zamknięciu → false
- [E2E] `pwa-manifest` — otwórz http://localhost:5174/, przeładuj, sprawdź przez `agent-browser eval` `navigator.serviceWorker.controller !== null` i `fetch('manifest.webmanifest').then(r => r.json())` → service worker kontroluje stronę, manifest ma `short_name` „Wyceny” i trzy ikony
- [Manual] Chrome DevTools → Network „Offline” → aplikacja otwiera się i liczy wycenę z danych w cache
- [Manual] instalacja na ekranie początkowym Androida i iPhone'a; ikona zastępcza widoczna

**Weryfikacja:**
- `node --test src/pwa/rejestracja.test.js` przechodzi
- `node scripts/ikony-zastepcze.mjs` tworzy cztery pliki PNG w `ikony/`
- `npm run typecheck` przechodzi bez błędów

### Faza 4 — Kreator dokładnej wyceny

**Zależy od:** Faza 3

- [ ] **IU-14: Stan kreatora i wybór usługi**

**Cel:** Szkic dokładnej wyceny zapisywany na bieżąco, przeliczanie migawki silnikiem i pierwszy krok kreatora: usługa, wariant i województwo.

**Wymagania:** R25, R5, R29

**Zależności:** Faza 3

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/kreator/stan.js` | 0 → 200 | — | nowy |
| Stwórz | `src/widoki/kreator-wspolne.js` | 0 → 85 | — | nowy |
| Stwórz | `src/widoki/kreator-usluga.js` | 0 → 150 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 39 → 41 | — | zostaje |
| Test (unit) | `src/kreator/stan.test.js` | 0 → 170 | — | nowy |

**Delegate to:** feature-builder-fullstack

**Makiety:** `kreator-wybor-uslugi`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; `src/kreator/` to logika bez DOM, `src/widoki/` to DOM.
- `src/kreator/stan.js`: `KROKI_KREATORA` (źródło stałej, wartości jak w rejestrze). `nowySzkic(kontekst, { uslugaId, wariantId, wojewodztwoId })` → wycena `szkic` z wejściem startowym (pomieszczenia puste — nowe pomieszczenie dostaje kurz poziom 1 i reguły `brud_domyslny` usługi; pozycje z ilością 0, przy usługach m² z progami pierwsza pozycja główna włączona; dojazd 0) przez `utworzSzkic` (IU-7); `zmienWejscie(kontekst, id, fn)` (zapis + przeliczenie), `przelicz(wycena, kontekst)` → migawka: `wycenUsluge` + `widelkiRynku` (IU-4), `cenaDlaKlienta` (IU-5) z `podstawa_ceny` usługi, `wersjaDanych` katalogu; koszt zlecenia liczy podsumowanie, nie migawka. `bledyKroku(krok, wycena, katalog)` (zakres: co najmniej jedno pomieszczenie albo pozycja > 0). Zmiana usługi przy niepustym zakresie wymaga potwierdzenia i czyści zakres. Wycena `wykonana` → tylko odczyt (`BladWyceny('tylko_odczyt')` z IU-7).
- `kreator-wspolne.js`: rama kroku z makiet — nagłówek „Nowa wycena” (edycja zapisanej: „Wycena {numer}”) ze strzałką wstecz i podtytułem „Krok {n} z 5 · {opis kroku}” (krok zakresu: nazwa usługi), `pasekPostepu(KROKI_KREATORA, aktywny)` z IU-9, treść, stopka: na kroku usługi sam „Dalej”, na krokach zakresu i dodatków „Razem {kwota}” (z migawki) i „Dalej”, blokada przy `bledyKroku`. Wstecz to strzałka w nagłówku.
- `kreator-usluga.js` (`#/kreator/usluga`, opcjonalnie `?wycena=<id>`, makieta `kreator-wybor-uslugi`): wiersz województwa (podpowiedziane z ustawień, 16 + „średnia krajowa”, wybór w arkuszu) ze stawką; dwie grupy wg trybu — usługi z pomieszczeniami i usługi z pozycjami — jako lista z przyciskami opcji, nazwą z `data/ceny.json` i podpowiedzią ceny z silnika (mieszkania: cena 50 m² w wybranym województwie; po remoncie: cena za m² z 50 m²; biura: tekst o wariantach; usługi z pozycjami: najniższa cena pozycji głównej × wsp za jednostkę); AGD (`tylko_dodatek`) poza listą, z notką pod listą; przy biurach po wybraniu chipy wariantów z `warianty`. „Dalej” tworzy szkic albo zapisuje zmiany i przechodzi do `#/kreator/zakres?wycena=<id>`. Klienta wpisuje się przy zapisie podsumowania (IU-18) albo w ofercie (IU-23).

**Teksty (verbatim):**
- Nagłówek: „Nowa wycena” / „Krok 1 z 5 · usługa”; edycja: „Wycena {numer}”
- Pasek postępu: „Usługa”, „Zakres”, „Dodatki”, „Chemia”, „Cena”
- Wiersz: „Województwo” — „{nazwa} · {stawka} zł/h”; opcja „średnia krajowa”
- Grupy: „Dom i biuro – wycena z pomieszczeń”, „Wycena z pozycji – ilość lub metraż”
- Podpowiedzi: „50 m² ok. {x} zł”, „ok. {x} zł/m²”, „jednorazowo albo abonament”, „od {x} zł/m²”, „od {x} zł/szt.”
- Notka pod listą: „AGD, szafki i balkon dodasz w kroku „Dodatki”.”
- Wariant biur: nazwy z `data/ceny.json` (np. „Jednorazowo”, „Abonament 1× w tygodniu”)
- Stopka: „Dalej”; na krokach zakresu i dodatków „Razem” z kwotą
- Potwierdzenie zmiany usługi: „Zmiana usługi wyczyści wpisane pomieszczenia i pozycje. Zmienić?”

**Wzorce do naśladowania:**
- `src/widoki/ustawienia-sekcje.js` (IU-11) — wybór województwa i chipy

**Scenariusze testowe:**
- [Unit] `nowySzkic` dla `mieszkanie_po_remoncie` daje wycenę `szkic` z regułą brudu pył budowlany poziom 2 stosowaną do nowego pomieszczenia
- [Unit] `przelicz` dla 4 pomieszczeń układu 50 m² standard w mazowieckim daje migawkę z ceną 250, medianą 250 i widełkami 120–450
- [Unit] `bledyKroku('zakres')` dla wyceny bez pomieszczeń zwraca błąd; zmiana usługi czyści pomieszczenia
- [Unit] `zmienWejscie` na wycenie wykonanej rzuca `BladWyceny` z kodem `tylko_odczyt`

**Weryfikacja:**
- `node --test src/kreator/stan.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-15: Krok zakresu: pomieszczenia i brud**

**Cel:** Lista pomieszczeń z metrażem i poziomami brudu dla usług w trybie pomieszczeń, z czasem normowym na bieżąco.

**Wymagania:** R25, R14

**Zależności:** IU-14

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/kreator/pomieszczenia.js` | 0 → 110 | — | nowy |
| Stwórz | `src/widoki/kreator-pomieszczenia.js` | 0 → 200 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 41 → 42 | — | zostaje |
| Test (unit) | `src/kreator/pomieszczenia.test.js` | 0 → 110 | — | nowy |

**Delegate to:** feature-builder-fullstack

**Makiety:** `kreator-pomieszczenia`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; zmiany przez `zmienWejscie` z `src/kreator/stan.js` (IU-14), krok `zakres` z `KROKI_KREATORA`.
- `src/kreator/pomieszczenia.js` (czyste funkcje na `wejscie.pomieszczenia`): `dodajPomieszczenie(wejscie, typ, usluga)` (domyślna nazwa z typu: pokój → „Pokój”, przedpokój → „Przedpokój”, kuchnia → „Kuchnia” albo „Aneks kuchenny”, łazienka → „Łazienka”, biuro → „Biuro”, sala → „Sala”, kuchnia socjalna → „Kuchnia socjalna”, toaleta → „Toaleta”, korytarz → „Korytarz”; brud: kurz poziom 1 i reguły `brud_domyslny`), `zmienNazwe` (1–40 znaków), `usunPomieszczenie`, `ustawMetraz` (0 < m² ≤ 1000, inaczej kod błędu), `ustawBrud(wejscie, indeks, brudId, poziom)` (poziom 0 = brak), `podsumowanieZakresu(wejscie, katalog, tempo)` → m² razem, minuty normowe (`minutyPomieszczen` z IU-3) i minuty z tempem.
- `kreator-pomieszczenia.js` (`#/kreator/zakres` dla trybu `pomieszczenia`, makieta `kreator-pomieszczenia`): karty pomieszczeń — zwinięta: nazwa, nazwa typu małymi literami, m², chipy aktywnego brudu („Kurz 1”); rozwinięta: licznik metrażu (krok 1 m²), legenda poziomów, wiersze kurz, tłuszcz, kamień i osad, pleśń z chipami „–”, „1”, „2”, „3”, link dodający pozostałe rodzaje brudu z `normy.brud` (sierść, pył budowlany), „Zwiń”, usuwanie; „+ Dodaj pomieszczenie” z arkuszem typów z `zestawy_pomieszczen` usługi (dom albo biuro); baner po zamianie szybkiej wyceny (IU-21); przy biurach chipy wariantu nad listą; stopka z m², czasem z tempem (`tempoDoWyceny` z IU-7), kwotą i „Dalej”.

**Teksty (verbatim):**
- Podtytuł nagłówka: „Krok 2 z 5 · {nazwa usługi}”
- Pusta lista: „Dodaj pomieszczenia, które sprzątasz.”
- „+ Dodaj pomieszczenie”; arkusz typów z nazwami z `data/normy.json` (np. „Pokój, sypialnia, salon”)
- Licznik: „Metraż”; błąd: „Wpisz metraż od 0,5 do 1000 m².”
- Brud: legenda „Brud: – brak, 1 lekki, 2 średni, 3 silny”; chipy „–”, „1”, „2”, „3”; link „+ {pozostałe rodzaje brudu po przecinku}”; chip aktywnego brudu „{nazwa brudu} {poziom}”
- „Zwiń”, „Usuń pomieszczenie”
- Baner: „Przeniesione z szybkiej wyceny: {m²} m², {n} łazienka/łazienki, {kuchnia albo aneks}.”
- Stopka: „{m²} m² · ok. {czas z tempem}”, kwota, „Dalej”

**Wzorce do naśladowania:**
- `src/widoki/kreator-usluga.js` (IU-14) — rama `kreator-wspolne.js`

**Scenariusze testowe:**
- [Unit] dodanie kuchni i łazienki do wyceny po remoncie ustawia kurz 1 i pył budowlany poziom 2 w obu; nazwa łazienki „Łazienka”
- [Unit] `ustawMetraz` z 0 i 1500 zwraca kod błędu, z 12,5 zapisuje 12,5
- [Unit] `podsumowanieZakresu` dla układu 50 m² standard daje 50 m² i minuty ze scenariusza kalibracji

**Weryfikacja:**
- `node --test src/kreator/pomieszczenia.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-16: Kroki zakresu z pozycjami i dodatków z dojazdem**

**Cel:** Ilości i metraże pozycji z dopłatami, progiem metrażu i poziomem brudu oraz krok dodatków (AGD, okna, tapicerka, dywany przy usłudze) z dojazdem.

**Wymagania:** R25

**Zależności:** IU-15

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/kreator/pozycje.js` | 0 → 120 | — | nowy |
| Stwórz | `src/widoki/kreator-pozycje.js` | 0 → 180 | — | nowy |
| Stwórz | `src/widoki/kreator-dodatki.js` | 0 → 150 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 42 → 44 | — | zostaje |
| Test (unit) | `src/kreator/pozycje.test.js` | 0 → 120 | — | nowy |

**Delegate to:** feature-builder-fullstack

**Makiety:** `kreator-pozycje`, `kreator-dodatki`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; zmiany przez `zmienWejscie` (IU-14), kroki `zakres` i `dodatki` z `KROKI_KREATORA`.
- `src/kreator/pozycje.js`: `ustawIlosc(wejscie, pozycjaId, ilosc)` (0 ≤ ilość ≤ 100 000; sztuki całkowite), `ustawPowierzchnie(wejscie, m2)` i `przelaczPozycje(wejscie, pozycjaId, wlaczona)` dla usług m² z progami (wszystkie włączone pozycje dostają tę samą ilość m²; co najmniej jedna pozycja główna), `ustawPoziomBrudu`, `ustawDodatek(wejscie, uslugaId, pozycjaId, ilosc, tryb)` (`w_cenie` | `propozycja`; ilość 0 usuwa), `ustawDojazd(wejscie, km)` (0–500 km), `infoProgu(usluga, m2, katalog)` → `{ od, do, mnoznik }` albo null przy mnożniku 1, `infoDojazdu(km, stawki)` → `{ kwotaKlienta, kmPonad, kosztFirmy, kmRazem }`.
- `kreator-pozycje.js` (`#/kreator/zakres` dla trybu `pozycje`, makieta `kreator-pozycje`): usługi m² z `progi` — licznik powierzchni (krok 5 m²), baner progu, karta „Pozycje” z pozycjami głównymi (kwota i rozpisanie z progiem) i dopłatami jako przełączniki (rozpisanie bez progu, materiał „+ impregnat”), notka o materiale i minimum; okna, tapicerka, dywany — liczniki pozycji (szt. albo m²); chipy poziomu brudu przy `poziomy_brudu: true`; stopka „Razem” z kwotą i „Dalej”.
- `kreator-dodatki.js` (`#/kreator/dodatki`, makieta `kreator-dodatki`): karta „Dodatki” — pozycje usług z listy `dodatki` wybranej usługi (pogrupowane wg usługi) z przełącznikiem „w cenie”, ceną jednostkową i arkuszem ilości z opcją „Zaproponuj w ofercie”; karta „Dojazd” z licznikiem odległości w jedną stronę, kwotą dla klienta i kosztem firmy (stawki z ustawień albo z `data/ceny.json`); stopka „Razem”, suma propozycji i „Dalej”; usługi bez `dodatki` — tylko karta dojazdu.

**Teksty (verbatim):**
- Podtytuły nagłówka: „Krok 2 z 5 · {nazwa usługi}”, „Krok 3 z 5 · dodatki”
- Pozycje: licznik „Powierzchnia (m²)”; karta „Pozycje”; główna: „{m²} m² × {cena po progu} zł ({cena} zł {+/−p}%)”; dopłata: „dopłata · {m²} m² × {cena} zł”; z materiałem: „{cena} zł/m² + impregnat”
- Próg: „Małe zlecenie (do {do} m²): cena za m² +{p}%.”; „Duże zlecenie (od {od} m²): cena za m² −{p}%.”
- Notka: „Impregnat doliczamy klientowi osobno (ok. {x} zł/m²). Minimum zlecenia: {min} zł.” (bez materiału tylko zdanie o minimum)
- Poziom brudu: „Zabrudzenie” z chipami „lekkie”, „średnie”, „silne”
- Błąd ilości: „Wpisz liczbę od 0 do 100 000.”; brak pozycji: „Wybierz co najmniej jedną pozycję.”
- Dodatki: karta „Dodatki”; wiersz „{nazwa}” / „{ilość} × {cena} zł” albo „{cena} zł”, w trybie propozycji „{ilość} × {cena} zł · zaproponuj w ofercie” i kwota „+{kwota}”; arkusz: „Ilość”, „W cenie”, „Zaproponuj w ofercie”, „Usuń”; notka: „Włączone dodatki wchodzą do ceny. „Zaproponuj w ofercie” – klient zobaczy je jako „Możesz dobrać”.”
- Dojazd: karta „Dojazd”; licznik „Odległość w jedną stronę”; „Dla klienta ({km ponad} km ponad {promień} km × {stawka} zł)” z kwotą; w promieniu: „Dla klienta (w promieniu {promień} km)” — „0 zł”; „Twój koszt ({km razem} km × {stawka} zł)” z kwotą
- Stopka: „Razem”, kwota, „+{kwota} do zaproponowania”, „Dalej”
- Bez dodatków: „Ta usługa nie ma dodatków.”

**Wzorce do naśladowania:**
- `src/widoki/kreator-pomieszczenia.js` (IU-15)

**Scenariusze testowe:**
- [Unit] `ustawIlosc` dla okna z 2,5 szt. zwraca błąd, z 4 zapisuje 4; `infoProgu` dla kostki 40 m² daje mnożnik 1,15, a dla 100 m² null
- [Unit] `ustawPowierzchnie(40)` z włączonymi myciem i mchem daje obu pozycjom 40 m²; wyłączenie jedynej pozycji głównej zwraca błąd
- [Unit] `infoDojazdu(12, domyślne stawki)` daje 4 zł dla klienta (2 km ponad 10 km) i 27,60 zł kosztu (24 km × 1,15 zł); `infoDojazdu(8)` — 0 zł dla klienta
- [Unit] `ustawDodatek` z trybem `propozycja` zapisuje dodatek poza ceną; ilość 0 usuwa dodatek
- [E2E] `kreator-okna-minimum` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/kreator/usluga, wybierz „Mycie okien”, „Dalej”, ustaw „Okno 1-skrzydłowe” na 4, „Dalej”, „Dalej”, „Dalej” → podsumowanie z ceną 150 zł i informacją o minimum zlecenia

**Weryfikacja:**
- `node --test src/kreator/pozycje.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-17: Dobór chemii: krok kreatora i katalog**

**Cel:** Środki z bazy chemii dobrane do brudu i pozycji wyceny z kartą SDS oraz katalog środków z dolnego paska.

**Wymagania:** R26

**Zależności:** IU-16

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/silnik/chemia.js` | 0 → 120 | — | nowy |
| Stwórz | `src/widoki/karta-produktu.js` | 0 → 85 | — | nowy |
| Stwórz | `src/widoki/dobor-chemii.js` | 0 → 170 | — | nowy |
| Stwórz | `src/widoki/katalog-chemii.js` | 0 → 100 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 44 → 46 | — | zostaje |
| Test (unit) | `src/silnik/chemia.test.js` | 0 → 120 | — | nowy |

**Delegate to:** feature-builder-fullstack

**Makiety:** `dobor-chemii`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; `data/chemia.json` wczytywany leniwie przy pierwszym wejściu w chemię (`fetch` z limitem 10 s, pamiętany w kontekście).
- `src/silnik/chemia.js`: `kategorieDlaWyceny(wejscie, chemia, katalog)` → `[{ kategoria, powody }]` bez powtórzeń: usługi z pomieszczeniami — zawsze kategoria brudu `kurz` (poziom 1 jest w normie) i kategorie brudu użytego w pomieszczeniach; usługi z pozycjami i dodatki — kategorie, których `pozycje` zawierają klucz `usluga.pozycja` z ilością > 0; `bezKategorii(wejscie, chemia)` → pozycje z `bez_kategorii` z powodem; `kategorieDoRecznegoDodania(chemia)` → kategorie bez brudu i pozycji (dezynfekcja; decyzja 2026-10-23: można ją dodać ręcznie przy każdej usłudze, aplikacja jej nie podsuwa); `produktyKategorii(kategoria, chemia)`; `opisProduktu(produkt)` → pH („pH 7”, „pH 2–3”, „pH: brak danych”), stężenie („0,5–2%” albo „gotowy do użycia”), cena („82,87 zł / 5 l” brutto). Kosztu chemii z tego pliku nie liczysz (decyzja 2026-10-23).
- `karta-produktu.js`: nazwa, dostawca, przeznaczenie, pH, stężenie, cena, link do karty SDS (`target="_blank" rel="noopener noreferrer"`) z datą; Buzil (`sds.plik`) — link do strony produktu z dopiskiem o formularzu.
- `dobor-chemii.js` (`#/kreator/chemia`, makieta `dobor-chemii`): zdanie wstępne, karty kategorii z nagłówkiem (nazwa, rodzaje brudu albo pozycje · miejsca — nazwy pomieszczeń albo pozycji z `powody`) i pierwszymi dwoma produktami, „Pokaż wszystkie ({n})”, notki pozycji bez kategorii, link „+ Dodaj dezynfekcję” (zapis `wejscie.dezynfekcja` przez `zmienWejscie`), stopka „Pomiń” i „Dalej”.
- `katalog-chemii.js` (`#/chemia`): wszystkie kategorie z liczbą środków, po wybraniu — produkty kategorii.

**Teksty (verbatim):**
- Podtytuł nagłówka: „Krok 4 z 5 · chemia”; katalog z dolnego paska: nagłówek „Chemia” / „Środki od {n} dostawców”
- Zdanie wstępne: „Środki dobrane do zaznaczonego brudu. To podpowiedź – koszt chemii liczymy z Twojego szacunku ({x} zł/h), nie z tej listy.”
- Nagłówek kategorii: „{nazwa kategorii}” / „{rodzaje brudu albo pozycje} · {miejsca}”
- Produkt: „{pH} · {stężenie}” („pH 7”, „pH 2–3”, „pH: brak danych”; „gotowy do użycia”, „0,2–0,5% do mycia”); „{opakowanie} · {cena} zł brutto”; link „Karta SDS”; Buzil: „Karta SDS (formularz na stronie)”; chip dostawcy
- „Pokaż wszystkie ({n})”
- Bez kategorii: „{pozycja}: {powód z data/chemia.json}”
- „+ Dodaj dezynfekcję”
- Stopka: „Pomiń”, „Dalej”

**Wzorce do naśladowania:**
- `src/widoki/kreator-dodatki.js` (IU-16) — rama kroku kreatora

**Scenariusze testowe:**
- [Unit] mieszkanie po remoncie daje kategorie uniwersalny (kurz) i poremontowy (pył budowlany); sierść poziom 1 nie dubluje kategorii uniwersalnej
- [Unit] sprzątanie hal z zamiataniem daje notkę „zamiatanie na sucho” bez kategorii; doczyszczanie z usuwaniem farby — notkę o zmywaczu farb
- [Unit] dezynfekcja jest w `kategorieDoRecznegoDodania`, a nie w `kategorieDlaWyceny`; produkt Buzil bez pH daje „pH: brak danych”
- [E2E] `dobor-chemii-po-remoncie` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, utwórz dokładną wycenę „Mieszkanie lub dom – sprzątanie po remoncie” z pokojem 20 m², przejdź do kroku „Chemia”, zrób screenshot, kliknij pierwszą „Karta SDS” → widać kategorię środków poremontowych z produktami, link SDS otwiera nową kartę z adresem z `data/chemia.json`

**Weryfikacja:**
- `node --test src/silnik/chemia.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-18: Podsumowanie wyceny i zapisana wycena**

**Cel:** Cena rynkowa z widełkami, ręczna zmiana ceny, VAT, koszt zlecenia i „zostaje dla Ciebie” na bieżąco, zapis wyceny oraz widok zapisanej wyceny ze zmianą statusu.

**Wymagania:** R5, R7, R8, R9, R15, R25, R29

**Zależności:** IU-17

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/kreator/podsumowanie.js` | 0 → 170 | — | nowy |
| Stwórz | `src/widoki/podsumowanie.js` | 0 → 180 | — | nowy |
| Stwórz | `src/widoki/podsumowanie-karty.js` | 0 → 200 | — | nowy |
| Modyfikuj | `src/widoki/indeks.js` | 46 → 48 | — | zostaje |
| Test (unit) | `src/kreator/podsumowanie.test.js` | 0 → 170 | — | nowy |

**Delegate to:** feature-builder-fullstack

**Makiety:** `podsumowanie-wyceny`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; krok `cena` z `KROKI_KREATORA`; statusy z `STATUSY_WYCENY` (IU-7), etykiety z `ETYKIETY_STATUSOW` w `src/ui/statusy.js` (IU-10).
- `src/kreator/podsumowanie.js`: `widokPodsumowania(wycena, kontekst)` → `{ cena: { brutto, netto, vat, czyReczna, rozbicie }, rynek: { mediana, od, do, pelne, procent, polozenie: 'ponizej' | 'w' | 'powyzej' }, zostaje: { kwota, naGodzine, minutyWlasne, tempo, zrodloTempa }, koszty: [wiersze], abonament, ostrzezenia }`; koszt przez `kosztZlecenia` (IU-5) z `scalKoszty` (IU-6) i `tempoDoWyceny` (IU-7); `ustawCeneReczna(kontekst, id, brutto)` (kwota płacona przez klienta, liczba > 0) i `przywrocCeneModelu`; ostrzeżenia: dane rynkowe nowsze niż `wersjaDanych` migawki, cena dokładna poza widełkami szybkiej wyceny (`wycena.szybka`), oferta nieaktualna.
- `podsumowanie.js`: tryb kreatora (`#/kreator/cena?wycena=<id>`) — przycisk „Zapisz” otwiera arkusz z opcjonalnym polem klienta, potem `zapiszWycene` z IU-7 → status `do_wyslania`, numer, przejście do `#/wycena/<id>`; pod kartą kosztów notka z `wynik.propozycje`; tryb zapisanej wyceny (`#/wycena/<id>`) — te same karty, akcje wg statusu: „Edytuj” (kreator od kroku usługi), „Klient przyjął” (→ `przyjeta`), „Klient zrezygnował” (→ `odrzucona`), „Usuń wycenę” (dialog); baner „Przelicz” przy nowszych danych (przeliczenie migawki i komunikat ze starą i nową ceną); wycena wykonana — bez edycji. Przyciski „Przygotuj ofertę” i „Wpisz czas pracy” dochodzą w IU-23 i IU-19.
- `podsumowanie-karty.js`: karty z makiety — „Cena dla klienta” (kwota z zakreślaczem, znacznik położenia, rozbicie, VAT), „Twoja cena na tle rynku” (pasek widełek `--marka-zielen-wykres` z medianą i znacznikiem ceny), „Zostaje dla Ciebie” (kolory `--sukces-*`), „Koszt zlecenia” (wiersze: cena dla klienta, chemia, sprzęt, dojazd, zostaje); edycja ceny w arkuszu z polem i przeliczeniem przy każdej zmianie (R7).

**Teksty (verbatim):**
- Tytuł: „Podsumowanie”; podtytuł: „Wycena {numer} · {klient}” albo „Nowa wycena”
- „Cena dla klienta”, przycisk „Zmień”; znaczniki „w widełkach rynku”, „poniżej widełek rynku”, „powyżej widełek rynku”
- Rozbicie: „sprzątanie {x} zł + dojazd {y} zł”; VAT zwolniony: „bez VAT (firma zwolniona)”; czynny: „w tym VAT 23%: {vat} zł · netto {netto} zł”
- „Twoja cena na tle rynku”; „mediana {x}”, „Twoja cena {y} ({procent})”; „rynek od {od} zł do {do} zł”; niepełne: „rynek od {od} zł do {do} zł (część pozycji bez danych o widełkach)”
- „Zostaje dla Ciebie”; „{x} zł za godzinę pracy · {czas z tempem} (tempo {t}×)” ze znakiem ✓ (ikona check)
- „Koszt zlecenia”: „Cena dla klienta”, „Chemia (szacunek {x} zł/h)”, „Chemia i materiały”, „Dojazd ({km tam i z powrotem} km × {stawka} zł)”, „Sprzęt” (z nazwą maszyny, gdy jest: „Sprzęt ({nazwa})”), „Zostaje dla Ciebie”; koszty jako „−{kwota}”
- Propozycje: „Do zaproponowania w ofercie: {opisy} +{kwota}”
- Arkusz zapisu: „Klient (np. imię i dzielnica)”, przycisk „Zapisz”
- Abonament: „za wizytę” i „miesięcznie ({n} wizyt)”
- Ręczna cena: „Twoja cena dla klienta (zł)”, „Przywróć cenę z modelu”
- Przyciski: „Zapisz”, „Edytuj”, „Klient przyjął”, „Klient zrezygnował”, „Usuń wycenę”; dialog „Usunąć wycenę {numer}? Tego nie można cofnąć.”
- Banery: „Dane rynkowe zmieniły się od zapisania tej wyceny.” z przyciskiem „Przelicz”; „Cena wynosiła {stara} zł, teraz {nowa} zł.”; „Cena jest poza widełkami podanymi klientowi w szybkiej wycenie ({od}–{do} zł).”

**Wzorce do naśladowania:**
- `docs/operator/etap-5-wariant-b.html` — sekcja `podsumowanie-wyceny`

**Scenariusze testowe:**
- [Unit] wycena 250 zł, ręczna cena 290 zł: `polozenie: 'w'`, procent „+16%”, `zostaje` rośnie o 40 zł, czas bez zmian
- [Unit] czynny VAT przy mieszkaniu: brutto 250, netto 203,25, `zostaje` liczone od netto
- [Unit] migawka z `wersjaDanych` starszą niż katalog daje ostrzeżenie „Dane rynkowe zmieniły się…”; cena dokładna 380 zł przy szybkiej 250–300 zł daje ostrzeżenie o widełkach
- [Unit] abonament 1× w tygodniu: `abonament` z kwotą miesięczną i liczbą wizyt 4,33
- [E2E] `dokladna-wycena-mieszkania` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/kreator/usluga, wybierz „Mieszkanie lub dom – sprzątanie standardowe”, „Dalej”, dodaj pokój 32, przedpokój 6, kuchnię 8 i łazienkę 4 m², przejdź „Dalej” przez dodatki i chemię, zrób screenshot podsumowania, kliknij „Zapisz”, w arkuszu wpisz klienta „Pani Test” i potwierdź „Zapisz” → cena 250 zł „w widełkach rynku”, „rynek od 120 zł do 450 zł”, karta „Zostaje dla Ciebie” z tempem 1,3×, po zapisie adres `#/wycena/<id>` i numer „1/<miesiąc>/<rok>” w podtytule
- [E2E] `podsumowanie-cena-reczna` — w zapisanej wycenie z poprzedniego scenariusza kliknij „Zmień”, wpisz 290 → kwota 290 zł, „Twoja cena 290 (+16%)”, kwota „Zostaje dla Ciebie” większa o 40 zł, „Przywróć cenę z modelu” wraca do 250 zł

**Weryfikacja:**
- `node --test src/kreator/podsumowanie.test.js` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel przechodzi dokładną wycenę mieszkania na telefonie i porównuje podsumowanie z makietą `podsumowanie-wyceny`
- [ ] Właściciel potwierdza założenia: aneks 10% metrażu (4–8 m²) i koszt dojazdu tam i z powrotem

### Faza 5 — Zlecenia, szybka wycena i pytania do klienta

**Zależy od:** Faza 4

- [ ] **IU-19: Zakończenie zlecenia i plan a fakt**

**Cel:** Wpis faktycznego czasu pracy, plan a fakt, realna stawka za godzinę, informacja o tempie i lista „plan a fakt” w ustawieniach.

**Wymagania:** R16, R17, R15

**Zależności:** Faza 4

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/kreator/zakonczenie.js` | 0 → 120 | — | nowy |
| Stwórz | `src/widoki/zakonczenie.js` | 0 → 160 | — | nowy |
| Modyfikuj | `src/widoki/podsumowanie.js` | 180 → 190 | — | zostaje |
| Modyfikuj | `src/widoki/ustawienia-tempo.js` | 80 → 140 | — | zostaje |
| Modyfikuj | `src/widoki/indeks.js` | 48 → 49 | — | zostaje |
| Stwórz | `e2e/stany/zlecenie-przyjete.json` | — → — | — | nowy |
| Test (unit) | `src/kreator/zakonczenie.test.js` | 0 → 120 | — | nowy |

**Delegate to:** feature-builder-fullstack

**Makiety:** `zakonczenie-zlecenia`, `ustawienia-firmy`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; zapis przez `dodajWykonanie` (IU-7), status z `STATUSY_WYCENY`, etykiety z `ETYKIETY_STATUSOW`.
- `src/kreator/zakonczenie.js`: `czasStartowy(wycena, kontekst)` → plan zaokrąglony do 15 min (punkt startu licznika); `poprawnyCzas(minuty)` → null albo kod błędu (> 0 i ≤ 1440); `widokZakonczenia(wycena, minutyFakt, kontekst)` → plan (`minutyNormowe` × tempo planu), fakt, różnica w %, realna stawka (koszt z `kosztZlecenia` przy tempie = fakt / norma), stosunek tempa i flaga poza `GRANICE_STOSUNKU_TEMPA` (`{ min: 0.5, max: 3 }` z `src/silnik/tempo.js`); `infoTempa(wyceny, uslugaId)` po zapisie: liczba wpisów wobec `MIN_ZLECEN_TEMPA` (= 3), nowe tempo wspólne albo pierwsze osobne tempo usługi; `historiaPlanuIFaktu(wyceny)` → ostatnie 10 wpisów (data, usługa, plan, fakt, różnica).
- `src/widoki/zakonczenie.js` (`#/wycena/<id>/koniec`, makieta `zakonczenie-zlecenia`): pigułki statusu „Przyjęta → Wykonana”, licznik czasu z krokiem 15 min (start z `czasStartowy`, wartość edytowalna po dotknięciu), data wykonania (domyślnie dziś, w podtytule), na bieżąco: karta „Plan i fakt” (dwa paski i zdanie o różnicy), karta „Zostało dla Ciebie” w kolorach `--sukces-*` z realną stawką i stawką planu, karta „Twoje tempo” (tempo przed → po zapisie), baner pierwszego osobnego tempa usługi, ostrzeżenie przy stosunku poza granicami; „Zapisz” → `dodajWykonanie` i powrót do wyceny; abonament — nagłówek „Wizyta wykonana”, przycisk „Zapisz wizytę”, wycena zostaje przyjęta.
- `src/widoki/podsumowanie.js`: przy statusie `przyjeta` przycisk „Wpisz czas pracy” (→ `#/wycena/<id>/koniec`); przy wykonanej lista wpisów czasu.
- `src/widoki/ustawienia-tempo.js`: lista „Plan a fakt” z `historiaPlanuIFaktu` (kryterium sukcesu źródła: widać, jak zmienia się różnica planu i faktu).
- `e2e/stany/zlecenie-przyjete.json`: ustawienia mazowieckie i jedna przyjęta wycena mieszkania 50 m² (migawka z silnika, `minutyNormowe` 230,82).

**Teksty (verbatim):**
- Nagłówek: „Zlecenie wykonane” / „Wycena {numer} · {klient} · {data}”; abonament: „Wizyta wykonana”
- Pigułki: „Przyjęta” → „Wykonana”
- Licznik: „Ile trwała praca?” (wartość „{h} h {min} min”); pod nim: „Licz cały czas u klienta, bez dojazdu.”
- Błąd: „Wpisz czas większy od zera i nie dłuższy niż 24 godziny.”
- Karta „Plan i fakt”: „Plan”, „Fakt”; „Praca trwała {różnica} dłużej niż plan (+{p}%).”, „Praca trwała {różnica} krócej niż plan (−{p}%).”, „Praca trwała tyle, ile plan.”
- Karta „Zostało dla Ciebie”: kwota; „{x} zł za godzinę pracy (plan: {y} zł/h)”
- Karta „Twoje tempo”: „{t przed}× → {t po}× normy”; „Liczone z {n} zleceń. Możesz wrócić do wartości ręcznej w ustawieniach.”; przed trzecim wpisem: „Własne tempo policzymy po 3 zleceniach ({n} z 3).”
- Baner: „Masz 3 zlecenia: {nazwa usługi} – od teraz liczymy dla nich osobne tempo: {t}×.”
- Ostrzeżenie: „Ten czas bardzo odbiega od normy ({t}×). Zapiszemy go, ale nie wliczymy do Twojego tempa.”
- Przyciski: „Zapisz”; abonament „Zapisz wizytę”, „Wizyty: {n}”
- Przycisk w wycenie: „Wpisz czas pracy”
- Ustawienia: „Plan a fakt” i wiersz „{data} · {usługa} · plan {czas} · fakt {czas} ({procent})”; pusta: „Po pierwszym zleceniu z wpisanym czasem zobaczysz tu, jak Twój plan zbliża się do faktu.”

**Wzorce do naśladowania:**
- `src/widoki/podsumowanie-karty.js` (IU-18) — karty z kolorami sukcesu

**Scenariusze testowe:**
- [Unit] `poprawnyCzas(330)` → null; `poprawnyCzas(0)` i `poprawnyCzas(1500)` → kod błędu; `czasStartowy` dla planu 266 min → 270
- [Unit] wycena 230,82 min normy, tempo planu 1,3, fakt 330 min: plan 300 min, różnica +10%, stosunek 1,43
- [Unit] fakt 800 min dla normy 230,82 daje flagę poza granicami; `infoTempa` po pierwszym wpisie daje „1 z 3”
- [E2E] `zakonczenie-zlecenia` — okno 360×800, wstrzyknij `e2e/stany/zlecenie-przyjete.json`, otwórz zapisaną wycenę z listy „Wyceny”, kliknij „Wpisz czas pracy”, ustaw licznikiem 5 h 30 min, zrób screenshot, kliknij „Zapisz”, wejdź w „Firma” → przed zapisem karta „Plan i fakt” z planem 5 h 0 min, faktem 5 h 30 min i zdaniem „Praca trwała 30 min dłużej niż plan (+10%).”, karta tempa z „Własne tempo policzymy po 3 zleceniach (1 z 3).”; po zapisie wycena ma status „Wykonana”, w ustawieniach lista „Plan a fakt” ma jeden wiersz

**Weryfikacja:**
- `node --test src/kreator/zakonczenie.test.js` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel wpisuje czas po prawdziwym zleceniu i porównuje ekran z makietą `zakonczenie-zlecenia`

- [ ] **IU-20: Silnik szybkiej wyceny i pytań do klienta**

**Cel:** Widełki i „orientacyjnie od” dla szybkiej wyceny, tekst dla klienta, zamiana w dokładną wycenę oraz pytania do klienta z automatycznymi skutkami w modelu.

**Wymagania:** R10, R11, R12, R13, R14, R5

**Zależności:** IU-19, zatwierdzony `data/pytania.json` (checklista)

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/silnik/szybka.js` | 0 → 200 | — | nowy |
| Stwórz | `src/silnik/pytania.js` | 0 → 115 | — | nowy |
| Modyfikuj | `data/ceny.json` | — → — | — | zostaje |
| Modyfikuj | `sw.js` | 80 → 81 | — | zostaje |
| Test (unit) | `src/silnik/szybka.test.js` | 0 → 180 | — | nowy |
| Test (unit) | `src/silnik/pytania.test.js` | 0 → 140 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc), bez DOM; korzysta z `ukladMieszkania`, `ukladBiura`, `domyslneLazienki` (IU-3), `wycenUsluge`, `widelkiRynku` (IU-4), `cenaDlaKlienta`, `kosztZlecenia` (IU-5).
- `data/ceny.json`: pole `szybka_wycena` w usługach — `"widelki"`: `mieszkanie_standard`, `mieszkanie_gruntowne`, `mieszkanie_po_wynajmie`, `sprzatanie_biur` (tylko wariant jednorazowy), `okna`, `tapicerka`, `dywany`; `"ogledziny"`: `mieszkanie_po_remoncie`, `doczyszczanie`, `mycie_posadzek`, `mycie_kostki`, `mycie_elewacji`, `sprzatanie_firm`; AGD bez pola (w szybkiej wycenie mieszkania jako dodatki). Po zmianie skrypt kalibracji musi przejść.
- `szybka.js`: `STANY_SZYBKIEJ` (źródło stałej, wartości jak w rejestrze). `szybkaWycena(wejscie, kontekst)`; `wejscie`: `uslugaId`, `m2`, `lazienki`, `kuchnia` (`osobna` | `aneks`), `stan`, `pozycje`, `dodatki`, `dojazdKm`, `wojewodztwoId`, `odpowiedzi`. Pomieszczenia (decyzja właściciela 2026-10-24: typowy = mediana): cena poziomu N = wycena układu z regułą `kurz` poziom N na `*` (N = 1 bez reguły); lekki → `[p1]`, typowy → `[p1, p2]`, mocny → `[p2, p3]`. Pozycje z `"widelki"` → `[cena, cena × mnożnik poziomu 2 z poziomy_brudu]`. `"ogledziny"` → `od` = cena poziomu 1 (pomieszczenia z `brud_domyslny`, pozycje: główna pozycja usługi bez dopłat przy podanym m²). Na obu końcach minimum i dojazd. Zaokrąglenie: `od` w dół do 10 zł, `do` w górę do 10 zł; lekki i równe granice → „ok. X zł” (zaokrąglone do 10 zł). Wynik: `{ tryb: 'widelki' | 'ok' | 'od', od, do, mediana, rynek (widelkiRynku p1), zostaje: { od, do, naGodzine: { od, do } }, tekst }`; ceny według statusu VAT jak w IU-5.
- `tekstDlaKlienta`: opis + kwoty + zastrzeżenie z `data/domyslne.json` (`szybka_wycena.zastrzezenie` = „Cena ostateczna po obejrzeniu lokalu lub zdjęć.”).
- `naDokladna(szybkaWejscie, kontekst)` → `WejscieWyceny`: pomieszczenia z układu (typy i m²) z regułą `kurz` na dolnym poziomie stanu (lekki i typowy — bez reguły, mocny — poziom 2), pozycje, dodatki, dojazd, `odpowiedzi`; wycena dostaje `szybka: { stan, od, do, tryb }` (do ostrzeżenia w podsumowaniu).
- `pytania.js`: `RODZAJE_SKUTKOW`, `TYPY_ODPOWIEDZI` (źródło stałych). Schemat `data/pytania.json`: `{ meta, wspolne: [Pytanie], uslugi: { [uslugaId]: [Pytanie] }, zdjecia?: { [uslugaId]: { podpowiedz, prosba } } }`, `Pytanie = { id, tresc, typ, opcje?, jednostka?, skutek? }`, `skutek` = `{ rodzaj: 'brud', brud, poziom, pomieszczenie, gdy }` (gdy = „tak” albo opcja) albo `{ rodzaj: 'dojazd_km' }` (tylko typ `liczba`); `zdjecia` — podpowiedź na ekranie pytań i tekst prośby o zdjęcia do skopiowania (makieta `pytania-do-klienta`). Odpowiedź: `{ wartosc, notatka }` (wartość wg typu, notatka opcjonalna, do 200 znaków). `pytaniaUslugi(uslugaId, pytania)` (wspólne + usługi), `opisOdpowiedzi(pytanie, odpowiedz)` (np. „Tak, kot”, „12 km, parking pod blokiem”), `zastosujOdpowiedzi(wejscie, odpowiedzi, pytania, katalog)` → `{ wejscie, skutki: [{ pytanieId, opis }] }` (opis np. „sierść, poziom 1 w pokojach”, „dojazd: 4 zł dla klienta”; brud tylko w trybie pomieszczeń, do istniejących i nowych pomieszczeń; dojazd ustawia `dojazdKm`; zmiana odpowiedzi stosuje skutek ponownie, ręczne zmiany w kreatorze po odpowiedzi wygrywają), `sprawdzPytania(pytania, katalog)` → lista błędów (nieznany brud albo usługa, skutek przy złym typie, usługa bez wpisu w `uslugi` poza `tylko_dodatek`, puste treści, powtórzone `id`).
- `sw.js`: `data/pytania.json` w liście wstępnego zapisu.

**Wzorce do naśladowania:**
- `src/silnik/cena.js` (IU-4) — wejście, walidacja `BladWejscia`, wynik bez DOM

**Scenariusze testowe:**
- [Unit] mieszkanie 50 m² standard, mazowieckie, typowy: widełki 250–300 zł, `mediana` 250, rynek 120–450; mocny: 290–360 zł; lekki: „ok. 250 zł”
- [Unit] dolna granica typowego dla 50 m² równa się cenie dokładnej wyceny układu 50 m² ze scenariusza kalibracji (R14, R27)
- [Unit] mieszkanie 20 m² standard: obie granice ≥ 150 zł (minimum); dojazd 32 km dokłada 44 zł na obu końcach
- [Unit] okna 4 × okno 1-skrz.: 150 zł (minimum) — `tryb: 'ok'`; tapicerka kanapa 3-os. i fotel: widełki od ceny do ceny × 1,2
- [Unit] mieszkanie po remoncie 60 m²: `tryb: 'od'` i `od` = cena poziomu 1 z pyłem budowlanym, zaokrąglona w dół do 10 zł
- [Unit] tekst: „Sprzątanie mieszkania 50 m², standard: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.”
- [Unit] `naDokladna` dla mocnego stanu daje 4 pomieszczenia układu 50 m² z kurzem poziom 2 i te same odpowiedzi
- [Unit] odpowiedź „tak” na pytanie o zwierzęta ze skutkiem sierść poziom 2 na `*` dodaje sierść do wszystkich pomieszczeń; odpowiedź 32 na pytanie z `dojazd_km` ustawia `dojazdKm` 32
- [Unit] `sprawdzPytania` na prawdziwym `data/pytania.json` zwraca pustą listę; plik z nieznanym brudem `blotko` zwraca błąd

**Weryfikacja:**
- `node --test src/silnik/szybka.test.js src/silnik/pytania.test.js` przechodzi
- `bash -c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/kalibracja.ps1"` wypisuje „niezgodności katalogu: 0”
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-21: Ekrany szybkiej wyceny i pytań do klienta**

**Cel:** Formularz szybkiej wyceny do rozmowy telefonicznej z wynikiem, gotowym tekstem i przejściem do dokładnej wyceny oraz ekran pytań do klienta dostępny z szybkiej i dokładnej wyceny.

**Wymagania:** R10, R11, R12, R13, R14, R5

**Zależności:** IU-20

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/widoki/szybka.js` | 0 → 190 | — | nowy |
| Stwórz | `src/widoki/szybka-wynik.js` | 0 → 110 | — | nowy |
| Stwórz | `src/widoki/pytania.js` | 0 → 160 | — | nowy |
| Modyfikuj | `src/kreator/stan.js` | 200 → 240 | — | zostaje |
| Modyfikuj | `src/widoki/kreator-usluga.js` | 150 → 165 | — | zostaje |
| Modyfikuj | `src/widoki/indeks.js` | 49 → 51 | — | zostaje |
| Modyfikuj | `src/kreator/stan.test.js` | 170 → 210 | — | zostaje |

**Delegate to:** feature-builder-fullstack

**Makiety:** `szybka-wycena`, `pytania-do-klienta`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; logika w `src/silnik/szybka.js` i `src/silnik/pytania.js` (IU-20), stany z `STANY_SZYBKIEJ`, typy pytań z `TYPY_ODPOWIEDZI`, skutki z `RODZAJE_SKUTKOW`.
- `src/widoki/szybka.js` (`#/szybka`, opcjonalnie `?wycena=<id>`, makieta `szybka-wycena`): pole „Usługa” (arkusz z usługami z `szybka_wycena`; trzy mieszkaniowe zebrane jako „Mieszkanie lub dom”, po remoncie i pozostałe pod nazwami z danych), przy mieszkaniu chipy rodzaju Standard, Gruntowne, Po wynajmie, licznik metrażu (krok 5 m²), licznik łazienek (domyślnie z `domyslneLazienki`), chipy kuchni „Osobna” / „Aneks”, chipy stanu z `STANY_SZYBKIEJ`, zwijane „AGD i dodatki” (pozycje AGD z licznikami); przy biurze metraż i stan; przy oknach, tapicerce i dywanach liczniki pozycji; przy oględzinach metraż i główna pozycja; wiersz „Pytania do klienta · {a} z {n}” prowadzący do ekranu pytań (pierwsze wejście zapisuje wycenę jako szkic `szybka`); województwo z ustawień; wynik liczony przy każdej zmianie. Akcje (bez przycisku „Zapisz”, jak na makiecie): „Kopiuj tekst” (`navigator.clipboard.writeText`, zapasowo zaznaczenie tekstu; zapis wyceny `szybka` z numerem i statusem `wyslana`), „Dokładna wycena” (zapis, `zSzybkiej`, przejście do `#/kreator/zakres?wycena=<id>`).
- `src/widoki/szybka-wynik.js`: karta wyniku — „Widełki dla klienta” z zakreślaczem, pigułki z medianą w województwie i rynkiem oraz dodatkowa pigułka „Zostaje…” (R5, odstępstwo od makiety), cytat tekstu dla klienta; tryb `od` z zaleceniem oględzin.
- `src/widoki/pytania.js` (`#/wycena/<id>/pytania`, makieta `pytania-do-klienta`): nagłówek z usługą i licznikiem odpowiedzi, karta z listą pytań z `pytaniaUslugi`; pytanie z odpowiedzią pokazuje `opisOdpowiedzi` i pigułkę skutku w kolorach `--sukces-*`, bez odpowiedzi — link „+ Dodaj odpowiedź” otwierający arkusz z polem wg typu (tak/nie — chipy, wybór — chipy, liczba — pole z jednostką, tekst — pole) i notatką; baner prośby o zdjęcia z `zdjecia` usługi z „Kopiuj prośbę”; „Gotowe” wraca do ekranu, z którego przyszedł użytkownik. Zapis do `wycena.odpowiedzi` i zastosowanie przez `zastosujOdpowiedzi`.
- `src/kreator/stan.js`: `zSzybkiej(kontekst, wycenaSzybka)` — zamiana rekordu szybkiej wyceny w dokładną (ten sam `id` i numer, wejście z `naDokladna`, `szybka` z widełkami); `src/widoki/kreator-usluga.js`: wiersz „Pytania do klienta · {a} z {n}” pod wyborem usługi (po utworzeniu szkicu).

**Teksty (verbatim):**
- Nagłówek: „Szybka wycena” / „Rozmowa z klientem”
- Pola: „Usługa” (opcja „Mieszkanie lub dom”), „Rodzaj sprzątania” (chipy „Standard”, „Gruntowne”, „Po wynajmie”), „Metraż”, „Łazienki”, „Kuchnia” (chipy „Osobna”, „Aneks”), „Spodziewany stan” (chipy „Lekki”, „Typowy”, „Mocny”), „AGD i dodatki”
- Wiersz pytań: „Pytania do klienta · {a} z {n}”
- Wynik: „Widełki dla klienta”; „ok. {x} zł” (lekki stan); pigułki „Mediana w {województwie w miejscowniku}: {x} zł” (średnia krajowa: „Mediana krajowa: {x} zł”), „Rynek: {od}–{do} zł”, „Zostaje ok. {a}–{b} zł/h”
- Oględziny: „Orientacyjnie od {x} zł”; „Ta usługa wymaga oględzin. Poproś o zdjęcia albo umów się na obejrzenie przed podaniem ceny.”
- Przyciski: „Kopiuj tekst”, „Dokładna wycena”; po skopiowaniu „Skopiowano”
- Ekran pytań: nagłówek „Pytania do klienta” / „{usługa} · {a} z {n}”; „+ Dodaj odpowiedź”; arkusz: „Odpowiedź”, „Notatka (opcjonalnie)”, „Zapisz”, „Usuń odpowiedź”; baner z `zdjecia.podpowiedz` i przyciskiem „Kopiuj prośbę”; przycisk „Gotowe”

**Wzorce do naśladowania:**
- `docs/operator/etap-5-wariant-b.html` — sekcja `szybka-wycena`
- `src/widoki/kreator-pomieszczenia.js` (IU-15) — liczniki i chipy

**Scenariusze testowe:**
- [Unit] `zSzybkiej` zostawia `id` i numer, ustawia `rodzaj: 'dokladna'`, pomieszczenia z układu i pole `szybka` z widełkami
- [E2E] `szybka-wycena-mieszkania` — okno 360×800, wstrzyknij `e2e/stany/ustawienia-mazowieckie.json`, otwórz http://localhost:5174/#/szybka, wybierz „Mieszkanie lub dom”, „Standard”, metraż 50, stan „Typowy”, zrób screenshot, kliknij „Kopiuj tekst”, potem „Dokładna wycena” → widełki „250–300 zł”, „Mediana w mazowieckim: 250 zł”, „Rynek: 120–450 zł”, cytat „Sprzątanie mieszkania 50 m², standard: 250–300 zł. Cena ostateczna po obejrzeniu lokalu lub zdjęć.”, „Skopiowano”, kreator otwiera krok pomieszczeń z czterema pomieszczeniami (pokój 32, przedpokój 6, kuchnia 8, łazienka 4 m²)
- [E2E] `szybka-wycena-ogledziny` — w `#/szybka` wybierz usługę „Mieszkanie lub dom – sprzątanie po remoncie”, metraż 60 → „Orientacyjnie od {x} zł” i zalecenie oględzin, bez widełek
- [E2E] `pytania-do-klienta-skutek` — w `#/szybka` dla mieszkania 50 m² kliknij „Pytania do klienta · 0 z {n}”, przy pytaniu o zwierzęta „+ Dodaj odpowiedź” → „tak”, przy pytaniu o dojazd wpisz 32, kliknij „Gotowe” → na ekranie pytań pigułki skutków (sierść, „dojazd: 44 zł dla klienta”), po powrocie licznik „2 z {n}” i widełki wyższe o dojazd 44 zł i sierść
- [Manual] „Kopiuj tekst” na iPhonie w Safari i w aplikacji z ekranu początkowego

**Weryfikacja:**
- `node --test src/kreator/stan.test.js` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

**Operator checklist:**
- [ ] Właściciel robi szybką wycenę mieszkania w trakcie symulowanej rozmowy i mierzy czas (cel źródła: poniżej minuty)

### Faza 6 — Oferta dla klienta

**Zależy od:** Faza 5

- [ ] **IU-22: Treść oferty, kodowanie linku i nadpisania zakresu i warunków**

**Cel:** Oferta z wyceny z białą listą pól, zakresem, warunkami i ważnością, zakodowana w linku bez serwera, oraz zapis nadpisań zakresu i warunków w ustawieniach i w wycenie.

**Wymagania:** R18, R19, R20, R21, R22, R8

**Zależności:** Faza 5, zatwierdzony `data/zakresy.json` (checklista)

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/oferta/tresc.js` | 0 → 175 | — | nowy |
| Stwórz | `src/oferta/kodek.js` | 0 → 145 | — | nowy |
| Modyfikuj | `src/dane/ustawienia.js` | 140 → 165 | — | zostaje |
| Modyfikuj | `src/dane/wyceny.js` | 230 → 260 | — | zostaje |
| Modyfikuj | `sw.js` | 81 → 82 | — | zostaje |
| Test (unit) | `src/oferta/tresc.test.js` | 0 → 170 | — | nowy |
| Test (unit) | `src/oferta/kodek.test.js` | 0 → 130 | — | nowy |

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc), bez DOM; `CompressionStream` i `DecompressionStream` są w przeglądarkach i w Node 24 (testy bez atrap).
- Schemat `data/zakresy.json` (treść z osobnej sesji): `{ meta, uslugi: { [uslugaId]: { wchodzi: [string], nie_wchodzi: [string], warianty?: { [wariantId]: { wchodzi, nie_wchodzi } } } } }`.
- `tresc.js`: `ofertaZWyceny(wycena, kontekst, dzis)` → `Oferta` = `{ v: 1, firma: { nazwa, telefon, email, nip }, numer, data, waznaDo, klient: { nazwa, adres, termin }, uslugi: [{ opis, kwota }], dojazd, razem: { od, do }, vat: { status, stawka, netto, kwotaVat }, dodatkiOpcjonalne: [{ opis, kwota }], zakres: { wchodzi, nie_wchodzi }, warunki: [string], szybka: boolean }`. Budowa z białej listy (R21: bez kosztów, tempa, czasu i „zostaje”). Zakres: `wycena.oferta.zakres` → `ustawienia.zakresy[uslugaId]` → `zakresy.uslugi[uslugaId]` (z nadpisaniem wariantu). Warunki: `wycena.oferta.warunki` → `ustawienia.warunki` → `domyslne.oferta.warunki`, z pominięciem `tylko_szybka` przy dokładnej wycenie (R20). Ważność: `wycena.oferta.waznaDo` albo dziś + `oferta.waznosc_dni` (14) z `data/domyslne.json`, ważna do końca tego dnia. Ręczna cena: kwota usługi = razem − dojazd − pozostałe linie. Szybka wycena: `razem` od–do. Dodatki opcjonalne = `wynik.propozycje` z migawki wyceny (dodatki w trybie „zaproponuj w ofercie” z kroku dodatków, IU-16). `czyWazna(oferta, dzis)`, `sprawdzZakresy(zakresy, katalog)` (każda usługa poza `tylko_dodatek` ma wpis, niepuste teksty).
- `kodek.js`: `MAKS_DLUGOSC_LINKU = 2000` (źródło stałej). `zakodujOferte(oferta)` → `'v1.' + base64url(deflate-raw(UTF-8 JSON))`; `odkodujOferte(fragment)` → `{ ok: true, oferta }` albo `{ ok: false, powod: 'brak' | 'wersja' | 'uszkodzony' | 'przegladarka' }`; po dekodowaniu ścisła walidacja schematu (dozwolone klucze, typy, teksty do 500 znaków, listy do 50, kwoty skończone ≥ 0), bo link może sfabrykować każdy. `linkOferty(adresAplikacji, oferta)` → `{ url: '<katalog aplikacji>/oferta.html#<kod>', dlugosc, dlugi: dlugosc > MAKS_DLUGOSC_LINKU }`.
- `src/dane/ustawienia.js`: `zapiszZakres(magazyn, uslugaId, zakres | null)`, `zapiszWarunki(magazyn, warunki | null)` (null = wróć do domyślnych). `src/dane/wyceny.js`: `zapiszOferte(kontekst, id, patch)` (zakres, warunki, ważność, klient), `oznaczWyslana(kontekst, id)` (status `wyslana` z `do_wyslania`, `oferta.wyslana` = teraz, `nieaktualna` = false).
- `sw.js`: `data/zakresy.json` w liście wstępnego zapisu.

**Notatka wykonawcza:** Test-first na białej liście R21 i na dekoderze z uszkodzonym linkiem.

**Wzorce do naśladowania:**
- `src/dane/kopia.js` (IU-8) — walidacja danych z zewnątrz i kody błędów

**Scenariusze testowe:**
- [Unit] oferta z wyceny mieszkania z ręczną ceną 290 zł i dojazdem 4 zł: `uslugi[0].kwota` 290, `dojazd` 4, `razem` 294 (od = do)
- [Unit] `JSON.stringify(oferta)` nie zawiera kluczy `zostaje`, `tempo`, `koszt`, `minuty`, `chemia` ani `sprzet` (R21)
- [Unit] zakres z wyceny wygrywa z ustawieniami, a ustawień z `data/zakresy.json`; warunek `stan_lokalu` jest tylko w ofercie z szybkiej wyceny
- [Unit] ważność: oferta z 24.10.2026 jest ważna 7.11.2026 i nieważna 8.11.2026
- [Unit] `zakodujOferte` → `odkodujOferte` zwraca tę samą ofertę; typowa oferta (fixture z 8 liniami zakresu i 4 warunkami) ma link krótszy niż 2000 znaków
- [Unit] fragment obcięty o 10 znaków, `v9.…` i JSON z kluczem spoza schematu albo tekstem 600 znaków dają `ok: false` z powodem `uszkodzony`, `wersja`, `uszkodzony`
- [Unit] `sprawdzZakresy` na prawdziwym `data/zakresy.json` zwraca pustą listę
- [Unit] `oznaczWyslana` zmienia status z `do_wyslania` na `wyslana` i kasuje `nieaktualna`

**Weryfikacja:**
- `node --test src/oferta/tresc.test.js src/oferta/kodek.test.js` przechodzi
- `npm test` przechodzi
- `npm run typecheck` przechodzi bez błędów

- [ ] **IU-23: Edycja oferty oraz zakres prac i warunki w ustawieniach**

**Cel:** Ekran przygotowania oferty z wyceny (firma, klient i termin, zakres, dodatki do zaproponowania, warunki, ważność, link i PDF) i sekcje „Zakres prac” i „Warunki oferty” w ustawieniach.

**Wymagania:** R18, R19, R20, R21, R22

**Zależności:** IU-22

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `src/widoki/oferta-edycja.js` | 0 → 190 | — | nowy |
| Stwórz | `src/widoki/oferta-edycja-sekcje.js` | 0 → 170 | — | nowy |
| Stwórz | `src/widoki/edytor-listy.js` | 0 → 90 | — | nowy |
| Stwórz | `src/widoki/ustawienia-oferta.js` | 0 → 130 | — | nowy |
| Modyfikuj | `src/widoki/ustawienia.js` | 140 → 150 | — | zostaje |
| Modyfikuj | `src/widoki/podsumowanie.js` | 190 → 200 | — | zostaje |
| Modyfikuj | `src/widoki/indeks.js` | 50 → 51 | — | zostaje |

**Delegate to:** feature-builder-ui

**Makiety:** `oferta-edycja`, `ustawienia-firmy`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; logika oferty w `src/oferta/tresc.js` i `src/oferta/kodek.js` (IU-22), zapis przez `zapiszOferte`, `oznaczWyslana`, `zapiszZakres`, `zapiszWarunki`; statusy z `STATUSY_WYCENY`.
- `src/widoki/edytor-listy.js`: edycja listy tekstów (dodaj, zmień, usuń, przesuń), używana dla zakresu i warunków.
- `oferta-edycja.js` (`#/wycena/<id>/oferta`, makieta `oferta-edycja`): nagłówek z numerem i kwotą, karty z `oferta-edycja-sekcje.js` — „Twoja firma” (z ustawień, tylko do odczytu, link „Zmień w ustawieniach”; przy braku nazwy albo telefonu baner z linkiem do ustawień i zablokowane przyciski), „Klient i termin” (klient, adres, termin — data i godzina; adres i termin opcjonalne), „Zakres prac” z „Edytuj” (lista „W cenie” ze znakiem ✓ i „Poza ceną” ze znakiem ✗, edytor, notka o zmianie tylko w tej ofercie, „Przywróć domyślny”), „Dodatki do zaproponowania” (z `wynik.propozycje`, tylko do odczytu; brak → karta ukryta), „Warunki” z „Edytuj” (lista ✓, edytor), wiersz „Oferta ważna do” z datą i liczbą dni (data do zmiany). Stopka: „PDF” (otwiera `oferta.html#<kod>` w nowej karcie, gdzie klient i właściciel drukują) i „Kopiuj link” (schowek; zapasowo `navigator.share`, gdy schowek niedostępny) — oba wywołują `oznaczWyslana`. Długi link (`dlugi` z `linkOferty`, próg `MAKS_DLUGOSC_LINKU` = 2000) → ostrzeżenie. Oferta nieaktualna → baner.
- `ustawienia-oferta.js`: sekcja „Zakres prac” (lista usług → edytor wchodzi / nie wchodzi z `zapiszZakres`, „Przywróć domyślny”) i „Warunki oferty” (edytor z `zapiszWarunki`, „Przywróć domyślne”); `ustawienia.js` dołącza obie sekcje.
- `podsumowanie.js`: przy statusach `do_wyslania`, `wyslana`, `przyjeta` przycisk „Przygotuj ofertę” (→ `#/wycena/<id>/oferta`).

**Teksty (verbatim):**
- Nagłówek: „Oferta” / „Wycena {numer} · {kwota}”
- Karty: „Twoja firma” (link „Zmień w ustawieniach”), „Klient i termin”, „Zakres prac” (link „Edytuj”; podsekcje „W cenie”, „Poza ceną”), „Dodatki do zaproponowania”, „Warunki” (link „Edytuj”); wiersz „Oferta ważna do” — „{data} ({n} dni)”
- Pola klienta: „Klient”, „Adres (opcjonalnie)”, „Termin (opcjonalnie)”
- Brak danych firmy: „Uzupełnij nazwę firmy i telefon w ustawieniach, zanim wyślesz ofertę.” z przyciskiem „Uzupełnij”
- Zakres: „Zmiana dotyczy tylko tej oferty. Domyślny zakres ustawisz w ustawieniach.”, „Przywróć domyślny”; edytor: „Dodaj punkt”, „Usuń”
- Przyciski: „PDF”, „Kopiuj link”; po skopiowaniu „Link skopiowany”
- Długi link: „Link ma {n} znaków — w SMS-ie może się nie zmieścić. Wyślij go komunikatorem albo wydrukuj PDF.”
- Nieaktualna: „Wycena zmieniła się po wysłaniu oferty. Wysłany wcześniej link pokazuje starą wersję — wyślij nowy.”
- Ustawienia: „Zakres prac”, „Warunki oferty”, „Przywróć domyślne”
- Przycisk w wycenie: „Przygotuj ofertę”

**Wzorce do naśladowania:**
- `src/widoki/ustawienia-sekcje.js` (IU-11) — sekcje w kartach z zapisem po zmianie

**Scenariusze testowe:**
- [E2E] `oferta-link` — okno 360×800, wstrzyknij `e2e/stany/wyceny-do-zrobienia.json`, otwórz wycenę „Do wysłania”, kliknij „Przygotuj ofertę”, wpisz klienta „Marzena Wróbel”, w „Zakres prac” kliknij „Edytuj” i usuń jeden punkt „W cenie”, kliknij „Kopiuj link”, odczytaj link przez `agent-browser eval "navigator.clipboard.readText()"` i otwórz go w nowej karcie → „Link skopiowany”, status wyceny „Wysłana”, oferta pokazuje „Marzena Wróbel”, nazwę firmy, kwotę i zakres bez usuniętego punktu, a tekst strony nie zawiera „Zostaje”, „tempo” ani „Koszt zlecenia”
- [E2E] `oferta-brak-danych-firmy` — wyczyść localStorage, pomiń kreator, utwórz i zapisz wycenę okien, kliknij „Przygotuj ofertę” → baner „Uzupełnij nazwę firmy i telefon…”, „Kopiuj link” nieaktywny

**Weryfikacja:**
- `npm run typecheck` przechodzi bez błędów
- `npm test` przechodzi

**Operator checklist:**
- [ ] Właściciel przygotowuje ofertę z prawdziwej wyceny, wysyła link do siebie przez SMS i komunikator i otwiera go na drugim telefonie

- [ ] **IU-24: Strona oferty dla klienta i wydruk A4**

**Cel:** Strona `oferta.html` otwierana z linku bez logowania (oferta ważna, po terminie, uszkodzony link, stara przeglądarka) i wersja do druku A4.

**Wymagania:** R18, R21, R22

**Zależności:** IU-23

**Pliki:**

| Akcja | Plik | Linie dziś → po | Wymiary | Werdykt |
|---|---|---|---|---|
| Stwórz | `oferta.html` | — → — | — | nowy |
| Stwórz | `src/oferta-start.js` | 0 → 45 | — | nowy |
| Stwórz | `src/widoki/oferta-klient.js` | 0 → 200 | — | nowy |
| Stwórz | `src/style/oferta.css` | — → — | — | nowy |
| Stwórz | `src/style/druk.css` | — → — | — | nowy |
| Modyfikuj | `sw.js` | 82 → 84 | — | zostaje |
| Stwórz | `e2e/stany/oferta-po-terminie.txt` | — → — | — | nowy |

**Delegate to:** feature-builder-ui

**Makiety:** `oferta-klient`

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Stos: czysty JavaScript (moduły ES, JSDoc) i CSS; dekodowanie przez `odkodujOferte` i `czyWazna` (IU-22).
- `oferta.html`: `lang="pl"`, viewport, meta CSP jak w `index.html`, `<meta name="robots" content="noindex">`, `<meta name="referrer" content="no-referrer">`, arkusze `src/style/tokeny.css`, `src/style/baza.css`, `src/style/oferta.css`, `src/style/druk.css` (`media="print"`), moduł `src/oferta-start.js`. Strona nie czyta localStorage, nie rejestruje service workera i nie wysyła żadnych żądań poza własnymi plikami (R22).
- `src/oferta-start.js`: czyta `location.hash`, brak `DecompressionStream` → stan „stara przeglądarka”, inaczej `odkodujOferte` i render; zmiana `hashchange` renderuje ponownie.
- `src/widoki/oferta-klient.js`: dokument wg makiety — nagłówek firmy (inicjały, nazwa, telefon, e-mail, NIP gdy jest), „Wycena nr {numer}” i „ważna do {data}”, „Dla” (klient, adres, termin), wiersze usług, dojazd, „Razem do zapłaty”, zdanie o VAT, „Możesz dobrać”, „W cenie”, „Poza ceną: …” jednym zdaniem, warunki jednym akapitem, przyciski „Zadzwoń: {telefon}” (`tel:`) i „Pobierz PDF” (`window.print()`). Wszystkie teksty przez helper `h` (dane z linku są niezaufane). Stany: po terminie — baner nad dokumentem; uszkodzony link i stara przeglądarka — sam komunikat.
- `druk.css`: A4, marginesy 15 mm, bez przycisków i banerów, czarny tekst na białym tle, bez podziału wiersza usługi między stronami.
- `sw.js`: `oferta.html` w liście wstępnego zapisu (dla aplikacji właściciela; strona oferty sama service workera nie rejestruje).
- `e2e/stany/oferta-po-terminie.txt`: fragment adresu (bez `#`) z ofertą ważną do 1.10.2026, wygenerowany w Node przez `zakodujOferte`.

**Teksty (verbatim):**
- „Wycena nr {numer}”, „ważna do {data}”, „Dla”, „termin: {termin}”, „Dojazd”, „Razem do zapłaty”
- VAT: „Kwota bez VAT – firma zwolniona z VAT.”; „Cena zawiera VAT 23%: {vat} zł (netto {netto} zł).”
- Szybka wycena: „Razem do zapłaty: {od}–{do} zł”
- „Możesz dobrać”, „+{kwota}”; „W cenie”; „Poza ceną: {lista}.”
- Przyciski: „Zadzwoń: {telefon}”, „Pobierz PDF”
- Po terminie: „Oferta była ważna do {data}. Zadzwoń, żeby potwierdzić aktualną cenę.”
- Uszkodzony link: „Ten link do oferty jest niepełny albo uszkodzony. Poproś firmę o nowy link.”
- Stara przeglądarka: „Ta przeglądarka nie otworzy oferty. Otwórz link w aktualnej wersji przeglądarki albo poproś firmę o PDF.”

**Wzorce do naśladowania:**
- `docs/operator/etap-5-wariant-b.html` — sekcja `oferta-klient` (klasa `.phone.doc`)

**Scenariusze testowe:**
- [E2E] `oferta-po-terminie` — otwórz http://localhost:5174/oferta.html# z treścią `e2e/stany/oferta-po-terminie.txt`, zrób screenshot → baner „Oferta była ważna do 1 października 2026…” nad dokumentem z danymi firmy i kwotą
- [E2E] `oferta-uszkodzony-link` — otwórz http://localhost:5174/oferta.html#v1.zepsute → tylko komunikat „Ten link do oferty jest niepełny albo uszkodzony…”, konsola bez nieobsłużonych błędów, `localStorage.length` w eval równe 0
- [Manual] „Pobierz PDF” na Androidzie (Chrome) i iPhonie (Safari) zapisuje jedną stronę A4 bez przycisków
- [Manual] link otwarty w przeglądarce wbudowanej Messengera i WhatsAppa

**Weryfikacja:**
- `npm run typecheck` przechodzi bez błędów
- `npm test` przechodzi
- `grep -n "localStorage\|serviceWorker" src/oferta-start.js src/widoki/oferta-klient.js` nie zwraca wyników

**Operator checklist:**
- [ ] Właściciel porównuje ofertę na telefonie i wydruk z makietą `oferta-klient` i zatwierdza brzmienie warunków

## Wpływ systemowy

- **Graf interakcji:** `src/app.js` → katalog (`src/silnik/katalog.js`) i magazyn (`src/dane/magazyn.js`) → router → widoki; widoki wołają `src/kreator/*` i `src/oferta/*`, a te `src/silnik/*` i `src/dane/*`. `oferta.html` korzysta tylko z `src/oferta/kodek.js`, `src/oferta/tresc.js` (typy i `czyWazna`) i komponentów UI.
- **Propagacja błędów:** silnik rzuca `BladWejscia` / `BladKatalogu`, dane — `BladMagazynu`, `BladWyceny`, `BladKopii`; widoki zamieniają kody na teksty z pól „Teksty (verbatim)”. Błąd wczytania danych referencyjnych zatrzymuje aplikację na komunikacie, uszkodzony magazyn — na ekranie ratunkowym.
- **Cykl życia stanu:** jeden obiekt stanu v1 w localStorage; każda zmiana przez `magazyn.zmien` (zapis całości, `kopia.zmianaOd`); inne karty odświeżają widok przez zdarzenie `storage`. Migawka wyceny jest niezmienna aż do edycji albo „Przelicz”.
- **Parytet ze skryptem:** `scripts/kalibracja.ps1` jest specyfikacją; po każdej zmianie danych albo skryptu `npm test` (test parytetu) pokazuje rozjazd z silnikiem JS.
- **Interesariusze:** właściciel firmy (użytkownik), klienci firm (strona oferty), utrzymanie danych (`data/`, skrypt kalibracji, sesje z treściami).

## Ryzyka i zależności

- **Utrata danych w Safari i przy zmianie adresu:** ITP czyści dane po 7 dniach bez wizyty, a przejście na inną domenę w etapie 6 zmienia origin. Mitygacja: przypomnienie o kopii, instrukcja dla iPhone'a, `storage.persist()`, kopia z „Połącz”; adres aplikacji trzeba wybrać przed pierwszym użyciem z prawdziwymi danymi (checklista, etap 6).
- **Stare przeglądarki klientów:** iOS < 16.4 nie ma `DecompressionStream`, więc link pokaże komunikat; alternatywą jest PDF. Bez dołączania biblioteki inflate w wersji 1.
- **Długość linku:** zmieniony zakres i warunki wydłużają link; ostrzeżenie powyżej 2000 znaków, PDF jako alternatywa.
- **Buildery i reviewerzy szablonu zestrojeni pod React + Supabase:** każda jednostka zaczyna Podejście od zasady stosu; uwagi review dotyczące Reacta, Tailwinda, Zod i Supabase nie mają zastosowania.
- **PowerShell 5.1 w IU-2:** BOM, wielkość liter zmiennych, aliasy; weryfikacja sprawdza BOM, brak wyjątku i brak zmian w raporcie.
- **Precyzja parytetu:** różna kolejność sumowania w JS i PS — tolerancja 0,01 min i 0,01 zł.
- **PNG w wersji 3, tokeny w wariancie B:** buildery mogą przenieść kolory z PNG; SPEC i każda jednostka UI mówią, że kolory są z tokenów.
- **Blokery treści:** autopilot zatrzyma się przed fazą 5 (`data/pytania.json`) i 6 (`data/zakresy.json`), dopóki pozycje checklisty nie są odhaczone.
- **`node --test` i wzorce glob w `cmd.exe`:** cudzysłowy w skrypcie `test`; sprawdza IU-1.
- **Kolejność w fazach UI:** jednostki fazy 3–6 dopisują widoki do `src/widoki/indeks.js` i zmieniają wspólne pliki, więc mają zależności łańcuchowe (bez równoległego wykonania).

## Dokumentacja / Notatki operacyjne

- `CLAUDE.md`: polecenia `npm` (IU-1) i nowy plik generowany `research/kalibracja-scenariusze.json` (IU-2). Opis aplikacji („kodu aplikacji jeszcze nie ma”) aktualizuje archiwizacja etapu razem z `PLAN.md` (status etapu 5, hash commita).
- Publikacja (GitHub Pages, adres, `.nojekyll`, ikony i barwy marki) — etap 6.

## Źródła i referencje

- **Dokument źródłowy:** docs/brainstorms/2026-10-23-poczatkujace-firmy-requirements.md
- Checklista etapu: docs/operator/etap-5-aplikacja-wyceny-przygotowanie.md
- Specyfikacja makiet: docs/plans/etap-5-aplikacja-wyceny-figma/SPEC.md (PNG eksportowane ręcznie z pliku Figmy `sDtiv6VdCbpyfM6Gfs7Xej`)
- `PLAN.md` — etap 5, Ustalenia; `CLAUDE.md` — model wyceny i pułapki PowerShell
- Specyfikacja silnika: `scripts/kalibracja.ps1`, `research/KALIBRACJA.md`, `data/normy.json` (`meta.wzor`, `meta.wzor_pozycji`, `meta.cena`)
