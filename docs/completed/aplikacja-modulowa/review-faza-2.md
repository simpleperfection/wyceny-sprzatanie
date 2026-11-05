# Review fazy 2 — Przeniesienie wykonań i kopia v2

Gate: **BLOKUJE** · P1: 1 · P2: 5 · P3: 5 · OPERATOR: 0 · E2E: 1 PASS / 0 FAIL / 0 SKIP

## Findingi P1

### P1 · TEST · `src/dane/migracja-v2.test.js:63`
Gałąź migracji `if (czyAbonament({ wizytWMiesiacu })) return []` w src/dane/migracja-v2.js:157 (plan IU-6: abonament nie dostaje zlecenia z terminu, zostaje „do zaplanowania”) nie ma testu. W fixture stan-v1-pelny.json abonament (w-abonament) ma `termin: null` i wykonania, więc `zlecenieNaTermin` kończy się wcześniej. Mutacja (zakomentowanie linii): pełne `npm test` 1020 pass, 0 fail. Skutek: abonament z terminem ISO dostałby jednorazowe zlecenie `z-<id>`, wycena stałaby się tylko do odczytu. Poprawka: test `zWycena(v1, 'w-abonament', { wykonania: [], klient: { nazwa: 'Biuro Rachunkowe Bilans', adres: 'ul. Długa 1, Warszawa', termin: '2026-11-20T08:00' } })` → po `poMigracji` `zlecenie(stan, 'z-w-abonament') === null`, a `doZaplanowania` zawiera 'w-abonament'.

## Findingi P2

### P2 · KOD · `src/dane/wyceny.js:73`
`DLUGOSC_KLIENTA = { nazwa: 120, adres: 200, termin: 40 }` powtarza granice z `DLUGOSCI_KLIENTA` (src/dane/klienci.js:12). `zKlientemZListy` (wyceny.js:216) kopiuje nazwę i adres klienta do wyceny, a migracja-v2.js:80/82 przycina je do granic klienta; rozjazd stałych zepsuje `jestKlientem` albo utnie dane. Poprawka: zaimportować `DLUGOSCI_KLIENTA` (bez cyklu) i zdefiniować `DLUGOSC_KLIENTA = Object.freeze({ nazwa: DLUGOSCI_KLIENTA.nazwa, adres: DLUGOSCI_KLIENTA.adres, termin: 40 })`.

### P2 · KOD · `src/widoki/oferta-edycja.js:303`
Niezamówiona zmiana widoczna dla użytkownika: ekran oferty nie otwiera się dla wyceny ze zleceniem (`czyWycenaZamknieta` → `WYCENA_ZAMKNIETA`), a `akcjeZapisanej` (src/widoki/podsumowanie.js:392) chowa „Przygotuj ofertę”. IU-6 wymienia sześć plików z regułą `czyWycenaZamknieta`, bez oferta-edycja.js; plan mówi, że oferta się nie zmienia. Dawniej blokował tylko status `wykonana`; teraz każda przyjęta wycena ze zleceniem (także z migracji v1) traci podgląd, udostępnienie i druk oferty. Do zrobienia: zostawić podgląd/udostępnienie, blokować tylko edycję — albo operator wpisuje blokadę do planu jako decyzję.

### P2 · KOD · `src/zlecenia/plan-fakt.js:63`
Dolna granica czasu pracy wizyty w czterech miejscach z różną regułą: `poprawnyCzas` ma `minuty > 0`, a `jestMinutamiPracy` (zlecenia-ksztalt.js:88), `MIN_MINUT_PRACY = 1` (wizyty.js:27, nieeksportowana) i migracja-v2.js:137 wymagają ≥ 1. Ekran wizyty (IU-17) przepuści 0,5 min, które `wpiszCzasPracy` odrzuci; migracja po cichu zeruje poprawny w v1 wpis (0, 1). Poprawka: `MIN_MINUT_PRACY` do zlecenia-ksztalt.js obok `MAKS_MINUT_PRACY`, eksport i użycie we wszystkich czterech miejscach.

### P2 · TEST · `src/zlecenia/plan-fakt.test.js:299`
Usunięcie src/kreator/zakonczenie.test.js zabrało testy `kosztPrzyTempie` (podsumowanie.js:150-157, zmieniona sygnatura): cena ręczna 400 zł i `brak_wyniku`. Mutacja `cenaKlienta(m, w.cenaReczna)` → `cenaKlienta(m, null)`: 1020 pass, 0 fail. Nowa gałąź `catch` w `stawkaPrzyTempie` (plan-fakt.js:1053) bez testu. Poprawka: (a) różnica `zostaje` przy `cenaReczna: 400` ≈ 400 − `w.wynik.cena` plus wiersz historii z ceną ręczną; (b) `assert.throws(() => kosztPrzyTempie({ ...w, wynik: null }, katalog, 1.3, null), { kod: 'brak_wyniku' })`; (c) linia `{ rodzaj: 'pozycja', klucz: 'brak.pozycji' }` → `planZakonczenia(...).stawkaPlanu === null`.

### P2 · TEST · `docs/active/aplikacja-modulowa/aplikacja-modulowa-zadania.md:163`
Weryfikacja `grep -rn "wykonana\|wykonania\|dodajWykonanie" src/ --include=*.js` miała zwrócić tylko src/dane/migracja-v2.js i jego test, a zwraca też src/silnik/tempo.js, src/silnik/tempo.test.js, src/zlecenia/dane-tempa.js, src/zlecenia/plan-fakt.test.js, src/dane/kopia.test.js i src/dane/wyceny-statusy.test.js. Kontekst odnotowuje korektę planu (kontrakt silnika tempa, testy odmowy `wykonana`) — przeformułować checkbox albo usunąć trafienia.

