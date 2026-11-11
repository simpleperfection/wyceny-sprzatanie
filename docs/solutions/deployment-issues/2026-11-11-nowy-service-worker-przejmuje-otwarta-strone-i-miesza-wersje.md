---
title: "Nowy service worker przejmuje otwartą stronę: stary kod dostaje nowe dane"
date: 2026-11-11
category: deployment-issues
severity: medium
stack:
  - JavaScript (service worker, Cache API)
  - Cloudflare Workers (pliki statyczne)
  - node --test
tags:
  - service-worker
  - publikacja
  - cache
  - offline
  - wersje
status: verified
last_verified: 2026-11-11
klasa: wyscig-i-wspolbieznosc
regula: "Worker z pamięcią niezmienną w ramach wersji (pełna lista plików przy install, bez zapisu w biegu) nie woła skipWaiting ani clients.claim: nowa wersja wchodzi po zamknięciu wszystkich stron, razem z nowym cache. Przejęcie otwartej strony zostaw trybowi, w którym kod i dane odświeża ten sam mechanizm, a każdą zmianę cyklu życia workera sprawdzaj testem z dwiema wersjami cache."
paths:
  - sw.js
  - scripts/publikacja/sw-publikacji.mjs
  - src/pwa/**
waga: srednia
szczebel: regula
szczebel_powod: "O przejęciu strony decyduje tryb pamięci workera, a to wybór przy każdej zmianie jego cyklu życia; test z dwiema wersjami cache pilnuje tylko obecnej flagi ZAPIS_W_BIEGU."
zrodlo: "zadanie zamkniety-dostep-testy / review fazy 2 (P2 sw.js:133) / commit 90aa3f8"
ucieczki: 0
---

# Nowy service worker przejmuje otwartą stronę: stary kod dostaje nowe dane

## Symptomy

- Decyzja planu (R34): nowa wersja instaluje się w całości albo wcale, więc aplikacja jest cała nowa albo cała stara. `dist/sw.js` łamał to w otwartej sesji.
- Scenariusz: aplikacja jest otwarta, wchodzi nowa publikacja. Stary worker oddał już stare moduły z `src/`. Nowy worker instaluje pełny cache nowej wersji, woła `skipWaiting()`, w `activate` kasuje stary cache i przez `clients.claim()` przejmuje stronę. Leniwe `fetch('data/chemia.json')` (także zakresy i pytania) dostaje wtedy nowe dane do starego parsera.
- Testy i E2E były zielone: każdy sprawdzał jedną wersję cache naraz.

## Root Cause

`sw.js` w repo pracuje w trybie stale-while-revalidate: kod i dane odświeża ten sam mechanizm w tle, więc szybkie przejęcie strony (`skipWaiting`, `clients.claim`) jest tam bezpieczne. Publikacja zmienia tryb pamięci (`ZAPIS_W_BIEGU = false`, pełna lista plików w `install`, wersja cache z hasza treści), ale cykl życia workera został ten sam. Przy pamięci niezmiennej w ramach wersji przejęcie strony w locie wymienia cache pod działającym starym kodem.

## Rozwiązanie

O przejęciu strony decyduje ta sama stała co o trybie pamięci (commit `90aa3f8`):

```javascript
// sw.js
self.addEventListener('install', (zdarzenie) => {
  zdarzenie.waitUntil(caches.open(WERSJA_CACHE)
    .then((cache) => cache.addAll(PLIKI_STARTOWE.map((plik) => new Request(plik, { cache: 'reload' }))))
    .then(() => (ZAPIS_W_BIEGU ? self.skipWaiting() : undefined)))
})

self.addEventListener('activate', (zdarzenie) => {
  zdarzenie.waitUntil(caches.keys()
    .then((nazwy) => Promise.all(nazwy.filter((nazwa) => nazwa !== WERSJA_CACHE).map((nazwa) => caches.delete(nazwa))))
    .then(() => (ZAPIS_W_BIEGU ? self.clients.claim() : undefined)))
})
```

- W `dist/sw.js` nowy worker czeka, aż zamkną się wszystkie strony starej wersji. Stary cache znika dopiero przy aktywacji nowego, czyli razem ze starym kodem.
- Skutek dla użytkownika: nową wersję widać po zamknięciu aplikacji i ponownym otwarciu, a nie w trakcie pracy.
- Test `dwie wersje cache: nowy worker nie przejmuje otwartej strony…` w `scripts/publikacja/sw-publikacji.test.mjs` uruchamia `dist/sw.js` w `node:vm` z dwoma cache i sprawdza zero wywołań `skipWaiting` i `clients.claim`. Drugi test pilnuje, że `sw.js` z repo dalej przejmuje stronę.

## Komendy diagnostyczne

```bash
# czy zbudowany worker przejmuje strony i w jakim trybie pamięci pracuje
npm run publikacja && grep -nE "ZAPIS_W_BIEGU =|skipWaiting|clients.claim" dist/sw.js
node --test scripts/publikacja/sw-publikacji.test.mjs
```

## Zapobieganie

- Zmiana trybu pamięci workera (co i kiedy trafia do cache) wymaga przejrzenia `install` i `activate`: kto kasuje stary cache i kiedy strona zmienia workera.
- Test workera ma przypadek z dwiema wersjami cache naraz; test na jednej wersji nie zobaczy mieszania.
- Zostaje znana luka (P3 w `known-issues.md` zadania): przy starym workerze nawigacja bierze `index.html` z sieci, więc po publikacji przeładowana strona może dostać nowy `index.html` ze starymi modułami, dopóki aplikacja nie zostanie zamknięta.

## Powiązane

- [Kopia zapasowa: eksport i import z różnymi walidacjami](../runtime-errors/2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md): ta sama rodzina, dwie strony jednego stanu rozjeżdżają się po cichu.

## Kontekst

Zadanie `zamkniety-dostep-testy` (etap 6a): publikacja na Cloudflare za logowaniem Cloudflare Access. `scripts/publikacja/sw-publikacji.mjs` podmienia w `dist/sw.js` trzy stałe: `WERSJA_CACHE`, `PLIKI_STARTOWE` i `ZAPIS_W_BIEGU`. Opublikowany worker zapisuje do cache tylko przy instalacji, bo odświeżanie w tle dopisywałoby nowe pliki do starego cache, a po nieudanym `addAll` (np. przy wygasłej sesji Access) start offline dostałby mieszankę modułów.
