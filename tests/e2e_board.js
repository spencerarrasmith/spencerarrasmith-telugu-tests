const { SITE_DIR } = require('./config');
// TeluguKeyboard.board() on its own: the games' keyboard. Not grouped, the whole Telugu keyboard, both pages, each key where
// its letter sits and every other key dimmed; a key with no place there on the second page; ⌫ a key of the game's when it
// asks (onBack), off until back(true); relabel() for faces in the making; grouped, only the game's keys in labeled groups.
// The games themselves are checked in e2e_pho*, e2e_dia*, e2e_conj*, e2e_words; sizes in a real browser in e2e_browser.
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
const rd = f => fs.readFileSync(path.join(SITE_DIR, f), 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const page = (settings) => new JSDOM(`<div id="a"></div><script>${settings ? `localStorage.setItem('telugu.settings.v1', ${JSON.stringify(JSON.stringify(settings))})` : ''}</script><script>${rd('settings.js')}</script><script>${rd('telugu-data.js')}</script><script>${rd('telugu-keyboard.js')}</script>`,
  { runScripts: 'dangerously', url: 'http://localhost/' }).window;
const w = page(), d = w.document, K = w.TeluguKeyboard, D = w.TeluguData, host = d.getElementById('a');
const faces = (page, i) => [...host.querySelectorAll(`.gkb-${page} > .kb-row`)[i].children].map(b => (b.classList.contains('gkb-off') ? '·' : '') + b.textContent).join(' ');
const picks = [];
const key = (te, extra = {}) => Object.assign({ te, label: te, group: /[అ-ఔ]/.test(te) ? 'Vowels' : 'Consonants', onPick: k => picks.push(k.te), data: { ch: te } }, extra);

/* ── the layout ── */
let kb = K.board(host, { keys: ['క', 'ఖ', 'అ', 'ఞ', 'క్ష', 'హ'].map(t => key(t)) });
ok(kb.el.classList.contains('gkb') && kb.el.dataset.mode === 'layout' && host.querySelectorAll('.gkb-page').length === 2 && host.querySelector('.gkb-letters').classList.contains('on') && !host.querySelector('.gkb-digits').classList.contains('on'),
  'not grouped: the two pages of the Telugu keyboard, the letters showing');
ok(faces('letters', 0) === 'అ ·ఆ ·ఇ ·ఈ ·ఉ ·ఊ ·ఋ ·ౠ ·ఎ ·ఏ' && faces('letters', 1) === '·ఐ ·ఒ ·ఓ ·ఔ ·◌ం ·◌ః క ఖ ·గ ·ఘ' && faces('letters', 4) === '·య ·ర ·ల ·వ ·ళ ·శ ·ష ·స హ ·⌫' && faces('letters', 5) === '౧౨౩ ·, ·తెలుగు ·. ·⏎',
  'each key where its letter sits; every other place filled by a dimmed key with its own letter (a sign on a dotted circle); ⌫ and the frame dimmed');
ok(faces('digits', 2) === 'ఞ ·◌ఁ క్ష ·# ·% ·& ·+ ·* ·" ·\'' && faces('digits', 3) === '·- ·/ ·? ·: ·; ·( ·) ·! ·₹ ·⌫' && faces('digits', 4) === 'అఆ ·, ·తెలుగు ·. ·⏎',
  'ఞ in its place on the second page; క్ష, which has no place on either, at the first symbol after ఁ');
ok(kb.buttons.length === 6 && kb.buttons.every(b => b.tagName === 'BUTTON' && b.dataset.ch) && [...host.querySelectorAll('.gkb-off')].every(s => s.tagName === 'SPAN' && s.getAttribute('aria-hidden') === 'true'), 'the game\'s keys are buttons (with their data- attributes); the dimmed ones spans, hidden from screen readers');
kb.buttons.find(b => b.dataset.ch === 'ఖ').click(); ok(picks.join() === 'ఖ', 'a key calls its onPick');
const flip1 = host.querySelector('.gkb-letters .gkb-flip'), flip2 = host.querySelector('.gkb-digits .gkb-flip');
flip1.click(); ok(host.querySelector('.gkb-digits').classList.contains('on') && host.querySelector('.gkb-letters').getAttribute('aria-hidden') === 'true' && [...host.querySelectorAll('.gkb-letters button')].every(b => b.tabIndex === -1), '౧౨౩ turns the page; the hidden page\'s keys leave the tab order');
flip2.click(); ok(host.querySelector('.gkb-letters').classList.contains('on'), 'అఆ turns it back');
kb.reveal(kb.buttons.find(b => b.dataset.ch === 'ఞ')); ok(host.querySelector('.gkb-digits').classList.contains('on'), 'reveal(button) turns to the page the button is on');
K.reveal(kb.buttons.find(b => b.dataset.ch === 'క')); ok(host.querySelector('.gkb-letters').classList.contains('on'), 'and so does TeluguKeyboard.reveal(button), from the button alone');

/* hidden keys, faces of the dimmed ones, the flip with nothing behind it */
kb = K.board(host, { keys: [key('క'), key('ఆ', { hidden: true, label: 'aː' })], faces: 'sound' });
ok(faces('letters', 0).startsWith('·ɐ ·aː ·i') && faces('letters', 1).includes('·ɐm') && !host.querySelector('button[data-ch="ఆ"]'), 'a hidden key is dimmed at its place, with its own label; with faces: \'sound\' the other dimmed keys are written as sounds (ɐ, ɐm)');
ok(host.querySelector('.gkb-letters .gkb-flip').disabled && host.querySelector('.gkb-digits .gkb-flip').disabled, 'with nothing of the game\'s on the second page, ౧౨౩ is there, but off');
ok((() => { try { K.board(host, { keys: Array.from({ length: 30 }, (_, i) => key('X' + i)) }); return false; } catch (e) { return /too many keys/.test(e.message); } })(), 'more keys with no place than the second page has symbols is an error, not a key lost');

/* ── ⌫ ── */
let backs = 0;
kb = K.board(host, { keys: [key('క')], onBack: () => backs++ });
const bk = [...host.querySelectorAll('.gkb-back')];
ok(bk.length === 2 && bk.every(b => b.tagName === 'BUTTON' && b.disabled && b.getAttribute('aria-label')) && !kb.buttons.includes(bk[0]), 'with onBack, ⌫ (on both pages) is a button: off to begin with');
kb.back(true); ok(bk.every(b => !b.disabled), 'back(true) turns both on');
bk[1].click(); ok(backs === 1, 'a tap calls onBack');
kb.back(false); ok(bk.every(b => b.disabled), 'back(false) turns them off');
kb = K.board(host, { keys: [key('క')] }); ok(host.querySelectorAll('button.gkb-back').length === 0 && host.querySelectorAll('span.gkb-off.gkb-back').length === 2 && typeof kb.back === 'function', 'without onBack, ⌫ is dimmed like the other frame keys (back() does nothing)');

/* ── relabel ── */
kb = K.board(host, { keys: ['క', 'ష', 'య'].map(t => key(t)) });
const shown = () => ['క', 'ష', 'య'].map(t => kb.buttons.find(b => b.dataset.ch === t).textContent).join();
kb.relabel(k => 'క్' + k.te);
ok(shown() === 'క్క,క్ష,క్య', 'relabel(fn) prints fn(key) on each key: a conjunct in the making');
kb.relabel(k => (k.te === 'ష' ? null : 'x')); ok(shown() === 'x,ష,x', 'null keeps a key\'s own label');
kb.relabel(); ok(shown() === 'క,ష,య', 'relabel() puts every label back');

/* ── grouped ── */
kb = K.board(host, { grouped: true, groups: ['Consonants', 'Vowels'], keys: [key('అ'), key('క'), key('ఖ', { hidden: true }), key('ష')] });
const gs = [...host.querySelectorAll('.kb-group')];
ok(kb.el.dataset.mode === 'grouped' && gs.map(g => g.querySelector('.kb-label').textContent + ':' + [...g.querySelectorAll('button')].map(b => b.textContent).join('')).join(' ') === 'Consonants:కష Vowels:అ', 'grouped: one labeled group each, in `groups` order, hidden keys left out');
ok(!host.querySelector('.gkb-page, .gkb-off, .gkb-flip, .gkb-back') && gs.every(g => g.style.getPropertyValue('--k') === String(g.querySelectorAll('button').length)), 'no pages and nothing dimmed; each group as wide as its keys (--k)');

/* ── "Keyboard shows syllables" ── */
ok(K.syllables() === true && page({ syllables: 'off' }).TeluguKeyboard.syllables() === false && page({ notation: 'iso' }).TeluguKeyboard.syllables() === true, 'syllables() reads the app setting: on unless it was turned off');

/* ── the CSS that keeps it still ── */
const css = rd('game.css');
ok(/\.gkb \{ --kh: 44px; \}/.test(css) && /\.gkb \.kb-btn \{[^}]*height: var\(--kh\); min-height: var\(--kh\); max-height: var\(--kh\);[^}]*contain: size/.test(css) && /\.gkb-page \{[^}]*grid-auto-rows: var\(--kh\)/.test(css) && /\.gkb-page > \.kb-row \{ height: var\(--kh\); \}/.test(css) && /\.gkb \{ --kh: 42px; \}/.test(css),
  'game.css: a key is one height (44px, 42 on a phone) whatever is printed on it, and so is every row');
