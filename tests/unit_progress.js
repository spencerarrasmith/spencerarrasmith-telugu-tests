const { SITE_DIR } = require('./config');
// Run progress.js against a fake window with a working, then a broken localStorage
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
function fakeWin(broken) {
  const store = {}, L = {};
  const w = { Event: class { constructor(t) { this.type = t; } },
    addEventListener: (t, f) => (L[t] = L[t] || []).push(f),
    dispatchEvent: e => (L[e.type] || []).forEach(f => f(e)),
    localStorage: broken ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
      : { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, store };
  return w;
}
function load(w) { delete require.cache[require.resolve((SITE_DIR + '/progress.js'))]; const g = globalThis; const old = g.window; g.window = w;
  // module picks `window` when defined
  const api = require((SITE_DIR + '/progress.js')); g.window = old; return api; }
let w = fakeWin(false), P = load(w);
ok(P.persistent && P.missCount() === 0 && P.doneIds().length === 0, 'starts empty, persistent');
let changes = 0; P.onChange(() => changes++);
P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/', note: 'Velar' });
P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/', note: 'Velar' });
P.miss({ game: 'diacritics', key: 'కా', prompt: 'కా', answer: '/kaː/' });
ok(P.missCount() === 2 && P.misses()[0].key === 'క' && P.misses()[0].count === 2, 'misses merge by game+key and count repeats; most-missed first');
ok(changes === 3, 'onChange fired for each write');
ok(P.review('phonemes', 'క', true).cleared === false && P.misses()[0].streak === 1, 'one "got it" → streak 1, still listed');
ok(P.review('phonemes', 'క', false).cleared === false && P.misses().find(m => m.key === 'క').streak === 0, '"again" resets the streak');
P.review('phonemes', 'క', true); const r = P.review('phonemes', 'క', true);
ok(r.cleared && P.missCount() === 1, 'two "got it" in a row clear the item');
P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/' }); P.review('phonemes', 'క', true);
P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/' });
ok(P.misses().find(m => m.key === 'క').streak === 0, 'a new miss resets the streak');
P.complete('phonemes', { accuracy: 80, attempts: 60 }); P.complete('phonemes', { accuracy: 95 }); P.complete('phonemes', { accuracy: 70 });
ok(P.isComplete('phonemes') && !P.isComplete('conjuncts') && P.doneIds().join() === 'phonemes', 'completion tracked per unit');
const saved = JSON.parse(w.store['telugu.progress.v1']);
ok(saved.done.phonemes.runs === 3 && saved.done.phonemes.best === 95, 'runs counted; best accuracy kept');
// a second "frame" sharing storage sees the same data
const P2 = load(Object.assign(fakeWin(false), { localStorage: w.localStorage }));
ok(P2.missCount() === 2 && P2.isComplete('phonemes'), 'another page sharing storage sees the same data');
P.miss({ game: 'x', key: '', prompt: 'p', answer: 'a' }); ok(P.missCount() === 2, 'empty key is ignored');
P.clearMisses(); ok(P.missCount() === 0 && P.isComplete('phonemes'), 'clearMisses keeps completions');
P.reset(); ok(P.doneIds().length === 0, 'reset clears everything');
w.localStorage.setItem('telugu.progress.v1', '{not json'); ok(P.missCount() === 0, 'corrupt storage is treated as empty');
// blocked storage: still works in-memory
const B = load(fakeWin(true));
B.miss({ game: 'g', key: 'k', prompt: 'p', answer: 'a' }); B.complete('u');
ok(B.missCount() === 1 && B.isComplete('u') && B.persistent === false, 'blocked storage: works in memory, persistent=false');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
