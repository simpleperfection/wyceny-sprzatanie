---
title: "Kopia zapasowa, której aplikacja nie wczyta: eksport i import sprawdzały stan różnymi regułami"
date: 2026-10-27
category: runtime-errors
severity: high
stack:
  - JavaScript (ES modules, JSDoc)
  - localStorage
  - node --test
tags:
  - kopia-zapasowa
  - walidacja
  - round-trip
  - kontrakt
  - localStorage
status: verified
last_verified: 2026-10-27
klasa: kontrakt-wspolny
regula: "Stan zapisywany i stan wczytywany (eksport/import kopii, link oferty, zapis do magazynu) sprawdzaj jedną funkcją walidacji z jednego modułu, wołaną po obu stronach; granice (długości, limity, listy statusów, pola) importuj ze źródła, nie kopiuj. Każda granica importu ma test odmowy i test round-trip eksport → import."
paths:
  - src/dane/**
  - src/oferta/**
waga: wysoka
szczebel: kod
szczebel_powod: "Wspólny strażnik w jednym module (src/dane/kopia.js sprawdzStanKopii, src/dane/ksztalt.js) czyni rozjazd niemożliwym dla istniejących ścieżek, ale nowa ścieżka zapisu może go nie zawołać, a lint tego nie wykryje bez osądu."
zrodlo: "zadanie etap-5-aplikacja-wyceny / review fazy 2 (P1 src/dane/kopia.js:220) / commit 811382a"
ucieczki: 0
---

# Kopia zapasowa, której aplikacja nie wczyta

## Symptomy

- `utworzKopie` tworzy plik bez błędu, a `odczytajKopie` na tym samym pliku rzuca `BladKopii('uszkodzony')`.
- Odtworzone w node: szkic z `uwagi` o długości 2500 znaków albo 5001 wycen. Eksport przechodzi, import odrzuca cały plik.
- Skutek: jedyna kopia wszystkich danych nie daje się wczytać, a błąd wychodzi dopiero przy odtwarzaniu, czyli wtedy, gdy dane już zginęły.

## Root Cause

Eksport sprawdzał stan tylko przez `zaktualizujStan` → `jestStanem` (każda wycena ma być obiektem). Import miał osobne, ostrzejsze reguły: teksty do 2000 znaków, do 5000 wycen, `jestWycena`, unikalne id. Ścieżki zapisu (`utworzSzkic`, zapisy odpowiedzi) nie egzekwowały żadnej z tych granic. Tę samą klasę review znalazło w fazie 6: dekoder linku oferty (`src/oferta/kodek.js`) miał własne kopie `STATUSY_VAT`, granicy stawki i pól firmy, więc nowy status albo pole dałoby link „uszkodzony”.

## Rozwiązanie

Jedna funkcja kontroli stanu, wołana i przy eksporcie, i przy imporcie (commit 811382a):

```js
// src/dane/kopia.js
function sprawdzStanKopii(stan) {
  if (stan.wyceny.length > MAKS_WYCEN || !maKrotkieTeksty(stan)) throw new BladKopii('uszkodzony', '…')
  if (!stan.wyceny.every(jestWycena) || !maUnikalneId(stan.wyceny)) throw new BladKopii('uszkodzony', '…')
  if (Object.values(stan.licznikNumerow).some((n) => n > MAKS_LICZNIKA_NUMEROW)) throw new BladKopii('uszkodzony', '…')
  sprawdzUstawieniaKopii(stan.ustawienia)
}

export function utworzKopie(stan, teraz) {
  // …
  sprawdzStanKopii(wynik.stan) // eksport odmawia tego, czego import by nie przyjął
}
export function odczytajKopie(tekst) {
  // …
  sprawdzStanKopii(wynik.stan)
}
```

Do tego:
- jeden strażnik `jestWycena` / `jestMigawkaWyniku` i stała `RODZAJE_WYCENY` w `src/dane/wyceny.js`, importowane w `kopia.js` zamiast kopii;
- wspólne strażniki kształtu i `POLA_FIRMY` w nowym `src/dane/ksztalt.js`;
- `utworzSzkic` i zapisy wejścia/wyniku pilnują tych samych granic (`dlugosc`, `limit_wycen`), więc stanu nie do wyeksportowania nie da się w ogóle zapisać;
- import ustawień przez pełne `sprawdzUstawienia`, a nie tylko kontrolę typów;
- testy odmowy dla każdej granicy i test round-trip.

## Komendy diagnostyczne

```bash
npm test -- src/dane/kopia.test.js
# szukanie kopii kontraktów: te same nazwy list/limitów w kilku modułach
grep -rn "MAKS_\|STATUSY_\|POLA_\|RODZAJE_" src/ --include=*.js | grep -v test
```

## Zapobieganie

- Każda para „zapis / odczyt” (kopia, link oferty, magazyn) ma jeden strażnik kształtu wołany po obu stronach.
- Limity i listy dopuszczalnych wartości mają jedno źródło (`src/dane/ksztalt.js`, `src/silnik/vat.js`, `src/dane/wyceny.js`), a reszta je importuje.
- Test round-trip: dla stanu na granicy każdego limitu `odczytajKopie(utworzKopie(stan).tresc)` daje ten sam stan, a stan za granicą daje błąd już przy eksporcie.
- Fixture'y testów mają format pola ze źródła (np. surowe `2026-11-14T09:00` z `datetime-local`), a nie gotowy tekst. Gotowy tekst w fixturze ukrył P1 fazy 6.

## Powiązane

- `docs/active/etap-5-aplikacja-wyceny/review-faza-2.md` (P1 `kopia.js:220`, P2 `kopia.js:23/60/72/171`)
- `docs/active/etap-5-aplikacja-wyceny/review-faza-6.md` (P2 `kodek.js:24`, `ksztalt.js:46`)

## Kontekst

Etap 5 (PWA w czystym JS bez kroku budowania, dane w localStorage). Kopia zapasowa jest jedynym mechanizmem przeniesienia i odtworzenia danych firmy, więc błąd ma wagę utraty danych.
