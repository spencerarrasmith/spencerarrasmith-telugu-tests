const h = require('./harness')('alphabet/02_diacritics.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const btn = (kind, ipa) => [...d.querySelectorAll(`.kb-btn[data-kind="${kind}"]`)].find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const n = kind => d.querySelectorAll(`.kb-btn[data-kind="${kind}"]`).length;
const inject = (cIpa, vSign) => { w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='${cIpa}'),v=VOWELS.find(x=>x.sign==='${vSign}');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat,uncommon:c.uncommon||v.uncommon});})()`); };
(async () => {
  ok(!$('include-extra').checked && $('include-extra').parentElement.textContent.includes('Include extra letters'), 'extras unchecked by default, labelled "Include extra letters"');
  ok(G().total === 51, 'default: 51 cards (17 vowel signs × 3)');
  ok(n('c') === 35 && n('v') === 17, 'default keys: 35 consonants (ఱ out, క్ష in) / 17 vowels (ౢ ౣ out)');
  ok(!btn('c', 'ɽ') && !btn('v', 'l̩') && !btn('v', 'l̩ː') && !!btn('v', 'r̩') && !!btn('v', '∅'), 'ఱ, ౢ, ౣ hidden; ృ and ∅ stay');
  ok(!!btn('c', 'kʂ'), 'consonant keyboard has kʂ (క్ష)');

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
  await tick(); await tick();
  const m = P.misses().find(x => x.game === 'diacritics');
  ok(m && m.key === 'కా' && m.answer === '/kaː/', 'wrong answer recorded: ' + (m && m.key + ' ' + m.answer));

  // pure consonant still works
  front(x => x.v.sign === '్');
  const c0 = cur(); btn('c', c0.c.ipa).click(); btn('v', '∅').click();
  ok($('feedback').textContent.trim() === `✓  /${c0.c.ipa}/`, 'pure consonant: ' + $('feedback').textContent.trim());
  await tick(); await tick();

  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 600) { const c = cur(); btn('c', c.c.ipa).click(); btn('v', c.v.ipa).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().deck.length === 0 && G().completed === 51 + 2, 'default session completes (51 deck + 2 injected test cards)');
  ok(P.isComplete('diacritics'), 'completion recorded for the Diacritics tile');

  $('retry-btn').click();
  $('include-extra').checked = true; $('include-extra').dispatchEvent(new w.Event('change'));
  ok(G().total === 57 && n('c') === 36 && n('v') === 19, 'extras on: 57 cards, 36 consonant + 19 vowel keys');
  ok(!!btn('c', 'ɽ') && !!btn('v', 'l̩') && !!btn('v', 'l̩ː'), 'ఱ ౢ ౣ keys return');
  h.done();
})();
