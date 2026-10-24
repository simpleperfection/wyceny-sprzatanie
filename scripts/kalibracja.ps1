# Kalibracja danych do wycen.
# 1. Liczy data/rynek.json: mediany krajowe i współczynniki 16 województw z plików research/.
# 2. Liczy data/normy.json: normy czasu pracy skalibrowane do median rynkowych i układy typowego mieszkania i biura.
# 3. Sprawdza model cen na scenariuszach testowych i zapisuje raport research/KALIBRACJA.md
#    oraz scenariusze w pełnej precyzji do research/kalibracja-scenariusze.json (test parytetu silnika JS).
#
# Uruchomienie z katalogu projektu:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\kalibracja.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$inv = [Globalization.CultureInfo]::InvariantCulture
$pl = [Globalization.CultureInfo]::GetCultureInfo('pl-PL')
$utf8 = New-Object System.Text.UTF8Encoding $false
$dzis = '2026-10-23'

# ---------- narzędzia ----------

function Num([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return $null }
  [double]::Parse(($s -replace ',', '.'), $inv)
}

function Median($values) {
  $s = @($values | Where-Object { $null -ne $_ } | Sort-Object)
  if ($s.Count -eq 0) { return $null }
  $m = [math]::Floor($s.Count / 2)
  if ($s.Count % 2) { return [double]$s[$m] }
  ([double]$s[$m - 1] + [double]$s[$m]) / 2
}

function Rnd([double]$x, [int]$d = 2) { [math]::Round($x, $d, [MidpointRounding]::AwayFromZero) }

function Esc([string]$s) { $s.Replace('\', '\\').Replace('"', '\"').Replace("`r", '\r').Replace("`n", '\n').Replace("`t", '\t') }

function Test-Prosty($x) {
  -not ($x -is [System.Collections.IDictionary] -or $x -is [System.Management.Automation.PSCustomObject] -or ($x -is [System.Collections.IEnumerable] -and $x -isnot [string]))
}

# Zapis JSON z wcięciem 2 spacji, polskimi znakami bez \u i krótkimi tablicami liczb w jednej linii.
function To-Json($o, [string]$ind = '') {
  $in = $ind + '  '
  if ($null -eq $o) { return 'null' }
  if ($o -is [string]) { return '"' + (Esc $o) + '"' }
  if ($o -is [bool]) { if ($o) { return 'true' } else { return 'false' } }
  if ($o -is [int] -or $o -is [long] -or $o -is [double] -or $o -is [decimal]) { return ([double]$o).ToString('R', $inv) }
  if ($o -is [System.Collections.IDictionary]) {
    if ($o.Count -eq 0) { return '{}' }
    $parts = @(foreach ($k in $o.Keys) { $in + '"' + (Esc ([string]$k)) + '": ' + (To-Json $o[$k] $in) })
    return "{`n" + ($parts -join ",`n") + "`n" + $ind + '}'
  }
  if ($o -is [System.Collections.IEnumerable]) {
    $items = @($o)
    if ($items.Count -eq 0) { return '[]' }
    if (@($items | Where-Object { -not (Test-Prosty $_) }).Count -eq 0) {
      return '[' + (@($items | ForEach-Object { To-Json $_ $in }) -join ', ') + ']'
    }
    $parts = @(foreach ($it in $items) { $in + (To-Json $it $in) })
    return "[`n" + ($parts -join ",`n") + "`n" + $ind + ']'
  }
  '"' + (Esc ([string]$o)) + '"'
}

function Save-Text([string]$rel, [string]$text) { [IO.File]::WriteAllText((Join-Path $root $rel), $text, $utf8) }

function Zl($x) { (Rnd $x 0).ToString('N0', $pl) }
function Dz($x, [int]$d = 2) { (Rnd $x $d).ToString("N$d", $pl) }
function Odch($model, $cel) {
  $p = Rnd (($model / $cel - 1) * 100) 0
  $znak = ''
  if ($p -gt 0) { $znak = '+' }
  $znak + $p.ToString($pl) + '%'
}

# ---------- dane wejściowe ----------

$firmy = Import-Csv (Join-Path $root 'research\cenniki_firm.csv') -Delimiter ';' -Encoding UTF8
$kbRows = Import-Csv (Join-Path $root 'research\kb_wojewodztwa.csv') -Delimiter ';' -Encoding UTF8
$ceny = Get-Content (Join-Path $root 'data\ceny.json') -Raw -Encoding UTF8 | ConvertFrom-Json

$nazwyWoj = [ordered]@{
  'dolnoslaskie' = 'dolnośląskie'; 'kujawsko-pomorskie' = 'kujawsko-pomorskie'; 'lubelskie' = 'lubelskie'
  'lubuskie' = 'lubuskie'; 'lodzkie' = 'łódzkie'; 'malopolskie' = 'małopolskie'; 'mazowieckie' = 'mazowieckie'
  'opolskie' = 'opolskie'; 'podkarpackie' = 'podkarpackie'; 'podlaskie' = 'podlaskie'; 'pomorskie' = 'pomorskie'
  'slaskie' = 'śląskie'; 'swietokrzyskie' = 'świętokrzyskie'; 'warminsko-mazurskie' = 'warmińsko-mazurskie'
  'wielkopolskie' = 'wielkopolskie'; 'zachodniopomorskie' = 'zachodniopomorskie'
}

$kolumny = [ordered]@{
  stawka_h = 'stawka_h_zl'
  mieszkanie_50m2 = 'mieszkanie_50m2_zl'
  po_remoncie_m2 = 'po_remoncie_zl_m2'
  okno_1skrz = 'okno_1skrz_zl'
  kanapa_3os = 'kanapa_3os_zl'
  dywan_m2 = 'dywan_zl_m2'
}

$wykluczenia = @(
  [ordered]@{ firma = 'Mika'; kolumna = 'mieszkanie_50m2_zl'; powod = 'cena sprzątania cyklicznego (1–2 zł/m²), oznaczona w skanie jako odstająca' }
  [ordered]@{ firma = 'Mika'; kolumna = 'po_remoncie_zl_m2'; powod = 'oznaczona w skanie jako odstająca' }
  [ordered]@{ firma = 'Tanie Sprzątanie'; kolumna = 'mieszkanie_50m2_zl'; powod = 'pakiet podstawowy do 60 m², oznaczony w skanie jako odstający' }
  [ordered]@{ firma = 'Tanie Sprzątanie'; kolumna = 'stawka_h_zl'; powod = 'oznaczona w skanie jako odstająca' }
  [ordered]@{ firma = 'Manutarg'; kolumna = 'po_remoncie_zl_m2'; powod = 'oznaczona w skanie jako odstająca' }
  [ordered]@{ firma = 'Efekt Rzeszów'; kolumna = 'mieszkanie_50m2_zl'; powod = 'cena sprzątania generalnego, nie standardowego' }
  [ordered]@{ firma = 'PERFECT'; kolumna = 'mieszkanie_50m2_zl'; powod = 'cena sprzątania generalnego (8 zł/m²)' }
  [ordered]@{ firma = 'EffectBcleaner'; kolumna = 'mieszkanie_50m2_zl'; powod = 'cena jednej wizyty w abonamencie' }
)
foreach ($w in $wykluczenia) {
  if (-not ($firmy | Where-Object { $_.firma -eq $w.firma -and $_.($w.kolumna) -ne '' })) { throw "Wykluczenie nie pasuje do żadnego wiersza: $($w.firma) / $($w.kolumna)" }
}

