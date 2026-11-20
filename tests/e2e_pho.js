const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const vis = () => [...d.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none');
const btn = ipa => vis().find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const keys = () => vis().length;
(async () => {
  ok(!$('show-cat').checked && $('cat-badge').style.visibility === 'hidden' && d.querySelectorAll('#kb-area .kb-label').length === 0, 'categories are off to begin with: a plain keyboard, no label on the card');
  $('show-cat').click();                                    // on for the rest of this suite, which is about the grouped keyboard
  ok(!$('include-extra').checked, '"Include extra letters" is unchecked by default');
  ok($('include-extra').parentElement.textContent.includes('Include extra letters') && $('include-extra').closest('#setup'), 'label reads "Include extra letters"; the box is in the session popup');
  ok(G().total === 51 && keys() === 51, 'book set by default: 51 cards / 51 keys');
  ok(!btn('ɽ') && !btn('ts') && !btn('dz') && !btn('lu') && !btn('luː'), 'ఱ ఌ ౡ ౘ ౙ keys hidden by default');
  ok(!!btn('kʂ') && [...d.querySelectorAll('.kb-label')].some(l => l.textContent === 'Conjunct'), 'క్ష has its own "Conjunct" key (kʂ)');
  ok(!!btn('ru') && !!btn('ruː') && !!btn('ŋ') && !!btn('ɲ'), 'ఋ ౠ ఙ ఞ stay in the default set');

  // rare badge on in-book rare letters, none on common
  front(x => x.ipa === 'ruː');
  ok($('rare-badge').style.display !== 'none', 'ౠ shows the "rare" badge');
  front(x => x.ipa === 'ru');
  ok($('rare-badge').style.display === 'none', 'ఋ no longer does');
  front(x => x.ipa === 'ɐ');
  ok($('rare-badge').style.display === 'none', 'అ shows no badge');

  // క్ష card
  front(x => x.ipa === 'kʂ');
  ok(cur().ch.length === 3 && $('tel-char').style.fontSize === '4.2rem', 'క్ష card renders at the reduced size');
  btn('kʂ').click();
  ok($('char-card').classList.contains('correct'), 'kʂ answers the క్ష card');
  await tick(); await tick();

  const P = w.TeluguProgress;
  ok(P.missCount() === 0, 'no misses yet');
  // wrong answer re-queues
  front(x => x.ipa === 'k');
  const n = G().deck.length; btn('g'.replace('g','ɡ')).click();
  await tick(); await tick();
  ok(G().deck.length === n && cur().ipa !== 'k', 'wrong answer re-queues the card');
  const m = P.misses().find(x => x.game === 'phonemes');
  ok(m && m.key === 'క' && m.ask === 'telugu' && !m.syllable && !('prompt' in m) && !('answer' in m) && m.note === 'Velar', 'wrong answer recorded for Review as the letter and what was asked, not as text: ' + JSON.stringify(m && { key: m.key, ask: m.ask }));
  ok(h.shown(m).prompt === 'క' && h.shown(m).answer === '/k/', 'which Review shows as క → /k/');

  // play full default session
  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 600) { btn(cur().ipa).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().completed === 51, 'session completes with all 51 cleared');
  { const r = P.runs('phonemes').at(-1); ok(r && r.ok === G().completed && r.tries === G().attempts && r.n === G().total && r.end === 'done' && !('dir' in r) && !('isComplete' in P), 'the session is recorded for the Profile page (forward); nothing is marked complete'); }

  // extras on
  h.again();
  h.setup(() => { $('include-extra').checked = true; $('include-extra').dispatchEvent(new w.Event('change')); });
  ok(G().total === 56 && keys() === 56, 'extras on: 56 cards / 56 keys');
  ok(!!btn('ɽ') && !!btn('ts') && !!btn('dz') && !!btn('lu') && !!btn('luː'), 'ఱ ఌ ౡ ౘ ౙ keys appear');
  front(x => x.ipa === 'ɽ');
  ok($('rare-badge').style.display !== 'none', 'extra letters carry the "rare" badge');
  h.setup(() => { $('include-extra').checked = false; $('include-extra').dispatchEvent(new w.Event('change')); });
  ok(G().total === 51, 'unchecking returns to 51');
  h.done();
})();
