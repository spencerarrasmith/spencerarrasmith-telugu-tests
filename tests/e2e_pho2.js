const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const D = w.TeluguData, P = w.TeluguProgress;
const vis  = () => [...d.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none');
const byCh = ch => vis().find(b => b.dataset.ch === ch);
const byIpa = ipa => vis().find(b => b.dataset.ipa === ipa);
const cur  = () => G().current;
const lit  = () => d.querySelectorAll('.kb-btn.ok').length;
(async () => {
  /* ── controls + defaults ── */
  ok($('g-title').textContent === 'Telugu → IPA', 'forward title: Telugu → IPA');
  ok($('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false', '🔀 button next to the title, not pressed');
  ok($('rev-btn').parentElement === $('g-title').parentElement, 'button sits in the same row as the title');
  ok($('highlight-correct').checked && $('highlight-correct').parentElement.textContent.includes('Highlight correct answer'), '"Highlight correct answer" checkbox exists, on by default');
  ok(d.querySelectorAll('#opts-menu input[type=checkbox]').length === 4, 'four checkboxes in the menu: categories, shuffle, extra letters, highlight');
  ok(vis().every(b => !b.classList.contains('te')) && vis()[0].textContent === 'a', 'forward keys show IPA (first key: a)');

  /* ── highlight checkbox, forward mode ── */
  front(x => x.ipa === 'k');
  byIpa('g'.replace('g', 'ɡ')).click();
  ok(lit() === 1 && byIpa('k').classList.contains('ok'), 'highlight ON: correct key lights up after a wrong guess');
  ok($('feedback').textContent.trim() === '✗  /k/', 'forward feedback text unchanged: ' + $('feedback').textContent.trim());
  await tick(); await tick();
  ok(lit() === 0, 'highlight clears again');
  $('highlight-correct').checked = false;
  front(x => x.ipa === 'k');
  const wrongBtn = byIpa('ɡ'); wrongBtn.click();
  ok(lit() === 0 && wrongBtn.classList.contains('err'), 'highlight OFF: wrong key turns red, correct key is NOT lit');
  ok($('feedback').textContent.trim() === '✗  /k/', 'answer text is still shown with highlight off');
  await tick(); await tick();
  ok(P.misses().find(m => m.game === 'phonemes' && m.key === 'క'), 'miss still recorded with highlight off');
  $('highlight-correct').checked = true;

  /* ── reverse: switch ── */
  const doneBefore = G().completed;
  byIpa('a'); front(x => x.ipa === 'a'); byIpa('a').click(); await tick(); await tick();
  ok(G().completed === 1, 'one card cleared before switching');
  $('rev-btn').click();
  ok($('g-title').textContent === 'IPA → Telugu' && $('rev-btn').getAttribute('aria-pressed') === 'true', 'title flips to IPA → Telugu, button pressed');
  ok(G().completed === 0 && G().deck.length === 51 && G().total === 51, 'switching starts a fresh round (0 cleared, 51 cards)');

  /* ── reverse: keyboard ── */
  const expected = D.letters.filter(l => l.core).map(l => l.ch);
  ok(vis().length === 51 && vis().every(b => b.classList.contains('te')), 'reverse: 51 Telugu-faced keys');
  ok(vis().map(b => b.textContent).join('|') === expected.join('|'), 'keys appear in alphabet order (అ ఆ ఇ … క ఖ గ … స హ క్ష)');
  ok(vis()[0].textContent === 'అ' && vis()[vis().length - 1].textContent === 'క్ష', 'starts with అ, ends with క్ష');
  ok([...d.querySelectorAll('.kb-label')].map(e => e.textContent).join() === D.letterGroups.map(g => g.lbl).join(), 'same group labels as the IPA keyboard');
  ok(!byCh('ఌ') && !byCh('ఱ') && !!byCh('ఋ'), 'extras hidden by default; ఋ present');
  ok(vis().every(b => !/[a-z]/.test(b.textContent)), 'no IPA leaks onto the Telugu keys');

  /* ── reverse: card ── */
  front(x => x.ipa === 'kʰ');
  ok($('tel-char').classList.contains('ipa-face') && $('tel-char').textContent === '/kʰ/', 'card shows the phoneme as /kʰ/');
  front(x => x.ipa === 'a');
  ok($('tel-char').textContent === '/a/' && $('tel-char').style.fontSize === '', 'single-sound phoneme at full size');
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
  ok($('feedback').textContent.trim() === '✗  గ' && $('feedback').classList.contains('te'), 'feedback reveals the Telugu letter: ' + $('feedback').textContent.trim());
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

  /* extras in reverse */
  $('include-extra').checked = true; $('include-extra').dispatchEvent(new w.Event('change'));
  ok(G().total === 54 && vis().length === 54 && !!byCh('ఌ') && !!byCh('ఱ') && vis().every(b => b.classList.contains('te')), 'extras on in reverse: 54 Telugu keys incl. ఌ ఱ');
  $('include-extra').checked = false; $('include-extra').dispatchEvent(new w.Event('change'));
  ok(vis().length === 51 && vis().every(b => b.classList.contains('te')), 'extras off: back to 51, still Telugu-faced');

  /* full reverse session */
  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 600) { byCh(cur().ch).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().completed === 51, 'reverse session completes (51)');
  ok($('c-sub').textContent === 'All 51 IPA phonemes correctly matched to their Telugu akshara.', 'complete text mentions the direction: ' + $('c-sub').textContent);
  ok(P.isComplete('phonemes'), 'finishing reverse also ticks the Phonemes tile');
  $('retry-btn').click();
  ok(!$('g-complete').classList.contains('show') && $('g-title').textContent === 'IPA → Telugu' && vis()[0].textContent === 'అ', 'Practice Again stays in reverse mode');

  /* back to forward */
  $('rev-btn').click();
  ok($('g-title').textContent === 'Telugu → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'toggle back: title Telugu → IPA');
  ok(vis().length === 51 && vis().every(b => !b.classList.contains('te')) && vis()[0].textContent === 'a', 'IPA keys restored');
  ok(!$('tel-char').classList.contains('ipa-face') && G().current.ch === $('tel-char').textContent, 'card shows the Telugu letter again');

  /* shared keyboard builder: reusable on its own */
  const host = d.createElement('div'); d.body.appendChild(host);
  const picks = [];
  const btns = D.buildKeyboard(host, { face: 'telugu', visible: l => l.kind === 'vowel' && l.core, onPick: (l, b) => picks.push(l.ch) });
  ok(btns.length === 54 && btns.filter(b => b.style.display !== 'none').length === 16, 'buildKeyboard: visible as a predicate (16 book vowels shown of 54 keys)');
  btns[1].click(); ok(picks.join() === 'ఆ', 'buildKeyboard: onPick receives the letter object');
  const all = D.buildKeyboard(host, {});
  ok(all.length === 54 && all.every(b => b.style.display !== 'none' && !b.classList.contains('te') && b.textContent === b.dataset.ipa), 'buildKeyboard defaults: all letters, IPA face');
  h.done();
})();