# ---------- 1. rynek: mediany krajowe i współczynniki województw ----------

$punkty = @(foreach ($r in $firmy) {
  foreach ($k in $kolumny.Keys) {
    $col = $kolumny[$k]
    $v = Num $r.$col
    if ($null -eq $v) { continue }
    if (@($wykluczenia | Where-Object { $_.firma -eq $r.firma -and $_.kolumna -eq $col }).Count -gt 0) { continue }
    [pscustomobject]@{ woj = $r.wojewodztwo; firma = $r.firma; klucz = $k; v = $v }
  }
})

$kraj = [ordered]@{}
foreach ($k in $kolumny.Keys) {
  $v = @($punkty | Where-Object klucz -eq $k | ForEach-Object v)
  $kraj[$k] = [ordered]@{
    mediana = Rnd (Median $v)
    n = $v.Count
    zakres = @((Rnd ($v | Measure-Object -Minimum).Minimum), (Rnd ($v | Measure-Object -Maximum).Maximum))
    srednia = Rnd ($v | Measure-Object -Average).Average
  }
}

# Indeks z naszego skanu: dla każdej firmy mediana proporcji (jej cena / mediana krajowa) we wszystkich kolumnach,
# potem mediana po firmach województwa. Liczymy firmy, nie ceny, bo ceny jednej firmy nie są niezależne.
$wlasne = @{}
foreach ($w in $nazwyWoj.Keys) {
  $indeksyFirm = @($punkty | Where-Object woj -eq $w | Group-Object firma | ForEach-Object {
    Median @($_.Group | ForEach-Object { $_.v / $kraj[$_.klucz].mediana })
  })
  $wlasne[$w] = @{ idx = Median $indeksyFirm; n = $indeksyFirm.Count }
}

# Indeks kb.pl: średnia z serii (środek widełek województwa / średnia krajowa serii).
$kbSerie = @('dom_do40', 'dom_40_100', 'dom_100_200', 'po_remoncie_h', 'elewacja_atm', 'biuro_do100', 'biuro_do200')
$kbIdx = @{}
foreach ($w in $nazwyWoj.Keys) { $kbIdx[$w] = 0.0 }
foreach ($s in $kbSerie) {
  $mid = @{}
  foreach ($row in $kbRows) { $mid[$row.woj] = ((Num $row."$($s)_min") + (Num $row."$($s)_max")) / 2 }
  $sr = ($mid.Values | Measure-Object -Average).Average
  foreach ($w in $nazwyWoj.Keys) { $kbIdx[$w] += $mid[$w] / $sr / $kbSerie.Count }
}

# wsp = średnia ważona: skan waży tyle, ile ma firm z cenami (n), kb.pl jak $wagaKb firm.
$wagaKb = 5
$H = $kraj.stawka_h.mediana
$wojewodztwa = @()
$wspMap = @{}
foreach ($w in $nazwyWoj.Keys) {
  $n = $wlasne[$w].n
  $own = $wlasne[$w].idx
  if ($n -eq 0) { $own = 1.0 }
  $wsp = Rnd ([math]::Min(1.25, [math]::Max(0.8, ($n * $own + $wagaKb * $kbIdx[$w]) / ($n + $wagaKb))))
  $wspMap[$w] = $wsp
  $kbRow = $kbRows | Where-Object woj -eq $w
  $rynekWoj = [ordered]@{}
  foreach ($k in $kolumny.Keys) {
    $v = @($punkty | Where-Object { $_.woj -eq $w -and $_.klucz -eq $k } | ForEach-Object v)
    if ($v.Count -gt 0) { $rynekWoj[$k] = [ordered]@{ mediana = Rnd (Median $v); n = $v.Count } }
  }
  $wojewodztwa += [ordered]@{
    id = $w
    nazwa = $nazwyWoj[$w]
    wsp = $wsp
    wsp_skladniki = [ordered]@{
      skan_firm = $(if ($n -gt 0) { Rnd $own } else { $null })
      firm_w_skanie = $n
      kb_pl = Rnd $kbIdx[$w]
      waga_skanu = Rnd ($n / ($n + $wagaKb))
    }
    stawka_h = [math]::Round($H * $wsp * 2, [MidpointRounding]::AwayFromZero) / 2
    placa_gus_h_2024 = Num $kbRow.gus_placa_N_h
    rynek = $rynekWoj
  }
}

$rynek = [ordered]@{
  meta = [ordered]@{
    wersja = $dzis
    opis = 'Plik generowany przez scripts/kalibracja.ps1 – nie edytować ręcznie. Mediany krajowe i współczynniki województw z research/cenniki_firm.csv i research/kb_wojewodztwa.csv.'
    metoda_wsp = "wsp = (n × indeks_skanu + $wagaKb × indeks_kb) / (n + $wagaKb), ograniczony do 0,80–1,25; n = liczba firm z cenami. indeks_skanu = mediana po firmach województwa z (mediana proporcji cen firmy do median krajowych); indeks_kb = średnia z serii kb.pl (środek widełek / średnia krajowa serii): $($kbSerie -join ', ')."
    stawka_h = 'stawka_h województwa = mediana krajowa stawki godzinowej × wsp, zaokrąglona do 0,50 zł'
    placa_gus = 'GUS BDL, zmienna 151738: przeciętne wynagrodzenie brutto w sekcji N (2024) / 168 h'
    vat = 'Ceny ze skanu firm są w większości bez informacji o VAT (część netto, część brutto) – mediana traktowana jako cena końcowa dla klienta.'
  }
  kraj = $kraj
  wykluczenia = $wykluczenia
  wojewodztwa = $wojewodztwa
}
Save-Text 'data\rynek.json' ((To-Json $rynek) + "`n")

# ---------- 2. normy czasu pracy ----------

$F = 30  # przygotowanie i odbiór zlecenia, min na wizytę
$M50 = $kraj.mieszkanie_50m2.mediana
$REM = $kraj.po_remoncie_m2.mediana

