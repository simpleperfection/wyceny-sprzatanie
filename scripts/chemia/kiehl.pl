#!/usr/bin/perl
# Wyciąga dane produktu ze strony kiehl-group.com/pl. Użycie: perl kiehl.pl plik.html ... -> JSON na linię
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8';
my $js = JSON::PP->new->canonical;
sub num { my $x = shift // return undef; $x =~ s/,/./; $x + 0 }
for my $f (@ARGV) {
  open my $fh, '<:raw', $f or die "$f: $!"; local $/; my $h = <$fh>; close $fh; utf8::decode($h);
  my ($kch) = $h =~ /href="([^"]*doc_Sicherheitsdatenblatt\/[^"]*_pl\.pdf)"/; $kch = "https://www.kiehl-group.com$kch" if $kch;
  my $x = $h; $x =~ s/<script.*?<\/script>//gs; $x =~ s/<style.*?<\/style>//gs; $x =~ s/<[^>]+>/ /g;
  for ($x) { s/&lt;/</g; s/&gt;/>/g; s/&nbsp;/ /g; s/&amp;/&/g; s/\s+/ /g }
  my ($t, $podtytul) = $h =~ /<h1>\s*([^<]*?)\s*<.*?>\s*([^<]*?)\s*</s;
  my ($obszar) = $x =~ /Obszar zastosowania (.*?) Tytuł dokumentu/;
  # Opakowania: numer artykułu, opis jednostki opakowania, liczba na palecie.
  my ($tab) = $x =~ /Ilość JO na palecie (.*?) (?:Akcesoria|Przed pierwszym|Mycie|Sposób|$)/;
  my @opak; while (($tab // '') =~ /(j\d{6}) (.*?) (\d+)(?= j\d{6}| |$)/g) { push @opak, { nr => $1, opis => $2 } }
  my ($uz) = $x =~ /(?:materiału na działanie produktu\.|na działanie produktu!?) (.*?) Skład/; $uz //= '';
  my ($phk) = $x =~ /pH \(koncentratu\)\s*:\s*(?:ok\.\s*)?([\d,]+(?:\s*[‒–-]\s*[\d,]+)?)/;
  my ($phr) = $x =~ /pH \(roztworu roboczego\)\s*:\s*(?:ok\.\s*)?([\d,]+(?:\s*[‒–-]\s*[\d,]+)?)/;
  my ($ph) = $x =~ /wartość pH\s*:\s*(?:ok\.\s*)?([\d,]+(?:\s*[‒–-]\s*[\d,]+)?)/;
  print $js->encode({ plik => $f, nazwa => $t, podtytul => $podtytul, kch => $kch, obszar => $obszar,
    opakowania => \@opak, ph_koncentrat => $phk // $ph, ph_roztwor => $phr, uzycie => substr($uz, 0, 700) }), "\n";
}
