const h = require('./harness')('alphabet/03_conjuncts.html');
const { w, d, tick, ok, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
// Conjuncts in the other direction (🔀, in the session popup): the card shows the sound, the keys are Telugu letters.
const D = w.TeluguData, P = w.TeluguProgress;
const kb     = () => [...d.querySelectorAll('#kb-area .kb-btn')];
const key    = ch => kb().find(b => b.dataset.ch === ch);
const ipaKey = ipa => kb().find(b => b.dataset.ipa === ipa);
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => [...d.querySelectorAll('#kb-area .kb-label')].map(x => x.textContent);
const slots  = () => [...d.querySelectorAll('#slots .slot')];
const vals   = () => slots().map(s => s.querySelector('.slot-val').textContent).join('|');
const put    = g => G().put(D.clusters.find(c => c.glyph === g));
const clickBox = id => $(id).click();
const KSHA = 'క్ష', JNA = 'జ్ఞ', STRA = 'ష్ట్ర', NKA = 'ఙ్క';
(async () => {
  /* ── the swap button ── */
  ok($('rev-btn') && $('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'swap button present (same 🔀 as Phonemes and Diacritics)');
  ok($('rev-btn').closest('#setup') && !d.querySelector('.g-header .rev-btn'), 'it is in the session popup, and no longer in the header');
  ok($('g-title').textContent === 'Conjuncts → IPA' && !d.querySelector('.kb-btn.te') && !$('tel-char').classList.contains('ipa-face') && $('setup-dir').textContent === 'Conjuncts → IPA', 'forward: IPA keys, Telugu conjunct on the card');

  /* ── the card label never names a letter (either direction) ── */
  put('క్య'); ok($('cat-badge').textContent === 'Velar + Approx.', 'forward: క్య is labeled "Velar + Approx.", not "+ య (ya)"');
  put(NKA);  ok($('cat-badge').textContent === 'Nasal + Velar', 'ఙ్క is labeled "Nasal + Velar"');
  put(STRA); ok($('cat-badge').textContent === 'Fricative + Retroflex + Approx.', 'three letters: three classes');
  const seenLabels = new Set(); D.clusters.forEach(c => { G().put(c); seenLabels.add($('cat-badge').textContent); });
  ok([...seenLabels].every(l => !/[ఀ-౿]/.test(l) && /^[A-Za-z.]+( \+ [A-Za-z.]+){1,2}$/.test(l)), 'no card of the 92 shows a Telugu letter or a set name in its label (' + seenLabels.size + ' different labels)');
  G().start();

  /* ── switch ── */
  put(KSHA); ipaKey('k').click(); ipaKey('ʂ').click(); await tick(); await tick();
  ok(G().completed === 1, 'one card cleared before switching');
  h.flip();
  ok($('g-title').textContent === 'IPA → Conjuncts' && $('rev-btn').getAttribute('aria-pressed') === 'true' && $('setup-dir').textContent === 'IPA → Conjuncts', 'title and button state flip');
  ok(G().completed === 0 && G().deck.length === 40 && G().total === 40, 'a fresh round starts (40 cards)');
  ok(kb().length === 34 && kb().every(b => b.classList.contains('te') && b.textContent === b.dataset.ch), 'keys: the 34 book consonants as Telugu letters, from the shared keyboard');
  ok(kb()[0].textContent === 'క' && kb().at(-1).textContent === 'హ' && !key('ఱ') && !key(KSHA), 'in the keyboard\'s alphabet order (క … హ); no extra ఱ, no క్ష key');
  ok(labels().join() === 'Velar,Palatal,Retroflex,Dental,Labial,Approx.,Fricative', 'grouped by place of articulation, as in the forward game');
  ok(!/[A-Za-zɡʰʱ]/.test(kb().map(b => b.textContent).join('')), 'no IPA left on any key');

  /* ── the card shows the sound ── */
  put(KSHA);
  ok($('tel-char').classList.contains('ipa-face') && $('tel-char').textContent === '/kʂa/' && $('tel-char').querySelectorAll('.sl').length === 2, 'card shows /kʂa/ between slashes');
  ok(!$('tel-char').textContent.includes('క') && $('cat-badge').textContent === 'Velar + Fricative', 'no Telugu on the card; label "Velar + Fricative"');
  put(STRA); const big = $('tel-char').style.fontSize; put('చ్ఛ');
  ok(parseFloat($('tel-char').style.fontSize) < parseFloat(big) && $('tel-char').textContent === '/tʃtʃʰa/', 'longer sounds step down a size (/ʂʈra/ ' + big + ' → /tʃtʃʰa/ ' + $('tel-char').style.fontSize + ')');
  ok(slots().length === 2 && vals() === '–|–' && $('feedback').classList.contains('hint') && /Pick each consonant in order/.test($('feedback').textContent), 'two empty slots and the usual hint');

  /* ── a right answer ── */
  put(KSHA); const before = G().deck.length;
  key('క').click();
  ok(vals() === 'క|–' && slots()[0].classList.contains('filled') && slots()[0].querySelector('.slot-val').classList.contains('te'), 'a pick fills the next slot with the Telugu letter');
  key('ష').click();
  ok($('char-card').classList.contains('correct') && G().deck.length === before - 1 && G().completed === 1, 'both letters right: card cleared');
  ok($('feedback').textContent === '✓  ' + KSHA && $('feedback').classList.contains('ok') && $('feedback').classList.contains('te'), 'feedback shows the conjunct itself: ✓ క్ష');
  ok(key('క').classList.contains('ok') && key('ష').classList.contains('ok') && slots().every(s => s.classList.contains('ok')), 'keys and slots go green');
  await tick(); await tick();

  /* ── a wrong answer ── */
  put(KSHA); const n0 = G().deck.length, misses0 = P.missCount();
  key('క').click(); key('స').click();
  ok($('char-card').classList.contains('wrong') && slots()[0].classList.contains('ok') && slots()[1].classList.contains('err'), 'one wrong letter: card wrong, the slot at fault is red');
  ok(key('స').classList.contains('err') && key('ష').classList.contains('ok') && key('క').classList.contains('ok'), 'the wrong key is red, the letters of the answer green');
  ok($('feedback').textContent === '✗  క్స' && $('feedback').classList.contains('err') && $('feedback').classList.contains('te'), 'the line shows the conjunct that was picked (క + స = క్స), not the answer (క్ష)');
  const m = P.misses().find(x => x.game === 'conjuncts-reverse');
  ok(P.missCount() === misses0 + 1 && m && m.key === KSHA && m.ask === 'sound' && m.syllable === true && h.shown(m).prompt === '/kʂa/' && h.shown(m).answer === KSHA && m.note === 'Velar + Fricative', 'recorded for Review as conjuncts-reverse: /kʂa/ → క్ష, note "Velar + Fricative"');
  ok(!P.misses().some(x => x.game === 'conjuncts'), 'nothing filed under the forward game');
  await tick(); await tick();
  ok(G().deck.length === n0 && G().deck.some(c => c.glyph === KSHA) && vals().split('|').every(v => v === '–'), 'card re-queued; slots clear on the next card');

  /* ── slots: tap to clear; doubled letters ── */
  put('క్క'); key('గ').click(); ok(vals() === 'గ|–', 'first pick shown');
  slots()[0].click(); ok(vals() === '–|–' && !slots()[0].classList.contains('filled'), 'tapping a filled slot clears it');
  key('క').click(); key('క').click();
  ok($('char-card').classList.contains('correct'), 'the same key twice answers a doubled letter (క్క)');
  await tick(); await tick();

  /* ── spoken differently ── */
  put(JNA);
  ok($('tel-char').textContent === '/dʒɲa/' && /sound as written/.test($('feedback').textContent) && $('feedback').textContent.includes('/ɡɲa/'), 'జ్ఞ: the card gives the written sound /dʒɲa/; the hint adds how it is usually said');
  key('జ').click(); key('ఞ').click();
  ok($('char-card').classList.contains('correct') && $('feedback').textContent === '✓  ' + JNA + '  ·  usually said /ɡɲa/', 'answered by its letters (జ + ఞ); feedback keeps the spoken note');
  await tick(); await tick();

  /* ── three letters ── */
  put(STRA); ok(slots().length === 3 && $('tel-char').textContent === '/ʂʈra/', 'three slots for /ʂʈra/');
  key('ష').click(); key('ట').click(); key('ర').click();
  ok($('char-card').classList.contains('correct'), 'ష + ట + ర clears it');
  await tick(); await tick();

  /* ── the options menu still applies ── */
  clickBox('show-cat');
  ok(groups() === 1 && labels().length === 0 && kb().length === 34 && $('cat-badge').style.visibility === 'hidden' && kb().map(b => b.dataset.ch).join() === w.eval('keys.map(c => c.ch)').join(), 'unchecking categories: one flat block in alphabet order; card label hidden');
  clickBox('shuffle-kb'); const A = kb().map(b => b.dataset.ch).join();
  ok(kb().length === 34 && A !== w.eval('keys.map(c => c.ch)').join() && kb().every(b => b.classList.contains('te')), 'shuffle: random order, still Telugu');
  $('show-cat').dispatchEvent(new w.Event('change')); ok(kb().map(b => b.dataset.ch).join() === A, 'order stable within the round');
  clickBox('shuffle-kb'); clickBox('show-cat');
  h.setup(() => clickBox('include-uncommon'));
  ok(kb().length === 35 && !!key('ఱ') && G().total === 40 && $('g-title').textContent === 'IPA → Conjuncts', 'uncommon clusters on: ఱ joins the keys; still reversed');
  put(NKA); ok($('tel-char').textContent === '/ŋka/' && $('rare-badge').style.display !== 'none', 'an uncommon cluster shows its sound and the rare badge');
  h.setup(() => clickBox('include-uncommon'));

  /* ── a whole reverse round ── */
  let guard = 0;
  while (!$('g-complete').classList.contains('show') && guard++ < 200) { G().current.parts.forEach(p => key(p.ch).click()); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().completed === 40 && $('c-accuracy').textContent === '100%', 'reverse round completes (40 cards, 100%)');
  ok($('c-sub').textContent === 'All 40 sounds correctly written as Telugu conjuncts.', 'complete screen names the direction');
  { const r = P.runs('conjuncts').at(-1); ok(r && r.ok === G().completed && r.tries === G().attempts && r.n === G().total && r.end === 'done' && r.dir === 'reverse' && !('isComplete' in P), 'the reverse session is recorded for the Profile page as reversed'); }

  /* ── and back ── */
  h.flip();
  ok($('g-title').textContent === 'Conjuncts → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false' && !d.querySelector('.kb-btn.te') && kb()[0].textContent === 'k' && !$('tel-char').classList.contains('ipa-face') && $('tel-char').style.fontSize === '', 'swapping back restores IPA keys and the Telugu card');
  ok(!$('g-complete').classList.contains('show') && G().total === 40 && G().completed === 0 && $('tel-char').textContent === G().current.glyph, 'with a fresh forward round');
  put(KSHA); ipaKey('k').click(); ok(vals() === 'k|–' && !slots()[0].querySelector('.slot-val').classList.contains('te'), 'slots show IPA again');
  ipaKey('s').click(); await tick(); await tick();
  const fm = P.misses().find(x => x.game === 'conjuncts');
  ok(fm && fm.ask === 'telugu' && h.shown(fm).prompt === KSHA && h.shown(fm).answer === '/kʂa/' && fm.note === 'Velar + Fricative', 'a forward miss is filed under conjuncts, with the class label as its note (not the set name)');
  h.done();
})();