# Układy typowego mieszkania i biura: jedno źródło dla Uklad-Mieszkania, Uklad-Biura i pola uklady w data/normy.json,
# z którego korzysta silnik wyceny w aplikacji. Aneksu skrypt nie używa (założenie planu etapu 5, do potwierdzenia).
$uklady = [ordered]@{
  mieszkanie = [ordered]@{
    kuchnia = [ordered]@{ udzial = 0.16; min_m2 = 6; max_m2 = 14 }
    aneks = [ordered]@{ udzial = 0.10; min_m2 = 4; max_m2 = 8 }
    przedpokoj = [ordered]@{ udzial = 0.12 }
    lazienki = @(
      [ordered]@{ do_m2 = 60; m2 = @(4) }
      [ordered]@{ do_m2 = 100; m2 = @(5) }
      [ordered]@{ do_m2 = $null; m2 = @(8, 5) }
    )
    zasady = 'kuchnia (osobna) = udzial × metraż w granicach min_m2–max_m2; aneks liczy się tak samo z parametrami aneksu (założenie: aneks jest mniejszy od kuchni, różnica przechodzi do pokoi); przedpokój = udzial × metraż; łazienki = m2 z pierwszej pozycji listy, dla której metraż < do_m2 (null = bez górnej granicy); inna liczba łazienek skraca listę domyślną albo dokłada łazienki o metrażu ostatniej pozycji listy; pokoje = reszta metrażu.'
  }
  biuro = [ordered]@{
    na_m2 = 100
    pomieszczenia = @(
      [ordered]@{ typ = 'biuro'; m2 = 60 }
      [ordered]@{ typ = 'sala'; m2 = 15 }
      [ordered]@{ typ = 'kuchnia_socjalna'; m2 = 6 }
      [ordered]@{ typ = 'toaleta'; m2 = 5 }
      [ordered]@{ typ = 'korytarz'; m2 = 14 }
    )
    zasady = 'metraż pomieszczenia = m2 × metraż biura / na_m2'
  }
}

function Uklad-Mieszkania([double]$m2) {
  $um = $uklady.mieszkanie
  $kuchnia = [math]::Min($um.kuchnia.max_m2, [math]::Max($um.kuchnia.min_m2, $m2 * $um.kuchnia.udzial))
  $przedpokoj = $m2 * $um.przedpokoj.udzial
  foreach ($lz in $um.lazienki) { if ($null -eq $lz.do_m2 -or $m2 -lt $lz.do_m2) { $lazienki = $lz.m2; break } }
  $pokoje = $m2 - $kuchnia - $przedpokoj - ($lazienki | Measure-Object -Sum).Sum
  $u = @(@{ typ = 'pokoj'; m2 = $pokoje }, @{ typ = 'przedpokoj'; m2 = $przedpokoj }, @{ typ = 'kuchnia'; m2 = $kuchnia })
  foreach ($l in $lazienki) { $u += @{ typ = 'lazienka'; m2 = [double]$l } }
  , $u
}

function Uklad-Biura([double]$m2) {
  $k = $m2 / $uklady.biuro.na_m2
  , @(foreach ($p in $uklady.biuro.pomieszczenia) { @{ typ = $p.typ; m2 = $p.m2 * $k } })
}

# Względny czas na m² (pokój = 2,5); skala wynika z kalibracji.
$pomieszczeniaDef = [ordered]@{
  dom = @(
    [ordered]@{ id = 'pokoj'; nazwa = 'Pokój, sypialnia, salon'; waga = 2.5 }
    [ordered]@{ id = 'przedpokoj'; nazwa = 'Przedpokój, korytarz, schowek'; waga = 2.5 }
    [ordered]@{ id = 'kuchnia'; nazwa = 'Kuchnia lub aneks'; waga = 6.5 }
    [ordered]@{ id = 'lazienka'; nazwa = 'Łazienka lub WC'; waga = 11.0 }
  )
  biuro = @(
    [ordered]@{ id = 'biuro'; nazwa = 'Biuro, gabinet, open space'; waga = 1.0 }
    [ordered]@{ id = 'sala'; nazwa = 'Sala konferencyjna, sala sprzedaży, poczekalnia'; waga = 0.9 }
    [ordered]@{ id = 'kuchnia_socjalna'; nazwa = 'Kuchnia socjalna'; waga = 4.0 }
    [ordered]@{ id = 'toaleta'; nazwa = 'Toaleta'; waga = 8.0 }
    [ordered]@{ id = 'korytarz'; nazwa = 'Korytarz, hol, klatka schodowa'; waga = 0.6 }
  )
}

function Skaluj($zestaw, $uklad, [double]$celMin) {
  $wagi = @{}
  foreach ($p in $pomieszczeniaDef[$zestaw]) { $wagi[$p.id] = $p.waga }
  $rel = 0.0
  foreach ($p in $uklad) { $rel += $p.m2 * $wagi[$p.typ] }
  ($celMin - $F) / $rel
}

# W dużych biurach (open space) sprząta się szybciej na m²; kalibracja dotyczy 100 m² (mnożnik 1,0).
$progiBiura = @(
  [ordered]@{ od_m2 = 0; mnoznik = 1.0 }
  [ordered]@{ od_m2 = 300; mnoznik = 0.85 }
  [ordered]@{ od_m2 = 1000; mnoznik = 0.7 }
)
function Skala-Biura([double]$m2) {
  $mn = 1.0
  foreach ($p in $progiBiura) { if ($m2 -ge $p.od_m2) { $mn = $p.mnoznik } }
  $mn
}

# Przygotowanie zlecenia w usługach w trybie pozycji (dojazd na miejsce, rozłożenie i złożenie sprzętu).
$przygotowanieUslug = [ordered]@{
  okna = 30; tapicerka = 30; dywany = 30; mycie_posadzek = 60; doczyszczanie = 60
  mycie_kostki = 60; mycie_elewacji = 90; sprzatanie_firm = 45
}

$celDom = $M50 / $H * 60
$skalaDom = Skaluj 'dom' (Uklad-Mieszkania 50) $celDom
$celBiuro = 120  # kb.pl: biuro do 100 m² – do 2 godzin
$skalaBiuro = Skaluj 'biuro' (Uklad-Biura 100) $celBiuro

$normaPom = @{}
$zestawyOut = [ordered]@{}
foreach ($z in $pomieszczeniaDef.Keys) {
  $skala = $skalaDom
  if ($z -eq 'biuro') { $skala = $skalaBiuro }
  $zestawyOut[$z] = @(foreach ($p in $pomieszczeniaDef[$z]) {
    $normaPom[$p.id] = Rnd ($p.waga * $skala)
    [ordered]@{ id = $p.id; nazwa = $p.nazwa; min_m2 = $normaPom[$p.id] }
  })
}

