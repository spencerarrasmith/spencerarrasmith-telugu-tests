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
ok(S.map(s => s.title).join(' · ') === 'Reference · Training · Alphabet · Grammar · Vocabulary · Advanced Grammar', 'section order (Reference first, then Training, above Alphabet)');
ok(S.map(s => s.tiles.length).join(',') === '8,4,4,8,12,8' && ALL.length === 44, 'tile counts 8/4/4/8/12/8 = 44');
ok(new Set(ALL.map(t => t.id)).size === ALL.length, 'tile ids unique');
ok(ALL.every(t => fs.existsSync(dir + t.src)), 'every src file exists');
ok(new Set(ALL.map(t => t.src)).size === ALL.length, 'every src is distinct');
ok(ALL.filter(t => !t.soon).map(t => t.id).join() === 'links,rosetta,signs-conjuncts,sound-charts,bookish,review,lookalike-builder,lookalikes,keyboard,phonemes,diacritics,conjuncts,words', 'only the 13 built pages are live');
const FOLDERS = ['reference', 'training', 'alphabet', 'grammar', 'vocabulary', 'advanced-grammar'];
// a folder's numbering starts at 01, or at 00 when it opens with a page that is not a unit (the external links)
ok(S.every((s, i) => { const first = +s.tiles[0].src.split('/')[1].slice(0, 2); return first <= 1 && s.tiles.every((t, j) => t.src === FOLDERS[i] + '/' + String(j + first).padStart(2, '0') + '_' + t.src.split('_').slice(1).join('_') && /^[a-z0-9-]+\.html$/.test(t.src.split('_').slice(1).join('_'))); }), 'every tile lives in its section folder, numbered in tile order (NN_name.html)');
ok(ALL.every(t => require('fs').existsSync(dir + t.src)), 'every tile src is an existing file');
ok(ALL.every(t => !/^(reference|grammar|vocab|advanced)-/.test(t.src.split('/')[1].replace(/^\d+_/, ''))), 'redundant section prefixes (grammar-, vocab-, advanced-, reference-) are gone from file names');
ok(d.querySelectorAll('.section-count').length === 0 && !/\d+ of \d+ ready/.test(d.getElementById('home').textContent) && !/readyCount|of \$\{[^}]*\} ready/.test(src) && [...d.querySelectorAll('.section-head')].every(h => h.children.length === 1 && h.firstElementChild.matches('h2.section-title')),
  'a section heading is its name and its arrow: no "x of y ready" count');
// the whole heading line is one button, inside the heading: the name at one end, the arrow at the other
{ const heads = [...d.querySelectorAll('.section-head')], b = h => h.querySelector('h2.section-title > button.section-toggle');
  ok(heads.length === 6 && heads.every(h => b(h) && h.querySelectorAll('button').length === 1 && h.querySelector('h2').children.length === 1 && b(h).type === 'button'
    && [...b(h).children].map(e => e.tagName.toLowerCase() + (e.className.baseVal === undefined ? '.' + e.className : '')).join() === 'span.section-name,svg' && b(h).querySelector('svg').getAttribute('aria-hidden') === 'true'),
    'each heading holds one button that is the whole line: the section\'s name, then the arrow (the heading stays a heading for a screen reader)');
  ok(heads.map(h => h.querySelector('.section-title').textContent).join(' · ') === 'Reference · Training · Alphabet · Grammar · Vocabulary · Advanced Grammar' && heads.every(h => b(h).querySelector('.section-name').textContent === h.closest('.section').dataset.section),
    'the heading still reads as the section\'s name, and nothing else'); }
ok(d.querySelectorAll('a.tile').length === 44 && d.querySelectorAll('a.tile.soon').length === 31 && d.querySelectorAll('.tile-badge').length === 31 && d.querySelectorAll('#sections a.tile').length === 44 && !d.getElementById('featured') && !d.querySelector('.featured, .tile.review'),
  '44 tiles, all inside the sections (no strip above them), 31 marked Soon');
