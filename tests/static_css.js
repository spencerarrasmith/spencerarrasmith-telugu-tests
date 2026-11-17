const { SITE_DIR } = require('./config');
// Static checks: shared stylesheet wiring, no duplicate CSS left behind, no dead references.
const fs = require('fs'), dir = (SITE_DIR + '/');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const read = f => fs.readFileSync(dir + f, 'utf8');
const game = read('game.css'), base = read('base.css'), shell = read('shell.css');
const rules = css => { const m = new Map(); for (const r of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
  for (const sel of r[1].split(',').map(x => x.trim())) { const o = m.get(sel) || new Map(); r[2].split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) o.set(d.slice(0, i).trim(), d.slice(i + 1).trim().replace(/\s+/g, ' ')); }); m.set(sel, o); } } return m; };
const gameRules = rules(game);
const PAGES = ['alphabet/01_phonemes.html', 'alphabet/02_diacritics.html', 'alphabet/03_conjuncts.html', 'alphabet/05_lookalikes.html', 'reference/01_rosetta.html', 'reference/02_signs-conjuncts.html'];
const SCROLLING = ['reference/01_rosetta.html', 'reference/02_signs-conjuncts.html'];     // reference pages: no ⋮ menu, bigger inline style
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
  ok(!/cat-toggle|g-controls/.test(s), f + ': no leftover controls-bar / cat-toggle markup');
  if (!SCROLLING.includes(f)) ok(/<script src="\.\.\/game-menu\.js"><\/script>/.test(s) && /GameMenu\.init\(/.test(s), f + ': uses game-menu.js');
  ok(!/function setMenu|syncCategoryControl/.test(s), f + ': no private copy of the menu code');
  [...s.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js))"/g)].forEach(m => ok(fs.existsSync(require('path').resolve(dir, require('path').dirname(f), m[1])), f + ': ' + m[1] + ' exists'));
});
ok(/@import url\('base\.css'\)/.test(game) && /@import url\('base\.css'\)/.test(shell), 'game.css and shell.css both import base.css');
ok(!/:root\s*\{/.test(game) && !/:root\s*\{/.test(shell) && /:root\s*\{/.test(base), 'colour tokens are defined once, in base.css');
ok(!/cat-toggle|g-controls/.test(game), 'game.css has no dead controls-bar rules');
ok(/fonts\.googleapis/.test(base) && !/fonts\.googleapis/.test(shell) && !/fonts\.googleapis/.test(game), 'the font import lives only in base.css');

// The Lookalike Builder is a scrolling tool page, not a game: it links the same shared sheet and keeps its own layout inline.
(() => { const f = 'alphabet/04_lookalike-builder.html', s = read(f), inline = (s.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  ok(/<link rel="stylesheet" href="\.\.\/game\.css">/.test(s), f + ': links game.css');
  ok(!/:root\s*\{[^}]*--(bg|surface|border|accent):/.test(inline) && !/\*,\s*\*::before/.test(inline), f + ': no colour tokens or reset of its own');
  const dup = []; rules(inline).forEach((props, sel) => props.forEach((v, p) => { const g = gameRules.get(sel); if (g && g.get(p) === v) dup.push(sel + '{' + p + ':' + v + '}'); }));
  ok(dup.length === 0, f + ': repeats no declaration already in game.css' + (dup.length ? ' → ' + dup.join(' | ') : ''));
  [...s.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js))"/g)].forEach(m => ok(fs.existsSync(require('path').resolve(dir, require('path').dirname(f), m[1])), f + ': ' + m[1] + ' exists'));
})();
// every class a game page's markup/JS uses at least has a rule somewhere (game.css or its own style)
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