function Usluga([string]$id) { $ceny.uslugi | Where-Object id -eq $id }

# Brud: dodatkowe min/m² dla poziomów 1–3. Kurz na poziomie 1 jest już w normie pomieszczenia.
$brudDef = [ordered]@{
  kurz = [ordered]@{ nazwa = 'Kurz'; chemia = 'uniwersalny'; min_m2 = @(0, 0.9, 1.9) }
  siersc = [ordered]@{ nazwa = 'Sierść zwierząt'; chemia = 'uniwersalny'; min_m2 = @(0.5, 1.2, 2.5) }
  tluszcz = [ordered]@{ nazwa = 'Tłuszcz'; chemia = 'zasadowy'; min_m2 = @(1.5, 4.0, 8.0) }
  kamien = [ordered]@{ nazwa = 'Kamień i osad wapienny'; chemia = 'kwasowy'; min_m2 = @(2.0, 5.0, 10.0) }
  plesn = [ordered]@{ nazwa = 'Pleśń'; chemia = 'chlorowy lub grzybobójczy'; min_m2 = @(2.0, 5.0, 10.0) }
  pyl_budowlany = [ordered]@{ nazwa = 'Pył budowlany'; chemia = 'poremontowy'; min_m2 = $null }
}

# Pył budowlany (poziom 2) kalibrowany tak, żeby 50 m² po remoncie = mediana zł/m² × 50.
$mnozRem = [double](Usluga 'mieszkanie_po_remoncie').mnoznik_zakresu
$baza50 = 0.0
foreach ($p in (Uklad-Mieszkania 50)) { $baza50 += $p.m2 * $normaPom[$p.typ] }
$celRem = $REM * 50 / $H * 60
$pyl2 = ($celRem - $F - $mnozRem * $baza50) / 50
$brudDef.pyl_budowlany.min_m2 = @((Rnd ($pyl2 * 0.5) 1), (Rnd $pyl2 1), (Rnd ($pyl2 * 1.8) 1))

$normaBrud = @{}
foreach ($b in $brudDef.Keys) { $normaBrud[$b] = $brudDef[$b].min_m2 }

# Czas pozycji: min na sztukę albo wydajność m²/h (szacunki, do weryfikacji w praktyce).
$czasPozycji = [ordered]@{
  'okna.okno_1' = 15; 'okna.okno_2' = 22; 'okna.okno_balkonowe' = 25
  'agd.piekarnik' = 45; 'agd.lodowka' = 30; 'agd.mikrofalowka' = 10; 'agd.okap' = 25; 'agd.zmywarka' = 20; 'agd.szafka' = 5; 'agd.balkon' = 35
  'tapicerka.kanapa_3' = 60; 'tapicerka.kanapa_2' = 45; 'tapicerka.naroznik' = 75; 'tapicerka.fotel' = 25
}
$wydajnosc = [ordered]@{
  'dywany.dywan' = 10; 'dywany.wykladzina' = 15
  'mycie_posadzek.mycie_maszynowe' = 300; 'mycie_posadzek.mycie_plytek' = 60
  'doczyszczanie.doczyszczanie_posadzki' = 30; 'doczyszczanie.doczyszczanie_fug' = 12; 'doczyszczanie.usuwanie_powlok' = 25
  'doczyszczanie.zabezpieczenie' = 40; 'doczyszczanie.usuwanie_farby' = 15
  'mycie_kostki.mycie' = 15; 'mycie_kostki.mech' = 15; 'mycie_kostki.olej' = 30; 'mycie_kostki.impregnacja' = 30; 'mycie_kostki.impregnacja_mokra' = 25
  'mycie_elewacji.atmosferyczne' = 15; 'mycie_elewacji.biologiczne' = 10; 'mycie_elewacji.chemiczne' = 8
  'sprzatanie_firm.zamiatanie' = 1000; 'sprzatanie_firm.odkurzanie' = 150; 'sprzatanie_firm.utrzymanie' = 300; 'sprzatanie_firm.jednorazowe' = 30
}

$pozycjeOut = [ordered]@{}
$wszystkiePozycje = @(foreach ($u in $ceny.uslugi) { foreach ($p in @($u.pozycje)) { if ($p) { [pscustomobject]@{ klucz = "$($u.id).$($p.id)"; usluga = $u; poz = $p } } } })
foreach ($x in $wszystkiePozycje) {
  if ($czasPozycji.Contains($x.klucz)) {
    $pozycjeOut[$x.klucz] = [ordered]@{ min_na_jednostke = $czasPozycji[$x.klucz] }
  } elseif ($wydajnosc.Contains($x.klucz)) {
    $pozycjeOut[$x.klucz] = [ordered]@{ wydajnosc_m2_h = $wydajnosc[$x.klucz]; min_na_jednostke = Rnd (60 / $wydajnosc[$x.klucz]) 3 }
  } else { throw "Brak normy czasu dla pozycji $($x.klucz)" }
}
foreach ($k in @($czasPozycji.Keys) + @($wydajnosc.Keys)) {
  if (-not $pozycjeOut.Contains($k)) { throw "Norma czasu dla nieistniejącej pozycji: $k" }
}
foreach ($u in $ceny.uslugi) {
  if ($u.tryb -eq 'pozycje' -and -not $u.tylko_dodatek -and -not $przygotowanieUslug.Contains($u.id)) { throw "Brak czasu przygotowania dla usługi $($u.id)" }
}

