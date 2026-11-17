const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs');
const dir = (SITE_DIR + '/');
const html = fs.readFileSync(dir + 'index.html', 'utf8').replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(require('path').resolve(dir, require('path').dirname('index.html'), src), 'utf8') + '</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/index.html' });
const w = dom.window, d = w.document; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const U = w.TeluguUnits, S = U.sections, ALL = U.tiles;        // the home page draws what units.js lists
const src = fs.readFileSync(dir + 'index.html', 'utf8');
ok(/<script src="units\.js"><\/script>/.test(src) && !/\bsrc: ['"]/.test(src) && !/soon: true/.test(src), 'index.html holds no tile list of its own (it loads units.js)');
ok(/<link rel="stylesheet" href="home\.css">/.test(src) && !/<style/.test(src) && !/fonts\.googleapis/.test(src), 'index.html links home.css: no inline <style>, no font link of its own');
ok(S.map(s => s.title).join(' · ') === 'Resources · Alphabet · Grammar · Vocabulary · Advanced Grammar', 'section order (Resources first, above Phonemes)');
ok(S.map(s => s.tiles.length).join(',') === '5,8,8,12,8' && ALL.length === 41, 'tile counts 5/8/8/12/8 = 41');
ok(new Set(ALL.map(t => t.id)).size === ALL.length, 'tile ids unique');
ok(ALL.every(t => fs.existsSync(dir + t.src)), 'every src file exists');
ok(new Set(ALL.map(t => t.src)).size === ALL.length, 'every src is distinct');
ok(ALL.filter(t => !t.soon).map(t => t.id).join() === 'rosetta,signs-conjuncts,phonemes,diacritics,conjuncts,lookalike-builder,lookalikes', 'only the 7 built pages are live');
const FOLDERS = ['reference', 'alphabet', 'grammar', 'vocabulary', 'advanced-grammar'];
ok(S.every((s, i) => s.tiles.every((t, j) => t.src === FOLDERS[i] + '/' + String(j + 1).padStart(2, '0') + '_' + t.src.split('_').slice(1).join('_') && /^[a-z0-9-]+\.html$/.test(t.src.split('_').slice(1).join('_')))), 'every tile lives in its section folder, numbered in tile order (NN_name.html)');
ok(ALL.filter(t => t.id !== 'review').every(t => require('fs').existsSync(dir + t.src)), 'every tile src is an existing file');
ok(ALL.filter(t => t.id !== 'review').every(t => !/^(reference|grammar|vocab|advanced)-/.test(t.src.split('/')[1].replace(/^\d+_/, ''))), 'redundant section prefixes (grammar-, vocab-, advanced-, reference-) are gone from file names');
ok([...d.querySelectorAll('.section-count')].map(e => e.textContent).join('|') === '2 of 5 ready|5 of 8 ready|0 of 8 ready|0 of 12 ready|0 of 8 ready', 'ready counts');
ok(d.querySelectorAll('a.tile').length === 42 && d.querySelectorAll('a.tile.soon').length === 34 && d.querySelectorAll('.tile-badge').length === 35, '41 learning tiles + Review, 34 marked Soon (+ the Review count badge)');
(async () => {
  const wait = () => new Promise(r => setTimeout(r, 5));
  const frame = d.getElementById('app-frame');
  for (const t of ALL) {
    w.location.hash = '#/' + t.id; await wait();
    if (d.getElementById('app').hidden || frame.getAttribute('src') !== t.src || d.getElementById('app-title').textContent !== t.title) { ok(false, 'route ' + t.id); }
  }
  ok(true, 'all 41 routes open the right page and title');
  w.location.hash = '#/review'; await wait();
  ok(!d.getElementById('app').hidden && frame.getAttribute('src') === 'review.html' && d.getElementById('app-title').textContent === 'Review', 'Review route opens review.html');
  w.location.hash = '#/'; await wait();
  ok(!d.getElementById('home').hidden && d.getElementById('app').hidden && !frame.hasAttribute('src'), 'home resets the iframe');
  w.location.hash = '#/nonsense'; await wait();
  ok(!d.getElementById('home').hidden, 'unknown route falls back to home');
  // Review tile + ✓ marks driven by progress
  const P = w.TeluguProgress;
  ok(d.querySelector('.tile.review .tile-badge').textContent === 'All clear' && d.querySelectorAll('.tile-check').length === 0, 'fresh start: Review says "All clear", no ✓');
  P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/' }); P.miss({ game: 'conjuncts', key: 'క్ష', prompt: 'క్ష', answer: '/kʂa/' });
  ok(d.querySelector('.tile.review .tile-badge').textContent === '2 to revisit', 'a miss in any game updates the Review tile live');
  P.complete('phonemes', { accuracy: 90 });
  const tile = id => d.querySelector(`a.tile[href="#/${id}"]`);
  ok(!!tile('phonemes').querySelector('.tile-check') && !tile('diacritics').querySelector('.tile-check'), '✓ appears only on the completed tile');
  ok(d.querySelectorAll('.section-count')[1].textContent === '5 of 8 ready · 1 done', 'Alphabet count shows "· 1 done": ' + d.querySelectorAll('.section-count')[1].textContent);
  ok(!tile('phonemes').classList.contains('soon') && !tile('spelling').querySelector('.tile-check'), 'placeholder tiles never get a ✓');
  // coming back home from a game refreshes
  w.location.hash = '#/phonemes'; await wait(); P.miss({ game: 'diacritics', key: 'కా', prompt: 'కా', answer: '/kaː/' });
  w.location.hash = '#/'; await wait();
  ok(d.querySelector('.tile.review .tile-badge').textContent === '3 to revisit', 'returning home picks up changes');
  // placeholder pages themselves: e2e_placeholder
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
