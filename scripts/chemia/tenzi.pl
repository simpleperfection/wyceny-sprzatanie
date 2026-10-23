#!/usr/bin/perl
# Wyciąga dane produktu ze strony tenzi.pl (PrestaShop, atrybut data-product).
# Użycie: perl tenzi.pl plik.html [plik2.html ...]  -> jedna linia JSON na produkt
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8';
my $js = JSON::PP->new->utf8(0)->canonical;
for my $f (@ARGV) {
  open my $fh, '<:raw', $f or die "$f: $!"; local $/; my $h = <$fh>; close $fh;
  my ($attr) = $h =~ /data-product="([^"]*)"/ or do { warn "brak data-product: $f\n"; next };
  for ($attr) { s/&quot;/"/g; s/&lt;/</g; s/&gt;/>/g; s/&#039;/'/g; s/&amp;/&/g; }
  my $p = JSON::PP->new->utf8->decode($attr);
  my %feat; for my $x (@{ $p->{features} || [] }) { push @{ $feat{$x->{name}} }, $x->{value} }
  my @att = map { { id => $_->{id_attachment}, plik => $_->{file_name}, opis => $_->{description} } } @{ $p->{attachments} || [] };
  # najnowsza polska karta = najwyższy id_attachment (nazwy plików nie zawsze mają datę)
  my @kch = sort { $b->{id} <=> $a->{id} } grep { $_->{plik} =~ /^KCH .*PL/i } @att;
  my $short = $p->{description_short} // ''; $short =~ s/<[^>]+>/ /g; $short =~ s/\s+/ /g;
  my $desc = $p->{description} // ''; $desc =~ s/<[^>]+>/ /g; $desc =~ s/\s+/ /g;
  # cechy z tabeli na stronie (m.in. „Zalecane roztwory”)
  my %ch; while ($h =~ /features-ch-name">\s*(.*?)\s*<\/div>\s*<div class="features-ch-value">\s*(.*?)\s*<\/div>/gs) { my ($k, $v) = ($1, $2); utf8::decode($k); utf8::decode($v); $v =~ s/<[^>]+>/ /g; $ch{$k} = $v }
  my @dawki = grep { defined } ($ch{'Zalecane roztwory'});
  print $js->encode({
    plik => $f, nazwa => $p->{name}, ref => $p->{reference},
    brutto => $p->{price_amount}, netto => $p->{price_tax_exc}, vat => $p->{rate},
    rabat => $p->{has_discount} ? JSON::PP::true : JSON::PP::false,
    ph => $feat{'Odczyn (pH)'}, konsystencja => $feat{'Konsystencja'}, pojemnosc => $feat{'Pojemność (L)'},
    podkategoria => $feat{'Podkategoria'}, powierzchnia => $feat{'Rodzaj powierzchni'},
    kch => \@kch, krotki => substr($short, 0, 400), opis => substr($desc, 0, 600), dawki => [ @dawki[0 .. ($#dawki < 5 ? $#dawki : 5)] ],
  }), "\n";
}
