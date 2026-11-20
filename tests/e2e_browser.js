const { SITE_DIR } = require('./config');
// Real browser, real folders: every tile opens its page inside the home page's iframe with no script errors.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = SITE_DIR; let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const mime = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(8779);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; const missing = []; const outside = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) missing.push(r.status() + ' ' + r.url()); });
  // Nothing outside this folder is fetched: the thumbnails the External Links page takes from other sites are refused here.
  // (The fonts are in this folder.) Every other site a page asks for is noted, for the font check at the end.
  await pg.route(u => u.hostname !== 'localhost', rt => { outside.push(new URL(rt.request().url()).hostname); rt.abort(); });
  // The home page turns its title over every 5 seconds. Here that timer is held, and the checks turn the title themselves,
  // so that no check depends on where in those 5 seconds it happens to run.
  await pg.addInitScript(() => { if (window !== window.top) return; const real = window.setInterval;
    window.setInterval = (fn, ms, ...rest) => { if (ms === 5000) { window.__titleFlip = fn; return 0; } return real(fn, ms, ...rest); }; });
  await pg.goto('http://localhost:8779/index.html'); await pg.waitForTimeout(300);
  const tiles = await pg.evaluate(() => TeluguUnits.all.map(t => ({ id: t.id, src: t.src, title: t.title, soon: !!t.soon })));
  ok(tiles.length === 42, tiles.length + ' tiles');
  let opened = 0, titled = 0;
  for (const t of tiles) {
    await pg.evaluate(id => { location.hash = '#/' + id; }, t.id); let fr; for (let i = 0; i < 40 && !fr; i++) { await pg.waitForTimeout(50); fr = pg.frames().find(f => f.url().endsWith('/' + t.src)); }
    if (!fr) console.log('   not loaded:', t.id, t.src, pg.frames().map(f => f.url()).join(' '));
    if (fr) { opened++; await fr.waitForLoadState('load').catch(() => {}); if (await fr.title()) titled++; else console.log('   no title:', t.src); }
  }
  ok(opened === 42, 'every tile loads its page in the iframe at the right path: ' + opened + '/42');
  ok(titled === 42, 'every loaded page has a title');
  // the live pages actually initialize (their shared scripts were found)
  const live = { 'alphabet/01_phonemes.html': 'TeluguData', 'alphabet/02_diacritics.html': 'TeluguData', 'alphabet/03_conjuncts.html': 'TeluguData', 'alphabet/04_words.html': 'TeluguWords', 'training/02_lookalike-builder.html': 'LookalikeData', 'training/03_lookalikes.html': 'LookalikeData', 'reference/01_rosetta.html': 'RosettaData', 'reference/02_signs-conjuncts.html': 'SignsConjunctsData', 'reference/03_sound-charts.html': 'SoundChartsData' };
  for (const [src, g] of Object.entries(live)) {
    const id = tiles.find(t => t.src === src).id; await pg.evaluate(i => { location.hash = '#/' + i; }, id); await pg.waitForTimeout(250);
    const fr = pg.frames().find(f => f.url().endsWith('/' + src)); const has = fr && await fr.evaluate(n => !!window[n] && !!window.TeluguData, g);
    ok(has, src + ' has its shared and page scripts (' + g + ')');
  }
  // Stylesheets only load in a real browser (jsdom drops them), so the CSS split is checked here.
  const css = (frame, sel, prop) => frame.evaluate(([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e).getPropertyValue(p).trim() : null; }, [sel, prop]);
  const frameOf = async id => { await pg.evaluate(i => { location.hash = '#/' + i; }, id); await pg.waitForTimeout(250); const src = tiles.find(t => t.id === id).src; return pg.frames().find(f => f.url().endsWith('/' + src)); };
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(150);
  const top = pg.mainFrame();
  ok(await css(top, 'body', 'background-color') === 'rgb(11, 12, 24)' && await css(top, 'a.tile', 'border-radius') === '16px' && await css(top, '.tiles', 'display') === 'grid', 'home page is styled by home.css on top of base.css');
  // The title: six cards that turn from "Telugu Telusu" to తెలుగు తెలుసు. Each is as wide as the face it shows.
  const titleNow = () => top.evaluate(() => { const t = document.getElementById('flip-title'), px = e => parseFloat(getComputedStyle(e).width);
    return { te: t.classList.contains('is-te'), cards: [...t.querySelectorAll('.flip')].map(c => ({ w: px(c), la: px(c.querySelector('.la')), te: px(c.querySelector('.te')), m: getComputedStyle(c.querySelector('.flip-in')).transform, vars: !!c.style.getPropertyValue('--la') && !!c.style.getPropertyValue('--te') })),
      line: t.getBoundingClientRect().height, sr: document.querySelector('#hero-title .sr-only').getBoundingClientRect().width }; });
  const latin = c => Math.abs(c.w - c.la) < 0.6 && (c.m === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(c.m)), telugu = c => Math.abs(c.w - c.te) < 0.6 && /^matrix3d\(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0,/.test(c.m);
  let tn = await titleNow();
  ok(await top.evaluate(() => typeof window.__titleFlip === 'function') && !tn.te, 'the home page asks for its title to turn every 5 seconds, and starts in Latin');
  ok(tn.cards.length === 6 && tn.cards.every(c => c.vars && c.la > 5 && c.te > 5 && latin(c)) && tn.line < 60 && tn.sr <= 1,
    'the title shows "Telugu Telusu": six cards, each measured and as wide as its Latin face, on one line');
  await top.evaluate(() => window.__titleFlip()); await pg.waitForTimeout(800);
  tn = await titleNow();
  ok(tn.te && tn.cards.every(telugu), 'turned, every card shows its Telugu face within the half second and has taken that face\'s width');
  await top.evaluate(() => window.__titleFlip()); await pg.waitForTimeout(800);
  tn = await titleNow();
  ok(!tn.te && tn.cards.every(latin), 'and turned again, it is back to "Telugu Telusu"');
  ok(await css(top, ':root', '--accent-glow') === 'rgba(201, 152, 26, 0.16)', 'home page takes its color tokens from base.css (accent glow 0.16)');
  // A tile: the icon and the title on one line, the description under the two. Measured on every tile, with a count on Review.
  const tileLook = p => p.evaluate(() => { const x = e => e.getBoundingClientRect(), bad = [], wide = innerWidth > 520;
    document.querySelectorAll('#sections a.tile').forEach(t => { const ic = x(t.querySelector('.tile-icon')), tl = t.querySelector('.tile-title'), de = x(t.querySelector('.tile-desc')), bd = t.querySelector('.tile-badge'), box = x(t);
      const r = document.createRange(); r.selectNodeContents(tl); const tr = r.getBoundingClientRect(), lines = [...r.getClientRects()];
      const beside = tr.left >= ic.right + 8 && (wide ? tr.top >= ic.top - 1 && tr.bottom <= ic.bottom + 1 && Math.abs((tr.top + tr.bottom) / 2 - (ic.top + ic.bottom) / 2) < 1.5      // wide: the title sits within the icon's height, centered on it
                                                    : tr.top < ic.bottom && de.bottom > ic.top && tr.top >= box.top + 8);                                                             // phone: the title and description, stacked, sit beside the icon
      const under  = wide ? de.top >= ic.bottom + 8 && Math.abs(de.left - ic.left) < 1 && de.right <= box.right - 10      // wide: the description starts under the icon, across the tile
                          : de.left >= ic.right + 8 && de.top >= tr.bottom - 1;                                              // phone: beside the icon, under the title
      const clear  = !bd || lines.every(q => q.right < x(bd).left - 2 || q.top >= x(bd).bottom || q.bottom <= x(bd).top);
      if (!beside || !under || !clear || tr.right > box.right - 10 || de.bottom > box.bottom - 6) bad.push(tl.textContent + (!beside ? ' [title]' : '') + (!under ? ' [description]' : '') + (!clear ? ' [badge]' : '')); });
    const first = document.querySelector('#sections a.tile'), fx = x(first);
    return { bad, n: document.querySelectorAll('#sections a.tile').length, heights: [...new Set([...document.querySelectorAll('#sections a.tile')].map(t => Math.round(x(t).height)))].sort((a, b) => a - b), icon: Math.round(x(first.querySelector('.tile-icon')).width), sideways: document.documentElement.scrollWidth > innerWidth, row: Math.round(fx.width) }; });
  await pg.evaluate(() => { for (let i = 0; i < 12; i++) TeluguProgress.miss({ game: 'phonemes', key: 'k' + i, prompt: 'p', answer: 'a' }); }); await pg.waitForTimeout(200);
  let tk = await tileLook(pg);
  ok(tk.n === 42 && tk.bad.length === 0 && tk.icon === 44 && !tk.sideways, 'Home: on every tile the title is on the icon\'s line, centered on it, and the description runs under the two; no title reaches its badge ("Soon", or Review\'s "12 to revisit") ' + tk.bad.join(' | '));
  ok(tk.heights[0] >= 110 && tk.heights.at(-1) <= 140, 'Home: the tiles are shorter for it (' + tk.heights.join(', ') + 'px), all between 110 and 140px');
  {
    const ph = await b.newPage({ viewport: { width: 390, height: 780 } }); ph.on('pageerror', e => errs.push('home (phone): ' + e.message));
    await ph.goto('http://localhost:8779/index.html'); await ph.waitForTimeout(500);
    await ph.evaluate(() => { for (let i = 0; i < 12; i++) TeluguProgress.miss({ game: 'phonemes', key: 'k' + i, prompt: 'p', answer: 'a' }); }); await ph.waitForTimeout(200);
    const pk = await tileLook(ph);
    ok(pk.n === 42 && pk.bad.length === 0 && pk.icon === 40 && !pk.sideways && pk.row === 358 && pk.heights.at(-1) <= 90, 'Home on a phone (390px): each tile is one compact row, the icon at the left with the title and description beside it, clear of the badge (' + pk.heights.join(', ') + 'px) ' + pk.bad.join(' | '));
    await ph.evaluate(() => TeluguProgress.clearMisses()); await ph.close();
  }
  await pg.evaluate(() => TeluguProgress.clearMisses()); await pg.waitForTimeout(200);
  // a section folds away to its heading line, and opens again
  const fold = () => top.evaluate(() => { const s = document.querySelectorAll('.section')[2], b = s.querySelector('.section-toggle');      // Alphabet, the third section
    return { h: Math.round(s.getBoundingClientRect().height), tiles: getComputedStyle(s.querySelector('.tiles')).display, turned: getComputedStyle(b.querySelector('svg')).transform, line: getComputedStyle(s.querySelector('.section-head')).borderBottomWidth }; });
  const open0 = await fold();
  // The whole heading line is the button, from the section's name across to the arrow. Click it in the middle, on neither.
  const lineOf = () => top.evaluate(() => { const s = document.querySelectorAll('.section')[2]; s.querySelector('.section-head').scrollIntoView({ block: 'center' }); const x = e => e.getBoundingClientRect(), h = x(s.querySelector('.section-head')), b = x(s.querySelector('.section-toggle')), n = x(s.querySelector('.section-name')), a = x(s.querySelector('.section-toggle svg')), t = x(s.querySelector('.tiles'));
    return { head: h, btn: b, name: n, arrow: a, tilesLeft: t.left, tilesRight: t.right, cursor: getComputedStyle(s.querySelector('.section-toggle')).cursor, mid: { x: (n.right + a.left) / 2, y: (h.top + h.bottom) / 2 },
      hit: document.elementFromPoint((n.right + a.left) / 2, (h.top + h.bottom) / 2).closest('.section-toggle') === s.querySelector('.section-toggle'), font: getComputedStyle(s.querySelector('.section-name')).fontSize + ' ' + getComputedStyle(s.querySelector('.section-name')).textTransform + ' ' + getComputedStyle(s.querySelector('.section-name')).color }; });
  let line = await lineOf();
  ok(line.btn.left <= line.head.left && line.btn.right >= line.head.right && line.btn.top <= line.head.top && line.btn.bottom >= line.head.bottom - 1 && line.btn.height >= 30 && line.cursor === 'pointer' && line.hit,
    'Home: a section\'s button covers its whole heading line, from the name across to the arrow (' + Math.round(line.btn.width) + ' × ' + Math.round(line.btn.height) + 'px)');
  ok(Math.abs(line.name.left - line.tilesLeft) < 1 && Math.abs(line.arrow.right - line.tilesRight) < 1 && line.mid.x - line.name.right > 300 && line.font === '11px uppercase rgb(201, 152, 26)',
    'Home: the name sits at the left edge of the tiles and the arrow at their right edge; the name keeps the heading\'s type (small gold capitals)');
  await pg.mouse.click(line.mid.x, line.mid.y); await pg.mouse.move(5, 5); await pg.waitForTimeout(250);
  const shut0 = await fold();
  ok(open0.h > 200 && open0.tiles === 'grid' && open0.turned === 'none' && shut0.h < 40 && shut0.tiles === 'none' && shut0.line === '1px', 'a click in the middle of the line folds the section down to its heading (' + open0.h + 'px → ' + shut0.h + 'px)');
  ok(shut0.turned === 'matrix(0, 1, -1, 0, 0, 0)', 'the arrow of a folded section points left (‹): a quarter turn clockwise from pointing down');
  line = await lineOf(); await pg.mouse.click(line.name.left + 4, line.mid.y); await pg.waitForTimeout(250);
  ok((await fold()).h === open0.h && (await fold()).turned === 'none', 'a click on the name opens it again, the arrow pointing down');
  await pg.click('.section:nth-of-type(3) .section-toggle svg'); await pg.waitForTimeout(250);
  ok((await fold()).tiles === 'none', 'and the arrow itself still folds it');
  await pg.click('.section:nth-of-type(3) .section-toggle svg'); await pg.mouse.move(5, 5); await pg.waitForTimeout(250);
  let fr0 = await frameOf('vocab-greetings');
  ok(await css(fr0, '.unit-icon', 'width') === '52px' && await css(fr0, '.facts', 'border-radius') === '16px' && await css(fr0, 'body', 'background-color') === 'rgb(11, 12, 24)', 'a placeholder is styled by shell.css');
  ok(await fr0.evaluate(() => document.querySelector('h1').textContent + '|' + document.querySelectorAll('.fact').length) === 'Greetings|3', 'a placeholder draws its title and three lines from units.js');
  let soonOk = 0; for (const t of tiles.filter(t => t.soon)) { const f = await frameOf(t.id); if (f && await f.evaluate(want => document.querySelector('h1') && document.querySelector('h1').textContent === want && !!document.querySelector('.pill.soon'), t.title)) soonOk++; else console.log('   placeholder not drawn:', t.id); }
  ok(soonOk === 31, 'all 31 placeholders draw in the browser: ' + soonOk + '/31');
  for (const id of ['rosetta', 'signs-conjuncts', 'sound-charts']) { const f = await frameOf(id);
    ok(await css(f, '.g-header', 'position') === 'sticky' && await css(f, 'html', 'overflow-y') === 'auto' && await css(f, 'body', 'overflow-y') === 'visible' && await css(f, '.jump a', 'border-radius') === '999px' && await css(f, '.wrap', 'display') === 'grid', id + ' is styled by reference.css on top of game.css'); }
  ok(await css(await frameOf('signs-conjuncts'), '.wrap', 'row-gap') === '16px' && await css(await frameOf('rosetta'), '.wrap', 'row-gap') === '14px', 'a reference page\'s own <style> still wins over reference.css');
  fr0 = await frameOf('links');
  ok(await fr0.evaluate(() => { const g = s => getComputedStyle(document.querySelector(s)); const t = [...document.querySelectorAll('a.tile.link')].map(e => e.getBoundingClientRect());
    return t.length === 7 && g('.tiles').display === 'grid' && g('.tile.link').borderRadius === '16px' && g('.tile-thumb').height === '96px' && g('.tile-page').overflowY === 'auto' && t[0].top === t[1].top && t[1].left > t[0].right; }),
    'External Links is laid out by home.css: a grid of tiles, each with a thumbnail band, in a page that scrolls');
  await fr0.waitForFunction(() => !document.querySelector('.tile-thumb img'), null, { timeout: 5000 }).catch(() => {});
  ok(await fr0.evaluate(() => [...document.querySelectorAll('.tile-thumb')].map(b => b.querySelector('img') ? '?' : b.textContent.trim()).join('')) === 'WWWOTLG', 'with the other sites out of reach, every link tile falls back to its site initial');
  fr0 = await frameOf('sound-charts');
  ok(await fr0.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), v = r('#vowel-chart svg'), g = c => getComputedStyle(document.querySelector(c));
    return v.width > 300 && v.height > 150 && g('#cons .ph.both').backgroundColor !== g('#cons .ph.te').backgroundColor && g('#cons th.row').position === 'sticky' && g('#vowel-chart').overflowX === 'auto' && g('#cons .tel .te').fontFamily.includes('Noto Sans Telugu'); }),
    'Sound Charts draws the vowel chart and the grid: shared sounds highlighted, row names pinned, both charts scroll sideways inside their own box');
  ok(await fr0.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Sound Charts never makes the page itself scroll sideways');
  for (const [id, total] of [['phonemes', 51], ['diacritics', 51], ['conjuncts', 40], ['words', 20], ['lookalikes', 40]]) { fr0 = await frameOf(id);
    ok(await fr0.evaluate(([id, total]) => !!window.GameCore && GameCore.current.id === id && GameCore.current.total === total && GameCore.current.deck.length === total && document.querySelectorAll('.kb-btn').length > 1 && !!document.getElementById('retry-btn') && document.getElementById('s-total').textContent === String(total), [id, total]), id + ' runs on game-core.js (' + total + ' cards dealt, complete screen in place)'); }
  // Phonemes opens with the session popup over everything; Enter starts, and Cancel on a fresh open goes back to Home
  fr0 = await frameOf('phonemes');
  ok(await fr0.evaluate(() => { const s = document.getElementById('setup'), r = s.getBoundingClientRect(), box = s.querySelector('.setup-box').getBoundingClientRect(), x = id => document.getElementById(id).getBoundingClientRect();
    return !s.hidden && r.width === innerWidth && r.height === innerHeight && s.contains(document.elementFromPoint(30, 30)) && s.contains(document.elementFromPoint(innerWidth / 2, innerHeight - 30)) && box.width <= 440 && box.left > 0
      && x('setup-cancel').right < x('setup-title').left && x('setup-title').right < x('setup-start').left && Math.abs(x('setup-cancel').top - x('setup-start').top) < 2 && x('setup-rounds').right < x('setup-rounds-n').left
      && Math.abs((x('show-cat').left + x('show-cat').right) / 2 - (x('rev-btn').left + x('rev-btn').right) / 2) < 2 && x('rev-btn').bottom < x('setup-rounds').top && x('setup-rounds').bottom < x('setup-misses').top && x('setup-misses').bottom < x('show-cat').top
      && document.activeElement.id === 'setup-start'; }), 'Phonemes opens with the session popup covering the page: Cancel top left, Start top right, the direction first, then the two sliders, then the checkboxes in line under the 🔀 button, the rounds box to the right of its slider, Start focused');
  await fr0.focus('#shuffle-kb');
  ok(await fr0.evaluate(() => { const row = document.getElementById('shuffle-kb').closest('.setup-opt'), g = getComputedStyle(row), r = row.getBoundingClientRect(), t = row.querySelector('.menu-txt span').getBoundingClientRect(), b = document.getElementById('shuffle-kb').getBoundingClientRect(), dir = document.getElementById('setup-dir').getBoundingClientRect(), box = document.querySelector('.setup-box').getBoundingClientRect();
    return g.outlineStyle === 'solid' && g.outlineWidth === '1px' && t.left - r.left >= 7 && t.top - r.top >= 5 && r.bottom - t.bottom >= 5 && r.right - b.right >= 7 && r.left > box.left + 4 && r.right < box.right - 4 && Math.abs(t.left - dir.left) < 1; }),
    'the outline around a checkbox row in use is 1px, with room on every side of the words and the box, inside the popup; the words stay in line with the direction');
  await fr0.focus('#setup-start');
  await fr0.fill('#setup-rounds-n', '4'); await fr0.press('#setup-rounds-n', 'Enter'); await pg.waitForTimeout(150);
  ok(await fr0.evaluate(() => document.getElementById('setup').hidden && GameCore.current.total === 4 && [...document.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none').length === 51 && !document.querySelector('.menu-btn')), 'typing 4 in the box and pressing Enter starts a session of 4 (all 51 keys, no ⋮ menu)');
  await fr0.click('.kb-btn:not([style*="none"])'); await pg.waitForTimeout(100);
  ok(await fr0.evaluate(() => GameCore.current.attempts === 1), 'with the popup closed the keyboard takes taps again');
  // a wrong pick: the line under the card shows it (not the answer) and stays for about a second and a half
  await pg.waitForTimeout(1600);
  const pickedText = await fr0.evaluate(() => { const b = [...document.querySelectorAll('.kb-btn')].find(k => k.style.display !== 'none' && k.dataset.ch !== GameCore.current.current.ch); b.click(); return b.textContent; });
  await pg.waitForTimeout(900);          // (well inside the 1.5 seconds, so a slow machine does not miss it)
  ok(await fr0.evaluate(t => { const f = document.getElementById('feedback'); return f.textContent === '✗  /' + t + '/' && f.getBoundingClientRect().height > 0 && GameCore.current.locked; }, pickedText), 'a wrong pick is shown under the card (✗ and the key that was pressed) and is still there after 0.9 seconds');
  await pg.waitForTimeout(1000);
  ok(await fr0.evaluate(() => document.getElementById('feedback').textContent === '' && !GameCore.current.locked), 'and gone by 1.9 seconds, with the next card ready');
  await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(150);      // leave, so the page is opened afresh
  fr0 = await frameOf('phonemes');
  await fr0.click('#setup-cancel'); await pg.waitForTimeout(250);
  ok(await pg.evaluate(() => !document.getElementById('home').hidden && document.getElementById('app').hidden && (location.hash === '#/' || location.hash === '')), 'Cancel on the popup, before anything is played, goes back to Home');
  // Diacritics and Conjuncts open the same way; Conjuncts starts at its usual 40 of 83
  for (const [id, title, rounds, top] of [['diacritics', 'Diacritics', '51', '51'], ['conjuncts', 'Conjuncts', '40', '83']]) {
    fr0 = await frameOf(id);
    ok(await fr0.evaluate(([title, rounds, top]) => { const s = document.getElementById('setup'), r = s.getBoundingClientRect(), x = i => document.getElementById(i).getBoundingClientRect();
      return !s.hidden && r.width === innerWidth && r.height === innerHeight && s.contains(document.elementFromPoint(innerWidth / 2, innerHeight - 30)) && document.getElementById('setup-title').textContent === title
        && document.getElementById('setup-rounds').value === rounds && document.getElementById('setup-rounds').max === top && document.getElementById('setup-misses-out').textContent === 'Unlimited' && document.getElementById('setup-misses-note').textContent === 'Never ends early' && x('setup-misses').bottom <= x('setup-misses-note').top && x('setup-misses-note').height > 0 && x('setup-misses-note').bottom < x('show-cat').top
        && x('rev-btn').bottom < x('setup-rounds').top && x('setup-misses').bottom < x('show-cat').top && Math.abs((x('show-cat').left + x('show-cat').right) / 2 - (x('rev-btn').left + x('rev-btn').right) / 2) < 2
        && !document.querySelector('.menu-btn') && !document.querySelector('.g-header .rev-btn') && document.activeElement.id === 'setup-start'; }, [title, rounds, top]),
      title + ' opens with the session popup covering the page (' + rounds + ' rounds of ' + top + ', no game over), with no ⋮ menu or 🔀 left in the header');
    if (id === 'diacritics') ok(await fr0.evaluate(() => { const pairs = [...document.querySelectorAll('.kb-col[data-kind="v"] .kb-pair')].map(p => [...p.children].map(b => b.getBoundingClientRect())), row = document.querySelector('.kb-col[data-kind="v"] .kb-row');
      return pairs.length === 6 && pairs.every(([a, b]) => Math.abs(a.top - b.top) < 1 && b.left > a.right && Math.abs(b.left - a.right - parseFloat(getComputedStyle(row).columnGap)) < 1); }),
      'Diacritics: each vowel key has its long form right beside it on the same row, spaced like any two keys');
    await fr0.fill('#setup-rounds-n', '3'); await fr0.evaluate(() => { const m = document.getElementById('setup-misses'); m.value = 2; m.dispatchEvent(new Event('input', { bubbles: true })); });
    await fr0.press('#setup-rounds-n', 'Enter'); await pg.waitForTimeout(150);
    ok(await fr0.evaluate(() => { const st = document.getElementById('s-lives'), r = st.getBoundingClientRect(), c = document.getElementById('s-total').getBoundingClientRect();
      return document.getElementById('setup').hidden && GameCore.current.total === 3 && GameCore.current.limit === 2 && !st.hidden && r.width > 0 && r.left > c.right && Math.abs((r.top + r.bottom) / 2 - (c.top + c.bottom) / 2) < 4 && st.textContent === '\u{1F90D}\u{1F9E1}' && st.getAttribute('aria-label') === 'Mistakes left: 2' && document.documentElement.scrollWidth <= innerWidth; }),
      title + ': Enter starts 3 rounds with game over at 2; the header shows two hearts (white, orange) after the counters, on their line');
    ok(await fr0.evaluate(() => { const g = GameCore.current, st = document.getElementById('s-lives'), seen = [null, 20, 4, 3, 2, 1, 'over'].map(n => { if (n === 'over') { g.start({ misses: 1 }); g.judge(false); } else g.start({ misses: n });
        const r = st.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(st); const t = range.getBoundingClientRect();
        return { w: Math.round(r.width * 10), total: Math.round(document.getElementById('s-total').getBoundingClientRect().left * 10), rem: Math.round(document.getElementById('s-rem').getBoundingClientRect().left * 10), fits: t.width <= r.width + 0.5, flush: Math.abs(t.right - r.right) < 2 }; });
      return seen.every(s => s.w === seen[0].w && s.total === seen[0].total && s.rem === seen[0].rem && s.fits && s.flush); }),
      title + ': the hearts keep one width with no limit (❤️×♾️), at 20, 4, 3, 2, and 1 left, and at game over (⭕), at the right of their box, so the counters beside them do not move');
    await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(150);
  }
  // Words: a whole word on a wider card, its meaning above, a row of boxes under it; the character being spelled in the accent color
  fr0 = await frameOf('words');
  ok(await fr0.evaluate(() => { const s = document.getElementById('setup'), r = s.getBoundingClientRect(), x = i => document.getElementById(i).getBoundingClientRect();
    return !s.hidden && r.width === innerWidth && r.height === innerHeight && document.getElementById('setup-title').textContent === 'Words' && document.getElementById('setup-rounds').value === '20' && document.getElementById('setup-rounds').max === '250'
      && !document.getElementById('rev-btn') && !document.getElementById('setup-dir-row') && x('setup-rounds').bottom < x('setup-misses').top && x('setup-misses').bottom < x('show-cat').top && !document.querySelector('.menu-btn') && document.activeElement.id === 'setup-start'; }),
    'Words opens with the session popup (20 rounds of 250), with no direction row and no ⋮ menu');
  await fr0.press('#setup-start', 'Enter'); await pg.waitForTimeout(150);
  const ACCENT = 'rgb(201, 152, 26)', TEXT = 'rgb(251, 248, 238)', ERROR = 'rgb(248, 113, 113)', SUCCESS = 'rgb(74, 222, 128)';
  const wordsLook = () => fr0.evaluate(() => { const x = e => e.getBoundingClientRect(), $ = i => document.getElementById(i), card = x($('char-card')), syl = [...document.querySelectorAll('#tel-char .syl')];
    const boxes = [...document.querySelectorAll('.sp-slot')].map(x), cols = [...document.querySelectorAll('.kb-col')].map(x);
    return { en: x($('word-en')), card, word: x($('tel-char')), spell: x($('spell')), fb: x($('feedback')), kb: x($('kb-area')), cols, boxRows: new Set(boxes.map(b => Math.round(b.top))).size, boxes: boxes.length,
      colors: syl.map(e => getComputedStyle(e).color), size: parseFloat(getComputedStyle($('tel-char')).fontSize), enText: $('word-en').textContent, enFont: getComputedStyle($('word-en')).fontFamily }; });
  await fr0.evaluate(() => { GameCore.current.put(TeluguWords.get('పుస్తకం')); });
  let wl = await wordsLook();
  ok(wl.enText === 'book' && wl.en.bottom <= wl.card.top && wl.en.height >= 18 && Math.abs((wl.en.left + wl.en.right) / 2 - (wl.card.left + wl.card.right) / 2) < 1 && /Inter/.test(wl.enFont), 'Words: the meaning sits above the card, centered on it');
  ok(Math.round(wl.card.width) === 420 && Math.round(wl.card.height) === 144 && wl.card.bottom <= wl.spell.top && wl.spell.bottom <= wl.fb.top && wl.fb.bottom <= wl.kb.top, 'Words: the card is wider than a single character\'s (420 × 144); under it the row of boxes, the feedback line, then the keyboards');
  ok(wl.colors.join('|') === [ACCENT, TEXT, TEXT].join('|'), 'Words: the character being spelled is in the accent color (gold), the rest of the word in the text color');
  ok(wl.boxes === 8 && wl.boxRows === 1 && wl.cols.length === 2 && wl.cols[0].right < wl.cols[1].left && Math.abs(wl.cols[0].top - wl.cols[1].top) < 1 && wl.cols[0].width > wl.cols[1].width, 'Words: eight boxes in one row; the consonant and vowel keyboards side by side');
  ok(await fr0.evaluate(() => { const pairs = [...document.querySelectorAll('.kb-col[data-kind="v"] .kb-pair')].map(p => [...p.children].map(b => b.getBoundingClientRect())), row = document.querySelector('.kb-col[data-kind="v"] .kb-row');
    return pairs.length === 6 && pairs.every(([a, b]) => Math.abs(a.top - b.top) < 1 && b.left > a.right && Math.abs(b.left - a.right - parseFloat(getComputedStyle(row).columnGap)) < 1); }),
    'Words: each vowel key has its long form right beside it on the same row, as on Diacritics (the layout is in game.css)');
  // every word fits its card, at the size its length gives it
  const fits = () => fr0.evaluate(() => { const G = GameCore.current, card = document.getElementById('char-card'), tel = document.getElementById('tel-char'), bad = [], sizes = {};
    for (const w of TeluguWords.words) { G.put(w); const c = card.getBoundingClientRect(), t = tel.getBoundingClientRect(); sizes[w.syllables.length] = parseFloat(getComputedStyle(tel).fontSize);
      if (t.width > c.width - 24 || t.left < c.left + 10 || t.right > c.right - 10 || document.getElementById('spell').getBoundingClientRect().width > innerWidth) bad.push(w.te); }
    G.start(); return { bad, sizes, sideways: document.documentElement.scrollWidth > innerWidth }; });
  let ft = await fits();
  ok(ft.bad.length === 0 && !ft.sideways && ft.sizes[1] === ft.sizes[2] && ft.sizes[2] > ft.sizes[3] && ft.sizes[3] > ft.sizes[4] && ft.sizes[4] > ft.sizes[5] && ft.sizes[5] >= 40,
    'Words: all 250 words fit inside the card with room to spare; longer words are set smaller (' + [1, 2, 3, 4, 5].map(n => ft.sizes[n]).join(', ') + 'px) ' + ft.bad.join(' '));
  // a wrong pick: the character turns red, the key pressed red, the right key lit, for a second and a half
  await fr0.evaluate(() => { GameCore.current.put(TeluguWords.get('పుస్తకం')); const hit = ipa => [...document.querySelectorAll('.kb-btn')].find(b => b.dataset.ipa === ipa).click(); hit('p'); hit('u'); hit('s'); hit('k'); });
  await pg.waitForTimeout(500);
  ok(await fr0.evaluate(([ACCENT, TEXT, ERROR, SUCCESS]) => { const c = s => getComputedStyle(document.querySelector(s)), key = ipa => getComputedStyle([...document.querySelectorAll('.kb-btn')].find(b => b.dataset.ipa === ipa));
    const syl = [...document.querySelectorAll('#tel-char .syl')].map(e => getComputedStyle(e).color), boxes = [...document.querySelectorAll('.sp-slot')];
    return syl.join('|') === [TEXT, ERROR, TEXT].join('|') && key('k').borderTopColor === ERROR && key('t̪').borderTopColor === SUCCESS && c('#feedback').color === ERROR && document.getElementById('feedback').textContent === '✗  /k/'
      && getComputedStyle(boxes[3]).borderTopColor === ERROR && getComputedStyle(boxes[3]).color === ERROR && getComputedStyle(boxes[4]).borderTopStyle === 'dashed' && boxes.slice(0, 5).map(b => b.textContent).join(' ') === 'p u s t̪ ɐ' && GameCore.current.locked; }, [ACCENT, TEXT, ERROR, SUCCESS]),
    'Words: a wrong pick turns that character red; the key pressed is red, the right key green, the missed box red, the box never asked dashed; the game is held');
  await pg.waitForTimeout(1300);
  ok(await fr0.evaluate(([ACCENT, TEXT, ERROR]) => [...document.querySelectorAll('#tel-char .syl')].map(e => getComputedStyle(e).color).join('|') === [TEXT, ERROR, ACCENT].join('|') && !GameCore.current.locked && document.getElementById('feedback').textContent === ''
      && !document.querySelector('.kb-btn.ok, .kb-btn.err') && !!document.querySelector('.sp-syl.now .sp-slot.cur'), [ACCENT, TEXT, ERROR]),
    'Words: a second and a half later play has moved on: the next character is gold, the missed one stays red, the keys are clear');
  // on a phone: the vowel keyboard comes first, the longest words still fit, nothing scrolls sideways
  await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(150);
  {
    const ph = await b.newPage({ viewport: { width: 390, height: 780 } }); ph.on('pageerror', e => errs.push('words (phone): ' + e.message));
    await ph.goto('http://localhost:8779/alphabet/04_words.html'); await ph.waitForTimeout(400); await ph.click('#setup-start'); await ph.waitForTimeout(150);
    const r = await ph.evaluate(() => { const G = GameCore.current, card = document.getElementById('char-card'), tel = document.getElementById('tel-char'), bad = [], sizes = {};
      for (const w of TeluguWords.words) { G.put(w); const c = card.getBoundingClientRect(), t = tel.getBoundingClientRect(); sizes[w.syllables.length] = parseFloat(getComputedStyle(tel).fontSize);
        if (t.width > c.width - 16 || t.left < c.left + 6 || t.right > c.right - 6 || document.documentElement.scrollWidth > innerWidth) bad.push(w.te); }
      G.put(TeluguWords.get('ధన్యవాదాలు'));
      const x = e => e.getBoundingClientRect(), cols = [...document.querySelectorAll('.kb-col')], v = x(cols.find(c => c.dataset.kind === 'v')), c = x(cols.find(c => c.dataset.kind === 'c')), sp = x(document.getElementById('spell'));
      return { bad, sizes, card: Math.round(x(card).width), vFirst: v.bottom <= c.top && Math.abs(v.left - c.left) < 1, spell: sp.left >= 0 && sp.right <= innerWidth, boxes: [...document.querySelectorAll('.sp-slot')].every(b => x(b).left >= 0 && x(b).right <= innerWidth),
        en: x(document.getElementById('word-en')).bottom <= x(card).top, sideways: document.documentElement.scrollWidth > innerWidth, header: x(document.getElementById('s-lives')).right <= innerWidth }; });
    ok(r.bad.length === 0 && !r.sideways && r.card === 358 && r.sizes[5] < r.sizes[4] && r.sizes[4] < r.sizes[3], 'Words on a phone (390px): the card takes the width there is (358px) and every word still fits, the long ones a size smaller (' + [3, 4, 5].map(n => r.sizes[n]).join(', ') + 'px) ' + r.bad.join(' '));
    ok(r.vFirst && r.spell && r.boxes && r.en && r.header, 'Words on a phone: the vowel keyboard comes first, above the consonants; the eleven boxes of the longest word wrap inside the screen; the header fits');
    await ph.close();
  }
  fr0 = await frameOf('lookalike-builder');
  ok(await fr0.evaluate(() => document.querySelectorAll('#kCons .key').length === TeluguData.consonants.length && document.querySelectorAll('#kDigits .key').length === TeluguData.digits.length && !!LookalikeData.rows), 'the Lookalike Builder draws its keys from TeluguData and has LookalikeData\'s CSV reader');
  // its bar (the switch, the character, its lookalikes) stays under the header while the keyboard scrolls
  await fr0.click('#kb .key[data-ch="క"]');
  ok(await fr0.evaluate(() => { const g = s => getComputedStyle(document.querySelector(s)); return document.querySelector('.mode-opt[aria-checked="true"]').dataset.mode === 'looks' && g('.kb').borderTopColor === g('.mode-opt[aria-checked="true"]').borderTopColor && g('.keys.c').gridTemplateColumns.split(' ').length === 10; }),
    'the Lookalike Builder: choosing a character switches to "Looks Like" (keyboard outlined in gold); consonants run ten to a row on a wide screen');
  // (the header's height depends on the font in use, so the bar must follow the header and not a fixed number)
  const pinned = () => fr0.evaluate(async () => { const frames = n => new Promise(r => { const step = () => (n-- > 0 ? requestAnimationFrame(step) : r()); step(); });
    await frames(3); window.scrollTo(0, 400); await frames(2);
    const head = document.querySelector('.g-header').getBoundingClientRect(), bar = document.querySelector('.pick').getBoundingClientRect();
    const r = { scrolled: window.scrollY > 100, headTop: head.top, gap: bar.top - head.bottom, height: head.height }; window.scrollTo(0, 0); return r; });
  let pin = await pinned();
  ok(pin.scrolled && Math.abs(pin.headTop) < 0.6 && Math.abs(pin.gap) < 0.6, 'the Lookalike Builder: the header and the character bar stay in view when the page scrolls, the bar right under the header (a ' + pin.height + 'px header here)');
  await fr0.addStyleTag({ content: '.g-header .g-title { font-size: 22px !important; line-height: 2 !important; }' });
  const taller = await pinned();
  ok(taller.height > pin.height + 10 && Math.abs(taller.headTop) < 0.6 && Math.abs(taller.gap) < 0.6, 'the Lookalike Builder: when the header is a different height (another font, larger text) the bar still sits right under it');
  // the reference pages: the header stays at the top (the window scrolls, not <body>)
  for (const id of ['rosetta', 'signs-conjuncts', 'sound-charts']) { const f = await frameOf(id);
    ok(await f.evaluate(async () => { window.scrollTo(0, 600); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const r = window.scrollY > 300 && Math.round(document.querySelector('.g-header').getBoundingClientRect().top) === 0 && document.body.scrollTop === 0; window.scrollTo(0, 0); return r; }),
      id + ': the header stays in view when the page scrolls'); }
  // The notation chosen on the home page reaches the next page opened (each page is loaded afresh from Home)
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(150);
  // It is in the Settings menu, which the ☰ button at the top right opens
  ok(await top.evaluate(() => { const x = s => document.querySelector(s).getBoundingClientRect(), hero = x('.hero'), title = x('.hero-title'), prof = x('#profile-btn'), set = x('#settings-btn');
    return prof.left > title.right && set.left > prof.right && Math.abs(set.right - hero.right) < 1 && Math.abs(prof.top - set.top) < 1 && prof.width >= 36 && set.width >= 36 && x('#settings-menu').width === 0
      && getComputedStyle(document.querySelector('#settings-btn svg')).fill === 'none'; }), 'the top right of the home page: the Profile button, then ☰ against the right edge, both on the title\'s line; the menu is closed');
  await pg.click('#settings-btn'); await pg.waitForTimeout(100);
  ok(await top.evaluate(() => { const x = s => document.querySelector(s).getBoundingClientRect(), menu = x('#settings-menu'), btn = x('#settings-btn'), seg = x('#prefs .seg-opt.on');
    return menu.width > 150 && menu.top >= btn.bottom && Math.abs(menu.right - btn.right) < 1 && menu.left >= 0 && menu.right <= innerWidth
      && document.querySelector('#settings-menu').contains(document.elementFromPoint(seg.left + seg.width / 2, seg.top + seg.height / 2)) && document.documentElement.scrollWidth <= innerWidth; }),
    '☰ opens the Settings menu under itself, lined up with its right edge, over the page and inside the window');
  ok(await top.evaluate(() => [...document.querySelectorAll('#prefs .seg-opt')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join(' ')) === 'IPA* ISO', 'the menu shows the IPA | ISO control, IPA selected');
  ok(await css(top, '.seg-opt.on', 'background-color') !== await css(top, '.seg-opt:not(.on)', 'background-color') && await css(top, '.settings-menu', 'position') === 'absolute', 'the control is styled by home.css (selected option highlighted)');
  await pg.click('#prefs .seg-opt[data-value="iso"]');
  ok(await top.evaluate(() => !document.getElementById('settings-menu').hidden && document.querySelector('#prefs .seg-opt.on').textContent === 'ISO'), 'choosing ISO leaves the menu open, with ISO selected');
  fr0 = await frameOf('phonemes');
  ok(await fr0.evaluate(() => document.getElementById('g-title').textContent + '|' + [...document.querySelectorAll('.kb-btn')].find(b => b.dataset.ch === 'క').textContent + '|' + TeluguData.notation.id) === 'Telugu → ISO|ka|iso', 'after choosing ISO, Phonemes opens in ISO (title "Telugu → ISO", key "ka")');
  fr0 = await frameOf('conjuncts');
  ok(await fr0.evaluate(() => { document.getElementById('rev-btn').click(); document.getElementById('setup-start').click(); GameCore.current.put(TeluguData.clusters.find(c => c.glyph === 'క్ష')); const t = document.getElementById('tel-char'); return t.textContent + '|' + getComputedStyle(t).fontFamily.split(',')[0].replace(/['"]/g, ''); }) === 'kṣa|Noto Sans', 'Conjuncts reversed shows kṣa on the card, in the Latin face');
  fr0 = await frameOf('sound-charts');
  ok(await fr0.evaluate(() => { const k = [...document.querySelectorAll('#cons .ph')].find(p => p.dataset.ipa === 'k'); return k.querySelector('.tel .snd').textContent + '|' + k.querySelector('.eng .snd').textContent; }) === 'ka|/k/', 'Sound Charts in ISO: క is labeled ka, English k stays /k/');
  fr0 = await frameOf('review');
  ok(await fr0.evaluate(() => !!window.TeluguData && TeluguData.notation.id === 'iso'), 'Review loads the letter data and the notation too');
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(150);
  ok(await top.evaluate(() => document.querySelector('#prefs .seg-opt.on').textContent + '|' + document.getElementById('settings-menu').hidden) === 'ISO|true', 'the choice is still selected back on Home (the menu closed when a page was opened)');
  await pg.click('#settings-btn'); await pg.click('#prefs .seg-opt[data-value="ipa"]');
  fr0 = await frameOf('phonemes');
  ok(await fr0.evaluate(() => document.getElementById('g-title').textContent + '|' + [...document.querySelectorAll('.kb-btn')].find(b => b.dataset.ch === 'క').textContent) === 'Telugu → IPA|k', 'and choosing IPA again puts Phonemes back in IPA');
  // Sessions recorded by a game inside its folder reach the Profile page, which charts them. No ✓ appears on Home.
  await pg.evaluate(() => { location.hash = '#/phonemes'; }); await pg.waitForTimeout(250);
  const fr = pg.frames().find(f => f.url().endsWith('alphabet/01_phonemes.html'));
  await fr.evaluate(() => { TeluguProgress.reset();
    [[51, 51, 80, 'done'], [51, 51, 66, 'done'], [51, 9, 14, 'out'], [20, 20, 22, 'done', 'reverse'], [51, 51, 53, 'done']].forEach(([total, correct, attempts, ended, variant]) => TeluguProgress.run('phonemes', { total, correct, attempts, ended, variant }));
    TeluguProgress.miss({ game: 'phonemes', key: 'క', ask: 'telugu' }); });
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(250);
  ok(await pg.evaluate(() => !document.querySelector('.tile-check') && !/✓/.test(document.getElementById('sections').textContent) && document.querySelector('a.tile[href="#/review"] .tile-badge').textContent === '1 to revisit'), 'back on Home there is no ✓ on any tile (the Review tile still counts the miss)');
  // An item waits in Review: its tile, first in Training, is outlined in the highlight color, and so is the Training arrow. Nothing else is.
  const reviewLook = () => pg.evaluate(() => { const x = e => e.getBoundingClientRect(), secs = [...document.querySelectorAll('.section')], tr = secs.find(s => s.dataset.section === 'Training'), rv = document.querySelector('a.tile[href="#/review"]');
    const arrow = s => getComputedStyle(s.querySelector('.section-toggle svg')).color, badge = rv.querySelector('.tile-badge'), head = x(tr.querySelector('.section-head')), tog = x(tr.querySelector('.section-toggle svg')), title = x(tr.querySelector('.section-name'));
    return { first: tr.querySelector('a.tile') === rv, order: secs.map(s => s.dataset.section).slice(0, 3).join(), border: getComputedStyle(rv).borderTopColor, ring: getComputedStyle(rv).boxShadow, others: [...document.querySelectorAll('a.tile:not(.soon)')].filter(t => t !== rv).map(t => getComputedStyle(t).borderTopColor),
      arrows: secs.map(arrow), badge: badge ? [badge.textContent, getComputedStyle(badge).backgroundColor, x(badge).right <= x(rv).right && x(badge).top >= x(rv).top && (() => { const r = document.createRange(); r.selectNodeContents(rv.querySelector('.tile-title')); return x(badge).left > r.getBoundingClientRect().right; })()] : null,      // in the tile's top right corner, clear of the title
      atEnd: Math.abs(tog.right - head.right) < 1 && tog.left > title.right, counts: document.querySelectorAll('#sections .section-count').length, ready: /\d+ of \d+ ready/.test(document.getElementById('home').innerText), size: [Math.round(x(rv).width), Math.round(x(tr.querySelectorAll('a.tile')[1]).width), Math.round(x(rv).top - x(tr.querySelectorAll('a.tile')[1]).top)] }; });
  await pg.mouse.move(5, 5);
  let rl = await reviewLook();
  const GOLD = 'rgb(201, 152, 26)', PLAIN = 'rgb(37, 38, 72)', MUTED = 'rgb(156, 156, 200)';
  ok(rl.first && rl.order === 'Reference,Training,Alphabet' && rl.size[0] === rl.size[1] && rl.size[2] === 0, 'Home: Review is the first tile of Training, a tile like its neighbors (same size, same row)');
  ok(rl.border === GOLD && rl.ring.includes(GOLD) && rl.others.every(c => c === PLAIN) && rl.badge[0] === '1 to revisit' && rl.badge[1] === GOLD && rl.badge[2], 'Home: with an item waiting, the Review tile alone is outlined in the highlight color, its count in a badge of the same');
  ok(rl.arrows[1] === GOLD && rl.arrows.filter((c, i) => i !== 1).every(c => c === MUTED) && rl.atEnd, 'Home: the Training arrow takes the highlight color too; the other arrows stay muted; each sits at the end of its heading line');
  ok(rl.counts === 0 && !rl.ready, 'Home: no section says "x of y ready"');
  await pg.click('.section:nth-of-type(2) .section-toggle'); await pg.mouse.move(5, 5); await pg.waitForTimeout(250);
  ok(await pg.evaluate(GOLD => { const s = document.querySelectorAll('.section')[1], b = s.querySelector('.section-toggle'); return s.classList.contains('collapsed') && getComputedStyle(s.querySelector('.tiles')).display === 'none' && getComputedStyle(b.querySelector('svg')).color === GOLD && getComputedStyle(b.querySelector('svg')).transform === 'matrix(0, 1, -1, 0, 0, 0)' && b.getAttribute('aria-label') === 'Show Training (1 to revisit)'; }, GOLD),
    'Home: folded, Training still shows there is something to review: the arrow stays lit and says "Show Training (1 to revisit)"');
  await pg.click('.section:nth-of-type(2) .section-toggle'); await pg.waitForTimeout(250);
  await pg.click('#profile-btn'); await pg.waitForTimeout(400);
  const pf = pg.frames().find(f => f.url().endsWith('/profile.html'));
  ok(await pg.evaluate(() => location.hash === '#/profile' && !document.getElementById('app').hidden && document.getElementById('app-title').textContent === 'Profile') && !!pf, 'the Profile button opens the Profile page in the app view');
  ok(await pf.evaluate(() => { const x = e => e.getBoundingClientRect(), cards = [...document.querySelectorAll('.pf-card')], svg = document.querySelector('[data-chart="phonemes"] svg'), host = svg.parentElement;
    return cards.length === 4 && cards.map(c => c.dataset.game).join() === 'phonemes,diacritics,conjuncts,words' && document.getElementById('stat').textContent === '5 sessions'
      && Math.abs(x(svg).width - x(host).width) < 1 && x(svg).height > 200 && svg.querySelectorAll('path.line').length === 2 && svg.querySelectorAll('circle.dot.early').length === 2
      && getComputedStyle(svg.querySelectorAll('path.line')[0]).stroke !== getComputedStyle(svg.querySelectorAll('path.line')[1]).stroke && getComputedStyle(svg.querySelector('path.line')).strokeWidth === '2px'
      && getComputedStyle(svg.querySelector('circle.dot.early')).fill === getComputedStyle(document.querySelector('.pf-card')).backgroundColor
      && document.querySelectorAll('.pf-empty').length === 3 && x(document.querySelector('.pf-empty')).height > 30 && document.documentElement.scrollWidth <= innerWidth; }),
    'Profile: a card for each of the four games; Phonemes has its chart (two lines in two colors, a hollow dot on each for the session that ended in game over), the other three say "No sessions yet"');
  await pf.hover('[data-chart="phonemes"] svg', { position: { x: 200, y: 120 } }); await pg.waitForTimeout(100);
  ok(await pf.evaluate(() => { const tip = document.querySelector('[data-chart="phonemes"] .pf-tip'), box = tip.getBoundingClientRect(), host = tip.parentElement.getBoundingClientRect();
    return !tip.hidden && box.width > 100 && box.left >= host.left - 1 && box.right <= host.right + 1 && /^Run \d · /.test(tip.textContent) && /correct of \d+ cards/.test(tip.textContent) && /% errors \(\d+ of \d+ answers\)/.test(tip.textContent)
      && getComputedStyle(document.querySelector('[data-chart="phonemes"] .cross')).visibility === 'visible'; }), 'Profile: pointing at the chart reads out the nearest run (its number and date, correct answers, error rate) beside a reading line');
  ok(await pf.evaluate(() => { const x = s => document.querySelector(s).getBoundingClientRect(), zone = document.querySelector('.pf-danger'), btn = document.getElementById('reset'), last = [...document.querySelectorAll('.pf-card')].pop().getBoundingClientRect(), bg = getComputedStyle(btn).backgroundColor.match(/\d+/g).map(Number);
    return x('.pf-danger').top >= last.bottom && zone.querySelector('h2').textContent === 'Danger Zone' && zone.contains(btn) && !btn.disabled && btn.textContent === 'Reset statistics'
      && bg[0] > 200 && bg[1] < 140 && bg[2] < 140 && getComputedStyle(zone.querySelector('h2')).color === getComputedStyle(btn).backgroundColor && getComputedStyle(zone).borderTopColor !== getComputedStyle(document.querySelector('.pf-card')).borderTopColor; }),
    'Profile: the Danger Zone sits under all the charts, labeled in red, with a red "Reset statistics" button');
  await pf.click('#reset');
  ok(await pf.evaluate(() => document.getElementById('reset').textContent === 'Click again to erase all history' && TeluguProgress.runCount() === 5), 'Profile: the first click only asks for a second one');
  await pf.click('#reset'); await pg.waitForTimeout(150);
  ok(await pf.evaluate(() => TeluguProgress.runCount() === 0 && TeluguProgress.missCount() === 0 && document.querySelectorAll('.pf-empty').length === 4 && !document.querySelector('[data-chart]') && document.getElementById('stat').textContent === '0 sessions' && document.getElementById('reset').disabled),
    'Profile: the second click erases every session and the Review list; the four cards are empty and the button has nothing left to erase');
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(250);
  await pg.mouse.move(5, 5);
  rl = await reviewLook();
  ok(rl.badge === null && rl.border === PLAIN && rl.ring === 'none' && rl.arrows.every(c => c === MUTED), 'and Home shows nothing waiting: the Review tile and the Training arrow are plain again, with no count');
  // Fonts. A font file that is missing or broken raises no error: the page is simply drawn in a font of the device. So ask the browser.
  { const fr = await frameOf('phonemes'); await fr.evaluate(() => document.fonts.ready); await pg.waitForTimeout(200);
    const f = await fr.evaluate(() => ({ faces: [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family.replace(/"/g, '')),
      files: [...new Set(performance.getEntriesByType('resource').map(r => new URL(r.name).pathname).filter(n => /\.woff2$/.test(n)))].sort() }));
    ok(['Inter', 'Noto Sans', 'Noto Sans Telugu'].every(n => f.faces.includes(n)), 'Phonemes is drawn in Inter, Noto Sans, and Noto Sans Telugu, all loaded: ' + [...new Set(f.faces)].join(', '));
    ok(f.files.length === 3 && f.files.every(n => /^\/fonts\/(inter|noto-sans|noto-sans-telugu)-v\d+\.woff2$/.test(n)), 'from three files in the app\'s own fonts/ folder, each fetched once: ' + f.files.join(' ')); }
  ok(!outside.some(h => /(^|\.)(googleapis|gstatic)\.com$/.test(h)), 'no page asked another site for a font' + (outside.length ? ' (sites asked: ' + [...new Set(outside)].join(', ') + ')' : ''));
  ok(errs.length === 0, 'no script errors on any page' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  ok(missing.length === 0, 'no 404s' + (missing.length ? ': ' + missing.slice(0, 5).join(' | ') : ''));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
