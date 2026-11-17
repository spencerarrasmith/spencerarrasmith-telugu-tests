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
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, rt => rt.abort());
  await pg.goto('http://localhost:8779/index.html'); await pg.waitForTimeout(300);
  const tiles = await pg.evaluate(() => TeluguUnits.all.map(t => ({ id: t.id, src: t.src, title: t.title, soon: !!t.soon })));
  ok(tiles.length === 42, tiles.length + ' tiles (41 + Review)');
  let opened = 0, titled = 0;
  for (const t of tiles) {
    await pg.evaluate(id => { location.hash = '#/' + id; }, t.id); let fr; for (let i = 0; i < 40 && !fr; i++) { await pg.waitForTimeout(50); fr = pg.frames().find(f => f.url().endsWith('/' + t.src)); }
    if (!fr) console.log('   not loaded:', t.id, t.src, pg.frames().map(f => f.url()).join(' '));
    if (fr) { opened++; await fr.waitForLoadState('load').catch(() => {}); if (await fr.title()) titled++; else console.log('   no title:', t.src); }
  }
  ok(opened === 42, 'every tile loads its page in the iframe at the right path: ' + opened + '/42');
  ok(titled === 42, 'every loaded page has a title');
  // the live pages actually initialise (their shared scripts were found)
  const live = { 'alphabet/01_phonemes.html': 'TeluguData', 'alphabet/02_diacritics.html': 'TeluguData', 'alphabet/03_conjuncts.html': 'TeluguData', 'alphabet/04_lookalike-builder.html': 'LookalikeData', 'alphabet/05_lookalikes.html': 'LookalikeData', 'reference/01_rosetta.html': 'RosettaData', 'reference/02_signs-conjuncts.html': 'SignsConjunctsData' };
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
  for (const id of ['rosetta', 'signs-conjuncts']) { const f = await frameOf(id);
    ok(await css(f, '.g-header', 'position') === 'sticky' && await css(f, 'body', 'overflow-y') === 'auto' && await css(f, '.jump a', 'border-radius') === '999px' && await css(f, '.wrap', 'display') === 'grid', id + ' is styled by reference.css on top of game.css'); }
  ok(await css(await frameOf('signs-conjuncts'), '.wrap', 'row-gap') === '16px' && await css(await frameOf('rosetta'), '.wrap', 'row-gap') === '14px', 'a reference page\'s own <style> still wins over reference.css');
  fr0 = await frameOf('phonemes');
  ok(await fr0.evaluate(() => !!window.GameCore && GameCore.current.id === 'phonemes' && GameCore.current.total === 51 && document.querySelectorAll('.kb-btn').length >= 51 && !!document.getElementById('retry-btn')), 'Phonemes runs on game-core.js (51 cards dealt, complete screen in place)');
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
