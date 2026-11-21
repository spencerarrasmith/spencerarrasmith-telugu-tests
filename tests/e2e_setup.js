// The session popup (game-setup.js), on the Phonemes page: it opens with the page and asks how to play.
// Cancel on the left, Start on the right; then every option the game has: direction, the number of rounds,
// the mistake that is game over, and its three checkboxes ("Group keyboard phonetically" starts off). The page has no ⋮ menu.
// Then the same popup on Diacritics and Conjuncts, with what is their own (their checkboxes, their number of rounds).
const load = require('./harness');
const fs = require('fs'), path = require('path'), { SITE_DIR } = require('./config');
const PAGE = 'alphabet/01_phonemes.html';
const raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8'), css = fs.readFileSync(path.join(SITE_DIR, 'game.css'), 'utf8');

const H = '\u2764\uFE0F', L3 = '\u{1F49A}\u{1F90D}\u{1F9E1}', L2 = '\u{1F90D}\u{1F9E1}', L1 = '\u{1F9E1}', RING = '\u2B55', EVER = H + '×\u267E\uFE0F';       // ❤️ (four or more left) · 💚🤍🧡 · 🤍🧡 · 🧡 · ⭕ (none left)

(async () => {
  const h = load(PAGE, { setup: 'open' }), { w, d, ok, tick, $ } = h, G = h.game, P = w.TeluguProgress;
  const open = () => !$('setup').hidden;
  const slide = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  const typeRounds = v => { $('setup-rounds-n').value = v; $('setup-rounds-n').dispatchEvent(new w.Event('input', { bubbles: true })); };
  const press = (k, target = d.activeElement || d.body) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const live = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];        // the game's keys (not ౧౨౩, not the dimmed ones)
  const wrong = () => live().find(b => b.dataset.ch !== G().current.ch);
  const right = () => live().find(b => b.dataset.ch === G().current.ch);
  const grouped = () => d.querySelector('#kb-area .gkb').dataset.mode === 'grouped' && d.querySelectorAll('#kb-area .kb-group').length > 1;
  const layout = () => d.querySelector('#kb-area .gkb').dataset.mode === 'layout' && d.querySelectorAll('#kb-area .kb-group').length === 0;
  const lives = () => $('s-lives').hidden ? 'hidden' : $('s-lives').textContent;          // the mistakes left, as the header shows them
  const reopen = () => w.GameSetup.current.open();           // what "Practice Again" does, without finishing a session first
  const keys = () => live().length;

  /* ── it opens with the page ── */
  ok(lives() === EVER && !$('s-lives').hidden && !/<span class="g-lives" id="s-lives" role="img" hidden>/.test(fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8')), 'the header shows the mistakes left from the start: ❤️×♾️ while there is no limit');
  ok(open() && $('setup').classList.contains('setup') && $('setup').querySelector('[role="dialog"]').getAttribute('aria-modal') === 'true' && $('setup-title').textContent === 'Phonemes', 'the popup is open as soon as the page is, titled "Phonemes"');
  const head = [...$('setup').querySelector('.setup-head').children].map(e => e.id);
  ok(head.join() === 'setup-cancel,setup-title,setup-start' && $('setup-cancel').textContent === 'Cancel' && $('setup-start').textContent === 'Start', 'Cancel is on the left, Start on the right, the title between');
  const rows = [...$('setup').querySelectorAll('.setup-label, .menu-opt')].map(e => e.textContent.trim());
  ok(rows.join(' | ') === 'Direction | Number of rounds | Game over | Group keyboard phonetically | Highlight correct answer | Missed guesses reappear', 'the options, in order (direction, the sliders, then the checkboxes): ' + rows.join(' | '));
  ok(!$('show-cat') && !$('shuffle-kb') && !$('include-extra') && !$('cat-note'), 'no "Show categories", "Shuffle keyboard", or "Include extra letters" any more');
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
  ok($('setup-misses').type === 'range' && $('setup-misses').min === '1' && d.querySelector('label[for="setup-misses"]').textContent === 'Game over' && $('setup-misses').value === $('setup-misses').max && $('setup-misses-out').textContent === 'Unlimited' && $('setup-misses-note').textContent === 'Never ends early' && /^Unlimited/.test($('setup-misses').getAttribute('aria-valuetext')) && $('setup-misses-note').previousElementSibling === $('setup-misses').parentElement, '"Game over": a slider from 1, at Unlimited, with the note "Never ends early" under it');
  ok(['group-kb', 'highlight-correct', 'missed-again'].every(id => $(id).closest('#setup-opts')) && !$('group-kb').checked && $('highlight-correct').checked && $('missed-again').checked, 'the three checkboxes are here: highlight and "Missed guesses reappear" on; grouping off');
  ok(layout() && $('cat-badge').style.visibility === 'hidden', 'not grouped, the keyboard behind is laid out as the Telugu keyboard, and the card has no label');
  $('group-kb').click();
  ok($('group-kb').checked && grouped() && $('cat-badge').style.visibility === '', 'checking "Group keyboard phonetically" groups the keyboard and labels the card at once (kept on for the rest of this page)');
  ok($('setup-dir').textContent === 'Telugu → IPA' && $('rev-btn').closest('#setup') && $('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false' && !d.querySelector('.g-header .rev-btn'), 'direction: Telugu → IPA, with the 🔀 button here and no longer in the header');

  /* ── the slider and the text box are one value ── */
  slide('setup-rounds', 20); ok($('setup-rounds-n').value === '20', 'moving the slider sets the text box: 20');
  typeRounds('7'); ok($('setup-rounds').value === '7', 'typing in the text box moves the slider: 7');
  typeRounds('500'); ok($('setup-rounds').value === '51', 'a number past the top is held at 51 on the slider');
  $('setup-rounds-n').dispatchEvent(new w.Event('change', { bubbles: true })); ok($('setup-rounds-n').value === '51', 'and the box settles on 51 when it is left');
  typeRounds('0'); $('setup-rounds-n').dispatchEvent(new w.Event('change', { bubbles: true })); ok($('setup-rounds-n').value === '1' && $('setup-rounds').value === '1', 'never fewer than 1');
  typeRounds(''); ok($('setup-rounds').value === '1', 'an empty box leaves the slider where it was');
  const note = v => { slide('setup-misses', v); return $('setup-misses-out').textContent + ' · ' + $('setup-misses-note').textContent; };
  ok(note(3) === '3 · Ends on the 3rd mistake' && $('setup-misses').getAttribute('aria-valuetext') === '3: ends on the 3rd mistake', 'the slider says its number and the note says what it means: ' + note(3));
  ok(note(1) === '1 · Ends on the first mistake' && $('setup-misses').min === '1', 'down to 1, the least: ' + note(1));
  ok(note(2) === '2 · Ends on the 2nd mistake' && note(4) === '4 · Ends on the 4th mistake', 'the number is the mistake that ends it: 2 on the 2nd, 4 on the 4th');
  ok(note(11) === '11 · Ends on the 11th mistake' && note(12) === '12 · Ends on the 12th mistake' && note(13) === '13 · Ends on the 13th mistake', 'the teens are spelled right: 11th, 12th, 13th');
  ok(note(w.GameSetup.MISS_STOPS) === '20 · Ends on the 20th mistake', 'up to 20: ' + note(w.GameSetup.MISS_STOPS));
  ok(note(w.GameSetup.MISS_STOPS + 1) === 'Unlimited · Never ends early', 'and one more stop is Unlimited');

  /* ── nothing changes until Start ── */
  ok(G().total === 51 && G().limit === null && $('g-title').textContent === 'Telugu → IPA', 'behind the popup a full round is dealt, forward, with no limit');
  $('rev-btn').click(); slide('setup-rounds', 5); slide('setup-misses', 3);
  ok($('setup-dir').textContent === 'IPA → Telugu' && $('rev-btn').getAttribute('aria-pressed') === 'true' && $('g-title').textContent === 'Telugu → IPA' && G().total === 51, '🔀 turns the direction around in the popup only: the game is untouched');
  $('setup-start').click();
  ok(!open() && $('g-title').textContent === 'IPA → Telugu' && G().total === 5 && G().deck.length === 5 && G().limit === 3 && G().completed === 0 && $('s-total').textContent === '5' && $('s-rem').textContent === '5', 'Start: the popup closes and a session of 5 is dealt, reversed, with "Game over" at 3');
  ok(keys() === 51 && live().every(b => b.classList.contains('te')), 'the keyboard still has all 51 letters, as Telugu keys: fewer rounds, not fewer choices');
  ok(lives() === L3 && $('s-lives').getAttribute('aria-label') === 'Mistakes left: 3' && $('s-lives').closest('.g-stats'), 'the header shows the mistakes left as hearts, green white orange for the last three: ' + lives());
  ok(new Set(G().deck.map(c => c.ch)).size === 5 && G().deck.every(c => w.TeluguData.letters.includes(c)), 'the 5 are different letters from the usual pool');

  /* ── game over ── */
  wrong().click(); await tick();
  ok(lives() === L2 && !G().over && G().deck.length === 5, 'one mistake: the green heart goes (white and orange left), play goes on');
  right().click(); await tick();
  wrong().click(); await tick();
  ok(lives() === L1 && !G().over && !$('g-complete').classList.contains('show'), 'two mistakes: the orange heart is the last, still playing');
  wrong().click();
  ok(G().over && lives() === RING && $('s-lives').classList.contains('out'), 'with "Game over" at 3 the third mistake ends the session, there and then: the last heart gives way to an empty ring (⭕)');
  await tick();
  ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Game Over' && $('c-trophy').hidden && $('c-sub').textContent === '1 of 5 cleared. Game over at 3 mistakes.', 'the complete screen: "Game Over" · ' + $('c-sub').textContent);
  ok($('c-attempts').textContent === '4' && $('c-accuracy').textContent === '25%' && $('c-errors').textContent === '3', 'its numbers: 4 attempts, 25%, 3 errors');
  ok(JSON.stringify(P.runs('phonemes').map(r => [r.n, r.ok, r.tries, r.end, r.dir])) === '[[5,1,4,"out","reverse"]]' && P.misses().length >= 1 && P.misses().every(m => m.game === 'phonemes-reverse'), 'the session is recorded as one that ended early (5 cards, 1 correct, 4 answers, reversed); the misses still go to Review');

  /* ── Practice Again asks again, with the last choices ── */
  $('retry-btn').click();
  ok(open() && $('setup-rounds').value === '5' && $('setup-rounds-n').value === '5' && $('setup-misses-out').textContent === '3' && $('setup-dir').textContent === 'IPA → Telugu' && $('g-complete').classList.contains('show'), '"Practice Again" opens the popup with the last choices; nothing is dealt yet');
  $('rev-btn').click(); slide('setup-misses', w.GameSetup.MISS_STOPS + 1); typeRounds('3');
  press('Enter');
  ok(!open() && G().total === 3 && G().limit === null && $('g-title').textContent === 'Telugu → IPA' && lives() === EVER && $('s-lives').closest('.g-stats') && !$('g-complete').classList.contains('show'), 'Enter starts: 3 rounds, forward, unlimited (the header reads ❤️×♾️)');
  for (let i = 0; i < 3; i++) { if (i === 1) { wrong().click(); await tick(); } right().click(); await tick(); }
  ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && !$('c-trophy').hidden && $('c-attempts').textContent === '4' && $('c-accuracy').textContent === '75%' && $('c-errors').textContent === '1', 'a short session finishes as usual: 4 attempts, 75%, 1 error');
  ok(JSON.stringify(P.runs('phonemes').slice(1).map(r => [r.n, r.ok, r.tries, r.end, r.dir])) === '[[3,3,4,"done",null]]', 'and it is recorded like any other session: 3 cards, 3 correct, 4 answers, forward');

  /* ── Cancel, once something has been played, only closes the popup ── */
  $('retry-btn').click(); $('group-kb').click(); $('rev-btn').click(); slide('setup-rounds', 40);
  ok(!$('group-kb').checked && layout(), 'unchecking "Group keyboard phonetically" in the popup lays the keyboard out as the Telugu keyboard at once');
  $('setup-cancel').click();
  ok(!open() && $('group-kb').checked && grouped() && $('g-title').textContent === 'Telugu → IPA' && G().total === 3 && $('g-complete').classList.contains('show'), 'Cancel closes it and puts everything back: the grouping, direction, the finished session');
  $('retry-btn').click();
  ok($('setup-rounds').value === '3' && $('setup-dir').textContent === 'Telugu → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'what was cancelled is not remembered');
  press('Escape');
  ok(!open(), 'Escape cancels too');

  /* ── all the characters again: the ✓ comes back ── */
  $('retry-btn').click(); slide('setup-rounds', 51); $('setup-start').click();
  ok(G().total === 51 && w.GameSetup && $('setup-rounds').value === '51', 'the slider at its top end is "all": 51');
  while (G().deck.length) { right().click(); await tick(); }
  ok(P.runs('phonemes').at(-1).n === 51 && P.runs('phonemes').at(-1).tries === 51 && P.runs('phonemes').at(-1).end === 'done' && $('c-sub').textContent === 'All 51 Telugu akshara correctly matched to their IPA phonemes.', 'a full session is recorded with all 51, without a mistake');

  /* ── the checkboxes: live in the popup, settled by Start, put back by Cancel ── */
  $('retry-btn').click(); $('setup-start').click();
  ok(G().total === 51, 'a full session is in play');
  reopen();
  ok($('setup-rounds').max === '51' && $('setup-rounds-n').max === '51', 'the most rounds is 51: there are no extra letters to add');
  $('group-kb').click(); $('highlight-correct').click();
  ok(!$('group-kb').checked && layout() && G().total === 51, 'unchecking "Group keyboard phonetically" lays the keyboard out at once; the session in play is untouched');
  $('setup-cancel').click();
  ok(!open() && $('group-kb').checked && $('highlight-correct').checked && grouped() && G().total === 51, 'Cancel: both boxes are as they were (the keyboard grouped again), and the session in play is untouched');
  reopen(); $('group-kb').click(); $('setup-start').click();
  ok(!$('group-kb').checked && layout() && keys() === 51, 'Start not grouped: the 51 keys laid out as the Telugu keyboard');
  reopen(); $('group-kb').click(); $('setup-start').click();
  ok($('group-kb').checked && grouped() && keys() === 51, 'and back to grouped');

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

  /* ── "Game over" at 1: the first mistake ends it ── */
  reopen(); slide('setup-misses', 1); $('setup-start').click();
  ok(G().limit === 1 && lives() === L1 && !$('s-lives').classList.contains('out'), 'at 1 the header shows one heart');
  wrong().click(); await tick();
  ok(G().over && lives() === RING && $('c-title').textContent === 'Game Over' && /Game over at 1 mistake\.$/.test($('c-sub').textContent) && $('c-errors').textContent === '1', 'and the first mistake ends the session: ' + $('c-sub').textContent);
  $('retry-btn').click();
  ok($('setup-misses').value === '1' && $('setup-misses-out').textContent === '1' && $('setup-misses-note').textContent === 'Ends on the first mistake', 'the popup comes back with the slider at 1');
  slide('setup-misses', 20); $('setup-start').click();
  ok(lives() === H + '×20', 'at 20 the header reads ❤️×20');
  wrong().click(); await tick();
  ok(lives() === H + '×19', 'and a mistake takes one off: ❤️×19');
  reopen();
  $('setup-cancel').click();

  /* ── "Missed guesses reappear": on, the game is as it always was; off, a wrong guess is not shown again ── */
  reopen(); slide('setup-rounds', 4); slide('setup-misses', w.GameSetup.MISS_STOPS + 1); $('setup-start').click();
  ok(G().again === true && $('missed-again').checked, 'left checked, missed cards come back');
  let missed = G().current.ch; wrong().click(); await tick();
  ok(G().deck.length === 4 && G().deck.some(c => c.ch === missed) && G().dropped === 0 && $('s-rem').textContent === '4', 'a wrong guess goes back into the deck: still 4 to clear');
  reopen(); $('missed-again').click();
  ok(!$('missed-again').checked && G().again === true && G().deck.length === 4, 'unchecking it changes nothing until Start');
  $('setup-start').click();
  ok(G().again === false && G().total === 4 && G().limit === null, 'Start deals a session in which missed cards do not come back');
  missed = G().current.ch; const miss0 = P.misses().length; wrong().click();
  ok(G().dropped === 1 && G().deck.length === 3 && !G().deck.some(c => c.ch === missed) && $('s-rem').textContent === '3' && $('s-done').textContent === '0' && $('s-total').textContent === '4' && $('char-card').classList.contains('wrong'),
    'a wrong guess is marked wrong and the character leaves the session: 3 remaining, 0 of 4 correct');
  ok(P.misses().some(m => m.key === missed), 'it still goes to Review');
  await tick();
  ok(G().current.ch !== missed && !$('g-complete').classList.contains('show'), 'the next card is another character');
  const shown = [missed]; for (let i = 0; i < 3; i++) { shown.push(G().current.ch); right().click(); await tick(); }
  ok(new Set(shown).size === 4 && G().attempts === 4 && $('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && $('c-sub').textContent === '3 of 4 correct. The 1 missed was not shown again.',
    'four answers end the session, each character shown once: ' + $('c-sub').textContent);
  ok($('c-attempts').textContent === '4' && $('c-accuracy').textContent === '75%' && $('c-errors').textContent === '1' && JSON.stringify([P.runs('phonemes').at(-1)].map(r => [r.n, r.ok, r.tries, r.end])) === '[[4,3,4,"done"]]', 'its numbers: 4 attempts, 75%, 1 error; recorded as 3 correct of 4');
  $('retry-btn').click();
  ok(!$('missed-again').checked, '"Practice Again" opens the popup with the box still unchecked');
  $('missed-again').click(); $('setup-cancel').click();
  ok(!$('missed-again').checked, 'Cancel puts the box back as it was');
  reopen(); $('missed-again').click(); $('setup-start').click();
  ok(G().again === true && $('missed-again').checked, 'checked again, the next session brings missed cards back');
  reopen(); $('setup-cancel').click();

  /* ── the popup is shared code ── */
  const src = fs.readFileSync(path.join(SITE_DIR, 'game-setup.js'), 'utf8');
  ok(/root\.GameSetup = api/.test(src) && w.GameSetup.current && !/phonemes|diacritics|conjuncts|Telugu →|show-cat|include-extra|include-uncommon|missed-again|Shuffle/i.test(src.split('═════════════════════════════════════════════════════════ */')[1]), 'game-setup.js knows nothing about any one game: the page passes its title, directions, and checkboxes');
  const uses = f => /<script src="\.\.\/game-setup\.js"><\/script>/.test(fs.readFileSync(path.join(SITE_DIR, f), 'utf8'));
  ok(uses('alphabet/02_diacritics.html') && uses('alphabet/03_conjuncts.html') && !uses('training/03_lookalikes.html') && !uses('training/02_lookalike-builder.html'), 'Diacritics and Conjuncts open with it too; Lookalikes and the Lookalike Builder do not');

  /* ══ Diacritics ══ */
  {
    const PAGE = 'alphabet/02_diacritics.html', raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8');
    const h = load(PAGE, { setup: 'open' }), { w, d, tick, $ } = h, G = h.game, P = w.TeluguProgress;
    const slide = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
    const kb = k => [...d.querySelectorAll(`#kb-area button.kb-btn[data-kind="${k}"]`)], key = (k, ipa) => kb(k).find(b => b.dataset.ipa === ipa);
    const layout = () => d.querySelector('#kb-area .gkb').dataset.mode === 'layout', groups = () => d.querySelectorAll('#kb-area .kb-group').length;
    const right = () => { const c = G().current; key('c', c.c.ipa).click(); key('v', c.v.ipa).click(); };
    const wrong = () => { const c = G().current; kb('c').find(b => b.dataset.ipa !== c.c.ipa).click(); key('v', c.v.ipa).click(); };
    const lives = () => $('s-lives').hidden ? 'hidden' : $('s-lives').textContent;          // the mistakes left, as the header shows them
    const rows = () => [...$('setup').querySelectorAll('.setup-label, .menu-opt')].map(e => e.textContent.trim()).join(' | ');
    ok(!$('setup').hidden && $('setup-title').textContent === 'Diacritics' && d.activeElement === $('setup-start') && raw.indexOf('GameSetup.create(') < raw.indexOf('GameMenu.init('), 'Diacritics: the popup is open as soon as the page is, titled "Diacritics", Start focused');
    ok(rows() === 'Direction | Number of rounds | Game over | Group keyboard phonetically | Missed guesses reappear', 'Diacritics: its options, in order: ' + rows());
    ok(!$('menu-btn') && !$('opts-menu') && !$('menu-wrap') && !/class="menu"|menu-btn/.test(raw) && !d.querySelector('.g-header .rev-btn') && $('rev-btn').closest('#setup'), 'Diacritics: no ⋮ menu and no 🔀 in the header; the 🔀 button is in the popup');
    ok($('setup-dir').textContent === 'Diacritics → IPA' && $('setup-rounds').max === '51' && $('setup-rounds').value === '51' && $('setup-rounds-n').value === '51' && $('setup-misses-out').textContent === 'Unlimited' && !$('group-kb').checked && layout() && groups() === 0,
      'Diacritics: forward, 51 rounds (all: 17 signs × 3), no game over, not grouped (the Telugu keyboard\'s layout)');
    $('group-kb').click();                                  // on for the rest of this page
    ok(!layout() && groups() > 2 && G().total === 51 && kb('c').length === 35, 'Diacritics: "Group keyboard phonetically" groups the keys at once; nothing is dealt until Start');
    $('rev-btn').click(); slide('setup-rounds', 6); slide('setup-misses', 3);
    $('setup-start').click();
    ok($('setup').hidden && $('g-title').textContent === 'IPA → Diacritics' && G().total === 6 && G().limit === 3 && lives() === L3 && kb('c').length === 35 && kb('v').length === 17 && kb('c').every(b => b.classList.contains('te')),
      'Diacritics: Start deals 6 rounds, reversed, with game over at 3 (three hearts); both keyboards are whole (35 + 17 Telugu keys)');
    wrong(); await tick(); await tick(); right(); await tick(); await tick(); wrong(); await tick(); await tick();
    ok(lives() === L1 && !G().over, 'Diacritics: two mistakes, one heart left');
    wrong(); await tick(); await tick();
    ok(G().over && lives() === RING && $('g-complete').classList.contains('show') && $('c-title').textContent === 'Game Over' && $('c-sub').textContent === '1 of 6 cleared. Game over at 3 mistakes.' && P.runs('diacritics').at(-1).end === 'out' && P.runs('diacritics').at(-1).dir === 'reverse', 'Diacritics: the third mistake is game over (recorded as ended early, reversed): ' + $('c-sub').textContent);
    $('retry-btn').click();
    ok(!$('setup').hidden && $('setup-rounds').value === '6' && $('setup-misses-out').textContent === '3' && $('setup-dir').textContent === 'IPA → Diacritics', 'Diacritics: "Practice Again" opens the popup with the last choices');
    $('rev-btn').click(); slide('setup-rounds', 51); slide('setup-misses', w.GameSetup.MISS_STOPS + 1); $('group-kb').click();
    $('setup-start').click();
    ok(G().total === 51 && G().limit === null && lives() === EVER && kb('c').length === 35 && kb('v').length === 17 && layout() && $('g-title').textContent === 'Diacritics → IPA',
      'Diacritics: Start deals all 51, forward, unlimited, on the Telugu keyboard\'s layout (35 + 17 keys)');
    w.GameSetup.current.open(); $('group-kb').click(); $('setup-start').click();
    let n = 0; while (G().deck.length && n++ < 200) { right(); await tick(); await tick(); }
    ok(G().total === 51 && $('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && P.runs('diacritics').at(-1).end === 'done' && P.runs('diacritics').at(-1).n === 51 && !P.runs('diacritics').at(-1).dir, 'Diacritics: a full session of 51 is recorded for the Profile page');
    w.GameSetup.current.open(); $('group-kb').click(); $('missed-again').click(); $('setup-cancel').click();
    ok($('setup').hidden && $('group-kb').checked && $('missed-again').checked && !layout(), 'Diacritics: Cancel puts the checkboxes back');
    w.GameSetup.current.open();
    ok($('missed-again').checked && $('missed-again').closest('#setup-opts') && G().again === true, 'Diacritics: "Missed guesses reappear" is on to begin with');
    $('missed-again').click(); slide('setup-rounds', 3); $('setup-start').click();
    const lost = G().current.glyph; wrong(); await tick(); await tick();
    ok(G().again === false && G().dropped === 1 && G().deck.length === 2 && !G().deck.some(c => c.glyph === lost) && $('s-rem').textContent === '2', 'Diacritics: unchecked, a missed syllable is not shown again (2 of 3 left)');
    right(); await tick(); await tick(); right(); await tick(); await tick();
    ok($('g-complete').classList.contains('show') && $('c-sub').textContent === '2 of 3 correct. The 1 missed was not shown again.' && P.runs('diacritics').at(-1).ok === 2 && P.runs('diacritics').at(-1).tries === 3, 'Diacritics: three answers end it: ' + $('c-sub').textContent);
    $('retry-btn').click(); $('missed-again').click(); $('setup-cancel').click();
    let went = null; const f = load(PAGE, { setup: 'open', before: win => { Object.defineProperty(win, 'parent', { configurable: true, value: { location: { set hash(v) { went = v; } } } }); } });
    f.$('setup-cancel').click();
    ok(went === '#/', 'Diacritics: Cancel before anything is played goes back to Home');
  }

  /* ══ Conjuncts: the usual session is 40 of the 83 ══ */
  {
    const PAGE = 'alphabet/03_conjuncts.html', raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8');
    const h = load(PAGE, { setup: 'open' }), { w, d, tick, $ } = h, G = h.game, P = w.TeluguProgress;
    const slide = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
    const kb = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')], key = ipa => kb().find(b => b.dataset.ipa === ipa);
    const right = () => G().current.parts.forEach(p => key(p.ipa).click());
    const wrong = () => { const c = G().current, bad = kb().find(b => b.dataset.ipa !== c.parts[0].ipa); c.parts.forEach(() => bad.click()); };
    const lives = () => $('s-lives').hidden ? 'hidden' : $('s-lives').textContent;          // the mistakes left, as the header shows them
    const rows = () => [...$('setup').querySelectorAll('.setup-label, .menu-opt')].map(e => e.textContent.trim()).join(' | ');
    ok(!$('setup').hidden && $('setup-title').textContent === 'Conjuncts' && d.activeElement === $('setup-start') && raw.indexOf('GameSetup.create(') < raw.indexOf('GameMenu.init('), 'Conjuncts: the popup is open as soon as the page is, titled "Conjuncts", Start focused');
    ok(rows() === 'Direction | Number of rounds | Game over | Group keyboard phonetically | Include uncommon clusters | Missed guesses reappear', 'Conjuncts: its options, in order: ' + rows());
    ok(!$('menu-btn') && !$('opts-menu') && !$('menu-wrap') && !/class="menu"|menu-btn/.test(raw) && !d.querySelector('.g-header .rev-btn') && $('rev-btn').closest('#setup'), 'Conjuncts: no ⋮ menu and no 🔀 in the header; the 🔀 button is in the popup');
    ok($('setup-dir').textContent === 'Conjuncts → IPA' && $('setup-rounds').max === '83' && $('setup-rounds').value === '40' && $('setup-rounds-n').value === '40' && $('setup-misses-out').textContent === 'Unlimited' && G().total === 40,
      'Conjuncts: the rounds slider starts at the usual 40 and runs to 83 (every common cluster)');
    $('include-uncommon').click();
    ok($('setup-rounds').max === '92' && $('setup-rounds').value === '40' && $('setup-rounds-n').max === '92', 'Conjuncts: "Include uncommon clusters" takes the top to 92; the 40 stays');
    $('include-uncommon').click();
    $('setup-start').click();
    ok($('setup').hidden && G().total === 40 && G().limit === null && lives() === EVER && kb().length === 34, 'Conjuncts: Start with the defaults deals the usual 40, with ❤️×♾️ in the header');
    let n = 0; while (G().deck.length && n++ < 200) { right(); await tick(); await tick(); }
    ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && P.runs('conjuncts').length === 1 && P.runs('conjuncts')[0].n === 40 && P.runs('conjuncts')[0].end === 'done', 'Conjuncts: the usual 40 is recorded for the Profile page');
    $('retry-btn').click();
    ok(!$('setup').hidden && $('setup-rounds').value === '40', 'Conjuncts: "Practice Again" opens the popup, still at 40');
    slide('setup-rounds', 83); $('setup-start').click();
    ok(G().total === 83 && new Set(G().deck.map(c => c.glyph)).size === 83 && G().deck.every(c => c.core), 'Conjuncts: the slider at its top end deals every common cluster once: 83');
    w.GameSetup.current.open();
    ok($('setup-rounds').value === '83', 'Conjuncts: the top end is remembered');
    $('include-uncommon').click();
    ok($('setup-rounds').max === '92' && $('setup-rounds').value === '92', 'Conjuncts: at the top end, "all" stays all when the uncommon clusters join: 92');
    $('setup-start').click();
    ok(G().total === 92 && kb().length === 34 && !key('ɽ') && G().deck.every(c => c.parts.every(p => p.inBook)), 'Conjuncts: all 92, on the same 34 keys: no uncommon cluster uses a letter out of use (ఱ ౘ ౙ)');
    w.GameSetup.current.open(); $('include-uncommon').click(); $('rev-btn').click(); slide('setup-rounds', 5); slide('setup-misses', 3); $('setup-start').click();
    ok(G().total === 5 && G().limit === 3 && $('g-title').textContent === 'IPA → Conjuncts' && lives() === L3 && kb().length === 34 && kb().every(b => b.classList.contains('te')), 'Conjuncts: 5 rounds, reversed, game over at 3 (three hearts): the whole keyboard (34 Telugu keys)');
    wrong(); await tick(); await tick(); wrong(); await tick(); await tick();
    ok(lives() === L1 && !G().over, 'Conjuncts: two mistakes, one heart left');
    wrong(); await tick(); await tick();
    ok(G().over && lives() === RING && $('c-title').textContent === 'Game Over' && $('c-sub').textContent === '0 of 5 cleared. Game over at 3 mistakes.' && $('c-errors').textContent === '3', 'Conjuncts: the third mistake is game over: ' + $('c-sub').textContent);
    w.GameSetup.current.open();
    ok($('missed-again').checked && $('missed-again').closest('#setup-opts') && G().again === true, 'Conjuncts: "Missed guesses reappear" is on to begin with');
    $('missed-again').click(); slide('setup-rounds', 3); slide('setup-misses', w.GameSetup.MISS_STOPS + 1); $('setup-start').click();
    const lost = G().current.glyph; wrong(); await tick(); await tick();
    ok(G().again === false && G().dropped === 1 && G().deck.length === 2 && !G().deck.some(c => c.glyph === lost) && $('s-rem').textContent === '2', 'Conjuncts: unchecked, a missed conjunct is not shown again (2 of 3 left)');
    right(); await tick(); await tick(); right(); await tick(); await tick();
    ok($('g-complete').classList.contains('show') && $('c-sub').textContent === '2 of 3 correct. The 1 missed was not shown again.' && P.runs('conjuncts').at(-1).ok === 2 && P.runs('conjuncts').at(-1).tries === 3, 'Conjuncts: three answers end it: ' + $('c-sub').textContent);
    let went = null; const f = load(PAGE, { setup: 'open', before: win => { Object.defineProperty(win, 'parent', { configurable: true, value: { location: { set hash(v) { went = v; } } } }); } });
    f.$('setup-cancel').click();
    ok(went === '#/', 'Conjuncts: Cancel before anything is played goes back to Home');
  }
  h.done();
})();
