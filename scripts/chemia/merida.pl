#!/usr/bin/perl
# Wyciąga dane produktu ze strony merida.com.pl. Użycie: perl merida.pl plik.html ... -> JSON na linię
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8';
my $js = JSON::PP->new->canonical;
for my $f (@ARGV) {
  open my $fh, '<:raw', $f or die "$f: $!"; local $/; my $h = <$fh>; close $fh; utf8::decode($h);
  my ($h1) = $h =~ /<h1[^>]*>\s*(.*?)\s*<\/h1>/s; $h1 //= ''; $h1 =~ s/<[^>]+>//g; $h1 =~ s/\s+/ /g;
  my @pdf = $h =~ /href="(https:\/\/static\.merida\.com\.pl\/uploads\/files\/[^"]+\.pdf)"/g;
  my %seen; @pdf = grep { !$seen{$_}++ } @pdf;
  my ($kch) = grep { /KCH|karta[_ ]charakter/i } @pdf; my ($kp) = grep { /Karta_produktu/i } @pdf;
  my $t = $h; $t =~ s/<script.*?<\/script>//gs; $t =~ s/<style.*?<\/style>//gs; $t =~ s/<[^>]+>/ /g; $t =~ s/&nbsp;/ /g; $t =~ s/\s+/ /g;
  my ($netto) = $t =~ /(\d+[\d ]*,\d{2}) zł(?! brutto)/; my ($brutto) = $t =~ /(\d+[\d ]*,\d{2}) zł brutto/;
  my ($param) = $t =~ /.*Parametry techniczne (.*?) Zobacz i pobierz/; $param //= '';
  my ($ph) = $param =~ /pH ([\d,.\- ]+)/; my ($doz) = $param =~ /dozowanie (.*?)(?: pojemność| pH|$)/;
  my ($poj) = $param =~ /pojemność ([\d,.]+ ?(?:l|ml|kg|g))/;
  my ($opis) = $h =~ /<meta name="description" content="([^"]*)"/;
  for ($netto, $brutto) { next unless defined; s/ //g; s/,/./ }
  print $js->encode({ plik => $f, nazwa => $h1, netto => $netto, brutto => $brutto, ph => $ph, dozowanie => $doz,
    pojemnosc => $poj, parametry => substr($param, 0, 300), kch => $kch, karta_produktu => $kp, opis => $opis }), "\n";
}
