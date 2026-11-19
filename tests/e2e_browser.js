const { SITE_DIR } = require('./config');
// Real browser, real folders: every tile opens its page inside the home page's iframe with no script errors.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = SITE_DIR; let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const mime = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html; charset=utf-8' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(8779);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; const missing = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) missing.push(r.status() + ' ' + r.url()); });
  // Nothing outside this folder is fetched: not the web fonts, and not the thumbnails the External Links page takes from other sites.
  await pg.route(u => u.hostname !== 'localhost', rt => rt.abort());
  await pg.goto('http://localhost:8779/index.html'); await pg.waitForTimeout(300);
  const tiles = await pg.evaluate(() => TeluguUnits.all.map(t => ({ id: t.id, src: t.src, title: t.title, soon: !!t.soon })));
  ok(tiles.length === 44, tiles.length + ' tiles (43 + Review)');
  let opened = 0, titled = 0;
  for (const t of tiles) {
    await pg.evaluate(id => { location.hash = '#/' + id; }, t.id); let fr; for (let i = 0; i < 40 && !fr; i++) { await pg.waitForTimeout(50); fr = pg.frames().find(f => f.url().endsWith('/' + t.src)); }
    if (!fr) console.log('   not loaded:', t.id, t.src, pg.frames().map(f => f.url()).join(' '));
    if (fr) { opened++; await fr.waitForLoadState('load').catch(() => {}); if (await fr.title()) titled++; else console.log('   no title:', t.src); }
  }
  ok(opened === 44, 'every tile loads its page in the iframe at the right path: ' + opened + '/44');
  ok(titled === 44, 'every loaded page has a title');
  // the live pages actually initialize (their shared scripts were found)
  const live = { 'alphabet/01_phonemes.html': 'TeluguData', 'alphabet/02_diacritics.html': 'TeluguData', 'alphabet/03_conjuncts.html': 'TeluguData', 'alphabet/04_lookalike-builder.html': 'LookalikeData', 'alphabet/05_lookalikes.html': 'LookalikeData', 'reference/01_rosetta.html': 'RosettaData', 'reference/02_signs-conjuncts.html': 'SignsConjunctsData', 'reference/03_sound-charts.html': 'SoundChartsData' };
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
  await top.waitForFunction(() => !document.getElementById('flip-title').classList.contains('is-te'), null, { timeout: 7000 }); await pg.waitForTimeout(700);
  let tn = await titleNow();
  ok(tn.cards.length === 6 && tn.cards.every(c => c.vars && c.la > 5 && c.te > 5 && Math.abs(c.w - c.la) < 0.6 && (c.m === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(c.m))) && tn.line < 45 && tn.sr <= 1,
    'the title shows "Telugu Telusu": six cards, each measured and as wide as its Latin face, on one line');
  await top.waitForFunction(() => document.getElementById('flip-title').classList.contains('is-te'), null, { timeout: 7000 });
  ok(true, 'left alone, the title turns over by itself (within the 5 seconds between flips)');
  await pg.waitForTimeout(700);
  tn = await titleNow();
  ok(tn.cards.every(c => Math.abs(c.w - c.te) < 0.6 && /^matrix3d\(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0,/.test(c.m)) && tn.cards.some(c => Math.abs(c.la - c.te) > 2), 'about half a second later every card has turned to its Telugu face and taken that face\'s width');
  ok(await css(top, ':root', '--accent-glow') === 'rgba(201, 152, 26, 0.16)', 'home page takes its color tokens from base.css (accent glow 0.16)');
  // a section folds away to its heading line, and opens again
  const fold = () => top.evaluate(() => { const s = document.querySelectorAll('.section')[1], b = s.querySelector('.section-toggle');
    return { h: Math.round(s.getBoundingClientRect().height), tiles: getComputedStyle(s.querySelector('.tiles')).display, turned: getComputedStyle(b.querySelector('svg')).transform !== 'none', line: getComputedStyle(s.querySelector('.section-head')).borderBottomWidth }; });
  const open0 = await fold();
  await pg.click('.section:nth-of-type(2) .section-toggle'); await pg.waitForTimeout(250);
  const shut0 = await fold();
  ok(open0.h > 200 && open0.tiles === 'grid' && !open0.turned && shut0.h < 40 && shut0.tiles === 'none' && shut0.turned && shut0.line === '1px', 'the arrow folds a section down to its heading line (' + open0.h + 'px → ' + shut0.h + 'px) and turns to the side');
  await pg.click('.section:nth-of-type(2) .section-toggle'); await pg.waitForTimeout(250);
  ok((await fold()).h === open0.h, 'and opens it again');
  let fr0 = await frameOf('vocab-greetings');
  ok(await css(fr0, '.unit-icon', 'width') === '52px' && await css(fr0, '.facts', 'border-radius') === '16px' && await css(fr0, 'body', 'background-color') === 'rgb(11, 12, 24)', 'a placeholder is styled by shell.css');
  ok(await fr0.evaluate(() => document.querySelector('h1').textContent + '|' + document.querySelectorAll('.fact').length) === 'Greetings|3', 'a placeholder draws its title and three lines from units.js');
  let soonOk = 0; for (const t of tiles.filter(t => t.soon)) { const f = await frameOf(t.id); if (f && await f.evaluate(want => document.querySelector('h1') && document.querySelector('h1').textContent === want && !!document.querySelector('.pill.soon'), t.title)) soonOk++; else console.log('   placeholder not drawn:', t.id); }
  ok(soonOk === 34, 'all 34 placeholders draw in the browser: ' + soonOk + '/34');
  for (const id of ['rosetta', 'signs-conjuncts', 'sound-charts']) { const f = await frameOf(id);
    ok(await css(f, '.g-header', 'position') === 'sticky' && await css(f, 'html', 'overflow-y') === 'auto' && await css(f, 'body', 'overflow-y') === 'visible' && await css(f, '.jump a', 'border-radius') === '999px' && await css(f, '.wrap', 'display') === 'grid', id + ' is styled by reference.css on top of game.css'); }
  ok(await css(await frameOf('signs-conjuncts'), '.wrap', 'row-gap') === '16px' && await css(await frameOf('rosetta'), '.wrap', 'row-gap') === '14px', 'a reference page\'s own <style> still wins over reference.css');
  fr0 = await frameOf('links');
  ok(await fr0.evaluate(() => { const g = s => getComputedStyle(document.querySelector(s)); const t = [...document.querySelectorAll('a.tile.link')].map(e => e.getBoundingClientRect());
    return t.length === 6 && g('.tiles').display === 'grid' && g('.tile.link').borderRadius === '16px' && g('.tile-thumb').height === '96px' && g('.tile-page').overflowY === 'auto' && t[0].top === t[1].top && t[1].left > t[0].right; }),
    'External Links is laid out by home.css: a grid of tiles, each with a thumbnail band, in a page that scrolls');
  await fr0.waitForFunction(() => !document.querySelector('.tile-thumb img'), null, { timeout: 5000 }).catch(() => {});
  ok(await fr0.evaluate(() => [...document.querySelectorAll('.tile-thumb')].map(b => b.querySelector('img') ? '?' : b.textContent.trim()).join('')) === 'WWWOTL', 'with the other sites out of reach, every link tile falls back to its site initial');
  fr0 = await frameOf('sound-charts');
  ok(await fr0.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), v = r('#vowel-chart svg'), g = c => getComputedStyle(document.querySelector(c));
    return v.width > 300 && v.height > 150 && g('#cons .ph.both').backgroundColor !== g('#cons .ph.te').backgroundColor && g('#cons th.row').position === 'sticky' && g('#vowel-chart').overflowX === 'auto' && g('#cons .tel .te').fontFamily.includes('Noto Sans Telugu'); }),
    'Sound Charts draws the vowel chart and the grid: shared sounds highlighted, row names pinned, both charts scroll sideways inside their own box');
  ok(await fr0.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Sound Charts never makes the page itself scroll sideways');
  for (const [id, total] of [['phonemes', 51], ['diacritics', 51], ['conjuncts', 40], ['lookalikes', 40]]) { fr0 = await frameOf(id);
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
  await pg.waitForTimeout(1200);
  ok(await fr0.evaluate(t => { const f = document.getElementById('feedback'); return f.textContent === '✗  /' + t + '/' && f.getBoundingClientRect().height > 0 && GameCore.current.locked; }, pickedText), 'a wrong pick is shown under the card (✗ and the key that was pressed) and is still there after 1.2 seconds');
  await pg.waitForTimeout(600);
  ok(await fr0.evaluate(() => document.getElementById('feedback').textContent === '' && !GameCore.current.locked), 'and gone by 1.8 seconds, with the next card ready');
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
      title + ' opens with the session popup covering the page (' + rounds + ' rounds of ' + top + ', unlimited misses), with no ⋮ menu or 🔀 left in the header');
    await fr0.fill('#setup-rounds-n', '3'); await fr0.evaluate(() => { const m = document.getElementById('setup-misses'); m.value = 2; m.dispatchEvent(new Event('input', { bubbles: true })); });
    await fr0.press('#setup-rounds-n', 'Enter'); await pg.waitForTimeout(150);
    ok(await fr0.evaluate(() => { const st = document.getElementById('s-lives'), r = st.getBoundingClientRect(), c = document.getElementById('s-total').getBoundingClientRect();
      return document.getElementById('setup').hidden && GameCore.current.total === 3 && GameCore.current.limit === 2 && !st.hidden && r.width > 0 && r.left > c.right && Math.abs((r.top + r.bottom) / 2 - (c.top + c.bottom) / 2) < 4 && st.textContent === '\u{1F90D}\u{1F9E1}' && st.getAttribute('aria-label') === 'Mistakes left: 2' && document.documentElement.scrollWidth <= innerWidth; }),
      title + ': Enter starts 3 rounds with 2 mistakes allowed; the header shows two hearts (white, orange) after the counters, on their line');
    ok(await fr0.evaluate(() => { const g = GameCore.current, st = document.getElementById('s-lives'), seen = [20, 4, 3, 2, 1, 0].map(n => { g.start({ misses: n });
        const r = st.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(st); const t = range.getBoundingClientRect();
        return { w: Math.round(r.width * 10), total: Math.round(document.getElementById('s-total').getBoundingClientRect().left * 10), rem: Math.round(document.getElementById('s-rem').getBoundingClientRect().left * 10), fits: t.width <= r.width + 0.5, flush: Math.abs(t.right - r.right) < 2 }; });
      return seen.every(s => s.w === seen[0].w && s.total === seen[0].total && s.rem === seen[0].rem && s.fits && s.flush); }),
      title + ': the hearts keep one width at 20, 4, 3, 2, 1, and 0 left, at the right of their box, so the counters beside them do not move');
    await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(150);
  }
  fr0 = await frameOf('lookalike-builder');
  ok(await fr0.evaluate(() => document.querySelectorAll('#kCons .key').length === TeluguData.consonants.length && document.querySelectorAll('#kDigits .key').length === TeluguData.digits.length && !!LookalikeData.rows), 'the Lookalike Builder draws its keys from TeluguData and has LookalikeData\'s CSV reader');
  // its bar (the switch, the character, its lookalikes) stays under the header while the keyboard scrolls
  await fr0.click('#kb .key[data-ch="క"]');
  ok(await fr0.evaluate(() => { const g = s => getComputedStyle(document.querySelector(s)); return document.querySelector('.mode-opt[aria-checked="true"]').dataset.mode === 'looks' && g('.kb').borderTopColor === g('.mode-opt[aria-checked="true"]').borderTopColor && g('.keys.c').gridTemplateColumns.split(' ').length === 10; }),
    'the Lookalike Builder: choosing a character switches to "Looks like" (keyboard outlined in gold); consonants run ten to a row on a wide screen');
  ok(await fr0.evaluate(async () => { window.scrollTo(0, 400); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const t = s => Math.round(document.querySelector(s).getBoundingClientRect().top), h = document.querySelector('.g-header').offsetHeight;
    const r = window.scrollY > 100 && t('.g-header') === 0 && t('.pick') === h; window.scrollTo(0, 0); return r; }), 'the Lookalike Builder: the header and the character bar stay in view when the page scrolls');
  // the reference pages: the header stays at the top (the window scrolls, not <body>)
  for (const id of ['rosetta', 'signs-conjuncts', 'sound-charts']) { const f = await frameOf(id);
    ok(await f.evaluate(async () => { window.scrollTo(0, 600); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const r = window.scrollY > 300 && Math.round(document.querySelector('.g-header').getBoundingClientRect().top) === 0 && document.body.scrollTop === 0; window.scrollTo(0, 0); return r; }),
      id + ': the header stays in view when the page scrolls'); }
  // The notation chosen on the home page reaches the next page opened (each page is loaded afresh from Home)
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(150);
  ok(await top.evaluate(() => [...document.querySelectorAll('#prefs .seg-opt')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join(' ')) === 'IPA* ISO', 'home shows the IPA | ISO control, IPA selected');
  ok(await css(top, '.seg-opt.on', 'background-color') !== await css(top, '.seg-opt:not(.on)', 'background-color') && await css(top, '.prefs', 'margin-left') !== '0px', 'the control is styled by home.css (selected option highlighted, set to the right of the title)');
  await pg.click('#prefs .seg-opt[data-value="iso"]');
  fr0 = await frameOf('phonemes');
  ok(await fr0.evaluate(() => document.getElementById('g-title').textContent + '|' + [...document.querySelectorAll('.kb-btn')].find(b => b.dataset.ch === 'క').textContent + '|' + TeluguData.notation.id) === 'Telugu → ISO|ka|iso', 'after choosing ISO, Phonemes opens in ISO (title "Telugu → ISO", key "ka")');
  fr0 = await frameOf('conjuncts');
  ok(await fr0.evaluate(() => { document.getElementById('rev-btn').click(); document.getElementById('setup-start').click(); GameCore.current.put(TeluguData.clusters.find(c => c.glyph === 'క్ష')); const t = document.getElementById('tel-char'); return t.textContent + '|' + getComputedStyle(t).fontFamily.split(',')[0].replace(/['"]/g, ''); }) === 'kṣa|Noto Sans', 'Conjuncts reversed shows kṣa on the card, in the Latin face');
  fr0 = await frameOf('sound-charts');
  ok(await fr0.evaluate(() => { const k = [...document.querySelectorAll('#cons .ph')].find(p => p.dataset.ipa === 'k'); return k.querySelector('.tel .snd').textContent + '|' + k.querySelector('.eng .snd').textContent; }) === 'ka|/k/', 'Sound Charts in ISO: క is labeled ka, English k stays /k/');
  fr0 = await frameOf('review');
  ok(await fr0.evaluate(() => !!window.TeluguData && TeluguData.notation.id === 'iso'), 'Review loads the letter data and the notation too');
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(150);
  ok(await top.evaluate(() => document.querySelector('#prefs .seg-opt.on').textContent) === 'ISO', 'the choice is still selected back on Home');
  await pg.click('#prefs .seg-opt[data-value="ipa"]');
  fr0 = await frameOf('phonemes');
  ok(await fr0.evaluate(() => document.getElementById('g-title').textContent + '|' + [...document.querySelectorAll('.kb-btn')].find(b => b.dataset.ch === 'క').textContent) === 'Telugu → IPA|k', 'and choosing IPA again puts Phonemes back in IPA');
  // progress still flows from a game in the iframe to the home page's ✓
  await pg.evaluate(() => { location.hash = '#/phonemes'; }); await pg.waitForTimeout(250);
  const fr = pg.frames().find(f => f.url().endsWith('alphabet/01_phonemes.html'));
  const wrote = await fr.evaluate(() => { TeluguProgress.complete('phonemes'); return TeluguProgress.isComplete('phonemes'); });
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(250);
  ok(wrote && await pg.evaluate(() => !!document.querySelector('.tile-check')), 'completing a game inside its folder still puts the ✓ on the home tile');
  ok(errs.length === 0, 'no script errors on any page' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  ok(missing.length === 0, 'no 404s' + (missing.length ? ': ' + missing.slice(0, 5).join(' | ') : ''));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
