const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs');
const dir = (SITE_DIR + '/');
const html = fs.readFileSync(dir + 'review.html', 'utf8').replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(require('path').resolve(dir, require('path').dirname('review.html'), src), 'utf8') + '</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/review.html' });
const w = dom.window, d = w.document; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const P = w.TeluguProgress, $ = s => d.querySelector(s), click = s => $(s).click();
(async () => {
  ok($('.rv-empty h2').textContent === 'Nothing to review', 'empty state when there are no misses');
  P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/', note: 'Velar' });
  P.miss({ game: 'phonemes', key: 'ఖ', prompt: 'ఖ', answer: '/kʰ/', note: 'Velar' });
  P.miss({ game: 'diacritics', key: 'కా', prompt: 'కా', answer: '/kaː/', note: 'Long' });
  await new Promise(r => setTimeout(r, 5));
  ok($('#rv-total') && $('#rv-total').textContent === '3', 'overview refreshes live when a game records a miss');
  ok([...d.querySelectorAll('.rv-game')].map(g => g.querySelector('.name').textContent + ':' + g.querySelector('.count').textContent).join() === 'Phonemes:2,Diacritics:1', 'per-game counts with friendly names');

  // review only Diacritics: show → got it
  $('[data-game="diacritics"]').click();
  ok($('#rv-prompt').textContent === 'కా' && !$('#rv-got') && !!$('#rv-show'), 'card shows the prompt, answer hidden');
  click('#rv-show');
  ok($('#rv-answer').textContent.includes('/kaː/') && $('#rv-got') && $('#rv-again'), 'answer revealed with Again / Got it');
  click('#rv-got');
  ok($('.rv-empty h2').textContent === 'Round complete' && P.misses().find(m => m.key === 'కా').streak === 1, 'one Got it: round ends, streak 1, item still listed');
  ok(P.missCount() === 3, 'nothing cleared after only one pass');
  click('#rv-back');

  // second pass clears it
  $('[data-game="diacritics"]').click(); click('#rv-show'); click('#rv-got');
  ok(P.missCount() === 2 && [...d.querySelectorAll('.stat b')][1].textContent === '1', 'second Got it in a row clears the item (summary: 1 cleared)');
  click('#rv-back');
  ok(!$('[data-game="diacritics"]'), 'cleared game disappears from the list');

  // Again re-queues until Got it
  $('#rv-all').click();
  const first = $('#rv-prompt').textContent;
  click('#rv-show'); click('#rv-again');
  ok($('.rv-meta').textContent.includes('0 of 2') && !!$('#rv-show'), 'Again keeps the item in the round (still 0 of 2)');
  let guard = 0, seen = [];
  while ($('#rv-show') && guard++ < 20) { seen.push($('#rv-prompt').textContent); click('#rv-show'); click('#rv-got'); }
  ok($('.rv-empty h2').textContent === 'Round complete' && seen.includes(first), 'round finishes once every item gets a Got it');
  ok([...d.querySelectorAll('.stat b')][2].textContent === '1', 'summary counts the "again" tap');
  ok(P.misses().every(m => m.streak === 1), 'again reset the streak; got-it after counts 1');
  click('#rv-back');

  // keyboard
  $('#rv-all').click();
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  ok(!!$('#rv-got'), 'Space reveals the answer');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  ok(d.querySelector('.rv-meta') ? $('.rv-meta').textContent.includes('1 of 2') : true, '→ grades "Got it"');
  while ($('#rv-show')) { click('#rv-show'); click('#rv-got'); }
  click('#rv-back');

  ok(P.missCount() === 0 && $('.rv-empty h2').textContent === 'Nothing to review', 'keyboard-driven passes cleared the last two items → empty state');
  P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/' }); P.miss({ game: 'phonemes', key: 'ఖ', prompt: 'ఖ', answer: '/kʰ/' });
  // Clear list: two taps
  click('#rv-clear'); ok($('#rv-clear').textContent.includes('Tap again') && P.missCount() > 0, 'Clear list asks for a second tap');
  click('#rv-clear'); ok(P.missCount() === 0 && $('.rv-empty h2').textContent === 'Nothing to review', 'second tap clears everything');

  // an unknown game id still gets a readable name
  P.miss({ game: 'grammar-nouns', key: 'a', prompt: 'a', answer: 'b' });
  ok($('.rv-game .name').textContent === 'Grammar nouns', 'unknown game ids get a readable label');
  // long (3+ glyph) prompts shrink
  P.miss({ game: 'conjuncts', key: 'క్ష', prompt: 'క్ష', answer: '/kʂa/' });
  d.querySelector('[data-game="conjuncts"]').click(); ok($('#rv-prompt').classList.contains('long'), 'three-glyph prompt uses the smaller size');
  while ($('#rv-show')) { click('#rv-show'); click('#rv-got'); } click('#rv-back');
  P.clearMisses(); P.miss({ game: 'phonemes-reverse', key: 'ఖ', prompt: '/kʰ/', answer: 'ఖ', note: 'Velar' });
  ok($('.rv-game .name').textContent === 'Phonemes (IPA → Telugu)', 'Review labels the reverse game "Phonemes (IPA → Telugu)"');
  d.querySelector('[data-game="phonemes-reverse"]').click(); click('#rv-show');
  ok($('.fc .prompt').textContent === '/kʰ/' && $('#rv-answer').textContent.includes('ఖ'), 'reverse card replays as /kʰ/ → ఖ');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
