// The session popup (game-setup.js), on the Phonemes page: it opens with the page and asks how to play.
// Cancel on the left, Start on the right; then every option the game has: direction, the number of rounds,
// the mistakes allowed, and its four checkboxes. The page has no ⋮ menu.
// Then the same popup on Diacritics and Conjuncts, with what is their own (their checkboxes, their number of rounds).
const load = require('./harness');
const fs = require('fs'), path = require('path'), { SITE_DIR } = require('./config');
const PAGE = 'alphabet/01_phonemes.html';
const raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8'), css = fs.readFileSync(path.join(SITE_DIR, 'game.css'), 'utf8');

const H = '\u2764\uFE0F', L3 = '\u{1F49A}\u{1F90D}\u{1F9E1}', L2 = '\u{1F90D}\u{1F9E1}', L1 = '\u{1F9E1}', RING = '\u2B55';       // ❤️ (four or more left) · 💚🤍🧡 · 🤍🧡 · 🧡 · ⭕ (none left)

(async () => {
  const h = load(PAGE, { setup: 'open' }), { w, d, ok, tick, $ } = h, G = h.game, P = w.TeluguProgress;
  const open = () => !$('setup').hidden;
  const slide = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  const typeRounds = v => { $('setup-rounds-n').value = v; $('setup-rounds-n').dispatchEvent(new w.Event('input', { bubbles: true })); };
  const press = (k, target = d.activeElement || d.body) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const wrong = () => [...d.querySelectorAll('.kb-btn')].find(b => b.dataset.ch !== G().current.ch && b.style.display !== 'none');
  const right = () => [...d.querySelectorAll('.kb-btn')].find(b => b.dataset.ch === G().current.ch);
  const lives = () => $('s-lives').hidden ? 'hidden' : $('s-lives').textContent;          // the mistakes left, as the header shows them
  const reopen = () => w.GameSetup.current.open();           // what "Practice Again" does, without finishing a session first
  const keys = () => [...d.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none').length;

  /* ── it opens with the page ── */
  ok(open() && $('setup').classList.contains('setup') && $('setup').querySelector('[role="dialog"]').getAttribute('aria-modal') === 'true' && $('setup-title').textContent === 'Phonemes', 'the popup is open as soon as the page is, titled "Phonemes"');
  const head = [...$('setup').querySelector('.setup-head').children].map(e => e.id);
  ok(head.join() === 'setup-cancel,setup-title,setup-start' && $('setup-cancel').textContent === 'Cancel' && $('setup-start').textContent === 'Start', 'Cancel is on the left, Start on the right, the title between');
  const rows = [...$('setup').querySelectorAll('.setup-label, .menu-opt')].map(e => e.textContent.replace('Off while keyboard is shuffled', '').trim());
  ok(rows.join(' | ') === 'Direction | Number of rounds | Allowed mistakes | Show categories | Shuffle keyboard | Include extra letters | Highlight correct answer', 'the options, in order (direction, the sliders, then the checkboxes): ' + rows.join(' | '));
  ok([...$('setup').querySelectorAll('.setup-opt')].every(l => l.lastElementChild.type === 'checkbox' && l.firstElementChild.classList.contains('menu-txt')) && /\.setup-opt \{[^}]*justify-content: space-between/.test(css) && $('rev-btn').parentElement.lastElementChild === $('rev-btn'),
    'each checkbox sits at the right of its row, as the 🔀 button does');
  ok(!$('menu-btn') && !$('opts-menu') && !$('menu-wrap') && !/class="menu"|menu-btn/.test(raw), 'the page has no ⋮ menu');
  ok(/\.g-lives \{[^}]*display: inline-block;[^}]*min-width: [\d.]+em;[^}]*text-align: right/.test(css), 'the hearts sit at the right of a box that keeps its width (game.css)');
  ok(/\.setup-opt:focus-within \{ outline: 1px solid var\(--accent\); outline-offset: 0; \}/.test(css) && /\.setup-opt \{[^}]*padding: 6px 8px/.test(css), 'the outline around the checkbox row in use is a thin line, with padding between it and the words (game.css)');
  ok(d.activeElement === $('setup-start'), 'Start has the focus, so Enter starts with what is shown');
  ok(/\.setup \{[^}]*position: fixed;[^}]*inset: 0;[^}]*z-index: 60/.test(css), 'the popup covers the page (game.css)');
  ok(/<script src="\.\.\/game-setup\.js"><\/script>/.test(raw) && /GameSetup\.create\(\{/.test(raw) && raw.indexOf('GameSetup.create(') < raw.indexOf('GameMenu.init('), 'the page loads game-setup.js and creates the popup before the ⋮ menu is set up');

  /* ── defaults ── */
  ok($('setup-rounds').type === 'range' && $('setup-rounds').min === '1' && $('setup-rounds').max === '51' && $('setup-rounds').value === '51' && $('setup-rounds-n').value === '51' && $('setup-rounds-n').nextElementSibling === null && $('setup-rounds').nextElementSibling === $('setup-rounds-n'),
    'number of rounds: a slider from 1 to 51 with a text box on its right, both at 51 (all characters)');
  ok($('setup-misses').type === 'range' && $('setup-misses').min === '0' && $('setup-misses').value === $('setup-misses').max && $('setup-misses-out').textContent === 'Unlimited' && $('setup-misses-note').textContent === 'Never ends early' && /^Unlimited/.test($('setup-misses').getAttribute('aria-valuetext')) && $('setup-misses-note').previousElementSibling === $('setup-misses').parentElement, 'allowed mistakes: a slider from 0, at Unlimited, with the note "Never ends early" under it');
  ok(['show-cat', 'shuffle-kb', 'include-extra', 'highlight-correct'].every(id => $(id).closest('#setup-opts')) && $('show-cat').checked && !$('shuffle-kb').checked && !$('include-extra').checked && $('highlight-correct').checked, 'the four checkboxes are here: categories and highlight on, shuffle and extra letters off');
  ok($('setup-dir').textContent === 'Telugu → IPA' && $('rev-btn').closest('#setup') && $('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false' && !d.querySelector('.g-header .rev-btn'), 'direction: Telugu → IPA, with the 🔀 button here and no longer in the header');

  /* ── the slider and the text box are one value ── */
  slide('setup-rounds', 20); ok($('setup-rounds-n').value === '20', 'moving the slider sets the text box: 20');
  typeRounds('7'); ok($('setup-rounds').value === '7', 'typing in the text box moves the slider: 7');
  typeRounds('500'); ok($('setup-rounds').value === '51', 'a number past the top is held at 51 on the slider');
  $('setup-rounds-n').dispatchEvent(new w.Event('change', { bubbles: true })); ok($('setup-rounds-n').value === '51', 'and the box settles on 51 when it is left');
  typeRounds('0'); $('setup-rounds-n').dispatchEvent(new w.Event('change', { bubbles: true })); ok($('setup-rounds-n').value === '1' && $('setup-rounds').value === '1', 'never fewer than 1');
  typeRounds(''); ok($('setup-rounds').value === '1', 'an empty box leaves the slider where it was');
  const note = v => { slide('setup-misses', v); return $('setup-misses-out').textContent + ' · ' + $('setup-misses-note').textContent; };
  ok(note(3) === '3 · Ends on the 4th mistake' && $('setup-misses').getAttribute('aria-valuetext') === '3: ends on the 4th mistake', 'the slider says its number and the note says what it means: ' + note(3));
  ok(note(0) === '0 · Ends on the first mistake', 'down to 0, which allows none: ' + note(0));
  ok(note(1) === '1 · Ends on the 2nd mistake' && note(2) === '2 · Ends on the 3rd mistake', '0 and 1 are different: 1 ends on the 2nd, 2 on the 3rd');
  ok(note(10) === '10 · Ends on the 11th mistake' && note(11) === '11 · Ends on the 12th mistake' && note(12) === '12 · Ends on the 13th mistake', 'the teens are spelled right: 11th, 12th, 13th');
  ok(note(w.GameSetup.MISS_STOPS) === '20 · Ends on the 21st mistake', 'up to 20: ' + note(w.GameSetup.MISS_STOPS));
  ok(note(w.GameSetup.MISS_STOPS + 1) === 'Unlimited · Never ends early', 'and one more stop is Unlimited');

  /* ── nothing changes until Start ── */
  ok(G().total === 51 && G().limit === null && $('g-title').textContent === 'Telugu → IPA', 'behind the popup a full round is dealt, forward, with no limit');
  $('rev-btn').click(); slide('setup-rounds', 5); slide('setup-misses', 3);
  ok($('setup-dir').textContent === 'IPA → Telugu' && $('rev-btn').getAttribute('aria-pressed') === 'true' && $('g-title').textContent === 'Telugu → IPA' && G().total === 51, '🔀 turns the direction around in the popup only: the game is untouched');
  $('setup-start').click();
  ok(!open() && $('g-title').textContent === 'IPA → Telugu' && G().total === 5 && G().deck.length === 5 && G().limit === 3 && G().completed === 0 && $('s-total').textContent === '5' && $('s-rem').textContent === '5', 'Start: the popup closes and a session of 5 is dealt, reversed, with "Allowed mistakes" at 3');
  ok(keys() === 51 && [...d.querySelectorAll('.kb-btn')].every(b => b.classList.contains('te')), 'the keyboard still has all 51 letters, as Telugu keys: fewer rounds, not fewer choices');
  ok(lives() === L3 && $('s-lives').getAttribute('aria-label') === 'Mistakes left: 3' && $('s-lives').closest('.g-stats'), 'the header shows the mistakes left as hearts, green white orange for the last three: ' + lives());
  ok(new Set(G().deck.map(c => c.ch)).size === 5 && G().deck.every(c => w.TeluguData.letters.includes(c)), 'the 5 are different letters from the usual pool');

  /* ── running out of misses ── */
  wrong().click(); await tick();
  ok(lives() === L2 && !G().over && G().deck.length === 5, 'one mistake: the green heart goes (white and orange left), play goes on');
  right().click(); await tick();
  wrong().click(); await tick();
  ok(lives() === L1 && !G().over, 'two mistakes: the orange heart is the last');
  wrong().click(); await tick();
  ok(lives() === RING && $('s-lives').classList.contains('out') && !G().over && !$('g-complete').classList.contains('show'), 'three mistakes, all that were allowed: an empty ring (⭕), still playing');
  wrong().click();
  ok(G().over && lives() === RING, 'the fourth mistake ends the session, there and then');
  await tick();
  ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Out of mistakes' && $('c-trophy').hidden && $('c-sub').textContent === '1 of 5 cleared. 3 mistakes were allowed.', 'the complete screen: "Out of mistakes" · ' + $('c-sub').textContent);
  ok($('c-attempts').textContent === '5' && $('c-accuracy').textContent === '20%' && $('c-errors').textContent === '4', 'its numbers: 5 attempts, 20%, 4 errors');
  ok(!P.isComplete('phonemes') && P.misses().length >= 1 && P.misses().every(m => m.game === 'phonemes-reverse'), 'no ✓ for the unit; the misses still go to Review');

  /* ── Practice Again asks again, with the last choices ── */
  $('retry-btn').click();
  ok(open() && $('setup-rounds').value === '5' && $('setup-rounds-n').value === '5' && $('setup-misses-out').textContent === '3' && $('setup-dir').textContent === 'IPA → Telugu' && $('g-complete').classList.contains('show'), '"Practice Again" opens the popup with the last choices; nothing is dealt yet');
  $('rev-btn').click(); slide('setup-misses', w.GameSetup.MISS_STOPS + 1); typeRounds('3');
  press('Enter');
  ok(!open() && G().total === 3 && G().limit === null && $('g-title').textContent === 'Telugu → IPA' && lives() === 'hidden' && !$('g-complete').classList.contains('show'), 'Enter starts: 3 rounds, forward, unlimited (no misses counter)');
  for (let i = 0; i < 3; i++) { if (i === 1) { wrong().click(); await tick(); } right().click(); await tick(); }
  ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && !$('c-trophy').hidden && $('c-attempts').textContent === '4' && $('c-accuracy').textContent === '75%' && $('c-errors').textContent === '1', 'a short session finishes as usual: 4 attempts, 75%, 1 error');
  ok(!P.isComplete('phonemes'), 'but a session shorter than the full set does not check off the unit');

  /* ── Cancel, once something has been played, only closes the popup ── */
  $('retry-btn').click(); $('show-cat').click(); $('rev-btn').click(); slide('setup-rounds', 40);
  ok(!$('show-cat').checked && d.querySelectorAll('#kb-area .kb-group').length === 1, 'unchecking "Show categories" in the popup flattens the keyboard at once');
  $('setup-cancel').click();
  ok(!open() && $('show-cat').checked && d.querySelectorAll('#kb-area .kb-group').length > 1 && $('g-title').textContent === 'Telugu → IPA' && G().total === 3 && $('g-complete').classList.contains('show'), 'Cancel closes it and puts everything back: categories, direction, the finished session');
  $('retry-btn').click();
  ok($('setup-rounds').value === '3' && $('setup-dir').textContent === 'Telugu → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'what was cancelled is not remembered');
  press('Escape');
  ok(!open(), 'Escape cancels too');

  /* ── all the characters again: the ✓ comes back ── */
  $('retry-btn').click(); slide('setup-rounds', 51); $('setup-start').click();
  ok(G().total === 51 && !G().short && w.GameSetup && $('setup-rounds').value === '51', 'the slider at its top end is "all": 51');
  while (G().deck.length) { right().click(); await tick(); }
  ok(P.isComplete('phonemes') && $('c-sub').textContent === 'All 51 Telugu akshara correctly matched to their IPA phonemes.', 'a full session checks off the unit as before');

  /* ── the checkboxes: live in the popup, settled by Start, put back by Cancel ── */
  $('retry-btn').click(); $('setup-start').click();
  ok(G().total === 51, 'a full session is in play');
  reopen();
  $('include-extra').click();
  ok($('setup-rounds').max === '54' && $('setup-rounds').value === '54' && $('setup-rounds-n').value === '54' && $('setup-rounds-n').max === '54' && G().total === 51, 'checking "Include extra letters": the slider runs to 54 and "all" stays all; the session in play is untouched');
  $('include-extra').click();
  ok($('setup-rounds').max === '51' && $('setup-rounds').value === '51', 'unchecking it: back to 51');
  slide('setup-rounds', 10); $('include-extra').click();
  ok($('setup-rounds').max === '54' && $('setup-rounds').value === '10' && $('setup-rounds-n').value === '10', 'a chosen number stays put when the top end moves: 10 of 54');
  $('setup-start').click();
  ok(G().total === 10 && G().short && keys() === 54 && $('include-extra').checked, 'Start: 10 rounds drawn from the 54, with all 54 keys');
  reopen(); slide('setup-rounds', 54); $('setup-start').click();
  ok(G().total === 54 && !G().short, 'the slider at its top end with the extras on: all 54');
  // Cancel puts every checkbox back, and what follows them follows them back
  reopen();
  $('include-extra').click(); $('shuffle-kb').click(); $('highlight-correct').click();
  ok(!$('show-cat').checked && $('show-cat').disabled && !$('cat-note').hidden && $('cat-note').closest('#setup') && $('show-cat').closest('.menu-opt').classList.contains('disabled') && d.querySelectorAll('#kb-area .kb-group').length === 1,
    'checking "Shuffle keyboard" holds "Show categories" off, with its note, here in the popup');
  $('setup-cancel').click();
  ok(!open() && $('include-extra').checked && !$('shuffle-kb').checked && $('highlight-correct').checked && $('show-cat').checked && !$('show-cat').disabled && $('cat-note').hidden && d.querySelectorAll('#kb-area .kb-group').length > 1 && G().total === 54,
    'Cancel: all four boxes are as they were (categories back on, keyboard grouped again), and the session in play is untouched');
  reopen(); $('include-extra').click(); $('setup-start').click();
  ok(G().total === 51 && keys() === 51, 'extras off again: 51');
  reopen(); $('shuffle-kb').click(); $('setup-start').click();
  ok($('shuffle-kb').checked && !$('show-cat').checked && d.querySelectorAll('#kb-area .kb-group').length === 1 && keys() === 51, 'Start with "Shuffle keyboard": one flat block of 51 keys');
  reopen(); $('shuffle-kb').click(); $('show-cat').click(); $('setup-start').click();
  ok(!$('shuffle-kb').checked && $('show-cat').checked && d.querySelectorAll('#kb-area .kb-group').length > 1, 'and back to grouped');

  /* ── Tab stays inside ── */
  reopen();
  $('setup-cancel').focus(); press('Tab', $('setup-cancel'));
  const stops = [...$('setup').querySelectorAll('button, input')].filter(x => !x.disabled);
  stops[stops.length - 1].focus(); const ev = new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); stops[stops.length - 1].dispatchEvent(ev);
  ok(ev.defaultPrevented && d.activeElement === stops[0] && stops[0] === $('setup-cancel'), 'Tab from the last control goes back to the first: focus stays in the popup');
  $('setup-cancel').click();

  /* ── Cancel on the first open leaves the lesson ── */
  { let went = null; const f = load(PAGE, { setup: 'open', before: win => { Object.defineProperty(win, 'parent', { configurable: true, value: { location: { set hash(v) { went = v; } } } }); } });
    f.$('setup-cancel').click();
    ok(went === '#/' && f.$('setup').hidden, 'Cancel before anything is played goes back to Home (the page around this one is sent to #/)'); }
  { let went = null; const f = load(PAGE, { setup: 'open', before: win => { Object.defineProperty(win, 'parent', { configurable: true, value: { location: { set hash(v) { went = v; } } } }); } });
    f.$('setup-start').click(); f.w.GameSetup.current.open(); f.$('setup-cancel').click();
    ok(went === null, 'after Start, Cancel no longer leaves'); }

  /* ── "Allowed mistakes" at 0: the first mistake ends it ── */
  reopen(); slide('setup-misses', 0); $('setup-start').click();
  ok(G().limit === 0 && lives() === RING && $('s-lives').classList.contains('out'), 'at 0 an empty ring (⭕) from the start');
  wrong().click(); await tick();
  ok(G().over && $('c-title').textContent === 'Out of mistakes' && /No mistakes were allowed\.$/.test($('c-sub').textContent) && $('c-errors').textContent === '1', 'and the first mistake ends the session: ' + $('c-sub').textContent);
  $('retry-btn').click();
  ok($('setup-misses').value === '0' && $('setup-misses-out').textContent === '0' && $('setup-misses-note').textContent === 'Ends on the first mistake', 'the popup comes back with the slider at 0');
  slide('setup-misses', 20); $('setup-start').click();
  ok(lives() === H + '×20', 'at 20 the header reads ❤️×20');
  wrong().click(); await tick();
  ok(lives() === H + '×19', 'and a mistake takes one off: ❤️×19');
  reopen();
  $('setup-cancel').click();

  /* ── the popup is shared code ── */
  const src = fs.readFileSync(path.join(SITE_DIR, 'game-setup.js'), 'utf8');
  ok(/root\.GameSetup = api/.test(src) && w.GameSetup.current && !/phonemes|diacritics|conjuncts|Telugu →|show-cat|include-extra|include-uncommon|Shuffle/i.test(src.split('═════════════════════════════════════════════════════════ */')[1]), 'game-setup.js knows nothing about any one game: the page passes its title, directions, and checkboxes');
  const uses = f => /<script src="\.\.\/game-setup\.js"><\/script>/.test(fs.readFileSync(path.join(SITE_DIR, f), 'utf8'));
  ok(uses('alphabet/02_diacritics.html') && uses('alphabet/03_conjuncts.html') && !uses('alphabet/05_lookalikes.html') && !uses('alphabet/04_lookalike-builder.html'), 'Diacritics and Conjuncts open with it too; Lookalikes and the Lookalike Builder do not');

  /* ══ Diacritics ══ */
  {
    const PAGE = 'alphabet/02_diacritics.html', raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8');
    const h = load(PAGE, { setup: 'open' }), { w, d, tick, $ } = h, G = h.game, P = w.TeluguProgress;
    const slide = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
    const kb = k => [...d.querySelectorAll(`.kb-btn[data-kind="${k}"]`)], key = (k, ipa) => kb(k).find(b => b.dataset.ipa === ipa);
    const right = () => { const c = G().current; key('c', c.c.ipa).click(); key('v', c.v.ipa).click(); };
    const wrong = () => { const c = G().current; kb('c').find(b => b.dataset.ipa !== c.c.ipa).click(); key('v', c.v.ipa).click(); };
    const lives = () => $('s-lives').hidden ? 'hidden' : $('s-lives').textContent;          // the mistakes left, as the header shows them
    const rows = () => [...$('setup').querySelectorAll('.setup-label, .menu-opt')].map(e => e.textContent.replace('Off while keyboard is shuffled', '').trim()).join(' | ');
    ok(!$('setup').hidden && $('setup-title').textContent === 'Diacritics' && d.activeElement === $('setup-start') && raw.indexOf('GameSetup.create(') < raw.indexOf('GameMenu.init('), 'Diacritics: the popup is open as soon as the page is, titled "Diacritics", Start focused');
    ok(rows() === 'Direction | Number of rounds | Allowed mistakes | Show categories | Shuffle keyboard | Include extra letters', 'Diacritics: its options, in order: ' + rows());
    ok(!$('menu-btn') && !$('opts-menu') && !$('menu-wrap') && !/class="menu"|menu-btn/.test(raw) && !d.querySelector('.g-header .rev-btn') && $('rev-btn').closest('#setup'), 'Diacritics: no ⋮ menu and no 🔀 in the header; the 🔀 button is in the popup');
    ok($('setup-dir').textContent === 'Diacritics → IPA' && $('setup-rounds').max === '51' && $('setup-rounds').value === '51' && $('setup-rounds-n').value === '51' && $('setup-misses-out').textContent === 'Unlimited' && $('show-cat').checked && !$('shuffle-kb').checked && !$('include-extra').checked,
      'Diacritics: forward, 51 rounds (all: 17 signs × 3), unlimited misses, categories on');
    $('include-extra').click();
    ok($('setup-rounds').max === '57' && $('setup-rounds').value === '57' && G().total === 51 && kb('c').length === 35, 'Diacritics: "Include extra letters" takes the slider to 57; nothing is dealt until Start');
    $('include-extra').click(); $('rev-btn').click(); slide('setup-rounds', 6); slide('setup-misses', 3);
    $('setup-start').click();
    ok($('setup').hidden && $('g-title').textContent === 'IPA → Diacritics' && G().total === 6 && G().limit === 3 && G().short && lives() === L3 && kb('c').length === 35 && kb('v').length === 17 && kb('c').every(b => b.classList.contains('te')),
      'Diacritics: Start deals 6 rounds, reversed, with 3 mistakes allowed (three hearts); both keyboards are whole (35 + 17 Telugu keys)');
    wrong(); await tick(); await tick(); right(); await tick(); await tick(); wrong(); await tick(); await tick();
    ok(lives() === L1 && !G().over, 'Diacritics: two mistakes, one heart left');
    wrong(); await tick(); await tick();
    ok(lives() === RING && !G().over && !$('g-complete').classList.contains('show'), 'Diacritics: three mistakes, an empty ring (⭕), still playing');
    wrong(); await tick(); await tick();
    ok(G().over && $('g-complete').classList.contains('show') && $('c-title').textContent === 'Out of mistakes' && $('c-sub').textContent === '1 of 6 cleared. 3 mistakes were allowed.' && !P.isComplete('diacritics'), 'Diacritics: the fourth mistake ends the session: ' + $('c-sub').textContent);
    $('retry-btn').click();
    ok(!$('setup').hidden && $('setup-rounds').value === '6' && $('setup-misses-out').textContent === '3' && $('setup-dir').textContent === 'IPA → Diacritics', 'Diacritics: "Practice Again" opens the popup with the last choices');
    $('rev-btn').click(); slide('setup-rounds', 51); slide('setup-misses', w.GameSetup.MISS_STOPS + 1); $('include-extra').click(); $('shuffle-kb').click();
    ok($('setup-rounds').max === '57' && $('setup-rounds').value === '57' && !$('show-cat').checked && $('show-cat').disabled && !$('cat-note').hidden, 'Diacritics: extras on with the slider at its top keeps "all" (57); "Shuffle keyboard" holds categories off');
    $('setup-start').click();
    ok(G().total === 57 && !G().short && G().limit === null && lives() === 'hidden' && kb('c').length === 36 && kb('v').length === 19 && d.querySelectorAll('.kb-col[data-kind="c"] .kb-group').length === 1 && $('g-title').textContent === 'Diacritics → IPA',
      'Diacritics: Start deals all 57, forward, unlimited, on a shuffled keyboard with the extras (36 + 19 keys)');
    w.GameSetup.current.open(); $('include-extra').click(); $('shuffle-kb').click(); $('show-cat').click(); $('setup-start').click();
    let n = 0; while (G().deck.length && n++ < 200) { right(); await tick(); await tick(); }
    ok(G().total === 51 && $('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && P.isComplete('diacritics'), 'Diacritics: a full session of 51 checks off the unit as before');
    w.GameSetup.current.open(); $('include-extra').click(); $('shuffle-kb').click(); $('setup-cancel').click();
    ok($('setup').hidden && !$('include-extra').checked && !$('shuffle-kb').checked && $('show-cat').checked && !$('show-cat').disabled, 'Diacritics: Cancel puts the checkboxes back');
    let went = null; const f = load(PAGE, { setup: 'open', before: win => { Object.defineProperty(win, 'parent', { configurable: true, value: { location: { set hash(v) { went = v; } } } }); } });
    f.$('setup-cancel').click();
    ok(went === '#/', 'Diacritics: Cancel before anything is played goes back to Home');
  }

  /* ══ Conjuncts: the usual session is 40 of the 83 ══ */
  {
    const PAGE = 'alphabet/03_conjuncts.html', raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8');
    const h = load(PAGE, { setup: 'open' }), { w, d, tick, $ } = h, G = h.game, P = w.TeluguProgress;
    const slide = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
    const kb = () => [...d.querySelectorAll('#kb-area .kb-btn')], key = ipa => kb().find(b => b.dataset.ipa === ipa);
    const right = () => G().current.parts.forEach(p => key(p.ipa).click());
    const wrong = () => { const c = G().current, bad = kb().find(b => b.dataset.ipa !== c.parts[0].ipa); c.parts.forEach(() => bad.click()); };
    const lives = () => $('s-lives').hidden ? 'hidden' : $('s-lives').textContent;          // the mistakes left, as the header shows them
    const rows = () => [...$('setup').querySelectorAll('.setup-label, .menu-opt')].map(e => e.textContent.replace('Off while keyboard is shuffled', '').trim()).join(' | ');
    ok(!$('setup').hidden && $('setup-title').textContent === 'Conjuncts' && d.activeElement === $('setup-start') && raw.indexOf('GameSetup.create(') < raw.indexOf('GameMenu.init('), 'Conjuncts: the popup is open as soon as the page is, titled "Conjuncts", Start focused');
    ok(rows() === 'Direction | Number of rounds | Allowed mistakes | Show categories | Shuffle keyboard | Include uncommon clusters', 'Conjuncts: its options, in order: ' + rows());
    ok(!$('menu-btn') && !$('opts-menu') && !$('menu-wrap') && !/class="menu"|menu-btn/.test(raw) && !d.querySelector('.g-header .rev-btn') && $('rev-btn').closest('#setup'), 'Conjuncts: no ⋮ menu and no 🔀 in the header; the 🔀 button is in the popup');
    ok($('setup-dir').textContent === 'Conjuncts → IPA' && $('setup-rounds').max === '83' && $('setup-rounds').value === '40' && $('setup-rounds-n').value === '40' && $('setup-misses-out').textContent === 'Unlimited' && G().total === 40,
      'Conjuncts: the rounds slider starts at the usual 40 and runs to 83 (every common cluster)');
    $('include-uncommon').click();
    ok($('setup-rounds').max === '92' && $('setup-rounds').value === '40' && $('setup-rounds-n').max === '92', 'Conjuncts: "Include uncommon clusters" takes the top to 92; the 40 stays');
    $('include-uncommon').click();
    $('setup-start').click();
    ok($('setup').hidden && G().total === 40 && !G().short && G().limit === null && lives() === 'hidden' && kb().length === 34, 'Conjuncts: Start with the defaults deals the usual 40');
    let n = 0; while (G().deck.length && n++ < 200) { right(); await tick(); await tick(); }
    ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && P.isComplete('conjuncts'), 'Conjuncts: the usual 40 checks off the unit as before');
    $('retry-btn').click();
    ok(!$('setup').hidden && $('setup-rounds').value === '40', 'Conjuncts: "Practice Again" opens the popup, still at 40');
    slide('setup-rounds', 83); $('setup-start').click();
    ok(G().total === 83 && !G().short && new Set(G().deck.map(c => c.glyph)).size === 83 && G().deck.every(c => c.core), 'Conjuncts: the slider at its top end deals every common cluster once: 83');
    w.GameSetup.current.open();
    ok($('setup-rounds').value === '83', 'Conjuncts: the top end is remembered');
    $('include-uncommon').click();
    ok($('setup-rounds').max === '92' && $('setup-rounds').value === '92', 'Conjuncts: at the top end, "all" stays all when the uncommon clusters join: 92');
    $('setup-start').click();
    ok(G().total === 92 && kb().length === 35 && !!key('ɽ'), 'Conjuncts: all 92, with ఱ on the keyboard');
    w.GameSetup.current.open(); $('include-uncommon').click(); $('rev-btn').click(); slide('setup-rounds', 5); slide('setup-misses', 3); $('setup-start').click();
    ok(G().total === 5 && G().short && G().limit === 3 && $('g-title').textContent === 'IPA → Conjuncts' && lives() === L3 && kb().length === 34 && kb().every(b => b.classList.contains('te')), 'Conjuncts: 5 rounds, reversed, 3 mistakes allowed (three hearts): the whole keyboard (34 Telugu keys)');
    wrong(); await tick(); await tick(); wrong(); await tick(); await tick();
    ok(lives() === L1 && !G().over, 'Conjuncts: two mistakes, one heart left');
    wrong(); await tick(); await tick();
    ok(lives() === RING && !G().over, 'Conjuncts: three mistakes, an empty ring (⭕), still playing');
    wrong(); await tick(); await tick();
    ok(G().over && $('c-title').textContent === 'Out of mistakes' && $('c-sub').textContent === '0 of 5 cleared. 3 mistakes were allowed.' && $('c-errors').textContent === '4', 'Conjuncts: the fourth mistake ends the session: ' + $('c-sub').textContent);
    let went = null; const f = load(PAGE, { setup: 'open', before: win => { Object.defineProperty(win, 'parent', { configurable: true, value: { location: { set hash(v) { went = v; } } } }); } });
    f.$('setup-cancel').click();
    ok(went === '#/', 'Conjuncts: Cancel before anything is played goes back to Home');
  }
  h.done();
})();
