const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const vis = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];      // the game's keys (not ౧౨౩, not the dimmed ones)
const btn = ipa => vis().find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const keys = () => vis().length;
(async () => {
  ok(!$('group-kb').checked && $('cat-badge').style.visibility === 'hidden' && d.querySelectorAll('#kb-area .kb-label').length === 0, 'not grouped to begin with: the Telugu keyboard\'s layout, no label on the card');
  $('group-kb').click();                                    // on for the rest of this suite, which is about the grouped keyboard
  ok(!$('include-extra') && !/Include extra letters|include-extra/.test(require('fs').readFileSync(require('path').join(require('./config').SITE_DIR, 'alphabet/01_phonemes.html'), 'utf8')), 'no "Include extra letters": the letters out of use are on the Bookish Telugu page instead');
  ok(G().total === 51 && keys() === 51, 'the book\'s letters: 51 cards / 51 keys');
  ok(!btn('ɽ') && !btn('ts') && !btn('dz') && !btn('lu') && !btn('luː') && !d.querySelector('#kb-area [data-ch="ఱ"], #kb-area [data-ch="ఌ"]') && !G().deck.some(c => /[ఱఌౡౘౙ]/.test(c.ch)), 'no ఱ ఌ ౡ ౘ ౙ: not dealt, and no key for them');
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

  // Practice Again: the same 51
  h.again();
  ok(G().total === 51 && keys() === 51, 'Practice Again deals the 51 again');
  h.done();
})();