$normy = [ordered]@{
  meta = [ordered]@{
    wersja = $dzis
    opis = 'Plik generowany przez scripts/kalibracja.ps1 – nie edytować ręcznie. Normy czasu pracy jednej osoby.'
    wzor = 'czas [min] = przygotowanie_min + Σ pomieszczenia: m² × (min_m2 pomieszczenia × mnożnik zakresu usługi × mnożnik z progi_wydajnosci + Σ brud: min_m2[poziom − 1])'
    wzor_pozycji = 'czas [min] = przygotowanie_min_uslug[usługa] + Σ pozycje: ilość × min_na_jednostke × mnożnik poziomu brudu (jeśli usługa go ma)'
    cena = 'cena = czas / 60 × stawka_h województwa (data/rynek.json); usługi w trybie pozycji mają cenę z data/ceny.json, a czas służy do kosztu firmy'
    kalibracja = [ordered]@{
      stawka_h_kraj = $H
      mieszkanie_50m2_kraj = $M50
      cel_min_50m2 = Rnd $celDom 1
      skala_dom = Rnd $skalaDom 4
      po_remoncie_m2_kraj = $REM
      cel_min_po_remoncie_50m2 = Rnd $celRem 1
      cel_min_biuro_100m2 = $celBiuro
      skala_biuro = Rnd $skalaBiuro 4
      uklad_mieszkania = 'kuchnia 16% (6–14 m²), przedpokój 12%, łazienka 4 m² (do 60 m²), 5 m² (do 100 m²) lub 8 + 5 m², reszta pokoje'
      uklad_biura_100m2 = 'biuro 60, sala 15, kuchnia socjalna 6, toalety 5, korytarz 14 m²'
      raport = 'research/KALIBRACJA.md'
    }
    pewnosc = 'Normy pomieszczeń: skalibrowane do median rynkowych. Normy brudu (poza pyłem budowlanym), czasy pozycji i wydajności: szacunki do sprawdzenia na pierwszych zleceniach.'
  }
  przygotowanie_min = $F
  przygotowanie_min_uslug = $przygotowanieUslug
  zestawy_pomieszczen = $zestawyOut
  progi_wydajnosci = [ordered]@{ biuro = $progiBiura }
  uklady = $uklady
  brud = @(foreach ($b in $brudDef.Keys) { [ordered]@{ id = $b; nazwa = $brudDef[$b].nazwa; chemia = $brudDef[$b].chemia; min_m2 = $brudDef[$b].min_m2 } })
  poziomy = @(
    [ordered]@{ poziom = 1; nazwa = 'lekkie'; opis = 'typowe, codzienne zabrudzenie' }
    [ordered]@{ poziom = 2; nazwa = 'średnie'; opis = 'wyraźne, zaniedbane kilka tygodni' }
    [ordered]@{ poziom = 3; nazwa = 'silne'; opis = 'zaschnięte, wymaga kilku przejść' }
  )
  pozycje = $pozycjeOut
}
Save-Text 'data\normy.json' ((To-Json $normy) + "`n")

# ---------- 3. model referencyjny i raport ----------

function Minuty($uklad, [double]$mnoznik) {
  $m = $F
  foreach ($p in $uklad) {
    $m += $p.m2 * $normaPom[$p.typ] * $mnoznik
    foreach ($b in @($p.brud)) { if ($b) { $m += $p.m2 * $normaBrud[$b.id][$b.poziom - 1] } }
  }
  $m
}

function Z-Brudem($uklad, $reguly) {
  , @(foreach ($p in $uklad) {
    $b = @(foreach ($r in @($reguly)) { if ($r -and ($r.pomieszczenie -eq '*' -or $r.pomieszczenie -eq $p.typ)) { @{ id = $r.brud; poziom = [int]$r.poziom } } })
    @{ typ = $p.typ; m2 = $p.m2; brud = $b }
  })
}

function Minuty-Uslugi([string]$id, [double]$m2) {
  $u = Usluga $id
  Minuty (Z-Brudem (Uklad-Mieszkania $m2) $u.brud_domyslny) ([double]$u.mnoznik_zakresu)
}

function Prog([string]$nazwa, [double]$m2) {
  $mn = 1.0
  foreach ($p in $ceny.progi_metrazu.$nazwa.progi) { if ($m2 -ge [double]$p.od_m2) { $mn = [double]$p.mnoznik } }
  $mn
}

# Koszt chemii na jednostkę pozycji: z ceny.json albo (gdy brak) stawka chemii za godzinę × czas.
function Chemia-Jednostki($p, [double]$godzNaJednostke) {
  if ($null -ne $p.koszt_chemii_m2) { return [double]$p.koszt_chemii_m2 }
  if ($null -ne $p.koszt_chemii_szt) { return [double]$p.koszt_chemii_szt }
  $godzNaJednostke * $chemiaH
}

# Materiał doliczany klientowi (np. impregnat) – rynek podaje cenę samej robocizny.
function Material($p) {
  if ($p.doliczaj_material) { return [double]$p.koszt_chemii_m2 }
  0.0
}

$koszty = $ceny.koszty_firmy
$kosztH = [double]$koszty.praca.koszt_h
$chemiaH = [double]$koszty.chemia_h.wartosc

# Scenariusze referencyjne dla testu parytetu silnika JS (research/kalibracja-scenariusze.json), w pełnej precyzji.
$scenPomieszczenia = New-Object System.Collections.Generic.List[object]
$scenPozycje = New-Object System.Collections.Generic.List[object]

# Usługa w trybie pomieszczeń przy typowym układzie: czas i cena bez minimum ($woj = $null: stawka krajowa).
function Scenariusz-Pomieszczen([string]$opis, [string]$id, $wariant, [double]$m2, $woj) {
  $u = Usluga $id
  $stawka = [double]$H
  if ($woj) { $stawka = [double]($wojewodztwa | Where-Object { $_.id -eq $woj }).stawka_h }
  $wizyt = $null
  if ($u.zestaw_pomieszczen -eq 'biuro') {
    $war = $u.warianty | Where-Object id -eq $wariant
    if (-not $war) { throw "Brak wariantu $wariant usługi $id" }
    $uklad = Uklad-Biura $m2
    $min = Minuty $uklad ([double]$war.mnoznik_zakresu * (Skala-Biura $m2))
    $wizyt = [double]$war.wizyt_w_miesiacu
  } else {
    $uklad = Uklad-Mieszkania $m2
    $min = Minuty-Uslugi $id $m2
  }
  $s = [ordered]@{
    opis = $opis; usluga = $id; wariant = $wariant; m2 = $m2; wojewodztwo = $woj; stawka_h = $stawka
    uklad = @(foreach ($p in $uklad) { [ordered]@{ typ = $p.typ; m2 = [double]$p.m2 } })
    minuty = $min; cena = $min / 60 * $stawka; wizyt_w_miesiacu = $wizyt
  }
  $scenPomieszczenia.Add($s)
  $s
}

# Zlecenie wzorcowe w trybie pozycji (pierwsza pozycja usługi) przy tempie 1: cena z minimum, progiem metrażu i materiałem,
# czas z przygotowaniem, koszt chemii i sprzętu z czasu normowego.
function Zlecenie-Wzorcowe([string]$uid, [double]$ilosc) {
  $u = Usluga $uid
  $p = @($u.pozycje)[0]
  $n = $pozycjeOut["$uid.$($p.id)"]
  $mnProg = 1.0
  if ($u.progi -and $p.jednostka -eq 'm2') { $mnProg = Prog $u.progi $ilosc }
  $minPracy = $ilosc * [double]$n.min_na_jednostke
  $sprzetH = 0.0
  if ($p.sprzet) { $sprzetH = [double]$koszty.sprzet.($p.sprzet).koszt_h }
  $s = [ordered]@{
    usluga = $uid; pozycja = $p.id; ilosc = $ilosc; prog = $mnProg; material = (Material $p)
    cena = [math]::Max([double]$u.minimum_zl, $ilosc * ([double]$p.cena * $mnProg + (Material $p)))
    minuty_pracy = $minPracy; minuty = $przygotowanieUslug[$uid] + $minPracy
    chemia = $ilosc * (Chemia-Jednostki $p ([double]$n.min_na_jednostke / 60))
    sprzet = $minPracy / 60 * $sprzetH
  }
  $scenPozycje.Add($s)
  $s
}

