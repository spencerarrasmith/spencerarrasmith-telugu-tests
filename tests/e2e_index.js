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
ok(S.map(s => s.title).join(' · ') === 'Reference · Alphabet · Grammar · Vocabulary · Advanced Grammar', 'section order (Reference first, above Phonemes)');
ok(S.map(s => s.tiles.length).join(',') === '7,8,8,12,8' && ALL.length === 43, 'tile counts 7/8/8/12/8 = 43');
ok(new Set(ALL.map(t => t.id)).size === ALL.length, 'tile ids unique');
ok(ALL.every(t => fs.existsSync(dir + t.src)), 'every src file exists');
ok(new Set(ALL.map(t => t.src)).size === ALL.length, 'every src is distinct');
ok(ALL.filter(t => !t.soon).map(t => t.id).join() === 'links,rosetta,signs-conjuncts,sound-charts,phonemes,diacritics,conjuncts,lookalike-builder,lookalikes', 'only the 9 built pages are live');
const FOLDERS = ['reference', 'alphabet', 'grammar', 'vocabulary', 'advanced-grammar'];
// a folder's numbering starts at 01, or at 00 when it opens with a page that is not a unit (the external links)
ok(S.every((s, i) => { const first = +s.tiles[0].src.split('/')[1].slice(0, 2); return first <= 1 && s.tiles.every((t, j) => t.src === FOLDERS[i] + '/' + String(j + first).padStart(2, '0') + '_' + t.src.split('_').slice(1).join('_') && /^[a-z0-9-]+\.html$/.test(t.src.split('_').slice(1).join('_'))); }), 'every tile lives in its section folder, numbered in tile order (NN_name.html)');
ok(ALL.filter(t => t.id !== 'review').every(t => require('fs').existsSync(dir + t.src)), 'every tile src is an existing file');
ok(ALL.filter(t => t.id !== 'review').every(t => !/^(reference|grammar|vocab|advanced)-/.test(t.src.split('/')[1].replace(/^\d+_/, ''))), 'redundant section prefixes (grammar-, vocab-, advanced-, reference-) are gone from file names');
ok([...d.querySelectorAll('.section-count')].map(e => e.textContent).join('|') === '4 of 7 ready|5 of 8 ready|0 of 8 ready|0 of 12 ready|0 of 8 ready', 'ready counts');
ok(d.querySelectorAll('a.tile').length === 44 && d.querySelectorAll('a.tile.soon').length === 34 && d.querySelectorAll('.tile-badge').length === 35, '43 learning tiles + Review, 34 marked Soon (+ the Review count badge)');
(async () => {
  const wait = () => new Promise(r => setTimeout(r, 5));
  const frame = d.getElementById('app-frame');
  for (const t of ALL) {
    w.location.hash = '#/' + t.id; await wait();
    if (d.getElementById('app').hidden || frame.getAttribute('src') !== t.src || d.getElementById('app-title').textContent !== t.title) { ok(false, 'route ' + t.id); }
  }
  ok(true, 'all 43 routes open the right page and title');
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
  /* ── how sounds are written: the one app-wide setting, chosen here ── */
  const seg = () => [...d.querySelectorAll('#prefs .seg-opt')], on = () => seg().filter(b => b.classList.contains('on')).map(b => b.dataset.value).join();
  ok(d.querySelector('header.hero #prefs .pref[role=radiogroup]') && seg().map(b => b.textContent).join('|') === 'IPA|ISO' && seg().every(b => b.getAttribute('role') === 'radio' && b.title.length > 10), 'the hero holds a "Sounds as" control with two options, IPA and ISO');
  ok(on() === 'ipa' && seg()[0].getAttribute('aria-checked') === 'true' && seg()[1].getAttribute('aria-checked') === 'false' && d.getElementById('pref-eg').textContent === 'క is written /k/', 'IPA is selected on a first visit; the example reads "క is written /k/"');
  ok(w.localStorage.getItem('telugu.settings.v1') === null, 'nothing is stored until a choice is made');
  seg()[1].click();
  ok(on() === 'iso' && seg()[1].getAttribute('aria-checked') === 'true' && d.getElementById('pref-eg').textContent === 'క is written ka', 'choosing ISO selects it; the example becomes "క is written ka"');
  ok(JSON.parse(w.localStorage.getItem('telugu.settings.v1')).notation === 'iso' && w.TeluguSettings.get('notation') === 'iso', 'the choice is saved for every other page');
  ok(d.querySelectorAll('a.tile').length === 44 && d.querySelector('.tile.review .tile-badge').textContent === '3 to revisit', 'the tiles are untouched by the change');
  seg()[1].click(); ok(on() === 'iso', 'choosing the selected option again changes nothing');
  w.TeluguSettings.set('notation', 'ipa'); ok(on() === 'ipa' && d.getElementById('pref-eg').textContent === 'క is written /k/', 'a change made elsewhere (another tab) shows here at once');
  ok(!/telugu-data\.js/.test(src) && /Settings\.set\('notation'/.test(src), 'the home page only stores the choice; it loads no letter data');
  /* ── a section folds away to its heading line ── */
  {
    const KEY = 'telugu.home.v1';
    const sec = t => d.querySelector(`.section[data-section="${t}"]`), btn = t => sec(t).querySelector('.section-toggle'), tiles = t => sec(t).querySelector('.tiles');
    const stored = win => JSON.parse(win.localStorage.getItem(KEY) || '{}').collapsed || [];
    ok(S.every(s => btn(s.title) && btn(s.title).tagName === 'BUTTON' && btn(s.title).closest('.section-head') && btn(s.title).querySelector('svg path')), 'every section heading ends in an arrow button');
    ok(S.every(s => btn(s.title).getAttribute('aria-expanded') === 'true' && btn(s.title).getAttribute('aria-controls') === tiles(s.title).id && btn(s.title).getAttribute('aria-label') === 'Hide ' + s.title && !tiles(s.title).hidden && !sec(s.title).classList.contains('collapsed')),
      'all sections start open; each button says what it will do ("Hide Alphabet") and names the tiles it controls');
    ok(w.localStorage.getItem(KEY) === null && !d.querySelector('.featured .section-toggle'), 'nothing is stored until a section is folded; the Review strip has no arrow');
    btn('Alphabet').click();
    ok(tiles('Alphabet').hidden && sec('Alphabet').classList.contains('collapsed') && btn('Alphabet').getAttribute('aria-expanded') === 'false' && btn('Alphabet').getAttribute('aria-label') === 'Show Alphabet' && btn('Alphabet').title === 'Show Alphabet',
      'the arrow folds its section: tiles hidden, button now reads "Show Alphabet"');
    ok(sec('Alphabet').querySelector('.section-title').textContent === 'Alphabet' && sec('Alphabet').querySelector('.section-count').textContent === '5 of 8 ready · 1 done', 'the heading line stays, with its name and count');
    ok(S.filter(s => s.title !== 'Alphabet').every(s => !tiles(s.title).hidden && btn(s.title).getAttribute('aria-expanded') === 'true'), 'the other sections are not touched');
    ok(stored(w).join() === 'Alphabet', 'the folded section is remembered in this browser');
    ok(d.querySelectorAll('a.tile').length === 44 && tiles('Alphabet').querySelectorAll('a.tile').length === 8, 'its tiles are still there, only hidden');
    w.location.hash = '#/rosetta'; await wait(); w.location.hash = '#/'; await wait();
    ok(tiles('Alphabet').hidden && btn('Alphabet').getAttribute('aria-expanded') === 'false' && !tiles('Reference').hidden, 'it is still folded after opening a page and coming back');
    P.complete('diacritics', { accuracy: 80 });
    ok(tiles('Alphabet').hidden && sec('Alphabet').querySelector('.section-count').textContent === '5 of 8 ready · 2 done', 'a folded section keeps counting: ' + sec('Alphabet').querySelector('.section-count').textContent);
    w.location.hash = '#/phonemes'; await wait();
    ok(!d.getElementById('app').hidden && frame.getAttribute('src') === 'alphabet/01_phonemes.html', 'a page in a folded section still opens by its address');
    w.location.hash = '#/'; await wait();
    btn('Grammar').click(); btn('Alphabet').click();
    ok(!tiles('Alphabet').hidden && !sec('Alphabet').classList.contains('collapsed') && btn('Alphabet').getAttribute('aria-expanded') === 'true' && btn('Alphabet').getAttribute('aria-label') === 'Hide Alphabet' && stored(w).join() === 'Grammar',
      'the arrow opens it again; only Grammar is now remembered as folded');
    // the next visit: the stored sections start folded, and a stored name that no longer exists is ignored
    const visit = value => new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/index.html', beforeParse(win) { if (value !== undefined) win.localStorage.setItem(KEY, value); } }).window;
    const folded = win => [...win.document.querySelectorAll('.section.collapsed')].map(s => s.dataset.section).join();
    let v = visit(JSON.stringify({ collapsed: ['Grammar', 'Vocabulary', 'Resources'] }));
    ok(folded(v) === 'Grammar,Vocabulary' && [...v.document.querySelectorAll('.section.collapsed .tiles')].every(t => t.hidden) && v.document.querySelectorAll('.section-toggle[aria-expanded="false"]').length === 2, 'on the next visit the same sections start folded (a section that no longer exists is ignored)');
    ok(['not json', 'null', '[]', '{"collapsed":"Grammar"}', '{"collapsed":[1,null]}'].every(x => folded(visit(x)) === '' ), 'unreadable storage leaves every section open');
    v = visit(); v.Storage.prototype.setItem = () => { throw new Error('blocked'); };
    v.document.querySelector('.section-toggle').click();
    ok(folded(v) === 'Reference', 'with storage blocked the arrow still works for this visit');
    ok(/\.section-toggle\[aria-expanded="false"\] svg \{ transform: rotate\(-90deg\); \}/.test(fs.readFileSync(dir + 'home.css', 'utf8')) && /\.section\.collapsed/.test(fs.readFileSync(dir + 'home.css', 'utf8')), 'home.css turns the arrow to the side and tightens a folded section');
  }
  /* ── the title turns over: "Telugu Telusu" ⇄ తెలుగు తెలుసు, a card to a syllable, every 5 seconds ── */
  {
    const open = before => new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/index.html', beforeParse: before }).window;
    const timers = [], v = open(win => { win.setInterval = (fn, ms) => { timers.push({ fn, ms }); return timers.length; }; }), vd = v.document;
    const h1 = vd.getElementById('hero-title'), t = vd.getElementById('flip-title'), cards = [...t.querySelectorAll('.flip')], css = fs.readFileSync(dir + 'home.css', 'utf8');
    ok(/<h1 class="hero-title" id="hero-title">Telugu Telusu<\/h1>/.test(src) && h1.querySelector('.sr-only').textContent === 'Telugu Telusu' && t.getAttribute('aria-hidden') === 'true' && h1.children.length === 2,
      'the title is plain "Telugu Telusu" in the page; the script adds the cards, and a screen reader still gets "Telugu Telusu"');
    ok(cards.map(c => c.querySelector('.flip-face.la').textContent + '/' + c.querySelector('.flip-face.te').textContent).join(' ') === 'Te/తె lu/లు gu/గు Te/తె lu/లు su/సు', 'six cards, Latin on the front and Telugu on the back: Te/తె lu/లు gu/గు · Te/తె lu/లు su/సు');
    ok([...t.querySelectorAll('.flip-word')].map(wd => wd.querySelectorAll('.flip').length).join() === '3,3' && t.textContent === 'Teతెluలుguగు Teతెluలుsuసు' && cards.every(c => c.querySelector('.te').getAttribute('lang') === 'te' && c.children.length === 1 && c.firstElementChild.className === 'flip-in'),
      'two words of three cards, with a space between; each Telugu face is marked lang="te"');
    ok(cards.map(c => c.getAttribute('style').replace(/\s|;/g, '')).join() === '--i:0,--i:1,--i:2,--i:3,--i:4,--i:5', 'the cards are numbered left to right, so they turn one after another');
    ok(timers.length === 1 && timers[0].ms === 5000 && !t.classList.contains('is-te'), 'it starts in Latin, with one timer: every 5 seconds');
    timers[0].fn(); ok(t.classList.contains('is-te'), 'the timer turns the title to Telugu');
    timers[0].fn(); ok(!t.classList.contains('is-te'), 'and the next time back to Latin');
    vd.getElementById('home').hidden = true; timers[0].fn();
    ok(!t.classList.contains('is-te'), 'while a lesson is open (the home view hidden) it stays as it is');
    vd.getElementById('home').hidden = false; timers[0].fn(); ok(t.classList.contains('is-te'), 'and carries on when Home is back');
    const turn = +(css.match(/\.flip \{[^}]*--turn: ([\d.]+)s;/) || [])[1], lag = +(css.match(/\.flip \{[^}]*--wait: calc\(var\(--i, 0\) \* (\d+)ms\);/) || [])[1];
    ok(turn > 0 && lag > 0 && Math.abs(turn + 5 * lag / 1000 - 0.5) < 0.051, 'the whole flip takes about half a second: ' + turn + ' s a card, the last of six starting ' + 5 * lag + ' ms after the first (home.css)');
    ok(/\.flip-title\.is-te \.flip-in \{ transform: rotateY\(180deg\); \}/.test(css) && /\.flip-in \{[^}]*transform-style: preserve-3d;[^}]*transition: transform var\(--turn\) ease var\(--wait\)/.test(css) && /\.flip-face \{[^}]*backface-visibility: hidden/.test(css) && /\.flip-face\.te \{[^}]*transform: rotateY\(180deg\);[^}]*Noto Sans Telugu/.test(css),
      'a card turns about its upright axis, its two faces back to back, the Telugu one in the Telugu font (home.css)');
    ok(/\.flip \{[^}]*width: var\(--la, auto\);[^}]*transition: width var\(--turn\) ease var\(--wait\)/.test(css) && /\.flip-title\.is-te \.flip \{ width: var\(--te, auto\); \}/.test(css), 'a card is as wide as the face it shows, and changes width as it turns (home.css)');
    ok(/@media \(prefers-reduced-motion: reduce\) \{ \.flip, \.flip-in \{ transition: none; \} \}/.test(css), 'no turning animation for a reader who asked for reduced motion (home.css)');
    // reduced motion: the cards are there, but nothing sets them turning
    const calm = [], q = open(win => { win.setInterval = (fn, ms) => { calm.push(ms); return 1; }; win.matchMedia = m => ({ matches: /prefers-reduced-motion: reduce/.test(m), media: m, addEventListener() {}, removeEventListener() {} }); });
    ok(calm.length === 0 && q.document.querySelectorAll('#flip-title .flip').length === 6 && q.document.querySelector('#hero-title .sr-only').textContent === 'Telugu Telusu', 'with reduced motion asked for, the title is built but never flips');
  }
  // placeholder pages themselves: e2e_placeholder
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
