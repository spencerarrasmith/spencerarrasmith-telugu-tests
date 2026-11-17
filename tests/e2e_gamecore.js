const { SITE_DIR } = require('./config');
// game-core.js on its own, with a bare page and a three-card deck: the round every game plays
// (deal, judge, re-queue, counters, complete screen, ✓ and Review). The games' own suites cover what each adds.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const dir = SITE_DIR + '/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = `<span id="s-rem"></span><span id="s-done"></span><span id="s-total"></span><div id="prog-fill"></div>
<div id="g-main"><div class="char-card" id="char-card"><span id="face"></span></div><div class="feedback" id="feedback"></div></div>
<div class="g-complete" id="g-complete"></div>
<script>${fs.readFileSync(dir + 'progress.js', 'utf8')}</script><script>${fs.readFileSync(dir + 'game-core.js', 'utf8')}</script>`;
const page = () => { const w = new JSDOM(PAGE, { runScripts: 'dangerously', url: 'http://localhost/x.html' }).window;
  const realST = w.setTimeout.bind(w); const delays = []; w.setTimeout = (fn, ms) => { delays.push(ms); return realST(fn, 0); };
  return { w, d: w.document, $: id => w.document.getElementById(id), delays, tick: () => new Promise(r => realST(r, 5)) }; };

(async () => {
  const { w, $, delays, tick } = page(); const C = w.GameCore, P = w.TeluguProgress;
  ok(C && typeof C.create === 'function' && C.current === null, 'GameCore loads; no game yet');

  /* helpers */
  const a = [1, 2, 3, 4, 5, 6, 7, 8], b = C.shuffle(a);
  ok(a.join() === '1,2,3,4,5,6,7,8' && b !== a && [...b].sort().join() === a.join(), 'shuffle returns a new array with the same items; the original is untouched');
  ok(C.esc('<b a="1">&\'') === '&lt;b a=&quot;1&quot;&gt;&amp;&#39;' && C.esc(null) === '', 'esc escapes the five HTML characters');
  ok(C.$('s-rem') === $('s-rem'), '$ is getElementById');
  let threw = 0; [{}, { id: 'x' }, { id: 'x', pool: () => [] }, undefined].forEach(o => { try { C.create(o); } catch (e) { if (/needs id, pool\(\) and render\(\)/.test(e.message)) threw++; } });
  ok(threw === 4 && C.current === null, 'create() without id, pool or render fails loudly');

  /* a round */
  const CARDS = [{ k: 'a' }, { k: 'b' }, { k: 'c' }]; const drawn = []; let started = 0, pools = 0;
  const g = C.create({ id: 'demo', pool: () => { pools++; return CARDS; }, onStart: () => started++,
    render: (card, game) => { drawn.push(card.k); $('face').textContent = card.k; if (game !== g && g) throw new Error('render gets the game'); },
    doneText: game => `All ${game.total} done.` });
  ok(C.current === g && g.id === 'demo' && g.total === 0 && g.current === null && started === 0, 'create() does not start the round');
  ok($('c-sub') && $('c-attempts') && $('c-accuracy') && $('c-errors') && $('retry-btn') && $('g-complete').querySelector('.trophy'), 'the complete screen is filled in by the core');
  g.start();
  ok(pools === 1 && started === 1 && g.total === 3 && g.deck.length === 3 && g.completed === 0 && g.attempts === 0 && !g.locked, 'start() deals the pool and resets the counters');
  ok(CARDS.map(c => c.k).join() === 'a,b,c' && g.deck !== CARDS, 'the pool array itself is not reordered');
  ok($('s-rem').textContent === '3' && $('s-done').textContent === '0' && $('s-total').textContent === '3' && parseFloat($('prog-fill').style.width) === 0, 'counters and bar show 3 left, 0 of 3');
  ok(drawn.length === 1 && $('face').textContent === g.current.k, 'the first card is drawn');

  g.front(c => c.k === 'b');
  ok(g.current.k === 'b' && $('face').textContent === 'b' && g.deck.length === 3, 'front(pred) brings a card to the front and draws it');
  threw = false; try { g.front(c => c.k === 'zz'); } catch (e) { threw = /no card matches/.test(e.message); }
  ok(threw, 'front() with no match fails loudly');

  /* wrong */
  g.judge(false, { feedback: '✗  bee', te: true, miss: { key: 'b', prompt: 'b', answer: 'bee', note: 'N' } });
  ok(g.locked && g.attempts === 1 && g.completed === 0 && g.deck.length === 3, 'wrong: locked, one attempt, nothing cleared');
  ok($('feedback').textContent === '✗  bee' && $('feedback').className === 'feedback err te' && $('char-card').classList.contains('wrong'), 'wrong: feedback line (Telugu-faced) and card state');
  ok(g.current.k !== 'b' && g.deck.some(c => c.k === 'b'), 'wrong: the card goes back into the deck, never straight to the front');
  const m = P.misses()[0];
  ok(P.missCount() === 1 && m.game === 'demo' && m.key === 'b' && m.answer === 'bee' && m.note === 'N', 'wrong: recorded for Review under the game id');
  const n0 = drawn.length; g.judge(true); ok(g.attempts === 1 && drawn.length === n0, 'answers while the last one is showing are ignored');
  await tick();
  ok(!g.locked && $('feedback').textContent === '' && $('feedback').className === 'feedback' && $('char-card').className === 'char-card' && drawn.length === n0 + 1, 'after the pause: marks cleared, next card drawn, unlocked');
  ok(delays.at(-1) === 1000, 'the pause after a wrong answer is 1000 ms by default');

  /* a miss can be filed under another id; no miss info → nothing recorded */
  g.judge(false, { miss: { game: 'demo-reverse', key: 'x', prompt: 'x', answer: 'y' } }); await tick();
  g.judge(false); await tick();
  ok(P.missCount() === 2 && P.misses().some(x => x.game === 'demo-reverse') && $('feedback').className === 'feedback', 'miss.game overrides the id; a wrong answer with no miss info records nothing');

  /* right */
  let afterRan = 0; const before = g.deck.length;
  g.judge(true, { after: () => afterRan++ });
  ok(g.completed === 1 && g.deck.length === before - 1 && $('s-done').textContent === '1' && $('s-rem').textContent === '2' && $('prog-fill').style.width === '33.3%', 'right: card cleared, counters and bar move at once');
  ok($('feedback').textContent === '✓  Correct!' && $('feedback').className === 'feedback ok' && $('char-card').classList.contains('correct') && afterRan === 0, 'right: default feedback, card state; after() waits for the pause');
  await tick();
  ok(afterRan === 1 && delays.at(-1) === 500, 'after() runs before the next card; the pause after a right answer is 500 ms');

  /* render() redraws without touching the round */
  const n1 = drawn.length, top = g.current; g.render();
  ok(drawn.length === n1 + 1 && g.current === top && g.attempts === 4 && g.completed === 1, 'render() redraws the current card and changes nothing else');

  /* finish */
  g.judge(true); await tick(); g.judge(true);
  ok(!$('g-complete').classList.contains('show'), 'the complete screen waits for the pause');
  await tick();
  ok($('g-complete').classList.contains('show') && $('g-main').style.display === 'none' && g.completed === 3 && g.deck.length === 0 && g.current === null, 'last card cleared: complete screen shown, playing area hidden');
  ok($('c-sub').textContent === 'All 3 done.' && $('c-attempts').textContent === '6' && $('c-accuracy').textContent === '50%' && $('c-errors').textContent === '3', 'complete screen: doneText, 6 attempts, 50%, 3 errors');
  const saved = JSON.parse(w.localStorage.getItem('telugu.progress.v1')).done.demo;
  ok(P.isComplete('demo') && saved.best === 50 && saved.runs === 1, 'the unit is marked done with its accuracy');
  g.judge(true); ok(g.attempts === 6, 'judge() after the round is over does nothing');

  /* Practice Again */
  $('retry-btn').click();
  ok(pools === 2 && started === 2 && g.total === 3 && g.completed === 0 && g.attempts === 0 && !g.locked && !$('g-complete').classList.contains('show') && $('g-main').style.display === '', '"Practice Again" deals a fresh round');

  /* options */
  const p2 = page(); const g2 = p2.w.GameCore.create({ id: 'fast', okMs: 10, errMs: 20, pool: () => [{ k: 1 }, { k: 2 }], render() {} });
  g2.start(); g2.judge(false); await p2.tick(); g2.judge(true); await p2.tick();
  ok(p2.delays.join() === '20,10', 'okMs / errMs set the pauses');
  g2.judge(true); await p2.tick();
  ok(p2.$('c-sub').textContent === 'All 2 cards cleared.', 'a default sentence when the game gives no doneText');

  /* without progress.js the game still plays */
  const bare = new JSDOM(PAGE.replace(/<script>[\s\S]*?<\/script>/, ''), { runScripts: 'dangerously' }).window;
  const g3 = bare.GameCore.create({ id: 'np', okMs: 0, pool: () => [{ k: 1 }], render() {} }); g3.start();
  let err = null; try { g3.judge(false, { miss: { key: 'a', prompt: 'a', answer: 'b' } }); } catch (e) { err = e; }
  ok(!bare.TeluguProgress && !err && g3.attempts === 1, 'no progress.js: playing works, nothing is remembered');

  /* an empty pool */
  const p4 = page(); let r4 = 0; const g4 = p4.w.GameCore.create({ id: 'none', pool: () => [], render: () => r4++ }); g4.start();
  ok(g4.total === 0 && r4 === 0 && parseFloat(p4.$('prog-fill').style.width) === 0 && p4.$('s-total').textContent === '0', 'an empty pool: nothing drawn, bar at 0 (no divide by zero)');

  /* Phonemes is built on it and keeps no copy of the round */
  const pho = fs.readFileSync(dir + 'alphabet/01_phonemes.html', 'utf8');
  ok(/<script src="\.\.\/game-core\.js"><\/script>/.test(pho) && /GameCore\.create\(\{/.test(pho), 'Phonemes loads game-core.js and creates its round with it');
  ok(!/function (shuffle|updateProg|showComplete|initGame)\b/.test(pho) && !/escHtml/.test(pho) && !/let deck\b/.test(pho) && !/Progress\.(miss|complete)\(/.test(pho) && !/setTimeout/.test(pho), 'Phonemes has no private shuffle, counters, complete screen, timers or progress calls');
  ok(/<div class="g-complete" id="g-complete"><\/div>/.test(pho) && !/c-attempts|retry-btn|trophy/.test(pho), 'Phonemes leaves the complete screen to the core');
  ok(!/document\.getElementById/.test(pho), 'Phonemes uses the shared $ helper');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
