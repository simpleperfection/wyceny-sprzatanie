# Concepts — słownik domenowy wyceny-sprzatanie

Glosariusz pojęć o znaczeniu specyficznym dla tego projektu (encje, nazwane procesy, statusy).
Jedno hasło = zwięzła definicja + opcjonalny link do CLAUDE.md/docs. Tylko słownik, nie spec.
Narasta przez /dev-compound, porządkowany przez /dev-compound-refresh.

## Kopia zapasowa
Plik JSON z całym stanem aplikacji (ustawienia, wyceny, liczniki numerów), jedyny sposób przeniesienia i odtworzenia danych; import w trybie „zastąp” albo „połącz”. Eksport odmawia stanu, którego import by nie przyjął. → [solution](solutions/runtime-errors/2026-10-27-kopia-zapasowa-eksport-i-import-z-roznymi-walidacjami.md)

## Migawka wyniku
Zapisany przy wycenie wynik silnika (linie, minuty normowe, wizyty w miesiącu, cena), z którego liczą się podsumowanie i koszt, bez ponownego wyceniania. `wizytWMiesiacu` może być ułamkiem (4,33), a 1 oznacza zlecenie jednorazowe.

## Oferta nieaktualna
Flaga oferty ustawiana, gdy po wysłaniu zmieniło się wejście albo cena wyceny: klient ma wcześniejszą wersję.

## Status wyceny
`szkic` → `do_wyslania` → `wyslana` → `przyjeta` → `wykonana` (albo `odrzucona`). Abonament po wpisaniu wykonania zostaje `przyjeta`, a zlecenie jednorazowe przechodzi w `wykonana`.

## Szybka wycena
Wycena przez telefon z kilku pytań, która daje widełki (`widelki`), jedną kwotę (`ok`) albo dolną granicę przy oględzinach (`od`); można ją zamienić na dokładną wycenę. → [wymagania](brainstorms/2026-10-23-poczatkujace-firmy-requirements.md)

## Tempo
Mnożnik czasu pracy firmy względem norm (np. 1,3×): z wykonanych zleceń, wpisany ręcznie albo domyślny. Zmienia koszt i realną stawkę, a nie cenę dla klienta.

## Tryb usługi
`pomieszczenia` (cena z czasu × stawka województwa) albo `pozycje` (ilość × cena krajowa × współczynnik województwa × progi i brud). → [model wyceny](../CLAUDE.md#model-wyceny)
