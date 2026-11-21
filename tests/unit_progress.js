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
P.reset(); { const s = JSON.parse(w.store['telugu.progress.v1']);
  ok(P.runCount() === 0 && P.missCount() === 0 && JSON.stringify(P.runs()) === '{}' && JSON.stringify(Object.keys(s).sort()) === '["cut","gone","misses","runs","v"]' && JSON.stringify(s.misses) === '{}' && JSON.stringify(s.gone) === '{}',
    'reset erases every record of earlier attempts: runs and misses alike');
  ok(s.cut.misses > 0 && s.cut.misses === s.cut.runs, 'and remembers when, for both (cut), so a synced copy from before then is erased too'); }
w.localStorage.setItem('telugu.progress.v1', '{not json'); ok(P.missCount() === 0, 'corrupt storage is treated as empty');
/* ── what a miss stores (v2): the character and what was asked, not the text on screen ── */
w = fakeWin(false); P = load(w);
P.miss({ game: 'phonemes', key: 'క', ask: 'telugu', note: 'Velar' });
P.miss({ game: 'diacritics-reverse', key: 'కా', ask: 'sound', syllable: true, note: 'Long' });
P.miss({ game: 'grammar-nouns', key: 'boy', prompt: 'boy', answer: 'అబ్బాయి', note: 'n.' });
const stored = () => JSON.parse(w.store['telugu.progress.v1']);
let ms = stored().misses;
ok(stored().v === 3, 'a new store is version 3');
ok(JSON.stringify(Object.keys(ms['phonemes|క']).sort()) === '["ask","count","game","key","last","note","streak","t"]' && ms['phonemes|క'].ask === 'telugu', 'a character miss stores key + ask (and t, when it last changed), and no prompt/answer text');
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
ok(P.missCount() === 8 && stored().v === 3 && !('done' in stored()) && JSON.stringify(stored().runs) === '{}' && P.runCount() === 0, 'a v1 store is upgraded to v3 on first read: every miss kept, its old "done" record dropped, no runs yet');
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
/* ── syncing (v3): every change carries its time; copies merge without losing anything ── */
{ // a v2 store gets t, gone, and cut the first time it is read
  w = fakeWin(false);
  w.store['telugu.progress.v1'] = JSON.stringify({ v: 2, misses: { 'phonemes|క': { game: 'phonemes', key: 'క', ask: 'telugu', note: '', count: 2, streak: 1, last: 777 } }, runs: { phonemes: [{ t: 5, n: 1, ok: 1, tries: 1, end: 'done' }] } });
  P = load(w); P.missCount();
  const s = stored();
  ok(s.v === 3 && s.misses['phonemes|క'].t === 777 && s.misses['phonemes|క'].count === 2 && JSON.stringify(s.gone) === '{}' && JSON.stringify(s.cut) === '{"misses":0,"runs":0}' && P.runs('phonemes').length === 1,
    'a v2 store is upgraded to v3 on first read: each miss\'s t is its last miss, nothing gone or cut, runs kept');
}
w = fakeWin(false); P = load(w);
{ // the clock never repeats, so changes made in one millisecond still have an order
  P.miss({ game: 'g', key: 'a', ask: 'telugu' }); P.miss({ game: 'g', key: 'b', ask: 'telugu' });
  for (let i = 0; i < 20; i++) P.run('fast', { total: 1, correct: 1, attempts: 1 });
  const ts = P.runs('fast').map(r => r.t);
  ok(stored().misses['g|b'].t > stored().misses['g|a'].t && ts.every((t, i) => !i || t > ts[i - 1]), 'times never repeat: 20 runs in a row have 20 different times, each after the last');
  const t0 = stored().misses['g|a'].t; P.review('g', 'a', true);
  ok(stored().misses['g|a'].t > t0 && stored().misses['g|a'].streak === 1, 'a Review answer is a change to the miss: its t moves on');
  P.review('g', 'a', true);
  ok(!stored().misses['g|a'] && stored().gone['g|a'] > t0, 'a miss Review clears is remembered as cleared (gone), with when');
  P.miss({ game: 'g', key: 'a', ask: 'telugu' });
  ok(P.missCount() === 2 && stored().misses['g|a'].t > stored().gone['g|a'], 'missed again later, it is back, and newer than the clearing');
  P.clearMisses();
  ok(P.missCount() === 0 && JSON.stringify(stored().gone) === '{}' && stored().cut.misses > 0 && stored().cut.runs === 0 && P.runs('fast').length === 20, 'clearMisses sets cut.misses (the tombstones are no longer needed), and leaves the runs and cut.runs alone');
}
{ // snapshot, forget
  const snap = P.snapshot(); snap.runs.fast.length = 0;
  ok(P.runs('fast').length === 20, 'snapshot() hands out a copy');
  let ev = 0; P.onChange(() => ev++); P.forget();
  ok(ev === 1 && P.runCount() === 0 && JSON.stringify(stored()) === JSON.stringify({ v: 3, misses: {}, runs: {}, gone: {}, cut: { misses: 0, runs: 0 } }), 'forget() empties this browser only: a blank store with no cut, so nothing is erased on another device');
}
{ // merge
  const M = P.merge, NOW = Date.now();
  const miss = (key, t, extra = {}) => Object.assign({ game: 'g', key, ask: 'telugu', note: '', count: 1, streak: 0, last: t, t }, extra);
  const st = (o = {}) => Object.assign({ v: 3, misses: {}, runs: {}, gone: {}, cut: { misses: 0, runs: 0 } }, o);
  const run = (t, n = 5) => ({ t, n, ok: n, tries: n, end: 'done' });
  const A = st({ misses: { 'g|a': miss('a', NOW - 50, { count: 3 }), 'g|b': miss('b', NOW - 40) }, runs: { pho: [run(NOW - 30), run(NOW - 10)] } });
  const B = st({ misses: { 'g|a': miss('a', NOW - 20, { streak: 1 }), 'g|c': miss('c', NOW - 5) }, runs: { pho: [run(NOW - 30), run(NOW - 20)], dia: [run(NOW - 15)] } });
  const ab = M(A, B), ba = M(B, A), same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  ok(same(ab, ba), 'merge(a, b) is merge(b, a)');
  ok(same(M(ab, B), ab) && same(M(ab, A), ab) && same(M(ab, ab), ab), 'merging a copy in again changes nothing');
  ok(Object.keys(ab.misses).sort().join() === 'g|a,g|b,g|c' && ab.misses['g|a'].streak === 1 && ab.misses['g|a'].t === NOW - 20, 'misses from both are kept; of two copies of one, the later');
  ok(ab.runs.pho.map(r => r.t).join() === [NOW - 30, NOW - 20, NOW - 10].join() && ab.runs.dia.length === 1, 'runs from both are kept, oldest first, a run both copies hold counted once');
  // the account server hands records back with every object's keys sorted: still the same runs and misses
  const back = JSON.parse(JSON.stringify(ab, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().reverse().map(n => [n, v[n]])) : v)));
  ok(same(M(ab, back), ab) && same(M(back, back), ab) && M(ab, back).runs.pho.length === 3, 'a copy whose keys come back in another order is the same copy: no run counted twice, nothing to save');
  ok(Object.values(ab.runs).flat().concat(Object.values(ab.misses)).every(o => JSON.stringify(Object.keys(o)) === JSON.stringify(Object.keys(o).sort())), 'a merged store has every run and miss with its keys in one order');
  ok(same(A, st({ misses: { 'g|a': miss('a', NOW - 50, { count: 3 }), 'g|b': miss('b', NOW - 40) }, runs: { pho: [run(NOW - 30), run(NOW - 10)] } })), 'merge changes neither input');
  // something cleared in Review on one device stays cleared against the other's older copy …
  const cleared = st({ gone: { 'g|b': NOW - 30 } });
  ok(!M(A, cleared).misses['g|b'] && M(A, cleared).gone['g|b'] === NOW - 30, 'a miss cleared in Review on one device stays cleared against an older copy from another');
  // … but not against a miss made after it
  ok(!!M(st({ misses: { 'g|b': miss('b', NOW - 10) } }), cleared).misses['g|b'], 'but a miss made after the clearing survives it');
  // Reset statistics on one device erases the other's older records, not newer ones
  const wiped = st({ cut: { misses: NOW - 25, runs: NOW - 25 } }), m = M(A, M(B, wiped));
  ok(Object.keys(m.misses).sort().join() === 'g|a,g|c' && !m.misses['g|b'] && m.runs.pho.map(r => r.t).join() === [NOW - 20, NOW - 10].join() && m.runs.dia.length === 1 && m.cut.runs === NOW - 25,
    'a reset (cut) erases every miss and run from before it, on every copy; later ones stay');
  const onlyMisses = M(A, st({ cut: { misses: NOW - 25, runs: 0 } }));
  ok(Object.keys(onlyMisses.misses).length === 0 && onlyMisses.runs.pho.length === 2, 'clearMisses (cut.misses only) leaves the runs');
  // housekeeping
  const old = M(st({ gone: { 'g|x': NOW - 200 * 864e5, 'g|y': NOW - 100 } }), st({ cut: { misses: NOW - 1000, runs: 0 } }));
  ok(JSON.stringify(Object.keys(old.gone)) === '["g|y"]', 'a clearing older than 180 days, or older than a cut, is no longer remembered');
  const cap = st({ runs: { pho: Array.from({ length: 80 }, (_, i) => run(NOW - 1000 + i)) } }), cap2 = st({ runs: { pho: Array.from({ length: 80 }, (_, i) => run(NOW - 500 + i)) } });
  ok(M(cap, cap2).runs.pho.length === P.RUN_CAP && M(cap, cap2).runs.pho[P.RUN_CAP - 1].t === NOW - 421, 'merged runs keep the last ' + P.RUN_CAP + ' of a game');
  // junk from outside
  ok(same(M(A, null), M(A, A)) && same(M(A, 'nope'), M(A, A)) && same(M(A, { misses: 5 }), M(A, A)) && same(M(A, [1, 2]), M(A, A)), 'anything that is not a store is treated as an empty one');
  const junk = M(st(), { v: 3, misses: { 'g|q': 7, 'g|r': miss('r', NOW) }, runs: { pho: [null, { t: 'x' }, 'r', run(NOW)], bad: 5 } });
  ok(Object.keys(junk.misses).join() === 'g|r' && junk.runs.pho.length === 1 && !('bad' in junk.runs), 'broken misses and runs in a copy are dropped, the rest kept');
  const v1 = M(st(), { v: 1, misses: { 'phonemes|క': { game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/', note: '', count: 1, streak: 0, last: 9 } } });
  ok(v1.misses['phonemes|క'].ask === 'telugu' && !('prompt' in v1.misses['phonemes|క']) && v1.misses['phonemes|క'].t === 9, 'a copy in an older format is upgraded before it is merged');
}
{ // absorb: another device's copy merged into this browser's
  w = fakeWin(false); P = load(w); let ev = 0; P.onChange(() => ev++);
  P.miss({ game: 'g', key: 'a', ask: 'telugu' }); P.run('pho', { total: 2, correct: 2, attempts: 2 }); ev = 0;
  const mine = P.snapshot();
  ok(P.absorb(mine) === false && P.absorb(null) === false && ev === 0, 'absorbing a copy that adds nothing changes nothing, and announces nothing');
  const other = { v: 3, misses: { 'g|z': { game: 'g', key: 'z', ask: 'telugu', note: '', count: 1, streak: 0, last: 1, t: Date.now() + 5 } }, runs: { dia: [{ t: Date.now() + 6, n: 3, ok: 3, tries: 3, end: 'done' }] }, gone: {}, cut: { misses: 0, runs: 0 } };
  ok(P.absorb(other) === true && ev === 1 && P.missCount() === 2 && P.runs('dia').length === 1 && P.runs('pho').length === 1, 'absorbing a copy with something new merges it in and announces the change (pages redraw)');
  ok(P.absorb(other) === false && ev === 1, 'and absorbing it again does nothing');
  ok(P.absorb({ v: 3, misses: {}, runs: {}, gone: {}, cut: { misses: Date.now() + 10, runs: Date.now() + 10 } }) === true && P.runCount() === 0 && P.missCount() === 0, 'a reset on another device reaches this one');
  const Bk = load(fakeWin(true)); Bk.miss({ game: 'g', key: 'k', ask: 'telugu' });
  ok(Bk.absorb(other) === true && Bk.missCount() === 2 && Bk.persistent === false, 'blocked storage: absorb works in memory');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
