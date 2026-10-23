#!/usr/bin/perl
# Wyciąga dane produktu ze strony medisept.pl. Użycie: perl medisept.pl plik.html ... -> JSON na linię
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8';
my $js = JSON::PP->new->canonical;
for my $f (@ARGV) {
  open my $fh, '<:raw', $f or die "$f: $!"; local $/; my $h = <$fh>; close $fh; utf8::decode($h);
  my ($kch) = $h =~ /href="(https:\/\/medisept\.pl\/pobierz-atrybut\/[^"]*\/pdf\/karta-charakterystyki-pl[^"]*)"/;
  my $x = $h; $x =~ s/<script.*?<\/script>//gs; $x =~ s/<style.*?<\/style>//gs; $x =~ s/<[^>]+>/ /g;
  for ($x) { s/&lt;/</g; s/&gt;/>/g; s/&nbsp;/ /g; s/&amp;/&/g; s/\s+/ /g }
  my ($t) = $h =~ /<title>\s*([^|<]*?)\s*\|/;
  # Opis zaczyna się po zakładkach, kończy na specyfikacji (opakowanie, pH).
  my ($opis) = $x =~ /Zalety Sposób użycia Zastosowanie Specyfikacja Pliki do pobrania (.*?) Skład:/;
  my ($opak) = $x =~ /Opakowani[ea]: (.*?) pH/;
  my ($ph) = $x =~ /Opakowani[ea]: .*? pH:? ([\d,.]+(?:\s*[-–]\s*[\d,.]+)?)/;
  print $js->encode({ plik => $f, nazwa => $t, kch => $kch, opakowanie => $opak, ph => $ph, opis => substr($opis // '', 0, 1200) }), "\n";
}
