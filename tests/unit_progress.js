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
ok(P.persistent && P.missCount() === 0 && P.runCount() === 0 && JSON.stringify(P.runs()) === '{}' && P.runs('phonemes').length === 0, 'starts empty, persistent');
ok(!('complete' in P) && !('isComplete' in P) && !('doneIds' in P) && !('clearRuns' in P), 'nothing is marked "complete" any more: no complete(), isComplete(), or doneIds()');
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
// a whole word (the Words game) is stored like a character: the word, 'word', and its meaning as the note
P.miss({ game: 'words', key: 'అమ్మ', ask: 'word', note: 'mother' });
{ const m = P.misses().find(x => x.game === 'words');
  ok(m.key === 'అమ్మ' && m.ask === 'word' && m.note === 'mother' && m.count === 1 && !('prompt' in m) && !('answer' in m) && !('syllable' in m), 'a missed word is stored as the word and what was asked (ask: "word"), not as text: Review writes its sound');
  P.miss({ game: 'words', key: 'అమ్మ', ask: 'word', note: 'mother' }); ok(P.misses().find(x => x.game === 'words').count === 2, 'missing it again counts up');
  P.review('words', 'అమ్మ', true); P.review('words', 'అమ్మ', true); ok(!P.misses().some(x => x.game === 'words'), 'two "got it" in a row clear it, like any other miss'); }
/* ── runs: every session a game plays to its end (the Profile page's statistics) ── */
const before = changes, t0 = Date.now();
P.run('phonemes', { total: 51, correct: 51, attempts: 60 });
P.run('phonemes', { total: 5, correct: 1, attempts: 5, ended: 'out', variant: 'reverse' });
P.run('conjuncts', { total: 40, correct: 40, attempts: 40 });
const saved = JSON.parse(w.store['telugu.progress.v1']), runs = P.runs('phonemes');
ok(runs.length === 2 && P.runs('conjuncts').length === 1 && P.runs('diacritics').length === 0 && P.runCount() === 3 && Object.keys(P.runs()).sort().join() === 'conjuncts,phonemes', 'runs are kept per game, oldest first');
ok(JSON.stringify(Object.keys(runs[0]).sort()) === '["end","n","ok","t","tries"]' && runs[0].n === 51 && runs[0].ok === 51 && runs[0].tries === 60 && runs[0].end === 'done' && runs[0].t >= t0, 'a run stores when it ended, the cards, the correct answers, the answers given, and how it ended');
ok(runs[1].end === 'out' && runs[1].dir === 'reverse' && runs[1].ok === 1 && runs[1].tries === 5 && !('dir' in P.runs('conjuncts')[0]), 'a session stopped by mistakes is stored as "out"; the way it was played (reverse) only when there is one');
ok(changes === before + 3 && saved.runs.phonemes.length === 2 && !('done' in saved), 'each run is a change, saved with the rest; the store has no "done" record');
runs.push({ t: 0 }); ok(P.runs('phonemes').length === 2, 'runs() hands out a copy');
P.run('phonemes', { total: 5, correct: 0, attempts: 0 }); P.run('', { total: 5, correct: 5, attempts: 5 }); P.run('phonemes', { total: 'x', correct: 5, attempts: 5 }); P.run('phonemes');
ok(P.runCount() === 3, 'a session with no answers, no game, or no numbers is not a run');
P.run('phonemes', { total: 3, correct: 9, attempts: 4, ended: 'sideways' });
ok(P.runs('phonemes')[2].ok === 4 && P.runs('phonemes')[2].end === 'done', 'correct answers never exceed the answers given; an unknown ending counts as finished');
// a game whose cards take several answers each (Words: a card is a word, an answer is one of its sounds) says how many were wrong
P.run('words', { total: 20, correct: 14, attempts: 118, misses: 9 });
P.run('words', { total: 3, correct: 2, attempts: 3, misses: 1 });
P.run('words', { total: 2, correct: 0, attempts: 4, misses: 99, ended: 'out' });
{ const r = P.runs('words');
  ok(r[0].miss === 9 && r[0].ok === 14 && r[0].tries === 118 && JSON.stringify(Object.keys(r[0]).sort()) === '["end","miss","n","ok","t","tries"]', 'a run can carry its own count of wrong answers (miss), when that is not answers − correct: 9 of 118');
  ok(!('miss' in r[1]) && !('miss' in P.runs('phonemes')[0]) && !('miss' in P.runs('conjuncts')[0]), 'it is left out when it is answers − correct, as in every game with one answer to a card');
  ok(r[2].miss === 4 && r[2].end === 'out', 'and it never exceeds the answers given'); }
for (let i = 0; i < P.RUN_CAP + 5; i++) P.run('capped', { total: i + 1, correct: 1, attempts: 1 });
ok(P.RUN_CAP === 100 && P.runs('capped').length === 100 && P.runs('capped')[0].n === 6 && P.runs('capped')[99].n === 105, 'the last 100 runs of a game are kept; the oldest go first');
// a second "frame" sharing storage sees the same data
const P2 = load(Object.assign(fakeWin(false), { localStorage: w.localStorage }));
ok(P2.missCount() === 2 && P2.runs('phonemes').length === 3 && P2.runCount() === P.runCount(), 'another page sharing storage sees the same data');
P.miss({ game: 'x', key: '', prompt: 'p', answer: 'a' }); ok(P.missCount() === 2, 'empty key is ignored');
P.clearMisses(); ok(P.missCount() === 0 && P.runs('phonemes').length === 3, 'clearMisses keeps the runs');
P.miss({ game: 'phonemes', key: 'క', ask: 'telugu' });
P.reset(); ok(P.runCount() === 0 && P.missCount() === 0 && JSON.stringify(P.runs()) === '{}' && JSON.stringify(Object.keys(JSON.parse(w.store['telugu.progress.v1'])).sort()) === '["misses","runs","v"]', 'reset erases every record of earlier attempts: runs and misses alike');
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
ok(P.missCount() === 8 && stored().v === 2 && !('done' in stored()) && JSON.stringify(stored().runs) === '{}' && P.runCount() === 0, 'a v1 store is upgraded to v2 on first read: every miss kept, its old "done" record dropped, no runs yet');
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
B.miss({ game: 'g', key: 'k', prompt: 'p', answer: 'a' }); B.run('u', { total: 2, correct: 2, attempts: 3 });
ok(B.missCount() === 1 && B.runs('u').length === 1 && B.runs('u')[0].tries === 3 && B.persistent === false, 'blocked storage: works in memory, persistent=false');
B.reset(); ok(B.missCount() === 0 && B.runCount() === 0, 'and reset works there too');
// a store written by the version that had ✓ marks, and one from before runs were kept
w = fakeWin(false); w.store['telugu.progress.v1'] = JSON.stringify({ v: 2, done: { phonemes: { at: 1, runs: 2, best: 90 } }, misses: {} }); P = load(w);
ok(P.runCount() === 0 && P.runs('phonemes').length === 0 && P.missCount() === 0, 'an older store (a "done" record, no runs) reads as no runs');
P.run('phonemes', { total: 1, correct: 1, attempts: 1 });
ok(!('done' in JSON.parse(w.store['telugu.progress.v1'])) && P.runs('phonemes').length === 1, 'and its "done" record is gone at the next save');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