$L = New-Object System.Collections.Generic.List[string]
function L([string]$s = '') { $L.Add($s) }

L '# Kalibracja norm i cen'
L ''
L "Raport generowany przez ``scripts/kalibracja.ps1`` ($dzis). Wejście: ``research/cenniki_firm.csv``, ``research/kb_wojewodztwa.csv``, ``data/ceny.json``. Wyjście: ``data/rynek.json``, ``data/normy.json``."
L ''
L '## 1. Punkty odniesienia (mediany krajowe ze skanu firm)'
L ''
L '| Pozycja | Mediana | Średnia | n | Zakres |'
L '|---|---|---|---|---|'
$etykiety = @{ stawka_h = 'Stawka godzinowa (zł/h)'; mieszkanie_50m2 = 'Mieszkanie 50 m², standard (zł)'; po_remoncie_m2 = 'Po remoncie (zł/m²)'; okno_1skrz = 'Okno 1-skrzydłowe (zł)'; kanapa_3os = 'Kanapa 3-os. (zł)'; dywan_m2 = 'Dywan (zł/m²)' }
foreach ($k in $kolumny.Keys) {
  $x = $kraj[$k]
  L ("| {0} | {1} | {2} | {3} | {4}–{5} |" -f $etykiety[$k], (Dz $x.mediana), (Dz $x.srednia), $x.n, (Dz $x.zakres[0]), (Dz $x.zakres[1]))
}
L ''
L "Pominięte wartości ($($wykluczenia.Count)):"
foreach ($w in $wykluczenia) { L "- $($w.firma), ``$($w.kolumna)``: $($w.powod)" }
L ''
L "Kontrola: kb.pl podaje dla sprzątania po remoncie średnio 64,30 zł/h brutto, a mediana skanu to $(Dz $H) zł/h."
L ''

L '## 2. Kalibracja norm pomieszczeń'
L ''
L "Cel: mieszkanie 50 m² (standard) = $(Zl $M50) zł przy $(Dz $H) zł/h, czyli $(Dz $celDom 1) min pracy. Przygotowanie i odbiór zlecenia to stałe $F min, reszta jest rozłożona na pomieszczenia według wag (pokój 2,5 : kuchnia 6,5 : łazienka 11)."
L ''
L '| Pomieszczenie | Norma (min/m²) |'
L '|---|---|'
foreach ($z in $zestawyOut.Keys) { foreach ($p in $zestawyOut[$z]) { L "| $($p.nazwa) ($z) | $(Dz $p.min_m2) |" } }
L ''
L "Pył budowlany (poziom 2) skalibrowany do mediany po remoncie $(Dz $REM) zł/m²: **$(Dz $brudDef.pyl_budowlany.min_m2[1] 1) min/m²**."
L ''
L '| Usługa, 50 m² | Czas | Cena modelu | Cel | Odchylenie |'
L '|---|---|---|---|---|'
$cele = [ordered]@{
  mieszkanie_standard = @($M50, 'mediana skanu')
  mieszkanie_gruntowne = @(($M50 * 1.5), '1,5 × standard (mediana z 3 cenników: 1,56)')
  mieszkanie_po_remoncie = @(($REM * 50), "mediana $(Dz $REM) zł/m² × 50")
  mieszkanie_po_wynajmie = @($null, 'brak danych – założenie')
}
foreach ($id in $cele.Keys) {
  $sc = Scenariusz-Pomieszczen "sekcja 2: $id, 50 m², stawka krajowa" $id $null 50 $null
  $m = $sc.minuty
  $cena = $sc.cena
  $cel = $cele[$id][0]
  if ($null -ne $cel) { $c = "$(Zl $cel) zł ($($cele[$id][1]))"; $o = Odch $cena $cel } else { $c = $cele[$id][1]; $o = "$(Dz ($cena / ($M50)) 2) × standard" }
  L "| $((Usluga $id).nazwa) | $(Dz ($m / 60) 1) h | $(Zl $cena) zł | $c | $o |"
}
L ''
$kurz3 = 50 * $normaBrud.kurz[2] / $celDom
L "Kontrola brudu: kurz na poziomie 3 w całym mieszkaniu 50 m² wydłuża pracę o $(Zl ($kurz3 * 100))% (rynek: silne zabrudzenie +30–50%)."
L ''

