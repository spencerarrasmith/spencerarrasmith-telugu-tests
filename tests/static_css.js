const { SITE_DIR } = require('./config');
// Static checks: shared stylesheet wiring, no duplicate CSS left behind, no dead references.
const fs = require('fs'), dir = (SITE_DIR + '/');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const read = f => fs.readFileSync(dir + f, 'utf8');
const game = read('game.css'), base = read('base.css'), shell = read('shell.css'), home = read('home.css'), ref = read('reference.css');
const rules = css => { const m = new Map(); for (const r of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
  for (const sel of r[1].split(',').map(x => x.trim())) { const o = m.get(sel) || new Map(); r[2].split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) o.set(d.slice(0, i).trim(), d.slice(i + 1).trim().replace(/\s+/g, ' ')); }); m.set(sel, o); } } return m; };
const gameRules = rules(game), refRules = rules(ref);
const PAGES = ['alphabet/01_phonemes.html', 'alphabet/02_diacritics.html', 'alphabet/03_conjuncts.html', 'training/03_lookalikes.html', 'reference/01_rosetta.html', 'reference/02_signs-conjuncts.html', 'reference/03_sound-charts.html'];
const SCROLLING = ['reference/01_rosetta.html', 'reference/02_signs-conjuncts.html', 'reference/03_sound-charts.html'];     // reference pages: no ⋮ menu, bigger inline style
PAGES.forEach(f => {
  const s = read(f), inline = (s.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  ok(/<link rel="stylesheet" href="\.\.\/game\.css">/.test(s), f + ': links game.css');
  ok(!/fonts\.googleapis/.test(s), f + ': no per-page font link (fonts come from base.css)');
  ok(!/:root\s*\{/.test(inline) && !/\*,\s*\*::before/.test(inline), f + ': no tokens / reset in the page');
  const dup = []; rules(inline).forEach((props, sel) => props.forEach((v, p) => { const g = gameRules.get(sel); if (g && g.get(p) === v) dup.push(sel + '{' + p + ':' + v + '}'); }));
  ok(dup.length === 0, f + ': inline <style> repeats no declaration already in game.css' + (dup.length ? ' → ' + dup.join(' | ') : ''));
  const over = []; rules(inline).forEach((props, sel) => { if (gameRules.has(sel)) over.push(sel); });
  console.log('     (page-specific overrides of shared selectors: ' + (over.join(', ') || 'none') + ')');
  if (!SCROLLING.includes(f)) ok(inline.split('\n').length < 60, f + ': inline <style> is small (' + inline.split('\n').length + ' lines)');
  if (SCROLLING.includes(f)) {
    ok(/<link rel="stylesheet" href="\.\.\/game\.css">\s*<link rel="stylesheet" href="\.\.\/reference\.css">/.test(s), f + ': links reference.css after game.css');
    const rdup = []; rules(inline).forEach((props, sel) => props.forEach((v, p) => { const g = refRules.get(sel); if (g && g.get(p) === v) rdup.push(sel + '{' + p + ':' + v + '}'); }));
    ok(rdup.length === 0, f + ': inline <style> repeats no declaration already in reference.css' + (rdup.length ? ' → ' + rdup.join(' | ') : ''));
    ok(!/html,\s*body\s*\{/.test(inline) && !/\.jump\b/.test(inline) && !/\.g-header\b/.test(inline), f + ': the scrolling page, sticky header, and jump pills are not restyled in the page');
  }
  ok(!/cat-toggle|g-controls/.test(s), f + ': no leftover controls-bar / cat-toggle markup');
  if (!SCROLLING.includes(f)) ok(/<script src="\.\.\/game-menu\.js"><\/script>/.test(s) && /GameMenu\.init\(/.test(s), f + ': uses game-menu.js');
  ok(!/function setMenu|syncCategoryControl/.test(s), f + ': no private copy of the menu code');
  [...s.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js))"/g)].forEach(m => ok(fs.existsSync(require('path').resolve(dir, require('path').dirname(f), m[1])), f + ': ' + m[1] + ' exists'));
});
ok([game, shell, home].every(c => /@import url\('base\.css'\)/.test(c)), 'game.css, shell.css, and home.css all import base.css');
ok(!/@import/.test(ref) && ['html', 'body', '.g-header', '.wrap', '.hint', '.tools', '.jump a', '.tag', '.tag.flag'].every(sel => refRules.has(sel)), 'reference.css layers on game.css (no import of its own) and holds the shared reference rules');
// A sticky header stays in view only against the thing that scrolls. If <body> is given a scrollbar of its own it never uses, the header scrolls away.
ok(refRules.get('html').get('overflow') === 'auto' && refRules.get('body').get('overflow') === 'visible' && refRules.get('.g-header').get('position') === 'sticky', 'reference.css: the window scrolls, not <body>, so the sticky header can stay in view');
ok([game, shell, home, ref].every(c => !/:root\s*\{/.test(c)) && /:root\s*\{/.test(base), 'color tokens are defined once, in base.css');
// …and nowhere else: no page or stylesheet in the whole app defines a color token, a reset, or the core font link.
(() => { const path = require('path'); const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk(dir).filter(f => /\.(html|css)$/.test(f)).map(f => path.relative(dir, f)).filter(f => f !== 'base.css');
  const tok = files.filter(f => /--(bg|surface|surface-up|border|accent|accent-light|accent-glow|text|text-dim|text-muted|success|error)\s*:/.test(read(f)));
  ok(tok.length === 0, 'no file but base.css sets a color token (' + files.length + ' pages and stylesheets checked)' + (tok.length ? ' → ' + tok.join(', ') : ''));
  const reset = files.filter(f => /\*\s*,\s*\*::before/.test(read(f)));
  ok(reset.length === 0, 'no file but base.css repeats the reset' + (reset.length ? ' → ' + reset.join(', ') : ''));
  const fonts = files.filter(f => /fonts\.(googleapis|gstatic)|@font-face/.test(read(f)));
  ok(fonts.length === 0, 'no file but base.css declares a font, and none asks another site for one' + (fonts.length ? ' → ' + fonts.join(', ') : ''));
  const styled = walk(dir).filter(f => /\.html$/.test(f)).map(f => path.relative(dir, f)).filter(f => /<style/.test(read(f))).sort();
  ok(styled.join() === 'alphabet/02_diacritics.html,alphabet/03_conjuncts.html,alphabet/04_words.html,profile.html,reference/01_rosetta.html,reference/02_signs-conjuncts.html,reference/03_sound-charts.html,training/01_review.html,training/02_lookalike-builder.html,training/03_lookalikes.html', 'inline <style> only where a page has layout of its own (10 pages): ' + styled.length);
})();
ok(!/cat-toggle|g-controls/.test(game), 'game.css has no dead controls-bar rules');
// The fonts are files in this folder (fonts/), declared once in base.css; no other site is asked for them.
(() => {
  const faces = [...base.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(m => ({
    family: (/font-family:\s*'([^']+)'/.exec(m[1]) || [])[1], weight: (/font-weight:\s*(\d+(?: \d+)?)\s*;/.exec(m[1]) || [])[1],
    file: (/src:\s*url\('([^']+)'\)\s*format\('woff2'\)/.exec(m[1]) || [])[1] || '', swap: /font-display:\s*swap/.test(m[1]) }));
  ok(!/@import/.test(base) && !/https?:\/\//.test(base), 'base.css imports nothing and names no other site');
  ok(faces.map(f => f.family + ' ' + f.weight).join(' | ') === 'Inter 400 700 | Noto Sans 400 500 | Noto Sans Telugu 400 | Noto Sans Telugu 700 | Noto Serif Telugu 400 | Noto Serif Telugu 600 | Tiro Telugu 400',
    'base.css declares the five families at the weights the app uses: ' + faces.map(f => f.family + ' ' + f.weight).join(' | '));
  ok(faces.every(f => f.swap && /^fonts\/[a-z-]+-v\d+\.woff2$/.test(f.file) && fs.existsSync(dir + f.file)), 'every face is a .woff2 in fonts/ that exists, has a version in its name (browsers keep it for a year), and swaps in once loaded');
  const used = new Set(faces.map(f => f.file.slice('fonts/'.length))), have = fs.readdirSync(dir + 'fonts').sort();
  const stray = have.filter(n => /\.woff2$/.test(n) ? !used.has(n) : !/^OFL-[a-z-]+\.txt$/.test(n));
  ok(stray.length === 0, 'fonts/ holds only the font files base.css loads and their licenses' + (stray.length ? ' → ' + stray.join(', ') : ''));
  const unlicensed = [...used].filter(n => !have.includes('OFL-' + n.replace(/-v\d+\.woff2$/, '') + '.txt'));
  ok(unlicensed.length === 0, 'every font file has its license beside it (' + used.size + ' fonts)' + (unlicensed.length ? ' → ' + unlicensed.join(', ') : ''));
})();

// The Lookalike Builder is a scrolling tool page, not a game: it links the same shared sheet and keeps its own layout inline.
(() => { const f = 'training/02_lookalike-builder.html', s = read(f), inline = (s.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  ok(/<link rel="stylesheet" href="\.\.\/game\.css">/.test(s), f + ': links game.css');
  ok(!/:root\s*\{[^}]*--(bg|surface|border|accent):/.test(inline) && !/\*,\s*\*::before/.test(inline), f + ': no color tokens or reset of its own');
  const dup = []; rules(inline).forEach((props, sel) => props.forEach((v, p) => { const g = gameRules.get(sel); if (g && g.get(p) === v) dup.push(sel + '{' + p + ':' + v + '}'); }));
  ok(dup.length === 0, f + ': repeats no declaration already in game.css' + (dup.length ? ' → ' + dup.join(' | ') : ''));
  ok(rules(inline).get('html').get('overflow') === 'auto' && rules(inline).get('body').get('overflow') === 'visible', f + ': the window scrolls, not <body>, so its header and character bar can stay in view');
  [...s.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js))"/g)].forEach(m => ok(fs.existsSync(require('path').resolve(dir, require('path').dirname(f), m[1])), f + ': ' + m[1] + ' exists'));
})();
// every class a game page's markup/JS uses at least has a rule somewhere (game.css or its own style)
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
