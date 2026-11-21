const { SITE_DIR } = require('./config');
// The on-screen Telugu keyboard (telugu-keyboard.js), as laid out by Gboard, and its workbench page
// (training/04_keyboard.html). jsdom has no layout, so a long press is held and let go on the key (the popup then
// stays open for a tap); sliding to a choice, and the keyboard's size, are checked in a real browser (e2e_browser).
// The games' keyboard, TeluguKeyboard.board(), is checked in e2e_board.
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
const dir = SITE_DIR + '/', PAGE = 'training/04_keyboard.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const raw = fs.readFileSync(dir + PAGE, 'utf8');
const html = raw.replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(PAGE), src), 'utf8') + '</script>');
const errs = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' + PAGE,
  virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', e => errs.push(e.message)) });
const w = dom.window, d = w.document, K = w.TeluguKeyboard, text = d.getElementById('text');
const key = k => d.querySelector(`.tkb-page.on .tkb-key[data-key="${k}"]`) || d.querySelector(`.tkb-key[data-key="${k}"]`);
const fire = (el, type, x = 0, y = 0) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
const tap = k => { const b = key(k); fire(b, 'pointerdown'); fire(b, 'pointerup'); };
const hold = async k => { const b = key(k); fire(b, 'pointerdown'); await sleep(360); fire(b, 'pointerup'); };     // past the 300 ms long press, let go on the key
const choices = () => [...d.querySelectorAll('.tkb-choice')].map(c => c.textContent);
const rowOf = (page, n) => [...d.querySelectorAll(`.tkb-${page} > .tkb-row`)[n].querySelectorAll('.tkb-key')].map(b => b.textContent).join(' ');
const row = n => rowOf('letters', n);
const onPage = () => d.querySelector('.tkb-page.on').classList.contains('tkb-letters') ? 'letters' : 'digits';
const reset = s => { text.value = s; text.setSelectionRange(s.length, s.length); text.dispatchEvent(new w.Event('input')); };