L '## 3. Walidacja: zależność ceny od metrażu'
L ''
$kbMid = @{}
foreach ($s in 'dom_do40', 'dom_40_100', 'dom_100_200') {
  $kbMid[$s] = ($kbRows | ForEach-Object { ((Num $_."$($s)_min") + (Num $_."$($s)_max")) / 2 } | Measure-Object -Average).Average
}
$p35 = (Scenariusz-Pomieszczen 'sekcja 3: mieszkanie_standard, 35 m², stawka krajowa' 'mieszkanie_standard' $null 35 $null).cena
$p70 = (Scenariusz-Pomieszczen 'sekcja 3: mieszkanie_standard, 70 m², stawka krajowa' 'mieszkanie_standard' $null 70 $null).cena
$p150 = (Scenariusz-Pomieszczen 'sekcja 3: mieszkanie_standard, 150 m², stawka krajowa' 'mieszkanie_standard' $null 150 $null).cena
L '| Porównanie | Rynek | Model | Różnica |'
L '|---|---|---|---|'
L "| kb.pl: cena 40–100 m² / do 40 m² (model: 70 / 35 m²) | $(Dz ($kbMid.dom_40_100 / $kbMid.dom_do40)) | $(Dz ($p70 / $p35)) | $(Odch ($p70 / $p35) ($kbMid.dom_40_100 / $kbMid.dom_do40)) |"
L "| kb.pl: cena 100–200 m² / do 40 m² (model: 150 / 35 m²) | $(Dz ($kbMid.dom_100_200 / $kbMid.dom_do40)) | $(Dz ($p150 / $p35)) | $(Odch ($p150 / $p35) ($kbMid.dom_100_200 / $kbMid.dom_do40)) |"
L "| kb.pl: do 40 m², średnia krajowa (model: 35 m²) | $(Zl $kbMid.dom_do40) zł | $(Zl $p35) zł | $(Odch $p35 $kbMid.dom_do40) |"
L ''
L 'Cenniki firm z progami metrażu. Poziom cen zależy od firmy, dlatego ważniejszy jest kształt: ile razy cena rośnie względem najmniejszego progu tej samej firmy.'
L ''
L '| Firma, próg (model: metraż, stawka województwa) | Cena firmy | Model | Różnica poziomu | Firma: × najmniejszy próg | Model: × najmniejszy próg |'
L '|---|---|---|---|---|---|'
$firmyMetraz = @(
  @{ firma = 'Czyściutko (Prudnik)'; woj = 'opolskie'; m2 = 35; cena = 275; opis = 'do 40 m²: 250–300' }
  @{ firma = 'Czyściutko (Prudnik)'; woj = 'opolskie'; m2 = 55; cena = 375; opis = '41–70 m²: 300–450' }
  @{ firma = 'Czyściutko (Prudnik)'; woj = 'opolskie'; m2 = 85; cena = 575; opis = '71–100 m²: 450–700' }
  @{ firma = 'Kwik Czystości (Lublin)'; woj = 'lubelskie'; m2 = 30; cena = 250; opis = '30 m²: 250' }
  @{ firma = 'Kwik Czystości (Lublin)'; woj = 'lubelskie'; m2 = 62; cena = 500; opis = '51–74 m²: 500' }
  @{ firma = 'Kwik Czystości (Lublin)'; woj = 'lubelskie'; m2 = 86; cena = 600; opis = '75–98 m²: 600' }
  @{ firma = 'DoMi (Lublin)'; woj = 'lubelskie'; m2 = 60; cena = 325; opis = '50–70 m²: 325' }
)
$pierwszy = @{}
foreach ($fm in $firmyMetraz) {
  $sc = Scenariusz-Pomieszczen "sekcja 3: $($fm.firma), $($fm.opis), mieszkanie_standard $($fm.m2) m²" 'mieszkanie_standard' $null $fm.m2 $fm.woj
  $sw = $sc.stawka_h
  $pm = $sc.cena
  if (-not $pierwszy.ContainsKey($fm.firma)) { $pierwszy[$fm.firma] = @{ cena = $fm.cena; model = $pm } }
  $kFirma = $fm.cena / $pierwszy[$fm.firma].cena
  $kModel = $pm / $pierwszy[$fm.firma].model
  L "| $($fm.firma), $($fm.opis) (model: $($fm.m2) m², $(Dz $sw) zł/h) | $(Zl $fm.cena) zł | $(Zl $pm) zł | $(Odch $pm $fm.cena) | $(Dz $kFirma) | $(Dz $kModel) |"
}
L ''

L '## 4. Walidacja: biura'
L ''
L '| Scenariusz | Model | Rynek | Uwagi |'
L '|---|---|---|---|'
$biura = Usluga 'sprzatanie_biur'
foreach ($wid in 'jednorazowe', 'abonament_1', 'abonament_3') {
  $war = $biura.warianty | Where-Object id -eq $wid
  foreach ($m2 in 100, 1000) {
    if ($wid -eq 'jednorazowe' -and $m2 -eq 1000) { continue }
    $sc = Scenariusz-Pomieszczen "sekcja 4: sprzatanie_biur, $wid, $m2 m², stawka krajowa" 'sprzatanie_biur' $wid $m2 $null
    $min = $sc.minuty
    $wiz = $sc.wizyt_w_miesiacu
    $mies = $sc.cena * $wiz
    if ($wid -eq 'jednorazowe') {
      L ("| $($war.nazwa), $m2 m² | $(Zl $mies) zł netto ($(Dz ($min / 60) 1) h) | 366–418 zł brutto (kb.pl) | " + 'kb.pl podaje „do 2 h”, ale ta cena to ok. 190 zł/h – niespójne z jego stawką po remoncie (64 zł/h) |')
    } elseif ($wid -eq 'abonament_1') {
      L "| $($war.nazwa), $m2 m² | $(Dz ($mies / $m2)) zł/m²/mies. netto | 4,50–7,00 zł/m²/mies. brutto (CleanConnect) | $(Zl $mies) zł/mies. |"
    } elseif ($m2 -lt 300) {
      L "| $($war.nazwa), $m2 m² | $(Dz ($mies / $m2)) zł/m²/mies. netto | 2,80–4,50 zł/m²/mies. brutto (CleanConnect) | $(Zl $mies) zł/mies.; przy 13 wizytach 4,50 zł/m² dawałoby 35 zł za wizytę w biurze 100 m² – poniżej kosztu pracy, więc widełki CleanConnect dotyczą raczej dużych biur |"
    } else {
      L "| $($war.nazwa), $m2 m² | $(Dz ($mies / $m2)) zł/m²/mies. netto | 2,80–4,50 zł/m²/mies. brutto (CleanConnect) | $(Zl $mies) zł/mies.; mnożnik wydajności dużego biura $(Dz (Skala-Biura $m2)) – model nadal powyżej rynku, do weryfikacji |"
    }
  }
}
L ''

L '## 5. Województwa'
L ''
L "wsp = (n × indeks skanu + $wagaKb × indeks kb.pl) / (n + $wagaKb). Stawka = $(Dz $H) zł/h × wsp."
L ''
L '| Województwo | wsp | Skan (n) | kb.pl | Stawka zł/h | Model 50 m² | Skan 50 m² (n) | GUS sekcja N zł/h |'
L '|---|---|---|---|---|---|---|---|'
foreach ($w in $wojewodztwa) {
  $cena50 = (Scenariusz-Pomieszczen "sekcja 5: mieszkanie_standard, 50 m², $($w.nazwa)" 'mieszkanie_standard' $null 50 $w.id).cena
  $skan = '–'
  if ($w.rynek.Contains('mieszkanie_50m2')) { $skan = "$(Zl $w.rynek.mieszkanie_50m2.mediana) ($($w.rynek.mieszkanie_50m2.n))" }
  $own = '–'
  if ($w.wsp_skladniki.firm_w_skanie -gt 0) { $own = "$(Dz $w.wsp_skladniki.skan_firm) ($($w.wsp_skladniki.firm_w_skanie))" }
  L "| $($w.nazwa) | $(Dz $w.wsp) | $own | $(Dz $w.wsp_skladniki.kb_pl) | $(Dz $w.stawka_h) | $(Zl $cena50) zł | $skan | $(Dz $w.placa_gus_h_2024) |"
}
L ''