## Findingi P3

### P3 · KOD · `src/widoki/podsumowanie.js:90`
`kartaWpisowCzasu` drugi raz woła `wczytajStan(magazyn)` w tym samym rysowaniu (parsowanie i pełna walidacja stanu); `rysuj` (linia 212) ma już `stan`. Podać `stan` przez `elementyEkranu` i usunąć odczyt.

### P3 · KOD · `src/ui/format.js:29`
`FORMY.wykonaneZlecenie` jest martwy; odmiana „klient” siedzi w lokalnym `FORMY_KLIENTA` (src/widoki/kopia-teksty.js:20). Zastąpić wiersz `klient: ['klient', 'klientów', 'klientów']` i użyć `FORMY.klient`.

### P3 · KOD · `src/style/tokeny.css:29`
Token `--status-wykonana-tlo` nieużywany po usunięciu statusu `wykonana`; usunąć.

### P3 · KOD · `src/dane/migracja-v2.js:49`
`wykonaniaV1` nie usuwa powtórzonych id wykonań; dwa zlecenia `z-<id>-w1` → `maUnikalneId` odrzuca stan: ekran ratunkowy po aktualizacji albo „Plik kopii jest uszkodzony.” dla kopii przyjmowanej przez v1 (R25). Poprawka: zbiór widzianych id w filtrze plus test z dwoma wykonaniami o tym samym id.

### P3 · TEST · `src/dane/wyceny-statusy.test.js:1651`
Gałąź `czyInnaKopia ? … : nowa` w `przypiszKlienta` (wyceny.js:1880) testowana tylko dla innego klienta; mutant „zawsze nieaktualnaPoWyslaniu” przeżywa. Dopisać: kopia „Jan Nowak” przed wysłaniem, po `oznaczWyslana` `przypiszKlienta(magazyn, id, 'k-jan')` → `oferta.nieaktualna === false`.

## Findingi OPERATOR

Brak.

## Obalone przez verify (nie do naprawy)

Brak — kazdy weryfikowany finding przetrwal probe obalenia.

## Bookkeeping checkboxow Weryfikacja: / Test: [E2E]
- Odznaczone automatycznie (CLI/grep): 9
- [E2E] odznaczone na podstawie przebiegow testera: 1
- [E2E] przeniesione w trakcie runu na [Manual]: 0
- [E2E] SKIP do naprawy albo bez wpisu testera: 0
- Pozostawione dla operatora (Manual): 0
- Niejasne (P3): 0
- Failujace (P2): 1

### Szczegoly
- [x] CLI: `node --test src/zlecenia/plan-fakt.test.js src/ui/router.test.js` -> PASS (komenda: `node --test src/zlecenia/plan-fakt.test.js src/ui/router.test.js`)
- [x] CLI: `npm test` (IU-5) -> PASS (komenda: `npm test`)
- [x] CLI: `npm run typecheck` (IU-5) -> PASS (komenda: `npm run typecheck`)
- [x] Grep: `kreator/zakonczenie|widokZakonczeniaZlecenia|'zakonczenie'` -> PASS, brak wyników (komenda: `grep -rn ... src/`)
- [x] CLI: `node --test src/dane/migracja-v2.test.js src/dane/wyceny.test.js src/dane/wyceny-statusy.test.js src/dane/magazyn.test.js` -> PASS
- [x] CLI: `npm test` (IU-6) -> PASS (komenda: `npm test`)
- [x] CLI: `npm run typecheck` (IU-6) -> PASS
- [x] CLI: `node --test src/dane/kopia.test.js src/dane/kopia-v2.test.js src/widoki/kopia-teksty.test.js` -> PASS
- [x] CLI: `npm run typecheck` (IU-7) -> PASS
- [x] E2E: `migracja-v1` -> PASS (ksieguj: odznaczone 1, fail 0, skip 0, manual 0, bezWpisu 0)
- [ ] FAIL: `grep -rn "wykonana\|wykonania\|dodajWykonanie" src/ --include=*.js` zwraca tylko migracje — `trafienia w tempo.js, dane-tempa.js i 4 plikach testów` (P2)

## Przebieg review

| Etap | Wartosc |
|---|---|
| Pliki w fazie (z tego kodu) | 56 (53) |
| Flagi warstw | ui=true dane=true typowanie=true nowyModul=true |
| Checkboxy `[E2E]` (Test: + Weryfikacja:) | 1 |
| Tryb testera E2E | przegladarka |
| Tester E2E | wykonany (tryb przegladarka) |
| Przebiegi E2E PASS / FAIL / SKIP | 1 / 0 / 0 |
| Reviewerzy aktywni | security, performance, code-quality, correctness, spec-compliance, test-coverage, e2e |
| Reviewerzy pominieci | brak — pelny sklad |
| Findingi: znalezione -> dedup JS -> dedup semantyczny | 10 -> 10 -> 10 |
| P3 odrzucone limitem globalnym | 0 |
| Adversarial verify: weryfikowane / obalone / bez glosow | 5 / 0 / 0 |
| Dossier fazy | TAK — reviewerzy czytali dossier (skrypt z domkniecia fazy) |
| Sceptycy: P1 (3 glosy) / P2 grupy / P2 findingi | 3 / 1 / 4 (batchowanie: 4 findingow w 1 agentach) |
| Sceptycy: AGREE / DISAGREE_EVIDENCE / DISAGREE_CONCERN (glosy) / obnizone wagi (findingi) | 7 / 0 / 0 / 0 |
| Tiery rozumowania | sceptykP2=medium, sceptykP1=high, reviewer=high, spec=medium, testCoverage=medium, scribe=low |