ok(/\.gkb-digits \{ grid-template-rows: repeat\(3, var\(--kh\)\) 1fr var\(--kh\); \}/.test(css) && /\.gkb-digits > \.kb-row:nth-child\(4\) \{ align-self: end; \}/.test(css), 'game.css: the second page keeps its last two rows (⌫\'s, and the bottom row) where the first has them');
ok(/\.gkb \.gkb-off \{[^}]*opacity: \.3;[^}]*pointer-events: none/.test(css) && /\.gkb button\.gkb-back:disabled \{[^}]*opacity: \.3;[^}]*pointer-events: none/.test(css), 'game.css: dimmed keys, and ⌫ while off, are faint and take no taps');
ok(/\.slot \{[^}]*height: 36px;[^}]*box-sizing: border-box/.test(css) && /\.slot-val\.te \{[^}]*line-height: 1;/.test(css), 'game.css: a slot is as tall filled as empty (a conjunct in it does not push the keyboard down)');
ok(/\.g-stat-val \{[^}]*font-variant-numeric: tabular-nums/.test(css) && /#s-rem, #s-done \{ display: inline-block; text-align: right; \}/.test(css) && /\$\('s-rem'\)\.style\.minWidth = \$\('s-done'\)\.style\.minWidth = digits/.test(rd('game-core.js')),
  'the counters keep the width of the total\'s digits (game-core.js), so the header does not change its height as they grow');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
