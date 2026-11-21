const h = require('./harness')('alphabet/03_conjuncts.html');
const { w, d, tick, ok, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
// Conjuncts in the other direction (🔀, in the session popup): the card shows the sound, the keys are Telugu letters.
const D = w.TeluguData, P = w.TeluguProgress;
const kb     = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];      // the game's keys
const joining = () => d.querySelector('#kb-area .gkb').classList.contains('joining');
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
  ok(!$('group-kb').checked && $('cat-badge').style.visibility === 'hidden' && d.querySelectorAll('#kb-area .kb-label').length === 0, 'not grouped to begin with: the Telugu keyboard\'s layout, no label on the card');
  $('group-kb').click();                                    // on for the rest of this suite, which is mostly about the grouped keyboard
  /* ── the swap button ── */
  ok($('rev-btn') && $('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'swap button present (same 🔀 as Phonemes and Diacritics)');
  ok($('rev-btn').closest('#setup') && !d.querySelector('.g-header .rev-btn'), 'it is in the session popup, and no longer in the header');
  ok($('g-title').textContent === 'Conjuncts → IPA' && !d.querySelector('#kb-area button.kb-btn.te') && !$('tel-char').classList.contains('ipa-face') && $('setup-dir').textContent === 'Conjuncts → IPA', 'forward: IPA keys, Telugu conjunct on the card');

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
  ok(kb().length === 34 && kb().every(b => b.classList.contains('te') && b.textContent === b.dataset.ch), 'keys: the 34 book consonants as Telugu letters');
  ok(kb()[0].textContent === 'క' && kb().at(-1).textContent === 'హ' && !key('ఱ') && !key(KSHA), 'grouped by place, in alphabet order (క … హ); no ఱ, no క్ష key');
  ok(labels().join() === 'Velar,Palatal,Retroflex,Dental,Labial,Approx.,Fricative', 'grouped by place of articulation, as in the forward game');
  ok(!/[A-Za-zɡʰʱ]/.test(kb().map(b => b.textContent).join('')), 'no IPA left on any key');

  /* ── the card shows the sound ── */
  put(KSHA);
  ok($('tel-char').classList.contains('ipa-face') && $('tel-char').textContent === '/kʂɐ/' && $('tel-char').querySelectorAll('.sl').length === 2, 'card shows /kʂɐ/ between slashes');
  ok(!$('tel-char').textContent.includes('క') && $('cat-badge').textContent === 'Velar + Fricative', 'no Telugu on the card; label "Velar + Fricative"');
  put(STRA); const big = $('tel-char').style.fontSize; put('చ్ఛ');
  ok(parseFloat($('tel-char').style.fontSize) < parseFloat(big) && $('tel-char').textContent === '/tʃtʃʰɐ/', 'longer sounds step down a size (/ʂʈɾɐ/ ' + big + ' → /tʃtʃʰɐ/ ' + $('tel-char').style.fontSize + ')');
  ok(slots().length === 2 && vals() === '–|–' && $('feedback').classList.contains('hint') && /Pick each consonant in order/.test($('feedback').textContent), 'two empty slots and the usual hint');

  /* ── a right answer ── */
  put(KSHA); const before = G().deck.length;
  ok(!joining() && key('ష').textContent === 'ష', 'before a pick the keys are letters');
  key('క').click();
  ok(vals() === 'క|–' && slots()[0].classList.contains('filled') && slots()[0].querySelector('.slot-val').classList.contains('te'), 'a pick fills the next slot with the Telugu letter');
  // "Keyboard shows syllables" (on unless turned off in Settings): the keys show the conjunct each would make
  ok(joining() && key('ష').textContent === 'క్ష' && key('య').textContent === 'క్య' && key('క').textContent === 'క్క' && kb().every(b => b.textContent === 'క్' + b.dataset.ch),
    'with క picked, every key shows the conjunct it makes (క్ష క్య క్క …), as the Telugu keyboard does after క్');
  key('ష').click();
  ok(!joining() && key('ష').textContent === 'ష', 'once the conjunct is answered, the keys are letters again (the right ones lit)');
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
  ok(P.missCount() === misses0 + 1 && m && m.key === KSHA && m.ask === 'sound' && m.syllable === true && h.shown(m).prompt === '/kʂɐ/' && h.shown(m).answer === KSHA && m.note === 'Velar + Fricative', 'recorded for Review as conjuncts-reverse: /kʂɐ/ → క్ష, note "Velar + Fricative"');
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
  ok($('tel-char').textContent === '/dʒɲɐ/' && /sound as written/.test($('feedback').textContent) && $('feedback').textContent.includes('/ɡɲɐ/'), 'జ్ఞ: the card gives the written sound /dʒɲɐ/; the hint adds how it is usually said');
  key('జ').click(); key('ఞ').click();
  ok($('char-card').classList.contains('correct') && $('feedback').textContent === '✓  ' + JNA + '  ·  usually said /ɡɲɐ/', 'answered by its letters (జ + ఞ); feedback keeps the spoken note');
  await tick(); await tick();

  /* ── three letters ── */
  put(STRA); ok(slots().length === 3 && $('tel-char').textContent === '/ʂʈɾɐ/', 'three slots for /ʂʈɾɐ/');
  key('ష').click(); key('ట').click();
  ok(key('ర').textContent === 'ష్ట్ర', 'after ష and ట the keys show the three-letter conjunct (ష్ట్ర)');
  slots()[0].click();
  ok(vals() === '–|ట|–' && !joining() && key('ర').textContent === 'ర', 'clearing the first slot leaves nothing to build on: the letters come back');
  key('ష').click();
  ok(vals() === 'ష|ట|–' && key('ర').textContent === 'ష్ట్ర', 'filling it again brings the conjunct back');
  key('ర').click();
  ok($('char-card').classList.contains('correct'), 'ష + ట + ర clears it');
  await tick(); await tick();

  /* ── the options still apply ── */
  clickBox('group-kb');
  ok(d.querySelector('#kb-area .gkb').dataset.mode === 'layout' && labels().length === 0 && kb().length === 34 && $('cat-badge').style.visibility === 'hidden' && kb().every(b => b.classList.contains('te')), 'unchecking "Group keyboard phonetically": the Telugu keyboard\'s layout, still Telugu; card label hidden');
  put(KSHA); key('క').click();
  ok(joining() && key('ష').textContent === 'క్ష', 'the conjunct in the making shows on the laid-out keys too');
  clickBox('group-kb');
  ok(joining() && key('ష').textContent === 'క్ష' && vals() === 'క|–', 'and survives the keyboard being redrawn');
  key('ష').click(); await tick(); await tick();
  h.setup(() => clickBox('include-uncommon'));
  ok(kb().length === 34 && !key('ఱ') && G().total === 40 && $('g-title').textContent === 'IPA → Conjuncts', 'uncommon clusters on: the same 34 keys; still reversed');
  put(NKA); ok($('tel-char').textContent === '/ŋkɐ/' && $('rare-badge').style.display !== 'none', 'an uncommon cluster shows its sound and the rare badge');
  h.setup(() => clickBox('include-uncommon'));

  /* ── a whole reverse round ── */
  let guard = 0;
  while (!$('g-complete').classList.contains('show') && guard++ < 200) { G().current.parts.forEach(p => key(p.ch).click()); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().completed === 40 && $('c-accuracy').textContent === '100%', 'reverse round completes (40 cards, 100%)');
  ok($('c-sub').textContent === 'All 40 sounds correctly written as Telugu conjuncts.', 'complete screen names the direction');
  { const r = P.runs('conjuncts').at(-1); ok(r && r.ok === G().completed && r.tries === G().attempts && r.n === G().total && r.end === 'done' && r.dir === 'reverse' && !('isComplete' in P), 'the reverse session is recorded for the Profile page as reversed'); }

  /* ── and back ── */
  h.flip();
  ok($('g-title').textContent === 'Conjuncts → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false' && !d.querySelector('#kb-area button.kb-btn.te') && kb()[0].textContent === 'k' && !$('tel-char').classList.contains('ipa-face') && $('tel-char').style.fontSize === '', 'swapping back restores IPA keys and the Telugu card');
  ok(!$('g-complete').classList.contains('show') && G().total === 40 && G().completed === 0 && $('tel-char').textContent === G().current.glyph, 'with a fresh forward round');
  put(KSHA); ipaKey('k').click(); ok(vals() === 'k|–' && !slots()[0].querySelector('.slot-val').classList.contains('te'), 'slots show IPA again');
  ok(!joining() && ipaKey('ʂ').textContent === 'ʂ', 'forward, the keys are sounds, and stay sounds after a pick');
  ipaKey('s').click(); await tick(); await tick();
  const fm = P.misses().find(x => x.game === 'conjuncts');
  ok(fm && fm.ask === 'telugu' && h.shown(fm).prompt === KSHA && h.shown(fm).answer === '/kʂɐ/' && fm.note === 'Velar + Fricative', 'a forward miss is filed under conjuncts, with the class label as its note (not the set name)');

  /* ── "Keyboard shows syllables" off (Settings): the keys keep their letters ── */
  { const g = require('./harness')('alphabet/03_conjuncts.html', { storage: { 'telugu.settings.v1': JSON.stringify({ notation: 'ipa', syllables: 'off' }) } });
    g.flip(); g.game().put(D.clusters.find(c => c.glyph === KSHA));
    const k = ch => [...g.d.querySelectorAll('#kb-area button.kb-btn[data-ch]')].find(b => b.dataset.ch === ch);
    k('క').click();
    ok(k('ష').textContent === 'ష' && !g.d.querySelector('#kb-area .gkb').classList.contains('joining'), 'with "Keyboard shows syllables" off in Settings, picking క leaves the keys as letters'); }
  h.done();
})();
