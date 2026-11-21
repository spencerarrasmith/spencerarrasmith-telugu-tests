const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const D = w.TeluguData, P = w.TeluguProgress;
const vis  = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];      // the game's keys (not ౧౨౩, not the dimmed ones)
const byCh = ch => vis().find(b => b.dataset.ch === ch);
const byIpa = ipa => vis().find(b => b.dataset.ipa === ipa);
const cur  = () => G().current;
const lit  = () => d.querySelectorAll('.kb-btn.ok').length;
(async () => {
  ok(!$('group-kb').checked && $('cat-badge').style.visibility === 'hidden' && d.querySelectorAll('#kb-area .kb-label').length === 0, 'not grouped to begin with: the Telugu keyboard\'s layout, no label on the card');
  $('group-kb').click();                                    // on for the rest of this suite, which is about the grouped keyboard
  /* ── controls + defaults ── */
  ok($('g-title').textContent === 'Telugu → IPA', 'forward title: Telugu → IPA');
  ok($('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false' && $('rev-btn').closest('#setup') && !$('g-title').closest('.g-header').querySelector('.rev-btn'), 'the 🔀 button is in the session popup, not pressed; the header no longer has one');
  ok($('highlight-correct').checked && $('highlight-correct').parentElement.textContent.includes('Highlight correct answer'), '"Highlight correct answer" checkbox exists, on by default');
  ok(!$('opts-menu') && !$('menu-btn') && d.querySelectorAll('#setup input[type=checkbox]').length === 3, 'no ⋮ menu on this page: the three checkboxes (group keyboard phonetically, highlight, missed guesses reappear) are in the session popup');
  ok(vis().every(b => !b.classList.contains('te')) && vis()[0].textContent === 'ɐ', 'forward keys show IPA (first key: ɐ)');

  /* ── highlight checkbox, forward mode ── */
  front(x => x.ipa === 'k');
  byIpa('g'.replace('g', 'ɡ')).click();
  ok(lit() === 1 && byIpa('k').classList.contains('ok'), 'highlight ON: correct key lights up after a wrong guess');
  ok($('feedback').textContent.trim() === '✗  /ɡ/' && !$('feedback').classList.contains('te'), 'the line under the card shows what was picked (/ɡ/), not the answer (/k/): ' + $('feedback').textContent.trim());
  await tick(); await tick();
  ok(lit() === 0, 'highlight clears again');
  $('highlight-correct').checked = false;
  front(x => x.ipa === 'k');
  const wrongBtn = byIpa('ɡ'); wrongBtn.click();
  ok(lit() === 0 && wrongBtn.classList.contains('err'), 'highlight OFF: wrong key turns red, correct key is NOT lit');
  ok($('feedback').textContent.trim() === '✗  /ɡ/' && !$('feedback').textContent.includes('k'), 'with highlight off nothing gives the answer: the line shows the pick, ✗ /ɡ/');
  await tick(); await tick();
  ok(P.misses().find(m => m.game === 'phonemes' && m.key === 'క'), 'miss still recorded with highlight off');
  $('highlight-correct').checked = true;

  /* ── reverse: switch ── */
  const doneBefore = G().completed;
  byIpa('ɐ'); front(x => x.ipa === 'ɐ'); byIpa('ɐ').click();
  ok($('feedback').textContent.trim() === '✓  /ɐ/' && $('feedback').classList.contains('ok'), 'a right pick is shown the same way: ✓ /ɐ/');
  ok(/GameCore\.create\(\{[^}]*?errMs:\s*1500\b/.test(require('fs').readFileSync(require('path').join(require('./config').SITE_DIR, 'alphabet/01_phonemes.html'), 'utf8')), 'Phonemes: a wrong pick stays on screen for 1.5 seconds (errMs: 1500)');
  await tick(); await tick();
  ok(G().completed === 1, 'one card cleared before switching');
  h.flip();
  ok($('g-title').textContent === 'IPA → Telugu' && $('rev-btn').getAttribute('aria-pressed') === 'true', 'title flips to IPA → Telugu, button pressed');
  ok(G().completed === 0 && G().deck.length === 51 && G().total === 51, 'switching starts a fresh round (0 cleared, 51 cards)');

  /* ── reverse: keyboard ── */
  const expected = D.letterGroups.flatMap(g => D.letters.filter(l => l.inBook && g.letters.includes(l))).map(l => l.ch);
  ok(vis().length === 51 && vis().every(b => b.classList.contains('te')), 'reverse: 51 Telugu-faced keys');
  ok(vis().map(b => b.textContent).join('|') === expected.join('|'), 'grouped, the keys go group by group, in alphabet order within each (అ ఆ ఇ … క ఖ గ … క్ష)');
  ok(vis()[0].textContent === 'అ' && vis()[vis().length - 1].textContent === 'క్ష', 'starts with అ, ends with క్ష');
  ok([...d.querySelectorAll('.kb-label')].map(e => e.textContent).join() === D.letterGroups.map(g => g.lbl).join(), 'same group labels as the IPA keyboard');
  ok(!byCh('ఌ') && !byCh('ఱ') && !!byCh('ఋ'), 'no letters out of use (ఌ ఱ); ఋ present');
  ok(vis().every(b => !/[a-z]/.test(b.textContent)), 'no IPA leaks onto the Telugu keys');

  /* ── reverse: card ── */
  front(x => x.ipa === 'kʰ');
  ok($('tel-char').classList.contains('ipa-face') && $('tel-char').textContent === '/kʰ/', 'card shows the phoneme as /kʰ/');
  front(x => x.ipa === 'ɐ');
  ok($('tel-char').textContent === '/ɐ/' && $('tel-char').style.fontSize === '', 'single-sound phoneme at full size');
  front(x => x.ipa === 'tʃʰ');
  ok($('tel-char').style.fontSize === '4.2rem', 'three-symbol phoneme (tʃʰ) steps down a size');
  ok($('cat-badge').textContent === 'Palatal' && $('cat-badge').style.visibility === '', 'category label still shown (Palatal)');
  front(x => x.ipa === 'kʂ');
  ok($('tel-char').textContent === '/kʂ/', 'క్ష card shows /kʂ/');

  /* ── reverse: answers ── */
  front(x => x.ipa === 'kʰ');
  const before = G().deck.length;
  byCh('ఖ').click();
  ok($('char-card').classList.contains('correct') && G().deck.length === before - 1, 'correct Telugu key clears the card');
  await tick(); await tick();
  front(x => x.ipa === '\u0261');
  const wrong = byCh('క'); wrong.click();
  ok($('char-card').classList.contains('wrong') && wrong.classList.contains('err'), 'wrong key marks card and key');
  ok($('feedback').textContent.trim() === '✗  క' && $('feedback').classList.contains('te'), 'reversed: the line shows the Telugu letter that was picked (క), not the answer (గ): ' + $('feedback').textContent.trim());
  ok(lit() === 1 && byCh('గ').classList.contains('ok'), 'correct Telugu key highlighted');
  await tick(); await tick();
  const m = P.misses().find(x => x.game === 'phonemes-reverse');
  ok(m && m.key === 'గ' && m.ask === 'sound' && m.note === 'Velar' && h.shown(m).prompt === '/\u0261/' && h.shown(m).answer === 'గ', 'reverse miss goes to Review as its own game, asked by sound: ' + (m && `${h.shown(m).prompt} → ${h.shown(m).answer}`));
  ok(!P.misses().some(x => x.game === 'phonemes' && x.key === 'గ'), 'and does not pollute the forward-mode misses');

  /* highlight off in reverse */
  $('highlight-correct').checked = false;
  front(x => x.ipa === '\u0288');
  const w2 = byCh('క'); w2.click();
  ok(lit() === 0, 'highlight OFF also applies in reverse mode');
  await tick(); await tick();
  $('highlight-correct').checked = true;


  /* full reverse session */
  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 600) { byCh(cur().ch).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().completed === 51, 'reverse session completes (51)');
  ok($('c-sub').textContent === 'All 51 IPA phonemes correctly matched to their Telugu akshara.', 'complete text mentions the direction: ' + $('c-sub').textContent);
  { const r = P.runs('phonemes').at(-1); ok(r && r.ok === G().completed && r.tries === G().attempts && r.n === G().total && r.end === 'done' && r.dir === 'reverse' && !('isComplete' in P), 'the reverse session is recorded for the Profile page as reversed'); }
  h.again();
  ok(!$('g-complete').classList.contains('show') && $('g-title').textContent === 'IPA → Telugu' && vis()[0].textContent === 'అ', 'Practice Again stays in reverse mode');

  /* back to forward */
  h.flip();
  ok($('g-title').textContent === 'Telugu → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'toggle back: title Telugu → IPA');
  ok(vis().length === 51 && vis().every(b => !b.classList.contains('te')) && vis()[0].textContent === 'ɐ', 'IPA keys restored');
  ok(!$('tel-char').classList.contains('ipa-face') && G().current.ch === $('tel-char').textContent, 'card shows the Telugu letter again');

  h.done();
})();
