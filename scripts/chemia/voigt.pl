#!/usr/bin/perl
# Wyciąga dane produktu ze strony sklep.voigt.pl. Użycie: perl voigt.pl plik.html ... -> JSON na linię
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8';
my $js = JSON::PP->new->canonical;
sub num { my $x = shift // return undef; $x =~ s/&lt;.*//; $x =~ s/[^\d,]//g; $x =~ s/,/./; $x eq '' ? undef : $x + 0 }
for my $f (@ARGV) {
  open my $fh, '<:raw', $f or die "$f: $!"; local $/; my $h = <$fh>; close $fh; utf8::decode($h);
  my $i = index($h, 'productTile-link'); my $m = $i > 0 ? substr($h, 0, $i) : $h;
  my ($t) = $h =~ /<title>\s*([^<]*?)\s*-\s*Voigt Sklep/;
  # Na stronie jest kilka grup wariantów (produkt główny i polecane). Główna grupa to ta, której
  # pierwsza cena brutto i lista pojemności zgadzają się z tekstem przy nazwie produktu.
  my $tx = $h; $tx =~ s/<script.*?<\/script>//gs; $tx =~ s/<[^>]+>/ /g; $tx =~ s/&nbsp;/ /g; $tx =~ s/\s+/ /g;
  my ($cena, $poj) = $tx =~ /zobacz charakterystykę produktu ([\d ]+,\d{2}) zł Pojemność (.*?) (?:Dostępny|Niedostępny|Na zamówienie)/;
  my @grupy;
  for my $blok (split /shop-product-variant-options/, $h) {
    my @g;
    while ($blok =~ /<li class="btn-variant-option[^"]*"(.*?)>/gs) {
      my $a = $1; my %d; while ($a =~ /data-([a-z-]+)="([^"]*)"/g) { $d{$1} = $2 }
      push @g, { opak => $d{title}, netto => num($d{'price-net'}), brutto => num($d{'price-gross'}),
        promo_netto => num($d{'discount-price-net'}), promo_brutto => num($d{'discount-price-gross'}), ean => $d{code} };
    }
    push @grupy, \@g if @g;
  }
  my ($glowna) = grep { defined $cena && defined $poj && join(' ', map { $_->{opak} } @$_) eq $poj
    && abs(($_->[0]{promo_brutto} || $_->[0]{brutto}) - num($cena)) < 0.01 } @grupy;
  my @war = $glowna ? @$glowna : ();
  my ($kch) = $h =~ /href="([^"]*Karta_charakterystyki[^"]*\.pdf)"/i; $kch = "https:$kch" if $kch && $kch =~ /^\/\//;
  my $x = $m; $x =~ s/<script.*?<\/script>//gs; $x =~ s/<style.*?<\/style>//gs; $x =~ s/<[^>]+>/ /g;
  for ($x) { s/&oacute;/ó/g; s/&nbsp;/ /g; s/&amp;/&/g; s/&ndash;/–/g; s/\s+/ /g }
  my ($opis) = $x =~ /Produkt dostępny tylko dla firm (.*?)(?: Sposób użycia| Skład|$)/; $opis //= '';
  my ($uz) = $x =~ /Sposób użycia:? (.*?)(?: Skład| Pobierz| Karta| Zawiera|$)/; $uz //= '';
  print $js->encode({ plik => $f, nazwa => $t, warianty => \@war, kch => $kch, opis => substr($opis, 0, 400), uzycie => substr($uz, 0, 500) }), "\n";
}
