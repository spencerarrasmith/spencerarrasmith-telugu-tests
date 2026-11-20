const h = require('./harness')('alphabet/02_diacritics.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const btn = (kind, ipa) => [...d.querySelectorAll(`.kb-btn[data-kind="${kind}"]`)].find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const n = kind => d.querySelectorAll(`.kb-btn[data-kind="${kind}"]`).length;
const inject = (cIpa, vSign) => { w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='${cIpa}'),v=VOWELS.find(x=>x.sign==='${vSign}');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat,uncommon:c.uncommon||v.uncommon});})()`); };
(async () => {
  ok(!$('show-cat').checked && $('cat-badge').style.visibility === 'hidden' && d.querySelectorAll('#kb-area .kb-label').length === 0, 'categories are off to begin with: a plain keyboard, no label on the card');
  $('show-cat').click();                                    // on for the rest of this suite, which is about the grouped keyboard
  ok(!$('include-extra').checked && $('include-extra').parentElement.textContent.includes('Include extra letters'), 'extras unchecked by default, labeled "Include extra letters"');
  ok(G().total === 51, 'default: 51 cards (17 vowel signs × 3)');
  ok(n('c') === 35 && n('v') === 17, 'default keys: 35 consonants (ఱ out, క్ష in) / 17 vowels (ౢ ౣ out)');
  ok(!btn('c', 'ɽ') && !btn('v', 'l̩') && !btn('v', 'l̩ː') && !!btn('v', 'r̩') && !!btn('v', '∅'), 'ఱ, ౢ, ౣ hidden; ృ and ∅ stay');
  ok(!!btn('c', 'kʂ'), 'consonant keyboard has kʂ (క్ష)');
  // the vowel keyboard: each long vowel right after its short one, in one block
  const vkeys = () => [...d.querySelectorAll('.kb-btn[data-kind="v"]')], blocks = () => [...d.querySelectorAll('.kb-col[data-kind="v"] .kb-group')].map(g => g.querySelector('.kb-label').textContent + ': ' + [...g.querySelectorAll('.kb-btn')].map(b => b.textContent).join(' '));
  ok(vkeys().slice(0, 10).map(b => b.textContent).join(' ') === 'a aː i iː u uː e eː o oː', 'the vowel keys pair each long vowel with its short one: a aː i iː u uː e eː o oː');
  ok(blocks()[0] === 'Short · long: a aː i iː u uː e eː o oː' && blocks().map(b => b.split(':')[0]).join(' | ') === 'Short · long | Diphthong | Vocalic | Nasal · aspirate | Pure consonant' && blocks()[1] === 'Diphthong: ai au' && blocks()[2] === 'Vocalic: r̩ r̩ː',
    'with categories shown they are one block, "Short · long", ahead of the others: ' + blocks().map(b => b.split(':')[0]).join(' | '));
  ok(w.TeluguData.signs.slice(0, 10).map(s => s.grp).join() === 'Short,Short,Short,Short,Short,Long,Long,Long,Long,Long', 'the shared data still lists the five short signs, then the five long (the other pages group them that way)');
  // the card's label names the consonant's category and the vowel's
  const badge = () => $('cat-badge').textContent, kinds = [];
  for (const grp of ['Short', 'Long', 'Diphthong', 'Vocalic', 'Nasal · aspirate', 'Pure consonant']) { front(x => x.v.grp === grp); kinds.push(badge() === cur().c.cat + ' + ' + grp && $('cat-badge').style.visibility === '' ? grp : 'WRONG: ' + badge()); }
  ok(kinds.join(' | ') === 'Short | Long | Diphthong | Vocalic | Nasal · aspirate | Pure consonant', 'the card label is "<consonant category> + <vowel category>", for every kind of sign: ' + badge());
  const pairs = [...d.querySelectorAll('.kb-col[data-kind="v"] .kb-pair')].map(p => [...p.children].map(b => b.dataset.ipa));
  ok(pairs.length === 6 && pairs.every(p => p.length === 2 && p[1] === p[0] + 'ː') && pairs.map(p => p[0]).join(' ') === 'a i u e o r̩' && !d.querySelector('.kb-col[data-kind="c"] .kb-pair')
    && /\.kb-pair \{ display: inline-flex; gap: inherit; \}/.test(require('fs').readFileSync(require('path').join(require('./config').SITE_DIR, 'alphabet/02_diacritics.html'), 'utf8')),
    'a vowel and its long form are one unit in the row (six pairs: a i u e o r̩), so a row never breaks between them');

  // క్ష + sign
  inject('kʂ', 'ా');
  ok(cur().glyph === 'క్షా', 'క్షా card built: ' + cur().glyph);
  btn('c', 'kʂ').click(); btn('v', 'aː').click();
  ok($('feedback').textContent.trim() === '✓  /kʂaː/', 'క్షా correct → ' + $('feedback').textContent.trim());
  await tick(); await tick();

  // rare badge for ృ (in default set but rare)
  front(x => x.v.sign === 'ృ');
  ok($('rare-badge').style.display !== 'none', 'ృ cards keep the "rare" badge');
  btn('c', cur().c.ipa).click(); btn('v', 'r̩').click(); await tick(); await tick();

  const P = w.TeluguProgress;
  ok(P.missCount() === 0, 'no misses yet');
  inject('k', '\u0C3E'); btn('c', 'kʰ').click(); btn('v', 'aː').click();
  ok($('feedback').textContent.trim() === '✗  /kʰaː/' && btn('c', 'k').classList.contains('ok'), 'a wrong pair: the line under the card shows what was picked (/kʰaː/), not the answer; the right key is lit: ' + $('feedback').textContent.trim());
  ok(/GameCore\.create\(\{[^}]*?errMs:\s*1500\b/.test(require('fs').readFileSync(require('path').join(require('./config').SITE_DIR, 'alphabet/02_diacritics.html'), 'utf8')), 'Diacritics: a wrong pick stays on screen for 1.5 seconds (errMs: 1500)');
  await tick(); await tick();
  const m = P.misses().find(x => x.game === 'diacritics');
  ok(m && m.key === 'కా' && m.ask === 'telugu' && m.syllable === true && !('answer' in m) && h.shown(m).answer === '/kaː/', 'wrong answer recorded as the syllable and what was asked: ' + (m && m.key + ' → ' + h.shown(m).answer));

  // pure consonant still works
  front(x => x.v.sign === '్');
  const c0 = cur(); btn('c', c0.c.ipa).click(); btn('v', '∅').click();
  ok($('feedback').textContent.trim() === `✓  /${c0.c.ipa}/`, 'pure consonant: ' + $('feedback').textContent.trim());
  await tick(); await tick();

  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 600) { const c = cur(); btn('c', c.c.ipa).click(); btn('v', c.v.ipa).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().deck.length === 0 && G().completed === 51 + 2, 'default session completes (51 deck + 2 injected test cards)');
  { const r = P.runs('diacritics').at(-1); ok(r && r.ok === G().completed && r.tries === G().attempts && r.n === G().total && r.end === 'done' && !('dir' in r) && !('isComplete' in P), 'the session is recorded for the Profile page (forward); nothing is marked complete'); }

  $('retry-btn').click();
  ok(!$('setup').hidden && $('g-complete').classList.contains('show'), '"Practice Again" opens the session popup');
  $('include-extra').click(); $('setup-start').click();
  ok(G().total === 57 && n('c') === 36 && n('v') === 19, 'extras on: 57 cards, 36 consonant + 19 vowel keys');
  ok(!!btn('c', 'ɽ') && !!btn('v', 'l̩') && !!btn('v', 'l̩ː'), 'ఱ ౢ ౣ keys return');
  h.done();
})();