(async () => {
  ok(errs.length === 0, 'the page loads with no script errors ' + errs.join(' | '));
  ok(/<link rel="stylesheet" href="\.\.\/game\.css">\s*<link rel="stylesheet" href="\.\.\/telugu-keyboard\.css">/.test(raw) && /<script src="\.\.\/telugu-data\.js"><\/script>\s*<script src="\.\.\/telugu-keyboard\.js"><\/script>/.test(raw),
    'the page links game.css then telugu-keyboard.css, and loads telugu-keyboard.js after telugu-data.js');
  ok(text.tagName === 'TEXTAREA' && text.getAttribute('inputmode') === 'none' && text.getAttribute('lang') === 'te', 'it types into a text box that keeps the phone\'s own keyboard closed (inputmode none), so the cursor can still be moved by tapping');

  /* ── the layout: Gboard's Telugu page ── */
  ok(row(0) === 'అ ఆ ఇ ఈ ఉ ఊ ఋ ౠ ఎ ఏ' && row(1) === 'ఐ ఒ ఓ ఔ ◌ం ◌ః క ఖ గ ఘ' && row(2) === 'ఙ చ ఛ జ ఝ ట ఠ డ ఢ ణ' && row(3) === 'త థ ద ధ న ప ఫ బ భ మ' && row(4) === 'య ర ల వ ళ శ ష స హ ⌫' && row(5) === '౧౨౩ , తెలుగు . ⏎',
    'five rows of ten as Gboard lays them out (vowels first, then the consonants in their classes), and a bottom row with a Telugu space bar');
  ok([...d.querySelectorAll('.tkb-letters > .tkb-row')].slice(0, 5).every(r => r.children.length === 10), 'ten keys in every letter row');
  ok(rowOf('digits', 0) === '౧ ౨ ౩ ౪ ౫ ౬ ౭ ౮ ౯ ౦' && rowOf('digits', 1) === '1 2 3 4 5 6 7 8 9 0' && rowOf('digits', 2) === 'ఞ ◌ఁ @ # % & + * " \'' && rowOf('digits', 3) === '- / ? : ; ( ) ! ₹ ⌫' && rowOf('digits', 4) === 'అఆ , తెలుగు . ⏎',
    'the second page (౧౨౩): Telugu and Western digits; ఞ and ఁ, which have no place on the first; then symbols, ? over , and ! over . beside ⌫; the same bottom row as the first');
  ok(d.querySelectorAll('.tkb-page').length === 2 && d.querySelector('.tkb-letters').classList.contains('on') && !d.querySelector('.tkb-digits').classList.contains('on'), 'both pages are drawn, one over the other (so the keyboard is as tall on either); the letters show');
  ok(['అ', 'ఔ', 'ం', 'ః', 'ఁ'].every(k => d.querySelector(`.tkb-key[data-key="${k}"]`).classList.contains('tkb-vowel')) && !key('క').classList.contains('tkb-vowel'), 'vowel keys (and ం ః ఁ) are marked as such (drawn in the accent color)');
  ok(['ఙ', 'ౠ', 'ః'].every(k => key(k).classList.contains('tkb-rare')), 'rare letters are dimmed (ఙ ౠ ః, from telugu-data.js)');
  ok(['ఌ', 'ౡ', 'ఱ', 'ౘ', 'ౙ'].every(k => !d.querySelector(`.tkb-key[data-key="${k}"]`)), 'the letters out of use (ఌ ౡ ఱ ౘ ౙ) are on neither page: they are on the Bookish Telugu page instead');

  /* ── the rules, as pure functions ── */
  ok(K.context('') === '' && K.context('క') === 'క' && K.context('కశ') === 'శ' && K.context('క్శ') === 'క్శ' && K.context('స్త్ర') === 'స్త్ర' && K.context('కా') === '' && K.context('క్') === '' && K.context('అ') === '' && K.context('క ') === '',
    'context(): the vowel keys sign the consonant or conjunct the text ends in, nothing after a vowel, a sign, ్, or a space');
  ok(K.keyAction('ఇ', 'క', true).insert === 'ి' && K.keyAction('ఇ', 'క', true).face === 'కి' && K.keyAction('ఇ', '', true).insert === 'ఇ' && K.keyAction('ఇ', 'క', false).face === '◌ి',
    'after a consonant a vowel key types its sign and shows the syllable (కి), or the bare sign (◌ి) with syllable faces off');
  ok(K.keyAction('అ', 'క', true).insert === '్' && K.keyAction('అ', 'క', true).face === 'క్', 'after a consonant the అ key is ్: the consonant with no vowel');
  ok(K.keyAction('ఆ', 'క్శ', true).face === 'క్శా' && K.keyAction('ం', 'కా', true).face === 'కాం' && K.keyAction('ం', 'అ', true).face === 'అం' && K.keyAction('ం', '', true).face === '◌ం' && K.keyAction('ం', 'క ', true).insert === 'ం',
    'the whole syllable is shown (క్శా); ం and ః always type the sign, shown on the letter before (కాం, అం) or a dotted circle');
  ok(Object.keys(K.SIGN_OF).length === 14 && K.SIGN_OF['ఐ'] === 'ై' && !K.SIGN_OF['ఌ'], 'every vowel key has its sign (14; the out-of-use ఌ ౡ are not keys)');
  ok(K.keyAction('ష', 'క్', true).face === 'క్ష' && K.keyAction('ష', 'క్', true).insert === 'ష' && K.keyAction('య', 'క్ష్మ్', true).face === 'క్ష్మ్య' && K.keyAction('ష', 'క్', false).face === 'ష' && K.keyAction('ష', 'క', true).face === 'ష' && K.keyAction('ష', 'క్‌', true).face === 'ష',
    'after ్ a consonant key shows the conjunct it makes (క్ష; క్ష్మ్య three deep) and types its letter; not with syllable faces off, not after a whole letter, not after ్ with a ZWNJ');
  ok(K.keyAction('ఁ', 'కా', true).face === 'కాఁ' && K.keyAction('ఁ', 'కా', true).insert === 'ఁ', 'ఁ, like ం ః, types the sign, shown on the syllable before');
  const lp = (k, b) => K.longPressFor(k, b).map(c => c.face).join(' ');
  ok(lp('శ', 'క') === 'క్శ శ్ శ్చ శ్న శ్య శ్ర శ్వ' && K.longPressFor('శ', 'క')[0].insert === '్శ' && K.longPressFor('శ', 'క')[0].kind === 'join',
    'hold శ after క: first క్శ (it adds ్శ to the క already typed), then శ్, then the conjuncts that start with శ: ' + lp('శ', 'క'));
  ok(lp('శ', '') === 'శ్ శ్చ శ్న శ్య శ్ర శ్వ' && lp('శ', 'కా') === lp('శ', ''), 'with no consonant before (or one with a vowel already), there is nothing to join to');
  ok(lp('క', '').split(' ').slice(0, 4).join(' ') === 'క్ క్క క్త క్ష' && lp('క', '').split(' ').filter(x => x === 'క్ష').length === 1, 'క: its conjuncts, క్ష among them, once');
  ok(!lp('ర', '').includes('ఱ') && lp('ఙ', '') === 'ఙ్' && lp('జ', '').includes('జ్ఞ') && lp('ఋ', '') === '' && lp('ం', '') === '',
    'no letters are kept under a key any more: ఞ and ఁ are on the second page; ఱ ఌ are out of use (no popup under ర ఋ ం)');
  ok(lp('అ', 'ఆన') === 'న్‌' && K.longPressFor('అ', 'ఆన')[0].insert === '్‌' && lp('అ', '') === '', 'hold ్ (the అ key after a consonant): ్ with a zero-width non-joiner, a visible ్ that does not join (ఆన్‌లైన్)');
  ok(!lp('మ', '').includes('మ్ప') && K.longPressFor('మ', '').every(c => c.face), 'clusters marked rare in telugu-data.js (మ్ప …) are left out');

  /* ── typing ── */
  reset('');
  tap('క');
  ok(text.value === 'క' && row(0) === 'క్ కా కి కీ కు కూ కృ కౄ కె కే' && row(1).startsWith('కై కొ కో కౌ కం కః') && d.querySelector('.tkb').classList.contains('tkb-signs'),
    'after క the vowel keys show its syllables: ' + row(0));
  tap('ఇ');
  ok(text.value === 'కి' && row(0) === 'అ ఆ ఇ ఈ ఉ ఊ ఋ ౠ ఎ ఏ', 'క then ఇ types కి; the keys go back to vowels');
  tap('SPACE'); tap('అ'); tap('మ'); tap('అ'); tap('మ'); tap('ఆ'); tap('య'); tap('ఇ');
  ok(text.value === 'కి అమ్మాయి', 'అ మ ్ మ ా య ి types అమ్మాయి');
  ok(d.querySelector('#syls').textContent.includes('మ్మా') && [...d.querySelectorAll('.cp')].map(c => c.textContent.slice(0, 6)).join() === 'U+0C2F,U+0C3F',
    'the readout splits the word into its characters, and lists the code points of the one before the cursor (య, ి)');
  tap('BACK');
  ok(text.value === 'కి అమ్మాయ' && row(0).startsWith('య్ యా'), 'backspace takes off one code point: the sign first');
  reset('కి అమ్మాయి'); fire(key('BACK'), 'pointerdown'); await sleep(900); fire(key('BACK'), 'pointerup');
  ok(text.value.length < 'కి అమ్మాయి'.length - 3, 'holding backspace keeps deleting');

  // a conjunct from the popup: hold శ after క, let go on the key, tap క్శ
  reset('క');
  await hold('శ');
  ok(!d.querySelector('.tkb-pop').hidden && choices().join(' ') === 'క్శ శ్ శ్చ శ్న శ్య శ్ర శ్వ' && d.querySelector('.tkb-choice.on').textContent === 'క్శ' && text.value === 'క',
    'a long press opens the popup above the key, its first choice lit; nothing is typed yet');
  fire(d.querySelector('.tkb-choice'), 'pointerdown');
  ok(text.value === 'క్శ' && d.querySelector('.tkb-pop').hidden && row(0).startsWith('క్శ్ క్శా క్శి'), 'tapping క్శ types ్శ after the క: the keys now sign the conjunct');
  tap('ఆ'); ok(text.value === 'క్శా', 'and ఆ makes it క్శా');
  // a quick tap is just the letter; a press elsewhere closes the popup
  reset(''); tap('శ'); ok(text.value === 'శ' && d.querySelector('.tkb-pop').hidden, 'a tap shorter than the long press types the letter, with no popup');
  await hold('ర'); fire(d.body, 'pointerdown');
  ok(d.querySelector('.tkb-pop').hidden && text.value === 'శ', 'a press outside the popup closes it, typing nothing');
  await hold('ర'); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(d.querySelector('.tkb-pop').hidden, 'so does Escape');

  // at the cursor, not just the end
  reset('కల'); text.setSelectionRange(1, 1); text.dispatchEvent(new w.Event('select'));
  ok(row(0).startsWith('క్ కా'), 'with the cursor after క in కల the keys sign క');
  tap('ఈ'); ok(text.value === 'కీల' && text.selectionStart === 2, 'ఈ goes in at the cursor (కీల), and the cursor moves past it');
  text.setSelectionRange(0, 3); tap('అ'); ok(text.value === 'అ', 'a selection is replaced');

  // conjuncts typed as Gboard does, with ్: after క్ the consonant keys show the conjunct each makes
  reset(''); tap('క'); tap('అ');
  ok(text.value === 'క్' && row(2).startsWith('క్ఙ క్చ') && key('ష').textContent === 'క్ష' && d.querySelector('.tkb').classList.contains('tkb-joins') && row(0) === 'అ ఆ ఇ ఈ ఉ ఊ ఋ ౠ ఎ ఏ',
    'after క్ (క, then the అ key) the consonant keys show the conjuncts they make: ' + row(2));
  tap('ష'); ok(text.value === 'క్ష' && key('ష').textContent === 'ష' && row(0).startsWith('క్ష్ క్షా') && !d.querySelector('.tkb').classList.contains('tkb-joins'), 'ష then types క్ష; the vowel keys sign it, the consonants are letters again');
  tap('అ'); tap('మ'); tap('అ'); ok(key('య').textContent === 'క్ష్మ్య', 'three deep: after క్ష్మ్ the య key reads క్ష్మ్య');

  // digits and punctuation
  reset('అ'); tap('NUM');
  ok(onPage() === 'digits' && key('౧') && key('ABC'), '౧౨౩ turns to the second page: Telugu digits, Western digits, ఞ ఁ, punctuation');
  tap('౧'); tap('ఞ'); tap('?'); tap('ABC'); ok(text.value === 'అ౧ఞ?' && onPage() === 'letters', 'its keys type (౧ ఞ ?), and అఆ goes back to the letters');
  tap('ENTER'); tap('SPACE'); ok(text.value === 'అ౧ఞ?\n ', '⏎ is a new line, తెలుగు a space');
  reset('కా'); tap('NUM'); ok(key('ఁ').textContent === 'కాఁ', 'after కా the ఁ key shows కాఁ'); tap('ఁ'); ok(text.value === 'కాఁ', 'and types it'); tap('BACK'); ok(text.value === 'కా', '⌫ on the second page deletes too'); tap('ABC');

  /* ── the workbench's options ── */
  const faces = d.getElementById('faces'), setting = () => w.TeluguSettings.get('syllables');
  ok(faces.closest('label').textContent.trim() === 'Keyboard shows syllables' && faces.checked && setting() === 'on', '"Keyboard shows syllables" is the app setting (settings.js), on by default');
  reset('క'); faces.click();
  ok(row(0).startsWith('◌్ ◌ా ◌ి') && setting() === 'off', 'unchecked: the bare signs on a dotted circle; and the app setting is off (the home page\'s Settings menu says the same)');
  ok(JSON.parse(w.localStorage.getItem('telugu.settings.v1')).syllables === 'off', 'it is stored with the other settings, so the games follow it');
  tap('అ'); ok(key('ష').textContent === 'ష', 'off: after క్ the consonants keep their letters');
  faces.click(); ok(key('ష').textContent === 'క్ష' && setting() === 'on', 'and on again');
  w.TeluguSettings.set('syllables', 'off'); ok(!faces.checked && key('ష').textContent === 'ష', 'changed elsewhere (another tab, the home page), the box and the keys follow');
  w.TeluguSettings.set('syllables', 'on'); reset('క');
  const range = d.getElementById('hold'); range.value = '600'; range.dispatchEvent(new w.Event('input'));
  ok(d.getElementById('hold-ms').textContent === '600 ms', 'the long-press time can be set (here 600 ms)');
  const b = key('శ'); fire(b, 'pointerdown'); await sleep(360);
  ok(d.querySelector('.tkb-pop').hidden, 'at 600 ms, 360 ms is not yet a long press'); fire(b, 'pointerup');
  ok(text.value === 'కశ', 'and letting go then is a tap');
  d.getElementById('clear').click(); ok(text.value === '' && row(0) === 'అ ఆ ఇ ఈ ఉ ఊ ఋ ౠ ఎ ఏ', 'Clear empties the text');

  /* ── the files ── */
  const js = fs.readFileSync(dir + 'telugu-keyboard.js', 'utf8'), css = fs.readFileSync(dir + 'telugu-keyboard.css', 'utf8');
  ok(/const ROWS = \[/.test(js) && /const NUM_ROWS = \[/.test(js) && /const SIGN_OF = \{/.test(js) && !/const UNDER/.test(js) && !/gate2home/i.test(js + raw), 'the two pages and the vowel → sign map are plain lists at the top of telugu-keyboard.js; nothing kept under a key, nothing of Gate2Home');
  ok(/\.tkb-page \{[^}]*grid-auto-rows: var\(--kh\)/.test(css) && /\.tkb-key \{[^}]*height: var\(--kh\); min-height: var\(--kh\); max-height: var\(--kh\);[^}]*contain: size/.test(css) && /\.tkb-digits \{ grid-template-rows: repeat\(3, var\(--kh\)\) 1fr var\(--kh\); \}/.test(css),
    'a key is the same height whatever is on it (a conjunct is taller than a letter), and so is every row; the second page keeps ⌫\'s row and the bottom row where the first has them');
  ok(!/\.tkb-back\s*\{[^}]*flex-grow/.test(css), '⌫ is as wide as a letter, as in the games');
  ok(/D\.clusters\.filter/.test(js) && !/'క్క'|"క్క"/.test(js), 'the conjuncts in a popup come from telugu-data.js, not a list of their own');
  ok(!/@import/.test(css) && !/:root\s*\{/.test(css) && /var\(--accent-light\)/.test(css), 'telugu-keyboard.css layers on game.css: no import, no tokens of its own');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
