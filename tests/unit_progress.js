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
/* ── what a miss stores (v2): the character and what was asked, not the text on screen ── */
w = fakeWin(false); P = load(w);
P.miss({ game: 'phonemes', key: 'క', ask: 'telugu', note: 'Velar' });
P.miss({ game: 'diacritics-reverse', key: 'కా', ask: 'sound', syllable: true, note: 'Long' });
P.miss({ game: 'grammar-nouns', key: 'boy', prompt: 'boy', answer: 'అబ్బాయి', note: 'n.' });
const stored = () => JSON.parse(w.store['telugu.progress.v1']);
let ms = stored().misses;
ok(stored().v === 2, 'a new store is version 2');
ok(JSON.stringify(Object.keys(ms['phonemes|క']).sort()) === '["ask","count","game","key","last","note","streak"]' && ms['phonemes|క'].ask === 'telugu', 'a character miss stores key + ask, and no prompt/answer text');
ok(ms['diacritics-reverse|కా'].ask === 'sound' && ms['diacritics-reverse|కా'].syllable === true && !('syllable' in ms['phonemes|క']), 'syllable is stored only when set');
ok(ms['grammar-nouns|boy'].prompt === 'boy' && ms['grammar-nouns|boy'].answer === 'అబ్బాయి' && !('ask' in ms['grammar-nouns|boy']), 'any other miss stores its two texts, as before');
P.miss({ game: 'x', key: 'k', ask: 'sideways', prompt: 'p', answer: 'a' });
ok(stored().misses['x|k'].prompt === 'p' && !('ask' in stored().misses['x|k']), 'an unknown ask is ignored (the texts are kept)');
P.miss({ game: 'phonemes', key: 'క', ask: 'telugu', note: 'Velar' });
ok(P.misses()[0].key === 'క' && P.misses()[0].count === 2 && P.misses()[0].ask === 'telugu', 'repeats still merge and count');

/* ── a version-1 store is converted the first time it is read ── */
const V1 = { v: 1, done: { phonemes: { at: 1, runs: 2, best: 90 } }, misses: {
  'phonemes|క':            { game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/', note: 'Velar', count: 3, streak: 1, last: 5 },
  'phonemes-reverse|గ':    { game: 'phonemes-reverse', key: 'గ', prompt: '/ɡ/', answer: 'గ', note: 'Velar', count: 1, streak: 0, last: 4 },
  'diacritics|కా':         { game: 'diacritics', key: 'కా', prompt: 'కా', answer: '/kaː/', note: 'Long', count: 1, streak: 0, last: 3 },
  'diacritics-reverse|క':  { game: 'diacritics-reverse', key: 'క', prompt: '/ka/', answer: 'క', note: 'Short', count: 1, streak: 0, last: 3 },
  'conjuncts|జ్ఞ':          { game: 'conjuncts', key: 'జ్ఞ', prompt: 'జ్ఞ', answer: '/dʒɲa/  ·  usually said /ɡɲa/', note: 'Nasal', count: 2, streak: 0, last: 2 },
  'conjuncts-reverse|క్ష':  { game: 'conjuncts-reverse', key: 'క్ష', prompt: '/kʂa/', answer: 'క్ష', note: 'Velar + Fricative', count: 1, streak: 0, last: 2 },
  'lookalikes|ఒ':          { game: 'lookalikes', key: 'ఒ', prompt: '/o/', answer: 'ఒ', note: 'Among ఒ బ', count: 1, streak: 0, last: 1 },
  'grammar-nouns|boy':     { game: 'grammar-nouns', key: 'boy', prompt: 'boy', answer: 'అబ్బాయి', note: '', count: 1, streak: 0, last: 1 },
} };
w = fakeWin(false); w.store['telugu.progress.v1'] = JSON.stringify(V1); P = load(w);
let seen = 0; P.onChange(() => seen++);
const up = Object.fromEntries(P.misses().map(m => [m.game, m]));
ok(P.missCount() === 8 && P.isComplete('phonemes') && stored().v === 2 && stored().done.phonemes.best === 90, 'a v1 store is upgraded to v2 on first read; nothing is lost');
ok(['phonemes', 'diacritics', 'conjuncts'].every(g => up[g].ask === 'telugu') && ['phonemes-reverse', 'diacritics-reverse', 'conjuncts-reverse', 'lookalikes'].every(g => up[g].ask === 'sound'), 'each script game\'s misses get the direction they were asked in');
ok(['diacritics', 'diacritics-reverse', 'conjuncts', 'conjuncts-reverse'].every(g => up[g].syllable === true) && ['phonemes', 'phonemes-reverse', 'lookalikes'].every(g => !('syllable' in up[g])), 'Diacritics and Conjuncts misses are marked as syllables; Phonemes and Lookalikes as letters');
ok(Object.values(up).filter(m => m.ask).every(m => !('prompt' in m) && !('answer' in m)), 'the old IPA text is dropped from converted misses');
ok(up.phonemes.count === 3 && up.phonemes.streak === 1 && up.phonemes.note === 'Velar' && up.conjuncts.count === 2, 'counts, streaks, and notes carry over');
ok(up['grammar-nouns'].prompt === 'boy' && up['grammar-nouns'].answer === 'అబ్బాయి' && !up['grammar-nouns'].ask, 'a lesson\'s misses are left exactly as they were');
ok(seen === 0, 'the upgrade is silent (no change event: nothing the reader sees has changed)');
const once = w.store['telugu.progress.v1']; P.missCount(); P.misses();
ok(w.store['telugu.progress.v1'] === once, 'and happens once');
// blocked storage: still works in-memory
const B = load(fakeWin(true));
B.miss({ game: 'g', key: 'k', prompt: 'p', answer: 'a' }); B.complete('u');
ok(B.missCount() === 1 && B.isComplete('u') && B.persistent === false, 'blocked storage: works in memory, persistent=false');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