L '## 6. Spójność katalogu cen ze skanem'
L ''
$spojnosc = @(
  @{ poz = 'okna.okno_1'; k = 'okno_1skrz' }, @{ poz = 'tapicerka.kanapa_3'; k = 'kanapa_3os' }, @{ poz = 'dywany.dywan'; k = 'dywan_m2' }
)
$bledy = 0
foreach ($s in $spojnosc) {
  $x = $wszystkiePozycje | Where-Object klucz -eq $s.poz
  $ok = [math]::Abs([double]$x.poz.cena - $kraj[$s.k].mediana) -lt 0.01
  if (-not $ok) { $bledy++ }
  $stan = 'zgodne'
  if (-not $ok) { $stan = '**NIEZGODNE**' }
  L "- ``$($s.poz)``: ceny.json $(Dz $x.poz.cena) zł, mediana skanu $(Dz $kraj[$s.k].mediana) zł – $stan"
}
L ''

L '## 7. Marże przy domyślnych kosztach'
L ''
L "Koszt pracy $(Dz $kosztH) zł/h (płaca minimalna 2026 + składki pracodawcy), chemia w usługach pomieszczeń $(Dz $chemiaH 0) zł/h, sprzęt wg ``koszty_firmy.sprzet``. Ceny krajowe bez VAT i bez dojazdu. Koszt nie obejmuje zakupu sprzętu, auta, reklamy ani podatków – to marża brutto na zleceniu. ⚠ oznacza marżę poniżej 20% albo powyżej 85% (do sprawdzenia: cena, czas albo koszt sprzętu)."
L ''
function Flaga([double]$m) { if ($m -lt 0.2 -or $m -gt 0.85) { return ' ⚠' } '' }
$wzorcowe = [ordered]@{
  okna = 8; tapicerka = 2; dywany = 20; mycie_posadzek = 300; doczyszczanie = 200
  mycie_kostki = 100; mycie_elewacji = 150; sprzatanie_firm = 1000
}
L '### Zlecenia wzorcowe (z przygotowaniem, progiem metrażu i minimum zlecenia)'
L ''
L '| Zlecenie | Cena | Czas | Koszt | Marża |'
L '|---|---|---|---|---|'
foreach ($id in $cele.Keys) {
  $min = Minuty-Uslugi $id 50
  $cena = $min / 60 * $H
  $koszt = $min / 60 * ($kosztH + $chemiaH)
  $mar = 1 - $koszt / $cena
  L "| $((Usluga $id).nazwa), 50 m² | $(Zl $cena) zł | $(Dz ($min / 60) 1) h | $(Zl $koszt) zł | $(Zl ($mar * 100))%$(Flaga $mar) |"
}
foreach ($uid in $wzorcowe.Keys) {
  $u = Usluga $uid
  $p = @($u.pozycje)[0]
  $zw = Zlecenie-Wzorcowe $uid ([double]$wzorcowe[$uid])
  $koszt = $zw.minuty / 60 * $kosztH + $zw.sprzet + $zw.chemia
  $mar = 1 - $koszt / $zw.cena
  $jedn = 'szt.'
  if ($p.jednostka -eq 'm2') { $jedn = 'm²' }
  L "| $($u.nazwa): $($p.nazwa), $($zw.ilosc) $jedn | $(Zl $zw.cena) zł | $(Dz ($zw.minuty / 60) 1) h | $(Zl $koszt) zł | $(Zl ($mar * 100))%$(Flaga $mar) |"
}
L ''
L '### Pozycje na jednostkę (bez przygotowania zlecenia)'
L ''
L '| Usługa / pozycja | Cena | Czas | Koszt | Marża |'
L '|---|---|---|---|---|'
foreach ($x in $wszystkiePozycje) {
  $p = $x.poz
  $n = $pozycjeOut[$x.klucz]
  $godz = [double]$n.min_na_jednostke / 60
  $sprzetH = 0.0
  if ($p.sprzet) { $sprzetH = [double]$koszty.sprzet.($p.sprzet).koszt_h }
  $cena = [double]$p.cena + (Material $p)
  $koszt = $godz * ($kosztH + $sprzetH) + (Chemia-Jednostki $p $godz)
  $mar = 1 - $koszt / $cena
  $jedn = 'szt.'
  if ($p.jednostka -eq 'm2') { $jedn = 'm²' }
  $uw = ''
  if ($p.doliczaj_material) { $uw = " (z materiałem $(Dz (Material $p)) zł)" }
  L "| $($x.usluga.nazwa): $($p.nazwa)$uw | $(Dz $cena) zł/$jedn | $(Dz $n.min_na_jednostke 1) min/$jedn | $(Dz $koszt) zł | $(Zl ($mar * 100))%$(Flaga $mar) |"
}
L ''

Save-Text 'research\KALIBRACJA.md' (($L -join "`n") + "`n")

$scenariusze = [ordered]@{
  meta = [ordered]@{
    wersja = $dzis
    opis = 'Plik generowany przez scripts/kalibracja.ps1 – nie edytować ręcznie. Scenariusze z sekcji 2–5 i 7 research/KALIBRACJA.md w pełnej precyzji; czyta je test parytetu silnika wyceny (src/silnik/parytet.test.js).'
    pomieszczenia = 'usługi w trybie pomieszczeń przy typowym układzie (data/normy.json, uklady): minuty z przygotowaniem i brudem domyślnym usługi (biura: mnożnik wariantu × progi_wydajnosci); cena = minuty / 60 × stawka_h, bez minimum zlecenia i dojazdu; wojewodztwo null = stawka krajowa; wizyt_w_miesiacu z wariantu biura, null dla mieszkań.'
    pozycje = 'zlecenia wzorcowe w trybie pozycji (pierwsza pozycja usługi), tempo 1, bez mnożnika poziomu brudu: cena = max(minimum_zl, ilosc × (cena pozycji × prog + material)); prog = mnożnik progu metrażu; material = materiał doliczany klientowi na jednostkę; minuty = przygotowanie usługi + minuty_pracy; chemia = koszt chemii zlecenia; sprzet = minuty_pracy / 60 × koszt_h sprzętu.'
  }
  stawka_kraj = $H
  # ToArray: w PS 5.1 @() na List[object] ze słownikami [ordered] rzuca ArgumentException.
  pomieszczenia = $scenPomieszczenia.ToArray()
  pozycje = $scenPozycje.ToArray()
}
Save-Text 'research\kalibracja-scenariusze.json' ((To-Json $scenariusze) + "`n")

Write-Host ("Mediany: stawka {0} zł/h, mieszkanie 50 m² {1} zł, po remoncie {2} zł/m²" -f $H, $M50, $REM)
Write-Host ("Skala norm: dom {0}, biuro {1}; pył budowlany poz. 2 = {2} min/m²" -f (Rnd $skalaDom 4), (Rnd $skalaBiuro 4), $brudDef.pyl_budowlany.min_m2[1])
Write-Host ("Zapisano data\rynek.json, data\normy.json, research\KALIBRACJA.md, research\kalibracja-scenariusze.json; niezgodności katalogu: {0}" -f $bledy)
