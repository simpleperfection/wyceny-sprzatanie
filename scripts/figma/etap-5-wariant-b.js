// Wariant B „kartka i długopis” w pliku Figmy etapu 5 (sDtiv6VdCbpyfM6Gfs7Xej).
// Uruchomienie: jako `code` narzędzia use_figma (górny poziom: await i return), po odnowieniu
// miesięcznego limitu Figmy. Jako wtyczka deweloperska w aplikacji Figma: całość owinąć w
// `(async () => { ... })().then(r => figma.closePlugin(JSON.stringify(r)))` i zamienić `return` na wynik funkcji.
// Skrypt można powtórzyć: istniejący tryb, zmienne i podmienione teksty pomija.
// Co robi:
//  1. dodaje do kolekcji kolorów tryb „Wariant B – kartka i długopis” (wersja 3 zostaje w pierwszym trybie)
//     i zmienne sukces/tlo, sukces/tekst; gdy plan nie pozwala na drugi tryb, archiwizuje wersję 3
//     w osobnej kolekcji i wpisuje wariant B do pierwszego trybu;
//  2. ustawia stronę „Makiety etapu 5” na tryb B;
//  3. przepina „pieniądze” (status Przyjęta, baner Sukces, skutek pytania, „w widełkach rynku”,
//     „Zostaje dla Ciebie”, „Realna stawka”) na kolory sukcesu, bo w wariancie B zieleń przestaje być kolorem akcji;
//  4. zmienia font z Plus Jakarta Sans na Source Sans 3 i zaokrąglenia (pigułki → 6–8 px, karty 16 → 10, przyciski 12 → 8);
//  5. podmienia przykładowe dane na realistyczne (klient z dzielnicą, firma jednoosobowa, numer oferty).

const hex = h => { h = h.replace('#',''); return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255 }; };
const col = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === 'Kolory v3' || c.name === 'Kolory aplikacji');
if (!col) throw new Error('Brak kolekcji kolorów');
const V = {}; for (const v of (await figma.variables.getLocalVariablesAsync('COLOR')).filter(v => v.variableCollectionId === col.id)) V[v.name] = v;
const m1 = col.modes[0].modeId;
for (const [name, h] of [['sukces/tlo','#e3f6ec'],['sukces/tekst','#137a4a']]) { if (!V[name]) { const v = figma.variables.createVariable(name, col, 'COLOR'); v.scopes = name.endsWith('tlo') ? ['FRAME_FILL','SHAPE_FILL'] : ['TEXT_FILL','SHAPE_FILL','STROKE_COLOR']; V[name] = v; } V[name].setValueForMode(m1, hex(h)); }
const B = {
  'tlo/strona':'#f4f1ea', 'tlo/karta':'#fffdf8', 'tlo/miekkie':'#ebe6dc',
  'marka/granat':'#26282c', 'marka/granat-jasny':'#aaa59b',
  'marka/zielen':'#2340a8', 'marka/zielen-ciemna':'#1a2f7d', 'marka/zielen-tlo':'#e6ebf8', 'marka/zielen-wykres':'#c9d3ef',
  'tekst/glowny':'#26282c', 'tekst/drugi':'#5f5b54', 'tekst/trzeci':'#948f86', 'tekst/na-ciemnym':'#fffdf8',
  'linia/podzial':'#e4ded3', 'linia/obrys':'#d3ccbf',
  'uwaga/tlo':'#fbefb6', 'uwaga/tekst':'#6e5300', 'info/tlo':'#e6ebf8', 'info/tekst':'#2340a8',
  'blad/tlo':'#f8e1dc', 'blad/tekst':'#a8321f', 'status/szkic-tekst':'#5f5b54', 'status/wykonana-tlo':'#e2ddd3',
  'sukces/tlo':'#e3efe2', 'sukces/tekst':'#2f6b3a'
};
const missing = Object.keys(V).filter(n => !B[n]); if (missing.length) throw new Error('Brak wartości wariantu B dla: ' + missing.join(', '));
let modeB = null, modeError = null, fallback = false;
const ex = col.modes.find(m => m.name.indexOf('Wariant B') === 0); if (ex) modeB = ex.modeId;
if (!modeB) { try { modeB = col.addMode('Wariant B – kartka i długopis'); } catch (e) { modeError = String(e && e.message ? e.message : e); } }
if (modeB) { for (const [n, h] of Object.entries(B)) V[n].setValueForMode(modeB, hex(h)); }
else {
  fallback = true;
  let arch = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === 'Kolory – wersja 3 (archiwum)');
  if (!arch) { arch = figma.variables.createVariableCollection('Kolory – wersja 3 (archiwum)'); for (const [n, v] of Object.entries(V)) { const a = figma.variables.createVariable(n, arch, 'COLOR'); a.scopes = []; a.setValueForMode(arch.modes[0].modeId, v.valuesByMode[m1]); } }
  for (const [n, h] of Object.entries(B)) V[n].setValueForMode(m1, hex(h));
}
col.name = 'Kolory aplikacji'; col.renameMode(m1, 'Wersja 3');

// Font
const fonts = await figma.listAvailableFontsAsync();
const family = ['Source Sans 3','Source Sans Pro','IBM Plex Sans'].find(n => fonts.some(f => f.fontName.family === n));
if (!family) throw new Error('Brak fontu zastępczego');
const styles = fonts.filter(f => f.fontName.family === family).map(f => f.fontName.style);
const norm = s => s.toLowerCase().replace(/[\s-]/g, '');
const want = { Regular:['regular'], Medium:['medium'], SemiBold:['semibold'], Bold:['bold'], ExtraBold:['extrabold','black','bold'] };
const SM = {}; for (const [k, alts] of Object.entries(want)) SM[k] = alts.map(a => styles.find(s => norm(s) === a)).find(Boolean) || styles.find(s => norm(s) === 'bold');
await Promise.all([...new Set(Object.values(SM))].map(s => figma.loadFontAsync({ family, style: s })));
await Promise.all(['Regular','Medium','SemiBold','Bold','ExtraBold'].map(s => figma.loadFontAsync({ family:'Plus Jakarta Sans', style:s })));