// a tile: its icon and its title together on one line (.tile-head), its description under them
{ const all = [...d.querySelectorAll('#sections a.tile')], kids = t => [...t.children].map(e => e.className).join();
  const bad = all.filter(t => !/^tile-head,tile-desc(,tile-badge)?$/.test(kids(t)) || [...t.querySelector('.tile-head').children].map(e => e.className).join() !== 'tile-icon,tile-title' || t.querySelector('.tile-icon').getAttribute('aria-hidden') !== 'true');
  ok(all.length === 44 && bad.length === 0, 'every tile is a head (icon, then title) followed by its description, then a badge if it has one ' + bad.map(t => t.getAttribute('href')).join(' '));
  const t = d.querySelector('a.tile[href="#/signs-conjuncts"]');
  ok(t.querySelector('.tile-head .tile-title').textContent === 'Signs & Conjuncts' && t.querySelector('.tile-head + .tile-desc').textContent === ALL.find(x => x.id === 'signs-conjuncts').desc && t.querySelector('.tile-icon').textContent === ALL.find(x => x.id === 'signs-conjuncts').icon,
    'a tile shows its icon, title, and description from units.js: ' + t.querySelector('.tile-title').textContent);
  const css = require('fs').readFileSync(dir + 'home.css', 'utf8'), phone = css.slice(css.indexOf('@media (max-width: 520px)'));
  ok(/\.tile-head \{ display: flex; align-items: center; gap: 12px;/.test(css) && /\.tile\.soon \.tile-head \{ padding-right: 40px; \}/.test(css) && /\.tile\.due\s+\.tile-head \{ padding-right: 84px; \}/.test(css),
    'home.css puts the icon and the title side by side, centered on each other, and keeps the title clear of a badge in the corner');
  ok(/\.tile:not\(\.link\) \{ display: grid; grid-template-columns: 40px minmax\(0, 1fr\);/.test(phone) && /\.tile-head \{ display: contents; \}/.test(phone) && /\.tile-icon \{ grid-row: 1 \/ span 2;/.test(phone),
    'on a phone the tile stays one compact row: the icon at the left, the title and description stacked beside it'); }
ok([...d.querySelectorAll('.section')[1].querySelectorAll('a.tile')].map(a => a.getAttribute('href')).join() === '#/review,#/lookalike-builder,#/lookalikes,#/keyboard' && d.querySelector('.section').dataset.section === 'Reference',
  'Review is the first tile of Training, the second section: Review, Lookalike Builder, Lookalikes, Telugu Keyboard');
(async () => {
  const wait = () => new Promise(r => setTimeout(r, 5));
  const frame = d.getElementById('app-frame');
  for (const t of ALL) {
    w.location.hash = '#/' + t.id; await wait();
    if (d.getElementById('app').hidden || frame.getAttribute('src') !== t.src || d.getElementById('app-title').textContent !== t.title) { ok(false, 'route ' + t.id); }
  }
  ok(true, 'all 41 routes open the right page and title');
  w.location.hash = '#/review'; await wait();
  ok(!d.getElementById('app').hidden && frame.getAttribute('src') === 'training/01_review.html' && d.getElementById('app-title').textContent === 'Review', 'Review route opens training/01_review.html');
  w.location.hash = '#/'; await wait();
  ok(!d.getElementById('home').hidden && d.getElementById('app').hidden && !frame.hasAttribute('src'), 'home resets the iframe');
  w.location.hash = '#/nonsense'; await wait();
  ok(!d.getElementById('home').hidden, 'unknown route falls back to home');
  // Review tile driven by progress. Nothing is ever marked "complete": no ✓ on a tile, no "done" in a count.
  const P = w.TeluguProgress;
  // the Review tile, the section it is in, and that section's arrow (all redrawn whenever progress changes)
  const rv = () => d.querySelector('a.tile[href="#/review"]'), rvBadge = () => (rv().querySelector('.tile-badge') || { textContent: '' }).textContent;
  const sect = t => d.querySelector(`.section[data-section="${t}"]`), arrow = t => sect(t).querySelector('.section-toggle');
  const lit = () => [...d.querySelectorAll('.section.has-due')].map(s => s.dataset.section).join() + ' / ' + [...d.querySelectorAll('a.tile.due')].map(a => a.getAttribute('href')).join();
  ok(!rv().classList.contains('due') && !rv().querySelector('.tile-badge') && lit() === ' / ' && arrow('Training').getAttribute('aria-label') === 'Hide Training' && d.querySelectorAll('.tile-check').length === 0,
    'fresh start: nothing waits in Review, so its tile and the Training arrow are plain; no ✓ anywhere');
  P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/' }); P.miss({ game: 'conjuncts', key: 'క్ష', prompt: 'క్ష', answer: '/kʂa/' });
  ok(rv().classList.contains('due') && rvBadge() === '2 to revisit' && lit() === 'Training / #/review', 'a miss in any game lights the Review tile, live, and says how many are waiting: ' + rvBadge());
  ok(sect('Training').classList.contains('has-due') && arrow('Training').getAttribute('aria-label') === 'Hide Training (2 to revisit)' && arrow('Training').title === 'Hide Training (2 to revisit)' && arrow('Alphabet').getAttribute('aria-label') === 'Hide Alphabet',
    'the Training arrow is lit too, and its label says why (color is not the only sign); the other arrows are untouched');
  { const css = fs.readFileSync(dir + 'home.css', 'utf8');
    ok(/\.section\.has-due \.section-toggle svg \{ color: var\(--accent\); \}/.test(css) && /\.tile\.due \{ border-color: var\(--accent\);/.test(css) && /\.tile\.due \.tile-badge \{ background: var\(--accent\);/.test(css) && !/\.featured|\.tile\.review/.test(css),
      'the highlight is the accent color (the app\'s orange-gold): on the arrow, around the tile, and behind its count; the old strip\'s styles are gone');
    ok(/\.section-head > \.section-title \{ flex: 1 1 auto;/.test(css) && /\.section-toggle \{[^}]*display: flex;[^}]*justify-content: space-between;[^}]*width: calc\(100% \+ 16px\);[^}]*font: inherit;[^}]*cursor: pointer;/.test(css),
      'the button fills the heading line, name at one end and arrow at the other, in the heading\'s own type'); }
  P.run('phonemes', { total: 51, correct: 51, attempts: 51 });
  const tile = id => d.querySelector(`a.tile[href="#/${id}"]`);
  ok(d.querySelectorAll('.tile-check').length === 0 && !tile('phonemes').textContent.includes('✓') && !/✓/.test(d.getElementById('sections').textContent), 'a session played to its end, without a mistake, puts no ✓ on its tile');
  ok(d.querySelectorAll('.section-count').length === 0 && rvBadge() === '2 to revisit', 'the home page is redrawn (a session was recorded): still no counts on the sections, and Review still lit');
  ok(!tile('phonemes').classList.contains('soon') && !tile('words').querySelector('.tile-badge') && tile('grammar-sentence').querySelector('.tile-badge').textContent === 'Soon' && d.querySelectorAll('.tile-badge').length === 32 && !/tile-check|doneIds|Completed/.test(src) && !/tile-check/.test(fs.readFileSync(dir + 'home.css', 'utf8')), 'a tile carries a badge only when it is "Soon" (or is Review, with items waiting); the ✓ is gone from the page and its stylesheet');
  // coming back home from a game refreshes
  w.location.hash = '#/phonemes'; await wait(); P.miss({ game: 'diacritics', key: 'కా', prompt: 'కా', answer: '/kaː/' });
  w.location.hash = '#/'; await wait();
  ok(rvBadge() === '3 to revisit' && arrow('Training').getAttribute('aria-label') === 'Hide Training (3 to revisit)', 'returning home picks up changes: 3 to revisit');
  /* ── the top right of the home page: Profile, and the Settings menu (☰) ── */
  {
    const sbtn = d.getElementById('settings-btn'), menu = d.getElementById('settings-menu'), prof = d.getElementById('profile-btn'), FOLLOWS = 4;
    const key = (k, target = d) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true })), tapOn = el => el.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
    ok(prof.closest('header.hero .hero-tools') && sbtn.closest('header.hero .hero-tools') && (d.querySelector('.hero-title').compareDocumentPosition(prof) & FOLLOWS) && (prof.compareDocumentPosition(sbtn) & FOLLOWS), 'the hero ends with two buttons after the title: Profile, then Settings');
    ok(prof.tagName === 'A' && prof.getAttribute('href') === '#/profile' && prof.getAttribute('aria-label') === 'Profile' && prof.title === 'Profile' && !!prof.querySelector('svg[aria-hidden="true"]'), 'Profile is a link to #/profile, named for a screen reader');
    ok(sbtn.tagName === 'BUTTON' && sbtn.getAttribute('aria-label') === 'Settings' && sbtn.getAttribute('aria-haspopup') === 'true' && sbtn.getAttribute('aria-controls') === 'settings-menu' && sbtn.querySelector('svg path').getAttribute('d').split('M').length === 4, 'Settings is a ☰ button (three lines) that owns the menu');
    ok(menu.hidden && sbtn.getAttribute('aria-expanded') === 'false', 'the menu starts closed');
    ok(menu.contains(d.getElementById('prefs')) && menu.querySelector('.settings-title').textContent === 'Settings' && d.querySelectorAll('#prefs').length === 1 && !!menu.querySelector('.pref[role=radiogroup] .seg-opt'), 'the IPA | ISO control lives in the menu, under the heading "Settings", and nowhere else');
    sbtn.click(); ok(!menu.hidden && sbtn.getAttribute('aria-expanded') === 'true', '☰ opens it');
    tapOn(menu.querySelector('.seg')); ok(!menu.hidden, 'a tap inside the menu leaves it open');
    tapOn(d.getElementById('sections')); ok(menu.hidden && sbtn.getAttribute('aria-expanded') === 'false', 'a tap anywhere else closes it');
    sbtn.click(); key('Escape'); ok(menu.hidden && d.activeElement === sbtn, 'Escape closes it and hands the focus back to ☰');
    sbtn.click(); sbtn.click(); ok(menu.hidden, '☰ again closes it');
    sbtn.click(); w.location.hash = '#/rosetta'; await wait(); ok(menu.hidden, 'opening a page closes it');
    w.location.hash = '#/'; await wait();
    // Profile is a page, not a tile: it opens in the app view like any tile does
    w.location.hash = '#/profile'; await wait();
    ok(d.getElementById('home').hidden && !d.getElementById('app').hidden && frame.getAttribute('src') === 'profile.html' && d.getElementById('app-title').textContent === 'Profile' && d.title === 'Profile · Telugu Suite', '#/profile opens profile.html in the app view, titled "Profile"');
    ok(JSON.stringify(U.pages) === '[{"id":"profile","title":"Profile","src":"profile.html"}]' && !U.all.some(t => t.id === 'profile') && !d.querySelector('a.tile[href="#/profile"]') && /const PAGES = TeluguUnits\.pages/.test(src), 'it is listed in units.js as a page (not a tile), which is where the home page takes it from');
    w.location.hash = '#/'; await wait();
    ok(!d.getElementById('home').hidden && !frame.hasAttribute('src') && d.title === 'Telugu Suite', 'and Home comes back from it');
  }
  /* ── how sounds are written: the one app-wide setting, chosen here ── */
  const seg = () => [...d.querySelectorAll('#prefs .seg-opt')], on = () => seg().filter(b => b.classList.contains('on')).map(b => b.dataset.value).join();
  ok(d.querySelector('header.hero #prefs .pref[role=radiogroup]') && seg().map(b => b.textContent).join('|') === 'IPA|ISO' && seg().every(b => b.getAttribute('role') === 'radio' && b.title.length > 10), 'the Settings menu holds a "Sounds as" control with two options, IPA and ISO');
  ok(on() === 'ipa' && seg()[0].getAttribute('aria-checked') === 'true' && seg()[1].getAttribute('aria-checked') === 'false' && d.getElementById('pref-eg').textContent === 'క is written /k/', 'IPA is selected on a first visit; the example reads "క is written /k/"');
  ok(w.localStorage.getItem('telugu.settings.v1') === null, 'nothing is stored until a choice is made');
  seg()[1].click();
  ok(on() === 'iso' && seg()[1].getAttribute('aria-checked') === 'true' && d.getElementById('pref-eg').textContent === 'క is written ka', 'choosing ISO selects it; the example becomes "క is written ka"');
  ok(JSON.parse(w.localStorage.getItem('telugu.settings.v1')).notation === 'iso' && w.TeluguSettings.get('notation') === 'iso', 'the choice is saved for every other page');
  ok(d.querySelectorAll('a.tile').length === 44 && rvBadge() === '3 to revisit', 'the tiles are untouched by the change');
  seg()[1].click(); ok(on() === 'iso', 'choosing the selected option again changes nothing');
  w.TeluguSettings.set('notation', 'ipa'); ok(on() === 'ipa' && d.getElementById('pref-eg').textContent === 'క is written /k/', 'a change made elsewhere (another tab) shows here at once');
  ok(!/telugu-data\.js/.test(src) && /Settings\.set\('notation'/.test(src), 'the home page only stores the choice; it loads no letter data');
  /* ── "Keyboard shows syllables": the second setting, a checkbox, on unless turned off ── */
  { const box = d.getElementById('pref-syl'), row = box && box.closest('.pref');
    ok(row && row.querySelector('.pref-label').textContent === 'Keyboard' && box.closest('label.pref-check').textContent.trim() === 'Shows syllables' && d.querySelectorAll('#prefs .pref').length === 2 && d.querySelectorAll('#prefs .pref')[1] === row,
      'the Settings menu has a second row, under "Sounds as": Keyboard ☑ Shows syllables');
    ok(box.type === 'checkbox' && box.checked && w.TeluguSettings.get('syllables') === 'on' && /కా కి/.test(row.querySelector('.pref-eg').textContent) && /క్క క్ష/.test(row.querySelector('.pref-eg').textContent), 'checked by default, with an example under it (after క: కా కి …; after క్: క్క క్ష …)');
    box.click();
    ok(w.TeluguSettings.get('syllables') === 'off' && JSON.parse(w.localStorage.getItem('telugu.settings.v1')).syllables === 'off' && JSON.parse(w.localStorage.getItem('telugu.settings.v1')).notation === 'ipa', 'unchecking it stores "off" for every page, beside the notation');
    ok(!d.getElementById('pref-syl').checked, 'and the menu, drawn again, shows it unchecked');
    w.TeluguSettings.set('syllables', 'on');
    ok(d.getElementById('pref-syl').checked, 'a change made elsewhere (the Telugu Keyboard page, another tab) shows here at once');
    ok(/Settings\.set\('syllables'/.test(src), 'the home page stores it as the notation is stored'); }
  /* ── a section folds away to its heading line ── */
  {
    const KEY = 'telugu.home.v1';
    const sec = t => d.querySelector(`.section[data-section="${t}"]`), btn = t => sec(t).querySelector('.section-toggle'), tiles = t => sec(t).querySelector('.tiles');
    const stored = win => JSON.parse(win.localStorage.getItem(KEY) || '{}').collapsed || [];
    ok(S.every(s => btn(s.title) && btn(s.title).tagName === 'BUTTON' && btn(s.title).closest('.section-head') && btn(s.title).querySelector('svg path')), 'every section heading ends in an arrow button');
    ok(S.every(s => btn(s.title).getAttribute('aria-expanded') === 'true' && btn(s.title).getAttribute('aria-controls') === tiles(s.title).id && btn(s.title).getAttribute('aria-label') === 'Hide ' + s.title + (s.title === 'Training' ? ' (3 to revisit)' : '') && !tiles(s.title).hidden && !sec(s.title).classList.contains('collapsed')),
      'all sections start open; each button says what it will do ("Hide Alphabet") and names the tiles it controls');
    ok(w.localStorage.getItem(KEY) === null, 'nothing is stored until a section is folded');
    btn('Alphabet').click();
    ok(tiles('Alphabet').hidden && sec('Alphabet').classList.contains('collapsed') && btn('Alphabet').getAttribute('aria-expanded') === 'false' && btn('Alphabet').getAttribute('aria-label') === 'Show Alphabet' && btn('Alphabet').title === 'Show Alphabet',
      'the arrow folds its section: tiles hidden, button now reads "Show Alphabet"');
    ok(sec('Alphabet').querySelector('.section-title').textContent === 'Alphabet' && !sec('Alphabet').querySelector('.section-count') && !!sec('Alphabet').querySelector('.section-head .section-toggle'), 'the heading line stays: its name and its arrow');
    ok(S.filter(s => s.title !== 'Alphabet').every(s => !tiles(s.title).hidden && btn(s.title).getAttribute('aria-expanded') === 'true'), 'the other sections are not touched');
    ok(stored(w).join() === 'Alphabet', 'the folded section is remembered in this browser');
    ok(d.querySelectorAll('a.tile').length === 44 && tiles('Alphabet').querySelectorAll('a.tile').length === 4, 'its tiles are still there, only hidden');
    w.location.hash = '#/rosetta'; await wait(); w.location.hash = '#/'; await wait();
    ok(tiles('Alphabet').hidden && btn('Alphabet').getAttribute('aria-expanded') === 'false' && !tiles('Reference').hidden, 'it is still folded after opening a page and coming back');
    P.miss({ game: 'diacritics', key: 'కీ', ask: 'telugu', syllable: true });
    ok(tiles('Alphabet').hidden && rvBadge() === '4 to revisit', 'a folded section stays folded when the page is redrawn (a new miss)');
    w.location.hash = '#/phonemes'; await wait();
    ok(!d.getElementById('app').hidden && frame.getAttribute('src') === 'alphabet/01_phonemes.html', 'a page in a folded section still opens by its address');
    w.location.hash = '#/'; await wait();
    btn('Grammar').click(); btn('Alphabet').click();
    ok(!tiles('Alphabet').hidden && !sec('Alphabet').classList.contains('collapsed') && btn('Alphabet').getAttribute('aria-expanded') === 'true' && btn('Alphabet').getAttribute('aria-label') === 'Hide Alphabet' && stored(w).join() === 'Grammar',
      'the arrow opens it again; only Grammar is now remembered as folded');
    // the whole line is the button: a click on the section's name does the same as one on the arrow
    sec('Vocabulary').querySelector('.section-name').click();
    ok(tiles('Vocabulary').hidden && btn('Vocabulary').getAttribute('aria-expanded') === 'false' && btn('Vocabulary').getAttribute('aria-label') === 'Show Vocabulary' && stored(w).join() === 'Grammar,Vocabulary', 'a click on a section\'s name folds it, just as the arrow does');
    sec('Vocabulary').querySelector('.section-toggle svg').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok(!tiles('Vocabulary').hidden && btn('Vocabulary').getAttribute('aria-expanded') === 'true' && stored(w).join() === 'Grammar', 'and a click on the arrow opens it again');
    sec('Vocabulary').querySelector('.tiles a.tile').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    ok(!tiles('Vocabulary').hidden && stored(w).join() === 'Grammar', 'a click on a tile is not a click on the heading: the section stays open');
    // Training folded while items wait in Review: its tile is out of sight, so the arrow carries the highlight and says how many
    btn('Training').click();
    ok(tiles('Training').hidden && sec('Training').classList.contains('has-due') && sec('Training').classList.contains('collapsed') && btn('Training').getAttribute('aria-label') === 'Show Training (4 to revisit)' && btn('Training').title === 'Show Training (4 to revisit)',
      'folded with items waiting, Training keeps its lit arrow, labeled "Show Training (4 to revisit)"');
    P.clearMisses();
    ok(!sec('Training').classList.contains('has-due') && !d.querySelector('.section.has-due, a.tile.due') && btn('Training').getAttribute('aria-label') === 'Show Training' && tiles('Training').hidden && !rv().querySelector('.tile-badge'),
      'once the Review list is empty the highlight goes, at once: plain arrow, plain tile, no count; the section stays folded');
    P.miss({ game: 'words', key: 'అమ్మ', ask: 'word', note: 'mother' });
    ok(sec('Training').classList.contains('has-due') && btn('Training').getAttribute('aria-label') === 'Show Training (1 to revisit)' && rv().classList.contains('due') && rvBadge() === '1 to revisit', 'and comes back with the next miss: 1 to revisit');
    btn('Training').click();
    ok(!tiles('Training').hidden && btn('Training').getAttribute('aria-label') === 'Hide Training (1 to revisit)' && stored(w).join() === 'Grammar', 'opened again, the arrow reads "Hide Training (1 to revisit)"');
    // the next visit: the stored sections start folded, and a stored name that no longer exists is ignored
    const visit = value => new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/index.html', beforeParse(win) { if (value !== undefined) win.localStorage.setItem(KEY, value); } }).window;
    const folded = win => [...win.document.querySelectorAll('.section.collapsed')].map(s => s.dataset.section).join();
    let v = visit(JSON.stringify({ collapsed: ['Grammar', 'Vocabulary', 'Resources'] }));
    ok(folded(v) === 'Grammar,Vocabulary' && [...v.document.querySelectorAll('.section.collapsed .tiles')].every(t => t.hidden) && v.document.querySelectorAll('.section-toggle[aria-expanded="false"]').length === 2, 'on the next visit the same sections start folded (a section that no longer exists is ignored)');
    ok(['not json', 'null', '[]', '{"collapsed":"Grammar"}', '{"collapsed":[1,null]}'].every(x => folded(visit(x)) === '' ), 'unreadable storage leaves every section open');
    v = visit(); v.Storage.prototype.setItem = () => { throw new Error('blocked'); };
    v.document.querySelector('.section-toggle').click();
    ok(folded(v) === 'Reference', 'with storage blocked the arrow still works for this visit');
    ok(/\.section-toggle\[aria-expanded="false"\] svg \{ transform: rotate\(90deg\); \}/.test(fs.readFileSync(dir + 'home.css', 'utf8')) && !/rotate\(-90deg\)/.test(fs.readFileSync(dir + 'home.css', 'utf8')) && /\.section\.collapsed/.test(fs.readFileSync(dir + 'home.css', 'utf8')), 'home.css turns the arrow of a folded section to point left (‹) and tightens the section');
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
