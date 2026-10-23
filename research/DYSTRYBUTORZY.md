# Dostawcy chemii do bazy `data/chemia.json` (etap 4)

Lista **zatwierdzona przez właściciela 2026-10-23**, z jedną zmianą względem propozycji: Voigt zamiast Diversey (TASKI). Strony sprawdzono 2026-10-23.

## Kryteria
1. **Karty charakterystyki (SDS) po polsku, publicznie do pobrania** – aplikacja ma linkować do karty każdego środka.
2. **Wielkość i dostępność w całej Polsce.** Przychody firm są tylko w płatnych bazach, więc wielkość oceniamy po danych publicznych: liczbie oddziałów i pracowników, zasięgu, stażu.
3. **Publiczne ceny** – potrzebne, żeby zastąpić szacunek chemii (4 zł/h) prawdziwym kosztem.
4. **Pokrycie potrzeb**: środki z `data/normy.json` (uniwersalny, zasadowy, kwasowy, chlorowy lub grzybobójczy, poremontowy, do szyb) oraz środki do usług z pozycjami (pranie ekstrakcyjne, maszynowe mycie i doczyszczanie posadzek, kostka, elewacje).

Karty SDS wystawia producent, a hurtownia zwykle tylko je przekazuje. Dlatego na liście są głównie producenci i właściciele marek. Dwie pozycje to typowi dystrybutorzy: Merida (sieć oddziałów) i Amtra (marka Clinex).

