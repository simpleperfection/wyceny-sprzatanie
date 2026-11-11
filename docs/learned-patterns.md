# Wiedza projektu — indeks

Generowany z frontmatteru docs/solutions/ (`node .claude/scripts/wiedza/wiedza.mjs indeks --zapisz`) — nie edytuj recznie.
Wzorce `**` obowiazuja kazdy plik. Pelny opis problemu: link do solution.
<!-- wpisy: 3, zawsze: 0 -->

| klasa | regula | wzorce plikow | waga | zrodlo |
|---|---|---|---|---|
| kontrakt-wspolny | Regułę rozliczeń zlecenia (kwota i płatność miesiąca, płatność wizyty, dzień po przesunięciu) eksportuj jako jedną funkcję z modułu, który ją zapisuje, a ekrany wołaj z niej; nie przepisuj warunku w modelu widoku. Gdy ekran pyta „czy wolno”, predykat i operacja zapisu mają dzielić tę samą funkcję wewnętrzną. | `src/dane/wizyty.js`, `src/zlecenia/**`, `src/widoki/klienci-dane.js` | wysoka | [solution](solutions/runtime-errors\2026-11-04-regula-rozliczen-wizyty-przepisana-w-modelach-ekranow.md) |
| kontrakt-wspolny | Stan zapisywany i stan wczytywany (eksport/import kopii, link oferty, zapis do magazynu) sprawdzaj jedną funkcją walidacji z jednego modułu, wołaną po obu stronach; granice (długości, limity, listy statusów, pola) importuj ze źródła, nie kopiuj. Każda granica importu ma test odmowy i test round-trip eksport → import. | `src/dane/**`, `src/oferta/**` | wysoka | [solution](solutions/runtime-errors\2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md) |
| wyscig-i-wspolbieznosc | Worker z pamięcią niezmienną w ramach wersji (pełna lista plików przy install, bez zapisu w biegu) nie woła skipWaiting ani clients.claim: nowa wersja wchodzi po zamknięciu wszystkich stron, razem z nowym cache. Przejęcie otwartej strony zostaw trybowi, w którym kod i dane odświeża ten sam mechanizm, a każdą zmianę cyklu życia workera sprawdzaj testem z dwiema wersjami cache. | `sw.js`, `scripts/publikacja/sw-publikacji.mjs`, `src/pwa/**` | srednia | [solution](solutions/deployment-issues\2026-11-11-nowy-service-worker-przejmuje-otwarta-strone-i-miesza-wersje.md) |
