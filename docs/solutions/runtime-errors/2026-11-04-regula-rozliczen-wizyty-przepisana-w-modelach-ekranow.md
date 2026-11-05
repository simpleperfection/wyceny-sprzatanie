---
title: "Miesiąc, którego nie da się opłacić: reguła rozliczeń serii przepisana w modelach ekranów"
date: 2026-11-04
category: runtime-errors
severity: high
stack:
  - JavaScript (ES modules, JSDoc)
  - node --test
tags:
  - zlecenia
  - zaplata
  - rozliczenie-miesieczne
  - jedno-zrodlo-reguly
status: verified
last_verified: 2026-11-04
klasa: kontrakt-wspolny
regula: "Regułę rozliczeń zlecenia (kwota i płatność miesiąca, płatność wizyty, dzień po przesunięciu) eksportuj jako jedną funkcję z modułu, który ją zapisuje, a ekrany wołaj z niej; nie przepisuj warunku w modelu widoku. Gdy ekran pyta „czy wolno”, predykat i operacja zapisu mają dzielić tę samą funkcję wewnętrzną."
paths:
  - src/dane/wizyty.js
  - src/zlecenia/**
  - src/widoki/klienci-dane.js
waga: wysoka
szczebel: kod
szczebel_powod: "Eksportowany predykat obok operacji zapisu usuwa rozjazd w jednym miejscu architektury; nowy model ekranu nadal może przepisać warunek, ale lint nie odróżni takiej kopii od zwykłego filtra wizyt."
zrodlo: "zadanie aplikacja-modulowa / review fazy 1 (P1 src/zlecenia/zapytania.js:98) i fazy 5 (P2 src/zlecenia/karta-dane.js:168, kalendarz-dane.js:73) / commity d66788a, 2e72a80"
ucieczki: 0
---

# Miesiąc, którego nie da się opłacić: reguła rozliczeń przepisana w modelach ekranów

## Symptomy

- Seria miesięczna z `koniec` 2026-10-31 i zrobioną wizytą 2026-11-02: „Niezapłacone” pokazuje 2026-11, a `oznaczZaplateMiesiaca(…, '2026-11')` rzuca `BladZlecenia('brak_wizyty')`. Pozycji nie da się zamknąć, zostaje niezapłacona na stałe.
- Testy i typecheck były zielone: każda kopia reguły była poprawna względem własnych testów.
- Ten sam wzorzec wrócił w fazie 5, już po naprawie z fazy 1: `czyMiesiacZWizyta` w `src/zlecenia/karta-dane.js` skopiowała warunek `kwotaMiesiaca`, a jej wynik decydował, czy ekran zawoła funkcję rzucającą `brak_wizyty` w `modelKarty` bez `try/catch`. Rozjazd wysadziłby render karty zlecenia albo ukrył miesiąc do zapłaty (R26).

## Root Cause

Każdy ekran potrzebuje odpowiedzi na to samo pytanie („czy to jest do zapłaty i za ile”), więc model widoku dopisywał je sobie sam, zamiast pytać modułu, który zapisuje zapłatę. Kopia odpowiada na pytanie „czy pokazać”, oryginał „czy zapisać”, i przy pierwszej różnicy ekran obiecuje operację, której zapis odmawia.

Reguła „wizyta jest płatna za wizytę” miała trzy brzmienia (`kalendarz-dane.js`, `wizyta-dane.js`, `zapytania.js`). Dawały to samo tylko dzięki niejawnej zależności: `cenaWizyty` jest null wyłącznie przy rozliczeniu miesięcznym.

## Rozwiązanie

Reguła ma jedno źródło obok zapisu, a predykat i operacja dzielą funkcję wewnętrzną, więc nie mogą się rozejść:

```javascript
// src/dane/wizyty.js
function okresMiesiaca(z, miesiac) { /* okres z reguły, a po końcu serii z pierwszej zrobionej wizyty */ }

export const czyMiesiacMaWizyte = (z, miesiac) => okresMiesiaca(z, miesiac) !== null

export function kwotaMiesiaca(z, miesiac) {
  const okres = okresMiesiaca(z, miesiac)
  if (okres === null) throw new BladZlecenia('brak_wizyty', `Zlecenie ${z.id} nie ma wizyty w miesiącu ${miesiac}`)
  // ...
}
```

- `src/zlecenia/zapytania.js` i `src/zlecenia/karta-dane.js` importują `kwotaMiesiaca` i `czyMiesiacMaWizyte`; ich kopie zniknęły.
- `czyPlatnaZaWizyte(z, okres)` w `src/zlecenia/zapytania.js` jest jedyną regułą płatności wizyty; korzystają z niej `czekaNaZaplate` i ekran wizyty, a kalendarz dostaje jej wynik w polu `czyPlatna` wiersza.
- Teksty i nazwy tej samej rodziny, które też miały po 3–4 kopie, są w `src/zlecenia/teksty-wizyty.js` i `src/zlecenia/bledy-zapisu.js`.

## Komendy diagnostyczne

```bash
# miejsca, które same filtrują zrobione wizyty albo porównują rozliczenie, zamiast pytać reguły
grep -rnE "zrobiona !== null|rozliczenie (!|=)== '" src --include=*.js | grep -v test
```

## Zapobieganie

- Przed dopisaniem warunku w `*-dane.js` sprawdź, czy `src/dane/wizyty.js` albo `src/zlecenia/zapytania.js` nie odpowiada już na to pytanie. Gdy reguła jest prywatna, wyeksportuj ją zamiast kopiować.
- Komentarz „to ten sam warunek co X” w nowym kodzie oznacza kopię: tak była opisana `czyMiesiacZWizyta`.
- Test łączy ekran z zapisem: każda pozycja z listy do zapłaty musi dać się zapisać (`niezaplacone` → `oznaczZaplateMiesiaca` bez błędu), także po końcu serii.

## Powiązane

- [Kopia zapasowa: eksport i import z różnymi walidacjami](2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md): ta sama klasa na granicy zapisu i odczytu stanu.

## Kontekst

Moduły Zlecenia i Klienci z zadania `aplikacja-modulowa`. Reguły wizyt liczą się z okresów zlecenia, nie z zapisanych wierszy, dlatego warunki są na tyle krótkie, że kusi przepisanie ich w widoku. Review fazy 5 zebrało w tej samej rodzinie jeszcze `tekstTerminu`, `tekstZaplaty`, `nazwaZlecenia` (trzy różne wyniki przy braku opisu) i dzień wizyty po przesunięciu.