const bid = p => p && p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null;
const SUC = [['marka/zielen-tlo','sukces/tlo'],['marka/zielen-ciemna','sukces/tekst']];
function rebind(node) { for (const prop of ['fills','strokes']) { if (!(prop in node)) continue; const ps = node[prop]; if (!Array.isArray(ps)) continue; let ch = false; const out = ps.map(p => { const id = bid(p); for (const [from, to] of SUC) if (id === V[from].id) { ch = true; return figma.variables.setBoundVariableForPaint(p, 'color', V[to]); } return p; }); if (ch) node[prop] = out; } }
function rebindDeep(n) { if (!n) return; rebind(n); if ('children' in n) for (const c of n.children) if (c.type !== 'INSTANCE') rebindDeep(c); }
let refonted = 0, rounded = 0;
function radius(n) { if (!('cornerRadius' in n)) return; const r = n.cornerRadius;
  if (r === figma.mixed) { if (n.topLeftRadius === 20) { n.topLeftRadius = 14; n.topRightRadius = 14; rounded++; } return; }
  let nr = null; if (r === 999 && Math.abs(n.width - n.height) > 1) nr = n.height < 30 ? 6 : 8; else if (r === 16) nr = 10; else if (r === 12) nr = 8; else if (r === 20) nr = 14;
  if (nr !== null) { n.cornerRadius = nr; rounded++; } }
function walk(n) { if (n.type === 'TEXT') { const fn = n.fontName; if (fn !== figma.mixed && fn.family === 'Plus Jakarta Sans') { n.fontName = { family, style: SM[fn.style] || SM.Regular }; refonted++; } }
  radius(n); if ('children' in n) for (const c of n.children) if (c.type !== 'INSTANCE') walk(c); }

// Komponenty v3 (strona „Szkice etapu 5”)
for (const id of ['6:226','6:227','6:229','6:250','6:251','6:261','6:393']) walk(await figma.getNodeByIdAsync(id));
const stSet = await figma.getNodeByIdAsync('6:226'); rebindDeep(stSet.children.find(c => c.name === 'Status=Przyjęta'));

// Strona „Makiety etapu 5”
const page = await figma.getNodeByIdAsync('9:321'); await page.loadAsync();
let modeSetOn = null;
if (modeB) { try { page.setExplicitVariableModeForCollection(col, modeB); modeSetOn = 'strona'; } catch (e) { for (const s of page.children) if ('setExplicitVariableModeForCollection' in s) s.setExplicitVariableModeForCollection(col, modeB); modeSetOn = 'sekcje'; } }
const banSet = await figma.getNodeByIdAsync('9:399'); rebindDeep(banSet.children.find(c => c.name === 'Typ=Sukces'));
const qSet = await figma.getNodeByIdAsync('9:369'); const skV = qSet.children.find(c => c.name === 'Stan=Ustawia wycenę'); if (skV) rebindDeep(skV.findOne(n => n.name === 'Skutek'));
for (const n of page.findAll(n => n.type === 'FRAME' && ['w widełkach rynku','Zostaje dla Ciebie','Realna stawka'].includes(n.name))) rebindDeep(n);
walk(page);

// Przykładowe dane
// Data w nagłówku startu staje się tytułem, a podtytuł (12 px) nazwą firmy; warunek na rozmiar pozwala powtórzyć skrypt.
const EXACT = { 'Dzień dobry, Anna':'Sobota, 24 października', 'AK':'M', 'JN':'T', 'BX':'G', 'TF':'ML' };
for (const t of page.findAllWithCriteria({ types: ['TEXT'] })) if (t.characters === 'Sobota, 24 października' && t.fontSize === 12) { await figma.loadFontAsync(t.fontName); t.characters = 'Usługi Sprzątające Monika Lis'; }
const SUB = [
  ['Anna Kowalska · 294', 'Marzena, Bielany · 294'], ['Jan Nowak', 'Pan Tomek, Ursus'], ['Biuro XYZ', 'Gabinet na Żoliborzu'],
  ['#15 · Anna Kowalska', '15/10 · Marzena, Bielany'], ['#15', '15/10'], ['Wycena nr 15', 'Wycena nr 15/10/2026'],
  ['Anna Kowalska', 'Marzena Wróbel'], ['ul. Przykładowa 1, Warszawa', 'ul. Wrzeciono 10C/45, Warszawa'],
  ['Twoja Firma Sprzątająca', 'Usługi Sprzątające Monika Lis'], ['500 000 000', '600 123 456'], ['biuro@twojafirma.pl', 'kontakt@monikalis.pl'],
  ['Cena ostateczna po obejrzeniu lokalu lub zdjęć.', 'Dokładną cenę podam po obejrzeniu mieszkania albo zdjęć.']
];
let replaced = 0;
for (const t of page.findAllWithCriteria({ types: ['TEXT'] })) {
  const old = t.characters; if (old.indexOf('Wycena nr 15/10/2026') >= 0) continue;
  let nw = EXACT[old] !== undefined ? EXACT[old] : old;
  if (nw === old) for (const [a, b] of SUB) nw = nw.split(a).join(b);
  if (nw !== old && t.fontName !== figma.mixed) { await figma.loadFontAsync(t.fontName); t.characters = nw; replaced++; }
}
return { modeB, modeError, fallback, modeSetOn, family, styleMap: SM, refonted, rounded, replaced };
