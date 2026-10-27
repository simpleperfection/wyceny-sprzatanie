# Wiedza projektu — indeks

Generowany z frontmatteru docs/solutions/ (`node .claude/scripts/wiedza/wiedza.mjs indeks --zapisz`) — nie edytuj recznie.
Wzorce `**` obowiazuja kazdy plik. Pelny opis problemu: link do solution.
<!-- wpisy: 1, zawsze: 0 -->

| klasa | regula | wzorce plikow | waga | zrodlo |
|---|---|---|---|---|
| kontrakt-wspolny | Stan zapisywany i stan wczytywany (eksport/import kopii, link oferty, zapis do magazynu) sprawdzaj jedną funkcją walidacji z jednego modułu, wołaną po obu stronach; granice (długości, limity, listy statusów, pola) importuj ze źródła, nie kopiuj. Każda granica importu ma test odmowy i test round-trip eksport → import. | `src/dane/**`, `src/oferta/**` | wysoka | [solution](solutions/runtime-errors\2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md) |
