const h = require('./harness')('alphabet/02_diacritics.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const btn = (kind, ipa) => [...d.querySelectorAll(`#kb-area button.kb-btn[data-kind="${kind}"]`)].find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const n = kind => d.querySelectorAll(`#kb-area button.kb-btn[data-kind="${kind}"]`).length;
const faces = (page, i) => [...d.querySelectorAll(`#kb-area .gkb-${page} > .kb-row`)[i].children].map(b => (b.classList.contains('gkb-off') ? '·' : '') + b.textContent).join(' ');
const inject = (cIpa, vSign) => { w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='${cIpa}'),v=VOWELS.find(x=>x.sign==='${vSign}');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat,uncommon:c.uncommon||v.uncommon});})()`); };
(async () => {
  ok(!$('group-kb').checked && $('cat-badge').style.visibility === 'hidden' && d.querySelectorAll('#kb-area .kb-label').length === 0, 'not grouped to begin with: the Telugu keyboard\'s layout, no label on the card');
  // one keyboard, laid out as the Telugu keyboard: each vowel sign's key where its vowel sits, each consonant where it sits
  ok(faces('letters', 0) === 'ɐ aː i iː u uː ru ruː e eː' && faces('letters', 1) === 'ai o oː au ɐm ɐʰ k kʰ ɡ ɡʱ' && faces('letters', 4) === 'j ɾ l ʋ ɭ ʃ ʂ s ɦ ⌫' && faces('digits', 2).startsWith('ɲ ·◌ఁ ∅ kʂ'),
    'not grouped: one keyboard, each sign where its vowel sits on the Telugu keyboard (no sign, ɐ, on అ; ం ః on themselves), each consonant on its letter; ∅ and క్ష, which have no place, on the second page');
  ok(!d.querySelector('.kb-col, .kb-pair, .kb-col-title'), 'no "Consonant" and "Vowel" panels any more: one keyboard holds both');
  $('group-kb').click();                                    // on for the rest of this suite, which is about the grouped keyboard
  ok(!$('include-extra') && !$('shuffle-kb') && !$('show-cat'), 'no "Include extra letters", "Shuffle keyboard", or "Show categories"');
  ok(G().total === 51, 'default: 51 cards (17 vowel signs × 3)');
  ok(n('c') === 35 && n('v') === 17, 'default keys: 35 consonants (ఱ out, క్ష in) / 17 vowels (ౢ ౣ out)');
  ok(!btn('c', 'ɽ') && !btn('c', 'ts') && !btn('c', 'dz') && !btn('v', 'lu') && !btn('v', 'luː') && !!btn('v', 'ru') && !!btn('v', '∅'), 'ఱ, ౘ, ౙ, ౢ, ౣ hidden; ృ and ∅ stay');
  ok(!!btn('c', 'kʂ'), 'consonant keyboard has kʂ (క్ష)');
  // the vowel keyboard: each long vowel right after its short one, in one block
  const vkeys = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-kind="v"]')], blocks = () => [...d.querySelectorAll('#kb-area .kb-group')].filter(g => g.querySelector('[data-kind="v"]')).map(g => g.querySelector('.kb-label').textContent + ': ' + [...g.querySelectorAll('.kb-btn')].map(b => b.textContent).join(' '));
  ok(vkeys().slice(0, 10).map(b => b.textContent).join(' ') === 'ɐ aː i iː u uː e eː o oː', 'the vowel keys pair each long vowel with its short one: ɐ aː i iː u uː e eː o oː');
  ok(blocks()[0] === 'Short · long: ɐ aː i iː u uː e eː o oː' && blocks().map(b => b.split(':')[0]).join(' | ') === 'Short · long | Diphthong | Vocalic | Nasal · aspirate | Pure consonant' && blocks()[1] === 'Diphthong: ai au' && blocks()[2] === 'Vocalic: ru ruː',
    'grouped, they are one block, "Short · long", ahead of the others: ' + blocks().map(b => b.split(':')[0]).join(' | '));
  ok([...d.querySelectorAll('#kb-area .kb-label')].map(l => l.textContent).join() === 'Short · long,Diphthong,Vocalic,Nasal · aspirate,Pure consonant,Velar,Palatal,Retroflex,Dental,Labial,Approx.,Fricative,Conjunct', 'grouped: the vowel blocks, then the consonants by place, in one keyboard');
  ok(w.TeluguData.signs.slice(0, 10).map(s => s.grp).join() === 'Short,Short,Short,Short,Short,Long,Long,Long,Long,Long', 'the shared data still lists the five short signs, then the five long (the other pages group them that way)');
  // the card's label names the consonant's category and the vowel's
  const badge = () => $('cat-badge').textContent, kinds = [];
  for (const grp of ['Short', 'Long', 'Diphthong', 'Vocalic', 'Nasal · aspirate', 'Pure consonant']) { front(x => x.v.grp === grp); kinds.push(badge() === cur().c.cat + ' + ' + grp && $('cat-badge').style.visibility === '' ? grp : 'WRONG: ' + badge()); }
  ok(kinds.join(' | ') === 'Short | Long | Diphthong | Vocalic | Nasal · aspirate | Pure consonant', 'the card label is "<consonant category> + <vowel category>", for every kind of sign: ' + badge());
  // క్ష + sign
  inject('kʂ', 'ా');
  ok(cur().glyph === 'క్షా', 'క్షా card built: ' + cur().glyph);
  btn('c', 'kʂ').click(); btn('v', 'aː').click();
  ok($('feedback').textContent.trim() === '✓  /kʂaː/', 'క్షా correct → ' + $('feedback').textContent.trim());
  await tick(); await tick();

  // rare badge for ౄ (in default set but rare); ృ is common enough to go without
  front(x => x.v.sign === 'ౄ');
  ok($('rare-badge').style.display !== 'none', 'ౄ cards keep the "rare" badge');
  btn('c', cur().c.ipa).click(); btn('v', 'ruː').click(); await tick(); await tick();
  front(x => x.v.sign === 'ృ' && !x.c.rare);
  ok($('rare-badge').style.display === 'none', 'ృ cards have no badge');
  btn('c', cur().c.ipa).click(); btn('v', 'ru').click(); await tick(); await tick();

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
  ok($('setup-rounds').max === '51', 'the most rounds is 51: there are no extra letters to add');
  $('setup-start').click();
  ok(G().total === 51 && n('c') === 35 && n('v') === 17 && !G().deck.some(c => /[ఱౘౙౢౣ]/.test(c.glyph)), 'a new session: 51 cards on the same 35 + 17 keys, none with ఱ ౘ ౙ ౢ ౣ');
  h.done();
})();
