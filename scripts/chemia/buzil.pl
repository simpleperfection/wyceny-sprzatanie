#!/usr/bin/perl
# Wyciąga dane produktu ze strony buzil.pl. Użycie: perl buzil.pl plik.html ... -> JSON na linię
# Karty SDS nie mają stałego linku: pobiera się je formularzem POST na
# https://www.buzil.pl/produkty/sicDownloads/download z polami type=securitySheet, route i download
# (wartości sds_route i sds_pl z wyniku), np. curl -X POST --data "type=securitySheet&route=...&download=..." -o karta.pdf
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8';
my $js = JSON::PP->new->canonical;
# Piktogramy przy dozowaniu (nazwa pliku) -> sposób użycia.
my %pikto = (automatenreinigung => 'automat szorujący', hochdruckreinigen => 'myjka ciśnieniowa',
  nasswischen => 'mycie na mokro', tuchreinigung => 'ścierka', spruehen => 'spryskiwacz',
  schaumspruehen => 'spryskiwacz pianowy', schaumkanone => 'generator piany', wc => 'WC',
  reinigen => 'czyszczenie', grundreinigen => 'czyszczenie gruntowne', fensterreinigen => 'mycie okien',
  geraeteentkalkung => 'odkamienianie urządzeń', garnpadverfahren => 'pad (bonnet)',
  fleckenentfernung => 'usuwanie plam', spruehextrahieren => 'ekstrakcja', cleanern => 'polerowanie z rozpylaniem',
  beschichten => 'nakładanie powłoki');
sub tekst { my $x = shift // return undef; $x =~ s/<[^>]+>/ /g; $x =~ s/&nbsp;/ /g; $x =~ s/&amp;/&/g; $x =~ s/\s+/ /g; $x =~ s/^ | $//g; $x }
for my $f (@ARGV) {
  open my $fh, '<:raw', $f or die "$f: $!"; local $/; my $h = <$fh>; close $fh; utf8::decode($h);
  my ($t) = $h =~ /<h1[^>]*>(.*?)<\/h1>/s; $t = tekst($t);
  my ($route) = $h =~ /name="type" value="securitySheet"\/>\s*<input type="hidden" name="route" value="([^"]+)"/;
  my ($sds) = $h =~ /id="securitySheet".*?<option value="([0-9a-f]+)" data-locale="pl-PL"/s;
  my ($dz) = $h =~ /id="collapsedosageRecommendation"(.*?)id="headingproductHints"/s;
  my @doz;
  while (($dz // '') =~ /<ul class="accordion-list( dosage-image)?">(.*?)<\/ul>/gs) {
    my ($obraz, $li) = ($1, $2);
    if ($obraz) { my ($p) = $li =~ /buzil_pikto__([A-Za-zäöüÄÖÜß]+)/; my ($s) = $li =~ /<span>(.*?)<\/span>/s;
      next unless defined $p;
      push @doz, { sposob => $pikto{lc $p} // $p, dawka => tekst($s) } }
    else { push @doz, { uwaga => tekst($li) } }
  }
  my $x = $h; $x =~ s/<script.*?<\/script>//gs; $x =~ s/<style.*?<\/style>//gs; $x = tekst($x);
  my ($info) = $x =~ /Informacje o produkcie (.*?) Zastosowanie i dozowanie/;
  my @art = $x =~ /([A-Z]{1,2}\d{2,3}-\d{4}[A-Z]*): (1 x [\d,]+ (?:l|ml|kg)|\d+ x [\d,]+ (?:l|ml|kg))/g;
  my %opak = @art;
  print $js->encode({ plik => $f, nazwa => $t, info => $info, dozowanie => \@doz, opakowania => \%opak,
    sds_route => $route, sds_pl => $sds }), "\n";
}
