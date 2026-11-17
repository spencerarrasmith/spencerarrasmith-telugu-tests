const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const vis = () => [...d.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none');
const btn = ipa => vis().find(b => b.dataset.ipa === ipa);
const cur = () => w.eval('deck[0]');
const keys = () => vis().length;
(async () => {
  ok(!$('include-extra').checked, '"Include extra letters" is unchecked by default');
  ok($('include-extra').parentElement.textContent.includes('Include extra letters'), 'label reads "Include extra letters"');
  ok(w.eval('total') === 51 && keys() === 51, 'book set by default: 51 cards / 51 keys');
  ok(!btn('ɽ') && !btn('l̩') && !btn('l̩ː'), 'ఱ ఌ ౡ keys hidden by default');
  ok(!!btn('kʂ') && [...d.querySelectorAll('.kb-label')].some(l => l.textContent === 'Conjunct'), 'క్ష has its own "Conjunct" key (kʂ)');
  ok(!!btn('r̩') && !!btn('r̩ː') && !!btn('ŋ') && !!btn('ɲ'), 'ఋ ౠ ఙ ఞ stay in the default set');

  // rare badge on in-book rare letters, none on common
  front(x => x.ipa === 'r̩');
  ok($('rare-badge').style.display !== 'none', 'ఋ shows the "rare" badge');
  front(x => x.ipa === 'a');
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
  const n = w.eval('deck.length'); btn('g'.replace('g','ɡ')).click();
  await tick(); await tick();
  ok(w.eval('deck.length') === n && cur().ipa !== 'k', 'wrong answer re-queues the card');
  const m = P.misses().find(x => x.game === 'phonemes');
  ok(m && m.key === 'క' && m.prompt === 'క' && m.answer === '/k/' && m.note === 'Velar', 'wrong answer recorded for Review: ' + (m && m.key + ' ' + m.answer));

  // play full default session
  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 600) { btn(cur().ipa).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && w.eval('completed') === 51, 'session completes with all 51 cleared');
  ok(P.isComplete('phonemes'), 'completion recorded for the Phonemes tile');

  // extras on
  $('retry-btn').click();
  $('include-extra').checked = true; $('include-extra').dispatchEvent(new w.Event('change'));
  ok(w.eval('total') === 54 && keys() === 54, 'extras on: 54 cards / 54 keys');
  ok(!!btn('ɽ') && !!btn('l̩') && !!btn('l̩ː'), 'ఱ ఌ ౡ keys appear');
  front(x => x.ipa === 'ɽ');
  ok($('rare-badge').style.display !== 'none', 'extra letters carry the "rare" badge');
  $('include-extra').checked = false; $('include-extra').dispatchEvent(new w.Event('change'));
  ok(w.eval('total') === 51, 'unticking returns to 51');
  h.done();
})();