## Zatwierdzona lista 8 firm
| # | Firma | Kto to | Wielkość | Karty SDS | Ceny | Co pokrywa |
|---|---|---|---|---|---|---|
| 1 | [Tenzi](https://tenzi.pl) | producent, Dołuje k. Szczecina | od 1999 r., sprzedaje w 13 krajach Europy | ✅ PL przy każdym produkcie (pliki „KCH … (PL)”) | ✅ sklep fabryczny, netto i brutto | wszystko: uniwersalny, odtłuszczacz (BRUDEX), kwasowy (GRAN STON, DERAST), chlorowy (GranClor 2006), szyby (TOP GLASS), poremontowy (DEKAM), pranie (TEXTIL-EX), posadzki (TopEfekt), kostka i elewacja (TopEfekt MOSS, APC Out) |
| 2 | [Merida](https://merida.com.pl/kategoria/chemia-1) | producent i dystrybutor, Wrocław | 31 oddziałów, ok. 500 pracowników, ok. 200 tys. klientów | ✅ PL przy każdym produkcie | ✅ sklep, netto i brutto | 104 pozycje własnej chemii: uniwersalny, podłogi, sanitariaty, szyby, dezynfekcja; brak środków do kostki, elewacji i prania |
| 3 | [Clinex](https://www.clinex.com.pl/centrum-pobierania/karty-msds/) (Amtra) | dystrybutor i właściciel marki, Sosnowiec | w branży sprzątania od 1992 r., grupa kilku spółek (Amtra, Nanochem, Five Star Polska) | ✅ ok. 187 kart PL na jednej stronie | ⚠ brak sklepu producenta; ceny ze sklepów, np. [hurtowniachemiczna.com](https://hurtowniachemiczna.com/chemia-profesjonalna) (netto i brutto) | uniwersalny (PROFIT Uni), podłogi i ich konserwacja, sanitariaty, kuchnie (Grill), szyby, pranie (Textile EXT), dezynfekcja |
| 4 | [Kärcher](https://www.karcher.com/pl/professional/srodki-czyszczace-i-pielegnacyjne.html) | producent maszyn i chemii, Kärcher Sp. z o.o., Kraków | koncern międzynarodowy | ✅ PDF po numerze katalogowym: `s1.kaercher-media.com/documents/safetydatasheets/pl_PL/<numer>_SDB_pl_PL.pdf` | ⚠ chemia profesjonalna bez ceny na stronie (sprzedaż przez dealerów); sklep Kärchera ma ceny tylko części produktów | **pominięty** decyzją właściciela 2026-10-23 – w bazie nie ma jego produktów |
| 5 | [Kiehl](https://www.kiehl-group.com/pl/) | producent, Niemcy | ponad 120 lat, sprzedaż w Polsce przez dystrybutorów | ✅ PDF PL, np. `kiehl-group.com/ix_pim_assets/doc/doc_Sicherheitsdatenblatt/j5608_sd_ARCANDIS-Classic_pl.pdf` | ⚠ ceny ze sklepu [sklep.miwa.net.pl](https://sklep.miwa.net.pl/chemia/1/full/4/f_producer_55/1) (netto i brutto, ok. 40 produktów Kiehla) | 10 produktów: uniwersalny (Clarida Uni), odtłuszczacz (Tornado), sanitariaty (Clarida Sani), automaty (Dopomat), strippery (Dipex, Li-Ex), powłoka (Thermodur), impregnat do kamienia (Impran), szyby (GlasQueen), dezynfekcja (Desgomin); strona produktu podaje pH i zużycie w ml/m² |
| 6 | [Medi-Sept](https://medisept.pl/baza-wiedzy/do-pobrania/dokumentacja) | producent, Lublin | polski producent środków do dezynfekcji, 123 wygrane części przetargów publicznych | ✅ link `medisept.pl/pobierz-atrybut/…/karta-charakterystyki-pl-…` przy każdym produkcie | ⚠ ceny ze sklepu [sklep.miwa.net.pl](https://sklep.miwa.net.pl/chemia/1/full/4/f_producer_69/1) | 10 produktów linii Mediclean: posadzki (110 Floor, 121 Striper, 130 Strong, 142 Polimer, 160 Gres – też osady cementowe), przemysł (200 Indust), uniwersalny (210 Surface), sanitariaty (310 Sanit, 315 Power), grill (530); grzybobójczego Mediclean 330 Chlorine sklep nie ma |
| 7 | [Buzil](https://www.buzil.pl/produkty/) | producent, Niemcy; BUZIL-Polska Sp. z o.o., Wrocław | firma rodzinna z polskim oddziałem | ✅ karta PL formularzem POST na stronie produktu (bez stałego linku; sposób w `scripts/chemia/buzil.pl`); pH w kartach zwykle „nie dotyczy” | ⚠ ceny ze sklepu [higienagpt.pl](https://www.higienagpt.pl/chemia-buzil/1/full/3) (netto i brutto, ok. 60 produktów) | 12 produktów: uniwersalny (Blitz Citro), odtłuszczacze (Perfekt, Indumaster Strong), sanitariaty (Bucasan Trendy, Contracalc – też resztki cementu), gres (Erol, Erolcid), szyby (Windowmaster), posadzki (Unibuz, Sunglorin), pranie (Optiflor Ex), dezynfekcja grzybobójcza (Budenat Alkasept) |
| 8 | [Voigt](https://voigt.pl) | producent, PPUH VOIGT Sp. z o.o., Zabrze | polski producent, partnerzy w 6 krajach Europy | ⚠ publiczne są karty linii konsumenckiej; przy chemii profesjonalnej etykieta podaje „Karta charakterystyki dostępna na żądanie” – sprawdzimy sklep, a gdy karty nie ma, produkt dostanie link do strony produktu i adnotację | ✅ [sklep](https://sklep.voigt.pl/) z cenami | linia profesjonalna: podłogi, dywany, szyby (np. VC 176R), dezynfekcja, systemy dozowania |

Dostęp do kart Buzila i Voigta sprawdzony 2026-10-23 (Voigt: karty przy produktach w sklepie; Buzil: formularz na stronie produktu).

## Lista rezerwowa i odrzuceni
| Firma | Powód |
|---|---|
| Diversey (TASKI), grupa Solenis | zastąpiony przez Voigt decyzją właściciela; karty w portalu [sds.solenis.com](https://sds.solenis.com/en/) (wyszukiwarka nie zwróciła wyników przy automatycznej próbie), ceny tylko u dystrybutorów – **pierwsza rezerwa** |
| [Dolphin](https://dolphin.pl) | producent od 2003 r., ale przy produktach nie ma ani kart, ani cen (tylko katalog PDF) |
| Ecolab | duży koncern, ale sprzedaje głównie w umowach z dużymi klientami, bez publicznych cen |
| Sidolux Professional, Grupa Inco (Ludwik) | karty publiczne (Inco), ale to linie konsumenckie w małych opakowaniach, nie chemia profesjonalna |

## Sposób zbierania produktów
- **Liczba produktów:** 8–15 środków od każdej firmy, tak żeby każda kategoria z `normy.json` (`brud[].chemia`) i każda usługa z pozycjami miała co najmniej 2–3 środki.
- **Pola produktu:** nazwa, firma, kategoria, przeznaczenie, pH (z opisu producenta albo z sekcji 9 karty SDS), rozcieńczenie robocze, opakowanie, cena netto i brutto ze źródłem i datą, link do karty SDS oraz data karty.
- **Ceny marek bez sklepu producenta** (Clinex, Kiehl, Medi-Sept, Buzil): z jednego wskazanego sklepu internetowego, z linkiem i datą. Takie ceny mają w danych pewność „średnią”.
- **Koszt chemii:** nie wyliczamy go z bazy, bo ceny i dozowanie są różne u każdego producenta (decyzja właściciela 2026-10-23). Baza służy do doboru środków do usługi i brudu, a w koszcie firmy zostaje szacunek z `data/ceny.json` (4 zł/h, impregnat 8–12 zł/m²), który firma może zmienić.
