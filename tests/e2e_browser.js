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
  // the live pages actually initialise (their shared scripts were found)
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
  ok(await css(top, ':root', '--accent-glow') === 'rgba(201, 152, 26, 0.16)', 'home page takes its colour tokens from base.css (accent glow 0.16)');
  let fr0 = await frameOf('vocab-greetings');
  ok(await css(fr0, '.unit-icon', 'width') === '52px' && await css(fr0, '.facts', 'border-radius') === '16px' && await css(fr0, 'body', 'background-color') === 'rgb(11, 12, 24)', 'a placeholder is styled by shell.css');
  ok(await fr0.evaluate(() => document.querySelector('h1').textContent + '|' + document.querySelectorAll('.fact').length) === 'Greetings|3', 'a placeholder draws its title and three lines from units.js');
  let soonOk = 0; for (const t of tiles.filter(t => t.soon)) { const f = await frameOf(t.id); if (f && await f.evaluate(want => document.querySelector('h1') && document.querySelector('h1').textContent === want && !!document.querySelector('.pill.soon'), t.title)) soonOk++; else console.log('   placeholder not drawn:', t.id); }
  ok(soonOk === 34, 'all 34 placeholders draw in the browser: ' + soonOk + '/34');
  for (const id of ['rosetta', 'signs-conjuncts', 'sound-charts']) { const f = await frameOf(id);
    ok(await css(f, '.g-header', 'position') === 'sticky' && await css(f, 'body', 'overflow-y') === 'auto' && await css(f, '.jump a', 'border-radius') === '999px' && await css(f, '.wrap', 'display') === 'grid', id + ' is styled by reference.css on top of game.css'); }
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
  fr0 = await frameOf('lookalike-builder');
  ok(await fr0.evaluate(() => document.querySelectorAll('#kCons .key').length === TeluguData.consonants.length && document.querySelectorAll('#kDigits .key').length === TeluguData.digits.length && !!LookalikeData.rows), 'the Lookalike Builder draws its keys from TeluguData and has LookalikeData\'s CSV reader');
  // The notation chosen on the home page reaches the next page opened (each page is loaded afresh from Home)
  await pg.evaluate(() => { location.hash = ''; }); await pg.waitForTimeout(150);
  ok(await top.evaluate(() => [...document.querySelectorAll('#prefs .seg-opt')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join(' ')) === 'IPA* ISO', 'home shows the IPA | ISO control, IPA selected');
  ok(await css(top, '.seg-opt.on', 'background-color') !== await css(top, '.seg-opt:not(.on)', 'background-color') && await css(top, '.prefs', 'margin-left') !== '0px', 'the control is styled by home.css (selected option highlighted, set to the right of the title)');
  await pg.click('#prefs .seg-opt[data-value="iso"]');
  fr0 = await frameOf('phonemes');
  ok(await fr0.evaluate(() => document.getElementById('g-title').textContent + '|' + [...document.querySelectorAll('.kb-btn')].find(b => b.dataset.ch === 'క').textContent + '|' + TeluguData.notation.id) === 'Telugu → ISO|ka|iso', 'after choosing ISO, Phonemes opens in ISO (title "Telugu → ISO", key "ka")');
  fr0 = await frameOf('conjuncts');
  ok(await fr0.evaluate(() => { document.getElementById('rev-btn').click(); GameCore.current.put(TeluguData.clusters.find(c => c.glyph === 'క్ష')); const t = document.getElementById('tel-char'); return t.textContent + '|' + getComputedStyle(t).fontFamily.split(',')[0].replace(/['"]/g, ''); }) === 'kṣa|Noto Sans', 'Conjuncts reversed shows kṣa on the card, in the Latin face');
  fr0 = await frameOf('sound-charts');
  ok(await fr0.evaluate(() => { const k = [...document.querySelectorAll('#cons .ph')].find(p => p.dataset.ipa === 'k'); return k.querySelector('.tel .snd').textContent + '|' + k.querySelector('.eng .snd').textContent; }) === 'ka|/k/', 'Sound Charts in ISO: క is labelled ka, English k stays /k/');
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
